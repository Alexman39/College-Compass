# materials/ — raw course material (private)

Put the original course files here: lecturer slides, PDFs, handouts, photos of
the board, exercise sheets. One folder per course, named after the course id:

```
materials/
  cn6003/   Computer and Network Security
  cn6000/   Mental Wealth: Professional Life 3
  cn6005/   Artificial Intelligence
```

**Everything in this folder except this README is ignored by git.** The files
stay on your computer and are never committed, pushed or published. That
matters: lecturer-owned material must not be re-hosted on the site; the site
links to Moodle instead.

## How to turn material into site content

In a Claude Code chat, point at the file and say what you want, for example:

> Make the Week 1 lesson for CN6003 from `materials/cn6003/lecture-01.pdf`.

Claude reads the file and writes the lesson, exercise or course details into
`src/content/`. It shows new wording for your approval, builds and checks the
site, and opens a pull request. You merge it to publish.

Good habits:

- **One chat at a time per course.** Two chats editing the same course at
  once create conflicting branches.
- **Name files so they sort:** `lecture-01.pdf`, `lecture-02.pdf`,
  `lab-01.pdf`, `coursework-brief.pdf`.
- **Add a note** if something isn't obvious, e.g. `notes.txt`: "slides 30–45
  were skipped in class", "quiz date moved to 6 Nov".
