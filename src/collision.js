// Continuous 2D contacts. Positions are metres; the normal points out of
// the obstacle toward the moving car. Keeping resolution separate from damage
// means recovery protection never permits driving through solid geometry.
export const CAR_HALF_WIDTH = 1.02;
export const CAR_HALF_LENGTH = 2.35;

export function sweepBox(start, end, halfX, halfZ) {
  const dx = end.x - start.x, dz = end.z - start.z;
  if (Math.abs(start.x) < halfX && Math.abs(start.z) < halfZ) {
    const px = halfX - Math.abs(start.x), pz = halfZ - Math.abs(start.z);
    let axis = px < pz ? 'x' : 'z';
    // If a frame begins overlapped, approach direction disambiguates a
    // frontal hit from the shallower lateral penetration at the car's centre.
    if (Math.abs(dz) > Math.abs(dx) * 1.3 && start.z * dz <= 0 && Math.abs(dz) > 1e-7) axis = 'z';
    else if (Math.abs(dx) > Math.abs(dz) * 1.3 && start.x * dx <= 0 && Math.abs(dx) > 1e-7) axis = 'x';
    const sign = Math.sign(start[axis]) || -Math.sign(axis === 'x' ? dx : dz) || 1;
    return { t: 0, nx: axis === 'x' ? sign : 0, nz: axis === 'z' ? sign : 0,
      penetration: axis === 'x' ? px : pz, inside: true };
  }
  let entry = -Infinity, leave = Infinity, nx = 0, nz = 0;
  for (const [p, v, half, axis] of [[start.x, dx, halfX, 'x'], [start.z, dz, halfZ, 'z']]) {
    if (Math.abs(v) < 1e-9) { if (Math.abs(p) >= half) return null; continue; }
    let near = (-half - p) / v, far = (half - p) / v;
    if (near > far) [near, far] = [far, near];
    if (near > entry) { entry = near; nx = axis === 'x' ? -Math.sign(v) : 0; nz = axis === 'z' ? -Math.sign(v) : 0; }
    leave = Math.min(leave, far);
    if (entry > leave) return null;
  }
  if (entry < 0 || entry > 1 || leave < 0) return null;
  return { t: entry, nx, nz, penetration: 0, inside: false };
}

export function sweepObstacle(start, end, obstacle, carHeading = 0) {
  const reach = Math.hypot(obstacle.halfX, obstacle.halfZ) + CAR_HALF_LENGTH + CAR_HALF_WIDTH;
  if (obstacle.x + reach < Math.min(start.x, end.x) || obstacle.x - reach > Math.max(start.x, end.x)
    || obstacle.z + reach < Math.min(start.z, end.z) || obstacle.z - reach > Math.max(start.z, end.z)) return null;
  const angle = obstacle.heading || 0, cs = Math.cos(angle), sn = Math.sin(angle);
  const local = point => ({ x: (point.x - obstacle.x) * cs - (point.z - obstacle.z) * sn,
    z: (point.x - obstacle.x) * sn + (point.z - obstacle.z) * cs });
  const relative = carHeading - angle, c = Math.abs(Math.cos(relative)), s = Math.abs(Math.sin(relative));
  const sweep = obstacle.shape === 'ellipse' ? sweepEllipse : sweepBox;
  const hit = sweep(local(start), local(end), obstacle.halfX + CAR_HALF_WIDTH * c + CAR_HALF_LENGTH * s,
    obstacle.halfZ + CAR_HALF_LENGTH * c + CAR_HALF_WIDTH * s);
  if (!hit) return null;
  const nx = hit.nx * cs + hit.nz * sn, nz = -hit.nx * sn + hit.nz * cs;
  return { ...hit, nx, nz, obstacle };
}

function sweepEllipse(start, end, radiusX, radiusZ) {
  const dx = end.x - start.x, dz = end.z - start.z;
  const rx2 = radiusX * radiusX, rz2 = radiusZ * radiusZ;
  const c = start.x * start.x / rx2 + start.z * start.z / rz2 - 1;
  if (c < 0) {
    let nx = start.x / rx2, nz = start.z / rz2;
    let length = Math.hypot(nx, nz);
    if (length < 1e-8) { nx = -dx; nz = -dz || 1; length = Math.hypot(nx, nz); }
    nx /= length; nz /= length;
    const a = nx * nx / rx2 + nz * nz / rz2, b = 2 * (start.x * nx / rx2 + start.z * nz / rz2);
    return { t: 0, nx, nz, penetration: (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a), inside: true };
  }
  const a = dx * dx / rx2 + dz * dz / rz2, b = 2 * (start.x * dx / rx2 + start.z * dz / rz2);
  const discriminant = b * b - 4 * a * c;
  if (a < 1e-12 || discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t < 0 || t > 1) return null;
  let nx = (start.x + dx * t) / rx2, nz = (start.z + dz * t) / rz2;
  const length = Math.hypot(nx, nz); nx /= length; nz /= length;
  return { t, nx, nz, penetration: 0, inside: false };
}

export function contactZone(nx, nz, heading = 0) {
  // The normal points toward the car, so its opposite is the contact side.
  const lateral = -nx * Math.cos(heading) + nz * Math.sin(heading);
  const forward = -nx * Math.sin(heading) - nz * Math.cos(heading);
  return Math.abs(forward) >= Math.abs(lateral) ? (forward >= 0 ? 'front' : 'rear') : (lateral >= 0 ? 'left' : 'right');
}

export function segmentCircle(startS, startLateral, endS, endLateral, centerS, centerLateral, radius) {
  const ds = endS - startS, dl = endLateral - startLateral;
  const t = Math.max(0, Math.min(1, ((centerS - startS) * ds + (centerLateral - startLateral) * dl) / Math.max(1e-9, ds * ds + dl * dl)));
  return (startS + ds * t - centerS) ** 2 + (startLateral + dl * t - centerLateral) ** 2 <= radius ** 2;
}
