// LAB-CLASSROOM-LIFT: the Lift and weight classroom played by keyboard alone, from the Lab map to the
// helicopter challenge, on the harness's memory-only origin. Walking up to a machine is covered by
// tools/scenarios/lab-classroom.mjs.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await play(c);
}

const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyW: ['w', 87], KeyS: ['s', 83],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};

async function play(c) {
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Lift QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type, extra = {}) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], ...extra});
  const press = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(250); };
  // Held like a real key: one press, then the keyboard's repeats.
  const hold = async (code, repeats = 12) => { await key(code, 'keyDown'); for (let i = 0; i < repeats; i++) { await wait(40); await key(code, 'keyDown', {autoRepeat: true}); } await key(code, 'keyUp'); await wait(250); };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 30_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };

  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="weighing-pad"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(3500); await shot('wonder-strain'); await wait(3000); await shot('wonder-lifts');
  await next('wonder');
  await at('word-weight'); await shot('word-weight'); await press('Digit1'); await at('word-weight', 's.ready'); await wait(400); await shot('word-weight-crate');
  await next('word-weight');
  await at('word-lift'); await press('Space'); await at('word-lift', 's.ready'); await wait(600); await shot('word-lift');
  await next('word-lift');
  await at('word-collective'); await press('KeyW'); await at('word-collective', 's.ready'); await wait(400); await shot('word-collective');
  await next('word-collective');
  await at('word-hover'); await hold('KeyW'); await at('word-hover', 's.ready'); await wait(1600); await shot('word-hover');
  await next('word-hover');
  await at('watch-lever'); await wait(7000); await shot('watch-lever-climbs');
  await at('watch-lever', 's.ready'); await shot('watch-lever');
  await next('watch-lever');
  await at('watch-loads', 's.ready'); await shot('watch-loads');
  await next('watch-loads');
  // The guided try: Brian's help climbs to his pointer, Show me hooks the car, then a wrong guess and why.
  await at('try-car'); await shot('try-car');
  for (const rung of [1, 2, 3]) { await press('KeyH'); await at('try-car', `s.help === ${rung}`); }
  await wait(700); await shot('try-car-show-me');
  await at('try-car', 's.cards === 2'); await shot('try-car-guess');
  await press('Digit2'); await hold('KeyW', 10);
  await at('try-car', 's.ready'); await wait(300); await shot('try-car-wrong-guess');
  await next('try-car');
  await at('try-heavy'); await press('Digit1'); await press('Digit1'); await at('try-heavy', 's.cards === 2');
  await press('Digit2'); await hold('KeyW', 12);
  await at('try-heavy', 's.ready'); await shot('try-heavy-right');
  await next('try-heavy');
  // Brian's job: the Dusthawk alone has room to spare; one crate more is the answer.
  await at('alone'); await hold('KeyW', 10); await at('alone', 's.help === 1'); await shot('alone-room-for-more');
  await press('Digit1'); await hold('KeyW', 10); await at('alone', 's.ready'); await wait(300); await shot('alone-pass');
  await next('alone');
  for (const [step, answer] of [['check-heavy', 'Digit3'], ['check-more', 'Digit1'], ['check-game', 'Digit2']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(1200); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  // The game challenge goes through the Lab's own path: the helicopter starts with the key idea card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.heliSession?.view?.()?.challenge?.id === 'lift'`, 'lift challenge in the helicopter', 60_000);
  await c.waitFor(`!document.querySelector('.lab-key-idea')?.hidden && document.querySelector('.lab-key-idea')?.textContent.includes('Lift must match weight.')`, 'key idea card');
  await wait(1500); await shot('challenge');
}
