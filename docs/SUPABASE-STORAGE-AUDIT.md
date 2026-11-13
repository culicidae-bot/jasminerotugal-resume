# Supabase storage persistence audit

**Date:** 2026-11-13 · **Scope:** every feature that creates, uploads, imports, attaches, previews, replaces, removes, or displays a portfolio file.
**Verdict first:** the draft/publish asset pipeline is sound (private `originals:` references in the draft, copied to `public-media` and rewritten to public URLs on publish), but two gaps existed and are now fixed: **batch-imported certificate/achievement attachments were never uploaded**, and the **About section image had no Admin control** (it could never be set). After this change, every feature stores the actual file bytes in Supabase Storage; nothing relies on the browser, temporary object URLs, or the Vercel filesystem.

## Storage architecture (as found, unchanged)

| Layer | Mechanism | Survives refresh / re-login / redeploy |
|---|---|---|
| `originals` bucket (private) | draft uploads (`portfolio/<uuid>.<ext>`) | Yes — object storage, independent of the app |
| `public-media` bucket (public) | publish-time copy of referenced originals; `portfolio/resume.pdf` (upsert) | Yes — public bucket |
| `site_settings` rows | `portfolio_content` (published) / `portfolio_content_draft` hold JSON with `originals:` refs (draft) or absolute public URLs (published) | Yes — Postgres |
| `public_asset_cleanup_queue` | publish-time rewrite; guard trigger blocks publishing when a referenced object is missing | Yes |
| Admin previews | 60-second signed URLs (`resolvePortfolioAssetUrl`) for `originals:` refs | Yes — re-signed on demand |
| Base64 in DB | **Not used anywhere** (enforced by inspection + tests) | — |

Upload/copy code paths: `uploadPortfolioAssetWithClient` → `originals:`; `copyOriginalsToPublic` / `mapAssetReferences` at publish; `unpublishPortfolioContentWithClient` copies back to `originals`. Cleanup of superseded public objects runs on publish/design-save/unpublish via the queue and the guard trigger. Nothing new depends on localStorage, sessionStorage, object URLs, or the deployment filesystem.

## Feature inventory

| # | Feature | Upload path | Storage / DB | Actual bytes in Storage? | Public after publish | Survives refresh / redeploy | Draft → publish | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Profile photograph (`hero.portrait`) | Admin → Profile → Upload professional photo → `uploadPortfolioAsset` | `originals` → ref in draft JSON → copy planned at publish | Yes | Yes (published copy) | Yes | Draft saved → publish copies → public URL | OK (kept; Hero remains text-only) |
| 2 | About section image / portrait (`about.image`) | Admin → Profile → **About image** (new) → `uploadAboutImage` | same pipeline as #1; public About renders `about.image` or falls back to `hero.portrait` | Yes | Yes | Yes | Same | **Fixed in this change** (was: renderer existed, no Admin control) |
| 3 | Certificate/achievement thumbnail images (image attachments) | Admin record editor → attachment input with kind `certificate` | `originals` → ref `publicFile.src` in draft JSON | Yes | Yes (mimeType `image/*` → thumbnail; else "Open certificate PDF") | Yes | Same | OK |
| 4 | Certificate/achievement JPG/PNG/WebP/PDF documents | Admin record editor → `Add certificate file` (single-file OCR path) | uploaded once, ref reused by OCR; `addCertificateFile` runs extraction on the uploaded file | Yes | Yes (Certificates dialog: `ImageSlot` or "Open certificate PDF") | Yes | Same | OK |
| 5 | Batch certificate/achievement imports (multi-file) | Admin → Batch import → select/drop files | **Was:** nothing stored — browser memory only. **Now:** every approved record gets its attachment uploaded at import time | **Yes (after fix)** | Yes | Yes | Draft holds `originals:` refs; publish copies | **Fixed in this change** |
| 6 | OCR / extracted certificate records (single-file) | Admin record editor → same upload as #4 → `extractCertificateDocument` | `originals` (the same File that was uploaded) | Yes | Yes | Yes | Same | OK |
| 7 | Split documents / per-segment attachments from batch PDFs | Batch import → PDF segmentation (`pdf-segmenter`, `pdf-lib`) | **Was:** not created at all. **Now:** each approved segment is uploaded as its own split PDF (`splitPdfAttachmentWithClient`, pages copied) or, for images, the source image; alt text carries the page range | **Yes (after fix)** | Yes | Yes | Same | **Fixed in this change** |
| 8 | Project screenshots (≥2 per project) | Admin → Projects → Project screenshots (multiple) | `originals`; stored in `projects[].screenshots[]` in array order | Yes | Yes (featured grid renders in stored order, no sorting) | Yes | Same | OK (ordering preserved; no reorder UI — removal only) |
| 9 | Experience supporting files | — | Not supported by the existing content model (text-only records) | n/a | n/a | n/a | n/a | Not supported (not invented) |
| 10 | Education supporting files | — | Not supported by the existing content model (tertiary/secondary/elementary text) | n/a | n/a | n/a | n/a | Not supported (not invented) |
| 11 | Generated resume PDF | Publish → `attachGeneratedResume` (buildResumePdf from the published snapshot) | `public-media/portfolio/resume.pdf` (upsert, cacheControl 60); legacy `/resume/*.pdf` replaced on republish; failure leaves `resumePath: ''` and an admin warning | Yes | Yes (public URL; never derived from draft) | Yes | Regenerated at every publish | OK |
| 12 | Manual resume override | Admin → Website settings → upload PDF | `originals` → mirrored to public-media at publish | Yes | Yes (override active until cleared) | Yes | Same | OK |
| 13 | Custom font (WOFF2) | Admin → Design → upload WOFF2 | `originals` → Design save maps + publishes | Yes | Yes | Yes | Design publishes immediately by design (not part of draft) | OK (existing behavior) |
| 14 | Public asset cleanup | publish/design-save/unpublish | `public_asset_cleanup_queue` + `guard_published_public_assets` trigger | — | — | Yes | — | OK |
| 15 | Admin previews (photos, documents, screenshots) | `DraftAssetImage` / `DraftAssetLink` | 60s signed URLs for `originals:` refs | — | — | Yes (re-signed) | Draft-only until publish | OK |

