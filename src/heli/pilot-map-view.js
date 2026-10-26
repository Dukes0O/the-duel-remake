// The pilot's map screen (docs/PILOT_MAP.md sections 2 and 3, card MAP-VIEW):
// a chart drawn in the page from pilot-map-data.js and the generated course
// outlines. Drawing only, with one action: a click on a place sets the
// destination through the app (which asks the helicopter session, as the
// dispatch board does). It never moves, pauses or fuels the helicopter.
//
// mapModel is plain data for the chart (testable without graphics); drawChart
// paints it on a 2D canvas; createPilotMapUi mounts both in the page.
import traced from '../generated/pilot-map.json' with {type: 'json'};
import {PILOT_MAP, PLACES, placeById, placeOfCourse, fuelPadAt, legFuelKgMap, reachKm, MAP_SHAPES, placeOutline, LEFT_OFF} from './pilot-map-data.js';
import {isCourseUnlocked} from '../course-access.js';
import {isCarUnlocked} from '../progression.js';
import {CARS} from '../config.js';
import {AIR_ONLY_CARS} from './heli-jobs.js';
import {carAt} from './heli-save.js';
import {SECRET_SIGNS, TABLE_ID} from './map-secrets.js';

export const MAP_KEY = 'N';
// The bush pilot's last page (docs/PILOT_MAP.md 5.2), shown as a card on the Table.
export const LOGBOOK_CARD = Object.freeze({
  title: 'THE LOGBOOK · LAST PAGE, 1966',
  text: 'Red car on the bottom off the Pacific cove, plain as day from up here. Nobody believes me.',
});

// A place's destination id: its course id (the stadium is its Monster Arena); the Table is its own.
export const destinationOf = place => place.air ? place.id : place.courses[0];
const placeOfDestination = id => id === TABLE_ID ? placeById(TABLE_ID) : placeOfCourse(id);

const roundKm = value => Math.round(value * 100) / 100;

// Bearing (degrees, north 0, east 90) and distance (km) from one point to another, north is +z.
export function bearingKm(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  return {bearing: (Math.round(Math.atan2(dx, dz) * 180 / Math.PI) + 360) % 360, km: Math.hypot(dx, dz)};
}

