/**
 * 初回の設定と、スプレッドシートのメニュー。
 * GAS とスプレッドシートは、依頼者の Google ドライブに置く前提（契約が終わっても、依頼者の手元で動き続ける）。
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('YouTube レポート')
    .addItem('初回の設定', 'setup')
    .addItem('過去の分を取り込む', 'startHistory')
    .addItem('今すぐ更新', 'dailyRun')
    .addSeparator()
    .addItem('もう一度許可する', 'reauthorize')
    .addToUi();
}

/** 初回の設定：シートを作り、許可を求め、毎朝の自動実行を入れて、過去の分の取り込みを始める */
function setup() {
  Object.keys(SHEETS).forEach(function (name) {
    sheet_(name);
  });
  reauthorize();
  installDailyTrigger();
  return startHistory();
}

/**
 * 許可を求める。メニューから実行すると、必要なら Google の許可の画面が出る。
 * 自分で作ったスクリプトのため「このアプリは確認されていません」と出るが、依頼者のアカウントの中だけで動く
 */
function reauthorize() {
  YouTube.Channels.list('id', { mine: true });
  try {
    SpreadsheetApp.getActive().toast('許可できました。翌朝から自動で動きます。', 'YouTube レポート');
  } catch (e) {
    // トリガーやエディタから実行したときは、画面の通知を出さない
  }
  return 'ok';
}
