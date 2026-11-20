/* Shared multiple-choice quiz runner used by Trivia Blitz, Capital Cities, Fact or Cap, Number Sequences, Opposites, Missing Letter and Typo Hunter.
   QuizKit(k, { rounds, secs, next:() => ({ q, options:[...], answer, note, big }), done:(stats) => {...} }) */
window.QuizKit = function(k, cfg){
  const d = k.data; d.qi = 0; d.right = 0; d.marks = []; d.busy = false;
  function show(){
    if (d.qi >= cfg.rounds) return cfg.done ? cfg.done(d) : k.over({ lines:[d.marks.join(''), d.right + '/' + cfg.rounds + ' correct'] });
    const q = cfg.next(d.qi); d.q = q; d.t0 = k.t; d.busy = false;
    const opts = q.options.map((o, i) => '<button class="btn" data-i="' + i + '" style="font-size:' + (q.small ? 14 : 16) + 'px;min-height:56px;white-space:normal">' + (i + 1) + '. ' + o + '</button>').join('');
    k.root.innerHTML = '<div class="kmsg">' + (cfg.label || 'Question') + ' ' + (d.qi + 1) + ' / ' + cfg.rounds + (cfg.combo !== false && k.combo >= 3 ? ' · 🔥 streak ' + k.combo : '') + '</div>' +
      '<div class="' + (q.big ? 'kbig' : 'dark-panel') + '" style="' + (q.big ? 'font-size:clamp(28px,9vw,48px);letter-spacing:2px' : 'font-size:clamp(16px,4.6vw,20px);line-height:1.45;text-align:center;margin:8px 0') + '">' + q.q + '</div>' +
      '<div style="height:10px;border:3px solid #000;background:#222;width:min(100%,440px);margin:10px auto"><i id="qkBar" style="display:block;height:100%;width:100%;background:#55ffff"></i></div>' +
      '<div class="kgrid" style="grid-template-columns:' + (q.options.length === 2 ? '1fr 1fr' : '1fr 1fr') + ';width:min(100%,460px)">' + opts + '</div><div class="kmsg" id="qkNote"></div>';
    k.root.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => answer(+b.dataset.i)));
  }
  function answer(i){
    if (d.busy || !k.running) return; d.busy = true;
    const q = d.q, ok = i === q.answer, secs = k.t - d.t0, btns = k.root.querySelectorAll('[data-i]');
    if (btns[q.answer]) btns[q.answer].classList.add('green');
    if (ok){ d.right++; const pts = Math.max(20, Math.round(100 - secs * (60 / cfg.secs))); k.hit(pts, 200, 60); k.beep(800 + k.combo * 40, .06); d.marks.push(secs < cfg.secs / 3 ? '🟩' : '🟨'); if (btns[i]) k.burstEl(btns[i], ['#55ff55','#ffffff'], 8); }
    else { k.miss(); k.bad(); k.shake(4); d.marks.push(i < 0 ? '⏱️' : '🟥'); if (btns[i]) btns[i].classList.add('red'); }
    const note = k.root.querySelector('#qkNote'); if (note && q.note) note.innerHTML = (ok ? '✅ ' : '❌ ') + q.note;
    d.qi++; setTimeout(() => { if (k.running) show(); }, q.note ? 1700 : 850);
  }
  d.quizTick = () => { if (d.busy || !d.q) return; const left = 1 - (k.t - d.t0) / cfg.secs, bar = document.getElementById('qkBar'); if (bar){ bar.style.width = Math.max(0, left * 100) + '%'; bar.style.background = left < .3 ? '#ff5555' : '#55ffff'; } if (left <= 0) answer(-1); };
  d.quizKey = (key) => { const n = parseInt(key, 10); if (n >= 1 && n <= d.q.options.length) answer(n - 1); };
  show();
};
function quizDef(extra){ return Object.assign({ dom:true, update(dt, k){ if (k.data.quizTick) k.data.quizTick(); }, key(key, k){ if (k.data.quizKey) k.data.quizKey(key); } }, extra); }
window.quizDef = quizDef;