// Everything the chart shows, as plain numbers and names.
//   view: the helicopter session's view (app.heliView()); profile: the player's profile with the
//   helicopter's own save; jobs: session.boardJobs(); movingMap: the Lab's moving-map upgrade is owned.
export function mapModel({view, profile = null, jobs = [], movingMap = false} = {}) {
  const destinations = new Set(view?.destinations ?? []);
  const secrets = view?.secrets ?? null;
  const tableSeen = destinations.has(TABLE_ID) || secrets?.table === true;
  const here = view?.courseId ? placeOfDestination(view.courseId) : null;
  const fuelKg = view?.heli?.fuelKg ?? 0;
  const fallen = new Set(view?.fallen ?? []);
  const carsBy = new Map();
  for (const car of AIR_ONLY_CARS) {
    if (!profile || !isCarUnlocked(profile, car)) continue;
    const place = placeOfDestination(carAt(profile, car));
    if (!place || place.air && !tableSeen) continue;
    carsBy.set(place.id, [...(carsBy.get(place.id) ?? []), {id: car, name: CARS[car]?.name ?? car}]);
  }
  const jobsBy = new Map();
  const jobLines = [];
  for (const job of jobs) {
    if (job.own || job.done || !job.from || !job.to) continue;
    const from = placeOfDestination(job.from), to = placeOfDestination(job.to);
    if (!from || !to) continue;
    jobLines.push({id: job.id, from: from.id, to: to.id, pay: job.payNow ?? job.pay ?? 0, taken: job.taken === true, fromPoint: from.drawAt, toPoint: to.drawAt});
    for (const id of new Set([from.id, to.id])) jobsBy.set(id, (jobsBy.get(id) ?? 0) + 1);
  }
  const heliPlace = here ?? placeById('tremblant-woods');
  const heliPoint = view?.heli
    ? {x: roundKm(heliPlace.drawAt.x + view.heli.x / 1000), z: roundKm(heliPlace.drawAt.z + view.heli.z / 1000), heading: view.heli.heading ?? 0}
    : null;
  const places = PLACES.filter(place => !place.air || tableSeen).map(place => {
    const id = destinationOf(place);
    const isHere = here?.id === place.id;
    const owned = place.air ? true : place.courses.some(course => profile ? isCourseUnlocked(profile, course) : false);
    const burnt = place.courses.some(course => fallen.has(course));
    const legKg = !isHere && here ? legFuelKgMap(here.id, place.id) : null;
    const pad = fuelPadAt(place.id);
    return {
      id: place.id, destination: id, name: place.air && secrets?.table !== true ? '?' : place.name, region: place.region,
      x: place.drawAt.x, z: place.drawAt.z, air: place.air === true,
      state: burnt ? 'burnt' : owned ? 'owned' : 'grey',
      isHere, isDestination: destinations.has(id), noLanding: LEFT_OFF.includes(place.id),
      chosen: view?.destination === id, legKg, reachable: legKg === null || legKg <= fuelKg,
      pad: pad ? {price: pad.pricePerKg, name: pad.name} : null,
      cars: carsBy.get(place.id) ?? [], jobs: jobsBy.get(place.id) ?? 0,
    };
  });
  const found = (secrets?.found ?? []).map(id => SECRET_SIGNS.find(sign => sign.id === id)).filter(Boolean)
    .map((sign, index) => ({id: sign.id, name: sign.name, place: placeOfCourse(sign.course)?.id ?? null, index}));
  return {
    places, jobLines, heli: heliPoint, here: here?.id ?? null, fuelKg,
    reachKm: heliPoint ? Math.max(0, roundKm(reachKm(fuelKg))) : 0,
    found, table: tableSeen ? (secrets?.table === true ? 'found' : 'seen') : null,
    movingMap: movingMap === true, destination: view?.destination ?? null,
  };
}

// The place nearest to a point in km, within a click's reach (at least 0.7 km, or 14 pixels).
export function hitPlace(model, point, pxPerKm = 12) {
  const reach = Math.max(0.7, 14 / pxPerKm);
  let best = null;
  for (const place of model.places) {
    const distance = Math.hypot(place.x - point.x, place.z - point.z);
    if (distance <= reach && (!best || distance < best.distance)) best = {place, distance};
  }
  return best?.place ?? null;
}

// What a place says when pointed at (the moving map adds bearing and distance from the helicopter).
export function placeNote(model, place) {
  if (!place) return '';
  const parts = [place.name];
  if (place.state === 'grey') parts.push('not owned: you can land, not race');
  if (place.state === 'burnt') parts.push('burnt');
  if (place.noLanding) parts.push('no landing zone');
  if (place.pad) parts.push(`fuel ${place.pad.price} credits a kg`);
  if (place.legKg !== null) parts.push(`${place.legKg} kg${place.reachable ? '' : ' (beyond your tank)'}`);
  if (place.cars.length) parts.push(place.cars.map(car => car.name).join(', '));
  if (model.movingMap && model.heli) {
    const {bearing, km} = bearingKm(model.heli, place);
    parts.push(`${String(bearing).padStart(3, '0')}° ${km.toFixed(1)} km`);
  }
  return parts.join(' · ');
}

// ---- Drawing -----------------------------------------------------------------------------------------

const INK = '#2b2118', PAPER = '#efe6cf', SEA = '#b9d3df', SEA_LINE = '#86a9bc', GREY = '#8d8a80';
const TINT = {forest: 'rgba(104,142,84,.40)', desert: 'rgba(216,186,120,.55)', city: 'rgba(140,132,122,.38)', lake: SEA, mesa: 'rgba(190,110,70,.55)'};

