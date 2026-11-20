/* Tile Triple */
(function(){
const EMOJI = ['🍎','🍋','🍇','🍓','🥝','🍑','🌶️','🥕','🍄','🌸','⭐','💎','🔔','🎈','🐟','🍩'];
const TRAY = 7, TS = 52;
function level(k){
  const d = k.data, types = Math.min(EMOJI.length, 6 + d.lvl * 2);
  const pos = [];
  const layers = Math.min(4, 2 + d.lvl);
  for (let L=0; L<layers; L++){ const n = 6 - L; for (let y=0;y<n;y++) for (let x=0;x<n;x++) if (Math.random() < .78 - L * .05) pos.push({ x:(x + L * .5) * TS, y:(y + L * .5) * TS, L }); }
  while (pos.length % 3) pos.shift();
  const deck = k.shuffle(Array.from({ length:pos.length / 3 }, (_, i) => EMOJI[i % types]).flatMap(e => [e, e, e]));
  d.tiles = pos.map((p, i) => ({ ...p, e:deck[i], id:i, gone:false }));
  d.tray = []; d.hist = []; render(k); k.hud('lv', '🀄 level ' + d.lvl + ' · ' + d.tiles.length + ' tiles');
}
function covered(d, t){ return d.tiles.some(o => !o.gone && o.L > t.L && Math.abs(o.x - t.x) < TS && Math.abs(o.y - t.y) < TS); }
function render(k){
  const d = k.data, live = d.tiles.filter(t => !t.gone);
  const W = 6 * TS + 4;
  let h = '<div style="position:relative;width:' + W + 'px;height:' + W + 'px;margin:0 auto;transform-origin:top center;transform:scale(var(--tts,1))" id="ttB">';
  live.sort((a, b) => a.L - b.L).forEach(t => { const cov = covered(d, t); h += '<button data-id="' + t.id + '" style="position:absolute;left:' + t.x + 'px;top:' + t.y + 'px;width:' + (TS - 2) + 'px;height:' + (TS - 2) + 'px;font-size:28px;border:3px solid #000;border-radius:8px;cursor:pointer;padding:0;background:' + (cov ? '#7a7a8a' : '#fff8e0') + ';box-shadow:0 4px 0 #8a6a3a;filter:' + (cov ? 'brightness(.55)' : 'none') + ';z-index:' + (t.L + 1) + '">' + t.e + '</button>'; });
  h += '</div><div style="display:grid;grid-template-columns:repeat(' + TRAY + ',1fr);gap:4px;width:min(100%,420px);margin:12px auto 0;padding:6px;background:#5a3a1a;border:3px solid #000;border-radius:10px">';
  for (let i=0;i<TRAY;i++){ const e = d.tray[i]; h += '<div style="aspect-ratio:1;background:' + (e ? '#fff8e0' : 'rgba(0,0,0,.35)') + ';border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:24px;' + (i >= TRAY - 2 && !e && d.tray.length >= TRAY - 2 ? 'outline:2px solid #ff5555;' : '') + '">' + (e || '') + '</div>'; }
  h += '</div><div class="krow"><button class="btn" id="ttU"' + (d.undo ? '' : ' disabled') + '>↶ UNDO (' + d.undo + ')</button><button class="btn" id="ttS"' + (d.shuf ? '' : ' disabled') + '>🔀 SHUFFLE (' + d.shuf + ')</button></div>';
  k.root.innerHTML = h;
  const sc = Math.min(1, (k.root.clientWidth - 8) / W); k.root.querySelector('#ttB').style.setProperty('--tts', sc); k.root.querySelector('#ttB').style.marginBottom = (W * sc - W) + 'px';
  k.root.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => pick(k, +b.dataset.id, b)));
  k.root.querySelector('#ttU').addEventListener('click', () => { if (d.undo && d.hist.length){ d.undo--; const s = d.hist.pop(); d.tiles[s.id].gone = false; d.tray = s.tray; render(k); } });
  k.root.querySelector('#ttS').addEventListener('click', () => { if (d.shuf){ d.shuf--; const live2 = d.tiles.filter(t => !t.gone), es = k.shuffle(live2.map(t => t.e)); live2.forEach((t, i) => t.e = es[i]); k.beep(600, .1); render(k); } });
}
function pick(k, id, el){
  const d = k.data, t = d.tiles[id]; if (!k.running || t.gone || covered(d, t) || d.tray.length >= TRAY) return;
  d.hist.push({ id, tray:d.tray.slice() });
  t.gone = true;
  const at = d.tray.lastIndexOf(t.e); if (at >= 0) d.tray.splice(at + 1, 0, t.e); else d.tray.push(t.e);
  k.beep(500, .03);
  const n = d.tray.filter(e => e === t.e).length;
  if (n >= 3){ let r = 3; d.tray = d.tray.filter(e => !(e === t.e && r-- > 0)); k.hit(30, 200, 300); k.good(); k.burstEl(el, ['#ffd700','#ffffff','#ff55ff'], 12); d.hist = []; }
  render(k);
  if (d.tiles.every(x => x.gone)){ k.add(300 * d.lvl, 200, 100, '#55ff55'); k.flash('#55ff55', .2); d.lvl++; d.undo = Math.max(d.undo, 1); setTimeout(() => { if (k.running) level(k); }, 800); }
  else if (d.tray.length >= TRAY){ k.boom(); k.shake(10); k.over({ title:'🀄 TRAY FULL!', lines:['Reached level ' + d.lvl] }); }
}
Kit.def({
  dom:true, winAt:800,
  how:'Tap the tiles on top (dark tiles are covered by others) to move them into your tray. Three matching tiles in the tray vanish. If the tray fills up (7 slots), you lose. Clear every tile to reach the next level. You have 2 undos and 1 shuffle.',
  init(k){ const d = k.data; d.lvl = 1; d.undo = 2; d.shuf = 1; level(k); }
});
})();
