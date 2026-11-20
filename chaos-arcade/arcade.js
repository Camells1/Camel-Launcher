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

/* ---------- Game catalogue ----------
   cat: block | action | reflex | puzzle | brain | luck | words | sports
   Block World games have their own page; all others run in games/play.html#id */
const CATS = {
  block:{n:'Block World', e:'⛏️'}, action:{n:'Action', e:'💥'}, reflex:{n:'Reflex', e:'⚡'}, puzzle:{n:'Puzzle', e:'🧩'},
  brain:{n:'Brain', e:'🧠'}, luck:{n:'Luck', e:'🎰'}, words:{n:'Words', e:'🔤'}, sports:{n:'Sports', e:'🏆'},
  casino:{n:'Casino', e:'🪙'}, originals:{n:'Originals', e:'🕷️'}
};
const CAT_BG = {
  action:['#2a1458','#3a1f7a','#1f0f44','#5a2fb0'], reflex:['#0f3a4a','#145a6a','#0a2a38','#1f8aa0'],
  puzzle:['#1a3a1a','#24502a','#122a12','#3a8a3a'], brain:['#4a1a3a','#6a2450','#341028','#a03a7a'],
  luck:['#4a3a0a','#6a5410','#342806','#b08a1a'], words:['#1a2a5a','#24387a','#101c40','#3a5ac0'],
  sports:['#5a2a0a','#7a3a10','#401c06','#c0601a'],
  casino:['#0a3a2a','#105a40','#062a1c','#1fb07a'], originals:['#e98d3a','#d07a2a','#f0a050','#fbedd8']
};
const BLOCK_GAMES = [
  {id:'crafting',  file:'game1.html',  t:'Cursed Crafting Quiz',    e:'🛠️', d:'medium', tag:'QUIZ',
   desc:'Real or cursed? Guess what the 3×3 grid crafts before the creeper blows.', bg:['#866043','#6c4b33','#9a7451','#5b3d26'], icon:'table'},
  {id:'mlg',       file:'game2.html',  t:'MLG Water Bucket Drop',   e:'🪣', d:'hard',   tag:'REFLEX',
   desc:'Fall from insane heights. Place water at the last possible millisecond.', bg:['#6fa8ff','#5b95f0','#86b9ff','#4a82dd'], icon:'bucket'},
  {id:'sweeper',   file:'game3.html',  t:'Creeper Minesweeper',     e:'💥', d:'medium', tag:'PUZZLE',
   desc:'Dig the grass, flag creepers with cats, and do NOT wake the family.', bg:['#5fbf3a','#4fa82f','#76d14e','#3f9a2e'], icon:'creeper'},
  {id:'villager',  file:'game4.html',  t:'Villager Scam Simulator', e:'🧑‍🌾', d:'medium', tag:'TRADING',
   desc:'Haggle 1 dirt into a Mending book before the villager locks you out.', bg:['#b98a6a','#a87a5a','#c99a7a','#8a6a4a'], icon:'villager'},
  {id:'obsidian',  file:'game5.html',  t:'Obsidian Speed-Mine',     e:'⛏️', d:'easy',   tag:'CLICKER',
   desc:'Tap-frenzy through obsidian with escalating, increasingly cursed tools.', bg:['#140f1f','#241a36','#1a1426','#3b2a57'], icon:'obsidian'},
  {id:'wordle',    file:'game6.html',  t:'Block Wordle',            e:'🔤', d:'medium', tag:'WORDS',
   desc:'Guess the 5-letter block, mob or item in 6 tries.', bg:['#7a7a7a','#6a6a6a','#8a8a8a','#5a5a5a'], icon:'wordle'},
  {id:'nether2048',file:'game7.html',  t:'2048: Nether Edition',    e:'🔥', d:'medium', tag:'MERGE',
   desc:'Merge Netherrack all the way up to a Netherite Ingot.', bg:['#5a1f1f','#6b2a2a','#4a1818','#7d3535'], icon:'netherite'},
  {id:'redstone',  file:'game8.html',  t:'Redstone Memory Matrix',  e:'🔴', d:'hard',   tag:'MEMORY',
   desc:'Repeat the glowing lamp sequence. Note blocks included.', bg:['#3a2a20','#2a1d15','#4a3528','#1f150f'], icon:'lamp'},
  {id:'potion',    file:'game9.html',  t:'Potion Brewer Roulette',  e:'🧪', d:'chaos',  tag:'LUCK',
   desc:'Brew weird ingredients and survive whatever effect you get.', bg:['#3a1f4a','#2a1438','#4a2a5a','#1f0f2a'], icon:'potion'},
  {id:'runner',    file:'game10.html', t:'Mob Dodge Runner',        e:'🏃', d:'hard',   tag:'RUNNER',
   desc:'Endless runner: jump creepers, dodge arrows, avoid lava.', bg:['#87c4ff','#76b5f5','#98d0ff','#5fa0e8'], icon:'arrow'}
].map(g => Object.assign(g, { cat:'block' }));
// [id, title, emoji, difficulty, category, description]
const NEW_GAMES = [
  ['snake','Neon Snake','🐍','easy','action','Eat, grow, speed up. Golden apples are worth 5x.'],
  ['breakout','Brick Smash','🧱','easy','action','Smash every brick. Catch power-ups for multiball and laser chaos.'],
  ['flappy','Jetpack Bird','🐤','hard','action','Tap to flap through the pipes. One touch and it is over.'],
  ['invaders','Alien Rush','👾','medium','action','Blast waves of descending aliens before they land.'],
  ['spacedodge','Rock Blaster','☄️','medium','action','Steer your ship, auto-fire, and split the space rocks.'],
  ['pong','Pong Panic','🏓','easy','action','Beat the robot paddle. The ball gets faster every hit.'],
  ['blockdrop','Block Drop','🟪','medium','action','Falling block puzzle. Clear lines, chain combos, go fast.'],
  ['stacker','Tower Stack','🏗️','easy','action','Drop each floor perfectly. Miss and your tower shrinks.'],
  ['skyhopper','Sky Hopper','🦘','medium','action','Bounce up endless platforms. Do not look down.'],
  ['crosser','Road Crosser','🐸','medium','action','Hop across roads and rivers. Cars do not brake.'],
  ['citydefense','City Defense','🏙️','medium','action','Tap the sky to blow up missiles before they hit your city.'],
  ['slice','Slice Frenzy','🍉','easy','action','Swipe to slice flying fruit. Never slice the bombs.'],
  ['lightcycle','Light Cycle','🏍️','hard','action','Neon bike duel. Trap the robot inside your trail.'],
  ['puck','Puck Wars','🏒','medium','action','Air hockey against a cheating robot. First to 7.'],
  ['whack','Whack-a-Mole','🔨','easy','action','Bonk the moles, spare the bunnies, chase the golden mole.'],
  ['eggcatch','Egg Catcher','🥚','easy','action','Catch the eggs, dodge the bombs, keep your basket alive.'],
  ['aim','Aim Trainer','⭕','medium','reflex','Click targets before they vanish. They keep getting smaller.'],
  ['tiles','Piano Tiles','🎹','hard','reflex','Tap only the black tiles. Speed goes up. Do not miss.'],
  ['gravity','Gravity Flip','🔄','hard','reflex','Tap to flip gravity and dodge the spikes.'],
  ['reaction','Reaction Test','🚦','easy','reflex','Wait for green, then tap. How many milliseconds are you?'],
  ['slide15','Slide Puzzle','🔢','medium','puzzle','Slide the tiles into order in as few moves as possible.'],
  ['lightsout','Lights Out','💡','medium','puzzle','Each tap flips a plus shape. Turn every light off.'],
  ['pairs','Emoji Pairs','🃏','easy','puzzle','Flip two cards, find matching emoji, beat the clock.'],
  ['codebreaker','Code Breaker','🔐','medium','puzzle','Crack the secret 4-color code in 8 guesses.'],
  ['floodit','Flood It','🌊','medium','puzzle','Flood the whole board with one color in limited moves.'],
  ['connect4','Connect Four','🔴','medium','puzzle','Drop discs and connect four before the robot does.'],
  ['tictactoe','Tic-Tac-Boom','❌','easy','puzzle','Tic-tac-toe vs a robot with three difficulty moods.'],
  ['maze','Maze Escape','🌀','easy','puzzle','Escape random mazes against the clock. They keep growing.'],
  ['sudoku','Sudoku Sprint','9️⃣','hard','puzzle','Fresh sudoku every game. Fill the grid, fewer mistakes = more points.'],
  ['mathsprint','Math Sprint','➗','medium','brain','Solve as many sums as you can in 60 seconds.'],
  ['stroop','Color Chaos','🎨','medium','brain','Tap the COLOR of the word, not what it says. Brain melts.'],
  ['numbermemory','Number Memory','🧠','hard','brain','Memorize the number. It gets one digit longer every round.'],
  ['chimp','Chimp Test','🐒','hard','brain','Remember where the numbers were, then tap them in order.'],
  ['typing','Type Racer','⌨️','medium','brain','Type the words as fast as you can. Words per minute counts.'],
  ['higherlower','Higher or Lower','📈','easy','brain','Will the next card be higher or lower? Build a streak.'],
  ['oddemoji','Odd One Out','👀','medium','brain','Find the one emoji that is different. Fast.'],
  ['blackjack','Blackjack 21','♠️','medium','luck','Beat the dealer to 21. Turn 100 chips into a fortune.'],
  ['slots','Chaos Slots','🎰','chaos','luck','Spin the reels, chase jackpots, avoid going broke.'],
  ['plinko','Plinko Drop','🟡','easy','luck','Drop balls through the pegs and pray for the edges.'],
  ['rocket','Rocket Cashout','🚀','chaos','luck','The multiplier climbs. Cash out before the rocket explodes.'],
  ['hangman','Hangman Panic','😵','easy','words','Guess the word letter by letter before the stick figure falls.'],
  ['scramble','Word Scramble','🔀','medium','words','Unscramble as many words as you can in 60 seconds.'],
  ['emojiriddle','Emoji Riddles','🤔','medium','words','Guess the movie, song or thing from the emoji clue.'],
  ['hoops','Hoop Shot','🏀','medium','sports','Flick the ball into the moving hoop. Swish for bonus.'],
  ['penalty','Penalty Kick','⚽','easy','sports','Aim, power, shoot. The goalie gets smarter each round.'],
  ['minigolf','Mini Golf','⛳','medium','sports','Drag and shoot through 9 tricky holes. Count your strokes.'],
  ['darts','Dart Toss','🎯','medium','sports','Time your throw on the wobbling aim. Bullseye pays big.'],
  ['tankduel','Tank Duel','💣','medium','action','Artillery battle vs a bot. Angle, power and wind decide everything.'],
  ['cavecopter','Cave Copter','🚁','hard','action','Hold to rise, let go to fall. The cave keeps getting tighter.'],
  ['laneracer','Lane Racer','🏎️','easy','action','Swerve between lanes, dodge traffic, grab nitro.'],
  ['zombies','Zombie Siege','🧟','medium','action','Zombies close in from every side. Tap them before they reach you.'],
  ['bullethell','Bullet Hell','🌀','hard','action','Weave through spiraling bullet patterns. Survive as long as you can.'],
  ['colorgate','Color Gate','🎨','hard','action','Jump through rotating rings, only through your own color.'],
  ['duckshoot','Duck Shoot','🦆','easy','action','Classic shooting gallery. Hit ducks, avoid the dogs, watch your ammo.'],
  ['fishing','Fishing Frenzy','🎣','easy','action','Drop your hook, catch fish on the way up, avoid the jellyfish.'],
  ['meteor','Meteor Miner','⛏️','medium','action','Tap falling meteors to mine them before they smash the planet.'],
  ['arena','Snake Arena','🐉','hard','action','Snake vs three hungry AI snakes. Eat or be eaten.'],
  ['paperplane','Paper Plane','✈️','medium','action','Tilt your paper plane through a windy obstacle course.'],
  ['cps','Click Speed','👆','easy','reflex','How many taps can you do in 10 seconds?'],
  ['stopclock','Stop the Clock','⏱️','medium','reflex','Stop the timer at exactly 10.00 seconds. Then it gets harder.'],
  ['bubblepop','Bubble Pop','🫧','easy','reflex','Pop the rising bubbles. Same colors in a row = combo.'],
  ['quickdraw','Quick Draw','🤠','medium','reflex','Wild west duel. Draw when it says DRAW, not a moment before.'],
  ['numberrush','Number Rush','🔟','medium','reflex','Tap 1 to 25 in order as fast as you can.'],
  ['pipes','Pipe Connect','🚰','medium','puzzle','Rotate the pipes so water flows from start to every tap.'],
  ['match3','Gem Swap','💎','easy','puzzle','Swap gems to match 3 or more. Chain cascades for huge combos.'],
  ['blockblast','Block Blast','🟩','medium','puzzle','Fit pieces on the 8×8 board. Fill rows and columns to clear them.'],
  ['collapse','Collapse','🟥','easy','puzzle','Tap groups of 2+ same-color blocks. Bigger groups score way more.'],
  ['hanoi','Tower of Hanoi','🗼','medium','puzzle','Move the whole tower, one disc at a time, never big on small.'],
  ['pegs','Peg Solitaire','📍','hard','puzzle','Jump pegs to remove them. Can you leave just one?'],
  ['ballsort','Ball Sort','🧪','medium','puzzle','Sort the colored balls so each tube holds one color.'],
  ['picross','Picross','🖼️','hard','puzzle','Use the number clues to paint the hidden pixel picture.'],
  ['tiletriple','Tile Triple','🀄','medium','puzzle','Pick tiles into your tray. Three of a kind vanish. Do not fill the tray.'],
  ['trivia','Trivia Blitz','❓','medium','brain','Fast general knowledge questions. Speed pays.'],
  ['capitals','Capital Cities','🏛️','medium','brain','Name the capital city before the timer runs out.'],
  ['sequences','Number Sequences','🔢','hard','brain','Spot the pattern and pick the next number.'],
  ['visualmem','Visual Memory','🟦','medium','brain','Remember which squares lit up. The grid keeps growing.'],
  ['countit','Count It','🔵','medium','brain','Shapes flash for a moment. How many did you see?'],
  ['factorcap','Fact or Cap','🧢','easy','brain','True fact or total cap? Decide fast.'],
  ['roulette','Roulette','🎡','chaos','luck','Bet on red, black, odd, even or a single number. Spin!'],
  ['dicepoker','Dice Poker','🎲','medium','luck','Roll five dice, hold the good ones, chase a full house.'],
  ['scratch','Scratch Cards','🎫','easy','luck','Scratch to reveal symbols. Three matching = prize.'],
  ['gemmines','Gem Mines','💣','chaos','luck','Pick tiles to find gems, avoid mines, cash out in time.'],
  ['doubleornothing','Double or Nothing','🪙','chaos','luck','Call the coin flip. Keep doubling or walk away.'],
  ['wordsearch','Word Search','🔍','easy','words','Find all hidden words in the letter grid. Drag to select.'],
  ['wordrain','Word Rain','🌧️','medium','words','Type the falling words before they hit the ground.'],
  ['missingletter','Missing Letter','🔡','easy','words','Pick the letter that completes the word.'],
  ['opposites','Opposites','↔️','easy','words','Pick the opposite of the word. Quick!'],
  ['typohunter','Typo Hunter','🕵️','medium','words','Three words are spelled right. Find the typo.'],
  ['bowling','Bowling','🎳','medium','sports','Aim, spin and knock down the pins. 10 frames.'],
  ['archery','Archery','🏹','medium','sports','Draw, aim and mind the wind. Hit the gold.'],
  ['bladetoss','Blade Toss','🗡️','hard','reflex','Stick blades in a spinning log. Never hit another blade.'],
  ['colorecho','Color Echo','🎵','medium','brain','Repeat the growing color sequence. How long can you go?'],
  ['rockblaster','Rock Blaster','☄️','medium','action','Turret in space. Split the rocks before they hit you.'],
  ['rhythm','Rhythm Tap','🎶','hard','reflex','Four lanes, one beat. Hit the notes on the line.'],
  ['bounceblitz','Bounce Blitz','⚪','medium','puzzle','Aim a volley of balls and smash the numbered blocks.'],
  // Casino: bets use the shared 🪙 wallet; every game pays back 97.5% on average (2.5% house edge)
  ['cdice','Dice','🎲','chaos','casino','Pick your win chance, roll under it. 97.5% RTP.','casino.html#dice'],
  ['crash','Crash','📈','chaos','casino','Ride the rocket multiplier and cash out before it crashes.','casino.html#crash'],
  ['coinflip','Coin Flip','🪙','chaos','casino','Heads or tails for 1.95x your bet.','casino.html#coinflip'],
  ['mines','Mines','💣','chaos','casino','Uncover gems, dodge the mines, cash out any time.','casino.html#mines'],
  ['limbo','Limbo','🎯','chaos','casino','Set a target multiplier. Will the result fly past it?','casino.html#limbo'],
  ['hilo','Hi-Lo','🃏','chaos','casino','Higher or lower? Stack correct guesses, cash out any time.','casino.html#hilo'],
  ['wheel','Wheel','🎡','chaos','casino','Spin the 40-slice wheel. Low, medium or high risk.','casino.html#wheel'],
  ['towers','Towers','🗼','chaos','casino','Climb 8 rows of blocks. Each safe row multiplies your bet.','casino.html#towers'],
  ['keno','Keno','🔢','chaos','casino','Pick up to 10 of 40 numbers. 10 are drawn.','casino.html#keno'],
  ['cplinko','Plinko Drop','📍','chaos','casino','Drop balls through the pegs. Edge buckets pay big.','casino.html#plinko'],
  ['croulette','Color Roulette','🔴','chaos','casino','Red, black or the rare green 24×.','casino.html#roulette'],
  // Originals: full games built outside the arcade
  ['spindel4','Spindel 4','🕷️','medium','originals','Think smart, get 4 in a row on the spider web. Play the computer or a friend.','spindel4.html']
].map(([id, t, e, d, cat, desc, file]) => ({ id, t, e, d, cat, desc, file:file || 'play.html#' + id, tag:CATS[cat].n.toUpperCase(), bg:CAT_BG[cat] }));
const GAMES = BLOCK_GAMES.concat(NEW_GAMES).map((g, i) => Object.assign(g, { n:i + 1, ready:true }));

