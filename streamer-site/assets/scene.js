// =====================================================================
//  Hero scene: a little pixel world behind the home page header.
//  Sky follows the visitor's real clock (day / sunset / night), clouds drift,
//  and the ground can be mined block by block (with a rare diamond ore).
// =====================================================================
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const cv = document.createElement('canvas');
  cv.className = 'scene';
  cv.setAttribute('aria-hidden', 'true');
  hero.prepend(cv);
  hero.classList.add('has-scene');
  const ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const B = 16;               // block size in CSS px
  const PX = B / 8;           // block "texture" pixel
  let W, H, cols, rows, ground, world, trees, stars, clouds, dpr;

  // deterministic random so the world looks the same per visit/day
  let seed = new Date().getDate() * 9301 + 49297;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // ---------- palette by time of day ----------
  function sky() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 7 && h < 17.5)  return { top: '#5a8fe6', bot: '#a9cdf7', night: 0, t: (h - 6) / 13 };
    if (h >= 17.5 && h < 20) return { top: '#3b3f8f', bot: '#f08a5d', night: .35, t: (h - 6) / 13 };
    if (h >= 5 && h < 7)     return { top: '#46518f', bot: '#f3a86b', night: .4, t: (h - 6) / 13 };
    return { top: '#070b1f', bot: '#1d2a55', night: 1, t: ((h + 24 - 19) % 24) / 11 };
  }

  // ---------- build the world ----------
  function build() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr);
    cols = Math.ceil(W / B) + 1; rows = Math.ceil(H / B) + 1;
    seed = new Date().getDate() * 9301 + 49297;
    const base = rows - 4;
    const heights = [];
    let h = base - 1;
    for (let x = 0; x < cols; x++) {
      if (rnd() < .35) h += rnd() < .5 ? -1 : 1;
      h = Math.max(base - 3, Math.min(base, h));
      heights.push(h);
    }
    // keep the middle (under the buttons) lower so text stays readable
    world = [];
    ground = heights;
    for (let x = 0; x < cols; x++) {
      world[x] = [];
      for (let y = 0; y < rows; y++) {
        const top = heights[x];
        let t = null;
        if (y === top) t = 'grass';
        else if (y > top && y <= top + 2) t = 'dirt';
        else if (y > top + 2) {
          const r = rnd();
          t = r < .025 ? 'diamond' : r < .09 ? 'coal' : r < .13 ? 'iron' : 'stone';
        }
        world[x][y] = t;
      }
    }
    trees = [];
    for (let x = 2; x < cols - 2; x++) {
      const mid = Math.abs(x * B - W / 2) < Math.min(360, W * .35);
      if (!mid && rnd() < .09 && !trees.some(t => Math.abs(t - x) < 4)) trees.push(x);
    }
    stars = Array.from({ length: Math.round(W * H / 9000) }, () => ({ x: rnd() * W, y: rnd() * H * .6, s: rnd() < .2 ? 3 : 2, p: rnd() * 6 }));
    clouds = Array.from({ length: Math.max(3, Math.round(W / 260)) }, () => ({ x: rnd() * W, y: 20 + rnd() * H * .3, w: 4 + Math.floor(rnd() * 6), v: .08 + rnd() * .12 }));
  }

  // ---------- block "textures" (drawn procedurally, 8x8 each) ----------
  const TEX = {};
  function tex(type) {
    if (TEX[type]) return TEX[type];
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const g = c.getContext('2d');
    let s = type.length * 77;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const fill = (cols) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, 1, 1); } };
    if (type === 'grass') {
      fill(['#7a5230', '#6b4728', '#8a5f38']);
      for (let x = 0; x < 8; x++) { const d = 2 + Math.floor(r() * 2); for (let y = 0; y < d; y++) { g.fillStyle = ['#5bae3c', '#4f9a33', '#6cc24a'][Math.floor(r() * 3)]; g.fillRect(x, y, 1, 1); } }
    } else if (type === 'dirt') fill(['#7a5230', '#6b4728', '#8a5f38', '#5e3e22']);
    else {
      fill(['#7d7d7d', '#8a8a8a', '#6f6f6f', '#767676']);
      const ore = { coal: ['#222', '#3a3a3a'], iron: ['#d8b089', '#c49a70'], diamond: ['#5ff0f0', '#2bc4c4', '#d6ffff'] }[type];
      if (ore) for (let i = 0; i < 6; i++) { g.fillStyle = ore[i % ore.length]; g.fillRect(1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6), 1 + (i % 2), 1); }
    }
    return TEX[type] = c;
  }

  // ---------- draw ----------
  let t0 = performance.now();
  function draw(now) {
    const t = (now - t0) / 1000;
    const sk = sky();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sk.top); g.addColorStop(1, sk.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // stars
    if (sk.night > .2) for (const s of stars) {
      ctx.globalAlpha = sk.night * (.45 + .55 * Math.abs(Math.sin(t * .8 + s.p)));
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // sun / moon on an arc
    const p = Math.max(0, Math.min(1, sk.t));
    const cx = W * (.08 + .84 * p), cy = H * .62 - Math.sin(p * Math.PI) * H * .48;
    const S = 6 * PX * 2;
    if (sk.night >= 1) {
      ctx.fillStyle = '#e8ecf5'; ctx.fillRect(cx - S / 2, cy - S / 2, S, S);
      ctx.fillStyle = '#b9c0cf'; ctx.fillRect(cx - S / 4, cy - S / 6, S / 4, S / 4); ctx.fillRect(cx + S / 8, cy + S / 8, S / 6, S / 6);
    } else {
      ctx.fillStyle = 'rgba(255,240,150,.25)'; ctx.fillRect(cx - S, cy - S, S * 2, S * 2);
      ctx.fillStyle = '#fff3a0'; ctx.fillRect(cx - S / 2, cy - S / 2, S, S);
      ctx.fillStyle = '#ffe066'; ctx.fillRect(cx - S / 3, cy - S / 3, S / 1.5, S / 1.5);
    }

    // clouds
    for (const c of clouds) {
      c.x += reduced ? 0 : c.v;
      if (c.x > W + 200) c.x = -c.w * B * 1.2;
      ctx.fillStyle = sk.night >= 1 ? 'rgba(160,170,200,.18)' : 'rgba(255,255,255,.85)';
      ctx.fillRect(Math.round(c.x), Math.round(c.y), c.w * B, B * .9);
      ctx.fillRect(Math.round(c.x + B), Math.round(c.y - B * .6), (c.w - 2) * B, B * .7);
    }

    // trees
    for (const x of trees) {
      const top = ground[x];
      if (world[x][top] !== 'grass') continue;
      const bx = x * B, by = top * B;
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(bx + B * .3, by - B * 3, B * .4, B * 3);
      ctx.fillStyle = '#2f7d32'; ctx.fillRect(bx - B, by - B * 5, B * 3, B * 2);
      ctx.fillStyle = '#3d9140'; ctx.fillRect(bx - B * .5, by - B * 6, B * 2, B);
      ctx.fillStyle = '#276b2a'; ctx.fillRect(bx - B, by - B * 3.6, B * 3, B * .6);
    }

    // ground blocks
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      const b = world[x][y];
      if (b) ctx.drawImage(tex(b), x * B, y * B, B, B);
    }
    // night tint over the ground
    if (sk.night) { ctx.fillStyle = `rgba(5,8,25,${sk.night * .45})`; for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) if (world[x][y]) ctx.fillRect(x * B, y * B, B, B); }

    // crack overlay on hovered block
    if (hover) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.strokeRect(hover.x * B + 1, hover.y * B + 1, B - 2, B - 2); }
  }

  let running = true, raf;
  function loop(now) { draw(now); if (running && !reduced) raf = requestAnimationFrame(loop); }

  // ---------- mining ----------
  let hover = null;
  function blockAt(e) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / B), y = Math.floor((e.clientY - r.top) / B);
    if (!world[x] || !world[x][y]) return null;
    return { x, y };
  }
  hero.addEventListener('pointermove', e => {
    if (e.target.closest('a, button')) { hover = null; return; }
    hover = blockAt(e);
    cv.style.cursor = hover ? 'crosshair' : '';
    hero.style.cursor = hover ? 'crosshair' : '';
    if (reduced) draw(performance.now());
  });
  hero.addEventListener('pointerleave', () => { hover = null; hero.style.cursor = ''; });
  hero.addEventListener('click', e => {
    if (e.target.closest('a, button, h1, p, img, .tag')) return;
    const b = blockAt(e);
    if (!b) return;
    const type = world[b.x][b.y];
    world[b.x][b.y] = null;
    if (b.y === ground[b.x]) { let y = b.y; while (y < rows && !world[b.x][y]) y++; ground[b.x] = y; }
    const colors = { grass: ['#5bae3c', '#7a5230'], dirt: ['#7a5230', '#5e3e22'], stone: ['#7d7d7d', '#6f6f6f'], coal: ['#222', '#7d7d7d'], iron: ['#d8b089', '#7d7d7d'], diamond: ['#5ff0f0', '#d6ffff', '#7d7d7d'] }[type];
    if (window.FX) {
      FX.burst(e.clientX, e.clientY, colors, type === 'diamond' ? 26 : 10, 6);
      FX.sound(type === 'diamond' ? 'gem' : 'dig');
      FX.addMined(1);
      if (type === 'diamond') FX.unlock('ore');
    }
    if (reduced) draw(performance.now());
  });

  // pause when off screen
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (running) raf = requestAnimationFrame(loop);
  }).observe(hero);

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(performance.now()); }, 150); });
  build();
  draw(performance.now());
  if (!reduced) raf = requestAnimationFrame(loop);
})();
