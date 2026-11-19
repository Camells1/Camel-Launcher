/* Emoji Riddles */
(function(){
const R = [
  ['🦁👑','The Lion King','movie'],['⭐⚔️🌌','Star Wars','movie'],['🕷️🧑','Spider-Man','movie'],['❄️👸⛄','Frozen','movie'],['🦈🌊😱','Jaws','movie'],
  ['🚢🧊💔','Titanic','movie'],['🐠🔍','Finding Nemo','movie'],['🦖🏝️','Jurassic Park','movie'],['🤠🧸🚀','Toy Story','movie'],['🏠🎈👴','Up','movie'],
  ['🐀👨‍🍳','Ratatouille','movie'],['🦇🧑🌃','Batman','movie'],['👽📞🏠','E.T.','movie'],['🧙‍♂️⚡👓','Harry Potter','movie'],['🐼🥋','Kung Fu Panda','movie'],
  ['🕰️🔙🚗','Back to the Future','movie'],['👻🚫','Ghostbusters','movie'],['🍫🏭🎫','Charlie and the Chocolate Factory','movie'],['💍🌋🧙','The Lord of the Rings','movie'],['🏴‍☠️🚢💀','Pirates of the Caribbean','movie'],
  ['🐘🛋️','Elephant in the room','saying'],['⏰💰','Time is money','saying'],['🌧️🐱🐶','Raining cats and dogs','saying'],['🐦🐦🪨','Two birds, one stone','saying'],['🍰👌','Piece of cake','saying'],
  ['🧠⛈️','Brainstorm','thing'],['🌍🔥','Global warming','thing'],['☕⏰','Coffee break','thing'],['🍿🎬','Movie night','thing'],['🎂🎉','Birthday party','thing'],
  ['👶🦈','Baby Shark','song'],['💜🌧️','Purple Rain','song'],['🚀👨','Rocket Man','song'],['🌞🌻','Walking on Sunshine','song'],['🕺🪩','Dancing Queen','song'],
  ['🍎📱','Apple','brand'],['🐦💙','Twitter','brand'],['👟✔️','Nike','brand'],['🍔🤡','McDonald\'s','brand'],['☕🧜‍♀️','Starbucks','brand']
];
function next(k){
  const d = k.data; if (d.i >= d.order.length) return finish(k);
  const r = d.order[d.i], same = R.filter(x => x[2] === r[2] && x !== r), others = k.shuffle(same.length >= 3 ? same : R.filter(x => x !== r)).slice(0, 3);
  d.cur = r; d.opts = k.shuffle([r].concat(others)); d.t0 = k.t; d.busy = false;
  k.root.innerHTML = '<div class="kmsg">Riddle ' + (d.i + 1) + ' / ' + d.order.length + ' · it\'s a <b style="color:#ffaa00">' + r[2] + '</b></div><div class="kbig" style="font-size:clamp(48px,16vw,84px);letter-spacing:6px;animation:pop .3s steps(3)">' + r[0] + '</div>' +
    '<div style="height:10px;border:3px solid #000;background:#222;width:min(100%,420px);margin:6px auto 12px"><i id="erBar" style="display:block;height:100%;width:100%;background:#55ffff"></i></div>' +
    '<div class="kgrid" style="grid-template-columns:1fr;width:min(100%,420px)">' + d.opts.map((o, i) => '<button class="btn" data-i="' + i + '" style="font-size:15px">' + (i + 1) + '. ' + o[1] + '</button>').join('') + '</div>';
  k.root.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => answer(k, +b.dataset.i, b)));
}
function answer(k, i, el){
  const d = k.data; if (!k.running || d.busy) return; d.busy = true;
  const right = d.opts[i] === d.cur, secs = k.t - d.t0;
  const btns = k.root.querySelectorAll('[data-i]'); btns[d.opts.indexOf(d.cur)].classList.add('green');
  if (right){ const pts = Math.max(20, Math.round(100 - secs * 7)); k.hit(pts, 200, 60); k.good(); d.marks.push(secs < 4 ? '🟩' : '🟨'); if (el) k.burstEl(el, ['#55ff55','#ffffff'], 10); }
  else { k.miss(); k.bad(); k.shake(5); d.marks.push(i < 0 ? '⏱️' : '🟥'); if (el) el.classList.add('red'); }
  d.i++; setTimeout(() => { if (k.running) next(k); }, 900);
}
function finish(k){ const d = k.data; k.over({ lines:[d.marks.join(''), (d.marks.filter(m => m === '🟩' || m === '🟨').length) + '/' + d.order.length + ' riddles solved'] }); }
Kit.def({
  dom:true, winAt:600,
  share:(s, k) => [k.data.marks.join('')],
  how:'Each riddle is a few emoji that describe a movie, song, saying, brand or thing. Pick the right answer before the bar runs out (15 seconds). Faster answers score more. 12 riddles per game.',
  init(k){ const d = k.data; d.order = k.shuffle(R).slice(0, 12); d.i = 0; d.marks = []; next(k); },
  update(dt, k){ const d = k.data; if (d.busy || !d.cur) return; const left = 1 - (k.t - d.t0) / 15; const bar = document.getElementById('erBar'); if (bar) bar.style.width = Math.max(0, left * 100) + '%'; if (left <= 0) answer(k, -1, null); },
  key(key, k){ const n = parseInt(key, 10); if (n >= 1 && n <= 4){ const b = k.root.querySelectorAll('[data-i]')[n - 1]; answer(k, n - 1, b); } }
});
})();
