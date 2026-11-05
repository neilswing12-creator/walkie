"use client";
/**
 * Makes every horizontal scroller (`.no-scrollbar` rows: tab bars, chips, carousels) usable with a mouse, not just touch:
 *  · vertical wheel / trackpad scroll moves the row sideways while it can still scroll that way
 *  · click-and-drag scrolls it (a drag never fires the click underneath)
 *  · fade edges appear on the side(s) that have more content (`data-more="l|r|lr"`, styled in globals.css)
 *  · the selected tab/chip (aria-selected / aria-checked / aria-current) is scrolled into view
 * One document-level listener set — no per-component wiring.
 */
import { initSfx } from "@/lib/client/sfx";
import { useEffect } from "react";

const ROW = ".no-scrollbar";
const scrollable = (el: Element | null) => {
  const r = el?.closest(ROW) as HTMLElement | null;
  return r && r.scrollWidth > r.clientWidth + 1 ? r : null;
};
function mark(r: HTMLElement) {
  const l = r.scrollLeft > 2, rr = r.scrollLeft + r.clientWidth < r.scrollWidth - 2;
  const v = l && rr ? "lr" : l ? "l" : rr ? "r" : "";
  if (r.dataset.more !== v) r.dataset.more = v;
}
const markAll = () => document.querySelectorAll<HTMLElement>(ROW).forEach(mark);

export function ScrollAssist() {
  useEffect(() => { initSfx(); }, []);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // pinch-zoom or a real horizontal gesture
      const r = scrollable(e.target as Element);
      if (!r) return;
      const max = r.scrollWidth - r.clientWidth;
      if ((e.deltaY < 0 && r.scrollLeft <= 0) || (e.deltaY > 0 && r.scrollLeft >= max - 1)) return; // let the page scroll
      e.preventDefault();
      r.scrollLeft += e.deltaY;
    };
    let drag: { r: HTMLElement; x: number; left: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const r = scrollable(e.target as Element);
      if (r) drag = { r, x: e.clientX, left: r.scrollLeft, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) drag.moved = true;
      if (drag.moved) { drag.r.scrollLeft = drag.left - dx; drag.r.style.cursor = "grabbing"; }
    };
    const onUp = () => {
      if (!drag) return;
      const { r, moved } = drag; drag = null; r.style.cursor = "";
      if (moved) { const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener("click", stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0); }
    };
    const onScroll = (e: Event) => { const t = e.target as HTMLElement; if (t instanceof HTMLElement && t.matches?.(ROW)) mark(t); };
    const reveal = () => document.querySelectorAll<HTMLElement>(ROW).forEach((r) => {
      const sel = r.querySelector<HTMLElement>('[aria-selected="true"],[aria-checked="true"],[aria-current="page"],[aria-pressed="true"]');
      if (sel && r.scrollWidth > r.clientWidth) {
        const a = sel.offsetLeft - r.offsetLeft, b = a + sel.offsetWidth;
        if (a < r.scrollLeft || b > r.scrollLeft + r.clientWidth) r.scrollTo({ left: Math.max(0, a - 24), behavior: "smooth" });
      }
      mark(r);
    });
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", markAll);
    const mo = new MutationObserver(() => requestAnimationFrame(reveal));
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-checked", "aria-current", "aria-pressed"] });
    reveal();
    return () => {
      document.removeEventListener("wheel", onWheel); document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
      document.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", markAll); mo.disconnect();
    };
  }, []);
  return null;
}
