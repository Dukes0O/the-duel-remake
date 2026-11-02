// WATER-HOOKS: a Water Road job counts only from the Story card's button; changing the mode, venue or road clears it;
// losing, quitting or abandoning grants nothing (docs/story/wasteland-water-road.md sections 3 and 11). The real App on
// memory-only storage: no real save is read or written.
//   node tools/test-water-hooks.mjs
import assert from 'node:assert/strict';

globalThis.__DUEL_QA__ = true;
globalThis.cancelAnimationFrame ??= () => {};
const memory = new Map();
globalThis.localStorage = {get length() { return memory.size; }, key: n => [...memory.keys()][n] ?? null,
  getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k)};

const {App} = await import('../src/app.js');
const {COURSE} = await import('../src/config.js');
const {createFeatureFlags, FEATURE_STATES} = await import('../src/feature-flags.js');
const {createProfile, normalizeProfile, loadPlayers} = await import('../src/progression.js');
const {storyOf} = await import('../src/story/story-save.js');
const {WARLORD_LADDER} = await import('../src/warlords.js');

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const DT = 1 / 120;

const flags = (water = true) => createFeatureFlags({storage: null, qa: false, overrides: {'water-road': water}});
const saved = app => loadPlayers(globalThis.localStorage).players.find(player => player.id === app.player.id).profile;
const water = profile => storyOf(profile).water ?? {};
const stageOf = id => COURSE.findIndex(course => course.id === id);

// A fresh App: one player who found the gate, has read Hollis's note and has beaten the warlords named.
function freshApp({on = true, beaten = [], rank = 1, read = true} = {}) {
  memory.clear();
  const app = new App();
  app.duel.featureFlags = flags(on);
  app.audio.unlock = () => {};
  app.cpuDifficulty = 'easy';
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  profile.wasteland.xp = {1: 0, 6: 3500, 9: 7000, 12: 11000}[rank] ?? 0;
  for (const id of beaten) profile.wasteland.warlords[id] = {...profile.wasteland.warlords[id], defeated: true};
  if (read) profile.story = {version: 1, water: {read: true}};
  app.profile = normalizeProfile(profile);
  app._saveProfile();
  app._storyTimer = () => 0; app._storyUntimer = () => {};
  return app;
}
const intoYard = app => { ok(app.visitWasteland(), 'the player can visit the yard'); app.advance(8); ok(app.isYardHomeActive(), 'the yard home is active'); };
const raceResult = (won = true) => ({won, completed: true, timeSec: 140, laps: 2, beatRival: won});

// ---- Off: nothing at all -----------------------------------------------------------------------------------------------
same(FEATURE_STATES['water-road'], 'on', 'the Water Road is released (WATER-FINISH, 1 November 2026)');
{
  const app = freshApp({on: false});
  same(app.storyProps('water').available, false, 'switch off: no Water Road card');
  same(app.waterStep('sal'), null, 'switch off: the button does nothing');
  ok(app.setRaceSettings({eventId: 'pacific-canyon', mode: 'wasteland'}) && app.startCampaign(app.getRaceChoices()), 'an ordinary Mad Max Duel starts');
  const before = structuredClone(app.profile.story);
  const result = raceResult();
  app._settleResult(result, app.duel.state);
  same(app.profile.story, before, 'switch off: a win writes no story');
  ok(result.waterJob === undefined, 'and the results show no story tick');
}

