# Parléo — TCF & TEF practice

Parléo is a multilingual Next.js student workspace for French oral-exam practice. The interface is available in French, English, Spanish, and Arabic (RTL); practice prompts remain in French, as they are on the exams.

## What is implemented

- A public landing page instead of opening in the teacher workspace.
- Clearly separated TCF and TEF catalogs, instructions, labels, and timers.
- Email/password student accounts with Supabase Auth.
- Cloud-synced practice sessions, complementary-skill results, favorites, and profile preferences.
- Progress summaries that follow the signed-in student across browsers and devices.
- Row Level Security (RLS), so each student can read and modify only their own private records.
- Optimistic version checks for practice-session updates, preventing an older device from silently overwriting a newer save.
- Realtime Supabase updates across signed-in devices, plus refresh on focus and visibility as a fallback.
- In-session audio recording and playback with browser speech-recognition indicators for pace, clarity, and hesitations.
- Introductory reading, listening, and writing activities for TCF and TEF preparation.
- Responsive layouts and Arabic right-to-left rendering.

## Local setup

Requirements: Node.js 20+ and pnpm.

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Set these values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Open <http://localhost:3000>. Never place a Supabase service-role key in this application.

## Supabase setup

For a new project, run these files in the Supabase SQL editor in this order:

1. `supabase/migrations/202611250001_student_platform.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/202611250003_student_skills_realtime.sql`
4. `supabase/migrations/202611250004_staff_goals.sql`

The base migration includes the new-user profile trigger. For a project that received the original base migration before that trigger was added, run `supabase/migrations/202611250002_profile_signup_trigger.sql` once instead.

In Supabase Authentication URL Configuration, add the local redirect URL `http://localhost:3000/**`. Add the production origin before deployment. Email confirmation behavior is controlled by the project's Auth settings.

## Verification

```sh
node --test tests/platform.test.mjs
pnpm build
pnpm test:a11y
pnpm test:e2e
```

The account browser tests require dedicated `E2E_STUDENT_EMAIL` and `E2E_STUDENT_PASSWORD` credentials. Signup coverage additionally requires `E2E_SIGNUP_EMAIL` (optionally containing `{timestamp}`). Staff access is deliberately not self-service: assign a reviewed account through `staff_roles` using the bootstrap example at the end of migration `202611250004_staff_goals.sql`.

The automated tests validate exam separation, catalog coverage, progress calculations, translation completeness, and safe CSV export. The live Supabase project was also checked with two transaction-only test users: profile creation succeeded, cross-user reads and updates were denied, favorites saved, a current-device update incremented the session version, and a stale-device update was rejected. The transaction was rolled back, so no test accounts or records were retained.

## Testing cross-device sync

1. Start the app and create a student account. If email confirmation is enabled, confirm the email, then sign in.
2. Choose TCF or TEF, open a matching subject, complete a practice session, and save it.
3. In a private window or a second browser/device, open the same app URL and sign in with the same account.
4. Confirm the saved session and progress summary appear. Save another session there.
5. Return to the first browser and focus the window, switch back to its tab, or use Refresh. Confirm the newer data appears.
6. Sign in with a different account and confirm the first student's sessions, favorites, profile, and personal topics are not visible.

Sync is cloud-backed and subscribed to realtime changes. Focus/visibility and manual refresh remain as fallbacks, while version checks protect against silent stale overwrites.

## Current scope

The oral catalog and introductory reading, listening, and writing modules are learning aids rather than official exam simulations or scores. Audio stays in the current browser session; derived speech indicators are stored with an oral draft or result. Browser speech-recognition support varies. Future additions could include secure audio storage, richer curriculum content, teacher/admin content workflows, streaks and goals, and accessibility audits with assistive technologies.
