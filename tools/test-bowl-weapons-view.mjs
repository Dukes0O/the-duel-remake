// BOWL-WEAPONS-LOOK: the drawn weapons, bolt-ons and damage read the weapon rules' state and never write it, and each
// truck's weapon is built once for a fight. The race state is handed to the view through a proxy that refuses every
// write, while the real rules (src/bowl/bowl-weapons.js) run Last Truck Rolling underneath.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {bowlHealthLoss, chooseShowWeapon, stepShowWeapons} from '../src/bowl/bowl-weapons.js';
import {createBowlWeaponsView, hammerAngle, launcherPose, RIVAL_LOOKS, truckLook, WEAPON_LOOK, WEAPON_PICTURES} from '../src/bowl/bowl-weapons-view.js';

const dt = 1 / 60;
const kept = value => value instanceof Map || value instanceof Set || ArrayBuffer.isView(value) || typeof value === 'function';
function readOnly(target, path = 'state', seen = new WeakMap()) {
  if (!target || typeof target !== 'object' || kept(target)) return target;
  if (seen.has(target)) return seen.get(target);
  const proxy = new Proxy(target, {
    get: (object, key) => readOnly(Reflect.get(object, key), `${path}.${String(key)}`, seen),
    set: (_object, key) => { throw Error(`the view wrote ${path}.${String(key)}`); },
    defineProperty: (_object, key) => { throw Error(`the view defined ${path}.${String(key)}`); },
    deleteProperty: (_object, key) => { throw Error(`the view deleted ${path}.${String(key)}`); },
  });
  seen.set(target, proxy);
  return proxy;
}
function truckModel() {
  const mesh = new THREE.Group(), paint = new THREE.MeshStandardMaterial({color: 0x9bb9ba});
  mesh.userData.paint = paint; mesh.userData.originalColor = paint.color.clone();
  return mesh;
}
function fight(kind, night = 5) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  assert.ok(duel.startBowlNight({night, eventIndex: 2, cpuDifficulty: 'easy', seed: 1989}));
  assert.ok(chooseShowWeapon(duel, kind));
  while (duel.state.status === 'countdown') duel.step(dt);
  duel.state.invulnerableSec = 0;
  duel.state.arena.participants.forEach(p => { p.protectedSec = 0; });
  return duel;
}
function place(duel, actor, s, lateral) {
  const y = duel.course.groundAt(s, lateral).y;
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral, headingError: 0, speedMph: 0, pushVelocity: 0,
    _jumpY: y, airHeight: 0, airborne: false, groundHeight: y, prevGroundHeight: y, _verticalSpeed: 0});
}
const named = (root, name) => { let found = null; root.traverse(node => { if (!found && node.name.startsWith(name)) found = node; }); return found; };

// The poses follow the rules' clock alone.
{
  const memory = {}, look = WEAPON_LOOK.hammer;
  assert.equal(hammerAngle({kind: 'hammer', phase: 'ready', time: 0}, memory), look.rest);
  assert.ok(Math.abs(hammerAngle({kind: 'hammer', phase: 'tell', time: 0}, {tellTotal: .4}) - look.raised) < 1e-9, 'the tell ends with the arm raised');
  const miss = {lastPhase: 'tell'};
  assert.ok(Math.abs(hammerAngle({kind: 'hammer', phase: 'rest', time: 2.5 - look.slam}, miss, .5) - look.miss) < 1e-9, 'a miss ends in the dirt');
  const hit = {lastPhase: 'tell'};
  assert.ok(Math.abs(hammerAngle({kind: 'hammer', phase: 'rest', time: 2.5 - look.slam}, hit, 0) - look.hit) < 1e-9, 'a hit ends on a truck');
  assert.equal(launcherPose({kind: 'launcher', phase: 'ready'}).fill, 1);
  assert.ok(Math.abs(launcherPose({kind: 'launcher', phase: 'rest', time: 4 - WEAPON_LOOK.launcher.snap}).angle - WEAPON_LOOK.launcher.up) < 1e-9, 'the plate snaps up');
  assert.ok(launcherPose({kind: 'launcher', phase: 'rest', time: 2}).fill > .4 && launcherPose({kind: 'launcher', phase: 'rest', time: 2}).fill < .6, 'the gauge refills over the rest');
  for (const id of Object.keys(RIVAL_LOOKS)) {
    assert.ok(RIVAL_LOOKS[id].body.length, `${id} has a body of its own`);
    assert.equal(truckLook({bowlRival: id}, false, false).weapon, null, 'no rival carries a weapon outside a fight');
  }
  for (const kind of ['hammer', 'saw', 'launcher']) assert.match(WEAPON_PICTURES[kind], /^<svg/);
}

