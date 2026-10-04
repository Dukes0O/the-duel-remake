import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {EngineAudio} from '../src/audio.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {COURSE} from '../src/config.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {arenaRanking} from '../src/arena/arena-event.js';
import {initializeBountyHunt, noteBountyWreck, stepBountyHunt} from '../src/arena/modes/bounty-hunt.js';
import {arenaReward, settleArenaResult} from '../src/arena/arena-settlement.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {arenaHud, arenaBoardMarkup, arenaYardPanel} from '../src/screen-arena.js';
import {hazardsFor} from '../src/arsenal/hazards.js';
import {createProfile, createPlayerRegistry, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';

// ARENA-04, SCRAPDOME 10 and shared 3/6. Only real engine and App entry paths.
// Handover, hunter caps and Salt entry follow Claude's 2 October 00:30 answers.
const DT = 1 / 120;
// Arsenal (released 4 October 2026) is pinned off: the controls below are the earlier traces.
const ON = {'hidden-road': true,
  warlords: true, 'fuel-run': true, 'bounty-hunt': true, arsenal: false};
const FIELD = [{car: 'dusthawk_rally'}, {car: 'aurora_gt'}, {car: 'stuttgart_959s'}];
const admissionOnly = process.argv.includes('--admission-only');
const values = new Map(), savedGlobals = new Map(['localStorage', 'cancelAnimationFrame']
  .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let checks = 0, writes = 0, failWrites = false;
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => {
    if (failWrites) throw Error('synthetic Bounty write failure');
    writes++; values.set(String(key), String(value));
  },
  removeItem: key => values.delete(String(key)),
}});
Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value: () => {}});
const eq = (actual, expected, message) => {checks++; assert.deepEqual(actual, expected, message);};
const ok = (condition, message) => {checks++; assert.ok(condition, message);};
const near = (actual, expected, message) => ok(Math.abs(actual - expected) < 1e-7,
  message + ': expected ' + expected + ', received ' + actual);
after(() => {
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
  console.log('Bounty Hunt: ' + checks + ' acceptance checks reached' +
    (admissionOnly ? ' (admission only; downstream rules not run).' : '.'));
});
const rule = (name, fn) => {if (!admissionOnly) test(name, fn);};
const tick = (duel, count = 1) => {for (let n = 0; n < count; n++) duel.step(DT);};
const member = (duel, id) => duel.state.arena.participants.find(p => p.id === id);
const actor = (duel, id) => id === 'player' ? duel.state : duel.state.opponents.find(a => a.arenaId === id);
function started({flags = ON, difficulty = 'medium', seed = 1989, opponents = FIELD, venueId = 'scrapdome'} = {}) {
  const duel = new Duel({seed, featureFlags: flags});
  duel.state.wastelandGateDiscovered = true;
  const admitted = duel.startArenaEvent({venueId, mode: 'bounty-hunt', car: 'falcone_f42',
    cpuDifficulty: difficulty, playerId: 'bounty-test', seed, opponents, arsenalRank: 9});
  return {duel, admitted};
}
function start(options) {
  const {duel, admitted} = started(options);
  eq(admitted, true, 'real Duel entry must admit the implemented Bounty mode');
  // Complete countdown through the real engine; no Bounty state is fabricated.
  duel.state.countdown = 0; tick(duel);
  eq(duel.state.status, 'racing', 'native countdown reaches the Bounty fight');
  ok(duel.state.arena.bountyHunt, 'native initialization creates the readable bounty state');
  return duel;
}
function mark(duel) {
  const id = duel.state.arena.bountyHunt.markedId;
  ok(duel.state.arena.participants.some(p => p.id === id), 'the mark belongs to one actual participant');
  return id;
}
function protect(duel) {
  for (const p of duel.state.arena.participants) p.protectedSec = 10000;
}
function place(duel, id, s, lateral = 0) {
  Object.assign(actor(duel, id), {s, prevS: s, lateral, prevLateral: lateral,
    headingError: 0, speedMph: 0, yawVelocity: 0, pushVelocity: 0,
    impactTimer: 0, airborne: false, airHeight: 0, groundHeight: null});
}
function wreck(duel, victimId, owner = 'player') {
  duel.state.invulnerableSec = 0;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  const victim = actor(duel, victimId);
  victim.armor = 1;
  ok(applyArmorDamage(duel, victim, owner ? 'crossbow' : 'scenery',
    owner ? {owner} : {}) > 0, 'a real native armor hit causes the selected wreck');
  tick(duel);
}
function profile(rank = 9, discovered = true) {
  let xp = 0;
  for (let current = 1; current < rank; current++) xp += 400 + 150 * (current - 1);
  const p = createProfile();
  p.credits = 9000; p.unknownBountyRoot = {kept: true};
  p.wasteland = normalizeWasteland({...p.wasteland, xp, discoveredGate: discovered,
    scrap: 500, unknownBountyCareer: {kept: 7},
    territories: {...p.wasteland.territories, kettle: {hold: 10, claimed: false}}});
  return p;
}
function yard({rank = 9, discovered = true, flags = ON} = {}) {
  values.clear(); writes = 0; failWrites = false;
  const registry = createPlayerRegistry(profile(rank, discovered));
  eq(savePlayers(registry, globalThis.localStorage), true, 'fixture writes only the in-memory player registry');
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, qa: true, overrides: flags});
  app.audio.unlock = () => {};
  app.cpuDifficulty = 'medium';
  eq(app.profile.wasteland.rank, rank, 'the real profile normalizer derives the requested rank');
  if (discovered) {
    eq(app.visitWasteland(), true, 'the discovered named player enters the real yard');
    app.advance(8);
    eq(app.isYardHomeActive(), true, 'the real visit reaches the active yard');
  }
  return app;
}
function appFight(options) {
  const app = yard(options);
  eq(app.startArenaEvent({mode: 'bounty-hunt', opponents: 3}), true,
    'the actual discovered rank-nine yard action starts Bounty Hunt');
  eq(app.duel.state.arena.mode, 'bounty-hunt', 'App passes Bounty to the real simulation');
  app.duel.state.countdown = 0; tick(app.duel);
  return app;
}
function finishPlayerWin(app) {
  const duel = app.duel;
  wreck(duel, mark(duel), 'player');
  protect(duel);
  duel.state.arena.clockSec = 180 - DT / 2;
  tick(duel);
  eq(duel.state.status, 'arena_result', 'a real credited mark wreck and the whistle finish the event');
  eq(duel.state.arena.result.winnerId, 'player', 'the twenty-point player wins this actual result');
  return duel.state.arena.result;
}

