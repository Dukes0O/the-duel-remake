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

test('a later lesson needs a car and a setting, and a start names its own course', () => {
  const access = open('line', 'gears', 'snow'), progress = done('line', 'gears');
  const props = {...base(), progress, lessonAccess: access, ownedCourseIds: ['panorama-ridge']};
  const model = driveLessonBoardModel(props);
  assert.equal(model.byId.line.start.courseId, 'tremblant-woods');
  assert.equal(model.byId.snow.start.courseId, 'tremblant-snow');
  assert.deepEqual(model.byId.gears.start, {lessonId: 'gears', courseId: 'panorama-ridge', carId: 'falcone', difficulty: 'pro'});
  const woods = driveLessonBoardModel({...props, ownedCourseIds: ['tremblant-woods', 'harbour-lights'], courseIds: {line: 'harbour-lights'}});
  assert.equal(woods.byId.line.start.courseId, 'harbour-lights', 'the chosen course');
  assert.equal(woods.byId.gears.start.courseId, 'panorama-ridge', 'catalog order, regardless of ownership');
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
      assert.equal(run.plan.instructor.corners.length, 7); assert.equal(run.plan.instructor.cones.length, 14);
      assert.equal(state.engineCurve, undefined, 'lesson 2 was built without the engine curve');
      assert.equal(app.duel.diff.autoShift, true); assert.equal(app.duel.diff, DIFFICULTY.casual);
      assert.equal(run.lesson.stage, 'your-turn'); assert.equal(app.driveLessonMarkers ?? null, null);
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
      run.lesson.stage='follow';
      // Manual keys work on Casual, and the lesson sees the change up.
      app.duel.setInput({throttle: 1, brake: 0, steer: 0, shiftUp: true});
      app.duel.step(1 / 120); app.duel.step(1 / 120);
      assert.equal(state.gear, 2, 'E changes up on Casual in this lesson');
      assert.equal(state.gear, 2);
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


test('lesson 3 on Pro: the limiter cannot blow the engine in the lesson, and Pro keeps its own rules afterwards', async () => {
  const savedGlobals = new Map(['__DUEL_QA__', 'location'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, '__DUEL_QA__', {configurable: true, value: true});
  Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '?flags=driving-lessons,tyre-slip,engine-curve'}});
  try {
    const [{withReferenceApp}, {finishDriveLesson}, {DIFFICULTY, DRIVE}] = await Promise.all([
      import('./build-reference-laps.mjs'), import('../src/lessons/drive-lesson-save.js'), import('../src/config.js'),
    ]);
    await withReferenceApp(async app => {
      assert.equal(app.addPlayer('Lesson view pro').ok, true);
      app.profile = {...app.profile, credits: 50000};
      assert.equal(app._saveProfile(), true);
      assert.equal(app.purchaseCourse('tremblant-woods').ok, true);
      for (const id of ['corner', 'line']) {
        const done = finishDriveLesson(app.profile, id, .5, 'falcone_f42', {engineCurve: true});
        assert.equal(done.ok, true, done.reason); app.profile = done.profile;
      }
      assert.equal(app._saveProfile(), true);
      app.setRaceSettings({eventId: 'tremblant-woods', car: 'falcone_f42', difficulty: 'pro'});
      assert.equal(DIFFICULTY.pro.engineBlow, true); assert.equal(DIFFICULTY.pro.autoShift, false);
      assert.equal(app.openDrivingLessons(), true);
      assert.equal(await app.startLesson({courseId: 'tremblant-woods', lessonId: 'gears', car: 'falcone_f42', difficulty: 'pro'}), true, app.driveLessonMessage);
      const duel = app.duel, state = duel.state;
      duel.drivingLesson.lesson.stage='follow';
      assert.equal(duel.diff.engineBlow, false); assert.equal(duel.diff.autoShift, false);
      // Hold the throttle in 2nd, never changing up, well past the over-rev time that blows an engine on Pro.
      let over = 0;
      for (let tick = 0; tick < 120 * 12 && state.status === 'racing' && duel.drivingLesson.lesson.phase === 'driving'; tick++) {
        duel.setInput({throttle: 1, brake: 0, steer: 0}); duel.step(1 / 120);
        if (state.revs > DRIVE.overRevFrac) over += 1 / 120;
      }
      assert.equal(over > DRIVE.overRevBlowSec + 1, true, 'the revs really stayed over the line for longer than blows an engine');
      assert.equal(state.catastrophic, false); assert.equal(state.overrevSec, 0);
      app.leaveLesson();
      assert.equal(duel.diff, DIFFICULTY.pro); assert.equal(DIFFICULTY.pro.engineBlow, true);
    });
  } finally {
    for (const [key, descriptor] of savedGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
