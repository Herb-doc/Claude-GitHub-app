#!/usr/bin/env python3
"""
HERMES Guardian Angel
=====================

A single-file health check and self-repair tool for the HERMES system.

It looks at every part of HERMES (the dashboard, the data file, the Google
Drive scanner, the backend) and tells you in plain language what is working,
what is not, and exactly what to type to fix it.

It uses ONLY the Python standard library on purpose, so it still runs even
when everything else on the machine is broken.

Usage
-----
    python guardian.py              Check everything and print a report
    python guardian.py --repair     Check everything and fix what is safe to fix
    python guardian.py --backup     Save a fresh backup of the health data file
    python guardian.py --history    Show the history of problems and repairs

Exit code is 0 when nothing failed, 1 when at least one check failed.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import traceback
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Where everything lives
# ---------------------------------------------------------------------------
# guardian.py sits in  hermes/guardian/ , so the project root is one level up.

GUARDIAN_DIR = Path(__file__).resolve().parent
ROOT = GUARDIAN_DIR.parent

FRONTEND_DIR = ROOT / "frontend"
NODE_MODULES = FRONTEND_DIR / "node_modules"
PACKAGE_JSON = FRONTEND_DIR / "package.json"
DATA_FILE = FRONTEND_DIR / "src" / "data" / "hermes_data.json"

AGENT_DIR = ROOT / "agent"
AGENT_REQUIREMENTS = AGENT_DIR / "requirements.txt"
CREDENTIALS_FILE = AGENT_DIR / "credentials.json"
TOKEN_FILE = AGENT_DIR / "token.json"

SERVER_DIR = ROOT / "server"
SERVER_REQUIREMENTS = SERVER_DIR / "requirements.txt"

BACKUP_DIR = GUARDIAN_DIR / "backups"
REPAIR_LOG = GUARDIAN_DIR / "repair_log.jsonl"

KEEP_BACKUPS = 10

DASHBOARD_PORT = 5173
BACKEND_PORT = 8000
BACKEND_HEALTH_URL = "http://127.0.0.1:8000/api/health"

MIN_NODE_MAJOR = 18
MIN_PYTHON = (3, 10)

# Python packages the Google Drive scanner needs, and the friendly name of the
# thing you actually install to get them.
AGENT_PACKAGES = [
    ("google.oauth2", "google-auth-oauthlib"),
    ("googleapiclient", "google-api-python-client"),
    ("fitz", "PyMuPDF"),
    ("docx", "python-docx"),
    ("anthropic", "anthropic"),
]

# Python packages the backend needs. The backend is optional.
SERVER_PACKAGES = [
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
]

OK = "OK"
WARN = "WARN"
FAIL = "FAIL"

MARKERS = {OK: "[ OK ]", WARN: "[WARN]", FAIL: "[FAIL]"}

LINE = "=" * 72
THIN = "-" * 72


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    """Current time as a plain ISO timestamp (no microseconds)."""
    return datetime.now().replace(microsecond=0).isoformat()


def stamp() -> str:
    """Timestamp suitable for a file name: 20260907_141530."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def pretty_path(path: Path) -> str:
    """Absolute path as text, safe to print on any platform."""
    try:
        return str(path)
    except Exception:
        return repr(path)


def short(text: str, limit: int = 160) -> str:
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[: limit - 3] + "..."


class Result:
    """The outcome of one check."""

    def __init__(self, name, status, message, fix=None, action_taken=None,
                 resolved=None, details=None, fix_kind="command"):
        self.name = name
        self.status = status
        self.message = message
        self.fix = fix                  # exact command the user should type
        self.fix_kind = fix_kind        # "command" to type, or "steps" to follow
        self.action_taken = action_taken  # what --repair actually did
        self.resolved = resolved        # True when a repair fixed it
        self.details = details or []    # extra plain-language lines


# ---------------------------------------------------------------------------
# The repair log: HERMES's memory of how things broke and got fixed
# ---------------------------------------------------------------------------

