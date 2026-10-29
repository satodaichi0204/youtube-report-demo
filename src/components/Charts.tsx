"use client";
// グラフの部品（Recharts）。配色と線の太さは dataviz の決まりに従う：
// 線は2px、棒は24pxまでで先だけ角を丸める、目盛りの線は細く目立たせない、文字は系列の色を使わない
import Image from "next/image";
import { useSyncExternalStore, type ReactNode } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AGE_GENDER, fmtInt, fmtShort, type CompareRow, type Point } from "@/lib/fakeData";

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"]; // カテゴリーの順は固定（選んだ順の枠に色が付き、外しても他の色は変わらない）
const S1_SOFT = "#9ec5f4";
const GRID = "#ebe8e3";
const AXIS = { fontSize: 11, fill: "#8a857d" };

const narrowQuery = "(max-width: 639px)";
const subscribeNarrow = (l: () => void) => {
  const m = window.matchMedia(narrowQuery);
  m.addEventListener("change", l);
  return () => m.removeEventListener("change", l);
};
/** スマートフォンの幅では、軸の目盛りを減らす */
export const useNarrow = () => useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);

export const compact = (n: number) => (n >= 10_000 ? `${(n / 10_000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万` : n.toLocaleString("ja-JP"));

function Tip({ title, rows, note }: { title: ReactNode; rows: { color?: string; label: string; value: string }[]; note?: ReactNode }) {
  return (
    <div className="max-w-[16rem] rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] shadow-lift">
      <div className="mb-1 font-bold">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-sub">
            {r.color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />}
            <span className="truncate">{r.label}</span>
          </span>
          <b className="num whitespace-nowrap">{r.value}</b>
        </div>
      ))}
      {note && <div className="mt-1 text-[11.5px] text-cond">{note}</div>}
    </div>
  );
}

type TipProps = { active?: boolean; payload?: readonly { payload?: unknown }[] };

