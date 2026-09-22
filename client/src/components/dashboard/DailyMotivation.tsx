import { useTranslation } from "react-i18next";
import { Card } from "../ui/primitives";

// Kept in step order with the uz/ru quote arrays in the locale files —
// index i's emoji illustrates quote i in every language.
const EMOJIS = ["🌱", "📚", "🚀", "💡", "📈", "🔑", "💪", "🌟", "🎯", "🔥", "🏆", "🚪", "✨", "⏳"];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function DailyMotivation() {
  const { t } = useTranslation();
  const quotes = t("dashboard.motivationalQuotes", { returnObjects: true }) as string[];
  if (!Array.isArray(quotes) || quotes.length === 0) return null;

  // Same index all day, changes tomorrow — deterministic from the calendar
  // date alone, no state or storage needed.
  const index = dayOfYear(new Date()) % quotes.length;

  return (
    <Card className="flex items-center gap-4 py-3">
      <span className="text-3xl shrink-0" aria-hidden="true">
        {EMOJIS[index % EMOJIS.length]}
      </span>
      <p className="font-medium text-sm">{quotes[index]}</p>
    </Card>
  );
}
