// A single IndexedDB transaction imports pre-online history once per browser.
// New events receive independent IDs so concurrent tabs and retries are additive.
function sharedRecords(previous, onView) {
  const DB_NAME='zero-dive-online-v1';
  const dbReady=new Promise((resolve,reject)=>{
    const open=indexedDB.open(DB_NAME,1);
    open.onupgradeneeded=()=>{
      const db=open.result;
      db.createObjectStore('pending',{keyPath:'id'});
      db.createObjectStore('meta');
    };
    open.onsuccess=()=>resolve(open.result);
    open.onerror=()=>reject(open.error);
  });
  function transact(db,names,mode,work){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(names,mode);
      work(tx);
      tx.oncomplete=resolve;
      tx.onabort=()=>reject(tx.error);
    });
  }
  function legacyDelta(s){
    const d={};
    for(const k of ['plays','finished','wins','answered','correct','best'])if(s[k])d[k]=s[k];
    s.stageCounts.forEach((n,i)=>{if(n)d['s'+i]=n;});
    for(const [id,record] of Object.entries(s.perQuestion)){
      if(record.tries)d['q'+id+'.tries']=record.tries;
      if(record.right)d['q'+id+'.right']=record.right;
    }
    return d;
  }
  const original=legacyDelta(previous);
  const ready=dbReady.then(async db=>{
    await transact(db,['meta','pending'],'readwrite',tx=>{
      const meta=tx.objectStore('meta');
      const seen=meta.get('imported');
      seen.onsuccess=()=>{
        if(seen.result)return;
        if(Object.keys(original).length)tx.objectStore('pending').add({id:crypto.randomUUID(),delta:original});
        meta.put(true,'imported');
      };
    });
    return db;
  });
  let busy=false, requested=false;
  async function sync(){
    requested=true;
    if(busy)return;
    busy=true;
    try{
      const db=await ready;
      while(requested){
        requested=false;
        let batch;
        await transact(db,'pending','readonly',tx=>{
          const get=tx.objectStore('pending').getAll(null,40);
          get.onsuccess=()=>batch=get.result;
        });
        const response=await fetch('/api/records',batch.length?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch)}:{cache:'no-store'});
        if(!response.ok)throw Error('sync');
        const data=await response.json();
        if(batch.length){
          await transact(db,'pending','readwrite',tx=>{for(const item of batch)tx.objectStore('pending').delete(item.id);});
        }
        onView(data,true);
        if(batch.length===40)requested=true;
      }
    }catch{onView(null,false);}
    finally{busy=false;}
  }
  async function add(delta){
    try{
      const db=await ready;
      await transact(db,'pending','readwrite',tx=>tx.objectStore('pending').add({id:crypto.randomUUID(),delta}));
      sync();
    }catch{onView(null,false);}
  }
  window.addEventListener('online',sync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
  setInterval(()=>{if(!document.hidden)sync();},30000);
  sync();
  return add;
}
