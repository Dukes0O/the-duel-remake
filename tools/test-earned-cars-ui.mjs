// Earned cars on screen (docs/EARNED_CARS.md section 5, card EARN-SCREEN).
// Production App, screens and settlement; memory-only storage.
import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {cp, mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {App} from '../src/app.js';
import {EngineAudio} from '../src/audio.js';
import {CARS} from '../src/config.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {PLAYERS_KEY, createProfile} from '../src/progression.js';
import {shownCars, shownCarIds, medalResultLines, medalSheetPanel} from '../src/earned-cars-ui.js';
import {AIR_ONLY_CARS, JOB_CARS} from '../src/heli/heli-jobs.js';
import {screenMarkup} from '../src/screen-menu.js';
import {createGarageScreen} from '../src/screen-garage.js';
import {createResultsScreen} from '../src/screen-results.js';
import {ownTestCourses} from './career-fixture.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
function storageFor() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)};
}

// One real Rival Duel, won at the finish line, through the production App.
function winDuel(app, cpuDifficulty) {
  assert.equal(app.startCampaign({startStage: 0, mode: 'duel', car: 'falcone_f42', cpuDifficulty, seed: 1989}), true);
  const state = app.duel.state;
  Object.assign(state, {status: 'racing', stageTimeSec: 180, lapStartedAt: 180, racePenaltySec: 0,
    s: app.duel.raceLength, completedLaps: state.lapsTotal, lap: state.lapsTotal, currentLap: state.lapsTotal,
    lapTimes: Array(state.lapsTotal).fill(90), lateral: 0});
  state.opponents.forEach(opponent => Object.assign(opponent, {completedLaps: 0, s: 0}));
  assert.equal(app.duel._finishStage(), true);
  return state.results;
}

function withApp(overrides, run) {
  const storageBefore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = storageFor();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  globalThis.cancelAnimationFrame ??= () => {};
  const app = new App();
  try {
    ownTestCourses(app);
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: true, overrides});
    const cues = [];
    const event = app.audio.event.bind(app.audio);
    app.audio.event = (ev, ...rest) => { if (ev?.medalEarned) cues.push(ev); return event(ev, ...rest); };
    return run(app, cues, storage);
  } finally {
    app.dispose?.();
    if (storageBefore) Object.defineProperty(globalThis, 'localStorage', storageBefore);
    else delete globalThis.localStorage;
  }
}

test('switch on: an Easy Rival Duel win fills the box, shows the line and plays the cue once', () => {
  withApp({'earned-cars': true}, (app, cues, storage) => {
    const first = winDuel(app, 'easy');
    assert.deepEqual(first.medal, {car: 'falcone_f42', row: 'duel', level: 'easy', colour: 'bronze', bonus: 150});
    assert.equal(first.creditBreakdown.medal, 150);
    assert.deepEqual(app.profile.medals.cars.falcone_f42.duel, [1, 0, 0]);
    assert.equal(cues.length, 1, 'one bonus cue for the new medal');
    assert.deepEqual(medalResultLines(first), ['NEW MEDAL · BRONZE · FALCONE F42 · DUEL · EASY · +150 CR']);
    assert.ok(JSON.parse(storage.getItem(PLAYERS_KEY)).players[0].profile.medals, 'the sheet is saved');
    const again = winDuel(app, 'easy');
    assert.equal(again.medal, undefined, 'a later win in the same box shows nothing new');
    assert.equal(cues.length, 1, 'and plays no second cue');
    assert.deepEqual(app.profile.medals.cars.falcone_f42.duel, [2, 0, 0]);
    const panel = medalSheetPanel(app.profile, 'falcone_f42');
    assert.match(panel, /aria-label="bronze medal, 2 wins"/);
    assert.match(panel, /WIN ON MEDIUM/);
    assert.match(panel, /OPENS WITH THE GRAND PRIX CAREER/);
    assert.match(medalSheetPanel(app.profile, 'falcone_f42', {grandPrixCareer: true}), /GRAND PRIX<\/th><td class="medal empty">/);
  });
});

