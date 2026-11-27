// Radio Hill (OPEN-LOOK-RADIO-HILL, round 1), drawn in code: the camp of the sisters Hetty and Bern, who keep a mast and a radio
// set that still works. Design: docs/story/open-scablands.md section 16 (its row in the sites table) and the storyline page
// docs/story/threads/radio-hill-voice.md (the red lamp, the generator that coughs, the hut, the winch truck, the second set).
//
// The mast is the site's tell: a lattice 25 m tall whose lower third is an old factory-made mast in faded bands and whose upper
// two thirds were added from whatever tube the sisters found, collared and lashed, guyed at three levels to three anchors, leaning
// a little. Hetty's red lamp is at the top, under the whip aerial; at night it blinks. Below it: the sisters' hut of corrugated tin
// on a timber frame with its door to the south and the set seen through the door, the generator under its hood with the nine cans
// of fuel, a wind charger and a crate of car batteries, the long-wire aerial strung from the mast to the hut, Bern's bench, a
// heap of parts, a washing line, Hetty's lookout of stacked stones, and Bern's winch truck. At the stage `second-set` a second set
// stands on the table (Parrot's, taken from the Pocket) with its own aerial on a pole beside the hut.
//
// Everything is in metres from the site's centre (the foot of the mast): x to the east, z to the south, y up from the ground. The
// layout is a fixed list worked out once from a fixed seeded sequence, so it is the same on every run and its solids can be listed
// before anything is drawn. Nothing here changes race state, reads a save or reads the clock of the wall. No ground is cut: each
// thing stands on `heightAt`.
//
// The rules already place Radio Hill's mast, hut, generator and anchor, and the spots its people walk to (`RADIO_HILL` in
// src/world/open/content/sites.js). This layout keeps every one of those names and positions.
//
// What this file gives the cards that place the site and use it:
//   RADIO_HILL_LAYOUT                      the radius, every named spot, where each thing stands
//   radioHillSolids(stage)                 the boxes and circles a car or a walker cannot pass
//   buildRadioHill({stage, heightAt, night})  a THREE.Group; `heightAt(x, z)` is the ground under a point of the site, in the group's
//                                          own metres. `night` lights the red lamp and the hut.
//   updateRadioHill(group, seconds, {night, signalAt})  the parts that move: the lamp's blink, the wind charger, the smoke, the
//                                          wear. `signalAt` is the game's time at which Hetty was asked to blink three times.
//   radioHillLamp(seconds, {night, signalAt})  how bright the red lamp is (0 to 1), without graphics
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createScrapWear} from '../../scrap-look.js';
import {createSmokeColumn} from '../../smoke-column.js';

export const RADIO_HILL_STAGES = Object.freeze(['camp', 'second-set']);
export const RADIO_HILL_BUDGET = Object.freeze({draws: 12, triangles: 60000});

const RADIUS = 24;
// The wind blows towards the east-south-east, as Tin Town's chimney smoke does. The wind charger faces into it.
const WIND = Object.freeze({x: .94, z: .34});

const mulberry = seed => () => {
  seed = seed + 0x6d2b79f5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mm = value => Math.round(value * 1000) / 1000;
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = (from, to, value) => { const t = clamp01((value - from) / (to - from)); return t * t * (3 - 2 * t); };
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); }
  return value;
}

// ---- The layout ------------------------------------------------------------------------------------------------------------
// The mast: three legs, one pointing at each anchor. `lean` is how far the top stands off the foot. The old mast is the lower part;
// the rest was added in sections of scavenged tube.
const MAST = Object.freeze({x: 0, z: 0, height: 25, footRadius: .5, oldTop: 9, oldRadius: .42, topRadius: .27, lean: Object.freeze({x: .34, z: -.18}),
  legs: Object.freeze([0, 2 * Math.PI / 3, 4 * Math.PI / 3]), guys: Object.freeze([8, 16, 23]), lamp: 25.12});
// Hetty's rag on the mast: tied at `at` metres up, `long` along the wind and `deep` down.
const FLAG = Object.freeze({at: 24.1, long: 1.3, deep: .62});
// The hut: a box 5.6 m by 4 m on the ground, as the rules have it, with its door in the middle of the south wall. The roof runs down
// from the front to the back. `front` and `back` are the heights of the eaves.
const HUT = Object.freeze({x: -7, z: 4, halfX: 2.8, halfZ: 2, front: 2.62, back: 2.14, door: Object.freeze({half: .45, high: 1.86}), wall: .08});
const THINGS = Object.freeze({
  anchors: Object.freeze([
    Object.freeze({id: 'anchor', x: 10, z: 0}),
    Object.freeze({id: 'anchor-south-west', x: -5.5, z: 9.53}),
    Object.freeze({id: 'anchor-north-west', x: -5.5, z: -9.53}),
  ]),
  generator: Object.freeze({x: -4, z: -4, heading: .12}),
  cans: Object.freeze({x: -5.85, z: -4.25, heading: -.2}),
  batteries: Object.freeze({x: -3.82, z: 2.85}),
  charger: Object.freeze({x: 4.6, z: -7.4, height: 6.4, rotor: .95}),
  lookout: Object.freeze({x: 3, z: 12, reach: 1.25}),
  workbench: Object.freeze({x: -11.75, z: 5}),
  // A tarpaulin off the hut's west wall over the bench and the seat, on two poles.
  awning: Object.freeze([Object.freeze({x: -12.65, z: 3.25}), Object.freeze({x: -12.6, z: 6.75})]),
  seat: Object.freeze({x: -10.45, z: 5}),
  scrap: Object.freeze({x: -13.5, z: 6.2}),
  rainDrum: Object.freeze({x: -9.55, z: 1.45}),
  washing: Object.freeze([Object.freeze({x: -10.5, z: 8.2}), Object.freeze({x: -14, z: 10.6})]),
  truck: Object.freeze({x: -15.6, z: -2.2, heading: .16}),
  chair: Object.freeze({x: -4.85, z: 7.8, heading: .5}),
  // A porch roof over the door, on two posts.
  porch: Object.freeze({half: 1.35, out: 1.2, low: 2.08}),
  secondAerial: Object.freeze({x: -11.7, z: .7, height: 8.6}),
  // Inside the hut, in the site's metres: the table and its set against the north wall, the chair, the cot, the stove.
  table: Object.freeze({x: -7.45, z: 2.47, halfX: 1.05, halfZ: .3, height: .76}),
  stove: Object.freeze({x: -4.78, z: 2.62}),
});

// The mast's sections above the old mast, worked out from the fixed sequence: what each was made from and how it is braced.
function mastSections(random) {
  const kinds = ['scaffold', 'pipe', 'rusted', 'conduit', 'scaffold', 'green', 'rusted', 'scaffold'], sections = [];
  let from = MAST.oldTop;
  for (let index = 0; from < MAST.height - .01; index++) {
    const to = Math.min(MAST.height, from + 2.4 + random() * 1.6);
    sections.push({from: mm(from), to: mm(to), kind: kinds[index % kinds.length], brace: random() < .62 ? 'zigzag' : random() < .6 ? 'rungs' : 'cross',
      kink: {x: mm((random() - .5) * .05), z: mm((random() - .5) * .05)}, twist: mm((random() - .5) * .05)});
    from = to;
  }
  return sections;
}

export function radioHillLayout() {
  const random = mulberry(0x7ad10), spread = amount => (random() - .5) * 2 * amount;
  const sections = mastSections(random);
  // The hut's walls: sheets of tin, each its own width, tone and wear, round the walls from the north-west corner.
  const sheets = [];
  const walls = [
    {id: 'north', from: [-HUT.halfX, -HUT.halfZ], to: [HUT.halfX, -HUT.halfZ]},
    {id: 'east', from: [HUT.halfX, -HUT.halfZ], to: [HUT.halfX, HUT.halfZ]},
    {id: 'south', from: [HUT.halfX, HUT.halfZ], to: [-HUT.halfX, HUT.halfZ]},
    {id: 'west', from: [-HUT.halfX, HUT.halfZ], to: [-HUT.halfX, -HUT.halfZ]},
  ];
  for (const wall of walls) {
    const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]);
    for (let at = 0; at < length - .05;) {
      const wide = Math.min(length - at, .66 + random() * .26);
      sheets.push({wall: wall.id, at: mm(at), wide: mm(wide + .05), tone: Math.floor(random() * 6), rust: mm(random()), short: random() < .22 ? mm(.35 + random() * .5) : 0,
        lean: mm(spread(.012)), out: mm(random() * .02)});
      at += wide;
    }
  }
  const roof = [];
  for (let x = -HUT.halfX - .18; x < HUT.halfX + .18;) {
    const wide = .72 + random() * .2;
    roof.push({x: mm(x + wide / 2), wide: mm(wide + .06), tone: Math.floor(random() * 6), rust: mm(random()), lift: mm(random() * .025)});
    x += wide;
  }
  // Stones lying about the hilltop, kept off the paths and the things that stand.
  const stones = [];
  for (let tries = 0; stones.length < 30 && tries < 600; tries++) {
    const angle = random() * Math.PI * 2, reach = 3 + Math.sqrt(random()) * (RADIUS - 4), x = Math.cos(angle) * reach, z = Math.sin(angle) * reach;
    if (x > -17.5 && x < -2.8 && z > -5.5 && z < 12) continue;
    if (Math.hypot(x - 6, z - 19.3) < 4 || Math.hypot(x - 3, z - 12) < 2.2 || Math.hypot(x - 4.6, z + 7.4) < 1.4) continue;
    if (Math.abs(x - 3.2) < 2 && z > 4 && z < 17) continue;
    stones.push({x: mm(x), z: mm(z), size: mm(.06 + random() * random() * .26), turn: mm(random() * 6.28), seed: Math.floor(random() * 1e6)});
  }

  const spots = {
    // The rules' own spots (src/world/open/content/sites.js), at the same places.
    mast: {x: 1.6, z: 0}, generator: {x: -4, z: -2.5}, anchor: {x: 10, z: 1.4},
    door: {x: -7, z: 6.6}, lookout: {x: 3, z: 12}, bench: {x: -10.5, z: 5}, bed: {x: -7, z: 4},
    // Where the player leaves the car, south of the camp on the open hilltop, with the lookout between it and the hut.
    'car-stop': {x: 6, z: 19.3},
    // Inside the door (the storyline's "at the hut"), and the chair at the set where the player sits to talk on the air.
    hut: {x: -7, z: 5.25}, set: {x: -7.3, z: 3.12},
    // Beside the winch truck's door, where Bern climbs in to come down the hill.
    truck: {x: -13.7, z: -1.6},
  };
  for (const spot of Object.values(spots)) { spot.x = mm(spot.x); spot.z = mm(spot.z); }
  return deepFreeze({
    radius: RADIUS, wind: {...WIND}, spots,
    mast: {...JSON.parse(JSON.stringify(MAST)), sections}, hut: JSON.parse(JSON.stringify(HUT)),
    things: JSON.parse(JSON.stringify(THINGS)), sheets, roof, stones,
  });
}
export const RADIO_HILL_LAYOUT = radioHillLayout();

// Where a point of the mast's leg stands, at height y: the leg's line from its foot to its top, with the lean and the small kinks
// where one section was fitted to the next.
export function mastLegAt(leg, y, layout = RADIO_HILL_LAYOUT) {
  const m = layout.mast, share = y / m.height;
  const radius = y <= m.oldTop ? m.footRadius + (m.oldRadius - m.footRadius) * y / m.oldTop
    : m.oldRadius * .92 + (m.topRadius - m.oldRadius * .92) * (y - m.oldTop) / (m.height - m.oldTop);
  let kx = 0, kz = 0, twist = 0;
  for (const section of m.sections) {
    if (y <= section.from) break;
    const part = Math.min(1, (y - section.from) / (section.to - section.from));
    kx += section.kink.x * part; kz += section.kink.z * part; twist += section.twist * part;
  }
  const angle = m.legs[leg] + twist;
  return {x: m.x + m.lean.x * share * share * .4 + m.lean.x * share * .6 + kx + Math.cos(angle) * radius, y, z: m.z + m.lean.z * share * share * .4 + m.lean.z * share * .6 + kz + Math.sin(angle) * radius};
}
// The middle of the mast at height y.
export function mastMiddleAt(y, layout = RADIO_HILL_LAYOUT) {
  const points = [0, 1, 2].map(leg => mastLegAt(leg, y, layout));
  return {x: (points[0].x + points[1].x + points[2].x) / 3, y, z: (points[0].z + points[1].z + points[2].z) / 3};
}

// What a car or a walker cannot pass, for a stage. Each is {id, kind, shape ('box' or 'ellipse'), x, z, halfX, halfZ, heading,
// height}: metres from the site's centre, `heading` a turn about the upright (a box's own x runs along (cos h, -sin h)), `height`
// above the ground under it. The hut is its four walls, with the door open, so that a walker can go in to the set; the cot, the
// sleeper at the door, the seat by the bench and the low anchors' tyres are not solid.
export function radioHillSolids(stage = 'camp') {
  if (!RADIO_HILL_STAGES.includes(stage)) throw new RangeError(`Radio Hill has no stage called ${JSON.stringify(stage)}.`);
  const {things, hut} = RADIO_HILL_LAYOUT, solids = [];
  const box = (id, kind, x, z, halfX, halfZ, height, heading = 0) => solids.push({id: `radio-hill-${id}`, kind, shape: 'box', x: mm(x), z: mm(z), halfX: mm(halfX), halfZ: mm(halfZ), heading, height});
  const post = (id, kind, x, z, radius, height) => solids.push({id: `radio-hill-${id}`, kind, shape: 'ellipse', x: mm(x), z: mm(z), halfX: radius, halfZ: radius, heading: 0, height});
  post('mast', 'post', MAST.x, MAST.z, .55, MAST.height);
  const w = hut.wall, door = hut.door.half;
  box('hut-north', 'building', hut.x, hut.z - hut.halfZ, hut.halfX + w, w, hut.back);
  box('hut-west', 'building', hut.x - hut.halfX, hut.z, w, hut.halfZ, hut.front);
  box('hut-east', 'building', hut.x + hut.halfX, hut.z, w, hut.halfZ, hut.front);
  const side = (hut.halfX - door) / 2;
  // Each piece of the south wall runs from its corner to the door post, leaving the door its full width.
  box('hut-south-west', 'building', hut.x - hut.halfX + side - w / 2, hut.z + hut.halfZ, side + w / 2, w, hut.front);
  box('hut-south-east', 'building', hut.x + hut.halfX - side + w / 2, hut.z + hut.halfZ, side + w / 2, w, hut.front);
  for (const side of [-1, 1]) post(`porch-post-${side < 0 ? 'west' : 'east'}`, 'post', hut.x + side * things.porch.half, hut.z + hut.halfZ + things.porch.out - .05, .06, things.porch.low);
  box('table', 'prop', things.table.x, things.table.z, things.table.halfX, things.table.halfZ, things.table.height);
  post('stove', 'prop', things.stove.x, things.stove.z, .3, .8);
  box('generator', 'prop', things.generator.x, things.generator.z, .9, .55, 1.7, things.generator.heading);
  box('cans', 'prop', things.cans.x, things.cans.z, .55, .4, .75, things.cans.heading);
  box('batteries', 'prop', things.batteries.x, things.batteries.z, .3, .55, 1.05);
  for (const anchor of things.anchors) box(anchor.id, 'prop', anchor.x, anchor.z, .25, .35, .55);
  post('charger', 'post', things.charger.x, things.charger.z, .12, things.charger.height);
  box('lookout', 'wall', things.lookout.x, things.lookout.z + .95, 1.25, .45, .85);
  box('workbench', 'prop', things.workbench.x, things.workbench.z, .38, .98, .86);
  things.awning.forEach((at, index) => post(`awning-pole-${index + 1}`, 'post', at.x, at.z, .06, 1.9));
  post('scrap', 'heap', things.scrap.x, things.scrap.z, 1.05, .9);
  post('rain-drum', 'drum', things.rainDrum.x, things.rainDrum.z, .32, .92);
  things.washing.forEach((at, index) => post(`washing-post-${index + 1}`, 'post', at.x, at.z, .08, 1.9));
  box('truck', 'vehicle', things.truck.x, things.truck.z, 1.02, 2.62, 2.7, things.truck.heading);
  if (stage === 'second-set') post('second-aerial', 'post', things.secondAerial.x, things.secondAerial.z, .12, things.secondAerial.height);
  return solids.map(solid => Object.freeze(solid));
}

