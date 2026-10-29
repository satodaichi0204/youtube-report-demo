import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("概要：指標のカードと推移。直近の3日は確定前で、印を押すと理由と代わりの案が出る", async ({ page }) => {
  await expect(page.getByTestId("stat-views")).toContainText("回");
  await expect(page.getByTestId("stat-views-change")).toContainText("前の期間より");
  await expect(page.getByTestId("provisional-legend")).toContainText("確定前（2〜3日で確定します）");
  await expect(page.getByTestId("trend-chart").locator(".recharts-surface").first()).toBeVisible();
  await page.getByTestId("avail-provisional").click();
  const pop = page.getByTestId("avail-pop-provisional");
  await expect(pop).toContainText("2〜3日遅れて確定");
  await expect(pop).toContainText("直近5日分を取り直して上書き");
  await page.keyboard.press("Escape");
  await expect(pop).toBeHidden();
  // 週次に切り替えると、見出しが変わる
  await page.getByTestId("grain-week").click();
  await expect(page.getByTestId("trend")).toContainText("週次（月曜始まり）の推移");
  await expect(page.getByTestId("top-videos").locator("li")).toHaveCount(5);
});

test("期間を変えると数値が変わり、ほかのページに移っても同じ期間のまま", async ({ page }) => {
  const before = await page.getByTestId("stat-views").textContent();
  await page.getByTestId("period-7").click();
  await expect(page.getByTestId("stat-views")).not.toHaveText(before!);
  await page.getByTestId("period-all").click();
  await expect(page.getByTestId("stat-views-change")).toContainText("全期間のため");
  await page.getByRole("link", { name: "視聴者" }).click();
  await expect(page).toHaveURL(/\/audience$/);
  await expect(page.getByTestId("period-all")).toHaveAttribute("aria-pressed", "true");
});

test("動画の比較：公開日からの日数でそろえ、3本まで選べる。並べ替えと、検索キーワードへの移動", async ({ page }) => {
  await page.goto("/videos");
  await expect(page.getByTestId("since-note")).toContainText("公開日が違う動画を、公平に比べるための表示です");
  await expect(page.getByTestId("compare-chart").locator(".recharts-line")).toHaveCount(3);
  // 3本選んでいるので、4本目は選べない
  const table = page.getByTestId("video-table");
  await expect(table.getByRole("checkbox", { checked: false }).first()).toBeDisabled();
  // 1本外すと、別の動画を選べる（四角は見た目を整えるため、本物のチェックボックスを見えなくしている）
  await table.getByRole("checkbox", { name: "比べる：二度揚げしない 唐揚げ" }).uncheck({ force: true });
  await expect(page.getByTestId("compare-chart").locator(".recharts-line")).toHaveCount(2);
  await table.getByRole("checkbox", { name: "比べる：時短 夜ごはん 3品を20分で" }).check({ force: true });
  await expect(page.getByTestId("compare-chart").locator(".recharts-line")).toHaveCount(3);
  await page.getByTestId("align-date").click();
  await expect(page.getByTestId("since-note")).toBeHidden();
  // 公開日で並べ替え（新しい順）
  await page.getByTestId("sort-publishedAt").click();
  await expect(table.locator("tbody tr").first()).toHaveAttribute("data-id", "demo_v30");
  await page.getByTestId("to-search-demo_v01").click();
  await expect(page).toHaveURL(/\/search\?video=demo_v01$/);
  await expect(page.getByTestId("keywords")).toContainText("この動画の検索キーワード");
  await expect(page.getByTestId("keywords")).toContainText("鶏むね レシピ");
});

test("検索キーワード：上位25件のあとに「上位25件に入らない検索」の棒。条件つきの印の説明", async ({ page }) => {
  await page.goto("/search");
  const bars = page.getByTestId("keyword-bars").locator("li");
  await expect(bars).toHaveCount(26);
  await expect(bars.last()).toHaveAttribute("data-tone", "outside");
  await expect(bars.last()).toContainText("上位25件に入らない検索");
  // 「入らない検索」の数 ＝ 検索からの再生 − 上位25件の合計
  const num = (s: string | null) => Number((s ?? "").replace(/[^\d]/g, ""));
  const total = num(await page.getByTestId("search-total").textContent());
  const outside = num(await page.getByTestId("search-outside").textContent());
  let top = 0;
  for (const t of await bars.evaluateAll((els) => els.slice(0, 25).map((e) => e.getAttribute("title")))) top += num(t!.split("：")[1]);
  expect(outside).toBe(total - top);
  await page.getByTestId("avail-search-channel").click();
  await expect(page.getByTestId("avail-pop-search-channel")).toContainText("1回に上位25件までしか取得できず");
  // 動画を選ぶと、その動画の上位に切り替わる
  await page.getByTestId("video-select").selectOption("demo_v03");
  await expect(page).toHaveURL(/video=demo_v03/);
  await expect(page.getByTestId("keywords")).toContainText("作り置き 段取り");
  await expect(page.getByTestId("avail-search-video")).toBeVisible();
});

test("視聴者：都道府県は「取れない」で灰色。理由と代わりの案。年齢と性別は条件つき", async ({ page }) => {
  await page.goto("/audience");
  await expect(page.getByTestId("country-bars").locator("li")).toHaveCount(9);
  await expect(page.getByTestId("city-bars").locator("li")).toHaveCount(10);
  await expect(page.getByTestId("avail-age-gender")).toContainText("条件つき");
  await page.getByTestId("avail-prefecture").click();
  const pop = page.getByTestId("avail-pop-prefecture");
  await expect(pop).toContainText("アメリカの州だけが対象で、日本の都道府県では集計できません");
  await expect(pop).toContainText("国の単位と、市区町村の単位（条件つき）で代えます");
  await page.mouse.click(5, 5);
  await expect(pop).toBeHidden();
});

test("右下の「この画面で取れるもの」：①②③の全部が、印と一緒に一覧で見られる", async ({ page }) => {
  await page.getByTestId("avail-panel-open").click();
  const panel = page.getByTestId("avail-panel");
  await expect(panel.locator("li")).toHaveCount(12);
  await expect(panel.locator('li[data-kind="ok"]')).toHaveCount(4);
  await expect(panel.locator('li[data-kind="cond"]')).toHaveCount(5);
  await expect(panel.locator('li[data-kind="no"]')).toHaveCount(3);
  await expect(panel).toContainText("① 動画ごとの実績");
  await expect(panel).toContainText("③ 視聴者");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("このデモについて：構成図とテストの結果。全部のページで、架空の表示があり、横にはみ出さない", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("main svg[role=img]")).toHaveCount(1);
  await expect(page.getByTestId("about-avail").locator("li")).toHaveCount(12);
  await expect(page.getByTestId("test-results")).not.toContainText("測定中");
  for (const path of ["/", "/videos", "/search", "/audience", "/about"]) {
    await page.goto(path);
    await expect(page.locator("footer")).toContainText("数値はすべて架空です");
    await expect(page.locator("footer")).toContainText("ぱくたそ");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
  }
});
