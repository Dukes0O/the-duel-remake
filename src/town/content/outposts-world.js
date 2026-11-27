// The neighbours' outposts as they stand in the Scablands (TOWN-OUTPOST-SCENE): where each is, which part of
// public/assets/models/wasteland/town/outposts.glb draws it, the boxes that make it solid, and who stands about it.
// New data: it moves no place of the land. Each position is a place of the land plus an offset (src/world/scablands-names.js), so it
// moves with its place, and tools/test-town-outposts-scene.mjs checks every one against the roads, the jobs' routes, the places and the
// ground. A new outpost is one row here.
//
// Measures are the model's own (read from outposts.glb, 19 November 2026): `bounds` is [west, north, east, south] in metres at no turn,
// `lift` how far the model's lowest point is below its own floor (the school stands on trestles), and each box [west, north, east, south,
// height] is cut from the parts taller than a wheel at a cell of 1 m. `front` is the side that faces `faces` (the nearest road, or the
// Iron Line's rail for the halt); it is the side the art calls the road side.
//
// People are drawn from the town's story cast (src/world/jobs/story-people.js) and stand on the ground or, with `lift`, on the outpost's
// own floor (Deck Town's walkways, the halt's platform). `aside` is where they step to when a car comes close. Animals come from the
// wildlife models (src/wildlife-models.js) once their species has a row there; until then they are placed but not drawn.
//
// `ground` is the sentence town planning answers with when a building or a home plot is asked for on the outpost's ground
// (TOWN-RESERVED-OUTPOSTS). That ground is the fenced ground and OUTPOST_GROUND_MARGIN past it (src/town/town-outpost-world.js).

const row = value => Object.freeze(value);

export const OUTPOST_MODEL = '/assets/models/wasteland/town/outposts.glb';
// The fence that protection builds (docs/WASTELAND_TOWN.md section 14: `fence-wood`, 1.4 m tall), from the town's own safety art.
export const OUTPOST_FENCE = row({model: '/assets/models/wasteland/town/safety.glb', node: 'fence-wood-straight', length: 7.9, height: 1.4});
// The species each kind of animal is drawn as, in the order they are looked for in src/wildlife-models.js (WILD-ART-WASTE).
export const OUTPOST_ANIMAL_SPECIES = row({dog: Object.freeze(['camp-dog', 'dog']), goat: Object.freeze(['goat'])});
// Outposts are drawn and solid only this near the car (metres); people and animals are drawn nearer still (the story cast's own 95 m).
export const OUTPOST_DRAW_RANGE = 1400;
// How far past an outpost's fence the town's planning keeps the ground clear (metres): one town cell.
export const OUTPOST_GROUND_MARGIN = 8;

