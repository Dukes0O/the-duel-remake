import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {combatTeam, hostile, arenaStrikeCandidates} from '../src/combat-teams.js';
import {territoryPanel} from '../src/screen-territory.js';
import * as screens from '../src/screen-arena.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {screenMetric, screenAction} from '../src/screen-results.js';
import {COURSE} from '../src/config.js';

// WAR-02a-FORMAT: SCRAPDOME section 5, settled ladder and shared fight rules.
// All storage here is synthetic. No browser, real profile or graphics needed.
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
globalThis.cancelAnimationFrame = () => {};
const ON = {wasteland2: true, 'hidden-road': true, scrapdome: true, warlords: true};
const DT = 1 / 120;
let checks = 0;
const equal = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const ok = (condition, message) => { checks++; assert.ok(condition, message); };
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const views = {metric: screenMetric, action: screenAction, escapeHTML};
let modulePromise;
async function rules() {
  const module = await (modulePromise ??= import('../src/arena/warlord-event.js').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('warlord-event.js')) return null;
    throw error;
  }));
  ok(module, 'WAR-02a-FORMAT must expose the headless warlord event API');
  equal(typeof module.startWarlordEvent, 'function', 'startWarlordEvent is a public arena entry point');
  equal(typeof module.beginWarlordEvent, 'function', 'beginWarlordEvent accepts the intro before countdown');
  return module;
}
async function fight({difficulty = 'medium', seed = 1989, begin = true, flags = ON} = {}) {
  const api = await rules();
  const duel = new Duel({seed, featureFlags: flags});
  equal(api.startWarlordEvent(duel, {warlordId: 'sal', car: 'falcone_f42', cpuDifficulty: difficulty, seed}),
    true, 'Sal starts through the public event API');
  if (begin) {
    equal(api.beginWarlordEvent(duel), true, 'the intro can start the countdown');
    duel.state.countdown = 0;
    duel.step(DT); duel.step(DT);
  }
  return duel;
}
function victim(duel, id) { return id === 'player' ? duel.state : duel.state.opponents.find(a => a.arenaId === id); }
function wreck(duel, id, owner) {
  const actor = victim(duel, id), participant = duel.state.arena.participants.find(p => p.id === id);
  // Restore a respawned actor between controlled hits, as in test-arena-event.
  participant.protectedSec = 0; participant.wreckCounted = false;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  actor.combatWrecking = false; actor.damageCooldown = 0; actor.armor = 1;
  duel.state.invulnerableSec = 0;
  applyArmorDamage(duel, actor, owner ? 'crossbow' : 'scenery', owner ? {owner} : {});
  duel.step(DT);
}
function yard({hold = 100, discovered = true, scrapdome = true, warlords = true} = {}) {
  values.clear();
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {...ON, scrapdome, warlords}});
  app.audio.unlock = () => {};
  app.profile.wasteland.discoveredGate = discovered;
  app.profile.wasteland.territories.sal.hold = hold;
  app._saveProfile();
  if (discovered) { app.visitWasteland(); app.advance(8); }
  return app;
}
function wallet(app) {
  return {credits: app.profile.credits, scrap: app.profile.wasteland.scrap,
    history: app.profile.history, settledResults: app.profile.settledResults};
}
function requireAppEntry(app) {
  equal(typeof app.startWarlordFight, 'function', 'the territory FIGHT action has an app entry point');
  equal(typeof app.beginWarlordFight, 'function', 'the app accepts the intro before countdown');
}

test('Sal is a one-on-one rammer duel in the Scrapdome using the selected difficulty', async () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const duel = await fight({difficulty});
    equal(duel.state.arena.mode, 'warlord', 'the format has its own rule identity');
    equal(duel.state.arena.warlordId, 'sal', 'result settlement can identify Sal');
    equal(duel.state.arena.venueId, 'scrapdome', 'the fight uses the arena venue');
    equal(duel.state.opponents.length, 1, 'Sal has no extra opponents in her duel');
    equal(duel.state.opponents[0].car, 'banshee_muscle', 'Sal drives the settled Banshee Muscle');
    equal(duel.state.arena.participants.map(p => p.brain), [null, 'rammer'], 'plain rammer before WAR-02a-SAL');
    equal(duel.state.cpuDifficulty, difficulty, 'difficulty follows the SCRAPDOME setting');
    equal(duel.state.traffic.length, 0, 'traffic does not join the duel');
  }
});

