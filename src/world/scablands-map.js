// The Scablands' two maps, drawn from the one picture of the land (src/world/scablands-picture.js). SCABLANDS-LAND round 4, slice 4.
//   The small map  always on the screen in a job: 2.5 km of the land round the car, north at the top, the car as an arrow that turns
//                  with it, the job's place as a marker (on the edge, with its distance in km, when it is off the map), names for the
//                  places and crossings that are on it, and what the player has learnt, which stays drawn.
//   The big map    (key M) the whole land, its grounds, roads and crossings named, every place, the car, the job's place, and the ways
//                  to the job's place that the way-finder worked out (src/world/scablands-ways.js).
// Nothing here changes a job: the maps read the car, the job's step and what the picture holds. A job's own line from point to point
// is not drawn; a way is the player's choice.
import {SCABLANDS_SOLIDS} from './scablands-scene.js';
import {createLandPicture, landMarks, REGION_COLOURS} from './scablands-picture.js';
import {furnaceSighting, hotDeliveryGlass} from './jobs/furnace-sightings.js';
import {bedMistCorners} from './jobs/ember-rule.js';
import {sightOutline, sees, WATCH, holderOf} from './scablands-ways.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {scablandsHeightAt} from './scablands-height.js';
import {BRAND_RULE} from './jobs/brand-rule.js';

// ---- The picture of the game's land, made once ---------------------------------------------------------------------------------------
let landPicture = null;
export function getLandPicture() {
  if (!landPicture) landPicture = createLandPicture({marks: landMarks({solids: SCABLANDS_SOLIDS})});
  return landPicture;
}

// The picture as a canvas, kept up to date while it is being made. Returns {canvas, update()}; update() copies what is new.
export function createPictureCanvas(picture, doc = globalThis.document) {
  const canvas = doc.createElement('canvas');
  canvas.width = picture.width; canvas.height = picture.height;
  const context = canvas.getContext('2d');
  let copied = -1;
  const update = () => {
    const state = picture.done ? Infinity : Math.round(picture.progress * 1000);
    if (state === copied) return false;
    copied = state;
    context.putImageData(new ImageData(new Uint8ClampedArray(picture.pixels), picture.width, picture.height), 0, 0);
    return true;
  };
  update();
  return {canvas, update};
}

// ---- Views and their arithmetic (pure) --------------------------------------------------------------------------------------------------
export const SMALL_MAP = Object.freeze({metresAcross: 2500, width: 400, height: 280, edgeInset: 22});
// A view is a window of the land: its middle, how many pixels a metre is, and the size of the canvas.
export function smallView(car, {width = SMALL_MAP.width, height = SMALL_MAP.height, metresAcross = SMALL_MAP.metresAcross} = {}) {
  return {cx: car.x, cz: car.z, scale: width / metresAcross, width, height};
}
export function wholeView(picture, {width, height}) {
  const scale = Math.min(width / (picture.width * picture.cell), height / (picture.height * picture.cell));
  return {cx: picture.x0 + picture.width * picture.cell / 2, cz: picture.z0 + picture.height * picture.cell / 2, scale, width, height};
}
// North is up: east is to the right and south is down (z grows to the south).
export const toScreen = (view, x, z) => ({x: view.width / 2 + (x - view.cx) * view.scale, y: view.height / 2 + (z - view.cz) * view.scale});
export const toLand = (view, px, py) => ({x: view.cx + (px - view.width / 2) / view.scale, z: view.cz + (py - view.height / 2) / view.scale});
// The arrow of a car heading `heading` (0 faces south, a quarter turn faces east) is drawn turned this far clockwise from "up".
export const arrowTurn = heading => Math.PI - heading;
// A target on the map, or on its edge when it is off it: where to draw it, which way it lies, and how far (km).
export function edgeMarker(view, target, car, inset = SMALL_MAP.edgeInset) {
  const at = toScreen(view, target.x, target.z), distance = Math.hypot(target.x - car.x, target.z - car.z);
  const inside = at.x >= inset && at.x <= view.width - inset && at.y >= inset && at.y <= view.height - inset;
  const km = Math.round(distance / 100) / 10;
  if (inside) return {onMap: true, x: at.x, y: at.y, km, angle: 0};
  const dx = at.x - view.width / 2, dy = at.y - view.height / 2;
  const t = Math.min((view.width / 2 - inset) / Math.max(1e-9, Math.abs(dx)), (view.height / 2 - inset) / Math.max(1e-9, Math.abs(dy)));
  return {onMap: false, x: view.width / 2 + dx * t, y: view.height / 2 + dy * t, km, angle: Math.atan2(dy, dx)};
}
// The part of the picture a view shows: a rectangle in the picture's own pixels.
export function sourceRect(picture, view) {
  const half = {x: view.width / 2 / view.scale, z: view.height / 2 / view.scale};
  return {x: (view.cx - half.x - picture.x0) / picture.cell, y: (view.cz - half.z - picture.z0) / picture.cell, width: half.x * 2 / picture.cell, height: half.z * 2 / picture.cell};
}

