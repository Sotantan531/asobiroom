// Measure the complete, wrapped layout. Scale only when natural reflow needs more height.
const viewport=document.getElementById('viewport');
const stage=document.getElementById('stage');
function fitStage(){
 const style=getComputedStyle(viewport);
 const height=viewport.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
 const scale=Math.min(1,height/(stage.offsetHeight+5));
 stage.style.transform='scale('+scale+')';
 stage.style.marginTop=Math.max(0,(height-(stage.offsetHeight+5)*scale)/2)+'px';
}
const layoutObserver=new ResizeObserver(fitStage);
layoutObserver.observe(viewport);
layoutObserver.observe(stage);
fitStage();
