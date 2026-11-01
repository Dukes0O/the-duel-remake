// LAB-CLASSROOM-PROJECTILE: the Projectile motion classroom played by keyboard (and one mouse drag of the flag),
// from walking up to the drop tower to the helicopter challenge, on the harness's memory-only origin.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await play(c);
}

const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyE: ['e', 69], KeyR: ['r', 82], ArrowRight: ['ArrowRight', 39],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};

async function play(c) {
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Projectile QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type, extra = {}) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], ...extra});
  const press = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(250); };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 30_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  // Board units to screen pixels, as the board is fitted into its canvas.
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);

  // Walk up to the drop tower and press E, as a player does.
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
  await walk('KeyW', `${pos(2)} < -3.95`);
  await walk('KeyA', `${pos(0)} < -11.5`);
  await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the Projectile')`, 'drop tower');
  await press('KeyE');
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(3200); await shot('wonder-falling'); await at('wonder', 's.ready'); await shot('wonder-missed');
  await next('wonder');
  await at('word-gravity'); await shot('word-gravity'); await press('Space'); await wait(2000); await shot('word-gravity-marks');
  await next('word-gravity');
  await at('word-forward-speed'); await press('Space'); await wait(2600); await shot('word-forward-speed-under-her');
  await next('word-forward-speed');
  await at('word-arc'); await press('Space'); await at('word-arc', 's.ready'); await shot('word-arc');
  await next('word-arc');
  await at('watch-water'); await wait(3000); await shot('watch-water-falling'); await at('watch-water', 's.ready'); await shot('watch-water');
  await next('watch-water');
  await at('watch-speeds'); await wait(2400); await shot('watch-speeds-falling'); await at('watch-speeds', 's.ready'); await shot('watch-speeds');
  await next('watch-speeds');
  // The flag: a held arrow moves it a metre a press, then one mouse drag puts it on 13 m.
  await at('try-flag'); await shot('try-flag');
  await key('ArrowRight', 'keyDown'); for (let i = 0; i < 4; i++) { await wait(40); await key('ArrowRight', 'keyDown', {autoRepeat: true}); } await key('ArrowRight', 'keyUp'); await wait(250);
  const from = await toScreen(200 + 5 * 12, 590), to = await toScreen(200 + 13 * 12, 590);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1});
  for (let k = 1; k <= 5; k++) { await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: from.x + (to.x - from.x) * k / 5, y: from.y, button: 'left', buttons: 1}); await wait(40); }
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await wait(300); await shot('try-flag-placed');
  await press('Space'); await at('try-flag', 's.ready'); await shot('try-flag-result');
  if (!(await c.evaluate(`document.querySelector('.lc-bubble').textContent.startsWith('Right! The water landed 13 m ahead')`))) throw Error('The flag at 13 m was not right: ' + await c.evaluate(`document.querySelector('.lc-bubble').textContent`));
  await next('try-flag');
  await at('try-height', 's.cards === 3'); await shot('try-height-guess'); await press('Digit1');
  await press('Space'); await at('try-height', 's.ready'); await shot('try-height-wrong-guess');
  await next('try-height');
  // Brian's job: an early press falls short and Brian says why; then help climbs to his pointer and Show me hits.
  await at('alone'); await shot('alone');
  await press('Space'); await wait(800); await press('Space');
  await at('alone', 's.help === 1'); await wait(400); await shot('alone-short');
  for (const rung of [2, 3]) { await press('KeyH'); await at('alone', `s.help === ${rung}`); }
  await wait(900); await shot('alone-show-me');
  await at('alone', 's.ready'); await shot('alone-pass');
  await next('alone');
  for (const [step, answer] of [['check-over', 'Digit3'], ['check-faster', 'Digit1'], ['check-game', 'Digit2']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(4800); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  // Teaching writes the notebook words and never passes the lesson by itself.
  if (!(await c.evaluate(`!window.__qaApp.profile.lab.done.projectile && ['projectile-gravity', 'projectile-forward-speed', 'projectile-arc'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  // The game challenge goes through the Lab's own path: the helicopter starts with the key idea card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.heliSession?.view?.()?.challenge?.id === 'projectile'`, 'projectile challenge in the helicopter', 60_000);
  await c.waitFor(`!document.querySelector('.lab-key-idea')?.hidden && document.querySelector('.lab-key-idea')?.textContent.includes('Let go before the buoy.')`, 'key idea card');
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
