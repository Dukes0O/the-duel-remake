// LAB-CLASSROOM-BRAKING: the Braking classroom played by keyboard (and one mouse click on the brake lever), from the Lab
// map's click-to-go to the wind tunnel, through Brian's job with Show me, to the pass and the Brake balance row open on
// the Tune page. It also checks the classroom's reading fixes: Brian's "Stuck?" offer sits under his words, and
// Backspace goes back one step. Memory-only saves.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Braking QA');
    a.profile = {...a.profile, drivingLessons: {version: 1, done: {corner: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.hidden = true); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyE: ['e', 69], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
    ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], Backspace: ['Backspace', 8], Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async (code, times = 1) => { for (let i = 0; i < times; i++) { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(times > 1 ? 120 : 250); } };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 40_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const bubble = () => c.evaluate(`document.querySelector('.lc-bubble').textContent`);
  const saying = (text, label) => c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000);
  const prompt = (text, label) => c.waitFor(`document.querySelector('.lc-prompt')?.textContent.includes(${JSON.stringify(text)})`, label, 10_000);
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);

  // The Lab map's click-to-go takes the player to the wind tunnel; E uses it and Braking opens as a classroom.
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="wind-tunnel"]').click()`);
  await c.waitFor(`${canvas}.dataset.labWalkArrived === 'wind-tunnel'`, 'walk to tunnel', 30_000);
  await press('KeyE');
  await c.waitFor(`!!document.querySelector('[data-lab-lesson="start:braking"]')`, 'tunnel choices');
  await c.evaluate(`document.querySelector('[data-lab-lesson="start:braking"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(1100); await shot('wonder-braking'); await at('wonder', 's.ready'); await shot('wonder');
  if (!(await c.evaluate(`document.querySelector('.lc-back').hidden`))) throw Error('The first step has nothing before it.');
  await next('wonder');
  // Stopping distance. Brian's "Stuck?" offer comes after 12 s, under his words, which stay.
  await at('word-stopping'); const words = await bubble(); await shot('word-stopping');
  await c.waitFor(`!document.querySelector('.lc-nudge').hidden && document.querySelector('.lc-nudge').textContent.includes('Stuck? Press H')`, 'the stuck offer shows under Brian’s words', 20_000);
  if (await bubble() !== words) throw Error('The stuck offer replaced Brian’s words.');
  await shot('word-stopping-stuck');
  await press('Space'); await at('word-stopping', 's.ready'); await shot('word-stopping-done');
  if (!(await c.evaluate(`document.querySelector('.lc-nudge').hidden`))) throw Error('The offer should go once the player acts.');
  await next('word-stopping');
  await at('word-weight'); await shot('word-weight'); await press('Space'); await wait(700); await shot('word-weight-braking'); await at('word-weight', 's.ready');
  // Backspace goes back one step, which stays done; Enter comes forward again.
  await press('Backspace'); await at('word-stopping', 's.ready'); await shot('previous-step'); await press('Enter');
  await next('word-weight');
  await at('word-balance'); await shot('word-balance'); await press('ArrowRight', 2); await at('word-balance', 's.ready'); await shot('word-balance-done');
  await next('word-balance');
  await at('watch'); await wait(1300); await shot('watch-braking'); await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // Twice the speed: Space at 50 mph says to turn the dial; 100 mph, a wrong guess says why.
  await at('try-speed'); await shot('try-speed'); await press('Space'); await saying('press ↑ until the dial reads 100', 'the wrong speed says why');
  await press('ArrowUp', 5); await prompt('100 mph', 'the dial reads 100'); await press('Space'); await at('try-speed', 's.cards === 3'); await shot('try-speed-guess');
  await press('Digit1'); await at('try-speed', 's.ready'); await saying('Twice the speed needs four times the road', 'a wrong guess says why'); await shot('try-speed-done');
  await next('try-speed');
  // A steady back: brake as it is (the back slides), one click on the lever, then → and brake again.
  await at('try-slide'); await shot('try-slide'); await press('Space'); await saying('The back slid: its brakes did 50%', 'the slide says why'); await wait(300); await shot('try-slide-slid');
  const lever = await toScreen(910, 280);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: lever.x, y: lever.y, button: 'left', buttons: 1, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: lever.x, y: lever.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await prompt('60% front', 'the click on the lever moves it toward the front');
  if (await c.evaluate(`document.querySelector('.lc-back').hidden`)) throw Error('Previous step should show after the first step.');
  await press('ArrowRight'); await press('Space'); await at('try-slide', 's.ready'); await shot('try-slide-steady');
  await next('try-slide');
  // Brian's job: too fast at the first corner, then right; Show me on the second; the third by hand.
  await at('alone'); await shot('alone'); await press('ArrowUp', 2); await press('Space'); await saying('past the corner', 'too fast says why'); await shot('alone-too-fast');
  await press('ArrowDown'); await press('Space'); await saying('Next corner', 'corner one passes');
  for (let i = 0; i < 3 && !(await c.evaluate(`${state}?.help === 3`)); i++) await press('KeyH');
  await wait(1500); await shot('alone-show-me');
  await saying('Right: 100 mph', 'Show me sets and brakes the second corner');
  await press('ArrowUp', 2); await press('Space'); await at('alone', 's.ready'); await shot('alone-done');
  if (!(await bubble()).includes('60, 100 and 120 mph')) throw Error('The job should end on its three speeds: ' + await bubble());
  await next('alone');
  for (const [step, answer] of [['check-four', 'Digit2'], ['check-balance', 'Digit3'], ['check-game', 'Digit1']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(500); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(800); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  if (!(await c.evaluate(`!window.__qaApp.profile.lab?.done?.braking && ['braking-word-0', 'braking-word-1', 'braking-word-2'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-actions button')].some(b => b.textContent.includes('Finish the lesson'))`))) throw Error('The last step should say Finish the lesson.');
  // Enter finishes: the lesson's own runs pass the bench's goal; Brian says what it opened, and Enter goes back to the Lab.
  await press('Enter');
  await c.waitFor(`window.__qaApp.profile.lab?.done?.braking === true`, 'Braking passes and is saved', 10_000);
  await saying('Brake balance is open on the Tune page', 'Brian says what the pass opened'); await wait(500); await shot('passed-classroom');
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom')`, 'back to the Lab', 10_000);
  await shot('passed');
  await c.evaluate(`window.__qaApp.closeLab()`);
  await c.waitFor(`window.__qaApp.labOpen === false`, 'back to the menu', 10_000);
  await c.evaluate(`document.querySelector('#garage-open').click()`);
  await c.waitFor(`!!document.querySelector('.tune-panel')`, 'the Tune page in the garage', 20_000);
  await c.evaluate(`document.querySelector('.tune-panel summary').click()`);
  const row = await c.evaluate(`(() => { const row = document.querySelector('.tune-row[data-tune-row="brakes"]'); return row ? {shut: row.classList.contains('shut'), text: row.textContent} : null; })()`);
  if (!row || row.shut) throw Error(`Brake balance should be open on the Tune page: ${JSON.stringify(row)}`);
  await c.evaluate(`document.querySelector('.tune-row[data-tune-row="brakes"]').scrollIntoView({block: 'center'})`);
  await shot('tune-brakes-open');
}
