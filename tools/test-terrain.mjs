import assert from 'node:assert/strict';
import { Course } from '../src/course.js';
import { Duel } from '../src/game.js';
import { COURSE, DRIVE, LIVES } from '../src/config.js';

// Targeted terrain contracts: actual station footprints, accessible coastal
// headlands, water recovery, and mountain rims versus the far terrain surface.
let checks = 0, worstStationError = 0, highestMountainRim = -Infinity;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const transform = (origin, x, z) => ({
  x: origin.x + Math.cos(origin.heading) * x + Math.sin(origin.heading) * z,
  z: origin.z - Math.sin(origin.heading) * x + Math.cos(origin.heading) * z,
});

function groundAtWorld(course, point) {
  const nearest = course.nearest(point.x, point.z);
  return course.groundAt(nearest.s, nearest.lateral).y;
}

// The far landscape samples every fourth centreline point. Compare the finer
// 128-angle rim to that distinct surface, not just the 64 placement samples.
function farGroundSampler(course) {
  const route = course.samples.filter((_, index) => index % 4 === 0);
  if (route.at(-1) !== course.samples.at(-1)) route.push(course.samples.at(-1));
  return point => {
    let closest = Infinity, s = 0, off = 0;
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
      const x = point.x - a.x - dx * t, z = point.z - a.z - dz * t, distance = x * x + z * z;
      if (distance < closest) {
        closest = distance; s = a.s + (b.s - a.s) * t;
        off = Math.sqrt(distance) * Math.sign(x * dz - z * dx);
      }
    }
    return course.groundAt(s, off).y - .15;
  };
}

for (const seed of [1989, 42]) {
  for (const definition of COURSE) {
    const course = new Course(definition, seed);
    for (const station of course.features.stations) {
      const structures = course.features.obstacles.filter(obstacle => obstacle.id.startsWith(`${station.id}-`));
      for (const structure of structures) {
        for (const [x, z] of [[0, 0], [-structure.halfX, -structure.halfZ], [structure.halfX, -structure.halfZ], [-structure.halfX, structure.halfZ], [structure.halfX, structure.halfZ]]) {
          const error = Math.abs(groundAtWorld(course, transform(structure, x, z)) - station.y);
          worstStationError = Math.max(worstStationError, error);
          check(error < .02, `${definition.name}/${seed}/${structure.id}: structure foundation is not level with its service yard (${error.toFixed(3)}m)`);
        }
      }
    }

    if (definition.theme === 'coast') {
      check(course.features.landmarks.length === 2, `Coast/${seed}: both lighthouse headlands have their towers`);
      for (const tower of course.features.landmarks) {
        check(tower.y > -14, `Coast/${seed}/${tower.id}: lighthouse base is above the sea boundary`);
        check(Math.abs(groundAtWorld(course, tower) - tower.y) < .02, `Coast/${seed}/${tower.id}: lighthouse base matches the headland`);
        check(tower.y + tower.height > course.at(tower.s).y + 10, `Coast/${seed}/${tower.id}: lighthouse extends visibly above road height`);
      }
      check(course.features.trees.every(tree => tree.y >= -13), `Coast/${seed}: no tree roots are under water`);

      const duel = new Duel({ seed }); duel.startCampaign({ startStage: COURSE.findIndex(stage => stage.theme === 'coast') });
      const state = duel.state; state.status = 'racing'; state.traffic = []; state.rival = null;
      state.s = 1600; state.speedMph = 65; state.lateral = 20;
      duel._boundary(state); check(state.lateral === 20, `Coast/${seed}: open dry dirt stays drivable`);
      let warning, water;
      for (let lateral = 29; lateral < 78; lateral += .25) {
        const height = duel.course.groundAt(state.s, lateral).y;
        if (warning == null && height < -10 && height >= -14) warning = lateral;
        if (water == null && height < -14) water = lateral;
      }
      check(warning != null && water != null, `Coast/${seed}: sea approach has both warning and recovery thresholds`);
      state.lateral = warning; duel._boundary(state);
      check(state.boundaryWarning && state.boundaryResets === 0, `Coast/${seed}: water warning precedes recovery`);
      state.lateral = water; duel._boundary(state);
      check(Math.abs(state.lateral) < DRIVE.roadHalfWidth && state.boundaryResets === 1, `Coast/${seed}: player recovers before entering the sea`);
      check(state.lives === LIVES.start && state.majorCrashes === 0 && state.penaltySec === 0, `Coast/${seed}: sea recovery does not damage or penalize the player`);
      const rival = state.rival = { s: 1600, lateral: water, speedMph: 70, headingError: 0, pushVelocity: 0 };
      duel._boundary(rival);
      check(Math.abs(rival.lateral) < DRIVE.roadHalfWidth && rival.speedMph <= 28, `Coast/${seed}: rival also recovers before entering the sea`);
    }

    if (definition.theme === 'alpine') {
      const farGround = farGroundSampler(course);
      for (const mountain of course.features.mountains) {
        const rim = angle => transform(mountain, Math.cos(angle) * mountain.halfX, Math.sin(angle) * mountain.halfZ);
        let placementMin = mountain.y;
        for (let i = 0; i < 64; i++) placementMin = Math.min(placementMin, groundAtWorld(course, rim(i * Math.PI / 32)));
        const floor = placementMin - 4;
        let highestRim = -Infinity;
        for (let i = 0; i < 128; i++) highestRim = Math.max(highestRim, floor - farGround(rim(i * Math.PI / 64)));
        highestMountainRim = Math.max(highestMountainRim, highestRim);
        check(highestRim < -.5, `${definition.name}/${seed}/${mountain.id}: mountain rim needs burial beneath the far terrain (${highestRim.toFixed(3)}m)`);
      }
    }
  }
}

console.log(`Terrain checks: ${checks} passed across six scenes and two seeds.`);
console.log(`Station foundation error: ${worstStationError.toFixed(4)}m maximum.`);
console.log(`Mountain rim clearance: ${(-highestMountainRim).toFixed(2)}m minimum burial.`);
