import assert from 'node:assert/strict';
import {createJobSolidGrid} from '../src/world/scablands-solids.js';
import {sweepObstacle} from '../src/collision.js';
import {advanceStoryPeople, attendTo, createStoryPeople, setStoryPersonAction, walkerGroupAt} from '../src/world/jobs/story-people.js';

const flat = () => 0;
const cast = createStoryPeople(walkerGroupAt({x: 0, y: 0, z: 0}, 0, flat));
const [rell, dace, wim] = cast;
assert.equal(cast.length, 11);
assert.ok(new Set(cast.map(p => p.position.z)).size > 6);
assert.ok(rell.height > dace.height && dace.height > wim.height);
assert.ok(rell.radius > dace.radius && dace.radius > wim.radius);

const facing = {yaw: 0, headYaw: 0};
for (let i = 0; i < 60; i++) attendTo(rell, facing, {x: 0, z: -10}, 1 / 60);
assert.ok(Math.abs(facing.yaw - Math.PI) < .001, 'Even an about-turn finishes in one second');
for (let i = 0; i < 60; i++) attendTo(rell, facing, {x: 5, z: rell.position.z}, 1 / 60);
assert.ok(Math.abs(facing.yaw - Math.PI / 2) < .001, 'Speaker tracks the player after the player moves');
for (const action of ['sit', 'sleep', 'stand']) {
  setStoryPersonAction(wim, action);
  assert.equal(wim.action, action);
  const before = {...wim.position};
  advanceStoryPeople(cast, 1, flat);
  assert.deepEqual(wim.position, before);
}

const finish = {x: 11, z: 8};
for (const action of ['walk', 'run', 'push-cart']) {
  setStoryPersonAction(dace, action, [{x: 2, z: 3}, finish]);
  assert.equal(dace.action, action);
  advanceStoryPeople(cast, 1 / 60, flat);
  assert.equal(dace.action, action);
  advanceStoryPeople(cast, 60, flat);
  assert.equal(dace.action, 'stand');
  assert.deepEqual(dace.position, {...finish, y: 0});
}
const grid = createJobSolidGrid({near: () => []});
grid.setPeople([{id: 'auntie', position: {x: 8, z: 2}}]);
grid.setStoryPeople(cast);
const obstacle = grid.near(0, 0, 0, 5).find(s => s.id === 'rell');
for (const body of [{halfWidth: 1, halfLength: 2, height: 1.5},
                    {halfWidth: .3, halfLength: .3, height: 1.8}]) {
  const hit = sweepObstacle({x: 0, y: 0, z: -8}, {x: 0, y: 0, z: 8}, obstacle, 0, body);
  assert.ok(hit && hit.t < .5, 'The car and foot sweeps meet Rell before their centre reaches her');
}
grid.setStoryPeople([]);
assert.deepEqual(grid.near(0, 0, 0, 5).map(s => s.id), ['auntie']);
console.log('Story people: group, turning, actions and solid sweeps passed.');

