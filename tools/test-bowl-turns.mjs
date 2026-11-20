// BOWL-TURNS: the Turn Show, headless. The turn order, the scoreboard, and the
// save rule: two players take turns in the real App, and each save gets only its
// own scores and purse. Memory-only saves; no browser.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {PLAYERS_KEY, createPlayerRegistry, createProfile, loadPlayers, savePlayers} from '../src/progression.js';
import {BOWL_PURSE, bowlHudView} from '../src/bowl/bowl-night.js';
import {TURN_SHOW_RULES, beginGo, createTurnShow, currentTurn, nightOpenFor, passKeyboard, playerNightResult,
  recordGo, settleTurnGo, turnOrder, turnScoreboard, turnShowNights} from '../src/bowl/bowl-turns.js';
import {BIG_MO, BOWL_CRUSH_ROWS, BOWL_SOUND_CUES, BOWL_TURN_LINES} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const DT = 1 / 120;
const values = new Map();
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
  get length() { return values.size; },
  key: index => [...values.keys()][index] ?? null,
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key)),
}});
const memory = initial => {
  const stored = new Map(Object.entries(initial));
  return {get length() { return stored.size; }, key: index => [...stored.keys()][index] ?? null,
    getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, String(value)),
    removeItem: key => stored.delete(key)};
};
const player = (id, name, profile = createProfile()) => ({id, name, profile});
const won = (...nights) => ({...createProfile(), bowl: {version: 1, nightsWon: nights}});

// ---- the rules, without driving -----------------------------------------

