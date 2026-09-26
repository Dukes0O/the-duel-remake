import assert from 'node:assert/strict';
import {test} from 'node:test';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {arenaHud, arenaMarker, arenaYardPanel, arenaResultsScreen, arenaPauseScreen} from '../src/screen-arena.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {screenMetric, screenAction} from '../src/screen-results.js';
import {ARENA_DRIVER_NAMES} from '../src/arena/arena-event.js';
import {ufoDestination, fireWeapon} from '../src/combat.js';

// ARENA-01-UI (docs/SCRAPDOME.md sections 3 and 6). Synthetic storage only.
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
globalThis.cancelAnimationFrame = () => {};

const escapeHTML = value => String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const views = {metric: screenMetric, action: (label, verb, primary) => screenAction(label, verb, primary),
  escapeHTML, time: seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`};
const ON = {wasteland2: true, 'hidden-road': true, scrapdome: true};
const FIELD = [{car: 'dusthawk_rally'}, {car: 'aurora_gt'}, {car: 'stuttgart_959s'}];

function fight() {
  const duel = new Duel({seed: 1989, featureFlags: ON});
  assert.equal(duel.startArenaEvent({car: 'banshee_muscle', cpuDifficulty: 'medium', seed: 1989, opponents: FIELD}), true);
  duel.state.countdown = 0; duel.step(1 / 120);
  return duel;
}

function appInYard({scrapdome = true, discovered = true} = {}) {
  values.clear();
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {...ON, scrapdome}});
  app.audio.unlock = () => {};
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: discovered}};
  assert.equal(app._saveProfile(), true);
  if (discovered) {
    assert.equal(app.visitWasteland(), true);
    app.advance(8);
    assert.equal(app.isYardHomeActive(), true);
  }
  return app;
}

test('the display shows time left, placing, names and who is hunting the player', () => {
  const duel = fight(), s = duel.state;
  const hud = arenaHud(s);
  assert.equal(hud.timeLabel, 'TIME LEFT');
  assert.ok(hud.remainingSec > 149 && hud.remainingSec <= 150);
  assert.equal(hud.field, 4);
  assert.deepEqual(hud.rows.map(row => row.name).sort(), ['YOU', ...ARENA_DRIVER_NAMES].sort());
  s.arena.participants[1].targetId = 'player';
  const hunted = arenaHud(s);
  assert.deepEqual(hunted.huntedBy, ['GASKET']);
  assert.equal(hunted.rows.find(row => row.name === 'GASKET').hunting, true);
  assert.deepEqual(arenaMarker(s, s.opponents[0]), {heading: 'GASKET', style: 'RAMMER', hunting: true, protected: false});
  s.arena.participants[1].wrecks = 2;
  assert.equal(arenaHud(s).leaderText, 'GASKET LEADS');
  assert.equal(arenaHud(s).place, 2);
  s.arena.phase = 'sudden-death';
  assert.match(arenaHud(s).timeLabel, /SUDDEN DEATH/);
  s.combatWrecking = true; s.combatWreckTimer = 2.2;
  assert.equal(arenaHud(s).respawnSec, 3);
  assert.equal(arenaHud({}), null, 'races have no arena display');
});

test('the yard panel offers one to three computer cars and an entry button', () => {
  const panel = arenaYardPanel({opponents: 2, difficulty: 'hard'});
  assert.equal((panel.match(/data-arena-opponents=/g) || []).length, 3);
  assert.match(panel, /data-arena-opponents="2" aria-pressed="true"/);
  assert.match(panel, /data-action="arena-start"/);
  assert.match(panel, /HARD/);
  const profile = {wasteland: {scrap: 10, territories: {}}};
  const without = yardHomeScreen({profile, playerName: 'A', escapeHTML});
  assert.doesNotMatch(without, /yard-scrapdome/, 'no SCRAPDOME entry while the switch is off');
  const withArena = yardHomeScreen({profile, playerName: 'A', escapeHTML, panel: 'scrapdome', arenaMarkup: panel});
  assert.match(withArena, /data-action="yard-scrapdome"/);
  assert.match(withArena, /ENTER THE SCRAPDOME/);
});

test('results and pause screens offer rematch and the way back to the yard', () => {
  const duel = fight(), s = duel.state;
  s.arena.participants[0].wrecks = 3;
  s.arena.clockSec = s.arena.timeLimitSec - 1 / 240;
  duel.step(1 / 120);
  assert.equal(s.status, 'arena_result');
  const result = arenaResultsScreen(s, views);
  assert.match(result.title, /LAST CAR/);
  assert.match(result.eyebrow, /VICTORY/);
  assert.match(result.actions, /arena-rematch/);
  assert.match(result.actions, /arena-yard/);
  assert.match(result.extra, /1ST[\s\S]*YOU/);
  const paused = fight();
  paused.state.paused = true;
  const pause = arenaPauseScreen(paused.state, views);
  assert.match(pause.actions, /resume/);
  assert.match(pause.actions, /arena-rematch/);
  assert.match(pause.actions, /arena-yard/);
});

test('the app offers the Scrapdome only in the yard, to a player who found the gate, with the switch on', () => {
  const off = appInYard({scrapdome: false});
  assert.equal(off.arenaAvailable(), false);
  assert.equal(off.startArenaEvent(), false);
  off.dispose?.();
  const stranger = appInYard({discovered: false});
  assert.equal(stranger.arenaAvailable(), false);
  assert.equal(stranger.startArenaEvent(), false, 'not from the main menu');
  stranger.dispose?.();
  const app = appInYard();
  assert.equal(app.arenaAvailable(), true);
  app.returnToMenu();
  assert.equal(app.startArenaEvent(), false, 'never from the main menu');
  app.visitWasteland(); app.advance(8);
  assert.equal(app.startArenaEvent({opponents: 2}), true);
  assert.equal(app.duel.state.arena.participants.length, 3);
  assert.equal(app.duel.state.car, app.menuCar);
  app.dispose?.();
});

test('an arena round never settles or restarts as a race, and returns to the yard', () => {
  const app = appInYard();
  const before = {history: app.profile.history.length, credits: app.profile.credits,
    settled: app.profile.settledResults.length};
  assert.equal(app.startArenaEvent({opponents: 3}), true);
  const firstRun = app.runId;
  app.advance(6);
  assert.equal(app.duel.state.status, 'racing');
  assert.equal(app.profile.activeRace, null, 'no interrupted-race record for an arena round');
  assert.equal(app.restart(), true, 'restart is a rematch');
  assert.notEqual(app.runId, firstRun);
  assert.ok(app.duel.state.arena, 'still an arena event');
  assert.equal(app.duel.state.arena.clockSec, 0);
  app.advance(4);
  assert.equal(app.returnToYard(), true);
  assert.equal(app.duel.state.arena, null);
  app.advance(8);
  assert.equal(app.isYardHomeActive(), true, 'back in the yard');
  assert.equal(app.profile.history.length, before.history);
  assert.equal(app.profile.credits, before.credits);
  assert.equal(app.profile.settledResults.length, before.settled);
  app.dispose?.();
});

test('the UFO hops straight ahead in the arena, with no once-per-lap limit', () => {
  const duel = fight(), s = duel.state;
  Object.assign(s, {s: 100, prevS: 100, lateral: 0, prevLateral: 0, headingError: 0, speedMph: 30});
  for (const other of s.opponents) Object.assign(other, {s: 300, lateral: 0});
  const first = ufoDestination(duel);
  assert.equal(first.kind, 'jump');
  assert.equal(first.arena, true);
  assert.equal(fireWeapon(duel, 'ufo'), true);
  assert.ok(s.s > 105, 'moved ahead');
  s.combat.cooldowns.ufo = 0;
  assert.equal(ufoDestination(duel).kind, 'jump', 'available again after its recharge');
  Object.assign(s, {lateral: 16.5, headingError: Math.PI / 2});
  assert.equal(ufoDestination(duel).kind, 'blocked', 'no hop through the wall');
});
