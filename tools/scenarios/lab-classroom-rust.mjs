// LAB-CLASSROOM-RUST: the Rust classroom played by keyboard (and one mouse click on the protection switch), from the
// Lab map's click-to-go to the nail jars, through Brian's job with Show me, to the parts panel and the pass.
// Memory-only saves.
const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], Backspace: ['Backspace', 8], Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};
const state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,lab-2');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Rust QA');
    a.profile = {...a.profile, drivingLessons: {version: 1, done: {corner: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.hidden = true); a.openLab(); })()`);
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

  // The Lab map's click-to-go takes the player to the nail jars, as a player's click does.
  const canvas = `document.querySelector('.lab-canvas')`;
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="nail-jars"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(2200); await shot('wonder-running'); await at('wonder', 's.ready'); await shot('wonder');
  if (!(await bubble()).includes('84% rust')) throw Error('The wonder should end on the salt-water nail: ' + await bubble());
  await next('wonder');
  for (const [step, said] of [['word-rust', '14% rust after a week'], ['word-salt', '6 times as much'], ['word-zinc', 'of the coat is left']]) {
    await at(step); await shot(step); await press('Space'); await wait(1600); await shot(`${step}-running`);
    await at(step, 's.ready'); await saying(said, `${step} reads its nail`); await shot(`${step}-done`);
    if (step === 'word-salt') { await press('Backspace'); await at('word-rust', 's.ready'); await press('Enter'); await at('word-salt', 's.ready'); }
    await press('Enter');
  }
  await at('watch'); await wait(2500); await shot('watch-running'); await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // Three days: Space at 7 days says to turn the dial; 3 days, a wrong guess says why.
  await at('try-days'); await shot('try-days'); await press('Space'); await saying('press ↓ until the dial reads 3', 'the wrong day says why');
  await press('ArrowDown', 4); await prompt('3 days', 'the dial reads 3'); await press('Space'); await at('try-days', 's.cards === 3'); await shot('try-days-guess');
  await press('Digit1'); await at('try-days', 's.ready'); await saying('salt water rusts 12% a day', 'a wrong guess says why'); await shot('try-days-done');
  await next('try-days');
  // The zinc: guess never (wrong), run on to day 25.
  await at('try-zinc', 's.cards === 3'); await shot('try-zinc-guess'); await press('Digit3');
  await press('Space'); await wait(5000); await shot('try-zinc-running'); await at('try-zinc', 's.ready'); await saying('Wearing away is the zinc', 'the wrong guess says why'); await shot('try-zinc-done');
  await next('try-zinc');
  // Brian's job: the trailer bare is too little; one click on the switch for zinc; Show me for the toolbox; the gate.
  await at('alone'); await shot('alone'); await press('Space'); await saying('not clean: press → for zinc', 'too little says why'); await wait(300); await shot('alone-too-little');
  const zinc = await toScreen(870, 262);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: zinc.x, y: zinc.y, button: 'left', buttons: 1, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: zinc.x, y: zinc.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await prompt('Zinc coat.', 'the click switches to zinc');
  await press('Space'); await saying('Next: the toolbox', 'the trailer is clean');
  for (let i = 0; i < 3 && !(await c.evaluate(`${state}?.help === 3`)); i++) await press('KeyH');
  await wait(1500); await shot('alone-show-me');
  await saying('Next: the garden gate', 'Show me sets and runs the toolbox');
  await press('ArrowRight'); await press('Space'); await at('alone', 's.ready'); await shot('alone-done');
  if (!(await bubble()).includes('Job done')) throw Error('The job should end done: ' + await bubble());
  await next('alone');
  for (const [step, answer] of [['check-five', 'Digit2'], ['check-zinc', 'Digit1'], ['check-sirena', 'Digit1']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(500); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(800); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  if (!(await c.evaluate(`!window.__qaApp.profile.lab?.done?.rust && ['rust-rust', 'rust-salt-water', 'rust-zinc-coat'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-actions button')].some(b => b.textContent.includes('Start the challenge'))`))) throw Error('The last step should say Start the challenge.');
  // Enter starts the challenge: the classroom closes on the parts panel with its card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && !!document.querySelector('[data-lab-protect="underbody"]') && !document.querySelector('.lab-key-idea').hidden`, 'the parts panel and its card', 15_000);
  await wait(500); await shot('challenge');
  await c.evaluate(`(() => { for (const [part, value] of Object.entries({underbody: 'zinc', exhaust: 'bare', armour: 'zinc'})) { const el = document.querySelector('[data-lab-protect="' + part + '"]'); el.value = value; el.dispatchEvent(new Event('change', {bubbles: true})); } document.querySelector('[data-lab="protect-check"]').click(); })()`);
  await c.waitFor(`window.__qaApp.profile.lab.done.rust === true`, 'Rust passes on the parts panel', 10_000);
  await wait(500); await shot('passed');
  await c.evaluate(`window.__qaApp.closeLab()`);
}
