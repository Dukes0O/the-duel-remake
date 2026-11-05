// LAB-CLASSROOM-LIFT: the Lift and weight classroom played by keyboard (and one mouse drag of the lever),
// from the Lab map to the helicopter challenge, on the harness's memory-only origin. Walking up to a machine is covered by
// tools/scenarios/lab-classroom.mjs.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
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
  const worked = text => c.evaluate(`[...document.querySelectorAll('.lc-worked')].some(e => e.textContent.includes(${JSON.stringify(text)}))`);
  const saying = (text, label) => c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000);
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
  await at('word-weight'); await shot('word-weight');
  if (!(await worked('15,990.3 N'))) throw Error('The weight in newtons is not in the panel.');
  await press('Digit1'); await at('word-weight', 's.ready'); await wait(400); await shot('word-weight-crate');
  if (!(await worked('20,895.3 N'))) throw Error('The sums did not follow the crate.');
  await next('word-weight');
  await at('word-lift'); await press('Space'); await at('word-lift', 's.ready'); await wait(600); await shot('word-lift');
  await next('word-lift');
  await at('word-collective'); await shot('word-collective-start'); await press('KeyW'); await at('word-collective', 's.ready'); await wait(400); await shot('word-collective');
  await next('word-collective');
  // The mouse: drag the lever's handle up onto the red line (it clicks on when close).
  await at('word-hover');
  const lever = await c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    const left = r.left + (r.width - 1000 * s) / 2, top = r.top + (r.height - 680 * s) / 2, y = kg => top + (575 - kg * 425 / 4000) * s;
    return {x: left + 100 * s, from: y(1500), to: y(1600)}; })()`);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: lever.x, y: lever.from, button: 'left', buttons: 1, clickCount: 1});
  for (let k = 1; k <= 5; k++) { await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: lever.x, y: lever.from + (lever.to - lever.from) * k / 5, button: 'left', buttons: 1}); await wait(40); }
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: lever.x, y: lever.to, button: 'left', buttons: 0, clickCount: 1});
  await at('word-hover', 's.ready'); await wait(1600); await shot('word-hover');
  await next('word-hover');
  await at('watch-lever'); await wait(7000); await shot('watch-lever-climbs');
  await at('watch-lever', 's.ready'); await shot('watch-lever');
  await next('watch-lever');
  await at('watch-loads', 's.ready'); await shot('watch-loads');
  await next('watch-loads');
  // The free test: the load and the lever move the sums at once, repeats do not count, and three settings open Continue.
  await at('try-free'); await shot('try-free');
  await press('KeyW'); await press('KeyW');
  if (!(await worked('0.2573 × 3,887 kg = 1,000 kg'))) throw Error('The sums did not follow the lever.');
  await press('Space'); await saying('Change a setting', 'the first test says its result'); await wait(200); await shot('try-free-first');
  await press('Space'); await saying('already tested', 'a repeat does not count');
  await press('Digit3');
  if (!(await worked('2,910 kg ÷ 3,887 kg = 0.7486'))) throw Error('The sums did not follow the load.');
  await hold('KeyW', 10); await wait(1800); await press('Space'); await saying('hovers', 'the second test says its result'); await wait(200); await shot('try-free-hover');
  await press('Digit1'); await press('Digit1'); await hold('KeyW', 12); await wait(1800); await press('Space'); await at('try-free', 's.ready'); await wait(300); await shot('try-free-three');
  await next('try-free');
  // The guided try: Brian's help climbs to his pointer, Show me hooks the car, then a wrong guess and why.
  await at('try-car'); await shot('try-car');
  for (const rung of [1, 2, 3]) { await press('KeyH'); await at('try-car', `s.help === ${rung}`); }
  await wait(700); await shot('try-car-show-me');
  await at('try-car', 's.cards === 2'); await shot('try-car-guess');
  await press('Digit2'); await hold('KeyW', 10);
  await at('try-car', 's.ready'); await wait(300); await shot('try-car-wrong-guess');
  await next('try-car');
  await at('try-heavy'); await press('Digit1'); await press('Digit1'); await at('try-heavy', 's.cards === 2'); await shot('try-heavy-guess');
  await press('Digit2'); await hold('KeyW', 12);
  await at('try-heavy', 's.ready'); await shot('try-heavy-right');
  await next('try-heavy');
  // Brian's job: the Dusthawk alone has room to spare; one crate more is the answer.
  await at('alone'); await hold('KeyW', 10); await at('alone', 's.help === 1'); await shot('alone-room-for-more');
  await press('Digit1'); await hold('KeyW', 10); await at('alone', 's.ready'); await wait(300); await shot('alone-pass');
  await next('alone');
  for (const [step, answer] of [['check-heavy', 'Digit3'], ['check-more', 'Digit1'], ['check-game', 'Digit2']]) {
    await at(step); await wait(300); await shot(step);
    if (!(await c.evaluate(`(() => { const p = document.querySelector('.lc-page').getBoundingClientRect(), b = document.querySelector('.lc-bubble').getBoundingClientRect(); return b.top >= p.top - 1 && (b.bottom <= p.bottom + 1 || b.height > p.height); })()`))) throw Error(`${step}: Brian's question is cut off.`);
    if (await c.evaluate(`document.querySelectorAll('.lc-worked').length > 0`)) throw Error(`${step}: the panel shows a worked sum while the question is open.`);
    await press(answer); await at(step, 's.ready'); await wait(1200); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-past h4')].some(e => e.textContent === 'The collective lever') && document.querySelector('.lc-past').textContent.includes('Newton’s third law')`))) throw Error('Earlier words did not stay on the page.');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  // Teaching writes the notebook words and never passes the lesson by itself.
  if (!(await c.evaluate(`!window.__qaApp.profile.lab.done.lift && ['lift-weight', 'lift-lift', 'lift-collective', 'lift-hover'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  // The game challenge goes through the Lab's own path: the helicopter starts with the key idea card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.heliSession?.view?.()?.challenge?.id === 'lift'`, 'lift challenge in the helicopter', 60_000);
  await c.waitFor(`!document.querySelector('.lab-key-idea')?.hidden && document.querySelector('.lab-key-idea')?.textContent.includes('Lift must match weight.')`, 'key idea card');
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
