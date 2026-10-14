// Kestrel One's camera views (docs/HELICOPTER.md section 8): behind the
// helicopter, the cockpit, straight down the cable, and side. Drawing
// only: it reads the session's view and returns a pose.
export const HELI_CAMERA_VIEWS = Object.freeze(['behind', 'cockpit', 'cable', 'side']);

export function heliCameraPose(view, index = 0) {
  const h = view?.heli;
  if (!h) return null;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const load = view.load?.hooked ? view.load : null;
  const name = HELI_CAMERA_VIEWS[((index % 4) + 4) % 4];
  if (name === 'cockpit') {
    return {name, fov: 70,
      position: {x: h.x + fwdX * 1.1, y: h.y + 1.45, z: h.z + fwdZ * 1.1},
      target: {x: h.x + fwdX * 40, y: h.y + 1.45 - 40 * Math.tan(h.pitch) - 6, z: h.z + fwdZ * 40}};
  }
  if (name === 'cable') {
    const below = load ?? {x: h.x, y: h.y - 15, z: h.z};
    return {name, fov: 62,
      position: {x: h.x + fwdX * 0.2, y: h.y - 0.4, z: h.z + fwdZ * 0.2},
      target: {x: below.x, y: below.y - 1, z: below.z}};
  }
  if (name === 'side') {
    const midY = load ? (h.y + load.y) / 2 : h.y;
    return {name, fov: 55,
      position: {x: h.x + rightX * 30, y: midY + 3, z: h.z + rightZ * 30},
      target: {x: h.x, y: midY, z: h.z}};
  }
  // Behind: far enough back and up to see a car swinging on the cable.
  const back = load ? 34 : 20, up = load ? 10 : 7;
  return {name, fov: 58,
    position: {x: h.x - fwdX * back, y: h.y + up, z: h.z - fwdZ * back},
    target: {x: h.x + fwdX * 8, y: load ? h.y - 6 : h.y, z: h.z + fwdZ * 8}};
}
