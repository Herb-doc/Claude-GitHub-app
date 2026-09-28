# AGENTS.md — shared context for every agent on this repository

Read by Google Antigravity and by Claude Code at session start. Anything true
of this practice belongs here once, so both toolchains get the same answer.
Tool-specific instructions go in `CLAUDE.md` or `GEMINI.md`; this file stays
vendor-neutral.

## Who this is for

Daniel M. Phend, ND, MH — Naturopathic Doctor and Master Herbalist, 40+ years
in practice. Specializes in immune and autoimmune disorders, plant chemistry,
and deep tissue and nerve decompression bodywork.

## The two businesses — do not conflate them

**About Your Body LLC** — the naturopathic clinic. Client work, consultations,
bodywork. Online at aboutyourbody.net. **This is what HERMES serves.** Anything
generated for a client — a letter, a protocol, a briefing — carries this name.

**Future Body Sciences** — a separate company selling herbal formulas and
nutritional products to other health professionals. Wholesale and B2B. Not yet
stood up, and out of scope for HERMES. It handles no patient data.

Both share one address:

```
901 East Reynolds Street
Goshen, IN 46526
```

Practice facts live in `hermes/frontend/src/data/hermes_data.json` under
`metadata`, and the application reads them from there. Change them there, not
in prompt strings — hardcoding these details into prompts is what previously
put the wrong company and the wrong city on generated letters.

## What HERMES is

A local medical intelligence system for the clinic: lab findings, herbal
protocols, patient records, physician letters, and a content studio. React
dashboard, Python backend, Drive scanner, plus Guardian for health checks.

It runs on the practitioner's own machine. It shares a name with Nous
Research's Hermes Agent and with a voice product called Hermes Apollo. It is
neither, and has no public releases.

The plan for what it becomes: `hermes/docs/PRACTICE-OS-ROADMAP.md`.

## Handling patient data

This repository belongs to a healthcare practice. **As of 28 September 2026,
Daniel has made the call: HIPAA compliance is not a target for this build.**
No BAA-chasing, no covered-entity determination gating the work. That was the
previous stance and it is superseded — don't resurrect it.

What replaces it is not "anything goes." The standard is **strong security on
patient data regardless of compliance framework**, because it is still other
people's medical information and still worth protecting on its own merits:

- **No plaintext patient data leaves the machine to an uncontrolled
  destination.** A local backend holding API keys server-side is fine. A
  browser prompt asking for a key, then POSTing a patient's file and name
  straight to a third-party API, is not — that pattern is being removed
  wherever it appears (see the Patients tab fix, Phase 1 of the roadmap).
- **No secrets in the browser, in prompts, or in git.** Never commit
  `credentials.json`, `token.json`, API keys, or any file containing patient
  information. `.gitignore` covers the known ones; that is not a substitute
  for checking `git status` before a commit.
- **Prefer de-identification where it costs nothing.** A case code instead of
  a name, a year instead of a date of birth, costs nothing when the task
  doesn't need the identity, and it's cheap insurance later if the compliance
  question ever gets reopened.
- **Local-first.** HERMES already runs on the practitioner's own machine with
  a backend bound to 127.0.0.1. Keep that shape — it's the actual security
  control, not a formality.
- `hermes_data.json` holds Daniel's **own** findings. The **Patients tab is
  different** — it pulls other people's records from Drive, and that data
  gets the same care above even though it isn't gated on a BAA anymore.
- When a task does not need patient data, do not load it.

If the compliance question ever comes back (insurance billing changes, a
partner practice, an attorney's answer), the code should not have to be
rebuilt from scratch to satisfy it — that's the practical reason "strong
security" and "no compliance target" aren't the same as "no discipline."

## Clinical boundaries

These hold for any agent working on or through this system:

- **No diagnosis.** Ever.
- **No change to a protocol for a specific patient** without the practitioner.
- **Nothing clinical goes to a patient unreviewed.** Draft it and hand it over.
- **The agent does not decide urgency.** It flags; the practitioner decides.
- **Never fabricate a citation, a PMID, or a study result.** Where confidence
  in a reference is lacking, describe the strength of evidence in plain words
  instead. This is already a standing rule in the Letters and Website prompts
  and it is not negotiable.

Scope of practice is a licensing matter, not a preference.

## Repository map

```
hermes/
  frontend/     React dashboard (Vite + Tailwind); npm run dev → :5173
    src/components/   One file per tab
    src/data/hermes_data.json   Findings, protocols, metadata
  server/       FastAPI backend for Google Workspace; 127.0.0.1:8000 only
  agent/        Drive scanner — finds medical documents, extracts labs
  guardian/     Health checks and repair; runs with no dependencies
  docs/         Roadmap
```

## Working conventions

- **Verify before pushing.** `cd hermes/frontend && npm run build` must pass.
- **Guardian must stay dependency-free.** It is the tool that works when
  everything else is broken. Nothing gets imported into it.
- The backend binds `127.0.0.1` deliberately. Do not widen it.
- Write for a reader who is a clinician, not a programmer. The existing docs
  are plain, warm, and step-by-step — match that.
- Prefer correcting the data file over correcting a symptom downstream.
