// Road-coordinate arcade driving with independent vehicle heading, steering
// traction, rough shoulders, and timed impact recovery. The simulation also
// owns traffic, police, gearbox, lives and campaign progression. step(dt)
// runs identically in headless tests and the fixed-step browser loop.

import { CARS, DEFAULT_CAR, DIFFICULTY, DEFAULT_DIFFICULTY, COURSE, LIVES, POLICE, DRIVE, TRAFFIC, SCORING, BOOST, steeringYawAuthority } from './config.js';
import { Course } from './course.js';
import { makeRng, seedFromUrl } from './rng.js';

export class Duel {
  constructor(opts = {}) {
    this.seed = (opts.seed ?? seedFromUrl()) >>> 0;
    this.difficultyKey = DIFFICULTY[opts.difficulty] ? opts.difficulty : DEFAULT_DIFFICULTY;
    this.carKey = CARS[opts.car] ? opts.car : DEFAULT_CAR;
    this.listeners = new Set();
    this.state = this._freshState();
  }

  _freshState() {
    return {
      seed: this.seed,
      status: 'menu', // menu -> countdown -> racing -> (crashed|ticket) -> stage_result -> ... -> gameover|complete
      paused: false,
      car: this.carKey,
      difficulty: this.difficultyKey,
      stageIndex: 0,
      lives: LIVES.start,
      penaltySec: 0,
      stageTimeSec: 0,
      totalTimeSec: 0,
      // driving
      s: 0, lateral: 0, speedMph: 0, gear: 0, revs: 0, overrevSec: 0, offRoad: false,
      steerVisual: 0, boost: 1, boosting: false, invulnerableSec: 0,
      headingError: 0, yawVelocity: 0, roughness: 0, offRoadTime: 0, slipAngle: 0, drifting: false,
      impactTimer: 0, impactDuration: 0, impactStrength: 0, impactSide: 1, crashSpin: 0,
      majorCrashes: 0, catastrophic: false,
      score: 0, stageStyleScore: 0, nearMisses: 0, combo: 0, comboTimer: 0,
      callout: '', calloutTimer: 0,
      // police
      police: { beep: 0, triggered: false, pursuit: null, ticket: null },
      // rival
      rival: null,
      // traffic
      traffic: [],
      // input (set by main.js or autopilot)
      input: { throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false },
      countdown: 0,
      results: null,
      mode: 'duel', // 'duel' | 'timetrial'
      lastCrashReason: null,
      crashFlash: 0,
    };
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) fn(this.state, ev); }

  get car() { return CARS[this.state.car]; }
  get diff() { return DIFFICULTY[this.state.difficulty]; }
  get stageDef() { return COURSE[this.state.stageIndex]; }

  // ---- lifecycle -------------------------------------------------------
  startCampaign({ mode = 'duel', car, difficulty } = {}) {
    if (CARS[car]) this.state.car = car;
    if (DIFFICULTY[difficulty]) this.state.difficulty = difficulty;
    this.state.mode = mode === 'timetrial' ? 'timetrial' : 'duel';
    this.state.stageIndex = 0;
    this.state.lives = LIVES.start;
    this.state.totalTimeSec = 0;
    this.state.penaltySec = 0;
    this.state.score = 0;
    this.state.nearMisses = 0;
    this.state.majorCrashes = 0;
    this.state.catastrophic = false;
    this._loadStage(0);
  }

  _loadStage(idx) {
    const s = this.state;
    s.stageIndex = idx;
    this.course = new Course(COURSE[idx], this.seed);
    s.s = 0; s.lateral = 0; s.speedMph = 0; s.gear = 0; s.revs = 0; s.overrevSec = 0;
    s.paused = false; s.offRoad = false; s.steerVisual = 0;
    s.boost = 1; s.boosting = false; s.invulnerableSec = 0;
    s.headingError = 0; s.yawVelocity = 0; s.roughness = 0; s.offRoadTime = 0;
    s.slipAngle = 0; s.drifting = false;
    s.impactTimer = 0; s.impactDuration = 0; s.impactStrength = 0; s.impactSide = 1; s.crashSpin = 0;
    s.combo = 0; s.comboTimer = 0; s.stageStyleScore = 0;
    s.callout = ''; s.calloutTimer = 0;
    s.input = { throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false };
    s.stageTimeSec = 0;
    s.police = { beep: 0, triggered: false, pursuit: null, ticket: null };
    s.results = null;
    s.lastCrashReason = null;
    s.crashFlash = 0;
    s.countdown = 3;
    s.status = 'countdown';
    // rival
    s.rival = (COURSE[idx].hasRival && s.mode === 'duel')
      ? { s: this.course.rivalStartS, lateral: -DRIVE.laneOffset, speedMph: 0, finished: false, finishTime: null }
      : null;
    // pre-spawn deterministic two-way traffic
    s.traffic = this._spawnTraffic(idx);
    this.emit({ stageLoaded: idx, countdown: 3 });
  }

  _spawnTraffic(idx) {
    const def = COURSE[idx];
    const rng = makeRng(this.seed ^ (idx * 0x51ed) ^ 0x7a17);
    const density = this.diff.trafficDensity
      * (this.course.theme.fogDensity > TRAFFIC.fogDensityThreshold ? TRAFFIC.fogSpawnMult : 1);
    const gap = TRAFFIC.baseGapU / Math.max(0.4, density);
    const cars = [];
    for (let s = 320; s < def.lengthU - 120; s += gap * rng.range(0.7, 1.3)) {
      const oncoming = rng.chance(TRAFFIC.oncomingShare);
      cars.push({
        s, dir: oncoming ? -1 : 1,
        lateral: oncoming ? DRIVE.laneOffset : -DRIVE.laneOffset,
        speedMph: TRAFFIC.carSpeedMph * rng.range(0.8, 1.15),
        alive: true,
      });
    }
    return cars;
  }

  // ---- the core step ---------------------------------------------------
  step(dt) {
    const s = this.state;
    if (!Number.isFinite(dt) || dt <= 0 || s.paused) return;
    // Substeps retain swept collision detection and stable handling after a slow frame.
    if (dt > 0.05) {
      let remaining = Math.min(dt, 1);
      while (remaining > 0.000001) { const slice = Math.min(0.05, remaining); this.step(slice); remaining -= slice; }
      return;
    }
    if (s.status === 'countdown') {
      const beat = Math.ceil(s.countdown);
      s.countdown -= dt;
      if (s.countdown <= 0) { s.status = 'racing'; this._callout('GO. MAKE IT COUNT.', 2); this.emit({ go: true }); }
      else if (Math.ceil(s.countdown) !== beat) this.emit({ countdown: Math.ceil(s.countdown) });
      return;
    }
    if (s.status !== 'racing') {
      if (s.status === 'gameover' && s.impactTimer > 0) this._impact(dt);
      return;
    }

    s.stageTimeSec += dt;
    s.totalTimeSec += dt;
    if (s.crashFlash > 0) s.crashFlash = Math.max(0, s.crashFlash - dt);
    s.invulnerableSec = Math.max(0, s.invulnerableSec - dt);
    s.calloutTimer = Math.max(0, s.calloutTimer - dt);
    s.comboTimer = Math.max(0, s.comboTimer - dt);
    if (s.comboTimer === 0) s.combo = 0;

    if (s.impactTimer > 0) {
      this._impact(dt);
      this._traffic(dt);
      if (s.rival) this._rival(dt);
      return; // A crash must play out before a ticket or finish can replace it.
    }

    // each sub-step can end the run (gameover crash, ticket); once the status
    // leaves 'racing' the rest of the frame must not keep simulating, or a
    // finish-line crossing could overwrite the gameover/ticket state
    this._drive(dt);
    if (s.status !== 'racing' || s.impactTimer > 0) return;
    this._traffic(dt);
    this._collisions();
    if (s.status !== 'racing' || s.impactTimer > 0) return;
    this._police(dt);
    if (s.status !== 'racing') return;
    if (s.rival) this._rival(dt);

    // stage finish (reach the gas station)
    if (s.s >= this.course.length) this._finishStage();
  }

  _drive(dt) {
    const s = this.state, car = this.car, d = this.diff;
    // recorded up front (not at the integration line) so the swept collision
    // test stays valid on frames where a crash bails out of _drive early
    s.prevS = s.s;
    s.prevLateral = s.lateral;
    const previousGear = s.gear;
    // gearbox
    const gmax = car.gears[s.gear];
    s.revs = gmax ? s.speedMph / gmax : 0;
    if (d.autoShift) {
      if (s.revs > 0.96 && s.gear < car.gears.length - 1) s.gear++;
      else if (s.revs < 0.55 && s.gear > 0) s.gear--;
    } else {
      if (s.input.shiftUp && s.gear < car.gears.length - 1) s.gear++;
      if (s.input.shiftDown && s.gear > 0) s.gear--;
    }
    s.input.shiftUp = s.input.shiftDown = false;
    if (s.gear !== previousGear) this.emit({ shift: s.gear });

    // acceleration limited by the current gear's max speed
    const gearMax = car.gears[s.gear];
    const accelFactor = Math.max(0.15, 1 - Math.max(0, s.revs - 0.5)); // falls off near redline
    if (s.input.throttle > 0) {
      const ceil = Math.min(car.topSpeed, gearMax * DRIVE.gearCeilFrac);
      if (s.speedMph < ceil) s.speedMph += car.accel * accelFactor * s.input.throttle * dt * DRIVE.accelScale;
    }
    if (s.input.brake > 0) s.speedMph -= DRIVE.brakeAccel * car.braking * s.input.brake * dt;
    s.speedMph -= DRIVE.dragCoeff * dt * (s.input.throttle > 0 ? 0.2 : 1);

    const wasBoosting = s.boosting;
    s.boosting = !!s.input.boost && s.boost > 0 && s.speedMph >= BOOST.minSpeedMph && !s.offRoad && s.input.brake === 0;
    if (s.boosting) {
      const available = Math.min(1, s.boost / (BOOST.drainPerSec * dt));
      s.boost = Math.max(0, s.boost - BOOST.drainPerSec * dt);
      const boostCeiling = d.autoShift ? car.topSpeed * BOOST.topSpeedMult : Math.min(car.topSpeed * BOOST.topSpeedMult, gearMax * DRIVE.gearCeilFrac);
      s.speedMph += Math.max(0, Math.min(boostCeiling - s.speedMph, BOOST.accelMphPerSec * dt * available));
    } else if (!s.input.boost) {
      s.boost = Math.min(1, s.boost + BOOST.refillPerSec * dt);
    }
    if (s.boosting && !wasBoosting) this.emit({ boostStarted: true });

    // engine blow if you ride the limiter on a Pro manual — the threshold sits
    // below the gear ceiling so holding throttle without upshifting gets there
    if (!d.autoShift && d.engineBlow && s.revs > DRIVE.overRevFrac && s.input.throttle > 0) {
      s.overrevSec += dt;
      if (s.overrevSec > DRIVE.overRevBlowSec) { this._crash('engine_blew'); return; }
    } else {
      s.overrevSec = Math.max(0, s.overrevSec - dt);
    }

    // A released steering wheel keeps a physical world heading. The road can
    // bend away underneath the car; it never supplies free steering.
    const frame = this.course.at(s.s);
    s.offRoad = Math.abs(s.lateral) > DRIVE.roadHalfWidth;
    s.offRoadTime = s.offRoad ? s.offRoadTime + dt : Math.max(0, s.offRoadTime - dt * 3);
    const shoulderDepth = Math.max(0, Math.abs(s.lateral) - DRIVE.roadHalfWidth);
    const roughTarget = s.offRoad ? Math.min(1, .32 + shoulderDepth * .12 + s.offRoadTime * .2) : 0;
    s.roughness += (roughTarget - s.roughness) * (1 - Math.exp(-8 * dt));
    const traction = s.offRoad ? DRIVE.offRoadGrip : 1;
    s.steerVisual += (s.input.steer - s.steerVisual) * (1 - Math.exp(-DRIVE.steerResponse * dt));
    const targetYaw = -s.steerVisual * steeringYawAuthority(s.speedMph, car.grip, traction);
    s.yawVelocity += (targetYaw - s.yawVelocity) * (1 - Math.exp(-DRIVE.yawResponse * dt));
    // The nose turns first while momentum carries the rear outward. A short
    // release or counter-steer settles the slide without steering toward the road.
    const driftSpeed=Math.max(0,Math.min(1,(s.speedMph-38)/85));
    const slipTarget=-s.steerVisual*driftSpeed*(s.offRoad?.31:.21)*(1+s.input.brake*.6);
    s.slipAngle+=(slipTarget-s.slipAngle)*(1-Math.exp(-(s.input.steer*s.slipAngle>0?13:7)*dt));
    s.drifting=Math.abs(s.slipAngle)>.075&&s.speedMph>40;
    if (s.offRoad) {
      s.speedMph *= Math.exp(-DRIVE.offRoadScrub * dt);
      s.boosting = false;
    }

    const speedCap = s.boosting ? car.topSpeed * BOOST.topSpeedMult : car.topSpeed;
    if (!s.boosting && s.speedMph > speedCap) s.speedMph -= 22 * dt;
    s.speedMph = Math.max(0, Math.min(car.topSpeed * BOOST.topSpeedMult, s.speedMph));
    s.revs = s.speedMph / car.gears[s.gear];
    const metresPerSec = s.speedMph * DRIVE.mphToWorld;
    const forward = Math.max(0, Math.cos(s.headingError)) * metresPerSec * dt;
    s.headingError += s.yawVelocity * dt - frame.curvature * forward;
    s.headingError = Math.max(-1.45, Math.min(1.45, s.headingError));
    s.lateral += Math.sin(s.headingError) * metresPerSec * dt;
    s.s += forward;
    s.offRoad = Math.abs(s.lateral) > DRIVE.roadHalfWidth;
    // Dirt alone never consumes a life or structural hit. Only contact does.
  }

  _traffic(dt) {
    const s = this.state;
    for (const c of s.traffic) {
      if (!c.alive) continue;
      c.prevS = c.s;
      c.s += c.dir * c.speedMph * DRIVE.mphToWorld * dt;
    }
  }

  _collisions() {
    const s = this.state;
    for (const c of s.traffic) {
      if (!c.alive) continue;
      // swept longitudinal test: a head-on closing speed can cross the whole
      // hit window in one clamped frame, so a relative sign flip counts too
      const now = c.s - s.s;
      const prev = (c.prevS ?? c.s) - (s.prevS ?? s.s);
      const hitLong = Math.abs(now) < TRAFFIC.collideLongU || (prev > 0) !== (now > 0);
      const clearance = Math.abs(c.lateral - s.lateral);
      if (s.invulnerableSec <= 0 && hitLong && clearance < TRAFFIC.collideLatU) {
        c.alive = false;
        const closingMph=Math.abs(s.speedMph-c.dir*c.speedMph);
        this._crash(c.dir<0?'head_on':'traffic',Math.sign(s.lateral-c.lateral),closingMph);
        return;
      }
      // Reward a completed pass once, rather than every frame spent near a car.
      if (!c.passed && prev > 0 && now <= 0) {
        c.passed = true;
        if (s.invulnerableSec <= 0 && clearance >= TRAFFIC.collideLatU && clearance < TRAFFIC.nearMissLatU && s.speedMph >= TRAFFIC.nearMissMinMph) {
          s.combo = Math.min(SCORING.comboMax, s.combo + 1);
          s.comboTimer = SCORING.comboWindowSec;
          s.nearMisses++;
          const points = SCORING.nearMissPoints * s.combo;
          s.stageStyleScore += points; s.score += points;
          s.boost = Math.min(1, s.boost + BOOST.nearMissRefill);
          this._callout(`NEAR MISS  +${points}${s.combo > 1 ? `  /  ${s.combo}× COMBO` : ''}`);
          this.emit({ nearMiss: { points, combo: s.combo } });
        }
      }
    }
    if(s.invulnerableSec<=0)for(const rock of this.course.rocksNear(s.prevS??s.s,s.s)){
      const ds=s.s-(s.prevS??s.s),dl=s.lateral-(s.prevLateral??s.lateral);
      const rz=rock.radiusZ+1.7,rx=rock.radiusX+.85;
      const x=((s.prevLateral??s.lateral)-rock.off)/rx,z=((s.prevS??s.s)-rock.s)/rz;
      const vx=dl/rx,vz=ds/rz,t=Math.max(0,Math.min(1,-(x*vx+z*vz)/Math.max(1e-8,vx*vx+vz*vz)));
      if((x+vx*t)**2+(z+vz*t)**2<1){this._crash('rock',Math.sign(s.lateral-rock.off),s.speedMph);return;}
    }
  }

  _police(dt) {
    const s = this.state, p = s.police;
    const radar = this.course.nearestRadar(s.s);
    // escalating detector beep as you near a trap
    if (radar) {
      const dist = radar.s - s.s;
      p.beep = dist > 0 ? Math.max(0, 1 - dist / POLICE.detectorRangeU) : 0;
      // crossing the trap over the limit triggers a pursuer
      if (!p.triggered && dist <= 0 && dist > -POLICE.trapWindowU && s.speedMph > radar.limitMph + POLICE.trapOverLimitMph) {
        p.triggered = true;
        p.pursuit = { active: true, gapU: POLICE.pursuitStartGapU, caught: false };
        this._callout('POLICE PURSUIT. OPEN THE GAP.', 3);
        this.emit({ radarTriggered: true, speed: Math.round(s.speedMph), limit: radar.limitMph });
      }
    } else {
      p.beep = Math.max(0, p.beep - dt);
    }
    // pursuit dynamics: gapU is the player's lead — it closes when the
    // cruiser is faster, opens when the player outruns it
    if (p.pursuit && p.pursuit.active) {
      const rel = s.speedMph - POLICE.pursuitSpeedMph;
      p.pursuit.gapU += rel * DRIVE.mphToWorld * dt;
      if (p.pursuit.gapU <= POLICE.pursuitCatchU) {
        p.pursuit.active = false; p.pursuit.caught = true;
        this._ticket(radar);
      } else if (p.pursuit.gapU >= POLICE.escapeAheadU) {
        p.pursuit.active = false;
        this._callout('PURSUIT EVADED', 3);
        this.emit({ escaped: true });
      }
    }
  }

  _ticket(radar) {
    const s = this.state;
    s.status = 'ticket';
    s.boosting = false;
    s.police.ticket = {
      offense: 'Speeding past a radar trap',
      speedMph: Math.round(s.speedMph),
      limitMph: radar ? radar.limitMph : this.stageDef.speedLimitMph,
      penaltySec: POLICE.ticketPenaltySec,
      fine: POLICE.ticketBaseFine,
    };
    s.penaltySec += POLICE.ticketPenaltySec;
    s.totalTimeSec += POLICE.ticketPenaltySec;
    this.emit({ ticket: s.police.ticket });
  }

  // Acknowledge the ticket screen and resume the stage (penalty already paid;
  // the pursuer leaves and won't re-trigger — one pursuer per stage).
  ackTicket() {
    const s = this.state;
    if (s.status !== 'ticket') return;
    s.police.pursuit = null;
    s.speedMph = Math.min(s.speedMph, POLICE.ticketSpeedCapMph);
    s.status = 'racing';
    this.emit({ ticketAcked: true });
  }

  _rival(dt) {
    const s = this.state, r = s.rival;
    if (r.finished) return;
    // beatable AI: targets a pace with mild rubber-banding and visible slips
    const skill = this.diff.rivalSkill;
    const targetPace = this.car.topSpeed * (0.66 + 0.18 * skill);
    const rubber = (s.s - r.s) * 0.012; // catches up if behind, eases if ahead
    let target = targetPace + rubber;
    // occasional "mistake": brief slow patch keyed deterministically to distance
    if (Math.sin(r.s * 0.01) > 0.96) target *= 0.6;
    r.speedMph += (target - r.speedMph) * Math.min(1, dt * 1.5);
    r.s += r.speedMph * DRIVE.mphToWorld * dt;
    // rival weaves between lanes
    r.lateral = -DRIVE.laneOffset + Math.sin(r.s * 0.02) * 1.4;
    if (r.s >= this.course.length) { r.finished = true; r.finishTime = s.stageTimeSec; this.emit({ rivalFinished: true }); }
  }

  _crash(reason, side = 0, impactMph = this.state.speedMph) {
    const s = this.state;
    if (s.impactTimer > 0 || s.status !== 'racing') return;
    s.boosting = false;
    s.combo = 0; s.comboTimer = 0;
    s.lives -= LIVES.crashLifeCost;
    s.penaltySec += LIVES.crashPenaltySec;
    s.totalTimeSec += LIVES.crashPenaltySec;
    s.lastCrashReason = reason;
    s.crashFlash = 1.2;
    s.impactStrength = Math.max(.35, Math.min(1, impactMph / 145));
    if ((reason === 'head_on' || reason === 'rock') && impactMph >= DRIVE.majorImpactMph) s.majorCrashes++;
    s.catastrophic = s.majorCrashes >= DRIVE.majorCrashLimit;
    s.impactSide = side || Math.sign(s.lateral) || Math.sign(s.headingError) || 1;
    s.impactDuration = DRIVE.impactDuration + s.impactStrength * .25;
    if (s.catastrophic) { s.impactDuration = DRIVE.catastrophicDuration; s.impactStrength = 1; }
    s.impactTimer = s.impactDuration;
    s.crashSpin = 0;
    s.slipAngle = 0; s.drifting = false;
    s.invulnerableSec = s.impactDuration + DRIVE.recoverySec;
    s.speedMph = Math.min(DRIVE.crashSpeedCapMph, s.speedMph * .3);
    this._callout(reason === 'engine_blew' ? 'ENGINE FAILURE. SHIFT EARLIER.' : 'IMPACT  /  +30 SECONDS', 2.8);
    this.emit({ crash: reason, livesLeft: s.lives, strength: s.impactStrength, side: s.impactSide, explosion: s.catastrophic });
    if (s.lives <= 0 || s.catastrophic) {
      s.status = 'gameover';
      s.results = { gameover: true, catastrophic: s.catastrophic, majorCrashes: s.majorCrashes, stageIndex: s.stageIndex, totalTimeSec: Math.round(s.totalTimeSec) };
      this.emit({ gameover: true });
      return;
    }
    // Hold the impact location. Recovery happens after the visible skid.
    s.steerVisual = 0; s.yawVelocity = 0; s.overrevSec = 0;
    s.status = 'racing';
  }

  _impact(dt) {
    const s = this.state, remaining = s.impactTimer / s.impactDuration;
    s.prevS = s.s;
    s.impactTimer = Math.max(0, s.impactTimer - dt);
    s.speedMph *= Math.exp(-3.2 * dt);
    s.crashSpin += s.impactSide * s.impactStrength * 5 * remaining * dt;
    s.lateral += s.impactSide * s.speedMph * DRIVE.mphToWorld * .15 * remaining * dt;
    s.s = Math.min(this.course.length - 1, s.s + s.speedMph * DRIVE.mphToWorld * .3 * dt);
    s.revs = s.speedMph / this.car.gears[s.gear];
    s.roughness = Math.max(s.roughness, remaining * s.impactStrength);
    if (s.impactTimer === 0 && s.status === 'racing') {
      s.lateral = 0; s.headingError = 0; s.yawVelocity = 0; s.crashSpin = 0;
      s.speedMph = 12; s.gear = 0; s.revs = s.speedMph / this.car.gears[0];
      s.offRoad = false; s.offRoadTime = 0; s.roughness = 0;
      s.input.shiftUp = false; s.input.shiftDown = false;
      this._callout('BACK ON THE ROAD. FIND YOUR LINE.', 2);
      this.emit({ recovered: true });
    }
  }

  _finishStage() {
    const s = this.state;
    // missed the gas station if you arrive off the paved road; else clean stage
    const missed = Math.abs(s.lateral) > DRIVE.roadHalfWidth;
    if (missed) { s.lives -= LIVES.missedStationCost; }
    else { s.lives += LIVES.cleanStageReward; }

    const par = this.course.length / (SCORING.parSpeedMph * DRIVE.mphToWorld);
    const timeBonus = Math.max(0, Math.round((par - s.stageTimeSec) * SCORING.perSecondUnder));
    const beatRival = s.rival ? (s.rival.finishTime == null || s.stageTimeSec <= s.rival.finishTime) : null;
    const stageBaseScore = SCORING.perStageBase + timeBonus + s.lives * SCORING.perLifeLeft;
    const score = stageBaseScore + s.stageStyleScore;
    s.score += stageBaseScore;
    s.boosting = false;

    this._recordBest(this.stageDef.name, s.stageTimeSec);
    s.results = {
      stageIndex: s.stageIndex, stageName: this.stageDef.name,
      stageTimeSec: +s.stageTimeSec.toFixed(2), missedStation: missed,
      cleanStage: !missed, lives: s.lives, timeBonus, beatRival, score, styleScore: s.stageStyleScore,
      best: this._bestFor(this.stageDef.name),
    };
    if (s.lives <= 0) { s.status = 'gameover'; s.results.gameover = true; this.emit({ gameover: true }); return; }
    s.status = 'stage_result';
    this.emit({ stageResult: s.results });
  }

  nextStage() {
    const s = this.state;
    if (s.status !== 'stage_result') return;
    if (s.stageIndex + 1 >= COURSE.length) {
      s.status = 'complete';
      s.results = { complete: true, totalTimeSec: Math.round(s.totalTimeSec), lives: s.lives, score: s.score, nearMisses: s.nearMisses };
      this.emit({ complete: true });
      return;
    }
    this._loadStage(s.stageIndex + 1);
  }

  // ---- best times (localStorage with in-memory fallback) ---------------
  _recordBest(stageName, timeSec) {
    const all = loadBest();
    const key = this._bestKey(stageName);
    if (all[key] == null || timeSec < all[key]) { all[key] = +timeSec.toFixed(2); saveBest(all); }
  }
  _bestKey(stageName) { return [stageName, this.state.car, this.state.difficulty, this.state.mode].join('|'); }
  _bestFor(stageName) { return loadBest()[this._bestKey(stageName)] ?? null; }

  // ---- input helpers ---------------------------------------------------
  _callout(text, seconds = 2.2) { this.state.callout = text; this.state.calloutTimer = seconds; }
  setInput(partial) {
    const input = this.state.input;
    for (const key of ['throttle', 'brake', 'steer']) {
      if (Number.isFinite(partial[key])) input[key] = Math.max(key === 'steer' ? -1 : 0, Math.min(1, partial[key]));
    }
    for (const key of ['boost', 'shiftUp', 'shiftDown']) if (partial[key] != null) input[key] = !!partial[key];
  }
}

let memoryBest = {};
const BEST_STORAGE_KEY = 'duel_redline_best_v2';
function loadBest() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(BEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        memoryBest = Object.fromEntries(Object.entries(parsed).filter(([, time]) => Number.isFinite(time) && time > 0));
      }
    }
  } catch (_) {}
  return { ...memoryBest };
}
function saveBest(obj) {
  memoryBest = { ...obj };
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(BEST_STORAGE_KEY, JSON.stringify(obj)); } catch (_) {}
}
