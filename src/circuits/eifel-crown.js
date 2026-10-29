// C2 rough road from docs/courses/eifel-crown.md, section 2.2.
// Keep the released expansion road in slot 9 until this preview is enabled.
import {defineScriptedCourse, buildTrackScript} from '../track-script.js';
import {basinReach} from '../circuit-hills.js';

const roadDefinition = defineScriptedCourse({
  id: 'eifel-crown', name: 'Eifel Crown', flag: 'eifel-crown',
  theme: 'alpine', stage: 9, layoutSeed: 1989, layoutVersion: 3, kind: 'circuit',
  closed: true, laps: 2, hasRival: true, hasRadar: false, speedLimitMph: 65,
  airborne: true, terrainHalfWidth: 64, markings: 'circuit', defaultMood: 'overcast',
  sections: [
    {theme: 'alpine', name: 'Forest Esses', share: .42},
    {theme: 'alpine', name: 'Crown Ridge', share: .35},
    {theme: 'alpine', name: 'Valley Sweep', share: .23},
  ],
  scriptStart: 60,
  script: [
    ['straight', 255, {climb: 1.5, name: 'Lodge Straight', width: 14}],
    ['turn', 'L', 30, 300, {climb: 14, name: 'Start Kink'}],
    ['straight', 53, {climb: 5.3}],
    ['turn', 'R', 45.5, 180, {climb: 19.7, name: 'Spruce Bend'}],
    ['straight', 140, {climb: 11.7}],
    ['turn', 'L', 81.5, 130, {climb: 4.7, name: 'First Ess'}],
    ['straight', 53, {climb: -2}],
    ['turn', 'R', 47, 120, {climb: -8.9, name: 'Second Ess'}],
    ['straight', 96, {climb: -9.3}],
    ['turn', 'L', 62, 110, {climb: -16.5, name: 'Third Ess'}],
    ['straight', 113, {climb: -10.6}],
    ['turn', 'R', 48.5, 130, {climb: -5.2, name: 'Fourth Ess'}],
    ['straight', 96, {climb: 9.7, crest: 2.5, name: 'Forest Dip'}],
    ['turn', 'L', 85.5, 140, {climb: 46.1, name: 'Esses Exit'}],
    ['straight', 149, {climb: 24.8, name: 'Crown Climb'}],
    ['turn', 'R', 41.5, 170, {climb: 12.6, name: 'Crown Kink'}],
    ['straight', 191, {climb: -10.2, name: 'Ridge Top'}],
    ['turn', 'L', 120, 80, {climb: -36.9, name: 'Crag Corner'}],
    ['straight', 98, {climb: -18.9}],
    ['turn', 'R', 56.5, 85, {climb: -17.8, name: 'Castle Bend'}],
    ['straight', 106, {climb: -11}],
    ['turn', 'L', 87, 108, {climb: -2, name: 'Wall Left'}],
    ['straight', 170, {climb: 11.6, name: 'Village Street'}],
    ['turn', 'R', 48.5, 130, {climb: 16.5, name: 'Beech Right'}],
    ['straight', 142, {climb: 17}],
    ['turn', 'L', 77.5, 150, {climb: 15.9, name: 'Hatch Sweep'}],
    ['straight', 261, {climb: -15.3, name: 'Ridge Straight'}],
    ['turn', 'R', 41.5, 140, {climb: -15.6, name: 'Pine Right'}],
    ['straight', 198, {climb: -16.4}],
    ['turn', 'L', 70.5, 150, {climb: 5.2, name: 'Valley Brow'}],
    ['straight', 177, {climb: -7.6}],
    ['turn', 'R', 38, 220, {climb: -11.9, name: 'Reservoir Right'}],
    ['straight', 134, {climb: -.4}],
    ['turn', 'L', 114, 70, {name: 'Last Turn'}],
  ],
});

const road = buildTrackScript(roadDefinition);
const named = name => road.pieces.find(piece => piece.name === name);
const wrap = s => ((s % road.length) + road.length) % road.length;
const row = (id, s, lateral, extra = {}) => Object.freeze({id, s: wrap(s), lateral, ...extra});
// A piece lying along the road faces it: -PI/2 on the left (positive lateral), PI/2 on the right.
const facing = side => side > 0 ? -Math.PI / 2 : Math.PI / 2;
const edge = (s, out) => road.halfWidthAt(wrap(s)) + out;

