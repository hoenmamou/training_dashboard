import {main,el,safe,rpc,tell,bindForm,copyBox,privateLink,classLink,pageHead} from './common.js?v=basic1';

export function createClassroom(auth,isActive,back){
 let state,share=null,loadNo=0;
 async function load(){const n=++loadNo;const s=await rpc(auth,'state');if(!isActive()||n!==loadNo)return;state=s;draw();}
 function draw(){
  const staff=state.roster,locked=staff.some(r=>r.last);
  function row(r){
   const checked=r.progress.complete&&r.skillsAt;
   const status=r.certificate?'Certificate ready':r.last?(r.last.passed?'Exam passed':'Exam needs review'):checked?'Exam open':'Checked in';
   return `<div class="roster-pick"><label class="tick"><input type="checkbox" name="worker" value="${safe(r.id)}" ${checked?'disabled checked':''}><span><strong>${safe(r.name)}</strong><small>${safe(status)}${r.last?' · '+Number(r.last.points)+'/20':''}</small></span></label><button type="button" class="plain" data-return="${safe(r.id)}">Replace personal link</button></div>`;
  }
  const pending=staff.filter(r=>!(r.progress.complete&&r.skillsAt));
  main.innerHTML=`<div class="simple-room">${pageHead('Instructor classroom','Roster and exam',state.label)}<div class="actions"><button class="primary" id="teach">Teach class</button><button class="secondary" id="refresh-room">Refresh roster</button></div><details class="class-tools"><summary>Staff follow-along link</summary>${copyBox('Give this same link to every DSW.',classLink(state.id))}</details>
  <section class="panel"><h2>Open the exam</h2><p>After teaching, select the DSWs who completed the course.</p>
  <form id="finish-class">${staff.length?`<div>${staff.map(row).join('')}</div>`:'<p class="muted">Staff appear here when they enter their name on the class link.</p>'}
  ${pending.length?`<label class="tick"><input type="checkbox" id="select-pending">Select all awaiting confirmation</label><label class="field">Passing score out of 20<input type="number" name="score" min="1" max="20" step="1" value="${state.passItems??16}" ${locked?'disabled':'required'}></label><label class="tick"><input type="checkbox" name="verified" required><span>I confirm that each selected DSW completed 16 hours of RN-approved instruction and demonstrated infection control and the applicable vital-sign skills to me.</span></label><button class="primary">Confirm and open exam</button>`:''}</form></section>
  <details class="class-tools resource"><summary>Add a DSW manually</summary><form id="add-dsw"><label class="field">Full name for the certificate<input name="name" minlength="2" maxlength="100" required autocomplete="off"></label><button class="secondary">Create personal link</button></form></details>${share?copyBox('Personal link for '+share.name,privateLink('dsw',share.token)):''}</div>`;
  el('teach').onclick=back;
  el('refresh-room').onclick=async()=>{try{await load();}catch(err){tell(err.message,true);}};
  if(el('select-pending'))el('select-pending').onchange=e=>{main.querySelectorAll('[name=worker]:enabled').forEach(c=>c.checked=e.target.checked);};
  bindForm('finish-class',async(f,d)=>{const people=d.getAll('worker');if(!people.length)throw Error('Select the DSWs who completed the course.');await rpc(auth,'finish',{learners:people,passItems:Number(d.get('score')??state.passItems??16),confirmed:d.has('verified')});await load();tell('Training confirmed. The selected DSWs can open their exams.');});
  bindForm('add-dsw',async(f,d)=>{const name=String(d.get('name')).trim();if(name.length<2)throw Error('Enter the DSW’s full name.');f.dataset.request||=crypto.randomUUID();const r=await rpc(auth,'enroll',{id:f.dataset.request,name});share={name,token:r.token};await load();tell('Personal link ready.');});
  main.querySelectorAll('[data-return]').forEach(b=>b.onclick=async()=>{const r=staff.find(s=>s.id===b.dataset.return);if(!r||!confirm('Replace the current personal link for '+r.name+'?'))return;b.disabled=true;try{const v=await rpc(auth,'link',{learner:r.id});share={name:r.name,token:v.token};if(isActive()){draw();main.querySelector('.simple-room > .linkbox input')?.focus();}}catch(err){tell(err.message,true);}finally{b.disabled=false;}});
 }
 return {load};
}
