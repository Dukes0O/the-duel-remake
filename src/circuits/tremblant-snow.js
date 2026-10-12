// Tremblant Snow (docs/CIRCUITS.md section 5.3, card P4-TREMBLANT-SNOW): the
// Tremblant Woods circuit on a winter morning after fresh snow. The road is the
// same road (src/circuits/tremblant-woods.js hands over its script, hill, lake
// bowl, lift and safety kit); what changes is the ground it lies on and the
// world around it:
//
//   - Surfaces by stretch: packed snow on most of the lap; asphalt on Lodge
//     Straight and Timber Straight, ploughed and sunny; two ice patches in the
//     forest, each with its ICE board 100 m before (Fir Esses exit, and the
//     spur before Beaver Hairpin). Plough banks (deep snow) line the road.
//   - Winter tyres on the race setup; a pit lane on Lodge Straight (P4-PIT).
//   - A low pale sun and cold blue shadows, snow-laden pines, a frozen lake,
//     skiers on the ski runs, the chairlift running and smoke from the lodge.
//
// It is a pure race track like Tremblant Woods (`noCombat`) and joins the Grand
// Prix list. Its own switch, `tremblant-snow`, keeps it off until released.
import { defineScriptedCourse } from '../track-script.js';
import { hillReach, runWeight } from '../circuit-hills.js';
import { TREMBLANT_SHARED as T } from './tremblant-woods.js';

const { BASE, road, LENGTH, kit, along, stream, FACE_RIGHT, HILL, LAKE, DIVIDE, lodge, chairlift, safety, lakeside, backdrop } = T;
const piece = (name, nth = 0) => road.pieces.filter(item => item.name === name)[nth];

// ---- the road: the same script, with a surface on every piece -------------------------------------

// Ploughed and sunny; everything else is packed snow.
const CLEARED = ['Lodge Straight', 'Timber Straight'];
const script = BASE.script.map(entry => {
  const options = entry.at(-1);
  return [...entry.slice(0, -1), { ...options, surface: CLEARED.includes(options.name) ? 'asphalt' : 'snow' }];
});

// Two shaded ice patches, 50 m each. The first lies just past the Fir Esses, on the start of
// Ridge Run; the second on the short spur before Beaver Hairpin (never on a hairpin apex).
const ICE = (() => {
  const esses = piece('Fir Esses 2'), hairpin = piece('Beaver Hairpin');
  return [
    { id: 'fir-esses-ice', kind: 'ice', shaded: true, s0: esses.s1 + 12, s1: esses.s1 + 62 },
    { id: 'beaver-spur-ice', kind: 'ice', shaded: true, s0: hairpin.s0 - 70, s1: hairpin.s0 - 20 },
  ];
})();

// Snow lies on the whole lap except Lodge Straight, where the pits, garages and stands are (the
// plough banks would run along the pit lane). Wind scours the open top of Ridge Run.
const WINTER = (() => {
  const lodgeStraight = piece('Lodge Straight'), ridge = piece('Ridge Run');
  return {
    always: true, drifts: true,
    ranges: [{ from: lodgeStraight.s1, to: LENGTH + lodgeStraight.s0 }],
    exposed: [{ from: ridge.s0 + 30, to: ridge.s1 - 30 }],
  };
})();

// ---- the light: a winter morning ------------------------------------------------------------------
// The sun is about 16 degrees up, pale and a little warm, so the long shadows fall cold and blue from
// the sky's fill light. `winter` is laid over the shared winter look (snow-world.js).
const MORNING = {
  sunOffset: { x: -118, y: 34, z: 24 }, sunColor: 0xfff0dc, sun: 2.25, hemi: 1.65, env: .6, sunStrength: 1,
  fog: 0xc6d4e2, fogNear: 320, fogFar: 2000, top: '#4f7fb3', horizon: '#e9e2da', ground: 0x6f93b8,
  cloudTint: [.9, .88, .86], cloudCover: .45, exposure: 1.12, bloom: .12,
  winter: { sunColor: 0xfff0dc, top: '#6e9cc9', horizon: '#eae3dc', fog: 0xc6d4e2, ground: 0x6c8fb6, cloudTint: [.9, .88, .86] },
};

// ---- the scenery ----------------------------------------------------------------------------------

// The paddock: the start gantry, the stands on the left, and the pit garages and wall on the right
// behind the pit lane, which begins just past the line and has its boxes in the middle of Lodge Straight.
function paddock() {
  const out = [kit('start-gantry', 0, 0, { heading: Math.PI })];
  out.push(...along('pit-garage', 112, 206, 7.4, -31));
  out.push(...along('pit-wall', 110, 208, 4.05, -22));
  for (let s = 10; s <= 70; s += 15) out.push(kit('grandstand', s, 31, { heading: FACE_RIGHT, clear: 10, crowd: true }));
  return out;
}

// Pines on the hill, standing in the snow off the ski runs. The hill lifts each one onto its slope.
function hillPines() {
  const random = stream(0x5a0b), out = [];
  for (let attempt = 0; out.length < 130 && attempt < 2400; attempt++) {
    const du = (random() * 2 - 1) * HILL.along * .86, dv = (random() * 2 - 1) * HILL.across * .86;
    if (hillReach(HILL, du, dv) > .86 || runWeight(HILL, du, dv) > .02) continue;
    out.push(kit('snow-pine', HILL.s + du, HILL.lateral + dv, { heading: random() * Math.PI * 2, scale: .8 + random() * .5, clear: 3.5, hill: 0 }));
  }
  return out.filter(Boolean);
}

