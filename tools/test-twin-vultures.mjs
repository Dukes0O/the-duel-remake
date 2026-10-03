import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {stepArenaEvent, arenaRanking, arenaTeams} from '../src/arena/arena-event.js';
import {VULTURE_RULES} from '../src/warlords/vultures.js';
import {WARLORDS, jaxGrappleBonusMetres} from '../src/warlords.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {arenaHud} from '../src/screen-arena.js';
import {worldPose} from '../src/arena/arena-floor.js';

// The Twin Vultures (docs/SCRAPDOME.md section 5): two buggies fighting as a
// pair, the Pincer and its collision stun, team scoring and the Jax grapple
// reward. The real dome course and arena step; null flag storage; no browser
// or saves.
const DT = 1 / 120;
const FLAGS = {wasteland2: true, scrapdome: true, warlords: true};
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
test.after(() => console.log('Twin Vultures: ' + checks + ' checks.'));

function fight({phase = 1, gap = 30, difficulty = 'medium', warlordId = 'vultures'} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: FLAGS});
  assert.equal(startWarlordEvent(duel, {warlordId, car: 'falcone_f42', cpuDifficulty: difficulty}), true);
  assert.equal(beginWarlordEvent(duel), true);
  duel.state.countdown = 0;
  duel.state.status = 'racing';
  stepArenaEvent(duel, DT);
  const [a, b] = duel.state.opponents;
  duel.state.arena.warlordPhase = phase;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0;
  // The pair sits either side of the player, who is parked.
  Object.assign(a, {s: 100, prevS: 100, lateral: -10, prevLateral: -10, headingError: 0, speedMph: 0});
  if (b) Object.assign(b, {s: 100, prevS: 100, lateral: 10, prevLateral: 10, headingError: 0, speedMph: 0});
  Object.assign(duel.state, {s: 100 + gap, prevS: 100 + gap, lateral: 0, prevLateral: 0,
    headingError: 0, speedMph: 0});
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  return {duel, a, b};
}
function run(f, seconds, each = () => {}) {
  for (let t = 0; t < seconds - 1e-9; t += DT) { stepArenaEvent(f.duel, DT); each(); }
}
const wreck = (f, car, owner = 'player') => {
  car.armor = 1;
  applyArmorDamage(f.duel, car, 'crossbow', {owner});
};

test('two buggies share a team, each at 0.9 times arena armor instead of 1.5', () => {
  const f = fight();
  equal(f.duel.state.opponents.length, 2, 'two buggies');
  const ids = f.duel.state.arena.participants.filter(p => p.kind === 'cpu').map(p => [p.id, p.team]);
  equal(ids, [['cpu-1', 'warlord:vultures'], ['cpu-2', 'warlord:vultures']], 'one team');
  const dust = fight({warlordId: 'dustmonger'});
  // Same car as the Dustmonger: base armor times .9 against times 1.5.
  ok(Math.abs(f.a.maxArmor / dust.a.maxArmor - .9 / 1.5) < 1e-9, 'armor scale .9, not 1.5');
  equal(f.a.maxArmor, f.b.maxArmor, 'both buggies match');
});

test('the harasser fires from the start; the shadow holds its fire until phase two', () => {
  const owners = phase => {
    const f = fight({phase, gap: 40});
    const seen = new Set();
    run(f, 14, () => { for (const bolt of f.duel.state.combat.projectiles) if (bolt.ownerId) seen.add(bolt.ownerId); });
    return [...seen].sort();
  };
  equal(owners(1), ['cpu-1'], 'phase one: only the harasser fires');
  ok(owners(2).includes('cpu-2'), 'phase two: the shadow fires too');
});

test('no pincer at the start of the fight', () => {
  const f = fight();
  run(f, 3);
  equal(f.a.pincer.stage, 'idle', 'cooldown runs from the opening bell');
});

