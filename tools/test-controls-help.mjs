import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {keyboardAction, INPUT_CONTEXTS} from '../src/input-contexts.js';
import {controlsHelp, controlsHelpMarkup} from '../src/controls-help.js';

// Kyle (4 October 2026): the key controls sat in the middle of the Mad Max
// screen the whole time. They now appear only on request: the H key (or
// gamepad Back). The pause screen carries its own controls line.
const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)};
globalThis.cancelAnimationFrame = () => {};
let checks = 0;
const failures = [];
function check(name, run) { checks++; try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); } }
function appFixture() {
  memory.clear();
  const app = new App();
  app.profile.wasteland.discoveredGate = true;
  assert.equal(app._saveProfile(), true);
  app.duel.state.wastelandGateDiscovered = true;
  return app;
}
function race(app) {
  assert.equal(app.startCampaign({mode: 'wasteland', startStage: 0, seed: 1989}), true);
  app.duel.state.status = 'racing';
  app.duel.state.countdown = 0;
}

check('H and gamepad Back ask for help in the car and on foot, and nowhere else', () => {
  assert.equal(keyboardAction('car', 'KeyH'), 'help');
  assert.equal(keyboardAction('foot', 'KeyH'), 'help');
  assert.equal(keyboardAction('menu', 'KeyH'), null);
  for (const context of ['car', 'foot'])
    assert.ok(INPUT_CONTEXTS[context].gamepad.some(([button, action]) => button === 8 && action === 'help'), context);
});
check('help is off in a new race, toggles on request, and never turns on in a menu', () => {
  const app = appFixture();
  app._inputAction('help');
  assert.notEqual(app.helpVisible, true, 'no help in a menu');
  race(app);
  assert.notEqual(app.helpVisible, true, 'a new race starts with no help');
  app._inputAction(keyboardAction('car', 'KeyH'));
  assert.equal(app.helpVisible, true, 'H shows it');
  app._inputAction('help');
  assert.equal(app.helpVisible, false, 'H hides it again');
  app._inputAction('help');
  app.returnToMenu();
  assert.equal(app.helpVisible, false, 'leaving the race hides it');
  race(app);
  assert.notEqual(app.helpVisible, true, 'the next race starts with no help');
  app.dispose();
});
check('the list matches the controls: weapons and stepping out in Wasteland, foot keys on foot', () => {
  const app = appFixture();
  race(app);
  const keys = rows => rows.map(([key]) => key);
  const car = controlsHelp(app.duel);
  assert.equal(car.title, 'CONTROLS');
  assert.ok(keys(car.rows).includes('1  2  3  4'), 'weapons');
  assert.ok(keys(car.rows).includes('HOLD F'), 'step out');
  app.duel.state.onFoot = true;
  const foot = controlsHelp(app.duel);
  assert.equal(foot.title, 'ON FOOT');
  assert.ok(keys(foot.rows).includes('SHIFT') && keys(foot.rows).includes('HOLD F'), 'foot keys');
  const turn = foot.rows.find(([keys]) => keys.includes('LEFT RIGHT'));
  assert.ok(turn && turn[1] === 'Turn', 'help says the left and right arrows and A D turn');
  assert.ok(foot.rows.some(([keys, what]) => keys === 'Q / E' && what.startsWith('Step')), 'help says Q and E step sideways');
  assert.ok(foot.rows.some(([keys]) => keys === 'F'), 'help names F for climbing aboard');
  assert.ok(controlsHelpMarkup(app.duel).startsWith('<h3>ON FOOT</h3>'), 'markup');
  app.dispose();
});
check('every list ends with how to close it', () => {
  const app = appFixture();
  race(app);
  assert.deepEqual(controlsHelp(app.duel).rows.at(-1), ['H', 'Hide this help']);
  app.dispose();
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Controls help: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exit(1);
