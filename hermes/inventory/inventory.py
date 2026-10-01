#!/usr/bin/env python3
"""
HERMES Inventory
================

Takes a read-only census of one Google account's Drive and writes a plain
report of what is there: agents, prompts, Apps Script projects, finance
documents, forms, and everything else.

Run it once per account (personal, then business) — each gets its own login.

Usage
-----
    python inventory.py --account personal
    python inventory.py --account business

Safety
------
* Uses ONLY the drive.metadata.readonly permission: it can see file names,
  types, folders and dates. It cannot open or change anything.
* Output goes to ./output/ and is git-ignored, because file names can
  contain patient names.

What it cannot see
------------------
Gemini Gems, Google AI Studio chat history, Claude/ChatGPT projects and
Antigravity workspaces live outside Drive. Anything AI Studio saved as a
prompt does show up in Drive; the rest you list by hand in the report's
"Not in Drive" checklist.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
OUT_DIR = HERE / "output"
CREDENTIALS_FILE = HERE.parent / "agent" / "credentials.json"
SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"]

FIELDS = "nextPageToken, files(id,name,mimeType,parents,modifiedTime,owners(emailAddress),trashed)"

# Order matters: first match wins.
CATEGORIES = [
    ("Apps Script (automations/agents)", lambda f: f["mimeType"] == "application/vnd.google-apps.script"),
    ("AI Studio prompts", lambda f: f["mimeType"] == "application/vnd.google-makersuite.prompt"),
    ("Agent / system-prompt / skill files",
     lambda f: re.search(r"agent|system.?prompt|skill|hermes|ayb|cfo|bookkeep|accountant|orchestrat|gem\b|persona|claude\.md|gemini\.md",
                         f["name"], re.I) is not None),
    ("Finance (invoices, receipts, statements)",
     lambda f: re.search(r"invoice|receipt|bill\b|statement|expense|ledger|budget|payroll|tax|1099|w-?9|quickbooks|\bqb\b",
                         f["name"], re.I) is not None),
    ("Questionnaires / intake / forms",
     lambda f: f["mimeType"] == "application/vnd.google-apps.form"
     or re.search(r"questionnaire|intake|assessment|survey|consent", f["name"], re.I) is not None),
    ("Protocols / emotional programs",
     lambda f: re.search(r"protocol|emotion|program|curriculum|workbook|handout", f["name"], re.I) is not None),
    ("Markdown / code / config",
     lambda f: re.search(r"\.(md|py|js|ts|json|yaml|yml|sh|txt)$", f["name"], re.I) is not None),
    ("Spreadsheets", lambda f: f["mimeType"] == "application/vnd.google-apps.spreadsheet"),
    ("Docs", lambda f: f["mimeType"] == "application/vnd.google-apps.document"),
    ("PDFs / scans", lambda f: f["mimeType"] == "application/pdf"),
    ("Images", lambda f: f["mimeType"].startswith("image/")),
]
FOLDER = "application/vnd.google-apps.folder"


def get_service(account: str):
    """Sign in for one account label; each label keeps its own token file."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    token_file = HERE / f"token_{account}.json"
    creds = None
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)
    if not (creds and creds.valid):
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                sys.exit(f"credentials.json not found at {CREDENTIALS_FILE}\n"
                         "See hermes/server/README.md for how to create it.")
            print(f"\nA browser will open. Sign in with your {account.upper()} Google account.\n")
            creds = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES).run_local_server(port=0)
        token_file.write_text(creds.to_json())
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def fetch_all(service) -> list[dict]:
    files, token = [], None
    while True:
        resp = service.files().list(
            q="trashed = false", fields=FIELDS, pageSize=1000, pageToken=token,
            corpora="allDrives", includeItemsFromAllDrives=True, supportsAllDrives=True,
        ).execute()
        files.extend(resp.get("files", []))
        print(f"  ...{len(files)} items", end="\r")
        token = resp.get("nextPageToken")
        if not token:
            print()
            return files