// EARN-FINISH: a medal and a new car in the same race are one results screen, so one cue; the
// results screen keeps its buttons on screen at 1280 x 720 for a medal line as well as a car card.
test('a medal and a new car in one race play one cue; settling it again plays none', () => {
  withApp({'earned-cars': true}, (app, cues) => {
    // Five medals; an Easy Duel win with the Falcone fills the sixth box and earns the Ferrari Enzo.
    app.profile = {...app.profile, medals: {version: 1, cars: {falcone_f42: {duel: [0, 1, 1], grandprix: [1, 1, 1]}}}};
    app._saveProfile();
    const render = createResultsScreen({app, profile: () => app.profile, metric: (label, value) => `<dt>${label}</dt><dd>${value}</dd>`,
      time: String, credits: String, action: label => `<button>${label}</button>`, escapeHTML: String, arrow: ''});
    const result = winDuel(app, 'easy');
    assert.deepEqual(result.earnedCars, ['ferrari_enzo']);
    assert.equal(result.medal.level, 'easy');
    assert.equal(cues.length, 1, 'one cue for the medal and the car together');
    assert.match(render(app.duel.state), /earned-car-results/);
    app._settleResult(result, app.duel.state);
    app.onFrame?.(app.duel.state);
    render(app.duel.state);
    assert.equal(cues.length, 1, 'settling and drawing the same race again plays nothing');
    assert.deepEqual(app.profile.medals.cars.falcone_f42.duel, [1, 1, 1], 'and counts nothing twice');
  });
});

test('a medal line alone gives the results screen the smaller headline; an ordinary win does not', () => {
  withApp({'earned-cars': true}, (app) => {
    const render = createResultsScreen({app, profile: () => app.profile, metric: (label, value) => `<dt>${label}</dt><dd>${value}</dd>`,
      time: String, credits: String, action: label => `<button>${label}</button>`, escapeHTML: String, arrow: ''});
    winDuel(app, 'easy');
    const first = render(app.duel.state);
    assert.match(first, /NEW MEDAL/);
    assert.match(first, /class="result-panel earned-car-results"/, 'a new medal takes the smaller headline so the buttons stay on screen');
    assert.equal(first.includes('NEW CAR EARNED'), false);
    winDuel(app, 'easy');
    const repeat = render(app.duel.state);
    assert.equal(repeat.includes('NEW MEDAL'), false);
    assert.equal(repeat.includes('earned-car-results'), false, 'a repeat win keeps the ordinary headline');
  });
});

test('the medal event plays the existing bonus cue exactly once', () => {
  const audio = new EngineAudio();
  const played = [];
  // A stand-in running sound context: node has no audio, so record the cues.
  Object.assign(audio, {context: {state: 'running', currentTime: 0}, muted: false, paused: false,
    _syncMixer: () => {}, _playCue: id => played.push(id)});
  const state = {status: 'finished', opponents: [], traffic: []};
  audio.event({medalEarned: true}, state, null);
  assert.deepEqual(played, ['interface.bonus']);
  played.length = 0;
  audio.event({}, state, null);
  assert.deepEqual(played, [], 'an event without a medal plays nothing');
});

test('switch off: the same race adds no sheet, no medal and no cue', () => {
  withApp({}, (app, cues, storage) => {
    const result = winDuel(app, 'easy');
    assert.equal(result.medal, undefined);
    assert.equal(Object.hasOwn(result.creditBreakdown, 'medal'), false);
    assert.equal(Object.hasOwn(app.profile, 'medals'), false);
    assert.equal(Object.hasOwn(JSON.parse(storage.getItem(PLAYERS_KEY)).players[0].profile, 'medals'), false);
    assert.equal(cues.length, 0);
  });
});

