const levels={
  easy:{name:'やさしい',speed:2.25,count:3,fog:8.5},
  normal:{name:'ふつう',speed:3.1,count:4,fog:6.2},
  hard:{name:'むずかしい',speed:3.55,count:6,fog:4.8}
};
const prefs={level:'normal',sensitivity:100,bob:1,invert:false,left:false};
try{
 const saved=JSON.parse(localStorage.getItem('sector09-controls')||'{}');
 if(Object.hasOwn(levels,saved.level))prefs.level=saved.level;
 if(Number.isFinite(saved.sensitivity))prefs.sensitivity=Math.max(50,Math.min(180,saved.sensitivity));
 if([0,.5,1].includes(saved.bob))prefs.bob=saved.bob;
 prefs.invert=saved.invert===true;prefs.left=saved.left===true;
}catch{}
function refreshSettings(){
 const panel=document.getElementById('options');
 for(const input of panel.querySelectorAll('[name]')){
   if(input.type==='checkbox')input.checked=prefs[input.name];
   else input.value=prefs[input.name];
 }
 const level=levels[prefs.level];
 panel.querySelector('output').value=prefs.sensitivity+'%';
 panel.querySelector('.level-info').textContent='スイッチ '+level.count+'個　／　石像 '+({easy:'遅め',normal:'標準',hard:'速め'}[prefs.level])+'　／　視界 '+({easy:'明るめ',normal:'標準',hard:'暗め'}[prefs.level]);
 document.body.classList.toggle('left-hand',prefs.left);
}
const options=document.getElementById('options');
options.addEventListener('input',e=>{
 const input=e.target;if(!Object.hasOwn(prefs,input.name))return;
 prefs[input.name]=input.type==='checkbox'?input.checked:input.name==='level'?input.value:Number(input.value);
 refreshSettings();try{localStorage.setItem('sector09-controls',JSON.stringify(prefs))}catch{}
});
document.getElementById('settings').onclick=()=>{refreshSettings();options.showModal()};
refreshSettings();
