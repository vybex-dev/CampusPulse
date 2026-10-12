# CampusPulse — 5-Minute Competition Demo Script

> **Event:** Kaushal 8.0 — Problem Statement PS-04 (Sustainable Tech)  
> **Target Time:** 5:00 minutes (strict limit)  
> **Core Loop:** See → Understand → Act → Prove  
> **Presenter Setup:** Laptop on podium, Chrome browser open at `http://localhost:3000`, phone hotspot ready as backup.

---

## ⏱️ Minute-by-Minute Demo Script

### [0:00 – 0:45] The Hook: Silent Campus Waste
**Screen:** Executive Dashboard (`/`)  
**Click Path:** Start on `/` (Admin role selected).

- **Narration:**
  > *"Judges, university campuses are modern micro-cities. Every single month, an average Indian campus silently bleeds between 3 to 8 Lakh rupees in forgotten classroom lights, continuous hostel plumbing leaks, and unsegregated cafeteria waste. But estates teams don't have an engineering problem — they have an information loop problem.*
  >
  > *This is CampusPulse. It operates on four simple words: **See, Understand, Act, and Prove**. Every number on screen carries an explicit tag: Verified, Estimated, Projected, or Measured. Every screen displays our 'Simulated data' badge, driven by 30 days of hourly telemetry seeded in local SQLite."*

- **Visual Cues:**
  - Point to **Campus Score** (starts at **58.6 / 100**).
  - Point to **Avoidable Waste This Month** (**₹42,850** — Estimated).
  - Show the 3-resource breakdown: Electricity (violet), Water (sky blue), Waste (olive).

---

### [0:45 – 2:00] The ST-1 Loop: See, Understand, Act
**Screen:** `/electricity` or `/anomalies`  
**Click Path:** Click left nav **Electricity** → Click anomaly card **"Hall A-204 After-Hours Lighting"**.

- **Narration:**
  > *"Let's follow our first story: **ST-1**. Here in Academic Block A, Room 204, our statistical detector caught an evening spike across five consecutive days.*
  >
  > *Notice our design rule: **the plain-English explanation card always sits directly above its chart**. It explains to the campus director: 'Hall A-204 drew 3.4 kW between 7 PM and 11 PM outside scheduled timetable slots, wasting ~67 kWh'. Below it, the single-hue line chart displays the 12% expected band in grey with the violation glowing in red.*
  >
  > *Now, we turn this finding into action in one click."*

- **Click Action:**
  1. Click primary green button **"Create Ticket"**.
  2. Switch top role switcher to **"Staff"**.
  3. Click **"In Progress"** → Click **"Resolve Ticket"**.
  4. Type note: `"Restored automated classroom occupancy schedule"` → Click **"Submit"**.
  5. Note status changes to `resolved` with logged timestamp.

---

### [2:00 – 2:45] Fast-Forward & The Proof
**Screen:** `/tickets`  
**Click Path:** Top header → Click **"Fast-Forward 7 Days"** (+7d pill) → Click Ticket #2.

- **Narration:**
  > *"In a real campus, seven days pass. In our competition MVP, we click our **7-day Fast-Forward** button. Watch the clock jump from October 12 to October 19 in under 200 milliseconds.*
  >
  > *Our backend verification hook immediately evaluates the post-fix telemetry against a counterfactual baseline. Notice Ticket #2: its status has automatically transitioned from 'Resolved' to **'Verified'** with a green badge!*
  >
  > *When we open the ticket, we see mathematical proof: exactly **67.0 kWh eliminated**, saving **₹535** and avoiding **48.2 kg of CO₂e**. We didn't guess the savings — we proved them."*

---

### [2:45 – 3:30] The Water Leak: Continuous Hostel Loss
**Screen:** `/water`  
**Click Path:** Click left nav **Water** → Select **"Boys Hostel 1 (HST-1)"** from dropdown.

- **Narration:**
  > *"Now let's examine water: **ST-3**. Water leaks are invisible until the bill arrives.*
  >
  > *Look at Boys Hostel 1: between 2 AM and 4 AM, when students are asleep, flow should drop to the 120 L/h baseline. Instead, it never drops below 920 L/h. That is an 800 L/h continuous toilet flush leak.*
  >
  > *Notice our per-capita meter: Hostel 1 is consuming **153 Litres per resident per day**, flagged red at **127% of our 120 L target**. That single pipe leak drains **19,200 Litres every day**, costing the institute ₹384 daily."*

---

### [3:30 – 4:15] Waste Lab with Judge's Item
**Screen:** `/waste`  
**Click Path:** Click left nav **Waste Lab** → Camera scan or click **"Apple Core"** / **"Water Bottle"** from sample tray.

