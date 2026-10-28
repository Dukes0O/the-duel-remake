// Actual garage shelf, private browser with memory-only saves.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=lab');
  await context.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90000);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.audio.setMuted?.(true);
    app.profile = {...app.profile, deep: {version: 1, raised: ['sirena-car']},
      unlockedCars: [...new Set([...app.profile.unlockedCars, 'falcone_sirena'])],
      cosmetics: {...app.profile.cosmetics, falcone_sirena: {owned: ['factory','sea-wreck'], selected: 'sea-wreck'}},
      achievements: [{id: 'wreck-racer', at: Date.UTC(2026,9,25)}]};
    app._saveProfile();
    for (const details of document.querySelectorAll('details')) details.open = false;
    document.querySelector('#garage-open').click();
  })()`);
  await context.waitFor(`document.querySelectorAll('[data-achievement]').length === 6`, 'six achievements', 20000);
  await context.evaluate(`document.querySelector('[aria-label="Achievements"]').scrollIntoView({block:'center'})`);
  const text = await context.evaluate(`document.querySelector('[aria-label="Achievements"]').textContent`);
  if (!text.includes('2026-10-25') || !text.includes('Let the coast see her as she is.') || text.includes('Date not recorded'))
    throw Error('Shelf must show dated, derived and hinted achievements.');
  const tiles = await context.evaluate(`(() => {
    const shelf = document.querySelector('.achievement-tiles');
    return {columns: getComputedStyle(shelf).gridTemplateColumns.split(' ').length,
      earned: shelf.querySelectorAll('.earned .achievement-medallion').length,
      hints: shelf.querySelectorAll('li:not(.earned) em').length};
  })()`);
  if (tiles.columns !== 3 || tiles.earned !== 3 || tiles.hints !== 3)
    throw Error('Shelf must show three columns, three earned medallions and three italic hints.');
  await context.screenshot('shelf-earned-and-hinted');
  await context.command('Emulation.setDeviceMetricsOverride', {width: 800, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.evaluate(`document.querySelector('[aria-label="Achievements"]').scrollIntoView({block:'center'})`);
  if (await context.evaluate(`getComputedStyle(document.querySelector('.achievement-tiles')).gridTemplateColumns.split(' ').length`) !== 2)
    throw Error('Narrow garage must use two columns.');
  await context.screenshot('shelf-two-columns');
  // Reopen on the live switches, with no flags in the address. The Lab went live on
  // 25 October 2026 (LAB-LIVE), so the live shelf shows all six, the same as the Lab leg
  // above. The shelf with the Lab off (Raised alone) is held by tools/test-deep-achievements.mjs.
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'live flags ready', 90000);
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`document.querySelectorAll('[data-achievement]').length === 6`, 'live shelf has all six achievements', 20000);
  const live = await context.evaluate(`[...document.querySelectorAll('[data-achievement]')].map(node => node.dataset.achievement)`);
  if (live.join(',') !== 'raised-from-the-deep,she-runs-again,wreck-racer,coast-cup-as-found,restored,coast-cup-restored')
    throw Error('Live shelf must list the six achievements in order, got ' + live.join(','));
  await context.evaluate(`document.querySelector('[aria-label="Achievements"]').scrollIntoView({block:'center'})`);
  await context.screenshot('shelf-live-flags');
}
