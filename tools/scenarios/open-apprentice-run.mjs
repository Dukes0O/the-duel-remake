// Laptop only. Drive the final stretch of a lesson and bank two open hearths.
// The seed and positions shorten setup; the game owns the choices and writes.
import {EMBER_JOBS} from '../../src/story/ember-save.js';
import {bankHearth, createLedger} from '../../src/story/ledger.js';
import {pageFunctions as roam} from './open-roam.mjs';

const pageFunctions = {
  temporaryReady: () => window.__qaApp?.duel.state.status === 'menu' &&
    [...document.querySelectorAll('details button')].some(button =>
      button.textContent === 'Create temporary player ready for Night 2' && !button.hidden && !button.disabled),
  prepare: roam.prepare,
  control: roam.control,
  seedTrip: (jobs, ledger) => {
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value)
      throw Error('The apprentice drive requires memory-only storage.');
    const app = window.__qaApp;
    app.profile = {...app.profile, story: {...app.profile.story, version: 1, ledger: {version: 1, ...ledger},
      ember: {read: true, jobs, feud: 1, runs: 3}}};
    if (!app._saveProfile()) throw Error('The temporary trip could not be prepared.');
    return app.player.name;
  },
  roamReady: () => {
    const {status, onFoot, arena} = window.__qaApp.duel.state;
    return window.__qaApp.visualReady && status === 'racing' && onFoot &&
      arena?.worldJob?.definition?.id === 'open-roam' && arena.worldJob.storyPeople?.some(person => person.id === 'moss');
  },
  interact: () => {
    const app = window.__qaApp;
    app.keys.KeyF = true;
    try { app.advance(.15); } finally { app.keys.KeyF = false; }
  },
  moveToMoss: () => {
    const {state, course} = window.__qaApp.duel;
    const point = state.arena.worldJob.storyPeople.find(person => person.id === 'moss').position;
    const {s, lateral} = course.nearest(point.x + 1, point.z);
    Object.assign(state.fighter, {x: point.x + 1, y: point.y, z: point.z, groundY: point.y, s, lateral});
    window.__qaApp.advance(.15);
  },
  talkState: () => {
    const state = window.__qaApp?.duel.state, trip = state?.arena?.worldJob;
    const job = trip?.job;
    return {status: state?.status, step: job?.steps[job.stepIndex], talk: job?.stepState.talk,
      routines: trip?.open?.world.open.routines, routineState: trip?.open?.parts.routines,
      talks: [...document.querySelectorAll('.story-talk')].map(box => ({
        html: box.outerHTML, buttons: [...box.querySelectorAll('button')].map(button => ({
          text: button.textContent, hidden: button.hidden, disabled: button.disabled,
          visible: !!button.getClientRects().length, visibility: getComputedStyle(button).visibility,
        })),
      }))};
  },
  line: (words, click = false) => {
    const button = document.querySelector('.story-talk:not([hidden]) .story-speech:not([hidden])');
    if (!button || !button.getClientRects().length || button.disabled ||
      !button.querySelector('.story-words').textContent.includes(words)) return false;
    if (click) button.click();
    return true;
  },
  option: (words, click = false) => {
    const button = [...document.querySelectorAll('.story-talk:not([hidden]) .story-options button')]
      .find(row => row.textContent.includes(words) && row.getClientRects().length && !row.disabled);
    if (!button) return false;
    if (click) {
      button.click();
      // Apply the answer before the scenario moves away and closes this talk.
      window.__qaApp.advance(.15);
    }
    return true;
  },
  passengerReady: () => {
    const {status, arena} = window.__qaApp.duel.state;
    const job = arena?.worldJob;
    const notes = document.querySelector('.world-hud-ember:not([hidden]) em');
    return status === 'racing' && job?.definition?.routineRun?.passenger?.id === 'tin-cook' &&
      notes?.textContent.includes('riding beside you');
  },
  finalStretch: () => {
    const app = window.__qaApp, {state, course} = app.duel, trip = state.arena.worldJob;
    const bess = trip.actors.find(actor => actor.id === 'big-bess');
    const road = trip.definition.steps[0].path;
    const from = road.at(-2).position, stop = road.at(-1).position;
    const length = Math.hypot(stop.x - from.x, stop.z - from.z);
    const dx = (stop.x - from.x) / length, dz = (stop.z - from.z) / length;
    const x = stop.x - 8 * dx, z = stop.z - 8 * dz;
    const ahead = course.nearest(x, z);
    bess.position = {x, z, y: course.groundAt(ahead.s, ahead.lateral).y};
    bess.pathIndex = road.length - 1;
    const {s, lateral} = course.nearest(x - 12 * dx + 6 * dz, z - 12 * dz - 6 * dx);
    Object.assign(state, {s, lateral, prevS: s, prevLateral: lateral,
      headingError: Math.atan2(dx, dz) - course.at(s).heading});
    app.advance(8);
  },
  lessonKept: () => {
    const app = window.__qaApp, delivery = app.duel.state.arena.result?.routineGas;
    return app.duel.state.status === 'arena_result' && app.duel.state.arena.result.settlementSaved &&
      delivery?.gas === 60 && delivery.embers === 3 &&
      app.profile.story.open.routines['gas-run'].lessonLoad === 60;
  },
  waitForDusk: () => {
    const app = window.__qaApp;
    app.duel.state.arena.worldJob.open.daySeconds = 960;
    app.advance(.15);
  },
  banked: (night, runs) => {
    const app = window.__qaApp;
    return app.duel.state.status === 'arena_result' && app.duel.state.arena.result?.settlementSaved &&
      app.profile.story.ledger.night === night && app.profile.story.open.routines['gas-run'].tally.runs === runs;
  },
  dawn: () => window.__qaApp.duel.state.arena?.worldJob?.open?.partOfDay === 'dawn',
};

