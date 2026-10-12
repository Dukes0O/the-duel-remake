import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {convoyValvePoints} from '../src/arena/convoy.js';
import {CONVOY_RULES} from '../src/arena/modes/convoy-raid.js';
import {warlordIntroScreen, arenaHud} from '../src/screen-arena.js';
import {opponentArmorPresentation, armorPresentation} from '../src/combat-hud.js';

// SCRAPDOME-TANKER-FIX: the tanker's body is meant to take no damage (only its
// three fuel valves do, docs/SCRAPDOME.md section 10). The fight must tell the
// player so, and show valve damage, instead of an armor bar that never moves.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Tanker feedback: ${checks} acceptance checks executed.`));

function fight() {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {tollkeeper: true, 'salt-flats': true, 'convoy-raid': false, 'crew-gear': true}});
  const duel = new Duel({seed: 317, featureFlags: flags});
  duel.state.wastelandGateDiscovered = true;
  equal(startWarlordEvent(duel, {warlordId: 'tollkeeper', car: 'falcone_f42',
    cpuDifficulty: 'medium', playerId: 'toll-driver'}), true, 'the real Tollkeeper fight starts');
  beginWarlordEvent(duel);
  duel.state.countdown = 0;
  duel.step(DT); duel.step(DT);
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0;
  duel.state.combat.aiTimer = Infinity;
  const rig = duel.state.opponents[0];
  rig.combatShield = 0;
  return {duel, rig, at: duel.course.groundAt(rig.s, rig.lateral)};
}

test('a player ram that misses every valve says the tank body takes no damage, then stays quiet for six seconds', () => {
  const {duel, rig, at} = fight(), convoy = duel.state.arena.convoy;
  const miss = () => applyArmorDamage(duel, rig, 'ram', {owner: 'player', relativeKph: 80,
    contactPoint: {...at, x: at.x + 100}});
  equal(miss(), 0, 'a ram far from the valves removes no armor');
  ok(/RED VALVES/.test(duel.state.callout), 'the player is told to aim for the red valves');
  duel.state.callout = ''; duel.state.calloutTimer = 0;
  miss();
  equal(duel.state.callout, '', 'a second miss inside six seconds does not repeat the message');
  duel.state.stageTimeSec += CONVOY_RULES.bodyHintSeconds + .01;
  miss();
  ok(/RED VALVES/.test(duel.state.callout), 'the message returns after six seconds');
  equal(convoy.valves, [150, 150, 150], 'the misses still change no valve');
});

test('escort and unowned body hits never show the player message', () => {
  const {duel, rig, at} = fight();
  applyArmorDamage(duel, rig, 'ram', {owner: 'cpu-2', relativeKph: 80, contactPoint: {...at, x: at.x + 100}});
  applyArmorDamage(duel, rig, 'fixed', {amount: 1000});
  equal(/RED VALVES/.test(duel.state.callout || ''), false, 'only the player is told');
});

test('breaking a valve calls out how many are broken', () => {
  const {duel, rig, at} = fight();
  const [valve] = convoyValvePoints(duel, rig);
  for (let n = 0; n < 40 && duel.state.arena.convoy.valves[0] > 0; n++)
    applyArmorDamage(duel, rig, 'crossbow', {owner: 'player', hitPosition: valve, damageMultiplier: 10});
  equal(duel.state.arena.convoy.valves[0], 0, 'the first valve breaks');
  equal(duel.state.callout, 'VALVE BROKEN / 1 OF 3', 'the player sees the count of broken valves');
  ok(at, 'fixture ground point exists');
});

test('the HUD shows valve armor falling after a hit that does not yet break a valve', () => {
  const {duel, rig} = fight(), state = duel.state;
  const before = arenaHud(state).scoreText;
  ok(/VALVES 0 \/ 3 BROKEN/.test(before) && /100% ARMOR LEFT/.test(before), `full valves read plainly: ${before}`);
  const [valve] = convoyValvePoints(duel, rig);
  applyArmorDamage(duel, rig, 'crossbow', {owner: 'player', hitPosition: valve});
  const after = arenaHud(state).scoreText;
  ok(/VALVES 0 \/ 3 BROKEN/.test(after) && !/100%/.test(after), `a damaged valve shows progress: ${after}`);
  const bar = opponentArmorPresentation(state, rig);
  equal([bar.valves, bar.max], [true, 450], 'the tanker bar counts its three 150 armor valves');
  ok(bar.value < 450 && bar.fraction < 1, 'the tanker bar goes down when a valve is hit');
  const escort = state.opponents[1];
  equal(opponentArmorPresentation(state, escort), {...armorPresentation(escort), valves: false},
    'an escort keeps its ordinary body armor bar');
});

test('the introduction names the red valves as the weak spot', () => {
  const {duel} = fight();
  duel.state.status = 'warlord_intro';
  const intro = warlordIntroScreen(duel.state, {escapeHTML: text => text,
    metric: (label, value) => `${label}:${value};`, action: () => ''});
  ok(intro.metrics.includes('WEAK SPOT:RED VALVES ON THE TANK'), 'the introduction tells the player where to aim');
});
