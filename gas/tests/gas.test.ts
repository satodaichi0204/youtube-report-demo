// GAS のコードの作成例の単体テスト（本物の YouTube と GAS は使わない。GAS の機能は偽物に差し替える）
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GAS_DIR, VIDEOS, defaultAnalytics, gasSources, loadGas, type Query } from "./harness";

const DAY = 86_400_000;
const keyOf = (r: unknown[]) => `${r[0]}|${r[1]}`;

describe("毎朝の更新", () => {
  it("直近5日分を取り直して上書きし、同じ日と動画の行は増えない", () => {
    const gas = loadGas();
    expect(gas.g.dailyRun()).toBe("done");
    const first = gas.sheet("daily_video").body();
    expect(first.length).toBe(VIDEOS.length * 5); // 10/24〜10/28 × 8本
    expect(new Set(first.map(keyOf)).size).toBe(first.length);

    // 翌朝：API の数値が変わった（確定した）設定で、もう一度
    gas.advance(DAY);
    gas.setAnalytics(defaultAnalytics(2));
    expect(gas.g.dailyRun()).toBe("done");
    const rows = gas.sheet("daily_video").body();
    expect(rows.length).toBe(VIDEOS.length * 6); // 1日分だけ増える（10/24〜10/29）
    expect(new Set(rows.map(keyOf)).size).toBe(rows.length);
    // 取り直した 10/25〜10/28 の行は、新しい値に置き換わっている。取り直さなかった 10/24 は前の値のまま
    const v1 = (d: string) => rows.find((r) => r[0] === d && r[1] === "vid1")!;
    expect(v1("2026-10-25")[2]).toBe(201);
    expect(v1("2026-10-24")[2]).toBe(101);
    // 直近の3日は「確定前」
    expect(v1("2026-10-27")[10]).toBe("確定前");
    expect(v1("2026-10-26")[10]).toBe("");
  });

  it("約4分30秒で区切って続きの位置を残し、1分後の続きの実行で残りを処理して、予約を消す", () => {
    const gas = loadGas({ msPerQuery: 50_000 }); // 1回の問い合わせに50秒かかる設定
    expect(gas.g.dailyRun()).toBe("paused");
    const st = JSON.parse(gas.props.get("RUN_STATE")!);
    expect(st.phase).toBe("daily");
    expect(st.cursor).toBe(6); // 6本（5分）を処理したところで区切る
    expect(gas.triggers).toEqual([{ handler: "continueRun", after: 60_000 }]);
    expect(gas.sheet("run_log").body().at(-1)![4]).toBe("時間で区切り、続きを予約");

    let runs = 0;
    while (gas.props.has("RUN_STATE") && runs++ < 20) {
      gas.advance(60_000);
      gas.g.continueRun();
      expect(gas.triggers.filter((t) => t.handler === "continueRun").length).toBeLessThanOrEqual(1); // 予約は二重に作らない
    }
    expect(gas.props.has("RUN_STATE")).toBe(false);
    expect(gas.triggers).toEqual([]); // 続きが終わったら、予約を消す
    const rows = gas.sheet("daily_video").body();
    expect(new Set(rows.map((r) => r[1])).size).toBe(VIDEOS.length); // 全部の動画がそろう
    expect(gas.sheet("run_log").body().at(-1)![4]).toBe("完了");
    expect(gas.sheet("audience_country").body().length).toBeGreaterThan(0);
  });

  it("初回の過去の分の取り込みは、HISTORY_START_DATE（と公開日）から昨日まで", () => {
    const gas = loadGas();
    expect(gas.g.startHistory()).toBe("done");
    const daily = gas.queries.filter((q) => q.dimensions === "day");
    expect(daily[0]).toMatchObject({ filters: "video==vid1", startDate: "2026-09-01", endDate: "2026-10-28" });
    expect(daily.find((q) => q.filters === "video==vid8")!.startDate).toBe(VIDEOS[7].publishedAt);
  });
});