{
  const two = [player('a', 'Kyle'), player('b', 'Gratian')];
  equal(createTurnShow({night: 1, players: [two[0]]}).reason, 'tooFew', 'one player is not a Turn Show');
  equal(createTurnShow({night: 1, players: [...two, player('c', 'C'), player('d', 'D'), player('e', 'E')]}).reason,
    'tooMany', `a Turn Show has room for ${TURN_SHOW_RULES.maxPlayers} players`);
  equal(createTurnShow({night: 1, players: [two[0], two[0]]}).reason, 'players', 'a player is picked once');
  equal(createTurnShow({night: 3, players: two}).reason, 'night', 'a night with an event still to build cannot be played');
  equal(createTurnShow({night: 2, players: [player('a', 'Kyle', won(1)), two[1]]}).reason, 'locked',
    'night two needs every picked player to have won night one');
  ok(createTurnShow({night: 2, players: [player('a', 'Kyle', won(1)), player('b', 'Gratian', won(1, 2))]}).ok,
    'night two is open when every picked player has won night one');
  ok(nightOpenFor(createProfile(), 1) && !nightOpenFor(createProfile(), 2) && nightOpenFor(won(1), 2), 'night one is always open');
  equal(turnShowNights([createProfile(), won(1)]).map(entry => entry.state), ['open', 'locked', 'later', 'later', 'later'],
    'the setup offers only the nights open for every picked player');

  const {show} = createTurnShow({night: 1, players: [player('b', 'Gratian'), player('a', 'Kyle')], hostId: 'a', cpuDifficulty: 'easy'});
  equal(turnOrder(show).map(turn => `${turn.name}:${turn.event}`),
    ['Gratian:carCrush', 'Kyle:carCrush', 'Gratian:freestyle', 'Kyle:freestyle', 'Gratian:sideBySide', 'Kyle:sideBySide'],
    'each event in turn, each player in the order they were picked');
  ok(show.phase === 'handoff' && currentTurn(show).name === 'Gratian', 'the show opens on the first player being handed the keyboard');
  ok(!recordGo(show, {playerId: 'b', event: 'carCrush', eventIndex: 0, score: 5}).ok, 'no go counts before its key press');

  // Play the six goes on paper: Gratian wins everything, Kyle loses the crush.
  let state = show;
  const plan = [['b', true, 300], ['a', false, 40], ['b', true, 500], ['a', true, 700], ['b', true, 0], ['a', true, 10]];
  for (const [id, win, score] of plan) {
    const turn = currentTurn(state);
    ok(!recordGo(beginGo(state).show, {playerId: id === 'a' ? 'b' : 'a', event: turn.event, eventIndex: turn.eventIndex, score}).ok,
      `${turn.name}'s go cannot be recorded for the other player`);
    state = beginGo(state).show;
    ok(!beginGo(state).ok && currentTurn(state).playerId === id, 'one go at a time: a second key press starts nothing');
    const recorded = recordGo(state, {playerId: id, event: turn.event, eventIndex: turn.eventIndex, score, won: win});
    ok(recorded.ok && recorded.go.playerId === id, `${turn.name}'s ${turn.event} go is recorded`);
    state = passKeyboard(recorded.show).show;
  }
  ok(state.phase === 'complete' && currentTurn(state) === null, 'the show ends after the last go');
  const board = turnScoreboard(state);
  equal(board.rows.map(row => [row.name, row.wins, row.total]), [['Gratian', 3, 800], ['Kyle', 2, 750]],
    'the scoreboard adds up each player in picked order');
  equal(board.standing.map(row => row.name), ['Gratian', 'Kyle'], 'most events won comes first');
  equal(board.rows.find(row => row.name === 'Kyle').scores.carCrush, {score: 40, won: false}, 'a lost go still shows its points');
  ok(board.leaders.length === 1 && board.leaders[0].place === 1, 'one leader');
  ok(playerNightResult(state, 'b')?.won && playerNightResult(state, 'a') === null, 'only a player who won all three events wins the night');

  // Points settle a tie on events won; the same events and points share the place.
  const tied = {...state, goes: state.goes.map(go => ({...go, won: true, score: 100}))};
  equal(turnScoreboard(tied).leaders.map(row => row.name), ['Gratian', 'Kyle'], 'the same events and points tie');
  const points = {...state, goes: state.goes.map(go => ({...go, won: true, score: go.playerId === 'a' ? 101 : 100}))};
  equal(turnScoreboard(points).standing.map(row => [row.name, row.place]), [['Kyle', 1], ['Gratian', 2]],
    'with the same events won, points decide');

  // Each go settles into the profile it belongs to, and only that one.
  const go = state.goes.find(entry => entry.playerId === 'a' && entry.event === 'carCrush');
  ok(!settleTurnGo(createProfile(), state, go, 'b').ok, "a go never settles into another player's profile");
  const last = state.goes.find(entry => entry.playerId === 'b' && entry.event === 'sideBySide');
  const paid = settleTurnGo(createProfile(), state, last, 'b');
  ok(paid.ok && paid.wonNight && paid.purse === BOWL_PURSE[0] && paid.profile.wasteland.scrap === BOWL_PURSE[0],
    'the last go of a night won on every event pays the purse once');
  ok(settleTurnGo(paid.profile, state, last, 'b').purse === 0, 'the same night pays no second purse');
}

// ---- one go in the Duel ---------------------------------------------------

{
  const duel = new Duel({seed: 1989}), seen = [];
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  duel.onChange((_, ev) => {
    if (ev.bowlCaption) seen.push(ev.bowlCaption.id);
    if (ev.bowlEventResult) seen.push('result');
    if (ev.bowlNightResult) seen.push('night');
  });
  ok(!duel.startBowlNight({night: 1, eventIndex: 3, turn: {driver: 'Kyle'}}), 'a go needs an event of the night');
  ok(duel.startBowlNight({night: 1, eventIndex: 1, playerId: 'a', cpuDifficulty: 'easy', turn: {driver: 'Kyle'}}),
    'a go starts at its own event');
  const night = duel.state.bowlNight;
  ok(night.turn && night.event.type === 'freestyle' && duel.state.status === 'countdown', 'the go is Freestyle, from a countdown');
  ok(seen[0] === 'turn.open' && !seen.includes('night.1.open'), 'Big Mo welcomes the next driver, not a new night');
  equal(bowlHudView(duel.state).driver, 'Kyle', "the HUD names who is driving");
  ok(!duel.retryBowlEvent(), 'a go has no restart: it is one go');
  for (let i = 0; i < 120 * 100 && duel.state.status !== 'bowl_break'; i++) { duel.setInput({throttle: 0, brake: 0, steer: 0}); duel.step(DT); }
  ok(night.phase === 'turn' && duel.state.status === 'bowl_break', 'the go ends in the turn phase');
  ok(seen.includes('result') && !seen.includes('night') && seen.includes('turn.lost'), 'a go pays nothing itself and is not called a retry');
  ok(!duel.continueBowlNight(), 'a go does not run on into the next event');
}

