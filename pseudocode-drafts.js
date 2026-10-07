(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CodingDrafts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX_AGE=30*86400000, MAX_SOURCE=16384;
 const prefix=(owner)=>`recallstride-coding:${encodeURIComponent(owner)}:`;
 function createStore(storage,now=()=>Date.now()){
  const read=(owner,kind)=>{
   if(!owner)return null;
   try{const key=prefix(owner)+kind,raw=storage.getItem(key);if(!raw||raw.length>600000)return null;const r=JSON.parse(raw);
    if(r.owner!==owner||!Number.isFinite(r.savedAt)||r.savedAt>now()||now()-r.savedAt>MAX_AGE){storage.removeItem(key);return null;}return r.data;
   }catch{return null;}
  };
  const write=(owner,kind,data)=>{if(!owner)return false;try{const text=JSON.stringify({owner,savedAt:now(),data});if(text.length>600000)return false;storage.setItem(prefix(owner)+kind,text);return true;}catch{return false;}};
  return {read,
   remember(owner,taskId){return write(owner,'resume',{taskId});},
   resume(owner){const value=read(owner,'resume');return typeof value?.taskId==='string'?value.taskId:null;},
   save(owner,taskId,draft){if(!/^[a-z0-9-]{1,64}$/.test(taskId)||typeof draft?.source!=='string'||draft.source.length>MAX_SOURCE)return false;return write(owner,'draft:'+taskId,draft);},
   draft(owner,taskId){return read(owner,'draft:'+taskId);},
   queue(owner,attempt){const pending=read(owner,'pending')||[];if(!Array.isArray(pending))return false;if(pending.some(x=>x.id===attempt.id))return true;if(pending.length>=20)return false;return write(owner,'pending',[...pending,attempt]);},
   pending(owner){const value=read(owner,'pending');return Array.isArray(value)?value.slice(0,20):[];},
   acknowledge(owner,id){return write(owner,'pending',this.pending(owner).filter(a=>a.id!==id));},
   export(owner){const data={drafts:{},pending:this.pending(owner)},keys=[];for(let i=0;i<storage.length;i++)keys.push(storage.key(i));for(const key of keys){if(key?.startsWith(prefix(owner)+'draft:')){const kind=key.slice(prefix(owner).length),value=read(owner,kind);if(value)data.drafts[kind.slice(6)]=value;}}return data;},
   clear(owner){if(!owner)return;try{const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(prefix(owner)))keys.push(k);}keys.forEach(k=>storage.removeItem(k));}catch{}},
  };
 }
 function restore(draft,task){
  if(!draft||typeof draft.source!=='string'||draft.source.length>MAX_SOURCE)return {draft:null,stale:false};
  if(draft.taskVersion!==task.version||draft.interpreterVersion!==task.interpreterVersion)return {draft:null,stale:true,recovery:draft.source};
  const a=draft.assistance||{};
  if(!['runs','hints','checks'].every(k=>Number.isInteger(a[k])&&a[k]>=0&&a[k]<=10000)||typeof a.solution!=='boolean')return {draft:null,stale:false};
  return {draft:{...draft,inputs:typeof draft.inputs==='string'?draft.inputs.slice(0,8192):'',plan:typeof draft.plan==='string'?draft.plan.slice(0,2000):'',mode:draft.mode==='independent'?'independent':'learn',rubric:Array.isArray(draft.rubric)?draft.rubric.slice(0,20).map(Boolean):[]},stale:false};
 }
 return {createStore,restore,prefix,MAX_AGE};
});
