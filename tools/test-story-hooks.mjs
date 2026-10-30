// STORY-KOGANE-HOOKS: the Kogane Invitation wired into the real App (docs/story/kogane-invitation.md sections 2, 3, 6 and 12.1).
// Memory-only saves: no real save is read or written. The chain from a fresh player, "Race Daichi", the story mark, the lesson mark,
// the captions and the chimes, the newer-save and switch-off rules.
//   node tools/test-story-hooks.mjs
import assert from 'node:assert/strict';

// The Skyline and the Kogane road exist only while their switches are on; this run asks for them as private QA does.
globalThis.__DUEL_QA__ = true;
globalThis.location = {search: '?flags=nissan-skyline,kogane-pass,helicopter,pilot-map,driving-lessons,kogane-invitation'};
globalThis.cancelAnimationFrame ??= () => {};
const memory = new Map();
globalThis.localStorage = {getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k)};

const {App} = await import('../src/app.js');
const {COURSE} = await import('../src/config.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');
const {createProfile, normalizeProfile, loadPlayers, isCarUnlocked} = await import('../src/progression.js');
const {heliOf} = await import('../src/heli/heli-save.js');
const {STORY_JOB_ID, STORY_NIGHT} = await import('../src/heli/heli-story.js');
const {koganeStep, storyOf, markKoganeDuel, grantKoganeSkyline, KOGANE_SKYLINE} = await import('../src/story/story-save.js');
const {KOGANE_DUEL_MARK, KOGANE_DUEL_COURSE, daichiRival} = await import('../src/story/kogane-duel.js');

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

// ---- the fixtures ------------------------------------------------------------------------------------------------------------
const PARTNERS = {'kogane-pass': true, 'nissan-skyline': true, helicopter: true, 'pilot-map': true, 'driving-lessons': true};
const flags = (story = true) => createFeatureFlags({storage: null, qa: false, overrides: {...PARTNERS, 'kogane-invitation': story}});
const TRAINED = Object.freeze({liftoff: true, hover: true, landing: true, carry: true});
const OWNED = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'kogane-pass'];
const nightExists = COURSE.some(course => course.id === KOGANE_DUEL_COURSE);
const raceRoad = nightExists ? KOGANE_DUEL_COURSE : 'kogane-pass';

// A fresh App on empty memory storage: one new player who owns Kogane Pass and has finished the helicopter's lessons.
function freshApp({story = true, owned = true, edit = profile => profile} = {}) {
  memory.clear();
  const app = new App();
  app.duel.featureFlags = flags(story);
  app.profile = normalizeProfile(edit({...createProfile(), credits: 5000,
    courses: {version: 1, unlocked: owned ? OWNED : OWNED.filter(id => id !== 'kogane-pass')}, heli: {version: 1, fuelKg: 0, lessons: TRAINED}}));
  app._saveProfile();
  // Timers are ours: a caption's end and Daichi's thanks wait here until the test runs them.
  app.timers = [];
  app._storyTimer = (callback, ms) => { app.timers.push({callback, ms}); return app.timers.length; };
  app.untimed = [];
  app._storyUntimer = handle => { app.untimed.push(handle); };
  // Chimes are counted.
  app.cues = [];
  app._storyBonus = () => { app.cues.push('interface.bonus'); };
  return app;
}
const saved = app => loadPlayers().players.find(player => player.id === app.player.id).profile;
const bonuses = app => app.cues.filter(id => id === 'interface.bonus').length;
const caption = app => app.storyCaption?.id ?? null;
const flush = async (condition = () => false) => { for (let i = 0; i < 40 && !condition(); i++) await new Promise(resolve => setTimeout(resolve, 25)); };

