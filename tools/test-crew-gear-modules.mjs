import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {carBodyPoint} from '../src/arsenal/hazards.js';
import {initializeCrewGear, refillCrewGear, selectSignatureGear,
  stepSignatureGear, stepGearDeployables, damageGearTurret} from '../src/crew-gear/signature.js';
import {launchGearProjectile, stepGearProjectile} from '../src/crew-gear/projectiles.js';
import {signatureFor} from '../src/crew-gear/gear.js';
import {availableCrew, selectedCrewId, selectCrew} from '../src/crew.js';
import {createProfile} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {crewPanel} from '../src/crew-ui.js';
import {CREW} from '../src/crew.js';

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
    overrides: {arsenal: true, 'crew-gear': true}});
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
for (const crew of ['dune', 'nell']) check(`${crew} launch inherits observed native walking velocity`, () => {
  function launch(walking) {
    const duel = race(crew);
    assert.equal(duel.selectFootGear(3), true, 'native slot 3 selects this gear');
    duel.setFighterInput({fire: false, right: walking});
    ticks(duel, 1);
    const before = {x: duel.state.fighter.x, z: duel.state.fighter.z};
    duel.setFighterInput({fire: true});
    ticks(duel, 1); // Native movement and native signature fire in the same step.
    const fighter = duel.state.fighter;
    const motion = {x: (fighter.x - before.x) / DT, z: (fighter.z - before.z) / DT};
    const shot = duel.state.combat.projectiles.at(-1);
    assert.equal(shot?.kind, signatureFor(crew).id, 'real production fire creates the signature projectile');
    return {shot, motion};
  }
  const stationary = launch(false), walking = launch(true);
  assert.ok(Math.hypot(stationary.motion.x, stationary.motion.z) < EPS,
    'stationary control has no native movement');
  const nominal = crew === 'dune' ? 90 : 18;
  assert.ok(Math.abs(Math.hypot(stationary.shot.vx, stationary.shot.vz) - nominal) < EPS,
    `stationary ${crew} keeps its literal ${nominal} m/s launch`);
  assert.ok(Math.abs(Math.hypot(walking.motion.x, walking.motion.z) - 4.5) < EPS,
    'actual native walking supplies the observed 4.5 m/s velocity');
  const error = Math.hypot(walking.shot.vx - stationary.shot.vx - walking.motion.x,
    walking.shot.vz - stationary.shot.vz - walking.motion.z);
  assert.ok(error < EPS,
    `${crew} projectile must inherit actual planar thrower motion; velocity error ${error.toFixed(3)} m/s`);
});
check('earned Tusk remains selectable below rank 25 without paying again', () => {
  const profile = {...createProfile(), futureProfile: {kept: true},
    wasteland: normalizeWasteland({xp: 0, discoveredGate: true, scrap: 37,
      futureCareer: {kept: ['value']}, crew: {selected: 'rook',
        unlocked: ['rook', 'tusk', 'future-crew'], futureCrew: {kept: true}}})};
  const other = {...createProfile(), wasteland: normalizeWasteland({xp: 0, scrap: 19})};
  const before = structuredClone(profile), otherBefore = structuredClone(other);
  assert.ok(availableCrew(profile).some(member => member.id === 'tusk'),
    'the low-rank career can use its already earned Tusk');
  assert.equal(selectedCrewId({...profile, wasteland: {...profile.wasteland,
    crew: {...profile.wasteland.crew, selected: 'tusk'}}}), 'tusk',
    'an earned Tusk selection survives the usual rank check');
  const result = selectCrew(profile, 'tusk');
  assert.equal(result.ok, true, 'already owned Tusk can be selected below rank 25');
  assert.equal(result.profile.wasteland.scrap, 37, 'earned Tusk is never purchased again');
  assert.equal(selectedCrewId(result.profile), 'tusk', 'selection is actually honored');
  const expected = structuredClone(before);
  expected.wasteland.crew.selected = 'tusk';
  assert.deepEqual(result.profile, expected, 'only selection changes; future fields and unknown unlocks survive');
  assert.deepEqual(profile, before, 'selection does not mutate its input profile');
  assert.deepEqual(other, otherBefore, 'another named career remains unchanged');
});
check('unearned Tusk still requires rank 25 and a future schema cannot be changed', () => {
  const profile = {...createProfile(), wasteland: normalizeWasteland({xp: 0,
    discoveredGate: true, scrap: 1000, crew: {unlocked: ['rook'], selected: 'rook'}})};
  const before = structuredClone(profile);
  assert.equal(availableCrew(profile).some(member => member.id === 'tusk'), false,
    'low rank does not grant an unearned Tusk');
  assert.equal(selectCrew(profile, 'tusk').ok, false, 'unearned Tusk remains rank-gated');
  assert.deepEqual(profile, before, 'rejection preserves the whole profile and scrap');
  const future = {...profile, wasteland: {...profile.wasteland, version: 2,
    crew: {selected: 'rook', unlocked: ['rook', 'tusk'], future: {kept: true}}}};
  const futureBefore = structuredClone(future);
  assert.equal(selectCrew(future, 'tusk').ok, false, 'owned crew cannot bypass a future-schema refusal');
  assert.deepEqual(future, futureBefore, 'future-schema refusal preserves the supplied career');
});
const escapeCrewHTML = value => String(value).replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function crewArticle(html, id) {
  const article = [...html.matchAll(/<article\b[\s\S]*?<\/article>/g)]
    .map(match => match[0]).find(text => text.includes(`data-crew-select="${id}"`));
  assert.ok(article, `actual crew panel contains ${id}'s card`);
  return article;
}
check('enabled crew panel presents playable gear and the three active abilities', () => {
  const profile = {...createProfile(), wasteland: normalizeWasteland({xp: 100000,
    discoveredGate: true, scrap: 3000})};
  const html = crewPanel(profile, escapeCrewHTML, {gearEnabled: true});
  for (const id of Object.keys(CREW)) {
    const article = crewArticle(html, id);
    assert.ok(article.includes(escapeCrewHTML(CREW[id].gear)), `${id} retains its actual signature label`);
    assert.doesNotMatch(article, /gear in a later card/i, `${id}'s playable gear is not labeled as future work`);
  }
  for (const id of ['jax', 'cinder', 'tusk']) {
    const article = crewArticle(html, id);
    assert.match(article, /PASSIVE READY/, `${id}'s enabled ability is presented as active`);
    assert.doesNotMatch(article, /PASSIVE HOOK · LATER CARD/, `${id} has no stale later-card ability copy`);
  }
});
check('default and disabled crew panel keep the released inactive labels', () => {
  const profile = {...createProfile(), wasteland: normalizeWasteland({xp: 100000})};
  const defaultHTML = crewPanel(profile, escapeCrewHTML);
  assert.equal(crewPanel(profile, escapeCrewHTML, {gearEnabled: false}), defaultHTML,
    'explicit gear-off context preserves the default panel');
  for (const id of ['jax', 'cinder', 'tusk']) {
    const article = crewArticle(defaultHTML, id);
    assert.match(article, /PASSIVE HOOK · LATER CARD/, `${id}'s off-context ability remains inactive`);
    assert.match(article, /gear in a later card/i, 'off-context gear retains its released future label');
  }
});
check('early owned Tusk has an enabled choice while an unearned low-rank Tusk stays locked', () => {
  function profile(owned) {
    return {...createProfile(), wasteland: normalizeWasteland({xp: 0,
      discoveredGate: true, scrap: 0, crew: {selected: 'rook',
        unlocked: owned ? ['rook', 'tusk'] : ['rook']}})};
  }
  const owned = crewArticle(crewPanel(profile(true), escapeCrewHTML, {gearEnabled: true}), 'tusk');
  const ownedButton = owned.match(/<button\b[\s\S]*?<\/button>/)[0];
  assert.doesNotMatch(ownedButton, /\bdisabled\b/, 'earned low-rank Tusk can actually be selected');
  assert.doesNotMatch(ownedButton, /UNLOCKS AT RANK 25|HIRE/, 'earned Tusk neither requires rank 25 nor repayment');
  const unearned = crewArticle(crewPanel(profile(false), escapeCrewHTML, {gearEnabled: true}), 'tusk');
  const unearnedButton = unearned.match(/<button\b[\s\S]*?<\/button>/)[0];
  assert.match(unearnedButton, /\bdisabled\b/, 'unearned low-rank Tusk remains unavailable');
  assert.match(unearnedButton, /UNLOCKS AT RANK 25/, 'unearned Tusk keeps his existing rank requirement');
});
for (const failure of failures) console.error(failure);
console.log(`Crew gear owned modules: ${checks} checks, ${checks - failures.length} passed, ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
