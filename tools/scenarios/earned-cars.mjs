// Private browser check for earned cars (EARN-SCREEN, docs/EARNED_CARS.md
// section 5): the medal sheet in the garage and the new-medal line on the
// results screen, at 1280 x 720. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario earned-cars
const entry = '/tools/menu-check.html?flags=earned-cars,grand-prix-career';
const NEW_MEDAL = 'NEW MEDAL · GOLD · FALCONE F42 · DUEL · HARD · +375 CR';

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`, 'memory-only menu ready', 90_000);
  // A player with a few medals already on the starter's sheet.
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    app.profile = {...app.profile, medals: {version: 1, cars: {falcone_f42: {duel: [3, 1, 0], grandprix: [1, 0, 0]}}}};
    app._saveProfile(); document.querySelector('[data-action="garage"]').click(); })()`);
  await context.waitFor(`!!document.querySelector('.garage-panel .medal-panel')`, 'garage medal sheet', 20_000);
  const garage = await context.evaluate(`(() => { const panel = document.querySelector('.garage-panel'), sheet = panel.querySelector('.medal-panel');
    sheet.scrollIntoView({block: 'center'}); const a = panel.getBoundingClientRect(), b = sheet.getBoundingClientRect();
    return {text: sheet.textContent, inside: b.left >= a.left - 1 && b.right <= a.right + 1, wide: sheet.scrollWidth <= sheet.clientWidth + 1}; })()`);
  if (!garage.text.includes('MEDAL SHEET') || !garage.text.includes('3 WINS') || !garage.text.includes('WIN ON HARD') ||
    !garage.text.includes('ALL CARS: 3 MEDALS')) throw Error(`The medal sheet is not as expected: ${garage.text}`);
  if (!garage.inside || !garage.wide) throw Error('The medal sheet spills outside the garage panel.');
  await new Promise(resolve => setTimeout(resolve, 400));
  await context.screenshot('earned-garage-sheet');
  await context.evaluate(`document.querySelector('[data-action="garage-close"]').click()`);
  // A Hard Rival Duel win fills the empty gold box.
  const result = await context.evaluate(`(() => { const app = window.__qaApp;
    if (!app.startCampaign({startStage: 0, mode: 'duel', car: 'falcone_f42', cpuDifficulty: 'hard', seed: 1989})) throw Error('The race did not start');
    app.stop(); const duel = app.duel, state = duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, stageTimeSec: 180, lapStartedAt: 180, racePenaltySec: 0, s: duel.raceLength,
      completedLaps: state.lapsTotal, lap: state.lapsTotal, currentLap: state.lapsTotal, lapTimes: Array(state.lapsTotal).fill(90), lateral: 0});
    state.opponents.forEach(opponent => Object.assign(opponent, {completedLaps: 0, s: 0}));
    if (!duel._finishStage()) throw Error('The race did not finish');
    app.onFrame?.(state);
    const panel = document.querySelector('#modal-layer .result-panel');
    return {text: panel?.textContent || '', lines: [...(panel?.querySelectorAll('.medal-earned') || [])].map(line => line.textContent),
      bonus: panel?.querySelector('.result-bonuses:not(.medal-earned)')?.textContent || '',
      saved: app.profile.medals.cars.falcone_f42.duel}; })()`);
  if (JSON.stringify(result.lines) !== JSON.stringify([NEW_MEDAL])) throw Error(`Results lines: ${JSON.stringify(result.lines)}`);
  if (/undefined/i.test(result.text)) throw Error('A results label reads "undefined".');
  if (JSON.stringify(result.saved) !== JSON.stringify([3, 1, 1])) throw Error(`Saved sheet: ${JSON.stringify(result.saved)}`);
  await new Promise(resolve => setTimeout(resolve, 400));
  await context.screenshot('earned-results-medal');
}
