// TOWN-VIEW-LIFE: the town's walkers, carts, trucks, smoke, fire, dust and moving parts are drawing only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as THREE from 'three';
import {createTown, stepTown, serializeTown} from '../src/town/index.js';
import {storeGood} from '../src/town/town-goods.js';
import {createHauler, stepHauler} from '../src/town/town-haulers.js';
import {createTownScene} from '../src/town/view/town-scene.js';
import {createTownWalkers, townLifePlaces, townLifeSample, townLifeHash, townLifeSeed, townPersonErrand, townWalkRoute, townWalkerFeet,
  TOWN_LIFE_BUDGET, TOWN_WALKER_MODELS, TOWN_ROAD_TOP} from '../src/town/view/town-walkers.js';
import {createTownFx, townWaterLevel, townFireSources} from '../src/town/view/town-fx.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };

// A walkers family shaped like walkers.glb: walkers jointed at the hip, walkers in long coats jointed at the boot, and children.
// Each leg mesh has its origin at the sole, so its matrix shows where the foot is.
function fakeWalkers() {
  const holder = new THREE.Group(); holder.name = 'town-walkers';
  const box = new THREE.BoxGeometry(.2, .2, .2), material = new THREE.MeshStandardMaterial();
  for (const [name, hip] of [['walker-c', .83], ['walker-e', .83], ['walker-a', .25], ['walker-kid-a', .66], ['walker-guard', .83]]) {
    const root = new THREE.Group(); root.name = name; holder.add(root);
    const upper = new THREE.Mesh(box, material); upper.name = `${name}:upper`; upper.position.y = 1.2; root.add(upper);
    for (const side of ['l', 'r']) {
      const pivot = new THREE.Group(); pivot.name = `${name}:leg-${side}.001`; pivot.position.set(side === 'l' ? -.095 : .095, hip, 0); root.add(pivot);
      const leg = new THREE.Mesh(box, material); leg.name = `${name}:leg-${side}`; leg.position.y = -hip; pivot.add(leg);
    }
  }
  const scene = new THREE.Group(); scene.add(holder);
  return {scene, animations:[]};
}
function fakeWorks(withCart) {
  const scene = new THREE.Group(), holder = new THREE.Group(); holder.name = 'town-works'; scene.add(holder);
  if (withCart) { const cart = new THREE.Group(); cart.name = 'handcart'; cart.add(new THREE.Mesh(new THREE.BoxGeometry(1, .6, 1.4))); holder.add(cart); }
  return {scene, animations:[]};
}
function fakeTrucks() {
  const scene = new THREE.Group(), truck = new THREE.Group(); truck.name = 'supply-truck'; scene.add(truck);
  const spin = new THREE.Group(); spin.name = 'supply-truck:spin-rear-1-left'; spin.add(new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .3))); truck.add(spin);
  return {scene, animations:[]};
}
const requested = [];
const loader = ({cart = false} = {}) => async url => {
  requested.push(url);
  if (url === TOWN_WALKER_MODELS.walkers) return fakeWalkers();
  if (url === TOWN_WALKER_MODELS.works) return fakeWorks(cart);
  if (url === TOWN_WALKER_MODELS.trucks) return fakeTrucks();
  if (url.includes('/assets/wildlife/')) return {scene:new THREE.Group(), animations:[]};
  throw new Error(`No model at ${url}`);
};
const fireTable = JSON.parse(readFileSync(new URL('../public/assets/heli/fire-fx.json', import.meta.url), 'utf8'));
const fireArt = {texture:async () => new THREE.Texture(), table:async () => fireTable};

// A small town with people, roads, a well, a kitchen and a home being built: the same commands for both copies.
function foundTown(seed) {
  const town = createTown(seed, 'Life Check', []);
  const commands = [{type:'paintHomeGround', cells:[{x:3, z:3}, {x:4, z:3}, {x:5, z:3}]},
    ...Array.from({length:12}, (_, index) => ({type:'placeBuilding', buildingId:'road-dirt', x:index, z:2})),
    {type:'placeBuilding', buildingId:'hand-well', x:6, z:4}, {type:'placeBuilding', buildingId:'soup-kitchen', x:8, z:3},
    {type:'placeBuilding', buildingId:'windmill', x:10, z:4}];
  stepTown(town, commands);
  storeGood(town, {x:0, z:0}, 'canvas', 200); storeGood(town, {x:0, z:0}, 'food', 500000);
  // The well, kitchen and windmill stand finished, so the kitchen can catch fire and the fire can spread by the town's own rules.
  for (const building of town.buildings) if (!building.buildingId.startsWith('road-')) building.state = 'finished';
  return town;
}

