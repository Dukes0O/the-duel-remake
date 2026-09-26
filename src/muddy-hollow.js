// Deterministic phase-one ground for the hidden High Country playground.
// The course is complete before this installer runs, so the zone cannot alter
// its samples, generated features, scenery or random stream.
const FRAME_S = 2400;
const ZONE_ALONG_RADIUS = 190;
const ZONE_LATERAL_RADIUS = 180;
const ZONE_LATERAL_CENTER = 205;
const INNER_BLEND_RADIUS = .65;
const DEPARTURE_BOUNDARY = Object.freeze({
  alongMin: -70.8,
  alongMax: 70.8,
  lateral: 84,
});

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, value));
const smooth = value => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const smoother = value => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (from, to, amount) => from + (to - from) * amount;

function gaussian(along, lateral, feature, height) {
  const da = (along - feature.along) / feature.alongRadius;
  const dl = (lateral - feature.lateral) / feature.lateralRadius;
  return height * Math.exp(-(da * da + dl * dl) * 2);
}

function makeFrame(course) {
  const origin = course.worldAt(FRAME_S);
  const sin = Math.sin(origin.heading);
  const cos = Math.cos(origin.heading);
  return {
    origin,
    toLocal(x, z) {
      const dx = x - origin.x;
      const dz = z - origin.z;
      return { along: dx * sin + dz * cos, lateral: dx * cos - dz * sin };
    },
    toWorld(along, lateral) {
      return {
        x: origin.x + sin * along + cos * lateral,
        z: origin.z + cos * along - sin * lateral,
      };
    },
  };
}

function publicFeature(frame, definition) {
  const { along, lateral, ...details } = definition;
  return { ...details, center: frame.toWorld(along, lateral) };
}

