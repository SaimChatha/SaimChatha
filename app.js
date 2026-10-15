(function () {
  'use strict';
  const {cases, sources} = window.CULTURE_DATA;
  const benches = [['csf','CSF'],['blood','Blood culture'],['wound','Wounds'],['screens','Screens'],['urine','Urine'],['genital','Genital']];
  const benchName = group => benches.find(b=>b[0]===group)?.[1] || group;
  const benchCount = group => cases.filter(c=>c.group===group).length;
  const KEY = 'culture-bench-progress-v1';
  const icons = {
    bench:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12"/>',
    library:'<path d="M4 4h6v16H4zM14 4h6v16h-6zM7 7v3M17 7v3"/>',
    guide:'<path d="M3 5c4-1 6-1 9 1 3-2 5-2 9-1v15c-4-1-6-1-9 1-3-2-5-2-9-1zM12 6v15"/>',
    progress:'<path d="M4 20h17M7 16v-4M12 16V7M17 16V3"/>',
    interview:'<path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icons[name] || ''}</svg>`;
  const logo = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="26" stroke="currentColor" stroke-width="1.5"/><circle cx="32" cy="32" r="22" stroke="currentColor" stroke-opacity=".3"/><g fill="currentColor"><circle cx="24" cy="21" r="4"/><circle cx="42" cy="26" r="2.5"/><circle cx="27" cy="42" r="5"/><circle cx="44" cy="43" r="2"/></g></svg>';
  const esc = (v) => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let storageOK = true;
  let progress = {};
  try {
    let raw = {};
    const stored = localStorage.getItem(KEY);
    try { raw = JSON.parse(stored || '{}'); } catch (_) { /* Recover a malformed saved value. */ }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const c of cases) {
        const r = raw[c.id];
        if (r && Number.isInteger(r.score) && r.score >= 0 && r.score <= 3 && Number.isInteger(r.attempts) && r.attempts > 0) {
          progress[c.id] = {score:r.score,attempts:r.attempts};
          if(Array.isArray(r.stages) && r.stages.length===3 && r.stages.every(p=>typeof p==='boolean')) progress[c.id].stages=r.stages;
          if(typeof r.date==='string') progress[c.id].date=r.date;
        }
      }
    }
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch (_) { storageOK = false; }

  const state = {view:'bench',mode:'csf',bench:'csf',queue:[],index:0,stage:0,answers:[[],[],[]],order:[],recorded:false,confirmReveal:false,confirmReset:false,interviewRevealed:false,filter:'all',search:''};
  function shuffle(array) {
    const a = [...array];
    for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }
  function getDeck(mode) {
    if (benches.some(b=>b[0]===mode)) return cases.filter(c=>c.group===mode).map(c=>c.id);
    if (mode === 'mistakes') return cases.filter(c=>progress[c.id] && progress[c.id].score<3).map(c=>c.id);
    const groups = benches.map(([g])=>cases.filter(c=>c.group===g));
    const deck=[];
    for(let i=0;i<Math.max(...groups.map(g=>g.length));i++) groups.forEach(g=>{if(g[i]) deck.push(g[i].id);});
    return deck;
  }
  function current() { return cases.find(c=>c.id===state.queue[state.index]); }
  function begin(id) {
    if (id) state.index = state.queue.indexOf(id);
    state.stage=0; state.answers=[[],[],[]]; state.recorded=false; state.confirmReveal=false; state.interviewRevealed=false;
    const c=current();
    state.order=c ? c.questions.map(q=>shuffle(q.options.map((_,i)=>i))) : [];
  }
  function setMode(mode) {
    if (!['mixed','mistakes',...benches.map(b=>b[0])].includes(mode)) return;
    if (benches.some(b=>b[0]===mode)) state.bench=mode;
    state.mode=mode; state.queue=getDeck(mode); state.index=0; begin();
  }
  function scoreQuestion(q, answer) {
    const selected=new Set(answer);
    return q.options.every((o,i)=>o.kind==='required' ? selected.has(i) : o.kind==='wrong' ? !selected.has(i) : true);
  }
  function getScore(c, answers) { return c.questions.reduce((n,q,i)=>n+(scoreQuestion(q,answers[i]||[]) ? 1:0),0); }
  function save() {
    if(!storageOK) return;
    try {localStorage.setItem(KEY,JSON.stringify(progress));} catch (_) {storageOK=false;}
  }
  function review() {
    const c=current(); if(!c) return;
    if(!state.recorded) {
      const score=getScore(c,state.answers);
      const stages=c.questions.map((q,i)=>scoreQuestion(q,state.answers[i]));
      progress[c.id]={score,stages,attempts:(progress[c.id]?.attempts||0)+1,date:new Date().toISOString()};
      state.recorded=true;save();
    }
    state.stage=3; state.confirmReveal=false;
  }
  function nextCase(skip=false) {
    if(state.mode==='mistakes') {
      const old=current()?.id;
      state.queue=getDeck('mistakes');
      if(state.queue.length) {
        const oldIndex=state.queue.indexOf(old);
        state.index=oldIndex<0 ? Math.min(state.index,state.queue.length-1) : (oldIndex+1)%state.queue.length;
      } else state.index=0;
    } else state.index=(state.index+1)%state.queue.length;
    begin();render('case');
    if(skip) toast('Skipped without adding a result.');
  }
  function stats() {
    const rows=Object.values(progress);
    return {done:rows.length,mastered:rows.filter(r=>r.score===3).length,mistakes:rows.filter(r=>r.score<3).length,accuracy:rows.length?Math.round(rows.reduce((n,r)=>n+r.score,0)/(rows.length*3)*100):null};
  }
  function navigation(mobile=false) {
    return `<nav class="${mobile?'mobile-nav':'nav'}" aria-label="${mobile?'Mobile navigation':'Main navigation'}">${[['bench','Workbench'],['interview','Interview'],['library','Case library'],['guide','Field guide'],['progress','Progress']].map(([v,label])=>`<button type="button" data-action="view" data-view="${v}" class="${state.view===v?'active':''}" ${state.view===v?'aria-current="page"':''}>${icon(v)}<span>${label}</span></button>`).join('')}</nav>`;
  }
  function tag(c) {return `<span class="tag ${c.group}">${esc(benchName(c.group))}</span>`;}
  function plate(p, generic=false) {
    if(!p) return '';
    const points=[[56,49],[78,43],[98,60],[57,77],[81,83],[107,91],[48,103],[76,118],[111,116],[126,68],[40,64],[99,135],[120,134],[35,85]];
    const circles=points.map(([x,y],i)=>{
      const fill=p.colors[i%p.colors.length]; const r=p.style==='small'?3.5:p.style==='flat'?8:4+(i%3);
      const halo=p.style==='halo'?`<circle cx="${x}" cy="${y}" r="${r+5}" fill="#9b733d" opacity=".22"/>`:p.style==='beta'?`<circle cx="${x}" cy="${y}" r="${r+6}" fill="#eeb3a0" opacity=".23"/>`:'';
      return `${halo}<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${p.style==='flat'?r*.7:r}" fill="${fill}" stroke="#fff" stroke-width=".5" stroke-opacity=".25"/>`;
    }).join('');
    return `<svg viewBox="0 0 170 170" role="img" aria-label="${esc(generic?'Illustrative culture plate':p.caption+' on '+p.medium)}"><circle cx="85" cy="85" r="81" fill="#f7f8f0" stroke="#b8c5b2"/><circle cx="85" cy="85" r="73" fill="${p.bg}"/><circle cx="85" cy="85" r="76" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>${circles}<path d="M38 38Q55 22 73 18" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>`;
  }
  function clues(c) {
    return `<div class="bench-clues ${c.plate?'':'no-plate'}">${c.plate?`<figure>${plate(c.plate)}<figcaption>${esc(c.plate.caption)}<br>Teaching schematic · not a photograph</figcaption></figure>`:''}<div><h3>Bench observations</h3><ul>${c.clues.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>${c.plate?`<p class="medium-label">${esc(c.plate.medium)} · colours are product dependent</p>`:''}</div></div>`;
  }
  function sourceLinks(refs) {
    return `<div class="source-title">Reference notes</div><div class="source-links">${[...new Set(refs)].map(id=>`<a href="${esc(sources[id].url)}" target="_blank" rel="noopener noreferrer">${esc(sources[id].title)} ↗</a>`).join('')}</div>`;
  }
  function feedback(c) {
    const score=getScore(c,state.answers);
    const titles=['Media & diagnostic plan','Prediction & reasoning','Result interpretation'];
    const revisit=titles.filter((_,i)=>!scoreQuestion(c.questions[i],state.answers[i]));
    return `<div class="review-score"><div class="score-circle" aria-label="${score} of 3 steps correct">${score}/3</div><div><h2>${score===3?'A well-read case.':score===2?'Almost there.':'Let’s revisit the clues.'}</h2><p>One point per step. Optional additions do not reduce your score.</p></div></div>
      <p class="review-focus">${score===3?'You chose the pathway, made a supported prediction and interpreted the findings. Rehearse the interview answer to explain that reasoning aloud.':'Focus your next attempt on: '+esc(revisit.join('; '))+'. Use the reasons below, then retry this case or return through Mistakes.'}</p>
      ${c.questions.map((q,qi)=>{
        const answered=state.answers[qi];const passed=scoreQuestion(q,answered);
        const correct=q.options.map((o,i)=>o.kind==='required'?i:-1).filter(i=>i>=0);
        const rows=[...new Set([...answered,...correct])];
        return `<section class="feedback-group"><h3>${qi+1}. ${titles[qi]}<span class="result-tag ${passed?'':'bad'}">${passed?'✓ Correct':'↻ Review'}</span></h3><p class="feedback-prompt">${esc(q.prompt)}</p>${rows.map(i=>{
          const o=q.options[i];const chosen=answered.includes(i);const type=o.kind==='wrong'?'wrong':o.kind==='optional'?'optional':chosen?'correct':'missed';
          const label=type==='wrong'?'Your choice · unsuitable':type==='optional'?'Your choice · optional':type==='missed'?'Required · missed':'Your choice · correct';
          return `<div class="feedback-row ${type}"><span class="small muted">${label}</span><strong>${esc(o.label)}</strong><p>${esc(o.why)}</p></div>`;
        }).join('')}<details class="alternative-reasons"><summary>Why the other choices do not fit</summary>${q.options.map((o,i)=>o.kind==='wrong'&&!rows.includes(i)?`<div class="feedback-row"><strong>${esc(o.label)}</strong><p>${esc(o.why)}</p></div>`:'').join('')||'<p>All unsuitable choices are explained above.</p>'}</details></section>`;
      }).join('')}${clues(c)}<div class="takeaway"><span class="eyebrow">Take to the bench</span>${esc(c.takeaway)}</div>${interviewQuestion(c)}${sourceLinks(c.refs)}`;
  }
  function interviewQuestion(c) {
    if(!c.interview) return '';
    return `<section class="interview-card"><div class="eyebrow">The interviewer asks</div><h3>${esc(c.interview.question)}</h3><p class="hint">Say your answer aloud: sample → pathway → findings → significance → next action.</p><button class="btn" data-action="interview-answer" aria-expanded="${state.interviewRevealed}" aria-controls="model-answer">${state.interviewRevealed?'Hide model answer':'Reveal model answer'}</button>${state.interviewRevealed?`<div class="model-answer" id="model-answer"><div class="eyebrow">A model answer</div><p>${esc(c.interview.answer)}</p><p class="small muted">Self-check: did you separate an observation from a confirmed result, state the limits and explain your reporting or escalation?</p></div>`:''}</section>`;
  }
  function aside() {
    const s=stats();
    return `<aside class="aside" aria-label="Practice notes"><div class="aside-card"><div class="eyebrow">Your bench today</div><h3>One case at a time.</h3><p>Choose your set-up, make a prediction, then read the observations.</p><div class="tiny-divider"></div><div class="tiny-stats"><div><strong>${s.done}<span> / ${cases.length}</span></strong><span>Cases attempted</span></div><div><strong>${s.accuracy===null?'—':s.accuracy+'%'}</strong><span>Latest accuracy</span></div></div></div>
      <div class="aside-card light"><div class="eyebrow">A good bench habit</div><div class="plate-preview">${plate({bg:'#e7e9d6',colors:['#a6b58f','#cad1aa'],style:'round',caption:'Teaching illustration'},true)}</div><div class="checklist"><div class="checkitem"><span class="checkdot">1</span>Sample & clinical context</div><div class="checkitem"><span class="checkdot">2</span>Medium & test pathway</div><div class="checkitem"><span class="checkdot">3</span>Clue, then confirmation</div></div><div class="tiny-divider"></div><p>Growth can mean colonisation. Colour can suggest an identity. Neither alone is a diagnosis.</p><button class="textbtn" data-action="view" data-view="guide">Open the field guide ↗</button></div></aside>`;
  }
  function modes() {
    const s=stats();
    return `<div class="bench-picker" role="group" aria-label="Choose a bench">${benches.map(([g,label])=>{
      const completed=cases.filter(c=>c.group===g && progress[c.id]?.score===3).length;
      return `<button type="button" data-action="mode" data-mode="${g}" class="bench-tile ${state.mode===g?'selected':''}" aria-pressed="${state.mode===g}"><strong>${label}</strong><span>${benchCount(g)} scenarios · ${completed} mastered</span></button>`;
    }).join('')}</div><div class="modebar"><div class="segmented" role="group" aria-label="Practice mode">${[[state.bench,'This bench'],['mixed','Mixed bench'],['mistakes','Mistakes'+(s.mistakes?' · '+s.mistakes:'')]].map(([m,label])=>`<button type="button" data-action="mode" data-mode="${m}" class="${state.mode===m?'selected':''}" aria-pressed="${state.mode===m}">${label}</button>`).join('')}</div><div class="mode-detail"><span>${state.mode==='mixed'?cases.length+' cases · '+benches.length+' benches':state.mode==='mistakes'?'Revisit your latest missed steps':benchName(state.mode)+' · '+state.queue.length+' cases'}</span><button class="textbtn" data-action="shuffle" ${!state.queue.length?'disabled':''}>Shuffle ↗</button></div></div>`;
  }
  function bench() {
    const c=current();
    if(!c) return `${modes()}<div class="empty"><h2>${stats().done?'You’re caught up.':'Your review queue is clear.'}</h2><p>Cases with a score below 3/3 appear here after feedback is revealed.</p><button class="btn primary" data-action="mode" data-mode="${state.bench}">Practise ${esc(benchName(state.bench))} →</button></div>`;
    const q=c.questions[state.stage];
    const stageLabels=['Set-up','Predict','Read','Review'];
    return `${modes()}<div class="practice-grid"><article class="case-panel"><header class="case-head"><div class="specimen">${tag(c)}<span>${esc(c.specimen)}</span></div><span class="case-number">${c.id} · ${state.index+1} of ${state.queue.length}</span></header>
      <div class="case-body"><div class="eyebrow muted">${esc(c.level)} · about 2 minutes</div><h2>${esc(c.title)}</h2><p class="case-story">${esc(c.story)}</p><p class="target">${esc(c.target)}</p></div>
      <div class="steps" aria-label="Case stages">${stageLabels.map((label,i)=>`<div class="step ${state.stage===i?'current':state.stage>i?'done':''}" ${state.stage===i?'aria-current="step"':''}><span class="step-num">${state.stage>i?'✓':i+1}</span><span>${label}</span></div>`).join('')}</div>
      <div class="question">${state.stage===3?feedback(c):`${state.stage===2?clues(c):''}<div class="eyebrow muted">${state.stage===0?'Select all that apply':state.stage===1?'Make a prediction':'Interpret & act'}</div><fieldset class="choice-list"><legend>${esc(q.prompt)}</legend><p class="hint">${q.multi?'Select the required steps. Sensible optional additions are accepted; unrelated choices are not.':'Choose the best answer for this case.'}</p>${state.order[state.stage].map((oi,displayIndex)=>{
        const o=q.options[oi],checked=state.answers[state.stage].includes(oi);
        return `<label class="choice ${checked?'chosen':''}"><input type="${q.multi?'checkbox':'radio'}" name="answer-${state.stage}" value="${oi}" data-choice="${oi}" ${checked?'checked':''}><span>${esc(o.label)}</span><span class="choice-code" aria-hidden="true">${String.fromCharCode(65+displayIndex)}</span></label>`;
      }).join('')}</fieldset>`}</div>
      ${state.confirmReveal?`<div class="reveal-confirm" role="alert"><span>Unanswered steps will score 0. Reveal this case now?</span><div><button class="btn subtle" data-action="cancel-reveal">Keep practising</button> <button class="btn" data-action="reveal-confirmed">Reveal now</button></div></div>`:''}
      <div class="actions">${state.stage===3?`<button class="btn" data-action="retry">Try this case again</button><button class="btn primary" data-action="next">Next case →</button>`:`<button class="btn subtle" data-action="back" ${state.stage===0?'disabled':''}>← Back</button><button class="btn primary" data-action="continue" ${state.answers[state.stage].length?'':'disabled'}>${state.stage===2?'Reveal feedback':'Continue'} →</button>`}</div>
      ${state.stage<3?`<div style="padding:0 27px;display:flex;justify-content:space-between;gap:16px"><button class="textbtn" data-action="reveal">Reveal early</button><button class="textbtn" data-action="skip">Skip case</button></div>`:''}</article>${aside()}</div>`;
  }
  function interview() {
    const c=current();
    if(!c) return bench();
    return `${modes()}<div class="practice-grid"><article class="case-panel"><header class="case-head"><div class="specimen">${tag(c)}<span>${esc(c.specimen)}</span></div><span class="case-number">${c.id} · ${state.index+1} of ${state.queue.length}</span></header><div class="case-body"><div class="eyebrow muted">Interview rehearsal · unscored</div><h2>${esc(c.title)}</h2><p class="case-story">${esc(c.story)}</p><p class="target">${esc(c.target)}</p></div><div class="question">${clues(c)}${interviewQuestion(c)}${state.interviewRevealed?`<div class="takeaway"><span class="eyebrow">Take to the bench</span>${esc(c.takeaway)}</div>${sourceLinks(c.refs)}`:''}</div><div class="actions"><button class="btn" data-action="open-case" data-case="${c.id}">Practise scored case</button><button class="btn primary" data-action="next">Next question →</button></div></article>${aside()}</div>`;
  }
  function caseCards() {
    const query=state.search.trim().toLowerCase();
    const found=cases.filter(c=>(state.filter==='all'||c.group===state.filter)&&(!query||[c.id,c.specimen,c.title,c.story,c.level,c.clues.join(' '),c.takeaway,c.interview?.question].join(' ').toLowerCase().includes(query)));
    return found.length?found.map(c=>`<button class="case-card" data-action="open-case" data-case="${c.id}"><div class="card-top">${tag(c)}<span>${progress[c.id]?progress[c.id].score+'/3 latest':'Not attempted'}</span></div><h3>${esc(c.title)}</h3><div class="spec-label">${esc(c.specimen)}</div><div class="meta"><span>${c.id} · ${esc(c.level)}</span><span>Open case →</span></div></button>`).join(''):'<div class="empty"><p>No cases match. Try another specimen or search term.</p></div>';
  }
  function library() {
    return `<div class="filterbar"><div class="segmented filter-tabs" role="group" aria-label="Specimen filter">${[['all','All '+cases.length],...benches].map(([v,label])=>`<button class="${state.filter===v?'selected':''}" aria-pressed="${state.filter===v}" data-action="filter" data-filter="${v}">${label}</button>`).join('')}</div><input class="search" type="search" id="case-search" aria-label="Search cases" placeholder="Search specimen, topic or case ID…" value="${esc(state.search)}"></div><div class="library-grid" id="case-results" aria-live="polite">${caseCards()}</div>`;
  }
  function progressView() {
    const s=stats();const rows=cases.filter(c=>progress[c.id]);
    return `<div class="progress-grid"><div class="stat-card"><div class="eyebrow muted">Attempted</div><strong>${s.done}<span class="small"> / ${cases.length}</span></strong><p>Distinct cases reviewed</p></div><div class="stat-card"><div class="eyebrow muted">Latest accuracy</div><strong>${s.accuracy===null?'—':s.accuracy+'%'}</strong><p>Across 3 steps per case</p></div><div class="stat-card"><div class="eyebrow muted">All steps correct</div><strong>${s.mastered}</strong><p>Latest score of 3/3</p></div></div><div class="bench-progress">${benches.map(([g,label])=>`<div><strong>${label}</strong><span>${cases.filter(c=>c.group===g && progress[c.id]?.score===3).length} / ${benchCount(g)} mastered</span></div>`).join('')}</div><div class="notice">Progress is saved in this browser on this device. It does not sync between devices. Scores use your latest reviewed attempt; unanswered revealed steps score 0. Interview rehearsal is unscored.</div>
      <div class="view-panel"><h2 class="serif" style="font-size:25px;margin-bottom:15px">Your case notebook</h2>${rows.length?rows.map(c=>`<div class="progress-row"><div class="label">${esc(c.title)}<span>${esc(c.specimen)} · ${progress[c.id].attempts} attempt${progress[c.id].attempts===1?'':'s'} · ${progress[c.id].stages?.map((p,i)=>!p?['Set-up','Prediction','Reading'][i]:null).filter(Boolean).join(', ')||(progress[c.id].score===3?'All steps correct':'Review latest result')}</span></div><strong>${progress[c.id].score}/3</strong><button class="btn" data-action="open-case" data-case="${c.id}">Retry</button></div>`).join(''):'<p class="muted small">Reveal feedback on your first case to start a notebook.</p>'}<div class="resetbox">${state.confirmReset?`<span>Clear all saved scores and attempt counts on this device?</span><button class="btn danger" data-action="reset-confirmed">Clear progress</button><button class="btn" data-action="cancel-reset">Cancel</button>`:`<button class="btn" data-action="mode" data-mode="mistakes">Review mistakes${s.mistakes?' · '+s.mistakes:''} →</button><button class="textbtn" data-action="reset">Reset local progress</button>`}</div></div>`;
  }
  function guide() {
    const media=[['Blood + chocolate agar','Routine CSF bacterial recovery in the specified pathway; urgent microscopy and communication remain separate steps.'],['Positive blood-culture bottle','Urgent Gram stain, morphology-directed subculture, identification and validated susceptibility work-up.'],['Selective screening agar / molecular test','Detect a carriage target using the named local algorithm; confirmation and clinical infection assessment are separate.'],['Blood agar','Routine bacterial recovery; inspect haemolysis and confirm relevant isolates.'],['Sabouraud / Candida chromogenic agar','Yeast isolation; named product colours are presumptive clues.'],['GBS enrichment + downstream agar','A targeted carriage pathway. Confirm suspect GBS; direct plating alone is less sensitive.'],['GC-selective enriched agar','Gonococcal recovery for identification and AST when indicated.'],['CLED / urine chromogenic agar','Routine quantitative urine culture using a validated inoculum.'],['MacConkey / CLED in wound work-up','Recovery/differentiation of enteric Gram-negative organisms, as locally indicated.'],['Anaerobic agar / pathway','Relevant to deep, necrotic or abscess infection; sample quality matters.'],['NAAT and microscopy','Some genital targets require these rather than routine plate culture.']];
    return `<div class="notice">These are fictional training cases, not a laboratory SOP. Use your laboratory’s validated media, identification, incubation, reporting and escalation procedures for patient specimens. No treatment decisions are provided.</div><div class="guide-grid"><div>
      <section class="guide-card"><h2>Choose the pathway.</h2><table class="media-table"><thead><tr><th scope="col">Medium / method</th><th scope="col">What it helps you assess</th></tr></thead><tbody>${media.map(([m,t])=>`<tr><td>${esc(m)}</td><td>${esc(t)}</td></tr>`).join('')}</tbody></table><p>Cases group equivalent media as alternatives and specify their training target. Optional sensible additions are accepted. This does not define a universal plate set.</p></section>
      <section class="guide-card"><h2>Know the specimen.</h2><details><summary>CSF: urgency and limits</summary><p>Prioritise receipt, microscopy, culture and urgent communication. A negative Gram stain or culture does not exclude meningitis, particularly after antibiotics. Integrate cell counts, chemistry, history and validated molecular or specialist tests. Device-associated specimens need their stated pathway.</p></details><details><summary>Blood culture: signal to significance</summary><p>A positive bottle is a signal for investigation. Communicate the Gram result promptly, select subculture and confirmation steps, then assess identity with sets, collection sites and clinical context. Skin-associated organisms can cause real infection, especially with devices. Both Gram-positive and Gram-negative organisms can cause severe infection; urgency depends on the finding and the patient’s condition.</p></details><details><summary>Screens: carriage and confirmation</summary><p>MRSA, GBS, CPE and VRE screening algorithms use different sites and methods. Confirm suspect colonies or molecular findings according to the validated pathway. A carriage result supports screening and infection-control decisions; it does not by itself prove clinical infection.</p></details><details><summary>Urine: count and context</summary><p>Interpret the count with the actual inoculum, specimen type, symptoms, predominance and collection quality. Pyuria alone does not establish bacterial infection. Asymptomatic bacteriuria and catheter colonisation need their own clinical context.</p></details><details open><summary>HVS and LVS</summary><p>HVS is a high vaginal swab; LVS is a low vaginal swab. Both can recover overlapping flora, including yeast and GBS. The clinical question, collection site and validated method determine suitability. A routine vaginal culture is not an all-purpose STI screen.</p></details><details><summary>GBS carriage versus infection</summary><p>A specifically requested lower vaginal + rectal carriage test uses a validated pathway. Carriage is not proof of invasive infection. Screening policy and clinical management are separate from bench detection.</p></details><details><summary>Urethral / endocervical swabs</summary><p>Gonococcal culture and STI NAAT may require separate accepted specimens. Chlamydia is not recovered on routine cell-free agar. Check the assay’s site and collection requirements.</p></details><details><summary>Wound swab versus abscess pus</summary><p>A surface swab can be unrepresentative of a deep infection. Tissue or aspirate may be preferable. Depth, clinical findings and sample quality change the significance of growth.</p></details><details><summary>“STS2” / “STST” bench labels</summary><p>Do not infer the formulation from a local abbreviation alone. Check the manufacturer, full plate label, instructions for use and your SOP. This trainer does not assign a universal meaning or colour key to these labels.</p></details></section>
    </div><div>
      <section class="guide-card"><h2>Read colours in context.</h2><p><strong>CHROMagar™ Candida</strong> (the named product)</p>${[['#4c926e','Green → presumptive C. albicans'],['#aa78a3','Mauve → may suggest C. glabrata'],['#4f8b9b','Metallic blue → presumptive C. tropicalis'],['#cb8ca2','Pink, fuzzy → presumptive C. krusei']].map(([colour,label])=>`<div class="palette-row"><span class="swatch" style="background:${colour}"></span>${label}</div>`).join('')}<p>Colours vary with product and conditions. Mauve alone is not a specific final ID. The trainer uses confirmed identification where necessary.</p><div class="tiny-divider"></div><p><strong>CHROMagar™ Orientation</strong> (the named product)</p>${[['#bd506d','Dark pink/red → presumptive E. coli'],['#589fa1','Turquoise blue → Enterococcus'],['#987241','Brown halo → Proteus group'],['#557b95','Metallic blue → Klebsiella / Enterobacter / Serratia group']].map(([colour,label])=>`<div class="palette-row"><span class="swatch" style="background:${colour}"></span>${label}</div>`).join('')}<p>Species identification, clinical significance and susceptibility are separate conclusions.</p>${sourceLinks(['chromc','chromu'])}</section>
      <section class="guide-card"><h2>A count has a volume.</h2><p>Use the actual validated inoculum, not a visual guess.</p><div class="formula">CFU/mL = colonies ÷ inoculum (mL)</div><p>For a 1 µL loop: 120 colonies ÷ 0.001 mL = 120,000 CFU/mL. Symptoms, predominance, pyuria, collection method and prior antibiotics affect interpretation.</p></section>
      <section class="guide-card"><h2>The reference shelf.</h2><p>Reference links checked 11 October 2026. UK SMI S 6 replaces withdrawn B 28; S 12 replaces withdrawn B 37. An issue date can reflect an administrative update rather than a new scientific review. Follow the current document and your local validated SOP.</p>${sourceLinks(Object.keys(sources))}</section>
    </div></div>`;
  }
  function render(focus=false) {
    const names={bench:['Diagnostic microbiology practice','Read the culture.','Choose a bench. Practise the pathway, read the results and explain your interpretation.'],interview:['Interview preparation','Talk through the case.','Rehearse your reasoning aloud, then compare it with a model answer.'],library:['Your practice collection','Pick a specimen.',cases.length+' fictional cases. Open any case or filter to a bench.'],guide:['Bench reference notes','Context before colour.','A quick reference for media, specimen sites and interpretation.'],progress:['Your practice notebook','Keep sharpening.','Revisit the steps you missed and watch your bench reasoning improve.']};
    const n=names[state.view],s=stats();
    document.getElementById('app').innerHTML=`<div class="layout"><aside class="sidebar"><div><div class="brand">${logo}<span>DiagnosticMicro</span></div><div class="brand-sub">Diagnostic practice</div></div>${navigation()}<div class="sidebar-note"><div class="mini-plate">✦</div><strong>Practise the reasoning.</strong>Realistic fictional cases for your diagnostic bench.<br><br>${cases.length} scenarios · ${cases.length*3} decisions<br>${cases.length} interview questions</div></aside><div class="content"><header class="topbar"><div class="crumb"><span>DiagnosticMicro</span><span>/</span><span>${state.view==='bench'?'Workbench':state.view==='interview'?'Interview':state.view==='library'?'Case library':state.view==='guide'?'Field guide':'Progress'}</span></div><div class="mobile-brand">${logo}DiagnosticMicro</div><a class="atlas-link" href="/atlas/">Flowchart Atlas ↗</a><span class="private">${icon('lock')}Private practice</span></header><main id="main"><div class="intro"><div><div class="eyebrow">${n[0]}</div><h1 tabindex="-1" id="page-title">${n[1]}</h1><p>${n[2]}</p></div>${state.view==='bench'?`<div class="session-stat"><strong>${s.mastered}<span class="small"> / ${cases.length}</span></strong>Cases with all steps correct</div>`:''}</div>${!storageOK?'<div class="storage-note" role="status">Browser storage is unavailable. Practice works, but progress will last only for this visit.</div>':''}${state.view==='bench'?bench():state.view==='interview'?interview():state.view==='library'?library():state.view==='progress'?progressView():guide()}</main><footer class="footer-note"><span>Fictional training cases · Follow your local SOP for patient specimens.<br>Progress stays in this browser · No patient data is collected.</span><a href="#" data-action="view" data-view="guide">Guidance & sources ↗</a></footer></div>${navigation(true)}</div><div class="live" id="announcer" role="status" aria-live="polite"></div>`;
    if(focus) {
      const target=(focus==='step'?document.querySelector('.question'):focus==='case'?document.querySelector('.case-panel'):null)||document.getElementById('page-title');
      target.tabIndex=-1;target.focus({preventScroll:true});
      if(typeof focus==='string' && target.scrollIntoView) target.scrollIntoView({block:'start',behavior:'instant'});
      else window.scrollTo({top:0,behavior:'instant'});
    }
  }
  let toastTimer;
  function toast(message) {
    document.querySelector('.toast')?.remove();
    const el=document.createElement('div');el.className='toast';el.textContent=message;el.setAttribute('role','status');document.body.appendChild(el);
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),2600);
  }
  document.addEventListener('change',e=>{
    const input=e.target.closest('[data-choice]');
    if(!input || state.view!=='bench' || state.stage>=3) return;
    const c=current(),q=c.questions[state.stage],i=Number(input.dataset.choice);
    if(!q.options[i]) return;
    state.answers[state.stage]=q.multi ? (input.checked ? [...new Set([...state.answers[state.stage],i])] : state.answers[state.stage].filter(x=>x!==i)) : [i];
    document.querySelectorAll('[data-choice]').forEach(el=>{const chosen=state.answers[state.stage].includes(Number(el.dataset.choice));el.checked=chosen;el.closest('.choice').classList.toggle('chosen',chosen);});
    const next=document.querySelector('[data-action="continue"]');if(next) next.disabled=!state.answers[state.stage].length;
  });
  document.addEventListener('input',e=>{
    if(e.target.id!=='case-search') return;
    state.search=e.target.value;document.getElementById('case-results').innerHTML=caseCards();
  });
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-action]');if(!el || el.disabled) return;
    e.preventDefault(); const action=el.dataset.action;
    if(action==='view'){state.view=el.dataset.view;state.interviewRevealed=false;render(true);}
    else if(action==='mode'){setMode(el.dataset.mode);if(state.view!=='interview')state.view='bench';render(true);}
    else if(action==='filter'){state.filter=el.dataset.filter;render();}
    else if(action==='open-case'){
      const c=cases.find(x=>x.id===el.dataset.case);if(!c)return;
      setMode(c.group);begin(c.id);state.view='bench';render(true);
    }
    else if(action==='interview-answer'){state.interviewRevealed=!state.interviewRevealed;render();const control=document.querySelector('[data-action="interview-answer"]');control?.focus({preventScroll:true});}
    else if(action==='continue'){
      if(state.stage>=3||!state.answers[state.stage].length)return;
      if(state.stage===2) review();else state.stage++;
      render('step');
    }
    else if(action==='back'){if(state.stage>0&&state.stage<3){state.stage--;state.confirmReveal=false;render('step');}}
    else if(action==='reveal'){state.confirmReveal=true;render();}
    else if(action==='cancel-reveal'){state.confirmReveal=false;render();}
    else if(action==='reveal-confirmed'){review();render('step');}
    else if(action==='next'){nextCase();}
    else if(action==='skip'){nextCase(true);}
    else if(action==='retry'){begin();render('case');}
    else if(action==='shuffle'){state.queue=shuffle(getDeck(state.mode));state.index=0;begin();render(true);toast('Case order shuffled.');}
    else if(action==='reset'){state.confirmReset=true;render();}
    else if(action==='cancel-reset'){state.confirmReset=false;render();}
    else if(action==='reset-confirmed'){progress={};save();state.confirmReset=false;setMode(state.bench);render();toast('Local progress cleared.');}
  });
  setMode('csf');render();
  // Expose deterministic logic for local verification without a browser dependency.
  window.CultureEngine={scoreQuestion,getScore,getDeck,stats};
})();