describe("検索キーワード", () => {
  it("上位25件の取得に、maxResults=25 と sort=-views が付く", () => {
    const gas = loadGas();
    gas.g.dailyRun();
    const kw = gas.queries.filter((q) => q.dimensions === "insightTrafficSourceDetail");
    expect(kw.length).toBe((1 + VIDEOS.length) * 2); // チャンネル全体と動画ごと × 直近28日と全期間
    for (const q of kw) {
      expect(q.maxResults).toBe(25);
      expect(q.sort).toBe("-views");
      expect(String(q.filters).startsWith("insightTrafficSourceType==YT_SEARCH")).toBe(true);
    }
  });

  it("動画ごとの取得に、video== の絞り込みが付く", () => {
    const gas = loadGas();
    gas.g.dailyRun();
    const per = gas.queries.filter((q: Query) => q.dimensions === "insightTrafficSourceDetail" && String(q.filters).includes(";video=="));
    expect(per.map((q) => String(q.filters).split(";video==")[1]).sort()).toEqual([...VIDEOS, ...VIDEOS].map((v) => v.id).sort());
    const totals = gas.queries.filter((q) => q.dimensions === "insightTrafficSourceType" && q.filters === "video==vid3");
    expect(totals.length).toBe(2);
  });

  it("「上位25件に入らない検索」を、検索の合計との差で記録する", () => {
    const gas = loadGas();
    gas.g.dailyRun();
    const ch = gas.sheet("search_channel").body().filter((r) => r[0] === "last28");
    expect(ch.map((r) => [r[1], r[2], r[4]])).toEqual([
      ["作り置き 1週間", 400, 1],
      ["鶏むね レシピ", 300, 2],
      ["（上位25件に入らない検索）", 300, ""], // 1000 − (400 + 300)
    ]);
    // 合計より上位の和が大きくなっても、マイナスにはしない
    expect(gas.g.outsideSearch_({ views: 500 }, [{ views: 400 }, { views: 300 }])).toBe(0);
    // 動画ごとの行は、動画ごとに入れ替わり、増え続けない
    gas.advance(DAY);
    gas.g.dailyRun();
    expect(gas.sheet("search_video").body().filter((r) => r[0] === "all" && r[1] === "vid2").length).toBe(3);
  });
});

describe("視聴者", () => {
  it("年齢と性別が空で返ってきても例外にならず、「データなし（しきい値未満）」と記録する", () => {
    const base = defaultAnalytics();
    const gas = loadGas({ analytics: (q) => (q.dimensions === "ageGroup,gender" ? { columnHeaders: [{ name: "ageGroup" }, { name: "gender" }, { name: "viewerPercentage" }] } : base(q)) });
    expect(gas.g.dailyRun()).toBe("done");
    expect(gas.sheet("audience_age_gender").body()).toEqual([
      ["last28", "データなし（しきい値未満）", "", ""],
      ["all", "データなし（しきい値未満）", "", ""],
    ]);
    expect(gas.mails).toEqual([]);
  });
});

