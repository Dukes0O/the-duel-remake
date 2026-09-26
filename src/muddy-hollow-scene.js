import * as THREE from 'three';

const GROUND_ALONG_SEGMENTS = 96;
const GROUND_LATERAL_SEGMENTS = 90;
const WATER_ALONG_SEGMENTS = 28;
const WATER_LATERAL_SEGMENTS = 24;

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

function buildGround(zone) {
  const positions = [], colors = [], surfaces = [], indices = [];
  const alongRadius = zone.bounds.alongRadius;
  const lateralRadius = zone.bounds.lateralRadius;
  const lateralCenter = zone.bounds.lateralCenter;
  for(let row = 0; row <= GROUND_LATERAL_SEGMENTS; row++) {
    const lateral = lateralCenter - lateralRadius +
      row / GROUND_LATERAL_SEGMENTS * lateralRadius * 2;
    for(let column = 0; column <= GROUND_ALONG_SEGMENTS; column++) {
      const along = -alongRadius + column / GROUND_ALONG_SEGMENTS * alongRadius * 2;
      const point = localToWorld(zone, along, lateral);
      const surface = zone.surfaceAt(point.x, point.z);
      const boundary = Math.max(0, 1 - Math.hypot(along / alongRadius,
        (lateral - lateralCenter) / lateralRadius));
      const mud = surface.mud || 0, water = surface.waterDepth || 0;
      positions.push(point.x, zone.heightAt(point.x, point.z) + .032, point.z);
      surfaces.push(water > .02 ? 2 : mud > .02 ? 1 : 0);
      const edge = Math.min(1, boundary * 5), wet = Math.max(mud, water * .48);
      const light = .84 + edge * .16;
      if(water > .02) colors.push(.10 * light, .22 * light, .24 * light);
      else colors.push(
        THREE.MathUtils.lerp(.25, .19, wet) * light,
        THREE.MathUtils.lerp(.39, .12, wet) * light,
        THREE.MathUtils.lerp(.18, .055, wet) * light,
      );
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
  geometry.setAttribute('hollowSurface', new THREE.Float32BufferAttribute(surfaces, 1));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({vertexColors: true,
    roughness: .98, metalness: 0, polygonOffset: true,
    polygonOffsetFactor: -1, polygonOffsetUnits: -1});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Muddy Hollow detailed ground'; mesh.receiveShadow = true;
  return mesh;
}

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
      positions.push(point.x, waterline, point.z);
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
      if(![a,b,c,d].every(index=>{
        const x=positions[index*3],z=positions[index*3+2];
        return waterline > zone.heightAt(x,z)+.02 &&
          zone.surfaceAt(x,z).waterDepth>.02;
      }))continue;
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
        gl_FragColor=vec4(color,.34+.28*smoothstep(.04,1.,vDepth));
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

export function createMuddyHollowScene(course) {
  const zone = course?.muddyHollow;
  if(!zone) return null;
  const group = new THREE.Group(); group.name = 'Muddy Hollow';
  const ground = buildGround(zone), water = buildWater(zone), flag = buildFlag(zone);
  const hubcaps = buildHubcaps(zone);
  group.add(ground, water, flag, ...hubcaps);
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
    for(const material of materials) material.dispose();
    group.removeFromParent(); group.clear();
  };
  return {group, animate, sync, dispose};
}
