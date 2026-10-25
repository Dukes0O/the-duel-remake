import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_SNOW_ROWS, createDriveLesson, stepDriveLesson, instructorControls, buildInstructorRun, snowPlanFor, iceZonesOf, instructorConeDistances, TIP_DISTANCE_M, LESSON_LINE}
  from '../src/lessons/drive-lessons.js';

// Lesson 4, snow (docs/DRIVING_LESSONS.md 12.4): Tremblant Snow's Beaver Hairpin, with the ice patch on the
// spur before it. Summer tyres for tries 1 and 2 and the challenge, then one run on winter tyres.

const corner = {id: 'Beaver Hairpin', startS: 100, finishS: 405, dir: -1};
const cones = [{id: 1, s: 200, lateral: 5.5, x: 200, z: 5.5}, {id: 2, s: 300, lateral: -6, x: 300, z: -6}, {id: 3, s: 345, lateral: 5.5, x: 345, z: 5.5}];
const ice = [{s0: 220, s1: 270}];
const plan = (extra = {}) => ({timeSec: 5, redBoardS: 280, cones, ice, winter: {timeSec: 4.4}, ...extra});
const view = (s, lateral = 0, extra = {}) => ({s, lateral, world: {x: s, z: lateral}, speedMph: 40, brake: 0, throttle: 0,
  tyreSlip: 0, status: 'racing', paused: false, offRoad: false, ...extra});
const create = extra => createDriveLesson('snow', {corner, instructor: plan(extra)});
const start = lesson => stepDriveLesson(lesson, view(100), {start: true}, 0);

// One right try: brake window at cone 1, hard or soft brake on the ice, touch the inside cone, screech.
function right(lesson, {brakeS = 200, iceBrake = 0, inside = true, screech = 0} = {}) {
  start(lesson);
  stepDriveLesson(lesson, view(brakeS, 5.5, {brake: .7}), {}, .1);
  stepDriveLesson(lesson, view(245, 5.5, {brake: iceBrake}), {}, .1);
  stepDriveLesson(lesson, view(300, inside ? -6 : 0, {tyreSlip: screech ? 1.2 : 0}), {}, screech || .1);
  return stepDriveLesson(lesson, view(405, 0), {}, .1);
}
const ready = (stage, extra) => { const lesson = create(extra); lesson.stage = stage; lesson.phase = 'ready'; return lesson; };

test('the snow row names the course, the corner and the Kink gate 150 m back', () => {
  assert.deepEqual(DRIVE_SNOW_ROWS.map(row => [row.courseId, row.cornerNames, row.gateBefore, row.gateOffsetM]),
    [['tremblant-snow', ['Beaver Hairpin'], 'Beaver Kink', 150]]);
  assert.ok(Object.isFrozen(DRIVE_SNOW_ROWS) && Object.isFrozen(DRIVE_SNOW_ROWS[0]));
});

test('ice stretches are read from the surface under the middle of the road', () => {
  const surface = {_drivingSurface: s => ({gripKind: (s >= 12 && s <= 14) || s === 20 || s >= 29 ? 'ice' : 'snow'})};
  assert.deepEqual(iceZonesOf(surface, 10, 30), [{s0: 12, s1: 14}, {s0: 20, s1: 20}, {s0: 29, s1: 30}]);
  assert.deepEqual(iceZonesOf({_drivingSurface: () => ({gripKind: 'asphalt'})}, 0, 20), []);
});

test('the snow lesson needs its board, three cones and valid ice and winter data', () => {
  assert.doesNotThrow(() => create());
  assert.doesNotThrow(() => create({winter: undefined}), 'the winter time arrives once the winter instructor has run');
  for (const bad of [{redBoardS: undefined}, {ice: undefined}, {ice: [{s0: 5, s1: 4}]}, {cones: cones.slice(0, 2)}, {winter: {timeSec: 0}}])
    assert.throws(() => create(bad), TypeError, JSON.stringify(bad));
});

test('try 1, the dry board: it counts however it ends and speaks only if the tyres really slid or left the road', () => {
  const slid = create(); start(slid);
  stepDriveLesson(slid, view(290, 0, {tyreSlip: 1.2, brake: 1}), {}, .6);
  assert.equal(stepDriveLesson(slid, view(300), {wallHit: true}, .1).radio, 'drive.radio.snow.late.result');
  assert.equal(slid.stage, 'late'); assert.equal(slid.phase, 'result'); assert.equal(slid.lastAttempt.endReason, 'wall');
  const clean = create(); start(clean);
  stepDriveLesson(clean, view(290, 0, {brake: 1}), {}, .1);
  assert.equal(stepDriveLesson(clean, view(405), {}, .1).radio, null, 'no claim the tyres slid when they did not');
  const screech = create(); start(screech);
  stepDriveLesson(screech, view(290, 0, {tyreSlip: 1.2}), {}, .5);
  assert.equal(stepDriveLesson(screech, view(405), {}, .1).radio, 'drive.radio.snow.late.result');
  start(clean); assert.equal(clean.stage, 'right');
});