// ---- A race job: the Story card fills the setup; START is the player's ---------------------------------------------------
{
  const app = freshApp();
  const props = app.storyProps('water');
  ok(props.available && props.step === 'sal', 'chapter 1 is next');
  const sal = props.steps.find(step => step.id === 'sal');
  ok(sal.state === 'open' && sal.button === 'Race on Sal\'s road' && sal.action.type === 'race', 'one button: race on Sal\'s road');
  same(app.waterStep('sal'), {setup: 'race'}, 'the button fills the setup');
  same([app.getRaceChoices().startStage, app.getRaceChoices().mode], [stageOf('pacific-canyon'), 'wasteland'], 'Pacific Canyon, Mad Max Duel');
  ok(app._water.pending?.mark === 'sal', 'the story job waits for START');

  // Changing the road to the other Sal road keeps it; another road or mode clears it.
  app.setRaceSettings({eventId: 'red-mesa'});
  ok(app._water.pending?.mark === 'sal', 'Sal\'s other road is still the job');
  app.setRaceSettings({mode: 'duel'});
  same(app._water.pending, null, 'another mode clears it');
  ok(app.startCampaign(app.getRaceChoices()), 'a Rival Duel starts');
  same(app._water.run, null, 'it is not the story\'s race');
  app._settleResult(raceResult(), app.duel.state);
  ok(!water(app.profile).jobs, 'a win in another mode grants nothing');
  app.returnToMenu();
  app.waterStep('sal'); app.setRaceSettings({eventId: 'high-country'});
  same(app._water.pending, null, 'another road clears it');
  ok(app.startCampaign(app.getRaceChoices()), 'a Mad Max Duel on another road starts');
  app._settleResult(raceResult(), app.duel.state);
  ok(!water(app.profile).jobs, 'a win on another road grants nothing');
  app.returnToMenu();

  // The same road picked by hand, without the button, is not the story's race.
  app.setRaceSettings({eventId: 'pacific-canyon', mode: 'wasteland'});
  ok(app.startCampaign(app.getRaceChoices()) && app._water.run === null, 'picked by hand: not a story race');
  app._settleResult(raceResult(), app.duel.state);
  ok(!water(app.profile).jobs, 'and its win grants nothing');
  app.returnToMenu();

  // Lose, quit, abandon: nothing.
  app.waterStep('sal');
  ok(app.startCampaign(app.getRaceChoices()) && app._water.run?.mark === 'sal', 'the story race starts');
  ok(!app.storyCaption, 'Hollis waits while the road loads');
  app.duel.state.countdown = 0; app.duel.step(DT);
  ok(app.storyCaption?.id === 'story.water.job.sal', 'Hollis\'s radio line shows at GO');
  const lost = raceResult(false);
  app._settleResult(lost, app.duel.state);
  ok(!water(app.profile).jobs && lost.waterJob === undefined, 'a loss grants nothing');
  app.restart();
  ok(app._water.run?.mark === 'sal', 'a restart is still the story\'s race');
  app.returnToMenu();
  same(app._water.run, null, 'quitting ends the mark');
  ok(!water(saved(app)).jobs, 'quitting grants nothing');

  // A loss, then NEXT CIRCUIT: the run goes on to another road, which can never win Sal's job.
  app.waterStep('sal');
  ok(app.startCampaign(app.getRaceChoices()), 'the story race starts again');
  app.duel.state.stageIndex = stageOf('high-country');
  const elsewhere = raceResult();
  app._settleResult(elsewhere, app.duel.state);
  ok(!water(app.profile).jobs && elsewhere.waterJob === undefined, 'a win on the next circuit grants nothing');
  app.returnToMenu();

  // The win.
  app.waterStep('sal');
  ok(app.startCampaign(app.getRaceChoices()), 'try again');
  const holdBefore = app.profile.wasteland.territories.sal.hold;
  const won = raceResult();
  app._settleResult(won, app.duel.state);
  same(won.waterJob, 'sal', 'the results know the chapter\'s job was won');
  same(water(saved(app)).jobs, ['sal'], 'the job is saved with the race\'s own rewards');
  same(app.profile.wasteland.territories.sal.hold, Math.min(100, holdBefore + 25), 'the job adds hold the way any win does');
  const after = app.storyProps('water').steps.find(step => step.id === 'sal');
  ok(after.state === 'open' && after.action.type === 'race' && !after.job, 'the job is done; Sal\'s road still builds the hold');
  const left = (100 - app.profile.wasteland.territories.sal.hold) / 25;
  ok(new RegExp(`^${left} more wins? on Sal's road opens? the fight\.$`).test(after.bar.label), `the bar says how far the hold is (${after.bar.label})`);
}

