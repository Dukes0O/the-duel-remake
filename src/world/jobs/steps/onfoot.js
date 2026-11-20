import {stepBrand} from '../brand-rule.js';
import {stepDeckClimb, plateForPlace, routeToLevel} from '../../deck-plates.js';

const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));

// With `climbs: true` (SHIPS-DECKS) a place on a deck or a stair counts only for a fighter standing on that plate, and the
// marker points at the ladder to climb first. The climbing itself is src/world/deck-plates.js.
const levelOf = place => plateForPlace(place)?.id ?? 'ground';
function climbMarker(step, plate, target) {
  if (!step.climbs || !target) return target;
  const end = routeToLevel(plate ?? 'ground', levelOf(target));
  return end ? {x: end.x, y: target.y ?? 0, z: end.z} : target;
}

export function stepOnFoot(step, state, view, dt = 0) {
  if (step.brand) return stepBrand(step, state, view, dt);
  const climbing = step.climbs && view.onFoot ? stepDeckClimb(state, view) : null;
  const climb = climbing ? {plate: climbing.state.plate, fHeld: climbing.state.fHeld} : step.climbs ? {plate: null, fHeld: false} : {};
  const climbEvents = climbing?.events ?? [];
  if (!view.onFoot && !(step.requiresExit && (state.index ?? 0) >= (step.places?.length ?? 0)))
    return { state: step.climbs ? {...state, ...climb} : state,
      requests: [{ type: 'marker', place: step.places?.[state.index ?? 0]?.position }, { type: 'say', lineId: step.exitCarLineId }] };
  if (view.fighter?.knockedDown) {
    const index = state.index ?? 0;
    return { state: { index, ...climb }, restart: true, events: [...climbEvents, { type: 'knockedDown' }],
      requests: [{ type: 'marker', place: step.places?.[Math.max(0, index - 1)]?.position }] };
  }
  let index = state.index ?? 0;
  const events = [...climbEvents];
  const places = step.places ?? [];
  const onItsPlate = place => !step.climbs || levelOf(place.position) === (climb.plate ?? 'ground');
  while (index < places.length && onItsPlate(places[index]) &&
      distance(view.fighter?.position, places[index].position) <= (places[index].radius ?? step.radius ?? 3)) {
    events.push({ type: places[index].action === 'use' ? 'used' : 'lit', id: places[index].id });
    index++;
  }
  if (index >= places.length && step.requiresExit && view.onFoot) {
    const car = view.carPosition ?? step.returnToCar?.position ?? step.returnToCar;
    return {state: {index, ...climb}, complete: false, events,
      requests: [{type: 'marker', place: step.climbs && climb.plate ? climbMarker(step, climb.plate, {...car, y: 0}) : view.carPosition ?? step.returnToCar}]};
  }
  return { state: { index, ...climb }, complete: index >= places.length, events,
    requests: index < places.length ? [{ type: 'marker', place: climbMarker(step, climb.plate, places[index].position) },
      { type: 'say', lineId: places[index].hint }] : [] };
}
