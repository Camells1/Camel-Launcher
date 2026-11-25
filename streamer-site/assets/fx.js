// =====================================================================
//  FX: achievements, XP bar, toasts, sounds, scroll reveal & secrets.
//  Loaded on every page after site.js. Exposes window.FX.
// =====================================================================
const FX = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- achievements ----------
  const ACH = [
    { id: 'welcome',  icon: '🏠', name: 'Taking Inventory', desc: 'Visit the site', xp: 10 },
    { id: 'discord',  icon: '💬', name: 'Join the Party',   desc: 'Click a Join Discord button', xp: 30 },
    { id: 'spin',     icon: '🎡', name: 'Spin Doctor',      desc: 'Spin the clip wheel', xp: 20 },
    { id: 'upload',   icon: '📤', name: 'Director',         desc: 'Upload a clip', xp: 40 },
    { id: 'voted',    icon: '🗳', name: 'Democracy!',       desc: 'Vote in a poll', xp: 20 },
    { id: 'quiz10',   icon: '🧠', name: 'Big Brain',        desc: 'Get 10/10 on the quiz', xp: 50 },
    { id: 'danny',    icon: '🐶', name: 'Dog Catcher',      desc: 'Score 25+ in Catch Danny', xp: 50 },
    { id: 'explorer', icon: '🧭', name: 'Explorer',         desc: 'Visit every page', xp: 40 },
    { id: 'streak3',  icon: '📅', name: 'Regular',          desc: 'Visit 3 days in a row', xp: 60 },
    { id: 'miner',    icon: '⛏', name: 'Getting Wood',      desc: 'Mine a block on the home page', xp: 20 },
    { id: 'miner64',  icon: '🪨', name: 'Stack of Blocks',  desc: 'Mine 64 blocks', xp: 60, secret: true },
    { id: 'ore',      icon: '💠', name: 'Shiny!',           desc: 'Mine a diamond ore block', xp: 60, secret: true },
    { id: 'diamond',  icon: '💎', name: 'DIAMONDS!',        desc: 'Find a hidden diamond somewhere on the site', xp: 50, secret: true },
    { id: 'hoarder',  icon: '👑', name: 'Diamond Hoarder',  desc: 'Find 5 hidden diamonds', xp: 100, secret: true },
    { id: 'golden',   icon: '✨', name: 'Golden Spin',      desc: 'Land a rare golden spin', xp: 100, secret: true },
    { id: 'konami',   icon: '🎮', name: 'Cheat Code',       desc: '↑↑↓↓←→←→BA', xp: 75, secret: true },
    { id: 'poke',     icon: '👉', name: 'Stop Poking Me',   desc: 'Click the logo 10 times', xp: 30, secret: true },
    { id: 'herobrine',icon: '👁', name: 'Removed Herobrine?', desc: 'Type his name anywhere', xp: 75, secret: true },
    { id: 'night',    icon: '🌙', name: 'Night Owl',        desc: 'Visit between midnight and 5 AM', xp: 40, secret: true },
    { id: 'vault',    icon: '🔐', name: 'Vault Hunter',     desc: 'Open the secret Vault', xp: 150, secret: true },
  ];
  const VAULT_AT = 5; // achievements needed to open the vault

  // ---------- saved progress (per browser) ----------
  const KEY = 'dh-progress';
  let P;
  try { P = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { P = {}; }
  P = Object.assign({ ach: {}, xp: 0, pages: [], diamonds: 0, mined: 0, streak: 0, lastDay: '', pokes: 0, vaultToast: false, muted: false }, P);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch {} };

  const level = xp => Math.floor(Math.sqrt(xp / 15));
  const xpFor = lv => lv * lv * 15;

  // ---------- sound (tiny synth, no files) ----------
  let ac;
  function sound(name) {
    if (P.muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime;
      const tone = (f, start, dur, type = 'square', vol = .06, slide) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t + start);
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + start + dur);
        g.gain.setValueAtTime(vol, t + start); g.gain.exponentialRampToValueAtTime(.0001, t + start + dur);
        o.connect(g).connect(ac.destination); o.start(t + start); o.stop(t + start + dur + .02);
      };
      const noise = (start, dur, vol = .3, freq = 900) => {
        const len = ac.sampleRate * dur, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        src.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
        src.connect(f).connect(g).connect(ac.destination); src.start(t + start);
      };
      ({
        pop:     () => tone(520, 0, .08, 'square', .05, 900),
        ach:     () => { tone(523, 0, .12); tone(659, .1, .12); tone(784, .2, .12); tone(1047, .3, .25); },
        levelup: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * .07, .18, 'triangle', .08)); },
        dig:     () => noise(0, .09, .25, 1400),
        hiss:    () => noise(0, 1.3, .12, 5000),
        boom:    () => { noise(0, 1.1, .9, 500); tone(90, 0, .6, 'sine', .4, 30); },
        woof:    () => { tone(300, 0, .07, 'sawtooth', .07, 180); tone(260, .09, .1, 'sawtooth', .07, 150); },
        bad:     () => tone(160, 0, .25, 'square', .07, 80),
        gem:     () => { tone(1319, 0, .08, 'sine', .08); tone(1760, .07, .14, 'sine', .08); },
        creepy:  () => { tone(55, 0, 2.5, 'sawtooth', .05, 45); tone(58, 0, 2.5, 'sine', .08, 50); },
      })[name]?.();
    } catch {}
  }

  // ---------- toasts ----------
  let stack;
  function toast(html, opts = {}) {
    if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.appendChild(stack); }
    const t = document.createElement(opts.href ? 'a' : 'div');
    t.className = 'toast' + (opts.kind ? ' toast-' + opts.kind : '');
    if (opts.href) t.href = opts.href;
    t.innerHTML = html;
    stack.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, opts.ms || 4200);
  }

  function unlock(id) {
    const a = ACH.find(x => x.id === id);
    if (!a || P.ach[id]) return false;
    P.ach[id] = Date.now();
    const before = level(P.xp);
    P.xp += a.xp;
    save();
    sound('ach');
    toast(`<span class="toast-icon">${a.icon}</span><span><b>${a.secret ? 'Secret achievement!' : 'Achievement get!'}</b>${a.name}</span><em>+${a.xp} XP</em>`, { kind: a.secret ? 'secret' : 'ach' });
    if (level(P.xp) > before) setTimeout(() => { sound('levelup'); toast(`<span class="toast-icon">⭐</span><span><b>Level up!</b>You are now level ${level(P.xp)}</span>`, { kind: 'level' }); }, 900);
    renderXP(true);
    const count = Object.keys(P.ach).length;
    if (count >= VAULT_AT && !P.vaultToast) {
      P.vaultToast = true; save();
      setTimeout(() => { sound('creepy'); toast('<span class="toast-icon">🔓</span><span><b>Something opened…</b>The Vault is unlocked. Click here.</span>', { kind: 'secret', href: 'vault.html', ms: 9000 }); }, 2200);
    }
    return true;
  }

  // ---------- XP bar ----------
  let bar;
  function renderXP(flash) {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'xpbar';
      bar.innerHTML = `<button class="xp-mute" title="Sound on/off" aria-label="Toggle sound"></button>
        <button class="xp-main" title="Your achievements"><span class="xp-level"></span><span class="xp-track"><span class="xp-fill"></span></span></button>`;
      document.body.appendChild(bar);
      bar.querySelector('.xp-main').addEventListener('click', openAchievements);
      bar.querySelector('.xp-mute').addEventListener('click', () => { P.muted = !P.muted; save(); renderXP(); if (!P.muted) sound('pop'); });
    }
    const lv = level(P.xp), lo = xpFor(lv), hi = xpFor(lv + 1);
    bar.querySelector('.xp-level').textContent = lv;
    bar.querySelector('.xp-fill').style.width = (100 * (P.xp - lo) / (hi - lo)).toFixed(1) + '%';
    bar.querySelector('.xp-mute').textContent = P.muted ? '🔇' : '🔊';
    bar.querySelector('.xp-main').title = `Level ${lv} · ${P.xp} XP · ${Object.keys(P.ach).length}/${ACH.length} achievements — click to see them`;
    if (flash) { bar.classList.remove('xp-flash'); void bar.offsetWidth; bar.classList.add('xp-flash'); }
  }

  function openAchievements() {
    sound('pop');
    let m = $('#achModal');
    if (!m) {
      m = document.createElement('div');
      m.className = 'modal'; m.id = 'achModal';
      m.innerHTML = '<div class="modal-box ach-box"></div>';
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('open'); });
      document.body.appendChild(m);
    }
    const got = Object.keys(P.ach).length, lv = level(P.xp);
    m.querySelector('.ach-box').innerHTML = `
      <h2>🏆 Achievements</h2>
      <p class="muted small">Level ${lv} · ${P.xp} XP · ${got}/${ACH.length} unlocked · 💎 ${P.diamonds} · ⛏ ${P.mined} blocks</p>
      <div class="ach-grid">${ACH.map(a => {
        const has = !!P.ach[a.id], hide = a.secret && !has;
        return `<div class="ach ${has ? 'got' : ''}"><span class="ach-icon">${hide ? '❓' : a.icon}</span>
          <span><b>${hide ? '???' : a.name}</b><small>${hide ? 'Secret achievement' : a.desc}</small></span><em>${a.xp}</em></div>`;
      }).join('')}</div>
      <p class="muted small">${got >= VAULT_AT ? '🔓 <a href="vault.html">The Vault is open.</a>' : `🔒 Something unlocks at ${VAULT_AT} achievements…`} Progress is saved in this browser.</p>
      <button class="btn" data-close>Close</button>`;
    m.classList.add('open');
  }

  // ---------- particles ----------
  function burst(x, y, colors, n = 18, size = 7) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'px';
      const s = size * (.6 + Math.random() * .8);
      p.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${colors[i % colors.length]}`;
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
      p.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v + 120}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => p.remove();
    }
  }

  function rain(chars, count = 40) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('i');
      d.className = 'rain';
      d.textContent = chars[i % chars.length];
      d.style.left = Math.random() * 100 + 'vw';
      d.style.fontSize = 18 + Math.random() * 22 + 'px';
      document.body.appendChild(d);
      d.animate([{ transform: 'translateY(-10vh) rotate(0)' }, { transform: `translateY(110vh) rotate(${Math.random() * 720 - 360}deg)` }],
        { duration: 1800 + Math.random() * 2000, delay: Math.random() * 1200, easing: 'ease-in' }).onfinish = () => d.remove();
    }
  }

  // ---------- secret: explosion ----------
  let exploding = false;
  function explode() {
    if (exploding) return;
    exploding = true;
    sound('hiss');
    const fl = document.createElement('div');
    fl.className = 'hiss-overlay'; fl.innerHTML = '<span>Sssssss…</span>';
    document.body.appendChild(fl);
    setTimeout(() => {
      fl.remove();
      sound('boom');
      const cards = [...document.querySelectorAll('.card, .stat, .hero h1, .hero .btn, .lb-row')];
      if (!reduced) {
        document.body.classList.add('shake');
        cards.forEach(c => c.animate([
          { transform: 'none' },
          { transform: `translate(${Math.random() * 120 - 60}px, ${Math.random() * -80 - 10}px) rotate(${Math.random() * 30 - 15}deg)`, offset: .25 },
          { transform: 'none' }
        ], { duration: 1800, easing: 'cubic-bezier(.3,1.4,.5,1)' }));
      }
      const flash = document.createElement('div'); flash.className = 'boom-flash'; document.body.appendChild(flash);
      burst(innerWidth / 2, innerHeight / 2, ['#5bae3c', '#3e7f27', '#7a5230', '#9aa0a6', '#222'], 60, 14);
      setTimeout(() => { flash.remove(); document.body.classList.remove('shake'); exploding = false; }, 1900);
    }, 1400);
  }

  // ---------- secret: Herobrine ----------
  function herobrine(silent) {
    const h = document.createElement('div');
    h.className = 'herobrine' + (silent ? ' glimpse' : '');
    h.innerHTML = '<div class="eyes"><i></i><i></i></div>';
    if (silent) h.style.left = (10 + Math.random() * 80) + 'vw';
    document.body.appendChild(h);
    if (!silent) sound('creepy');
    setTimeout(() => h.remove(), silent ? 1400 : 3200);
  }

  // ---------- secret: hidden diamond ----------
  const GEM = '<svg viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true"><path fill="#1d8f92" d="M3 1h4v1h1v1h1v2H8v1H7v1H6v1H4V7H3V6H2V5H1V3h1V2h1z"/><path fill="#5ff0f0" d="M3 2h4v1h1v1H2V3h1z"/><path fill="#d6ffff" d="M4 2h1v1H4zM3 3h1v1H3z"/><path fill="#127072" d="M4 6h2v1H4zM3 5h1v1H3zM6 5h1v1H6z"/></svg>';
  function hideDiamond() {
    if (Math.random() > .45) return;
    const spots = [...document.querySelectorAll('main .card, main .stat, footer')];
    if (!spots.length) return;
    const host = spots[Math.floor(Math.random() * spots.length)];
    const d = document.createElement('button');
    d.className = 'hidden-gem';
    d.setAttribute('aria-label', 'A hidden diamond!');
    d.innerHTML = GEM;
    d.style[Math.random() < .5 ? 'left' : 'right'] = (6 + Math.random() * 30) + 'px';
    d.style[Math.random() < .5 ? 'top' : 'bottom'] = (6 + Math.random() * 14) + 'px';
    host.classList.add('has-gem');
    host.appendChild(d);
    d.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const r = d.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, ['#5ff0f0', '#1d8f92', '#d6ffff'], 22, 8);
      sound('gem');
      d.remove();
      P.diamonds++; save();
      if (!unlock('diamond')) toast(`<span class="toast-icon">💎</span><span><b>Diamond found!</b>You have ${P.diamonds} 💎</span>`);
      if (P.diamonds >= 5) unlock('hoarder');
    });
  }

  // ---------- scroll reveal ----------
  function reveal() {
    if (reduced || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('main .card, main .stat, .grid > *').forEach((el, i) => {
      if (el.getBoundingClientRect().top < innerHeight) return; // already on screen: no animation
      el.classList.add('reveal'); el.style.transitionDelay = (i % 3) * 60 + 'ms'; io.observe(el);
    });
  }

  // ---------- init ----------
  function init() {
    renderXP();
    reveal();
    setTimeout(() => unlock('welcome'), 900);

    // pages visited
    const page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    const ALL = ['index', 'stats', 'spinner', 'vote', 'smp', 'leaderboard', 'pedia', 'fun'];
    if (ALL.includes(page) && !P.pages.includes(page)) { P.pages.push(page); save(); }
    if (ALL.every(p => P.pages.includes(p))) setTimeout(() => unlock('explorer'), 1500);

    // daily streak
    const today = new Date().toDateString(), yest = new Date(Date.now() - 864e5).toDateString();
    if (P.lastDay !== today) { P.streak = P.lastDay === yest ? P.streak + 1 : 1; P.lastDay = today; save(); }
    if (P.streak >= 3) setTimeout(() => unlock('streak3'), 2000);

    // night owl (+ a rare glimpse of… someone)
    const hr = new Date().getHours();
    if (hr < 5) { setTimeout(() => unlock('night'), 2500); if (Math.random() < .25) setTimeout(() => herobrine(true), 6000 + Math.random() * 8000); }

    // Discord clicks
    document.addEventListener('click', e => { if (e.target.closest('[data-discord]')) unlock('discord'); });

    // logo poking
    const brand = $('.brand');
    if (brand) brand.addEventListener('click', e => {
      P.pokes++; save();
      if (P.pokes >= 10 && !P.ach.poke) { e.preventDefault(); P.pokes = 0; unlock('poke'); explode(); }
      else if (P.pokes >= 4 && location.pathname.match(/(index\.html|\/)$/)) { e.preventDefault(); sound('pop'); brand.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], { duration: 250 }); }
    });

    // keyboard secrets
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let seq = [], typed = '';
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;
      seq = [...seq, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (seq.join() === KONAMI.join()) { seq = []; unlock('konami'); explode(); }
      if (e.key.length === 1) typed = (typed + e.key.toLowerCase()).slice(-12);
      if (typed.endsWith('herobrine')) { typed = ''; herobrine(); unlock('herobrine'); }
      if (typed.endsWith('diamond')) { typed = ''; sound('gem'); rain(['💎']); }
      if (typed.endsWith('danny')) { typed = ''; sound('woof'); rain(['🐶', '🐕', '🦴']); }
      if (typed.endsWith('party')) { typed = ''; sound('levelup'); rain(['🎉', '🎊', '⭐', '🎈'], 60); }
      if (typed.endsWith('boom')) { typed = ''; explode(); }
    });

    hideDiamond();

    // a note for the curious
    console.log('%c  ⛏  DANNY\'S HANGOUT  ⛏  ', 'background:#5bae3c;color:#fff;font:bold 16px monospace;padding:8px;border:3px solid #0c0d10');
    console.log('%cYou opened the console. Respect. 🫡\nSome secrets: try typing words like "diamond", "danny", "party"… or a certain old cheat code.\nThere might be something hidden after ' + VAULT_AT + ' achievements. Type FX.stats() to see yours.', 'color:#a3a9b5;font:13px monospace');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return {
    unlock, toast, sound, burst, rain, explode, herobrine, reduced,
    has: id => !!P.ach[id],
    count: () => Object.keys(P.ach).length,
    progress: () => ({ ...P, level: level(P.xp) }),
    addMined(n = 1) { P.mined += n; save(); if (P.mined >= 1) unlock('miner'); if (P.mined >= 64) unlock('miner64'); },
    VAULT_AT,
    stats() { console.table(ACH.map(a => ({ achievement: a.secret && !P.ach[a.id] ? '???' : a.name, unlocked: !!P.ach[a.id] }))); return `Level ${level(P.xp)}, ${P.xp} XP`; },
  };
})();
window.FX = FX;
