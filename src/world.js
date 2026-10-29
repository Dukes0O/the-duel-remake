import { rampClearsScenery } from './deep/deep-ramp.js'; // DEEP-RAMP-2
import {addCircuitLandmarks,finishRidgeKitMaterials} from './circuit-landmarks.js';
import {createTrackKits,bindTrackKits} from './track-kits.js';
import {applySnowTerrain,winterTerrainMaterial,snowPineIds,snowRockFeatures,winterWeight,createSnowWorld,bindSnowWorld,winterSurfaceMaterial} from './snow-world.js';
import {createHiddenRoadHint} from './hidden-road-hints.js';
import * as THREE from 'three';
import { ROAD_SHOULDER_WIDTH } from './config.js';
import { addCourseLandmarks } from './course-landmarks.js';
import { addLandscapeDetail } from './landscape-detail.js';
import { addPineTrees, usesBeeches } from './vegetation.js';
import { addDesertCacti } from './desert-detail.js';
import { addSceneryDetail } from './scenery-detail.js';
import { addRaceStructures } from './race-structures.js';
import { addArenaCrushables } from './arena-props.js';
import { addRallyDetail } from './rally-detail.js';
import { addMountainLandscape, rockTexture } from './mountain-landscape.js';
import { addCheckpointGates } from './checkpoint-gates.js';
import { createTerrainMaterial } from './terrain-style.js';
import { createPavedRoadMaterial, createPavedShoulderMaterial, bindPavedDampRoad } from './road-surface.js';
import { addCitySkyline } from './city-skyline.js';
import { addCityParking } from './city-parking.js';
import { addTrackScriptScene } from './track-script-scene.js';
import { addCircuitWater, addRoadGlow } from './circuit-water.js';
import { addNightGlows } from './night-glows.js';
import { addWaterside } from './waterside-scenery.js';
import { addStreetFacades } from './street-facades.js';
import { addFreestyleScenery } from './freestyle-scene.js';

import { strip, terrainGeometry, farTerrainGeometry, hiddenRoadGroundGeometry, meadowTexture, groundTexture, hollowMudTexture, surfaceTexture, addTrailShoulder } from './world-surfaces.js';
import { addFurniture, addSign, box, addStation, addTurnSigns, addCoast, addHarbor, addFinish } from './world-props.js';
import { registerSceneSystem, disposeSceneSystems } from './scene-systems.js';
import { makeSignFallSystem } from './scenery-fall.js';
import { createRustwallScene } from './rustwall-scene.js';
import { createScrapdomeYard } from './scrapdome-yard.js';
import { createMuddyHollowScene, filterMuddyHollowMountains } from './muddy-hollow-scene.js';
import { createSaltFlatsScene } from './arena/venues/salt-flats.js';
import {Course} from './course.js';
import {SCRAPDOME_VENUE} from './arena/venues.js';
import {pitStadiumFrame} from './arena/venues/pit.js';
import {makeRng} from './rng.js';

// Keep the established scene API for renderer and geometry-focused callers.
export { worldAtExtended, strip, terrainGeometry, farTerrainGeometry } from './world-surfaces.js';
export { addTurnSigns, addHarbor } from './world-props.js';

// Composition order is deliberate: surfaces, biome detail, physical-feature
// shells, then their visual refinements and race markers. No new wrapper groups
// are inserted, so material refinement, render order and batching stay stable.
export function roadBranchMaterial(course,cut,base,winter=false){
  const kind=cut.gripKind;
  if(!winter||!['snow','ice','deep-snow'].includes(kind))return base;
  const material=winterSurfaceMaterial(base.clone(),kind);
  if(course.def.snowWorld?.branchTone!==undefined)material.color.set(course.def.snowWorld.branchTone);
  return material;
}

