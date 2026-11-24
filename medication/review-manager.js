import {main,el,safe,rpc,tell,bindForm,copyBox,privateLink,classLink,pageHead,courseNames} from './common.js?v=review1';

function centralDate() {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=type=>parts.find(p=>p.type===type).value;
  return [get('year'),get('month'),get('day')].join('-');
}
function staffStatus(person) {
  if (person.certificate) return 'Certificate ready';
  if (person.evaluation==='needs_review') return 'Further training needed';
  if (person.exam?.passed) return 'Ready for RN evaluation';
  if (person.exam) return 'Written exam needs review';
  return person.steps?'Review in progress':'Checked in';
}

export function reviewManager(auth,active) {
  let current=null, groups=[], group=null, selected=null, newLink=null, sequence=0;
  const req=(action,data)=>rpc(auth,action,data);
  async function load() {
    const call=++sequence;
    const data=await (current?req('review_group',{group:current}):req('review_groups'));
    if (!active()||call!==sequence) return;
    if (current) {group=data; drawGroup();} else {groups=data; drawGroups();}
  }
  function reload(){load().catch(e=>{if(active())tell(e.message,true);});}
  function open(id){current=id; selected=null; newLink=null; tell(''); reload();}
  function drawGroups(){
    const cards=['retraining','annual'].map(track=>{
      const rooms=groups.filter(g=>g.course===track);
      return `<section class="panel track-card"><h2>${courseNames[track]}</h2>
        <p>${track==='annual'?'Annual written review and participant-specific RN competency evaluation.':'Focused review and RN follow-up after an error, change or coaching need.'}</p>
        ${rooms.length?rooms.map(g=>`<div class="track-group"><strong>${safe(g.label)}</strong><span class="small"> · ${Number(g.enrolled)} checked in</span>
          ${copyBox('Staff link to send',classLink(g.id))}<button class="secondary" data-group="${safe(g.id)}">Open roster and evaluations</button></div>`).join(''):'<p class="muted">Create a group to get a staff link.</p>'}</section>`;
    }).join('');
    main.innerHTML=`<div class="simple-room">${pageHead('Instructor classroom','Retraining and yearly recertification','Send the appropriate staff link. Each DSW reviews the slides and takes the exam on their own device.')}<div class="twocol">${cards}</div>
      <details class="resource class-tools"><summary>Create another group</summary><p>Use a new group for a new training cycle or a separate participant evaluation for the same DSW. Earlier records stay on file.</p>
      <form id="new-group"><label class="field">Course<select name="course"><option value="retraining">Retraining</option><option value="annual">Yearly recertification</option></select></label>
      <label class="field">Group name<input name="label" minlength="2" maxlength="100" placeholder="e.g., Yearly recertification · 2027" required></label><button class="primary">Create group and staff link</button></form></details></div>`;
    main.querySelectorAll('[data-group]').forEach(button=>button.onclick=()=>open(button.dataset.group));
    bindForm('new-group',async(form,data)=>{
      const id=form.dataset.request||=crypto.randomUUID();
      const result=await req('review_create',{id,course:data.get('course'),label:String(data.get('label')).trim()});
      if(active())open(result.id);
    });
  }
  function evaluationForm(){
    if (!selected) return '';
    const annual=group.course==='annual';
    return `<section class="panel" id="evaluation-panel"><h2>RN evaluation for ${safe(selected.name)}</h2>
       <form id="sign-review"><label class="field">Date evaluated<input name="date" type="date" required value="${centralDate()}" max="${centralDate()}"></label>
       <label class="field">Participant file reference${annual?'':' (if applicable)'}<input name="participant" maxlength="80" ${annual?'required':''} aria-describedby="reference-use"></label>
       <p class="small" id="reference-use">Use the agency’s file code. Keep participant names and medication details in the participant’s record.</p>
       <label class="field">${annual?'Tasks evaluated and authorized, or tasks needing further training':'What prompted retraining and which steps you reviewed'}<textarea name="tasks" rows="3" minlength="3" maxlength="600" required></textarea></label>
       <label class="field">Outcome<select name="outcome" required><option value="">Select an outcome</option><option value="competent">${annual?'Competent for the listed tasks':'Retraining complete'}</option><option value="needs_review">Further training needed</option></select></label>
       <label class="field">Actual training minutes, if crediting time<input name="minutes" type="number" min="1" step="1" inputmode="numeric"></label>
       <label class="tick"><input name="confirmed" type="checkbox" required><span>${annual?'I personally evaluated this DSW performing the listed tasks for the referenced participant and recorded my decision above.':'I provided or verified the retraining described above and recorded the DSW’s performance and any follow-up needed.'}</span></label>
       <label class="field">RN signature<input name="signature" required autocomplete="off" placeholder="Type Ashley Malbrough, RN"></label>
       <div class="actions"><button class="primary">Sign and save evaluation</button><button type="button" class="secondary" id="cancel-evaluation">Cancel</button></div></form></section>`;
  }
  function drawGroup(){
    const title=courseNames[group.course];
    const people=group.roster.map(person=>`<div class="roster-pick"><span><strong>${safe(person.name)}</strong><small>${staffStatus(person)}${person.exam?' · '+Number(person.exam.points)+'/20':''}</small></span>
      <span class="actions">${person.exam?.passed&&!person.certificate?`<button class="secondary" data-evaluate="${safe(person.id)}">Record evaluation</button>`:''}
      <button type="button" class="plain" data-return="${safe(person.id)}">Replace personal link</button></span></div>`).join('');
    main.innerHTML=`<div class="simple-room">${pageHead(title,group.label,'Written exam results and RN evaluations for this group.')}
      <div class="actions"><button id="groups" class="secondary">All review groups</button><button class="plain" id="refresh">Refresh roster</button></div>
      ${copyBox('Staff link to send',classLink(group.id))}<section class="panel"><h2>Staff roster</h2>${people||'<p>Staff appear here when they check in using the group link.</p>'}</section>
      ${newLink?copyBox('Personal return link for '+newLink.name,privateLink('dsw',newLink.key)):''}${evaluationForm()}</div>`;
    el('groups').onclick=()=>open(null); el('refresh').onclick=reload;
    main.querySelectorAll('[data-evaluate]').forEach(b=>b.onclick=()=>{
      selected=group.roster.find(person=>person.id===b.dataset.evaluate);newLink=null;drawGroup();
      el('evaluation-panel').scrollIntoView({block:'start'});el('sign-review').elements.date.focus({preventScroll:true});
    });
    main.querySelectorAll('[data-return]').forEach(b=>b.onclick=async()=>{
      const person=group.roster.find(p=>p.id===b.dataset.return);
      if(!confirm('Replace the current personal link for '+person.name+'?'))return;
      const id=group.id;b.disabled=true;
      try {const data=await req('review_return',{group:id,learner:person.id});if(active()&&current===id){newLink={name:person.name,key:data.token};drawGroup();tell('Personal return link ready.');}}
      catch(e){if(active())tell(e.message,true);}finally{b.disabled=false;}
    });
    if(el('cancel-evaluation'))el('cancel-evaluation').onclick=()=>{selected=null;drawGroup();};
    bindForm('sign-review',async(form,data)=>{
      const id=form.dataset.request||=crypto.randomUUID(), target=group.id;
      const payload=Object.fromEntries(data.entries());
      await req('review_sign',{...payload,id,group:target,learner:selected.id,confirmed:data.has('confirmed')});
      if(!active()||current!==target)return;
      selected=null;await load();tell(payload.outcome==='competent'?'Evaluation saved. The certificate and signed evaluation are ready on the HOEN dashboard.':'Evaluation saved. Further training is recorded.');
    });
  }
  return {load};
}
