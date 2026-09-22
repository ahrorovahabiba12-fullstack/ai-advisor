import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const setLang = (lng: "uz" | "ru") => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
    // Server-localized data (subject/career/university names, AI replies)
    // is cached per query key without a language dimension, so a switch
    // needs an explicit refetch or the UI keeps showing the old language
    // until something else happens to invalidate it.
    queryClient.invalidateQueries();
  };
  return (
    <div className="flex items-center gap-1 text-sm font-semibold bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full px-1 py-1">
      <button
        onClick={() => setLang("uz")}
        className={`px-2.5 py-1 rounded-full transition-colors ${i18n.language === "uz" ? "bg-brand-500 text-white" : "text-[var(--text-secondary)]"}`}
      >
        UZ
      </button>
      <button
        onClick={() => setLang("ru")}
        className={`px-2.5 py-1 rounded-full transition-colors ${i18n.language === "ru" ? "bg-brand-500 text-white" : "text-[var(--text-secondary)]"}`}
      >
        RU
      </button>
    </div>
  );
}
