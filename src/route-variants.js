// Curated seeds are part of race/ghost identity, not player-facing route names.
// These three layouts are audited together; do not expose arbitrary random
// seeds as tested route options.
export const ROUTE_VARIANTS = Object.freeze([
  Object.freeze({ id: 'route_a', label: 'Route A', seed: 1989 }),
  Object.freeze({ id: 'route_b', label: 'Route B', seed: 42 }),
  Object.freeze({ id: 'route_c', label: 'Route C', seed: 17 }),
]);
export const DEFAULT_ROUTE_VARIANT = 'route_a';
export const ROUTE_EVENT_IDS = Object.freeze([
  'pacific-canyon', 'high-country', 'harbor-highlands', 'ridge-rally',
]);
const fixedRoute = Object.freeze([ROUTE_VARIANTS[0]]);

export function isRouteVariant(id) {
  return typeof id === 'string' && ROUTE_VARIANTS.some(route => route.id === id);
}

// Invalid or absent saved selections safely return the original layout.
export function getRouteVariant(id = DEFAULT_ROUTE_VARIANT) {
  return ROUTE_VARIANTS.find(route => route.id === id) || ROUTE_VARIANTS[0];
}

// null distinguishes legacy/custom URL seeds from a curated route. Callers can
// keep that legacy run intact without silently relabeling it as Route A.
export function getRouteVariantForSeed(seed) {
  return Number.isSafeInteger(seed) ? ROUTE_VARIANTS.find(route => route.seed === seed) || null : null;
}

export function supportsRouteVariants(event) {
  const id = typeof event === 'string' ? event : event?.id;
  return ROUTE_EVENT_IDS.includes(id);
}

// Arena and city-chase centerlines ignore the seed. Offer one fixed route there
// rather than presenting their scenery changes as a different racing layout.
export function getRouteVariants(event) {
  return supportsRouteVariants(event) ? ROUTE_VARIANTS : fixedRoute;
}

export function resolveRouteVariant(event, id = DEFAULT_ROUTE_VARIANT) {
  return supportsRouteVariants(event) ? getRouteVariant(id) : ROUTE_VARIANTS[0];
}