export function installMuddyHollow(course) {
  if(course.def?.id !== 'high-country' || course.muddyHollow) return course.muddyHollow;

  const frame = makeFrame(course);
  const authored = {
    ridge: { along: 0, lateral: 58, alongRadius: 118, lateralRadius: 24 },
    valleyBowl: { along: 0, lateral: 205, alongRadius: 150, lateralRadius: 150 },
    hill: { along: 102, lateral: 267, alongRadius: 36, lateralRadius: 38 },
    pondBed: { along: -73, lateral: 225, alongRadius: 42, lateralRadius: 34 },
    pits: [
      { along: -88, lateral: 157, alongRadius: 22, lateralRadius: 19 },
      { along: 11, lateral: 248, alongRadius: 21, lateralRadius: 20 },
      { along: 72, lateral: 174, alongRadius: 23, lateralRadius: 18 },
    ],
    ramps: [
      { along: -119, lateral: 268, alongRadius: 25, lateralRadius: 13, height: 14, kind: 'mega-jump' },
      { along: 119, lateral: 210, alongRadius: 23, lateralRadius: 12, height: 4.5, kind: 'dirt-kicker' },
      { along: -17, lateral: 319, alongRadius: 22, lateralRadius: 12, height: 5.5, kind: 'dirt-kicker' },
      { along: 61, lateral: 112, alongRadius: 25, lateralRadius: 11, height: 5.5, kind: 'dirt-kicker' },
      { along: -123, lateral: 124, alongRadius: 24, lateralRadius: 12, height: 3.8, kind: 'log-ramp', direction: { along: 0, lateral: 1 } },
    ],
    rocks: [
      { along: 32, lateral: 208, halfX: .8, halfZ: 1.05, height: 1.3, heading: -.28 },
      { along: 42, lateral: 216, halfX: 1.05, halfZ: .85, height: 1.55, heading: .36 },
      { along: 51, lateral: 207, halfX: .9, halfZ: 1.15, height: 1.75, heading: -.12 },
      { along: 59, lateral: 219, halfX: 1.1, halfZ: .9, height: 1.45, heading: .48 },
      { along: 69, lateral: 210, halfX: .95, halfZ: 1.2, height: 1.85, heading: -.4 },
      { along: 78, lateral: 222, halfX: 1.15, halfZ: .9, height: 1.6, heading: .18 },
      { along: 87, lateral: 213, halfX: .85, halfZ: 1.05, height: 1.35, heading: -.5 },
    ],
  };

  const landforms = {
    ridge: publicFeature(frame, { ...authored.ridge, id: 'alpine-ridge', name: 'Alpine Summit ridge', span: 236 }),
    valleyBowl: publicFeature(frame, { ...authored.valleyBowl, id: 'muddy-hollow-bowl', name: 'Muddy Hollow valley bowl', diameter: 300, span: 300 }),
    hill: publicFeature(frame, { ...authored.hill, id: 'king-of-the-hill', name: 'King of the Hill', diameter: 72 }),
    pondBed: publicFeature(frame, { ...authored.pondBed, id: 'shallow-pond-bed', name: 'Shallow pond bed', diameter: 84 }),
    pits: authored.pits.map((pit, index) => publicFeature(frame, {
      ...pit,
      id: `mud-pit-${index + 1}`,
      name: `Mud pit ${index + 1}`,
      diameter: pit.alongRadius * 2,
    })),
    ramps: authored.ramps.map((ramp, index) => publicFeature(frame, {
      ...ramp,
      id: `ramp-site-${index + 1}`,
      name: index === 0 ? 'Mega jump site' : index === 4 ? 'Log ramp site' : `Dirt kicker ${index}`,
      length: ramp.alongRadius * 2,
      width: ramp.lateralRadius * 2,
    })),
  };

  function normalizedRadius(x, z) {
    const local = frame.toLocal(x, z);
    return {
      ...local,
      radius: Math.hypot(
        local.along / ZONE_ALONG_RADIUS,
        (local.lateral - ZONE_LATERAL_CENTER) / ZONE_LATERAL_RADIUS,
      ),
    };
  }

  function baseHeightAt(x, z) {
    const nearest = course.nearest(x, z, FRAME_S);
    return course._baseGroundAt(nearest.s, nearest.lateral).y;
  }

  function contains(x, z) {
    return normalizedRadius(x, z).radius <= 1 + 1e-9;
  }

  function featureAmount(local, feature) {
    const along = (local.along - feature.along) / feature.alongRadius;
    const lateral = (local.lateral - feature.lateral) / feature.lateralRadius;
    return smoother(1 - Math.hypot(along, lateral));
  }

  function surfaceAt(x, z) {
    const local = frame.toLocal(x, z);
    let mud = 0;
    for(const pit of authored.pits) mud = Math.max(mud, featureAmount(local, pit));
    return {
      mud: clamp(mud),
      waterDepth: clamp(featureAmount(local, authored.pondBed)),
    };
  }

  function heightAt(x, z) {
    const local = normalizedRadius(x, z);
    const base = baseHeightAt(x, z);
    if(local.radius >= 1) return base;

    // The broad field forms the bowl. Compact signed forms then create the
    // named play sites without random noise or changes to course generation.
    let authoredHeight = frame.origin.y - 5;
    authoredHeight += gaussian(local.along, local.lateral, authored.ridge, 33);
    authoredHeight += gaussian(local.along, local.lateral, authored.hill, 27);
    authoredHeight += gaussian(local.along, local.lateral, authored.pondBed, -6);
    for(const pit of authored.pits) authoredHeight += gaussian(local.along, local.lateral, pit, -8);
    for(const ramp of authored.ramps) authoredHeight += gaussian(local.along, local.lateral, ramp, ramp.height);

    // Quintic smootherstep reaches the unchanged course height with zero slope
    // at the ellipse edge, avoiding a seam where the two ground fields meet.
    const blend = smoother((1 - local.radius) / (1 - INNER_BLEND_RADIUS));
    return lerp(base, authoredHeight, blend);
  }

  const rocks = authored.rocks.map((rock, index) => {
    const point = frame.toWorld(rock.along, rock.lateral);
    const pose = course.nearest(point.x, point.z, FRAME_S);
    return {
      id: `muddy-hollow-rock-${index + 1}`,
      kind: 'rock',
      shape: 'box',
      x: point.x,
      y: heightAt(point.x, point.z),
      z: point.z,
      s: pose.s,
      off: pose.lateral,
      halfX: rock.halfX,
      halfZ: rock.halfZ,
      height: rock.height,
      heading: frame.origin.heading + rock.heading,
    };
  });
  const gardenCenter = frame.toWorld(60, 215);
  landforms.rockGarden = {
    id: 'rock-garden',
    name: 'Rock garden',
    center: gardenCenter,
    rocks,
  };
  const summit = frame.toWorld(authored.hill.along, authored.hill.lateral);
  landforms.hill.flag = {
    id: 'king-of-the-hill-flag',
    name: 'King of the Hill flag',
    center: summit,
    baseY: heightAt(summit.x, summit.z),
    height: 7,
  };

  function obstaclesNear(fromS, toS = fromS) {
    const minimum = Math.min(fromS, toS) - 16;
    const maximum = Math.max(fromS, toS) + 16;
    return rocks.filter(rock => rock.s >= minimum && rock.s <= maximum);
  }

  course.muddyHollow = {
    frame: {
      s: FRAME_S,
      origin: { x: frame.origin.x, y: frame.origin.y, z: frame.origin.z },
      heading: frame.origin.heading,
      side: 1,
    },
    bounds: {
      alongRadius: ZONE_ALONG_RADIUS,
      lateralRadius: ZONE_LATERAL_RADIUS,
      lateralCenter: ZONE_LATERAL_CENTER,
    },
    landforms,
    departureBoundary: DEPARTURE_BOUNDARY,
    contains,
    heightAt,
    surfaceAt,
    obstacles: rocks,
    obstaclesNear,
  };
  return course.muddyHollow;
}

