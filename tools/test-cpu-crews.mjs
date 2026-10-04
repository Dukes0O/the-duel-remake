import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {CREW} from '../src/crew.js';
import {stepRaiders, damageRaider} from '../src/raiders.js';

// CREW-04: native computer driving and raider-fighter damage, on the real
// course. Fixtures set initial race conditions, never manufacture stop states.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Computer crews: ${checks} acceptance checks executed.`));

function race({difficulty = 'medium', enabled = true, discovered = true,
    seed = 3004, opponents = 1, mode = 'wasteland'} = {}) {
  const duel = new Duel({seed, featureFlags: createFeatureFlags({storage: null,
    qa: true, overrides: {'crew-gear': enabled}})});
  duel.startCampaign({mode, car: 'falcone_f42', driverId: 'club',
    discoveredGate: discovered, opponentCount: opponents, seed, cpuDifficulty: difficulty});
  const state = duel.state, rival = state.opponents[0];
  Object.assign(state, {status: 'racing', countdown: 0, traffic: [],
    invulnerableSec: 0, lapsTotal: 1, completedLaps: 0});
  state.combat && Object.assign(state.combat, {aiTimer: Infinity, pickupTimer: Infinity});
  const anchor = duel.course.length * .45;
  Object.assign(state, {s: anchor - 1000, prevS: anchor - 1000, speedMph: 0});
  for (const actor of state.opponents) Object.assign(actor, {s: anchor,
    prevS: anchor, lateral: 0, prevLateral: 0, speedMph: 0, armor: 100,
    maxArmor: 100, impactTimer: 0, combatShield: 0, completedLaps: 0});
  return {duel, state, rival};
}
function tick(f, count = 1) {
  for (let n = 0; n < count; n++) {
    f.state.stageTimeSec += DT;
    for (const actor of f.state.opponents) f.duel._rival(DT, actor);
    if (f.state.raids) stepRaiders(f.duel, DT);
  }
}
const stopped = actor => ['pulling-over', 'repair', 'ambush', 'recovering'].includes(actor.cpuCrew?.phase);
function repairStart(f) {
  f.rival.armor = 29; tick(f);
  ok(stopped(f.rival), 'an eligible native computer must start its repair stop');
  for (let n = 0; n < 1200 && f.rival.cpuCrew.phase !== 'repair'; n++) tick(f);
  equal(f.rival.cpuCrew.phase, 'repair', 'the computer actually stops and gets out');
  ok(f.rival.speedMph <= 1, 'the computer is parked before its fighter starts repair');
  ok(f.rival.cpuCrew.fighter, 'the stopped computer has a real crew fighter');
  return f.rival.armor;
}
function ambushRace(options = {}) {
  const f = race({difficulty: 'hard', ...options});
  const zone = f.state.raids.zones[0];
  f.rival.s = f.rival.prevS = zone.s;
  f.state.s = f.state.prevS = zone.s - 250;
  return f;
}

test('all native computer cars receive valid repeatable seeded crews', () => {
  function selected() {
    const f = race({opponents: 3}); tick(f);
    const ids = f.state.opponents.map(actor => actor.cpuCrew?.crewId);
    ok(ids.every(id => Object.hasOwn(CREW, id)), 'every computer receives a real crew member from the seeded field');
    return ids;
  }
  equal(selected(), selected(), 'identical seeds reproduce the computer crew field');
});

test('Medium repair grants forty armor over four seconds, or two seconds for Odessa', () => {
  const f = race(), before = repairStart(f);
  const seconds = f.rival.cpuCrew.crewId === 'odessa' ? 2 : 4;
  tick(f, Math.round((seconds - DT) / DT));
  ok(f.rival.armor < before + 40, 'repair has not completed before its full duration');
  tick(f);
  ok(Math.abs(f.rival.armor - Math.min(f.rival.maxArmor, before + 40)) < 1e-6,
    'the completed stop repairs exactly forty armor');
  equal(f.rival.cpuCrew.phase, 'driving', 'the fighter gets back in and resumes driving');
});

