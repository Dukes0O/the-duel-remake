import {isSummitAttack} from './summit-attack.js';
import {beechTreePlacements} from './vegetation.js';
import * as THREE from 'three';
import {renderedGroundHeight} from './rendered-ground.js';
import {escapeFrame} from './escape-roads.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {applyNightWash} from './night-wash.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const TRACK_KIT_IDS = Object.freeze([
  'start-gantry','pit-garage','pit-wall','grandstand','armco','concrete-wall',
  'catch-fence','tyre-wall','braking-board-150','braking-board-100','braking-board-50',
  'marshal-post','lantern-tower','shopfront-a','shopfront-b','neon-sign','lantern-string',
  'harbour-boat','ski-lodge','chairlift-tower','chairlift-cable','chairlift-chair',
  'wooden-dock','autumn-tree','autumn-tree-golden','autumn-tree-copper','snow-pine',
  'snow-ground','snow-rock','plough-bank','gallery','summit-hut','observatory','snowman','yeti',
  'stone-stream-bridge','forest-footbridge','forest-timing-tower','ardennes-beech','summit-finish',
  'armco-white','stone-retaining-wall','curve-mirror','chevron-board','tea-house','vending-row',
  'drystone-wall','hedge-row',
  'torii','torii-small','stone-lantern','kogane-car-park',
  'eifel-castle','dam-wall','eifel-lodge',
]);
const approved = new Set(TRACK_KIT_IDS);
const owners = new WeakMap();
const LOD_DISTANCE = 160;
const CHUNK_LENGTH = 100;
const MAIN_DISTANCE = 900;
const REAR_DISTANCE = 220;
const MAX_REAR_CHUNKS = 3;
const finite = value => Number.isFinite(value);
const fail = message => {throw new Error('Track kit '+message);};

export function normalizeKitPlacements(course, entries) {
  if (!Array.isArray(entries)) fail('placements must be an array.');
  const beeches=entries.some(entry=>entry?.id==='ardennes-beech')
    ?new Map(beechTreePlacements(course).map(row=>[row.scenery.id,row])):null;
  const boundBeeches=new Set();
  return Object.freeze(entries.map(entry => {
    if (!entry || !approved.has(entry.id) || !finite(entry.s) || entry.s < 0 ||
        entry.s > course.length || !finite(entry.lateral) || !finite(entry.heading ?? 0) ||
        !finite(entry.lift ?? 0) || (entry.lift ?? 0) < 0)
      fail('placement has an unknown id or invalid position.');
    const scale = Array.isArray(entry.scale) ? [...entry.scale] : Array(3).fill(entry.scale ?? 1);
    if (scale.length !== 3 || !scale.every(value => finite(value) && value > 0))
      fail('scale must contain three positive finite values.');
    let nodeTranslations;
    if(entry.nodeTranslations!==undefined){
      const values=entry.nodeTranslations;
      if(entry.id!=='gallery'||!(course.def.id==='summit-run'||isSummitAttack(course.def))||entry.s!==10176||!values||
          typeof values!=='object'||Array.isArray(values)||!Object.keys(values).length)
        fail('named translations belong only to the authored Summit Gallery entrance.');
      const names=new Set(['gallery-concrete-pillar','gallery-concrete-pillar.001']);
      const pairs=Object.entries(values).sort(([a],[b])=>a.localeCompare(b));
      if(pairs.some(([name,vector])=>!names.has(name)||!Array.isArray(vector)||vector.length!==3||!vector.every(finite)))
        fail('named translations need approved mesh names and three finite model-local values.');
      nodeTranslations=Object.freeze(Object.fromEntries(pairs.map(([name,vector])=>[name,Object.freeze([...vector])])));
    }
    const worldPosition = entry.worldPosition;
    if (worldPosition !== undefined && (!worldPosition ||
        !['concrete-wall', 'catch-fence', 'tyre-wall'].includes(entry.id) ||
        !finite(worldPosition.x) || !finite(worldPosition.z) ||
        !course.escapeRoads?.some(escape => {
          const {u, v} = escapeFrame(escape, worldPosition.x, worldPosition.z);
          return u > -4 && u < escape.run + 6 && v > escape.inner - 4 && v < escape.outer + 5;
        }))) fail('world position must lie on an existing escape lining.');
    const snowmanId=entry.snowmanId;
    if(snowmanId && (entry.id!=='snowman' || typeof snowmanId!=='string'))fail('snowman binding is invalid.');
    const scenery = entry.scenery;
    if (scenery && (scenery.kind !== 'tree' || typeof scenery.id !== 'string' || !scenery.id))
      fail('scenery binding must name an existing tree.');
    if(entry.id==='ardennes-beech'){
      const expected=beeches?.get(scenery?.id);
      if(!expected||boundBeeches.has(scenery.id)||entry.s!==expected.s||entry.lateral!==expected.lateral||
          (entry.heading??0)!==expected.heading||(entry.lift??0)!==0||scale.some(value=>value!==expected.scale))
        fail('Ardennes beech must bind once to its exact selected existing tree.');
      boundBeeches.add(scenery.id);
    }
    const patch = entry.physicalPatch;
    if (patch && (entry.id !== 'plough-bank' || patch.kind !== 'deep-snow' ||
        !course.features?.surfacePatches?.includes(patch) ||
        ![patch.s0,patch.s1,patch.from,patch.to].every(finite) ||
        patch.s0 < 0 || patch.s1 > course.length || patch.s0 >= patch.s1 || patch.from >= patch.to))
      fail('bank physicalPatch must reference its actual deep-snow band.');
    // `bands` paints a stacked piece layer by layer (a tyre wall: one colour
    // multiplier [r,g,b] per layer, repeating up the stack).
    const bands = entry.bands;
    if (bands && (!Array.isArray(bands) || !bands.length || !bands.every(band => Array.isArray(band) && band.length === 3 && band.every(finite))))
      fail('bands must be a list of [r,g,b] colours.');
    return Object.freeze({id:entry.id,s:entry.s,lateral:entry.lateral,
      heading:entry.heading ?? 0,scale:Object.freeze(scale),lift:entry.lift ?? 0,
      ...(bands ? {bands:Object.freeze(bands.map(band => Object.freeze([...band])))} : {}),
      ...(scenery ? {scenery:Object.freeze({...scenery})} : {}),
      ...(snowmanId ? {snowmanId} : {}),
      ...(patch ? {physicalPatch:patch} : {}),
      ...(nodeTranslations ? {nodeTranslations} : {}),
      ...(worldPosition !== undefined ? {worldPosition:Object.freeze({x:worldPosition.x,z:worldPosition.z})} : {})});
  }));
}

