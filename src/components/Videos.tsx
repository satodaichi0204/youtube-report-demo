"use client";
// ② 動画の比較と推移：一覧（並べ替え）、2〜3本を選んで同じグラフで比べる（日付でそろえる／公開日からの日数でそろえる）
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { compareSeries, fmtDate, fmtDuration, fmtInt, videoById, videoStats, type Align, type VideoStat } from "@/lib/fakeData";
import { usePrefs } from "@/lib/prefs";
import { AvailBadge } from "./Avail";
import { CompareChart, Legend, SERIES, Thumb } from "./Charts";
import { Card, Controls } from "./Shell";

type SortKey = "publishedAt" | "views" | "avgViewDuration" | "avgViewPercentage";
const COLS: { key: SortKey; label: string }[] = [
  { key: "publishedAt", label: "公開日" },
  { key: "views", label: "再生回数" },
  { key: "avgViewDuration", label: "平均視聴時間" },
  { key: "avgViewPercentage", label: "平均視聴率" },
];
// 最初に選んでおく3本：おすすめで伸びた動画、検索で長く見られる動画、公開直後に伸びる動画
export const DEFAULT_COMPARE = ["demo_v25", "demo_v07", "demo_v27"];
const MAX = 3;

const sortVal = (s: VideoStat, k: SortKey) => (k === "publishedAt" ? s.video.publishedAt : s[k]);

export default function Videos() {
  const [{ period, grain }] = usePrefs();
  const params = useSearchParams();
  const fromLink = params.get("v");
  // 選んだ順に、色の枠（0〜2）を割り当てる。外しても、残りの動画の色は変わらない
  const [slots, setSlots] = useState<(string | null)[]>(() => {
    if (fromLink && videoById.has(fromLink)) return [fromLink, ...DEFAULT_COMPARE.filter((x) => x !== fromLink)].slice(0, MAX);
    return DEFAULT_COMPARE;
  });
  const [align, setAlign] = useState<Align>("since");
  const [cumulative, setCumulative] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "views", desc: true });

  const ids = slots.filter((x): x is string => !!x);
  const slotOf = Object.fromEntries(slots.flatMap((id, i) => (id ? [[id, i]] : [])));
  const toggle = (id: string) =>
    setSlots((s) => {
      const i = s.indexOf(id);
      if (i >= 0) return s.map((x) => (x === id ? null : x));
      const free = s.findIndex((x) => !x);
      if (free >= 0) return s.map((x, k) => (k === free ? id : x));
      if (s.length < MAX) return [...s, id];
      return s;
    });

  const stats = useMemo(() => {
    const st = videoStats(period);
    return st.sort((a, b) => {
      const x = sortVal(a, sort.key), y = sortVal(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.desc ? -1 : 1);
    });
  }, [period, sort]);
  const rows = ids.length ? compareSeries(ids, period, align, grain, cumulative) : [];
  const names = Object.fromEntries(ids.map((id) => [id, videoById.get(id)!.title]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[19px] font-black">動画の比較と推移</h2>
        <Controls />
      </div>

      <Card
        testid="compare"
        title="選んだ動画の推移を比べる"
        sub={`表の左の四角で、${MAX}本まで選べます（いま ${ids.length}本）。`}
        badges={<AvailBadge id={grain === "day" ? "daily" : "weekly"} />}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="seg" role="group" aria-label="そろえ方">
            <button type="button" aria-pressed={align === "date"} onClick={() => setAlign("date")} data-testid="align-date">
              日付でそろえる
            </button>
            <button type="button" aria-pressed={align === "since"} onClick={() => setAlign("since")} data-testid="align-since">
              公開日からの日数でそろえる
            </button>
          </div>
          <div className="seg" role="group" aria-label="日ごとと累計">
            <button type="button" aria-pressed={!cumulative} onClick={() => setCumulative(false)}>
              {grain === "day" ? "日ごと" : "週ごと"}
            </button>
            <button type="button" aria-pressed={cumulative} onClick={() => setCumulative(true)} data-testid="cumulative">
              累計
            </button>
          </div>
        </div>
        {align === "since" && (
          <p className="mb-2 rounded-lg bg-paper px-3 py-2 text-[12.5px] leading-relaxed text-sub" data-testid="since-note">
            公開日が違う動画を、公平に比べるための表示です。横の軸は公開日からの{grain === "day" ? "日数（0日目＝公開日）" : "週（7日ごと）"}で、{period === "all" ? "公開からの全部の日" : `公開から${period}日目まで`}を並べます。
          </p>
        )}
        <div className="mb-2">
          <Legend items={ids.map((id) => ({ color: SERIES[slotOf[id]], label: names[id] }))} />
        </div>
        {ids.length ? <CompareChart rows={rows} ids={ids} names={names} slots={slotOf} /> : <p className="py-16 text-center text-sm text-sub">表から動画を選んでください。</p>}
      </Card>

      <Card title="動画の一覧" sub="見出しを押すと並べ替えます。数値は選んだ期間のものです。" badges={<AvailBadge id="meta" />} testid="video-table-card">
        <div className="relative -mx-4 overflow-x-auto sm:mx-0">
          <table className="tbl min-w-[720px]" data-testid="video-table">
            <thead>
              <tr>
                <th className="w-8">
                  <span className="sr-only">比べる</span>
                </th>
                <th>動画</th>
                {COLS.map((c) => (
                  <th key={c.key} className="text-right" aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}>
                    <button type="button" className="inline-flex items-center gap-0.5 hover:text-ink" onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : true }))} data-testid={`sort-${c.key}`}>
                      {c.label}
                      {sort.key === c.key && (sort.desc ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />)}
                    </button>
                  </th>
                ))}
                <th>
                  <span className="sr-only">検索キーワード</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const slot = slotOf[s.video.id];
                const on = slot !== undefined;
                const full = !on && ids.length >= MAX;
                return (
                  <tr key={s.video.id} data-id={s.video.id} className={on ? "bg-paper/70" : ""}>
                    <td>
                      <label className="relative flex size-5 cursor-pointer items-center justify-center">
                        <input type="checkbox" className="peer sr-only" checked={on} disabled={full} onChange={() => toggle(s.video.id)} aria-label={`比べる：${s.video.title}`} />
                        <span className="size-4.5 rounded-[5px] border-2 border-mute/60 peer-checked:border-transparent peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-disabled:opacity-35" style={on ? { background: SERIES[slot] } : undefined} />
                        {on && (
                          <svg viewBox="0 0 16 16" className="pointer-events-none absolute size-3 text-white" aria-hidden>
                            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </label>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Thumb photo={s.video.photo} durationSec={s.video.durationSec} className="w-20" />
                        <span className="line-clamp-2 w-[11rem] leading-snug font-bold sm:w-auto sm:max-w-[17rem]">{s.video.title}</span>
                      </div>
                    </td>
                    <td className="num text-right whitespace-nowrap text-sub">{fmtDate(s.video.publishedAt)}</td>
                    <td className="num text-right font-bold">{fmtInt(s.views)}</td>
                    <td className="num text-right">{s.views ? fmtDuration(s.avgViewDuration) : "—"}</td>
                    <td className="num text-right">{s.views ? `${s.avgViewPercentage.toFixed(1)}%` : "—"}</td>
                    <td>
                      <Link href={`/search?video=${s.video.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold whitespace-nowrap text-accent hover:bg-accent-soft" data-testid={`to-search-${s.video.id}`}>
                        <Search className="size-3.5" aria-hidden />
                        検索キーワード
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
