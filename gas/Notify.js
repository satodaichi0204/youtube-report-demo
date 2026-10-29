/**
 * 失敗したときのメールの通知。
 * 許可の期限切れ（認証のエラー）は文面を分けて、もう一度許可する手順を案内する。
 * 同じ種類の失敗の通知は、1日に1回まで。
 */

function isAuthError_(e) {
  var msg = String((e && e.message) || e);
  return /invalid_grant|unauthori[sz]ed|authorization|Login Required|\b401\b|認証|許可が必要/i.test(msg);
}

function notifyFailure_(e, kind) {
  var to = prop_('NOTIFY_EMAIL', true);
  if (!to) return 'no-address';
  var auth = isAuthError_(e);
  var type = auth ? 'auth' : 'error';
  var today = fmtDate_(now_());
  var props = PropertiesService.getScriptProperties();
  var key = 'LAST_NOTICE_' + type;
  if (props.getProperty(key) === today) return 'skipped'; // 同じ失敗の通知は、1日に1回まで
  var msg = String((e && e.message) || e);
  var subject, body;
  if (auth) {
    subject = '【YouTube レポート】もう一度、許可をお願いします';
    body = [
      'YouTube のデータを読み取る許可の期限が切れたため、' + kind + 'を止めました。',
      '',
      '次の手順で、もう一度許可してください（1分ほどで終わります）。',
      '1. レポートのスプレッドシートを開きます。',
      '2. メニューの「YouTube レポート」→「もう一度許可する」を押します。',
      '3. 表示される画面で、レポートを作った Google アカウントを選び、「許可」を押します。',
      '',
      '許可の後は、翌朝から自動で動きます。すぐに更新する場合は、同じメニューの「今すぐ更新」を押してください。',
      '',
      '（エラーの内容：' + msg + '）',
    ].join('\n');
  } else {
    subject = '【YouTube レポート】' + kind + 'でエラーが起きました';
    body = [
      kind + 'の途中でエラーが起きました。スプレッドシートの run_log のシートに記録しています。',
      '一時的なエラーの場合は、翌朝の実行で直近5日分を取り直すため、数値は自動でそろいます。',
      '続く場合は、ご連絡ください。',
      '',
      '（エラーの内容：' + msg + '）',
    ].join('\n');
  }
  MailApp.sendEmail(to, subject, body);
  props.setProperty(key, today);
  return type;
}
