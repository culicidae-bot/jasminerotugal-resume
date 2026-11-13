# Supabase setup for Step 2A

Current Supabase docs checked for the settings in this file:
- https://supabase.com/docs/guides/auth/overview
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/guides/storage/overview
- https://supabase.com/docs/guides/functions/overview

This repository intentionally keeps the Supabase project origin in a placeholder until the owner has created the project and confirmed the exact URL. Do not commit a real project URL into public code; replace the placeholder in `.env.example`, `vercel.json`, and the final dashboard configuration before launch.

## 1) Project and auth dashboard settings

1. Create a Supabase project in the dashboard and copy the project URL and anon key.
2. Open Project settings → API and confirm the project URL is the same origin used in `VITE_SUPABASE_URL` and the Edge Function URL.
3. Open Authentication → Providers and set the following:
   - Sign up: Off (`Public sign-ups OFF`)
   - Anonymous sign-ins: Off
   - Magic link: Off
   - Phone login: Off
   - Email confirmations: On
   - Minimum password length: 12 characters
   - Require mixed characters: On
   - JWT expiry: 1 hour is a safe default for a single-owner app; shorten only if the owner explicitly wants a tighter session.
   - Refresh token reuse detection: On
   - Rate limits: enable the default per-IP throttling and keep the UI single-owner only
4. Open Authentication → User management and confirm that only the owner account exists.
5. Open Authentication → MFA and enable TOTP-based MFA as a hard requirement in the database layer; the app should not allow `aal1` writes or unpublished reads.

### Current-plan note

The settings above are standard Supabase Auth features and do not depend on private custom auth. Most of them are available on the Free plan. SSO, custom enterprise authentication, and some high-volume or advanced rate-limit/customization features can require a paid plan depending on the current Supabase pricing and region configuration; check the current docs before promising exact plan coverage.

## 2) Enforce database-side MFA

The owner must create the `app_owner` row and enable MFA in the dashboard before the app is used in production. The database should reject any write or unpublished read when the session is not `aal2`.

After creating and confirming the owner account in Authentication → Users and applying `20261108000100_core_schema.sql`, register that Auth user as the owner in the SQL editor. Replace the placeholder with the exact account email:

```sql
insert into public.app_owner (id)
select id
from auth.users
where lower(email) = lower('OWNER_EMAIL')
on conflict (id) do nothing;
```

Run this using the Supabase SQL editor as the project database administrator, then sign in to `/admin` and complete TOTP enrollment. Do not run this for an email that is not the intended owner account.

## 3) Security and storage checklist

- Keep storage bucket names as `originals` and `public-media`.
- Keep `originals` private and restrict every object operation to the authenticated portfolio owner at `aal2`.
- Treat `public-media` as publicly readable by URL. Only the owner at `aal2` may list or manage its objects; do not add anonymous object-listing policies.
- Draft uploads go to `originals`. The admin uses 60-second signed URLs for previews. Publishing copies only the asset references in the published portfolio/design into `public-media`.
- Unpublishing hides the published database record and queues public copies for cleanup. The owner can retry queued deletions from `/admin` after a reload or a new login. Assets still referenced by other published settings are retained. Public URLs are not protected by database `published` flags; already downloaded files and third-party/browser caches cannot be recalled.
- Never allow SVG or HTML uploads.
- Set the `CONTACT_ALLOWED_ORIGIN` Edge Function secret to the exact HTTPS website origin (scheme and host, no path or trailing slash). It is never a `VITE_` browser variable.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Supabase Edge Function secrets. Never put it in browser configuration.

Existing objects in an already-public `public-media` bucket remain publicly retrievable until individually reviewed and removed. Applying the updated SQL does not retroactively revoke a public object's URL.

## 4) Recovery runbook for lost 2FA

1. Keep the account password in a password manager.
2. Enroll two authenticator devices before any production use.
3. If a device is lost, delete the lost factor from the dashboard or from the account MFA settings.
4. Re-enroll a replacement authenticator device and confirm the owner has a fresh backup code or second factor.
5. Review the audit log after re-enrollment and verify no unauthorized changes happened while the factor was lost.

### Exact steps to remove a lost 2FA factor

1. Sign in to the Supabase dashboard with the owner email and password.
2. Open Authentication → Users.
3. Select the owner account.
4. Open the MFA section.
5. Remove the lost authenticator factor.
6. Add the replacement authenticator and verify the account is at `aal2` again.
7. Confirm that the project now blocks all `aal1` writes and unpublished reads.