## Draft → published guarantees (Phase 4, preserved)

- Public site reads only `published_sections` → anonymous visitors never see draft assets.
- Draft files use `originals:` refs; publishing copies each referenced object to `public-media` (upsert) and rewrites refs to public URLs.
- `/preview` is owner-only (Supabase RLS + AAL2 via `is_owner()`).
- New batch-import attachments follow the identical path: unpublished files stay private; only after publish do their records (and files) become public.
- Unpublish copies `public-media` objects back to `originals`, rewrites the private draft, hides published rows, and enqueues cleanup — no public links are left pointing at missing objects.

## What this change fixed

1. **Batch import now persists every supporting document** (`src/lib/batch-attachments.js`, `src/components/BatchImportWorkspace.jsx`):
   - PDF segments are split to single-purpose PDFs with only that segment's pages (pdf-lib), with the page range preserved in the alt text (`Certificate (pages 3–5 of file.pdf)`).
   - Split failure attaches the whole source PDF instead of dropping the record.
   - Image segments attach the source image.
   - Upload failure attaches nothing, **skips that record**, and reports it by name in the workspace — no silent attachment-less imports.
   - Record IDs, OCR metadata, destinations (certificate/achievement), category, featured/resume flags, and verification URLs are untouched.
2. **About image administering** (`src/pages/AdminDashboard.jsx`, `src/lib/messages.js`): upload, preview, replace (re-upload), remove, alt text; renders publicly only after publish; hero stays text-only.
3. **No stored-data changes**: existing drafts and published content are untouched; new attachments use the same `originals:` → `public-media` contract.

## Deliberately not changed

- Supabase schema, RLS, buckets, auth/MFA, OCR/extraction, duplicate detection, resume generation, contact backend, CSP, dummy/sample-content isolation — all untouched.
- Experience/Education file uploads were not added (existing content model has no such fields; no mandatory documents invented).
- No npm dependencies added (`pdf-lib` is already a direct dependency).
- No commit, push, or deploy.

## Known limitations (unchanged or residual)

- Deleting a **draft** record leaves its `originals` object orphaned (no record-level garbage collection; same behavior as before this change).
- Screenshot removal deletes the record but not the `originals` object; cleanup only targets `public-media`.
- Screenshot reordering is not implemented (array insertion order is preserved; removal is supported).
- `about.image` requires its alt text before it renders publicly (same guard as the portrait).
- Design settings publish immediately on "Save design" by existing design, not after content publish.
- Admin can preview draft attachments but cannot open published ones until they exist publicly (60s signed URLs for drafts).

## Manual verification checklist for the owner (live project, AAL2 session)

1. Batch import a multi-page PDF → approve segments → Import → save draft → reload `/admin` → open each record's attachment (draft preview) ✓.
2. `/preview` → confirm attachments render → anonymous window → confirm nothing renders until publish → publish → confirm thumbnails/"Open certificate PDF" on `/` and `/certificates` ✓.
3. Upload a project screenshot → refresh → re-login → confirm preview persists → publish → confirm on the public site ✓.
4. Upload a portrait and an About image → replace each → remove each → publish → expected public change ✓.
5. Unpublish → confirm public site shows no attachments/images → draft still holds refs → republish ✓.