const RANKS = [
  {xp:0,     t:'Button Masher',     i:'🕹️', c:'#c8c8c8'},
  {xp:150,   t:'Coin-Op Rookie',    i:'🪙', c:'#f5d73a'},
  {xp:450,   t:'High Score Hunter', i:'🎯', c:'#ff7a5a'},
  {xp:1000,  t:'Combo Machine',     i:'⚡', c:'#ffff55'},
  {xp:2000,  t:'Arcade Ace',        i:'💎', c:'#4aedd9'},
  {xp:3500,  t:'Pixel Wizard',      i:'👾', c:'#b05ad6'},
  {xp:6000,  t:'Final Boss',        i:'👑', c:'#ffaa00'},
  {xp:10000, t:'Chaos God',         i:'😈', c:'#ff55ff'}
];

/* ---------- Storage ---------- */
/* ---------- Coin economy ----------
   Income: 5 🪙 per XP from games, quests and the chest (game income capped per day), the daily chest,
   hourly chat giveaways and a small refill when broke. Spending: casino bets (2.5% house edge).
   Grinding alone reaches 1,000,000 in about 6 weeks of daily play; the casino can get you there faster (or not). */
const START_COINS = 2500, COINS_PER_XP = 5, DAILY_EARN_CAP = 25000, REFILL = 500, REFILL_BELOW = 50;
const COIN_GOALS = [[10000,'coins10k','💰','Five Figures (10,000 🪙)'], [100000,'coins100k','🤑','High Roller (100,000 🪙)'], [1000000,'coins1m','👑','MILLIONAIRE (1,000,000 🪙)']];
function blank(){ return { xp:0, coins:START_COINS, name:'', muted:false, fav:{}, games:{}, plays:0, wins:0, lastChest:'', chestStreak:0, lastVisit:'', ach:{}, pid:'', tops:{}, day:null }; }
let state;
function load(){
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e){}
  state = Object.assign(blank(), saved);
  state.games = saved.games || {}; state.ach = saved.ach || {}; state.tops = saved.tops || {}; state.fav = saved.fav || {};
  if (typeof saved.coins !== 'number' || !isFinite(saved.coins)) state.coins = START_COINS;
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
  const ready = GAMES.filter(g => g.ready && g.cat !== 'casino' && g.cat !== 'originals');
  const r = mulberry32(hashStr('featured|' + dayKey()));
  return ready[Math.floor(r() * ready.length)] || GAMES[0];
}
function gameById(id){ return GAMES.find(g => g.id === id); }

