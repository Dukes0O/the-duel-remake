import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CARS, COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {createDrivingEffects} from '../src/effects.js';
import {applyVehicleTerrainPose, placeGroundedVehicle} from '../src/vehicle-grounding.js';
import {terrainAttitude} from '../src/offroad-physics.js';
import {farTerrainGeometry, terrainGeometry} from '../src/world-surfaces.js';
import {models} from './audit-vehicle-grounding.mjs';
import {
  createMuddyHollowScene,
  filterMuddyHollowMountains,
} from '../src/muddy-hollow-scene.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message); checks++;
};
const highCountry = COURSE.find(course => course.id === 'high-country');
const course = new Course(highCountry, 1989, {muddyHollow: true});
const ordinary = new Course(highCountry, 1989, {muddyHollow: false});

function triangleOverlapsHollow(position, vertices) {
  const zone = course.muddyHollow;
  const sin = Math.sin(zone.frame.heading), cos = Math.cos(zone.frame.heading);
  const points = vertices.map(index => {
    const dx = position.getX(index) - zone.frame.origin.x;
    const dz = position.getZ(index) - zone.frame.origin.z;
    return {
      x: (dx * sin + dz * cos) / zone.bounds.alongRadius,
      y: (dx * cos - dz * sin - zone.bounds.lateralCenter) /
        zone.bounds.lateralRadius,
    };
  });
  if(points.some(point => point.x ** 2 + point.y ** 2 <= 1)) return true;
  const cross = (a, b) => (b.x - a.x) * -a.y - (b.y - a.y) * -a.x;
  const signs = points.map((point, index) => cross(point, points[(index + 1) % 3]));
  if(signs.every(value => value >= 0) || signs.every(value => value <= 0)) return true;
  for(let index = 0; index < 3; index++) {
    const a = points[index], b = points[(index + 1) % 3];
    const dx = b.x - a.x, dy = b.y - a.y;
    const amount = Math.max(0, Math.min(1,
      -(a.x * dx + a.y * dy) / (dx * dx + dy * dy || 1)));
    if((a.x + dx * amount) ** 2 + (a.y + dy * amount) ** 2 <= 1) return true;
  }
  return false;
}

