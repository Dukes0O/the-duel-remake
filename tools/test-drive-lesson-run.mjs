import {DRIVE_RADIO_LINES} from '../src/lessons/drive-radio-lines.js';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInstructorRun, buildLessonDemonstration, suggestedDriveLessonRun} from '../src/lessons/drive-lessons.js';
import {driveLessonBriefingMarkup, driveLessonCompletion, driveLessonPanelMarkup, driveLessonResultMarkup, driveLessonBoardModel, driveLessonBoardMarkup, bindDriveLessonUi, mountDriveLessonUi, settleDriveLessonPreparation, driveLessonGhostPose} from '../src/lessons/drive-lesson-ui.js';
// The real App fixture installs memory storage. No browser/player disk storage is used.
test('native App: Watch replay, any run from the menu, one winning run, once-only reward and owner isolation', async () => {
  const saved = new Map(['__DUEL_QA__', 'location'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.defineProperty(globalThis, '__DUEL_QA__', {configurable: true, value: true});
  Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '?flags=driving-lessons,tyre-slip'}});
  try {
    const [{withReferenceApp}, {finishDriveLesson}] = await Promise.all([
      import('./build-reference-laps.mjs'), import('../src/lessons/drive-lesson-save.js'),
    ]);
    await withReferenceApp(async app => {
      app.addPlayer('V2 owner'); const owner = app.player.id;
      app.addPlayer('V2 other'); const other = app.player.id, otherBefore = structuredClone(app.profile);
      app.selectPlayer(owner);
      app.setRaceSettings({eventId: 'panorama-ridge', car: 'falcone_f42', difficulty: 'casual'});
      const before = structuredClone(app.profile), leaderboard = structuredClone(app.leaderboard), ghosts = structuredClone(app.ghosts);
      assert.equal(app.openDrivingLessons(), true);
      assert.equal(await app.startLesson({courseId: 'panorama-ridge', car: 'falcone_f42', difficulty: 'casual'}), true);
      const run = app.duel.drivingLesson, state = app.duel.state;
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.corner.intro'].text);
      assert.equal(run.lesson.stage, 'watch'); assert.equal(app.selectPlayer(other), false);
      assert.equal(app.driveLessonBriefing, true); assert.equal(suggestedDriveLessonRun(run.lesson), 'watch');
      assert.equal(app.nextLessonAttempt(), true, 'Enter on the opening screen starts the highlighted run, Watch me');
      assert.equal(app.driveLessonBriefing, false);
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.corner.watch-late'].text);
      // Replay real inputs, not injected positions: fixed tick poses equal the recorded native run.
      for (let tick = 0; tick < 240; tick++) {
        app.duel.step(1 / 120);
        const expected = run.plan.instructor.poses[tick + 1];
        assert.ok(Math.abs(state.s - expected.s) < 1e-7, `watch tick ${tick}`);
        assert.ok(Math.abs(state.lateral - expected.lateral) < 1e-7);
      }
      // Watch me has no Skip any more: it runs to the finish, then the result screen offers the four runs.
      assert.equal(app.nextLessonAttempt(), false, 'Enter during a run does nothing');
      for (let tick = 0; tick < 120 * 120 && run.lesson.phase === 'driving'; tick++) app.duel.step(1 / 120);
      assert.equal(run.lesson.phase, 'result'); assert.equal(run.lesson.runs.watch.done, true);
      assert.equal(suggestedDriveLessonRun(run.lesson), 'follow');
      assert.equal(app.nextLessonAttempt(), true); assert.equal(run.lesson.stage, 'follow');
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.shared.follow'].text);
      assert.ok(app.getDriveLessonGhost());
      const drive = async mode => {
        const proof = mode === 'baseline' ? run.plan : await buildLessonDemonstration({lessonId: 'corner',
          courseId: run.plan.courseId, car: state.car, difficulty: state.difficulty, pace: run.plan.instructor.pace}, mode);
        for (const input of proof.instructor.inputs) {
          if (run.lesson.phase !== 'driving') break;
          app.duel.setInput(input); app.duel.step(1 / 120);
        }
        assert.equal(run.lesson.phase, 'result');
        return run.lesson.lastAttempt;
      };
      assert.equal((await drive('baseline')).passed, false); assert.deepEqual(app.profile, before);
      // Back to the ghost after a run (Kyle, 27 October): Follow me again, then on as before.
      assert.equal(app.chooseLessonStep('follow'), true); assert.equal(run.lesson.stage, 'follow'); assert.equal(run.lesson.phase, 'driving');
      assert.ok(app.getDriveLessonGhost()); assert.equal((await drive('baseline')).passed, false);
      assert.equal(app.nextLessonAttempt(), true); assert.equal(run.lesson.stage, 'your-turn');
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.shared.your-turn'].text);
      assert.equal(app.getDriveLessonGhost(), null);
      assert.equal((await drive('fast')).passed, true); assert.equal(run.lesson.done, false); assert.deepEqual(app.profile, before);
      assert.equal(app.nextLessonAttempt(), true); assert.equal(run.lesson.stage, 'beat');
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.shared.beat'].text);
      assert.equal((await drive('fast')).passed, true); assert.equal(run.lesson.done, true);
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.corner.pass'].text);
      assert.equal(run.saved, true); assert.equal(run.rewarded, true);
      const expected = finishDriveLesson(before, 'corner', run.lesson.bestMargin, state.car);
      assert.deepEqual(app.profile, expected.profile);
      const paid = structuredClone(app.profile);
      for (let tick = 0; tick < 120; tick++) app.duel.step(1 / 120);
      assert.deepEqual(app.profile, paid); assert.deepEqual(app.leaderboard, leaderboard); assert.deepEqual(app.ghosts, ghosts);
      // After a pass any run can still be picked (Kyle, 28 October); nothing is paid twice and the profile stays as saved.
      assert.equal(run.lesson.runs.beat.done, true); assert.equal(suggestedDriveLessonRun(run.lesson), 'your-turn');
      assert.equal(app.lessonRunKey('Digit1'), true); assert.equal(run.lesson.stage, 'watch'); assert.equal(run.lesson.phase, 'driving');
      assert.equal(app.lessonRunKey('Digit2'), false, 'the number keys do nothing while a run is going');
      assert.equal(app.lessonEscape(), true); assert.equal(app.driveLessonBriefing, true, 'Esc in a run returns to the opening screen');
      assert.equal(app.duel.drivingLesson, run); assert.equal(run.lesson.phase, 'driving');
      assert.equal(state.s, run.plan.corner.startS, 'the car is back at the start line under the menu');
      assert.equal(app.lessonRunKey('Digit4'), true); assert.equal(run.lesson.stage, 'beat'); assert.equal(app.driveLessonBriefing, false);
      assert.equal((await drive('fast')).passed, true); assert.deepEqual(app.profile, paid, 'a second pass pays nothing more');
      assert.equal(app.lessonEscape(), true); assert.equal(app.duel.drivingLesson, undefined, 'Esc after a run leaves the lesson');
      app.openDrivingLessons();
      assert.equal(await app.startLesson({courseId: 'panorama-ridge', car: 'falcone_f42', difficulty: 'casual'}), true);
      assert.equal(app.lessonEscape(), true); assert.equal(app.duel.drivingLesson, undefined, 'Esc on the opening screen leaves the lesson');
      assert.equal(app.getDriveLessonGhost(), null);
      app.selectPlayer(other); assert.deepEqual(app.profile, otherBefore);
      app.selectPlayer(owner); app.openDrivingLessons();
      assert.equal(await app.startLesson({courseId: 'panorama-ridge', car: 'falcone_f42', difficulty: 'casual'}), true);
      assert.equal(app.duel.drivingLesson.lesson.stage, 'your-turn');
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.corner.intro'].text);
      app.nextLessonAttempt();
      assert.equal(app.driveLessonRadioText, DRIVE_RADIO_LINES['drive.radio.v2.shared.your-turn'].text);
      app.leaveLesson();
    });
  } finally { for (const [k, d] of saved) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } }
});
test('completion requires the current owner, state, car, driver, difficulty and finished Beat me win', () => {
  const state = {playerId: 'kyle', car: 'falcone', driverId: 'club', difficulty: 'pro'};
  const lesson = {id: 'snow', stage: 'beat', phase: 'result', done: true, bestMargin: 1.2, lastAttempt: {passed: true, finished: true}};
  const run = {ownerId: 'kyle', state, plan: {car: 'falcone', driverId: 'club', difficulty: 'pro'}, lesson};
  assert.deepEqual(driveLessonCompletion(run, state, 'kyle'), {id: 'snow', carId: 'falcone', marginSeconds: 1.2});
  for (const changed of [{ownerId: 'other'}, {state: {...state}}, {plan: {...run.plan, car: 'other'}},
    {plan: {...run.plan, driverId: 'other'}}, {plan: {...run.plan, difficulty: 'casual'}},
    ...[{stage: 'your-turn'}, {done: false}, {bestMargin: 0}, {lastAttempt: {passed: false, finished: true}},
      {lastAttempt: {passed: true, finished: false}}].map(change => ({lesson: {...lesson, ...change}}))])
    assert.equal(driveLessonCompletion({...run, ...changed}, state, 'kyle'), null);
  const props = {playerId: 'kyle', runPlayerId: 'kyle', lesson: {...lesson, instructor: {timeSec: 40}}};
  assert.doesNotMatch(driveLessonPanelMarkup(props), /How this lesson works|Skip|step-strip|Leave lesson|data-drive-action/, 'nothing to press while driving');
  assert.match(driveLessonPanelMarkup(props), /Esc: back to the lesson menu/);
  assert.match(driveLessonResultMarkup(props), /One clean run faster/, 'the run buttons carry the one-line descriptions');
  for (const id of ['watch', 'follow', 'your-turn', 'beat']) assert.match(driveLessonResultMarkup(props), new RegExp(`data-drive-action="step:${id}"`));
  assert.match(driveLessonResultMarkup(props), /Lesson passed/);
});
test('the opening screen and the result screen both offer the four runs with marks, the highlighted one and no old controls', () => {
  const props = run(); props.briefing = true;
  Object.assign(props.lesson, {stage: 'watch', phase: 'driving', instructor: {timeSec: 7.31, corners: [{name: 'The Cutting', targetMph: 55}]},
    runs: {watch: {done: true, margin: 0}, 'your-turn': {done: true, margin: 1.25}}});
  for (const markup of [driveLessonBriefingMarkup(props), driveLessonResultMarkup({...props, lesson: {...props.lesson, phase: 'result'}})]) {
    for (const [i, title] of ['Watch me', 'Follow me', 'Your turn', 'Beat me'].entries())
      assert.match(markup, new RegExp(`data-drive-action="step:[a-z-]+"[^>]*aria-keyshortcuts="${i + 1}"[^>]*><strong>${i + 1} ${title}</strong>`));
    assert.match(markup, /Done<\/em>/); assert.match(markup, /Passed, best 1\.25 s faster, Gold<\/em>/);
    assert.equal((markup.match(/drive-lesson-suggested/g) ?? []).length, 1, 'one highlighted run');
    assert.match(markup, /data-drive-action="step:follow"[^>]*drive-lesson-suggested/, 'the first run not done is highlighted');
    assert.match(markup, /data-drive-action="leave"/);
    assert.doesNotMatch(markup, /How this lesson works|Skip|step-strip|brief-steps|data-drive-action="(next|help|skip|close-help)"/);
  }
  const all = {...props.lesson, runs: Object.fromEntries(['watch', 'follow', 'your-turn', 'beat'].map(id => [id, {done: true, margin: 0}]))};
  assert.equal(suggestedDriveLessonRun(all), 'your-turn', 'every run done: suggest Your turn');
  assert.equal(suggestedDriveLessonRun({retake: true, runs: {}}), 'your-turn', 'a retake skips the practice runs');
  assert.equal(suggestedDriveLessonRun({retake: true, runs: {'your-turn': {done: true}}}), 'beat');
});
test('native input runs repeat across frame partitions', async () => {
  const options = {lessonId: 'corner', courseId: 'panorama-ridge', car: 'koenigsegg_jesko', difficulty: 'pro'};
  const baseline = await buildInstructorRun({...options, fps: 30});
  for (const fps of [60, 144]) assert.deepEqual(await buildInstructorRun({...options, fps}), baseline);
});