/* Add XP from anywhere. Returns the XP actually granted. */
let lastEarn = 0;
function addXP(amount, reason){
  amount = Math.max(0, Math.round(amount));
  if (!amount) return 0;
  load();
  const before = rankInfo().idx;
  state.xp += amount; const day = today(); day.xp += amount;
  // every XP also pays coins, up to the daily earning cap
  const earn = Math.max(0, Math.min(amount * COINS_PER_XP, DAILY_EARN_CAP - (day.coins || 0)));
  lastEarn = earn;
  if (earn){ day.coins = (day.coins || 0) + earn; state.coins += earn; coinGoals(); }
  save(); syncSoon();
  const after = rankInfo();
  toast('+' + amount + ' XP' + (earn ? ' · +' + earn + ' 🪙' : '') + (reason ? ' · ' + reason : ''));
  if (after.idx > before){
    setTimeout(() => { achToast(after.rank.i, 'RANK UP!', after.rank.t); Sfx.levelup(); }, 600);
  }
  updateBar();
  return amount;
}

/* ---------- 🪙 Coin wallet (virtual, just for fun) ---------- */
let coinSubmitT;
function coins(){ load(); return state.coins; }
function addCoins(n, reason, quiet){
  n = Math.round(n); if (!n) return 0;
  load(); state.coins = Math.max(0, state.coins + n); if (n > 0) coinGoals(); save(); syncSoon(); updateBar();
  if (!quiet) toast((n > 0 ? '+' : '') + n + ' 🪙' + (reason ? ' · ' + reason : ''));
  clearTimeout(coinSubmitT); coinSubmitT = setTimeout(() => { if (state.coins > 0) lbSubmit('coins', state.coins).catch(() => {}); }, 3000);
  return n;
}
/* ---------- 💎 VIP ranks (casino wagering) ----------
   Every coin bet in the casino counts as "wagered", win or lose. Ranks never reset.
   rb     = rakeback: % of the house edge on every bet paid back (claim any time)
   daily  = % of yesterday's wagers, claimable once a day
   weekly = % of the last 7 days' wagers, claimable every 7 days (from rank 2)
   bonus  = one-time coins when you reach the rank                                  */