test('Sal has exactly one and a half times the same car normal arena armor', async () => {
  const duel = await fight();
  const normal = new Duel({seed: 1989, featureFlags: ON});
  normal.startArenaEvent({car: 'falcone_f42', cpuDifficulty: 'medium', seed: 1989,
    opponents: [{car: 'banshee_muscle'}]});
  equal(duel.state.maxArmor, normal.state.maxArmor, 'player armor keeps ordinary arena scale');
  equal(duel.state.opponents[0].maxArmor, normal.state.opponents[0].maxArmor * 1.5, 'boss arena armor is 1.5 times');
  equal(duel.state.opponents[0].armor, duel.state.opponents[0].maxArmor, 'boss starts with full armor');
});

for (const winner of ['player', 'cpu-1']) test(`${winner} wins immediately on their third wreck`, async () => {
  const duel = await fight(), loser = winner === 'player' ? 'cpu-1' : 'player';
  for (let count = 1; count <= 3; count++) {
    wreck(duel, loser, winner);
    equal(duel.state.arena.participants.find(p => p.id === winner).wrecks, count, 'each wreck counts once');
    if (count < 3) equal(duel.state.status, 'racing', 'one and two wrecks do not settle the duel');
  }
  equal(duel.state.status, 'arena_result', 'third wreck ends before the clock');
  equal(duel.state.arena.result.winnerId, winner, 'the driver reaching three is the winner');
  const result = structuredClone(duel.state.arena.result);
  duel.step(1);
  equal(duel.state.arena.result, result, 'later steps cannot repeat or replace the result');
});

test('only the first boss wreck advances the phase-two hook, exactly once', async () => {
  const duel = await fight(), events = [];
  duel.onChange((_state, event) => { if (event.warlordPhase) events.push(event.warlordPhase); });
  equal(duel.state.arena.warlordPhase, 1, 'the fight starts in phase one');
  wreck(duel, 'player', 'cpu-1');
  equal(duel.state.arena.warlordPhase, 1, 'a player wreck does not enrage the boss');
  wreck(duel, 'cpu-1', 'player');
  equal(duel.state.arena.warlordPhase, 2, 'the first boss wreck activates phase two');
  wreck(duel, 'cpu-1', 'player');
  equal(events, [{warlordId: 'sal', phase: 2}], 'one phase event supports later signature moves');
});

test('the intro shows name, car and taunt and freezes the fight until accepted', async () => {
  const duel = await fight({begin: false});
  equal(duel.state.status, 'warlord_intro', 'intro appears before the countdown');
  equal(duel.state.arena.phase, 'intro', 'the event has not started fighting');
  duel.step(1);
  equal(duel.state.arena.clockSec, 0, 'reading the intro costs no fight time');
  equal(typeof screens.warlordIntroScreen, 'function', 'the intro has a pure presentation function');
  const screen = screens.warlordIntroScreen(duel.state, views);
  const text = Object.values(screen).join(' ');
  ok(/SAWTOOTH SAL/i.test(text), 'intro names Sal');
  ok(/BANSHEE MUSCLE/i.test(text), 'intro names her car');
  ok(typeof screen.description === 'string' && screen.description.trim().length > 0, 'intro has one text taunt');
  const api = await rules();
  equal(api.beginWarlordEvent(duel), true, 'accepting starts countdown');
  equal(duel.state.status, 'countdown', 'there is a countdown after the intro');
  equal(api.beginWarlordEvent(duel), false, 'repeated acceptance cannot restart the countdown');
});

test('240 seconds always opens sudden death, even with a wreck lead', async () => {
  const duel = await fight(), arena = duel.state.arena;
  equal(arena.timeLimitSec, 240, 'regular fight lasts four minutes');
  arena.participants[0].wrecks = 2; arena.participants[1].wrecked = 2;
  arena.clockSec = 240 - 2 * DT;
  duel.step(DT);
  equal(arena.phase, 'fight', 'the deadline does not arrive early');
  duel.step(DT);
  equal(arena.phase, 'sudden-death', 'a score lead never skips sudden death');
  equal(arena.result, null, 'four minutes alone does not decide the winner');
});

