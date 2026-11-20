/* Typo Hunter */
(function(){
const W = [['accommodate','accomodate'],['definitely','definately'],['separate','seperate'],['necessary','neccessary'],['occurrence','occurence'],['receive','recieve'],['believe','beleive'],['calendar','calender'],
  ['embarrass','embarass'],['environment','enviroment'],['government','goverment'],['beginning','begining'],['tomorrow','tommorow'],['weird','wierd'],['friend','freind'],['library','libary'],
  ['february','febuary'],['restaurant','restaraunt'],['rhythm','rythm'],['conscious','concious'],['existence','existance'],['guarantee','guarentee'],['harass','harrass'],['independent','independant'],
  ['millennium','millenium'],['noticeable','noticable'],['occasion','occassion'],['publicly','publically'],['recommend','reccomend'],['until','untill'],['wednesday','wensday'],['address','adress'],
  ['business','buisness'],['cemetery','cemetary'],['foreign','foriegn'],['grammar','grammer'],['immediately','immediatly'],['knowledge','knowlege'],['maintenance','maintainance'],['privilege','priviledge']];
function load(cb){ if (window.QuizKit) return cb(); const s = document.createElement('script'); s.src = 'js/quizkit.js'; s.onload = cb; document.head.appendChild(s); }
load(() => Kit.def(quizDef({
  winAt:800,
  how:'Four words: three are spelled correctly, one has a typo. Tap the misspelled one. These are the words people get wrong most often. 12 rounds, 10 seconds each. Press 1–4.',
  init(k){
    const order = k.shuffle(W);
    QuizKit(k, { rounds:12, secs:10, label:'Round', next:(i) => { const bad = order[i], good = k.shuffle(W.filter(p => p !== bad)).slice(0, 3).map(p => p[0]); const opts = k.shuffle([bad[1]].concat(good)); return { q:'🕵️ Which word is spelled WRONG?', options:opts, answer:opts.indexOf(bad[1]), note:'Correct spelling: <b>' + bad[0] + '</b>' }; } });
  }
})));
})();
