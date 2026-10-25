import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {driveLessonBoardModel, driveLessonBoardMarkup, driveLessonPanelMarkup, driveLessonResultMarkup,
  bindDriveLessonUi, driveLessonCompletion, shiftLightsLit, SHIFT_LIGHTS, shiftLightCue, markersKnocked,
  DRIVE_LESSON_VIEW} from '../src/lessons/drive-lesson-ui.js';

// DRIVE-LESSONS-VIEW-2: lessons 2 to 4 in the game. The pure screens first, then the host hooks natively.
const LINE_ROWS = [{courseId: 'tremblant-woods', cornerNames: ['Fir Esses 1', 'Fir Esses 2']},
  {courseId: 'harbour-lights', cornerNames: ['Old Town Esses 1', 'Old Town Esses 2', 'Old Town Esses 3', 'Old Town Esses 4']}];
const GEAR_ROWS = [{courseId: 'panorama-ridge', cornerName: 'The Cutting'}, {courseId: 'tremblant-woods', cornerName: 'Beaver Hairpin'}];
const SNOW_ROWS = [{courseId: 'tremblant-snow', cornerNames: ['Beaver Hairpin']}];
const base = () => ({
  playerId: 'kyle', carId: 'falcone', difficulty: 'pro',
  cars: [{id: 'falcone', name: 'Falcone'}], ownedCarIds: ['falcone'],
  courses: [{id: 'panorama-ridge', name: 'Panorama Ridge'}, {id: 'tremblant-woods', name: 'Tremblant Woods'},
    {id: 'harbour-lights', name: 'Harbour Lights'}, {id: 'tremblant-snow', name: 'Tremblant Snow'}],
  corners: [{courseId: 'panorama-ridge', cornerName: 'The Cutting', rollingMph: 100}, {courseId: 'tremblant-woods', cornerName: 'Beaver Hairpin', rollingMph: 75}],
  ownedCourseIds: ['panorama-ridge', 'tremblant-woods', 'harbour-lights', 'tremblant-snow'], progress: null,
  lessonRows: {line: LINE_ROWS, gears: GEAR_ROWS, snow: SNOW_ROWS}, engineCurve: true,
  lessonAccess: {line: {open: false}, gears: {open: false}, snow: {open: false}},
});
const done = (...ids) => ({version: 1, done: Object.fromEntries(['corner', ...ids].map(id => [id, true])),
  best: Object.fromEntries(['corner', ...ids].map(id => [id, .4])), rewarded: {}});
const open = (...ids) => Object.fromEntries(['line', 'gears', 'snow'].map(id => [id, {open: ids.includes(id)}]));

test('without the later lessons the board is lesson 1 alone, as the helipad needs', () => {
  const props = base(); delete props.lessonRows;
  const model = driveLessonBoardModel(props);
  assert.deepEqual(model.rows.map(row => row.id), ['corner']);
  assert.equal(model.byId, undefined);
});

test('the board lists four lessons and says why each later one is shut', () => {
  const fresh = driveLessonBoardModel({...base(), engineCurve: false});
  assert.deepEqual(fresh.rows.map(row => row.id), ['corner', 'line', 'gears', 'snow']);
  assert.deepEqual(fresh.rows.map(row => row.open), [true, false, false, false]);
  assert.match(fresh.byId.line.reason, /^Opens later: finish lesson 1/);
  assert.match(fresh.byId.gears.reason, /^Opens later: waiting for the new engines/, 'while engine-curve is off');
  const noCurve = driveLessonBoardModel({...base(), engineCurve: false});
  assert.match(noCurve.byId.gears.reason, /^Opens later/);
  assert.match(driveLessonBoardModel({...base(), engineCurve: true}).byId.gears.reason, /finish lesson 2 first/,
    'engine-curve on but lesson 2 not done: gears is still shut by the host access');
  const withLine = driveLessonBoardModel({...base(), engineCurve: true, progress: done(), lessonAccess: open('line')});
  assert.deepEqual(withLine.rows.map(row => row.open), [true, true, false, false]);
  assert.match(withLine.byId.gears.reason, /finish lesson 2 first/);
  assert.match(withLine.byId.snow.reason, /finish lesson 3 first/);
  const noCurveSnow = driveLessonBoardModel({...base(), engineCurve: false, progress: done('line'), lessonAccess: open('line', 'snow')});
  assert.equal(noCurveSnow.byId.snow.start.lessonId, 'snow', 'snow follows lesson 2 while the gearbox lesson is off');
  const all = driveLessonBoardModel({...base(), progress: done('line', 'gears', 'snow'), lessonAccess: open('line', 'gears', 'snow')});
  assert.deepEqual(all.rows.map(row => [row.open, row.done]), [[true, true], [true, true], [true, true], [true, true]]);
});

