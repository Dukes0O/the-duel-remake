// Private browser check for restoring the Sirena (LAB-RESTORE, docs/LAB.md section 7): the Rust bench offers it for 2,500
// credits once the Sirena is raised and Rust is passed, the minute-long sequence plays in the Lab's room, the car is the
// player's from then on and the garage says to race the Coast Cup, and the replay can be skipped. Saves are memory-only.
//   node tools/browser-harness.mjs scenario lab-restore
const entry = '/tools/menu-check.html?flags=helicopter,lab,the-deep';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    app.profile = {...app.profile, credits: 6000, deep: {...(app.profile.deep ?? {}), version: 1, raised: ['sirena-car']},
      lab: {...(app.profile.lab ?? {}), version: 1, done: {rust: true}, owned: {}, ring: 0, ringBest: 0, cable: 15, tune: {}, stockLaps: {}, tunedBonus: [], secret: {}}};
    app._saveProfile(); })()`);
  // Before: the garage shows the Sirena under a sheet, "Needs the Lab", and the Lab tab leads there.
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`document.querySelector('[data-sirena="waiting"]')?.textContent.includes('Needs the Lab')`, 'the Sirena under a sheet in the garage', 20_000);
  await context.screenshot('restore-garage-before');
  await context.evaluate(`document.querySelector('.lab-tab').click()`);
  await context.waitFor(`!!document.querySelector('.lab-canvas')`, 'the Lab opens with its room', 30_000);
  await context.evaluate(`document.querySelector('[data-lab-lesson="start:rust"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="restore"]:not(:disabled)')`, 'the Restore button on the Rust bench', 10_000);
  const label = await context.evaluate(`document.querySelector('[data-lab="restore"]').textContent`);
  if (!label.includes('2,500')) throw Error(`The button should name the price: ${label}`);
  await context.screenshot('restore-offer');

  // The paid, first run: the car is the player's at once, and the sequence runs about a minute with no Skip.
  await context.evaluate(`document.querySelector('[data-lab="restore"]').click()`);
  const start = Date.now();
  await context.waitFor(`window.__qaApp.profile.unlockedCars.includes('falcone_sirena') && window.__qaApp.profile.credits === 3500`, 'the car joins the garage and 2,500 is taken, once', 10_000);
  await context.waitFor(`!!document.querySelector('.lab-restore-run') && !document.querySelector('[data-lab="restore-skip"]')`, 'the sequence runs with no Skip on the first watch', 10_000);
  await context.waitFor(`document.querySelector('.lab-caption-text')?.textContent.includes('Salt has been working')`, 'Brian’s first restore line as a caption', 10_000);
  const shots = [['restore-1-soak-start', 3], ['restore-2-soak', 14], ['restore-3-current', 29], ['restore-4-strip', 40], ['restore-5-rebuild', 49], ['restore-6-paint', 57.5]];
  let salt = [];
  for (const [name, at] of shots) {
    const wait = start + at * 1000 - Date.now();
    if (wait > 0) await pause(wait);
    salt.push(await context.evaluate(`parseInt(document.querySelector('#lab-restore-salt').textContent, 10)`));
    await context.screenshot(name);
  }
  if (!(salt[0] > salt[1] && salt[1] > salt[2])) throw Error(`The salt readout should fall: ${salt}`);
  await context.waitFor(`!!document.querySelector('[data-lab="restore-close"]')`, 'the sequence finishes', 30_000);
  const took = (Date.now() - start) / 1000;
  if (took < 55 || took > 75) throw Error(`The sequence should take about a minute, it took ${took.toFixed(0)} s`);
  await context.waitFor(`document.querySelector('.lab-caption-text')?.textContent.includes('Strip, rebuild, paint')`, 'Brian’s second restore line', 10_000);
  await context.screenshot('restore-7-done');
  const owned = await context.evaluate(`window.__qaApp.profile.unlockedCars.filter(car => car === 'falcone_sirena').length`);
  if (owned !== 1) throw Error('The Sirena should be in the garage exactly once.');

  // The garage says to race the Coast Cup, with no new state added.
  await context.evaluate(`document.querySelector('[data-lab="restore-close"]').click(); document.querySelector('[data-lab="close"]').click()`);
  await context.waitFor(`window.__qaApp.labOpen === false`, 'back to the menu', 10_000);
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`document.querySelector('[data-sirena="restored"]')?.textContent.includes('Race the Coast Cup at Pacific Canyon')`, 'the garage panel reads Restored', 20_000);
  await context.screenshot('restore-garage');

  // The replay is free and can be skipped; nothing more is charged.
  await context.evaluate(`document.querySelector('[data-action="garage-close"]').click(); window.__qaApp.openLab()`);
  await context.waitFor(`!!document.querySelector('[data-lab-lesson="start:rust"]')`, 'the board', 20_000);
  await context.evaluate(`document.querySelector('[data-lab-lesson="start:rust"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="restore-again"]') && !document.querySelector('[data-lab="restore"]')`, 'only the replay is offered now', 10_000);
  await context.evaluate(`document.querySelector('[data-lab="restore-again"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="restore-skip"]')`, 'the replay can be skipped', 10_000);
  await context.evaluate(`document.querySelector('[data-lab="restore-skip"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="restore-close"]')`, 'Skip jumps to the end', 10_000);
  const credits = await context.evaluate(`window.__qaApp.profile.credits`);
  if (credits !== 3500) throw Error(`Nothing more should be charged, credits are ${credits}`);
  console.log(`Lab restore: the Sirena restored once for 2,500, the sequence took ${took.toFixed(0)} s, salt ${salt.join('% > ')}%`);
}
