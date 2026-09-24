// Geometry is deterministic from the complete course definition and seed.
// Keep only one rendered world; this key avoids rebuilding it merely because
// the menu preview and live simulation own separate, equivalent Course objects.
export function environmentKey(course) {
  if (course.hiddenRoad) return JSON.stringify([course.seed, course.def, 'hidden-road-v1']);
  return JSON.stringify([course.seed,course.def]);
}
