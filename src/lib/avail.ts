// 「取れる」「条件つき」「取れない」の一覧。各グラフの印、右下の一覧、「このデモについて」は、すべてここから描く。
// API の仕様は、公開されている仕様にもとづく（ご契約の後に、依頼者のチャンネルで実際に確かめる）

export type AvailKind = "ok" | "cond" | "no";
export const KIND_LABEL: Record<AvailKind, string> = { ok: "取れる", cond: "条件つき", no: "取れない" };

export type Group = "video" | "search" | "audience";
export const GROUP_LABEL: Record<Group, string> = { video: "① 動画ごとの実績", search: "② 検索キーワード", audience: "③ 視聴者" };

export type AvailItem = { id: string; group: Group; kind: AvailKind; label: string; note: string; alt?: string; api?: string };

export const AVAIL: AvailItem[] = [
  {
    id: "daily",
    group: "video",
    kind: "ok",
    label: "動画ごとの日次の指標",
    note: "再生回数、総再生時間、平均視聴時間、平均視聴率、高評価、コメント、登録者の増減を、動画ごと、日ごとに取れます。",
    api: "YouTube Analytics API（dimensions=day、filters=video==動画のID）",
  },
  {
    id: "weekly",
    group: "video",
    kind: "ok",
    label: "週次の推移",
    note: "日次のデータを、レポートの側で月曜始まりの週にまとめます。期間の端で7日に満たない週は「途中」と表示します。",
  },
  {
    id: "meta",
    group: "video",
    kind: "ok",
    label: "動画の題名、公開日、サムネイル、長さ",
    note: "チャンネルの全部の動画の一覧を、毎朝取り直します。新しく公開した動画も、自動で一覧に入ります。",
    api: "YouTube Data API（channels、playlistItems、videos）",
  },
  {
    id: "provisional",
    group: "video",
    kind: "cond",
    label: "直近の3日の数値",
    note: "公開されている仕様では、数値は2〜3日遅れて確定します。直近の数日は、あとで少し増えることがあります。",
    alt: "直近の3日は「確定前」として薄い色で表示し、毎朝、直近5日分を取り直して上書きします。数値がずれたまま残りません。",
  },
  {
    id: "realtime",
    group: "video",
    kind: "no",
    label: "リアルタイムの数値",
    note: "API の数値は、当日の分がすぐには出ません。",
    alt: "毎朝の自動の更新で、昨日までの数字にそろえます。公開の直後の様子は、YouTube Studio で見る使い分けにします。",
  },
  {
    id: "search-channel",
    group: "search",
    kind: "cond",
    label: "チャンネル全体の検索キーワード",
    note: "YouTubeの仕様では、1回に上位25件までしか取得できず、少ない回数のキーワードはプライバシーの保護のため表示されません。",
    alt: "検索からの再生の合計もあわせて取り、上位25件との差を「上位25件に入らない検索」として表示します。検索の全体の大きさが分かります。",
    api: "YouTube Analytics API（dimensions=insightTrafficSourceDetail、filters=insightTrafficSourceType==YT_SEARCH、sort=-views、maxResults=25）",
  },
  {
    id: "search-video",
    group: "search",
    kind: "cond",
    label: "動画ごとの検索キーワード",
    note: "動画ごとに絞り込んで取得できます。チャンネル全体と同じく、上位25件までです。再生の少ない動画では、キーワードがほとんど返ってこないことがあります。",
    alt: "動画ごとにも「上位25件に入らない検索」を表示します。",
    api: "filters に ;video==動画のID を足す",
  },
  {
    id: "search-connector",
    group: "search",
    kind: "no",
    label: "Looker Studio の標準のコネクタでの検索キーワード",
    note: "標準の YouTube のコネクタは、コードなしで主要な指標を出せますが、検索キーワードは扱えません。",
    alt: "GAS と API で検索キーワードを取り、スプレッドシートに蓄積して、Looker Studio につなぎます（第2段階）。",
  },
  {
    id: "country",
    group: "audience",
    kind: "ok",
    label: "国ごとの再生",
    note: "国ごとの再生回数と総再生時間を取れます。",
    api: "YouTube Analytics API（dimensions=country）",
  },
  {
    id: "age-gender",
    group: "audience",
    kind: "cond",
    label: "年齢と性別",
    note: "ログインしている視聴者の分だけで、人数ではなく割合だけです。人数が少ない期間や動画では、返ってきません。",
    alt: "割合のグラフで表示し、返ってこないときはエラーにせず「データなし（しきい値未満）」と表示します。",
    api: "YouTube Analytics API（dimensions=ageGroup,gender、metrics=viewerPercentage）",
  },
  {
    id: "city",
    group: "audience",
    kind: "cond",
    label: "市区町村",
    note: "市区町村の単位は、条件つきで取れる可能性があります。返ってくる範囲は、チャンネルの規模によります。",
    alt: "ご契約の後に、依頼者のチャンネルで実際に確かめてから、レポートに入れるかを決めます。",
    api: "YouTube Analytics API（dimensions=city）",
  },
  {
    id: "prefecture",
    group: "audience",
    kind: "no",
    label: "都道府県",
    note: "YouTubeの仕様では、地域の集計はアメリカの州だけが対象で、日本の都道府県では集計できません。",
    alt: "国の単位と、市区町村の単位（条件つき）で代えます。",
  },
];

export const availById = (id: string) => {
  const a = AVAIL.find((x) => x.id === id);
  if (!a) throw new Error(`unknown avail: ${id}`);
  return a;
};
