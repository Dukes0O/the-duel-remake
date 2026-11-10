// LAB-CLASSROOM-DOWNFORCE: the Downforce classroom played by keyboard (and one mouse click on the wing panel), from the
// Lab map's click-to-go to the wind tunnel, through Brian's job with Show me, to the pass and the Wing angle row open
// on the Tune page. passDownforce is the short way through, which lab-tune-view uses to open the wing. Memory-only saves.
const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyE: ['e', 69], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], Backspace: ['Backspace', 8], Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};
const state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait = ms => new Promise(r => setTimeout(r, ms));

function driver(c) {
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async (code, times = 1) => { for (let i = 0; i < times; i++) { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(times > 1 ? 120 : 250); } };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 40_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const prompt = (text, label) => c.waitFor(`document.querySelector('.lc-prompt')?.textContent.includes(${JSON.stringify(text)})`, label, 10_000);
  const saying = (text, label) => c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000);
  // From the Lab map's click-to-go to the wind tunnel, E, and Downforce opens as a classroom.
  async function open() {
    const canvas = `document.querySelector('.lab-canvas')`;
    await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
    await c.evaluate(`document.querySelector('[data-go="wind-tunnel"]').click()`);
    await c.waitFor(`${canvas}.dataset.labWalkArrived === 'wind-tunnel'`, 'walk to tunnel', 30_000);
    await press('KeyE');
    await c.waitFor(`!!document.querySelector('[data-lab-lesson="start:downforce"]')`, 'tunnel choices');
    await c.evaluate(`document.querySelector('[data-lab-lesson="start:downforce"]').click()`);
    await at('wonder');
  }
  return {press, at, next, prompt, saying, open};
}

