import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {damageFighter} from '../src/onfoot.js';
import {resetFootWeaponUser} from '../src/onfoot-weapons.js';
import {combatResultSnapshot} from '../src/combat-scoring.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';

const STEP = 1 / 120;
const ticks = (duel, count) => {for (let index = 0; index < count; index++) duel.step(STEP);};

function race({mode = 'wasteland', enabled = true, opponents = 1} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: enabled},
    destructiblesEnabled: false});
  duel.startCampaign({mode, car: 'falcone_f42', startStage: 0, seed: 1989,
    opponentCount: opponents});
  const state = duel.state;
  Object.assign(state, {status: 'racing', countdown: 0,
    s: 500, prevS: 500, lateral: 0, prevLateral: 0, speedMph: 0,
    traffic: []});
  if (state.combat) {
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
  }
  duel._rival = () => {};
  duel._traffic = () => {};
  return duel;
}

function leaveCar(duel) {
  duel.setInput({interact: true});
  ticks(duel, 48);
  assert.equal(duel.state.onFoot, true);
  duel.setInput({interact: false});
  ticks(duel, 1);
}

function aimAt(duel, actor) {
  const fighter = duel.state.fighter;
  const at = duel.course.groundAt(actor.s, actor.lateral);
  fighter.yaw = Math.atan2(at.x - fighter.x, at.z - fighter.z);
  fighter.pitch = Math.atan2(at.y + 1 - fighter.y - 1.62,
    Math.hypot(at.x - fighter.x, at.z - fighter.z));
}

test('gear is flagged and stage scoped; car weapons cannot fire while walking', () => {
  const duel = race(), state = duel.state;
  assert.deepEqual(state.footGear, {name: 'LONGHORN RPG', ammo: 3});
  assert.equal(state.footWeapons.ammo, 3);
  assert.equal(duel.selectFootGear(2), false, 'car controls cannot change foot gear');
  leaveCar(duel);
  assert.equal(duel.fireWeapon('crossbow'), false);
  assert.equal(duel.selectFootGear(3), false, 'signature slot is reserved');
  assert.equal(duel.selectFootGear(2), true);
  assert.deepEqual(state.footGear, {name: 'WRENCH', ammo: null});
  assert.equal(duel.selectFootGear(1), true);
  const ordinary = race({mode: 'duel'});
  assert.equal(ordinary.state.footWeapons, undefined);
  const flagOff = race({enabled: false});
  assert.equal(flagOff.state.footGear, undefined);
});

test('RPG locks after 0.8 s, fires three 55 m/s rockets with a 2.2 s reload', () => {
  const duel = race(), state = duel.state;
  const target = state.rival;
  target.s = state.s + 65;
  target.lateral = 3;
  leaveCar(duel);
  aimAt(duel, target);
  duel.setFighterInput({aim: true});
  ticks(duel, 95);
  assert.ok(state.footWeapons.lockSeconds < .8);
  ticks(duel, 1);
  assert.equal(state.footWeapons.lockTargetIndex, 0);
  assert.ok(state.footWeapons.lockSeconds >= .8 - 1e-8);
  duel.setFighterInput({fire: true});
  ticks(duel, 1);
  assert.equal(state.footWeapons.ammo, 2);
  assert.equal(state.footGear.ammo, 2);
  const rocket = state.combat.projectiles.find(item => item.kind === 'rpg');
  assert.ok(rocket);
  assert.equal(rocket.targetIndex, 0);
  assert.ok(Math.abs(Math.hypot(rocket.vx, rocket.vy, rocket.vz) - 55) < .01);
  ticks(duel, 1);
  assert.equal(state.footWeapons.ammo, 2, 'holding fire does not spend another rocket');
  duel.setFighterInput({fire: false});
  ticks(duel, 1);
  duel.setFighterInput({fire: true});
  ticks(duel, 1);
  assert.equal(state.footWeapons.ammo, 2, 'reload gates a second trigger pull');
  duel.setFighterInput({fire: false, aim: false});
  ticks(duel, 264);
  duel.setFighterInput({fire: true});
  ticks(duel, 1);
  assert.equal(state.footWeapons.ammo, 1);
  duel.setFighterInput({fire: false});
  ticks(duel, 264);
  duel.setFighterInput({fire: true});
  ticks(duel, 1);
  assert.equal(state.footWeapons.ammo, 0);
  assert.equal(COMBAT_TUNING.foot.rpgReloadSeconds, 2.2);
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed: 1989});
  assert.equal(duel.state.footWeapons.ammo, 3, 'a fresh stage stocks three rockets');
});

