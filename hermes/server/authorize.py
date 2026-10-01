#!/usr/bin/env python3
"""
HERMES — one-time Google sign-in.

Run this once (and again any time the login expires):

    python authorize.py

It opens your browser, asks you to sign in to Google, and saves the result
so the dashboard can read your Drive, Docs, Gmail and Calendar.
"""

from google_auth import main

if __name__ == "__main__":
    main()
