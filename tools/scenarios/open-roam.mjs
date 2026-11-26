import {NIGHT_2_SITES} from '../../src/world/jobs/night-2-sites.js';

export const pageFunctions = {
  prepare: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is required.');
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
  advanceLine: index => {
    const {job} = window.__qaApp.duel.state.arena.worldJob;
    if (job.stepState.talk?.phase !== 'lines' || job.stepState.talk.index !== index) return false;
    const button = document.querySelector('.story-talk:not([hidden]) .story-talk-controls button:first-child');
    if (!button || button.disabled || !button.getClientRects().length) return false;
    button.click();
    return true;
  },
  leaveTalk: () => {
    const button = [...document.querySelectorAll('.story-options button')].find(el => el.textContent.includes('Walk away.'));
    if (!button || button.disabled) return false;
    button.click();
    return true;
  },
  roaming: () => {
    const job = window.__qaApp.duel.state.arena.worldJob.job;
    return job.steps.length === 1 && job.steps[job.stepIndex]?.kind === 'roam' && !job.talkResult;
  },
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
  await wait('advanceLine', 0);
  await wait('advanceLine', 1);
  await wait('leaveTalk');
  await wait('roaming');
  if (!await evaluate('boardForGate', NIGHT_2_SITES.car)) throw Error('F did not board the parked car.');
  // The car starts outside the gate. Bring it in, then drive out and back.
  for (const inside of [true, false, true]) {
    if (!await evaluate('driveAcross', NIGHT_2_SITES.gate, inside)) throw Error('The car did not clear the open gate.');
  }
  return {roam: true, talked: 'cinder', departedTalk: true, crossedGate: true};
}
