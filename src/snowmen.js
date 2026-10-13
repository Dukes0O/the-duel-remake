import {renderedGroundHeight} from './rendered-ground.js';

export function snowmenEnabled(course, flags) {
  return flags?.enabled('snowmen') === true &&
    Array.isArray(course?.def.snowmen) && course.def.snowmen.length > 0;
}

export function snowmanPlacements(course) {
  return (course.def.snowmen ?? []).map((spot, index) => ({
    id: 'snowman',
    s: spot.s,
    lateral: spot.lateral,
    heading: spot.heading ?? 0,
    scale: 1,
    snowmanId: `${course.def.id}-snowman-${index}`,
  }));
}

// Append after scenery has consumed its original seeded draws. Off courses are untouched.
export function initializeSnowmen(duel) {
  const course = duel.course, state = duel.state;
  delete state.snowmenEnabled;
  delete state.snowmen;
  delete state.snowmanBursts;
  duel._brokenSnowmanIds = null;
  if (!snowmenEnabled(course, duel.featureFlags)) return;
  state.snowmenEnabled = true;
  state.snowmen = 0;
  state.snowmanBursts = [];
  duel._brokenSnowmanIds = new Set();
  course.features.snowmen = snowmanPlacements(course).map(row => {
    const point = course.groundAt(row.s, row.lateral);
    const y = renderedGroundHeight(course,
      {...point, s: row.s, off: row.lateral}, {requireSurface: true});
    if (!Number.isFinite(y)) throw new Error('Snowman has no rendered ground.');
    // Both approved GLBs have the same 1.55 by 2.1 by 1 metre bounds.
    const obstacle = {
      id: row.snowmanId, snowmanId: row.snowmanId, kind: 'snowman', shape: 'box',
      s: row.s, off: row.lateral, x: point.x, y, z: point.z,
      heading: point.heading + row.heading,
      halfX: .775, halfZ: .5, height: 2.1, minY: y, maxY: y + 2.1,
    };
    course.features.obstacles.push(obstacle);
    const reach = Math.hypot(obstacle.halfX, obstacle.halfZ) * 1.5 + 20;
    for (let bucket = Math.floor((row.s - reach) / 64);
      bucket <= Math.floor((row.s + reach) / 64); bucket++) {
      const key = ((bucket % course.bucketCount) + course.bucketCount) % course.bucketCount;
      if (!course.obstacleBuckets.has(key)) course.obstacleBuckets.set(key, []);
      course.obstacleBuckets.get(key).push(obstacle);
    }
    return obstacle;
  });
}

export function hitSnowman(duel, obstacle, player, start, end, t) {
  if (!obstacle.snowmanId || duel.state.snowmenEnabled !== true ||
    duel._brokenSnowmanIds.has(obstacle.snowmanId)) return false;
  const dx = end.x - start.x, dz = end.z - start.z, distance = Math.hypot(dx, dz);
  if (distance < .0001) return false;
  duel._brokenSnowmanIds.add(obstacle.snowmanId);
  if (player) duel.state.snowmen++;
  const burst = {
    id: obstacle.snowmanId, atTime: duel.state.stageTimeSec,
    x: obstacle.x, y: obstacle.y, z: obstacle.z, heading: obstacle.heading,
    directionX: dx / distance, directionZ: dz / distance,
    hitPosition: {x: start.x + dx * t, y: obstacle.y, z: start.z + dz * t},
  };
  duel.state.snowmanBursts.push(burst);
  duel._obstacleQueryCache.clear();
  duel.emit({snowmanHit: burst});
  return true;
}

export function snowmanResult(duel) {
  return duel.state.snowmenEnabled === true && duel.state.qualifying?.phase !== 'driving'
    ? {snowmenEnabled: true, snowmen: duel.state.snowmen} : {};
}
