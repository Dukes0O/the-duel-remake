import * as THREE from 'three';
import {createTerrainMaterial, terrainStyleAt} from './terrain-style.js';
import PROPS from './generated/muddy-hollow-props.json' with {type: 'json'};

const GROUND_ALONG_SEGMENTS = 96;
const GROUND_LATERAL_SEGMENTS = 90;
const WATER_ALONG_SEGMENTS = 40;
const WATER_LATERAL_SEGMENTS = 34;

function localToWorld(zone, along, lateral) {
  const sin = Math.sin(zone.frame.heading), cos = Math.cos(zone.frame.heading);
  return {
    x: zone.frame.origin.x + sin * along + cos * lateral,
    z: zone.frame.origin.z + cos * along - sin * lateral,
  };
}

function localPosition(zone, point) {
  const dx = point.x - zone.frame.origin.x;
  const dz = point.z - zone.frame.origin.z;
  return {
    along: dx * Math.sin(zone.frame.heading) + dz * Math.cos(zone.frame.heading),
    lateral: dx * Math.cos(zone.frame.heading) - dz * Math.sin(zone.frame.heading),
  };
}

function inside(zone, along, lateral, padding = 0) {
  const da = along / zone.bounds.alongRadius;
  const dl = (lateral - zone.bounds.lateralCenter) / zone.bounds.lateralRadius;
  return Math.hypot(da, dl) <= 1 + padding;
}

