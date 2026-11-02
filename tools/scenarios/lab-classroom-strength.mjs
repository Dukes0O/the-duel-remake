// LAB-CLASSROOM-STRENGTH: the Strength against weight classroom played by keyboard (and one mouse click on the rack),
// from the Lab map's click-to-go to the bending rig, through Brian's job with Show me, to the pass and the Heavy hook
// for sale in the Lab shop. Memory-only saves. lab-view plays the same lesson through `playThrough`.
const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyE: ['e', 69], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};

// From the open classroom's first step to the pass, and back to the Lab. shot(name) takes a picture, or nothing.
export async function playThrough(c, shot = async () => {}) {
  const state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async (code, times = 1) => { for (let i = 0; i < times; i++) { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(times > 1 ? 120 : 250); } };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 40_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const saying = (text, label) => c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000);
  const prompt = (text, label) => c.waitFor(`document.querySelector('.lc-prompt')?.textContent.includes(${JSON.stringify(text)})`, label, 10_000);
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);

  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(900); await shot('wonder-lowering'); await at('wonder', 's.ready'); await shot('wonder');
  await next('wonder');
  // Strength: ↑ hangs 10 kg at a time on the steel bar; 20 kg bends it for good.
  await at('word-strength'); await shot('word-strength'); await press('ArrowUp'); await saying('10 kg uses 73%', 'the first weight says how much strength it uses');
  await shot('word-strength-10'); await press('ArrowUp'); await at('word-strength', 's.ready'); await shot('word-strength-bent');
  await next('word-strength');
  await at('word-stiff'); await shot('word-stiff'); await press('Space'); await wait(900); await shot('word-stiff-dipping'); await at('word-stiff', 's.ready'); await shot('word-stiff-done');
  await next('word-stiff');
  await at('word-brittle'); await shot('word-brittle'); await press('Space'); await wait(2400); await shot('word-brittle-ram'); await at('word-brittle', 's.ready'); await wait(700); await shot('word-brittle-snapped');
  await next('word-brittle');
  await at('watch'); await wait(2600); await shot('watch-loading'); await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // Too thin: Space on steel says to pick carbon fibre first; one click on the rack picks it; a wrong guess says why.
  await at('try-snap'); await shot('try-snap'); await press('Space'); await saying('press 3 first', 'hanging the wrong arm says why');
  const rack = await toScreen(450, 636);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: rack.x, y: rack.y, button: 'left', buttons: 1, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: rack.x, y: rack.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await prompt('Carbon fibre, 20 mm', 'the click on the rack picks carbon fibre');
  await press('Space'); await at('try-snap', 's.cards === 3'); await shot('try-snap-guess');
  await press('Digit1'); await at('try-snap', 's.ready'); await saying('It snapped', 'a wrong guess says what happened'); await wait(400); await shot('try-snap-snapped');
  await next('try-snap');
  // Thick enough: 50 mm bends for good and says why; 80 mm holds.
  await at('try-steel'); await shot('try-steel'); await press('ArrowUp'); await press('Space'); await saying('so it bent for good', 'a thin steel arm says why'); await shot('try-steel-bent');
  await press('ArrowUp', 3); await prompt('Steel, 80 mm', 'the handle reads 80 mm'); await press('Space'); await at('try-steel', 's.ready'); await shot('try-steel-holds');
  await next('try-steel');
  // Brian's job: aluminium holds but is heavy; carbon fibre at 40 mm is over its line; Show me builds the lightest.
  await at('alone'); await shot('alone'); await press('Digit1'); await press('Space'); await saying('your lightest yet', 'a lighter arm that holds'); await shot('alone-aluminium');
  await press('Digit3'); await press('ArrowDown', 4); await prompt('Carbon fibre, 40 mm', 'carbon fibre at 40 mm'); await press('Space');
  await saying('over carbon fibre’s line', 'a thin carbon arm says why'); await shot('alone-thin');
  // The failed try climbed one rung; H climbs the rest to Show me.
  for (let i = 0; i < 3 && !(await c.evaluate(`${state}?.help === 3`)); i++) await press('KeyH');
  await at('alone', 's.help === 3 || s.pointer || s.ready');
  await wait(1200); await shot('alone-show-me');
  await at('alone', 's.ready'); await saying('the lightest arm that can', 'Show me builds and hangs the lightest arm'); await shot('alone-done');
  await next('alone');
  for (const [step, answer] of [['check-bars', 'Digit2'], ['check-snap', 'Digit3'], ['check-game', 'Digit2']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(500); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(800); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  const words = ['strength-strength', 'strength-stiff', 'strength-brittle', 'strength-aluminium', 'strength-steel', 'strength-carbon-fibre'];
  if (!(await c.evaluate(`!window.__qaApp.profile.lab?.done?.strength && ${JSON.stringify(words)}.every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-actions button')].some(b => b.textContent.includes('Finish the lesson'))`))) throw Error('The last step should say Finish the lesson.');
  // Enter finishes: the lesson's own arms pass the bench's goal; Brian says what it opened, and Enter goes back to the Lab.
  await press('Enter');
  await c.waitFor(`window.__qaApp.profile.lab?.done?.strength === true`, 'Strength passes and is saved', 10_000);
  await saying('The Heavy hook is in the Lab shop', 'Brian says what the pass opened'); await wait(500); await shot('passed-classroom');
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom')`, 'back to the Lab', 10_000);
}

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Strength QA');
    a.profile = {...a.profile, credits: 5000, drivingLessons: {version: 1, done: {corner: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.hidden = true); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  // The Lab map's click-to-go takes the player to the bending rig; E uses it and Strength opens as a classroom.
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="bending-rig"]').click()`);
  await c.waitFor(`${canvas}.dataset.labWalkArrived === 'bending-rig'`, 'walk to the bending rig', 30_000);
  await c.command('Input.dispatchKeyEvent', {type: 'keyDown', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69});
  await c.command('Input.dispatchKeyEvent', {type: 'keyUp', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69});
  if (await c.evaluate(`!!document.querySelector('[data-lab-lesson="start:strength"]')`)) await c.evaluate(`document.querySelector('[data-lab-lesson="start:strength"]').click()`);
  await playThrough(c, name => c.screenshot(name));
  await c.screenshot('passed');
  // The pass opened the Heavy hook in the Lab shop.
  await c.evaluate(`document.querySelector('[data-lab-tab="shop"]').click()`);
  await c.waitFor(`!!document.querySelector('[data-lab-buy="heavy-hook"]:not(:disabled)')`, 'the Heavy hook is for sale', 10_000);
  await c.screenshot('shop-heavy-hook');
  await c.evaluate(`window.__qaApp.closeLab()`);
  await c.waitFor(`window.__qaApp.labOpen === false`, 'back to the menu', 10_000);
}
