# The Practice OS — Roadmap

**Turning HERMES into the operating system that runs About Your Body LLC.**

Goal: one system where Google agents and Anthropic agents work the same
tools, read the same protocols, and cover the practice end to end — front
desk, intake, clinical research, follow-up, books.

---

## First, a correction about "installing"

Neither of the two pieces you asked for is an install in the way HERMES is.

**Google AI Studio** is a website. There is nothing to download. You sign in
at <https://aistudio.google.com>, and the thing you leave with is an **API
key**. That key is what lets HERMES call Gemini the same way it already calls
Claude.

**Google Antigravity** *is* a real download — an agent-first IDE — but it
installs on **your Windows machine**, not on a server. It is the workbench you
sit at, not a piece of the practice system. It matters here for one specific
reason: Antigravity runs **Gemini and Claude models side by side in the same
workspace**. That makes it the one desk where your Gemini work and your Claude
work can be driven together.

So the hour splits cleanly:

| You do (about 20 minutes) | The system does (everything after) |
|---|---|
| Install Antigravity on your PC | Speaks to HERMES through the shared tool layer |
| Get an AI Studio API key | Becomes HERMES's second model provider |

---

### Which business this is for

HERMES serves **About Your Body LLC** — the naturopathic clinic, client work,
aboutyourbody.net. Everything in this roadmap is that clinic's system.

**Future Body Sciences** is a separate company: herbal formulas and
nutritional products sold to other health professionals. It is deliberately
**out of scope here** and gets stood up after the clinic is finished. When it
comes, it is a different build with a different shape — wholesale and B2B,
not patient care — and it does not touch PHI, so it is not gated by the
compliance work below.

Keeping them apart matters in the code too: anything HERMES generates for a
client, a letter especially, must carry the clinic's name, not the products
company's.

---

### These three are not versions of each other

Worth being blunt about, because the names invite the wrong idea: **none of
these replaces another, and HERMES is not being upgraded into anything.**

| | What it is | Put another way |
|---|---|---|
| **HERMES** | The practice's own system — labs, protocols, records, Guardian | The treatment room and the file cabinet |
| **Antigravity** | A workbench for building software | The tool bench in the back |
| **AI Studio** | A website that hands you an API key | The supplier |

Antigravity holds no patient records and never will. It is where someone
*works on* HERMES — not something that does HERMES's job. HERMES stays, and
everything in this roadmap is built on top of it.

### One of these is optional

**You do not need Antigravity to use AI Studio.** They are independent. The
API key takes five minutes on a website whether or not Antigravity is ever
installed.

The key is the part that matters: it is what makes Gemini callable *by
HERMES*, which is what lets Gems and Claude tools start working the same data.

Antigravity is a developer's IDE, and Claude Code already does that job here.
Its one real draw is running Gemini and Claude side by side in one workspace.
Worth a look eventually — but **nothing in Phases 1–6 is blocked without it.**
If the hour is short, do step 2 and skip step 1.

---

## The hour: Phase 0

### 1 — Install Antigravity (10 min, optional)

1. Go to <https://antigravity.google/download/>
2. Take the **Windows desktop installer**. Ignore the CLI, SDK, and editor
   extensions for now — you do not need them yet.
3. Run it. Accept every default.
4. Sign in with the **same Google account** that holds your practice Drive —
   the one HERMES already authorizes against. Using a different account is the
   single most common way this goes wrong.
5. Open it once and confirm the Agent Manager panel appears.

It is free in public preview for individuals. No card needed.

### 2 — Get an AI Studio key (5 min)

1. Go to <https://aistudio.google.com>, same Google account.
2. **Get API key** → **Create API key**.
3. Create it inside a **new Google Cloud project** named `about-your-body`
   rather than the default scratch project. You will need that project to exist
   later for the compliance work, and making it now saves a migration.
4. Copy the key.

### 3 — Store the key the way HERMES expects (5 min)

Open Command Prompt:

