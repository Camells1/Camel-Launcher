/* Chaos Arcade — illustrated cover art (hand-made SVG, our own).
   Each cover is a 300x300 scene drawn on top of the tile's colored background. */
(function(){
const g = (id, stops) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stops.map(([o, c]) => '<stop offset="' + o + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
const rg = (id, stops) => '<radialGradient id="' + id + '" cx=".35" cy=".3" r=".75">' + stops.map(([o, c]) => '<stop offset="' + o + '" stop-color="' + c + '"/>').join('') + '</radialGradient>';
const shadow = '<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".45"/></filter>';
const glow = (c) => '<filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feFlood flood-color="' + c + '"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
const svg = (defs, body) => '<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>' + defs + '</defs>' + body + '</svg>';
const sparkles = (pts, c) => pts.map(([x, y, s]) => '<path d="M' + x + ' ' + (y - s) + 'L' + (x + s * .3) + ' ' + (y - s * .3) + 'L' + (x + s) + ' ' + y + 'L' + (x + s * .3) + ' ' + (y + s * .3) + 'L' + x + ' ' + (y + s) + 'L' + (x - s * .3) + ' ' + (y + s * .3) + 'L' + (x - s) + ' ' + y + 'L' + (x - s * .3) + ' ' + (y - s * .3) + 'Z" fill="' + (c || '#fff') + '" opacity=".9"/>').join('');

/* isometric die: top/left/right faces + pips */
function die(cx, cy, s, rot){
  const t = 'M' + cx + ' ' + (cy - s) + 'L' + (cx + s) + ' ' + (cy - s / 2) + 'L' + cx + ' ' + cy + 'L' + (cx - s) + ' ' + (cy - s / 2) + 'Z';
  const l = 'M' + (cx - s) + ' ' + (cy - s / 2) + 'L' + cx + ' ' + cy + 'L' + cx + ' ' + (cy + s) + 'L' + (cx - s) + ' ' + (cy + s / 2) + 'Z';
  const r = 'M' + (cx + s) + ' ' + (cy - s / 2) + 'L' + cx + ' ' + cy + 'L' + cx + ' ' + (cy + s) + 'L' + (cx + s) + ' ' + (cy + s / 2) + 'Z';
  const pip = (x, y, rx, ry) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#1b1f2e"/>';
  let p = pip(cx, cy - s / 2, s * .13, s * .07);   // top: 1
  [[-.62, -.05], [-.38, .32], [-.62, .55], [-.38, .1]].forEach(([a, b], i) => { if (i < 2) p += pip(cx + a * s + s * .05, cy + b * s, s * .08, s * .11); });   // left: 2
  [[.3, .02], [.5, .3], [.7, .58], [.3, .58], [.7, .02], [.5, .3]].slice(0, 5).forEach(([a, b]) => { p += pip(cx + a * s, cy + b * s - s * .05, s * .07, s * .1); });   // right: 5
  return '<g filter="url(#sh)" transform="rotate(' + (rot || 0) + ' ' + cx + ' ' + cy + ')"><path d="' + t + '" fill="#ffffff"/><path d="' + l + '" fill="#d9dde8"/><path d="' + r + '" fill="#b9bfd0"/>' + p + '</g>';
}

const C = {
  cdice: svg(shadow, die(118, 150, 62, -8) + die(205, 185, 46, 12) + sparkles([[60, 70, 9], [250, 95, 7], [240, 250, 6]])),

  crash: svg(shadow + glow('#ffb347') + g('fl', [[0, '#fff6a0'], [.5, '#ffb020'], [1, '#ff3a3a']]) + g('bd', [[0, '#ffffff'], [1, '#c9d2e8']]),
    '<path d="M30 260 C 110 250, 170 200, 250 60" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 16"/>' +
    '<g transform="rotate(42 170 130)" filter="url(#sh)"><path d="M150 210 Q170 260 190 210 Z" fill="url(#fl)" filter="url(#gl)"/>' +
    '<path d="M170 40 C 205 70 210 130 205 200 L135 200 C 130 130 135 70 170 40 Z" fill="url(#bd)"/><path d="M170 40 C 188 55 196 72 200 92 L140 92 C 144 72 152 55 170 40 Z" fill="#ff4a5a"/>' +
    '<circle cx="170" cy="128" r="17" fill="#2a5ad0" stroke="#fff" stroke-width="6"/><path d="M135 165 L105 205 L137 200 Z M205 165 L235 205 L203 200 Z" fill="#ff4a5a"/><rect x="152" y="198" width="36" height="12" rx="4" fill="#5a6280"/></g>' +
    sparkles([[60, 80, 8], [95, 50, 5], [255, 240, 7]])),

  coinflip: svg(shadow + rg('cg', [[0, '#fff3b0'], [.45, '#ffcf3a'], [1, '#c98a00']]) + rg('ci', [[0, '#ffe680'], [1, '#d9a514']]),
    '<g filter="url(#sh)"><ellipse cx="150" cy="158" rx="104" ry="104" fill="#a86f00"/><circle cx="150" cy="150" r="104" fill="url(#cg)"/><circle cx="150" cy="150" r="80" fill="url(#ci)" stroke="#b07a00" stroke-width="5"/>' +
    '<path d="M150 92 L166 132 L210 134 L176 160 L188 204 L150 179 L112 204 L124 160 L90 134 L134 132 Z" fill="#fff6c8" stroke="#b07a00" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="M86 96 A84 84 0 0 1 150 66" stroke="#fff" stroke-opacity=".7" stroke-width="8" fill="none" stroke-linecap="round"/></g>' + sparkles([[245, 70, 12], [62, 230, 8], [260, 225, 6]])),

  mines: svg(shadow + glow('#55ffb0') + g('gm', [[0, '#b6ffe0'], [.5, '#2fd27a'], [1, '#0a7a4a']]),
    (() => { let t = '<g filter="url(#sh)">'; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++){ const x = 42 + c * 56, y = 62 + r * 56; t += '<rect x="' + x + '" y="' + y + '" width="48" height="48" rx="9" fill="' + ((r + c) % 2 ? '#26304d' : '#2c3758') + '"/><rect x="' + x + '" y="' + (y + 40) + '" width="48" height="8" rx="4" fill="#161c30"/>'; } return t + '</g>'; })() +
    '<g filter="url(#gl)"><path d="M102 90 L118 74 L134 90 L118 114 Z" fill="url(#gm)"/><path d="M102 90 L134 90 L118 74 Z" fill="#fff" opacity=".45"/></g>' +
    '<g filter="url(#gl)"><path d="M214 202 L230 186 L246 202 L230 226 Z" fill="url(#gm)"/><path d="M214 202 L246 202 L230 186 Z" fill="#fff" opacity=".45"/></g>' +
    '<g filter="url(#sh)"><circle cx="172" cy="152" r="34" fill="#1b1f2e"/><circle cx="160" cy="140" r="9" fill="#fff" opacity=".35"/><rect x="164" y="108" width="16" height="12" rx="3" fill="#5a6280"/><path d="M172 108 Q178 90 192 86" stroke="#c8a060" stroke-width="5" fill="none"/>' +
    sparkles([[196, 82, 13]], '#ffd23a') + '</g>'),

  limbo: svg(shadow + glow('#7af0ff') + g('bm', [[0, 'rgba(255,255,255,0)'], [.3, 'rgba(180,250,255,.95)'], [1, 'rgba(120,230,255,.2)']]) + g('cb', [[0, '#c8f8ff'], [1, '#22b8f0']]),
    '<rect x="132" y="0" width="36" height="230" fill="url(#bm)" filter="url(#gl)"/>' +
    '<g filter="url(#sh)"><path d="M150 132 L200 157 L150 182 L100 157 Z" fill="#e8fcff"/><path d="M100 157 L150 182 L150 242 L100 217 Z" fill="url(#cb)" opacity=".9"/><path d="M200 157 L150 182 L150 242 L200 217 Z" fill="#1a8ac0" opacity=".9"/>' +
    '<path d="M70 250 L150 290 L230 250 L150 210 Z" fill="#2c3758"/><path d="M70 250 L150 290 L150 300 L70 260 Z" fill="#1b2240"/><path d="M230 250 L150 290 L150 300 L230 260 Z" fill="#141a30"/></g>' +
    sparkles([[80, 90, 9], [225, 70, 11], [240, 180, 6]], '#c8f8ff')),

  hilo: svg(shadow,
    '<g filter="url(#sh)" transform="rotate(-14 120 160)"><rect x="60" y="70" width="120" height="168" rx="14" fill="#fff"/><text x="78" y="110" font-family="Arial Black,Arial" font-weight="900" font-size="34" fill="#1b1f2e">A</text><path d="M120 128 C 96 154 88 168 104 182 C 112 188 118 184 120 178 C 122 184 128 188 136 182 C 152 168 144 154 120 128 Z M112 200 L128 200 L120 182 Z" fill="#1b1f2e"/></g>' +
    '<g filter="url(#sh)" transform="rotate(12 185 165)"><rect x="125" y="78" width="120" height="168" rx="14" fill="#fff"/><text x="143" y="118" font-family="Arial Black,Arial" font-weight="900" font-size="34" fill="#e0303a">K</text><path d="M185 214 C 150 186 140 166 152 150 C 162 138 178 142 185 156 C 192 142 208 138 218 150 C 230 166 220 186 185 214 Z" fill="#e0303a"/></g>' +
    '<g><path d="M40 70 L58 44 L76 70 Z" fill="#2fd27a"/><path d="M226 262 L244 288 L262 262 Z" fill="#ff4a5a"/></g>'),

  wheel: svg(shadow + rg('hub', [[0, '#fff3b0'], [1, '#c98a00']]),
    '<g filter="url(#sh)"><circle cx="150" cy="160" r="112" fill="#1b1f2e"/>' +
    (() => { let t = ''; const cols = ['#ff4a5a', '#2fd27a', '#22b8f0', '#ffcf3a', '#a06bff', '#ff8a3a']; for (let i = 0; i < 12; i++){ const a0 = (i * 30 - 90) * Math.PI / 180, a1 = ((i + 1) * 30 - 90) * Math.PI / 180, r = 100;
      t += '<path d="M150 160 L' + (150 + r * Math.cos(a0)).toFixed(1) + ' ' + (160 + r * Math.sin(a0)).toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + (150 + r * Math.cos(a1)).toFixed(1) + ' ' + (160 + r * Math.sin(a1)).toFixed(1) + ' Z" fill="' + cols[i % 6] + '" stroke="#1b1f2e" stroke-width="3"/>'; } return t; })() +
    '<circle cx="150" cy="160" r="30" fill="url(#hub)" stroke="#1b1f2e" stroke-width="5"/><path d="M150 34 L136 62 L164 62 Z" fill="#fff" stroke="#1b1f2e" stroke-width="4" stroke-linejoin="round"/></g>' + sparkles([[262, 60, 9], [40, 250, 7]])),

  towers: svg(shadow + glow('#55ffb0') + g('gt', [[0, '#b6ffe0'], [1, '#0a7a4a']]),
    (() => { let t = '<g filter="url(#sh)">'; const rows = [[3, 250], [3, 205], [3, 160], [2, 115]]; rows.forEach(([n, y], r) => { const w = 52, gap = 8, x0 = 150 - (n * w + (n - 1) * gap) / 2;
      for (let i = 0; i < n; i++){ const x = x0 + i * (w + gap), lit = r < 3 && i === (r % 3); t += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="34" rx="8" fill="' + (lit ? '#1f9a5a' : '#2c3758') + '"/><rect x="' + x + '" y="' + (y + 27) + '" width="' + w + '" height="7" rx="3" fill="' + (lit ? '#0f5a38' : '#161c30') + '"/>'; } }); return t + '</g>'; })() +
    '<g filter="url(#gl)"><path d="M132 82 L150 60 L168 82 L150 108 Z" fill="url(#gt)"/><path d="M132 82 L168 82 L150 60 Z" fill="#fff" opacity=".45"/></g>' + sparkles([[70, 70, 9], [235, 95, 7]])),

  keno: svg(shadow,
    (() => { const balls = [[92, 110, 38, '#ff4a5a', 7], [176, 92, 44, '#ffcf3a', 21], [218, 178, 36, '#22b8f0', 33], [120, 196, 42, '#2fd27a', 12], [70, 250, 26, '#a06bff', 40], [236, 256, 24, '#ff8a3a', 5]];
      return '<g filter="url(#sh)">' + balls.map(([x, y, r, c, n]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/><circle cx="' + x + '" cy="' + y + '" r="' + (r * .55) + '" fill="#fff"/><text x="' + x + '" y="' + (y + r * .2) + '" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="' + (r * .6) + '" fill="#1b1f2e">' + n + '</text><circle cx="' + (x - r * .45) + '" cy="' + (y - r * .5) + '" r="' + (r * .16) + '" fill="#fff" opacity=".5"/>').join('') + '</g>'; })()),

  cplinko: svg(shadow + glow('#ff4a8a'),
    (() => { let t = ''; for (let r = 0; r < 6; r++) for (let i = 0; i <= r + 1; i++){ const x = 150 + (i - (r + 1) / 2) * 34, y = 60 + r * 30; t += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#e8ecf5"/>'; }
      const cols = ['#ff4a5a', '#ff8a3a', '#ffcf3a', '#2fd27a', '#ffcf3a', '#ff8a3a', '#ff4a5a']; cols.forEach((c, i) => { t += '<rect x="' + (38 + i * 33) + '" y="248" width="29" height="26" rx="6" fill="' + c + '"/>'; });
      return '<g filter="url(#sh)">' + t + '</g>'; })() + '<circle cx="167" cy="132" r="15" fill="#ff4a8a" stroke="#fff" stroke-width="4" filter="url(#gl)"/>' + sparkles([[250, 60, 9], [50, 80, 6]])),

  croulette: svg(shadow,
    '<g filter="url(#sh)"><rect x="10" y="110" width="280" height="90" rx="16" fill="#141a30"/>' +
    ['#e0303a', '#262c40', '#e0303a', '#1f9a5a', '#262c40', '#e0303a', '#262c40'].map((c, i) => '<rect x="' + (18 + i * 39) + '" y="120" width="34" height="70" rx="8" fill="' + c + '"/>').join('') +
    '<path d="M150 82 L134 108 L166 108 Z" fill="#ffcf3a"/><rect x="146" y="104" width="8" height="104" rx="4" fill="#ffcf3a"/></g>' +
    '<g filter="url(#sh)"><circle cx="100" cy="245" r="26" fill="#e0303a"/><circle cx="160" cy="250" r="26" fill="#262c40"/><circle cx="215" cy="240" r="22" fill="#1f9a5a"/></g>' + sparkles([[60, 60, 8], [245, 70, 10]])),

  spindel4: '<img src="games/spindel4/assets/assets/images/spider.png" alt="" style="width:62%;filter:drop-shadow(0 12px 14px rgba(0,0,0,.5))">'
};
// give every cover its own id prefix so gradients and filters never clash between tiles
Object.keys(C).forEach(k => { C[k] = C[k].replace(/id="([^"]+)"/g, 'id="' + k + '-$1"').replace(/url\(#([^)]+)\)/g, 'url(#' + k + '-$1)'); });
window.ARCADE_COVERS = C;
})();
