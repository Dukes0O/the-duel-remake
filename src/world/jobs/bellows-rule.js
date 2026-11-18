import {nearestOnLine} from '../scablands-ways.js';

// Run Him Down's load and meetings. These facts belong to one job, never a save.
export const BELLOWS_RULE = Object.freeze({
  start: 100,
  flamePerSecond: 15,
  blastPerHit: 40,
  boltPerHit: 20,
  otherPerHit: 10,
  handFlameHeightMetres: 2,
  weaponBodyHeightMetres: 2,
  warningBehindMetres: 100,
  hardKnockKmh: 20,
  stopKnocks: 3,
  // Road riders release their meeting latch beyond eight metres as well.
  meetingReleaseMetres: 8,
  // He creeps out of the gate and down the road, the bellows not yet lashed, until the player's car first goes faster than
  // `launchPlayerSpeedKmh` or `launchSeconds` have passed; then he runs (Claude's hand drive, 17 November: at 40 km/h for
  // 25 seconds he was in the Boneyard before a player on foot among the shacks had reached the car). He does not stand
  // still, because he starts in the gateway, which is the car's only way out.
  launchSpeedKmh: 15,
  launchPlayerSpeedKmh: 20,
  launchSeconds: 90,
  closeGapMetres: 120,
  farGapMetres: 400,
  closeSpeedShare: 0.9,
  easyCloseSpeedShare: 0.8,
  farSpeedShare: 0.5,
  shakenSeconds: 3,
  shakenSpeedShare: 0.7,
  sackBehindMetres: 60,
  // The ash lands ahead of the pursuing car, so that the car drives into it: this far ahead, but short of the thief by
  // `sackShortOfThiefMetres`. One sack is in the air at a time (Claude's hand drive, 17 November: both burst at once, at
  // the car's own place, and at 190 km/h the car was already past them).
  sackAheadMetres: 45,
  sackShortOfThiefMetres: 8,
  blockingBehindMetres: 30,
  blockingSideMps: 2,
  thiefRadiusMetres: 1.3,
  boneyardSpeedKmh: 60,
  // Each time he reaches the furnace its crew has had its hands on the bellows, and he is slower on his next pass through
  // the wrecks: it ends within three passes and each is worse (no loop: Kyle, 11 November).
  furnaceArrivalLoss: 25,
  wreckPassSlowerKmh: 10,
  boneyardSlowestKmh: 30,
  wreckEndClearanceMetres: 5,
  wreckTurnDegrees: 40,
  wreckTurnCount: 3,
  wideRouteMarginMetres: 100,
  sideClearanceMetres: 1,
  footStartFromCarMetres: 60,
  carStartLeadMetres: 250,
  ashLengthMetres: 30,
  ashSeconds: 6,
  ashAtRoadMetres: Object.freeze([800, 1600]),
  ridersFromFurnaceMetres: 400,
  riderPostSideMetres: 6,
  riderPostAheadMetres: 12,
  furnaceReachMetres: 30,
  restartLeadMetres: 150,
  endingSeconds: 9,
  closingAtSeconds: 5,
  loadRadiusMetres: 8,
  stoppedKmh: 1,
  thiefRunMps: 6,
  thiefRunMetres: 60,
  thiefExitMetres: 3,
  roofLoadWidth: 1.2,
  roofLoadHeight: 0.6,
  roofLoadLength: 1.6,
  roofLoadLift: 1.6,
  ashHeightMetres: 12,
  wholeFrom: 80,
  patchFrom: 40,
  pay: Object.freeze({whole: 120, patch: 80, scorched: 50}),
});

export const BELLOWS_LINES = Object.freeze({
  patch: "Cinder: They will patch. Keep the flamethrower. You've earned it.",
  scorched: "Cinder: Scorched. Auntie can sew. Keep the flamethrower. You've earned it.",
  warning: 'Cinder: Not the flamethrower! Leather burns.',
  restart: "Cinder: He has reached the furnace, and they have had their hands on the bellows. He is slowing. Again, from the Boneyard's edge.",
});

