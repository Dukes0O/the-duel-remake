import assert from 'node:assert/strict';
import {beginOpenLand, stepOpenLand, holdOpenLand} from '../src/world/open/open-land.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {favoursOf, stageOf, wordOf} from '../src/world/open/open-record.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {CAMP_SITES, LAND_SITES, landSite} from '../src/world/open/content/sites.js';
import {goodwillEffects} from '../src/world/open/goodwill-rule.js';
import {canFindSite, distance, residentPose, sitePosition, siteSpot, visitNeed} from '../src/world/open/site-rule.js';
import {SITES_PEOPLE} from '../src/world/open/content/people-sites.js';
import {createSiteView, siteLook} from '../src/world/open/site-view.js';
import {LAND} from '../src/world/scablands-names.js';
import {ROAD_NET, distanceToNet} from '../src/world/scablands-road.js';
import {roadWay, nearestOnLine, sampleLine} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt as heightAt} from '../src/world/scablands-ground.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {solidsNear} from '../src/world/scablands-solids.js';
import {SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {HILLS} from '../src/world/scablands-height.js';
import {townOutpostWorld} from '../src/town/town-outpost-world.js';
import {run as browserScenario} from './scenarios/open-find-camp.mjs';

const glasshouse = landSite('glasshouse'), radio = landSite('radio-hill');
const changed = (world, id, ...effects) => applyEffects(world, {id, effects}).world;
const seeded = (seed, name = 'first-night') => {
  const world = sampleWorld(name);
  return {...world, seed, ledger: {...world.ledger, seed}, open: {...world.open, landSeed: seed}};
};
const begin = world => beginOpenLand({open: {world}, steps: [{kind: 'roam'}]});
const tick = (open, position, {onFoot = false, interact = false, jobEvents = [], siteInput, dt = 1 / 60} = {}) =>
  stepOpenLand(open, {player: {position}, carPosition: position, onFoot, interact, jobEvents, siteInput}, dt);
const poseOf = (site, world) => sitePosition(site.id, world.open.landSeed);

for (const site of LAND_SITES) {
  const one = sitePosition(site.id, 12);
  assert.deepEqual(sitePosition(site.id, 12), one);
  const picked = Array.from({length: 50}, (_, seed) => JSON.stringify(sitePosition(site.id, seed)));
  assert.equal(new Set(picked).size, site.where.length, site.id + ' can appear at each authored position');
}
assert.notDeepEqual(sitePosition(glasshouse.id, 2), sitePosition(glasshouse.id, 12));
assert.equal(sitePosition('bus-ring', 12), null);
assert.equal(stageOf(sampleWorld('first-night'), 'rats-nest'), 'den');

const nearestRoad = p => ROAD_NET.roads.map(road => ({road, ...nearestOnLine(road.points, p.x, p.z)}))
  .sort((a, b) => a.distance - b.distance)[0];
const outposts = townOutpostWorld().outposts;
for (const site of LAND_SITES) for (const {at} of site.where) {
  const p = LAND.at(...at);
  const label = site.id + ' at ' + at.join(', ');
  const terrain = [];
  for (let dx = -28; dx <= 28; dx += 4) for (let dz = -28; dz <= 28; dz += 4)
    if (Math.hypot(dx, dz) <= 28) terrain.push(heightAt(p.x + dx, p.z + dz));
  assert.ok(Math.max(...terrain) - Math.min(...terrain) <= 2, label + ' is flat over 56 m');
  assert.equal(solidsNear(p.x - 28, p.z - 28, p.x + 28, p.z + 28, 0).length, 0, label + ' is clear');
  assert.ok(distanceToNet(p.x, p.z) >= 600, label + ' is away from the road');
  assert.ok(distance(p, LAND.at('tin-town')) >= 1500, label + ' is away from Tin Town');
  assert.ok(outposts.every(outpost => distance(p, outpost) >= 800), label + ' is away from other outposts');
  assert.ok(Math.abs(p.x) + 28 < SCABLANDS_LAYOUT.halfWidth && Math.abs(p.z) + 28 < SCABLANDS_LAYOUT.halfDepth);

  const mesa = HILLS.find(hill => hill.kind === 'mesa' && distance(p, hill) < hill.radius);
  const ramp = mesa && {x: mesa.x + Math.cos(mesa.rampAngle) * (mesa.radius + mesa.ramp + 12),
    z: mesa.z + Math.sin(mesa.rampAngle) * (mesa.radius + mesa.ramp + 12)};
  const entry = nearestRoad(ramp ?? p), approach = ramp ? [entry, ramp, p] : [entry, p];
  // Use the road way-finder on the approach road, then walk the off-road legs through the game's mover.
  assert.ok(roadWay(entry.road.points[0], entry), label + ' has a way onto its access road');
  const samples = sampleLine(approach, 2);
  for (const [index, to] of samples.slice(1).entries())
    assert.equal(stepMover(samples[index], to, {radius: 1.2}).blocked, false, label + ' has a clear, grippy approach');
}

{
  const world = seeded(12), p = poseOf(glasshouse, world);
  const start = begin(world);
  const tooFar = tick(start, {x: p.x + glasshouse.foundWithin + 1, z: p.z});
  assert.deepEqual(tooFar.open.world.open.found, []);
  const found = tick(tooFar.open, {x: p.x + glasshouse.foundWithin, z: p.z}, {onFoot: true});
  assert.deepEqual(found.open.world.open.found, ['glasshouse']);
  assert.match(found.open.world.ledger.encounters.glasshouse, /second night/);
  assert.equal(found.requests.find(request => request.type === 'say').text, 'The Glasshouse is on your map.');
  assert.equal(found.events[0].cue, 'open.site.found');
  const back = tick(found.open, p);
  assert.deepEqual(back.open.world.open.found, ['glasshouse']);
  assert.ok(back.events.every(event => event.type !== 'siteFound'));
  assert.deepEqual(world.open.found, []);
}
{
  const foothill = Array.from({length: 30}, (_, index) => seeded(index))
    .find(world => poseOf(radio, world).x === LAND.at('ridge', -750, -550).x);
  const position = poseOf(radio, foothill), hidden = {x: position.x + 48.6, z: position.z + 75.7};
  assert.ok(distance(hidden, position) < radio.foundWithin);
  assert.equal(canFindSite(radio, hidden, position, true), false, 'a real hill hides the camp within range');
  assert.deepEqual(tick(begin(foothill), hidden, {onFoot: true}).open.world.open.found, []);
  const car = tick(begin(foothill), {x: position.x, z: position.z - 800});
  assert.equal(car.events[0].cue, 'open.radio.voice');
  assert.equal(tick(car.open, {x: position.x, z: position.z - 500}).events.length, 0);
  assert.equal(tick(begin(foothill), position).events[0].type, 'siteFound');
  assert.equal(tick(holdOpenLand(begin(foothill), 'thread:test', ['signs']), {x: position.x, z: position.z - 500}).events.length, 0);
}

{
  const first = sampleWorld('first-night'), helped = sampleWorld('helped-camp');
  const deed = (world, action) => changed(world, 'check/' + action, ...goodwillEffects(world, 'glasshouse', action));
  const firstMend = deed(first, 'mend');
  assert.equal(wordOf(firstMend, 'glasshouse'), 'Friendly');
  assert.equal(favoursOf(firstMend, 'glasshouse'), 1);
  const later = deed(helped, 'mend');
  assert.equal(wordOf(later, 'glasshouse'), 'Friendly');
  assert.equal(favoursOf(later, 'glasshouse'), 2);
  assert.equal(favoursOf(changed(later, 'check/mend-again', ...goodwillEffects(later, 'glasshouse', 'mend')), 'glasshouse'), 2);
  assert.equal(wordOf(deed(helped, 'kept'), 'glasshouse'), 'Sworn');
  assert.equal(wordOf(deed(first, 'helped'), 'glasshouse'), 'Friendly');
  assert.equal(wordOf(deed(helped, 'helped'), 'glasshouse'), 'Sworn');
  assert.equal(wordOf(deed(helped, 'broken'), 'glasshouse'), 'Strangers');
  const attacked = deed(helped, 'attacked');
  assert.equal(wordOf(attacked, 'glasshouse'), 'Wary');
  assert.equal(attacked.ledger.roadWord, 0);
  const left = deed(helped, 'left');
  assert.equal(wordOf(left, 'glasshouse'), 'Strangers');
  assert.ok(left.ledger.marks.includes('left/glasshouse'));
  assert.equal(deed(helped, 'away'), helped);
}
{
  const world = seeded(12), p = poseOf(glasshouse, world), pump = siteSpot(glasshouse.id, 12, 'pump');
  assert.equal(visitNeed(glasshouse, world).id, 'glasshouse/pump');
  let open = tick(tick(begin(world), p).open, p).open;
  assert.ok(open.world.ledger.marks.includes('open/need-offered/glasshouse/pump/2'));
  const hold = {onFoot: true, interact: true};
  open = tick(open, pump, {...hold, dt: 10}).open;
  open = tick(open, pump, {onFoot: true}).open;
  open = tick(open, pump, {...hold, dt: 11}).open;
  assert.equal(open.world.scrap, world.scrap, 'earlier interrupted wrench time is lost');
  open = tick(open, pump, {...hold, siteInput: {wrench: false}, dt: 1}).open;
  assert.equal(open.world.scrap, world.scrap, 'an explicitly unequipped wrench cannot mend');
  open = tick(open, pump, {...hold, dt: 11.99}).open;
  const mended = tick(open, pump, {...hold, dt: .01});
  assert.equal(mended.open.world.scrap, world.scrap - 8);
  assert.equal(wordOf(mended.open.world, 'glasshouse'), 'Friendly');
  assert.equal(favoursOf(mended.open.world, 'glasshouse'), 1);
  assert.ok(mended.open.world.ledger.marks.includes('glasshouse/pump-mended'));
  assert.match(mended.open.world.ledger.encounters.marigold, /Friendly/);
  assert.equal(mended.events[0].cue, 'open.need.mended');
  assert.equal(tick(mended.open, pump, {...hold, dt: 13}).open.world.scrap, world.scrap - 8);
  assert.equal(visitNeed(glasshouse, mended.open.world), null, 'at most one offer a night, even after a repair');
  const broke = {...world, scrap: 7};
  const unpaid = tick(tick(begin(broke), p).open, pump, {...hold, dt: 15});
  assert.equal(unpaid.open.world.scrap, 7);
  assert.equal(wordOf(unpaid.open.world, 'glasshouse'), 'Strangers');
}
{
  const world = seeded(3), p = poseOf(glasshouse, world), hold = {onFoot: true, interact: true, dt: 4};
  const offer = tick(tick(begin(world), p).open, p);
  assert.equal(offer.open.parts.sites.need, 'glasshouse/frames');
  let open = offer.open;
  for (const spot of ['frame-1', 'frame-2', 'frame-3']) {
    const at = siteSpot(glasshouse.id, world.open.landSeed, spot);
    open = tick(open, at, hold).open;
    if (spot !== 'frame-3') assert.equal(open.world.scrap, world.scrap, 'partial work is free');
  }
  assert.equal(open.world.scrap, world.scrap - 4);
  assert.ok(open.world.ledger.marks.includes('glasshouse/frames-mended'));
}
{
  const seed = 7, p = sitePosition(glasshouse.id, seed);
  const world = changed(seeded(seed), 'check/friendly', {type: 'word', person: 'glasshouse', set: 'Friendly'});
  let open = tick(tick(begin(world), p).open, p).open;
  assert.equal(open.parts.sites.need, 'glasshouse/seed');
  open = tick(open, p, {onFoot: true, jobEvents: [{type: 'talkChoice', id: 'glasshouse/seed/refuse'}]}).open;
  assert.deepEqual(open.world.ledger.obligations, []);
  open = tick(open, p, {onFoot: true, jobEvents: [{type: 'talkChoice', id: 'glasshouse/seed/accept'}]}).open;
  assert.equal(open.world.ledger.obligations[0].due, 5);
  const dot = {type: 'siteSupplyPickup', need: 'glasshouse/seed', person: 'dot', place: 'tin-town'};
  const box = tick(open, LAND.at('tin-town'), {onFoot: true, jobEvents: [dot, dot]}).open;
  assert.equal(box.world.scrap, world.scrap - 10);
  const delivered = tick(box, p).open.world;
  assert.equal(wordOf(delivered, 'glasshouse'), 'Sworn');
  assert.equal(delivered.ledger.obligations.length, 0);
  assert.ok(delivered.ledger.marks.includes('glasshouse/seed-delivered'));
  const friendlyDot = changed(open.world, 'check/dot-friendly', {type: 'word', person: 'dot', set: 'Friendly'});
  assert.equal(tick(begin(friendlyDot), LAND.at('tin-town'), {onFoot: true, jobEvents: [dot]}).open.world.scrap, world.scrap);
  const late = {...open.world, ledger: {...open.world.ledger, night: 6}};
  const broken = tick(begin(late), p).open.world;
  assert.equal(wordOf(broken, 'glasshouse'), 'Strangers');
  assert.ok(broken.ledger.marks.includes('glasshouse/seed-broken'));
}
{
  const world = sampleWorld('helped-camp'), glass = poseOf(glasshouse, world);
  const event = {type: 'siteEncounter', id: 'check/encounter'};
  const far = tick(begin(world), {x: glass.x + 1501, z: glass.z}, {jobEvents: [event]});
  assert.equal(favoursOf(far.open.world, 'glasshouse'), 1);
  const near = tick(far.open, {x: glass.x + 1500, z: glass.z}, {jobEvents: [event]});
  assert.equal(near.events[0].type, 'siteSupport');
  assert.equal(favoursOf(near.open.world, 'glasshouse'), 0);
  const hill = changed(world, 'check/hill', {type: 'find', site: 'radio-hill'}, {type: 'favour', person: 'radio-hill', by: 2});
  const at = poseOf(radio, hill);
  const warned = tick(begin(hill), at, {jobEvents: [{...event, site: 'radio-hill'}]});
  assert.equal(warned.events[0].type, 'siteWarning');
  assert.equal(warned.events[0].advanceSeconds, 10);
  const repeated = tick(warned.open, at, {jobEvents: [{...event, site: 'radio-hill'}]});
  assert.equal(favoursOf(repeated.open.world, 'radio-hill'), 1);
  const tow = tick(repeated.open, at, {jobEvents: [{type: 'siteTowRequested', id: 'check/tow'}]});
  assert.equal(tow.events[0].type, 'siteTow');
  assert.equal(favoursOf(tow.open.world, 'radio-hill'), 0);
}
{
  const world = sampleWorld('helped-camp'), leader = SITES_PEOPLE.find(row => row.id === 'marigold');
  const state = {site: 'glasshouse', partOfDay: 'day', routineTime: 10, arrivedAt: 0};
  const friendly = residentPose(leader, world, state);
  const waryWorld = changed(world, 'check/wary', {type: 'word', person: 'glasshouse', set: 'Wary'});
  const wary = residentPose(leader, waryWorld, state);
  assert.ok(distance(friendly.position, siteSpot('glasshouse', world.open.landSeed, 'car-stop')) <
    distance(wary.position, siteSpot('glasshouse', world.open.landSeed, 'car-stop')));
  const foot = siteSpot('glasshouse', world.open.landSeed, 'marigold');
  const met = changed(world, 'check/met', {type: 'mark', id: 'open/met/glasshouse'});
  const rumour = tick(begin(met), foot, {onFoot: true, interact: true, siteInput: {person: 'finch'}});
  assert.ok(rumour.open.world.ledger.marks.includes('rumour/radio-hill'));
  assert.ok(rumour.events.some(event => event.cue === 'open.rumour'));
  const ashen = changed(seeded(12), 'check/ash', {type: 'dirt', to: 1});
  const found = tick(begin(ashen), poseOf(glasshouse, ashen)).open;
  assert.equal(wordOf(found.world, 'glasshouse'), 'Wary');
  assert.equal(tick(found, poseOf(glasshouse, ashen)).events.find(event => event.type === 'siteTalk').scene, 'glasshouse/ash');

  const burned = sampleWorld('after-the-smoke');
  assert.ok(burned.open.found.includes('glasshouse'));
  const view = createSiteView({loadAsset: () => Promise.reject(Error('No graphics in this check.'))});
  view.update({open: begin(burned)}, poseOf(glasshouse, burned), 0);
  assert.ok(view.group.getObjectByName('The Glasshouse (burned, fresh)'));
  view.dispose();
  assert.equal(siteLook('rats-nest', 'den'), null);
}

for (const camp of CAMP_SITES)
  for (const need of camp.needs) assert.match(need, new RegExp('^' + camp.id + '/'));
let evaluated = 0;
const parsePage = source => { new Function('return ' + source); evaluated++; };
await browserScenario({navigate() {}, waitFor: parsePage, evaluate: parsePage, screenshot() {}});
assert.ok(evaluated > 0, 'the laptop scenario sends valid page code');
console.log('Open sites: terrain and approaches, sight and discovery, needs, promises, goodwill, favours and tells pass.');
