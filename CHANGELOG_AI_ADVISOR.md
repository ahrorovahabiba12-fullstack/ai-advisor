# AI Advisor Change Log

## v2.6 — PHASE 1 AUDIT (pre-implementation)

### 1. Nima allaqachon ishlayapti
- Schedule: TODO → IN_PROGRESS → COMPLETED, `scheduleService.markStatus()` orqali (v2.5).
- StudySession: `IN_PROGRESS`ga o'tganda `start()`, `COMPLETED`ga o'tganda `complete()` (real `startedAt`/`completedAt`/haqiqiy `minutes`), duplicate-active-session himoyasi bor (v2.5).
- Progress: `GamificationRepository.upsertTodayProgress()` — faqat Schedule item'ning **rejalashtirilgan** `minutes`idan kredit/debit qiladi (StudySession'ning real vaqtiga bog'liq emas — ataylab shunday, v2.5da qaror qilingan).
- Consistency Score: `ConsistencyService` — oxirgi 30 kunlik `Progress.studyMinutes > 0` kunlarini hisoblaydi, kunlik keshlanadi.
- Gamification/points: `GamificationService.pointsTotal()` — **live COUNT so'rovi** (`quizResult.count()*10 + schedule.count(status=COMPLETED)*5`), incremental counter EMAS. Bu MUHIM topilma: task bajarilganda/bekor qilinganda ball avtomatik to'g'ri hisoblanadi, chunki har safar qayta sanaladi — **alohida "reward berish" chaqiruvi shart emas, ikki marta hisoblanish xavfi yo'q**.
- Skill Map: `StudentSkill` (currentLevel/targetLevel/evidence) — Schedule/StudySession bilan bog'liq EMAS (Schedule item'da `skillId` maydoni yo'q).
- Daily Coach: `DailyCoachService.getToday()` — kunlik keshlanadi, `currentStreak` va `weakSubjects`dan foydalanadi, Schedule/StudySession statistikasidan foydalanmaydi.

### 2. Nima qisman ishlayapti
- StudySession — yaratiladi/yopiladi, lekin **hech qanday agregatsiya/analytics uchun o'qilmaydi** — faqat yoziladi, umuman o'qilmaydi.
- `Progress` — kunlik yig'indi bor, lekin fan (subject) bo'yicha taqsimot yo'q.

