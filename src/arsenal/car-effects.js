const EFFECT_KINDS = new Set(['slick', 'grip', 'tether', 'disabled', 'burning', 'nitro']);
const effectsByCar = new WeakMap();
const EPSILON = 1e-10;

export function carEffect(car, kind) {
  return effectsByCar.get(car)?.get(kind) || null;
}

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
}
