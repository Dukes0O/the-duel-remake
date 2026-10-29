import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Original Blender shell plus moving parts. Metres, +Z forward, no maker assets.
export const SKYLINE_MODEL_URL = '/assets/models/unlocks/nissan_skyline_gtr_r34.glb';
const defaultLoad = () => new GLTFLoader().loadAsync(SKYLINE_MODEL_URL);
let pending;
export function loadSkylineVehicle({ loadAsset = defaultLoad } = {}) {
  if (loadAsset !== defaultLoad) return loadFactory(loadAsset);
  pending ||= loadFactory(loadAsset).catch(error => { pending = null; throw error; });
  return pending;
}
async function loadFactory(loadAsset) {
  const { scene } = await loadAsset(SKYLINE_MODEL_URL);
  scene.updateMatrixWorld(true);
  const names = new Set();
  scene.traverse(node => { if (node.isMesh) names.add(node.material.name); });
  if (!names.has('skyline_paint') || !names.has('skyline_glass')) throw new Error('Skyline shell is missing paint or glass.');
  return options => createSkylineVehicle(options, scene);
}
export const SKYLINE_VEHICLE_DIMENSIONS = Object.freeze({
  nissan_skyline_gtr_r34: Object.freeze({ width: 1.96, length: 4.60, height: 1.36, wheelRadius: .37 }),
});
const { materials, batch, cylinder, cockpit, wheels, exhaust, rearPlate } = originalVehicleParts;
const AXLES = [1.32, -1.345];

export function createSkylineVehicle({ key = 'nissan_skyline_gtr_r34', color = 0x1b3d8c, accent = 0xc7ccd1 } = {}, source) {
  if (!Object.hasOwn(SKYLINE_VEHICLE_DIMENSIONS, key) || !source) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'Bayside Blue body'; m.paint.metalness = .35; m.paint.roughness = .32;
  m.paint.clearcoat = .38; m.paint.clearcoatRoughness = .24;
  m.glass.color.setHex(0x17252e); m.glass.opacity = .68;
  m.glass.metalness = .06; m.glass.roughness = .18; m.glass.clearcoat = .35;
  m.brake.emissiveIntensity = .35;
  m.headlight.color.setHex(0xa9b9c4); m.headlight.roughness = .18;
  m.headlight.emissive.setHex(0x687d90); m.headlight.emissiveIntensity = .04;
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...SKYLINE_VEHICLE_DIMENSIONS[key] },
    damageSpace: { scale: [.88, .85, 1], offset: [0, 0, 0], frontGlassZ: .40, rearGlassZ: -1.26 },
  });
  // Flatten each GLB primitive into the existing material batch. Every instance
  // gets private geometry and paint; no source buffers enter the damage system.
  const shellMaterial = { skyline_paint: m.paint, skyline_trim: m.carbon, skyline_glass: m.glass, skyline_lens: m.headlight, skyline_alloy: m.alloy };
  source.traverse(node => {
    if (!node.isMesh) return;
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    b.add(geometry, shellMaterial[node.material.name] ?? m.glass);
    geometry.dispose();
  });
  cockpit(vehicle, b, m, [.34,.015,.02], .9);
  noseDetails(b, m);
  tailDetails(b, m);
  for (const side of [-1,1]) {
    // Door mirror on a short arm, set in front of the door glass.
    b.box(m.paint,[.17,.09,.18],[side*.885,1.0,.45],[0,side*.12,0],.035);
    b.box(m.paint,[.10,.032,.12],[side*.77,.96,.48],[0,0,0],.012);
    b.box(m.darkAlloy,[.13,.068,.008],[side*.885,1.0,.36],[0,side*.12,0],.003);
  }
  // Wing on two uprights below the roofline, a swept blade with end plates.
  b.box(m.paint,[1.22,.05,.34],[0,1.172,-2.09],[.08,0,0],.02);
  for (const side of [-1,1]) {
    b.box(m.paint,[.016,.10,.30],[side*.61,1.17,-2.09],[.08,0,0],.006);
    b.box(m.paint,[.06,.24,.27],[side*.39,1.06,-2.10],[-.1,0,0],.014);
  }
  // Independent red caliper material; the silver wheel trim stays silver.
  const caliper = m.accent.clone(); caliper.color.setHex(0xb51e20);
  wheels(vehicle,{...m,accent:caliper},{radius:.37,width:.28,track:.74,axles:AXLES,spokes:0,roadSmooth:true});
  // Larger alloy diameter with a low-profile tyre, without changing its contact.
  for (const wheel of data.wheels) {
    wheel.traverse(mesh => {
      if (mesh.isMesh && mesh.material === m.alloy) mesh.geometry.scale(1,1.17,1.17);
    });
    alloySpokes(wheel, m.alloy);
  }
  exhaust(vehicle,b,m,[[-.39,.32,-2.17]],.065);
  b.finish(data);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

