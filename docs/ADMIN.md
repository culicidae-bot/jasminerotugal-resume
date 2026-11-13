# Portfolio admin guide

This document explains how the private admin area works, from access control to publishing.
Read it with `SETUP.md`, which covers Supabase project creation, MFA enrollment, and storage buckets.

## Access control (why visitors can never edit anything)

- **No public registration exists.** The only account is the Supabase Auth owner account you create.
- **Two factors are required.** Sign-in uses email + password (AAL1), then a TOTP authenticator
  code (AAL2). The app refuses to enter the dashboard until the session is `aal2` and the
  `is_owner()` RPC confirms the account is registered as the portfolio owner in `public.app_owner`.
- **Row Level Security** on every table restricts unpublished reads and all writes to the owner at `aal2`.
  Even a valid Supabase anon key, or another signed-in account, cannot read drafts or modify content.
- **Public content** is served from the `published_sections` view / `published = true` rows and from
  the public `public-media` storage bucket. Published asset URLs are not secret; treat them as public.
- **Draft preview** at `/preview` uses the same enforcement: anonymous or non-owner visitors receive a
  signed-out/owner-required message and never receive draft content.

## Admin route map

| Route | Purpose |
| --- | --- |
| `/admin` | Owner sign-in, TOTP verification/enrollment, and the dashboard (single-page app, no registration) |
| `/preview` | Owner-only preview of the unpublished draft; renders the real public site with draft content and a banner |

`/admin` and `/preview` are served with `X-Robots-Tag: noindex` and `Cache-Control: no-store` (see `vercel.json`).

## Dashboard sections

Sidebar groups:

- **Overview** — content counts (projects, certificates, achievements, skills, education, experience),
  publish state, last content save time, pending asset cleanup, and a launch-readiness checklist.
- **Content**
  - **Profile** — full name, professional headline, short tagline, optional header subtitle,
    short introduction, about text, career objective, education summary, IT interests,
    professional email, GitHub URL, LinkedIn URL, portrait description, and the professional
    photo upload. These contact fields are the single authoritative source reused by the
    homepage, contact section, footer, and generated resume.
  - **Skills** — skills with category (`Technical`, `Networking`, `Cybersecurity`,
    `Programming & Development`, `Professional`), optional proficiency (0–100) and label.
    Proficiency bars only render when a value is set, and are sorted by the five categories above.
  - **Certificates** — genuine certificates: title, type, issuing organization, date earned,
    verification URL, and an optional image/PDF upload. Uploading a certificate attachment runs
    browser-side OCR (Tesseract.js for images and scanned PDFs; pdf.js for text PDFs) and
    auto-fills the form. Nothing is published automatically — review every field, then save
    the draft as usual. Per-field confidence chips and notes flag anything the OCR could not
    read reliably; unclear values are left blank rather than invented. Extraction runs entirely
    in the browser against local vendor assets; documents never leave your machine except for
    the private upload into the draft-only `originals` bucket.
  - **Achievements** — awards and recognitions (types `Achievement`/`Award`). These live in the same
    store as certificates but are managed and counted separately.
  - **Eligibility** — eligibility examinations and conferred certifications. Each record has a
    **Status** field; only `Completed` records (or legacy records with no status) appear publicly
    and in the generated resume. `In progress` and `Planned` records stay in the draft only.
  - **Experience** — four groups: work, internship/OJT, volunteer, and relevant academic/CTF activities.
  - **Education** — tertiary, secondary, and elementary entries (institution, course/level,
    year graduated or expected, achievement).
  - **Projects** — title, role, purpose, description, technologies, features, contributions,
    project/source URLs, screenshots (**minimum two before publishing**), and a *featured* flag.
    Featured projects are shown first publicly with a `Featured` badge.
  - **Security focus** — lab/CTF profiles (name, description, URL) and write-ups (title, summary).
    The public security section renders only when at least one profile or write-up is published.
- **Site**
  - **Design** — color preset (Midnight navy default, Graphite Violet, Ivory Light), font style,
    content width, section spacing, section padding, hero layout (split/centered/cover), skills
    layout, projects layout, certificates layout, accent colors, WOFF2 font upload, and
    **section visibility** checkboxes for all ten public sections
    (hero, about, skills, certificates, eligibility, experience, projects, education, security, contact).
    Hidden sections never render publicly, even if they have content.
  - **Website settings** — search-engine titles/descriptions for the home, certificates, and
    not-found pages, the contact form subject, and an optional resume PDF override. Any blank
    search field is derived from the Profile name/headline/introduction. The public resume is
    generated automatically from published content on every publish unless a manual override is set.
    Header branding always comes from the Profile name, so there is no second site-title field.

The publish bar (bottom of content tabs) offers: **Preview draft**, **Discard edits**, **Save draft**,
**Publish to recruiters**, and **Unpublish** when published.

## Publishing workflow

1. Edit → **Save draft** keeps changes private.
2. **Preview draft** (`/preview`) renders the exact public page with your draft applied.
3. **Publish to recruiters** copies referenced private assets into `public-media`, publishes the content,
   and regenerates the downloadable resume PDF from your published content (unless you uploaded a manual
   resume in Website settings). The public site updates immediately, and the Download resume button
   serves the regenerated file. There is no bundled static resume: if generation fails, the button
   reports that the resume is unavailable and publishing continues with a warning.
4. **Unpublish** hides everything and cleans up unreferenced public copies while preserving the private draft.

Required checks before publishing:

- every project needs at least two screenshots (enforced — publish is blocked otherwise);
- a professional photo and at least one skill are strongly recommended (see the Overview checklist).

## Content conventions

- **Certificates vs achievements.** Use `Certificates` for credentials (IT certification, training,
  workshop, seminar) and `Achievements` for awards/recognitions. The public Certificates section shows both.
- **Eligibility** is for conferred records only. Planned certifications belong nowhere on the public site.
- **Skills categories** are normalized to the five categories above; anything else still renders,
  sorted after the known categories.
- **Featured projects.** Star a project to pin it to the top of the projects section.

## Testing admin flows locally

```bash
npm run dev          # then open http://localhost:5173/admin
npm test             # unit tests (node --test)
npm run build        # production build incl. CSP check
npm run preview      # serve the production build locally
```

Without valid owner credentials you can still verify that anonymous visitors cannot read drafts:
open `/preview` signed out — you get an owner-required message, not the draft.

## Common problems

- **"Could not load saved content"** — the message now names the exact cause. If it reports
  `Supabase is not configured: VITE_SUPABASE_URL is empty at build time` (or a missing anon key /
  placeholder origin), the deployment was built without those env vars: set them for the
  environment being viewed (Production vs Preview) and redeploy. Otherwise the draft is invalid JSON
  or the session expired — sign out, sign in again, or restore from a known-good draft.
- **Asset cleanup pending** — unpublished public copies are queued, not leaked silently; use
  *Retry public asset cleanup* on the Overview tab.
- **Publish blocked** — add at least two screenshots to every project.