// ---- What the player has learnt (kept for the job) -----------------------------------------------------------------------------------------
export const SEEN = Object.freeze({barricade: 450, furnace: 1200});
export function createKnowledge() { return {barricades: new Map(), crossings: new Map(), sights: new Map(), braziers: new Map(), ways: new Set(), version: 0}; }
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// What a job holds that a player can come to know: its barricades and the furnaces on the ground (the skyline furnace the scene
// draws, and any furnace that is an actor of the job).
export function jobFacts(worldJob) {
  const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
  const barricades = (step?.gasLoad ? step.blocks ?? [] : step?.barriers ?? []).map(item => ({id: item.id, ...(item.position ?? item), ...(step?.gasLoad ? {known:true} : {})})).filter(item => Number.isFinite(item.x) && Number.isFinite(item.z));
  const furnaces = [];
  const sighted = furnaceSighting(worldJob);
  if (sighted?.hidden) furnaces.push({id: 'furnace-skyline', hidden: true});
  else if (sighted) furnaces.push({id: 'furnace-skyline', x: sighted.x, z: sighted.z, heading: sighted.heading});
  for (const actor of worldJob?.actors ?? []) if (actor.furnace && actor.position) furnaces.push({id: actor.id, x: actor.position.x, z: actor.position.z, heading: actor.heading ?? 0});
  const braziers = worldJob?.definition?.id === 'everburn-hot-delivery' ? (step?.braziers ?? []) : [];
  return {barricades, furnaces, braziers};
}
// Adds what the car is near enough to see. Returns true when something new was learnt or a sight moved.
export function learn(knowledge, {car, barricades = [], furnaces = [], crossings = [], braziers = [], heightAt = scablandsHeightAt, tunnels = null}) {
  let changed = false;
  for (const [index, brazier] of braziers.entries()) {
    const point = brazier.position ?? brazier;
    if (knowledge.braziers.has(brazier.id)) continue;
    if (index !== 0 && !sees(car, point, {heightAt: scablandsSurfaceHeightAt, actorFloors: true, tunnels, eye: 1.5, target: 2, step: 5, range: 400})) continue;
    knowledge.braziers.set(brazier.id, {id: brazier.id, x: point.x, z: point.z});
    changed = true;
  }
  for (const item of barricades) {
    if (knowledge.barricades.has(item.id) || !item.known && gap(car, item) > SEEN.barricade) continue;
    knowledge.barricades.set(item.id, {id: item.id, x: item.x, z: item.z, who: holderOf(item.id)});
    // A crossing a barricade stands at is held by whoever set it there.
    const near = crossings.filter(crossing => gap(crossing, item) < 260).sort((a, b) => gap(a, item) - gap(b, item))[0];
    if (near) knowledge.crossings.set(near.id, {id: near.id, name: near.name, who: holderOf(item.id)});
    changed = true;
  }
  for (const item of furnaces) {
    if (item.hidden) { if (knowledge.sights.delete(item.id)) changed = true; continue; }
    const known = knowledge.sights.get(item.id);
    if (!known && gap(car, item) > SEEN.furnace) continue;
    if (known && gap(known, item) < 60 && Math.abs(known.heading - item.heading) < .3) continue;
    if (known && gap(car, item) > SEEN.furnace) continue;
    knowledge.sights.set(item.id, {id: item.id, x: item.x, z: item.z, heading: item.heading, range: WATCH.furnace.range,
      outline: sightOutline(item, {range: WATCH.furnace.range, eye: WATCH.furnace.eye, heightAt})});
    changed = true;
  }
  if (changed) knowledge.version++;
  return changed;
}

// ---- Drawing ---------------------------------------------------------------------------------------------------------------------------
const FONT = "'Segoe UI', Arial, sans-serif";
const INK = Object.freeze({paper: '#14120e', pale: '#f2e9d0', mute: '#cfc3a4', dim: '#a39877', halo: '#15120ed9', road: '#e6d6ae', roadEdge: '#17150f',
  bank: '#8a795c', bed: '#2d2a25', gold: '#ffce75', car: '#fff1d0', carRing: '#ff683a', warn: '#ff8a4c', sight: '#ff7a3a'});
const WAY_COLOURS = Object.freeze(['#ffce75', '#62dabc', '#ef9f75', '#b99aff']);
export const wayColour = index => WAY_COLOURS[index % WAY_COLOURS.length];

const trackedPath = new WeakMap();
// A line of the land as a path in metres, made once for each list of points (so that a frame only strokes it).
function pathOf(ctx, points) {
  if (typeof Path2D === 'undefined') return null;
  let path = trackedPath.get(points);
  if (!path) { path = new Path2D(); points.forEach((p, i) => i ? path.lineTo(p.x, p.z) : path.moveTo(p.x, p.z)); trackedPath.set(points, path); }
  return path;
}
// Strokes a line of the land with a width in pixels.
function strokeLine(ctx, view, points, colour, pixels, dash = []) {
  const path = pathOf(ctx, points);
  ctx.save();
  ctx.translate(view.width / 2 - view.cx * view.scale, view.height / 2 - view.cz * view.scale); ctx.scale(view.scale, view.scale);
  ctx.strokeStyle = colour; ctx.lineWidth = pixels / view.scale; ctx.lineJoin = ctx.lineCap = 'round'; ctx.setLineDash(dash.map(value => value / view.scale));
  if (path) ctx.stroke(path);
  ctx.restore();
}

function text(ctx, string, x, y, {size = 14, colour = INK.pale, align = 'center', halo = INK.halo, weight = 'bold', spacing = 0, italic = false} = {}) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 3.2); ctx.strokeStyle = halo; ctx.strokeText(string, x, y);
  ctx.fillStyle = colour; ctx.fillText(string, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}