function checkHollowCut(builder, label, yOffset) {
  const ordinaryGeometry = builder(ordinary);
  const hollowGeometry = builder(course);
  check(hollowGeometry.index.count > ordinaryGeometry.index.count,
    `${label} subdivides coarse triangles that cross the authored Hollow`);
  check(!ordinaryGeometry.attributes.muddyHollowFit &&
    !ordinaryGeometry.attributes.muddyHollowSourceY &&
    hollowGeometry.attributes.muddyHollowFit &&
    hollowGeometry.attributes.muddyHollowSourceY,
  `${label} marks only switched fitted vertices`);
  const position = hollowGeometry.attributes.position;
  const index = hollowGeometry.index.array;
  const fitted = hollowGeometry.attributes.muddyHollowFit;
  const sourceY = hollowGeometry.attributes.muddyHollowSourceY;
  let overlapTriangles = 0, firstUnfitted = -1, firstHeightError = -1;
  let firstSeamError = -1, firstTransitionError = -1;
  let firstOcclusion = -1, samples = 0;
  for(let offset = 0; offset < index.length; offset += 3) {
    const a = index[offset], b = index[offset + 1], c = index[offset + 2];
    if(!triangleOverlapsHollow(position, [a, b, c])) continue;
    overlapTriangles++;
    for(const vertex of [a, b, c]) {
      if(fitted.getX(vertex) !== 1) { firstUnfitted = offset / 3; break; }
      const x = position.getX(vertex), z = position.getZ(vertex);
      if(course.muddyHollow.contains(x, z)) {
        const field = course.muddyHollow.heightAt(x, z) + yOffset;
        if(position.getY(vertex) > field - .05 || position.getY(vertex) < field - 1) {
          firstHeightError = offset / 3; break;
        }
      } else {
        const dx = x - course.muddyHollow.frame.origin.x;
        const dz = z - course.muddyHollow.frame.origin.z;
        const radius = Math.hypot(
          (dx * Math.sin(course.muddyHollow.frame.heading) +
            dz * Math.cos(course.muddyHollow.frame.heading)) /
            course.muddyHollow.bounds.alongRadius,
          (dx * Math.cos(course.muddyHollow.frame.heading) -
            dz * Math.sin(course.muddyHollow.frame.heading) -
            course.muddyHollow.bounds.lateralCenter) /
            course.muddyHollow.bounds.lateralRadius,
        );
        if(radius >= 1.08 - 1e-6 &&
          Math.abs(position.getY(vertex) - sourceY.getX(vertex)) > .0001) {
          firstSeamError = offset / 3; break;
        }
        const target = course.muddyHollow.heightAt(x, z) + yOffset - .7;
        const low = Math.min(target, sourceY.getX(vertex)) - .0001;
        const high = Math.max(target, sourceY.getX(vertex)) + .0001;
        if(position.getY(vertex) < low || position.getY(vertex) > high) {
          firstTransitionError = offset / 3; break;
        }
      }
    }
    for(let first = 0; first <= 4; first++) for(let second = 0;
      second <= 4 - first; second++) {
      const weights = [first / 4, second / 4, 1 - (first + second) / 4];
      const vertices = [a, b, c];
      const x = vertices.reduce((sum, vertex, item) =>
        sum + position.getX(vertex) * weights[item], 0);
      const z = vertices.reduce((sum, vertex, item) =>
        sum + position.getZ(vertex) * weights[item], 0);
      if(!course.muddyHollow.contains(x, z)) continue;
      const y = vertices.reduce((sum, vertex, item) =>
        sum + position.getY(vertex) * weights[item], 0);
      samples++;
      if(y >= course.muddyHollow.heightAt(x, z) + .031) {
        firstOcclusion = offset / 3; break;
      }
    }
    if(firstUnfitted >= 0 || firstHeightError >= 0 || firstSeamError >= 0 ||
      firstTransitionError >= 0 || firstOcclusion >= 0) break;
  }
  check(overlapTriangles > 0 && firstUnfitted < 0,
    `${label} replaces every triangle that overlaps the authored Hollow`);
  check(firstHeightError < 0,
    `${label} interior replacement vertices sit just below the authored height field`);
  check(firstSeamError < 0,
    `${label} outer replacement vertices retain their original terrain height`);
  check(firstTransitionError < 0,
    `${label} boundary vertices blend between fitted and original terrain height`);
  check(samples > 0 && firstOcclusion < 0,
    `${label} cannot rise through the detailed Hollow surface (triangle ${firstOcclusion})`);
  let uncheckedFit = -1;
  for(let vertex = 0; vertex < position.count; vertex++) {
    if(fitted.getX(vertex) !== 1) continue;
    const x = position.getX(vertex), z = position.getZ(vertex);
    const dx = x - course.muddyHollow.frame.origin.x;
    const dz = z - course.muddyHollow.frame.origin.z;
    const radius = Math.hypot(
      (dx * Math.sin(course.muddyHollow.frame.heading) +
        dz * Math.cos(course.muddyHollow.frame.heading)) /
        course.muddyHollow.bounds.alongRadius,
      (dx * Math.cos(course.muddyHollow.frame.heading) -
        dz * Math.sin(course.muddyHollow.frame.heading) -
        course.muddyHollow.bounds.lateralCenter) /
        course.muddyHollow.bounds.lateralRadius,
    );
    if(radius >= 1.08 - 1e-6 &&
      Math.abs(position.getY(vertex) - sourceY.getX(vertex)) > .0001) {
      uncheckedFit = vertex; break;
    }
    if(radius > 1 && radius < 1.08) {
      const target = course.muddyHollow.heightAt(x, z) + yOffset - .7;
      if(position.getY(vertex) < Math.min(target, sourceY.getX(vertex)) - .0001 ||
        position.getY(vertex) > Math.max(target, sourceY.getX(vertex)) + .0001) {
        uncheckedFit = vertex; break;
      }
    }
  }
  check(uncheckedFit < 0,
    `${label} applies the seam-safe blend to every generated vertex`);
  equal(hollowGeometry.groups.map(group => group.materialIndex),
    ordinaryGeometry.groups.map(group => group.materialIndex),
  `${label} keeps the ordinary material group order`);
  check(hollowGeometry.groups.every(group => group.count % 3 === 0) &&
    hollowGeometry.groups.reduce((sum, group) => sum + group.count, 0) === index.length,
  `${label} replacement triangles remain inside complete material groups`);
  const repeat = builder(course);
  equal([...repeat.index.array], [...index], `${label} replacement indices are deterministic`);
  equal([...repeat.attributes.position.array], [...position.array],
    `${label} replacement positions are deterministic`);
  repeat.dispose();
  ordinaryGeometry.dispose(); hollowGeometry.dispose();
}

