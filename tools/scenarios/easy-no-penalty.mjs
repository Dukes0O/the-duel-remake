// Memory-only visual check for the Easy Duel results screen.
const ready = `(() => !!window.__qaApp && !!window.__render &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value)()`;
const showLoss = `(() => {
  const app = window.__qaApp;
  if (!app.startCampaign({mode: 'duel', cpuDifficulty: 'easy', startStage: 0, seed: 1989}))
    throw Error('Could not start the Easy Duel');
  app.stop();
  const state = app.duel.state;
  Object.assign(state, {status: 'gameover', stageTimeSec: 180,
    results: {won: false, completed: false, creditReward: 0, creditCharge: 0,
      creditBreakdown: {base: 0}}});
  app.onFrame?.(state, 0);
  window.__render.renderFrame();
  const panel = document.querySelector('#modal-layer .result-panel');
  if (!panel || document.querySelector('#modal-layer').hidden)
    throw Error('Results are not visible');
  const words = panel.textContent || '';
  if (/loss charge|loss costs/i.test(words) || !/saved credits are safe/i.test(words))
    throw Error('Easy results do not show the free loss');
  return words;
})()`;

// Each expression sent to the page is checked before Claude runs the browser.
for (const expression of [ready, showLoss]) new Function(`return ${expression};`);

export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(ready, 'memory-only menu', 60_000);
  await context.evaluate(showLoss);
  await context.screenshot('easy-no-penalty-results');
}
