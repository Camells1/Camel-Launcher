/* Word Search */
(function(){
const THEMES = {
  ANIMALS:['TIGER','ZEBRA','PANDA','KOALA','SHARK','EAGLE','MOOSE','OTTER','CAMEL','LLAMA','HORSE','SNAKE','WHALE','RHINO','BISON'],
  FOOD:['PIZZA','PASTA','BREAD','APPLE','MANGO','TACO','SUSHI','HONEY','LEMON','GRAPE','DONUT','CANDY','SALAD','STEAK','CHIPS'],
  SPACE:['COMET','ORBIT','EARTH','VENUS','PLUTO','ALIEN','SOLAR','LUNAR','STARS','MOON','MARS','NOVA','ROVER','PROBE','GALAXY'],
  SPORTS:['GOAL','TENNIS','RUGBY','GOLF','HOCKEY','BOXING','SKATE','SURF','DIVE','SKI','JUDO','KARATE','RACE','SPRINT','POLO'],
  GAMES:['ARCADE','PIXEL','COMBO','LEVEL','SCORE','BOSS','COIN','QUEST','SPEED','JUMP','POWER','RETRO','GAMER','LIVES','PAUSE']
};
const N = 10, DIRS = [[1,0],[0,1],[1,1],[-1,1],[-1,0],[0,-1],[-1,-1],[1,-1]];
function build(k){
  const d = k.data, theme = k.pick(Object.keys(THEMES)), dirs = DIRS.slice(0, d.lvl > 1 ? 8 : 4);
  d.theme = theme; d.g = Array(N*N).fill(''); d.words = [];
  for (const w of k.shuffle(THEMES[theme])){
    if (d.words.length >= 8) break;
    for (let t=0; t<80; t++){
      const [dx, dy] = k.pick(dirs), x = k.ri(0, N - 1), y = k.ri(0, N - 1), ex = x + dx * (w.length - 1), ey = y + dy * (w.length - 1);
      if (ex < 0 || ey < 0 || ex >= N || ey >= N) continue;
      let ok = true; for (let i=0;i<w.length;i++){ const c = d.g[(y + dy*i)*N + x + dx*i]; if (c && c !== w[i]){ ok = false; break; } }
      if (!ok) continue;
      const cells = []; for (let i=0;i<w.length;i++){ const j = (y + dy*i)*N + x + dx*i; d.g[j] = w[i]; cells.push(j); }
      d.words.push({ w, cells, found:false }); break;
    }
  }
  for (let i=0;i<N*N;i++) if (!d.g[i]) d.g[i] = String.fromCharCode(65 + k.ri(0, 25));
  d.hit = new Set(); render(k); k.hud('lv', '🔍 ' + theme);
}
function render(k){
  const d = k.data;
  let h = '<div class="kmsg">Theme: <b style="color:#ffaa00">' + d.theme + '</b> · drag across a word</div><div id="wsG" style="display:grid;grid-template-columns:repeat(' + N + ',1fr);gap:2px;width:min(100%,420px);margin:0 auto;touch-action:none;user-select:none">';
  d.g.forEach((c, i) => { h += '<div data-i="' + i + '" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:clamp(14px,4.5vw,20px);background:' + (d.hit.has(i) ? '#2f6a8a' : '#1d1838') + ';border:2px solid #000;cursor:pointer">' + c + '</div>'; });
  h += '</div><div class="krow" style="font-size:13px;gap:6px">' + d.words.map(w => '<span style="padding:3px 8px;border:2px solid #000;background:' + (w.found ? '#2f8f2a;text-decoration:line-through' : '#333') + '">' + w.w + '</span>').join('') + '</div>';
  k.root.innerHTML = h;
  const G = k.root.querySelector('#wsG'), cellAt = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); const c = el && el.closest('#wsG [data-i]'); return c ? +c.dataset.i : null; };
  G.addEventListener('pointerdown', e => { e.preventDefault(); const i = cellAt(e); if (i != null){ d.sel = { a:i, b:i }; paintSel(k); } });
  G.addEventListener('pointermove', e => { if (!d.sel) return; const i = cellAt(e); if (i != null && i !== d.sel.b){ d.sel.b = i; paintSel(k); } });
  G.addEventListener('pointerup', () => finishSel(k)); G.addEventListener('pointerleave', () => { if (d.sel) finishSel(k); });
}
function line(a, b){
  const ax = a % N, ay = Math.floor(a / N), bx = b % N, by = Math.floor(b / N), dx = Math.sign(bx - ax), dy = Math.sign(by - ay), len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  if (!(ax === bx || ay === by || Math.abs(bx - ax) === Math.abs(by - ay))) return [a];
  const out = []; for (let i=0;i<=len;i++) out.push((ay + dy*i)*N + ax + dx*i); return out;
}
function paintSel(k){ const d = k.data, cells = line(d.sel.a, d.sel.b); k.root.querySelectorAll('#wsG [data-i]').forEach(c => { const i = +c.dataset.i; c.style.background = cells.includes(i) ? '#8a6a10' : d.hit.has(i) ? '#2f6a8a' : '#1d1838'; }); }
function finishSel(k){
  const d = k.data; if (!d.sel) return; const cells = line(d.sel.a, d.sel.b); d.sel = null;
  const word = d.words.find(w => !w.found && (w.cells.join() === cells.join() || w.cells.slice().reverse().join() === cells.join()));
  if (word){ word.found = true; word.cells.forEach(i => d.hit.add(i)); k.hit(word.w.length * 10, 200, 60); k.good(); render(k); k.root.querySelectorAll('#wsG [data-i]').forEach(c => { if (word.cells.includes(+c.dataset.i)) k.burstEl(c, ['#55ffff','#ffffff'], 2); });
    if (d.words.every(w => w.found)){ k.add(200 + Math.round(k.timeLeft || 0) * 3, 200, 30, '#55ff55'); k.flash('#55ff55', .2); k.addTime(30); d.lvl++; setTimeout(() => { if (k.running) build(k); }, 900); } }
  else { if (cells.length > 1){ k.beep(150, .05); } render(k); }
}
Kit.def({
  dom:true, winAt:600,
  how:'Find the 8 hidden words in the letter grid. Drag in a straight line across a word (rows, columns, and from round 2 also diagonals and backwards). Clearing a whole grid gives a time bonus and +30 seconds for the next themed grid.',
  init(k){ k.data.lvl = 1; build(k); k.timer(120); },
  timeUp(k){ const d = k.data; k.over({ lines:['🔍 ' + d.words.filter(w => w.found).length + ' words in the last grid · grid ' + d.lvl] }); }
});
})();
