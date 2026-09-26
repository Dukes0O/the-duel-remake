// RFX-02: extracted from Duel without changing fixed-step race rules.
import { CARS, CPU_DIFFICULTY, POLICE, DRIVE, SCORING } from './config.js';
import { clamp, freshDamageZones } from './sim-common.js';
import {stepKnock} from './vehicle-knock.js';

function finishPoliceMotion(duel, cruiser) {
  const state = duel.state;
  duel._staticContacts(cruiser, false); duel._boundary(cruiser);
  duel._vehicleContact(state, cruiser, 'police');
  for (const car of state.traffic) if (car.alive)
    duel._vehicleContact(cruiser, car, 'traffic');
  for (const opponent of state.opponents)
    duel._vehicleContact(cruiser, opponent, 'rival');
  duel._staticContacts(cruiser, false); duel._boundary(cruiser);
  duel._staticContacts(state, true);
  cruiser.gapU = state.s - cruiser.s;
  const a = duel.course.groundAt(state.s, state.lateral);
  const b = duel.course.groundAt(cruiser.s, cruiser.lateral);
  const distance = Math.hypot(a.x - b.x,
    a.y + (state.airHeight || 0) - b.y, a.z - b.z);
  cruiser.distanceU = Number.isFinite(distance) ? distance :
    Math.hypot(duel.relativeS(state.s, cruiser.s) - cruiser.s,
      state.lateral - cruiser.lateral);
}

export function _newPursuit(gap) {
  const s = this.state, distance = s.s - gap;
  const routeId = this._surface(s.s, s.lateral).shortcutId;
  const route = this.course.features.shortcuts?.find(cut => cut.id === routeId);
  const phase = this.course.phase?.(distance) ?? distance;
  const onBranch = route && phase >= route.start && phase <= route.end;
  const lateral = onBranch ? this.course.shortcutOffset(route, distance) : -DRIVE.laneOffset;
  const branchHeading = onBranch ? Math.atan((this.course.shortcutOffset(route, distance + .5) - this.course.shortcutOffset(route, distance - .5)) / Math.max(.25, 1 - this.course.at(distance).curvature * lateral)) : 0;
  return { kind: 'police', active: true, caught: false, gapU: gap, distanceU: gap,
    damageZones: freshDamageZones(), damageCooldown: 0,
    s: distance, prevS: distance, lateral,
    headingError: branchHeading, pushVelocity: 0, speedMph: this._policePace(), contactCooldown: 0, routeId: onBranch ? route.id : null };
}

export function _policePace() {
  return this.course.def.kind === 'chase' ? CARS[this.state.car].topSpeed * (.42 + .15 * CPU_DIFFICULTY[this.state.cpuDifficulty].skill) : POLICE.pursuitSpeedMph;
}