const VIP_TIERS = [
  { id:'pebble',   n:'Pebble',   need:0,            rb:2,   daily:.04,  weekly:0,     c:'#9aa3b5', perks:['The daily bonus, from your first bet'] },
  { id:'amber',    n:'Amber',    need:250e6,        rb:3,   daily:.045, weekly:.015,  c:'#e8a04a', perks:['The weekly bonus unlocks','A bigger daily share'] },
  { id:'steel',    n:'Steel',    need:1e9,          rb:4,   daily:.05,  weekly:.017,  c:'#c4ccd8', perks:['Bigger daily and weekly shares'] },
  { id:'topaz',    n:'Topaz',    need:10e9,         rb:4.5, daily:.055, weekly:.019,  c:'#ffd23a', perks:['Your rank gem shows beside your name'] },
  { id:'sapphire', n:'Sapphire', need:25e9,         rb:5,   daily:.06,  weekly:.021,  c:'#4a7aff', perks:['Bigger daily and weekly shares'] },
  { id:'ruby',     n:'Ruby',     need:50e9,         rb:5.5, daily:.065, weekly:.023,  c:'#ff4a5a', perks:['A bigger weekly share'] },
  { id:'crystal',  n:'Crystal',  need:100e9,        rb:6.5, daily:.07,  weekly:.025,  c:'#7ae8ff', perks:['A bigger daily share'] },
  { id:'jade',     n:'Jade',     need:200e9,        rb:7,   daily:.075, weekly:.027,  c:'#3ad08a', perks:['A bigger daily and weekly share'] },
  { id:'obsidian', n:'Obsidian', need:500e9,        rb:8,   daily:.085, weekly:.03,   c:'#9a6aff', perks:['The best shares below Nova'] },
  { id:'nova',     n:'Nova',     need:750e9,        rb:9,   daily:.095, weekly:.033,  c:'#ffffff', perks:['The biggest daily and weekly shares','The highest rank in the arcade'] }
];
VIP_TIERS.forEach(t => t.bonus = Math.round(t.need * .00002));
const DAY_MS = 864e5;
function vipState(){ load(); const v = state.vip || (state.vip = {}); v.total = v.total || 0; v.days = v.days || {}; v.rb = v.rb || 0; v.tier = v.tier || 0; return v; }
function vipTierIdx(total){ let i = 0; VIP_TIERS.forEach((t, k) => { if (total >= t.need) i = k; }); return i; }
function vipWager(amount, edge){
  amount = Math.max(0, Math.floor(amount)); if (!amount) return;
  const v = vipState(), t = VIP_TIERS[vipTierIdx(v.total)], d = dayKey();
  v.total += amount; v.days[d] = (v.days[d] || 0) + amount; if (!v.firstTs) v.firstTs = Date.now();
  v.rb += amount * (edge || .025) * t.rb / 100;
  Object.keys(v.days).sort().slice(0, -9).forEach(k => delete v.days[k]);   // keep ~9 days
  const ni = vipTierIdx(v.total);
  if (ni > v.tier){ for (let i = v.tier + 1; i <= ni; i++){ const nt = VIP_TIERS[i]; state.coins += nt.bonus; setTimeout(() => { achToast('💎', 'VIP RANK UP!', nt.n + ' · +' + nt.bonus.toLocaleString('en-US') + ' 🪙'); bigText('💎 ' + nt.n.toUpperCase() + '!', nt.c); Sfx.levelup(); }, 400); } v.tier = ni; }
  save(); syncSoon();
}
function vipDayKey(offset){ const d = new Date(Date.now() + offset * DAY_MS); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function vipInfo(){
  const v = vipState(), i = vipTierIdx(v.total), t = VIP_TIERS[i], next = VIP_TIERS[i + 1] || null;
  const yWager = v.days[vipDayKey(-1)] || 0;
  let week = 0; for (let k = 1; k <= 7; k++) week += v.days[vipDayKey(-k)] || 0;
  const dailyReady = v.lastDaily !== dayKey(), weeklyAt = (v.lastWeekly || v.firstTs || Date.now()) + 7 * DAY_MS;
  return { total:v.total, tier:i, t, next, frac:next ? (v.total - t.need) / (next.need - t.need) : 1, rb:Math.floor(v.rb),
    daily:{ ready:dailyReady, amount:Math.floor(yWager * t.daily / 100), base:yWager },
    weekly:{ unlocked:t.weekly > 0, ready:t.weekly > 0 && Date.now() >= weeklyAt, at:weeklyAt, amount:Math.floor(week * t.weekly / 100), base:week },
    today:v.days[dayKey()] || 0 };
}
function vipClaim(kind){
  const info = vipInfo(), v = vipState(); let amt = 0;
  if (kind === 'rb'){ amt = info.rb; v.rb -= amt; }
  if (kind === 'daily'){ if (!info.daily.ready) return 0; amt = info.daily.amount; v.lastDaily = dayKey(); }
  if (kind === 'weekly'){ if (!info.weekly.ready) return 0; amt = info.weekly.amount; v.lastWeekly = Date.now(); }
  save(); if (amt > 0) addCoins(amt, kind === 'rb' ? 'rakeback' : kind + ' bonus'); else syncSoon();
  return amt;
}

/* ---------- 🎯 Casino daily quests + bet reporting ----------
   Three quests a day (one easy, one medium, one hard, the same for everyone), each paying coins;
   finishing all three pays a bonus. Only bets of 10 coins or more count. */
const CQ_POOL = {
  easy:  [ { id:'win20',  t:'Win 20 bets',      d:'Win 20 bets that pay 1.9× or more.', goal:20,    r:1000,  f:(b, m) => m >= 1.9 },
           { id:'play60', t:'Place 60 bets',    d:'Place 60 bets on any casino game.',  goal:60,    r:1000,  f:() => true } ],
  medium:[ { id:'hit10',  t:'Hit 10×',          d:'Win a bet of 100 🪙 or more at 10× or better.', goal:1, r:3000, f:(b, m) => b >= 100 && m >= 10 },
           { id:'wag25',  t:'Wager 25,000',     d:'Bet 25,000 🪙 in total today.',      goal:25000, r:2500,  f:(b) => true, amt:true } ],
  hard:  [ { id:'hit100', t:'Hit 100×',         d:'Win any bet at 100× or better.',      goal:1,     r:10000, f:(b, m) => m >= 100 },
           { id:'win150', t:'Win 150 bets',     d:'Win 150 bets that pay 1.9× or more, 100 🪙 or more each.', goal:150, r:8000, f:(b, m) => b >= 100 && m >= 1.9 } ]
};
const CQ_BONUS = 5000;
function cqToday(){
  load(); const d = dayKey(), r = mulberry32(hashStr('cq|' + d));
  if (!state.cq || state.cq.date !== d) state.cq = { date:d, prog:{}, done:{}, bonus:false };
  return ['easy','medium','hard'].map(lv => Object.assign({ lv }, CQ_POOL[lv][Math.floor(r() * CQ_POOL[lv].length)]));
}
function cqInfo(){ const qs = cqToday(); return { quests:qs.map(q => ({ id:q.id, lv:q.lv, t:q.t, d:q.d, goal:q.goal, r:q.r, prog:Math.min(q.goal, state.cq.prog[q.id] || 0), done:!!state.cq.done[q.id] })), bonus:CQ_BONUS, bonusDone:state.cq.bonus }; }
let betQueue = [], betFlushT = 0;
function casinoBet(game, bet, mult){
  bet = Math.floor(bet); if (!(bet >= 1)) return;
  const qs = cqToday();
  if (bet >= 10) qs.forEach(q => { if (state.cq.done[q.id] || !q.f(bet, mult)) return; state.cq.prog[q.id] = (state.cq.prog[q.id] || 0) + (q.amt ? bet : 1);
    if (state.cq.prog[q.id] >= q.goal){ state.cq.done[q.id] = true; state.coins += q.r; setTimeout(() => { achToast('🎯', 'QUEST DONE', q.t + ' · +' + q.r.toLocaleString('en-US') + ' 🪙'); Sfx.ach ? Sfx.ach() : Sfx.coin(); updateBar(); }, 200); } });
  if (!state.cq.bonus && qs.every(q => state.cq.done[q.id])){ state.cq.bonus = true; state.coins += CQ_BONUS; setTimeout(() => { bigText('🎯 ALL QUESTS! +' + CQ_BONUS.toLocaleString('en-US') + ' 🪙', '#ffd23a'); }, 900); }
  save(); syncSoon();
  if (state.auth){ betQueue.push({ g:game, b:bet, m:Math.round(mult * 100) / 100 }); if (!betFlushT) betFlushT = setTimeout(flushBets, 2500); }
}
function flushBets(){ betFlushT = 0; if (!betQueue.length || !state.auth) return; const list = betQueue.splice(0, 25); api('bets', { bets:list }).catch(() => {}); if (betQueue.length) betFlushT = setTimeout(flushBets, 2500); }
addEventListener('pagehide', () => { if (betQueue.length && state.auth && navigator.sendBeacon){ /* best effort; the API needs the auth header, so just try a normal flush */ flushBets(); } });

function coinGoals(){ COIN_GOALS.forEach(([n, id, ic, name]) => { if (state.coins >= n && !state.ach[id]) setTimeout(() => { unlock(id, ic, name); if (n >= 1000000){ bigText('👑 MILLIONAIRE!', '#ffd23a'); confetti && confetti(); } }, 300); }); }
function coinInfo(){ load(); const d = today(); return { coins:state.coins, earnedToday:d.coins || 0, cap:DAILY_EARN_CAP, perXP:COINS_PER_XP, refill:REFILL, refillBelow:REFILL_BELOW, goals:COIN_GOALS.map(g => g[0]) }; }
function spendCoins(n){ n = Math.round(n); load(); if (!(n > 0) || n > state.coins) return false; state.coins -= n; save(); syncSoon(); updateBar(); return true; }

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
  if (opts.medal && opts.medal > (g.medal || 0)) g.medal = opts.medal;
  g.last = dayKey(); g.ts = Date.now();
  let xp = Math.max(5, Math.round(opts.xp || 0));
  const feat = featuredGame().id === id;
  if (feat) xp *= 2;
  g.xp += xp;
  if (typeof opts.score === 'number' && opts.score > 0){
    const t = (state.tops[id] || []).concat([{ s:Math.round(opts.score), l:opts.label || '', d:dayKey() }]);
    t.sort((a, b) => b.s - a.s); state.tops[id] = t.slice(0, 10);
  }
  const day = today(); day.plays++; day.games[id] = 1; if (opts.win) day.wins++;
  const gm = gameById(id); if (gm) day.cats[gm.cat] = (day.cats[gm.cat] || 0) + 1;
  save();
  const granted = addXP(xp, feat ? '⭐ 2x Game of the Day' : (newBest ? '🏆 New best!' : ''));
  checkQuests();
  const lbp = (typeof opts.score === 'number' && opts.score > 0) ? lbSubmit(id, Math.round(opts.score)) : Promise.resolve(null);
  lbp.catch(() => {});
  clearTimeout(xpSubmitT); xpSubmitT = setTimeout(() => { lbSubmit('xp', state.xp).catch(() => {}); }, 5000);
  // arcade-wide milestones
  const tried = GAMES.filter(x => state.games[x.id] && state.games[x.id].plays).length;
  if (tried >= 3) unlock('explorer', '🧭', 'Arcade Explorer');
  if (tried >= 10) unlock('completionist', '🏅', 'Tried Every Game');
  if (state.plays >= 25) unlock('regular', '🎮', 'Arcade Regular');
  return { xp:granted, coins:granted ? lastEarn : 0, newBest, featured:feat, lb:lbp };
}
function unlock(id, icon, name){
  if (state.ach[id]) return;
  state.ach[id] = Date.now(); save();
  setTimeout(() => { achToast(icon, 'Advancement Made!', name); Sfx.ach(); }, 1200);
}
function gameStats(id){ load(); return state.games[id] || { best:0, bestLabel:'', plays:0, wins:0, xp:0 }; }