test('Bounty Hunt has its own switch, released on 4 October 2026', () => {
  eq(FEATURE_STATES['bounty-hunt'], 'on', 'Bounty Hunt is released');
});
test('a dev Bounty switch cannot be enabled through Experimental or a URL', () => {
  // The dev rule is kept with the switch pinned to dev.
  const flags = createFeatureFlags({catalog: {...FEATURE_STATES, 'bounty-hunt': 'dev'},
    storage: {getItem: () => 'true'}, qa: false, search: '?flags=bounty-hunt'});
  eq(flags.enabled('bounty-hunt'), false, 'an unfinished dev mode stays absent from the released game');
  eq(createFeatureFlags({storage: null, qa: false}).enabled('bounty-hunt'), true, 'the released switch is on');
});
test('real native admission accepts Bounty with its switch enabled', () => {
  const {duel, admitted} = started();
  eq(admitted, true, 'startArenaEvent must accept Bounty rather than rejecting an unregistered mode');
  eq(duel.state.arena.mode, 'bounty-hunt', 'native admission creates the requested event');
});
test('initial mark and handover use the bounded Bounty cue only with its switch on', () => {
  const calls = [], state = {arena: {mode: 'bounty-hunt'}};
  const audio = new EngineAudio({flags: {enabled: name => name === 'bounty-hunt'}});
  audio.context = {state: 'running', currentTime: 0}; audio._syncMixer = () => {};
  audio._playCue = id => calls.push(id);
  audio.event({arenaLoaded: 'scrapdome'}, state, null);
  audio.event({bountyMark: {previousId: 'cpu-2', markedId: 'player'}}, state, null);
  eq(calls, ['arena.bounty-mark', 'arena.bounty-mark'], 'entry and each transfer play the mark cue');
  const cue = SOUND_BANK['arena.bounty-mark'];
  ok(cue?.flag === 'bounty-hunt' && cue.limit === 1 && cue.layers?.length === 2,
    'the mark cue is a bounded, two-layer procedural recipe behind the Bounty flag');
  const quiet = new EngineAudio({flags: {enabled: () => false}}), quietCalls = [];
  quiet.context = {state: 'running', currentTime: 0}; quiet._syncMixer = () => {};
  quiet._playCue = id => quietCalls.push(id);
  quiet.event({bountyMark: {previousId: 'cpu-2', markedId: 'player'}}, state, null);
  eq(quietCalls, [], 'Bounty transfer stays silent when its feature switch is off');
});
test('real native admission accepts Bounty on the Salt Flats', () => {
  const {duel, admitted} = started({venueId: 'salt-flats', flags: {...ON, 'salt-flats': true}});
  eq(admitted, true, 'native Salt Flats admission must accept the real Bounty mode');
  eq(duel.state.arena.venueId, 'salt-flats', 'native Bounty keeps the selected Salt venue');
  eq(duel.course.def.id, 'salt-flats', 'native Bounty actually drives the Salt course');
  ok(mark(duel).startsWith('cpu-'), 'native Medium Salt Bounty initializes an actual CPU mark');
});