// These are the wrecks' bounds (an axis-aligned box round each whole aircraft;
// a wreck is solid only in the parts inside it), not their drawn headings. Round the east wreck's south end, the north wreck's north end,
// then the south wreck's south end. The actor follows every corner exactly.
export function bellowsWreckRoute(wrecks, entry, exit) {
  const box = id => {
    const wreck = wrecks.find(row => row.id === id);
    if (!wreck) throw new Error(`The bellows route needs the ${id} wreck.`);
    return {west: wreck.x - wreck.size[0] / 2, east: wreck.x + wreck.size[0] / 2,
      north: wreck.z - wreck.size[2] / 2, south: wreck.z + wreck.size[2] / 2};
  };
  const east = box('east'), north = box('north'), south = box('south');
  const clear = BELLOWS_RULE.wreckEndClearanceMetres;
  const point = (x, z) => Object.freeze({x, z});
  const line = Object.freeze([
    point(entry.x, entry.z),
    point(east.east + clear, entry.z),
    point(east.east + clear, east.south + clear),
    point(north.east + clear, east.south + clear),
    point(north.east + clear, north.north - clear),
    point(south.east + clear, north.north - clear),
    point(south.east + clear, south.south + clear),
    point(south.west - clear, south.south + clear),
    point(exit.x, exit.z),
  ]);
  // One wide alternative, around the outside of the whole wreck field.
  // It shares both endpoints, so its extra distance has a fair comparison.
  const margin = BELLOWS_RULE.wideRouteMarginMetres;
  const farEast = Math.max(east.east, north.east, south.east) + margin;
  const farWest = Math.min(east.west, north.west, south.west) - margin;
  const farNorth = Math.min(east.north, north.north, south.north) - margin;
  const wide = Object.freeze([line[0], point(farEast, entry.z), point(farEast, farNorth),
    point(farWest, farNorth), point(farWest, exit.z), line.at(-1)]);
  const length = points => points.slice(1).reduce((total, to, index) =>
    total + Math.hypot(to.x - points[index].x, to.z - points[index].z), 0);
  return Object.freeze({line, wide, metres: length(line), wideExtraMetres: length(wide) - length(line)});
}

export function bellowsFootStart(car, farLamp) {
  const dx = farLamp.x - car.x, dz = farLamp.z - car.z;
  const distance = Math.hypot(dx, dz);
  if (!(distance > 0)) throw new Error('The far lamp must be away from the bay.');
  return Object.freeze({x: car.x + dx / distance * BELLOWS_RULE.footStartFromCarMetres,
    z: car.z + dz / distance * BELLOWS_RULE.footStartFromCarMetres,
    heading: Math.atan2(-dx, -dz)});
}

// Restart on the same proven wreck line. The lead is measured along that
// line, so neither car is placed inside a wreck when the line turns.
export function bellowsRestartPlaces(route) {
  const points = route.wrecks.map(place => place.position ?? place);
  let left = BELLOWS_RULE.restartLeadMetres;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1], to = points[index];
    const dx = to.x - from.x, dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    if (left > length || length === 0) { left -= length; continue; }
    const first = points[1];
    return {player:{...points[0], heading:Math.atan2(first.x - points[0].x, first.z - points[0].z)},
      thief:{x:from.x + dx * left / length, z:from.z + dz * left / length,
        heading:Math.atan2(dx, dz), pathIndex:route.road.length - 1 + index}};
  }
  throw new Error('The bellows wreck line must leave room for the restart lead.');
}

export function bellowsGrade(condition) {
  return condition >= BELLOWS_RULE.wholeFrom ? 'whole'
    : condition >= BELLOWS_RULE.patchFrom ? 'patch' : 'scorched';
}

export function bellowsClosingLineId(condition) {
  return {whole: 'story.ember.cinder.10', patch: 'bellows.patch',
    scorched: 'bellows.scorched'}[bellowsGrade(condition)];
}

