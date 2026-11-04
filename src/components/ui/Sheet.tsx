"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/** iOS-style bottom sheet on mobile, centered dialog on larger screens. Focus-trapped, Esc to close. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("[data-autofocus], button, input, select, textarea")?.focus(), 30);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-walkie-ink/30 backdrop-blur-[2px] animate-fade-up" aria-label="Close" onClick={onClose} />
      <div ref={ref} className={`relative max-h-[90dvh] w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} animate-fade-up overflow-hidden rounded-t-[32px] bg-walkie-light shadow-lift sm:rounded-[32px]`}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-walkie-gray sm:hidden" />
        {title && (
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white text-walkie-slate shadow-card" aria-label="Close"><Icon name="close" size={18} /></button>
          </div>
        )}
        <div className="max-h-[70dvh] overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-walkie-gray/60 bg-white px-5 py-4 pb-[calc(16px+var(--safe-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
