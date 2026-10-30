// STORY-KOGANE-FINISH: the whole Kogane Invitation played in the real game, one picture at each moment.
// Memory-only saves, private port, 1280x720, no frame timing. Start: a new player who owns Kogane Pass and has Brian's
// helicopter carry lesson done. Then: the menu and its Story button, Daichi's letter, Brian's Hairpin Lesson (Beat me,
// driven by the instructor's own faster recorded run), the helipad board, the delivery, the Night version found,
// Race Daichi on Easy (the test driver on the racing line), the results with the new car, the garage with the plaque,
// the menu with Ana's call and the front door. Run:
//   node tools/browser-harness.mjs scenario story-kogane
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {writeFile} from 'node:fs/promises';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const FLAGS = 'kogane-invitation,kogane-pass,kogane-pass-night,nissan-skyline,helicopter,pilot-map,driving-lessons';
const ready = `document.readyState==='complete' && !!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'
  && !document.querySelector('#start-engine')?.disabled`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const SKYLINE = 'nissan_skyline_gtr_r34';

// The lesson's faster recorded run and the racing-line test driver, bundled for the page (as the Panorama scenarios do).
async function helperBundle() {
  const entry = join(root, '.qa-dist/story-kogane.virtual.js').replaceAll('\\', '/');
  const source = id => JSON.stringify(join(root, id).replaceAll('\\', '/'));
  const result = await build({
    root, configFile: false, logLevel: 'silent', define: {__DUEL_QA__: 'true'},
    plugins: [{
      name: 'story-kogane-private',
      resolveId(id) { if (id.replaceAll('\\', '/') === entry) return '\0storykogane'; },
      load(id) {
        if (id !== '\0storykogane') return;
        return 'import {buildLessonDemonstration} from ' + source('src/lessons/drive-lessons.js') +
          ';import {useRacingLine} from ' + source('tools/track-script-drive.mjs') +
          ';globalThis.__storyQa={buildLessonDemonstration,useRacingLine};';
      },
    }],
    build: {write: false, emptyOutDir: false, minify: false, lib: {entry, formats: ['es']}, rolldownOptions: {output: {codeSplitting: false}}},
  });
  const chunk = (Array.isArray(result) ? result[0] : result).output.find(row => row.type === 'chunk');
  if (!chunk) throw Error('Helper bundle missing');
  return '(async()=>{' + chunk.code + '})()';
}

// The steady test pilot of tools/test-heli-story.mjs, in the page. It steps the app's own helicopter session.
const pilotSource = `window.__story = (() => {
  const app = () => window.__qaApp;
  const clamp = v => Math.max(-1, Math.min(1, v));
  function pilot(view, target, speed = 6) {
    const h = view.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading), rx = -fz, rz = fx;
    const dx = target.x - h.x, dz = target.z - h.z, d = Math.hypot(dx, dz), want = Math.min(speed, d * .4);
    const wx = d > .01 ? dx / d * want : 0, wz = d > .01 ? dz / d * want : 0, ex = wx - h.vx, ez = wz - h.vz;
    return {pitch: clamp((ex * fx + ez * fz) * .25), roll: clamp((ex * rx + ez * rz) * .25), lift: clamp((target.y - h.y) * .3 - h.vy * .3), yaw: 0};
  }
  function fly(seconds, controls = () => ({}), until = null) {
    const a = app(), session = a.heliSession, seen = [];
    for (let i = 0; i < Math.round(seconds * 120); i++) {
      const step = session.step(controls(session.view()));
      a._heliEvents(step); seen.push(...step);
      if (until?.(session.view(), seen)) break;
    }
    return seen;
  }
  const all = [];
  return {
    all,
    toCrateAndHook() {
      const a = app(), session = a.heliSession, crate = () => session.view().loads.find(l => l.storyJob);
      if (!crate()) throw Error('the story crate is not on the pad');
      all.push(...fly(60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, 4),
        v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < .6 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < .5));
      if (session.pressHook()?.type !== 'hooked') throw Error('could not hook the crate');
      a._heliEvents(session.takeEvents());
      all.push(...fly(12, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60})));
      return true;
    },
    cruise() {
      const a = app(), session = a.heliSession;
      if (!session.pressAutopilot()) throw Error('the autopilot did not take the crate');
      all.push(...fly(300, () => ({}), () => session.cruiseOffered));
      if (!(session.cruiseOffered && session.acceptCruise())) throw Error('no cruise offered');
      all.push(...fly(2));
      all.push(...fly(300, () => ({}), (v, seen) => seen.some(e => e.type === 'autopilotArrived')));
      session.pressAutopilot();
      return session.view().courseId;
    },
    setDown() {
      const a = app(), session = a.heliSession;
      all.push(...fly(60, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + .7 + 14.6}, 1), v => v.load.onGround));
      all.push(...fly(1, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y})));
      const r = session.pressHook();
      const events = session.takeEvents(); a._heliEvents(events); all.push(...events);
      return r?.type;
    },
  };
})()`;

