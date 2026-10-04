const EFFECT_KINDS = new Set(['slick', 'grip', 'tether', 'disabled', 'burning', 'nitro']);
const effectsByCar = new WeakMap();
const steeringByCar = new WeakMap();
const alongPushByCar = new WeakMap();
const EPSILON = 1e-10;

export function setCarSteering(car, input) {
  steeringByCar.set(car, Number.isFinite(input) ? Math.max(-1, Math.min(1, input)) : 0);
}
export function carSteering(car) { return steeringByCar.get(car) || 0; }

// The existing push scalar follows the road normal. A body-sideways yank
// also has a road-forward component when the victim faces across the road.
export function addCarSidewaysPush(car, speed, headingError) {
  car.pushVelocity = (car.pushVelocity || 0) + speed * Math.cos(headingError);
  alongPushByCar.set(car, carAlongPush(car) - speed * Math.sin(headingError));
}
export function carAlongPush(car) { return alongPushByCar.get(car) || 0; }
export function dampCarAlongPush(car, factor) {
  const push = alongPushByCar.get(car);
  if (push !== undefined) alongPushByCar.set(car, push * factor);
}
export function clearCarAlongPush(car) { alongPushByCar.delete(car); }

export function carEffect(car, kind) {
  return effectsByCar.get(car)?.get(kind) || null;
}

export function carGrip(car) {
  return Math.min(1, ...['slick','grip'].map(kind => {
    const effect=carEffect(car,kind);
    return effect && Number.isFinite(effect.grip) ? Math.max(0,effect.grip) : 1;
  }));
}

// Timed penalties share one native ceiling; repeated strips refresh, never stack.
export function carTopSpeed(car) {
  const penalty = Math.min(1, ...['grip', 'tether'].map(kind => {
    const effect = carEffect(car, kind);
    return effect && Number.isFinite(effect.topSpeed) ? Math.max(0, effect.topSpeed) : 1;
  }));
  return penalty * (carEffect(car, 'nitro')?.topSpeed || 1);
}

export function carAcceleration(car) { return carEffect(car, 'nitro')?.acceleration || 1; }

export function setCarEffect(car, kind, {duration, ...data} = {}) {
  if (!car || !EFFECT_KINDS.has(kind) || !Number.isFinite(duration)) return null;
  let effects = effectsByCar.get(car);
  // Duration zero cancels one effect, leaving every other timed state intact.
  if (duration <= 0) {
    effects?.delete(kind);
    if (effects?.size === 0) effectsByCar.delete(car);
    return null;
  }
  if (!effects) effectsByCar.set(car, effects = new Map());
  const effect = {...data, remainingSec: duration};
  effects.set(kind, effect);
  return effect;
}

export function stepCarEffects(car, dt) {
  if (!(Number.isFinite(dt) && dt > 0)) return;
  const effects = effectsByCar.get(car);
  if (!effects) return;
  for (const [kind, effect] of effects) {
    effect.remainingSec = Math.max(0, effect.remainingSec - dt);
    if (effect.remainingSec <= EPSILON) effects.delete(kind);
  }
  if (!effects.size) effectsByCar.delete(car);
}

export function clearCarEffects(car) {
  effectsByCar.delete(car);
  steeringByCar.delete(car);
  clearCarAlongPush(car);
}