/** チャンネル全体の推移。直近の3日（確定前）は薄い色で描く */
export function TrendChart({ points, grain, metric }: { points: Point[]; grain: "day" | "week"; metric: "views" | "minutes" }) {
  const narrow = useNarrow();
  const val = (p: Point) => (metric === "views" ? p.views : Math.round(p.minutes / 60));
  const unit = metric === "views" ? "回" : "時間";
  const firstProv = points.findIndex((p) => p.provisional);
  const data = points.map((p, i) => ({
    ...p,
    v: val(p),
    confirmed: p.provisional ? null : val(p),
    // 確定前の線は、直前の確定した点からつなぐ
    prov: p.provisional || (firstProv > 0 && i === firstProv - 1) ? val(p) : null,
  }));
  const tick = (k: string) => fmtShort(k);
  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as Point & { v: number };
    const title = grain === "day" ? p.key : `${p.key}からの週${p.partial ? "（途中）" : ""}`;
    return <Tip title={title} rows={[{ label: metric === "views" ? "再生回数" : "総再生時間", value: `${fmtInt(p.v)}${unit}` }]} note={p.provisional ? "確定前（2〜3日で確定します）" : undefined} />;
  };
  const common = { data, margin: { top: 8, right: 8, bottom: 0, left: 0 } };
  const axes = (
    <>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey="key" tickFormatter={tick} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={narrow ? 36 : 24} />
      <YAxis tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} width={narrow ? 40 : 48} tickCount={narrow ? 4 : 5} />
    </>
  );
  return (
    <div className="h-[260px] w-full sm:h-[300px]" data-testid="trend-chart">
      <ResponsiveContainer>
        {grain === "day" ? (
          <ComposedChart {...common}>
            {axes}
            {firstProv >= 0 && <ReferenceArea x1={data[firstProv].key} x2={data[data.length - 1].key} fill={S1_SOFT} fillOpacity={0.18} ifOverflow="extendDomain" label={{ value: "確定前", position: "insideTop", fill: "#5b5751", fontSize: 11, fontWeight: 700 }} />}
            <Tooltip content={tip} cursor={{ stroke: "#b3afa7", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="confirmed" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.1} connectNulls={false} isAnimationActive={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
            <Line type="monotone" dataKey="prov" stroke={S1_SOFT} strokeWidth={2} dot={{ r: 4, fill: S1_SOFT, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} activeDot={{ r: 5 }} />
          </ComposedChart>
        ) : (
          <BarChart {...common}>
            {axes}
            <Tooltip content={tip} cursor={{ fill: "#f2efea" }} />
            <Bar dataKey="v" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((p) => (
                <Cell key={p.key} fill={p.provisional ? S1_SOFT : SERIES[0]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** 2〜3本の動画の比較。凡例は必ず出し、色だけに頼らない */
export function CompareChart({ rows, ids, names, slots }: { rows: CompareRow[]; ids: string[]; names: Record<string, string>; slots: Record<string, number> }) {
  const narrow = useNarrow();
  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload as CompareRow;
    return (
      <Tip
        title={r.label}
        rows={ids.map((id) => ({ color: SERIES[slots[id]], label: names[id], value: r[id] === null ? "—" : `${fmtInt(r[id] as number)}回` }))}
        note={r.provisional ? "確定前の日を含みます" : undefined}
      />
    );
  };
  return (
    <div className="h-[280px] w-full sm:h-[320px]" data-testid="compare-chart">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={narrow ? 36 : 22} />
          <YAxis tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} width={narrow ? 40 : 48} tickCount={narrow ? 4 : 5} />
          <Tooltip content={tip} cursor={{ stroke: "#b3afa7", strokeWidth: 1 }} />
          {ids.map((id) => (
            <Line key={id} type="monotone" dataKey={id} name={names[id]} stroke={SERIES[slots[id]]} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 年齢と性別ごとの視聴者の割合（%） */
export function AgeGenderChart() {
  const narrow = useNarrow();
  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload as (typeof AGE_GENDER)[number];
    return (
      <Tip
        title={`${r.age}歳`}
        rows={[
          { color: SERIES[0], label: "女性", value: `${r.female.toFixed(1)}%` },
          { color: SERIES[1], label: "男性", value: `${r.male.toFixed(1)}%` },
        ]}
      />
    );
  };
  return (
    <div className="h-[240px] w-full" data-testid="age-gender-chart">
      <ResponsiveContainer>
        <BarChart data={AGE_GENDER} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="age" tick={{ ...AXIS, fontSize: narrow ? 10 : 11 }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={AXIS} tickLine={false} axisLine={false} width={36} tickCount={4} />
          <Tooltip content={tip} cursor={{ fill: "#f2efea" }} />
          <Bar dataKey="female" fill={SERIES[0]} maxBarSize={18} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="male" fill={SERIES[1]} maxBarSize={18} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-sub">
      {items.map((i) => (
        <li key={i.label} className="flex min-w-0 items-center gap-1.5">
          <span className="h-[3px] w-4 shrink-0 rounded-full" style={{ background: i.color }} />
          <span className="truncate">{i.label}</span>
        </li>
      ))}
    </ul>
  );
}

export type BarItem = { label: string; value: number; sub?: string; tone?: "main" | "outside" | "muted" };
/** 横棒の一覧（日本語の長いラベルでも読めるよう、HTML で描く）。値は棒の先に出す。max を超える棒は、途中を省略した印を付けて描く */
export function BarList({ items, unit = "回", testid, max }: { items: BarItem[]; unit?: string; testid?: string; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="space-y-1.5" data-testid={testid}>
      {items.map((i, k) => (
        <li key={i.label + k} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-x-3 gap-y-0.5 text-[13px] max-sm:grid-cols-1" data-tone={i.tone ?? "main"} title={`${i.label}：${fmtInt(i.value)}${unit}`}>
          <span className={`truncate ${i.tone === "outside" ? "font-bold" : ""}`}>
            {i.sub && <span className="num mr-1.5 inline-block w-5 text-right text-[11.5px] text-mute">{i.sub}</span>}
            {i.label}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="relative h-3.5 min-w-[3px] rounded-r-[4px]" style={{ width: `${Math.min(100, Math.max(0.6, (i.value / top) * 100)) * 0.82}%`, background: i.tone === "outside" ? "repeating-linear-gradient(135deg,#b3afa7 0 4px,#cfcbc4 4px 8px)" : i.tone === "muted" ? "#b3afa7" : SERIES[0] }}>
              {i.value > top && <span className="absolute inset-y-[-3px] right-[18%] w-[5px] -skew-x-[20deg] border-x-2 border-white bg-white" data-testid="bar-break" aria-hidden />}
            </span>
            <span className="num shrink-0 text-[12px] text-sub">
              {fmtInt(i.value)}
              {unit}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Thumb({ photo, durationSec, className = "w-28" }: { photo: string; durationSec?: number; className?: string }) {
  return (
    <span className={`relative block aspect-video shrink-0 overflow-hidden rounded-lg bg-paper ${className}`}>
      <Image src={`/photos/${photo}.jpg`} alt="" fill sizes="160px" className="object-cover" />
      {durationSec !== undefined && (
        <span className="num absolute right-1 bottom-1 rounded bg-black/75 px-1 text-[10.5px] leading-4 font-bold text-white">
          {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}
        </span>
      )}
    </span>
  );
}
