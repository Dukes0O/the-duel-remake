// OPEN-LOOK-DACE: the drawing of Dace Goes Looking, checked without graphics.
// Each thing builds with its named parts, within its budget and the same on two runs; the pickup is a truck of its own with a
// bonnet that opens, a tyre that goes flat, a cover, a dropped cover, an aerial and a blanket; the look still shows each thing
// when the storyline says so, under the names the land reads; and each text the laptop scenario sends to the page parses.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DACE_ID, DACE_PLACES as places} from '../src/world/open/content/dace-goes-looking-places.js';
import {DACE_LOOK_BUDGET, DACE_SITES, DACE_STAND, buildDaceStand, createDaceLook} from '../src/world/open/looks/dace-goes-looking-look.js';
import {KEY_HEIGHT, PICKUP, buildMossPickup, buildPickupKey} from '../src/world/open/looks/dace-pickup-look.js';
import {DACE_SITE_LAYOUT, buildCrowsStep, buildDeepSign, buildHangar, buildPickupTracks, buildWalkerStones, hangarRib} from '../src/world/open/looks/dace-sites-look.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {PICTURES, budgetFor, pageSources, viewOf} from './scenarios/look-dace.mjs';
import * as THREE from 'three';

const names = group => { const all = []; group.traverse(node => all.push(node.name)); return all; };
const meshes = group => { const all = []; group.traverse(node => { if (node.isMesh) all.push(node); }); return all; };
const bounds = group => { group.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(group); };
const print = group => meshes(group).map(mesh => mesh.name + ':' + mesh.geometry.attributes.position.count + ':' + mesh.geometry.attributes.position.array.slice(0, 9).join(',')).join('|');
const within = (group, budget, what) => {
  assert.ok(group.userData.draws.length <= budget.draws, `${what} is drawn in ${group.userData.draws.length} draws, of ${budget.draws}`);
  assert.ok(group.userData.triangles <= budget.triangles, `${what} has ${group.userData.triangles} triangles, of ${budget.triangles}`);
  assert.equal(new Set(group.userData.draws).size, group.userData.draws.length, `${what}: every drawn mesh has its own name`);
  assert.ok(group.userData.draws.every(name => name), `${what}: every drawn mesh is named`);
};

