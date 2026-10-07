College Compass 🧭🎓
Your Ultimate Study Guide for Metropolitan College

College Compass is a student-driven platform designed to provide comprehensive coursework materials, study guides, and helpful resources for students at Metropolitan College. Whether you're struggling with Information Systems Modelling & Design, UML diagrams, Java programming, or other courses, College Compass helps bridge the gap between lectures and real understanding.

🚀 Features
✅ Detailed Study Guides – Well-structured notes and explanations
✅ Code Implementation – Practical Java examples from UML diagrams
✅ Step-by-Step Tutorials – Easy-to-follow breakdowns of complex topics
✅ Resource Hub – Centralized access to class materials

💡 Built by students, for students. Learning just got easier!

🔗 [Coming Soon] – Stay tuned for updates! 🚀

## Development (v2)

```sh
npm install
npm run dev      # http://localhost:4321/College-Compass/
npm run build    # type-check + static build into dist/
npm run preview  # serve the built site
```

- Stack: Astro (static) + TypeScript, plain CSS with design tokens (`src/styles/tokens.css`).
- Internal links always go through `url()` from `src/lib/url.ts`, so the site
  works under the `/College-Compass/` base path and can move to a custom domain
  by changing `site`/`base` in `astro.config.mjs`.
- The old hand-coded demo lives in `legacy/` as a content source during migration.