describe("失敗の通知", () => {
  it("一時的なエラーは待ち時間を延ばして試し直し、3回失敗したら記録して通知する", () => {
    let fails = 0;
    const base = defaultAnalytics();
    const flaky = loadGas({
      analytics: (q) => {
        if (q.dimensions === "country" && fails++ < 2) throw new Error("API call failed with error: Internal error 503");
        return base(q);
      },
    });
    expect(flaky.g.dailyRun()).toBe("done"); // 2回失敗しても、3回目で成功すれば止まらない
    expect(flaky.sleeps.length).toBe(2);
    expect(flaky.sleeps[1]).toBeGreaterThan(flaky.sleeps[0]);

    const down = loadGas({
      analytics: (q) => {
        if (q.dimensions === "country") throw new Error("API call failed with error: Backend Error 503");
        return base(q);
      },
    });
    expect(down.g.dailyRun()).toBe("error");
    expect(down.queries.filter((q) => q.dimensions === "country").length).toBe(3);
    expect(down.sheet("run_log").body().at(-1)!.slice(4, 6)).toEqual(["エラー", "API call failed with error: Backend Error 503"]);
    expect(down.mails.length).toBe(1);
    expect(down.mails[0].subject).toContain("エラー");
    expect(down.props.has("RUN_STATE")).toBe(false);
  });

  it("許可の期限切れは試し直さず、もう一度許可する手順を案内する通知になる", () => {
    const gas = loadGas({
      analytics: () => {
        throw new Error("Exception: invalid_grant: Token has been expired or revoked.");
      },
    });
    expect(gas.g.dailyRun()).toBe("error");
    expect(gas.sleeps).toEqual([]);
    expect(gas.mails.length).toBe(1);
    expect(gas.mails[0].to).toBe("owner@example.com");
    expect(gas.mails[0].subject).toContain("もう一度、許可");
    expect(gas.mails[0].body).toContain("「もう一度許可する」");
  });

  it("同じ失敗の通知は、1日に2回送らない（翌日は、また送る）", () => {
    const gas = loadGas({
      analytics: () => {
        throw new Error("invalid_grant");
      },
    });
    gas.g.dailyRun();
    gas.advance(3 * 3600_000);
    gas.g.dailyRun();
    expect(gas.mails.length).toBe(1);
    expect(gas.sheet("run_log").body().filter((r) => r[4] === "エラー").length).toBe(2); // 記録は毎回残す
    gas.advance(DAY);
    gas.g.dailyRun();
    expect(gas.mails.length).toBe(2);
  });
});

describe("集計と設定", () => {
  it("週次の集計は、月曜始まりでまとまる", () => {
    const gas = loadGas();
    const rows = [
      ["2026-10-25", "vid1", 10, 30, 0, 0, 0, 0, 0, 0, ""], // 日曜
      ["2026-10-26", "vid1", 20, 60, 0, 0, 0, 0, 0, 0, ""], // 月曜
      ["2026-10-26", "vid2", 5, 15, 0, 0, 0, 0, 0, 0, ""],
      ["2026-11-01", "vid1", 7, 21, 0, 0, 0, 0, 0, 0, "確定前"], // 日曜
      ["2026-11-02", "vid1", 1, 3, 0, 0, 0, 0, 0, 0, "確定前"], // 月曜
    ];
    expect(gas.g.toWeekly_(rows)).toEqual([
      ["2026-10-19", 1, 10, 30, ""],
      ["2026-10-26", 2, 32, 96, "確定前を含む"],
      ["2026-11-02", 1, 1, 3, "確定前を含む"],
    ]);
  });

  it("コードの中に、鍵や本物の ID が書かれていない（スクリプトのプロパティから読む）", () => {
    const code = gasSources()
      .map((f) => f.code)
      .join("\n");
    expect(code).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/); // API キー
    expect(code).not.toMatch(/ya29\.[0-9A-Za-z_-]+/); // アクセストークン
    expect(code).not.toMatch(/GOCSPX-|client_secret/i); // OAuth のクライアントの秘密
    expect(code).not.toMatch(/\bUC[0-9A-Za-z_-]{22}\b/); // チャンネルの ID
    expect(code).not.toMatch(/[0-9A-Za-z_-]{44}/); // スプレッドシートの ID の形
    expect(code).toContain("prop_('SPREADSHEET_ID')");
    expect(code).toContain("prop_('NOTIFY_EMAIL', true)");
    // 読み取りだけの権限：YouTube の書き込みの権限を求めない
    const manifest = JSON.parse(readFileSync(join(GAS_DIR, "appsscript.json"), "utf8"));
    expect(manifest.oauthScopes.filter((s: string) => s.includes("youtube") || s.includes("yt-analytics"))).toEqual([
      "https://www.googleapis.com/auth/yt-analytics.readonly",
      "https://www.googleapis.com/auth/youtube.readonly",
    ]);
  });

  it("スクリプトのプロパティが足りないと、分かる言葉で止まる", () => {
    const gas = loadGas({ props: { SPREADSHEET_ID: "" } });
    expect(() => gas.g.prop_("SPREADSHEET_ID")).toThrow("スクリプトのプロパティ「SPREADSHEET_ID」が設定されていません");
  });
});
