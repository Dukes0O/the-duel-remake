import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createTrackKits} from '../src/track-kits.js';
import {addLandscapeDetail} from '../src/landscape-detail.js';
import {disposeTree} from '../src/world.js';
import {terrainGeometry,farTerrainGeometry} from '../src/world-surfaces.js';
import {Course} from '../src/course.js';
import {createSceneLighting} from '../src/scene-lighting.js';
import {resolveLightingSettings} from '../src/lighting-moods.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {winterRanges,gripFor,SURFACES} from '../src/race-surfaces.js';
import {snowWorldPlacements,snowPineIds,winterWeight,applySnowTerrain,
  snowSceneryPose,createSnowWorld,SNOW_LIMITS,winterTerrainMaterial,winterLightingSettings} from '../src/snow-world.js';
const def={id:'winter-qa',stage:90,name:'Winter QA',theme:'alpine',closed:true,laps:3,
  hasRival:true,hasRadar:false,noTraffic:true,airborne:true,layoutVersion:1,
  scenery:{trees:80,rocks:20,mountains:false},script:[
    ['straight',500,{name:'Lodge',width:16,surface:'snow',walls:'none'}],
    ['turn','L',180,80,{walls:'none'}],
    ['straight',500,{name:'Ridge',width:16,surface:'snow',walls:'none'}],
    ['turn','L',180,80,{walls:'none'}]],
  surfacePatches:[{id:'forest-ice',kind:'ice',s0:520,s1:555,shaded:true}],
  snowWorld:{ranges:[{from:0,to:750}],exposed:[{from:520,to:700}],ponds:[{s:180,lateral:32,radiusX:9,radiusZ:5}]}};
const course=new Course(def,1989),dry=new Course({...def,snowWorld:undefined},1989);
assert.deepEqual(winterRanges(course.script,undefined),[]);
assert.throws(()=>winterRanges(course.script,{ranges:[{from:5,to:4}]}));
assert.throws(()=>winterRanges(course.script,{ranges:[{from:0,to:20},{from:10,to:30}]}));
assert.equal(winterWeight(course,200),1);assert.equal(winterWeight(course,1000),0);
assert.ok(winterWeight(course,745)<1);assert.equal(winterWeight(dry,200),0);
const patch=course.features.surfacePatches.find(row=>row.snowBank&&row.from>0);
assert.equal(course.gripKindAt((patch.s0+patch.s1)/2,(patch.from+patch.to)/2),'deep-snow');
assert.equal(dry.gripKindAt(200,9),'asphalt');
assert.equal(SURFACES['deep-snow'].topSpeedMph,45);
assert.ok(gripFor('deep-snow','winter').grip>gripFor('deep-snow','summer').grip);
// Physics owns the verge surface and decelerates a genuine input-driven car.
COURSE.push(def);
try{
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:COURSE.length-1,
    car:'falcone_f42',mode:'timetrial',difficulty:'casual',tyre:'winter'});
  const lane=duel.course.features.surfacePatches.find(row=>row.snowBank&&row.from>0),state=duel.state;
  Object.assign(state,{s:40,lateral:(lane.from+lane.to)/2,status:'racing',speedMph:90,gear:2});
  duel.setInput({throttle:1,brake:0,steer:0,boost:false});
  for(let i=0;i<240;i++)duel._drive(1/120);
  assert.equal(duel.course.gripKindAt(state.s,state.lateral),'deep-snow');
  assert.ok(state.speedMph<=45.05,'real deep-snow driving settles at or below 45 mph');
  assert.ok(state.s>40,'the bank is a driving surface, not a visible-only overlay');
}finally{COURSE.pop();}
const before=JSON.stringify(course.features),placements=snowWorldPlacements(course);
const seededControl=new Course(def,1989);
assert.equal(course.rng.float(),seededControl.rng.float(),'presentation never consumes course RNG');
assert.ok(placements.length);assert.equal(JSON.stringify(course.features),before);
assert.deepEqual(placements,snowWorldPlacements(new Course(def,1989)),'separate seeded presentation repeats');
assert.ok(placements.every(Object.isFrozen));
for(const placement of placements.filter(row=>row.id==='plough-bank')){
  assert.ok(course.features.surfacePatches.includes(placement.physicalPatch));
  assert.ok(placement.s>=placement.physicalPatch.s0&&placement.s<=placement.physicalPatch.s1);
}
assert.equal(snowPineIds(course).size,placements.filter(row=>row.id==='snow-pine').length);
assert.deepEqual(snowWorldPlacements(dry),[]);
const geom=new THREE.BufferGeometry();
const a=course.groundAt(200,20),b=course.groundAt(1100,20);
geom.setAttribute('position',new THREE.Float32BufferAttribute([a.x,a.y,a.z,b.x,b.y,b.z],3));
applySnowTerrain(geom,course);
assert.equal(geom.attributes.winterWeight.getX(0),1);assert.equal(geom.attributes.winterWeight.getX(1),0);
const tree=course.features.trees.find(row=>snowPineIds(course).has(row.id));assert.ok(tree);
const upright=snowSceneryPose(tree,[],0),fallen=snowSceneryPose(tree,[{kind:'tree',id:tree.id,
  atTime:0,directionX:1,directionZ:0,outcome:'knock'}],1);
