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
  nissan_skyline_gtr_r34: Object.freeze({ width: 1.96, length: 4.60, height: 1.25, wheelRadius: .37 }),
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
    damageSpace: { scale: [.88, .86, 1], offset: [0, 0, 0], frontGlassZ: 1.00, rearGlassZ: -1.28 },
  });
  // Flatten each GLB primitive into the existing material batch. Every instance
  // gets private geometry and paint; no source buffers enter the damage system.
  source.traverse(node => {
    if (!node.isMesh) return;
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    b.add(geometry, node.material.name === 'skyline_paint' ? m.paint : m.glass);
    geometry.dispose();
  });
  b.box(m.carbon, [1.42,.055,2.0], [0,.29,-.15], [0,0,0], .01);
  windowTrim(b, m);
  for (const side of [-1,1]) {
    b.tube(m.carbon,[[side*.59,.904,1.1],[side*.57,.918,1.4],[side*.64,.91,1.98]],.003,16);
  }
  cockpit(vehicle, b, m, [.34,.015,.02], .84);
  for (const side of [-1,1]) {
    b.box(m.paint,[.095,.095,1.92],[side*.9,.23,-.01],[0,0,0],.018);
    b.box(m.carbon,[.014,.018,.19],[side*.907,.79,-.45],[0,0,0],.005);
    b.tube(m.carbon,[[side*.898,.79,-.59],[side*.902,.36,-.61],[side*.9,.32,.72]],.004,12);
    b.box(m.paint,[.17,.09,.23],[side*.895,.96,1.00],[0,side*.10,0],.025);
    b.box(m.alloy,[.125,.055,.008],[side*.895,.964,.88],[0,side*.10,0],.009);
    // Long angular housings turn rearward around the front wing. The outside
    // corner is higher and behind the inner tip, rather than a separate box.
    const outline = [[.365,.704,2.294],[.825,.724,2.265],[.888,.805,2.12],[.857,.828,2.19],[.41,.802,2.295]];
    const lens = outline.map(([x,y,z])=>[side*x,y,z]);
    shapedLens(b,m.carbon,lens,1.075,-.009);
    shapedLens(b,m.headlight,lens,1,0);
    for (const dx of [-.115,.065]) {
      cylinder(b,m.carbon,.044,.012,[side*(.61+dx),.755,2.299],[Math.PI/2,0,0],24);
      const ring = new THREE.TorusGeometry(.041,.005,6,24);
      b.add(ring,m.alloy,[side*(.61+dx),.755,2.307]); ring.dispose();
      cylinder(b,m.headlight,.031,.008,[side*(.61+dx),.755,2.311],[Math.PI/2,0,0],24);
    }
    b.box(m.carbon,[.29,.13,.016],[side*.699,.36,2.16],[0,0,0],.009);
    cylinder(b,m.carbon,.052,.024,[side*.72,.54,2.287],[Math.PI/2,0,0],24);
    cylinder(b,m.headlight,.038,.016,[side*.72,.54,2.304],[Math.PI/2,0,0],24);
    // Door shut line and the smooth flare built into the continuous body.
    b.tube(m.carbon,[[side*.835,.853,1.03],[side*.915,.66,.78],[side*.916,.31,.70],[side*.91,.265,-.64],[side*.912,.67,-.77],[side*.83,.85,-.71]],.0035,36);
    b.tube(m.paint,[[side*.917,.69,-.94],[side*.90,.67,0],[side*.932,.70,.93]],.006,24);
    // Outer lamps are larger, the signature four circles on a blue rear panel.
    for (const [x,r] of [[.70,.111],[.45,.083]]) {
      cylinder(b,m.carbon,r+.013,.026,[side*x,.72,-2.253],[Math.PI/2,0,0],32);
      cylinder(b,m.brake,r,.015,[side*x,.72,-2.273],[Math.PI/2,0,0],32);
      const ring = new THREE.TorusGeometry(r*.79,r*.095,8,32);
      b.add(ring,m.brake,[side*x,.72,-2.289]); ring.dispose();
    }
    b.box(m.paint,[.075,.18,.19],[side*.64,.995,-1.97],[.14,0,0],.009);
    b.box(m.alloy,[.014,.05,.06],[side*.684,1.065,-1.97],[0,0,0],.002);
  }
  b.box(m.paint,[1.78,.055,.24],[0,1.105,-1.99],[-.06,0,0],.018);
  b.box(m.paint,[1.61,.265,.025],[0,.715,-2.231],[0,0,0],.032);
  b.box(m.carbon,[.66,.13,.02],[0,.746,2.18],[0,0,0],.009);
  b.box(m.carbon,[1.0,.25,.025],[0,.40,2.12],[0,0,0],.015);
  for (let i=0;i<8;i++) b.box(m.darkAlloy,[.85,.008,.008],[0,.295+i*.029,2.144],[0,0,0],0);
  for (const x of [-.35,-.18,0,.18,.35]) b.box(m.darkAlloy,[.008,.21,.008],[x,.40,2.15],[0,0,0],0);
  b.box(m.paint,[1.77,.055,.12],[0,.205,2.23],[0,0,0],.012);
  b.box(m.carbon,[1.68,.026,.17],[0,.174,2.21],[0,0,0],.008);
  for (let i=0;i<5;i++) b.box(m.darkAlloy,[.62,.007,.008],[0,.695+i*.025,2.204],[0,0,0],0);
  for (const x of [-.26,-.13,0,.13,.26]) b.box(m.darkAlloy,[.007,.12,.008],[x,.746,2.209],[0,0,0],0);
  b.box(m.carbon,[1.48,.16,.025],[0,.31,-2.29],[0,0,0],.01);
  rearPlate(b,m,.46,-2.306,.36,.17);
  // Independent red caliper material; the silver wheel trim stays silver.
  const caliper = m.accent.clone(); caliper.color.setHex(0xb51e20);
  wheels(vehicle,{...m,accent:caliper},{radius:.37,width:.28,track:.84,axles:AXLES,spokes:0,roadSmooth:true});
  // Larger alloy diameter with a low-profile tyre, without changing its contact.
  for (const wheel of data.wheels) {
    wheel.traverse(mesh => {
      if (mesh.isMesh && mesh.material === m.alloy) mesh.geometry.scale(1,1.17,1.17);
    });
    alloySpokes(wheel, m.alloy);
  }
  exhaust(vehicle,b,m,[[-.64,.27,-2.214]],.085);
  b.finish(data);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
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

