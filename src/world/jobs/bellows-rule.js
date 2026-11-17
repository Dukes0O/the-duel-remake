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
  ridersFromFurnaceMetres: 400,
  furnaceReachMetres: 30,
  restartLeadMetres: 150,
  endingSeconds: 9,
  loadRadiusMetres: 8,
  stoppedKmh: 1,
  wholeFrom: 80,
  patchFrom: 40,
  pay: Object.freeze({whole: 120, patch: 80, scorched: 50}),
});

export const BELLOWS_LINES = Object.freeze({
  warning: 'Cinder: Not the flamethrower! Leather burns.',
  restart: "Cinder: He has reached the furnace. Again, from the Boneyard's edge.",
});

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