// ---- the helicopter pilot (the same steady test pilot as tools/test-heli-story.mjs, Assisted) -------------------------
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp((target.y - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
}
// Steps the app's own session and hands its events to the app, as the game loop does.
function fly(app, seconds, controls = () => ({}), until = null) {
  const session = app.heliSession, events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    const step = session.step(controls(session.view()));
    app._heliEvents(step);
    events.push(...step);
    if (until?.(session.view(), events)) break;
  }
  return events;
}
function deliver(app) {
  const session = app.heliSession, log = [];
  const crate = () => session.view().loads.find(load => load.storyJob);
  fly(app, 60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < 0.6 &&
      Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5);
  ok(session.pressHook()?.type === 'hooked', 'the crate is hooked');
  app._heliEvents(session.takeEvents());
  log.push(...fly(app, 12, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60})));
  ok(session.pressAutopilot(), 'the autopilot takes the crate toward Kogane Pass');
  log.push(...fly(app, 300, () => ({}), () => session.cruiseOffered));
  ok(session.cruiseOffered && session.acceptCruise(), 'cruise');
  log.push(...fly(app, 2));
  log.push(...fly(app, 300, () => ({}), (v, seen) => seen.some(e => e.type === 'autopilotArrived')));
  session.pressAutopilot();
  log.push(...fly(app, 60, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 0.7 + 14.6}, {speed: 1}), v => v.load.onGround));
  log.push(...fly(app, 1, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y})));
  ok(session.pressHook()?.type === 'released', 'set down gently inside the circle');
  const events = session.takeEvents();
  app._heliEvents(events);
  return [...log, ...events];
}

// A lesson that has been won, as the lesson machinery leaves it (the same shape tools/test-drive-lesson-run.mjs uses).
function passLesson(app, {reward = true} = {}) {
  const run = app.duel.drivingLesson;
  Object.assign(run.lesson, {stage: 'beat', phase: 'result', done: true, streak: 3, bestMargin: .4,
    lastAttempt: {finished: true, passed: true}});
  app._driveLessonEvent(app.duel.state, {driveLessonAnswer: {result: 'passed', radio: 'drive.radio.v2.corner.pass', cones: []}});
  return run;
}