/* ---------- Daily quests ---------- */
let xpSubmitT = 0;
function today(){
  if (!state.day || state.day.date !== dayKey()) state.day = { date:dayKey(), plays:0, games:{}, wins:0, xp:0, cats:{}, done:{} };
  return state.day;
}
function quests(){
  const r = mulberry32(hashStr('quests|' + dayKey()));
  const cats = Object.keys(CATS).filter(c => c !== 'block');
  const cat = cats[Math.floor(r() * cats.length)], feat = featuredGame();
  const pool = [
    {id:'plays',    t:'Play 5 runs of anything',            goal:5,   get:d => d.plays,                 xp:80},
    {id:'distinct', t:'Play 4 different games',             goal:4,   get:d => Object.keys(d.games).length, xp:120},
    {id:'wins',     t:'Win 3 runs',                         goal:3,   get:d => d.wins,                  xp:120},
    {id:'cat',      t:'Play 3 ' + CATS[cat].n + ' games',   goal:3,   get:d => d.cats[cat] || 0,        xp:100},
    {id:'xp',       t:'Earn 400 XP today',                  goal:400, get:d => d.xp,                    xp:100},
    {id:'feat',     t:'Play the Game of the Day (' + feat.t + ')', goal:1, get:d => d.games[feat.id] ? 1 : 0, xp:60},
    {id:'block',    t:'Play 2 Block World games',           goal:2,   get:d => d.cats.block || 0,       xp:90}
  ];
  const picked = [];
  while (picked.length < 3){ const q = pool[Math.floor(r() * pool.length)]; if (!picked.includes(q)) picked.push(q); }
  const d = today();
  return picked.map(q => ({ id:q.id, t:q.t, goal:q.goal, xp:q.xp, have:Math.min(q.goal, q.get(d)), done:!!d.done[q.id] }));
}
function checkQuests(){
  const d = today();
  quests().forEach(q => {
    if (!q.done && q.have >= q.goal){
      d.done[q.id] = true; save();
      setTimeout(() => { achToast('📜', 'Quest complete! +' + q.xp + ' XP', q.t); Sfx.ach(); addXP(q.xp, 'Daily quest'); }, 1600);
    }
  });
}

