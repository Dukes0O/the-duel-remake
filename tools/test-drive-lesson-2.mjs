import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_LINE_ROWS, DRIVE_LESSON_CORNERS, createDriveLesson, stepDriveLesson, instructorControls,
  buildInstructorRun, instructorConeDistances, TIP_DISTANCE_M, LESSON_LINE, linePlanFor, linePointsFor, buildWaypointLine, lineWaypoints, placeLineCones}
  from '../src/lessons/drive-lessons.js';

// Lesson 2, the racing line (docs/DRIVING_LESSONS.md 12.2). The plain tests need no
// simulator; the native ones run the real race rules from the start gate in the
// player's car, like lesson 1's.

const straight = {roadHalfWidthAt: () => 6, groundAt: (s, lateral) => ({x: s, y: 0, z: lateral}),
  at: () => ({heading: 0, curvature: 0})};
const points = {startS: 100, turnInS: 250, turnOutS: 320, exitS: 345, dir: -1, apexS: 300,
  apexes: [{s: 270, dir: 1}, {s: 300, dir: -1}], corners: []};

test('the lesson rows name real corners 150 m after their start gates, with a tuned entry', () => {
  assert.deepEqual(DRIVE_LINE_ROWS.map(row => [row.courseId, row.cornerNames.length, row.gateOffsetM]),
    [['tremblant-woods', 2, 150], ['harbour-lights', 4, 150]]);
  assert.deepEqual(DRIVE_LINE_ROWS[0].cornerNames, ['Fir Esses 1', 'Fir Esses 2']);
  assert.deepEqual(DRIVE_LINE_ROWS[1].cornerNames, ['Old Town Esses 1', 'Old Town Esses 2', 'Old Town Esses 3', 'Old Town Esses 4']);
  assert.ok(Object.isFrozen(DRIVE_LINE_ROWS) && DRIVE_LINE_ROWS.every(Object.isFrozen));
  assert.equal(DRIVE_LESSON_CORNERS.length, 2, 'lesson 1 keeps its own table');
});

test('apex cones are 1.0 m in from the inside edge, the exit cone 1.5 m in from the outside, markers every 10 m', () => {
  const placed = placeLineCones(straight, points);
  assert.deepEqual(placed.cones.map(cone => [cone.id, cone.s, cone.lateral]), [[1, 270, 5], [2, 300, -5], [3, 345, 4.5]]);
  assert.equal(placed.finishS, 405);
  assert.deepEqual(placed.cones.map(cone => [cone.x, cone.z]), [[270, 5], [300, -5], [345, 4.5]]);
  assert.deepEqual(placed.markers.map(marker => marker.s).slice(0, 3), [110, 120, 130]);
  assert.equal(placed.markers.at(-1).s, 340);
  assert.ok(placed.markers.every(marker => marker.lateral === 0 && marker.z === 0), 'markers run down the middle');
  assert.throws(() => placeLineCones({...straight, roadHalfWidthAt: () => 1.5}, points), /valid road edge/);
  assert.throws(() => placeLineCones({...straight, roadHalfWidthAt: () => 3},
    {...points, apexes: [{s: 270, dir: 1}, {s: 300, dir: 1}], dir: -1}), /2m between neighbours/);
});

test('the waypoint line is level outside its waypoints and eases between them', () => {
  const waypoints = [{s: 100, lateral: -4}, {s: 200, lateral: 4}, {s: 300, lateral: -4}];
  for (const ease of ['cosine', 'parabolic']) {
    const line = buildWaypointLine({...straight, at: () => ({heading: 0})}, waypoints, {startS: 50, endS: 350, points, ease});
    assert.equal(line.offsetAt(50), -4); assert.equal(line.offsetAt(100), -4);
    assert.ok(Math.abs(line.offsetAt(200) - 4) < 1e-9); assert.ok(Math.abs(line.offsetAt(300) + 4) < 1e-9);
    assert.equal(line.offsetAt(350), -4);
    assert.ok(line.offsetAt(150) > -.001 && line.offsetAt(150) < .001, 'halfway across at the midpoint');
  }
  assert.throws(() => buildWaypointLine(straight, [{s: 1, lateral: 0}], {startS: 0, endS: 10, points}), /two waypoints/);
  assert.throws(() => buildWaypointLine(straight, [{s: 2, lateral: 0}, {s: 1, lateral: 0}], {startS: 0, endS: 10, points}), /forward/);
});