// ---- The red lamp ----------------------------------------------------------------------------------------------------------
// At night the lamp blinks: on for `on` seconds in every `period`. When Hetty is asked to blink it three times (the storyline's
// "Blink your lamp three times for me", cue `open.lamp.blink`) it goes dark for `dark` seconds, blinks three times, rests dark
// for `rest` seconds, and then goes on as before. A bulb takes a moment to come up and go down.
export const RADIO_HILL_LAMP = Object.freeze({period: 2.2, on: .95, dark: 1.4, blink: .36, rest: .9, fade: .07});
export function radioHillLamp(seconds, {night = true, signalAt = null} = {}) {
  if (!night) return 0;
  const L = RADIO_HILL_LAMP, pulse = (t, length) => smooth(0, L.fade, t) * (1 - smooth(length - L.fade, length, t));
  if (Number.isFinite(signalAt) && seconds >= signalAt) {
    const since = seconds - signalAt, signal = L.dark + L.blink * 6 + L.rest;
    if (since < signal) {
      const at = since - L.dark;
      if (at < 0 || at >= L.blink * 6) return 0;
      const step = Math.floor(at / L.blink);
      return step % 2 ? 0 : pulse(at - step * L.blink, L.blink);
    }
    seconds = since - signal;
  }
  const beat = ((seconds % L.period) + L.period) % L.period;
  return beat < L.on ? pulse(beat, L.on) : 0;
}

// ---- Drawing: colours and the kit --------------------------------------------------------------------------------------------
// Colours are made when the camp is first drawn, not when this file is loaded, so that the rules can read the layout and the
// solids without making any.
const tone = (r, g, b, k = .84) => new THREE.Color().setRGB(r * k, g * k, b * k);
let PALETTE = null;
const makePalette = () => {
  const tin = tone(.1, .098, .092), rust = tone(.095, .045, .024);
  const faded = (r, g, b, bare = .5) => tone(r, g, b).lerp(tin, bare).lerp(rust, .14);
  return {
    tin, rust, rustDark: tone(.055, .03, .02), iron: tone(.032, .031, .03, 1), tube: tone(.075, .072, .068), galv: tone(.095, .095, .092),
    timber: tone(.075, .064, .052), paleTimber: tone(.1, .086, .066), darkTimber: tone(.048, .041, .033),
    oldRed: tone(.085, .042, .032), oldWhite: tone(.11, .105, .095), pipeGreen: tone(.05, .062, .047), conduit: tone(.1, .098, .09),
    sheets: [tone(.095, .092, .086), tone(.08, .05, .034), tone(.068, .074, .076), tone(.11, .104, .094), tone(.058, .04, .03), tone(.098, .078, .056)],
    truck: faded(.07, .09, .1, .3), truckBed: tone(.062, .053, .042),
    rag: tone(.26, .065, .035), rubber: tone(.022, .022, .024, 1), rope: tone(.14, .12, .075), wire: tone(.03, .03, .028, 1), copper: tone(.07, .04, .022),
    canvas: tone(.09, .085, .055), tarpGrey: tone(.095, .095, .09), blanket: tone(.11, .065, .045), wool: tone(.09, .09, .095), mattress: tone(.13, .12, .09),
    cloth: [tone(.15, .13, .1), tone(.075, .085, .1), tone(.13, .06, .045), tone(.14, .13, .12), tone(.09, .1, .07)],
    can: [tone(.12, .11, .045), tone(.13, .055, .04), tone(.085, .095, .07)], drum: tone(.08, .1, .11), drumRed: faded(.16, .055, .04, .35),
    set: tone(.04, .04, .037, 1), setFace: tone(.09, .085, .072), olive: tone(.075, .08, .048), ceramic: tone(.3, .28, .25), battery: tone(.03, .03, .03, 1),
    concrete: tone(.07, .066, .058), stone: tone(.062, .05, .04), stoneRed: tone(.058, .042, .032), stoneDark: tone(.04, .033, .027), stonePale: tone(.082, .068, .054), earth: tone(.06, .047, .034),
  };
};
// Glass and ground marks carry how solid they are with their colour: red, green, blue and alpha.
const GLASS = Object.freeze({window: [.24, .27, .25, .32], dusty: [.36, .33, .27, .6], red: [.34, .03, .015, .78], meter: [.5, .48, .4, .45]});
const MARK = Object.freeze({trodden: [.09, .07, .055], path: [.07, .055, .042], tyre: [.05, .04, .032], oil: [.012, .011, .01], pale: [.42, .37, .3]});
// Which light a lit piece belongs to.
const LIT = Object.freeze({lamp: 0, hut: 1});

const span = count => Array.from({length: count + 1}, (_, index) => index / count);
const paint = (colour, by) => colour.clone().multiplyScalar(by);
const rgb = colour => [colour.r, colour.g, colour.b];

// Collects pieces by kind, each with its own colour in its vertices, and merges each kind into one mesh. Kinds with `alpha` carry
// four numbers for each vertex's colour; the kind `lit` carries which light each piece belongs to. Lines are gathered apart.
function createKit(heightAt, kinds) {
  const lists = Object.fromEntries(Object.keys(kinds).map(kind => [kind, []]));
  const base = new THREE.Matrix4(), local = new THREE.Matrix4(), saved = [], quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1), spot = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), way = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const lines = {positions: [], colours: [], far: []};
  let triangles = 0, lit = LIT.hut;
  function keep(kind, geometry, colour) {
    const size = kinds[kind].alpha ? 4 : 3;
    if (geometry.hasAttribute('uv')) geometry.deleteAttribute('uv');
    if (geometry.hasAttribute('uv1')) geometry.deleteAttribute('uv1');
    if (!geometry.index) geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_, index) => index));
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
    const count = geometry.attributes.position.count;
    if (!geometry.hasAttribute('color')) {
      const colours = new Float32Array(count * size), values = colour.isColor ? [colour.r, colour.g, colour.b, 1] : colour;
      for (let index = 0; index < count; index++) for (let part = 0; part < size; part++) colours[index * size + part] = values[part] ?? 1;
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, size));
    } else if (geometry.attributes.color.itemSize !== size) throw Error(`A piece of Radio Hill has the wrong kind of colour for "${kind}".`);
    if (kinds[kind].lit) geometry.setAttribute('aWhich', new THREE.BufferAttribute(new Float32Array(count).fill(lit), 1));
    geometry.applyMatrix4(base);
    triangles += geometry.index.count / 3;
    lists[kind].push(geometry);
    return geometry;
  }
  function place(geometry, x, y, z, turn) {
    if (turn) quaternion.setFromEuler(euler.set(turn[0], turn[1], turn[2], 'YXZ')); else quaternion.identity();
    geometry.applyMatrix4(local.compose(spot.set(x, y, z), quaternion, one));
    return geometry;
  }
  function within(x, y, z, turn, draw) {
    saved.push(base.clone());
    if (turn) quaternion.setFromEuler(euler.set(turn[0], turn[1], turn[2], 'YXZ')); else quaternion.identity();
    base.multiply(local.compose(spot.set(x, y, z), quaternion, one));
    try { draw(); } finally { base.copy(saved.pop()); }
  }
  const ground = (x, z) => heightAt(x, z);
  const stand = (x, z, heading, draw) => within(x, ground(x, z), z, [0, heading, 0], draw);
  const box = (kind, w, h, d, colour, x, y, z, turn) => keep(kind, place(new THREE.BoxGeometry(w, h, d), x, y, z, turn), colour);
  const cylinder = (kind, radius, high, colour, x, y, z, turn, sides = 10, top = radius, open = false) =>
    keep(kind, place(new THREE.CylinderGeometry(top, radius, high, sides, 1, open), x, y, z, turn), colour);
  function tube(kind, a, b, radius, colour, sides = 6, endRadius = radius) {
    from.set(a[0], a[1], a[2]); to.set(b[0], b[1], b[2]); way.subVectors(to, from);
    const length = way.length();
    if (length < 1e-4) return;
    const geometry = new THREE.CylinderGeometry(endRadius, radius, length, sides, 1);
    geometry.applyMatrix4(local.compose(spot.addVectors(from, to).multiplyScalar(.5), quaternion.setFromUnitVectors(up, way.divideScalar(length)), one));
    keep(kind, geometry, colour);
  }
  function batten(kind, a, b, wide, thick, colour, roll = 0) {
    from.set(a[0], a[1], a[2]); to.set(b[0], b[1], b[2]); way.subVectors(to, from);
    const length = way.length();
    if (length < 1e-4) return;
    const geometry = new THREE.BoxGeometry(wide, length, thick);
    if (roll) geometry.rotateY(roll);
    geometry.applyMatrix4(local.compose(spot.addVectors(from, to).multiplyScalar(.5), quaternion.setFromUnitVectors(up, way.divideScalar(length)), one));
    keep(kind, geometry, colour);
  }
  function rope(kind, points, radius, colour, sides = 4, pieces = points.length * 3) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(point[0], point[1], point[2])));
    keep(kind, new THREE.TubeGeometry(curve, pieces, radius, sides, false), colour);
  }
  function sheet(kind, us, vs, point, colour) {
    const positions = [], colours = [], indices = [], size = kinds[kind].alpha ? 4 : 3, columns = us.length;
    for (const v of vs) for (const u of us) {
      const at = point(u, v);
      positions.push(at[0], at[1], at[2]);
      if (colour) { const c = colour(u, v); for (let part = 0; part < size; part++) colours.push(c[part] ?? 1); }
    }
    for (let j = 0; j < vs.length - 1; j++) for (let i = 0; i < columns - 1; i++) {
      const a = j * columns + i;
      indices.push(a, a + 1, a + columns, a + 1, a + columns + 1, a + columns);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (colour) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, size));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  // A wire, a cable or a rope too thin to draw as a solid: a line through points, in the frame being drawn. `far` is how much of it
  // is still drawn from a long way off (1 for the mast's own legs, which carry its outline across the land; less for the wires).
  function line(points, colour, far = .3) {
    const p = new THREE.Vector3();
    for (let index = 0; index < points.length - 1; index++) for (const point of [points[index], points[index + 1]]) {
      p.set(point[0], point[1], point[2]).applyMatrix4(base);
      lines.positions.push(p.x, p.y, p.z); lines.colours.push(colour.r, colour.g, colour.b); lines.far.push(far);
    }
  }
  // A wire hanging between two points, sagging by `sag` of its length at the middle.
  function hang(a, b, colour, sag = .012, far = .3, pieces = 10) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), points = [];
    for (let index = 0; index <= pieces; index++) {
      const t = index / pieces;
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * sag * length * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
    }
    line(points, colour, far);
    return points;
  }
  return {lists, lines, ground, keep, place, within, stand, box, cylinder, tube, batten, rope, sheet, line, hang,
    // Pieces drawn inside `glowing` belong to that light.
    glowing(which, draw) { const before = lit; lit = which; try { draw(); } finally { lit = before; } },
    get triangles() { return triangles; }};
}

// A sheet of corrugated tin standing up, in its own metres: `wide` across (x), `high` up (y), the ribs running up it, bowing out
// of its face (+z) by `bow` at the middle. Its colour runs to rust low down and where it has been patched.
function corrugated(kit, kind, wide, high, colour, {bow = 0, rust = .4, sag = 0, pitch = .076, depth = .017, dent = 0} = {}) {
  const ribs = Math.max(2, Math.round(wide / pitch)), us = Array.from({length: ribs * 2 + 1}, (_, index) => index / (ribs * 2)), vs = span(high > 1.4 ? 4 : 2);
  const rusty = PALETTE.rust, dark = PALETTE.rustDark;
  return kit.keep(kind, kit.sheet(kind, us, vs, (u, v) => {
    const wave = (Math.round(u * ribs * 2) % 2 ? 1 : -1) * depth / 2;
    const middle = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
    return [(u - .5) * wide, v * high - sag * middle, wave + bow * middle + dent * Math.exp(-((u - .62) ** 2 + (v - .4) ** 2) * 30)];
  }, (u, v) => {
    const low = 1 - smooth(0, .35, v), streak = .5 + .5 * Math.sin(u * 37.1 + rust * 11) * Math.sin(u * 13.3 + 2);
    const c = colour.clone().lerp(rusty, clamp01(rust * .3 + low * .3 * rust + streak * .22 * rust)).lerp(dark, low * .15);
    return rgb(c);
  }), null);
}

// A lump of stone, the same on every run: a ball with each corner pulled in or out by its own amount, shared corners kept
// together so that it is shaded as weathered rock and not as a cut gem. Bigger stones have more corners.
function stone(kit, kind, random, size, colour, x, y, z, squash = .62) {
  const ball = new THREE.IcosahedronGeometry(1, size > .14 ? 1 : 0);
  ball.deleteAttribute('normal'); ball.deleteAttribute('uv');
  const rock = mergeVertices(ball), points = rock.attributes.position;
  ball.dispose();
  for (let index = 0; index < points.count; index++) {
    const pull = (.72 + random() * .5) * size, flat = points.getY(index) < -.3 ? .55 : 1;
    points.setXYZ(index, points.getX(index) * pull, points.getY(index) * pull * squash * flat, points.getZ(index) * pull);
  }
  rock.computeVertexNormals();
  kit.keep(kind, kit.place(rock, x, y + size * squash * .35, z, [0, random() * 6.28, 0]), paint(colour, .82 + random() * .36));
}

