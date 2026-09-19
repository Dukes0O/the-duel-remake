import assert from 'node:assert/strict';
import * as THREE from 'three';
import {registerSceneSystem,animateScene,syncScene,disposeSceneSystems} from '../src/scene-systems.js';
import {disposeTree} from '../src/world.js';
import {addLandscapeDetail} from '../src/landscape-detail.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';

let checks=0;
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const world=new THREE.Group(),calls=[],state=Object.freeze({status:'racing',stageTimeSec:3,paused:true});
const first={animate:t=>calls.push(['wind',t]),sync:(s,dt)=>{assert.equal(s,state);calls.push(['props',dt]);},dispose:()=>calls.push(['first dispose'])};
registerSceneSystem(world,first);registerSceneSystem(world,first);
registerSceneSystem(world,{animate:t=>calls.push(['water',t]),dispose:()=>calls.push(['second dispose'])});
animateScene(world,12);syncScene(world,state,0);
same(calls,[['wind',12],['water',12],['props',0]],'ordered phases and one registration per system identity');
registerSceneSystem(world,{animate:t=>calls.push(['late',t])});
calls.length=0;animateScene(world,13);
same(calls,[['wind',13],['water',13],['late',13]],'late systems participate without rebuilding the world');
same(state,{status:'racing',stageTimeSec:3,paused:true},'the registry never modifies state or chooses a different clock');
calls.length=0;disposeSceneSystems(world);disposeSceneSystems(world);
same(calls,[['second dispose'],['first dispose']],'cleanup is reversed and runs once');
calls.length=0;registerSceneSystem(world,{animate:()=>calls.push('resurrected')});animateScene(world,500);syncScene(world,state,.5);
same(calls,[],'late callbacks cannot revive a retired world');
const empty=new THREE.Group();animateScene(empty,1);syncScene(empty,state);disposeSceneSystems(empty);
same(empty.userData,{},'static worlds need no hidden callback properties');
registerSceneSystem(empty,{animate:()=>calls.push('revived empty world')});animateScene(empty,9);
same(calls,[],'an initially static world stays retired after late registration');
assert.throws(()=>registerSceneSystem({},{}),TypeError);checks++;

const root=new THREE.Group(),child=new THREE.Group();root.add(child);
let released=0,geometryReleased=0;
registerSceneSystem(child,{dispose:()=>released++});
const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();
geometry.addEventListener('dispose',()=>geometryReleased++);child.add(new THREE.Mesh(geometry,material));
disposeTree(root);
same([released,geometryReleased],[1,1],'graph disposal releases nested systems and private geometry');

const broken=new THREE.Group(),cleanup=[];
registerSceneSystem(broken,{dispose:()=>cleanup.push('first')});
registerSceneSystem(broken,{dispose:()=>{cleanup.push('second');throw new Error('failed hook');}});
const brokenGeometry=new THREE.BoxGeometry(),brokenMaterial=new THREE.MeshBasicMaterial({map:new THREE.Texture()});
broken.add(new THREE.Mesh(brokenGeometry,brokenMaterial));
brokenGeometry.addEventListener('dispose',()=>{cleanup.push('geometry');throw new Error('failed geometry listener');});
brokenMaterial.addEventListener('dispose',()=>cleanup.push('material'));
brokenMaterial.map.addEventListener('dispose',()=>cleanup.push('texture'));
assert.throws(()=>disposeTree(broken),AggregateError);checks++;
same(cleanup,['second','first','geometry','material','texture'],'all hooks and private resources release before cleanup errors are reported');
disposeSceneSystems(broken);
same(cleanup.length,5,'failed cleanup hooks still retire exactly once');

// Repeated shader compilation shares one clock instead of accumulating one
// callback and stale shader reference per program variant.
const originalLoad=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
try{
  const course=new Course(COURSE.find(def=>def.id==='high-country'),1989),view=Object.create(course);
  view.def={...course.def,theme:'alpine'};view.detailSections=course.sections.filter(section=>section.theme==='alpine');
  view.features={...course.features,rocks:course.features.rocks.filter(rock=>rock.theme==='alpine')};
  const group=new THREE.Group();addLandscapeDetail(group,view,true);
  const meadow=group.children.find(mesh=>mesh.material?.map&&mesh.material.alphaTest===.5);
  assert.ok(meadow,'meadow fixture exists');checks++;
  const shaders=Array.from({length:5},()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader}));
  for(const shader of shaders)meadow.material.onBeforeCompile(shader);
  same(new Set(shaders.map(shader=>shader.uniforms.meadowTime)).size,1,'all compiled meadow programs share one time uniform');
  animateScene(group,4.25);
  same(shaders.map(shader=>shader.uniforms.meadowTime.value),Array(5).fill(4.25),'every shader variant receives the same animation time');
  disposeTree(group);animateScene(group,20);
  same(shaders[0].uniforms.meadowTime.value,4.25,'disposed grass stops updating');
}finally{THREE.TextureLoader.prototype.load=originalLoad;}
console.log(`Scene systems: ${checks} ordered clock, late registration, shader reuse and disposal checks passed.`);
