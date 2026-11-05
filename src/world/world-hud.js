import {SCABLANDS_PLACES} from './scablands.js';

const pointOf = value => value?.position ?? value;
const finitePoint = value => Number.isFinite(pointOf(value)?.x) && Number.isFinite(pointOf(value)?.z);
const labelOf = (value, places) => {
  const point = pointOf(value);
  const known = value?.id && places.find(place => place.id === value.id);
  return value?.name ?? known?.name ?? (value?.id ? value.id.replaceAll('-', ' ') :
    finitePoint(point) ? 'the marked place' : 'the next place');
};
const markerOf = (value, places) => {
  if (!finitePoint(value)) return null;
  const point = pointOf(value);
  return {id: value?.id ?? null, name: labelOf(value, places), x: point.x, z: point.z};
};

function nextFind(step, found) {
  return (step?.finds ?? []).find(item => !found.includes(item.id)) ?? null;
}

export function worldHudStep(step, {actors = [], inventory = [], found = []} = {}, places = SCABLANDS_PLACES) {
  if (!step) return {kind: null, line: 'Drive the Scablands', target: null};
  const actor = id => actors.find(item => item.id === id);
  let target = null, line;
  switch (step.kind) {
    case 'reach':
      target = step.place ?? step.destination;
      line = `Drive to ${labelOf(target, places)}`;
      break;
    case 'carry':
      target = step.destination ?? step.origin;
      line = `Carry ${labelOf({id: step.load}, places)} to ${labelOf(target, places)}`;
      break;
    case 'chase': {
      const targetActor = actor(step.targetId);
      target = targetActor ?? step.path?.at(-1);
      line = `Catch ${labelOf(step.actor ?? targetActor ?? {id: step.targetId}, places)}`;
      break;
    }
    case 'escort': {
      const convoy = actor(step.actorId);
      target = step.destination ?? step.path?.at(-1) ?? convoy?.position;
      line = `Keep ${labelOf(step.actor ?? {id: step.actorId}, places)} safe to ${labelOf(target, places)}`;
      break;
    }
    case 'onfoot': {
      target = step.places?.find(place => !found.includes(place.id)) ?? step.returnToCar;
      line = target === step.returnToCar ? 'Return to your car' : `Walk to ${labelOf(target, places)}`;
      break;
    }
    case 'heist':
      target = inventory.includes(step.takeId) ? step.escapePlace : step.zone;
      line = inventory.includes(step.takeId) ? `Carry ${labelOf({id: step.takeId}, places)} to your car` : `Take ${labelOf({id: step.takeId}, places)}`;
      break;
    case 'rescue': {
      const person = step.people?.find(item => !inventory.includes(item.id));
      target = person ?? step.home;
      line = person ? `Rescue ${labelOf(person, places)}` : `Bring everyone to ${labelOf(step.home, places)}`;
      break;
    }
    case 'defend':
      target = step.place;
      line = `Defend ${labelOf(target, places)}`;
      break;
    case 'explore': {
      const find = nextFind(step, found);
      target = find;
      line = find ? `Find ${labelOf(find, places)}` : 'Explore the Scablands';
      break;
    }
    default:
      target = step.place ?? step.destination ?? null;
      line = 'Keep going';
  }
  return {kind: step.kind, line, target: markerOf(target, places)};
}

export function worldHudModel({worldJob, player = null, heading = 0, found = [], places = SCABLANDS_PLACES} = {}) {
  const job = worldJob?.job, step = job?.steps?.[job.stepIndex] ?? null;
  const next = worldHudStep(step, {actors: worldJob?.actors, inventory: worldJob?.inventory, found}, places);
  const position = markerOf(player, places);
  const target = next.target;
  const dx = target && position ? target.x - position.x : 0;
  const dz = target && position ? target.z - position.z : 0;
  const bearing = target && position ? (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360 : null;
  const finds = [...(worldJob?.definition?.finds ?? []), ...(job?.steps ?? []).flatMap(item => item.finds ?? [])];
  return {
    line: next.line, kind: next.kind, target, bearing,
    arrow: bearing === null ? null : (bearing - (Number.isFinite(heading) ? heading * 180 / Math.PI : 0) + 360) % 360,
    places: places.map(place => ({id: place.id, name: place.name, x: place.x, z: place.z})),
    finds: finds.map(item => ({...markerOf(item, places), found: found.includes(item.id)})).filter(Boolean),
    player: position,
  };
}