// The Hollow ground is the course terrain (same material, tint and texture
// scale as the ground around it) with Kyle's chosen mud surface in the pits.
function buildGround(zone, course, textures) {
  const positions = [], colors = [], surfaces = [], uvs = [], weights = [],
    wetness = [], indices = [];
  const alongRadius = zone.bounds.alongRadius;
  const lateralRadius = zone.bounds.lateralRadius;
  const lateralCenter = zone.bounds.lateralCenter;
  const style = terrainStyleAt(course, zone.frame.s), tint = new THREE.Color();
  for(let row = 0; row <= GROUND_LATERAL_SEGMENTS; row++) {
    const lateral = lateralCenter - lateralRadius +
      row / GROUND_LATERAL_SEGMENTS * lateralRadius * 2;
    for(let column = 0; column <= GROUND_ALONG_SEGMENTS; column++) {
      const along = -alongRadius + column / GROUND_ALONG_SEGMENTS * alongRadius * 2;
      const point = localToWorld(zone, along, lateral);
      const surface = zone.surfaceAt(point.x, point.z);
      const mud = surface.mud || 0, water = surface.waterDepth || 0;
      positions.push(point.x, zone.heightAt(point.x, point.z) + .032, point.z);
      uvs.push(point.x / 22, point.z / 22);
      weights.push(...style.weights);
      surfaces.push(water > .02 ? 2 : mud > .02 ? 1 : 0);
      wetness.push(mud);
      // The same gentle light variation as the course terrain.
      const wave = Math.sin(along * .012 + lateral * .017) * Math.cos(along * .004 - lateral * .031);
      tint.copy(style.color).multiplyScalar(.86 + .13 * wave + .07 * Math.sin(along * .025));
      // Ground under the pond reads as a dark blue-green bed through the water.
      if(water > .02) tint.lerp(new THREE.Color(.08, .16, .16), Math.min(1, .4 + water * .6));
      colors.push(tint.r, tint.g, tint.b);
    }
  }
  const width = GROUND_ALONG_SEGMENTS + 1;
  for(let row = 0; row < GROUND_LATERAL_SEGMENTS; row++) {
    for(let column = 0; column < GROUND_ALONG_SEGMENTS; column++) {
      const along = -alongRadius + (column + .5) / GROUND_ALONG_SEGMENTS * alongRadius * 2;
      const lateral = lateralCenter - lateralRadius +
        (row + .5) / GROUND_LATERAL_SEGMENTS * lateralRadius * 2;
      if(!inside(zone, along, lateral, .012)) continue;
      const a = row * width + column, b = a + 1, c = a + width, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('biomeWeights', new THREE.Float32BufferAttribute(weights, 3));
  geometry.setAttribute('terrainWet', new THREE.Float32BufferAttribute(wetness, 1));
  geometry.setAttribute('hollowSurface', new THREE.Float32BufferAttribute(surfaces, 1));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  // Headless callers (tests, tools) have no textures: keep the tint alone.
  const material = textures ? createTerrainMaterial(textures) :
    new THREE.MeshStandardMaterial({vertexColors: true, roughness: .98, metalness: 0});
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1; material.polygonOffsetUnits = -1;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Muddy Hollow detailed ground'; mesh.receiveShadow = true;
  return mesh;
}

// Low-poly Quaternius rocks and logs (Kyle's Props A pick), exported by
// tools/blender/muddy-hollow-props.py. Flat shading keeps their facets.
const ROCK_PROPS = ['Rock_1', 'Rock_2', 'Rock_3', 'Rock_5', 'Rock_Moss_1', 'Rock_Moss_2'];

function propMaterials() {
  const materials = new Map();
  for(const [name, {color}] of Object.entries(PROPS.materials)) {
    materials.set(name, new THREE.MeshStandardMaterial({name: `Muddy Hollow ${name}`,
      color: new THREE.Color().setRGB(...color), roughness: name === 'Wood' ? .86 : .93,
      metalness: 0, flatShading: true}));
  }
  return materials;
}

function propGeometry(name) {
  const prop = PROPS.props[name], geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(prop.positions, 3));
  const indices = [];
  prop.groups.forEach((group, slot) => {
    geometry.addGroup(indices.length, group.indices.length, slot);
    indices.push(...group.indices);
  });
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return {geometry, size: prop.size, materialNames: prop.groups.map(group => group.material)};
}

// Each garden rock is drawn exactly over its collision box.
function buildRockGarden(zone, materials) {
  const group = new THREE.Group(); group.name = 'Muddy Hollow rock garden';
  const shapes = new Map();
  zone.obstacles.forEach((rock, index) => {
    const name = ROCK_PROPS[index % ROCK_PROPS.length];
    if(!shapes.has(name)) shapes.set(name, propGeometry(name));
    const {geometry, size, materialNames} = shapes.get(name);
    const mesh = new THREE.Mesh(geometry, materialNames.map(material => materials.get(material)));
    mesh.name = `Garden ${rock.id}`;
    mesh.position.set(rock.x, rock.y, rock.z);
    mesh.rotation.y = rock.heading;
    mesh.scale.set(rock.halfX * 2 / size[0], rock.height / size[1], rock.halfZ * 2 / size[2]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

// A log ramp: logs laid side by side up the rising face in the direction of
// travel, two lengths end to end, each bedded half into the ground so the
// ramp keeps the physical profile the Titan drives.
const LOG_LENGTH = 7.2, LOG_DIAMETER = 1.05, LOG_SPACING = 1.1, LOG_COLUMNS = 6;

function buildLogRamp(zone, materials) {
  const ramp = zone.landforms.ramps.find(item => item.kind === 'log-ramp');
  const group = new THREE.Group(); group.name = 'Muddy Hollow log ramp';
  if(!ramp) return group;
  const {geometry, size} = propGeometry('WoodLog');
  const centre = localPosition(zone, ramp.center);
  const travel = ramp.direction || {along: 0, lateral: 1};
  const across = {along: travel.lateral, lateral: -travel.along};
  const rise = ramp.width / 2 + 2.4;   // the face rises from here to the crest
  const logs = new THREE.InstancedMesh(geometry, materials.get('Wood'), LOG_COLUMNS * 2);
  logs.name = 'Log ramp logs'; logs.castShadow = true; logs.receiveShadow = true;
  const up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(), side = new THREE.Vector3();
  const normalUp = new THREE.Vector3(), matrix = new THREE.Matrix4(), basis = new THREE.Matrix4();
  const scale = new THREE.Matrix4().makeScale(LOG_DIAMETER / size[0], LOG_DIAMETER / size[1],
    LOG_LENGTH / size[2]);
  const point = (offset, sideways) => localToWorld(zone,
    centre.along + travel.along * offset + across.along * sideways,
    centre.lateral + travel.lateral * offset + across.lateral * sideways);
  let instance = 0;
  for(let column = 0; column < LOG_COLUMNS; column++) {
    const sideways = (column - (LOG_COLUMNS - 1) / 2) * LOG_SPACING;
    for(let piece = 0; piece < 2; piece++) {
      // Deterministic small offsets keep the logs from looking machine-laid.
      const jitter = Math.sin(column * 12.9898 + piece * 78.233) * .35;
      const from = -rise + piece * LOG_LENGTH + jitter;
      const start = point(from, sideways), end = point(from + LOG_LENGTH, sideways);
      const mid = point(from + LOG_LENGTH / 2, sideways);
      axis.set(end.x - start.x, zone.heightAt(end.x, end.z) - zone.heightAt(start.x, start.z),
        end.z - start.z).normalize();
      side.crossVectors(up, axis).normalize();
      normalUp.crossVectors(axis, side).normalize();
      basis.makeBasis(side, normalUp, axis);
      const y = (zone.heightAt(start.x, start.z) + zone.heightAt(end.x, end.z)) / 2 -
        LOG_DIAMETER * .5;
      matrix.copy(basis).multiply(scale).setPosition(mid.x, y, mid.z);
      logs.setMatrixAt(instance++, matrix);
    }
  }
  logs.instanceMatrix.needsUpdate = true;
  logs.computeBoundingBox(); logs.computeBoundingSphere();
  group.add(logs);
  return group;
}

export const waterSheet = waterDepth => .08 + .3 * waterDepth;

function buildWater(zone) {
  const pond = zone.landforms.pondBed;
  const center = localPosition(zone, pond.center);
  const alongRadius = pond.alongRadius, lateralRadius = pond.lateralRadius;
  const waterline = zone.heightAt(pond.center.x, pond.center.z) + 1.045;
  const positions = [], depth = [], indices = [];
  for(let row = 0; row <= WATER_LATERAL_SEGMENTS; row++) {
    const lateral = center.lateral - lateralRadius +
      row / WATER_LATERAL_SEGMENTS * lateralRadius * 2;
    for(let column = 0; column <= WATER_ALONG_SEGMENTS; column++) {
      const along = center.along - alongRadius +
        column / WATER_ALONG_SEGMENTS * alongRadius * 2;
      const point = localToWorld(zone, along, lateral);
      const waterDepth = zone.surfaceAt(point.x, point.z).waterDepth || 0;
      // The whole wet area the Titan splashes through is drawn: level water
      // over the deep middle, a thin sheet over the shallow margin.
      const ground = zone.heightAt(point.x, point.z);
      positions.push(point.x, Math.max(waterline, ground + waterSheet(waterDepth)), point.z);
      depth.push(waterDepth);
    }
  }
  const width = WATER_ALONG_SEGMENTS + 1;
  for(let row = 0; row < WATER_LATERAL_SEGMENTS; row++) {
    for(let column = 0; column < WATER_ALONG_SEGMENTS; column++) {
      const da = (column + .5) / WATER_ALONG_SEGMENTS * 2 - 1;
      const dl = (row + .5) / WATER_LATERAL_SEGMENTS * 2 - 1;
      if(Math.hypot(da, dl) > .99) continue;
      const a = row * width + column, b = a + 1, c = a + width, d = c + 1;
      if(![a,b,c,d].every(index => depth[index] > .02)) continue;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('waterDepth', new THREE.Float32BufferAttribute(depth, 1));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({transparent: true, depthWrite: false,
    side: THREE.DoubleSide, uniforms: {hollowTime: {value: 0}},
    vertexShader: `uniform float hollowTime;attribute float waterDepth;varying float vDepth;varying vec3 vWorld;
      void main(){vDepth=waterDepth;vec3 p=position;
        p.y+=sin(position.x*.18+position.z*.13+hollowTime*1.7)*.025*waterDepth;
        vWorld=(modelMatrix*vec4(p,1.)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float hollowTime;varying float vDepth;varying vec3 vWorld;
      void main(){float ripple=.5+.5*sin(vWorld.x*.22-vWorld.z*.19+hollowTime*2.1);
        vec3 shallow=vec3(.30,.57,.55),deep=vec3(.10,.31,.36);
        vec3 color=mix(shallow,deep,smoothstep(.08,1.,vDepth));
        color+=vec3(.08,.11,.10)*ripple*(1.-vDepth*.45);
        gl_FragColor=vec4(color,smoothstep(.02,.18,vDepth)*(.56+.2*smoothstep(.3,1.,vDepth)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>}`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Muddy Hollow pond'; mesh.renderOrder = 1; mesh.receiveShadow = false;
  return mesh;
}

function buildFlag(zone) {
  const marker = zone.landforms.hill.flag, group = new THREE.Group();
  group.name = 'King of the Hill flag';
  const poleMaterial = new THREE.MeshStandardMaterial({color: 0x6e5740, roughness: .9});
  const clothMaterial = new THREE.MeshStandardMaterial({color: 0xf0b52b,
    roughness: .78, side: THREE.DoubleSide});
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, marker.height, 8), poleMaterial);
  pole.position.set(marker.center.x, marker.baseY + marker.height / 2, marker.center.z);
  pole.castShadow = true; group.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.25, 5, 2), clothMaterial);
  cloth.position.set(marker.center.x + 1.25, marker.baseY + marker.height - .8, marker.center.z);
  cloth.rotation.y = zone.frame.heading; cloth.castShadow = true; group.add(cloth);
  return group;
}

function buildHubcaps(zone) {
  const geometry = new THREE.TorusGeometry(.72, .18, 8, 20);
  const material = new THREE.MeshStandardMaterial({color: 0xf2b92e,
    metalness: .72, roughness: .28, emissive: 0x2b1700, emissiveIntensity: .3});
  return zone.collectibles.map((collectible, index) => {
    const group = new THREE.Group();
    group.name = `Gold hubcap ${collectible.id}`;
    group.userData.muddyHollowHubcap = collectible.id;
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.set(Math.PI / 2, 0, index * .47);
    ring.position.set(collectible.center.x, collectible.baseY + 1, collectible.center.z);
    ring.castShadow = true; group.add(ring);
    return group;
  });
}

export function filterMuddyHollowMountains(course, mountains) {
  const zone = course?.muddyHollow;
  if(!zone || !Array.isArray(mountains)) return mountains;
  return mountains.filter(mountain => {
    const local = localPosition(zone, mountain);
    const radius = Math.max(mountain.halfX || 0, mountain.halfZ || 0,
      mountain.scale?.[0] || 0, mountain.scale?.[2] || 0);
    const padding = radius / Math.min(zone.bounds.alongRadius, zone.bounds.lateralRadius);
    return !inside(zone, local.along, local.lateral, padding);
  });
}

export function createMuddyHollowScene(course, {textures = null} = {}) {
  const zone = course?.muddyHollow;
  if(!zone) return null;
  const group = new THREE.Group(); group.name = 'Muddy Hollow';
  const ground = buildGround(zone, course, textures), water = buildWater(zone), flag = buildFlag(zone);
  const hubcaps = buildHubcaps(zone), materials = propMaterials();
  group.add(ground, water, flag, buildRockGarden(zone, materials),
    buildLogRamp(zone, materials), ...hubcaps);
  const animate = seconds => { water.material.uniforms.hollowTime.value = seconds; };
  const sync = state => {
    const found = new Set(state?.muddyHollowHubcaps?.found || []);
    for(const marker of hubcaps) marker.visible = !found.has(marker.userData.muddyHollowHubcap);
  };
  const dispose = () => {
    const geometries = new Set(), materials = new Set();
    group.traverse(object => {
      if(object.geometry) geometries.add(object.geometry);
      if(object.material) for(const material of (Array.isArray(object.material)
        ? object.material : [object.material])) materials.add(material);
    });
    for(const geometry of geometries) geometry.dispose();
    for(const material of materials) if(!material.userData?.sharedAsset) material.dispose();
    group.removeFromParent(); group.clear();
  };
  return {group, animate, sync, dispose};
}