/* ---------- Leaderboards (scores.php on your host; device-only fallback) ---------- */
const LB_URL = ROOT + 'scores.php';
function playerId(){
  if (!state.pid){
    const a = new Uint32Array(4);
    try { crypto.getRandomValues(a); } catch(e){ for (let i=0;i<4;i++) a[i] = Math.floor(Math.random() * 4294967296); }
    state.pid = Array.from(a).map(n => n.toString(36).padStart(7,'0')).join('').slice(0, 28); save();
  }
  return state.pid;
}
let lbDown = !/^https?:/.test(location.protocol);
async function lbCall(params, body){
  if (lbDown) throw new Error('offline');
  const ctrl = window.AbortController ? new AbortController() : null;
  const to = setTimeout(() => { if (ctrl) ctrl.abort(); }, 7000);
  try {
    const opts = body ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) } : { cache:'no-store', headers:{} };
    if (state.auth && state.auth.token) opts.headers['X-Auth'] = state.auth.token;
    if (ctrl) opts.signal = ctrl.signal;
    const res = await fetch(LB_URL + '?' + new URLSearchParams(params), opts);
    let j = null; try { j = await res.json(); } catch(e){ lbDown = true; throw new Error('leaderboard not installed'); }
    if (!res.ok || !j || !j.ok) throw new Error(j && j.error ? j.error : 'error ' + res.status);
    return j;
  } finally { clearTimeout(to); }
}
function lbSubmit(board, score){
  if (!state.name) return Promise.reject(new Error('noname'));
  const body = { board, pid:playerId(), name:state.name, score:Math.round(score) };
  load(); state.pending = state.pending || {}; state.pending[board] = Math.max(state.pending[board] || 0, body.score); body.score = state.pending[board]; save();
  const send = (tries) => lbCall({ board, pid:playerId() }, body).catch(err => {
    if (tries > 0 && /slow down/.test(err.message)) return new Promise(r => setTimeout(r, 4500)).then(() => send(tries - 1));
    throw err;
  });
  return send(2)
    .then(j => { load(); if (state.pending && state.pending[board] <= body.score){ delete state.pending[board]; save(); } if (j.you && j.you.rank <= 3 && board !== 'xp') unlock('podium', '🏆', 'Podium finish on a global leaderboard'); return j; });
}
function lbGet(board, friends){ const p = { board, pid:playerId() }; if (friends) p.friends = 1; return lbCall(p); }
/* send any scores that could not be delivered last time (rate limit, closed tab, offline) */
function flushPending(){
  if (lbDown || !state.name || !state.pending) return;
  const boards = Object.keys(state.pending); if (!boards.length) return;
  let i = 0;
  (function nextOne(){ if (i >= boards.length) return; const bd = boards[i++]; lbSubmit(bd, state.pending[bd]).catch(() => {}).then(() => setTimeout(nextOne, 4600)); })();
}
setTimeout(flushPending, 2500);
function localTop(board){
  if (board === 'xp') return [{ s:state.xp, l:'XP', d:dayKey() }];
  return (state.tops[board] || []).slice();
}