export function bellowsPay(condition) {
  return BELLOWS_RULE.pay[bellowsGrade(condition)];
}

export function bellowsSentence(condition) {
  return {whole: 'The bellows came back whole.', patch: 'The bellows will patch.',
    scorched: 'The bellows are scorched.'}[bellowsGrade(condition)];
}

// The caller supplies the actual road's tangent and width. The scene receives
// the same box that the rule keeps, so it can hide everything within the ash.
export function bellowsAshBox(id, roadPoint, roadWidthMetres) {
  return {id, x: roadPoint.x, z: roadPoint.z, yaw: roadPoint.heading,
    length: BELLOWS_RULE.ashLengthMetres, width: roadWidthMetres,
    remaining: BELLOWS_RULE.ashSeconds};
}

export function stepBellowsAsh(clouds, dt) {
  return clouds.map(cloud => ({...cloud, remaining: cloud.remaining - Math.max(0, dt)}))
    .filter(cloud => cloud.remaining > 0);
}

// How fast he threads the wrecks on this pass: 60 km/h the first time, 10 less after each arrival at the furnace, never under 30.
export const bellowsBoneyardSpeedKmh = (arrivals = 0) => Math.max(BELLOWS_RULE.boneyardSlowestKmh,
  BELLOWS_RULE.boneyardSpeedKmh - BELLOWS_RULE.wreckPassSlowerKmh * Math.max(0, arrivals));

export function bellowsThiefSpeedKmh(playerTopSpeedKmh, inBoneyard,
  behindMetres = BELLOWS_RULE.closeGapMetres, difficulty = 'medium', shaken = false, arrivals = 0) {
  if (inBoneyard) return bellowsBoneyardSpeedKmh(arrivals);
  const rule = BELLOWS_RULE;
  const close = difficulty === 'easy' ? rule.easyCloseSpeedShare : rule.closeSpeedShare;
  const share = Math.max(0, Math.min(1,
    (behindMetres - rule.closeGapMetres) / (rule.farGapMetres - rule.closeGapMetres)));
  const speed = Math.max(0, playerTopSpeedKmh) * (close + (rule.farSpeedShare - close) * share);
  return shaken ? Math.max(0, playerTopSpeedKmh) * rule.shakenSpeedShare : speed;
}

// Measure against the authored road, not the nearest world road or the scene.
export function bellowsRoadFacts(route, thief, car, pathIndex) {
  const road = route.road.map(place => place.position ?? place);
  const here = nearestOnLine(road, thief.x, thief.z);
  const playerRoad = nearestOnLine(road, car.x, car.z);
  const playerA = road[playerRoad.index], playerB = road[playerRoad.index + 1];
  const playerSpan = Math.hypot(playerB.x - playerA.x, playerB.z - playerA.z);
  const playerShare = playerSpan > 0 ? Math.max(0, Math.min(1,
    ((car.x - playerA.x) * (playerB.x - playerA.x) +
      (car.z - playerA.z) * (playerB.z - playerA.z)) / playerSpan ** 2)) : 0;
  return {roadMetres:here.along, roadWidthMetres:route.roadWidthMetres,
    sackPoint:{x:playerA.x + (playerB.x - playerA.x) * playerShare,
      z:playerA.z + (playerB.z - playerA.z) * playerShare,
      heading:Math.atan2(playerB.x - playerA.x, playerB.z - playerA.z)},
    inBoneyard:pathIndex >= road.length,
    behindMetres:here.along - playerRoad.along,
    furnaceMetres:Math.hypot(thief.x - (route.wrecks.at(-1).position ?? route.wrecks.at(-1)).x,
      thief.z - (route.wrecks.at(-1).position ?? route.wrecks.at(-1)).z)};
}

