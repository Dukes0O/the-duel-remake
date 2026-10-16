// Kestrel One's camera views (docs/HELICOPTER.md section 8): behind the
// helicopter, the cockpit, straight down the cable, and side. Drawing
// only: it reads the session's view and returns a pose.
export const HELI_CAMERA_VIEWS = Object.freeze(['behind', 'cockpit', 'cable', 'side']);
// The TV camera skin's nose camera (gear.noseCamera) adds a fifth view.
export const HELI_CAMERA_VIEWS_WITH_NOSE = Object.freeze([...HELI_CAMERA_VIEWS, 'nose']);
export const cameraViewsFor = gear => gear?.noseCamera === true ? HELI_CAMERA_VIEWS_WITH_NOSE : HELI_CAMERA_VIEWS;
// The pilot's eye in Kestrel One's model (its pilot_eye node): the right-hand
// seat, metres from the origin under the mast (+X is the left side, +Z the nose).
// A seated pilot's eye: seat 0.95 m up, eye about 0.75 m above it.
export const PILOT_EYE = Object.freeze({x: -0.33, y: 1.70, z: 1.10});

// A point in the helicopter's own frame (model axes) turned into the world
// with the same attitude the scene draws: roll, then pitch, then heading
// (three.js Euler order 'YXZ').
export function heliToWorld(h, {x, y, z}) {
  const cr = Math.cos(h.roll), sr = Math.sin(h.roll), cp = Math.cos(h.pitch), sp = Math.sin(h.pitch);
  const ch = Math.cos(h.heading), sh = Math.sin(h.heading);
  const x1 = x * cr - y * sr, y1 = x * sr + y * cr, z1 = z;
  const y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
  return {x: x1 * ch + z2 * sh, y: y2, z: -x1 * sh + z2 * ch};
}

export function heliCameraPose(view, index = 0, gear) {
  const h = view?.heli;
  if (!h) return null;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const load = view.load?.hooked ? view.load : null;
  const views = cameraViewsFor(gear), count = views.length;
  const name = views[((index % count) + count) % count];
  if (name === 'nose') {
    // A steady camera on the nose: it turns with the heading but not with the
    // pitch or the roll, and looks along the horizon.
    const position = {x: h.x + fwdX * 3, y: h.y + 0.4, z: h.z + fwdZ * 3};
    return {name, fov: 62, position, target: {x: position.x + fwdX * 40, y: position.y, z: position.z + fwdZ * 40}};
  }
  if (name === 'cockpit') {
    // The eye and its gaze turn with the whole helicopter, so the seat
    // stays inside the cabin in any bank or flare.
    const offset = heliToWorld(h, PILOT_EYE), ahead = heliToWorld(h, {x: 0, y: 0, z: 40});
    const eye = {x: h.x + offset.x, y: h.y + offset.y, z: h.z + offset.z};
    return {name, fov: 70, position: eye,
      // Nearly level (about 4 degrees down) so the panel stays along the bottom.
      target: {x: eye.x + ahead.x, y: eye.y + ahead.y - 2.8, z: eye.z + ahead.z}};
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
