// Mrs Vane's things in the land (TOWN-VANE-SCENE): her white kiosks at the town's edge while the town's water is brown, her billboards,
// depots, tanks and white fences out in the Scablands as her deeds grow, and Vane Reach, her white tower, beyond the Dry Dam. All are
// parts of public/assets/models/wasteland/town/vane.glb. New data: it moves no place of the land, and tools/test-town-vane-scene.mjs
// checks every spot against the roads, the jobs' routes, the places and the ground.
//
// Measures are the model's own (read from vane.glb, 19 November 2026): `bounds` [west, north, east, south] in metres at no turn, `lift`
// how far the part is raised so its lowest point is on its floor (the fence set's feet stand 0.15 m up in the file), and each box
// [west, north, east, south, height] cut from the parts taller than a wheel at a cell of 1 m. Vane Reach is cut only where it stands
// lower than 4 m (its feet, its lamps and its shaft), so that a car meets its legs and drives under its braces; each of its boxes is as
// tall as the tower above it. `front` is the side with her blue drop on it.

const row = value => Object.freeze(value);
const boxes = list => Object.freeze(list.map(Object.freeze));

export const VANE_MODEL = '/assets/models/wasteland/town/vane.glb';

export const VANE_PIECES = row({
  kiosk: row({node: 'vane-kiosk', bounds: Object.freeze([-3.5, -3.5, 3.5, 3.5]), lift: 0, front: '-z',
    boxes: boxes([[-3, -4, -2, 3, 4.5], [2, -4, 3, 3, 4.5], [-2, -3, 2, 3, 5.5]])}),
  billboard: row({node: 'vane-billboard', bounds: Object.freeze([-3.5, -3.5, 3.5, 3.5]), lift: 0, front: '-z',
    boxes: boxes([[-4, -1, 4, 1, 7]])}),
  depot: row({node: 'vane-depot', bounds: Object.freeze([-11.25, -7.25, 11.25, 7.25]), lift: 0, front: '-z',
    boxes: boxes([[-1, -8, 1, -6, 3.7], [-11, -7, -1, -6, 3.8], [1, -7, 11, -6, 3.8], [-11, -3, 10, 7, 5.5], [10, 6, 11, 7, 2.5]])}),
  tank: row({node: 'vane-tank', bounds: Object.freeze([-7.1, -7.1, 7.1, 7.1]), lift: 0, front: '-z',
    boxes: boxes([[-1, -7, 1, 6, 8.4], [-3, -6, -1, 6, 8.4], [1, -6, 3, 6, 8.4], [-5, -5, -3, 5, 8.4], [3, -5, 5, 5, 8.4],
      [-6, -3, -5, 3, 7.9], [5, -3, 6, 3, 7.9]])}),
  fence: row({node: 'vane-fence', bounds: Object.freeze([-4.06, -4.06, 4.06, .06]), lift: -.15, front: '-z',
    boxes: boxes([[-1, -5, 1, 1, 2.1], [-5, -1, -1, 1, 2.1], [1, -1, 5, 1, 2.1]])}),
  tower: row({node: 'vane-tower', bounds: Object.freeze([-23, -23, 23, 23]), lift: 0, front: '-z',
    boxes: boxes([[-20, -20, -16, -16, 14.7], [16, -20, 20, -16, 14.7], [-11, -18, -10, -17, 2.7], [11, -18, 12, -17, 2.7],
      [-18, -12, -17, -11, 2.7], [17, -11, 18, -10, 2.7], [-4, -4, 4, 4, 70.3], [-18, 10, -17, 11, 2.7], [17, 11, 18, 12, 2.7],
      [-20, 16, -16, 20, 14.7], [16, 16, 20, 20, 14.7], [-12, 17, -11, 18, 2.7], [10, 17, 11, 18, 2.7]])}),
});

// What stands at a territory's site for each kind of deed she holds, in the site's own metres (its -z toward the road). `turn` is a
// further turn of the part, in quarter turns.
export const VANE_SITE_PLAN = row({
  road: Object.freeze([row({piece: 'billboard', at: Object.freeze([0, -12])})]),
  works: Object.freeze([row({piece: 'depot', at: Object.freeze([-8, 5])}), row({piece: 'fence', at: Object.freeze([-12, 14]), turn: 2}),
    row({piece: 'fence', at: Object.freeze([-4, 14]), turn: 2})]),
  outpost: Object.freeze([row({piece: 'tank', at: Object.freeze([13, 5])}), row({piece: 'fence', at: Object.freeze([13, 14]), turn: 2})]),
});
export const VANE_SITE_REACH = 26;

// One site a territory, on the road out toward it (docs/WASTELAND_TOWN.md section 8; the territories' places are in
// src/town/content/deeds.js), 40 to 66 m off the road's middle.
export const VANE_SITES = Object.freeze([
  row({territoryId: 'sal', at: Object.freeze(['ships-in-sand', 1346, 1972])}),
  row({territoryId: 'dustmonger', at: Object.freeze(['tin-town', -1004, 602])}),
  row({territoryId: 'mirage', at: Object.freeze(['dead-mall', 791, -196])}),
  row({territoryId: 'gunn', at: Object.freeze(['iron-line', 826, 5])}),
  row({territoryId: 'kettle', at: Object.freeze(['yard', 42, 690])}),
  row({territoryId: 'vultures', at: Object.freeze(['tin-town', -751, 1545])}),
  row({territoryId: 'tollkeeper', at: Object.freeze(['ridge', 1113, 1563])}),
  row({territoryId: 'blackiron', at: Object.freeze(['dry-dam', 887, 698])}),
]);

// Where a kiosk may be pitched, in metres from the yard: five rings round the town, eight to a ring. A kiosk takes the free pitch nearest
// the town's edge on the side of its brown street. A pitch under one of the town's buildings or roads is not free.
export const VANE_KIOSK_PITCHES = Object.freeze([
  [170, -112], [143, 13], [-24, 56], [-134, 22], [-210, -112], [-120, -232], [0, -282], [112, -240],
  [300, -112], [226, 85], [24, 227], [-212, 100], [-300, -112], [-212, -324], [0, -412], [226, -309],
  [450, -112], [320, 262], [-31, 337], [-318, 206], [-450, -112], [-318, -430], [0, -562], [318, -430],
  [620, -112], [453, 341], [-43, 506], [-468, 295], [-620, -112], [-438, -550], [0, -732], [438, -550],
  [820, -112], [580, 468], [-57, 706], [-580, 468], [-820, -112], [-580, -692], [0, -932], [580, -692],
].map(Object.freeze));
export const VANE_KIOSK_REACH = 7;

// Vane Reach: on the plain beyond the Dry Dam, 750 m out on the line from the yard, short of the ridge. White, 70 m tall.
export const VANE_REACH = row({at: Object.freeze(['dry-dam', -611, -438]), reach: 34, drawRange: 2400});