def log_event(check, status, message, action_taken=None, resolved=False):
    """Append one JSON object per line to guardian/repair_log.jsonl.

    Never raises: a broken log must never stop a health check.
    """
    entry = {
        "timestamp": now_iso(),
        "check": check,
        "status": status,
        "message": short(message, 400),
        "action_taken": action_taken,
        "resolved": bool(resolved),
    }
    try:
        REPAIR_LOG.parent.mkdir(parents=True, exist_ok=True)
        with REPAIR_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry) + "\n")
    except Exception:
        pass  # logging is a nicety, never a blocker
    return entry


def read_log():
    """Read the repair log. Bad lines are skipped rather than crashing."""
    entries = []
    try:
        if not REPAIR_LOG.exists():
            return entries
        with REPAIR_LOG.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                    if isinstance(item, dict):
                        entries.append(item)
                except Exception:
                    continue
    except Exception:
        pass
    return entries


# ---------------------------------------------------------------------------
# Backups of the health data file
# ---------------------------------------------------------------------------

def ensure_backup_dir():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def backup_taken_at(path):
    """Read the date a backup was taken out of its file name."""
    try:
        raw = path.stem.replace("hermes_data_", "")
        return datetime.strptime(raw, "%Y%m%d_%H%M%S").strftime("%Y-%m-%d %H:%M")
    except Exception:
        try:
            return datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        except Exception:
            return "an unknown time"


def list_backups():
    """Newest first."""
    try:
        if not BACKUP_DIR.exists():
            return []
        files = [p for p in BACKUP_DIR.glob("hermes_data_*.json") if p.is_file()]
        return sorted(files, key=lambda p: p.name, reverse=True)
    except Exception:
        return []


def prune_backups(keep=KEEP_BACKUPS):
    """Delete all but the newest `keep` backups. Returns how many were removed."""
    removed = 0
    for old in list_backups()[keep:]:
        try:
            old.unlink()
            removed += 1
        except Exception:
            pass
    return removed


def make_backup(reason="manual"):
    """Copy the live data file into guardian/backups/ with a timestamp.

    Returns (backup_path_or_None, human_message).
    """
    if not DATA_FILE.exists():
        return None, "There is no health data file to back up yet."
    try:
        json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None, ("The live health data file is damaged, so it was NOT backed "
                      "up (that would overwrite a good backup with a bad copy).")
    try:
        ensure_backup_dir()
        target = BACKUP_DIR / f"hermes_data_{stamp()}.json"
        shutil.copy2(DATA_FILE, target)
        prune_backups()
        return target, f"Backup saved as {target.name} ({reason})."
    except Exception as exc:
        return None, f"Could not save a backup: {exc}"


def backup_is_current():
    """True when the newest backup already matches the live file byte for byte."""
    backups = list_backups()
    if not backups:
        return False
    try:
        return backups[0].read_bytes() == DATA_FILE.read_bytes()
    except Exception:
        return False


def restore_from_latest_backup():
    """Put the newest backup back in place. Returns (ok, message)."""
    backups = list_backups()
    if not backups:
        return False, "There are no backups to restore from."
    newest = backups[0]
    try:
        ensure_backup_dir()
        # Keep the damaged file aside so nothing is ever silently thrown away.
        if DATA_FILE.exists():
            damaged = BACKUP_DIR / f"damaged_{stamp()}.json.bad"
            try:
                shutil.move(str(DATA_FILE), str(damaged))
            except Exception:
                pass
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(newest, DATA_FILE)
        return True, f"Restored your health data from the backup {newest.name}."
    except Exception as exc:
        return False, f"Restore failed: {exc}"


# ---------------------------------------------------------------------------
# Command helpers
# ---------------------------------------------------------------------------

def run_command(command, cwd=None, timeout=60, capture=True):
    """Run a command safely. Returns (returncode, output_text)."""
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd) if cwd else None,
            capture_output=capture,
            text=True,
            timeout=timeout,
        )
        output = ""
        if capture:
            output = (completed.stdout or "") + (completed.stderr or "")
        return completed.returncode, output.strip()
    except FileNotFoundError:
        return 127, "That program is not installed."
    except subprocess.TimeoutExpired:
        return 124, "The command took too long and was stopped."
    except Exception as exc:
        return 1, f"The command could not be run: {exc}"


