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

// A box fits through a close opening only if its projections on both pairs of axes overlap
// at the same time. The second sweep is in the car's axes; the returned normal is in the obstacle's.
function orientedCarSweep(start, end, obstacleHit, obstacle, relative, halfWidth, halfLength, width, length) {
  if (!obstacleHit) return null;
  const cos = Math.cos(relative), sin = Math.sin(relative);
  const toCar = p => ({x:p.x * cos - p.z * sin, z:p.x * sin + p.z * cos});
  const a = toCar(start), b = toCar(end);
  const across = halfWidth + obstacle.halfX * Math.abs(cos) + obstacle.halfZ * Math.abs(sin);
  const along = halfLength + obstacle.halfX * Math.abs(sin) + obstacle.halfZ * Math.abs(cos);
  const carHit = sweepBox(a, b, across, along);
  if (!carHit) return null;
  const t = Math.max(obstacleHit.t, carHit.t);
  const outside = (from, to, hx, hz) => Math.abs(from.x + t * (to.x - from.x)) > hx + 1e-8 ||
    Math.abs(from.z + t * (to.z - from.z)) > hz + 1e-8;
  if (outside(start, end, width, length) || outside(a, b, across, along)) return null;
  if (carHit.t < obstacleHit.t || (carHit.t === obstacleHit.t && obstacleHit.penetration <= carHit.penetration)) return obstacleHit;
  return {...carHit, nx:carHit.nx * cos + carHit.nz * sin, nz:-carHit.nx * sin + carHit.nz * cos};
}

export function sweepObstacle(start, end, obstacle, carHeading = 0, dimensions = {}) {
  const halfWidth = dimensions.halfWidth ?? CAR_HALF_WIDTH, halfLength = dimensions.halfLength ?? CAR_HALF_LENGTH;
  const reach = Math.hypot(obstacle.halfX, obstacle.halfZ) + halfLength + halfWidth;
  if (obstacle.x + reach < Math.min(start.x, end.x) || obstacle.x - reach > Math.max(start.x, end.x)
    || obstacle.z + reach < Math.min(start.z, end.z) || obstacle.z - reach > Math.max(start.z, end.z)) return null;
  const angle = obstacle.heading || 0, cs = Math.cos(angle), sn = Math.sin(angle);
  const local = point => ({ x: (point.x - obstacle.x) * cs - (point.z - obstacle.z) * sn,
    z: (point.x - obstacle.x) * sn + (point.z - obstacle.z) * cs });
  const relative = carHeading - angle, c = Math.abs(Math.cos(relative)), s = Math.abs(Math.sin(relative));
  const startLocal = local(start), endLocal = local(end);
  const width = obstacle.halfX + halfWidth * c + halfLength * s, length = obstacle.halfZ + halfLength * c + halfWidth * s;
  // An ellipse meets the car's own turned rectangle (QA-ROUND-SOLID-HEADING); a box keeps its established envelope.
  const sweep = obstacle.shape === 'ellipse'
    ? (from, to, grow = 0) => sweepCarEllipse(from, to, obstacle.halfX, obstacle.halfZ, relative, halfWidth, halfLength, grow)
    : (from, to, grow = 0) => {
      const boxHit = sweepBox(from, to, width + grow, length + grow);
      return obstacle.exactCarCorners ? orientedCarSweep(from, to, boxHit, obstacle, relative, halfWidth, halfLength, width, length) : boxHit;
    };
  let hit = sweep(startLocal, endLocal);
  if (!hit) return null;
  // Grounded cars explicitly retain their historical authored envelopes.
  // Airborne cars, fighters and projectile sweeps use model measurements.
  const modelBounds = dimensions.useModelBounds !== false;
  const minY = (modelBounds ? obstacle.modelMinY : undefined) ?? obstacle.minY ?? obstacle.y;
  const maxY = (modelBounds ? obstacle.modelMaxY : undefined) ?? obstacle.maxY ?? (obstacle.y + obstacle.height);
  if ([start.y, end.y, minY, maxY, dimensions.height].every(Number.isFinite)) {
    // Clip against the time interval where the vehicle and obstacle overlap
    // vertically. This handles both a clear overflight and descent onto a roof.
    const dy = end.y - start.y;
    let entryY = 0, exitY = 1;
    if (Math.abs(dy) < 1e-9) {
      if (start.y > maxY || start.y + dimensions.height < minY) return null;
    } else {
      let near = (minY - dimensions.height - start.y) / dy, far = (maxY - start.y) / dy;
      if (near > far) [near, far] = [far, near];
      entryY = Math.max(0, near); exitY = Math.min(1, far);
      if (entryY > exitY || hit.t > exitY) return null;
    }
    if (entryY > hit.t) {
      const point = { x: startLocal.x + (endLocal.x - startLocal.x) * entryY, z: startLocal.z + (endLocal.z - startLocal.z) * entryY };
      const contact = sweep(point, point, 1e-8);
      if (!contact) return null;
      hit = { ...contact, t: entryY };
    }
  }
  const nx = hit.nx * cs + hit.nz * sn, nz = -hit.nx * sn + hit.nz * cs;
  return { ...hit, nx, nz, obstacle };
}

