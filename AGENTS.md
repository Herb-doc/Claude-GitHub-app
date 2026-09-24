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

This repository belongs to a healthcare practice, and patient records are PHI.

The line that decides everything is not Google versus Anthropic. It is
**identifiable patient information versus everything else.**

Inside the line — covered services only:
patient intake, clinical notes naming a patient, blood panels tied to a person,
physician letters, protocols written for a named patient, scheduling that
identifies who.

Outside it — use whatever tool is best:
botanical mechanism research, monographs, patient-education templates written
for no one in particular, business operations, work on this system itself, and
de-identified case discussion. **Daniel's own health records are outside the
line — he is not his own patient.**

- **Never paste identifiable patient data into a service without a signed BAA.**
  Google AI Studio, Gems, NotebookLM, Workspace Studio and the consumer Claude
  and Gemini apps are not covered. Note that **Vertex AI is absent from
  Google's covered list**; the covered service is Gemini Enterprise Agent
  Platform. Verify names against Google's list rather than assuming.
- **Never commit** `credentials.json`, `token.json`, API keys, or any file
  containing patient information. `.gitignore` covers the known ones; that is
  not a substitute for checking.
- `hermes_data.json` holds Daniel's **own** findings, so it sits outside the
  line. The **Patients tab is different** — it pulls other people's records
  from Drive, and that is PHI.
- Whether About Your Body LLC is a HIPAA covered entity is an open legal
  question for an Indiana attorney. Do not assume either answer.
- When a task does not need patient data, do not load it.

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