function resourcesOf(scene) {
  const resources = new Set();
  scene.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    if (node.isSkinnedMesh) resources.add(node.skeleton);
    for (const material of [].concat(node.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return resources;
}

function validateSource(asset, id) {
  if (!asset?.scene?.isObject3D) fail(id+' did not load a real scene.');
  asset.scene.updateMatrixWorld(true);
  let meshes = 0;
  asset.scene.traverse(node => {
    if (!node.isMesh) return;
    const position = node.geometry?.attributes.position;
    if (!position || position.count < 3 || (node.geometry.index?.count ?? position.count) % 3)
      fail(id+' has an empty or incomplete triangle mesh.');
    for (let i=0;i<position.count;i++)
      if (![position.getX(i),position.getY(i),position.getZ(i)].every(finite))
        fail(id+' has a non-finite vertex.');
    node.castShadow = node.receiveShadow = true;
    meshes++;
  });
  if (!meshes) fail(id+' has no meshes.');
  const bounds = new THREE.Box3().setFromObject(asset.scene);
  if (bounds.isEmpty() || ![...bounds.min.toArray(),...bounds.max.toArray()].every(finite))
    fail(id+' has invalid bounds.');
  if (id === 'start-gantry') for (let i=1;i<=5;i++) {
    const lamp = asset.scene.getObjectByName('lamp-'+i);
    if (!lamp?.isMesh || !lamp.material?.emissive) fail(id+' is missing lamp-'+i+'.');
  }
  return bounds;
}

const CONTINUOUS_LININGS = new Set(['armco','armco-white','stone-retaining-wall','concrete-wall','catch-fence','tyre-wall','pit-wall','drystone-wall','hedge-row']);

// The base height is shared with the geometry report; model/collider rows stay
// read only. Lower a continuous lining only when its footprint would float.
function placementGround(course, row) {
  const ground = course.groundAt(row.s, row.lateral);
  return row.worldPosition ? {...ground, x: row.worldPosition.x, z: row.worldPosition.z} : ground;
}
export function kitBaseHeight(course,row,bounds) {
  const ground=placementGround(course,row);
  const height=renderedGroundHeight(course,{...ground,s:row.s,off:row.lateral},{requireSurface:true});
  if(!finite(height))return height;
  if(!course.script||!CONTINUOUS_LININGS.has(row.id))return height+(row.lift??0);
  const scale=Array.isArray(row.scale)?row.scale:Array(3).fill(row.scale??1);
  const heading=ground.heading+(row.heading??0),cs=Math.cos(heading),sn=Math.sin(heading);
  const x=[bounds.min.x,(bounds.min.x+bounds.max.x)/2,bounds.max.x];
  const z=[bounds.min.z,(bounds.min.z+bounds.max.z)/2,bounds.max.z];
  let lowest=height;
  for(const a of x)for(const b of z){
    const px=ground.x+cs*a*scale[0]+sn*b*scale[2],pz=ground.z-sn*a*scale[0]+cs*b*scale[2];
    const at=course.nearest(px,pz,row.s);
    const under=renderedGroundHeight(course,{x:px,z:pz,s:at.s,off:at.lateral},{requireSurface:true});
    if(finite(under))lowest=Math.min(lowest,under);
  }
  return Math.min(height,lowest+.449)+(row.lift??0);
}

function placementMatrix(course, row, bounds) {
  const ground = placementGround(course,row);
  if (![ground.x,ground.y,ground.z,ground.heading].every(finite)) fail('terrain anchor is invalid.');
  const height=kitBaseHeight(course,row,bounds);
  if (!finite(height)) fail('placement has no rendered terrain beneath its anchor.');
  return new THREE.Matrix4().compose(
    // Finish furniture has sampled terrain heights below its road-level origin.
    // Preserve that authored origin instead of lifting its lowest snow mark.
    new THREE.Vector3(ground.x,height-(row.id==='summit-finish'?0:bounds.min.y*row.scale[1]),ground.z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ground.heading+row.heading),
    new THREE.Vector3(...row.scale));
}

// Keep source/placement bounds and ground anchors exact. Only the approved
// sign's two panels and its separate lettering get a visual XY enlargement.
const brakingBoardIds = new Set(['braking-board-150', 'braking-board-100', 'braking-board-50']);
function brakingBoardFaceMatrix(model, id, node) {
  const local = node.matrixWorld.clone();
  if (!brakingBoardIds.has(id) || ![id + '-distance-board_1', id + '-distance-board_2',
    'distance-' + id.slice('braking-board-'.length)].includes(node.name)) return local;
  const panel = model.scene.getObjectByName(id + '-distance-board_1');
  if (!panel) return local;
  const center = new THREE.Box3().setFromObject(panel).getCenter(new THREE.Vector3());
  return new THREE.Matrix4().makeScale(2, 2, 1).setPosition(-center.x, -center.y, 0).multiply(local);
}
function brakingBoardVisualBounds(model, id) {
  const bounds = new THREE.Box3();
  model.scene.traverse(node => {
    if (node.isMesh) bounds.union(new THREE.Box3().setFromBufferAttribute(node.geometry.attributes.position)
      .applyMatrix4(brakingBoardFaceMatrix(model, id, node)));
  });
  return bounds;
}

// A road segment box is deliberately broader than the actual clearance guard.
// Unknown/un-sampled courses keep the complete original triangle check.
function clearanceRoadBoxes(course) {
  if (!Array.isArray(course.samples) || course.samples.length < 2) return null;
  const width = Math.max(...course.samples.map(p => course.roadHalfWidthAt(p.s))) + 4.5;
  if (!finite(width)) return null;
  const boxes = [];
  for (let i = 1; i < course.samples.length; i++) {
    const a = course.samples[i - 1], b = course.samples[i];
    if (![a.x,a.z,b.x,b.z].every(finite)) return null;
    boxes.push(new THREE.Box3(
      new THREE.Vector3(Math.min(a.x,b.x) - width, -Infinity, Math.min(a.z,b.z) - width),
      new THREE.Vector3(Math.max(a.x,b.x) + width, Infinity, Math.max(a.z,b.z) + width)));
  }
  return boxes;
}

function checkPlacementClearance(course, row, asset, matrix, bounds, roadBoxes) {
  if (!row.physicalPatch && roadBoxes) {
    const placed = bounds.clone().applyMatrix4(matrix);
    if (!roadBoxes.some(box => box.intersectsBox(placed))) return false;
  }
  const flatGround = row.id === 'snow-ground' && (bounds.max.y-bounds.min.y)*row.scale[1] <= .5;
  const point = new THREE.Vector3(), centroid = new THREE.Vector3();
  const triangle = Array.from({length:3},()=>new THREE.Vector3());
  const check = world => {
    const nearest = course.nearest(world.x,world.z,row.s);
    if (![nearest.s,nearest.lateral].every(finite)) fail(row.id+' projection is invalid.');
    if (row.physicalPatch) {
      const patch = row.physicalPatch;
      if (nearest.s < patch.s0-.025 || nearest.s > patch.s1+.025 ||
          nearest.lateral < patch.from-.025 || nearest.lateral > patch.to+.025)
        fail(row.id+' footprint leaves its physical patch.');
      return;
    }
    if (flatGround) return;
    const ground = course.groundAt(nearest.s,nearest.lateral);
    if (world.y < ground.y+4.5 && Math.abs(nearest.lateral) < course.roadHalfWidthAt(nearest.s)+.5)
      fail(row.id+' violates road clearance.');
  };
  asset.scene.traverse(node => {
    if (!node.isMesh) return;
    const transform = new THREE.Matrix4().multiplyMatrices(matrix,brakingBoardFaceMatrix(asset,row.id,node));
    const position = node.geometry.attributes.position, indices = node.geometry.index;
    const count = indices?.count ?? position.count;
    for (let i=0;i<count;i+=3) {
      centroid.set(0,0,0);
      for (let j=0;j<3;j++) {
        point.fromBufferAttribute(position,indices ? indices.getX(i+j) : i+j).applyMatrix4(transform);
        triangle[j].copy(point);check(point);centroid.add(point);
      }
      check(centroid.multiplyScalar(1/3));
      for (let j=0;j<3;j++) check(point.copy(triangle[j]).lerp(triangle[(j+1)%3],.5));
    }
  });
  return true;
}

// A circuit may ask for a piece's parts to be joined by material (`mergeKitMeshes: ['shopfront-a']`):
// a model of many small parts then costs a few draws instead of one per part, in every view and in
// the contact-shading pass. The picture is unchanged. Pieces with a skeleton are left alone.
function mergeModelByMaterial(model,disposeGeometry=geometry=>geometry.dispose()) {
  const scene = model?.scene;
  if (!scene?.isObject3D) return;
  scene.updateMatrixWorld(true);
  const meshes = [];
  let skinned = false;
  scene.traverse(node => {if (node.isSkinnedMesh) skinned = true; else if (node.isMesh) meshes.push(node);});
  if (skinned || meshes.length < 2) return;
  const inverse = scene.matrixWorld.clone().invert(), groups = new Map();
  for (const mesh of meshes) {
    if (Array.isArray(mesh.material)) return;
    if (!groups.has(mesh.material)) groups.set(mesh.material,[]);
    groups.get(mesh.material).push(mesh);
  }
  const merged = [];
  for (const [material,list] of groups) {
    // Vertex colours must be on every part of the joined mesh or on none (the material reads them).
    const colourSize = Math.max(0,...list.map(mesh => mesh.geometry.attributes.color?.itemSize ?? 0));
    const geometries = list.map(mesh => {
      const source = mesh.geometry, geometry = new THREE.BufferGeometry(), count = source.attributes.position.count;
      // Plain floats, whatever the file stored (quantised attributes cannot be moved by a matrix).
      const copy = (name,size,fill) => {
        const attribute = source.attributes[name], array = new Float32Array(count*size);
        for (let i=0;i<count;i++) for (let k=0;k<size;k++) array[i*size+k] = attribute && k < attribute.itemSize ? attribute.getComponent(i,k) : fill;
        geometry.setAttribute(name,new THREE.BufferAttribute(array,size));
      };
      copy('position',3,0); copy('normal',3,0); copy('uv',2,0);
      if (colourSize) copy('color',colourSize,1);
      if (source.index) geometry.setIndex(source.index.clone());
      geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      return geometry;
    });
    const indexed = geometries.every(geometry => geometry.index);
    const joined = mergeGeometries(indexed ? geometries : geometries.map(geometry => geometry.index ? geometry.toNonIndexed() : geometry),false);
    for (const geometry of geometries) disposeGeometry(geometry);
    if (!joined) return;
    const mesh = new THREE.Mesh(joined,material);
    mesh.name = (list[0].name || 'part')+' (joined)';
    merged.push(mesh);
  }
  for (const mesh of meshes) disposeGeometry(mesh.geometry);
  scene.clear();
  for (const mesh of merged) scene.add(mesh);
  scene.updateMatrixWorld(true);
}

// A circuit may turn a piece's own glow down or up (`kitLook: {'lantern-string': {glow: 1.1}}`):
// the glow strength of every lit surface of that piece, as a number of its stored strength. It may
// also wash the piece's unlit surfaces in street light (`wash`, src/night-wash.js; `tint` colours
// only the plaster, a different wall colour for each placement).
function applyKitLook(look,model,own) {
  if (!look || !model?.scene?.isObject3D) return;
  const glow = finite(look.glow) && look.glow >= 0;
  if (!glow && !look.wash && !look.smoothNormals && !look.slit && look.leafColour === undefined) return;
  if (look.leafColour !== undefined && (!Number.isSafeInteger(look.leafColour) || look.leafColour < 0 || look.leafColour > 0xffffff))
    fail('leaf colour must be an authored RGB colour.');
  const washed = new Set(), leaves = new Map();
  model.scene.traverse(node => {
    if (!node.isMesh) return;
    if (look.leafColour !== undefined) {
      const materials = [].concat(node.material || []).map(source => {
        if (!/-leaves-|-leaf-cluster-|^summer beech leaves$/.test(source.name)) return source;
        if (!leaves.has(source)) {
          const material = source.clone();
          material.color.setHex(look.leafColour);
          material.onBeforeCompile = source.onBeforeCompile;
          material.customProgramCacheKey = source.customProgramCacheKey.bind(source);
          leaves.set(source, material); own(material);
        }
        return leaves.get(source);
      });
      node.material = Array.isArray(node.material) ? materials : materials[0];
    }
    if(look.smoothNormals){
      const geometry=node.geometry.clone();
      geometry.computeVertexNormals();
      const positions=geometry.attributes.position,normals=geometry.attributes.normal,groups=new Map();
      for(let index=0;index<positions.count;index++){
        const key=[positions.getX(index),positions.getY(index),positions.getZ(index)].join(',');
        if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index);
      }
      const normal=new THREE.Vector3();
      for(const indices of groups.values()){
        normal.set(0,0,0);
        for(const index of indices)normal.add(new THREE.Vector3(normals.getX(index),normals.getY(index),normals.getZ(index)));
        normal.normalize();
        for(const index of indices)normals.setXYZ(index,normal.x,normal.y,normal.z);
      }
      normals.needsUpdate=true;node.geometry=geometry;own(geometry);
    }
    // Light the existing aperture-side cover faces, never the dome or its base.
    if(look.slit?.nodes.includes(node.name)){
      const slit=look.slit;
      if(![slit.halfWidth,slit.minY,slit.minZ,slit.normalX,slit.strength].every(finite))fail('slit look has invalid authored bounds.');
      const materials=[].concat(node.material||[]).map(source=>{
        const material=source.clone(),previous=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source);
        const colour=new THREE.Color(slit.colour);
        material.onBeforeCompile=shader=>{
          previous.call(material,shader);
          shader.vertexShader=shader.vertexShader.replace('#include <common>',
            '#include <common>\nvarying vec3 kitSlitPosition;varying vec3 kitSlitNormal;')
            .replace('#include <begin_vertex>',
              '#include <begin_vertex>\nkitSlitPosition=position;kitSlitNormal=normal;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
            '#include <common>\nvarying vec3 kitSlitPosition;varying vec3 kitSlitNormal;')
            .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
              float slit=step(abs(kitSlitPosition.x),${slit.halfWidth.toFixed(6)})*
                step(${slit.minY.toFixed(6)},kitSlitPosition.y)*step(${slit.minZ.toFixed(6)},kitSlitPosition.z)*
                step(${slit.normalX.toFixed(6)},abs(normalize(kitSlitNormal).x));
              totalEmissiveRadiance+=vec3(${colour.toArray().map(v=>v.toFixed(6)).join(',')})*${slit.strength.toFixed(6)}*slit;`);
        };
        material.customProgramCacheKey=()=>key()+':summit-aperture:'+JSON.stringify(slit);
        own(material);return material;
      });
      node.material=Array.isArray(node.material)?materials:materials[0];
    }
    for (const material of [].concat(node.material || [])) {
      const lit = material.emissive && material.emissive.getHex() !== 0 && material.emissiveIntensity > 0;
      if (lit && glow) material.emissiveIntensity = look.glow;
      if (!lit && look.wash && !washed.has(material)) {
        washed.add(material);
        applyNightWash(material,{...look.wash,tint:/plaster|wall|render/i.test(material.name) ? look.wash.tint ?? 0 : 0});
      }
    }
  });
}


// Variants are private to this world; cached donor geometry/materials stay read only.
function cloneNamedVariant(source,translations,own) {
  const model={...source,scene:cloneSkeleton(source.scene)};
  const geometries=new Map(),materials=new Map(),textures=new Map();
  const cloneMaterial=source=>{
    if(materials.has(source))return materials.get(source);
    const material=source.clone();material.userData={...source.userData};materials.set(source,material);own(material);
    for(const [key,value] of Object.entries(material))if(value?.isTexture){
      if(!textures.has(value)){const texture=value.clone();texture.userData={...value.userData};textures.set(value,texture);own(texture);}
      material[key]=textures.get(value);
    }
    return material;
  };
  model.scene.traverse(node=>{
    if(node.geometry){
      if(!geometries.has(node.geometry)){const geometry=node.geometry.clone();geometry.userData={...node.geometry.userData};geometries.set(node.geometry,geometry);own(geometry);}
      node.geometry=geometries.get(node.geometry);
    }
    if(node.material)node.material=Array.isArray(node.material)?node.material.map(cloneMaterial):cloneMaterial(node.material);
    if(node.isSkinnedMesh)own(node.skeleton);
  });
  model.scene.updateMatrixWorld(true);
  const rootInverse=model.scene.matrixWorld.clone().invert();
  for(const [name,values] of Object.entries(translations)){
    const nodes=[];
    model.scene.traverse(node=>{if((node.userData.name??node.name)===name)nodes.push(node);});
    if(nodes.length!==1||!nodes[0].isMesh)fail('named translation has no unique actual mesh '+name+'.');
    const node=nodes[0],parentToRoot=rootInverse.clone().multiply(node.parent.matrixWorld);
    const delta=new THREE.Vector4(...values,0).applyMatrix4(parentToRoot.invert());
    node.position.add(new THREE.Vector3(delta.x,delta.y,delta.z));node.updateMatrix();
  }
  model.scene.updateMatrixWorld(true);return model;
}
// Own cache and instances for one world. No module-global asset lifetime.
export function createTrackKits(course, options) {
  const enteredAt = performance.now();
  const {placements=course.def.kitPlacements ?? [],extraPlacements=[],requiredIds=[],
    loadAsset,validateClearance=true} = options === undefined ? {} : options;
  const group = new THREE.Group(); group.name = 'Approved track kits';
  const resources = new Set(), released = new WeakSet(), assets = new Map();
  const skeletons = new Set(), batches = [], instances = [], chunks = new Map();
  let activeView = null;
  let brokenSnowmen = new Set();
  const rearScopes = [];
  let retired = false, failed = false, status = 'loading', error = null, rows = [];
  const loader = loadAsset ? null : new GLTFLoader();
  const load = loadAsset ?? (path => loader.loadAsync(path));
  const release = resource => {
    if (released.has(resource)) return;
    released.add(resource); resource.dispose?.();
  };
  const own = resource => {
    resource.userData ??= {}; resource.userData.sharedAsset = true;
    if (retired || failed) release(resource); else resources.add(resource);
  };
  const clear = () => {
    for (const batch of batches) batch.mesh.dispose();
    batches.length = 0;
    for (const skeleton of skeletons) release(skeleton);
    skeletons.clear();
    for (const resource of resources) release(resource);
    resources.clear(); assets.clear(); instances.length = 0; chunks.clear(); activeView = null;
    group.clear();
  };
  const normalizeStarted = performance.now();
  try {
    if (typeof validateClearance !== 'boolean') fail('clearance option must be boolean.');
    rows = normalizeKitPlacements(course,[...placements,...extraPlacements,...(options?.placements===undefined?beechTreePlacements(course):[])]);
    if (!Array.isArray(requiredIds) || !requiredIds.every(id => approved.has(id))) fail('required id is unknown.');
  } catch (caught) {failed = true;status = 'error';error = caught;}
  const stats = {high:0,low:0,visibleChunks:0,
    presentation:{constructionMs:null,activeCpuMs:performance.now()-normalizeStarted},
    clearance:{trianglePlacements:0,broadPhaseSkipped:0,runtimeSkipped:0}};
  const variantKey=row=>row.nodeTranslations?'/'+JSON.stringify(row.nodeTranslations):'';
  const assetFor=(row,version)=>assets.get(row.id+'/'+version+variantKey(row));
  const scratch = new THREE.Vector3(), transform = new THREE.Matrix4();
  const frustumMatrix = new THREE.Matrix4();
  function refreshChunkBounds(chunk) {
    chunk.bounds.makeEmpty();
    for (const entry of chunk.entries) chunk.bounds.union(entry.instance.bounds);
  }
  function assemble() {
    const grouped = new Map();
    const roadBoxes = validateClearance ? clearanceRoadBoxes(course) : null;
    rows.forEach((row,index) => {
      const high = assets.get(row.id+'/high');
      const matrix = placementMatrix(course,row,high.bounds);
      const placedBounds = new THREE.Box3();
      for (const version of ['high','low']) {
        const asset = assetFor(row,version);
        placedBounds.union((asset.visualBounds ?? asset.bounds).clone().applyMatrix4(matrix));
        if (!validateClearance) stats.clearance.runtimeSkipped++;
        else if (checkPlacementClearance(course,row,asset.model,matrix,asset.visualBounds ?? asset.bounds,roadBoxes))
          stats.clearance.trianglePlacements++;
        else stats.clearance.broadPhaseSkipped++;
      }
      const chunkIndex = Math.floor(row.s / CHUNK_LENGTH);
      let chunk = chunks.get(chunkIndex);
      if (!chunk) {
        chunk = {index:chunkIndex,entries:[],batches:[],roots:[],bounds:new THREE.Box3()};
        chunks.set(chunkIndex,chunk);
      }
      const instance = {matrix,bounds:placedBounds,revision:0,chunk,parts:[],lamps:[]};
      instances.push(instance);
      const entry = {row,index,instance};
      chunk.entries.push(entry); chunk.bounds.union(placedBounds);
      const key = row.id + '/' + chunkIndex+variantKey(row);
      let entries = grouped.get(key);
      if (!entries) { entries = []; grouped.set(key,entries); }
      entries.push(entry);
    });
    for (const entries of grouped.values()) for (const version of ['high','low']) {
      const id = entries[0].row.id, chunk = entries[0].instance.chunk;
      const asset = assetFor(entries[0].row,version);
      let skinned = false;
      asset.model.scene.traverse(node => {if (node.isSkinnedMesh) skinned = true;});
      if (id === 'start-gantry' || skinned) {
        for (const {instance,index} of entries) {
          const model = cloneSkeleton(asset.model.scene), root = new THREE.Group();
          root.add(model); root.name = id+' '+version;
          root.matrixAutoUpdate = false; root.visible = false;
          Object.assign(root.userData,{trackKitId:id,trackKitVersion:version,
            trackKitPlacementIndex:index,trackKitChunk:chunk.index});
          model.traverse(node => {if (node.isSkinnedMesh) skeletons.add(node.skeleton);});
          if (id === 'start-gantry') for (let i=1;i<=5;i++) {
            const lamp = model.getObjectByName('lamp-'+i);
            lamp.material = lamp.material.clone(); own(lamp.material);
            instance.lamps.push({material:lamp.material,index:i,
              intensity:Math.max(1,lamp.material.emissiveIntensity)});
            lamp.material.emissiveIntensity = 0;
          }
          root.matrix.copy(instance.matrix); group.add(root);
          const part = {mesh:root,version,instance,index};
          instance.parts.push(part); chunk.roots.push(part);
        }
      } else {
        asset.model.scene.traverse(node => {
          if (!node.isMesh) return;
          const mesh = new THREE.InstancedMesh(node.geometry,node.material,entries.length);
          mesh.name = id+' '+version;
          mesh.castShadow = node.castShadow; mesh.receiveShadow = true;
          Object.assign(mesh.userData,{trackKitId:id,trackKitVersion:version,
            trackKitChunk:chunk.index,
            trackKitPlacementIndices:Object.freeze(entries.map(entry=>entry.index)),
            trackKitDrawnPlacementIndices:Object.freeze([])});
          const local = brakingBoardFaceMatrix(asset.model,id,node);
          const layer = Number(/layer-(\d+)/.exec(node.name)?.[1] ?? 1) - 1;
          // Preserve Claude's painted layers while retaining owned chunk batches.
          if (entries.some(({row}) => row.bands)) {
            const paint = new THREE.Color();
            entries.forEach(({row},index) => mesh.setColorAt(index,row.bands
              ? paint.setRGB(...row.bands[layer % row.bands.length]) : paint.setRGB(1,1,1)));
          }
          entries.forEach(({instance},index) => {
            mesh.setMatrixAt(index,transform.multiplyMatrices(instance.matrix,local));
          });
          mesh.count = 0; mesh.visible = false;
          const batch = {mesh,version,entries,local,layer,drawn:[],revisions:[]};
          group.add(mesh); batches.push(batch); chunk.batches.push(batch);
        });
      }
    }
  }
  function packBatch(batch, selected, version) {
    const entries = batch.version === version ? selected : [];
    const changed = entries.length !== batch.drawn.length || entries.some((entry,i) =>
      entry.index !== batch.drawn[i] || entry.instance.revision !== batch.revisions[i]);
    batch.mesh.count = entries.length; batch.mesh.visible = entries.length > 0;
    if (!changed) return;
    batch.drawn = entries.map(entry=>entry.index);
    batch.revisions = entries.map(entry=>entry.instance.revision);
    batch.mesh.userData.trackKitDrawnPlacementIndices = Object.freeze([...batch.drawn]);
    if (!entries.length) return;
    // Save only buffers that this scope really overwrites. Nested scopes keep
    // their own prior values, while untouched distant batches never upload.
    for (const scope of rearScopes) {
      const saved = scope.get(batch);
      if (saved.matrices) continue;
      saved.matrices = batch.mesh.instanceMatrix.array.slice();
      saved.sphere = batch.mesh.boundingSphere?.clone() ?? null;
      saved.colours = batch.mesh.instanceColor?.array.slice() ?? null;
    }
    const paint = batch.mesh.instanceColor ? new THREE.Color() : null;
    entries.forEach(({instance,row},index) => {
      batch.mesh.setMatrixAt(index,transform.multiplyMatrices(instance.matrix,batch.local));
      if (paint) batch.mesh.setColorAt(index,row.bands
        ? paint.setRGB(...row.bands[batch.layer % row.bands.length]) : paint.setRGB(1,1,1));
    });
    batch.mesh.instanceMatrix.needsUpdate = true;
    if (paint) batch.mesh.instanceColor.needsUpdate = true;
    batch.mesh.computeBoundingSphere();
  }
  function applyView(view) {
    stats.high = stats.low = stats.visibleChunks = 0;
    const position = view.position;
    let frustum = null;
    if (view.camera) {
      view.camera.updateMatrixWorld(true);
      frustum = new THREE.Frustum().setFromProjectionMatrix(
        frustumMatrix.multiplyMatrices(view.camera.projectionMatrix,view.camera.matrixWorldInverse));
    }
    const nearby = [...chunks.values()].filter(chunk => {
      if (!position) return true;
      const distance = chunk.bounds.distanceToPoint(position);
      if (distance > (view.rear ? REAR_DISTANCE : MAIN_DISTANCE)) return false;
      if (frustum && !frustum.intersectsBox(chunk.bounds)) return false;
      return !view.rear || chunk.entries.some(({instance}) => {
        instance.bounds.getCenter(scratch).sub(position);
        return scratch.dot(view.forward) >= 0;
      });
    });
    if (view.rear && position) nearby.sort((a,b) =>
      a.bounds.distanceToPoint(position)-b.bounds.distanceToPoint(position));
    const chosen = new Set(view.rear ? nearby.slice(0,MAX_REAR_CHUNKS) : nearby);
    for (const chunk of chunks.values()) {
      const version = !view.rear && view.high && position &&
        chunk.bounds.distanceToPoint(position) <= LOD_DISTANCE ? 'high' : 'low';
      const selected = chosen.has(chunk) ? chunk.entries.filter(({instance,row}) => {
        if(row.snowmanId && brokenSnowmen.has(row.snowmanId))return false;
        if (frustum && !frustum.intersectsBox(instance.bounds)) return false;
        if (!position) return true;
        if (instance.bounds.distanceToPoint(position) > (view.rear ? REAR_DISTANCE : MAIN_DISTANCE)) return false;
        if (!view.rear) return true;
        instance.bounds.getCenter(scratch).sub(position);
        return scratch.dot(view.forward) >= 0;
      }) : [];
      if (selected.length) stats.visibleChunks++;
      stats[version] += selected.length;
      const selectedIndices = new Set(selected.map(entry=>entry.index));
      for (const batch of chunk.batches)
        packBatch(batch,batch.entries.filter(entry=>selectedIndices.has(entry.index)),version);
      for (const root of chunk.roots) {
        root.mesh.visible = root.version === version && selectedIndices.has(root.index);
        root.mesh.matrix.copy(root.instance.matrix); root.mesh.matrixWorldNeedsUpdate = true;
      }
    }
  }
  function withRearView({position,forward}, draw) {
    if (typeof draw !== 'function') fail('rear scope needs a draw function.');
    if (retired || status !== 'ready') return draw();
    if (!position || ![position.x,position.z].every(finite) ||
        !forward?.isVector3 || !forward.toArray().every(finite))
      fail('rear scope needs a finite actual orientation.');
    const previousView = activeView;
    const previousStats = {high:stats.high,low:stats.low,visibleChunks:stats.visibleChunks};
    const savedBatches = new Map(batches.map(batch => [batch,{batch,count:batch.mesh.count,
      visible:batch.mesh.visible,matrices:null,colours:null,sphere:null,boundingSphere:batch.mesh.boundingSphere,
      drawn:batch.drawn,revisions:batch.revisions,
      indices:batch.mesh.userData.trackKitDrawnPlacementIndices}]));
    const savedRoots = instances.flatMap(instance=>instance.parts.map(part=>({
      mesh:part.mesh,visible:part.mesh.visible,matrix:part.mesh.matrix.clone()})));
    rearScopes.push(savedBatches);
    try {
      activeView = {rear:true,high:false,position:new THREE.Vector3(position.x,finite(position.y)?position.y:0,position.z),forward:forward.clone()};
      applyView(activeView);
      return draw();
    } finally {
      rearScopes.pop();
      for (const saved of savedBatches.values()) {
        const {batch} = saved;
        batch.mesh.count = saved.count; batch.mesh.visible = saved.visible;
        if (saved.matrices) {
          batch.mesh.instanceMatrix.array.set(saved.matrices);
          batch.mesh.instanceMatrix.needsUpdate = true;
          if (saved.colours) {
            batch.mesh.instanceColor.array.set(saved.colours);
            batch.mesh.instanceColor.needsUpdate = true;
          }
          if (saved.boundingSphere) saved.boundingSphere.copy(saved.sphere);
          batch.mesh.boundingSphere = saved.boundingSphere;
        }
        batch.drawn = saved.drawn; batch.revisions = saved.revisions;
        batch.mesh.userData.trackKitDrawnPlacementIndices = saved.indices;
      }
      for (const saved of savedRoots) {
        saved.mesh.visible = saved.visible; saved.mesh.matrix.copy(saved.matrix);
        saved.mesh.matrixWorldNeedsUpdate = true;
      }
      Object.assign(stats,previousStats); activeView = previousView;
    }
  }
  function syncLights(state) {
    if (retired || status !== 'ready') return;
    const lights = state?.mode === 'grandprix' && state.status === 'countdown'
      ? Math.max(0,Math.min(5,state.field?.start?.lights ?? 0)) : 0;
    for (const instance of instances) for (const lamp of instance.lamps)
      lamp.material.emissiveIntensity = lamp.index <= lights ? lamp.intensity : 0;
  }
  const ids = failed ? [] : [...new Set([...rows.map(row=>row.id),...requiredIds])];
  const ready = failed ? Promise.resolve(false) : !ids.length ? Promise.resolve(true) :
    Promise.all(ids.flatMap(id => ['high','low'].map(async version => {
      const path = '/assets/models/circuits/kits/'+id+(version === 'low' ? '-lod' : '')+'.glb';
      const model = await load(path);
      const translated=rows.filter(row=>row.id===id&&row.nodeTranslations);
      if(translated.length){
        // The original donor defines every placement anchor, including variants.
        // Its resources are owned but never marked/changed or put in the scene.
        if(model?.scene?.isObject3D)for(const resource of resourcesOf(model.scene)){
          if(retired||failed)release(resource);else resources.add(resource);
        }
        if(retired||failed)return;
        const variants=new Map([['',{}],...translated.map(row=>[variantKey(row),row.nodeTranslations])]);
        let originalBounds;
        for(const [key,translations] of variants){
          const clone=cloneNamedVariant(model,translations,own);
          if(course.def.mergeKitMeshes?.includes(id))mergeModelByMaterial(clone,release);
          for(const resource of resourcesOf(clone.scene))own(resource);
          applyKitLook(course.def.kitLook?.[id],clone,own);
          const bounds=validateSource(clone,id);
          if(!key)originalBounds=bounds;
          assets.set(id+'/'+version+key,{model:clone,bounds:originalBounds,
            ...(key?{visualBounds:bounds}:{})});
        }
        return;
      }
      if (course.def.mergeKitMeshes?.includes(id)) mergeModelByMaterial(model);
      if (model?.scene?.isObject3D) for (const resource of resourcesOf(model.scene)) own(resource);
      if (retired || failed) return;
      applyKitLook(course.def.kitLook?.[id],model,own);
      const validationStarted = performance.now();
      try {
        const bounds = validateSource(model,id);assets.set(id+'/'+version,{model,bounds,
          ...(brakingBoardIds.has(id) ? {visualBounds:brakingBoardVisualBounds(model,id)} : {})});
      } finally {stats.presentation.activeCpuMs += performance.now()-validationStarted;}
    }))).then(() => {
      if (retired || failed) return false;
      const assemblyStarted = performance.now();
      try {assemble();}
      finally {stats.presentation.activeCpuMs += performance.now()-assemblyStarted;}
      status = 'ready';stats.presentation.constructionMs = performance.now()-enteredAt;return true;
    }).catch(caught => {
      if (!retired) {failed = true;status = 'error';error = caught;}
      clear();return false;
    });
  if (!ids.length && !failed) {status = 'ready';stats.presentation.constructionMs = performance.now()-enteredAt;}
  group.userData.trackKitPlacements=rows;group.userData.trackKitStats=stats;
  return {
    group,ready,placements:rows,stats,
    get status(){return status;},get error(){return error;},
    update({high=true,position,camera,state}={}) {
      if (status !== 'ready' || retired) return;
      activeView = {high,position:position ? new THREE.Vector3(position.x,finite(position.y)?position.y:0,position.z) : null,camera};
      brokenSnowmen=new Set((state?.snowmanBursts ?? []).map(hit=>hit.id));
      applyView(activeView); syncLights(state);
    },
    sync:syncLights,
    withRearView,
    // `refresh` false leaves the drawn selection for a later refresh(): a caller that moves many pieces in one
    // frame (the chairs of a lift) refreshes once after the last instead of once per piece.
    setPlacementPose(index,matrix,refresh=true) {
      if (retired || status !== 'ready' || !Number.isInteger(index) || !instances[index] ||
          !matrix?.isMatrix4 || !matrix.elements.every(finite)) return false;
      const instance = instances[index], row = rows[index];
      instance.matrix.copy(matrix); instance.revision++;
      instance.bounds.makeEmpty();
      for (const version of ['high','low']) {
        const asset=assetFor(row,version);
        instance.bounds.union((asset.visualBounds ?? asset.bounds).clone().applyMatrix4(matrix));
      }
      refreshChunkBounds(instance.chunk);
      if (refresh && activeView) applyView(activeView);
      return true;
    },
    refresh() {
      if (status === 'ready' && !retired && activeView) applyView(activeView);
    },
    getPlacementPose(index) {return instances[index]?.matrix.clone() ?? null;},
    // Clones share the approved owner resources; presentation must retire before this owner.
    snowmanPart(name,high=true) {
      if(retired || status!== 'ready' || !['hat','carrot'].includes(name))return null;
      const node=assets.get('snowman/'+(high?'high':'low'))?.model.scene.getObjectByName(name);
      if(!node?.isMesh)return null;
      const mesh=node.clone();mesh.matrix.copy(node.matrixWorld);mesh.matrixAutoUpdate=false;
      return mesh;
    },
    dispose() {
      if (retired) return;retired = true;status = 'retired';clear();
    },
  };
}

export function bindTrackKits(world, owner) {owners.set(world,owner);world.add(owner.group);}
export function trackKitsOf(world) {return owners.get(world) ?? null;}
