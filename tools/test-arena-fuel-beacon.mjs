import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {FUEL_RULES} from '../src/arena/modes/fuel-run.js';
import {createFuelRunView} from '../src/arena/modes/fuel-run-view.js';
import {arenaHud} from '../src/screen-arena.js';
import {fuelArrowPresentation} from '../src/combat-hud.js';

// SCRAPDOME-TANKER-FIX: Kyle could not tell which delivery pad was his.
let checks = 0;
const eq = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
after(() => console.log('Fuel beacon: ' + checks + ' acceptance checks reached.'));

function start() {
  const duel = new Duel({seed: 1989, featureFlags: {'hidden-road': true, 'fuel-run': true}});
  duel.state.wastelandGateDiscovered = true;
  eq(duel.startArenaEvent({mode: 'fuel-run', car: 'falcone_f42', seed: 1989,
    opponents: [{car: 'dusthawk_rally'}, {car: 'aurora_gt'}, {car: 'stuttgart_959s'}]}), true, 'Fuel Run starts');
  duel.state.status = 'racing'; duel.state.countdown = 0;
  return duel;
}
function hsl(hex) {
  const color = new THREE.Color(hex), out = {};
  color.getHSL(out, THREE.SRGBColorSpace); return out;
}
function withCanvasStub(run) {
  const prior = globalThis.document;
  globalThis.document = {createElement: () => ({getContext: () => ({fillRect() {}, strokeRect() {}, fillText() {}})})};
  try { return run(); } finally { globalThis.document = prior; }
}

test('the four depot colours are saturated and far apart, with plain names', () => {
  eq(FUEL_RULES.colors.length, 4, 'one colour per car');
  eq(FUEL_RULES.colorNames.length, 4, 'one name per colour');
  for (const color of FUEL_RULES.colors) ok(hsl(color).s >= .95 && hsl(color).l >= .49 && hsl(color).l <= .6, `${color} is fully saturated and bright`);
  const hues = FUEL_RULES.colors.map(color => hsl(color).h * 360).sort((a, b) => a - b);
  for (let i = 0; i < hues.length; i++) {
    const gap = (hues[(i + 1) % hues.length] - hues[i] + 360) % 360;
    ok(gap >= 60, `neighbouring depot hues are ${gap.toFixed(0)} degrees apart`);
  }
  const duel = start(), depots = duel.state.arena.fuelRun.depots;
  eq(depots.map(depot => depot.colorName), [...FUEL_RULES.colorNames], 'depots carry their colour names');
  eq(depots[0].participantId, 'player', 'the player always owns the first colour');
});

const additive = holder => holder.children.filter(mesh => mesh.material?.blending === THREE.AdditiveBlending);
const shown = mesh => mesh.visible && mesh.material.visible !== false;

test('only one tall column matters at a time', () => {
  const duel = start(), state = duel.state, fuel = state.arena.fuelRun;
  withCanvasStub(() => {
    const view = createFuelRunView(duel), mesh = new THREE.Object3D();
    try {
      const pads = view.group.children.find(group => group.type === 'Group');
      const padHolders = pads.children.slice(0, 4), depots = pads.children.slice(4);
      const own = additive(depots[0]);
      const height = list => Math.max(...list.map(item => item.position.y + item.geometry.parameters.height / 2));
      ok(height(own) >= 50, `the player's depot column is ${height(own)} m tall`);
      for (const holder of depots.slice(1)) eq(additive(holder).length, 0, 'a rival depot never has a column');
      mesh.position.set(1000, 0, 1000); mesh.updateMatrixWorld(true);
      view.update(state, duel.course, [{id: 'player', mesh}]);
      eq(own.map(shown), own.map(() => false), 'not carrying: the own depot column is hidden');
      eq(padHolders.map(holder => shown(additive(holder)[0])), [true, true, true, true], 'not carrying: every loaded pad shows a warm white column');
      eq(additive(padHolders[0])[0].material.color.getHexString(), 'ffe3a3', 'pad columns are warm white');
      const canister = fuel.canisters[0];
      canister.carriedBy = 'player'; state.arena.participants[0].fuelCanisterId = canister.id;
      view.update(state, duel.course, [{id: 'player', mesh}]);
      eq(own.map(shown), own.map(() => true), 'carrying: the own depot column shows');
      eq(own[0].material.color.getHexString(), new THREE.Color(fuel.depots[0].color).getHexString(), 'in the depot colour');
      eq(padHolders.map(holder => shown(additive(holder)[0])), [false, false, false, false], 'carrying: pad columns are hidden');
      for (const holder of depots.slice(1)) eq(additive(holder).length, 0, 'carrying: rivals still show no column');
      fuel.pads[0].canisterId = null; canister.carriedBy = null; state.arena.participants[0].fuelCanisterId = null;
      view.update(state, duel.course, [{id: 'player', mesh}]);
      eq(shown(additive(padHolders[0])[0]), false, 'a pad with no fuel shows no column');
    } finally { view.dispose(); }
  });
});

