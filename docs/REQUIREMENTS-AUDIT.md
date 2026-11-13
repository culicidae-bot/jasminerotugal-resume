# Portfolio requirements audit

This audit maps the portfolio against the requirements supplied for the final compliance pass.
The original six-page project brief PDF is not present in this workspace, so the table uses the
enumerated requirements from the owner's request. No personal data, credentials, screenshots, or
certificates were invented.

## Requirement mapping

| Requirement | Implementation location | Status | Missing information | Required action |
|---|---|---|---|---|
| Professional email shown publicly as a `mailto:` link | `src/sections/ContactSection.jsx`, `src/sections/AboutSection.jsx`, `src/components/Footer.jsx`, `src/lib/urls.js` (`mailtoSafeAddress`) | IMPLEMENTED BUT NEEDS CONTENT | No professional email is currently published | Enter the email in **Admin → Profile → Professional email**, save the draft, then publish |
| GitHub profile link | `src/sections/ContactSection.jsx`, `src/components/Footer.jsx`, `src/pages/AdminDashboard.jsx` (Profile) | IMPLEMENTED BUT NEEDS CONTENT | No GitHub URL is currently published | Enter the full `https://` profile URL in Profile, save, publish |
| LinkedIn profile link | `src/sections/ContactSection.jsx`, `src/components/Footer.jsx`, `src/pages/AdminDashboard.jsx` (Profile) | IMPLEMENTED BUT NEEDS CONTENT | No LinkedIn URL is currently published | Enter the full `https://` profile URL in Profile, save, publish |
| Professional contact empty state | `src/sections/ContactSection.jsx`, `src/data/content.js` (`contactLabels.detailsUnavailable`), `src/styles.css` (`.contact-empty`) | COMPLETE | None | None |
| Professional pre-publication empty state | `src/pages/HomePage.jsx` (`.site-empty`), `src/data/content.js` (`ui.emptySite`), `src/components/Footer.jsx`, `src/lib/public-sections.js` | COMPLETE | None | None; hero, about, and contact render only after publishable content exists |
| Existing contact form remains functional | `src/sections/ContactSection.jsx`, `src/lib/contact.js`, `supabase/functions/contact/` | IMPLEMENTED BUT NEEDS ACTION | Contact Edge Function deployment and `CONTACT_ALLOWED_ORIGIN` are environment-specific | Deploy the function, set the allowed-origin secret to the final personal origin, and verify one test message |
| All contact details editable in Admin | `src/pages/AdminDashboard.jsx` (Profile) | COMPLETE | None | None |
| No public technical references to Supabase/storage/backend | Public sections, header, footer, and certificate pages | COMPLETE | None | None; technical wording remains only in owner-only setup screens and developer logs |
| Uploaded professional photograph displayed in About (never on the first screen) | `src/sections/AboutSection.jsx` (`about.image`, falling back to `hero.portrait`), `src/components/ImageSlot.jsx` | COMPLETE (renders in About) | No portrait has been uploaded | Upload a genuine portrait in **Admin → Profile**, set a factual description, save, publish |
| Portrait alt text preserved | `src/pages/AdminDashboard.jsx` (Profile) | COMPLETE | None | None |
| Public navigation lists Profile, Skills, Certificates, Experience, Projects, Eligibility, Education, Contact when populated | `src/data/content.js` (`nav`), `src/components/Header.jsx`, `src/components/Footer.jsx`, `src/lib/public-sections.js` (`isPublicNavigationItem`) | COMPLETE | Sections appear only after they have publishable content | Add the underlying records, save, publish |
| Empty sections never render fabricated content | `src/lib/public-sections.js` (`hasPublicSectionContent`), `src/pages/HomePage.jsx` | COMPLETE | None | None |
| Consistent section numbering with navigation | `src/pages/HomePage.jsx`, `src/components/Section.jsx`, `src/data/design.js` (`sectionOrder`), dynamic header offset in `src/components/Header.jsx` | COMPLETE | None | None |
| Tertiary, secondary, elementary education | `src/sections/EducationSection.jsx`, `src/pages/AdminDashboard.jsx` (Education tab), `src/data/content.js` | COMPLETE | Secondary and elementary school names/dates are not supplied | Enter genuine school details when available |
| Graduation year and academic achievements | `src/sections/EducationSection.jsx`, `src/pages/AdminDashboard.jsx` (Education tab) | IMPLEMENTED BUT NEEDS CONTENT | No graduation date or academic achievement is currently published; the base content is intentionally empty | Enter genuine dates and achievements in the Education tab, save, publish |
| Experience keeps work / internship / volunteer / academic-activity groups | `src/sections/ExperienceSection.jsx`, `src/data/content.js` (`ui.experienceGroups`), `src/pages/AdminDashboard.jsx` | COMPLETE | None | None |
| CTF participation is not presented as employment | Experience section groups; CTF activities belong in `experience.academic[]` and are entered in **Admin → Experience** | COMPLETE (base content contains no personal CTF record) | No CTF record is currently published | Add genuine academic/CTF activities in the Experience tab |
| Project title, role, purpose, description, technologies, features, contributions, screenshots | `src/sections/ProjectsSection.jsx`, `src/pages/AdminDashboard.jsx` (`listFields.projects`) | COMPLETE | No project records are currently published | Add genuine projects with approved screenshots |
| Publish validation for missing screenshots | `src/pages/AdminDashboard.jsx` (`publish`), `src/lib/public-sections.js` (`countPublicProjectScreenshots`) | COMPLETE | None; validation now requires two usable screenshots and names every incomplete project | None |
| Certificates and achievements remain separate public collections | `src/lib/prioritize.js` (`splitRecords`), `src/sections/CertificatesSection.jsx`, Admin Certificates/Achievements tabs | COMPLETE | No certificate or achievement records are currently published | Add genuine records |
| Certificate attachments and searchable records | `src/pages/CertificatesPage.jsx`, `src/lib/certificates.js`, Admin Certificates tab | COMPLETE | Attachments/search only show published records | Upload genuine documents and verify the search |
| Verification links for certificates, achievements, and eligibility | `src/sections/CertificatesSection.jsx`, `src/pages/CertificatesPage.jsx`, `src/sections/EligibilitySection.jsx`, Admin field lists | COMPLETE | No verification URLs supplied | Add issuer verification URLs where available |
| Only completed eligibility displayed as attained | `src/lib/public-sections.js` (`isPublicEligibility`), `src/sections/EligibilitySection.jsx`, `src/lib/resume.js`, Admin eligibility `Status` field | COMPLETE | No completed eligibility records are currently published | Add conferred records with status `Completed` |
| Resume reflects latest published content, curated and paginated | `src/lib/portfolio-content.js` (`attachGeneratedResume`), `src/lib/resume.js`, `src/lib/prioritize.js` | COMPLETE | Resume content depends on published records; there is no bundled static PDF | Confirm the published resume after each release |
| Resume never exposes private draft content | `src/lib/portfolio-content.js` (publish builds from published content), `/preview` protected by RLS + owner + AAL2 | COMPLETE | None | None |
| All public sections map to Admin fields | `docs/ADMIN-CONTENT-MAPPING.md`; `src/pages/AdminDashboard.jsx` (Profile, Skills, Certificates, Achievements, Eligibility, Experience, Education, Projects, Security focus, Design, Website settings) | COMPLETE | None | Keep the mapping document current when fields change |
| Personal domain connection documented | `docs/SETUP.md` section 9 | COMPLETE (documentation) / INCOMPLETE (live domain) | No personally registered domain is confirmed as connected | Register/confirm the domain, add it in Vercel, apply the displayed DNS records, set `VITE_SITE_ORIGIN`, update `CONTACT_ALLOWED_ORIGIN`, redeploy |
| Vercel subdomain is not treated as the required personal domain | `docs/SETUP.md` section 9 | COMPLETE | None | None |
| Automated tests and production build | `npm test`, `npm run build`, `npm run check:csp`, `git diff --check` | COMPLETE | Live Supabase owner CRUD was not executed in this pass | Re-run the publish/CRUD checklist with owner credentials after deployment |