function noseDetails(b, m) {
  for (const side of [-1,1]) {
    // Side duct fill.
    b.box(m.carbon,[.20,.09,.02],[side*.525,.325,2.19],[0,0,0],.01);
    for (let i=0;i<3;i++) b.box(m.darkAlloy,[.18,.007,.008],[side*.525,.29+i*.035,2.203],[0,0,0],0);
  }
  // Lower intake and upper grille: dark backing with fine slats.
  b.box(m.carbon,[.64,.19,.02],[0,.345,2.19],[0,0,0],.012);
  for (let i=0;i<6;i++) b.box(m.darkAlloy,[.60,.008,.008],[0,.27+i*.03,2.205],[0,0,0],0);
  for (const x of [-.24,-.12,0,.12,.24]) b.box(m.darkAlloy,[.007,.17,.008],[x,.345,2.208],[0,0,0],0);
  b.box(m.carbon,[.58,.09,.02],[0,.628,2.16],[0,0,0],.01);
  for (let i=0;i<4;i++) b.box(m.darkAlloy,[.55,.007,.008],[0,.595+i*.022,2.174],[0,0,0],0);
  for (const x of [-.22,-.11,0,.11,.22]) b.box(m.darkAlloy,[.006,.075,.008],[x,.628,2.178],[0,0,0],0);
  // Black front lip.
  b.box(m.carbon,[1.30,.022,.10],[0,.152,2.24],[0,0,0],.008);
}

// Four round tail lamps in the recessed panel: large red outers, smaller inners.
function tailDetails(b, m) {
  for (const side of [-1,1]) {
    for (const [x,r] of [[.58,.075],[.405,.058]]) {
      cylinder(b,m.carbon,r+.012,.03,[side*x,.84,-2.17],[Math.PI/2,0,0],32);
      cylinder(b,m.brake,r,.015,[side*x,.84,-2.19],[Math.PI/2,0,0],32);
      const ring = new THREE.TorusGeometry(r*.79,r*.095,8,32);
      b.add(ring,m.brake,[side*x,.84,-2.2]); ring.dispose();
    }
  }
  rearPlate(b,m,.50,-2.304,.33,.17);
}

function alloySpokes(wheel, material) {
  const side = Math.sign(wheel.parent.position.x);
  const shape = new THREE.Shape();
  shape.moveTo(-.024,.047); shape.lineTo(-.031,.13); shape.lineTo(-.024,.255);
  shape.lineTo(.024,.255); shape.lineTo(.031,.13); shape.lineTo(.024,.047);
  shape.closePath();
  const parts = [];
  for (let i=0;i<6;i++) {
    const g = new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.006,bevelSize:.004,bevelSegments:2,steps:1});
    g.rotateY(Math.PI/2).rotateX(i*Math.PI/3).scale(side,1,1).translate(side*.074,0,0);
    // Reflection changes winding on the right wheel. Correct it before merging.
    if (side < 0) {
      for (const name of ['position','normal','uv']) {
        const a = g.attributes[name], count = a.itemSize;
        for (let j=0;j<a.count;j+=3) for (let k=0;k<count;k++) {
          const p=(j+1)*count+k, q=(j+2)*count+k, value=a.array[p];
          a.array[p]=a.array[q]; a.array[q]=value;
        }
      }
    }
    parts.push(g);
  }
  const mesh = wheel.children.find(node=>node.isMesh && node.material===material);
  const old = mesh.geometry;
  mesh.geometry = mergeGeometries([old,...parts]);
  old.dispose(); parts.forEach(g=>g.dispose());
}