test('rank-nine discovered App entry starts and settles Bounty on the actual Salt Flats', () => {
  const app = yard({flags: {...ON, 'salt-flats': true}}), before = structuredClone(app.profile);
  try {
    eq(app.startArenaEvent({venueId: 'salt-flats', mode: 'bounty-hunt', opponents: 3}), true,
      'rank-nine public App entry must admit Salt Flats Bounty');
    eq(app.duel.state.arena.venueId, 'salt-flats', 'public Bounty selection retains Salt venue');
    eq(app.duel.course.def.id, 'salt-flats', 'public Salt Bounty never silently launches Scrapdome');
    app.duel.state.countdown = 0; tick(app.duel);
    const result = finishPlayerWin(app), paid = values.get(PLAYERS_KEY), paidWrites = writes;
    const reward = arenaReward(app.duel.state.arena, 'medium');
    eq(result.scrapEarned, reward.total, 'the actual Salt Bounty result pays its arena reward');
    eq(app.profile.wasteland.scrap, before.wasteland.scrap + reward.total, 'Salt Bounty banks scrap once');
    eq(app.profile.credits, before.credits, 'Salt Bounty keeps racing credits unchanged');
    eq(app._settleArenaResult({result}, app.duel.state), false, 'the same genuine Salt result cannot pay twice');
    eq(values.get(PLAYERS_KEY), paid, 'duplicate Salt settlement preserves durable memory-only bytes');
    eq(writes, paidWrites, 'duplicate Salt settlement makes no extra write');
  } finally {app.dispose?.();}
});

test('switch-off and unknown-mode refusal preserve native state', () => {
  const duel = new Duel({seed: 1989, featureFlags: {...ON, 'bounty-hunt': false}});
  const before = JSON.stringify(duel.state);
  eq(duel.startArenaEvent({mode: 'bounty-hunt', seed: 42, opponents: FIELD}), false,
    'Bounty disabled refuses its real native entry');
  eq(JSON.stringify(duel.state), before, 'a refused Bounty does not replace any native state');
  eq(duel.startArenaEvent({mode: 'unknown-bounty-mode', opponents: FIELD}), false,
    'unknown modes remain rejected');
});
test('rank-nine discovered App entry starts the mode', () => {
  const app = yard();
  try {
    eq(app.startArenaEvent({mode: 'bounty-hunt'}), true, 'rank nine unlocks actual Bounty App entry');
    eq(app.duel.state.arena?.mode, 'bounty-hunt', 'the real App selects the requested mode');
  } finally {app.dispose?.();}
});
for (const [name, options] of [
  ['rank eight', {rank: 8}],
  ['undiscovered rank nine', {discovered: false}],
  ['Bounty disabled', {flags: {...ON, 'bounty-hunt': false}}],
]) test(name + ' cannot start Bounty or create a run receipt', () => {
  const app = yard(options);
  try {
    const before = JSON.stringify(app.duel.state), runId = app.runId;
    eq(app.startArenaEvent({mode: 'bounty-hunt'}), false, name + ' cannot start the public action');
    eq(JSON.stringify(app.duel.state), before, 'refused App entry preserves the existing native state');
    eq(app.runId, runId, 'refused entry does not create or replace a payable run');
  } finally {app.dispose?.();}
});
test('the actual yard panel offers Bounty only at rank nine with its switch', () => {
  const flags = createFeatureFlags({storage: null, qa: true, overrides: ON});
  const nine = arenaYardPanel({profile: profile(), featureFlags: flags, mode: 'bounty-hunt'});
  ok(nine.includes('data-arena-mode="bounty-hunt"'), 'rank-nine yard must expose a real Bounty mode choice');
  ok(/BOUNTY HUNT/.test(nine), 'the selected public mode has its own visible name');
});
test('rank-eight yard does not advertise the locked mode', () => {
  const eight = arenaYardPanel({profile: profile(8),
    featureFlags: createFeatureFlags({storage: null, qa: true, overrides: ON})});
  eq(eight.includes('data-arena-mode="bounty-hunt"'), false, 'rank eight has no unfinished or locked Bounty choice');
});

