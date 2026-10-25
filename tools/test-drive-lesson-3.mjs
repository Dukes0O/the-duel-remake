import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_GEAR_ROWS, GEAR_LESSON, createDriveLesson, stepDriveLesson, instructorControls, gearsControls, gearsPlanFor, gearFor,
  buildInstructorRun, instructorConeDistances, TIP_DISTANCE_M, LESSON_LINE} from '../src/lessons/drive-lessons.js';

// Lesson 3, the gearbox (docs/DRIVING_LESSONS.md 12.3): lesson 1's corners approached from further back, starting at 30 mph in
// 2nd, on the engine curve (switch engine-curve) and always in the manual box. The proof that the lesson is true is in the
// last tests: changing up early, or leaving the corner a gear too high, is slower than the instructor.

const corner = {id: 'The Cutting', startS: 100, finishS: 405, dir: 1};
const cones = [{id: 1, s: 200, lateral: 5.5, x: 200, z: 5.5}, {id: 2, s: 300, lateral: -6, x: 300, z: -6}, {id: 3, s: 345, lateral: 5.5, x: 345, z: 5.5}];
const plan = (extra = {}) => ({timeSec: 20, apexGear: 1, exitGear: 1, cones, ...extra});
const view = (s, extra = {}) => ({s, lateral: 0, world: {x: s, z: 0}, speedMph: 60, brake: 0, throttle: 0, tyreSlip: 0,
  status: 'racing', paused: false, offRoad: false, gear: 1, revs: .5, ...extra});
const create = extra => createDriveLesson('gears', {corner, instructor: plan(extra)});
const start = lesson => stepDriveLesson(lesson, view(100), {start: true}, 0);
const ready = (stage, extra) => { const lesson = create(extra); lesson.stage = stage; lesson.phase = 'ready'; return lesson; };

// A change up: the step before has the revs it came at, the step after is in the next gear.
function shiftUp(lesson, s, revs, gear = 1) {
  stepDriveLesson(lesson, view(s, {gear, revs}), {}, .05);
  stepDriveLesson(lesson, view(s + 1, {gear: gear + 1, revs: revs * .6}), {}, .05);
}
// One try: changes up at the given revs, passes the apex cone and the exit cone in the given gears, may sit on the limiter or screech.
function drive(lesson, {upRevs = [.96], limiter = 0, apexGear = 1, exitGear = 1, screech = 0, seconds = .1} = {}) {
  start(lesson);
  upRevs.forEach((revs, i) => shiftUp(lesson, 120 + i * 20, revs, 1));
  if (limiter) stepDriveLesson(lesson, view(190, {gear: 1, revs: 1.01, throttle: 1}), {}, limiter);
  // Any change of gear between these steps comes on the lights.
  stepDriveLesson(lesson, view(290, {gear: 1, revs: .96}), {}, .1);
  stepDriveLesson(lesson, view(300, {gear: apexGear, revs: .7, tyreSlip: screech ? 1.2 : 0}), {}, screech || .1);
  stepDriveLesson(lesson, view(340, {gear: apexGear, revs: .96}), {}, .1);
  stepDriveLesson(lesson, view(345, {gear: exitGear, revs: .7}), {}, .1);
  return stepDriveLesson(lesson, view(405, {gear: exitGear, revs: .7}), {}, seconds);
}

test('the rows name lesson 1\'s corners, approached from the Mountain Straight and from 400 m before the hairpin, at 30 mph', () => {
  assert.deepEqual(DRIVE_GEAR_ROWS.map(row => [row.courseId, row.cornerName, row.gateBefore, row.gateOffsetM, row.rollingMph]),
    [['panorama-ridge', 'The Cutting', 'Mountain Straight', 0, 30], ['tremblant-woods', 'Beaver Hairpin', 'Beaver Hairpin', 400, 30]]);
  assert.ok(Object.isFrozen(DRIVE_GEAR_ROWS) && Object.isFrozen(DRIVE_GEAR_ROWS[0]) && Object.isFrozen(GEAR_LESSON));
  assert.equal(GEAR_LESSON.startGear, 1, 'the run starts in 2nd');
});

