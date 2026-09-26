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

function checkHollowCut(builder, label) {
  const ordinaryGeometry = builder(ordinary);
  const hollowGeometry = builder(course);
  check(hollowGeometry.index.count < ordinaryGeometry.index.count,
    `${label} removes coarse triangles covered by the detailed Hollow mesh`);
  const position = hollowGeometry.attributes.position;
  const index = hollowGeometry.index.array;
  let firstBridge = -1;
  for(let offset = 0; offset < index.length; offset += 3) {
    const a = index[offset], b = index[offset + 1], c = index[offset + 2];
    if([a, b, c].some(vertex => course.muddyHollow.contains(
      position.getX(vertex), position.getZ(vertex)))) {
      firstBridge = offset / 3; break;
    }
  }
  check(firstBridge < 0, `${label} cannot bridge the authored Hollow`);
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
  check(usedRadius >= 1.25,
    'the fitted replacement covers complete coarse triangles around the Hollow edge');
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
  checkHollowCut(terrainGeometry, 'near terrain');
  checkHollowCut(farTerrainGeometry, 'far terrain');
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