/* ---------- Accounts, progress sync, friends & chat API (api.php) ---------- */
const API_URL = ROOT + 'api.php';
let apiDown = !/^https?:/.test(location.protocol);
async function api(action, body){
  if (apiDown) throw new Error('Accounts and chat go live when the arcade runs on your website (needs PHP).');
  const opts = { method:body ? 'POST' : 'GET', headers:{}, cache:'no-store' };
  if (body){ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (state.auth && state.auth.token) opts.headers['X-Auth'] = state.auth.token;
  const qs = body ? '' : '&' + new URLSearchParams(arguments[2] || {});
  const res = await fetch(API_URL + '?action=' + action + qs, opts);
  let j = null; try { j = await res.json(); } catch(e){ apiDown = true; throw new Error('Accounts and chat go live when the arcade runs on your website (needs PHP).'); }
  if (res.status === 401 && state.auth && action !== 'login'){ state.auth = null; save(); updateBar(); }
  if (!res.ok || !j.ok) throw new Error(j && j.error ? j.error : 'error ' + res.status);
  return j;
}
/* Vault (server-side in-game money, see vault.php). Only works while logged in. */
async function vapi(action, body){
  if (!state.auth) throw new Error('Sign in first');
  const opts = { method:body ? 'POST' : 'GET', headers:{ 'X-Auth':state.auth.token }, cache:'no-store' };
  if (body){ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(API_URL.replace(/api\.php$/, 'vault.php') + '?action=' + action, opts);
  let j = null; try { j = await res.json(); } catch(e){ throw new Error('The Vault goes live when the arcade runs on your website (needs PHP).'); }
  if (!res.ok || !j.ok) throw new Error(j && j.error ? j.error : 'error ' + res.status);
  return j;
}
const Vault = { info:() => vapi('info'), linkCode:() => vapi('linkcode', {}), unlink:() => vapi('unlink', {}), withdraw:(amount) => vapi('withdraw', { amount }), bet:(b) => vapi('bet', b) };
const PROGRESS_KEYS = ['xp','games','plays','wins','tops','ach','chestStreak','lastChest','day','fav','coins','vip','cq'];
function progressBlob(){ const o = {}; PROGRESS_KEYS.forEach(k => o[k] = state[k]); return o; }
let syncT = 0;
function syncSoon(){ if (!state.auth) return; clearTimeout(syncT); syncT = setTimeout(() => { api('progress_save', { data:progressBlob(), rank:(vipTierIdx((state.vip || {}).total || 0) >= 3 ? '💎' : rankInfo().rank.i) }).catch(() => {}); }, 3000); }
async function afterLogin(j){
  state.auth = { token:j.token, name:j.user.name, id:j.user.id }; state.name = j.user.name; save();
  try {
    const p = await api('progress_get', null, {});
    if (p.progress && (p.progress.xp || 0) > state.xp){ PROGRESS_KEYS.forEach(k => { if (p.progress[k] !== undefined) state[k] = p.progress[k]; }); save(); toast('☁️ Progress loaded from your account (' + state.xp + ' XP)'); }
    else syncSoon();
  } catch(e){}
  updateBar();
  return j;
}
const Acct = {
  get user(){ return state.auth; },
  register(username, password){ return api('register', { username, password }).then(afterLogin); },
  login(username, password){ return api('login', { username, password }).then(afterLogin); },
  logout(){ const p = api('logout', {}).catch(() => {}); state.auth = null; save(); updateBar(); return p; },
  me(){ return api('me', null, {}); },
  search(q){ return api('search', null, { q }); },
  friend(action, name){ return api(action, { name }); },
  send(room, text){ return api('chat_send', { room, text }); },
  poll(room, since){ return api('chat_poll', null, { room, since }); },
  inbox(){ return api('inbox', null, {}); },
  report(room, id){ return api('chat_report', { room, id }); },
  del(room, id){ return api('chat_delete', { room, id }); },
  ban(name, on){ return api('ban', { name, on }); },
  giveaway(){ return api('giveaway', null, {}); },
  giveawayEnter(){ return api('giveaway_enter', {}); },
  giveawayCollect(){ return api('giveaway_collect', {}); },
  live(){ return api('live', null, {}); },
  race(){ return api('race', null, {}); },
  redeem(code){ return api('redeem', { code }); },
  codeCreate(code, coins, max, hours){ return api('code_create', { code, coins, max, hours }); },
  giftSend(to, amount, note){ return api('gift_send', { to, amount, note }); },
  giftCollect(){ return api('gift_collect', {}); },
  get down(){ return apiDown; }
};

/* ---------- Background music (original chiptune, optional) ---------- */
const Music = {
  timer:null, step:0, next:0, bus:null,
  prog:[[0,4,7,11],[-3,0,4,7],[5,9,12,16],[2,5,9,14]],
  start(){
    if (!state.music || state.muted || this.timer) return; Sfx.init(); const c = Sfx.ctx; if (!c) return;
    if (!this.bus){ this.bus = c.createGain(); this.bus.gain.value = .16; this.bus.connect(Sfx.out); }
    this.next = c.currentTime + .1; this.step = 0;
    this.timer = setInterval(() => { while (this.next < c.currentTime + .25){ this.play(this.step++, this.next); this.next += 60/112/2; } }, 60);
  },
  stop(){ clearInterval(this.timer); this.timer = null; },
  play(i, t){
    const c = Sfx.ctx, chord = this.prog[Math.floor(i/16) % 4], pos = i % 16, f = (m) => 440 * Math.pow(2, (m-69)/12);
    const v = (fr, d, type, vol) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = fr; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + d + .02); };
    if (pos % 2 === 0) v(f(64 + chord[(pos/2) % 4] + (pos >= 8 ? 12 : 0)), .3, 'square', .05);
    if (pos % 4 === 0) v(f(40 + chord[0]), .5, 'triangle', .14);
  },
  toggle(){ state.music = !state.music; save(); if (state.music) this.start(); else this.stop(); return state.music; }
};

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
function setMuted(m){ load(); state.muted = !!m; save(); updateBar(); if (m) Music.stop(); else Music.start(); }
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
function paintBody(pal){ const u = textureURL(pal || ['#1a1230','#150f28','#221838','#100a20'], 99, 16); if (u) document.body.style.backgroundImage = 'url(' + u + ')'; }

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
function pageURL(){ return /^https?:/.test(location.protocol) ? location.origin + location.pathname + (/play\.html$/.test(location.pathname) ? location.hash : '') : ''; }
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
  return '🕹️ CHAOS ARCADE · ' + (g ? g.e + ' ' + g.t : '') + (state.name ? ' — ' + state.name : '') + '\n' + lines.join('\n') + '\n' + r.i + ' Arcade rank: ' + r.t + (link ? '\n' + link : '');
}

