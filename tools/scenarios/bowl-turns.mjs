// BOWL-TURNS: a Turn Show for two named players in the production UI, memory-only
// saves. The way in from the Show Night picker, picking the players in order, the
// pass-the-keyboard screen that waits for a fresh key press, every go, the card
// after each go, the scoreboard, and each save holding only its own player's
// scores. Claude runs it on the laptop; pictures go to the evidence folder for the look.
import assert from 'node:assert/strict';

// Each page expression is self-contained and can be checked without a browser.
export const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    for (const name of ['Turn Kyle', 'Turn Gratian']) if (!app.addPlayer(name).ok) throw Error('Could not create a memory-only player');
    const kyle = app.players.players.find(player => player.name === 'Turn Kyle');
    if (!app.selectPlayer(kyle.id)) throw Error('Could not select the host');
    app.advance(1); app.onFrame?.(app.duel.state); return true; })()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  saves: `(() => { const data = JSON.parse(localStorage.getItem('the-duel-players-v2') || 'null'); return JSON.stringify(data?.players.map(player => ({id: player.id, name: player.name, scrap: player.profile.wasteland?.scrap ?? 0, bests: player.profile.bowl?.bestScores ?? {}, nightsWon: player.profile.bowl?.nightsWon ?? [], credits: player.profile.credits})) ?? []); })()`,
  ids: `(() => JSON.stringify(Object.fromEntries(window.__qaApp.players.players.map(player => [player.name, player.id]))))()`,
  openPicker: `(() => { document.querySelector('#show-night-visit').click(); return true; })()`,
  openTurns: `(() => { document.querySelector('[data-action="show-turns-open"]').click(); return true; })()`,
  setup: `(() => !!document.querySelector('.bowl-turns [data-action="show-turns-player"]'))()`,
  pick: name => `(() => { const button = [...document.querySelectorAll('[data-action="show-turns-player"]')].find(item => item.textContent.trim().endsWith(${JSON.stringify(name)})); button.click(); return true; })()`,
  easy: `(() => { document.querySelector('[data-action="show-turns-level"][data-level="easy"]').click(); return true; })()`,
  start: `(() => { window.__qaApp.start(); document.querySelector('[data-action="show-turns-start"][data-night="1"]').click(); return true; })()`,
  handoff: `(() => { const panel = document.querySelector('.bowl-handoff'); return panel ? panel.querySelector('h2').textContent : ''; })()`,
  status: `(() => window.__qaApp.duel.state.status)()`,
  active: `(() => window.__qaApp.player.name)()`,
  driver: `(() => window.__qaApp.duel.state.bowlNight?.turn?.driver ?? '')()`,
  hud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('IS DRIVING'); })()`,
  autopilot: `(() => { window.__qaApp.autopilot = true; return true; })()`,
  manual: `(() => { window.__qaApp.autopilot = false; return true; })()`,
  card: `(() => window.__qaApp.duel.state.status === 'bowl_break' && !!document.querySelector('.bowl-turns [data-action="show-turns-pass"]'))()`,
  pass: `(() => { document.querySelector('[data-action="show-turns-pass"]').click(); return true; })()`,
  goes: `(() => JSON.stringify(window.__qaApp.turnShowView()?.show.goes.map(go => ({playerId: go.playerId, event: go.event, score: go.score, won: go.won, saved: go.settled?.saved})) ?? []))()`,
  board: `(() => !!document.querySelector('[data-bowl-result="turns"] .bowl-turns-board') && window.__qaApp.duel.state.status === 'menu')()`,
  close: `(() => { document.querySelector('[data-bowl-result="turns"] [data-action="show-turns-leave"]').click(); return true; })()`,
  over: `(() => !window.__qaApp.turnShowView() && window.__qaApp.duel.state.status === 'menu')()`,
};

const key = (context, code, type, repeat = false) => {
  const expression = `(() => { document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code:${JSON.stringify(code)}, repeat:${repeat}, bubbles:true, cancelable:true})); })()`;
  new Function(expression);
  return context.evaluate(expression);
};
const picture = async (context, name) => { await context.evaluate(page.frame); await context.screenshot(name); };
const json = async (context, expression) => JSON.parse(await context.evaluate(expression));
const SAVE_IDS = {carCrush: 'car-crush', freestyle: 'freestyle', sideBySide: 'side-by-side'};

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=titan-bowl');
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  const ids = await json(context, page.ids);
  const before = await json(context, page.saves);
  await context.evaluate(page.openPicker);
  await context.evaluate(page.openTurns);
  await context.waitFor(page.setup, 'the Turn Show setup lists the players', 10000);
  await context.evaluate(page.pick('Turn Gratian'));
  await context.evaluate(page.pick('Turn Kyle'));
  await context.evaluate(page.easy);
  await picture(context, 'bowl-turns-setup');
  assert.deepEqual(await json(context, page.saves), before, 'setting up the show saves nothing');
  await context.evaluate(page.start);

  const order = [];
  for (let go = 1; go <= 6; go++) {
    const expected = go % 2 ? 'Turn Gratian' : 'Turn Kyle';
    await context.waitFor(`(() => ${page.handoff}.length > 0)()`, `the pass-the-keyboard screen for go ${go}`, 20000);
    assert.equal(await context.evaluate(page.handoff), `${expected.toUpperCase()} IS UP. PASS THE KEYBOARD.`, `go ${go} names its player`);
    assert.equal(await context.evaluate(page.active), expected, `${expected} is the active player for their own go`);
    if (go <= 2) await picture(context, `bowl-turns-handoff-${go}`);
    // A key held from the last go repeats; it must not start the next one.
    await key(context, 'KeyW', 'keydown', true);
    await context.evaluate(page.frame);
    assert.equal(await context.evaluate(page.status), 'menu', 'a repeating held key starts nothing');
    await key(context, 'KeyW', 'keyup');
    await key(context, 'KeyJ', 'keydown');
    await key(context, 'KeyJ', 'keyup');
    await context.waitFor(page.hud, `${expected}'s go starts with the HUD naming the driver`, 30000);
    assert.equal(await context.evaluate(page.driver), expected.trim(), 'the go belongs to its player');
    if (go === 1) await picture(context, 'bowl-turns-hud');
    await context.evaluate(page.autopilot);
    await context.waitFor(page.card, `go ${go} ends`, 150000);
    await context.evaluate(page.manual);
    if (go <= 2 || go === 6) await picture(context, `bowl-turns-card-${go}`);
    order.push(expected);
    await context.evaluate(page.pass);
  }
  assert.deepEqual(order, ['Turn Gratian', 'Turn Kyle', 'Turn Gratian', 'Turn Kyle', 'Turn Gratian', 'Turn Kyle'], 'the goes alternate');
  await context.waitFor(page.board, 'the scoreboard at the menu', 20000);
  await picture(context, 'bowl-turns-scoreboard');
  assert.equal(await context.evaluate(page.active), 'Turn Kyle', 'the host is at the keyboard again');

  // Each save holds only its own player's scores, and any purse only its own.
  const goes = await json(context, page.goes), after = await json(context, page.saves);
  assert.equal(goes.length, 6, 'six goes were played');
  assert.ok(goes.every(go => go.saved === true), 'every go was saved');
  for (const [name, id] of Object.entries(ids)) {
    const was = before.find(entry => entry.id === id), now = after.find(entry => entry.id === id);
    const own = goes.filter(go => go.playerId === id);
    if (!own.length) { assert.deepEqual(now, was, `${name} did not play, and the save is as it was`); continue; }
    for (const go of own) assert.ok(now.bests[SAVE_IDS[go.event]] >= go.score, `${name}'s ${go.event} score is in ${name}'s save`);
    const wonNight = own.length === 3 && own.every(go => go.won);
    assert.equal(now.scrap, was.scrap + (wonNight ? 250 : 0), `${name}'s wallet holds only ${name}'s own purse`);
    assert.equal(now.credits, was.credits, `${name}'s credits are as they were`);
  }
  await context.evaluate(page.close);
  await context.waitFor(page.over, 'back on the main menu', 10000);
}