// The car is a rectangle turned by `relative` in the ellipse's frame. Scaling that frame by 1/radiusX and 1/radiusZ makes the ellipse
// a unit circle and the car a parallelogram; they touch when the car's centre is inside the parallelogram grown by the circle's radius.
// The scaling keeps straight lines and the moment of contact, so the time is exact for round and long ellipses alike. A normal comes back
// through the scaling's transpose, and a starting overlap's depth is measured along that normal in metres.
function sweepCarEllipse(start, end, radiusX, radiusZ, relative, halfWidth, halfLength, grow = 0) {
  const rx = Math.max(radiusX, 1e-6), rz = Math.max(radiusZ, 1e-6), radius = 1 + grow;
  const cos = Math.cos(relative), sin = Math.sin(relative);
  const ux = halfWidth * cos / rx, uz = -halfWidth * sin / rz, vx = halfLength * sin / rx, vz = halfLength * cos / rz;
  const vertices = [[ux + vx, uz + vz], [vx - ux, vz - uz], [-ux - vx, -uz - vz], [ux - vx, uz - vz]];
  const edges = vertices.map(([ax, az], index) => {
    const [bx, bz] = vertices[(index + 1) % 4], ex = bx - ax, ez = bz - az, span = Math.hypot(ex, ez) || 1e-12;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    let nx = ez / span, nz = -ex / span;
    if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    return {ax, az, tx: ex / span, tz: ez / span, span, mx, mz, nx, nz, offset: nx * mx + nz * mz};
  });
  const qx = start.x / rx, qz = start.z / rz, dx = end.x / rx - qx, dz = end.z / rz - qz;
  const toLocal = (nx, nz, depth) => {
    const wx = nx / rx, wz = nz / rz, size = Math.hypot(wx, wz);
    return {nx: wx / size, nz: wz / size, penetration: depth / size};
  };
  const insideBody = edges.every(edge => edge.nx * qx + edge.nz * qz <= edge.offset);
  if (insideBody) {
    let best = null;
    for (const edge of edges) {
      const depth = edge.offset + radius - (edge.nx * qx + edge.nz * qz);
      if (!best || depth < best.depth) best = {depth, nx: edge.nx, nz: edge.nz};
    }
    return {t: 0, ...toLocal(best.nx, best.nz, best.depth), inside: true};
  }
  let nearest = Infinity, px = 0, pz = 0;
  for (const edge of edges) {
    const along = Math.max(0, Math.min(edge.span, (qx - edge.ax) * edge.tx + (qz - edge.az) * edge.tz));
    const cx = edge.ax + edge.tx * along, cz = edge.az + edge.tz * along, gap = Math.hypot(qx - cx, qz - cz);
    if (gap < nearest) { nearest = gap; px = cx; pz = cz; }
  }
  if (nearest < radius) {
    return {t: 0, ...toLocal((qx - px) / nearest, (qz - pz) / nearest, radius - nearest), inside: true};
  }
  const a = dx * dx + dz * dz;
  if (a < 1e-24) return null;
  let best = null;
  for (const edge of edges) {
    const closing = edge.nx * dx + edge.nz * dz;
    if (closing >= 0) continue;
    const t = (edge.offset + radius - (edge.nx * qx + edge.nz * qz)) / closing;
    if (t < 0 || t > 1 || (best && t >= best.t)) continue;
    const along = (qx + dx * t - edge.mx) * edge.tx + (qz + dz * t - edge.mz) * edge.tz;
    if (Math.abs(along) <= edge.span / 2) best = {t, nx: edge.nx, nz: edge.nz};
  }
  for (const [vx0, vz0] of vertices) {
    const ox = qx - vx0, oz = qz - vz0, b = 2 * (ox * dx + oz * dz), c = ox * ox + oz * oz - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) continue;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0 || t > 1 || (best && t >= best.t)) continue;
    best = {t, nx: (ox + dx * t) / radius, nz: (oz + dz * t) / radius};
  }
  if (!best) return null;
  const {nx, nz} = toLocal(best.nx, best.nz, 0);
  return {t: best.t, nx, nz, penetration: 0, inside: false};
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
