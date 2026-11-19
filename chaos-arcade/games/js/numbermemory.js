/* Number Memory */
(function(){
function show(k){
  const d = k.data; d.num = ''; for (let i=0;i<d.len;i++) d.num += (i === 0 ? k.ri(1, 9) : k.ri(0, 9));
  const ms = 1200 + d.len * 550;
  k.root.innerHTML = '<div class="kmsg">Level ' + (d.len - 2) + ' · memorize this number</div><div class="kbig" style="font-size:clamp(30px,' + Math.max(6, 14 - d.len * .5) + 'vw,64px);letter-spacing:4px;color:#55ffff;word-break:break-all">' + d.num + '</div><div style="height:10px;border:3px solid #000;background:#222;width:min(100%,400px);margin:10px auto"><i id="nmBar" style="display:block;height:100%;width:100%;background:#55ffff;transition:width ' + ms + 'ms linear"></i></div>';
  requestAnimationFrame(() => requestAnimationFrame(() => { const b = k.root.querySelector('#nmBar'); if (b) b.style.width = '0%'; }));
  k.beep(500, .05);
  d.t = setTimeout(() => ask(k), ms);
}
function ask(k){
  if (!k.running) return;
  const d = k.data; d.input = '';
  k.root.innerHTML = '<div class="kmsg">What was the number?</div><div class="kbig" id="nmIn" style="color:#ffff55;min-height:1.3em;letter-spacing:4px;word-break:break-all">_</div>' +
    '<div class="kgrid" style="grid-template-columns:repeat(3,1fr);width:min(100%,330px)">' + [1,2,3,4,5,6,7,8,9,'⌫',0,'✔'].map(x => '<button class="kcell" data-x="' + x + '" style="height:58px;font-size:24px' + (x === '✔' ? ';background:#2f8f2a' : '') + '">' + x + '</button>').join('') + '</div>';
  k.root.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => type(k, b.dataset.x)));
}
function type(k, x){
  const d = k.data, el = k.root.querySelector('#nmIn'); if (!el || !k.running) return;
  if (x === '⌫') d.input = d.input.slice(0, -1);
  else if (x === '✔') return check(k);
  else if (d.input.length < 30){ d.input += x; k.beep(400 + +x * 40, .03); }
  el.textContent = d.input || '_';
}
function check(k){
  const d = k.data;
  if (d.input === d.num){ k.add(d.len * 20, 200, 60); k.good(); k.flash('#55ff55', .15); d.len++; k.hud('lv', '🧠 ' + (d.len - 1) + ' digits'); show(k); }
  else { d.lives--; k.lives(d.lives, 2); k.bad(); k.shake(8);
    k.root.innerHTML = '<div class="kmsg">Number was</div><div class="kbig" style="color:#55ff55;word-break:break-all">' + d.num + '</div><div class="kmsg">You typed</div><div class="kbig" style="color:#ff5555;word-break:break-all">' + (d.input || '—') + '</div>';
    setTimeout(() => { if (!k.running) return; if (d.lives <= 0) k.over({ lines:['🧠 Remembered ' + (d.len - 1) + ' digits'] }); else show(k); }, 1800);
  }
}
Kit.def({
  dom:true, winAt:300,
  how:'A number flashes on screen. Memorize it, then type it back. Every success adds one more digit. You get 2 lives. Most people top out around 7–9 digits. Can you beat that?',
  init(k){ const d = k.data; d.len = 3; d.lives = 2; k.lives(2, 2); k.hud('lv', '🧠 2 digits'); show(k); },
  key(key, k){ if (/^[0-9]$/.test(key)) type(k, key); else if (key === 'Backspace') type(k, '⌫'); else if (key === 'Enter') type(k, '✔'); }
});
})();
