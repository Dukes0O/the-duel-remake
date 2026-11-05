// LAB-CLASSROOM-FIRE: the Fire triangle classroom played by keyboard (and two mouse clicks: the retardant spray and
// one bucket drop), from the Lab map to the helicopter challenge, on the harness's memory-only origin. Walking up to a
// machine is covered by tools/scenarios/lab-classroom.mjs. Its wording follows LAB-CLASSROOM-LANGUAGE.md.
import {forestGrid, litFire, grown, frontCell, dropOn, JOB_HEAD_START, MIDDLE} from '../../src/lab/lessons/fire-classroom.js';
import {spreadStep} from '../../src/lab/benches/fire.js';

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
  await play(c);
}

const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37],
  ArrowRight: ['ArrowRight', 39], Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};
// Brian's job as his pointer plays it: the flames nearest the road each trip (the same rules the page runs).
function jobTargets() {
  const grid = forestGrid(), targets = [];
  let fire = grown(litFire(), grid, JOB_HEAD_START);
  while (fire.burning.length && targets.length < 12) {
    const cell = frontCell(fire);
    targets.push(cell);
    fire = dropOn(fire, grid, ...cell).fire;
    if (fire.burning.length) fire = spreadStep(fire, grid, null);
  }
  return targets;
}

async function play(c) {
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Fire QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const bubble = `document.querySelector('.lc-bubble')?.textContent ?? ''`;
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(250); };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 30_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const says = async (words, label) => { await c.waitFor(`(${bubble}).includes(${JSON.stringify(words)})`, label, 20_000); };
  const sum = (words, label) => c.waitFor(`[...document.querySelectorAll('.lc-worked')].some(e => e.textContent.includes(${JSON.stringify(words)}))`, label, 5_000);
  const questionShows = step => c.evaluate(`(() => { const p = document.querySelector('.lc-page').getBoundingClientRect(), b = document.querySelector('.lc-bubble').getBoundingClientRect(); return b.top >= p.top - 1 && (b.bottom <= p.bottom + 1 || b.height > p.height); })()`).then(ok => { if (!ok) throw Error(`${step}: Brian's question is cut off.`); });
  // A click at a point on the 1000 x 680 board.
  const click = async (bx, by) => {
    const p = await c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
      return {x: r.left + (r.width - 1000 * s) / 2 + ${bx} * s, y: r.top + (r.height - 680 * s) / 2 + ${by} * s}; })()`);
    await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', ...p, button: 'left', buttons: 1, clickCount: 1});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', ...p, button: 'left', buttons: 0, clickCount: 1});
    await wait(250);
  };

  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="fire-pit"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(1200); await shot('wonder-roaring');
  await at('wonder', 's.ready'); await shot('wonder');
  await next('wonder');
  // The words: wood in, gas on, lid shut, lid open, each by its number key.
  await at('word-fuel'); await shot('word-fuel-empty'); await press('Digit1'); await at('word-fuel', 's.ready'); await shot('word-fuel');
  await next('word-fuel');
  await at('word-heat'); await press('Digit2'); await at('word-heat', 's.ready'); await shot('word-heat');
  await next('word-heat');
  await at('word-oxygen'); await press('Digit3'); await at('word-oxygen', 's.ready'); await says('That is why my lid worked', 'the wonder answered'); await shot('word-oxygen');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-past h4')].map(e => e.textContent).join() === 'Why did the lid work?,Fuel,Heat,Oxygen'`))) throw Error('Earlier words should stay on the page.');
  await next('word-oxygen');
  await at('word-triangle'); await press('Digit3'); await at('word-triangle', 's.ready'); await shot('word-triangle');
  await next('word-triangle');
  await at('watch'); await wait(5600); await shot('watch-wood-out');
  await says('Each time one side was removed, the fire went out', 'the watch finding'); await shot('watch');
  await next('watch');
  // The free test: the rule follows every press at once; each setting gets its reason; three different settings open Continue.
  await at('try-free'); await shot('try-free');
  await press('Digit3'); await sum('oxygen no, so no fire', 'the sum follows the lid'); await says('There is no fire, because the shut lid', 'the lid’s reason'); await shot('try-free-lid');
  await press('Digit2'); await sum('heat no, oxygen no', 'the sum follows the gas'); await says('only source of heat', 'the gas’s reason');
  await press('Digit3'); await sum('heat no, oxygen yes', 'the lid opens'); await c.waitFor(`document.querySelector('.lc-prompt')?.textContent.includes('Press Enter to continue')`, 'three settings open Continue', 10_000);
  await at('try-free', 's.ready'); await press('Digit1'); await says('no wood in the pit', 'the wood’s reason'); await wait(400); await shot('try-free-table');
  await next('try-free');
  // The water: a wrong guess, then why.
  await at('try-water', 's.cards === 3'); await shot('try-water-guess');
  await press('Digit1'); await press('Space');
  await at('try-water', 's.ready'); await says('the fuel was not removed', 'the reason'); await wait(300); await shot('try-water-wrong-guess');
  await next('try-water');
  // The sand: the right guess, then Brian's help climbs to his pointer and Show me tips the bucket.
  await at('try-sand', 's.cards === 3'); await press('Digit3');
  for (const rung of [1, 2, 3]) { await press('KeyH'); await at('try-sand', `s.help === ${rung}`); }
  await wait(700); await shot('try-sand-show-me');
  await at('try-sand', 's.ready'); await says('You were right, the sand removed the oxygen', 'the sand'); await wait(300); await shot('try-sand');
  await next('try-sand');
  // How a forest fire spreads: one press, one spread; the sums follow.
  await at('try-spread'); await shot('try-spread'); await sum('25 + 25 = 50', 'the marked cell’s sum');
  await press('Space'); await sum('50 + 25 = 75', 'the marked cell grows'); await wait(200); await shot('try-spread-pressed');
  await press('Space'); await press('Space'); await press('Space'); await at('try-spread', 's.ready'); await says('0.29 metres per second', 'the front’s speed'); await shot('try-spread-done');
  await next('try-spread');
  // The strip: rake, guess, let it burn.
  await at('try-strip'); await shot('try-strip-setup'); await sum('6 × 3 = 18 cells', 'all the forest in reach'); await press('Space');
  await sum('3 × 3 = 9 cells', 'the rake changes the sum');
  await at('try-strip', 's.cards === 3'); await press('Digit1'); await press('Space');
  await at('try-strip', 's.ready'); await says('You were right, the raked strip removed the fuel', 'the strip'); await wait(300); await shot('try-strip');
  await next('try-strip');
  // Retardant: a click on the spray over the trees in front of the flames.
  await at('word-retardant'); await shot('word-retardant-set'); await click(410, 144);
  await at('word-retardant', 's.ready'); await says('coated trees cannot catch fire', 'the coat'); await shot('word-retardant');
  await next('word-retardant');
  // Brian's job: the first load by a click on its cell, the rest by the arrow keys and Space.
  await at('alone'); await shot('alone');
  await sum('100 × 180 ÷ 100 = 180 litres', 'the aim’s sum'); await press('ArrowRight'); await sum('50 × 180 ÷ 100 = 90 litres', 'the sum follows the aim'); await press('ArrowLeft');
  let aim = [0, MIDDLE];
  for (const [n, [i, j]] of jobTargets().entries()) {
    await at('alone', 's.waiting');
    if (n === 0) await click(60 + (i + .5) * 100, 196 + (j + .5) * 100);
    else {
      for (; aim[0] < i; aim[0]++) await press('ArrowRight');
      for (; aim[0] > i; aim[0]--) await press('ArrowLeft');
      for (; aim[1] < j; aim[1]++) await press('ArrowDown');
      for (; aim[1] > j; aim[1]--) await press('ArrowUp');
      await press('Space');
    }
    aim = [i, j];
    if (n === 0) { await says('The water put out', 'the first drop'); await wait(200); await shot('alone-first-drop'); }
  }
  await at('alone', 's.ready'); await says('it never reached the road', 'the job'); await wait(300); await shot('alone-pass');
  await next('alone');
  for (const [step, answer] of [['check-lid', 'Digit3'], ['check-coat', 'Digit2'], ['check-game', 'Digit1']]) {
    await at(step); await wait(300); await questionShows(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(800); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  // Teaching writes the notebook words and never passes the lesson by itself.
  if (!(await c.evaluate(`!window.__qaApp.profile.lab.done.fire && ['fire-fuel', 'fire-heat', 'fire-oxygen', 'fire-fire-triangle', 'fire-retardant'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  // The game challenge goes through the Lab's own path: the helicopter starts with the key idea card.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.heliSession?.view?.()?.challenge?.id === 'fire'`, 'fire challenge in the helicopter', 60_000);
  await c.waitFor(`!document.querySelector('.lab-key-idea')?.hidden && document.querySelector('.lab-key-idea')?.textContent.includes('Remove heat, fuel or oxygen, and the fire goes out.')`, 'key idea card');
  // The bucket is on the hook without a trip to the fitting menu, as the card says.
  await c.waitFor(`!!window.__qaApp.heliSession.view().bucket`, 'the bucket is fitted');
  await c.waitFor(`document.querySelector('.lab-key-idea')?.textContent.includes('The bucket is already on the hook')`, 'the card says the bucket is on the hook');
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