export const OUTPOSTS_WORLD = Object.freeze([
  row({
    id: 'dot-diner', neighbourId: 'dot', name: 'Dot’s Diner', node: 'dot-diner',
    ground: 'Dot’s Diner stands there. That ground is Dot’s, so the town builds somewhere else.',
    // On the Boneyard Road, 38 m off its middle, 820 m short of the Boneyard.
    at: Object.freeze(['boneyard', -809, -152]), faces: 'road', front: '-x',
    bounds: Object.freeze([-5.47, -8.17, 2.53, 8.2]), lift: 0, reach: 16,
    boxes: Object.freeze([[-1, -9, 1, -4, 3.7], [-2, -8, -1, 9, 4], [1, -8, 2, -4, 3.6], [-5, -5, -2, -4, 3.3], [-5, -4, -3, 0, 3.2],
      [-3, -3, -2, 7, 3.9], [-1, -3, 2, 6, 5.4], [-4, 0, -3, 7, 3.2], [-5, 1, -4, 3, 3.1], [-5, 4, -4, 7, 3.1], [2, 5, 3, 6, 3.9],
      [1, 6, 2, 9, 3.6], [-1, 7, 1, 9, 3.7]].map(Object.freeze)),
    fence: row({gate: '-x'}),
    people: Object.freeze([
      row({figure: 'walker-2', who: 'Dot', at: [-7, -1.5], look: [-1, 0], aside: [-7.5, -8.5]}),
      row({figure: 'walker-7', who: 'A driver with a pie', at: [-7.2, 3.4], look: [-.6, -1], aside: [-7.5, 9]}),
      row({figure: 'rell', who: 'A driver waiting for coffee', at: [-6.6, 6.4], look: [-1, -.4], aside: [-3, 10.6]}),
    ]),
    animals: Object.freeze([]),
  }),
  row({
    id: 'plane-school', neighbourId: 'quill', name: 'Miss Quill’s school', node: 'plane-school',
    ground: 'Miss Quill’s school stands there. That ground is Miss Quill’s, so the town builds somewhere else.',
    // At the Boneyard's south edge, past its three wrecks.
    at: Object.freeze(['boneyard', 20, 130]), faces: 'road', front: '-x',
    bounds: Object.freeze([-3.39, -5.32, 1.21, 5.68]), lift: 1.6, reach: 16,
    boxes: Object.freeze([[-1, -6, 1, 6, 4.1], [-2, -5, -1, 5, 3.6], [1, -5, 2, 5, 3.5]].map(Object.freeze)),
    fence: row({gate: '-x'}),
    people: Object.freeze([
      row({figure: 'walker-6', who: 'Miss Quill', at: [-5, 1.4], look: [-1, .2], aside: [-4.6, 6.4]}),
      // Bo is nine and asks if he can drive your car. He goes round the school and back while you are near.
      row({figure: 'wim', who: 'Bo', at: [-5.6, -7.4], look: [0, 1], wander: Object.freeze([[-5.6, -7.4], [-6.4, 0], [-5, 7.8], [3.4, 7.6],
        [3.6, 0], [3.2, -7.4]].map(Object.freeze)), aside: [3.4, 7.6]}),
    ]),
    animals: Object.freeze([]),
  }),
  row({
    id: 'hermit-camp', neighbourId: 'tam', name: 'Old Tam’s hut', node: 'hermit-camp',
    ground: 'Old Tam’s hut stands there. That ground is Old Tam’s, so the town builds somewhere else.',
    // Up on the Ridge, on its flat top 100 m from the Ridge's camp.
    at: Object.freeze(['ridge', 60, 85]), faces: 'road', front: '-x',
    bounds: Object.freeze([-4.51, -2.48, 4.54, 5.55]), lift: 0, reach: 18,
    boxes: Object.freeze([[-5, -2, -3, 6, 2.8], [-2, -2, 0, 4, 2.9], [3, -2, 5, 2, 1.6], [-3, 2, -2, 6, 3.2], [-1, 4, 0, 6, 2.1],
      [-2, 5, -1, 6, 2.8]].map(Object.freeze)),
    // The fence takes in the goats' ground too.
    fence: row({gate: '-x', bounds: Object.freeze([-4.51, -6.5, 12, 6.5]), margin: 1}),
    people: Object.freeze([
      row({figure: 'walker-8', who: 'Old Tam', at: [1.6, -3.4], look: [1, .3], aside: [1.4, 6.4]}),
    ]),
    // Tam's goats, out on the open ground past their shed (the town's goat pen holds eight: section 14).
    animals: Object.freeze([
      row({kind: 'goat', who: 'Tam’s goats', count: 8, area: Object.freeze([6.5, -6, 11.5, 6]), pace: .45}),
    ]),
  }),
  row({
    id: 'deck-town', neighbourId: 'imre', name: 'Deck Town', node: 'deck-town',
    ground: 'Deck Town stands there. That ground is Captain Imre’s, so the town builds somewhere else.',
    // Off the Ships in the Sand, on the open sand 130 m from where the ships lie.
    at: Object.freeze(['ships-in-sand', -100, -84]), faces: 'road', front: '-x',
    bounds: Object.freeze([-4.07, -7.4, 4.07, 7.4]), lift: 0, reach: 16,
    boxes: Object.freeze([[-4, -8, 4, 8, 3.8], [-5, -1, -4, 1, 1.6], [4, -1, 5, 1, 1.6]].map(Object.freeze)),
    fence: row({gate: '-x'}),
    people: Object.freeze([
      // Captain Imre keeps the ship's watch at the bell; the Deck Folk are on their walkways, and one has come down to the sand.
      row({figure: 'walker-3', who: 'Captain Imre', at: [0, -1.8], lift: 1.58, look: [-1, 0]}),
      row({figure: 'walker-5', who: 'One of the Deck Folk', at: [1, -4], lift: 1.58, look: [0, -1]}),
      row({figure: 'dace', who: 'One of the Deck Folk', at: [-1, 3.1], lift: 1.58, look: [-1, .3]}),
      row({figure: 'walker-1', who: 'One of the Deck Folk', at: [-6.4, 2.6], look: [-1, -.2], aside: [-6.6, 9.6]}),
    ]),
    animals: Object.freeze([]),
  }),
  row({
    id: 'rail-halt', neighbourId: 'pim', name: 'Rail Halt', node: 'rail-halt',
    ground: 'The Rail Halt stands there. That ground is Pim’s, so the town builds somewhere else.',
    // Beside the Iron Line 170 m north of the Iron Line's station, its platform to the rail and its signal over it.
    at: Object.freeze(['iron-line', 42, -169]), faces: 'rail', front: '-x',
    bounds: Object.freeze([-5.87, -5.15, 3.4, 5.15]), lift: 0, reach: 15,
    boxes: Object.freeze([[-3, -5, 4, -4, 4.4], [-3, -4, 3, -3, 4.4], [-2, -3, 3, 5, 4.4], [-3, -2, -2, 2, 3.9], [-6, 1, -3, 2, 4],
      [-3, 3, -2, 5, 3.2]].map(Object.freeze)),
    // The rail side stays open (it is the platform's edge), and the fence starts 3 m short of the rail.
    fence: row({gate: '-x', openSide: true, bounds: Object.freeze([-5.5, -8, 10.5, 8]), margin: 0}),
    people: Object.freeze([
      row({figure: 'walker-1', who: 'Pim', at: [-2.8, -1], lift: .2, look: [-1, 0]}),
      row({figure: 'walker-6', who: 'A passenger with a ticket', at: [-2.8, 3.6], lift: .2, look: [-1, -.3]}),
    ]),
    animals: Object.freeze([
      // Tuesday trots between Pim and the passenger, and now and then round the end of the hut.
      row({kind: 'dog', who: 'Tuesday', lift: .2, pace: 1.3, wander: Object.freeze([[-2.8, -2.3], [-2.8, 2.3], [-2.8, 4.7], [.4, 4.7],
        [-2.8, 4.7], [-2.8, -2.3]].map(Object.freeze))}),
    ]),
  }),
]);

export const OUTPOST_WORLD_BY_ID = new Map(OUTPOSTS_WORLD.map(outpost => [outpost.id, outpost]));
