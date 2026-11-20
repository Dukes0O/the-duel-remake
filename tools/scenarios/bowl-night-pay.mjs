// BOWL-HOOKS: one Show Night and its pay in the production UI, memory-only saves. The way in
// from the main menu, the picker with the lent truck, the HUD and crowd meter,
// the card between events, the night's results with the purse, and the way out.
// Claude runs it on the laptop; pictures go to the evidence folder for the look.
import assert from 'node:assert/strict';

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
  start: `(() => { window.__qaApp.start(); document.querySelector('[data-action="show-night-start"][data-night="1"]').click(); return true; })()`,
  hud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('CAR CRUSH') && !!hud.querySelector('meter'); })()`,
  onShowTruck: `(() => { const s = window.__qaApp.duel.state; return s.car === 'titan_monster' && window.__qaApp.duel.course.def.bowl === true && s.bowlNight?.lent === true; })()`,
  card: `(() => window.__qaApp.duel.state.status === 'bowl_break' && !!document.querySelector('.bowl-result [data-action="show-night-next"]'))()`,
  cardWon: `(() => document.querySelector('.bowl-result')?.dataset.bowlResult === 'won')()`,
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

  await context.evaluate(page.start);
  await context.waitFor(page.hud, 'the Car Crush HUD', 60000);
  assert.ok(await context.evaluate(page.onShowTruck), 'the night is on the Bowl in the lent show truck');
  await picture(context, 'bowl-night-car-crush-start');
  await key(context, 'KeyW', 'keydown');
  try { await context.waitFor(page.card, 'the Car Crush ends', 60000); }
  finally { await key(context, 'KeyW', 'keyup'); }
  await picture(context, 'bowl-night-car-crush-card');
  // Every later event (and any retry) is driven by the test driver.
  let freestyleSeen = false;
  for (let round = 1; round <= 8 && !await context.evaluate(page.nightDone); round++) {
    await context.evaluate(page.next);
    const type = await context.evaluate(page.event);
    await context.evaluate(page.autopilot);
    if (type === 'freestyle' && !freestyleSeen) {
      await context.waitFor(page.freestyleCrowd, 'Freestyle under way', 60000);
      await picture(context, 'bowl-night-freestyle-hud');
      freestyleSeen = true;
    }
    await context.waitFor(page.card, `${type} ends`, 150000);
    await context.evaluate(page.manual);
    await picture(context, `bowl-night-card-${round}-${type}`);
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
