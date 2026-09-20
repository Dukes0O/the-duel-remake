import * as THREE from 'three';
import { ROAD_SHOULDER_WIDTH } from './config.js';
import { addLandscapeDetail } from './landscape-detail.js';
import { addPineTrees } from './vegetation.js';
import { addDesertCacti } from './desert-detail.js';
import { addSceneryDetail } from './scenery-detail.js';
import { addRaceStructures } from './race-structures.js';
import { addArenaCrushables } from './arena-props.js';
import { addRallyDetail } from './rally-detail.js';
import { addMountainLandscape, rockTexture } from './mountain-landscape.js';
import { addCheckpointGates } from './checkpoint-gates.js';
import { createTerrainMaterial } from './terrain-style.js';
import { createPavedRoadMaterial, createPavedShoulderMaterial } from './road-surface.js';
import { addCitySkyline } from './city-skyline.js';
import { addCityParking } from './city-parking.js';

import { strip, terrainGeometry, farTerrainGeometry, meadowTexture, groundTexture, surfaceTexture, addTrailShoulder } from './world-surfaces.js';
import { addFurniture, addSign, box, addStation, addTurnSigns, addCoast, addHarbor, addFinish } from './world-props.js';
import { registerSceneSystem, disposeSceneSystems } from './scene-systems.js';

// Keep the established scene API for renderer and geometry-focused callers.
export { worldAtExtended, strip, terrainGeometry, farTerrainGeometry } from './world-surfaces.js';
export { addTurnSigns, addHarbor } from './world-props.js';

// Composition order is deliberate: surfaces, biome detail, physical-feature
// shells, then their visual refinements and race markers. No new wrapper groups
// are inserted, so material refinement, render order and batching stay stable.
export function buildEnvironment(course) {
  const group = new THREE.Group(), alpine = course.def.theme === 'alpine', night=course.def.theme==='city';
  const roadMat = createPavedRoadMaterial({asphalt:surfaceTexture('asphalt'),night});
  const groundMat=createTerrainMaterial({earth:groundTexture('color'),grass:meadowTexture(),city:surfaceTexture('asphalt'),rock:rockTexture('alpine'),normal:groundTexture('normal'),roughness:groundTexture('roughness')});
  const cream = new THREE.MeshStandardMaterial({ color: 0xe8d2a5, roughness: .8 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd8a943, roughness: .85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa6aaa5, metalness: .55, roughness: .57 });
  const terrain = new THREE.Mesh(terrainGeometry(course), groundMat); terrain.receiveShadow = true; group.add(terrain);
  const farTerrain = new THREE.Mesh(farTerrainGeometry(course), groundMat); farTerrain.receiveShadow = true; group.add(farTerrain);
  const trailMat=new THREE.MeshStandardMaterial({map:surfaceTexture('gravel'),bumpMap:surfaceTexture('gravel'),bumpScale:.035,color:course.def.arena?0xb39372:0xbeb4a3,roughness:1});
  const road = new THREE.Mesh(strip(course, s=>-course.roadHalfWidthAt(s), s=>course.roadHalfWidthAt(s), .035), course.def.arena||course.def.offroad?trailMat:roadMat); road.receiveShadow = true; group.add(road);
  const shoulder = createPavedShoulderMaterial({gravel:surfaceTexture('gravel'),alpine,course});
  for (const side of [-1, 1]) {
    if(course.def.offroad||course.def.arena)addTrailShoulder(group,course,side,trailMat);
    else group.add(new THREE.Mesh(strip(course, s=>side*course.roadHalfWidthAt(s), s=>side*(course.roadHalfWidthAt(s)+ROAD_SHOULDER_WIDTH), .018), shoulder));
    if(!course.def.arena&&!course.def.offroad){group.add(new THREE.Mesh(strip(course, s=>side*(course.roadHalfWidthAt(s)-.45), s=>side*(course.roadHalfWidthAt(s)-.28), .057), cream));
    group.add(new THREE.Mesh(strip(course, side * .12, side * .22, .058), yellow));}
  }
  for(const theme of new Set(course.sections.map(s=>s.theme))){
    if(theme==='arena')continue;
    const view=Object.create(course);view.def={...course.def,theme};view.features={...course.features};
    for(const field of ['mountains','trees','rocks'])view.features[field]=course.features[field].filter(p=>p.theme===theme);
    view.detailSections=course.sections.filter(s=>s.theme===theme);
    const updateLandscape=addLandscape(group,view);if(updateLandscape)registerSceneSystem(group,{sync:updateLandscape});
    addLandscapeDetail(group,view,theme==='alpine');
  }
  addFurniture(group, course, metal);
  const crushables=addArenaCrushables(group,course);if(crushables)registerSceneSystem(group,{sync:crushables.userData.updateSimulation});
  for(const cut of course.features.shortcuts){
    const paved=cut.surface==='paved',gravel=paved?roadMat:trailMat;
    const path=new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)-cut.halfWidth,s=>course.shortcutOffset(cut,s)+cut.halfWidth,.065,cut.start,cut.end,true),gravel);path.receiveShadow=true;group.add(path);
    if(paved)for(const side of[-1,1])group.add(new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)+side*(cut.halfWidth-.35),s=>course.shortcutOffset(cut,s)+side*(cut.halfWidth-.2),.078,cut.start,cut.end,true),cream));
    for(let s=cut.start+25;s<cut.end-20;s+=40)for(const side of[-1,1]){const p=course.groundAt(s,course.shortcutOffset(cut,s)+side*(cut.halfWidth+.7));box(group,[.13,1.25,.13],[p.x,p.y+.625,p.z],yellow);}
  }
  for(const lane of course.features.passingLanes){
    for(let s=lane.start+55;s<lane.end-50;s+=18)for(const side of[-1,1])group.add(new THREE.Mesh(strip(course,side*6.45,side*6.6,.07,s,s+7),cream));
  }
  for(const sign of course.features.signs)addSign(group,sign);
  for(const station of course.features.stations)addStation(group, station);
  for(const direction of[-1,1])addTurnSigns(group,course.features.chevrons.filter(sign=>sign.direction===direction),direction);
  if(course.sections.some(s=>s.theme==='coast'))addCoast(group,course);
  if(course.sections.some(s=>s.theme==='city'))addHarbor(group,course);
  addCitySkyline(group,course);
  addCityParking(group,course);
  addSceneryDetail(group,course);
  addRaceStructures(group,course);
  addRallyDetail(group,course);
  addFinish(group, course);
  addCheckpointGates(group,course);
  return group;
}

function addLandscape(group,course){
  addMountainLandscape(group,course);
  const trees=course.features.trees;
  const pine=course.def.theme!=='desert';
  if(pine)addPineTrees(group,trees);
  else return addDesertCacti(group,course);
}

export function disposeTree(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), errors = [];
  const release = action => { try { action(); } catch (error) { errors.push(error); } };
  object.traverse(o => {
    release(() => disposeSceneSystems(o));
    if (o.isInstancedMesh) release(() => o.dispose());
    if (o.geometry) geometries.add(o.geometry);
    for (const material of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const resources of [geometries, materials, textures]) {
    for (const resource of resources) if (!resource.userData.sharedAsset) release(() => resource.dispose());
  }
  if (errors.length) throw new AggregateError(errors, 'Scene resource cleanup failed.');
}
