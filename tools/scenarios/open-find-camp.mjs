// For Claude on the merged batch. The only player in this scenario lives in the QA tab's memory.
import {sampleWorld} from '../../src/world/open/samples.js';
import {sitePosition, siteSpot} from '../../src/world/open/site-rule.js';

const seed = 12;
const sample = sampleWorld('first-night');
const world = {...sample, seed, ledger: {...sample.ledger, seed}, open: {...sample.open, landSeed: seed}};
const camp = sitePosition('glasshouse', seed);
const pump = siteSpot('glasshouse', seed, 'pump');
const park = {x: camp.x + 4.5, z: camp.z - 23};
const carStart = {x: park.x - 240, z: park.z, heading: Math.PI / 2};
const job = {id: 'open-roam', title: 'Out in the open', seed, open: {world}, steps: [{kind: 'roam', carStart}]};

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  enterYard: definition => {
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value)
      throw Error('Memory-only storage is required.');
    const app = window.__qaApp;
    if (!app.duel.featureFlags.enabled('story-choices')) throw Error('The open Scablands switch is off.');
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: definition.open.world.scrap}};
    if (!app._saveProfile()) throw Error('The memory-only profile could not be set up.');
    document.querySelector('#wasteland-visit').click();
  },
  yard: () => window.__qaApp?.isYardHomeActive(),
  start: definition => {
    const app = window.__qaApp;
    if (!app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0, job: definition}))
      throw Error('The open drive could not start.');
  },
  driving: () => {
    const app = window.__qaApp;
    return app.visualReady && app.duel.state.status === 'racing' && app.duel.state.arena?.worldJob?.open?.seconds > 0;
  },
  drive: park => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    const here = () => duel.course.worldAt(state.s, state.lateral);
    const range = () => park.x - here().x;
    const set = (throttle, brake, left = false, right = false) =>
      Object.assign(app.keys, {KeyW: throttle, KeyS: brake, ArrowLeft: left, ArrowRight: right});
    try {
      for (let index = 0; index < 750 && range() > 1; index++) {
        const at = here(), desired = Math.atan2(park.x - at.x, park.z - at.z);
        const heading = duel.course.at(state.s).heading + state.headingError;
        const error = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading));
        const limit = Math.max(4, Math.min(22, range() * .65));
        set(state.speedMph < limit, state.speedMph > limit + 1, error < -.045, error > .045);
        app.advance(.1);
      }
      set(false, true);
      for (let i = 0; i < 14 && state.speedMph > 0.5; i++) app.advance(.05);
    } finally {
      set(false, false);
    }
    const open = state.arena.worldJob.open;
    if (!open.world.open.found.includes('glasshouse')) throw Error('The driveway did not discover the Glasshouse.');
    if (Math.hypot(park.x - here().x, park.z - here().z) > 8) throw Error('The test car missed the parking spot.');
  },
  openMap: async () => {
    await new Promise(requestAnimationFrame);
    // Read the map's own paint without substituting a map implementation.
    const canvas = document.querySelector('.world-hud-map-canvas');
    const context = canvas.getContext('2d'), original = context.fillText;
    const words = [];
    context.fillText = function (text, ...args) {
      words.push(String(text));
      return original.call(this, text, ...args);
    };
    try {
      document.querySelector('.world-hud-map-button').click();
      if (document.querySelector('.world-hud-map').hidden) throw Error('The map did not open.');
      if (!words.some(text => /glasshouse/i.test(text))) throw Error('The map did not paint the Glasshouse label.');
    } finally {
      context.fillText = original;
    }
  },
  walkAndMend: pump => {
    const app = window.__qaApp, state = app.duel.state;
    document.querySelector('[data-world-map-close]').click();
    try {
      app.keys.KeyF = true;
      for (let i = 0; i < 10 && !state.onFoot; i++) app.advance(.1);
      app.keys.KeyF = false;
      if (!state.onFoot) throw Error('The driver could not get out.');
      const fighter = state.fighter;
      // Approach from the east so the pump legs aren't in the way.
      const walk = (point, range) => {
        for (let i = 0; i < 180 && Math.hypot(fighter.x - point.x, fighter.z - point.z) > range; i++) {
          const desired = Math.atan2(point.x - fighter.x, point.z - fighter.z);
          const error = Math.atan2(Math.sin(desired - fighter.yaw), Math.cos(desired - fighter.yaw));
          Object.assign(app.keys, {KeyW: Math.abs(error) < .25, KeyA: error > .12, KeyD: error < -.12});
          app.advance(.075);
        }
        Object.assign(app.keys, {KeyW: false, KeyA: false, KeyD: false});
      };
      walk({x: pump.x + 3.8, z: pump.z - 1.5}, 1);
      walk(pump, 1.7);
      if (Math.hypot(fighter.x - pump.x, fighter.z - pump.z) > 2.25) throw Error('The driver did not reach the pump.');
      state.footWeapons.selected = 'wrench';
      app.keys.KeyF = true;
      app.advance(12.1);
      app.keys.KeyF = false;
      if (state.arena.worldJob.open.world.ledger.words.glasshouse !== 'Friendly') throw Error('Mending did not earn Friendly.');
    } finally {
      Object.assign(app.keys, {KeyW: false, KeyA: false, KeyD: false, KeyF: false});
    }
  },
  leave: () => {
    if (!window.__qaApp.leaveWorldJob()) throw Error('The open drive could not end.');
  },
  click: action => {
    const button = document.querySelector('[data-action="' + action + '"]');
    if (!button || button.disabled) throw Error('No action available for ' + action);
    button.click();
  },
  page: () => /Friendly/.test(document.querySelector('.story-ledger')?.innerText ?? ''),
};

export function pageSource(name, ...args) {
  const source = '(' + pageFunctions[name].toString() + ')(...' + JSON.stringify(args) + ')';
  new Function('return ' + source);
  return source;
}

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, label, ms = 30000) => context.waitFor(pageSource(name), label, ms);
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,story-choices,warlord-cards,crew-gear&harness=open-find-camp');
  await wait('ready', 'the memory-only menu', 90000);
  await evaluate('enterYard', job);
  await wait('yard', 'the Wasteland yard', 90000);
  await evaluate('start', job);
  await wait('driving', 'the open Scablands drive', 120000);
  await evaluate('drive', park);
  await evaluate('openMap');
  await context.screenshot('open-find-camp-map');
  await evaluate('walkAndMend', pump);
  await evaluate('leave');
  await evaluate('click', 'arena-yard');
  await wait('yard', 'the yard after the drive', 90000);
  await evaluate('click', 'yard-cards');
  await evaluate('click', 'yard-ledger');
  await wait('page', 'Friendly on What people remember');
  await context.screenshot('open-find-camp-ledger');
}