export function _movePolice(cruiser, dt) {
  const s = this.state;
  // Older saved/debug pursuit objects only had a gap. Give them a physical
  // pose once, then derive the gap from that pose for the rest of the chase.
  if (!Number.isFinite(cruiser.s)) Object.assign(cruiser, this._newPursuit(cruiser.gapU ?? POLICE.pursuitStartGapU));
  cruiser.prevS = cruiser.s; cruiser.prevLateral = cruiser.lateral;
  cruiser.prevAirHeight = cruiser.airHeight || 0;
  cruiser.headingError ||= 0; cruiser.pushVelocity ||= 0;
  cruiser.braking = false; cruiser.yieldingToPlayer = false;
  cruiser.contactCooldown = Math.max(0, (cruiser.contactCooldown || 0) - dt);
  if (this.featureFlags?.enabled('crash-physics') === true && cruiser.knock) {
    stepKnock(this, cruiser, dt);
    finishPoliceMotion(this, cruiser);
    return;
  }
  const cuts = this.course.features.shortcuts || [], phase = this.course.phase?.(cruiser.s) ?? cruiser.s;
  const playerCut = cuts.find(cut => cut.id === this._surface(s.s, s.lateral).shortcutId);
  let route = cuts.find(cut => cut.id === cruiser.routeId && phase >= cut.start - 70 && phase <= cut.end);
  if (!route && playerCut && phase >= playerCut.start - 70 && phase <= playerCut.start + 25) route = playerCut;
  cruiser.routeId = route?.id || null;
  const lookahead = Math.min(16, cruiser.speedMph * DRIVE.mphToWorld * .25);
  let lane = route ? this.course.shortcutOffset(route, Math.min(route.end, phase + lookahead))
    : Math.abs(s.lateral) < this._surface(cruiser.s, 0).roadHalfWidth - 1.5 ? s.lateral : -DRIVE.laneOffset;
  let target = this._policePace();
  const curve = Math.max(Math.abs(this.course.at(cruiser.s).curvature), Math.abs(this.course.at(cruiser.s + 75).curvature));
  if (curve > .0001) target = Math.min(target, Math.sqrt(DRIVE.maxLateralAccel * .94 / curve) / DRIVE.mphToWorld);
  const policeSurface = this._drivingSurface(cruiser.s, cruiser.lateral, { topSpeed: this._policePace(), offRoadSpeed: 90, offRoadGrip: .85, offRoadScrub: .22 });
  cruiser.offRoad = !policeSurface.mainRoad; cruiser.preparedGravel = policeSurface.preparedGravel;
  if (cruiser.offRoad) target = Math.min(target, policeSurface.speedLimit);
  if (cruiser.contactCooldown > 0) target *= .55;
  if (!route) for (const traffic of s.traffic) {
    if (!traffic.alive) continue;
    const ahead = this.relativeS(traffic.s, cruiser.s) - cruiser.s;
    if (ahead > -6 && ahead < 60 && Math.abs(traffic.lateral - lane) < 2.8) {
      const alternate = traffic.lateral > 0 ? -DRIVE.laneOffset : DRIVE.laneOffset;
      const blocked = s.traffic.some(other => other !== traffic && other.alive && Math.abs(this.relativeS(other.s, cruiser.s) - cruiser.s) < 60 && Math.abs(other.lateral - alternate) < 2.8);
      if (!blocked) lane = alternate; else target = Math.min(target, traffic.dir < 0 ? 12 : Math.max(8, traffic.speedMph - 5));
    }
  }
  const lead = this.relativeS(s.s, cruiser.s) - cruiser.s;
  const playerForward = s.speedMph * Math.max(0, Math.cos(s.headingError || 0));
  const lateral = s.lateral - cruiser.lateral, lateralFuture = lateral + (Math.sin(s.headingError || 0) * s.speedMph - Math.sin(cruiser.headingError) * cruiser.speedMph) * DRIVE.mphToWorld * .6;
  const footprint = this._vehicleSpec(s), angle = (s.headingError || 0) + (s.slipAngle || 0);
  const corridor = footprint.halfWidth * (1 + Math.abs(Math.cos(angle))) + footprint.halfLength * Math.abs(Math.sin(angle)) + .55;
  const cutIn = Math.abs(lateral) < corridor || Math.abs(lateralFuture) < corridor || lateral * lateralFuture < 0;
  // Stay near a fleeing off-road driver instead of overtaking on the main
  // road and teleporting sideways through the intervening buildings.
  if (lead < 14 && !cutIn && !this._surface(s.s, s.lateral).road) target = Math.min(target, Math.max(0, playerForward + (lead - 8) * 1.5));
  const plannedHeading = clamp(Math.atan((lane - cruiser.lateral) * 2.4 / Math.max(15, cruiser.speedMph * DRIVE.mphToWorld)), -.7, .7);
  const yieldPlan = this._npcYield(cruiser, Math.max(0, target), plannedHeading);
  target = yieldPlan.targetMph;
  cruiser.braking = cruiser.speedMph > target;
  const braking = cruiser.yieldingToPlayer ? yieldPlan.braking : 65;
  cruiser.speedMph += clamp(target - cruiser.speedMph, -braking * dt, 32 * dt);
  if (cruiser.offRoad) cruiser.speedMph *= Math.exp(-policeSurface.scrub * dt * (policeSurface.preparedGravel ? .25 : 1));
  const desired = clamp(Math.atan((lane - cruiser.lateral) * 2.4 / Math.max(15, cruiser.speedMph * DRIVE.mphToWorld)), -.7, .7);
  const policeTurnRate = policeSurface.preparedGravel ? 1.05 * policeSurface.traction : cruiser.offRoad ? .7 : 1.05;
  cruiser.headingError += clamp(desired - cruiser.headingError, -dt * policeTurnRate, dt * policeTurnRate);
  const speed = cruiser.speedMph * DRIVE.mphToWorld;
  cruiser.lateral += (Math.sin(cruiser.headingError) * speed + cruiser.pushVelocity) * dt;
  cruiser.s += Math.cos(cruiser.headingError) * speed * dt / Math.max(.25, 1 - this.course.at(cruiser.s).curvature * cruiser.lateral);
  cruiser.pushVelocity *= Math.exp(-1.7 * dt);
  this._jump(cruiser, dt);
  finishPoliceMotion(this, cruiser);
}

