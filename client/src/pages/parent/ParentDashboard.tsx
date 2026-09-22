import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sparkles, BarChart3 } from "lucide-react";
import { parentApi } from "../../lib/api";
import { Card, EmptyState, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";

type Child = { id: string; grade: number; user: { fullName: string } };
type DailyTrendPoint = { date: string; studyMinutes: number };
type QuizHistoryItem = { subjectCode: string; subjectName: string; score: number; attemptDate: string };
type ChildDashboard = {
  fullName: string;
  grade: number;
  streakDays: number;
  weeklyStudyMinutes: number;
  dailyTrend: DailyTrendPoint[];
  quizHistory: QuizHistoryItem[];
  strongSubjects: string[];
  attentionAreas: string[];
};
type Report = { summary: string; strengths: string[]; attentionAreas: string[]; nextSteps: string[] };

export default function ParentDashboard() {
  const { t, i18n } = useTranslation();
  const children = useQuery<Child[]>({ queryKey: ["parent-children"], queryFn: parentApi.listChildren });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? children.data?.[0]?.id ?? null;

  const childDashboard = useQuery<ChildDashboard>({
    queryKey: ["parent-child-dashboard", activeId],
    queryFn: () => parentApi.getChildDashboard(activeId!),
    enabled: !!activeId,
  });

  const [report, setReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const QUIZ_HISTORY_COLLAPSED_COUNT = 5;
  const reportContextRef = useRef<{ studentId: string | null; language: string }>({
    studentId: activeId,
    language: i18n.language,
  });
  const reportRequestRef = useRef(0);

  // A report belongs to both the selected student and the current UI language.
  // Clear stale report state whenever either context changes so an old child's
  // analysis can never remain visible after switching students/languages.
  useEffect(() => {
    reportRequestRef.current += 1;
    reportContextRef.current = { studentId: activeId, language: i18n.language };
    setReport(null);
    setGenerating(false);
    setShowAllQuizzes(false);
  }, [activeId, i18n.language]);

  const generateReport = async () => {
    if (!activeId) return;
    const requestStudentId = activeId;
    const requestLanguage = i18n.language;
    const requestId = ++reportRequestRef.current;
    setGenerating(true);
    setReport(null);
    try {
      const res = await parentApi.generateReport(requestStudentId);
      const currentContext = reportContextRef.current;
      if (
        requestId === reportRequestRef.current &&
        currentContext.studentId === requestStudentId &&
        currentContext.language === requestLanguage
      ) {
        setReport(res as unknown as Report);
      }
    } finally {
      if (requestId === reportRequestRef.current) setGenerating(false);
    }
  };

  if (children.isLoading) return <Skeleton className="h-40" />;
  if ((children.data ?? []).length === 0) {
    return <EmptyState icon="👨‍👩‍👧" title={t("parent.noChildTitle")} description={t("parent.noChildDesc")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {children.data!.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.data!.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`text-sm font-semibold px-4 py-2 rounded-full border ${
                activeId === c.id ? "bg-brand-500 text-white border-brand-500" : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {c.user.fullName}
            </button>
          ))}
        </div>
      )}

      {childDashboard.isLoading ? (
        <Skeleton className="h-48" />
      ) : childDashboard.data ? (
        <>
          <h1 className="text-2xl font-bold">{t("parent.progressTitle")} — {childDashboard.data.fullName}</h1>

          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t("parent.weeklyStudy")}</p>
              <p className="text-2xl font-bold">{childDashboard.data.weeklyStudyMinutes} {t("parent.minutes")}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t("parent.currentStreak")}</p>
              <p className="text-2xl font-bold">{childDashboard.data.streakDays} {t("parent.days")}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t("parent.grade")}</p>
              <p className="text-2xl font-bold">{childDashboard.data.grade}</p>
            </Card>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <p className="font-semibold mb-3">🌟 {t("parent.strongSubjects")}</p>
              {childDashboard.data.strongSubjects.length ? (
                <ul className="text-sm text-[var(--text-secondary)] flex flex-col gap-1">
                  {childDashboard.data.strongSubjects.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{t("parent.notDeterminedYet")}</p>
              )}
            </Card>
            <Card>
              <p className="font-semibold mb-3">📚 {t("parent.attentionNeeded")}</p>
              {childDashboard.data.attentionAreas.length ? (
                <ul className="text-sm text-[var(--text-secondary)] flex flex-col gap-1">
                  {childDashboard.data.attentionAreas.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{t("parent.notDeterminedYet")}</p>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-brand-500" />
              <p className="font-semibold">{t("parent.activityTrend")}</p>
            </div>
            {childDashboard.data.dailyTrend.length === 0 ? (
              <EmptyState title={t("parent.noActivityTitle")} description={t("parent.noActivityDesc")} />
            ) : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <LineChart
                    data={childDashboard.data.dailyTrend.map((d) => ({
                      date: new Date(d.date).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" }),
                      minutes: d.studyMinutes,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="minutes" stroke="#6c3ffb" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <p className="font-semibold mb-4">{t("parent.quizHistoryTitle")}</p>
            {childDashboard.data.quizHistory.length === 0 ? (
              <EmptyState title={t("parent.noQuizzesTitle")} description={t("parent.noQuizzesDesc")} />
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {childDashboard.data.quizHistory
                    .slice()
                    .reverse()
                    .slice(0, showAllQuizzes ? undefined : QUIZ_HISTORY_COLLAPSED_COUNT)
                    .map((q, i) => (
                      <div
                        key={`${q.subjectCode}-${q.attemptDate}-${i}`}
                        className="flex items-center justify-between text-sm border-b border-[var(--border-subtle)] last:border-b-0 pb-2 last:pb-0"
                      >
                        <span>{q.subjectName}</span>
                        <span className="text-[var(--text-secondary)]">
                          {new Date(q.attemptDate).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" })}
                        </span>
                        <span className="font-semibold text-brand-600">{Math.round(q.score)}%</span>
                      </div>
                    ))}
                </div>
                {childDashboard.data.quizHistory.length > QUIZ_HISTORY_COLLAPSED_COUNT && (
                  <button
                    onClick={() => setShowAllQuizzes((v) => !v)}
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700 mt-3"
                  >
                    {showAllQuizzes
                      ? t("parent.showLessResults")
                      : t("parent.showMoreResults", { count: childDashboard.data.quizHistory.length - QUIZ_HISTORY_COLLAPSED_COUNT })}
                  </button>
                )}
              </>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-brand-500" />
              <p className="font-semibold">{t("parent.aiReport")}</p>
            </div>
            {report ? (
              <div className="flex flex-col gap-3 text-sm">
                <p>{report.summary}</p>
                <p>
                  <span className="font-semibold">🎯 {t("parent.nextSteps")}:</span> {report.nextSteps.join(", ")}
                </p>
              </div>
            ) : (
              <Button variant="secondary" onClick={generateReport} loading={generating}>
                {t("parent.generateReport")}
              </Button>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