// Coordinates relative to the thief's forward line. Negative along means
// behind; lateral keeps its sign so blocking follows the attempted pass.
export function bellowsBlockingSide(playerAlongMetres, playerLateralMetres) {
  return playerAlongMetres <= 0 && playerAlongMetres >= -BELLOWS_RULE.blockingBehindMetres
    ? Math.sign(playerLateralMetres) : 0;
}

// Keep the block on the road's current segment. The ordinary actor mover
// still resolves the resulting point against ground and solids.
export function bellowsBlockingMove(from, proposed, segmentStart, segmentEnd, player, roadWidth, dt) {
  if (!player || !(dt > 0) || !(roadWidth > BELLOWS_RULE.thiefRadiusMetres * 2)) return proposed;
  const dx = segmentEnd.x - segmentStart.x, dz = segmentEnd.z - segmentStart.z;
  const length = Math.hypot(dx, dz);
  if (!(length > 0)) return proposed;
  const fx = dx / length, fz = dz / length, rx = fz, rz = -fx;
  const along = (player.x - from.x) * fx + (player.z - from.z) * fz;
  const side = bellowsBlockingSide(along,
    (player.x - from.x) * rx + (player.z - from.z) * rz);
  if (!side) return proposed;
  const limit = roadWidth / 2 - BELLOWS_RULE.thiefRadiusMetres;
  const playerAcross = (player.x - segmentStart.x) * rx + (player.z - segmentStart.z) * rz;
  const across = (proposed.x - segmentStart.x) * rx + (proposed.z - segmentStart.z) * rz;
  const desired = Math.max(-limit, Math.min(limit, playerAcross));
  // Rotating an already aligned pair can leave a fraction of a coordinate's
  // rounding unit. Do not turn that into sideways movement.
  const rounding = Number.EPSILON * Math.max(1, Math.abs(player.x), Math.abs(player.z),
    Math.abs(proposed.x), Math.abs(proposed.z));
  if (Math.abs(desired - across) <= rounding) return proposed;
  const travel = BELLOWS_RULE.blockingSideMps * dt;
  const shift = Math.max(-travel, Math.min(travel, desired - across));
  return {...proposed, x:proposed.x + rx * shift, z:proposed.z + rz * shift};
}

// The arena reports actual flame contact and impact speed. A health number,
// proximity alone or a held weapon key cannot stand in for either of them.
// A meeting includes its soft first touch. Leaning harder during the same
// meeting does not become a second knock. Separate, then meet again.
export function stepBellowsLoad(state, facts, dt = 0) {
  const next = {...state, bellows: state.bellows ?? BELLOWS_RULE.start,
    knocks: state.knocks ?? 0,
    shakenRemaining: state.shakenRemaining ?? 0};
  const events = [];
  if (state.thiefStopped) return {state: next, events};

  next.shakenRemaining = Math.max(0, next.shakenRemaining - Math.max(0, dt));
  const weaponHits = facts.weaponHits ?? [];
  const weaponDamage = weaponHits.reduce((total, hit) => total +
    (['rpg', 'rocket-pod', 'bomb', 'sticky-bomb'].includes(hit.weapon) ? BELLOWS_RULE.blastPerHit
      : ['crossbow', 'marksman'].includes(hit.weapon) ? BELLOWS_RULE.boltPerHit
      : BELLOWS_RULE.otherPerHit), 0);
  const flameSeconds = facts.flameContact ? Math.max(0, dt) : 0;
  next.bellows = Math.max(0, next.bellows - weaponDamage - BELLOWS_RULE.flamePerSecond * flameSeconds);
  if (!state.leatherWarned && (facts.flameContact || weaponHits.length > 0 || facts.behindMetres >= 0 &&
      facts.behindMetres <= BELLOWS_RULE.warningBehindMetres)) {
    next.leatherWarned = true;
    events.push({type: 'say', lineId: 'bellows.warning'});
  }

  const separated = facts.carGapMetres > BELLOWS_RULE.meetingReleaseMetres;
  const meetingHeld = state.meetingHeld && !separated;
  const solidHeld = state.solidHeld && facts.solidContact;
  if ((!meetingHeld && facts.carContact && facts.meetingKmh >= BELLOWS_RULE.hardKnockKmh) ||
      (!solidHeld && facts.solidContact && facts.solidImpactKmh >= BELLOWS_RULE.hardKnockKmh)) {
    // Two reports for one physics step still describe just one knock.
    next.knocks++;
    next.shakenRemaining = BELLOWS_RULE.shakenSeconds;
    events.push({type: 'bellowsKnock', knocks: next.knocks});
  }
  next.meetingHeld = !!(meetingHeld || facts.carContact);
  next.solidHeld = !!facts.solidContact;
  if (next.knocks >= BELLOWS_RULE.stopKnocks) {
    next.thiefStopped = true;
    events.push({type: 'thiefStopped'});
  }
  return {state: next, events};
}

