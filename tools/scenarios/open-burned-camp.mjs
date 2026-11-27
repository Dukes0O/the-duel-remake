// Memory-only review of Scenes 1 and 2. The existing sample supplies yesterday's goodwill.
import {placeForThread} from '../../src/story/scenes/burned-camp.js';
import {sampleWorld} from '../../src/world/open/samples.js';
import {LAND} from '../../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {openThreadSigns, threadsAtBankedHearth} from '../../src/world/open/parts/threads.js';
import burnedCamp from '../../src/story/threads/content/burned-camp.js';

const cast = {camp: 'glasshouse'};
const site = placeForThread('@camp', cast);
const spot = id => placeForThread(['@camp', id], cast);
const floor = point => ({...point, y: scablandsSurfaceHeightAt(point.x, point.z)});
const approach = LAND.at('ships-in-sand', 1870, 790);
const parking = spot('car-stop');
const homeward = spot('road-home');
const home = LAND.at('tin-town');
const clues = ['frames', 'lamp', 'tracks', 'ruts', 'pods', 'pump'];
export const scenarioWorld = () => {
  const world = sampleWorld('helped-camp');
  // Land seed 2 puts the Glasshouse at its first position, where this scenario's drive and clue spots are laid out
  // (the site's place now comes from the land's seed in every part, since the join of 25 November).
  const prepared = {...world, seed: 1250, ledger: {...world.ledger, seed: 1250}, open: {...world.open, landSeed: 2}};
  // This checks the burned camp, not which of all loaded storylines wins the director's next draw.
  return threadsAtBankedHearth({world: prepared}, [burnedCamp]);
};

export const pageFunctions = {
  ready: () => !!window.__qaApp?.visualReady && !!window.__render,
  begin: world => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is required.');
    const app = window.__qaApp;
    app.addPlayer('Burned camp QA');
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true}};
    if (!app._saveProfile()) throw Error('Could not prepare the memory-only profile.');
    if (!app.visitWasteland()) throw Error('Could not enter the Wasteland.');
  },
  // The yard is reached by the page's own clock; the roam starts once it is.
  inYard: () => window.__qaApp.isYardHomeActive?.() === true,
  startRoam: world => {
    const app = window.__qaApp;
    if (!app.startOpenRoam()) throw Error('Could not start the open land: ' + JSON.stringify({yard: app.isYardHomeActive(), flag: app._switches().enabled('story-choices'), status: app.duel.state.status}));
    app.duel.state.arena.worldJob.open.world = world;
  },
  roamReady: () => window.__qaApp.visualReady && window.__qaApp.duel.state.status === 'racing' &&
    window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'open-roam',
  placeCar: (point, toward) => {
    const {duel} = window.__qaApp;
    const {s, lateral} = duel.course.nearest(point.x, point.z);
    const heading = Math.atan2(toward.x - point.x, toward.z - point.z);
    Object.assign(duel.state, {s, lateral, prevS: s, prevLateral: lateral, groundHeight: point.y, speedMph: 0,
      headingError: heading - duel.course.at(s).heading, onFoot: false});
  },
  advance: seconds => window.__qaApp.advance(seconds),
  drive: (target, within, limit) => {
    const {duel} = window.__qaApp, state = duel.state;
    for (let frame = 0; frame < limit * 60; frame++) {
      const point = duel.course.worldAt(state.s, state.lateral);
      const dx = target.x - point.x, dz = target.z - point.z;
      if (Math.hypot(dx, dz) <= within) {
        duel.setInput({throttle: 0, steer: 0, brake: 1});
        for (let tick = 0; tick < 60; tick++) duel.step(1 / 60);
        return true;
      }
      const angle = Math.atan2(dx, dz) - duel.course.at(state.s).heading - state.headingError;
      const error = Math.atan2(Math.sin(angle), Math.cos(angle));
      const speed = Math.abs(state.speedMph);
      duel.setInput({throttle: speed < 22 ? .55 : 0, brake: 0, steer: Math.max(-1, Math.min(1, -error * 2))});
      duel.step(1 / 60);
    }
    throw Error('The car did not reach the review waypoint.');
  },
  walkAt: point => {
    const app = window.__qaApp, {duel} = app;
    const fighter = duel.state.fighter;
    if (!fighter) throw Error('Missing the open land fighter.');
    const {s, lateral} = duel.course.nearest(point.x, point.z);
    duel.state.onFoot = true;
    Object.assign(fighter, {x: point.x, y: point.y, z: point.z, groundY: point.y, s, lateral});
    app.advance(.15);
  },
  mark: id => window.__qaApp.duel.state.arena.worldJob.open.world.ledger.marks.includes('burned-camp/' + id),
  smoke: () => window.__render.scene.getObjectByName('burned-camp smoke')?.visible === true,
  smokeState: () => {
    const {state, course} = window.__qaApp.duel;
    const open = state.arena.worldJob.open;
    return {thread: open.world.open.threads['burned-camp'] ?? null, night: open.world.ledger.night,
      partOfDay: open.partOfDay, open, smoke: window.__render.scene.getObjectByName('burned-camp smoke')?.visible ?? null,
      onFoot: state.onFoot, car: course.worldAt(state.s, state.lateral), fighter: state.fighter &&
        {x: state.fighter.x, y: state.fighter.y, z: state.fighter.z},
      talk: document.querySelector('.story-talk:not([hidden])')?.textContent ?? null};
  },
  radio: () => {
    const question = [...document.querySelectorAll('.story-options button')]
      .find(button => button.textContent.includes('would the Ash Men burn a camp?'));
    if (question && !question.disabled) question.click();
    return !!question;
  },
  answer: () => document.querySelector('.story-words')?.textContent.includes("The Ash Men put fires out"),
  endCall: () => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    const button = [...(talk?.querySelectorAll('.story-options button') ?? [])]
      .find(option => option.textContent.includes('I will call again if I need you.'));
    if (button) button.click();
    else talk?.querySelector('.story-talk-controls button:first-child')?.click();
    return !!button;
  },
};