assert.notDeepEqual(upright.elements,fallen.elements);
assert.deepEqual(snowSceneryPose(tree,[],1).elements,upright.elements,'reset restores upright kit');
const renderedUpright=upright.clone();renderedUpright.elements[13]+=2;
assert.deepEqual(snowSceneryPose(tree,[],1,renderedUpright).elements,renderedUpright.elements,
  'kit reset restores its actual rendered-ground anchor');
const anchoredFall=snowSceneryPose(tree,[{kind:'tree',id:tree.id,atTime:0,
  directionX:1,directionZ:0,outcome:'knock'}],1,renderedUpright);
assert.equal(anchoredFall.elements[13],renderedUpright.elements[13],
  'broken Snow kit keeps its prepared ground pivot');
assert.equal(new THREE.Vector3().setFromMatrixScale(snowSceneryPose(tree,[{kind:'tree',id:tree.id,
  atTime:0,directionX:1,directionZ:0,outcome:'obliterate'}],100)).length(),0);
for(const high of [true,false]){
  const owner={placements,getPlacementPose:()=>new THREE.Matrix4(),setPlacementPose(){}};
  const snow=createSnowWorld(course,{kits:owner,high}),state={status:'racing',stageTimeSec:0,s:200,brokenScenery:[],opponents:[]};
  const witness=JSON.stringify(state),camera=new THREE.PerspectiveCamera();camera.position.set(a.x,a.y+3,a.z);
  for(let n=0;n<200;n++)snow.update({state,camera,dt:1/60,high,vehicles:[]});
  assert.equal(JSON.stringify(state),witness,'weather reads native state only');
  const mesh=new THREE.Group();mesh.userData.grounding={wheels:[
    {x:-1,z:-1.4,contactY:0},{x:1,z:-1.4,contactY:0}],contactY:0};
  const actor={s:200,speedMph:30,airHeight:0};
  for(let n=0;n<1200;n++){
    const s=100+(n%300)*.8,p=course.groundAt(s,0);mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=p.heading;
    const frame={...state,s,stageTimeSec:n/60};snow.update({state:frame,camera,dt:1/60,high,vehicles:[{state:actor,mesh}]});
  }
  assert.ok(snow.stats.liveMarks>0,'observed rear wheels leave genuine snow contact tracks');
  assert.ok(snow.stats.liveMarks<=(high?SNOW_LIMITS.high.marks:SNOW_LIMITS.performance.marks));
  for(let n=0;n<100;n++)snow.update({state:{...state,stageTimeSec:25},camera,dt:.1,high,vehicles:[]});
  assert.equal(snow.stats.liveMarks,0,'tracks expire without unbounded scene growth');
  assert.equal(snow.stats.flakes,high?SNOW_LIMITS.high.flakes:SNOW_LIMITS.performance.flakes);
  assert.ok(snow.stats.liveMarks<=(high?SNOW_LIMITS.high.marks:SNOW_LIMITS.performance.marks));
  snow.dispose();snow.dispose();assert.equal(snow.group.children.length,0);
  snow.update({state,camera,dt:1,high,vehicles:[]});assert.equal(snow.group.children.length,0);
}
const malformedRidge=new Course({...def,snowWorld:{...def.snowWorld,exposed:{from:0,to:50}}},1989);
assert.throws(()=>createSnowWorld(malformedRidge),/Exposed ridges/,'invalid ridge metadata fails clearly');
const crossingPond=new Course({...def,snowWorld:{...def.snowWorld,ponds:[{s:748,lateral:32,radiusX:9,radiusZ:5}]}},1989);
assert.throws(()=>createSnowWorld(crossingPond),/frozen pond/i,'the full pond stays inside winter ranges');
const material=new THREE.MeshStandardMaterial();
material.onBeforeCompile=shader=>{shader.uniforms.prior={value:42};};
material.customProgramCacheKey=()=> 'prior-terrain';
const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
winterTerrainMaterial(material).onBeforeCompile(shader);
assert.equal(shader.uniforms.prior.value,42,'snow composes the real terrain shader');
assert.ok(shader.vertexShader.includes('vWinterWeight=winterWeight'));
assert.ok(shader.fragmentShader.includes('clamp(vWinterWeight,0.0,1.0)'));
assert.equal(material.customProgramCacheKey(),'prior-terrain-winter-v1');
material.dispose();geom.dispose();
// Actual approved High/LOD meshes must fit the exact physical bands on bends.
const parser=new GLTFLoader();
parser.register(()=>({name:'SNOW_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const realKits=createTrackKits(course,{extraPlacements:placements,
  loadAsset:async path=>{const bytes=await readFile(new URL('../public'+path,import.meta.url));
    return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}});
assert.equal(await realKits.ready,true,realKits.error?.message);
assert.equal(JSON.stringify(course.features),before,'real kit validation never changes physical features');
realKits.update({high:true,position:course.groundAt(200,0),state:{status:'racing'}});
assert.ok(realKits.stats.high>0);
realKits.update({high:false,position:course.groundAt(200,0),state:{status:'racing'}});
assert.equal(realKits.stats.low,placements.length);
const pineIndex=realKits.placements.findIndex(row=>row.id==='snow-pine');
const originalKitPose=realKits.getPlacementPose(pineIndex),boundTree=course.features.trees.find(t=>t.id===realKits.placements[pineIndex].scenery.id);
const snowOwner=createSnowWorld(course,{kits:realKits});
snowOwner.update({state:{status:'racing',s:200,stageTimeSec:1,brokenScenery:[
  {kind:'tree',id:boundTree.id,atTime:0,directionX:1,directionZ:0,outcome:'knock'}]},dt:0});
assert.notDeepEqual(realKits.getPlacementPose(pineIndex).elements,originalKitPose.elements);
snowOwner.update({state:{status:'racing',s:200,stageTimeSec:1,brokenScenery:[]},dt:0});
assert.deepEqual(realKits.getPlacementPose(pineIndex).elements,originalKitPose.elements,
  'the actual approved asset restores its prepared terrain pose');
const snowMaterials=new Set();realKits.group.traverse(node=>{
  for(const material of [].concat(node.material??[]))if(material.name.includes('worn snow'))snowMaterials.add(material);
});
assert.ok(snowMaterials.size>=4,'approved High/LOD pieces expose their real snow materials');
for(const material of snowMaterials){
  assert.deepEqual(material.color.toArray(),[.78,.8,.82],'actual owner snow albedo preserves shading headroom');
  assert.equal(material.roughness,.94,'approved snow retains a rough surface');
}
assert.ok(realKits.placements.filter(row=>row.id==='plough-bank').every(row=>row.scale[1]>1),
  'real approved banks rise while the original exact footprint check remains');
snowOwner.dispose();realKits.dispose();
const liveCourse=new Course(def,1989),livePlacements=snowWorldPlacements(liveCourse);
const menuBank=placements.find(row=>row.physicalPatch),liveBank=livePlacements.find(row=>row.physicalPatch);
assert.notEqual(menuBank.physicalPatch,liveBank.physicalPatch,'equivalent menu/race Courses own different physical patches');
assert.ok(liveCourse.features.surfacePatches.includes(liveBank.physicalPatch));
assert.ok(!liveCourse.features.surfacePatches.includes(menuBank.physicalPatch));
// Omission happens after seeded generation: every retained dry instance is exact.
const originalTextureLoad=THREE.TextureLoader.prototype.load,loadedTextures=[];
THREE.TextureLoader.prototype.load=function(path){const texture=new THREE.Texture();
  const row={path,texture,disposed:0};texture.addEventListener('dispose',()=>row.disposed++);
  loadedTextures.push(row);return texture;};
const baselineDetail=new THREE.Group(),winterDetail=new THREE.Group(),emptyFoliage=new THREE.Group();
try{
  addLandscapeDetail(baselineDetail,course,true);
  addLandscapeDetail(winterDetail,course,true,{omitFoliageAt:(x,z)=>winterWeight(course,course.nearest(x,z).s)>0});
  const foliage=group=>{const result=new Map();group.traverse(mesh=>{
    if(mesh.userData.landscapeCell?.kind!=='foliage')return;
    const ids=mesh.userData.landscapeCell.indices;
    for(let i=0;i<mesh.count;i++)result.set(ids[i],{matrix:[...mesh.instanceMatrix.array.slice(i*16,(i+1)*16)],
      color:[...mesh.instanceColor.array.slice(i*3,(i+1)*3)]});});return result;};
  const original=foliage(baselineDetail),retained=foliage(winterDetail);
  assert.ok(retained.size>0&&retained.size<original.size,'only actual winter grass instances are removed');
  for(const [id,row] of retained)assert.deepEqual(row,original.get(id),'dry placement and tint retain the original RNG sequence');
  const loadedBefore=loadedTextures.length;
  addLandscapeDetail(emptyFoliage,course,true,{omitFoliageAt:()=>true});
  assert.equal(foliage(emptyFoliage).size,0);
  assert.equal(loadedTextures.slice(loadedBefore).find(row=>row.path.includes('meadow-grass')).disposed,1,
    'all-omitted summer grass releases its orphan texture');
}finally{
  THREE.TextureLoader.prototype.load=originalTextureLoad;
  disposeTree(baselineDetail);disposeTree(winterDetail);disposeTree(emptyFoliage);
}
// Authored curved pond crosses the actual near/far overlap, not an analytic plane.
const pondCourse=new Course({...def,terrainHalfWidth:64,snowWorld:{...def.snowWorld,
  ponds:[{s:600,lateral:58,radiusX:12,radiusZ:8}]}},1989);
const pondOwner=createSnowWorld(pondCourse),pond=pondOwner.group.getObjectByName('Frozen winter pond');
const actualMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),
  actualNear=new THREE.Mesh(terrainGeometry(pondCourse),actualMaterial),
  actualFar=new THREE.Mesh(farTerrainGeometry(pondCourse),actualMaterial),
  pondRay=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