// ---- 1. the full chain from a fresh player --------------------------------------------------------------------------
{
  const app = freshApp();
  ok(app.storyProps().available && app.storyProps().step === 'invite', 'a player who owns Kogane Pass sees the story at the letter');
  const first = app.storyProps();
  same(Object.keys(first).sort(), ['available', 'fireClosed', 'lead', 'read', 'skylineOwned', 'step', 'steps'], 'the plain object of section 12.1');
  same(first.steps.map(step => [step.id, step.state]), [['lesson', 'open'], ['supplies', 'locked'], ['duel', 'locked'], ['ana', 'locked']], 'four parts, the lesson open');
  ok(first.read === false && first.lead === '' && first.skylineOwned === false && first.fireClosed === null, 'unread, no lead, no Skyline, no fire');
  ok(storyOf(saved(app)).kogane.read === undefined && !Object.hasOwn(saved(app), 'story'), 'nothing is saved until the first write');

  // The letter.
  ok(app.openStory() === true, 'opening the card reads the letter');
  ok(app.storyProps().read === true && app.storyProps().step === 'lesson', 'and the story moves to the lesson');
  ok(saved(app).story.kogane.read === true, 'the mark is saved');
  ok(app.openStory() === true && bonuses(app) === 0, 'opening again changes nothing and makes no chime');

  // Brian's Hairpin Lesson, on the Kogane row.
  ok(app.openDrivingLessons(), 'the lesson board opens');
  ok(await app.startLesson({courseId: 'kogane-pass', car: 'falcone_f42', difficulty: 'casual'}), 'the Kogane lesson starts');
  ok(caption(app) === 'story.kogane.brian.intro', 'Brian\'s note shows on the opening card (words only)');
  ok(app._storyRadioNow().keyed === false, 'and the radio stays off, so it does not talk over his recorded intro');
  const creditsBefore = app.profile.credits;
  passLesson(app);
  ok(saved(app).story.kogane.lesson === true, 'passing "Beat me" on the Kogane row marks the lesson');
  ok(saved(app).drivingLessons.rewarded.corner === true, 'the lesson\'s own reward is paid as before (once)');
  ok(app.profile.upgrades.falcone_f42.brakes === 1 || app.profile.credits > creditsBefore, 'a free brake level or the credits');
  ok(bonuses(app) === 1, 'one chime for the finished step');
  await flush(() => caption(app) === 'story.kogane.brian.pass');
  ok(caption(app) === 'story.kogane.brian.pass', 'Brian\'s caption points on to the helipad');
  ok(koganeStep(app.profile) === 'supplies' && app.storyProps().steps[1].state === 'open', 'the supplies part opens');
  // Passing again changes nothing: no second chime, no second reward.
  passLesson(app);
  ok(bonuses(app) === 1, 'passing again makes no second chime');
  app.returnToMenu();

  // Supplies for the Summit, through the app's own helicopter session.
  ok(app.visitHeli(), 'the helipad opens');
  app.heliBuyFuel();
  const board = app.heliSession.boardJobs();
  ok(board.some(job => job.id === STORY_JOB_ID), 'the story job is on the board because the app passed the switch');
  ok(app.heliSession.takeJob(STORY_JOB_ID).ok, 'take the job');
  app._heliEvents(app.heliSession.takeEvents());
  ok(caption(app) === 'story.kogane.roger.offer', 'Roger\'s offer shows as words when the job is taken');
  const before = app.profile.credits, cuesBefore = bonuses(app);
  const log = deliver(app);
  ok(log.some(e => e.type === 'jobDone' && e.job.id === STORY_JOB_ID), 'the crate is down');
  ok(app.profile.credits === before + 2650, 'the delivery pay reaches the app\'s profile');
  ok(koganeStep(app.profile) === 'duel', 'the story is marked in the app\'s profile (the delivery\'s story field comes back with the helicopter\'s)');
  ok(heliOf(app.profile).map.found.includes(STORY_NIGHT), 'the Night version is found');
  ok(bonuses(app) === cuesBefore + 1, 'one chime for the finished step');
  ok(app.timers.some(timer => timer.ms === 3200), 'Daichi\'s thanks waits for Brian\'s recorded line');
  app.timers.find(timer => timer.ms === 3200).callback();
  ok(caption(app) === 'story.kogane.daichi.thanks', 'then Daichi thanks you');
  app.returnToMenu();
  same(saved(app).story.kogane, {read: true, lesson: true, supplies: true}, 'the saved story: letter, lesson, supplies');

  // Race Daichi.
  ok(app.storyProps().steps[2].state === 'open', 'the duel part opens');
  app.setRaceSettings({cpuDifficulty: 'hard', car: 'falcone_f42', difficulty: 'casual'});
  const ownRival = {car: 'banshee_muscle', driverId: 'club', upgradeLevel: 1};
  app.setRaceSettings({rival: ownRival});
  ok(app.startStoryDuel() === true, '"Race Daichi" fills the setup');
  same([app.getRaceChoices().startStage, app.getRaceChoices().mode, app.getRaceChoices().cpuDifficulty], [COURSE.findIndex(c => c.id === raceRoad), 'duel', 'hard'],
    `on ${raceRoad}, Rival Duel, the level already chosen`);
  ok(app.duel.state.status === 'menu', 'the player still presses START');
  ok(app.startCampaign(app.getRaceChoices()), 'START ENGINE');
  const duel = app.duel, daichi = duel.state.opponents[0];
  same([duel.state.rivalSettings.car, duel.state.rivalSettings.driverId], [KOGANE_SKYLINE, 'club'], 'the rival is Daichi\'s Skyline');
  same(duel.state.rivalSettings, daichiRival('hard'), 'Hard Daichi, nitro share and all');
  ok(duel.state.opponentCount === 1 && duel.state.mode === 'duel' && duel.state.cpuDifficulty === 'hard', 'one rival, a Rival Duel, Hard');
  ok(daichi.s === 0 && daichi.prevS === 0, 'the duel starts level');
  ok(caption(app) === 'story.kogane.daichi.grid', 'Daichi\'s grid line shows');
  same(app.profile.raceSettings.rival, ownRival, 'the player\'s own rival setup is not overwritten by Daichi');
  same(saved(app).raceSettings.rival, ownRival, 'and nor is the saved one');
  ok(JSON.stringify(saved(app)).includes('nitroScale') === false, 'the story rival (with its nitro share) is saved nowhere');

  // A restart keeps the story, Daichi and the level start.
  const firstRun = app.runId;
  app.restart();
  ok(app.runId !== firstRun && app._storyRace?.runId === app.runId, 'a restart is still the story\'s race');
  same(app.duel.state.rivalSettings, daichiRival('hard'), 'with Daichi, not the weaker Hard rival of the old restart');
  ok(app.duel.state.opponents[0].s === 0, 'and it starts level again');
  same(app.profile.raceSettings.rival, ownRival, 'the player\'s rival is still their own');

  // Losing, abandoning and quitting grant nothing.
  const before0 = structuredClone(storyOf(app.profile));
  const state = app.duel.state, lost = {won: false, completed: true, timeSec: 150, laps: 1};
  app._settleResult(lost, state);
  ok(lost.story === KOGANE_DUEL_MARK && lost.won === false, 'a loss carries the mark for the results card');
  ok(!isCarUnlocked(app.profile, KOGANE_SKYLINE) && lost.storyCar === undefined && lost.storyDuel === undefined, 'a loss grants nothing');
  same(storyOf(app.profile), before0, 'and the story is unchanged');
  ok(koganeStep(app.profile) === 'duel', 'still at the duel');
  app.restart();
  app.returnToMenu();
  ok(app._storyRace === null && !isCarUnlocked(app.profile, KOGANE_SKYLINE) && koganeStep(app.profile) === 'duel', 'quitting grants nothing and ends the mark');
  ok(app.startStoryDuel() && app.startCampaign(app.getRaceChoices()), 'try again');
  app.returnToMenu();
  ok(!isCarUnlocked(app.profile, KOGANE_SKYLINE) && koganeStep(app.profile) === 'duel', 'abandoning a started race grants nothing');

  // The win.
  ok(app.startStoryDuel() && app.startCampaign(app.getRaceChoices()), 'race Daichi again');
  const won = {won: true, completed: true, timeSec: 101.5, laps: 1};
  const cuesAtStart = bonuses(app);
  app._settleResult(won, app.duel.state);
  ok(won.story === KOGANE_DUEL_MARK, 'the win carries the mark');
  if (nightExists) {
    ok(isCarUnlocked(app.profile, KOGANE_SKYLINE) && won.storyCar === KOGANE_SKYLINE && won.storyDuel === 'hard', 'the win on the Night road grants the Skyline');
    ok(bonuses(app) === cuesAtStart + 1, 'with one chime (the new-car card)');
    same(storyOf(saved(app)).kogane.duel, 'hard', 'and marks the level won');
    const again = {won: true, completed: true, timeSec: 101.5, laps: 1};
    app._settleResult(again, app.duel.state);
    ok(bonuses(app) === cuesAtStart + 1 && saved(app).unlockedCars.filter(id => id === KOGANE_SKYLINE).length === 1, 'the same finish again grants nothing more');
  } else {
    // The Night version is not built yet (KOGANE-PASS-C7): the day road never grants. The grant is checked in tools/test-story-kogane-duel.mjs;
    // here the win is carried on to the Skyline by the story's own writers so the rest of the chain can be played.
    ok(!isCarUnlocked(app.profile, KOGANE_SKYLINE) && won.storyCar === undefined && won.storyDuel === undefined, 'until the Night road exists, the day road grants nothing');
    let profile = grantKoganeSkyline(markKoganeDuel(app.profile, 'hard').profile).profile;
    app.profile = profile; app._saveProfile();
  }
  app.returnToMenu();
  // Ana, the next time the main menu opens after the win.
  ok(koganeStep(saved(app)) === 'done', 'Ana\'s mark rose as the menu opened');
  ok(caption(app) === 'story.kogane.ana.call', 'Ana\'s first line');
  app.timers.at(-1).callback();
  ok(caption(app) === 'story.kogane.ana.lead' || caption(app) === null, 'then her second line follows');
  ok(app.storyProps().lead.startsWith('LEAD: Lake Kogane') && app.storyProps().skylineOwned === true, 'the lead is logged and the Skyline is owned');
  const anaCues = bonuses(app);
  app.returnToMenu();
  ok(bonuses(app) === anaCues, 'she calls only once');
}