// The script's automatic boards are for radii under 40 m. These three named
// braking corners need their own existing kits, on the outside of the road.
const boards = ['Crag Corner', 'Castle Bend', 'Last Turn'].flatMap(name => {
  const corner = named(name);
  return [150, 100, 50].map(distance => Object.freeze({
    id: `braking-board-${distance}`, s: road.phase(corner.s0 - distance),
    lateral: -corner.dir * (road.halfWidthAt(corner.s0 - distance) + 2.4), heading: Math.PI,
  }));
});

// ---------------------------------------------------------------------------
// C4 scenery, round 1 (docs/courses/eifel-crown.md sections 1, 8 and 10).
// Left is positive lateral. Nothing below stands on the road, inside its 12 m
// run-off, or on the inside of a corner where it would hide the exit.
// C5 builds the castle (outside Wall Left), the village (Village Street) and the
// reservoir (inside Reservoir Right); their ground is kept clear in `clear`.

// A short paddock: gantry on the line, garages on the right, a few stands on the left.
// The lodge goes on the left beyond the stands (C5), in the open ground cleared there.
function paddock() {
  const out = [row('start-gantry', 0, 0, {heading: Math.PI})];
  for (let s = -50; s < 22; s += 7.5) out.push(row('pit-garage', s, -edge(s, 20), {heading: Math.PI / 2, solid: true}));
  for (let s = -45; s < 5; s += 15) out.push(row('grandstand', s, edge(s, 24), {heading: -Math.PI / 2, solid: true, crowd: true}));
  return out;
}