// 1. A town run with the view attached reaches exactly the state of the same town run without it.
{
  const withView = foundTown(4242), without = foundTown(4242);
  const view = createTownScene({town:withView, width:800, height:600, loadModel:async () => new THREE.Group(), loadLifeModel:loader({cart:true}), loadFxArt:fireArt});
  await view.state.life.ready;
  const camera = view.camera;
  camera.userData.townView.target.set(40, 0, 24); camera.userData.townView.zoom = 62 / (24500 - 28);
  let drawnAtSomePoint = 0, fireSeen = false;
  for (let hour = 0; hour < 24 * 30; hour++) {
    const commands = hour === 300 ? [{type:'igniteTownFire', buildingId:withView.buildings.find(row => row.buildingId === 'soup-kitchen').id}] : [];
    stepTown(withView, commands.length ? JSON.parse(JSON.stringify(commands)) : []);
    stepTown(without, commands);
    if (hour % 24 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    if (hour % 3 === 0) {
      // The whole scene's step is slow without a browser, so most frames draw only the life and the effects.
      if (hour % 96 === 0) view.step(1 / 30);
      for (let frame = 0; frame < 4; frame++) { view.state.life.update({dt:1 / 30, focus:{x:40, z:24}, distance:90}); view.state.fx.update({dt:1 / 30, focus:{x:40, z:24}, distance:90}); }
      view.pick(400, 300, {left:0, top:0, width:800, height:600});
      drawnAtSomePoint = Math.max(drawnAtSomePoint, view.state.life.stats().drawn);
      fireSeen ||= view.state.fx.stats().flames > 0;
    }
  }
  assert.equal(serializeTown(withView), serializeTown(without), 'a town stepped with its view attached matches one stepped without it');
  checks++;
  check(withView.people.length >= 12, 'the check town has its founders');
  check(drawnAtSomePoint > 0, 'the view drew walkers while the town ran');
  const quiet = serializeTown(withView);
  for (let frame = 0; frame < 300; frame++) { if (frame % 100 === 0) view.step(1 / 30); view.state.life.update({dt:1 / 30, focus:{x:40, z:24}, distance:90}); view.state.fx.update({dt:1 / 30, focus:{x:40, z:24}, distance:90}); }
  assert.equal(serializeTown(withView), quiet, 'drawing 300 frames without a tick leaves the town untouched'); checks++;
  view.dispose();
  check(fireSeen, 'the kitchen fire was drawn while the town burned it by its own rules');
}

// 2. The view's stream is its own: the seed comes from the town's seed, and the town's random state is never read.
{
  const town = foundTown(77), seed = townLifeSeed(town);
  check(seed !== town.rngState && seed === townLifeSeed({...town, rngState:999}), 'the view seed does not follow the town random state');
  check(townLifeHash(seed, 'person-1') === townLifeHash(seed, 'person-1') && townLifeHash(seed, 'person-1') !== townLifeHash(seed, 'person-2'),
    'each person has a fixed hash of their own');
}

// 3. Walkers keep to the road graph between places.
{
  const town = {buildings:Array.from({length:20}, (_, index) => ({id:`r${index}`, buildingId:'road-dirt', regionId:'scablands', x:index, z:5, width:1, depth:1, state:'plan'}))
    .concat(Array.from({length:10}, (_, index) => ({id:`s${index}`, buildingId:'road-dirt', regionId:'scablands', x:19, z:5 + index, width:1, depth:1, state:'plan'}))), homePlots:[]};
  const places = townLifePlaces(town);
  const route = townWalkRoute(places, {x:4, z:38}, {x:156, z:120}, {lane:1.5});
  check(route.length > 2, 'a walk between two road ends follows the road');
  for (const point of route.slice(1, -1)) {
    const near = [...places.roads.values()].some(cell => Math.abs((cell.x + .5) * 8 - point.x) <= 4 + 1.6 && Math.abs((cell.z + .5) * 8 - point.z) <= 4 + 1.6);
    check(near, `the walk's point ${Math.round(point.x)}, ${Math.round(point.z)} is on a road cell`);
  }
  const corner = route.find(point => Math.abs(point.x - 156) < 3 && Math.abs(point.z - 44) < 3);
  check(corner, 'the walk turns at the road corner instead of cutting across');
  // Feet stand on a built road's top, not on the ground under its slab; a planned road has no top yet.
  const built = townLifePlaces({buildings:[{id:'b', buildingId:'road-dirt', regionId:'scablands', x:0, z:0, width:1, depth:1, state:'finished', groundY:1.2},
    {id:'p', buildingId:'road-dirt', regionId:'scablands', x:1, z:0, width:1, depth:1, state:'plan', groundY:1.2}], homePlots:[]});
  check(Math.abs(built.roads.get('0:0').top - (1.2 + TOWN_ROAD_TOP)) < 1e-9 && built.roads.get('1:0').top === null, 'walkers stand on the top of a built road');
}

// 4. Feet stand still on the ground for half of each stride: they do not slide.
{
  const step = .7;
  let start = null;
  for (let phase = 0; phase < .5; phase += .02) {
    const body = phase * 2 * step, foot = townWalkerFeet(phase, step).left;
    start ??= body + foot.forward;
    check(Math.abs(body + foot.forward - start) < 1e-9 && foot.lift === 0, `the standing foot keeps its place at phase ${phase.toFixed(2)}`);
  }
  const swing = townWalkerFeet(.75, step).left;
  check(swing.lift > 0, 'the moving foot lifts off the ground');
}

// 5. Drawn walkers: a sample of a 10,000-person town, a click finds the person, feet planted in the drawn picture.
{
  const roads = Array.from({length:80}, (_, index) => ({id:`road-${index}`, buildingId:'road-dirt', regionId:'scablands', x:index - 40, z:0, width:1, depth:1, state:'plan'}));
  const town = {seed:91, tick:24n * 10n + 7n, calendar:{hour:7}, buildings:[...roads,
    {id:'site', buildingId:'kiln', regionId:'scablands', x:2, z:2, width:2, depth:2, state:'plan'},
    {id:'well', buildingId:'hand-well', regionId:'scablands', x:-4, z:-2, width:1, depth:1, state:'finished'}], homePlots:[],
    people:Array.from({length:10000}, (_, index) => ({id:`person-${index}`, name:`Person ${index}`, age:18 + index % 50, family:`family-${index % 2500}`,
      home:`canvas-family-${index % 2500}`, homeType:'Canvas', job:'townhand'}))};
  const snapshot = JSON.stringify(town, (_key, value) => typeof value === 'bigint' ? String(value) : value);
  const life = createTownWalkers({town, loadModel:loader()});
  await life.ready;
  const camera = new THREE.PerspectiveCamera(48, 800 / 600, .1, 5000);
  camera.position.set(0, 63.6, 63.6); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const started = performance.now();
  life.update({dt:1 / 60, focus:{x:0, z:0}, distance:90});
  const firstFrame = performance.now() - started;
  let frames = 0;
  const frameStart = performance.now();
  for (; frames < 120; frames++) life.update({dt:1 / 60, focus:{x:0, z:0}, distance:90});
  const perFrame = (performance.now() - frameStart) / frames, stats = life.stats();
  check(stats.drawn > 0 && stats.drawn <= TOWN_LIFE_BUDGET.walkers, `a 10,000-person town draws a sample of at most ${TOWN_LIFE_BUDGET.walkers} (drew ${stats.drawn})`);
  check(stats.drawCalls <= 5 * 3 + 1, `the sample costs a fixed number of draw calls (${stats.drawCalls})`);
  life.update({dt:1 / 60, focus:{x:0, z:0}, distance:2000});
  life.update({dt:1.1, focus:{x:0, z:0}, distance:2000});
  check(life.stats().drawn === 0, 'nobody is drawn from the far zoom, where a person would be under three pixels');
  for (let frame = 0; frame < 70; frame++) life.update({dt:1 / 60, focus:{x:0, z:0}, distance:90});
  const shown = [...life.state.walkers.values()].find(walker => !walker.hidden && walker.person);
  check(shown, 'someone is out of doors to click on');
  const chest = new THREE.Vector3(shown.position.x, shown.position.y + 1.2 * shown.scale, shown.position.z).project(camera);
  const hit = life.pickPerson(camera, (chest.x * .5 + .5) * 800, (-chest.y * .5 + .5) * 600, {left:0, top:0, width:800, height:600});
  check(hit?.type === 'person' && hit.personId === shown.id && hit.person === town.people.find(person => person.id === shown.id), 'a click on a walker finds that person');
  check(life.pickPerson(camera, 2, 2, {left:0, top:0, width:800, height:600}) === null, 'a click on empty ground finds nobody');
  life.select(shown.id); life.update({dt:1 / 60, focus:{x:0, z:0}, distance:90});
  check(life.group.getObjectByName('Chosen person').visible, 'the chosen person has a ring under them');
  // Follow one walking hip-jointed walker on a straight road and watch its standing foot in the drawn matrices.
  const walking = [...life.state.walkers.values()].find(walker => walker.pose === 'walk' && walker.variant.hipLegs && walker.line?.total - walker.distance > 6);
  check(walking, 'someone is walking to work at seven in the morning');
  {
    const legs = walking.variant.parts.filter(part => part.kind !== 'body'), matrix = new THREE.Matrix4(), foot = new THREE.Vector3();
    const order = [...life.state.walkers.values()].filter(walker => !walker.hidden && walker.variant === walking.variant);
    const slot = order.indexOf(walking);
    let planted = 0, slipped = 0, previous = null;
    for (let frame = 0; frame < 40; frame++) {
      const before = walking.phase;
      life.update({dt:1 / 60, focus:{x:0, z:0}, distance:90});
      const standing = walking.phase < .5 ? legs.find(part => part.kind === 'left') : legs.find(part => part.kind === 'right');
      standing.mesh.getMatrixAt(slot, matrix); foot.setFromMatrixPosition(matrix);
      const sameHalf = (before < .5) === (walking.phase < .5);
      if (previous && sameHalf && previous.part === standing) { const moved = Math.hypot(foot.x - previous.x, foot.z - previous.z); if (moved < .02) planted++; else slipped++; }
      previous = {x:foot.x, z:foot.z, part:standing};
    }
    check(planted > slipped * 3, `the standing foot stays planted in the drawn picture (${planted} still, ${slipped} moved)`);
    // The walkers' fronts face +Z in their model (tools/blender/town-walkers.py), so +Z must point the way they walk.
    const body = walking.variant.parts.find(part => part.kind === 'body'), front = new THREE.Vector3(0, 0, 1);
    body.mesh.getMatrixAt(slot, matrix);
    front.transformDirection(matrix);
    const way = new THREE.Vector3(); const before = walking.position.clone();
    for (let frame = 0; frame < 10; frame++) life.update({dt:1 / 60, focus:{x:0, z:0}, distance:90});
    way.subVectors(walking.position, before).setY(0).normalize();
    check(front.setY(0).normalize().dot(way) > .7, `a walker faces the way they walk (${front.dot(way).toFixed(2)})`);
  }
  // The costly case: the camera far from anyone, so the whole town is looked at and nobody is found.
  const far = createTownWalkers({town, loadModel:loader()});
  await far.ready;
  far.update({dt:1 / 60, focus:{x:4000, z:4000}, distance:90});
  far.update({dt:1.1, focus:{x:4000, z:4000}, distance:90});
  const farMs = far.stats().refreshMs;
  check(far.stats().drawn === 0, 'nobody is drawn where nobody is');
  far.dispose();
  assert.equal(JSON.stringify(town, (_key, value) => typeof value === 'bigint' ? String(value) : value), snapshot, 'drawing the sample only reads the town'); checks++;
  console.log(`  Sample of a 10,000-person town: ${stats.drawn} drawn, ${stats.drawCalls} draw calls; choosing the sample took ${stats.refreshMs.toFixed(1)} ms (once a second), a frame ${perFrame.toFixed(2)} ms (first ${firstFrame.toFixed(1)} ms); looking at the whole town from far away ${farMs.toFixed(1)} ms.`);
  life.dispose();
}

// 6. A handcart is drawn only when its part is in the works family; trucks run on their real road with turning wheels.
{
  const roads = Array.from({length:30}, (_, index) => ({id:`road-${index}`, buildingId:'road-dirt', regionId:'scablands', x:index, z:0, width:1, depth:1,
    state:'built', roadClass:'dirt'}));
  const haul = vehicle => createHauler({id:`${vehicle}-1`, from:{x:0, z:0}, to:{x:29, z:0}, vehicle, roads, fuelLitres:50}).agent;
  for (const cart of [false, true]) {
    const town = {seed:5, calendar:{hour:10}, buildings:roads, homePlots:[], people:[], haulers:[haul('handcart'), haul('truck')]};
    const life = createTownWalkers({town, loadModel:loader({cart})});
    await life.ready;
    // The test plays the town's part: the haulers move one game hour at a time while the view draws.
    for (let frame = 0; frame < 60; frame++) {
      if (frame === 20) for (const agent of town.haulers) stepHauler(agent, roads);
      life.update({dt:1 / 30, focus:{x:100, z:0}, distance:90});
    }
    const handcart = life.state.vehicles.get('hauler:handcart-1'), truck = life.state.vehicles.get('hauler:truck-1');
    check(Boolean(handcart?.object) === cart, cart ? 'with the handcart part, the handcart is drawn' : 'without the handcart part, no cart is drawn');
    check(handcart?.walker?.variant, 'someone pushes the handcart along its road');
    check(truck?.object, 'the truck is drawn from the real hauler');
    const wheel = truck.object.getObjectByName('supply-truck:spin-rear-1-left');
    check(wheel && wheel.rotation.x !== 0, 'the truck wheels turn as it moves');
    life.dispose();
  }
}

// 7. Animals: nothing is asked for until the animals card adds a row; then the pen's goats are drawn by name.
{
  const town = {seed:3, calendar:{hour:10}, buildings:[{id:'pen', buildingId:'goat-pen', regionId:'scablands', x:0, z:0, width:2, depth:2, state:'finished'}], homePlots:[], people:[]};
  requested.length = 0;
  const none = createTownWalkers({town, loadModel:loader(), wildlife:{}});
  await none.ready; none.update({focus:{x:8, z:8}, distance:90});
  check(!requested.some(url => url.includes('/assets/wildlife/')), 'no animal file is asked for before its model row exists');
  none.dispose();
  const goats = createTownWalkers({town, loadModel:loader(), wildlife:{goat:{file:'goat.glb', idle:'Idle', move:'Walk', scale:1}}});
  await goats.ready; goats.update({focus:{x:8, z:8}, distance:90});
  check(requested.includes('/assets/wildlife/goat.glb') && goats.stats().animals === 8, 'a goat pen holds its eight goats once the goat model exists');
  goats.dispose();
}

// 8. Effects: the tower's gauge, the windmill turning, fire in the helicopter's look, steam when it goes out, dust days.
{
  const buildings = new THREE.Group(), model = new THREE.Group();
  const rotor = new THREE.Group(); rotor.name = 'windmillrotor';
  const gauges = [1, 2, 3].map(step => { const mark = new THREE.Mesh(new THREE.BoxGeometry(.4, .1, .02)); mark.name = `water-towerfill-${step}`; return mark; });
  model.add(rotor, ...gauges); buildings.add(model);
  const town = {seed:9, calendar:{hour:3, season:'Spring'}, weather:{windDirection:0, windSpeedKph:18, dust:true},
    buildings:[{id:'burn', buildingId:'soup-kitchen', regionId:'scablands', x:0, z:0, width:2, depth:1, state:'finished', fireStage:2}],
    homePlots:[], people:[], utilities:{waterResult:{demand:1000, delivered:1000}}};
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xb4a286, 90, 260); scene.background = new THREE.Color(0xb4a286);
  const fx = createTownFx({town, scene, buildings, load:fireArt});
  fx.update({dt:1 / 60, focus:{x:0, z:0}});
  await new Promise(resolve => setTimeout(resolve, 0));
  for (let frame = 0; frame < 60; frame++) { scene.fog.near = 90; scene.fog.far = 260; fx.update({dt:1 / 30, focus:{x:0, z:0}}); }
  const stats = fx.stats();
  check(stats.art === 'ready' && stats.flames > 0 && stats.light > 0, 'a burning building has flames from the fire atlas and a flickering light');
  check(rotor.rotation.z !== 0, 'the windmill rotor turns with the wind');
  const {townWind} = await import('../src/town/view/town-fx.js');
  check(Math.abs(townWind(town).x - 1) < 1e-9, 'a wind blowing at 0 degrees blows along +x');
  check(gauges.every(mark => mark.visible) && townWaterLevel(town, 3) > .8, 'a full tower at night shows all three marks on its gauge');
  check(townWaterLevel(town, 7) < townWaterLevel(town, 3), 'the tower is drawn down at the morning peak');
  const dry = {...town, utilities:{waterResult:{demand:1000, delivered:100}}};
  check(townWaterLevel(dry, 7) < .2, 'a town short of water shows a nearly empty tower');
  check(stats.dust > .3 && !scene.fog.color.equals(new THREE.Color(0xb4a286)), 'a dust day closes the air in to dust colour');
  check(townFireSources(town).length === 1, 'the fire comes from the building on fire');
  delete town.buildings[0].fireStage;
  fx.update({dt:.6, focus:{x:0, z:0}});
  check(fx.state.cooled.has('burn') && fx.stats().smoke > 0, 'a fire that goes out steams');
  const bed = {...town, buildings:[{id:'reeds', buildingId:'reed-bed', regionId:'scablands', x:4, z:4, width:3, depth:3, state:'finished'}], weather:{}};
  const reeds = createTownFx({town:bed, load:fireArt});
  reeds.update({dt:1 / 60, focus:{x:40, z:40}});
  check(reeds.stats().reeds > 100, `a reed bed is planted with reeds (${reeds.stats().reeds} tufts)`);
  reeds.dispose(); fx.dispose();
  check(scene.fog.color.equals(new THREE.Color(0xb4a286)), 'closing the view gives the fog back its own colour');
}

