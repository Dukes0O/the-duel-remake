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
for (let i = 1; i <= 60; i++) rendered(i / 60);
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
