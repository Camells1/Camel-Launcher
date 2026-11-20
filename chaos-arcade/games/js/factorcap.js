/* Fact or Cap */
(function(){
// [statement, true?, explanation]
const F = [
  ['Octopuses have three hearts.',1,'Two pump blood to the gills, one to the rest of the body.'],
  ['Bananas are berries, botanically speaking.',1,'Yes, but strawberries are not.'],
  ['A day on Venus is longer than its year.',1,'Venus spins so slowly that one day lasts longer than one orbit.'],
  ['Sharks existed before trees.',1,'Sharks are around 450 million years old; trees around 390 million.'],
  ['Wombats produce cube-shaped poop.',1,'Their intestines shape it into cubes.'],
  ['The Eiffel Tower gets slightly taller in summer.',1,'Heat makes the iron expand by several centimetres.'],
  ['Sea otters sometimes hold hands while sleeping.',1,'It stops them drifting apart.'],
  ['A group of flamingos is called a "flamboyance".',1,'Fabulous and true.'],
  ['Butterflies taste with their feet.',1,'They have taste sensors on their feet.'],
  ['The dot over a lowercase "i" is called a tittle.',1,'Really.'],
  ['Antarctica is the largest desert on Earth.',1,'Deserts are defined by low precipitation, not heat.'],
  ['Lightning is hotter than the surface of the Sun.',1,'A bolt can reach about 30,000 °C.'],
  ['Koalas can sleep around 18–22 hours a day.',1,'Eucalyptus gives them very little energy.'],
  ['A shrimp\'s heart is located in its head.',1,'In the head region (the thorax), yes.'],
  ['Honey can stay edible for thousands of years.',1,'Edible honey has been found in ancient Egyptian tombs.'],
  ['Goldfish only have a 3-second memory.',0,'Goldfish can remember things for months.'],
  ['Bulls get angry at the color red.',0,'Bulls are red-green colorblind; they react to the movement.'],
  ['Humans only use 10% of their brains.',0,'Brain scans show we use virtually all of it.'],
  ['Bats are blind.',0,'All bats can see, and many see quite well.'],
  ['Lightning never strikes the same place twice.',0,'Tall buildings get hit many times a year.'],
  ['Ostriches bury their heads in the sand when scared.',0,'They lie flat on the ground, which looks like hiding from afar.'],
  ['Cracking your knuckles causes arthritis.',0,'Studies have found no link.'],
  ['Vikings wore horned helmets into battle.',0,'That image comes from 1800s costume design.'],
  ['The Great Wall of China is visible from the Moon with the naked eye.',0,'It is far too narrow to see from the Moon.'],
  ['Mount Everest is the tallest mountain measured from base to peak.',0,'Mauna Kea in Hawaii is taller from its underwater base.'],
  ['Dogs only see in black and white.',0,'Dogs see colors, mostly blues and yellows.'],
  ['You lose most of your body heat through your head.',0,'Your head loses heat at about the same rate as other uncovered skin.'],
  ['Camels store water in their humps.',0,'Humps store fat, not water.'],
  ['Tomatoes are vegetables, botanically.',0,'Botanically they are fruits.'],
  ['Shaving makes hair grow back thicker.',0,'It only feels coarser because of the blunt tip.'],
  ['An adult human has about 300 bones.',0,'Babies have about 300; adults have 206.'],
  ['The Sahara is the largest desert on Earth.',0,'Antarctica is bigger. The Sahara is the largest HOT desert.'],
  ['Napoleon was unusually short.',0,'He was around average height for a Frenchman of his time.'],
  ['Glass is actually a slow-flowing liquid.',0,'Old windows are uneven because of how they were made.'],
  ['Water spins down sink drains in opposite directions in each hemisphere because of Earth\'s rotation.',0,'Sinks are far too small for that effect to matter.']
];
function load(cb){ if (window.QuizKit) return cb(); const s = document.createElement('script'); s.src = 'js/quizkit.js'; s.onload = cb; document.head.appendChild(s); }
load(() => Kit.def(quizDef({
  winAt:600,
  how:'Each statement is either a real FACT or total CAP (false). Decide fast: 8 seconds each, 12 statements. Faster correct answers score more. Press 1 for FACT, 2 for CAP.',
  init(k){ const set = k.shuffle(F).slice(0, 12); QuizKit(k, { rounds:12, secs:8, label:'Statement', next:(i) => { const [s, t, why] = set[i]; return { q:'“' + s + '”', options:['✅ FACT','🧢 CAP'], answer:t ? 0 : 1, note:why }; } }); }
})));
})();
