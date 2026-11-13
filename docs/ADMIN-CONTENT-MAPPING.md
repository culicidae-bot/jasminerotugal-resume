# Public section → Admin field mapping

This document records how each public portfolio section is driven by the protected Admin
Dashboard and the published Supabase content. The base object in `src/data/content.js` is an
empty structural schema only: it contains no personal names, institutions, contact details,
records, or resume file. Published Supabase content is authoritative.

## Data flow

```
AdminDashboard draft state
  → Save draft       → site_settings.portfolio_content_draft (published = false)
  → Preview draft    → loadPortfolioDraft() → /preview (owner session only)
  → Publish          → copy private assets + generate resume + validate public URLs
                     → site_settings.portfolio_content (published = true)
  → Public website   → published_sections view → loadPublishedPortfolioContent()
                     → mergePublishedPortfolioContent(baseContent, published)
```

- `savePortfolioDraftWithClient` writes only `portfolio_content_draft`; it never updates the
  published row.
- `loadPublishedPortfolioContent` reads only the `published_sections` view, so anonymous
  visitors never receive draft data.
- `unpublishPortfolioContentWithClient` sets the published row to `published = false`,
  copies public assets back to the private `originals` bucket, and persists the private draft.
- The generated resume is built from the exact object being published, so it cannot include
  unpublished draft records.

## Section mapping

| Public section | Admin tab | Admin fields / paths | Public consumer | Automated evidence |
|---|---|---|---|---|
| Header brand | Profile | `hero.name`, `hero.brandDetail` | `src/components/Header.jsx` | `src/lib/seo.test.js`, section-flow test |
| Hero | Profile | `hero.name`, `hero.title`, `hero.eyebrow`, `hero.focus`, `hero.portrait.*` | `src/components/Hero.jsx` | section-flow test, `public-content.test.js` |
| About | Profile | `about.introduction`, `about.careerObjective`, `about.educationSummary`, `about.interests`, `about.image.*` | `src/sections/AboutSection.jsx` | section-flow test |
| Skills | Skills | `skills[]` (category, name, proficiency, label, featured, resume, priority) | `src/sections/SkillsSection.jsx` | section-flow test, `public-sections.test.js` |
| Certificates | Certificates | `certificates[]` where `type` is not `Award`/`Achievement` (title, type, issuer, dateEarned, verifyUrl, publicFile, featured, resume) | `src/sections/CertificatesSection.jsx`, `src/pages/CertificatesPage.jsx` | section-flow test, `public-sections.test.js` |
| Achievements | Achievements | same store, `type` = `Award`/`Achievement` | `src/sections/CertificatesSection.jsx` | section-flow test, `public-sections.test.js` |
| Eligibility | Eligibility | `eligibility[]` (title, issuer, dateConferred, status, verifyUrl, extra, resume) | `src/sections/EligibilitySection.jsx` | section-flow test, `public-sections.test.js` |
| Experience | Experience | `experience.work[]`, `.internship[]`, `.volunteer[]`, `.academic[]` | `src/sections/ExperienceSection.jsx` | section-flow test |
| Education | Education | `education.tertiary`, `.secondary`, `.elementary` | `src/sections/EducationSection.jsx` | section-flow test |
| Projects | Projects | `projects[]` (title, role, purpose, summary, technologies, features, contributions, projectUrl, sourceUrl, screenshots, featured, resume) | `src/sections/ProjectsSection.jsx` | section-flow test, `public-sections.test.js` |
| Security focus | Security focus | `securityFocus.profiles[]`, `securityFocus.writeups[]` | `src/sections/SecuritySection.jsx` | section-flow test, `public-sections.test.js` |
| Contact details | Profile | `contact.email`, `contact.github`, `contact.linkedin` (one source) | `src/sections/ContactSection.jsx`, `src/components/Footer.jsx`, `src/lib/resume.js` | section-flow test, `resume.test.js` |
| Contact form | Website settings / Profile | `contactSubject`, `contact.email`; submit endpoint is environment configuration | `src/sections/ContactSection.jsx` | `contact.test.js`, edge-function tests |
| Resume | Website settings | `resumePath` (blank = auto-generate; upload = manual override) | `src/components/ResumeButton.jsx`, `src/lib/resume.js` | `resume.test.js`, `portfolio-content.test.js` |
| Section visibility | Design | `section_visibility` | `src/pages/HomePage.jsx` | `design-settings.test.js` |
| Skills layout | Design | `skills_layout` (`rows`, `two-columns`) | `src/sections/SkillsSection.jsx` | `design-settings.test.js`, design persistence test |
| Projects layout | Design | `projects_layout` (`stacked`, `two-column`) | `src/sections/ProjectsSection.jsx` | `design-settings.test.js`, design persistence test |
| Certificates layout | Design | `certificates_layout` (`table`, `thumbnails`) | `src/sections/CertificatesSection.jsx` | `design-settings.test.js`, design persistence test |
| Colors, typography, spacing, hero layout | Design | `theme_mode`, `font_scale`, `font_url`, `content_width`, `section_spacing`, `section_padding`, `*_color`, `hero_variant` | `src/lib/design-settings.js` tokens | `design-settings.test.js` |
| Page titles and descriptions | Website settings | `meta.homeTitle`, `meta.homeDescription`, `meta.certificatesTitle`, `meta.certificatesDescription`, `meta.notFoundTitle`, `meta.notFoundDescription` | `src/lib/seo.js`, `Seo.jsx`, pages | `seo.test.js` |
| Navigation | Derived | `nav` + section visibility + published records | `Header.jsx`, `Footer.jsx` | `public-sections.test.js` |
| Pre-publication empty state | Application chrome | shown only when no published section has content; hero, about, and contact require published content | `src/pages/HomePage.jsx`, `src/data/content.js` (`ui.emptySite`) | `public-sections.test.js` |

