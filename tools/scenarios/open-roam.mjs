import {NIGHT_2_SITES} from '../../src/world/jobs/night-2-sites.js';

export const pageFunctions = {
  prepare: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value)
      throw Error('Memory-only storage is required.');
    const button = [...document.querySelectorAll('details button')]
      .find(el => el.textContent === 'Create temporary player ready for Night 2' && !el.hidden && !el.disabled);
    if (!button) return false;
    button.click();
    return true;
  },
  control: (action, click = false) => {
    const button = document.querySelector('[data-action="' + action + '"]');
    if (!button || button.hidden || button.disabled || !button.getClientRects().length) return false;
    if (click) button.click();
    return true;
  },
  ready: () => {
    const state = window.__qaApp?.duel.state;
    return state?.status === 'racing' && state.onFoot && state.arena.worldJob?.storyPeople?.some(person => person.id === 'cinder');
  },
  walkToCinder: () => {
    const app = window.__qaApp, {fighter, arena} = app.duel.state;
    const {position} = arena.worldJob.storyPeople.find(person => person.id === 'cinder');
    fighter.yaw = Math.atan2(position.x - fighter.x, position.z - fighter.z);
    app.keys.KeyW = true;
    try {
      for (let i = 0; i < 50 && Math.hypot(position.x - fighter.x, position.z - fighter.z) > 1.9; i++) app.advance(.05);
    } finally {
      app.keys.KeyW = false;
    }
    return Math.hypot(position.x - fighter.x, position.z - fighter.z) <= 2.5;
  },
  talking: () => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    const job = window.__qaApp.duel.state.arena.worldJob.job;
    return job.steps[job.stepIndex]?.openPerson === 'cinder' && !!talk?.querySelector('.story-words')?.textContent.includes('kiln');
  },
  roaming: () => {
    const job = window.__qaApp.duel.state.arena.worldJob.job;
    return job.steps.length === 1 && job.steps[job.stepIndex]?.kind === 'roam' && !job.talkResult &&
      document.querySelector('.story-talk')?.hidden && document.querySelector('.world-hud-line')?.hidden;
  },
  frameTown: hearth => {
    const app = window.__qaApp, {state, course} = app.duel;
    const worldJob = state.arena.worldJob;
    if (!state.onFoot || worldJob.open.seconds >= 78) return false;
    const x = hearth.x - 38, z = hearth.z + 15;
    const {s, lateral} = course.nearest(x, z), {y} = course.groundAt(s, lateral);
    Object.assign(state.fighter, {x, y, z, groundY: y, s, lateral, yaw: Math.PI / 2, pitch: 0});
    app.setFootCamera('first-person');
    app.advance(Math.max(.01, 75 - worldJob.open.seconds));
    const cast = worldJob.storyPeople, before = new Map(cast.map(person => [person.id, person.distance]));
    app.advance(.25);
    return cast.filter(person => {
      const dx = person.position.x - x, dz = person.position.z - z;
      return dx > 0 && Math.abs(dz) < dx * .48 && person.distance - before.get(person.id) > .1;
    }).map(person => person.id);
  },
  pause: () => {
    window.__qaApp.togglePause();
    return window.__qaApp.duel.state.paused;
  },
  roamPause: () => {
    const panel = document.querySelector('.result-panel');
    return panel?.querySelector('h2')?.textContent === 'Out in the open' &&
      !/TIME ON THE JOB|START AGAIN|forfeits/i.test(panel.textContent) &&
      panel.querySelector('[data-action="resume"]')?.textContent.trim() === 'Back out' &&
      panel.querySelector('[data-action="arena-yard"]')?.textContent.trim() === 'Home to the yard';
  },
  home: () => window.__qaApp.isYardHomeActive(),
  boardForGate: car => {
    // Reposition only the fighter to the parked car. The stock F control
    // boards it; the drive itself crosses both faces of the actual gate.
    const app = window.__qaApp, {duel} = app, {fighter} = duel.state;
    const point = {x: car.x + 1.5, y: car.y, z: car.z};
    const {s, lateral} = duel.course.nearest(point.x, point.z);
    Object.assign(fighter, point, {groundY: point.y, s, lateral});
    app.keys.KeyF = true;
    try { app.advance(.8); } finally { app.keys.KeyF = false; }
    return !duel.state.onFoot;
  },
  driveAcross: (gate, inside) => {
    const app = window.__qaApp, {duel} = app, {state, course} = duel;
    const direction = inside ? -1 : 1;
    const position = () => course.worldAt(state.s, state.lateral);
    const crossed = () => direction * (position().z - gate.z) > 4;
    app.keys.KeyW = true;
    try {
      for (let i = 0; i < 240 && !crossed(); i++) {
        const point = position();
        const remaining = direction * (gate.z - point.z);
        const heading = Math.atan2(gate.x - point.x, direction * Math.max(5, remaining));
        // Set a heading toward the narrow gate so the assertion exercises
        // the actual car motion and collision without an autopilot.
        state.headingError = heading - course.at(state.s).heading;
        app.advance(.05);
      }
    } finally {
      app.keys.KeyW = false;
    }
    app.keys.KeyS = true;
    try {
      for (let i = 0; i < 120 && state.speedMph > .1; i++) app.advance(.05);
    } finally {
      app.keys.KeyS = false;
    }
    return crossed();
  },
};

export const pageSource = (name, ...args) =>
  '(' + pageFunctions[name].toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')';

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, ...args) => context.waitFor(pageSource(name, ...args), name, 90000);
  const click = async action => {
    await wait('control', action);
    if (!await evaluate('control', action, true)) throw Error('Cannot open ' + action);
  };
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-choices,crew-gear,warlord-cards&harness=story-night-2');
  await wait('prepare');
  await click('wasteland-visit');
  await click('yard-cards');
  await click('story-open-roam');
  await wait('ready');
  if (!await evaluate('walkToCinder')) throw Error('The fighter could not walk from the hearth to Cinder.');
  await context.command('Input.dispatchKeyEvent', {type: 'keyDown', code: 'KeyF', key: 'f', windowsVirtualKeyCode: 70});
  try { await wait('talking'); }
  finally { await context.command('Input.dispatchKeyEvent', {type: 'keyUp', code: 'KeyF', key: 'f', windowsVirtualKeyCode: 70}); }
  await wait('roaming');
  const moving = await evaluate('frameTown', NIGHT_2_SITES.hearth.position);
  if (moving.length < 3) throw Error('Fewer than three moving people are in the town view.');
  await context.screenshot('open-roam-tin-town-by-day');
  if (!await evaluate('pause')) throw Error('Could not pause the roam.');
  await wait('roamPause');
  await click('resume');
  if (!await evaluate('boardForGate', NIGHT_2_SITES.car)) throw Error('F did not board the parked car.');
  // The car starts outside the gate. Bring it in, then drive out and back.
  for (const inside of [true, false, true]) {
    if (!await evaluate('driveAcross', NIGHT_2_SITES.gate, inside)) throw Error('The car did not clear the open gate.');
  }
  if (!await evaluate('pause')) throw Error('Could not pause before going home.');
  await wait('roamPause');
  await click('arena-yard');
  await wait('home');
  return {roam: true, talked: 'cinder', greetingClosed: true, crossedGate: true, moving};
}
