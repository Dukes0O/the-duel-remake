// Tin Town's forge and its crane (EVERBURN-REMAKE, job 1: "the pot is lifted off and the forge takes the fire"). Claude's
// drawing, shaped in code: no model files, no lights.
//
// The forge is a hearth of salvaged brick with a chimney of oil drums, a bellows, a quench drum and an anvil. Beside it stands
// the thing Tin Town is proudest of: a crane on a lattice tower, its jib long enough to reach a car anywhere in the delivery
// bay. While a car is near, the crane's driver keeps the hook over it. When the pot is delivered the hook comes down, lifts the
// pot off the car, carries it round to the hearth and tips the ember onto the cold coals. The fire that follows is the ember's
// own: a bright ember catches at once and burns tall, a weak one creeps.
//
// Nothing here reads or changes the job. The scene tells it where the car is (`watch`), when and where the pot is handed over
// (`deliver`), and the clock (`animate`). `forgePlan().solids` are the plain shapes a car cannot drive through.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LAND} from './scablands-names.js';
import {scrapBuilder, scrapSheetColours, scrapSteel, yardSheetPicture, yardSurface} from './scablands-yard-look.js';
import {createFlameMaterial, createGroundGlowMaterial, createSparks} from './scrap-look.js';
import {createSmokeColumn} from './smoke-column.js';
import {createCoalMaterial, createLoosePot} from './ember-pot.js';

const hash = (a, b = 0) => Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
const BRICK = [0x8f5b45, 0x9c6a50, 0x7c4f3e, 0xa37a62, 0x6a4a3c], ASH = 0x4a4540, SOOT = 0x191614, TIMBER = 0x5a4836, HIDE = 0x33261e, ROPE = 0x1c1a18;
const CONCRETE = [0x6b6964, 0x5d5a55, 0x77736b], PAINT = [0x7d6a2e, 0x6e5c2a, 0x8a7436];

// Metres. The hearth and the tower are placed from Tin Town's middle (east, south); the delivery bay's ring is centred 25 m east
// and 14 m south of it with a radius of 8 m (src/world/jobs/everburn.js), and both stand just outside that ring on its north side.
export const FORGE = Object.freeze({
  // Every place here is a whole number of eighths of a metre, so that a thing keeps its exact offset when a test moves the town.
  hearth: Object.freeze({east: 27.25, south: 2.375}),
  tower: Object.freeze({east: 23.5, south: 3.625, height: 11, half: .75}),
  anvil: Object.freeze({east: 24.75, south: 4.5}),
  jib: 21, counter: 6, chordHeight: .3,
  pit: Object.freeze({x: 0, y: .74, z: .15}),          // the top of the coal bed, in the hearth's own metres
  chimney: Object.freeze({x: 0, y: 5.25, z: -1.2}),
  hookHeight: 5.6,                                      // how high the empty hook rides above the ground
  potBelowHook: 1.3, hookBelowLine: .62,
  // The crane's work, in seconds after the pot is handed over: the hook is over the pot (reach), down on it (lower), has it
  // (take), has lifted it (lift), has carried it over the hearth (carry), has set it down in the mouth (set); the ember lands
  // (lit) while the pot tips (poured), the pot is righted (right to righted) and drawn up out of the fire (away).
  times: Object.freeze({reach: .9, lower: 1.6, take: 1.8, lift: 2.7, carry: 4.3, set: 4.75, lit: 5, poured: 5.35, right: 5.9, righted: 6.6, away: 7.6}),
});

