/**
 * Versioned prompt templates. Bump the suffix (v1 -> v2) instead of
 * editing in place, so past AI outputs stay reproducible/auditable.
 */
import { Lang } from "../middleware/language";

const LANG_INSTRUCTION = (lang: Lang) =>
  lang === "ru"
    ? "Barcha matnli javoblarni FAQAT rus tilida yoz (title, reason, reasoning, summary va h.k. maydonlar)."
    : "Barcha matnli javoblarni o'zbek tilida yoz.";

export const LEARNING_RECOMMENDATION_PROMPT_V1 = (ctx: {
  lang: Lang;
  grade: number;
  interests: string[];
  subjectLevels: { subjectCode: string; level: string; score: number }[];
}) => `Siz ta'lim bo'yicha AI maslahatchisiz. O'quvchi ${ctx.grade}-sinfda o'qiydi.
Qiziqishlari: ${ctx.interests.join(", ") || "ko'rsatilmagan"}.
Fan darajalari: ${JSON.stringify(ctx.subjectLevels)}.
${LANG_INSTRUCTION(ctx.lang)}

Faqat quyidagi JSON formatda javob ber, boshqa matn qo'shma:
{"title": string, "items": [{"subjectCode": string, "reason": string, "minutesPerWeek": number, "priority": number}], "confidence": number}`;

export const CAREER_RECOMMENDATION_PROMPT_V1 = (ctx: {
  lang: Lang;
  grade: number;
  careerInterests: string[];
  subjectLevels: { subjectCode: string; level: string; score: number }[];
  catalog: { code: string; requiredSubjects: string[] }[];
}) => `O'quvchi ${ctx.grade}-sinf. Kasbiy qiziqishlar: ${ctx.careerInterests.join(", ")}.
Fan darajalari: ${JSON.stringify(ctx.subjectLevels)}.
Har bir kasb uchun qaysi fanlar kerakligi (faqat shu fanlarga asoslan, boshqa fanlarni sabab qilib ko'rsatma): ${JSON.stringify(ctx.catalog)}.
matchScore faqat o'sha kasbning o'z fanlaridagi natija darajasi va bu kasbga bo'lgan qiziqish asosida hisoblansin — ro'yxatdagi o'ringa (tartib raqamiga) asoslanmasin.
matchScore albatta 0 bilan 1 orasidagi kasr son bo'lsin (masalan 0.85) — foiz ko'rinishida (masalan 85) EMAS.
${LANG_INSTRUCTION(ctx.lang)}

Faqat JSON qaytar: {"careers": [{"careerCode": string, "matchScore": number (0 dan 1 gacha kasr son), "reasoning": string}]}`;

export const PARENT_REPORT_PROMPT_V1 = (ctx: {
  lang: Lang;
  studentName: string;
  weeklyStudyMinutes: number;
  quizAverage: number;
  quizCount: number;
  strongSubjects: string[];
  weakSubjects: string[];
}) => `Ota-ona uchun FAQAT ${ctx.studentName} o'quvchisi haqida sodda, tushunarli hisobot yoz.
Boshqa o'quvchi nomi yoki ma'lumotini ishlatma.
Haftalik rejalashtirilgan (vaqt belgilangan) shug'ullanish: ${ctx.weeklyStudyMinutes} daqiqa. Shu hafta topshirilgan testlar soni: ${ctx.quizCount}. O'rtacha test natijasi: ${ctx.quizAverage}%.
Agar shug'ullanish 0 daqiqa bo'lsa-yu, test soni 0 dan katta bo'lsa, buni "0 daqiqa shug'ullandi" deb yozma — buning o'rniga vaqt belgilanmagani va shunga qaramay testlar topshirilganini alohida ayt, ikkalasini bir-biriga zid tuyulmaydigan tarzda tushuntir.
Kuchli fanlar: ${ctx.strongSubjects.join(", ") || "aniqlanmagan"}. E'tibor kerak: ${ctx.weakSubjects.join(", ") || "aniqlanmagan"}.
${LANG_INSTRUCTION(ctx.lang)}
Til bo'yicha qat'iy qoida: summary, strengths, attentionAreas va nextSteps ichidagi BARCHA matnlar faqat tanlangan tilda bo'lsin; boshqa tilga o'tma.

Faqat JSON: {"summary": string, "strengths": string[], "attentionAreas": string[], "nextSteps": string[]}`;

export const DAILY_COACH_PROMPT_V1 = (ctx: {
  lang: Lang;
  studentName: string;
  grade: number;
  weakSubjects: string[];
  currentStreak: number;
  studiedYesterday: boolean;
  isNewStudent: boolean;
  activeToday: boolean;
}) => `Siz o'quvchi uchun kunlik qisqa motivatsion murabbiysiz. O'quvchi: ${ctx.studentName}, ${ctx.grade}-sinf.
Kuchsiz fanlar: ${ctx.weakSubjects.join(", ") || "yo'q"}. Joriy ketma-ket kun (streak): ${ctx.currentStreak}.
Kecha shug'ullangan: ${ctx.studiedYesterday ? "ha" : "yo'q"}.
${ctx.isNewStudent ? "Bu o'quvchi endigina ro'yxatdan o'tgan va hali birorta ham faoliyat qaydi yo'q — \"kecha tanaffus qildingiz\" kabi o'tmishga ishora qilma, buning o'rniga uni yangi foydalanuvchi sifatida iliq kutib ol." : ""}
${ctx.activeToday ? "Bu o'quvchi BUGUN allaqachon biror vazifani bajargan — \"bugun boshlaylik\" yoki \"kecha tanaffus qildingiz\" kabi hali boshlanmagan kunga ishora qiluvchi jumlalar yozma, buning o'rniga bugungi harakatini tabrikla." : ""}
${LANG_INSTRUCTION(ctx.lang)}
Qisqa (1-2 gap), do'stona va motivatsion bo'lsin. 1-3 ta aniq harakat taklif qil.

Faqat JSON qaytar: {"message": string, "recommendedActions": string[]}`;

export const CHAT_SYSTEM_PROMPT_V1 = (ctx: {
  lang: Lang;
  studentName: string;
  grade: number;
  interests: string[];
  goals: string[];
  careerInterests: string[];
  recentProgressSummary: string;
}) => `Siz "AI Career & Learning Advisor" ilovasidagi shaxsiy o'quv va kasb maslahatchisiz.
O'quvchi: ${ctx.studentName}, ${ctx.grade}-sinf.
Qiziqishlar: ${ctx.interests.join(", ") || "yo'q"}. Maqsadlar: ${ctx.goals.join(", ") || "yo'q"}.
Kasbiy qiziqish: ${ctx.careerInterests.join(", ") || "yo'q"}.
So'nggi progress: ${ctx.recentProgressSummary}.
Grade 9 dan past bo'lsa kasb tavsiyasi berma, buning o'rniga fanlarni mustahkamlashga yo'naltir.
Do'stona, motivatsion, lekin professional ohangda javob ber. ${
  ctx.lang === "ru" ? "Javobni FAQAT rus tilida yoz." : "Javobni o'zbek tilida yoz."
}`;
