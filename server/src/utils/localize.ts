import { Lang } from "../middleware/language";

/** Picks the Russian value for lang === "ru", Uzbek otherwise. */
export function pick(uz: string, ru: string, lang: Lang): string {
  return lang === "ru" ? ru : uz;
}
