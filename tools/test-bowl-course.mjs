import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {BOWL_COURSE} from '../src/bowl/bowl-course.js';
import {createBowlView} from '../src/bowl/bowl-view.js';
import {addArenaCrushables} from '../src/arena-props.js';

const check=(condition,message)=>assert.ok(condition,message);
const bowl=new Course(BOWL_COURSE,1989);
check(BOWL_COURSE.bowl&&BOWL_COURSE.timeOfDay==='night','The Bowl is a distinct night course.');
check(bowl.features.ramps.length===3,'The Bowl has three authored launch ramps.');
check(bowl.features.ramps.every(ramp=>bowl.jumpAt(ramp.start+(ramp.end-ramp.start)/2)>0),
  'Every ramp gives a positive launch surface.');
check(bowl.features.crushables.length===15,'The crush line grows through cars, larger shells and the burning heap.');
check(bowl.features.flameJets.length===3,'Flame jet positions are seeded course features.');

const world=new THREE.Group(),shells=addArenaCrushables(world,bowl);
check(shells.children.length===bowl.features.crushables.length,'Every crush target has a visible salvage shell.');
const crushed=bowl.features.crushables[0].id;
for(let i=0;i<120;i++)shells.userData.updateSimulation({crushedProps:[crushed]},1/60);
const bounds=new THREE.Box3().setFromObject(shells.children[0]);
check(bounds.max.y<1.3,'A crushed course item collapses below its intact height.');
check(shells.children[1].scale.y===1,'Crushing one item leaves the others intact.');

check(COURSE.slice(0,7).map(course=>course.id).join(',')===
  'pacific-canyon,high-country,harbor-highlands,titan-arena,midnight-chase,ridge-rally,titan-stunt-trial',
  'The existing course positions and identities are unchanged.');

const fakeModel=(names)=>{
  const scene=new THREE.Group();
  for(const name of names){
    const assembly=new THREE.Group();assembly.name=name;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.4,5.2),new THREE.MeshStandardMaterial({color:0xb45d53}));
    mesh.name=name;assembly.add(mesh);
    scene.add(assembly);
  }
  return {scene};
};
const fireTexture=new THREE.DataTexture(new Uint8Array([255,160,32,255]),1,1);
const view=createBowlView({loadModel:async path=>path.endsWith('stadium.glb')?
  fakeModel(['stadium']):fakeModel(['bus-crushed-assembly','rv-crushed-assembly',
    'fire-stack-lower-car-wreck-body']),
  loadFireTexture:async()=>fireTexture});
view.update(bowl,{},1000,true);
await new Promise(resolve=>setTimeout(resolve,0));
await new Promise(resolve=>setTimeout(resolve,0));
check(view.group.visible,'The Bowl presentation is visible when its switch and course definition are active.');
check(view.group.userData.stadiumReady&&view.group.getObjectByName('Bowl stadium, floodlights and crowd'),
  'The authored night stadium is rendered.');
check(view.group.getObjectByName('Bowl faded junk car crush line')?.userData.crushableCount===9,
  'The opening crush rows reuse the game junk-car props.');
check(view.group.children.filter(child=>child.name.startsWith('Bowl authored crush')).length===3,
  'The authored crushed bus and RV meshes are placed in the line.');
check(view.group.getObjectByName('Bowl burning bus stack'),
  'The authored burning stack mesh is placed between its ground fire sprites.');
check(view.group.userData.flameJetCount===3&&view.group.children.filter(child=>
  child.name.startsWith('Bowl flame jet')).length===3,
  'Three timed fire-flipbook jets render at the authored course positions.');
check(view.group.userData.heapFireCount===3&&view.group.children.filter(child=>
  child.name.startsWith('Bowl heap fire')).length===3,
  'The three heap props use the game fire-flipbook effect with no cone flame.');
check(view.group.children.filter(child=>child.name.startsWith('Bowl flame jet')).every(child=>child.visible),
  'Flame jets are active during their firing part of the cycle.');
view.update(bowl,{},8000,true);
check(view.group.children.filter(child=>child.name.startsWith('Bowl flame jet')).every(child=>!child.visible),
  'Flame jets extinguish during the rest of their cycle.');
view.update(bowl,{},4000,false);
check(!view.group.visible,'The Bowl presentation stays hidden with its feature switch off.');
view.dispose();
console.log('Bowl course ramps, art view, fire cycle, crush props and existing course order passed.');