const THREE = await import('three');
const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
const {readFile} = await import('node:fs/promises');
const {createStoryPeopleView} = await import('../src/world/story-people-view.js');
async function loadRealAsset(path) {
  const bytes = await readFile(new URL('../public' + path, import.meta.url));
  const loader = new GLTFLoader();
  // Node does not decode embedded JPEGs. Exercise the real geometry and rig.
  loader.register(() => ({name:'TEST_TEXTURE', loadTexture:() => Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const view = createStoryPeopleView(loadRealAsset);
const namedCast = createStoryPeople([...walkerGroupAt({x:0,y:0,z:0}, 0),
  ...['auntie-solder','cinder','clinker'].map((id, i) => ({id, position:{x: 3+i, y:0, z:0}}))]);
const job = {storyPeople: namedCast, storySpeaker:'rell'};
const observer = {x:0, z:6};
view.update(job, observer, 0);
await view.group.userData.ready;
assert.ifError(view.group.userData.loadError);
assert.equal(view.group.children.length, 14);
const rendered = t => { view.update(job, observer, t); view.group.updateMatrixWorld(true); };
const anchor = id => view.group.getObjectByName('story-bubble-' + id).getWorldPosition(new THREE.Vector3());
function countPlacedSpeakerAnchors() {
  let count = 0;
  const point = new THREE.Vector3();
  view.group.traverseVisible(node => {
    if (!node.name.startsWith('story-bubble-')) return;
    const id = node.name.slice('story-bubble-'.length);
    const person = namedCast.find(p => p.id === id);
    node.getWorldPosition(point);
    assert.ok(Math.hypot(point.x - person.position.x, point.z - person.position.z) <= person.radius,
      id + ' must be at its job position before the dialogue camera can see its head');
    count++;
  });
  return count;
}
// An asynchronous load can finish between the camera's lookup and the next scene update.
countPlacedSpeakerAnchors();
rendered(1 / 60);
assert.equal(countPlacedSpeakerAnchors(), namedCast.length);
for (let i = 2; i <= 60; i++) rendered(i / 60);
const standing = anchor('wim');
assert.ok(standing.y > 1.2 && standing.y < 1.4, 'Wim’s own bubble is above her standing head');
assert.ok(anchor('rell').y > anchor('dace').y && anchor('dace').y > standing.y);
const trail = anchor('rell');
observer.x = 3;
for (let i = 61; i <= 120; i++) rendered(i / 60);
assert.ok(trail.distanceTo(anchor('rell')) > .001, 'A speaking head moves on its rig');
setStoryPersonAction(namedCast[2], 'sleep');
for (let i = 121; i <= 240; i++) rendered(i / 60);
assert.ok(anchor('wim').y < standing.y - .19, 'Bubble follows Wim down to the fence');
for (const person of namedCast.slice(0,11)) {
  const group = view.group.getObjectByName('story-person-' + person.id);
  const skins = [];
  group.traverse(n => { if (n.isSkinnedMesh) skins.push(n); });
  assert.equal(skins.length, 1, 'one skinned draw for ' + person.id);
  assert.equal(skins[0].geometry.groups.length, 0);
  assert.ok(skins[0].skeleton.bones.length >= 17);
  const neutral=skins[0].skeleton.bones.findIndex(b=>b.name==='neutral_bone');
  if (neutral>=0) {
    const {skinIndex:joint,skinWeight:weight}=skins[0].geometry.attributes;
    for (let i=0;i<joint.count;i++) for (let slot=0;slot<4;slot++)
      assert.ok(joint.getComponent(i,slot)!==neutral || weight.getComponent(i,slot)<.001,
        person.id+' has a garment vertex left behind by the moving fighter rig');
  }
}
for (const id of ['auntie-solder','clinker']) {
  const actor = view.group.getObjectByName('story-person-' + id);
  const here = actor.getWorldPosition(new THREE.Vector3());
  let clothing = 0;
  actor.traverse(node => {
    if (!node.isSkinnedMesh) return;
    const bounds = new THREE.Box3().setFromObject(node, true);
    assert.ok(bounds.min.x > here.x-.65 && bounds.max.x < here.x+.65,
      id + ' wears each bound garment at her or his position');
    clothing++;
  });
  assert.ok(clothing >= 2);
}
const runner = namedCast[1];
setStoryPersonAction(runner, 'run', [{x:3, z:20}]);
for (let i = 0; i < 20; i++) {
  runner.distance = runner.height * 1.42 * i / 20;
  rendered(4 + i / 60);
  const group = view.group.getObjectByName('story-person-dace');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(group,true).min.y) < .015,
    'The sole of the supporting running boot stays on the ground');
}
// Each rigid pair of handles fits the hands on its own carter, including
// the tallest and narrowest bodies. Check flesh on the actual exported rig.
for (const id of ['walker-1','walker-3','walker-6','walker-8']) {
  const person = namedCast.find(p=>p.id===id);
  setStoryPersonAction(person,'push-cart',[{x:0,z:20}]);
  for (let i=0;i<70;i++) rendered(5+i/60);
  const actor = view.group.getObjectByName('story-person-'+id);
  const skin = actor.getObjectByProperty('isSkinnedMesh',true);
  const cart = view.group.getObjectByName('story-handcart-'+id);
  const {spread,height,back} = cart.userData.grip;
  const indices=skin.geometry.attributes.skinIndex, weights=skin.geometry.attributes.skinWeight;
  const palm = skin.skeleton.bones.map((b,i)=>/hand/.test(b.name)?i:-1).filter(i=>i>=0);
  const samples=[];
  for (let i=0;i<indices.count;i++) {
    if ([0,1,2,3].some(slot=>weights.getComponent(i,slot)>.35 && palm.includes(indices.getComponent(i,slot)))) samples.push(i);
  }
  const point = new THREE.Vector3(), closest = new THREE.Vector3();
  for (let phase=0;phase<12;phase++) {
    person.distance=person.height*.86*phase/12;
    rendered(7+phase/60);
    for (const hand of [-1,1]) {
      const grip=new THREE.Line3(new THREE.Vector3(hand*spread,height,back),new THREE.Vector3(hand*spread,height+.01,back-.11));
      let minimum=Infinity;
      for (const vertex of samples) {
        skin.getVertexPosition(vertex,point).applyMatrix4(skin.matrixWorld);
        cart.worldToLocal(point);
        minimum=Math.min(minimum,point.distanceTo(grip.closestPointToPoint(point,true,closest)));
      }
      assert.ok(minimum<.045,id+' keeps a hand on the iron grip throughout its stride');
    }
  }
}
if (process.argv.includes('--measure')) {
  const twelve = createStoryPeople([...walkerGroupAt({x:0,y:0,z:0},0),
    {id:'auntie-solder',position:{x:3,y:0,z:-1}}]);
  const timingJob = {storyPeople:twelve,storySpeaker:'rell'};
  view.update(timingJob,{x:0,z:20.4},0);
  await view.group.userData.ready;
  assert.ifError(view.group.userData.loadError);
  const samples = [];
  const viewer = {x:0,z:20.4};
  for (let i = 0; i < 700; i++) {
    const start = performance.now();
    view.update(timingJob,viewer,i/60);
    view.group.updateMatrixWorld(true);
    if (i>=100) samples.push(performance.now()-start);
  }
  samples.sort((a,b)=>a-b);
  console.log('Cloud CPU only, twelve visible people with four carts at 20 m, warmed 600-frame pose and scene transforms: '+
    'median '+samples[300].toFixed(3)+' ms, p95 '+samples[569].toFixed(3)+' ms (drawing and GPU time excluded).');
}
view.update({}, observer, 5);
assert.equal(view.group.children.length, 0);
assert.equal(view.group.getObjectByName('story-bubble-wim'), undefined);
view.dispose();
console.log('Story people: every actual figure loads, and the photographed Walkers use one draw and a moving crown each.');

const {Duel} = await import('../src/game.js');
const {placeActor} = await import('../src/arena/arena-event.js');
const {createFighter, stepFighter} = await import('../src/onfoot.js');
const {scablandsSurfaceHeightAt} = await import('../src/world/scablands-ground.js');
const {roadPointFrom, ROAD_NET} = await import('../src/world/scablands-road.js');
const {LAND} = await import('../src/world/scablands-names.js');
const site = roadPointFrom(ROAD_NET.road('east-road'),LAND.yard.x,LAND.yard.z,500);
const stop = {x:site.x,y:scablandsSurfaceHeightAt(site.x,site.z),z:site.z};
const duel = new Duel({seed:19,featureFlags:{'hidden-road':true,'story-everburn':true}});
duel.state.wastelandGateDiscovered = true;
const demo = {id:'test-stop-at-the-gate', storyPeople:[{id:'rell',position:stop}],
  steps:[{kind:'reach',place:{id:'end',position:{...stop,z:stop.z+500}}}]};
assert.equal(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',opponents:[],seed:19,job:demo}), true);
const near = (offset) => duel.course.nearest(stop.x,stop.z+offset);
const before = near(-10), beyond = near(10);
placeActor(duel,duel.state,{...beyond,headingError:-duel.course.at(beyond.s).heading},25);
duel.state.prevS = before.s;
duel.state.prevLateral = before.lateral;
duel._staticContacts(duel.state,true);
const stopped = duel.course.worldAt(duel.state.s,duel.state.lateral);
assert.ok(stopped.z < stop.z - 1 && stopped.z > stop.z - 5, 'Actual player car stopped short of Rell');
const walker = createFighter(duel.course,duel.state,{...near(-2),yaw:0});
for (let i=0;i<160;i++) stepFighter(duel.course,duel.state,walker,{forward:true},1/120);
assert.ok(walker.z < stop.z -.35 && walker.z > stop.z - 1.4, 'Actual player walker stopped at the figure');
assert.deepEqual(duel.state.arena.worldJob.storyPeople[0].position,stop);
console.log('Story people: the game car and a fighter on foot both stop short in the real world job.');

const tinTasks = {
  odessa:['weld','inspect','carry'], moss:['scrub','carry-bucket','sit'],
  'tin-cook':['cook','haul-sack','sit','sleep'], 'tin-porter':['cook','haul-sack','sit','sleep'],
  'tin-child':['cook','haul-sack','sit','sleep'],
};
const {STORY_FIGURES} = await import('../src/world/jobs/story-people.js');
const townView = createStoryPeopleView(loadRealAsset);
const residents = createStoryPeople(Object.keys(tinTasks).map((id,x) => ({id,position:{x,y:0,z:0}})));
const townJob = {storyPeople:residents};
townView.update(townJob, observer, 0);
await townView.group.userData.ready;
assert.ifError(townView.group.userData.loadError);
let clock = 0;
for (const person of residents) {
  const {height,pace} = STORY_FIGURES[person.id];
  assert.ok(height >= 1 && height <= 2 && pace >= .8 && pace <= 1.7);
  const actor = townView.group.getObjectByName('story-person-'+person.id);
  assert.ok(actor.getObjectByName('skin-'+person.id));
  const arm = actor.getObjectByName('upper_armR') ?? actor.getObjectByName('upper_arm.R');
  const rotations = new Set();
  for (const task of ['stand', ...tinTasks[person.id]]) {
    setStoryPersonAction(person,task);
    townView.update(townJob,observer,++clock);
    if (task === 'sleep') {
      for (let frame = 0; frame < 45; frame++) townView.update(townJob,observer,clock += 1/60);
      actor.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(actor.getObjectByName('skin-'+person.id), true);
      const extent = bounds.getSize(new THREE.Vector3());
      assert.ok(Math.max(extent.x,extent.z) > extent.y*1.5, person.id+' rests on one side');
      assert.ok(Math.abs(bounds.min.y) < .04, person.id+' rests on the ground, lowest vertex '+bounds.min.y);
    }
    rotations.add(arm.quaternion.toArray().map(n=>n.toFixed(3)).join());
    if (!['stand','inspect','sit','sleep'].includes(task)) {
      const props = [];
      actor.traverseVisible(node => { if (node.name.startsWith(person.id+'_'+task+'_')) props.push(node); });
      assert.ok(props.length, person.id+' holds the tool for '+task);
    }
  }
  assert.equal(rotations.size, tinTasks[person.id].length+1, person.id+' has distinct working poses');
}
townView.dispose();
// OPEN-FIGURES-2. Load through the same shared view and exercise the actual skinned hands.
const {createFeatureFlags} = await import('../src/feature-flags.js');
assert.equal(createFeatureFlags({qa:false, storage:null, search:'?flags=story-choices'}).enabled('story-choices'), false);
const openIds = ['marigold','finch','grower-1','grower-2','grower-3','hetty','bern','sump','road-rat-lamp','road-rat-lookout'];
const openCast = createStoryPeople(openIds.map((id, i) => ({id, position:{x:i*1.35, y:0, z:0}})));
const assetRequests = [];
const workers = createStoryPeopleView(path => { assetRequests.push(path); return loadRealAsset(path); });
const openJob = {storyPeople:openCast}, eye = {x:5, z:20};
let workClock = 0;
function drawWork(dt = 1/60) {
  workers.update(openJob, eye, workClock += dt);
  workers.group.updateMatrixWorld(true);
}
drawWork();
await workers.group.userData.ready;
assert.ifError(workers.group.userData.loadError);
drawWork();
assert.deepEqual(assetRequests, ['/assets/models/wasteland/scablands/open-figures-2.glb']);
const actorFor = person => workers.group.getObjectByName('story-person-'+person.id);
const skinFor = person => actorFor(person).getObjectByName('skin-'+person.id);
function palmAt(person, side) {
  const skin = skinFor(person), {position,skinIndex,skinWeight} = skin.geometry.attributes;
  const centre = new THREE.Vector3(), vertex = new THREE.Vector3();
  let count = 0;
  for (let i=0; i<position.count; i++) {
    if (skin.skeleton.bones[skinIndex.getX(i)].name !== 'hand'+side || skinWeight.getX(i) < .8) continue;
    centre.add(skin.getVertexPosition(i,vertex).applyMatrix4(skin.matrixWorld));
    count++;
  }
  assert.ok(count > 0, person.id+' has weighted palm vertices');
  return centre.divideScalar(count);
}
function visibleTools(name) {
  const found = [];
  workers.group.traverseVisible(node => { if (node.name === 'implement-'+name) found.push(node); });
  return found;
}
const toPath = person => [{x:person.position.x, z:person.position.z+3}];
for (const person of openCast) {
  const skin = skinFor(person);
  assert.ok(skin.isSkinnedMesh && skin.skeleton.bones.length >= 17 && skin.material.map, person.id+' is a dressed rig');
  const bounds = new THREE.Box3().setFromObject(skin,true);
  assert.ok(Math.abs(bounds.min.y)<.02 && Math.abs(bounds.max.y-person.height)<.05);
  assert.ok(person.height > 1.2 && person.height < 2 && STORY_FIGURES[person.id].pace > .8 && STORY_FIGURES[person.id].pace < 2);
  setStoryPersonAction(person,'walk',toPath(person));
}
advanceStoryPeople(openCast,.32,flat);
drawWork();
assert.ok(openCast.every(p=>p.distance>0 && p.position.z>0));
for (const person of openCast) setStoryPersonAction(person,'stand');
const [marigold,finch,...rest] = openCast;
const growers = rest.slice(0,3), sump = openCast[7], lamp = openCast[8], lookout = openCast[9];
assert.ok(finch.height < Math.min(...openCast.filter(p=>p!==finch).map(p=>p.height)));
setStoryPersonAction(marigold,'hands-on-hips');
setStoryPersonAction(sump,'hold-ledger');
setStoryPersonAction(lamp,'carry-lamp',toPath(lamp));
setStoryPersonAction(lookout,'lookout');
drawWork();
const localPalm = (p, side) => actorFor(p).worldToLocal(palmAt(p,side));
for (const [side,sign] of [['L',-1],['R',1]]) {
  const hand = localPalm(marigold,side);
  assert.ok(sign*hand.x > .19 && sign*hand.x < .31 && hand.y > .53*marigold.height && hand.y < .66*marigold.height,
    'Both hands reach the sides of Marigold’s waist');
}
assert.ok(localPalm(sump,'L').y > .60*sump.height, 'Sump folds an arm under the ledger');
assert.ok(localPalm(lookout,'R').y > .91*lookout.height, 'The lookout shades the eyes');
assert.ok(visibleTools('lamp')[0].getWorldPosition(new THREE.Vector3()).distanceTo(palmAt(lamp,'R')) < .025);
assert.equal(visibleTools('mantle').length,1);
for (const i of [0,1,2]) {
  const hoe = growers[i], bound = growers[(i+1)%3], seated = growers[(i+2)%3];
  setStoryPersonAction(hoe,'hoe');
  setStoryPersonAction(bound,'walk-tied',toPath(bound));
  setStoryPersonAction(seated,'sit');
  const before = {...bound.position};
  advanceStoryPeople(openCast,.15,flat);
  let low = Infinity, high = -Infinity;
  for (let frame=0;frame<32;frame++) {
    drawWork(.1);
    const tool = visibleTools('hoe')[0];
    const blade = new THREE.Box3().setFromObject(tool,true).min.y;
    low = Math.min(low,blade);
    high = Math.max(high,blade);
  }
  assert.ok(high-low > .14 && low < .19, hoe.id+' lowers and lifts the hoe');
  const tool = visibleTools('hoe')[0];
  assert.ok(tool.getWorldPosition(new THREE.Vector3()).distanceTo(palmAt(hoe,'L')) < .03);
  const shaft = new THREE.Line3(tool.localToWorld(new THREE.Vector3(0,-.96,0)), tool.localToWorld(new THREE.Vector3(0,.63,0)));
  const topHand = palmAt(hoe,'R');
  assert.ok(shaft.closestPointToPoint(topHand,true,new THREE.Vector3()).distanceTo(topHand) < .03);
  assert.ok(bound.position.z>before.z && localPalm(bound,'L').z>.11 && localPalm(bound,'R').z>.11);
  const ties = visibleTools('ties')[0];
  assert.ok(ties.getWorldPosition(new THREE.Vector3()).distanceTo(palmAt(bound,'L')) < .03);
  assert.ok(ties.localToWorld(new THREE.Vector3(1,0,0)).distanceTo(palmAt(bound,'R')) < .03);
  assert.ok(palmAt(bound,'R').distanceTo(palmAt(bound,'L')) < .22, bound.id+' walks with both wrists together');
  assert.ok(new THREE.Box3().setFromObject(skinFor(seated),true).max.y < seated.height-.15);
}
// All three can take either end. Each pair walks with one pane, even when ids and placement order disagree.
for (const i of [0,1,2]) {
  for (const person of growers) setStoryPersonAction(person,'stand');
  const a = growers[i], b = growers[(i+1)%3];
  Object.assign(a.position,{x:2,y:0,z:0});
  Object.assign(b.position,{x:3.35,y:0,z:0});
  a.framePartner = b.id;
  b.framePartner = a.id;
  for (const p of [a,b]) setStoryPersonAction(p,'carry-frame',toPath(p));
  advanceStoryPeople(openCast,.3,flat);
  drawWork(.1);
  assert.equal(a.position.z,b.position.z);
  assert.equal(visibleTools('frame').length,1);
  assert.equal(visibleTools('glass').length,1);
  const frame = visibleTools('frame')[0];
  assert.ok(frame.getWorldPosition(new THREE.Vector3()).distanceTo(palmAt(a,'R')) < .03);
  assert.ok(frame.localToWorld(new THREE.Vector3(1,0,0)).distanceTo(palmAt(b,'L')) < .03);
  setStoryPersonAction(b,'stand');
  drawWork();
  assert.equal(visibleTools('frame').length,0);
}
workers.dispose();
console.log('Open Scablands figures: ten photographed rigs, work poses, grounded tools and a shared carried windscreen passed.');
