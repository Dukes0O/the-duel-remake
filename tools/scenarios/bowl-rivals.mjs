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
  start: night => `(() => { window.__qaApp.start(); document.querySelector('[data-action="show-night-start"][data-night="${night}"]').click(); return true; })()`,
  // Straight to the night's last event, as a won Car Crush and Freestyle would.
  skipTo: `(() => { const app = window.__qaApp, night = app.duel.state.bowlNight;
    night.show = {...night.show, eventIndex: 2}; night.phase = 'result'; return app.continueShowNight(); })()`,
  event: `(() => window.__qaApp.duel.state.bowlNight?.event?.type)()`,
  racing: `(() => window.__qaApp.duel.state.status === 'racing')()`,
  sideHud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('SIDE BY SIDE') && hud.textContent.includes('Race Rust Rhino once round the Bowl'); })()`,
  rival: `(() => window.__qaApp.duel.state.opponents.map(truck => truck.bowlRival).join())()`,
  truckHud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('LAST TRUCK ROLLING') && hud.textContent.includes('Knock out Big Kettle, Tin Lizard and Old Bess'); })()`,
  arenaHidden: `(() => { const board = document.querySelector('#arena-board'); return (!board || board.hidden) && !document.body.textContent.includes('SCRAPDOME'); })()`,
  fourTrucks: `(() => { const s = window.__qaApp.duel.state; return s.arena?.mode === 'last-car-rolling' && s.opponents.length === 3 && s.opponents.every(truck => truck.car === 'titan_monster'); })()`,
  pause: `(() => { window.__qaApp.togglePause(); return window.__qaApp.duel.state.paused === true; })()`,
  pauseCard: `(() => { const layer = document.querySelector('#modal-layer'); return !!layer && !layer.hidden && !layer.textContent.includes('SCRAPDOME') && !layer.textContent.includes('REMATCH'); })()`,
  resume: `(() => { window.__qaApp.resume(); return window.__qaApp.duel.state.paused === false; })()`,
  card: `(() => window.__qaApp.duel.state.status === 'bowl_break' && !!document.querySelector('.bowl-result [data-action="show-night-next"]'))()`,
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

async function startNight(context, night) {
  await context.evaluate(page.openPicker);
  await context.waitFor(page.picker, 'the picker offers nights two and three', 10000);
  await context.evaluate(page.easy);
  await context.evaluate(page.start(night));
  await context.waitFor(page.event, `night ${night} starts`, 60000);
  assert.ok(await context.evaluate(page.skipTo), 'the night goes on to its last event');
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
  await context.waitFor(page.sideHud, 'the Side by Side HUD names Rust Rhino', 30000);
  await context.waitFor(page.racing, 'the race starts', 10000);
  await picture(context, 'bowl-rivals-side-by-side');
  await key(context, 'KeyW', 'keydown');
  try { await context.waitFor(page.card, 'Side by Side ends', 70000); }
  finally { await key(context, 'KeyW', 'keyup'); }
  assert.ok((await context.evaluate(page.cardLine)).includes('Rust Rhino'), 'the card names the rival');
  await picture(context, 'bowl-rivals-side-by-side-card');
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu', 10000);

  // Night three: Last Truck Rolling, four trucks on the arena's rules.
  await startNight(context, 3);
  assert.equal(await context.evaluate(page.event), 'lastTruckRolling');
  assert.ok(await context.evaluate(page.fourTrucks), 'four trucks in the Bowl');
  await context.waitFor(page.truckHud, 'the HUD names the three rivals', 30000);
  assert.ok(await context.evaluate(page.arenaHidden), 'the Scrapdome board and words stay hidden');
  await context.waitFor(page.racing, 'the fight starts', 10000);
  await picture(context, 'bowl-rivals-last-truck-start');
  assert.ok(await context.evaluate(page.pause), 'the fight pauses');
  await context.waitFor(page.pauseCard, 'the show\'s pause card, not the Scrapdome\'s', 10000);
  await picture(context, 'bowl-rivals-last-truck-paused');
  assert.ok(await context.evaluate(page.resume), 'the fight goes on');
  await key(context, 'KeyW', 'keydown');
  try { await context.waitFor(page.card, 'Last Truck Rolling ends', 150000); }
  finally { await key(context, 'KeyW', 'keyup'); }
  await picture(context, 'bowl-rivals-last-truck-card');
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu with no arena left over', 10000);
}