test('the racing line enters from the outside, passes each apex cone and ends on the outside', () => {
  const waypoints = lineWaypoints(straight, points, 30);
  assert.deepEqual(waypoints.map(row => [row.s, row.lateral]), [[100, -4.5], [220, -4.5], [270, 5], [300, -5], [345, 4.5]]);
  assert.equal(lineWaypoints(straight, points).length, 4, 'no entry waypoint without a lead');
});

test('lesson 2 scores its own three rules and coaches the first one missed', () => {
  const corner = {id: 'test', startS: 100, finishS: 405, dir: -1};
  const cones = [{id: 1, s: 270, lateral: 5, x: 270, z: 5}, {id: 2, s: 300, lateral: -5, x: 300, z: -5}, {id: 3, s: 345, lateral: 4.5, x: 345, z: 4.5}];
  const lesson = () => createDriveLesson('line', {corner, instructor: {timeSec: 5, cones}});
  const view = (s, lateral = 0, extra = {}) => ({s, lateral, world: {x: s, z: lateral}, speedMph: 60, brake: 0, throttle: 0,
    tyreSlip: 0, status: 'racing', paused: false, offRoad: false, ...extra});
  const drive = (instance, {apexes = true, outside = true, screech = 0} = {}) => {
    stepDriveLesson(instance, view(100), {start: true}, 0);
    stepDriveLesson(instance, view(270, apexes ? 5 : 0), {}, .5);
    stepDriveLesson(instance, view(300, apexes ? -5 : 0, {tyreSlip: screech ? 1.2 : 0}), {}, screech || .5);
    stepDriveLesson(instance, view(345, outside ? 4.5 : -4.5), {}, .5);
    return stepDriveLesson(instance, view(405, outside ? 4.5 : -4.5), {}, .5);
  };
  // Try 1, the middle of the road: counts however it ends; its own line.
  const first = lesson(), middle = drive(first, {apexes: false, outside: false});
  assert.equal(first.stage, 'late'); assert.equal(middle.radio, 'drive.radio.line.middle.result');
  assert.equal(first.lastAttempt.finished, true); assert.equal(first.lastAttempt.rules.length, 3);
  // Try 2: all three rules.
  const second = lesson(); second.stage = 'right'; second.phase = 'ready';
  const pass = drive(second);
  assert.deepEqual(second.lastAttempt.rules, [true, true, true]); assert.equal(pass.radio, 'drive.radio.line.right.pass');
  for (const [options, radio] of [[{apexes: false}, 'drive.radio.line.coach.apex'],
    [{outside: false}, 'drive.radio.corner.coach.exit'], [{screech: .3}, 'drive.radio.corner.coach.screech']]) {
    const miss = lesson(); miss.stage = 'right'; miss.phase = 'ready';
    const answer = drive(miss, options);
    assert.equal(answer.result, 'retry'); assert.equal(answer.radio, radio, JSON.stringify(options));
  }
  const near = lesson(); near.stage = 'right'; near.phase = 'ready';
  assert.equal(drive(near, {screech: .299}).result, 'running');
  // A wall before the apex cones is coached as running out of road.
  const wall = lesson(); wall.stage = 'right'; wall.phase = 'ready';
  stepDriveLesson(wall, view(100), {start: true}, 0);
  assert.equal(stepDriveLesson(wall, view(150), {wallHit: true}, .2).radio, 'drive.radio.line.coach.early');
  // The challenge reuses lesson 1's count lines and ends with this lesson's own.
  const challenge = lesson(); challenge.stage = 'challenge'; challenge.phase = 'ready';
  const lines = [];
  for (let i = 0; i < 3; i++) {
    stepDriveLesson(challenge, view(100), {start: true}, 0);
    lines.push(stepDriveLesson(challenge, view(405), {}, .4 + i * .01).radio);
  }
  assert.deepEqual(lines, ['drive.radio.corner.challenge.one', 'drive.radio.corner.challenge.two', 'drive.radio.line.pass']);
  assert.throws(() => createDriveLesson('line', {corner, instructor: {timeSec: 5, cones: cones.slice(0, 1)}}), /Invalid instructor plan/);
  assert.throws(() => createDriveLesson('other', {corner, instructor: {timeSec: 5, cones}}), /Invalid driving lesson/);
});

