// HOME-GROUND-1: the player's own ground, by real key presses (docs/board/cards/HOME-GROUND-1.md). He talks to Auntie
// Solder, walks out of Tin Town's gate, sprints and bursts, hangs the gate and names the ground, fences the whole edge,
// is refused across the lane, walks into his fence, picks a panel up and sets it elsewhere, marks a piece from above and
// builds it on the ground, leaves, and finds it all where he left it on his next outing. Memory-only storage.
//
// Keys go to the page as the browser's own key events. Between them the page's simulation is stepped with
// window.__qaApp.advance, and the walker is turned to face where he is going (the mouse's job in play).
import {HOME_CORNER, HOME_STEP, HOME_WORDS} from '../../src/world/open/content/home-ground.js';

const FLAGS = 'hidden-road,story-choices,crew-gear,warlord-cards,home-ground';
const KEYS = {KeyW: ['w', 87], KeyB: ['b', 66], KeyR: ['r', 82], KeyG: ['g', 71], KeyV: ['v', 86], KeyX: ['x', 88],
  KeyF: ['f', 70], KeyD: ['d', 68], ShiftLeft: ['Shift', 16], Space: [' ', 32], Digit1: ['1', 49], Enter: ['Enter', 13]};
const point = (a, b) => ({x: HOME_CORNER.x + a * HOME_STEP, z: HOME_CORNER.z + b * HOME_STEP});

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
    const state = window.__qaApp?.duel.state, job = state?.arena?.worldJob;
    return state?.status === 'racing' && state.onFoot && job?.job.steps[job.job.stepIndex]?.kind === 'roam' &&
      job.open?.parts.home?.on === true && !!job.storyPeople?.some(person => person.id === 'auntie-solder');
  },
  advance: seconds => {
    for (let t = 0; t < seconds - 1e-9; t += .05) window.__qaApp.advance(.05);
    return true;
  },
  // Walk (W is held by the caller) toward a point, turning to face it as he goes; a person's id follows that person.
  walkTo: (target, within, limitSeconds = 40) => {
    const app = window.__qaApp, {fighter, arena} = app.duel.state;
    const where = () => typeof target === 'string'
      ? arena.worldJob.storyPeople.find(person => person.id === target).position : target;
    for (let t = 0; t < limitSeconds; t += .05) {
      const to = where(), distance = Math.hypot(to.x - fighter.x, to.z - fighter.z);
      if (distance <= within) return distance;
      fighter.yaw = Math.atan2(to.x - fighter.x, to.z - fighter.z);
      app.advance(Math.min(.05, Math.max(.01, (distance - within) / 9)));
    }
    const to = where();
    return Math.hypot(to.x - fighter.x, to.z - fighter.z);
  },
  camera: mode => { window.__qaApp.setFootCamera(mode); return window.__qaApp.footCameraMode; },
  face: yaw => { window.__qaApp.duel.state.fighter.yaw = yaw; window.__qaApp.advance(.05); return true; },
  talk: () => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    return talk ? {phase: talk.dataset.phase, words: talk.textContent} : null;
  },
  home: () => {
    const app = window.__qaApp, state = app.duel.state, job = state.arena?.worldJob, part = job?.open?.parts.home;
    const record = job?.open?.world.open.home ?? null;
    const visible = selector => { const el = document.querySelector(selector); return !!el && !el.hidden && !!el.getClientRects().length; };
    const panels = window.__render?.scene.getObjectByName('home-panels');
    return {record, kind: part?.kind, outline: part?.outline ? {mode: part.outline.mode, reason: part.outline.reason,
      piece: part.outline.piece, marked: part.outline.marked} : null, above: part?.above, naming: part?.naming,
      burst: part?.burst, prompt: visible('.world-hud-home') ? document.querySelector('.world-hud-home').textContent : '',
      burstBar: visible('.world-hud-burst'), nameBox: visible('.world-hud-name'),
      drawnPanels: panels?.visible !== false && panels?.parent?.visible ? panels.count : null,
      fighter: state.fighter && {x: state.fighter.x, z: state.fighter.z, speed: state.fighter.speed},
      camera: window.__render?.camera ? {y: window.__render.camera.position.y} : null};
  },
  roaming: () => {
    const job = window.__qaApp.duel.state.arena.worldJob.job;
    return job.steps[job.stepIndex]?.kind === 'roam' && document.querySelector('.story-talk')?.hidden;
  },
  pause: () => { window.__qaApp.togglePause(); return window.__qaApp.duel.state.paused; },
  yardHome: () => window.__qaApp.isYardHomeActive(),
  // The HUD is drawn on the page's own frames, after the simulation has moved.
  hudShows: (selector, shown) => {
    const el = document.querySelector(selector);
    return (!!el && !el.hidden && !!el.getClientRects().length) === shown;
  },
  // The camera rises over real frames, as the player sees it.
  cameraHeight: (above, metres) => {
    const y = window.__render?.camera?.position.y;
    return Number.isFinite(y) && (above ? y > metres : y < metres);
  },
  // The HUD's sentence, once the page has drawn the frame after the simulation moved.
  promptStarts: text => {
    const el = document.querySelector('.world-hud-home');
    return !!el && !el.hidden && el.textContent.startsWith(text);
  },
  marker: () => window.__qaApp.duel.state.arena.worldJob.marker ?? null,
  savedHome: () => {
    const app = window.__qaApp, profile = app.profile;
    return profile?.story?.open?.home ?? null;
  },
};

