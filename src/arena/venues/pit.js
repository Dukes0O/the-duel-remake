// The Pit keeps the released floor rules and uses one exact circular frame.
export function createPitVenue(base) {
  const layout = Object.freeze({...base.scrapdome, floorHalfWidth: 32, wallOffset: 35,
    rampFractions: Object.freeze([0, .5]), rampLength: 26, spawnOffset: 0,
    junk: Object.freeze(Array.from({length: 8}, (_, i) => Object.freeze([i / 8, i % 2 ? 18 : -18])))});
  return Object.freeze({...base, id: 'pit', name: 'The Pit', stage: 32,
    lengthU: Math.PI * 80, scrapdome: layout, pit: Object.freeze({radius: 40, pileRadius: 8, wallRadius: 75}),
    sections: Object.freeze([Object.freeze({theme: 'arena', name: 'The Pit', share: 1})])});
}

export function pitFrame(course, s) {
  const radius = course.def.pit.radius, angle = course.phase(s) / radius;
  return {x: radius * Math.cos(angle), y: 0, z: radius * Math.sin(angle),
    heading: -angle, curvature: -1 / radius, tunnel: false};
}

export function pitNearest(course, x, z, referenceS) {
  let s = course.phase(Math.atan2(z, x) * course.def.pit.radius);
  const frame = pitFrame(course, s), lateral = Math.hypot(x, z) - course.def.pit.radius;
  if (Number.isFinite(referenceS)) s += Math.round((referenceS - s) / course.length) * course.length;
  return {...frame, s, lateral, distance: Math.abs(lateral)};
}

export function buildPitCourse(course) {
  const layout = course.def.scrapdome;
  course.samples = [];
  for (let s = 0; s < course.length; s += 8) course.samples.push({s, ...pitFrame(course, s)});
  // The final segment is shorter than eight metres. Keep its true endpoint;
  // the Pit's continuous frame and inverse use the same exact circle.
  course.samples.push({...course.samples[0], s: course.length, heading: -Math.PI * 2});
  const f = course.features;
  f.checkpoints.push({s: course.raceLength, kind: 'finish'});
  for (const fraction of layout.rampFractions) {
    const center = course.length * fraction;
    f.ramps.push({start: center - layout.rampLength / 2,
      end: center + layout.rampLength / 2, height: layout.rampHeight});
  }
  for (const [index, [fraction, off]] of layout.junk.entries()) {
    const s = fraction * course.length, pose = course.groundAt(s, off);
    f.crushables.push({id: `pit-junk-${index}`, kind: 'junkCar', s, off, ...pose,
      halfX: 1.06, halfZ: 2.25, height: 1.3, shape: 'box', color: [0x53645b, 0x935143, 0x557185][index % 3]});
  }
}

export function pitRampHeight(course, s, off = 0) {
  if (Math.abs(off) > 15) return 0;
  for (const ramp of course.features.ramps) {
    const center = (ramp.start + ramp.end) / 2, length = ramp.end - ramp.start;
    const delta = course.phase(s - center + course.length / 2) - course.length / 2;
    if (Math.abs(delta) <= length / 2) return ramp.height * Math.cos(Math.PI * delta / length) ** 2;
  }
  return 0;
}

export function pitObstacles(course) {
  const pile = {id: 'pit-centre-pile', kind: 'prop', shape: 'ellipse',
    x: 0, y: 0, z: 0, s: 0, off: -40, heading: 0,
    halfX: 8, halfZ: 8, height: 4.4, theme: 'arena'};
  const walls = Array.from({length: 64}, (_, index) => {
    const s = index / 64 * course.length, pose = course.worldAt(s, 35);
    return {id: `pit-wall-${index}`, kind: 'prop', shape: 'box', s, off: 35, ...pose,
      halfX: .5, halfZ: Math.PI * 75 / 64 + .1, height: 3.3,
      barrier: true, arenaWall: true, theme: 'arena'};
  });
  return {pile, walls};
}

// Reuse the released oval stadium, translated to the Pit's circular centre.
// This adapter is presentation only; it never changes either Course.
export function pitStadiumFrame(ring) {
  const a = ring.worldAt(0), b = ring.worldAt(ring.length / 2);
  const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
  const view = Object.create(ring);
  view.worldAt = (s, off = 0) => {
    const pose = ring.worldAt(s, off);
    return {...pose, x: pose.x - cx, z: pose.z - cz};
  };
  return view;
}
