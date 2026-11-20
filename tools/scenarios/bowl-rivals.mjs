// BOWL-RIVALS: the rivals in the production UI, memory-only saves. Night two's
// Side by Side against Rust Rhino, then night three's Last Truck Rolling with
// four trucks: the HUD names the rivals, the arena's Scrapdome board and pause
// card stay hidden, the pause card is the show's own, and the event ends on the
// show's card. The earlier nights are marked won in the memory-only test
// player's save; nothing touches a real save. Claude runs it on the laptop;
// pictures go to the evidence folder for the look.
import assert from 'node:assert/strict';

export const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    if (!app.addPlayer('Rivals test').ok) throw Error('Could not create the memory-only player');
    app.advance(1); app.onFrame?.(app.duel.state); return true; })()`,
  // Nights one and two won, in the memory-only test player's save only.
  wonTwo: `(() => { const app = window.__qaApp; app.profile.bowl = {...(app.profile.bowl || {}), nightsWon: [1, 2]};
    if (!app._saveProfile()) throw Error('The memory-only save failed'); return true; })()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  openPicker: `(() => { document.querySelector('#show-night-visit').click(); return true; })()`,
  picker: `(() => ['2', '3'].every(night => !!document.querySelector('[data-action="show-night-start"][data-night="' + night + '"]')))()`,
  easy: `(() => { document.querySelector('[data-action="show-night-level"][data-level="easy"]').click(); return true; })()`,
  start: night => `(() => { window.__qaApp.start(); document.querySelector('[data-action="show-night-start"][data-night="${night}"]').click(); document.querySelector('[data-action="show-night-confirm"]').click(); return true; })()`,
  // Straight to the night's last event, as a won Car Crush and Freestyle would.
  skipTo: `(() => { const app = window.__qaApp, night = app.duel.state.bowlNight;
    night.show = {...night.show, eventIndex: 2}; night.phase = 'result'; return app.continueShowNight(); })()`,
  event: `(() => window.__qaApp.duel.state.bowlNight?.event?.type)()`,
  // The world is drawn: the game's own readiness gate is open, the player's truck model is loaded and drawn, the
  // stadium is in the picture, and so is a truck for every computer truck in the event (BOWL-HOOKS' wait, with the rivals).
  drawn: `(() => { const app = window.__qaApp, view = window.__render, s = app.duel.state;
    const canvas = document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]');
    if (!app.visualReady || canvas?.parentElement?.dataset?.vehicleAsset !== 'ready' || !view?.scene) return false;
    let trucks = 0; view.scene.traverse(node => { if (node.userData?.vehicleKey === 'titan_monster' && node.visible) trucks++; });
    return trucks >= 1 + s.opponents.length && !!view.scene.getObjectByName('Bowl stadium, floodlights and crowd'); })()`,
  // Where the event stands, for a timeout's report: the gate, the models, each truck and the clock.
  eventState: `(() => { const app = window.__qaApp, view = window.__render, s = app.duel.state, night = s.bowlNight;
    const host = document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]')?.parentElement?.dataset ?? {};
    let trucks = 0; view?.scene?.traverse(node => { if (node.userData?.vehicleKey === 'titan_monster' && node.visible) trucks++; });
    const truck = actor => actor && {rival: actor.bowlRival ?? null, s: +actor.s.toFixed(1), lateral: +actor.lateral.toFixed(2),
      mph: +actor.speedMph.toFixed(1), armor: Number.isFinite(actor.armor) ? Math.round(actor.armor) : null, wrecked: !!actor.combatWrecking};
    return JSON.stringify({status: s.status, paused: !!s.paused, countdown: s.countdown, stageTimeSec: +(s.stageTimeSec || 0).toFixed(2),
      visualReady: app.visualReady, vehicleAsset: host.vehicleAsset ?? null, warmupStatus: host.warmupStatus ?? null,
      parallelShaderCompile: host.parallelShaderCompile ?? null, trucksDrawn: trucks,
      stadium: !!view?.scene?.getObjectByName('Bowl stadium, floodlights and crowd'), arena: s.arena?.mode ?? null,
      night: night && {night: night.night, phase: night.phase, event: night.event?.type, rivals: night.event?.rivals ?? night.event?.rival ?? null,
        playerDoneAt: night.event?.playerDoneAt ?? null, rivalDoneAt: night.event?.rivalDoneAt ?? null, knockouts: night.event?.knockouts ?? null},
      truck: truck(s), opponents: s.opponents.map(truck), card: document.querySelector('.bowl-result')?.dataset.bowlResult ?? null}); })()`,
  racing: `(() => window.__qaApp.duel.state.status === 'racing')()`,
  sideHud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('SIDE BY SIDE') && hud.textContent.includes('Beat Rust Rhino over two laps.'); })()`,
  rival: `(() => window.__qaApp.duel.state.opponents.map(truck => truck.bowlRival).join())()`,
  twoLaps: `(() => { const app = window.__qaApp, event = app.duel.state.bowlNight?.event;
    return ['player','rival'].every(id => event.finishS[id] - event.startS[id] === 2 * app.duel.course.length); })()`,
  raceAssist: `(() => { window.__qaApp.autopilot = true; return true; })()`,
  manual: `(() => { window.__qaApp.autopilot = false; return true; })()`,
  finishSignal: `(() => ['player','rival'].includes(window.__qaApp.duel.state.bowlNight?.event?.finishWinner))()`,
  truckHud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('LAST TRUCK ROLLING') && hud.textContent.includes('Outlast Big Kettle, Tin Lizard, Old Bess.'); })()`,
  // The scoreboard's markup is always in the page, hidden; what must not show is the board or the word on screen.
  arenaHidden: `(() => { const board = document.querySelector('#arena-board'); return (!board || board.hidden) && !document.body.innerText.includes('SCRAPDOME'); })()`,
  fourTrucks: `(() => { const s = window.__qaApp.duel.state; return s.arena?.mode === 'last-car-rolling' && s.opponents.length === 3 && s.opponents.every(truck => truck.car === 'titan_monster'); })()`,
  // Nobody has a weapon in the Bowl: the arena fight's weapon bar is not shown.
  noWeaponBar: `(() => { const bar = document.querySelector('.combat-slot-bar'); return !bar || bar.hidden || !bar.offsetParent; })()`,
  pause: `(() => { window.__qaApp.togglePause(); return window.__qaApp.duel.state.paused === true; })()`,
  pauseCard: `(() => { const layer = document.querySelector('#modal-layer'); return !!layer && !layer.hidden && !layer.textContent.includes('SCRAPDOME') && !layer.textContent.includes('REMATCH'); })()`,
  resume: `(() => { window.__qaApp.resume(); return window.__qaApp.duel.state.paused === false; })()`,
  // The card after the event: an event's card, or the night's results when the event was the night's last and was won.
  card: `(() => window.__qaApp.duel.state.status === 'bowl_break' && !!document.querySelector('.bowl-result'))()`,
  // How Last Truck Rolling ended, in one sentence on whichever card follows it.
  truckOutcome: `(() => { const text = document.querySelector('.bowl-result')?.textContent ?? '';
    return ['Every other truck was knocked out', 'The clock ran out', 'knocked out before', 'Your truck was knocked out'].some(line => text.includes(line)); })()`,
  cardLine: `(() => document.querySelector('.bowl-result')?.textContent ?? '')()`,
  leave: `(() => { document.querySelector('[data-action="show-night-leave"][data-to="menu"]').click(); return true; })()`,
  menu: `(() => window.__qaApp.duel.state.status === 'menu' && !window.__qaApp.duel.state.bowlNight && !window.__qaApp.duel.state.arena)()`,
};

