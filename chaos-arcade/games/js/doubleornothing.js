/* Double or Nothing */
(function(){
function render(k, flip){
  const d = k.data;
  k.root.innerHTML = '<div class="kmsg">Lives ' + '❤️'.repeat(d.lives) + '🖤'.repeat(3 - d.lives) + ' · bank <b style="color:#ffff55">' + d.bank + '</b></div>' +
    '<div style="display:flex;justify-content:center;margin:10px 0"><div id="dnC" style="width:clamp(110px,34vw,160px);aspect-ratio:1;border-radius:50%;border:6px solid #8a6a10;background:radial-gradient(circle at 35% 35%,#fff6a0,#e8b820 60%,#a87a10);display:flex;align-items:center;justify-content:center;font-size:clamp(46px,15vw,70px);box-shadow:0 8px 0 rgba(0,0,0,.4);' + (flip ? 'animation:dnflip .9s steps(9);' : '') + '">' + (d.face || '🪙') + '</div></div>' +
    '<style>@keyframes dnflip{0%{transform:rotateX(0) translateY(0)}50%{transform:rotateX(900deg) translateY(-60px)}100%{transform:rotateX(1800deg) translateY(0)}}</style>' +
    '<div class="kbig" style="font-size:clamp(22px,7vw,34px)">POT: <span style="color:#55ff55">' + d.pot + '</span></div><div class="kmsg">' + (d.msg || 'Call it!') + ' · streak ' + d.streak + '</div>' +
    '<div class="kgrid" style="grid-template-columns:1fr 1fr;width:min(100%,400px)"><button class="btn gold big" id="dnH"' + (d.busy ? ' disabled' : '') + '>👑 HEADS</button><button class="btn purple big" id="dnT"' + (d.busy ? ' disabled' : '') + '>🦅 TAILS</button></div>' +
    '<button class="btn green block" id="dnW" style="margin-top:8px"' + (d.busy || d.streak === 0 ? ' disabled' : '') + '>🏦 WALK AWAY WITH ' + d.pot + '</button>';
  k.root.querySelector('#dnH').addEventListener('click', () => call(k, 'H'));
  k.root.querySelector('#dnT').addEventListener('click', () => call(k, 'T'));
  k.root.querySelector('#dnW').addEventListener('click', () => walk(k));
}
function call(k, c){
  const d = k.data; if (d.busy || !k.running) return; d.busy = true; d.face = '🪙'; render(k, true);
  for (let i=0;i<9;i++) k.sfx.tone(800 + i * 40, .03, 'square', .03, i * .1);
  setTimeout(() => {
    const r = Math.random() < .5 ? 'H' : 'T'; d.face = r === 'H' ? '👑' : '🦅'; d.busy = false;
    if (r === c){ d.streak++; d.pot *= 2; d.msg = '✅ ' + (r === 'H' ? 'Heads' : 'Tails') + '! Pot doubled'; k.good(); k.flash('#55ff55', .12); if (d.streak >= 5) k.pop(200, 60, d.streak + ' IN A ROW!', '#ff55ff'); d.flips.push('🟩'); }
    else { d.lives--; d.msg = '💀 ' + (r === 'H' ? 'Heads' : 'Tails') + '. Pot lost'; d.pot = 10; d.streak = 0; k.bad(); k.shake(6); d.flips.push('🟥'); if (d.lives <= 0){ render(k); return setTimeout(end, 900, k); } }
    render(k);
  }, 950);
}
function walk(k){ const d = k.data; if (d.busy || !d.streak) return; d.bank += d.pot; k.set(d.bank); d.msg = '🏦 Banked ' + d.pot; d.pot = 10; d.streak = 0; k.coin(); d.flips.push('🏦'); render(k); }
function end(k){ const d = k.data; k.over({ score:d.bank, win:d.bank >= 100, title:d.bank >= 100 ? '🪙 RISK PAID OFF' : '🪦 GREED GOT YOU', lines:[d.flips.slice(-20).join(''), 'Banked ' + d.bank + ' coins'] }); }
Kit.def({
  dom:true, noBestBar:true, winAt:100, scoreText:(s) => s + '🪙',
  how:'The pot starts at 10. Call heads or tails: guess right and the pot DOUBLES. Walk away any time to bank the pot, or keep flipping for more. Guess wrong and you lose the pot and a life. 3 lives. Your score is everything you banked. It is a true 50/50 coin.',
  init(k){ const d = k.data; d.bank = 0; d.pot = 10; d.lives = 3; d.streak = 0; d.flips = []; d.msg = ''; k.set(0); render(k); },
  key(key, k){ if (key === 'h' || key === '1') call(k, 'H'); if (key === 't' || key === '2') call(k, 'T'); if (key === 'w' || key === 'Enter') walk(k); }
});
})();
