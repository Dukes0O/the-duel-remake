// Private browser check for the Tune page and the tuned-lap line (LAB-TUNE-VIEW, docs/LAB.md section 5): take and pass the
// Downforce lesson, open the car's Tune page in the garage, set the wing, drive a stock Time Trial lap and a tuned one,
// and read the result line. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario lab-tune-view
import {tunnelDriver} from './lab-lessons-tunnel.mjs';

const entry = '/tools/menu-check.html?flags=helicopter,lab,lab-tuning';
const COURSE_ID = 'tremblant-woods';

async function race(context) {
  // The Time Trial is started like the menu does it; the autopilot drives and nothing in the state is assigned by hand.
  await context.evaluate(`(() => { const app = window.__qaApp;
    const index = [...document.querySelector('#scene-select').options].map(option => Number(option.value)).find(i => app.getMenuCourse(i)?.def.id === ${JSON.stringify(COURSE_ID)});
    if (!Number.isInteger(index)) throw Error('The course is not offered.');
    if (!app.startCampaign({startStage: index, seed: 17, mode: 'timetrial', car: app.profile.unlockedCars[0], difficulty: 'casual', cpuDifficulty: 'medium'}))
      throw Error('The Time Trial did not start.');
    app.autopilot = true; })()`);
  let progress;
  for (let step = 0; step < 400; step++) {
    progress = await context.evaluate(`(() => { const app = window.__qaApp;
      if (app.visualReady && ['countdown', 'racing', 'ticket'].includes(app.duel.state.status)) app.advance(1);
      const state = app.duel.state; return {status: state.status, time: state.stageTimeSec, ready: app.visualReady}; })()`);
    if (['stage_result', 'complete', 'gameover'].includes(progress.status)) break;
    if (!progress.ready) await context.waitFor('window.__qaApp.visualReady', 'race graphics ready', 60_000);
  }
  if (progress.status !== 'stage_result') throw Error(`The lap should finish: ${JSON.stringify(progress)}`);
  await context.waitFor(`!!document.querySelector('.result-panel')`, 'the result card', 20_000);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90_000);
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.audio.setMuted?.(true);
    app.profile = {...app.profile, credits: 60000, drivingLessons: {version: 1, done: {corner: true}, best: {corner: .4}, rewarded: {corner: true}}};
    app._saveProfile();
    if (!app.purchaseCourse(${JSON.stringify(COURSE_ID)}).ok && !app.profile.unlockedCourses?.includes?.(${JSON.stringify(COURSE_ID)})) { /* already open */ } })()`);

  // The page's own QA panels sit over the pictures: hide them (they are the harness's, not the game's).
  await context.evaluate(`document.querySelectorAll('details').forEach(el => { if (getComputedStyle(el).position === 'fixed') el.style.display = 'none'; })`);

  // Before: a garage with the Lab on shows the Tune page with every setting shut.
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`!!document.querySelector('.tune-panel')`, 'the Tune page in the garage', 20_000);
  await context.evaluate(`document.querySelector('.tune-panel summary').click()`);
  const shut = await context.evaluate(`[...document.querySelectorAll('.tune-row')].map(row => [row.dataset.tuneRow, row.classList.contains('shut'), row.querySelector('.tune-note')?.textContent ?? ''])`);
  if (shut.length !== 5 || !shut.every(([, closed]) => closed)) throw Error(`All five settings should be shut: ${JSON.stringify(shut)}`);
  if (!shut[1][2].includes('Downforce')) throw Error(`The wing should say which lesson opens it: ${shut[1][2]}`);
  await context.evaluate(`document.querySelector('.tune-panel').scrollIntoView({block: 'center'})`);
  await context.screenshot('tune-shut');

  // The Downforce lesson: the real five-step lesson at the wind tunnel machine in the walking Lab, then its challenge.
  // The lesson alone awards nothing (the driver checks it); the pass is saved only when the bench goal is met.
  await context.evaluate(`document.querySelector('.lab-tab').click()`);
  await context.waitFor(`window.__qaApp.labOpen === true && !document.querySelector('.lab-panel').hidden`, 'the Lab opens', 30_000);
  const tunnel = tunnelDriver(context);
  await tunnel.walkToTunnel();
  await tunnel.play('downforce');
  await context.waitFor(`window.__qaApp.profile.lab?.done?.downforce === true`, 'Downforce passes and is saved', 10_000);
  // Finishing the lesson goes back to the board, which keeps the pass message pointing at the Tune page.
  await context.waitFor(`[...document.querySelectorAll('.lab-message')].some(el => el.textContent.includes('Tune page'))`,
    'the pass points at the Tune page', 10_000);
  await context.screenshot('lab-downforce-passed');
  await context.evaluate(`document.querySelector('[data-lab="close"]').click()`);
  await context.waitFor(`window.__qaApp.labOpen === false`, 'back to the menu', 10_000);

  // The wing is open now, the others still shut. A step is saved, and the screen changes nothing in the race state.
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`!!document.querySelector('.tune-panel')`, 'the Tune page again', 20_000);
  await context.evaluate(`document.querySelector('.tune-panel summary').click()`);
  const before = await context.evaluate(`JSON.stringify(window.__qaApp.duel.state)`);
  await context.evaluate(`document.querySelector('[data-tune="wing:2"]').click()`);
  await context.waitFor(`window.__qaApp.profile.lab.tune[window.__qaApp.profile.unlockedCars[0]]?.wing === 2`, 'the wing step is saved', 10_000);
  const after = await context.evaluate(`JSON.stringify(window.__qaApp.duel.state)`);
  if (before !== after) throw Error('The Tune page changed the race state.');
  const rows = await context.evaluate(`[...document.querySelectorAll('.tune-row')].map(row => [row.dataset.tuneRow, row.classList.contains('shut'), row.querySelector('.tune-step.on')?.textContent ?? ''])`);
  if (JSON.stringify(rows.map(r => r[1])) !== JSON.stringify([true, false, true, true, true])) throw Error(`Only the wing should be open: ${JSON.stringify(rows)}`);
  if (rows[1][2] !== '+2') throw Error(`The wing should read +2: ${JSON.stringify(rows[1])}`);
  const open = await context.evaluate(`document.querySelector('.tune-panel').open`);
  if (!open) throw Error('The Tune page should stay open after a step.');
  await context.evaluate(`document.querySelector('.tune-panel').scrollIntoView({block: 'center'})`);
  await context.screenshot('tune-wing-plus-2');
  // A shut setting refuses a forced click, and the saved tune stays as it was.
  await context.evaluate(`(() => { const b = document.querySelector('[data-tune="brakes:2"]'); b.disabled = false; b.click(); })()`);
  const refused = await context.evaluate(`document.querySelector('.tune-message').textContent`);
  if (!/Pass the wind-tunnel lesson first/.test(refused)) throw Error(`A shut setting should say why: ${refused}`);
  if (await context.evaluate(`window.__qaApp.profile.lab.tune[window.__qaApp.profile.unlockedCars[0]].brakes`) !== 0) throw Error('A shut setting was saved.');
  // Reset puts the wing back.
  await context.evaluate(`document.querySelector('[data-tune-reset]').click()`);
  await context.waitFor(`window.__qaApp.profile.lab.tune[window.__qaApp.profile.unlockedCars[0]].wing === 0`, 'Reset sets every step to 0', 10_000);
  await context.evaluate(`document.querySelector('[data-tune="wing:2"]').click()`);
  await context.waitFor(`window.__qaApp.profile.lab.tune[window.__qaApp.profile.unlockedCars[0]].wing === 2`, 'the wing is set again', 10_000);
  await context.evaluate(`document.querySelector('[data-action="garage-close"]').click()`);

  // A stock lap first: set the wing to 0 for it, then the tuned lap with the wing at +2.
  await context.evaluate(`(() => { const app = window.__qaApp, car = app.profile.unlockedCars[0];
    app.profile = {...app.profile, lab: {...app.profile.lab, tune: {...app.profile.lab.tune, [car]: {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0}}}}; app._saveProfile(); })()`);
  await race(context);
  const stock = await context.evaluate(`[...document.querySelectorAll('.tuned-lap')].map(p => p.textContent)`);
  if (stock.length !== 1 || !/^Stock lap: /.test(stock[0])) throw Error(`A stock run should name its stock lap: ${JSON.stringify(stock)}`);
  const kept = await context.evaluate(`Object.entries(window.__qaApp.profile.lab.stockLaps)`);
  if (kept.length !== 1) throw Error(`The stock lap should be kept: ${JSON.stringify(kept)}`);
  await context.screenshot('result-stock-lap');
  await context.evaluate(`(() => { const app = window.__qaApp; app.returnToMenu(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status === 'menu'`, 'back to the menu', 20_000);

  await context.evaluate(`(() => { const app = window.__qaApp, car = app.profile.unlockedCars[0];
    app.profile = {...app.profile, lab: {...app.profile.lab, tune: {...app.profile.lab.tune, [car]: {pressure: 0, wing: 2, brakes: 0, springs: 0, fuel: 0}}}}; app._saveProfile(); })()`);
  await race(context);
  const tuned = await context.evaluate(`[...document.querySelectorAll('.tuned-lap')].map(p => p.textContent)`);
  if (tuned.length !== 2 || !/^Tuned lap: /.test(tuned[0]) || tuned[1] !== 'Tuned laps are not on the leaderboard.') throw Error(`The tuned lap needs its line and the leaderboard note: ${JSON.stringify(tuned)}`);
  const raced = await context.evaluate(`({tune: window.__qaApp.duel.state.tune, board: window.__qaApp.leaderboard.entries?.length ?? null})`);
  if (raced.tune?.wing !== 2) throw Error(`The race should carry the wing: ${JSON.stringify(raced)}`);
  await context.screenshot('result-tuned-lap');
  // The line, in the words the card names, when the lap paid.
  const paid = await context.evaluate(`window.__qaApp.profile.lab.tunedBonus.length`);
  console.log(`tuned line: ${tuned[0]} (bonus paid courses: ${paid})`);

  // The bonus: a stock lap a little under 2% slower than the tuned lap just driven makes the same drive worth 400, once.
  const lap = await context.evaluate(`Math.min(...window.__qaApp.duel.state.lapTimes)`);
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status === 'menu'`, 'back to the menu', 20_000);
  await context.evaluate(`(() => { const app = window.__qaApp, car = app.profile.unlockedCars[0], key = car + '|' + ${JSON.stringify(COURSE_ID)};
    app.profile = {...app.profile, lab: {...app.profile.lab, stockLaps: {...app.profile.lab.stockLaps, [key]: ${lap} * 1.016}}}; app._saveProfile(); })()`);
  const credits = await context.evaluate(`window.__qaApp.profile.credits`);
  await race(context);
  const paidLine = await context.evaluate(`[...document.querySelectorAll('.tuned-lap')].map(p => p.textContent)`);
  if (!/^Tuned lap: 1\.[56]% faster than your stock lap\. Bonus 400\.$/.test(paidLine[0] ?? '')) throw Error(`The paid line is wrong: ${JSON.stringify(paidLine)}`);
  if (await context.evaluate(`window.__qaApp.profile.lab.tunedBonus.length`) !== 1) throw Error('The bonus should be recorded for the course.');
  const gained = await context.evaluate(`window.__qaApp.profile.credits`) - credits;
  console.log(`bonus line: ${paidLine[0]} (credits ${credits} -> +${gained} with the race pay)`);
  await context.screenshot('result-tuned-bonus');
  // Once per course: the same lap again pays nothing and says so.
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status === 'menu'`, 'back to the menu', 20_000);
  await context.evaluate(`(() => { const app = window.__qaApp, car = app.profile.unlockedCars[0], key = car + '|' + ${JSON.stringify(COURSE_ID)};
    app.profile = {...app.profile, lab: {...app.profile.lab, stockLaps: {...app.profile.lab.stockLaps, [key]: ${lap} * 1.016}}}; app._saveProfile(); })()`);
  await race(context);
  const again = await context.evaluate(`[...document.querySelectorAll('.tuned-lap')].map(p => p.textContent)`);
  if (!/already paid/.test(again[0] ?? '')) throw Error(`The second lap should say the bonus is paid: ${JSON.stringify(again)}`);
}
