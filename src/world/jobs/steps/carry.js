import {emberLoss, emberGrade, emberPay} from '../ember-rule.js';

const spot = value => value?.position ?? value ?? {};
const gap = (a, b) => Math.hypot((a?.x ?? 0) - (spot(b).x ?? 0), (a?.z ?? 0) - (spot(b).z ?? 0));

// A carry that holds a live ember (step.ember, src/world/jobs/ember-rule.js). Driving takes ember; at 0 the pot is out and the
// marker moves to a brazier, where the player can stop for a scoop.
// The job does not end and the car is not moved. It completes at the destination only with the pot alight.
function stepEmberCarry(step, state, view, dt) {
  const rule = step.ember, here = view.player?.position ?? {};
  const events = [], requests = [];
  // The pickup is a job phase: cold and jolts start only after Cinder has spoken.
  if (step.pickup && !state.loaded) {
    const place = step.pickup.place;
    if (!state.pickingUp) {
      const stopped = Math.abs(view.speedKmh ?? 0) < 1;
      if (stopped && gap(here, place) <= step.pickup.radius) {
        return {state: {...state, pickingUp: true}, complete: false, events: [],
          requests: [{type: 'marker', place}, ...step.pickup.lines.map(lineId => ({type: 'say', lineId}))]};
      }
    } else if ((state.lineQueue?.length ?? 0) === 0 && (state.lineRemaining ?? 0) <= 0) {
      state = {...state, loaded: true, ember: rule.start};
    }
    if (!state.loaded) return {state, complete: false, events: [], requests: [{type: 'marker', place}]};
  }
  if (step.burnable && (view.thingsHit ?? []).some(hit => hit.kind === 'barricade' && hit.burnable)) {
    for (const hit of view.thingsHit.filter(hit => hit.kind === 'barricade' && hit.burnable)) events.push({type: 'burn', id: hit.id});
  }
  let safeIndex = state.safeIndex ?? 0, ember = state.ember ?? rule.start, relights = state.relights ?? 0, out = state.out === true;
  while (safeIndex < (step.safePoints ?? []).length && gap(here, step.safePoints[safeIndex]) <= (spot(step.safePoints[safeIndex]).radius ?? 5)) safeIndex++;
  const next = {...state, safeIndex, ember, relights, out, rate: 0, jolt: state.jolt ?? 0, joltCount: state.joltCount ?? 0};
  if (!out) {
    const loss = emberLoss(rule, {kmh: view.speedKmh ?? 0, lostKmh: view.hitKmh ?? 0, safeKmh: view.safeKmh, difficulty: view.difficulty, dt});
    next.ember = Math.max(0, Math.min(rule.start, ember - loss.total));
    // How fast the pot is losing ember from rough ground and hits, per second (cold alone is slower than 1).
    next.rate = dt > 0 ? (loss.rough + loss.hit) / dt : 0;
    if (loss.hit > 0) { next.jolt = loss.hit; next.joltCount++; events.push({type: 'emberJolt', amount: loss.hit}); }
    if (next.ember <= 0) {
      next.out = true; next.rate = 0;
      events.push({type: 'emberOut'});
      requests.push({type: 'say', lineId: step.spillLineId});
    }
  }
  if (step.braziers) {
    const used = state.scoopedBraziers ?? [];
    const brazier = step.braziers.find(place => !used.includes(place.id) && gap(here, place) <= 8);
    const stopping = brazier && Math.abs(view.speedKmh ?? 0) < 1;
    const scoopTime = stopping ? (state.scoopBrazier === brazier.id ? (state.scoopTime ?? 0) : 0) + dt : 0;
    next.scoopBrazier = stopping ? brazier.id : null;
    next.scoopTime = scoopTime;
    if (stopping && scoopTime >= 3) {
      const wasOut = next.out;
      next.ember = Math.min(rule.start, next.ember + 25);
      next.out = false;
      next.relights = relights + (wasOut ? 1 : 0);
      next.scoopedBraziers = [...used, brazier.id];
      next.scoopBrazier = null;
      next.scoopTime = 0;
      events.push({type: 'emberRelit', place: brazier.id});
    }
  }
  if (next.out) {
    // The nearest place a fresh scoop can be taken: the yard gate always, the halfway camp once passed.
    const scoops = [step.origin, ...(step.safePoints ?? []).slice(0, safeIndex)].filter(Boolean);
    const nearest = scoops.reduce((best, place) => gap(here, place) < gap(here, best) ? place : best, scoops[0]);
    requests.push({type: 'marker', place: nearest});
    if (!step.braziers && out && nearest && gap(here, nearest) <= (spot(nearest).radius ?? 5) && (view.speedKmh ?? 0) < rule.scoopKmh) {
      next.ember = rule.start; next.out = false; next.relights = relights + 1;
      events.push({type: 'emberRelit', place: nearest.id ?? null});
      requests[requests.length - 1] = {type: 'marker', place: step.destination};
    }
    return {state: next, complete: false, events, requests};
  }
  requests.push({type: 'marker', place: step.destination});
  const complete = gap(here, step.destination) <= (step.radius ?? 5);
  if (complete) events.push({type: 'emberArrived', ember: next.ember, relights: next.relights,
    grade: emberGrade(rule, next.ember), pay: emberPay(rule, next.ember, next.relights)});
  return {state: next, complete, events, requests};
}

export function stepCarry(step, state, view, dt = 0) {
  if (step.ember) return stepEmberCarry(step, state, view, dt);
  const events = [];
  const requests = [{ type: 'marker', place: step.destination }];
  if (step.burnable && (view.thingsHit ?? []).some(hit => hit.kind === 'barricade' && hit.burnable)) {
    for (const hit of view.thingsHit.filter(hit => hit.kind === 'barricade' && hit.burnable)) events.push({ type: 'burn', id: hit.id });
  }
  if ((view.crashSize ?? 0) > (step.crashLimit ?? Infinity)) {
    events.push({ type: 'spilled', load: step.load });
    requests.push({ type: 'say', lineId: step.spillLineId }, { type: 'marker', place: step.safePoints?.[state.safeIndex ?? 0] ?? step.origin });
    return { state: { safeIndex: state.safeIndex ?? 0 }, restart: true, events, requests };
  }
  let safeIndex = state.safeIndex ?? 0;
  while (safeIndex < (step.safePoints ?? []).length && Math.hypot((view.player?.position?.x ?? 0) - (step.safePoints[safeIndex].position?.x ?? step.safePoints[safeIndex].x ?? 0), (view.player?.position?.z ?? 0) - (step.safePoints[safeIndex].position?.z ?? step.safePoints[safeIndex].z ?? 0)) <= (step.safePoints[safeIndex].radius ?? 5)) safeIndex++;
  const atDestination = Math.hypot((view.player?.position?.x ?? 0) - (step.destination?.position?.x ?? step.destination?.x ?? 0), (view.player?.position?.z ?? 0) - (step.destination?.position?.z ?? step.destination?.z ?? 0)) <= (step.radius ?? 5);
  return { state: { safeIndex }, complete: atDestination, events, requests };
}
