/* asobiroom | ロゴを活かしたホーム配置と、システム連動の外観設定 */
(() => {
  'use strict';
  const KEY = 'asobiroom-theme';
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = new Set(['system', 'light', 'dark']);
  let preference = 'system';
  try {
    const saved = localStorage.getItem(KEY);
    if (valid.has(saved)) preference = saved;
  } catch { /* 保存できないブラウザでもシステム設定に従う */ }

  function updateTheme() {
    const theme = preference === 'system' ? (systemDark.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.asobiTheme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0b1829' : '#f6f6f1';
    const icon = document.querySelector('.asobi-theme-symbol');
    if (icon) icon.textContent = theme === 'dark' ? '☾' : '☀';
  }
  updateTheme();
  if (typeof systemDark.addEventListener === 'function') systemDark.addEventListener('change', updateTheme);
  else if (typeof systemDark.addListener === 'function') systemDark.addListener(updateTheme);

  const header = document.querySelector('body > header');
  if (!header) return;
  const main = document.querySelector('body > main');
  const shelf = main?.querySelector('#shelf');

  if (shelf) {
    header.classList.add('asobi-site-header');
    const mark = header.querySelector('.brand-mark');
    const brand = document.createElement('a');
    brand.className = 'asobi-brand';
    brand.href = '/';
    brand.setAttribute('aria-label', 'asobiroom ホーム');
    if (mark) { mark.alt = ''; brand.append(mark); }
    brand.append(document.createTextNode('asobiroom'));
    header.replaceChildren(brand);

    const nav = document.createElement('nav');
    nav.className = 'asobi-top-links';
    nav.setAttribute('aria-label', 'ページ内ナビゲーション');
    for (const [name, href] of [['ゲーム', '#shelf'], ['マイプレイルーム', '#asobiCommunity']]) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = name;
      nav.append(link);
    }
    header.append(nav);

    const hero = main.querySelector('.hero');
    if (hero) {
      const title = hero.querySelector('h1');
      const subtitle = hero.querySelector('p');
      if (title) title.textContent = 'あそびの扉を、ひらこう。';
      if (subtitle) subtitle.textContent = '今日は何して遊ぶ？ 気になるゲームから、さっそくスタート。';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'asobi-welcome';
      eyebrow.textContent = 'WELCOME TO ASOBIROOM';
      title?.before(eyebrow);
    }

    const shelfTitle = [...main.children].find(el => el.tagName === 'H2');
    if (shelfTitle) {
      shelfTitle.textContent = 'ゲームを選ぼう';
      const heading = document.createElement('div');
      heading.className = 'asobi-games-heading';
      const titleGroup = document.createElement('div');
      const sub = document.createElement('small');
      sub.textContent = '4つのゲームから、お気に入りを見つけよう。';
      titleGroup.append(shelfTitle, sub);
      heading.append(titleGroup);
      const random = document.querySelector('#arcadeRandom');
      if (random) {
        random.textContent = '🎲 おまかせで遊ぶ';
        heading.append(random);
      }
      const filters = main.querySelector('.filters');
      if (filters) filters.before(heading); else shelf.before(heading);
    }

    const loungeTitle = main.querySelector('.arcade-heading h2');
    if (loungeTitle) loungeTitle.textContent = 'マイプレイルーム';
    const loungeSubtitle = main.querySelector('.arcade-heading p');
    if (loungeSubtitle) loungeSubtitle.textContent = 'ミッション、実績、みんなのランキング。遊んだ記録をここに。';
  } else {
    // サイト情報ページにも正式な扉マークを表示し、ロゴを統一する。
    const brand = header.querySelector('a[href="/"]');
    if (brand) {
      const logo = document.createElement('img');
      logo.src = '/icon-192.png';
      logo.alt = '';
      logo.width = 34;
      logo.height = 34;
      brand.classList.add('asobi-info-brand');
      brand.replaceChildren(logo, document.createTextNode(brand.textContent.replace(/^◉\s*/, '').trim() || 'asobiroom'));
    }
  }

  const control = document.createElement('label');
  control.className = 'asobi-theme-control';
  control.title = '外観設定';
  control.setAttribute('aria-label', '外観設定');
  const symbol = document.createElement('span');
  symbol.className = 'asobi-theme-symbol';
  symbol.setAttribute('aria-hidden', 'true');
  const select = document.createElement('select');
  select.className = 'asobi-theme-select';
  select.setAttribute('aria-label', '外観設定');
  for (const [value, name] of [['system', '自動'], ['light', 'ライト'], ['dark', 'ダーク']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name;
    select.append(option);
  }
  select.value = preference;
  select.addEventListener('change', () => {
    preference = valid.has(select.value) ? select.value : 'system';
    try { localStorage.setItem(KEY, preference); } catch { /* 保存不可でも現在の画面には反映 */ }
    updateTheme();
  });
  control.append(symbol, select);
  header.append(control);
  updateTheme();
})();
