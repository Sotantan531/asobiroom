/* asobiroom 共通のプレイ・訪問回数送信。匿名イベントを安全に再送する。 */
(() => {
  'use strict';
  const ENDPOINT = (window.asobiApi ? window.asobiApi('/api/activity') : '/api/activity');
  const QUEUE_KEY = 'asobiroom-activity-pending-v1';
  const ALLOWED = new Set(['visit', 'darts', 'dobon-quiz', 'sector-09']);
  let pending = [];
  let sending = false;
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (Array.isArray(saved)) pending = saved.filter(e => e && typeof e.id === 'string' && ALLOWED.has(e.kind)).slice(-150);
  } catch { /* プライベートモードではメモリにだけ保持 */ }

  function persist() {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(pending.slice(-150))); } catch { /* ストレージ無効 */ }
  }

  async function flush() {
    if (sending || !pending.length || !navigator.onLine) return;
    sending = true;
    try {
      while (pending.length) {
        const event = pending[0];
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
          credentials: 'omit',
          cache: 'no-store',
          keepalive: true
        });
        if (!response.ok) break;
        pending.shift();
        persist();
      }
    } catch { /* オフラインやサーバー更新中は次回に再送 */ }
    finally { sending = false; }
  }

  function record(kind) {
    if (!ALLOWED.has(kind)) return;
    pending.push({ id: crypto.randomUUID(), kind });
    pending = pending.slice(-150);
    persist();
    void flush();
  }

  function visit() {
    try {
      if (sessionStorage.getItem('asobiroom-visit-counted')) return;
      sessionStorage.setItem('asobiroom-visit-counted', '1');
    } catch { /* セッションストレージ無効なら通常計測 */ }
    record('visit');
  }

  async function summary() {
    const response = await fetch(ENDPOINT, { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) throw new Error('集計データを取得できません');
    const result = await response.json();
    if (!result || typeof result.visits !== 'number' || !result.games) throw new Error('集計データの形式が異なります');
    return result;
  }

  window.asobiActivity = { play: record, visit, summary, flush };
  addEventListener('online', flush);
  if (pending.length) void flush();
})();