// ---- Moss's old pickup ----
{
  const truck = buildMossPickup(), data = truck.userData;
  assert.equal(truck.name, "Moss's old pickup");
  within(truck, DACE_LOOK_BUDGET.pickup, 'the pickup');
  for (const part of ['Pickup body', 'Pickup bonnet', 'Bonnet stay', 'Grey pickup cover', 'Cover dropped on the ground', "Rell's red blanket", 'Pickup aerial', 'Front tyre', 'Front wheel', 'Lamp light on the road'])
    assert.ok(names(truck).includes(part), `the pickup has the part "${part}"`);
  assert.equal(data.cover.name, 'Grey pickup cover');
  assert.equal(data.folded.name, 'Cover dropped on the ground');
  assert.equal(data.blanket.name, "Rell's red blanket");
  assert.equal(data.aerial.name, 'Pickup aerial');
  assert.equal(data.wheelPivots.length, 1, 'one wheel stands apart from the body: the one that goes flat');
  assert.equal(data.driver, undefined, 'it is not the race car body: nobody sits strapped in it');
  // A work truck's size and shape: long, narrow, a cab higher than its bonnet and its bed.
  const box = bounds(data.body).getSize(new THREE.Vector3());
  assert.ok(box.z > 4.9 && box.z < 5.6 && box.x > 1.9 && box.x < 2.3, `the pickup is ${box.z.toFixed(2)} m long and ${box.x.toFixed(2)} m wide with its mirrors`);
  assert.ok(PICKUP.roof > PICKUP.hinge.y + .5 && PICKUP.roof > PICKUP.bedTop + .4, 'the cab stands above the bonnet and the bed');
  assert.ok(PICKUP.bedFront - PICKUP.bedBack > 2.2, 'a long bed');
  // Dace sits on the cover at the spot the rules give, 1.22 m up: the spot lies in the bed, behind the cab.
  assert.ok(PICKUP.bedBack + PICKUP.shift < -1 && PICKUP.bedFront + PICKUP.shift > .4 && PICKUP.bedTop > 1.22 - .25 && PICKUP.bedFloor < 1.22, 'the spot is in the bed, where Dace sits');
  // The forge shed stands 2.75 m behind the spot: the tail stops short of it.
  assert.ok(bounds(data.body).min.z > -2.1 && data.body.parent.position.z === PICKUP.shift, 'the tail clears the forge shed behind the spot');
  // The bonnet opens upward about its hinge, and the stay holds it.
  const closed = bounds(data.bonnet).max.y;
  data.setBonnet(true);
  assert.ok(data.bonnet.rotation.x < -.8 && data.stay.visible && bounds(data.bonnet).max.y > closed + .7, 'the bonnet swings up for the radiator');
  data.setBonnet(false);
  assert.ok(data.bonnet.rotation.x === 0 && !data.stay.visible && Math.abs(bounds(data.bonnet).max.y - closed) < 1e-6, 'and shuts again');
  // The flat tyre: lower and wider, the wheel down with it, the body settled towards that corner.
  const tyre = data.wheelPivots[0].children[0], round = bounds(tyre).max.y;
  data.setFlat(true);
  assert.ok(data.flat && bounds(tyre).max.y < round - .15 && data.body.rotation.z !== 0, 'a flat tyre sits lower and the body leans to it');
  assert.ok(Math.abs(bounds(tyre).min.y) < .02, 'and still stands on the ground');
  data.setFlat(false);
  assert.ok(!data.flat && Math.abs(bounds(tyre).max.y - round) < 1e-6 && data.body.rotation.z === 0);
  // The lamps.
  const lamp = meshes(truck).find(mesh => mesh.name === 'Pickup body, lamps').material;
  data.setLamps(true);
  assert.ok(lamp.emissiveIntensity > 1 && data.pool.visible, 'the lamps light, and their light lies on the road');
  data.groundAt = (x, z) => .02 * z;
  data.update(0);
  assert.ok(bounds(data.pool).max.y > .4 && bounds(data.pool).min.y > .2, 'the light lies over rising ground, and over the mat of a road, not under them');
  data.groundAt = null;
  data.setLamps(false);
  assert.ok(lamp.emissiveIntensity === 0 && !data.pool.visible);
  // The loose side of the cover hangs below the rail on the side away from the driver, and the blanket flies from the aerial's top.
  const cover = bounds(data.cover), blanket = bounds(data.blanket);
  assert.ok(cover.min.x < -PICKUP.bedHalf && cover.min.y < PICKUP.bedTop - .5 && cover.max.y > PICKUP.bedTop, 'the cover hangs loose on one side');
  assert.ok(blanket.max.y > PICKUP.aerial.top - .15 && blanket.max.y < PICKUP.aerial.top + .1, 'the blanket is tied at the top of the aerial');
  // The cloths move with the clock and are the same at the same time.
  data.blanket.visible = true;
  data.update(1);
  const first = print(data.blanket);
  data.update(2);
  assert.notEqual(print(data.blanket), first, 'the blanket blows');
  data.update(1);
  assert.equal(print(data.blanket), first, 'and is the same at the same moment');
  assert.equal(print(buildMossPickup()), print(buildMossPickup()), 'the pickup is the same on a second run');
  data.dispose();
}
{
  const key = buildPickupKey();
  assert.equal(key.name, 'Pickup key on its nail');
  within(key, DACE_LOOK_BUDGET.key, 'the key');
  const box = bounds(key);
  assert.ok(box.max.y < .25 && box.min.y > -.15 && box.min.z < -.3 && box.max.z < .1, 'it hangs at the height the rules give, on a board whose fixings run back into the shed wall');
  assert.equal(KEY_HEIGHT, 1.45);
  key.userData.dispose();
}

