import {main, el, safe, rpc, tell, pageHead, instructor, courseNames, checkInForm, bindCheckIn, privateLink, copyBox, remember} from './common.js?v=review1';
import {slideBody, slideControls, readSlide, stopReading} from './guide.js?v=review1';

export function studyReview({track, lessons, originals, auth, room, joined, openExam, active}) {
  const title = courseNames[track];
  const intro = track === 'annual'
    ? 'Complete the review and written exam on your device. Ashley will evaluate the tasks you perform for your participant and sign the yearly competency record.'
    : 'Review the medication steps, take the written exam and follow up with Ashley about the area that needs retraining.';
  if (!auth) {
    main.innerHTML = `<div class="exam-wrap">${pageHead('Medication administration', title, intro)}<p class="muted">Instructor · ${instructor}</p>${checkInForm('Check in to start your review')}</div>`;
    bindCheckIn(room, personal => { if (active()) joined(personal); });
    return;
  }

  let step = 1, done = 0, name = '';
  function draw() {
    if (!active()) return;
    stopReading();
    const current = lessons[step - 1];
    const reference = current.notes.length
      ? `<details class="resource"><summary>Review the related teaching slides</summary>${current.notes.map(n => {
          const slide = originals[n - 1];
          return `<h3>${safe(slide.title)}</h3><ul>${slide.points.map(point => '<li>' + safe(point) + '</li>').join('')}</ul>`;
        }).join('')}</details>` : '';
    main.innerHTML = `<div class="deck"><div class="slide-heading"><strong>${safe(title)}</strong><span>${instructor}</span></div>
      <article class="slide-paper">${slideBody(lessons,step)}${reference}${slideControls(step,lessons.length,'Open my exam')}</article>
      <div class="actions">${window.speechSynthesis?'<button class="plain" type="button" id="read">Read aloud</button>':''}
        ${done===lessons.length?'<button class="plain" id="review-exam">My exam and result</button>':''}</div>
      <p class="follow-hint">Checked in as <strong>${safe(name)}</strong>. Your progress is saved after each slide.</p>
      <details class="class-tools"><summary>My personal return link</summary>${copyBox('Use this private link to resume on another device.',privateLink('dsw',auth.key))}</details></div>`;
    el('slide-prev').onclick = () => { if (step>1) {step--; draw(); window.scrollTo(0,0);} };
    el('slide-next').onclick = async () => {
      const next = el('slide-next'), prev = el('slide-prev');
      next.disabled = prev.disabled = true;
      tell('');
      try {
        if (step>done) {
          const progress = await rpc(auth,'review_step',{step});
          if (!active()) return;
          done = progress.steps;
        }
        if (step===lessons.length) {openExam(); return;}
        step++; draw(); window.scrollTo(0,0);
      } catch(err) {
        if (active()) { tell(err.message,true); next.disabled=false; prev.disabled=step===1; }
      }
    };
    if (el('read')) el('read').onclick = () => readSlide(current,el('read'));
    if (el('review-exam')) el('review-exam').onclick = openExam;
  }
  return rpc(auth,'state').then(state => {
    if (!active()) return;
    if (state.course!==track || state.progress.total!==lessons.length) throw Error('Reload the course to get the current review.');
    if (auth.classId!==state.classId) {auth.classId=state.classId; remember(auth);}
    done=state.progress.steps; name=state.name;
    if (done===lessons.length) {step=1;} else {step=done+1;}
    draw();
  });
}
