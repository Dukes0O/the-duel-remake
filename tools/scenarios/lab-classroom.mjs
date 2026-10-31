// LAB-CLASSROOM: the pendulum classroom played by keyboard alone, from walking up to the machine
// to the recap, on the harness's memory-only origin.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await play(c);
}

const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], Escape: ['Escape', 27], KeyH: ['h', 72], KeyE: ['e', 69], KeyW: ['w', 87], KeyA: ['a', 65],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51], Digit5: ['5', 53]};

async function play(c) {
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Classroom QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const shot = name => c.screenshot(name);
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); await new Promise(r => setTimeout(r, 250)); };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 30_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };

  // Walk to the pendulum frame with the real walk keys, then E, as the Flying lessons scenario does.
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  for (const [code, expression] of [['KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < -3.95`], ['KeyA', `JSON.parse(${canvas}.dataset.labWalkPosition)[0] < -6.7`]]) {
    await c.evaluate(`${canvas}.focus()`);
    await key(code, 'keyDown');
    try { await c.waitFor(expression, `walk ${code}`, 18_000); } finally { await key(code, 'keyUp'); }
    await new Promise(r => setTimeout(r, 500));
  }
  await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the Pendulums')`, 'pendulum machine');
  await press('KeyE');
  await at('wonder');
  // Esc leaves the lesson for the room (not the whole Lab); Brian comes to stand by the machine;
  // the Lab map's click-to-go opens the lesson again.
  await press('Escape');
  await c.waitFor(`!document.querySelector('.lab-classroom') && !document.querySelector('.lab-has-lesson') && window.__qaApp.labOpen === true`, 'Esc back to walking');
  await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent === 'E: ask Brian'`, 'Brian beside the pendulum');
  await c.evaluate(`document.querySelector('[data-go="pendulum-frame"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await new Promise(r => setTimeout(r, 3000)); await shot('wonder');
  await next('wonder');
  await at('word-pendulum'); await new Promise(r => setTimeout(r, 600)); await shot('word-pendulum');
  await press('Space'); await new Promise(r => setTimeout(r, 1800)); await shot('word-pendulum-swinging');
  await next('word-pendulum');
  // Tap along: early taps are explained, a tap on the return counts.
  await at('word-swing-time');
  for (let i = 0; i < 60 && !(await c.evaluate(`${state}.ready`)); i++) { await press('Space'); await new Promise(r => setTimeout(r, 120)); }
  await shot('word-swing-time');
  await next('word-swing-time');
  await at('word-length'); await press('Digit1'); await shot('word-length-wrong'); await press('Digit3'); await shot('word-length');
  await next('word-length');
  await at('watch-lengths'); await new Promise(r => setTimeout(r, 5000)); await shot('watch-lengths-running');
  await at('watch-lengths', 's.ready'); await new Promise(r => setTimeout(r, 400)); await shot('watch-lengths');
  await next('watch-lengths');
  await at('watch-weights', 's.ready'); await shot('watch-weights');
  await next('watch-weights');
  // The guided try: Brian's help climbs to his pointer, then the set-up, a wrong guess and why.
  await at('try-short'); await shot('try-short');
  for (const rung of [1, 2, 3]) { await press('KeyH'); await at('try-short', `s.help === ${rung}`); }
  await new Promise(r => setTimeout(r, 700)); await shot('try-short-show-me');
  // Show me: Brian's pointer presses the 5 m hook and hands the guess back.
  await at('try-short', 's.cards === 3'); await shot('try-short-guess');
  await press('Digit2'); await press('Space');
  await at('try-short', 's.ready'); await new Promise(r => setTimeout(r, 300)); await shot('try-short-wrong-guess');
  await next('try-short');
  await at('try-heavy'); await press('Digit5'); await at('try-heavy', 's.cards === 3'); await press('Digit3'); await press('Space');
  await at('try-heavy', 's.ready'); await shot('try-heavy-right');
  await next('try-heavy');
  await at('alone'); await press('Space'); await at('alone', 's.help === 1'); await shot('alone-too-quick');
  await press('Digit3'); await press('Space'); await at('alone', 's.ready'); await shot('alone-pass');
  await next('alone');
  for (const step of ['check-slowest', 'check-heavy', 'check-settle']) {
    await at(step); await shot(step); await press('Digit2'); await at(step, 's.ready'); await new Promise(r => setTimeout(r, 600)); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await new Promise(r => setTimeout(r, 1500)); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  // The game challenge goes through the Lab's own path: the helicopter starts with the key idea card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.heliSession?.view?.()?.challenge?.id === 'pendulum'`, 'pendulum challenge in the helicopter', 60_000);
  await c.waitFor(`!document.querySelector('.lab-key-idea')?.hidden && document.querySelector('.lab-key-idea')?.textContent.includes('Length sets the swing time.')`, 'key idea card');
  await new Promise(r => setTimeout(r, 1500)); await shot('challenge');
}
