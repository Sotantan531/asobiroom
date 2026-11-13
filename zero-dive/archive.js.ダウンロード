function setupArchive(questions, scenes, getStats, showArea) {
  const dialog = document.getElementById('archive');
  const list = dialog.querySelector('.archiveList');
  const search = dialog.querySelector('input');
  const tabs = [...dialog.querySelectorAll('[data-section]')];
  let section = 'questions';
  let timer;
  let activeLogo;

  function drawList() {
    const stats=getStats();
    const query = search.value.trim().toLowerCase();
    const rows = document.createDocumentFragment();
    const countLabel = dialog.querySelector('.archiveCount');
    function row(title, detail, hits, total) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      const sub = document.createElement('small');
      const value = document.createElement('strong');
      label.textContent = title;
      sub.textContent = detail;
      label.append(sub);
      value.textContent = total ? Math.round(hits * 100 / total) + '%' : '未集計';
      item.append(label, value);
      rows.append(item);
      return item;
    }
    if (section === 'questions') {
      for (const q of questions) {
        if (!(''+q.id+' '+q.category+' '+q.q).toLowerCase().includes(query)) continue;
        const rec = stats.perQuestion[q.id] || {right:0, tries:0};
        row(q.q, q.category+'　正解 '+rec.right+' / 回答 '+rec.tries+'回', rec.right, rec.tries);
      }
      countLabel.textContent = rows.childElementCount+'問 / 全'+questions.length+'問';
    } else {
      scenes.forEach((scene, i) => {
        const reached = i === 0 ? stats.finished : stats.stageCounts[i-1] || 0;
        const item=row(scene.place, scene.depth.toLocaleString('ja-JP')+'m　到達 '+reached+' / 完走 '+stats.finished+'回', reached, stats.finished);
        const view=document.createElement('button');
        view.type='button';
        view.textContent='景色を見る';
        view.setAttribute('aria-label',scene.place+'の景色を見る');
        view.dataset.area=i;
        view.onclick=()=>{dialog.close();showArea(i);};
        item.append(view);
      });
      countLabel.textContent = '完走したプレイのうち、そのエリアまで到達した割合';
    }
    if (!rows.childElementCount) rows.append('一致する問題はありません。');
    list.replaceChildren(rows);
    list.scrollTop = 0;
  }
  function select(value) {
    section = value;
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.section === section));
    search.hidden = section !== 'questions';
    drawList();
  }
  for (const tab of tabs) tab.onclick = () => select(tab.dataset.section);
  search.oninput = drawList;
  dialog.querySelector('.archiveClose').onclick = () => dialog.close();

  function cancel() {
    clearTimeout(timer);
    activeLogo = null;
  }
  function begin(logo) {
    if (dialog.open || activeLogo) return;
    activeLogo = logo;
    timer = setTimeout(() => {
      cancel();
      search.value = '';
      select('questions');
      dialog.showModal();
      dialog.querySelector('.archiveClose').focus();
    }, 5000);
  }
  const logo=document.querySelector('.gameMark');
  let heldPointer=null;
  function stop(){
    heldPointer=null;
    cancel();
  }
  logo.addEventListener('pointerdown', e=>{
    if(e.button!==0 || heldPointer!==null)return;
    e.preventDefault();
    heldPointer=e.pointerId;
    logo.setPointerCapture(e.pointerId);
    begin(logo);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture']){
    logo.addEventListener(name,e=>{if(e.pointerId===heldPointer)stop();});
  }
  logo.addEventListener('contextmenu',e=>e.preventDefault());
  logo.addEventListener('keydown',e=>{
    if(!['Enter',' '].includes(e.key))return;
    e.preventDefault();
    if(!e.repeat)begin(logo);
  });
  logo.addEventListener('keyup',stop);
  window.addEventListener('blur',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  return ()=>{
    if(!dialog.open)return;
    const position=list.scrollTop;
    const focusedArea=document.activeElement?.dataset.area;
    drawList();
    if(focusedArea!==undefined)list.querySelector('[data-area="'+focusedArea+'"]')?.focus({preventScroll:true});
    list.scrollTop=position;
  };
}