// ---- 2. changing the road, the mode or the rival clears the mark -------------------------------------------------------
{
  const ready = () => freshApp({edit: profile => ({...profile, story: {version: 1, kogane: {read: true, lesson: true, supplies: true}}})});
  const startsAsStory = app => {
    ok(app.startCampaign(app.getRaceChoices()), 'started');
    const story = app._storyRace !== null && app.duel.state.rivalSettings?.car === KOGANE_SKYLINE;
    app.returnToMenu();
    return story;
  };
  let app = ready();
  ok(app.startStoryDuel() && startsAsStory(app), 'untouched, the race is the story\'s');

  app = ready();
  ok(app.startStoryDuel(), 'Race Daichi');
  app.setRaceSettings({eventId: 'pacific-canyon'});
  app.setRaceSettings({eventId: raceRoad});
  ok(!startsAsStory(app), 'changing the road clears the mark (even changing it back)');

  app = ready();
  ok(app.startStoryDuel(), 'Race Daichi');
  app.setRaceSettings({mode: 'timetrial'});
  app.setRaceSettings({mode: 'duel'});
  ok(!startsAsStory(app), 'changing the mode clears the mark');

  app = ready();
  ok(app.startStoryDuel(), 'Race Daichi');
  app.setRaceSettings({rival: {car: 'banshee_muscle', driverId: 'club', upgradeLevel: 2}});
  const plain = app.startCampaign(app.getRaceChoices());
  ok(plain && app._storyRace === null && app.duel.state.rivalSettings.car === 'banshee_muscle', 'changing the rival clears the mark: the player\'s rival races');
  app.returnToMenu();

  // Switching player cancels the pending mark.
  app = ready();
  const owner = app.player.id;
  ok(app.startStoryDuel(), 'Race Daichi');
  app.addPlayer('Second player');
  ok(app.selectPlayer(owner), 'back to the first player');
  ok(app.startCampaign(app.getRaceChoices()) && app._storyRace === null && app.duel.state.rivalSettings?.car !== KOGANE_SKYLINE, 'selecting a player cancels the mark');
  app.returnToMenu();

  // A menu refresh that sends the same values changes nothing.
  app = ready();
  ok(app.startStoryDuel(), 'Race Daichi');
  const now = app.getRaceChoices();
  app.setRaceSettings({startStage: now.startStage, mode: now.mode, cpuDifficulty: now.cpuDifficulty, car: now.car, rival: now.rival});
  ok(startsAsStory(app), 'the menu sending the same road, mode and rival keeps the mark');

  // Starting some other way (a different road) never carries the mark, and a stray story option does nothing.
  app = ready();
  ok(app.startStoryDuel(), 'Race Daichi');
  ok(app.startCampaign({startStage: COURSE.findIndex(c => c.id === 'pacific-canyon'), mode: 'duel'}) && app._storyRace === null, 'starting on another road is an ordinary race');
  app.returnToMenu();
  ok(app.startCampaign({startStage: COURSE.findIndex(c => c.id === 'pacific-canyon'), mode: 'duel', story: KOGANE_DUEL_MARK}) && app._storyRace === null &&
    app.duel.state.rivalSettings?.car !== KOGANE_SKYLINE, 'the mark on another road is dropped');
  app.returnToMenu();
  ok(app.startCampaign({startStage: COURSE.findIndex(c => c.id === 'kogane-pass'), mode: 'timetrial', story: KOGANE_DUEL_MARK}) && app._storyRace === null, 'and in another mode');
  app.returnToMenu();

  // A player who has not finished the earlier parts cannot start it.
  app = freshApp({edit: profile => ({...profile, story: {version: 1, kogane: {read: true, lesson: true}}})});
  ok(app.startStoryDuel() === false, 'Race Daichi waits for the supplies');
  ok(app.startCampaign({startStage: COURSE.findIndex(c => c.id === raceRoad), mode: 'duel', story: KOGANE_DUEL_MARK}) && app._storyRace === null, 'and a stray mark does nothing');
}

