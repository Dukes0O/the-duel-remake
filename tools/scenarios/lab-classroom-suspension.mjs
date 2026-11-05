// Keyboard-only Suspension classroom play at 1920 by 1000. Saves stay in memory.
const KEYS = Object.freeze({
  Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], KeyE: ['e', 69],
  Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51],
  ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39],
});
const state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function driver(c) {
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {
    type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1],
  });
  const press = async (code, count = 1) => {
    for (let index = 0; index < count; index++) {
      await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(count > 1 ? 160 : 240);
    }
  };
  const at = (step, extra = 'true') => c.waitFor(
    `${state}?.step === '${step}' && (value => ${extra})(${state})`, step, 40_000,
  );
  const next = async (step, extra = 'value.ready') => { await at(step, extra); await press('Enter'); };
  const say = (text, label) => c.waitFor(
    `document.querySelector('.lc-bubble')?.textContent.includes(${JSON.stringify(text)})`, label, 20_000,
  );
  const prompt = (text, label) => c.waitFor(
    `document.querySelector('.lc-prompt')?.textContent.includes(${JSON.stringify(text)})`, label, 10_000,
  );
  async function open() {
    const canvas = `document.querySelector('.lab-canvas')`;
    await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'Lab room', 60_000);
    await c.evaluate(`document.querySelector('[data-go="wind-tunnel"]').click()`);
    await c.waitFor(`${canvas}.dataset.labWalkArrived === 'wind-tunnel'`, 'walk to tunnel', 30_000);
    await press('KeyE');
    await c.waitFor(`!!document.querySelector('[data-lab-lesson="start:suspension"]')`, 'tunnel lesson choices');
    await c.evaluate(`document.querySelector('[data-lab-lesson="start:suspension"]').click()`);
    await at('wonder');
  }
  return {press, at, next, say, prompt, open};
}

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,lab-2,helicopter,forest-fire,rescue,heli-skiing,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => {
    const app = window.__qaApp; app.audio.setMuted?.(true); app.addPlayer('Suspension QA');
    app.profile = {...app.profile, drivingLessons: {version: 1, done: {corner: true}},
      courses: {version: 1, unlocked: ['tremblant-woods', 'summit-run']},
      heli: {version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}, refuels: 3}};
    app._saveProfile(); document.querySelectorAll('body > details').forEach(item => item.hidden = true); app.openLab();
  })()`);
  const d = driver(c), shot = name => c.screenshot(`suspension-${name}`);
  const select = async code => d.press(code);

  // From the Lab map, walk to the tunnel, open its list, and choose Suspension.
  await d.open(); await shot('wonder'); await d.next('wonder');
  for (const step of ['word-spring', 'word-stiffness', 'word-weight', 'word-roll', 'word-shake', 'formula']) {
    await d.at(step); await shot(step);
    if (step === 'word-shake') {
      const words = await c.evaluate(`(() => ({brian: document.querySelector('.lc-bubble')?.textContent ?? '', formulas: document.querySelector('.lc-formulas')?.textContent ?? ''}))()`);
      if (!words.brian.includes('one body-shake reading for this test')) throw new Error(`Body shake words are missing: ${words.brian}`);
      if (words.formulas.includes('body shake')) throw new Error(`Body shake still has a formula panel: ${words.formulas}`);
    }
    if (step === 'formula') {
      const shown = await c.evaluate(`document.querySelector('.lc-formulas')?.textContent`);
      if (!shown?.includes('6.5° ÷ 2.2° ≈ 3')) throw new Error(`Roll panel does not show the calculator sum: ${shown}`);
    }
    await d.next(step);
  }

  // Both predictions begin with unknown readings in the panel. The wrong picks
  // receive distinct measured reasons, then Brian lets the learner continue.
  await d.at('guess-bumps'); await shot('guess-bumps');
  await select('Digit2'); await d.say('4.09 m/s²', 'bump prediction explains the readings'); await shot('guess-bumps-answered');
  await d.next('guess-bumps');
  await d.at('guess-roll'); await shot('guess-roll');
  await select('Digit1'); await d.say('2.2°', 'roll prediction explains the readings'); await shot('guess-roll-answered');
  await d.next('guess-roll');

  // Watch runs through all four spring-road settings; the values really change.
  await d.at('watch'); await shot('watch-start'); await wait(2500); await shot('watch-changing');
  await d.at('watch', 'value.ready'); await shot('watch-finished'); await d.next('watch');

  await d.at('try-free'); await shot('try-free');
  await select('ArrowRight'); await select('ArrowDown'); await select('Space');
  await select('ArrowLeft'); await select('Space');
  await select('ArrowUp'); await select('Space');
  await d.at('try-free', 'value.ready'); await shot('try-free-results'); await d.next('try-free');

  // Brian's Show me sets the stiff spring on a smooth road and runs the target.
  await d.at('alone'); await shot('alone');
  await select('KeyH'); await select('KeyH'); await select('KeyH');
  await wait(1800); await d.say('That is how it is done.', 'Show me runs the target setup');
  await d.at('alone', 'value.ready'); await shot('alone-target'); await d.next('alone');

  for (const [step, answer] of [['check-spring', 'Digit2'], ['check-transfer', 'Digit2'], ['check-formula', 'Digit2']]) {
    await d.at(step); await shot(step); await select(answer); await shot(`${step}-answered`); await d.next(step);
  }

  await d.at('recap'); await shot('recap');
  const contract = await c.evaluate(`(() => {
    const panel = document.querySelector('.lc-physics')?.textContent ?? '';
    const past = document.querySelectorAll('.lc-past > *').length;
    return {hasRoll: panel.includes('body roll'), past};
  })()`);
  if (!contract.hasRoll) throw new Error('Physics panel does not show the body-roll explanation.');
  if (contract.past < 12) throw new Error(`The lesson page did not keep earlier steps: ${contract.past}`);
  await select('Enter'); await wait(1200); await shot('challenge');
  await c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes('completed the Suspension lesson')`, 'four suspension bench comparisons pass the unchanged challenge', 20_000);
}
