// HELI-PAY-CONTINUE: a flight to another course continues there. A pilot who last raced elsewhere
// lands at Summit Run, presses Shut down, and the race setup shows Summit Run (not the last circuit).
// Race here starts the race on Summit Run. Also the dispatch board's pay words and the credits in the
// helicopter's status row. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario heli-continue
const entry = '/tools/menu-check.html?flags=helicopter,forest-fire,rescue,summit-run,tremblant-woods,tremblant-snow';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function menu(context) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    // A pilot who has done the lessons, owns Summit Run, and last raced on Pacific Canyon (test fixture, memory only).
    app.profile = {...app.profile, credits: 5000,
      courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'tremblant-snow', 'summit-run'])]},
      heli: {version: 1, fuelKg: 300, refuels: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    if (!app._saveProfile()) throw Error('fixture not saved');
    app.audio.setMuted?.(true);
    app.setRaceSettings({eventId: 'pacific-canyon'});
    document.querySelectorAll('details').forEach(node => { node.open = false; });
  })()`);
  await context.waitFor(`!document.querySelector('#start-engine')?.disabled`, 'ready', 60_000);
}

const sceneName = `(() => { const s = document.querySelector('#scene-select'); return s.options[s.selectedIndex].textContent; })()`;

async function landAtSummit(context) {
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad', 120_000);
  await context.evaluate(`window.__qaApp.heliSession.start('summit-run')`);
  await context.waitFor(`window.__qaApp.heliView()?.courseId==='summit-run' && window.__qaApp.visualReady && !!document.querySelector('[data-heli-arrival="shutdown"]')`, 'landed at Summit Run', 120_000);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await menu(context);
  const before = await context.evaluate(sceneName);
  if (/summit/i.test(before)) throw Error(`The fixture should start on another circuit, not ${before}`);

  // The home pad: the board says what each job pays, and the status row shows the credits.
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'home helipad', 120_000);
  await context.waitFor(`[...document.querySelectorAll('.heli-board-pay')].some(node => node.textContent.includes('Pays'))`, 'board pay words', 30_000);
  const board = await context.evaluate(`[...document.querySelectorAll('.heli-board-pay')].map(node => node.textContent)`);
  if (!board.some(text => /^Pays [\d,]+ credits, \+[\d,]+ for a clean delivery/.test(text))) throw Error(`The board does not say the pay: ${JSON.stringify(board)}`);
  const hud = await context.evaluate(`document.querySelector('.heli-credits')?.textContent || ''`);
  if (!/CREDITS\s*5,000/.test(hud)) throw Error(`The helicopter status row should show the credits, got "${hud}"`);
  // Close the rank card and bring the board into view for the picture.
  await context.evaluate(`(() => { document.querySelector('[data-logbook-dismiss]')?.click(); const side = document.querySelector('.heli-side'); document.querySelector('.heli-board')?.scrollIntoView({block: 'center'}); if (side) side.scrollTop = side.scrollHeight; })()`);
  await pause(600);
  await context.screenshot('heli-job-panel-pay');
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await menu(context);

  // Land at Summit Run and shut down: the race setup is Summit Run.
  await landAtSummit(context);
  await context.screenshot('heli-landed-summit');
  await context.evaluate(`document.querySelector('[data-heli-arrival="shutdown"]').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu' && !document.querySelector('#menu-screen').hidden`, 'menu after shut down', 30_000);
  await pause(500);
  const after = await context.evaluate(sceneName);
  const app = await context.evaluate(`({stage: window.__qaApp.getRaceChoices().startStage, menuStage: window.__qaApp.menuStage})`);
  if (!/summit/i.test(after)) throw Error(`Shut down should open the Summit Run setup, the menu shows "${after}"`);
  await context.screenshot('heli-race-setup-summit-run');
  // The menu's own click on Start would race on what it shows: Summit Run.
  const started = await context.evaluate(`window.__qaApp.getRaceChoices().startStage === window.__qaApp.menuStage`);
  if (!started || app.stage !== app.menuStage) throw Error(`The menu and the app disagree: ${JSON.stringify(app)}`);

  // Race here starts the race on Summit Run.
  await menu(context);
  await landAtSummit(context);
  await context.evaluate(`document.querySelector('[data-heli-arrival="race"]').click()`);
  await context.waitFor(`['countdown','racing'].includes(window.__qaApp.duel.state.status) && window.__qaApp.duel.course.def.id==='summit-run'`, 'the race at Summit Run', 120_000);
  await context.evaluate(`window.__qaApp.returnToMenu()`);
}
