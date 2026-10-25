# Chirayu Medical College & Hospital — Website

Modern redesign of the CMCH public website (cmchbhopal.com). Static HTML/CSS/JS, deployed on Vercel (auto-deploys on every push to `main`).
All existing links and content are kept as on the current site; only the design is new.

## Structure

```
index.html              Homepage (layout + static sections)
content/home.json       Homepage content that changes often  ← admin edits this
assets/css/style.css    All styles (shared by every page)
assets/js/main.js       Animations + renders content/home.json
assets/img/             Logo, placeholders
images/                 Real CMCH photos go here
```

## Admin-managed content

The site is built so that an admin panel can maintain it without touching HTML.
Everything that changes regularly on the homepage is read from `content/home.json`:

| Key              | Section on the page                        |
|------------------|--------------------------------------------|
| `hero.slides`    | Main 3D slider (image, title, text)        |
| `hero.facts`     | Numbers under the hero (1992 / 1300 beds…) |
| `ticker`         | Breaking News strip                        |
| `notices`        | Important Notice tab                       |
| `media`          | Media tab (YouTube IDs / links)            |
| `upcomingEvents` | Upcoming Events tab (empty = "Coming soon")|
| `studentInfo`    | Student Info live board                    |
| `videos`         | Video Gallery (YouTube IDs)                |
| `news`           | Latest News                                |
| `gallery`        | Photo Gallery categories                   |
| `visitorBase`    | Starting number for the visitor counter    |

New pages will follow the same pattern: one HTML layout + one `content/<page>.json`.

## Images

Items with `"demo": true` use temporary web photos. Replace them with real CMCH photos:
put the file in `images/` and change the `img` path (e.g. `"img": "images/slide1.jpg"`).
If an image fails to load, the page shows a branded teal placeholder automatically.

## Run locally

The homepage loads `content/home.json` with `fetch`, so open it through a server, not by double-clicking the file:

```
npx serve .        # or VS Code → Live Server, or `vercel dev`
```

---
Designed & developed by Arjun Ahirwar