test('the gearbox lesson needs three cones and the instructor\'s gears, and no board', () => {
  assert.doesNotThrow(() => create());
  for (const bad of [{apexGear: undefined}, {exitGear: -1}, {exitGear: 1.5}, {cones: cones.slice(0, 2)}, {timeSec: 0}])
    assert.throws(() => create(bad), TypeError, JSON.stringify(bad));
  assert.doesNotThrow(() => createDriveLesson('gears', {corner, instructor: plan({redBoardS: undefined})}), 'there is no red board in this lesson');
  const lesson = create(); start(lesson);
  assert.throws(() => stepDriveLesson(lesson, {...view(110), gear: undefined}, {}, .1), TypeError, 'the host reports the gear and the revs');
  assert.throws(() => stepDriveLesson(lesson, {...view(110), revs: NaN}, {}, .1), TypeError);
});

test('gearFor puts a speed nearest 75% revs without passing 92%', () => {
  const gears = [55, 95, 135, 172, 201];
  assert.equal(gearFor(gears, 47), 0, '47 mph: 1st is 85% revs, 2nd only 49%');
  assert.equal(gearFor(gears, 72), 1);
  assert.equal(gearFor(gears, 100), 2);
  assert.equal(gearFor(gears, 150), 4);
  assert.equal(gearFor(gears, 300), 4, 'nothing fits: the top gear');
  assert.equal(gearFor(gears, 52), 1, '52 mph: 1st would be 95%, past the cap, so 2nd at 55%');
});

test('try 1, change up early: it counts however it ends, and says "sluggish" only when it really was', () => {
  const slow = create(); start(slow);
  assert.equal(slow.attempt.upshifts, 0);
  const result = stepDriveLesson(slow, view(405), {}, 20.3);
  assert.equal(result.radio, 'drive.radio.gears.early.result'); assert.equal(slow.stage, 'late'); assert.equal(slow.phase, 'result');
  const quick = create(); start(quick);
  assert.equal(stepDriveLesson(quick, view(405), {}, 20.29).radio, null, 'under 0.3 s slower there is nothing true to say');
  const wall = create(); start(wall);
  stepDriveLesson(wall, view(200), {}, 5);
  assert.equal(stepDriveLesson(wall, view(300), {wallHit: true}, .1).radio, null, 'a try that ends at a wall did not show anything');
  assert.equal(wall.lastAttempt.endReason, 'wall');
  assert.equal(start(slow).radio, 'drive.radio.gears.right.start', 'then try 2');
  assert.equal(slow.stage, 'right');
});

test('the first start says the early line; the right start and the challenge start their own', () => {
  const first = create();
  assert.equal(start(first).radio, 'drive.radio.gears.early.start');
  const second = ready('right'); assert.equal(start(second).radio, 'drive.radio.gears.right.start');
  const third = ready('challenge'); assert.equal(start(third).radio, 'drive.radio.gears.challenge.start');
});

test('try 2 has four rules: changes up on the lights, off the limiter, no higher a gear than the instructor, no long screech', () => {
  const pass = ready('right'), done = drive(pass);
  assert.deepEqual(pass.lastAttempt.rules, [true, true, true, true]);
  assert.equal(done.radio, 'drive.radio.gears.right.pass'); assert.deepEqual(pass.lastAttempt.upshiftRevs, [.96]);
  for (const [options, radio] of [[{upRevs: [.5]}, 'drive.radio.gears.right.start'], [{upRevs: [.96, .89]}, 'drive.radio.gears.right.start'],
    [{limiter: .5}, 'drive.radio.gears.coach.limiter'], [{apexGear: 2}, 'drive.radio.gears.coach.down'],
    [{exitGear: 3}, 'drive.radio.gears.coach.down'], [{screech: .3}, 'drive.radio.corner.coach.screech']]) {
    const lesson = ready('right'), result = drive(lesson, options);
    assert.equal(result.result, 'retry', JSON.stringify(options)); assert.equal(result.radio, radio, JSON.stringify(options));
  }
  // The edges: 90% revs counts as the lights, and the limiter has to stay under half a second in all.
  for (const options of [{upRevs: [.9]}, {upRevs: []}, {limiter: .49}, {screech: .299}, {apexGear: 0, exitGear: 0}, {apexGear: 1, exitGear: 2}])
    assert.equal(drive(ready('right'), options).result, 'running', JSON.stringify(options) + ' is still a pass');
  const twice = ready('right'); drive(twice, {limiter: .3}); // .3 s here ...
  assert.equal(twice.lastAttempt.limiterSeconds, .3);
});