rule('three-minute event starts with one mark and zero integer scores', () => {
  const duel = start();
  eq(duel.state.arena.timeLimitSec, 180, 'Bounty uses the settled three-minute clock');
  eq(duel.state.arena.clockSec, 0, 'countdown time does not earn survival points');
  eq(duel.state.arena.suddenDeathLimitSec, 30, 'the shared next-wreck overtime is capped at thirty seconds');
  ok(mark(duel).startsWith('cpu-'), 'Medium starts on a computer car');
  eq(duel.state.arena.participants.map(p => p.bountyPoints), [0, 0, 0, 0],
    'all real participants start at zero points');
});
rule('Easy and Medium start on a CPU and Hard uses a repeatable seeded mark', () => {
  for (const difficulty of ['easy', 'medium']) for (const seed of [1, 17, 42, 1989]) {
    const duel = start({difficulty, seed});
    ok(mark(duel).startsWith('cpu-'), difficulty + ' never starts its mark on the player');
  }
  const hardMarks = new Set();
  for (let seed = 1; seed <= 32; seed++) {
    const a = start({difficulty: 'hard', seed}), b = start({difficulty: 'hard', seed});
    eq(mark(a), mark(b), 'the same Hard seed starts with the same mark');
    hardMarks.add(mark(a));
  }
  ok(hardMarks.has('player'), 'seeded Hard selection includes the player');
  ok([...hardMarks].some(id => id.startsWith('cpu-')), 'seeded Hard selection includes computer cars');
});
rule('the marked car earns whole points at one per second and paused/countdown time earns none', () => {
  const duel = start(), id = mark(duel);
  protect(duel); tick(duel, 119);
  eq(member(duel, id).bountyPoints, 0, 'less than one fight second gives no fractional point');
  tick(duel);
  eq(member(duel, id).bountyPoints, 1, 'one complete fight second gives exactly one point');
  tick(duel, 600);
  eq(member(duel, id).bountyPoints, 6, 'six fight seconds produce six points');
  eq(duel.state.arena.participants.filter(p => p.id !== id).map(p => p.bountyPoints),
    [0, 0, 0], 'unmarked cars do not earn passive points');
  duel.state.paused = true; tick(duel, 120);
  eq(member(duel, id).bountyPoints, 6, 'pausing cannot advance the scoring clock');
});
rule('a credited mark wreck gives exactly twenty points, transfers once, and scores only for its new owner', () => {
  const duel = start(), original = mark(duel), events = [];
  duel.onChange((_s, event) => {if (event.arenaWreck) events.push(event.arenaWreck);});
  wreck(duel, original, 'player');
  eq(events.at(-1), {victimId: original, creditedId: 'player'}, 'native wreck credit identifies the real wrecker');
  eq(member(duel, 'player').bountyPoints, 20, 'wrecking the actual marked car earns exactly twenty points');
  eq(mark(duel), 'player', 'the mark moves to the real credited wrecker');
  protect(duel); tick(duel, 121);
  eq(member(duel, 'player').bountyPoints, 21, 'the new owner earns the next full second');
  eq(member(duel, original).bountyPoints, 0, 'the wrecked former owner cannot keep scoring');
  eq(events.length, 1, 'remaining in wreck recovery cannot duplicate the award or transfer');
});
rule('a recent real hit followed by wall damage preserves shared wreck credit and the mark', () => {
  const duel = start(), original = mark(duel), victim = actor(duel, original);
  victim.armor = 100; duel.state.invulnerableSec = 0;
  ok(applyArmorDamage(duel, victim, 'crossbow', {owner: 'player'}) > 0,
    'the real player first damages the marked car without wrecking it');
  wreck(duel, original, null);
  eq(mark(duel), 'player', 'the recent native last attacker receives the wall-finished mark');
  eq(member(duel, 'player').bountyPoints, 20, 'recent attacker credit earns the settled wreck bonus');
});
rule('wrecking an unmarked car does not take the mark or earn its twenty-point bonus', () => {
  const duel = start(), original = mark(duel);
  const victim = duel.state.arena.participants.find(p => p.id !== original && p.id !== 'player');
  wreck(duel, victim.id, 'player');
  eq(mark(duel), original, 'the mark stays with the surviving marked car');
  eq(member(duel, 'player').bountyPoints, 0, 'an ordinary unmarked wreck gives no bounty bonus');
});
rule('a self-wreck with no prior hit passes the mark to a living score leader', () => {
  const duel = start(), original = mark(duel);
  member(duel, 'player').bountyPoints = 10;
  wreck(duel, original, null);
  eq(mark(duel), 'player', 'a no-attacker marked self-wreck passes to the living score leader');
  // The settled no-bonus and marked-victim exclusion have a separate native case below.
});
rule('a self-wreck excludes the marked score leader and gives its recipient no twenty-point bonus', () => {
  const duel = start(), original = mark(duel);
  member(duel, original).bountyPoints = 100;
  member(duel, 'player').bountyPoints = 10;
  const scores = duel.state.arena.participants.map(p => p.bountyPoints);
  wreck(duel, original, null);
  eq(mark(duel), 'player', 'the marked victim cannot be its own self-wreck fallback leader');
  eq(duel.state.arena.participants.map(p => p.bountyPoints), scores,
    'a no-attacker self-wreck awards nobody a twenty-point bonus');
});

function fallbackField(duel, original, unavailable) {
  const runners = duel.state.arena.participants.filter(p => p.id !== original && p.id !== unavailable);
  place(duel, original, 180);
  place(duel, unavailable, 380);
  place(duel, runners[0].id, 200);
  place(duel, runners[1].id, 300);
  return runners;
}

rule('a wrecking real last hitter passes the mark to the nearest running car', () => {
  const duel = start(), original = mark(duel);
  const hitter = duel.state.arena.participants.find(p => p.kind === 'cpu' && p.id !== original).id;
  const runners = fallbackField(duel, original, hitter);
  member(duel, runners[1].id).bountyPoints = 50;
  duel.state.invulnerableSec = 0;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  actor(duel, original).armor = 100;
  ok(applyArmorDamage(duel, actor(duel, original), 'crossbow', {owner: hitter}) > 0,
    'the actual hitter damages the marked car before being wrecked');
  eq(member(duel, original).lastHitBy, hitter, 'native damage retains the actual last hitter');
  wreck(duel, hitter, null);
  ok(actor(duel, hitter).combatWrecking, 'the hitter is still recovering at handover');
  wreck(duel, original, null);
  eq(mark(duel), runners[0].id, 'a wrecking last hitter yields to distance, not the next score leader');
  eq(member(duel, runners[0].id).bountyPoints, 0, 'the fallback runner gets the mark without a wreck bonus');
});