export function buildEnvironment(course, {saltFlats,trackKits,snow=false,preload} = {}) {
  if(course.def.pit)return createPitEnvironment(course);
  if(course.def.id==='salt-flats'){
    const group=new THREE.Group();
    const salt = createSaltFlatsScene(course,saltFlats);
    group.add(salt.group,salt.outside);
    registerSceneSystem(group,{animate:salt.animate});
    return group;
  }
  const group = new THREE.Group(), alpine = course.def.theme === 'alpine', night=course.def.theme==='city';
  const winter=snow&&!!course.def.snowWorld;
  if(winter&&trackKits?.status!=='ready')throw Error('Winter world needs its prepared approved track kits.');
  const omitFoliageAt=winter?(course.def.snowWorld.mixed?(x,z)=>winterWeight(course,course.nearestS(x,z))>0:()=>true):undefined;
  const winterTrees=winter?snowPineIds(course):null,winterRocks=winter?snowRockFeatures(course):null;
  const roadMat = createPavedRoadMaterial({asphalt:surfaceTexture('asphalt'),night,wet:!!course.def.wetRoad,
    ...(course.def.dampRoad !== undefined ? {dampRoad:course.def.dampRoad,courseLength:course.length,mistBanks:course.def.effects?.valleyMist} : {})});
  const groundMat=course.def.practice?new THREE.MeshStandardMaterial({map:surfaceTexture('gravel'),bumpMap:surfaceTexture('gravel'),bumpScale:.06,color:0xd0b28a,roughness:1,vertexColors:true}):createTerrainMaterial({earth:groundTexture('color'),grass:meadowTexture(),city:surfaceTexture('asphalt'),rock:rockTexture('alpine'),normal:groundTexture('normal'),roughness:groundTexture('roughness')});
  if(winter)winterTerrainMaterial(groundMat,course.def.snowWorld.drifts===true,course.def.snowWorld.variation===true,course.def.snowWorld);
  const terrainFor=geometry=>winter?applySnowTerrain(geometry,course):geometry;
  const cream = new THREE.MeshStandardMaterial({ color: 0xe8d2a5, roughness: .8 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd8a943, roughness: .85 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: .8 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa6aaa5, metalness: .55, roughness: .57 });
  // The ground depends on the course alone, so a preload (terrain-preload.js) may already have worked it out.
  const preloaded=preload?.take(course,winter)??null;
  const terrain = new THREE.Mesh(preloaded?preloaded.terrain:terrainFor(terrainGeometry(course)), groundMat); terrain.receiveShadow = true; group.add(terrain);
  const farTerrain = new THREE.Mesh(preloaded?preloaded.farTerrain:terrainFor(farTerrainGeometry(course)), groundMat); farTerrain.receiveShadow = true; group.add(farTerrain);
  const trailMat=new THREE.MeshStandardMaterial({map:surfaceTexture('gravel'),bumpMap:surfaceTexture('gravel'),bumpScale:.035,color:course.def.arena?0xb39372:0xbeb4a3,roughness:1});
  const road = new THREE.Mesh(strip(course, s=>-course.roadHalfWidthAt(s), s=>course.roadHalfWidthAt(s), .035), course.def.arena||course.def.offroad?trailMat:roadMat); road.receiveShadow = true; group.add(road);
  const shoulder = createPavedShoulderMaterial({gravel:surfaceTexture('gravel'),alpine,course});
  for (const side of [-1, 1]) {
    if(course.def.offroad||course.def.arena)addTrailShoulder(group,course,side,trailMat);
    else{
      const shoulderStrip=strip(course, s=>side*course.roadHalfWidthAt(s), s=>side*(course.roadHalfWidthAt(s)+ROAD_SHOULDER_WIDTH), .018);
      // Authored circuits and opt-in GP entry widths share their actual vertex road edge.
      if (course.script || (course.def.grandPrix && course.def.grandPrixEntryWidth)) {
        const uv = shoulderStrip.attributes.uv, edge = new Float32Array(uv.count);
        for (let i = 0; i < uv.count; i++) edge[i] = course.roadHalfWidthAt(uv.getY(i) * 10);
        shoulderStrip.setAttribute('shoulderEdge', new THREE.BufferAttribute(edge, 1));
      }
      group.add(new THREE.Mesh(shoulderStrip, shoulder));
    }
    if(!course.def.arena&&!course.def.offroad){
      // A race circuit (`markings: 'circuit'`) has white edge lines and no centre line.
      const race = course.def.markings === 'circuit';
      const edge = new THREE.Mesh(strip(course, s=>side*(course.roadHalfWidthAt(s)-(race?.55:.45)), s=>side*(course.roadHalfWidthAt(s)-.28), .057), race?white:cream);
      edge.userData.roadMarking = 'edge';group.add(edge);
      if(!race){
        // One solid yellow centre line for the Japanese mountain pass.
        // Keep the default double line on every existing road.
        if (course.def.markings === 'single-yellow' && side < 0) continue;
        const single = course.def.markings === 'single-yellow';
        const centre = new THREE.Mesh(strip(course, single ? -.075 : side * .12,
          single ? .075 : side * .22, .058), yellow);
        centre.userData.roadMarking = 'centre';group.add(centre);
      }
    }
  }
  if(course.script)addTrackScriptScene(group,course,{snow:winter,
    ...(course.def.dampRoad !== undefined ? {roadMaterial:roadMat} : {})});
  if(course.def.dampRoad !== undefined)bindPavedDampRoad(group,course,roadMat);
  addCircuitWater(group,course);addRoadGlow(group,course);addNightGlows(group,course);addWaterside(group,course);
  for(const theme of new Set(course.sections.map(s=>s.theme))){
    if(theme==='arena')continue;
    const view=Object.create(course);view.def={...course.def,theme};view.features={...course.features};
    for(const field of ['mountains','trees','rocks'])view.features[field]=course.features[field].filter(p=>p.theme===theme);
    if(winter){view.def={...view.def,...(!course.def.snowWorld.mixed||theme==='alpine'?{theme:'alpine',winterMountainCaps:true}:{})};view.features.trees=view.features.trees.filter(tree=>!winterTrees.has(tree.id));
      view.features.rocks=view.features.rocks.filter(rock=>!winterRocks.has(rock));}
    view.features.mountains=filterMuddyHollowMountains(course,view.features.mountains);
    view.detailSections=course.sections.filter(s=>s.theme===theme);
    const updateLandscape=addLandscape(group,view,trackKits);if(updateLandscape)registerSceneSystem(group,{sync:updateLandscape});
    addLandscapeDetail(group,view,theme==='alpine',{omitFoliageAt});
  }
  addFurniture(group, course, metal);
  const crushables=addArenaCrushables(group,course);if(crushables)registerSceneSystem(group,{sync:crushables.userData.updateSimulation});
  for(const cut of course.features.shortcuts){
    const paved=cut.surface==='paved',gravel=roadBranchMaterial(course,cut,paved?roadMat:trailMat,winter);
    const path=new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)-cut.halfWidth,s=>course.shortcutOffset(cut,s)+cut.halfWidth,.065,cut.start,cut.end,true),gravel);path.receiveShadow=true;group.add(path);
    if(paved)for(const side of[-1,1])group.add(new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)+side*(cut.halfWidth-.35),s=>course.shortcutOffset(cut,s)+side*(cut.halfWidth-.2),.078,cut.start,cut.end,true),cream));
    for(let s=cut.start+25;s<cut.end-20;s+=40)for(const side of[-1,1]){const p=course.groundAt(s,course.shortcutOffset(cut,s)+side*(cut.halfWidth+.7));box(group,[.13,1.25,.13],[p.x,p.y+.625,p.z],yellow);}
  }
  for(const branch of course.def.roadBranches ?? []){
    const s=branch.start-45;
    for(const [off,top,bottom] of [[8,'GALLERY','LEFT / SHELTER'],[-8,'OPEN ROAD','RIGHT / EXPOSED']]){
      const p=course.groundAt(s,off);
      addSign(group,{...p,id:`${branch.id}-sign-${off}`,s,off,top,bottom,bg:'#294c54',posts:[-1.8,1.8].map(localX=>({localX,y:p.y,halfX:.1,halfZ:.1,height:4}))});
    }
  }
  if(course.hiddenRoad){
    addHiddenRoad(group,course);const hint=createHiddenRoadHint(course);group.add(hint);
    registerSceneSystem(group,{sync:hint.userData.sync,animate:hint.userData.animate});
  }
  const muddyHollow=course.muddyHollow&&createMuddyHollowScene(course,{textures:{earth:groundTexture('color'),grass:meadowTexture(),city:surfaceTexture('asphalt'),rock:rockTexture('alpine'),normal:groundTexture('normal'),roughness:groundTexture('roughness'),mud:hollowMudTexture()}});
  if(muddyHollow){
    group.add(muddyHollow.group);
    registerSceneSystem(group,{animate:muddyHollow.animate,sync:muddyHollow.sync});
  }
  for(const lane of course.features.passingLanes){
    for(let s=lane.start+55;s<lane.end-50;s+=18)for(const side of[-1,1])group.add(new THREE.Mesh(strip(course,side*6.45,side*6.6,.07,s,s+7),cream));
  }
  const signGroups=new Map();
  for(const sign of course.features.signs)signGroups.set(sign.id,addSign(group,sign));
  if(signGroups.size)registerSceneSystem(group,{sync:makeSignFallSystem(signGroups)});
  for(const station of course.features.stations)addStation(group, station);
  for(const direction of[-1,1]){
    const update=addTurnSigns(group,course.features.chevrons.filter(sign=>sign.direction===direction),direction);
    if(update)registerSceneSystem(group,{sync:update});
  }
  if(course.sections.some(s=>s.theme==='coast'))addCoast(group,course);
  if(course.sections.some(s=>s.theme==='city'))addHarbor(group,course);
  addCitySkyline(group,course);
  addCityParking(group,course);
  addSceneryDetail(group,course);addStreetFacades(group,course);
  if(course.def.practice)addFreestyleScenery(group,course);else addRaceStructures(group,course);
  addCourseLandmarks(group,course);
  addRallyDetail(group,course);
  if(!course.def.practice)addFinish(group, course);
  addCheckpointGates(group,course);
  addCircuitLandmarks(group,course);
  if (trackKits || course.def.kitPlacements?.length || winter) {
    const kits = trackKits ?? createTrackKits(course);
    if(course.def.ridgeLandform)finishRidgeKitMaterials(kits);
    bindTrackKits(group,kits);
    registerSceneSystem(group,{sync:kits.sync,dispose:kits.dispose});
    if(winter){const snowOwner=createSnowWorld(course,{kits});bindSnowWorld(group,snowOwner);
      registerSceneSystem(group,{dispose:snowOwner.dispose});}
  }
  return group;
}

