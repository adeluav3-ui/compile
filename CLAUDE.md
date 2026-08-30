# Compile — Project Brief for Claude Code

## What this is

Compile is a coding education studio with **three programs sharing one codebase and one brand**:

1. **Cohort** (build first) — live, paid, 10-week batches. Each batch focuses on a different category of software; Cohort 01 is web apps, websites, and platforms. Marketing/landing page + application + payment flow.
2. **School Edition** (build second) — multi-tenant platform for Nigerian secondary schools (JSS1–SSS3). Lesson videos, course content, practice questions, practical exams, and three dashboards (school admin, teacher, student). Must run fully offline on a school's local network due to unreliable internet.
3. **Individual Course** (build third) — self-paced, holistic version of the cohort + school material, no live instructor access. Ships now only as a "coming soon" state; do not build the actual content platform until told to.

**Build order matters.** Do not start School Edition or Individual Course scaffolding until Cohort is functionally complete and explicitly signed off. Right now, only Cohort is in active development — but the schema, auth roles, and shared packages below should be designed with all three in mind from day one so School Edition doesn't require a rebuild later.

---

## Non-negotiable architecture decisions

These were decided deliberately and should not be silently changed or "improved" — flag it and ask if something here seems to conflict with a request:

- **No Express. No Fly.io. No Render.** Next.js API routes (Route Handlers) are the only backend, on both the cloud and offline builds. Do not introduce a separate backend service or framework.
- **Cloud backend = Next.js on Vercel.** Serverless API routes, same deploy as the frontend.
- **School Edition backend = the same Next.js app**, run standalone inside Electron, bound to the host machine's LAN interface so other devices on the school network can hit it — not a rebuilt/separate server.
- **Two different video delivery mechanisms, intentionally:**
  - Cohort/Individual: streaming-only via **VdoCipher** (fallback: Cloudflare Stream) — signed/expiring URLs, dynamic watermarking with viewer identity. Never expose a direct downloadable file URL.
  - School Edition: videos are bundled/synced once and served from the **local SQLite-backed server over the school's LAN**. No internet required to watch. Protection is app-level licensing (expiry lock, no export path in the UI) — not per-stream DRM, because it's offline by design.
- **AI runs through one internal service module**, not scattered API calls. All AI features (course tutor chat, auto-marking) call this module. In School Edition, if there's no internet, AI requests **queue locally and flush automatically on reconnect** — they never block or fail outright. This keeps the swap to a self-hosted model (planned long-term) a one-place change.
- **One database paradigm everywhere:** Drizzle ORM over Postgres (Supabase) in the cloud, Drizzle ORM over SQLite offline in School Edition. Same query patterns, same schema shape, different driver.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Backend | Next.js Route Handlers only — no separate server framework |
| Database (cloud) | Postgres via Supabase |
| Database (offline) | SQLite (School Edition only), synced to Supabase Postgres when online |
| ORM | Drizzle (both cloud and offline) |
| Auth | Supabase Auth, role-based |
| Payments | Paystack |
| Video (Cohort/Individual) | VdoCipher (fallback: Cloudflare Stream) |
| Video (School Edition) | Locally bundled/synced files, served over LAN |
| AI | Claude API (Anthropic), wrapped in one internal service module |
| Hosting (web) | Vercel |
| Packaging (School Edition) | Electron, distributed as installer via GitHub releases |
| Styling | Tailwind CSS |

---

## Roles & auth model

Design one auth schema that can express all of the following roles, even though only cohort-member exists today:

- `cohort_member` — applied/paid for a live cohort batch
- `individual_learner` — self-paced course access (not yet buildable — reserve the role)
- `school_admin` — manages a school's subscription, sees aggregate results
- `teacher` — manages classes, marks/reviews AI-flagged work, sees student dashboards for their classes
- `student` — School Edition learner, tied to a school + class

A person could plausibly hold more than one role over time (e.g. a cohort alum later becomes a school teacher) — don't hard-couple role to account in a way that prevents that.

---

## Brand

- **Name:** Compile
- **Positioning:** software as a craft, taught by building — live correction over passive watching, small cohorts over crowds
- **Note:** an external designer is finalizing the logo and has started with **blue** as a primary color; exact shade not yet locked. Use the navy below as the working primary until she delivers final brand colors, then swap the token — don't rebuild the palette structure.

### Color tokens (working palette, subject to designer's final blue)

```css
--paper:      #F4F5F2;  /* background */
--surface:    #FFFFFF;  /* cards/panels */
--ink:        #12151B;  /* primary text */
--muted:      #5C6470;  /* secondary text */
--navy:       #1B355E;  /* primary — CTAs, nav (placeholder for designer's final blue) */
--navy-deep:  #122544;  /* dark sections, headers */
--steel:      #3E6FB0;  /* links, secondary accents */
--brass:      #B8862F;  /* sparing warm accent — badges, cohort numbering */
--line:       #DFE1DA;  /* borders, dividers */
```

### Type

- Display/headings: **Fraunces** (serif, characterful — carries the "craft/mastery" feel)
- Body: **Inter**
- Labels, code, data, cohort numbering: **IBM Plex Mono**

### Signature device

Each cohort batch gets a "guild stamp" — a numbered badge (e.g. `01 — Web & Platforms`) used consistently across the site. This is structural, not decorative: cohorts really are discrete numbered batches with distinct focuses, and the stamp system needs to extend cleanly to Cohort 02, 03, etc. without a redesign.

Reference mockups (attached separately / already delivered): `compile-home.html`, `compile-cohort.html`. Match their layout, spacing, and component patterns — they are the approved visual direction, not just inspiration.

---

## Cohort 01 — current scope (build this first)

- Home page: brand overview, three-program grid (Cohort live, Individual + School marked "coming soon"), philosophy section
- Cohort landing page: hero, "what you'll build" (websites/web apps/platforms), 10-week structure breakdown, pricing (early bird ₦50,000 before Sep 10, 2026; regular ₦70,000 after), application flow, 10-seat cap
- Individual course section/page: empty state, "coming soon," email capture — no actual course content or platform yet
- Payment: Paystack, one-time payment per seat
- No dashboards, no video platform, no AI features in this phase — those belong to School Edition and later Individual Course phases

## School Edition — scope for later phase (context only, don't build yet)

- Full JSS1–SSS3 curriculum delivery: video lessons, written content, practice questions, practical exams
- Three dashboards: school admin, teacher, student
- Offline-first: must function with no internet once installed and synced
- AI: marking assistance for teachers, Q&A tutor for students, queued when offline
- Licensing: monthly per-school subscription (₦150,000/month), enforced via the offline license-lock pattern

## Individual Course — scope for later phase (context only, don't build yet)

- Holistic self-paced version of cohort + school material
- No direct instructor access
- Streaming-only video (VdoCipher), no download path
- One-time payment (₦80,000)

---

## Working conventions

- Don't mark something as working without real, verifiable output — a claim that code "should work" is not sufficient; show the actual result (test output, screenshot, running instance).
- Keep copy in the interface's own voice: plain, active, specific — no filler, no apologetic error messages. Match the tone already set in the delivered mockups.
- When a request seems to conflict with the non-negotiable architecture decisions above (e.g. reaching for Express, a separate backend host, or downloadable video for Individual/Cohort), stop and flag it rather than proceeding.