import assert from 'node:assert/strict';
import {Scene, DirectionalLight} from 'three';
import {beginOpenLand, stepOpenLand, holdOpenLand} from '../src/world/open/open-land.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {favoursOf, stageOf, wordOf} from '../src/world/open/open-record.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {CAMP_SITES, LAND_SITES, landSite} from '../src/world/open/content/sites.js';
import {goodwillEffects} from '../src/world/open/goodwill-rule.js';
import {canFindSite, distance, residentPose, sitePosition, siteSpot, visitNeed} from '../src/world/open/site-rule.js';
import {SITES_PEOPLE} from '../src/world/open/content/people-sites.js';
import {createSiteView} from '../src/world/open/site-view.js';
import {RADIO_HILL_SPOTS, BUS_RING_SPOTS} from '../src/world/open/content/site-look-data.js';
import {RADIO_HILL_BUDGET, RADIO_HILL_LAYOUT, radioHillSolids} from '../src/world/open/looks/radio-hill-look.js';
import {BUS_RING_BUDGET, BUS_RING_LAYOUT, busRingSolids, busRingWeld} from '../src/world/open/looks/bus-ring-look.js';
import {RATS_NEST_BUDGET, RATS_NEST_LAYOUT} from '../src/world/open/looks/rats-nest-look.js';
import {RADIO_ID, RADIO_MARK} from '../src/world/open/content/radio-hill-voice-places.js';
import {installSiteGround} from '../src/world/open/site-ground.js';
import {sitesPart} from '../src/world/open/parts/sites.js';
import {createFixedThingsView, createSmallThingsView} from '../src/world/scablands-things-view.js';
import {thingSolidGrid} from '../src/world/scablands-things.js';
import {LAND} from '../src/world/scablands-names.js';
import {ROAD_NET, distanceToNet} from '../src/world/scablands-road.js';
import {roadWay, nearestOnLine, sampleLine} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt as heightAt} from '../src/world/scablands-ground.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {createJobSolidGrid, solidsNear} from '../src/world/scablands-solids.js';
import {Course} from '../src/course.js';
import {createFighter, stepFighter} from '../src/onfoot.js';
import {SCABLANDS_LAYOUT, SCABLANDS_VENUE} from '../src/world/scablands.js';
import {NIGHT_2_SITES} from '../src/world/jobs/night-2-sites.js';
import {HILLS} from '../src/world/scablands-height.js';
import {townOutpostWorld} from '../src/town/town-outpost-world.js';
import {run as browserScenario} from './scenarios/open-find-camp.mjs';
import toll from '../src/story/threads/content/mall-road-toll.js';

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
  if (site.id === 'the-pocket') {
    const gate = NIGHT_2_SITES.gate;
    const bearings = site.where.map(({at}) => LAND.at(...at));
    const heading = point => Math.atan2(point.z - gate.z, point.x - gate.x);
    for (const [seed, point] of picked.entries()) {
      const hill = sitePosition('radio-hill', seed);
      const swing = bearing => Math.cos(heading(hill) - heading(bearing));
      const expected = [...bearings].sort((a, b) => swing(a) - swing(b))[0];
      assert.deepEqual(JSON.parse(point), expected, 'the Pocket faces away from this seed’s hill');
    }
  } else assert.equal(new Set(picked).size, site.where.length, site.id + ' can appear at each authored position');
}
assert.notDeepEqual(sitePosition(glasshouse.id, 2), sitePosition(glasshouse.id, 12));
assert.deepEqual(sitePosition('bus-ring', 12), LAND.at(...landSite('bus-ring').where[0].at));
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
  const roadGap = distanceToNet(p.x, p.z);
  if (site.id === 'the-pocket') {
    const distances = {'boneyard,1000,-300': 680, 'tin-town,300,-1700': 1000, 'tin-town,-2600,700': 415};
    assert.ok(Math.abs(roadGap - distances[at.join(',')]) <= 10, label + ' has its authored road access');
  } else if (site.id === toll.sign.at) {
    const road = nearestRoad(p);
    assert.equal(road.road.id, toll.notes.signStands.road, label + ' blocks the authored road');
    assert.ok(road.distance <= 1, label + ' stands on the road');
  } else assert.ok(distanceToNet(p.x, p.z) >= 600, label + ' is away from the road');
  assert.ok(distance(p, LAND.at('tin-town')) >= 1500, label + ' is away from Tin Town');
  assert.ok(outposts.every(outpost => distance(p, outpost) >= 800), label + ' is away from other outposts');
  assert.ok(Math.abs(p.x) + 28 < SCABLANDS_LAYOUT.halfWidth && Math.abs(p.z) + 28 < SCABLANDS_LAYOUT.halfDepth);

  const mesa = HILLS.find(hill => hill.kind === 'mesa' && distance(p, hill) < hill.radius);
  const ramp = mesa && {x: mesa.x + Math.cos(mesa.rampAngle) * (mesa.radius + mesa.ramp + 12),
    z: mesa.z + Math.sin(mesa.rampAngle) * (mesa.radius + mesa.ramp + 12)};
  // The western Pocket is on the far side of a cut. Its way in leaves the East Road
  // on the approach to the bridge; the geometrically nearest point faces the cut.
  const westPocket = site.id === 'the-pocket' && at[1] === -2600;
  const entry = nearestRoad(westPocket ? LAND.at('tin-town', -2774, 298) : ramp ?? p);
  const approach = ramp ? [entry, ramp, p] : [entry, p];
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
  const scene = new Scene(), sun = new DirectionalLight();
  sun.castShadow = true;
  sun.position.set(-8,5,9);
  sun.target.position.set(2,1,3);
  scene.add(view.group, sun, sun.target);
  const unmended = sampleWorld('first-night');
  const open = begin(unmended), at = poseOf(glasshouse, unmended);
  open.parts.sites = {...open.parts.sites, partOfDay: 'day', need: 'glasshouse/pump'};
  view.update({open}, {x:at.x+250,z:at.z}, 7);
  const camp = view.group.getObjectByName('The Glasshouse (camp)');
  assert.ok(camp?.visible && camp.userData.glint.visible, 'the day tell is visible from 250 m in the open roam');
  assert.deepEqual(camp.userData.glint.material.uniforms.uSun.value.toArray(), [-10,4,6]);
  assert.equal(camp.userData.glint.material.uniforms.uTime.value, 7, 'the glass still flashes with a stopped pump');
  assert.equal(camp.userData.wheel.rotation.z, 0);
  open.parts.sites.partOfDay = 'dark';
  view.update({open}, at, 8);
  assert.equal(camp.userData.glint.visible, false);
  view.dispose();
}

