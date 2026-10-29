// 架空のデータ：「ゆるっと台所チャンネル（架空）」の30本の動画。
// シード付きの乱数で、いつ開いても同じ数値を作る（画面の画像と入札書の数字をそろえるため）。
// 本物の YouTube API には接続していない。

export const CHANNEL_NAME = "ゆるっと台所チャンネル（架空）";
/** レポートを作った日（この日の前日までのデータがそろう）。日付を固定して、数値が日ごとに変わらないようにする */
export const REPORT_DATE = "2026-10-29";
/** API の数値は2〜3日遅れて確定するため、直近の3日は「確定前」とする */
export const PROVISIONAL_DAYS = 3;

// ---- 日付（"YYYY-MM-DD" と、1970-01-01 からの日数を行き来する。時差の影響を受けないように UTC で数える）
const DAY = 86_400_000;
export const toDay = (s: string) => Math.round(Date.parse(`${s}T00:00:00Z`) / DAY);
export const fromDay = (d: number) => new Date(d * DAY).toISOString().slice(0, 10);
/** 0 = 月曜 … 6 = 日曜 */
export const weekdayMon0 = (d: number) => (new Date(d * DAY).getUTCDay() + 6) % 7;
export const LAST_DAY = toDay(REPORT_DATE) - 1; // 昨日まで
export const FIRST_PROVISIONAL = LAST_DAY - PROVISIONAL_DAYS + 1;

// ---- シード付きの乱数（mulberry32）
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GrowthType = "launch" | "evergreen" | "viral";
export const GROWTH_LABEL: Record<GrowthType, string> = { launch: "公開直後に伸びる型", evergreen: "検索で長く見られる型", viral: "おすすめで急に伸びた型" };

export type Video = {
  id: string;
  title: string;
  publishedAt: string;
  durationSec: number;
  photo: string;
  type: GrowthType;
  /** 検索からの再生の割合 */
  searchShare: number;
  /** 動画ごとの検索キーワード（重みの合計は 1 − 上位に入らない分） */
  keywords: { keyword: string; weight: number }[];
};

export type DailyRow = {
  date: string;
  day: number;
  videoId: string;
  views: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number; // 秒
  averageViewPercentage: number; // %
  likes: number;
  comments: number;
  subscribersGained: number;
  subscribersLost: number;
  provisional: boolean;
};

