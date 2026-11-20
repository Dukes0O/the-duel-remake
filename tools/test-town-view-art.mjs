// TOWN-VIEW-ART: the town's buildings from the art families. Proves that every building has its art and every piece
// named is in its family file, that the plan reads the town and nothing else (no view randomness, the same town gives
// the same plan), the variety rule, the burnt and rubble states, the street wear rule, that a town drawn with its art
// steps to the same state as one drawn without, and what a town of 500 and of 5,000 costs to draw.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {BUILDINGS} from '../src/town/content/registry.js';
import {OUTPOSTS_WORLD} from '../src/town/content/outposts-world.js';
import {placeOutpost} from '../src/town/town-outpost-world.js';
import {VANE_PIECES} from '../src/town/content/vane-world.js';
import {townVaneWorld} from '../src/town/town-vane-world.js';
import {createTown, dispatchTownCommand, serializeTown, stepTown} from '../src/town/index.js';
import {createTownCamera, TOWN_ZOOM} from '../src/town/view/town-camera.js';
import {createTownArtDrawing, createTownArtLibrary, TOWN_ART_BANDS, clusterGeometry} from '../src/town/view/town-art.js';
import {TOWN_ART_ROAD_TOP, townArtMissing, townArtPlan, townArtSignature, townCornerTurn, townHomeVariant, townLinePieces,
  townStreetThings, townStreetWear, townStreetYears} from '../src/town/view/town-art-plan.js';
import {TOWN_ART_FAMILIES, TOWN_BUILDING_ART, TOWN_HOME_ART, TOWN_LINE_ART, TOWN_LINE_RUIN, TOWN_RUIN_ART, TOWN_SITE_ART,
  TOWN_SITE_MACHINES, TOWN_STREET_THINGS, TOWN_UTILITY_ART, TOWN_WORLD_ART} from '../src/town/view/town-art-table.js';
import {createTownScene} from '../src/town/view/town-scene.js';
import {TOWN_ROAD_TOP} from '../src/town/view/town-walkers.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const folder = join(root, 'public/assets/models/wasteland/town');
let checks = 0;
const check = (ok, label) => { assert.ok(ok, label); checks++; };

