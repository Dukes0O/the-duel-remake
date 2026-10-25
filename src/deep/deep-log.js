// The sea-life log and the pearls (docs/THE_DEEP.md 5, 6.4 to 6.6 and 10.1):
// which creature is logged where, what each log and pearl pays, and the cards.
// Pure and headless like deep-sirena.js: it reads the car's plain picture
// {x, z, speed (mph)}, measures against the zone's fixed spots and pearls (never
// the moving creatures, so the log does not depend on the renderer), uses no
// clock or randomness, and never touches race state. Events are plain objects in
// the duel.emit style ({deepLogged: {creature}}); the view and sound read them.
import {normalizeDeep} from './deep-discovery.js';

const KMH_PER_MPH = 1.609344;
const CREDIT_CAP = 1_000_000_000;

export const DEEP_LOG = Object.freeze({
  logRange: 6,        // metres (horizontal) from a creature's spot
  pearlRange: 3,      // metres from a pearl
  speedKmh: 15,       // under this, in km/h
  holdSeconds: 1,     // for this long, without a break
});
export const DEEP_LOG_PAY = Object.freeze({creature: 50, page: 250, pearl: 150});

// Section 5: each creature's name and the one true fact on its card.
export const DEEP_CREATURES = Object.freeze(Object.fromEntries([
  ['silver-school', 'Sardines', 'Sardines swim in schools of thousands. Turning together makes it hard for a hunter to pick out one fish.'],
  ['reef-fish', 'Reef fish', 'Bright colours help reef fish find their own kind among hundreds of others.'],
  ['turtle', 'Green turtle', 'Green turtles are named for the green fat under their shell, which comes from the seagrass they eat. They do live off Southern California.'],
  ['ray', 'Bat ray', 'Bat rays dig clams out of the sand by flapping their wings over it.'],
  ['manta', 'Manta', 'The biggest mantas are 7 m across, wider than a car is long, yet they eat only tiny plankton.'],
  ['sea-lion', 'California sea lion', 'Sea lions can turn their back flippers forward and walk on land. Seals cannot.'],
  ['otter', 'Sea otter', 'Otters eat sea urchins. Without otters, urchins eat the kelp and the forest disappears.'],
  ['crab', 'Kelp crab', "A crab's legs bend outward, so sideways is its fastest way to move."],
  ['moray', 'Moray', 'A moray has a second set of jaws in its throat that pulls food down.'],
  ['grouper', 'Grouper', 'A big grouper opens its mouth so fast that water rushes in and carries a fish with it.'],
  ['reef-shark', 'Reef shark', 'Sharks have no bones: their skeleton is cartilage, like the end of your nose.'],
  ['jellyfish', 'Jellyfish', 'Jellyfish have no brain, no heart and no bones, and are about 95% water.'],
  ['whale', 'Gray whale', 'Gray whales swim 16,000 to 20,000 km a year, from Alaska to Mexico and back.'],
  ['octopus', 'Octopus', 'An octopus has three hearts and can change colour in under a second.'],
].map(([id, name, fact]) => [id, Object.freeze({id, name, fact})])));

// One log page per coast, its creatures from section 5's "Where" column, and its
// three pearls (6.5). The turtle and the crab live on two coasts: logged once,
// they count on both pages.
export const DEEP_LOG_PAGES = Object.freeze([
  {coast: 'kelp-coast', name: 'Kelp Coast',
    creatures: ['silver-school', 'turtle', 'ray', 'sea-lion', 'otter', 'crab', 'whale'], pearls: ['kelp-1', 'kelp-2', 'kelp-3']},
  {coast: 'wreck-reef', name: 'Wreck Reef',
    creatures: ['reef-fish', 'turtle', 'manta', 'moray', 'grouper', 'reef-shark'], pearls: ['reef-1', 'reef-2', 'reef-3']},
  {coast: 'night-harbour', name: 'Night Harbour',
    creatures: ['crab', 'jellyfish', 'octopus'], pearls: ['night-1', 'night-2', 'night-3']},
].map(page => Object.freeze({...page, creatures: Object.freeze(page.creatures), pearls: Object.freeze(page.pearls)})));
export const DEEP_PEARLS = Object.freeze(DEEP_LOG_PAGES.flatMap(page => page.pearls));

export const logPicture = id => Object.hasOwn(DEEP_CREATURES, id) ? `/assets/deep/log/${id}.webp` : null;

const finite = value => Number.isFinite(value);
const validCar = car => car && finite(car.x) && finite(car.z) && finite(car.speed);
const slow = car => Math.abs(car.speed) * KMH_PER_MPH < DEEP_LOG.speedKmh;
const away = (point, car) => Math.hypot(point.x - car.x, point.z - car.z);