/* ---------- Game page top bar ---------- */
function updateBar(){
  const xp = $('#abXP'), mute = $('#abMute');
  const cc = $('#abCoins'); if (cc) cc.textContent = '🪙 ' + Math.floor(state.coins).toLocaleString('en-US');
  if (xp){ const ri = rankInfo(); xp.textContent = ri.rank.i + ' ' + (state.auth ? state.auth.name + ' · ' : '') + state.xp + ' XP'; xp.title = ri.rank.t; }
  if (mute) mute.textContent = state.muted ? '🔇' : '🔊';
}
function mountBar(gameId, opts){
  opts = opts || {};
  const g = gameById(gameId);
  const host = $('#arcadeBar') || (() => { const d = document.createElement('div'); d.id = 'arcadeBar'; document.body.prepend(d); return d; })();
  host.className = 'arcade-bar';
  host.innerHTML = '<a class="btn back" href="' + ROOT + 'index.html" title="Back to the arcade">⬅ ARCADE</a>' +
    '<div class="title">' + (g ? g.e + ' ' + esc(g.t) : '') + (g && featuredGame().id === g.id ? ' <span class="badge gold" style="background:#d9a514">⭐ 2x XP</span>' : '') + '</div>' +
    '<span class="chip" id="abXP"></span><span class="chip coin" id="abCoins" title="Your coins. Earn them by playing any game."></span>' + '<button class="btn icon" id="abMusic" aria-label="Toggle music" title="Music">🎵</button>' + (opts.noMute ? '' : '<button class="btn icon" id="abMute" aria-label="Toggle sound">🔊</button>');
  const mu = $('#abMusic');
  if (mu){ mu.style.opacity = state.music ? 1 : .5; mu.addEventListener('click', () => { Sfx.init(); const on = Music.toggle(); mu.style.opacity = on ? 1 : .5; toast(on ? '🎵 Music on' : '🎵 Music off'); }); }
  if (state.music) ['pointerdown','keydown'].forEach(ev => addEventListener(ev, () => Music.start(), { once:true }));
  const m = $('#abMute');
  if (m) m.addEventListener('click', () => { setMuted(!state.muted); Sfx.init(); Sfx.click(); if (opts.onMute) opts.onMute(state.muted); });
  updateBar();
}

/* ---------- Background falling blocks (decorative) ---------- */
function fallingBlocks(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.id = 'bgBlocks';
  c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:.55';
  document.body.prepend(c);
  const x = c.getContext('2d'); let W, H;
  const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; }; resize(); addEventListener('resize', resize);
  const pals = [['#ff55ff','#9a2a9a'],['#55ffff','#1a8a8a'],['#ffff55','#a0a020'],['#55ff55','#1f8a1f'],['#ff5555','#8a1a1a'],['#5fbf3a','#866043'],['#5577ff','#22337a']];
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

/* ---------- Upload self-check: shows a clear message if style.css did not load ---------- */
function selfCheck(){
  const ok = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  if (ok) return;
  const url = ROOT + 'style.css';
  const show = (why) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:relative;z-index:9999;margin:10px;padding:14px;background:#a52a24;color:#fff;font:bold 15px/1.5 monospace;border:4px solid #000';
    d.innerHTML = '⚠️ CHAOS ARCADE SETUP PROBLEM: the stylesheet did not load, so the page looks broken.<br>Checked <b>' + new URL(url, location.href).href + '</b>: ' + why +
      '<br><br>Fix: upload <b>style.css</b> into the same folder as index.html (and arcade.js into the same folder), then refresh with Ctrl+F5.';
    document.body.prepend(d);
  };
  fetch(url, { cache:'no-store' }).then(r => {
    const type = r.headers.get('content-type') || '?';
    if (!r.ok) show('the server says <b>HTTP ' + r.status + '</b> (file missing or in the wrong folder).');
    else if (!/text\/css/.test(type)) show('the file exists but the server sends it as <b>' + type + '</b> instead of text/css. Ask your host to serve .css files as text/css.');
    else show('the file exists, so the browser may be showing an old cached copy. Press Ctrl+F5.');
  }).catch(() => show('it could not be reached at all.'));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(selfCheck, 300)); else setTimeout(selfCheck, 300);

/* ---------- Public API ---------- */
window.Arcade = {
  GAMES, RANKS, ROOT, CATS, CAT_BG,
  get state(){ return state; },
  save, load, dayKey, hashStr, mulberry32, h2, rnd, esc,
  rankInfo, featuredGame, gameById, gameStats, addXP, report, unlock, coins, addCoins, spendCoins, coinInfo, START_COINS, vault:Vault, vip:{ TIERS:VIP_TIERS, wager:vipWager, info:vipInfo, claim:vipClaim }, casinoBet, cq:cqInfo,
  Sfx, setMuted, buzz,
  px, texture, textureURL, paintBody, icon, ICONS,
  toast, achToast, flash, bigText, shake, burst, confetti,
  copy, shareText, pageURL, hubURL,
  mountBar, updateBar, fallingBlocks,
  quests, today, lb:{ submit:lbSubmit, get:lbGet, local:localTop, get down(){ return lbDown; } }, playerId,
  acct:Acct, Music, syncSoon,
  setName(n){ load(); state.name = String(n||'').replace(/[^\p{L}\p{N} _\-.!]/gu,'').slice(0,16); save(); }
};
})();
