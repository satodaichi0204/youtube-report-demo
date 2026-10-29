// GAS の作成例を Node.js で確かめるための道具：gas/*.js を1つの文脈（vm）に読み込み、GAS の全体の関数を偽物に差し替える。
// GAS では全部のファイルが同じ場所に並ぶので、ここでも全部を1つの文脈に読み込む
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

export const GAS_DIR = join(import.meta.dirname, "..");
export const gasSources = () =>
  readdirSync(GAS_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => ({ name: f, code: readFileSync(join(GAS_DIR, f), "utf8") }));

type Cell = unknown;
export class FakeSheet {
  grid: Cell[][] = [];
  frozen = 0;
  constructor(public name: string) {}
  getLastRow() {
    for (let i = this.grid.length - 1; i >= 0; i--) if (this.grid[i]?.some((c) => c !== "" && c !== undefined)) return i + 1;
    return 0;
  }
  getRange(row: number, col: number, numRows: number, numCols: number) {
    const g = this.grid;
    return {
      getValues: () => Array.from({ length: numRows }, (_, i) => Array.from({ length: numCols }, (_, j) => g[row - 1 + i]?.[col - 1 + j] ?? "")),
      setValues: (vals: Cell[][]) => {
        if (vals.length !== numRows || vals.some((r) => r.length !== numCols)) throw new Error("範囲の大きさと値の大きさが違います");
        vals.forEach((r, i) => {
          g[row - 1 + i] ??= [];
          r.forEach((c, j) => (g[row - 1 + i][col - 1 + j] = c));
        });
      },
      clearContent: () => {
        for (let i = 0; i < numRows; i++) for (let j = 0; j < numCols; j++) if (g[row - 1 + i]) g[row - 1 + i][col - 1 + j] = "";
      },
    };
  }
  appendRow(r: Cell[]) {
    this.grid[this.getLastRow()] = [...r];
  }
  setFrozenRows(n: number) {
    this.frozen = n;
  }
  /** 見出しを除いた行（テスト用） */
  body() {
    return this.grid.slice(1, this.getLastRow());
  }
}

export type Query = Record<string, string | number>;
export type AnalyticsReply = { columnHeaders: { name: string }[]; rows?: unknown[][] };
type Handler = (q: Query) => AnalyticsReply | undefined;

