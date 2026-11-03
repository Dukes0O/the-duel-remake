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
});

// The ids in the table, for availableSpecies() and the count's course list.
export const APPROVED_MODEL_IDS = Object.freeze(Object.keys(WILDLIFE_MODELS));

export const WILDLIFE_MODEL_DIR = '/assets/wildlife/';
export const wildlifeModelUrl = species => WILDLIFE_MODEL_DIR + WILDLIFE_MODELS[species].file;
