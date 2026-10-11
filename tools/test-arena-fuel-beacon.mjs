import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {FUEL_RULES} from '../src/arena/modes/fuel-run.js';
import {createFuelRunView} from '../src/arena/modes/fuel-run-view.js';
import {arenaHud} from '../src/screen-arena.js';

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

test('only the player depot gets a tall light column; rivals get a short one', () => {
  const duel = start();
  withCanvasStub(() => {
    const view = createFuelRunView(duel);
    try {
      const pads = view.group.children.find(group => group.type === 'Group');
      const columns = holder => holder.children.filter(mesh => mesh.material?.blending === THREE.AdditiveBlending);
      const height = holder => Math.max(...columns(holder).map(mesh => mesh.position.y + mesh.geometry.parameters.height / 2));
      const depots = pads.children.slice(4);
      ok(height(depots[0]) >= 50, `the player's column is ${height(depots[0])} m tall`);
      for (const holder of depots.slice(1)) ok(height(holder) <= 14, `a rival's column is ${height(holder)} m tall`);
      for (const holder of pads.children.slice(0, 4)) ok(height(holder) <= 10, 'a fuel pad has only a short pale column');
      const padBeams = pads.children.slice(0, 4).map(holder => columns(holder)[0]);
      eq(padBeams.map(beam => beam.visible), [true, true, true, true], 'every loaded pad shows its column');
    } finally { view.dispose(); }
  });
});

test('the arrow shows only while carrying fuel far from the depot, and points at it', () => {
  const duel = start(), state = duel.state, fuel = state.arena.fuelRun;
  withCanvasStub(() => {
    const view = createFuelRunView(duel), mesh = new THREE.Object3D();
    try {
      const arrow = view.group.getObjectByName('Depot arrow');
      view.update(state, duel.course, [{id: 'player', mesh}]);
      eq(arrow.visible, false, 'no arrow without cargo');
      const canister = fuel.canisters[0];
      canister.carriedBy = 'player'; state.arena.participants[0].fuelCanisterId = canister.id;
      const depot = duel.course.groundAt(fuel.depots[0].s, fuel.depots[0].lateral);
      mesh.position.set(depot.x + 40, 0, depot.z - 10); mesh.updateMatrixWorld(true);
      view.update(state, duel.course, [{id: 'player', mesh}]);
      eq(arrow.visible, true, 'the arrow shows when carrying fuel far from the depot');
      const forward = new THREE.Vector3(0, 0, 1).applyEuler(arrow.rotation);
      const want = new THREE.Vector3(depot.x - arrow.position.x, 0, depot.z - arrow.position.z).normalize();
      ok(forward.dot(want) > .999, 'the arrow points at the player depot');
      eq(arrow.material.color.getHexString(), new THREE.Color(fuel.depots[0].color).getHexString(), 'the arrow takes the depot colour');
      mesh.position.set(depot.x + 3, 0, depot.z); mesh.updateMatrixWorld(true);
      view.update(state, duel.course, [{id: 'player', mesh}]);
      eq(arrow.visible, false, 'the arrow hides once the depot is close');
    } finally { view.dispose(); }
  });
});

test('the HUD names the player colour and says where to take the fuel', () => {
  const duel = start(), hud = arenaHud(duel.state);
  eq([hud.fuelColor, hud.fuelColorName], [FUEL_RULES.colors[0], 'CYAN'], 'the HUD reports the player depot colour');
  ok(/FIND FUEL/.test(hud.scoreText), 'looking for fuel reads plainly');
  duel.state.arena.participants[0].fuelCanisterId = 'fuel-1';
  ok(/TAKE IT TO THE CYAN DEPOT/.test(arenaHud(duel.state).scoreText), 'carrying fuel names the depot colour');
});

test('the player column fades up close and an emptied pad drops its column', () => {
  const duel = start(), state = duel.state, fuel = state.arena.fuelRun;
  withCanvasStub(() => {
    const view = createFuelRunView(duel), mesh = new THREE.Object3D();
    try {
      const pads = view.group.children.find(group => group.type === 'Group');
      const own = pads.children[4].children.filter(item => item.material?.blending === THREE.AdditiveBlending);
      const depot = duel.course.groundAt(fuel.depots[0].s, fuel.depots[0].lateral);
      mesh.position.set(depot.x, 0, depot.z); mesh.updateMatrixWorld(true);
      view.update(state, duel.course, [{id: 'player', mesh}]);
      const close = own[0].material.opacity;
      mesh.position.set(depot.x + 60, 0, depot.z); mesh.updateMatrixWorld(true);
      view.update(state, duel.course, [{id: 'player', mesh}]);
      ok(own[0].material.opacity > close * 4, 'the column is much fainter when the car sits in its own depot');
      fuel.pads[0].canisterId = null;
      view.update(state, duel.course, [{id: 'player', mesh}]);
      eq(pads.children[0].children.find(item => item.material?.blending === THREE.AdditiveBlending).visible, false,
        'a pad with no fuel hides its column');
    } finally { view.dispose(); }
  });
});
