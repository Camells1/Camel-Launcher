/* =========================================================
   CHAOS ARCADE — shared engine
   XP / rank tracking (localStorage), 8-bit sounds, sharing,
   toasts, pixel-art helpers and the "back to arcade" bar.
   Loaded by index.html and every page in /games/.
   ========================================================= */
(function(){
'use strict';

const KEY = 'chaosArcade_v1';
const inGames = /\/games\/[^/]*$/.test(location.pathname);
const ROOT = inGames ? '../' : '';

/* ---------- Game catalogue (set ready:true when a game file is uploaded) ---------- */
const GAMES = [
  {id:'crafting',  n:1,  file:'game1.html',  t:'Cursed Crafting Quiz',    e:'🛠️', d:'medium', tag:'QUIZ',     ready:true,
   desc:'Real or cursed? Guess what the 3×3 grid crafts before the creeper blows.', bg:['#866043','#6c4b33','#9a7451','#5b3d26'], icon:'table'},
  {id:'mlg',       n:2,  file:'game2.html',  t:'MLG Water Bucket Drop',   e:'🪣', d:'hard',   tag:'REFLEX',   ready:true,
   desc:'Fall from insane heights. Place water at the last possible millisecond.', bg:['#6fa8ff','#5b95f0','#86b9ff','#4a82dd'], icon:'bucket'},
  {id:'sweeper',   n:3,  file:'game3.html',  t:'Creeper Minesweeper',     e:'💥', d:'medium', tag:'PUZZLE',   ready:true,
   desc:'Dig the grass, flag creepers with cats, and do NOT wake the family.', bg:['#5fbf3a','#4fa82f','#76d14e','#3f9a2e'], icon:'creeper'},
  {id:'villager',  n:4,  file:'game4.html',  t:'Villager Scam Simulator', e:'🧑‍🌾', d:'medium', tag:'TRADING', ready:true,
   desc:'Haggle 1 dirt into a Mending book before the villager locks you out.', bg:['#b98a6a','#a87a5a','#c99a7a','#8a6a4a'], icon:'villager'},
  {id:'obsidian',  n:5,  file:'game5.html',  t:'Obsidian Speed-Mine',     e:'⛏️', d:'easy',   tag:'CLICKER',  ready:true,
   desc:'Tap-frenzy through obsidian with escalating, increasingly cursed tools.', bg:['#140f1f','#241a36','#1a1426','#3b2a57'], icon:'obsidian'},
  {id:'wordle',    n:6,  file:'game6.html',  t:'Block Wordle',            e:'🔤', d:'medium', tag:'WORDS',    ready:true,
   desc:'Guess the 5-letter block, mob or item in 6 tries.', bg:['#7a7a7a','#6a6a6a','#8a8a8a','#5a5a5a'], icon:'wordle'},
  {id:'nether2048',n:7,  file:'game7.html',  t:'2048: Nether Edition',    e:'🔥', d:'medium', tag:'MERGE',    ready:true,
   desc:'Merge Netherrack all the way up to a Netherite Ingot.', bg:['#5a1f1f','#6b2a2a','#4a1818','#7d3535'], icon:'netherite'},
  {id:'redstone',  n:8,  file:'game8.html',  t:'Redstone Memory Matrix',  e:'🔴', d:'hard',   tag:'MEMORY',   ready:true,
   desc:'Repeat the glowing lamp sequence. Note blocks included.', bg:['#3a2a20','#2a1d15','#4a3528','#1f150f'], icon:'lamp'},
  {id:'potion',    n:9,  file:'game9.html',  t:'Potion Brewer Roulette',  e:'🧪', d:'chaos',  tag:'LUCK',     ready:true,
   desc:'Brew weird ingredients and survive whatever effect you get.', bg:['#3a1f4a','#2a1438','#4a2a5a','#1f0f2a'], icon:'potion'},
  {id:'runner',    n:10, file:'game10.html', t:'Mob Dodge Runner',        e:'🏃', d:'hard',   tag:'RUNNER',   ready:true,
   desc:'Endless runner: jump creepers, dodge arrows, avoid lava.', bg:['#87c4ff','#76b5f5','#98d0ff','#5fa0e8'], icon:'arrow'}
];

const RANKS = [
  {xp:0,     t:'Wooden Pickaxe',   i:'🪵', c:'#a8792f'},
  {xp:150,   t:'Stone Pickaxe',    i:'🪨', c:'#9a9a9a'},
  {xp:450,   t:'Iron Pickaxe',     i:'⚙️', c:'#e0e0e0'},
  {xp:1000,  t:'Golden Pickaxe',   i:'🥇', c:'#f5d73a'},
  {xp:2000,  t:'Diamond Pickaxe',  i:'💎', c:'#4aedd9'},
  {xp:3500,  t:'Netherite Pickaxe',i:'⬛', c:'#6b5a6a'},
  {xp:6000,  t:'Redstone Wizard',  i:'🔴', c:'#ff3a2a'},
  {xp:10000, t:'Netherite Menace', i:'😈', c:'#b05ad6'}
];

/* ---------- Storage ---------- */
function blank(){ return { xp:0, name:'', muted:false, games:{}, plays:0, wins:0, lastChest:'', chestStreak:0, lastVisit:'', ach:{} }; }
let state;
function load(){
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e){}
  state = Object.assign(blank(), saved);
  state.games = saved.games || {}; state.ach = saved.ach || {};
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
load();
window.addEventListener('storage', (e) => { if (e.key === KEY) load(); });

/* ---------- Helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dayKey(d){ d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function hashStr(str){ let h = 1779033703 ^ str.length; for (let i=0;i<str.length;i++){ h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }
function mulberry32(a){ return function(){ a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function h2(x,y,s){ let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- Ranks / XP ---------- */
function rankInfo(xp){
  if (xp == null) xp = state.xp;
  let i = 0; for (let k=0;k<RANKS.length;k++) if (xp >= RANKS[k].xp) i = k;
  const cur = RANKS[i], next = RANKS[i+1] || null;
  const frac = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { idx:i, rank:cur, next, frac, xp };
}
function featuredGame(){
  const ready = GAMES.filter(g => g.ready);
  const r = mulberry32(hashStr('featured|' + dayKey()));
  return ready[Math.floor(r() * ready.length)] || GAMES[0];
}
function gameById(id){ return GAMES.find(g => g.id === id); }

/* Add XP from anywhere. Returns the XP actually granted. */
function addXP(amount, reason){
  amount = Math.max(0, Math.round(amount));
  if (!amount) return 0;
  load();
  const before = rankInfo().idx;
  state.xp += amount; save();
  const after = rankInfo();
  toast('+' + amount + ' XP' + (reason ? ' · ' + reason : ''));
  if (after.idx > before){
    setTimeout(() => { achToast(after.rank.i, 'RANK UP!', after.rank.t); Sfx.levelup(); }, 600);
  }
  updateBar();
  return amount;
}

/* Games call this once per finished run.
   opts: { score, xp, win, label }  — higher score = better. */
function report(id, opts){
  opts = opts || {};
  load();
  const g = state.games[id] || (state.games[id] = { best:0, bestLabel:'', plays:0, wins:0, xp:0, last:'' });
  g.plays++; state.plays++;
  if (opts.win){ g.wins++; state.wins++; }
  let newBest = false;
  if (typeof opts.score === 'number' && opts.score > g.best){ g.best = opts.score; g.bestLabel = opts.label || ''; newBest = g.plays > 1; }
  g.last = dayKey();
  let xp = Math.max(5, Math.round(opts.xp || 0));
  const feat = featuredGame().id === id;
  if (feat) xp *= 2;
  g.xp += xp;
  save();
  const granted = addXP(xp, feat ? '⭐ 2x Game of the Day' : (newBest ? '🏆 New best!' : ''));
  // arcade-wide milestones
  const tried = GAMES.filter(x => state.games[x.id] && state.games[x.id].plays).length;
  if (tried >= 3) unlock('explorer', '🧭', 'Arcade Explorer');
  if (tried >= 10) unlock('completionist', '🏅', 'Tried Every Game');
  if (state.plays >= 25) unlock('regular', '🎮', 'Arcade Regular');
  return { xp:granted, newBest, featured:feat };
}
function unlock(id, icon, name){
  if (state.ach[id]) return;
  state.ach[id] = Date.now(); save();
  setTimeout(() => { achToast(icon, 'Advancement Made!', name); Sfx.ach(); }, 1200);
}
function gameStats(id){ load(); return state.games[id] || { best:0, bestLabel:'', plays:0, wins:0, xp:0 }; }

/* ---------- 8-bit sound (Web Audio API) ---------- */
const Sfx = {
  ctx:null, out:null,
  init(){
    if (!this.ctx){
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { this.ctx = new AC(); this.out = this.ctx.createGain(); this.out.gain.value = .8; this.out.connect(this.ctx.destination); } catch(e){ this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  get on(){ return !state.muted && !!this.ctx; },
  tone(f, d, type, v, t0, f2){
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime + (t0||0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v || .1, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + .03);
  },
  noise(d, v, t0, ftype, f1, f2){
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime + (t0||0), len = Math.floor(c.sampleRate * d);
    const buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
    let last = 0; for (let i=0;i<len;i++){ if (i % 3 === 0) last = Math.random()*2-1; data[i] = last; }
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = ftype || 'lowpass'; flt.frequency.setValueAtTime(f1 || 1500, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(v || .4, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    src.connect(flt); flt.connect(g); g.connect(this.out); src.start(t); src.stop(t + d + .03);
  },
  click(){ this.tone(880,.05,'square',.07); this.tone(1320,.04,'square',.05,.035); },
  hover(){ this.tone(660,.03,'square',.03); },
  success(){ [523,659,784,1047].forEach((f,i)=>this.tone(f,.13,'square',.09,i*.07)); },
  fail(){ this.tone(330,.2,'sawtooth',.09,0,240); this.tone(220,.35,'sawtooth',.09,.18,90); },
  hiss(){ this.noise(.6,.1,0,'highpass',3500,6000); },
  boom(){ this.noise(1.1,.7,0,'lowpass',2200,60); this.tone(90,.7,'sine',.5,0,28); },
  splash(){ this.noise(.5,.35,0,'bandpass',1800,400); this.tone(500,.25,'sine',.08,0,150); },
  crunch(){ this.noise(.25,.6,0,'lowpass',900,100); this.tone(120,.2,'square',.15,0,50); },
  coin(){ this.tone(988,.08,'square',.08); this.tone(1319,.25,'square',.08,.08); },
  ach(){ [659,784,988,1319].forEach((f,i)=>this.tone(f,.2,'triangle',.08,i*.1)); },
  levelup(){ [523,659,784,1047,1319,1568].forEach((f,i)=>this.tone(f,.16,'square',.07,i*.08)); },
  chest(){ this.tone(200,.15,'square',.1,0,120); [784,988,1175,1568].forEach((f,i)=>this.tone(f,.18,'triangle',.08,.18+i*.08)); },
  fanfare(good){ (good ? [523,659,784,659,784,1047] : [392,370,349,330]).forEach((f,i)=>this.tone(f, good?.14:.22, 'square', .08, i*(good?.11:.2))); }
};
['pointerdown','keydown','touchstart'].forEach(ev => window.addEventListener(ev, () => Sfx.init(), { once:false, passive:true }));
function setMuted(m){ load(); state.muted = !!m; save(); updateBar(); }
function buzz(p){ if (navigator.vibrate) { try { navigator.vibrate(p); } catch(e){} } }

/* ---------- Pixel art ---------- */
function px(rows, pal, cls){
  const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
  let r = '';
  for (let y=0;y<h;y++) for (let x=0;x<rows[y].length;x++){ const c = rows[y][x]; if (c !== '.' && pal[c]) r += '<rect x="'+x+'" y="'+y+'" width="1.04" height="1.04" fill="'+pal[c]+'"/>'; }
  return '<svg class="'+(cls||'px')+'" viewBox="0 0 '+w+' '+h+'" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">'+r+'</svg>';
}
function texture(pal, seed, size){
  size = size || 8; const rows = [];
  for (let y=0;y<size;y++){ let s=''; for (let x=0;x<size;x++){ const v = h2(x,y,seed); s += v<.45?'0':v<.75?'1':v<.9?'2':'3'; } rows.push(s); }
  return px(rows, {0:pal[0],1:pal[1],2:pal[2],3:pal[3]}, 'tex');
}
function textureURL(pal, seed, size){
  try {
    size = size || 16;
    const c = document.createElement('canvas'); c.width = size; c.height = size; const x = c.getContext('2d');
    for (let i=0;i<size;i++) for (let j=0;j<size;j++){ const v = h2(i,j,seed); x.fillStyle = pal[v<.45?0:v<.75?1:v<.9?2:3]; x.fillRect(i,j,1,1); }
    return c.toDataURL();
  } catch(e){ return ''; }
}
function paintBody(pal){ const u = textureURL(pal || ['#3a281b','#2f2015','#47321f','#251810'], 99, 16); if (u) document.body.style.backgroundImage = 'url(' + u + ')'; }

const ICONS = {
  table:{m:['llllllll','lcclccdl','lcclccdl','llllllll','lccdlccl','lccdlccl','lddllddl','llllllll'], p:{l:'#5c3d1e',c:'#b5874a',d:'#8a6232'}},
  bucket:{m:['..hhhh..','.h....h.','gggggggg','gbbwbbbg','.gbbbbg.','.gbbbbg.','..gggg..','........'], p:{g:'#a8a8a8',b:'#3b6fd8',w:'#9cc4ff',h:'#555'}},
  creeper:{m:['gGggggGg','ggGggggG','gkkggkkg','gkkggkkg','gggkkggg','ggkkkkgg','ggkkkkgg','ggkggkgg'], p:{g:'#5fbf3a',G:'#8fe06a',k:'#111'}},
  villager:{m:['hhhhhhhh','ssssssss','skwsswks','bbbbbbbb','sssnnsss','sssnnsss','ssmnnmss','ssssssss'], p:{s:'#b98a6a',h:'#5a3a1e',k:'#2a8a2a',w:'#fff',n:'#a0705a',m:'#6a4030',b:'#4a2a10'}},
  obsidian:{m:['oooOoooo','oPoooOoo','ooooPooo','OooooooO','oooPoooo','ooOoooPo','oPooOooo','oooooooo'], p:{o:'#140f1f',O:'#2a1d40',P:'#7b4dc0'}},
  wordle:{m:['gg.yy.kk','gg.yy.kk','........','yy.kk.gg','yy.kk.gg','........','kk.gg.yy','kk.gg.yy'], p:{g:'#5fbf3a',y:'#e6c21a',k:'#7a7a7a'}},
  netherite:{m:['........','........','..hhhhh.','.hlllllh','hllllldd','hdddddd.','........','........'], p:{h:'#8a7f88',l:'#4a4148',d:'#241f23'}},
  lamp:{m:['kkkkkkkk','kyyoyyok','kyoyyoyk','koyyyyok','kyyoyyyk','koyyoyyk','kyoyyoyk','kkkkkkkk'], p:{k:'#6b3a1e',y:'#ffd27a',o:'#f5a020'}},
  potion:{m:['...cc...','...gg...','..g..g..','.gppppg.','gpphpppg','gppppppg','.gppppg.','..gggg..'], p:{g:'#cfeef7',c:'#8a5a2b',p:'#c03ad8',h:'#f0a0ff'}},
  arrow:{m:['........','......f.','.....ff.','sssssshh','.....ff.','......f.','gggllggg','dddllddd'], p:{s:'#8a5a2b',f:'#eeeeee',h:'#aaaaaa',g:'#5fbf3a',l:'#ff6a00',d:'#866043'}}
};
const icon = (k) => ICONS[k] ? px(ICONS[k].m, ICONS[k].p) : '';

/* ---------- Toasts & FX ---------- */
let toastT = 0;
function ensureFx(){
  if (!$('#arcadeToast')){
    const t = document.createElement('div'); t.id = 'arcadeToast'; t.setAttribute('role','status'); document.body.appendChild(t);
    const a = document.createElement('div'); a.id = 'arcadeAch'; a.innerHTML = '<div class="ai"></div><div><small></small><b></b></div>'; document.body.appendChild(a);
    const f = document.createElement('div'); f.className = 'flash'; f.id = 'arcadeFlash'; document.body.appendChild(f);
    const b = document.createElement('div'); b.className = 'bigtext'; b.id = 'arcadeBig'; document.body.appendChild(b);
  }
}
function toast(msg){ ensureFx(); const t = $('#arcadeToast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
const achQ = []; let achBusy = false;
function achToast(i, h, n){ ensureFx(); achQ.push([i,h,n]); if (!achBusy) runAch(); }
function runAch(){
  const t = achQ.shift(); if (!t){ achBusy = false; return; } achBusy = true;
  const a = $('#arcadeAch'); a.querySelector('.ai').textContent = t[0]; a.querySelector('small').textContent = t[1]; a.querySelector('b').textContent = t[2];
  a.classList.add('show'); setTimeout(() => { a.classList.remove('show'); setTimeout(runAch, 300); }, 2600);
}
function flash(){ ensureFx(); const f = $('#arcadeFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
function bigText(t, color){ ensureFx(); const b = $('#arcadeBig'); b.textContent = t; b.style.color = color || ''; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
function shake(el, big){ el = el || document.body; const c = big ? 'shake' : 'shake-sm'; el.classList.remove('shake','shake-sm'); void el.offsetWidth; el.classList.add(c); setTimeout(() => el.classList.remove(c), 450); }
function burst(x, y, colors, n){
  colors = colors || ['#55ff55','#ffff55','#55ffff','#ff55ff','#ffffff']; n = n || 18;
  for (let i=0;i<n;i++){
    const p = document.createElement('div'); p.className = 'particle';
    p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.background = colors[i % colors.length];
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
    p.style.setProperty('--dx', Math.cos(a)*d + 'px'); p.style.setProperty('--dy', (Math.sin(a)*d - 40) + 'px');
    document.body.appendChild(p); setTimeout(() => p.remove(), 850);
  }
}
function confetti(){ for (let k=0;k<5;k++) setTimeout(() => burst(innerWidth*(.15+Math.random()*.7), innerHeight*(.2+Math.random()*.3), ['#55ff55','#ffff55','#ff55ff','#55ffff','#ffaa00','#ff5555'], 24), k*170); }

/* ---------- Sharing ---------- */
function pageURL(){ return /^https?:/.test(location.protocol) ? location.origin + location.pathname : ''; }
function hubURL(){ return /^https?:/.test(location.protocol) ? new URL(ROOT || './', location.href).href : ''; }
function copy(text, msg){
  const done = () => { toast(msg || '✔ Copied! Paste it in Discord or TikTok.'); Sfx.coin(); };
  const fallback = () => {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly',''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy'); document.body.removeChild(ta);
      if (ok) done(); else prompt('Copy this:', text);
    } catch(e){ prompt('Copy this:', text); }
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
}
/* Standard share text for any game */
function shareText(gameId, lines){
  const g = gameById(gameId), r = rankInfo().rank, link = pageURL();
  return '🕹️ CHAOS ARCADE · ' + g.e + ' ' + g.t + (state.name ? ' — ' + state.name : '') + '\n' + lines.join('\n') + '\n' + r.i + ' Arcade rank: ' + r.t + (link ? '\n' + link : '');
}

/* ---------- Game page top bar ---------- */
function updateBar(){
  const xp = $('#abXP'), mute = $('#abMute');
  if (xp){ const ri = rankInfo(); xp.textContent = ri.rank.i + ' ' + state.xp + ' XP'; xp.title = ri.rank.t; }
  if (mute) mute.textContent = state.muted ? '🔇' : '🔊';
}
function mountBar(gameId, opts){
  opts = opts || {};
  const g = gameById(gameId);
  const host = $('#arcadeBar') || (() => { const d = document.createElement('div'); d.id = 'arcadeBar'; document.body.prepend(d); return d; })();
  host.className = 'arcade-bar';
  host.innerHTML = '<a class="btn back" href="' + ROOT + 'index.html" title="Back to the arcade">⬅ ARCADE</a>' +
    '<div class="title">' + (g ? g.e + ' ' + esc(g.t) : '') + (g && featuredGame().id === g.id ? ' <span class="badge gold" style="background:#d9a514">⭐ 2x XP</span>' : '') + '</div>' +
    '<span class="chip" id="abXP"></span>' + (opts.noMute ? '' : '<button class="btn icon" id="abMute" aria-label="Toggle sound">🔊</button>');
  const m = $('#abMute');
  if (m) m.addEventListener('click', () => { setMuted(!state.muted); Sfx.init(); Sfx.click(); if (opts.onMute) opts.onMute(state.muted); });
  updateBar();
}

/* ---------- Background falling blocks (decorative) ---------- */
function fallingBlocks(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.id = 'bgBlocks'; document.body.prepend(c);
  const x = c.getContext('2d'); let W, H;
  const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; }; resize(); addEventListener('resize', resize);
  const pals = [['#5fbf3a','#866043'],['#7a7a7a','#5e5e5e'],['#4aedd9','#2aa596'],['#f5d73a','#c29d14'],['#db2b1f','#eeeeee'],['#b8945f','#7a5e36'],['#3b2a57','#140f1f']];
  const blocks = Array.from({length: Math.min(26, Math.round(innerWidth/45))}, () => mk(true));
  function mk(init){ return { x:Math.random()*innerWidth, y:init ? Math.random()*innerHeight : -40, s:14 + Math.random()*22, v:.25 + Math.random()*.7, r:Math.random()*6, vr:(Math.random()-.5)*.02, p:rnd(pals) }; }
  (function loop(){
    x.clearRect(0,0,W,H);
    blocks.forEach((b, i) => {
      b.y += b.v; b.r += b.vr; if (b.y > H + 40) blocks[i] = mk(false);
      x.save(); x.translate(b.x, b.y); x.rotate(b.r);
      x.fillStyle = '#000'; x.fillRect(-b.s/2-2, -b.s/2-2, b.s+4, b.s+4);
      x.fillStyle = b.p[1]; x.fillRect(-b.s/2, -b.s/2, b.s, b.s);
      x.fillStyle = b.p[0]; x.fillRect(-b.s/2, -b.s/2, b.s, b.s*.35);
      x.restore();
    });
    requestAnimationFrame(loop);
  })();
}

/* ---------- Public API ---------- */
window.Arcade = {
  GAMES, RANKS, ROOT,
  get state(){ return state; },
  save, load, dayKey, hashStr, mulberry32, h2, rnd, esc,
  rankInfo, featuredGame, gameById, gameStats, addXP, report, unlock,
  Sfx, setMuted, buzz,
  px, texture, textureURL, paintBody, icon, ICONS,
  toast, achToast, flash, bigText, shake, burst, confetti,
  copy, shareText, pageURL, hubURL,
  mountBar, updateBar, fallingBlocks,
  setName(n){ load(); state.name = String(n||'').replace(/[^\p{L}\p{N} _\-.!]/gu,'').slice(0,16); save(); }
};
})();