export function forgePlan(land = LAND) {
  const hearth = land.at('tin-town', FORGE.hearth.east, FORGE.hearth.south), tower = land.at('tin-town', FORGE.tower.east, FORGE.tower.south);
  const anvil = land.at('tin-town', FORGE.anvil.east, FORGE.anvil.south), solid = land.at('tin-town', FORGE.hearth.east + .125, FORGE.hearth.south + .25);
  return {
    hearth: {x: hearth.x, z: hearth.z}, tower: {x: tower.x, z: tower.z}, anvil: {x: anvil.x, z: anvil.z},
    solids: [
      {id: 'tin-town-forge', kind: 'building', shape: 'box', x: solid.x, z: solid.z, heading: 0, halfX: 3.05, halfZ: 2.0, height: 2.3},
      {id: 'tin-town-crane', kind: 'post', shape: 'box', x: tower.x, z: tower.z, heading: 0, halfX: FORGE.tower.half + .1, halfZ: FORGE.tower.half + .1, height: FORGE.tower.height},
      {id: 'tin-town-anvil', kind: 'prop', shape: 'ellipse', x: anvil.x, z: anvil.z, halfX: .55, halfZ: .55, height: 1},
    ],
  };
}

// ---- Shapes ---------------------------------------------------------------------------------------------------------------------------
function hearth(f) {
  // Brick laid in uneven courses: two piers, a back wall, and a bed of ash and clinker between them.
  const courses = (cx, cz, wide, deep, tall, count, key) => {
    for (let i = 0; i < count; i++) f.box(wide + (hash(key, i) - .5) * .1, tall / count - .025, deep + (hash(key, i + 9) - .5) * .1,
      cx + (hash(key, i + 19) - .5) * .06, (i + .5) * tall / count, cz + (hash(key, i + 29) - .5) * .06, BRICK[Math.floor(hash(key, i + 39) * BRICK.length)], {foot: i ? 0 : .45});
  };
  courses(-1.75, 0, .9, 3.0, 1.3, 4, 1); courses(1.75, 0, .9, 3.0, 1.3, 4, 2); courses(0, -1.2, 4.4, .6, 2.3, 7, 3);
  f.box(2.6, .7, 2.5, 0, .35, .25, ASH, {foot: .3});
  f.box(2.7, .16, .16, 0, .86, 1.45, scrapSteel(4, 1, .6));
  // Soot up the back wall, where every fire before this one stood.
  f.box(2.3, 1.45, .05, 0, 1.55, -.88, SOOT); f.box(1.5, .5, .05, 0, 2.05, -.87, 0x0f0d0c);
  // The chimney: three drums on the back wall, banded, stayed with wire, under a cowl.
  for (let i = 0; i < 3; i++) {
    const drum = new THREE.CylinderGeometry(.42, .42, .95, 12); drum.translate(0, 2.3 + .475 + i * .96, -1.2); f.add(drum, [0x4a3a30, 0x3c3530, 0x51453a][i]);
    const band = new THREE.CylinderGeometry(.44, .44, .05, 12); band.translate(0, 2.3 + (i + 1) * .96 - .02, -1.2); f.add(band, scrapSteel(5, i, .6));
  }
  const cowl = new THREE.ConeGeometry(.62, .34, 10); cowl.translate(0, 5.66, -1.2); f.add(cowl, 0x3a322c);
  for (const [x, z] of [[-.36, 0], [.36, 0], [0, -.36], [0, .36]]) f.strut([x, 5.16, -1.2 + z], [x * 1.25, 5.5, -1.2 + z * 1.25], .05, scrapSteel(6, x + z * 3, .7));
  f.strut([-.42, 4.3, -1.2], [-2.0, 2.3, -1.2], .04, ROPE); f.strut([.42, 4.3, -1.2], [2.0, 2.3, -1.2], .04, ROPE);
  // A windbreak of sheet behind the hearth, taller than a man, so that the fire is seen against it from the bay.
  const sheets = scrapSheetColours();
  for (let i = 0; i < 5; i++) {
    const x = -2.4 + i * 1.2, tall = 3.0 + hash(11, i) * .7;
    f.box(1.3, tall, .07, x, tall / 2, -1.64, sheets[Math.floor(hash(11, i + 5) * sheets.length)], {ribs: true, lean: .04 + hash(11, i + 9) * .05, foot: .45, slide: hash(11, i + 13)});
  }
  for (const x of [-2.9, -.6, 1.8, 3.0]) f.strut([x, 0, -1.72], [x, 3.4, -1.72], .12, TIMBER);
  f.strut([-2.9, 2.5, -1.72], [3.0, 2.6, -1.72], .1, TIMBER);
  // The bellows on the right: a wedge of hide between two boards, its nozzle through the pier, and a pole to pump it.
  f.box(.8, .1, 1.5, 2.62, .62, .3, TIMBER); f.box(.8, .1, 1.5, 2.62, 1.12, .42, TIMBER, {lean: -.18});
  f.box(.72, .42, 1.3, 2.62, .87, .4, HIDE, {lean: -.09});
  f.strut([2.62, .8, -.4], [2.1, .86, -.5], .1, scrapSteel(8, 1, .6));
  f.strut([2.92, 0, 1.25], [2.92, 2.2, 1.25], .12, TIMBER); f.strut([2.92, 2.12, 1.85], [2.92, 1.98, -.2], .08, TIMBER); f.strut([2.92, 2.0, .1], [2.7, 1.18, .5], .03, ROPE);
  // A drum of water at the mouth, a crib of coal between the hearth and the crane, and bars leant on the left pier.
  const quench = new THREE.CylinderGeometry(.29, .29, .88, 12); quench.translate(2.55, .44, 1.85); f.add(quench, 0x3c5560, .5);
  const water = new THREE.CylinderGeometry(.27, .27, .02, 12); water.translate(2.55, .84, 1.85); f.add(water, 0x14181a);
  f.box(.7, .6, 1.7, -2.58, .3, .1, TIMBER, {foot: .4}); f.box(.6, .18, 1.6, -2.58, .62, .1, SOOT);
  for (let i = 0; i < 4; i++) f.strut([-1.5 - i * .13, 0, 1.78 + hash(9, i) * .25], [-1.6 - i * .1, 1.5 + hash(9, i + 4) * .5, 1.52], .035, scrapSteel(9, i, .65));
}