```
setx GOOGLE_API_KEY "your-key-here"
```

Close and reopen Command Prompt so it takes effect. This matches how
`ANTHROPIC_API_KEY` is already stored, so Guardian can learn to check for both.

**Do not** paste this key into a chat, a Gem, a document, or a screenshot.
Same rule as the Anthropic key.

### 4 — Confirm

```
cd %USERPROFILE%\Downloads\Claude-GitHub-app\hermes\guardian
python guardian.py
```

Still green. Nothing you just did should have disturbed HERMES.

**That is the hour.** What follows is the actual build.

---

## The architecture — why this becomes one system

The instinct is to look for a product that merges Google and Anthropic. There
isn't one, and waiting for one would cost you a year.

What actually unifies them is a layer underneath both, and you already have
two thirds of it:

```
            YOUR AGENTS (either vendor, interchangeable)
   Gemini Gems · Antigravity agents · Claude Skills · Claude Code
                             │
                             ▼
                  ══ THE SHARED TOOL LAYER (MCP) ══
                             │
        ┌────────────────┬───┴────────┬─────────────────┐
        ▼                ▼            ▼                 ▼
   HERMES data      Google Workspace  Phone/scheduling  QuickBooks
   labs, protocols  Drive Gmail Cal   (to be built)     books
   patient records
```

**MCP — Model Context Protocol — is the operating system you are asking for.**
It is an open standard for exposing tools to AI agents. Claude speaks it.
Gemini and Antigravity speak it. A tool you write once is callable by both.

That gives you the real answer to "hook all my bits together": you do not port
your Gems to Claude or your Skills to Gemini. **You leave them where they are
and point them at the same tools and the same protocol files.** A Gem that
looks up an herb-drug interaction and a Claude Skill that does it are calling
the identical HERMES function and getting the identical answer.

Three things make that work, and they are the whole build:

1. **HERMES becomes an MCP server.** Its lab data, protocols, patient records,
   and interaction checks stop being locked inside the dashboard and become
   tools any agent can call. This is the keystone — almost nothing else in this
   roadmap works until it exists.
2. **The repo is the source of truth for behavior.** Your protocols, intake
   scripts, red-flag rules, and scope-of-practice boundaries live in version-
   controlled files that both vendors' agents read. Change a rule once; every
   agent changes.
3. **Model choice becomes a routing decision, not an identity.** Gemini for
   long-context document work and voice; Claude for clinical reasoning and
   writing. Whichever is better at a job gets that job.

---

## The gate that governs everything downstream

An AI secretary answering your phone and fielding patient questions is
handling **PHI**. That is not a formality — it changes which products you are
allowed to use, and it has real lead time, so it starts now, in parallel with
Phase 1, not after it.

Two specifics that will bite if missed:

- **The AI Studio key you just made is not HIPAA-covered.** Google AI Studio is
  a developer playground and is excluded from Google's BAA. It is fine for
  prototyping with fake data. The moment a real patient name goes through it,
  you are out of compliance. Production patient traffic runs through **Vertex
  AI** on a Google Cloud project with a **signed BAA** — same Gemini models,
  different door. (Verify the exact product names on Google's covered-services
  list when you sign; the naming there is inconsistent.)
- **Consumer Claude and consumer Gemini are also not covered.** Patient-facing
  work runs through the APIs under a commercial agreement with a BAA, not
  through the chat apps. Your own internal use of the chat apps — thinking
  through a case without patient identifiers — is a different matter.

And one clinical boundary worth writing into the system rather than trusting to
memory: **the patient-facing agent books, reschedules, answers logistics, and
triages. It does not answer clinical questions.** Clinical questions get
captured, flagged, and routed to you — the agent drafts, you approve. That
protects scope of practice and keeps a licensed human on every clinical
utterance. The research agent in Phase 5 is powerful precisely because it is
pointed at *you*, not at patients.

This is a real constraint, not a reason to build less. Everything below is
designed around it.

---

