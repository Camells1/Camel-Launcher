/* Type Racer */
(function(){
const WORDS = 'the quick brown fox jumps over lazy dog pizza rocket banana arcade chaos pixel combo laser dragon castle wizard ninja turbo neon galaxy planet comet thunder storm ocean jungle tiger monkey zebra koala panda burger taco waffle donut cookie candy music guitar piano drum dance party friend happy funny crazy super mega ultra power speed jump run fly swim climb score level boss coin gem star moon sun cloud rain snow fire ice wind stone gold silver iron magic potion sword shield arrow bow knight queen king prince robot alien ghost zombie vampire pirate treasure island map compass rocket engine wheel bike skate board wave surf beach sand shell crab fish whale shark dolphin'.split(' ');
function render(k){
  const d = k.data, cur = d.words[d.i] || '';
  const typed = d.typed, ok = cur.startsWith(typed);
  let line = '';
  for (let j=d.i; j<Math.min(d.words.length, d.i + 6); j++){
    if (j === d.i){ line += '<span style="background:#2a2a5a;padding:2px 4px">' + [...cur].map((c, x) => '<span style="color:' + (x < typed.length ? (typed[x] === c ? '#55ff55' : '#ff5555') : '#fff') + ';' + (x === typed.length ? 'border-bottom:3px solid #ffff55' : '') + '">' + c + '</span>').join('') + '</span> ';
    } else line += '<span style="color:#888">' + d.words[j] + '</span> ';
  }
  d.view.innerHTML = line;
  d.input.style.borderColor = ok ? '#55ffff' : '#ff5555';
  const mins = Math.max(k.t, 1) / 60;
  k.hud('wpm', '⌨️ ' + Math.round(d.chars / 5 / mins) + ' WPM');
}
Kit.def({
  dom:true, typing:true, winAt:150,
  how:'Type each word and press SPACE (or Enter) to lock it in. Correct words score points based on length, and streaks build a combo. Wrong words break your streak. 45 seconds. Your WPM shows live.',
  init(k){
    const d = k.data; d.words = k.shuffle(WORDS).concat(k.shuffle(WORDS)); d.i = 0; d.typed = ''; d.chars = 0; d.right = 0; d.wrong = 0;
    k.root.innerHTML = '<div id="tyView" style="font-size:clamp(20px,6vw,28px);line-height:1.8;min-height:110px;padding:14px;background:rgba(0,0,0,.5);border:3px solid #000;margin-bottom:10px"></div><input id="tyIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" style="width:100%;padding:14px;font-size:22px;font-weight:700;border:4px solid #55ffff;background:#fff;color:#000" placeholder="start typing…"><div class="kmsg">Space = next word</div>';
    d.view = k.root.querySelector('#tyView'); d.input = k.root.querySelector('#tyIn');
    d.input.addEventListener('input', () => {
      const v = d.input.value;
      if (/\s$/.test(v)){ commit(k, v.trim()); d.input.value = ''; d.typed = ''; }
      else { d.typed = v.trim().toLowerCase(); k.beep(800 + Math.random() * 200, .01, 'square', .02); }
      render(k);
    });
    d.input.addEventListener('keydown', e => { if (e.key === 'Enter'){ commit(k, d.input.value.trim()); d.input.value = ''; d.typed = ''; render(k); } });
    setTimeout(() => d.input.focus(), 50);
    render(k); k.timer(45);
  },
  timeUp(k){ const d = k.data; k.over({ score:k.score, label:Math.round(d.chars / 5 / .75) + ' WPM', lines:['⌨️ ' + Math.round(d.chars / 5 / .75) + ' WPM · ' + d.right + ' right, ' + d.wrong + ' wrong'] }); }
});
function commit(k, w){
  const d = k.data; if (!w || !k.running) return;
  const cur = d.words[d.i];
  if (w.toLowerCase() === cur){ d.right++; d.chars += cur.length + 1; k.hit(cur.length * 2, 200, 40); k.beep(900, .03); }
  else { d.wrong++; k.miss(); k.bad(); k.shake(4); }
  d.i++;
}
})();