rule('a wrecking fallback leader passes the self-wreck mark to the nearest runner', () => {
  const duel = start(), original = mark(duel);
  const leader = duel.state.arena.participants.find(p => p.kind === 'cpu' && p.id !== original).id;
  const runners = fallbackField(duel, original, leader);
  member(duel, original).bountyPoints = 100;
  member(duel, leader).bountyPoints = 90;
  member(duel, runners[1].id).bountyPoints = 50;
  const scores = duel.state.arena.participants.map(p => p.bountyPoints);
  wreck(duel, leader, null);
  ok(actor(duel, leader).combatWrecking, 'the otherwise eligible score leader is still wrecking');
  wreck(duel, original, null);
  eq(mark(duel), runners[0].id, 'a wrecking leader falls back to the nearest running car');
  eq(duel.state.arena.participants.map(p => p.bountyPoints), scores,
    'the native self-wreck handover preserves every score');
});

rule('nearest-running distance ties follow the seeded order on repeat native events', () => {
  function tiedTransfer() {
    const duel = start({seed: 1990}), original = mark(duel);
    const leader = duel.state.arena.participants.find(p => p.kind === 'cpu' && p.id !== original).id;
    const runners = duel.state.arena.participants.filter(p => p.id !== original && p.id !== leader);
    member(duel, leader).bountyPoints = 90;
    wreck(duel, leader, null);
    place(duel, original, 0, 8);
    place(duel, runners[0].id, 0, 0);
    place(duel, runners[1].id, 0, 16);
    const origin = worldPose(duel, actor(duel, original));
    const distance = id => {
      const at = worldPose(duel, actor(duel, id));
      return Math.hypot(at.x - origin.x, at.z - origin.z);
    };
    eq(distance(runners[0].id), distance(runners[1].id), 'the real course provides exactly tied clear lateral slots');
    const expected = duel.state.arena.bountyHunt.order.find(id => runners.some(p => p.id === id));
    ok(expected !== runners[0].id, 'the seeded recipient differs from the first participant');
    const scores = duel.state.arena.participants.map(p => p.bountyPoints);
    duel.state.invulnerableSec = 0;
    for (const p of duel.state.arena.participants) p.protectedSec = 0;
    actor(duel, original).armor = 1;
    ok(applyArmorDamage(duel, actor(duel, original), 'scenery') > 0, 'a native scenery hit wrecks the mark');
    // A positive minimal native step processes wreck credit without rounding a
    // stationary tied pose into motion. Normal-speed hunting has separate tests.
    duel.step(Number.MIN_VALUE);
    eq(distance(runners[0].id), distance(runners[1].id), 'the native credit step preserves an exact distance tie');
    eq(mark(duel), expected, 'the event seeded order settles the exact distance tie');
    eq(duel.state.arena.participants.map(p => p.bountyPoints), scores, 'a tied fallback adds no wreck bonus');
    return {markedId: mark(duel), order: duel.state.arena.bountyHunt.order};
  }
  eq(tiedTransfer(), tiedTransfer(), 'the same native seed and tied handover reproduce the same recipient');
});

for (const [difficulty, expected] of [['easy', 1], ['medium', 2], ['hard', 3]])
  rule('a genuinely marked player keeps the ' + difficulty + ' hunter limit', () => {
    const duel = start({difficulty});
    if (mark(duel) !== 'player') wreck(duel, mark(duel), 'player');
    eq(mark(duel), 'player', 'the player owns the genuine seeded or credited mark');
    for (const p of duel.state.arena.participants) {
      p.protectedSec = 0;
      if (actor(duel, p.id).combatWrecking) actor(duel, p.id).combatWreckTimer = DT / 2;
    }
    tick(duel);
    for (const p of duel.state.arena.participants) {
      p.protectedSec = 0; p.targetId = null; p.targetHeldSec = 0; p.reactionSec = 0; p.goal = null;
      place(duel, p.id, p.kind === 'player' ? 180 : 240 + Number(p.id.slice(-1)) * 55);
    }
    tick(duel);
    const hunters = duel.state.arena.participants.filter(p => p.kind === 'cpu' && p.targetId === 'player');
    eq(hunters.length, expected, difficulty + ' applies its settled limit to the actual marked player');
    for (const p of hunters) ok(p.goal && [p.goal.x, p.goal.z, p.goal.speedMph].every(Number.isFinite),
      'each admitted hunter receives an actual native pilot goal');
  });

