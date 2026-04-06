# CLAUDE.md — Just Search Cold Email AI Automation

## Project Overview

You are operating inside the **WAT Framework (Workflows, Agents, Tools)** for **Just Search** — a UAE-based digital marketing agency. Your mission is to automate the end-to-end sending of AI-personalised cold emails to a contact list provided via CSV upload or Google Sheets, using **n8n** as the automation backbone and the **Gemini API** to generate a unique, personalised email for each prospect. The system features a professional React dashboard with Just Search's brand identity (dark theme, orange `#FF6B35` accent), supporting campaign management, template control, scheduling, live status tracking, and a **Replies inbox tab** showing all inbound responses to sent emails.

---

## The WAT Architecture

### Layer 1 — Workflows (`workflows/`)

Markdown SOPs stored in `workflows/`. Each workflow defines the objective, required inputs, which tools to use and in what order, expected outputs, and edge case handling. Read the relevant workflow before taking any action. Never overwrite workflow files unless explicitly instructed.

### Layer 2 — Agent (You)

You are the decision-maker and orchestrator. Read the workflow → sequence the tools → recover from errors → improve the system. Never attempt execution-layer work directly — delegate to tools.

### Layer 3 — Tools (`tools/`)

Python and Node.js scripts in `tools/` that handle all deterministic execution. API keys and credentials are stored exclusively in `.env`. Never hardcode secrets anywhere else.

---

## Tech Stack

| Layer              | Choice                                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| Frontend           | React + Vite                                                                  |
| Styling            | Tailwind CSS                                                                  |
| UI Font            | `Syne` (headings) + `DM Sans` (body) via Google Fonts                         |
| Brand Colors       | Dark bg `#0D0D0D`, Surface `#161616`, Orange `#FF6B35`, Text `#F5F5F0`        |
| Automation Engine  | n8n (self-hosted or n8n.cloud)                                                |
| Contact Source     | CSV upload (parsed client-side) OR Google Sheets (via n8n Google Sheets node) |
| AI Personalisation | Gemini API (`gemini-2.0-flash`) — unique email per contact                    |
| Email Sending      | Gmail OAuth via n8n (from sales@justsearch.ae)                                |
| Reply Detection    | Gmail Watch / IMAP polling via n8n — matched to sent campaign rows            |
| UI ↔ n8n Bridge    | n8n Webhooks (REST)                                                           |
| Deploy             | Vercel or run locally                                                         |

---

## Project File Structure

```
just-search-email/
├── public/
│   └── logo.svg                        # Just Search logo asset
├── src/
│   ├── components/
│   │   ├── CampaignTab.jsx             # Live stats, start/pause controls, progress
│   │   ├── ContactsTab.jsx             # Table view of contacts with status badges
│   │   ├── TemplateTab.jsx             # AI prompt editor + manual override + preview
│   │   ├── RepliesTab.jsx              # Inbox of all replies matched to contacts
│   │   └── SettingsTab.jsx             # Daily limit, send time, sender config
│   ├── api/
│   │   └── n8n.js                      # All webhook calls to n8n
│   ├── hooks/
│   │   └── usePolling.js               # Generic polling hook (30s intervals)
│   ├── utils/
│   │   └── csvParser.js                # Client-side CSV → contacts array
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── n8n/
│   └── just-search-workflow.json       # Importable n8n workflow (7 nodes)
├── workflows/
│   ├── campaign-launch.md
│   ├── template-update.md
│   ├── settings-update.md
│   ├── reply-sync.md
│   └── error-recovery.md
├── tools/
│   ├── validate-contacts.js            # Validates CSV structure before upload
│   └── preview-email.js               # Generates preview using Gemini API locally
├── .env                                # All secrets — never hardcode
├── CLAUDE.md                           # This file
├── package.json
└── vite.config.js
```

---

## Brand & Design System

### Colors (CSS Variables)

```css
:root {
  --bg-base: #0d0d0d;
  --bg-surface: #161616;
  --bg-elevated: #1e1e1e;
  --accent: #ff6b35;
  --accent-hover: #ff8c5a;
  --accent-muted: rgba(255, 107, 53, 0.12);
  --text-primary: #f5f5f0;
  --text-muted: #8a8a8a;
  --text-dim: #555555;
  --border: #2a2a2a;
  --success: #22c55e;
  --error: #ef4444;
  --warning: #f59e0b;
  --info: #3b82f6;
}
```

