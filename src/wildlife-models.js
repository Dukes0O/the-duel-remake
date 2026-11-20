// The animal models that have passed WILD-ART-SRC's rounds: the one list that
// says which species can be drawn. Placement (src/wildlife.js) and the wildlife
// count (the helicopter's survey rules) both take their approved species from here, so
// a species with no model here has no animals and is never asked for in a count.
// A new species is added by its art card: one row, its file in
// public/assets/wildlife/, and the clip names it was exported with.
//
// Every model is in metres with its origin at the feet and its nose along +X.
// `idle` and `move` are clip names (a bird perches in `idle` and, with a `fly` clip,
// flies in that instead); `run` is how fast it goes when startled and how much
// faster than normal the move clip plays to match. `cubScale` is for the young that share an adult's file.
const model = (file, run, extra = {}) => Object.freeze({
  file, idle: 'Idle', move: 'Walk', scale: 1, run: Object.freeze(run), ...extra,
});

export const WILDLIFE_MODELS = Object.freeze({
  'white-tailed-deer': model('white-tailed-deer.glb', {speed: 6, rate: 3.4}),
  'moose': model('moose.glb', {speed: 4.5, rate: 2.8}),
  'black-bear': model('black-bear.glb', {speed: 4.5, rate: 2.6}, {cubScale: .5}),
  'beaver': model('beaver.glb', {speed: 2.2, rate: 2}),
  'eastern-wolf': model('eastern-wolf.glb', {speed: 6.5, rate: 3.4}),
  // Western mountains and Australia (WILD-ART-SRC rounds 1 to 3). Rates match
  // each Walk clip's stride at its size; the small animals' short strides
  // need high rates, and like the beaver they slide a little when running.
  'mule-deer': model('mule-deer.glb', {speed: 6, rate: 3.6}),
  'elk': model('elk.glb', {speed: 6.5, rate: 3}),
  'bighorn-sheep': model('bighorn-sheep.glb', {speed: 5.5, rate: 3.3}),
  'cougar': model('cougar.glb', {speed: 6.5, rate: 3.1}),
  'coyote': model('coyote.glb', {speed: 6, rate: 3.9}),
  'yellow-bellied-marmot': model('yellow-bellied-marmot.glb', {speed: 2.5, rate: 6}),
  'eastern-grey-kangaroo': model('eastern-grey-kangaroo.glb', {speed: 6, rate: 2.2}),   // Walk is a bound
  'echidna': model('echidna.glb', {speed: .8, rate: 4}),
  // Birds perch in Idle and fly in their Fly loop; the view sets their flight speed.
  'raven': model('raven.glb', {speed: 9, rate: 1.1}, {move: 'Fly', fly: 'Fly'}),
  'sulphur-crested-cockatoo': model('sulphur-crested-cockatoo.glb', {speed: 9, rate: 1.2}, {move: 'Fly', fly: 'Fly'}),
  'kookaburra': model('kookaburra.glb', {speed: 9, rate: 1.2}, {move: 'Fly', fly: 'Fly'}),
  // Europe (WILD-ART-SRC Europe round 1). Same rule: rates match each Walk
  // clip's stride at its size, so the small animals' rates are high.
  'roe-deer': model('roe-deer.glb', {speed: 6.5, rate: 4.5}),
  'red-deer': model('red-deer.glb', {speed: 6.5, rate: 3.5}),
  'red-fox': model('red-fox.glb', {speed: 6, rate: 5}),
  'chamois': model('chamois.glb', {speed: 5.5, rate: 4.5}),
  'ibex': model('ibex.glb', {speed: 4.5, rate: 2.8}),
  'alpine-marmot': model('alpine-marmot.glb', {speed: 2.5, rate: 6}),
  'black-stork': model('black-stork.glb', {speed: 9, rate: 1.1}, {move: 'Fly', fly: 'Fly'}),
  'gull': model('gull.glb', {speed: 9, rate: 1.2}, {move: 'Fly', fly: 'Fly'}),
  // Europe round 3. The boar's short stride needs a high rate; it slides a
  // little when running, as the beaver does. The wildcat has not passed.
  'wild-boar': model('wild-boar.glb', {speed: 5, rate: 4}),
  'golden-eagle': model('golden-eagle.glb', {speed: 9, rate: 1.05}, {move: 'Fly', fly: 'Fly'}),
  // Desert and coast (WILD-ART-DESERT), for Red Mesa and Pacific Canyon; held off the courses below.
  // The roadrunner is a ground bird: it runs (its Run clip) and has no Fly clip. The jackrabbit's
  // Walk is a bound. The collared lizard is a large male, a little over life size.
  'roadrunner': model('roadrunner.glb', {speed: 6, rate: 4}, {move: 'Run'}),
  'jackrabbit': model('jackrabbit.glb', {speed: 8, rate: 3}),
  'desert-bighorn': model('desert-bighorn.glb', {speed: 5.5, rate: 3.5}),
  'collared-lizard': model('collared-lizard.glb', {speed: 3, rate: 5}),
  'pelican': model('pelican.glb', {speed: 9, rate: 1.1}, {move: 'Fly', fly: 'Fly'}),
  'condor': model('condor.glb', {speed: 9, rate: 1.05}, {move: 'Fly', fly: 'Fly'}),
  // The Wasteland and the player's town (WILD-ART-WASTE). On no course yet: the town's
  // view takes the goat, the chicken and the camp dog by file name. The chicken walks
  // and pecks; it has no Fly clip. The scorpion is four times life size, to be seen from a car.
  'goat': model('goat.glb', {speed: 4, rate: 3.6}),
  'chicken': model('chicken.glb', {speed: 2.2, rate: 2.6}),
  'camp-dog': model('camp-dog.glb', {speed: 6, rate: 4.4}),
  'turkey-vulture': model('turkey-vulture.glb', {speed: 9, rate: 1.05}, {move: 'Fly', fly: 'Fly'}),
  'desert-monitor': model('desert-monitor.glb', {speed: 3, rate: 2.8}),
  'scorpion': model('scorpion.glb', {speed: 1.2, rate: 2.5}),
  // Harbour Lights and the city courses (WILD-ART-CITY); the town uses the pigeon and the cat.
  // The ids are the ones src/wildlife.js already names on those courses: the egret is a little
  // egret, the cat a thin street cat, the owl a barn owl. Held off the courses below.
  'black-kite': model('black-kite.glb', {speed: 9, rate: 1.05}, {move: 'Fly', fly: 'Fly'}),
  'egret': model('little-egret.glb', {speed: 9, rate: 1.1}, {move: 'Fly', fly: 'Fly'}),
  'black-faced-spoonbill': model('black-faced-spoonbill.glb', {speed: 9, rate: 1.1}, {move: 'Fly', fly: 'Fly'}),
  'pigeon': model('pigeon.glb', {speed: 9, rate: 1.2}, {move: 'Fly', fly: 'Fly'}),
  'owl': model('owl.glb', {speed: 8, rate: 1.1}, {move: 'Fly', fly: 'Fly'}),
  'raccoon': model('raccoon.glb', {speed: 3, rate: 5}),
  'cat': model('street-cat.glb', {speed: 4.5, rate: 6.4}),
});

// Models that have passed their art rounds but stand on no course yet. src/wildlife.js already
// lists the desert and coast animals on Red Mesa and Pacific Canyon and the city animals on Harbour
// Lights and the city courses, so a row above would put them there at once, on courses nobody has
// driven with them (and Harbour Lights at night is the scene the frame check times). Their placement
// cards take an id off this list when its course has been looked at and timed. The town draws
// animals straight from WILDLIFE_MODELS, so it may use a held one.
export const HELD_FROM_COURSES = Object.freeze(['roadrunner', 'jackrabbit', 'desert-bighorn', 'collared-lizard', 'pelican', 'condor',
  'black-kite', 'egret', 'black-faced-spoonbill', 'pigeon', 'owl', 'raccoon', 'cat']);

// The ids a course may use, for availableSpecies() and the count's course list.
export const APPROVED_MODEL_IDS = Object.freeze(Object.keys(WILDLIFE_MODELS).filter(id => !HELD_FROM_COURSES.includes(id)));

export const WILDLIFE_MODEL_DIR = '/assets/wildlife/';
export const wildlifeModelUrl = species => WILDLIFE_MODEL_DIR + WILDLIFE_MODELS[species].file;