test('lesson 2 radio start lines follow its three stages', () => {
  const corner = {id: 'test', startS: 100, finishS: 405, dir: -1};
  const cones = [{id: 1, s: 270, lateral: 5, x: 270, z: 5}, {id: 2, s: 345, lateral: 4.5, x: 345, z: 4.5}];
  const lesson = createDriveLesson('line', {corner, instructor: {timeSec: 5, cones}});
  const view = {s: 100, lateral: 0, world: {x: 100, z: 0}, speedMph: 60, brake: 0, throttle: 0, tyreSlip: 0, status: 'racing'};
  assert.equal(stepDriveLesson(lesson, view, {start: true}, 0).radio, 'drive.radio.line.middle.start');
  lesson.phase = 'result'; lesson.stage = 'late';
  assert.equal(stepDriveLesson(lesson, view, {start: true}, 0).radio, 'drive.radio.line.right.start');
  lesson.phase = 'result'; lesson.lastAttempt = {passed: true};
  assert.equal(stepDriveLesson(lesson, view, {start: true}, 0).radio, 'drive.radio.line.challenge.start');
});

// ---- native: the real race rules in the player's car ---------------------------------

async function nativeAttempt(baseline, lesson, mode, fps) {
  const [{Duel}, {COURSE, DRIVE, steerForYaw}] = await Promise.all([import('../src/game.js'), import('../src/config.js')]);
  const {corner, instructor, courseId, car, upgrades, difficulty, seed} = baseline;
  const duel = new Duel({seed, featureFlags: {enabled: name => name === 'tyre-slip'}});
  duel.startCampaign({seed, car, upgrades: {...upgrades}, difficulty, driverId: 'club',
    mode: 'timetrial', opponentCount: 0, startStage: COURSE.findIndex(row => row.id === courseId)});
  const state = duel.state, course = duel.course, spec = duel.car, row = DRIVE_LINE_ROWS.find(item => item.courseId === courseId);
  const pace = difficulty === 'casual' ? .92 : .97, start = instructor.poses[0], middle = mode === 'middle';
  // The middle driver is built at 100% of what its line allows; the others use the instructor's own plan.
  const made = await linePlanFor(duel, row, middle ? 1 : pace, {middle, rollingMph: start.mph, startS: corner.startS});
  const {line, profile} = made;
  state.tyreSlipRules = true; state.tyreSlip = 0; state.status = 'racing'; state.countdown = 0; state.s = corner.startS;
  state.lateral = start.lateral; state.headingError = start.heading - course.at(state.s).heading; state.speedMph = start.mph;
  const gear = spec.gears.findIndex(top => top * DRIVE.gearCeilFrac >= state.speedMph);
  state.gear = gear < 0 ? spec.gears.length - 1 : gear; state.revs = state.speedMph / spec.gears[state.gear];
  state.yawVelocity = start.yawVelocity; state.traffic = []; state.opponents = [];
  state.nextLapGate = duel._lapGates.filter(s => s <= state.s).length;
  const scale = middle || mode === 'fast' ? 1 : mode === 'slow' ? pace * .8 : pace;
  const plan = {course, car: spec, line, profile: {at: s => profile.at(s) * scale / pace}, drive: DRIVE, steerForYaw,
    difficulty, turnInS: corner.turnInS, turnOutS: corner.turnOutS, brakeS: profile.brakeS};
  let wallHit = false, ticks = 0, frames = 0, answer;
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
        const controls = instructorControls(state, duel._drivingSurface(state.s, state.lateral), plan);
        duel.setInput(controls); duel.step(1 / 120); ticks++;
        answer = stepDriveLesson(lesson, carView(controls), {wallHit: wallHit || state.impactTimer > 0, crashed: state.status !== 'racing'}, 1 / 120);
      }
    }
    assert.equal(lesson.phase, 'result', mode + ' must end at a real gate or physical failure');
    return {answer, first, attempt: structuredClone(lesson.lastAttempt)};
  } finally { off(); }
}