let witnessedNear=0,witnessedFar=0,witnessedOverlap=0;
for(let i=0;i<pond.geometry.attributes.position.count;i++){
  const vertices=pond.geometry.attributes.position;
  pondRay.set(new THREE.Vector3(vertices.getX(i),2000,vertices.getZ(i)),down);
  const hits=pondRay.intersectObjects([actualNear,actualFar],false);
  assert.ok(hits.length,'every curved pond vertex has actual drawn terrain beneath it');
  assert.ok(Math.abs(vertices.getY(i)-hits[0].point.y-.055)<1e-4,
    'pond follows the upper actual Float32 terrain triangle, including overlaps');
  if(hits[0].object===actualNear)witnessedNear++;
  if(hits[0].object===actualFar)witnessedFar++;
  if(hits.some(hit=>hit.object===actualNear)&&hits.some(hit=>hit.object===actualFar))witnessedOverlap++;
}
assert.ok(witnessedNear&&witnessedFar&&witnessedOverlap,'curved near/far and overlapping drawn triangles are exercised');
pondOwner.dispose();actualNear.geometry.dispose();actualFar.geometry.dispose();actualMaterial.dispose();
const unsupportedPond=new Course({...def,terrainHalfWidth:64,snowWorld:{...def.snowWorld,
  ponds:[{s:180,lateral:5000,radiusX:9,radiusZ:5}]}},1989);
