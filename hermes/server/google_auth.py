#!/usr/bin/env python3
"""
HERMES — Shared Google authentication.

Holds the OAuth2 flow used by both the backend server and the Drive agent.
The token is stored next to the agent's credentials so both share one login.
"""

import sys
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Read-only across the Workspace surfaces HERMES touches, plus drive.file so
# the agent can write back the health chart it generates.
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
]

SERVER_DIR = Path(__file__).parent
PROJECT_DIR = SERVER_DIR.parent
AGENT_DIR = PROJECT_DIR / "agent"

CREDENTIALS_FILE = AGENT_DIR / "credentials.json"
TOKEN_FILE = AGENT_DIR / "token.json"

SETUP_HELP = f"""
credentials.json was not found.

  Expected location: {CREDENTIALS_FILE}

  To get this file:
  1. Go to https://console.cloud.google.com/
  2. Create a project (or select an existing one)
  3. Enable these APIs under "APIs & Services > Library":
       - Google Drive API
       - Google Docs API
       - Gmail API
       - Google Calendar API
  4. Go to "APIs & Services > Credentials"
  5. Click "Create Credentials > OAuth Client ID"
  6. Choose "Desktop App" as the application type
  7. Download the JSON file and rename it to credentials.json
  8. Place it in: {AGENT_DIR}
"""


class AuthError(Exception):
    """Raised when Google authentication cannot be completed."""


def credentials_present() -> bool:
    """True when the OAuth client secrets file exists."""
    return CREDENTIALS_FILE.exists()


def token_present() -> bool:
    """True when a previously saved login token exists."""
    return TOKEN_FILE.exists()


def get_credentials(interactive: bool = True) -> Credentials:
    """
    Return valid Google credentials, refreshing or prompting as needed.

    When interactive is False (the server's case), a missing or unrefreshable
    token raises AuthError instead of trying to open a browser — the server may
    be running without a console attached.
    """
    creds = None

    if TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
        except Exception as e:
            raise AuthError(
                f"token.json exists but could not be read ({e}). "
                "Delete it and sign in again."
            ) from e

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            _save(creds)
            return creds
        except Exception as e:
            if not interactive:
                raise AuthError(
                    f"Google login expired and could not refresh ({e}). "
                    "Run: python authorize.py"
                ) from e

    if not interactive:
        raise AuthError(
            "Not signed in to Google yet. Run: python authorize.py"
        )

    if not CREDENTIALS_FILE.exists():
        raise AuthError(SETUP_HELP)

    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
    creds = flow.run_local_server(port=0)
    _save(creds)
    return creds


def _save(creds: Credentials) -> None:
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())


def main():
    """Run the sign-in flow directly: python google_auth.py"""
    print("\n  HERMES — Google sign-in\n")

    if not credentials_present():
        print(SETUP_HELP)
        sys.exit(1)

    if token_present():
        print("  An existing login was found. Signing in again will replace it.")

    print("  Opening your browser to sign in to Google...\n")
    try:
        get_credentials(interactive=True)
    except AuthError as e:
        print(f"  Sign-in failed: {e}\n")
        sys.exit(1)

    print(f"  Signed in. Token saved to: {TOKEN_FILE}")
    print("  You can close the browser tab and start the server.\n")


if __name__ == "__main__":
    main()
