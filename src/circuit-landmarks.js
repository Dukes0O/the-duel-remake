// Authored circuit structures: presentation only, grounded in the actual world.
import * as THREE from 'three';
import {renderedGroundHeight} from './rendered-ground.js';
import {registerSceneSystem} from './scene-systems.js';

function weatheredMaterial(name, color, metalness = 0) {
  const material = new THREE.MeshStandardMaterial({name, color, metalness, roughness: .83});
  material.customProgramCacheKey = () => 'circuit-landmark-weathered-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vCircuitDetail;').replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvCircuitDetail=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vCircuitDetail;').replace('#include <color_fragment>',
      '#include <color_fragment>\nfloat wear=.5+.5*sin(vCircuitDetail.y*19.7+vCircuitDetail.x*13.3+sin(vCircuitDetail.z*11.1));\ndiffuseColor.rgb*=.83+.17*wear;');
  };
  return material;
}
function block(group, width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  return mesh;
}
function rods(group, lines, radius, material, name) {
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(radius, radius, 1, 6), material, lines.length);
  const transform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  lines.forEach(([a, b], i) => {
    direction.subVectors(b, a); transform.position.copy(a).add(b).multiplyScalar(.5);
    transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    transform.scale.set(1, direction.length(), 1); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
  });
  mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
  mesh.computeBoundingBox(); mesh.computeBoundingSphere(); group.add(mesh);
}
function radioMast(height) {
  const group = new THREE.Group(), steel = weatheredMaterial('galvanized lattice steel', 0x68767f, .68);
  const concrete = weatheredMaterial('mast concrete footing', 0x777873);
  const lines = [], wire = [], point = (side, level) => {
    const width = 1.7 - 1.15 * level / height;
    return new THREE.Vector3((side % 2 ? 1 : -1) * width / 2, level, (side < 2 ? 1 : -1) * width / 2);
  };
  for (let side = 0; side < 4; side++) {
    const x = side % 2 ? 1 : -1, z = side < 2 ? 1 : -1;
    block(group, .85, .7, .85, x * .85, .35, z * .85, concrete);
    lines.push([point(side, .7), point(side, height)]);
  }
  const cycle = [0, 1, 3, 2];
  for (let y = 1; y < height; y += 3) for (let face = 0; face < 4; face++) {
    const a = cycle[face], b = cycle[(face + 1) % 4], top = Math.min(height, y + 3);
    lines.push([point(a, y), point(b, top)], [point(b, y), point(a, top)], [point(a, y), point(b, y)]);
  }
  for (const y of [height - 5, height - 2]) {
    lines.push([new THREE.Vector3(-2.1, y, 0), new THREE.Vector3(2.1, y, 0)]);
    for (const x of [-1.8, -1.2, 1.2, 1.8]) lines.push([
      new THREE.Vector3(x, y - .7, -.1), new THREE.Vector3(x, y + .7, -.1)]);
  }
  for (const side of [-1, 1]) for (const z of [-1, 1]) wire.push([
    new THREE.Vector3(side * .4, height * .68, z * .4), new THREE.Vector3(side * 6, .4, z * 6)]);
  rods(group, lines, .065, steel, 'radio lattice and aerials');
  rods(group, wire, .025, steel, 'radio mast guy wires');
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6),
    new THREE.MeshStandardMaterial({name: 'radio beacon', color: 0xb51f16, emissive: 0xb51f16, emissiveIntensity: .7, roughness: .4}));
  beacon.position.y = height; group.add(beacon); return group;
}
export function scoreboardText(state, title = 'CIRCUIT') {
  const order = state?.field?.order || [];
  const lines = [title, 'RACE CONTROL'];
  if (order.length) for (const row of order.slice(0, 5)) {
    const name = row.you ? 'YOU' : String(row.name || 'RACER').toUpperCase().slice(0, 12);
    lines.push(String(row.position) + '  ' + name);
  } else lines.push('GRID', String((state?.opponents?.length || 0) + 1) + ' CARS');
  return lines.join('\n');
}
function scoreboard(height, title) {
  const group = new THREE.Group(), concrete = weatheredMaterial('timing tower concrete', 0x777e80);
  const frame = weatheredMaterial('timing tower dark steel', 0x27343b, .55);
  block(group, 3.9, height - 1, 3.9, 0, (height - 1) / 2, 0, concrete);
  block(group, 5.1, .5, 5.1, 0, height - .25, 0, frame);
  const material = new THREE.MeshStandardMaterial({name: 'timing display', color: 0xffffff,
    emissive: 0xffffff, emissiveIntensity: .8, roughness: .7});
  let canvas = null, context = null, signature = null;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 384;
    context = canvas.getContext('2d');
    if (!context) throw new Error('The timing display cannot draw its field.');
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    material.map = material.emissiveMap = texture;
  }
  for (const side of [-1, 1]) {
    const display = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5.25), material);
    display.position.set(0, height - 4, side * 1.98); display.rotation.y = side < 0 ? Math.PI : 0;
    group.add(display);
    block(group, 3.85, 5.6, .08, 0, height - 4, side * 1.95, frame);
  }
  for (const y of [2, 5, 8]) block(group, 4.0, .12, 4.0, 0, y, 0, frame);
  const sync = state => {
    if (!context) return;
    const text = scoreboardText(state, title); if (text === signature) return; signature = text;
    context.fillStyle = '#0b181f'; context.fillRect(0, 0, 256, 384);
    context.strokeStyle = '#59727b'; context.lineWidth = 4; context.strokeRect(4, 4, 248, 376);
    text.split('\n').forEach((line, i) => {
      context.fillStyle = i < 2 ? '#e5b762' : '#c7e5db';
      context.font = i === 0 ? 'bold 30px Arial' : i === 1 ? '16px Arial' : 'bold 26px Arial';
      context.textAlign = 'center'; context.fillText(line, 128, 42 + i * 45, 235);
    }); material.map.needsUpdate = true;
  };
  sync({}); return {group, sync};
}

