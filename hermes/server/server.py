#!/usr/bin/env python3
"""
HERMES Backend — local bridge between the dashboard and Google Workspace.

Runs on your own computer only (127.0.0.1). The dashboard in your browser
calls this server, and this server talks to Google using the login stored in
agent/token.json. Nothing is sent anywhere else.

Start it with:  python server.py
"""

import io
import json
import os
import re
import sys
import base64
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    print(
        "\n  Missing dependencies. Install them with:\n\n"
        "    pip install -r requirements.txt\n"
    )
    sys.exit(1)

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

from google_auth import AuthError, get_credentials, credentials_present, token_present

# ─── Configuration ──────────────────────────────────────────────────────────

SERVER_DIR = Path(__file__).parent
PROJECT_DIR = SERVER_DIR.parent
DATA_FILE = PROJECT_DIR / "frontend" / "src" / "data" / "hermes_data.json"

HOST = "127.0.0.1"
PORT = 8000

# Only the local dashboard may call this server.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

DOC_MIMES = {
    "pdf": "application/pdf",
    "gdoc": "application/vnd.google-apps.document",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "folder": "application/vnd.google-apps.folder",
}

# Cap extracted text so a huge scan can't blow up the browser or a later
# AI call. Roughly 15k characters is several pages of lab results.
MAX_TEXT_CHARS = 15000


app = FastAPI(title="HERMES Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Google service helpers ─────────────────────────────────────────────────

_services: dict[str, Any] = {}


def service(name: str, version: str):
    """Build (and cache) a Google API client, or fail with a clear message."""
    key = f"{name}:{version}"
    if key not in _services:
        try:
            creds = get_credentials(interactive=False)
        except AuthError as e:
            raise HTTPException(status_code=401, detail=str(e)) from e
        _services[key] = build(name, version, credentials=creds, cache_discovery=False)
    return _services[key]


def escape_query(term: str) -> str:
    """Escape a user term for a Drive/Gmail query string."""
    return term.replace("\\", "\\\\").replace("'", "\\'")


def google_error(e: HttpError) -> HTTPException:
    """Turn a Google API error into something a person can act on."""
    status = getattr(e.resp, "status", 500)
    if status == 403:
        detail = (
            "Google denied the request. The API may not be enabled for your "
            "project, or your login is missing a permission. Re-run "
            "python authorize.py after enabling the API."
        )
    elif status == 401:
        detail = "Google login expired. Run: python authorize.py"
    else:
        detail = f"Google API error ({status})."
    return HTTPException(status_code=status if status >= 400 else 500, detail=detail)


# ─── Text extraction ────────────────────────────────────────────────────────

def extract_google_doc(drive, file_id: str) -> str:
    data = drive.files().export(fileId=file_id, mimeType="text/plain").execute()
    return data.decode("utf-8", errors="replace") if isinstance(data, bytes) else str(data)


def download_bytes(drive, file_id: str) -> bytes:
    request = drive.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    buffer.seek(0)
    return buffer.read()


def extract_pdf(drive, file_id: str) -> str:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF reading needs PyMuPDF. Install it with: pip install -r requirements.txt",
        )

    raw = download_bytes(drive, file_id)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name
        text = []
        with fitz.open(tmp_path) as pdf:
            for page in pdf:
                text.append(page.get_text())
        return "".join(text)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def extract_docx(drive, file_id: str) -> str:
    try:
        from docx import Document
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Word reading needs python-docx. Install it with: pip install -r requirements.txt",
        )

    raw = download_bytes(drive, file_id)
    doc = Document(io.BytesIO(raw))
    return "\n".join(p.text for p in doc.paragraphs)


# ─── Health & auth ──────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    """Is the server up, and is it signed in to Google?"""
    signed_in = False
    message = "Not signed in to Google yet."
    if token_present():
        try:
            get_credentials(interactive=False)
            signed_in = True
            message = "Signed in and ready."
        except AuthError as e:
            message = str(e)

    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "google": {
            "credentials_file": credentials_present(),
            "signed_in": signed_in,
            "message": message,
        },
        "data_file": DATA_FILE.exists(),
    }


# ─── Patient search ─────────────────────────────────────────────────────────