// Eight snowmen near the lodge (P4-SNOWMEN, docs/CIRCUITS.md 5.4 "Snowmen"). The snowman kit exists and
// the destructible scenery that makes them smashable does not land until P4-SNOWMEN, so these are
// placement data only: nothing here is drawn. When P4-SNOWMEN lands it reads this list; until then
// it stays out of `kitPlacements`. Each stands in the runoff, well off the racing line.
export const SNOWMAN_SPOTS = Object.freeze([100, 130, 165, 200, 230, 260, 285, 305].map((s, i) => Object.freeze({ s, lateral: i % 2 ? 25 : 18 })));

// Pale ski runs on the far mountain, and the pale ski mountain itself: snow over the high ground, dark
// pines on the lower slopes, blue-white patches where the snow lies in the trees.
function snowyBackdrop() {
  const far = backdrop();
  return { ...far, colours: {
    forest: [0x35523a, 0x2c4733, 0x3f5d3f, 0x34503a],
    autumn: [0xaec2d2, 0x9fb5c8, 0xc2d1de], run: 0xf6f9fc, share: .5, cut: .5,
    snow: { from: .26, blend: .34, colour: 0xe9f0f6, share: .94 },
  } };
}

const FROZEN_LAKE = { ...LAKE, frozen: true, colour: 0x7ea3c1, shallow: 0xd4e3ef };

export const TREMBLANT_SNOW = defineScriptedCourse({
  ...BASE,
  id: 'tremblant-snow', name: 'Tremblant Snow', flag: 'tremblant-snow', stage: 19, script,
  defaultMood: 'clear',
  // The racers drive this much of their usual pace here, per difficulty (src/race-field-driver.js).
  // Found with tools/race-field-balance.mjs --course tremblant-snow (see docs/changes/P4-TREMBLANT-SNOW.md).
  fieldPace: { easy: .92, medium: .90, hard: .90 },
  surfacePatches: ICE,
  pitLane: { straight: 'Lodge Straight', side: 'right' },
  snowWorld: WINTER,
  intel: { ...BASE.intel, notes: { ...BASE.intel.notes,
    'fir-esses-2': { line: 'Be straight before the crest, then let the car roll over the ice.', note: 'Ice on the exit, past the corner and under the trees. The ICE board gives you 100 m of warning; lift before it, not on it.' },
    'beaver-hairpin': { brakeBoard: 100, line: 'Brake on the spur, before the ice if you can.', note: 'The second ice patch is on the spur just before the hairpin. Winter tyres hold; summer tyres do not.' },
  } },
  markings: 'circuit', light: MORNING,
  // The land beyond the trees rises gently, so the snowy hills behind it carry the skyline.
  relief: { from: 25, to: 100, scale: .38 },
  // The forest crowds the road from 13 m beyond the edge, as in Tremblant Woods; here every planted pine is
  // a snow pine. The pines keep out of the lake, the lift's cut, the paddock and the pits.
  scenery: {
    mountains: false, forest: { from: 13, to: 31, spacing: 4.6, rows: 4 },
    clear: [
      { s0: LAKE.s - LAKE.along - 10, s1: LAKE.s + LAKE.along + 10, from: 8, to: LAKE.lateral + LAKE.across + 10 },
      { s0: T.LIFT.s - 7, s1: T.LIFT.s + 7, from: -135, to: 135 },
      { s0: LENGTH - 90, s1: LENGTH, from: -60, to: 60 }, { s0: 0, s1: 130, from: -60, to: 60 }, { s0: 130, s1: 235, from: -60, to: -8 },
      { s0: DIVIDE.timber[0] - 6, s1: DIVIDE.timber[1] + 6, from: DIVIDE.side > 0 ? 8 : -90, to: DIVIDE.side > 0 ? 90 : -8 },
      { s0: DIVIDE.spur[0] - 6, s1: DIVIDE.spur[1] + 6, from: DIVIDE.side > 0 ? -90 : 8, to: DIVIDE.side > 0 ? -8 : 90 },
    ],
  },
  // The hill beside the lodge: snow among the trees, pale groomed runs.
  hills: [{ ...HILL, pines: 0, palette: { floor: 0x9db3c6, litter: 0xd4e0ea, run: 0xf3f7fa, runDry: 0xe1ebf2 } }],
  basins: [LAKE],
  effects: {
    lake: FROZEN_LAKE, lift: T.LIFT, backdrop: snowyBackdrop(), plainHills: true,
    skiers: { seed: 0x5c1e5, hill: { count: 40, scale: 1 }, backdrop: { count: 70, scale: 3 } },
    // The chimney of the ski lodge (the kit's own metres: the top of its chimney stack).
    smoke: { id: 'ski-lodge', local: [4.24, 6.45, -2.3], count: 12, rise: .9, life: 11, size: [1.6, 6], wind: [.7, .3], opacity: .75 },
  },
  kitPlacements: [...paddock(), ...safety(), ...lakeside(), ...lodge(), ...chairlift(), ...hillPines()].filter(Boolean),
});