const measure = (ctx, string, size, weight = 'bold') => { ctx.font = `${weight} ${size}px ${FONT}`; return ctx.measureText(string).width; };

const shortName = name => String(name).replace(/^The /i, '').toUpperCase();
// True when the target stands on one of the land's named places (its name is then already on the map).
const namesAPlace = (marks, target) => marks.places.some(place => Math.hypot(place.x - target.x, place.z - target.z) < 60 || shortName(place.name) === shortName(target.name));

function drawGround(ctx, picture, canvas, view) {
  ctx.fillStyle = INK.paper; ctx.fillRect(0, 0, view.width, view.height);
  if (!canvas) return;
  const rect = sourceRect(picture, view);
  // Only the part of the window that lies on the land is cut out of the picture.
  const x0 = Math.max(0, rect.x), y0 = Math.max(0, rect.y), x1 = Math.min(picture.width, rect.x + rect.width), y1 = Math.min(picture.height, rect.y + rect.height);
  if (x1 <= x0 || y1 <= y0) return;
  const k = view.width / rect.width, l = view.height / rect.height;
  ctx.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, (x0 - rect.x) * k, (y0 - rect.y) * l, (x1 - x0) * k, (y1 - y0) * l);
}

function drawRiver(ctx, view, marks) {
  strokeLine(ctx, view, marks.river.points, INK.bank, marks.river.lipWidth * view.scale * .98);
  strokeLine(ctx, view, marks.river.points, INK.bed, Math.max(3, marks.river.bedWidth * view.scale * .9));
}
function drawLandmarks(ctx, view, lines = []) {
  for (const landmark of lines) {
    const colour = landmark.kind === 'pylon' ? '#e0a76b' : '#b3d1c2';
    strokeLine(ctx, view, landmark.points, INK.paper, 4, [5, 5]);
    strokeLine(ctx, view, landmark.points, colour, 2, [5, 5]);
  }
}

function drawRoads(ctx, view, marks, {casing, line}) {
  for (const road of marks.roads) strokeLine(ctx, view, road.points, INK.roadEdge, casing);
  for (const road of marks.roads) strokeLine(ctx, view, road.points, INK.road, line);
}

// One small picture for each way a river can be crossed; `held` puts a mark of the ones that are held.
export function crossingGlyph(ctx, kind, x, y, size, held = false) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = INK.paper; ctx.strokeStyle = INK.pale; ctx.lineWidth = Math.max(1.5, size / 7);
  ctx.beginPath(); ctx.rect(-size, -size * .72, size * 2, size * 1.44); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = INK.pale; ctx.lineWidth = Math.max(1.4, size / 8); ctx.beginPath();
  if (kind === 'bridge') { for (const d of [-.6, 0, .6]) { ctx.moveTo(size * d, -size * .5); ctx.lineTo(size * d, size * .5); } ctx.moveTo(-size * .85, 0); ctx.lineTo(size * .85, 0); }
  else if (kind === 'pipe') { ctx.moveTo(-size * .8, -size * .22); ctx.lineTo(size * .8, -size * .22); ctx.moveTo(-size * .8, size * .22); ctx.lineTo(size * .8, size * .22); }
  else if (kind === 'steps') { ctx.moveTo(-size * .8, size * .45); ctx.lineTo(-size * .4, size * .45); ctx.lineTo(-size * .4, 0); ctx.lineTo(size * .05, 0); ctx.lineTo(size * .05, -size * .45); ctx.lineTo(size * .8, -size * .45); }
  else { ctx.moveTo(-size * .8, 0); ctx.bezierCurveTo(-size * .4, -size * .5, -size * .1, size * .5, size * .25, 0); ctx.bezierCurveTo(size * .45, -size * .3, size * .6, -size * .1, size * .8, 0); }
  ctx.stroke();
  if (held) { ctx.strokeStyle = INK.warn; ctx.lineWidth = Math.max(2, size / 5); ctx.beginPath(); ctx.rect(-size - 2, -size * .72 - 2, size * 2 + 4, size * 1.44 + 4); ctx.stroke(); }
  ctx.restore();
}