function localPosition(zone, point) {
  const dx = point.x - zone.frame.origin.x;
  const dz = point.z - zone.frame.origin.z;
  return {
    along: dx * Math.sin(zone.frame.heading) + dz * Math.cos(zone.frame.heading),
    lateral: dx * Math.cos(zone.frame.heading) - dz * Math.sin(zone.frame.heading),
  };
}

function departurePosition(duel, distance, lateral) {
  return localPosition(duel.course.muddyHollow,
    duel.course.worldAt(distance, lateral));
}

export function initializeMuddyHollowDeparture(duel) {
  const state = duel.state;
  state.muddyHollowDeparture = null;
  if (!duel.course.muddyHollow) return;
  duel._muddyHollowDepartureSerial =
    (duel._muddyHollowDepartureSerial || 0) + 1;
  state.muddyHollowDeparture = {
    id: duel._muddyHollowDepartureSerial,
    departed: false,
    elapsedSec: 0,
  };
}

export function nearMuddyHollowDeparture(duel) {
  const state = duel.state;
  const zone = duel.course?.muddyHollow;
  const departure = state.muddyHollowDeparture;
  if (!zone || !departure || departure.departed ||
      state.status !== 'racing' || state.car !== 'titan_monster' ||
      state.onFoot || state.airborne || state.impactTimer > 0) return false;
  const local = departurePosition(duel, state.s, state.lateral);
  const world = duel.course.worldAt(state.s, state.lateral);
  const boundary = zone.departureBoundary;
  return zone.contains(world.x, world.z) &&
    local.along >= boundary.alongMin && local.along <= boundary.alongMax &&
    local.lateral >= boundary.lateral - 20;
}

export function checkMuddyHollowDeparture(duel) {
  const state = duel.state;
  const zone = duel.course?.muddyHollow;
  const departure = state.muddyHollowDeparture;
  if (!zone || !departure || departure.departed ||
      state.status !== 'racing' || state.car !== 'titan_monster' ||
      state.onFoot || state.airborne || state.prevAirHeight > 0) return false;
  if (![state.prevS, state.prevLateral, state.s, state.lateral]
    .every(Number.isFinite)) return false;
  const previous = departurePosition(duel, state.prevS, state.prevLateral);
  const current = departurePosition(duel, state.s, state.lateral);
  const world = duel.course.worldAt(state.s, state.lateral);
  const boundary = zone.departureBoundary;
  const crossingFraction = (boundary.lateral - previous.lateral) /
    (current.lateral - previous.lateral);
  const crossingAlong = previous.along +
    (current.along - previous.along) * crossingFraction;
  if (!zone.contains(world.x, world.z) ||
      crossingAlong < boundary.alongMin || crossingAlong > boundary.alongMax ||
      previous.lateral >= boundary.lateral || current.lateral < boundary.lateral)
    return false;

  departure.departed = true;
  state.status = 'exploring';
  state.impactTimer = 0;
  state.tumble = null;
  state.boosting = false;
  state.airborne = false;
  state.airHeight = 0;
  state._jumpY = null;
  state.police.pendingFines = 0;
  duel.emit({muddyHollowDeparted: {departureId: departure.id}});
  return true;
}

export function stepMuddyHollowExploration(duel, dt) {
  const state = duel.state;
  const departure = state.muddyHollowDeparture;
  if (state.status !== 'exploring' || !departure?.departed) return false;
  const firstStep = departure.elapsedSec === 0;
  departure.elapsedSec += dt;
  duel._drive(dt);
  if (!firstStep) duel._jump(state, dt);
  duel._staticContacts(state, true);
  return true;
}
