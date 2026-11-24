import {main,el,safe,instructor} from './common.js?v=review1';
const references='<details class="resource references"><summary>Instructor references</summary><p><strong>Ashley’s PowerPoint</strong> · <em>MedicationAdministrationslides.pptx</em>, 59 slides. The teaching slides summarize DSW responsibilities (slides 3–15), medication administration and errors (16–38), vital signs (39–48), and infection control and observations (49–58).</p><a href="https://ldh.la.gov/assets/medicaid/hss/docs/HSS_Rule_Making/LAC/DSW_LAC_10.27.25.pdf" target="_blank" rel="noopener">Louisiana medication administration requirements · Chapter 92, Subchapter D</a><a href="https://ldh.la.gov/assets/docs/OCDD/DirectServiceWorkers/DSWGuidelinesPart2DidacticTraining.pdf" target="_blank" rel="noopener">LDH and Louisiana State Board of Nursing · Core curriculum</a><a href="https://ldh.la.gov/assets/docs/OIDD/waiver/NurseConsultQA050126.pdf" target="_blank" rel="noopener">OCDD · Nurse Consult questions and answers</a></details>';
export function overview(openSlides){
 main.innerHTML=`<section class="hero"><div><div class="eyebrow">Initial training · Direct service workers</div><h1>Medication<br>Administration</h1><p>Learn how to check a medication, give it as authorized, document the dose and report a change.</p><div class="tagline"><strong>16 hours</strong><span>${instructor}</span></div><div class="actions"><button class="primary" id="open-slides">View teaching slides</button></div></div><aside class="guide-card"><h2>The six medication rights</h2><ul class="rights">${['Participant','Medication','Dose','Route','Time','Documentation'].map(v=>'<li>'+v+'</li>').join('')}</ul></aside></section><p class="guide-help">In class? Open the staff link Ashley shares. Your phone or computer will follow her slides, and you can take your exam from the same link.</p>${references}`;
 el('open-slides').onclick=openSlides;
}
export function slideBody(slides,n){
 const slide=slides[n-1];
 return `<div class="slide-count">Slide ${n} of ${slides.length}</div><div class="examstep" aria-hidden="true"><i style="width:${n/slides.length*100}%"></i></div><h1 tabindex="-1" id="slide-title">${safe(slide.title)}</h1><ul class="teaching-points">${slide.points.map(p=>`<li>${safe(p)}</li>`).join('')}</ul>`;
}
export function slideControls(n,total,finalText){return `<div class="controls"><button class="secondary" type="button" id="slide-prev" ${n===1?'disabled':''}>Back</button><button type="button" class="primary" id="slide-next">${n===total?finalText:'Next'}</button></div>`;}
let speechRun=0;
export function stopReading(){speechRun++;window.speechSynthesis?.cancel();}
export function readSlide(slide,b){
 if(window.speechSynthesis.speaking){stopReading();b.textContent='Read aloud';return;}
 const run=++speechRun;const voices=window.speechSynthesis.getVoices().filter(v=>v.lang?.startsWith('en'));const voice=voices.find(v=>/Google US English/i.test(v.name))||voices.find(v=>/Samantha|Aria|Jenny|Zira/i.test(v.name))||voices.find(v=>v.lang==='en-US');
 const lines=[slide.title,...slide.points];let n=0;b.textContent='Stop reading';
 function next(){if(run!==speechRun)return;if(n===lines.length){b.textContent='Read aloud';return;}const u=new SpeechSynthesisUtterance(lines[n++]);u.lang='en-US';u.rate=1.03;if(voice)u.voice=voice;u.onend=next;u.onerror=()=>{b.textContent='Read aloud'};window.speechSynthesis.speak(u);}
 next();
}
export function previewSlides(slides,onEnd){
 let n=1;
 function draw(){stopReading();main.innerHTML=`<div class="deck"><div class="slide-heading"><span class="cap">Teaching slides</span><span>${instructor}</span></div><article class="slide-paper">${slideBody(slides,n)}${slideControls(n,slides.length,'Course guide')}</article>${window.speechSynthesis?'<button id="read" class="plain">Read aloud</button>':''}</div>`;
 el('slide-prev').onclick=()=>{if(n>1){n--;draw();}};el('slide-next').onclick=()=>{if(n===slides.length)onEnd();else{n++;draw();}};
 if(el('read'))el('read').onclick=()=>readSlide(slides[n-1],el('read'));window.scrollTo(0,0);}
 draw();
}