function anvil(f) {
  const stump = new THREE.CylinderGeometry(.3, .34, .56, 9); stump.translate(0, .28, 0); f.add(stump, TIMBER, .4);
  f.box(.26, .16, .16, 0, .64, 0, 0x26221f); f.box(.6, .16, .2, 0, .8, 0, 0x2c2825);
  const horn = new THREE.ConeGeometry(.08, .34, 8); horn.rotateZ(-Math.PI / 2); horn.translate(.47, .8, 0); f.add(horn, 0x2c2825);
  f.strut([-.2, .92, .05], [.25, .94, -.04], .04, TIMBER); f.box(.1, .09, .16, .27, .94, -.04, 0x1f1c1a);
}

function tower(f) {
  const H = FORGE.tower.height, s = FORGE.tower.half, corners = [[-s, -s], [s, -s], [s, s], [-s, s]];
  f.box(s * 2 + .7, .5, s * 2 + .7, 0, .2, 0, CONCRETE[0], {foot: .5});
  corners.forEach(([x, z], i) => f.strut([x, .3, z], [x, H, z], .17, i % 2 ? PAINT[i % 3] : scrapSteel(20, i, .85)));
  const levels = 6, step = (H - .4) / levels;
  for (let level = 0; level < levels; level++) {
    const y = .4 + level * step, next = y + step;
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4], [from, to] = (level + i) % 2 ? [a, b] : [b, a];
      f.strut([a[0], next, a[1]], [b[0], next, b[1]], .1, scrapSteel(21 + level, i, .85));
      f.strut([from[0], y, from[1]], [to[0], next, to[1]], .08, scrapSteel(31 + level, i, .9));
    }
  }
  // A ladder up the face away from the hearth, and the ring the arm turns on.
  for (const z of [-.22, .22]) f.strut([-s - .12, .4, z], [-s - .12, H, z], .04, scrapSteel(40, z, .7));
  for (let y = .7; y < H; y += .42) f.strut([-s - .12, y, -.22], [-s - .12, y, .22], .03, scrapSteel(41, y, .7));
  const ring = new THREE.CylinderGeometry(.95, .95, .35, 14); ring.translate(0, H + .175, 0); f.add(ring, 0x2e2a26);
}

