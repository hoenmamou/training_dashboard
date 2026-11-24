import {main,el,tell,safe,session,clearSession,pageHead,rpc,classRpc} from './common.js?v=review1';
import {overview,previewSlides,stopReading} from './guide.js?v=review1';
import {liveClass} from './live.js?v=review1';
import {createClassroom} from './classroom.js?v=review1';
import {createExam} from './exam.js?v=review1';
import {studyReview} from './study.js?v=review1';
import {reviewManager} from './review-manager.js?v=review1';

const url=new URL(location.href);
const publicRoom=url.searchParams.get('class');
let auth=session(publicRoom),view,slides,reviews,live,roster,exam,manager,position,track='initial';
function showError(err,retry){
  main.innerHTML=`<section class="panel"><h2>Could not open this page</h2><p>${safe(err.message)}</p><button class="secondary" id="retry">Try again</button></section>`;
  el('retry').onclick=retry;
}
function joined(personal){
  auth=personal; position=null; bindRoles(); navigate('live'); tell('You are checked in.');
}
function navigate(next){
  live?.stop(); live=null; stopReading(); tell(''); view=next; window.scrollTo(0,0);
  const follow=track!=='initial', rn=auth?.role==='rn', dsw=auth?.role==='dsw';
  let tabs=[['guide','Course guide'],['preview','Teaching slides']];
  if(auth||publicRoom) tabs=rn
    ? [['live','Teach class'],['roster','Roster and exam'],['reviews','Retraining and yearly recertification']]
    : [['live',follow?'My review':'Follow Ashley'],...(dsw?[['exam','My exam']]:[])];
  el('nav').innerHTML=tabs.map(([key,label])=>`<button type="button" data-go="${key}" ${next===key?'aria-current="page"':''}>${label}</button>`).join('')+(auth?'<button style="margin-left:auto" id="leave">Close private view</button>':'');
  el('nav').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));
  if(el('leave')) el('leave').onclick=()=>clearSession(auth);
  if(next==='guide'){overview(()=>navigate('preview'));return;}
  if(next==='preview'){previewSlides(slides,()=>navigate('guide'));return;}
  main.innerHTML='<p class="loading">Opening your course…</p>';
  const active=()=>view===next;
  let load;
  if(next==='live'){
    if(follow){
      load=studyReview({track,lessons:reviews[track],originals:slides,auth,room:publicRoom,joined,openExam:()=>navigate('exam'),active});
    }else{
      live=liveClass({slides,auth,room:publicRoom,openRoster:()=>navigate('roster'),openExam:()=>navigate('exam'),joined,initialPage:position});
    }
    position=null;
  }else if(next==='reviews'){load=manager.load();}
  else{load=(next==='roster'?roster:exam).load();}
  load?.catch(err=>{if(active())showError(err,()=>navigate(next));});
}
function bindRoles(){
  roster=auth?.role==='rn'?createClassroom(auth,()=>view==='roster',()=>navigate('live')):null;
  manager=auth?.role==='rn'?reviewManager(auth,()=>view==='reviews'):null;
  exam=auth?.role==='dsw'?createExam(auth,()=>view==='exam',()=>navigate('live')):null;
}
async function start(){
  try{
    const read=async file=>{const r=await fetch('./'+file+'?v=review1');if(!r.ok)throw Error('Check your connection and try again.');return r.json();};
    if(publicRoom&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(publicRoom)){main.innerHTML=pageHead('Class link','Check your staff link','Ask Ashley for the current class link.');return;}
    [slides,position]=await Promise.all([read('slides.json'),auth?.role==='dsw'?rpc(auth,'position'):publicRoom&&!auth?classRpc(publicRoom,'position'):null]);
    track=position?.course||'initial';
    if(track!=='initial') reviews=await read('reviews.json');
    bindRoles();
    const resumeExam=track!=='initial'&&auth?.role==='dsw'&&position?.ready;
    navigate(resumeExam?'exam':auth||publicRoom?'live':url.searchParams.has('present')?'preview':'guide');
  }catch(err){showError(err,start);}
}
start();