// ---- 3. the lesson mark: the Kogane row only, and only with the switch on ------------------------------------------------
{
  const result = (reward = {kind: 'brakes'}) => ({ok: true, reward, profile: createProfile()});
  const app = freshApp();
  const kogane = {id: 'corner', courseId: 'kogane-pass', carId: 'falcone_f42', marginSeconds: .4};
  ok(app._storyLessonPass(result(), kogane)?.profile.story.kogane.lesson === true, 'switch on, Kogane row: marked');
  ok(app._storyLessonPass(result(), {...kogane, courseId: 'panorama-ridge'}) === null, 'another row of the lesson: not marked');
  ok(app._storyLessonPass(result(), {...kogane, courseId: 'tremblant-snow'}) === null, 'and another');
  ok(app._storyLessonPass(result(), {...kogane, id: 'line'}) === null, 'another lesson on the Kogane road: not marked');
  ok(app._storyLessonPass(result(null), kogane)?.skipPassLine === true, 'a reward already taken skips Brian\'s "earned your reward" line');
  ok(app._storyLessonPass(result(), kogane)?.skipPassLine === false, 'a new reward keeps it');
  const off = freshApp({story: false});
  ok(off._storyLessonPass(result(), kogane) === null, 'switch off, Kogane row: not marked');
  const noSkyline = freshApp();
  noSkyline.duel.featureFlags = createFeatureFlags({storage: null, qa: false, overrides: {...PARTNERS, 'nissan-skyline': false, 'kogane-invitation': true}});
  ok(noSkyline._storyLessonPass(result(), kogane) === null, 'switch on but a partner switch off: not marked');
  const done = {...createProfile(), story: {version: 1, kogane: {lesson: true}}};
  ok(app._storyLessonPass({ok: true, reward: null, profile: done}, kogane) === null, 'a second pass changes nothing');
  const later = {...createProfile(), story: {version: 2, kogane: {}, extra: 1}};
  ok(app._storyLessonPass({ok: true, reward: null, profile: later}, kogane) === null, 'a story from a newer game is not written');

  // The real thing, with the switch off: the Kogane lesson pays its own reward and writes no story.
  const quiet = freshApp({story: false});
  ok(quiet.openDrivingLessons() && await quiet.startLesson({courseId: 'kogane-pass', car: 'falcone_f42', difficulty: 'casual'}), 'the lesson starts (switch off)');
  ok(caption(quiet) === null, 'no caption with the switch off');
  passLesson(quiet);
  ok(saved(quiet).drivingLessons.rewarded.corner === true && !Object.hasOwn(saved(quiet), 'story'), 'the lesson\'s own reward, and no story field with the switch off');
  ok(bonuses(quiet) === 0, 'no story chime');
  // And an early Kogane lesson with the switch off does not start the chain when it is switched on later.
  quiet.duel.featureFlags = flags(true);
  ok(koganeStep(quiet.profile) === 'invite', 'the chain still starts at the letter');
}

