/**
 * 毎朝の処理の本体。
 * 順番：動画の一覧 → 動画ごとの日次 → 週次のまとめ → 検索キーワード → 視聴者。
 * GAS の1回の実行は6分までのため、約4分30秒で区切り、どこまで処理したかを PropertiesService に残して、
 * 1分後に続きを実行する予約を入れる。続きが全部終わったら、予約を消す。
 */

var STATE_KEY = 'RUN_STATE';

/** 毎朝のトリガーから呼ばれる。直近5日分を取り直して上書きする */
function dailyRun() {
  var st = loadState_();
  // 過去の分の取り込みの途中なら、それを先に終わらせる
  if (st && st.mode === 'history') return continueRun();
  return run_({ mode: 'daily', phase: 'videos', cursor: 0, count: 0, startedAt: now_().getTime() });
}

/** 初回の過去の分の取り込み（HISTORY_START_DATE から昨日まで）。何回かに分けて進む */
function startHistory() {
  prop_('HISTORY_START_DATE');
  return run_({ mode: 'history', phase: 'videos', cursor: 0, count: 0, startedAt: now_().getTime() });
}

/** 予約した続きの実行 */
function continueRun() {
  var st = loadState_();
  if (!st) {
    clearContinuation_();
    return 'nothing';
  }
  return run_(st);
}

function run_(st) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) return 'locked'; // 別の実行が動いている
  var t0 = now_().getTime();
  try {
    var result = step_(st, t0);
    if (result === 'paused') {
      saveState_(st);
      scheduleContinuation_();
      log_(kindLabel_(st), st.count, now_().getTime() - t0, '時間で区切り、続きを予約');
      return 'paused';
    }
    clearState_();
    clearContinuation_();
    log_(kindLabel_(st), st.count, now_().getTime() - st.startedAt, '完了');
    return 'done';
  } catch (e) {
    clearState_();
    clearContinuation_();
    log_(kindLabel_(st), st.count, now_().getTime() - t0, 'エラー', String((e && e.message) || e));
    notifyFailure_(e, kindLabel_(st));
    return 'error';
  } finally {
    lock.releaseLock();
  }
}

function kindLabel_(st) {
  return st.mode === 'history' ? '過去の分の取り込み' : '毎朝の更新';
}

/** 実行を始めてから、約4分30秒を過ぎたか */
function timeUp_(t0) {
  return now_().getTime() - t0 > TIME_BUDGET_MS;
}

/** 段階ごとに進める。時間が来たら 'paused' を返す（st.phase と st.cursor が続きの位置） */
function step_(st, t0) {
  if (st.phase === 'videos') {
    writeVideos_(listAllVideos_());
    st.phase = 'daily';
    st.cursor = 0;
  }

  var videos = readVideos_();
  var end = daysAgo_(1);

  if (st.phase === 'daily') {
    var windowStart = st.mode === 'history' ? prop_('HISTORY_START_DATE') : daysAgo_(RECENT_DAYS);
    for (; st.cursor < videos.length; st.cursor++) {
      if (timeUp_(t0)) return 'paused';
      var v = videos[st.cursor];
      var start = v.publishedAt > windowStart ? v.publishedAt : windowStart;
      if (start > end) continue; // 今日公開した動画は、明日から
      upsertRows_('daily_video', [0, 1], toDailyRows_(v.id, fetchVideoDaily_(v.id, start, end)));
      st.count++;
    }
    writeRows_('weekly_channel', toWeekly_(readRows_('daily_video')));
    st.phase = 'search';
    st.cursor = 0;
  }

  if (st.phase === 'search') {
    // cursor 0 はチャンネル全体、1 からは動画ごと
    for (; st.cursor <= videos.length; st.cursor++) {
      if (timeUp_(t0)) return 'paused';
      var vid = st.cursor === 0 ? undefined : videos[st.cursor - 1].id;
      PERIODS.forEach(function (p) {
        writeSearch_(p, vid);
      });
      st.count++;
    }
    st.phase = 'audience';
  }

  if (st.phase === 'audience') {
    if (timeUp_(t0)) return 'paused';
    PERIODS.forEach(function (p) {
      writeAudience_(p);
    });
    st.phase = 'done';
  }
  return 'done';
}

/** 検索キーワードの上位25件と、「上位25件に入らない検索」を書く */
function writeSearch_(period, videoId) {
  var r = periodRange_(period);
  var kws = fetchSearchKeywords_(r.start, r.end, videoId);
  var total = fetchSearchTotal_(r.start, r.end, videoId);
  var outside = outsideSearch_(total, kws);
  if (videoId) {
    var rows = kws.map(function (k, i) {
      return [period, videoId, k.insightTrafficSourceDetail, Number(k.views), i + 1];
    });
    rows.push([period, videoId, OUTSIDE_LABEL, outside, '']);
    replacePeriodRows_('search_video', period, rows, videoId);
  } else {
    var rowsC = kws.map(function (k, i) {
      return [period, k.insightTrafficSourceDetail, Number(k.views), Number(k.estimatedMinutesWatched || 0), i + 1];
    });
    rowsC.push([period, OUTSIDE_LABEL, outside, '', '']);
    replacePeriodRows_('search_channel', period, rowsC);
  }
}

/** 視聴者（国、市区町村、年齢と性別）。しきい値のため空で返ってきても、エラーにしない */
function writeAudience_(period) {
  var r = periodRange_(period);

  var countries = fetchCountry_(r.start, r.end).map(function (o) {
    return [period, o.country, Number(o.views), Number(o.estimatedMinutesWatched || 0)];
  });
  replacePeriodRows_('audience_country', period, countries.length ? countries : [[period, NO_DATA_LABEL, '', '']]);

  var cities;
  try {
    cities = fetchCity_(r.start, r.end).map(function (o) {
      return [period, o.city, Number(o.views)];
    });
  } catch (e) {
    // 市区町村は条件つき。取れないチャンネルでは、ほかの処理を止めずに記録だけ残す
    if (!isTransient_(e) && !isAuthError_(e)) cities = [[period, '取得できません：' + String((e && e.message) || e).slice(0, 80), '']];
    else throw e;
  }
  replacePeriodRows_('audience_city', period, cities.length ? cities : [[period, NO_DATA_LABEL, '']]);

  var ag = fetchAgeGender_(r.start, r.end).map(function (o) {
    return [period, o.ageGroup, o.gender, Number(o.viewerPercentage)];
  });
  replacePeriodRows_('audience_age_gender', period, ag.length ? ag : [[period, NO_DATA_LABEL, '', '']]);
}

function loadState_() {
  var s = PropertiesService.getScriptProperties().getProperty(STATE_KEY);
  return s ? JSON.parse(s) : null;
}
function saveState_(st) {
  PropertiesService.getScriptProperties().setProperty(STATE_KEY, JSON.stringify(st));
}
function clearState_() {
  PropertiesService.getScriptProperties().deleteProperty(STATE_KEY);
}
