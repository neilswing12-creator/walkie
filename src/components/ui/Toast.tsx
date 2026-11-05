"use client";
import { sfx } from "@/lib/client/sfx";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    if (kind === "error") sfx("error");
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(12px+var(--safe-top))] z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex max-w-sm animate-pop items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lift ${t.kind === "error" ? "bg-rose-50 text-rose-700" : t.kind === "success" ? "bg-white text-walkie-ink" : "bg-walkie-ink text-white"}`}>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${t.kind === "error" ? "bg-rose-100" : t.kind === "success" ? "bg-emerald-100 text-emerald-600" : "bg-white/15"}`}>
              <Icon name={t.kind === "error" ? "info" : t.kind === "success" ? "check" : "sparkle"} size={14} strokeWidth={2.6} />
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