// A flat stone for stacking: a box with each corner pulled about by its own amount, its faces left flat as split rock is.
function slab(kit, random, wide, high, deep, colour, x, y, z, heading) {
  const rock = new THREE.BoxGeometry(wide, high, deep), points = rock.attributes.position, pulls = new Map();
  for (let index = 0; index < points.count; index++) {
    const key = `${Math.sign(points.getX(index))},${Math.sign(points.getY(index))},${Math.sign(points.getZ(index))}`;
    if (!pulls.has(key)) pulls.set(key, [(random() - .5) * wide * .38, (random() - .5) * high * .5, (random() - .5) * deep * .38]);
    const [dx, dy, dz] = pulls.get(key);
    points.setXYZ(index, points.getX(index) + dx, points.getY(index) + dy, points.getZ(index) + dz);
  }
  rock.computeVertexNormals();
  kit.keep('plain', kit.place(rock, x, y + high / 2, z, [(random() - .5) * .3, heading, (random() - .5) * .3]), paint(colour, .55 + random() * .6));
}

// A tyre lying on its side or standing: a ring of rubber.
function tyre(kit, radius, width, x, y, z, turn, colour = PALETTE.rubber) {
  const ring = new THREE.TorusGeometry(radius - width * .42, width * .45, 6, 16);
  ring.scale(1, 1, width / (width * .9));
  kit.keep('plain', kit.place(ring, x, y, z, turn), colour);
}

// ---- The mast ---------------------------------------------------------------------------------------------------------------
const LEG_COLOUR = {scaffold: 'galv', pipe: 'tube', rusted: 'rust', conduit: 'conduit', green: 'pipeGreen'};
function drawMast(kit) {
  const L = RADIO_HILL_LAYOUT, m = L.mast, P = PALETTE, base = kit.ground(m.x, m.z);
  const at = (leg, y) => { const p = mastLegAt(leg, y); return [p.x, base + y, p.z]; };
  // The old mast: heavy legs in bands of faded red and white, three metres each, braced in a regular zigzag of angle iron.
  for (let band = 0; band < 3; band++) {
    const y0 = band * 3, y1 = Math.min(m.oldTop, y0 + 3), colour = band % 2 ? P.oldWhite : P.oldRed;
    for (let leg = 0; leg < 3; leg++) kit.tube('hard', at(leg, y0 - (band ? 0 : .25)), at(leg, y1), .034, paint(colour, .85 + band * .08), 7);
    for (let leg = 0; leg < 3; leg++) {
      const next = (leg + 1) % 3;
      for (let y = y0; y < y1 - .01; y += .75) {
        kit.batten('hard', at(leg, y), at(next, y + .75), .035, .006, paint(colour, .8));
        if (Math.round(y / .75) % 2 === 0) kit.batten('hard', at(leg, y), at(next, y), .03, .006, paint(colour, .75));
      }
    }
  }
  // The old mast's foot: a block of concrete, cracked, with the legs bolted to it.
  kit.within(m.x, base, m.z, [0, .3, 0], () => {
    kit.cylinder('plain', .78, .32, P.concrete, 0, .1, 0, null, 7, .7);
    for (let leg = 0; leg < 3; leg++) {
      const angle = m.legs[leg] - .3;
      kit.box('hard', .16, .05, .16, P.rustDark, Math.cos(angle) * .5, .27, Math.sin(angle) * .5);
    }
  });
  // The added sections: each of its own tube, with a collar where it joins the one below, braced as it was found.
  for (const section of m.sections) {
    const colour = P[LEG_COLOUR[section.kind]], radius = section.kind === 'conduit' ? .017 : section.kind === 'pipe' ? .027 : .024;
    for (let leg = 0; leg < 3; leg++) {
      kit.tube('hard', at(leg, section.from), at(leg, section.to), radius, colour, 6);
      // The collar: a short sleeve of bigger tube, and wire twisted round it.
      kit.tube('hard', at(leg, section.from - .12), at(leg, section.from + .14), radius + .016, P.rustDark, 6);
      kit.tube('hard', at(leg, section.from + .16), at(leg, section.from + .2), radius + .006, P.wire, 5);
    }
    const height = section.to - section.from, step = section.brace === 'rungs' ? .62 : .82, count = Math.max(2, Math.round(height / step));
    for (let leg = 0; leg < 3; leg++) {
      const next = (leg + 1) % 3;
      for (let index = 0; index < count; index++) {
        const y = section.from + height * index / count, y2 = section.from + height * (index + 1) / count;
        if (section.brace === 'zigzag') kit.tube('hard', at(index % 2 ? next : leg, y), at(index % 2 ? leg : next, y2), .009, P.tube, 4);
        else if (section.brace === 'rungs') kit.tube('hard', at(leg, y2), at(next, y2), .011, index % 3 ? P.galv : P.rust, 4);
        else { kit.tube('hard', at(leg, y), at(next, y2), .008, P.rust, 4); kit.tube('hard', at(next, y), at(leg, y2), .008, P.rust, 4); }
      }
    }
  }
  // A ladder of short bars up the face towards the hut (between the second and third legs), to the top of the old mast and on.
  for (let y = .45; y < m.height - 1.4; y += .42) {
    const a = at(1, y), b = at(2, y);
    kit.tube('hard', [a[0] * .72 + b[0] * .28, a[1], a[2] * .72 + b[2] * .28], [a[0] * .28 + b[0] * .72, b[1], a[2] * .28 + b[2] * .72], .009, y < m.oldTop ? P.iron : P.rust, 4);
  }
  // The legs' outline from far off: three lines up the middle of the legs.
  for (let leg = 0; leg < 3; leg++) {
    const points = [];
    for (let y = 0; y <= m.height + .01; y += 1) points.push(at(leg, y));
    kit.line(points, P.wire, 1);
  }
  // The head: a hubcap for a platform, the lamp in its cage, the whip aerial above it, and the cross-arm of the dipole below.
  const top = mastMiddleAt(m.height), head = [top.x, base + m.height, top.z];
  kit.within(head[0], head[1], head[2], null, () => {
    kit.cylinder('hard', .3, .03, P.galv, 0, 0, 0, null, 12, .27);
    kit.cylinder('hard', .085, .06, P.iron, 0, .045, 0, null, 10);
    kit.cylinder('glass', .078, .16, GLASS.red, 0, .15, 0, null, 10);
    kit.glowing(LIT.lamp, () => kit.keep('lit', kit.place(new THREE.SphereGeometry(.045, 8, 6), 0, .15, 0), new THREE.Color(1, .14, .05)));
    for (let bar = 0; bar < 4; bar++) {
      const angle = bar * Math.PI / 2 + .3;
      kit.tube('hard', [Math.cos(angle) * .095, .07, Math.sin(angle) * .095], [Math.cos(angle) * .095, .24, Math.sin(angle) * .095], .006, P.iron, 3);
    }
    kit.cylinder('hard', .1, .04, P.iron, 0, .25, 0, null, 10, .05);
    // The whip, a little bent, with a ball at its tip.
    kit.tube('hard', [.02, .27, 0], [.07, 1.4, .02], .011, P.galv, 4, .008);
    kit.tube('hard', [.07, 1.4, .02], [.16, 2.55, .05], .008, P.galv, 4, .005);
    kit.keep('hard', kit.place(new THREE.SphereGeometry(.022, 6, 4), .16, 2.56, .05), P.galv);
  });
  kit.line([[head[0] + .02, head[1] + .27, head[2]], [head[0] + .07, head[1] + 1.4, head[2] + .02], [head[0] + .16, head[1] + 2.55, head[2] + .05]], P.wire, .7);
  // Hetty's rag: a strip of faded red cloth tied to the first leg under the head, flying with the wind. It shows which way the wind
  // blows for the aerials, and from the roads it marks the top of the mast by day.
  const tie = mastLegAt(0, FLAG.at), wind = Math.atan2(WIND.z, WIND.x);
  const flag = [tie.x + WIND.x * FLAG.long / 2, base + FLAG.at - FLAG.deep / 2 - .06, tie.z + WIND.z * FLAG.long / 2];
  kit.within(tie.x, base + FLAG.at, tie.z, [0, -wind, 0], () => {
    kit.keep('cloth', kit.sheet('cloth', span(5), span(2), (u, v) => [u * FLAG.long, -v * FLAG.deep * (1 - u * .25) - u * .12, Math.sin(u * 5.5 + v) * .07 * u],
      (u, v) => rgb(paint(P.rag, (.8 + .35 * Math.sin(u * 9 + v * 3) ** 2) * (u > .85 ? .7 : 1)))));
    kit.tube('hard', [0, .04, -.03], [0, -FLAG.deep - .04, .03], .014, P.rope, 4);
  });
  // The dipole: a cross-arm of tube at 22.4 m with a ceramic insulator at each end, and its wires falling away to either side.
  // Each wire ends at another insulator, from which a rope runs down to a stake in the ground.
  const arm = mastMiddleAt(22.4), armY = base + 22.4, armTurn = -.35, way = (side, reach) => [arm.x + Math.cos(armTurn) * side * reach, arm.z - Math.sin(armTurn) * side * reach];
  const ends = [-1, 1].map(side => { const [x, z] = way(side, 1.25); return [x, armY, z]; });
  kit.tube('hard', ends[0], ends[1], .016, P.galv, 5);
  for (const [index, end] of ends.entries()) {
    kit.cylinder('plain', .022, .09, P.ceramic, end[0], end[1] - .06, end[2], null, 6);
    const side = index ? 1 : -1, [x, z] = way(side, 7), [sx, sz] = way(side, 12), tip = [x, armY - 5, z];
    kit.hang([end[0], end[1] - .1, end[2]], tip, P.wire, .01, .25, 6);
    kit.cylinder('plain', .02, .08, P.ceramic, tip[0], tip[1] - .02, tip[2], [0, 0, 1.2], 6);
    const ground = kit.ground(sx, sz);
    kit.hang(tip, [sx, ground + .3, sz], P.rope, .008, .15, 8);
    kit.batten('hard', [sx, ground - .1, sz], [sx * 1.01, ground + .34, sz * 1.01], .045, .045, P.timber);
  }
  // A box on the old mast, where the feeder comes down, and the feeder: a cable down a leg to the box, then across to the hut.
  const boxAt = mastLegAt(1, 3.1);
  kit.box('hard', .26, .34, .14, P.tin, boxAt.x - .1, base + 3.1, boxAt.z + .05, [0, -.5, 0]);
  const feeder = [];
  for (let y = 22.2; y > 3.3; y -= 2.4) { const p = mastLegAt(1, y); feeder.push([p.x - .05, base + y, p.z]); }
  kit.line(feeder, P.wire, .15);
  return {head, flag};
}

// The guys: three to each anchor, from the leg that points at it, each with a turnbuckle near the ground. The lowest two near the
// hut carry rags, so that nobody walks into them in the dark.
function drawGuys(kit) {
  const L = RADIO_HILL_LAYOUT, m = L.mast, P = PALETTE, base = kit.ground(m.x, m.z);
  L.things.anchors.forEach((anchor, leg) => {
    const ground = kit.ground(anchor.x, anchor.z), toMast = Math.atan2(m.z - anchor.z, m.x - anchor.x);
    const eye = [anchor.x + Math.cos(toMast) * .18, ground + .5, anchor.z + Math.sin(toMast) * .18];
    for (const [level, height] of m.guys.entries()) {
      const p = mastLegAt(leg, height), from = [p.x, base + height, p.z];
      // The turnbuckle sits about a metre and a half up the wire.
      const share = 1.4 / Math.hypot(from[0] - eye[0], from[1] - eye[1], from[2] - eye[2]);
      const buckle = [eye[0] + (from[0] - eye[0]) * share, eye[1] + (from[1] - eye[1]) * share, eye[2] + (from[2] - eye[2]) * share];
      kit.hang(from, buckle, P.wire, .004, .32, 12);
      kit.line([buckle, eye], P.rust, .2);
      kit.tube('hard', [buckle[0], buckle[1], buckle[2]], [buckle[0] + (eye[0] - buckle[0]) * .22, buckle[1] + (eye[1] - buckle[1]) * .22, buckle[2] + (eye[2] - buckle[2]) * .22], .014, P.rust, 5);
      if (leg === 1 && level === 0) {
        const at = [eye[0] + (from[0] - eye[0]) * .2, eye[1] + (from[1] - eye[1]) * .2, eye[2] + (from[2] - eye[2]) * .2];
        kit.keep('cloth', kit.sheet('cloth', span(2), span(3), (u, v) => [at[0] + u * .05, at[1] - v * .32 + u * .03, at[2] + Math.sin(v * 2.2) * .05 + u * .14]), PALETTE.cloth[2]);
      }
    }
  });
}

// An anchor: a length of rail driven in at a slant towards the mast, a tyre filled with stones round it, more stones heaped on.
function drawAnchor(kit, anchor, index) {
  const P = PALETTE, random = mulberry(0xa2c4 + index * 31), m = RADIO_HILL_LAYOUT.mast, toMast = Math.atan2(m.z - anchor.z, m.x - anchor.x);
  kit.stand(anchor.x, anchor.z, -toMast + Math.PI / 2, () => {
    kit.batten('hard', [0, -.2, -.05], [0, .56, .2], .07, .05, P.rustDark);
    kit.tube('hard', [-.03, .5, .2], [.03, .5, .2], .03, P.rust, 6);
    tyre(kit, .36, .18, 0, .09, 0, [Math.PI / 2, 0, 0]);
    for (let stoneIndex = 0; stoneIndex < 8; stoneIndex++) {
      const angle = random() * Math.PI * 2, reach = random() * .24;
      slab(kit, random, .16 + random() * .1, .08 + random() * .05, .14 + random() * .08, [P.stone, P.stoneDark][stoneIndex % 2], Math.cos(angle) * reach, .05 + stoneIndex * .035, Math.sin(angle) * reach, random() * 3);
    }
  });
}

// ---- The hut ---------------------------------------------------------------------------------------------------------------
// The hut is drawn in its own frame: x to the east, z to the south, y up from the ground under its middle.
function roofAt(z) { return HUT.back + (HUT.front - HUT.back) * (z + HUT.halfZ) / (HUT.halfZ * 2); }