const MIN = 60_000;
/** 日本時間で yyyy MM dd HH mm ss を置き換える（Utilities.formatDate の偽物） */
function formatDate(d: Date, _tz: string, fmt: string) {
  const j = new Date(d.getTime() + 9 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return fmt
    .replace("yyyy", String(j.getUTCFullYear()))
    .replace("MM", p(j.getUTCMonth() + 1))
    .replace("dd", p(j.getUTCDate()))
    .replace("HH", p(j.getUTCHours()))
    .replace("mm", p(j.getUTCMinutes()))
    .replace("ss", p(j.getUTCSeconds()));
}
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export type FakeVideo = { id: string; title: string; publishedAt: string };
export const VIDEOS: FakeVideo[] = Array.from({ length: 8 }, (_, i) => ({ id: `vid${i + 1}`, title: `架空の動画 ${i + 1}`, publishedAt: addDays("2026-09-01", i * 7) }));

/** 架空の API の答え（日次は「日付と動画」から決まる値。version を変えると、同じ日でも違う値を返す） */
export function defaultAnalytics(version = 1): Handler {
  return (q) => {
    const dims = String(q.dimensions);
    if (dims === "day") {
      const vid = String(q.filters).replace("video==", "");
      const rows: unknown[][] = [];
      for (let d = String(q.startDate); d <= String(q.endDate); d = addDays(d, 1)) rows.push([d, 100 * version + Number(vid.slice(3)), 300, 180, 40.5, 5, 1, 2, 0]);
      return { columnHeaders: ["day", "views", "estimatedMinutesWatched", "averageViewDuration", "averageViewPercentage", "likes", "comments", "subscribersGained", "subscribersLost"].map((name) => ({ name })), rows };
    }
    if (dims === "insightTrafficSourceDetail")
      return { columnHeaders: [{ name: "insightTrafficSourceDetail" }, { name: "views" }, { name: "estimatedMinutesWatched" }], rows: [["作り置き 1週間", 400, 900], ["鶏むね レシピ", 300, 700]] };
    if (dims === "insightTrafficSourceType") return { columnHeaders: [{ name: "insightTrafficSourceType" }, { name: "views" }, { name: "estimatedMinutesWatched" }], rows: [["SUGGESTED", 5000, 9000], ["YT_SEARCH", 1000, 2500]] };
    if (dims === "country") return { columnHeaders: [{ name: "country" }, { name: "views" }, { name: "estimatedMinutesWatched" }], rows: [["JP", 9000, 20000], ["US", 200, 400]] };
    if (dims === "city") return { columnHeaders: [{ name: "city" }, { name: "views" }], rows: [["横浜市（架空の答え）", 400]] };
    if (dims === "ageGroup,gender") return { columnHeaders: [{ name: "ageGroup" }, { name: "gender" }, { name: "viewerPercentage" }], rows: [["age35-44", "female", 21.5]] };
    return { columnHeaders: [], rows: [] };
  };
}

export type Trigger = { handler: string; after?: number; daily?: number };

export function loadGas(opts: { analytics?: Handler; props?: Record<string, string>; start?: string; msPerQuery?: number } = {}) {
  const book = new Map<string, FakeSheet>();
  const props = new Map<string, string>(Object.entries({ SPREADSHEET_ID: "sheet-id-from-properties", NOTIFY_EMAIL: "owner@example.com", HISTORY_START_DATE: "2026-09-01", ...opts.props }));
  const queries: Query[] = [];
  const mails: { to: string; subject: string; body: string }[] = [];
  const sleeps: number[] = [];
  let triggers: Trigger[] = [];
  const clock = { t: Date.parse(opts.start ?? "2026-10-28T21:00:00Z") }; // 日本時間 2026-10-29 06:00
  const msPerQuery = opts.msPerQuery ?? 1000;
  let analytics: Handler = opts.analytics ?? defaultAnalytics();

  const triggerBuilder = (handler: string) => {
    const t: Trigger = { handler };
    const tb = {
      after: (ms: number) => ((t.after = ms), tb),
      everyDays: () => tb,
      atHour: (h: number) => ((t.daily = h), tb),
      inTimezone: () => tb,
      create: () => {
        triggers.push(t);
        return { getHandlerFunction: () => handler };
      },
    };
    return { timeBased: () => tb };
  };

  const globals = {
    console: { log() {}, error() {}, warn() {} },
    JSON,
    Date,
    Math,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
        deleteProperty: (k: string) => props.delete(k),
      }),
    },
    SpreadsheetApp: {
      openById: (id: string) => {
        if (id !== props.get("SPREADSHEET_ID")) throw new Error("違うスプレッドシート");
        return {
          getSheetByName: (n: string) => book.get(n) ?? null,
          insertSheet: (n: string) => {
            const s = new FakeSheet(n);
            book.set(n, s);
            return s;
          },
        };
      },
    },
    Utilities: { formatDate, sleep: (ms: number) => sleeps.push(ms) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ScriptApp: {
      newTrigger: triggerBuilder,
      getProjectTriggers: () => triggers.map((t) => ({ getHandlerFunction: () => t.handler, _t: t })),
      deleteTrigger: (x: { _t: Trigger }) => (triggers = triggers.filter((t) => t !== x._t)),
    },
    MailApp: { sendEmail: (to: string, subject: string, body: string) => mails.push({ to, subject, body }) },
    YouTube: {
      Channels: { list: () => ({ items: [{ id: "channel-of-owner", contentDetails: { relatedPlaylists: { uploads: "uploads-playlist" } } }] }) },
      PlaylistItems: {
        list: (_part: string, q: { pageToken?: string }) => {
          // 2ページに分けて返す（ページの続きの処理を通す）
          const first = !q.pageToken;
          const items = (first ? VIDEOS.slice(0, 5) : VIDEOS.slice(5)).map((v) => ({ contentDetails: { videoId: v.id } }));
          return { items, nextPageToken: first ? "page2" : undefined };
        },
      },
      Videos: {
        list: (_part: string, q: { id: string }) => ({
          items: q.id.split(",").map((id) => {
            const v = VIDEOS.find((x) => x.id === id)!;
            return { id, snippet: { title: v.title, publishedAt: `${v.publishedAt}T09:00:00Z`, thumbnails: { medium: { url: `https://example.com/${id}.jpg` } } }, contentDetails: { duration: "PT12M3S" } };
          }),
        }),
      },
    },
    YouTubeAnalytics: {
      Reports: {
        query: (q: Query) => {
          queries.push({ ...q });
          clock.t += msPerQuery;
          const r = analytics(q);
          if (!r) throw new Error("想定していない問い合わせ");
          return r;
        },
      },
    },
  };
  const ctx = vm.createContext(globals);
  for (const f of gasSources()) vm.runInContext(f.code, ctx, { filename: f.name });
  // 時計を偽物にする（API を呼ぶたびに進む）
  (ctx as Record<string, unknown>).now_ = () => new Date(clock.t);

  const g = ctx as unknown as Record<string, (...a: unknown[]) => unknown>;
  return {
    g,
    book,
    props,
    queries,
    mails,
    sleeps,
    clock,
    get triggers() {
      return triggers;
    },
    setAnalytics: (h: Handler) => (analytics = h),
    sheet: (n: string) => book.get(n)!,
    advance: (ms: number) => (clock.t += ms),
    MIN,
  };
}
