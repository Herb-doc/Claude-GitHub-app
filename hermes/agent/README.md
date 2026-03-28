# HERMES Agent — Google Drive Scanner

This Python script connects to your Google Drive, finds medical documents, extracts lab data using AI, and keeps your master health record updated.

## Setup

### 1. Google Cloud Credentials

See the main README for step-by-step instructions on getting `credentials.json` from Google Cloud Console.

Place the file here:
```
hermes/agent/credentials.json
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Your API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 4. Run

```bash
python hermes_agent.py
```

## What It Does

1. **Authenticates** with Google Drive using OAuth2
2. **Scans** your entire Drive for medical documents (blood work, lab results, scans, etc.)
3. **Extracts** text from Google Docs, PDFs, and Word files
4. **Parses** extracted text with Claude AI to identify lab values, reference ranges, and flags
5. **Deduplicates** against your existing health record
6. **Updates** the master `hermes_data.json` file that the dashboard reads
7. **Generates** an updated `Daniel_Phend_Health_Chart.docx`
8. **Reports** a summary of what was found

## Files

- `hermes_agent.py` — Main script
- `requirements.txt` — Python dependencies
- `credentials.json` — Your Google OAuth credentials (you provide this)
- `token.json` — Auto-generated after first authentication

## Security

- **Never share or commit `credentials.json` or `token.json`**
- The API key should always be set via environment variable, never hardcoded
