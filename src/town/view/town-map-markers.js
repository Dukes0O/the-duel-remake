import {SCABLANDS_PLACES} from '../../world/scablands.js';
import {TOWN_NEIGHBOURS} from '../content/neighbours.js';
import {updateTownCamera} from './town-camera.js';

const point = value => {
  const x = Number(value?.x ?? value?.position?.x), z = Number(value?.z ?? value?.position?.z);
  return Number.isFinite(x) && Number.isFinite(z) ? {x, z} : null;
};

function placeForName(name, places) {
  const text = String(name || '').trim().toLowerCase();
  return places.find(place => text && (text === place.id.toLowerCase() || text === place.name.toLowerCase()
    || text.includes(place.id.replaceAll('-', ' ')) || text.includes(place.name.toLowerCase())));
}

function reportPoint(report, buildings, places) {
  const facts = report.facts || {};
  const direct = point(facts) || point(facts.position) || point(facts.cell);
  if (direct) return direct;
  const site = buildings.find(building => building.id === facts.siteId);
  if (site) return {x: (site.x + (site.width || 1) / 2) * 8, z: (site.z + (site.depth || 1) / 2) * 8};
  if (String(report.where || '').trim().toLowerCase() === 'town') return {x: 0, z: 0};
  return point(facts.place) || placeForName(report.where, places) || null;
}

function truckPoint(truck) {
  const explicit = point(truck) || point(truck.position);
  if (explicit) return explicit;
  if (!Array.isArray(truck.path) || !truck.path.length) return null;
  const index = Math.max(0, Math.min(truck.path.length - 1, Number(truck.pathIndex) || 0));
  const from = truck.path[index], to = truck.path[Math.min(index + 1, truck.path.length - 1)];
  const progress = Math.max(0, Math.min(1, Number(truck.progress) || 0));
  const a = point(from), b = point(to);
  return a && b ? {x: (a.x + (b.x - a.x) * progress) * 8, z: (a.z + (b.z - a.z) * progress) * 8} : null;
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
    const location = point(state) || point(state?.position) || point(neighbour);
    if (state && location) markers.push({id: `outpost:${neighbour.id}`, kind: 'outpost', label: neighbour.name,
      ...location, target: location});
    for (const truck of state?.trucks || []) {
      const position = truckPoint(truck);
      if (position) markers.push({id: `truck:${truck.id}`, kind: 'truck', label: `${truck.vehicle || 'Truck'} on the road`,
        ...position, target: position});
    }
  }
  for (const truck of town.haulers || town.vehicles || []) {
    const position = truckPoint(truck);
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