// Every real medal car stay hidden behind earned-cars, including owned cars.
test('the Enzo, F1 and Bolide stay hidden everywhere while the switch is off, shown while on', () => {
  const medalCars = ['ferrari_enzo', 'mclaren_f1', 'bugatti_bolide'];
  // The Falcone Sirena (SIRENA-CAR) is on no list until DEEP-SIRENA-VIEW lists it once the Lab restores it.
  const sirena = 'falcone_sirena';
  const today = Object.keys(CARS).filter(id => !medalCars.includes(id) && id !== sirena && id !== 'mcmurtry_speirling');
  assert.deepEqual(shownCars(false), Object.entries(CARS).filter(([id]) => !medalCars.includes(id) && id !== sirena && id !== 'mcmurtry_speirling'));
  assert.deepEqual(shownCars(true), Object.entries(CARS).filter(([id]) => id !== sirena && id !== 'mcmurtry_speirling'));
  assert.deepEqual(shownCarIds(false), today);
  assert.deepEqual(AIR_ONLY_CARS, [...medalCars, sirena, 'mcmurtry_speirling']);
  assert.ok(medalCars.every(id => !JOB_CARS.includes(id)), 'no earned car is a customer car');
  const markup = on => screenMarkup({choices: {car: 'falcone_f42', cpuDifficulty: 'easy', difficulty: 'casual', startStage: 0},
    arrow: '', sound: true, escapeHTML: String, earnedCars: on});
  for (const id of medalCars) {
    assert.equal(markup(false).includes(id), false, 'the menu car picker hides ' + id);
    assert.ok(markup(true).includes('<option value="' + id + '">'));
  }
  assert.ok(markup(false).includes(' 7 EARNABLE CARS'), 'the switch-off earnable count stays unchanged');
  assert.ok(markup(true).includes(' 10 EARNABLE CARS'));
  const flags = {};
  const app = {_switches: () => ({enabled: name => flags[name] === true}), player: {name: 'Tester'}, profileSaved: true, duel: {state: {}}};
  const saved = {...createProfile(), unlockedCars: [...createProfile().unlockedCars, ...medalCars]};
  const garage = createGarageScreen({app, profile: () => saved, credits: String, escapeHTML: String,
    getGarageCar: () => 'falcone_f42', getGarageMessage: () => '', arrow: '', action: (label, verb) => '<button data-action="' + verb + '">' + label + '</button>',
    clamp: value => Math.max(0, Math.min(1, value))});
  for (const id of medalCars) assert.equal(garage().includes(id), false, 'the garage hides an owned ' + id);
  flags['earned-cars'] = true;
  for (const id of medalCars) assert.ok(garage().includes('data-garage-car="' + id + '"'), 'the garage shows ' + id + ' while on');
  assert.ok(garage().includes('Ferrari Enzo') && garage().includes('McLaren F1') && garage().includes('Bugatti Bolide'));
});

