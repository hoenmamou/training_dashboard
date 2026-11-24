import {main,el,safe,dateTime,rpc,tell,pageHead,instructor,courseNames} from './common.js?v=review1';
export function createExam(auth,isActive,openLessons){
 let state=null,paper=null,draft=null,step=0,loadNo=0;
 const req=(action,data)=>rpc(auth,action,data);
 const storeName=()=>`hoen.med.draft.${state.id}.${state.version}`;
 function save(){try{sessionStorage.setItem(storeName(),JSON.stringify(draft));}catch{}}
 function clear(){try{sessionStorage.removeItem(storeName());}catch{}draft=null;paper=null;step=0;}
 async function load(){const n=++loadNo;const s=await req('state');if(!isActive()||n!==loadNo)return;state=s;if(s.last?.passed)clear();home();}
 function home(){
 const s=state,p=s.progress,last=s.last, follow=!!s.course&&s.course!=='initial';
 const courseTitle=follow?courseNames[s.course]:'DSW written exam';
 let completion='Your 16-hour certificate is ready to print from the HOEN dashboard.';
 let pending='Ashley can verify your classroom skills for your certificate.';
 if(follow){
  completion='Your '+courseTitle.toLowerCase()+' certificate is ready on the HOEN dashboard.';
  pending=s.evaluation==='needs_review'?'Ashley recorded that further training is needed. Contact her for the next step.':
   s.course==='annual'?'Contact Ashley for your participant-specific RN skills evaluation. Your yearly certificate will be available after she signs it.':
   'Contact Ashley to complete the retraining follow-up. Your certificate will be available after she signs it.';
 }
 const lastBox=last?`<div class="${last.passed?'note':'error'}"><strong>${last.passed?'Passed':'More review needed'} · ${last.points}/20 (${last.points*5}%)</strong><br>Attempt ${last.number} · ${safe(dateTime(last.submittedAt))} Central. Your graded exam is on the HOEN dashboard.</div>`:'';
 const ready=p.complete&&s.passItems!=null;
 main.innerHTML=`<div class="exam-wrap">${pageHead(courseTitle,'My medication exam',s.name)}<section class="panel"><p class="muted">Instructor · ${instructor}</p>${lastBox}
 ${last?.passed?`<p>${s.certificate?completion:pending}</p>`:ready?`<p>Choose one answer for each of the 20 questions. For question 18, select all that apply. Your passing score is <strong>${s.passItems}/20 (${s.passItems*5}%)</strong>.</p><button class="primary" id="take">${last?'Retake my exam':'Start my exam'}</button>`:follow?'<div class="callout"><strong>Finish the review slides to open your exam.</strong></div>':'<div class="callout"><strong>Ashley will open your exam after class.</strong><p>Follow the slides on this device while she teaches.</p></div>'}
 <div class="actions" style="margin-top:1rem"><button class="secondary" id="my-lessons">${follow?'Review slides':'Follow Ashley'}</button><button class="plain" id="my-refresh">Refresh exam status</button></div></section></div>`;
 el('my-refresh').onclick=()=>load().catch(e=>tell(e.message,true));el('my-lessons').onclick=openLessons;
 if(el('take'))el('take').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{paper=await req('questions');if(!isActive())return;let old=null;try{old=JSON.parse(sessionStorage.getItem(storeName()))}catch{};if(old?.requestId&&old.requestId!==state.last?.requestId&&old.version===state.version&&typeof old.answers==='object'&&old.answers){draft=old;step=Math.max(0,Math.min(paper.length,Number(old.step)||0));}else{draft={requestId:crypto.randomUUID(),version:state.version,answers:{},step:0};step=0;}draw();}catch(err){tell(err.message,true)}finally{b.disabled=false}};
 }
 function jump(i){step=i;draft.step=i;save();draw();main.focus({preventScroll:true});window.scrollTo(0,0);}
 function draw(){
 if(!isActive())return;const total=paper.length;const answered=paper.filter(q=>draft.answers[q.id]?.length).length;const reviewing=step===total;
 const q=paper[step];const options=reviewing?'':q.options.map((o,i)=>`<label class="option"><input type="${q.type==='multiple'?'checkbox':'radio'}" name="answer" value="${i}" ${(draft.answers[q.id]||[]).includes(i)?'checked':''}><span>${safe(o)}</span></label>`).join('');
 main.innerHTML=`<div class="exam-wrap">${pageHead('Medication Administration Competency Exam',reviewing?'Review and submit':`Question ${step+1} of ${total}`,state.name)}<section class="quiz"><div class="progress-label"><span class="cap">Written exam</span><span class="small" id="count">${answered} of ${total} answered</span></div><div class="examstep"><i id="bar" style="width:${answered/total*100}%"></i></div>${reviewing?`<h2>Check your answers</h2><p>Select a question to revisit it. After you submit, the dashboard keeps a graded copy of this attempt.</p><div class="review-grid">${paper.map((it,i)=>`<button data-review="${i}" class="${draft.answers[it.id]?.length?'':'missing'}" aria-label="Question ${i+1}, ${draft.answers[it.id]?.length?'answered':'unanswered'}">${i+1} · ${draft.answers[it.id]?.length?'Done':'Open'}</button>`).join('')}</div><p class="small">${answered===total?'All questions are answered.':`${total-answered} question(s) still need an answer.`}</p><div class="controls"><button id="prev" class="secondary">Back to exam</button><button id="submit" class="primary" ${answered!==total?'disabled':''}>Submit for grading</button></div>`:`<fieldset class="question"><legend>${safe(q.prompt)}</legend>${q.type==='multiple'?'<p class="small">Select all that apply.</p>':''}${options}</fieldset><div class="controls"><button id="prev" class="secondary">${step?'Previous':'Exam overview'}</button><button id="next" class="primary">${step===total-1?'Review answers':'Next question'}</button></div>`}</section></div>`;
 el('prev').onclick=()=>step?jump(step-1):home();
 if(!reviewing){main.querySelectorAll('[name=answer]').forEach(input=>input.onchange=()=>{const selected=Array.from(main.querySelectorAll('[name=answer]:checked'),b=>+b.value);draft.answers[q.id]=selected;save();const n=paper.filter(it=>draft.answers[it.id]?.length).length;el('count').textContent=`${n} of ${total} answered`;el('bar').style.width=`${100*n/total}%`;tell('');});el('next').onclick=()=>{if(!draft.answers[q.id]?.length){tell('Choose an answer before continuing.',true);return}jump(step+1)};return;}
 main.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>jump(+b.dataset.review));el('submit').onclick=async e=>{const b=e.currentTarget;b.disabled=true;tell('Submitting your exam…');try{const receipt=await req('submit',{requestId:draft.requestId,answers:draft.answers});state.last=receipt;clear();if(isActive())home();tell('Graded exam saved to the HOEN dashboard.');try{await load();}catch{}}catch(err){tell(err.message+' Your answers are still saved in this tab. You can submit again.',true);b.disabled=false;}};
 }
 return {load};
}
