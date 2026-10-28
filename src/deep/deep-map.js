// DEEP-EXPLORER: read-only cartographer's chart.
import {createZoneFloor} from './zone-floor.js';
import {chartCells, chartHas, chartPercent, CHART_CELL, chartFrame} from './deep-chart.js';
import {createLog} from './deep-log.js';
import {createSirena} from './deep-sirena.js';
// DEEP-SHALLOWS-FIX (Kyle, 28 October 2026: the map seemed left-right opposite of how we
// drive). A north-up map turns every left and right round whenever the car is heading
// south, and the dive's first leg heads south. So the chart now turns with the car by
// default: the car sits near the bottom of the panel pointing up, the sea swings round
// it, and left and right on the chart are always left and right on the screen. The
// whole coast, north up, is one button away.
export const MAP_WIDTH = 400, MAP_HEIGHT = 250;
export const HEADING_UP_ZOOM = 2.4;               // the turning view shows about 1.7 km by 1 km
export const HEADING_UP_CAR = Object.freeze({ x: 200, y: 185 });
// Where a point of the chart lands on the panel. `data` is deepMapData's answer.
export function mapScreen(data, point) {
  if (!data.headingUp) return { x: point.x, y: point.y };
  // The panel rotates by the arrow's own angle, taken back off: the arrow ends up pointing up.
  const turn = -data.car.heading, cos = Math.cos(turn), sin = Math.sin(turn);
  const dx = (point.x - data.car.x) * HEADING_UP_ZOOM, dy = (point.y - data.car.y) * HEADING_UP_ZOOM;
  return { x: HEADING_UP_CAR.x + dx * cos - dy * sin, y: HEADING_UP_CAR.y + dx * sin + dy * cos };
}
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
    return {...cell, centre: project(cell), radius: CHART_CELL * scale, polygon: [[-half,-half],[half,-half],[half,half],[-half,half]]
      .map(([x,z]) => project(frame.world(local.x+x,local.z+z)))};
  });
  return { cells, project, loop: points.map(project), ramp: project(points[0]),
    places: zone.places.map(p => ({ id: p.id, name: p.name,
      ...project(points[Math.floor((p.fromIndex +
        ((p.toIndex - p.fromIndex + points.length) % points.length) / 2)) % points.length]) })) };
}

export function deepMapData(geometry, zone, car, { places = [], elapsedSec = 0, requested = false, save = {}, charted = save.charted?.[zone.id] || '', headingUp = true } = {}) {
  const ramp = zone.trail[0], dx = ramp.x - car.x, dz = ramp.z - car.z;
  const bearing = Math.atan2(dx, dz);
  // DEEP-EXPLORER: only saved finds get pins, at their authored world spots.
  const log = createLog(zone, save, {enabled:true}), sirena = createSirena(zone, save, {enabled:true});
  const pins = [
    ...log.spots.filter(p => log.logged.has(p.creature)).map(p => ({...p, kind:'life', label:p.creature})),
    ...log.pearls.filter(p => log.found.has(p.pearl)).map(p => ({...p, kind:'pearl', label:p.pearl})),
    ...sirena.finds.filter(p => sirena.raised.includes(p.id)).map(p => ({...p, kind:p.id==='sirena-badge'?'badge':'part', label:p.id})),
  ].map(p => ({...p, ...geometry.project(p)}));
  return { headingUp, pins, charted, chartGeometry: geometry, percent:chartPercent(charted, geometry.cells),
    cells:geometry.cells.filter(c => chartHas(charted,c.id)), loop: geometry.loop, ramp: geometry.ramp,
    places: geometry.places.filter(p => places.includes(p.id)),
    car: { ...geometry.project(car), heading: -car.heading },
    home: { distance: Math.hypot(dx, dz), relative: Math.atan2(Math.sin(bearing - car.heading), Math.cos(bearing - car.heading)),
      visible: requested || elapsedSec >= 60 } };
}