// The short way through: every step done as its prompt says, every question right. Ends with the pass saved and the
// classroom closed, back in the Lab.
export async function passDownforce(c) {
  const d = driver(c);
  await d.open();
  await d.next('wonder');
  await d.at('word-speed'); await d.press('ArrowUp', 5); await d.next('word-speed');
  await d.at('word-wing'); await d.press('ArrowRight', 2); await d.next('word-wing');
  for (const step of ['word-downforce', 'word-drag']) { await d.at(step); await d.press('Space'); await d.next(step); }
  await d.next('watch');
  // The free test: three different settings open Continue.
  await d.at('try-free'); await d.press('Space'); await d.saying('test a different one', 'the first setting ran');
  await d.press('ArrowUp', 5); await d.press('Space'); await d.prompt('You have tested 2 of', 'the second setting ran');
  await d.press('ArrowLeft'); await d.press('Space'); await d.next('try-free');
  await d.at('try-speed'); await d.press('ArrowUp', 6); await d.prompt('120 km/h', 'the dial reads 120 km/h'); await d.press('Space');
  await d.at('try-speed', 's.cards === 3'); await d.press('Digit2'); await d.next('try-speed');
  // The cost: the tilted wing carries over; run it, then flat, then steep.
  await d.at('try-cost', 's.cards === 3'); await d.press('Digit1');
  await d.press('Space'); await d.saying('Now test the flat wing and the steep wing', 'the tilted wing ran');
  await d.press('ArrowLeft'); await d.press('Space'); await d.saying('Now test the steep wing', 'the flat wing ran');
  await d.press('ArrowRight', 2); await d.press('Space'); await d.next('try-cost');
  // Brian's job: tilted, steep, flat.
  await d.at('alone'); await d.press('ArrowLeft'); await d.press('Space'); await d.saying('Course 2', 'course 1 holds');
  await d.press('ArrowRight'); await d.press('Space'); await d.saying('Course 3', 'course 2 holds');
  await d.press('ArrowLeft', 2); await d.press('Space'); await d.next('alone');
  for (const [step, answer] of [['check-nine', 'Digit3'], ['check-bend', 'Digit3'], ['check-game', 'Digit1']]) { await d.at(step); await d.press(answer); await d.next(step); }
  await d.at('recap'); await d.press('Enter');
  await c.waitFor(`window.__qaApp.profile.lab?.done?.downforce === true`, 'Downforce passes and is saved', 10_000);
  await d.saying('Wing angle is open on the Tune page', 'Brian says what the pass opened');
  await d.press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom')`, 'back to the Lab', 10_000);
}

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Downforce QA');
    a.profile = {...a.profile, drivingLessons: {version: 1, done: {corner: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.hidden = true); a.openLab(); })()`);
  const {press, at, next, prompt, saying, open} = driver(c);
  const shot = name => c.screenshot(name);
  const bubble = () => c.evaluate(`document.querySelector('.lc-bubble').textContent`);
  const sums = text => c.evaluate(`[...document.querySelectorAll('.lc-worked')].some(e => e.textContent.includes(${JSON.stringify(text)}))`);
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);

  await open();
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(1800); await shot('wonder-fan'); await at('wonder', 's.ready'); await shot('wonder');
  if (!(await bubble()).includes('1,337 kg')) throw Error('The wonder should end on the scale’s reading: ' + await bubble());
  await next('wonder');
  // Fan speed: km/h and m/s are defined, and the dial moves the sum.
  await at('word-speed'); await shot('word-speed');
  await press('ArrowUp'); await wait(200);
  if (!(await sums('16.67 m/s'))) throw Error('The sum did not follow the fan dial.');
  await press('ArrowUp', 4); await at('word-speed', 's.ready'); await wait(300); await shot('word-speed-done');
  await next('word-speed');
  // Wing: one click on the wing panel's Steeper, then → once more.
  await at('word-wing'); await shot('word-wing');
  const steeper = await toScreen(890, 314);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: steeper.x, y: steeper.y, button: 'left', buttons: 1, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: steeper.x, y: steeper.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await prompt('The wing is tilted', 'the click on Steeper tilts the wing one notch');
  await wait(300); await shot('word-wing-tilted');
  await press('ArrowRight'); await at('word-wing', 's.ready'); await wait(300); await shot('word-wing-done');
  await next('word-wing');
  await at('word-downforce'); await shot('word-downforce'); await press('Space'); await at('word-downforce', 's.ready');
  await saying('1,272 kg', 'the scale reads the car and the push'); await wait(300); await shot('word-downforce-done');
  // The word stays open: the dial moves the sum and the scale, and doubling the speed gives four times the push.
  if (!(await sums('0.11239 × 13.89'))) throw Error('The push sum should show the fan’s speed.');
  await press('ArrowUp', 5); await prompt('keep turning the dial', 'the word stays open'); await wait(300);
  if (!(await sums('0.11239 × 27.78'))) throw Error('The push sum did not follow the dial.');
  await shot('word-downforce-doubled');
  // Backspace goes back one step, which stays done; Enter comes forward again.
  await press('Backspace'); await at('word-wing', 's.ready'); await press('Enter');
  await next('word-downforce');
  await at('word-drag'); await press('Space'); await wait(700); await shot('word-drag-running'); await at('word-drag', 's.ready'); await wait(300); await shot('word-drag-done');
  await next('word-drag');
  await at('watch'); await wait(2600); await shot('watch-running'); await at('watch', 's.ready'); await wait(300); await shot('watch');
  await next('watch');
  // The free test: the dial and the wing move the sums at once, and three different settings open Continue.
  await at('try-free'); await shot('try-free');
  await press('ArrowUp', 5); await wait(200);
  if (!(await sums('2.00'))) throw Error('The comparison did not follow the dial.');
  await shot('try-free-set');
  await press('Space'); await wait(1000); await shot('try-free-running'); await saying('test a different one', 'the first run says its result');
  await press('ArrowDown', 5); await press('Space'); await prompt('You have tested 2 of', 'two settings counted'); await wait(300);
  await press('ArrowLeft'); await press('Space'); await at('try-free', 's.ready'); await wait(300); await shot('try-free-three');
  await next('try-free');
  // Twice the speed: Space at 60 km/h says to turn the dial; 120 km/h, a wrong guess says why.
  await at('try-speed'); await shot('try-speed'); await press('Space'); await saying('press ↑ until the dial reads 120 km/h', 'the wrong speed says why');
  await press('ArrowUp', 6); await prompt('120 km/h', 'the dial reads 120 km/h'); await press('Space'); await at('try-speed', 's.cards === 3'); await wait(300); await shot('try-speed-guess');
  await press('Digit1'); await at('try-speed', 's.ready'); await saying('not twice as much', 'a wrong guess says why'); await wait(300); await shot('try-speed-done');
  await next('try-speed');
  // The cost: guess steep (wrong), run the tilted wing, try it twice (refused), then flat and steep.
  await at('try-cost', 's.cards === 3'); await wait(300); await shot('try-cost-guess'); await press('Digit3');
  await press('Space'); await saying('Now test the flat wing and the steep wing', 'the tilted wing ran');
  await press('Space'); await saying('You have already run the tilted wing', 'the same wing twice says why');
  await press('ArrowLeft'); await press('Space'); await saying('Now test the steep wing', 'the flat wing ran');
  await press('ArrowRight', 2); await press('Space'); await at('try-cost', 's.ready'); await saying('only 283 km/h', 'the wrong guess says why'); await wait(300); await shot('try-cost-done');
  await next('try-cost');
  // Brian's job: the steep wing on course 1 is too much; tilted holds; tilted on course 2 slides wide; Show me; flat.
  await at('alone'); await shot('alone'); await press('Space'); await saying('Press ← for a flatter wing', 'too much wing says why'); await shot('alone-too-much');
  await press('ArrowLeft'); await press('Space'); await saying('Course 2', 'course 1 holds');
  await press('Space'); await saying('slid wide', 'too little wing says why'); await wait(200); await shot('alone-slid');
  for (let i = 0; i < 3 && !(await c.evaluate(`${state}?.help === 3`)); i++) await press('KeyH');
  await wait(1500); await shot('alone-show-me');
  await saying('Course 3', 'Show me sets and runs course 2');
  await press('ArrowLeft', 2); await press('Space'); await wait(2600); await shot('alone-straight'); await at('alone', 's.ready'); await shot('alone-done');
  if (!(await bubble()).includes('finishes the job')) throw Error('The job should end done: ' + await bubble());
  await next('alone');
  for (const [step, answer] of [['check-nine', 'Digit3'], ['check-bend', 'Digit2'], ['check-game', 'Digit1']]) {
    await at(step); await wait(300); await shot(step);
    if (!(await c.evaluate(`(() => { const p = document.querySelector('.lc-page').getBoundingClientRect(), b = document.querySelector('.lc-bubble').getBoundingClientRect(); return b.top >= p.top - 1 && (b.bottom <= p.bottom + 1 || b.height > p.height); })()`))) throw Error(`${step}: Brian's question is cut off.`);
    await press(answer); await at(step, 's.ready'); await wait(500); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(800); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  if (!(await c.evaluate(`!window.__qaApp.profile.lab?.done?.downforce && ['downforce-word-0', 'downforce-word-1', 'downforce-word-2'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-actions button')].some(b => b.textContent.includes('Finish the lesson'))`))) throw Error('The last step should say Finish the lesson.');
  // Enter finishes: the lesson's own fan runs pass the bench's goal; Brian says what it opened, and Enter goes back to the Lab.
  await press('Enter');
  await c.waitFor(`window.__qaApp.profile.lab?.done?.downforce === true`, 'Downforce passes and is saved', 10_000);
  await saying('Wing angle is open on the Tune page', 'Brian says what the pass opened'); await wait(500); await shot('passed-classroom');
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom')`, 'back to the Lab', 10_000);
  await c.evaluate(`window.__qaApp.closeLab()`);
  await c.waitFor(`window.__qaApp.labOpen === false`, 'back to the menu', 10_000);
  await c.evaluate(`document.querySelector('#garage-open').click()`);
  await c.waitFor(`!!document.querySelector('.tune-panel')`, 'the Tune page in the garage', 20_000);
  await c.evaluate(`document.querySelector('.tune-panel summary').click()`);
  const row = await c.evaluate(`(() => { const row = document.querySelector('.tune-row[data-tune-row="wing"]'); return row ? {shut: row.classList.contains('shut'), text: row.textContent} : null; })()`);
  if (!row || row.shut) throw Error(`Wing angle should be open on the Tune page: ${JSON.stringify(row)}`);
  await c.evaluate(`document.querySelector('.tune-row[data-tune-row="wing"]').scrollIntoView({block: 'center'})`);
  await shot('tune-wing-open');
}