// ---- two players take turns in the App, each save gets only its own --------

const ana = createProfile();
ana.credits = 777; ana.wasteland = {...ana.wasteland, scrap: 12};
const kyleStart = {...createProfile(), credits: 321, wasteland: {...createProfile().wasteland, scrap: 40}};
const registry = {version: 2, activePlayerId: 'kyle', players: [
  {id: 'kyle', name: 'Kyle', profile: kyleStart},
  {id: 'gratian', name: 'Gratian', profile: createProfile()},
  {id: 'ana', name: 'Ana', profile: ana},
]};
ok(savePlayers(registry), 'three players are in the memory-only save');
const stored = () => JSON.parse(values.get(PLAYERS_KEY));
const app = new App();
// The App fills in race settings for every player as it loads (not this card); compare from there.
const before = stored();
app.duel.featureFlags = createFeatureFlags({storage: null, qa: true, overrides: {'titan-bowl': true}});
app.audio.unlock = () => {};
app.audio.setPaused = () => {};
app.cpuDifficulty = 'medium';
ok(app.player.id === 'kyle', 'Kyle is at the keyboard and sets up the show');
equal(app.turnShowChoices(['gratian', 'kyle']).nights[0].state, 'open', 'night one is open for both');
ok(!app.startTurnShow(1, ['gratian']), 'one player cannot start a Turn Show');
ok(app.startTurnShow(1, ['gratian', 'kyle'], {cpuDifficulty: 'easy'}), 'Gratian and Kyle start a Turn Show');
ok(!app.startShowNight(1), 'no solo night starts while a Turn Show is on');

const events = [];
app.duel.onChange((state, ev) => { if (ev.bowlEventResult) events.push({player: state.playerId, ...ev.bowlEventResult}); });
const key = (code, repeat = false) => app._turnHandoffKey({code, repeat, target: null, preventDefault() {}});
// The scripted driver from test-bowl-night; Kyle waits in the Car Crush and so loses it.
function drive(idle) {
  const duel = app.duel;
  for (let i = 0; i < 120 * 150; i++) {
    const s = duel.state;
    if (s.status === 'bowl_break') return;
    const type = s.bowlNight.event.type, freestyle = type === 'freestyle';
    const line = freestyle && s.s > 40 && s.s < 70 ? -3.4 : type === 'sideBySide' ? 3 : 0;
    duel.setInput(idle ? {throttle: 0, brake: 0, steer: 0} : {throttle: s.speedMph < 32 ? 1 : 0, brake: 0,
      steer: Math.max(-1, Math.min(1, (s.lateral - line) * .3 + (s.headingError || 0) * 1.5)), boost: false});
    duel.step(DT);
    assert.equal(s.playerId, app.player.id, 'the driver is the active player at every step');
  }
  assert.fail('a go did not end');
}
const order = [];
let handoffs = 0;
while (app.turnShowView()?.show.phase === 'handoff') {
  const {turn} = app.turnShowView();
  handoffs++;
  ok(app.duel.state.status === 'menu' && !app.duel.state.bowlNight, `${turn.name}'s go waits at the pass-the-keyboard screen`);
  ok(app.player.id === turn.playerId, `${turn.name} is the active player for their own go`);
  // Keys still held by the last driver do nothing: no race, no countdown.
  app.keys.KeyW = true;
  app.advance(3);
  ok(app.duel.state.status === 'menu' && !app.duel.state.bowlNight, 'a held key starts nothing');
  ok(key('KeyW', true) && app.duel.state.status === 'menu', 'a key held down until it repeats starts nothing');
  ok(key('Tab') && key('ShiftLeft') && key('Escape') && app.duel.state.status === 'menu', 'Tab, Shift and Escape start nothing');
  ok(key('KeyW') && app.duel.state.status === 'countdown' && app.duel.state.bowlNight?.turn, 'a fresh key press starts the go');
  ok(!app.keys.KeyW && app.duel.state.speedMph === 0, 'the key that started the go is not held for driving');
  equal(app.duel.state.bowlNight.turn.driver, turn.name, 'the HUD names the driver');
  ok(!app.beginTurn() && !app.restart(), 'during a go nothing starts a second one, and the restart is off');
  order.push(`${turn.name}:${turn.event}`);
  drive(turn.playerId === 'kyle' && turn.event === 'carCrush');
  const view = app.turnShowView();
  ok(view.show.phase === 'result' && view.lastGo.playerId === turn.playerId, `${turn.name}'s go is on the scoreboard`);
  ok(view.lastGo.settled?.saved === true, `${turn.name}'s go is saved`);
  ok(app.passTurnKeyboard(), 'the keyboard is passed on');
}
equal(order, ['Gratian:carCrush', 'Kyle:carCrush', 'Gratian:freestyle', 'Kyle:freestyle', 'Gratian:sideBySide', 'Kyle:sideBySide'],
  'the App runs every go in the turn order');
