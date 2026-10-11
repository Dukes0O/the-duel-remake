import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {ARENA_VENUES} from '../src/arena/venues.js';
import {sweepObstacle} from '../src/collision.js';

// SCRAPDOME-TANKER-FIX: the Salt Flats boundary containers, tyre walls and
// salvage cars are drawn turned along the ring. Their collision used to be
// the box that stays square to the map around each one, which reached up to
// 5 m past the drawn face wherever the ring bends. This suite measures the
// committed model against the Course, so it needs no Blender run.
let checks = 0;
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
test.after(() => console.log(`Arena wall fit: ${checks} acceptance checks executed.`));

const SEED = 1989; // The seed in tools/art/salt-flats-fit.json.
const bytes = readFileSync(new URL('../public/assets/models/wasteland/salt-flats/venue.glb', import.meta.url));
const loader = new GLTFLoader();
// Headless: geometry and matrices are real, only picture decoding is skipped.
loader.register(() => ({name: 'WALL_FIT_TEXTURE', loadTexture: () => Promise.resolve(new THREE.Texture())}));
const model = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
model.scene.updateMatrixWorld(true);
const course = new Course(ARENA_VENUES['salt-flats'], SEED);
const pieces = course.saltFlatsGeometry.solids.filter(solid => solid.fit.boundary);
const obstacleOf = id => course.features.obstacles.find(row => row.id === id);

// The drawn mesh measured in the collision box's own frame (across, along).
function drawnExtents(mesh, obstacle) {
  const cosine = Math.cos(obstacle.heading), sine = Math.sin(obstacle.heading);
  const low = [Infinity, Infinity], high = [-Infinity, -Infinity];
  const position = mesh.geometry.attributes.position, point = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
    const dx = point.x - obstacle.x, dz = point.z - obstacle.z;
    const across = cosine * dx - sine * dz, along = sine * dx + cosine * dz;
    low[0] = Math.min(low[0], across); high[0] = Math.max(high[0], across);
    low[1] = Math.min(low[1], along); high[1] = Math.max(high[1], along);
  }
  return {centre: [(low[0] + high[0]) / 2, (low[1] + high[1]) / 2],
    half: [(high[0] - low[0]) / 2, (high[1] - low[1]) / 2]};
}

test('every boundary piece collides as the turned box that is drawn, face within half a metre', () => {
  equal(pieces.length, 160, 'sixty-four wall pieces and ninety-six salvage cars');
  for (const piece of pieces) {
    const obstacle = obstacleOf(piece.id), mesh = model.scene.getObjectByName(piece.id);
    ok(obstacle && mesh?.isMesh, `${piece.id}: the Course solid and the drawn model both exist`);
    ok(Math.abs(obstacle.heading - piece.fit.heading) < 1e-9, `${piece.id}: the solid turns with the ring`);
    const drawn = drawnExtents(mesh, obstacle);
    for (const axis of [0, 1]) {
      ok(Math.abs(drawn.centre[axis]) < .05, `${piece.id}: collision is centred on the drawn model`);
      const half = axis ? obstacle.halfZ : obstacle.halfX;
      // Across, the face is within half a metre. Along, the ends may run on into
      // the slots between pieces (up to a metre and a half), because the wall must be closed.
      ok(Math.abs(half - drawn.half[axis]) <= (axis ? 1.6 : .5),
        `${piece.id}: collision ${half.toFixed(2)} vs drawn ${drawn.half[axis].toFixed(2)} (${axis ? 'along' : 'across'})`);
    }
  }
});

test('no boundary solid reaches into the drivable floor past the drawn wall', () => {
  const floor = course.def.scrapdome.floorHalfWidth;
  let closest = Infinity;
  for (const piece of pieces) {
    const obstacle = obstacleOf(piece.id), cosine = Math.cos(obstacle.heading), sine = Math.sin(obstacle.heading);
    for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
      const across = (i / 6 - 1) * obstacle.halfX, along = (j / 6 - 1) * obstacle.halfZ;
      const x = obstacle.x + across * cosine + along * sine, z = obstacle.z - across * sine + along * cosine;
      closest = Math.min(closest, Math.abs(course.nearest(x, z).lateral));
    }
  }
  // The floor edge is 18 m out and a car is 1 m wide. The old square-to-the-map
  // box reached in to 13.75 m, so cars stopped on nothing.
  ok(closest >= floor + 1, `closest solid face is ${closest.toFixed(2)} m from the centre line`);
});

test('a car driven straight at the wall first touches it at the drawn face, not metres early', () => {
  const body = {halfWidth: 1.02, halfLength: 2.35, height: 1.35};
  for (const [side, floorEdge] of [[1, 19.1], [-1, 18.2]]) for (const noseOut of [false, true]) {
    let earliest = Infinity, stations = 0;
    for (let s = 0; s < course.length; s += .5) {
      const heading = course.at(s).heading;
      const from = course.worldAt(s, side * 8), to = course.worldAt(s, side * 22);
      let first = null;
      for (const obstacle of course.obstaclesNear(s)) {
        const hit = sweepObstacle({x: from.x, y: 0, z: from.z}, {x: to.x, y: 0, z: to.z}, obstacle,
          noseOut ? heading + Math.PI / 2 : heading, body);
        if (hit && (!first || hit.t < first.t)) first = hit;
      }
      if (!first) continue;
      stations++;
      earliest = Math.min(earliest, 8 + 14 * first.t + (noseOut ? body.halfLength : body.halfWidth));
    }
    ok(stations > 1200, `${side > 0 ? 'outer wall' : 'inner island'}: the wall stops the car along the whole ring`);
    ok(earliest >= floorEdge, `${side > 0 ? 'outer wall' : 'inner island'}${noseOut ? ' nose first' : ' broadside'}: ` +
      `first contact at ${earliest.toFixed(2)} m (the old boxes touched at 11.5 m)`);
  }
});

test('every arena wall is closed all the way round: no thin shot or footstep slips through', () => {
  const body = {halfWidth: .01, halfLength: .01, height: 1};
  for (const id of ['scrapdome', 'salt-flats', 'pit']) {
    const ring = new Course(ARENA_VENUES[id], SEED), layout = ring.def.scrapdome;
    for (const side of [1, -1]) {
      let open = 0, checked = 0;
      for (let s = 0; s < ring.length; s += .1) {
        const from = ring.worldAt(s, side * (layout.floorHalfWidth - 2)), to = ring.worldAt(s, side * (layout.wallOffset + 4));
        const heading = ring.at(s).heading;
        checked++;
        if (!ring.obstaclesNear(s).some(obstacle => sweepObstacle({x: from.x, y: 0, z: from.z},
          {x: to.x, y: 0, z: to.z}, obstacle, heading, body))) open++;
      }
      equal(open, 0, `${id} ${side > 0 ? 'outer' : 'inner'} wall: ${open} open paths in ${checked} (the Scrapdome outer wall had 780)`);
    }
  }
});
