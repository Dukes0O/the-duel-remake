// DEEP-EXPLORER: read-only cartographer's chart.
import {createZoneFloor} from './zone-floor.js';
import {chartCells, chartHas, chartPercent, CHART_CELL, chartFrame} from './deep-chart.js';
import {createLog} from './deep-log.js';
import {createSirena} from './deep-sirena.js';
// Read-only dive chart. Geometry is cached by the HUD for the current zone.
export function deepMapGeometry(zone) {
  const points = zone.trail;
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minZ = Math.min(...points.map(p => p.z)), maxZ = Math.max(...points.map(p => p.z));
  const scale = Math.min(340 / Math.max(1, maxX - minX + 180), 190 / Math.max(1, maxZ - minZ + 180));
  const project = p => ({ x: 200 - (p.x - (minX + maxX) / 2) * scale,
    y: 125 - (p.z - (minZ + maxZ) / 2) * scale });
  // DEEP-EXPLORER: cache survey cells and their ink polygons once per dive.
  const frame = chartFrame(zone), cells = chartCells(zone, createZoneFloor(zone)).map(cell => {
    const local = frame.local(cell), half = CHART_CELL / 2;
    return {...cell, polygon: [[-half,-half],[half,-half],[half,half],[-half,half]]
      .map(([x,z]) => project(frame.world(local.x+x,local.z+z)))};
  });
  return { cells, project, loop: points.map(project), ramp: project(points[0]),
    places: zone.places.map(p => ({ id: p.id, name: p.name,
      ...project(points[Math.floor((p.fromIndex +
        ((p.toIndex - p.fromIndex + points.length) % points.length) / 2)) % points.length]) })) };
}

export function deepMapData(geometry, zone, car, { places = [], elapsedSec = 0, requested = false, save = {}, charted = save.charted?.[zone.id] || '' } = {}) {
  const ramp = zone.trail[0], dx = ramp.x - car.x, dz = ramp.z - car.z;
  const bearing = Math.atan2(dx, dz);
  // DEEP-EXPLORER: only saved finds get pins, at their authored world spots.
  const log = createLog(zone, save, {enabled:true}), sirena = createSirena(zone, save, {enabled:true});
  const pins = [
    ...log.spots.filter(p => log.logged.has(p.creature)).map(p => ({...p, kind:'life', label:p.creature})),
    ...log.pearls.filter(p => log.found.has(p.pearl)).map(p => ({...p, kind:'pearl', label:p.pearl})),
    ...sirena.finds.filter(p => sirena.raised.includes(p.id)).map(p => ({...p, kind:p.id==='sirena-badge'?'badge':'part', label:p.id})),
  ].map(p => ({...p, ...geometry.project(p)}));
  return { pins, percent:chartPercent(charted, geometry.cells),
    cells:geometry.cells.filter(c => chartHas(charted,c.id)), loop: geometry.loop, ramp: geometry.ramp,
    places: geometry.places.filter(p => places.includes(p.id)),
    car: { ...geometry.project(car), heading: -car.heading },
    home: { distance: Math.hypot(dx, dz), relative: Math.atan2(Math.sin(bearing - car.heading), Math.cos(bearing - car.heading)),
      visible: requested || elapsedSec >= 60 } };
}

export function drawDeepMap(ctx, data) {
  ctx.clearRect(0, 0, 400, 250);
  // DEEP-EXPLORER: parchment is earned as the survey leaves the dark water.
  ctx.fillStyle = '#091b23'; ctx.fillRect(0,0,400,250);
  const polygon = points => { points.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.closePath(); };
  for (const cell of data.cells) {
    ctx.beginPath(); polygon(cell.polygon);
    ctx.fillStyle = cell.rock > .5 ? '#83918a' : cell.kelp > .5 ? '#8caa82' : cell.depth > 18 ? '#7a9ca3' : '#c6c2a0';
    ctx.fill();
  }
  ctx.save(); ctx.beginPath();
  for (const cell of data.cells) polygon(cell.polygon);
  ctx.clip();
  ctx.beginPath();
  data.loop.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath(); ctx.strokeStyle = '#354e51'; ctx.lineWidth = 2; ctx.setLineDash([4,3]); ctx.stroke(); ctx.restore();
  ctx.font = '14px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0c7';
  for (const p of data.places) ctx.fillText(p.name, p.x, p.y - 12);
  ctx.fillStyle = '#e5be78'; ctx.fillRect(data.ramp.x - 5, data.ramp.y - 5, 10, 10);
  ctx.fillText('RAMP', data.ramp.x, data.ramp.y + 23);
  // DEEP-EXPLORER: distinct ink stamps, with a legend in Ana's panel.
  const stamps = {life:'\u25c6', pearl:'\u25cf', badge:'\u2605', part:'\u2691'};
  ctx.font = 'bold 13px Segoe UI, sans-serif';
  for (const pin of data.pins) {
    ctx.strokeStyle='#13282d'; ctx.lineWidth=3; ctx.strokeText(stamps[pin.kind],pin.x,pin.y);
    ctx.fillStyle='#ffe1a0'; ctx.fillText(stamps[pin.kind],pin.x,pin.y);
  }
  ctx.fillStyle = '#8bb4b3'; ctx.textAlign = 'right'; ctx.fillText('N ↑', 390, 20);
  ctx.save(); ctx.translate(data.car.x, data.car.y); ctx.rotate(data.car.heading);
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath();
  ctx.fillStyle = '#fff1d0'; ctx.fill(); ctx.strokeStyle = '#ed9264'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