// ---- The stones, the tracks and the three places ----
const slope = (x, z) => .03 * x - .02 * z;
{
  const stones = buildWalkerStones({heightAt: slope});
  assert.equal(stones.name, 'Three Walker stones');
  within(stones, DACE_LOOK_BUDGET.stones, 'the stones');
  const solid = meshes(stones).find(mesh => mesh.name.endsWith('stone and rubber')), box = new THREE.Box3().setFromObject(solid);
  assert.ok(box.max.y > 1.1 && box.max.y < 1.5, `the stack stands ${box.max.y.toFixed(2)} m high, to be seen from a car at 40 m`);
  assert.ok(Math.abs(box.max.y - DACE_SITE_LAYOUT.stones.high) < .2);
  stones.userData.dispose();

  const tracks = buildPickupTracks({heightAt: slope});
  assert.equal(tracks.name, "The old pickup's tracks");
  within(tracks, DACE_LOOK_BUDGET.tracks, 'the tracks');
  const run = bounds(tracks), T = DACE_SITE_LAYOUT.tracks;
  assert.ok(run.max.z - run.min.z > 40 && run.max.x - run.min.x < 4.5 && run.max.x - run.min.x > T.gauge, 'one vehicle\'s line: two ruts a truck\'s width apart, over forty metres');
  assert.ok(Math.abs(T.gauge - PICKUP.track * 2) < 1e-9, 'as far apart as the pickup\'s own wheels');
  tracks.userData.dispose();
}
for (const [id, build, name, parts] of [
  ['deep-sign', buildDeepSign, 'The Deep Sign', ['punched drum', 'wet gravel', 'tin', 'marks on the ground']],
  ['hangar', buildHangar, 'The Hangar', ['tin', 'iron', 'marks on the ground']],
  ['crows-step', buildCrowsStep, "The Crow's Step", ['timber', 'stone and rubber', 'tin']]]) {
  const site = build({heightAt: slope});
  assert.equal(site.name, name);
  assert.equal(DACE_SITES[id], build);
  within(site, DACE_LOOK_BUDGET[id], name);
  for (const part of parts) assert.ok(site.userData.draws.includes(`${name}, ${part}`), `${name} has its ${part}`);
  assert.equal(print(build({heightAt: slope})), print(site), `${name} is the same on a second run`);
  // The spot where the car stops is clear of everything that stands up.
  for (const mesh of meshes(site)) {
    if (/marks on the ground|wet gravel/.test(mesh.name)) continue;
    const points = mesh.geometry.attributes.position;
    for (let index = 0; index < points.count; index++) assert.ok(Math.hypot(points.getX(index), points.getZ(index)) > 1.5 || points.getY(index) < .3, `${mesh.name} leaves the spot clear`);
  }
  site.userData.dispose();
}
{
  // The Hangar: the front ribs stand, and the roof comes down to the ground at the far end.
  const H = DACE_SITE_LAYOUT.hangar, crown = index => hangarRib(index, Math.PI / 2)[1];
  assert.ok(crown(0) > 6.5 && crown(2) > 6.5, 'the front of the Hangar stands');
  assert.ok(crown(H.arches - 1) < .8, 'its far end lies on the ground');
  for (let index = 1; index < H.arches; index++) assert.ok(crown(index) <= crown(index - 1) + 1e-9, 'the roof only comes down towards the far end');
  // The Crow's Step: a deck a person can stand on, with the ladder's top at it.
  const C = DACE_SITE_LAYOUT['crows-step'], step = buildCrowsStep();
  assert.ok(C.deck >= 2 && C.deck <= 3 && C.half * 2 >= 2, 'a low lookout with a deck two metres or more across');
  assert.ok(bounds(step).max.y > C.deck + 1, 'and a rail above it');
  step.userData.dispose();
}

// ---- The look, as the open land calls it ----
{
  const land = new THREE.Group(), placed = [];
  const look = createDaceLook(land, (mesh, at) => { mesh.position.set(at.x, 0, at.z); placed.push(mesh.name); });
  const root = land.children[0];
  assert.equal(root.name, 'Dace goes looking');
  for (const name of ["Moss's old pickup", 'Pickup key on its nail', 'The Deep Sign', 'The Hangar', "The Crow's Step"]) assert.ok(root.getObjectByName(name), `the look holds "${name}"`);
  const open = (beat, {marks = [], site = 'hangar', found = [], end, active = null, staged = null, events = [], seconds = 10} = {}) => ({
    parts: {threads: {places: {checkpointsEnabled: true}, dace: staged}, missions: {active}}, events, seconds,
    world: {open: {threads: {[DACE_ID]: {beat, end, cast: {site}}}, found, landSeed: 0}, ledger: {marks: marks.map(mark => DACE_ID + '/' + mark), night: 3}},
  });
  const truck = root.getObjectByName("Moss's old pickup"), key = root.getObjectByName('Pickup key on its nail'), data = truck.userData;
  // The key beat: the pickup stands covered in the yard with its key on the nail.
  look.update(open('key'), null, places.pickup);
  assert.ok(truck.visible && data.cover.visible && !data.folded.visible && data.bonnet.rotation.x === 0 && data.flat && key.visible && !data.blanket.visible);
  assert.deepEqual([truck.position.x, truck.position.z], [places.pickup.x, places.pickup.z]);
  assert.equal(key.position.y, KEY_HEIGHT);
  // Ready: the cover is off and on the ground, the bonnet is up, and the mended spare is on.
  look.update(open('ready', {marks: ['spare-mended']}), null, places.pickup);
  assert.ok(truck.visible && !data.cover.visible && data.folded.visible && data.bonnet.rotation.x < 0 && !data.flat && !key.visible);
  // Leaving: it drives off from the gate with its lamps lit.
  look.update(open('away', {events: [{cue: 'open.pickup.started', seq: 4}], seconds: 10}), null, places.start);
  look.update(open('away', {events: [{cue: 'open.pickup.started', seq: 4}], seconds: 12}), null, places.start);
  assert.ok(truck.visible && data.pool.visible && Math.abs(truck.position.z - places.start.z - 16) < 1e-9, 'it leaves the gate at 8 m a second, lamps lit');
  // The search: the pickup by the road with the blanket on its aerial, the stones and the tracks on the land, and the place itself.
  const fetch = {id: DACE_ID + '/fetch'};
  look.update(open('search', {active: fetch, staged: {rescue: {reason: 'hill', truck: places.hill, walking: true}}, marks: ['told-stay']}), null, places.walking);
  assert.ok(truck.visible && data.blanket.visible && data.bonnet.rotation.x < 0 && !data.pool.visible);
  const stones = root.getObjectByName('Three Walker stones');
  assert.ok(stones?.visible && stones.position.x === places.walking.x, 'the Walker stones stand where he walked');
  look.update(open('search', {active: fetch, staged: {rescue: {reason: 'hill', truck: places.hill, walking: false}}}), null, places['his-tracks']);
  const tracks = root.getObjectByName("The old pickup's tracks");
  assert.ok(tracks?.visible && !stones.visible && tracks.rotation.y !== 0, 'his tracks lie along the way he drove');
  const hangar = sitePosition('hangar', 0);
  look.update(open('away', {site: 'hangar'}), null, hangar);
  const shown = root.getObjectByName('The Hangar');
  assert.ok(shown.visible && shown.children.length === 1 && !root.getObjectByName('The Deep Sign').visible, 'the place he went to is drawn when the player comes near it');
  look.update(open('away', {site: 'hangar'}), null, {x: hangar.x + 500, z: hangar.z});
  assert.ok(!shown.visible, 'and not from far off');
  look.update({parts: {threads: {places: {checkpointsEnabled: false}}}}, null, places.pickup);
  assert.ok(!root.visible, 'nothing shows without the checkpoints part');
  look.dispose();
  assert.equal(land.children.length, 0);
}

