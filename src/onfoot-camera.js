const EYE_HEIGHT_METERS = 1.62;
const GROUND_CLEARANCE_METERS = .65;

// Read-only first-person pose. The fighter and terrain are simulation data;
// this module changes neither, and the renderer can use the result directly.
export function onFootCameraPose(course, fighter) {
  if (!course || !fighter) return null;
  const near = course.nearest(fighter.x, fighter.z, fighter.s);
  const ground = course.groundAt(near.s, near.lateral);
  const eye = {
    x: fighter.x,
    y: Math.max(fighter.y + EYE_HEIGHT_METERS,
      ground.y + GROUND_CLEARANCE_METERS),
    z: fighter.z,
  };
  const pitch = Math.max(-1.25, Math.min(1.25, fighter.pitch || 0));
  const yaw = fighter.yaw || 0;
  const reach = 8;
  return {
    position: eye,
    target: {
      x: eye.x + Math.sin(yaw) * Math.cos(pitch) * reach,
      y: eye.y + Math.sin(pitch) * reach,
      z: eye.z + Math.cos(yaw) * Math.cos(pitch) * reach,
    },
    fov: 72,
  };
}
