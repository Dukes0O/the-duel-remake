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
// The wheel radius is the photo's (about .34 m); the V2 round used .37.
export const SKYLINE_VEHICLE_DIMENSIONS = Object.freeze({
  nissan_skyline_gtr_r34: Object.freeze({ width: 1.96, length: 4.60, height: 1.36, wheelRadius: .34 }),
});
// The four finishes of the packet (section 8.2), as appearance values for the paint panel.
// V6 copies the three extra rows into src/paint-presets.js (restricted to this car, 250 credits).
// Bayside Blue is the factory finish, so its appearance stays null in the shop and these
// numbers are the ones the model is built with.
export const SKYLINE_PAINTS = Object.freeze({
  factory: Object.freeze({ id: 'factory', name: 'Bayside Blue', color: 0x1b3d8c, metalness: .46, roughness: .27, clearcoat: .6, clearcoatRoughness: .2 }),
  skyline_white: Object.freeze({ id: 'skyline_white', name: 'Skyline White', color: 0xe8e8e2, metalness: .35, roughness: .29, clearcoat: .9, clearcoatRoughness: .16 }),
  skyline_silver: Object.freeze({ id: 'skyline_silver', name: 'Sonic Silver', color: 0xb4bac0, metalness: .55, roughness: .26, clearcoat: .9, clearcoatRoughness: .16 }),
  skyline_black: Object.freeze({ id: 'skyline_black', name: 'Midnight Black', color: 0x16181b, metalness: .30, roughness: .2, clearcoat: 1, clearcoatRoughness: .1 }),
});
const { materials, batch, cylinder, cockpit, wheels, exhaust, rearPlate } = originalVehicleParts;
const AXLES = [1.32, -1.345];
const RADIUS = SKYLINE_VEHICLE_DIMENSIONS.nissan_skyline_gtr_r34.wheelRadius;
const TAIL_SOCKET = /^Socket[_ ]tail[_ ](outer|inner)[_ ]([LR])$/;

export function createSkylineVehicle({ key = 'nissan_skyline_gtr_r34', color = 0x1b3d8c, accent = 0xc7ccd1 } = {}, source) {
  if (!Object.hasOwn(SKYLINE_VEHICLE_DIMENSIONS, key) || !source) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  const factory = SKYLINE_PAINTS.factory;
  m.paint.name = 'Bayside Blue body'; m.paint.metalness = factory.metalness; m.paint.roughness = factory.roughness;
  m.paint.clearcoat = factory.clearcoat; m.paint.clearcoatRoughness = factory.clearcoatRoughness;
  addMetallicFlake(m.paint);
  m.glass.color.setHex(0x17252e); m.glass.opacity = .68;
  m.glass.metalness = .06; m.glass.roughness = .18; m.glass.clearcoat = .35;
  m.brake.emissiveIntensity = .35;
  m.headlight.color.setHex(0xa9b9c4); m.headlight.roughness = .18;
  m.headlight.emissive.setHex(0x687d90); m.headlight.emissiveIntensity = .04;
  m.cover = new THREE.MeshPhysicalMaterial({ name: 'Headlamp cover', color: 0xc9d9e0, metalness: 0, roughness: .05, clearcoat: 1, transparent: true, opacity: .26, depthWrite: false });
  m.amber = new THREE.MeshStandardMaterial({ name: 'Indicator lamps', color: 0xc4620a, emissive: 0xff8a1a, emissiveIntensity: .18, roughness: .3 });
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...SKYLINE_VEHICLE_DIMENSIONS[key] },
    damageSpace: { scale: [.88, .85, 1], offset: [0, 0, 0], frontGlassZ: .40, rearGlassZ: -1.26 },
  });
  // Flatten each GLB primitive into the existing material batch. Every instance
  // gets private geometry and paint; no source buffers enter the damage system.
  const shellMaterial = { skyline_paint: m.paint, skyline_trim: m.carbon, skyline_glass: m.glass, skyline_lens: m.headlight, skyline_alloy: m.alloy, skyline_cover: m.cover, skyline_amber: m.amber };
  const sockets = [];
  source.traverse(node => {
    if (TAIL_SOCKET.test(node.name)) sockets.push({ match: TAIL_SOCKET.exec(node.name), matrix: node.matrixWorld.clone() });
    if (!node.isMesh) return;
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    b.add(geometry, shellMaterial[node.material.name] ?? m.glass);
    geometry.dispose();
  });
  cockpit(vehicle, b, m, [.34,.015,.02], .9);
  noseDetails(b, m);
  tailDetails(b, m, sockets);
  mirrors(b, m);
  wing(b, m);
  wipers(b, m);
  // Independent red caliper material; the silver wheel trim stays silver.
  const caliper = m.accent.clone(); caliper.color.setHex(0xb51e20);
  wheels(vehicle,{...m,accent:caliper},{radius:RADIUS,width:.27,track:.74,axles:AXLES,spokes:0,roadSmooth:true});
  for (const pivot of data.wheelPivots) refineWheel(pivot, m, caliper);
  exhaust(vehicle,b,m,[[-.39,.31,-2.222]],.07);
  const lip = new THREE.TorusGeometry(.07,.008,6,28); b.add(lip,m.alloy,[-.39,.31,-2.305]); lip.dispose();
  b.finish(data);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// Fine metallic flake: a cheap, repeatable glitter in the paint shader. Each tiny cell gets a
