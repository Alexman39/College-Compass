College Compass — Project Brief
Who I am and what this is
I'm a final-year software student at Metropolitan College (Greece). College Compass is a
student-made companion site to Moodle for me and my classmates: a clearer, friendlier way to
see every course, its weekly lessons, exercises, coursework and deadlines. Content is mostly
in Greek, with English course titles and technical terms.

An earlier hand-coded demo exists (github.com/Alexman39/College-Compass): plain HTML/CSS,
one page + one ~530-line stylesheet per course, content hard-coded in HTML. Treat it as a
source of content and tone, NOT as code to keep.

Goals
Cover all courses from Years 1–2 (archived) and the current final year (active).
Make deadlines impossible to miss: a cross-course "Upcoming" view, countdowns, calendar.
Phase A: fully static site. Phase B: an admin CMS dashboard only I can log into.
Look and feel: a creative, modern take on Frutiger Aero (Windows Vista/7, Wii, Zune era).
Tech stack (do not change without asking me)
Astro (static output) + TypeScript, Astro Content Collections with zod schemas
Plain CSS with custom properties as design tokens; no Tailwind, no UI kit
Small islands for interactivity (vanilla TS or Preact) — keep JS minimal
Pagefind for static search (must handle Greek)
GitHub Pages deploy via GitHub Actions
Phase B: Sveltia CMS at /admin (Git-based, config in public/admin/config.yml),
GitHub OAuth via a small Cloudflare Worker

Content model (src/content/)
professors: name, email, office_hours
courses: code, title_el, title_en, year (1–3), semester (1–2), professor ref,
schedule[{day, start, end, room}], accent, icon, summary, learning_goals[],
assessment[{item, weight}], moodle_url, status (current | archived)

lessons (Markdown): course ref, week, title, date, tags[]
assignments: course ref, title, type (exercise | coursework | exam | quiz), released,
due (ISO datetime, Europe/Athens), weight, brief (Markdown), link, submission

resources: course ref, title, kind (slides | video | tool | reading), url
announcements (Markdown): title, date, pinned, optional course ref
settings: academic year, semester start dates, holidays
Derived (computed, never stored): Upcoming (next 14 days), weekly calendar + .ics feed,
archive by year/semester, weekly workload "forecast".

Information architecture
/ — "Desktop": hero sky/water scene, gadgets (Next deadline countdown, This week's
timetable, Workload forecast, Announcements), course tiles grouped Year → Semester

/courses/[code] — course "window": overview, professor, schedule, assessment, weeks
(accordion or timeline), assignments with status pills, resources

/courses/[code]/week/[n] — lesson page (calm, highly readable)
/upcoming, /calendar, /archive, /search, /about
Global: compass "orb" button opens a Start-menu style panel with search + all courses
Design direction — "Aero Campus"
Metaphor: a Windows 7-era desktop for your degree. Courses are glass windows, deadlines
are gadgets, the compass logo is a glossy orb start button.

Palette: sky blue → aqua → fresh green gradients, white clouds, soft lens flare.
Dark mode = "night aquarium" (deep teal/navy, glowing bubbles).

Surfaces: frosted glass (backdrop-filter blur), 1px white inner highlight, soft shadow,
12–16px radius. Glossy "jelly" pill buttons with a top highlight band.

One accent colour per course used on its tile, window title bar and pills.
Status pills like MSN presence: green done, amber due ≤72h, red overdue, grey not released.
Motion: drifting bubbles, windows scale in with slight overshoot, completed tasks "pop".
Everything disabled under prefers-reduced-motion.

Type: humanist sans with full Greek coverage (Manrope, Open Sans or Commissioner).
Make it feel nostalgic but NOT like a cheap pastiche: modern spacing, crisp type,
restrained use of gloss. Nostalgia lives in the chrome; reading pages stay calm.

Non-negotiables
Mobile-first; works perfectly at 360px wide. Never disable pinch-zoom.
WCAG AA contrast: body text always on a near-opaque panel, never raw glass.
Semantic HTML, keyboard navigable, visible focus states, lang="el" on Greek content.
Lighthouse ≥ 90 on performance and accessibility. Images via astro:assets.
All dates/times computed in Europe/Athens.
No lecturer-owned files (slides/PDFs) re-hosted; link to Moodle instead.
How to work with me
Work one phase at a time. Start each phase with a short plan and file list; wait for my OK
on anything that changes the stack or the content schema.

Small commits with clear messages. Explain non-obvious code briefly — I'm learning.
After each phase: run the build, list what changed, what to test, and what's next.