const key = (context, code, type) => {
  const expression = `(() => { document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code:${JSON.stringify(code)}, bubbles:true, cancelable:true})); })()`;
  new Function(expression);
  return context.evaluate(expression);
};
const picture = async (context, name) => { await context.evaluate(page.frame); await context.screenshot(name); };

// Wait for a condition; on a timeout the error (and so report.json) carries the event's state.
async function waitWithState(context, expression, label, timeout) {
  try { await context.waitFor(expression, label, timeout); }
  catch (error) {
    let state = 'unreadable';
    try { state = await context.evaluate(page.eventState); } catch {}
    throw Error(`${error.message} Event state: ${state}`);
  }
}

// Start the night, let its first event be drawn (so nothing is replaced while the renderer is still
// preparing it), then go on to the night's last event and wait for that to be drawn with every rival.
// A cold start loads the 14 MB Titan and the stadium, so each wait allows what Show Night allows.
async function startNight(context, night) {
  await context.evaluate(page.openPicker);
  await context.waitFor(page.picker, 'the picker offers nights two and three', 10000);
  await context.evaluate(page.easy);
  await context.evaluate(page.start(night));
  await context.waitFor(page.event, `night ${night} starts`, 60000);
  await waitWithState(context, page.drawn, `night ${night}'s first event is drawn`, 180000);
  assert.ok(await context.evaluate(page.skipTo), 'the night goes on to its last event');
  await waitWithState(context, page.drawn, `night ${night}'s last event is drawn with every rival's truck`, 180000);
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=titan-bowl');
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await context.evaluate(page.wonTwo);

  // Night two: Side by Side against Rust Rhino.
  await startNight(context, 2);
  assert.equal(await context.evaluate(page.event), 'sideBySide');
  assert.equal(await context.evaluate(page.rival), 'rust-rhino', 'night two races Rust Rhino');
  await waitWithState(context, page.sideHud, 'the Side by Side HUD names Rust Rhino', 30000);
  await waitWithState(context, page.racing, 'the race starts', 60000);
  await picture(context, 'bowl-rivals-side-by-side');
  assert.ok(await context.evaluate(page.twoLaps), 'both trucks start two laps from their own finish lines');
  await context.evaluate(page.raceAssist);
  try {
    await waitWithState(context, page.finishSignal, 'the first finisher sets the gate signal', 100000);
    await picture(context, 'bowl-rivals-side-by-side-gate');
    await waitWithState(context, page.card, 'the two-lap Side by Side ends', 12000);
  } finally { await context.evaluate(page.manual); }
  assert.ok((await context.evaluate(page.cardLine)).includes('Rust Rhino'), 'the card names the rival');
  await picture(context, 'bowl-rivals-side-by-side-card');
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu', 10000);

  // Night three: Last Truck Rolling, four trucks on the arena's rules.
  await startNight(context, 3);
  assert.equal(await context.evaluate(page.event), 'lastTruckRolling');
  assert.ok(await context.evaluate(page.fourTrucks), 'four trucks in the Bowl');
  await waitWithState(context, page.truckHud, 'the HUD names the three rivals', 30000);
  assert.ok(await context.evaluate(page.arenaHidden), 'the Scrapdome board and words stay hidden');
  await waitWithState(context, page.racing, 'the fight starts', 60000);
  await waitWithState(context, page.noWeaponBar, 'no weapon bar in the Bowl', 10000);
  await picture(context, 'bowl-rivals-last-truck-start');
  assert.ok(await context.evaluate(page.pause), 'the fight pauses');
  await context.waitFor(page.pauseCard, 'the show\'s pause card, not the Scrapdome\'s', 10000);
  await picture(context, 'bowl-rivals-last-truck-paused');
  assert.ok(await context.evaluate(page.resume), 'the fight goes on');
  await key(context, 'KeyW', 'keydown');
  try { await waitWithState(context, page.card, 'Last Truck Rolling ends', 180000); }
  finally { await key(context, 'KeyW', 'keyup'); }
  assert.ok(await context.evaluate(page.truckOutcome), 'the card says how Last Truck Rolling ended');
  await picture(context, 'bowl-rivals-last-truck-card');
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu with no arena left over', 10000);
}