// The chart's frame in pixels: north up, one scale for both ways, centred.
export function chartFrame(width, height) {
  const b = PILOT_MAP.bounds, spanX = b.maxX - b.minX, spanZ = b.maxZ - b.minZ;
  const k = Math.min(width / spanX, height / spanZ);
  const ox = (width - spanX * k) / 2, oy = (height - spanZ * k) / 2;
  return {k, project: (x, z) => [ox + (x - b.minX) * k, oy + (b.maxZ - z) * k],
    unproject: (px, py) => ({x: b.minX + (px - ox) / k, z: b.maxZ - (py - oy) / k})};
}

function path(ctx, project, points, closed = true) {
  ctx.beginPath();
  points.forEach(([x, z], i) => { const [px, py] = project(x, z); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
  if (closed) ctx.closePath();
}

// Canvas-pixel boxes, including padding. Keep the measured font identical to
// the one used to draw, so the layout also works when all courses are owned.
export function chartLabels(ctx, model, width, height) {
  const {k, project} = chartFrame(width, height), boxes = [];
  for (const place of [...model.places].sort((a, b) => b.z - a.z || a.id.localeCompare(b.id))) {
    const [px, py] = project(place.x, place.z);
    const font = `${place.state === 'owned' || place.air ? 'bold ' : ''}${place.name === '?' ? 22 : 11}px Georgia, serif`;
    ctx.font = font;
    const w = ctx.measureText(place.name).width + 8, h = place.name === '?' ? 28 : 17;
    const x = Math.max(w / 2 + 4, Math.min(width - w / 2 - 4, px));
    const preferred = py + k * .9 + 12;
    // Search above and below the preferred row, nearest first. The entire
    // chart is available; unlike the old six attempts, a clash never wins.
    for (let step = 0; step < Math.ceil(height / h) * 2; step++) {
      const y = preferred + (step % 2 ? -1 : 1) * Math.ceil(step / 2) * h;
      if (y - h / 2 < 4 || y + h / 2 > height - 4) continue;
      if (boxes.some(b => Math.abs(b.x - x) < (b.w + w) / 2 && Math.abs(b.y - y) < (b.h + h) / 2)) continue;
      boxes.push({id: place.id, x, y, w, h, px, py, font});
      break;
    }
  }
  return boxes;
}

export function drawChart(ctx, model, {width, height, hover = null} = {}) {
  const {k, project} = chartFrame(width, height);
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = SEA; ctx.fillRect(0, 0, width, height);
  // The sea's depth lines, then the land.
  ctx.lineWidth = 1; ctx.strokeStyle = SEA_LINE;
  for (const depth of [...MAP_SHAPES.seaDepths].reverse()) { path(ctx, project, depth.points); ctx.stroke(); }
  path(ctx, project, MAP_SHAPES.land); ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  // Regions: tints, and thin contours with their heights.
  ctx.font = `italic ${Math.max(10, k * 0.55)}px Georgia, serif`; ctx.textAlign = 'center';
  for (const region of MAP_SHAPES.regions) {
    path(ctx, project, region.points);
    if (region.kind === 'mountain') {
      ctx.strokeStyle = 'rgba(122,84,52,.7)'; ctx.lineWidth = 0.9; ctx.stroke();
      const top = region.points.reduce((a, b) => b[1] > a[1] ? b : a), [tx, ty] = project(top[0], top[1]);
      ctx.fillStyle = 'rgba(100,66,40,.85)'; ctx.fillText(`${region.metres} m`, tx, ty + 11);
    } else { ctx.fillStyle = TINT[region.kind] ?? 'transparent'; ctx.fill(); if (region.kind === 'lake') { ctx.strokeStyle = SEA_LINE; ctx.lineWidth = 1; ctx.stroke(); } }
  }
  ctx.strokeStyle = '#6f9bb3'; ctx.lineWidth = 1.3;
  for (const river of MAP_SHAPES.rivers) { path(ctx, project, river.points, false); ctx.stroke(); }
  // The roads between the towns.
  ctx.strokeStyle = 'rgba(43,33,24,.55)'; ctx.lineWidth = 0.8; ctx.setLineDash([4, 3]);
  for (const [from, to] of MAP_SHAPES.roads) {
    const a = placeById(from), b = placeById(to);
    if (!a || !b) continue;
    path(ctx, project, [[a.drawAt.x, a.drawAt.z], [b.drawAt.x, b.drawAt.z]], false); ctx.stroke();
  }
  ctx.setLineDash([]);
  // The moving map's grid (the Lab upgrade): a line every 5 km, with its distance from the helicopter's frame.
  if (model.movingMap) {
    const b = PILOT_MAP.bounds;
    ctx.strokeStyle = 'rgba(43,33,24,.22)'; ctx.lineWidth = 0.7; ctx.fillStyle = 'rgba(43,33,24,.6)'; ctx.font = '10px Georgia, serif';
    for (let x = Math.ceil(b.minX / 5) * 5; x <= b.maxX; x += 5) { path(ctx, project, [[x, b.minZ], [x, b.maxZ]], false); ctx.stroke(); }
    for (let z = Math.ceil(b.minZ / 5) * 5; z <= b.maxZ; z += 5) { path(ctx, project, [[b.minX, z], [b.maxX, z]], false); ctx.stroke(); }
  }
  // Course outlines: ink if owned, grey if not, black if burnt.
  const byId = new Map(model.places.map(place => [place.id, place]));
  for (const place of PLACES) {
    const shown = byId.get(place.id), outline = placeOutline(traced, place.id);
    if (!shown || !outline) continue;
    path(ctx, project, outline.points, outline.closed);
    ctx.lineJoin = 'round';
    if (shown.state === 'burnt') { ctx.strokeStyle = '#000'; ctx.lineWidth = 3.2; }
    else { ctx.strokeStyle = shown.state === 'owned' ? INK : GREY; ctx.lineWidth = shown.state === 'owned' ? 2 : 1.6; }
    ctx.stroke();
  }
  // The tank's reach, a faint ring about the helicopter.
  if (model.heli && model.reachKm > 0) {
    const [hx, hy] = project(model.heli.x, model.heli.z);
    ctx.beginPath(); ctx.arc(hx, hy, model.reachKm * k, 0, Math.PI * 2);
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(176,60,40,.45)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
  }
  // Today's jobs: a line from pick-up to drop-off, heavier for the one in hand.
  for (const job of model.jobLines) {
    const [ax, ay] = project(job.fromPoint.x, job.fromPoint.z), [bx, by] = project(job.toPoint.x, job.toPoint.z);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    ctx.setLineDash(job.taken ? [] : [2, 5]); ctx.strokeStyle = job.taken ? 'rgba(160,50,30,.9)' : 'rgba(160,50,30,.5)'; ctx.lineWidth = job.taken ? 2 : 1.2; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(160,50,30,.9)'; ctx.font = '10px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${job.pay} cr`, (ax + bx) / 2, (ay + by) / 2 - 3);
  }
  // Places: names, pump signs, special cars, found secrets, the "?". Names are placed north to south, and one that would
  // run into a name already written moves down a line (or up) until it is clear.
  ctx.textAlign = 'center';
  const labels = new Map(chartLabels(ctx, model, width, height).map(box => [box.id, box]));
  [...model.places].sort((a, b) => b.z - a.z).forEach(place => {
    const [px, py] = project(place.x, place.z);
    const label = labels.get(place.id);
    if (!label) return;
    ctx.beginPath(); ctx.moveTo(px, py + 3); ctx.lineTo(label.x, label.y - label.h / 2);
    ctx.strokeStyle = 'rgba(43,33,24,.55)'; ctx.lineWidth = .8; ctx.stroke();
    ctx.font = label.font;
    ctx.fillStyle = place.state === 'grey' ? GREY : INK;
    ctx.fillText(place.name, label.x, label.y + 4);
    if (place.air) {
      ctx.beginPath(); ctx.ellipse(px, py, 9, 7, 0, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.stroke();
      return;
    }
    if (place.pad) {
      ctx.fillStyle = INK; ctx.fillRect(px + 10, py - 20, 7, 11); ctx.fillRect(px + 17, py - 17, 4, 2);
      ctx.font = 'bold 10px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillText(place.pad.price.toFixed(1), px + 22, py - 11); ctx.textAlign = 'center';
    }
    place.cars.forEach((car, i) => {
      ctx.fillStyle = '#254a78'; ctx.fillRect(px - 22 - i * 9, py - 12, 7, 5);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 6px Georgia, serif'; ctx.fillText(car.name[0] ?? '', px - 18.5 - i * 9, py - 8);
    });
    if (place.chosen || place.isHere) {
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.strokeStyle = place.chosen ? '#b03c28' : '#254a78'; ctx.lineWidth = 2; ctx.stroke();
    }
  });
  // Found secret courses: a pin by their course.
  for (const secret of model.found) {
    const place = byId.get(secret.place);
    if (!place) continue;
    const [px, py] = project(place.x, place.z), dx = 14 + secret.index * 10;
    ctx.fillStyle = '#b03c28'; ctx.font = 'bold 12px Georgia, serif'; ctx.fillText('★', px + dx, py + 14);
  }
  // The helicopter: a small triangle pointing the way it faces.
  if (model.heli) {
    const [hx, hy] = project(model.heli.x, model.heli.z);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(model.heli.heading);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fillStyle = '#254a78'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  }
  // The scale bar (5 km) and the north arrow.
  const b = PILOT_MAP.bounds, [sx, sy] = project(b.minX + 2, b.minZ + 2);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 5 * k, sy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4); ctx.moveTo(sx + 5 * k, sy - 4); ctx.lineTo(sx + 5 * k, sy + 4); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = '11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('5 km', sx + 2.5 * k, sy - 8);
  const [nx, ny] = project(b.maxX - 2.5, b.maxZ - 4);
  ctx.beginPath(); ctx.moveTo(nx, ny - 14); ctx.lineTo(nx + 6, ny + 8); ctx.lineTo(nx, ny + 3); ctx.lineTo(nx - 6, ny + 8); ctx.closePath(); ctx.fill();
  ctx.font = 'bold 12px Georgia, serif'; ctx.fillText('N', nx, ny - 18);
  // The moving map: a line from the helicopter to the place pointed at.
  if (model.movingMap && model.heli && hover) {
    const [hx, hy] = project(model.heli.x, model.heli.z), [qx, qy] = project(hover.x, hover.z);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(qx, qy); ctx.strokeStyle = 'rgba(37,74,120,.8)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

// ---- The screen ----------------------------------------------------------------------------------------

const escape = text => String(text ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const SIZE = 900;

// The map's panel: shown while app.heliMapOpen is true (the app owns that flag). Clicking a place
// sets the destination through app.heliMapPick. The logbook card shows on the Table once it is found.
export function createPilotMapUi({host, app}) {
  const doc = host.ownerDocument, section = doc.createElement('section');
  section.className = 'pilot-map'; section.hidden = true;
  section.setAttribute('role', 'dialog'); section.setAttribute('aria-label', "Pilot's map");
  section.innerHTML = `<header><b>PILOT'S MAP</b><span class="pilot-map-hint">Click a place to fly there · <kbd>${MAP_KEY}</kbd> or <kbd>ESC</kbd> to close</span>
    <button type="button" class="pilot-map-close" data-pilot-map="close">CLOSE</button></header>
    <canvas class="pilot-map-canvas" width="${SIZE}" height="${SIZE}" aria-label="Chart of the region"></canvas>
    <p class="pilot-map-info" role="status"></p>
    <ul class="pilot-map-legend"><li><i class="owned"></i> owned</li><li><i class="grey"></i> not owned</li><li><i class="burnt"></i> burnt</li>
      <li><i class="pump"></i> fuel, credits a kg</li><li><i class="reach"></i> your tank's reach</li><li><i class="job"></i> today's jobs</li></ul>`;
  host.append(section);
  const canvas = section.querySelector('canvas'), info = section.querySelector('.pilot-map-info');
  const ctx = canvas.getContext?.('2d') ?? null;
  const card = doc.createElement('aside');
  card.className = 'pilot-map-logbook'; card.hidden = true;
  card.innerHTML = `<b>${escape(LOGBOOK_CARD.title)}</b><p>“${escape(LOGBOOK_CARD.text)}”</p>`;
  host.append(card);
  let model = null, hover = null, lastKey = null, message = '', disposed = false;
  const pointOf = event => {
    const rect = canvas.getBoundingClientRect(), px = (event.clientX - rect.left) * SIZE / Math.max(1, rect.width), py = (event.clientY - rect.top) * SIZE / Math.max(1, rect.height);
    const frame = chartFrame(SIZE, SIZE);
    return {point: frame.unproject(px, py), pxPerKm: frame.k};
  };
  const onClick = event => {
    if (event.target.closest?.('[data-pilot-map="close"]')) { app.setHeliMap?.(false); return; }
    if (event.target !== canvas || !model) return;
    const {point, pxPerKm} = pointOf(event), place = hitPlace(model, point, pxPerKm);
    if (!place) return;
    if (!place.isDestination || place.isHere) {
      message = place.isHere ? `You are at ${place.name}.` : place.noLanding ? `${place.name}: the search found no landing zone, so it is not a destination.` : `${place.name} is not a destination yet.`;
    } else if (app.heliMapPick?.(place.destination)) {
      message = `Destination: ${place.name}${place.legKg !== null ? ` · ${place.legKg} kg of fuel` : ''}${place.reachable ? '' : ' · more than your tank holds'}. Fly clear of the area and press ENTER to cruise.`;
    } else message = 'You can set a destination while flying.';
    lastKey = null;
  };
  const onMove = event => {
    if (!model) return;
    const {point, pxPerKm} = pointOf(event), place = hitPlace(model, point, pxPerKm);
    hover = place ?? null;
    const text = place ? placeNote(model, place) : message;
    if (info.textContent !== text) info.textContent = text;
    lastKey = null;
  };
  section.addEventListener('click', onClick);
  canvas.addEventListener('pointermove', onMove);
  return {
    // Called every frame from the helicopter panel; draws only when something on the chart changed.
    update(view) {
      if (disposed) return;
      const open = app.heliMapOpen === true && !!view && view.destinations !== undefined;
      section.hidden = !open;
      // The Table's logbook, once found, shows as a card while the helicopter is on the Table.
      card.hidden = !(view?.courseId === TABLE_ID && view?.secrets?.table === true);
      if (!open) { lastKey = null; hover = null; return; }
      const session = app.heliSession;
      const profile = {...app.profile, ...(session?.profile?.heli ? {heli: session.profile.heli} : {})};
      model = mapModel({view, profile, jobs: session?.boardJobs?.() ?? [], movingMap: app.heliMovingMap?.() === true});
      const key = JSON.stringify([model, hover?.id ?? null]);
      if (key === lastKey || !ctx) return;
      lastKey = key;
      drawChart(ctx, model, {width: SIZE, height: SIZE, hover});
      if (!hover && info.textContent !== message) info.textContent = message;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      section.removeEventListener('click', onClick);
      canvas.removeEventListener('pointermove', onMove);
      section.remove(); card.remove();
    },
  };
}
