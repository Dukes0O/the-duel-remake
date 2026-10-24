import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import * as THREE from 'three';
import meshes from '../src/generated/course-landmarks.json' with {type:'json'};
import {SET_PIECE_BOUNDS} from '../src/course-set-pieces.js';
import {addCourseLandmarks} from '../src/course-landmarks.js';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {disposeTree} from '../src/world.js';
import {addCircuitLandmarks} from '../src/circuit-landmarks.js';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {ARDENNES_FOREST} from '../src/circuits/ardennes-forest.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';

let checks=0,triangles=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
assert.deepEqual(Object.keys(meshes.assets).sort(),Object.keys(SET_PIECE_BOUNDS).sort());checks++;
check(meshes.revision>=3,'inspected Blender revision, including outward-facing custom meshes');
check(statSync(new URL('./build-course-landmarks.py',import.meta.url)).size>10000,'rebuildable Blender recipe retained');
check(!existsSync(new URL('../public/assets/models/course-landmarks.blend',import.meta.url)),'native Blender output is absent from public runtime assets');
for(const [name,groups] of Object.entries(meshes.assets)){
  const bounds=SET_PIECE_BOUNDS[name];let assetTriangles=0;
  check(Object.keys(groups).length<=10,`${name}: material-batched landmark`);
  for(const [material,data] of Object.entries(groups)){
    const spec=meshes.materials[material];check(!!spec,`${name}: known PBR material`);
    check(data.positions.length===data.normals.length&&data.positions.length%9===0,`${name}: triangle attributes align`);
    for(let i=0;i<data.positions.length;i+=3){
      const [x,y,z]=data.positions.slice(i,i+3),normal=data.normals.slice(i,i+3);
      check([x,y,z,...normal].every(Number.isFinite),`${name}: finite geometry`);
      check(Math.abs(x)<=bounds.halfX+.001&&Math.abs(z)<=bounds.halfZ+.001&&y<=bounds.height+.001&&y>=-.001,`${name}: runtime mesh stays inside physics bounds (${x},${y},${z})`);
      check(Math.abs(Math.hypot(...normal)-1)<.0001,`${name}: normalized exported normal`);
    }
    for(let i=0;i<data.positions.length;i+=9){
      const a=new THREE.Vector3(...data.positions.slice(i,i+3)),b=new THREE.Vector3(...data.positions.slice(i+3,i+6)),c=new THREE.Vector3(...data.positions.slice(i+6,i+9));
      const face=b.sub(a).cross(c.sub(a)),normal=new THREE.Vector3(...data.normals.slice(i,i+3));
      check(face.length()>1e-8&&face.normalize().dot(normal)>.999,`${name}: nondegenerate outward-wound export`);
    }
    assetTriangles+=data.positions.length/9;
  }
  check(assetTriangles<6500,`${name}: bounded per-course triangle cost`);triangles+=assetTriangles;
}
for(const def of COURSE){
  const course=new Course(def,1989),before=JSON.stringify(course.features),group=new THREE.Group();addCourseLandmarks(group,course);
  check(JSON.stringify(course.features)===before,`${def.id}: rendering never mutates colliders`);
  if(!def.expansion){check(group.children.length===0,`${def.id}: legacy scene unchanged`);continue;}
  const model=group.children.find(child=>child.userData.courseLandmark),placement=course.features.setPieces[0];
  check(model?.userData.courseLandmark===def.expansion.landmark,`${def.id}: intended reference family`);
  check(model.position.y===placement.baseY&&model.rotation.y===placement.heading,`${def.id}: native mesh and collision placement match`);
  let resources=0,disposed=0;group.traverse(object=>{for(const resource of [object.geometry,object.material].filter(Boolean)){resources++;resource.addEventListener('dispose',()=>disposed++);}});
  disposeTree(group);check(disposed===resources,`${def.id}: all landmark graphics resources released`);
}