def build_paths(files: list[dict]) -> dict[str, str]:
    """Map file id -> 'Folder/Sub/Name' using the parent links we already have."""
    by_id = {f["id"]: f for f in files}
    cache: dict[str, str] = {}

    def path_of(fid: str, depth: int = 0) -> str:
        if fid in cache:
            return cache[fid]
        f = by_id.get(fid)
        if f is None or depth > 25:
            return ""
        parent = (f.get("parents") or [None])[0]
        prefix = path_of(parent, depth + 1) if parent else ""
        cache[fid] = f"{prefix}/{f['name']}" if prefix else f["name"]
        return cache[fid]

    return {f["id"]: path_of(f["id"]) for f in files}


def categorize(f: dict) -> str:
    for label, test in CATEGORIES:
        if test(f):
            return label
    return "Other"


def analyze(files: list[dict]) -> dict:
    paths = build_paths(files)
    items = [f for f in files if f["mimeType"] != FOLDER]
    groups: dict[str, list[dict]] = defaultdict(list)
    for f in items:
        f["path"] = paths[f["id"]]
        f["category"] = categorize(f)
        groups[f["category"]].append(f)
    top = Counter(f["path"].split("/")[0] if "/" in f["path"] else "(top level)" for f in items)
    return {"total_items": len(items), "folders": len(files) - len(items),
            "groups": groups, "top_folders": top.most_common(25)}


def write_report(account: str, data: dict) -> tuple[Path, Path]:
    OUT_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d")
    md_path = OUT_DIR / f"INVENTORY_{account}_{stamp}.md"
    json_path = OUT_DIR / f"INVENTORY_{account}_{stamp}.json"

    lines = [f"# Inventory — {account} account — {stamp}", "",
             f"{data['total_items']} files in {data['folders']} folders.", "",
             "## Summary", "", "| Category | Files |", "|---|---|"]
    order = [c for c, _ in CATEGORIES] + ["Other"]
    for cat in order:
        if cat in data["groups"]:
            lines.append(f"| {cat} | {len(data['groups'][cat])} |")

    lines += ["", "## Biggest folders", ""]
    lines += [f"- {name} — {n} files" for name, n in data["top_folders"]]

    for cat in order[:7]:  # detail for the categories that matter for the build
        rows = sorted(data["groups"].get(cat, []), key=lambda f: f["modifiedTime"], reverse=True)
        if not rows:
            continue
        lines += ["", f"## {cat}", "", "| Path | Modified |", "|---|---|"]
        lines += [f"| {r['path']} | {r['modifiedTime'][:10]} |" for r in rows[:150]]
        if len(rows) > 150:
            lines.append(f"| …and {len(rows) - 150} more (see the .json file) | |")

    lines += ["", "## Not in Drive — fill in by hand", "",
              "- [ ] Gemini Gems:", "- [ ] AI Studio apps / chats:", "- [ ] Antigravity workspaces:",
              "- [ ] Claude projects / sessions:", "- [ ] Other (ChatGPT, etc.):", ""]
    md_path.write_text("\n".join(lines), encoding="utf-8")

    slim = {cat: [{k: f[k] for k in ("name", "path", "mimeType", "modifiedTime", "id")} for f in rows]
            for cat, rows in data["groups"].items()}
    json_path.write_text(json.dumps({"account": account, "date": stamp, "groups": slim}, indent=2), encoding="utf-8")
    return md_path, json_path


def main():
    ap = argparse.ArgumentParser(description="Read-only census of one Google account's Drive.")
    ap.add_argument("--account", required=True, help="a label for this account, e.g. personal or business")
    args = ap.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_-]+", args.account):
        sys.exit("--account may only contain letters, numbers, - and _")

    print(f"\n  HERMES Inventory — {args.account}\n")
    files = fetch_all(get_service(args.account))
    md, js = write_report(args.account, analyze(files))
    print(f"  Done.\n  Report: {md}\n  Data:   {js}\n")


if __name__ == "__main__":
    main()
