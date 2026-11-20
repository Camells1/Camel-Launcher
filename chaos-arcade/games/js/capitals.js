/* Capital Cities */
(function(){
// [country, capital, sneaky wrong answer]
const C = [['France','Paris','Lyon'],['Germany','Berlin','Munich'],['Italy','Rome','Milan'],['Spain','Madrid','Barcelona'],['Netherlands','Amsterdam','Rotterdam'],['Belgium','Brussels','Antwerp'],
  ['Portugal','Lisbon','Porto'],['Austria','Vienna','Salzburg'],['Switzerland','Bern','Zurich'],['Sweden','Stockholm','Gothenburg'],['Norway','Oslo','Bergen'],['Denmark','Copenhagen','Aarhus'],
  ['Finland','Helsinki','Turku'],['Poland','Warsaw','Kraków'],['Greece','Athens','Thessaloniki'],['Turkey','Ankara','Istanbul'],['Russia','Moscow','St Petersburg'],['Ukraine','Kyiv','Odesa'],
  ['Ireland','Dublin','Cork'],['United Kingdom','London','Manchester'],['United States','Washington, D.C.','New York'],['Canada','Ottawa','Toronto'],['Mexico','Mexico City','Guadalajara'],
  ['Brazil','Brasília','Rio de Janeiro'],['Argentina','Buenos Aires','Córdoba'],['Chile','Santiago','Valparaíso'],['Peru','Lima','Cusco'],['Colombia','Bogotá','Medellín'],['Egypt','Cairo','Alexandria'],
  ['Nigeria','Abuja','Lagos'],['Kenya','Nairobi','Mombasa'],['Morocco','Rabat','Casablanca'],['Japan','Tokyo','Osaka'],['China','Beijing','Shanghai'],['South Korea','Seoul','Busan'],
  ['India','New Delhi','Mumbai'],['Thailand','Bangkok','Chiang Mai'],['Vietnam','Hanoi','Ho Chi Minh City'],['Australia','Canberra','Sydney'],['New Zealand','Wellington','Auckland'],
  ['Iceland','Reykjavík','Akureyri'],['Czechia','Prague','Brno'],['Hungary','Budapest','Debrecen'],['Pakistan','Islamabad','Karachi'],['Saudi Arabia','Riyadh','Jeddah']];
function load(cb){ if (window.QuizKit) return cb(); const s = document.createElement('script'); s.src = 'js/quizkit.js'; s.onload = cb; document.head.appendChild(s); }
load(() => Kit.def(quizDef({
  winAt:800,
  how:'Pick the capital city of each country. Watch out: the sneaky options are often the biggest or most famous city, which is NOT always the capital. 12 questions, 10 seconds each.',
  init(k){ const set = k.shuffle(C).slice(0, 12); QuizKit(k, { rounds:12, secs:10, label:'Country', next:(i) => { const [c, cap, trick] = set[i]; const others = k.shuffle(C.filter(x => x[1] !== cap)).slice(0, 2).map(x => x[1]); const opts = k.shuffle([cap, trick].concat(others)); return { q:'🏛️ What is the capital of <b style="color:#ffff55">' + c + '</b>?', options:opts, answer:opts.indexOf(cap) }; } }); }
})));
})();