{
  equal(createMuddyHollowScene(ordinary), null,
    'ordinary High Country does not build a Hollow scene');
  const before = JSON.stringify({features: course.features, samples: course.samples});
  const first = createMuddyHollowScene(course);
  const second = createMuddyHollowScene(course);
  check(first?.group?.name === 'Muddy Hollow', 'flagged High Country builds one named scene');
  const ground = first.group.getObjectByName('Muddy Hollow detailed ground');
  const water = first.group.getObjectByName('Muddy Hollow pond');
  check(ground?.isMesh && ground.geometry.attributes.position.count > 5000,
    'the Hollow has a dedicated dense ground mesh');
  check(water?.isMesh && water.material.transparent && water.geometry.attributes.position.count > 100,
    'the pond is a real transparent surface, not a flat colour marker');
  check(ground.geometry.attributes.hollowSurface?.count ===
    ground.geometry.attributes.position.count,
  'ground vertices identify dry, mud and water presentation');
  const averageNormalY = geometry => {
    const normal = geometry.attributes.normal;
    let total = 0;
    for(let index = 0; index < normal.count; index++) total += normal.getY(index);
    return total / normal.count;
  };
  check(averageNormalY(ground.geometry) > .5 && averageNormalY(water.geometry) > 0,
    'ground and water faces point upward for the normal above-ground camera');
  check([...ground.geometry.attributes.position.array].every(Number.isFinite) &&
    [...water.geometry.attributes.position.array].every(Number.isFinite),
  'all detailed ground and water vertices are finite');
  const waterY = [...water.geometry.attributes.position.array]
    .filter((_, index) => index % 3 === 1);
  check(Math.max(...waterY) - Math.min(...waterY) < .08,
    'the shallow pond has one coherent waterline');
  const positions = ground.geometry.attributes.position.array;
  for(let index = 0; index < positions.length; index += 3 * 401) {
    check(Math.abs(positions[index + 1] -
      (course.muddyHollow.heightAt(positions[index], positions[index + 2]) + .032)) < .001,
    'sampled detailed vertices match the physical Hollow height field');
  }
  const surfaceKinds = new Set(ground.geometry.attributes.hollowSurface.array);
  check(surfaceKinds.has(0) && surfaceKinds.has(1) && surfaceKinds.has(2),
    'the detailed mesh carries distinct dry, mud and pond regions');
  const surfaceAttribute = ground.geometry.attributes.hollowSurface;
  const colorAttribute = ground.geometry.attributes.color;
  let wetMarginVertices = 0, unreadableWetVertex = -1;
  for(let index = 0; index < surfaceAttribute.count; index++) {
    if(surfaceAttribute.getX(index) !== 2) continue;
    wetMarginVertices++;
    if(colorAttribute.getZ(index) <= colorAttribute.getX(index)) {
      unreadableWetVertex = index; break;
    }
  }
  check(unreadableWetVertex < 0,
    'water-contact ground has a visible blue-green wet treatment');
  check(wetMarginVertices > 100, 'the visible wet margin covers the settled water-contact field');
  const waterIndex = water.geometry.index.array;
  const waterPosition = water.geometry.attributes.position;
  let buriedWaterTriangle = -1;
  for(let offset = 0; offset < waterIndex.length; offset += 3) {
    const triangle = [waterIndex[offset], waterIndex[offset + 1], waterIndex[offset + 2]];
    const x = triangle.reduce((sum, vertex) => sum + waterPosition.getX(vertex), 0) / 3;
    const y = triangle.reduce((sum, vertex) => sum + waterPosition.getY(vertex), 0) / 3;
    const z = triangle.reduce((sum, vertex) => sum + waterPosition.getZ(vertex), 0) / 3;
    if(y <= course.muddyHollow.heightAt(x, z) + .02) {
      buriedWaterTriangle = offset / 3; break;
    }
  }
  check(buriedWaterTriangle < 0,
    'the reflective pool submits only visible water above the authored ground');
  const groundIndex = ground.geometry.index.array;
  let usedRadius = 0;
  for(const vertex of groundIndex) {
    const dx = ground.geometry.attributes.position.getX(vertex) - course.muddyHollow.frame.origin.x;
    const dz = ground.geometry.attributes.position.getZ(vertex) - course.muddyHollow.frame.origin.z;
    const along = dx * Math.sin(course.muddyHollow.frame.heading) +
      dz * Math.cos(course.muddyHollow.frame.heading);
    const lateral = dx * Math.cos(course.muddyHollow.frame.heading) -
      dz * Math.sin(course.muddyHollow.frame.heading);
    usedRadius = Math.max(usedRadius, Math.hypot(
      along / course.muddyHollow.bounds.alongRadius,
      (lateral - course.muddyHollow.bounds.lateralCenter) /
        course.muddyHollow.bounds.lateralRadius));
  }
  check(usedRadius >= 1 && usedRadius < 1.05,
    'the dense fitted mesh covers the authored core without reaching the race road');
  equal([...ground.geometry.attributes.position.array],
    [...second.group.getObjectByName('Muddy Hollow detailed ground')
      .geometry.attributes.position.array],
  'the detailed mesh is deterministic');
  equal(JSON.stringify({features: course.features, samples: course.samples}), before,
    'scene construction does not change course data or random output');

  const flag = first.group.getObjectByName('King of the Hill flag');
  const hubcaps = first.group.children.filter(child => child.userData.muddyHollowHubcap);
  check(flag?.isGroup, 'the authored summit flag is visible');
  equal(hubcaps.map(item => item.userData.muddyHollowHubcap).sort(),
    ['hilltop', 'log-ramp', 'mega-landing', 'mud-pit', 'pond'],
  'all five authored hubcap sites have visible markers');
  check(hubcaps.every(item => {
    const ring = item.children[0];
    ring.geometry.computeBoundingSphere();
    return ring.geometry.boundingSphere.radius >= .85 && ring.position.y >=
      course.muddyHollow.heightAt(ring.position.x, ring.position.z) + .9;
  }), 'hubcap markers are large and high enough to read while driving');
  first.sync({status: 'exploring', muddyHollowHubcaps: {found: ['pond']}});
  check(hubcaps.find(item => item.userData.muddyHollowHubcap === 'pond').visible === false &&
    hubcaps.filter(item => item.userData.muddyHollowHubcap !== 'pond').every(item => item.visible),
  'collected hubcaps hide without changing the saved list');
  const waterTime = water.material.uniforms.hollowTime.value;
  first.animate(4.25);
  check(water.material.uniforms.hollowTime.value === 4.25 && waterTime !== 4.25,
    'ambient time animates only the pond material');
  first.dispose(); second.dispose();
}