function drawHut(kit, stage) {
  const P = PALETTE, L = RADIO_HILL_LAYOUT, H = HUT, random = mulberry(0x4a7);
  kit.stand(H.x, H.z, 0, () => {
    // The frame: corner posts and door posts of grey timber, a plate along the top of each wall.
    const posts = [[-H.halfX, -H.halfZ], [H.halfX, -H.halfZ], [H.halfX, H.halfZ], [-H.halfX, H.halfZ], [-H.door.half - .05, H.halfZ], [H.door.half + .05, H.halfZ], [0, -H.halfZ], [-H.halfX, 0], [H.halfX, 0]];
    for (const [x, z] of posts) kit.box('hard', .09, roofAt(z) + .02, .09, paint(P.timber, .85 + random() * .3), x * .985, roofAt(z) / 2, z * .975);
    kit.batten('hard', [-H.halfX, H.back - .04, -H.halfZ + .05], [H.halfX, H.back - .04, -H.halfZ + .05], .09, .05, P.timber);
    kit.batten('hard', [-H.halfX, H.front - .04, H.halfZ - .05], [H.halfX, H.front - .04, H.halfZ - .05], .09, .05, P.timber);
    for (const x of [-H.halfX + .05, H.halfX - .05]) kit.batten('hard', [x, H.back - .04, -H.halfZ], [x, H.front - .04, H.halfZ], .05, .09, P.timber);
    // A lintel over the door.
    kit.box('hard', H.door.half * 2 + .2, .08, .1, P.darkTimber, 0, H.door.high + .04, H.halfZ - .02);
    // The walls: sheets of tin on the outside of the frame, each its own.
    const wall = {north: {from: [-H.halfX, -H.halfZ], dir: [1, 0], out: [0, -1]}, east: {from: [H.halfX, -H.halfZ], dir: [0, 1], out: [1, 0]},
      south: {from: [H.halfX, H.halfZ], dir: [-1, 0], out: [0, 1]}, west: {from: [-H.halfX, H.halfZ], dir: [0, -1], out: [-1, 0]}};
    for (const piece of L.sheets) {
      const w = wall[piece.wall], mid = piece.at + piece.wide / 2 - .025, x = w.from[0] + w.dir[0] * mid, z = w.from[1] + w.dir[1] * mid;
      // The door leaves a gap in the south wall.
      if (piece.wall === 'south' && Math.abs(x) < H.door.half + piece.wide / 2 - .02) {
        const left = x - piece.wide / 2, right = x + piece.wide / 2;
        // Over the door, a short sheet; beside it, whatever part of the sheet is clear of the opening.
        const part = (a, b, y0, y1) => { if (b - a < .08) return; kit.within((a + b) / 2, y0, z + .045 + piece.out, [0, 0, 0], () => corrugated(kit, 'sheet', b - a, y1 - y0, P.sheets[piece.tone], {rust: piece.rust})); };
        part(Math.max(left, -H.door.half - .2), Math.min(right, H.door.half + .2), H.door.high + .02, H.front + .04);
        if (left < -H.door.half) part(left, -H.door.half, 0, H.front + .04);
        if (right > H.door.half) part(H.door.half, right, 0, H.front + .04);
        continue;
      }
      // Each wall runs up into the roof, so that no daylight shows between them.
      const high = roofAt(z) + .05;
      const heading = Math.atan2(w.out[0], w.out[1]);
      const lower = piece.short ? high - piece.short : high;
      kit.within(x + w.out[0] * (.05 + piece.out), -.04, z + w.out[1] * (.05 + piece.out), [piece.lean, heading, 0], () => {
        if (piece.wall === 'east' || piece.wall === 'west') {
          // The side walls follow the roof's slope: a sheet is cut to it along its top.
          const zs = [z - w.dir[1] * piece.wide / 2, z + w.dir[1] * piece.wide / 2].map(at => roofAt(at) + .05);
          const top = Math.min(zs[0], zs[1]);
          corrugated(kit, 'sheet', piece.wide, top, P.sheets[piece.tone], {rust: piece.rust});
          // The triangle above, a strip of another sheet.
          kit.within(0, top - .01, 0, null, () => corrugated(kit, 'sheet', piece.wide, Math.abs(zs[0] - zs[1]) + .04, P.sheets[(piece.tone + 2) % 6], {rust: .6}));
        } else corrugated(kit, 'sheet', piece.wide, lower, P.sheets[piece.tone], {rust: piece.rust, dent: piece.tone === 3 ? .03 : 0});
        // A short sheet leaves a gap at the top, patched with a strip of something else.
        if (piece.short && (piece.wall === 'north' || piece.wall === 'south')) kit.within(0, lower - .06, .02, null, () => corrugated(kit, 'sheet', piece.wide * .95, piece.short + .07, P.sheets[(piece.tone + 3) % 6], {rust: .8}));
      });
    }
    // The east window: a car's side glass in a frame of battens, a little dusty, with cardboard over a broken corner.
    kit.within(H.halfX + .08, 0, .95, [0, Math.PI / 2, 0], () => {
      for (const [a, b] of [[[-.42, 1.02, 0], [.42, 1.02, 0]], [[-.42, 1.58, 0], [.42, 1.58, 0]], [[-.4, 1.0, 0], [-.4, 1.6, 0]], [[.4, 1.0, 0], [.4, 1.6, 0]]])
        kit.batten('hard', a, b, .06, .04, P.paleTimber);
      kit.keep('glass', kit.sheet('glass', span(3), span(2), (u, v) => [(u - .5) * .76, 1.05 + v * .5, .025], (u, v) => v < .3 ? GLASS.dusty : GLASS.window));
      kit.box('cloth', .26, .2, .01, P.canvas, .24, 1.17, .03, [0, 0, .1]);
    });
    // The roof: sheets running down from the front, weighed with tyres and stones, and a gutter of split pipe along the back.
    for (const piece of L.roof) {
      kit.within(piece.x, 0, 0, null, () => {
        const len = H.halfZ * 2 + .55, pitch = Math.atan2(H.front - H.back, H.halfZ * 2);
        kit.within(0, (H.front + H.back) / 2 + .044 + piece.lift, .12, [-Math.PI / 2 - pitch, 0, 0], () =>
          kit.within(0, -len / 2, 0, null, () => corrugated(kit, 'sheet', piece.wide, len, P.sheets[piece.tone], {rust: piece.rust * .7 + .2, sag: .025})));
      });
    }
    for (const [x, z, kind] of [[-1.6, -.6, 'tyre'], [.9, .9, 'tyre'], [2.2, -1.3, 'stone'], [-.4, 1.5, 'stone'], [-2.4, 1.2, 'stone'], [1.5, -1.6, 'tyre']]) {
      const y = roofAt(z) + .1;
      if (kind === 'tyre') tyre(kit, .33, .17, x, y + .03, z, [Math.PI / 2 + .1, 0, 0]);
      else stone(kit, 'plain', random, .14, P.stone, x, y - .05, z);
    }
    kit.within(0, H.back - .1, -H.halfZ - .33, [0, 0, -.025], () => {
      kit.keep('hard', kit.place(new THREE.CylinderGeometry(.07, .07, H.halfX * 2 + .3, 8, 1, true, 0, Math.PI), 0, 0, 0, [0, 0, Math.PI / 2]), P.galv);
    });
    kit.tube('hard', [-H.halfX - .1, H.back - .14, -H.halfZ - .33], [-H.halfX - .2, .95, -H.halfZ - .45], .035, P.galv, 6);
    // The stovepipe, through the roof over the stove, with a cowl, and soot round where it comes out.
    const stove = {x: L.things.stove.x - H.x, z: L.things.stove.z - H.z};
    kit.tube('hard', [stove.x, .75, stove.z], [stove.x, 3.2, stove.z], .065, P.iron, 8);
    kit.cylinder('hard', .17, .1, P.rustDark, stove.x, 3.27, stove.z, null, 8, .04);
    kit.cylinder('hard', .14, .03, P.iron, stove.x, roofAt(stove.z) + .1, stove.z, null, 8);
    // The door, hung on the west post and open outward towards the west, propped with a stone; a sleeper for a step.
    kit.within(-H.door.half - .04, 0, H.halfZ + .06, [0, Math.PI * .22, 0], () => {
      for (let plank = 0; plank < 5; plank++) kit.box('hard', .17, H.door.high - .04, .035, paint(P.paleTimber, .75 + random() * .35), -.09 - plank * .18, H.door.high / 2, 0);
      kit.box('hard', .88, .1, .03, P.darkTimber, -.45, .45, .03);
      kit.box('hard', .88, .1, .03, P.darkTimber, -.45, 1.45, .03);
      kit.batten('hard', [-.06, .48, .04], [-.84, 1.42, .04], .09, .03, P.darkTimber);
      kit.within(-.45, 1.0, -.03, [0, Math.PI, 0], () => corrugated(kit, 'sheet', .62, .6, P.sheets[4], {rust: .9}));
      kit.box('hard', .04, .12, .05, P.iron, -.8, 1.0, .06);
    });
    stone(kit, 'plain', random, .13, P.stoneDark, -1.5, 0, H.halfZ + .62);
    // The porch: two posts of timber and a roof of two sheets falling from the front eave, a bit of sacking hung at one side.
    const porch = L.things.porch;
    for (const side of [-1, 1]) kit.tube('hard', [side * porch.half, -.1, H.halfZ + porch.out - .05], [side * porch.half * 1.01, porch.low + .02, H.halfZ + porch.out - .05], .045, paint(P.timber, side < 0 ? .9 : 1.15), 6);
    kit.batten('hard', [-porch.half - .2, porch.low, H.halfZ + porch.out - .05], [porch.half + .2, porch.low - .03, H.halfZ + porch.out - .05], .1, .06, P.darkTimber);
    const slope = Math.atan2(H.front - .06 - porch.low, porch.out + .1), run = Math.hypot(H.front - .06 - porch.low, porch.out + .25);
    for (const side of [-1, 1]) kit.within(side * .7, H.front - .04, H.halfZ - .02, [Math.PI / 2 + slope, 0, 0], () => corrugated(kit, 'sheet', 1.48, run, P.sheets[side < 0 ? 3 : 0], {rust: .55, sag: .015}));
    kit.keep('cloth', kit.sheet('cloth', span(2), span(3), (u, v) => [-porch.half - .02, porch.low - .05 - v * 1.15, H.halfZ + porch.out - .1 - u * .8 + Math.sin(v * 4 + u) * .03]), P.canvas);
    kit.box('hard', 1.25, .15, .25, P.darkTimber, 0, .075, H.halfZ + .2, [0, .03, 0]);

    // ---- Inside ----
    // The table: planks across two drums, against the north wall. On it the set, the microphone, headphones, the log, a mug.
    const T = {x: L.things.table.x - H.x, z: L.things.table.z - H.z, wide: L.things.table.halfX * 2, deep: L.things.table.halfZ * 2, high: L.things.table.height};
    for (const side of [-1, 1]) kit.cylinder('hard', .25, T.high - .05, P.drum, T.x + side * (T.wide / 2 - .3), (T.high - .05) / 2, T.z, null, 10);
    for (let plank = 0; plank < 3; plank++) kit.box('hard', T.wide + .06, .04, T.deep / 3 - .01, paint(P.paleTimber, .8 + plank * .1), T.x, T.high - .02, T.z - T.deep / 3 + plank * T.deep / 3);
    drawSet(kit, T.x + .15, T.high, T.z - .04, 'ours');
    if (stage === 'second-set') drawSet(kit, T.x - .62, T.high, T.z - .02, 'parrot');
    // The microphone on its stand, the headphones, the log book open, the mug.
    kit.cylinder('hard', .06, .02, P.iron, T.x + .1, T.high + .01, T.z + .2, null, 8);
    kit.tube('hard', [T.x + .1, T.high + .02, T.z + .2], [T.x + .11, T.high + .2, T.z + .17], .007, P.galv, 4);
    kit.cylinder('hard', .028, .09, P.set, T.x + .11, T.high + .23, T.z + .16, [.5, 0, 0], 8);
    kit.keep('hard', kit.place(new THREE.TorusGeometry(.09, .008, 4, 10, Math.PI), T.x + .62, T.high + .035, T.z + .12, [-Math.PI / 2, .4, 0]), P.set);
    for (const side of [-1, 1]) kit.cylinder('plain', .04, .03, P.rubber, T.x + .62 + Math.cos(.4) * side * .09, T.high + .02, T.z + .12 - Math.sin(.4) * side * .09, null, 8);
    kit.box('plain', .3, .015, .22, P.oldWhite, T.x + .5, T.high + .008, T.z + .08, [0, -.2, 0]);
    kit.cylinder('hard', .04, .09, P.oldWhite, T.x + .85, T.high + .045, T.z - .05, null, 8);
    // A car battery under the table, and the cable from it up to the set.
    kit.box('plain', .3, .2, .18, P.battery, T.x + .35, .1, T.z + .02);
    kit.line([[T.x + .3, .21, T.z + .02], [T.x + .25, .5, T.z - .2], [T.x + .2, T.high + .1, T.z - .18]], P.wire, .1);
    // The bulb over the table on its flex.
    const bulb = [T.x + .35, 2.0, T.z + .25];
    kit.line([[bulb[0], H.back + .05, bulb[2]], [bulb[0], bulb[1] + .05, bulb[2]]], P.wire, .05);
    kit.cylinder('hard', .025, .05, P.iron, bulb[0], bulb[1] + .03, bulb[2], null, 6);
    kit.glowing(LIT.hut, () => kit.keep('lit', kit.place(new THREE.SphereGeometry(.035, 8, 6), bulb[0], bulb[1] - .02, bulb[2]), new THREE.Color(1, .78, .45)));
    // The chair at the set: a kitchen chair, mended with wire.
    const chair = {x: L.spots.set.x - H.x, z: L.spots.set.z - H.z};
    kit.within(chair.x, 0, chair.z + .08, [0, Math.PI + .1, 0], () => drawKitchenChair(kit));
    // The cot across the middle, where Bern sleeps: a frame of tube, a mattress, a blanket and a pillow.
    const cot = {x: L.spots.bed.x - H.x, z: L.spots.bed.z - H.z};
    kit.within(cot.x, 0, cot.z, [0, .02, 0], () => {
      for (const x of [-.92, .92]) for (const z of [-.33, .33]) kit.tube('hard', [x, 0, z], [x * .98, .4, z], .016, P.tube, 5);
      for (const z of [-.33, .33]) kit.tube('hard', [-.95, .38, z], [.95, .38, z], .018, P.tube, 5);
      kit.box('plain', 1.82, .1, .64, P.mattress, 0, .45, 0);
      const folds = span(6).map(() => span(4).map(() => random()));
      kit.keep('cloth', kit.sheet('cloth', span(6), span(4), (u, v) => [-.55 + u * 1.45, .505 + folds[Math.round(u * 6)][Math.round(v * 4)] * .05 - (v < .01 || v > .99 ? .1 : 0), -.36 + v * .72]), P.blanket);
      kit.box('cloth', .32, .1, .45, P.cloth[3], -.75, .55, 0, [0, 0, .1]);
    });
    // The stove: a drum on legs with a door, the kettle on it.
    kit.within(stove.x, 0, stove.z, null, () => {
      for (const angle of [.5, 2.6, 4.7]) kit.tube('hard', [Math.cos(angle) * .2, 0, Math.sin(angle) * .2], [Math.cos(angle) * .17, .25, Math.sin(angle) * .17], .014, P.iron, 4);
      kit.cylinder('hard', .27, .52, P.iron, 0, .5, 0, null, 12);
      kit.box('hard', .2, .16, .03, P.rustDark, 0, .42, .27);
      kit.cylinder('hard', .1, .14, P.galv, -.09, .83, .04, null, 10, .07);
      kit.tube('hard', [-.01, .84, .04], [.05, .9, .04], .012, P.galv, 4);
    });
    // A shelf on the west wall: tins, jars, a box of valves, a coil of wire.
    for (const y of [1.25, 1.7]) {
      kit.box('hard', .3, .03, 1.6, P.paleTimber, -H.halfX + .2, y, -.6);
      for (let item = 0; item < 6; item++) {
        const z = -1.3 + item * .27 + random() * .05, kind = random();
        if (kind < .45) kit.cylinder('hard', .05 + random() * .03, .1 + random() * .08, P.sheets[Math.floor(random() * 6)], -H.halfX + .2, y + .07, z, null, 8);
        else if (kind < .75) kit.box('hard', .16, .1 + random() * .08, .13, paint(P.canvas, 1.2), -H.halfX + .2, y + .07, z);
        else kit.keep('hard', kit.place(new THREE.TorusGeometry(.07, .022, 5, 10), -H.halfX + .2, y + .04, z, [Math.PI / 2, 0, 0]), P.copper);
      }
    }
    // A rag rug on the floor in front of the cot.
    kit.keep('cloth', kit.sheet('cloth', span(2), span(2), (u, v) => [-.7 + u * 1.3, .012, .55 + v * .65]), P.cloth[1]);
    // At night the hut's light fills the doorway and the window, falls out of the door across the step and the ground in front of it,
    // and lies in a square under the window. Each is warmest near where the light comes out.
    kit.glowing(LIT.hut, () => {
      const warm = (level, r = 1, g = .62, b = .3) => [level * r, level * g, level * b];
      // The doorway: a haze of light just inside the opening, brightest low down where the floor is lit.
      kit.keep('lit', kit.sheet('lit', span(2), span(3), (u, v) => [(u - .5) * H.door.half * 2, v * H.door.high, H.halfZ - .06],
        (u, v) => warm((.2 + .14 * (1 - v)) * (.75 + .25 * Math.sin(u * Math.PI)), 1, .52, .2)));
      // The ground in front of the door: a wedge of light widening as it goes, falling off with distance and at its sides.
      kit.keep('lit', kit.sheet('lit', span(6), span(5), (u, v) => [(u - .5) * (H.door.half * 2 + v * 2.2), .03 + (v > .9 ? .02 : 0), H.halfZ + .08 + v * 3.4], (u, v) => {
        const side = Math.sin(u * Math.PI) ** 1.3, fade = side * (1 - v) ** 2;
        return warm(fade * .85, 1, .5, .18);
      }));
      // The window: the glass lit from inside, and a patch of light on the ground below it.
      kit.keep('lit', kit.sheet('lit', span(1), span(1), (u, v) => [H.halfX - .02, 1.06 + v * .48, .62 + u * .66], () => warm(.45, 1, .55, .22)));
      kit.keep('lit', kit.sheet('lit', span(3), span(3), (u, v) => [H.halfX + .12 + v * 1.6, .03, .62 - v * .2 + u * (.66 + v * .5)], (u, v) => warm(Math.sin(u * Math.PI) ** 1.3 * (1 - v) ** 2 * .4, 1, .5, .18)));
    });
  });
}

