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
  // Breakable junk-car cover: [fraction of the ring, offset].
  junk: Object.freeze([[.2, 9], [.26, -10], [.55, 11], [.6, -8], [.88, 10], [.93, -11]]),
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

// Evenly spaced slots around the ring, alternating outer and inner lanes and
// facing along the ring. Deterministic: no random numbers.
export function spawnSlots(course) {
  const layout = course.def.scrapdome;
  const count = layout.spawnSlots, slots = [];
  for (let index = 0; index < count; index++) {
    const s = (index + .5) / count * course.length;
    // Keep slots off the ramps so nobody spawns airborne.
    const ramp = course.features.ramps.find(r => s >= r.start - 6 && s <= r.end + 6);
    const at = ramp ? ramp.end + 10 : s;
    slots.push({index, s: at, lateral: (index % 2 ? -1 : 1) * layout.spawnOffset, headingError: 0});
  }
  return slots;
}
