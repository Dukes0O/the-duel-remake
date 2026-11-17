// Light the Town's load and lamps. The existing fighter owns all movement.
// All state here lasts for one job; none of it changes the career save.
export const BRAND_RULE = Object.freeze({
  burnSeconds: 90,
  relightRadius: 3,
  lampRadius: 2,
  lampSeconds: 2,
  standingSpeed: 0.1,
  duskSeconds: 240,
  ashWaves: Object.freeze([1, 2]),
  smotherRadius: 2,
  smotherSeconds: 4,
  throwRange: 8,
  throwSeconds: 5,
  throwWarningSeconds: 1,
  ashRadius: 2,
  swingRadius: 2,
  handFlamerRadius: 6,
  wallRadius: 2,
  ashWalkMps: 4.5,
  recoveryOffset: 1,
  pay: Object.freeze({one: 100, two: 70, many: 50}),
});

const spot = value => value?.position ?? value;
const distance = (a, b) => a && b
  ? Math.hypot(a.x - b.x, (a.y ?? 0) - (b.y ?? 0), a.z - b.z) : Infinity;

// Decisions for the existing job raiders. The arena supplies their positions
// and moves them with its normal foot mover; this rule never moves a fighter.
export function stepBrandAsh(step, state, view, dt = 0) {
  const lamps = step.places ?? [], entries = step.ashEntries ?? [];
  const here = view.onFoot ? view.fighter?.position : view.player?.position;
  const next = {...state, seen: [...(state.seen ?? [])], men: {...state.men}};
  const requests = [], events = [], smotheredLamps = [];
  let brandAshed = false;
  const nearest = (places, from) => places.reduce((best, place) =>
    distance(spot(place), from) < distance(spot(best), from) ? place : best, null);
  const farthest = from => entries.reduce((best, entry) =>
    !best || distance(spot(entry), from) > distance(spot(best), from) ? entry : best, null);
  for (const lamp of lamps) if (view.lamps?.[lamp.id] && !next.seen.includes(lamp.id)) next.seen.push(lamp.id);
  let wave = state.wave ?? 0;
  while (wave < BRAND_RULE.ashWaves.length && next.seen.length > wave && entries.length && here) {
    const from = farthest(here);
    for (let index = 0; index < BRAND_RULE.ashWaves[wave]; index++) {
      const id = `town-ash-${wave}-${index}`;
      // Exactly one lamp smotherer; the other two throw ash at the player.
      next.men[id] = {role: wave === 0 ? 'smother' : 'throw', throwWait: 0};
      requests.push({type: 'spawnBrandAsh', id, from});
    }
    wave++;
  }
  next.wave = wave;
  for (const actor of view.ashMen ?? []) {
    if (!next.men[actor.id]) continue;
    const man = next.men[actor.id] = {...next.men[actor.id]};
    if (man.gone) continue;
    const at = spot(actor), playerGap = distance(at, here);
    const hit = view.onFoot && ((view.brandSwing && view.brandSeconds > 0 && playerGap <= BRAND_RULE.swingRadius) ||
      ((view.handFlamerHits ?? []).includes(actor.id) && playerGap <= BRAND_RULE.handFlamerRadius));
    if (hit && !man.fleeing) {
      man.fleeing = true;
      man.wall = nearest(entries, at);
      man.ash = null;
      events.push({type: 'ashFled', id: actor.id});
    }
    if (man.fleeing) {
      if (distance(at, spot(man.wall)) <= BRAND_RULE.wallRadius) {
        man.gone = true;
        requests.push({type: 'removeBrandAsh', id: actor.id});
      } else requests.push({type: 'moveBrandAsh', id: actor.id, place: man.wall});
      continue;
    }
    if (man.role === 'smother') {
      const lamp = nearest(lamps.filter(candidate => view.lamps?.[candidate.id]), at);
      if (lamp && man.lamp !== lamp.id) {
        events.push({type: 'lampThreatened', id: lamp.id});
        man.smotherSeconds = 0;
      }
      man.lamp = lamp?.id ?? null;
      man.smotherSeconds = lamp && distance(at, spot(lamp)) <= BRAND_RULE.smotherRadius
        ? (man.smotherSeconds ?? 0) + dt : 0;
      if (lamp) requests.push({type: 'moveBrandAsh', id: actor.id, place: lamp});
      if (man.smotherSeconds >= BRAND_RULE.smotherSeconds) {
        smotheredLamps.push(lamp.id);
        man.smotherSeconds = 0;
      }
    } else {
      man.throwWait = Math.max(0, man.throwWait - dt);
      if (man.ash) {
        man.ash = {...man.ash, remaining: man.ash.remaining - dt};
        if (man.ash.remaining <= 0) {
          if (view.onFoot && distance(here, man.ash.position) <= BRAND_RULE.ashRadius) brandAshed = true;
          man.ash = null;
        }
      }
      if (!man.ash && man.throwWait === 0 && view.onFoot && playerGap <= BRAND_RULE.throwRange) {
        man.ash = {position: {...here}, remaining: BRAND_RULE.throwWarningSeconds};
        man.throwWait = BRAND_RULE.throwSeconds;
        events.push({type: 'ashThrow', id: actor.id, position: {...here}});
      }
      if (playerGap > BRAND_RULE.throwRange && here) requests.push({type: 'moveBrandAsh', id: actor.id, place: {position: here}});
    }
  }
  return {state: next, requests, events, smotheredLamps, brandAshed};
}

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
  const ash = step.ashEntries?.length ? stepBrandAsh(step, state.brandAsh ?? {},
    {...view, lamps: next.lamps, brandSeconds: next.brandSeconds}, dt) : null;
  if (ash) {
    next.brandAsh = ash.state;
    events.push(...ash.events);
    requests.push(...ash.requests);
  }
  const here = view.onFoot ? view.fighter?.position : null;
  const carried = next.brandsUsed > 0;
  if (carried) next.brandElapsed += dt;
  next.dusk = Math.min(1, next.brandElapsed / rule.duskSeconds);

  for (const id of [...(view.smotheredLamps ?? []), ...(ash?.smotheredLamps ?? [])]) {
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
    next.brandSeconds = view.brandAshed || ash?.brandAshed ? 0 : Math.max(0, next.brandSeconds - dt);
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