// Existing procedural circuit landmarks: default Panorama and optional Ardennes dressing.
const circuitWorld = (definition, landmarks) => {
  const course = new Course({...definition, circuitLandmarks: landmarks}, 1989), world = new THREE.Group();
  const before = JSON.stringify(course.features);
  const placed = addCircuitLandmarks(world, course);
  assert.equal(JSON.stringify(course.features), before);
  return {course, world, placed};
};
const panoTown = PANORAMA_RIDGE.circuitLandmarks.find(row => row.type === 'town');
const panoChurch = PANORAMA_RIDGE.circuitLandmarks.find(row => row.type === 'church');
for (const palette of [undefined, [0x414a50, 0x5a352c], [0x414a50, 0x5a352c, 0x50545a]]) {
  const fixture = circuitWorld(PANORAMA_RIDGE, [{...panoTown, ...(palette ? {roofColours: palette} : {})}]);
  try {
    const roofs = fixture.placed.getObjectByName('town roofs'), original = [0x7d8388, 0x8c4a35, 0x4f5b4c, 0x6b7177, 0x9a9c98];
    assert.ok(roofs?.isInstancedMesh);
    for (let i = 0; i < roofs.count; i++) {
      const x = Math.sin((i + 40) * 91.7 + 17.3) * 24634.6345, colours = palette || original;
      const expected = new THREE.Color(colours[Math.floor((x - Math.floor(x)) * colours.length)]);
      assert.deepEqual(Array.from(roofs.instanceColor.array.slice(i * 3, i * 3 + 3)), expected.toArray().map(Math.fround));
      checks++;
    }
  } finally {disposeTree(fixture.world);}
}
for (const roofColours of [null, [], [0], [0, 1, 2, 3], [-1, 0], [0, 0x1000000], [0, 1.5]]) {
  assert.throws(() => circuitWorld(PANORAMA_RIDGE, [{...panoTown, roofColours}]), /roof palette/i); checks++;
}
// ARDENNES-STAVELOT-STONE: only the named house styles are drawn.
assert.throws(() => circuitWorld(PANORAMA_RIDGE, [{...panoTown, houseStyle: 'tudor'}]), /house style/i); checks++;
{
  const fixture = circuitWorld(PANORAMA_RIDGE, [panoChurch]);
  try {
    const church = fixture.placed.getObjectByName(panoChurch.id), materials = new Map();
    church.traverse(node => {if (node.material) materials.set(node.material.name, node.material);});
    assert.equal(materials.get('church weatherboard').color.getHex(), 0xd8d0bf);
    assert.equal(materials.get('church roof iron').color.getHex(), 0x6b7177);
    const base = fixture.course.groundAt(panoChurch.s, panoChurch.lateral);
    assert.equal(church.position.y, renderedGroundHeight(fixture.course, {...base, s:panoChurch.s, off:panoChurch.lateral}));
    assert.equal(church.rotation.y, base.heading); checks += 4;
  } finally {disposeTree(fixture.world);}
}
{
  const spec = ARDENNES_FOREST.circuitLandmarks.find(row => row.type === 'church');
  const fixture = circuitWorld(ARDENNES_FOREST, [spec]);
  let disposed = false;
  try {
    const church = fixture.placed.getObjectByName(spec.id); fixture.world.updateMatrixWorld(true);
    const nave = church.getObjectByName('church nave foundation'), tower = church.getObjectByName('church tower foundation');
    assert.ok(nave && tower, 'both actual church foundations are fitted');
    let stoneWalls = 0;
    church.traverse(node => {if (node.material?.name === 'church weathered stone') stoneWalls++;});
    assert.equal(stoneWalls, 2, 'nave and tower are stone, not painted timber'); checks += 2;
    for (const [mesh, rect] of [[nave, [-3.9,3.9,-7.3,7.3]], [tower, [-1.9,1.9,6.4,10.2]]]) {
      const box = new THREE.Box3().setFromObject(mesh), nx=Math.ceil((rect[1]-rect[0])/.5), nz=Math.ceil((rect[3]-rect[2])/.5);
      for(let ix=0;ix<=nx;ix++)for(let iz=0;iz<=nz;iz++) {
        const point = new THREE.Vector3(rect[0]+(rect[1]-rect[0])*ix/nx,0,rect[2]+(rect[3]-rect[2])*iz/nz).applyMatrix4(church.matrixWorld);
        const near=fixture.course.nearest(point.x,point.z);
        const y=renderedGroundHeight(fixture.course,{x:point.x,z:point.z,s:near.s,off:near.lateral},{requireSurface:true});
        assert.ok(Number.isFinite(y), 'whole .5m footprint sample has real drawn support');
        assert.ok(box.min.y<=y && box.max.y>=y, 'stone footing reaches actual ground without a floating sample');
        checks += 2;
      }
    }
    let resources=0,released=0; const seen=new Set();
    church.traverse(node=>{for(const item of [node.geometry,node.material])if(item&&!seen.has(item)){seen.add(item);resources++;item.addEventListener('dispose',()=>released++);}});
    disposeTree(fixture.world); disposed = true; assert.equal(released,resources); checks++;
  } finally {if (!disposed) disposeTree(fixture.world);}
}
for(const extra of [{churchStyle:'plastic'},{grounding:'centre'}]) {
  assert.throws(()=>circuitWorld(PANORAMA_RIDGE,[{...panoChurch,...extra}]), /church/i); checks++;
}
assert.throws(()=>circuitWorld(ARDENNES_FOREST,[{...ARDENNES_FOREST.circuitLandmarks.find(row=>row.type==='church'),lateral:100000}]), /support/i); checks++;
// Final-round streets are presentation-only; no descriptor keeps the original town exact.
{
  const original = circuitWorld(PANORAMA_RIDGE, [panoTown]);
  try {assert.equal(original.placed.getObjectByName('town street 0'), undefined); checks++;}
  finally {disposeTree(original.world);}
  const spec = ARDENNES_FOREST.circuitLandmarks.find(row => row.type === 'town');
  for (const streets of [null, [], [{width: 4, points: []}], [{width: NaN, points: [{s: 1, lateral: 28}, {s: 2, lateral: 28}]}],
      [{width: 4, points: [{s: 2, lateral: 28}, {s: 1, lateral: 28}]}],
      [{width: 4, points: [{s: 1, lateral: 0}, {s: 2, lateral: 0}]}]]) {
    assert.throws(() => circuitWorld(ARDENNES_FOREST, [{...spec, streets}]), /street/i); checks++;
  }
  const before = JSON.stringify(spec), fixture = circuitWorld(ARDENNES_FOREST, [spec]);
  let disposed = false;
  try {
    for (let i = 0; i < spec.streets.length; i++) {
      const mesh = fixture.placed.getObjectByName('town street ' + i);
      assert.ok(mesh?.isMesh && mesh.geometry.index.count > 0);
      assert.equal(mesh.material.name, 'town gravel streets');
      const positions = mesh.geometry.getAttribute('position');
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j), z = positions.getZ(j), near = fixture.course.nearest(x, z);
        const y = renderedGroundHeight(fixture.course, {x, z, s: near.s, off: near.lateral}, {requireSurface: true});
        assert.ok(Number.isFinite(y));
        assert.equal(positions.getY(j), Math.fround(y + .04));
        assert.ok(near.distance >= fixture.course.roadHalfWidthAt(near.s) + 3); checks += 3;
      }
    }
    assert.equal(JSON.stringify(spec), before);
    const resources = new Map();
    fixture.world.traverse(node => {for (const item of [node.isInstancedMesh ? node : null, node.geometry, ...[].concat(node.material ?? [])])
      if (item && !resources.has(item)) {resources.set(item, 0); item.addEventListener('dispose', () => resources.set(item, resources.get(item) + 1));}});
    disposeTree(fixture.world); disposed = true; assert.ok([...resources.values()].every(count => count === 1)); checks += 2;
  } finally {if (!disposed) disposeTree(fixture.world);}
}
console.log(`Blender course landmarks: ${checks} checks; ${triangles} triangles across six reusable models.`);