const base = () => ({
  playerId: 'kyle', carId: 'falcone', difficulty: 'pro',
  cars: [{id: 'falcone', name: 'Falcone'}], ownedCarIds: ['falcone'],
  courses: [{id: 'panorama-ridge', name: 'Panorama Ridge'}, {id: 'tremblant-woods', name: 'Tremblant Woods'}],
  corners: [{courseId: 'panorama-ridge', cornerName: 'The Cutting', rollingMph: 100},
    {courseId: 'tremblant-woods', cornerName: 'Beaver Hairpin', rollingMph: 75}],
  ownedCourseIds: ['panorama-ridge'], progress: null,
});
const run = () => ({...base(), runPlayerId: 'kyle', lesson: {
  id: 'corner', stage: 'your-turn', phase: 'result', done: false, streak: 0, bestMargin: .42,
  instructor: {timeSec: 7.31}, lastAttempt: {elapsedSeconds: 8.42, timeLostSeconds: 1.11,
    screechSeconds: 1.6, endReason: 'finish', finished: true, passed: false,
    progressM: 120, rules: [true, true, false, false]},
}});
function freeze(value) {
  if (value && typeof value === 'object') {Object.freeze(value); Object.values(value).forEach(freeze);}
  return value;
}


function dom() {
  const handlers = new Map();
  const root = {contains: node => node?.inside === true,
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name, fn) => {if (handlers.get(name) === fn) handlers.delete(name);}};
  const node = (dataset = {}, tagName = 'BUTTON', extra = {}) => ({dataset, tagName, inside: true,
    closest(selector) {return selector.includes('data-drive-action') && this.dataset.driveAction ? this : null;}, ...extra});
  const emit = (name, target, extra = {}) => {
    const event = {target, preventDefault() {this.prevented = true;}, ...extra};
    handlers.get(name)?.(event); return event;
  };
  return {root, node, emit, handlers};
}


