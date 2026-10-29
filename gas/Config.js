/**
 * 設定：スクリプトのプロパティの読み込み、シートの名前と列、処理の決まり。
 * 鍵、チャンネルの ID、スプレッドシートの ID は、コードに書かない（スクリプトのプロパティに置く）。
 */

var TZ = 'Asia/Tokyo';

/** 毎朝、取り直す日数。API の数値は2〜3日遅れて確定するため、前日の分だけを足す作りでは、ずれたまま残る */
var RECENT_DAYS = 5;
/** この日数より新しい日は「確定前」とする */
var PROVISIONAL_DAYS = 3;
/** GAS の1回の実行は6分まで。余裕を見て、約4分30秒で区切って続きを予約する */
var TIME_BUDGET_MS = 4.5 * 60 * 1000;
/** 検索キーワードは、公開されている仕様では1回に上位25件まで */
var SEARCH_LIMIT = 25;
/** 一時的なエラー（500番台、レート制限）は、3回まで試す */
var MAX_ATTEMPTS = 3;
/** 週の始まり（1 = 月曜） */
var WEEK_START = 1;
/** 検索キーワードと視聴者を取る期間 */
var PERIODS = ['last28', 'all'];
var OUTSIDE_LABEL = '（上位25件に入らない検索）';
var NO_DATA_LABEL = 'データなし（しきい値未満）';

var SHEETS = {
  videos: ['動画のID', '題名', '公開日', '長さ（秒）', 'サムネイルのURL', '最終の更新日時'],
  daily_video: ['日付', '動画のID', '再生回数', '総再生時間（分）', '平均視聴時間（秒）', '平均視聴率（%）', '高評価', 'コメント', '登録者の増加', '登録者の減少', '確定前'],
  weekly_channel: ['週の始まり（月曜）', '日数', '再生回数', '総再生時間（分）', '確定前を含む'],
  search_channel: ['期間', 'キーワード', '再生回数', '総再生時間（分）', '順位'],
  search_video: ['期間', '動画のID', 'キーワード', '再生回数', '順位'],
  audience_country: ['期間', '国', '再生回数', '総再生時間（分）'],
  audience_city: ['期間', '市区町村', '再生回数'],
  audience_age_gender: ['期間', '年齢', '性別', '視聴者の割合（%）'],
  run_log: ['実行の日時', '種類', '処理した件数', 'かかった時間（秒）', '結果', 'エラーの内容'],
};

/** スクリプトのプロパティを、使う所でだけ読む（足りないときは、分かる言葉で止める） */
function prop_(key, optional) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v && !optional) throw new Error('スクリプトのプロパティ「' + key + '」が設定されていません');
  return v;
}

/** 今の時刻（テストでは、時計を進める偽物に差し替える） */
function now_() {
  return new Date();
}

function fmtDate_(d) {
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

/** 今日から n 日前の日付（'yyyy-MM-dd'）。日本時間で数える */
function daysAgo_(n) {
  var today = fmtDate_(now_());
  return addDays_(today, -n);
}

/** 'yyyy-MM-dd' に日数を足す（時差の影響を受けないよう UTC で計算する） */
function addDays_(ymd, n) {
  var p = ymd.split('-');
  var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n));
  return d.toISOString().slice(0, 10);
}

function periodRange_(period) {
  var end = daysAgo_(1);
  if (period === 'last28') return { start: daysAgo_(28), end: end };
  return { start: prop_('HISTORY_START_DATE'), end: end };
}