// 題名、写真、伸び方の型、検索キーワード（すべて架空）
const SEED_VIDEOS: [string, string, GrowthType, string[]][] = [
  ["10分でできる 鶏むね肉のねぎ塩レモン", "salad-chicken", "evergreen", ["鶏むね レシピ", "ねぎ塩レモン", "鶏むね肉 さっぱり", "鶏むね 時短", "ねぎ塩 鶏"]],
  ["包丁いらず 豚こまの甘辛炒め", "hoikoro", "launch", ["豚こま レシピ", "豚こま 甘辛", "包丁いらず レシピ"]],
  ["週末2時間で5品 作り置きの段取り", "tomato-board", "evergreen", ["作り置き 1週間", "作り置き 段取り", "作り置き 週末", "作り置き レシピ", "常備菜"]],
  ["冷めてもおいしい 唐揚げのお弁当", "karaage", "launch", ["唐揚げ 弁当", "弁当 おかず 冷めても", "唐揚げ"]],
  ["ひとり分の肉じゃが 小鍋でコトコト", "chicken-daikon", "launch", ["肉じゃが 一人分", "肉じゃが", "小鍋 レシピ"]],
  ["15分 ほうれん草とベーコンのバター醤油", "spinach-bacon", "launch", ["ほうれん草 ベーコン", "バター醤油 レシピ", "弁当 おかず"]],
  ["作り置き 1週間の副菜6品", "kabocha", "evergreen", ["作り置き 副菜", "作り置き 1週間", "常備菜 副菜", "作り置き レシピ", "副菜 簡単"]],
  ["失敗しない ふわふわ親子丼", "torimeshi", "viral", ["親子丼 ふわふわ", "親子丼", "親子丼 作り方"]],
  ["レンジで5分 ナスの煮びたし", "nasu-miso", "launch", ["ナス 煮びたし", "ナス レンジ", "なす レシピ"]],
  ["平日の夜ごはん 献立1週間", "shogayaki", "evergreen", ["時短 夜ごはん", "献立 1週間", "平日 献立", "夜ごはん レシピ"]],
  ["フライパンひとつ 鶏ももの照り焼き", "karaage", "launch", ["照り焼き 鶏もも", "鶏もも レシピ", "照り焼き フライパン"]],
  ["具だくさん豚汁 まとめて作って3日楽しむ", "tonjiru", "launch", ["豚汁", "豚汁 作り置き", "具だくさん 豚汁"]],
  ["冷蔵庫の残り野菜で ナポリタン", "napolitan", "launch", ["ナポリタン", "ナポリタン 残り野菜"]],
  ["煮崩れしない かぼちゃの煮物", "kabocha", "launch", ["かぼちゃの煮物", "かぼちゃ 煮崩れ", "かぼちゃ レシピ"]],
  ["3分で一品 ふんわりニラ玉", "niratama", "launch", ["ニラ玉", "ニラ玉 簡単"]],
  ["市販の素なしで 回鍋肉", "hoikoro", "launch", ["回鍋肉", "回鍋肉 素なし"]],
  ["朝の5分 きのこたっぷり味噌汁", "miso-soup", "launch", ["味噌汁 きのこ", "味噌汁", "朝ごはん 時短"]],
  ["豚肉とかぼちゃの生姜焼き", "shogayaki", "launch", ["生姜焼き", "生姜焼き かぼちゃ"]],
  ["炊飯器で鶏めし 混ぜて炊くだけ", "torimeshi", "launch", ["鶏めし 炊飯器", "炊き込みご飯", "炊飯器 レシピ"]],
  ["洗い物を減らす 煮込みハンバーグ", "hamburg", "launch", ["煮込みハンバーグ", "ハンバーグ 洗い物", "ハンバーグ"]],
  ["10分で 和風きのこパスタ", "wafu-pasta", "launch", ["きのこパスタ 和風", "和風パスタ"]],
  ["苦みをおさえる ゴーヤチャンプル", "goya", "launch", ["ゴーヤチャンプル", "ゴーヤ 苦み"]],
  ["圧力鍋なしで 鶏肉と大根の煮物", "chicken-daikon", "launch", ["鶏肉 大根 煮物", "大根 煮物"]],
  ["ご飯がすすむ ナス味噌炒め", "nasu-miso", "launch", ["ナス味噌炒め", "なす レシピ"]],
  ["サラダチキンを手作り 作り置き5日", "salad-chicken", "viral", ["サラダチキン 手作り", "サラダチキン", "鶏むね レシピ", "作り置き 鶏むね"]],
  ["前の晩に仕込む カレーの夜ごはん", "curry", "evergreen", ["カレー 前日", "カレー 仕込み", "平日 夜ごはん"]],
  ["二度揚げしない 唐揚げ", "karaage", "launch", ["唐揚げ 二度揚げなし", "唐揚げ", "唐揚げ 簡単"]],
  ["野菜たっぷり 回鍋肉の作り置き", "hoikoro", "launch", ["回鍋肉 作り置き", "作り置き レシピ"]],
  ["ふわふわ 煮込みハンバーグの作り置き", "hamburg", "launch", ["ハンバーグ 作り置き", "煮込みハンバーグ"]],
  ["時短 夜ごはん 3品を20分で", "curry", "evergreen", ["時短 夜ごはん", "夜ごはん 献立", "20分 3品"]],
];

const FIRST_PUBLISH = toDay("2026-03-04");
const LAST_PUBLISH = toDay("2026-10-21");

