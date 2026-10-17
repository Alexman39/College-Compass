# College Compass

[![Build & deploy](https://github.com/Alexman39/College-Compass/actions/workflows/deploy.yml/badge.svg?branch=v2)](https://github.com/Alexman39/College-Compass/actions/workflows/deploy.yml)

A student-made companion to Moodle for Metropolitan College (Greece). It shows
every course with its weekly lessons, exercises, coursework and deadlines, in one
clear place. Content is mostly in Greek; course titles and technical terms are
in English.

> **Status:** v2 rebuild in progress on the `v2` branch. Phases A1–A3 are done.
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
- **Light and dark themes**: "Aero Campus" design, inspired by Windows 7, with a
  "night aquarium" dark mode.
- **Accessible by default**: WCAG AA contrast (tested), keyboard navigable,
  visible focus, reduced-motion support, works at 360 px wide.

## Tech stack

- [Astro](https://astro.build) (static output) + TypeScript
- Astro Content Collections with zod schemas
- Plain CSS with custom properties as design tokens (no framework)
- Small vanilla TypeScript scripts for interactivity
- Vitest for unit tests
- GitHub Pages via GitHub Actions

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```sh
npm install
npm run dev      # http://localhost:4321/College-Compass/
npm test         # unit tests
npm run build    # type-check + build into dist/
npm run preview  # serve the built site
```

`/College-Compass/styleguide/` shows every component in both themes.

## Project structure

```
src/
  content/            all course content (Markdown + YAML) — see below
  content.config.ts   content schemas (zod)
  lib/                content access + validation, Athens time, status, colour maths
  components/         UI components (Window, StatusPill, AssignmentItem, …)
  pages/              routes: /, /courses/[slug]/, /courses/[slug]/week/[n]/, /styleguide/
  scripts/            browser scripts (ticks, image zoom)
  styles/             tokens.css (design tokens) and base.css
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

**Dates and times.** Write deadlines in Athens time as `YYYY-MM-DDTHH:mm`
(for example `due: "2026-11-20T23:59"`), **without seconds**. Calendar dates
are `YYYY-MM-DD`.

**Course colours.** Each course `accent` must give white text a contrast of at
least 4.5:1. `npm test` checks this.

**Lecturer material.** Slides and PDFs owned by lecturers are never re-hosted
here; link to Moodle instead.

## Deployment

Every push and pull request runs type-checks, tests and a build, and uploads the
site as a downloadable `site-preview` artifact. Deploying to GitHub Pages
happens from `main` only, once the launch checklist in
[docs/ROADMAP.md](docs/ROADMAP.md#launch-checklist) is done. The site is
served under `/College-Compass/`. Every internal link goes through `url()` in
`src/lib/url.ts`, so moving to a custom domain is a one-line change in
`astro.config.mjs`.

---

Built by students, for students. This is an unofficial guide: for official
material and submissions, Moodle always applies.
