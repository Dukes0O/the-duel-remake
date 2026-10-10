import * as THREE from 'three';

export const FLAME_TEXTURES = Object.freeze({
  tongues: '/assets/textures/flamethrower-tongues.png',
  smoke: '/assets/textures/flamethrower-smoke.png',
  scorch: '/assets/textures/flamethrower-scorch.png',
});

// Shader and headless checks use the same geometric domain: a circular sector,
// not a cone whose end corners can reach beyond the damage range.
export function insideFlameFootprint(x, z, range, halfAngle) {
  return z >= 0 && Math.hypot(x, z) <= range && Math.abs(Math.atan2(x, z)) <= halfAngle;
}

const vertex = `
attribute float flameTile;
varying vec2 flameUv;
varying vec3 flameAt;
void main() {
  flameUv = vec2((uv.x + flameTile) / 4.0, uv.y);
  vec4 at = instanceMatrix * vec4(position, 1.0);
  flameAt = at.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * at;
}`;
const fragment = `
uniform sampler2D flameMap;
uniform float flameRange;
uniform float flameHalfAngle;
uniform float flameReveal;
uniform float flameBody;
varying vec2 flameUv;
varying vec3 flameAt;
void main() {
  float distance = length(flameAt.xz);
  if (flameBody < 0.5 && (flameAt.z < 0.0 || distance > flameRange * flameReveal ||
      abs(atan(flameAt.x, flameAt.z)) > flameHalfAngle)) discard;
  vec4 source = texture2D(flameMap, flameUv);
  float density = pow(source.a, 0.65) * smoothstep(0.03, 0.30, source.r);
  float heat = clamp(source.r * 1.75 + (1.0 - distance / max(flameRange, 0.01)) * 0.22, 0.0, 1.0);
  vec3 color = mix(vec3(0.55, 0.045, 0.008), vec3(1.0, 0.48, 0.035), smoothstep(0.08, 0.65, heat));
  color = mix(color, vec3(1.0, 0.90, 0.58), smoothstep(0.65, 1.0, heat));
  gl_FragColor = vec4(color, density * 0.88);
}`;

function texture(loader, path) {
  const map = loader(path);
  map.name = path;
  // Tongues store scalar heat/density, so gamma conversion would erase their soft midtones.
  map.colorSpace = path === FLAME_TEXTURES.tongues ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  return map;
}

/** One small texture set per scene, shared by the fixed visual pools. */
export function createFlameResources({loadTexture = path => new THREE.TextureLoader().load(path)} = {}) {
  const maps = Object.fromEntries(Object.entries(FLAME_TEXTURES).map(([key, path]) => [key, texture(loadTexture, path)]));
  let retired = false;
  return {maps, dispose() {if (retired) return; retired = true;
    Object.values(maps).forEach(map => map.dispose());}};
}

/** Owns presentation resources only. Caller supplies simulation time and poses. */
export function createFlameView({range = 9, halfAngle = Math.PI / 12, body = false,
  resources, loadTexture = path => new THREE.TextureLoader().load(path)} = {}) {
  const group = new THREE.Group();
  group.name = body ? 'Textured body fire' : 'Textured flame burst';
  group.visible = false;
  const map = resources?.maps.tongues || texture(loadTexture, FLAME_TEXTURES.tongues);
  const smokeMap = resources?.maps.smoke || texture(loadTexture, FLAME_TEXTURES.smoke);
  const count = body ? 12 : 36;
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.setAttribute('flameTile', new THREE.InstancedBufferAttribute(
    Float32Array.from({length: count}, (_, index) => index % 4), 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {flameMap: {value: map}, flameRange: {value: range},
      flameHalfAngle: {value: halfAngle}, flameReveal: {value: 1}, flameBody: {value: body ? 1 : 0}},
    vertexShader: vertex, fragmentShader: fragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const tongues = new THREE.InstancedMesh(geometry, material, count);
  tongues.name = 'CC0 rolling flame tongues';
  tongues.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tongues.frustumCulled = false;
  tongues.renderOrder = 3;
  group.add(tongues);
  const smokeGeometry = new THREE.PlaneGeometry(1, 1);
  const smokeMaterial = new THREE.MeshStandardMaterial({map: smokeMap, color: 0x594d42,
    roughness: 1, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide});
  const smoke = new THREE.InstancedMesh(smokeGeometry, smokeMaterial, body ? 3 : 6);
  smoke.name = 'Flame tip smoke'; smoke.frustumCulled = false;
  smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(smoke);
  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(body ? 18 : 42);
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMaterial = new THREE.PointsMaterial({color: 0xffbd57, size: .045,
    transparent: true, opacity: .85, depthWrite: false, toneMapped: false});
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  sparks.frustumCulled = false; sparks.name = 'Flame embers'; group.add(sparks);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const orientation = new THREE.Quaternion(), inverse = new THREE.Quaternion();
  let wasActive = false, startedAt = 0, retired = false;
  function update({active, seconds = 0, age, camera, quality = 'high', coneHalfAngle = halfAngle} = {}) {
    if (retired) return;
    group.visible = !!active;
    material.uniforms.flameHalfAngle.value = coneHalfAngle;
    if (!active) {wasActive = false; return;}
    if (!wasActive) startedAt = seconds;
    wasActive = true;
    const elapsed = Number.isFinite(age) ? age : seconds - startedAt;
    material.uniforms.flameReveal.value = body ? 1 : Math.max(.06, Math.min(1, elapsed / .14));
    group.updateWorldMatrix(true, false);
    inverse.copy(group.getWorldQuaternion(orientation)).invert();
    if (camera) camera.getWorldQuaternion(orientation); else orientation.identity();
    orientation.premultiply(inverse);
    const visibleCount = quality === 'performance' ? Math.ceil(count * .75) : count;
    tongues.count = visibleCount;
    for (let i = 0; i < visibleCount; i++) {
      const phase = (seconds * (body ? 1.45 : 2.1) + i * .61803398875) % 1;
      if (body) {
        const side = i % 2 ? 1 : -1;
        position.set(side * .48, phase * .85, ((i % 3) - 1) * .83);
        scale.set(.75 + phase * .65, 1.1 + phase * 1.6, 1);
      } else {
        const z = range * (.025 + phase * .98), width = z * Math.tan(coneHalfAngle);
        const stream = (i % 3) - 1;
        position.set(stream * width * .65 + Math.sin(seconds * 7 + i) * width * .1,
          Math.sin(i * 2.17 + seconds * 5) * .19 + phase * .18, z);
        scale.set(.24 + width * 1.5, .25 + width * 1.45, 1);
      }
      matrix.compose(position, orientation, scale); tongues.setMatrixAt(i, matrix);
    }
    tongues.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < smoke.count; i++) {
      const phase = (seconds * .8 + i / smoke.count) % 1;
      position.set(Math.sin(i * 2.3 + seconds) * (body ? .4 : .65),
        .45 + phase * 1.45, body ? (i - 1) * .7 : range * (.82 + phase * .15));
      const size = (body ? .7 : 1.0) + phase * 1.2; scale.set(size, size, 1);
      matrix.compose(position, orientation, scale); smoke.setMatrixAt(i, matrix);
    }
    smoke.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < sparkPositions.length / 3; i++) {
      const phase = (seconds * 1.8 + i * .381966) % 1;
      const z = body ? (i % 3 - 1) * .65 : range * (.05 + phase * .88);
      const x = body ? Math.sin(i) * .5 : Math.sin(i * 2.13) * z * Math.tan(coneHalfAngle) * .65;
      sparkPositions.set([x, .15 + phase * (body ? 1.7 : .8), z], i * 3);
    }
    sparkGeometry.attributes.position.needsUpdate = true;
  }
  return {group, update, dispose() {
    if (retired) return; retired = true;
    if (!resources) {map.dispose(); smokeMap.dispose();}
    for (const resource of [geometry, material, smokeGeometry, smokeMaterial,
      sparkGeometry, sparkMaterial]) resource.dispose();
    group.clear(); group.removeFromParent();
  }};
}