// A fight with each weapon: the view is drawn every frame through the read-only state while the rules run.
const parts = {hammer: 'Hammer arm', saw: 'Saw disc', launcher: 'Launcher plate'};
const rivalParts = {'big-kettle': ['Kettle boiler', 'Hammer arm'], 'tin-lizard': ['Lizard tail', 'Saw disc'],
  'old-bess': ['Bess spare', 'Launcher plate'], 'rust-rhino': ['Rhino horn'], 'dragon-wagon': ['Dragon snout', 'Dragon breath']};
for (const kind of ['hammer', 'saw', 'launcher']) {
  const duel = fight(kind), s = duel.state, view = createBowlWeaponsView();
  const meshes = [s, ...s.opponents].map(truckModel);
  let now = 0;
  const draw = () => { now += dt * 1000; view.update(readOnly(s), meshes, now, true); };
  const [target, ...others] = s.opponents;
  place(duel, s, 33, 0); place(duel, target, 33 + 5.2 + (kind === 'saw' ? 1 : kind === 'hammer' ? 2 : 1.5), 0);
  others.forEach((actor, i) => place(duel, actor, 100 + 12 * i, 0));
  draw();
  const rig = view.rigs.get(meshes[0]), moving = named(rig.root, parts[kind]);
  assert.ok(moving, `the show truck carries the ${kind}`);
  const before = moving.rotation.x;
  let moved = false, spun = 0, glowed = 0, sparks = false;
  s.input.interact = true;
  // The weapon alone, with the trucks where they were put, as tools/test-bowl-weapons.mjs drives it.
  for (let i = 0; i < 60 * 6; i++) {
    stepShowWeapons(duel, s.bowlNight, dt); draw();
    if (Math.abs(moving.rotation.x - before) > .1) moved = true;
    if (kind === 'saw') { spun = Math.max(spun, rig.memory.spin); glowed = Math.max(glowed, rig.memory.heat);
      sparks ||= view.group.children.some(node => node.name === 'Saw sparks' && node.visible); }
  }
  assert.ok(moved, `the ${kind} moves with the rule's state`);
  // Then the whole fight for eight seconds, the rivals driving and using their own weapons.
  s.input.interact = false;
  for (let i = 0; i < 60 * 8; i++) { s.input.interact = i % 90 < 40; duel.step(dt); draw(); }
  if (kind === 'saw') { assert.ok(spun > .9, 'the disc spins while F is held'); assert.ok(glowed > .9, 'the disc glows when it must cool'); assert.ok(sparks, 'the disc throws sparks where it cuts'); }
  assert.equal(view.group.userData.builds, 4, 'each truck is built once for the fight');
  for (const actor of s.opponents) {
    const root = view.rigs.get(meshes[s.opponents.indexOf(actor) + 1]).root;
    for (const name of rivalParts[actor.bowlRival]) assert.ok(named(root, name), `${actor.bowlRival} carries ${name}`);
    assert.equal(meshes[s.opponents.indexOf(actor) + 1].userData.paint.color.getHex(), RIVAL_LOOKS[actor.bowlRival].paint, `${actor.bowlRival} wears its paint`);
  }
  // The damage: a loose panel at three fifths, smoke at one fifth, fire at nothing.
  const victim = s.opponents[2], victimRig = view.rigs.get(meshes[3]);
  bowlHealthLoss(duel, victim, 1 - .6 - (1 - victim.armor / victim.maxArmor), 'player', 'left');
  draw(); assert.ok(victimRig.panel.visible, 'a panel hangs loose at three fifths');
  const puffs = () => view.group.children[0].children.filter(node => node.visible).length;
  bowlHealthLoss(duel, victim, .45, 'player', 'left');
  for (let i = 0; i < 60; i++) draw();
  assert.ok(victimRig.memory.smoking && puffs() > 0, 'the truck smokes at one fifth');
  bowlHealthLoss(duel, victim, 1, 'player', 'left');
  draw(); assert.ok(victimRig.burning.every(tongue => tongue.visible), 'the truck burns at nothing');
  assert.equal(view.group.userData.builds, 4, 'damage builds nothing new');
  // Leaving the Bowl hides everything; the view's dispose leaves nothing behind.
  view.update(readOnly(s), meshes, now + 16, false);
  assert.equal(view.group.visible, false);
  view.dispose();
}
console.log('Bowl weapons view: the hammer, saw and launcher, five rivals and the damage read the rules without writing them.');