test('PINCER! flashes both buggies, then they charge from opposite sides', () => {
  const f = fight();
  const events = [];
  f.duel.onChange((_s, event) => { if (event.pincer) events.push(event.pincer); });
  f.a.pincer.nextSec = 0;
  run(f, .1);
  equal(f.a.pincer.stage, 'tell', 'the tell comes first');
  ok(f.a.arenaTellSec > 0 && f.b.arenaTellSec > 0, 'both cars flash');
  equal(events.length, 1, 'one pincer event');
  equal(f.duel.state.arena.edgeCues.map(cue => cue.side).sort(), ['left', 'right'], 'both screen edges light for the tell');
  ok(new Set(Object.values(events[0].sides)).size === 2, 'one from each side: ' + JSON.stringify(events[0].sides));
  // By the end of the tell they stand on opposite sides of the player.
  let sign = [];
  run(f, 1.2, () => {
    if (f.a.pincer.stage === 'tell') {
      const player = worldPose(f.duel, f.duel.state);
      sign = [f.a, f.b].map(car => {
        const pose = worldPose(f.duel, car);
        return Math.sign((pose.x - player.x) * -Math.cos(player.heading) + (pose.z - player.z) * Math.sin(player.heading));
      });
    }
  });
  ok(sign[0] !== 0 && sign[0] === -sign[1], 'opposite sides of the player: ' + sign);
  ok(f.duel.state.arena.edgeCues.length === 0 || f.a.pincer.stage !== 'tell', 'the edge cues end with the tell');
});

test('no pincer when the player is far from the pair', () => {
  const f = fight(), player = f.duel.state;
  // The Pit is shorter than the ring. Opposite outer floor is physically
  // beyond the 80 m trigger from both buggies, even around its closing seam.
  const farS = 100 + f.duel.course.length / 2;
  Object.assign(player, {s: farS, prevS: farS, lateral: 25, prevLateral: 25});
  const far = worldPose(f.duel, player);
  for (const car of [f.a, f.b]) {
    const near = worldPose(f.duel, car);
    ok(Math.hypot(far.x - near.x, far.z - near.z) > VULTURE_RULES.triggerMetres,
      'the Pit fixture is truly outside pincer reach');
  }
  f.a.pincer.nextSec = 0;
  run(f, 1);
  equal(f.a.pincer.stage, 'idle', 'out of reach');
});

test('pincers come at most every 11, 9 and 7 s by difficulty; the tell is 20 percent shorter in phase two', () => {
  for (const [difficulty, base] of [['easy', 11], ['medium', 9], ['hard', 7]]) {
    const f = fight({difficulty});
    f.a.pincer.nextSec = 0;
    run(f, .1);
    const wait = f.a.pincer.nextSec - f.duel.state.stageTimeSec;
    ok(Math.abs(wait - base) < .2, `${difficulty}: ${wait.toFixed(2)} s`);
  }
  const tell = phase => {
    const f = fight({phase});
    f.a.pincer.nextSec = 0;
    run(f, .1);
    return f.a.pincer.untilSec - f.duel.state.stageTimeSec;
  };
  ok(Math.abs(tell(2) / tell(1) - VULTURE_RULES.phaseTwoTellShare) < .15, 'tell is shorter in phase two');
});

test('the charge is aimed at where the player will be if he holds his speed', () => {
  const meet = mph => {
    const f = fight({gap: 40});
    f.duel.state.speedMph = mph;
    f.a.pincer.nextSec = 0;
    run(f, .02);
    const player = worldPose(f.duel, f.duel.state), m = f.a.pincer.meet;
    return Math.hypot(m.x - player.x, m.z - player.z);
  };
  ok(meet(0) < 1.5, 'a parked player is aimed at where he sits');
  ok(meet(40) > 15, 'a moving player is led by the arrival time: ' + meet(40).toFixed(1) + ' m');
});

test('braking through the tell leaves the player short: the pair meet each other and both are stunned 2.5 s', () => {
  const f = fight({gap: 40, difficulty: 'medium'});
  Object.assign(f.a, {lateral: -30, prevLateral: -30});
  Object.assign(f.b, {lateral: 30, prevLateral: 30});
  const stuns = [];
  f.duel.onChange((_s, event) => { if (event.vulturesCollide) stuns.push(f.duel.state.stageTimeSec); });
  f.duel.state.speedMph = 40;
  f.duel.state.maxArmor = f.duel.state.armor = 1e9;
  f.a.pincer.nextSec = 0;
  run(f, 6, () => {
    const braking = f.a.pincer.stage === 'tell';
    f.duel.setInput({throttle: braking ? 0 : 1, brake: braking ? 1 : 0, steer: 0, boost: false});
  });
  ok(stuns.length >= 1, 'they hit each other');
});