test('lesson admission needs only driving-lessons and sliding rules stay inside its private race', async () => {
  const [{withReferenceApp}, {createFeatureFlags}, {COURSE}] = await Promise.all([
    import('./build-reference-laps.mjs'), import('../src/feature-flags.js'), import('../src/config.js'),
  ]);
  for (const difficulty of ['casual', 'pro']) await withReferenceApp(async app => {
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: false,
      overrides: {'driving-lessons': true, 'tyre-slip': false}});
    const duel = app.duel;
    const ordinary = () => {
      duel.startCampaign({car: 'falcone_f42', difficulty: 'pro', opponentCount: 0, seed: 1989});
      duel.setInput({throttle: 1, steer: .5}); duel.step(1 / 120);
      assert.equal(duel.drivingLesson, undefined);
      assert.equal(duel._tyreSlipRaceEnabled, false);
      assert.equal(Object.hasOwn(duel.state, 'tyreSlipRules'), false);
      assert.equal(Object.hasOwn(duel.state, 'tyreSlip'), false);
      app.returnToMenu();
    };
    ordinary();
    assert.equal(app.drivingLessonsAvailable(), true, 'tyre-slip off does not hide lessons');
    assert.equal(app.openDrivingLessons(), true);
    assert.equal(await app.startLesson({courseId: 'tremblant-woods', car: 'falcone_f42', difficulty}), true);
    assert.equal(duel.featureFlags.enabled('tyre-slip'), false);
    assert.equal(duel._tyreSlipRaceEnabled, true, `${difficulty}: the lesson latches its own sliding rules`);
    assert.equal(duel.state.tyreSlipRules, true);
    duel.setInput({throttle: 1, steer: .5}); duel.step(1 / 120);
    assert.equal(Number.isFinite(duel.state.tyreSlip), true, 'the lesson actually steps the sliding model');
    const plan = structuredClone(duel.drivingLesson.plan), playerId = app.player.id;
    app.leaveLesson();
    ordinary();
    duel.featureFlags = createFeatureFlags({storage: null, qa: false,
      overrides: {'driving-lessons': false, 'tyre-slip': true}});
    assert.equal(app.drivingLessonsAvailable(), false, 'tyre-slip alone cannot admit a lesson');
    assert.equal(app.openDrivingLessons(), false);
    assert.throws(() => duel.startCampaign({startStage: COURSE.findIndex(row => row.id === plan.courseId),
      car: plan.car, difficulty: plan.difficulty, driverId: plan.driverId, upgrades: plan.upgrades,
      seed: plan.seed, playerId, lesson: plan}), /Driving lesson setup does not belong/);
  });
});