{
  checkHollowCut(terrainGeometry, 'near terrain', 0);
  checkHollowCut(farTerrainGeometry, 'far terrain', -.15);
}

{
  const all = course.features.mountains;
  equal(filterMuddyHollowMountains(ordinary, ordinary.features.mountains),
    ordinary.features.mountains,
  'ordinary High Country keeps every mountain instance');
  const visible = filterMuddyHollowMountains(course, all);
  check(visible.length > 0 && visible.length < all.length,
    'flagged High Country masks only mountain instances overlapping the Hollow');
  check(visible.every(mountain => all.includes(mountain)) &&
    all.length === course.features.mountains.length,
  'mountain masking returns a render list without changing course features');
}

{
  const fx = createDrivingEffects();
  const p = course.muddyHollow.landforms.pits[0].center;
  const base = {
    status: 'exploring', muddyHollowDeparture: {departed: true},
    car: 'titan_monster', s: course.muddyHollow.frame.s,
    lateral: 160, speedMph: 52, headingError: 0, slipAngle: 0,
    groundHeight: course.muddyHollow.heightAt(p.x, p.z), terrainPitch: 0,
    terrainRoll: 0, airborne: false, tumble: null, airHeight: 0,
    offRoad: true, roughness: 1, impactTimer: 0, input: {throttle: 1, brake: 0},
    gear: 2, surfaceMud: 1, mudWheelSpin: 1.4, waterDepth: 0,
  };
  for(let i = 0; i < 6; i++) fx.update({p: {...p, y: base.groundHeight, heading: 0},
    state: base, dt: .06, course});
  const kinds = fx.group.children[0].geometry.attributes.particleKind.array;
  check(kinds.some(kind => kind === 4), 'departed exploration throws dedicated mud clods');
  base.surfaceMud = 0; base.mudWheelSpin = 0;
  fx.update({p: {...p, y: base.groundHeight, heading: 0}, state: base, dt: .06, course});
  base.waterDepth = .8; base.speedMph = 70;
  fx.update({p: {...p, y: base.groundHeight, heading: 0}, state: base, dt: .06, course});
  check(kinds.some(kind => kind === 5), 'water entry produces dedicated spray in the fixed pool');
  const spraySizes = [...kinds].flatMap((kind, index) => kind === 5 ?
    [fx.group.children[0].geometry.attributes.particleSize.array[index]] : []);
  check(spraySizes.length > 0 && Math.max(...spraySizes) >= .65,
    'water spray is large enough to read behind the Titan');
  const before = [...kinds];
  fx.update({p: {...p, y: base.groundHeight, heading: 0},
    state: {...base, airborne: true}, dt: .06, course});
  equal([...kinds], before, 'airborne tyres cannot emit mud or water');
  fx.dispose();

  const otherExploration = createDrivingEffects();
  const unrelated = {...base, muddyHollowDeparture: null, surfaceMud: 0,
    mudWheelSpin: 0, waterDepth: 0, offRoad: true, airborne: false};
  for(let i = 0; i < 6; i++) otherExploration.update({
    p: {...p, y: base.groundHeight, heading: 0}, state: unrelated, dt: .06, course});
  check(otherExploration.group.children.every(child => !child.visible),
    'Hidden Road and yard exploration cannot wake Hollow driving effects');
  otherExploration.dispose();
}

