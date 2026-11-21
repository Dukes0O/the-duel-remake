// BOWL-HOOKS: one Show Night and its pay in the production UI, memory-only saves. The way in
// from the main menu, the picker with the lent truck, the HUD and crowd meter,
// the card between events, the night's results with the purse, and the way out.
// Claude runs it on the laptop; pictures go to the evidence folder for the look.
import assert from 'node:assert/strict';
import {createFreestyleDriver} from '../bowl-freestyle-balance.mjs';

// The same two passes drive the browser and headless Show Night checks. A
// seeded slow driver can vary its pace, lane and short lifts without changing
// the truck or the event.
export function createCarCrushDriver({pace = 27, laneBias = 0, random = null} = {}) {
  let progress = 0, previousPhase = null, wobble = 0, lift = 0, step = 0;
  return duel => {
    const {state, course} = duel, phase = course.phase(state.s);
    const delta = phase - (previousPhase ?? phase);
    progress += delta > course.length / 2 ? delta - course.length
      : delta < -course.length / 2 ? delta + course.length : delta;
    previousPhase = phase;
    const line = course.features.bowl.crush.lateral;
    const lane = progress < 66 ? line : line - 4.4 + laneBias;
    if (random && step++ % 60 === 0) {
      wobble = random.range(-.08, .08);
      if (random.chance(.12)) lift = 72;
    }
    lift = Math.max(0, lift - 1);
    const steer = (state.lateral - lane) * .3 + state.headingError * 1.55 + wobble;
    return {throttle: +(!lift && state.speedMph < pace), brake: 0,
      steer: state.airborne ? 0 : Math.max(-1, Math.min(1, steer)), boost: false};
  };
}

const startCrush = `(() => {
  const app = window.__qaApp, drive = (${createCarCrushDriver.toString()})();
  app._driveAutopilot = function () {
    if (this.duel.state.status === 'racing') this.duel.setInput(drive(this.duel));
  };
  app.autopilot = true;
  return true;
})()`;
const startFreestyle = `(() => {
  const app = window.__qaApp, drive = (${createFreestyleDriver.toString()})('show');
  app._driveAutopilot = function (dt) {
    if (this.duel.state.status === 'racing') this.duel.setInput(drive(this.duel, dt));
  };
  app.autopilot = true;
  return true;
})()`;
const stopCrush = `(() => {
  const app = window.__qaApp;
  app.autopilot = false;
  delete app._driveAutopilot;
  return true;
})()`;

