import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTownCamera,moveTownCamera,resizeTownCamera,TOWN_ZOOM} from '../src/town/view/town-camera.js';
import {visibleTownChunks,townChunkLod} from '../src/town/view/town-chunks.js';
import {buildTownChunkInstances,createTownPlacementGhost} from '../src/town/view/town-instances.js';
import {pickTownItem} from '../src/town/view/town-pick.js';
import {createTownScene} from '../src/town/view/town-scene.js';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {setScablandsGroundEdit,resetScablandsGroundEdit} from '../src/world/scablands-ground.js';

const camera=createTownCamera({width:800,height:600,target:{x:10,y:2,z:-4},zoom:0});
const streetDistance=camera.position.distanceTo(camera.userData.townView.target);
moveTownCamera(camera,{zoom:.5,forward:1,turn:1,delta:1});
assert.ok(camera.position.distanceTo(camera.userData.townView.target)>streetDistance);
assert.ok(camera.userData.townView.target.x!==10 || camera.userData.townView.target.z!==-4);
assert.ok(camera.userData.townView.zoom>.49 && camera.userData.townView.zoom<.51);
assert.equal(TOWN_ZOOM.street,28);
resizeTownCamera(camera,400,400); assert.equal(camera.aspect,1);

const town={regions:{scablands:{chunks:{'0:0':{x:0,z:0,cells:{}}}}},buildings:[],people:Array.from({length:10000},(_,id)=>({id}))};
for(let i=0;i<10000;i++) town.buildings.push({id:`building-${i}`,buildingId:i%2?'road-dirt':'hand-well',regionId:'scablands',x:i%100,z:Math.floor(i/100),width:1,depth:1,state:'finished',groundY:0});
const snapshot=JSON.stringify(town);
const chunks=visibleTownChunks(town,camera,{radius:1});
assert.ok(chunks.length>1,'the view adds ground chunks around sparse town data');
assert.ok(chunks.length<289,'chunk culling keeps the street view local');
assert.equal(townChunkLod(camera,chunks[0]),'near');
const meshes=buildTownChunkInstances(town,{x:0,z:0},'near');
assert.ok(meshes.length>0 && meshes.every(mesh=>mesh.isInstancedMesh));
assert.ok(meshes.reduce((sum,mesh)=>sum+mesh.count,0)>0);
assert.equal(JSON.stringify(town),snapshot,'building the view only reads town data');

const valid=createTownPlacementGhost({valid:true});
const invalid=createTownPlacementGhost({valid:false});
assert.equal(valid.userData.placementValid,true); assert.equal(invalid.userData.placementValid,false);
valid.geometry.dispose(); valid.material.dispose(); invalid.geometry.dispose(); invalid.material.dispose();

const targetCamera=createTownCamera({width:800,height:600,target:{x:0,y:0,z:0},zoom:.25});
const plane=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
plane.rotation.x=-Math.PI/2; plane.userData.townGround=true;
targetCamera.position.set(0,10,10); targetCamera.lookAt(0,0,0); targetCamera.updateMatrixWorld();
const selected=pickTownItem(targetCamera,[plane],400,300,{left:0,top:0,width:800,height:600});
assert.equal(selected?.type,'ground');
plane.geometry.dispose(); plane.material.dispose();

const sceneView=createTownScene({town:{...town,buildings:[]},width:800,height:600,now:new Date('2026-01-01T20:00:00'),loadModel:async()=>new THREE.Group()});
assert.ok(sceneView.scene.isScene); assert.ok(sceneView.camera.isPerspectiveCamera);
assert.ok(sceneView.ground === undefined || sceneView.state.ground.children.length>0);
sceneView.setPlacement(1,2,{valid:false,width:2,depth:1});
assert.equal(sceneView.state.ghost.visible,true); assert.equal(sceneView.state.ghost.userData.placementValid,false);
sceneView.setUnderground(true); assert.equal(sceneView.state.overlays.visible,true);
const editLayer=createGroundEdit({region:{id:'view-edit',editable:true},naturalHeight:()=>0});
editLayer.cut({x:0,z:0,radius:1},-2);
setScablandsGroundEdit(editLayer);
sceneView.update();
const terrainChunk=sceneView.state.ground.children.find(chunk=>chunk.userData.chunkKey==='0:0');
assert.ok(terrainChunk,'the scene has a rebuilt terrain chunk after an edit-layer change');
assert.ok(Array.from(terrainChunk.geometry.attributes.position.array).some((value,index,array)=>index%3===1&&array[index]<-1),
  'town terrain uses the edited surface height');
resetScablandsGroundEdit();
sceneView.setUnderground(true);
const utilityTown={...town,buildings:[],utilities:{pipes:[{from:{x:0,z:0},to:{x:24,z:0}}],
  sewers:[{from:{x:0,z:8},to:{x:24,z:8}}],wires:[{from:{x:0,z:16},to:{x:24,z:16}}]}};
const utilityView=createTownScene({town:utilityTown,width:800,height:600,loadModel:async()=>new THREE.Group()});
utilityView.setUnderground(true);
assert.equal(utilityView.state.overlays.children.length,3,'underground view draws utility routes without matching buildings');
assert.deepEqual(utilityView.state.overlays.children.map(route=>route.material.color.getHex()),[0x377e9d,0x775343,0xd5b754],
  'pipes, sewers and wires keep their established colors');
utilityView.dispose();
sceneView.setCalendar({season:'winter'},{hour:21}); assert.equal(sceneView.state.lights.visible,true);
sceneView.dispose();

console.log('Town view checks passed: camera, chunk culling, instanced buildings, picking, placement, underground, calendar, and 10,000-person read-only town.');