function createPitEnvironment(course) {
  const group = new THREE.Group();group.name = 'The Pit';
  const dirt = new THREE.MeshStandardMaterial({map:surfaceTexture('gravel'),
    bumpMap:surfaceTexture('gravel'),bumpScale:.035,color:0xb39372,roughness:1});
  const outsideMaterial = new THREE.MeshStandardMaterial({color:0x6c5848,roughness:1});
  const outside = new THREE.Mesh(new THREE.CircleGeometry(180,96),outsideMaterial);
  outside.rotation.x=-Math.PI/2;outside.position.y=-.04;outside.receiveShadow=true;group.add(outside);
  const floor = new THREE.Mesh(strip(course,-32,32,.035),dirt);
  floor.name='Pit physical floor';floor.receiveShadow=true;group.add(floor);
  const junk=addArenaCrushables(group,course);
  registerSceneSystem(group,{sync:junk.userData.updateSimulation});
  addRaceStructures(group,course);
  addPitSalvageScenery(group,course);
  return group;
}

function addPitSalvageScenery(world, course) {
  // Reuse the released hulk kit as instanced scenery. Only the eight native
  // floor cars move; this static assembly never writes physical features.
  const prototypeWorld = new THREE.Group();
  const feature = {...course.features.crushables[0],x:0,y:0,z:0,heading:0};
  addArenaCrushables(prototypeWorld,{features:{crushables:[feature]}});
  prototypeWorld.updateMatrixWorld(true);
  const poses=[];
  const wallRadius=course.def.pit.wallRadius;
  for(let tier=0;tier<3;tier++){
    // Overlap lower bodies across every physical wall span. Upper stacks can
    // remain irregular without leaving an invisible bumper-height boundary.
    const count=tier===0?128:64;
    for(let index=0;index<count;index++){
      const angle=index/count*Math.PI*2;
      poses.push({x:Math.cos(angle)*wallRadius,z:Math.sin(angle)*wallRadius,
        y:tier*1.1,heading:-angle,roll:tier%2?.04:-.03,flatten:.82});
    }
  }
  for(let tier=0;tier<4;tier++){
    const count=tier===3?3:8,radius=tier===3?2:5-tier*.7;
    for(let index=0;index<count;index++){
      const angle=index/count*Math.PI*2+tier*.4;
      poses.push({x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,y:tier*.95,
        heading:angle+.6,roll:Math.sin(index)*.09,flatten:.75});
    }
  }
  const stadium=pitStadiumFrame(new Course(SCRAPDOME_VENUE,course.seed));
  const scrapRng=makeRng((course.seed ^ 0x504954) >>> 0);
  for(let index=0;index<20;index++){
    const point=stadium.worldAt((index+.5)/20*stadium.length,28);
    const extent=Math.hypot(point.x,point.z),angle=Math.atan2(point.z,point.x);
    for(let radius=87;radius<extent-9;radius+=18){
      const centreAngle=angle+scrapRng.range(-.025,.025);
      const cx=Math.cos(centreAngle)*radius,cz=Math.sin(centreAngle)*radius;
      // Broad interlocked feet support progressively smaller, crossed stacks.
      // Pile placement stays outside the circular wall and consumes its own RNG.
      for(const [tier,count,spread]of[[0,8,3.6],[1,5,2.3],[2,2,.8]]){
        const turn=scrapRng.range(0,Math.PI*2);
        for(let hulk=0;hulk<count;hulk++){
          const around=turn+hulk/count*Math.PI*2;
          const reach=spread+scrapRng.range(-.7,.7);
          poses.push({x:cx+Math.cos(around)*reach,z:cz+Math.sin(around)*reach,
            y:tier*.85+scrapRng.range(0,.1),heading:around+scrapRng.range(-.8,.8),
            pitch:scrapRng.range(-.12,.12),roll:scrapRng.range(-.2,.2),
            flatten:scrapRng.range(.65,.85)});
        }
      }
    }
  }
  const scenery=new THREE.Group();scenery.name='Pit hulk wall, centre pile and oval-end scrap';
  const object=new THREE.Object3D(),matrix=new THREE.Matrix4();
  prototypeWorld.traverse(part=>{
    if(!part.isMesh)return;
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,poses.length);
    mesh.name='Reused salvage kit';mesh.castShadow=mesh.receiveShadow=true;
    for(let index=0;index<poses.length;index++){
      const pose=poses[index];object.position.set(pose.x,pose.y,pose.z);
      object.rotation.set(pose.pitch||0,pose.heading,pose.roll);object.scale.set(1,pose.flatten,1);object.updateMatrix();
      matrix.multiplyMatrices(object.matrix,part.matrixWorld);mesh.setMatrixAt(index,matrix);
      mesh.setColorAt(index,new THREE.Color(index%3===0?0xa88c72:index%3===1?0x80938a:0xb38b73));
    }
    mesh.computeBoundingSphere();scenery.add(mesh);
  });
  // Every prototype geometry/material is now owned by the instanced meshes.
  // DisposeTree deduplicates shared resources when this environment unloads.
  prototypeWorld.clear();world.add(scenery);
  scenery.userData.wallRadius=wallRadius;scenery.userData.pileRadius=course.def.pit.pileRadius;
}