rule('unmarked computer cars hunt a marked CPU and the marked CPU steers away from a close pursuer', () => {
  const duel = start({difficulty: 'hard'}), id = mark(duel);
  // This fixture needs an initial CPU mark; choose a genuine eligible Hard seed.
  if (id === 'player') {
    const cpuSeed = Array.from({length: 32}, (_, n) => n + 1)
      .find(seed => started({difficulty: 'hard', seed}).duel.state.arena?.bountyHunt?.markedId?.startsWith('cpu-'));
    ok(cpuSeed, 'a native Hard seed marks a CPU');
    return checkHuntAndRun(start({difficulty: 'hard', seed: cpuSeed}));
  }
  checkHuntAndRun(duel);
});
function checkHuntAndRun(duel) {
  const id = mark(duel);
  place(duel, id, 180); place(duel, 'player', 165);
  for (const p of duel.state.arena.participants.filter(p => p.id !== id && p.kind === 'cpu'))
    place(duel, p.id, 230 + Number(p.id.slice(-1)) * 50);
  tick(duel);
  for (const p of duel.state.arena.participants.filter(p => p.id !== id && p.kind === 'cpu'))
    eq(p.targetId, id, 'every unmarked CPU selects the actual marked CPU');
  const p = member(duel, id), me = worldPose(duel, actor(duel, id)), hunter = worldPose(duel, duel.state);
  ok(p.goal && [p.goal.x, p.goal.z, p.goal.speedMph].every(Number.isFinite),
    'the marked CPU receives a real finite native pilot goal');
  ok(Math.hypot(p.goal.x - hunter.x, p.goal.z - hunter.z) > Math.hypot(me.x - hunter.x, me.z - hunter.z),
    'the marked CPU heads away when a pursuer closes');
}
rule('a marked CPU uses its equipped rear Oil through the existing Arsenal dev gate', () => {
  const duel = start({flags: {...ON, arsenal: true}}), id = mark(duel), cpu = actor(duel, id);
  cpu.weaponLoadout = ['crossbow', 'bomb', 'star', 'oil'];
  place(duel, id, 180); place(duel, 'player', 165);
  for (const p of duel.state.arena.participants.filter(p => p.kind === 'cpu' && p.id !== id))
    place(duel, p.id, 400 + Number(p.id.slice(-1)) * 60);
  duel.state.combat.aiTimer = 0;
  duel.state.combat.aiTurn = duel.state.opponents.indexOf(cpu);
  tick(duel);
  ok(hazardsFor(duel).some(h => h.kind === 'oil' && h.owner === cpu),
    'the real scheduled CPU attack deploys owned rear Oil when hunted from behind');
});
rule('most Bounty points at 180 seconds wins regardless of ordinary wreck ranking', () => {
  const duel = start(), winner = mark(duel);
  protect(duel);
  member(duel, winner).bountyPoints = 10;
  member(duel, 'player').wrecks = 99;
  duel.state.arena.clockSec = 180 - DT * 1.5;
  tick(duel);
  eq(duel.state.status, 'racing', 'the event stays open before the three-minute whistle');
  tick(duel);
  eq(duel.state.arena.result?.winnerId, winner, 'Bounty score rather than net wrecks decides the whistle');
  eq(duel.state.arena.result?.reason, 'time', 'a clear Bounty leader wins when time ends');
  eq(arenaRanking(duel.state.arena)[0].id, winner, 'native scoreboard ranking uses Bounty points');
});
rule('tied overtime ignores passive points and the next credited wreck wins even from below the leaders', () => {
  const duel = start();
  protect(duel); duel.state.arena.clockSec = 180 - DT / 2; tick(duel);
  eq(duel.state.arena.phase, 'sudden-death', 'equal points at the whistle enter shared sudden death');
  tick(duel, 120);
  eq(duel.state.status, 'racing', 'passive survival points cannot finish tied overtime');
  eq(duel.state.arena.phase, 'sudden-death', 'the next-wreck rule remains active after passive points');
  const marked = mark(duel), victim = duel.state.arena.participants.find(p => p.id !== marked && p.id !== 'player');
  wreck(duel, victim.id, 'player');
  eq(duel.state.arena.result?.winnerId, 'player', 'the next real credited wreck wins, including an unmarked victim');
  eq(duel.state.arena.result?.reason, 'sudden-death', 'the actual wreck finishes overtime');
});
rule('without a wreck, thirty seconds of overtime ends by damage dealt', () => {
  const duel = start();
  protect(duel); duel.state.arena.clockSec = 180 - DT / 2; tick(duel);
  eq(duel.state.arena.phase, 'sudden-death', 'the actual tied whistle opens overtime');
  member(duel, 'player').damageDealt = 10;
  member(duel, 'cpu-1').damageDealt = 40;
  member(duel, 'cpu-2').damageDealt = 20;
  duel.state.arena.suddenDeathSec = 30 - DT / 2; tick(duel);
  eq(duel.state.arena.result?.winnerId, 'cpu-1', 'the shared timeout awards the highest damage total');
  eq(duel.state.arena.result?.reason, 'damage', 'damage fallback ends overtime within thirty seconds');
});
rule('native HUD and scoreboard show Bounty points without mutating the event', () => {
  const duel = start(), id = mark(duel);
  member(duel, id).bountyPoints = 12;
  const before = JSON.stringify(duel.state.arena), hud = arenaHud(duel.state);
  ok(/BOUNTY/.test(hud.modeLabel), 'the real HUD identifies Bounty Hunt');
  ok(/POINTS/.test(hud.scoreText), 'the real HUD explains the player point score');
  ok(/POINTS/.test(arenaBoardMarkup(hud, value => String(value))), 'the actual scoreboard names its Bounty scoring column');
  eq(JSON.stringify(duel.state.arena), before, 'HUD and scoreboard reads never change simulation state');
});
rule('a genuine App result pays placing scrap and hold once, preserving credits and unknown fields', () => {
  const app = appFight(), before = structuredClone(app.profile);
  try {
    const result = finishPlayerWin(app), paid = values.get(PLAYERS_KEY), paidWrites = writes;
    const reward = arenaReward(app.duel.state.arena, 'medium');
    ok(reward.total > 0, 'a genuine Bounty finish earns the existing arena contract reward');
    eq(result.scrapEarned, reward.total, 'App displays only the actual arena reward');
    eq(app.profile.wasteland.scrap, before.wasteland.scrap + reward.total, 'the atomic named profile receives scrap');
    eq(result.holdAdded, 25, 'a three-opponent Bounty win adds the established territory hold');
    eq(app.profile.wasteland.territories.kettle.hold, 35, 'hold is added once to the same Scrapdome territory');
    eq(app.profile.credits, before.credits, 'Bounty does not touch ordinary credits');
    eq(app.profile.unknownBountyRoot, before.unknownBountyRoot, 'unknown root progress is preserved');
    eq(app.profile.wasteland.unknownBountyCareer, before.wasteland.unknownBountyCareer, 'unknown career progress is preserved');
    eq(app._settleArenaResult({result}, app.duel.state), false, 'a duplicate actual event cannot pay again');
    eq(values.get(PLAYERS_KEY), paid, 'the duplicate keeps the exact paid registry');
    eq(writes, paidWrites, 'the duplicate does not make another registry write');
    const duplicate = settleArenaResult(app.profile, {runId: app.runId,
      ownerPlayerId: app.player.id, activePlayerId: app.player.id,
      cpuDifficulty: 'medium', arena: app.duel.state.arena});
    eq(duplicate.awarded, false, 'the real stored receipt also guards pure settlement');
  } finally {app.dispose?.();}
});
rule('a genuine losing Bounty result pays placing scrap without hold or a loss charge', () => {
  const app = appFight(), before = structuredClone(app.profile);
  try {
    member(app.duel, mark(app.duel)).bountyPoints = 10;
    protect(app.duel); app.duel.state.arena.clockSec = 180 - DT / 2; tick(app.duel);
    ok(app.duel.state.arena.result.winnerId !== 'player', 'the real whistle produces a losing player result');
    ok(app.profile.wasteland.scrap > before.wasteland.scrap, 'a finished lower place earns the existing base/place contract');
    eq(app.duel.state.arena.result.holdAdded, 0, 'a losing player adds no territory hold');
    eq(app.profile.credits, before.credits, 'losing costs no ordinary credits');
  } finally {app.dispose?.();}
});
rule('a failed Bounty storage write cannot expose a banked reward or change durable progress', () => {
  const app = appFight(), durable = values.get(PLAYERS_KEY), before = structuredClone(app.profile);
  try {
    failWrites = true;
    const result = finishPlayerWin(app);
    eq(values.get(PLAYERS_KEY), durable, 'the failed real result write preserves all durable player bytes');
    eq(app.profile.wasteland.scrap, before.wasteland.scrap, 'failed storage leaves the unbanked scrap balance unchanged');
    eq(result.scrapEarned, 0, 'a failed save displays no banked scrap');
    eq(result.holdAdded, 0, 'a failed save displays no banked hold');
    eq(result.settlementSaved, false, 'the failed write is never reported as saved');
  } finally {failWrites = false; app.dispose?.();}
});

