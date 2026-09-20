import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PROFILE = [[3.08, -.8], [3.08, .64], [2.98, .82], [2.80, .94], [2.69, 2.3], [2.48, 6.5], [2.25, 11.5], [1.98, 17.9], [1.95, 19.0]];
const TAU = Math.PI * 2;
function radiusAt(y) {
  for (let i = 1; i < PROFILE.length; i++) {
    if (y <= PROFILE[i][1]) {
      const a = PROFILE[i - 1], b = PROFILE[i];
      return THREE.MathUtils.lerp(a[0], b[0], THREE.MathUtils.clamp((y - a[1]) / (b[1] - a[1]), 0, 1));
    }
  }
  return PROFILE.at(-1)[0];
}

// Fitted curved panes avoid floating rectangles on the tapered tower.
function patch(angle, halfAngle, low, high, lift = .018) {
  const positions = [], uv = [], indices = [], steps = 10;
  for (let i = 0; i <= steps; i++) {
    const a = angle - halfAngle + i / steps * halfAngle * 2;
    for (const [edge, y] of [[0, low], [1, high]]) {
      const radius = radiusAt(y) + lift;
      positions.push(Math.sin(a) * radius, y, Math.cos(a) * radius); uv.push(i / steps, edge);
    }
    if (i) { const a = (i - 1) * 2, b = i * 2; indices.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function weatheredPlaster() {
  const material = new THREE.MeshStandardMaterial({ color: 0xe7e1d0, roughness: .90 });
  material.customProgramCacheKey = () => 'pacific-lighthouse-plaster-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLighthouse;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLighthouse=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLighthouse;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float angle=atan(vLighthouse.z,vLighthouse.x);
        float streak=.5+.5*sin(angle*23.0+sin(angle*7.0)*2.1+vLighthouse.y*.075);
        float grain=fract(sin(dot(floor(vLighthouse*28.0),vec3(17.13,43.7,29.1)))*43758.5453);
        float rainStain=pow(streak,7.0)*(.18+.82*smoothstep(6.0,19.0,vLighthouse.y));
        float dampFoot=1.0-smoothstep(.8,3.4+streak*.6,vLighthouse.y);
        diffuseColor.rgb*=.965+grain*.055-rainStain*.15;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.60,.64,.53),dampFoot*.65);
      `);
  };
  return material;
}

// The original lighthouse's 3.2 m solid radius is retained. New detail is
// merged by material, rather than adding one scene draw for every rail/stone.
export function createCoastLighthouse(feature, course) {
  const group = new THREE.Group(); group.name = 'Pacific weathered lighthouse';
  const materials = {
    plaster: weatheredPlaster(),
    stone: new THREE.MeshStandardMaterial({ color: 0x797a6b, roughness: .96, vertexColors: true }),
    iron: new THREE.MeshStandardMaterial({ color: 0x243436, roughness: .57, metalness: .64 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x66858a, roughness: .15, metalness: .42, transparent: true, opacity: .58, depthWrite: false, emissive: 0xffc879, emissiveIntensity: .14 }),
    door: new THREE.MeshStandardMaterial({ color: 0x253c3b, roughness: .7 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffe4a3, roughness: .25, emissive: 0xffbe6b, emissiveIntensity: 1.1 }),
  };
  const buckets = new Map(Object.keys(materials).map(key => [key, []]));
  const add = (kind, geometry, position = [0, 0, 0], rotation = [0, 0, 0], tint) => {
    geometry.rotateX(rotation[0]); geometry.rotateY(rotation[1]); geometry.rotateZ(rotation[2]); geometry.translate(...position);
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    if (piece !== geometry) geometry.dispose();
    // All merged pieces share the same attributes, including textureless rails.
    if (!piece.attributes.uv) piece.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(piece.attributes.position.count * 2), 2));
    if (kind === 'stone') {
      const color = new THREE.Color(tint || 0xffffff), colors = [];
      for (let i = 0; i < piece.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
      piece.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    buckets.get(kind).push(piece);
  };
  let base = feature.y;
  for (let i = 0; i < 32; i++) {
    const angle = i / 32 * TAU, x = feature.x + Math.sin(angle) * 3.1, z = feature.z + Math.cos(angle) * 3.1;
    const nearest = course.nearest(x, z);
    base = Math.min(base, course.groundAt(nearest.s, nearest.lateral).y);
  }
  const buried = base - feature.y - 1.0;
  add('stone', new THREE.CylinderGeometry(3.12, 3.12, .62 - buried, 48), [0, (buried + .62) / 2, 0]);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 26; i++) {
    const angle = (i + (row % 2) * .5) / 26 * TAU;
    add('stone', new THREE.CylinderGeometry(3.15, 3.15, .22, 3, 1, true, angle, TAU / 26 - .012), [0, row * .24 + .10, 0], undefined, i % 4 === 0 ? 0xbab9a5 : i % 3 === 0 ? 0xe1ddca : 0xd0cdbd);
  }
  add('plaster', new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 64));
  add('iron', patch(Math.PI, .235, .25, 2.6));
  add('door', patch(Math.PI, .198, .30, 2.48, .027));
  for (const [height, angle] of [[5.3, Math.PI], [9.8, Math.PI * 1.55], [14.4, Math.PI], [16.6, Math.PI * .45]]) {
    add('iron', patch(angle, .13, height, height + 1.24));
    add('glass', patch(angle, .092, height + .09, height + 1.15, .027));
  }
  for (const y of [18.76, 18.93]) add('plaster', new THREE.CylinderGeometry(2.12, 2.12, .14, 64), [0, y, 0]);
  add('iron', new THREE.CylinderGeometry(2.75, 2.59, .18, 48), [0, 19.16, 0]);
  for (const y of [19.52, 20.20]) add('iron', new THREE.TorusGeometry(2.64, .035, 5, 48), [0, y, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * TAU;
    add('iron', new THREE.CylinderGeometry(.029, .033, 1.04, 5), [Math.sin(a) * 2.64, 19.71, Math.cos(a) * 2.64]);
  }
  add('iron', new THREE.CylinderGeometry(1.99, 1.99, .3, 16), [0, 19.57, 0]);
  add('glass', new THREE.CylinderGeometry(1.80, 1.80, 2.10, 16, 1, true), [0, 20.76, 0]);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    add('iron', new THREE.CylinderGeometry(.043, .047, 2.28, 6), [Math.sin(a) * 1.83, 20.78, Math.cos(a) * 1.83]);
  }
  for (const y of [19.72, 20.75, 21.80]) add('iron', new THREE.TorusGeometry(1.83, .045, 6, 48), [0, y, 0], [Math.PI / 2, 0, 0]);
  add('lamp', new THREE.CylinderGeometry(.34, .34, 1.05, 16), [0, 20.7, 0]);
  add('iron', new THREE.CylinderGeometry(2.15, 2.15, .16, 16), [0, 21.95, 0]);
  add('iron', new THREE.ConeGeometry(2.24, 1.58, 16), [0, 22.79, 0]);
  add('iron', new THREE.CylinderGeometry(.045, .08, .46, 8), [0, 23.8, 0]);
  for (const [kind, pieces] of buckets) {
    if (!pieces.length) { materials[kind].dispose(); continue; }
    const geometry = mergeGeometries(pieces); pieces.forEach(piece => piece.dispose()); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, materials[kind]); mesh.name = `Lighthouse ${kind}`;
    mesh.castShadow = kind !== 'lamp' && kind !== 'glass'; mesh.receiveShadow = true; group.add(mesh);
  }
  group.position.set(feature.x, feature.y, feature.z); group.rotation.y = feature.heading;
  group.userData.coastLighthouse = { footprint: 3.2, base, featureId: feature.id };
  return group;
}
