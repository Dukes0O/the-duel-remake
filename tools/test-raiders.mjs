import assert from 'node:assert/strict';
import test from 'node:test';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {supportsCombat} from '../src/combat-weapons.js';
import {stepRaiders} from '../src/raiders.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {createRaiderMarkers} from '../src/raider-markers.js';
import {createSalvageMarkers} from '../src/salvage-markers.js';
import {sweepObstacle} from '../src/collision.js';

function race(stageIndex = 0, flagged = true, seed = 1989) {
  const duel = new Duel({seed, featureFlags: {wasteland2: flagged}});
  duel.startCampaign({mode: 'wasteland', startStage: stageIndex, opponentCount: 1});
  duel.state.status = 'racing';
  duel.state.combat.pickupTimer = Infinity;
  duel.state.combat.aiTimer = Infinity;
  return duel;
}

test('all 11 combat courses get three seeded, roadside three-raider camps', () => {
  const combatStages = COURSE.map((stage, index) => ({stage, index}))
    .filter(({stage}) => supportsCombat(stage));
  assert.equal(combatStages.length, 11);
  for (const {index} of combatStages) {
    const duel = race(index), zones = duel.state.raids.zones;
    assert.equal(zones.length, 3);
    for (const zone of zones) {
      assert.equal(zone.raiders.length, 3);
      assert.ok(zone.salvage, `${duel.stageDef.id}: camp needs a salvage crate`);
      assert.equal(duel.course.surfaceAt(zone.salvage.s,
        zone.salvage.lateral).road, false);
      const ledge = duel.course.raidLedges.find(item =>
        item.id === `ledge-${zone.salvage.id}`);
      assert.ok(ledge && duel.course.obstaclesNear(ledge.s)
        .includes(ledge), 'ledge must be in the stage collision index');
      assert.ok(sweepObstacle({x: ledge.x + 4, y: ledge.y,
        z: ledge.z}, {x: ledge.x, y: ledge.y, z: ledge.z},
      ledge, 0, {halfWidth: 1, halfLength: 2, height: 1.4}),
      'car must not be able to drive through the salvage ledge');
      assert.ok(zone.s > 0 && zone.s < duel.course.length);
      assert.ok(zone.raiders.every(raider =>
        Number.isFinite(raider.x) && Number.isFinite(raider.y) &&
        Number.isFinite(raider.z) &&
        Math.abs(raider.lateral) > duel.course.roadHalfWidthAt(raider.s)));
      for (const raider of zone.raiders) {
        assert.ok(duel.course.features.obstacles.every(obstacle =>
          Math.hypot(obstacle.x - raider.x, obstacle.z - raider.z) >= 2.8),
        `${duel.stageDef.id}: raider must clear existing roadside obstacles`);
        if (duel.course.def.arena)
          assert.ok(Math.abs(raider.lateral) < 22, 'arena walls stay outside camp');
      }
    }
  }
  const first = race(), repeated = race(), changed = race(0, true, 1990);
  assert.deepEqual(first.state.raids, repeated.state.raids);
  assert.notDeepEqual(first.state.raids.zones.map(zone => zone.s),
    changed.state.raids.zones.map(zone => zone.s));
});

test('RPG direct hit drops a raider, nearby splash hurts another, and XP is once', () => {
  const duel = race(), state = duel.state, zone = state.raids.zones[0];
  state.opponents = [];
  state.speedMph = 0;
  const first = zone.raiders[0], second = zone.raiders[1];
  second.x = first.x + 2;
  second.z = first.z;
  second.y = first.y;
  function rocket(id) {
    state.combat.projectiles.push({kind: 'rpg', owner: 'player', id,
      x: first.x - 12, y: first.y + 1, z: first.z,
      launchX: first.x - 12, launchZ: first.z,
      vx: 55, vy: 0, vz: 0, age: .4, targetIndex: null});
    stepProjectiles(duel, .3);
  }
  rocket('raid-rpg-1');
  assert.equal(first.knockedDown, true);
  assert.ok(second.health < second.maxHealth, 'the neighboring raider took splash');
  assert.equal(state.combat.scoring.knockdowns, 1);
  assert.deepEqual(state.combat.notorietyEvents.filter(event =>
    event.type === 'raiderKnockdown').map(event => event.id), ['raider-0-0']);
  stepRaiders(duel, 3);
  assert.equal(first.knockedDown, false);
  second.x = first.x + 30;
  rocket('raid-rpg-2');
  assert.equal(first.knockedDown, true);
  assert.equal(state.combat.scoring.knockdowns, 1,
    'recovering the same raider cannot farm score or Notoriety');
  assert.equal(state.combat.notorietyEvents.length, 1);
});