// One set: a steel box with its face of dials, a meter and a lit scale. Ours is the old black one with a power box beside it;
// Parrot's is the newer set in olive green with a strap, wired in beside it.
function drawSet(kit, x, y, z, which) {
  const P = PALETTE, ours = which === 'ours';
  kit.within(x, y, z, [0, ours ? .04 : -.06, 0], () => {
    const wide = ours ? .5 : .38, high = ours ? .3 : .24, deep = ours ? .32 : .26;
    kit.box('hard', wide, high, deep, ours ? P.set : P.olive, 0, high / 2, 0);
    kit.box('hard', wide - .03, high - .03, .01, ours ? P.setFace : paint(P.olive, .7), 0, high / 2, deep / 2 + .005);
    // The scale, lit by its lamp when the set is on.
    kit.glowing(LIT.hut, () => kit.keep('lit', kit.place(new THREE.PlaneGeometry(wide * .6, .045), 0, high * .74, deep / 2 + .012), new THREE.Color(.55, .36, .12)));
    kit.keep('glass', kit.place(new THREE.PlaneGeometry(.07, .05), wide * .32, high * .7, deep / 2 + .013), GLASS.meter);
    for (const [u, size] of [[-.3, .028], [-.1, .02], [.12, .02], [.32, .016]]) kit.cylinder('hard', size, .025, P.iron, u * wide, high * .32, deep / 2 + .02, [Math.PI / 2, 0, 0], 8);
    if (ours) {
      kit.box('hard', .2, .17, .24, P.tin, wide / 2 + .14, .085, 0);
      kit.box('hard', .02, .03, .02, P.drumRed, wide / 2 + .1, .13, .125);
    } else {
      kit.keep('hard', kit.place(new THREE.TorusGeometry(.14, .012, 4, 10, Math.PI), 0, high, 0, [0, Math.PI / 2, 0]), P.darkTimber);
      kit.tube('hard', [-wide / 2 + .04, high, -deep / 2 + .04], [-wide / 2 + .05, high + .55, -deep / 2 + .02], .005, P.iron, 3);
    }
  });
}

function drawKitchenChair(kit) {
  const P = PALETTE;
  for (const x of [-.2, .2]) for (const z of [-.19, .19]) kit.tube('hard', [x, 0, z], [x * .95, .45, z * .95], .016, P.paleTimber, 5);
  kit.box('hard', .44, .035, .42, P.paleTimber, 0, .46, 0);
  for (const x of [-.19, .19]) kit.tube('hard', [x, .46, -.19], [x, .9, -.22], .016, P.paleTimber, 5);
  kit.box('hard', .42, .1, .025, P.paleTimber, 0, .82, -.22);
  kit.tube('hard', [-.2, .2, .19], [.2, .2, -.19], .005, P.wire, 3);
}

// ---- The generator, the cans, the batteries and the wind charger ------------------------------------------------------------
function drawGenerator(kit) {
  const P = PALETTE, g = RADIO_HILL_LAYOUT.things.generator;
  kit.stand(g.x, g.z, g.heading, () => {
    // The pallet.
    for (const x of [-.55, 0, .55]) kit.box('hard', .1, .1, 1.0, P.darkTimber, x, .05, 0);
    for (let plank = 0; plank < 6; plank++) kit.box('hard', 1.25, .025, .14, paint(P.paleTimber, .75 + plank % 3 * .1), 0, .11, -.42 + plank * .168);
    // The engine and its alternator in a frame of tube, the tank on top, the silencer and its pipe.
    for (const x of [-.45, .45]) for (const z of [-.3, .3]) kit.tube('hard', [x, .12, z], [x, .72, z], .016, P.drumRed, 5);
    for (const z of [-.3, .3]) kit.tube('hard', [-.45, .72, z], [.45, .72, z], .016, P.drumRed, 5);
    kit.box('hard', .38, .36, .36, P.iron, -.14, .32, 0);
    for (let fin = 0; fin < 6; fin++) kit.box('hard', .4, .012, .38, P.iron, -.14, .19 + fin * .05, 0);
    kit.cylinder('hard', .14, .34, paint(P.drumRed, .8), .24, .3, 0, [0, 0, Math.PI / 2], 10);
    kit.box('hard', .5, .14, .3, paint(P.drumRed, .9), 0, .66, 0);
    kit.cylinder('hard', .03, .03, P.iron, .05, .75, 0, null, 8);
    kit.cylinder('hard', .07, .3, P.rustDark, -.3, .45, .26, [0, 0, Math.PI / 2], 8);
    kit.tube('hard', [-.45, .45, .26], [-.72, .42, .3], .022, P.rust, 6);
    kit.cylinder('hard', .05, .1, P.tin, -.76, .42, .3, [0, 0, Math.PI / 2], 8);
    // The hood: a sheet of tin on four posts, one side sheeted against the wind.
    for (const [x, z, high] of [[-.72, -.48, 1.62], [.72, -.48, 1.62], [-.72, .5, 1.42], [.72, .5, 1.42]]) kit.tube('hard', [x, 0, z], [x * 1.01, high, z], .022, P.tube, 5);
    kit.within(0, 1.53, 0, [Math.atan2(.2, .98) - Math.PI / 2, 0, 0], () => kit.within(0, -.62, 0, null, () => corrugated(kit, 'sheet', 1.62, 1.25, P.sheets[1], {rust: .8, sag: .02})));
    kit.within(-.76, 0, 0, [0, -Math.PI / 2, 0], () => corrugated(kit, 'sheet', 1.0, 1.35, P.sheets[3], {rust: .5}));
  });
  // Nine cans of fuel, six standing and three on top.
  const c = RADIO_HILL_LAYOUT.things.cans, random = mulberry(0xca9);
  kit.stand(c.x, c.z, c.heading, () => {
    let index = 0;
    for (const [x, y, z, layFlat] of [[-.36, 0, -.18], [0, 0, -.18], [.36, 0, -.18], [-.36, 0, .18], [0, 0, .18], [.36, 0, .18], [-.2, .47, 0, 1], [.16, .47, 0, 1], [.5, .47, -.05, 1]]) {
      const colour = paint(P.can[index++ % 3], .8 + random() * .35);
      kit.within(x, y, z, [layFlat ? Math.PI / 2 : 0, random() * .2 - .1, 0], () => {
        kit.box('hard', .34, .46, .16, colour, 0, .23, 0);
        for (const side of [-1, 1]) kit.box('hard', .3, .4, .01, paint(colour, .85), 0, .23, side * .083);
        kit.tube('hard', [-.1, .47, 0], [.08, .47, 0], .012, colour, 4);
        kit.cylinder('hard', .025, .05, P.iron, .13, .48, 0, null, 6);
      });
    }
  });
  // The cable from the generator to the hut, lying along the ground.
  const points = [[-3.4, -3.6], [-3.2, -1.2], [-3.5, .8], [-3.95, 2.1]].map(([x, z]) => [x, kit.ground(x, z) + .02, z]);
  kit.rope('plain', points, .012, P.rubber, 4, 18);
}

function drawBatteries(kit) {
  const P = PALETTE, b = RADIO_HILL_LAYOUT.things.batteries, random = mulberry(0xba7);
  kit.stand(b.x, b.z, 0, () => {
    // An open crate on bricks with six car batteries, a sheet of tin over it, the wires up into the hut.
    for (const z of [-.5, .5]) kit.box('plain', .22, .1, .2, P.oldRed, 0, .05, z);
    for (const y of [.12, .52]) {
      kit.box('hard', .5, .03, 1.05, P.paleTimber, 0, y, 0);
      for (let index = 0; index < 3; index++) {
        const z = -.33 + index * .33;
        kit.box('plain', .3, .2, .18, P.battery, -.02, y + .115, z);
        for (const side of [-1, 1]) kit.cylinder('hard', .015, .03, side > 0 ? P.drumRed : P.iron, -.02 + side * .1, y + .23, z, null, 6);
      }
    }
    for (const z of [-.5, .5]) kit.batten('hard', [.22, 0, z], [.22, .95, z], .05, .05, P.timber);
    kit.within(.02, 1.0, 0, [0, Math.PI / 2, -.12], () => kit.within(0, 0, 0, [-Math.PI / 2, 0, 0], () => corrugated(kit, 'sheet', 1.2, .7, P.sheets[2], {rust: .6})));
    for (let index = 0; index < 3; index++) kit.line([[.08, .78 - index * .2, -.3 + index * .3], [.0, 1.3 + random() * .1, -.6 + index * .1], [-.06, 1.7, -.75]], P.wire, .05);
  });
}

function drawCharger(kit) {
  const P = PALETTE, c = RADIO_HILL_LAYOUT.things.charger, random = mulberry(0xc4a);
  const ground = kit.ground(c.x, c.z);
  kit.stand(c.x, c.z, 0, () => {
    kit.tube('hard', [0, -.2, 0], [.04, c.height, -.02], .03, P.galv, 6);
    kit.tube('hard', [0, 1.9, 0], [.015, 2.05, -.005], .042, P.rustDark, 6);
    kit.cylinder('plain', .32, .12, P.stonePale, 0, .04, 0, null, 7, .25);
    // Its three ropes, each to a stake.
    for (const angle of [.4, 2.5, 4.6]) {
      const end = [Math.cos(angle) * 3.4, 0, Math.sin(angle) * 3.4];
      kit.hang([.03, c.height - 1.3, -.01], [end[0], .3, end[2]], P.rope, .01, .2, 8);
      kit.batten('hard', [end[0], -.1, end[2]], [end[0] * 1.03, .32, end[2] * 1.03], .04, .04, P.timber);
    }
    // The head: a car alternator on a turntable, facing into the wind, with a tail vane of tin on a tube behind it.
    const into = Math.atan2(-WIND.x, -WIND.z);
    kit.within(.04, c.height, -.02, [0, into, 0], () => {
      kit.cylinder('hard', .06, .08, P.iron, 0, .02, 0, null, 8);
      kit.cylinder('hard', .085, .2, P.galv, 0, .14, .05, [Math.PI / 2, 0, 0], 10);
      kit.tube('hard', [0, .14, -.05], [0, .16, -1.25], .016, P.tube, 5);
      kit.within(0, .18, -1.12, [0, Math.PI / 2, 0], () => corrugated(kit, 'sheet', .5, .38, P.sheets[5], {rust: .7, depth: .006}));
    });
  });
  // The cable down the pole and along the ground to the batteries.
  const b = RADIO_HILL_LAYOUT.things.batteries;
  kit.line([[c.x + .06, ground + c.height, c.z], [c.x + .06, ground + .3, c.z]], P.wire, .1);
  kit.rope('plain', [[c.x, ground + .02, c.z + .1], [1.5, kit.ground(1.5, -3) + .02, -3], [-2.6, kit.ground(-2.6, 1) + .02, 1], [b.x + .3, kit.ground(b.x, b.z) + .3, b.z - .4]], .01, P.rubber, 4, 16);
  return {hub: [c.x + .04 + Math.sin(Math.atan2(-WIND.x, -WIND.z)) * .26, ground + c.height + .14, c.z - .02 + Math.cos(Math.atan2(-WIND.x, -WIND.z)) * .26], facing: Math.atan2(-WIND.x, -WIND.z), seed: random()};
}