const seed = 12;
const hill = sitePosition('radio-hill', seed), ring = sitePosition('bus-ring', seed), nest = sitePosition('rats-nest', seed);
const stepSites = (open, point, phase = 'day', enabled = true) => stepOpenLand(open, {
  player: {position: point}, partOfDay: phase, checkpointsEnabled: enabled,
}, .5, [sitesPart]);

function checkBudget(group, budget) {
  let draws = 0, triangles = 0;
  group.traverse(object => {
    if (object.isMesh || object.isLine || object.isPoints) draws++;
    if (object.isMesh) triangles += (object.geometry.index ?? object.geometry.attributes.position).count / 3;
  });
  assert.ok(draws > 0 && draws <= budget.draws, group.name + ' draws: ' + draws);
  assert.equal(triangles, group.userData.triangles);
  assert.ok(triangles <= budget.triangles, group.name + ' triangles: ' + triangles);
}

{
  let step = stepSites(begin(seeded(seed)), hill);
  const view = createSiteView({loadAsset: () => Promise.reject(Error('memory fixture'))});
  const draw = (position, seconds) => view.update({open: step.open}, position, seconds);
  const grid = createJobSolidGrid();
  function checkSolids(id, position, reviewed) {
    const rows = step.requests.find(request => request.type === 'solids' && request.id === id).solids;
    assert.deepEqual(rows, reviewed.map(row => ({...row, x: position.x + row.x, z: position.z + row.z, placeId: id})));
    grid.setOpenSolids(id, rows);
  }
  checkSolids('radio-hill', hill, radioHillSolids());
  checkSolids('bus-ring', ring, busRingSolids());
  for (const [id, layout, copy, origin] of [
    ['radio-hill', RADIO_HILL_LAYOUT, RADIO_HILL_SPOTS, hill], ['bus-ring', BUS_RING_LAYOUT, BUS_RING_SPOTS, ring],
  ]) {
    assert.deepEqual(copy, layout.spots);
    for (const [name, local] of Object.entries(layout.spots)) {
      const x = origin.x + local.x, z = origin.z + local.z;
      assert.deepEqual(siteSpot(id, seed, name), {x, z, y: heightAt(x, z)}, id + '/' + name);
    }
  }
  const course = new Course(SCABLANDS_VENUE, seed);
  const car = {arena: {worldJob: {solidGrid: grid}}};
  const [door, hut, set] = ['door', 'hut', 'set'].map(name => siteSpot('radio-hill', seed, name));
  const walker = createFighter(course, car, course.nearest(door.x, door.z));
  for (const target of [hut, set]) {
    for (let i = 0; i < 90 && distance(walker, target) > .02; i++) {
      walker.yaw = Math.atan2(target.x - walker.x, target.z - walker.z);
      stepFighter(course, car, walker, {forward: true});
    }
    assert.ok(distance(walker, target) <= .02, 'the player walks through the door to the set');
  }
  assert.equal(walker.contacts, 0);
  assert.throws(() => createFighter(course, car, course.nearest(hill.x - 9, hill.z + 6)), /solid scenery/);
  draw(hill, 3);
  const camp = view.group.getObjectByName('Radio Hill');
  checkBudget(camp, RADIO_HILL_BUDGET);
  assert.equal(camp.userData.stage, 'camp');
  assert.equal(camp.userData.lights.some(light => light.visible), false);
  const before = camp.userData.rotor.rotation.z;
  step = stepSites(step.open, hill, 'dusk');
  draw(hill, 4);
  assert.equal(view.group.getObjectByName('Radio Hill'), camp, 'dusk updates the existing mast');
  assert.notEqual(camp.userData.rotor.rotation.z, before);
  assert.ok(camp.userData.lights[0].visible);

  step = stepSites({...step.open, world: changed(step.open.world, 'check/second-set', {type: 'made', id: 'radio-hill/second-set'})}, hill);
  checkSolids('radio-hill', hill, radioHillSolids('second-set'));
  draw(hill, 5);
  assert.equal(camp.parent, null);
  const second = view.group.getObjectByName('Radio Hill');
  assert.equal(second.userData.stage, 'second-set');
  checkBudget(second, RADIO_HILL_BUDGET);
  draw(ring, 7.5);
  const buses = view.group.getObjectByName('The Bus Ring');
  assert.ok(buses.visible);
  checkBudget(buses, BUS_RING_BUDGET);
  assert.equal(buses.userData.weldLight.intensity, 75 * busRingWeld(7.5));
  draw(ring, 10);
  assert.equal(buses.userData.weldLight.intensity, 75 * busRingWeld(10));

  const gasket = SITES_PEOPLE.find(row => row.id === 'gasket');
  for (const [partOfDay, spot] of [['day', 'gasket'], ['dark', 'bunk']]) {
    const pose = residentPose(gasket, step.open.world, {partOfDay});
    assert.deepEqual(pose.position, siteSpot('bus-ring', seed, spot));
  }
  const meeting = residentPose(gasket, step.open.world, {site: 'bus-ring'});
  assert.deepEqual(meeting.position, siteSpot('bus-ring', seed, 'workbench'));

  const restore = installSiteGround(seed);
  try {
    step = stepSites(step.open, nest);
    draw(nest, 11);
    const den = view.group.getObjectByName("The Rats' Nest");
    assert.equal(den.userData.stage, 'day');
    assert.equal(den.userData.flames.uniforms.uTime.value, 11);
    checkBudget(den, RATS_NEST_BUDGET);
    step = stepSites(step.open, nest, 'dark');
    draw(nest, 12);
    const night = view.group.getObjectByName("The Rats' Nest");
    assert.equal(den.parent, null);
    assert.equal(night.userData.stage, 'night');
    assert.equal(night.userData.flames.uniforms.uTime.value, 12);
    checkBudget(night, RATS_NEST_BUDGET);
  } finally { restore(); }

  // The story's far bearing and three-blink request use the reviewed mast and the outing clock.
  step = stepSites({...step.open, world: changed(step.open.world, 'check/radio-call',
    {type: 'thread', id: RADIO_ID, to: 'first-call'})}, hill, 'dark');
  const far = {x: hill.x + 3000, z: hill.z};
  step.open.parts.threads = {progress: {[RADIO_ID]: {blinkedAt: step.open.seconds}}};
  draw(far, 20);
  assert.ok(second.visible && !second.userData.lights[1].visible);
  step.open.seconds += 1.6;
  draw(far, 21);
  assert.ok(second.userData.lights[1].visible);
  step.open.world.ledger.history.push({type: 'settle', key: RADIO_MARK.fuel, choiceId: RADIO_ID + '/broken/test'});
  draw(far, 22);
  assert.equal(second.userData.levels.x, 0, 'a broken fuel promise extinguishes the mast');

  step = stepSites(step.open, ring, 'day', false);
  draw(ring, 13);
  assert.equal(buses.visible, false);
  assert.equal(step.open.parts.sites.clearings, undefined);
  assert.deepEqual(step.requests.find(r => r.type === 'solids' && r.id === 'bus-ring').solids, []);
  view.dispose();
}