// ---- A Scrapdome job: the yard's panel is filled; another mode or venue clears it ----------------------------------------
{
  const app = freshApp({beaten: WARLORD_LADDER.slice(0, 4)});
  same(app.storyProps('water').step, 'kettle', 'chapter 5 is next');
  const fromMenu = app.storyProps('water').steps.find(step => step.id === 'kettle');
  same([fromMenu.button, fromMenu.action.type], ['Go to the yard', 'yard'], 'from the main menu the button goes to the yard');
  intoYard(app);
  const inYard = app.storyProps('water').steps.find(step => step.id === 'kettle');
  same([inYard.button, inYard.action.type], ['Start Last Car Rolling', 'arena'], 'in the yard the button starts the job');
  same(app.waterStep('kettle'), {setup: 'arena', mode: 'last-car-rolling', venueId: 'scrapdome'}, 'the Scrapdome panel is filled');
  app.waterArenaChoice({mode: 'fuel-run'});
  same(app._water.pending, null, 'another mode clears it');
  app.waterStep('kettle');
  ok(app.startArenaEvent({mode: 'last-car-rolling', venueId: 'scrapdome', opponents: 2}), 'START: Last Car Rolling');
  ok(app._water.run?.mark === 'kettle', 'the story\'s game');
  app.duel.state.countdown = 0; for (let n = 0; n < 3 && app.duel.state.arena.phase !== 'fight'; n++) app.duel.step(DT);
  ok(app.storyCaption?.id === 'story.water.job.kettle', 'Hollis\'s radio line shows as the fight begins');
  const s = app.duel.state;
  s.countdown = 0;
  s.arena.participants.find(p => p.id === 'player').wrecks = 3;
  s.arena.clockSec = s.arena.timeLimitSec - DT / 2;
  for (let n = 0; n < 4 && s.status !== 'arena_result'; n++) app.duel.step(DT);
  ok(s.arena.result?.winnerId === 'player' && s.arena.result.settlementSaved === true, 'a won Last Car Rolling is settled');
  same(s.arena.result.waterJob, 'kettle', 'and its results know the job was won');
  same(water(saved(app)).jobs, ['kettle'], 'saved in the same write');
}

// ---- A Scrapdome job that is lost grants nothing; a warlord fight is never a story job -----------------------------------
{
  const app = freshApp({beaten: WARLORD_LADDER.slice(0, 4)});
  intoYard(app);
  app.waterStep('kettle');
  ok(app.startArenaEvent({mode: 'last-car-rolling', venueId: 'scrapdome', opponents: 2}), 'START');
  const s = app.duel.state;
  s.countdown = 0;
  const rival = s.arena.participants.find(p => p.id !== 'player');
  rival.wrecks = 3;
  s.arena.clockSec = s.arena.timeLimitSec - DT / 2;
  for (let n = 0; n < 4 && s.status !== 'arena_result'; n++) app.duel.step(DT);
  ok(s.arena.result && s.arena.result.winnerId !== 'player', 'the game is lost');
  ok(!water(saved(app)).jobs && s.arena.result.waterJob === undefined, 'a loss grants nothing');
  same(app._water.arenaStarted({mode: 'warlord', venueId: 'pit', warlordId: 'kettle', runId: 'x'}), null, 'a fight is never a story job');
}

// ---- The other Scrapdome save path (Fuel Run, Bounty Hunt, Convoy Raid, Ambush Alley) -------------------------------------
{
  const app = freshApp({beaten: ['sal'], rank: 6});
  intoYard(app);
  same(app.waterStep('dustmonger'), {setup: 'arena', mode: 'fuel-run', venueId: 'scrapdome'}, 'chapter 2 fills a Fuel Run');
  ok(app.startArenaEvent({mode: 'fuel-run', venueId: 'scrapdome', opponents: 2}) && app._water.run?.mark === 'dustmonger', 'START: the story\'s Fuel Run');
  const s = app.duel.state;
  s.countdown = 0;
  s.arena.participants.find(p => p.id === 'player').fuelDelivered = 3;
  s.arena.clockSec = s.arena.timeLimitSec - DT / 2;
  for (let n = 0; n < 4 && s.status !== 'arena_result'; n++) app.duel.step(DT);
  ok(s.arena.result?.winnerId === 'player' && s.arena.result.settlementSaved === true, 'a won Fuel Run is settled');
  same(s.arena.result.waterJob, 'dustmonger', 'its results know the job was won');
  same(water(saved(app)).jobs, ['dustmonger'], 'saved in the Fuel Run\'s own write');
}

