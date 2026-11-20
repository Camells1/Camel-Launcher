/* Trivia Blitz */
(function(){
const Q = [
  ['Which planet is known as the Red Planet?','Mars',['Venus','Jupiter','Mercury']],
  ['How many continents are there?','7',['5','6','8']],
  ['What is the largest ocean on Earth?','Pacific',['Atlantic','Indian','Arctic']],
  ['What is the fastest land animal?','Cheetah',['Lion','Horse','Pronghorn']],
  ['How many legs does a spider have?','8',['6','10','12']],
  ['What is the chemical symbol for gold?','Au',['Ag','Go','Gd']],
  ['Which gas do plants take in from the air?','Carbon dioxide',['Oxygen','Nitrogen','Helium']],
  ['What is the tallest mountain above sea level?','Mount Everest','K2,Kilimanjaro,Mont Blanc'.split(',')],
  ['How many sides does a hexagon have?','6',['5','7','8']],
  ['What is the largest planet in our solar system?','Jupiter',['Saturn','Neptune','Earth']],
  ['Who painted the Mona Lisa?','Leonardo da Vinci',['Picasso','Van Gogh','Michelangelo']],
  ['How many players does a soccer team have on the field?','11',['9','10','12']],
  ['What do bees make?','Honey',['Milk','Silk','Wax paper']],
  ['What is the longest river in Africa?','Nile',['Congo','Niger','Zambezi']],
  ['What is the smallest prime number?','2',['1','3','0']],
  ['What color do you get by mixing blue and yellow paint?','Green',['Purple','Orange','Brown']],
  ['What is the square root of 81?','9',['8','7','18']],
  ['Which planet has the most famous rings?','Saturn',['Uranus','Mars','Venus']],
  ['How many days are in a leap year?','366',['365','364','367']],
  ['Which animal is native to Australia and carries its baby in a pouch?','Kangaroo',['Panda','Llama','Sloth']],
  ['In which country are the Great Pyramids of Giza?','Egypt',['Mexico','Peru','Sudan']],
  ['Who wrote "Romeo and Juliet"?','William Shakespeare',['Charles Dickens','Mark Twain','Jane Austen']],
  ['What is the largest animal that has ever lived?','Blue whale',['African elephant','Megalodon','T. rex']],
  ['How many strings does a standard guitar have?','6',['4','5','8']],
  ['What is the main ingredient of guacamole?','Avocado',['Tomato','Cucumber','Pea']],
  ['In which sport do you do a "slam dunk"?','Basketball',['Volleyball','Tennis','Baseball']],
  ['At what temperature (°F) does water freeze?','32',['0','100','212']],
  ['Which instrument usually has 88 keys?','Piano',['Organ pipe','Harp','Accordion']],
  ['What is the largest hot desert in the world?','Sahara',['Gobi','Kalahari','Arabian']],
  ['Which metal is liquid at room temperature?','Mercury',['Lead','Tin','Aluminium']],
  ['How many bones does an adult human have?','206',['186','226','300']],
  ['What is the closest star to Earth?','The Sun','Proxima Centauri,Sirius,Polaris'.split(',')],
  ['What is the hardest natural material?','Diamond',['Iron','Quartz','Granite']],
  ['How many hours are in a day?','24',['12','20','36']],
  ['Which is the only mammal that can truly fly?','Bat',['Flying squirrel','Sugar glider','Penguin']],
  ['What is the boiling point of water at sea level in °C?','100',['90','80','120']],
  ['Which country gifted the Statue of Liberty to the USA?','France',['England','Spain','Italy']],
  ['How many minutes are in a full day?','1440',['1240','1000','2400']],
  ['What is the capital city of Italy?','Rome',['Milan','Venice','Naples']],
  ['Which ocean lies between Africa and Australia?','Indian',['Atlantic','Pacific','Southern']],
  ['What shape has three sides?','Triangle',['Square','Pentagon','Circle']],
  ['What do caterpillars turn into?','Butterflies or moths',['Beetles','Bees','Dragonflies']]
];
function load(cb){ if (window.QuizKit) return cb(); const s = document.createElement('script'); s.src = 'js/quizkit.js'; s.onload = cb; document.head.appendChild(s); }
load(() => Kit.def(quizDef({
  winAt:800,
  how:'12 general knowledge questions, 12 seconds each. Faster correct answers score more, and streaks add a combo multiplier. Tap an answer or press 1–4.',
  init(k){ const set = k.shuffle(Q).slice(0, 12); QuizKit(k, { rounds:12, secs:12, next:(i) => { const [q, a, w] = set[i], opts = k.shuffle([a].concat(w)); return { q, options:opts, answer:opts.indexOf(a) }; } }); }
})));
})();
