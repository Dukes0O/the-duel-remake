import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE, DRIVE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {BOWL_COURSE, bowlCentre} from '../src/bowl/bowl-course.js';
import {createBowlView} from '../src/bowl/bowl-view.js';
import {addArenaCrushables} from '../src/arena-props.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const check=(condition,message)=>assert.ok(condition,message);
const DT=1/120;
const bowl=new Course(BOWL_COURSE,1989),centre=bowlCentre(bowl),floor=BOWL_COURSE.scrapdome;
check(BOWL_COURSE.bowl&&BOWL_COURSE.timeOfDay==='night','The Bowl is a distinct night course.');

// The ring stands inside the authored stadium (tools/blender/bowl-stadium.py): its side
// walls' faces are 38.4 m from the middle and the front row of the stands is 26.7 m.
const outer=bowl.features.barriers.filter(wall=>wall.arenaWall&&wall.off>0);
check(outer.length>0&&outer.every(wall=>Math.abs(wall.x-centre.x)+.5<38.4&&Math.abs(wall.z-centre.z)+.5<26.7),
  'The outer wall stands inside the stadium, in front of its stands and side walls.');
const island=bowl.features.barriers.filter(wall=>wall.arenaWall&&wall.off<0);
check(island.every(wall=>Math.abs(wall.z-centre.z)>5.5||Math.abs(wall.x-centre.x)>5),
  'The island wall goes round the podium in the middle of the stadium.');
const end=bowl.worldAt(bowl.length-.05,0);
check(Math.hypot(end.x,end.z)<.1&&bowl.samples.every((p,i)=>!i||Math.abs(p.heading-bowl.samples[i-1].heading)<.25),
  'The ring closes at the start line and bends smoothly round its tight ends.');
const line=[];for(let s=0;s<bowl.length;s+=.25)line.push(bowl.worldAt(s,0));
const closest=Math.min(...bowl.features.barriers.filter(wall=>wall.arenaWall).flatMap(wall=>{
  const sn=Math.sin(wall.heading),cs=Math.cos(wall.heading);
  return [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0]].map(([u,v])=>{
    const x=wall.x+cs*u*wall.halfX+sn*v*wall.halfZ,z=wall.z-sn*u*wall.halfX+cs*v*wall.halfZ;
    return Math.min(...line.map(p=>Math.hypot(p.x-x,p.z-z)));
  });
}));
check(closest>=floor.floorHalfWidth+1.4+.4,'Every wall piece keeps at least 0.4 m from a Titan at the floor edge.');
check(bowl.roadHalfWidthAt(0)===floor.floorHalfWidth&&floor.floorHalfWidth+1.4+.5<=Math.min(floor.wallOffset,floor.outerWallOffset)-.5,
  'A Titan at the floor edge is clear of both walls.');
for(const prop of bowl.features.crushables)
  check(Math.abs(prop.off)+prop.halfX<=floor.floorHalfWidth,`${prop.id} stands on the floor.`);

check(bowl.features.ramps.length===2,'The Bowl has a kicker and a big ramp.');
check(bowl.features.crushables.map(prop=>prop.sourceKind).join(',')===
  'junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,bowlBus,bowlBus,bowlRv,bowlBurningHeap,bowlBurningHeap,bowlBurningHeap',
  'The crush line grows from junk cars to buses and the RV, then the burning heap.');
check(bowl.features.barriers.every(wall=>!wall.arenaWall||wall.y===0)&&
  bowl.features.flameJets.every(jet=>bowl.groundAt(jet.s,jet.off).y===0),
  'The ramps fill the floor between the walls; the walls and flame jets stand on the ground.');
check(bowl.features.flameJets.length===4&&bowl.features.ramps.every(ramp=>
  bowl.features.flameJets.filter(jet=>jet.s>ramp.start&&jet.s<ramp.end).length===2),
  'A flame jet stands either side of each ramp.');

// A real ride over each ramp: the Titan leaves the ground at a speed the floor allows.
function bowlDuel(){
  const duel=new Duel({seed:1989});
  duel.startCampaign({startStage:COURSE.findIndex(course=>course.id==='titan-arena'),mode:'timetrial',car:'titan_monster'});
  duel.course=new Course(BOWL_COURSE,1989);
  Object.assign(duel.state,{status:'racing',traffic:[],rival:null,crushedProps:[]});
  return duel;
}
for(const [index,ramp] of bowl.features.ramps.entries()){
  const duel=bowlDuel(),state=duel.state;
  Object.assign(state,{s:ramp.start-6,prevS:ramp.start-6,speedMph:30,airborne:false,airHeight:0,_jumpY:null,_verticalSpeed:0});
  let air=0,landed=false;
  for(let tick=0;tick<360&&!landed;tick++){
    state.prevS=state.s;state.s+=state.speedMph*DT*DRIVE.mphToWorld;duel._jump(state,DT);
    if(state.airborne)air++;else if(air)landed=true;
  }
  check(air*DT>.5&&landed,`Ramp ${index} launches the Titan at 30 mph and it lands.`);
}