test('a later lesson needs an owned course, a car and a setting, and a start names its own course', () => {
  const access = open('line', 'gears', 'snow'), progress = done('line', 'gears');
  const props = {...base(), progress, lessonAccess: access, ownedCourseIds: ['panorama-ridge']};
  const model = driveLessonBoardModel(props);
  assert.match(model.byId.line.reason, /^Opens later: buy Tremblant Woods or Harbour Lights\.$/);
  assert.match(model.byId.snow.reason, /^Opens later: buy Tremblant Snow\.$/);
  assert.deepEqual(model.byId.gears.start, {lessonId: 'gears', courseId: 'panorama-ridge', carId: 'falcone', difficulty: 'pro'});
  const woods = driveLessonBoardModel({...props, ownedCourseIds: ['tremblant-woods', 'harbour-lights'], courseIds: {line: 'harbour-lights'}});
  assert.equal(woods.byId.line.start.courseId, 'harbour-lights', 'the chosen course');
  assert.equal(woods.byId.gears.start.courseId, 'tremblant-woods');
  assert.equal(driveLessonBoardModel({...props, ownedCarIds: []}).byId.gears.start, null);
  assert.equal(driveLessonBoardModel({...props, difficulty: 'hard'}).byId.gears.start, null);
  assert.equal(driveLessonBoardModel({...props, progress: {version: 2, done: {corner: true}}}).byId.gears.start, null);
  assert.equal(driveLessonBoardModel({...props, engineCurve: false}).byId.gears.start, null);
});

test('the board shows each lesson row with its reason, a course choice only where there is one, and escapes labels', () => {
  const props = {...base(), engineCurve: false, progress: done('line'), lessonAccess: open('line')};
  props.courses[1].name = 'Woods <b>';
  const markup = driveLessonBoardMarkup(props);
  assert.match(markup, /2 The racing line/); assert.match(markup, /3 The gearbox/); assert.match(markup, /4 Snow/);
  assert.match(markup, /data-drive-action="start:line"/); assert.doesNotMatch(markup, /data-drive-action="start:gears"/);
  assert.match(markup, /Opens later: waiting for the new engines/);
  assert.match(markup, /Fir Esses and Old Town Esses|Fir Esses/);
  assert.match(markup, /data-drive-lesson="line"/, 'two owned places for lesson 2: a choice');
  assert.doesNotMatch(markup, /data-drive-lesson="snow"/, 'one place only: no choice');
  assert.doesNotMatch(markup, /<b>/); assert.match(markup, /Woods &lt;b&gt;/);
  assert.match(markup, /2 The racing line \(best 0.40 s faster\)/);
});