test('the limiter is counted across the whole try, and only with the throttle down', () => {
  const lesson = ready('right'); start(lesson);
  stepDriveLesson(lesson, view(150, {revs: 1.01, throttle: 1}), {}, .3);
  stepDriveLesson(lesson, view(160, {revs: 1.01, throttle: 0}), {}, .3);
  stepDriveLesson(lesson, view(170, {revs: .99, throttle: 1}), {}, .3);
  stepDriveLesson(lesson, view(180, {revs: 1, throttle: 1}), {}, .3);
  assert.equal(lesson.attempt.limiterSeconds, .6, 'at 100% with the throttle down counts; lifting or sitting under does not');
});

test('the revs of a change up are the revs on the dial the step before, and downshifts are not counted', () => {
  const lesson = ready('right'); start(lesson);
  stepDriveLesson(lesson, view(120, {gear: 1, revs: .93}), {}, .1);
  stepDriveLesson(lesson, view(121, {gear: 2, revs: .56}), {}, .1);
  stepDriveLesson(lesson, view(160, {gear: 1, revs: .85}), {}, .1);
  assert.deepEqual(lesson.attempt.upshiftRevs, [.93]); assert.equal(lesson.attempt.upshifts, 1); assert.equal(lesson.attempt.earlyUpshifts, 0);
});

test('the gears are read as the car crosses the apex cone and the exit cone', () => {
  const lesson = ready('right'); start(lesson);
  stepDriveLesson(lesson, view(299, {gear: 1}), {}, .1);
  stepDriveLesson(lesson, view(301, {gear: 2}), {}, .1);
  stepDriveLesson(lesson, view(344, {gear: 2}), {}, .1);
  stepDriveLesson(lesson, view(346, {gear: 3}), {}, .1);
  assert.equal(lesson.attempt.apexGear, 2); assert.equal(lesson.attempt.exitGear, 3);
  assert.equal(create().attempt, null);
});

test('the challenge is three in a row against the instructor\'s time and passes the lesson', () => {
  const lesson = ready('right'); drive(lesson);
  const run = seconds => { start(lesson); return stepDriveLesson(lesson, view(405), {}, seconds); };
  assert.equal(run(19.9).radio, 'drive.radio.corner.challenge.one'); assert.equal(lesson.stage, 'challenge');
  assert.equal(run(19.8).radio, 'drive.radio.corner.challenge.two');
  assert.equal(run(20.1).radio, 'drive.radio.corner.challenge.reset'); assert.equal(lesson.streak, 0);
  run(19.9); run(19.8);
  const third = run(19.7);
  assert.equal(third.result, 'passed'); assert.equal(third.radio, 'drive.radio.gears.pass'); assert.equal(lesson.done, true);
  assert.equal(lesson.bestMargin, .3);
  assert.equal(lesson.lastAttempt.instructorSeconds, 20); assert.equal(lesson.lastAttempt.timeLostSeconds, -.3);
});

