// そうたさんの Cloudflare Workers API（2026-11-14 接続確認済み）
window.ASOBIROOM_API_BASE = 'https://asobiroom-stats.aza106302.workers.dev';
window.asobiApi = function (path) {
  const base = window.ASOBIROOM_API_BASE.replace(/\/$/, '');
  return base ? base + path : path;
};
window.ASOBIROOM_RECORDS_API = window.ASOBIROOM_API_BASE
  ? window.asobiApi('/api/records') : undefined;
