"use client";
// ③ 検索キーワード：上位25件の横棒と、最後に「上位25件に入らない検索」。動画を選ぶと、その動画の上位に切り替わる
import { useRouter, useSearchParams } from "next/navigation";
import { SEARCH_LIMIT, fmtInt, rangeOf, searchKeywords, videoById, videos } from "@/lib/fakeData";
import { usePrefs } from "@/lib/prefs";
import { AvailBadge } from "./Avail";
import { BarList, Thumb } from "./Charts";
import { Card, Controls } from "./Shell";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default function SearchPage() {
  const [{ period }] = usePrefs();
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("video");
  const video = q ? videoById.get(q) : undefined;
  const res = searchKeywords(rangeOf(period), video?.id);
  const top = res.rows.reduce((a, x) => a + x.views, 0);
  // キーワードの棒は、いちばん多いキーワードに長さを合わせる（入らない検索の棒は、途中を省略して描く）
  const max = Math.max(...res.rows.map((r) => r.views), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[19px] font-black">検索キーワード</h2>
        <Controls grain={false} />
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <label htmlFor="video-select" className="text-[13px] font-bold text-sub">
          対象
        </label>
        <select
          id="video-select"
          data-testid="video-select"
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-[14px] font-bold outline-none focus:border-ink sm:max-w-md"
          value={video?.id ?? ""}
          onChange={(e) => router.replace(e.target.value ? `/search?video=${e.target.value}` : "/search", { scroll: false })}
        >
          <option value="">チャンネル全体</option>
          {videos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
        {video && <Thumb photo={video.photo} durationSec={video.durationSec} className="w-24" />}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-[13px] font-bold text-sub">検索からの再生</div>
          <div className="num mt-1 text-[24px] font-black" data-testid="search-total">
            {fmtInt(res.searchTotal)}
            <span className="ml-0.5 text-[13px] font-bold text-sub">回</span>
          </div>
          <div className="text-[12px] text-sub">再生全体の {pct(res.searchTotal, res.views)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-bold text-sub">上位{SEARCH_LIMIT}件のキーワードの合計</div>
          <div className="num mt-1 text-[24px] font-black">
            {fmtInt(top)}
            <span className="ml-0.5 text-[13px] font-bold text-sub">回</span>
          </div>
          <div className="text-[12px] text-sub">検索からの再生の {pct(top, res.searchTotal)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-bold text-sub">上位{SEARCH_LIMIT}件に入らない検索</div>
          <div className="num mt-1 text-[24px] font-black" data-testid="search-outside">
            {fmtInt(res.outside)}
            <span className="ml-0.5 text-[13px] font-bold text-sub">回</span>
          </div>
          <div className="text-[12px] text-sub">検索からの再生の {pct(res.outside, res.searchTotal)}（合計との差）</div>
        </div>
      </div>

      <Card
        testid="keywords"
        title={video ? `この動画の検索キーワード（上位${SEARCH_LIMIT}件まで）` : `チャンネル全体の検索キーワード（上位${SEARCH_LIMIT}件）`}
        sub={video ? video.title : "検索からの再生回数の多い順。最後の棒は、合計との差です。"}
        badges={<AvailBadge id={video ? "search-video" : "search-channel"} />}
      >
        <BarList
          testid="keyword-bars"
          max={max}
          items={[
            ...res.rows.map((r) => ({ label: r.keyword, value: r.views, sub: String(r.rank) })),
            { label: `上位${SEARCH_LIMIT}件に入らない検索`, value: res.outside, tone: "outside" as const },
          ]}
        />
        <p className="mt-3 flex items-center gap-2 text-[12px] text-sub">
          <span className="inline-block h-3 w-5 rounded-r-[4px]" style={{ background: "repeating-linear-gradient(135deg,#b3afa7 0 4px,#cfcbc4 4px 8px)" }} />
          上位{SEARCH_LIMIT}件に入らない検索 ＝ 検索からの再生の合計 − 上位{SEARCH_LIMIT}件の合計（少ない回数のキーワードの集まり）。キーワードの棒より長いときは、棒の途中を省略しています
        </p>
        {video && res.rows.length < SEARCH_LIMIT && <p className="mt-1 text-[12px] text-sub">この動画で返ってきたキーワードは{res.rows.length}件です（再生の少ない動画では、件数が少なくなります）。</p>}
      </Card>

      <Card title="Looker Studio の標準のコネクタとの違い" badges={<AvailBadge id="search-connector" />}>
        <p className="text-[13.5px] leading-relaxed">
          標準のコネクタでは、主要な指標はコードなしで出せますが、この画面の検索キーワードは出せません。そこで、<b>第1段階</b>は標準のコネクタで主要な指標を先にお届けし、<b>第2段階</b>で GAS と API による検索キーワードと日次の蓄積を足します。
        </p>
      </Card>
    </div>
  );
}