test('lessons 1, 2 and 4 do not gain gear rules, and do not need a gear in the view', () => {
  const one = createDriveLesson('corner', {corner, instructor: {timeSec: 5, redBoardS: 280, cones}});
  stepDriveLesson(one, {s: 100, lateral: 0, world: {x: 100, z: 0}, speedMph: 40, brake: 0, throttle: 0, tyreSlip: 0, status: 'racing'}, {start: true}, 0);
  assert.equal(one.attempt.upshifts, undefined); assert.equal(one.attempt.apexGear, undefined);
  stepDriveLesson(one, {s: 405, lateral: 0, world: {x: 405, z: 0}, speedMph: 40, brake: 0, throttle: 0, tyreSlip: 0, status: 'racing'}, {}, .1);
  assert.equal(one.lastAttempt.rules.length, 4); assert.equal(one.lastAttempt.upshiftRevs, undefined);
});

// ---- native: the real race rules in the player's car, on the engine curve -----------------------

async function nativeSetup(baseline) {
  const [{Duel}, {COURSE, DRIVE, DIFFICULTY, steerForYaw}] = await Promise.all([import('../src/game.js'), import('../src/config.js')]);
  const {courseId, car, upgrades, difficulty, seed} = baseline;
  const duel = new Duel({seed, featureFlags: {enabled: name => name === 'tyre-slip' || name === 'engine-curve'}});
  duel.startCampaign({seed, car, upgrades: {...upgrades}, difficulty, driverId: 'club', mode: 'timetrial', opponentCount: 0,
    startStage: COURSE.findIndex(row => row.id === courseId)});
  // The lesson is manual whatever the player's setting, and a lesson cannot blow the engine.
  Object.defineProperty(duel, 'diff', {get: () => ({...DIFFICULTY[difficulty], autoShift: false, engineBlow: false})});
  const row = DRIVE_GEAR_ROWS.find(item => item.courseId === courseId), pace = difficulty === 'casual' ? .92 : .97;
  const made = await gearsPlanFor(duel, row, pace);
  return {duel, row, pace, made, DRIVE, steerForYaw};
}

// A scripted driver in the player's car. 'right' is the instructor's own hands; 'fast' the same at full pace;
// 'early' changes up as soon as the needle passes the green mark and never changes down; 'high' leaves the
// corner a gear too high; 'lug' never changes down but changes up on the lights.
async function nativeAttempt(baseline, lesson, mode, fps) {
  const {duel, pace, made, DRIVE, steerForYaw} = await nativeSetup(baseline);
  const {corner: gate, instructor} = baseline, state = duel.state, course = duel.course, spec = duel.car;
  const first = instructor.poses[0];
  state.tyreSlipRules = true; state.tyreSlip = 0; state.status = 'racing'; state.countdown = 0; state.s = gate.startS;
  state.lateral = first.lateral; state.headingError = first.heading - course.at(state.s).heading; state.speedMph = first.mph;
  state.gear = GEAR_LESSON.startGear; state.revs = state.speedMph / spec.gears[state.gear]; state.yawVelocity = first.yawVelocity;
  state.traffic = []; state.opponents = []; state.nextLapGate = duel._lapGates.filter(s => s <= state.s).length;
  assert.equal(duel.state.engineCurve, true, 'the lesson runs on the engine curve');
  assert.equal(duel.diff.autoShift, false, 'and in the manual box');
  const scale = mode === 'fast' ? 1 : pace;
  const plan = {course, car: spec, line: made.line, profile: {at: s => made.profile.at(s) * scale / pace}, drive: DRIVE, steerForYaw, difficulty: baseline.difficulty,
    turnInS: gate.turnInS, turnOutS: gate.turnOutS, brakeS: made.profile.brakeS, shifts: {cool: 0}, tooHigh: mode === 'high' ? 1 : 0};
  let wallHit = false, ticks = 0, frames = 0, answer;
  const off = duel.onChange((current, event) => { if (event.crash || event.scrape || event.boundaryReset || event.checkpointReset) wallHit = true; });
  const carView = controls => ({s: state.s, lateral: state.lateral, world: course.groundAt(state.s, state.lateral), speedMph: state.speedMph,
    brake: controls.brake, throttle: controls.throttle, tyreSlip: state.tyreSlip || 0, offRoad: state.offRoad === true, status: 'racing',
    paused: false, gear: state.gear, revs: state.revs});
  try {
    answer = stepDriveLesson(lesson, carView({brake: 0, throttle: 0}), {start: true}, 0);
    const radio = answer.radio;
    while (lesson.phase === 'driving' && ticks < 120 * 120) {
      const frameTicks = Math.floor(++frames * 120 / fps + 1e-9);
      while (ticks < frameTicks && lesson.phase === 'driving' && ticks < 120 * 120) {
        const surface = duel._drivingSurface(state.s, state.lateral);
        let controls;
        if (mode === 'early' || mode === 'lug') {
          // The instructor's pedals and wheel, with this student's own hands on the gearbox.
          controls = instructorControls(state, surface, {...plan, brakeS: -Infinity, brakeInTurns: true});
          plan.shifts.cool = Math.max(0, plan.shifts.cool - 1 / 120);
          const at = mode === 'early' ? GEAR_LESSON.greenMarkRevs : GEAR_LESSON.instructorUpRevs;
          const up = plan.shifts.cool === 0 && controls.brake === 0 && state.revs >= at && state.gear < spec.gears.length - 1;
          if (up) plan.shifts.cool = GEAR_LESSON.shiftEverySec;
          controls = {...controls, shiftUp: up, shiftDown: false};
        } else controls = gearsControls(state, surface, plan);
        duel.setInput(controls); duel.step(1 / 120); ticks++;
        answer = stepDriveLesson(lesson, carView(controls), {wallHit: wallHit || state.impactTimer > 0, crashed: state.status !== 'racing'}, 1 / 120);
      }
    }
    assert.equal(lesson.phase, 'result', mode + ' must end at a real gate or physical failure');
    return {answer, radio, attempt: structuredClone(lesson.lastAttempt)};
  } finally { off(); }
}

