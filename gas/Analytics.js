/**
 * YouTube Analytics API（v2）の呼び出しをまとめる。読み取りだけの権限（yt-analytics.readonly）で動く。
 * 一時的なエラーは withRetry_ で待ち時間を延ばしながら試し直す。
 */

var DAILY_METRICS = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,subscribersGained,subscribersLost';

function query_(params) {
  var p = { ids: 'channel==MINE' };
  for (var k in params) if (params[k] !== undefined && params[k] !== '') p[k] = params[k];
  var res = withRetry_(function () {
    return YouTubeAnalytics.Reports.query(p);
  });
  return toObjects_(res);
}

/** 結果（列の見出し＋行）を、列の名前を鍵にしたオブジェクトの配列にする。空の結果は [] */
function toObjects_(res) {
  if (!res || !res.rows || !res.rows.length) return [];
  var names = res.columnHeaders.map(function (h) {
    return h.name;
  });
  return res.rows.map(function (r) {
    var o = {};
    names.forEach(function (n, i) {
      o[n] = r[i];
    });
    return o;
  });
}

/** 動画ごとの日次の指標 */
function fetchVideoDaily_(videoId, start, end) {
  return query_({ startDate: start, endDate: end, metrics: DAILY_METRICS, dimensions: 'day', filters: 'video==' + videoId, sort: 'day' });
}

/**
 * 検索キーワードの上位25件（videoId を渡すと、その動画だけ）。
 * maxResults と sort を付けないと、エラーになる
 */
function fetchSearchKeywords_(start, end, videoId) {
  return query_({
    startDate: start,
    endDate: end,
    metrics: 'views,estimatedMinutesWatched',
    dimensions: 'insightTrafficSourceDetail',
    filters: 'insightTrafficSourceType==YT_SEARCH' + (videoId ? ';video==' + videoId : ''),
    sort: '-views',
    maxResults: SEARCH_LIMIT,
  });
}

/** 検索からの再生の合計（上位25件との差を「上位25件に入らない検索」として残すため） */
function fetchSearchTotal_(start, end, videoId) {
  var rows = query_({
    startDate: start,
    endDate: end,
    metrics: 'views,estimatedMinutesWatched',
    dimensions: 'insightTrafficSourceType',
    filters: videoId ? 'video==' + videoId : '',
  });
  for (var i = 0; i < rows.length; i++) if (rows[i].insightTrafficSourceType === 'YT_SEARCH') return rows[i];
  return { views: 0, estimatedMinutesWatched: 0 };
}

/** 上位25件に入らない検索 ＝ 検索の合計 − 上位25件の合計（マイナスにはしない） */
function outsideSearch_(total, keywords) {
  var top = keywords.reduce(function (a, k) {
    return a + Number(k.views || 0);
  }, 0);
  return Math.max(0, Number(total.views || 0) - top);
}

function fetchCountry_(start, end) {
  return query_({ startDate: start, endDate: end, metrics: 'views,estimatedMinutesWatched', dimensions: 'country', sort: '-views' });
}

/** 市区町村（条件つき。返ってこない、または使えない場合がある） */
function fetchCity_(start, end) {
  return query_({ startDate: start, endDate: end, metrics: 'views', dimensions: 'city', sort: '-views', maxResults: 10 });
}

/** 年齢と性別（ログインしている視聴者の割合だけ。人数が少ないと空で返る） */
function fetchAgeGender_(start, end) {
  return query_({ startDate: start, endDate: end, metrics: 'viewerPercentage', dimensions: 'ageGroup,gender', sort: 'gender,ageGroup' });
}

/** 一時的なエラーか（500番台、レート制限）。許可の切れや、引数の誤りは試し直さない */
function isTransient_(e) {
  var msg = String((e && e.message) || e);
  return /\b(5\d\d)\b|backendError|internalError|Internal error|Service unavailable|rateLimitExceeded|userRateLimitExceeded|\b429\b|Empty response/i.test(msg);
}

function withRetry_(fn) {
  for (var attempt = 1; ; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (!isTransient_(e) || attempt >= MAX_ATTEMPTS) throw e;
      Utilities.sleep(1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500)); // 1秒、2秒…と延ばす
    }
  }
}