### Typography

- `Syne` — headings, tab labels, stat numbers (Google Fonts)
- `DM Sans` — body text, inputs, table cells (Google Fonts)

### Status Badge Colors

| Status  | Color                 |
| ------- | --------------------- |
| pending | `--warning` (#F59E0B) |
| sent    | `--info` (#3B82F6)    |
| failed  | `--error` (#EF4444)   |
| opened  | `--success` (#22C55E) |
| replied | `--accent` (#FF6B35)  |

---

## Core User Journey

1. Sales team opens the **Just Search Email Automation** dashboard
2. **Contacts tab** — upload a CSV or pull from Google Sheets; table shows name, company, email, industry, status
3. **Template tab** — write an AI prompt brief (e.g. "We help companies rank on Google and grow paid leads — pitch our SEO + PPC services") — Gemini API generates a unique personalised email per contact on campaign start
4. **Settings tab** — set daily email cap, preferred send time (GST UTC+4), sender name, reply-to address
5. **Campaign tab** — Start / Pause campaign; live stat cards (Total / Sent / Pending / Failed / Opened / Replied); progress bar
6. **Replies tab** — inbox of all inbound replies matched to contacts; shows reply preview, contact name, company, time received; quick actions (Mark as Lead / Archive / Reply)
7. n8n runs on schedule — reads pending rows → calls Gemini API for personalisation → sends email → writes status back → polls Gmail for replies → surfaces in Replies tab

---

## Google Sheet / CSV Structure

Both input modes must resolve to the same internal schema:

| id  | name | company | email | industry | website | status | sent_at | opened | replied | error |
| --- | ---- | ------- | ----- | -------- | ------- | ------ | ------- | ------ | ------- | ----- |

- **status** values: `pending` / `sent` / `failed` / `opened` / `replied`
- `industry` and `website` are optional but improve AI personalisation quality
- On CSV upload: client-side parser maps columns → validates required fields → pushes to n8n via `POST /webhook/upload-contacts`
- On Google Sheets: n8n reads sheet directly; sheet must be shared with n8n service account
- n8n never re-processes rows where `status != pending`

---

## n8n Workflow — 47 Nodes

### Node 1 — Schedule Trigger

- Fires at configured send time daily (default: 9:00 AM GST)
- Cron: `0 5 * * 1-5` (9:00 AM GST = 05:00 UTC, weekdays)
- Activated / deactivated via n8n API from dashboard Start / Pause

### Node 2 — Google Sheets / Webhook Read

- **Scheduled path**: reads all rows where `status = pending` from Google Sheets
- **Webhook path**: receives contact array from CSV upload via `POST /webhook/upload-contacts`
- Applies daily cap (hardcoded 50) in `Code: Apply Daily Limit` node immediately after read

### Node 3 — Gemini API Personalisation (2 nodes: Code + HTTP Request)

- **Code: Build Campaign Prompt** — builds the prompt string, injecting `name`, `company`, `industry`, `website` from the contact row. Supports manual override mode (skips AI, uses pre-set `emailSubject` / `emailBody`).
- **HTTP Request: Gemini** — calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` using `googlePalmApi` credential stored in n8n. Sends prompt as a `user` message. Config: `maxOutputTokens: 1000`, `temperature: 0.7`.
- **Code: Parse Campaign Email** — extracts `subject` and `body` from Gemini's `candidates[0].content.parts[0].text`, strips any markdown fences, parses JSON. Falls back to a default subject/body on parse error.
- Returns: `{ ...contact, emailSubject, emailBody }` — ready to send
- On error: falls back to generic email copy; marks contact `failed` if Gmail send also fails

**Gemini request shape (n8n HTTP Request body):**

```json
{
  "contents": [{ "role": "user", "parts": [{ "text": "<prompt>" }] }],
  "generationConfig": { "maxOutputTokens": 1000, "temperature": 0.7 }
}
```

**Gemini response parse (Code: Parse Campaign Email):**

```javascript
const raw = item.candidates?.[0]?.content?.parts?.[0]?.text || '';
const cleaned = raw.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(cleaned);
return [{ json: { ...contact, emailSubject: parsed.subject, emailBody: parsed.body } }];
```

### Node 4 — Gmail Send

- Sends from: `sales@justsearch.ae` (Gmail OAuth credential)
- To: recipient email from contact row
- Subject: from Gemini API output
- Body: from Gemini API output (HTML formatted)
- Reply-To: configurable via Settings (default: `sales@justsearch.ae`)
- On error: catches failure, passes error message downstream without stopping workflow

### Node 5 — Google Sheets Write-back

- **Success path**: `status = sent`, `sent_at = ISO timestamp`
- **Failure path**: `status = failed`, `error = error message string`

### Node 6 — Gmail Reply Poller (Separate Workflow — runs every 15 min)

- Uses Gmail node with "Search Emails" action: `in:inbox is:unread`
- Matches `In-Reply-To` header or subject prefix to previously sent campaign emails
- On match: updates contact row → `status = replied`; stores reply snippet in `reply_preview` column
- Pushes matched reply to `GET /webhook/replies` response cache

### Node 7 — Reply Webhook Responder

- Responds to `GET /webhook/replies` — returns array of all contacts with `status = replied` plus `reply_preview`, `reply_time`

---

## n8n Webhooks (UI ↔ n8n Bridge)

Base URL in `.env` as `VITE_N8N_BASE_URL`.

| Action                  | Method | Endpoint                   | Payload                                       | n8n Response                                        |
| ----------------------- | ------ | -------------------------- | --------------------------------------------- | --------------------------------------------------- |
| Upload contacts (CSV)   | POST   | `/webhook/upload-contacts` | `{ contacts: [...] }`                         | `{ accepted, rejected }`                            |
| Load contacts           | GET    | `/webhook/contacts`        | —                                             | Array of all sheet rows                             |
| Get campaign stats      | GET    | `/webhook/stats`           | —                                             | `{ total, sent, pending, failed, opened, replied }` |
| Start campaign          | POST   | `/webhook/start`           | —                                             | Activates schedule trigger                          |
| Pause campaign          | POST   | `/webhook/pause`           | —                                             | Deactivates schedule trigger                        |
| Save settings           | POST   | `/webhook/settings`        | `{ dailyLimit, sendTime, timezone, replyTo }` | `{ ok }`                                            |
| Save AI prompt template | POST   | `/webhook/template`        | `{ promptTemplate }`                          | `{ ok }`                                            |
| Get replies             | GET    | `/webhook/replies`         | —                                             | Array of replied contacts + reply preview           |
| Mark as lead            | POST   | `/webhook/mark-lead`       | `{ contactId }`                               | `{ ok }`                                            |
| Archive reply           | POST   | `/webhook/archive`         | `{ contactId }`                               | `{ ok }`                                            |

---

## UI Tabs — Component Responsibilities

### CampaignTab.jsx

- Stat cards: Total / Sent / Pending / Failed / Opened / Replied — each with icon and color coding
- Circular progress ring showing % sent of total
- Start Campaign / Pause Campaign toggle button (orange when active, dim when paused)
- Last sent timestamp + next scheduled run time
- Animated "live" pulse indicator when campaign is active
- Polls `GET /webhook/stats` every 30s via `usePolling` hook

### ContactsTab.jsx

- Upload CSV button with drag-and-drop zone — parses via `csvParser.js`, previews before confirming upload
- OR "Connect Google Sheets" option (triggers n8n webhook to set sheet ID)
- Full table: name, company, email, industry, status badge, sent_at
- Filter bar: All / Pending / Sent / Failed / Opened / Replied
- Search input to filter by name or company
- Colour-coded status badges per design system
- Refresh button and auto-refresh on campaign active

### TemplateTab.jsx

- **AI Prompt Editor** (primary mode): textarea where sales team writes what Just Search does and what angle to pitch — this is passed to Gemini API as the personalisation brief
- **Manual Override** toggle: bypass Gemini API, use a fixed template with `{{name}}` and `{{company}}` merge tags only
- Preview mode: enter a sample name, company, industry → calls `POST /webhook/preview` → renders AI-generated email as it will appear
- Save Template button → calls `POST /webhook/template`
- Character count and quality tips (e.g. "Include your USP, target pain point, and desired CTA")
- Warning if AI prompt is fewer than 50 characters (too vague for personalisation)
- Timestamp of last saved template version

### RepliesTab.jsx

- **Inbox layout** — list of all contacts who replied, sorted by most recent
- Each row shows: contact name, company, email, time of reply, reply snippet preview (first 120 chars)
- Expandable row or slide-out panel showing full reply text
- Action buttons per reply:
  - **Mark as Lead** (green) → calls `POST /webhook/mark-lead` → adds "🏆 Lead" badge
  - **Archive** (grey) → removes from active view
  - **Reply** (orange) → opens `mailto:` with pre-filled address
- Filter: All Replies / Leads / Archived
- Empty state: "No replies yet — check back after your campaign runs"
- Polls `GET /webhook/replies` every 60s when tab is active

### SettingsTab.jsx

- Daily email limit: number input (default: 50, max: 500)
- Preferred send time: time picker (timezone: Asia/Dubai, GST UTC+4)
- Days to send: checkboxes Mon–Sun (default: Mon–Fri)
- Reply-To address: editable email input (default: `sales@justsearch.ae`)
- Sender name: `Just Search Sales Team` — read-only
- Sender email: `sales@justsearch.ae` — read-only
- Contact source toggle: CSV Upload / Google Sheets (shows Sheet ID input if Sheets selected)
- Save Settings button → calls `POST /webhook/settings`
- Note below save button: "⚠ Settings changes apply from the next scheduled send"

---

## AI Email Personalisation — Prompt System

### Default AI Prompt Template (stored as n8n workflow variable)

```
You are a world-class B2B sales copywriter for Just Search, a digital marketing agency in the UAE specialising in SEO, Google Ads (PPC), social media marketing, and web design. Your goal is to write a cold email that will get a response from a decision-maker.

Just Search's core value proposition: We help UAE businesses get more customers online through data-driven search and social strategies. Our clients typically see 2-4x ROI on their marketing spend within 90 days.

Write a highly personalised, concise cold email (max 180 words) to the contact below. The email must:
1. Open with a specific, relevant observation about their company or industry (not generic)
2. Connect their likely pain point to what Just Search solves
3. End with a single, low-friction CTA (e.g. "Worth a 15-min call this week?")
4. Sound like it was written by a human, not an AI — natural, direct, no buzzwords
5. Use the contact's first name only in the greeting

Do NOT use: "I hope this email finds you well", "I wanted to reach out", "synergy", "leverage", "holistic"

Respond ONLY with a valid JSON object — no preamble, no markdown:
{ "subject": "<subject line>", "body": "<full email body as plain text with line breaks using \n>" }
```

### Prompt Variables Available in Template

| Variable               | Description     |
| ---------------------- | --------------- |
| `{{contact.name}}`     | Full name       |
| `{{contact.company}}`  | Company name    |
| `{{contact.industry}}` | Industry type   |
| `{{contact.website}}`  | Company website |

---

## CSV Upload Format

The CSV must contain at minimum: `name`, `email`. All other columns are optional but improve personalisation.

**Required columns:** `name`, `email`
**Optional columns:** `company`, `industry`, `website`

**Example CSV:**

```csv
name,company,email,industry,website
Sarah Johnson,Bloom Interiors,sarah@bloominteriors.ae,Interior Design,bloominteriors.ae
Ahmed Al-Rashid,TechFlow FZCO,ahmed@techflow.io,SaaS / Technology,techflow.io
```

`csvParser.js` validates: no empty `name` or `email`, valid email format, deduplication by email. Rejected rows shown in upload preview with reason.

---

## Workflows

Before taking any action, identify which workflow applies and read it fully from `workflows/`.

### Workflow: Campaign Launch (`workflows/campaign-launch.md`)

1. Verify contacts are loaded — at least 1 row with `status = pending`
2. Verify AI prompt template is set and has > 50 characters
3. Confirm Settings saved: daily limit, send time, reply-to
4. Confirm sender identity configured in n8n Gmail node
5. Call `POST /webhook/start` → UI shows "Campaign Active" with pulse indicator
6. Poll `GET /webhook/stats` every 30s → update CampaignTab stat cards
7. Surface `failed` rows in ContactsTab with error reason visible on hover/expand
8. As replies arrive, RepliesTab badge count increments in real time

### Workflow: Template Update (`workflows/template-update.md`)

1. Sales team edits AI prompt in TemplateTab
2. Optionally tests by entering sample contact → `POST /webhook/preview` → renders AI output
3. On Save → `POST /webhook/template` with `{ promptTemplate }`
4. n8n Code Node reads this variable on next scheduled run
5. Previously sent emails are NOT re-sent
6. Log template version with timestamp in UI state (last 5 versions shown)

### Workflow: Settings Update (`workflows/settings-update.md`)

1. Admin changes settings in SettingsTab
2. On Save → `POST /webhook/settings` with `{ dailyLimit, sendTime, timezone, replyTo }`
3. n8n updates Schedule Trigger cron and Limit node value
4. UI shows success toast: "Settings saved — takes effect on next scheduled send"
5. Sender identity fields are read-only in UI — change only via n8n credential config

### Workflow: Reply Sync (`workflows/reply-sync.md`)

1. n8n Reply Poller workflow runs every 15 minutes
2. Searches Gmail inbox for unread messages
3. Matches to sent campaign contacts via `In-Reply-To` header or subject thread
4. On match: updates Google Sheet row → `status = replied`, stores `reply_preview`
5. `GET /webhook/replies` returns all replied contacts with preview snippets
6. RepliesTab polls this endpoint every 60s when active
7. Sales team reviews replies → marks leads → archives noise

### Workflow: Error Recovery (`workflows/error-recovery.md`)

1. Read the full error carefully before acting
2. Fix the issue and retest before proceeding
3. If fix requires changes affecting live sending — **stop and confirm with user first**
4. Common errors and fixes:
   - Gemini API 429 (rate limit): add exponential backoff via Wait node between batches; reduce batch size
   - Gemini parse error: check `Code: Parse Campaign Email` — raw response may contain extra markdown; strip fences before `JSON.parse`
   - Gmail OAuth expired: re-authenticate Gmail credential in n8n; update token
   - Invalid email format: mark `status = failed`, `error = "Invalid email format"`; continue
   - n8n webhook timeout: UI shows toast "Connection timeout — retrying"; retry after 5s
5. Document the fix in the relevant workflow file

---

## `api/n8n.js`

```javascript
const BASE = import.meta.env.VITE_N8N_BASE_URL;

const handle = async (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
};

export const uploadContacts = (contacts) =>
  fetch(`${BASE}/webhook/upload-contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacts }),
  }).then(handle);

export const getContacts = () => fetch(`${BASE}/webhook/contacts`).then(handle);

export const getStats = () => fetch(`${BASE}/webhook/stats`).then(handle);

export const startCampaign = () =>
  fetch(`${BASE}/webhook/start`, { method: "POST" }).then(handle);

export const pauseCampaign = () =>
  fetch(`${BASE}/webhook/pause`, { method: "POST" }).then(handle);

export const saveSettings = (settings) =>
  fetch(`${BASE}/webhook/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  }).then(handle);

export const saveTemplate = (promptTemplate) =>
  fetch(`${BASE}/webhook/template`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptTemplate }),
  }).then(handle);

export const getReplies = () => fetch(`${BASE}/webhook/replies`).then(handle);

export const markAsLead = (contactId) =>
  fetch(`${BASE}/webhook/mark-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactId }),
  }).then(handle);

export const archiveReply = (contactId) =>
  fetch(`${BASE}/webhook/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactId }),
  }).then(handle);