- **Narration:**
  > *"Now for solid waste segregation: **ST-5**. Segregation is where campus sustainability usually breaks down. We built the CampusPulse Waste Lab.*
  >
  > *[To Judges]: 'Judges, if you have a coffee cup, bottle, or snack wrapper, we can scan it live with our webcam, or click any sample here.'*
  >
  > *Our dual-failover vision ladder routes first to Groq for sub-150ms inference. If Groq hits a rate limit, it fails over to Google Gemini Flash in under 50ms; if offline, it uses our verified physics samples.*
  >
  > *Watch: it identifies an **Apple Core**, tags it as `wet_biodegradable`, tells the user why, awards 10 gamification points, and directs it to the **Green Bin**. Look at our Mess report: Cafeteria segregation was flagged at just 46% accuracy compared to our 76% peer average, isolating 60 kg of misrouted wet waste per week."*

---

### [4:15 – 4:45] What-If Policy Simulator & Impact Report
**Screen:** `/whatif` → then `/report`  
**Click Path:** Click **What-If** → Slide AC thermostat to +1°C → Click **Impact Report**.

- **Narration:**
  > *"What if management wants to plan next semester's policies? In **What-If**, our interactive engine recalculates monthly savings in real-time. Adjusting campus AC by +1°C saves ₹18,400 monthly and boosts campus score by 6 points.*
  >
  > *Finally, we click **Impact Report**. In one screen, estate managers get a board-ready executive summary. Every single number displays its unit and a Verified, Estimated, or Projected tag pill. One click prints a crisp PDF with complete regulatory disclosures."*

---

### [4:45 – 5:00] The Scale Line (Closing Punchline)
**Screen:** `/report` (highlighting net savings summary)

- **Narration:**
  > *"Across India's 50,000 colleges and universities, undetected resource leaks cost over ₹2,000 Crores every year. CampusPulse requires zero proprietary IoT hardware, runs locally in a single Node process, and provides the only complete loop in sustainable campus tech:*
  >
  > ***See the waste, Understand the cause, Act on the ticket, and Prove the savings.***  
  > *Thank you. We are ready for your questions."*

---

## 🛠️ Failure-Drill Checklist (Be Prepared for Anything)

| Scenario | What Happens | What You Do |
| :--- | :--- | :--- |
| **1. Wi-Fi Dies Completely** | App continues running with zero errors. All telemetry is local SQLite. Waste Lab uses 7 prepared sample vectors. | Do not panic. Continue the pitch. Demonstrate Waste Lab using sample buttons. Explain: *"Our app is designed offline-first for remote campus facilities."* |
| **2. Groq API Key Blank or 429'd** | App silently fails over to Gemini Flash in `<50ms`. | Continue normally. The judges will not even notice. |
| **3. Both Groq & Gemini Keys Blank** | App automatically serves curated prepared samples with SVG thumbnails and physics data. | Click sample items in Waste Lab tray. |
| **4. Webcam Permission Blocked** | File upload modal or sample tray automatically surfaces. | Click any sample item (Apple Core, Bottle, Can, Battery). |
| **5. Accidental State Change / DB Mess** | Need to restart demo from pristine state. | Click top-right **"Reset"** button. Database re-seeds in **150ms** with seed 42. |

---

## 💡 Judges' Q&A Cheat-Sheet

#### Q1: *"Is this data real, or did you make it up?"*
> **Answer:** *"All data in this MVP is simulated using deterministic pseudo-random generators seeded at seed `42` into local SQLite, which is why every view carries the 'Simulated data' pill. However, all equations, baselines, and tariffs (₹8/kWh, ₹20/kL, 0.72 kg CO₂/kWh, 120 L/hostel resident) are calibrated to actual Indian university benchmarks per National Building Code (NBC) standards."*

#### Q2: *"How do you prove savings without just making up a counterfactual?"*
> **Answer:** *"We use an econometric pre-post counterfactual window. When a ticket is marked resolved, we measure actual hourly consumption over the subsequent 7 days against the pre-fix fault baseline. The delta is recorded in the `savings` table with a strict `Verified` tag only when the anomaly has statistically cleared."*

#### Q3: *"What if students upload non-waste items to the Waste Lab camera?"*
> **Answer:** *"Our vision prompt enforces an explicit boolean flag `is_waste_item`. If someone shows a laptop, smartphone, or wristwatch, the model responds with `is_waste_item: false` and warns: 'This appears to be an active personal device, not waste', awarding 0 points."*

#### Q4: *"Can this connect to real campus smart meters?"*
> **Answer:** *"Yes! We built a production CSV/REST ingestion endpoint at `/api/electricity/import`. Any MODBUS, BACnet, or LoRaWAN gateway streaming hourly meter readings can POST data directly without altering our detection pipeline."*

#### Q5: *"Why did you choose a light-mode, desktop-first design?"*
> **Answer:** *"Campus facilities managers, chief engineers, and registrars work at multi-monitor desktop workstations in brightly lit administrative offices. Apple-like typography, 48px spacious padding, 4.5:1 contrast, and strict data tagging ensure high executive readability without visual clutter."*
