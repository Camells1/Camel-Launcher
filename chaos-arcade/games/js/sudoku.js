/* Sudoku Sprint */
(function(){
function ok(g, i, v){ const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3; for (let j=0;j<9;j++){ if (g[r*9 + j] === v || g[j*9 + c] === v) return false; } for (let y=0;y<3;y++) for (let x=0;x<3;x++) if (g[(br + y)*9 + bc + x] === v) return false; return true; }
function fill(g){ const i = g.indexOf(0); if (i < 0) return true; const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - .5); for (const v of nums){ if (ok(g, i, v)){ g[i] = v; if (fill(g)) return true; g[i] = 0; } } return false; }
function count(g, lim){ const i = g.indexOf(0); if (i < 0) return 1; let n = 0; for (let v=1;v<=9 && n < lim;v++){ if (ok(g, i, v)){ g[i] = v; n += count(g, lim - n); g[i] = 0; } } return n; }
function make(holes){
  const sol = Array(81).fill(0); fill(sol);
  const puz = sol.slice(); let removed = 0;
  for (const i of [...Array(81).keys()].sort(() => Math.random() - .5)){ if (removed >= holes) break; const v = puz[i]; puz[i] = 0; if (count(puz.slice(), 2) !== 1) puz[i] = v; else removed++; }
  return { sol, puz };
}
function render(k){
  const d = k.data;
  let h = '<div style="display:grid;grid-template-columns:repeat(9,1fr);width:min(100%,430px);margin:0 auto;border:3px solid #000;background:#000;gap:1px">';
  d.g.forEach((v, i) => {
    const r = Math.floor(i / 9), c = i % 9, given = d.puz[i] !== 0, sel = i === d.sel, same = d.sel >= 0 && v && v === d.g[d.sel];
    const peer = d.sel >= 0 && (Math.floor(d.sel / 9) === r || d.sel % 9 === c);
    const bg = sel ? '#5a3ad0' : same ? '#3a5a2a' : peer ? '#2a2650' : ((Math.floor(r / 3) + Math.floor(c / 3)) % 2 ? '#1c1a30' : '#24213c');
    h += '<button data-i="' + i + '" style="aspect-ratio:1;border:0;font:inherit;font-weight:700;font-size:clamp(14px,4.6vw,22px);background:' + bg + ';color:' + (given ? '#fff' : d.bad[i] ? '#ff5555' : '#55ffff') + ';' + (c % 3 === 2 && c < 8 ? 'margin-right:2px;' : '') + (r % 3 === 2 && r < 8 ? 'margin-bottom:2px;' : '') + 'cursor:pointer;padding:0">' + (v || '') + '</button>';
  });
  h += '</div><div class="krow" style="display:grid;grid-template-columns:repeat(5,1fr);width:min(100%,430px);margin:10px auto 0">' + [1,2,3,4,5,6,7,8,9].map(n => '<button class="kcell" data-n="' + n + '" style="height:46px;font-size:20px">' + n + '<small style="font-size:9px;opacity:.6;margin-left:2px">' + (9 - d.g.filter(x => x === n).length) + '</small></button>').join('') + '<button class="kcell" data-n="0" style="height:46px;font-size:18px">⌫</button></div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { d.sel = +b.dataset.i; k.beep(500, .02); render(k); }));
  k.root.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => put(k, +b.dataset.n)));
}
function put(k, n){
  const d = k.data, i = d.sel; if (!k.running || i < 0 || d.puz[i]) return;
  if (!n){ d.g[i] = 0; d.bad[i] = false; render(k); return; }
  d.g[i] = n;
  if (d.sol[i] !== n){ d.bad[i] = true; d.mistakes++; k.bad(); k.shake(5); k.hud('mx', '❌ ' + d.mistakes + '/3'); render(k); if (d.mistakes >= 3) return k.over({ score:Math.max(0, d.filled * 10), win:false, title:'❌ THREE STRIKES', lines:['9️⃣ Filled ' + d.filled + ' cells correctly'] }); return; }
  d.bad[i] = false; d.filled++; k.add(10); k.beep(700 + n * 40, .04);
  render(k);
  const r = Math.floor(i / 9), c = i % 9, box = (a) => Math.floor(Math.floor(a / 9) / 3) * 3 + Math.floor((a % 9) / 3);
  const doneRow = [...Array(9).keys()].every(x => d.g[r*9 + x] === d.sol[r*9 + x]), doneCol = [...Array(9).keys()].every(y => d.g[y*9 + c] === d.sol[y*9 + c]);
  const doneBox = d.g.every((v, j) => box(j) !== box(i) || v === d.sol[j]);
  [doneRow, doneCol, doneBox].forEach(x => { if (x){ k.add(50); k.pop(200, 60, 'LINE DONE +50', '#55ff55'); k.beep(1000, .08, 'triangle', .1); } });
  if (d.g.every((v, j) => v === d.sol[j])){ const secs = Math.round(k.t); k.good(); k.flash('#55ff55', .2); k.over({ score:k.score + Math.max(0, 3000 - secs * 3) - d.mistakes * 300, title:'🧠 SOLVED!', lines:['9️⃣ ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's · ' + d.mistakes + ' mistakes'] }); }
}
Kit.def({
  dom:true, winAt:1000,
  how:'Fill the grid so every row, column and 3×3 box has 1–9 exactly once. Tap a cell, then a number (or type 1–9; ⌫ / Backspace clears). Wrong numbers turn red and count as a mistake: 3 mistakes and you are out. Finished rows, columns and boxes give bonus points. Faster = more points.',
  init(k){ const d = k.data; k.root.innerHTML = '<div class="kmsg">Generating a fresh puzzle…</div>'; const p = make(46); d.sol = p.sol; d.puz = p.puz; d.g = p.puz.slice(); d.bad = Array(81).fill(false); d.sel = d.g.indexOf(0); d.mistakes = 0; d.filled = 0; render(k); k.hud('mx', '❌ 0/3'); },
  update(dt, k){ if (Math.floor(k.t * 2) % 2 === 0) k.hud('tm', '⏱ ' + Math.floor(k.t / 60) + ':' + String(Math.floor(k.t % 60)).padStart(2, '0')); },
  key(key, k){ const d = k.data, n = parseInt(key, 10); if (n >= 1 && n <= 9) put(k, n); else if (key === 'Backspace' || key === '0') put(k, 0); else { const m = { ArrowUp:-9, ArrowDown:9, ArrowLeft:-1, ArrowRight:1 }[key]; if (m && d.sel + m >= 0 && d.sel + m < 81){ d.sel += m; render(k); } } }
});
})();