for (const row of DRIVE_LINE_ROWS) {
  for (const difficulty of ['casual', 'pro']) {
    test(`native ${row.courseId} ${difficulty}: the instructor repeats exactly at 30/60/144 FPS and counts every cone`, async () => {
      const options = {courseId: row.courseId, difficulty, car: 'falcone_f42', upgrades: {}, seed: 1989, lessonId: 'line'};
      const baseline = await buildInstructorRun({...options, fps: 30});
      for (const fps of [30, 60, 144]) assert.deepEqual(await buildInstructorRun({...options, fps}), baseline, `repeats at ${fps} FPS`);
      const {corner, instructor} = baseline;
      assert.equal(baseline.lessonId, 'line');
      assert.ok(instructor.timeSec > 0);
      assert.equal(instructor.cones.length, row.cornerNames.length + 1, 'an apex cone for each corner and the exit cone');
      assert.deepEqual(instructor.cones.map(cone => cone.id), instructor.cones.map((_, i) => i + 1));
      assert.equal(instructor.finishS, instructor.cones.at(-1).s + 60);
      assert.equal(instructor.poses[0].s, corner.startS); assert.equal(instructor.poses.at(-1).s, corner.finishS);
      assert.equal(instructor.poses.at(-1).t, instructor.timeSec);
      assert.ok(instructor.poses.every(pose => Number.isFinite(pose.x) && Number.isFinite(pose.z) && pose.tyreSlip <= 1));
      for (const distance of instructorConeDistances(instructor.poses, instructor.cones))
        assert.ok(distance >= TIP_DISTANCE_M + LESSON_LINE.minClearM && distance <= 2.5, `cone clearance ${distance}`);
      assert.ok(instructor.markers.length > 20 && instructor.markers.every(marker => marker.lateral === 0), 'markers down the middle');
      assert.equal(instructor.redBoardS, undefined, 'lesson 2 has no red board');
      // The player must not have to brake the moment the lesson starts: at the speed the instructor
      // has at the gate there are at least 3 s of road before the first braking point (the gate
      // moves back along the road if it must), and the car really does not brake firmly before that.
      const speed = instructor.poses[0].mph * .44704;
      assert.ok((instructor.brakeS - corner.startS) / speed >= 3, `${((instructor.brakeS - corner.startS) / speed).toFixed(2)} s of road before braking`);
      const firm = instructor.poses.find(pose => pose.brake >= .5);
      assert.ok(firm && (firm.s - corner.startS) / speed >= 3, 'the first firm brake is at least 3 s of road from the gate');
      assert.ok(corner.startS <= corner.turnInS - row.gateOffsetM, 'the gate only ever moves back');
      // Every cone is within the counting distance of the recorded line, by the lesson's own counter.
      const lesson = createDriveLesson('line', baseline), view = pose => ({s: pose.s, lateral: pose.lateral,
        world: {x: pose.x, z: pose.z}, speedMph: pose.mph, brake: pose.brake, throttle: pose.throttle, tyreSlip: pose.tyreSlip, status: 'racing'});
      stepDriveLesson(lesson, view(instructor.poses[0]), {start: true}, 0);
      for (let i = 1; i < instructor.poses.length; i++)
        stepDriveLesson(lesson, view(instructor.poses[i]), {}, instructor.poses[i].t - instructor.poses[i - 1].t);
      assert.deepEqual(lesson.lastAttempt.cones.map(cone => cone.id), instructor.cones.map(cone => cone.id));
      assert.deepEqual(lesson.lastAttempt.rules, [true, true, true], 'the instructor passes its own three rules');
    });

    test(`native ${row.courseId} ${difficulty}: middle try, right try and challenge at 30/60/144 FPS, and the proof`, async () => {
      const baseline = await buildInstructorRun({courseId: row.courseId, difficulty, car: 'falcone_f42', upgrades: {}, seed: 1989, fps: 60, lessonId: 'line'});
      let reference = null;
      for (const fps of [30, 60, 144]) {
        const lesson = createDriveLesson('line', baseline), results = [];
        // Try 1: the middle of the road at the most speed that line allows. The proof: at least 0.3 s slower.
        const middle = await nativeAttempt(baseline, lesson, 'middle', fps); results.push(middle);
        assert.equal(lesson.stage, 'late'); assert.equal(middle.first, 'drive.radio.line.middle.start');
        assert.equal(middle.attempt.finished, true, 'the middle driver finishes (it counts however it ends)');
        assert.ok(middle.attempt.screechSeconds < .5, 'the middle driver stays within the tyres, so only the line differs');
        assert.ok(middle.attempt.timeLostSeconds >= .3, `${fps} FPS: the middle of the road is ${middle.attempt.timeLostSeconds}s slower than the instructor`);
        assert.equal(middle.answer.radio, 'drive.radio.line.middle.result');
        // Try 2: the instructor's own line passes all three rules.
        const right = await nativeAttempt(baseline, lesson, 'right', fps); results.push(right);
        assert.equal(lesson.stage, 'right'); assert.equal(right.attempt.endReason, 'finish');
        assert.deepEqual(right.attempt.rules, [true, true, true], 'native right try passes every rule');
        assert.equal(right.answer.radio, 'drive.radio.line.right.pass');
        // Challenge: a driver at 100% of the line's speed beats the instructor; a slow one resets the streak.
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
          assert.equal(fast.answer.result, i === 2 ? 'passed' : 'running');
        }
        assert.equal(lesson.done, true); assert.equal(lesson.streak, 3);
        assert.equal(results.at(-1).answer.radio, 'drive.radio.line.pass');
        if (reference) assert.deepEqual(results, reference, `native scoring repeats at ${fps} FPS`); else reference = results;
      }
    });
  }
}