// Plain facts about the words on the screen: no dashes, no developer words, nothing sticking out of the screen.
const textCheck = `(() => {
  const text = document.body.innerText.replace(/\\s+/g, ' ');
  const out = [];
  if (/\\u2014/.test(text)) out.push('em dash on screen');
  const dev = text.match(/undefined|NaN|\\bnull\\b|\\[object|story\\.kogane|kogane-pass|nissan_skyline|=>|\\bTODO\\b/i);
  if (dev) out.push('developer word on screen: ' + dev[0]);
  const root = document.scrollingElement;
  if (root.scrollHeight > innerHeight + 2 || root.scrollWidth > innerWidth + 2) out.push('page scrolls ' + root.scrollWidth + 'x' + root.scrollHeight);
  return {out, text: text.slice(0, 1500)};
})()`;

export async function run(context) {
  const report = {frames: [], facts: [], notes: []};
  const fail = [];
  const fact = (ok, label) => { report.facts.push({ok: !!ok, label}); if (!ok) fail.push(label); };
  const upTo = Number(process.env.STORY_UPTO || 99);
  const stop = n => upTo < n;
  const bundle = await helperBundle();

  const shot = async (name, note = '') => {
    await wait(350);
    const check = await context.evaluate(textCheck);
    report.frames.push({name, note, problems: check.out, text: check.text});
    await context.screenshot(name);
  };
  const click = async selector => {
    const point = await context.evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)});
      if (!node || node.disabled || node.hidden) throw Error('Control unavailable: ' + ${JSON.stringify(selector)});
      node.scrollIntoView({block: 'center'});
      const box = node.getBoundingClientRect(), top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      if (!box.width || !box.height || !node.contains(top)) throw Error('Control covered: ' + ${JSON.stringify(selector)} + ' by ' + (top?.className || top?.tagName));
      return {x: box.x + box.width / 2, y: box.y + box.height / 2}; })()`);
    for (const type of ['mousePressed', 'mouseReleased']) await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
  };
  const app = expr => context.evaluate(`(() => { const app = window.__qaApp; return ${expr}; })()`);
  const hidePanels = () => context.evaluate(`for (const el of document.querySelectorAll('body > details')) el.style.display = 'none'`);
  const frameNow = () => context.evaluate(`(() => { const a = window.__qaApp; a.onFrame?.(a.duel.state, 0); window.__render?.renderFrame?.(); })()`);

  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});

  // ---- the fresh player ----------------------------------------------------------------------------------------------
  await context.navigate('/tools/menu-check.html?flags=' + FLAGS);
  await context.waitFor(ready, 'the menu', 90_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    app.addPlayer('Story QA');
    app.profile = {...app.profile, credits: 5000,
      courses: {version: 1, unlocked: ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'kogane-pass']},
      heli: {version: 1, fuelKg: 0, lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    app._saveProfile(); })()`);
  await context.reload();
  await context.waitFor(ready, 'the menu after the profile', 90_000);
  await hidePanels();
  await app(`app.audio.setMuted?.(true)`);
  const start = await app(`({credits: app.profile.credits, props: app.storyProps(), owns: app.profile.unlockedCars.includes('${SKYLINE}'), step: app.koganeStepNow()})`);
  fact(start.props.available && start.step === 'invite', 'a fresh player who owns Kogane Pass starts at the letter');
  fact(!start.owns, 'the Skyline is not owned at the start');
  const credits0 = start.credits;

  // 1. The menu: the Story button and its red dot.
  await context.waitFor(`!document.querySelector('#story-visit')?.hidden`, 'the Story button', 20_000);
  const dot = await context.evaluate(`!document.querySelector('#story-visit .story-dot')?.hidden`);
  fact(dot, 'the Story button shows its red dot before the letter is read');
  await shot('01-menu-story-button', 'main menu, Story button with red dot');
  // The front door (one extra picture, before the letter is read): its Next up card carries the story.
  await context.navigate('/tools/menu-check.html?flags=' + FLAGS + ',menu-front-door');
  await context.waitFor(`${ready} && !!document.querySelector('#front-door')`, 'the front door', 90_000);
  await hidePanels();
  await app(`app.audio.setMuted?.(true)`);
  await wait(700);
  await shot('01b-front-door-letter', 'front door before the letter is read: Next up');
  await context.navigate('/tools/menu-check.html?flags=' + FLAGS);
  await context.waitFor(ready, 'the menu again', 90_000);
  await hidePanels();
  await app(`app.audio.setMuted?.(true)`);
  if (stop(2)) return finish();

  // 2. The Story card with Daichi's letter.
  await click('#story-visit');
  await context.waitFor(`!!document.querySelector('.story-card')`, 'the Story card', 10_000);
  await shot('02-story-letter', 'Story card, the letter, four parts');
  const read = await app(`({read: app.storyProps().read, step: app.koganeStepNow(), dot: !document.querySelector('#story-visit .story-dot')?.hidden})`);
  fact(read.read && read.step === 'lesson' && !read.dot, 'opening the card reads the letter: the step moves to the lesson and the dot goes');

  // 3. "Start the lesson" opens the instructor board; pick the Kogane row.
  await click('[data-story-step="lesson"]');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-course="kogane-pass"]')`, 'the Kogane row on the lesson board', 15_000);
  await click('.drive-lesson-board [data-drive-course="kogane-pass"]');
  await wait(300);
  await shot('03-lesson-board', 'instructor board, Kogane Pass chosen');

  // 4. Start the lesson: the opening card with Brian's note.
  await click('.drive-lesson-board [data-drive-action="start:corner"]');
  await context.waitFor(`!!document.querySelector('.drive-lesson-briefing') && window.__qaApp.visualReady`, 'the lesson opening card', 120_000);
  await wait(900);
  await shot('04-lesson-opening', 'Brian\'s Hairpin Lesson opening card');
  const note = await app(`app.storyCaption?.id ?? null`);
  fact(note === 'story.kogane.brian.intro', 'Brian\'s intro note shows as words on the opening card');
  if (stop(5)) return finish();

  // 5. Beat me, driven by the instructor's faster recorded run.
  await context.evaluate(bundle);
  await app(`app.stop()`); // the run is stepped by hand from its first tick
  await click('.drive-lesson-briefing [data-drive-action="step:beat"]');
  await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.stage === 'beat' && window.__qaApp.duel.drivingLesson.lesson.phase === 'driving'`, 'Beat me running', 15_000);
  await context.evaluate(`(async () => { const a = window.__qaApp, r = a.duel.drivingLesson, s = a.duel.state;
    window.__proof = await window.__storyQa.buildLessonDemonstration({lessonId: 'corner', courseId: r.plan.courseId, car: s.car, difficulty: s.difficulty, pace: r.plan.instructor.pace}, 'fast');
    window.__proofAt = 0;
    window.__beatDrive = stopS => { const d = a.duel;
      for (; window.__proofAt < window.__proof.instructor.inputs.length && r.lesson.phase === 'driving' && d.state.s < stopS; window.__proofAt++) {
        d.setInput(window.__proof.instructor.inputs[window.__proofAt]); d.step(1 / 120); }
      a._driveLessonUi?.update(); a.onFrame?.(d.state, 0); window.__render?.renderFrame?.();
      return {phase: r.lesson.phase, s: d.state.s}; }; })()`);
  const half = await context.evaluate(`window.__beatDrive(window.__qaApp.duel.drivingLesson.plan.corner.startS + 520)`);
  await shot('05-lesson-beat-run', 'Beat me, part way round the hairpins at dusk');
  const done = await context.evaluate(`window.__beatDrive(Infinity)`);
  if (done.phase !== 'result') throw Error('Beat me did not reach its result: ' + JSON.stringify({...done, state: await context.evaluate(`[window.__proofAt, window.__proof.instructor.inputs.length, window.__qaApp.duel.drivingLesson.plan.corner.finishS, window.__qaApp.duel.state.status, window.__qaApp.duel.drivingLesson.lesson.attempt?.elapsedSeconds]`)}));
  report.beatDrive = {...done, inputs: await context.evaluate(`[window.__proofAt, window.__proof.instructor.inputs.length, window.__qaApp.duel.drivingLesson.plan.corner.finishS, window.__qaApp.duel.drivingLesson.lesson.lastAttempt ?? null]`)};
  await context.waitFor(`!!document.querySelector('.drive-lesson-result')`, 'the lesson result', 20_000);
  await context.waitFor(`window.__qaApp.storyCaption?.id === 'story.kogane.brian.pass'`, 'Brian\'s pass caption', 12_000).catch(() => report.notes.push('Brian\'s pass caption did not show within 12 s'));
  await shot('06-lesson-passed', 'Beat me result, Brian\'s caption pointing on to the helipad');
  const passed = await app(`({step: app.koganeStepNow(), credits: app.profile.credits, rewarded: app.profile.drivingLessons?.rewarded?.corner === true, k: app.profile.story?.kogane, run: app.duel.drivingLesson?.lesson.done})`);
  fact(passed.run === true && passed.step === 'supplies' && passed.k?.lesson === true, 'Beat me passed: the story moves to the supplies step');
  fact(passed.rewarded === true, 'the lesson\'s own reward is paid');
  report.lessonCredits = passed.credits - credits0;
  if (stop(7)) return finish();

  // 6. Leave the lesson, open the Story card again, "Go to the helipad".
  await click('.drive-lesson-result [data-drive-action="leave"]');
  await context.waitFor(`window.__qaApp.duel.state.status === 'menu' && !window.__qaApp.duel.drivingLesson`, 'back to the menu', 20_000);
  await app(`app.start()`);
  await hidePanels();
  await wait(500);
  await click('#story-visit');
  await context.waitFor(`!!document.querySelector('.story-card')`, 'the Story card again', 10_000);
  await shot('07-story-supplies', 'Story card after the lesson: supplies part open');
  await click('[data-story-step="supplies"]');
  await context.waitFor(`window.__qaApp.duel.state.status === 'heli' && window.__qaApp.visualReady`, 'the helipad', 120_000);
  await app(`app.audio.setMuted?.(true)`);
  await hidePanels();

  // 7. The helipad board with the story job; the free first tank; take the job.
  const pump = await context.evaluate(`!!document.querySelector('[data-heli-fuel="fill"]')`);
  if (pump) { await click('[data-heli-fuel="fill"]'); await wait(400); }
  else report.notes.push('no fuel pump button on the pad; used the app call');
  const fuel = await app(`app.heliView().heli.fuelKg`);
  if (!(fuel > 100)) await app(`app.heliBuyFuel()`);
  await context.waitFor(`!!document.querySelector('[data-heli-board="take:story-kogane-supplies"]')`, 'the story job on the board', 20_000);
  await context.evaluate(`document.querySelector('[data-heli-board="take:story-kogane-supplies"]').scrollIntoView({block: 'center'})`);
  await shot('08-helipad-board', 'helipad with the board: the story job');
  const boardText = await context.evaluate(`document.querySelector('[data-heli-board="take:story-kogane-supplies"]').closest('li, article, div')?.innerText ?? ''`);
  report.boardRow = boardText.replace(/\s+/g, ' ');
  await click('[data-heli-board="take:story-kogane-supplies"]');
  await wait(600);
  const taken = await app(`({job: app.profile.heli?.jobs?.taken, cap: app.storyCaption?.id ?? null})`);
  fact(taken.job === 'story-kogane-supplies', 'the story job is taken');
  await shot('09-job-taken', 'job taken: Roger\'s offer words, crate by the pad');

  // 8. Hook, carry, set down at Kogane.
  const creditsBefore = await app(`app.profile.credits`);
  await app(`app.stop()`);
  await context.evaluate(pilotSource);
  await context.evaluate(`window.__story.toCrateAndHook()`);
  await app(`app.start()`);
  await wait(900);
  await shot('10-carrying', 'crate on the hook, climbing from the home pad');
  await app(`app.stop()`);
  const where = await context.evaluate(`window.__story.cruise()`);
  fact(where === 'kogane-pass', 'the cruise ends at Kogane Pass (got ' + where + ')');
  const dropped = await context.evaluate(`window.__story.setDown()`);
  fact(dropped === 'released', 'the crate is set down gently inside the circle');
  await app(`app.start()`);
  await context.waitFor(`window.__qaApp.visualReady && window.__qaApp.heliView().courseId === 'kogane-pass'`, 'the Kogane scene', 120_000);
  await wait(2500);
  report.kogane = await context.evaluate(`(() => { const r = window.__render, a = window.__qaApp; return {loadingHidden: document.querySelector('#renderer-loading')?.hidden, fog: r?.scene?.fog ? {near: r.scene.fog.near, far: r.scene.fog.far, color: r.scene.fog.color?.getHexString?.()} : null, bg: r?.scene?.background?.getHexString?.() ?? null, tone: r?.renderer?.toneMappingExposure ?? null, status: a.duel.state.status, visualReady: a.visualReady}; })()`);
  await shot('11-delivered-tea-house', 'crate down at Kogane: pay and the tea house fills the tank');
  const log = await app(`app.heliLog.map(e => e.type)`);
  fact(log.includes('jobDone'), 'the delivery finished (jobDone)');
  fact(log.includes('teaHouseFuel'), 'the tea house filled the tank (event)');
  const delivered = await app(`({credits: app.profile.credits, step: app.koganeStepNow(), found: app.profile.heli.map?.found ?? [], cap: app.storyCaption?.id ?? null})`);
  fact(delivered.credits - creditsBefore === 2650, 'the delivery paid 2,650 credits (got ' + (delivered.credits - creditsBefore) + ')');
  fact(delivered.step === 'duel', 'the story moves to the duel');
  fact(delivered.found.includes('kogane-pass-night'), 'the Night version is found');
  await context.waitFor(`window.__qaApp.storyCaption?.id === 'story.kogane.daichi.thanks'`, 'Daichi\'s thanks', 8_000).catch(() => report.notes.push('Daichi\'s thanks did not show within 8 s'));
  await shot('12-daichi-thanks', 'Daichi thanks the pilot (caption)');

  // 9. The Night version found: the pilot's map.
  const mapOpened = await context.evaluate(`(() => { const b = document.querySelector('[data-heli-map="open"]'); if (b) { b.click(); return true; } return false; })()`);
  if (!mapOpened) await app(`app.setHeliMap(true)`);
  await wait(700);
  await shot('13-night-found-map', 'the pilot\'s map after the delivery: the Night version of Kogane Pass');
  await app(`app.setHeliMap(false)`);
  if (stop(14)) return finish();

  // 10. Back to the menu: the duel part. Race Daichi on Easy.
  await app(`app.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status === 'menu' && !!document.querySelector('#story-visit') && ${ready}`, 'the menu after the flight', 120_000);
  await hidePanels();
  await app(`app.audio.setMuted?.(true)`);
  await wait(400);
  await app(`app.setRaceSettings({cpuDifficulty: 'easy'})`);
  // F2: choosing the Night circuit by hand in the box must not turn the challenge into Grand Prix; then the player goes back to the old circuit.
  const oldStage = await app(`app.getRaceChoices().startStage`);
  const pickCircuit = index => context.evaluate(`(() => { const sel = document.querySelector('#scene-select'); sel.value = String(${index}); sel.dispatchEvent(new Event('change', {bubbles: true})); })()`);
  const nightStage = await app(`[...document.querySelectorAll('#scene-select option')].findIndex(o => /Kogane Pass Night/.test(o.textContent))`);
  await pickCircuit(nightStage);
  await wait(500);
  report.pickedNight = await app(`({mode: app.getRaceChoices().mode, pressed: [...document.querySelectorAll('[data-mode][aria-pressed="true"]')].map(b => b.dataset.mode)})`);
  fact(report.pickedNight.mode === 'duel' && report.pickedNight.pressed.join() === 'duel', 'choosing Kogane Pass Night in the circuit box keeps Rival Duel (got ' + report.pickedNight.pressed + ')');
  await pickCircuit(oldStage);
  await wait(400);
  await click('#story-visit');
  await context.waitFor(`!!document.querySelector('.story-card')`, 'the Story card, duel part', 10_000);
  await shot('14-story-duel', 'Story card: supplies done, Race Daichi open');
  await click('[data-story-step="duel"]');
  await wait(900);
  const setup = await app(`({c: app.getRaceChoices(), pending: !!app._storyPending, shown: document.querySelector('#scene-select')?.selectedOptions[0]?.textContent,
    modes: [...document.querySelectorAll('[data-mode][aria-pressed="true"]')].map(b => b.dataset.mode), level: [...document.querySelectorAll('[data-cpu-difficulty][aria-pressed="true"]')].map(b => b.dataset.cpuDifficulty)})`);
  report.raceDaichiMenu = setup;
  fact(setup.pending && setup.c.mode === 'duel' && setup.c.cpuDifficulty === 'easy', '"Race Daichi" fills the setup in the app: Rival Duel, Easy');
  // F1 and F2: the menu itself shows Kogane Pass Night, Rival Duel and Easy, and the story mark is still on, so START is the story's race.
  fact(setup.shown === 'Kogane Pass Night' && setup.modes.join() === 'duel' && setup.level.join() === 'easy',
    'after "Race Daichi" the menu shows Kogane Pass Night, Rival Duel and Easy (got ' + setup.shown + ', ' + setup.modes + ', ' + setup.level + ')');
  await shot('15-race-setup-shown', 'menu right after Race Daichi: Kogane Pass Night, Rival Duel, Easy');
  // 11. START (the real button), the grid, the road at night.
  await click('#start-engine');
  await context.waitFor(`window.__qaApp.duel.state.status !== 'menu'`, 'the race starting', 60_000);
  await context.waitFor(`window.__qaApp.visualReady`, 'the Night scene', 90_000).catch(async () => {
    report.notes.push('the Night scene was not ready after 90 s: ' + JSON.stringify(await context.evaluate(`({ready: window.__qaApp.visualReady, loading: document.querySelector('#renderer-loading')?.hidden, status: window.__qaApp.duel.state.status, running: window.__qaApp.running})`)));
  });
  await wait(900);
  const grid = await app(`({course: app.duel.course.def.id, rival: app.duel.state.rivalSettings?.car, cap: app.storyCaption?.id ?? null, status: app.duel.state.status, story: !!app._storyRace, n: app.duel.state.opponents.length})`);
  fact(grid.course === 'kogane-pass-night' && grid.rival === SKYLINE && grid.story && grid.n === 1, 'the race is the story\'s: Night road, Daichi\'s Skyline, one rival');
  await shot('16-night-grid', 'the grid on the Night road (' + grid.status + ', caption ' + grid.cap + ')');

  // The test driver takes the player down the road. Stepped on the game's own fixed clock.
  await context.evaluate(`(() => { const a = window.__qaApp; a.stop(); a.autopilot = true; a._scriptedCrashDone = true; window.__storyQa.useRacingLine(a, .96);
    window.__raceDrive = (seconds, until) => { let n = 0; const d = a.duel;
      while (n++ < seconds * 60 && !['stage_result', 'gameover', 'complete'].includes(d.state.status) && !(until && until(d.state))) a.advance(1 / 60, 1 / 60);
      a.onFrame?.(d.state, 0); window.__render?.renderFrame?.(); return {status: d.state.status, s: d.state.s, t: d.state.stageTimeSec}; }; })()`);
  report.driveCourse = await context.evaluate(`(() => { const d = window.__qaApp.duel; return {id: d.course.def.id, line: !!d.course.racingLine, status: d.state.status, script: !!d.course.script, keys: Object.keys(d.course).slice(0, 30)}; })()`);
  await context.evaluate(`window.__raceDrive(40)`).catch(error => { throw Error(error.message.slice(0, 200) + ' | ' + JSON.stringify(report.driveCourse)); });
  await context.evaluate(`window.__raceDrive(400, st => st.s > 900)`);
  await shot('17-night-road-early', 'the Night road under the test driver, early hairpins');
  await context.evaluate(`window.__raceDrive(400, st => st.s > 2300)`);
  await shot('18-night-road-late', 'the Night road, Tea House hairpin region');
  const end = await context.evaluate(`window.__raceDrive(900)`);
  fact(end.status === 'stage_result', 'the race ends at the result screen (status ' + end.status + ')');
  await context.waitFor(`!!document.querySelector('.result-panel')`, 'the results', 15_000);
  const result = await app(`({won: app.duel.state.results?.won, story: app.duel.state.results?.story, car: app.duel.state.results?.storyCar,
    owns: app.profile.unlockedCars.filter(id => id === '${SKYLINE}').length, step: app.koganeStepNow(), duel: app.profile.story?.kogane?.duel,
    card: document.querySelector('.story-car-card')?.innerText ?? null, line: document.querySelector('.story-line')?.innerText ?? null})`);
  report.result = result;
  fact(result.won === true, 'the test driver beat Daichi on Easy');
  fact(result.owns === 1 && result.car === SKYLINE, 'the Skyline is owned once and the result carries it');
  fact(result.step === 'ana' && result.duel === 'easy', 'the story moves to Ana (duel marked easy)');
  fact(!!result.card && /NEW CAR/.test(result.card), 'the results show the NEW CAR card');
  await shot('19-results-new-car', 'results: NEW CAR card and Daichi\'s line');

  // 12. Back to the menu: Ana's call. Then the garage and the plaque.
  await app(`app.start()`);
  await click('.result-panel [data-action="menu"]');
  await context.waitFor(`window.__qaApp.duel.state.status === 'menu' && ${ready}`, 'the menu after the win', 60_000);
  await hidePanels();
  await app(`app.audio.setMuted?.(true)`);
  await context.waitFor(`window.__qaApp.storyCaption?.id?.startsWith('story.kogane.ana')`, 'Ana\'s call', 10_000).catch(() => report.notes.push('Ana\'s caption did not show within 10 s'));
  await shot('20-menu-ana-call', 'main menu with Ana\'s call');
  const ana = await app(`({step: app.koganeStepNow(), cap: app.storyCaption?.id ?? null, lead: app.storyProps().lead})`);
  fact(ana.step === 'done' && ana.lead.startsWith('LEAD'), 'Ana called once: the story is done and the lead is logged');
  await app(`app.menuCar = '${SKYLINE}'`);
  await click('#garage-open');
  await context.waitFor(`!!document.querySelector('.garage-panel, .garage-screen, [data-garage-car]')`, 'the garage', 15_000);
  const carButton = await context.evaluate(`!!document.querySelector('[data-garage-car="${SKYLINE}"]')`);
  if (carButton) await click(`[data-garage-car="${SKYLINE}"]`);
  await wait(600);
  await shot('21-garage-skyline-plaque', 'garage: the Skyline and its plaque');
  const plaque = await context.evaluate(`document.querySelector('.story-plaque')?.innerText ?? null`);
  fact(!!plaque && /Daichi Mori/.test(plaque), 'the garage shows the Skyline plaque');

  return finish();

  async function finish() {
    await writeFile(join(context.outputDir, 'story-kogane.json'), JSON.stringify(report, null, 2) + '\n');
    if (fail.length) throw Error('Story facts failed: ' + fail.join(' | '));
  }
}
