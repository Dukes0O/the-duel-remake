// LAB-FAN-VIEW: private, memory-only discovery, build, reload and garage access.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=helicopter,lab');
  await context.waitFor(`!!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`, 'menu ready', 90_000);
  await context.evaluate(`(() => {const style=document.createElement('style');style.textContent='body > details {display:none!important}';document.head.append(style);})()`);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted(true);
    app.profile = {...app.profile, credits: 40000, drivingLessons: {version: 1, done: {corner: true}},
      heli: {...app.profile.heli, version: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true}},
      lab: {version: 1, done: {grip: true, downforce: true, braking: true, suspension: true}, secret: {}}};
    app._saveProfile(); app.openLab(); })()`);
  await context.waitFor(`!!document.querySelector('.lab-canvas')`, 'Lab room', 30_000);
  await context.evaluate(`document.querySelector('[data-lab-lesson="start:grip"]').click()`);
  const hidden = await context.evaluate(`!document.querySelector('[data-lab="fan-reverse"],[data-lab="fan-blueprint"],[data-lab-fan]') && !['Project Fan','REVERSE','Spéirling','???'].some(text=>document.querySelector('.lab-side').textContent.includes(text))`);
  if (!hidden) throw Error('Four lessons must leave no trace of the secret.');
  await context.evaluate(`(() => {const app=window.__qaApp; app.profile.lab.done.fuel=true; app._saveProfile(); app.closeLab();})()`);
  await context.waitFor(`!document.querySelector('.lab-canvas')`, 'close room');
  await context.evaluate(`window.__qaApp.openLab()`);
  await context.waitFor(`!!document.querySelector('.lab-canvas')`, 'reopen room');
  await context.evaluate(`document.querySelector('[data-lab-lesson="start:grip"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab="fan-reverse"]')`, 'secret switch');
  await context.waitFor(`!!document.querySelector('.lab-stage [data-lab="fan-reverse"]')`, 'switch at room dial');
  await new Promise(resolve => setTimeout(resolve, 2500));
  await context.screenshot('secret');
  await context.evaluate(`document.querySelector('.lab-stage [data-lab="fan-reverse"]').click()`);
  await context.waitFor(`window.__qaApp.profile.lab.secret.reverse === true`, 'REVERSE saved');
  await context.waitFor(`document.querySelector('[data-lab-reverse-scales]')?.textContent === '3,000 kg'`, 'REVERSE makes the scales jump');
  await new Promise(resolve => setTimeout(resolve, 3500));
  await context.evaluate(`document.querySelector('[data-lab="fan-blueprint"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab-fan]')`, 'Project Fan page');
  await context.waitFor(`document.querySelector('.lab-canvas')?.dataset.fanBlueprint === 'ready' && document.querySelector('.lab-canvas')?.dataset.fanCar === 'ready'`, 'accepted blueprint and car models loaded');
  await new Promise(resolve => setTimeout(resolve, 2500));
  await context.screenshot('blueprint');
  await context.evaluate(`(() => {const dial=document.querySelector('[data-lab-fan-setting]'); dial.value=100; dial.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await context.waitFor(`document.querySelector('[data-lab-fan-scales]')?.textContent === '3,000 kg'`, 'stationary fan downforce');
  await context.evaluate(`document.querySelector('[data-lab="fan-build"]').click()`);
  await context.waitFor(`window.__qaApp.profile.credits === 25000 && document.querySelector('[data-lab="fan-build"]').disabled`, 'one build for 15000');
  // Even a stale synthetic click goes through the same ownership guard.
  await context.evaluate(`document.querySelector('[data-lab="fan-build"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  const built = await context.evaluate(`({credits:window.__qaApp.profile.credits, cars:window.__qaApp.profile.unlockedCars.filter(id=>id==='mcmurtry_speirling').length})`);
  if (built.credits !== 25000 || built.cars !== 1) throw Error(`Repeated build changed ownership/wallet: ${JSON.stringify(built)}`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  await context.screenshot('finished-car');
  await context.evaluate(`document.querySelector('[data-lab="close"]').click()`);
  await context.waitFor(`!document.querySelector('.lab-canvas')`, 'room released');
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`!!document.querySelector('[data-garage-car="mcmurtry_speirling"]')`, 'owned fan in garage');
  await context.evaluate(`document.querySelector('[data-garage-car="mcmurtry_speirling"]').click()`);
  await context.screenshot('garage');
  await context.evaluate(`document.querySelector('[data-action="garage-close"]').click()`);
  await context.waitFor(`!![...document.querySelector('#car-select').options].find(o=>o.value==='mcmurtry_speirling')`, 'owned fan in player menu');
  await context.evaluate(`(() => {const select=document.querySelector('#car-select');select.value='mcmurtry_speirling';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await context.waitFor(`window.__qaApp.menuCar === 'mcmurtry_speirling'`, 'fan can stay selected');
  const air = await context.evaluate(`(() => {const app=window.__qaApp;return app.profile.heli.carsAt?.mcmurtry_speirling ?? 'tremblant-woods';})()`);
  if (air !== 'tremblant-woods') throw Error(`Fan must start at the home pad, got ${air}`);
  const restriction = await context.evaluate(`({home:window.__qaApp._airOnlyBlocked('mcmurtry_speirling','tremblant-woods'), away:window.__qaApp._airOnlyBlocked('mcmurtry_speirling','pacific-canyon')})`);
  if (restriction.home || !restriction.away) throw Error('Fan must race at home and need air transport elsewhere.');
  await context.evaluate(`window.__qaApp._refreshPlayer()`);
  const reloaded = await context.evaluate(`({credits:window.__qaApp.profile.credits, owned:window.__qaApp.profile.unlockedCars.includes('mcmurtry_speirling')})`);
  if (reloaded.credits !== 25000 || !reloaded.owned) throw Error('Built ownership/wallet did not survive a profile reload.');
  console.log('Fan: four lessons hide secret; five reveal REVERSE; stationary scales 3000 kg; one 15000 purchase; owned garage/menu access.');
}