export function _police(dt, allowTicket = true) {
  if (this.course.def.practice || this.state.mode === 'wasteland') return;
  const s = this.state, p = s.police;
  const chase = this.course.def.kind === 'chase';
  const radar = this.course.nearestRadar(s.s);
  // escalating detector beep as you near a trap
  if (radar) {
    const dist = radar.s - s.s;
    p.beep = dist > 0 ? Math.max(0, 1 - dist / POLICE.detectorRangeU) : 0;
    // crossing the trap over the limit triggers a pursuer
    if (!p.triggered && dist <= 0 && dist > -POLICE.trapWindowU && s.speedMph > radar.limitMph + POLICE.trapOverLimitMph) {
      p.triggered = true;
      p.pursuit = this._newPursuit(POLICE.pursuitStartGapU);
      this._callout('POLICE PURSUIT. OPEN THE GAP.', 3);
      this.emit({ radarTriggered: true, speed: Math.round(s.speedMph), limit: radar.limitMph });
    }
  } else {
    p.beep = Math.max(0, p.beep - dt);
  }
  if (p.pursuit && p.pursuit.active) {
    if (p.pursuit.crushed) { p.beep = 0; return; }
    this._movePolice(p.pursuit, dt);
    if (p.pursuit.crushed) { p.beep = 0; return; }
    if (chase) p.beep = clamp(1 - p.pursuit.distanceU / 500, 0, 1);
    if (allowTicket && s.status === 'racing' && s.impactTimer <= 0 && p.pursuit.distanceU <= POLICE.pursuitCatchU) {
      p.pursuit.active = false; p.pursuit.caught = true;
      this._ticket(radar);
    } else if (p.pursuit.gapU >= POLICE.escapeAheadU) {
      if (chase) return;
      this._awardPoliceEscape('gap');
    }
  }
}

export function _awardPoliceEscape(reason) {
  const s = this.state, pursuit = s.police.pursuit;
  if (!pursuit?.active || pursuit.caught || pursuit.escapeAwarded) return false;
  pursuit.active = false; pursuit.escapeAwarded = true;
  const points = SCORING.policeEscapePoints * this.scoreMultiplier;
  s.policeEscapes++; s.stageStyleScore += points; s.score += points;
  this._callout(`PURSUIT EVADED  /  +${points}`, 3);
  this.emit({ escaped: true, policeEscape: { points, count: s.policeEscapes, reason } });
  return true;
}

export function _ticket(radar) {
  const s = this.state;
  if (s.status !== 'racing' || this.course.def.practice || s.mode === 'wasteland') return;
  const penalty = this.stageDef.kind === 'chase' ? this.stageDef.chaseCatchPenaltySec : POLICE.ticketPenaltySec;
  s.status = 'ticket';
  s.boosting = false;
  s.police.ticket = {
    ticketIndex: ++s.police.ticketCount,
    offense: this.stageDef.kind === 'chase' ? 'Intercepted by pursuit patrol' : 'Speeding past a radar trap',
    speedMph: Math.round(s.speedMph),
    limitMph: radar ? radar.limitMph : this.stageDef.speedLimitMph,
    penaltySec: penalty,
    fine: POLICE.ticketBaseFine,
  };
  s.penaltySec += penalty;
  s.racePenaltySec += penalty;
  s.totalTimeSec += penalty;
  // Record the pending earnings fine before a catch can also end a timed
  // pursuit. Saved credits are never debited by a catch.
  this.emit({ ticket: s.police.ticket });
  this._deadline();
}

export function ackTicket() {
  const s = this.state;
  if (s.status !== 'ticket') return;
  s.police.pursuit = this.course.def.kind === 'chase' ? this._newPursuit(260) : null;
  s.speedMph = Math.min(s.speedMph, POLICE.ticketSpeedCapMph);
  s.status = 'racing';
  this.emit({ ticketAcked: true });
}