// The final rung does not exist yet, so the screens are also checked on a
// scratch copy of the code with three test cars. Nothing is added to src/.
test('medal cars: hidden while off; labels, locked pages, rewards and air-only while on', async () => {
  await mkdir(join(root, '.qa-dist'), {recursive: true});
  const scratch = await mkdtemp(join(root, '.qa-dist', 'earned-ui-test-'));
  try {
    await cp(join(root, 'src'), join(scratch, 'src'), {recursive: true});
    await cp(join(root, 'package.json'), join(scratch, 'package.json'));
    await mkdir(join(scratch, 'tools/blender'), {recursive: true});
    await cp(join(root, 'tools/blender/gunn-turret.json'), join(scratch, 'tools/blender/gunn-turret.json'));
    const configPath = join(scratch, 'src', 'config.js');
    const config = await readFile(configPath, 'utf8');
    const anchor = "export const DEFAULT_CAR = 'falcone_f42';";
    assert.ok(config.includes(anchor));
    const testCar = (id, rule) => `CARS.${id}={...CARS.falcone_f42,name:'${id.replace('medal_test_', 'Medal Test ').toUpperCase()}',unlockRequirement:${JSON.stringify(rule)},factoryMaxed:true};\n`;
    await writeFile(configPath, config.replace(anchor,
      testCar('medal_test_a', {kind: 'medals', medals: 6}) +
      testCar('medal_test_b', {kind: 'medals', medals: 15}) +
      testCar('medal_test_c', {kind: 'medals', medals: 24, gold: 6}) + anchor));
    const code = `
import assert from 'node:assert/strict';
import {CARS, COURSE} from './src/config.js';
import {createProfile, normalizeProfile, settleRace} from './src/progression.js';
import {shownCars, shownCarIds, medalResultLines, earnedCarCards, medalChip} from './src/earned-cars-ui.js';
import {screenMarkup, createMenuScreen} from './src/screen-menu.js';
import {createGarageScreen} from './src/screen-garage.js';
import {AIR_ONLY_CARS, JOB_CARS} from './src/heli/heli-jobs.js';
const medalCars = ['ferrari_enzo', 'mclaren_f1', 'bugatti_bolide', 'medal_test_a', 'medal_test_b', 'medal_test_c'];
const today = Object.keys(CARS).filter(id => !medalCars.includes(id) && id !== 'falcone_sirena' && id !== 'mcmurtry_speirling'); // the Sirena is on no list until DEEP-SIRENA-VIEW
// Lists: off is today's, on adds the medal cars.
assert.deepEqual(shownCarIds(false), today);
assert.deepEqual(shownCarIds(true), [...today, ...medalCars]);
const markup = on => screenMarkup({choices: {car: 'falcone_f42', cpuDifficulty: 'easy', difficulty: 'casual', startStage: 0},
  arrow: '', sound: true, escapeHTML: String, earnedCars: on});
assert.equal(markup(false).includes('medal_test_a'), false, 'the menu car picker hides medal cars while off');
assert.ok(markup(true).includes('<option value="medal_test_a">'));
assert.ok(markup(false).includes(' 7 EARNABLE CARS'), 'the earnable count is today\\'s while off');
assert.ok(markup(true).includes(' 13 EARNABLE CARS'));
// Air only, never a customer's car.
assert.deepEqual(AIR_ONLY_CARS, [...medalCars, 'falcone_sirena', 'mcmurtry_speirling']);
assert.ok(medalCars.every(id => !JOB_CARS.includes(id)));
// The garage, with the real renderer.
const flags = {};
let saved = createProfile(), garageCar = 'falcone_f42';
const app = {_switches: () => ({enabled: name => flags[name] === true}), player: {name: 'Tester'}, profileSaved: true, duel: {state: {}}};
const garage = createGarageScreen({app, profile: () => saved, credits: value => String(value), escapeHTML: String,
  getGarageCar: () => garageCar, getGarageMessage: () => '', arrow: '', action: (label, verb) => '<button data-action="' + verb + '">' + label + '</button>',
  clamp: value => Math.max(0, Math.min(1, value))});
let html = garage();
assert.equal(html.includes('data-garage-car="medal_test_a"'), false, 'the garage list hides medal cars while off');
assert.equal(html.includes('MEDAL SHEET'), false, 'no medal panel while off');
assert.equal(html.includes('medal-chip'), false, 'no medal chip while off');
flags['earned-cars'] = true;
html = garage();
assert.ok(html.includes('MEDALS 0/6'));
assert.ok(html.includes('MEDALS 0/24 · GOLD 0/6'));
assert.ok(html.includes('MEDAL SHEET'), 'the medal panel shows on an owned car');
garageCar = 'medal_test_a'; html = garage();
assert.ok(html.includes('EARNED, NOT BOUGHT') && html.includes('No credits.'));
assert.ok(html.includes('aria-label="MEDALS: 0 of 6"'));
assert.equal(html.includes('data-action="unlock-car"'), false, 'no Buy button');
assert.equal(html.includes('Kestrel One brings it'), false);
flags.helicopter = true; html = garage();
assert.ok(html.includes('Kestrel One brings it to Tremblant Woods.'));
garageCar = 'medal_test_c'; html = garage();
assert.ok(html.includes('aria-label="GOLD MEDALS: 0 of 6"'));
// Reaching six medals earns the first car, with its lines.
saved = normalizeProfile({...createProfile(), medals: {version: 1, cars: {falcone_f42: {duel: [1, 1, 1], grandprix: [1, 1, 0]}}}});
const pacific = COURSE.findIndex(course => course.id === 'pacific-canyon');
const win = settleRace(saved, {runId: 'ui-grant', stageIndex: pacific, car: 'stuttgart_959s', mode: 'duel', difficulty: 'casual',
  cpuDifficulty: 'easy', seed: 1989, laps: 2, completed: true, won: true, timeSec: 180, lapTimes: [90, 90], earnedCarsEnabled: true});
assert.deepEqual(win.earnedCars, ['ferrari_enzo', 'medal_test_a']);
// Claude, 28 October 2026: a newly earned car has its own card (name, then a short line), not two small lines.
// The medal line stays a single line (its colour dot is drawn by the results screen).
assert.deepEqual(medalResultLines(win), ['NEW MEDAL · BRONZE · STUTTGART 959-S · DUEL · EASY · +150 CR']);
assert.deepEqual(earnedCarCards(win, {helicopter: true}), [
  {id: 'ferrari_enzo', name: 'FERRARI ENZO', text: 'Earned with 6 medals. Kestrel One will bring it to Tremblant Woods.'},
  {id: 'medal_test_a', name: 'MEDAL TEST A', text: 'Earned with 6 medals. Kestrel One will bring it to Tremblant Woods.'}]);
assert.deepEqual(earnedCarCards(win).map(card => card.text), ['Earned with 6 medals. In your garage now.', 'Earned with 6 medals. In your garage now.']);
assert.equal(earnedCarCards({earnedCars: ['bugatti_bolide']})[0].text, 'Earned with 24 medals, 6 of them gold. In your garage now.');
assert.deepEqual(earnedCarCards({}), []);
saved = win.profile; garageCar = 'medal_test_a'; html = garage();
assert.ok(html.includes('data-action="medal-sheet"') && html.includes('MEDALS 6/12 · NEXT CAR AT 12'), 'the garage has the medal chip near the build name');
assert.ok(medalChip(saved).includes('MEDALS 6/12'));
assert.equal(medalChip(createProfile()).includes('MEDALS 0/6 · NEXT CAR AT 6'), true);
assert.ok(html.includes('MEDAL REWARD · Arrives fully tuned.'), 'the owned medal car has its own reward note');
// The next car is the first unowned medal car in config order: the real F1
// (12 medals) comes before the Bolide (24 with 6 gold) and the scratch cars here.
assert.ok(html.includes('MEDAL SHEET') && html.includes('NEXT CAR AT 12'));
garageCar = 'koenigsegg_jesko'; html = garage();
assert.ok(html.includes('GARAGE COMPLETION REWARD') || html.includes('MAX OTHER CARS'), 'the Jesko keeps its own page');
// Claude, 28 October 2026: how a locked earned car or the Jesko is earned sits right under the ratings,
// above Paint Finish; a priced car keeps its Unlock card below, and an owned car keeps its sheet where it was.
assert.ok(html.includes('PAINT FINISH') && html.indexOf('GARAGE COMPLETION REWARD') < html.indexOf('PAINT FINISH'), 'the Jesko card is above Paint Finish');
assert.ok(html.indexOf('car-capabilities') < html.indexOf('GARAGE COMPLETION REWARD'), 'and below the ratings');
garageCar = 'medal_test_a'; saved = createProfile(); html = garage();
assert.ok(html.indexOf('capability-note') < html.indexOf('EARNED, NOT BOUGHT') && html.indexOf('EARNED, NOT BOUGHT') < html.indexOf('PAINT FINISH'),
  'a locked earned car shows how to earn it between the ratings and Paint Finish');
assert.equal(html.split('EARNED, NOT BOUGHT').length, 2, 'once');
garageCar = 'falcone_heritage'; html = garage();
assert.ok(html.indexOf('PAINT FINISH') < html.indexOf('data-action="unlock-car"'), 'a priced car keeps its Unlock card below Paint Finish');
saved = win.profile; garageCar = 'medal_test_a'; html = garage();
assert.ok(html.indexOf('MEDAL SHEET') < html.indexOf('PAINT FINISH') && html.includes('EARNED, NOT BOUGHT') === false, 'an owned earned car keeps its layout');
// The menu: a hidden car is never the menu car or the rival's car.
flags['earned-cars'] = false;
const choices = {car: 'medal_test_a', rival: {car: 'medal_test_b', upgradeLevel: 0}};
const text = {}, ui = {'car-select': {options: shownCarIds(false).map(value => ({value})), value: ''}, 'driver-select': {innerHTML: '', value: ''}, 'entry-reward': {}};
const menu = createMenuScreen({app, choices, ui, profile: () => saved, credits: String, escapeHTML: String,
  text: (key, value) => { text[key] = String(value); }, root: {}, coursePreview: {}, time: String, onEntryReward: () => {}}).updateMenuCar;
menu();
assert.equal(choices.car, 'falcone_f42');
assert.equal(choices.rival.car, 'match');
assert.equal(text['garage-count'], '01 / ' + String(today.length).padStart(2, '0'));
console.log('scratch earned-car screens passed');
`;
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', code], {cwd: scratch, encoding: 'utf8', windowsHide: true});
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /scratch earned-car screens passed/);
  } finally {
    assert.equal(process.platform, 'win32', 'test cleanup requires the Recycle Bin');
    const part = relative(join(root, '.qa-dist'), scratch);
    assert.ok(/^earned-ui-test-[a-zA-Z0-9]+$/.test(part), 'recycle only the folder this test made');
    const literal = "'" + scratch.replaceAll("'", "''") + "'";
    const script = 'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
      '[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(' + literal +
      ',[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)';
    const cleanup = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64')], {windowsHide: true, encoding: 'utf8'});
    assert.equal(cleanup.status, 0, cleanup.stderr);
  }
});