export const pageSource = (name, ...args) =>
  '(' + pageFunctions[name].toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')';

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, ...args) => context.waitFor(pageSource(name, ...args), name, 90000);
  const key = (type, code) => context.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0],
    windowsVirtualKeyCode: KEYS[code][1], ...(type === 'keyDown' && KEYS[code][0].length === 1 ? {text: KEYS[code][0]} : {}),
    ...(type === 'keyDown' && code === 'Enter' ? {text: String.fromCharCode(13)} : {})});
  const tap = async code => { await key('keyDown', code); await evaluate('advance', .1); await key('keyUp', code); await evaluate('advance', .05); };
  const hold = async (code, seconds) => { await key('keyDown', code); await evaluate('advance', seconds); await key('keyUp', code); await evaluate('advance', .05); };
  const walk = async (to, within = .25, sprint = false) => {
    await key('keyDown', 'KeyW'); if (sprint) await key('keyDown', 'ShiftLeft');
    try { return await evaluate('walkTo', to, within); }
    finally { if (sprint) await key('keyUp', 'ShiftLeft'); await key('keyUp', 'KeyW'); await evaluate('advance', .1); }
  };
  const home = () => evaluate('home');
  const click = async action => {
    await wait('control', action);
    if (!await evaluate('control', action, true)) throw Error('Cannot open ' + action);
  };
  const fail = (text, value) => { throw Error(text + (value === undefined ? '' : ' ' + JSON.stringify(value))); };
  const report = {};

  await context.navigate('/tools/menu-check.html?flags=' + FLAGS + '&harness=story-night-2');
  await wait('prepare');
  await click('wasteland-visit');
  await click('yard-cards');
  await click('story-open-roam');
  await wait('ready');
  let now = await home();
  if (now.record) fail('A new player already has a ground.');

  // ---- Auntie Solder's talk. ------------------------------------------------------------------------------------
  if (await walk('auntie-solder', 1.6) > 2.4) fail('He could not walk to Auntie Solder.');
  await key('keyDown', 'KeyF');
  await evaluate('advance', .2);
  await key('keyUp', 'KeyF');
  const opening = await evaluate('talk');
  if (!opening?.words.includes('bare patch of ground')) fail('F beside Auntie Solder did not open her talk about the ground.', opening);
  for (let n = 0; n < 8 && (await evaluate('talk'))?.phase !== 'options'; n++) { await tap('Space'); await evaluate('advance', .3); }
  if ((await evaluate('talk'))?.phase !== 'options') fail('The talk did not reach its answer.');
  await tap('Digit1');
  await evaluate('advance', .3);
  await wait('roaming');
  now = await home();
  if (!now.record || now.record.pieces.length) fail('Her talk did not give him a bare ground.', now.record);
  await wait('hudShows', '.story-talk', false);
  if (!await evaluate('marker')) fail('His ground was not marked for him to find.');
  report.name = now.record.name;

  // ---- Out of Tin Town's gate: sprint, then the burst. ----------------------------------------------------------
  if (await walk({x: 5975, z: 48}, 1.5, true) > 2) fail('He could not reach the inside of Tin Town\'s gate.');
  if (await walk({x: 5975, z: 80}, 1.5, true) > 2) fail('He could not walk out through the gate.');
  await evaluate('face', Math.atan2(5945 - 5975, 96 - 80));
  await key('keyDown', 'KeyW');
  await key('keyDown', 'KeyX');
  await evaluate('advance', 1);
  now = await home();
  await wait('hudShows', '.world-hud-burst', true);
  now = await home();
  if (!now.burst?.active || !(now.fighter.speed > 12)) fail('X did not give the burst.', now);
  report.burstSpeed = Math.round(now.fighter.speed * 10) / 10;
  await evaluate('advance', 2.2);
  now = await home();
  await key('keyUp', 'KeyX');
  await key('keyUp', 'KeyW');
  if (now.burst?.active || !now.burst?.spent || !(now.fighter.speed < 8)) fail('The burst did not empty in three seconds.', now);
  await evaluate('advance', 6.2);
  await wait('hudShows', '.world-hud-burst', false);
  const first = point(10, .8);
  if (await walk(first, .2) > .4) fail('He could not walk onto his ground.');
  if (await evaluate('marker')) fail('The marker stayed after he reached his ground.');
  await evaluate('face', Math.PI);
  await wait('promptStarts', 'Hold B to hammer up the tin panel.');

  // ---- The gate, and its name. ----------------------------------------------------------------------------------
  await tap('KeyG');
  now = await home();
  if (now.outline?.piece?.kind !== 'gate') fail('G did not put the gate in his hands.', now.outline);
  await hold('KeyB', 4.2);
  now = await home();
  if (JSON.stringify(now.record.pieces) !== JSON.stringify([{kind: 'gate', i: 8, j: 0, axis: 'x'}])) fail('Holding B did not hang the gate.', now.record);
  if (!now.naming) fail('Hanging the gate did not ask for a name.');
  await wait('hudShows', '.world-hud-name', true);
  await context.command('Input.insertText', {text: 'G-Town'});
  await key('keyDown', 'Enter'); await key('keyUp', 'Enter');
  await evaluate('advance', .2);
  await wait('hudShows', '.world-hud-name', false);
  now = await home();
  if (now.record.name !== 'G-Town') fail('The name he typed was not kept.', now.record.name);

  // ---- The lane: a panel across it is refused, with a sentence. --------------------------------------------------
  if (await walk(point(10.5, 5.8), .2) > .4) fail('He could not walk into the lane.');
  await evaluate('face', Math.PI);
  if ((await home()).outline?.mode !== 'refused') fail('A panel across the lane was not refused.');
  await wait('promptStarts', HOME_WORDS.lane);
  await hold('KeyB', 3.3);
  if ((await home()).record.pieces.length !== 1) fail('Holding B across the lane built something.');

  // ---- The whole edge, a panel at a time. ------------------------------------------------------------------------
  const ring = [
    ...[...Array(8).keys()].map(i => ({stand: point(i + .5, .8), yaw: Math.PI, piece: {kind: 'panel', i, j: 0, axis: 'x'}})),
    ...[...Array(8).keys()].map(n => n + 12).map(i => ({stand: point(i + .5, .8), yaw: Math.PI, piece: {kind: 'panel', i, j: 0, axis: 'x'}})),
    ...[...Array(20).keys()].map(j => ({stand: point(19.2, j + .5), yaw: Math.PI / 2, piece: {kind: 'panel', i: 20, j, axis: 'z'}})),
    ...[...Array(20).keys()].reverse().map(i => ({stand: point(i + .5, 19.2), yaw: 0, piece: {kind: 'panel', i, j: 20, axis: 'x'}})),
    ...[...Array(20).keys()].reverse().map(j => ({stand: point(.8, j + .5), yaw: -Math.PI / 2, piece: {kind: 'panel', i: 0, j, axis: 'z'}})),
  ];
  for (const [index, {stand, yaw, piece}] of ring.entries()) {
    if (await walk(stand, .12) > .3) fail('He could not reach the stand for panel ' + index + '.', piece);
    await evaluate('face', yaw);
    now = await home();
    if (now.outline?.mode !== 'build' || JSON.stringify(now.outline.piece) !== JSON.stringify(piece)) fail('The outline for panel ' + index + ' was wrong.', now.outline);
    await hold('KeyB', 3.1);
    if ((await home()).record.pieces.length !== index + 2) fail('Panel ' + index + ' did not go up.', piece);
    if (index === 3) await context.screenshot('home-ground-hammering');
  }
  now = await home();
  report.fenced = now.record.pieces.length;
  if (now.drawnPanels !== 76) fail('The fence is not drawn panel for panel.', now.drawnPanels);

  // ---- The fence is solid: walking at it stops him. --------------------------------------------------------------
  if (await walk(point(4.5, 2), .2) > .4) fail('He could not walk back to the north fence.');
  await evaluate('face', Math.PI);
  await hold('KeyW', 2);
  now = await home();
  if (!(now.fighter.z > HOME_CORNER.z + .2)) fail('He walked through his own fence.', now.fighter);

  // ---- Pick a panel up and set it elsewhere; then put it back. ---------------------------------------------------
  if (await walk(point(2.5, .8), .12) > .3) fail('He could not reach the panel to pick up.');
  await evaluate('face', Math.PI);
  if ((await home()).outline?.mode !== 'lift') fail('Facing a panel did not offer to pick it up.');
  await wait('promptStarts', 'Press B to pick up this tin panel.');
  await tap('KeyB');
  if ((await home()).record.pieces.length !== 76) fail('B did not pick the panel up.');
  if (await walk(point(4.5, 10.8), .12) > .3) fail('He could not carry the panel inside.');
  await evaluate('face', Math.PI);
  await hold('KeyB', 3.1);
  now = await home();
  if (!now.record.pieces.some(row => row.i === 4 && row.j === 10 && row.axis === 'x')) fail('The panel was not set down elsewhere.', now.record.pieces.at(-1));
  await tap('KeyB');
  if (await walk(point(2.5, .8), .12) > .3) fail('He could not carry the panel back.');
  await evaluate('face', Math.PI);
  await hold('KeyB', 3.1);
  if ((await home()).record.pieces.length !== 77) fail('The panel did not go back into the fence.');

  // ---- From above: look down, mark a piece, come back down and build it. -----------------------------------------
  if (await walk(point(4, 12), .2) > .4) fail('He could not walk to the middle of his ground.');
  await evaluate('face', Math.PI);
  await tap('KeyV');
  if (!(await home()).above) fail('V did not lift the view above the ground.');
  await wait('cameraHeight', true, 50);
  await context.screenshot('home-ground-from-above');
  await hold('KeyD', .2);
  await tap('KeyB');
  now = await home();
  if (now.record.marks.length !== 1 || now.record.pieces.length !== 77) fail('B from above did not mark a piece.', now.record.marks);
  const mark = now.record.marks[0];
  await tap('KeyV');
  if ((await home()).above) fail('V again did not bring the view back down.');
  await wait('cameraHeight', false, 20);
  const markStand = mark.axis === 'x' ? point(mark.i + .5, mark.j + .7) : point(mark.i + .7, mark.j + .5);
  if (await walk(markStand, .1) > .3) fail('He could not walk to his mark.');
  await evaluate('face', mark.axis === 'x' ? Math.PI : -Math.PI / 2);
  now = await home();
  if (!now.outline?.marked) fail('The outline in front of him is not his mark.', now.outline);
  await hold('KeyB', 3.1);
  now = await home();
  if (now.record.marks.length || now.record.pieces.length !== 78) fail('The marked piece was not built.', now.record);
  // Out through his own gate, which opens for him, to look back at the fence and the board.
  if (await walk(point(10, 3), .3) > .6) fail('He could not walk back to his gate.');
  if (await walk(point(10, -7), .3) > .6) fail('He could not walk out through his own gate.');
  await evaluate('face', 0);
  await evaluate('camera', 'overhead');
  await evaluate('advance', .5);
  await context.screenshot('home-ground-at-the-gate');
  await evaluate('camera', 'first-person');

  // ---- He leaves; on his next outing it is all where he left it. -------------------------------------------------
  const left = now.record;
  if (!await evaluate('pause')) fail('Could not pause the outing.');
  await click('arena-yard');
  await wait('yardHome');
  const saved = await evaluate('savedHome');
  if (JSON.stringify(saved) !== JSON.stringify(left)) fail('The ground was not saved as he left it.', saved);
  await click('yard-cards');
  await click('story-open-roam');
  await wait('ready');
  await evaluate('advance', .5);
  now = await home();
  if (JSON.stringify(now.record) !== JSON.stringify(left) || now.drawnPanels !== 77) fail('The next outing did not bring his ground back.', now);
  return {...report, pieces: left.pieces.length, kept: true};
}
