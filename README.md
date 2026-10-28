# College Compass

[![Build & deploy](https://github.com/Alexman39/College-Compass/actions/workflows/deploy.yml/badge.svg?branch=v2)](https://github.com/Alexman39/College-Compass/actions/workflows/deploy.yml)

A student-made companion to Moodle for Metropolitan College (Greece). It shows
every course with its weekly lessons, exercises, coursework and deadlines, in one
clear place. Content is mostly in Greek; course titles and technical terms are
in English.

> **Status:** v2 rebuild on the `v2` branch. Phase A (the static site) is complete and ready for launch.
> See **[docs/ROADMAP.md](docs/ROADMAP.md)** for progress, decisions and next steps.
> The live site still serves the original demo from `main` until launch.

## Features

- **Course windows**: overview, professor, schedule, assessment, weeks,
  assignments and resources for each course.
- **Lesson pages**: calm, readable weekly lessons with that week's exercises.
- **Live deadline status**: done / due soon / overdue / not released / open,
  always calculated in Athens time and kept current in the browser.
- **Personal ticks**: mark tasks as done. Ticks are stored only in your own
  browser; there are no accounts and no tracking.
- **Deadlines everywhere**: a cross-course `/upcoming` list, a next-deadline
  countdown, a weekly workload chart, and a calendar feed (`/calendar.ics`)
  for phones and calendar apps.
- **Search in Greek**: accents and capitals don't matter (`ασκηση` finds
  «Άσκηση»). Press `/` anywhere, or use the compass orb's Start menu.
- **Light and dark themes**: "Aero Campus" design, inspired by Windows 7, with a
  "night aquarium" dark mode.
- **Accessible by default**: WCAG AA contrast (tested), keyboard navigable,
  visible focus, reduced-motion support, works at 360 px wide.

## Tech stack

- [Astro](https://astro.build) (static output) + TypeScript
- Astro Content Collections with zod schemas
- Plain CSS with custom properties as design tokens (no framework)
- Small vanilla TypeScript scripts for interactivity
- Pagefind for static search
- KaTeX for math, typeset at build time
- Vitest for unit tests
- GitHub Pages via GitHub Actions

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```sh
npm install
npm run dev      # http://localhost:4321/
npm test         # unit tests
npm run build    # type-check, build into dist/, post-build checks, search index
npm run preview  # serve the built site
```

`/styleguide/` shows every component in both themes.

## Project structure

```
src/
  content/            all course content (Markdown + YAML) — see below
  content.config.ts   content schemas (zod)
  lib/                content access + validation, Athens time, status, colour maths
  components/         UI components (Window, StatusPill, AssignmentItem, …)
  pages/              routes: /, /courses/[slug]/, /courses/[slug]/week/[n]/, /upcoming/,
                      /calendar/ (+ calendar.ics), /archive/, /search/, /about/, /styleguide/
  scripts/            browser scripts (ticks, deadlines, search, image zoom)
  styles/             tokens.css (design tokens) and base.css
scripts/check-build.mjs  post-build checks on the generated HTML
materials/            raw course files (git-ignored, never published)
docs/ROADMAP.md       status, decisions and next steps
```

## Editing content

All content lives in `src/content/`. The build checks every file and stops with
a clear message if something is wrong (missing course or professor, duplicate
code, invalid date).

| To add… | Create |
| --- | --- |
| A professor | `professors/<surname-name>.yaml` |
| A course | `courses/<code>.md` (front-matter = details, body = overview) |
| A weekly lesson | `lessons/<course>/week-01.md` |
| An exercise or coursework | `assignments/<course>/<name>.md` (body = the brief) |
| A link (slides, video, tool, reading) | `resources/<course>/<name>.yaml` |
| An announcement | `announcements/<date>-<name>.md` |

**Events.** An announcement about a meeting or talk can add an `event:` with
`start`, `end` (Athens time, `YYYY-MM-DDTHH:mm`) and an optional `location`;
the event then also shows on `/calendar` and in `calendar.ics`.

**Dates and times.** Write deadlines in Athens time as `YYYY-MM-DDTHH:mm`
(for example `due: "2026-11-20T23:59"`), **without seconds**. Calendar dates
are `YYYY-MM-DD`.

**Course colours.** Each course `accent` must give white text a contrast of at
least 4.5:1. `npm test` checks this.

**Lecturer material.** Slides and PDFs owned by lecturers are never re-hosted
here; link to Moodle instead.

### Math and diagrams in lessons

Math is typeset with [KaTeX](https://katex.org/) when the site is built (no
JavaScript in the browser, fonts bundled with the site). Write it as:

- inline: a code span with dollar signs, e.g. `` `$x^2 + y^2$` ``;
- on its own line: a fenced block with the language `math`.

Plain `$…$` is deliberately **not** math, because some tasks contain prices
like "$12.40". A typo in a formula fails the build and names the file. Keep
words in the sentence and only symbols in the formula: KaTeX's fonts cannot
draw Greek text.

Diagrams go next to the lesson in an `images/` folder (e.g.
`src/content/lessons/cn6005/images/`) and are referenced as
`![description](./images/name.svg)`. The description is what screen readers
read, so it should say what the diagram shows.

### Adding course material

Raw course files (slides, PDFs, handouts) go in `materials/<course>/`, e.g.
`materials/cn6003/lecture-01.pdf`. That folder is git-ignored: the files stay
on your computer and are never published. Ask Claude Code to turn a file into a
lesson or exercise; it writes the content into `src/content/`, asks you to
approve new wording, and opens a pull request for you to merge. Work on one
course in one chat at a time. Details: [materials/README.md](materials/README.md).

## Deployment

Every push and pull request runs type-checks, tests and a build, and uploads the
site as a downloadable `site-preview` artifact. Deploying to GitHub Pages
happens from `main` only, once the launch checklist in
[docs/ROADMAP.md](docs/ROADMAP.md#launch-checklist) is done. The site is
served at https://collegecompass.gr (GitHub Pages with a custom domain; the
old `alexman39.github.io/College-Compass/` address forwards there). Every
internal link goes through `url()` in `src/lib/url.ts`, so moving the site is
a change to `site` and `base` in `astro.config.mjs`.

### Old addresses

The first version of the site used addresses like `/webTechnologies.html`.
GitHub Pages can't do server redirects, so each old address has a tiny page in
`public/` (same path) that forwards the visitor to the new page. The links are
relative, so they keep working if the site moves to another base path.

---

Built by students, for students. This is an unofficial guide: for official
material and submissions, Moodle always applies.
