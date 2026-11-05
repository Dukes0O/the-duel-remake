// Keyboard-only G-force classroom play at the full physics-panel resolution.
// Saves stay in memory, and Claude runs this scenario on the laptop.
const KEYS = Object.freeze({
  Enter: ['Enter', 13],
  Space: [' ', 32],
  KeyH: ['h', 72],
  ArrowUp: ['ArrowUp', 38],
  ArrowDown: ['ArrowDown', 40],
  ArrowLeft: ['ArrowLeft', 37],
  ArrowRight: ['ArrowRight', 39],
  Digit1: ['1', 49],
  Digit2: ['2', 50],
  Digit3: ['3', 51],
});

const state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,lab-2,helicopter,forest-fire,rescue,heli-skiing,summit-run');
  await c.waitFor(
    `!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`,
    'menu',
    90000,
  );
  await c.evaluate(`(()=>{
    const app=window.__qaApp;
    app.audio.setMuted?.(true);
    app.addPlayer('G-force QA');
    app.profile={...app.profile,
      courses:{version:1,unlocked:['tremblant-woods','summit-run']},
      heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3}};
    app._saveProfile();
    document.querySelectorAll('body > details').forEach(item=>item.hidden=true);
    app.openLab();
  })()`);

  const key = (code, type) => c.command('Input.dispatchKeyEvent', {
    type,
    code,
    key: KEYS[code][0],
    windowsVirtualKeyCode: KEYS[code][1],
  });
  const press = async (code, count = 1) => {
    for (let index = 0; index < count; index++) {
      await key(code, 'keyDown');
      await key(code, 'keyUp');
      await wait(220);
    }
  };
  const at = (step, extra = 'true') => c.waitFor(
    `${state}?.step==='${step}' && (value=>${extra})(${state})`,
    step,
    30000,
  );
  const next = async step => {
    await at(step, 'value.ready');
    await press('Enter');
  };
  const shot = name => c.screenshot(name);

  await c.waitFor('window.__qaApp.labOpen===true', 'Lab map', 60000);
  await c.waitFor(`document.querySelector('.lab-canvas')?.dataset.labWalkReady === 'true'`, 'Lab map walk room', 60000);
  await c.evaluate(`document.querySelector('[data-go="turning-arm"]').click()`);

  await at('wonder');
  await shot('gforce-wonder');
  await next('wonder');

  await at('word-speed');
  await shot('gforce-word-speed');
  await press('ArrowRight');
  await at('word-speed', 'value.ready');
  await shot('gforce-speed-set');
  await next('word-speed');

  await at('word-radius');
  await shot('gforce-word-radius');
  await press('ArrowDown', 2);
  await at('word-radius', 'value.ready');
  await next('word-radius');

  await at('word-acceleration');
  await shot('gforce-word-acceleration');
  await next('word-acceleration');

  await at('word-g');
  await shot('gforce-word-g');
  await next('word-g');

  await at('watch');
  await wait(6500);
  await at('watch', 'value.ready');
  await shot('gforce-watch');
  await next('watch');

  await at('try-speed');
  await shot('gforce-speed-question');
  await press('Digit2');
  await press('ArrowRight', 4);
  await press('Space');
  await at('try-speed', 'value.ready');
  await shot('gforce-speed-result');
  await next('try-speed');

  await at('try-radius');
  await shot('gforce-radius-question');
  await press('Digit2');
  await press('ArrowUp');
  await press('Space');
  await at('try-radius', 'value.ready');
  await next('try-radius');

  await at('try-free');
  await shot('gforce-free-test');
  await press('ArrowRight');
  await press('Space');
  await wait(250);
  await press('ArrowUp');
  await press('Space');
  await wait(250);
  await press('ArrowRight');
  await press('Space');
  await at('try-free', 'value.ready');
  await shot('gforce-free-results');
  await next('try-free');

  await at('alone');
  await shot('gforce-alone');
  await press('ArrowRight', 8);
  await press('Space');
  await at('alone', 'value.ready');
  await shot('gforce-alone-pass');
  await next('alone');

  for (const step of ['check-speed', 'check-radius', 'check-rule']) {
    await at(step);
    await shot(`gforce-${step}`);
    await press('Digit1');
    await at(step, 'value.ready');
    await press('Enter');
  }

  await at('recap');
  await shot('gforce-recap');
  const panelVisible = await c.evaluate(`
    document.querySelector('.lc-physics')?.textContent.includes('G-force')
  `);
  if (!panelVisible) throw new Error('The physics panel did not show the G-force rule at 1920 by 1000.');

  const pageKeptSteps = await c.evaluate(`
    JSON.parse(document.querySelector('.lab-classroom').dataset.classroom).page.length >= 12
  `);
  if (!pageKeptSteps) throw new Error('The classroom page did not keep the earlier lesson steps.');

  await press('Enter');
  await c.waitFor(
    '!document.querySelector(".lab-classroom") && window.__qaApp.labOpen===true',
    'the existing G-force challenge opens from the recap',
    20000,
  );
}
