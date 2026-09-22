# PROJECT_STATUS.md — AI Career & Learning Advisor

_Last updated: Phases 1-11 of the 11-phase continuation list (Quiz UI through a11y baseline) drafted; README added. Still 100% unverified — see environment constraint._

## ⚠️ Environment constraint (read first)
This project is being built inside a chat sandbox with **no network egress**:
`npm install`, PostgreSQL, and Docker cannot run here (verified: `npm view react`
returns `403 Forbidden`, no `psql`/`docker` binaries present). All code below is
written by hand, reviewed for correctness, but **not yet executed or tested against
a real runtime**. "Implement → run → test → fix" is therefore currently only
"Implement → static review". The moment this repo is opened in an environment with
real network/DB access (e.g. Claude Code on your machine), run:
```
npm install && npm run prisma:migrate && npm run prisma:seed && npm test
```
and fix whatever the first real run surfaces — treat that as the actual Phase 21
(Testing) gate, not what's described below.

## ✅ Completed (backend — written, not yet runtime-verified)
- **Prisma schema** (`server/prisma/schema.prisma`) — full model set: User(with fullName)/Student/Parent,
  Subject/Question/QuizResult/SubjectLevel, Progress/Schedule, Recommendation, Career/CareerRoadmapStep/
  University + rec tables, StudentGoal/Skill/StudentSkill/StudySession/DailyCoach, Badge/Achievement/
  ConsistencyScore, AIConversation/AIMessage, ParentReport/ParentWeeklyDigest, Subscription, Notification.
- **Config/utils** — env.ts (zod-validated), prisma.ts (singleton), AppError, asyncHandler, jwt, password.
- **Middleware** — requireAuth, requireRole, validate (zod), global errorHandler.
- **AI provider abstraction** (`providers/ai/`) — `AIProvider` interface, `MockAIProvider`,
  `RuleBasedProvider` (real deterministic logic, not a stub), `OpenAIProvider` (JSON parse + zod
  schema validation on every output), `FallbackAIProvider` decorator/factory (auto-falls back to
  rule-based on any failure). Prompts versioned in `server/src/prompts/index.ts`.
- **Auth** (full vertical) — register/login/refresh/logout, transactional user+profile creation.
- **Quiz** (full vertical) — questions served without `correctIndex`; scoring, SubjectLevel upsert,
  and today's Progress row all happen in one Prisma `$transaction`; triggers gamification.
- **Recommendation (learning)** — AI → business validation (cap 7 items, clamp confidence) → DB.
- **Career/University** — `CareerService.assertEligible()` is the single gate: grade < 9 throws 403
  **before** the AI is even called; AI-hallucinated career codes not in our catalog are silently
  dropped, never persisted. This is the most safety-critical rule in the app — see tests below.
- **AI Chat** — full context (grade, interests, subject levels, goals, career interests, progress
  summary) passed to provider; conversation ownership scoped by `studentId` at the query level.
- **Gamification** — streak calculation, points formula, badge grant rules (FIRST_QUIZ,
  SEVEN_DAY_STREAK, TEN_QUIZZES) — idempotent via `hasAchievement` check.
- **Schedule** — AI-generated weekly plan persisted per ISO week (Monday-start).
- **Progress** — overview aggregation + `analyzeWithAI` (weekly-bucketed minutes, quiz scores, trends).
- **Parent** — `assertOwnership()` re-checked on every method (not just at login); dashboard summary;
  AI parent report generation (aggregate metrics only, never raw chat transcripts, per spec §23).
- **Notifications** — repository/service done; `NotificationProvider` abstraction with InApp (real,
  writes to DB) + Email/Telegram (stub providers, log-only, ready to implement later per spec §30).
- **Subscription** — FREE/PREMIUM via `PaymentProvider` abstraction; `MockPaymentProvider`
  (instant-success checkout since no real payment credentials exist).
- **app.ts / server.ts** — all routers wired, helmet + CORS + rate limiting (tighter limit on
  `/api/chat`), health check, graceful shutdown.
- **Seed script** (`prisma/seed.ts`) — idempotent (upsert-based); 8 subjects, 6 badges, 4 careers with
  roadmap steps, 3 universities, 5 quiz questions × subject × grade(7-11), demo accounts: 1 parent +
  5 students (grades 7/8/9/10/11) all linked to that parent, password `Demo12345!` for all.
