import {main,el,tell,safe,session,clearSession,pageHead} from './common.js?v=basic1';
import {overview,previewSlides,stopReading} from './guide.js?v=basic1';
import {liveClass} from './live.js?v=basic1';
import {createClassroom} from './classroom.js?v=basic1';
import {createExam} from './exam.js?v=basic1';

const url=new URL(location.href);
const publicRoom=url.searchParams.get('class');
let auth=session(publicRoom),view,slides,live,roster,exam;
function navigate(next){
 live?.stop();live=null;stopReading();tell('');view=next;window.scrollTo(0,0);
 const inClass=!!(auth||publicRoom);const tabs=inClass?[['live',auth?.role==='rn'?'Teach class':'Follow Ashley'],...(auth?.role==='rn'?[['roster','Roster and exam']]:auth?.role==='dsw'?[['exam','My exam']]:[])]:[['guide','Course guide'],['preview','Teaching slides']];
 el('nav').innerHTML=tabs.map(([key,label])=>`<button type="button" data-go="${key}" ${next===key?'aria-current="page"':''}>${label}</button>`).join('')+(auth?'<button style="margin-left:auto" id="leave">Close private view</button>':'');
 el('nav').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));if(el('leave'))el('leave').onclick=()=>clearSession(auth);
 if(next==='guide'){overview(()=>navigate('preview'));return;}
 if(next==='preview'){previewSlides(slides,()=>navigate('guide'));return;}
 main.innerHTML='<p class="loading">Opening class…</p>';
 if(next==='live'){
  if(publicRoom&&!auth&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(publicRoom)){main.innerHTML=pageHead('Class link','Check your staff link','Ask Ashley for the current class link.');return;}
  live=liveClass({slides,auth,room:publicRoom,openRoster:()=>navigate('roster'),openExam:()=>navigate('exam'),joined:personal=>{auth=personal;bindRoles();navigate('live');tell('You are checked in.');}});
  return;
 }
 const controller=next==='roster'?roster:exam;
 controller.load().catch(err=>{if(view!==next)return;main.innerHTML=`<section class="panel"><h2>Could not open this record</h2><p>${safe(err.message)}</p><button class="secondary" id="retry">Try again</button></section>`;el('retry').onclick=()=>navigate(next);});
}
function bindRoles(){roster=auth?.role==='rn'?createClassroom(auth,()=>view==='roster',()=>navigate('live')):null;exam=auth?.role==='dsw'?createExam(auth,()=>view==='exam',()=>navigate('live')):null;}
try{
 const r=await fetch('./slides.json?v=basic1');if(!r.ok)throw Error();slides=await r.json();
 bindRoles();navigate(auth||publicRoom?'live':url.searchParams.has('present')?'preview':'guide');
}catch{main.innerHTML='<section class="panel"><h2>Could not load the course</h2><p>Check your internet connection and reload this page.</p><button id="reload" class="secondary">Reload</button></section>';el('reload').onclick=()=>location.reload();}