test('the gate moves back only when the road before braking is under 3 s, and never into the previous bend', async () => {
  const {Duel} = await import('../src/game.js'), {COURSE, DRIVE} = await import('../src/config.js');
  const {linePlanFor: plan} = await import('../src/lessons/drive-lessons.js');
  const moved = {};
  for (const row of DRIVE_LINE_ROWS) for (const [difficulty, pace] of [['casual', .92], ['pro', .97]]) {
    const duel = new Duel({seed: 1989, featureFlags: {enabled: name => name === 'tyre-slip'}});
    duel.startCampaign({seed: 1989, car: 'falcone_f42', difficulty, mode: 'timetrial', opponentCount: 0, startStage: COURSE.findIndex(item => item.id === row.courseId)});
    const course = duel.course, nominal = linePointsFor(course, row, .55).startS, made = await plan(duel, row, pace);
    const room = (made.profile.brakeS - made.startS) / (made.rollingMph * DRIVE.mphToWorld);
    assert.ok(room >= 3, `${row.courseId} ${difficulty}: ${room.toFixed(2)} s of road before braking`);
    const previous = course.script.pieces.filter(piece => piece.kind === 'turn' && piece.s1 <= nominal + 150 - row.gateOffsetM + 1 &&
      !row.cornerNames.includes(piece.name)).at(-1);
    assert.ok(made.startS <= nominal && made.startS >= previous.s1 + 15, 'back along the road, but clear of the previous bend');
    // At the nominal gate the same plan would have had less than 3 s: that is why the gate moved.
    if (made.startS < nominal) {
      const fixed = await plan(duel, row, pace, {startS: nominal});
      assert.ok((fixed.profile.brakeS - fixed.startS) / (fixed.rollingMph * DRIVE.mphToWorld) < 3);
    } else assert.equal(made.startS, nominal, 'a gate that already has 3 s of road stays where the row puts it');
    moved[row.courseId + ' ' + difficulty] = made.startS - nominal;
  }
  assert.ok(moved['tremblant-woods casual'] < 0 && moved['tremblant-woods pro'] < 0, 'Fir Esses needs its gate further back');
  assert.equal(moved['harbour-lights casual'], 0); assert.equal(moved['harbour-lights pro'], 0);
});

test('points for a row come from the course pieces and the lesson never touches lesson 1', async () => {
  const [{Duel}, {COURSE}, {TRACK_SCRIPT}] = await Promise.all([import('../src/game.js'), import('../src/config.js'), import('../src/track-script.js')]);
  for (const row of DRIVE_LINE_ROWS) {
    const duel = new Duel({seed: 1989, featureFlags: {enabled: name => name === 'tyre-slip'}});
    duel.startCampaign({seed: 1989, car: 'falcone_f42', mode: 'timetrial', opponentCount: 0, startStage: COURSE.findIndex(item => item.id === row.courseId)});
    const found = linePointsFor(duel.course, row, TRACK_SCRIPT.apexShare);
    assert.equal(found.corners.length, row.cornerNames.length);
    assert.equal(found.startS, found.turnInS - 150);
    assert.ok(found.apexes.every((apex, i) => apex.s > found.corners[i].s0 && apex.s < found.corners[i].s1));
    assert.ok(found.apexes.every((apex, i) => i === 0 || apex.dir === -found.apexes[i - 1].dir), 'the corners alternate (esses)');
    assert.equal(found.dir, found.apexes.at(-1).dir);
    assert.throws(() => linePointsFor(duel.course, {...row, cornerNames: ['No Such Corner']}, .55), /missing/);
  }
  await assert.rejects(buildInstructorRun({courseId: 'tremblant-woods', car: 'falcone_f42', lessonId: 'gears'}), /Unknown driving lesson/);
});