function framedBounty(fps) {
  const app = appFight(), duel = app.duel, events = [];
  duel.onChange((_state, event) => {
    if (event.arenaWreck || event.arenaPhase) events.push(structuredClone(event));
  });
  try {
    protect(duel); app.advance(2, 1 / fps);
    wreck(duel, mark(duel), 'player');
    protect(duel); app.advance(2, 1 / fps);
    duel.state.arena.clockSec = 180 - DT / 2;
    app.advance(.1, 1 / fps);
    eq(duel.state.status, 'arena_result', 'the framed native Bounty input finishes its actual event');
    return {arena: structuredClone(duel.state.arena), events,
      poses: [duel.state, ...duel.state.opponents].map(a =>
        [a.s, a.lateral, a.speedMph, a.armor, a.combatWrecking])};
  } finally {app.dispose?.();}
}
rule('the same real App Bounty inputs give identical points, transfers and results at 30, 60 and 144 FPS', () => {
  const baseline = framedBounty(30);
  for (const fps of [60, 144]) eq(framedBounty(fps), baseline,
    fps + ' FPS preserves the native Bounty state, car poses and events');
});

// Extend the current reviewed controls to Bounty flag configurations. Do not
// regenerate pins: same input, sample shape and existing literal fixture values.
function controls(spec, bountyEnabled) {
  const duel = new Duel({seed: spec.seed,
    featureFlags: {...ON, 'fuel-run': false, 'bounty-hunt': bountyEnabled}});
  duel.state.wastelandGateDiscovered = true;
  if (spec.kind === 'road') duel.startCampaign({seed: spec.seed, mode: spec.mode, car: 'falcone_f42', discoveredGate: true,
    startStage: COURSE.findIndex(c => c.id === spec.course), difficulty: 'casual', cpuDifficulty: 'medium'});
  else if (spec.kind === 'sal') {
    startWarlordEvent(duel, {warlordId: 'sal', seed: spec.seed, car: 'falcone_f42', cpuDifficulty: 'medium'});
    beginWarlordEvent(duel);
  } else duel.startArenaEvent({seed: spec.seed, mode: 'last-car-rolling', car: 'falcone_f42',
    cpuDifficulty: 'medium', opponents: FIELD});
  const samples = [];
  for (let n = 0; n < 1200; n++) {
    duel.setInput({throttle: 1, brake: n > 800 ? .2 : 0, steer: n < 500 ? .08 : -.04, boost: false});
    duel.step(DT);
    if (n % 120 === 119) samples.push({status: duel.state.status, s: duel.state.s,
      lateral: duel.state.lateral, speed: duel.state.speedMph, time: duel.state.stageTimeSec,
      rivals: duel.state.opponents.map(a => [a.s, a.lateral, a.speedMph, a.armor]),
      arena: structuredClone(duel.state.arena), results: structuredClone(duel.state.results)});
  }
  return createHash('sha256').update(JSON.stringify(samples)).digest('hex');
}
rule('Bounty disabled and enabled preserve the exact reviewed roads, Last Car Rolling and Sal pins', () => {
  const fixture = JSON.parse(readFileSync(new URL('./replays/arena-fuel-run-controls.json', import.meta.url), 'utf8'));
  for (const spec of fixture.cases) for (const enabled of [false, true])
    eq(controls(spec, enabled), spec.fingerprint, spec.kind + ': Bounty ' + enabled + ' preserves the exact current control pin');
});

