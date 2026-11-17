// Light the Town's load and lamps. The existing fighter owns all movement.
// All state here lasts for one job; none of it changes the career save.
export const BRAND_RULE = Object.freeze({
  burnSeconds: 90,
  relightRadius: 3,
  lampRadius: 2,
  lampSeconds: 2,
  standingSpeed: 0.1,
  duskSeconds: 240,
  pay: Object.freeze({one: 100, two: 70, many: 50}),
});

const spot = value => value?.position ?? value;
const distance = (a, b) => a && b
  ? Math.hypot(a.x - b.x, (a.y ?? 0) - (b.y ?? 0), a.z - b.z) : Infinity;

export function brandPay(brandsUsed) {
  return brandsUsed === 1 ? BRAND_RULE.pay.one
    : brandsUsed === 2 ? BRAND_RULE.pay.two : BRAND_RULE.pay.many;
}

export function brandSentence(brandsUsed) {
  return brandsUsed === 1 ? 'You lit the town with one brand.'
    : brandsUsed === 2 ? 'You lit the town with two brands.'
      : `You lit the town with ${brandsUsed} brands.`;
}

// Called by the existing onfoot step only when it names a brand and hearth.
// Ash impacts and lamp smothering are facts supplied by the job's opponents.
export function stepBrand(step, state, view, dt) {
  const rule = BRAND_RULE;
  const next = {...state, lamps: {...state.lamps},
    brandSeconds: state.brandSeconds ?? 0, brandsUsed: state.brandsUsed ?? 0,
    brandElapsed: state.brandElapsed ?? 0};
  const events = [], requests = [];
  const lamps = step.places ?? [];
  const here = view.onFoot ? view.fighter?.position : null;
  const carried = next.brandsUsed > 0;
  if (carried) next.brandElapsed += dt;
  next.dusk = Math.min(1, next.brandElapsed / rule.duskSeconds);

  for (const id of view.smotheredLamps ?? []) {
    if (next.lamps[id] && lamps.some(lamp => lamp.id === id)) {
      next.lamps[id] = false;
      events.push({type: 'lampSmothered', id});
    }
  }

  // A knockdown's recovery request is issued once, even across many frames.
  if (view.onFoot && view.fighter?.knockedDown) {
    if (!state.brandKnockdown) {
      const last = lamps.find(lamp => lamp.id === state.lastLamp);
      requests.push({type: 'brandRecovery', place:
        view.difficulty === 'easy' && last ? last : step.hearth});
      next.brandSeconds = rule.burnSeconds;
      next.brandsUsed++;
      events.push({type: 'brandCatch'});
    }
    next.brandKnockdown = true;
    next.lightingLamp = null;
    next.lightingSeconds = 0;
    return {state: next, complete: false, events, requests};
  }
  next.brandKnockdown = false;

  if (here && carried && next.brandSeconds > 0) {
    next.brandSeconds = view.brandAshed ? 0 : Math.max(0, next.brandSeconds - dt);
    if (next.brandSeconds === 0) events.push({type: 'brandOut'});
  }
  const source = here && [step.hearth, ...lamps.filter(lamp => next.lamps[lamp.id])]
    .find(place => distance(here, spot(place)) <= rule.relightRadius);
  if (source) {
    if (next.brandSeconds === 0) {
      next.brandsUsed++;
      events.push({type: 'brandCatch', id: source.id});
    }
    next.brandSeconds = rule.burnSeconds;
  }

  const lamp = here && Math.abs(view.fighter?.speed ?? 0) <= rule.standingSpeed &&
    next.brandSeconds > 0 && lamps.find(candidate =>
    !next.lamps[candidate.id] && distance(here, spot(candidate)) <= rule.lampRadius);
  next.lightingLamp = lamp ? lamp.id : null;
  next.lightingSeconds = lamp
    ? (state.lightingLamp === lamp.id ? state.lightingSeconds ?? 0 : 0) + dt : 0;
  if (lamp && next.lightingSeconds + 1e-9 >= rule.lampSeconds) {
    next.lamps[lamp.id] = true;
    next.lastLamp = lamp.id;
    next.lightingLamp = null;
    next.lightingSeconds = 0;
    events.push({type: 'lit', id: lamp.id});
  }
  const unlit = lamps.filter(candidate => !next.lamps[candidate.id]);
  const nearest = places => places.reduce((best, place) =>
    distance(here, spot(place)) < distance(here, spot(best)) ? place : best, null);
  const marker = next.brandSeconds > 0 ? nearest(unlit)
    : nearest([step.hearth, ...lamps.filter(candidate => next.lamps[candidate.id])]);
  if (marker) requests.push({type: 'marker', place: marker});
  return {state: next, complete: lamps.length > 0 && unlit.length === 0, events, requests};
}