// Road progress and furnace distance are measured by the chase, not the scene.
// Each sack waits beyond its mark until the car is close behind. A restart
// cannot throw an already used sack again.
export function stepBellowsPursuit(state, facts, dt = 0) {
  const next = {...state, clouds: stepBellowsAsh(state.clouds ?? [], dt),
    sacksThrown: [...(state.sacksThrown ?? [])]};
  const events = [], requests = [];
  if (state.thiefStopped) return {state: next, events, requests};
  for (const [index, metres] of BELLOWS_RULE.ashAtRoadMetres.entries()) {
    if (next.sacksThrown.includes(index) || !(facts.roadMetres >= metres)) continue;
    if (facts.inBoneyard || facts.onFoot || !(facts.behindMetres >= 0 &&
        facts.behindMetres <= BELLOWS_RULE.sackBehindMetres)) continue;
    // One sack at a time: the next waits until the last cloud has settled.
    if (next.clouds.length > 0) continue;
    const car = facts.sackPoint;
    if (!car) throw new Error('The thief needs the pursuing car’s road point for his sack.');
    const lead = Math.max(0, Math.min(BELLOWS_RULE.sackAheadMetres, facts.behindMetres - BELLOWS_RULE.sackShortOfThiefMetres));
    const point = {...car, x: car.x + Math.sin(car.heading) * lead, z: car.z + Math.cos(car.heading) * lead};
    const cloud = bellowsAshBox(`thief-ash-${index}`, point, facts.roadWidthMetres);
    next.clouds.push(cloud);
    next.sacksThrown.push(index);
    events.push({type: 'thiefAsh', id: cloud.id});
  }
  if (!state.ridersStarted && facts.furnaceMetres <= BELLOWS_RULE.ridersFromFurnaceMetres) {
    next.ridersStarted = true;
    requests.push({type: 'bellowsRiders'});
  }
  if (facts.furnaceMetres <= BELLOWS_RULE.furnaceReachMetres) {
    // Reset only the chase meetings and position. Fire damage and earned knocks
    // remain facts of this attempt, as do the two sacks already thrown. Each arrival costs the bellows and slows his next pass.
    next.furnaceArrivals = (state.furnaceArrivals ?? 0) + 1;
    next.bellows = Math.max(0, (state.bellows ?? BELLOWS_RULE.start) - BELLOWS_RULE.furnaceArrivalLoss);
    next.meetingHeld = false;
    next.solidHeld = false;
    next.clouds = [];
    events.push({type: 'bellowsRestart'});
    requests.push({type: 'say', lineId: 'bellows.restart'},
      {type: 'bellowsRestart', leadMetres: BELLOWS_RULE.restartLeadMetres});
  }
  return {state: next, events, requests};
}