// The hearth, the anvil and the crane's tower as one piece, in metres from the hearth's own place (x east, z south, y up from
// the ground there). `heightAt(x, z)` is the ground's height in those same metres.
export function forgeShape(plan = forgePlan(), heightAt = () => 0) {
  const {parts, frame} = scrapBuilder(heightAt);
  hearth(frame(0, 0, 0, .15));
  anvil(frame(plan.anvil.x - plan.hearth.x, plan.anvil.z - plan.hearth.z, .5, .05));
  tower(frame(plan.tower.x - plan.hearth.x, plan.tower.z - plan.hearth.z, 0, .2));
  const merged = mergeGeometries(parts);
  merged.computeBoundingSphere();
  return merged;
}

// The arm that turns on the tower: the jib along +z, the counter-jib behind it with its weights and winch, the cat head
// and its ties, and the driver's cab. Its y 0 is the top of the tower's ring.
export function craneArmShape() {
  const {parts, frame} = scrapBuilder(), f = frame(0, 0, 0, 0), J = FORGE.jib, C = FORGE.counter, y0 = FORGE.chordHeight, top = y0 + 1.25, sheets = scrapSheetColours();
  f.box(1.9, .2, 2.3, 0, .1, 0, 0x2e2a26);
  for (const x of [-.5, .5]) f.strut([x, y0, -C], [x, y0, J], .13, x < 0 ? PAINT[0] : PAINT[1]);
  const end = J - 1.6;
  f.strut([0, top, .6], [0, top, end], .13, PAINT[2]); f.strut([0, top, end], [0, y0, J], .11, PAINT[0]);
  const bays = Math.round((end - .6) / 1.5), bay = (end - .6) / bays;
  for (let k = 0; k < bays; k++) {
    const z = .6 + k * bay;
    for (const x of [-.5, .5]) { f.strut([x, y0, z], [0, top, z + bay / 2], .07, scrapSteel(50 + k, x, .9)); f.strut([0, top, z + bay / 2], [x, y0, z + bay], .07, scrapSteel(60 + k, x, .9)); }
    f.strut([-.5, y0 + .06, z], [.5, y0 + .06, z], .06, scrapSteel(70, k, .85));
  }
  f.box(1.12, .1, .1, 0, y0, J, PAINT[1]);
  // The cat head over the tower, and the ties that hold both arms up.
  const apex = [0, y0 + 4.4, -.3];
  for (const x of [-.5, .5]) for (const z of [-1.1, .6]) f.strut([x, y0, z], apex, .12, scrapSteel(80, x + z, .85));
  f.strut(apex, [0, top, J * .52], .05, ROPE); f.strut(apex, [0, top, end], .05, ROPE);
  for (const x of [-.5, .5]) f.strut(apex, [x, y0, -C + .3], .05, ROPE);
  // The counter-jib: a deck, slabs of concrete and an engine block for weight, the winch and its housing.
  f.box(1.25, .06, C - 1.2, 0, y0 + .08, -(C + 1.2) / 2, scrapSteel(81, 1, .7));
  for (const z of [-1.2, -2.8, -4.4, -C]) f.strut([-.5, y0, z], [.5, y0, z], .08, scrapSteel(82, z, .8));
  for (let i = 0; i < 3; i++) f.box(1.35 - i * .08, .42, .7, (hash(82, i) - .5) * .08, y0 + .32 + i * .44, -C + .55, CONCRETE[i]);
  f.box(.8, .55, .6, .1, y0 + .38, -C + 1.45, 0x2a2623);
  const drum = new THREE.CylinderGeometry(.3, .3, .9, 12); drum.rotateZ(Math.PI / 2); drum.translate(0, y0 + .5, -2.1); f.add(drum, 0x35302b);
  for (const x of [-.52, .52]) f.box(.06, .8, .7, x, y0 + .5, -2.1, scrapSteel(83, x, .7));
  f.box(1.3, 1.0, 1.1, 0, y0 + .62, -3.5, sheets[4], {ribs: true, slide: .3});
  f.strut([0, y0 + .8, -2.1], [0, y0 + 4.3, -.3], .03, ROPE);
  // The cab hangs clear of the tower on the right, its window toward the hook.
  f.box(1.25, 1.55, 1.35, 1.75, y0 - .55, .5, sheets[6], {ribs: true, slide: .6});
  f.box(.9, .5, .06, 1.75, y0 - .25, 1.2, 0x15171a);
  f.box(1.45, .08, 1.6, 1.75, y0 + .28, .5, sheets[1], {ribs: true, lean: .08});
  for (const z of [0, 1.0]) f.strut([.5, y0, z], [1.2, y0 - .1, z], .08, scrapSteel(84, z, .8));
  const merged = mergeGeometries(parts);
  merged.computeBoundingSphere();
  return merged;
}