{
  const model = models.find(item => item.key === 'titan_monster');
  const titan = model.vehicle, zone = course.muddyHollow;
  const wheelNodes = new Set();
  for(const wheel of titan.userData.wheels) wheel.traverse(node => wheelNodes.add(node));
  const vertex = new THREE.Vector3(), desiredHeading = zone.frame.heading + Math.PI / 2;
  const spec = CARS.titan_monster.collision;
  const toWorld = (along, lateral) => ({
    x: zone.frame.origin.x + Math.sin(zone.frame.heading) * along +
      Math.cos(zone.frame.heading) * lateral,
    z: zone.frame.origin.z + Math.cos(zone.frame.heading) * along -
      Math.sin(zone.frame.heading) * lateral,
  });
  const samples = [
    [zone.departureBoundary.alongMin, zone.departureBoundary.lateral],
    [0, zone.departureBoundary.lateral],
    [zone.departureBoundary.alongMax, zone.departureBoundary.lateral],
    [0, 60], [0, 65], [0, 80],
  ];
  for(const [along, lateral] of samples) {
    const center = toWorld(along, lateral);
    const pose = course.nearest(center.x, center.z, zone.frame.s);
    const ground = course.groundAt(pose.s, pose.lateral);
    const sample = (forward, side) => zone.heightAt(
      ground.x + Math.sin(desiredHeading) * forward + Math.cos(desiredHeading) * side,
      ground.z + Math.cos(desiredHeading) * forward - Math.sin(desiredHeading) * side);
    const attitude = terrainAttitude(sample(spec.halfLength, 0),
      sample(-spec.halfLength, 0), sample(0, spec.halfWidth),
      sample(0, -spec.halfWidth), spec.halfLength, spec.halfWidth);
    const actor = {car: 'titan_monster', s: pose.s, lateral: pose.lateral,
      groundHeight: ground.y, terrainPitch: attitude.pitch,
      terrainRoll: attitude.roll, tumble: null, airborne: false, airHeight: 0};
    const snapshot = structuredClone(actor);
    placeGroundedVehicle(titan, ground, desiredHeading - ground.heading, 0);
    applyVehicleTerrainPose(titan, course, actor); titan.updateMatrixWorld(true);
    const wheelGaps = model.wheels.map(wheel => {
      let gap = Infinity;
      for(let index = 0; index < wheel.vertices.length; index += 3) {
        vertex.set(wheel.vertices[index], wheel.vertices[index + 1],
          wheel.vertices[index + 2]).applyMatrix4(titan.matrixWorld);
        gap = Math.min(gap, vertex.y - zone.heightAt(vertex.x, vertex.z));
      }
      return gap;
    });
    let bodyGap = Infinity;
    titan.traverse(mesh => {
      if(!mesh.isMesh || wheelNodes.has(mesh) ||
          mesh === titan.userData.contactShadow || !mesh.visible) return;
      const positions = mesh.geometry.attributes.position;
      for(let index = 0; index < positions.count; index++) {
        vertex.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
        bodyGap = Math.min(bodyGap, vertex.y - zone.heightAt(vertex.x, vertex.z));
      }
    });
    check(Math.min(...wheelGaps) >= .005 && Math.min(...wheelGaps) <= .03,
      `real Titan tread stays supported at Hollow ${along}/${lateral} pitch ${attitude.pitch} roll ${attitude.roll}: ${wheelGaps.join(',')}`);
    check(bodyGap >= 0, `real Titan body clears the Hollow slope at ${along}/${lateral}`);
    equal(actor, snapshot, 'the grounding correction cannot write to simulation state');
  }

  const center = toWorld(0, zone.departureBoundary.lateral);
  const pose = ordinary.nearest(center.x, center.z, zone.frame.s);
  const actor = {car: 'titan_monster', s: pose.s, lateral: pose.lateral,
    groundHeight: ordinary.groundAt(pose.s, pose.lateral).y,
    terrainPitch: -.5, terrainRoll: 0, tumble: null};
  placeGroundedVehicle(titan, ordinary.groundAt(pose.s, pose.lateral), 0, 0);
  const ordinaryY = titan.position.y;
  applyVehicleTerrainPose(titan, ordinary, actor);
  check(Math.abs(titan.position.y - ordinaryY) < 1e-9,
    'the visual lift is absent outside the installed Hollow');
}

console.log(`Muddy Hollow phase 6 scene: ${checks} checks passed.`);