export const previewEmail = (contact) =>
  fetch(`${BASE}/webhook/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact }),
  }).then(handle);
```

---

## `hooks/usePolling.js`

```javascript
import { useEffect, useRef } from "react";

export const usePolling = (callback, intervalMs, enabled = true) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
};
```

---

## Build Order

| Step | Task                                                              | Done when...                                              |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | Scaffold Vite + React + Tailwind                                  | `npm run dev` shows blank dark app                        |
| 2    | Add Google Fonts (Syne + DM Sans), CSS vars, Just Search logo     | Brand theme applied globally                              |
| 3    | Build 5-tab shell layout — no API                                 | Tab switching works, all panels render with correct brand |
| 4    | Build SettingsTab — static form                                   | All fields render with correct defaults                   |
| 5    | Build TemplateTab — AI prompt editor + preview (mock)             | Preview renders sample text                               |
| 6    | Build ContactsTab — CSV parser + drag-drop upload + table         | CSV parses, table renders correctly                       |
| 7    | Set up n8n workflow skeleton — test with 2 dummy contacts         | Workflow activates and visible in n8n UI                  |
| 8    | Configure Gemini API node in n8n — test AI personalisation        | Unique emails generated per contact                       |
| 9    | Configure Gmail Send node — test end-to-end                       | Test emails arrive with personalised content              |
| 10   | Wire all webhooks in `api/n8n.js`                                 | All 10 endpoints return expected JSON                     |
| 11   | Connect CampaignTab to live stats webhook + polling               | Stats update every 30s from real data                     |
| 12   | Connect ContactsTab to contacts webhook                           | Table renders live with correct status badges             |
| 13   | Set up Gmail Reply Poller n8n workflow                            | Replies detected and written back to sheet                |
| 14   | Build RepliesTab — inbox, expand, mark lead, archive              | Full reply workflow functional end-to-end                 |
| 15   | Connect Start/Pause to n8n trigger API                            | Campaign activates and deactivates correctly              |
| 16   | Polish: loading skeletons, error toasts, empty states, animations | No blank screens; all errors surface as toasts            |
| 17   | Deploy UI to Vercel                                               | Live URL accessible by Just Search sales team             |

---

## Environment Variables (`.env`)

```env
VITE_N8N_BASE_URL=https://your-n8n-instance.com
GEMINI_API_KEY=AIza...                 # Used by n8n HTTP Request node via googlePalmApi credential — never in frontend
```

**CRITICAL**: `GEMINI_API_KEY` is stored as a **`googlePalmApi` credential inside n8n** and used by the `HTTP Request: Gemini` node only. It is never exposed to the React frontend. The frontend only calls n8n webhooks.

---

## Commands

```bash
npm create vite@latest just-search-email -- --template react
cd just-search-email
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev        # Local dev server
npm run build      # Production build
vercel --prod      # Deploy to Vercel
```

---

## Key Constraints — Never Violate

- Never store `GEMINI_API_KEY` or any credentials in the React frontend or `.env` files that ship to Vercel public env. API keys live in n8n credentials only (`googlePalmApi` credential type).
- Never re-send emails to rows already marked `sent`, `opened`, or `replied` — always filter `status = pending` only
- Daily limit must always be respected — n8n Limit node enforces this before any send
- All n8n webhook calls must be wrapped in `try/catch` — surface errors as UI toasts (bottom-right, orange border), never silent failures
- Settings changes take effect on the **next scheduled run** — communicate this clearly in UI
- The Replies tab is read-only from the UI — reply actions (Mark Lead, Archive) update n8n state but the actual reply email is sent via native mail client (`mailto:`)
- AI prompt template edits are versioned — last 5 versions stored in UI localStorage with timestamps
- Sender identity (`sales@justsearch.ae`) is read-only in UI — configurable only via n8n Gmail credential
- CSV upload validates: required columns present, valid email format, no duplicates — reject invalid rows with clear error messages shown in upload preview
- Never expose raw email content in the ContactsTab — only status, metadata, and truncated previews

---

## How to Use This File with Claude Code

- **Start a session**: "Follow CLAUDE.md and begin with Step 1 of the Build Order"
- **Jump to a component**: "Now build RepliesTab.jsx per the spec in CLAUDE.md"
- **Build the n8n workflow**: "Set up the n8n workflow per CLAUDE.md including the Gemini API personalisation nodes"
- **Test AI personalisation**: "Run the preview endpoint with this sample contact and verify Gemini generates a unique email"
- **If Claude drifts**: "Re-read CLAUDE.md and continue from the last completed step"
- Claude Code reads this file automatically — keep it in the project root at all times