export const videos: Video[] = (() => {
  const r = rng(20261029);
  const span = LAST_PUBLISH - FIRST_PUBLISH;
  return SEED_VIDEOS.map(([title, photo, type, kws], i) => {
    const pub = FIRST_PUBLISH + Math.round((span * i) / (SEED_VIDEOS.length - 1) + (i > 0 && i < SEED_VIDEOS.length - 1 ? (r() - 0.5) * 3 : 0));
    const tail = 0.12 + r() * 0.13; // 上位に入らない検索の割合
    const raw = kws.map((_, k) => Math.pow(0.55, k) * (0.85 + r() * 0.3));
    const sum = raw.reduce((a, b) => a + b, 0);
    return {
      id: `demo_v${String(i + 1).padStart(2, "0")}`,
      title,
      publishedAt: fromDay(pub),
      durationSec: Math.round(300 + r() * 900),
      photo,
      type,
      searchShare: type === "evergreen" ? 0.45 + r() * 0.15 : type === "viral" ? 0.07 + r() * 0.04 : 0.15 + r() * 0.1,
      keywords: kws.map((keyword, k) => ({ keyword, weight: (raw[k] / sum) * (1 - tail) })),
    };
  });
})();

export const videoById = new Map(videos.map((v) => [v.id, v]));

const WEEKDAY = [0.92, 0.9, 0.93, 0.95, 1.0, 1.18, 1.27]; // 月〜日（週末に作り置きの動画が見られる設定）

/** 動画ごとの日次の指標（公開日から昨日まで） */
export const daily: DailyRow[] = (() => {
  const rows: DailyRow[] = [];
  videos.forEach((v, i) => {
    const r = rng(1000 + i);
    const pub = toDay(v.publishedAt);
    const growth = 1 + (0.7 * (pub - FIRST_PUBLISH)) / (LAST_PUBLISH - FIRST_PUBLISH); // チャンネルが育つほど、初速が上がる
    const peak = (v.type === "evergreen" ? 900 : 1700) * growth * (0.75 + r() * 0.5);
    const tau = v.type === "evergreen" ? 22 + r() * 10 : 3.5 + r() * 3;
    const base = peak * (v.type === "evergreen" ? 0.22 + r() * 0.08 : 0.025 + r() * 0.02);
    const viralAt = v.type === "viral" ? Math.min(35 + Math.floor(r() * 30), LAST_DAY - pub - 18) : -1; // 動画の公開から1〜2か月後に、おすすめに乗る
    const viralPeak = peak * (1.3 + r() * 0.6);
    const pct = 32 + r() * 22; // 平均視聴率
    for (let d = pub; d <= LAST_DAY; d++) {
      const age = d - pub;
      let lam = peak * Math.exp(-age / tau) + base * (1 + age / 200);
      if (viralAt >= 0 && age >= viralAt - 3) {
        const k = age - viralAt;
        lam += k < 0 ? viralPeak * ((k + 4) / 4) * 0.35 : viralPeak * Math.exp(-k / 9);
      }
      if (age === 0) lam *= 0.55; // 公開日は夜の公開なので短い
      lam *= WEEKDAY[weekdayMon0(d)] * (0.88 + r() * 0.24);
      const provisional = d >= FIRST_PROVISIONAL;
      if (provisional) lam *= 0.95 - (d - FIRST_PROVISIONAL) * 0.03; // 確定前は少なめに出る（あとで少し増える設定）
      const views = Math.max(1, Math.round(lam));
      const p = Math.min(78, Math.max(18, pct + (r() - 0.5) * 6));
      const avg = Math.round((v.durationSec * p) / 100);
      const likeRate = 0.028 + r() * 0.018;
      rows.push({
        date: fromDay(d),
        day: d,
        videoId: v.id,
        views,
        estimatedMinutesWatched: Math.round((views * avg) / 60),
        averageViewDuration: avg,
        averageViewPercentage: Math.round(p * 10) / 10,
        likes: Math.round(views * likeRate),
        comments: Math.round(views * (0.0015 + r() * 0.002)),
        subscribersGained: Math.round(views * (0.0035 + r() * 0.003)),
        subscribersLost: Math.round(views * (0.0006 + r() * 0.0006)),
        provisional,
      });
    }
  });
  return rows;
})();