export function addCircuitLandmarks(world, course) {
  const definitions = course.def.circuitLandmarks || [], systems = [], ids = new Set();
  if (!definitions.length) return null;
  if (!Array.isArray(definitions) || definitions.length > 16) throw new Error('Too many circuit landmarks.');
  const group = new THREE.Group(); group.name = 'Authored circuit landmarks';
  for (const spec of definitions) {
    if (!spec.id || ids.has(spec.id) || !['radio-mast', 'scoreboard'].includes(spec.type) || !Number.isFinite(spec.s) || spec.s < 0 || spec.s >= course.length ||
      !Number.isFinite(spec.lateral) || !(spec.height >= 12 && spec.height <= 40)) throw new Error('Invalid circuit landmark.');
    ids.add(spec.id);
    const halfWidth = spec.type === 'radio-mast' ? 6 : 3;
    if (Math.abs(spec.lateral) - halfWidth < course.roadHalfWidthAt(spec.s) + 1) throw new Error('Circuit landmark hides the road.');
    for (const along of [-halfWidth, 0, halfWidth]) for (const side of [-halfWidth, 0, halfWidth]) {
      const at = course.worldAt(spec.s + along, spec.lateral + side), nearest = course.nearest(at.x, at.z);
      if (nearest.distance < course.roadHalfWidthAt(nearest.s) + 1) throw new Error('Circuit landmark hides another road segment.');
    }
    const detail = spec.type === 'radio-mast' ? {group: radioMast(spec.height)} : scoreboard(spec.height, spec.title || 'CIRCUIT');
    const base = course.groundAt(spec.s, spec.lateral);
    detail.group.position.set(base.x, renderedGroundHeight(course, {...base, s: spec.s, off: spec.lateral}), base.z);
    detail.group.rotation.y = base.heading; detail.group.name = spec.id; group.add(detail.group);
    if (detail.sync) systems.push(detail.sync);
  }
  world.add(group); registerSceneSystem(world, {sync: state => systems.forEach(sync => sync(state))});
  return group;
}

// Materials belong to this ready kit owner; keep source assets and placement exact.
export function finishRidgeKitMaterials(owner) {
  return owner.ready.then(ready=>{
    if(!ready)return false;
    const finished=new Set();
    owner.group.traverse(mesh=>{
      if(!mesh.isMesh)return;
      for(const material of [].concat(mesh.material||[])){
        if(mesh.userData.trackKitId==='catch-fence'&&!finished.has(material)){
          finished.add(material);if(material.userData.ridgeFenceFinish)continue;
          const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
          material.userData.ridgeFenceFinish=true;
          material.onBeforeCompile=(shader,renderer)=>{
            compile.call(material,shader,renderer);
            shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vRidgeFenceHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRidgeFenceHeight=position.y;');
            shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vRidgeFenceHeight;').replace('#include <map_fragment>','diffuseColor.rgb*=mix(vec3(.34,.38,.39),vec3(.42,.43,.40),1.0-step(.95,vRidgeFenceHeight));');
          };
          material.customProgramCacheKey=()=>key+':ridge-concrete-fence-v1';material.needsUpdate=true;
        }
        if(/^shopfront-[ab]$/.test(mesh.userData.trackKitId)&&/warm-(amber|cream)-pane/.test(material.name)&&!material.name.includes('window'))material.name+=' window';
      }
    });
    return true;
  });
}