assert.throws(()=>createSnowWorld(unsupportedPond),/actual rendered terrain/,
  'a pond outside the actual terrain fails without an analytic fallback');
const clusteredDef={...def,snowWorld:{...def.snowWorld,pineClusters:[
  {s:180,lateral:32,count:5},{s:580,lateral:-36,count:5}]}};
const clusteredCourse=new Course(clusteredDef,1989),clusteredBefore=JSON.stringify(clusteredCourse.features);
const clusteredRows=snowWorldPlacements(clusteredCourse),extraPines=clusteredRows.filter(row=>row.id==='snow-pine'&&!row.scenery);
assert.equal(extraPines.length,10,'authored winter clusters add genuine approved pines');
assert.deepEqual(clusteredRows,snowWorldPlacements(new Course(clusteredDef,1989)),'separate cluster RNG repeats exactly');
assert.equal(JSON.stringify(clusteredCourse.features),clusteredBefore,'clusters never edit physical features');
assert.throws(()=>snowWorldPlacements(new Course({...def,snowWorld:{...def.snowWorld,
  pineClusters:[{s:180,lateral:32,count:1000}]}},1989)),/bounded authored winter centre/,'cluster memory count is bounded');
const clusterKits=createTrackKits(clusteredCourse,{extraPlacements:clusteredRows,
  loadAsset:async path=>{const bytes=await readFile(new URL('../public'+path,import.meta.url));
    return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}});
