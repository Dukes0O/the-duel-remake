// MENU-FRONT-DOOR look check: the front door at 1280x720 for a new player, a mid-career player and with the
// Race options drawer open. Memory-only saves, no frame timing. It saves three pictures and checks that the
// first screen needs no page scroll and that every door stays reachable with the drawer open. Run:
//   node tools/browser-harness.mjs scenario menu-front-door
const entry = '/tools/menu-check.html?flags=menu-front-door,helicopter,lab';
const ready = `document.readyState==='complete' && !!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'
  && !document.querySelector('#start-engine')?.disabled && !!document.querySelector('#front-door')`;

// Scroll, overlap and reach: the page does not scroll, nothing sticks out of the screen, and each enabled door
// is the element found at its own centre (so nothing sits on top of it).
const layoutCheck = `(() => {
  const root = document.scrollingElement, out = [];
  if (root.scrollHeight > innerHeight + 1 || root.scrollWidth > innerWidth + 1) out.push('page scrolls: ' + root.scrollHeight + 'x' + root.scrollWidth);
  for (const tile of document.querySelectorAll('.front-door-tile:not(.is-locked), #fd-next, #start-engine, #fd-options-toggle')) {
    const box = tile.getBoundingClientRect();
    if (box.bottom > innerHeight || box.right > innerWidth || box.left < 0 || box.top < 0) out.push(tile.id || tile.dataset.door + ' outside the screen');
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    if (!top || !tile.contains(top)) out.push((tile.id || tile.dataset.door) + ' covered by ' + (top?.id || top?.className || top?.tagName));
  }
  return out;
})()`;

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(ready, 'the front door', 90_000);
  // The QA page's own test panels would sit on top of the picture; hide them (they are not part of the game's menu).
  await context.evaluate(`window.__qaApp.audio.setMuted?.(true); for (const el of document.querySelectorAll('body > details')) el.style.display = 'none'`);
  await new Promise(resolve => setTimeout(resolve, 800));
  const problems = [];
  const check = async label => (await context.evaluate(layoutCheck)).forEach(item => problems.push(`${label}: ${item}`));
  await check('new player');
  await context.screenshot('front-door-new');

  // A mid-career player: several cars, Lab and helicopter open, a Wasteland boss hold at 75, one race on the chosen course.
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.addPlayer('Front door QA');
    const now = Date.now();
    app.profile = {...app.profile, credits: 6200,
      unlockedCars: ['falcone_f42', 'stuttgart_959s', 'falcone_heritage', 'aurora_gt', 'dusthawk_rally', 'banshee_muscle'],
      wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true, pacificFinishes: 10, scrap: 340,
        territories: {sal: {hold: 75, claimed: false}}},
      heli: {...(app.profile.heli ?? {}), version: 1, fuelKg: 0, lessons: {liftoff: true, hover: true, landing: true, carry: true},
        playDay: {last: null, count: 0}, jobs: {day: 0, taken: null, done: []}, carsAt: {}, refuels: 0, flights: 0},
      history: [{key: 'qa-1', eventId: 'pacific-canyon', car: 'falcone_f42', won: false, completed: true, timeSec: 191.2, cpuDifficulty: 'easy', reward: 0, at: now - 9000},
        {key: 'qa-2', eventId: 'pacific-canyon', car: 'falcone_f42', won: true, completed: true, timeSec: 187.4, cpuDifficulty: 'easy', reward: 600, at: now}],
      personalBests: {'pacific-canyon|layout:4|seed:1989|laps:2|falcone_f42|duel|casual|easy': 185.1}};
    app._saveProfile(); })()`);
  await context.reload();
  await context.waitFor(ready, 'the mid-career front door', 90_000);
  await context.evaluate(`for (const el of document.querySelectorAll('body > details')) el.style.display = 'none'`);
  await new Promise(resolve => setTimeout(resolve, 800));
  await check('mid-career');
  await context.screenshot('front-door-mid');

  await context.evaluate(`document.querySelector('#fd-options-toggle').click()`);
  await context.waitFor(`!document.querySelector('#race-options').hidden`, 'the drawer', 5_000);
  await new Promise(resolve => setTimeout(resolve, 400));
  await check('drawer open');
  await context.screenshot('front-door-drawer');
  // The drawer scrolls inside itself: its last control comes into view and the doors are still uncovered and in place.
  const drawer = await context.evaluate(`(() => { const d = document.querySelector('#race-options'), b = d.getBoundingClientRect();
    const doors = document.querySelector('#fd-doors').getBoundingClientRect();
    return {bottom: b.bottom, doorsTop: doors.top, scrolls: d.scrollHeight > d.clientHeight}; })()`);
  if (drawer.bottom > drawer.doorsTop) problems.push(`the drawer reaches ${Math.round(drawer.bottom)} but the doors start at ${Math.round(drawer.doorsTop)}`);
  await context.evaluate(`(() => { const d = document.querySelector('#race-options'); d.scrollTop = d.scrollHeight; })()`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const last = await context.evaluate(`(() => { const d = document.querySelector('#race-options').getBoundingClientRect(), g = document.querySelector('#race-options .garage-count, #race-options .garage').getBoundingClientRect();
    return {inside: g.top >= d.top && g.top < d.bottom}; })()`);
  if (!last.inside) problems.push('the car panel at the end of the drawer cannot be reached by scrolling the drawer');
  await check('drawer scrolled to the end');
  await context.screenshot('front-door-drawer-end');
  if (problems.length) throw Error(problems.join(' | '));
}