## Draft / publish guarantees

| Guarantee | Implementation | Test |
|---|---|---|
| Save Draft never changes public content | `savePortfolioDraftWithClient` writes only `portfolio_content_draft` | `Save Draft persists edits for reload without changing published content` |
| Draft reload returns saved edits | `loadPortfolioDraftWithClient` prefers the draft row | section-flow test |
| Preview is owner-only | `/preview` checks the Supabase session; RLS blocks unpublished reads | RLS/security migration tests; manual signed-out check |
| Publish exposes the edited records | `publishPortfolioContentWithClient` writes `portfolio_content` with `published = true` | section-flow test |
| Unpublish preserves the private draft | `unpublishPortfolioContentWithClient` copies assets back and rewrites the draft | section-flow test, unpublish tests |
| Anonymous loader never sees drafts | `loadPublishedPortfolioContentWithClient` reads only `published_sections` | section-flow test |
| Generated resume uses published content | `attachGeneratedResume` builds from `publishedContent` | `publishing regenerates the public resume PDF…` |
| Legacy static resume is replaced | `/resume/*.pdf` is treated as non-override and regenerated | `a legacy static resume path is replaced…` |

## Verification status

Automated contract tests use an in-memory Supabase-shaped client. They prove the code paths,
state transitions, and validation rules, but **they are not proof that the live Supabase project
persisted a row**. A live owner-session pass is still required and is listed below. It was not
performed in this change because owner credentials were not available in this environment.

### Live owner checklist (requires `/admin` with AAL2)

For each tab (Profile, Skills, Certificates, Achievements, Eligibility, Experience, Education,
Projects, Design):

1. Change or add one record.
2. **Save draft**.
3. Reload `/admin` and confirm the change is still there.
4. Open `/preview` and confirm the change appears only there.
5. In a private window, open `/` and confirm the old published value is still shown.
6. **Publish to recruiters**.
7. Reload the anonymous page and confirm the exact new value appears.
8. **Unpublish** and confirm the draft still contains the change while the public page no longer does.

Record the date, tab, record ID, before/after value, and anonymous URLs in the release notes.

## Commands

```bash
npm test
npm run build
npm run check:csp
git diff --check
```
