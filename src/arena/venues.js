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

export const ARENA_VENUES = Object.freeze({scrapdome: SCRAPDOME_VENUE});

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
