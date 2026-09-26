import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {createDrivingEffects} from '../src/effects.js';
import {applyVehicleTerrainPose, placeGroundedVehicle} from '../src/vehicle-grounding.js';
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
    status: 'exploring', car: 'titan_monster', s: course.muddyHollow.frame.s,
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
  const before = [...kinds];
  fx.update({p: {...p, y: base.groundHeight, heading: 0},
    state: {...base, airborne: true}, dt: .06, course});
  equal([...kinds], before, 'airborne tyres cannot emit mud or water');
  fx.dispose();
}

{
  const titan = models.find(model => model.key === 'titan_monster').vehicle;
  const hollowCourse = {
    muddyHollow: {contains: () => true},
    groundAt: () => ({x: 0, y: 0, z: 0, heading: 0}),
  };
  const actor = {car: 'titan_monster', s: 0, lateral: 0,
    groundHeight: 0, terrainPitch: Math.PI / 4, terrainRoll: .18, tumble: null};
  placeGroundedVehicle(titan, {x: 0, y: 0, z: 0, heading: 0});
  const baseY = titan.position.y;
  const snapshot = structuredClone(actor);
  applyVehicleTerrainPose(titan, hollowCourse, actor);
  check(titan.position.y > baseY + .25,
    'steep Hollow terrain lifts the rendered Titan clear of the slope');
  equal(actor, snapshot, 'the grounding correction cannot write to simulation state');
  const ordinaryCourse = {...hollowCourse, muddyHollow: null};
  placeGroundedVehicle(titan, {x: 0, y: 0, z: 0, heading: 0});
  const ordinaryY = titan.position.y;
  applyVehicleTerrainPose(titan, ordinaryCourse, actor);
  check(Math.abs(titan.position.y - ordinaryY) < 1e-9,
    'the visual lift is absent outside the installed Hollow');
}

console.log(`Muddy Hollow phase 6 scene: ${checks} checks passed.`);