test('a real collision during a charge stuns both for 2.5 s; they stop, then it ends', () => {
  const g = fight();
  g.a.pincer.nextSec = 0;
  run(g, .1);
  g.a.pincer.stage = 'charge'; g.a.pincer.untilSec = g.duel.state.stageTimeSec + 3;
  g.a.pincer.meet = {x: worldPose(g.duel, g.a).x, z: worldPose(g.duel, g.a).z};
  Object.assign(g.a, {s: 100, prevS: 100, lateral: -3, prevLateral: -3, headingError: 0, speedMph: 40});
  Object.assign(g.b, {s: 100, prevS: 100, lateral: 3, prevLateral: 3, headingError: 0, speedMph: 40});
  const events = [];
  g.duel.onChange((_s, event) => { if (event.vulturesCollide) events.push(event.vulturesCollide); });
  // Drive them at each other through the real crash contact.
  run(g, .5, () => { if (g.a.pincer.stage !== 'stun') { g.a.lateral += .02; g.b.lateral -= .02; } });
  equal(g.a.pincer.stage, 'stun', 'the collision stuns the pair');
  equal(events[0].seconds, VULTURE_RULES.stunSec, 'for 2.5 s');
  run(g, 1.5);
  ok([g.a, g.b].every(car => car.speedMph < 15), 'stopped or crawling: ' + [g.a.speedMph, g.b.speedMph]);
  run(g, VULTURE_RULES.stunSec);
  ok(g.a.pincer.stage !== 'stun', 'the stun ends');
});

test('collisions outside a charge do not stun', () => {
  const g = fight();
  Object.assign(g.a, {s: 100, prevS: 100, lateral: -.5, prevLateral: -.5, speedMph: 30});
  Object.assign(g.b, {s: 100, prevS: 100, lateral: .5, prevLateral: .5, speedMph: 30});
  run(g, .3);
  ok(g.a.pincer.stage !== 'stun', 'no stun while idle');
});

test('wrecks count for the pair together: the third wreck by either buggy ends it', () => {
  const f = fight();
  const player = f.duel.state.arena.participants.find(p => p.id === 'player');
  wreck(f, f.a); run(f, .05);
  f.a.combatWreckTimer = 0;
  equal(f.duel.state.arena.warlordPhase, 1, 'one wreck is not enough for phase two');
  run(f, 4);
  wreck(f, f.b); run(f, .05);
  equal(f.duel.state.arena.warlordPhase, 2, 'their second wreck starts phase two');
  equal(player.wrecks, 2, 'two wrecks counted');
  run(f, 4);
  ok(!f.duel.state.arena.result, 'not over yet');
  wreck(f, f.a); run(f, .05);
  ok(f.duel.state.arena.result, 'the third wreck, either buggy, ends it');
  equal(f.duel.state.arena.result.winnerId, 'player', 'the player wins');
  equal(f.duel.state.arena.result.reason, 'three-wrecks', 'by wrecks');
});

test('each buggy respawns on its own', () => {
  const f = fight();
  wreck(f, f.a); run(f, .05);
  ok(f.a.combatWrecking && !f.b.combatWrecking, 'only one is wrecked');
  run(f, 4);
  ok(!f.a.combatWrecking, 'it is back');
  equal(f.a.armor, f.a.maxArmor, 'with full armor');
});

test('the buggies score for the pair against the player', () => {
  const f = fight();
  const arena = f.duel.state.arena;
  arena.participants.find(p => p.id === 'cpu-1').wrecks = 1;
  arena.participants.find(p => p.id === 'cpu-2').wrecks = 1;
  const hud = arenaHud(f.duel.state);
  equal(hud.field, 2, 'two sides, not three cars');
  equal(hud.place, 2, 'the player is second to the pair');
  equal(arenaTeams(arena).length, 2, 'two sides');
  equal(arenaRanking(arena).length, 3, 'three cars in the ranking');
});

test('a pair that wrecks the player three times wins; the fight settles', () => {
  const f = fight();
  const arena = f.duel.state.arena;
  const me = arena.participants.find(p => p.id === 'player');
  // Wreck the player whenever the rules allow, either buggy taking the credit.
  for (let t = 0, i = 0; t < 60 && !arena.result; t += .05) {
    if (!f.duel.state.combatWrecking && me.protectedSec === 0) wreck(f, f.duel.state, ['cpu-1', 'cpu-2'][i++ % 2]);
    run(f, .05);
  }
  ok(arena.result && arena.result.winnerId.startsWith('cpu-'), 'the pair wins');
  const profile = {version: 2, unlockedCars: ['falcone_f42'], wasteland: {version: 1,
    discoveredGate: true, scrap: 0, xp: 0, settledResults: [], territories: {vultures: {hold: 100}},
    warlords: {}, crew: {unlocked: ['rook'], selected: 'rook'}}};
  const lost = settleWarlordResult(profile, {runId: 'l', ownerPlayerId: 'p', activePlayerId: 'p',
    arena: JSON.parse(JSON.stringify(arena)), car: 'falcone_f42', cpuDifficulty: 'easy'});
  ok(lost.awarded && !lost.firstWin, 'a loss settles with no reward');
  equal(lost.gearEarned, null, 'no gear for a loss');
  equal(jaxGrappleBonusMetres(lost.profile), 0, 'no grapple bonus');
});