// Convex five-sided lens, triangulated about its centre with matching winding.
function shapedLens(b, material, outline, scale, depth) {
  const centre = new THREE.Vector3();
  for (const point of outline) centre.add(new THREE.Vector3(...point));
  centre.multiplyScalar(1 / outline.length);
  const points = outline.map(point => new THREE.Vector3(...point).sub(centre).multiplyScalar(scale).add(centre));
  const positions = [];
  for (let i=0;i<points.length;i++) {
    const a=points[i], c=points[(i+1)%points.length];
    const ordered = outline[0][0] > 0 ? [centre,a,c] : [centre,c,a];
    for (const p of ordered) positions.push(p.x,p.y,p.z+depth);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.computeVertexNormals(); b.add(g,material); g.dispose();
}

function windowTrim(b,m) {
  for (const side of [-1,1]) {
    // Black rubber follows the inset glass edges. Broad painted A and C
    // pillars are part of the shell, continuous with the roof and quarters.
    const corners = [[side*.782,.875,.96],[side*.688,1.208,.49],[side*.684,1.212,-.66],[side*.775,.89,-.97]];
    for (let i=0;i<corners.length;i++) b.tube(m.carbon,[corners[i],corners[(i+1)%corners.length]],.012,12);
    b.tube(m.carbon,[[side*.783,.887,-.34],[side*.692,1.205,-.34]],.023,8);
  }
  for (const [z,y,w] of [[1.045,.928,.72],[.59,1.224,.625],[-.79,1.205,.63],[-1.39,.925,.72]]) {
    b.tube(m.carbon,[[-w,y,z],[0,y+.01,z],[w,y,z]],.009,24);
  }
}