## 5) Local configuration

Copy `.env.example` to a local `.env` file and replace the placeholders with the project URL, anon key, and origin values from the dashboard.

## 6) What to click in the dashboard

- Project settings → API
- Authentication → Providers
- Authentication → Users
- Authentication → MFA
- Storage → Buckets
- SQL editor → run migration files in order

This repository ships the migrations as timestamp-prefixed files under `supabase/migrations/`. Apply them in filename order: `20261108000100_core_schema.sql`, `20261108000200_rls_and_views.sql`, `20261108000300_storage_and_contact.sql`, `20261108000400_portfolio_media.sql`, then `20261108000500_public_asset_cleanup_queue.sql`. Migration 005 depends on the `site_settings` table, `public.is_owner()` helper, and Supabase Storage objects established by migrations 001–003. The migrations are written to be safely re-applied and do not remove existing storage objects. The contact edge function lives in `supabase/functions/contact/`.

## 7) Portfolio editor and public media

The private editor is available at `/admin`. After signing in and completing TOTP verification, it lets the owner edit the profile, skills, certificates, eligibility, experience, education, projects, and visual settings. Use **Save draft** to keep changes private; **Publish to recruiters** copies referenced originals into `public-media` and publishes the content. Use **Unpublish** to hide the portfolio and remove unreferenced public copies. A database `published` flag does not restrict access to a public Storage object.

The photo, project screenshots, certificate documents, resume PDF, and optional WOFF2 font are uploaded to the private `originals` bucket by default. Private previews use short-lived signed URLs. Publishing copies the selected files to `public-media`; only those copies are publicly retrievable. The client enforces 2 MB for each image/font and 10 MB for a PDF; both buckets enforce a 10 MB maximum. Each project must have at least two screenshots before publishing. Configure the public Supabase URL and anon key in the frontend environment; configure the allowed website origin and service-role key only as Edge Function secrets.

### Review existing `public-media` objects

The migration does not delete or approve existing objects. Review them using the authenticated owner account, not the SQL editor or a service-role key:

1. Apply migrations `20261108000100`–`20261108000500` in order, configure `.env` with the project URL and anon key, and ensure the portfolio owner has a verified TOTP factor.
2. As a separate, manual owner/AAL2-authorized operation after migrations have been applied, run `npm run reconcile:public-media` from an interactive terminal. This review is not part of migration execution and never runs automatically. The tool signs in with the owner password and requests a TOTP code if the session is not already `aal2`. Database and Storage RLS must confirm owner and `aal2` before inventory is available. The tool uses only the anon key and never prints credentials.
3. Review each recursively listed object. Choose **Keep public** only for an asset explicitly approved for publication; choose **Move to private originals** for an unapproved asset whose private copy should be retained; choose **Skip** if its purpose or value is unknown. No object is changed without a per-object choice.
4. Moving an asset first copies it to `originals` and rewrites matching unpublished setting references. The public copy is removed only after it is queued and checked against all currently published `site_settings` references. If it is still referenced by published content, the tool refuses the move; unpublish or replace that reference first. Failed deletion stays in the owner/AAL2 cleanup queue and can be retried from `/admin`.
5. To verify a fresh project needs no legacy migration, run the inventory tool and confirm it reports no objects; also confirm `public-media` is empty in Storage → Buckets. An empty inventory does not make `public-media` private: future published assets remain publicly retrievable by URL.

## 8) Preview route and launch checklist

The app also ships a `/preview` route that renders the public site with the unpublished draft. It is protected the same way as `/admin`: anonymous visitors and signed-in non-owners are shown an owner-required message and never receive draft content, because the underlying Supabase reads are restricted to the owner at `aal2`. `vercel.json` serves `/preview` with `X-Robots-Tag: noindex` and `Cache-Control: no-store`; keep that configuration.

Before launch:

1. Migrations applied in order; `app_owner` registered; TOTP enrolled and verified at `aal2`.
2. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CONTACT_FUNCTION_URL`, `VITE_SITE_ORIGIN` set for the deployment; real project URL present in `vercel.json` CSP (replace the placeholder origin you may find there).
3. Sign in at `/admin`, confirm **Overview** shows zero required-item misses, use **Preview draft**, then publish.
4. Confirm `/` and `/certificates` load for an anonymous browser session, and `/admin`/`/preview` show sign-in/owner-required messages when signed out.