### If Antigravity does get installed

Antigravity 2.0 runs standalone, without an IDE, and ships a CLI called `agy`
with its own scheduled tasks. Hermes Agent carries an `antigravity-cli` skill
in its optional catalog, off until switched on, that drives `agy` and reads
its logs back. So the two connect without anything being bought.

None of that is needed here. The clinic's agents reach HERMES through MCP,
which both Claude and Gemini already speak, and that is the layer worth
building. Antigravity stays what it was: a place to work on the code.

Worth knowing because bundles of these free parts are sold pre-wired. The
components — the skill, the CLI, Antigravity itself, an Obsidian vault, the
schedulers — all cost nothing and ship with the tools. What such a bundle
sells is the wiring and the support around it, not capability that is
otherwise out of reach.

A shared notes vault is also not the same thing as a shared tool layer. Notes
give an agent something to read about a protocol. Tools let it run the
interaction check against a real medication list. The second is what clinical
work needs, and it is what MCP provides.

---

## Tools evaluated

A running record, so a tool already looked at does not get re-litigated. The
question that decides clinical use is always the same: **will the vendor sign
a BAA?** Everything else is secondary.

| Tool | What it is | Verdict |
|---|---|---|
| **Hermes Agent** (Nous Research) | Open-source autonomous agent, real project, actively released | **Non-clinical only.** Good candidate for the products company and public content |
| **Hermes Apollo / "Agent OS"** (Julian Goldie) | Voice agent sold as a zip file through a paid community | **No.** Built for marketing businesses, unverifiable provenance, always-listening by default |
| **Cloudways** | Managed hosting, the usual way Hermes Agent is run | **Will not sign a BAA.** No patient data, ever |
| **DigitalOcean** | Cloudways' parent company | **Signs a BAA**, for designated covered products with Standard or Premium support |
| **Google AI Studio** | Gemini API keys and prototyping | **Not BAA-covered.** Prototyping with non-patient data only |
| **Vertex AI** | Same Gemini models via Google Cloud | **BAA available.** The production route for anything patient-facing |

Note the Cloudways/DigitalOcean split. A parent company signing a BAA says
nothing about its subsidiary, and the names invite exactly that assumption.
Check the vendor actually being paid.

Three unrelated products share the Hermes name: this system, the Nous Research
agent, and the Goldie voice product. A video about "the new Hermes update" is
almost never about this one.

---

## Phases

### Phase 1 — The spine *(week 1)*

Make HERMES callable by agents.

- Wrap the existing HERMES data layer in an MCP server: `get_patient_record`,
  `search_labs`, `check_herb_drug_interaction`, `get_protocol`, `flag_finding`.
- Add Gemini as a second provider alongside Anthropic in `hermes_agent.py`,
  selected by config rather than hardcoded.
- Teach Guardian to check `GOOGLE_API_KEY` and the MCP server's health, so a
  broken spine shows up in the tab you already trust.
- Register the server in both Claude Code and Antigravity.

**Done when:** you ask a question in Antigravity and in Claude, and both pull
the same lab value out of HERMES.

**In parallel:** start the BAA paperwork — Google Cloud and Anthropic. It is
the long pole and it blocks Phase 3.

### Phase 2 — Protocols as code *(week 2)*

Your forty years of practice, written where agents can read it.

- `protocols/` — your standing herbal protocols, immune and autoimmune first,
  since that is where your volume and your expertise concentrate.
- `protocols/red-flags.md` — what forces a same-day callback or an ER referral.
  This file is a safety control; treat it as the most important file in the
  repo.
- `protocols/scope.md` — what an agent may say, what it must route to you.
- `protocols/intake.md` — your intake questions, in your order, in your words.

Both vendors' agents load these. This is where the system stops being generic
software and starts being *your* practice.

### Phase 3 — The front desk *(weeks 3–4 — gated on BAAs)*

The virtual secretary. Voice, on a BAA-covered telephony vendor (Twilio has
signed BAAs for years and is the safe default), with the model behind it on
Vertex or the Anthropic API.