// The trolley that runs along the jib (its y 0 is the jib's lower chords), and the hook block (its y 0 is the lines' lower end).
export function craneTrolleyShape() {
  const {parts, frame} = scrapBuilder(), f = frame(0, 0, 0, 0);
  f.box(1.25, .12, 1.0, 0, -.14, 0, scrapSteel(90, 1, .7));
  for (const x of [-.5, .5]) for (const z of [-.35, .35]) f.box(.12, .2, .2, x, 0, z, 0x1f1c1a);
  const sheave = new THREE.CylinderGeometry(.14, .14, .3, 10); sheave.rotateZ(Math.PI / 2); sheave.translate(0, -.3, 0); f.add(sheave, 0x2a2623);
  return mergeGeometries(parts);
}
export function craneHookShape() {
  const {parts, frame} = scrapBuilder(), f = frame(0, 0, 0, 0);
  f.box(.3, .34, .14, 0, -.17, 0, PAINT[1]); f.box(.34, .06, .18, 0, -.02, 0, 0x1f1c1a);
  const hook = new THREE.TorusGeometry(.12, .03, 6, 12, Math.PI * 1.5); hook.rotateZ(Math.PI * .75); hook.translate(0, -.48, 0); f.add(hook, 0x1f1c1a);
  f.strut([0, -.3, 0], [0, -.38, 0], .05, 0x1f1c1a);
  return mergeGeometries(parts);
}

// ---- The forge, drawn and moving -----------------------------------------------------------------------------------------------------
const FIRE = Object.freeze({bright: {size: 1, seconds: 2, tall: 3.6}, alive: {size: .62, seconds: 5, tall: 2.1}, barely: {size: .34, seconds: 8, tall: 1.1}});
const toward = (value, target, most) => value + Math.max(-most, Math.min(most, target - value));
const turn = (value, target, most) => { let gap = (target - value) % (Math.PI * 2); if (gap > Math.PI) gap -= Math.PI * 2; if (gap < -Math.PI) gap += Math.PI * 2; return value + Math.max(-most, Math.min(most, gap)); };