// The rotor, drawn about its own hub: three blades cut from an oil drum, curved, bolted to a disc.
function drawRotor(kit) {
  const P = PALETTE, R = RADIO_HILL_LAYOUT.things.charger.rotor;
  kit.cylinder('rotor', .07, .05, P.iron, 0, 0, 0, [Math.PI / 2, 0, 0], 10);
  for (let blade = 0; blade < 3; blade++) {
    const angle = blade * Math.PI * 2 / 3;
    kit.within(0, 0, .02, [0, 0, angle], () => kit.keep('rotor', kit.sheet('rotor', span(4), span(1), (u, v) => {
      const r = .06 + u * (R - .06), wide = .17 - u * .08, twist = .45 - u * .3;
      return [(v - .5) * wide * Math.cos(twist), r, (v - .5) * wide * Math.sin(twist) + Math.sin(v * Math.PI) * .025];
    }, (u) => rgb(P.sheets[5].clone().lerp(P.rust, u * .5)))));
  }
}

// ---- The camp's other things --------------------------------------------------------------------------------------------------
function drawLookout(kit) {
  const P = PALETTE, l = RADIO_HILL_LAYOUT.things.lookout, random = mulberry(0x100c);
  // Stones stacked in a low curved wall to the south of where Hetty stands, the field glasses and a mug on top.
  kit.stand(l.x, l.z, 0, () => {
    // Each course is laid from flat stones of every size, thinner towards the top, a few big ones at the foot.
    let y = 0;
    for (let course = 0; course < 6; course++) {
      const high = .14 - course * .01 + random() * .03;
      let angle = -1.02 + random() * .1;
      while (angle < 1.02) {
        const wide = (course < 2 ? .26 : .16) + random() * .22, reach = l.reach + (random() - .5) * .12;
        const colour = paint([P.stone, P.stoneDark, P.stonePale, P.stoneRed][Math.floor(random() * 4)], .7 + random() * .3);
        if (random() < .3) stone(kit, 'plain', random, wide * .5, colour, Math.sin(angle) * reach, y - .04, Math.cos(angle) * reach, .7);
        else slab(kit, random, wide, high * (.7 + random() * .5), .22 + random() * .14, colour, Math.sin(angle) * reach, y, Math.cos(angle) * reach, angle + (random() - .5) * .5);
        angle += (wide + .02) / reach;
      }
      y += high * .92;
    }
    kit.within(-.25, .82, l.reach - .05, [0, .3, 0], () => {
      for (const side of [-1, 1]) kit.cylinder('hard', .028, .13, P.set, side * .04, 0, 0, [Math.PI / 2, 0, 0], 8);
      kit.box('hard', .06, .03, .05, P.set, 0, 0, 0);
    });
    kit.cylinder('hard', .04, .09, P.galv, .35, .84, l.reach, null, 8);
  });
}

function drawWorkbench(kit) {
  const P = PALETTE, w = RADIO_HILL_LAYOUT.things.workbench, s = RADIO_HILL_LAYOUT.things.seat, random = mulberry(0xb3c);
  // Bern's bench: an old door on two drums, a vice at one end, and what she is mending on it.
  kit.stand(w.x, w.z, 0, () => {
    for (const z of [-.62, .62]) kit.cylinder('hard', .26, .82, z < 0 ? P.drumRed : P.drum, 0, .41, z, null, 10);
    kit.box('hard', .74, .04, 1.95, P.paleTimber, 0, .84, 0, [0, 0, .015]);
    kit.box('hard', .7, .015, .5, P.darkTimber, 0, .865, -.6);
    kit.box('hard', .16, .12, .1, P.iron, .28, .92, .82);
    kit.box('hard', .16, .12, .04, P.iron, .28, .92, .72);
    kit.tube('hard', [.28, .92, .62], [.28, .92, .9], .01, P.iron, 4);
    // A car radio with its lid off, a coil of copper wire, a file and a hammer.
    kit.box('hard', .2, .06, .18, P.setFace, .1, .89, -.1);
    kit.box('hard', .18, .02, .16, P.copper, .1, .925, -.1);
    kit.keep('hard', kit.place(new THREE.TorusGeometry(.12, .03, 5, 12), -.15, .88, .35, [Math.PI / 2, 0, 0]), P.copper);
    kit.tube('hard', [.15, .875, .3], [.2, .875, .55], .008, P.iron, 4);
    kit.tube('hard', [-.2, .875, -.55], [.05, .875, -.62], .012, P.timber, 4);
    kit.box('hard', .1, .04, .04, P.iron, -.22, .875, -.54);
  });
  // The awning: two poles of tube, a sagging tarpaulin from the hut's wall to them, tied down with rope.
  const [n, south] = RADIO_HILL_LAYOUT.things.awning, hutWall = HUT.x - HUT.halfX - .1, wallY = kit.ground(HUT.x, HUT.z) + 2.25;
  for (const pole of [n, south]) {
    const y = kit.ground(pole.x, pole.z);
    kit.tube('hard', [pole.x, y - .1, pole.z], [pole.x + .03, y + 1.92, pole.z], .024, P.tube, 5);
    kit.hang([pole.x + .03, y + 1.9, pole.z], [pole.x - 1.3, kit.ground(pole.x - 1.3, pole.z) + .05, pole.z + (pole === n ? -.6 : .6)], P.rope, .01, .15, 4);
  }
  kit.keep('cloth', kit.sheet('cloth', span(5), span(4), (u, v) => {
    const z = n.z - .25 + (south.z - n.z + .5) * u, x = hutWall + (n.x - hutWall + .05) * v, poleY = kit.ground(n.x, n.z) + 1.9;
    return [x, wallY + (poleY - wallY) * v - Math.sin(v * Math.PI) * Math.sin(u * Math.PI) * .16 - (v > .99 && (u < .01 || u > .99) ? 0 : 0), z];
  }, (u, v) => rgb(paint(P.tarpGrey, .8 + .3 * Math.sin(u * 7 + v * 3)))));
  kit.batten('hard', [hutWall, wallY - .02, n.z - .3], [hutWall, wallY - .02, south.z + .3], .05, .06, P.timber);
  // The seat she sits on to work, against the hut: the back seat of a car on blocks.
  kit.stand(s.x, s.z, Math.PI / 2, () => {
    for (const x of [-.55, .55]) kit.box('plain', .2, .18, .3, P.oldRed, x, .09, 0);
    kit.box('plain', 1.35, .14, .48, P.cloth[0], 0, .25, 0, [.04, 0, 0]);
    kit.box('plain', 1.35, .5, .12, P.cloth[0], 0, .52, .27, [-.2, 0, 0]);
  });
  // The heap of things kept for parts.
  const h = RADIO_HILL_LAYOUT.things.scrap;
  kit.stand(h.x, h.z, .4, () => {
    for (let index = 0; index < 14; index++) {
      const angle = random() * Math.PI * 2, reach = random() * .8, length = .5 + random() * 1.3, y = .05 + random() * .5;
      const a = [Math.cos(angle) * reach, y, Math.sin(angle) * reach], dir = random() * Math.PI * 2;
      kit.tube('hard', a, [a[0] + Math.cos(dir) * length, Math.max(.03, y + (random() - .6) * .5), a[2] + Math.sin(dir) * length], .012 + random() * .02, [P.rust, P.galv, P.tube, P.pipeGreen][index % 4], 5);
    }
    for (let index = 0; index < 4; index++) kit.within((random() - .5) * 1.2, .2 + index * .08, (random() - .5) * 1.2, [random() * .6 - .3 + Math.PI / 2, random() * 3, random() * .4], () => corrugated(kit, 'sheet', .6 + random() * .4, .5 + random() * .4, P.sheets[index], {rust: .8}));
    kit.cylinder('hard', .26, .8, P.drum, .5, .26, -.3, [Math.PI / 2, .7, 0], 10);
    // A bicycle wheel and a radiator.
    kit.keep('plain', kit.place(new THREE.TorusGeometry(.32, .02, 4, 18), -.4, .45, .25, [.2, .5, 1.25]), P.rubber);
    kit.box('hard', .5, .4, .06, P.rustDark, -.1, .35, -.65, [.4, .3, 0]);
    for (let fin = 0; fin < 8; fin++) kit.box('hard', .5, .01, .07, P.rust, -.1, .2 + fin * .045, -.65, [.4, .3, 0]);
  });
  // The rain drum at the north-west corner, under the gutter's downpipe.
  const d = RADIO_HILL_LAYOUT.things.rainDrum;
  kit.stand(d.x, d.z, .3, () => {
    kit.cylinder('hard', .29, .9, P.drum, 0, .45, 0, null, 12, .29, true);
    kit.keep('plain', kit.place(new THREE.CircleGeometry(.27, 12), 0, .78, 0, [-Math.PI / 2, 0, 0]), new THREE.Color(.02, .025, .025));
    kit.cylinder('hard', .3, .03, P.iron, 0, .89, 0, null, 12);
  });
}

function drawWashing(kit) {
  const P = PALETTE, [a, b] = RADIO_HILL_LAYOUT.things.washing, random = mulberry(0x3a5);
  const ya = kit.ground(a.x, a.z), yb = kit.ground(b.x, b.z);
  kit.tube('hard', [a.x, ya - .1, a.z], [a.x + .02, ya + 1.9, a.z], .03, P.timber, 5);
  kit.tube('hard', [b.x, yb - .1, b.z], [b.x - .04, yb + 1.85, b.z + .02], .035, P.tube, 5);
  const line = kit.hang([a.x + .02, ya + 1.85, a.z], [b.x - .04, yb + 1.8, b.z + .02], P.rope, .02, .1, 10);
  // Two people's washing: a shirt, a pair of trousers, a towel and socks.
  const things = [[.15, .62, .55, 0], [.33, .4, .8, 1], [.55, .55, .45, 3], [.72, .14, .2, 2], [.79, .14, .2, 4]];
  for (const [share, wide, long, colour] of things) {
    const index = Math.round(share * 10), at = line[index];
    const dir = Math.atan2(b.z - a.z, b.x - a.x);
    kit.within(at[0], at[1] - .02, at[2], [0, -dir, 0], () => kit.keep('cloth', kit.sheet('cloth', span(3), span(3), (u, v) => [(u - .5) * wide * (1 - v * .1), -v * long, Math.sin(u * 3 + v * 2) * .03 + v * .06],
      () => rgb(paint(P.cloth[colour], .85 + random() * .3)))));
  }
}

// The winch truck: an old pickup, its cab and bonnet from one side outline, with an A-frame of tube over its bed and a hand winch.
function drawTruck(kit) {
  const P = PALETTE, t = RADIO_HILL_LAYOUT.things.truck, random = mulberry(0x7c4);
  kit.stand(t.x, t.z, t.heading, () => {
    // The truck faces +z (its own front). Wheels at z 1.55 and -1.35.
    for (const [x, z, flat] of [[-.82, 1.55, 0], [.82, 1.55, 0], [-.82, -1.35, .04], [.82, -1.35, 0]]) {
      kit.cylinder('plain', .37, .22, P.rubber, x, .37 - flat, z, [0, 0, Math.PI / 2], 14);
      kit.cylinder('hard', .19, .23, P.rust, x, .37 - flat, z, [0, 0, Math.PI / 2], 10);
    }
    for (const x of [-.45, .45]) kit.box('hard', .1, .14, 4.6, P.iron, x, .55, 0);
    // The cab and the bonnet: an outline extruded across the truck's width, with the wheel arches cut.
    const outline = new THREE.Shape();
    const pts = [[-.42, .62], [-.42, 1.86], [.32, 1.9], [.78, 1.42], [1.95, 1.3], [2.12, 1.05], [2.15, .66], [2.02, .66]];
    outline.moveTo(pts[0][0], pts[0][1]);
    for (const [z, y] of pts.slice(1)) outline.lineTo(z, y);
    // The front arch round the front wheel.
    for (let step = 0; step <= 8; step++) { const a = step / 8 * Math.PI; outline.lineTo(1.55 + Math.cos(a) * .47, .66 + Math.sin(a) * .47 * .95); }
    outline.lineTo(-.42, .62);
    const body = new THREE.ExtrudeGeometry(outline, {depth: 1.66, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 1, curveSegments: 2});
    body.translate(0, 0, -.83);
    body.rotateY(-Math.PI / 2);
    kit.keep('sheet', body, P.truck);
    // Windows: dark glass set in the doors and the windscreen.
    for (const side of [-1, 1]) kit.keep('glass', kit.place(new THREE.PlaneGeometry(.55, .38), side * .875, 1.6, .05, [0, side * Math.PI / 2, 0]), GLASS.dusty);
    kit.keep('glass', kit.place(new THREE.PlaneGeometry(1.45, .5), 0, 1.65, .56, [-.78, 0, 0]), GLASS.window);
    // The grille, the lamps, the bumper, a mirror.
    for (let bar = 0; bar < 6; bar++) kit.box('hard', .04, .32, .02, P.iron, -.3 + bar * .12, .88, 2.18);
    for (const side of [-1, 1]) {
      kit.cylinder('hard', .09, .08, P.galv, side * .62, 1.08, 2.12, [Math.PI / 2, 0, 0], 10);
      kit.keep('glass', kit.place(new THREE.CircleGeometry(.075, 10), side * .62, 1.08, 2.165), GLASS.dusty);
    }
    kit.box('hard', 1.9, .14, .12, P.rust, 0, .58, 2.25);
    kit.tube('hard', [-.88, 1.55, .3], [-1.05, 1.62, .35], .012, P.iron, 4);
    kit.box('hard', .03, .14, .1, P.iron, -1.07, 1.65, .35);
    // The bed: a deck of planks with low rails, the A-frame of tube at the back, the winch drum and its cable, a spare wheel.
    for (let plank = 0; plank < 7; plank++) kit.box('hard', .27, .04, 2.55, paint(P.truckBed, .8 + random() * .4), -.82 + plank * .273, .78, -1.8);
    for (const side of [-1, 1]) kit.box('hard', .05, .2, 2.55, P.truck, side * .93, .9, -1.8);
    kit.box('hard', 1.9, .2, .05, P.truck, 0, .9, -3.07);
    const apex = [0, 3.05, -3.75];
    for (const side of [-1, 1]) {
      kit.tube('hard', [side * .85, .8, -3.0], apex, .045, P.galv, 6);
      kit.tube('hard', [side * .85, .8, -1.2], [side * .05, 2.95, -3.6], .03, P.tube, 6);
    }
    kit.cylinder('hard', .07, .2, P.iron, apex[0], apex[1] - .05, apex[2], [0, 0, Math.PI / 2], 8);
    kit.cylinder('hard', .16, .8, P.rustDark, 0, 1.05, -.75, [0, 0, Math.PI / 2], 12);
    for (const side of [-1, 1]) kit.box('hard', .06, .4, .3, P.iron, side * .44, 1.0, -.75);
    kit.tube('hard', [.45, 1.05, -.75], [.62, 1.3, -.75], .015, P.iron, 4);
    kit.keep('hard', kit.place(new THREE.TorusGeometry(.17, .025, 4, 12), 0, 1.05, -.75, [0, Math.PI / 2, 0]), P.wire);
    kit.line([[0, 1.2, -.75], [0, apex[1] + .02, apex[2] + .05], [0, 1.6, apex[2] - .05]], P.wire, .1);
    kit.box('hard', .06, .12, .03, P.iron, 0, 1.52, apex[2] - .05);
    kit.cylinder('plain', .36, .2, P.rubber, .35, .92, -2.25, null, 14);
    kit.cylinder('hard', .14, .21, P.rust, .35, .92, -2.25, null, 8);
    kit.cylinder('hard', .26, .8, P.drumRed, -.5, 1.2, -2.5, null, 10);
  });
}