equal(handoffs, 6, 'every go, the first one too, begins at the pass-the-keyboard screen');
equal(events.map(ev => [ev.player, ev.event, ev.won]), [['gratian', 'carCrush', true], ['kyle', 'carCrush', false],
  ['gratian', 'freestyle', true], ['kyle', 'freestyle', true], ['gratian', 'sideBySide', true], ['kyle', 'sideBySide', true]],
  'each go is driven by its own player, and only Kyle lost one');
const final = app.turnShowView();
ok(final.show.phase === 'complete' && app.duel.state.status === 'menu', 'the show ends on the scoreboard at the menu');
ok(app.player.id === 'kyle', 'the player who set up the show is at the keyboard again');
equal(final.board.standing[0].name, 'Gratian', 'Gratian tops the scoreboard with three events won');

{
  const after = stored(), find = (data, id) => data.players.find(entry => entry.id === id).profile;
  const scores = id => Object.fromEntries(final.show.goes.filter(go => go.playerId === id).map(go => [go.event, go.score]));
  const g = find(after, 'gratian'), k = find(after, 'kyle');
  equal(g.bowl.nightsWon, [1], "Gratian's save has night one won");
  equal(g.wasteland.scrap, BOWL_PURSE[0], "Gratian's purse is in Gratian's wallet");
  equal(g.bowl.bestScores, {'car-crush': scores('gratian').carCrush, freestyle: scores('gratian').freestyle,
    'side-by-side': scores('gratian').sideBySide}, "Gratian's save holds Gratian's scores");
  equal(k.bowl.nightsWon, [], "Kyle lost an event, so Kyle's save has no night won");
  equal(k.wasteland.scrap, 40, "Kyle's wallet is as it was: no purse, and none of Gratian's");
  equal(k.credits, 321, "Kyle's credits are as they were");
  equal(k.bowl.bestScores, {'car-crush': scores('kyle').carCrush, freestyle: scores('kyle').freestyle,
    'side-by-side': scores('kyle').sideBySide}, "Kyle's save holds Kyle's scores, and none of Gratian's");
  ok(scores('kyle').freestyle !== undefined && scores('gratian').freestyle !== undefined, 'both players scored in Freestyle');
  equal(find(after, 'ana'), find(before, 'ana'), "Ana did not play, and Ana's save is exactly as it was");
  const strip = profile => { const {bowl, wasteland, ...rest} = profile; return {...rest, wasteland: {...wasteland, scrap: 0}}; };
  equal(strip(g), strip(find(before, 'gratian')), "only the Bowl record and scrap change in Gratian's save");
  equal(strip(k), strip(find(before, 'kyle')), "only the Bowl record changes in Kyle's save");
  equal(after.activePlayerId, 'kyle', 'the save remembers the player who set up the show');
  ok(app.leaveTurnShow() && !app.turnShowView(), 'closing the scoreboard ends the show');
}

