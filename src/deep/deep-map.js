// Read-only dive chart. Geometry is cached by the HUD for the current zone.
export function deepMapGeometry(zone) {
  const points = zone.trail;
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minZ = Math.min(...points.map(p => p.z)), maxZ = Math.max(...points.map(p => p.z));
  const scale = Math.min(340 / Math.max(1, maxX - minX), 190 / Math.max(1, maxZ - minZ));
  const project = p => ({ x: 200 - (p.x - (minX + maxX) / 2) * scale,
    y: 125 - (p.z - (minZ + maxZ) / 2) * scale });
  return { project, loop: points.map(project), ramp: project(points[0]),
    places: zone.places.map(p => ({ id: p.id, name: p.name,
      ...project(points[Math.floor((p.fromIndex +
        ((p.toIndex - p.fromIndex + points.length) % points.length) / 2)) % points.length]) })) };
}

export function deepMapData(geometry, zone, car, { places = [], elapsedSec = 0, requested = false } = {}) {
  const ramp = zone.trail[0], dx = ramp.x - car.x, dz = ramp.z - car.z;
  const bearing = Math.atan2(dx, dz);
  return { loop: geometry.loop, ramp: geometry.ramp,
    places: geometry.places.filter(p => places.includes(p.id)),
    car: { ...geometry.project(car), heading: -car.heading },
    home: { distance: Math.hypot(dx, dz), relative: Math.atan2(Math.sin(bearing - car.heading), Math.cos(bearing - car.heading)),
      visible: requested || elapsedSec >= 60 } };
}

export function drawDeepMap(ctx, data) {
  ctx.clearRect(0, 0, 400, 250);
  ctx.beginPath();
  data.loop.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath(); ctx.strokeStyle = '#83b7a9'; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = '14px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#d5e7da';
  for (const p of data.places) ctx.fillText(p.name, p.x, p.y - 12);
  ctx.fillStyle = '#e5be78'; ctx.fillRect(data.ramp.x - 5, data.ramp.y - 5, 10, 10);
  ctx.fillText('RAMP', data.ramp.x, data.ramp.y + 23);
  ctx.fillStyle = '#8bb4b3'; ctx.textAlign = 'right'; ctx.fillText('N ↑', 390, 20);
  ctx.save(); ctx.translate(data.car.x, data.car.y); ctx.rotate(data.car.heading);
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath();
  ctx.fillStyle = '#fff1d0'; ctx.fill(); ctx.strokeStyle = '#ed9264'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
