import * as THREE from 'three';
import {renderedGroundHeight} from './rendered-ground.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

export const TRACK_KIT_IDS = Object.freeze([
  'start-gantry','pit-garage','pit-wall','grandstand','armco','concrete-wall',
  'catch-fence','tyre-wall','braking-board-150','braking-board-100','braking-board-50',
  'marshal-post','lantern-tower','shopfront-a','shopfront-b','neon-sign','lantern-string',
  'harbour-boat','ski-lodge','chairlift-tower','chairlift-cable','chairlift-chair',
  'wooden-dock','autumn-tree','autumn-tree-golden','autumn-tree-copper','snow-pine',
  'snow-ground','snow-rock','plough-bank','gallery','summit-hut','observatory','snowman','yeti',
]);
const approved = new Set(TRACK_KIT_IDS);
const owners = new WeakMap();
const LOD_DISTANCE = 160;
const hidden = new THREE.Matrix4().makeScale(0,0,0);
const finite = value => Number.isFinite(value);
const fail = message => {throw new Error('Track kit '+message);};

export function normalizeKitPlacements(course, entries) {
  if (!Array.isArray(entries)) fail('placements must be an array.');
  return Object.freeze(entries.map(entry => {
    if (!entry || !approved.has(entry.id) || !finite(entry.s) || entry.s < 0 ||
        entry.s > course.length || !finite(entry.lateral) || !finite(entry.heading ?? 0))
      fail('placement has an unknown id or invalid position.');
    const scale = Array.isArray(entry.scale) ? [...entry.scale] : Array(3).fill(entry.scale ?? 1);
    if (scale.length !== 3 || !scale.every(value => finite(value) && value > 0))
      fail('scale must contain three positive finite values.');
    const scenery = entry.scenery;
    if (scenery && (scenery.kind !== 'tree' || typeof scenery.id !== 'string' || !scenery.id))
      fail('scenery binding must name an existing tree.');
    const patch = entry.physicalPatch;
    if (patch && (entry.id !== 'plough-bank' || patch.kind !== 'deep-snow' ||
        !course.features?.surfacePatches?.includes(patch) ||
        ![patch.s0,patch.s1,patch.from,patch.to].every(finite) ||
        patch.s0 < 0 || patch.s1 > course.length || patch.s0 >= patch.s1 || patch.from >= patch.to))
      fail('bank physicalPatch must reference its actual deep-snow band.');
    return Object.freeze({id:entry.id,s:entry.s,lateral:entry.lateral,
      heading:entry.heading ?? 0,scale:Object.freeze(scale),
      ...(scenery ? {scenery:Object.freeze({...scenery})} : {}),
      ...(patch ? {physicalPatch:patch} : {})});
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

function placementMatrix(course, row, bounds) {
  const ground = course.groundAt(row.s,row.lateral);
  if (![ground.x,ground.y,ground.z,ground.heading].every(finite)) fail('terrain anchor is invalid.');
  const height=renderedGroundHeight(course,{...ground,s:row.s,off:row.lateral},{requireSurface:true});
  if (!finite(height)) fail('placement has no rendered terrain beneath its anchor.');
  return new THREE.Matrix4().compose(
    new THREE.Vector3(ground.x,height-bounds.min.y*row.scale[1],ground.z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ground.heading+row.heading),
    new THREE.Vector3(...row.scale));
}

function validateClearance(course, row, asset, matrix, bounds) {
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
    const transform = new THREE.Matrix4().multiplyMatrices(matrix,node.matrixWorld);
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
}

// Own cache and instances for one world. No module-global asset lifetime.
export function createTrackKits(course, {placements=course.def.kitPlacements ?? [],
    extraPlacements=[],requiredIds=[],loadAsset}={}) {
  const group = new THREE.Group(); group.name = 'Approved track kits';
  const resources = new Set(), released = new WeakSet(), assets = new Map(), dirtyBatches = new Set();
  const skeletons = new Set(), batches = [], instances = [];
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
    resources.clear(); assets.clear(); instances.length = 0; dirtyBatches.clear();
    group.clear();
  };
  try {
    rows = normalizeKitPlacements(course,[...placements,...extraPlacements]);
    if (!Array.isArray(requiredIds) || !requiredIds.every(id => approved.has(id))) fail('required id is unknown.');
  } catch (caught) {failed = true;status = 'error';error = caught;}
  const stats = {high:0,low:0};
  function writePose(instance) {
    for (const part of instance.parts) {
      if (part.mesh.isInstancedMesh) {
        const matrix = instance.version === part.version
          ? new THREE.Matrix4().multiplyMatrices(instance.matrix,part.local) : hidden;
        part.mesh.setMatrixAt(part.index,matrix); part.mesh.instanceMatrix.needsUpdate = true;
        dirtyBatches.add(part.mesh);
      } else {
        part.mesh.visible = instance.version === part.version;
        part.mesh.matrix.copy(instance.matrix); part.mesh.matrixWorldNeedsUpdate = true;
      }
    }
  }
  function assemble() {
    const grouped = new Map();
    rows.forEach((row,index) => {
      const high = assets.get(row.id+'/high');
      const matrix = placementMatrix(course,row,high.bounds);
      for (const version of ['high','low']) {
        const asset = assets.get(row.id+'/'+version);
        validateClearance(course,row,asset.model,matrix,asset.bounds);
      }
      const instance = {matrix,version:null,parts:[],lamps:[]};instances.push(instance);
      let entry = grouped.get(row.id);
      if (!entry) {entry = [];grouped.set(row.id,entry);}
      entry.push({row,index,instance});
    });
    for (const [id,entries] of grouped) for (const version of ['high','low']) {
      const asset = assets.get(id+'/'+version);
      let skinned = false;asset.model.scene.traverse(node => {if(node.isSkinnedMesh) skinned = true;});
      if (id === 'start-gantry' || skinned) {
        for (const {instance,index} of entries) {
          const model = cloneSkeleton(asset.model.scene), root = new THREE.Group();root.add(model);
          root.name = id+' '+version;root.matrixAutoUpdate = false;root.visible = false;
          Object.assign(root.userData,{trackKitId:id,trackKitVersion:version,trackKitPlacementIndex:index});
          model.traverse(node => {if(node.isSkinnedMesh) skeletons.add(node.skeleton);});
          if (id === 'start-gantry') for (let i=1;i<=5;i++) {
            const lamp = model.getObjectByName('lamp-'+i);
            lamp.material = lamp.material.clone();own(lamp.material);
            instance.lamps.push({material:lamp.material,index:i,intensity:Math.max(1,lamp.material.emissiveIntensity)});
            lamp.material.emissiveIntensity = 0;
          }
          group.add(root);instance.parts.push({mesh:root,version});
        }
      } else {
        asset.model.scene.traverse(node => {
          if (!node.isMesh) return;
          const mesh = new THREE.InstancedMesh(node.geometry,node.material,entries.length);
          mesh.name = id+' '+version;mesh.castShadow = node.castShadow;mesh.receiveShadow = true;
          mesh.userData.trackKitId = id;mesh.userData.trackKitVersion = version;
          mesh.userData.trackKitPlacementIndices = Object.freeze(entries.map(entry=>entry.index));
          group.add(mesh);batches.push({mesh});
          entries.forEach(({instance},index) => {
            mesh.setMatrixAt(index,hidden);
            instance.parts.push({mesh,version,index,local:node.matrixWorld.clone()});
          });
        });
      }
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
      if (model?.scene?.isObject3D) for (const resource of resourcesOf(model.scene)) own(resource);
      if (retired || failed) return;
      const bounds = validateSource(model,id);assets.set(id+'/'+version,{model,bounds});
    }))).then(() => {
      if (retired || failed) return false;
      assemble();status = 'ready';return true;
    }).catch(caught => {
      if (!retired) {failed = true;status = 'error';error = caught;}
      clear();return false;
    });
  if (!ids.length && !failed) status = 'ready';
  group.userData.trackKitPlacements=rows;group.userData.trackKitStats=stats;
  return {
    group,ready,placements:rows,stats,
    get status(){return status;},get error(){return error;},
    update({high=true,position,state}={}) {
      if (status !== 'ready' || retired) return;
      stats.high = stats.low = 0;
      for (const instance of instances) {
        const elements = instance.matrix.elements;
        const near = position && Math.hypot(elements[12]-position.x,elements[14]-position.z) <= LOD_DISTANCE;
        const version = high && near ? 'high' : 'low'; stats[version]++;
        if (instance.version !== version) {instance.version = version;writePose(instance);}
      }
      syncLights(state);
      for (const mesh of dirtyBatches) mesh.computeBoundingSphere();
      dirtyBatches.clear();
    },
    sync:syncLights,
    setPlacementPose(index,matrix) {
      if (retired || status !== 'ready' || !Number.isInteger(index) || !instances[index] ||
          !matrix?.isMatrix4 || !matrix.elements.every(finite)) return false;
      instances[index].matrix.copy(matrix);writePose(instances[index]);return true;
    },
    getPlacementPose(index) {return instances[index]?.matrix.clone() ?? null;},
    dispose() {
      if (retired) return;retired = true;status = 'retired';clear();
    },
  };
}

export function bindTrackKits(world, owner) {owners.set(world,owner);world.add(owner.group);}
export function trackKitsOf(world) {return owners.get(world) ?? null;}