@app.get("/api/patients/search")
def patient_search(
    q: str = Query(..., min_length=2, description="Patient name or partial name"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Find a patient's records in Drive by name.

    Looks for folders named after the patient and for individual files whose
    name mentions them, then groups the result so the dashboard can show
    "here is their folder" separately from "here are loose files".
    """
    drive = service("drive", "v3")
    term = escape_query(q.strip())

    folders: list[dict] = []
    files: list[dict] = []

    try:
        folder_res = drive.files().list(
            q=(
                f"name contains '{term}' and "
                f"mimeType='{DOC_MIMES['folder']}' and trashed=false"
            ),
            pageSize=min(limit, 50),
            fields="files(id, name, modifiedTime, webViewLink)",
            orderBy="modifiedTime desc",
        ).execute()
        folders = folder_res.get("files", [])

        readable = (
            f"(mimeType='{DOC_MIMES['pdf']}' or "
            f"mimeType='{DOC_MIMES['gdoc']}' or "
            f"mimeType='{DOC_MIMES['docx']}')"
        )
        file_res = drive.files().list(
            q=f"name contains '{term}' and {readable} and trashed=false",
            pageSize=limit,
            fields="files(id, name, mimeType, modifiedTime, webViewLink, size, parents)",
            orderBy="modifiedTime desc",
        ).execute()
        files = file_res.get("files", [])
    except HttpError as e:
        raise google_error(e)

    return {
        "query": q,
        "folders": [
            {
                "id": f["id"],
                "name": f.get("name", "Untitled"),
                "modified": f.get("modifiedTime", ""),
                "link": f.get("webViewLink", ""),
            }
            for f in folders
        ],
        "files": [_file_row(f) for f in files],
        "counts": {"folders": len(folders), "files": len(files)},
    }


@app.get("/api/patients/{folder_id}/files")
def patient_folder_files(folder_id: str, limit: int = Query(200, ge=1, le=500)):
    """List every readable document inside a patient's folder."""
    drive = service("drive", "v3")
    try:
        res = drive.files().list(
            q=f"'{escape_query(folder_id)}' in parents and trashed=false",
            pageSize=limit,
            fields="files(id, name, mimeType, modifiedTime, webViewLink, size)",
            orderBy="modifiedTime desc",
        ).execute()
    except HttpError as e:
        raise google_error(e)

    return {"folder_id": folder_id, "files": [_file_row(f) for f in res.get("files", [])]}


def _file_row(f: dict) -> dict:
    mime = f.get("mimeType", "")
    kind = "other"
    if mime == DOC_MIMES["pdf"]:
        kind = "pdf"
    elif mime == DOC_MIMES["gdoc"]:
        kind = "doc"
    elif mime == DOC_MIMES["docx"]:
        kind = "word"
    elif mime == DOC_MIMES["folder"]:
        kind = "folder"

    return {
        "id": f.get("id", ""),
        "name": f.get("name", "Untitled"),
        "kind": kind,
        "mime": mime,
        "modified": f.get("modifiedTime", ""),
        "link": f.get("webViewLink", ""),
        "readable": kind in ("pdf", "doc", "word"),
    }


@app.get("/api/files/{file_id}/text")
def file_text(file_id: str):
    """Pull the readable text out of one Drive document."""
    drive = service("drive", "v3")

    try:
        meta = drive.files().get(
            fileId=file_id, fields="id, name, mimeType, modifiedTime, webViewLink"
        ).execute()
    except HttpError as e:
        raise google_error(e)

    mime = meta.get("mimeType", "")
    try:
        if mime == DOC_MIMES["gdoc"]:
            text = extract_google_doc(drive, file_id)
        elif mime == DOC_MIMES["pdf"]:
            text = extract_pdf(drive, file_id)
        elif mime == DOC_MIMES["docx"]:
            text = extract_docx(drive, file_id)
        else:
            raise HTTPException(
                status_code=415,
                detail=f"HERMES can read Google Docs, PDFs and Word files. This is: {mime}",
            )
    except HttpError as e:
        raise google_error(e)

    truncated = len(text) > MAX_TEXT_CHARS
    return {
        "id": file_id,
        "name": meta.get("name", "Untitled"),
        "modified": meta.get("modifiedTime", ""),
        "link": meta.get("webViewLink", ""),
        "text": text[:MAX_TEXT_CHARS],
        "truncated": truncated,
        "characters": len(text),
    }


# ─── Drive ──────────────────────────────────────────────────────────────────

@app.get("/api/drive/recent")
def drive_recent(limit: int = Query(25, ge=1, le=100)):
    """Recently touched files across Drive."""
    drive = service("drive", "v3")
    try:
        res = drive.files().list(
            q="trashed=false",
            pageSize=limit,
            fields="files(id, name, mimeType, modifiedTime, webViewLink)",
            orderBy="modifiedTime desc",
        ).execute()
    except HttpError as e:
        raise google_error(e)
    return {"files": [_file_row(f) for f in res.get("files", [])]}


@app.get("/api/drive/search")
def drive_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(25, ge=1, le=100),
):
    """Search Drive by file name or contents."""
    drive = service("drive", "v3")
    term = escape_query(q.strip())
    try:
        res = drive.files().list(
            q=f"(name contains '{term}' or fullText contains '{term}') and trashed=false",
            pageSize=limit,
            fields="files(id, name, mimeType, modifiedTime, webViewLink)",
            orderBy="modifiedTime desc",
        ).execute()
    except HttpError as e:
        raise google_error(e)
    return {"query": q, "files": [_file_row(f) for f in res.get("files", [])]}


@app.get("/api/docs/recent")
def docs_recent(limit: int = Query(25, ge=1, le=100)):
    """Recently edited Google Docs."""
    drive = service("drive", "v3")
    try:
        res = drive.files().list(
            q=f"mimeType='{DOC_MIMES['gdoc']}' and trashed=false",
            pageSize=limit,
            fields="files(id, name, mimeType, modifiedTime, webViewLink)",
            orderBy="modifiedTime desc",
        ).execute()
    except HttpError as e:
        raise google_error(e)
    return {"files": [_file_row(f) for f in res.get("files", [])]}


# ─── Gmail ──────────────────────────────────────────────────────────────────

def _header(payload: dict, name: str) -> str:
    for h in payload.get("headers", []):
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _decode_part(data: str) -> str:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")


def _plain_body(payload: dict) -> str:
    """Walk a Gmail payload tree and pull out the best plain-text body."""
    mime = payload.get("mimeType", "")
    body = payload.get("body", {})

    if mime == "text/plain" and body.get("data"):
        return _decode_part(body["data"])

    for part in payload.get("parts", []) or []:
        found = _plain_body(part)
        if found:
            return found

    if mime == "text/html" and body.get("data"):
        html = _decode_part(body["data"])
        return re.sub(r"<[^>]+>", " ", html)

    return ""


@app.get("/api/gmail/search")
def gmail_search(
    q: str = Query("", description="Gmail search, e.g. 'from:lab' — blank for inbox"),
    limit: int = Query(20, ge=1, le=50),
):
    """Search mail. Returns message summaries, newest first."""
    gmail = service("gmail", "v1")
    query = q.strip() or "in:inbox"

    try:
        listing = gmail.users().messages().list(
            userId="me", q=query, maxResults=limit
        ).execute()

        messages = []
        for ref in listing.get("messages", []):
            detail = gmail.users().messages().get(
                userId="me",
                id=ref["id"],
                format="metadata",
                metadataHeaders=["From", "Subject", "Date"],
            ).execute()
            payload = detail.get("payload", {})
            messages.append({
                "id": detail.get("id", ""),
                "thread_id": detail.get("threadId", ""),
                "from": _header(payload, "From"),
                "subject": _header(payload, "Subject") or "(no subject)",
                "date": _header(payload, "Date"),
                "snippet": detail.get("snippet", ""),
                "unread": "UNREAD" in detail.get("labelIds", []),
            })
    except HttpError as e:
        raise google_error(e)

    return {"query": query, "messages": messages}


@app.get("/api/gmail/message/{message_id}")
def gmail_message(message_id: str):
    """Read one message in full."""
    gmail = service("gmail", "v1")
    try:
        detail = gmail.users().messages().get(
            userId="me", id=message_id, format="full"
        ).execute()
    except HttpError as e:
        raise google_error(e)

    payload = detail.get("payload", {})
    body = _plain_body(payload)
    return {
        "id": detail.get("id", ""),
        "from": _header(payload, "From"),
        "to": _header(payload, "To"),
        "subject": _header(payload, "Subject") or "(no subject)",
        "date": _header(payload, "Date"),
        "body": body[:MAX_TEXT_CHARS],
        "truncated": len(body) > MAX_TEXT_CHARS,
    }


# ─── Calendar ───────────────────────────────────────────────────────────────

@app.get("/api/calendar/upcoming")
def calendar_upcoming(limit: int = Query(10, ge=1, le=50)):
    """Next appointments on the primary calendar."""
    cal = service("calendar", "v3")
    now = datetime.now(timezone.utc).isoformat()
    try:
        res = cal.events().list(
            calendarId="primary",
            timeMin=now,
            maxResults=limit,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
    except HttpError as e:
        raise google_error(e)

    events = []
    for e in res.get("items", []):
        start = e.get("start", {})
        events.append({
            "id": e.get("id", ""),
            "title": e.get("summary", "(no title)"),
            "start": start.get("dateTime") or start.get("date", ""),
            "all_day": "date" in start,
            "location": e.get("location", ""),
            "link": e.get("htmlLink", ""),
        })
    return {"events": events}


# ─── Local health record ────────────────────────────────────────────────────

@app.get("/api/record")
def local_record():
    """The dashboard's own hermes_data.json, served for cross-checking."""
    if not DATA_FILE.exists():
        raise HTTPException(status_code=404, detail="hermes_data.json not found.")
    try:
        with open(DATA_FILE) as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"hermes_data.json is not valid JSON ({e}). "
                   "Run: python guardian.py --repair",
        )


# ─── Startup ────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("  HERMES Backend")
    print("=" * 60)

    if not credentials_present():
        print("\n  No credentials.json yet — Google features will be unavailable.")
        print("  See server/README.md for how to create it.\n")
    elif not token_present():
        print("\n  Not signed in to Google yet.")
        print("  Run this first, in another window:  python authorize.py\n")
    else:
        print("\n  Google login found.\n")

    print(f"  Serving on http://{HOST}:{PORT}")
    print(f"  Health check: http://{HOST}:{PORT}/api/health")
    print("\n  Leave this window open while you use the dashboard.")
    print("  Press Ctrl+C to stop.\n")

    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