for (const owner of ['cpu-1', null]) test(`the next sudden-death player wreck wins for Sal (${owner ?? 'wall'})`, async () => {
  const duel = await fight(), arena = duel.state.arena;
  arena.participants[0].wrecks = 2; arena.participants[1].wrecked = 2;
  arena.clockSec = 240 - DT / 2;
  duel.step(DT);
  equal(arena.phase, 'sudden-death', 'sudden death begins while the player leads');
  wreck(duel, 'player', owner);
  equal(arena.result?.winnerId, 'cpu-1', 'next wreck wins regardless of previous score or hit credit');
  equal(arena.result?.reason, 'sudden-death', 'result states sudden death');
});

test('without a sudden-death wreck, damage decides rather than prior wreck totals', async () => {
  const duel = await fight(), arena = duel.state.arena;
  arena.participants[0].wrecks = 2; arena.participants[1].wrecked = 2;
  arena.participants[0].damageDealt = 10; arena.participants[1].damageDealt = 20;
  arena.clockSec = 240 - DT / 2; duel.step(DT);
  equal(arena.phase, 'sudden-death', 'the four-minute mark does not rank the existing lead');
  ok(Number.isFinite(arena.suddenDeathLimitSec) && arena.suddenDeathLimitSec > 0,
    'the damage fallback has a finite deadline');
  arena.suddenDeathSec = arena.suddenDeathLimitSec - DT / 2;
  duel.step(DT);
  equal(arena.result?.winnerId, 'cpu-1', 'more damage wins the fallback despite fewer wrecks');
  equal(arena.result?.reason, 'damage', 'result explains the damage decision');
});

test('boss and future escorts share a team and cannot target or strike one another', async () => {
  const duel = await fight(), boss = duel.state.opponents[0];
  const escort = {...boss, arenaId: 'escort-1'};
  duel.state.opponents.push(escort);
  duel.state.arena.participants.push({...duel.state.arena.participants[1], id: 'escort-1'});
  equal(combatTeam(duel, boss), 'warlord:sal', 'boss team has stable warlord identity');
  equal(hostile(duel, boss, escort), false, 'escorts are allied with their warlord');
  equal(hostile(duel, boss, duel.state), true, 'the player is the enemy');
  equal(arenaStrikeCandidates(duel, boss.arenaId).map(a => a === duel.state ? 'player' : a.arenaId),
    ['player'], 'boss shots exclude allies');
  equal(arenaStrikeCandidates(duel, 'player').map(a => a.arenaId), ['cpu-1', 'escort-1'], 'player shots may hit the boss team');
});

test('disabled switches and unknown warlords cannot start a duel', async () => {
  const api = await rules();
  for (const flags of [{...ON, scrapdome: false}, {...ON, wasteland2: false}]) {
    const duel = new Duel({featureFlags: flags});
    const before = JSON.stringify(duel.state), arenaBefore = duel.state.arena, ownArena = Object.hasOwn(duel.state, 'arena');
    equal(api.startWarlordEvent(duel, {warlordId: 'sal'}), false, 'both arena and Wasteland rules are required');
    equal(JSON.stringify(duel.state), before, 'a rejected start preserves the complete state');
    equal(duel.state.arena, arenaBefore, 'a rejected start preserves the arena value');
    equal(Object.hasOwn(duel.state, 'arena'), ownArena, 'a rejected start preserves property presence');
  }
  equal(api.startWarlordEvent(new Duel({featureFlags: ON}), {warlordId: 'unknown'}), false, 'unknown boss is rejected');
});

test('a full territory advertises and launches FIGHT from the yard only', () => {
  const app = yard();
  try {
    ok(/data-warlord="sal">FIGHT/.test(territoryPanel(app.profile)), 'built Sal appears on the territory FIGHT card');
    requireAppEntry(app);
    app.cpuDifficulty = 'hard';
    equal(app.startWarlordFight('sal'), true, 'territory action starts Sal');
    equal(app.duel.state.status, 'warlord_intro', 'territory entry shows the intro first');
    equal(app.duel.state.cpuDifficulty, 'hard', 'entry preserves selected difficulty');
    equal(app.profile.activeRace, null, 'warlord fight never creates a racing save record');
    equal(app.beginWarlordFight(), true, 'app can confirm the intro');
    app.returnToMenu();
    equal(app.startWarlordFight('sal'), false, 'the main menu cannot launch a warlord');
  } finally { app.dispose?.(); }
});

test('territory hold, discovery and switch access checks cannot be bypassed', () => {
  for (const options of [{hold: 99}, {discovered: false}, {scrapdome: false}]) {
    const app = yard(options);
    try {
      requireAppEntry(app);
      equal(app.startWarlordFight('sal'), false, 'an inaccessible territory fight is rejected');
      equal(app.duel.state.arena, null, 'failed launch cannot mutate arena state');
    } finally { app.dispose?.(); }
  }
});