for (const difficulty of ['casual', 'pro']) for (const courseId of DRIVE_GEAR_ROWS.map(row => row.courseId)) {
  test(`native ${courseId} ${difficulty}: the instructor repeats exactly at 30/60/144 FPS, shifts on the lights and passes his own four rules`, async () => {
    const options = {courseId, difficulty, car: 'falcone_f42', upgrades: {}, seed: 1989, lessonId: 'gears'};
    const baseline = await buildInstructorRun({...options, fps: 30});
    for (const fps of [60, 144]) assert.deepEqual(await buildInstructorRun({...options, fps}), baseline, `repeats at ${fps} FPS`);
    const {corner: gate, instructor} = baseline, row = DRIVE_GEAR_ROWS.find(item => item.courseId === courseId);
    assert.equal(baseline.lessonId, 'gears'); assert.equal(instructor.cones.length, 3); assert.equal(instructor.finishS, instructor.cones[2].s + 60);
    // The run starts at 30 mph in 2nd at the row's gate.
    assert.equal(instructor.poses[0].mph, 30); assert.equal(instructor.poses[0].gear, 1); assert.equal(gate.id, row.cornerName);
    assert.ok(gate.turnInS - gate.startS > 400 - 1e-6 || courseId === 'panorama-ridge', 'a long run-up');
    // Every change up is on the lights (96% revs or more); every change down is while braking.
    let ups = 0, downs = 0, last = instructor.poses[0];
    for (const pose of instructor.poses.slice(1)) {
      if (pose.gear > last.gear) { ups++; assert.ok(last.revs >= GEAR_LESSON.instructorUpRevs - 1e-9, `change up at ${last.revs.toFixed(3)} revs`); assert.equal(pose.gear, last.gear + 1); }
      if (pose.gear < last.gear) { downs++; assert.ok(last.brake > 0, 'changes down while braking'); }
      assert.ok(pose.revs < GEAR_LESSON.limiterRevs, 'never on the limiter');
      last = pose;
    }
    assert.ok(ups >= 1 && downs >= 1, `${ups} changes up and ${downs} changes down`);
    assert.ok(instructor.apexGear >= 0 && instructor.exitGear >= 0);
    for (const distance of instructorConeDistances(instructor.poses, instructor.cones))
      assert.ok(distance >= TIP_DISTANCE_M + LESSON_LINE.minClearM && distance <= 2.5, `cone clearance ${distance}`);
    assert.ok(instructor.poses.every(pose => Number.isFinite(pose.x) && pose.tyreSlip <= 1), 'never slides');
    // Every cone counted by the lesson's own counter, and all four gear rules kept (buildInstructorRun throws if not).
    const apexPose = instructor.poses.find(pose => pose.s >= instructor.cones[1].s);
    assert.ok(apexPose.revs >= .55 && apexPose.revs <= GEAR_LESSON.downCapRevs + .08, `${apexPose.revs.toFixed(2)} revs at the apex cone`);
  });

  test(`native ${courseId} ${difficulty}: the proof, the right try, the challenge and the pass at 30/60/144 FPS`, async () => {
    const baseline = await buildInstructorRun({courseId, difficulty, car: 'falcone_f42', upgrades: {}, seed: 1989, fps: 60, lessonId: 'gears'});
    const target = baseline.instructor.timeSec;
    let reference = null;
    for (const fps of [30, 60, 144]) {
      const results = [];
      // The proof, part 1: changing up as soon as the needle passes the green mark is at least 0.3 s slower than the instructor.
      const early = await nativeAttempt(baseline, createDriveLesson('gears', baseline), 'early', fps); results.push(early);
      assert.equal(early.attempt.endReason, 'finish', 'the early driver finishes'); assert.ok(early.attempt.upshifts >= 3);
      assert.ok(early.attempt.upshiftRevs.every(revs => revs < GEAR_LESSON.lightsRevs), 'all early');
      assert.ok(early.attempt.elapsedSeconds >= target + .3, `${courseId} ${difficulty} ${fps} FPS: early ${early.attempt.elapsedSeconds.toFixed(2)} s against the instructor's ${target.toFixed(2)} s`);
      assert.equal(early.answer.radio, 'drive.radio.gears.early.result', 'so the lesson may say "sluggish"');
      // The proof, part 2: leaving the corner a gear too high is slower than the instructor's gear.
      const high = await nativeAttempt(baseline, createDriveLesson('gears', baseline), 'high', fps); results.push(high);
      assert.equal(high.attempt.endReason, 'finish', 'the too-high driver finishes');
      assert.ok(high.attempt.elapsedSeconds > target, `${courseId} ${difficulty} ${fps} FPS: a gear too high ${high.attempt.elapsedSeconds.toFixed(2)} s against ${target.toFixed(2)} s`);
      assert.ok(high.attempt.apexGear > baseline.instructor.apexGear, 'it really was a gear too high at the apex');
      if (fps === 60) console.log(`Proof ${courseId} ${difficulty}: instructor ${target.toFixed(2)} s, early shifts ${early.attempt.elapsedSeconds.toFixed(2)} s (+${(early.attempt.elapsedSeconds - target).toFixed(2)}), a gear too high ${high.attempt.elapsedSeconds.toFixed(2)} s (+${(high.attempt.elapsedSeconds - target).toFixed(2)}), instructor gears apex ${baseline.instructor.apexGear} exit ${baseline.instructor.exitGear}`);
      // The lesson in order: try 1 (early), try 2 (the right way), then the challenge.
      const lesson = createDriveLesson('gears', baseline);
      const first = await nativeAttempt(baseline, lesson, 'early', fps);
      assert.equal(first.radio, 'drive.radio.gears.early.start'); assert.equal(lesson.stage, 'late');
      const right = await nativeAttempt(baseline, lesson, 'right', fps); results.push(right);
      assert.equal(right.radio, 'drive.radio.gears.right.start'); assert.equal(lesson.stage, 'right');
      assert.equal(right.attempt.endReason, 'finish'); assert.deepEqual(right.attempt.rules, [true, true, true, true], 'the instructor\'s own hands pass every rule');
      assert.equal(right.answer.radio, 'drive.radio.gears.right.pass');
      assert.ok(Math.abs(right.attempt.elapsedSeconds - target) < .05, `the right try repeats the instructor: ${right.attempt.elapsedSeconds} s against ${target} s`);
      // A try that is too high at the apex fails the gear rule and is coached.
      const coached = createDriveLesson('gears', baseline); coached.stage = 'right'; coached.phase = 'ready';
      const wrong = await nativeAttempt(baseline, coached, 'high', fps);
      assert.equal(wrong.attempt.rules[2], false); assert.equal(wrong.answer.result, 'retry'); assert.equal(wrong.answer.radio, 'drive.radio.gears.coach.down');
      // The lugging driver (changes up on the lights, never changes down) fails the same rule.
      const lug = createDriveLesson('gears', baseline); lug.stage = 'right'; lug.phase = 'ready';
      const lugged = await nativeAttempt(baseline, lug, 'lug', fps);
      assert.equal(lugged.attempt.rules[2], false, 'staying in a high gear through the corner fails the gear rule');
      if (fps === 60) console.log(`Proof ${courseId} ${difficulty}: never changing down ${lugged.attempt.elapsedSeconds.toFixed(2)} s (+${(lugged.attempt.elapsedSeconds - target).toFixed(2)}), gears at apex ${lugged.attempt.apexGear} and exit ${lugged.attempt.exitGear}, ended ${lugged.attempt.endReason}`);
      // The challenge: a driver at full pace beats the instructor three in a row; the pass follows.
      for (let i = 0; i < 3; i++) {
        const fast = await nativeAttempt(baseline, lesson, 'fast', fps); results.push(fast);
        assert.equal(fast.attempt.endReason, 'finish'); assert.ok(fast.attempt.elapsedSeconds < target, `${fps} FPS fast ${fast.attempt.elapsedSeconds} s against ${target} s`);
        assert.equal(lesson.stage, 'challenge'); assert.equal(lesson.streak, i + 1);
      }
      assert.equal(lesson.done, true); assert.equal(results.at(-1).answer.result, 'passed'); assert.equal(results.at(-1).answer.radio, 'drive.radio.gears.pass');
      if (reference) assert.deepEqual(results, reference, `native scoring repeats at ${fps} FPS`); else reference = results;
    }
  });
}