test('try 2 has four rules: brake at the snow cone, under 20% on the ice, the inside cone, no long screech', () => {
  const pass = ready('right'), answer = right(pass);
  assert.deepEqual(pass.lastAttempt.rules, [true, true, true, true]);
  assert.equal(answer.radio, 'drive.radio.snow.right.pass'); assert.equal(pass.lastAttempt.iceBrakeMax, 0);
  for (const [options, radio] of [[{brakeS: 184}, 'drive.radio.snow.coach.brake'], [{brakeS: 206}, 'drive.radio.snow.coach.brake'],
    [{iceBrake: .2}, 'drive.radio.snow.coach.ice'], [{inside: false}, 'drive.radio.corner.coach.inside'],
    [{screech: .3}, 'drive.radio.snow.coach.turn']]) {
    const lesson = ready('right'), result = right(lesson, options);
    assert.equal(result.result, 'retry'); assert.equal(result.radio, radio, JSON.stringify(options));
  }
  for (const options of [{brakeS: 185}, {brakeS: 205}, {iceBrake: .199}, {screech: .299}])
    assert.equal(right(ready('right'), options).result, 'running', JSON.stringify(options) + ' is still a pass');
  // The ice is where the middle of the road is ice, not wherever the brake was pressed.
  const early = ready('right'); start(early);
  stepDriveLesson(early, view(200, 5.5, {brake: 1}), {}, .1);
  stepDriveLesson(early, view(215, 5.5, {brake: .1}), {}, .1);
  stepDriveLesson(early, view(300, -6), {}, .1);
  stepDriveLesson(early, view(405), {}, .1);
  assert.deepEqual(early.lastAttempt.rules, [true, true, true, true], 'full brake before the ice is the point of the lesson');
});

test('the challenge is three in a row, then one winter run against the winter instructor that passes however it ends', () => {
  const lesson = ready('right'); right(lesson);
  const run = seconds => { start(lesson); return stepDriveLesson(lesson, view(405), {}, seconds); };
  assert.equal(run(4.9).radio, 'drive.radio.corner.challenge.one'); assert.equal(lesson.stage, 'challenge');
  assert.equal(run(4.95).radio, 'drive.radio.corner.challenge.two');
  assert.equal(run(5.2).radio, 'drive.radio.corner.challenge.reset'); assert.equal(lesson.streak, 0);
  run(4.9); run(4.8);
  const third = run(4.7);
  assert.equal(lesson.streak, 3); assert.equal(third.result, 'running'); assert.equal(third.radio, null); assert.equal(lesson.done, false);
  // The winter run: its own start line, the winter instructor's time on the card, and it passes.
  const begin = start(lesson);
  assert.equal(lesson.stage, 'winter'); assert.equal(begin.radio, 'drive.radio.snow.winter.start');
  stepDriveLesson(lesson, view(260, 0, {brake: 1}), {}, .2);
  const end = stepDriveLesson(lesson, view(300), {wallHit: true}, .1);
  assert.equal(end.result, 'passed'); assert.equal(lesson.done, true);
  assert.equal(end.radio, 'drive.radio.snow.winter.result'); assert.deepEqual(end.queued, ['drive.radio.snow.pass']);
  assert.equal(lesson.lastAttempt.endReason, 'wall'); assert.equal(lesson.lastAttempt.instructorSeconds, 4.4);
  assert.equal(lesson.lastAttempt.passed, true);
  // A finished winter run shows the time against the winter instructor.
  const second = ready('right'); right(second);
  for (const seconds of [4.9, 4.8, 4.7]) { start(second); stepDriveLesson(second, view(405), {}, seconds); }
  start(second);
  stepDriveLesson(second, view(405), {}, 4.6);
  assert.equal(second.lastAttempt.instructorSeconds, 4.4); assert.equal(second.lastAttempt.timeLostSeconds, .2);
  assert.equal(second.done, true);
});

test('without a winter instructor the challenge passes the lesson itself', () => {
  const lesson = ready('right', {winter: undefined}); right(lesson);
  let last;
  for (const seconds of [4.9, 4.8, 4.7]) { start(lesson); last = stepDriveLesson(lesson, view(405), {}, seconds); }
  assert.equal(last.result, 'passed'); assert.equal(last.radio, 'drive.radio.snow.pass'); assert.equal(lesson.done, true);
});

