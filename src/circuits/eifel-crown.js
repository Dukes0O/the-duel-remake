// C2 rough road from docs/courses/eifel-crown.md, section 2.2.
// Keep the released expansion road in slot 9 until this preview is enabled.
import {defineScriptedCourse, buildTrackScript} from '../track-script.js';

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
  // Village Street: the field side is the left; the right is kept open for the village (C5).
  out.push(...fieldLine(wall, street[0], street[1], 1, {gapEvery: 90}),
    ...fieldLine(hedge, street[0], street[1], 1, {out: FIELD_OFFSET + .95, gapEvery: 90}));
  for (const at of [street[0] + 40, street[0] + 130]) out.push(...crossLine(wall, at, 1));
  // Hatch Sweep to the Ridge Straight: both sides in turn.
  const middle = (hatch[0] + hatch[1]) / 2;
  out.push(...fieldLine(hedge, hatch[0], middle, 1, {gapEvery: 110}), ...fieldLine(wall, middle, hatch[1], 1, {gapEvery: 110}),
    ...fieldLine(wall, hatch[0], middle, -1, {gapEvery: 110}), ...fieldLine(hedge, middle, hatch[1], -1, {gapEvery: 110}));
  for (const [i, at] of [hatch[0] + 90, hatch[0] + 230, hatch[0] + 370].entries())
    out.push(...crossLine(hedge, at, i % 2 ? 1 : -1, {to: 44}));
  return out;
}

// Beeches stand only in the back rows of the wood (26 m or more beyond the road edge);
// the first rows next to the road stay spruce.
const BEECH_GROVES = [['Spruce Bend', .5], ['First Ess', .6], ['Third Ess', .5], ['Forest Dip', .5],
  ['Crag Corner', .6], ['Pine Right', .5], ['Valley Brow', .3]];

export const EIFEL_CROWN = Object.freeze({
  ...roadDefinition,
  // Green and white kerbs (src/track-script-scene.js `kerbColours`).
  kerbColours: Object.freeze([0x2f6b3c, 0xe8e6df]),
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
  beech: Object.freeze({scales: Object.freeze([.9, 1, 1.1]), setback: 26,
    groves: Object.freeze(BEECH_GROVES.map(([name, fraction]) => {
      const piece = named(name);
      return Object.freeze({s: piece.s0 + (piece.s1 - piece.s0) * fraction, reach: 32});
    }))}),
  scenery: Object.freeze({trees: 500, rocks: 80, mountains: false,
    // Dense dark spruce close behind the verge on the wooded slopes.
    forest: Object.freeze({from: 18, to: 58, spacing: 3.6, rows: 8, thin: .14,
      scale: Object.freeze([1.1, 2.1]), jitter: .8}),
    // Wooded hills beyond, in groves with meadow between them.
    farForest: Object.freeze({from: 60, to: 220, thin: .5, scale: Object.freeze([1.4, 2.6]), jitter: .8,
      groves: Object.freeze({every: 20, chance: .34, radius: Object.freeze([20, 42]), spacing: 5, crowd: 1.5, size: .3,
        lone: 5, minGrove: 6, rise: 6})}),
    clear: Object.freeze([
      // The start: paddock, grid and the lodge's meadow (C5).
      Object.freeze({s0: 0, s1: 300, from: -60, to: 55}),
      Object.freeze({s0: road.length - 110, s1: road.length, from: -60, to: 55}),
      // The ridge meadows: the forest opens out to 44 m on both sides and stands behind the field
      // boundaries; the far hills stay wooded.
      Object.freeze({s0: named('Crown Climb').s0 - 30, s1: named('Ridge Top').s1 + 30, from: -44, to: 44}),
      Object.freeze({s0: named('Hatch Sweep').s0 - 30, s1: named('Pine Right').s0 - 8, from: -44, to: 44}),
      // C5 rooms: the castle crag outside Wall Left, the village on the right of Village Street,
      // the field side of Village Street, and the reservoir inside Reservoir Right.
      Object.freeze({s0: named('Castle Bend').s1 - 40, s1: named('Wall Left').s1 + 40, from: -260, to: -90}),
      Object.freeze({s0: named('Castle Bend').s1 + 60, s1: named('Beech Right').s0 + 80, from: -64, to: -12}),
      Object.freeze({s0: named('Wall Left').s0 + 40, s1: named('Beech Right').s0 + 80, from: 12, to: 64}),
      Object.freeze({s0: named('Reservoir Right').s0 - 120, s1: named('Reservoir Right').s1 + 110, from: -260, to: -80}),
    ]),
  }),
  // The ground reads darker and damper than the generic green: a cool wash beyond the verge,
  // and a dark meadow tint beside each corner (colour only).
  groundLeaves: Object.freeze({strength: 0,
    wood: Object.freeze({green: Object.freeze([.84, .95, .78]), colours: Object.freeze([Object.freeze([.84, .95, .78])]), share: .02, from: -50}),
    gravel: Object.freeze({colour: Object.freeze([.64, .61, .54]), width: 12, fade: 8, ends: 24,
      grass: Object.freeze([.78, .92, .72]), to: 55})}),
  kitPlacements: Object.freeze([...paddock(), ...safety(), ...boards, ...fields()]),
});

export const manifest = Object.freeze({
  id: 'eifel-crown', flag: 'eifel-crown', state: 'dev', slot: 9, price: 1400,
  grandPrix: true, releaseOrder: 12,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
