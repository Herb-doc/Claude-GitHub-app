# HERMES Backend Server

This is the bridge between your HERMES dashboard and Google.

The dashboard runs in your browser, and browsers aren't allowed to talk to
Google Drive directly. This little server runs on your own computer, holds
your Google login, and hands the dashboard the information it asks for.

**Nothing leaves your computer.** The server only listens on `127.0.0.1`,
which means only programs on your own machine can reach it.

---

## What it powers

| Dashboard tab | What the server does |
|---------------|----------------------|
| **Patients** | Searches Drive by patient name, opens folders, reads documents |
| **Workspace** | Shows your Gmail, Drive files, Google Docs, and Calendar |
| **Guardian** | Reports whether everything is connected |

Without the server running, the rest of HERMES still works — your health
record, trends, letters, protocols, and the Consult chat are all local.

---

## Setup — do this once

### Step 1: Install Python packages

Open **Command Prompt** and go to the server folder:

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\server
```

Then install what it needs:

```
pip install -r requirements.txt
```

### Step 2: Get your Google credentials file

You need a file called `credentials.json`. Here's how to make one:

1. Go to https://console.cloud.google.com/
2. Click **Select a Project** at the top, then **New Project**
3. Name it `HERMES` and click **Create**
4. In the left sidebar, go to **APIs & Services → Library**
5. Search for and **Enable** each of these four:
   - Google Drive API
   - Google Docs API
   - Gmail API
   - Google Calendar API
6. Go to **APIs & Services → Credentials**
7. Click **Create Credentials → OAuth Client ID**
8. If it asks for a consent screen: choose **External**, name it `HERMES`,
   add your own email where asked, and save. When it asks for test users,
   add your own Gmail address.
9. Back at Create OAuth Client ID, choose **Desktop App** as the type
10. Name it `HERMES Agent` and click **Create**
11. Click **Download JSON**
12. Rename the downloaded file to exactly `credentials.json`
13. Move it into the `hermes\agent\` folder

### Step 3: Sign in to Google

Still in Command Prompt, in the `hermes\server` folder:

```
python authorize.py
```

Your browser will open. Sign in with your Google account and click through
the permission screens.

> Google may show a warning that the app isn't verified. That's expected —
> it's *your* app, that you just created. Click **Advanced**, then
> **Go to HERMES (unsafe)**. It is your own project reading your own files.

When it finishes, you'll see "Signed in." You only do this once.

---

## Running it

Every time you want to use the Patients or Workspace tabs:

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\server
python server.py
```

Leave that window open. You should see:

```
Serving on http://127.0.0.1:8000
```

Now start the dashboard in a **second** Command Prompt window:

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

**You need both windows open at the same time** — one for the server, one
for the dashboard.

---

## Something not working?

Open the **Guardian** tab in the dashboard. It checks everything and tells
you exactly what to type to fix it.

Or run the Guardian directly:

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\guardian
python guardian.py
```

**"Cannot reach the HERMES backend"** in the dashboard means the server
isn't running. Start it with `python server.py`.

**"Google login expired"** means you need to sign in again:
`python authorize.py`

---

## Security notes

- `credentials.json` and `token.json` are your keys to your Google account.
  Never share them, never email them, never commit them. The `.gitignore`
  already excludes them.
- The server binds to `127.0.0.1` only, so nothing on your network can reach
  it — only your own computer.
- All Google permissions are **read-only** except `drive.file`, which lets
  the agent save the health chart it generates back to your Drive.
- Patient records are protected health information. Treat this machine, and
  these files, the way you'd treat a filing cabinet of paper charts.
