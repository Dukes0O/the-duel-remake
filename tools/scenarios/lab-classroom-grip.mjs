// Keyboard-only Grip classroom play at the full physics-panel resolution. Saves stay in memory.
const KEYS = Object.freeze({
  Enter: ['Enter', 13], Space: [' ', 32], KeyE: ['e', 69], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51],
});
const state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,lab-2,helicopter,forest-fire,rescue,heli-skiing,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => {
    const app = window.__qaApp;
    app.audio.setMuted?.(true);
    app.addPlayer('Grip QA');
    app.profile = {...app.profile, drivingLessons: {version: 1, done: {corner: true}}};
    app._saveProfile();
    document.querySelectorAll('body > details').forEach(item => item.hidden = true);
    app.openLab();
  })()`);

  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async (code, count = 1) => {
    for (let index = 0; index < count; index++) {
      await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(count > 1 ? 150 : 240);
    }
  };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step==='${step}' && (value=>${extra})(${state})`, step, 30_000);
  const next = async step => { await at(step, 'value.ready'); await press('Enter'); };
  const shot = name => c.screenshot(name);

  const canvas = `document.querySelector('.lab-canvas')`;
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'Lab room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="wind-tunnel"]').click()`);
  await c.waitFor(`${canvas}.dataset.labWalkArrived === 'wind-tunnel'`, 'walk to the rolling road', 30_000);
  await press('KeyE');
  await c.waitFor(`!!document.querySelector('[data-lab-lesson="start:grip"]')`, 'Grip lesson choice');
  await c.evaluate(`document.querySelector('[data-lab-lesson="start:grip"]').click()`);

  await at('wonder'); await wait(2_400); await at('wonder', 'value.ready'); await shot('grip-wonder'); await next('wonder');
  await at('word-slide'); await press('ArrowUp'); await at('word-slide', 'value.ready'); await next('word-slide');
  await next('word-grip'); await next('word-slip');
  await at('formula');
  await press('ArrowUp');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-worked')].some(line => line.textContent.includes('1.006555'))`))) throw new Error('The formula did not follow the angle dial.');
  await shot('grip-formula'); await next('formula');
  await at('watch'); await wait(3_400); await at('watch', 'value.ready'); await shot('grip-watch'); await next('watch');

  await at('try-edge', 'value.asking');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-worked')].every(line => line.textContent.trim() === '')`))) throw new Error('An open guess shows a worked answer.');
  await shot('grip-guess'); await press('Digit2'); await press('Space'); await at('try-edge', 'value.ready'); await shot('grip-result');
  await c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes('0.9973779') && document.querySelector('.lc-bubble')?.textContent.includes('shown as 99%')`, 'the result explains the small grip loss');
  await next('try-edge');

  await at('try-free');
  for (const [target, presses] of [[3, 2], [4.5, 3], [9, 9]]) {
    await press('ArrowUp', presses); await press('Space');
    await c.waitFor(`${state}?.rows?.some(row => row.slideDeg === ${target})`, `${target} degree comparison`);
  }
  await at('try-free', 'value.ready'); await shot('grip-free-test'); await next('try-free');

  await at('challenge');
  await press('ArrowUp', 4); await press('Space');
  await c.waitFor(`${state}?.challengeAttempts?.length === 1`, 'full-grip run');
  await press('ArrowUp'); await press('Space');
  await at('challenge', 'value.ready'); await shot('grip-two-run-test'); await next('challenge');
  await at('check-band', 'value.asking'); await press('Digit2'); await at('check-band', 'value.ready'); await next('check-band');
  await at('recap'); await shot('grip-recap');

  // Enter invokes the real inline bench challenge from lab-view.js. Its two attempts
  // must satisfy gripBench.goalMet before the profile records the existing reward.
  await press('Enter');
  await c.waitFor(`window.__qaApp.profile.lab?.done?.grip === true`, 'the Grip challenge passes and is saved', 15_000);
  await c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes('full grip at 3 degrees or more')`, 'Brian explains the pass');
  await shot('grip-challenge-passed');
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom')`, 'return to the Lab after the inline challenge', 10_000);
}