// A real crush of each kind of item in the line.
for(const kind of ['junkCar','bowlBus','bowlRv','bowlBurningHeap']){
  const duel=bowlDuel(),state=duel.state,prop=duel.course.features.crushables.find(item=>item.sourceKind===kind);
  Object.assign(state,{s:prop.s-12,prevS:prop.s-12,lateral:prop.off,prevLateral:prop.off,headingError:0,speedMph:25,airborne:false,airHeight:0});
  for(let tick=0;tick<400&&!state.crushedProps.includes(prop.id);tick++){
    state.prevS=state.s;state.s+=state.speedMph*DT*DRIVE.mphToWorld;duel._crushProps(state);
  }
  check(state.crushedProps.includes(prop.id),`The Titan crushes a ${kind} in the line.`);
}

const world=new THREE.Group(),shells=addArenaCrushables(world,bowl);
check(shells.children.length===bowl.features.crushables.length,'Every crush target has a visible salvage shell.');
const crushed=bowl.features.crushables[0].id;
for(let i=0;i<120;i++)shells.userData.updateSimulation({crushedProps:[crushed]},1/60);
const bounds=new THREE.Box3().setFromObject(shells.children[0]);
check(bounds.max.y<1.3,'A crushed course item collapses below its intact height.');
check(shells.children[1].scale.y===1,'Crushing one item leaves the others intact.');

// Existing courses are as they were: order, and the Titan Monster Arena's own floor.
check(COURSE.slice(0,7).map(course=>course.id).join(',')===
  'pacific-canyon,high-country,harbor-highlands,titan-arena,midnight-chase,ridge-rally,titan-stunt-trial',
  'The existing course positions and identities are unchanged.');
const titan=new Course(COURSE.find(course=>course.id==='titan-arena'),1989);
check(titan.roadHalfWidthAt(0)===13&&titan.features.ramps.map(ramp=>[ramp.end-ramp.start,ramp.height].join()).join('|')==='38,2.6|38,2.6|38,2.6'&&
  titan.features.barriers.filter(wall=>wall.arenaWall).every(wall=>Math.abs(wall.off)===22),
  'The Titan Monster Arena keeps its floor, ramps and walls.');

// The view: the stadium stands round the ring, and its own floor props are cleared off the ring.
const fakeModel=parts=>{
  const scene=new THREE.Group();
  for(const [name,[x,y,z]=[0,0,0]] of parts){
    const assembly=new THREE.Group();assembly.name=name;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.4,5.2),new THREE.MeshStandardMaterial({color:0xb45d53}));
    mesh.name=name;mesh.position.set(x,y,z);assembly.add(mesh);
    scene.add(assembly);
  }
  return {scene};
};
// Like crush.glb: sibling parts under one root, whose turn about X stands them upright
// (each part is long along its own Y, as Blender's Z-up export leaves it).
const fakeCrush=()=>{
  const scene=new THREE.Group(),root=new THREE.Group();root.name='bowl-crush';
  root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);scene.add(root);
  for(const [name,size] of [['bus-crushed-assembly'],['bus-crushed-body-shell',[2.8,8.6,1.4]],['bus-crushed-wheels',[3.2,6,1]],
    ['rv-crushed-body-shell',[2.6,6.2,1.6]],['fire-stack-lower-car-wreck-body',[2.2,4.6,1.2]],['fire-stack-top-car-wreck-body',[2.2,4.6,1.2]],
    ['curling-flame-tongue',[.6,.6,1.6]]]){
    const part=size?new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color:0xb45d53})):new THREE.Object3D();
    part.name=name;if(name.startsWith('fire-stack-top'))part.position.z=-1.2;root.add(part);
  }
  return {scene};
};
const fireTexture=new THREE.DataTexture(new Uint8Array([255,160,32,255]),1,1);
// Like the stadium model's merged meshes: one box crossing the stand wall's line, one in a corner.
const scrapBoxes=()=>{
  const mesh=new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(2.2,1.2,2.2).translate(36.5,.6,0),
    new THREE.BoxGeometry(2.2,1.2,2.2).translate(31,.6,-23)]),new THREE.MeshStandardMaterial());
  mesh.name='bowl-scrap-boxes';return mesh;
};
const withScrap=model=>{model.scene.add(scrapBoxes());return model;};
const view=createBowlView({loadModel:async path=>path.endsWith('stadium.glb')?
  withScrap(fakeModel([['stadium'],['bowl-ramp-0-plate',[-24,.75,2]],['bowl-crushed-car-wrecks',[-33,.55,-7]],
    ['bowl-rustwall-panels',[33,.9,0]],['bowl-handrails',[31,.9,-23]],['bowl-podium-concrete',[0,.45,-1]],['bowl-concrete-terraces',[0,2.6,30]]])):
  fakeCrush(),
  loadFireTexture:async()=>fireTexture});
