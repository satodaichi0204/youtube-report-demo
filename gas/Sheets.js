/**
 * スプレッドシートへの書き込み。
 * 日次の行は「日付＋動画のID」を鍵に上書きする（同じ日と動画の行があれば置き換え、なければ足す）。
 */

function book_() {
  return SpreadsheetApp.openById(prop_('SPREADSHEET_ID'));
}

/** シートを開く（無ければ見出しつきで作る） */
function sheet_(name) {
  var ss = book_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** 見出しを除いた全部の行 */
function readRows_(name) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, SHEETS[name].length).getValues();
}

/** 見出しを除いた全部の行を書き直す */
function writeRows_(name, rows) {
  var sh = sheet_(name);
  var width = SHEETS[name].length;
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, width).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, width).setValues(rows);
}

/**
 * 鍵の列（keyCols）が同じ行を置き換え、無ければ足す。日付の順に並べ直す。
 * 直近5日分を毎朝取り直しても、行は増えない
 */
function upsertRows_(name, keyCols, rows) {
  var all = readRows_(name);
  var key = function (r) {
    return keyCols
      .map(function (c) {
        return normalizeCell_(r[c]);
      })
      .join('|');
  };
  var index = {};
  all.forEach(function (r, i) {
    index[key(r)] = i;
  });
  var added = 0;
  rows.forEach(function (r) {
    var k = key(r);
    if (k in index) all[index[k]] = r;
    else {
      index[k] = all.length;
      all.push(r);
      added++;
    }
  });
  all.sort(function (a, b) {
    var x = key(a), y = key(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  writeRows_(name, all);
  return { added: added, replaced: rows.length - added };
}

/** 期間ごとに入れ替えるシート（検索、視聴者）：その期間（と動画）の行を消して、新しい行を書く */
function replacePeriodRows_(name, period, rows, videoId) {
  var keep = readRows_(name).filter(function (r) {
    if (r[0] !== period) return true;
    return videoId !== undefined && r[1] !== videoId;
  });
  writeRows_(name, keep.concat(rows));
}

/** シートから読んだ日付（Date になることがある）を 'yyyy-MM-dd' にそろえる */
function normalizeCell_(v) {
  if (v instanceof Date) return fmtDate_(v);
  return String(v);
}

function writeVideos_(videos) {
  var stamp = Utilities.formatDate(now_(), TZ, 'yyyy-MM-dd HH:mm:ss');
  var rows = videos.map(function (v) {
    return [v.id, v.title, v.publishedAt, v.durationSec, v.thumbnail, stamp];
  });
  upsertRows_('videos', [0], rows);
}

function readVideos_() {
  return readRows_('videos')
    .map(function (r) {
      return { id: String(r[0]), title: r[1], publishedAt: normalizeCell_(r[2]) };
    })
    .sort(function (a, b) {
      return a.publishedAt < b.publishedAt ? -1 : a.publishedAt > b.publishedAt ? 1 : a.id < b.id ? -1 : 1;
    });
}

/** API の日次の行を、daily_video の行にする */
function toDailyRows_(videoId, objs) {
  var provisionalFrom = daysAgo_(PROVISIONAL_DAYS);
  return objs.map(function (o) {
    return [
      o.day,
      videoId,
      Number(o.views || 0),
      Number(o.estimatedMinutesWatched || 0),
      Number(o.averageViewDuration || 0),
      Number(o.averageViewPercentage || 0),
      Number(o.likes || 0),
      Number(o.comments || 0),
      Number(o.subscribersGained || 0),
      Number(o.subscribersLost || 0),
      o.day >= provisionalFrom ? '確定前' : '',
    ];
  });
}

/** 月曜始まりの週にまとめる（daily_video の行 → weekly_channel の行） */
function toWeekly_(dailyRows) {
  var weeks = {};
  dailyRows.forEach(function (r) {
    var day = normalizeCell_(r[0]);
    var p = day.split('-');
    var dow = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]))).getUTCDay(); // 0 = 日曜
    var monday = addDays_(day, -((dow - WEEK_START + 7) % 7));
    var w = weeks[monday] || (weeks[monday] = { days: {}, views: 0, minutes: 0, provisional: false });
    w.days[day] = true;
    w.views += Number(r[2]);
    w.minutes += Number(r[3]);
    if (r[10]) w.provisional = true;
  });
  return Object.keys(weeks)
    .sort()
    .map(function (m) {
      var w = weeks[m];
      return [m, Object.keys(w.days).length, w.views, w.minutes, w.provisional ? '確定前を含む' : ''];
    });
}

function log_(kind, count, ms, result, error) {
  sheet_('run_log').appendRow([Utilities.formatDate(now_(), TZ, 'yyyy-MM-dd HH:mm:ss'), kind, count, Math.round(ms / 1000), result, error || '']);
}
