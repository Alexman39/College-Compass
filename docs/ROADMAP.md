# College Compass v2 — Roadmap & status

_Last updated: 22 October 2026 · branch `v2` · Phase A complete_

College Compass is being rebuilt from a hand-coded HTML/CSS demo into a static
Astro site with a structured content model. This document records **where the
rebuild stands, the decisions behind it, what's open, and what comes next**.
The original brief is in [`PROJECT_BRIEF.md`](../PROJECT_BRIEF.md).

## At a glance

| Phase | Scope | Status |
| --- | --- | --- |
| **A1** Foundations | Astro + TypeScript, design tokens, light/dark themes, base layout, CI | ✅ Done |
| **A2** Content model | Zod schemas, build-time validation, all demo content migrated | ✅ Done |
| **A3** Course pages | Course windows, lesson pages, live status pills, done ticks, `/styleguide` | ✅ Done |
| **A4** Desktop & time views | Home "desktop", `/upcoming`, `/calendar` + `.ics`, `/archive` | ✅ Done |
| **A5** Search & polish | Pagefind (Greek), Start-menu orb, `/about`, Lighthouse ≥ 90 | ✅ Done |
| **Launch** | Switch GitHub Pages to Actions, merge `v2` → `main` | ⏭️ Next — waiting on owner |
| **B** Admin CMS | Sveltia CMS at `/admin`, GitHub OAuth via Cloudflare Worker | Later |

Quality gates on every push: `astro check` (types), **64 unit tests** (vitest),
static build, build-time content validation, and post-build checks on the
generated HTML (duplicate ids, empty briefs, code colours below 4.5:1).
Lighthouse (mobile, light and dark): accessibility, best practices and SEO
100 on every main page; performance 99–100.

## What exists today

- **12 courses** for Years 1–2 (all archived), **6 professors**.
  - With migrated material: CN4000, CN4002 and CN4003.
  - The other 9 are placeholders, shown with an intentional empty state.
- **Course window** (`/courses/<code>/`): weeks accordion, assignments with
  deadlines and practice exercises, professor, schedule, assessment and resources.
- **Lesson pages** (`/courses/<code>/week/<n>/`): calm reading layout, the week's
  exercises, previous/next links, click-to-enlarge diagrams, code highlighting
  that follows the theme.
- **Live status pills** (MSN-presence style):
  - green = done · amber = due ≤ 72 h · red = overdue · grey = not released · blue = open.
  - Recomputed in the browser, so a page built days ago still shows the right
    countdown.
- **Done ticks** stored only in the visitor's browser, with a two-step
  "clear my ticks" control in the footer.
- **`/styleguide`**: every component in light and dark side by side. Includes the
  12 course accents next to the status pills, with live contrast ratios.