export function pageSource(name, ...values) {
  return `(${pageFunctions[name]})(${values.map(value => JSON.stringify(value)).join(', ')})`;
}

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, label, ...args) => context.waitFor(pageSource(name, ...args), label);
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-choices,crew-gear,warlord-cards&harness=open-burned-camp');
  await wait('ready', 'the memory-only review page');
  await evaluate('begin', scenarioWorld());
  await wait('inYard', 'the Wasteland yard');
  await evaluate('startRoam', scenarioWorld());
  await wait('roamReady', 'the loaded open land');
  await evaluate('placeCar', floor(approach), site);
  await evaluate('advance', 6.5);
  const reportSmoke = async () => {
    const {open, ...state} = await evaluate('smokeState');
    const view = open.parts.threads?.places ?? {};
    return JSON.stringify({...state, holds: open.holds,
      threads: open.world.open.threads, signs: openThreadSigns({...open, view}).map(({id, sign, at}) => ({id, kind: sign.kind, at}))});
  };
  try {
    await wait('smoke', 'the smoke over the Glasshouse');
  } catch (error) {
    error.message += ' Smoke diagnostics: ' + await reportSmoke();
    throw error;
  }
  await context.screenshot('burned-camp-smoke');
  await evaluate('drive', parking, 6, 28);
  for (const clue of clues) {
    await evaluate('walkAt', floor(spot(clue)));
    await wait('mark', `the ${clue} clue`, clue);
  }
  await context.screenshot('burned-camp-clues');
  await evaluate('walkAt', floor(parking));
  // F is held input. Let the simulation sample it before the browser releases it.
  for (const type of ['keyDown', 'keyUp']) {
    await context.command('Input.dispatchKeyEvent', {type, key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70});
    await evaluate('advance', 1 / 30);
  }
  try {
    await wait('radio', 'the radio question for Cinder');
  } catch (error) {
    error.message += ' Radio diagnostics: ' + await reportSmoke();
    throw error;
  }
  await wait('answer', "Cinder's answer");
  await context.screenshot('burned-camp-radio');
  await wait('endCall', 'the end of the radio call');
  await wait('mark', 'the question recorded', 'asked/ash-men');
  await evaluate('placeCar', floor(parking), homeward);
  await evaluate('drive', homeward, 30, 24);
  await wait('mark', 'the driver chose the road home', 'went-home');
  // Start the last road leg near the gate, keeping the same world and journal.
  const gateApproach = LAND.between('tin-town', 'ships-in-sand', .02);
  await evaluate('placeCar', floor(gateApproach), home);
  await evaluate('drive', home, 50, 35);
  await context.screenshot('burned-camp-home');
}
