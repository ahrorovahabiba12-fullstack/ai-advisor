# PROJECT_STATUS.md — AI Career & Learning Advisor

_Last updated: 2026-10-08. Reflects the actual, runtime-verified state of the
app — built, run, and tested against a real PostgreSQL database and a real
browser, repeatedly. The project is live: `npm install && npm run dev` boots
both client (5173) and server (4000), and `npm test` runs a real suite
against `ai_advisor_test`._

## Status at a glance

- **Backend**: all verticals below are implemented, migrated, and covered by
  real-DB tests (`server/tests/unit/*`, `server/tests/integration/*`).
- **Frontend**: every student/parent/admin page listed below exists, is
  routed, and has been exercised in a real browser (login → feature → real
  API response → rendered UI).
- **Tests**: `npm --prefix server test` → **172 passing**, 0 failing. All
  real-DB (Postgres), no repository-layer mocking; only genuinely external
  boundaries (AI provider, payment provider) are spied.
- **Git**: single clean commit history on `origin/ai-advisor` (GitHub,
  `ahrorovahabiba12-fullstack/ai-advisor`). No secrets in history or working
  tree — `.gitignore` covers `.env`/`.env.*`, `server/.env.example` is the
  template. `node_modules`/`dist` are no longer tracked.

## Completed features

**Auth** — register/login/refresh/logout. JWT access+refresh tokens live in
**httpOnly cookies** (not localStorage) — closes XSS token-theft exposure;
refresh tokens are hashed before storage and rotate on every use; a
`BLOCKED` user is rejected on both login and refresh. Dedicated rate limit
on `/auth/login` and `/auth/register` (10/15min/IP) on top of the global
limiter. Registration grade range is **4–11** (`Register.tsx`'s own select,
matches `MIN_CAREER_GRADE` downstream).

**Quiz** — 8 subjects × grades **4–11**, all with real, grade-appropriate
questions (not placeholders) in Uzbek + Russian. `correctIndex` never sent
to the client; scoring is always server-recomputed from the DB answer key.
`submitQuiz`/`startQuiz` reject a request whose `grade` doesn't match the
student's own profile grade, and `submitQuiz` rejects answers whose
questions don't genuinely belong to the claimed `subjectId`/`grade` —
closes a request-tampering path into `QuizResult`/`SubjectLevel`.
Adaptive question selection weights a student's own recent wrong/right
history per question.

**Schedule** — AI-generated weekly plan, **Monday–Saturday only** (no
Sunday). Both `title` and `titleRu` are generated together and stored side
by side, so a language switch never needs regeneration. "Qayta yaratish"
(regenerate) **only replaces TODO items** — IN_PROGRESS/COMPLETED items and
their StudySession history are preserved — and now asks for confirmation
first. A TODO/IN_PROGRESS item from an earlier day this week is
auto-marked **SKIPPED** the next time the student opens the page (closes a
real "stuck forever in Davom etmoqda" bug). The Play button only appears on
**today's** card. Planned `minutes` are realistic for how a 5-question quiz
actually completes a block (10–15 min primary, 5 min secondary), not an
inflated full-hour estimate.

**Career/University** — gated at `grade >= 9` (`MIN_CAREER_GRADE`), enforced
independently in the sidebar nav, the page itself, and the service layer
(`assertEligible`, before the AI is even called). Career recommendations
regenerate every page load and **drop any recommendation the AI no longer
returns** — a stale/mismatched-language entry can no longer linger
alongside fresh ones.

**AI Chat** — full student context passed to the provider; conversation
scoped by `studentId`.

**Progress page** — consistency score, study-stats card (completion rate,
actual-vs-planned rate, session count, per-subject breakdown), weekly
activity chart, per-subject levels, on-demand AI analysis. The consistency
score **recomputes on every read** (was cached once/day and went stale
within the same day) and upserts one row per day (`@@unique([studentId,
periodEnd])` — also closes a real race where two parallel requests on page
load each inserted their own row). `sessionCount` now agrees with the
sibling completed-only stats on the same card.

**Gamification** — points, streak, badges (FIRST_QUIZ, SEVEN_DAY_STREAK,
TEN_QUIZZES), idempotent grants.

**Parent module** — `ParentLayout`/`ParentDashboard`/`Subscription` pages
exist and are routed. `ParentService.assertOwnership` re-checked on every
method — a parent can never read another family's child via ID.

