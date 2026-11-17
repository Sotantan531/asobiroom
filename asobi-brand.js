/* asobiroom common game brand. Include in every future game's HTML. */
(() => {
  'use strict';
  const titles={'zero-dive':'深海ゼロダイブ','darts':'FLIGHTLINE DARTS','dobon-quiz':'ドボンクイズ','sector-01':'隔離区画 01 · 石像の庭園','billiards':'BILLIARDS CLUB','bowling':'ポケット・ボウリング','crystal-pop':'クリスタル・ポップ'};
  const gameTitle=titles[location.pathname.split('/')[1]]||'PLAY SOMETHING GOOD.';
  const artwork = '/icon-192.png';
  const markup = `<img src="${artwork}" alt="" width="34" height="34" decoding="async"><span class="asobi-brand-copy"><strong class="asobi-brand-name">asobiroom</strong><small class="asobi-brand-tagline">${gameTitle}</small></span>`;

  function install(node, preserveLongPress = false) {
    if (!node || node.classList.contains('asobi-unified-brand')) return;
    let brand = node;
    if (!preserveLongPress && node.tagName.toLowerCase() !== 'a') {
      brand = document.createElement('a');
      node.replaceWith(brand);
    }
    brand.classList.add('asobi-unified-brand');
    if(location.pathname.startsWith('/darts/'))brand.classList.add('asobi-brand-light');
    brand.innerHTML = markup;
    brand.setAttribute('aria-label', 'asobiroom ホームへ戻る');
    brand.title = 'asobiroom ホームへ';
    if (!preserveLongPress) {
      brand.href = '/';
      return;
    }
    // The Zero Dive logo already owns a 5-second pointer/keyboard hold handler.
    // Retain that exact button and its listeners; navigate only after a short release.
    let started = null;
    let pointerWasHandled = false;
    const go = () => { if (!document.querySelector('#archive')?.open) location.assign('/'); };
    brand.addEventListener('pointerdown', event => {
      if (event.button === 0 && event.isPrimary !== false) {
        started = { id: event.pointerId, at: performance.now(), x: event.clientX, y: event.clientY };
        pointerWasHandled = false;
      }
    });
    brand.addEventListener('pointerup', event => {
      if (!started || event.pointerId !== started.id) return;
      const duration = performance.now() - started.at;
      const moved = Math.hypot(event.clientX - started.x, event.clientY - started.y);
      started = null;
      pointerWasHandled = true;
      if (duration < 650 && moved < 18) go();
    });
    brand.addEventListener('pointercancel', () => { started = null; pointerWasHandled = true; });
    brand.addEventListener('click', event => {
      event.preventDefault();
      if (event.detail > 0) { if (!pointerWasHandled && !started) go(); return; }
      // Keyboard activation is dispatched separately by keyup below.
    });
    let keyStart = 0;
    brand.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.repeat && !keyStart) keyStart = performance.now();
    });
    brand.addEventListener('keyup', event => {
      if (!['Enter', ' '].includes(event.key) || !keyStart) return;
      const held = performance.now() - keyStart;
      keyStart = 0;
      if (held < 650) go();
    });
    brand.addEventListener('blur', () => { keyStart = 0; started = null; });
  }

  function init() {
    const path = location.pathname;
    if (path.startsWith('/zero-dive/')) {
      install(document.querySelector('.logoPanel .gameMark'), true);
    } else if (path.startsWith('/sector-01/')) {
      document.querySelectorAll('header .room-brand, #hud .room-brand').forEach(node => install(node));
    } else if (path.startsWith('/dobon-quiz/')) {
      install(document.querySelector('#stage header .room-brand'));
    } else {
      install(document.querySelector('header .brand, header a.brand'));
    }
    // The branded link replaces floating site-home buttons; in-game title/retry controls stay.
    if (document.querySelector('.asobi-unified-brand')) document.querySelectorAll('a.asobi-home-link').forEach(link => link.remove());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