// ---- 3b. leaving cancels what is waiting ---------------------------------------------------------------------------------------
{
  const thanks = {type: 'jobDone', job: {id: STORY_JOB_ID, story: 'kogane'}};
  const waiting = app => app.timers.filter(timer => timer.ms === 3200);
  // Daichi's thanks waits 3.2 s; each way out of the flight and out of the game cancels it.
  let app = freshApp();
  app._heliEvents([thanks]);
  ok(waiting(app).length === 1 && app._storyThanks !== null, 'the thanks is waiting');
  app._storyLeave();
  ok(app._storyThanks === null && app.untimed.length === 1, 'leaving for a race or a lesson cancels it');
  app = freshApp();
  ok(app.visitHeli(), 'the helipad opens');
  app._heliEvents([thanks]);
  app.returnToMenu();
  ok(app._storyThanks === null && app.untimed.length >= 1, 'leaving the flight cancels it');
  app = freshApp();
  app._heliEvents([thanks]);
  app.dispose();
  ok(app._storyThanks === null && app.untimed.length >= 1, 'closing the game cancels it');

  // Brian's pass caption waits for his recorded line; leaving the lesson first drops it.
  app = freshApp({edit: profile => ({...profile, story: {version: 1, kogane: {read: true}}})});
  ok(app.openDrivingLessons() && await app.startLesson({courseId: 'kogane-pass', car: 'falcone_f42', difficulty: 'casual'}), 'the Kogane lesson starts');
  passLesson(app);
  ok(saved(app).story.kogane.lesson === true, 'passed');
  app.returnToMenu();
  await flush(() => caption(app) === 'story.kogane.brian.pass');
  ok(caption(app) !== 'story.kogane.brian.pass', 'leaving the lesson before the recorded line ends drops the caption');
}

// ---- 4. a newer game's story: no story anywhere ------------------------------------------------------------------------------
{
  const later = {version: 2, kogane: {read: true, lesson: true, supplies: true, duel: 'hard'}, future: {anything: 1}};
  const app = freshApp({edit: profile => ({...profile, story: later})});
  const kept = JSON.stringify(app.profile.story);
  ok(koganeStep(app.profile) === null, 'koganeStep is null for a newer story');
  same(app.storyProps(), {available: false, step: null, read: false, steps: [], fireClosed: null, skylineOwned: false, lead: ''}, 'nothing to show');
  ok(app.openStory() === false && app.startStoryDuel() === false && app.koganeStepNow() === null, 'nothing opens or starts');
  ok(app.startCampaign({startStage: COURSE.findIndex(c => c.id === raceRoad), mode: 'duel', story: KOGANE_DUEL_MARK}) && app._storyRace === null, 'a stray mark does nothing');
  app.returnToMenu();
  ok(app.visitHeli(), 'the helipad opens');
  ok(!app.heliSession.boardJobs().some(job => job.id === STORY_JOB_ID), 'no story job');
  app.returnToMenu();
  ok(caption(app) === null && JSON.stringify(app.profile.story) === kept && JSON.stringify(saved(app).story) === kept, 'no caption, and the newer story is kept exactly');
}

