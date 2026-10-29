// デモの架空のデータと集計の単体テスト
import { describe, expect, it } from "vitest";
import {
  AGE_GENDER,
  FIRST_PROVISIONAL,
  LAST_DAY,
  SEARCH_LIMIT,
  compareSeries,
  countryViews,
  daily,
  dailySeries,
  fromDay,
  rangeOf,
  rng,
  rowsIn,
  searchKeywords,
  sincePublish,
  toDay,
  totals,
  videoById,
  videos,
  weekdayMon0,
  weekly,
} from "./fakeData";

describe("架空のデータ", () => {
  it("シード付きの乱数なので、毎回同じ数値になる", () => {
    const a = rng(42), b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    // 画面の画像と入札書の数字がずれないよう、合計を固定で確かめる（データの作り方を変えたら、ここも見直す）
    expect(totals(rowsIn(rangeOf("28"))).views).toBe(259259);
    expect(daily.length).toBe(3708);
  });

  it("動画は30本、公開日は約8か月に散らばり、長さは5〜20分。3つの伸び方の型がある", () => {
    expect(videos.length).toBe(30);
    const pubs = videos.map((v) => v.publishedAt).sort();
    expect(pubs[0] >= "2026-02-28").toBe(true);
    expect(toDay(pubs.at(-1)!) - toDay(pubs[0])).toBeGreaterThan(200);
    for (const v of videos) {
      expect(v.durationSec).toBeGreaterThanOrEqual(300);
      expect(v.durationSec).toBeLessThanOrEqual(1200);
      expect(v.title).not.toMatch(/https?:/);
    }
    expect(new Set(videos.map((v) => v.type))).toEqual(new Set(["launch", "evergreen", "viral"]));
    expect(videos.filter((v) => v.type === "viral").length).toBeLessThanOrEqual(2);
  });

  it("日次は公開日から昨日（2026-10-28）まで。直近の3日だけが確定前", () => {
    expect(fromDay(LAST_DAY)).toBe("2026-10-28");
    for (const v of videos) {
      const rows = daily.filter((r) => r.videoId === v.id);
      expect(rows[0].date).toBe(v.publishedAt);
      expect(rows.at(-1)!.date).toBe("2026-10-28");
    }
    expect(new Set(daily.filter((r) => r.provisional).map((r) => r.date))).toEqual(new Set(["2026-10-26", "2026-10-27", "2026-10-28"]));
    expect(fromDay(FIRST_PROVISIONAL)).toBe("2026-10-26");
  });

  it("総再生時間は、再生回数×平均視聴時間とそろう", () => {
    for (const r of daily.slice(0, 500)) expect(Math.abs(r.estimatedMinutesWatched - (r.views * r.averageViewDuration) / 60)).toBeLessThanOrEqual(0.5);
  });
});

describe("集計", () => {
  it("期間は昨日まで。直近7日は 10/22〜10/28", () => {
    const r = rangeOf("7");
    expect([fromDay(r.start), fromDay(r.end)]).toEqual(["2026-10-22", "2026-10-28"]);
    expect(dailySeries(r).length).toBe(7);
  });

  it("週次は月曜始まりでまとまり、合計は日次と同じ。端の週は「途中」、確定前の日を含む週に印", () => {
    const days = dailySeries(rangeOf("28"));
    const w = weekly(days);
    for (const x of w) expect(weekdayMon0(x.start)).toBe(0);
    expect(w.reduce((a, x) => a + x.views, 0)).toBe(days.reduce((a, x) => a + x.views, 0));
    expect(w[0].partial).toBe(true); // 10/1 は木曜
    expect(w.at(-1)!.partial).toBe(true);
    expect(w.at(-1)!.provisional).toBe(true);
    expect(w.filter((x) => x.provisional).length).toBe(1);
  });

  it("検索キーワードは上位25件まで。「上位25件に入らない検索」は合計との差", () => {
    const res = searchKeywords(rangeOf("28"));
    expect(res.rows.length).toBe(SEARCH_LIMIT);
    expect(res.rows.map((r) => r.rank)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    for (let i = 1; i < res.rows.length; i++) expect(res.rows[i - 1].views).toBeGreaterThanOrEqual(res.rows[i].views);
    expect(res.outside).toBe(res.searchTotal - res.rows.reduce((a, x) => a + x.views, 0));
    expect(res.outside).toBeGreaterThan(0);
  });

  it("動画ごとの検索キーワードは、その動画のキーワードだけ", () => {
    const v = videoById.get("demo_v01")!;
    const res = searchKeywords(rangeOf("all"), v.id);
    expect(res.rows.map((r) => r.keyword).sort()).toEqual(v.keywords.map((k) => k.keyword).sort());
    expect(res.outside).toBeGreaterThan(0);
  });

  it("公開日からの日数でそろえると、0日目は公開日の再生回数", () => {
    const v = videoById.get("demo_v27")!;
    const s = sincePublish(v.id, 90);
    expect(s[0]).toBe(daily.find((r) => r.videoId === v.id && r.date === v.publishedAt)!.views);
    const age = LAST_DAY - toDay(v.publishedAt) + 1;
    expect(s[age - 1]).not.toBeNull();
    expect(s[age]).toBeNull(); // まだ来ていない日は空
  });

  it("比較のグラフ：累計は増える一方。公開前の日は空。週の比較は7日そろった週だけ", () => {
    const ids = ["demo_v25", "demo_v07", "demo_v27"];
    const cum = compareSeries(ids, "90", "since", "day", true);
    expect(cum.length).toBe(90);
    for (const id of ids) {
      const vals = cum.map((r) => r[id]).filter((x): x is number => typeof x === "number");
      for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeGreaterThanOrEqual(vals[i - 1]);
    }
    const byDate = compareSeries(["demo_v29"], "90", "date", "day", false);
    expect(byDate.find((r) => r.x === "2026-10-12")!.demo_v29).toBeNull();
    expect(byDate.find((r) => r.x === "2026-10-13")!.demo_v29).not.toBeNull();
    const wk = compareSeries(["demo_v27"], "90", "since", "week", false);
    const age = LAST_DAY - toDay(videoById.get("demo_v27")!.publishedAt) + 1;
    expect(wk.filter((r) => r.demo_v27 !== null).length).toBe(Math.floor(age / 7));
  });

  it("国の再生の合計と、年齢と性別の割合の合計がそろう", () => {
    const c = countryViews(rangeOf("28"));
    expect(c.rows.reduce((a, x) => a + x.views, 0) + c.other).toBe(c.total);
    expect(Math.round(AGE_GENDER.reduce((a, x) => a + x.female + x.male, 0) * 10) / 10).toBe(100);
  });
});