// The prepared bed and collision-aligned greybox remain playable while local
// Blender scenery loads, and are retained for an exact EGG-01 cost comparison.
function addHiddenRoad(group, course) {
  const road = course.hiddenRoad, root = new THREE.Group(); root.name = 'Hidden Road';
  const dirt = new THREE.MeshStandardMaterial({ color: 0x9d8463, roughness: 1,
    map: surfaceTexture('gravel'), bumpMap: surfaceTexture('gravel'), bumpScale: .035 });
  const rut = new THREE.MeshStandardMaterial({ color: 0x716348, roughness: 1 });
  const preparedGround = new THREE.Mesh(hiddenRoadGroundGeometry(course), dirt);
  preparedGround.receiveShadow = true; root.add(preparedGround);
  const ribbon = (left, right, start, end, lift, material) => {
    const vertices = [], uv = [], indices = [];
    for (let progress = start, row = 0; progress <= end; progress += 2, row++) {
      for (const side of [left, right]) {
        const offset = typeof side === 'function' ? side(progress) : side;
        const pose = road.poseAt(progress, offset);
        const ground = course.groundAt(pose.s, pose.lateral);
        vertices.push(pose.x, ground.y + lift, pose.z); uv.push(offset / 4, progress / 8);
      }
      if (row) { const n = row * 2; indices.push(n - 2, n, n - 1, n, n + 1, n - 1); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; root.add(mesh);
  };
  // Two worn tracks at the mouth; the broad prepared bed starts behind the bend.
  ribbon(p => -road.widthAt(p), p => road.widthAt(p), 54, road.length, .09, dirt);
  for (const side of [-1, 1]) ribbon(side * 1.15 - .23, side * 1.15 + .23, 0, 180, .10, rut);
  const bankMaterial = new THREE.MeshStandardMaterial({ color: 0xa5825b,
    map: rockTexture('desert'), roughness: 1 });
  const banks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), bankMaterial, road.walls.length);
  banks.name = 'Dry wash banks'; banks.castShadow = true; banks.receiveShadow = true;
  const transform = new THREE.Object3D();
  road.walls.forEach((wall, i) => {
    transform.position.set(wall.x, wall.y + wall.height * .42, wall.z);
    transform.rotation.set(0, wall.heading, 0); transform.scale.set(5, wall.height * .7, 7);
    transform.updateMatrix(); banks.setMatrixAt(i, transform.matrix);
  });
  root.add(banks);
  const rustwall = createRustwallScene(course);
  root.add(rustwall.group);
  const yard = createScrapdomeYard(course);
  root.add(yard.group);
  rustwall.ready.then(() => {
    if (rustwall.group.getObjectByName('Rustwall wash')) banks.visible = false;
  });
  const rust = new THREE.MeshStandardMaterial({ color: 0x69442d, roughness: .94 });
  const postPose = road.poseAt(13, 4.2), post = new THREE.Mesh(new THREE.BoxGeometry(.17, 1.8, .16), rust);
  post.position.set(postPose.x, postPose.y + .8, postPose.z); post.rotation.z = .18; root.add(post);
  const dead = new THREE.MeshStandardMaterial({ color: 0x756347, roughness: 1 });
  const cactusGeometry = new THREE.CylinderGeometry(.11, .16, 1.7, 5);
  for (let progress = 20; progress <= 60; progress += 10) {
    const pose = road.poseAt(progress, 5.6), cactus = new THREE.Mesh(cactusGeometry, dead);
    cactus.position.set(pose.x, pose.y + .75, pose.z); cactus.rotation.z = .12 * Math.sin(progress);
    root.add(cactus);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.065, .09, .65, 5), dead);
    arm.position.set(pose.x + .27, pose.y + .9, pose.z); arm.rotation.z = -.9; root.add(arm);
  }
  group.add(root);
}

function addLandscape(group,course,trackKits){
  addMountainLandscape(group,course);
  const trees=course.features.trees.filter(tree=>!rampClearsScenery(course,tree)); // DEEP-RAMP-2
  const pine=course.def.theme!=='desert';
  if(pine)return usesBeeches(course)
    ?addPineTrees(group,trees,course,{kits:trackKits}):addPineTrees(group,trees,course);
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
