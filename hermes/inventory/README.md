# HERMES Inventory

Counts and lists everything in a Google account's Drive so you know what
agents, prompts, finance files and programs already exist.

```
cd hermes\server
pip install -r requirements.txt
cd ..\inventory
python inventory.py --account personal
python inventory.py --account business
```

Each run opens a browser: sign in with the account named on the command.
Reports land in `output\` (git-ignored — file names may include patients).

Read-only: it only requests `drive.metadata.readonly`.
