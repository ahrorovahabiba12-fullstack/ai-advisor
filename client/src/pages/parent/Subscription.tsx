import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Crown, Info } from "lucide-react";
import { subscriptionApi } from "../../lib/api";
import { Card, Badge, Skeleton, ErrorState } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";

const BENEFIT_KEYS = ["benefit1", "benefit2", "benefit3", "benefit4"] as const;

export default function Subscription() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: subscriptionApi.getStatus,
  });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const plan = data?.plan ?? "FREE";
  const status = data?.status ?? "ACTIVE";
  const isPremium = plan === "PREMIUM" && status !== "CANCELED";

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["subscription-status"] });

  const upgrade = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { reference } = await subscriptionApi.startUpgrade();
      const { success } = await subscriptionApi.confirmUpgrade(reference);
      if (success) {
        setNotice({ tone: "success", text: t("subscription.upgradeSuccess") });
        refresh();
      } else {
        setNotice({ tone: "error", text: t("subscription.error") });
      }
    } catch {
      setNotice({ tone: "error", text: t("subscription.error") });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm(t("subscription.cancelConfirm"))) return;
    setBusy(true);
    setNotice(null);
    try {
      await subscriptionApi.cancel();
      setNotice({ tone: "success", text: t("subscription.cancelSuccess") });
      refresh();
    } catch {
      setNotice({ tone: "error", text: t("subscription.error") });
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = {
    ACTIVE: t("subscription.statusActive"),
    CANCELED: t("subscription.statusCanceled"),
    PAST_DUE: t("subscription.statusPastDue"),
    TRIALING: t("subscription.statusTrialing"),
  }[status];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">{t("subscription.title")}</h1>
      <p className="text-[var(--text-secondary)] mb-6">{t("subscription.subtitle")}</p>

      {isLoading ? (
        <Skeleton className="h-56" />
      ) : isError ? (
        <ErrorState message={t("subscription.error")} onRetry={() => refetch()} />
      ) : (
        <>
          <Card className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {isPremium && <Crown size={20} className="text-amber-500" />}
                <span className="font-semibold">{t("subscription.currentPlan")}:</span>
                <Badge tone={isPremium ? "brand" : "success"}>
                  {isPremium ? t("subscription.planPremium") : t("subscription.planFree")}
                </Badge>
              </div>
              <Badge tone={status === "ACTIVE" ? "success" : status === "CANCELED" ? "danger" : "warning"}>
                {statusLabel}
              </Badge>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
              {isPremium ? t("subscription.premiumDesc") : t("subscription.freeDesc")}
            </p>

            {isPremium && data?.renewsAt && (
              <p className="text-sm">
                <span className="text-[var(--text-secondary)]">{t("subscription.renewsAt")}: </span>
                <span className="font-medium">{new Date(data.renewsAt).toLocaleDateString()}</span>
              </p>
            )}

            {notice && (
              <p className={`text-sm font-medium ${notice.tone === "success" ? "text-emerald-600" : "text-danger"}`}>
                {notice.text}
              </p>
            )}

            {isPremium ? (
              <Button variant="secondary" onClick={cancel} loading={busy} className="self-start">
                {busy ? t("subscription.canceling") : t("subscription.cancelButton")}
              </Button>
            ) : (
              <Button onClick={upgrade} loading={busy} className="self-start">
                {busy ? t("subscription.upgrading") : t("subscription.upgradeButton")}
              </Button>
            )}
          </Card>

          {!isPremium && (
            <Card className="flex flex-col gap-3">
              <p className="font-semibold">{t("subscription.benefitsTitle")}</p>
              <ul className="flex flex-col gap-2">
                {BENEFIT_KEYS.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-emerald-600 shrink-0" />
                    {t(`subscription.${key}`)}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <p className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-4">
            <Info size={13} /> {t("subscription.mockNotice")}
          </p>
        </>
      )}
    </div>
  );
}