// 9. People's errands come from their own records.
{
  const town = {buildings:[{id:'tap', buildingId:'standpipe', regionId:'scablands', x:1, z:1, width:1, depth:1, state:'finished'},
    {id:'site', buildingId:'kiln', regionId:'scablands', x:6, z:6, width:2, depth:2, state:'foundation'}],
  homePlots:[{id:'plot-a', regionId:'scablands', x:3, z:3, tier:2, household:'Ash', building:false}]};
  const places = townLifePlaces(town), worker = {id:'p1', age:30, home:'plot-a', job:'townhand'};
  const morning = townPersonErrand(worker, places, {hour:6, day:0, hash:.1}), noonish = townPersonErrand(worker, places, {hour:9, day:0, hash:.1});
  check(['queue', 'inside'].includes(morning.pose), 'at dawn a person fetches water or is still at home');
  check(noonish.pose === 'work' && Math.hypot(noonish.to.x - 64, noonish.to.z - 64) < 9, 'in working hours a town hand works on the open site');
  const night = townPersonErrand(worker, places, {hour:2, day:0, hash:.5});
  check(night.pose === 'inside' && !night.outdoors, 'at night most people are indoors and not drawn');
  // The town drive knows a person only by a spot beside a building: they live there, not at the camp.
  const visitor = townPersonErrand({id:'drive-1', spot:{x:40, z:90}}, places, {hour:2, day:0, hash:.5});
  check(visitor.to.x === 40 && visitor.to.z === 90, 'a person known only by a spot lives at that spot');
  const sample = townLifeSample({people:[worker]}, places, {focus:{x:64, z:64}, radius:80, budget:10, hour:9});
  check(sample.length === 1, 'a worker on a site near the camera is in the sample');
}

console.log(`Town view life checks passed (${checks} checks): the view leaves the town unchanged, walkers keep to the roads with planted feet, a click finds the person, carts need their part, animals wait for their models, and fire, smoke, dust, reeds and the tower gauge are drawn.`);