Ship it in this order, because the risk climbs with each step:

1. **After-hours only, messages only.** Takes a message, no scheduling. Lowest
   possible stakes, and it still recovers calls you currently lose.
2. **Scheduling.** Book, reschedule, cancel against your real calendar.
3. **Logistics questions.** Hours, location, parking, what to bring, insurance,
   first-visit expectations — from a file you control.
4. **Triage and routing.** Recognizes a clinical question, captures it
   verbatim, flags urgency against `red-flags.md`, routes to you.

Every call transcribed into the patient record. Every clinical question
surfaced in your morning briefing.

### Phase 4 — Intake and pre-visit *(weeks 5–6)*

- Intake form → structured record, before they arrive.
- Agent reads their history and drafts the pre-appointment briefing — HERMES
  already has a Briefing tab; this fills it automatically.
- Herb-drug interaction check runs against their current medication list
  without you asking.
- You walk in already knowing what you are looking at.

### Phase 5 — The clinical research desk *(weeks 7–8)*

Internal-facing, pointed at you, and the piece with the highest ceiling.

- Mechanism-first research on a botanical, a constituent, or a target — you
  already have the `botanical-mechanism-research` skill for exactly this.
- PubMed and Scholar are already wired into your Claude tooling.
- Gemini's long context handles whole papers and multi-document synthesis;
  Claude handles the clinical reasoning and the write-up.
- Output lands in HERMES as a citable protocol note, not a chat message that
  scrolls away.

This is the one that compounds. A plant-chemistry question you would have
spent an evening on becomes a twenty-minute answer with citations you can
defend.

### Phase 5b — Voice for the practitioner *(after Phase 5)*

Deep tissue work occupies both hands for most of a working day. Washing up to
reach a keyboard is the reason a question goes unasked, so the practitioner's
own voice interface to HERMES earns its place here in a way it would not in a
desk-bound practice.

- Push-to-talk, never always-listening. A microphone that is open by default
  in a room where clients discuss their health is a consent problem before it
  is a technical one.
- Read-only to start: pull up a trend, a protocol, a past finding, an
  interaction check. Speaking a change into a patient record is a different
  risk and waits.
- Runs against HERMES through the same MCP tools as everything else, so it
  inherits the existing boundaries rather than inventing its own.

Worth separating from the Phase 3 front desk, which is voice pointed at
*patients*. This one is pointed at the practitioner, mid-session, and is the
narrower and safer of the two.

### Phase 6 — Follow-through and books *(ongoing)*

- Post-visit follow-up on your schedule, drafted for your approval.
- Protocol adherence check-ins.
- QuickBooks is already connected — invoicing, aging, and the monthly picture
  become something you are told rather than something you go looking for.
- Email triage is already built; fold its output into the same morning
  briefing so there is one place you look each day.

---

## What never becomes an agent's job

Worth stating plainly, because the pressure will be to hand over more:

- Diagnosis.
- Any change to a protocol for a specific patient.
- Anything said to a patient about their clinical situation without your review.
- The decision that something is urgent. The agent flags; you decide.

The agents remove the work that was never clinical in the first place —
scheduling, chasing, transcribing, searching, invoicing — and hand you back the
hours. The judgment stays yours. That is not a limitation of the technology;
it is the design.

---

## Open questions

These shape Phases 3 and 4, and I need your answers before building them:

1. **What do you schedule in today?** Google Calendar alone, or a practice
   management system / EHR? This decides how the front desk writes appointments.
2. **What is your phone setup now?** A landline, a cell, a service? Porting or
   forwarding a number is the first concrete step of Phase 3.
3. **Roughly how many calls a day**, and what share are scheduling versus
   clinical questions? Determines whether Phase 3 step 1 is worth shipping on
   its own.
4. **Is About Your Body LLC's EIN in hand?** Google
   and Anthropic both want one on a BAA.
