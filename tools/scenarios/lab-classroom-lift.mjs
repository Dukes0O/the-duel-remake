// LAB-CLASSROOM-LIFT: the Lift and weight classroom played by keyboard (and one mouse drag of the lever),
// from the Lab map to the helicopter challenge, on the harness's memory-only origin. Walking up to a machine is covered by
// tools/scenarios/lab-classroom.mjs.
// The window is 1920 x 1000 unless LAB_STAGE_SIZE says another (for example 1366x768); LAB_STAGE_LOG names a file that
// gets one line for the board's drawn size at each step that is measured.
import {appendFileSync} from 'node:fs';
import {targetPoint} from '../../src/lab/lessons/lift-board.js';

export async function run(c) {
  const [width, height] = (process.env.LAB_STAGE_SIZE ?? '1920x1000').split('x').map(Number);
  await c.command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  await play(c);
}

const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyW: ['w', 87], KeyS: ['s', 83],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};

async function play(c) {
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Lift QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  // The pointer is moved off the board first, so that a hover note does not sit over the picture in the shot.
  const shot = async name => { await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 3, y: 3, button: 'none', buttons: 0}); await new Promise(r => setTimeout(r, 120)); return c.screenshot(name); };
  const [windowWidth] = (process.env.LAB_STAGE_SIZE ?? '1920x1000').split('x').map(Number);
  const worked = text => c.evaluate(`[...document.querySelectorAll('.lc-worked')].some(e => e.textContent.includes(${JSON.stringify(text)}))`);
  // The physics panel starts hidden on a window narrower than 1500, so its sums are checked only where it is open.
  const sums = async (text, message) => { if (windowWidth >= 1500 && !(await worked(text))) throw Error(message); };
  const saying = (text, label) => c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // The strip under the board (the stage step): what it says, how tall it is and how tall the board is drawn. The board
  // holds the picture only; the readouts and tables are in the page.
  const strip = () => c.evaluate(`(() => {
    const s = document.querySelector('.lc-strip'), cv = document.querySelector('.lc-canvas').getBoundingClientRect(), k = Math.min(cv.width / 1000, cv.height / 680);
    const said = [...document.querySelectorAll('.lc-strip .lc-readout, .lc-strip .lc-parts li, .lc-strip .lc-rows p')].map(e => ([...e.children].length ? [...e.children].map(x => x.textContent).join(' ') : e.textContent).trim());
    return {shown: !!s && !s.hidden, height: s && !s.hidden ? Math.round(s.getBoundingClientRect().height) : 0, boardHeight: Math.round(680 * k), canvas: [Math.round(cv.width), Math.round(cv.height)], said,
      title: document.querySelector('.lc-strip .lc-table h4')?.textContent ?? null};
  })()`);
  const measure = async (label, expect = []) => {
    const m = await strip();
    if (process.env.LAB_STAGE_LOG) appendFileSync(process.env.LAB_STAGE_LOG, `${label}: strip ${m.height} px, board drawn ${m.boardHeight} px high (canvas ${m.canvas.join(' x ')})\n`);
    if (m.height > 86) throw Error(`${label}: the strip is ${m.height} px high, more than 86.`);
    for (const text of expect) if (!m.said.includes(text)) throw Error(`${label}: the strip does not say “${text}” (it says ${JSON.stringify(m.said)}).`);
    return m;
  };
  // The mouse on the real controls. A board point is turned into a window point the way the board is fitted, and the board's own
  // pixel there is read back, so that a control is proved to be drawn where it is pressed.
  const where = pt => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${pt[0]} * s, y: r.top + (r.height - 680 * s) / 2 + ${pt[1]} * s}; })()`);
  const pixel = async pt => { const w = await where(pt); return c.evaluate(`(() => { const cv = document.querySelector('.lc-canvas'), r = cv.getBoundingClientRect(); return [...cv.getContext('2d').getImageData(Math.round((${w.x} - r.left) * cv.width / r.width), Math.round((${w.y} - r.top) * cv.height / r.height), 1, 1).data]; })()`); };
  const click = async pt => {
    const w = await where(pt);
    await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: w.x, y: w.y, button: 'none', buttons: 0});
    await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: w.x, y: w.y, button: 'left', buttons: 1, clickCount: 1});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: w.x, y: w.y, button: 'left', buttons: 0, clickCount: 1});
    await wait(300);
  };
  // The helicopter and its load standing on the pad, as the lesson's view describes them.
  const spot = (action, crates = 0, car = 0) => targetPoint({flight: {crates, car, lift: 0, h: 0, taut: 0}}, action);
  const key = (code, type, extra = {}) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], ...extra});
  const press = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(250); };
  // Held like a real key: one press, then the keyboard's repeats.
  const hold = async (code, repeats = 12) => { await key(code, 'keyDown'); for (let i = 0; i < repeats; i++) { await wait(40); await key(code, 'keyDown', {autoRepeat: true}); } await key(code, 'keyUp'); await wait(250); };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 30_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };

  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="weighing-pad"]').click()`);
  await at('wonder');
  await measure('wonder (no strip)');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(3500); await shot('wonder-strain'); await wait(3000); await shot('wonder-lifts');
  await next('wonder');
  await at('word-weight'); await shot('word-weight');
  await measure('word-weight', ['Weight 1,630 kg', 'Kestrel One 1,630 kg']);
  await sums('15,990.3 N', 'The weight in newtons is not in the panel.');
  // The mouse on the stock of crates: the click lands on a crate that is drawn there (wood, not wall).
  const crateAt = await pixel(spot('crate:add').map((v, i) => v + (i ? -12 : 18)));
  if (!(crateAt[0] > crateAt[2] + 40)) throw Error(`The spare crates are not drawn where they are pressed (pixel ${crateAt}).`);
  await click(spot('crate:add')); await at('word-weight', 's.ready'); await wait(400); await shot('word-weight-crate');
  await measure('word-weight with a crate', ['Weight 2,130 kg', '1 crate 500 kg']);
  await sums('20,895.3 N', 'The sums did not follow the crate.');
  await next('word-weight');
  await at('word-lift'); await measure('word-lift before the rotor starts', ['Lift 0 kg']);
  await click(spot('rotor')); await at('word-lift', 's.ready'); await wait(600); await shot('word-lift');
  await measure('word-lift', ['Lift 500 kg']);
  await next('word-lift');
  await at('word-collective'); await shot('word-collective-start'); await press('KeyW'); await at('word-collective', 's.ready'); await wait(400); await shot('word-collective');
  await measure('word-collective', ['Lift 1,000 kg', 'Lever 26%']);
  // The tallest picture: the lever held at the top, so that the empty helicopter climbs to the ceiling with the longest lift arrow.
  for (let i = 0; i < 9; i++) await press('KeyW');
  await wait(5000); await shot('word-collective-tallest');
  await measure('word-collective at the top', ['Lift 3,887 kg', 'Lever 100%']);
  await next('word-collective');
  // The mouse: drag the lever's handle up onto the red line (it clicks on when close).
  await at('word-hover');
  const lever = await c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    const left = r.left + (r.width - 1000 * s) / 2, top = r.top + (r.height - 680 * s) / 2, y = kg => top + (575 - kg * 425 / 4000) * s;
    return {x: left + 80 * s, from: y(1500), to: y(1600)}; })()`);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: lever.x, y: lever.from, button: 'left', buttons: 1, clickCount: 1});
  for (let k = 1; k <= 5; k++) { await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: lever.x, y: lever.from + (lever.to - lever.from) * k / 5, button: 'left', buttons: 1}); await wait(40); }
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: lever.x, y: lever.to, button: 'left', buttons: 0, clickCount: 1});
  await at('word-hover', 's.ready'); await wait(1600); await shot('word-hover');
  await measure('word-hover', ['Lift 1,630 kg', 'Weight 1,630 kg', 'Lever 42%', 'Hovering']);
  await next('word-hover');
  await at('watch-lever'); await wait(7000); await shot('watch-lever-climbs');
  await at('watch-lever', 's.ready'); await shot('watch-lever');
  await measure('watch-lever', ['Less lift than weight stays down', 'Lift equal to weight hovers', 'More lift than weight climbs']);
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
  await at('try-heavy'); await press('Digit1'); await press('Digit1'); await at('try-heavy', 's.cards === 2'); await shot('try-heavy-guess');
  await press('Digit2'); await hold('KeyW', 12);
  await at('try-heavy', 's.ready'); await shot('try-heavy-right');
  await next('try-heavy');
  // The free test: the load and the lever move the sums at once, repeats do not count, and three settings open Continue.
  await at('try-free'); await shot('try-free');
  await measure('try-free', ['Lift 0 kg', 'Weight 1,630 kg', 'On the pad']);
  // Below 1500 wide the free test's bottom bar (seven buttons) already wraps and squeezes the page, so the run stops here.
  if (windowWidth < 1500) return;
  await press('KeyW'); await press('KeyW');
  await sums('0.2573 × 3,887 kg = 1,000 kg', 'The sums did not follow the lever.');
  await press('Space'); await saying('Change a setting', 'the first test says its result'); await wait(200); await shot('try-free-first');
  await press('Space'); await saying('already tested', 'a repeat does not count');
  // The Dusthawk is clicked where it is parked, and a click on a crate on the cable takes the crate off.
  const carAt = await pixel(spot('car'));
  if (!(carAt[0] > 100 && carAt[1] > 100)) throw Error(`The Dusthawk is not drawn where it is pressed (pixel ${carAt}).`);
  await click(spot('car'));
  await sums('2,910 kg ÷ 3,887 kg = 0.7486', 'The sums did not follow the load.');
  await hold('KeyW', 10); await wait(1800); await press('Space'); await saying('hovers', 'the second test says its result'); await wait(200); await shot('try-free-hover');
  await click(spot('crate:add', 0, 1)); await click(spot('crate:add', 1, 1)); await click(spot('crate:remove', 2, 1));
  await sums('1,150 + 80 + 400 + 1,280 + 500 = 3,410 kg', 'Clicking the crate on the cable did not take it off.');
  await click(spot('crate:add', 1, 1));
  await hold('KeyW', 12); await wait(1800); await press('Space'); await at('try-free', 's.ready'); await wait(300); await shot('try-free-three');
  const three = await measure('try-free with three results', ['Dusthawk + 2 crates at 100% stays down']);
  if (three.title !== 'Your results' || three.said.filter(t => / (stays down|hovers|climbs|sinks)$/.test(t)).length < 3) throw Error(`The results table is not in the strip: ${JSON.stringify(three.said)}`);
  await next('try-free');
  // Brian's job: the Dusthawk alone has room to spare; one crate more is the answer.
  await at('alone'); await hold('KeyW', 10); await at('alone', 's.help === 1'); await shot('alone-room-for-more');
  await press('Digit1'); await hold('KeyW', 10); await at('alone', 's.ready'); await wait(300); await shot('alone-pass');
  await next('alone');
  for (const [step, answer] of [['check-heavy', 'Digit3'], ['check-more', 'Digit1'], ['check-game', 'Digit2']]) {
    await at(step); await wait(300); await shot(step);
    if (!(await c.evaluate(`(() => { const p = document.querySelector('.lc-page').getBoundingClientRect(), b = document.querySelector('.lc-bubble').getBoundingClientRect(); return b.top >= p.top - 1 && (b.bottom <= p.bottom + 1 || b.height > p.height); })()`))) throw Error(`${step}: Brian's question is cut off.`);
    if (await c.evaluate(`document.querySelectorAll('.lc-worked').length > 0`)) throw Error(`${step}: the panel shows a worked sum while the question is open.`);
    await press(answer); await at(step, 's.ready'); await wait(1200); await shot(`${step}-answered`);
    await measure(`${step} answered`, step === 'check-game' ? ['Hovering'] : []);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  await measure('recap (no strip)');
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