// Leaving in the middle: the goes already played stay saved, and the rest are not played.
{
  ok(app.startTurnShow(1, ['kyle', 'gratian'], {cpuDifficulty: 'easy'}) && key('KeyA'), 'a second show starts');
  drive(false);
  ok(app.passTurnKeyboard() && app.player.id === 'gratian', 'Gratian is handed the keyboard');
  ok(key('KeyA') && app.duel.state.status === 'countdown', "Gratian's go starts");
  const saved = values.get(PLAYERS_KEY);
  app.returnToMenu();
  ok(!app.turnShowView() && app.player.id === 'kyle', "leaving a go ends the show and gives the keyboard back to its host");
  equal(values.get(PLAYERS_KEY).replace(/"activePlayerId":"[^"]+"/, ''), saved.replace(/"activePlayerId":"[^"]+"/, ''),
    'leaving pays nothing and changes no save');
  ok(!app.beginTurn() && !app.passTurnKeyboard(), 'nothing of the show is left to start');
}

// A save from before this card loads and saves unchanged, and gains no Turn Show field.
for (const name of readdirSync(new URL('./fixtures/saves/', import.meta.url)).filter(file => file.endsWith('.json'))) {
  const fixture = JSON.parse(readFileSync(new URL(`./fixtures/saves/${name}`, import.meta.url), 'utf8'));
  const storage = memory(Object.fromEntries(Object.entries(fixture.storage).map(([id, value]) => [id, JSON.stringify(value)])));
  const loaded = loadPlayers(storage);
  ok(savePlayers(loaded, storage), `${name}: an old save saves`);
  equal(loadPlayers(storage), loaded, `${name}: unchanged after save and reload`);
  ok(!/turn/i.test(JSON.stringify(Object.keys(loaded.players[0].profile))), `${name}: no Turn Show field appears`);
}
ok(createPlayerRegistry().players.every(entry => !Object.hasOwn(entry.profile, 'turnShow')), 'a new save has no Turn Show field');

// Every word: plain, whole sentences with no dashes; every sound has a stand-in.
{
  const lines = [BIG_MO['turn.open'], BIG_MO['turn.won'], BIG_MO['turn.lost']];
  // Each line function with the facts it takes, both ways where it has two.
  const samples = {setupCount: [[2], [4]], setupNightOpen: [[1]], setupNightLocked: [[2]],
    handoffEvent: [['Gratian', 'Car Crush']], goScore: [['Gratian', 1200, 'Freestyle']],
    goRows: [['Kyle', BOWL_CRUSH_ROWS[2]], ['Kyle', undefined]], goRace: [['Gratian', true], ['Gratian', false]],
    goBest: [['Kyle', 'Side by Side']], goNightWon: [['Gratian', 1]], goPurse: [['Gratian', 250]],
    goPurseAlready: [['Gratian']], goUnsaved: [['Kyle']], goNext: [['Kyle', 'Car Crush']],
    boardWinner: [['Gratian', 3, 900], ['Kyle', 1, 10], ['Kyle', 0, 0]], boardLeading: [['Gratian', 2, 640]],
    boardTie: [[['Kyle', 'Gratian']], [['Kyle', 'Gratian', 'Ana']]], boardLevel: [[['Kyle', 'Gratian']]]};
  for (const [id, value] of Object.entries(BOWL_TURN_LINES)) {
    if (/(Title|Button|Heading)$/.test(id) || id === 'hudDriver') continue;
    if (typeof value === 'string') { lines.push(value); continue; }
    ok(samples[id], `${id} has its facts in this check`);
    for (const args of samples[id]) lines.push(value(...args));
  }
  for (const line of new Set(lines))
    ok(/^[A-Z]/.test(line) && /[.!?]$/.test(line) && !/[–—]/.test(line) && !/ - /.test(line), `a plain sentence: ${line}`);
  equal(BOWL_TURN_LINES.handoffTitle('Gratian'), 'GRATIAN IS UP. PASS THE KEYBOARD.', 'the pass-the-keyboard title');
  ok(['bowl.turn.up', 'bowl.turn.winner'].every(cue => Object.hasOwn(SOUND_BANK, BOWL_SOUND_CUES[cue])),
    'the Turn Show names a sound for each new event');
}

console.log(`test-bowl-turns: ${checks} checks passed`);
