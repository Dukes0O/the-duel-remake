import {renderedGroundHeight} from './rendered-ground.js';
import {mountainPlacement} from './mountain-surface.js';

// Measured local geometry extrema. Reproduce with collider-heights.mjs --models.
// Keep authored visual dimensions intact: modelMinY/modelMaxY leave grounded legacy contacts unchanged.
export const SCENERY_MODEL_BOUNDS = Object.freeze({
  pine: [-.4544331133365631, 6.009486198425293],
  cactus: [
    [-.0019764062017202377, 2.7500176429748535],
    [-.00180688442196697, 3.050016164779663],
    [-.002253143582493067, 2.3000199794769287],
  ],
  rock: [-1, 1],
  hiddenBank: [-.9341723322868347, .9341723322868347],
  pitPile: [-.06967078048184325, 3.874968428143224],
  pitWall: [-.20565261819936637, 3.251314523356541],
  rail: [-.05, 1.05], // world-props: posts .5 +/- 1.1/2, rail .82 +/- .38/2
  arenaWall: [0, 1.8], // race-structures: concrete .9 +/- 1.8/2
  pole: [0, 11],
  finish: [0, 9.4], // post plus shared finish board, 8.5 +/- 1.8/2
  stationBuilding: [-.05, 4.375],
  stationPost: [0, 4],
  stationPump: [.05, 2.35],
  pacificLighthouse: [-1, 24.03],
  lighthouse: [0, 24.05],
});

function bounds(obstacle, base, range, scale = 1) {
  // Derived runtime metadata must not change authored/exported course geometry.
  Object.defineProperties(obstacle, {
    modelMinY: {value: base + range[0] * scale, writable: true, configurable: true},
    modelMaxY: {value: base + range[1] * scale, writable: true, configurable: true},
  });
}

// Course construction only. No renderer writes simulation state, no frame scans.
export function installSceneryBounds(course) {
  let cactusIndex = 0;
  for (const obstacle of course.features.obstacles) {
    const id = obstacle.id || '';
    if (id === 'pit-centre-pile') {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.pitPile);
    } else if (id.startsWith('pit-wall-')) {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.pitWall);
    } else if (obstacle.hiddenRoadWall) {
      bounds(obstacle, obstacle.y + obstacle.height * .42, SCENERY_MODEL_BOUNDS.hiddenBank, obstacle.height * .7);
    } else if (obstacle.landmark === 'lighthouse') {
      if (course.def.id === 'pacific-canyon') {
        let base = obstacle.y;
        for (let index = 0; index < 32; index++) {
          const angle = index / 32 * Math.PI * 2;
          const near = course.nearest(obstacle.x + Math.sin(angle) * 3.1,
            obstacle.z + Math.cos(angle) * 3.1);
          base = Math.min(base, course.groundAt(near.s, near.lateral).y);
        }
        bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.pacificLighthouse);
        obstacle.modelMinY = base - 1;
      } else bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.lighthouse);
    } else if (course.features.buildings.includes(obstacle)) {
      bounds(obstacle, obstacle.y, [-obstacle.foundationDepth, obstacle.height + .3]);
    } else if (obstacle.kind === 'mountain' && !obstacle.tunnelCover && course.features.mountains.includes(obstacle)) {
      const pose = mountainPlacement(course, obstacle);
      bounds(obstacle, pose.y, [0, 1], pose.sy);
    } else if (obstacle.kind === 'tree') {
      if (obstacle.theme === 'desert') {
        const index = cactusIndex++;
        const seed = obstacle.s * .37 + obstacle.off * .71 + index * .11;
        const noise = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
        const scale = obstacle.scale * (.78 + (noise - Math.floor(noise)) * .13);
        bounds(obstacle, renderedGroundHeight(course, obstacle) - .27 - .04 * obstacle.scale,
          SCENERY_MODEL_BOUNDS.cactus[index % 3], scale);
      } else {
        const base = course.def.expansion ? renderedGroundHeight(course, obstacle) : obstacle.y;
        bounds(obstacle, base - .24, SCENERY_MODEL_BOUNDS.pine, obstacle.scale);
      }
    } else if (obstacle.kind === 'rock' && obstacle.source?.scale && !obstacle.source.outcrop) {
      bounds(obstacle, obstacle.y + .1, SCENERY_MODEL_BOUNDS.rock, obstacle.source.scale[1]);
    } else if (obstacle.tunnelWall) {
      // Lining arches spring at 3.6 m and the .9 m wall slab ends at the
      // outer side of that spring. Sample both ends on graded tunnel roads.
      // Authored galleries instead retain their measured full-height lining.
      const samples = [-4, 0, 4].map(delta => course.at(obstacle.s + delta).y);
      bounds(obstacle, 0, Number.isFinite(obstacle.minY) && Number.isFinite(obstacle.maxY)
        ? [obstacle.minY, obstacle.maxY]
        : [Math.min(...samples) - .1, Math.max(...samples) + 3.6]);
    } else if (obstacle.arenaWall && !Number.isFinite(obstacle.height)) {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.arenaWall);
    } else if (obstacle.barrier && !Number.isFinite(obstacle.height)) {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.rail);
    } else if (id.startsWith('pole-')) {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.pole);
    } else if (id.startsWith('finish-post-')) {
      bounds(obstacle, course.worldAt(0).y, SCENERY_MODEL_BOUNDS.finish);
    } else if (/^station-\d+-building$/.test(id)) {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.stationBuilding);
    } else if (/^station-\d+-post-/.test(id)) {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.stationPost);
    } else if (/^station-\d+-pump-/.test(id)) {
      bounds(obstacle, obstacle.y, SCENERY_MODEL_BOUNDS.stationPump);

    }
  }
}
