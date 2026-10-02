import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {carBodyPoint} from '../src/arsenal/hazards.js';
import {initializeCrewGear, refillCrewGear, selectSignatureGear,
  stepSignatureGear, stepGearDeployables, damageGearTurret} from '../src/crew-gear/signature.js';
import {launchGearProjectile, stepGearProjectile} from '../src/crew-gear/projectiles.js';
import {signatureFor} from '../src/crew-gear/gear.js';

// Bounded regression checks for the owned production modules, not native
// CREW-02 wiring acceptance. Only the missing catalog entry is adapted here.
// The separate test-crew-gear.mjs uses unmodified native App entrypoints.
const DT = 1 / 120, EPS = 1e-6, failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try {run();} catch (error) {failures.push(`${name}: ${error.message}`);}
}
function placeCar(car, s, lateral = 0) {
  Object.assign(car, {s, prevS: s, lateral, prevLateral: lateral, speedMph: 0,
    headingError: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0,
    combatShield: 0, airHeight: 0, prevAirHeight: 0, contactCooldown: 0});
}
function ticks(duel, count) {for (let i = 0; i < count; i++) duel.step(DT);}
function leave(duel) {
  duel.setInput({interact: true}); ticks(duel, 48);
  assert.equal(duel.state.onFoot, true, 'actual 0.4 s F hold creates a fighter');
  duel.setInput({interact: false}); ticks(duel, 1);
}
function race(crew) {
  const featureFlags = createFeatureFlags({storage: null, qa: true,
    catalog: {...FEATURE_STATES, 'crew-gear': FEATURE_STATES['crew-gear'] || 'dev'},
    overrides: {wasteland2: true, arsenal: true, 'crew-gear': true}});
  const duel = new Duel({seed: 1989, featureFlags});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', driverId: 'club',
    crewId: crew, discoveredGate: true, arsenalRank: 30, seed: 1989,
    opponentCount: 1, cpuDifficulty: 'easy'});
  Object.assign(duel.state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  placeCar(duel.state, 500); placeCar(duel.state.opponents[0], 650);
  duel.state.combat.aiTimer = duel.state.combat.pickupTimer = Infinity;
  leave(duel); initializeCrewGear(duel);
  return duel;
}
function triggerSignature(duel) {
  duel.setFighterInput({fire: false}); stepSignatureGear(duel, DT);
  assert.equal(selectSignatureGear(duel), true, 'production module selects signature gear');
  duel.setFighterInput({fire: true}); stepSignatureGear(duel, DT);
  duel.setFighterInput({fire: false}); stepSignatureGear(duel, DT);
}
function deploy(duel) {
  triggerSignature(duel);
  assert.ok(duel.state.crewGear.turret, 'an actual turret is deployed');
}
function readyRpgFires(duel, label) {
  assert.equal(duel.selectFootGear(1), true, 'native slot 1 selects RPG');
  const before = duel.state.footWeapons.ammo;
  const shots = duel.state.combat.projectiles.filter(shot => shot.kind === 'rpg').length;
  duel.setFighterInput({fire: true}); ticks(duel, 1);
  duel.setFighterInput({fire: false}); ticks(duel, 1);
  assert.equal(duel.state.footWeapons.ammo, before - 1,
    `${label}: ready native RPG must spend one round`);
  assert.equal(duel.state.combat.projectiles.filter(shot => shot.kind === 'rpg').length,
    shots + 1, `${label}: an actual native RPG projectile is created`);
}
function stickyBlast(ownCar) {
  const duel = race('nell');
  const target = ownCar ? duel.state : duel.state.opponents[0];
  const at = carBodyPoint(duel, target);
  // Start from a real production launch product; put its next ground contact
  // at the tested parked-car centre, then let the real contact fuse explode.
  const shot = launchGearProjectile(duel, duel.state.fighter, signatureFor('nell'), 1);
  assert.ok(shot, 'production module creates the bomb');
  const ground = duel.course.groundAt(target.s, target.lateral);
  Object.assign(shot, {x: at.x, y: ground.y + .05, z: at.z, vx: 0, vy: 0, vz: 0});
  const armor = target.armor;
  assert.equal(stepGearProjectile(duel, shot, DT), true, 'ground contact starts the fuse');
  assert.equal(stepGearProjectile(duel, shot, 3 - DT), true, 'the bomb stays live before three seconds');
  assert.equal(target.armor, armor, 'no premature blast damage');
  assert.equal(stepGearProjectile(duel, shot, DT), false, 'the production three-second fuse expires');
  return armor - target.armor;
}
check('Nell enemy blast retains the settled 25 armor', () => {
  assert.ok(Math.abs(stickyBlast(false) - 25) < EPS, 'enemy centre damage remains 25 armor');
});
check('Nell own parked car receives at most 25% blast damage', () => {
  const removed = stickyBlast(true);
  assert.ok(removed > 0 && removed <= 6.25 + EPS,
    `own-car blast must remove at most 6.25 armor; received ${removed}`);
});
check('native ready RPG control fires before Odessa deploys', () => {
  readyRpgFires(race('odessa'), 'control');
});
check('Odessa deploying a turret does not block a ready native RPG', () => {
  const duel = race('odessa'); deploy(duel); readyRpgFires(duel, 'after deployment');
});
check('Odessa turret retirement does not block a ready native RPG', () => {
  const duel = race('odessa'); deploy(duel);
  duel.state.stageTimeSec += 20; stepGearDeployables(duel, 20);
  assert.equal(duel.state.crewGear.turret, null, 'actual turret expires at 20 seconds');
  readyRpgFires(duel, 'after retirement');
});
check('Odessa recharge starts after expiration and refill/re-entry cannot bypass it', () => {
  const duel = race('odessa'); deploy(duel);
  const deployed = duel.state.crewGear.turret;
  duel.state.stageTimeSec += 19; stepGearDeployables(duel, 19);
  triggerSignature(duel);
  assert.equal(duel.state.crewGear.turret, deployed, 'one live turret cannot be replaced');
  duel.state.stageTimeSec += 1; stepGearDeployables(duel, 1);
  assert.equal(duel.state.crewGear.turret, null, 'turret expires after its full 20 seconds');
  const retiredAt = duel.state.stageTimeSec;
  const p = duel.course.groundAt(duel.state.s, duel.state.lateral + 2.5);
  Object.assign(duel.state.fighter, {x: p.x, y: p.y, z: p.z, groundY: p.y,
    s: duel.state.s, lateral: duel.state.lateral + 2.5, airHeight: 0, verticalSpeed: 0});
  duel.setFighterInput({fire: false}); duel.selectFootGear(1);
  duel.setInput({interact: false}); ticks(duel, 1);
  duel.setInput({interact: true}); ticks(duel, 72);
  assert.equal(duel.state.onFoot, false, 'actual 0.6 s re-entry completes');
  refillCrewGear(duel); // Explicit held hook; native entry is not claimed wired.
  duel.setInput({interact: false}); ticks(duel, 1); leave(duel);
  triggerSignature(duel);
  assert.equal(duel.state.crewGear.turret, null, 'actual re-entry and module refill do not bypass recharge');
  duel.state.stageTimeSec = retiredAt + 29.99; triggerSignature(duel);
  assert.equal(duel.state.crewGear.turret, null, 'turret remains unavailable just before 30 seconds');
  duel.state.stageTimeSec = retiredAt + 30; triggerSignature(duel);
  assert.ok(duel.state.crewGear.turret, 'turret is available exactly 30 seconds after retirement');
});
check('destroyed Odessa turret starts its own full retirement recharge', () => {
  const duel = race('odessa'); deploy(duel);
  assert.equal(damageGearTurret(duel, duel.state.crewGear.turret, 60,
    duel.state.opponents[0]), 60, 'native enemy damage destroys the actual 60-health turret');
  assert.equal(duel.state.crewGear.turret, null, 'destroyed turret retires');
  const retiredAt = duel.state.stageTimeSec;
  refillCrewGear(duel);
  duel.state.stageTimeSec = retiredAt + 29.99; triggerSignature(duel);
  assert.equal(duel.state.crewGear.turret, null, 'refill cannot bypass destruction recharge');
  duel.state.stageTimeSec = retiredAt + 30; triggerSignature(duel);
  assert.ok(duel.state.crewGear.turret, 'destruction recharge ends after 30 seconds');
});
for (const crew of ['dune', 'tusk']) check(`${crew} direct shot retires at native terrain contact`, () => {
  const duel = race(crew);
  duel.state.fighter.pitch = -.7;
  const shot = launchGearProjectile(duel, duel.state.fighter, signatureFor(crew), 1);
  assert.ok(shot, 'actual production launch creates the direct shot');
  let contactedGround = false;
  for (let i = 0; i < 120; i++) {
    // Direct shots travel at their actual launched velocity. Query the native
    // course at the next endpoint before contact handling can clamp the shot.
    const next = {x: shot.x + shot.vx * DT, y: shot.y + shot.vy * DT,
      z: shot.z + shot.vz * DT};
    const near = duel.course.nearest(next.x, next.z);
    const floor = duel.course.groundAt(near.s, near.lateral).y;
    const retained = stepGearProjectile(duel, shot, DT);
    if (next.y <= floor + .05) {
      contactedGround = true;
      assert.equal(retained, false,
        `${crew} projectile must retire on first terrain crossing; next endpoint is ${(floor - next.y).toFixed(3)} m below native ground`);
      break;
    }
    assert.equal(retained, true, 'unobstructed direct shot remains live before terrain contact');
  }
  assert.equal(contactedGround, true, 'downward shot genuinely reaches native terrain');
});
for (const failure of failures) console.error(failure);
console.log(`Crew gear owned modules: ${checks} checks, ${checks - failures.length} passed, ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