// A place: a ring where its ground is level, a plan of what stands there (each solid box as a filled footprint) and a mark when it
// stands too small to show a plan.
function drawPlace(ctx, view, place, {minimum}) {
  const at = toScreen(view, place.x, place.z), radius = Math.max(5, place.flatRadius * view.scale);
  ctx.save();
  ctx.strokeStyle = INK.mute; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.globalAlpha = .75;
  ctx.beginPath(); ctx.arc(at.x, at.y, radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.fillStyle = '#26221b'; ctx.strokeStyle = '#e9dcb8'; ctx.lineWidth = 1.1;
  for (const box of place.plan) {
    const c = toScreen(view, box.x, box.z), w = Math.max(minimum, box.width * view.scale), d = Math.max(minimum, box.depth * view.scale);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(-(box.heading ?? 0));
    ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.restore();
  }
  if (!place.plan.length) { ctx.fillStyle = INK.pale; ctx.strokeStyle = INK.paper; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(at.x - 3.5, at.y - 3.5, 7, 7); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

function drawSights(ctx, view, knowledge) {
  for (const sight of knowledge.sights.values()) {
    const outline = new Path2D();
    let left = Infinity, top = Infinity, bottom = -Infinity, right = -Infinity;
    sight.outline.forEach((p, i) => {
      const at = toScreen(view, p.x, p.z);
      i ? outline.lineTo(at.x, at.y) : outline.moveTo(at.x, at.y);
      left = Math.min(left, at.x); right = Math.max(right, at.x); top = Math.min(top, at.y); bottom = Math.max(bottom, at.y);
    });
    outline.closePath();
    ctx.save();
    ctx.fillStyle = '#ff3c1416'; ctx.fill(outline);
    // Hatched, so that it is read as a region of sight and not as a ground: diagonal lines, cut to the outline.
    const hatch = new Path2D(), height = bottom - top;
    for (let x = Math.max(left - height, -height) - ((Math.max(left - height, -height)) % 11); x < Math.min(right, view.width); x += 11) { hatch.moveTo(x, bottom); hatch.lineTo(x + height, top); }
    ctx.save(); ctx.clip(outline); ctx.strokeStyle = '#ff5a2a4a'; ctx.lineWidth = 1.1; ctx.stroke(hatch); ctx.restore();
    ctx.strokeStyle = '#17120d'; ctx.lineWidth = 4.5; ctx.stroke(outline);
    ctx.strokeStyle = '#ff6a2a'; ctx.lineWidth = 2.2; ctx.setLineDash([7, 5]); ctx.stroke(outline); ctx.setLineDash([]);
    const at = toScreen(view, sight.x, sight.z);
    ctx.fillStyle = INK.sight; ctx.strokeStyle = INK.paper; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(at.x, at.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function drawBarricades(ctx, view, knowledge, size) {
  for (const item of knowledge.barricades.values()) {
    const at = toScreen(view, item.x, item.z);
    ctx.save(); ctx.translate(at.x, at.y); ctx.strokeStyle = INK.paper; ctx.lineWidth = size / 2.2 + 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-size, -size); ctx.lineTo(size, size); ctx.moveTo(size, -size); ctx.lineTo(-size, size); ctx.stroke();
    ctx.strokeStyle = INK.warn; ctx.lineWidth = size / 2.2; ctx.stroke(); ctx.restore();
  }
}

// A flame marks each known brazier on both maps.
function drawBraziers(ctx, view, knowledge) {
  for (const brazier of knowledge.braziers?.values() ?? []) {
    const at = toScreen(view, brazier.x, brazier.z);
    if (at.x < 0 || at.y < 0 || at.x > view.width || at.y > view.height) continue;
    ctx.save(); ctx.translate(at.x, at.y);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 2); ctx.lineTo(4, 7); ctx.lineTo(-4, 7); ctx.lineTo(-6, 2); ctx.closePath();
    ctx.fillStyle = INK.warn; ctx.strokeStyle = INK.paper; ctx.lineWidth = 2; ctx.fill(); ctx.stroke(); ctx.restore();
  }
}

// The car: an arrow turned the way the car faces, with a ring so that it is found at a glance.
export function drawCarArrow(ctx, x, y, heading, size = 13) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, size * 1.45, 0, Math.PI * 2); ctx.fillStyle = '#ff542933'; ctx.fill();
  ctx.rotate(arrowTurn(heading));
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .72, size * .82); ctx.lineTo(0, size * .42); ctx.lineTo(-size * .72, size * .82); ctx.closePath();
  ctx.fillStyle = INK.car; ctx.fill(); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = INK.carRing; ctx.stroke();
  ctx.restore();
}
// The job's place: a gold ring round a dot, on a dark ring so that it stands out of any ground.
export function drawTargetMark(ctx, x, y, size = 10) {
  ctx.save(); ctx.translate(x, y);
  ctx.lineWidth = 6; ctx.strokeStyle = INK.paper; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = INK.gold; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = INK.gold; ctx.beginPath(); ctx.arc(0, 0, size * .32, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawEdgeMarker(ctx, marker, size) {
  ctx.save(); ctx.translate(marker.x, marker.y);
  ctx.save(); ctx.rotate(marker.angle);
  ctx.beginPath(); ctx.moveTo(size * 1.1, 0); ctx.lineTo(-size * .7, -size * .85); ctx.lineTo(-size * .7, size * .85); ctx.closePath();
  ctx.fillStyle = INK.gold; ctx.lineWidth = 3; ctx.strokeStyle = INK.paper; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); ctx.restore();
  ctx.restore();
}
const ACTOR_COLOURS = Object.freeze({escort: '#62dabc', hunter: '#ff683a', rider: '#ef9f75'});
function drawActors(ctx, view, actors, size) {
  for (const actor of actors) {
    const at = toScreen(view, actor.position.x, actor.position.z);
    if (at.x < 0 || at.y < 0 || at.x > view.width || at.y > view.height) continue;
    ctx.beginPath(); ctx.arc(at.x, at.y, size, 0, Math.PI * 2); ctx.fillStyle = ACTOR_COLOURS[actor.kind] ?? INK.pale; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK.paper; ctx.stroke();
  }
}

// ---- The small map ---------------------------------------------------------------------------------------------------------------------
export function brandTownMap(frame, {width, height} = SMALL_MAP) {
  const job = frame.worldJob?.job, step = job?.steps?.[job.stepIndex];
  if (!frame.racing || !frame.onFoot || !step?.brand) return null;
  const point = place => place.position ?? place;
  const fires = [step.hearth, ...(step.places ?? [])].filter(Boolean).map(place => ({
    ...point(place), id: place.id,
    lit: place === step.hearth || job.stepState?.lamps?.[place.id] === true,
  }));
  const men = (frame.worldJob.actors ?? []).filter(actor => actor.brandAsh);
  const points = [...fires, ...men, ...(step.ashEntries ?? []).map(point), frame.car];
  const minX = Math.min(...points.map(at => at.x)), maxX = Math.max(...points.map(at => at.x));
  const minZ = Math.min(...points.map(at => at.z)), maxZ = Math.max(...points.map(at => at.z));
  const padding = BRAND_RULE.mapPaddingMetres * 2;
  const across = Math.max(BRAND_RULE.mapMetresAcross, maxX - minX + padding,
    (maxZ - minZ + padding) * width / height);
  return {view: {cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2,
    scale: width / across, width, height}, fires, men};
}

function drawTownFires(ctx, town) {
  for (const fire of town.fires) {
    const at = toScreen(town.view, fire.x, fire.z);
    ctx.beginPath(); ctx.arc(at.x, at.y, BRAND_RULE.mapFireRadiusPixels, 0, Math.PI * 2);
    ctx.fillStyle = fire.lit ? '#ffbc72' : '#252e34'; ctx.fill();
    ctx.strokeStyle = INK.pale; ctx.lineWidth = BRAND_RULE.mapFireStrokePixels; ctx.stroke();
    const label = fire.id === 'town-hearth' ? 'HEARTH' : fire.id.toUpperCase();
    text(ctx, label, at.x, at.y - BRAND_RULE.mapLabelOffsetPixels, {size: BRAND_RULE.mapLabelSizePixels});
  }
}

// `frame`: {picture, canvas (the picture as a canvas), car: {x, z, heading}, target: {x, z, name} | null, knowledge, actors: [{kind, position}]}.
export function drawSmallMap(ctx, frame, {width = SMALL_MAP.width, height = SMALL_MAP.height} = {}) {
  const {picture, car, target, knowledge, actors = []} = frame, marks = picture.marks;
  const town = brandTownMap(frame, {width, height});
  const view = town?.view ?? smallView(car, {width, height});
  drawGround(ctx, picture, frame.canvas, view);
  drawRiver(ctx, view, marks);
  drawSights(ctx, view, knowledge);
  drawRoads(ctx, view, marks, {casing: 8.5, line: 4.6});
  drawLandmarks(ctx, view, frame.landmarkLines);
  drawGlassRing(ctx, view, hotDeliveryGlass(frame.worldJob));
  const job = frame.worldJob?.job;
  if (frame.worldJob?.definition?.id === 'everburn-hot-delivery' && !job?.done)
    for (const patch of job.steps[job.stepIndex]?.bedMist ?? []) {
      const points = bedMistCorners(patch).map(point => toScreen(view, point.x, point.z));
      ctx.beginPath();
      points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath(); ctx.fillStyle = '#dde5e58c'; ctx.fill();
    }
  const margin = 40, visible = (x, z) => { const at = toScreen(view, x, z); return at.x > -margin && at.y > -margin && at.x < width + margin && at.y < height + margin; };
  // What is written on the map is written where there is room: not over the scale bar, the compass, the car or another name.
  const boxes = [{left: 0, right: 150, top: height - 30, bottom: height}, {left: width - 44, right: width, top: 0, bottom: 46}, {left: width / 2 - 26, right: width / 2 + 26, top: height / 2 - 26, bottom: height / 2 + 26}];
  const names = [];
  for (const crossing of marks.crossings) {
    if (!visible(crossing.x, crossing.z)) continue;
    const at = toScreen(view, crossing.x, crossing.z);
    crossingGlyph(ctx, crossing.kind, at.x, at.y, 9, knowledge.crossings.has(crossing.id));
    names.push({at, string: crossing.name, rank: 2, tries: [[0, -21], [0, 23], [66, 0], [-66, 0], [0, -38], [0, 40]], options: {size: 13, colour: INK.mute}});
  }
  for (const place of marks.places) if (visible(place.x, place.z)) drawPlace(ctx, view, place, {minimum: 2.5});
  for (const camp of marks.camps) if (visible(camp.x, camp.z)) { const at = toScreen(view, camp.x, camp.z); drawPlace(ctx, view, {...camp, flatRadius: 18, plan: []}, {minimum: 2}); names.push({at, string: camp.name, rank: 3, tries: [[0, -17], [0, 19], [60, 0]], options: {size: 13, colour: INK.mute}}); }
  drawBarricades(ctx, view, knowledge, 6);
  drawBraziers(ctx, view, knowledge);
  for (const place of marks.places) if (visible(place.x, place.z)) { const at = toScreen(view, place.x, place.z), r = Math.max(8, place.flatRadius * view.scale); names.push({at, string: shortName(place.name), rank: 1, tries: [[0, -(r + 12)], [0, r + 14], [r + 50, 0], [-(r + 50), 0]], options: {size: 16, spacing: 1}}); }
  names.sort((a, b) => a.rank - b.rank);
  for (const item of names) nameAt(ctx, boxes, item.string, item.at.x, item.at.y, item.tries, item.options, view, item.rank <= 2);
  let marker = null;
  if (target) {
    marker = edgeMarker(view, target, car);
    if (marker.onMap) drawTargetMark(ctx, marker.x, marker.y, 10);
    else drawEdgeMarker(ctx, marker, 8);
  }
  if (town) drawTownFires(ctx, town);
  const carAt = toScreen(view, car.x, car.z);
  drawCarArrow(ctx, carAt.x, carAt.y, car.heading ?? 0, 13);
  // At 60 m a rider is only ten pixels from the car. Keep its mark above the
  // car's thirteen-pixel arrow so the last part of a scout chase stays visible.
  drawActors(ctx, view, actors, 5);
  if (town) drawActors(ctx, view, town.men.map(man => ({kind: 'hunter', position: man})), 5);
  // On the map a place already carries its name; a mark on the edge, or a point that is no place, says what it is and how far (km).
  if (marker && (!marker.onMap || !namesAPlace(marks, target))) {
    const label = marker.onMap ? `${target.name.toUpperCase()}` : `${target.name.toUpperCase()}  ${marker.km.toFixed(1)} km`;
    const w = measure(ctx, label, 14) + 12, bx = Math.max(6, Math.min(width - w - 6, marker.x - w / 2)), by = marker.onMap ? marker.y + 22 : Math.max(16, Math.min(height - 16, marker.y + (marker.y < height / 2 ? 24 : -24)));
    ctx.fillStyle = '#14120ee6'; ctx.fillRect(bx, by - 11, w, 22); ctx.strokeStyle = INK.gold; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by - 11, w, 22);
    text(ctx, label, bx + w / 2, by, {size: 14, colour: INK.gold, halo: 'transparent'});
  }
  drawFrame(ctx, view, {north: true, bar: town ? BRAND_RULE.mapScaleBarMetres : 500});
  return marker;
}

export function drawGlassRing(ctx, view, glass) {
  if (!glass) return;
  const at = toScreen(view, glass.x, glass.z);
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, glass.radius * view.scale, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff4bc';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
// The north mark and a bar with the length it stands for.
function drawFrame(ctx, view, {north, bar}) {
  const pixels = bar * view.scale;
  ctx.save();
  ctx.fillStyle = '#14120ecc'; ctx.fillRect(7, view.height - 26, pixels + 14 + measure(ctx, `${bar >= 1000 ? bar / 1000 : bar} ${bar >= 1000 ? 'km' : 'm'}`, 12) + 8, 20);
  ctx.strokeStyle = INK.pale; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(14, view.height - 12); ctx.lineTo(14 + pixels, view.height - 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, view.height - 17); ctx.lineTo(14, view.height - 7); ctx.moveTo(14 + pixels, view.height - 17); ctx.lineTo(14 + pixels, view.height - 7); ctx.stroke();
  text(ctx, `${bar >= 1000 ? bar / 1000 : bar} ${bar >= 1000 ? 'km' : 'm'}`, 14 + pixels + 8, view.height - 16, {size: 12, align: 'left', halo: 'transparent', colour: INK.pale});
  if (north) {
    ctx.fillStyle = '#14120ecc'; ctx.beginPath(); ctx.arc(view.width - 22, 24, 15, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK.mute; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = INK.pale; ctx.beginPath(); ctx.moveTo(view.width - 22, 12); ctx.lineTo(view.width - 17, 28); ctx.lineTo(view.width - 22, 24); ctx.lineTo(view.width - 27, 28); ctx.closePath(); ctx.fill();
    text(ctx, 'N', view.width - 22, 34, {size: 10, halo: 'transparent', colour: INK.mute});
  }
  ctx.restore();
}

// ---- The big map -----------------------------------------------------------------------------------------------------------------------
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
function labelAt(ctx, boxes, string, x, y, options, view) {
  const size = options.size ?? 14, w = measure(ctx, string, size) + (options.spacing ?? 0) * string.length, box = {left: x - w / 2 - 2, right: x + w / 2 + 2, top: y - size / 2 - 1, bottom: y + size / 2 + 1};
  if (box.left < 2 || box.right > view.width - 2 || box.top < 2 || box.bottom > view.height - 2) return false;
  if (boxes.some(other => overlaps(box, other))) return false;
  boxes.push(box); text(ctx, string, x, y, options); return true;
}
// A name written at the first of `tries` (offsets from x, y) where there is room. A name that must be written (a place, a road) and has
// no free place is written at the first try, moved on to the map, over what is there; the others are left off.
function nameAt(ctx, boxes, string, x, y, tries, options, view, force = false) {
  for (const [dx, dy] of tries) if (labelAt(ctx, boxes, string, x + dx, y + dy, options, view)) return true;
  if (!force) return false;
  const size = options.size ?? 14, w = measure(ctx, string, size) + (options.spacing ?? 0) * string.length;
  const px = Math.max(w / 2 + 3, Math.min(view.width - w / 2 - 3, x + tries[0][0])), py = Math.max(size / 2 + 3, Math.min(view.height - size / 2 - 3, y + tries[0][1]));
  boxes.push({left: px - w / 2, right: px + w / 2, top: py - size / 2, bottom: py + size / 2}); text(ctx, string, px, py, options);
  return false;
}
// A name written along a line, turned to lie along it (never upside down), at the first of `fractions` of the line's length where
// there is room for it (no other name, and the whole name on the map), first at its own size, then smaller. A name that must be
// written is written in the middle at the smallest size over whatever is there when there is no room. Returns true when it was
// written in the clear. A turned name takes the room of a chain of small boxes laid along it, so that a diagonal name does not
// shut out the whole square round it.
function textAlong(ctx, view, boxes, points, string, options, fractions = [.5, .3, .7, .15, .85, .4, .6, .22, .78, .1, .9, .35, .65], force = true) {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  const sizes = [options.size ?? 14, (options.size ?? 14) * .85, (options.size ?? 14) * .72];
  const place = (fraction, size) => {
    const w = measure(ctx, string, size) + (options.spacing ?? 0) * string.length, wanted = cumulative.at(-1) * fraction;
    // The point `metres` along the line (a straight road has only its two ends, so the points between are worked out).
    const along = metres => {
      let i = 1; const m = Math.max(0, Math.min(cumulative.at(-1), metres));
      while (i < points.length - 1 && cumulative[i] < m) i++;
      const span = cumulative[i] - cumulative[i - 1], t = span > 0 ? (m - cumulative[i - 1]) / span : 0;
      return toScreen(view, points[i - 1].x + (points[i].x - points[i - 1].x) * t, points[i - 1].z + (points[i].z - points[i - 1].z) * t);
    };
    // The direction of the line over the length of the name, round that point.
    const reach = w / view.scale / 2, a = along(wanted - reach), b = along(wanted + reach), mid = along(wanted);
    let angle = Math.atan2(b.y - a.y, b.x - a.x); if (angle > Math.PI / 2) angle -= Math.PI; else if (angle < -Math.PI / 2) angle += Math.PI;
    const lift = size * .75, cx = mid.x + Math.sin(angle) * lift, cy = mid.y - Math.cos(angle) * lift;
    const chain = [], count = Math.max(1, Math.ceil(w / (size * .9))), half = size / 2 + 2;
    for (let k = 0; k < count; k++) {
      const along = (k + .5) / count * w - w / 2, x = cx + Math.cos(angle) * along, y = cy + Math.sin(angle) * along;
      chain.push({left: x - half, right: x + half, top: y - half, bottom: y + half});
    }
    return {cx, cy, angle, size, chain};
  };
  const write = ({cx, cy, angle, size, chain}) => { boxes.push(...chain); ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); text(ctx, string, 0, 0, {...options, size}); ctx.restore(); };
  // A place is scored by how many of its boxes touch another name (or fall off the map: that counts for more); a free place scores nothing.
  let best = null;
  for (const size of sizes) for (const fraction of fractions) {
    const found = place(fraction, size);
    const score = found.chain.reduce((sum, box) => sum + (box.left < 2 || box.right > view.width - 2 || box.top < 2 || box.bottom > view.height - 2 ? 20 : boxes.some(other => overlaps(box, other)) ? 1 : 0), 0);
    if (score === 0) { write(found); return true; }
    if (!best || score < best.score) best = {score, found};
  }
  if (force && best) write(best.found);
  return false;
}

// `frame` as for the small map, with `ways` [{id, name, points}] to draw and `title`.
export function drawBigMap(ctx, frame, {width, height}) {
  const {picture, car, target, knowledge, actors = [], ways = []} = frame, marks = picture.marks, view = wholeView(picture, {width, height});
  drawGround(ctx, picture, frame.canvas, view);
  drawRiver(ctx, view, marks);
  drawSights(ctx, view, knowledge);
  drawRoads(ctx, view, marks, {casing: 6, line: 3});
  drawLandmarks(ctx, view, frame.landmarkLines);
  // The ways to the job's place, thin and coloured, each with its letter.
  ways.forEach((way, index) => {
    strokeLine(ctx, view, way.points, INK.paper, 7, [14, 8]); strokeLine(ctx, view, way.points, wayColour(index), 3.6, [14, 8]);
  });
  const boxes = [];
  for (const place of marks.places) drawPlace(ctx, view, place, {minimum: 4});
  for (const camp of marks.camps) drawPlace(ctx, view, {...camp, flatRadius: 18, plan: []}, {minimum: 3});
  drawBarricades(ctx, view, knowledge, 9);
  drawBraziers(ctx, view, knowledge);
  for (const crossing of marks.crossings) { const at = toScreen(view, crossing.x, crossing.z); crossingGlyph(ctx, crossing.kind, at.x, at.y, 11, knowledge.crossings.has(crossing.id)); }
  // Names, most important first: the car and the job's place, places, crossings, the grounds, the river, then roads; each only where
  // there is room, so that no name is written over another.
  for (const at of [toScreen(view, car.x, car.z), ...(target ? [toScreen(view, target.x, target.z)] : [])]) boxes.push({left: at.x - 22, right: at.x + 22, top: at.y - 22, bottom: at.y + 22});
  for (const place of marks.places) {
    const at = toScreen(view, place.x, place.z);
    nameAt(ctx, boxes, shortName(place.name), at.x, at.y, [[0, -30], [0, 32], [86, 0], [-86, 0], [0, -56], [0, 58]], {size: 27, spacing: 2}, view, true);
  }
  for (const crossing of marks.crossings) {
    const at = toScreen(view, crossing.x, crossing.z);
    nameAt(ctx, boxes, crossing.name, at.x, at.y, [[0, -26], [0, 28], [92, 0], [-92, 0], [0, -48], [0, 50]], {size: 20, colour: INK.mute}, view, true);
  }
  for (const camp of marks.camps) { const at = toScreen(view, camp.x, camp.z); nameAt(ctx, boxes, camp.name, at.x, at.y, [[0, -24], [0, 26], [86, 0], [-86, 0]], {size: 20, colour: INK.mute}, view, true); }
  for (const label of picture.labels) {
    const at = toScreen(view, label.x, label.z), tone = REGION_COLOURS[label.key];
    const light = tone[0] * .3 + tone[1] * .59 + tone[2] * .11 > 120;
    for (const [dx, dy] of [[0, 0], [0, -64], [0, 64], [-170, 0], [170, 0], [0, -120], [0, 120]])
      if (labelAt(ctx, boxes, label.name.toUpperCase(), at.x + dx, at.y + dy, {size: 32, colour: light ? '#3a3328' : '#cfc3a4', halo: 'transparent', weight: 'bold', spacing: 11, italic: true}, view)) break;
  }
  // Every road is named, the longest first (it has the most room); the river's name is written where there is room.
  for (const road of [...marks.roads].sort((a, b) => b.length - a.length)) textAlong(ctx, view, boxes, road.points, road.name.toUpperCase(), {size: 18, colour: INK.road, spacing: 1.5, halo: '#14120ee6'});
  textAlong(ctx, view, boxes, marks.river.points, marks.river.name.toUpperCase(), {size: 22, colour: '#b9ac8a', spacing: 7, italic: true, halo: '#14120ee6'}, [.14, .3, .75, .5, .9, .2, .6, .4], false);
  ways.forEach((way, index) => {
    const mid = way.points[Math.floor(way.points.length * (.3 + .12 * index))], at = toScreen(view, mid.x, mid.z);
    ctx.beginPath(); ctx.arc(at.x, at.y, 13, 0, Math.PI * 2); ctx.fillStyle = wayColour(index); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK.paper; ctx.stroke();
    text(ctx, String.fromCharCode(65 + index), at.x, at.y + 1, {size: 17, colour: INK.paper, halo: 'transparent'});
  });
  drawActors(ctx, view, actors, 7);
  if (target) {
    const at = toScreen(view, target.x, target.z);
    drawTargetMark(ctx, at.x, at.y, 14);
    // A job's place that is not one of the land's named places is named beside its mark.
    if (!namesAPlace(marks, target)) for (const [dx, dy] of [[0, 34], [0, -34], [90, 0], [-90, 0]]) if (labelAt(ctx, boxes, target.name.toUpperCase(), at.x + dx, at.y + dy, {size: 23, colour: INK.gold, spacing: 2}, view)) break;
  }
  const here = toScreen(view, car.x, car.z);
  drawCarArrow(ctx, here.x, here.y, car.heading ?? 0, 17);
  drawFrame(ctx, view, {north: true, bar: 2000});
  drawLegend(ctx, view, {knowledge, target});
}

// What the marks mean: the car, the job's place, and what has been learnt (only what is on the map).
function drawLegend(ctx, view, {knowledge, target}) {
  const items = [['car', 'YOU'], ...(target ? [['target', 'JOB PLACE']] : []), ...(knowledge.barricades.size ? [['barricade', 'BARRICADE']] : []), ...(knowledge.sights.size ? [['sight', 'FURNACE SIGHT']] : [])];
  ctx.save(); ctx.font = `bold 16px ${FONT}`;
  const widths = items.map(([, label]) => ctx.measureText(label).width + 40), total = widths.reduce((sum, value) => sum + value, 0) + 14;
  const x0 = view.width - total - 8, y = view.height - 30;
  ctx.fillStyle = '#14120ed9'; ctx.fillRect(x0, y - 4, total, 30); ctx.strokeStyle = '#e4d4b244'; ctx.lineWidth = 1; ctx.strokeRect(x0, y - 4, total, 30);
  let x = x0 + 14;
  items.forEach(([kind, label], index) => {
    const cx = x + 10, cy = y + 11;
    if (kind === 'car') drawCarArrow(ctx, cx, cy, Math.PI, 8);
    else if (kind === 'target') drawTargetMark(ctx, cx, cy, 7);
    else if (kind === 'barricade') { ctx.strokeStyle = INK.warn; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6); ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6); ctx.stroke(); }
    else { ctx.fillStyle = '#ff7a3a66'; ctx.strokeStyle = '#ff9a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    text(ctx, label, cx + 14, cy, {size: 16, align: 'left', halo: 'transparent', colour: INK.pale});
    x += widths[index];
  });
  ctx.restore();
}

// ---- The words of a way, from its numbers ---------------------------------------------------------------------------------------------------
const km = metres => `${(metres / 1000).toFixed(1)} km`;
// The ground of a way in a few words: every ground that is a twentieth or more of it, the biggest first.
export function groundWords(way) {
  const shown = way.grounds.filter(ground => ground.share >= .05);
  return (shown.length ? shown : way.grounds.slice(0, 1)).map(ground => `${ground.name} ${Math.round(ground.share * 100)}%`).join(', ');
}
export function wayLines(way) {
  const lines = [];
  for (const crossing of way.crossings) lines.push(crossing.under ? `Runs along the river bed under ${crossing.name}` :
    crossing.heldBy.length ? `${crossing.name}, held by the ${crossing.heldBy.join(' and the ')}` : `Crosses at ${crossing.name}`);
  for (const holder of way.holders) lines.push(`${holder.count} ${holder.count === 1 ? 'barricade' : 'barricades'} of the ${holder.who}`);
  for (const sight of way.sights) lines.push(`In ${sight.name}'s sight for ${km(sight.metres)}`);
  return lines;
}
export const wayKm = km;
