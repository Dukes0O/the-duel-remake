// The two gates cross the straights at right angles. All distances are metres.
export function createBowlOutside(course, floor, stadium, gateS) {
  const wall = floor.outerWallOffset;
  const front = wall + stadium.standGap;
  const back = front + stadium.rows * stadium.rowDepth;
  const top = stadium.firstRowHeight + stadium.rows * stadium.rowRise;
  const gates = ['Car Park Gate', 'Pit Gate'].map((name, i) => ({
    name, s: gateS + i * course.length / 2, lateral: wall, width: 8, mouthWidth: 14, guideLength: 10,
  }));
  const parking = [];
  for (let i = 0; i < 20; i++) {
    const s = course.length * (i + .5) / 20;
    if (gates.some(g => Math.abs(s - g.s) < 8)) continue;
    const off = back + (i % 2 ? 28 : 46);
    parking.push({id: 'bowl-parking-' + i, kind: 'junkCar', sourceKind: 'junkCar', s, off,
      ...course.worldAt(s, off), halfX: 1.05, halfZ: 2.25, height: 1.3, shape: 'box'});
  }
  return {wall, front, back, top, fenceTop: stadium.wallHeight + stadium.fenceHeight, firstHeight: stadium.firstRowHeight, bank: back + 80, gates, parking};
}

const rexShutters = new WeakMap();

function rexShuttersActive(state) {
  const night = state?.bowlNight;
  return night?.phase === 'event' && night.event?.type === 'scrapasaurus' && night.event.rex && !night.event.rex.done;
}

export function rexGateIsShut(state, gateName) {
  return !!rexShuttersActive(state) && state.bowlNight.event.rexReturnGate !== gateName;
}

export function rexGateShutters(course) {
  const outside = course.features.bowl.outside;
  if (!rexShutters.has(outside)) {
    const off = outside.wall - .20, halfX = .18;
    rexShutters.set(outside, outside.gates.map(gate => {
      const {x, y, z, heading} = course.groundAt(gate.s, off);
      return {id: 'rex-shutter-' + gate.name, gateName: gate.name, kind: 'prop', shape: 'box',
        s: gate.s, off, x, y, z, heading, halfX, halfZ: gate.width / 2 + .08,
        height: outside.fenceTop, minY: y - 1, maxY: y + outside.fenceTop,
        arenaWall: true, bowlBoundary: 'shutter', verticalClearance: true, exactCarCorners: true};
    }));
  }
  return rexShutters.get(outside);
}

export function outsideGateAt(outside, phase, lateral = outside.wall) {
  return outside.gates.find(g => {
    const flare = Math.max(0, (g.mouthWidth - g.width) / 2 + Math.min(0, lateral - outside.back));
    return Math.abs(phase - g.s) <= g.width / 2 + flare;
  });
}

export function terraceHeight(outside, off) {
  if (off < outside.wall + .5 || off > outside.back) return 0;
  const rise = Math.max(0, off - outside.front) / (outside.back - outside.front);
  return outside.firstHeight + rise * (outside.top - outside.firstHeight);
}

// The near guide aims the truck into the throat before it can meet the other jamb.
export function inboundGateHeading(course, obstacle, s, lateral) {
  const outside = course.features.bowl.outside;
  const gate = outside.gates.find(entry => Math.abs(entry.s - obstacle.s) < entry.mouthWidth);
  if (!gate) return null;
  const here = course.worldAt(s, lateral);
  const aim = course.worldAt(gate.s, Math.max(outside.wall - 6, lateral - 8));
  return Math.atan2(aim.x - here.x, aim.z - here.z);
}

// Cut each wall piece at the actual jamb, including the partial pieces.
export function openGateSegments(gates, s, half, mouth = false) {
  let low = s - half, high = s + half;
  for (const gate of gates) {
    const width = mouth ? gate.mouthWidth : gate.width;
    const left = gate.s - width / 2, right = gate.s + width / 2;
    if (low >= right || high <= left) continue;
    if (low < left) high = left;
    else low = right;
  }
  return high > low ? {s: (low + high) / 2, half: (high - low) / 2} : null;
}

