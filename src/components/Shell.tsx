"use client";
// 全部の画面の枠：料理の写真の帯と見出し、4つのタブ、期間と日次・週次の切り替え、右下の「この画面で取れるもの」
import { BookOpen, CalendarDays } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CHANNEL_NAME, LAST_DAY, PERIODS, fmtDate, fromDay } from "@/lib/fakeData";
import { usePrefs } from "@/lib/prefs";
import { AvailPanel } from "./Avail";

const TABS = [
  { href: "/", label: "チャンネルの概要" },
  { href: "/videos", label: "動画の比較と推移" },
  { href: "/search", label: "検索キーワード" },
  { href: "/audience", label: "視聴者" },
];
const BAND = ["salad-chicken", "kabocha", "tonjiru", "napolitan", "nasu-miso", "curry", "miso-soup", "hamburg"];

export function Header() {
  const path = usePathname();
  return (
    <header>
      <div className="relative h-[184px] overflow-hidden bg-ink sm:h-[208px]">
        <div className="absolute inset-0 grid grid-cols-4 sm:grid-cols-8" aria-hidden>
          {BAND.map((p, i) => (
            <div key={p} className={`relative ${i >= 4 ? "hidden sm:block" : ""}`}>
              <Image src={`/photos/${p}.jpg`} alt="" fill sizes="(min-width: 640px) 12.5vw, 25vw" className="object-cover" priority={i < 4} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/10" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-5 sm:px-6">
          <p className="mb-1 text-[12px] font-bold tracking-[0.14em] text-white/80">YouTube 分析レポート｜デモ版</p>
          <h1 className="text-[22px] leading-snug font-black text-white sm:text-[30px]">毎朝、昨日までの数字がそろっているレポート。</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/90">
            <span className="inline-flex items-center gap-2 font-bold">
              <span className="relative size-6 overflow-hidden rounded-full ring-2 ring-white/70">
                <Image src="/photos/hero-kitchen.jpg" alt="" fill sizes="24px" className="object-cover" />
              </span>
              {CHANNEL_NAME}
            </span>
            <span className="inline-flex items-center gap-1 text-white/80">
              <CalendarDays className="size-3.5" aria-hidden />
              {fmtDate(fromDay(LAST_DAY))}までのデータ（毎朝の自動の更新）
            </span>
          </div>
        </div>
      </div>
      <nav className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur" aria-label="レポートのページ">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-2 sm:px-4" data-testid="tabs">
          {TABS.map((t) => {
            const on = t.href === path;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative px-3 py-3 text-[14px] font-bold whitespace-nowrap transition ${on ? "text-ink" : "text-sub hover:text-ink"}`}
              >
                {t.label}
                {on && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />}
              </Link>
            );
          })}
          <Link href="/about" className={`ml-auto inline-flex items-center gap-1 px-3 py-3 text-[13px] font-bold whitespace-nowrap ${path === "/about" ? "text-accent" : "text-sub hover:text-ink"}`}>
            <BookOpen className="size-4" aria-hidden />
            このデモについて
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function Controls({ grain = true, extra }: { grain?: boolean; extra?: ReactNode }) {
  const [prefs, set] = usePrefs();
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="controls">
      <div className="seg" role="group" aria-label="期間">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" aria-pressed={prefs.period === p.id} onClick={() => set({ period: p.id })} data-testid={`period-${p.id}`}>
            {p.label}
          </button>
        ))}
      </div>
      {grain && (
        <div className="seg" role="group" aria-label="日次と週次">
          {(
            [
              ["day", "日次"],
              ["week", "週次"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={prefs.grain === id} onClick={() => set({ grain: id })} data-testid={`grain-${id}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {extra}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 pb-20 text-[12px] leading-relaxed text-sub sm:px-6">
        <p>
          <b>納品は Looker Studio で、この画面と同じ構成で作ります。数値はすべて架空です。</b>本物の YouTube には接続していません。チャンネルと動画はすべて架空です。
        </p>
        <p>
          写真：
          <a className="underline underline-offset-2" href="https://www.pakutaso.com/" target="_blank" rel="noreferrer">
            ぱくたそ（www.pakutaso.com）
          </a>
          のフリー素材（料理と台所の写真）
        </p>
      </div>
    </footer>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">{children}</main>
      <Footer />
      <AvailPanel />
    </>
  );
}

/** 見出しと印を並べたカード */
export function Card({ title, sub, badges, children, className = "", testid }: { title: string; sub?: ReactNode; badges?: ReactNode; children: ReactNode; className?: string; testid?: string }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`} data-testid={testid}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15.5px] leading-snug font-black">{title}</h2>
          {sub && <div className="mt-0.5 text-[12.5px] leading-relaxed text-sub">{sub}</div>}
        </div>
        {badges && <div className="flex shrink-0 flex-wrap justify-end gap-1">{badges}</div>}
      </div>
      {children}
    </section>
  );
}
