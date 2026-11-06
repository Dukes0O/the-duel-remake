import {SCABLANDS_PLACES} from '../../world/scablands.js';
import {TOWN_NEIGHBOURS} from '../content/neighbours.js';
import {updateTownCamera} from './town-camera.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import * as THREE from 'three';

const point = value => {
  const x = Number(value?.x ?? value?.position?.x), z = Number(value?.z ?? value?.position?.z);
  return Number.isFinite(x) && Number.isFinite(z) ? {x, z} : null;
};

function placeForName(name, places) {
  const text = String(name || '').trim().toLowerCase();
  return places.find(place => text && (text === place.id.toLowerCase() || text === place.name.toLowerCase()));
}

function reportPoint(report, buildings, places) {
  const facts = report.facts || {};
  const direct = point(report) || point(facts) || point(facts.position) || point(facts.cell);
  if (direct) return direct;
  const place = places.find(row => row.id === facts.placeId);
  if (place) return point(place);
  const site = buildings.find(building => building.id === facts.siteId);
  if (site) return {x: (site.x + (site.width || 1) / 2) * 8, z: (site.z + (site.depth || 1) / 2) * 8};
  if (String(report.where || '').trim().toLowerCase() === 'town') return {x: 0, z: 0};
  return point(facts.place) || placeForName(report.where, places) || null;
}

function tripPoint(trip, tick) {
  if (trip?.status && trip.status !== 'on-road') return null;
  const origin = point(trip?.origin), destination = point(trip?.destination);
  const route = Array.isArray(trip?.route) ? trip.route : trip?.route?.points;
  if (!origin || !destination || !Array.isArray(route) || route.length < 1) return null;
  const points = [origin, ...route.map(point), destination];
  if (points.some(row => !row)) return null;
  let elapsed;
  try { elapsed = BigInt(tick ?? 0) - BigInt(trip.startedTick ?? trip.startTick ?? 0); } catch { return null; }
  const duration = Number(trip.durationTicks);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const progress = elapsed <= 0n ? 0 : Math.max(0, Math.min(1, Number(elapsed) / duration));
  const lengths = [];
  let total = 0;
  for (let index = 1; index < points.length; index++) { const length = Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z); lengths.push(length); total += length; }
  if (!total) return origin;
  let distance = progress * total;
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index] || index === lengths.length - 1) {
      const ratio = lengths[index] ? distance / lengths[index] : 0, a = points[index], b = points[index + 1];
      return {x: a.x + (b.x - a.x) * ratio, z: a.z + (b.z - a.z) * ratio};
    }
    distance -= lengths[index];
  }
  return destination;
}

/** Build uncapped, read-only Scablands marker records from coordinates already in town data. */
export function buildTownMapMarkers(town, {places = SCABLANDS_PLACES, neighbours = TOWN_NEIGHBOURS} = {}) {
  if (!town || typeof town !== 'object') throw new TypeError('Choose a town to map first.');
  const markers = places.map(place => ({id: `place:${place.id}`, kind: 'place', label: place.name,
    x: place.x, z: place.z, target: {x: place.x, z: place.z}}));
  const buildings = Array.isArray(town.buildings) ? town.buildings : [];
  const outposts = town.outposts || {};
  for (const neighbour of neighbours) {
    const state = outposts[neighbour.id];
    const placeId = state?.placeId || neighbour.placeId;
    const place = places.find(row => row.id === placeId);
    const location = point(state) || point(state?.position) || point(place);
    if (state && location) markers.push({id: `outpost:${neighbour.id}`, kind: 'outpost', label: neighbour.name,
      ...location, target: location});
    for (const truck of state?.trucks || []) {
      const position = tripPoint(truck, town.tick);
      if (position) markers.push({id: `truck:${truck.id}`, kind: 'truck', label: `${truck.vehicle || 'Truck'} on the road`,
        ...position, target: position});
    }
  }
  for (const truck of town.haulers || town.vehicles || []) {
    const position = tripPoint(truck, town.tick);
    if (position) markers.push({id: `truck:${truck.id}`, kind: 'truck', label: `${truck.vehicle || 'Truck'} on the road`,
      ...position, target: position});
  }
  for (const report of town.reports || []) {
    if (!report.unanswered) continue;
    const position = reportPoint(report, buildings, places);
    if (position) markers.push({id: `report:${report.id}`, kind: 'report', label: report.what || 'Town report',
      ...position, target: position, priority: Number(report.priority) || 0});
  }
  return markers;
}

/** Focus the town camera on a marker while preserving its current viewing angle. */
export function focusTownMapMarker(camera, marker, {zoom = 0.16} = {}) {
  const state = camera?.userData?.townView;
  const target = point(marker?.target || marker);
  if (!state || !target) throw new TypeError('Choose a town map marker first.');
  state.target.x = target.x;
  state.target.z = target.z;
  state.zoom = Math.max(0, Math.min(1, Number(zoom) || 0));
  updateTownCamera(camera);
  return state;
}

/** Project labels and hide lower-priority overlaps. Call only after camera/town changes. */
export function layoutTownMapMarkers(markers, camera, {width, height, clip, zoom=camera?.userData?.townView?.zoom ?? 0}={}) {
  const fade = Math.max(0, Math.min(1, (zoom - .48) / .34));
  if (!fade || !camera || width <= 0 || height <= 0) return [];
  camera.updateMatrixWorld();
  const sorted = [...markers].sort((a,b) => (b.priorityScore ?? (b.kind==='report'?100+(b.priority||0):b.kind==='truck'?80:b.kind==='outpost'?60:40))
    - (a.priorityScore ?? (a.kind==='report'?100+(a.priority||0):a.kind==='truck'?80:a.kind==='outpost'?60:40)) || a.id.localeCompare(b.id));
  const occupied = new Set(), result = [];
  for (const marker of sorted) {
    const projected = new THREE.Vector3(marker.x, scablandsSurfaceHeightAt(marker.x,marker.z)+4, marker.z).project(camera);
    const x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
    const labelWidth = Math.max(56, Math.min(190, String(marker.label).length * 7 + 20)), labelHeight = 24;
    const visible = projected.z >= -1 && projected.z <= 1 && x >= (clip?.left ?? 0) && x <= (clip?.right ?? width)
      && y >= (clip?.top ?? 0) && y <= (clip?.bottom ?? height);
    const left = x - labelWidth / 2, top = y - labelHeight / 2;
    const cells = [];
    if (visible) for (let cx=Math.floor(left/36);cx<=Math.floor((left+labelWidth)/36);cx++) for(let cy=Math.floor(top/28);cy<=Math.floor((top+labelHeight)/28);cy++) cells.push(`${cx}:${cy}`);
    const overlaps = cells.some(cell => occupied.has(cell));
    const shown = visible && !overlaps;
    if (shown) cells.forEach(cell => occupied.add(cell));
    result.push({id:marker.id,x,y,opacity:fade,visible:shown});
  }
  return result;
}