test('swept RPG direct and splash damage armor once and records owned direct XP', () => {
  const duel = race({opponents: 2}), state = duel.state;
  const impactKinds = [];
  duel.onChange((_, event) => {
    if (event.audioWeapon === 'rpg') impactKinds.push(event.audioImpact);
  });
  const [target, neighbor] = state.opponents;
  target.s = state.s + 55;
  target.lateral = 3;
  neighbor.s = target.s + 2;
  neighbor.lateral = target.lateral + 4;
  leaveCar(duel);
  aimAt(duel, target);
  const first = target.armor, nearby = neighbor.armor;
  duel.setFighterInput({aim: true});
  ticks(duel, 96);
  duel.setFighterInput({fire: true});
  ticks(duel, 1);
  duel.setFighterInput({fire: false});
  for (let index = 0; index < 240 && target.armor === first; index++) ticks(duel, 1);
  assert.equal(first - target.armor, 35);
  assert.equal(nearby - neighbor.armor, 20);
  const events = combatResultSnapshot(duel).notorietyEvents;
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'rpgDirectHit');
  assert.deepEqual(impactKinds, ['direct'], 'the impact event selects the direct-hit sound');
  assert.equal(state.combat.scoring.hitsLanded, 2);
});

test('wrench repairs 40 over four race seconds and a hit interrupts until release', () => {
  const duel = race({opponents: 0}), state = duel.state;
  let interruptions = 0;
  duel.onChange((_, event) => {if (event.footRepairInterrupted) interruptions++;});
  state.armor = 30;
  leaveCar(duel);
  assert.equal(duel.selectFootGear(2), true);
  const raceTime = state.stageTimeSec;
  duel.setFighterInput({fire: true});
  ticks(duel, 240);
  assert.ok(Math.abs(state.armor - 50) < 1e-6);
  assert.ok(state.stageTimeSec >= raceTime + 2 - 1e-8);
  damageFighter(state.fighter, 5);
  ticks(duel, 120);
  assert.equal(interruptions, 1, 'a disrupted repair sounds once');
  assert.ok(Math.abs(state.armor - 50) < 1e-6,
    'damage interrupts repair rather than finishing it');
  duel.setFighterInput({fire: false});
  ticks(duel, 1);
  duel.setFighterInput({fire: true});
  ticks(duel, 480);
  assert.ok(Math.abs(state.armor - 90) < 1e-6);
  assert.equal(state.footWeapons.repairBlockedUntilRelease, true);
  ticks(duel, 120);
  assert.ok(Math.abs(state.armor - 90) < 1e-6,
    'holding the wrench does not start a second repair');
});

test('RPG ammo remains spent after re-entry in the same stage', () => {
  const duel = race({opponents: 0}), state = duel.state;
  leaveCar(duel);
  duel.setFighterInput({fire: true});
  ticks(duel, 1);
  assert.equal(state.footWeapons.ammo, 2);
  duel.setFighterInput({fire: false});
  duel.setInput({interact: true});
  ticks(duel, 72);
  assert.equal(state.onFoot, false);
  assert.equal(state.footWeapons.ammo, 2);
  duel.setInput({interact: false});
  ticks(duel, 1);
  duel.setInput({interact: true});
  ticks(duel, 48);
  assert.equal(state.onFoot, true);
  assert.equal(state.footGear.ammo, 2);
  resetFootWeaponUser(duel);
  assert.equal(state.footWeapons.ammo, 2);
});