**Notifications** — `NotificationPanel` UI exists and is wired to the real
unread-count/list/mark-read endpoints.

**Subscription** — FREE/PREMIUM via `PaymentProvider` abstraction;
`MockPaymentProvider` only (instant-success, no real credential). UI exists
(`pages/parent/Subscription.tsx`).

**Admin** — `AdminDashboard`/`AdminUsers`, stats, user status management.

**i18n** — uz (default)/ru, parallel key sets, no hardcoded UI strings.

**Branding** — logo mark is a growth-trend icon (`components/icons/LogoIcon.tsx`),
used consistently across sidebar/auth/chat/landing/parent header.

## Architecture decisions (still true, worth preserving)

- **Grade gate lives in the service layer**, before any AI call — a
  compromised/hallucinating AI provider can't leak career data to grade<9.
- **AI output never reaches the DB unvalidated**: JSON.parse → zod schema →
  business-rule clamping, before any `prisma.create`/`upsert`.
- **Fallback is structural**: `FallbackAIProvider` wraps the primary once in
  `providers/ai/index.ts` — every service gets fallback behavior for free.
  In the current deployed `.env`, the configured OpenAI key is invalid, so
  `RuleBasedProvider` (a real deterministic implementation, not a stub) is
  what's actually serving every AI-shaped feature right now — the product
  degrades gracefully rather than breaking.
- **Ownership checks happen in the service layer**, not only middleware
  (`ParentService.assertOwnership`, student-scoped repository queries).
- **Quiz correctness is server-authoritative** — see Quiz section above.
- **Bilingual content is generated once and stored side by side**
  (`title`/`titleRu`, `reasoning` regenerated fresh per request) rather than
  translated on read — the pattern to follow for any new AI-generated,
  persisted, user-facing text.

## Known gaps (real, deferred — not urgent)

- `ScheduleService.markStatus` has a read-then-write race (two concurrent
  requests could both see the pre-update status and double-credit
  Progress). Currently **no frontend code calls this endpoint** (status
  changes happen automatically via quiz completion), so it's a real gap in
  an otherwise-unused code path, not an active bug. Fix: wrap the read +
  status update + Progress credit in a transaction, or use the `updateMany`
  result count to detect a lost race.
- `SubscriptionService.confirmUpgrade` doesn't verify that `reference`
  actually belongs to a checkout this parent issued — harmless today since
  `MockPaymentProvider.confirmPayment` always returns `true` regardless of
  input, but must be fixed when a real payment provider is wired in.
- `client/Dockerfile` runs the Vite **dev** server (`npm run dev --host`),
  fine for local/demo use via `docker compose up`, not production-ready
  (needs a build + static-serve stage).
- **AI Memory UI, Skill Map UI, ParentWeeklyDigest** — schema models exist
  (`StudentGoal`/`Skill`/`StudentSkill`, `ParentWeeklyDigest`), no
  service/routes/UI built yet.
- `QuizRepository.saveResult`/`upsertSubjectLevel` and
  `GamificationRepository.upsertTodayProgress` are dead code —
  `QuizService.submitQuiz` does its own inline `prisma.$transaction`
  instead of going through the repository layer for that multi-table
  write. Works correctly as-is; a style/architecture-consistency gap, not a
  bug. Low priority to refactor.

## Demo accounts

| Rol | Email | Parol |
|---|---|---|
| Admin | admin@demo.uz | Demo12345! |
| Ota-ona | parent@demo.uz | Demo12345! |
| O'quvchi (7-sinf) | student7@demo.uz | Demo12345! |
| O'quvchi (8-sinf) | student8@demo.uz | Demo12345! |
| O'quvchi (9-sinf) | student9@demo.uz | Demo12345! |
| O'quvchi (10-sinf) | student10@demo.uz | Demo12345! |
| O'quvchi (11-sinf) | student11@demo.uz | Demo12345! |

All students linked to `parent@demo.uz`. No seeded demo account for grades
4–6 specifically, though real quiz content exists for them — register a new
student (grade selector offers 4–11) to see that path.

## Next steps (if resuming feature work)

In rough priority order, picking up from the "Known gaps" above:
1. `markStatus` race condition fix (only if/when a UI path starts calling it).
2. Mock payment reference-ownership check (only needed before a real
   payment provider is wired in).
3. Production Dockerfile for the client (build + static serve).
4. AI Memory / Skill Map UI, if those features are still wanted.