test('Odessa is selected from the native seeded field and completes her faster repair', () => {
  let found = null;
  for (let seed = 3004; seed < 3068; seed++) {
    const f = race({seed}); tick(f);
    ok(f.rival.cpuCrew, 'native crew assignment exists before searching the seeded field');
    if (f.rival.cpuCrew.crewId === 'odessa') {found = f; break;}
  }
  ok(found, 'the seeded computer field includes Odessa');
  const before = repairStart(found); tick(found, Math.round(2 / DT));
  ok(Math.abs(found.rival.armor - Math.min(found.rival.maxArmor, before + 40)) < 1e-6,
    'Odessa repairs forty armor in two seconds');
});

test('repair stops are at most once per lap', () => {
  const f = race(); repairStart(f); tick(f, Math.round(4.1 / DT));
  equal(f.rival.cpuCrew.phase, 'driving', 'the first repair stop has ended');
  f.rival.armor = 29; tick(f);
  equal(stopped(f.rival), false, 'the same computer cannot stop to repair twice on this lap');
});

for (const [label, options, arrange] of [
  ['Easy', {difficulty: 'easy'}, () => {}],
  ['disabled crew switch', {enabled: false}, () => {}],
  ['undiscovered player', {discovered: false}, () => {}],
  ['ordinary race', {mode: 'duel'}, () => {}],
  ['thirty-percent armor', {}, f => {f.rival.armor = 30;}],
  ['nearby enemy', {}, f => {f.state.s = f.rival.s - 20;}],
  ['last four hundred metres', {}, f => {f.rival.s = f.duel.course.raceLength - 399;}],
]) test(`repair eligibility rejects ${label}`, () => {
  const f = race(options); f.rival.armor = 29; arrange(f); tick(f, 2);
  equal(stopped(f.rival), false, `${label} must not send the computer crew out to repair`);
});

test('Hard computer at an ambush zone starts a real fighter ambush when leading by 150 to 400 metres', () => {
  const f = ambushRace(); tick(f);
  ok(stopped(f.rival), 'the eligible native Hard computer must pull over for its ambush');
  for (let n = 0; n < 1200 && f.rival.cpuCrew.phase !== 'ambush'; n++) tick(f);
  equal(f.rival.cpuCrew.phase, 'ambush', 'the Hard computer actually stops for its ambush');
  ok(f.rival.cpuCrew.fighter, 'the ambush fighter is present on foot');
  ok(f.rival.speedMph <= 1, 'the ambusher car is parked');
  tick(f, Math.round(12 / DT));
  ok(f.rival.cpuCrew.shots > 0 && f.rival.cpuCrew.shots <= 3, 'the native ambusher fires one to three RPG rockets');
  equal(f.rival.cpuCrew.phase, 'driving', 'the ambusher gets back in after firing');
});

for (const [label, options, arrange] of [
  ['Easy', {difficulty: 'easy'}, () => {}],
  ['Medium', {difficulty: 'medium'}, () => {}],
  ['less than 150 metres ahead', {}, f => {f.state.s = f.rival.s - 149;}],
  ['more than 400 metres ahead', {}, f => {f.state.s = f.rival.s - 401;}],
  ['no ambush zone', {}, f => {f.state.raids.zones = [];}],
  ['last five hundred metres', {}, f => {
    const s = f.duel.course.raceLength - 499;
    f.state.raids.zones[0].s = s; f.rival.s = s; f.state.s = s - 250;
  }],
]) test(`ambush eligibility rejects ${label}`, () => {
  const f = ambushRace(options); arrange(f); tick(f, 2);
  equal(stopped(f.rival), false, `${label} must not send the computer crew out to ambush`);
});

test('knocking down a native stopped fighter holds its car for three seconds and then respawns beside it', () => {
  const f = race(); repairStart(f);
  const fighter = f.rival.cpuCrew.fighter;
  damageRaider(f.duel, fighter, fighter.health + 1, {owner: 'player', source: 'onFoot'});
  ok(fighter.knockedDown, 'the actual fighter damage path knocks the computer crew down');
  tick(f, Math.round((3 - DT) / DT));
  ok(f.rival.speedMph <= 1, 'the car stays parked while its fighter is down');
  ok(fighter.knockedDown, 'the fighter does not respawn before three seconds');
  tick(f);
  equal(fighter.knockedDown, false, 'the fighter respawns after three seconds');
  ok(fighter.health > 0, 'the respawned fighter has health');
});