// Native inputs only: no pose placement, replacement instructor, fake result,
// reward callback or lesson-progress assignment. App receives Duel events.
async function driveNativeHostAttempt(app, mode) {
  const [{DRIVE, steerForYaw, tyreSlipSteering}, {DRIVE_LESSON_CORNERS, instructorControls, lessonPlanFor}] = await Promise.all([
    import('../src/config.js'), import('../src/lessons/drive-lessons.js'),
  ]);
  const duel = app.duel, state = duel.state, run = duel.drivingLesson;
  const {corner, instructor, difficulty, courseId} = run.plan, course = duel.course, car = duel.car;
  const pace = difficulty === 'casual' ? .92 : .95;
  // The student drives the instructor's own line and speed plan.
  const lessonPlan = await lessonPlanFor(duel, DRIVE_LESSON_CORNERS.find(row => row.courseId === courseId), pace);
  const {line, profile} = lessonPlan;
  const scale = mode === 'fast' ? 1 : mode === 'slow' ? pace * .8 : pace;
  const plan = {course, car, line, profile: {pace,at: s => profile.at(s) * scale / pace}, drive: DRIVE,
    steerForYaw, difficulty, turnInS: corner.turnInS, turnOutS: corner.turnOutS, brakeS: profile.brakeS};
  const cornerSpeed = Math.min(...instructor.poses.filter(pose => pose.s >= corner.turnInS && pose.s <= corner.turnOutS).map(pose => pose.mph));
  assert.equal(Number.isFinite(cornerSpeed) && cornerSpeed > 0, true);
  let brakingDone = false;
  for (let tick = 0; tick < 120 * 120 && run.lesson.phase === 'driving'; tick++) {
    const surface = duel._drivingSurface(state.s, state.lateral);
    let controls = instructorControls(state, surface, plan);
    if (mode === 'late') {
      // Follows the instructor's plan up to cone 1, holds full throttle to the
      // board, brakes there, and may ask for full steering.
      const brakeS = instructor.redBoardS, early = state.s < instructor.cones[0].s;
      if (state.s >= brakeS && state.speedMph <= cornerSpeed) brakingDone = true;
      const brake = state.s >= brakeS && !brakingDone ? 1 : 0, flatOut = !early && state.s < brakeS;
      if (!early) controls = {...controls, brake: flatOut ? 0 : brake, throttle: flatOut ? 1 : brake ? 0 : controls.throttle};
      const rawSteer = (yaw, options) => {
        const {steerGain} = tyreSlipSteering({...options, brake});
        return Math.max(-1, Math.min(1, -yaw / Math.max(.05, steerGain)));
      };
      controls.steer = instructorControls(state, surface, {...plan, steerForYaw: rawSteer}).steer;
    }
    duel.setInput(controls); duel.step(1 / 120);
  }
  assert.equal(run.lesson.phase, 'result', `${mode} must produce a real native result`);
  return structuredClone(run.lesson.lastAttempt);
}


