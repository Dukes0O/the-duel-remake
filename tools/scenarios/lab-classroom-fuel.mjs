// LAB-CLASSROOM-FUEL: the Fuel and weight classroom played by keyboard (and one mouse click on the tap), from the Lab
// map's click-to-go to the wind tunnel, through Brian's job, to the pass and the Fuel load row open on the Tune page.
// Memory-only saves.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Fuel QA');
    a.profile = {...a.profile, drivingLessons: {version: 1, done: {corner: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.hidden = true); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyE: ['e', 69], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39],
    Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async (code, times = 1) => { for (let i = 0; i < times; i++) { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(times > 1 ? 90 : 250); } };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 40_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const bubble = () => c.evaluate(`document.querySelector('.lc-bubble').textContent`);
  const saying = (text, label) => c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000);
  const worked = text => c.evaluate(`[...document.querySelectorAll('.lc-worked')].some(e => e.textContent.includes(${JSON.stringify(text)}))`);
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1320, r.height / 680);
    return {x: r.left + (r.width - 1320 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);

  // The Lab map's click-to-go takes the player to the wind tunnel; E uses it and the Fuel lesson opens as a classroom.
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="wind-tunnel"]').click()`);
  await c.waitFor(`${canvas}.dataset.labWalkArrived === 'wind-tunnel'`, 'walk to tunnel', 30_000);
  await press('KeyE');
  await c.waitFor(`!!document.querySelector('[data-lab-lesson="start:fuel"]')`, 'tunnel choices');
  await c.evaluate(`document.querySelector('[data-lab-lesson="start:fuel"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(1900); await shot('wonder-racing'); await at('wonder', 's.ready'); await shot('wonder');
  await next('wonder');
  // The litre comes first, because the fuel load is measured in litres.
  await at('word-litre'); await shot('word-litre'); await press('Space'); await at('word-litre', 's.ready'); await shot('word-litre-done');
  await next('word-litre');
  await at('word-kilogram'); await shot('word-kilogram'); await press('Digit1'); await wait(300); await shot('word-kilogram-water'); await press('Digit2'); await at('word-kilogram', 's.ready'); await shot('word-kilogram-done');
  await next('word-kilogram');
  // Fuel load: ↑ fills the empty tank, 5 litres a press, and the sum follows every press; the step stays open after it.
  await at('word-fuel-load'); await shot('word-fuel-load'); await press('ArrowUp', 5); await wait(200);
  if (!(await worked('25 litres × 0.74 kg per litre = 18.5 kg'))) throw Error('The sum did not follow the gauge.');
  await shot('word-fuel-load-pouring'); await press('ArrowUp', 9); await at('word-fuel-load', 's.ready'); await shot('word-fuel-load-full');
  await press('ArrowDown'); await wait(200);
  if (!(await worked('65 litres × 0.74 kg per litre = 48.1 kg'))) throw Error('The tank should stay open after the word.');
  await next('word-fuel-load');
  // Speed and acceleration: the race draws the graph.
  await at('word-speed'); await shot('word-speed'); await press('Space'); await wait(2400); await shot('word-speed-racing'); await at('word-speed', 's.ready'); await saying('8.49 m/s²', 'the race shows the acceleration'); await shot('word-speed-done');
  await next('word-speed');
  await at('watch'); await wait(1800); await shot('watch-draining'); await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // The free test: the gauge and the car move the sums at once, and three different settings open Continue.
  await at('try-free'); await shot('try-free');
  await press('ArrowDown', 7); await wait(200);
  if (!(await worked('10,617 N ÷ 1,224.1 kg = 8.673 m/s'))) throw Error('The sums did not follow the gauge.');
  await press('ArrowRight'); await wait(200); await shot('try-free-set');
  if (!(await worked('7,329 N ÷ 784.1 kg = 9.347 m/s'))) throw Error('The sums did not follow the car.');
  await press('Space'); await wait(1400); await shot('try-free-racing'); await saying('test a different one', 'the first race says its result');
  await press('ArrowRight', 2); await press('Space'); await c.waitFor(`document.querySelector('.lc-prompt')?.textContent.includes('tested 2 of 3')`, 'two settings counted', 15_000); await wait(300);
  await press('ArrowDown', 7); await press('Space'); await at('try-free', 's.ready'); await shot('try-free-three');
  await next('try-free');
  // Half a tank: one mouse click on the tap, then ↓; racing at 55 litres says why, then 35 wins.
  await at('try-half'); await shot('try-half');
  const tap = await toScreen(347, 446);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: tap.x, y: tap.y, button: 'left', buttons: 1, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: tap.x, y: tap.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await c.waitFor(`document.querySelector('.lc-prompt').textContent.includes('65 litres')`, 'the click on the tap pours 5 litres out');
  await press('ArrowDown', 2); await press('Space'); await saying('55 litres is more than half', 'a wrong pour says why'); await shot('try-half-wrong');
  await press('ArrowDown', 4); await press('Space'); await at('try-half', 's.ready'); await wait(300); await shot('try-half-right');
  if (!(await bubble()).startsWith('A tank holding 35 litres, half of 70, carries 25.9 kg')) throw Error('Half a tank did not win: ' + await bubble());
  await next('try-half');
  // By mass: one press too many, Space weighs it and Brian says how far off; ↑ and Space again.
  await at('try-weigh'); await shot('try-weigh'); await press('ArrowDown', 5); await press('Space');
  await saying('3.7 kg too light', 'a wrong weighing says how far off'); await shot('try-weigh-wrong');
  await press('ArrowUp'); await press('Space'); await at('try-weigh', 's.ready'); await shot('try-weigh-done');
  await next('try-weigh');
  // Brian's job: a full tank on race one carries too much; then the least that lasts; Show me on race two.
  await at('alone'); await shot('alone'); await press('Space'); await saying('extra mass', 'too much fuel says why'); await shot('alone-too-much');
  await press('ArrowDown', 7); await press('Space'); await saying('The next race is three quarters', 'race one passes');
  for (const rung of [1, 2, 3]) { await press('KeyH'); await at('alone', `s.help === ${rung}`); }
  await wait(1000); await shot('alone-show-me');
  await saying('The next race is a whole Grand Prix', 'Show me pours and races');
  await press('ArrowDown'); await press('Space'); await at('alone', 's.ready'); await shot('alone-done');
  await next('alone');
  for (const [step, answer] of [['check-water', 'Digit1'], ['check-race', 'Digit2'], ['check-game', 'Digit1']]) {
    await at(step); await wait(300); await shot(step);
    if (!(await c.evaluate(`(() => { const p = document.querySelector('.lc-page').getBoundingClientRect(), b = document.querySelector('.lc-bubble').getBoundingClientRect(); return b.top >= p.top - 1 && (b.bottom <= p.bottom + 1 || b.height > p.height); })()`))) throw Error(`${step}: Brian's question is cut off.`);
    await press(answer); await at(step, 's.ready'); await wait(step === 'check-race' ? 3800 : 600); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(800); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  if (!(await c.evaluate(`!window.__qaApp.profile.lab?.done?.fuel && ['fuel-word-0', 'fuel-word-1', 'fuel-word-2'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-actions button')].some(b => b.textContent.includes('Finish the lesson'))`))) throw Error('The last step should say Finish the lesson.');
  // Enter finishes: the lesson's own races pass the bench's goal; Brian says what it opened, and Enter goes back to the Lab.
  await press('Enter');
  await c.waitFor(`window.__qaApp.profile.lab?.done?.fuel === true`, 'Fuel passes and is saved', 10_000);
  await saying('Fuel load is now open on the Tune page', 'Brian says what the pass opened'); await wait(500); await shot('passed-classroom');
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom')`, 'back to the Lab', 10_000);
  await c.waitFor(`[...document.querySelectorAll('.lab-message')].some(el => el.textContent.includes('Tune page'))`, 'the pass points at the Tune page', 10_000);
  await shot('passed');
  await c.evaluate(`window.__qaApp.closeLab()`);
  await c.waitFor(`window.__qaApp.labOpen === false`, 'back to the menu', 10_000);
  await c.evaluate(`document.querySelector('#garage-open').click()`);
  await c.waitFor(`!!document.querySelector('.tune-panel')`, 'the Tune page in the garage', 20_000);
  await c.evaluate(`document.querySelector('.tune-panel summary').click()`);
  const fuel = await c.evaluate(`(() => { const row = document.querySelector('.tune-row[data-tune-row="fuel"]'); return row ? {shut: row.classList.contains('shut'), text: row.textContent} : null; })()`);
  if (!fuel || fuel.shut) throw Error(`Fuel load should be open on the Tune page: ${JSON.stringify(fuel)}`);
  await c.evaluate(`document.querySelector('.tune-row[data-tune-row="fuel"]').scrollIntoView({block: 'center'})`);
  await shot('tune-fuel-open');
}
