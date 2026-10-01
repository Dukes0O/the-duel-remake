// Salt Flats presentation reads the registered Course and preserves its physics.
// Native donor geometry stays intact; ambient heat is a view-only shader effect.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerSceneSystem} from '../../scene-systems.js';

export const SALT_FLATS_NATIVE_ASSET = '/assets/models/wasteland/salt-flats/venue.glb';

const presentations = new WeakMap();

// This is a draw override, not a saved option or a simulation feature switch.
export function setSaltFlatsHeatEnabled(world, enabled) {
  const native = world?.getObjectByName('Salt Flats');
  const state = presentations.get(native);
  if (!state || native.userData.assetStatus !== 'ready') return false;
  state.enabled.value = enabled ? 1 : 0;
  return state.enabled.value === 1;
}

function applyDistantHeat(material, state) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    previousCompile.call(this, shader, renderer);
    shader.uniforms.saltHeatSeconds = state.seconds;
    shader.uniforms.saltHeatEnabled = state.enabled;
    shader.vertexShader = 'uniform float saltHeatSeconds;\nuniform float saltHeatEnabled;\n' +
      shader.vertexShader.replace('#include <project_vertex>', `
#include <project_vertex>
// View-space refraction leaves the original triangles, transforms and shadows
// untouched. It fades in beyond nearby cars/ground; only native scenery uses it.
float saltFar = smoothstep(70.0, 95.0, length(mvPosition.xyz));
float saltPhase = saltHeatSeconds * 4.3 + mvPosition.y * 2.7;
vec2 saltRipple = vec2(
  sin(saltPhase + mvPosition.x * 0.31) * 0.11 +
    sin(saltHeatSeconds * 6.1 + mvPosition.y * 4.6) * 0.045,
  sin(saltHeatSeconds * 3.7 + mvPosition.x * 0.39 + mvPosition.y * 2.1) * 0.065);
mvPosition.xy += saltRipple * saltFar * saltHeatEnabled;
gl_Position = projectionMatrix * mvPosition;
`);
  };
  material.customProgramCacheKey = function() {
    return previousKey.call(this) + '|salt-distant-heat-v1';
  };
  material.needsUpdate = true;
}

function createOutsideSaltGround(ground, bounds) {
  // Keep the native prepared bowl unchanged. Four adjoining visual strips
  // continue its actual photo UV coordinates past the camera's far plane.
  const position = ground.geometry.attributes.position, uv = ground.geometry.attributes.uv;
  if (!uv) throw Error('Salt Flats ground needs the picked salt photo UVs.');
  const index = ground.geometry.index;
  const points = [0,1,2].map(i => {
    const vertex = index ? index.getX(i) : i;
    return {at: new THREE.Vector3().fromBufferAttribute(position,vertex).applyMatrix4(ground.matrixWorld),
      u: uv.getX(vertex), v: uv.getY(vertex)};
  });
  const [a,b,c] = points, dx1 = b.at.x-a.at.x, dz1 = b.at.z-a.at.z;
  const dx2 = c.at.x-a.at.x, dz2 = c.at.z-a.at.z, determinant = dx1*dz2-dx2*dz1;
  if (Math.abs(determinant) < 1e-8) throw Error('Salt Flats ground UV plane is degenerate.');
  const vertices = [], coordinates = [], indices = [];
  const extent = 3000, y = bounds.min.y;
  function strip(minX,maxX,minZ,maxZ) {
    const offset = vertices.length/3;
    for (const [x,z] of [[minX,minZ],[minX,maxZ],[maxX,maxZ],[maxX,minZ]]) {
      const dx = x-a.at.x, dz = z-a.at.z;
      const first = (dx*dz2-dx2*dz)/determinant, second = (dx1*dz-dx*dz1)/determinant;
      vertices.push(x,y,z);
      coordinates.push(a.u+first*(b.u-a.u)+second*(c.u-a.u),
        a.v+first*(b.v-a.v)+second*(c.v-a.v));
    }
    indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
  }
  strip(-extent,bounds.min.x,-extent,extent);
  strip(bounds.max.x,extent,-extent,extent);
  strip(bounds.min.x,bounds.max.x,-extent,bounds.min.z);
  strip(bounds.min.x,bounds.max.x,bounds.max.z,extent);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(coordinates,2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = [].concat(ground.material)[0].clone();
  material.fog = true;
  const mesh = new THREE.Mesh(geometry,material);
  mesh.name = 'Outside Salt Flats ground'; mesh.receiveShadow = true;
  return mesh;
}

function resourcesOf(root) {
  const resources = new Set();
  root?.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return resources;
}

export function createSaltFlatsScene(course, {loadAsset = () =>
  new GLTFLoader().loadAsync(SALT_FLATS_NATIVE_ASSET)} = {}) {
  const group = new THREE.Group();
  group.name = 'Salt Flats';
  const enabled = course?.def?.id === 'salt-flats';
  const outside = new THREE.Group(); outside.name = 'Salt Flats outside scenery';
  const state = {seconds:{value:0}, enabled:{value:1}};
  presentations.set(group,state);
  group.userData.assetStatus = enabled ? 'loading' : 'disabled';
  group.userData.loadErrors = [];
  let retired = false;
  const released = new Set();

  function release(root) {
    for (const resource of resourcesOf(root)) {
      if (released.has(resource) || resource.userData?.sharedAsset) continue;
      released.add(resource);
      resource.dispose();
    }
  }

  function dispose() {
    if (retired) return;
    retired = true;
    group.visible = false;
    group.userData.assetStatus = 'retired';
    // This native graph owns its resources. Clear after release so a caller's
    // enclosing disposeTree does not traverse and release them a second time.
    release(group); release(outside);
    presentations.delete(group);
    outside.clear();
    group.clear();
  }
  function animate(seconds) {
    if (!retired && Number.isFinite(seconds)) state.seconds.value = seconds;
  }
  registerSceneSystem(group, {dispose});
  registerSceneSystem(outside, {dispose});

  const ready = enabled ? (async () => {
    let asset;
    try {
      asset = await loadAsset();
      if (retired) {release(asset?.scene); return false;}
      if (!asset?.scene) throw Error('Salt Flats native asset has no scene.');
      const ground = asset.scene.getObjectByName('salt-flats-ground');
      if (!ground?.isMesh || !ground.geometry?.attributes.position)
        throw Error('Salt Flats asset needs its actual salt ground.');
      asset.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(ground);
      const size = bounds.getSize(new THREE.Vector3());
      if (Math.abs(size.x - 300) > .01 || Math.abs(size.z - 200) > .01)
        throw Error('Salt Flats asset does not have its prepared 300 by 200 metre ground.');
      const heated = new Set();
      asset.scene.traverse(mesh => {
        if (!mesh.isMesh) return;
        if (!mesh.geometry?.attributes.position) throw Error('Salt Flats native mesh has no positions.');
        mesh.castShadow = mesh !== ground;
        mesh.receiveShadow = true;
        if (mesh !== ground) for (const material of [].concat(mesh.material)) {
          if (heated.has(material)) continue;
          heated.add(material); applyDistantHeat(material,state);
        }
      });
      outside.add(createOutsideSaltGround(ground,bounds));
      group.add(asset.scene);
      group.userData.assetStatus = 'ready';
      return true;
    } catch (error) {
      release(asset?.scene); release(outside); outside.clear();
      if (!retired) {
        group.userData.loadErrors.push(String(error?.message || error));
        group.userData.assetStatus = 'failed';
      }
      return false;
    }
  })() : Promise.resolve(false);
  return {group, outside, ready, animate, dispose};
}
