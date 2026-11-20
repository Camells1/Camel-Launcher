/* Opposites */
(function(){
const P = [['HOT','COLD'],['BIG','SMALL'],['FAST','SLOW'],['HAPPY','SAD'],['LIGHT','DARK'],['OPEN','CLOSED'],['FULL','EMPTY'],['EARLY','LATE'],['FRIEND','ENEMY'],['ANCIENT','MODERN'],
  ['BRAVE','COWARDLY'],['ASLEEP','AWAKE'],['ARRIVE','DEPART'],['BUY','SELL'],['CHEAP','EXPENSIVE'],['CLEAN','DIRTY'],['DEEP','SHALLOW'],['ENTRANCE','EXIT'],['FLOAT','SINK'],['FORGET','REMEMBER'],
  ['GIANT','TINY'],['HEAVY','LIGHTWEIGHT'],['INSIDE','OUTSIDE'],['LOUD','QUIET'],['MAXIMUM','MINIMUM'],['NARROW','WIDE'],['NEVER','ALWAYS'],['PUSH','PULL'],['RARE','COMMON'],['ROUGH','SMOOTH'],
  ['SUNRISE','SUNSET'],['TEACHER','STUDENT'],['VICTORY','DEFEAT'],['WIN','LOSE'],['YOUNG','OLD'],['ACCEPT','REFUSE'],['ATTACK','DEFEND'],['GENEROUS','STINGY'],['INCREASE','DECREASE'],['TRUE','FALSE']];
function load(cb){ if (window.QuizKit) return cb(); const s = document.createElement('script'); s.src = 'js/quizkit.js'; s.onload = cb; document.head.appendChild(s); }
load(() => Kit.def(quizDef({
  winAt:800,
  how:'A word appears. Pick its OPPOSITE as fast as you can. 15 words, 6 seconds each. Streaks build a combo multiplier. Press 1–4 to answer.',
  init(k){ const set = k.shuffle(P).slice(0, 15); QuizKit(k, { rounds:15, secs:6, label:'Word', next:(i) => { let [a, b] = set[i]; if (Math.random() < .5) [a, b] = [b, a]; const wrong = k.shuffle(P.filter(p => p[0] !== a && p[1] !== a)).slice(0, 3).map(p => p[Math.random() < .5 ? 0 : 1]); const opts = k.shuffle([b].concat(wrong)); return { q:'↔️ ' + a, options:opts, answer:opts.indexOf(b), big:true }; } }); }
})));
})();
