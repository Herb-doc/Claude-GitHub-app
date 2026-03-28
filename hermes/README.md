# HERMES — Personal Medical Intelligence

**Health & Evidence Repository, Medical Expert & Synthesis**

Named after Hermes — Greek messenger god, guide of souls, patron of knowledge and transitions — HERMES serves as your personal medical intelligence messenger, carrying your complete health history and delivering clinical insight on demand.

---

## What is HERMES?

HERMES is a private, local medical intelligence system with two parts:

1. **Dashboard** (what you see in your browser) — A clinical-grade interface to view your lab results, track trends, consult an AI medical advisor, generate physician letters, and manage your herbal protocols.

2. **Python Agent** (runs in your terminal) — A script that connects to your Google Drive, finds your medical documents, extracts lab values, and keeps your health record up to date automatically.

---

## Getting Started — Step by Step

### What You Need

- A computer with internet access
- Google Chrome (or any modern browser)
- Your Anthropic API key (for AI features)

### Step 1: Install Node.js

Node.js is what runs the dashboard on your computer.

1. Go to https://nodejs.org/
2. Download the **LTS** version (the big green button)
3. Run the installer — click "Next" through all the steps
4. When done, open your terminal/command prompt and type: `node --version`
5. You should see a version number like `v22.x.x` — that means it worked

### Step 2: Install Python

Python is what runs the Google Drive scanner.

1. Go to https://www.python.org/downloads/
2. Download Python 3.10 or newer
3. **IMPORTANT**: During installation, check the box that says **"Add Python to PATH"**
4. Run the installer
5. Open your terminal and type: `python --version`
6. You should see `Python 3.10.x` or newer

### Step 3: Get Your Anthropic API Key

This key lets HERMES use Claude AI to analyze your labs and answer questions.

1. Go to https://console.anthropic.com/
2. Sign in (or create an account)
3. Go to **API Keys** in the sidebar
4. Click **Create Key**
5. Copy the key — it starts with `sk-ant-`
6. **Keep this key private!** Never share it or post it online.

Set it as an environment variable:
- **Mac/Linux**: Add this line to your `~/.bashrc` or `~/.zshrc`:
  ```
  export ANTHROPIC_API_KEY=sk-ant-your-key-here
  ```
- **Windows**: Search for "Environment Variables" in Settings, add a new one called `ANTHROPIC_API_KEY` with your key as the value.

### Step 4: Start the Dashboard

Open your terminal and run these commands:

```bash
cd hermes/frontend
npm install
npm run dev
```

After a moment, you'll see a message like:
```
Local: http://localhost:5173/
```

Open that link in your browser. You'll see the HERMES dashboard with your pre-loaded health data.

### Step 5: Set Up Google Drive Scanning (Optional)

This step lets HERMES automatically find and parse your medical documents from Google Drive.

#### 5a. Create Google Cloud Credentials

1. Go to https://console.cloud.google.com/
2. Click **Select a Project** at the top, then **New Project**
3. Name it "HERMES" and click **Create**
4. In the sidebar, go to **APIs & Services** → **Library**
5. Search for and enable:
   - **Google Drive API**
   - **Google Docs API**
6. In the sidebar, go to **APIs & Services** → **Credentials**
7. Click **Create Credentials** → **OAuth Client ID**
8. If prompted for a consent screen, choose **External**, fill in your app name as "HERMES", add your email, and save
9. For Application Type, choose **Desktop App**
10. Name it "HERMES Agent"
11. Click **Create**, then **Download JSON**
12. Rename the downloaded file to `credentials.json`
13. Place it in the `hermes/agent/` folder

#### 5b. Install Python Dependencies

```bash
cd hermes/agent
pip install -r requirements.txt
```

#### 5c. Run the Agent

```bash
python hermes_agent.py
```

The first time you run it, a browser window will open asking you to sign in to Google and grant Drive access. After that, HERMES will:

- Search your entire Drive for medical documents
- Extract text from PDFs, Google Docs, and Word files
- Parse lab values using Claude AI
- Update your master health record
- Generate a health chart document

---

## Dashboard Features

| Tab | What It Does |
|-----|-------------|
| **Dashboard** | Home screen with critical flags, stats, and quick actions |
| **Records** | Full searchable/filterable table of all your lab findings |
| **Trends** | Interactive charts showing how your markers change over time |
| **Analyze** | Paste new lab results for AI-powered analysis |
| **Letters** | Generate professional physician letters with your data |
| **Protocols** | Manage your herbal/supplement protocols |
| **Consult** | Chat with HERMES about your health data |
| **Briefing** | One-click pre-appointment briefing generator |

---

## Security & Privacy

**This is important for protecting your medical data:**

- HERMES runs **entirely on your computer** — your data never goes to any server except Anthropic's API when you use AI features
- **Never commit `credentials.json` or `token.json` to version control** — these files give access to your Google Drive
- **Never share your Anthropic API key** — anyone with it can use your account
- The `.gitignore` file is already set up to exclude these sensitive files
- Consider this a **HIPAA-relevant system** — treat it with the same care you would any medical record

---

## Troubleshooting

**Dashboard won't start:**
- Make sure you ran `npm install` first
- Make sure Node.js is installed (`node --version`)

**Python agent errors:**
- Make sure Python 3.10+ is installed (`python --version`)
- Make sure you ran `pip install -r requirements.txt`
- Make sure `credentials.json` is in the `hermes/agent/` folder

**AI features not working:**
- Check that your `ANTHROPIC_API_KEY` environment variable is set
- Make sure your Anthropic account has API credits

---

*Built with care for Daniel M. Phend, ND, MH — Future Body Sciences, La Porte, Indiana*
