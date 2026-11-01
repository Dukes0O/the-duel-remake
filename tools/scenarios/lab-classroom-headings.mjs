// LAB-CLASSROOM-HEADINGS: the Headings and maps classroom played by keyboard (and one mouse drag of the ruler), from
// walking up to the map table to the helicopter challenge, on the harness's memory-only origin.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await play(c);
}

const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyE: ['e', 69], KeyA: ['a', 65], KeyD: ['d', 68], ArrowRight: ['ArrowRight', 39],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};

async function play(c) {
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Headings QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type, extra = {}) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], ...extra});
  const press = async (code, times = 1) => { for (let i = 0; i < times; i++) { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(times > 1 ? 60 : 250); } };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 40_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const bubble = () => c.evaluate(`document.querySelector('.lc-bubble').textContent`);
  // Board units to screen pixels, as the board is fitted into its canvas.
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);

  // Walk up to the map table and press E, as a player does.
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  const walkKey = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: code.slice(3).toLowerCase()});
  const pos = axis => `JSON.parse(${canvas}.dataset.labWalkPosition)[${axis}]`;
  async function walk(code, expression) {
    await c.evaluate(`${canvas}.focus()`); await walkKey(code, 'keyDown');
    try {
      await c.evaluate(`new Promise((resolve, reject) => { const until = performance.now() + 18000; function step() { if (${expression}) { document.dispatchEvent(new KeyboardEvent('keyup', {code: '${code}', bubbles: true})); resolve(true); } else if (performance.now() > until) reject(Error('Walk blocked at ' + ${canvas}.dataset.labWalkPosition)); else requestAnimationFrame(step); } step(); })`);
    } finally { await walkKey(code, 'keyUp'); }
    await wait(500);
  }
  await walk('KeyW', `${pos(2)} < 3.6`);
  await walk('KeyD', `${pos(0)} > 11.9`);
  await walk('KeyW', `${pos(2)} < -4.5`);
  await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the')`, 'map table');
  await press('KeyE');
  if (await c.evaluate(`!!document.querySelector('[data-lab-lesson="start:headings"]')`)) await c.evaluate(`document.querySelector('[data-lab-lesson="start:headings"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(4000); await shot('wonder-flying'); await at('wonder', 's.ready'); await shot('wonder-missed');
  await next('wonder');
  // Heading: D counts up. A first says it went down.
  await at('word-heading'); await shot('word-heading'); await press('KeyA'); await wait(300); await shot('word-heading-left');
  await press('KeyD', 8); await at('word-heading', 's.ready'); await shot('word-heading-right');
  await next('word-heading');
  // East: a held D turns her on (key repeat), then Space.
  await at('word-compass');
  await key('KeyD', 'keyDown'); for (let i = 0; i < 17; i++) { await wait(40); await key('KeyD', 'keyDown', {autoRepeat: true}); } await key('KeyD', 'keyUp'); await wait(300);
  await shot('word-compass-turned'); await press('Space'); await at('word-compass', 's.ready'); await shot('word-compass-east');
  await next('word-compass');
  // Scale: one mouse drag of the ruler's end to the hut, then Space.
  await at('word-scale'); await shot('word-scale');
  const from = await toScreen(300 + 100 * .6, 450), to = await toScreen(300 + 300 * .6, 450);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1});
  for (let k = 1; k <= 5; k++) { await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: from.x + (to.x - from.x) * k / 5, y: from.y, button: 'left', buttons: 1}); await wait(40); }
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await wait(300); await shot('word-scale-ruler'); await press('Space'); await at('word-scale', 's.ready'); await shot('word-scale-right');
  if (!(await bubble()).startsWith('Right: three squares')) throw Error('The ruler at the hut was not right: ' + await bubble());
  await next('word-scale');
  await at('watch'); await wait(3000); await shot('watch-turning'); await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // The smoke's heading: a miss first (100), then 070.
  await at('try-turn'); await shot('try-turn'); await press('KeyD', 20); await press('Space'); await at('try-turn', 's.ready'); await shot('try-turn-miss');
  if (!(await bubble()).startsWith('You flew 100: 30 too far right')) throw Error('The miss did not say why: ' + await bubble());
  await press('KeyA', 6); await press('Space'); await c.waitFor(`document.querySelector('.lc-bubble').textContent.startsWith('Right over the smoke')`, 'on the smoke', 30_000); await shot('try-turn-right');
  await next('try-turn');
  await at('try-wrap'); await shot('try-wrap'); await press('KeyA', 8); await shot('try-wrap-turned'); await press('Space'); await at('try-wrap', 's.ready'); await shot('try-wrap-right');
  await next('try-wrap');
  // Brian's job: stop short first, and Brian says why; then help climbs to his pointer and Show me flies it.
  await at('alone'); await shot('alone');
  await press('KeyD', 14); await press('Space'); await wait(5000); await press('Space');
  await at('alone', 's.help === 1'); await wait(400); await shot('alone-short');
  if (!/^Right heading, but you stopped after \d+ m, \d+ m short/.test(await bubble())) throw Error('The short stop did not say why: ' + await bubble());
  for (const rung of [2, 3]) { await press('KeyH'); await at('alone', `s.help === ${rung}`); }
  await wait(2600); await shot('alone-show-me');
  await at('alone', 's.ready'); await shot('alone-pass');
  await next('alone');
  for (const [step, answer] of [['check-west', 'Digit3'], ['check-wrap', 'Digit1'], ['check-scale', 'Digit2']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(2500); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  // Teaching writes the six notebook words and never passes the lesson by itself.
  if (!(await c.evaluate(`!window.__qaApp.profile.lab.done.headings && ['headings-heading', 'headings-north', 'headings-east', 'headings-south', 'headings-west', 'headings-scale'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  // The game challenge goes through the Lab's own path: the helicopter starts with the key idea card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.heliSession?.view?.()?.challenge?.id === 'headings'`, 'headings challenge in the helicopter', 60_000);
  await c.waitFor(`!document.querySelector('.lab-key-idea')?.hidden && document.querySelector('.lab-key-idea')?.textContent.includes('Turn until the gauge reads 070.')`, 'key idea card');
  await c.waitFor(`window.__qaApp.visualReady && document.querySelector('#renderer-loading')?.hidden && document.querySelector('#view3d canvas')?.style.visibility !== 'hidden'`, 'presented challenge world', 120_000);
  await wait(1500);
  if (!(await c.evaluate(`(() => {
    const card = document.querySelector('.lab-key-idea').getBoundingClientRect();
    return [...document.querySelectorAll('button,input,select,a[href]')].every(el => {
      const r = el.getBoundingClientRect();
      return !r.width || !r.height || r.right <= card.left || r.left >= card.right || r.bottom <= card.top || r.top >= card.bottom;
    });
  })()`))) throw Error('The key-idea card overlaps an interactive control.');
  await shot('challenge');
}
