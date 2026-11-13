// まず backend/ を Cloudflare Workers に公開し、URLをここに入力してください。
// 例: https://asobiroom-stats.example.workers.dev （末尾の / は不要）
window.ASOBIROOM_API_BASE = '';
window.asobiApi = function (path) {
  const base = window.ASOBIROOM_API_BASE.replace(/\/$/, '');
  return base ? base + path : path;
};
window.ASOBIROOM_RECORDS_API = window.ASOBIROOM_API_BASE
  ? window.asobiApi('/api/records') : undefined;
