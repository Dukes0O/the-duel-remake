import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVehicleAttachmentRegistry} from '../src/vehicle-attachments.js';
import {createArmorKitMeshes} from '../src/armor-kit-meshes.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
const makeVehicle = id => {
  const car = new THREE.Group();
  car.userData.vehicleKey = id;
  car.userData.size = {width: 2.6, length: 4.8, height: 1.55};
  return car;
};
const seen = node => {
  for (let item = node; item; item = item.parent) if (!item.visible) return false;
  return !!node;
};
function authoredScene() {
  const scene = new THREE.Group();
  scene.name = 'authored-kit';
  const add = (parent, name) => {const node = new THREE.Group();node.name = name;parent.add(node);return node;};
  const scrapper = add(scene, 'kit-scrapper');
  for (const name of ['kit-bull-bar','kit-stack-0','kit-stack-1',
    'kit-plate-0','kit-plate-1','kit-plate-2','kit-plate-3']) add(scrapper, name);
  const raider = add(scene, 'kit-raider');
  for (const name of ['kit-cage','kit-saw-0','kit-saw-1','kit-turret-mount']) add(raider,name);
  const warlord = add(scene, 'kit-warlord');
  for (const name of ['kit-crown','kit-full-plating','kit-warlord-mount']) add(warlord,name);
  return scene;
}
function fixture() {
  const cars = ['falcone_f42','aurora_gt','titan_monster','viper_proto'].map(makeVehicle);
  const opponents = [
    {s: 101, lateral: 0, armor: 90, maxArmor: 100, combatArmorKit:'raider'},
    {s: 102, lateral: 0, armor: 40, maxArmor: 100, combatArmorKit:'warlord'},
    {s: 103, lateral: 0, armor: 8, maxArmor: 100, combatArmorKit:'scrapper'},
  ];
  const state = {s:100,lateral:0,armor:100,maxArmor:100,combatArmorKit:'scrapper',
    mode:'wasteland',status:'racing',stageTimeSec:1,combat:{},opponents};
  const duel = {state,course:{groundAt:()=>({x:0,y:0,z:0})},
    featureFlags:{enabled:key=>key==='wasteland2'}};
  const vehicles = {player:cars[0],rival:cars[1],extraOpponents:cars.slice(2).map(mesh=>({mesh}))};
  return {cars,state,duel,vehicles};
}

test('authored kits follow four actors, tiers and damage without mutating simulation', async () => {
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry,{loadKitAsset: async () => ({scene:authoredScene()})});
  const {cars,state,duel,vehicles} = fixture();
  try {
    const before = structuredClone(state);
    kits.update(duel,vehicles,true);
    await tick(); await tick();
    kits.update(duel,vehicles,true);
    assert.deepEqual(state,before,'presentation cannot change race state');
    cars.forEach((car,index)=>assert.ok(car.getObjectByName('authored-kit'),`actor ${index} missing authored kit`));
    assert.equal(seen(cars[0].getObjectByName('kit-scrapper')),true);
    assert.equal(seen(cars[0].getObjectByName('kit-raider')),false);
    assert.equal(seen(cars[1].getObjectByName('kit-raider')),true);
    assert.equal(seen(cars[1].getObjectByName('kit-warlord')),false);
    assert.equal(seen(cars[2].getObjectByName('kit-warlord')),true);
    state.armor = 55; state.stageTimeSec = 2;
    const damaged = structuredClone(state);
    kits.update(duel,vehicles,true);
    assert.deepEqual(state,damaged);
    assert.equal(seen(cars[0].getObjectByName('kit-plate-0')),false,
      'damaged plate leaves the fitted shell');
    const dropped = kits.group.getObjectByName('armor-kit-0-loose-0');
    assert.equal(seen(dropped),true,'crossing the armor threshold drops a plate');
    assert.ok([dropped.position.x,dropped.position.y,dropped.position.z]
      .every(Number.isFinite),'dropped plate has a finite world location');
    state.stageTimeSec = 3.6;
    kits.update(duel,vehicles,true);
    assert.equal(seen(dropped),false,'loose plate expires after its short lifetime');
    state.combatWrecking = true; state.armor = 0;
    kits.update(duel,vehicles,true);
    assert.equal(seen(cars[0].getObjectByName('kit-scrapper')),true,
      'wreck retains a visible scorched shell');
    assert.equal(seen(cars[0].getObjectByName('kit-plate-0')),false);
    assert.equal(seen(cars[0].getObjectByName('armor-kit-0-bull-bar')),false,
      'authored kit must replace visible primitive fallback');
  } finally { kits.dispose(); }
  assert.equal(registry.size,0);
});

test('late kit loads cannot attach to a replaced vehicle or disposed scene', async () => {
  const requests = [];
  const loadKitAsset = car => new Promise(resolve => requests.push({car,resolve}));
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry,{loadKitAsset});
  const {cars,duel,vehicles} = fixture();
  kits.update(duel,vehicles,true);
  assert.ok(requests.some(item=>item.car==='falcone_f42'));
  const old = cars[0], next = makeVehicle('koenigsegg_jesko');
  kits.detachVehicle(old); vehicles.player = next;
  kits.update(duel,vehicles,true);
  requests.find(item=>item.car==='falcone_f42').resolve({scene:authoredScene()});
  await tick(); await tick();
  assert.equal(old.getObjectByName('authored-kit'),undefined);
  assert.equal(next.getObjectByName('authored-kit'),undefined,
    'a prior car response cannot skin the replacement');
  assert.ok(requests.some(item=>item.car==='koenigsegg_jesko'));
  kits.dispose();
  for (const item of requests) item.resolve({scene:authoredScene()});
  await tick(); await tick();
  assert.equal(next.getObjectByName('authored-kit'),undefined);
  assert.equal(registry.size,0);
});