/** Five-second render-only footprints; fixed capacity avoids unbounded trails. */
export function createFlameScorch({capacity = 32, resources, loadTexture = path => new THREE.TextureLoader().load(path)} = {}) {
  const group = new THREE.Group(); group.name = 'Flame scorch marks';
  const map = resources?.maps.scorch || texture(loadTexture, FLAME_TEXTURES.scorch);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const entries = Array.from({length: capacity}, () => {
    const material = new THREE.MeshBasicMaterial({map, color: 0x211812, transparent: true,
      opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
    const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false; group.add(mesh); return {mesh, born: -Infinity};
  });
  let cursor = 0, retired = false;
  return {group, stamp({x,y,z,heading=0,size=1}, seconds) {
    if (retired) return;
    // A busy fight may skip a new mark, but never retire a visible mark early.
    let entry;
    for (let offset = 0; offset < capacity; offset++) {
      const index = (cursor + offset) % capacity, candidate = entries[index];
      if (seconds - candidate.born >= 5) {entry = candidate; cursor = index + 1; break;}
    }
    if (!entry) return;
    entry.born = seconds;
    entry.mesh.position.set(x,y+.045,z); entry.mesh.rotation.set(-Math.PI/2,0,-heading);
    entry.mesh.scale.set(size,size,1); entry.mesh.visible = true;
  }, reset() {
    cursor = 0; for (const entry of entries) {entry.born = -Infinity; entry.mesh.visible = false;}
  }, update(seconds) {
    if (retired) return;
    for (const entry of entries) {
      const age = seconds - entry.born;
      entry.mesh.visible = age >= 0 && age < 5;
      entry.mesh.material.opacity = entry.mesh.visible ? .5 * (1 - age/5) : 0;
    }
  }, dispose() {if (retired) return; retired = true;
    for (const entry of entries) entry.mesh.material.dispose(); geometry.dispose();
    if (!resources) map.dispose(); group.clear();}};
}

// Keep exactly two registered lights, even at zero intensity. Firing never
// changes Three's light count or asks car/ground materials for a new program.
export function createFlameLighting() {
  const group = new THREE.Group(); group.name = 'Bounded flame lighting';
  const lights = Array.from({length: 2}, () => new THREE.PointLight(0xff6d17, 0, 9, 2));
  group.add(...lights);
  let retired = false;
  return {group, update(sources, seconds = 0) {
    if (retired) return;
    lights.forEach((light, index) => {
      const source = sources[index];
      light.intensity = source ? (source.body ? 4 : 12) * (.9 + .1 * Math.sin(seconds * 23)) : 0;
      if (!source) return;
      light.position.set(source.x, source.y + .4, source.z);
      light.distance = source.body ? 4 : source.range;
    });
  }, dispose() {if (retired) return; retired = true; lights.forEach(light => light.dispose()); group.clear();}};
}
