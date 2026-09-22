import { FormEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Sparkles, Send } from "lucide-react";
import { chatApi } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/primitives";

export default function AIChat() {
  const { t } = useTranslation();
  const SUGGESTIONS = [t("aiChat.suggestion1"), t("aiChat.suggestion2"), t("aiChat.suggestion3")];
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["chat-history"], queryFn: chatApi.getHistory });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.data?.messages.length, sending]);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");
    // Optimistic append so the UI feels instant while the request is in flight.
    queryClient.setQueryData(["chat-history"], (old: any) => ({
      ...old,
      messages: [...(old?.messages ?? []), { id: `temp-${Date.now()}`, role: "USER", content: text }],
    }));
    try {
      await chatApi.sendMessage(text);
      await queryClient.invalidateQueries({ queryKey: ["chat-history"] });
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="font-bold text-lg">{t("aiChat.title")}</h1>
          <p className="text-xs text-emerald-600 font-medium">● {t("aiChat.online")}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {history.isLoading ? (
          <>
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="h-16 w-2/3 ml-auto" />
          </>
        ) : (
          history.data?.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "USER" ? "self-end bg-brand-gradient text-white" : "self-start bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
        {sending && (
          <div className="self-start bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-sm text-[var(--text-secondary)]">
            {t("aiChat.typing")}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!history.isLoading && (history.data?.messages.length ?? 0) === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-sm bg-brand-50 text-brand-700 rounded-full px-3.5 py-2 hover:bg-brand-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("aiChat.placeholder")}
          className="input-field flex-1"
          aria-label={t("aiChat.messageLabel")}
        />
        <Button type="submit" loading={sending} className="!p-3.5" aria-label={t("aiChat.sendLabel")}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
