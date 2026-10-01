# HERMES Guardian Angel

A safety net for HERMES.

When something stops working — the dashboard will not open, your lab results
disappear, the Google Drive scanner refuses to run — this is the one thing you
run. It looks at every part of HERMES, tells you in plain English what is wrong,
and gives you the exact line to type to fix it. Where it is safe to do so, it
fixes the problem itself.

It is deliberately built to keep working when everything else is broken. It
needs nothing but Python itself, so a broken installation cannot stop it from
telling you what is broken.

---

## How to run it

Open **Command Prompt** (press the Windows key, type `cmd`, press Enter), then
type these two lines, pressing Enter after each:

```
cd C:\HERMES\hermes\guardian
python guardian.py
```

> Replace `C:\HERMES\hermes` with wherever your HERMES folder actually lives.
> A quick way to get it right: open the `guardian` folder in File Explorer,
> click the address bar, copy the path, and paste it after `cd `.

You will get a report where every line starts with one of three markers:

| Marker   | What it means                                                        |
| -------- | -------------------------------------------------------------------- |
| `[ OK ]` | This part is healthy. Nothing to do.                                  |
| `[WARN]` | Worth a look, but nothing is broken. Often normal or optional.        |
| `[FAIL]` | This is broken and something will not work until it is fixed.         |

### The four commands

| Type this                  | What it does                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| `python guardian.py`       | Checks everything and prints a report. Changes nothing.             |
| `python guardian.py --repair` | Checks everything, then fixes what is safe to fix automatically. |
| `python guardian.py --backup` | Saves a copy of your health data right now.                      |
| `python guardian.py --history` | Shows what has gone wrong before, and how often.                |

If a check fails, the usual routine is:

1. Run `python guardian.py --repair` and let it fix what it can.
2. For anything still marked `[FAIL]`, type the command it prints. It prints
   the command on its own line so you can copy it exactly.
3. Run `python guardian.py` again to confirm everything is green.

---

## What each check means

**Python** — the language HERMES's scanner and backend are written in.
Version 3.10 or newer is required.

**Node.js** — the engine that runs your dashboard. Version 18 or newer is
required. Without it the dashboard cannot start at all.

**npm** — the installer that comes with Node.js. It fetches the pieces the
dashboard is built from.

**Dashboard settings file** — `frontend/package.json`, the list of what the
dashboard needs. If this is damaged, nothing about the dashboard will work.

**Dashboard packages** — the `node_modules` folder, the several hundred small
pieces the dashboard is assembled from. This folder goes missing surprisingly
often (it is huge, so it is usually not copied along with the project).
**Guardian can repair this one for you.**

**Health data file** — `frontend/src/data/hermes_data.json`, your actual lab
findings and protocols. Guardian checks that it opens, that it has the three
sections it should have (findings, protocols, metadata), and that each finding
has a date, a test name, a value and a flag. It reports how many of each it
found, so if the number suddenly drops you will see it.
**Guardian can repair this one for you**, by restoring your most recent backup.

**Backups** — Guardian quietly keeps timestamped copies of your health data in
`guardian/backups/`. It saves a fresh copy whenever your data has changed since
the last one, and keeps the 10 most recent. This is the safety net underneath
the safety net: if the data file is ever damaged, `--repair` puts the last good
copy back. A damaged file is never simply deleted — it is set aside in the
backups folder ending in `.bad`, in case anything needs to be rescued from it.

**Google Drive credentials** — `agent/credentials.json`, the file that lets the
scanner reach your Google Drive. Guardian only checks that the file *exists*.
It never opens it, never reads it, and never prints anything from inside it.

**Google Drive sign-in** — `agent/token.json`, created the first time you sign
in to Google. A warning here is completely normal before your first scan.
As with the credentials, Guardian only checks that it exists.

**Claude API key** — the `ANTHROPIC_API_KEY` setting, which lets HERMES analyse
your documents. Guardian reports only whether it is set or not. **Your key is
never printed, never logged, and never written down anywhere by this tool.**

**Scanner packages / Backend packages** — the Python add-ons the scanner and
backend need. Guardian will tell you which are missing and print the install
command, but it will **never install anything itself** — that decision stays
yours.

**Ports** — the two "doors" HERMES uses: 5173 for the dashboard and 8000 for
the backend. Guardian tells you whether something is already running on them.
Either answer is fine; this is information, not a problem.

**Backend** — checks whether the backend is answering at
`http://127.0.0.1:8000/api/health`. The backend is optional, so if it is not
running you get a `[WARN]`, never a `[FAIL]`. The dashboard works without it.

---

## What to do when something says FAIL

Work down the list from the top — earlier failures often cause later ones.
Fixing Node.js first, for example, may clear the dashboard failures too.

**"Node.js is not installed"**
Go to <https://nodejs.org>, download the big green **LTS** button, and run the
installer, accepting all the defaults. Close and reopen Command Prompt, then
run Guardian again.

**"The dashboard's supporting packages are missing"**
Run `python guardian.py --repair`. It will install them for you. This takes a
few minutes and prints a lot of text — that is normal. Leave it alone until it
finishes.

**"hermes_data.json is missing / is damaged"**
Run `python guardian.py --repair`. It restores your most recent backup. If
Guardian says there are no backups, re-run the Google Drive scanner to rebuild
your data from your original documents:

```
cd C:\HERMES\hermes\agent
python hermes_agent.py
```

**"credentials.json is missing"**
This file comes from the Google Cloud Console and cannot be recreated
automatically. Download your OAuth credentials file and save it into the
`agent` folder with the exact name `credentials.json`.

**"ANTHROPIC_API_KEY is not set"**
In Command Prompt, type the following with your real key in place of
`your-key-here`, then **close and reopen Command Prompt** so the change takes
effect:

```
setx ANTHROPIC_API_KEY "your-key-here"
```

**"Python packages are missing"**
Type the command Guardian prints, which will look like:

```
cd C:\HERMES\hermes\agent
pip install -r requirements.txt
```

**"This check could not finish because of an unexpected problem"**
Guardian itself hit something it did not expect. It carries on with the other
checks regardless, so the rest of the report is still trustworthy. Run it once
more; if the same message appears, send it to whoever maintains HERMES.

---

## The history: HERMES remembering how it broke

Every problem and every repair is recorded, one line at a time, in
`guardian/repair_log.jsonl`. To read it back:

```
python guardian.py --history
```

You get a table of every check, how many times it has been reported, how many
of those were failures, and how many were fixed — with the ones that keep
coming back called out separately. That is the real value over time: if the
dashboard packages have vanished six times, that is not bad luck, it is a
pattern worth fixing properly.

---

## What Guardian will never do

- It will never print, log, or copy your Claude API key.
- It will never open or display the contents of `credentials.json` or
  `token.json`. It only checks that those files are there.
- It will never install Python packages behind your back.
- It will never delete your health data. A damaged file is always set aside,
  never thrown away.
- Without `--repair`, it changes nothing at all except saving a backup of your
  health data and writing to its own log.