// Stopping the thief waits for collection. Only loading the bellows starts
// the full ending, so the horn, departure and captions can all be seen.
// Actor motion, the roof load and the horn follow these one-time requests.
export function stepBellowsEnding(state, facts, dt = 0) {
  const events = [], requests = [];
  if (!state.thiefStopped) return {state, complete: false, events, requests};
  const next = {...state, endingElapsed: Math.min(BELLOWS_RULE.endingSeconds,
    (state.bellowsLoaded ? (state.endingElapsed ?? 0) + Math.max(0, dt) : 0))};
  if (!state.thiefFled) {
    next.thiefFled = true;
    requests.push({type: 'bellowsThiefFlee'});
  }
  if (!state.bellowsLoaded && facts.onFoot === false &&
      Math.abs(facts.playerSpeedKmh) < BELLOWS_RULE.stoppedKmh &&
      facts.carGapMetres <= BELLOWS_RULE.loadRadiusMetres) {
    next.bellowsLoaded = true;
    events.push({type: 'bellowsLoaded'});
    requests.push({type: 'bellowsFurnaceLeave'},
      {type: 'say', lineId: 'story.ember.cinder.22'});
  }
  if (next.bellowsLoaded && next.endingElapsed >= BELLOWS_RULE.closingAtSeconds && !state.bellowsClosing) {
    next.bellowsClosing = true;
    requests.push({type: 'say', lineId: bellowsClosingLineId(next.bellows)});
  }
  const complete = next.bellowsLoaded === true && next.endingElapsed >= BELLOWS_RULE.endingSeconds;
  if (complete && !state.bellowsArrived) {
    next.bellowsArrived = true;
    events.push({type: 'bellowsArrived', bellows: state.bellows,
      knocks: state.knocks, pay: bellowsPay(state.bellows), sentence: bellowsSentence(state.bellows)});
  }
  return {state: next, complete, events, requests};
}

// The existing chase step delegates here only for the bellows job. Physics
// supplies the contact facts in view.bellows; health and marker proximity
// cannot substitute for a knock. The arena also supplies measured road facts.
export function stepBellowsChase(step, state, view, dt = 0) {
  const target = (view.actors ?? []).find(actor => actor.id === step.targetId);
  const marker = {type: 'marker', place: target?.position ?? step.path?.[0]};
  const follow = speed => ({type: 'follow', actorId: step.targetId, path: step.path, speed});
  if (!target) return {state, complete: false, events: [], requests: [marker, follow(0)]};

  const car = view.carPosition ?? (!view.onFoot ? view.player?.position : null);
  const carGapMetres = car && target.position
    ? Math.hypot(car.x - target.position.x, car.z - target.position.z) : Infinity;
  const facts = {...view.bellows, carGapMetres, onFoot:view.onFoot === true};
  const chaseElapsed = (state.chaseElapsed ?? 0) + Math.max(0, dt);
  const launchEnded = state.launchEnded === true || chaseElapsed >= BELLOWS_RULE.launchSeconds ||
    !view.onFoot && Math.abs(view.speedKmh ?? 0) > BELLOWS_RULE.launchPlayerSpeedKmh;
  state = {...state, chaseElapsed, launchEnded};
  const load = stepBellowsLoad(state, facts, dt);
  const pursuit = stepBellowsPursuit(load.state, facts, dt);
  const ending = stepBellowsEnding(pursuit.state, {carGapMetres,
    onFoot: view.onFoot === true, playerSpeedKmh: view.speedKmh ?? Infinity}, dt);
  // A stopped thief stays stopped throughout collection and captions.
  const speedKmh = ending.state.thiefStopped || !Number.isFinite(facts.playerTopSpeedKmh)
    ? 0 : facts.inBoneyard ? bellowsBoneyardSpeedKmh(ending.state.furnaceArrivals)
    : !launchEnded ? BELLOWS_RULE.launchSpeedKmh
    : bellowsThiefSpeedKmh(facts.playerTopSpeedKmh, false, facts.behindMetres,
      view.difficulty, ending.state.shakenRemaining > 0);
  const events = [...load.events, ...pursuit.events, ...ending.events];
  const requests = [marker, follow(speedKmh / 3.6),
    ...load.events.filter(event => event.type === 'say'),
    ...pursuit.requests, ...ending.requests];
  return {state: ending.state, complete: ending.complete, events, requests};
}
