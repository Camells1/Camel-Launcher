/* Missing Letter */
(function(){
const WORDS = 'ADVENTURE BALLOON BICYCLE BIRTHDAY BLANKET BUTTERFLY CALENDAR CAMPFIRE CAPTAIN CARNIVAL CASTLE CHAMPION CHOCOLATE CRYSTAL DIAMOND DINOSAUR DOLPHIN ELEPHANT ENGINEER FESTIVAL FIREWORK FOOTBALL FOREST GALAXY GARDEN GIRAFFE GUITAR HAMBURGER HARVEST HELICOPTER HORIZON ISLAND JOURNEY JUNGLE KANGAROO KEYBOARD KITCHEN LANTERN LIBRARY LIGHTNING MACHINE MAGNET MARATHON MEADOW MONSTER MOUNTAIN MYSTERY NOTEBOOK OCTOPUS ORCHESTRA PAINTING PANCAKE PENGUIN PINEAPPLE PIRATE PLANET POTATO PUZZLE PYRAMID RAINBOW ROCKET SANDWICH SATELLITE SCIENCE SKELETON SNOWFLAKE SPAGHETTI SQUIRREL STADIUM SUNFLOWER TELESCOPE THUNDER TORNADO TREASURE TRIANGLE UMBRELLA UNIVERSE VACATION VOLCANO WATERFALL WHISTLE WINDOW WIZARD YOGURT'.split(' ');
function make(k){
  const w = k.pick(WORDS), pos = k.ri(1, w.length - 2), ans = w[pos];
  const letters = new Set([ans]); while (letters.size < 4){ const c = String.fromCharCode(65 + k.ri(0, 25)); if (c !== ans) letters.add(c); }
  const opts = k.shuffle([...letters]);
  return { q:w.slice(0, pos) + '<span style="color:#ffff55;border-bottom:4px solid #ffff55">_</span>' + w.slice(pos + 1), options:opts, answer:opts.indexOf(ans), note:'The word was ' + w, big:true };
}
function load(cb){ if (window.QuizKit) return cb(); const s = document.createElement('script'); s.src = 'js/quizkit.js'; s.onload = cb; document.head.appendChild(s); }
load(() => Kit.def(quizDef({
  winAt:800,
  how:'Each word is missing one letter. Pick the letter that completes it. 15 words, 8 seconds each. Fast answers score more and streaks build a combo. Press 1–4 to answer.',
  init(k){ QuizKit(k, { rounds:15, secs:8, label:'Word', next:() => make(k) }); }
})));
})();