test('the lesson depends on the engine curve: with the old pull a gear only caps speed, so early shifting is not slower', async () => {
  const baseline = await buildInstructorRun({courseId: 'tremblant-woods', difficulty: 'casual', car: 'falcone_f42', upgrades: {}, seed: 1989, fps: 60, lessonId: 'gears'});
  const [{Duel}, {COURSE}] = await Promise.all([import('../src/game.js'), import('../src/config.js')]);
  const time = engineCurve => {
    const duel = new Duel({seed: 1989, featureFlags: {enabled: name => name === 'tyre-slip' || (engineCurve && name === 'engine-curve')}});
    duel.startCampaign({seed: 1989, car: 'falcone_f42', difficulty: 'pro', mode: 'timetrial', opponentCount: 0, startStage: COURSE.findIndex(row => row.id === 'tremblant-woods')});
    Object.assign(duel.state, {status: 'racing', countdown: 0, s: 1409, speedMph: 30, gear: 1, traffic: [], opponents: [], lateral: 0, headingError: 0});
    duel.state.revs = 30 / duel.car.gears[1];
    const seconds = {};
    for (let tick = 0; tick < 120 * 12 && duel.state.speedMph < 70; tick++) {
      duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false, shiftUp: duel.state.revs >= GEAR_LESSON.greenMarkRevs && duel.state.gear < 4});
      duel.step(1 / 120);
      seconds.t = (tick + 1) / 120;
    }
    return seconds.t;
  };
  const lessonRun = time(true), old = time(false);
  assert.ok(lessonRun > old * 1.1, `changing up early from 30 to 70 mph: ${lessonRun.toFixed(2)} s on the engine curve, ${old.toFixed(2)} s on the old pull`);
  assert.ok(baseline.instructor.timeSec > 0);
});
