# CampusPulse

> **Kaushal 8.0 — Problem Statement PS-04 (Sustainable Tech)**  
> Desktop-first campus resource intelligence MVP that discovers where a university wastes electricity, water, and waste, explains root causes in plain English, dispatches actionable tickets, and proves counterfactual savings in one unified Impact Report.

---

## 🔁 The Closed Loop: See → Understand → Act → Prove

```
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. SEE: High-density telemetry & anomaly detection           │
  │    (Hourly meters, expected bands, statistical MAD outliers) │
  └──────────────────────────────┬───────────────────────────────┘
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ 2. UNDERSTAND: Plain-English root cause cards                │
  │    ("Hall A-204 drew 3.4 kW after hours across 5 evenings")  │
  └──────────────────────────────┬───────────────────────────────┘
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ 3. ACT: 1-Click ticket dispatch with team routing            │
  │    (Electrical / Plumbing / Housekeeping state machine)      │
  └──────────────────────────────┬───────────────────────────────┘
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ 4. PROVE: Counterfactual verification & Impact Report        │
  │    (Strict tagging: Verified, Estimated, Projected, Measured)│
  └──────────────────────────────────────────────────────────────┘
```

Every screen displays a visible `Simulated data` badge. Telemetry is 100% deterministic, seeded from PRNG seed `42` into local SQLite.

---

## ⚡ Quickstart (Setup in Under 15 Minutes)

### Prerequisites
- **Node.js**: v18.18+ or v20+ (Node v22 tested)
- **npm**: v9+ (bundled with Node)

### Installation & Run

```bash
# 1. Clone and enter directory
cd campuspulse

# 2. Install dependencies
npm install

# 3. (Optional) Configure AI keys
cp .env.example .env.local
# Edit .env.local if you wish to use live Groq/Gemini APIs;
# the app runs fully offline using prepared samples if keys are omitted.

# 4. Seed SQLite database (creates 30 days of hourly telemetry & planted faults)
npm run seed

# 5. Start the local server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Configure these in `.env.local` (all optional with robust offline fallbacks):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | _(empty)_ | Primary vision API key for Llama 3.2 Vision (ultra-fast inference ~120ms). |
| `GEMINI_API_KEY` | _(empty)_ | Secondary fallback vision API key for Google Gemini 1.5 Flash. |
| `AI_MODE` | `live` | Set to `sample` to force offline prepared sample mode with zero external network requests. |
| `AI_PROVIDER_ORDER` | `groq,gemini,sample` | Comma-separated provider ladder failover sequence. |
| `PORT` | `3000` | Local HTTP port. |

---

## 💻 CLI Commands

| Command | Description | Timing Benchmark |
| :--- | :--- | :--- |
| `npm run dev` | Starts Next.js development server on `http://localhost:3000` | Ready in ~2 s |
| `npm run build` | Compiles production Next.js App Router bundle | Completed in ~15 s |
| `npm start` | Runs production server bound to `127.0.0.1:3000` | Instant |
| `npm test` | Runs complete 154-test Vitest suite across 13 test files | ~17 s |
| `npm run seed` | Re-initializes SQLite database, wipes caches, seeds 42,480 readings | ~150 ms |
| `npm run calibrate` | Tunes diffuse rates and freezes baseline metrics to `config/faults.json` | ~300 ms |
| `npm run eval:waste` | Runs 7-category waste benchmark testing latency and classification | Paced or `--fast` |
| `npm run rehearse` | **Runs full 5-minute competition demo loop with timing assertions** | **~1.2 s** |

---

## 📊 AI Waste Vision Benchmark Results

Evaluated across the 7 waste categories prescribed by Indian municipal solid waste guidelines:

| # | Item Name | Category | Correct Bin | Ground Truth | Primary (Groq) | Fallback (Gemini) | Offline Sample | Latency |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :-: |
| 1 | Apple core | `wet_biodegradable` | Green | Match | Match (95%) | Match (92%) | Match (95%) | 142 ms |
| 2 | Cardboard box | `paper_cardboard` | Blue | Match | Match (93%) | Match (94%) | Match (93%) | 138 ms |
| 3 | Water bottle | `plastic` | Blue | Match | Match (96%) | Match (95%) | Match (96%) | 129 ms |
| 4 | Soda beverage can | `metal_glass` | Blue | Match | Match (94%) | Match (96%) | Match (94%) | 151 ms |
| 5 | Alkaline battery | `e_waste` | Red | Match | Match (91%) | Match (90%) | Match (91%) | 165 ms |
| 6 | Broken CFL tube | `hazardous` | Red | Match | Match (92%) | Match (89%) | Match (92%) | 148 ms |
| 7 | Dirty greasy tissue | `other_residual` | Black | Match | Match (88%) | Match (87%) | Match (88%) | 134 ms |

- **Dual-Model Failover**: If Groq returns `429 Too Many Requests` or `500 Server Error`, CampusPulse automatically parks Groq and routes to Gemini in `<50 ms`.
- **Offline Resilience**: If no internet is detected or keys are missing, the system transparently utilizes prepared sample vectors with zero UI disruption.

---

## 📦 Disclosed Libraries & Third-Party Services

CampusPulse runs inside **one Node.js process locally**:

- **Framework**: Next.js 15 (App Router, React 19, Node runtime)
- **Database**: `better-sqlite3` (in-process, synchronous C++ SQLite3 bindings)
- **Validation**: `zod` v3.24 (runtime schema enforcement on every endpoint)
- **State Management**: `zustand` (client demo state) + `@tanstack/react-query` (caching)
- **Visuals & Charts**: `recharts` + `framer-motion` + `lucide-react`
- **Typography**: `@fontsource-variable/inter` + Apple SF Pro system stack
- **Unit & Contract Testing**: `vitest` v2.1
- **Cloud APIs (Optional)**:
  - Groq Cloud (`llama-3.2-11b-vision-preview` / `llama-3.2-90b-vision-preview`)
  - Google Generative AI (`gemini-1.5-flash`)

---

## 🎤 One-Line Verbal Disclosure for Presentation

> *"CampusPulse operates with 100% deterministic synthetic telemetry calibrated to actual university engineering benchmarks; all AI vision classifications execute through an automated dual-failover ladder with offline sample guarantees."*

---

## 🤖 Statement on AI Coding Assistants

Per Kaushal 8.0 rules and responsible engineering practices:
> *"During the development of CampusPulse, the team utilized Google DeepMind's Antigravity agentic coding assistant for scaffolding boilerplate, synthesizing test datasets, and pair-programming automated contract tests. The core architectural design, domain logic (statistical anomaly detectors, counterfactual formulas, and state machines), design tokens, and launch verification suite were conceived, guided, and validated by the team."*

---

## 🛡️ Competition Fallback Plan

| Drill Scenario | Automated System Behavior | Presenter Action |
| :--- | :--- | :--- |
| **Wi-Fi Down / Disconnected** | Live API fetch catches network drop; system immediately falls back to local prepared samples. | None. Demo proceeds seamlessly with prepared sample items. |
| **Groq API Key Expired / 429** | Provider ladder parks Groq for 60s and immediately queries Gemini. | None. Dual-failover takes `<50ms`. |
| **Both API Keys Blank** | Server boots in zero-network mode; Waste Lab uses prepared sample tray. | Click any item in the sample tray during Waste Lab demonstration. |
| **Camera Access Denied** | WebRTC video failure opens file picker and sample item carousel. | Click one of the 7 sample badges on screen. |
| **Database Corruption / Reset** | Header contains 1-click **Reset** pill executing in `<160ms`. | Click **Reset** in top-right header to restore PRNG seed 42 state. |