view.update(bowl,{},1000,true);
await new Promise(resolve=>setTimeout(resolve,0));
await new Promise(resolve=>setTimeout(resolve,0));
check(view.group.visible,'The Bowl presentation is visible when its switch and course definition are active.');
const stadium=view.group.getObjectByName('Bowl stadium, floodlights and crowd');
check(view.group.userData.stadiumReady&&stadium,'The authored night stadium is rendered.');
check(Math.hypot(stadium.position.x-centre.x,stadium.position.z-centre.z)<1e-9,'The stadium stands round the middle of the ring.');
check(!stadium.getObjectByName('bowl-ramp-0-plate'),'The stadium model\'s own ramps are not left on the ring.');
const triangles=name=>stadium.getObjectByName(name).children[0].geometry.index.count/3;
check(triangles('bowl-rustwall-panels')===0&&triangles('bowl-crushed-car-wrecks')===0,'Low props on the ring are cut out of the stadium model.');
const scrap=stadium.getObjectByName('bowl-scrap-boxes').geometry.index.count/3;
check(scrap===12,'A merged box crossing the wall line goes whole; the box in the corner stays whole.');
check(triangles('bowl-podium-concrete')===12&&triangles('bowl-concrete-terraces')===12&&triangles('bowl-handrails')===12,
  'The podium, the stands and a prop in a corner off the ring stay whole.');
check(view.group.getObjectByName('Bowl faded junk car crush line')?.userData.crushableCount===9,
  'The opening crush rows reuse the game junk-car props.');
check(view.group.children.filter(child=>child.name.startsWith('Bowl authored crush')).length===3,
  'The authored crushed bus and RV meshes are placed in the line.');
// Lying along the course: longest along the course, lower than it is long.
const flat=name=>{
  const prop=view.group.getObjectByName(name),heading=prop.rotation.y,position=prop.position.clone();
  prop.rotation.y=0;prop.position.set(0,0,0);prop.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(prop).getSize(new THREE.Vector3());
  prop.rotation.y=heading;prop.position.copy(position);prop.updateMatrixWorld(true);
  return size.z>size.x&&size.z>size.y;
};
const bus=bowl.features.crushables.find(prop=>prop.sourceKind==='bowlBus');
check(flat(`Bowl authored crush ${bus.id}`),'The crushed bus lies flat along the course, not on end.');
check(view.group.getObjectByName('Bowl burning bus stack')&&flat('Bowl burning bus stack'),
  'The authored burning stack lies along the course between its ground fire sprites.');
check(view.group.children.filter(child=>child.name.startsWith('Bowl burning bus stack')).length===3,
  'A burning stack stands on each of the heap\'s three places.');
const busProp=view.group.getObjectByName(`Bowl authored crush ${bus.id}`);
for(let i=0;i<60;i++)view.update(bowl,{crushedProps:[bus.id]},1000,true);
check(busProp.scale.y===.5&&view.group.getObjectByName('Bowl burning bus stack').scale.y===1,
  'A crushed bus settles lower and the props not crushed stay as they are.');
const heap=bowl.features.crushables.find(prop=>prop.sourceKind==='bowlBurningHeap'&&prop.off===0);
const heapFire=view.group.getObjectByName(`Bowl heap fire ${heap.id}`),fireBefore=heapFire.position.y;
for(let i=0;i<60;i++)view.update(bowl,{crushedProps:[heap.id]},1000,true);
check(heapFire.position.y<fireBefore-.3,'The fire of a crushed stack sinks with it.');
let tongues=0;view.group.traverse(node=>{if(node.name==='curling-flame-tongue')tongues++;});
check(tongues===0,'The model\'s cone flames are not used.');
const jets=()=>view.group.children.filter(child=>child.name.startsWith('Bowl flame jet bowl-'));
check(view.group.userData.flameJetCount===4&&jets().length===4&&
  view.group.children.filter(child=>child.name.startsWith('Bowl flame jet housing')).length===4,
  'Four timed fire-flipbook jets render on their housings at the course positions.');
check(view.group.userData.heapFireCount===3&&view.group.children.filter(child=>
  child.name.startsWith('Bowl heap fire')).length===3,
  'The three heap props use the game fire-flipbook effect with no cone flame.');
check(jets().every(child=>child.visible),'Flame jets are active during their firing part of the cycle.');
view.update(bowl,{},8000,true);
check(jets().every(child=>!child.visible),'Flame jets extinguish during the rest of their cycle.');
view.update(bowl,{},4000,false);
check(!view.group.visible,'The Bowl presentation stays hidden with its feature switch off.');
view.dispose();
console.log('Bowl course: ring inside the stadium, ramps launch, crush line crushes, art view and existing courses passed.');
