# Parléo architecture and implemented features

## System overview

Parléo is a statically exported Next.js client application backed by Supabase. Next.js renders the interface; Supabase supplies authentication, PostgreSQL persistence, Row Level Security (RLS), and realtime database events. Browser code uses only the project URL and publishable key. Authorization is enforced in PostgreSQL, never by trusting hidden UI controls.

The interface is translated into French, English, Spanish, and Arabic. Arabic sets the document to right-to-left, while French exam prompts retain `lang="fr"` and left-to-right reading so assistive technology pronounces them correctly.

## User experiences

### Public and student areas

Visitors land on a public exam-selection page instead of a teacher workspace. They may explore the published catalog but must authenticate before saving. Email/password authentication supports signup, confirmation, sign-in, password recovery, and local sign-out.

Authenticated students receive:

- Separate TCF and TEF oral catalogs, task descriptions, and official timings.
- Timed practice with preparation/speaking phases, drafts, reflection notes, and four self-assessment scores.
- Favorites and progress history.
- Reading, listening, and writing exercises with one synchronized result per activity.
- Goals, weekly activity totals, streaks, seven-day activity, and per-skill averages.
- Optional browser reminders. These run while Parléo is open and require browser notification permission.
- CSV progress export with spreadsheet-formula injection protection.

### Audio coaching

The oral practice dialog uses `MediaRecorder` for microphone capture and browser `SpeechRecognition` when supported. The student can replay the resulting in-memory audio Blob. Parléo derives a transcript, words per minute, recognition confidence, and French hesitation count. These are practice indicators—not official scoring.

Audio bytes are not uploaded. Only derived feedback is stored inside the session state. Object URLs and media tracks are released on clear/unmount to avoid memory and microphone leaks.

### Teacher and administrator workflow

Staff membership is stored in `staff_roles`, outside the student-editable profile. Teachers can create private drafts and submit them for review. Administrators can approve/publish a submission or reject it with a moderation note. The public catalog queries only `published = true` topics.

The workflow states are:

1. `draft` — editable by its teacher owner.
2. `submitted` — waiting for administrator review.
3. `approved` — published to students.
4. `rejected` — returned to its teacher for changes.

UI visibility is convenient feedback, not the security boundary. RLS policies enforce ownership and role permissions for direct API requests as well.

## Data and synchronization

`lib/use-platform.js` is the central student data layer. It loads the published catalog and, for authenticated users, their profile, sessions, favorites, skill attempts, goals, and protected staff role.

Supabase Realtime watches sessions, favorites, profiles, skill attempts, goals, and staff content. A relevant event triggers a complete account refresh. Window focus and visibility refreshes remain as a fallback for interrupted realtime connections.

Each request receives a generation ticket. If the account changes while a request is in flight, its stale response is discarded. Local state is also cleared immediately on account changes so one student's records cannot flash inside another student's session.

Session records use optimistic concurrency:

- A new session starts at version 1.
- The database trigger increments the version on every update.
- The client update includes `id`, `user_id`, and the version it originally loaded.
- If another device already saved a newer version, the stale update matches zero rows and fails instead of overwriting progress.

## Database tables

- `profiles`: display name, interface locale, and preferred exam.
- `topics`: published seed content and staff-owned moderated drafts.
- `sessions`: oral drafts/completions, scores, notes, timer state, and derived audio feedback.
- `favorites`: student/topic relationships.
- `skill_attempts`: reading, listening, and writing responses and scores.
- `student_goals`: weekly target and reminder preferences.
- `staff_roles`: protected teacher/admin membership.

RLS keeps all student records owner-only. Anonymous visitors can read only published topics. Direct access to `staff_roles` is revoked; narrowly scoped security-definer functions return the current user's role or a boolean staff check.

## Content and exam separation

`lib/exams.mjs` is the timing and format source of truth. Every topic carries a format such as `tcf-2` or `tef-b`; catalog filtering resolves its exam through that table. This prevents a TEF card from entering a TCF filter merely because its text looks similar.

`lib/catalog.mjs` contains deterministic oral seed content. `lib/skills.mjs` contains the introductory complementary-skill activities. Practice prompts remain in French even when navigation uses another language.

## Accessibility

- Semantic buttons, labels, fieldsets, status/error regions, tabs, and dialogs are used throughout.
- Dialog focus is trapped, Escape closes the dialog, and focus returns to the prior control.
- A skip link bypasses navigation.
- Arabic layout is right-to-left while French content declares its own language/direction.
- Long session dialogs scroll internally at short viewport heights.
- Automated Axe WCAG checks and keyboard navigation tests live in `tests/accessibility.spec.mjs`.
- Manual VoiceOver and NVDA release checks are documented in `docs/accessibility-checklist.md` because automated rules cannot reproduce real screen-reader interaction quality.

## Automated verification

- `tests/platform.test.mjs` checks exam separation, progress calculations, translation completeness, and safe CSV encoding.
- `tests/account-sync.spec.mjs` covers signup confirmation and a realtime draft appearing in a second browser context. It requires dedicated environment credentials and skips without them.
- `tests/accessibility.spec.mjs` runs Axe and a keyboard-only account-dialog flow.
- `pnpm build` performs the production compilation, static generation, lint, and type validation used before delivery.

## Important operational constraints

- Notification reminders run only while the application is open; background push would require a service worker and push-delivery service.
- Speech recognition and voice availability differ by browser and operating system.
- Audio recordings are deliberately session-local. Secure cross-device recording storage would require a private Supabase Storage bucket and retention policy.
- Progress indicators and speech metrics are educational feedback, not official TCF or TEF scores.
