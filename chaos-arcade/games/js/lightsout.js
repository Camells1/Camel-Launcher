/* Lights Out */
(function(){
const N = 5;
function press(d, i, count){ const r = Math.floor(i / N), c = i % N; [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < N && cc < N) d.on[rr * N + cc] ^= 1; }); if (count) d.moves++; }
function level(k){
  const d = k.data; d.on = Array(N*N).fill(0); d.moves = 0;
  const presses = Math.min(14, 2 + d.lvl * 2), used = new Set();
  while (used.size < presses) used.add(k.ri(0, N*N - 1));
  used.forEach(i => press(d, i, false));
  if (d.on.every(v => !v)) press(d, 12, false);
  d.par = presses; paint(k);
  k.hud('lv', '💡 LEVEL ' + d.lvl + ' · par ' + d.par);
}
function paint(k){ const d = k.data; d.cells.forEach((el, i) => { el.style.background = d.on[i] ? 'radial-gradient(circle,#fff6a0,#ffcc33 60%,#c88a10)' : '#1a1630'; el.style.boxShadow = d.on[i] ? '0 0 18px #ffcc33, inset 3px 3px 0 rgba(255,255,255,.4)' : 'inset 3px 3px 0 rgba(255,255,255,.08), inset -3px -3px 0 rgba(0,0,0,.4)'; }); }
Kit.def({
  dom:true, winAt:500,
  how:'Tapping a light flips it AND its four neighbours. Turn every light OFF to clear the level. Each level adds more lights. Beat the par for bonus points. 3 minutes on the clock: clear as many levels as you can.',
  init(k){
    const d = k.data; d.lvl = 1;
    k.root.innerHTML = '<div class="kgrid" id="loG" style="grid-template-columns:repeat(5,1fr);width:min(100%,400px)"></div><div class="kmsg" id="loMsg">Turn every light off</div>';
    const g = k.root.querySelector('#loG'); d.cells = [];
    for (let i=0;i<N*N;i++){ const b = document.createElement('button'); b.className = 'kcell'; b.style.aspectRatio = '1'; b.addEventListener('pointerdown', e => { e.preventDefault(); if (!k.running) return; press(d, i, true); paint(k); k.beep(d.on[i] ? 700 : 400, .04); check(k); }); g.appendChild(b); d.cells.push(b); }
    level(k); k.timer(180);
  },
  timeUp(k){ k.over({ lines:['💡 Cleared ' + (k.data.lvl - 1) + ' levels'] }); }
});
function check(k){
  const d = k.data; if (d.on.some(v => v)) return;
  const bonus = Math.max(0, (d.par - d.moves) * 30);
  k.add(100 * d.lvl + bonus, 150, 120, '#55ff55'); k.good(); k.flash('#ffffaa', .2);
  k.root.querySelector('#loMsg').textContent = d.moves <= d.par ? '⭐ Under par! +' + bonus : 'Level cleared!';
  d.cells.forEach(el => k.burstEl(el, ['#ffcc33','#ffffff'], 2));
  d.lvl++; k.addTime(10); setTimeout(() => { if (k.running) level(k); }, 600);
}
})();
