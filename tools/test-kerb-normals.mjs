import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {addTrackScriptScene} from '../src/track-script-scene.js';

// The geometry and material control was captured before the normal repair.
const baseline = '077a29a3c85652ae7f96567634c54b28cc42d6732dbbbe08cc8417c2cc9e075d';
const cases = [
  {name:'flat ridge',direction:'L',radius:80,bank:0,climb:0},
  {name:'left climb',direction:'L',radius:80,bank:0,climb:18},
  {name:'right bank',direction:'R',radius:55,bank:8,climb:-12},
];
const digest=createHash('sha256'), meshes=[];
for(const fixture of cases){
  const course=new Course({id:'kerb-normal-qa',stage:90,name:fixture.name,
    theme:'alpine',closed:fixture.name==='flat ridge',noTraffic:true,scenery:{trees:0,rocks:0,mountains:false},
    script:fixture.name==='flat ridge' ? [
      ['straight',500,{width:16,climb:40,walls:'none'}],
      ['turn','L',180,80,{width:16,walls:'none'}],
      ['straight',500,{width:16,climb:-40,walls:'none'}],
      ['turn','L',180,80,{width:16,walls:'none'}]] :
      [['straight',60,{width:16,walls:'none'}],
      ['turn',fixture.direction,120,fixture.radius,{width:16,walls:'none',
        bank:fixture.bank,climb:fixture.climb}],
      ['straight',80,{width:16,walls:'none'}]]},1989);
  assert.deepEqual(new Set(course.features.kerbs.map(row=>row.side)),new Set([-1,1]));
  const physics=JSON.stringify(course.features),group=new THREE.Group();
  addTrackScriptScene(group,course);
  assert.equal(JSON.stringify(course.features),physics,'drawing cannot change course physics');
  const kerbs=group.children.filter(node=>node.name==='track-kerbs');
  assert.equal(kerbs.length,2,'the real red and white kerbs are present');
  for(const mesh of kerbs){
    const geometry=mesh.geometry,material=mesh.material;
    digest.update(Buffer.from(geometry.attributes.position.array.buffer));
    digest.update(geometry.attributes.uv?Buffer.from(geometry.attributes.uv.array.buffer):'no UV');
    digest.update(JSON.stringify({name:mesh.name,receiveShadow:mesh.receiveShadow,
      color:material.color.getHex(),roughness:material.roughness,metalness:material.metalness,
      side:material.side,polygonOffset:material.polygonOffset,
      factor:material.polygonOffsetFactor,units:material.polygonOffsetUnits}));
    assert.equal(material.side,THREE.DoubleSide,'both sides still draw with the existing material');
    meshes.push({mesh,name:fixture.name});
  }
}
const actual=digest.digest('hex');
console.log('Position/UV/material digest:',actual);
if(baseline)assert.equal(actual,baseline,'positions, UV data and material must stay byte-exact');
let vertices=0,triangles=0;
for(const {mesh,name} of meshes){
  const geometry=mesh.geometry,normal=geometry.attributes.normal,position=geometry.attributes.position;
  for(let i=0;i<normal.count;i++){
    const components=[normal.getX(i),normal.getY(i),normal.getZ(i)];
    assert.ok(components.every(Number.isFinite),`${name}: normal ${i} is finite`);
    assert.ok(Math.abs(Math.hypot(...components)-1)<1e-6,`${name}: normal ${i} is unit length`);
    vertices++;
  }
  const faces=new Set(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<geometry.index.count;i+=3){
    const ids=[0,1,2].map(offset=>geometry.index.getX(i+offset)),key=[...ids].sort((x,y)=>x-y).join(',');
    assert.ok(!faces.has(key),`${name}: opposing triangles must not share one face`);faces.add(key);
    a.fromBufferAttribute(position,ids[0]);b.fromBufferAttribute(position,ids[1]);c.fromBufferAttribute(position,ids[2]);
    assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-5,`${name}: actual kerb triangle has nonzero area`);
    triangles++;
  }
  geometry.dispose();mesh.material.dispose();
}
console.log(`Kerb normals pass: ${vertices} finite unit normals, ${triangles} nondegenerate faces.`);
