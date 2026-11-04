// LAB-CLASSROOM-LAUNCH: the Launch angles classroom played by keyboard (and one mouse click on the ramp panel), from the
// Lab map's click-to-go to the launcher, through Brian's job with Show me, to the pass and the free Aerials reward.
// Memory-only saves.
const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], Backspace: ['Backspace', 8], Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};
const state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,lab-2,helicopter,forest-fire,rescue,heli-skiing,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Launch QA');
    a.profile = {...a.profile, courses: {version: 1, unlocked: ['tremblant-woods', 'summit-run']},
      heli: {version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}, refuels: 3}};
    a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.hidden = true); a.openLab(); })()`);
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async (code, times = 1) => { for (let i = 0; i < times; i++) { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(times > 1 ? 120 : 250); } };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 40_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const prompt = (text, label) => c.waitFor(`document.querySelector('.lc-prompt')?.textContent.includes(${JSON.stringify(text)})`, label, 10_000);
  const saying = (text, label) => c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000);
  const shot = name => c.screenshot(name);
  const bubble = () => c.evaluate(`document.querySelector('.lc-bubble').textContent`);
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);

  // The Lab map's click-to-go takes the player to the launcher, as a player's click does.
  const canvas = `document.querySelector('.lab-canvas')`;
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="launcher-ramp"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(2000); await shot('wonder-flying'); await at('wonder', 's.ready'); await shot('wonder');
  if (!(await bubble()).includes('nearly the same spot')) throw Error('The wonder should end on the two landings: ' + await bubble());
  await next('wonder');
  // Launch angle: one click on the ramp panel's Flatter, then ↓ twice more.
  await at('word-angle'); await shot('word-angle');
  const flatter = await toScreen(690, 160);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: flatter.x, y: flatter.y, button: 'left', buttons: 1, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: flatter.x, y: flatter.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await prompt('at 55 degrees', 'the click on Flatter tilts the ramp 5 degrees');
  await press('ArrowDown', 2); await at('word-angle', 's.ready'); await shot('word-angle-done');
  await next('word-angle');
  await at('word-speed'); await shot('word-speed'); await press('ArrowRight', 2); await at('word-speed', 's.ready'); await shot('word-speed-done');
  // Backspace goes back one step, which stays done; Enter comes forward again.
  await press('Backspace'); await at('word-angle', 's.ready'); await press('Enter');
  await next('word-speed');
  await at('word-distance'); await press('Space'); await wait(900); await shot('word-distance-flying'); await at('word-distance', 's.ready');
  await saying('35.6 m', 'the tape reads the landing'); await shot('word-distance-done');
  await next('word-distance');
  await at('watch'); await wait(5000); await shot('watch-running'); await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // Past the flag: guess steeper; a launch at 45 says to tilt first; 50 degrees still lands past; 60 is on the flag.
  // The free test: the ramp and the dial move the sums at once, and three launches open Continue.
  await at('try-free'); await shot('try-free');
  await press('ArrowDown', 2); await press('ArrowRight', 2); await wait(200); await shot('try-free-set');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-worked')].some(e => e.textContent.includes('22 × cos 35°'))`))) throw Error('The formulas did not follow the ramp and the dial.');
  await press('Space'); await wait(1200); await shot('try-free-flying'); await saying('Change a setting', 'the first launch says its result');
  await press('ArrowUp', 5); await press('Space'); await saying('Change a setting', 'the second launch says its result'); await wait(300);
  await press('ArrowDown', 3); await press('Space'); await at('try-free', 's.ready'); await shot('try-free-three');
  await next('try-free');
  await at('try-flag', 's.cards === 3'); await shot('try-flag-guess'); await press('Digit1');
  await press('Space'); await saying('Tilt the ramp first', 'a launch at 45 says why');
  await press('ArrowUp'); await press('Space'); await saying('beyond the 30 m flag', 'a miss says why'); await wait(300); await shot('try-flag-miss');
  await press('ArrowUp', 2); await press('Space'); await at('try-flag', 's.ready'); await saying('so does tilting the other way', 'either way works'); await shot('try-flag-done');
  await next('try-flag');
  // A little slower: Space at 72 km/h says to turn the dial; 65 km/h, a wrong guess says why.
  await at('try-speed'); await shot('try-speed'); await press('Space'); await saying('press ← until the dial reads 65', 'the wrong speed says why');
  await press('ArrowLeft', 2); await prompt('65 km/h', 'the dial reads 65'); await press('Space'); await at('try-speed', 's.cards === 3'); await shot('try-speed-guess');
  await press('Digit3'); await at('try-speed', 's.ready'); await saying('did not shorten by that much', 'a wrong guess says why'); await shot('try-speed-done');
  await next('try-speed');
  // Brian's job: mark 1 short then right; mark 2 by Show me; mark 3 too steep, then 45 degrees at 65 km/h.
  await at('alone'); await shot('alone'); await press('Space'); await saying('Add speed by pressing →', 'a short launch says why'); await shot('alone-short');
  await press('ArrowRight', 2); await press('Space'); await saying('For the second mark', 'mark 1 is on the flag');
  for (let i = 0; i < 3 && !(await c.evaluate(`${state}?.help === 3`)); i++) await press('KeyH');
  await wait(1500); await shot('alone-show-me');
  await saying('For the third mark', 'Show me sets and launches mark 2');
  await press('Space'); await saying('short of the 30 m flag', 'mark 3 starts on a miss'); await shot('alone-mark3-short');
  await press('ArrowDown', 6); await press('ArrowRight', 2); await prompt('65 km/h', 'set for the mark'); await press('Space'); await at('alone', 's.ready'); await shot('alone-done');
  if (!(await bubble()).includes('Job done')) throw Error('The job should end done: ' + await bubble());
  await next('alone');
  for (const [step, answer] of [['check-pair', 'Digit1'], ['check-lower', 'Digit2'], ['check-game', 'Digit1']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(500); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(800); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  if (!(await c.evaluate(`!window.__qaApp.profile.lab?.done?.launch && ['launch-launch-angle', 'launch-speed', 'launch-distance'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-actions button')].some(b => b.textContent.includes('Finish the lesson'))`))) throw Error('The last step should say Finish the lesson.');
  // Enter finishes: the lesson's own launches pass the bench's goal; the free Aerials reward is owned.
  await press('Enter');
  await c.waitFor(`window.__qaApp.profile.lab?.done?.launch === true && window.__qaApp.profile.lab?.owned?.aerials === true`, 'Launch passes and the Aerials reward is owned', 10_000);
  await saying('the Aerials run is now open', 'Brian says what the pass opened'); await wait(500); await shot('passed-classroom');
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom')`, 'back to the Lab', 10_000);
  await c.evaluate(`window.__qaApp.closeLab()`);
}
