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
  // Reopen on the live switches; Lab-only names must disappear.
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'live flags ready', 90000);
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`document.querySelectorAll('[data-achievement]').length === 1`, 'live shelf has only Raised', 20000);
  await context.evaluate(`document.querySelector('[aria-label="Achievements"]').scrollIntoView({block:'center'})`);
  await context.screenshot('shelf-live-flags');
}
