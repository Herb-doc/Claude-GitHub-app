# HERMES — Personal Medical Intelligence

**Health & Evidence Repository, Medical Expert & Synthesis**

Named after Hermes — Greek messenger god, guide of souls, patron of knowledge and transitions — HERMES carries your complete health history and delivers clinical insight on demand.

---

## What HERMES is

Three pieces that work together:

1. **Dashboard** — what you see in your browser. Your labs, trends, patient
   records, mail, protocols, and an AI advisor that knows your whole history.
2. **Backend server** — runs quietly on your computer, holds your Google
   login, and feeds the dashboard your Drive, Gmail, Docs and Calendar.
3. **Guardian** — watches over the whole system, tells you when something
   breaks, and remembers how it was fixed last time.

Everything runs on your own machine. Your medical data never goes to any
server except Anthropic's API, and only when you use an AI feature.

---

## The tabs

| Tab | What it does |
|-----|-------------|
| **Home** | Critical flags, stats, and quick actions |
| **Patients** | Type a name, pull up every record for them from your Drive |
| **Records** | Every lab finding, searchable and filterable |
| **Trends** | Charts showing how your markers move over time |
| **Consult** | Chat with HERMES about your health data |
| **Analyze Labs** | Paste new results for AI parsing and flagging |
| **Letters** | Generate physician letters with your data and citations |
| **Herbs** | Manage protocols, check herb-drug interactions |
| **Briefing** | One-click pre-appointment briefing |
| **Workspace** | Your Gmail, Drive, Docs and Calendar in one place |
| **Practice** | Website links and an AI content studio for aboutyourbody.net |
| **Guardian** | System health and repair commands |

The bottom bar holds the five you use most. Tap **More** for the rest.

---

## Getting started

### What you need first

- **Node.js** — https://nodejs.org/ (download the LTS version, click through
  the installer). Check it worked: open Command Prompt and type `node --version`
- **Python 3.10+** — https://www.python.org/downloads/
  **Important:** during install, tick the box that says *"Add Python to PATH"*.
  Check it worked: `python --version`
- **An Anthropic API key** — https://console.anthropic.com/ → API Keys →
  Create Key. It starts with `sk-ant-`. Keep it private; never post it anywhere.

---

### Step 1 — Start the dashboard

Open **Command Prompt** and run:

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\frontend
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

That's enough for Home, Records, Trends, Consult, Analyze, Letters, Herbs,
and Briefing. The AI features will ask for your API key when you use them.

---

### Step 2 — Turn on Patients and Workspace (optional)

These need the backend server, because browsers can't talk to Google directly.

Full walkthrough: **[server/README.md](server/README.md)**

Short version — open a **second** Command Prompt window:

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\server
pip install -r requirements.txt
python authorize.py
python server.py
```

`authorize.py` opens your browser to sign in to Google — you only do that
once. After that, `python server.py` is all you need.

**Keep both windows open** while you use HERMES: one running the server,
one running the dashboard.

---

### Step 3 — Automatic Drive scanning (optional)

The agent hunts through your Drive for medical documents, extracts the lab
values with AI, and adds them to your health record.

See **[agent/README.md](agent/README.md)**.

---

## When something breaks

Open the **Guardian** tab — it checks everything and shows you exactly what
to type to fix it, with a copy button on every command.

Or run it directly:

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\guardian
python guardian.py
```

Add `--repair` to let it fix what it safely can:

```
python guardian.py --repair
```

Guardian keeps a log of every problem and repair, so recurring issues become
visible over time. See `guardian.py --history`.

---

## Common problems

**"Cannot reach the HERMES backend"**
The server isn't running. Open a Command Prompt, `cd` to `hermes\server`,
and run `python server.py`.

**Dashboard won't start**
Make sure you ran `npm install` first, and that `node --version` works.

**"Google login expired"**
Run `python authorize.py` in the `hermes\server` folder.

**AI features do nothing**
Check your Anthropic account has credits at console.anthropic.com.

**`python` is not recognized**
Python wasn't added to PATH during install. Reinstall it and tick that box.

---

## Security & privacy

This is a **HIPAA-relevant system**. Treat it like a filing cabinet of paper
charts.

- HERMES runs entirely on your computer. Nothing is uploaded except what you
  send to Anthropic's API when you use an AI feature.
- **Never commit or share `credentials.json` or `token.json`** — they are keys
  to your Google account. `.gitignore` already excludes them.
- **Never share your Anthropic API key.** Anyone holding it can spend against
  your account.
- The backend listens on `127.0.0.1` only — nothing on your network can reach it.
- Google permissions are read-only, apart from the one that lets the agent save
  a health chart back to your Drive.
- Patient records viewed through the Patients tab are protected health
  information. Lock this machine when you step away.

---

## Where HERMES is going

HERMES is the foundation for a wider system that runs the practice — front
desk, intake, clinical research, follow-up and books, with Google and
Anthropic agents sharing the same tools and the same protocols.

The plan, the compliance gate, and the first hour of setup:
**[docs/PRACTICE-OS-ROADMAP.md](docs/PRACTICE-OS-ROADMAP.md)**

---

*Built for Daniel M. Phend, ND, MH — About Your Body LLC*
*901 East Reynolds Street, Goshen, IN 46526*
