import { terrainGeometrySlices, farTerrainGeometrySlices } from './world-surfaces.js';
import { applySnowTerrainSlices } from './snow-world.js';

// The ground of a course depends on the course alone: the near ribbon, the far hills and the winter coverage on
// both. The world build used to work them out inside its timed step. A preload works them out earlier, a little at
// a time, while the course's kits and cars are still loading, and the build takes the finished meshes' geometry.
// It runs the very same slice generators the build would have run straight through (world-surfaces.js,
// snow-world.js), in the same order, so what the build gets is exactly what it would have made itself.
//
//   const preload = createTerrainPreload({schedule});   // schedule(run) calls run again soon (a task, not a frame)
//   preload.request(course, winterOn);                  // start, or keep going, or restart for another course
//   preload.advance(8);                                 // do up to about 8 ms of it (schedule does this itself)
//   buildEnvironment(course, {trackKits, snow, preload});   // takes the result, finishing what is left
//
// One course at a time: a request for another course drops the unfinished work.

// The build does not draw this ground for these, or the course changes its ground after construction.
function eligible(course) {
  return !!course && !course.def.pit && course.def.id !== 'salt-flats' && !course.deepRamp && !course.deepNaturalGroundAt;
}

function* pipeline(course, winter, out) {
  const terrain = yield* terrainGeometrySlices(course);
  out.terrain = winter ? yield* applySnowTerrainSlices(terrain, course) : terrain;
  const far = yield* farTerrainGeometrySlices(course);
  out.farTerrain = winter ? yield* applySnowTerrainSlices(far, course) : far;
}

export function createTerrainPreload({ schedule = null, now = () => performance.now(), sliceMs = 8 } = {}) {
  let job = null, pumping = false;
  function drop() {
    if (job) { job.out.terrain?.dispose(); job.out.farTerrain?.dispose(); }
    job = null;
  }
  function advance(budgetMs = sliceMs) {
    if (!job || job.done) return;
    const end = now() + budgetMs;
    try {
      do {
        if (job.steps.next().done) { job.done = true; return; }
      } while (now() < end);
    } catch (error) {
      // The build repeats the work itself and meets the same error where it always did.
      job = null;
    }
  }
  function pump() {
    pumping = false;
    advance();
    if (job && !job.done && schedule) { pumping = true; schedule(pump); }
  }
  return {
    get active() { return !!job; },
    get done() { return !job || job.done; },
    request(course, winterOn) {
      if (!eligible(course)) { drop(); return; }
      const winter = !!winterOn && !!course.def.snowWorld;
      if (job && job.course === course && job.winter === winter) return;
      drop();
      const out = { terrain: null, farTerrain: null };
      job = { course, winter, out, done: false, steps: pipeline(course, winter, out) };
      if (schedule && !pumping) { pumping = true; schedule(pump); }
    },
    advance,
    // The finished geometry for this course and winter setting, or null when the preload is for something else.
    // Whatever is left to do is done now, straight through.
    take(course, winterOn) {
      const winter = !!winterOn && !!course.def.snowWorld;
      if (!job || job.course !== course || job.winter !== winter) return null;
      const taken = job;
      try {
        while (!taken.done) if (taken.steps.next().done) taken.done = true;
      } catch (error) { job = null; return null; }
      job = null;
      return taken.out;
    },
    dispose: drop,
  };
}