// ---- 期間
export type Period = "7" | "28" | "90" | "all";
export const PERIODS: { id: Period; label: string }[] = [
  { id: "7", label: "直近7日" },
  { id: "28", label: "直近28日" },
  { id: "90", label: "直近90日" },
  { id: "all", label: "全期間" },
];
export type Range = { start: number; end: number };
export const FIRST_DAY = Math.min(...videos.map((v) => toDay(v.publishedAt)));
export function rangeOf(p: Period): Range {
  if (p === "all") return { start: FIRST_DAY, end: LAST_DAY };
  return { start: LAST_DAY - Number(p) + 1, end: LAST_DAY };
}
/** 同じ長さの、1つ前の期間（全期間には無い） */
export function previousRange(p: Period): Range | null {
  if (p === "all") return null;
  const n = Number(p);
  return { start: LAST_DAY - 2 * n + 1, end: LAST_DAY - n };
}
const inRange = (d: number, r: Range) => d >= r.start && d <= r.end;

// ---- 集計
export type Totals = { views: number; minutes: number; avgViewDuration: number; subsNet: number; likes: number; comments: number };
export function totals(rows: DailyRow[]): Totals {
  let views = 0, minutes = 0, gained = 0, lost = 0, likes = 0, comments = 0;
  for (const r of rows) {
    views += r.views;
    minutes += r.estimatedMinutesWatched;
    gained += r.subscribersGained;
    lost += r.subscribersLost;
    likes += r.likes;
    comments += r.comments;
  }
  return { views, minutes, avgViewDuration: views ? (minutes * 60) / views : 0, subsNet: gained - lost, likes, comments };
}
export const rowsIn = (r: Range, videoId?: string) => daily.filter((x) => inRange(x.day, r) && (!videoId || x.videoId === videoId));

/** 前の期間からの増減（%）。前の期間が0なら null */
export const changePct = (now: number, prev: number) => (prev > 0 ? ((now - prev) / prev) * 100 : null);

export type Point = { key: string; label: string; start: number; views: number; minutes: number; provisional: boolean; partial: boolean };

/** チャンネル全体（または1本）の日次 */
export function dailySeries(r: Range, videoId?: string): Point[] {
  const m = new Map<number, Point>();
  for (let d = r.start; d <= r.end; d++) m.set(d, { key: fromDay(d), label: fromDay(d), start: d, views: 0, minutes: 0, provisional: d >= FIRST_PROVISIONAL, partial: false });
  for (const x of rowsIn(r, videoId)) {
    const p = m.get(x.day)!;
    p.views += x.views;
    p.minutes += x.estimatedMinutesWatched;
  }
  return [...m.values()];
}

/** 月曜始まりで週ごとにまとめる。期間の端で7日に満たない週は partial、確定前の日を含む週は provisional */
export function weekly(points: Point[]): Point[] {
  const out: Point[] = [];
  const days: number[] = [];
  for (const p of points) {
    const monday = p.start - weekdayMon0(p.start);
    let w = out[out.length - 1];
    if (!w || w.start !== monday) {
      w = { key: fromDay(monday), label: `${fromDay(monday)}の週`, start: monday, views: 0, minutes: 0, provisional: false, partial: false };
      out.push(w);
      days.push(0);
    }
    w.views += p.views;
    w.minutes += p.minutes;
    w.provisional ||= p.provisional;
    days[days.length - 1]++;
  }
  out.forEach((w, i) => (w.partial = days[i] < 7));
  return out;
}

export type VideoStat = { video: Video; views: number; minutes: number; avgViewDuration: number; avgViewPercentage: number; prevViews: number | null; likes: number };
export function videoStats(p: Period): VideoStat[] {
  const r = rangeOf(p), pr = previousRange(p);
  return videos.map((video) => {
    const rows = rowsIn(r, video.id);
    const t = totals(rows);
    const pct = t.views ? rows.reduce((a, x) => a + x.averageViewPercentage * x.views, 0) / t.views : 0;
    return {
      video,
      views: t.views,
      minutes: t.minutes,
      avgViewDuration: t.avgViewDuration,
      avgViewPercentage: Math.round(pct * 10) / 10,
      prevViews: pr ? totals(rowsIn(pr, video.id)).views : null,
      likes: t.likes,
    };
  });
}

