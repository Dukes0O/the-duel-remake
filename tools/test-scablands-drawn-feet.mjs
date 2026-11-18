// Slice 10 feasibility check. This reads the scene's actual ground answer without
// driving or changing race state. Claude revised both step limits on 17 November.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {createRiverField} from '../src/world/scablands-draw.js';
import {SCABLANDS_LAYOUT, SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createScablandsScene} from '../src/world/scablands-scene.js';
import {scablandsFloorsAt} from '../src/world/scablands-ground.js';
import {HOT_DELIVERY_WAYS, routeFor, sampleLine} from '../src/world/scablands-ways.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';

const riverField = createRiverField(SCABLANDS_LAYOUT);
const course = new Course(SCABLANDS_VENUE, 1989);
const scene = createScablandsScene(course, {loadAsset: async () => {
  const root = new THREE.Group();
  for (const name of ['Big Bess gas truck', "Old Smoke's rolling furnace"]) {
    const model = new THREE.Group();
    model.name = name;
    root.add(model);
  }
  return {scene: root};
}});
assert.equal(await scene.ready, true);

try {
  const step = EVERBURN_JOBS[0].steps[0], floors = [], failures = [];
  for (const spacing of [.5, .05]) for (const way of HOT_DELIVERY_WAYS) {
    const route = routeFor(way.legs, {start: step.origin.position, destination: step.destination.position});
    let previous = null, worst = null;
    for (const point of sampleLine(route, spacing)) {
      const count = scablandsFloorsAt(point.x, point.z, floors);
      // A single floor is unambiguous here: no deck, Pipe or tunnel is selected.
      // Fresh course and ground: there are no player edits or tunnel segments.
      if (count !== 1) { previous = null; continue; }
      const own = floors[0], drawn = scene.group.userData.drawnGroundHeightAt(point.x, point.z);
      const current = {x: point.x, z: point.z, along: point.along, own, drawn, correction: Math.max(-1.2, Math.min(1.2, drawn - own))};
      if (previous) {
        const change = Math.abs(current.correction - previous.correction);
        if (!worst || change > worst.change) worst = {change, before: previous, after: current};
      }
      previous = current;
    }
    console.log(`${way.id} step ${spacing}: ${JSON.stringify(worst)}`);
    const limit = spacing === .5 ? .3 : .05;
    if (worst.change > limit) {
      console.log('River distances at failing endpoints:',
        riverField.distanceAt(worst.before.x, worst.before.z), riverField.distanceAt(worst.after.x, worst.after.z));
      failures.push(`${way.id} step ${spacing}: ${worst.change.toFixed(9)} m exceeds ${limit} m`);
    }
  }
  assert.deepEqual(failures, [], 'The correction must meet the revised continuity limits.');
} finally {
  scene.dispose();
  riverField.texture.dispose();
}
