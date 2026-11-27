// Laptop only. OPEN-BURNED-PEN's one way through: in by the drain, not seen. A memory-only outing stands at the drain's
// mouth with the storyline at `drain`; the player walks in on foot, keeps out of the guard's lamp, holds the wrench on
// the pen's chain for eight seconds and goes back out by the drain with Finch and two growers.
import burned from '../../src/story/threads/content/burned-camp.js';
import {placeForThread} from '../../src/story/scenes/burned-camp.js';
import {RATS_NEST_LAYOUT} from '../../src/world/open/looks/rats-nest-look.js';
import {BURNED_SCOUT} from '../../src/world/open/content/burned-scout.js';
import {BURNED_PEN} from '../../src/world/open/content/burned-pen.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {sampleWorld} from '../../src/world/open/samples.js';
import {sitePosition} from '../../src/world/open/site-rule.js';
import {pageFunctions as scout} from './open-burned-scout.mjs';

const cast = {camp: 'glasshouse', enemy: 'road-rats'};
const world = applyEffects(sampleWorld('after-the-smoke'), {id: 'qa/at-the-drain', effects: [
  {type: 'thread', id: burned.id, to: 'drain', cast}, {type: 'mark', id: 'burned-camp/burned'},
  {type: 'mark', id: 'burned-camp/found/south-end'}, {type: 'mark', id: 'burned-camp/knows-drain'},
  {type: 'find', site: 'rats-nest'},
]}).world;

// Site metres: west of the lean-to, then south of the wreck by the pen. Its named hide-1 lies inside the wreck's solid.
export const penApproach = [{x: 10.8, z: -4}, {x: 10.8, z: -16}, {x: 13.6, z: -16}];
export const gateApproach = {x: 8, z: -16};

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  roamReady: scout.roamReady,
  loadWorld: scout.loadWorld,
  // Puts the player on foot at a point on the ground and lets the land run a moment.
  standAt: point => {
    const {duel} = window.__qaApp, state = duel.state, fighter = state.fighter;
    if (!state.onFoot || !fighter) throw Error('The scenario needs the player on foot.');
    const {s, lateral} = duel.course.nearest(point.x, point.z, fighter.s), y = duel.course.groundAt(s, lateral).y;
    Object.assign(fighter, {x: point.x, z: point.z, s, lateral, y, groundY: y, airHeight: 0, verticalSpeed: 0});
    window.__qaApp.advance(.25);
  },
  // Uses forward-key and mouse-look inputs. Short steps with pauses keep the guard timing at the requested pace.
  walkTo: (point, pace) => {
    const app = window.__qaApp, {duel} = app, fighter = duel.state.fighter;
    for (let tick = 0; tick < 2000; tick++) {
      const gap = Math.hypot(point.x - fighter.x, point.z - fighter.z);
      if (gap < .2) return true;
      const yaw = Math.atan2(point.x - fighter.x, point.z - fighter.z);
      app._footPointer.lookX = -Math.atan2(Math.sin(yaw - fighter.yaw), Math.cos(yaw - fighter.yaw)) / .0022;
      const moving = Math.min(gap, pace * .25) / 4.5, x = fighter.x, z = fighter.z;
      app.keys.KeyW = true;
      try { app.advance(moving, 1 / 120); } finally { app.keys.KeyW = false; }
      app.advance(.25 - moving, 1 / 120);
      if (Math.hypot(fighter.x - x, fighter.z - z) < .01)
        throw Error(`The walk is blocked at (${fighter.x.toFixed(1)}, ${fighter.z.toFixed(1)}): ${fighter.slopeStops} slope stops, ${fighter.contacts} contacts.`);
    }
    throw Error('The walk did not arrive.');
  },
  // Waits on the land's clock until the guard's round is between two seconds of it.
  waitRound: (cycle, low, high) => {
    const app = window.__qaApp;
    for (let tick = 0; tick < 2000; tick++) {
      const at = app.duel.state.arena.worldJob.open.seconds % cycle;
      if (at > low && at < high) return true;
      app.advance(.25);
    }
    throw Error('The guard never reached that part of his round.');
  },
  settle: () => window.__qaApp.advance(.5),
  wrench: seconds => {
    const app = window.__qaApp;
    app.duel.selectFootGear(2);
    app._footPointer.fire = true;
    try { app.advance(seconds); } finally { app._footPointer.fire = false; }
    app.advance(.25);
  },
  drainStarted: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    if (open.parts.missions.active?.id !== 'burned-camp/drain') throw Error('The drain did not begin.');
    if (!window.__qaApp.duel.state.arena.worldJob.threadSearchCast?.lamps?.length) throw Error('The guard\'s lamp is not drawn.');
  },
  unseen: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    const active = open.parts.missions.active;
    if (open.world.open.threads['burned-camp'].beat !== 'drain' || active?.state.seen) throw Error('The guard saw the player.');
  },
  chainOff: () => {
    const active = window.__qaApp.duel.state.arena.worldJob.open.parts.missions.active;
    if (!active?.state.carrying) throw Error('The chain did not come off.');
  },
  outByTheDrain: () => {
    const {world} = window.__qaApp.duel.state.arena.worldJob.open;
    if (world.open.threads['burned-camp'].beat !== 'home' || !world.ledger.marks.includes('burned-camp/drain-out'))
      throw Error('The player did not come out by the drain with Finch.');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const nest = sitePosition('rats-nest', world.open.landSeed);
  const sitePositions = {'rats-nest': {position: nest,
    spots: {...RATS_NEST_LAYOUT.spots, ...BURNED_SCOUT.spots, ...BURNED_PEN.spots}}};
  const at = spot => placeForThread(['rats-nest', spot], cast, {sitePositions});
  const onSite = point => ({x: nest.x + point.x, z: nest.z + point.z});
  const {pace, round} = burned.beats.drain.mission.rule.guards[0];
  const stops = round.stops.map(stop => at(stop.at[1]));
  const cycle = round.stops.reduce((sum, stop, index) => sum + stop.seconds +
    Math.hypot(stops[(index + 1) % stops.length].x - stops[index].x, stops[(index + 1) % stops.length].z - stops[index].z) / pace, 0);
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-burned-pen');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  await evaluate('standAt', at('drain-out'));
  await evaluate('drainStarted');
  // In through the drain while the guard walks to the fire, round the lean-to to the south side of the pen's wreck,
  // and there until he has nearly finished at the gate; then the chain and back to the drain while he warms his hands.
  await evaluate('waitRound', cycle, 60, 61);
  await evaluate('walkTo', at('drain-in'), 1.5);
  await context.screenshot('drain-mouth-guard-lamp');
  await evaluate('walkTo', at('hide-2'), 1.5);
  for (const point of penApproach) await evaluate('walkTo', onSite(point), 1.5);
  await evaluate('unseen');
  await evaluate('waitRound', cycle, 41.8, 42.3);
  await context.screenshot('waiting-by-the-pen');
  await evaluate('walkTo', onSite(gateApproach), 1.5);
  await evaluate('walkTo', at('pen-gate'), 1.5);
  await evaluate('wrench', 8.25);
  await evaluate('chainOff');
  await context.screenshot('chain-off-at-the-pen');
  await evaluate('walkTo', at('drain-in'), 1.5);
  await evaluate('walkTo', at('drain-out'), 1.5);
  await evaluate('settle');
  await evaluate('outByTheDrain');
  await context.screenshot('out-by-the-drain');
}
