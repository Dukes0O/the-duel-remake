import { createPolylineIndex } from './polyline-index.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = t => (t = clamp(t, 0, 1), t * t * (3 - 2 * t));

// Authored world-space spur. It has no racing shortcut, RNG or persistence.
// Progress is physical metres, suitable for the later departure/gate sequence.
export function createHiddenRoad(course) {
  const entrance = { s: 1408, lateral: 8.5 };
  const mouth = course.groundAt(entrance.s, entrance.lateral);
  const length = 1050, washEnd = length - 300, step = 2;
  const headingAt = progress => mouth.heading + .20 + 1.08 * smooth(progress / 100)
    + (progress < washEnd ? .36 * Math.sin(Math.PI * 2 * Math.max(0, progress - 100) / (washEnd - 100)) ** 3 : 0);
  const heightAt = progress => mouth.y - 2.5 * smooth(progress / 180);
  const samples = [{ ...mouth, progress: 0, heading: headingAt(0) }];
  for (let progress = step; progress <= length; progress += step) {
    const previous = samples.at(-1), heading = headingAt(progress - step / 2);
    samples.push({ x: previous.x + Math.sin(heading) * step,
      z: previous.z + Math.cos(heading) * step, y: heightAt(progress),
      heading: headingAt(progress), progress });
  }
  const index = createPolylineIndex(samples);
  // A natural widening before the later 150 m departure point leaves room
  // to reverse direction without committing to the Wasteland approach.
  const widthAt = progress => 9 + 9 * smooth((progress - 65) / 20) * (1 - smooth((progress - 125) / 20))
    + 111 * smooth((progress - washEnd) / 90);
  function nearest(x, z) {
    const hit = index.query(x, z), b = samples[hit.index], a = samples[hit.index - 1];
    const progress = a.progress + (b.progress - a.progress) * hit.t;
    return { progress, distance: Math.sqrt(hit.distanceSq), y: heightAt(progress),
      x: a.x + (b.x - a.x) * hit.t, z: a.z + (b.z - a.z) * hit.t };
  }
  function contains(x, z) {
    const point = nearest(x, z);
    return point.distance <= widthAt(point.progress);
  }
  function poseAt(progress, perpendicularOffset = 0) {
    progress = clamp(progress, 0, length);
    const i = Math.min(samples.length - 2, Math.floor(progress / step));
    const a = samples[i], b = samples[i + 1], t = (progress - a.progress) / step;
    const heading = headingAt(progress);
    const x = a.x + (b.x - a.x) * t + Math.cos(heading) * perpendicularOffset;
    const z = a.z + (b.z - a.z) * t - Math.sin(heading) * perpendicularOffset;
    const race = course.nearest(x, z, entrance.s);
    return { x, y: heightAt(progress), z, heading, s: race.s, lateral: race.lateral, progress };
  }
  return { entrance, length, washEnd, samples, widthAt, nearest, contains, poseAt };
}

export function installHiddenRoad(course) {
  const road = createHiddenRoad(course);
  course.hiddenRoad = road;
  // Reserve complete scenery footprints, including distant mountain skirts.
  // Build the normal course first so the racing RNG stream stays untouched.
  const removed = new Set(course.features.obstacles.filter(obstacle => {
    const point = road.nearest(obstacle.x, obstacle.z);
    return point.distance < road.widthAt(point.progress) + Math.hypot(obstacle.halfX, obstacle.halfZ) + 4;
  }));
  const removedSources = new Set([...removed].map(obstacle => obstacle.source));
  for (const field of ['obstacles', 'rocks', 'mountains', 'trees', 'barriers', 'poles', 'buildings', 'chevrons']) {
    course.features[field] = course.features[field].filter(item => !removed.has(item) && !removedSources.has(item));
  }
  road.walls = [];
  for (let progress = 28; progress < road.washEnd; progress += 8) for (const side of [-1, 1]) {
    const pose = road.poseAt(progress, side * (road.widthAt(progress) + 3));
    const wall = { ...pose, off: pose.lateral, id: `hidden-wash-${progress}-${side}`,
      kind: 'building', shape: 'box', halfX: 3.2, halfZ: 4.5,
      height: 10 + 9 * smooth((progress - 28) / 70) + 3 * Math.sin(progress * .043) ** 2,
      hiddenRoadWall: true, theme: 'desert' };
    // The inside bank must not pinch the main road while the spur peels away.
    // Check the whole box rather than relying on its centre's lateral offset.
    let clearsRace = true;
    for (const across of [-wall.halfX, 0, wall.halfX]) for (const along of [-wall.halfZ, 0, wall.halfZ]) {
      const nearest = course.nearest(wall.x + Math.cos(wall.heading) * across + Math.sin(wall.heading) * along,
        wall.z - Math.sin(wall.heading) * across + Math.cos(wall.heading) * along);
      if (Math.abs(nearest.lateral) < course.roadHalfWidthAt(nearest.s) + 4) clearsRace = false;
    }
    if (!clearsRace) continue;
    road.walls.push(wall); course.features.obstacles.push(wall);
  }
  // Rebuild only spatial buckets; the original scenery generation is complete.
  course.obstacleBuckets.clear();
  for (const obstacle of course.features.obstacles) {
    const reach = Math.hypot(obstacle.halfX, obstacle.halfZ) * 1.5 + 20;
    for (let bucket = Math.floor((obstacle.s - reach) / 64); bucket <= Math.floor((obstacle.s + reach) / 64); bucket++) {
      const key = ((bucket % course.bucketCount) + course.bucketCount) % course.bucketCount;
      if (!course.obstacleBuckets.has(key)) course.obstacleBuckets.set(key, []);
      course.obstacleBuckets.get(key).push(obstacle);
    }
  }
}

export function onHiddenRoad(course, actor) {
  if (!course.hiddenRoad || !actor) return false;
  // Keep the racing lane and its established shoulder handling identical.
  if (Math.abs(actor.lateral) <= course.roadHalfWidthAt(actor.s) + 1) return false;
  const point = course.worldAt(actor.s, actor.lateral);
  return course.hiddenRoad.contains(point.x, point.z);
}
