/**
 * 自動実行の設定：毎朝の実行と、続きの実行の予約。
 */

/** 毎朝6時台に dailyRun を動かす（同じトリガーは二重に作らない） */
function installDailyTrigger() {
  removeTriggers_('dailyRun');
  ScriptApp.newTrigger('dailyRun').timeBased().everyDays(1).atHour(6).inTimezone(TZ).create();
}

/** 1分後に続きを実行する予約。予約が残っていれば、作り直さない */
function scheduleContinuation_() {
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'continueRun';
  });
  if (!exists) ScriptApp.newTrigger('continueRun').timeBased().after(60 * 1000).create();
}

/** 続きの予約を消す（続きが終わったとき、エラーで止めたとき） */
function clearContinuation_() {
  removeTriggers_('continueRun');
}

function removeTriggers_(handler) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
  });
}