{
  const clearings = stepSites(begin(seeded(seed)), ring).open.parts.sites.clearings;
  const small = createSmallThingsView({seed: 1989, jobStarts: []});
  const instances = () => small.group.children.flatMap(mesh => Array.from({length: mesh.count}, (_, i) => {
    const m = mesh.instanceMatrix.array;
    return [mesh.name, m[i * 16 + 12], m[i * 16 + 14]];
  }));
  let removed = 0;
  for (const [point, layout] of [[ring, BUS_RING_LAYOUT], [hill, RADIO_HILL_LAYOUT], [nest, RATS_NEST_LAYOUT]]) {
    const clearing = clearings.find(p => p.x === point.x && p.z === point.z);
    assert.equal(clearing.radius, layout.radius);
    small.update(point.x, point.z);
    const before = instances();
    const outside = before.filter(([, x, z]) => Math.hypot(x - point.x, z - point.z) > layout.radius);
    small.update(point.x, point.z, clearings);
    assert.deepEqual(instances(), outside);
    removed += before.length - outside.length;
    small.update(point.x, point.z);
    assert.deepEqual(instances(), before);
  }
  assert.ok(removed > 0, 'real seeded scatter was cleared');
  small.dispose();

  const rocks = [0, BUS_RING_LAYOUT.radius + 4].map((offset, i) =>
    ({id: 'rock-' + i, x: ring.x + offset, z: ring.z, size: 2, heading: 0}));
  const fixed = {pylons: [], fences: [], telegraphs: [], boulders: rocks};
  const large = createFixedThingsView(fixed);
  const grid = createJobSolidGrid(thingSolidGrid(fixed));
  for (const mask of [undefined, clearings, undefined]) {
    grid.siteClearings = mask;
    large.update(ring.x, ring.z, mask);
    const drawn = large.group.getObjectByName('Scablands boulder');
    assert.equal(drawn.count, mask ? 1 : 2);
    const hits = grid.near(ring.x, ring.z, rocks[1].x, ring.z).map(row => row.id);
    assert.deepEqual(hits.sort(), mask ? ['rock-1'] : ['rock-0', 'rock-1']);
  }
  large.dispose();
}

for (const camp of CAMP_SITES)
  for (const need of camp.needs) assert.match(need, new RegExp('^' + camp.id + '/'));
let evaluated = 0;
const parsePage = source => { new Function('return ' + source); evaluated++; };
await browserScenario({navigate() {}, waitFor: parsePage, evaluate: parsePage, screenshot() {}});
assert.ok(evaluated > 0, 'the laptop scenario sends valid page code');
console.log('Open sites: terrain and approaches, sight and discovery, needs, promises, goodwill, favours and tells pass.');