test('board uses supplied course order, chosen corner, actual car and setting without mutation', () => {
  const props = freeze(base()), model = driveLessonBoardModel(props);
  assert.deepEqual(model.start, {lessonId: 'corner', courseId: 'panorama-ridge', carId: 'falcone', difficulty: 'pro'});
  assert.deepEqual(model.courses.map(row => row.id), ['panorama-ridge', 'tremblant-woods']);
  assert.equal(model.rows[0].open, true); assert.equal(model.rows[0].group, 'Driving');
  assert.equal(model.rows[0].done, false); assert.equal(props.courseId, undefined);
  const woods = {...base(), ownedCourseIds: [], courseId: 'tremblant-woods'};
  assert.equal(driveLessonBoardModel(woods).start.courseId, 'tremblant-woods');
});


test('missing course, wrong car, missing player, unknown difficulty or newer save cannot start', () => {
  const unavailable = [
    {...base(), corners: []}, {...base(), ownedCarIds: []}, {...base(), playerId: ''},
    {...base(), carId: 'missing'}, {...base(), difficulty: 'hard'},
    {...base(), progress: {version: 2, done: {corner: true}}},
  ];
  for (const props of unavailable) {
    assert.equal(driveLessonBoardModel(props).start, null);
    assert.doesNotMatch(driveLessonBoardMarkup(props), /data-drive-action="start:corner"/);
  }
  assert.match(driveLessonBoardMarkup(unavailable[0]), /No lesson course is available/);
});



test('a new player can choose either lesson 1 corner without buying a course', () => {
  for (const courseId of ['panorama-ridge', 'tremblant-woods']) {
    const props = {...base(), ownedCourseIds: [], courseId};
    assert.equal(driveLessonBoardModel(props).start.courseId, courseId);
    const markup = driveLessonBoardMarkup(props);
    assert.doesNotMatch(markup, /not owned|buy |disabled/);
    const d = dom(), selections = [];
    const clean = bindDriveLessonUi(d.root, () => props, {onSelectCourse: value => selections.push(value)});
    d.emit('change', d.node({driveCourse: courseId}, 'INPUT'));
    assert.deepEqual(selections, [{courseId}]);
    clean();
  }
});


test('completed lesson stays a retake with the supplied best margin and no reward promise', () => {
  const props = {...base(), progress: {version: 1, done: {corner: true}, best: {corner: .42}, rewarded: {corner: true}}};
  const markup = driveLessonBoardMarkup(props);
  assert.match(markup, /Retake/); assert.match(markup, /Best: 0.42 s faster/);
  assert.doesNotMatch(markup, /600|free brake|earned|credits/);
});


