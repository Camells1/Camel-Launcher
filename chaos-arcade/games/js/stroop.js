/* Color Chaos */
(function(){
const C = [['RED','#ff3a3a'],['BLUE','#3a8aff'],['GREEN','#3ad03a'],['YELLOW','#ffe033'],['PURPLE','#c050ff'],['ORANGE','#ff9a1a']];
function next(k){
  const d = k.data, n = Math.min(6, 4 + Math.floor(d.n / 10));
  const pool = C.slice(0, n), word = k.pick(pool); let ink = k.pick(pool);
  if (Math.random() < .75) while (ink === word) ink = k.pick(pool);
  d.ink = ink; d.mode = d.n >= 15 && Math.random() < .3 ? 'word' : 'ink';
  k.root.innerHTML = '<div class="kmsg" style="font-size:15px;color:' + (d.mode === 'word' ? '#ff55ff' : '#55ffff') + '">' + (d.mode === 'word' ? '⚠️ Tap what the word SAYS' : 'Tap the COLOR of the ink') + '</div>' +
    '<div class="kbig" style="font-size:clamp(46px,15vw,80px);color:' + ink[1] + ';transform:rotate(' + k.rand(-6, 6) + 'deg)">' + word[0] + '</div>' +
    '<div class="kgrid" style="grid-template-columns:repeat(' + (n > 4 ? 3 : 2) + ',1fr);width:min(100%,420px)">' + k.shuffle(pool).map(c => '<button class="kcell" data-c="' + c[0] + '" style="height:66px;font-size:15px;background:' + c[1] + ';color:#fff">' + c[0] + '</button>').join('') + '</div>';
  d.word = word;
  k.root.querySelectorAll('[data-c]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); pick(k, b.dataset.c, b); }));
}
function pick(k, name, el){
  const d = k.data; if (!k.running) return;
  const right = (d.mode === 'word' ? d.word[0] : d.ink[0]) === name;
  if (right){ d.n++; k.hit(10, 200, 60); k.beep(600 + k.combo * 30, .05); k.burstEl(el, ['#ffffff', '#55ff55'], 6); }
  else { k.miss(); k.bad(); k.addTime(-2); k.shake(6); k.flash('#ff0000', .1); }
  next(k);
}
Kit.def({
  dom:true, winAt:200,
  how:'A color word appears in a different ink color. Tap the INK color, not the word. Your brain will fight you. After 15 correct, some rounds flip the rule (read the instruction!). Wrong answers cost 2 seconds. 45 seconds.',
  init(k){ k.data.n = 0; next(k); k.timer(45); },
  timeUp(k){ k.over({ lines:['🎨 ' + k.data.n + ' correct'] }); }
});
})();