assert.equal(await clusterKits.ready,true,clusterKits.error?.message);
assert.equal(clusterKits.placements.filter(row=>row.id==='snow-pine'&&!row.scenery).length,10,
  'all clustered approved High/LOD meshes pass actual anchoring and clearance');
clusterKits.dispose();
// Round-two palette checks precede appearance code. Dry presets and owners stay exact.
const paletteLoader=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
try {
  const scene=new THREE.Scene(),renderer={toneMappingExposure:1},bloom={strength:.2},host={dataset:{}};
  const target=new THREE.WebGLRenderTarget(1,1);
  const lighting=createSceneLighting({scene,renderer,bloom,host},{
    createPMREM:()=>({fromScene:()=>target,dispose(){}}),
    createRoom:()=>({dispose(){}}),loadEnvironment(){},
  });
  const sky=scene.getObjectByName('Atmosphere and cloud deck'),hemi=scene.children.find(node=>node.isHemisphereLight);
  const graph=scene.children.map(node=>node.uuid);
  const paletteColor=value=>Array.isArray(value)?new THREE.Color().setRGB(...value):new THREE.Color(value);
  const observed=()=>({exposure:renderer.toneMappingExposure,bloom:bloom.strength,
    top:sky.material.uniforms.top.value.toArray(),horizon:sky.material.uniforms.horizon.value.toArray(),
    fog:scene.fog.color.toArray(),cloudTint:sky.material.uniforms.cloudTint.value.toArray(),
    ground:hemi.groundColor.toArray(),sunColour:lighting.sun.color.toArray(),
    sun:lighting.sun.intensity,env:scene.environmentIntensity});
  for(const theme of ['coast','alpine','desert','city','arena'])for(const mood of ['clear','golden','overcast']){
    const current={def:{theme},features:{poles:[]}},base=resolveLightingSettings(theme,{mood});
    const original=JSON.stringify(base);
    lighting.apply({course:current,mood});const dryBefore=observed();
    const winter=winterLightingSettings(base);
    assert.equal(JSON.stringify(base),original,'winter palette never mutates cached dry settings');
    assert.equal(resolveLightingSettings(theme,{mood}),base,'dry preset object remains exact');
    assert.ok(winter.exposure>0&&winter.exposure<base.exposure,'winter exposure retains slope detail');
    assert.ok(winter.bloom>0&&winter.bloom<base.bloom,'winter Bloom is reduced and remains enabled');
    assert.deepEqual(winter.sunOffset,base.sunOffset,'winter palette preserves actual sun path');
    assert.equal(winter.sun,base.sun,'winter palette preserves timed sunlight intensity');
    for(const color of [winter.top,winter.horizon,winter.ground,winter.sunColor])
      assert.ok(paletteColor(color).toArray().every(Number.isFinite),'winter palette uses finite native colours');
    lighting.apply({course:current,mood,winter:winterLightingSettings});
    assert.equal(renderer.toneMappingExposure,winter.exposure,'real lighting owner applies Snow exposure');
    assert.equal(bloom.strength,winter.bloom,'real lighting owner applies Snow Bloom');
    lighting.apply({course:current,mood});
    assert.deepEqual(observed(),dryBefore,'leaving winter restores exact original native dry settings');
    assert.deepEqual(scene.children.map(node=>node.uuid),graph,'winter palette adds no scene/light owners');
  }
  const timed={...resolveLightingSettings('alpine'),nightAmount:.75,stars:.4,moon:.6};
  const night=winterLightingSettings(timed);
  for(const key of ['nightAmount','stars','moon','sunOffset','sunStrength'])
    assert.deepEqual(night[key],timed[key],'winter keeps original timed-night field '+key);
  const cool=paletteColor(winterLightingSettings(resolveLightingSettings('alpine')).ground);
  assert.ok(cool.b>cool.r&&cool.b>cool.g,'daytime winter ground lighting gives cool blue shadows');
  const fullNight={...resolveLightingSettings('alpine'),nightAmount:1,
    top:[.015,.025,.05],horizon:[.04,.05,.09],fog:[.03,.04,.07],ground:[.02,.03,.05],sunColor:[.3,.4,.6]};
  const retainedNight=winterLightingSettings(fullNight);
  for(const key of ['top','horizon','fog','ground','sunColor'])
    assert.deepEqual(retainedNight[key],fullNight[key],'linear timed-night palette stays dark/exact: '+key);
  const desert={def:{theme:'desert'},features:{poles:[]}},alpine={def:{theme:'alpine'},features:{poles:[]}};
  lighting.apply({course:desert});
  lighting.apply({course:alpine,winter:winterLightingSettings});
  lighting.apply({course:alpine});
  assert.deepEqual(sky.material.uniforms.top.value.toArray(),new THREE.Color(resolveLightingSettings('alpine').top).toArray(),
    'a different winter base cannot restore the preceding desert palette');
  lighting.dispose();disposeTree(scene);
} finally {THREE.TextureLoader.prototype.load=paletteLoader;}
console.log('Snow ranges, physics bands, kit identity, terrain, poses and bounded read-only lifetime pass.');