/** 公開日からの日数でそろえた日次（0日目＝公開日）。days 日分まで、昨日を超えた日は null */
export function sincePublish(videoId: string, days: number): (number | null)[] {
  const v = videoById.get(videoId)!;
  const pub = toDay(v.publishedAt);
  const byDay = new Map(daily.filter((x) => x.videoId === videoId).map((x) => [x.day, x.views]));
  return Array.from({ length: days }, (_, i) => (pub + i <= LAST_DAY ? (byDay.get(pub + i) ?? 0) : null));
}

// ---- 検索キーワード（公開されている仕様では、1回に上位25件まで。少ない回数のキーワードは返ってこない）
export const SEARCH_LIMIT = 25;
export type KeywordRow = { keyword: string; views: number; rank: number };
export type SearchResult = { rows: KeywordRow[]; searchTotal: number; outside: number; views: number };
export function searchKeywords(r: Range, videoId?: string): SearchResult {
  const m = new Map<string, number>();
  let searchTotal = 0, views = 0;
  for (const v of videos) {
    if (videoId && v.id !== videoId) continue;
    const vv = totals(rowsIn(r, v.id)).views;
    const s = Math.round(vv * v.searchShare);
    views += vv;
    searchTotal += s;
    for (const k of v.keywords) m.set(k.keyword, (m.get(k.keyword) ?? 0) + s * k.weight);
  }
  const rows = [...m.entries()]
    .map(([keyword, x]) => ({ keyword, views: Math.round(x) }))
    .filter((x) => x.views > 0)
    .sort((a, b) => b.views - a.views || a.keyword.localeCompare(b.keyword, "ja"))
    .slice(0, SEARCH_LIMIT)
    .map((x, i) => ({ ...x, rank: i + 1 }));
  const top = rows.reduce((a, x) => a + x.views, 0);
  return { rows, searchTotal, outside: Math.max(0, searchTotal - top), views };
}

// ---- 視聴者（割合は期間によらず一定の設定。人数ではなく割合だけ）
export const COUNTRIES: { code: string; name: string; share: number }[] = [
  { code: "JP", name: "日本", share: 0.912 },
  { code: "US", name: "アメリカ", share: 0.021 },
  { code: "TW", name: "台湾", share: 0.016 },
  { code: "KR", name: "韓国", share: 0.009 },
  { code: "HK", name: "香港", share: 0.008 },
  { code: "TH", name: "タイ", share: 0.006 },
  { code: "AU", name: "オーストラリア", share: 0.005 },
  { code: "BR", name: "ブラジル", share: 0.004 },
];
export function countryViews(r: Range) {
  const total = totals(rowsIn(r)).views;
  const rows = COUNTRIES.map((c) => ({ ...c, views: Math.round(total * c.share) }));
  const other = total - rows.reduce((a, x) => a + x.views, 0);
  return { total, rows, other };
}
/** 市区町村の上位10件（条件つき。日本の再生に対する割合） */
export const CITIES: { name: string; share: number }[] = [
  { name: "東京（23区）", share: 0.098 },
  { name: "横浜市", share: 0.041 },
  { name: "大阪市", share: 0.036 },
  { name: "名古屋市", share: 0.027 },
  { name: "札幌市", share: 0.024 },
  { name: "福岡市", share: 0.02 },
  { name: "川崎市", share: 0.016 },
  { name: "神戸市", share: 0.015 },
  { name: "さいたま市", share: 0.014 },
  { name: "京都市", share: 0.013 },
];
export function cityViews(r: Range) {
  const jp = Math.round(totals(rowsIn(r)).views * COUNTRIES[0].share);
  return CITIES.map((c) => ({ ...c, views: Math.round(jp * c.share) }));
}
export const AGE_GROUPS = ["13–17", "18–24", "25–34", "35–44", "45–54", "55–64", "65–"] as const;
/** 年齢と性別ごとの視聴者の割合（%）。全部の合計が100 */
export const AGE_GENDER: { age: (typeof AGE_GROUPS)[number]; female: number; male: number }[] = [
  { age: "13–17", female: 0.8, male: 0.5 },
  { age: "18–24", female: 3.1, male: 2.6 },
  { age: "25–34", female: 14.2, male: 9.8 },
  { age: "35–44", female: 21.5, male: 10.1 },
  { age: "45–54", female: 15.3, male: 6.9 },
  { age: "55–64", female: 7.4, male: 3.0 },
  { age: "65–", female: 3.9, male: 0.9 },
];

