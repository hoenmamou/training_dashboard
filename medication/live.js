import {main,el,safe,rpc,classRpc,classLink,privateLink,copyBox,bindForm,remember,getStored,setStored,tell,instructor} from './common.js?v=basic1';
import {slideBody,slideControls} from './guide.js?v=basic1';

function newCheckIn(name){
 const bytes=crypto.getRandomValues(new Uint8Array(24));
 return {id:crypto.randomUUID(),key:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),name};
}
export function liveClass({slides,auth,room,openRoster,openExam,joined}){
 const teaching=auth?.role==='rn',enrolled=auth?.role==='dsw';
 let page=null,timer=null,closed=false,loading=false,moving=false,frameBuilt=false;
 const position=()=>auth?rpc(auth,'position'):classRpc(room,'position');
 function stop(){closed=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);}
 function schedule(){clearTimeout(timer);if(!closed&&!document.hidden)timer=setTimeout(refresh,teaching?8500:2700);}
 function visibility(){if(document.hidden)clearTimeout(timer);else refresh();}
 function updateSlide(next){
  if(closed||page&&page.revision>next.revision)return;
  const slideChanged=page?.slide!==next.slide;
  page=next;if(!frameBuilt)buildFrame();
  if(slideChanged){
   const card=el('class-slide');card.innerHTML=slideBody(slides,page.slide)+(teaching?slideControls(page.slide,slides.length,'Finish teaching'):'');
   if(teaching){el('slide-prev').onclick=()=>move(page.slide-1);el('slide-next').onclick=()=>page.slide===slides.length?openRoster():move(page.slide+1);}
   if(!teaching&&!el('join-class')?.contains(document.activeElement)&&window.scrollY>card.offsetTop)card.scrollIntoView({block:'start'});
  }
  if(enrolled){
   if(auth.classId!==page.classId){auth.classId=page.classId;remember(auth);}
   const bar=el('exam-ready');bar.hidden=!(next.ready||next.passed);
   el('exam-prompt').textContent=next.passed?'Your exam is on file.':'Ashley has opened your exam.';
   el('open-exam').textContent=next.passed?'View my result':'Take my exam';
  }
 }
 async function refresh(){
  if(closed||loading||moving)return;clearTimeout(timer);loading=true;
  try{const data=await position();if(closed)return;updateSlide(data);el('sync-status').textContent='';}
  catch(err){if(closed)return;if(frameBuilt){el('sync-status').textContent='Connection interrupted. Reconnecting…';}else{main.innerHTML=`<section class="panel"><h2>Could not open the class</h2><p>${safe(err.message)}</p><button id="reconnect" class="secondary">Try again</button></section>`;el('reconnect').onclick=refresh;}}
  finally{loading=false;if(frameBuilt)schedule();}
 }
 async function move(slide){
  if(moving||closed||slide<1||slide>slides.length)return;moving=true;clearTimeout(timer);
  const old=page;const prev=el('slide-prev'),next=el('slide-next');prev.disabled=next.disabled=true;
  try{const result=await rpc(auth,'move',{slide,revision:old.revision});if(closed)return;updateSlide(result);el('sync-status').textContent=result.slide===slide?'':'The slide was changed on another instructor device.';window.scrollTo(0,0);}
  catch(err){if(!closed)tell(err.message,true);}
  finally{moving=false;if(!closed){el('slide-prev').disabled=page.slide===1;el('slide-next').disabled=false;schedule();}}
 }
 function buildFrame(){
  frameBuilt=true;const publicJoin=!auth;
  main.innerHTML=`<div class="deck"><div class="slide-heading"><span class="cap">${teaching?'Instructor view':'Following Ashley'}</span><span>${instructor}</span></div>
  ${publicJoin?`<form id="join-class" class="checkin"><strong>Check in for your exam</strong><div class="checkin-fields"><label class="field">Full name for your certificate<input name="name" autocomplete="name" minlength="2" maxlength="100" required></label><button class="primary">Check in</button></div><label class="tick"><input name="remember" type="checkbox"><span>Remember me on this device</span></label></form>`:''}
  ${teaching?`<div class="actions class-tools"><button class="secondary" id="share-class">Copy staff link</button><button class="plain" id="show-share">Show link</button><span id="share-status" class="small" role="status"></span></div><div id="share-fallback" hidden>${copyBox('Staff follow-along link',classLink(page.classId))}</div>`:''}
  ${enrolled?`<div class="exam-now" id="exam-ready" hidden><strong id="exam-prompt"></strong><button class="primary" id="open-exam">Take my exam</button></div>`:''}
  <article id="class-slide" class="slide-paper" aria-live="polite"></article>
  <p class="status-inline" id="sync-status" role="status"></p>
  ${teaching?'<p class="follow-hint">Next changes the slide on staff devices.</p>':`<p class="follow-hint">${enrolled?`Checked in as <strong>${safe(page.name)}</strong>. `:''}This screen follows Ashley automatically.</p>`}
  ${enrolled?`<details class="class-tools"><summary>My personal return link</summary>${copyBox('Use this link to return to your class or exam.',privateLink('dsw',auth.key))}</details>`:''}</div>`;
  if(teaching){
   el('show-share').onclick=()=>{el('share-fallback').hidden=!el('share-fallback').hidden;};
   el('share-class').onclick=async()=>{try{await navigator.clipboard.writeText(classLink(page.classId));if(!closed)el('share-status').textContent='Staff link copied.';}catch{if(!closed){el('share-fallback').hidden=false;el('share-fallback').querySelector('input').select();}}};
  }
  if(enrolled)el('open-exam').onclick=openExam;
  if(publicJoin)bindForm('join-class',async(f,d)=>{
   const name=String(d.get('name')).trim();if(name.length<2)throw Error('Enter your full name.');
   const pendingKey='hoen.med.pending.'+room;let pending=getStored(sessionStorage,pendingKey);
   if(!pending||pending.name!==name){pending=newCheckIn(name);setStored(sessionStorage,pendingKey,pending);}
   await classRpc(room,'join',pending);const personal={role:'dsw',key:pending.key,classId:room};remember(personal,d.has('remember'));setStored(sessionStorage,pendingKey,null);
   if(!closed)joined(personal);
  });
 }
 document.addEventListener('visibilitychange',visibility);refresh();
 return {stop};
}
