import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';

// ARENA-07: native entry and initial settled convoy. Valve hit targeting,
// body wrecks, unlock and payout policy wait for Claude before source work.
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Convoy Raid: ${checks} acceptance checks executed.`));
const FIELD = [{car: 'stuttgart_959s'}, {car: 'dusthawk_rally'}, {car: 'aurora_gt'}];

function admitted({venueId = 'salt-flats', discovered = true, enabled = true} = {}) {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {'convoy-raid': enabled, 'salt-flats': true, 'crew-gear': true}});
  const duel = new Duel({seed: 307, featureFlags: flags});
  duel.state.wastelandGateDiscovered = discovered;
  return {duel, started: duel.startArenaEvent({venueId, mode: 'convoy-raid',
    car: 'falcone_f42', cpuDifficulty: 'medium', playerId: 'convoy-driver', opponents: FIELD})};
}
function fight() {
  const {duel, started} = admitted();
  equal(started, true, 'native arena entry must accept Convoy Raid on Salt Flats');
  duel.state.countdown = 0; duel.step(1 / 120); duel.step(1 / 120);
  return duel;
}

test('Convoy Raid has its own dev switch', () => {
  equal(FEATURE_STATES['convoy-raid'], 'dev', 'the unfinished Convoy mode must have a dev switch');
  const released = createFeatureFlags({storage: {getItem: () => 'true'}, qa: false,
    search: '?flags=convoy-raid'});
  equal(released.enabled('convoy-raid'), false, 'Convoy stays hidden in the released player build');
});

test('native entry admits Convoy Raid on the actual Salt Flats', () => {
  const {duel, started} = admitted();
  equal(started, true, 'native arena entry must admit the registered Convoy Raid mode');
  equal(duel.state.arena.mode, 'convoy-raid', 'entry retains the requested mode');
  equal(duel.state.arena.venueId, 'salt-flats', 'Convoy keeps the Salt Flats venue');
  equal(duel.course.def.id, 'salt-flats', 'the actual Convoy course is Salt Flats');
  equal(duel.state.arena.timeLimitSec, 300, 'Convoy has a five-minute limit');
});

test('initial convoy has one twelve-tonne rigid rig and two allied guard escorts', () => {
  const duel = fight(), arena = duel.state.arena;
  equal(duel.state.opponents.length, 3, 'one rig and two escorts are three native actors');
  equal(arena.participants.length, 4, 'the player fights the rig and its two escorts');
  const [rig, ...escorts] = duel.state.opponents;
  equal(rig.arenaRole, 'convoy-rig', 'the first actor is the rigid tanker');
  equal(duel._vehicleSpec(rig).mass, 12000, 'crash physics sees the twelve-tonne rig');
  equal(arena.participants.slice(2).map(p => p.brain), ['guard', 'guard'], 'two escorts use the guard brain');
  const rigTeam = arena.participants[1].team;
  ok(rigTeam !== arena.participants[0].team, 'the rig is hostile to the player');
  equal(arena.participants.slice(2).map(p => p.team), [rigTeam, rigTeam], 'escorts share the rig team');
  equal(escorts.length, 2, 'no separate trailer actor is created');
});

test('initial convoy drives at 55 km/h with three intact 150-armor valves', () => {
  const duel = fight(), convoy = duel.state.arena.convoy;
  equal(convoy.valves, [150, 150, 150], 'the tanker has exactly three intact fuel valves');
  equal(convoy.boardingLeftSec, 0, 'the roof lamps remain off before the valves break');
  ok(Math.abs(duel.state.opponents[0].speedMph * 1.609344 - 55) < .01,
    'the intact rig follows its fixed loop at 55 km/h');
});

test('Convoy rejects other venues, a disabled switch and undiscovered careers', () => {
  equal(admitted({venueId: 'scrapdome'}).started, false, 'Convoy cannot run on the Scrapdome');
  equal(admitted({venueId: 'pit'}).started, false, 'Convoy cannot run in the Pit');
  equal(admitted({enabled: false}).started, false, 'Convoy rejects a disabled feature switch');
  equal(admitted({discovered: false}).started, false, 'Convoy rejects an undiscovered career');
});

test('identical native entry seeds and inputs keep the convoy repeatable', () => {
  function run() {
    const duel = fight();
    for (let n = 0; n < 120; n++) {
      duel.setInput({throttle: 1, steer: .1, brake: 0, boost: false}); duel.step(1 / 120);
    }
    return {arena: structuredClone(duel.state.arena),
      rig: duel.state.opponents.map(actor => [actor.s, actor.lateral, actor.speedMph, actor.armor])};
  }
  equal(run(), run(), 'a fixed seed and fixed inputs produce the same rig, escort and valve state');
});