test('flag-off, ordinary race and unequipped player never show authored kits', async () => {
  const registry=createVehicleAttachmentRegistry();
  const kits=createArmorKitMeshes(registry,{loadKitAsset:async()=>({scene:authoredScene()})});
  const {cars,state,duel,vehicles}=fixture();
  try {
    state.combatArmorKit=null;
    kits.update(duel,vehicles,true);await tick();await tick();kits.update(duel,vehicles,true);
    assert.equal(!!cars[0].getObjectByName('authored-kit')&&seen(cars[0].getObjectByName('authored-kit')),false);
    assert.equal(seen(cars[1].getObjectByName('kit-scrapper')),true);
    duel.featureFlags.enabled=()=>false;kits.update(duel,vehicles,true);
    assert.equal(cars.some(car=>car.getObjectByName('authored-kit')&&seen(car.getObjectByName('authored-kit'))),false);
    duel.featureFlags.enabled=()=>true;state.mode='duel';kits.update(duel,vehicles,true);
    assert.equal(cars.some(car=>car.getObjectByName('authored-kit')&&seen(car.getObjectByName('authored-kit'))),false);
  } finally {kits.dispose();}
});

test('critical and wrecked authored kits change appearance without tinting peers or cached art', async () => {
  const source=authoredScene();
  const metal=new THREE.MeshStandardMaterial({color:0x999999,roughness:.55});
  const shell=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),metal);
  shell.name='kit-shell-surface';
  source.getObjectByName('kit-full-plating').add(shell);
  const crown=new THREE.Mesh(new THREE.BoxGeometry(.2,.3,.2),metal);
  crown.name='kit-crown-surface';source.getObjectByName('kit-crown').add(crown);
  const baseColor=metal.color.clone();
  const registry=createVehicleAttachmentRegistry();
  const kits=createArmorKitMeshes(registry,{loadKitAsset:async()=>({scene:source})});
  const {cars,state,duel,vehicles}=fixture();
  state.combatArmorKit='warlord';
  state.opponents[0].combatArmorKit='warlord';
  try {
    kits.update(duel,vehicles,true);await tick();await tick();kits.update(duel,vehicles,true);
    const playerShell=cars[0].getObjectByName('kit-shell-surface');
    const peerShell=cars[1].getObjectByName('kit-shell-surface');
    assert.ok(playerShell?.isMesh&&peerShell?.isMesh);
    const peerColor=peerShell.material.color.clone();
    assert.ok(seen(playerShell)&&seen(peerShell));
    state.armor=8;state.stageTimeSec=2;kits.update(duel,vehicles,true);
    assert.ok(playerShell.material.color.r<baseColor.r*.8,
      'critical authored metal should look scorched');
    assert.ok(peerShell.material.color.equals(peerColor),
      'one damaged actor cannot tint an intact opponent');
    assert.ok(metal.color.equals(baseColor),
      'cached source material cannot be changed by a live actor');
    state.combatWrecking=true;state.armor=0;kits.update(duel,vehicles,true);
    assert.ok(seen(playerShell),'wreck leaves a visible authored shell');
    assert.equal(seen(cars[0].getObjectByName('kit-crown')),false,
      'wrecked crown no longer sits pristine on the shell');
    assert.ok(peerShell.material.color.equals(peerColor));
    assert.ok(metal.color.equals(baseColor));
  } finally {kits.dispose();}
});

test('dropped authored plate starts at its fitted surface and retains its shape', async () => {
  const source = authoredScene();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    1.1, .6, -.8, 1.15, 1.1, -.7, 1.2, .7, .3,
  ], 3));
  const surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  surface.name = 'bent-authored-plate';
  // Production uses empty part nodes with offset vertices, not a pivot at the plate.
  surface.position.z = .4;
  source.getObjectByName('kit-plate-0').add(surface);
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry, {loadKitAsset: async () => ({scene: source})});
  const {cars, state, duel, vehicles} = fixture();
  cars[0].position.set(23, 0, -14);
  cars[0].rotation.y = .7;
  try {
    kits.update(duel, vehicles, true); await tick(); await tick();
    kits.update(duel, vehicles, true);
    cars[0].updateMatrixWorld(true);
    const fitted = cars[0].getObjectByName('kit-plate-0');
    const before = new THREE.Box3().setFromObject(fitted, true);
    state.armor = 74; state.stageTimeSec = 2;
    kits.update(duel, vehicles, true);
    const dropped = kits.group.getObjectByName('armor-kit-0-loose-0');
    assert.ok(seen(dropped));
    kits.group.updateMatrixWorld(true);
    const after = new THREE.Box3().setFromObject(dropped, true);
    assert.ok(before.getCenter(new THREE.Vector3()).distanceTo(after.getCenter(new THREE.Vector3())) < .001,
      'age-zero debris must start at the fitted plate, including car and child transforms');
    let triangles = 0;
    dropped.traverseVisible(node => {
      if (node.isMesh) triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
    });
    assert.equal(triangles, 1, 'loaded bent plate falls with its authored shape');
    state.stageTimeSec = 3.6; kits.update(duel, vehicles, true);
    assert.equal(seen(dropped), false, 'authored debris keeps the existing bounded lifetime');
    assert.equal(source.getObjectByName('kit-plate-0').children[0], surface,
      'dropping a clone leaves the cached asset intact');
  } finally { kits.dispose(); }
});