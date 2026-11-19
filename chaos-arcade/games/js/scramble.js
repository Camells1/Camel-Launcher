/* Word Scramble */
(function(){
const WORDS = 'APPLE BEACH CHAIR DANCE EAGLE FLAME GHOST HOUSE JUICE KNIFE LEMON MAGIC NIGHT OCEAN PIANO QUEEN RIVER SNAKE TIGER UNCLE VOICE WATER YOUTH ZEBRA BREAD CLOUD DREAM FRUIT GRAPE HEART LIGHT MONEY PARTY PLANT ROBOT SHEEP SMILE STORM TOAST TRAIN WORLD CANDY SPACE PIZZA LASER COMET STAR MOON GAME PLAY JUMP FIRE SNOW WIND RAIN CAKE FROG DUCK BIRD FISH TREE ROCK GOLD KING CASTLE DRAGON PLANET ROCKET JUNGLE BRIDGE CAMERA GUITAR MONKEY ORANGE PENCIL SUMMER WINTER BUTTON CIRCUS COOKIE FOREST GARDEN HAMMER ISLAND JACKET KITTEN LADDER MIRROR NAPKIN OYSTER PEPPER RABBIT SILVER TURTLE VELVET WIZARD YELLOW ANCHOR BALLOON CHICKEN DIAMOND FREEDOM GIRAFFE HISTORY JOURNEY KITCHEN LIBRARY MACHINE PENGUIN RAINBOW THUNDER VOLCANO WHISPER'.split(' ');
function next(k){
  const d = k.data, pool = WORDS.filter(w => w.length <= 4 + Math.min(3, Math.floor(d.n / 4)) && !d.used.has(w));
  d.word = k.pick(pool.length ? pool : WORDS); d.used.add(d.word);
  do { d.tiles = k.shuffle([...d.word]).map((c, i) => ({ c, id:i, used:false })); } while (d.tiles.map(t => t.c).join('') === d.word);
  d.pick = []; d.hinted = 0; render(k);
}
function render(k){
  const d = k.data, cur = d.pick.map(i => d.tiles[i].c).join('');
  k.root.innerHTML = '<div class="kmsg">Unscramble the word · solved ' + d.n + '</div>' +
    '<div class="krow" style="min-height:66px">' + [...d.word].map((_, i) => '<div style="width:clamp(38px,11vw,54px);height:clamp(46px,13vw,62px);border:3px solid ' + (i < d.hinted ? '#ffaa00' : '#55ffff') + ';display:flex;align-items:center;justify-content:center;font-size:clamp(22px,7vw,32px);background:rgba(0,0,0,.4)">' + (cur[i] || (i < d.hinted ? '<span style="opacity:.5">' + d.word[i] + '</span>' : '')) + '</div>').join('') + '</div>' +
    '<div class="krow">' + d.tiles.map((t, i) => '<button class="kcell" data-t="' + i + '" style="width:clamp(42px,12vw,58px);height:clamp(50px,14vw,66px);font-size:clamp(22px,7vw,32px);background:#d0a040;color:#3a2000;text-shadow:none;' + (d.pick.includes(i) ? 'visibility:hidden' : '') + '">' + t.c + '</button>').join('') + '</div>' +
    '<div class="krow"><button class="btn" id="wsBack">⌫</button><button class="btn" id="wsClear">CLEAR</button><button class="btn purple" id="wsHint">💡 HINT (−2s)</button><button class="btn red" id="wsSkip">SKIP (−5s)</button></div>';
  k.root.querySelectorAll('[data-t]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); add(k, +b.dataset.t); }));
  k.root.querySelector('#wsBack').addEventListener('click', () => { d.pick.pop(); render(k); });
  k.root.querySelector('#wsClear').addEventListener('click', () => { d.pick = []; render(k); });
  k.root.querySelector('#wsHint').addEventListener('click', () => { if (d.hinted < d.word.length - 1){ d.hinted++; k.addTime(-2); render(k); } });
  k.root.querySelector('#wsSkip').addEventListener('click', () => { k.addTime(-5); k.miss(); k.root.querySelector('.kmsg').textContent = 'It was ' + d.word; setTimeout(() => { if (k.running) next(k); }, 600); });
}
function add(k, i){
  const d = k.data; if (!k.running || d.pick.includes(i)) return;
  d.pick.push(i); k.beep(400 + d.pick.length * 70, .03); render(k);
  if (d.pick.length === d.word.length){
    const guess = d.pick.map(j => d.tiles[j].c).join('');
    if (guess === d.word || (WORDS.includes(guess) && [...guess].sort().join('') === [...d.word].sort().join(''))){ d.n++; k.hit(d.word.length * 10 - d.hinted * 5, 200, 60); k.good(); k.addTime(3); k.flash('#55ff55', .12); setTimeout(() => { if (k.running) next(k); }, 250); }
    else { k.bad(); k.shake(6); setTimeout(() => { d.pick = []; render(k); }, 350); }
  }
}
Kit.def({
  dom:true, winAt:300,
  how:'Tap the letter tiles (or type) to spell the hidden word. Each solve adds 3 seconds, and longer words appear as you go. Hints cost 2 seconds, skips cost 5. 60 seconds to start.',
  init(k){ const d = k.data; d.n = 0; d.used = new Set(); next(k); k.timer(60); },
  key(key, k){ const d = k.data; if (/^[a-z]$/i.test(key)){ const i = d.tiles.findIndex((t, j) => t.c === key.toUpperCase() && !d.pick.includes(j)); if (i >= 0) add(k, i); } else if (key === 'Backspace'){ d.pick.pop(); render(k); } },
  timeUp(k){ k.over({ lines:['🔀 Unscrambled ' + k.data.n + ' words'] }); }
});
})();