export function createForge({heightAt = () => 0, plan = forgePlan(), documentLike = typeof document === 'undefined' ? null : document} = {}) {
  const group = new THREE.Group(); group.name = "Tin Town's forge and crane";
  const base = heightAt(plan.hearth.x, plan.hearth.z), local = (x, z) => heightAt(plan.hearth.x + x, plan.hearth.z + z) - base;
  group.position.set(plan.hearth.x, base, plan.hearth.z);
  const surface = yardSurface(yardSheetPicture(documentLike));
  const part = (shape, name) => { const mesh = new THREE.Mesh(shape, surface); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  group.add(part(forgeShape(plan, local), 'Hearth, anvil and crane tower'));

  // The crane's moving parts: the arm turns on the tower, the trolley runs along the arm, the lines pay out, the hook hangs.
  const towerAt = {x: plan.tower.x - plan.hearth.x, z: plan.tower.z - plan.hearth.z}, towerGround = local(towerAt.x, towerAt.z) - .2;
  const arm = new THREE.Group(); arm.name = 'Crane arm'; arm.position.set(towerAt.x, towerGround + FORGE.tower.height + .35, towerAt.z); group.add(arm);
  arm.add(part(craneArmShape(), 'Jib, counter-jib and cab'));
  const trolley = new THREE.Group(); trolley.position.y = FORGE.chordHeight; arm.add(trolley); trolley.add(part(craneTrolleyShape(), 'Trolley'));
  const hang = new THREE.Group(); hang.position.y = -.36; trolley.add(hang);
  const rope = new THREE.MeshStandardMaterial({color: ROPE, roughness: .8, metalness: .3});
  const lineShape = new THREE.BoxGeometry(.03, 1, .03); lineShape.translate(0, -.5, 0);
  const lines = [-.09, .09].map(x => { const line = new THREE.Mesh(lineShape, rope); line.position.x = x; hang.add(line); return line; });
  const hook = new THREE.Group(); hang.add(hook); hook.add(part(craneHookShape(), 'Hook block'));
  const pot = createLoosePot(); pot.visible = false; group.add(pot);
  // Heights of the lines' upper end, and the lengths of line for the three places the hook stops.
  const lineTop = arm.position.y + FORGE.chordHeight - .36;
  const lengthUp = lineTop - FORGE.hookBelowLine - (towerGround + FORGE.hookHeight);
  const lengthAtPit = lineTop - FORGE.potBelowHook - (FORGE.pit.y + .2);
  const pitFrom = {x: FORGE.pit.x - towerAt.x, z: FORGE.pit.z - towerAt.z};
  const pitBearing = Math.atan2(pitFrom.x, pitFrom.z), pitReach = Math.hypot(pitFrom.x, pitFrom.z);

  // The fire: a bed of coals, three tongues of flame, firelight on the ground at the mouth, sparks, and smoke from the chimney.
  const coalMaterial = createCoalMaterial(), coals = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.4), coalMaterial);
  coals.name = 'Forge coals'; coals.rotation.x = -Math.PI / 2; coals.position.set(0, FORGE.pit.y - .15 + .01, .25); group.add(coals);
  coalMaterial.uniforms.uHeat.value = 0;
  const flameMaterial = createFlameMaterial(), standing = new THREE.PlaneGeometry(1, 1); standing.translate(0, .5, 0);
  const flames = [[-.7, .1], [0, .35], [.7, 0]].map(([x, z], index) => {
    const flame = new THREE.Mesh(standing, flameMaterial); flame.name = 'Forge flame'; flame.position.set(x, FORGE.pit.y - .1, z); flame.renderOrder = 3; flame.frustumCulled = false; flame.visible = false;
    flame.onBeforeRender = () => { flameMaterial.uniforms.uSeed.value = .19 + index * .41; flameMaterial.uniformsNeedUpdate = true; };
    group.add(flame); return flame;
  });
  const glowMaterial = createGroundGlowMaterial(), glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial);
  glow.name = 'Firelight at the forge mouth'; glow.rotation.x = -Math.PI / 2; glow.position.set(0, local(0, 3.2) + .08, 3.2); glow.renderOrder = 1; glow.visible = false; group.add(glow);
  const sparks = createSparks(36); sparks.name = 'Sparks from the forge'; sparks.visible = false; group.add(sparks);
  const smoke = createSmokeColumn({height: 30, foot: .55, top: 8, strength: 0}); smoke.name = 'Forge chimney smoke';
  smoke.position.set(FORGE.chimney.x, FORGE.chimney.y, FORGE.chimney.z); smoke.visible = false; group.add(smoke);

  // What the crane is doing. `bearing` is the arm's turn (0 points south, along +z), `reach` the trolley's distance from the
  // tower, `length` the line paid out. While it only watches a car it moves at a rate. Once the pot is handed over its work is
  // set by the clock alone (FORGE.times, seconds after the hand-over), so the ember lands in the hearth at the same moment
  // wherever the car stopped, and the job can time its own ending and its sound to that moment.
  const park = {bearing: pitBearing + .9, reach: 7};
  let bearing = park.bearing, reach = park.reach, length = lengthUp, last = null, car = null, job = null, lit = null, grade = null, tip = 0;
  const place = () => {
    arm.rotation.y = bearing; trolley.position.z = reach;
    for (const line of lines) line.scale.y = length;
    hook.position.y = -length;
  };
  place();
  const from = (x, z) => { const dx = x - plan.tower.x, dz = z - plan.tower.z; return {bearing: Math.atan2(dx, dz), reach: Math.max(2.6, Math.min(FORGE.jib - .3, Math.hypot(dx, dz)))}; };
  const watchStep = dt => {
    const near = car && Math.hypot(car.x - plan.tower.x, car.z - plan.tower.z) < 70, target = near ? from(car.x, car.z) : park;
    bearing = turn(bearing, target.bearing, .8 * dt); reach = toward(reach, target.reach, 6 * dt); length = toward(length, lengthUp, 5 * dt);
  };
  const T = FORGE.times, carried = lengthUp - .7;
  const span = (tau, start, end) => { const k = Math.max(0, Math.min(1, (tau - start) / (end - start))); return k * k * (3 - 2 * k); };
  const gap = (a, b) => turn(a, b, Math.PI * 2) - a;
  const phaseAt = tau => tau < T.reach ? 'reach' : tau < T.take ? 'lower' : tau < T.lift ? 'lift' : tau < T.carry ? 'carry' : tau < T.set ? 'set' : tau < T.right ? 'pour' : 'rest';
  // The crane's whole pose `tau` seconds after the hand-over.
  const work = tau => {
    const reached = span(tau, 0, T.reach), over = span(tau, T.lift, T.carry);
    bearing = tau < T.lift ? job.start.bearing + gap(job.start.bearing, job.bearing) * reached : job.bearing + gap(job.bearing, pitBearing) * over;
    reach = tau < T.lift ? job.start.reach + (job.reach - job.start.reach) * reached : job.reach + (pitReach - job.reach) * over;
    length = tau < T.reach ? job.start.length + (lengthUp - job.start.length) * reached
      : tau < T.take ? lengthUp + (job.length - lengthUp) * span(tau, T.reach, T.lower)
      : tau < T.carry ? job.length + (carried - job.length) * span(tau, T.take, T.lift)
      : tau < T.righted ? carried + (lengthAtPit - carried) * span(tau, T.carry, T.set)
      : lengthAtPit - 2.2 * span(tau, T.righted, T.away);
    tip = tau < T.right ? span(tau, T.set, T.poured) : 1 - span(tau, T.right, T.righted);
    // The hook has the pot from the moment it reaches it; the ember lands at T.lit.
    if (tau >= T.lower && pot.parent !== hook) { hook.add(pot); pot.position.set(0, -FORGE.potBelowHook, 0); }
    if (tau >= T.lit && lit == null) lit = job.at + T.lit;
  };

  return {
    group, plan,
    // Where the player's car is, in the land's metres, or nothing when there is no car to watch.
    watch(x, z) { car = Number.isFinite(x) && Number.isFinite(z) ? {x, z} : null; },
    // The pot is handed over: `at` is where it stands on the car (the land's metres, y the height of its foot), `gradeName`
    // one of bright, alive, barely, `ember` its share of a full pot (0 to 1), and `now` the scene's clock at that moment.
    deliver(at, gradeName, ember = 1, now = null) {
      if (job) return;
      job = {...from(at.x, at.z), length: lineTop - FORGE.potBelowHook - (at.y - base), ember: Math.max(0, Math.min(1, ember)),
        start: {bearing, reach, length}, at: Number.isFinite(now) ? now : last};
      grade = FIRE[gradeName] ? gradeName : 'alive';
      // The pot stands where it stood on the car until the hook has it.
      group.add(pot); pot.position.set(at.x - plan.hearth.x, at.y - base, at.z - plan.hearth.z); pot.rotation.set(0, 0, 0); pot.visible = true;
    },
    reset() { job = null; lit = null; grade = null; tip = 0; group.add(pot); pot.visible = false; pot.rotation.set(0, 0, 0); },
    pot, flame: flames[1],
    get phase() { return !job ? 'watch' : phaseAt((last ?? job.at ?? 0) - (job.at ?? 0)); },
    get litAt() { return lit; },
    // `seconds` is the scene's clock. While the crane watches, a long gap between two calls is worked through in short steps
    // (at most ten seconds of it), so the arm never jumps.
    animate(seconds) {
      if (job) { job.at ??= seconds; work(seconds - job.at); }
      else {
        const owed = last == null ? 0 : Math.min(10, Math.max(0, seconds - last));
        for (let done = 0; owed - done > 1e-6;) { const dt = Math.min(.05, owed - done); done += dt; watchStep(dt); }
      }
      last = seconds;
      const phase = this.phase;
      place();
      // The hook swings a little while the arm or the trolley is moving, and settles when they stop.
      const onHook = pot.parent === hook, moving = phase === 'carry' || phase === 'reach' || (phase === 'watch' && car) ? 1 : .25;
      hang.rotation.x = Math.sin(seconds * 2.3) * .035 * moving; hang.rotation.z = Math.sin(seconds * 1.9 + 1.1) * .03 * moving;
      // The pot tips toward the hearth's back wall to pour; the arm's own turn is taken out so that it pours the same way from any side.
      if (pot.visible) {
        pot.rotation.set(0, 0, 0);
        if (onHook) { pot.rotation.y = -bearing; pot.rotateX(-tip * 1.9); }
        pot.userData.update(seconds, lit == null ? job.ember : Math.max(0, job.ember * (1 - (seconds - lit) / .5)));
      }
      // The fire grows from the moment the ember lands, as fast and as tall as the ember was good.
      const fire = lit == null ? null : FIRE[grade], grown = fire ? Math.min(1, (seconds - lit) / fire.seconds) : 0, eased = grown * grown * (3 - 2 * grown);
      coalMaterial.uniforms.uTime.value = seconds; coalMaterial.uniforms.uHeat.value = fire ? Math.min(1, .25 + .75 * eased) * (.45 + .55 * fire.size) : 0;
      flameMaterial.uniforms.uTime.value = seconds; glowMaterial.uniforms.uTime.value = seconds;
      flames.forEach((flame, index) => {
        flame.visible = !!fire && eased > (index === 1 ? .02 : .3 + .1 * index) * (fire.size < .5 ? 1.6 : 1);
        if (!flame.visible) return;
        const lick = .82 + .26 * Math.abs(Math.sin(seconds * 5.1 + index * 2.3));
        flame.scale.set((1.5 + .9 * fire.size) * (.5 + .5 * eased), fire.tall * eased * lick * (index === 1 ? 1 : .72), 1);
      });
      glow.visible = !!fire; if (fire) glow.scale.setScalar((5 + 9 * fire.size) * (.3 + .7 * eased));
      // Sparks fly when the ember lands, and keep flying from a fire that burns bright.
      const burst = lit != null && seconds - lit < 1.4;
      sparks.visible = burst || (grade === 'bright' && eased > .5);
      if (sparks.visible) { sparks.geometry.setDrawRange(0, burst ? 36 : 14); sparks.userData.place(seconds, {x: FORGE.pit.x, y: FORGE.pit.y + .3, z: FORGE.pit.z}, {x: 0, z: 1}, 0); }
      smoke.visible = !!fire && eased > .05;
      if (smoke.visible) { smoke.material.uniforms.uStrength.value = eased * (.45 + .55 * fire.size); smoke.userData.update(seconds); }
    },
    dispose() {
      const geometries = new Set(), materials = new Set();
      group.traverse(node => { if (node.geometry) geometries.add(node.geometry); for (const material of [].concat(node.material || [])) materials.add(material); });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) { material.map?.dispose?.(); material.dispose(); }
    },
  };
}
