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

After creating and confirming the owner account in Authentication → Users and applying `001_core_schema.sql`, register that Auth user as the owner in the SQL editor. Replace the placeholder with the exact account email:

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
- Make `originals` private and restrict it to owner + `aal2` sessions.
- Make `public-media` public only for sanitized certificate copies and published resume assets.
- Never allow SVG or HTML uploads.
- Use signed URLs for private originals with a short expiry (about 60 seconds).

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

This repository ships the migration order as files under `supabase/migrations/`, and the edge function lives in `supabase/functions/contact/`.

## 7) Portfolio editor and public media

The private editor is available at `/admin`. After signing in and completing TOTP verification, it lets the owner edit the profile, skills, certificates, eligibility, experience, education, projects, and visual settings. Use **Save draft** to keep changes private; **Publish to recruiters** makes the saved portfolio content public.

The photo, project screenshots, certificate documents, resume PDF, and optional WOFF2 font are uploaded to the `public-media` bucket and are publicly retrievable by URL. Only upload assets intended for public display. The client enforces 2 MB for each image/font and 10 MB for a PDF; the bucket enforces a 10 MB maximum. Each project must have at least two screenshots before publishing. For the editor to work, apply `004_portfolio_media.sql` after migrations `001`–`003`, create/register the owner account, and configure the public Supabase URL and key in the frontend environment.