- **Deploy pipeline**: builds and tests every push, uploads a downloadable
  preview. It does not deploy yet (see [Launch](#launch-checklist)).

## Decisions log

Decisions agreed during phases A1–A3 (7 October 2026 onwards), with the reason
behind each.

### Process

| Decision | Why |
| --- | --- |
| Rebuild on branch **`v2`**; `main` keeps serving the old demo until launch | The live site must keep working throughout |
| Deploy only from `main`, gated by repo variable `PAGES_FROM_ACTIONS` | A repo has one Pages source; merging early can't break the live site |
| Migrated text stays **verbatim**; every wording change is proposed old → new and approved first | Content belongs to its author. An early migration bug dropped sentences unnoticed. |
| Migration verified with a word-level diff against the original | Catches dropped or altered text that review misses |
| Small, single-purpose commits | Readable history; easy to revert |

### Content model

| Decision | Why |
| --- | --- |
| Courses are Markdown: front-matter = data, body = overview | Long overview text belongs in prose, not YAML |
| `title_el` optional, falls back to `title_en` | Most courses only have official English titles |
| Course `slug` optional, default = code lowercased without `_1` (`CN4003_1` → `cn4003`) | Short, stable URLs |
| Assignments: `due` and `released` optional; new optional `week` and `teaser` | Practice exercises have no deadline; lessons list their week's exercises |
| `lessons.date` optional | Archived lessons often have no known date |
| Fixed list of 13 course icons | A typo fails the build instead of showing a blank tile |
| Build fails on missing course/professor references, duplicate codes or slugs, duplicate lesson weeks, invalid dates | Astro's `reference()` checks shape only, not existence |
| An assignment `week` with no lesson file is a **warning**, not an error | Archived courses have exercises without written lessons |

### Dates & times

| Decision | Why |
| --- | --- |
| All times are **Europe/Athens** wall-clock, written `YYYY-MM-DDTHH:mm` without seconds | With seconds, YAML silently converts to UTC and deadlines shift by 2–3 h |
| Times skipped by the spring clock change (e.g. `2026-03-29T03:30`) are **rejected** | A deadline that never happens is almost certainly a mistake |
| Times repeated in autumn (e.g. `2026-10-25T03:30`) resolve to the **earlier** one | Same rule as JavaScript Temporal; a deadline is never shown later than it could be |

### Design & accessibility

| Decision | Why |
| --- | --- |
| "Aero Campus": Windows 7–era chrome, calm reading pages | Nostalgia in the frame, not in the text |
| Body text always on a near-opaque panel, never raw glass | WCAG AA contrast regardless of background |
| Every course accent must give white text **≥ 4.5:1**, enforced by a test | Accents sit behind white title-bar text |
| Accents chosen to stay distinct from all five pill colours | A course colour must never read as "overdue" |
| "Done" lives in `localStorage` only; no accounts, no tracking | Static site; privacy by default |
| Fifth pill state, blue "Ανοιχτό" (released, due > 72 h) | Otherwise those items would have no colour |
| Manrope self-hosted, Greek subset included | Consistent Greek glyphs, no third-party font requests |

## Open questions (waiting on the owner)

- [ ] **Welcome announcement**: text drafted, awaiting approval before commit.
- [ ] **`/about` text**: new copy including the privacy note, awaiting review.
- [ ] **Contact email** (`collegecompass@gmail.com`): keep or drop?
- [ ] **Alt text** for the five UML diagrams: awaiting review.
- [ ] **2026–27 calendar**: semester start/end dates and holidays (`src/content/settings/site.yaml`).
- [ ] **Year 3 course details**: CN6003, CN6000 and CN6005 are added with lecturers and weekly timetable. Still needed: summaries, assessment, Moodle links, and whether the codes carry a `_1` suffix.
- [ ] **CN4000 content gaps**, hidden behind `TODO` comments until written:
  - Java revision set 1, question 1
  - week 2 UML screenshots
  - week 2 validation example

## Known issues

- After changing the Markdown setup locally, delete `.astro/` before building:
  Astro caches rendered content and can keep serving an old render. (CI always
  builds fresh.)

_Resolved in A5:_ duplicate heading ids when two briefs share a page (now
prefixed per assignment); code-highlighting colours below AA (now GitHub's
high-contrast themes, enforced by the build check).

## Next steps

### A4 — Desktop & time views ✅
Home "desktop" with the **Welcome Center** hero (chosen over "Aero horizon" on
22 October 2026), `/upcoming`, `/calendar`, `/calendar.ics`, `/archive`, main
navigation, gadgets (next deadline, this week, workload forecast,
announcements), course tiles with a "Year 3 coming soon" placeholder, and a
daily scheduled rebuild so time-based views stay current after launch.

### A5 — Search & polish ✅
Pagefind search tuned for Greek (accent- and case-insensitive, stemmed), a
Start menu behind the compass orb (`/` opens it), `/search`, `/about` with the
privacy note, unique heading ids, high-contrast code colours, post-build
checks, and Lighthouse verified in both themes.

### Launch checklist
1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables: `PAGES_FROM_ACTIONS = true`.
3. Merge `v2` into `main`.

### Phase B — Admin CMS
Sveltia CMS at `/admin` (Git-based, `public/admin/config.yml`), with GitHub OAuth
through a small Cloudflare Worker, so content can be edited without touching files.
