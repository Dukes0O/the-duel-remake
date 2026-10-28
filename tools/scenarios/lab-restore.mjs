// Private browser check for restoring the Sirena (LAB-RESTORE, docs/LAB.md section 7): the Rust bench offers it for 1,000
// credits once the Sirena is raised and Rust is passed, the mechanical sequence plays in the Lab's room, the car is the
// player's from then on and the garage says to race the Coast Cup, and the replay can be skipped. Saves are memory-only.
//   node tools/browser-harness.mjs scenario lab-restore
const entry = '/tools/menu-check.html?flags=helicopter,lab,the-deep';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// The walking Lab (lab-2): the player walks to the Rust machine and presses E. This is the same walk the workshop lesson
// scenario uses; the keys are real key events, nothing is moved by script.
async function walkToRust(context) {
  const canvas = `document.querySelector('.lab-canvas')`, position = axis => context.evaluate(`JSON.parse(${canvas}.dataset.labWalkPosition)[${axis}]`);
  const key = (code, type) => context.command('Input.dispatchKeyEvent', {type, code, key: code.slice(3).toLowerCase()});
  async function walk(code, expression) {
    await key(code, 'keyDown');
    try { await context.waitFor(expression, code, 15_000); } finally { await key(code, 'keyUp'); }
    await pause(500);
  }
  await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'the walking Lab is ready', 60_000);
  await walk('KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < -4.3`);
  // Stop in the narrow aisle between the bending rig and the turning arm, in short steps.
  for (let n = 0; n < 50; n++) {
    const at = await position(2);
    if (Math.abs(at + 5.05) < .08) break;
    const code = at > -5.05 ? 'KeyW' : 'KeyS';
    await key(code, 'keyDown'); await pause(100); await key(code, 'keyUp'); await pause(250);
  }
  if (Math.abs(await position(2) + 5.05) >= .08) throw Error('Could not line up with the workshop aisle.');
  await walk('KeyD', `JSON.parse(${canvas}.dataset.labWalkPosition)[0] > 6.9`);
  await walk('KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < -5.5`);
  await context.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the')`, 'the machine prompt');
  await context.command('Input.dispatchKeyEvent', {type: 'keyDown', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69});
  await context.command('Input.dispatchKeyEvent', {type: 'keyUp', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69});
  // A single-lesson machine opens at once; a machine with a choice shows its button.
  await pause(400);
  if (await context.evaluate(`!!document.querySelector('[data-lab-lesson="start:rust"]')`)) await context.evaluate(`document.querySelector('[data-lab-lesson="start:rust"]').click()`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    app.profile = {...app.profile, credits: 6000, deep: {...(app.profile.deep ?? {}), version: 1, raised: ['sirena-car']},
      lab: {...(app.profile.lab ?? {}), version: 1, done: {rust: true}, owned: {}, ring: 0, ringBest: 0, cable: 15, tune: {}, stockLaps: {}, tunedBonus: [], secret: {}}};
    app._saveProfile(); for(const details of document.querySelectorAll('details')) if(details.querySelector('summary')?.textContent.includes('MENU QA')) details.open=false; })()`);
  // Before: the garage shows the Sirena under a sheet, "Needs the Lab", and the Lab tab leads there.
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`document.querySelector('[data-sirena="waiting"]')?.textContent.includes('Needs the Lab')`, 'the Sirena under a sheet in the garage', 20_000);
  await context.screenshot('restore-garage-before');
  await context.evaluate(`document.querySelector('.lab-tab').click()`);
  await context.waitFor(`!!document.querySelector('.lab-canvas')`, 'the Lab opens with its room', 30_000);
  await walkToRust(context);
  // LAB-RESTORE-PASSED: Rust is passed, so the bench opens straight to Restore, with no lesson to sit through first.
  await context.waitFor(`!!document.querySelector('[data-lab="restore"]:not(:disabled)')`, 'the Restore button on the Rust bench', 10_000);
  if (await context.evaluate(`!!document.querySelector('.lab-teaching') && !document.querySelector('.lab-teaching').hidden`)) throw Error('A passed Rust lesson must not be required again.');
  if (!(await context.evaluate(`!!document.querySelector('[data-lab="replay"]')`))) throw Error('The passed bench should offer to replay the lesson.');
  const label = await context.evaluate(`document.querySelector('[data-lab="restore"]').textContent`);
  if (!label.includes('1,000')) throw Error(`The button should name the price: ${label}`);
  await context.screenshot('restore-offer');

  // The paid, first run: the car is the player's at once, and the sequence runs 46 seconds with no Skip.
  await context.evaluate(`document.querySelector('[data-lab="restore"]').click()`);
  const start = Date.now();
  await context.waitFor(`window.__qaApp.profile.unlockedCars.includes('falcone_sirena') && window.__qaApp.profile.credits === 5000`, 'the car joins the garage and 1,000 is taken, once', 10_000);
  await context.waitFor(`!!document.querySelector('.lab-restore-run') && !document.querySelector('[data-lab="restore-skip"]')`, 'the sequence runs with no Skip on the first watch', 10_000);
  await context.waitFor(`document.querySelector('.lab-caption-text')?.textContent.includes('Salt has been working')`, 'Brian’s first restore line as a caption', 10_000);
  const shots = [['restore-1-soak-start', 3], ['restore-2-soak', 14], ['restore-3-current', 29], ['restore-4-strip', 40]];
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
  if (took < 44 || took > 60) throw Error(`The sequence should take 46 seconds, it took ${took.toFixed(0)} s`);
  await context.screenshot('restore-7-done');
  const owned = await context.evaluate(`window.__qaApp.profile.unlockedCars.filter(car => car === 'falcone_sirena').length`);
  if (owned !== 1) throw Error('The Sirena should be in the garage exactly once.');

  // The garage says to race the Coast Cup, with no new state added.
  await context.evaluate(`document.querySelector('[data-lab="restore-close"]').click(); document.querySelector('[data-lab="close"]').click()`);
  await context.waitFor(`window.__qaApp.labOpen === false`, 'back to the menu', 10_000);
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`document.querySelector('[data-sirena="restored"]')?.textContent.includes('Race the Coast Cup at Pacific Canyon')`, 'the garage panel reads She runs again', 20_000);
  await context.screenshot('restore-garage');

  // Select and race the actual crusted model before buying its body restoration.
  await context.evaluate(`document.querySelector('[data-garage-car="falcone_sirena"]').click()`);
  await context.waitFor(`document.querySelector('button[data-paint="sea-wreck"]')?.getAttribute('aria-pressed') === 'true' && !!document.querySelector('button[data-paint="restored-1966"]:not(:disabled)')`, 'Sea wreck applied and optional body finish offered', 20000);
  await context.screenshot('restore-sea-wreck-garage');
  await context.evaluate(`document.querySelector('[data-action="garage-select"]').click();
    if(document.querySelector('#car-select').value!=='falcone_sirena') throw Error('Sirena must stay selected on the menu');
    document.querySelector('[data-mode="timetrial"]').click();`);
  await context.waitFor(`document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, 'Sirena menu model ready before Start', 90000);
  await context.evaluate(`document.querySelector('#start-engine').click(); window.__qaApp.autopilot=true; window.__qaApp._scriptedCrashDone=true; for(const details of document.querySelectorAll('details')) if(details.querySelector('summary')?.textContent.includes('MENU QA')) details.open=false;`);
  await context.waitFor(`window.__qaApp.duel.state.status==='racing' && document.querySelector('#view3d')?.dataset.vehicleFinish==='sea-wreck' && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && window.__qaApp.duel.state.speedMph>30`, 'Sea wreck racing in the real renderer', 90000);
  await context.screenshot('restore-sea-wreck-racing');
  await context.evaluate(`window.__qaApp.returnToMenu(); document.querySelector('#garage-open').click()`);
  await context.waitFor(`!!document.querySelector('[data-garage-car="falcone_sirena"]')`, 'garage after racing', 20000);
  await context.evaluate(`document.querySelector('[data-garage-car="falcone_sirena"]').click(); document.querySelector('button[data-paint="restored-1966"]').click()`);
  await context.waitFor(`window.__qaApp.labOpen && !!document.querySelector('.lab-restore-run') && !document.querySelector('[data-lab="restore-skip"]')`, 'garage purchase starts the rebuild and paint show', 20000);
  const paid = await context.evaluate(`({credits:window.__qaApp.profile.credits,paint:window.__qaApp.profile.cosmetics.falcone_sirena})`);
  if(paid.credits!==3500 || paid.paint.selected!=='restored-1966' || !paid.paint.owned.includes('sea-wreck')) throw Error('Body purchase must pay 1,500 and keep Sea wreck');
  await pause(4500); await context.screenshot('restore-5-rebuild');
  await pause(6500); await context.screenshot('restore-6-paint');
  await context.waitFor(`!!document.querySelector('[data-lab="restore-close"]')`, 'body show finishes', 15000);
  await context.waitFor(`document.querySelector('.lab-caption-text')?.textContent.includes('Strip, rebuild, paint')`, 'Brian body completion caption', 10000);
  await context.screenshot('restore-body-done');
  await context.evaluate(`document.querySelector('[data-lab="restore-close"]').click(); document.querySelector('[data-lab="close"]').click(); document.querySelector('#garage-open').click()`);
  await context.waitFor(`!!document.querySelector('[data-garage-car="falcone_sirena"]')`, 'garage after body show', 20000);
  await context.evaluate(`document.querySelector('[data-garage-car="falcone_sirena"]').click()`);
  await context.screenshot('restore-both-finishes-check');
  try {
    await context.waitFor(`document.querySelector('button[data-paint="restored-1966"]')?.getAttribute('aria-pressed') === 'true' && !!document.querySelector('button[data-paint="sea-wreck"]:not(:disabled)')`, 'both finishes stay selectable', 10000);
  } catch (error) {
    const diagnosis=await context.evaluate(`({paint:window.__qaApp.profile.cosmetics.falcone_sirena,buttons:[...document.querySelectorAll('button[data-paint]')].map(b=>({id:b.dataset.paint,pressed:b.getAttribute('aria-pressed'),disabled:b.disabled})),lab:window.__qaApp.labOpen,car:window.__qaApp.menuCar})`);
    throw Error(error.message+' '+JSON.stringify(diagnosis));
  }
  await context.screenshot('restore-both-finishes');
  await context.evaluate(`document.querySelector('button[data-paint="sea-wreck"]').click()`);
  await context.waitFor(`window.__qaApp.profile.cosmetics.falcone_sirena.selected==='sea-wreck' && window.__qaApp.profile.credits===3500`, 'switch back to wreck for free', 10000);

  // The replay is free and can be skipped; nothing more is charged.
  await context.evaluate(`document.querySelector('[data-action="garage-close"]').click(); window.__qaApp.openLab()`);
  await context.waitFor(`window.__qaApp.labOpen && !document.querySelector('.lab-panel').hidden && !!document.querySelector('.lab-canvas')`, 'the reopened Lab is visible', 20_000);
  await walkToRust(context);
  await context.waitFor(`!!document.querySelector('[data-lab="restore-again"]') && !document.querySelector('[data-lab="restore"]')`, 'only the replay is offered now', 10_000);
  await context.evaluate(`document.querySelector('[data-lab="restore-again"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="restore-skip"]')`, 'the replay can be skipped', 10_000);
  await context.evaluate(`document.querySelector('[data-lab="restore-skip"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="restore-close"]')`, 'Skip jumps to the end', 10_000);
  const credits = await context.evaluate(`window.__qaApp.profile.credits`);
  if (credits !== 3500) throw Error(`Nothing more should be charged, credits are ${credits}`);
  // The lesson itself stays open: from the finished replay the bench offers it, and it opens as the five-step lesson.
  await context.evaluate(`document.querySelector('[data-lab="restore-close"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="replay"]')`, 'the passed bench offers the lesson again', 10_000);
  await context.evaluate(`document.querySelector('[data-lab="replay"]').click()`);
  await context.waitFor(`!!document.querySelector('.lab-teaching') && !document.querySelector('.lab-teaching').hidden && !document.querySelector('[data-lab="restore"]')`, 'the Rust lesson replays', 20_000);
  await context.screenshot('restore-lesson-replay');
  console.log(`Lab restore: mechanical 1,000 + body 1,500, both finishes kept, the sequence took ${took.toFixed(0)} s, salt ${salt.join('% > ')}%`);
}
