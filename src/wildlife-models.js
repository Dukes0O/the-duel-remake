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
});

// The ids in the table, for availableSpecies() and the count's course list.
export const APPROVED_MODEL_IDS = Object.freeze(Object.keys(WILDLIFE_MODELS));

export const WILDLIFE_MODEL_DIR = '/assets/wildlife/';
export const wildlifeModelUrl = species => WILDLIFE_MODEL_DIR + WILDLIFE_MODELS[species].file;
