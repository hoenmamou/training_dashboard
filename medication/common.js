import {apiUrl,publicKey} from './config.js';
export const instructor='Ashley Malbrough, RN';
export const main=document.getElementById('main');
export const el=id=>document.getElementById(id);
export const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateTime=value=>new Date(value).toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
export const pageHead=(label,title,body='')=>`<header class="page-head"><div class="eyebrow">${safe(label)}</div><h1>${safe(title)}</h1>${body?`<p>${safe(body)}</p>`:''}</header>`;
const currentKey='hoen.med.classroom.v1';
const savedKey=room=>'hoen.med.device.'+room;
const validKey=key=>typeof key==='string'&&/^[a-f0-9]{48}$/.test(key);
export function getStored(storage,key){try{return JSON.parse(storage.getItem(key));}catch{return null;}}
export function setStored(storage,key,value){try{if(value===null)storage.removeItem(key);else storage.setItem(key,JSON.stringify(value));}catch{}}
export function remember(auth,keep=false){setStored(sessionStorage,currentKey,auth);if(keep&&auth.classId)setStored(localStorage,savedKey(auth.classId),auth);}
export function session(room){
 const u=new URL(location.href);if(u.searchParams.has('present'))return null;
 const frag=new URLSearchParams(u.hash.slice(1)),role=frag.has('rn')?'rn':frag.has('dsw')?'dsw':'';
 if(role){const key=frag.get(role);history.replaceState(null,'',u.pathname+u.search);const a={role,key:validKey(key)?key:''};remember(a);return a;}
 const a=getStored(sessionStorage,currentKey);
 if(!room)return a;
 if(a?.role==='dsw'&&a.classId===room)return a;
 const saved=getStored(localStorage,savedKey(room));
 if(saved?.role==='dsw'&&saved.classId===room&&validKey(saved.key)){remember(saved);return saved;}
 return null;
}
export function clearSession(auth){setStored(sessionStorage,currentKey,null);if(auth?.classId&&auth.role==='dsw')setStored(localStorage,savedKey(auth.classId),null);location.replace(location.pathname);}
export function privateLink(role,key){const url=new URL('./',location.href);url.hash=role+'='+key;return url.href;}
export function classLink(id){const url=new URL('./',location.href);url.searchParams.set('class',id);return url.href;}
export function tell(msg,error=false){el('notice').innerHTML=msg?`<div class="${error?'error':'note'}">${safe(msg)}</div>`:'';}
export function copyBox(label,url){return `<div class="linkbox"><label>${safe(label)}<input type="text" readonly value="${safe(url)}"></label><button type="button" class="secondary" data-copy>Copy link</button> <span class="small" data-copy-status role="status"></span></div>`;}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;const box=b.closest('.linkbox'),input=box.querySelector('input'),status=box.querySelector('[data-copy-status]');try{await navigator.clipboard.writeText(input.value);status.textContent='Copied.';}catch{input.focus();input.select();status.textContent='Link selected. Copy to share.';}});
async function api(method,payload){
 let res;try{res=await fetch(apiUrl+'/rest/v1/rpc/'+method,{method:'POST',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',apikey:publicKey,...(publicKey.startsWith('eyJ')?{Authorization:'Bearer '+publicKey}:{})},body:JSON.stringify(payload)});}catch{throw Error('Could not reach the training server. Check your connection and try again.');}
 const value=await res.json().catch(()=>null);if(!res.ok)throw Error(value?.message||'The training server could not complete the request. Try again.');return value;
}
export function rpc(auth,action,data={}){if(!auth?.key)throw Error('Open the private link provided by Ashley or the office.');return api('hoen_med_'+(auth.role==='rn'?'rn':'dsw'),{p_key:auth.key,p_action:action,p_data:data});}
export const classRpc=(id,action,data={})=>api('hoen_med_class',{p_class:id,p_action:action,p_data:data});
export function bindForm(id,handler){const f=el(id);if(!f)return;f.onsubmit=async e=>{e.preventDefault();const b=e.submitter;if(b?.disabled)return;if(b)b.disabled=true;tell('');try{await handler(f,new FormData(f));}catch(err){tell(err.message,true);}finally{if(b)b.disabled=false;}};}

export const courseNames={initial:"Initial training",retraining:"Retraining",annual:"Yearly recertification"};
function newCheckIn(name){
 const bytes=crypto.getRandomValues(new Uint8Array(24));
 return {id:crypto.randomUUID(),key:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),name};
}
export function checkInForm(title='Check in for your exam'){
 return `<form id="join-class" class="checkin"><strong>${safe(title)}</strong><div class="checkin-fields"><label class="field">Full name for your certificate<input name="name" autocomplete="name" minlength="2" maxlength="100" required></label><button class="primary">Check in</button></div><label class="tick"><input name="remember" type="checkbox"><span>Remember me on this device</span></label></form>`;
}
export function bindCheckIn(room,onJoin){
 bindForm('join-class',async(f,d)=>{
   const name=String(d.get('name')).trim();if(name.length<2)throw Error('Enter your full name.');
   const pendingKey='hoen.med.pending.'+room;let pending=getStored(sessionStorage,pendingKey);
   if(!pending||pending.name!==name){pending=newCheckIn(name);setStored(sessionStorage,pendingKey,pending);}
   await classRpc(room,'join',pending);const personal={role:'dsw',key:pending.key,classId:room};remember(personal,d.has('remember'));setStored(sessionStorage,pendingKey,null);
   onJoin(personal);
  });
}
