// NIGHT-2-AND-TRUCK-POLISH: the fixes the Director asked for after the overnight QA of 19 November 2026.
// Each section names the fix. A section fails on the code before its fix and passes after it.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyChoice, createLedger} from '../src/story/ledger.js';
import {NIGHT_2_CHOICES} from '../src/story/scenes/night-2.js';
import {night2Page} from '../src/world/jobs/night-2.js';
import {ledgerPageMarkup} from '../src/story/ledger-ui.js';
import {createNight2Look} from '../src/world/night-2-look.js';
import {App} from '../src/app.js';
import {createHudScreen} from '../src/screen-hud.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {createTown} from '../src/town/town-state.js';
import {createTownWorld} from '../src/town/town-world.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {cleanupWorldJobLoan} from '../src/arena/modes/world-job.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const escapeHTML = text => String(text).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));

// 1. The journal opened from the pause card, in the middle of the night, marks what changed tonight.
{
  const start = createLedger({seed: 1, night: 2, embers: 4});
  const {ledger} = applyChoice(start, NIGHT_2_CHOICES.find(choice => choice.id === 'watch'));
  const live = night2Page(ledger, {inNight: true});
  check(live.tonight?.obligations === true, 'the live page says a debt was made tonight');
  const html = ledgerPageMarkup(live, escapeHTML);
  check(html.includes('class="ledger-tonight"'), 'the pause-card journal carries the tonight highlight');
  check(night2Page(ledger).tonight === null, 'the Story Wall page, asked without the live flag, is unchanged until the night is over');
}

// 2. The cold breath is out: it measured 1 to 8 levels of 255 at the gate camera, so nobody could see it.
{
  const look = createNight2Look({});
  const names = [];
  look.group.traverse(object => { if (/breath/i.test(object.name)) names.push(object.name); });
  check(names.length === 0, 'the Night 2 look draws no breath sprites (found ' + names.length + ')');
  look.dispose();
}

// 3. The dawn note shows over a clear picture: the racing HUD (speedometer with gear and nitro, lap map, armor, car buttons) is hidden.
// The simulation itself stands still at the result (Duel.step returns for an arena that is not racing), so nothing drives under Continue.
{
  const css = readFileSync(new URL('../src/story/talk-view.css', import.meta.url), 'utf8');
  const rules = css.replace(/\/\*[^]*?\*\//g, '').match(/[^{}]+{[^}]*}/g) ?? [];
  const hidden = rules.filter(rule => /\.story-dawn-active/.test(rule) && /display\s*:\s*none/.test(rule)).join(' ');
  for (const part of ['.speedometer', '.route-hud', '.race-health', '.combat-player-armor', '.combat-slot-bar', '.style-score', '.rear-view-frame'])
    check(hidden.includes(part), 'the dawn hides ' + part);
  const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
  check(/if \(s\.arena\) \{\s*if \(s\.status === 'racing'\) \{[\s\S]*?\}\s*return;\s*\}/.test(game), 'an arena that is not racing (the result) is not stepped');
}

// 7, 8 and 9. A town work truck: no car buttons, nitro or armor line; no hood camera; one press of BACK TO THE YARD, and a town heading.
{
  const memory = new Map();
  globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)};
  const app = new App();
  app.audio.unlock = () => {};
  assert(app.addPlayer('Truck polish').ok);
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true}};
  assert(app._saveProfile());
  app.duel.featureFlags = {enabled: id => id === 'wasteland-town' || id === 'hidden-road'};
  assert(app.visitWasteland());
  app.advance(8);
  const layout = createTownWorld(createTown(1405, 'Truck polish town'));
  setScablandsTownLayout(layout);
  app.duel.state.wastelandGateDiscovered = true;
  const startDrive = vehicle => assert(app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0,
    job: {id: 'town-drive', kind: 'town-drive', steps: [], seed: 1989, layout, vehicle}}), 'the town drive starts');
  const classes = new Set();
  const element = () => ({dataset: {}, hidden: false, textContent: '', classList: {toggle: (name, on) => { on ? classes.add(name) : classes.delete(name); }, add() {}, remove() {}},
    style: {}, append() {}, addEventListener() {}, closest: () => null, querySelector: () => element(), setAttribute() {}, getAttribute: () => null});
  const ui = new Proxy({}, {get: (all, key) => all[key] ??= element()});
  const hud = createHudScreen({app, ui, text: (key, value) => { ui[key].textContent = String(value); }, time: String, credits: String,
    clamp: value => Math.max(0, Math.min(1, value)), routeMap: {update() {}}});

  startDrive('fire-truck');
  while (app.duel.state.status === 'countdown') app.advance(.1);
  hud(app.duel.state);
  check(classes.has('is-work-truck'), 'the stage knows a work truck is driven');
  const css = readFileSync(new URL('../src/combat-hud.css', import.meta.url), 'utf8');
  for (const part of ['.combat-slot-bar', '.boost-readout', '.combat-player-armor'])
    check(css.includes('#stage.is-work-truck ' + part), 'a work truck hides ' + part);

  // 8. No hood camera in a truck, whichever way it is asked for.
  app.cameraMode = 'wide';
  check(app.cycleCamera() === 'back' && app.cycleCamera() === 'chase' && app.cycleCamera() !== 'hood', 'cycling the camera in a truck skips the hood');
  check(app.setCamera('hood') === 'chase', 'asking for the hood camera in a truck gives the chase camera');

  // 9. A town drive ends with a town heading, and one press of BACK TO THE YARD reaches the yard.
  check(app.leaveWorldJob(), 'the drive is left');
  const result = arenaResultsScreen(app.duel.state, {metric: () => '', action: (label, act) => `<button data-action="${act}">${label}</button>`, escapeHTML});
  check(result && result.eyebrow === 'THE TOWN' && !/EVERBURN/.test(result.eyebrow + result.title), 'the result says the town, not the Everburn: ' + result?.eyebrow);
  app.returnToYard();
  app.advance(8);
  startDrive('fire-truck');
  while (app.duel.state.status === 'countdown') app.advance(.1);
  check(app.leaveTownDrive() === true, 'one press leaves the drive and returns to the yard');
  app.advance(8);
  check(app.isYardHomeActive(), 'and the yard is showing');
  cleanupWorldJobLoan(app.duel);
  clearScablandsTownLayout();
}

console.log(`PASS test-night-2-polish: ${checks} checks.`);