// Each page expression is self-contained and can be checked without a browser.
export const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    if (!app.addPlayer('Show Night test').ok) throw Error('Could not create the memory-only player');
    app.advance(1); app.onFrame?.(app.duel.state); return true; })()`,
  menuButton: `(() => { const button = document.querySelector('#show-night-visit'); return !!button && !button.hidden; })()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  storage: `(() => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])))()`,
  openPicker: `(() => { document.querySelector('#show-night-visit').click(); return true; })()`,
  picker: `(() => { const panel = document.querySelector('.bowl-panel'); return !!panel && panel.textContent.includes('lend you its truck') && !!panel.querySelector('[data-action="show-night-start"][data-night="1"]') && !panel.querySelector('[data-night="3"][data-action="show-night-start"]'); })()`,
  easy: `(() => { document.querySelector('[data-action="show-night-level"][data-level="easy"]').click(); return true; })()`,
  chooseNight: `(() => { document.querySelector('[data-action="show-night-start"][data-night="1"]').click(); return true; })()`,
  opening: `(() => { const panel = document.querySelector('.bowl-opening'); return window.__qaApp.duel.state.status === 'menu' &&
    panel?.textContent.includes('welcome to the Bowl') && panel.textContent.includes('Rookie Night') &&
    panel.textContent.includes('Car Crush · Freestyle · Side by Side') && panel.querySelectorAll('kbd').length >= 3 &&
    !!panel.querySelector('[data-action="show-night-confirm"]'); })()`,
  start: `(() => { window.__qaApp.start(); document.querySelector('[data-action="show-night-confirm"]').click(); return true; })()`,
  spaceForTruck: `(() => ['.route-hud', '.lap-readout', '.gear', '.rear-view-frame'].every(selector => {
    const node = document.querySelector(selector); return !!node && !node.getClientRects().length; }))()`,
  tricks: `(() => { const card = document.querySelector('.bowl-trick-card'); return window.__qaApp.duel.state.paused &&
    card?.querySelectorAll('.bowl-trick-picture').length === 8 && !!card.querySelector('kbd'); })()`,
  resumed: `(() => !window.__qaApp.duel.state.paused && !document.querySelector('.bowl-trick-card'))()`,
  hud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('CAR CRUSH') && !!hud.querySelector('meter'); })()`,
  onShowTruck: `(() => { const s = window.__qaApp.duel.state; return s.car === 'titan_monster' && window.__qaApp.duel.course.def.bowl === true && s.bowlNight?.lent === true; })()`,
  // The HUD is drawn at once, the world a little later: wait until the Bowl's stadium and the Titan are in the picture.
  drawn: `(() => { const app = window.__qaApp, view = window.__render, canvas = document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]');
    if (!app.visualReady || canvas?.parentElement?.dataset?.vehicleAsset !== 'ready' || !view?.scene) return false;
    let titan = false; view.scene.traverse(node => { if (node.userData?.vehicleKey === 'titan_monster' && node.visible) titan = true; });
    return titan && !!view.scene.getObjectByName('Bowl stadium, floodlights and crowd'); })()`,
  // A card after an event, or the night's results after the last one (which has no NEXT EVENT button).
  card: `(() => window.__qaApp.duel.state.status === 'bowl_break' && !!document.querySelector('.bowl-result'))()`,
  // Where the night stands, for a timeout's report: both trucks' lap progress, the event's step and the clock.
  eventState: `(() => { const app = window.__qaApp, s = app.duel.state, night = s.bowlNight, rival = s.opponents?.[0];
    const truck = actor => actor && {s: +actor.s.toFixed(1), lateral: +actor.lateral.toFixed(2), mph: +actor.speedMph.toFixed(1),
      completedLaps: actor.completedLaps, nextLapGate: actor.nextLapGate};
    return JSON.stringify({status: s.status, paused: !!s.paused, countdown: s.countdown, stageTimeSec: +(s.stageTimeSec || 0).toFixed(2),
      night: night && {phase: night.phase, event: night.event?.type, eventIndex: night.show?.eventIndex, attempt: night.event?.attempt,
        clock: +night.clock.toFixed(1), playerDoneAt: night.event?.playerDoneAt, rivalDoneAt: night.event?.rivalDoneAt, attempts: night.attempts.length},
      truck: {...truck(s), crashes: s.stageCrashes, impactTimer: s.impactTimer, tumble: !!s.tumble, airborne: !!s.airborne},
      rival: truck(rival), autopilot: app.autopilot === true, visualReady: app.visualReady,
      card: document.querySelector('.bowl-result')?.dataset.bowlResult ?? null}); })()`,
  cardWon: `(() => document.querySelector('.bowl-result')?.dataset.bowlResult === 'won')()`,
  crushCountMet: `(() => {
    const app = window.__qaApp, result = app.duel.state.bowlNight?.lastResult;
    const card = document.querySelector('.bowl-result');
    return result?.event === 'carCrush' && result.count >= 13 && app.duel.state.stageTimeSec >= 59.99 &&
      card?.textContent.includes('You crushed ' + result.count + ' of ' + result.total + ' pieces.');
  })()`,
  startCrush,
  stopCrush,
  next: `(() => { document.querySelector('[data-action="show-night-next"]').click(); return true; })()`,
  freestyleCrowd: `(() => { const hud = document.querySelector('.bowl-hud'); return !hud.hidden && hud.textContent.includes('FREESTYLE') && window.__qaApp.duel.state.stageTimeSec > 15; })()`,
  autopilot: `(() => { window.__qaApp.autopilot = true; return true; })()`,
  manual: `(() => { window.__qaApp.autopilot = false; return true; })()`,
  event: `(() => window.__qaApp.duel.state.bowlNight?.event?.type)()`,
  nightDone: `(() => window.__qaApp.duel.state.bowlNight?.phase === 'complete' && !!document.querySelector('[data-bowl-result="night"]'))()`,
  purse: `(() => document.querySelector('[data-bowl-result="night"]').textContent.includes('purse of 250 scrap'))()`,
  scrap: `(() => window.__qaApp.profile.wasteland?.scrap ?? 0)()`,
  titanOwned: `(() => (window.__qaApp.profile.unlockedCars || []).includes('titan_monster'))()`,
  leave: `(() => { document.querySelector('[data-action="show-night-leave"][data-to="menu"]').click(); return true; })()`,
  menu: `(() => window.__qaApp.duel.state.status === 'menu' && !window.__qaApp.duel.state.bowlNight)()`,
  circuitList: `(() => [...document.querySelectorAll('#scene-select option')].every(option => option.textContent !== 'The Bowl'))()`,
};

const key = (context, code, type) => {
  const expression = `(() => { document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code:${JSON.stringify(code)}, bubbles:true, cancelable:true})); })()`;
  new Function(expression);
  return context.evaluate(expression);
};
const picture = async (context, name) => { await context.evaluate(page.frame); await context.screenshot(name); };
// Wait for an event to end; on a timeout the error (and so report.json) carries the night's state.
async function waitForCard(context, label, timeout) {
  try { await context.waitFor(page.card, label, timeout); }
  catch (error) {
    let state = 'unreadable';
    try { state = await context.evaluate(page.eventState); } catch {}
    throw Error(`${error.message} Night state: ${state}`);
  }
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=titan-bowl');
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await context.waitFor(page.menuButton, 'SHOW NIGHT on the main menu', 30000);
  assert.ok(await context.evaluate(page.circuitList), 'the Bowl is not in the circuit list');
  const before = await context.evaluate(page.storage);
  const scrapBefore = await context.evaluate(page.scrap);
  await context.evaluate(page.openPicker);
  await context.waitFor(page.picker, 'the picker offers night one with the lent truck', 10000);
  await context.evaluate(page.easy);
  await picture(context, 'bowl-night-picker');
  assert.equal(await context.evaluate(page.storage), before, 'opening the picker saves nothing');

  await context.evaluate(page.chooseNight);
  await context.waitFor(page.opening, 'Big Mo welcomes the driver before the countdown', 10000);
  assert.equal(await context.evaluate(page.storage), before, 'opening the night card saves nothing');
  await context.evaluate(page.start);
  await context.waitFor(page.hud, 'the Car Crush HUD', 60000);
  assert.ok(await context.evaluate(page.onShowTruck), 'the night is on the Bowl in the lent show truck');
  await context.waitFor(page.drawn, 'the Bowl stadium and the Titan are drawn', 120000);
  await picture(context, 'bowl-night-car-crush-start');
  assert.ok(await context.evaluate(page.spaceForTruck), 'the standard route map, lap number, gear and mirror are out of view');
  await key(context, 'KeyH', 'keydown');
  await key(context, 'KeyH', 'keyup');
  await context.waitFor(page.tricks, 'H pauses and opens all eight pictured tricks', 10000);
  await key(context, 'KeyH', 'keydown');
  await key(context, 'KeyH', 'keyup');
  await context.waitFor(page.resumed, 'H closes the trick card and continues the event', 10000);
  await context.evaluate(page.startCrush);
  try { await waitForCard(context, 'the Car Crush runs its full minute', 180000); }
  finally { await context.evaluate(page.stopCrush); }
  assert.ok(await context.evaluate(page.cardWon), 'the first Car Crush run is won');
  assert.ok(await context.evaluate(page.crushCountMet), 'the driver wins by count after the full minute');
  await picture(context, 'bowl-night-car-crush-card');
  // Every later event (and any retry) is driven by the test driver.
  let freestyleSeen = false;
  for (let round = 1; round <= 8 && !await context.evaluate(page.nightDone); round++) {
    await context.evaluate(page.next);
    const type = await context.evaluate(page.event);
    await context.evaluate(type === 'freestyle' ? startFreestyle : page.autopilot);
    try {
      if (type === 'freestyle' && !freestyleSeen) {
        await context.waitFor(page.freestyleCrowd, 'Freestyle under way', 60000);
        await picture(context, 'bowl-night-freestyle-hud');
        freestyleSeen = true;
      }
      await waitForCard(context, `${type} ends`, 150000);
    } finally {
      await context.evaluate(type === 'freestyle' ? page.stopCrush : page.manual);
    }
    await picture(context, `bowl-night-card-${round}-${String(type).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
  }
  assert.ok(await context.evaluate(page.nightDone), 'the night reaches its results');
  await picture(context, 'bowl-night-results');
  assert.ok(await context.evaluate(page.purse), 'the results name the purse');
  assert.equal(await context.evaluate(page.scrap), scrapBefore + 250, 'the purse is in the scrap wallet once');
  assert.equal(await context.evaluate(page.titanOwned), false, 'the lent truck is not added to the save');
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu', 10000);
  assert.equal(await context.evaluate(page.scrap), scrapBefore + 250, 'leaving pays nothing more');
}
