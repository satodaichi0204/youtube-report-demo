"use client";
// 「取れる」「条件つき」「取れない」の印。押すと、短い説明と代わりの案が出る。色だけに頼らず、記号と文字を必ず添える
import { Ban, CircleCheck, ListChecks, TriangleAlert, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AVAIL, GROUP_LABEL, KIND_LABEL, availById, type AvailItem, type AvailKind, type Group } from "@/lib/avail";

const STYLE: Record<AvailKind, string> = {
  ok: "border-ok/25 bg-ok-soft text-ok",
  cond: "border-cond-mark/60 bg-cond-soft text-cond",
  no: "border-no/25 bg-no-soft text-no",
};
export function KindIcon({ kind, className = "size-3.5" }: { kind: AvailKind; className?: string }) {
  if (kind === "ok") return <CircleCheck className={className} aria-hidden />;
  if (kind === "cond") return <TriangleAlert className={className} aria-hidden />;
  return <Ban className={className} aria-hidden />;
}
export function KindChip({ kind }: { kind: AvailKind }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap ${STYLE[kind]}`}>
      <KindIcon kind={kind} />
      {KIND_LABEL[kind]}
    </span>
  );
}

function Explain({ item }: { item: AvailItem }) {
  return (
    <>
      <p className="text-[13px] leading-relaxed">{item.note}</p>
      {item.alt && (
        <p className="mt-2 rounded-lg bg-paper px-2.5 py-2 text-[13px] leading-relaxed">
          <b className="mr-1">代わりの案</b>
          {item.alt}
        </p>
      )}
      {item.api && <p className="mt-2 text-[11.5px] leading-snug break-all text-mute">{item.api}</p>}
    </>
  );
}

/** グラフとカードの右上に置く印 */
/** compact：スマートフォンの幅では記号だけにする（狭いカードで見出しを押し出さないため。読み上げの文字は残す） */
export function AvailBadge({ id, align = "right", compact = false }: { id: string; align?: "left" | "right"; compact?: boolean }) {
  const item = availById(id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popId = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        data-testid={`avail-${id}`}
        aria-expanded={open}
        aria-controls={popId}
        aria-label={`${KIND_LABEL[item.kind]}：${item.label}の説明`}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap transition hover:brightness-95 ${STYLE[item.kind]}`}
      >
        <KindIcon kind={item.kind} />
        <span className={compact ? "max-sm:sr-only" : ""}>{KIND_LABEL[item.kind]}</span>
      </button>
      {open && (
        <div
          id={popId}
          role="dialog"
          aria-label={item.label}
          data-testid={`avail-pop-${id}`}
          className={`rise absolute top-full z-40 mt-2 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-line bg-white p-3.5 text-ink shadow-lift ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <b className="text-[13.5px] leading-snug">{item.label}</b>
            <KindChip kind={item.kind} />
          </div>
          <Explain item={item} />
        </div>
      )}
    </div>
  );
}

/** 画面の右下の「この画面で取れるもの」：①②③の全部を、印と一緒に一覧で見る */
export function AvailPanel() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        data-testid="avail-panel-open"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white shadow-lift transition hover:bg-black"
      >
        <ListChecks className="size-4" aria-hidden />
        この画面で取れるもの
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-label="この画面で取れるもの"
            data-testid="avail-panel"
            onClick={(e) => e.stopPropagation()}
            className="rise h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-lift"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-black">この画面で取れるもの</h2>
              <button type="button" className="btn px-2 py-1.5" aria-label="閉じる" onClick={() => setOpen(false)}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mb-4 text-[12.5px] text-sub">公開されている仕様にもとづく整理です。ご契約の後に、依頼者のチャンネルで実際に確かめます。</p>
            <AvailList />
          </aside>
        </div>
      )}
    </>
  );
}

export function AvailList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-5">
      {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
        <section key={g}>
          <h3 className="mb-2 text-[14px] font-black">{GROUP_LABEL[g]}</h3>
          <ul className="space-y-2">
            {AVAIL.filter((a) => a.group === g).map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-3" data-kind={a.kind}>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <b className="text-[13.5px] leading-snug">{a.label}</b>
                  <KindChip kind={a.kind} />
                </div>
                {compact ? <p className="text-[13px] leading-relaxed text-sub">{a.alt ?? a.note}</p> : <Explain item={a} />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