function drawChairOutside(kit) {
  const P = PALETTE, c = RADIO_HILL_LAYOUT.things.chair;
  // Hetty's folding chair by the door, its canvas faded, and a crate with a tin of biscuits on it.
  kit.stand(c.x, c.z, c.heading, () => {
    for (const side of [-1, 1]) {
      kit.tube('hard', [side * .24, 0, -.25], [side * .24, .45, .22], .012, P.galv, 4);
      kit.tube('hard', [side * .24, 0, .22], [side * .24, .9, -.25], .012, P.galv, 4);
    }
    kit.keep('cloth', kit.sheet('cloth', span(2), span(2), (u, v) => [(u - .5) * .48, .44 - Math.sin(u * Math.PI) * .04, -.18 + v * .38]), P.cloth[1]);
    kit.keep('cloth', kit.sheet('cloth', span(2), span(2), (u, v) => [(u - .5) * .48, .55 + v * .3, -.2 - v * .05]), P.cloth[1]);
    kit.box('hard', .38, .3, .3, P.paleTimber, .62, .15, .1);
    kit.cylinder('hard', .08, .09, P.drumRed, .62, .35, .1, null, 10);
  });
}

// The second set's aerial: a pole of tube with a beam aerial of six elements at its top, pointed down towards the roads, guyed with
// rope, and its cable to the hut's west wall.
function drawSecondAerial(kit) {
  const P = PALETTE, a = RADIO_HILL_LAYOUT.things.secondAerial, ground = kit.ground(a.x, a.z), H = HUT;
  kit.stand(a.x, a.z, 0, () => {
    kit.tube('hard', [0, -.2, 0], [.03, a.height, .02], .032, P.pipeGreen, 6);
    kit.tube('hard', [0, 0, 0], [0, 3.1, 0], .045, P.rust, 6);
    for (const angle of [1.2, 3.3, 5.4]) {
      const end = [Math.cos(angle) * 3.6, 0, Math.sin(angle) * 3.6];
      kit.hang([.02, a.height - 1.8, .01], [end[0], .28, end[2]], P.rope, .012, .2, 8);
      kit.batten('hard', [end[0], -.1, end[2]], [end[0] * 1.02, .3, end[2] * 1.02], .04, .04, P.timber);
    }
    kit.within(.03, a.height - .3, .02, [0, 2.4, 0], () => {
      kit.tube('hard', [0, 0, -.9], [0, 0, 1.1], .016, P.galv, 5);
      [.96, .9, .86, .8, .76, .7].forEach((half, index) => kit.tube('hard', [-half * .5, 0, -.8 + index * .36], [half * .5, 0, -.8 + index * .36], .006, P.galv, 4));
    });
  });
  kit.hang([a.x + .03, ground + a.height - .4, a.z + .02], [H.x - H.halfX - .05, kit.ground(H.x - H.halfX, H.z - 1.5) + 2.0, H.z - 1.5], P.wire, .03, .15, 10);
}

// The long-wire aerial from the mast to a pole on the hut's roof, with an insulator at each end, and its lead down into the hut.
function drawLongWire(kit) {
  const P = PALETTE, H = HUT, m = mastLegAt(1, 18.2), base = kit.ground(0, 0), hutY = kit.ground(H.x, H.z);
  const pole = [H.x + 1.9, hutY + roofAt(-1.3) + 1.45, H.z - 1.3];
  kit.tube('hard', [pole[0], hutY + roofAt(-1.3), pole[2]], pole, .025, P.timber, 5);
  kit.cylinder('plain', .02, .08, P.ceramic, pole[0] + .12, pole[1] - .02, pole[2] - .03, [0, 0, 1.3], 6);
  kit.cylinder('plain', .02, .08, P.ceramic, m.x - .35, base + 18.1, m.z + .2, [0, 0, 1.3], 6);
  kit.hang([m.x - .4, base + 18.1, m.z + .22], [pole[0] + .16, pole[1] - .02, pole[2] - .03], P.copper, .02, .35, 14);
  kit.line([[pole[0] + .1, pole[1] - .05, pole[2] - .03], [pole[0] - .4, hutY + roofAt(-1.4) + .25, H.z - 1.4], [H.x - .3, hutY + roofAt(-1.6) + .05, H.z - 1.6]], P.copper, .1);
  // The feeder from the box on the old mast across to the hut's east wall, on a sag.
  const box = mastLegAt(1, 3.1);
  kit.hang([box.x - .1, base + 3.0, box.z + .05], [H.x + H.halfX + .1, hutY + 2.1, H.z - .9], P.wire, .03, .12, 10);
}

// Spare aerial elements and a ladder leaning against the hut's north wall.
function drawSpares(kit) {
  const P = PALETTE, H = HUT, y = kit.ground(H.x, H.z - H.halfZ);
  for (const [x, top, colour] of [[-1.8, 2.05, P.galv], [-1.62, 1.95, P.galv], [-1.3, 2.1, P.tube]]) kit.tube('hard', [H.x + x, y, H.z - H.halfZ - .65], [H.x + x + .1, y + top, H.z - H.halfZ - .12], .011, colour, 4);
  for (const side of [-1, 1]) kit.tube('hard', [H.x + .9 + side * .22, y, H.z - H.halfZ - .75], [H.x + .9 + side * .22, y + 2.15, H.z - H.halfZ - .13], .02, P.paleTimber, 5);
  for (let rung = 1; rung < 7; rung++) {
    const t = rung / 7;
    kit.tube('hard', [H.x + .68, y + 2.15 * t, H.z - H.halfZ - .75 + .62 * t], [H.x + 1.12, y + 2.15 * t, H.z - H.halfZ - .75 + .62 * t], .014, P.paleTimber, 4);
  }
}

// ---- The ground ------------------------------------------------------------------------------------------------------------
// Marks on the ground: worn earth round the hut's front and the generator, the paths between the places the sisters go, tracks where
// cars stop and where the truck turns out, oil under the generator and the truck. They lie a few centimetres up and follow the land.
function groundPatch(kit, x, z, radiusX, radiusZ, colour, strength, turn = 0, random = null) {
  const rings = 4, around = 18, positions = [], colours = [], indices = [];
  const wobble = Array.from({length: around}, () => .85 + (random ? random() : .5) * .3);
  for (let ring = 0; ring <= rings; ring++) for (let index = 0; index < around; index++) {
    const share = ring / rings, angle = index / around * Math.PI * 2, r = share * wobble[index];
    const lx = Math.cos(angle) * radiusX * r, lz = Math.sin(angle) * radiusZ * r;
    const px = x + lx * Math.cos(turn) + lz * Math.sin(turn), pz = z - lx * Math.sin(turn) + lz * Math.cos(turn);
    positions.push(px, kit.ground(px, pz) + .03 + ring * .002, pz);
    colours.push(colour[0], colour[1], colour[2], strength * (1 - smooth(.45, 1, share)));
  }
  for (let ring = 0; ring < rings; ring++) for (let index = 0; index < around; index++) {
    const a = ring * around + index, b = ring * around + (index + 1) % around;
    indices.push(a, a + around, b, b, a + around, b + around);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  kit.keep('ground', geometry);
}
function groundStrip(kit, points, half, colour, strength, lift = .04) {
  const positions = [], colours = [], indices = [];
  points.forEach((point, index) => {
    const prev = points[Math.max(0, index - 1)], next = points[Math.min(points.length - 1, index + 1)];
    const dx = next[0] - prev[0], dz = next[1] - prev[1], length = Math.hypot(dx, dz) || 1, nx = -dz / length, nz = dx / length;
    const end = Math.min(index, points.length - 1 - index), fade = smooth(0, 2, end);
    for (const side of [-1, 0, 1]) {
      const x = point[0] + nx * half * side, z = point[1] + nz * half * side;
      positions.push(x, kit.ground(x, z) + lift, z);
      colours.push(colour[0], colour[1], colour[2], strength * fade * (side ? 0 : 1));
    }
  });
  for (let index = 0; index < points.length - 1; index++) for (let side = 0; side < 2; side++) {
    const a = index * 3 + side, b = a + 3;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  kit.keep('ground', geometry);
}
const curve = (points, step = .7) => {
  const out = [];
  const at = index => points[Math.max(0, Math.min(points.length - 1, index))];
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = at(index - 1), p1 = at(index), p2 = at(index + 1), p3 = at(index + 2), pieces = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let piece = 0; piece < pieces; piece++) {
      const t = piece / pieces, blend = k => .5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t);
      out.push([blend(0), blend(1)]);
    }
  }
  out.push(points.at(-1));
  return out;
};
function drawGround(kit) {
  const P = PALETTE, L = RADIO_HILL_LAYOUT, random = mulberry(0x9a0d);
  groundPatch(kit, -6.5, 7.5, 5.5, 3.2, MARK.trodden, .55, 0, random);
  groundPatch(kit, -4.2, -3.2, 2.6, 2.2, MARK.trodden, .5, .3, random);
  groundPatch(kit, -4, -4, 1.1, .7, MARK.oil, .5, .12, random);
  groundPatch(kit, 0, 0, 2.2, 2.2, MARK.trodden, .4, 0, random);
  groundPatch(kit, -11.2, 5, 1.8, 2.2, MARK.trodden, .45, 0, random);
  groundPatch(kit, -15.4, -1.8, 1.4, 2.4, MARK.oil, .28, .16, random);
  groundPatch(kit, 3, 11.6, 1.6, 1.1, MARK.trodden, .45, 0, random);
  groundPatch(kit, 6, 19.3, 2.6, 3.2, MARK.trodden, .3, .3, random);
  // The paths.
  const paths = [[[5.6, 17.5], [4.2, 14], [1.5, 10.5], [-3.5, 8.4], [-7, 6.9]], [[-7, 6.6], [-6.3, 3], [-4.6, -1.6], [-4, -2.6]],
    [[-4.2, -2.4], [-2.2, -1.2], [1.2, .2]], [[-6.4, 7], [-1.5, 9.4], [2.6, 11.4]], [[-7.5, 6.8], [-9.7, 6.5], [-10.6, 5.4]], [[1.2, .4], [6, .8], [9.7, 1.3]],
    [[-4.4, -2.8], [-.6, -5.2], [3.8, -7.1]], [[-10.4, 5], [-12.2, 2], [-13.6, -1.2]]];
  for (const path of paths) groundStrip(kit, curve(path), .38, MARK.path, .55);
  // Tracks: the car comes up from the south and stops; the truck's wheels go out to the south past the washing.
  for (const side of [-.75, .75]) {
    groundStrip(kit, curve([[7.9 + side, 21.6], [7.1 + side, 20.7], [6.4 + side, 19.9], [6 + side, 19.2]]), .12, MARK.tyre, .5);
    groundStrip(kit, curve([[-15.6 + side, .4], [-15.2 + side, 6], [-12.4 + side, 13.5], [-8.8 + side, 18.2], [-5.6 + side, 21.8]]), .12, MARK.tyre, .45);
  }
  // Stones lying about, and the pale dust round the foot of the mast.
  for (const s of L.stones) {
    const r = mulberry(s.seed);
    stone(kit, 'plain', r, s.size, [P.stone, P.stoneDark, P.stonePale][s.seed % 3], s.x, kit.ground(s.x, s.z) - s.size * .2, s.z, .55);
  }
  groundPatch(kit, .2, 0, 1.2, 1.2, MARK.pale, .35, 0, random);
}