test('a start button starts that lesson; a course choice names its lesson; forged ones do nothing', () => {
  const root = {contains: node => node?.inside === true, handlers: new Map(),
    addEventListener(name, fn) {this.handlers.set(name, fn);}, removeEventListener() {}};
  const props = {...base(), progress: done('line'), lessonAccess: open('line'), courseIds: {}};
  const calls = [];
  bindDriveLessonUi(root, () => props, {onStart: request => calls.push(['start', request]), onSelectCourse: choice => calls.push(['select', choice])});
  const button = id => ({dataset: {driveAction: id}, inside: true, closest() {return this;}});
  root.handlers.get('click')({target: button('start:line')});
  root.handlers.get('click')({target: button('start:gears')});
  root.handlers.get('click')({target: button('start:constructor')});
  assert.deepEqual(calls, [['start', {lessonId: 'line', courseId: 'tremblant-woods', carId: 'falcone', difficulty: 'pro'}]]);
  calls.length = 0;
  const radio = (lesson, course, extra = {}) => ({dataset: {driveCourse: course, ...(lesson ? {driveLesson: lesson} : {})}, inside: true, ...extra});
  root.handlers.get('change')({target: radio('line', 'harbour-lights')});
  root.handlers.get('change')({target: radio('line', 'panorama-ridge')});
  root.handlers.get('change')({target: radio(null, 'tremblant-woods')});
  assert.deepEqual(calls, [['select', {courseId: 'harbour-lights', lessonId: 'line'}], ['select', {courseId: 'tremblant-woods'}]]);
});

const lessonProps = (id, stage, phase, extra = {}, attempt = {}) => ({playerId: 'kyle', runPlayerId: 'kyle', lesson: {
  id, stage, phase, done: false, streak: 0, bestMargin: 0,
  instructor: {timeSec: 20, winter: id === 'snow' ? {timeSec: 18} : undefined, cones: [{id: 1, s: 1000}, {id: 2, s: 1100}, {id: 3, s: 1200}]},
  lastAttempt: {elapsedSeconds: 21, timeLostSeconds: 1, screechSeconds: .2, endReason: 'finish', finished: true, passed: false,
    progressM: 100, rules: [true, false, true, true], firstBrakeS: 1000, cones: [{id: 1}, {id: 2}], ...attempt}, ...extra}});

test('every lesson has its own panel: stage title, instructor time, rules and streak', () => {
  for (const id of ['corner', 'line', 'gears', 'snow']) {
    const info = DRIVE_LESSON_VIEW[id];
    for (const stage of Object.keys(info.stages)) {
      const markup = driveLessonPanelMarkup(lessonProps(id, stage, 'driving'));
      assert.match(markup, new RegExp(info.stages[stage].replace(/[()]/g, '\\$&')));
      assert.match(markup, /Streak <strong>0\/3<\/strong>/);
    }
    const right = driveLessonPanelMarkup(lessonProps(id, 'right', 'result'));
    assert.equal((right.match(/<li>/g) || []).length, info.rules.length, `${id}: one line per rule`);
    assert.match(right, /Missed:/);
  }
  assert.match(driveLessonPanelMarkup(lessonProps('snow', 'winter', 'driving')), /Instructor 18.00 s/, 'the winter run is against the winter instructor');
  assert.match(driveLessonPanelMarkup(lessonProps('gears', 'late', 'driving')), /green mark/);
  assert.equal(driveLessonPanelMarkup({...lessonProps('hairpin', 'late', 'driving')}), '');
  assert.equal(driveLessonPanelMarkup({...lessonProps('line', 'winter', 'driving')}), '', 'a stage the lesson does not have');
});

test('the result cards carry each lesson\'s own numbers', () => {
  const gears = driveLessonResultMarkup(lessonProps('gears', 'right', 'result', {}, {upshiftRevs: [.62, .93, .961], exitGear: 2, instructorExitGear: 2, limiterSeconds: .15}));
  assert.match(gears, /Changed up at 62%, 93%, 96%/); assert.match(gears, /Gear at the exit: 3rd \(instructor 3rd\)/); assert.match(gears, /On the limiter 0.15 s/);
  assert.match(driveLessonResultMarkup(lessonProps('gears', 'late', 'result', {}, {upshiftRevs: []})), /You did not change up/);
  const snow = driveLessonResultMarkup(lessonProps('snow', 'late', 'result', {}, {firstBrakeS: 1074, iceBrakeMax: 0}));
  assert.match(snow, /You braked 74 m after the snow cone/); assert.match(snow, /Brake on the ice 0%/);
  assert.match(driveLessonResultMarkup(lessonProps('snow', 'right', 'result', {}, {firstBrakeS: 988, iceBrakeMax: .5})), /You braked 12 m before the snow cone/);
  assert.match(driveLessonResultMarkup(lessonProps('snow', 'right', 'result', {}, {firstBrakeS: null})), /You did not brake/);
  assert.match(driveLessonResultMarkup(lessonProps('snow', 'right', 'result', {}, {firstBrakeS: 1000.2})), /You braked at the snow cone/);
  assert.match(driveLessonResultMarkup(lessonProps('line', 'late', 'result')), /Cones touched 2 of 3/);
  assert.match(driveLessonResultMarkup(lessonProps('line', 'late', 'result')), /Middle-of-the-road try complete/);
  assert.doesNotMatch(driveLessonResultMarkup(lessonProps('corner', 'late', 'result')), /Cones touched|Changed up|snow cone/, 'lesson 1\'s card is as it was');
});