// DEEP-EXPLORER: blend survey samples into ink washes, then feather the
// revealed boundary. The saved grid never appears as visible square tiles.
const chartLayers = new WeakMap();
function chartWash(ctx, data) {
  const canvas = ctx.canvas, doc = canvas?.ownerDocument;
  if (!doc?.createElement) return; // headless HUD doubles have no drawing surface
  let cached = chartLayers.get(canvas);
  if (cached?.bits === data.charted && cached.geometry === data.chartGeometry) { ctx.drawImage(cached.image, 0, 0); return; }
  const make = () => { const c = doc.createElement('canvas'); c.width=400; c.height=250; return c; };
  const mask = make(), ink = make(), m = mask.getContext('2d'), g = ink.getContext('2d');
  m.filter = 'blur(2px)'; m.fillStyle = '#fff';
  for (const cell of data.cells) {
    m.beginPath(); m.arc(cell.centre.x, cell.centre.y, cell.radius * .78, 0, Math.PI*2); m.fill();
  }
  // A soft contour around the union of samples, including holes and islands.
  const pixels = m.getImageData(0,0,400,250), a = pixels.data;
  for (let i=0;i<a.length;i+=4) a[i+3]=Math.max(0,Math.min(255,(a[i+3]-95)*4));
  m.putImageData(pixels,0,0);
  g.fillStyle='#e0d2ac'; g.fillRect(0,0,400,250);
  g.filter='blur(5px)';
  for (const cell of data.cells) {
    const p=cell.centre;
    g.fillStyle=cell.rock>.5?'#92978e':cell.kelp>.5?'#a9b18a':cell.depth>18?'#7c9ba9':cell.depth>12?'#bac8bd':'#e0d2ac';
    g.beginPath();g.arc(p.x,p.y,cell.radius*.9,0,Math.PI*2);g.fill();
  }
  g.filter='none'; g.lineWidth=.55; g.strokeStyle='#52664988';
  for (const cell of data.cells) if (cell.kelp>.5) {
    const {x,y}=cell.centre;
    // Fine curved pen strokes rather than a flat green block.
    for (let k=-2;k<=2;k+=2) { g.beginPath();g.moveTo(x+k-2,y+3);g.quadraticCurveTo(x+k+2,y,x+k,y-3);g.stroke(); }
  }
  g.beginPath();data.loop.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();
  g.strokeStyle='#384f54';g.lineWidth=1.2;g.setLineDash([4,3]);g.stroke();g.setLineDash([]);
  g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);g.globalCompositeOperation='source-over';
  // Thin ink coastline follows the smooth reveal contour, never cell edges.
  const coast=make(), c=coast.getContext('2d'), edge=c.createImageData(400,250), e=edge.data;
  for(let y=1;y<249;y++)for(let x=1;x<399;x++) {
    const i=(y*400+x)*4, alpha=a[i+3];
    if(alpha>100 && [i-4,i+4,i-1600,i+1600].some(n=>a[n+3]<=100)) {
      e[i]=52;e[i+1]=72;e[i+2]=75;e[i+3]=210;
    }
  }
  c.putImageData(edge,0,0);g.drawImage(coast,0,0);
  chartLayers.set(canvas,{bits:data.charted,geometry:data.chartGeometry,image:ink});ctx.drawImage(ink,0,0);
}
export function drawDeepMap(ctx, data) {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.fillStyle = '#102a35'; ctx.fillRect(0,0,MAP_WIDTH,MAP_HEIGHT);
  // DEEP-SHALLOWS-FIX: the turning view moves the whole chart; words and stamps are
  // set back upright and at their normal size at the place they belong.
  const up = data.headingUp, turn = up ? -data.car.heading : 0, zoom = up ? HEADING_UP_ZOOM : 1;
  ctx.save();
  if (up) { ctx.translate(HEADING_UP_CAR.x, HEADING_UP_CAR.y); ctx.rotate(turn); ctx.scale(zoom, zoom); ctx.translate(-data.car.x, -data.car.y); }
  chartWash(ctx,data);
  const upright = (x, y, draw) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-turn); ctx.scale(1 / zoom, 1 / zoom); draw(); ctx.restore(); };
  ctx.font = 'italic 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0c7';
  for (const p of data.places) upright(p.x, p.y, () => ctx.fillText(p.name, 0, -12));
  upright(data.ramp.x, data.ramp.y, () => {
    ctx.fillStyle = '#e5be78'; ctx.fillRect(-5, -5, 10, 10);
    ctx.font = 'italic 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('RAMP', 0, 23);
  });
  // DEEP-EXPLORER: distinct ink stamps, with a legend in Ana's panel.
  const stamps = {life:'\u25c6', pearl:'\u25cf', badge:'\u2605', part:'\u2691'};
  ctx.font = 'bold 13px Segoe UI, sans-serif'; ctx.textAlign = 'center';
  for (const pin of data.pins) upright(pin.x, pin.y, () => {
    ctx.strokeStyle='#13282d'; ctx.lineWidth=3; ctx.strokeText(stamps[pin.kind],0,0);
    ctx.fillStyle='#ffe1a0'; ctx.fillText(stamps[pin.kind],0,0);
  });
  ctx.save(); ctx.translate(data.car.x, data.car.y); ctx.rotate(data.car.heading); ctx.scale(1 / zoom, 1 / zoom);
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath();
  ctx.fillStyle = '#fff1d0'; ctx.fill(); ctx.strokeStyle = '#ed9264'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  ctx.restore();
  // North: a fixed note when the chart is north up, a small compass that swings when it turns.
  ctx.fillStyle = '#8bb4b3'; ctx.font = 'bold 13px Segoe UI, sans-serif';
  if (!up) { ctx.textAlign = 'right'; ctx.fillText('N ↑', 390, 20); }
  else {
    const dial = { x: 368, y: 34 }, north = { x: dial.x - 17 * Math.sin(data.car.heading), y: dial.y - 17 * Math.cos(data.car.heading) };
    ctx.strokeStyle = '#8bb4b366'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dial.x, dial.y, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', north.x, north.y); ctx.textBaseline = 'alphabetic';
  }
}
