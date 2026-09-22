# AI Career & Learning Advisor

Shaxsiy AI o'quv va kasb maslahatchisi — o'quvchilar uchun individual o'quv reja,
progress tahlili, AI chat, va (9-11 sinf uchun) kasb/universitet tavsiyalari.
Ota-onalar uchun alohida analitika paneli.

> **Loyiha holati**: to'liq kod bazasi yozilgan (backend + frontend), lekin bu
> repo tarmoqqa chiqish imkoni bo'lmagan muhitda tayyorlangani sababli **hali
> ishga tushirilmagan va sinovdan o'tkazilmagan**. Batafsil: `PROJECT_STATUS.md`.
> Birinchi bo'lib qiling: `npm install && npm run prisma:migrate && npm run prisma:seed && npm test`,
> so'ng chiqqan xatolarni tuzating.

## Xususiyatlar

- **Auth** — JWT (access+refresh), Student/Parent rollari, parol hash (bcrypt)
- **AI Recommendation** — shaxsiy o'quv tavsiyasi, haftalik reja, progress tahlili
- **AI Chat** — to'liq context bilan (grade, qiziqish, fan darajalari, maqsad, progress)
- **Quiz** — server-side baholash, 8 fan, avtomatik SubjectLevel yangilanishi
- **Gamification** — points, streak, badge'lar
- **Career/University** — **faqat 9-11 sinf uchun**, roadmap bilan; bu qoida frontend
  va backendning ikkalasida ham majburiy tekshiriladi
- **Parent Dashboard** — farzand progress, AI hisobot (raw chat emas, xulosa)
- **i18n** — o'zbek (default) / rus
- **Light/Dark mode**

## Arxitektura

```
Route → Controller → Service → Repository → Prisma → PostgreSQL
```

- Controller — faqat HTTP (request/response), biznes mantiq yo'q
- Service — biznes qoidalar (masalan, grade>=9 tekshiruvi)
- Repository — yagona Prisma so'rovlari joyi
- AI: `RecommendationService`/`CareerService`/`ChatService` → `AIProvider` interfeysi →
  `OpenAIProvider` / `RuleBasedProvider` / `MockAIProvider`, avtomatik fallback bilan
  (`providers/ai/index.ts`). Promptlar `server/src/prompts/` papkasida, versiyalangan.

## Texnologiyalar

**Frontend**: React, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router, zustand, i18next, recharts
**Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT

## Papka strukturasi

```
/client
  /src
    /components/ui        — Button, Card, Input, Badge, Skeleton, EmptyState
    /components/layout    — Sidebar, Topbar, MobileBottomNav, LanguageSwitcher, ThemeToggle
    /pages/public          — Landing
    /pages/auth            — Login, Register
    /pages/student          — Dashboard, AIChat, Quiz, Schedule, Progress, Achievements,
                               Career, CareerRoadmap, Universities, Profile, Settings
    /pages/parent           — ParentDashboard
    /lib/api.ts             — typed API client
    /store/authStore.ts     — zustand session state
    /i18n                   — uz/ru translations
/server
  /src
    /controllers, /services, /repositories, /routes, /middleware, /validators
    /providers/ai           — AIProvider interface + OpenAI/RuleBased/Mock implementations
    /providers/payment      — PaymentProvider + MockPaymentProvider
    /providers/notification — NotificationProvider + InApp/Email/Telegram (stub)
    /prompts                — versioned AI prompt templates
  /prisma
    schema.prisma
    seed.ts
  /tests
    /unit                   — grade-gate, ownership, quiz-scoring (written, unexecuted here)
    /integration            — end-to-end API tests (requires real DB, unexecuted here)
```

## O'rnatish

### 1. Talablar
- Node.js 20+
- PostgreSQL 16+ (yoki Docker)

