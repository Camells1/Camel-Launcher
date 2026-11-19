/* Hangman Panic */
(function(){
const WORDS = {
  ANIMAL:['ELEPHANT','GIRAFFE','PENGUIN','KANGAROO','OCTOPUS','CHEETAH','DOLPHIN','HEDGEHOG','FLAMINGO','PLATYPUS','SQUIRREL','TORTOISE','LOBSTER','JAGUAR','GORILLA'],
  FOOD:['PIZZA','SPAGHETTI','PANCAKE','BURRITO','AVOCADO','PRETZEL','LASAGNA','CROISSANT','MEATBALL','PINEAPPLE','DUMPLING','POPCORN','BROCCOLI','CHEESECAKE','WAFFLE'],
  GAMING:['JOYSTICK','CONSOLE','CHECKPOINT','HIGHSCORE','POWERUP','RESPAWN','SPEEDRUN','CONTROLLER','MULTIPLAYER','ACHIEVEMENT','PLATFORMER','LEADERBOARD','ARCADE','PIXEL','COMBO'],
  SPACE:['GALAXY','ASTRONAUT','METEOR','SATELLITE','TELESCOPE','NEBULA','ROCKET','JUPITER','SATURN','ECLIPSE','ASTEROID','GRAVITY','UNIVERSE','COMET','ORBIT'],
  STUFF:['UMBRELLA','BACKPACK','LIGHTHOUSE','TRAMPOLINE','SKATEBOARD','HEADPHONES','CALENDAR','KEYBOARD','ROLLERCOASTER','SANDCASTLE','FIREWORKS','SUNGLASSES','MICROPHONE','DINOSAUR','TREASURE']
};
const ALPHA = 'QWERTYUIOPASDFGHJKLZXCVBNM';
function newWord(k){ const d = k.data, cat = k.pick(Object.keys(WORDS)); d.cat = cat; d.word = k.pick(WORDS[cat].filter(w => !d.used.includes(w))); d.used.push(d.word); d.guessed = new Set(); d.wrong = 0; render(k); }
function figure(n){
  const parts = ['<rect x="58" y="26" width="4" height="10" fill="#fff"/>','<circle cx="60" cy="44" r="8" fill="none" stroke="#fff" stroke-width="3"/>','<rect x="58" y="52" width="4" height="22" fill="#fff"/>','<rect x="46" y="56" width="14" height="3" fill="#fff" transform="rotate(-30 60 57)"/>','<rect x="60" y="56" width="14" height="3" fill="#fff" transform="rotate(30 60 57)"/>','<rect x="48" y="73" width="13" height="3" fill="#fff" transform="rotate(50 60 74)"/>','<rect x="59" y="73" width="13" height="3" fill="#fff" transform="rotate(-50 60 74)"/>'];
  return '<svg viewBox="0 0 100 100" style="width:110px;height:110px"><rect x="10" y="92" width="60" height="4" fill="#a87a4a"/><rect x="20" y="20" width="4" height="74" fill="#a87a4a"/><rect x="20" y="20" width="44" height="4" fill="#a87a4a"/>' + parts.slice(0, n + 1).join('') + '</svg>';
}
function render(k){
  const d = k.data, done = [...d.word].every(c => d.guessed.has(c));
  k.root.innerHTML = '<div class="kmsg">Category: <b style="color:#ffaa00">' + d.cat + '</b> · word ' + d.used.length + '</div><div style="display:flex;justify-content:center">' + figure(d.wrong) + '</div>' +
    '<div class="kbig" style="font-size:clamp(22px,' + Math.max(5, 11 - d.word.length * .4) + 'vw,40px);letter-spacing:6px">' + [...d.word].map(c => d.guessed.has(c) || d.reveal ? '<span style="color:' + (d.guessed.has(c) ? '#55ff55' : '#ff5555') + '">' + c + '</span>' : '_').join('') + '</div>' +
    '<div class="kmsg">Mistakes ' + d.wrong + '/6</div>' +
    '<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px;width:min(100%,440px);margin:0 auto">' + [...ALPHA].map(c => { const used = d.guessed.has(c), hit = d.word.includes(c); return '<button class="kcell" data-c="' + c + '" style="height:42px;font-size:15px;' + (used ? (hit ? 'background:#2f8f2a;' : 'background:#333;color:#666;') : '') + '"' + (used ? ' disabled' : '') + '>' + c + '</button>'; }).join('') + '</div>';
  k.root.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => guess(k, b.dataset.c)));
  return done;
}
function guess(k, c){
  const d = k.data; if (!k.running || d.guessed.has(c) || d.busy) return;
  d.guessed.add(c);
  if (d.word.includes(c)){ const n = [...d.word].filter(x => x === c).length; k.hit(5 * n, 200, 140); k.beep(600 + n * 100, .05); }
  else { d.wrong++; k.miss(); k.bad(); k.shake(4); }
  const solved = render(k);
  if (solved){ d.busy = true; const pts = d.word.length * 10 + (6 - d.wrong) * 25; k.add(pts, 200, 100, '#55ff55'); k.good(); k.flash('#55ff55', .15); setTimeout(() => { d.busy = false; if (k.running) newWord(k); }, 900); }
  else if (d.wrong >= 6){ d.reveal = true; render(k); k.boom(); k.over({ lines:['😵 The word was ' + d.word, 'Solved ' + (d.used.length - 1) + ' words'], delay:1200 }); }
}
Kit.def({
  dom:true, winAt:300,
  how:'Guess the hidden word one letter at a time (tap or type). 6 mistakes and the stick figure is done for. Solve a word to get the next one. Fewer mistakes = more points. How many words can you survive?',
  init(k){ const d = k.data; d.used = []; d.reveal = false; d.busy = false; newWord(k); },
  key(key, k){ if (/^[a-z]$/i.test(key)) guess(k, key.toUpperCase()); }
});
})();