export const pageSource = (name, ...args) =>
  '(' + pageFunctions[name] + ')(' + args.map(arg => JSON.stringify(arg)).join(', ') + ')';

export async function run(context) {
  const wait = async (name, ...args) => {
    try { return await context.waitFor(pageSource(name, ...args), name + ' ' + args.join(' '), 90_000); }
    catch (error) {
      error.message += '\nTalk state: ' + await evaluate('talkState').then(JSON.stringify, failure => failure.message);
      throw error;
    }
  };
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const click = async (name, text) => {
    await wait(name, text);
    if (!await evaluate(name, text, true)) throw Error('The button is unavailable: ' + text);
  };

  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-choices,scablands-runs,story-everburn,warlord-cards,crew-gear&harness=open-apprentice-run');
  await wait('temporaryReady');
  if (!await evaluate('prepare')) throw Error('The temporary player button is unavailable.');
  const ledger = bankHearth(createLedger({seed: 19, night: 2, embers: 4})).ledger;
  const name = await evaluate('seedTrip', EMBER_JOBS, ledger);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) await click('control', action);
  await wait('roamReady');
  await evaluate('interact');
  await click('line', name + ',');
  await click('line', 'something you can teach');
  await click('option', "You're coming with me");
  await evaluate('moveToMoss');
  await evaluate('interact');
  await click('line', 'ready to ride beside you');
  await click('option', "I'll take the long road");
  await click('control', 'world-job-retry');
  await wait('passengerReady');
  await context.screenshot('learner-on-the-road');
  await evaluate('finalStretch');
  await wait('lessonKept');
  await click('control', 'world-job-retry');
  for (const [night, runs] of [[4, 0], [5, 1]]) {
    await wait('roamReady');
    await evaluate('waitForDusk');
    await evaluate('interact');
    await click('line', 'Shall we bank the hearth?');
    await click('option', "Let's bank the hearth");
    await wait('banked', night, runs);
    await click('control', 'world-job-retry');
  }
  await wait('dawn');
  await wait('line', 'of gas yesterday');
  await context.screenshot('cinder-at-dawn');
}
