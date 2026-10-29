"use client";
// ④ 視聴者：国（取れる）、年齢と性別（条件つき）、市区町村の上位10件（条件つき）、都道府県（取れない）
import { Ban } from "lucide-react";
import { AGE_GENDER, cityViews, countryViews, rangeOf } from "@/lib/fakeData";
import { usePrefs } from "@/lib/prefs";
import { AvailBadge } from "./Avail";
import { AgeGenderChart, BarList, Legend, SERIES } from "./Charts";
import { Card, Controls } from "./Shell";

const PREFS = ["北海道", "宮城県", "東京都", "神奈川県", "愛知県", "大阪府", "兵庫県", "福岡県"];

export default function Audience() {
  const [{ period }] = usePrefs();
  const r = rangeOf(period);
  const c = countryViews(r);
  const cities = cityViews(r);
  const female = AGE_GENDER.reduce((a, x) => a + x.female, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[19px] font-black">視聴者</h2>
        <Controls grain={false} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="国ごとの再生" sub="再生回数の多い順" badges={<AvailBadge id="country" />} testid="countries">
          <BarList testid="country-bars" items={[...c.rows.map((x) => ({ label: x.name, value: x.views })), { label: "その他の国", value: c.other, tone: "muted" as const }]} />
        </Card>

        <Card title="年齢と性別ごとの視聴者の割合" sub="ログインしている視聴者の分の割合（人数ではありません）" badges={<AvailBadge id="age-gender" />} testid="age-gender">
          <div className="mb-1">
            <Legend
              items={[
                { color: SERIES[0], label: `女性（${female.toFixed(1)}%）` },
                { color: SERIES[1], label: `男性（${(100 - female).toFixed(1)}%）` },
              ]}
            />
          </div>
          <AgeGenderChart />
          <p className="mt-1 text-[12px] text-sub">人数が少ない期間や動画では返ってこないため、そのときは「データなし（しきい値未満）」と表示します。</p>
        </Card>

        <Card title="市区町村の上位10件" sub="日本の再生のうち。返ってくる範囲は、ご契約の後に確かめます" badges={<AvailBadge id="city" />} testid="cities">
          <BarList testid="city-bars" items={cities.map((x, i) => ({ label: x.name, value: x.views, sub: String(i + 1) }))} />
        </Card>

        <section className="rounded-2xl border border-dashed border-no/40 bg-no-soft/60 p-4 sm:p-5" data-testid="prefecture">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15.5px] font-black text-no">都道府県ごとの再生</h2>
              <p className="mt-0.5 text-[12.5px] text-no">日本の都道府県の単位では集計できません</p>
            </div>
            <AvailBadge id="prefecture" />
          </div>
          <ol className="space-y-1.5 opacity-70 grayscale" aria-hidden>
            {PREFS.map((p, i) => (
              <li key={p} className="grid grid-cols-[6rem_1fr] items-center gap-3 text-[13px] text-no">
                <span>{p}</span>
                <span className="h-3.5 rounded-r-[4px] bg-[#d9d6d0]" style={{ width: `${70 - i * 7}%` }} />
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-white/80 px-3 py-2 text-[12.5px] leading-relaxed text-ink">
            <Ban className="mt-0.5 size-3.5 shrink-0 text-no" aria-hidden />
            <span>
              <b>代わりの案：</b>国の単位と、市区町村の単位（条件つき）で代えます。上の棒は、集計できないことを示す見本です（数値はありません）。
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