### 2. Muhit o'zgaruvchilari
```bash
cp server/.env.example server/.env
# server/.env ni tahrirlang: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

`AI_PROVIDER=mock` (default, credential kerak emas) yoki `AI_PROVIDER=openai` +
`AI_API_KEY` — kredensial bo'lmasa yoki xato bo'lsa, tizim avtomatik ravishda
`RuleBasedProvider`ga (haqiqiy, deterministik mantiq — stub emas) o'tadi.

### 3. Bog'liqliklarni o'rnatish
```bash
npm install                    # root — concurrently
npm --prefix server install
npm --prefix client install
```

### 4. Database
```bash
npm run prisma:migrate         # birinchi migration yaratadi
npm run prisma:seed            # demo ma'lumotlar
```

### 5. Ishga tushirish
```bash
npm run dev                    # frontend (5173) + backend (4000) parallel
```

### Yoki Docker orqali
```bash
docker compose up --build
```

## Demo akkountlar

Seed skripti quyidagilarni yaratadi (parol barchasi uchun bir xil):

| Rol | Email | Parol |
|---|---|---|
| Admin (Superadmin paneli) | admin@demo.uz | Demo12345! |
| Ota-ona | parent@demo.uz | Demo12345! |
| O'quvchi (7-sinf) | student7@demo.uz | Demo12345! |
| O'quvchi (8-sinf) | student8@demo.uz | Demo12345! |
| O'quvchi (9-sinf) | student9@demo.uz | Demo12345! |
| O'quvchi (10-sinf) | student10@demo.uz | Demo12345! |
| O'quvchi (11-sinf) | student11@demo.uz | Demo12345! |

Barcha o'quvchilar `parent@demo.uz`ga bog'langan. 7/8-sinf akkountlarida Kasb
bo'limi ko'rinmasligini, 9-11 sinfda ko'rinishini tekshiring — bu loyihaning eng
muhim biznes qoidasi.

## Testlash

Barcha testlar (unit + integration) haqiqiy PostgreSQL bazasiga ulanadi — bitta
marta alohida test bazasini yaratish va migratsiya qilish kerak (asosiy dev
bazangizga umuman tegmaydi, har bir test faylidan oldin to'liq tozalanadi):

```bash
createdb ai_advisor_test
DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/ai_advisor_test npx prisma migrate deploy --schema=server/prisma/schema.prisma
```

Shundan keyin:

```bash
npm test                       # backend unit + integration testlar
```

`server/vitest.config.ts` `.env`dagi `DATABASE_URL`ni avtomatik `ai_advisor_test`
bazasiga almashtiradi — asosiy `ai_advisor` bazasi test yugurtirishda hech qachon
o'zgarmaydi yoki o'chirilmaydi. Har bir test fayli o'zining Student/Parent/Subject
va h.k. qatorlarini o'zi yaratadi (repository darajasida mock yo'q); faqat AI/
to'lov providerlari kabi tashqi/deterministik bo'lmagan chegaralar hali ham spy
bilan almashtiriladi.

## AI sozlash

`AI_PROVIDER=openai` qilib, `AI_API_KEY` va ixtiyoriy `AI_MODEL` (default
`gpt-4o-mini`) qo'ying. Har qanday AI javobi `JSON.parse` → zod schema
validatsiyasi → biznes validatsiya (masalan, confidence 0-1 oralig'ida,
grade<9 uchun kasb yo'q) zanjiridan o'tgandan keyingina bazaga yoziladi.

## To'lov (Subscription)

Hozircha faqat `MockPaymentProvider` — real to'lov kredensiali yo'q. Checkout
darhol "muvaffaqiyatli" bo'ladi, shuning uchun Premium oqimini kredensialsiz
ham to'liq sinash mumkin. Real provayder qo'shish — `PaymentProvider`
interfeysini implement qilish va `SubscriptionService`da almashtirish.

## Kelajakdagi rivojlanish

`PROJECT_STATUS.md` dagi "Next implementation phase" bo'limiga qarang —
qolgan ishlar va aniq davom etish nuqtasi shu yerda saqlanadi.