// ---- Locked and open: the bar to the rank a mode needs; the fight button when the hold is full --------------------------
{
  const app = freshApp({beaten: ['sal'], rank: 1});
  intoYard(app);
  const dust = app.storyProps('water').steps.find(step => step.id === 'dustmonger');
  ok(dust.state === 'open' && /Fuel Run opens at rank 6/.test(dust.note), 'the job says the rank it needs');
  same([dust.bar.value, dust.bar.max], [1, 6], 'and shows the bar to it');
  ok(dust.action.type === 'courses' && dust.button === 'Open Your Courses' && /Buy High Country Grand Tour in Your Courses first \(900 credits/.test(dust.note), 'no road of his owned yet: one button to Your Courses, with the price');
  same(app.waterStep('dustmonger'), {courses: 'high-country'}, 'the button goes to Your Courses on the main menu');
  ok(app.duel.state.status === 'menu', 'back on the main menu');
  app.profile = {...app.profile, courses: {...app.profile.courses, unlocked: [...app.profile.courses.unlocked, 'high-country']}};
  const owned = app.storyProps('water').steps.find(step => step.id === 'dustmonger');
  ok(owned.action.type === 'race' && owned.button === 'Race on High Country Grand Tour', 'owning the road: race there for hold and rank meanwhile');
  intoYard(app);
  const locked = app.storyProps('water').steps.find(step => step.id === 'mirage');
  ok(locked.state === 'locked' && locked.note === 'Beat The Dustmonger first.', 'a locked chapter says what to do first');
  app.profile.wasteland.territories.dustmonger.hold = 100;
  same(app.storyProps('water').steps.find(step => step.id === 'sal').state, 'done', 'Sal\'s chapter is done');
  const fight = app.storyProps('water').steps.find(step => step.id === 'dustmonger');
  ok(fight.action.type === 'fight' && fight.button === 'Fight The Dustmonger', 'a full hold shows the fight button');
}

// ---- Opening the card: Hollis's note and V.'s notes are read; the end lines once in the yard ---------------------------
{
  const unread = freshApp({read: false});
  const first = unread.storyProps('water');
  ok(first.available && first.step === 'well', 'a new player starts at the dry well, without a crash');
  same(first.steps.find(step => step.id === 'sal').note, 'Read Hollis\'s note first.', 'chapter 1 waits for the note');
  const app = freshApp({read: false, beaten: ['sal']});
  ok(app.storyProps('water').message, 'a new note waits (the red dot)');
  ok(app.openStory('water'), 'opening the Water Road card');
  same(water(saved(app)), {read: true, notes: 1}, 'reads Hollis\'s note and V.\'s first note');
  ok(!app.storyProps('water').message, 'no red dot now');
  same(saved(app).story.kogane ?? {}, {}, 'and leaves Kogane alone (empty, its loaded shape)');
  const done = freshApp({beaten: WARLORD_LADDER});
  intoYard(done);
  ok(water(saved(done)).end === true, 'the yard visit after the Baron plays the end lines');
  ok(done.storyCaption?.id === 'story.water.hollis.end', 'Hollis speaks');
}

// ---- Vesper speaks after the Baron's first defeat only ----------------------------------------------------------------------
{
  const app = freshApp({beaten: WARLORD_LADDER.slice(0, 7)});
  app.profile.wasteland.territories.blackiron.hold = 100;
  app._saveProfile();
  intoYard(app);
  const said = [];
  app._storySay = id => { said.push(id); return true; };
  const winFight = firstWin => {
    if (!app.isYardHomeActive()) { app.returnToMenu(); intoYard(app); }
    ok(app.startWarlordFight('blackiron'), 'the Baron\'s fight starts');
    const s = app.duel.state;
    s.arena.result = {winnerId: 'player', settlementSaved: true, firstWin};
    app._waterArenaSettled(s);
  };
  winFight(true);
  same(said, ['story.water.vesper.8'], 'Vesper speaks after the first defeat');
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland, warlords: {...app.profile.wasteland.warlords, blackiron: {...app.profile.wasteland.warlords.blackiron, defeated: true}}}};
  app._saveProfile();
  winFight(false);
  same(said, ['story.water.vesper.8'], 'and not after a rematch');
}

console.log(`test-water-hooks: ${checks} checks passed`);
