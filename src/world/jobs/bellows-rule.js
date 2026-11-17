// Run Him Down's load and meetings. These facts belong to one job, never a save.
export const BELLOWS_RULE = Object.freeze({
  start: 100,
  flamePerSecond: 15,
  warningBehindMetres: 100,
  hardKnockKmh: 20,
  stopKnocks: 3,
  // Road riders release their meeting latch beyond eight metres as well.
  meetingReleaseMetres: 8,
  roadSpeedBelowPlayerKmh: 5,
  blockingBehindMetres: 30,
  boneyardSpeedKmh: 60,
  gapMinMetres: 6,
  gapMaxMetres: 9,
  sideClearanceMetres: 1,
  footStartFromCarMetres: 60,
  carStartLeadMetres: 250,
  ashLengthMetres: 30,
  ashSeconds: 6,
  ashAtRoadMetres: Object.freeze([800, 1600]),
  ridersFromFurnaceMetres: 400,
  furnaceReachMetres: 30,
  restartLeadMetres: 150,
  endingSeconds: 9,
  loadRadiusMetres: 8,
  stoppedKmh: 1,
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
  warning: 'Cinder: Not the flamethrower! Leather burns.',
  restart: "Cinder: He has reached the furnace. Again, from the Boneyard's edge.",
});

export function bellowsFootStart(car, farLamp) {
  const dx = farLamp.x - car.x, dz = farLamp.z - car.z;
  const distance = Math.hypot(dx, dz);
  if (!(distance > 0)) throw new Error('The far lamp must be away from the bay.');
  return Object.freeze({x: car.x + dx / distance * BELLOWS_RULE.footStartFromCarMetres,
    z: car.z + dz / distance * BELLOWS_RULE.footStartFromCarMetres,
    heading: Math.atan2(-dx, -dz)});
}

export function bellowsGrade(condition) {
  return condition >= BELLOWS_RULE.wholeFrom ? 'whole'
    : condition >= BELLOWS_RULE.patchFrom ? 'patch' : 'scorched';
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

export function bellowsThiefSpeedKmh(playerTopSpeedKmh, inBoneyard) {
  return inBoneyard ? BELLOWS_RULE.boneyardSpeedKmh
    : Math.max(0, playerTopSpeedKmh - BELLOWS_RULE.roadSpeedBelowPlayerKmh);
}

// Coordinates relative to the thief's forward line. Negative along means
// behind; lateral keeps its sign so blocking follows the attempted pass.
export function bellowsBlockingSide(playerAlongMetres, playerLateralMetres) {
  return playerAlongMetres <= 0 && playerAlongMetres >= -BELLOWS_RULE.blockingBehindMetres
    ? Math.sign(playerLateralMetres) : 0;
}

// The arena reports actual flame contact and impact speed. A health number,
// proximity alone or a held weapon key cannot stand in for either of them.
// A meeting includes its soft first touch. Leaning harder during the same
// meeting does not become a second knock. Separate, then meet again.
export function stepBellowsLoad(state, facts, dt = 0) {
  const next = {...state, bellows: state.bellows ?? BELLOWS_RULE.start,
    knocks: state.knocks ?? 0};
  const events = [];
  if (state.thiefStopped) return {state: next, events};

  const flameSeconds = facts.flameContact ? Math.max(0, dt) : 0;
  next.bellows = Math.max(0, next.bellows - BELLOWS_RULE.flamePerSecond * flameSeconds);
  if (!state.leatherWarned && (facts.flameContact || facts.behindMetres >= 0 &&
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
// Crossings, rather than a narrow distance window, keep sacks repeatable even
// when one rules step crosses both marks. A restart cannot throw them again.
export function stepBellowsPursuit(state, facts, dt = 0) {
  const next = {...state, clouds: stepBellowsAsh(state.clouds ?? [], dt),
    sacksThrown: [...(state.sacksThrown ?? [])]};
  const events = [], requests = [];
  if (state.thiefStopped) return {state: next, events, requests};
  for (const [index, metres] of BELLOWS_RULE.ashAtRoadMetres.entries()) {
    if (next.sacksThrown.includes(index) || !(facts.roadMetres >= metres)) continue;
    const point = facts.sackPoints?.[index];
    if (!point) throw new Error('The thief needs a road point for each sack.');
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
    // remain facts of this attempt, as do the two sacks already thrown.
    next.meetingHeld = false;
    next.solidHeld = false;
    next.clouds = [];
    events.push({type: 'bellowsRestart'});
    requests.push({type: 'say', lineId: 'bellows.restart'},
      {type: 'bellowsRestart', leadMetres: BELLOWS_RULE.restartLeadMetres});
  }
  return {state: next, events, requests};
}

// Stopping the thief starts the hold. The player can still approach his car;
// results wait for the load even when that approach takes longer than the hold.
// Actor motion, the roof load and the horn follow these one-time requests.
export function stepBellowsEnding(state, facts, dt = 0) {
  const events = [], requests = [];
  if (!state.thiefStopped) return {state, complete: false, events, requests};
  const next = {...state, endingElapsed: Math.min(BELLOWS_RULE.endingSeconds,
    (state.endingElapsed ?? 0) + Math.max(0, dt))};
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
  const facts = {...view.bellows, carGapMetres};
  const load = stepBellowsLoad(state, facts, dt);
  const pursuit = stepBellowsPursuit(load.state, facts, dt);
  const ending = stepBellowsEnding(pursuit.state, {carGapMetres,
    onFoot: view.onFoot === true, playerSpeedKmh: view.speedKmh ?? Infinity}, dt);
  // A stopped thief stays stopped throughout collection and captions.
  const speedKmh = ending.state.thiefStopped || !Number.isFinite(facts.playerTopSpeedKmh)
    ? 0 : bellowsThiefSpeedKmh(facts.playerTopSpeedKmh, facts.inBoneyard === true);
  const events = [...load.events, ...pursuit.events, ...ending.events];
  const requests = [marker, follow(speedKmh / 3.6),
    ...load.events.filter(event => event.type === 'say'),
    ...pursuit.requests, ...ending.requests];
  return {state: ending.state, complete: ending.complete, events, requests};
}