test('a loss costs no credits or scrap and offers immediate rematch and yard return', () => {
  const app = yard();
  try {
    requireAppEntry(app);
    const before = structuredClone(wallet(app));
    equal(app.startWarlordFight('sal'), true, 'the loss scenario starts Sal');
    app.beginWarlordFight(); app.advance(4);
    wreck(app.duel, 'player', 'cpu-1'); wreck(app.duel, 'player', 'cpu-1'); wreck(app.duel, 'player', 'cpu-1');
    equal(app.duel.state.arena.result?.winnerId, 'cpu-1', 'Sal wins the loss scenario');
    equal(wallet(app), before, 'loss changes no racing results, credits or scrap');
    const result = screens.arenaResultsScreen(app.duel.state, views);
    ok(/REMATCH/.test(result.actions), 'loss offers REMATCH');
    ok(/BACK TO THE YARD/.test(result.actions), 'loss offers BACK TO THE YARD');
    equal(app.restart(), true, 'a rematch starts immediately');
    equal(app.duel.state.arena.warlordId, 'sal', 'rematch keeps the same boss');
    equal(app.duel.state.arena.participants.length, 2, 'rematch does not become Last Car Rolling');
    equal(app.duel.state.arena.participants.map(p => p.wrecks), [0, 0], 'rematch resets scores');
    equal(app.duel.state.arena.warlordPhase, 1, 'rematch resets phase two');
    equal(app.returnToYard(), true, 'return works from the rematch intro');
    app.advance(8);
    equal(app.isYardHomeActive(), true, 'back at the yard home');
    equal(app.duel.state.arena, null, 'return clears the event');
    equal(wallet(app), before, 'rematch and yard return have no loss fee');
  } finally { app.dispose?.(); }
});

async function scripted(fps) {
  const duel = await fight({seed: 713}), events = [], samples = [];
  duel.onChange((_state, event) => {
    if (event.arenaWreck || event.arenaResult || event.warlordPhase) events.push(event);
  });
  let tick = 0;
  for (let frame = 1; frame <= fps * 12; frame++) {
    const target = Math.min(1440, Math.floor(frame * 120 / fps + 1e-9));
    while (tick < target) {
      if (tick % 120 === 0) duel.setInput({throttle: .8, brake: 0, steer: Math.sin(tick / 240) * .2, boost: false});
      if ([240, 720, 1200].includes(tick)) wreck(duel, 'cpu-1', 'player');
      else duel.step(DT);
      tick++;
      if (tick % 120 === 0) samples.push([duel.state.s, duel.state.lateral, duel.state.speedMph,
        duel.state.opponents[0].s, duel.state.opponents[0].lateral, duel.state.arena.warlordPhase]);
    }
  }
  equal(duel.state.arena.result?.winnerId, 'player', 'scripted win reaches a result');
  return {samples, events, result: duel.state.arena.result};
}

test('same seed and inputs give identical positions, phases, wrecks and result at 30, 60 and 144 FPS', async () => {
  const first = await scripted(30);
  for (const fps of [30, 60, 144]) equal(await scripted(fps), first, `${fps} FPS repeats the same fight`);
});

function ordinaryReplay(spec) {
  const duel = new Duel({seed: spec.seed, featureFlags: ON});
  duel.startCampaign({seed: spec.seed, mode: spec.mode, car: 'falcone_f42',
    startStage: COURSE.findIndex(c => c.id === spec.course), difficulty: 'casual', cpuDifficulty: 'medium'});
  const samples = [];
  for (let tick = 0; tick < 1200; tick++) {
    duel.setInput({throttle: 1, brake: tick >= 800 ? .2 : 0, steer: tick < 500 ? .08 : -.04, boost: false});
    duel.step(DT);
    if (tick % 120 === 119) samples.push({status: duel.state.status, s: duel.state.s, lateral: duel.state.lateral,
      speedMph: duel.state.speedMph, time: duel.state.stageTimeSec, laps: duel.state.completedLaps,
      score: duel.state.score, rivals: duel.state.opponents.map(a => [a.s, a.lateral, a.speedMph]),
      result: duel.state.results});
  }
  return createHash('sha256').update(JSON.stringify(samples)).digest('hex');
}