def module_available(module_name):
    """True when a Python module can be found, without importing it fully."""
    try:
        return importlib.util.find_spec(module_name) is not None
    except Exception:
        return False


def port_in_use(port, host="127.0.0.1", timeout=0.6):
    """True when something is already listening on that port."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            return sock.connect_ex((host, port)) == 0
    except Exception:
        return False


# ---------------------------------------------------------------------------
# The checks
# ---------------------------------------------------------------------------

class Guardian:
    def __init__(self, repair=False):
        self.repair = repair
        self.results = []
        self.state = {}  # things one check learns that another check needs

    # -- individual checks ------------------------------------------------

    def check_python(self):
        version = ".".join(str(part) for part in sys.version_info[:3])
        if sys.version_info >= MIN_PYTHON:
            return Result(
                "Python", OK,
                f"Python {version} is installed (needs 3.10 or newer).")
        return Result(
            "Python", FAIL,
            f"Python {version} is too old. HERMES needs 3.10 or newer.",
            fix="Install the latest Python from https://www.python.org/downloads/ "
                "and tick 'Add Python to PATH' during setup.",
            fix_kind="steps")

    def check_node(self):
        node = shutil.which("node")
        if not node:
            return Result(
                "Node.js", FAIL,
                "Node.js is not installed. The dashboard cannot start without it.",
                fix="Download and install Node.js (LTS) from https://nodejs.org",
                fix_kind="steps")
        code, output = run_command([node, "--version"], timeout=20)
        if code != 0:
            return Result(
                "Node.js", FAIL,
                f"Node.js is installed but did not respond. {short(output)}",
                fix="Reinstall Node.js (LTS) from https://nodejs.org",
                fix_kind="steps")
        raw = output.strip().splitlines()[0].strip() if output else ""
        text = raw.lstrip("vV")
        try:
            major = int(text.split(".")[0])
        except Exception:
            return Result(
                "Node.js", WARN,
                f"Node.js is installed but its version could not be read ({short(raw)}).")
        self.state["node_major"] = major
        if major >= MIN_NODE_MAJOR:
            return Result("Node.js", OK, f"Node.js {raw} is installed.")
        return Result(
            "Node.js", FAIL,
            f"Node.js {raw} is too old. The dashboard needs version "
            f"{MIN_NODE_MAJOR} or newer.",
            fix="Install the current LTS version of Node.js from https://nodejs.org",
            fix_kind="steps")

    def check_npm(self):
        npm = shutil.which("npm")
        if not npm:
            return Result(
                "npm", FAIL,
                "npm is missing. It normally arrives together with Node.js.",
                fix="Reinstall Node.js (LTS) from https://nodejs.org",
                fix_kind="steps")
        code, output = run_command([npm, "--version"], timeout=60)
        if code != 0:
            return Result(
                "npm", WARN,
                f"npm is installed but did not respond properly. {short(output)}")
        return Result("npm", OK, f"npm {output.strip().splitlines()[0]} is installed.")

    def check_package_json(self):
        if not PACKAGE_JSON.exists():
            return Result(
                "Dashboard settings file", FAIL,
                f"package.json is missing from {pretty_path(FRONTEND_DIR)}.",
                fix="Restore the frontend folder from your copy of the HERMES project.",
                fix_kind="steps")
        try:
            data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            return Result(
                "Dashboard settings file", FAIL,
                f"package.json is damaged and cannot be read (line {exc.lineno}).",
                fix="Restore package.json from your copy of the HERMES project.",
                fix_kind="steps")
        name = data.get("name", "the dashboard") if isinstance(data, dict) else "the dashboard"
        deps = len(data.get("dependencies", {}) or {}) if isinstance(data, dict) else 0
        return Result(
            "Dashboard settings file", OK,
            f"package.json is readable ({name}, {deps} required packages).")

    def check_node_modules(self):
        name = "Dashboard packages"
        install_cmd = f'cd "{pretty_path(FRONTEND_DIR)}" && npm install'
        empty = True
        if NODE_MODULES.is_dir():
            try:
                empty = not any(NODE_MODULES.iterdir())
            except Exception:
                empty = True
        if NODE_MODULES.is_dir() and not empty:
            try:
                count = sum(1 for _ in NODE_MODULES.iterdir())
            except Exception:
                count = 0
            return Result(name, OK,
                          f"The dashboard's supporting packages are installed "
                          f"({count} items in node_modules).")

        message = ("The dashboard's supporting packages are missing, so "
                   "'npm run dev' will not start.")
        if not self.repair:
            return Result(name, FAIL, message, fix=install_cmd)

        # --repair: installing packages is safe, so do it.
        npm = shutil.which("npm")
        if not npm:
            return Result(name, FAIL,
                          message + " npm is not installed, so this cannot be repaired yet.",
                          fix="Install Node.js (LTS) from https://nodejs.org, then run this tool again.",
                          fix_kind="steps")
        print("      Installing the dashboard packages now. This can take a few minutes...")
        code, output = run_command([npm, "install"], cwd=FRONTEND_DIR, timeout=900)
        if code == 0 and NODE_MODULES.is_dir():
            return Result(name, OK,
                          "The dashboard packages were missing and have now been installed.",
                          action_taken="ran 'npm install' in the frontend folder",
                          resolved=True)
        return Result(name, FAIL,
                      message + f" The automatic install did not finish. {short(output)}",
                      fix=install_cmd,
                      action_taken="tried 'npm install' in the frontend folder",
                      resolved=False)

    def check_data_file(self):
        name = "Health data file"
        self.state["data_ok"] = False

        if not DATA_FILE.exists():
            problem = f"hermes_data.json is missing from {pretty_path(DATA_FILE.parent)}."
            return self._recover_data(name, problem)

        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            problem = (f"hermes_data.json is damaged and cannot be read "
                       f"(line {exc.lineno}, {exc.msg}).")
            return self._recover_data(name, problem)
        except Exception as exc:
            problem = f"hermes_data.json could not be opened: {exc}"
            return self._recover_data(name, problem)

        return self._inspect_data(name, data)

    def _inspect_data(self, name, data):
        """Check the shape of the data and report what is inside it."""
        restore_hint = f'python "{pretty_path(Path(__file__).resolve())}" --repair'

        if not isinstance(data, dict):
            return Result(name, FAIL,
                          "hermes_data.json does not have the expected layout "
                          "(it should be a single record with findings, protocols "
                          "and metadata).",
                          fix=restore_hint)

        problems = []
        findings = data.get("findings")
        protocols = data.get("protocols")
        metadata = data.get("metadata")

        if not isinstance(findings, list):
            problems.append("'findings' is missing or is not a list of results")
        if not isinstance(protocols, list):
            problems.append("'protocols' is missing or is not a list")
        if not isinstance(metadata, dict):
            problems.append("'metadata' is missing or is not a record")

        if problems:
            return Result(name, FAIL,
                          "hermes_data.json is readable but incomplete: "
                          + "; ".join(problems) + ".",
                          fix=restore_hint)

        required_keys = ("date", "test_name", "value", "flag")
        incomplete = 0
        for item in findings:
            if not isinstance(item, dict) or any(key not in item for key in required_keys):
                incomplete += 1

        self.state["data_ok"] = True
        details = [
            f"{len(findings)} lab findings, {len(protocols)} protocols, "
            f"{len(metadata)} metadata entries.",
        ]
        last_updated = metadata.get("last_updated") or metadata.get("generated")
        if last_updated:
            details.append(f"Data last updated: {last_updated}.")

        if incomplete:
            return Result(
                name, WARN,
                f"Your health data loads, but {incomplete} of {len(findings)} findings "
                "are missing one of date / test_name / value / flag, so they may look "
                "blank on the dashboard.",
                fix=f'cd "{pretty_path(AGENT_DIR)}" && python hermes_agent.py',
                details=details + ["Re-running the Google Drive scanner rebuilds "
                                   "the data from your original documents."])

        return Result(name, OK,
                      "Your health data is present and complete.",
                      details=details)

    def _recover_data(self, name, problem):
        """The live data file is missing or damaged: offer or perform a restore."""
        backups = list_backups()
        restore_hint = f'python "{pretty_path(Path(__file__).resolve())}" --repair'

        if not backups:
            return Result(name, FAIL,
                          problem + " There are no backups available to restore from.",
                          fix=f'cd "{pretty_path(AGENT_DIR)}" && python hermes_agent.py',
                          details=["Re-running the Google Drive scanner rebuilds "
                                   "the data from your original documents."])

        if not self.repair:
            return Result(name, FAIL,
                          problem + f" A backup from {backups[0].name} is available.",
                          fix=restore_hint)

        ok, message = restore_from_latest_backup()
        if not ok:
            return Result(name, FAIL, problem + " " + message, fix=restore_hint,
                          action_taken="tried to restore from the newest backup",
                          resolved=False)
        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except Exception as exc:
            return Result(name, FAIL,
                          problem + f" The backup was restored but also cannot be read ({exc}).",
                          fix=f'cd "{pretty_path(AGENT_DIR)}" && python hermes_agent.py',
                          action_taken="restored the newest backup",
                          resolved=False)
        result = self._inspect_data(name, data)
        result.action_taken = "restored hermes_data.json from the newest backup"
        result.resolved = result.status != FAIL
        result.message = message + " " + result.message
        return result

    def check_backups(self):
        name = "Backups"
        created = None
        try:
            ensure_backup_dir()
        except Exception as exc:
            return Result(name, WARN,
                          f"The backups folder could not be created: {exc}",
                          fix=f'Create this folder by hand: {pretty_path(BACKUP_DIR)}',
                          fix_kind="steps")

        # Keep a fresh copy whenever the live file is healthy and has changed.
        if self.state.get("data_ok") and not backup_is_current():
            created, message = make_backup(reason="automatic")
            if created:
                log_event(name, OK, message,
                          action_taken="saved a new backup", resolved=True)

        removed = prune_backups()
        backups = list_backups()

        if not backups:
            return Result(name, WARN,
                          "There are no backups of your health data yet.",
                          fix=f'python "{pretty_path(Path(__file__).resolve())}" --backup')

        newest = backups[0]
        when = backup_taken_at(newest)
        details = [f"Newest backup: {newest.name} (saved {when})."]
        if created:
            details.append("A fresh backup was saved during this check.")
        if removed:
            details.append(f"Removed {removed} old backup(s); the newest {KEEP_BACKUPS} are kept.")
        return Result(name, OK,
                      f"{len(backups)} backup(s) of your health data are stored safely.",
                      details=details)

    def check_credentials(self):
        # Presence only. The contents of this file are never read or printed.
        name = "Google Drive credentials"
        if CREDENTIALS_FILE.exists():
            return Result(name, OK,
                          "credentials.json is in place (its contents are never opened "
                          "or shown by this tool).")
        return Result(name, FAIL,
                      f"credentials.json is missing from {pretty_path(AGENT_DIR)}, so the "
                      "scanner cannot reach Google Drive.",
                      fix="Download the OAuth credentials file from Google Cloud Console "
                          f'and save it as: {pretty_path(CREDENTIALS_FILE)}',
                      fix_kind="steps")

    def check_token(self):
        # Presence only. The contents of this file are never read or printed.
        name = "Google Drive sign-in"
        if TOKEN_FILE.exists():
            return Result(name, OK,
                          "token.json is in place, so the scanner is already signed in "
                          "(its contents are never opened or shown by this tool).")
        return Result(name, WARN,
                      "token.json is not there yet. This is normal before the first run - "
                      "the scanner will ask you to sign in to Google once.",
                      fix=f'cd "{pretty_path(AGENT_DIR)}" && python hermes_agent.py')

    def check_api_key(self):
        # The value is never printed, not even partially.
        name = "Claude API key"
        value = os.environ.get("ANTHROPIC_API_KEY", "")
        if value.strip():
            return Result(name, OK,
                          "ANTHROPIC_API_KEY is set (the key itself is never shown "
                          "or written down by this tool).")
        return Result(name, FAIL,
                      "ANTHROPIC_API_KEY is not set, so the analysis step cannot run.",
                      fix='setx ANTHROPIC_API_KEY "your-key-here"',
                      details=["Put your real key in place of your-key-here, then close "
                               "and reopen the Command Prompt so it takes effect."])

    def _check_packages(self, name, packages, requirements, fail_status, purpose):
        missing = [(mod, dist) for mod, dist in packages if not module_available(mod)]
        if not missing:
            return Result(name, OK,
                          f"All {len(packages)} Python packages for {purpose} are installed.")
        names = ", ".join(dist for _, dist in missing)
        if requirements.exists():
            fix = f'cd "{pretty_path(requirements.parent)}" && pip install -r requirements.txt'
        else:
            fix = "pip install " + " ".join(dist for _, dist in missing)
        return Result(name, fail_status,
                      f"{len(missing)} Python package(s) for {purpose} are missing: {names}.",
                      fix=fix,
                      details=["This tool never installs Python packages on its own - "
                               "run the command above yourself."])

    def check_agent_packages(self):
        return self._check_packages("Scanner packages", AGENT_PACKAGES,
                                    AGENT_REQUIREMENTS, FAIL,
                                    "the Google Drive scanner")

    def check_server_packages(self):
        requirements = SERVER_REQUIREMENTS if SERVER_REQUIREMENTS.exists() else AGENT_REQUIREMENTS
        return self._check_packages("Backend packages", SERVER_PACKAGES,
                                    requirements, WARN,
                                    "the optional backend")

    def check_ports(self):
        name = "Ports"
        dashboard = port_in_use(DASHBOARD_PORT)
        backend = port_in_use(BACKEND_PORT)
        self.state["backend_listening"] = backend
        details = []
        if dashboard:
            details.append(f"Port {DASHBOARD_PORT}: something is already running there - "
                           "most likely your dashboard is open.")
        else:
            details.append(f"Port {DASHBOARD_PORT}: free, the dashboard can start.")
        if backend:
            details.append(f"Port {BACKEND_PORT}: something is already running there - "
                           "most likely the backend.")
        else:
            details.append(f"Port {BACKEND_PORT}: free, the backend can start.")
        return Result(name, OK, "Checked the two doors HERMES uses.", details=details)

    def check_backend(self):
        name = "Backend"
        start_hint = f'cd "{pretty_path(SERVER_DIR)}" && python server.py'
        try:
            request = urllib.request.Request(BACKEND_HEALTH_URL,
                                             headers={"User-Agent": "hermes-guardian"})
            with urllib.request.urlopen(request, timeout=2.5) as response:
                code = getattr(response, "status", response.getcode())
                body = response.read(2048).decode("utf-8", errors="replace").strip()
            if code == 200:
                details = [f"It answered: {short(body, 100)}"] if body else []
                return Result(name, OK, "The backend is running and answering.",
                              details=details)
            return Result(name, WARN,
                          f"The backend answered with an unexpected code ({code}).",
                          fix=start_hint)
        except urllib.error.HTTPError as exc:
            return Result(name, WARN,
                          f"The backend is running but the health page returned an error "
                          f"({exc.code}).",
                          fix=start_hint)
        except Exception:
            return Result(name, WARN,
                          "The backend is not running. This is fine - the dashboard works "
                          "without it.",
                          fix=start_hint)

    # -- the runner -------------------------------------------------------

    def checks(self):
        return [
            self.check_python,
            self.check_node,
            self.check_npm,
            self.check_package_json,
            self.check_node_modules,
            self.check_data_file,
            self.check_backups,
            self.check_credentials,
            self.check_token,
            self.check_api_key,
            self.check_agent_packages,
            self.check_server_packages,
            self.check_ports,
            self.check_backend,
        ]

    def run(self):
        for check in self.checks():
            label = check.__name__.replace("check_", "").replace("_", " ")
            try:
                result = check()
                if not isinstance(result, Result):
                    raise TypeError("check did not return a result")
            except Exception as exc:
                # One broken check must never stop the whole run.
                result = Result(
                    label.title(), FAIL,
                    f"This check could not finish because of an unexpected problem: {exc}",
                    fix="Run this tool again. If it keeps happening, send this message "
                        "to whoever maintains HERMES.",
                    fix_kind="steps",
                    details=[short(traceback.format_exc().splitlines()[-1], 120)])
            self.results.append(result)
            self.report_one(result)
            if result.status in (WARN, FAIL) or result.action_taken:
                log_event(result.name, result.status, result.message,
                          action_taken=result.action_taken,
                          resolved=bool(result.resolved) or result.status == OK)
        return self.results

    # -- printing ---------------------------------------------------------

    def report_one(self, result):
        print(f"{MARKERS.get(result.status, '[????]')}  {result.name}: {result.message}")
        for line in result.details:
            print(f"        {line}")
        if result.action_taken:
            print(f"        What I did: {result.action_taken}")
        if result.fix and result.status in (WARN, FAIL):
            if result.fix_kind == "command":
                print("        To fix this, type this line exactly:")
            else:
                print("        To fix this:")
            print(f"        {result.fix}")
        print()

    def summary(self):
        counts = {OK: 0, WARN: 0, FAIL: 0}
        for result in self.results:
            counts[result.status] = counts.get(result.status, 0) + 1
        print(THIN)
        print(f"SUMMARY: {counts[OK]} fine, {counts[WARN]} worth a look, "
              f"{counts[FAIL]} need fixing (out of {len(self.results)} checks).")
        if counts[FAIL] == 0 and counts[WARN] == 0:
            print("Everything looks healthy. Nothing for you to do.")
        elif counts[FAIL] == 0:
            print("Nothing is broken. The items marked [WARN] are optional or expected.")
        else:
            print("Start with the [FAIL] items above, top to bottom. Each one shows the")
            print("exact line to type. Then run this tool again to confirm the fix.")
            if not self.repair:
                print()
                print("Some problems can be fixed automatically. To try that, type:")
                print(f'        python "{pretty_path(Path(__file__).resolve())}" --repair')
        print(THIN)
        return counts


# ---------------------------------------------------------------------------
# --history
# ---------------------------------------------------------------------------

def print_history():
    entries = read_log()
    print(LINE)
    print(" HERMES Guardian Angel - history of problems and repairs")
    print(f" Log file: {pretty_path(REPAIR_LOG)}")
    print(LINE)
    print()

    if not entries:
        print("Nothing has been recorded yet. Run the health check first:")
        print(f'        python "{pretty_path(Path(__file__).resolve())}"')
        print()
        return 0

    groups = {}
    for entry in entries:
        name = str(entry.get("check", "unknown"))
        group = groups.setdefault(name, {
            "total": 0, WARN: 0, FAIL: 0, "fixed": 0,
            "last": "", "last_message": "",
        })
        group["total"] += 1
        status = entry.get("status")
        if status in (WARN, FAIL):
            group[status] += 1
        if entry.get("resolved"):
            group["fixed"] += 1
        timestamp = str(entry.get("timestamp", ""))
        if timestamp >= group["last"]:
            group["last"] = timestamp
            group["last_message"] = str(entry.get("message", ""))

    ordered = sorted(groups.items(), key=lambda item: (-item[1]["total"], item[0]))

    width = max([len(name) for name in groups] + [16])
    width = min(width, 32)
    header = (f"{'What':<{width}}  {'Times':>5}  {'Failed':>6}  {'Warned':>6}  "
              f"{'Fixed':>5}  Last seen")
    print(header)
    print("-" * len(header))
    for name, group in ordered:
        label = name if len(name) <= width else name[: width - 3] + "..."
        last = group["last"].replace("T", " ")[:16] or "-"
        print(f"{label:<{width}}  {group['total']:>5}  {group[FAIL]:>6}  "
              f"{group[WARN]:>6}  {group['fixed']:>5}  {last}")
    print()

    repeat = [(name, group) for name, group in ordered if group["total"] >= 3]
    if repeat:
        print("These keep coming back, so they may be worth fixing properly:")
        for name, group in repeat:
            print(f"  - {name}: seen {group['total']} times. "
                  f"Last note: {short(group['last_message'], 90)}")
        print()

    print("Most recent 10 entries:")
    for entry in entries[-10:]:
        when = str(entry.get("timestamp", "")).replace("T", " ")[:16]
        marker = MARKERS.get(entry.get("status"), "[????]")
        line = f"  {when}  {marker}  {entry.get('check', '?')}: {short(entry.get('message', ''), 80)}"
        print(line)
        if entry.get("action_taken"):
            fixed = "fixed" if entry.get("resolved") else "not fixed"
            print(f"      -> {entry['action_taken']} ({fixed})")
    print()
    return 0


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def print_header(mode):
    print()
    print(LINE)
    print(" HERMES Guardian Angel")
    print(f" {mode}")
    print(f" {datetime.now().strftime('%A %d %B %Y, %H:%M')}")
    print(f" Project folder: {pretty_path(ROOT)}")
    print(f" Computer: {platform.system()} {platform.release()}")
    print(LINE)
    print()


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="guardian.py",
        description="Check the health of the HERMES system and repair what is safe to repair.")
    parser.add_argument("--repair", action="store_true",
                        help="fix the problems that are safe to fix automatically")
    parser.add_argument("--backup", action="store_true",
                        help="save a backup of your health data right now, then stop")
    parser.add_argument("--history", action="store_true",
                        help="show past problems and repairs, then stop")
    args = parser.parse_args(argv)

    if args.history:
        return print_history()

    if args.backup:
        print_header("Saving a backup of your health data")
        try:
            ensure_backup_dir()
            path, message = make_backup(reason="asked for by you")
        except Exception as exc:
            path, message = None, f"The backup could not be saved: {exc}"
        if path:
            print(f"{MARKERS[OK]}  {message}")
            print(f"        Stored in: {pretty_path(BACKUP_DIR)}")
            print(f"        The newest {KEEP_BACKUPS} backups are kept; older ones are removed.")
            log_event("Backups", OK, message, action_taken="saved a backup on request",
                      resolved=True)
            print()
            return 0
        print(f"{MARKERS[FAIL]}  {message}")
        log_event("Backups", FAIL, message, action_taken="tried to save a backup on request",
                  resolved=False)
        print()
        return 1

    mode = ("Checking everything and repairing what I safely can"
            if args.repair else "Checking everything (nothing will be changed)")
    print_header(mode)

    guardian = Guardian(repair=args.repair)
    try:
        guardian.run()
    except KeyboardInterrupt:
        print("\nStopped at your request.")
        return 1
    counts = guardian.summary()

    print()
    print("Other things you can type:")
    script = pretty_path(Path(__file__).resolve())
    print(f'        python "{script}" --repair    (fix what can be fixed automatically)')
    print(f'        python "{script}" --backup    (save a copy of your health data now)')
    print(f'        python "{script}" --history   (see what has gone wrong before)')
    print()
    return 1 if counts.get(FAIL, 0) else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Absolute last resort: never show a raw Python crash to the user.
        print()
        print("[FAIL]  The Guardian tool itself hit an unexpected problem:")
        print(f"        {short(traceback.format_exc().splitlines()[-1], 200)}")
        print("        Please send this message to whoever maintains HERMES.")
        sys.exit(1)
