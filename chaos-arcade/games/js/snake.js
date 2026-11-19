/* Neon Snake */
(function(){
const N = 20;
function free(d){ let p; do { p = { x:Math.floor(Math.random()*N), y:Math.floor(Math.random()*N) }; } while (d.s.some(q => q.x === p.x && q.y === p.y)); return p; }
function die(k){
  const d = k.data, c = k.W / N, h = d.s[0];
  k.boom(); k.shake(12, .4); k.flash('#ff3a3a', .2);
  k.burst((h.x+.5)*c, (h.y+.5)*c, ['#55ff55','#b5ff7a','#ffffff'], 30, 320);
  k.over({ lines:['🐍 Length ' + d.s.length + ' · 🍎 ' + d.eaten + ' eaten'] });
}
Kit.def({
  aspect:1, winAt:300,
  how:'Swipe or use the arrow keys / WASD to steer. Eat 🍎 to grow and speed up. ✨ Golden apples are worth 5x but vanish fast. Eat quickly to build a combo multiplier. Walls and your own tail are deadly.',
  init(k){ const d = k.data; d.s = [{x:10,y:10},{x:9,y:10},{x:8,y:10}]; d.dir = {x:1,y:0}; d.q = []; d.step = 0; d.rate = .13; d.f = free(d); d.gold = null; d.last = 0; d.grow = 0; d.eaten = 0; k.hud('len', '🐍 3'); },
  update(dt, k){
    const d = k.data; d.step += dt;
    if (d.gold){ d.gold.t -= dt; if (d.gold.t <= 0) d.gold = null; }
    if (d.step < d.rate) return; d.step = 0;
    if (d.q.length){ const nd = d.q.shift(); if (nd.x !== -d.dir.x || nd.y !== -d.dir.y) d.dir = nd; }
    const h = { x:d.s[0].x + d.dir.x, y:d.s[0].y + d.dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || d.s.some((p, i) => i < d.s.length - 1 && p.x === h.x && p.y === h.y)) return die(k);
    d.s.unshift(h);
    const c = k.W / N; let ate = false;
    if (h.x === d.f.x && h.y === d.f.y){
      ate = true; d.eaten++;
      if (k.t - d.last > 3) k.combo = 0;
      d.last = k.t; k.hit(10, (h.x+.5)*c, h.y*c);
      k.burst((h.x+.5)*c, (h.y+.5)*c, ['#ff3a3a','#55ff55','#ffffff'], 12);
      k.beep(500 + d.s.length * 8, .06);
      d.f = free(d); d.rate = Math.max(.055, d.rate * .975);
      if (!d.gold && Math.random() < .2){ const p = free(d); d.gold = { x:p.x, y:p.y, t:5 }; }
    }
    if (d.gold && h.x === d.gold.x && h.y === d.gold.y){
      ate = true; d.grow += 3; k.hit(50, (h.x+.5)*c, h.y*c); k.flash('#ffd700', .2); k.coin(); k.shake(5);
      k.burst((h.x+.5)*c, (h.y+.5)*c, ['#ffd700','#fff39a','#ffffff'], 24, 300); d.gold = null;
    }
    if (!ate){ if (d.grow > 0) d.grow--; else d.s.pop(); }
    k.hud('len', '🐍 ' + d.s.length);
  },
  draw(ctx, k){
    const d = k.data, c = k.W / N;
    ctx.fillStyle = '#0b0f1e'; ctx.fillRect(0, 0, k.W, k.H);
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) if ((x + y) % 2){ ctx.fillStyle = '#10162a'; ctx.fillRect(x*c, y*c, c, c); }
    if (!d.s) return;
    // apple
    const pulse = 1 + Math.sin(k.t * 8) * .08;
    ctx.fillStyle = '#ff3a3a'; ctx.fillRect((d.f.x + .5 - .4*pulse)*c, (d.f.y + .5 - .4*pulse)*c, .8*c*pulse, .8*c*pulse);
    ctx.fillStyle = '#55ff55'; ctx.fillRect((d.f.x + .5)*c, (d.f.y + .02)*c, c*.25, c*.2);
    if (d.gold){ ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16; ctx.fillStyle = d.gold.t < 1.5 && Math.floor(k.t*10)%2 ? '#fff39a' : '#ffd700'; ctx.fillRect((d.gold.x+.1)*c, (d.gold.y+.1)*c, c*.8, c*.8); ctx.shadowBlur = 0; }
    // snake
    d.s.forEach((p, i) => {
      const t = i / d.s.length;
      ctx.fillStyle = i === 0 ? '#b5ff7a' : 'hsl(' + (120 + t * 60) + ',90%,' + (55 - t * 20) + '%)';
      ctx.shadowColor = '#55ff55'; ctx.shadowBlur = i === 0 ? 14 : 0;
      ctx.fillRect(p.x*c + 1, p.y*c + 1, c - 2, c - 2);
    });
    ctx.shadowBlur = 0;
    const h = d.s[0]; ctx.fillStyle = '#000';
    ctx.fillRect((h.x + .25 + d.dir.x*.15)*c, (h.y + .3 + d.dir.y*.15)*c, c*.15, c*.15);
    ctx.fillRect((h.x + .6 + d.dir.x*.15)*c, (h.y + .3 + d.dir.y*.15)*c, c*.15, c*.15);
  },
  key(key, k){ const m = { ArrowUp:[0,-1], w:[0,-1], ArrowDown:[0,1], s:[0,1], ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0] }[key.length === 1 ? key.toLowerCase() : key]; if (m && k.data.q.length < 3) k.data.q.push({ x:m[0], y:m[1] }); },
  swipe(dir, k){ const m = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[dir]; if (k.data.q.length < 3) k.data.q.push({ x:m[0], y:m[1] }); }
});
})();