## Content still required from the owner

These are content gaps, not code gaps:

- Professional email, GitHub URL, and LinkedIn URL.
- A genuine professional portrait and its factual description.
- Secondary and elementary school details, if they should be public.
- Confirmed tertiary graduation date and any academic achievement.
- Genuine work, internship/OJT, and volunteer records.
- Genuine projects with at least two approved screenshots each.
- Certificates and achievements with issuers, dates, optional documents, and verification links.
- Completed eligibility records only (planned or in-progress records stay hidden).
- Deployment of the contact Edge Function and the final personal domain.

## Verification performed

- `npm test`: 162 passed, 0 failed.
- `npm run build`: succeeds, including the CSP build check.
- `npm run check:csp`: passes.
- `git diff --check`: clean.
- Base content test confirms there are no personal names, institutions, contact details, records, or static resume paths in `src/data/content.js`.
- The production bundle was checked for personal identifiers, legacy theme keys, and a bundled resume
  directory; none are present. The pre-publication home page falls back to the `ui.emptySite` panel
  until the owner publishes content; hero, about, and contact render only when publishable content
  exists (`hasPublicSectionContent`).
- Live Supabase owner CRUD and a browser-rendered public smoke check remain outstanding because owner
  credentials and a browser runtime are not available in this environment. Use the live owner
  checklist in `docs/ADMIN-CONTENT-MAPPING.md`.

No commit, push, or deployment was performed. No Supabase records were created, changed, or deleted.
