import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, RefreshCw, Loader2, Circle } from "lucide-react";
import { useState } from "react";
import { scheduleApi } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import clsx from "clsx";

type ScheduleItem = {
  id: string;
  dayOfWeek: number;
  title: string;
  minutes: number;
  actualMinutes: number;
  actualSeconds: number;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  subject?: { name: string } | null;
  lastScore?: number | null;
};

function formatCompletedDuration(
  actualSeconds: number,
  actualMinutes: number,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  // Sessions recorded before second-level precision was tracked have
  // actualSeconds = 0 with a real actualMinutes value — fall back to the
  // old minutes-only display instead of showing a misleading "0 soniya".
  if (actualSeconds === 0 && actualMinutes > 0) {
    return `${actualMinutes} ${t("schedule.minutes")}`;
  }
  const minutes = Math.floor(actualSeconds / 60);
  const seconds = actualSeconds % 60;
  return minutes > 0
    ? t("schedule.durationCompleted", { minutes, seconds })
    : t("schedule.durationSecondsOnly", { seconds });
}

// Status is now driven entirely by real activity (starting/submitting a quiz for the
// subject) — see ScheduleService.autoTransitionForSubject on the backend. This card is
// intentionally read-only: no button here changes status directly anymore.
function ScheduleCard({ item }: { item: ScheduleItem }) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
        item.status === "COMPLETED"
          ? "border-emerald-300 bg-emerald-50"
          : item.status === "IN_PROGRESS"
            ? "border-brand-300 bg-brand-50"
            : "border-[var(--border-subtle)]"
      )}
    >
      <span
        className={clsx(
          "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          item.status === "COMPLETED" && "bg-emerald-500 text-white",
          item.status === "IN_PROGRESS" && "text-brand-600",
          item.status === "TODO" && "text-[var(--border-subtle)]"
        )}
      >
        {item.status === "COMPLETED" && <Check size={12} className="animate-scale-in" />}
        {item.status === "IN_PROGRESS" && <Loader2 size={14} className="animate-spin" />}
        {item.status === "TODO" && <Circle size={14} />}
      </span>
      <div className="flex-1">
        <span
          className={clsx(
            "block text-sm font-medium",
            item.status === "COMPLETED" && "line-through text-[var(--text-secondary)]",
            // IN_PROGRESS keeps its card on a fixed light bg-brand-50 in both
            // themes — the default (theme-flipping) text color would go
            // near-white-on-light in dark mode, same bug as the quiz options.
            item.status === "IN_PROGRESS" && "text-brand-700"
          )}
        >
          {item.subject?.name ?? item.title}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {item.status === "COMPLETED"
            ? formatCompletedDuration(item.actualSeconds, item.actualMinutes, t)
            : `${item.minutes} ${t("schedule.minutes")}`}
        </span>

        <div className="mt-1.5">
          {item.status === "TODO" && (
            <span className="text-xs text-[var(--text-secondary)]">{t("schedule.pendingHint")}</span>
          )}
          {item.status === "IN_PROGRESS" && (
            <span className="text-xs font-semibold text-brand-600">{t("schedule.inProgress")}</span>
          )}
          {item.status === "COMPLETED" && (
            <span className="text-xs font-semibold text-emerald-600">
              {t("schedule.completedLabel")}
              {item.lastScore != null && <> — {item.lastScore}%</>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Schedule() {
  const { t } = useTranslation();
  const DAY_LABELS = ["", ...(t("schedule.days", { returnObjects: true }) as string[])];
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<ScheduleItem[]>({
    queryKey: ["schedule-current"],
    queryFn: scheduleApi.getCurrentWeek,
  });
  const [regenerating, setRegenerating] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await scheduleApi.regenerate();
      await queryClient.invalidateQueries({ queryKey: ["schedule-current"] });
    } finally {
      setRegenerating(false);
    }
  };

  const byDay = (data ?? []).reduce<Record<number, ScheduleItem[]>>((acc, item) => {
    (acc[item.dayOfWeek] ??= []).push(item);
    return acc;
  }, {});

  const jsDay = new Date().getDay();
  const todayIso = jsDay === 0 ? 7 : jsDay;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("schedule.title")}</h1>
        <Button variant="secondary" onClick={regenerate} loading={regenerating}>
          <RefreshCw size={16} className="inline mr-1.5" /> {t("schedule.regenerate")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : isError ? (
        <ErrorState message={t("schedule.errorLoad")} onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="📅" title={t("schedule.emptyTitle")} description={t("schedule.emptyDesc")} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const items = byDay[day];
            if (!items?.length) return null;
            const doneCount = items.filter((i) => i.status === "COMPLETED").length;
            const isToday = day === todayIso;
            return (
              <Card key={day} className={clsx(isToday && "ring-2 ring-brand-400")}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{DAY_LABELS[day]}</p>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-gradient text-white px-2 py-0.5 rounded-full">
                        {t("schedule.today")}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {doneCount}/{items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <ScheduleCard key={item.id} item={item} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
