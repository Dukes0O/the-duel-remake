// Slice 10 feasibility check. This reads the scene's actual ground answer without
// driving or changing race state. Keep the card's limits until Claude resolves it.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createScablandsScene} from '../src/world/scablands-scene.js';
import {scablandsFloorsAt} from '../src/world/scablands-ground.js';
import {HOT_DELIVERY_WAYS, routeFor, sampleLine} from '../src/world/scablands-ways.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';

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
  for (const way of HOT_DELIVERY_WAYS) {
    const route = routeFor(way.legs, {start: step.origin.position, destination: step.destination.position});
    let previous = null, worst = null;
    for (const point of sampleLine(route, .5)) {
      const count = scablandsFloorsAt(point.x, point.z, floors);
      // A single floor is unambiguous here: no deck, Pipe or tunnel is selected.
      // Fresh course and ground: there are no player edits or tunnel segments.
      if (count !== 1) { previous = null; continue; }
      const own = floors[0], drawn = scene.group.userData.drawnGroundHeightAt(point.x, point.z);
      const current = {x: point.x, z: point.z, along: point.along, own, drawn, correction: drawn - own};
      if (previous) {
        const change = Math.abs(current.correction - previous.correction);
        if (!worst || change > worst.change) worst = {change, before: previous, after: current};
      }
      previous = current;
    }
    console.log(`${way.id}: ${JSON.stringify(worst)}`);
    // Each endpoint may miss the mesh by .05 m. Even using that whole allowance
    // at both ends cannot fit a correction difference greater than .08 + 2*.05.
    // This is weaker than exact drawn-minus-own, so failure proves that even a
    // smoothed correction cannot satisfy both requirements on this ground.
    if (worst.change > .08 + 2 * .05) failures.push(`${way.id}: ${worst.change.toFixed(9)} m exceeds .18 m`);
  }
  assert.deepEqual(failures, [], 'The .08 m step limit and .05 m feet tolerance must be compatible.');
} finally {
  scene.dispose();
}