// ---- The look stand and the laptop scenario ----
{
  for (const [name, row] of Object.entries(DACE_STAND)) for (const stage of row.stages) {
    const stood = buildDaceStand(name, {stage, heightAt: slope});
    assert.equal(stood.name, 'Dace look stand: ' + name);
    within(stood, budgetFor(name), `${name} at ${stage}`);
    stood.userData.update(7.3);
    stood.userData.dispose();
  }
  assert.throws(() => buildDaceStand('town'), RangeError);
  const stand = await readFile(new URL('./open-look-stand.js', import.meta.url), 'utf8');
  for (const name of Object.keys(DACE_STAND)) assert.ok(stand.includes(`'${name}'`), `the look stand has a row for ${name}`);
  const named = PICTURES.filter(picture => !picture.extra).map(picture => picture.name);
  assert.deepEqual(named, ['forge-day', 'stones-car', 'deep-sign', 'hangar', 'crows-step', 'gate-dusk'], 'the pictures the card lists, by name');
  assert.equal(new Set(PICTURES.map(picture => picture.name)).size, PICTURES.length);
  assert.ok(PICTURES.every(picture => DACE_STAND[picture.stand]?.stages.includes(picture.stage)));
  assert.equal(PICTURES.at(-1).name, 'gate-dusk', 'the dusk picture is taken last');
  assert.ok(PICTURES.filter(picture => picture.dusk).length === 1);
  const car = PICTURES.find(picture => picture.name === 'stones-car'), far = Math.hypot(car.eye.x, car.eye.z);
  assert.ok(Math.abs(far - 40) < .1 && car.eye.up === 1.2, `the stones are looked at from a car ${far.toFixed(1)} m off`);
  const forge = viewOf(PICTURES[0]);
  assert.ok(Math.abs(forge.eye.x - places.pickup.x - PICTURES[0].eye.x) < 1e-9 && !forge.dusk);
  for (const picture of PICTURES) assert.ok(Math.hypot(picture.car.x - picture.eye.x, picture.car.z - picture.eye.z) > 8, `${picture.name}: the player's car waits out of the picture`);
  const sources = pageSources();
  assert.ok(sources.length >= 20);
  for (const source of sources) assert.doesNotThrow(() => new Function(`return ${source}`), `a text sent to the page parses: ${source.slice(0, 60)}`);
}

console.log(`Dace look: the pickup with its bonnet, flat tyre, cover, blanket and lamps, its key, the stones, the tracks and three places within their budgets, the look's own showing and hiding, ${Object.keys(DACE_STAND).length} stood things and ${PICTURES.length} pictures pass.`);