// ---- 5. the switch off changes nothing; Kogane not owned ----------------------------------------------------------------------
{
  const app = freshApp({story: false});
  same(app.storyProps(), {available: false, step: null, read: false, steps: [], fireClosed: null, skylineOwned: false, lead: ''}, 'switch off: no story props');
  ok(app.openStory() === false && app.startStoryDuel() === false && app.koganeStepNow() === null, 'switch off: nothing opens');
  ok(!Object.hasOwn(saved(app), 'story'), 'switch off: no story field is made');
  ok(app.visitHeli(), 'the helipad opens');
  ok(!app.heliSession.boardJobs().some(job => job.id === STORY_JOB_ID), 'switch off: no story job on the board');
  app.returnToMenu();
  const duelStart = app.startCampaign({startStage: COURSE.findIndex(c => c.id === raceRoad), mode: 'duel', story: KOGANE_DUEL_MARK});
  ok(duelStart && app._storyRace === null && app.duel.state.rivalSettings?.car !== KOGANE_SKYLINE, 'switch off: the mark is dropped, an ordinary duel');
  const result = {won: true, completed: true, timeSec: 120, laps: 1};
  app._settleResult(result, app.duel.state);
  ok(result.story === undefined && result.storyCar === undefined, 'switch off: nothing story-shaped on a result');
  app.returnToMenu();
  ok(caption(app) === null && app.cues.length === 0 && !Object.hasOwn(saved(app), 'story'), 'switch off: no caption, no chime, no save change');

  const unowned = freshApp({owned: false});
  ok(unowned.storyProps().available === false && unowned.openStory() === false, 'a player who does not own Kogane Pass sees no story');
  const partial = freshApp();
  partial.duel.featureFlags = createFeatureFlags({storage: null, qa: false, overrides: {...PARTNERS, 'nissan-skyline': false, 'kogane-invitation': true}});
  ok(partial.storyProps().available === false, 'and none while a switch it needs (the Skyline) is off');
}

  {
    const racing = freshApp();
    ok(racing.startCampaign({startStage: COURSE.findIndex(c => c.id === 'pacific-canyon')}), 'a race is on');
    ok(racing.openStory() === false && !Object.hasOwn(saved(racing), 'story'), 'the letter is not read during a race');
    racing.returnToMenu();
    ok(racing.openStory() === true, 'but it is on the menu');
  }

// ---- 6. the chime and the caption line -------------------------------------------------------------------------------------
{
  const app = freshApp(), played = [];
  app.audio._playCue = id => { played.push(id); };
  App.prototype._storyBonus.call(app);
  same(played, [], 'no sound device, no chime');
  app.audio.context = {};
  App.prototype._storyBonus.call(app);
  same(played, ['interface.bonus'], 'the finished-step chime is interface.bonus');
  app.audio.muted = true;
  App.prototype._storyBonus.call(app);
  same(played, ['interface.bonus'], 'muted, no chime');
  app.audio.context = null;
}

// ---- 6b. the caption line (browser only) -------------------------------------------------------------------------------------
{
  const {mountStoryCaption} = await import('../src/story/story-caption-view.js');
  const nodes = [];
  const element = () => ({hidden: false, style: {}, textContent: '', removed: false, setAttribute() {}, remove() { this.removed = true; }});
  const doc = {body: {append: node => nodes.push(node)}, createElement: () => element()};
  const app = freshApp();
  const view = mountStoryCaption(app, doc);
  ok(nodes.length === 1 && nodes[0].hidden === true, 'the line is hidden to begin');
  app._storySay('story.kogane.daichi.thanks');
  ok(nodes[0].hidden === false && nodes[0].textContent.startsWith('Tyres and tea'), 'the words show');
  app.timers.at(-1).callback();
  ok(nodes[0].hidden === true && nodes[0].textContent === '', 'and go when the reading time ends');
  view.dispose();
  ok(nodes[0].removed, 'taken down with the app');
  same(mountStoryCaption(app, null).dispose(), undefined, 'no page, no line');
}

console.log(`test-story-hooks: ${checks} checks passed${nightExists ? '' : ' (the Night road is not built yet: the grant itself is checked in test-story-kogane-duel.mjs)'}`);
process.exit(0);
