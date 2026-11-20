// The two gates cross the straights at right angles. All distances are metres.
export function createBowlOutside(course, floor, stadium, gateS) {
  const wall = floor.outerWallOffset;
  const front = wall + stadium.standGap;
  const back = front + stadium.rows * stadium.rowDepth;
  const top = stadium.firstRowHeight + stadium.rows * stadium.rowRise;
  const gates = ['Car Park Gate', 'Pit Gate'].map((name, i) => ({
    name, s: gateS + i * course.length / 2, lateral: wall, width: 8,
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

export const outsideGateAt = (outside, phase) => outside.gates.find(g => Math.abs(phase - g.s) <= g.width / 2);

export function terraceHeight(outside, off) {
  if (off < outside.wall + .5 || off > outside.back) return 0;
  const rise = Math.max(0, off - outside.front) / (outside.back - outside.front);
  return outside.firstHeight + rise * (outside.top - outside.firstHeight);
}

// Cut each wall piece at the actual jamb, including the partial pieces.
export function openGateSegments(gates, s, half) {
  let low = s - half, high = s + half;
  for (const gate of gates) {
    const left = gate.s - gate.width / 2, right = gate.s + gate.width / 2;
    if (low >= right || high <= left) continue;
    if (low < left) high = left;
    else low = right;
  }
  return high > low ? {s: (low + high) / 2, half: (high - low) / 2} : null;
}

// A gate marker leads round the back wall before it leads into the tunnel.
// Its destination stays fixed while the next point to steer at moves along the ring.
function nearestGate(course, outside, actor) {
  const phase = course.phase(actor.s), here = course.worldAt(actor.s, actor.lateral);
  const delta = gate => ((gate.s - phase + 1.5 * course.length) % course.length) - course.length / 2;
  const gate = Math.abs(delta(outside.gates[0])) <= Math.abs(delta(outside.gates[1])) ? outside.gates[0] : outside.gates[1];
  const ds = delta(gate), mouth = course.worldAt(gate.s, outside.back + 8);
  const entering = actor.bowlOutside?.gate?.name === gate.name && actor.bowlOutside.gate.entering;
  const aligned = Math.abs(ds) < 3 || entering && Math.abs(ds) < 8;
  const around = Math.abs(ds) > 10;
  let aimS = gate.s, aimOff = outside.wall - 5;
  if (actor.lateral > outside.back && !aligned) {
    aimS = around ? phase + Math.sign(ds) * Math.min(8, Math.abs(ds)) : gate.s;
    aimOff = around ? Math.max(outside.back + 10, Math.min(actor.lateral, outside.back + 20)) : outside.back + 9;
  }
  if (actor.lateral <= outside.back && !outsideGateAt(outside, phase)) {
    // On the seating deck the exit is over its back, not through the fence.
    aimS = phase; aimOff = outside.back + 8;
  }
  const destination = course.worldAt(gate.s, gate.lateral);
  const metres = actor.lateral > outside.back && !aligned
    ? Math.hypot(here.x - mouth.x, here.z - mouth.z) + outside.back + 8 - outside.wall
    : Math.hypot(here.x - destination.x, here.z - destination.z);
  return {...gate, metres, entering: aligned, aim: course.worldAt(aimS, aimOff)};
}

export function observeBowlOutside(duel, dt, addFact, say) {
  const s = duel.state, event = s.bowlNight.event, course = duel.course, outside = course.features.bowl.outside;
  const gate = outsideGateAt(outside, course.phase(s.s));
  const previous = s.bowlOutside;
  if (s.lateral <= outside.wall) {
    if (previous && event.visitedOutside && gate && !s.airborne) {
      duel.emit({bowlBackIn: {gate: gate.name}, bowlOutsideCue: 'bowl.out.back'});
      addFact(duel, {type: 'bowlBackIn'});
    }
    event.inTunnel = false;
    event.visitedOutside = false;
    delete s.bowlOutside;
    return;
  }
  const tunnel = gate && !s.airborne && (s.groundHeight || 0) < outside.firstHeight - .5;
  const where = s.lateral > outside.back || tunnel ? 'carpark' : 'stands';
  s.bowlOutside = {where, gate: nearestGate(course, outside, s)};
  if (!tunnel) event.visitedOutside = true;
  if (!previous && s.airborne && !gate) {
    const repeat = !!event.overWall;
    event.overWall = true;
    duel.emit({bowlOverWall: {repeat}, bowlOutsideCue: 'bowl.out.over'});
    addFact(duel, {type: 'bowlOverWall', repeat});
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
    if (points) addFact(duel, {type: 'bowlInStands', points});
  }
}