test('lesson 4 goes on to the winter run after three wins and passes on that run, however it ends', () => {
  const third = lessonProps('snow', 'challenge', 'result', {streak: 3, bestMargin: .5}, {passed: true});
  assert.match(driveLessonResultMarkup(third), /Start the winter-tyre run/); assert.doesNotMatch(driveLessonResultMarkup(third), /Lesson passed/);
  const winterRun = lessonProps('snow', 'winter', 'result', {streak: 3, bestMargin: .5, done: true},
    {finished: false, endReason: 'wall', passed: true, instructorSeconds: 18, timeLostSeconds: null});
  const card = driveLessonResultMarkup(winterRun);
  assert.match(card, /Lesson passed/); assert.match(card, /Instructor 18.00 s/); assert.doesNotMatch(card, /data-drive-action="next"/);
  const state = {playerId: 'kyle', car: 'falcone', difficulty: 'pro', driverId: 'club'};
  const run = lesson => ({state, ownerId: 'kyle', plan: {car: 'falcone', difficulty: 'pro', driverId: 'club'}, lesson});
  assert.deepEqual(driveLessonCompletion(run(winterRun.lesson), state, 'kyle'), {id: 'snow', carId: 'falcone', marginSeconds: .5});
  assert.equal(driveLessonCompletion(run(third.lesson), state, 'kyle'), null, 'three wins alone are not the lesson');
  const gears = {id: 'gears', stage: 'challenge', phase: 'result', done: true, streak: 3, bestMargin: .3, lastAttempt: {finished: true, passed: true}};
  assert.deepEqual(driveLessonCompletion(run(gears), state, 'kyle'), {id: 'gears', carId: 'falcone', marginSeconds: .3});
  assert.equal(driveLessonCompletion(run({...gears, id: 'brakes'}), state, 'kyle'), null);
  assert.equal(driveLessonCompletion(run({...gears, lastAttempt: {finished: false, passed: true}}), state, 'kyle'), null);
});

test('the shift lights come on one by one from 90% and the limiter fills them', () => {
  assert.deepEqual(SHIFT_LIGHTS.map(value => Math.round(value * 1000) / 1000), [.9, .933, .967]);
  assert.deepEqual([.5, .89, .9, .94, .97, 1, 1.02].map(shiftLightsLit), [0, 0, 1, 2, 3, 3, 3]);
  assert.equal(shiftLightsLit(NaN), 0); assert.equal(shiftLightsLit(undefined), 0);
  assert.deepEqual([0, 1, 2].map(shiftLightCue), ['lesson.shift-light', 'lesson.shift-light.2', 'lesson.shift-light.3']);
});

test('markers are knocked once, by the car\'s centre line, and only inside the tip distance', () => {
  const markers = [{x: 0, z: 10}, {x: 0, z: 20}, {x: 5, z: 30}];
  const knocked = new Set();
  const first = markersKnocked(markers, {x: 0, z: 0}, {x: 0, z: 25}, knocked);
  assert.deepEqual(first, [0, 1]); first.forEach(index => knocked.add(index));
  assert.deepEqual(markersKnocked(markers, {x: 0, z: 0}, {x: 0, z: 25}, knocked), [], 'a marker falls once');
  assert.deepEqual(markersKnocked(markers, {x: 0, z: 25}, {x: 0, z: 40}, knocked), [], 'three metres wide of it is a miss');
  assert.deepEqual(markersKnocked(markers, {x: 4.5, z: 25}, {x: 4.5, z: 40}, knocked), [2]);
  assert.deepEqual(markersKnocked([], {x: 0, z: 0}, {x: 1, z: 1}, new Set()), []);
  assert.deepEqual(markersKnocked(markers, {x: 0, z: 0}, {x: 0, z: 0}, new Set()), [], 'standing still away from them');
});