- **Unit tests** (`server/tests/unit/`) — written, NOT yet run:
  - `careerService.test.ts` — grade 8 rejected (403, AI never called), grade 9+ allowed, AI-hallucinated
    career codes not persisted.
  - `parentService.test.ts` — ownership check blocks cross-parent access, allows legitimate access.
  - `quizService.test.ts` — client never receives `correctIndex`; score computed from real answer key
    regardless of what client claims.
- **Docker** — `server/Dockerfile`, root `docker-compose.yml` (postgres healthcheck-gated backend
  startup, frontend service). Not run (no Docker binary in this sandbox).

## ✅ Completed (frontend — written, not yet runtime-verified — see env constraint above)
- **Tooling** — `package.json`, `vite.config.ts` (manualChunks for vendor/charts — spec §27
  performance), `tailwind.config.js` (approved indigo/violet palette as `brand.*` + `brand-gradient`),
  `postcss.config.js`, `tsconfig.json`, `index.html`, `src/styles.css` (light/dark CSS vars +
  `.card`/`.btn-primary`/`.input-field`/`.skeleton` classes), `vite-env.d.ts`, `client/Dockerfile`.
- **API client** (`src/lib/api.ts`) — axios instance, auto access-token header, single-flight silent
  refresh on 401, typed request/response for every endpoint the backend actually exposes (no
  speculative calls — mirrors PROJECT_STATUS backend section exactly).
- **State** — `store/authStore.ts` (zustand, persisted to localStorage, `hydrate()` on app boot).
- **i18n** — `i18n/index.ts` + `locales/uz.json` (default) + `locales/ru.json`, keys for landing/auth/
  dashboard/sidebar so far; more keys needed as remaining pages are built.
- **UI primitives** (`components/ui/`) — Button (primary/secondary/ghost + loading state), Card,
  Input (with label/error/aria-describedby), Badge, Skeleton, EmptyState, ErrorState.
- **Layout components** — LanguageSwitcher, ThemeToggle (persists to localStorage + toggles `.dark`
  class per Tailwind `darkMode: "class"`), StudentSidebar (desktop, career item conditionally
  rendered based on `careerVisible` prop — **never hardcoded**, driven by
  `dashboard.careerModuleVisible` from the backend), MobileBottomNav (separate mobile UX per spec
  §13: Home/Today/Goals/AI/More, 44px+ touch targets), Topbar (streak/points/notification bell,
  live unread count via TanStack Query).
- **Landing page** — matches `design-references/landing-reference.jpg` structure: badge, hero
  headline, subtitle, dual CTA, feature grid (4 cards), social proof line, footer. Uses `t()` for
  every string (no hardcoded UI text per spec §24).
- **Auth pages** — Login (email/password → real `/api/auth/login`, error surfaced from API
  response, redirects by role). Register (role toggle Student/Parent; grade selector 4-11 shown
  only for Student role — **UI already respects the same grade-9 boundary as the backend**;
  optional parentEmail field to link to an existing parent account at signup).
- **StudentLayout** — sidebar + topbar + `<Outlet context={{ dashboard }}>` + mobile nav; fetches
  `/students/dashboard` once and shares it down via router context (avoids duplicate fetches).
- **Dashboard page** — built to the EXACT priority order mandated in spec §12 (Today → Learning
  Health → AI Insight → secondary): real greeting with DB-sourced `fullName` (never hardcoded
  "Dilshod" — spec §10 explicitly warned against this), Today card reads today's schedule entries
  (falls back to a friendly empty state prompting profile completion, per spec §28), Learning
  Health shows an aggregate score + per-subject bars, AI Insight shows top recommendation reasons
  with a "→ AI bilan muhokama qilish" CTA into the full chat page.