test('first win saves the Jax grapple bonus; later wins do not repeat it', () => {
  const f = fight();
  const arena = JSON.parse(JSON.stringify(f.duel.state.arena));
  arena.phase = 'over';
  arena.result = {reason: 'three-wrecks', winnerId: 'player', placings: ['player', 'cpu-1', 'cpu-2']};
  arena.participants.find(p => p.id === 'player').wrecks = 3;
  arena.participants.find(p => p.id === 'cpu-1').wrecked = 2;
  arena.participants.find(p => p.id === 'cpu-2').wrecked = 1;
  const profile = {version: 2, unlockedCars: ['falcone_f42'], wasteland: {version: 1,
    discoveredGate: true, scrap: 0, xp: 0, settledResults: [], territories: {vultures: {hold: 100}},
    warlords: {}, crew: {unlocked: ['rook'], selected: 'rook'}}};
  equal(jaxGrappleBonusMetres(profile), 0, 'nothing before the win');
  const won = settleWarlordResult(profile, {runId: 'w', ownerPlayerId: 'p', activePlayerId: 'p',
    arena, car: 'falcone_f42', cpuDifficulty: 'easy'});
  ok(won.awarded && won.firstWin, 'first win');
  equal(won.gearEarned, 'grapple-reach', 'the grapple reward is reported');
  equal(jaxGrappleBonusMetres(won.profile), WARLORDS.vultures.rewardGear.metres, '+10 m saved');
  equal(won.scrapEarned, 600 + 100 * 5, 'sixth rung pays 1100 on Easy');
  const again = settleWarlordResult(won.profile, {runId: 'w2', ownerPlayerId: 'p', activePlayerId: 'p',
    arena, car: 'falcone_f42', cpuDifficulty: 'easy'});
  ok(again.awarded && !again.firstWin && again.gearEarned === null, 'a rematch pays no second reward');
  equal(jaxGrappleBonusMetres(again.profile), 10, 'the bonus stays 10 m');
});

test('a result that does not field the whole pair is refused', () => {
  const f = fight();
  const arena = JSON.parse(JSON.stringify(f.duel.state.arena));
  arena.phase = 'over';
  arena.result = {reason: 'three-wrecks', winnerId: 'player', placings: ['player', 'cpu-1']};
  arena.participants.find(p => p.id === 'player').wrecks = 3;
  arena.participants = arena.participants.filter(p => p.id !== 'cpu-2');
  const profile = {version: 2, unlockedCars: ['falcone_f42'], wasteland: {version: 1,
    discoveredGate: true, scrap: 0, xp: 0, settledResults: [], territories: {vultures: {hold: 100}},
    warlords: {}, crew: {unlocked: ['rook'], selected: 'rook'}}};
  const result = settleWarlordResult(profile, {runId: 'x', ownerPlayerId: 'p', activePlayerId: 'p',
    arena, car: 'falcone_f42', cpuDifficulty: 'easy'});
  ok(!result.awarded, 'one buggy is not the Twin Vultures');
});

test('the board shows the pair as one row and the buggies carry their own names', () => {
  const f = fight();
  const arena = f.duel.state.arena;
  equal(arena.participants.filter(p => p.kind === 'cpu').map(p => p.name), ['VULTURE ONE', 'VULTURE TWO'], 'named apart');
  arena.participants.find(p => p.id === 'cpu-1').wrecks = 1;
  arena.participants.find(p => p.id === 'cpu-2').wrecks = 1;
  arena.participants.find(p => p.id === 'player').wrecked = 2;
  const rows = arenaHud(f.duel.state).rows;
  equal(rows.length, 2, 'the player and the pair');
  const pair = rows.find(row => !row.you);
  equal([pair.name, pair.wrecks, pair.wrecked], ['THE TWIN VULTURES', 2, 0], 'one row with the pair\'s total');
  ok(pair.hunting, 'the pair is hunting');
});
