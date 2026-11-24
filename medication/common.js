import {apiUrl,publicKey} from './config.js';
export const agency='Heaven-On-Earth Network of Mamou, LLC';
export const instructor='Ashley Malbrough, RN';
export const main=document.getElementById('main');
export const el=id=>document.getElementById(id);
export const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function duration(minutes){const h=Math.floor(minutes/60),m=minutes%60;return [h?`${h} hr`:'',m?`${m} min`:''].filter(Boolean).join(' ')||'0 min';}
export const dateTime=value=>new Date(value).toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
const keyName='hoen.med.classroom.v1';
export function session(){
 const url=new URL(location.href);if(url.searchParams.get('present')==='1')return null;
 const params=new URLSearchParams(url.hash.slice(1));const role=params.has('rn')?'rn':params.has('dsw')?'dsw':null;
 if(role){const key=params.get(role);history.replaceState(null,'',url.pathname+url.search);if(!/^[a-f0-9]{48}$/.test(key)){try{sessionStorage.removeItem(keyName)}catch{};return {role,key:''}}const value={role,key};try{sessionStorage.setItem(keyName,JSON.stringify(value))}catch{}return value;}
 try{return JSON.parse(sessionStorage.getItem(keyName))}catch{return null;}
}
export function clearSession(){try{sessionStorage.removeItem(keyName)}catch{};location.replace(location.pathname);}
export function accessLink(role,key){const u=new URL('./',location.href);u.hash=`${role}=${key}`;return u.href;}
export function tell(msg,error=false){const n=el('notice');n.innerHTML=msg?`<div class="${error?'error':'note'}">${safe(msg)}</div>`:'';}
export function linkBox(role,key,recipient){return `<div class="linkbox"><strong>Private link for ${safe(recipient)}</strong><input aria-label="Private link for ${safe(recipient)}" type="text" readonly value="${safe(accessLink(role,key))}"><button type="button" class="secondary" data-copy>Copy link</button> <span class="small" data-copy-status></span></div>`;}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;const box=b.closest('.linkbox'),inp=box.querySelector('input');try{await navigator.clipboard.writeText(inp.value);box.querySelector('[data-copy-status]').textContent='Copied.';}catch{inp.focus();inp.select();box.querySelector('[data-copy-status]').textContent='The link is selected. Copy it to share.';}});
export async function rpc(auth,action,data={}){
 if(!auth?.key)throw new Error('Open the personal link provided by your RN or the office.');
 const url=`${apiUrl}/rest/v1/rpc/hoen_med_${auth.role==='rn'?'rn':'dsw'}`;
 let response;try{response=await fetch(url,{method:'POST',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',apikey:publicKey,...(publicKey.startsWith('eyJ')?{Authorization:`Bearer ${publicKey}`}:{})},body:JSON.stringify({p_key:auth.key,p_action:action,p_data:data})});}catch{throw new Error('The training server could not be reached. Check your connection and try again.');}
 const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||'The training server could not save the request. Try again.');return body;
}
export function bindForm(id,callback){const form=el(id);if(!form)return;form.addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;if(btn?.disabled)return;if(btn)btn.disabled=true;tell('');try{await callback(form,new FormData(form))}catch(err){tell(err.message,true)}finally{if(btn)btn.disabled=false}});}
export function pageHead(kicker,title,body=''){return `<header class="page-head"><div class="eyebrow">${safe(kicker)}</div><h1>${safe(title)}</h1>${body?`<p>${safe(body)}</p>`:''}</header>`;}
