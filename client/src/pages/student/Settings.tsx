import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { ThemeToggle } from "../../components/layout/ThemeToggle";

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = async () => {
    if (!window.confirm(t("settings.confirmLogout"))) return;
    try {
      await authApi.logout();
    } catch {
      // Logging out locally still succeeds even if the network call fails.
    }
    clearSession();
    navigate("/login");
  };

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card className="flex items-center justify-between">
        <span className="font-medium">{t("settings.language")}</span>
        <LanguageSwitcher />
      </Card>

      <Card className="flex items-center justify-between">
        <span className="font-medium">{t("settings.appearance")}</span>
        <ThemeToggle />
      </Card>

      <Card>
        <Button variant="secondary" onClick={handleLogout} className="text-danger border-red-200">
          <LogOut size={16} className="inline mr-1.5" /> {t("settings.logout")}
        </Button>
      </Card>
    </div>
  );
}