test('ledge salvage is visible, foot-only, and collected at most once', () => {
  const duel = race(), state = duel.state, crate = state.raids.zones[0].salvage;
  const markers = createSalvageMarkers();
  markers.update(duel);
  assert.equal(markers.group.visible, true);
  assert.deepEqual(markers.meshes.map(mesh => mesh.count), [3, 3, 3]);
  state.fighter = {x: crate.x + 2.2, y: crate.y, z: crate.z,
    crewId: 'rook', knockedDown: false};
  state.armor = state.maxArmor - 20;
  state.footWeapons.ammo = 2;
  stepRaiders(duel, 1 / 120);
  assert.equal(crate.collected, false, 'fighter must actually be on foot');
  state.onFoot = true;
  stepRaiders(duel, 1 / 120);
  assert.equal(crate.collected, true);
  assert.equal(state.armor, state.maxArmor - 5);
  assert.equal(state.footWeapons.ammo, 3);
  stepRaiders(duel, 1 / 120);
  assert.equal(state.armor, state.maxArmor - 5);
  markers.update(duel);
  assert.deepEqual(markers.meshes.map(mesh => mesh.count), [2, 2, 2]);
  markers.update(race(0, false));
  assert.equal(markers.group.visible, false);
  markers.dispose();
});

test('full-resource salvage requires a discovered Wasteland career', () => {
  const duel = race(), state = duel.state, crate = state.raids.zones[0].salvage;
  state.onFoot = true;
  state.fighter = {x: crate.x, y: crate.y, z: crate.z,
    crewId: 'rook', knockedDown: false};
  state.armor = state.maxArmor;
  state.footWeapons.ammo = 3;
  stepRaiders(duel, 1 / 120);
  assert.equal(crate.collected, false, 'pre-gate pickup still needs missing resources');
  duel.startCampaign({mode: 'wasteland', discoveredGate: true});
  assert.equal(duel.state.wastelandGateDiscovered, true);
  duel.startCampaign({mode: 'wasteland', discoveredGate: false});
  assert.equal(duel.state.wastelandGateDiscovered, false,
    'a later player cannot inherit the previous gate snapshot');
  const legacy = race(0, false);
  assert.equal(legacy.state.raids, undefined,
    'flag-off play retains no Wasteland salvage crates');
});

test('flag-off and ordinary races have no raiders or route change', () => {
  const modern = race(), legacy = race(0, false);
  assert.equal(Object.hasOwn(legacy.state, 'raids'), false);
  assert.deepEqual(legacy.course.samples, modern.course.samples);
  assert.deepEqual(legacy.course.features, modern.course.features);
  const original = JSON.stringify(legacy.state.combat.projectiles);
  stepRaiders(legacy);
  assert.equal(JSON.stringify(legacy.state.combat.projectiles), original);
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'duel', startStage: 0});
  assert.equal(Object.hasOwn(duel.state, 'raids'), false);
});

test('warning precedes a bounded volley, and raider hits give no player credit', () => {
  const duel = race(), state = duel.state, zone = state.raids.zones[0];
  const hits = [], shots = [];
  duel.onChange((_, event) => {
    if (event.combatHit) hits.push(event);
    if (event.raiderShot) shots.push(event);
  });
  state.opponents = [];
  state.s = state.prevS = zone.s - 140;
  state.speedMph = 80;
  stepRaiders(duel);
  assert.equal(state.callout, 'ROADSIDE AMBUSH AHEAD');
  assert.equal(state.raids.shots, 0);
  state.s = state.prevS = zone.s;
  stepRaiders(duel);
  assert.equal(state.raids.shots, 1);
  assert.ok(shots[0] && [shots[0].hitPosition.x,shots[0].hitPosition.y,
    shots[0].hitPosition.z].every(Number.isFinite),
  'raider shot carries its sound position');
  const shot = state.combat.projectiles[0];
  assert.equal(shot.raid, true);
  assert.equal(shot.targetIndex, -1);
  assert.equal(shot.enemy, true);
  for (let tick = 0; tick < 12; tick++) {
    state.stageTimeSec += .025;
    state.prevS = state.s;
    state.s += state.speedMph * .44704 * .025;
    stepProjectiles(duel, .025);
  }
  assert.ok(state.armor < state.maxArmor, 'moving car takes the aimed shot');
  assert.equal(hits[0]?.owner, 'raider');
  assert.equal(hits[0]?.raidZone, zone.id);
  assert.equal(state.combat.scoring.hitsLanded, 0);
  state.s = state.prevS = zone.s;
  for (let tick = 0; tick < 12; tick++) {
    state.stageTimeSec += .8;
    stepRaiders(duel);
  }
  assert.equal(state.raids.shots, 3, 'each raider fires once per lap');
  state.currentLap = 2;
  state.stageTimeSec += .8;
  stepRaiders(duel);
  assert.equal(state.raids.shots, 4, 'second lap refreshes the camp');
});

test('raiders can aim at a passing opponent and pooled warnings stay hidden flag-off', () => {
  const duel = race(), state = duel.state, zone = state.raids.zones[0];
  state.s = 0;
  state.speedMph = 0;
  state.opponents[0].s = zone.s;
  state.opponents[0].speedMph = 65;
  stepRaiders(duel);
  assert.equal(state.combat.projectiles[0].targetIndex, 0);
  const markers = createRaiderMarkers();
  markers.update(duel);
  assert.equal(markers.group.visible, true);
  assert.equal(markers.drawCallBudget, 4);
  assert.deepEqual(markers.meshes.map(mesh => mesh.count), [3, 3, 6, 6]);
  markers.update(race(0, false));
  assert.equal(markers.group.visible, false);
  markers.dispose();
});