// A gate marker leads round the back wall before it leads into the tunnel.
// Its destination stays fixed while the next point to steer at moves along the ring.
function nearestGate(course, outside, actor, returnGate) {
  const phase = course.phase(actor.s), here = course.worldAt(actor.s, actor.lateral);
  const delta = gate => ((gate.s - phase + 1.5 * course.length) % course.length) - course.length / 2;
  const nearest = Math.abs(delta(outside.gates[0])) <= Math.abs(delta(outside.gates[1])) ? outside.gates[0] : outside.gates[1];
  const gate = returnGate ? outside.gates.find(gate => gate.name === returnGate) ?? nearest : nearest;
  const ds = delta(gate), mouth = course.worldAt(gate.s, outside.back + 8);
  const previous = actor.bowlOutside?.gate?.name === gate.name ? actor.bowlOutside.gate : null;
  const side = previous?.side ?? (ds > 0 ? -1 : 1);
  const depth = actor.lateral - outside.back;
  const stage = 14;
  const nearLine = Math.abs(ds + side * depth) < 4 && depth >= 0 && depth <= stage + 4;
  const headOn = depth > 0 && depth < stage+6 && Math.abs(ds) < depth*.65;
  const entering = previous?.entering && depth < stage+12 && Math.abs(ds) < stage+12 || nearLine || headOn || depth < 3 && Math.abs(ds) < gate.mouthWidth/2;
  let aimS = gate.s, aimOff = outside.wall - 5;
  if (depth > 0 && !entering) {
    if (Math.abs(ds) > stage + 10) {
      aimS = phase + Math.sign(ds)*8;
      aimOff = outside.back + stage;
    } else {
      aimS = gate.s + side*stage;
      aimOff = outside.back + stage;
    }
  } else if (depth > 2 && entering) {
    // Aim seven metres ahead along the diagonal into the open mouth.
    const ahead = Math.max(0, depth - 7);
    aimS = gate.s + side*Math.min(ahead, Math.max(0, Math.abs(ds)-3));
    aimOff = outside.back + ahead;
  }
  if (actor.lateral <= outside.back && !outsideGateAt(outside, phase, actor.lateral)) {
    aimS = phase; aimOff = outside.back + 8;
  }
  const destination = course.worldAt(gate.s, gate.lateral);
  const metres = actor.lateral > outside.back && !entering
    ? Math.hypot(here.x - mouth.x, here.z - mouth.z) + outside.back + 8 - outside.wall
    : Math.hypot(here.x - destination.x, here.z - destination.z);
  return {...gate, metres, entering, side, aim: course.worldAt(aimS, aimOff)};
}

export function observeBowlOutside(duel, dt, addFact, say) {
  const s = duel.state, event = s.bowlNight.event, course = duel.course, outside = course.features.bowl.outside;
  const gate = outsideGateAt(outside, course.phase(s.s), s.lateral);
  const previous = s.bowlOutside;
  const rex = rexShuttersActive(s);
  if (rex && !event.rexShuttersStarted) {
    event.rexShuttersStarted = true;
    duel.emit({bowlOutsideCue: 'bowl.gate.shut'});
  }
  if (s.lateral <= outside.wall) {
    if (rex && event.rexReturnGate) {
      const gateName = event.rexReturnGate;
      const shutter = rexGateShutters(course).find(gate => gate.gateName === gateName);
      const centre = course.worldAt(s.s, s.lateral);
      const heading = centre.heading + s.headingError + (s.slipAngle || 0) - shutter.heading;
      const {halfLength, halfWidth} = duel._vehicleSpec(s);
      const reach = Math.abs(Math.sin(heading)) * halfLength + Math.abs(Math.cos(heading)) * halfWidth;
      const offset = (centre.x - shutter.x) * Math.cos(shutter.heading) - (centre.z - shutter.z) * Math.sin(shutter.heading);
      if (offset + reach <= -shutter.halfX) {
        delete event.rexReturnGate;
        duel.emit({bowlGate: {gate: gateName}, bowlOutsideCue: 'bowl.gate.shut'});
      }
    }
    if (previous && event.visitedOutside && gate && !s.airborne) {
      duel.emit({bowlBackIn: {gate: gate.name}, bowlOutsideCue: 'bowl.out.back'});
      addFact(duel, {type: 'bowlBackIn'}, null);
    }
    event.inTunnel = false;
    event.visitedOutside = false;
    delete s.bowlOutside;
    return;
  }
  const tunnel = gate && s.lateral <= outside.back && !s.airborne && (s.groundHeight || 0) < outside.firstHeight - .5;
  const where = s.lateral > outside.back || tunnel ? 'carpark' : 'stands';
  const guide = nearestGate(course, outside, s, event.rexReturnGate);
  s.bowlOutside = {where, gate: guide};
  if (!tunnel) event.visitedOutside = true;
  const overWall = !previous && (rex ? s.airborne || s.prevAirHeight > 0 : s.airborne && !gate);
  if (overWall) {
    if (rex && !event.rexReturnGate) {
      event.rexReturnGate = guide.name;
      duel.emit({bowlGate: {gate: guide.name}, bowlOutsideCue: 'bowl.gate.open'});
    }
    const repeat = !!event.overWall;
    event.overWall = true;
    duel.emit({bowlOverWall: {repeat}, bowlOutsideCue: 'bowl.out.over'});
    addFact(duel, {type: 'bowlOverWall', repeat}, null);
    say(duel, 'outside.gate', {once: true});
  }
  if (tunnel && !event.inTunnel) duel.emit({bowlGate: {gate: gate.name}, bowlOutsideCue: 'bowl.out.gate'});
  event.inTunnel = !!tunnel;
  if (previous?.where === 'stands' && where === 'carpark' && s.airborne)
    duel.emit({bowlOutLeap: true, bowlOutsideCue: 'bowl.out.leap'});
  if (where === 'stands' && !s.airborne) {
    const before = event.standSeconds || 0;
    event.standSeconds = Math.min(15, before + dt);
    if (before === 0) duel.emit({bowlInStands: true, bowlOutsideCue: 'bowl.out.stands'});
    const points = Math.floor(event.standSeconds * 4 + 1e-8) - Math.floor(before * 4 + 1e-8);
    if (points) addFact(duel, {type: 'bowlInStands', points}, null);
  }
}
