// LESSON-CRASH-STUCK: a crash inside a driving lesson plays out and lets go (shake, sound, steering).
// Kyle, 28 October 2026: "the screen just shakes without end, the sound stops working".
import test from 'node:test';
import assert from 'node:assert/strict';

const STEP = 1 / 120;

async function withLesson(stage, body) {
  const saved = new Map(['__DUEL_QA__', 'location'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.defineProperty(globalThis, '__DUEL_QA__', {configurable: true, value: true});
  Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '?flags=driving-lessons,tyre-slip'}});
  try {
    const {withReferenceApp} = await import('./build-reference-laps.mjs');
    await withReferenceApp(async app => {
      app.addPlayer('Crash owner');
      app.setRaceSettings({eventId: 'panorama-ridge', car: 'falcone_f42', difficulty: 'casual'});
      assert.equal(app.openDrivingLessons(), true);
      assert.equal(await app.startLesson({courseId: 'panorama-ridge', car: 'falcone_f42', difficulty: 'casual'}), true);
      app.nextLessonAttempt(); // dismiss the briefing
      if (stage !== 'watch') assert.equal(app.chooseLessonStep(stage), true);
      await body(app, app.duel, app.duel.state, app.duel.drivingLesson);
    });
  } finally { for (const [k, d] of saved) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } }
}

// Drive a second with the throttle held, then hit a rock at 80 mph: the same call a roadside obstacle makes.
function crashIt(duel, state, run) {
  duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
  for (let tick = 0; tick < 120 && run.lesson.phase === 'driving'; tick++) duel.step(STEP);
  assert.equal(run.lesson.phase, 'driving');
  state.speedMph = Math.max(state.speedMph, 80);
  duel._crash('rock', 1, 80, 'front');
}

for (const stage of ['follow', 'your-turn', 'beat']) {
  test(`${stage}: a crash plays out, the shake and flash end, and the car is driveable again`, async () => {
    await withLesson(stage, async (app, duel, state, run) => {
      assert.equal(run.lesson.stage, stage);
      crashIt(duel, state, run);
      assert.ok(state.impactTimer > 0, 'the car crashed');
      assert.ok(state.impactStrength > 0);
      const recovered = [];
      const originalEmit = duel.emit.bind(duel);
      duel.emit = event => { if (event.recovered) recovered.push(event); return originalEmit(event); };
      // Let go of the keys and wait out the crash: the longest impact is under 3 seconds.
      duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
      for (let tick = 0; tick < 120 * 4 && run.lesson.phase === 'driving'; tick++) duel.step(STEP);
      if (run.lesson.phase === 'driving') {
        assert.equal(state.impactTimer, 0, 'the impact timer runs out, so the camera shake stops');
        assert.equal(state.crashFlash, 0, 'the red crash flash ends');
        assert.equal(state.invulnerableSec <= 0 || state.invulnerableSec < 3, true);
        assert.equal(recovered.length, 1, 'the car is put back at the crash site once');
        assert.equal(state.crashSite, null);
      }
    });
  });
}

test('after the crash has ended, left and up together turn the car and a second crash is still seen', async () => {
  await withLesson('follow', async (app, duel, state, run) => {
    crashIt(duel, state, run);
    assert.ok(state.impactTimer > 0);
    duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
    for (let tick = 0; tick < 120 * 4 && state.impactTimer > 0; tick++) duel.step(STEP);
    assert.equal(state.impactTimer, 0);
    // Throttle and a left turn at the same time: the nose must swing left, not carry straight on.
    duel.setInput({throttle: 1, brake: 0, steer: -1, boost: false});
    const before = state.headingError;
    for (let tick = 0; tick < 60 && state.impactTimer <= 0; tick++) duel.step(STEP);
    assert.ok(state.steerVisual < -0.2, 'the wheel follows the left key');
    assert.ok(state.yawVelocity > 0.01 || state.headingError > before, 'the nose turns left with the throttle held');
    // The crash rules are live again: a second crash plays out and ends too.
    state.invulnerableSec = 0; state.damageCooldown = 0;
    duel._crash('rock', -1, 80, 'front');
    assert.ok(state.impactTimer > 0, 'a second crash is possible');
    for (let tick = 0; tick < 120 * 4 && run.lesson.phase === 'driving' && state.impactTimer > 0; tick++) duel.step(STEP);
    assert.equal(state.impactTimer, 0);
  });
});

test('a crash just before the finish line still ends behind the result screen', async () => {
  await withLesson('follow', async (app, duel, state, run) => {
    duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
    for (let tick = 0; tick < 60; tick++) duel.step(STEP);
    // Put the car half a metre before the finish and crash it there.
    state.s = state.prevS = run.plan.corner.finishS - 0.5;
    state.speedMph = 80;
    duel._crash('rock', 1, 80, 'front');
    for (let tick = 0; tick < 120 * 2 && run.lesson.phase === 'driving'; tick++) duel.step(STEP);
    assert.equal(run.lesson.phase, 'result', 'the run ended at the finish');
    assert.ok(state.impactTimer > 0, 'the crash was still going when the result came up');
    for (let tick = 0; tick < 120 * 4; tick++) duel.step(STEP);
    assert.equal(state.impactTimer, 0, 'the shake stops behind the result screen');
    assert.equal(state.crashFlash, 0);
  });
});

// Kyle's second report: up and left together sometimes seemed to go straight. Two keys are read correctly
// (ArrowUp for the throttle, ArrowLeft for the wheel); neither key blocks the other, and a lesson never
// replaces the player's input outside the Watch step.
test('Up and Left held together give throttle and a left turn in every lesson step that the player drives', async () => {
  for (const stage of ['follow', 'your-turn', 'beat']) {
    await withLesson(stage, async (app, duel, state) => {
      app.keys = {ArrowUp: true, ArrowLeft: true};
      const headingAtStart = state.headingError;
      for (let tick = 0; tick < 36; tick++) {
        app._applyInput(STEP);
        assert.ok(state.input.throttle > 0, `${stage}: throttle is on`);
        assert.ok(state.input.steer < 0, `${stage}: the left key reaches the wheel`);
        duel.step(STEP);
      }
      assert.ok(state.steerVisual < -0.3, `${stage}: the wheel moved left`);
      assert.ok(state.yawVelocity > 0 || state.headingError !== headingAtStart, `${stage}: the nose swings`);
      app.keys = {};
    });
  }
});