test('lessons 1 and 2 do not gain the ice rule', () => {
  const one = createDriveLesson('corner', {corner, instructor: {timeSec: 5, redBoardS: 280, cones}});
  start(one);
  assert.equal(one.attempt.iceBrakeMax, undefined);
  assert.equal(stepDriveLesson(one, view(405), {}, .1).radio === undefined, false);
  assert.equal(one.lastAttempt.iceBrakeMax, undefined); assert.equal(one.lastAttempt.rules.length, 4);
});

// ---- native: the real race rules in the player's car --------------------------------

async function nativeAttempt(baseline, lesson, mode, fps) {
  const [{Duel}, {COURSE, DRIVE, steerForYaw, tyreSlipSteering}] = await Promise.all([import('../src/game.js'), import('../src/config.js')]);
  const {corner: gate, instructor, courseId, car, upgrades, difficulty, seed} = baseline;
  const tyre = mode === 'winter' ? 'winter' : 'summer';
  const duel = new Duel({seed, featureFlags: {enabled: name => name === 'tyre-slip'}});
  duel.startCampaign({seed, car, upgrades: {...upgrades}, difficulty, driverId: 'club', mode: 'timetrial', opponentCount: 0,
    startStage: COURSE.findIndex(row => row.id === courseId), tyre});
  const state = duel.state, course = duel.course, spec = duel.car, row = DRIVE_SNOW_ROWS.find(item => item.courseId === courseId);
  const pace = difficulty === 'casual' ? .92 : .97, start0 = (mode === 'winter' ? instructor.winter : instructor).poses[0];
  const made = await snowPlanFor(duel, row, pace, {fixed: {startS: gate.startS, rollingMph: start0.mph, placement: {cones: instructor.cones,
    redBoardS: instructor.redBoardS, finishS: instructor.finishS, ice: instructor.ice}}});
  const {line, profile} = made;
  state.tyreSlipRules = true; state.tyreSlip = 0; state.status = 'racing'; state.countdown = 0; state.s = gate.startS;
  state.lateral = start0.lateral; state.headingError = start0.heading - course.at(state.s).heading; state.speedMph = start0.mph;
  const gear = spec.gears.findIndex(top => top * DRIVE.gearCeilFrac >= state.speedMph);
  state.gear = gear < 0 ? spec.gears.length - 1 : gear; state.revs = state.speedMph / spec.gears[state.gear];
  state.yawVelocity = start0.yawVelocity; state.traffic = []; state.opponents = [];
  state.nextLapGate = duel._lapGates.filter(s => s <= state.s).length;
  const scale = mode === 'fast' ? 1 : mode === 'slow' ? pace * .8 : pace;
  const plan = {course, car: spec, line, profile: {at: s => profile.at(s) * scale / pace}, drive: DRIVE, steerForYaw,
    difficulty, turnInS: gate.turnInS, turnOutS: gate.turnOutS, brakeS: profile.brakeS};
  const cornerSpeed = Math.min(...(mode === 'winter' ? instructor.winter : instructor).poses
    .filter(p => p.s >= gate.turnInS && p.s <= gate.turnOutS).map(p => p.mph));
  assert.ok(Number.isFinite(cornerSpeed) && cornerSpeed > 0);
  const snowCone = instructor.cones[0].s;
  let wallHit = false, ticks = 0, frames = 0, answer, brakingDone = false;
  const off = duel.onChange((current, event) => { if (event.crash || event.scrape || event.boundaryReset || event.checkpointReset) wallHit = true; });
  const carView = controls => ({s: state.s, lateral: state.lateral, world: course.groundAt(state.s, state.lateral),
    speedMph: state.speedMph, brake: controls.brake, throttle: controls.throttle, tyreSlip: state.tyreSlip || 0,
    offRoad: state.offRoad === true, status: 'racing', paused: false});
  try {
    answer = stepDriveLesson(lesson, carView({brake: 0, throttle: 0}), {start: true}, 0);
    const first = answer.radio;
    while (lesson.phase === 'driving' && ticks < 120 * 120) {
      const frameTicks = Math.floor(++frames * 120 / fps + 1e-9);
      while (ticks < frameTicks && lesson.phase === 'driving' && ticks < 120 * 120) {
        const surface = duel._drivingSurface(state.s, state.lateral);
        let controls = instructorControls(state, surface, plan);
        if (mode === 'late' || mode === 'right') {
          // The right try brakes hard at the snow cone, before the ice, until down to the corner speed. The
          // late try follows the instructor up to cone 1, then holds the throttle to the dry board and brakes there.
          const brakeS = mode === 'late' ? instructor.redBoardS : snowCone, early = mode === 'late' && state.s < snowCone;
          if (state.s >= brakeS && state.speedMph <= cornerSpeed) brakingDone = true;
          const brake = state.s >= brakeS && !brakingDone ? 1 : 0, flatOut = mode === 'late' && !early && state.s < brakeS;
          if (!early) controls = {...controls, brake: flatOut ? 0 : brake, throttle: flatOut ? 1 : brake ? 0 : controls.throttle};
          const steer = mode === 'late'
            ? (yaw, options) => { const {steerGain} = tyreSlipSteering({...options, brake}); return Math.max(-1, Math.min(1, -yaw / Math.max(.05, steerGain))); }
            : (yaw, options) => steerForYaw(yaw, {...options, brake});
          controls.steer = instructorControls(state, surface, {...plan, steerForYaw: steer}).steer;
        }
        duel.setInput(controls); duel.step(1 / 120); ticks++;
        answer = stepDriveLesson(lesson, carView(controls), {wallHit: wallHit || state.impactTimer > 0, crashed: state.status !== 'racing'}, 1 / 120);
      }
    }
    assert.equal(lesson.phase, 'result', mode + ' must end at a real gate or physical failure');
    return {answer, first, attempt: structuredClone(lesson.lastAttempt)};
  } finally { off(); }
}