// ---- The lamps and the mast, seen from far off ----------------------------------------------------------------------------
// One draw of points, each a small picture drawn over the scene at its place. A point has a size in metres and a least size in
// pixels, so that it is its true size close to and never smaller than a few pixels far off (docs/ART_LINE.md: a far tell needs a
// least size). Three shapes:
//   glow   a lamp's light: a haze that adds light to what is behind it, with a hot core; a glow with `wide` 1 also covers it a
//          little, so that the red lamp keeps its colour against a bright sky;
//   mast   one length of the mast's outline, a dark upright stroke at least 1.5 pixels wide, seen only beyond `near` metres, where
//          the lattice itself has thinned to less than a pixel;
//   rag    Hetty's rag at the top, a small faded red patch at least 4 pixels across, seen only beyond `near` metres.
// A glow follows its lamp's level (`which` 0 the red lamp, 1 the hut). The rag's colour follows the daylight, so that at night it
// does not keep its day colour; the mast is a dark outline at any hour.
const SHAPE = Object.freeze({glow: 0, mast: 1, rag: 2});
function createGlow(points, levels, daylight) {
  const positions = [], which = [], sizes = [], least = [], colours = [], shapes = [], wide = [], near = [];
  for (const point of points) {
    positions.push(...point.at); which.push(point.which ?? 0); sizes.push(point.size); least.push(point.least); colours.push(...point.colour);
    shapes.push(SHAPE[point.shape ?? 'glow']); wide.push(point.wide ?? 0); near.push(point.near ?? 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  for (const [name, values] of [['aWhich', which], ['aSize', sizes], ['aLeast', least], ['aShape', shapes], ['aWide', wide], ['aNear', near]])
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, 1));
  geometry.setAttribute('aColour', new THREE.Float32BufferAttribute(colours, 3));
  const viewport = new THREE.Vector4();
  const material = new THREE.ShaderMaterial({
    name: 'Radio Hill lamps and mast from far off',
    uniforms: {uLevels: levels, uDaylight: daylight, uPixels: {value: 1}, uHeight: {value: 720}},
    vertexShader: `
      attribute float aWhich; attribute float aSize; attribute float aLeast; attribute float aShape; attribute float aWide; attribute float aNear;
      attribute vec3 aColour;
      uniform vec2 uLevels; uniform float uDaylight; uniform float uPixels; uniform float uHeight;
      varying vec3 vColour; varying float vLevel; varying float vShape; varying float vWide; varying float vPixel; varying float vCover;
      void main() {
        vCover = aShape < .5 ? aWide : 1.0;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        float reach = max(-view.z, .1);
        // Pixels to the metre at this distance.
        float perMetre = projectionMatrix[1][1] * uHeight * .5 / reach;
        float level = aShape > .5 ? 1.0 : aWhich < .5 ? uLevels.x : uLevels.y;
        float seen = aShape < .5 ? 1.0 : smoothstep(aNear, aNear * 1.8, reach);
        float size = max(aSize * perMetre, aLeast * uPixels);
        if (aShape < .5) size *= .6 + .4 * min(level, 1.0);
        // The rag darkens with the daylight; the mast is dark against the sky by day and by night.
        vColour = aShape > 1.5 ? aColour * uDaylight : aColour; vShape = aShape; vLevel = level * seen; vPixel = 1.0 / size;
        // How much of the point's width the stroke or the patch fills.
        vWide = aShape < .5 ? 0.0 : aShape < 1.5 ? max(aWide * perMetre, 1.5 * uPixels) / size : max(aWide * perMetre, 2.6 * uPixels) / size;
        gl_PointSize = vLevel > .003 ? min(size, 160.0 * uPixels) : 0.0;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      varying vec3 vColour; varying float vLevel; varying float vShape; varying float vWide; varying float vPixel; varying float vCover;
      void main() {
        vec2 at = gl_PointCoord - .5;
        vec4 colour;
        if (vShape < .5) {
          // The lamp: a core, a haze round it and a faint wide halo. The core and the haze cover the sky a little, so that the lamp
          // reads in its own colour against a bright dusk; the halo only adds light.
          float d = length(at) * 2.0;
          float core = exp(-d * d * 38.0), haze = exp(-d * d * 7.0), halo = exp(-d * 2.6) * (1.0 - smoothstep(.75, 1.0, d));
          float level = min(vLevel, 1.4);
          // Kept below the brightness at which the tone mapping turns a strong red to white.
          vec3 light = vColour * (core * 1.05 + haze * .75 + halo * .18) + vec3(.5, .16, .1) * core * core * .12;
          colour = vec4(light * level, vCover * min(1.0, (core * .95 + haze * .8 + halo * .15) * min(level, 1.0)));
        } else {
          // The mast's stroke fills the point's height; the rag is a patch across the middle. Their edges are softened by a pixel.
          float across = clamp((vWide * .5 - abs(at.x)) / vPixel + .5, 0.0, 1.0);
          float high = vShape < 1.5 ? 1.0 : clamp((vWide * .3 - abs(at.y)) / vPixel + .5, 0.0, 1.0);
          float cover = across * high * min(vLevel, 1.0);
          colour = vec4(vColour * cover, cover);
        }
        gl_FragColor = colour;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    // Each point gives its colour already weighed by how much it covers: what it covers is taken away, its light is added.
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const glow = new THREE.Points(geometry, material);
  glow.name = 'Radio Hill, the glow of its lamps';
  glow.frustumCulled = false;
  glow.renderOrder = 4;
  glow.onBeforeRender = renderer => {
    material.uniforms.uPixels.value = renderer.getPixelRatio();
    material.uniforms.uHeight.value = renderer.getCurrentViewport(viewport).w;
  };
  return glow;
}

// The wires: one draw of lines. Close to, they are as thin as wires are; from far off the mast's legs stay and the wires fade.
function createLines(lines) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(lines.colours, 3));
  geometry.setAttribute('aFar', new THREE.Float32BufferAttribute(lines.far, 1));
  geometry.setIndex(Array.from({length: lines.positions.length / 3}, (_, index) => index));
  const material = new THREE.LineBasicMaterial({name: 'Radio Hill wires', vertexColors: true, transparent: true});
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFar;\nvarying float vFade;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFade = mix(.85, aFar, smoothstep(30.0, 260.0, -mvPosition.z));');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
  };
  material.customProgramCacheKey = () => 'radio-hill-wires-1';
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.name = 'Radio Hill, wires';
  return mesh;
}

// Pieces that light up: the lamp's bulb, the hut's bulb, the light from the door, the window, the set's scale. Each is drawn
// brighter or darker by its light's level and added to the scene.
function litMaterial(levels) {
  const material = new THREE.MeshBasicMaterial({name: 'Radio Hill lights', vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true});
  material.onBeforeCompile = shader => {
    shader.uniforms.uLevels = levels;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWhich;\nvarying float vWhich;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWhich = aWhich;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uLevels;\nvarying float vWhich;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vWhich < .5 ? uLevels.x : uLevels.y;');
  };
  material.customProgramCacheKey = () => 'radio-hill-lights-1';
  return material;
}

const KINDS = Object.freeze({
  hard: {name: 'tube, timber and iron'}, sheet: {name: 'tin'}, cloth: {name: 'cloth'}, plain: {name: 'stone, rubber and earth'},
  glass: {name: 'glass', alpha: true}, ground: {name: 'marks on the ground', alpha: true}, lit: {name: 'lights', lit: true}, rotor: {name: 'wind charger'},
});

// The camp at a stage. `stage` is 'camp' or 'second-set'; `night` lights the red lamp and the hut; `heightAt(x, z)` is the ground
// under a point of the site.
export function buildRadioHill({stage = 'camp', heightAt = () => 0, night = false} = {}) {
  if (!RADIO_HILL_STAGES.includes(stage)) throw new RangeError(`Radio Hill has no stage called ${JSON.stringify(stage)}.`);
  PALETTE ??= makePalette();
  const L = RADIO_HILL_LAYOUT;
  const group = new THREE.Group();
  group.name = 'Radio Hill';
  const kit = createKit(heightAt, KINDS);

  drawGround(kit);
  const mast = drawMast(kit);
  drawGuys(kit);
  L.things.anchors.forEach((anchor, index) => drawAnchor(kit, anchor, index));
  drawHut(kit, stage);
  drawLongWire(kit);
  drawSpares(kit);
  drawGenerator(kit);
  drawBatteries(kit);
  const charger = drawCharger(kit);
  drawLookout(kit);
  drawWorkbench(kit);
  drawWashing(kit);
  drawTruck(kit);
  drawChairOutside(kit);
  if (stage === 'second-set') drawSecondAerial(kit);
  // The rotor is drawn about its own hub and stood in place as a mesh of its own.
  drawRotor(kit);

  const wear = {hard: createScrapWear({paint: .75, dust: 0x6a5a44}), sheet: createScrapWear({paint: .6, dust: 0x6a5a44}), cloth: createScrapWear({paint: .55, dust: 0x6a5a44})};
  const levels = {value: new THREE.Vector2()};
  const materials = {
    hard: wear.hard.apply(new THREE.MeshStandardMaterial({name: KINDS.hard.name, vertexColors: true, roughness: .88, metalness: .12})),
    sheet: wear.sheet.apply(new THREE.MeshStandardMaterial({name: KINDS.sheet.name, vertexColors: true, roughness: .8, metalness: .16, side: THREE.DoubleSide})),
    cloth: wear.cloth.apply(new THREE.MeshStandardMaterial({name: KINDS.cloth.name, vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide})),
    plain: new THREE.MeshStandardMaterial({name: KINDS.plain.name, vertexColors: true, roughness: .96, metalness: 0}),
    glass: new THREE.MeshStandardMaterial({name: KINDS.glass.name, vertexColors: true, transparent: true, roughness: .18, metalness: 0, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false}),
    ground: new THREE.MeshStandardMaterial({name: KINDS.ground.name, vertexColors: true, transparent: true, roughness: 1, metalness: 0, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4}),
    lit: litMaterial(levels),
    rotor: wear.hard.apply(new THREE.MeshStandardMaterial({name: KINDS.rotor.name, vertexColors: true, roughness: .8, metalness: .15, side: THREE.DoubleSide})),
  };
  const parts = {};
  for (const [kind, list] of Object.entries(kit.lists)) {
    if (!list.length) { materials[kind].dispose(); continue; }
    const merged = mergeGeometries(list);
    for (const geometry of list) geometry.dispose();
    const mesh = new THREE.Mesh(merged, materials[kind]);
    mesh.name = `Radio Hill, ${KINDS[kind].name}`;
    mesh.castShadow = !['glass', 'ground', 'lit'].includes(kind);
    mesh.receiveShadow = kind !== 'lit';
    if (kind === 'ground') mesh.renderOrder = 1;
    if (kind === 'glass') mesh.renderOrder = 2;
    if (kind === 'lit') mesh.renderOrder = 3;
    group.add(mesh);
    parts[kind] = mesh;
  }
  parts.rotor.position.set(...charger.hub);
  parts.rotor.rotation.set(0, charger.facing, 0, 'YXZ');
  const wires = createLines(kit.lines);
  group.add(wires);
  // The lamps' glows: the red lamp, the hut's bulb seen through the door, the window and the doorway. Then the mast's outline from
  // far off, a stroke for each 2.5 m of it, so that each length is hidden by the land in front of it on its own; and the rag.
  const hutY = heightAt(HUT.x, HUT.z), T = L.things.table, base = heightAt(L.mast.x, L.mast.z), daylight = {value: 1};
  const outline = [];
  for (let y = 1.25; y < L.mast.height; y += 2.5) {
    const middle = mastMiddleAt(y), width = L.mast.footRadius * 1.6 + (L.mast.topRadius - L.mast.footRadius) * 1.6 * y / L.mast.height;
    outline.push({at: [middle.x, base + y, middle.z], shape: 'mast', size: 3.1, least: 3, wide: width, near: 320, colour: y < L.mast.oldTop ? [.085, .06, .05] : [.06, .055, .05]});
  }
  const glow = createGlow([
    {at: [T.x + .35, hutY + 1.98, T.z + .25], which: LIT.hut, size: .5, least: 3, colour: [.9, .6, .3]},
    {at: [HUT.x + HUT.halfX + .05, hutY + 1.3, HUT.z + .95], which: LIT.hut, size: .7, least: 3, colour: [.32, .17, .06]},
    {at: [HUT.x, hutY + .95, HUT.z + HUT.halfZ + .05], which: LIT.hut, size: .9, least: 4, colour: [.3, .15, .05]},
    ...outline,
    {at: mast.flag, shape: 'rag', size: FLAG.long, least: 4.5, wide: FLAG.long, near: 320, colour: [.32, .07, .035]},
    // The red lamp last, so that it is drawn over the mast's outline and the rag. It covers the sky a little (`wide`) so that it
    // reads red against a bright dusk; the hut's glows only add light.
    {at: [mast.head[0], mast.head[1] + .15, mast.head[2]], which: LIT.lamp, size: 2.2, least: 16, wide: 1, colour: [.95, .06, .02]},
  ], levels, daylight);
  group.add(glow);
  // Two lights at night: the hut's bulb, and the red lamp on the top of the mast, which colours the lattice round it.
  const hutLight = new THREE.PointLight(0xffb36a, 9, 4.4, 2);
  hutLight.position.set(T.x + .35, hutY + 1.95, T.z + .45);
  const lampLight = new THREE.PointLight(0xff2a0c, 5, 5, 2);
  lampLight.position.set(mast.head[0], mast.head[1] + .15, mast.head[2]);
  for (const light of [hutLight, lampLight]) { light.visible = false; group.add(light); }
  // Thin smoke from the stovepipe: the kettle is on.
  const pipe = {x: L.things.stove.x, z: L.things.stove.z};
  const smoke = createSmokeColumn({height: 13, foot: .12, top: 2.2, wind: WIND, lean: .3, colour: 0x8a8174, pale: 0xd9d1c3, strength: .3});
  smoke.name = 'Radio Hill, stove smoke';
  smoke.position.set(pipe.x, hutY + 3.32, pipe.z);
  group.add(smoke);

  const draws = [];
  group.traverse(node => { if (node.isMesh || node.isLine || node.isPoints) draws.push(node.name); });
  const toGround = new THREE.Matrix4().makeTranslation(0, -heightAt(0, 0), 0);
  const lineCount = kit.lines.positions.length / 6;
  group.userData = {
    stage, night, draws, triangles: kit.triangles + smoke.geometry.index.count / 3, lines: lineCount,
    lights: [hutLight, lampLight], rotor: parts.rotor, smoke, glow, wires, lit: parts.lit, levels: levels.value, daylight,
    head: {x: mast.head[0], y: mast.head[1], z: mast.head[2]},
    update(seconds, {night: dark = group.userData.night, signalAt = null} = {}) {
      const lamp = radioHillLamp(seconds, {night: dark, signalAt});
      // The hut's light is steady, with a small waver from the generator.
      const hut = dark ? .92 + .05 * Math.sin(seconds * 7.3) * Math.sin(seconds * 2.1) : 0;
      levels.value.set(dark ? .1 + lamp * 1.15 : .0, hut);
      daylight.value = dark ? .2 : 1;
      hutLight.visible = dark; lampLight.visible = dark && lamp > .02;
      hutLight.intensity = 9 * hut; lampLight.intensity = 5 * lamp;
      // The wires and the smoke are drawn without the scene's light, so the night takes them down by hand.
      wires.material.color.setScalar(dark ? .18 : 1);
      smoke.visible = !dark;
      // The charger turns in the wind, gusting.
      parts.rotor.rotation.z = -(seconds * 4.1 + Math.sin(seconds * .43) * 2.2 + Math.sin(seconds * 1.7) * .4);
      for (const worn of [wear.hard, wear.sheet, wear.cloth]) { worn.follow(group); worn.uniforms.uScrapInverse.value.premultiply(toGround); }
      parts.rotor.updateWorldMatrix(true, false);
      smoke.userData.update(seconds);
    },
    dispose() {
      group.traverse(node => { if (node.isMesh || node.isLine || node.isPoints) { node.geometry.dispose(); node.material.dispose(); } });
    },
  };
  group.userData.update(0);
  return group;
}

// The parts that move. `seconds` is the game's clock; `night` lights the lamps (it defaults to how the camp was built); `signalAt`
// is the game's time at which Hetty began to blink the lamp three times.
export function updateRadioHill(group, seconds, options) {
  group?.userData?.update?.(seconds, options);
}