// A trail point plus `offset` sideways, positive to the left (heading +z, left +x:
// the left normal of a direction (tx, tz) is (tz, -tx)), as deep-sirena.js places finds.
function place(trail, trailIndex, offset = 0) {
  const n = trail.length, point = trail[trailIndex];
  const a = trail[(trailIndex + n - 1) % n], b = trail[(trailIndex + 1) % n];
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const tx = (b.x - a.x) / length, tz = (b.z - a.z) / length;
  return {x: point.x + tz * offset, z: point.z - tx * offset};
}

// The log for one dive. deepSave is profile.deep (any shape). With the switch
// off, or a zone with no trail, the state is inert: nothing is logged or found.
export function createLog(zone, deepSave, {enabled = false} = {}) {
  const trail = zone?.trail ?? [], saved = normalizeDeep(deepSave);
  const spots = trail.length ? (zone.spots ?? []).filter(spot => Object.hasOwn(DEEP_CREATURES, spot.creature))
    .map(spot => ({creature: spot.creature, ...place(trail, spot.trailIndex)})) : [];
  const pearls = trail.length ? (zone.pearls ?? []).filter(pearl => DEEP_PEARLS.includes(pearl.id))
    .map(pearl => ({pearl: pearl.id, ...place(trail, pearl.trailIndex, pearl.offset)})) : [];
  return {zoneId: zone?.id ?? null, active: enabled === true && trail.length > 0, spots, pearls,
    logged: new Set(saved.logged ?? []), found: new Set(saved.pearls ?? []), creatureHolds: new Map(), pearlHolds: new Map()};
}

// Each spot or pearl in reach keeps its own second; leaving reach (or going too
// fast) starts that one again, so two spots close together never cancel each other.
// The first to reach the second is logged; one creature and one pearl a frame at most.
function hold(holds, points, car, range, key, skip, dt) {
  const near = new Set(), done = [];
  for (const point of points) {
    if (skip(point[key]) || away(point, car) > range + 1e-9 || near.has(point[key])) continue;
    near.add(point[key]);
    const elapsed = (holds.get(point[key]) ?? 0) + dt;
    holds.set(point[key], elapsed);
    if (elapsed >= DEEP_LOG.holdSeconds - 1e-9) done.push([elapsed, point[key]]);
  }
  for (const id of [...holds.keys()]) if (!near.has(id)) holds.delete(id);
  done.sort((a, b) => b[0] - a[0]);
  return done[0]?.[1] ?? null;
}

// Each underwater frame. Within 6 m of a creature's spot (3 m of a pearl), under
// 15 km/h, for a second without a break, a creature not yet logged is logged and
// a pearl not yet found is found. A creature or pearl already in the save gives
// nothing. Events: deepLogged {creature}, deepPearl {pearl}.
export function stepLog(state, car, dt) {
  if (!state?.active || !finite(dt) || dt < 0) return [];
  const events = [];
  if (!validCar(car) || !slow(car)) { state.creatureHolds.clear(); state.pearlHolds.clear(); return events; }
  const creature = hold(state.creatureHolds, state.spots, car, DEEP_LOG.logRange, 'creature', id => state.logged.has(id), dt);
  if (creature) {
    state.logged.add(creature); state.creatureHolds.delete(creature);
    events.push({deepLogged: {creature}});
  }
  const pearl = hold(state.pearlHolds, state.pearls, car, DEEP_LOG.pearlRange, 'pearl', id => state.found.has(id), dt);
  if (pearl) {
    state.found.add(pearl); state.pearlHolds.delete(pearl);
    events.push({deepPearl: {pearl}});
  }
  return events;
}

// ---- the save: what is recorded, and what it pays, exactly once ---------------------

// Credits stop at the save's cap; a wallet already past it is left alone (as deep-sirena.js).
function payTo(profile, amount) {
  const held = Number(profile?.credits);
  const base = Number.isFinite(held) ? Math.max(0, Math.floor(held)) : 0;
  const credits = Math.max(base, Math.min(CREDIT_CAP, base + amount));
  return {credits, paid: credits - base};
}
// A list at its 128-id limit (only a crafted or newer save) makes room by dropping
// ids this game does not know, so the id just added survives loading.
function add(list, id, known) {
  let kept = list;
  while (kept.length >= 128 && kept.some(other => !known(other))) kept = kept.filter((other, i) => i !== kept.findIndex(x => !known(x)));
  return [...kept, id];
}
const isCreature = id => Object.hasOwn(DEEP_CREATURES, id);
const pageDone = (page, logged) => page.creatures.every(id => logged.includes(id));