### 3. Nima hali ishlatilmayapti
- `StudySession.subjectId`, `.skillId`, `.goalId` — yoziladi (subjectId) yoki umuman yozilmaydi (skillId, goalId — Schedule flow orqali hech qachon to'ldirilmaydi), lekin hech qayerda o'qilmaydi.
- Fan (subject) bo'yicha yoki kun-kunlik trend analitikasi — umuman yo'q.
- AI Advisor — StudySession haqida umuman bilmaydi (RecommendationService faqat SubjectLevel/interests asosida ishlaydi).

### 4. Qaysi model/API mavjud (shu ishga tegishli)
`StudySession`, `Schedule`, `Progress`, `ConsistencyScore`, `Badge`/`Achievement` — barchasi Prisma sxemasida tayyor. Yangi model **kerak emas**.

### 5. Qaysi joyni o'zgartirish xavfli
- `scheduleService.markStatus()` — Progress/StudySession/undo mantig'i allaqachon test qilingan (v2.5, 11 test) — **faqat o'qish uchun** ishlatiladi, o'zgartirilmaydi.
- `DailyCoachService`, `ConsistencyService`, `GamificationService` — ishlayotgan, testlangan — **faqat chaqiriladi (reuse), qayta yozilmaydi**.
- `pointsTotal()` — live-count dizayni tufayli hech narsa qilish shart emas (7-band talabiga avtomatik javob beradi).

### Xulosa
Kerakli hamma narsa (`plannedMinutes`, `actualMinutes`, `completionRate`, subject/kunlik trend, consistency, streak) mavjud ma'lumotlardan **faqat o'qish orqali** hisoblanishi mumkin — hech qanday mavjud yozish-mantiqqa tegilmaydi. Yagona chegara: **skill-darajasidagi activity hisoblanmaydi** (Schedule/StudySession skill bilan bog'lanmagan) — bu servis javobida ochiq belgilanadi (bo'sh massiv + izoh), soxta ma'lumot to'qilmaydi.

---

## v2.6 — PHASE 2-6 (bajarildi)

### Added
- `StudyAnalyticsService` (`server/src/services/studyAnalyticsService.ts`) — `getStats()` va `getRecommendation()`. Oxirgi 30 kunlik `Schedule`+`StudySession`+`Progress`dan: `plannedTasks/completedTasks/incompleteTasks/completionRate`, `plannedMinutes` (Schedule) vs `actualMinutes` (StudySession, **ataylab alohida**), `sessionCount`, `avgSessionMinutes`, fan bo'yicha taqsimot, 7 kunlik trend. `consistencyScore`/`currentStreak` — mavjud `ConsistencyService`/`GamificationService`dan **qayta ishlatilgan** (qayta yozilmagan).
- `buildRecommendation()` — oddiy, deterministik (AI provider'siz) qoida asosidagi tavsiya: fan bo'yicha "tashlab ketish" signali → reja/haqiqiy vaqt nisbati past → streak rag'batlantirish → default xabar.
- `ScheduleRepository.findRecent()`, `StudySessionRepository.findRecent()` — faqat o'qish uchun, mavjud yozish metodlariga tegilmagan.
- `GET /api/study-analytics/stats`, `GET /api/study-analytics/recommendation` — yangi, izolyatsiyalangan endpointlar.
- Frontend: `studyAnalyticsApi` (`lib/api.ts`), Progress sahifasida yangi "O'qish tahlili" kartasi (completion rate, reja/haqiqiy %, fan taqsimoti, tavsiya matni).
- `tests/unit/studyAnalyticsService.test.ts` — 11 test, jumladan "Progress rejalashtirilganidan, StudySession haqiqiy vaqtdan foydalanadi" ajratilishini tasdiqlovchi test.

### Changed
Hech qanday mavjud fayl ichidagi **yozish** mantig'i o'zgarmadi. `ScheduleRepository`/`StudySessionRepository`ga faqat yangi **o'qish** metodlari qo'shildi.

### Fixed
Yo'q — bu safar yangi bug topilmadi.

### Files Changed
- `server/src/repositories/scheduleRepository.ts` (+`findRecent`)
- `server/src/repositories/studySessionRepository.ts` (+`findRecent`)
- `server/src/app.ts` (+route mount)
- `client/src/lib/api.ts` (+`studyAnalyticsApi`)
- `client/src/pages/student/Progress.tsx` (+"O'qish tahlili" karta)
- `client/src/i18n/locales/{uz,ru}.json` (+10 kalit, parity saqlangan: 244/244)

### Files Added
- `server/src/services/studyAnalyticsService.ts`
- `server/src/controllers/studyAnalyticsController.ts`
- `server/src/routes/studyAnalyticsRoutes.ts`
- `server/tests/unit/studyAnalyticsService.test.ts`

### Database Changes
Yo'q. Mavjud `StudySession`/`Schedule`/`Progress`/`ConsistencyScore` yetarli edi.

### API Changes
- **Yangi (qo'shildi, hech narsa o'zgartirilmadi):** `GET /api/study-analytics/stats`, `GET /api/study-analytics/recommendation`

### Frontend Changes
Progress sahifasiga yangi karta qo'shildi. Boshqa hech qanday sahifa/komponent o'zgarmadi.

### AI Changes
Yangi `buildRecommendation()` — **AIProvider orqali EMAS**, sof deterministik JS mantiq (topshiriqda aytilganidek: "hozircha murakkab ML model yaratma"). Daily Coach'ning o'zi **qayta yozilmadi** — ataylab, xavfsizlik uchun.

### Gamification — muhim topilma
`GamificationService.pointsTotal()` allaqachon **live COUNT** so'rovi orqali ishlaydi (incremental counter emas) — Schedule task COMPLETED bo'lganda/bekor qilinganda ball avtomatik, ikki marta hisoblanish xavfisiz to'g'rilanadi. **Hech qanday qo'shimcha reward-berish kodi kerak bo'lmadi.**

### Current Status
- Completed: Phase 1-6, barcha talab qilingan analytics maydonlari (skill breakdown'dan tashqari — pastga qarang)
- In Progress: yo'q
- Not Started: Daily Coach'ga analytics ulash (ataylab, xavfsizlik uchun keyingi bosqichga qoldirildi — endpoint tayyor)

### Next Step
Agar xohlasangiz: Dashboard'dagi Daily Coach kartasi ostiga "Bugun X/Y task, Z daqiqa" qatorini `studyAnalyticsApi.getStats()`dan qo'shish mumkin — `DailyCoachService`ning o'ziga tegmasdan, sof frontend qo'shimchasi sifatida.

---

## v2.7 — Screenshot orqali topilgan xatolar + Yutuqlar/Profil UI

### Fixed
1. **Achievements.tsx** — badge nomi frontendda `a.badge.nameUz` (hardcoded, doim o'zbekcha) chiqarilar edi, backend'ning tayyor lokalizatsiya qilingan `name` maydoni ishlatilmas edi. Endi `badge.name` ishlatiladi.
2. **Daily Coach tilga qarab "muzlab qolish"** — `DailyCoach` kunlik keshlanadi, lekin qaysi tilda generatsiya qilingani saqlanmas edi — til almashtirilsa ham eski (masalan o'zbekcha) xabar qaytaverar edi. Sxemaga `DailyCoach.lang` (`@default("uz")`) qo'shildi; kesh kaliti endi (student, sana, til) uchlik bo'yicha ishlaydi.

### Changed — Achievements (Yutuqlar) — Variant A "Javon" tanlandi
- Backend: `GET /api/achievements` endi **to'liq badge katalogini** (ochilgan + qulflangan) qaytaradi (`GamificationRepository.findAllBadges()` + `GamificationService.listAllBadgesWithStatus()` — yangi, faqat o'qish).
- Frontend: progress-bar ("X/Y ochilgan"), ochilgan badge'lar rangli + sana bilan, qulflanganlari kulrang + qulf ikonkasi + "Hali qulflangan".

### Changed — Profil — Variant A "Hero banner" tanlandi
- Frontend'da faqat: yuqorida gradient banner (avatar bosh harflari + ism + sinf), pastda har bir bo'lim (Qiziqishlar/Maqsadlar/Kasbiy) alohida rang bilan (indigo/yashil/binafsha) ajratilgan. Backend/API o'zgarmadi.

### Database Changes
- `DailyCoach.lang String @default("uz")` — yangi migratsiya kerak (pastga qarang).

### API Changes
- `GET /api/achievements` javob formati o'zgardi: `{ achievements: [...] }` → `{ badges: [...] }`, endi qulflangan badge'larni ham o'z ichiga oladi. Yagona iste'molchi (`Achievements.tsx`) ham shu bilan birga yangilandi.

### Files Changed
- `server/prisma/schema.prisma` (+`DailyCoach.lang`)
- `server/src/repositories/gamificationRepository.ts` (+`findAllBadges`)
- `server/src/repositories/dailyCoachRepository.ts` (`findForDate`/`create` endi `lang` oladi)
- `server/src/services/gamificationService.ts` (+`listAllBadgesWithStatus`)
- `server/src/services/dailyCoachService.ts` (kesh kaliti tilga bog'landi)
- `server/src/controllers/achievementController.ts`
- `client/src/lib/api.ts` (`achievementApi` javob tipi)
- `client/src/pages/student/Achievements.tsx` (to'liq qayta yozildi — Variant A)
- `client/src/pages/student/Profile.tsx` (to'liq qayta yozildi — Variant A)
- `client/src/i18n/locales/{uz,ru}.json` (+6 kalit, parity: 247/247)

### Tests
- `gamificationService.test.ts` — yangi, 2/2 o'tadi
- `dailyCoachService.test.ts` — til-kesh bug uchun yangi test qo'shildi, 5/5 o'tadi
- Umumiy: **7 fayl to'liq yashil, 48 test**, qolgan 7 fayl — o'zgarishsiz, oldindan mavjud muhit bloki

### Migration kerak
```bash
npx prisma migrate dev --name daily_coach_lang
npx prisma generate
```

---

## v2.8 — kritik fayl buzilishi tuzatildi + UI mayda tuzatishlar

### Fixed (P0 — build butunlay ishlamasligi kerak edi)
`client/src/pages/student/Profile.tsx` — `function TagEditor({` deb boshlanadigan qator butunlay yo'qolib qolgan edi (fayl sintaktik jihatdan noto'g'ri). Bu — v2.7dan keyin, "Saqlash faqat o'zgarish bo'lganda chiqsin" funksiyasi ustida ishlashda yuz bergan tahrirlash xatosi. **Bu ANIQ sababi edi nega foydalanuvchi hech qanday o'zgarishni ko'rmagan** — `npm run build` haqiqatda xato berishi kerak edi. Tuzatildi va `tsc -b` orqali butun loyiha bo'ylab boshqa shunday buzilish yo'qligi tasdiqlandi.

### Changed
- Profil — "Saqlash" tugmasi endi faqat foydalanuvchi haqiqatan biror narsa o'zgartirganda (`dirty` holat) ko'rinadi; saqlangandan keyin qisqa "Saqlandi ✓" xabari chiqadi.
- Yutuqlar — ochilgan badge ikonkasi endi soyaroq (`shadow-brand-300`) va `drop-shadow` bilan yanada "medal"ga o'xshash ko'rinadi.

### Files Changed
- `client/src/pages/student/Profile.tsx` (buzilish tuzatildi)
- `client/src/pages/student/Achievements.tsx` (badge ikonka stili)

### Tests
Build + lint to'liq loyiha bo'ylab tekshirildi — 0 xato.

---

## v2.9 — Dashboard cache bug + adaptiv dars rejasi

### Fixed (P0 — foydalanuvchi darhol duch kelgan)
`client/src/pages/student/Quiz.tsx` — test topshirilgandan keyin **hech qanday query cache invalidatsiya qilinmas edi**. Backend to'g'ri ishlaydi (Schedule item avtomatik bajarilgan deb belgilanadi, Progress/streak/badge yangilanadi), lekin frontend eski keshlangan ma'lumotni ko'rsatishda davom etardi — sahifa to'liq qayta yuklanmaguncha. Endi test topshirilgandan keyin barcha bog'liq query'lar (`schedule-current`, `consistency-score`, `study-stats`, `study-recommendation`, `daily-coach-today`, `achievements`, `progress-overview`, `dashboard-summary`) invalidatsiya qilinadi.

### Changed — moslashuvchan (adaptiv) dars rejasi
`RuleBasedProvider.generateLearningPlan()` — avval kuchsiz fanlar faqat **uzunroq** (60 daqiqa) sessiya olardi, lekin **tez-tez** chiqmasdi (aylanish tartibida kuchli fanlar bilan teng chastota bilan). Endi kuchsiz fanlar aylanish "pool"iga **2 marta** kiritiladi — haftada taxminan 2 baravar ko'proq chiqadi. Test bilan tasdiqlangan: 1 kuchsiz + 1 kuchli fan holatida kuchsiz fan haftada ko'proq kun chiqishi tekshirildi.

### Muhokama qilinishi kerak — hali o'zgartirilmagan
Foydalanuvchi savol berdi: Schedule'da "60 daqiqa" ko'rsatiladi, lekin bitta test topshirish atigi ~2 daqiqa oladi. Bu **ataylab shunday** — Progress hozir Schedule'ning **rejalashtirilgan** vaqtini kredit qiladi (haqiqiy sarflangan vaqtni emas), chunki avvalgi topshiriqda aniq shunday belgilangan edi ("Progress rejalashtirilgan vaqtni real vaqtga almashtirma"). Bu hali ham to'g'ri qarormi — yoki endi haqiqiy foydalanishda ko'rib, o'zgartirish kerakmi — foydalanuvchidan tasdiq kutilmoqda.

### Files Changed
- `client/src/pages/student/Quiz.tsx` (+cache invalidation)
- `server/src/providers/ai/RuleBasedProvider.ts` (weak-subject weighting)

### Tests
- `ruleBasedProvider.test.ts` — yangi, 4/4 o'tadi
- Umumiy: **8 fayl to'liq yashil, 52 test**

---

## v3.0 — Daily Coach: o'z-o'zini belgilash olib tashlandi

### Muhokama va qaror
Foydalanuvchi to'g'ri ta'kidladi: Daily Coach'dagi "Bajarildi" tugmasi **hech narsani tekshirmasdan** ishonch bildirar edi — foydalanuvchi hech narsa qilmasa ham bosishi mumkin edi. Tekshirdim: `DailyCoach.completed` maydoni boshqa hech qanday joyda (ball, streak, Progress, Consistency, ota-ona hisoboti) ishlatilmasdi — lekin baribir noto'g'ri signal berish printsipial jihatdan noto'g'ri edi. Variant B tanlandi: tugma butunlay olib tashlandi, o'rniga **haqiqiy Progress ma'lumotidan** (o'zi faqat quiz orqali tasdiqlangan Schedule bajarilishidan kelib chiqadi) avtomatik hisoblangan `activeToday` holati ko'rsatiladi.

### Changed
- `DailyCoachService.getToday()` — endi `activeToday: boolean` qaytaradi (bugungi `Progress` yozuvi bor-yo'qligidan kelib chiqadi — qo'lda emas).
- `markCompleted` — service, repository, controller, route va frontend API chaqiruvi **butunlay olib tashlandi** (endi ma'nosiz edi).
- Frontend: "Bajarildi" tugmasi olib tashlandi. Endi: haqiqiy faollik bo'lsa — yashil "✓ Bugun faol bo'ldingiz"; bo'lmasa — kulrang "Bugun hali faollik qayd etilmagan" (ikkalasi ham faqat matn, tugma emas).

### Files Changed
- `server/src/services/dailyCoachService.ts`, `repositories/dailyCoachRepository.ts`, `controllers/dailyCoachController.ts`, `routes/dailyCoachRoutes.ts`
- `client/src/pages/student/Dashboard.tsx`, `client/src/lib/api.ts`
- `client/src/i18n/locales/{uz,ru}.json` (+1 kalit, parity: 248/248)

### API Changes
`PATCH /api/daily-coach/:id/complete` — **olib tashlandi** (endi ishlatilmaydi). `GET /api/daily-coach/today` javobida `completed` o'rniga `activeToday` maydoni.

### Tests
- `dailyCoachService.test.ts` — to'liq qayta yozildi, `activeToday` uchun 3 ta yangi test qo'shildi, 6/6 o'tadi
- Umumiy: **8 fayl to'liq yashil, 53 test**

---

## v3.1 — Dars rejasi: bir kunda bir nechta fan + kengroq qamrov

### Muammo
Dars rejasi haftada faqat **2 ta fan** ko'rsatardi (Ingliz tili + Matematika), chunki `generateWeekRaw()` faqat `student.subjectLevels`dan (ya'ni faqat test topshirilgan fanlardan) olardi — bazadagi 8 fandan 6 tasi test topshirilmagani uchun umuman ko'rinmasdi. Har kunga ham faqat 1 ta fan chiqardi.

### Changed
- **Yangi "neutral" fan tushunchasi** — `scheduleService.generateWeekRaw()` endi butun fan katalogini (`subjectRepo.findAll()`) oladi va test topshirilmagan fanlarni alohida ro'yxat (`neutralSubjects`) sifatida AI'ga uzatadi.
- **`RuleBasedProvider.generateLearningPlan()`** — har bir kunga endi 2 ta blok qo'shishi mumkin: asosiy (kuchsiz/kuchli fandan, avvalgidek og'irlik bilan) + qo'shimcha, qisqaroq (~20 daqiqa) blok — birinchi navbatda "neutral" fanlardan (hali test topshirilmagan, lekin hayotda kerak bo'lishi mumkin bo'lgan), agar neutral bo'lmasa — kuchli fanlardan. Bir kunda bir xil fan ikki marta chiqmaydi. Agar kun uchun vaqt yetarli bo'lmasa (≤30 daqiqa), qo'shimcha blok qo'shilmaydi.
- `OpenAIProvider`ning prompt'i ham xuddi shu mantiqqa mos yangilandi (haqiqiy OpenAI ishlatilganda ham izchil xatti-harakat uchun).

### Files Changed
- `server/src/providers/ai/AIProvider.ts` (+`neutralSubjects` maydoni)
- `server/src/providers/ai/RuleBasedProvider.ts` (asosiy o'zgarish)
- `server/src/providers/ai/OpenAIProvider.ts` (prompt yangilandi)
- `server/src/services/scheduleService.ts` (neutral fanlarni hisoblash)

### Database Changes
Yo'q — schema o'zgarmadi.

### Tests
- `ruleBasedProvider.test.ts` — to'liq qayta yozildi + kengaytirildi, 8/8 o'tadi (jumladan: "bir kunda bir xil fan ikki marta chiqmaydi", "vaqt yetarli bo'lmasa qo'shimcha blok qo'shilmaydi")
- `scheduleService.test.ts` — yangi "neutral-subject computation" test guruhi, 2 ta yangi test, jami 19/19 o'tadi
- Umumiy: **8 fayl to'liq yashil, 59 test**

---

## v3.2 — Test natijasi Schedule'ga, rejadan tashqari fan, savol-savol sharh

### Added
1. **Schedule'da test foizi** — vazifa test orqali "Bajarildi" bo'lganda, endi aniq foiz ham ko'rsatiladi ("Bajarildi — 80%"). Yangi `Schedule.lastScore Int?` ustuni (migratsiya kerak).
2. **Rejadan tashqari fan avtomatik qo'shiladi** — agar kunlik rejada yo'q fandan test topshirilsa, o'sha fan **yangi Schedule yozuvi** sifatida bugungi kunga "Bajarildi" holatida qo'shiladi (avval bunday test hech qayerda ko'rinmasdi).
3. **Test tugagandan keyin savol-savol sharh** — har bir savol uchun to'g'ri/xato belgisi, tanlangan javob va to'g'ri javob ko'rsatiladi. **Xavfsizlik qoidasi buzilmadi**: bu faqat topshirilgandan KEYIN, shu urinish uchun ko'rsatiladi — test paytida hech qachon `correctIndex` frontendga yuborilmaydi (bu qoida o'zgarishsiz qoldi).

### Changed
- `ScheduleService.autoTransitionForSubject()` — endi `score`/`lang` qabul qiladi, mos item topilmasa yangi COMPLETED item yaratadi.
- `QuizService.submitQuiz()` — endi `lang` qabul qiladi, javobida `review: QuizReviewItem[]` qaytaradi.
- `scheduleRepository.updateStatus()` — endi ixtiyoriy `lastScore` parametri bilan.

### Files Changed
- `server/prisma/schema.prisma` (+`Schedule.lastScore`)
- `server/src/repositories/scheduleRepository.ts` (+`createCompletedNow`, `updateStatus` +score)
- `server/src/repositories/subjectRepository.ts` (+`findById`)
- `server/src/services/scheduleService.ts`, `server/src/services/quizService.ts`
- `server/src/controllers/quizController.ts`
- `client/src/lib/api.ts`, `client/src/pages/student/Schedule.tsx`, `client/src/pages/student/Quiz.tsx`
- `client/src/i18n/locales/{uz,ru}.json` (+1 kalit, parity: 249/249)

### Database Changes
`Schedule.lastScore Int?` — yangi migratsiya kerak:
```bash
npx prisma migrate dev --name schedule_last_score
npx prisma generate
```

### API Changes
- `POST /api/quiz/submit` javobiga `review` maydoni qo'shildi (mavjud maydonlar o'zgarmadi)
- `GET /api/schedule/current` javobidagi har bir item endi `lastScore` maydonini o'z ichiga oladi (COMPLETED bo'lmagan itemlarda `null`)

### Tests
- `quizService.test.ts` — qayta yozildi, `review` va `score`/`lang` uzatilishi uchun yangi testlar, 8/8 o'tadi
- `scheduleService.test.ts` — "subject not on today's plan" uchun 5 ta yangi test, jami 24/24 o'tadi
- Umumiy: **8 fayl to'liq yashil, 66 test**







