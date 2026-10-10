import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFlameView, createFlameScorch, createFlameLighting, createFlameResources, insideFlameFootprint} from '../src/flame-view.js';

const camera = new THREE.PerspectiveCamera(); camera.position.set(3,4,-10); camera.lookAt(0,1,4);
const textures = [];
const loadTexture = () => {const texture = new THREE.Texture(); textures.push(texture); return texture;};
for (const [range, degrees] of [[9,30],[6,35]]) {
  const halfAngle=degrees*Math.PI/360;
  assert(insideFlameFootprint(0,range,range,halfAngle));
  assert(!insideFlameFootprint(0,range+.0001,range,halfAngle));
  assert(!insideFlameFootprint(0,-.0001,range,halfAngle));
  const edge=halfAngle+.0001;
  assert(!insideFlameFootprint(Math.sin(edge)*range*.9,Math.cos(edge)*range*.9,range,halfAngle));
  const view=createFlameView({range,halfAngle,loadTexture});
  const fixture=Object.freeze({active:true,seconds:2,age:1,camera,quality:'high'});
  view.update(fixture);
  const tongues=view.group.getObjectByName('CC0 rolling flame tongues');
  const before=Array.from(tongues.instanceMatrix.array);
  view.update(fixture);assert.deepEqual(Array.from(tongues.instanceMatrix.array),before,'same clock/pose gives same frame');
  assert.equal(tongues.material.uniforms.flameRange.value,range);
  assert.equal(tongues.material.uniforms.flameHalfAngle.value,halfAngle);
  assert.equal(tongues.count,36);
  view.update({...fixture,quality:'performance'});assert.equal(tongues.count,27);
  view.update({active:false});assert.equal(view.group.visible,false);
  view.dispose();view.dispose();assert.equal(view.group.children.length,0);
}
const scorch=createFlameScorch({capacity:2,loadTexture});
scorch.stamp({x:1,y:0,z:2,size:3},10);scorch.update(10);
assert.equal(scorch.group.children[0].material.opacity,.5);
scorch.update(12.5);assert.equal(scorch.group.children[0].material.opacity,.25);
scorch.update(15);assert(scorch.group.children.every(mesh=>!mesh.visible),'scorch is gone at five seconds');
for(let i=0;i<100;i++)scorch.stamp({x:i,y:0,z:0},20);
assert.equal(scorch.group.children.length,2,'scorch pool remains bounded');
scorch.stamp({x:999,y:0,z:0},24);scorch.update(25);
assert(scorch.group.children.every(mesh=>!mesh.visible),'busy pools preserve the original five-second lifetime');
scorch.reset();scorch.update(20);assert(scorch.group.children.every(mesh=>!mesh.visible),'new race cannot restore old scorch');
scorch.dispose();
console.log('Flame sector bounds, repeatable visual clocks, quality pool limits and five-second scorch pass.');

const lighting=createFlameLighting();lighting.update([],0);
assert.equal(lighting.group.children.length,2);
assert(lighting.group.children.every(light=>light.visible&&light.intensity===0));
lighting.update(Array.from({length:12},()=>({x:0,y:1,z:3,range:9})),2);
assert.equal(lighting.group.children.length,2);assert(lighting.group.children.every(light=>light.intensity>0));
lighting.update([],3);assert(lighting.group.children.every(light=>light.visible&&light.intensity===0));
lighting.dispose();console.log('Local flame lights stay bounded at two without changing registered light count.');

const owned=[];
const resources=createFlameResources({loadTexture:()=>{const map=new THREE.Texture();let disposed=0;
  map.addEventListener('dispose',()=>disposed++);owned.push(()=>disposed);return map;}});
const sharedViews=Array.from({length:40},()=>createFlameView({resources}));
assert.equal(owned.length,3,'all visual pools share three texture uploads');
assert.equal(resources.maps.tongues.colorSpace,THREE.NoColorSpace,'heat mask preserves scalar midtones');
for(const view of sharedViews)view.dispose();assert(owned.every(read=>read()===0));
resources.dispose();resources.dispose();assert(owned.every(read=>read()===1),'scene retires each shared texture once');
console.log('Shared texture ownership, scalar mask sampling and new-race scorch reset pass.');
