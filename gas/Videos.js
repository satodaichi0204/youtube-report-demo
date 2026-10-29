/**
 * チャンネルの全部の動画の一覧（YouTube Data API）。
 * channels.list の uploads のプレイリスト → playlistItems.list（50件ずつ）→ videos.list（50件ずつ）
 */

function listAllVideos_() {
  var ch = withRetry_(function () {
    return YouTube.Channels.list('contentDetails', { mine: true });
  });
  if (!ch.items || !ch.items.length) throw new Error('チャンネルが見つかりません（許可したアカウントを確かめてください）');
  var uploads = ch.items[0].contentDetails.relatedPlaylists.uploads;

  var ids = [];
  var pageToken = '';
  do {
    var page = withRetry_(function () {
      return YouTube.PlaylistItems.list('contentDetails', { playlistId: uploads, maxResults: 50, pageToken: pageToken });
    });
    (page.items || []).forEach(function (it) {
      ids.push(it.contentDetails.videoId);
    });
    pageToken = page.nextPageToken || '';
  } while (pageToken);

  var videos = [];
  for (var i = 0; i < ids.length; i += 50) {
    var chunk = ids.slice(i, i + 50);
    var res = withRetry_(function () {
      return YouTube.Videos.list('snippet,contentDetails', { id: chunk.join(','), maxResults: 50 });
    });
    (res.items || []).forEach(function (v) {
      var th = v.snippet.thumbnails || {};
      videos.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: fmtDate_(new Date(v.snippet.publishedAt)),
        durationSec: parseDuration_(v.contentDetails.duration),
        thumbnail: (th.medium || th.default || {}).url || '',
      });
    });
  }
  return videos;
}

/** ISO 8601 の長さ（例：PT12M3S）を秒にする */
function parseDuration_(iso) {
  var m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return 0;
  return Number(m[1] || 0) * 86400 + Number(m[2] || 0) * 3600 + Number(m[3] || 0) * 60 + Number(m[4] || 0);
}
