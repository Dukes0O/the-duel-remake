// LAB-CLASSROOM-ALTITUDE: the Air and altitude classroom played by keyboard (and one mouse drag of the lever),
// from the Lab map to the helicopter challenge, on the harness's memory-only origin. Walking up to a machine is covered by
// tools/scenarios/lab-classroom.mjs.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
  await play(c);
}

const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyW: ['w', 87], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};

async function play(c) {
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Altitude QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const bubble = `document.querySelector('.lc-bubble')?.textContent ?? ''`;
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type, extra = {}) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], ...extra});
  const press = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(250); };
  // Held like a real key: one press, then the keyboard's repeats.
  const hold = async (code, repeats = 12) => { await key(code, 'keyDown'); for (let i = 0; i < repeats; i++) { await wait(40); await key(code, 'keyDown', {autoRepeat: true}); } await key(code, 'keyUp'); await wait(250); };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 30_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const says = async (words, label) => { await c.waitFor(`(${bubble}).includes(${JSON.stringify(words)})`, label, 15_000); };
  const sums = (words, label) => c.waitFor(`[...document.querySelectorAll('.lc-worked')].some(e => e.textContent.includes(${JSON.stringify(words)}))`, label, 5_000);
  const noSums = async (words, label) => { if (await c.evaluate(`document.querySelector('.lc-formulas')?.textContent.includes(${JSON.stringify(words)})`)) throw Error(label); };
  const prompt = (words, label) => c.waitFor(`document.querySelector('.lc-prompt')?.textContent.includes(${JSON.stringify(words)})`, label, 15_000);
  const questionShows = async step => { if (!(await c.evaluate(`(() => { const p = document.querySelector('.lc-page').getBoundingClientRect(), b = document.querySelector('.lc-bubble').getBoundingClientRect(); return b.top >= p.top - 1 && (b.bottom <= p.bottom + 1 || b.height > p.height); })()`))) throw Error(`${step}: Brian's question is cut off.`); };

  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="rotor-stand"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(3500); await shot('wonder');
  await next('wonder');
  await at('word-altitude'); await press('ArrowUp'); await says('Panorama Ridge is 860 m', 'the Ridge'); await press('ArrowUp');
  await at('word-altitude', 's.ready'); await wait(400); await shot('word-altitude');
  await sums('2,860 m − 0 m', 'the altitude sum follows the stand');
  await press('ArrowDown'); await sums('860 m − 0 m', 'the stand stays free after the answer'); await press('ArrowUp');
  await next('word-altitude');
  await at('word-density'); await shot('word-density-empty'); await press('Space'); await at('word-density', 's.ready'); await wait(300); await shot('word-density');
  await press('ArrowDown'); await sums('= 0.92', 'the jar and the sum follow the stand'); await press('ArrowUp');
  await next('word-density');
  await at('word-thin'); await press('Space'); await at('word-thin', 's.ready'); await wait(300); await shot('word-thin');
  await next('word-thin');
  await at('watch'); await wait(5000); await shot('watch-ridge');
  await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // The guided try: Brian's help climbs to his pointer, Show me takes the stand up, then a wrong guess and why.
  await at('try-car'); await shot('try-car');
  for (const rung of [1, 2, 3]) { await press('KeyH'); await at('try-car', `s.help === ${rung}`); }
  await wait(700); await shot('try-car-show-me');
  await at('try-car', 's.cards === 2'); await questionShows('try-car'); await noSums('2,777', 'The panel gave away the push before the guess.'); await shot('try-car-guess');
  await press('Digit1'); await hold('KeyW', 12);
  await at('try-car', 's.ready'); await says('133 kg too heavy', 'the reason with the numbers'); await wait(300); await shot('try-car-wrong-guess');
  await next('try-car');
  // The lever try: up the mountain by keys, the guess, then the mouse drags the lever onto the red line.
  await at('try-lever'); await press('ArrowUp'); await press('ArrowUp'); await at('try-lever', 's.cards === 3'); await questionShows('try-lever'); await noSums('59%', 'The panel gave away the red line before the guess.'); await shot('try-lever-guess');
  await press('Digit3');
  const lever = await c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    const left = r.left + (r.width - 1000 * s) / 2, top = r.top + (r.height - 680 * s) / 2, y = share => top + (560 - share * 360) * s;
    return {x: left + 300 * s, from: y(0), to: y(.6)}; })()`);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: lever.x, y: lever.from, button: 'left', buttons: 1, clickCount: 1});
  for (let k = 1; k <= 6; k++) { await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: lever.x, y: lever.from + (lever.to - lever.from) * k / 6, button: 'left', buttons: 1}); await wait(40); }
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: lever.x, y: lever.to, button: 'left', buttons: 0, clickCount: 1});
  await at('try-lever', 's.ready'); await says('Correct, the red line is at 59%', 'the lever at the summit'); await wait(300); await shot('try-lever-right');
  await next('try-lever');
  // The free test: the height and the load move the sums at once, and three different settings open Continue.
  await at('try-free'); await shot('try-free');
  await press('ArrowUp'); await sums('3,513 kg', 'the height moves the sum');
  await press('Digit1'); await sums('1,630 kg + 1 × 500 kg = 2,130 kg', 'the load moves the sum'); await shot('try-free-set');
  await press('Space'); await wait(800); await shot('try-free-running'); await says('Change a setting', 'the first test says its result');
  await press('ArrowUp'); for (let i = 0; i < 4; i++) await press('Digit1');
  await press('Space'); await prompt('tested so far: 2', 'two settings counted'); await shot('try-free-too-heavy');
  await press('ArrowDown'); await press('ArrowDown'); await press('Space'); await at('try-free', 's.ready'); await wait(300); await shot('try-free-three');
  await next('try-free');
  // Brian's job: three crates at Sea level leave room for one more; then four, three and two.
  await at('alone'); for (let i = 0; i < 3; i++) await press('Digit1');
  await press('Space'); await says('room for 757 kg more', 'room for more'); await shot('alone-room-for-more');
  await press('Digit1'); await press('Space'); await says('The next delivery is at Panorama Ridge', 'the Ridge delivery');
  for (let i = 0; i < 3; i++) await press('Digit1');
  await press('Space'); await says('The next delivery is at Summit Run', 'the summit delivery');
  for (let i = 0; i < 2; i++) await press('Digit1');
  await press('Space'); await at('alone', 's.ready'); await wait(300); await shot('alone-pass');
  await next('alone');
  for (const [step, answer] of [['check-why', 'Digit1'], ['check-car', 'Digit2'], ['check-game', 'Digit1']]) {
    await at(step); await wait(300); await questionShows(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(800); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  // Teaching writes the notebook words and never passes the lesson by itself.
  if (!(await c.evaluate(`!window.__qaApp.profile.lab.done.altitude && ['altitude-altitude', 'altitude-air-density', 'altitude-thin-air'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  // The game challenge goes through the Lab's own path: the helicopter starts with the key idea card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.heliSession?.view?.()?.challenge?.id === 'altitude'`, 'altitude challenge in the helicopter', 60_000);
  await c.waitFor(`!document.querySelector('.lab-key-idea')?.hidden && document.querySelector('.lab-key-idea')?.textContent.includes('Thinner air gives the rotor less to push against.')`, 'key idea card');
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
