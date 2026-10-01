// Arena venues (docs/SCRAPDOME.md section 2). Venues are deliberately not in
// COURSE, so no venue can appear in the main menu's circuit picker.

export const SCRAPDOME_LAYOUT = Object.freeze({
  // Drivable floor either side of the centreline. The outer side (positive
  // offset) is the stadium wall; the inner side is the Heap.
  floorHalfWidth: 18,
  // Packed dirt and scrap. Top speeds (116 to 298 mph) are squeezed toward
  // 70 mph, keeping their order, so every car can turn round inside the
  // floor: fights, not laps. See arenaFloorSpeed.
  floorSpeedMph: 70, floorSpeedReferenceMph: 200, floorSpeedExponent: .35,
  floorTraction: .95, floorScrub: .02, floorRoughness: .12,
  wallOffset: 21,
  rampFractions: Object.freeze([.08, .42, .75]),
  rampLength: 34,
  rampHeight: 2.4,
  // Junk-car cover in three rows, one car each side of the middle lane, each
  // row midway between spawn slots. Only the Titan can crush junk.
  junk: Object.freeze([[.25, 10], [.25, -10], [.625, 10], [.625, -10], [.89, 10], [.89, -10]]),
  junkSpawnClearance: 14,
  spawnSlots: 8,
  spawnOffset: 9,
});

export const SCRAPDOME_VENUE = Object.freeze({
  id: 'scrapdome', venue: true, layoutVersion: 1, theme: 'arena', stage: 30,
  name: 'The Scrapdome', lengthU: 480, closed: true, laps: 1, kind: 'arena',
  arena: true, scrapdome: SCRAPDOME_LAYOUT, hasRadar: false, hasRival: true,
  speedLimitMph: 100,
  sections: Object.freeze([Object.freeze({theme: 'arena', name: 'The Scrapdome', share: 1})]),
});

// The Salt Flats keeps the arena ring engine. Its centered oval and its
// source-fitted solid envelopes live here so physics owns the native recipe.
export const SALT_FLATS_LAYOUT = Object.freeze({
  ...SCRAPDOME_LAYOUT,
  rampFractions: Object.freeze([0, .5]),
  rampLength: 26,
  rampHeight: 2.4,
  rampWidth: 8,
  rampStations: 16,
  junk: Object.freeze([]),
});

export const SALT_FLATS_VENUE = Object.freeze({
  id: 'salt-flats', venue: true, layoutVersion: 1, theme: 'arena', stage: 31,
  name: 'The Salt Flats Scrapyard', lengthU: 640, closed: true, laps: 1,
  kind: 'arena', arena: true, scrapdome: SALT_FLATS_LAYOUT,
  saltFlats: Object.freeze({width: 300, depth: 200}),
  hasRadar: false, hasRival: true, speedLimitMph: 100,
  sections: Object.freeze([Object.freeze({theme: 'arena', name: 'The Salt Flats Scrapyard', share: 1})]),
});

export const ARENA_VENUES = Object.freeze({
  scrapdome: SCRAPDOME_VENUE,
  'salt-flats': SALT_FLATS_VENUE,
});