// fixed random brightness, and a few of them flash as the view angle changes. It scales with the
// finish's metalness, so the black and the white show less than the silver and the blue.
// Installed before prepareVehicleDamage, whose wear shader chains after this one.
function addMetallicFlake(paint) {
  paint.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vFlakePosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlakePosition = position;');
    shader.fragmentShader = 'varying vec3 vFlakePosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 flakeCell = floor(vFlakePosition * 210.);
      float flakeA = fract(sin(dot(flakeCell, vec3(12.9898, 78.233, 39.425))) * 43758.5453);
      float flakeB = fract(sin(dot(flakeCell, vec3(26.651, 17.173, 91.337))) * 24634.6345);
      float flakeView = abs(dot(normalize(vNormal), normalize(vViewPosition)));
      float flakeGlint = smoothstep(.86, 1., fract(flakeA * 5. + flakeView * 2.6)) * step(.55, flakeB);
      float flakeAmount = smoothstep(.12, .6, metalness);
      diffuseColor.rgb *= 1. + (flakeA - .5) * .14 * flakeAmount;
      diffuseColor.rgb += (diffuseColor.rgb * 1.5 + .05) * flakeGlint * flakeAmount * .55;`);
  };
  paint.customProgramCacheKey = () => 'skyline-metallic-flake-v1';
}

function noseDetails(b, m) {
  // Grille and intake meshes sit deep inside the recesses cut in the nose: a black back plate,
  // a coarse vertical layer, then a fine horizontal layer in front.
  // Lower intake: an intercooler core behind slatted mesh.
  b.box(m.carbon,[.66,.20,.02],[0,.345,2.03],[0,0,0],0);
  b.box(m.darkAlloy,[.58,.15,.05],[0,.345,2.07],[0,0,0],0);
  for (let i=0;i<9;i++) b.box(m.carbon,[.58,.006,.03],[0,.285+i*.0165,2.115],[0,0,0],0);
  for (let i=-9;i<=9;i++) b.box(m.carbon,[.008,.19,.012],[i*.032,.345,2.185],[0,0,0],0);
  for (let i=0;i<6;i++) b.box(m.darkAlloy,[.64,.007,.01],[0,.27+i*.034,2.215],[0,0,0],0);
  // Upper grille between the headlamps: black mesh.
  b.box(m.carbon,[.60,.10,.02],[0,.628,2.01],[0,0,0],0);
  for (let i=-11;i<=11;i++) b.box(m.carbon,[.007,.10,.012],[i*.026,.628,2.12],[0,0,0],0);
  for (let i=0;i<5;i++) b.box(m.darkAlloy,[.60,.007,.01],[0,.592+i*.0175,2.15],[0,0,0],0);
  for (const side of [-1,1]) {
    // Corner ducts: dark backing and a two-layer mesh.
    b.box(m.carbon,[.21,.10,.02],[side*.525,.325,2.03],[0,0,0],0);
    for (let i=-4;i<=4;i++) b.box(m.carbon,[.006,.10,.012],[side*(.525+i*.0225),.325,2.14],[0,0,0],0);
    for (let i=0;i<4;i++) b.box(m.darkAlloy,[.21,.006,.01],[side*.525,.285+i*.027,2.17],[0,0,0],0);
  }
  // Black front lip, tapered at the ends like the photo's splitter.
  const outline = [[-.72,2.10],[-.74,2.20],[-.62,2.28],[-.45,2.31],[.45,2.31],[.62,2.28],[.74,2.20],[.72,2.10]];
  const shape = new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
  const lip = new THREE.ExtrudeGeometry(shape,{depth:.026,bevelEnabled:false});
  lip.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,1,0)));
  b.add(lip,m.carbon,[0,.138,0]); lip.dispose();
}

// Tail: the four lamps sit in the pockets cut in the boot panel. The recipe leaves a socket (an
// empty in the GLB) at the floor of each pocket; its local +Y runs out of the pocket.
// Round lamp: black bezel, red domed lens with a ring; the inner lamps carry an amber centre.
function tailDetails(b, m, sockets) {
  const radii = { outer: .085, inner: .068 };
  for (const { match, matrix } of sockets) {
    const [, which] = match, r = radii[which] - .006;
    const place = (geometry, material) => { b.add(geometry.applyMatrix4(matrix), material); geometry.dispose(); };
    place(new THREE.TorusGeometry(r+.006,.007,4,28).rotateX(Math.PI/2).translate(0,.052,0), m.carbon);
    const dome = [[0,.046],[r*.45,.043],[r*.8,.033],[r*.97,.02],[r*.97,0]].reverse().map(([x,y])=>new THREE.Vector2(x,y));
    place(new THREE.LatheGeometry(dome,28), m.brake);
    place(new THREE.TorusGeometry(r*.64,.0035,4,28).rotateX(Math.PI/2).translate(0,.04,0), m.carbon);
    if (which === 'inner') {
      const centre = [[0,.052],[r*.3,.05],[r*.52,.042],[r*.52,.026]].reverse().map(([x,y])=>new THREE.Vector2(x,y));
      place(new THREE.LatheGeometry(centre,24), m.amber);
    }
  }
  // Centre high brake light, laid on the boot lid behind the glass.
  b.box(m.brake,[.22,.014,.045],[0,1.03,-1.6],[-.107,0,0],.006);
  // Small clear (right) and red (left) lamps either side of the plate.
  b.box(m.plate,[.12,.045,.018],[-.355,.52,-2.298],[0,0,0],.008);
  b.box(m.brake,[.12,.045,.018],[.355,.52,-2.298],[0,0,0],.008);
  rearPlate(b,m,.50,-2.304,.33,.17);
  // Layered diffuser: a black lip, two stepped plates and a row of fins under the bumper.
  b.box(m.carbon,[1.36,.03,.07],[0,.275,-2.225],[0,0,0],0);
  b.box(m.carbon,[1.22,.03,.12],[0,.245,-2.215],[0,0,0],0);
  b.box(m.carbon,[1.06,.03,.20],[0,.215,-2.17],[.05,0,0],0);
  for (const x of [-.53,-.18,.0,.18,.36,.53]) b.box(m.carbon,[.024,.075,.20],[x,.2,-2.15],[.05,0,0],0);
}

// Door mirrors: an egg-shaped housing with a flat back face, a dark glass and a swept stalk.
function mirrors(b, m) {
  for (const side of [-1,1]) {
    const housing = new THREE.SphereGeometry(1,16,10).scale(.09,.052,.085);
    const p = housing.attributes.position;
    for (let i=0;i<p.count;i++) if (p.getZ(i) < -.045) p.setZ(i,-.045);
    housing.computeVertexNormals();
    b.add(housing,m.paint,[side*.886,1.0,.47],[0,side*.2,0]); housing.dispose();
    const glass = new THREE.CircleGeometry(.056,16).scale(1,.72,1).rotateY(Math.PI);
    b.add(glass,m.darkAlloy,[side*.886,1.0,.423],[0,side*.2,0]); glass.dispose();
    b.box(m.paint,[.12,.03,.07],[side*.80,.955,.50],[0,side*-.35,0],.012);
    b.box(m.carbon,[.012,.07,.09],[side*.762,.97,.495],[0,0,0],.004);
  }
}

// Rear wing: twin swept uprights, a slim blade and two end plates.
function wing(b, m) {
  // Extrude a shape drawn in (chord, thickness) along the wing's span (x).
  const spanMatrix = new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),new THREE.Vector3(-1,0,0));
  const extrude = (points, span) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y))),{depth:span,bevelEnabled:false});
    g.applyMatrix4(spanMatrix).translate(span/2,0,0); return g;
  };
  const blade = extrude([[.13,0],[.12,.010],[.08,.017],[0,.020],[-.09,.016],[-.13,.006],[-.13,-.004],[-.09,-.012],[0,-.014],[.09,-.009],[.125,-.004]],1.2);
  b.add(blade,m.paint,[0,1.158,-2.12],[.06,0,0]); blade.dispose();
  for (const side of [-1,1]) {
    const upright = extrude([[.04,0],[-.04,0],[-.22,.155],[-.14,.155]],.03);
    b.add(upright,m.paint,[side*.39,.985,-1.90]); upright.dispose();
    const plate = extrude([[.14,-.035],[.14,.028],[-.15,.045],[-.15,-.035]],.012);
    b.add(plate,m.paint,[side*.61,1.158,-2.12],[.06,0,0]); plate.dispose();
  }
}

// Wipers parked along the base of the windscreen: a thin arm and a slim blade each.
function wipers(b, m) {
  const pitch = .588; // the windscreen base rises 0.67 m per metre going back
  for (const side of [-1,1]) {
    b.box(m.carbon,[.50,.006,.018],[side*.30,1.005,.625],[pitch,side*-.05,0],.003);
    b.box(m.carbon,[.34,.005,.009],[side*.43,1.011,.598],[pitch,side*.06,0],.002);
    b.box(m.darkAlloy,[.03,.014,.03],[side*.6,.99,.64],[pitch,0,0],.004);
  }
}

// Replace the shared helper's torus tyre, tread bands and sidewall marks with a flat-topped
// low-profile tyre (a lathe profile, about half the triangles) and a lighter red caliper.
function refineWheel(pivot, m, caliper) {
  const side = Math.sign(pivot.position.x), spin = pivot.children.find(node => node.isGroup);
  const find = material => spin.children.find(node => node.isMesh && node.material === material);
  const half = [[.205,.085],[.215,.113],[.245,.125],[.285,.131],[.318,.126],[.334,.106],[.34,.082],[.34,.03],[.3375,.026],[.3375,.014],[.34,.01],[.34,0]]
    .map(([r,a])=>[r*RADIUS/.34,a]);
  const profile = [...half.map(([r,a])=>new THREE.Vector2(r,-a)).slice(0,-1), ...half.slice().reverse().map(([r,a])=>new THREE.Vector2(r,a)), new THREE.Vector2(half[0][0],-half[0][1])];
  const tyre = new THREE.LatheGeometry(profile,48).rotateZ(Math.PI/2);
  const rubber = find(m.rubber); rubber.geometry.dispose(); rubber.geometry = tyre;
  const marks = [];
  const ring = new THREE.TorusGeometry(.30,.004,4,36).rotateY(Math.PI/2).translate(side*.1295,0,0); marks.push(ring);
  for (let i=0;i<14;i++) {
    const a = i*Math.PI*2/14, g = new THREE.BoxGeometry(.004,.012,i%3===0 ? .022 : .008);
    g.rotateX(a).translate(side*.1275,Math.cos(a)*.27,Math.sin(a)*.27); marks.push(g);
  }
  const mark = find(m.tireMark); mark.geometry.dispose(); mark.geometry = mergeGeometries(marks.map(g=>g.index ? g.toNonIndexed() : g));
  marks.forEach(g=>g.dispose());
  // Caliper: a short arc of brake clamp behind the spokes.
  const arm = pivot.children.find(node => node.isMesh && node.material === caliper);
  const direction = Math.atan2(arm.position.z, arm.position.y), shape = new THREE.Shape();
  shape.absarc(0,0,.235,direction-.5,direction+.5,false); shape.absarc(0,0,.178,direction+.5,direction-.5,true);
  const clamp = new THREE.ExtrudeGeometry(shape,{depth:.05,curveSegments:5,bevelEnabled:false});
  clamp.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0))).translate(-.025,0,0);
  arm.geometry.dispose(); arm.geometry = clamp; arm.position.y = 0; arm.position.z = 0;
  // Alloy: larger diameter than the helper's barrel, with six wide spokes.
  spin.traverse(mesh => { if (mesh.isMesh && mesh.material === m.alloy) mesh.geometry.scale(1,1.17,1.17); });
  alloySpokes(spin, m.alloy);
}

function alloySpokes(wheel, material) {
  const side = Math.sign(wheel.parent.position.x), s = RADIUS / .37;
  const shape = new THREE.Shape();
  shape.moveTo(-.024*s,.047*s); shape.lineTo(-.031*s,.13*s); shape.lineTo(-.024*s,.255*s);
  shape.lineTo(.024*s,.255*s); shape.lineTo(.031*s,.13*s); shape.lineTo(.024*s,.047*s);
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