test('a column brightens when the player is within 40 m', () => {
  const duel = start(), state = duel.state, fuel = state.arena.fuelRun;
  withCanvasStub(() => {
    const view = createFuelRunView(duel), mesh = new THREE.Object3D();
    try {
      const pads = view.group.children.find(group => group.type === 'Group');
      const beam = additive(pads.children[0])[0];
      const pad = duel.course.groundAt(fuel.pads[0].s, fuel.pads[0].lateral);
      mesh.position.set(pad.x + 120, 0, pad.z); mesh.updateMatrixWorld(true);
      view.update(state, duel.course, [{id: 'player', mesh}]);
      const far = beam.material.opacity;
      mesh.position.set(pad.x + 30, 0, pad.z); mesh.updateMatrixWorld(true);
      view.update(state, duel.course, [{id: 'player', mesh}]);
      ok(beam.material.opacity > far * 1.1, `near ${beam.material.opacity.toFixed(3)} vs far ${far.toFixed(3)}`);
    } finally { view.dispose(); }
  });
});

test('the screen arrow shows only when carrying and points at the player depot', () => {
  const duel = start(), state = duel.state, fuel = state.arena.fuelRun, course = duel.course;
  eq(fuelArrowPresentation(course, state), null, 'no arrow without fuel');
  state.arena.participants[0].fuelCanisterId = fuel.canisters[0].id;
  const depot = course.worldAt(fuel.depots[0].s, fuel.depots[0].lateral);
  const pose = {s: (fuel.depots[0].s + 100) % course.length, lateral: 0};
  Object.assign(state, pose);
  const here = course.worldAt(pose.s, pose.lateral);
  const bearing = Math.atan2(depot.x - here.x, depot.z - here.z), base = course.at(pose.s).heading;
  const angleFor = facing => { state.headingError = facing - base; return fuelArrowPresentation(course, state); };
  const ahead = angleFor(bearing);
  eq(ahead.angle, 0, 'facing the depot: the arrow points up');
  eq(angleFor(bearing - Math.PI / 2).angle, 90, 'depot on the right: the arrow points right');
  eq(angleFor(bearing + Math.PI / 2).angle, -90, 'depot on the left: the arrow points left');
  eq(Math.abs(angleFor(bearing + Math.PI).angle), 180, 'depot behind: the arrow points down');
  eq([ahead.color, ahead.text.startsWith('CYAN DEPOT')], [FUEL_RULES.colors[0], true], 'depot colour and name');
});

test('the HUD names the player colour and says where to take the fuel', () => {
  const duel = start(), hud = arenaHud(duel.state);
  eq([hud.fuelColor, hud.fuelColorName], [FUEL_RULES.colors[0], 'CYAN'], 'the HUD reports the player depot colour');
  ok(/FIND FUEL/.test(hud.scoreText), 'looking for fuel reads plainly');
  duel.state.arena.participants[0].fuelCanisterId = 'fuel-1';
  ok(/TAKE IT TO THE CYAN DEPOT/.test(arenaHud(duel.state).scoreText), 'carrying fuel names the depot colour');
});