export function saltFlatsPhysicalGeometry(course) {
  const solids = [];
  const solid = (id, kind, center, size, fit = {}) => {
    solids.push({id, kind, center, size, fit,
      collision: {center, halfExtents: size.map(value => value / 2 + .002), heading: 0}});
  };
  // Local donor sections follow the same physical offset frames as the floor.
  // Each envelope contains one container/wreck or one short tyre assembly;
  // none encloses a sector of drivable salt behind a broad proxy wall.
  const boundary = (id, kind, s, offset, size, source) => {
    const at = course.worldAt(s, offset), heading = at.heading;
    const cosine = Math.abs(Math.cos(heading)), sine = Math.abs(Math.sin(heading));
    const center = [at.x, size[1] / 2, at.z];
    const envelope = [cosine * size[0] + sine * size[2], size[1],
      sine * size[0] + cosine * size[2]];
    solid(id, kind, center, envelope, {boundary: true, s, offset, center,
      size, heading, source});
  };
  for (let index = 0; index < 64; index++) {
    const s = index / 64 * course.length;
    const tyres = index === 16 || index === 48;
    boundary(`${tyres ? 'tyre' : 'container'}-boundary-${index + 1}`,
      tyres ? 'tyre-wall' : 'container-wall', s,
      course.def.scrapdome.wallOffset - (tyres ? .5 : 0),
      tyres ? [.46, 3.42, 11.62] : [2.44, 5.20, 12.15],
      tyres ? 'debris-tire' : index % 2 ? 'shipping-container-a' : 'shipping-container-b');
  }
  for (let index = 0; index < 96; index++) {
    boundary(`salvage-island-${index + 1}`, 'salvage-cover', index / 96 * course.length,
      -course.def.scrapdome.wallOffset, [2.30, .92, 5.25], 'sedan');
  }
  for (const [index, [x, z]] of [[-53, -43], [0, -48], [55, -41],
    [-60, 38], [0, 45], [58, 40]].entries()) {
    solid(`salvage-cover-${index + 1}`, 'salvage-cover', [x, 1.035, z],
      [3.55, 2.07, 5.25]);
  }
  solid('plain-derelict-bus', 'bus', [-35, 1.275, 0], [10.8, 2.55, 2.72]);
  // The picked crane and hanging magnet retain the original 12 m assembly.
  // This tight source-derived envelope includes its actual jib and cable.
  solid('salvage-jib-crane', 'crane', [35, 6, -4.078], [6.505, 12, 12.817]);
  const layout = course.def.scrapdome;
  const ramps = layout.rampFractions.map((fraction, index) => {
    const s = course.length * fraction, at = course.worldAt(s);
    const center = [at.x, 0, at.z], heading = index ? Math.PI : 0;
    const stations = Array.from({length: layout.rampStations + 1}, (_, station) => ({
      z: (station / layout.rampStations - .5) * layout.rampLength,
      y: layout.rampHeight * Math.sin(Math.PI * station / layout.rampStations) ** 2,
    }));
    const vertices = stations.flatMap(({z, y}) => [-1, 1].map(side => {
      const x = side * layout.rampWidth / 2;
      return [center[0] + Math.cos(heading) * x + Math.sin(heading) * z,
        y, center[2] - Math.sin(heading) * x + Math.cos(heading) * z];
    }));
    const triangles = stations.slice(1).flatMap((_, station) => {
      const a = station * 2, b = a + 2;
      return [[a, b + 1, a + 1], [a, b, b + 1]];
    });
    return {id: `salt-ramp-${index + 1}`, start: s - layout.rampLength / 2,
      end: s + layout.rampLength / 2, height: layout.rampHeight,
      profile: {center, heading, width: layout.rampWidth, length: layout.rampLength,
        height: layout.rampHeight, shape: 'sampled-arena-sine-squared'},
      stations, vertices, triangles};
  });
  return {ground: course.def.saltFlats, solids, ramps};
}

export function saltFlatsRampHeight(ramps, x, z) {
  for (const ramp of ramps) {
    const {center, heading, width, length} = ramp.profile;
    const dx = x - center[0], dz = z - center[2];
    const across = Math.cos(heading) * dx - Math.sin(heading) * dz;
    const along = Math.sin(heading) * dx + Math.cos(heading) * dz;
    // Only float export precision is allowed at the authored footprint edge.
    if (Math.abs(across) > width / 2 + .00001 || Math.abs(along) > length / 2 + .00001) continue;
    const position = Math.max(0, Math.min(ramp.stations.length - 1,
      (along / length + .5) * (ramp.stations.length - 1)));
    const index = Math.min(ramp.stations.length - 2, Math.floor(position));
    return ramp.stations[index].y + (ramp.stations[index + 1].y - ramp.stations[index].y) * (position - index);
  }
  return 0;
}

// A car's top speed on the arena floor.
export function arenaFloorSpeed(layout, topSpeedMph) {
  if (!layout) return topSpeedMph;
  return Math.min(topSpeedMph, layout.floorSpeedMph *
    (topSpeedMph / layout.floorSpeedReferenceMph) ** layout.floorSpeedExponent);
}

// Track-relative positions are only valid while the floor is narrower than
// the centreline's tightest bend radius. Returns the safety margin (< 1 is safe).
export function venueCurvatureRatio(course) {
  const layout = course.def.scrapdome;
  let worst = 0;
  for (const sample of course.samples) worst = Math.max(worst, Math.abs(sample.curvature));
  return worst * (layout?.wallOffset ?? course.roadHalfWidthAt(0));
}

export function junkNear(course, s, lateral, clearance) {
  const at = course.worldAt(s, lateral);
  return (course.features.crushables || []).some(prop => Math.hypot(prop.x - at.x, prop.z - at.z) < clearance);
}

// Evenly spaced slots around the ring, alternating outer and inner lanes and
// facing along the ring. Deterministic: no random numbers.
export function spawnSlots(course) {
  const layout = course.def.scrapdome;
  const count = layout.spawnSlots, slots = [];
  for (let index = 0; index < count; index++) {
    const s = (index + .5) / count * course.length;
    // Keep slots off the ramps so nobody spawns airborne.
    const ramp = course.features.ramps.find(r => s >= r.start - 6 && s <= r.end + 6);
    let at = ramp ? ramp.end + 10 : s;
    const lateral = (index % 2 ? -1 : 1) * layout.spawnOffset;
    // Never spawn nose-to-nose with junk: step along the ring until clear.
    for (let tries = 0; tries < 6 && junkNear(course, at, lateral, layout.junkSpawnClearance); tries++) at += 6;
    slots.push({index, s: at, lateral, headingError: 0});
  }
  return slots;
}