for (const difficulty of ['casual', 'pro']) {
  test(`native ${difficulty}: both instructors repeat exactly at 30/60/144 FPS, count every cone and never brake hard on the ice`, async () => {
    const options = {courseId: 'tremblant-snow', difficulty, car: 'falcone_f42', upgrades: {}, seed: 1989, lessonId: 'snow'};
    const baseline = await buildInstructorRun({...options, fps: 30});
    for (const fps of [30, 60, 144]) assert.deepEqual(await buildInstructorRun({...options, fps}), baseline, `repeats at ${fps} FPS`);
    const {corner: gate, instructor} = baseline, {winter} = instructor, row = DRIVE_SNOW_ROWS[0];
    assert.equal(baseline.lessonId, 'snow'); assert.equal(baseline.tyre, 'summer');
    assert.equal(instructor.cones.length, 3); assert.equal(instructor.finishS, instructor.cones[2].s + 60);
    assert.ok(instructor.redBoardS >= instructor.cones[0].s && instructor.redBoardS <= gate.turnInS, 'the dry board is after the snow cone, not past turn-in');
    assert.ok(instructor.redBoardS > instructor.ice.at(-1).s1, 'the dry board is where the dry-road instructor would brake: after the ice');
    assert.ok(instructor.cones[0].s < instructor.ice[0].s0, 'the snow cone is before the ice');
    assert.ok(instructor.ice.length === 1 && instructor.ice[0].s1 - instructor.ice[0].s0 <= 60, 'the spur has one ice patch, at most 60 m long');
    for (const [name, run] of [['summer', instructor], ['winter', winter]]) {
      assert.equal(run.poses[0].s, gate.startS, name); assert.equal(run.poses.at(-1).s, gate.finishS, name);
      assert.equal(run.poses.at(-1).t, run.timeSec, name);
      for (const distance of instructorConeDistances(run.poses, instructor.cones))
        assert.ok(distance >= TIP_DISTANCE_M + LESSON_LINE.minClearM && distance <= 2.5, `${name} cone clearance ${distance}`);
      assert.ok(run.poses.every(pose => Number.isFinite(pose.x) && Number.isFinite(pose.z) && pose.tyreSlip <= 1), name + ' never slides');
      const onIce = run.poses.filter(pose => instructor.ice.some(zone => pose.s >= zone.s0 && pose.s <= zone.s1));
      assert.ok(onIce.length > 100 && Math.max(...onIce.map(pose => pose.brake)) < .2, name + ' brakes under 20% on the ice');
    }
    // Three seconds of road before the first braking point, at the speed of the gate.
    const speed = instructor.poses[0].mph * .44704;
    assert.ok((instructor.brakeS - gate.startS) / speed >= 3, `${((instructor.brakeS - gate.startS) / speed).toFixed(1)} s of road before braking`);
    assert.ok(gate.startS <= gate.turnInS - 150 - (row.gateOffsetM - 150), 'the gate is where the row puts it, or further back');
    // The proof: winter tyres make a faster instructor than summer tyres.
    assert.ok(winter.timeSec < instructor.timeSec, `winter ${winter.timeSec}s vs summer ${instructor.timeSec}s`);
    // Every cone is counted by the lesson's own counter along the summer run.
    const lesson = createDriveLesson('snow', baseline), carView = pose => ({s: pose.s, lateral: pose.lateral,
      world: {x: pose.x, z: pose.z}, speedMph: pose.mph, brake: pose.brake, throttle: pose.throttle, tyreSlip: pose.tyreSlip, status: 'racing'});
    stepDriveLesson(lesson, carView(instructor.poses[0]), {start: true}, 0);
    for (let i = 1; i < instructor.poses.length; i++) stepDriveLesson(lesson, carView(instructor.poses[i]), {}, instructor.poses[i].t - instructor.poses[i - 1].t);
    assert.deepEqual(lesson.lastAttempt.cones.map(cone => cone.id), [1, 2, 3]);
  });

  test(`native ${difficulty}: the dry board proof, right try, challenge and winter run at 30/60/144 FPS`, async () => {
    const baseline = await buildInstructorRun({courseId: 'tremblant-snow', difficulty, car: 'falcone_f42', upgrades: {}, seed: 1989, fps: 60, lessonId: 'snow'});
    let reference = null;
    for (const fps of [30, 60, 144]) {
      const lesson = createDriveLesson('snow', baseline), results = [];
      // Try 1: brake at the dry board. The proof: the tyres screech for at least half a second, or the car leaves the road.
      const late = await nativeAttempt(baseline, lesson, 'late', fps); results.push(late);
      assert.equal(lesson.stage, 'late'); assert.equal(late.first, 'drive.radio.snow.late.start');
      assert.ok(late.attempt.firstBrakeS >= baseline.instructor.redBoardS - 1, 'the late driver waits for the dry board');
      assert.ok(late.attempt.screechSeconds >= .5 || ['wall', 'offroad'].includes(late.attempt.endReason),
        `${fps} FPS: dry-board try screeched ${late.attempt.screechSeconds}s and ended ${late.attempt.endReason}`);
      assert.equal(late.answer.radio, 'drive.radio.snow.late.result');
      // Try 2: the snow way passes all four rules.
      const right = await nativeAttempt(baseline, lesson, 'right', fps); results.push(right);
      assert.equal(lesson.stage, 'right'); assert.equal(right.first, 'drive.radio.snow.right.start');
      assert.equal(right.attempt.endReason, 'finish');
      assert.deepEqual(right.attempt.rules, [true, true, true, true], 'native right try passes every rule');
      assert.equal(right.answer.radio, 'drive.radio.snow.right.pass');
      // Challenge: a faster driver beats the summer instructor; a slow one resets the streak.
      for (let i = 0; i < 2; i++) {
        const fast = await nativeAttempt(baseline, lesson, 'fast', fps); results.push(fast);
        assert.equal(lesson.stage, 'challenge'); assert.equal(fast.attempt.endReason, 'finish');
        assert.ok(fast.attempt.elapsedSeconds < baseline.instructor.timeSec); assert.equal(lesson.streak, i + 1);
      }
      const slow = await nativeAttempt(baseline, lesson, 'slow', fps); results.push(slow);
      assert.equal(slow.attempt.endReason, 'finish'); assert.ok(slow.attempt.elapsedSeconds >= baseline.instructor.timeSec);
      assert.equal(lesson.streak, 0, 'a slower attempt resets the streak');
      for (let i = 0; i < 3; i++) {
        const fast = await nativeAttempt(baseline, lesson, 'fast', fps); results.push(fast);
        assert.equal(fast.attempt.endReason, 'finish'); assert.ok(fast.attempt.elapsedSeconds < baseline.instructor.timeSec);
        assert.equal(fast.answer.result, 'running'); assert.equal(fast.answer.radio, i === 2 ? null : fast.answer.radio);
      }
      assert.equal(lesson.streak, 3); assert.equal(lesson.done, false, 'the winter run comes before the pass');
      // The winter run: winter tyres, against the winter instructor, and the lesson passes.
      const winter = await nativeAttempt(baseline, lesson, 'winter', fps); results.push(winter);
      assert.equal(lesson.stage, 'winter'); assert.equal(winter.first, 'drive.radio.snow.winter.start');
      assert.equal(winter.attempt.instructorSeconds, baseline.instructor.winter.timeSec);
      assert.equal(winter.attempt.endReason, 'finish', 'the winter instructor\'s own plan finishes');
      assert.equal(lesson.done, true); assert.equal(winter.answer.result, 'passed');
      assert.deepEqual(winter.answer.queued, ['drive.radio.snow.pass']);
      if (reference) assert.deepEqual(results, reference, `native scoring repeats at ${fps} FPS`); else reference = results;
    }
  });
}
