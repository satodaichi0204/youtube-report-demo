"use client";
// ① チャンネルの概要：指標のカード、推移のグラフ（直近の3日は確定前）、伸びている動画の上位5本
import Link from "next/link";
import { useState } from "react";
import { FIRST_PROVISIONAL, LAST_DAY, changePct, dailySeries, fmtDate, fmtDuration, fmtHours, fmtInt, fmtPct, fmtShort, fromDay, previousRange, rangeOf, rowsIn, totals, videoStats, weekly } from "@/lib/fakeData";
import { usePrefs } from "@/lib/prefs";
import { AvailBadge } from "./Avail";
import { Thumb, TrendChart } from "./Charts";
import { Card, Controls } from "./Shell";

function Stat({ label, value, unit, prev, testid }: { label: string; value: string; unit?: string; prev: number | null | undefined; testid: string }) {
  return (
    <div className="card p-4" data-testid={testid}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-bold text-sub">{label}</span>
        <AvailBadge id="daily" compact />
      </div>
      <div className="mt-1 text-[26px] leading-tight font-black sm:text-[30px]">
        {value}
        {unit && <span className="ml-0.5 text-[14px] font-bold text-sub">{unit}</span>}
      </div>
      <div className="mt-1 text-[12.5px] text-sub" data-testid={`${testid}-change`}>
        {prev === undefined ? "全期間のため、比べる期間はありません" : `前の期間より ${fmtPct(prev)}`}
      </div>
    </div>
  );
}

export default function Overview() {
  const [{ period, grain }] = usePrefs();
  const [metric, setMetric] = useState<"views" | "minutes">("views");
  const r = rangeOf(period);
  const pr = previousRange(period);
  const t = totals(rowsIn(r));
  const pt = pr ? totals(rowsIn(pr)) : null;
  const ch = (a: number, b: number | undefined) => (pt ? changePct(a, b ?? 0) : undefined);
  const days = dailySeries(r);
  const points = grain === "day" ? days : weekly(days);
  const stats = videoStats(period)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-black">チャンネルの概要</h2>
          <p className="text-[12.5px] text-sub">
            {fmtDate(fromDay(r.start))} 〜 {fmtDate(fromDay(r.end))}
          </p>
        </div>
        <Controls />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat testid="stat-views" label="再生回数" value={fmtInt(t.views)} unit="回" prev={ch(t.views, pt?.views)} />
        <Stat testid="stat-hours" label="総再生時間" value={fmtHours(t.minutes)} unit="時間" prev={ch(t.minutes, pt?.minutes)} />
        <Stat testid="stat-avg" label="平均視聴時間" value={fmtDuration(t.avgViewDuration)} prev={ch(t.avgViewDuration, pt?.avgViewDuration)} />
        <Stat testid="stat-subs" label="登録者の増減" value={`${t.subsNet >= 0 ? "+" : "−"}${fmtInt(Math.abs(t.subsNet))}`} unit="人" prev={ch(t.subsNet, pt?.subsNet)} />
      </div>

      <Card
        testid="trend"
        title={`${grain === "day" ? "日次" : "週次（月曜始まり）"}の推移`}
        sub={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-s1" />
              確定した数値
            </span>
            <span className="inline-flex items-center gap-1.5" data-testid="provisional-legend">
              <span className="h-[3px] w-4 rounded-full bg-s1-soft" />
              確定前（2〜3日で確定します）{fmtShort(fromDay(FIRST_PROVISIONAL))}〜{fmtShort(fromDay(LAST_DAY))}
            </span>
          </span>
        }
        badges={
          <>
            <AvailBadge id="provisional" />
            <AvailBadge id={grain === "day" ? "daily" : "weekly"} />
          </>
        }
      >
        <div className="mb-2 seg" role="group" aria-label="グラフの指標">
          <button type="button" aria-pressed={metric === "views"} onClick={() => setMetric("views")}>
            再生回数
          </button>
          <button type="button" aria-pressed={metric === "minutes"} onClick={() => setMetric("minutes")}>
            総再生時間
          </button>
        </div>
        <TrendChart points={points} grain={grain} metric={metric} />
      </Card>

      <Card title="伸びている動画（この期間の再生回数の上位5本）" badges={<AvailBadge id="meta" />} testid="top-videos">
        <ol className="divide-y divide-line">
          {stats.map((s, i) => (
            <li key={s.video.id} className="flex items-center gap-3 py-2.5">
              <span className="num w-4 text-center text-[13px] font-black text-mute">{i + 1}</span>
              <Thumb photo={s.video.photo} durationSec={s.video.durationSec} className="w-24 sm:w-28" />
              <div className="min-w-0 flex-1">
                <Link href={`/videos?v=${s.video.id}`} className="line-clamp-2 text-[14px] leading-snug font-bold hover:underline">
                  {s.video.title}
                </Link>
                <div className="mt-0.5 text-[12px] text-sub">公開日 {fmtDate(s.video.publishedAt)}</div>
              </div>
              <div className="text-right">
                <div className="num text-[15px] font-black">{fmtInt(s.views)}回</div>
                <div className="text-[11.5px] text-sub">{s.prevViews === null ? "" : s.prevViews === 0 ? "この期間に公開" : `前の期間より ${fmtPct(changePct(s.views, s.prevViews))}`}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