test('board escapes course, corner and car labels and supplies labelled keyboard controls', () => {
  const props = base(); props.courses[0].name = '<img src=x onerror=alert(1)>';
  props.corners[0].cornerName = 'Cutting <script>'; props.cars[0].name = 'Car " onmouseover="bad';
  const markup = driveLessonBoardMarkup(props);
  assert.doesNotMatch(markup, /<img|<script|onmouseover="bad/);
  assert.match(markup, /&lt;img/); assert.match(markup, /&lt;script/);
  assert.match(markup, /<fieldset/); assert.match(markup, /<legend>Choose a corner/);
  assert.match(markup, /type="radio"/); assert.match(markup, /checked/);
  assert.match(markup, /lesson-board/); assert.match(markup, /data-drive-action="start:corner"/);
});


test('bindings use fresh player and course props, reject forged actions and cleanly detach', () => {
  const d = dom(), starts = [], selections = []; let props = base();
  const clean = bindDriveLessonUi(d.root, () => props, {onStart: value => starts.push(value), onSelectCourse: value => selections.push(value)});
  d.emit('click', d.node({driveAction: 'start:corner'})); assert.equal(starts.length, 1);
  props = {...props, playerId: ''};
  d.emit('click', d.node({driveAction: 'start:corner'})); assert.equal(starts.length, 1);
  props = {...base(), ownedCourseIds: ['tremblant-woods'], courseId: 'tremblant-woods'};
  d.emit('click', d.node({driveAction: 'start:corner'})); assert.equal(starts[1].courseId, 'tremblant-woods');
  d.emit('change', d.node({driveCourse: 'unknown'}, 'INPUT')); assert.equal(selections.length, 0);
  d.emit('change', d.node({driveCourse: 'tremblant-woods'}, 'INPUT')); assert.deepEqual(selections, [{courseId: 'tremblant-woods'}]);
  d.emit('click', d.node({driveAction: 'start:other'}));
  d.emit('click', d.node({driveAction: 'start:corner'}, 'BUTTON', {inside: false}));
  assert.equal(starts.length, 2); clean(); assert.equal(d.handlers.size, 0);
});


test('Enter only requests the highlighted run on the opening and result screens, leave delegates without mutating lesson', () => {
  const d = dom(), calls = []; let props = run(); const before = structuredClone(props);
  const clean = bindDriveLessonUi(d.root, () => props, {onNext: () => calls.push('next'), onLeave: () => calls.push('leave')});
  d.emit('click', d.node({driveAction: 'next'})); assert.deepEqual(calls, [], 'there is no Start button any more');
  const key = d.emit('keydown', d.node({}, 'DIV'), {key: 'Enter', repeat: false});
  assert.equal(key.prevented, true); assert.deepEqual(calls, ['next']);
  d.emit('keydown', d.node({}, 'INPUT'), {key: 'Enter'}); assert.equal(calls.length, 1);
  assert.deepEqual(props, before);
  props.lesson.phase = 'driving'; d.emit('keydown', d.node({}, 'DIV'), {key: 'Enter'}); assert.equal(calls.length, 1, 'Enter does nothing during a run');
  props.briefing = true; d.emit('keydown', d.node({}, 'DIV'), {key: 'Enter'}); assert.equal(calls.length, 2, 'Enter starts the highlighted run on the opening screen');
  props = {...run(), runPlayerId: 'son'}; d.emit('keydown', d.node({}, 'DIV'), {key: 'Enter'}); assert.equal(calls.length, 2);
  d.emit('click', d.node({driveAction: 'leave'})); assert.equal(calls.at(-1), 'leave'); clean();
});


test('presentation CSS stays within its own component and preserves visible keyboard focus', async () => {
  const css = await readFile(new URL('../src/lessons/drive-lesson-ui.css', import.meta.url), 'utf8');
  for (const block of css.matchAll(/([^{}]+)\{/g)) {
    const selector = block[1].trim(); if (selector.startsWith('@')) continue;
    assert.ok(selector.split(',').every(value => value.trim().startsWith('.drive-lesson')), selector);
  }
  assert.match(css, /:focus-visible/); assert.doesNotMatch(css, /outline:\s*(none|0)/);
});



test('a lesson hides the Time Trial banner, lap count and style points, and only a lesson does', async () => {
  const hudSource = await readFile(new URL('../src/screen-hud.js', import.meta.url), 'utf8');
  const hudCss = await readFile(new URL('../src/screen-hud.css', import.meta.url), 'utf8');
  assert.match(hudSource, /classList\.toggle\('is-lesson',!!app\.duel\.drivingLesson\)/,
    'the class follows the lesson run and nothing else');
  assert.equal((hudSource.match(/is-lesson/g) ?? []).length, 1);
  const rule = hudCss.match(/([^{}\n]*\.is-lesson[^{}]*)\{display:none\}/);
  assert.ok(rule, 'one rule hides the lesson-inapplicable readouts');
  assert.deepEqual(rule[1].split(',').map(value => value.trim()).sort(), [
    '.is-lesson #route-lap', '.is-lesson #style-score-panel', '.is-lesson .lap-readout', '.is-lesson .race-position']);
  assert.equal((hudCss.match(/is-lesson/g) ?? []).length, 4, 'nothing else changes under the class');
  for (const kept of ['#speed-value', '#gear-value', 'route-hud', 'route-map', 'race-clock'])
    assert.doesNotMatch(rule[0], new RegExp(kept), `${kept} stays visible in a lesson`);
});


test('while driving, the instructor caption sits top right where the Time Trial banner was, not over the minimap', async () => {
  const css = await readFile(new URL('../src/lessons/drive-lesson-ui.css', import.meta.url), 'utf8');
  const caption = css.match(/\.drive-lesson-host-running:not\(\.drive-lesson-host-result\) \.drive-lesson-message, \.drive-lesson-host-running:not\(\.drive-lesson-host-result\) \.drive-lesson-radio \{([^}]*)\}/);
  assert.ok(caption, 'the driving caption is its own rule');
  assert.match(caption[1], /position: fixed; top: 128px; right: 35px;/);
  assert.match(css, /@media \(max-width: 900px\) \{[^@]*top: 64px; left: 18px; right: 18px;/);
  assert.doesNotMatch(css, /flex-direction: row/, 'the caption is no longer stacked beside or under the panel');
});


test('owned host code isolates lessons from ordinary settlement, ghost saving and progression',async()=>{
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const game=await readFile(new URL('../src/game.js',import.meta.url),'utf8');
  for(const signature of ['_startLapTelemetry(state)','_updateLapTelemetry(state)','_startGhostStage(state)',
    '_updateGhost(state)','_markActiveRace(state)','_settleResult(result,state)','_recordIntelLap(event,state)',
    '_settlePoliceTicket(ticket,state)']){
    const at=app.indexOf('  '+signature);
    assert.ok(at>=0,signature+' exists');
    assert.match(app.slice(at,at+115),/if\(this\.duel\.drivingLesson\)return;/,signature+' rejects lesson run');
  }
  const begin=game.indexOf('  _stepDriveLesson(dt)'),end=game.indexOf('  // ---- arena events',begin);
  const branch=game.slice(begin,end);
  assert.match(branch,/this\._drive\(dt\)/);assert.match(branch,/this\._collisions\(\)/);
  assert.doesNotMatch(branch,/_advanceLaps|_finishStage|_traffic|_police|stepCombat|settleRace/);
  assert.match(game,/s\.traffic = grandPrix \|\| this\.drivingLesson \? \[\] : this\._spawnTraffic/);
});



test('preparation cleanup clears only its still-current token and cannot erase a newer attempt',()=>{
  const old={},current={},host={_driveLessonPreparing:current,driveLessonMessage:'New run preparing'};
  assert.equal(settleDriveLessonPreparation(host,old,'Old run rejected'),false);
  assert.equal(host._driveLessonPreparing,current);assert.equal(host.driveLessonMessage,'New run preparing');
  assert.equal(settleDriveLessonPreparation(host,current,'Setup changed'),true);
  assert.equal(host._driveLessonPreparing,null);assert.equal(host.driveLessonMessage,'Setup changed');
});


test('nullable native ghost ground fields do not become invented zero-height witnesses',()=>{
  const sample={t:0,s:10,lateral:2,heading:.2,mph:60,airHeight:0,groundHeight:null,terrainPitch:null};
  const next={...sample,t:1,s:20,groundHeight:700,terrainPitch:.3,terrainRoll:.2};
  const course={at:()=>({heading:.1})};
  for(const time of [0,.5]){
    const actual=driveLessonGhostPose([sample,next],time,'falcone',course);
    assert.equal(actual.groundHeight,null);assert.equal(actual.terrainPitch,null);assert.equal(actual.terrainRoll,null);
    assert.equal(actual.airHeight,0,'a genuine finite zero is preserved');
  }
  const actual=driveLessonGhostPose([{...sample,groundHeight:600,terrainPitch:.1,terrainRoll:0},next],.5,'falcone',course);
  assert.equal(actual.groundHeight,650);assert.equal(actual.terrainPitch,.2);assert.equal(actual.terrainRoll,.1);
});


test('failed lesson save keeps one session reward, preserves durable progress and retry persists it once',async()=>{
  const {finishDriveLesson}=await import('../src/lessons/drive-lesson-save.js');
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const method=(name,next,...dependencies)=>{
    const start=source.indexOf('  '+name+'('),end=source.indexOf('  '+next+'(',start);
    assert.ok(start>=0&&end>start);
    return Function('finishDriveLesson','driveLessonCompletion','return ({'+source.slice(start,end)+'}).'+name)(...dependencies);
  };
  const event=method('_driveLessonEvent','retryLessonSave',finishDriveLesson,driveLessonCompletion);
  const retry=method('retryLessonSave','_sayDriveLesson',finishDriveLesson,driveLessonCompletion);
  const state={playerId:'kyle',car:'falcone_f42',difficulty:'pro',driverId:'club'};
  const lesson={id:'corner',stage:'beat',phase:'result',done:true,streak:3,bestMargin:.4,
    lastAttempt:{finished:true,passed:true}};
  const run={state,ownerId:'kyle',plan:{car:state.car,difficulty:state.difficulty,driverId:state.driverId},lesson};
  const profile={credits:100,unlockedCars:[state.car],upgrades:{[state.car]:{brakes:1}}};
  let durable=JSON.stringify(profile),canSave=false,writes=0;
  const radio=[],host={duel:{state,drivingLesson:run},player:{id:'kyle'},_runPlayerId:'kyle',profile,
    audio:{context:null},_refreshPlayer(){},_sayDriveLesson:id=>radio.push(id),
    _saveProfile(){writes++;this.profileSaved=canSave;if(canSave)durable=JSON.stringify(this.profile);return canSave;}};
  const response={driveLessonAnswer:{result:'passed',radio:'drive.radio.v2.corner.pass',cones:[]}};
  event.call(host,state,response);
  assert.equal(host.profile.upgrades[state.car].brakes,2);assert.equal(run.rewarded,true);assert.equal(run.saved,false);
  assert.equal(JSON.parse(durable).upgrades[state.car].brakes,1,'failed storage retains the last durable career');
  assert.match(host.driveLessonMessage,/this session|could not be saved/);assert.deepEqual(radio,[],'no durable success line before save');
  event.call(host,state,response);assert.equal(host.profile.upgrades[state.car].brakes,2);assert.equal(writes,1,'duplicate event never pays or saves twice');
  canSave=true;assert.equal(retry.call(host),true);assert.equal(run.saved,true);
  const reloaded=JSON.parse(durable);
  assert.equal(reloaded.upgrades[state.car].brakes,2);assert.equal(reloaded.drivingLessons.rewarded.corner,true);
  assert.equal(finishDriveLesson(reloaded,'corner',.5,state.car).profile.upgrades[state.car].brakes,2,'retake after successful reload cannot pay again');
  assert.deepEqual(radio,['drive.radio.v2.corner.pass']);assert.equal(retry.call(host),false);
});


test('save retry is shown and dispatched only for a current completed session with failed persistence',()=>{
  const props=run();Object.assign(props.lesson,{stage:'beat',done:true,streak:3});
  Object.assign(props.lesson.lastAttempt,{finished:true,passed:true});props.lessonSaveFailed=true;
  assert.match(driveLessonResultMarkup(props),/data-drive-action="retry-save"/);
  const d=dom();let retries=0;
  const clean=bindDriveLessonUi(d.root,()=>props,{onRetrySave:()=>retries++});
  d.emit('click',d.node({driveAction:'retry-save'}));assert.equal(retries,1);
  props.runPlayerId='son';d.emit('click',d.node({driveAction:'retry-save'}));assert.equal(retries,1);
  props.runPlayerId='kyle';props.lessonSaveFailed=false;d.emit('click',d.node({driveAction:'retry-save'}));assert.equal(retries,1);
  assert.doesNotMatch(driveLessonResultMarkup(props),/data-drive-action="retry-save"/);clean();
});



test('changing the owned corner cancels its pending instructor preparation', () => {
  const d = dom();
  Object.assign(d.root, {classList: {toggle() {}}, querySelector() {return null;}, remove() {}});
  const host = {ownerDocument: {createElement: () => d.root, activeElement: null},
    append() {}, addEventListener() {}, removeEventListener() {}, querySelector() {return null;}};
  const token = {}, app = {driveLessonCourse: 'panorama-ridge', _driveLessonPreparing: token,
    driveLessonMessage: 'Preparing the instructor run.', driveLessonBoardOpen: true,
    duel: {state: {status: 'menu'}}, drivingLessonsAvailable: () => true,
    driveLessonProps() {return {...base(), ownedCourseIds: ['panorama-ridge', 'tremblant-woods'], courseId: this.driveLessonCourse};}};
  const mounted = mountDriveLessonUi(app, host);
  try {
    d.emit('change', d.node({driveCourse: 'panorama-ridge'}, 'INPUT'));
    assert.equal(app._driveLessonPreparing, token, 'same corner keeps its current preparation');
    d.emit('change', d.node({driveCourse: 'unknown'}, 'INPUT'));
    assert.equal(app._driveLessonPreparing, token, 'unavailable corner cannot cancel a real request');
    d.emit('change', d.node({driveCourse: 'tremblant-woods'}, 'INPUT'));
    assert.equal(app.driveLessonCourse, 'tremblant-woods');
    assert.equal(app._driveLessonPreparing, null, 'the old corner must not launch after the selection changes');
    assert.equal(app.driveLessonMessage, '');
    const nextToken = {};
    app._driveLessonPreparing = nextToken;
    assert.equal(settleDriveLessonPreparation(app, token, 'old request failed'), false);
    assert.equal(app._driveLessonPreparing, nextToken, 'the old continuation cannot cancel a newer preparation');
  } finally {mounted.dispose();}
});
