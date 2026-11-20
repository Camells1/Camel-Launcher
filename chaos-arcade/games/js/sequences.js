/* Number Sequences */
(function(){
function make(k, lvl){
  const r = (a, b) => k.ri(a, b), kinds = ['add','mul','sq','fib','alt','grow','tri','sub'].slice(0, Math.min(8, 3 + lvl));
  const kind = k.pick(kinds); let s = [], ans, rule;
  if (kind === 'add'){ const a = r(1, 20), d = r(2, 9 + lvl); for (let i=0;i<5;i++) s.push(a + d * i); ans = a + d * 5; rule = '+' + d + ' each time'; }
  else if (kind === 'sub'){ const a = r(60, 120), d = r(3, 12); for (let i=0;i<5;i++) s.push(a - d * i); ans = a - d * 5; rule = '−' + d + ' each time'; }
  else if (kind === 'mul'){ const a = r(1, 4), m = r(2, 3); for (let i=0;i<5;i++) s.push(a * Math.pow(m, i)); ans = a * Math.pow(m, 5); rule = '×' + m + ' each time'; }
  else if (kind === 'sq'){ const o = r(1, 5); for (let i=0;i<5;i++) s.push((i + o) * (i + o)); ans = (5 + o) * (5 + o); rule = 'square numbers'; }
  else if (kind === 'fib'){ let a = r(1, 4), b = r(1, 5); s = [a, b]; for (let i=0;i<3;i++){ s.push(s[s.length - 1] + s[s.length - 2]); } ans = s[4] + s[3]; rule = 'add the previous two'; }
  else if (kind === 'alt'){ const a = r(1, 10), p = r(2, 9), q = r(1, 5); s = [a]; for (let i=1;i<5;i++) s.push(s[i-1] + (i % 2 ? p : -q)); ans = s[4] + p; rule = '+' + p + ', −' + q + ', repeat'; }
  else if (kind === 'grow'){ const a = r(1, 10); s = [a]; for (let i=1;i<5;i++) s.push(s[i-1] + i); ans = s[4] + 5; rule = '+1, +2, +3, +4…'; }
  else { const m = r(1, 3); s = [1, 3, 6, 10, 15].map(x => x * m); ans = 21 * m; rule = m === 1 ? 'triangle numbers (+2, +3, +4…)' : 'triangle numbers × ' + m; }
  const opts = new Set([ans]); while (opts.size < 4){ const o = ans + k.pick([-3,-2,-1,1,2,3,5,-5,10,-10]) * Math.max(1, Math.round(Math.abs(ans) / 40)); if (o !== ans) opts.add(o); }
  const list = k.shuffle([...opts]);
  return { q:s.join(', ') + ', <b style="color:#ffff55">?</b>', options:list, answer:list.indexOf(ans), note:'Rule: ' + rule, big:true };
}
function load(cb){ if (window.QuizKit) return cb(); const s = document.createElement('script'); s.src = 'js/quizkit.js'; s.onload = cb; document.head.appendChild(s); }
load(() => Kit.def(quizDef({
  winAt:600,
  how:'Find the pattern and pick the number that comes next. Patterns include adding, multiplying, squares, "add the previous two" and alternating steps. 12 sequences, 15 seconds each, and they get trickier as you go.',
  init(k){ QuizKit(k, { rounds:12, secs:15, label:'Sequence', next:(i) => make(k, Math.floor(i / 3)) }); }
})));
})();