// Records a creature in profile.deep.logged and pays 50 the first time; when that
// completes a coast's page, 250 more for each page it completes. Refused (profile
// unchanged, ok false) with the switch off or an unknown id; a creature already
// logged is ok, not recorded, with nothing paid. `pages` lists the coasts whose page this completed.
export function recordLogged(profile, creature, {enabled = false} = {}) {
  const same = ok => ({profile, ok, recorded: false, paid: 0, pages: []});
  if (enabled !== true || !isCreature(creature)) return same(false);
  const deep = normalizeDeep(profile?.deep), before = deep.logged ?? [];
  if (before.includes(creature)) return same(true);
  const logged = add(before, creature, isCreature);
  const pages = DEEP_LOG_PAGES.filter(page => page.creatures.includes(creature) && pageDone(page, logged)).map(page => page.coast);
  const {credits, paid} = payTo(profile, DEEP_LOG_PAY.creature + DEEP_LOG_PAY.page * pages.length);
  return {profile: {...profile, credits, deep: {...deep, logged}}, ok: true, recorded: true, paid, pages};
}

// Records a pearl in profile.deep.pearls and pays 150 the first time. `pearlWhite`
// is true when this was the ninth: the pearl-white finish (src/paint-presets.js)
// is earned from the save itself.
export function recordPearl(profile, pearl, {enabled = false} = {}) {
  const same = ok => ({profile, ok, recorded: false, paid: 0, pearlWhite: false});
  if (enabled !== true || !DEEP_PEARLS.includes(pearl)) return same(false);
  const deep = normalizeDeep(profile?.deep), before = deep.pearls ?? [];
  if (before.includes(pearl)) return same(true);
  const pearls = add(before, pearl, id => DEEP_PEARLS.includes(id));
  const {credits, paid} = payTo(profile, DEEP_LOG_PAY.pearl);
  return {profile: {...profile, credits, deep: {...deep, pearls}}, ok: true, recorded: true, paid,
    pearlWhite: DEEP_PEARLS.every(id => pearls.includes(id))};
}
export const hasAllPearls = profile => DEEP_PEARLS.every(id => (normalizeDeep(profile?.deep).pearls ?? []).includes(id));

// Ana's lines for a log event and what recordLogged or recordPearl returned
// (6.7): the otter line the first time an otter is logged, the log line for the
// others, then the page line when the Kelp Coast page completes (it names that
// coast). The pearl line speaks of abalone, so it is for Kelp Coast pearls.
export function phoneLineFor(event, result) {
  // `recorded`, not `paid`: a wallet at the credit cap is paid nothing but Ana still speaks.
  if (result?.recorded !== true) return [];
  if (event?.deepLogged) {
    const lines = [event.deepLogged.creature === 'otter' ? 'deep.ana.otter' : 'deep.ana.log'];
    if (result.pages?.includes('kelp-coast')) lines.push('deep.ana.page');
    return lines;
  }
  if (event?.deepPearl) return event.deepPearl.pearl.startsWith('kelp-') ? ['deep.ana.pearl'] : [];
  return [];
}

// The garage page (6.4): one row per coast already found, each creature with
// found true or false, and the pearl count.
export function logPage(profile) {
  const deep = normalizeDeep(profile?.deep), logged = deep.logged ?? [], pearls = deep.pearls ?? [];
  const found = deep.found ?? [];
  return {rows: DEEP_LOG_PAGES.filter(page => found.includes(page.coast)).map(page => ({coast: page.coast, name: page.name,
    complete: pageDone(page, logged), creatures: page.creatures.map(id => ({...DEEP_CREATURES[id], found: logged.includes(id),
      picture: logPicture(id)})), pearls: page.pearls.filter(id => pearls.includes(id)).length, pearlTotal: page.pearls.length})),
  pearls: DEEP_PEARLS.filter(id => pearls.includes(id)).length, pearlTotal: DEEP_PEARLS.length};
}

// One picture card, for the garage page and for the card that slides in during a
// dive. A creature not yet found is a grey shape with no name or fact.
export function logCardMarkup(creature, {found = true, escape = text => text} = {}) {
  const id = typeof creature === 'string' ? creature : creature?.id;
  if (!Object.hasOwn(DEEP_CREATURES, id)) return '';
  const item = DEEP_CREATURES[id], picture = logPicture(item.id);
  const image = picture ? `<img src="${picture}" alt="${found ? escape(item.name) : 'Not found yet'}" loading="lazy">` : '<span class="deep-log-blank"></span>';
  return found
    ? `<article class="deep-log-card" data-creature="${item.id}">${image}<h4>${escape(item.name)}</h4><p>${escape(item.fact)}</p></article>`
    : `<article class="deep-log-card deep-log-unknown" data-creature="${item.id}">${image}<h4>?</h4></article>`;
}