test('the lesson screens style only their own parts, and the new hooks are marked', async () => {
  const css = await readFile(new URL('../src/lessons/drive-lesson-ui.css', import.meta.url), 'utf8');
  for (const block of css.matchAll(/([^{}]+)\{/g)) {
    const selector = block[1].trim(); if (selector.startsWith('@')) continue;
    assert.ok(selector.split(',').every(value => value.trim().startsWith('.drive-lesson')), selector);
  }
  for (const file of ['app.js', 'game.js', 'render3d.js']) {
    assert.match(await readFile(new URL('../src/' + file, import.meta.url), 'utf8'), /DRIVE-LESSONS-VIEW-2/, file);
  }
});

// ---- the host hooks, natively --------------------------------------------------------------------------------------
// The real App (QA flags installed before the game loads): later lessons need to be open, lesson 3 forces the manual box
// and the engine curve for its own run and gives the box back, lessons 1, 2 and 4 stay off the engine curve their
// instructors drove without, and nothing in a lesson run pays, records or damages.
test('the host runs lessons 2 and 3: access, forced manual box restored afterwards, engine curve latch', async () => {
  const savedGlobals = new Map(['__DUEL_QA__', 'location'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, '__DUEL_QA__', {configurable: true, value: true});
  Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '?flags=driving-lessons,tyre-slip,engine-curve'}});
  try {
    const [{withReferenceApp}, {finishDriveLesson}, {DIFFICULTY}] = await Promise.all([
      import('./build-reference-laps.mjs'), import('../src/lessons/drive-lesson-save.js'), import('../src/config.js'),
    ]);
    await withReferenceApp(async app => {
      assert.equal(app.drivingLessonsAvailable(), true);
      assert.equal(app.addPlayer('Lesson view owner').ok, true);
      app.profile = {...app.profile, credits: 50000};
      assert.equal(app._saveProfile(), true);
      assert.equal(app.purchaseCourse('tremblant-woods').ok, true);
      app.setRaceSettings({eventId: 'tremblant-woods', car: 'falcone_f42', difficulty: 'casual'});
      const car = 'falcone_f42', settings = {car, difficulty: 'casual'};
      const start = lessonId => app.startLesson({courseId: 'tremblant-woods', lessonId, ...settings});
      // Shut lessons cannot start, and the board's props say why.
      assert.equal(app.openDrivingLessons(), true);
      assert.equal(await start('line'), false, 'lesson 2 waits for lesson 1');
      assert.equal(await start('gears'), false, 'lesson 3 waits for lesson 2');
      assert.equal(await start('snow'), false, 'no Tremblant Snow, and lesson 4 waits');
      assert.equal(await start('brakes'), false); assert.equal(await start('constructor'), false);
      const props = app.driveLessonBoardProps();
      assert.deepEqual(driveLessonBoardModel(props).rows.map(row => row.open), [true, false, false, false]);
      // Lessons 1 and 2 done through the real save API.
      for (const id of ['corner', 'line']) {
        const done = finishDriveLesson(app.profile, id, .5, car, {engineCurve: true});
        assert.equal(done.ok, true, done.reason); app.profile = done.profile;
      }
      assert.equal(app._saveProfile(), true);
      assert.deepEqual(driveLessonBoardModel(app.driveLessonBoardProps()).rows.map(row => row.open), [true, true, true, false],
        'the gearbox lesson is open on the engine curve, snow still needs a snow course');
      const before = structuredClone(app.profile);
      // Lesson 2: its markers and cones, no engine curve, the player's own box.
      assert.equal(await start('line'), true, app.driveLessonMessage);
      let run = app.duel.drivingLesson, state = app.duel.state;
      assert.equal(run.lesson.id, 'line'); assert.equal(run.plan.lessonId, 'line');
      assert.equal(run.plan.instructor.markers.length > 20, true); assert.equal(run.plan.instructor.cones.length, 3);
      assert.equal(state.engineCurve, undefined, 'lesson 2 was built without the engine curve');
      assert.equal(app.duel.diff.autoShift, true); assert.equal(app.duel.diff, DIFFICULTY.casual);
      assert.equal(run.lesson.stage, 'late'); assert.equal(app.driveLessonMarkers ?? null, null);
      app.duel.setInput({throttle: 1, brake: 0, steer: 0}); for (let tick = 0; tick < 60; tick++) app.duel.step(1 / 120);
      assert.equal(run.lesson.phase, 'driving'); assert.equal(Object.hasOwn(app.duel._driveLessonCarView(), 'gear'), true);
      app.leaveLesson();
      // Lesson 3: always manual on Casual, no engine damage, the engine curve, 2nd gear at 30 mph.
      assert.equal(app.openDrivingLessons(), true);
      assert.equal(await start('gears'), true, app.driveLessonMessage);
      run = app.duel.drivingLesson; state = app.duel.state;
      assert.equal(run.lesson.id, 'gears'); assert.equal(state.difficulty, 'casual');
      assert.equal(app.duel.diff.autoShift, false, 'forced manual'); assert.equal(app.duel.diff.engineBlow, false);
      assert.equal(DIFFICULTY.casual.autoShift, true, 'the setting itself is untouched'); assert.equal(DIFFICULTY.casual.engineBlow, false);
      assert.equal(state.engineCurve, true); assert.equal(state.gear, 1); assert.equal(Math.round(state.speedMph), 30);
      assert.equal(state.revs, state.speedMph / app.duel.car.gears[1]);
      const view = app.duel._driveLessonCarView();
      assert.equal(view.gear, 1); assert.equal(view.revs, state.revs);
      // Manual keys work on Casual, and the lesson sees the change up.
      app.duel.setInput({throttle: 1, brake: 0, steer: 0, shiftUp: true});
      app.duel.step(1 / 120); app.duel.step(1 / 120);
      assert.equal(state.gear, 2, 'E changes up on Casual in this lesson');
      assert.equal(run.lesson.attempt.upshifts, 1);
      // The limiter cannot blow the engine in the lesson, even if held in a low gear on Pro-style revs.
      state.input.throttle = 1;
      for (let tick = 0; tick < 480; tick++) { app.duel.setInput({throttle: 1, steer: 0}); app.duel.step(1 / 120); }
      assert.equal(state.status, 'racing'); assert.equal(state.catastrophic, false);
      // Nothing paid, recorded or charged.
      assert.deepEqual(app.profile, before);
      app.leaveLesson();
      assert.equal(app.duel.drivingLesson, undefined);
      assert.equal(app.duel.diff.autoShift, true, 'the automatic box is back after the lesson');
      // Without the engine curve the gearbox lesson does not start.
      const switches = app._switches.bind(app);
      app._switches = () => ({enabled: name => name === 'engine-curve' ? false : switches().enabled(name)});
      assert.equal(app.openDrivingLessons(), true);
      assert.equal(await start('gears'), false, 'engine-curve off: Opens later');
      assert.match(driveLessonBoardModel(app.driveLessonBoardProps()).byId.gears.reason, /^Opens later/);
      app._switches = switches;
    });
  } finally {
    for (const [key, descriptor] of savedGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});

test('lesson 4: the last run is on winter tyres from the winter pose, the ghost is the winter instructor, and the tyres go back', async () => {
  const [{Duel}, {buildInstructorRun}, {COURSE}] = await Promise.all([
    import('../src/game.js'), import('../src/lessons/drive-lessons.js'), import('../src/config.js'),
  ]);
  const flags = {enabled: name => name === 'tyre-slip' || name === 'driving-lessons'};
  const stage = COURSE.findIndex(item => item.id === 'tremblant-snow');
  const baseline = await buildInstructorRun({courseId: 'tremblant-snow', car: 'falcone_f42', difficulty: 'pro', lessonId: 'snow'});
  assert.equal(baseline.instructor.winter.timeSec < baseline.instructor.timeSec, true, 'winter tyres are faster');
  const plan = {...baseline, driverId: 'club', ownerId: 'kyle'};
  const duel = new Duel({seed: 1989, featureFlags: flags});
  duel.startCampaign({seed: 1989, mode: 'timetrial', car: 'falcone_f42', difficulty: 'pro', driverId: 'club', playerId: 'kyle',
    startStage: stage, upgrades: {}, opponentCount: 0, lesson: plan});
  const state = duel.state, run = duel.drivingLesson;
  assert.equal(run.lesson.id, 'snow'); assert.equal(state.tyre, undefined, 'summer tyres to begin with');
  assert.equal(state.engineCurve, undefined); assert.equal(duel.diff.autoShift, false, 'Pro is manual anyway');
  // Three wins in, the next attempt is the winter-tyre run.
  Object.assign(run.lesson, {stage: 'challenge', phase: 'result', streak: 3, bestMargin: .4});
  assert.equal(duel.resetDriveLessonAttempt(), true);
  assert.equal(run.lesson.stage, 'winter'); assert.equal(state.tyre, 'winter');
  const winterStart = baseline.instructor.winter.poses[0];
  assert.equal(state.lateral, winterStart.lateral); assert.equal(state.speedMph, winterStart.mph);
  assert.equal(duel._drivingSurface(1750, 0).gripKind, 'ice', 'the spur\'s ice is still there on winter tyres');
  // The ghost for that run is the winter instructor's.
  const {App} = await import('../src/app.js');
  const fake = {duel: {drivingLesson: run, state, course: duel.course}, player: {id: 'kyle'}};
  run.lesson.attempt.elapsedSeconds = baseline.instructor.winter.timeSec / 2;
  const ghost = App.prototype.getDriveLessonGhost.call(fake);
  const half = baseline.instructor.winter.poses.find(pose => pose.t >= run.lesson.attempt.elapsedSeconds);
  assert.equal(Math.abs(ghost.s - half.s) < 1, true, 'the winter run\'s ghost is the winter instructor');
  run.lesson.stage = 'late'; assert.equal(App.prototype.getDriveLessonGhost.call(fake), null, 'no ghost in the first tries');
  // Retaking starts on summer tyres again.
  duel.startCampaign({seed: 1989, mode: 'timetrial', car: 'falcone_f42', difficulty: 'pro', driverId: 'club', playerId: 'kyle',
    startStage: stage, upgrades: {}, opponentCount: 0, lesson: plan});
  assert.equal(duel.state.tyre, undefined);
  // A lesson whose plan names a course it has no row for is refused.
  assert.throws(() => duel.startCampaign({seed: 1989, mode: 'timetrial', car: 'falcone_f42', difficulty: 'pro', driverId: 'club',
    playerId: 'kyle', startStage: 0, upgrades: {}, opponentCount: 0, lesson: plan}), /does not belong/);
  assert.throws(() => duel.startCampaign({seed: 1989, mode: 'timetrial', car: 'falcone_f42', difficulty: 'pro', driverId: 'club',
    playerId: 'kyle', startStage: stage, upgrades: {}, opponentCount: 0, lesson: {...plan, lessonId: 'constructor'}}), /does not belong/);
  // The gearbox lesson is refused when the engine curve is off.
  const gearsPlan = await buildInstructorRun({courseId: 'tremblant-woods', car: 'falcone_f42', difficulty: 'casual', lessonId: 'gears'});
  assert.throws(() => duel.startCampaign({seed: 1989, mode: 'timetrial', car: 'falcone_f42', difficulty: 'casual', driverId: 'club',
    playerId: 'kyle', startStage: COURSE.findIndex(item => item.id === 'tremblant-woods'), upgrades: {}, opponentCount: 0,
    lesson: {...gearsPlan, driverId: 'club', ownerId: 'kyle'}}), /does not belong/);
});