- **AI Chat page** (`pages/student/AIChat.tsx`) — full page, NOT a dashboard card (spec §11: "AI
  Chat ALOHIDA ASOSIY NAVIGATION ITEM"). Loads real history, optimistic user-message append,
  suggestion chips on empty state, auto-scroll, wired to real `/api/chat/*`.
- **Routing** (`routes/AppRoutes.tsx`, `ProtectedRoute.tsx`) — public routes (landing/login/
  register), STUDENT-protected group (dashboard, chat wired; quiz/schedule/progress/achievements/
  career/profile/settings routes intentionally NOT added yet — no frontend route exists for a
  backend endpoint that isn't ALSO wired, and no route was stubbed for pages not yet built, per the
  architecture doc's "don't create frontend functionality for APIs that don't exist" / inverse
  rule). PARENT-protected group scaffolded but empty — parent pages are next phase.
- **Migrations** — no `server/prisma/migrations/` folder yet; cannot run `prisma migrate dev` without
  a live Postgres connection. Schema is the source of truth; first real migration must be generated
  on a machine with DB access.
- **AI Memory (spec §15)** — student context is assembled fresh per-request in `ChatService` (grade,
  interests, subject levels, goals, career interests, progress summary) and passed to the provider,
  but there is no dedicated editable "memory" entity/endpoint yet (view/edit/delete memory by the
  user). Currently the closest equivalent is the Student profile fields themselves.
- **Skill Map** — `Skill`/`StudentSkill` models exist in schema; no service/routes built yet.
- **DailyCoach, ConsistencyScore, ParentWeeklyDigest** — modeled in schema, no service/routes yet.

## ✅ Completed this session (written, not yet runtime-verified)
- **Backend**: `GET /api/achievements` — was flagged missing last session; now has
  controller+route+client call, returns `{ achievements, points, streakDays }`.
- **Quiz UI** (`pages/student/Quiz.tsx`) — subject picker → question flow (client-side next/prev/
  progress bar, no client-side answer validation) → `quizApi.submit` → result screen (score, level,
  new badges, "Bu natijani AI bilan muhokama qilish" → `/chat`).
- **Schedule UI** (`pages/student/Schedule.tsx`) — week grid by day, optimistic status toggle
  (TODO ↔ COMPLETED) with rollback via refetch on failure, "Qayta yaratish" regenerate button, empty
  state per spec §28.
- **Progress UI** (`pages/student/Progress.tsx`) — recharts `LineChart` for daily minutes, per-subject
  bar rows, "Progressimni AI bilan tahlil qilish" button wired to `progressApi.analyze`.
- **Achievements UI** (`pages/student/Achievements.tsx`) — badge grid, points/streak pills.
- **Career module UI** (`Career.tsx`, `CareerRoadmap.tsx`, `Universities.tsx`) — **grade < 9 redirects
  to `/dashboard` in the page itself**, on top of (a) the sidebar already hiding the nav link and
  (b) the backend's `assertEligible` 403. Three independent layers now enforce the single most
  critical business rule in the spec.
- **Profile UI** (`Profile.tsx`) — tag-editor for interests/goals/careerInterests (careerInterests
  editor only rendered when `careerModuleVisible`), saves via `studentApi.updateProfile`.
- **Settings UI** (`Settings.tsx`) — language/theme controls (reusing existing components), logout
  (calls `/api/auth/logout` with the stored refresh token, clears local session regardless of
  network result).
- **Parent module UI** — `ParentLayout.tsx` (deliberately different chrome from student: plain
  top header, no sidebar, no streak/points pills, no gamification — per spec §22), 
  `ParentDashboard.tsx` (child switcher when >1 child, weekly-minutes/streak/grade stat cards,
  strengths/attentionAreas lists, on-demand AI report generation showing formatted summary +
  next steps — never raw AI chat, per spec §23).
- **Routing** — `AppRoutes.tsx` now wires every student page and the parent dashboard. No route was
  added for a backend endpoint that doesn't exist, and no backend endpoint was added without a
  frontend consumer (Notifications panel UI and Subscription/upgrade UI are the one exception —
  see Not Started below — their APIs exist but have no UI yet, which is allowed under the
  architecture doc's "infrastructure endpoint" carve-out only loosely; flagging as a gap, not
  claiming it's fine).
- **README.md** — full install/run/test/demo-account/AI-setup/payment-mock instructions per spec §35.
- **Integration test stub** (`tests/integration/authAndCareer.integration.test.ts`) — register →
  grade-8 career 403 / grade-10 career 200 / parent-ownership 403, using supertest against the real
  `app` export. Requires a live DATABASE_URL; **not executed in this sandbox** (no DB).

## ❌ Not started
- Deeper accessibility audit (screen-reader pass, full keyboard-nav walk-through, color contrast
  check on the brand-500 gradient against white text) — current state has aria-labels on icon-only
  buttons, aria-describedby on Input errors, aria-invalid, 44px+ touch targets on mobile nav, but
  no systematic audit has been done or could be done (would need a running browser).

## 🔍 Static quality audit (this session)

Ran instead of new features, per explicit request. Method: a global `typescript@6.0.3`
compiler happened to be available in this sandbox (not the project's own — no
`node_modules` exists here). Used it two ways:

**Statically verified (real signal, not guesswork):**
- **Backend**: generated precise ambient-module shims for every external package
  (express, zod, jsonwebtoken, bcryptjs, cors, helmet, express-rate-limit,
  @prisma/client) from actual `import` usage, then ran `tsc --noEmit --strict` against
  the real `server/src` source. This surfaced **one genuine bug**, confirmed by
  reading the source (not just trusting the compiler): `GamificationService`'s
  constructor default-instantiated `new GamificationRepository()` with **zero
  arguments**, but `GamificationRepository`'s constructor requires a `PrismaClient`.
  This would have thrown at runtime on first use (`this.db` undefined) —
  **fixed**: now `new GamificationRepository(prisma)`, and the redundant duplicate
  re-instantiation in the constructor body was removed. Grepped every other
  service's repository instantiation (14 repositories × their call sites) to confirm
  this was the only instance of the pattern — it was.
- Everything else the shimmed backend `tsc` run flagged (e.g. `res.status` "not
  callable", `req.body`/`req.auth`/`req.params` "does not exist") was manually
  traced to shim artifacts (Express's real `Request`/`Response` augmentations
  aren't present without `@types/express` installed) and confirmed NOT real bugs
  by reading the flagged source directly — e.g. `careerService.ts`'s `career.id`
  access was flagged but is correct real code once real Prisma types exist.
- **Frontend**: the shim technique broke down — this `tsc` version physically
  requires a `react/jsx-runtime` file on disk for the `"jsx": "react-jsx"` transform
  (an ambient module declaration isn't enough), which isn't reproducible without
  installing `react`. Abandoned the compiler for frontend and did **grep/manual
  cross-referencing** instead, which is what actually caught the real frontend
  issues below.
- **API surface**: extracted all 12 backend route files' method+path pairs and all
  ~30 calls in `client/src/lib/api.ts` programmatically and diffed them — **100%
  match**, no orphaned frontend calls, no backend-only dead endpoints (except
  Notifications/Subscription APIs which are intentionally UI-less so far, already
  flagged in "Not started").
- **i18n**: flattened both `uz.json`/`ru.json` and diffed against every `t("...")`
  call in the codebase — **0 missing keys either direction**, 53 keys each, fully
  parallel.
- **Env vars**: diffed every `env.X` reference in backend source against
  `server/.env.example` — all present. Found and **fixed a real gap**:
  `client/.env.example` didn't exist at all even though `VITE_API_URL` is read in
  `lib/api.ts` — created it.
- **Prisma schema ↔ service field names**: spot-checked the two most
  transaction-heavy models (`Progress`, `Schedule`) against every field accessed
  in `quizService.ts`, `scheduleService.ts`, `gamificationRepository.ts`,
  `parentService.ts` — all match.

**Fixed this session:**
1. `GamificationService` constructor arity bug (above) — the one bug that would
   have crashed at runtime.
2. `client/.env.example` was missing — created.
3. `Schedule.tsx` had a genuinely unused `refetch` (caught by the real `tsc`
   `noUnusedLocals` check, which mirrors the project's own `tsconfig.json`) —
   wired it into a proper `ErrorState` retry button instead of leaving it unused
   or deleting the capability.
4. `LanguageSwitcher.tsx` was hardcoded `bg-white` with no `dark:` variant —
   inconsistent with `ThemeToggle` right next to it; fixed to
   `bg-white dark:bg-[var(--bg-card)]`.
5. Two icon-only buttons had no `aria-label` (notification bell in `Topbar.tsx`,
   logout button in `ParentLayout.tsx`) — real accessibility gaps, fixed. Grepped
   every `<button>` in the codebase to confirm these were the only two icon-only
   buttons missing one (all others have visible text or already had a label).
6. Removed a redundant duplicate `react-router-dom` import in `ParentLayout.tsx`.

**Found, NOT fixed (flagging instead of risky rewrite, per instruction not to
rewrite working features unnecessarily):**
- **Architecture-consistency gap**: `QuizRepository.saveResult` and
  `QuizRepository.upsertSubjectLevel` are dead code — `QuizService.submitQuiz`
  bypasses the repository and calls `prisma.$transaction([...])` with inline
  Prisma calls directly, instead of going through the repository layer. This
  works correctly (the transaction is atomic and correct) but violates the
  architecture doc's "Service → Repository → Prisma" rule — the service reaches
  past the repository. Low risk as-is; refactoring it means restructuring how a
  multi-table transaction is expressed across a repository boundary, which I did
  not want to risk changing untested working logic for a style violation. Left
  as-is, documented here for the next session to decide.
- Same dead-code note applies to `GamificationRepository.upsertTodayProgress` —
  written, never called (`QuizService` does the day's Progress upsert inline
  instead).

**Unable to verify at runtime (unchanged constraint, re-confirmed this session):**
`npm view react` still returns `403 Forbidden`; no `psql`/`pg_isready`/`docker`
binaries exist in this sandbox. This means: no actual `npm install`, no Prisma
Client generation, no migrations, no seed run, no server boot, no browser
render, no visual/responsive/contrast check, no test execution (unit or
integration — both suites are written but have never run). Everything above was
verified by static analysis and manual source reading, not by running the
application. "Statically consistent" is not the same claim as "works" — the
first real `npm install && npm run prisma:migrate && npm run prisma:seed &&
npm test` in a real environment is still the actual first test this project
will have had.

## 🔧 Real build errors reported + fixed (this session)

The person ran `npm install && npm run build` for real (outside this sandbox) and
reported two TypeScript config errors. Fixed both, plus one more real bug found
while re-verifying the fix with the same shim-based `tsc` technique from the
static audit (this sandbox's global `typescript@6.0.3` — not the project's own
`node_modules`, which still can't be installed here — network still returns
403, re-confirmed unchanged).

1. **TS6059** — `server/prisma/seed.ts is outside rootDir 'src'`, yet
   `tsconfig.json`'s `include` listed both `"src"` and `"prisma/seed.ts"`.
   Root cause: `prisma:seed` was always run via `tsx prisma/seed.ts` directly
   (see `package.json`) — `seed.ts` was never meant to go through `tsc`'s
   `rootDir`-constrained build at all. **Fix**: removed `"prisma/seed.ts"` from
   `include` — now just `["src"]`. `npm run prisma:seed` is unaffected (tsx
   doesn't use `include`, only `compilerOptions`). Smallest correct fix; no
   architecture change, no seed functionality lost.
2. **TS5108** — `moduleResolution: "node"` is no longer a valid value on the
   installed (very new) TypeScript version; its explicit legacy name is now
   `"node10"`, which itself is deprecated-as-error unless acknowledged.
   **Fix**: `"moduleResolution": "node10"` + `"ignoreDeprecations": "6.0"`.
   This is the standard-library-recommended way to keep the legacy Node
   CommonJS resolution behavior (matches `"module": "commonjs"`, which is
   correct for this Express/Node backend — no `"type": "module"` in
   `package.json`) without silencing unrelated diagnostics or switching to
   `"bundler"`/`"node16"` resolution semantics, which would be a bigger,
   riskier change than asked for.
3. **New real bug found while re-verifying** (not one of the two reported, but
   would have been the *next* build error): `GamificationService
.evaluateAfterQuiz` declared `const granted: string[] = []` but pushed the
   result of `tryGrant()`, which returns `Promise<string | null>` — a real
   `strict`-mode type error (`TS2345`), not a shim artifact (confirmed by
   reading the code: `tryGrant` explicitly returns `null` when a badge is
   already earned). **Fix**: retyped to `(string | null)[]`; the existing
   `.filter((g): g is string => Boolean(g))` at the end already narrows it
   back to `string[]` for the return type, so behavior is unchanged — this was
   a type-annotation bug, not a logic bug (nulls were already being filtered
   out correctly at runtime, this only blocked `tsc`).

**Verification method** (same as the static audit): copied `server/src` +
`server/prisma` + the real (fixed) `server/tsconfig.json` into a scratch
directory, generated precise ambient-module shims for the 8 external packages
from actual `import` usage, ran the global `tsc -p tsconfig.json` against it.
Confirmed **zero** occurrences of TS5108/TS5107/TS6059, zero constructor-arity
errors, zero nullable-push errors afterward. Everything else that still prints
is the same class of shim-artifact noise identified and explained in the prior
audit (missing `@types/express`/`@types/node` locally in this sandbox — not
present in the real project's own `node_modules` either, since that's a
separate, real dependency that legitimately needs `npm install` to exist).

**What this does NOT prove**: I still cannot run the actual
`npm run build` command from `server/package.json` in this sandbox — no
network access to install `@prisma/client`, `express`, `zod`, etc. for real
(re-confirmed: `npm view react` → `403`). The verification above is "the
config is now internally consistent and these 3 specific errors are gone
against a faithful reconstruction," not "`npm run build` was executed and
passed." **The person's own re-run of `npm run build` in their real
environment is still the actual test.** If it now passes, the next step per
their instructions is to continue to "the next test" — awaiting that result
before claiming anything further.


- None currently known. One real bug (GamificationService constructor arity —
  see audit section above) was found by static analysis and fixed this session.
  No bugs have been found by execution, because nothing has executed yet.

## 🔧 Follow-up build error fixed (this session)

The person's real environment's TypeScript went further than the version tested
in the prior fix: `"moduleResolution": "node10"` is not just deprecated-as-error
there, it's **fully removed** (`TS5108: Option 'moduleResolution=node10' has been
removed`). This confirms their real TS version is newer/stricter than initially
assumed.

**Fix**: switched from `"module": "commonjs"` + `"moduleResolution": "node10"` +
`"ignoreDeprecations": "6.0"` to `"module": "node16"` + `"moduleResolution":
"node16"` (removed `ignoreDeprecations`, no longer needed). Rationale:
- `moduleResolution: "node16"` requires `module` to also be `"node16"` or
  `"nodenext"` (TS enforces this pairing) — using `"commonjs"` for `module`
  while removing `node10` resolution was not an option.
- `server/package.json` already declares `"type": "commonjs"` explicitly, so
  under `"module": "node16"`, TypeScript still emits standard CommonJS
  (`require`/`module.exports`) for every file — **the actual JS output shape is
  unchanged**, this is purely a resolution-algorithm/config change, not an
  architecture or runtime-behavior change. `npm run start` (`node dist/server.js`)
  and `npm run dev` (`tsx watch src/server.ts`) both remain correct as-is.

**Re-verified** with the same shim-based `tsc` technique against the real
`server/src` + real `tsconfig.json` (global `typescript@6.0.3` in this sandbox,
project's own `node_modules` still uninstallable here — network unchanged,
re-confirmed 403): **zero** `TS5108`/`TS5107`/`TS6059`/module-mismatch errors.
Specifically also checked for the Node16-resolution-specific failure mode
(relative imports requiring explicit `.js` extensions under ESM-style
resolution) — **none found**, confirming `"type": "commonjs"` correctly keeps
CommonJS-style extension-less relative imports valid throughout `src/`. The
three previously-fixed bugs (constructor arity, TS6059/TS5108-v1, nullable
push) remain clean — no regressions. Remaining noise in the shim-based run is
the same already-explained class (Request/Response/NextFunction typed as
values instead of types in the hand-written shim, since real `@types/express`
isn't installed in this sandbox) — not real bugs, same as previously documented.

**Still true**: I cannot execute the project's actual `npm run build` here
(no network to install `@prisma/client`, `express`, `zod`, `@types/*`, etc. —
this sandbox constraint is unchanged and was re-checked, not assumed). The
person's own re-run of `npm run build` in their real environment remains the
authoritative test. If a *different* error appears on their next run, it should
be reported the same way — exact error code/message — so it can be fixed and
re-verified the same way, rather than guessed at.

## 🔎 Dependency-resolution diagnosis (129 TS errors) — this session

The person's real build now reports 129 TS errors. Per their instruction, did
NOT touch application code — inspected configuration/environment first.

**Inspected**: `server/package.json`, root `package.json`, `server/node_modules`,
root `node_modules`, `server/prisma/schema.prisma`, `server/tsconfig.json`,
lockfiles, `.npmrc`.

**Finding: no configuration bug.** `server/package.json` correctly lists every
required package (`express`, `cors`, `helmet`, `express-rate-limit`, `zod`,
`jsonwebtoken`, `bcryptjs`, `@prisma/client` in `dependencies`; `@types/node`,
`@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/bcryptjs`,
`typescript`, `prisma`, `tsx` in `devDependencies`) with sane version ranges.
Root `package.json` has no `workspaces` field — it's two independent npm
projects linked via `npm --prefix`, not a monorepo hoisting setup, so there's
no hoisting-conflict class of bug either. `schema.prisma`'s `generator
client`/`datasource db` blocks are correctly formed.

**Root cause**: neither `server/node_modules` nor root `node_modules` exist —
confirmed by direct `ls` (both "No such file or directory"). No lockfile
anywhere in the repo. `npm install` has evidently never successfully completed
for this project, in any environment it's been in so far — 129 errors is
exactly what `tsc --strict` produces when every third-party import
(`express`, `zod`, `@prisma/client`, ...) has nothing on disk to resolve to,
which matches this session's own shim-based static-audit findings almost
error-for-error.

**Attempted the actual fix in this sandbox** (not just diagnosed): ran
`npm install` for real inside `server/`. Result: `npm error code E403 — 403
Forbidden - GET https://registry.npmjs.org/@prisma%2fclient`. This sandbox's
network policy blocks `registry.npmjs.org` outright (`npm config get registry`
confirms the registry URL itself is correctly `https://registry.npmjs.org/` —
this is a network/firewall block, not an npm misconfiguration). This has been
true and re-confirmed every session so far.

**What this means for the person's real environment**: since the 129-error
report came from *their* real build, not this sandbox, the same
"dependencies were never installed" root cause applies there — but I cannot
see or run anything in their environment. Told them plainly: re-run
`npm --prefix server install` (or `cd server && npm install`) in their real
environment; if it also 403s / fails there, that is a registry/proxy/firewall
issue specific to that machine (corporate proxy, private registry
requirement, VPN, etc.), not a bug in this repo's config — nothing inspected
here points to a code-level cause. Asked them to report whatever the *next*
real error is (post-install) so it can be fixed for real, rather than guessed
at from this sandbox.

**Not done yet, waiting on their result**: `npx prisma generate`,
`npm --prefix server run build`, and the "fix real code errors" loop — all
blocked on dependencies actually installing successfully somewhere with real
network access, which this sandbox still doesn't have.

## 🔧 Two real code-level TS errors fixed — build down to 0 known errors (this session)

Great signal: dependencies installed successfully in the person's real
environment, and `npm run build` went from 129 errors to exactly **3 errors in
2 files** — confirming the prior diagnosis (missing `node_modules`) was the
actual root cause, and everything else in the codebase already compiles clean
against real types. Fixed both real files:

1. **`server/src/repositories/userRepository.ts`** — `createUser()`'s
   parameter type was `{ email, passwordHash, role }`, missing `fullName`.
   Prisma's generated `UserCreateInput` requires `fullName` (schema: `fullName
   String`, non-optional, no default — added in an earlier session for the
   dashboard greeting). **Fix**: added `fullName: string` to the parameter
   type. Note: grepped the codebase and confirmed this method is currently
   dead code (`AuthService.register` does the insert via a direct `tx.user.create`
   transaction, not through this repository — the same architecture-consistency
   gap flagged in the static-audit session). Left that gap as-is again (not
   asked to fix it here, and it's not what's breaking the build) — just made
   the method's own type signature correct.
2. **`server/src/utils/jwt.ts`** — `jwt.sign(..., { expiresIn: env.JWT_ACCESS_TTL })`
   failed overload resolution because `@types/jsonwebtoken`'s `SignOptions.expiresIn`
   is typed as `number | ms.StringValue` (a template-literal union from the `ms`
   package), not a plain `string` — and `env.JWT_ACCESS_TTL`/`JWT_REFRESH_TTL`
   are zod-validated as plain `string`. **Fix**: imported `SignOptions` from
   `jsonwebtoken` and cast with `as SignOptions["expiresIn"]` when building the
   options object — a precise narrowing to the library's own exact expected
   type (not `any`, not a tsconfig change, not a strictness downgrade). Safe
   because the env schema's default/documented format (`"15m"`, `"30d"` — see
   `.env.example`) is already a valid `ms`-style string; the cast just tells TS
   what zod already guarantees at the env-validation boundary.

**Verification**: re-ran the same shim-based `tsc` technique (global
`typescript@6.0.3` in this sandbox, real project `node_modules` still
uninstallable here — network re-confirmed unchanged) against the full
`server/src` with both fixes applied. Both flagged files now produce **zero**
errors. Caveat: the shim types `jsonwebtoken` as `any`, so this local check
can't truly validate the `SignOptions["expiresIn"]` cast against the *real*
`@types/jsonwebtoken` shape the way it validated the Prisma-related fix (which
used precise, hand-derived shims) — the fix follows the standard, well-known
correct pattern for this exact common `@types/jsonwebtoken` strict-mode error,
but the person's real `npm run build` is the actual confirmation needed here.
All previously-fixed bugs (constructor arity, TS6059/TS5108 config, nullable
push) remain clean — no regressions introduced.

**Tests**: NOT run. `npm --prefix server test` requires `vitest`/`supertest`,
which aren't installed in this sandbox either (same network constraint).
Once the person confirms `npm run build` passes for real, running
`npm --prefix server test` in their environment is the next actual step —
I cannot run it here.

## Known bugs
- None currently known to be unfixed. Three real bugs found by static analysis
  across the last two sessions, all fixed: (1) `GamificationService` constructor
  arity, (2) two TS config errors (TS6059 rootDir, TS5108 moduleResolution), (3)
  `GamificationService.evaluateAfterQuiz`'s nullable-push type error. See the
  two sections above for full detail. No bugs have been found by actually
  *running* the app yet — only by static analysis — because it still hasn't run
  end-to-end in this sandbox (see environment constraint).

## Failing tests
- Unknown — tests have never been run (no npm/network in this sandbox). Both
  `server/tests/unit/*.test.ts` (3 files) and
  `server/tests/integration/authAndCareer.integration.test.ts` are written but
  unexecuted.

## Important architecture decisions
- **Grade gate lives in the service layer, not just the controller/route**, and runs *before* the AI
  call — so even a compromised or hallucinating AI provider cannot leak career/university data to a
  grade < 9 student. This was treated as the single highest-priority business rule in the spec.
- **AI output never reaches the DB unvalidated**: OpenAIProvider does JSON.parse → zod schema →
  (in the calling service) business-rule clamping, before any `prisma.create`/`upsert`.
- **Fallback is structural, not a try/catch sprinkled everywhere**: `FallbackAIProvider` wraps any
  primary provider once, in `providers/ai/index.ts`, so every service just calls `getAIProvider()`
  and automatically gets fallback behavior for free.
- **Ownership checks happen in the service layer on every call** (`ParentService.assertOwnership`,
  `ScheduleRepository.updateStatus` filtering by `studentId`), not only in middleware — defense in
  depth against IDOR.
- **Quiz correctness is server-authoritative**: `Question.correctIndex` is never selected into any
  DTO sent to the client; scoring recomputes from the DB answer key regardless of client input.
- Root `package.json` uses `concurrently` to run client+server together in dev; this itself needs
  `npm install` to work, which hasn't been verified here.

## Next implementation phase
**Frontend Phase 8-9 (Quiz UI + Career/University UI)**, then Phase 10-16 in order:
1. `pages/student/Quiz.tsx` + a subject-picker entry point — call `quizApi.start`, render question/
   options/next/prev/progress bar (client-side navigation only, no answer validation client-side),
   `quizApi.submit` on finish, show score/level result screen with an "AI bilan muhokama qilish"
   button that navigates to `/chat` (optionally pre-filling a message — chat input doesn't support
   pre-fill yet, small follow-up).
2. `pages/student/Schedule.tsx` — weekly calendar view consuming `scheduleApi.getCurrentWeek`, a
   "Qayta yaratish" (regenerate) button, status toggle (TODO/IN_PROGRESS/COMPLETED) per item.
3. `pages/student/Progress.tsx` — recharts line/bar for `progressApi.getOverview`, an "AI bilan
   tahlil qilish" button calling `progressApi.analyze`.
4. `pages/student/Achievements.tsx` — grid of badges from `gamificationService.listAchievements`
   (needs a small new GET route + controller — not yet exposed; currently only baked into dashboard
   summary as a count, not a list).
5. `pages/student/Career.tsx` + `CareerRoadmap.tsx` + `Universities.tsx` — ONLY rendered/routed when
   `dashboard.careerModuleVisible` is true; route itself should still redirect grade<9 students
   away (defense in depth matching the backend's `assertEligible`).
6. `pages/student/Profile.tsx` + `Settings.tsx` (interests/goals/careerInterests editor, language/
   theme settings — already have the components, just need the page).
7. Parent side: `pages/parent/ParentLayout.tsx` (visually distinct — less gamification per spec
   §22), `ParentDashboard.tsx` (child list → per-child summary), `ParentReport.tsx` (formatted
   summary/strengths/attentionAreas/nextSteps, never raw chat).
8. Add missing small backend route: `GET /api/students/achievements` (service method
   `gamification.listAchievements` already exists, just needs a controller+route — 5 min task).
9. README.md — after the above, since accurate "how to run" instructions depend on final routes.

Continue directly from step 1 above in the next turn — do not re-do backend OR the frontend
pieces described as ✅ Completed unless a runtime test (once available) reveals a bug.

## Current task / exact next step
Static audit is done for this pass (see "🔍 Static quality audit" section above). The
single highest-value next action, in order:
1. **Run it for real** — this is the actual bottleneck, not more static review:
   `npm install && npm --prefix server run prisma:migrate && npm --prefix server run prisma:seed
   && npm test`, in an environment with network + PostgreSQL. Fix whatever that surfaces —
   there will almost certainly be real issues static analysis cannot catch (Prisma
   client type generation mismatches, actual runtime null-handling, React rendering
   errors, CSS/Tailwind class typos that don't affect TS at all).
2. Only after that: Notifications panel UI, Subscription/upgrade UI (backend done,
   no frontend yet — see "Not started" above).
3. Then: AI Memory UI, Skill Map UI (schema exists, zero service/route/UI).
4. Optionally revisit the QuizRepository dead-code/architecture-consistency gap noted
   in the audit, once real tests exist to protect against regressions while refactoring it.