// ---- 表示の形
export const fmtInt = (n: number) => Math.round(n).toLocaleString("ja-JP");
export const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}分${String(Math.round(sec % 60)).padStart(2, "0")}秒`;
export const fmtHours = (minutes: number) => Math.round(minutes / 60).toLocaleString("ja-JP");
export const fmtDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return `${y}年${m}月${d}日`;
};
export const fmtShort = (s: string) => {
  const [, m, d] = s.split("-").map(Number);
  return `${m}/${d}`;
};
export const fmtPct = (x: number | null) => (x === null ? "—" : `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x))}%`);

// ---- 動画の比較（2〜3本を同じグラフで）
export type Align = "date" | "since";
export type CompareRow = { x: string; label: string; provisional: boolean } & Record<string, number | null | string | boolean>;
/**
 * 日付でそろえる（date）か、公開日からの日数でそろえる（since。0日目＝公開日）。
 * since の週次は、7日がそろった週だけを出す（公開日が違う動画を、公平に比べるため）
 */
export function compareSeries(ids: string[], p: Period, align: Align, grain: "day" | "week", cumulative: boolean): CompareRow[] {
  let rows: CompareRow[];
  if (align === "date") {
    const r = rangeOf(p);
    const per = ids.map((id) => new Map(dailySeries(r, id).map((x) => [x.start, x.views])));
    const pubs = ids.map((id) => toDay(videoById.get(id)!.publishedAt));
    rows = [];
    for (let d = r.start; d <= r.end; d++) {
      const row: CompareRow = { x: fromDay(d), label: fmtShort(fromDay(d)), provisional: d >= FIRST_PROVISIONAL };
      ids.forEach((id, i) => (row[id] = d < pubs[i] ? null : (per[i].get(d) ?? 0)));
      rows.push(row);
    }
    if (grain === "week") {
      const out: CompareRow[] = [];
      for (const row of rows) {
        const d = toDay(row.x);
        const monday = fromDay(d - weekdayMon0(d));
        let w = out[out.length - 1];
        if (!w || w.x !== monday) {
          w = { x: monday, label: `${fmtShort(monday)}の週`, provisional: false };
          ids.forEach((id) => (w[id] = null));
          out.push(w);
        }
        w.provisional ||= row.provisional;
        for (const id of ids) if (row[id] !== null) w[id] = ((w[id] as number | null) ?? 0) + (row[id] as number);
      }
      rows = out;
    }
  } else {
    const maxAge = Math.max(...ids.map((id) => LAST_DAY - toDay(videoById.get(id)!.publishedAt) + 1));
    const days = p === "all" ? maxAge : Number(p);
    const per = ids.map((id) => sincePublish(id, days));
    if (grain === "day") {
      rows = Array.from({ length: days }, (_, i) => {
        const row: CompareRow = { x: String(i), label: `${i}日目`, provisional: false };
        ids.forEach((id, k) => (row[id] = per[k][i]));
        return row;
      });
    } else {
      rows = Array.from({ length: Math.floor(days / 7) }, (_, w) => {
        const row: CompareRow = { x: String(w + 1), label: `${w + 1}週目`, provisional: false };
        ids.forEach((id, k) => {
          const block = per[k].slice(w * 7, w * 7 + 7);
          row[id] = block.length === 7 && block.every((v) => v !== null) ? block.reduce((a: number, v) => a + (v as number), 0) : null;
        });
        return row;
      });
    }
  }
  if (cumulative) {
    for (const id of ids) {
      let acc = 0;
      for (const row of rows) if (row[id] !== null) row[id] = acc += row[id] as number;
    }
  }
  return rows;
}
