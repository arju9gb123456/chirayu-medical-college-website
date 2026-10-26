# Chirayu Medical College & Hospital — Website

Modern redesign of the CMCH public website (cmchbhopal.com). Static HTML/CSS/JS on Vercel (auto-deploys on every push to `main`).
All existing links and content are kept as on the current site; only the design is new.
Content is managed from the admin panel at **`/admin`** (Supabase backend).

## Structure

```
index.html              Homepage layout
assets/css/style.css    Site styles (shared by every page)
assets/js/main.js       Animations + renders page content
assets/js/config.js     Supabase URL + anon key  ← fill once
content/home.json       Default/fallback homepage content (also the first seed)
page.html               Template for every inner page (/<slug>/), generated
assets/js/page.js       Renders inner pages (tables, documents, galleries, text, buttons)
content/pages/*.json    Fallback content for inner pages + index.json (page list)
tools/build_page_shell.py  Rebuilds page.html from index.html (run after menu/footer changes)
admin/                  Admin panel (/admin)
supabase/schema.sql     Database tables, security rules, storage bucket
vercel.json             Static hosting config (no build step)
```

## Four designs

The site ships with four complete designs, switched with `data-theme` on `<html>`:

| Design | Look |
|---|---|
| `cinema` | **Cinematic** (default): dark full-screen photo slider, serif headings (Fraunces), teal glow |
| `classic` | Original: light hero, 3D coverflow photo cards, aurora glow, particles, Bricolage Grotesque |
| `clean` | Clean bright: split hero with rounded photo, Plus Jakarta Sans, soft gradients |
| `bold` | Bold & energetic: blob-framed photo, sticker, Unbounded, coral/yellow blocks |

Visitors can switch from the **Design** control in the top bar (remembered in their browser).
In the admin, **Design & settings** sets the default design and can hide the switcher once one is final.
Fonts are self-hosted in `assets/fonts` (no Google Fonts request).

## How content flows

```
Admin panel (/admin) ──publish──▶ Supabase: site_content['home']
                                        │
Website (index.html) ◀──reads───────────┘   (falls back to content/home.json)
```

Publishing in the admin updates the live site instantly; no redeploy needed.
Every publish keeps the previous version, so any change can be restored from **History**.

## One-time Supabase setup

1. Create a project at supabase.com.
2. **SQL Editor** → paste `supabase/schema.sql` → **Run**.
   It creates the tables, row-level security, the public `site-media` bucket, and adds the first admin email.
3. **Authentication → Users → Add user**: create the admin login (same email as in `site_admins`).
4. **Project Settings → API**: copy *Project URL* and *anon public* key into `assets/js/config.js`, push.
5. **Authentication → URL Configuration**: set *Site URL* to the live domain and add `https://<domain>/admin/` to *Redirect URLs* (for password reset emails).
6. Open `/admin`, sign in, press **Publish** once to store the content in Supabase.

To add another editor: add their user in Authentication, then
`insert into site_admins (email) values ('name@cmchbhopal.com');`

The anon key is safe in the browser: the security rules only let `site_admins` change content or upload files.

## What the admin can edit (homepage)

Hero slider, hero numbers, breaking news, important notices, media tab, upcoming events,
student info board, video gallery, latest news, photo gallery, About / Chairman / Virtual tour /
Course section texts and photos, and the visitor counter.

- Photos are compressed in the browser (max 2000px, WebP) before upload.
- PDFs can be uploaded for any link field.
- Drag items to reorder; the order in the admin is the order on the site.
- **Preview** shows unpublished changes on the real site (`/?preview=draft`) before publishing.
- Without Supabase configured, the admin runs in **draft mode**: edits stay in the browser and can be downloaded as `home.json`.

Items marked *Demo photo* still use temporary web images; replace them with real CMCH photos.

## Inner pages

Every inner page keeps its old address (e.g. `/license-certificate/`, `/nabh-iso-certificatation/`).
`vercel.json` rewrites `/<slug>/` to `page.html`, and `page.js` loads `site_content['page:<slug>']`
(falling back to `content/pages/<slug>.json`). A page that is not built yet shows a button to the old site.

In the admin, pick the page from **Editing page** in the sidebar, or press **+ New page**.
A page is a list of blocks: **Table**, **Documents list**, **Photo gallery**, **Text**, **Button**.
Publishing a page also adds it to the page list (`site_content['pages']`).

## Run locally

Pages load content with `fetch`, so use a server instead of double-clicking the file:

```
npx serve .        # or VS Code → Live Server, or `vercel dev`
```

---
Designed & developed by Arjun Ahirwar