// Module product regressions, not playable acceptance: Bounty admission and its
// native hooks remain pending. Keep actual Duel participants, actors and course;
// call the new module's public exports to isolate its pending handover rules.
function pendingModuleHandover() {
  const duel = new Duel({seed: 1989, featureFlags: ON});
  duel.state.wastelandGateDiscovered = true;
  eq(duel.startArenaEvent({mode: 'last-car-rolling', car: 'falcone_f42',
    cpuDifficulty: 'medium', seed: 1989, opponents: FIELD}), true,
  'the module regression starts from a genuine admitted native arena');
  duel.state.countdown = 0; tick(duel);
  eq(duel.state.status, 'racing', 'the genuine native countdown reaches racing');
  duel.state.arena.mode = 'bounty-hunt';
  duel.state.arena.timeLimitSec = 180;
  initializeBountyHunt(duel);
  const original = mark(duel), victim = member(duel, original);
  victim.bountyPoints = 5;
  member(duel, 'player').bountyPoints = 10;
  for (const participant of duel.state.arena.participants)
    actor(duel, participant.id).combatWrecking = true;
  eq(noteBountyWreck(duel, victim, null, null), null,
    'a marked self-wreck with no hitter neither credits a wreck nor ends the event');
  return {duel, original, scores: duel.state.arena.participants.map(p => p.bountyPoints)};
}

rule('module product regression: pending handover excludes a victim who recovers first', () => {
  const {duel, original, scores} = pendingModuleHandover();
  stepBountyHunt(duel, 1);
  eq(duel.state.arena.participants.map(p => p.bountyPoints), scores,
    'while every recipient is wrecking, the pending mark earns no passive points or bonus');
  actor(duel, original).combatWrecking = false;
  stepBountyHunt(duel, 1);
  eq(duel.state.arena.participants.map(p => p.bountyPoints), scores,
    'recovering before all recipients cannot let the marked victim resume passive scoring');
  actor(duel, 'player').combatWrecking = false;
  stepBountyHunt(duel, DT);
  eq(duel.state.arena.bountyHunt.markedId, 'player',
    'the pending self-wreck handover transfers to the other car when it recovers');
  eq(duel.state.arena.participants.map(p => p.bountyPoints), scores,
    'the delayed self-wreck handover adds no twenty-point bonus or whole-second score');
});

rule('module product regression: pending handover resolves during sudden death without passive points', () => {
  const {duel, scores} = pendingModuleHandover();
  duel.state.arena.phase = 'sudden-death';
  duel.state.arena.clockSec = 180;
  actor(duel, 'player').combatWrecking = false;
  stepBountyHunt(duel, 1);
  eq(duel.state.arena.bountyHunt.markedId, 'player',
    'sudden death still transfers the pending mark when another car recovers');
  eq(duel.state.arena.participants.map(p => p.bountyPoints), scores,
    'sudden-death handover awards neither passive survival points nor a self-wreck bonus');
  eq(duel.state.arena.result, null,
    'a recovery and mark transfer alone cannot finish next-credited-wreck sudden death');
});
