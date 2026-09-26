// Deterministic phase-one ground for the hidden High Country playground.
// The course is complete before this installer runs, so the zone cannot alter
// its samples, generated features, scenery or random stream.
const FRAME_S = 2400;
const ZONE_ALONG_RADIUS = 190;
const ZONE_LATERAL_RADIUS = 180;
const ZONE_LATERAL_CENTER = 205;
const INNER_BLEND_RADIUS = .65;

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
      { along: -119, lateral: 268, alongRadius: 25, lateralRadius: 13, height: 5.5 },
      { along: 119, lateral: 210, alongRadius: 23, lateralRadius: 12, height: 4.5 },
      { along: -17, lateral: 319, alongRadius: 22, lateralRadius: 12, height: 4 },
      { along: 61, lateral: 112, alongRadius: 25, lateralRadius: 11, height: 4.5 },
      { along: -123, lateral: 124, alongRadius: 24, lateralRadius: 12, height: 3.8 },
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
    contains,
    heightAt,
  };
  return course.muddyHollow;
}