// ---- The art table against the family files -------------------------------------------------------------------
const glbJson = file => { const bytes = readFileSync(join(folder, file)); return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')); };
const names = new Map(Object.entries(TOWN_ART_FAMILIES).map(([family, file]) => [family, new Set(glbJson(file).nodes.map(node => node.name))]));
const named = [];
for (const row of Object.values(TOWN_BUILDING_ART)) {
  named.push([row.family, row.node]);
  for (const vehicle of row.parked ?? []) named.push([vehicle.family, vehicle.node]);
  for (const marker of row.markers ?? []) named.push([row.family, `${row.node}:${marker}`]);
}
for (const row of Object.values(TOWN_LINE_ART)) for (const node of [row.straight, row.corner, row.end]) named.push([row.family, node]);
for (const row of [TOWN_UTILITY_ART.trench, TOWN_UTILITY_ART.trenchCorner, TOWN_UTILITY_ART.valve, TOWN_UTILITY_ART.pole]) named.push([row.family, row.node]);
for (const node of [...Object.values(TOWN_SITE_ART), ...TOWN_RUIN_ART.burnt, ...TOWN_RUIN_ART.rubble, TOWN_LINE_RUIN, 'street-lamp', ...TOWN_STREET_THINGS.map(thing => thing.node)])
  named.push(['stages', node]);
for (const machine of [...TOWN_SITE_MACHINES.foundation, ...TOWN_SITE_MACHINES.frame, ...Object.values(TOWN_SITE_MACHINES.road), TOWN_SITE_MACHINES.pipe])
  named.push([machine.family, machine.node]);
for (const tier of TOWN_HOME_ART.filter(Boolean)) for (const node of tier) named.push(['homes', node]);
for (const entry of TOWN_WORLD_ART.dome) named.push([entry.family, entry.node]);
for (const piece of Object.values(VANE_PIECES)) named.push(['vane', piece.node]);
for (const row of OUTPOSTS_WORLD) named.push(['outposts', row.node]);
named.push(['plants', 'wellhead'], ['water', 'hand-well'], ['works', 'test-pit']);
const absent = named.filter(([family, node]) => !names.get(family)?.has(node)).map(pair => pair.join('/'));
check(absent.length === 0, `every piece the view names is in its family file (missing: ${absent.join(', ')})`);
check(townArtMissing(BUILDINGS).length === 0, `every building in the content table has its art (missing: ${townArtMissing(BUILDINGS).join(', ')})`);
// Every town family file is drawn by the town's view, or by the view that owns it.
const elsewhere = {'walkers.glb':'town-walkers.js', 'borer.glb':'the Dig (src/machines/dig-game.js)', 'story-walkers.glb':'src/world/story-people-view.js',
  'peace-camp.glb':'the peace endings', 'peace-crane.glb':'the peace endings', 'peace-props.glb':'the peace endings'};
const files = readdirSync(folder).filter(file => file.endsWith('.glb'));
const unread = files.filter(file => !Object.values(TOWN_ART_FAMILIES).includes(file) && !elsewhere[file]);
check(unread.length === 0, `every town family file is read by a view (unread: ${unread.join(', ')})`);
check(!files.includes('sample.glb'), 'the TOWN-ART-BASE sample is gone');
check(TOWN_ART_ROAD_TOP === TOWN_ROAD_TOP, 'street things stand on the road top the walkers walk on');

// ---- A town to draw ----------------------------------------------------------------------------------------------
const YEAR = 24 * 30 * 12;
function building(town, buildingId, x, z, extra = {}) {
  const row = BUILDINGS.find(item => item.id === buildingId) ?? {width:1, depth:1};
  const record = {id:`building-${town.buildings.length + 1}`, buildingId, regionId:'scablands', x, z, width:row.width, depth:row.depth,
    state:'finished', groundY:0, ...extra};
  town.buildings.push(record);
  return record;
}
function sampleTown() {
  const town = {seed:4242, rngState:99, tick:BigInt(4 * YEAR), buildings:[], homePlots:[], book:[], regions:{scablands:{chunks:{}}}};
  for (let x = -6; x <= 6; x++) building(town, 'road-dirt', x, 0);
  for (let x = -6; x <= 6; x++) town.homePlots.push({id:`plot-${x}`, regionId:'scablands', x, z:1, tier:2, groundY:0});
  building(town, 'windmill', -6, -1); building(town, 'soup-kitchen', -4, -1); building(town, 'bathhouse', -2, -2);
  building(town, 'clinic', 0, -2, {state:'burnt-6'}); building(town, 'tavern', 2, -2, {state:'ruined'}); building(town, 'forge', 4, -2, {state:'frame'});
  building(town, 'old-ground', 8, -3); building(town, 'fire-station', 8, 1);
  return town;
}

// ---- The plan reads the town and nothing else --------------------------------------------------------------------
{
  const town = sampleTown(), before = serializeTown({...town, version:1});
  const random = Math.random; Math.random = () => { throw new Error('The art plan drew from Math.random.'); };
  let plan;
  try { plan = townArtPlan(town); } finally { Math.random = random; }
  check(serializeTown({...town, version:1}) === before, 'making the plan leaves the town unchanged');
  check(JSON.stringify(townArtPlan(town).placements) === JSON.stringify(plan.placements), 'the same town gives the same plan');
  check(JSON.stringify(townArtPlan({...town, rngState:12345}).placements) === JSON.stringify(plan.placements), 'the plan never reads the town\'s random state');
  check(plan.placements.some(item => item.node === 'burnt-2' && item.kind === 'burnt' && item.item.buildingId === 'clinic'), 'a burnt 2 by 2 clinic is the 2 by 2 burnt ruin');
  check(plan.placements.some(item => item.node === 'rubble-2' && item.kind === 'rubble' && item.item.buildingId === 'tavern'), 'a ruined tavern is rubble');
  check(plan.placements.some(item => item.node === 'scaffold-3' && item.item.buildingId === 'forge')
    && plan.placements.filter(item => item.kind === 'machine' && item.item.buildingId === 'forge').length === 2, 'a forge at its frame stage has its frame and two machines at work');
  check(!plan.placements.some(item => item.node === 'clinic'), 'a burnt building no longer stands');
  const ruin = plan.placements.find(item => item.node === 'burnt-2');
  check(Math.abs(ruin.sx - 15 / 15) < 1e-9 && ruin.sy === 1, 'a ruin is fitted to its plot in plan and keeps its height');
  check(plan.placements.some(item => item.key === 'trucks-1/fire-truck' && item.kind === 'parked'), 'the fire station has its truck');
  // A building on fire still stands under its flames (town-fx.js draws them).
  const burning = sampleTown(); burning.buildings.find(item => item.buildingId === 'soup-kitchen').fireStage = 2;
  check(townArtPlan(burning).placements.some(item => item.node === 'soup-kitchen'), 'a building on fire still stands');
  const plots = sampleTown(); plots.homePlots[0].burning = true; plots.homePlots[1].tier = 0; plots.homePlots[1].burnt = true;
  const plotPlan = townArtPlan(plots).placements;
  check(plotPlan.filter(item => item.node === 'burnt-1' && item.kind === 'burnt').length === 2, 'a home on fire, and one burnt out, are burnt ruins');
  // The Old Ground shows one grave for each of the town's dead.
  const mourning = sampleTown(); mourning.book = [{type:'passing'}, {type:'birth'}, {type:'passing'}, {type:'passing'}];
  check(townArtPlan(mourning).placements.filter(item => item.kind === 'marker').length === 3 && plan.placements.filter(item => item.kind === 'marker').length === 0,
    'the Old Ground shows one marker for each of the dead');
  check(townArtSignature(mourning) !== townArtSignature(town), 'a death changes what the view must draw');
  const dot = plan.placements.find(item => item.node === 'dot-diner'), placed = placeOutpost(OUTPOSTS_WORLD.find(row => row.node === 'dot-diner'), {heightAt:() => 0});
  check(dot && dot.x === placed.x && dot.z === placed.z && dot.turn === placed.heading, 'the town view puts each outpost where the drive does');
  const reach = townVaneWorld(town, {heightAt:() => 0}).reach, tower = plan.placements.find(item => item.node === 'vane-tower');
  check(tower && tower.x === reach.x && tower.z === reach.z && tower.turn === reach.heading && plan.placements.filter(item => item.node === 'vane-tower').length === 1,
    'Vane Reach stands once, where the drive puts it');
  check(townArtPlan(town, {world:false}).placements.every(item => item.kind !== 'outpost' && item.kind !== 'vane' && item.kind !== 'world'),
    'the drive\'s plan leaves the outposts, Mrs Vane and the Dome to the drive\'s own scenes, so nothing is drawn twice');
}

// ---- The same shack never twice in a row -------------------------------------------------------------------------
for (const [tier, options] of TOWN_HOME_ART.entries()) {
  if (!options || options.length < 2) continue;
  let same = 0, used = new Set();
  for (let x = -20; x < 20; x++) for (let z = -20; z < 20; z++) {
    const here = townHomeVariant(x, z, options.length, 77);
    used.add(here);
    if (here === townHomeVariant(x + 1, z, options.length, 77) || here === townHomeVariant(x, z + 1, options.length, 77)) same++;
  }
  check(same === 0 && used.size === options.length, `tier ${tier} homes never repeat side by side or back to back, and all ${options.length} models are used`);
}
{
  const town = sampleTown(), shacks = townArtPlan(town).placements.filter(item => item.kind === 'home').sort((a, b) => a.x - b.x);
  check(shacks.every((item, index) => index === 0 || item.node !== shacks[index - 1].node), 'a street of shacks never has the same shack twice in a row');
}

// ---- Fences and walls join up ------------------------------------------------------------------------------------
check(townCornerTurn('WS', 'WS') === 0 && Math.abs(townCornerTurn('WS', 'ES') - Math.PI / 2) < 1e-9 && Math.abs(townCornerTurn('WS', 'NE') - Math.PI) < 1e-9
  && Math.abs(townCornerTurn('WS', 'NW') + Math.PI / 2) < 1e-9, 'a corner piece turns onto each of the four corners');
check(townLinePieces({N:false, E:true, S:false, W:true}, TOWN_LINE_ART['fence-wood'])[0].node === 'fence-wood-straight'
  && townLinePieces({N:false, E:true, S:false, W:false}, TOWN_LINE_ART['fence-wood'])[0].node === 'fence-wood-end', 'a run of fence is straight in the middle and ends at its end');
{
  const town = sampleTown();
  for (const [x, z] of [[20, 5], [21, 5], [22, 5], [22, 6], [22, 7]]) building(town, 'wall-scrap', x, z);
  building(town, 'fence-wood', 30, 5, {state:'burnt-1'});
  const pieces = townArtPlan(town).placements.filter(item => item.kind === 'line');
  check(pieces.filter(item => item.node === 'wall-scrap-corner').length === 1 && pieces.filter(item => item.node === 'wall-scrap-end').length === 2,
    'an L of scrap wall has one corner and two ends');
  check(townArtPlan(town).placements.some(item => item.node === 'junk-pile' && item.item.buildingId === 'fence-wood'), 'a burnt fence leaves junk, not a house frame');
}

// ---- Street things, more as a street gets older ------------------------------------------------------------------
{
  const street = age => { const town = sampleTown(); town.tick = BigInt(Math.round(age * YEAR)); return townArtPlan(town).placements.filter(item => item.kind === 'street'); };
  const fresh = street(0), young = street(1), old = street(8);
  check(fresh.length === 0, 'a street laid today has nothing along it');
  check(young.length > 0 && old.length > young.length, `an older street has more along it (${young.length} at one year, ${old.length} at eight)`);
  const key = item => `${item.node}:${item.x.toFixed(3)}:${item.z.toFixed(3)}`, olds = new Set(old.map(key));
  check(young.every(item => olds.has(key(item))), 'a street keeps every thing it had as it gets older');
  check(old.every(item => {
    const cellX = Math.floor(item.x / 8), cellZ = Math.floor(item.z / 8), ox = item.x - (cellX + .5) * 8, oz = item.z - (cellZ + .5) * 8;
    return cellZ === 0 && Math.max(Math.abs(ox), Math.abs(oz)) >= 3.15 && Math.max(Math.abs(ox), Math.abs(oz)) <= 3.7 && Math.abs(item.y - TOWN_ROAD_TOP) < 1e-9;
  }), 'street things stand at the road\'s edge, clear of the walkers\' lanes, on the road top');
  const doors = sampleTown().homePlots.map(plot => (plot.x + .5) * 8);
  check(old.filter(item => item.z > 4).every(item => item.node === 'street-lamp' || doors.every(door => Math.abs(item.x - door) >= 1.8)), 'nothing stands in front of a door');
  const other = sampleTown(); other.seed = 9; other.tick = BigInt(8 * YEAR);
  check(JSON.stringify(townArtPlan(other).placements.filter(item => item.kind === 'street')) !== JSON.stringify(old), 'the scatter follows the town\'s seed');
  const planned = sampleTown(); planned.buildings.forEach(item => { if (item.buildingId === 'road-dirt') item.state = 'plan'; });
  check(!townArtPlan(planned).placements.some(item => item.kind === 'street'), 'a road not yet built has nothing along it');
  check(townStreetYears({tick:BigInt(10 * YEAR)}, 0, 4) === 10 && townStreetYears({tick:BigInt(10 * YEAR)}, 3, 4) === 2.5 && townStreetWear(0) === 0,
    'the first road is as old as the town and the last of four a quarter of it');
  const lone = townStreetThings({road:{x:0, z:0, groundY:0}, wear:1, seed:5, cells:new Map(), roads:new Map([['0:0', {}]])});
  check(lone.some(item => item.node === 'street-lamp'), 'an old street has its lamps');
}

// ---- Real models: the library, the levels and the moving parts ---------------------------------------------------
const loadGltf = async url => {
  const bytes = readFileSync(join(root, 'public', url));
  const loader = new GLTFLoader();
  // Node cannot decode pictures; the check is of shapes, parts and counts.
  loader.register(() => ({name:'TOWN_ART_TEST_TEXTURE', loadTexture:() => Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
};
const loadScene = url => loadGltf(url).then(result => result.scene);
const settle = () => new Promise(done => setTimeout(done, 20));
const library = createTownArtLibrary({loadModel:loadScene});
{
  const keys = [...new Set(named.map(([family, node]) => `${family}/${node.includes(':') ? node.replace(':', '#') : node}`))];
  for (let tries = 0; tries < 200 && keys.some(key => library.piece(key) === null); tries++) await settle();
  const pieces = keys.map(key => [key, library.piece(key)]), broken = pieces.filter(([, piece]) => !piece).map(([key]) => key);
  check(broken.length === 0, `every piece the view names can be drawn (not: ${broken.join(', ')})`);
  check(library.faults.length === 1 && library.faults[0].startsWith('dome/dome-gate:'), `the only export fault worked round is the Dome gate's sand banks (${library.faults.join('; ')})`);
  check(pieces.every(([, piece]) => piece.levels.far.length === 1 && piece.levels.mid.length <= piece.levels.near.length + 1),
    'far away each piece is one draw; mid way it has no more draws than near');
  const shack = library.piece('homes/shack-a');
  const tris = level => shack.levels[level].reduce((sum, part) => sum + part.triangles, 0);
  check(tris('far') < tris('near') / 2, `a far shack is a coarse copy (${Math.round(tris('far'))} triangles against ${Math.round(tris('near'))})`);
  check(library.piece('power/windmill').live.length === 1 && library.piece('water/water-tower').live.length === 3, 'the windmill rotor and the tower gauge are kept as moving parts');
  const box = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4); box.setAttribute('color', new THREE.BufferAttribute(new Float32Array(box.getAttribute('position').count * 3), 3));
  check(triangles(clusterGeometry(box, .6)) < triangles(box), 'clustering joins near corners');
}
function triangles(geometry) { return (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3; }

// ---- The town's view with the art, and the life drawn over it ----------------------------------------------------
{
  const town = sampleTown(); town.calendar = {hour:20, season:'Autumn'};
  const view = createTownScene({town, width:800, height:600, loadModel:loadScene, loadLifeModel:loadGltf, loadFxArt:{texture:async () => new THREE.Texture(), table:async () => ({size:1, frames:{flame:[{x:0, y:0, w:1, h:1}], ember:[{x:0, y:0, w:1, h:1}], smoke:[{x:0, y:0, w:1, h:1}], steam:[{x:0, y:0, w:1, h:1}]}})}});
  const camera = view.camera.userData.townView; camera.zoom = 62 / (TOWN_ZOOM.scablands - TOWN_ZOOM.street); camera.target.set(0, 0, 0);
  for (let frame = 0; frame < 300 && !(view.artStats().instances > 20 && view.artStats().waiting === 0); frame++) { view.step(.05); await settle(); }
  view.step(.3); view.step(.3);
  const stats = view.artStats();
  check(stats.instances > 20 && stats.waiting === 0, `the town is drawn from its art (${stats.instances} pieces in ${stats.drawCalls} draws)`);
  check(!view.state.buildings.getObjectByName('Town art')?.children.some(mesh => /^Town [0-9a-f]+ (near|mid|far)$/.test(mesh.name)), 'no box is drawn for a building');
  check(view.state.fx.stats().rotors >= 1 && view.state.fx.stats().chimneys >= 1, 'the windmill turns and the homes smoke: town-fx.js finds their parts');
  check(view.state.artLibrary.lit === true, 'at eight in the evening the lamps are lit');
  view.setCalendar({season:'Autumn'}, {hour:12});
  check(view.state.artLibrary.lit === false, 'at noon they are not');
  const rect = {left:0, top:0, width:800, height:600};
  let picked = null;
  for (let y = 120; y < 600 && !picked; y += 20) for (let x = 0; x < 800 && !picked; x += 20) {
    const hit = view.pick(x, y, rect); if (hit?.type === 'building') picked = hit;
  }
  check(picked?.building && typeof picked.building.id === 'string', 'clicking a drawn building finds its record');
  view.dispose();
}

// ---- Drawn with or without its art, a town steps the same --------------------------------------------------------
{
  const make = () => {
    const town = createTown(31, 'Art Proof', []);
    for (let x = -4; x <= 4; x++) dispatchTownCommand(town, {type:'placeBuilding', buildingId:'road-dirt', x, z:6});
    for (const [buildingId, x] of [['hand-well', -3], ['windmill', -1], ['latrine', 1], ['chicken-run', 3]]) dispatchTownCommand(town, {type:'placeBuilding', buildingId, x, z:7});
    for (const item of town.buildings) item.state = 'finished';
    dispatchTownCommand(town, {type:'igniteTownFire', buildingId:town.buildings.find(item => item.buildingId === 'windmill').id});
    return town;
  };
  const plain = make(), drawn = make();
  const view = createTownScene({town:drawn, width:640, height:480, loadModel:loadScene, loadLifeModel:loadGltf});
  for (let tick = 0; tick < 120; tick++) {
    stepTown(plain, []); stepTown(drawn, []);
    view.step(.1); view.update();
    if (tick % 20 === 0) await settle();
  }
  check(view.artStats().instances > 0, 'the drawn town was drawn while it stepped');
  check(serializeTown(drawn) === serializeTown(plain), 'a town drawn with its art steps to the same state as one drawn without it');
  view.dispose();
}

// ---- Cost: towns of 500 and of 5,000 -----------------------------------------------------------------------------
function costTown(count, seed) {
  // Blocks five cells deep: a road, a row of homes facing it, then three rows of everything else, packed in order.
  const kinds = BUILDINGS.filter(row => !/^(road|pipe|wire|sewer)-/.test(row.id) && !TOWN_LINE_ART[row.id] && row.depth <= 3);
  const town = {seed, tick:BigInt(6 * YEAR), buildings:[], homePlots:[], book:[], regions:{scablands:{chunks:{}}}};
  const half = 40;
  let things = 0, block = 0, next = 0;
  while (things < count) {
    const z = block * 5;
    for (let x = -half; x < half; x++) building(town, ['road-dirt', 'road-plank', 'road-paved'][block % 3], x, z);
    for (let x = -half; x < half && things < count; x++, things++) town.homePlots.push({id:`plot-${block}-${x}`, regionId:'scablands', x, z:z + 1, tier:1 + (x * 7 + block * 3 & 1023) % 5, groundY:0});
    for (let x = -half; x < half && things < count;) {
      const row = kinds[next++ % kinds.length];
      if (x + row.width > half) break;
      // Six in ten are small: homes' neighbours are wells, latrines and coops more often than town halls.
      const small = next % 10 < 6 ? BUILDINGS.find(item => item.id === ['latrine', 'hand-well', 'chicken-run', 'compost-heap', 'standpipe', 'windmill'][next % 6]) : row;
      building(town, small.id, x, z + 2); x += small.width; things++;
    }
    block++;
  }
  return town;
}
function cost(town, zoom) {
  const group = new THREE.Group(), drawing = createTownArtDrawing({library, parent:group});
  const camera = createTownCamera({width:1920, height:1080, target:{x:0, y:0, z:Math.min(60, town.buildings.at(-1).z * 4)}, zoom});
  const distance = camera.position.distanceTo(camera.userData.townView.target), fogFar = Math.max(260, distance * 1.35);
  const started = performance.now(), plan = townArtPlan(town, {world:false}).placements, planMs = performance.now() - started;
  drawing.setPlan(plan);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const drawStart = performance.now(); drawing.update({viewer:camera.position, camera, fogFar, dt:1}); const drawMs = performance.now() - drawStart;
  const stats = drawing.stats(); drawing.dispose();
  return {...stats, placements:plan.length, planMs, drawMs, distance:Math.round(distance)};
}
const mayor = 62 / (TOWN_ZOOM.scablands - TOWN_ZOOM.street), high = .03;
const small = costTown(500, 3), big = costTown(5000, 3);
// The same town with 15,000 more homes and works 3 km away, past the fog of the mayor's camera.
const huge = {...big, buildings:[...big.buildings], homePlots:[...big.homePlots]};
for (let index = 0; index < 15000; index++) {
  const x = index % 120 - 60, z = 400 + Math.floor(index / 120);
  if (index % 2) huge.homePlots.push({id:`far-${index}`, regionId:'scablands', x, z, tier:1 + index % 5, groundY:0});
  else building(huge, ['latrine', 'hand-well', 'tavern', 'forge'][index % 4], x, z);
}
for (const town of [small, big]) for (const key of new Set(townArtPlan(town, {world:false}).placements.map(item => item.key))) library.piece(key);
for (let tries = 0; tries < 200 && [...library.families.values()].some(entry => entry.status === 'loading'); tries++) await settle();
const rows = [];
for (const [label, town] of [['500', small], ['5,000', big]]) for (const [view, zoom] of [['mayor', mayor], ['high', high]]) rows.push({label, view, ...cost(town, zoom)});
for (const row of rows) console.log(`  A town of ${row.label} (${row.placements} pieces with its street things), ${row.view} camera ${row.distance} m out: ${row.drawCalls} draw calls, ${row.triangles.toLocaleString('en')} triangles, ${row.instances} pieces drawn; plan ${row.planMs.toFixed(1)} ms, instance lists ${row.drawMs.toFixed(1)} ms.`);
const [smallMayor, smallHigh, bigMayor, bigHigh] = rows, hugeMayor = cost(huge, mayor);
check(hugeMayor.drawCalls === bigMayor.drawCalls && hugeMayor.triangles === bigMayor.triangles, 'only what is in view is drawn: 15,000 more buildings out of sight cost nothing');
check(bigHigh.drawCalls <= smallHigh.drawCalls * 1.5 + 60, 'from high up, draws follow the kinds of thing in view, not how many there are');
check(smallMayor.drawCalls > 0 && bigHigh.instances > smallHigh.instances, 'both towns are drawn');
check(TOWN_ART_BANDS.near < TOWN_ART_BANDS.mid, 'the levels change in order');
library.dispose();

console.log(`Town view art checks passed (${checks} checks): every building has its art from its family, the plan reads only the town, homes vary, ruins and street wear follow the town, a drawn town steps the same, and what is out of sight costs nothing.`);