// Armco on the outside of every corner tighter than a 150 m radius, just beyond the 12 m run-off, from
// 16 m before the corner to 56 m past it, so a car that slides wide at the exit still meets the rail.
// Rails of neighbouring corners on the same side join into one run. The long, gentle bends (Start Kink,
// Hatch Sweep, Valley Brow) stay open, and Last Turn has its tyre wall and marshals instead.
function safety() {
  const out = [], runs = {[-1]: [], 1: []};
  for (const piece of road.pieces.filter(item => item.kind === 'turn' && item.radius < 150 && item.name !== 'Last Turn'))
    runs[-piece.dir].push([piece.s0 - 16, piece.s1 + 56]);
  for (const side of [-1, 1]) {
    const merged = [];
    for (const [from, to] of runs[side].sort((a, b) => a[0] - b[0])) {
      if (merged.length && from <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(merged.at(-1)[1], to);
      else merged.push([from, to]);
    }
    for (const [from, to] of merged)
      for (let s = Math.ceil(from / 4) * 4; s < to; s += 4)
        out.push(row('armco', s, side * edge(s, 12.8), {heading: facing(side), solid: true}));
  }
  const last = named('Last Turn'), side = -last.dir;
  for (let s = last.s0 - 12; s < last.s1 + 4; s += 4)
    out.push(row('tyre-wall', s, side * edge(s, 12.8), {heading: facing(side), solid: true}));
  for (const at of [last.s0 + 14, last.s0 + 120])
    out.push(row('marshal-post', at, side * edge(at, 15.5), {heading: facing(side), solid: true}));
  return out;
}

// Field edges. A drystone wall (1.2 m) or a clipped hedge (1.8 m) runs 17 m beyond the road
// edge, with a gateway every so often. Neither is built on the inside of a tight corner, where
// the hedge would hide the way out. Cross walls divide the meadow into fields.
const FIELD_OFFSET = 17;
function fieldLine(id, from, to, side, {out = FIELD_OFFSET, gapEvery = 0, gapLength = 8} = {}) {
  const rows = [];
  for (let s = from; s < to; s += 4) {
    if (gapEvery && (s - from) % gapEvery < gapLength) continue;
    const piece = road.pieceAt(wrap(s));
    if (piece.kind === 'turn' && side === piece.dir && piece.radius < 150) continue;
    rows.push(row(id, s, side * edge(s, out), {heading: facing(side), solid: true}));
  }
  return rows;
}
function crossLine(id, at, side, {from = FIELD_OFFSET, to = 56} = {}) {
  const rows = [];
  for (let out = from + 2; out < to; out += 4) rows.push(row(id, at, side * edge(at, out), {heading: 0, solid: true}));
  return rows;
}
function fields() {
  const wall = 'drystone-wall', hedge = 'hedge-row', out = [];
  const ridge = [named('Crown Climb').s0 + 10, named('Ridge Top').s1 - 10];
  const street = [named('Wall Left').s0 + 70, named('Beech Right').s0 + 40];
  const hatch = [named('Hatch Sweep').s0 - 10, named('Pine Right').s0 - 14];
  const middleRidge = (ridge[0] + ridge[1]) / 2;
  // Crown ridge: wall on the left with a hedge behind it, hedge then wall on the right.
  out.push(...fieldLine(wall, ridge[0], ridge[1], 1, {gapEvery: 96}),
    ...fieldLine(hedge, ridge[0], ridge[1], 1, {out: FIELD_OFFSET + .95, gapEvery: 96}),
    ...fieldLine(hedge, ridge[0], middleRidge, -1, {gapEvery: 128}),
    ...fieldLine(wall, middleRidge, ridge[1], -1, {gapEvery: 128}));
  for (const [i, at] of [ridge[0] + 70, ridge[0] + 190, ridge[0] + 310].entries()) out.push(...crossLine(wall, at, i % 2 ? 1 : -1));
  for (const [i, at] of [ridge[0] + 130, ridge[0] + 250].entries()) out.push(...crossLine(hedge, at, i % 2 ? -1 : 1, {to: 50}));
  // Village Street: the field side is the left; the right is kept open for the village (C5).
  out.push(...fieldLine(wall, street[0], street[1], 1, {gapEvery: 90}),
    ...fieldLine(hedge, street[0], street[1], 1, {out: FIELD_OFFSET + .95, gapEvery: 90}));
  for (const at of [street[0] + 40, street[0] + 130]) out.push(...crossLine(wall, at, 1));
  // Hatch Sweep to the Ridge Straight: both sides in turn.
  const middle = (hatch[0] + hatch[1]) / 2;
  out.push(...fieldLine(hedge, hatch[0], middle, 1, {gapEvery: 110}), ...fieldLine(wall, middle, hatch[1], 1, {gapEvery: 110}),
    ...fieldLine(wall, hatch[0], middle, -1, {gapEvery: 110}), ...fieldLine(hedge, middle, hatch[1], -1, {gapEvery: 110}));
  for (const [i, at] of [hatch[0] + 60, hatch[0] + 150, hatch[0] + 230, hatch[0] + 310, hatch[0] + 400].entries())
    out.push(...crossLine(i % 2 ? wall : hedge, at, i % 2 ? 1 : -1, {to: 50}));
  return out;
}

// Beeches stand among the spruce in the groves below, from the first row of the wood outward.
const BEECH_GROVES = [['Spruce Bend', .5], ['First Ess', .6], ['Third Ess', .5], ['Forest Dip', .5],
  ['Crag Corner', .6], ['Pine Right', .5], ['Valley Brow', .3]];

// ---------------------------------------------------------------------------
// C5 landmarks (docs/courses/eifel-crown.md sections 1, 8 and 10). Everything below stands in the rooms C4
// kept open: the castle crag outside Wall Left, the village right of Village Street, the reservoir inside
// Reservoir Right and the lodge beside the start. Nothing is on the road, in its 12 m run-off, or inside a
// corner where it could hide the way on.

// The castle: a crag hill (a wooded dome with a level top) and the castle kit standing on it, 110 m out on the
// right, in view from Ridge Top and the descent. The kit's rock foot sits on the hill's level top.
// `lift` is the hill's top above the drawn ground there, less 2.4 m so the rock foot is bedded into the level top (measured, and checked by the course test).
const CASTLE = Object.freeze({s: 3050, lateral: -110, scale: 1.6, heading: Math.PI / 2 + .35, hillHeight: 32, lift: 29.8});
const castleHill = Object.freeze({s: CASTLE.s, lateral: CASTLE.lateral, along: 64, across: 58, height: CASTLE.hillHeight, runs: Object.freeze([]),
  pads: Object.freeze([Object.freeze({du: 0, dv: 0, radius: 30, blend: 28})]),
  // Dark spruce and grey rock, not the bright green of a ski hill.
  palette: Object.freeze({floor: 0x41603a, litter: 0x6b6452})});

// The reservoir: a bowl in the hillside on the inside of Reservoir Right, drawn by the existing reflective
// circuit water and scooped by the helicopter's bucket. The concrete dam closes its far end.
const RESERVOIR = Object.freeze({id: 'eifel-reservoir', s: 5185, lateral: -108, along: 115, across: 30, surface: 1.4, depth: 4.5,
  bank: .12, blend: 30, keep: 12, colour: 0x1d3a3c, shallow: 0x58796c});
const DAM_MODULE = 14;
// Where the shore ends at the far tip, and the dam standing just short of it, face to the water.
function reservoirDam() {
  const reach = (du, dv) => basinReach(RESERVOIR, du, dv);
  let tip = 0;
  for (let du = RESERVOIR.along * 1.3; du > 0; du -= .5) if (reach(du, 0) <= 1) { tip = du; break; }
  const du = tip - 9;
  let from = Infinity, to = -Infinity;
  for (let dv = -RESERVOIR.across * 1.3; dv <= RESERVOIR.across * 1.3; dv += .5) if (reach(du, dv) <= 1) { from = Math.min(from, dv); to = Math.max(to, dv); }
  const middle = (from + to) / 2, count = Math.ceil((to - from) / DAM_MODULE) + 2;
  const out = [];
  for (let k = 0; k < count; k++)
    out.push(row('dam-wall', RESERVOIR.s + du, RESERVOIR.lateral + middle + (k - (count - 1) / 2) * (DAM_MODULE - .3), {heading: Math.PI, scale: [1, .8, 1]}));
  return out;
}

// The village: a main street and a short lane on the right of Village Street, houses on both sides facing the
// street, a stone church at the far end, and drystone garden walls along the frontages. At most 120 houses.
const VILLAGE_STREET = -43;
const VILLAGE_START = named('Wall Left').s0 + 150, VILLAGE_END = named('Village Street').s1 - 20;
function village() {
  const houses = [], taken = [];
  const free = (s, lateral, along, across) => taken.every(other =>
    Math.abs(other.s - s) >= other.along + along || Math.abs(other.lateral - lateral) >= other.across + across);
  const hash = n => { const x = Math.sin(n * 91.7 + 3.1) * 24634.6345; return x - Math.floor(x); };
  const church = {s: VILLAGE_END - 8, lateral: VILLAGE_STREET, along: 12, across: 9};
  taken.push(church);
  for (let s = VILLAGE_START, i = 0; s < VILLAGE_END - 14; s += 13, i++) {
    const centre = VILLAGE_STREET + 1.4 * Math.sin((s - VILLAGE_START) / 55);
    for (const side of [-1, 1]) {
      if (hash(i * 2 + side) < .22) continue;
      const width = 6.4 + (i + side + 4) % 3 * .5, depth = 7 + i % 2 * .7;
      // Rows on the road side (side +1) face the street from the road; rows beyond it face back.
      const lateral = centre + side * 8.6, middle = lateral - side * 1.15;
      const halfAlong = width / 2 + .8, halfAcross = (depth + 2.3) / 2 + .6;
      if (!free(s, middle, halfAlong, halfAcross)) continue;
      taken.push({s, lateral: middle, along: halfAlong, across: halfAcross});
      houses.push(Object.freeze({s, lateral, heading: side > 0 ? -Math.PI / 2 : Math.PI / 2, width, depth, storeys: hash(i * 5 + side) < .4 ? 2 : 1}));
    }
  }
  const mainStreet = Object.freeze({width: 4, points: Object.freeze(Array.from({length: VILLAGE_END - VILLAGE_START + 1}, (_, i) => {
    const s = VILLAGE_START + i;
    return Object.freeze({s, lateral: VILLAGE_STREET + 1.4 * Math.sin((s - VILLAGE_START) / 55)});
  }))});
  // A short lane from the street back toward the field side of the road.
  const lane = Object.freeze({width: 3, points: Object.freeze(Array.from({length: 24}, (_, i) =>
    Object.freeze({s: VILLAGE_START + 52 + i, lateral: VILLAGE_STREET + 1.4 * Math.sin(52 / 55) + 3 + i * .62})))});
  return {houses: Object.freeze(houses), lamps: Object.freeze([]), streets: Object.freeze([mainStreet, lane]), church};
}
const villageLayout = village();
const villageMiddle = (VILLAGE_START + VILLAGE_END) / 2;
// Drystone garden walls along both frontages of the main street, with a gateway every third piece.
function gardenWalls() {
  const out = [];
  for (const side of [-1, 1]) for (let s = VILLAGE_START + 4, i = 0; s < VILLAGE_END - 22; s += 4, i++) {
    if (i % 3 === 2) continue;
    const centre = VILLAGE_STREET + 1.4 * Math.sin((s - VILLAGE_START) / 55);
    out.push(row('drystone-wall', s, centre + side * 3.7, {heading: Math.PI / 2, solid: true}));
  }
  return out;
}

// The timber lodge beside the start straight, on the left beyond the stands, facing the road.
const lodge = () => [row('eifel-lodge', 84, 54, {heading: -Math.PI / 2, scale: 1.1, clear: 14})];

const landmarkRows = Object.freeze([...reservoirDam(), ...gardenWalls(), ...lodge(),
  row('eifel-castle', CASTLE.s, CASTLE.lateral, {heading: CASTLE.heading, scale: CASTLE.scale, lift: CASTLE.lift, clear: 20})]);

export const EIFEL_CROWN = Object.freeze({
  ...roadDefinition,
  // Green and white kerbs (src/track-script-scene.js `kerbColours`).
  kerbColours: Object.freeze([0x2f6b3c, 0xe8e6df]),
  // C5: the forest and birds bed and the church bell (src/sound-bank.js, tools/audio/build-eifel.mjs), the
  // reservoir (existing reflective circuit water, a basin the helicopter's bucket scoops from), the castle crag
  // and the village (code-built, half-timbered).
  ambience: 'eifel',
  landmarkSound: Object.freeze({cue: 'landmark.village-bell', s: Math.round(villageMiddle), reach: 150}),
  water: Object.freeze({glitter: false}),
  basins: Object.freeze([RESERVOIR]),
  hills: Object.freeze([castleHill]),
  circuitLandmarks: Object.freeze([
    Object.freeze({id: 'eifel-village', type: 'town', s: Math.round(villageMiddle), lateral: VILLAGE_STREET, height: 12,
      houseStyle: 'half-timber', roofColours: Object.freeze([0x15181b, 0x1b1f23, 0x121518]),
      houses: villageLayout.houses, lamps: villageLayout.lamps, streets: villageLayout.streets}),
    Object.freeze({id: 'eifel-church', type: 'church', s: villageLayout.church.s, lateral: VILLAGE_STREET, height: 22,
      churchStyle: 'stone', grounding: 'footprint'}),
  ]),
  // Valley mist in the low places and a dark, damp road under the trees (the existing Ardennes presentation).
  effects: Object.freeze({
    valleyMist: Object.freeze([
      Object.freeze({s: named('Forest Dip').s0 + 30, lateral: 40, along: 90, across: 26, count: 12, height: 2, opacity: .2, colour: 0xd1ddda, fadeEnd: 1}),
      Object.freeze({s: named('Village Street').s0 + 60, lateral: 46, along: 100, across: 24, count: 10, height: 2, opacity: .1, colour: 0xd1ddda, fadeEnd: 1}),
      Object.freeze({s: named('Reservoir Right').s0 + 60, lateral: 46, along: 110, across: 26, count: 12, height: 2.5, opacity: .18, colour: 0xd9e3e0, fadeEnd: 1}),
      Object.freeze({s: named('Esses Exit').s1 + 60, lateral: -44, along: 90, across: 24, count: 10, height: 18, opacity: .14, colour: 0xe4e9e7, fadeEnd: 1}),
    ]),
  }),
  wetRoad: Object.freeze({performanceShare: .5}),
  dampRoad: Object.freeze({colour: 0x6e6e6c, dryRoughness: .9, dampRoughness: .84, mist: true,
    shadeRanges: Object.freeze([['Third Ess', 'Fourth Ess'], ['Pine Right', 'Valley Brow']].map(([from, to]) =>
      Object.freeze({from: named(from).s0, to: named(to).s1})))}),
  // The beech kit shared with Ardennes, mixed into the wooded slopes.
  beech: Object.freeze({scales: Object.freeze([.9, 1, 1.1]), setback: 0,
    groves: Object.freeze(BEECH_GROVES.map(([name, fraction]) => {
      const piece = named(name);
      return Object.freeze({s: piece.s0 + (piece.s1 - piece.s0) * fraction, reach: 20});
    }))}),
  // The duller green of beech leaves under a grey sky (the kit's leaf material, tinted).
  kitLook: Object.freeze({'ardennes-beech': Object.freeze({leafColour: 0x66755c})}),
  scenery: Object.freeze({trees: 500, rocks: 80, mountains: false,
    // Dense dark spruce right behind the verge: the first row stands 14 m past the edge, just
    // beyond the 12 m run-off, and the wood is seven rows deep, crowns touching.
    forest: Object.freeze({from: 14, to: 38, spacing: 3, rows: 7, thin: .05,
      scale: Object.freeze([1, 1.8]), jitter: .8, crowd: 2.2, insideOpen: 22}),
    // Wooded hills beyond, in broad groves with little meadow between them.
    farForest: Object.freeze({from: 60, to: 340, thin: .3, scale: Object.freeze([1.4, 2.6]), jitter: .8,
      groves: Object.freeze({every: 24, chance: .5, radius: Object.freeze([30, 56]), spacing: 8, crowd: 1.5, size: .3,
        lone: 5, minGrove: 6, rise: 6})}),
    clear: Object.freeze([
      // The start: paddock, grid and the lodge's meadow (C5).
      Object.freeze({s0: 0, s1: 150, from: -60, to: 55}),
      Object.freeze({s0: 150, s1: 300, from: 12, to: 55}),
      Object.freeze({s0: road.length - 110, s1: road.length, from: -60, to: 55}),
      // The ridge meadows: the forest opens out to 44 m on both sides and stands behind the field
      // boundaries; the far hills stay wooded.
      Object.freeze({s0: named('Crown Climb').s0 - 30, s1: named('Ridge Top').s1 + 30, from: -44, to: 44}),
      Object.freeze({s0: named('Hatch Sweep').s0 - 30, s1: named('Pine Right').s0 - 8, from: -44, to: 44}),
      // C5 rooms: the castle crag outside Wall Left, the village on the right of Village Street,
      // the field side of Village Street, and the reservoir inside Reservoir Right.
      Object.freeze({s0: named('Castle Bend').s1 - 40, s1: named('Wall Left').s1 + 40, from: -235, to: -90}),
      Object.freeze({s0: named('Castle Bend').s1 + 60, s1: named('Beech Right').s0 + 80, from: -64, to: -12}),
      Object.freeze({s0: named('Wall Left').s0 + 40, s1: named('Beech Right').s0 + 80, from: 12, to: 64}),
      Object.freeze({s0: named('Reservoir Right').s0 - 120, s1: named('Reservoir Right').s1 + 110, from: -150, to: -66}),
      // A window through the wood on the inside of the bend, so the water shows from the road.
      Object.freeze({s0: named('Reservoir Right').s0 - 220, s1: named('Reservoir Right').s1 + 110, from: -66, to: -12}),
    ]),
  }),
  // The ground reads darker and damper than the generic green: a cool wash beyond the verge,
  // and a dark meadow tint beside each corner (colour only).
  groundLeaves: Object.freeze({strength: .55, reach: 70, far: .6,
    // Patches of lighter hay and darker damp grass break up the meadows.
    colours: Object.freeze([Object.freeze([1.12, 1.06, .8]), Object.freeze([.86, .96, .8]), Object.freeze([1.04, 1.1, .84]),
      Object.freeze([.8, .9, .76])]),
    // Where a roadside ditch would run: a dark, wet strip of grass between the run-off and the trees.
    verge: Object.freeze({colour: Object.freeze([.6, .74, .56]), from: 3, to: 12, fade: 4}),
    wood: Object.freeze({green: Object.freeze([.84, .95, .78]), colours: Object.freeze([Object.freeze([.84, .95, .78])]), share: .02, from: -50}),
    gravel: Object.freeze({colour: Object.freeze([.64, .61, .54]), width: 12, fade: 8, ends: 24,
      grass: Object.freeze([.78, .92, .72]), to: 55})}),
  kitPlacements: Object.freeze([...paddock(), ...safety(), ...boards, ...fields(), ...landmarkRows]),
});

export const manifest = Object.freeze({
  id: 'eifel-crown', flag: 'eifel-crown', state: 'dev', slot: 9, price: 1400,
  grandPrix: true, releaseOrder: 12,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