test('ordinary duel, time trial and objective race fingerprints stay unchanged with the arena switch on', () => {
  const fixture = JSON.parse(readFileSync(new URL('./replays/warlord-format-ordinary.json', import.meta.url), 'utf8'));
  for (const spec of fixture.cases) equal(ordinaryReplay(spec), spec.fingerprint, `${spec.mode} / ${spec.course}: ordinary rules stay unchanged`);
});

test.after(() => console.log(`Warlord format: ${checks} acceptance checks executed.`));

test('launch controls stay inside the enabled yard and never appear in the main-menu armory', () => {
  const app = yard();
  try {
    const closed = yardHomeScreen({profile: app.profile, playerName: app.player.name,
      escapeHTML, panel: 'territory', arenaMarkup: ''});
    ok(!/data-warlord=/.test(closed), 'disabled scrapdome shows no inert FIGHT button');
    const open = yardHomeScreen({profile: app.profile, playerName: app.player.name,
      escapeHTML, panel: 'territory', arenaMarkup: screens.arenaYardPanel()});
    ok(/data-warlord="sal"/.test(open), 'the enabled yard exposes the territory entry');
    const armory = createArmoryScreen({profile: () => app.profile, credits: String,
      escapeHTML, getGarageMessage: () => '', kitsEnabled: () => true, action: screenAction});
    ok(!/data-warlord=/.test(armory()), 'main-menu armory keeps territory information read-only');
  } finally { app.dispose?.(); }
});

// Claude settled this separate dev gate after the Scrapdome release merge.
test('released Scrapdome keeps warlord development off in production', () => {
  equal(FEATURE_STATES.warlords, 'dev', 'warlords has its own settled development switch');
  const flags = createFeatureFlags({storage: null, qa: false, search: '?flags=warlords'});
  equal(flags.enabled('scrapdome'), true, 'ordinary Scrapdome is released');
  equal(flags.enabled('warlords'), false, 'production ignores a warlord development request');
});

test('disabled warlords reject headless and App launch without changing state', async () => {
  const api = await rules(), flags = {...ON, warlords: false};
  const duel = new Duel({featureFlags: flags}), before = JSON.stringify(duel.state);
  equal(api.startWarlordEvent(duel, {warlordId: 'sal'}), false, 'headless entry requires warlords');
  equal(JSON.stringify(duel.state), before, 'disabled headless entry preserves complete state');
  const app = yard({warlords: false});
  try {
    equal(app.arenaAvailable(), true, 'ordinary arena stays available');
    equal(app.startWarlordFight('sal'), false, 'App refuses unfinished warlord entry');
  } finally { app.dispose?.(); }
});

test('released yard shows no warlord launch or promise without the dev gate', () => {
  const app = yard({warlords: false});
  try {
    const options = {profile: app.profile, playerName: app.player.name, escapeHTML,
      arenaMarkup: screens.arenaYardPanel(), warlordsAvailable: false};
    ok(!/data-warlord=/.test(yardHomeScreen({...options, panel: 'territory'})), 'released yard has no FIGHT or REMATCH action');
    ok(!/Sal is waiting|fight her/.test(yardHomeScreen({...options, panel: 'career'})), 'released career promises no unfinished Sal');
    ok(!/fight her/.test(yardHomeScreen({...options, panel: 'home'})), 'released home promises no unfinished Sal');
    ok(/SCRAPDOME/.test(yardHomeScreen({...options, panel: 'home'})), 'released arena navigation stays present');
  } finally { app.dispose?.(); }
});

test('the foundation warlord mode cannot bypass its development gate', () => {
  const duel = new Duel({featureFlags: {...ON, warlords: false}}), before = JSON.stringify(duel.state);
  equal(duel.startArenaEvent({mode: 'warlord', opponents: 1}), false, 'foundation entry also requires warlords');
  equal(JSON.stringify(duel.state), before, 'foundation rejection preserves complete state');
});

test('intro acceptance cannot bypass a disabled warlord gate', async () => {
  const api = await rules(), duel = await fight({begin: false});
  duel.featureFlags = createFeatureFlags({storage: null, overrides: {...ON, warlords: false}});
  const before = JSON.stringify(duel.state);
  equal(api.beginWarlordEvent(duel), false, 'disabled dev gate prevents intro acceptance');
  equal(JSON.stringify(duel.state), before, 'rejected intro acceptance preserves complete state');
});
