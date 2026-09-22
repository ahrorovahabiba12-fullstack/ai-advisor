import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { achievementApi } from "../../lib/api";
import { Card, Skeleton, ErrorState } from "../../components/ui/primitives";
import clsx from "clsx";

export default function Achievements() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["achievements"], queryFn: achievementApi.list });

  const unlockedCount = data?.badges.filter((b) => b.unlocked).length ?? 0;
  const totalCount = data?.badges.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("achievements.title")}</h1>
        {data && (
          <div className="flex gap-3 text-sm font-semibold">
            <span className="bg-brand-100 text-brand-700 px-3 py-1.5 rounded-full">{data.points} {t("achievements.points")}</span>
            <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">🔥 {data.streakDays} {t("achievements.days")}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : isError ? (
        <ErrorState message={t("achievements.errorLoad")} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-semibold">{t("achievements.progress")}</span>
              <span className="text-[var(--text-secondary)]">{unlockedCount}/{totalCount}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-brand-gradient rounded-full transition-all"
                style={{ width: totalCount > 0 ? `${(unlockedCount / totalCount) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {data?.badges.map((b) => (
              <Card
                key={b.id}
                className={clsx("text-center transition-opacity", !b.unlocked && "opacity-55")}
              >
                <div
                  className={clsx(
                    "w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl ring-4",
                    b.unlocked
                      ? "bg-brand-gradient ring-white shadow-lg shadow-brand-300/50 animate-scale-in"
                      : "bg-gray-50 ring-gray-100 border-2 border-dashed border-gray-200"
                  )}
                >
                  {b.unlocked ? <span className="drop-shadow-sm">{b.icon}</span> : <Lock size={22} className="text-gray-400" />}
                </div>
                <p className={clsx("font-semibold", !b.unlocked && "text-[var(--text-secondary)]")}>{b.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{b.description}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-medium">
                  {b.unlocked
                    ? new Date(b.unlockedAt!).toLocaleDateString(i18n.language === "ru" ? "ru-RU" : "uz-UZ")
                    : t("achievements.locked")}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
