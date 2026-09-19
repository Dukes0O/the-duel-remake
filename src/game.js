// Road-coordinate arcade driving with independent vehicle heading, steering
// traction, rough shoulders, and timed impact recovery. The simulation also
// owns traffic, police, gearbox, lives and campaign progression. step(dt)
// runs identically in headless tests and the fixed-step browser loop.

import { CARS, DEFAULT_CAR, DIFFICULTY, DEFAULT_DIFFICULTY, CPU_DIFFICULTY, DEFAULT_CPU_DIFFICULTY, COURSE, LIVES, POLICE, DRIVE, TRAFFIC, SCORING, BOOST, steeringYawAuthority } from './config.js';
import { Course } from './course.js';
import { makeRng, seedFromUrl } from './rng.js';
import { sweepBox, sweepObstacle, contactZone, segmentCircle, CAR_HALF_WIDTH, CAR_HALF_LENGTH } from './collision.js';
import { NpcRoutePlanner } from './npc-route.js';
import { createDriftState, stepDrift, finishDrift, breakDrift } from './drift-scoring.js';

const BOUNDARY_WARNING = 60, BOUNDARY_RESET = 78;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const UPGRADE_KEYS = ['engine', 'nitro', 'handling', 'tires', 'brakes', 'suspension', 'tank'];

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
      cpuDifficulty: DEFAULT_CPU_DIFFICULTY, playerId: null,
      upgrades: Object.fromEntries(UPGRADE_KEYS.map(key => [key, 0])),
      stageIndex: 0,
      lives: LIVES.start,
      penaltySec: 0,
      stageTimeSec: 0,
      totalTimeSec: 0,
      racePenaltySec: 0, lap: 1, currentLap: 1, completedLaps: 0, lapsTotal: 1,
      lapTimeSec: 0, lapTimes: [], lapStartedAt: 0, nextLapGate: 0,
      timeLimitSec: null, parTimeSec: null, objective: null, drift: null, checkpointRush: null, timeRemaining: null,
      // driving
      s: 0, lateral: 0, speedMph: 0, gear: 0, revs: 0, overrevSec: 0, reverseHoldSec: 0, offRoad: false,
      steerVisual: 0, boost: 1, boosting: false, invulnerableSec: 0,
      headingError: 0, yawVelocity: 0, roughness: 0, offRoadTime: 0, preparedGravel: false, slipAngle: 0, drifting: false,
      impactTimer: 0, impactDuration: 0, impactStrength: 0, impactSide: 1, crashSpin: 0,
      majorCrashes: 0, stageCrashes: 0, catastrophic: false,
      damageZones: { front: 0, rear: 0, left: 0, right: 0 }, damageCooldown: 0,
      boundaryWarning: false, boundaryResets: 0, pushVelocity: 0, collectedFlocks: [],
      airborne: false, airHeight: 0, jumpScore: 0, jumps: 0, bestJumpMeters: 0, collectedJumps: [],
      crushedProps: [], crushCount: 0, crushScore: 0, crushBurst: null,
      score: 0, stageStyleScore: 0, nearMisses: 0, policeEscapes: 0, combo: 0, comboTimer: 0,
      callout: '', calloutTimer: 0,
      // police
      police: { beep: 0, triggered: false, pursuit: null, ticket: null, ticketCount: 0, pendingFines: 0 },
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

  get car() {
    const base = CARS[this.state.car], upgrades = this.state.upgrades;
    const key = `${this.state.car}|${UPGRADE_KEYS.map(name => upgrades[name] || 0).join(':')}`;
    if (this._carCache?.key === key) return this._carCache.value;
    const engine = 1 + upgrades.engine * .035;
    const value = { ...base, topSpeed: base.topSpeed * engine, gears: base.gears.map(gear => gear * engine),
      accel: base.accel * (1 + upgrades.engine * .04), grip: Math.min(1.2, base.grip + upgrades.handling * .045 + upgrades.tires * .025),
      braking: base.braking * (1 + upgrades.tires * .06 + (upgrades.brakes || 0) * .12),
      offRoadGrip: Math.min(1.15, (base.offRoadGrip ?? DRIVE.offRoadGrip) + (upgrades.suspension || 0) * .04 + upgrades.tires * .02),
      roughnessScale: 1 / (1 + (upgrades.suspension || 0) * .18), boostCapacity: 1 + (upgrades.tank || 0) * .25 };
    this._carCache = { key, value }; return value;
  }
  get diff() { return DIFFICULTY[this.state.difficulty]; }
  get scoreMultiplier() { return this.state.difficulty === 'pro' ? SCORING.manualMultiplier : 1; }
  get stageDef() { return COURSE[this.state.stageIndex]; }
  get raceLength() { return this.course?.raceLength || this.course?.length || 0; }
  _parTime() {
    const car = CARS[this.state.car], skill = CPU_DIFFICULTY[this.state.cpuDifficulty].skill;
    const speed = Math.min(SCORING.parSpeedMph, car.topSpeed * .72, this.course.def.offroad ? this._drivingSurface(0, 0, car).speedLimit * .85 : Infinity) * skill;
    return this.raceLength / (speed * DRIVE.mphToWorld);
  }
  relativeS(value, reference = this.state.s) {
    return this.course?.closed ? value + Math.round((reference - value) / this.course.length) * this.course.length : value;
  }
  _surface(distance, lateral) {
    const halfWidth = this.course.roadHalfWidthAt?.(distance) ?? DRIVE.roadHalfWidth;
    const surface = this.course.surfaceAt?.(distance, lateral) || { road: Math.abs(lateral) <= halfWidth, shortcutId: null, roadHalfWidth: halfWidth };
    return { ...surface, mainRoad: surface.mainRoad ?? surface.road };
  }
  _drivingSurface(distance, lateral, car = this.car) {
    const surface = this._surface(distance, lateral);
    const preparedGravel = surface.road && !surface.mainRoad && (this.course.def.offroad || !!surface.shortcutId);
    const rally = car.kind === 'rally', roughnessScale = car.roughnessScale ?? 1;
    return { ...surface, preparedGravel, boostAllowed: surface.road,
      traction: surface.mainRoad ? 1 : preparedGravel ? clamp(.6 + .4 * (car.offRoadGrip ?? DRIVE.offRoadGrip), .82, .995) : car.offRoadGrip ?? DRIVE.offRoadGrip,
      speedLimit: surface.mainRoad ? car.topSpeed : preparedGravel ? car.topSpeed * (rally ? .98 : .95) : car.offRoadSpeed ?? 68,
      scrub: surface.mainRoad ? 0 : (preparedGravel ? rally ? .014 : .035 : car.offRoadScrub ?? DRIVE.offRoadScrub) * roughnessScale,
      roughness: preparedGravel ? (rally ? .14 : .2) * roughnessScale : null };
  }
  _vehicleSpec(actor) {
    // Upgrades change handling and power, never the collision shell or mass.
    const car = CARS[actor === this.state || actor === this.state.rival ? this.state.car : actor.car] || {};
    return { halfWidth: car.collision?.halfWidth ?? CAR_HALF_WIDTH, halfLength: car.collision?.halfLength ?? CAR_HALF_LENGTH, mass: car.mass || 1450, height: car.height || 1.35 };
  }

  // ---- lifecycle -------------------------------------------------------
  startCampaign({ mode = 'duel', car, difficulty, cpuDifficulty = DEFAULT_CPU_DIFFICULTY, playerId = null, startStage = 0, upgrades = {}, seed } = {}) {
    if (Number.isFinite(seed) && Number.isInteger(seed)) this.seed = seed >>> 0;
    this.state.seed = this.seed;
    if (CARS[car]) this.state.car = car;
    if (DIFFICULTY[difficulty]) this.state.difficulty = difficulty;
    this.state.cpuDifficulty = CPU_DIFFICULTY[cpuDifficulty] ? cpuDifficulty : DEFAULT_CPU_DIFFICULTY;
    this.state.playerId = typeof playerId === 'string' ? playerId : null;
    this.state.upgrades = Object.fromEntries(UPGRADE_KEYS.map(key => [key, Number.isFinite(upgrades[key]) ? clamp(Math.floor(upgrades[key]), 0, 3) : 0]));
    this.state.mode = mode === 'timetrial' ? 'timetrial' : 'duel';
    this.state.stageIndex = Number.isFinite(startStage) ? clamp(Math.floor(startStage), 0, COURSE.length - 1) : 0;
    const requiredCar = COURSE[this.state.stageIndex].requiredCar;
    if (CARS[requiredCar]) this.state.car = requiredCar;
    if (COURSE[this.state.stageIndex].stuntTrial || ['chase', 'drift', 'checkpoint'].includes(COURSE[this.state.stageIndex].kind)) this.state.mode = 'duel';
    this.state.lives = LIVES.start;
    this.state.totalTimeSec = 0;
    this.state.penaltySec = 0;
    this.state.score = 0;
    this.state.nearMisses = 0;
    this.state.majorCrashes = 0;
    this.state.catastrophic = false;
    this.state.damageZones = { front: 0, rear: 0, left: 0, right: 0 };
    this.state.boundaryResets = 0;
    this._loadStage(this.state.stageIndex);
  }

  _loadStage(idx) {
    const s = this.state;
    s.stageIndex = idx;
    this.course = new Course(COURSE[idx], this.seed);
    this._obstacleQueryCache = new Map(); this._obstacleArray = this.course.features.obstacles;
    const rawGates = this.course.features.lapGates?.map(gate => typeof gate === 'number' ? gate : gate.s) || [this.course.length * .25, this.course.length * .5, this.course.length * .75];
    this._lapGates = [...new Set(rawGates.filter(distance => distance > 0 && distance < this.course.length))].sort((a, b) => a - b);
    s.s = 0; s.lateral = 0; s.speedMph = 0; s.gear = 0; s.revs = 0; s.overrevSec = 0; s.reverseHoldSec = 0;
    s.paused = false; s.offRoad = false; s.steerVisual = 0;
    s.boost = 1; s.boosting = false; s.invulnerableSec = 0;
    s.headingError = 0; s.yawVelocity = 0; s.roughness = 0; s.offRoadTime = 0; s.preparedGravel = false;
    s.slipAngle = 0; s.drifting = false;
    s.boundaryWarning = false; s.pushVelocity = 0; s.damageCooldown = 0; s.collectedFlocks = [];
    s.airborne = false; s.airHeight = 0; s.jumpScore = 0; s.jumps = 0; s.bestJumpMeters = 0; s.collectedJumps = [];
    s.crushedProps = []; s.crushCount = 0; s.crushScore = 0; s.crushBurst = null;
    s._jumpY = null; s._verticalSpeed = 0; s._jumpOrigin = null; s.prevAirHeight = 0;
    s.impactTimer = 0; s.impactDuration = 0; s.impactStrength = 0; s.impactSide = 1; s.crashSpin = 0;
    s.combo = 0; s.comboTimer = 0; s.stageStyleScore = 0; s.stageCrashes = 0; s.policeEscapes = 0;
    s.callout = ''; s.calloutTimer = 0;
    s.input = { throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false };
    s.stageTimeSec = 0;
    s.racePenaltySec = 0; s.lap = s.currentLap = 1; s.completedLaps = 0; s.lapsTotal = this.course.def.laps || 1;
    s.lapTimeSec = 0; s.lapTimes = []; s.lapStartedAt = 0; s.nextLapGate = 0;
    const stunt = this.course.def.stuntTrial, drift = this.course.def.driftTrial, rush = this.course.def.checkpointRush;
    s.timeLimitSec = rush?.initialTimeSec[s.cpuDifficulty] || drift?.timeLimitSec[s.cpuDifficulty] || stunt?.timeLimitSec[s.cpuDifficulty] || this.course.def.chaseTimeLimit?.[s.cpuDifficulty] || null;
    s.timeRemaining = s.timeLimitSec;
    s.objective = rush ? { kind: 'checkpointRush', targetCheckpoints: this.course.features.rushGates.length*s.lapsTotal, timeLimitSec: s.timeLimitSec } : drift ? { kind: 'driftTrial', targetScore: drift.targets[s.cpuDifficulty], timeLimitSec: s.timeLimitSec } :
      stunt ? { kind: 'stuntTrial', targetJumps: stunt.jumps, targetCrushes: stunt.crushes, timeLimitSec: s.timeLimitSec } : null;
    s.drift = drift ? createDriftState({ lapLength: this.course.length, laps: s.lapsTotal }) : null;
    s.checkpointRush = rush ? {passed:0,total:this.course.features.rushGates.length*s.lapsTotal,nextGate:0,missed:0,lastEvent:null,initialTimeSec:s.timeLimitSec,extensionSec:rush.extensionSec[s.cpuDifficulty]} : null;
    s.parTimeSec = this._parTime();
    s.police = { beep: 0, triggered: false, pursuit: null, ticket: null, ticketCount: 0, pendingFines: 0 };
    if (this.course.def.kind === 'chase') s.police.pursuit = this._newPursuit(260);
    s.results = null;
    s.lastCrashReason = null;
    s.crashFlash = 0;
    s.countdown = 3;
    s.status = 'countdown';
    // rival
    s.rival = (COURSE[idx].hasRival && s.mode === 'duel')
      ? { s: this.course.rivalStartS, lateral: -DRIVE.laneOffset, speedMph: 0, finished: false, finishTime: null,
        headingError: 0, yawVelocity: 0, pushVelocity: 0, offRoad: false, contactCooldown: 0,
        airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0, _jumpOrigin: null,
        completedLaps: 0, nextLapGate: 0, lapTimes: [], lapStartedAt: 0 }
      : null;
    // pre-spawn deterministic two-way traffic
    s.traffic = this._spawnTraffic(idx);
    this.emit({ stageLoaded: idx, countdown: 3 });
  }

  _spawnTraffic(idx) {
    const def = COURSE[idx];
    if (['arena','drift','checkpoint'].includes(def.kind)) return [];
    const rng = makeRng(this.seed ^ (idx * 0x51ed) ^ 0x7a17);
    const density = this.diff.trafficDensity
      * (this.course.theme.fogDensity > TRAFFIC.fogDensityThreshold ? TRAFFIC.fogSpawnMult : 1);
    const gap = TRAFFIC.baseGapU / Math.max(0.4, density);
    const cars = [];
    for (let s = 320; s < this.course.length - 120; s += gap * rng.range(0.7, 1.3)) {
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
    if (s.timeLimitSec) s.timeRemaining = Math.max(0, s.timeLimitSec - s.stageTimeSec - s.racePenaltySec);
    s.lapTimeSec = s.stageTimeSec + s.racePenaltySec - s.lapStartedAt;
    s.totalTimeSec += dt;
    if (s.crashFlash > 0) s.crashFlash = Math.max(0, s.crashFlash - dt);
    s.invulnerableSec = Math.max(0, s.invulnerableSec - dt);
    s.damageCooldown = Math.max(0, s.damageCooldown - dt);
    s.calloutTimer = Math.max(0, s.calloutTimer - dt);
    s.comboTimer = Math.max(0, s.comboTimer - dt);
    if (s.comboTimer === 0) s.combo = 0;
    if (s.drift) {
      this._driftStepStart = { s: s.s, world: this.course.worldAt(s.s, s.lateral) };
      this._driftHit = false; this._driftReset = false;
    }

    if (s.impactTimer > 0) {
      this._impact(dt);
      this._crushProps(s);
      this._traffic(dt);
      if (s.rival) this._rival(dt);
      this._collisions();
      this._tickDrift(dt);
      this._police(dt, false);
      return; // A crash must play out before a ticket or finish can replace it.
    }
    if (this._deadline(s.checkpointRush ? s.stageTimeSec+s.racePenaltySec-dt : undefined)) return;

    // each sub-step can end the run (gameover crash, ticket); once the status
    // leaves 'racing' the rest of the frame must not keep simulating, or a
    // finish-line crossing could overwrite the gameover/ticket state
    this._drive(dt);
    if (s.status !== 'racing' || s.impactTimer > 0) { this._tickDrift(dt); return; }
    this._jump(s, dt);
    this._traffic(dt);
    if (s.rival) this._rival(dt);
    this._collisions();
    this._tickDrift(dt);
    this._flockBonuses();
    if (s.status !== 'racing' || s.impactTimer > 0) return;
    this._crushProps(s);
    this._police(dt);
    if (s.status !== 'racing') return;
    this._advanceRushGates(dt);
    if (this._deadline()) return;

    this._advanceLaps(s, dt);
    if (s.completedLaps >= s.lapsTotal) this._finishStage();
  }

  _commitDrift(next) {
    const s = this.state;
    const gained = Math.max(0, Math.round(next.bankedScore) - Math.round(s.drift.bankedScore));
    // Challenge targets retain raw drift points; the general race score earns Pro 2x.
    s.drift = next; s.score += gained * this.scoreMultiplier; s.stageStyleScore += gained * this.scoreMultiplier;
    if (next.lastEvent?.type === 'banked') this.emit({ driftBanked: { points: Math.round(next.lastEvent.points), total: Math.round(next.bankedScore) } });
    else if (next.lastEvent?.type === 'lost') this.emit({ driftChainLost: { reason: next.lastEvent.reason, points: Math.round(next.lastEvent.points) } });
  }

  _breakDrift(reason = 'hit') {
    if (!this.state.drift) return;
    if (reason === 'reset') this._driftReset = true; else this._driftHit = true;
    this._commitDrift(breakDrift(this.state.drift, reason));
  }

  _tickDrift(dt) {
    const s = this.state, start = this._driftStepStart;
    if (!s.drift || !start) return;
    const surface = this._drivingSurface(s.s, s.lateral);
    this._commitDrift(stepDrift(s.drift, { prevS: start.s, s: s.s, from: start.world, to: this.course.worldAt(s.s, s.lateral),
      speedMph: s.speedMph, slipAngle: s.slipAngle, headingError: s.headingError, yawVelocity: s.yawVelocity,
      mainRoad: surface.mainRoad, preparedRoute: surface.road && surface.preparedGravel,
      status: s.status, impactTimer: s.impactTimer, airborne: s.airborne, airHeight: s.airHeight,
      hit: this._driftHit, reset: this._driftReset }, dt));
  }

  _drive(dt) {
    const s = this.state, car = this.car, d = this.diff;
    // recorded up front (not at the integration line) so the swept collision
    // test stays valid on frames where a crash bails out of _drive early
    s.prevS = s.s;
    s.prevLateral = s.lateral;
    s.prevAirHeight = s.airHeight || 0;
    const previousGear = s.gear;
    // S / Down / LT brakes first, then backs up after a deliberate hold at
    // rest. This works in both transmissions; Q/E still shift forward gears.
    // Signed speed preserves the chassis heading while travelling backwards.
    if (s.speedMph < 0) s.gear = -1;
    else if (s.speedMph > 0 && s.gear < 0) s.gear = 0;
    if (s.gear >= 0 && s.speedMph === 0 && s.input.brake > .1 && s.input.throttle === 0) {
      s.reverseHoldSec += dt;
      if (s.reverseHoldSec + 1e-9 >= DRIVE.reverseHoldSec) s.gear = -1;
    } else s.reverseHoldSec = 0;
    const reversing = s.gear < 0;
    const gmax = reversing ? DRIVE.reverseMaxMph : car.gears[s.gear];
    s.revs = gmax ? Math.abs(s.speedMph) / gmax : 0;
    if (!reversing && d.autoShift) {
      if (s.revs > 0.96 && s.gear < car.gears.length - 1) s.gear++;
      else if (s.revs < 0.55 && s.gear > 0) s.gear--;
    } else if (!reversing) {
      if (s.input.shiftUp && s.gear < car.gears.length - 1) s.gear++;
      if (s.input.shiftDown && s.gear > 0) s.gear--;
    }
    s.input.shiftUp = s.input.shiftDown = false;

    // acceleration limited by the current gear's max speed
    const gearMax = reversing ? DRIVE.reverseMaxMph : car.gears[s.gear];
    const accelFactor = Math.max(0.15, 1 - Math.max(0, s.revs - 0.5)); // falls off near redline
    if (reversing) {
      if (s.input.throttle > 0) {
        s.speedMph = Math.min(0, s.speedMph + DRIVE.brakeAccel * car.braking * s.input.throttle * dt);
        if (s.speedMph === 0) { s.gear = 0; s.reverseHoldSec = 0; }
      } else if (s.input.brake > 0) s.speedMph -= DRIVE.reverseAccel * s.input.brake * dt;
      s.speedMph = Math.min(0, s.speedMph + DRIVE.dragCoeff * dt * (s.input.brake > 0 && s.input.throttle === 0 ? .2 : 1));
    } else {
      if (s.input.throttle > 0) {
        const ceil = Math.min(car.topSpeed, gearMax * DRIVE.gearCeilFrac);
        if (s.speedMph < ceil) s.speedMph += car.accel * accelFactor * s.input.throttle * dt * DRIVE.accelScale;
      }
      if (s.input.brake > 0) s.speedMph -= DRIVE.brakeAccel * car.braking * s.input.brake * dt;
      s.speedMph = Math.max(0, s.speedMph - DRIVE.dragCoeff * dt * (s.input.throttle > 0 ? 0.2 : 1));
    }
    if (s.gear !== previousGear) this.emit({ shift: s.gear });

    const wasBoosting = s.boosting;
    const surface = this._drivingSurface(s.s, s.lateral, car);
    const nitro = s.upgrades.nitro, boostDrain = BOOST.drainPerSec / ((1 + nitro * .14) * car.boostCapacity);
    const boostTopSpeed = BOOST.topSpeedMult + nitro * .025;
    s.boosting = !!s.input.boost && s.boost > 0 && s.speedMph >= BOOST.minSpeedMph && surface.boostAllowed && s.input.brake === 0;
    if (s.boosting) {
      const available = Math.min(1, s.boost / (boostDrain * dt));
      s.boost = Math.max(0, s.boost - boostDrain * dt);
      const boostCeiling = d.autoShift ? car.topSpeed * boostTopSpeed : Math.min(car.topSpeed * boostTopSpeed, gearMax * DRIVE.gearCeilFrac);
      s.speedMph += Math.max(0, Math.min(boostCeiling - s.speedMph, BOOST.accelMphPerSec * (1 + nitro * .15) * dt * available));
    } else if (!s.input.boost) {
      s.boost = Math.min(1, s.boost + BOOST.refillPerSec * dt);
    }
    if (s.boosting && !wasBoosting) this.emit({ boostStarted: true });

    // engine blow if you ride the limiter on a Pro manual — the threshold sits
    // below the gear ceiling so holding throttle without upshifting gets there
    if (!reversing && !d.autoShift && d.engineBlow && s.revs > DRIVE.overRevFrac && s.input.throttle > 0) {
      s.overrevSec += dt;
      if (s.overrevSec > DRIVE.overRevBlowSec) { this._crash('engine_blew'); return; }
    } else {
      s.overrevSec = Math.max(0, s.overrevSec - dt);
    }

    // A released steering wheel keeps a physical world heading. The road can
    // bend away underneath the car; it never supplies free steering.
    const frame = this.course.at(s.s);
    s.offRoad = !surface.mainRoad;
    s.preparedGravel = surface.preparedGravel;
    s.shortcutId = surface.shortcutId || null;
    s.offRoadTime = s.offRoad ? s.offRoadTime + dt : Math.max(0, s.offRoadTime - dt * 3);
    const shoulderDepth = Math.max(0, Math.abs(s.lateral) - surface.roadHalfWidth);
    const roughTarget = surface.preparedGravel ? surface.roughness : s.offRoad ? Math.min(1, .32 + shoulderDepth * .12 + s.offRoadTime * .2) * car.roughnessScale : 0;
    s.roughness += (roughTarget - s.roughness) * (1 - Math.exp(-8 * dt));
    const traction = surface.traction;
    s.steerVisual += (s.input.steer - s.steerVisual) * (1 - Math.exp(-DRIVE.steerResponse * dt));
    const targetYaw = -s.steerVisual * steeringYawAuthority(Math.abs(s.speedMph), car.grip, traction) * (s.speedMph < 0 ? -1 : 1);
    s.yawVelocity += (targetYaw - s.yawVelocity) * (1 - Math.exp(-DRIVE.yawResponse * dt));
    // The nose turns first while momentum carries the rear outward. A short
    // release or counter-steer settles the slide without steering toward the road.
    const driftSpeed=Math.max(0,Math.min(1,(s.speedMph-38)/85));
    const slipTarget=-s.steerVisual*driftSpeed*(surface.preparedGravel?.25:s.offRoad?.31:.21)*(1+s.input.brake*.6);
    s.slipAngle+=(slipTarget-s.slipAngle)*(1-Math.exp(-(s.input.steer*s.slipAngle>0?13:7)*dt));
    s.drifting=Math.abs(s.slipAngle)>.075&&s.speedMph>40;
    if (s.offRoad) {
      const offRoadLimit = surface.speedLimit * (s.boosting ? boostTopSpeed : 1);
      const scrub = surface.scrub;
      s.speedMph *= Math.exp(-scrub * dt * (s.speedMph > offRoadLimit ? 1 : .25));
      if (s.speedMph > offRoadLimit) s.speedMph -= (s.speedMph - offRoadLimit) * (1 - Math.exp(-1.4 * dt));
      if (!surface.boostAllowed) s.boosting = false;
    }

    const speedCap = s.boosting ? car.topSpeed * boostTopSpeed : car.topSpeed;
    if (!s.boosting && s.speedMph > speedCap) s.speedMph -= 22 * dt;
    s.speedMph = Math.max(-DRIVE.reverseMaxMph, Math.min(car.topSpeed * boostTopSpeed, s.speedMph));
    s.revs = Math.abs(s.speedMph) / (s.gear < 0 ? DRIVE.reverseMaxMph : car.gears[s.gear]);
    const metresPerSec = s.speedMph * DRIVE.mphToWorld;
    const forward = Math.max(0, Math.cos(s.headingError)) * metresPerSec * dt;
    // Inside a bend, a metre of physical travel covers more centreline progress.
    // This makes a real dirt shortcut quicker without a scripted progress jump.
    const progress = forward / Math.max(.25, 1 - frame.curvature * s.lateral);
    s.headingError += s.yawVelocity * dt - frame.curvature * progress;
    s.headingError = Math.max(-1.45, Math.min(1.45, s.headingError));
    s.lateral += (Math.sin(s.headingError) * metresPerSec + s.pushVelocity) * dt;
    s.pushVelocity *= Math.exp(-2.4 * dt);
    s.s += progress;
    s.offRoad = !this._surface(s.s, s.lateral).mainRoad;
    // Dirt alone never consumes a life or structural hit. Only contact does.
    this._boundary(s);
  }

  _traffic(dt) {
    const s = this.state;
    for (const c of s.traffic) {
      if (!c.alive) continue;
      c.prevS = c.s;
      c.prevLateral = c.lateral;
      if (Number.isFinite(c.lateral)) {
        c.lateral += (c.pushVelocity || 0) * dt;
        c.pushVelocity = (c.pushVelocity || 0) * Math.exp(-1.5 * dt);
        const lane = c.dir < 0 ? DRIVE.laneOffset : -DRIVE.laneOffset;
        c.lateral += clamp(lane - c.lateral, -dt * .7, dt * .7);
        if (!this._surface(c.s, c.lateral).road) c.speedMph *= Math.exp(-DRIVE.offRoadScrub * dt);
      }
      c.s += c.dir * c.speedMph * DRIVE.mphToWorld * dt;
      c.contactCooldown = Math.max(0, (c.contactCooldown || 0) - dt);
      if (Number.isFinite(c.lateral)) { this._staticContacts(c, false); this._boundary(c); }
    }
  }

  _collisions() {
    const s = this.state;
    this._staticContacts(s, true);
    if (s.rival) this._vehicleContact(s, s.rival, 'rival');
    for (const c of s.traffic) {
      if (!c.alive) continue;
      // swept longitudinal test: a head-on closing speed can cross the whole
      // hit window in one clamped frame, so a relative sign flip counts too
      const phase = this.relativeS(c.s, s.s) - c.s;
      const now = c.s + phase - s.s;
      const prev = (c.prevS ?? c.s) + phase - (s.prevS ?? s.s);
      const clearance = Math.abs(c.lateral - s.lateral);
      this._vehicleContact(s, c, c.dir < 0 ? 'head_on' : 'traffic');
      if (s.rival) this._vehicleContact(s.rival, c, 'traffic');
      // Reward a completed pass once, rather than every frame spent near a car.
      if (c.passedLap !== s.completedLaps && prev > 0 && now <= 0) {
        c.passed = true; c.passedLap = s.completedLaps;
        if (s.invulnerableSec <= 0 && clearance >= TRAFFIC.collideLatU && clearance < TRAFFIC.nearMissLatU && s.speedMph >= TRAFFIC.nearMissMinMph) {
          s.combo = Math.min(SCORING.comboMax, s.combo + 1);
          s.comboTimer = SCORING.comboWindowSec;
          s.nearMisses++;
          const points = SCORING.nearMissPoints * s.combo * this.scoreMultiplier;
          s.stageStyleScore += points; s.score += points;
          s.boost = Math.min(1, s.boost + BOOST.nearMissRefill);
          this._callout(`NEAR MISS  +${points}${s.combo > 1 ? `  /  ${s.combo}× COMBO` : ''}`);
          this.emit({ nearMiss: { points, combo: s.combo } });
        }
      }
    }
    // A vehicle pushed sideways may now touch scenery. Resolve that contact
    // again, including when damage is temporarily disabled after a crash.
    this._staticContacts(s, true);
    if (s.rival) this._staticContacts(s.rival, false);
  }

  _obstacles(fromS, toS) {
    if (this.course.obstaclesNear) {
      if (this._obstacleArray !== this.course.features.obstacles) { this._obstacleArray = this.course.features.obstacles; this._obstacleQueryCache.clear(); }
      const first = Math.floor((Math.min(fromS, toS) - 10) / 64), last = Math.floor((Math.max(fromS, toS) + 10) / 64), key = `${first}:${last}`;
      if (!this._obstacleQueryCache.has(key)) this._obstacleQueryCache.set(key, this.course.obstaclesNear(fromS, toS));
      return this._obstacleQueryCache.get(key);
    }
    // Keeps older exported courses usable while they acquire world colliders.
    return (this.course.rocksNear?.(fromS, toS) || []).map(rock => ({
      ...this.course.worldAt(rock.s, rock.off), id: rock.id, kind: 'rock', s: rock.s, off: rock.off,
      halfX: rock.radiusX, halfZ: rock.radiusZ,
    }));
  }

  _roadPosition(world, hintS) {
    if (this.course.nearest) return this.course.nearest(world.x, world.z, hintS);
    // Local projection fallback for older saved course objects.
    const f = this.course.at(hintS), dx = world.x - f.x, dz = world.z - f.z;
    return { s: hintS + dx * Math.sin(f.heading) + dz * Math.cos(f.heading),
      lateral: dx * Math.cos(f.heading) - dz * Math.sin(f.heading) };
  }

  _staticContacts(car, player) {
    const oldS = car.prevS ?? car.s, oldLateral = car.prevLateral ?? car.lateral;
    let start = this.course.worldAt(oldS, oldLateral), end = this.course.worldAt(car.s, car.lateral);
    if (![start.x, start.z, end.x, end.z].every(Number.isFinite)) return;
    if (car.airborne || car.airHeight > 0 || car.prevAirHeight > 0) {
      start.y = this.course.groundAt(oldS, oldLateral).y + (car.prevAirHeight ?? car.airHeight ?? 0);
      end.y = this.course.groundAt(car.s, car.lateral).y + (car.airHeight || 0);
    } else {
      // Grounded cars keep the established horizontal contact rules; only
      // airborne vehicles need extra terrain samples and vertical clearance.
      start.y = end.y = undefined;
    }
    const travelHeading = this.course.at(car.s).heading + (car.headingError || 0) + (car.dir < 0 ? Math.PI : 0);
    const heading = travelHeading + (car.slipAngle || 0);
    const obstacles = this._obstacles(oldS, car.s);
    const dimensions = this._vehicleSpec(car);
    for (let attempt = 0; attempt < 4; attempt++) {
      let first = null;
      for (const obstacle of obstacles) {
        const hit = sweepObstacle(start, end, obstacle, heading, dimensions);
        if (hit && (!first || hit.t < first.t)) first = hit;
      }
      if (!first) break;
      if (player) this._breakDrift('hit');
      const { nx, nz, t, penetration, obstacle } = first;
      const dx = end.x - start.x, dz = end.z - start.z;
      const incoming = Math.max(0, -(Math.sin(travelHeading) * nx + Math.cos(travelHeading) * nz) * (car.speedMph < 0 ? -1 : 1));
      const roadHeading = this.course.at(car.s).heading;
      const pushNormal = Math.cos(roadHeading) * nx - Math.sin(roadHeading) * nz;
      const impactMph = Math.abs(car.speedMph) * incoming + Math.max(0, -(car.pushVelocity || 0) * pushNormal) / DRIVE.mphToWorld;
      const zone = contactZone(nx, nz, heading);
      // Stop the normal component at the first contact; allow the unused
      // tangential movement to slide along the wall instead of sticking.
      const stop = { x: start.x + dx * t + nx * (penetration + .04), z: start.z + dz * t + nz * (penetration + .04),
        y: Number.isFinite(start.y) ? start.y + (end.y - start.y) * t : undefined };
      const remainingX = dx * (1 - t), remainingZ = dz * (1 - t);
      const inward = Math.min(0, remainingX * nx + remainingZ * nz);
      end = { x: stop.x + remainingX - nx * inward, z: stop.z + remainingZ - nz * inward, y: end.y };
      if (first.inside) end = stop;
      start = stop;
      const road = this._roadPosition(end, car.s);
      if (Number.isFinite(road.s) && Number.isFinite(road.lateral)) { car.s = road.s; car.lateral = road.lateral; }
      car.pushVelocity = (car.pushVelocity || 0) * .25;
      if (player && this.state.invulnerableSec <= 0 && this.state.impactTimer <= 0) {
        if (impactMph >= 28) this._crash(obstacle.kind || 'rock', Math.sign(nx), impactMph, zone);
        else if (impactMph > 4) this._scrape(zone, impactMph);
      }
      car.speedMph *= Math.max(.08, 1 - incoming * .94);
      if (!player) { car.contactCooldown = 1.2; car.headingError = clamp((car.headingError || 0) - Math.sign(car.lateral) * .25, -.65, .65); }
    }
    car.offRoad = !this._surface(car.s, car.lateral).mainRoad;
  }

  _vehicleContact(a, b, reason) {
    const phase = this.relativeS(b.s, a.s) - b.s;
    const start = { x: (a.prevLateral ?? a.lateral) - (b.prevLateral ?? b.lateral), z: (a.prevS ?? a.s) - (b.prevS ?? b.s) - phase };
    const end = { x: a.lateral - b.lateral, z: a.s - b.s - phase };
    // A road-aligned envelope is intentionally a little generous to avoid
    // the visible cars interpenetrating while their bodies drift.
    const angleA = (a.headingError || 0) + (a.slipAngle || 0), angleB = (b.headingError || 0) + (b.slipAngle || 0);
    const specA = this._vehicleSpec(a), specB = this._vehicleSpec(b);
    if (a.airborne || b.airborne) {
      const heightA = this.course.groundAt(a.s, a.lateral).y + (a.airHeight || 0), heightB = this.course.groundAt(b.s, b.lateral).y + (b.airHeight || 0);
      if (heightA > heightB + specB.height || heightB > heightA + specA.height) return false;
    }
    const width = specA.halfWidth * Math.abs(Math.cos(angleA)) + specB.halfWidth * Math.abs(Math.cos(angleB))
      + specA.halfLength * Math.abs(Math.sin(angleA)) + specB.halfLength * Math.abs(Math.sin(angleB)) + .2;
    const length = specA.halfLength * Math.abs(Math.cos(angleA)) + specB.halfLength * Math.abs(Math.cos(angleB))
      + specA.halfWidth * Math.abs(Math.sin(angleA)) + specB.halfWidth * Math.abs(Math.sin(angleB)) + .3;
    const hit = sweepBox(start, end, width, length);
    if (!hit) return false;
    if (a === this.state || b === this.state) this._breakDrift('hit');
    const { nx, nz } = hit;
    // A rival arriving from behind must yield to a player who cuts in.
    // Resolve late contacts even if there was too little room to brake first:
    // the CPU moves back and loses speed; the player's run remains intact.
    if (a === this.state && a.speedMph >= 0 && (b === this.state.rival || b === this.state.police.pursuit) && nz > 0 && (b.dir || 1) > 0 && Math.cos(a.headingError || 0) > 0) {
      b.s = Math.min(b.s, a.s - phase - length - .15);
      const forwardMph = Math.max(0, a.speedMph * Math.cos(a.headingError || 0));
      b.speedMph = Math.min(b.speedMph, forwardMph * .94);
      b.braking = true; b.yieldingToPlayer = true; b.contactCooldown = Math.max(b.contactCooldown || 0, .45);
      return true;
    }
    const vaX = Math.sin(a.headingError || 0) * a.speedMph * DRIVE.mphToWorld + (a.pushVelocity || 0);
    const vbX = Math.sin(b.headingError || 0) * b.speedMph * DRIVE.mphToWorld + (b.pushVelocity || 0);
    const vaZ = a.speedMph * Math.cos(a.headingError || 0) * (a.dir || 1), vbZ = b.speedMph * Math.cos(b.headingError || 0) * (b.dir || 1);
    const impactMph = Math.max(0, -(vaX - vbX) / DRIVE.mphToWorld * nx - (vaZ - vbZ) * nz);
    // Share the positional correction. Even a protected car remains solid.
    const required = nx ? width + .04 - (a.lateral - b.lateral) * nx : length + .04 - end.z * nz;
    const correction = Math.max(0, required);
    const shareA = specB.mass / (specA.mass + specB.mass), shareB = 1 - shareA;
    a.lateral += nx * correction * shareA; b.lateral -= nx * correction * shareB;
    a.s += nz * correction * shareA; b.s -= nz * correction * shareB;
    const zone = contactZone(nx, nz, angleA);
    if (nx) {
      const shove = clamp(2.5 + impactMph * DRIVE.mphToWorld * .62, 2.5, 13);
      a.pushVelocity = clamp((a.pushVelocity || 0) + nx * shove * .6 * shareA, -16, 16);
      b.pushVelocity = clamp((b.pushVelocity || 0) - nx * shove * 2 * shareB, -16, 16);
      b.headingError = clamp((b.headingError || 0) - nx * .07, -.8, .8);
      a.speedMph *= .992; b.speedMph *= .985;
      if (a === this.state && impactMph > 3 && this.state.invulnerableSec <= 0) this._scrape(zone, impactMph);
    } else if (impactMph > 0) {
      const backingPlayer = a === this.state && a.speedMph < 0;
      const momentum = (vaZ * specA.mass + vbZ * specB.mass) / (specA.mass + specB.mass);
      const combined = backingPlayer ? momentum : Math.max(0, momentum);
      a.speedMph = (a.dir || 1) > 0 ? combined : Math.abs(combined);
      b.speedMph = backingPlayer ? Math.max(0, combined * (b.dir || 1)) : (b.dir || 1) > 0 ? combined : Math.abs(combined);
      if (a === this.state && this.state.invulnerableSec <= 0 && impactMph >= 28) this._crash(reason, Math.sign(a.lateral - b.lateral), impactMph, zone);
      else if (a === this.state && this.state.invulnerableSec <= 0 && impactMph > 4) this._scrape(zone, impactMph);
    }
    a.offRoad = !this._surface(a.s, a.lateral).mainRoad;
    b.offRoad = !this._surface(b.s, b.lateral).mainRoad;
    b.contactCooldown = Math.max(b.contactCooldown || 0, .8);
    return true;
  }

  _scrape(zone, impactMph) {
    const s = this.state;
    if (s.damageCooldown > 0 || s.impactTimer > 0) return;
    s.damageZones[zone] = Math.min(5, s.damageZones[zone] + clamp(impactMph / 100, .08, .3));
    s.damageCooldown = .65;
    this.emit({ scrape: true, zone, strength: clamp(impactMph / 80, .1, .5) });
  }

  _boundary(car) {
    const player = car === this.state, surface = this._surface(car.s, car.lateral);
    const phase = this.course.phase?.(car.s) ?? car.s;
    const mainEdgeDistance = Math.max(0, Math.abs(car.lateral) - surface.roadHalfWidth);
    let branchEdgeDistance = Infinity, wideBranch = false;
    for (const cut of this.course.features.shortcuts || []) {
      if (phase < cut.start || phase > cut.end) continue;
      const offset = this.course.shortcutOffset(cut, phase);
      branchEdgeDistance = Math.min(branchEdgeDistance, Math.max(0, Math.abs(car.lateral - offset) - cut.halfWidth));
      if (Math.abs(offset) > BOUNDARY_RESET) wideBranch = true;
    }
    // A distant branch gets its own shoulder, not one giant permissive field
    // between both routes. On ordinary sections retain the established bounds.
    const warningEdge = wideBranch ? 20 : BOUNDARY_WARNING - surface.roadHalfWidth;
    const resetEdge = wideBranch ? 32 : BOUNDARY_RESET - surface.roadHalfWidth;
    const seaward = (this.course.themeAt?.(car.s) || this.course.def.theme) === 'coast' && car.lateral > 28;
    const coastHeight = seaward ? this.course.groundAt(car.s, car.lateral).y : Infinity;
    if (player) {
      const warning = (mainEdgeDistance > warningEdge && branchEdgeDistance > 20) || coastHeight < -10;
      if (warning && !car.boundaryWarning) this._callout(coastHeight < -10 ? 'RETURN TO THE ROAD  /  WATER AHEAD' : 'RETURN TO THE ROAD  /  COURSE BOUNDARY', 3);
      car.boundaryWarning = warning;
    }
    if ((mainEdgeDistance <= resetEdge || branchEdgeDistance <= 32) && coastHeight >= -14) return;
    this._safeReset(car);
    if (player) {
      car.boundaryWarning = false; car.boundaryResets++;
      car.invulnerableSec = Math.max(car.invulnerableSec, 2.2);
      this._callout('BACK ON COURSE  /  NO DAMAGE', 2.8);
      this.emit({ boundaryReset: true });
    }
  }

  _safeReset(car) {
    if (car === this.state) this._breakDrift('reset');
    const others = [...this.state.traffic.filter(other => other.alive), this.state.rival, this.state.police.pursuit?.active ? this.state.police.pursuit : null, this.state].filter(other => other && other !== car);
    const racer = Number.isFinite(car.completedLaps);
    const lowerBound = this.course.closed ? racer ? car.completedLaps * this.course.length : -Infinity : 0;
    // Recovery replaces prevS, so it must not place a racer beyond a gate whose
    // crossing was interrupted by the crash/boundary. Leave room to cross it
    // normally on the next drive step, including the first lap's finish line.
    const nextGate = racer && car.completedLaps < this.state.lapsTotal ?
      car.completedLaps * this.course.length + (this._lapGates?.[car.nextLapGate] ?? this.course.length) - 1 : Infinity;
    const upperBound = this.course.closed && !racer ? Infinity : Math.min(this.raceLength - 8, nextGate);
    let chosen = { s: clamp(car.s, lowerBound, upperBound), lateral: 0 };
    search: for (const back of [0, 10, 22, 40, 70, 110]) {
      for (const lateral of [-DRIVE.laneOffset, DRIVE.laneOffset, 0]) {
        const distance = clamp(car.s - back, lowerBound, upperBound);
        if (others.some(other => Math.abs(this.relativeS(other.s, distance) - distance) < 13 && Math.abs(other.lateral - lateral) < 2.7)) continue;
        const point = this.course.worldAt(distance, lateral);
        if (this._obstacles(distance - 4, distance + 4).some(obstacle => sweepObstacle(point, point, obstacle, point.heading, this._vehicleSpec(car)))) continue;
        chosen = { s: distance, lateral }; break search;
      }
    }
    car.s = car.prevS = chosen.s; car.lateral = car.prevLateral = chosen.lateral;
    car.speedMph = Math.max(0, Math.min(28, car.speedMph * .4));
    car.headingError = 0; car.yawVelocity = 0; car.pushVelocity = 0; car.slipAngle = 0; car.drifting = false;
    car.offRoad = false; car.offRoadTime = 0; car.roughness = 0; car.boosting = false;
    car.steerVisual = 0;
    car.routeId = null; car.routeLap = null; this._npcRoutePlanner?.reset(car);
    car.airborne = false; car.airHeight = 0; car._jumpY = null; car._verticalSpeed = 0; car._jumpOrigin = null;
    if (car === this.state) { car.gear = 0; car.revs = car.speedMph / this.car.gears[0]; car.overrevSec = 0; car.reverseHoldSec = 0; }
  }

  _flockBonuses() {
    const s = this.state;
    if (s.speedMph < 1 || s.status !== 'racing' || s.impactTimer > 0) return;
    for (const flock of this.course.features.flocks || []) {
      if (s.collectedFlocks.includes(flock.id)) continue;
      if (!segmentCircle(s.prevS ?? s.s, s.prevLateral ?? s.lateral, s.s, s.lateral, this.relativeS(flock.s, s.s), flock.off, (flock.radius || 3.5) + this._vehicleSpec(s).halfWidth)) continue;
      s.collectedFlocks.push(flock.id); s.boost = 1;
      this._callout('CHICKEN RUN!  /  NITRO REFILLED', 2.7);
      this.emit({ chickenBonus: true, flockId: flock.id });
    }
  }

  _newPursuit(gap) {
    const s = this.state, distance = s.s - gap;
    const routeId = this._surface(s.s, s.lateral).shortcutId;
    const route = this.course.features.shortcuts?.find(cut => cut.id === routeId);
    const phase = this.course.phase?.(distance) ?? distance;
    const onBranch = route && phase >= route.start && phase <= route.end;
    const lateral = onBranch ? this.course.shortcutOffset(route, distance) : -DRIVE.laneOffset;
    const branchHeading = onBranch ? Math.atan((this.course.shortcutOffset(route, distance + .5) - this.course.shortcutOffset(route, distance - .5)) / Math.max(.25, 1 - this.course.at(distance).curvature * lateral)) : 0;
    return { kind: 'police', active: true, caught: false, gapU: gap, distanceU: gap,
      s: distance, prevS: distance, lateral,
      headingError: branchHeading, pushVelocity: 0, speedMph: this._policePace(), contactCooldown: 0, routeId: onBranch ? route.id : null };
  }

  _policePace() {
    return this.course.def.kind === 'chase' ? CARS[this.state.car].topSpeed * (.42 + .15 * CPU_DIFFICULTY[this.state.cpuDifficulty].skill) : POLICE.pursuitSpeedMph;
  }

  _movePolice(cruiser, dt) {
    const s = this.state;
    // Older saved/debug pursuit objects only had a gap. Give them a physical
    // pose once, then derive the gap from that pose for the rest of the chase.
    if (!Number.isFinite(cruiser.s)) Object.assign(cruiser, this._newPursuit(cruiser.gapU ?? POLICE.pursuitStartGapU));
    cruiser.prevS = cruiser.s; cruiser.prevLateral = cruiser.lateral;
    cruiser.headingError ||= 0; cruiser.pushVelocity ||= 0;
    cruiser.braking = false; cruiser.yieldingToPlayer = false;
    cruiser.contactCooldown = Math.max(0, (cruiser.contactCooldown || 0) - dt);
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
    const closing = Math.max(0, cruiser.speedMph - playerForward) * DRIVE.mphToWorld;
    const stoppingGap = 12 + closing * .2 + closing * closing / (2 * 110 * DRIVE.mphToWorld);
    if (lead > 0 && lead < stoppingGap && cutIn) {
      target = Math.min(target, playerForward + clamp((lead - 10) * 1.2, -30, 35));
      cruiser.yieldingToPlayer = true;
    }
    // Stay near a fleeing off-road driver instead of overtaking on the main
    // road and teleporting sideways through the intervening buildings.
    if (lead < 14 && !cutIn) target = Math.min(target, Math.max(0, playerForward + (lead - 8) * 1.5));
    target = Math.max(0, target);
    cruiser.braking = cruiser.speedMph > target;
    const braking = cruiser.yieldingToPlayer ? lead < 20 ? 190 : 110 : 65;
    cruiser.speedMph += clamp(target - cruiser.speedMph, -braking * dt, 32 * dt);
    if (cruiser.offRoad) cruiser.speedMph *= Math.exp(-policeSurface.scrub * dt * (policeSurface.preparedGravel ? .25 : 1));
    const desired = clamp(Math.atan((lane - cruiser.lateral) * 2.4 / Math.max(15, cruiser.speedMph * DRIVE.mphToWorld)), -.7, .7);
    const policeTurnRate = policeSurface.preparedGravel ? 1.05 * policeSurface.traction : cruiser.offRoad ? .7 : 1.05;
    cruiser.headingError += clamp(desired - cruiser.headingError, -dt * policeTurnRate, dt * policeTurnRate);
    const speed = cruiser.speedMph * DRIVE.mphToWorld;
    cruiser.lateral += (Math.sin(cruiser.headingError) * speed + cruiser.pushVelocity) * dt;
    cruiser.s += Math.cos(cruiser.headingError) * speed * dt / Math.max(.25, 1 - this.course.at(cruiser.s).curvature * cruiser.lateral);
    cruiser.pushVelocity *= Math.exp(-1.7 * dt);
    this._staticContacts(cruiser, false); this._boundary(cruiser);
    this._vehicleContact(s, cruiser, 'police');
    for (const car of s.traffic) if (car.alive) this._vehicleContact(cruiser, car, 'traffic');
    if (s.rival) this._vehicleContact(cruiser, s.rival, 'rival');
    this._staticContacts(cruiser, false); this._boundary(cruiser); this._staticContacts(s, true);
    cruiser.gapU = s.s - cruiser.s;
    const a = this.course.groundAt(s.s, s.lateral), b = this.course.groundAt(cruiser.s, cruiser.lateral);
    const distance = Math.hypot(a.x - b.x, a.y + (s.airHeight || 0) - b.y, a.z - b.z);
    cruiser.distanceU = Number.isFinite(distance) ? distance : Math.hypot(this.relativeS(s.s, cruiser.s) - cruiser.s, s.lateral - cruiser.lateral);
  }

  _police(dt, allowTicket = true) {
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
      this._movePolice(p.pursuit, dt);
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

  _awardPoliceEscape(reason) {
    const s = this.state, pursuit = s.police.pursuit;
    if (!pursuit?.active || pursuit.caught || pursuit.escapeAwarded) return false;
    pursuit.active = false; pursuit.escapeAwarded = true;
    const points = SCORING.policeEscapePoints * this.scoreMultiplier;
    s.policeEscapes++; s.stageStyleScore += points; s.score += points;
    this._callout(`PURSUIT EVADED  /  +${points}`, 3);
    this.emit({ escaped: true, policeEscape: { points, count: s.policeEscapes, reason } });
    return true;
  }

  _ticket(radar) {
    const s = this.state;
    if (s.status !== 'racing') return;
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

  // Acknowledge the ticket screen and resume the stage (penalty already paid;
  // the pursuer leaves and won't re-trigger — one pursuer per stage).
  ackTicket() {
    const s = this.state;
    if (s.status !== 'ticket') return;
    s.police.pursuit = this.course.def.kind === 'chase' ? this._newPursuit(260) : null;
    s.speedMph = Math.min(s.speedMph, POLICE.ticketSpeedCapMph);
    s.status = 'racing';
    this.emit({ ticketAcked: true });
  }

  _rival(dt) {
    const s = this.state, r = s.rival;
    r.prevS = r.s; r.prevLateral = r.lateral;
    r.prevAirHeight = r.airHeight || 0;
    if (r.finished) {
      r.braking = r.speedMph > 0;
      r.speedMph = Math.max(0, r.speedMph - DRIVE.brakeAccel * dt);
      r.s += r.speedMph * DRIVE.mphToWorld * dt;
      this._jump(r, dt); this._staticContacts(r, false); this._boundary(r); this._crushProps(r);
      return;
    }
    r.pushVelocity ||= 0; r.headingError ||= 0;
    r.contactCooldown = Math.max(0, (r.contactCooldown || 0) - dt);
    r.braking = false; r.yieldingToPlayer = false;
    // CPU pace is independent of the player's manual/automatic gearbox.
    const skill = CPU_DIFFICULTY[s.cpuDifficulty], car = CARS[s.car];
    if (s.cpuDifficulty !== 'easy' && (this._npcRoutePlanner?.course !== this.course || this._npcRoutePlanner?.car !== car)) {
      this._npcRoutePlanner = new NpcRoutePlanner(this.course, { car, surfaceAt: (distance, lateral) => this._drivingSurface(distance, lateral, car) });
    }
    const route = s.cpuDifficulty === 'easy' ? null : this._npcRoutePlanner.update(r, { difficulty: s.cpuDifficulty, lapsTotal: s.lapsTotal, player: s, traffic: s.traffic });
    r.routeId = route?.routeId || null; r.routeLap = route?.routeLap || null;
    const rivalSurface = this._drivingSurface(r.s, r.lateral, car);
    const targetPace = car.topSpeed * skill.skill;
    const rubber = clamp((s.s - r.s) * .012, -8, 8);
    let target = targetPace + rubber;
    if (route) target = Math.min(target, route.targetSpeedMph);
    else {
      let curve = 0;
      for (let look = 0; look <= 140; look += 28) curve = Math.max(curve, Math.abs(this.course.at(r.s + look).curvature));
      if (curve > .0001) target = Math.min(target, Math.sqrt(DRIVE.maxLateralAccel * car.grip * rivalSurface.traction / curve) / DRIVE.mphToWorld * skill.cornerSkill);
    }
    // occasional "mistake": brief slow patch keyed deterministically to distance
    if (Math.sin(r.s * 0.01) > 0.96) target *= 0.6;
    r.offRoad = !rivalSurface.mainRoad; r.preparedGravel = rivalSurface.preparedGravel;
    if (r.offRoad) target = Math.min(target * (rivalSurface.preparedGravel ? 1 : .7), rivalSurface.speedLimit);
    if (r.contactCooldown > 0) target *= .55;
    let lane = route?.targetLateral ?? -DRIVE.laneOffset + Math.sin(r.s * .007) * 1.05;
    // A committed shortcut has its own corridor. Its planner brakes for traffic
    // on that path; ordinary main-road lane changes would cut across the gap.
    if (!route) for (const traffic of s.traffic) {
      if (!traffic.alive) continue;
      const ahead = this.relativeS(traffic.s, r.s) - r.s;
      if (ahead > -8 && ahead < 85 && Math.abs(traffic.lateral - lane) < 2.8) {
        const otherLane = traffic.lateral > 0 ? -DRIVE.laneOffset : DRIVE.laneOffset;
        const blocked = s.traffic.some(other => other !== traffic && other.alive && Math.abs(this.relativeS(other.s, r.s) - r.s) < 75 && Math.abs(other.lateral - otherLane) < 2.8);
        if (!blocked) lane = otherLane;
        else target = Math.min(target, traffic.dir < 0 ? 18 : Math.max(12, traffic.speedMph - 8));
      }
    }
    // Anticipate a cut-in using the player's travel direction, not only the
    // lane occupied at this instant. A sideways car advances much more slowly.
    const lead = this.relativeS(s.s, r.s) - r.s;
    const playerForwardMph = s.speedMph * Math.max(0, Math.cos(s.headingError || 0));
    const lookahead = .65;
    const lateralNow = s.lateral - r.lateral;
    const playerLateralSpeed = Math.sin(s.headingError || 0) * s.speedMph * DRIVE.mphToWorld + (s.pushVelocity || 0);
    const rivalLateralSpeed = Math.sin(r.headingError) * r.speedMph * DRIVE.mphToWorld + r.pushVelocity;
    const lateralFuture = lateralNow + (playerLateralSpeed - rivalLateralSpeed) * lookahead;
    const plannedFuture = route ? lateralNow + (playerLateralSpeed - Math.sin(route.headingTarget) * r.speedMph * DRIVE.mphToWorld - r.pushVelocity) * lookahead : lateralFuture;
    const playerAngle = (s.headingError || 0) + (s.slipAngle || 0);
    const footprint = this._vehicleSpec(s);
    const corridor = footprint.halfWidth * (1 + Math.abs(Math.cos(playerAngle))) + footprint.halfLength * Math.abs(Math.sin(playerAngle)) + .55;
    const crossingLane = Math.abs(lateralNow) < corridor || Math.abs(lateralFuture) < corridor || lateralNow * lateralFuture < 0 || Math.abs(plannedFuture) < corridor || lateralNow * plannedFuture < 0;
    const closingMetres = Math.max(0, r.speedMph - playerForwardMph) * DRIVE.mphToWorld;
    const followingGap = 8 + r.speedMph * DRIVE.mphToWorld * .6 + closingMetres * .8;
    if (route?.mustYield) { r.yieldingToPlayer = route.yieldingToPlayer; r.braking = r.speedMph > target; }
    if (lead > 0 && lead < followingGap && crossingLane) {
      r.yieldingToPlayer = true;
      const spacing = clamp((lead - 5) / Math.max(1, followingGap - 5), 0, 1);
      target = Math.min(target, playerForwardMph * (.7 + .3 * spacing));
      r.braking = r.speedMph > target;
    }
    target = Math.max(0, target);
    if (r.braking) r.speedMph = Math.max(target, r.speedMph - (lead < 18 ? 190 : 110) * dt);
    else r.speedMph += clamp(target - r.speedMph, -DRIVE.brakeAccel * car.braking * dt, car.accel * DRIVE.accelScale * .85 * dt);
    if (r.offRoad) r.speedMph *= Math.exp(-rivalSurface.scrub * dt * (rivalSurface.preparedGravel ? .25 : 1));
    if (route) {
      // Follow the physical tangent with the same tire-limited yaw authority
      // as the player. Subtract road-frame rotation to retain relative heading.
      const speed = r.speedMph * DRIVE.mphToWorld, frame = this.course.at(r.s);
      const authority = steeringYawAuthority(r.speedMph, car.grip, rivalSurface.traction);
      const error = Math.atan2(Math.sin(route.headingTarget - r.headingError), Math.cos(route.headingTarget - r.headingError));
      const yaw = clamp(route.curvature * speed + error * 6, -authority, authority);
      const progress = Math.cos(r.headingError) * speed / Math.max(.25, 1 - frame.curvature * r.lateral);
      r.headingError += (yaw - frame.curvature * progress) * dt;
    } else {
      const desiredHeading = clamp((lane - r.lateral) * .095, -.55, .55);
      // Recovery is a steering manoeuvre with limited grip, never a lane snap.
      const rivalTurnRate = rivalSurface.preparedGravel ? .95 * rivalSurface.traction : r.offRoad ? .48 : .95;
      r.headingError += clamp(desiredHeading - r.headingError, -dt * rivalTurnRate, dt * rivalTurnRate);
    }
    r.lateral += (Math.sin(r.headingError) * r.speedMph * DRIVE.mphToWorld + r.pushVelocity) * dt;
    r.s += Math.cos(r.headingError) * r.speedMph * DRIVE.mphToWorld * dt / Math.max(.25, 1 - this.course.at(r.s).curvature * r.lateral);
    r.pushVelocity *= Math.exp(-(r.offRoad ? .9 : 1.5) * dt);
    this._jump(r, dt);
    this._staticContacts(r, false);
    this._boundary(r);
    this._crushProps(r);
    this._advanceLaps(r, dt);
    if (r.completedLaps >= s.lapsTotal) { r.finished = true; r.finishTime = s.stageTimeSec; this.emit({ rivalFinished: true }); }
  }

  _crash(reason, side = 0, impactMph = Math.abs(this.state.speedMph), zone = 'front') {
    const s = this.state;
    if (s.impactTimer > 0 || s.status !== 'racing') return;
    this._breakDrift('hit');
    s.stageCrashes++;
    s.boosting = false;
    s.combo = 0; s.comboTimer = 0;
    const recoverable = this.stageDef.persistentVehicle || this.stageDef.kind === 'chase';
    const penalty = this.stageDef.crashPenaltySec ?? (this.stageDef.kind === 'chase' ? this.stageDef.chaseCrashPenaltySec : LIVES.crashPenaltySec);
    if (!recoverable) s.lives -= LIVES.crashLifeCost;
    s.penaltySec += penalty;
    s.racePenaltySec += penalty;
    if (s.timeLimitSec) s.timeRemaining = Math.max(0, s.timeLimitSec - s.stageTimeSec - s.racePenaltySec);
    s.totalTimeSec += penalty;
    s.lastCrashReason = reason;
    s.crashFlash = 1.2;
    s.impactStrength = Math.max(.35, Math.min(1, impactMph / 145));
    if (['head_on', 'rock', 'mountain', 'building', 'tree', 'prop'].includes(reason) && impactMph >= DRIVE.majorImpactMph) s.majorCrashes++;
    if (reason !== 'engine_blew') s.damageZones[zone] = Math.min(5, s.damageZones[zone] + s.impactStrength);
    s.damageCooldown = 1.2;
    s.catastrophic = !recoverable && s.majorCrashes >= DRIVE.majorCrashLimit;
    s.impactSide = side || Math.sign(s.lateral) || Math.sign(s.headingError) || 1;
    s.impactDuration = DRIVE.impactDuration + s.impactStrength * .25;
    if (s.catastrophic) { s.impactDuration = DRIVE.catastrophicDuration; s.impactStrength = 1; }
    s.impactTimer = s.impactDuration;
    s.crashSpin = 0;
    s.slipAngle = 0; s.drifting = false;
    s.invulnerableSec = s.impactDuration + DRIVE.recoverySec;
    s.speedMph = clamp(s.speedMph * .3, -DRIVE.crashSpeedCapMph, DRIVE.crashSpeedCapMph);
    s.gear = s.speedMph < 0 ? -1 : Math.max(0, s.gear); s.reverseHoldSec = 0;
    this._callout(reason === 'engine_blew' ? 'ENGINE FAILURE. SHIFT EARLIER.' : `IMPACT  /  +${penalty} SECONDS`, 2.8);
    this.emit({ crash: reason, livesLeft: s.lives, strength: s.impactStrength, side: s.impactSide, zone, explosion: s.catastrophic });
    if (!recoverable && (s.lives <= 0 || s.catastrophic)) {
      s.status = 'gameover';
      s.results = { gameover: true, completed: false, won: false, seed: s.seed, catastrophic: s.catastrophic, majorCrashes: s.majorCrashes,
        stageIndex: s.stageIndex, timeSec: +(s.stageTimeSec + s.racePenaltySec).toFixed(2), totalTimeSec: Math.round(s.totalTimeSec), lapTimes: [...s.lapTimes],
        jumps: s.jumps, jumpScore: s.jumpScore, crushCount: s.crushCount, crushScore: s.crushScore, ...this._objectiveResult() };
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
    s.prevLateral = s.lateral;
    s.impactTimer = Math.max(0, s.impactTimer - dt);
    s.speedMph *= Math.exp(-3.2 * dt);
    s.crashSpin += s.impactSide * s.impactStrength * 5 * remaining * dt;
    s.lateral += s.impactSide * s.speedMph * DRIVE.mphToWorld * .15 * remaining * dt;
    s.s = Math.min(this.raceLength - 1, s.s + s.speedMph * DRIVE.mphToWorld * .3 * dt);
    s.revs = Math.abs(s.speedMph) / (s.gear < 0 ? DRIVE.reverseMaxMph : this.car.gears[s.gear]);
    s.roughness = Math.max(s.roughness, remaining * s.impactStrength);
    this._staticContacts(s, true);
    if (s.impactTimer === 0 && s.status === 'racing') {
      this._safeReset(s); s.crashSpin = 0;
      s.speedMph = 12; s.gear = 0; s.revs = s.speedMph / this.car.gears[0];
      s.offRoad = false; s.offRoadTime = 0; s.roughness = 0;
      s.input.shiftUp = false; s.input.shiftDown = false;
      this._callout('BACK ON THE ROAD. FIND YOUR LINE.', 2);
      this.emit({ recovered: true });
    }
  }

  _crushProps(actor) {
    if (this.course.def.kind !== 'arena') return;
    const state = this.state, spec = this._vehicleSpec(actor);
    const start = this.course.groundAt(actor.prevS ?? actor.s, actor.prevLateral ?? actor.lateral);
    const end = this.course.groundAt(actor.s, actor.lateral);
    const heading = end.heading + (actor.headingError || 0) + (actor.slipAngle || 0);
    const previousBottom = start.y + (actor.prevAirHeight ?? actor.airHeight ?? 0), bottom = end.y + (actor.airHeight || 0);
    for (const prop of this.course.features.crushables || []) {
      if (state.crushedProps.includes(prop.id)) continue;
      const hit = sweepObstacle(start, end, prop, heading, spec);
      if (!hit) continue;
      const top = prop.y + prop.height;
      let contactTime = hit.t;
      if (previousBottom + (bottom - previousBottom) * contactTime > top) {
        // An overflight counts only if descent reaches the roof while the
        // truck still overlaps it. Crossing high above a row gives no reward.
        if (bottom > top || previousBottom <= bottom) continue;
        contactTime = (previousBottom - top) / (previousBottom - bottom);
        const landing = { x: start.x + (end.x - start.x) * contactTime, z: start.z + (end.z - start.z) * contactTime };
        if (!sweepObstacle(landing, landing, prop, heading, spec)) continue;
      }
      if (spec.mass < (prop.crushMass || 3500)) {
        const stop = { x: start.x + (end.x - start.x) * hit.t + hit.nx * (hit.penetration + .04),
          z: start.z + (end.z - start.z) * hit.t + hit.nz * (hit.penetration + .04) };
        const road = this._roadPosition(stop, actor.s); actor.s = road.s; actor.lateral = road.lateral;
        actor.speedMph *= .35;
        break;
      }
      state.crushedProps.push(prop.id);
      const byPlayer = actor === state, strength = clamp(.35 + actor.speedMph * .006 + Math.max(0, -(actor._verticalSpeed || 0)) * .04, .35, 1);
      actor.speedMph *= 1 - clamp(650 / spec.mass, .06, .18);
      if (!(actor.impactTimer > 0)) {
        actor.airHeight = Math.max(.08, actor.airHeight || 0); actor.airborne = true;
        actor._jumpY = end.y + actor.airHeight; actor._verticalSpeed = Math.max(actor._verticalSpeed || 0, 1.1 + strength * 1.4);
      }
      const burst = { id: prop.id, byPlayer, x: prop.x, y: prop.y, z: prop.z, s: prop.s, off: prop.off, strength,
        serial: (state.crushBurst?.serial || 0) + 1 };
      state.crushBurst = burst;
      if (byPlayer) {
        const points = 150 * this.scoreMultiplier;
        state.crushCount++; state.crushScore += points; state.stageStyleScore += points; state.score += points;
        this._callout(`CAR CRUSH  /  +${points}`, 1.8);
      }
      this.emit({ propCrushed: burst });
    }
  }

  _jump(actor, dt) {
    if (this.course.def.kind !== 'arena') return;
    const ground = this.course.groundAt(actor.s, actor.lateral).y;
    const previousGround = this.course.groundAt(actor.prevS ?? actor.s, actor.prevLateral ?? actor.lateral).y;
    if (!Number.isFinite(ground) || !Number.isFinite(previousGround)) return;
    if (actor._jumpY == null) { actor._jumpY = previousGround; actor._verticalSpeed = 0; }
    const gravity = 18, predicted = actor._jumpY + actor._verticalSpeed * dt - gravity * dt * dt * .5;
    if (!actor.airborne) {
      if (predicted > ground + .0001 && actor._verticalSpeed > 1 && actor.speedMph > 28) {
        actor.airborne = true;
        const phase = this.course.phase(actor.s), index = this.course.features.ramps.findIndex(ramp => phase >= ramp.start && phase <= ramp.end + 8);
        actor._jumpOrigin = index >= 0 ? { s: actor.s, world: this.course.worldAt(actor.s, actor.lateral), rampId: `ramp-${index}`, lap: Math.floor(actor.s / this.course.length) + 1 } : null;
      } else {
        actor._verticalSpeed = (ground - previousGround) / dt;
        actor._jumpY = ground; actor.airHeight = 0; return;
      }
    }
    actor._jumpY = predicted;
    actor._verticalSpeed -= gravity * dt;
    actor.airHeight = Math.max(0, actor._jumpY - ground);
    if (actor._jumpY > ground) return;
    actor._jumpY = ground; actor._verticalSpeed = 0; actor.airborne = false; actor.airHeight = 0;
    const origin = actor._jumpOrigin; actor._jumpOrigin = null;
    if (actor !== this.state || !origin || origin.lap !== actor.completedLaps + 1 || origin.s < actor.completedLaps * this.course.length) return;
    const key = `${origin.rampId}:lap-${origin.lap}`;
    if (actor.collectedJumps.includes(key)) return;
    const landing = this.course.worldAt(actor.s, actor.lateral), distance = Math.hypot(landing.x - origin.world.x, landing.z - origin.world.z);
    if (distance < 4) return;
    const points = Math.min(400, Math.round(distance * 4)) * this.scoreMultiplier;
    actor.collectedJumps.push(key); actor.jumpScore += points; actor.stageStyleScore += points; actor.score += points;
    actor.jumps++; actor.bestJumpMeters = Math.max(actor.bestJumpMeters, +distance.toFixed(1));
    this._callout(`BIG AIR  /  ${Math.round(distance)} m  /  +${points}`, 2.4);
    this.emit({ jumpLanded: { rampId: origin.rampId, lap: origin.lap, distance: +distance.toFixed(1), points } });
  }

  _advanceLaps(actor, dt) {
    const player = actor === this.state, laps = this.state.lapsTotal;
    if (actor.completedLaps >= laps) return;
    const previous = actor.prevS ?? actor.s, current = actor.s;
    if (current <= previous) return;
    const lapBase = actor.completedLaps * this.course.length, finish = lapBase + this.course.length;
    const gate = this._lapGates[actor.nextLapGate];
    const crossed = threshold => previous < threshold && current >= threshold;
    const legalAt = threshold => {
      const fraction = clamp((threshold - previous) / (current - previous), 0, 1);
      const lateral = (actor.prevLateral ?? actor.lateral) + (actor.lateral - (actor.prevLateral ?? actor.lateral)) * fraction;
      const surface = this._surface(threshold, lateral);
      return surface.road || !!surface.shortcutId;
    };
    // A discontinuous position change cannot substitute for driving a circuit.
    const plausibleTravel = current - previous < Math.max(20, actor.speedMph * DRIVE.mphToWorld * dt * 4 + 12);
    if (gate != null && crossed(lapBase + gate) && plausibleTravel && legalAt(lapBase + gate)) {
      actor.nextLapGate++;
      if (player) this.emit({ lapCheckpoint: actor.nextLapGate, lap: actor.completedLaps + 1 });
    }
    if (!crossed(finish)) return;
    if (actor.nextLapGate < this._lapGates.length || !legalAt(finish) || !plausibleTravel) {
      // Restore the last validated segment; there is no life or damage cost.
      actor.s = lapBase + (this._lapGates[actor.nextLapGate - 1] || 0) + 1;
      this._safeReset(actor);
      if (player) { actor.invulnerableSec = Math.max(actor.invulnerableSec, 2.2); this._callout('CHECKPOINT MISSED  /  BACK ON COURSE', 3); this.emit({ checkpointReset: true }); }
      return;
    }
    const fraction = clamp((finish - previous) / (current - previous), 0, 1);
    const elapsed = this.state.stageTimeSec + (player ? this.state.racePenaltySec : 0) - dt * (1 - fraction);
    actor.lapTimes.push(+(elapsed - actor.lapStartedAt).toFixed(3));
    actor.lapStartedAt = elapsed; actor.nextLapGate = 0; actor.completedLaps++;
    actor.lap = actor.currentLap = Math.min(laps, actor.completedLaps + 1);
    actor.lapTimeSec = Math.max(0, this.state.stageTimeSec + (player ? this.state.racePenaltySec : 0) - elapsed);
    if (player) {
      if (!this.state.police.pursuit?.active) this.state.police.triggered = false;
      if (actor.completedLaps < laps) this._callout(`LAP ${actor.currentLap} / ${laps}  /  KEEP PUSHING`, 3);
      this.emit({ lapCompleted: actor.completedLaps, lapTimeSec: actor.lapTimes.at(-1) });
    }
  }

  _advanceRushGates(dt) {
    const s=this.state,rush=s.checkpointRush,gates=this.course.features.rushGates;
    if(!rush||s.status!=='racing'||s.impactTimer>0||s.s<=(s.prevS??s.s))return;
    const previous=s.prevS,current=s.s,from=this.course.worldAt(previous,s.prevLateral??s.lateral),to=this.course.worldAt(current,s.lateral);
    const plausible=Math.hypot(to.x-from.x,to.z-from.z)<Math.max(20,s.speedMph*DRIVE.mphToWorld*dt*4+12);
    while(rush.nextGate<rush.total){
      const index=rush.nextGate,lap=Math.floor(index/gates.length),gate=gates[index%gates.length],threshold=lap*this.course.length+gate.s;
      if(current<threshold)break;
      const fraction=clamp((threshold-previous)/(current-previous),0,1),lateral=(s.prevLateral??s.lateral)+(s.lateral-(s.prevLateral??s.lateral))*fraction;
      const crossedAt=s.stageTimeSec+s.racePenaltySec-dt*(1-fraction);
      const passed=previous<threshold&&plausible&&lap===s.completedLaps&&Math.abs(lateral)<=gate.halfWidth&&s.speedMph>1&&crossedAt<s.timeLimitSec;
      rush.nextGate++;
      if(passed){rush.passed++;s.timeLimitSec+=rush.extensionSec;}else rush.missed++;
      s.timeRemaining=Math.max(0,s.timeLimitSec-s.stageTimeSec-s.racePenaltySec);
      rush.lastEvent={type:passed?'passed':'missed',gateId:gate.id,index,lap:lap+1,passed:rush.passed,total:rush.total,extensionSec:passed?rush.extensionSec:0,timeRemaining:s.timeRemaining};
      this._callout(passed?`CHECKPOINT ${rush.passed}/${rush.total}  /  +${rush.extensionSec} SEC`:'CHECKPOINT MISSED  /  NO TIME ADDED',2.1);
      this.emit({checkpointRushEvent:{...rush.lastEvent}});
    }
  }

  _objectiveResult() {
    const s = this.state, objective = s.objective;
    if (!objective) return {};
    if(s.checkpointRush)return{objective:'checkpointRush',checkpointRush:true,checkpointsPassed:s.checkpointRush.passed,checkpointsRequired:s.checkpointRush.total,
      checkpointMisses:s.checkpointRush.missed,targetsMet:s.checkpointRush.passed===s.checkpointRush.total,objectiveMissed:s.checkpointRush.passed!==s.checkpointRush.total,
      timeLimitSec:s.timeLimitSec,challengeLimitSec:s.timeLimitSec};
    if (objective.kind === 'driftTrial') return { objective: 'driftTrial', driftTrial: true,
      driftScore: Math.round(s.drift.bankedScore), driftTarget: objective.targetScore, driftBestChain: Math.round(s.drift.bestChain),
      driftMeters: +s.drift.driftMeters.toFixed(1), targetsMet: Math.round(s.drift.bankedScore) >= objective.targetScore,
      objectiveMissed: Math.round(s.drift.bankedScore) < objective.targetScore, timeLimitSec: s.timeLimitSec, challengeLimitSec: s.timeLimitSec };
    return { objective: objective.kind, targets: { jumps: objective.targetJumps, crushes: objective.targetCrushes },
      targetsMet: s.jumps >= objective.targetJumps && s.crushCount >= objective.targetCrushes, timeLimitSec: objective.timeLimitSec };
  }

  _deadline(atSec) {
    const s = this.state;
    if (!s.timeLimitSec || !['racing','ticket'].includes(s.status) || (atSec??s.stageTimeSec + s.racePenaltySec) < s.timeLimitSec) return false;
    if (s.drift) this._commitDrift(finishDrift(s.drift, { completed: false }));
    s.timeRemaining = 0;
    s.boosting = false; s.status = 'stage_result';
    s.results = { completed: false, won: false, timeout: true, seed: s.seed, stageIndex: s.stageIndex, stageName: this.stageDef.name,
      stageTimeSec: +s.stageTimeSec.toFixed(2), timeSec: +(s.stageTimeSec + s.racePenaltySec).toFixed(2),
      laps: s.completedLaps, lapTimes: [...s.lapTimes], lives: s.lives, score: s.stageStyleScore, styleScore: s.stageStyleScore,
      isPersonalBest: false, jumpScore: s.jumpScore, jumps: s.jumps, bestJumpMeters: s.bestJumpMeters,
      crushCount: s.crushCount, crushScore: s.crushScore, ...this._objectiveResult() };
    this._callout(s.checkpointRush?'TIME UP  /  CHECKPOINT RUSH ENDED':s.objective ? `TIME UP  /  ${s.drift ? 'DRIFT' : 'STUNT'} TRIAL ENDED` : 'TIME UP  /  THE CAR LIVES TO RACE AGAIN', 3);
    this.emit({ stageResult: s.results });
    return true;
  }

  _finishStage() {
    const s = this.state;
    if (s.status !== 'racing' || s.completedLaps < s.lapsTotal || s.s < this.raceLength) return false;
    if (this._deadline()) return false;
    if (s.drift) this._commitDrift(finishDrift(s.drift, { completed: true }));
    const timeSec = s.stageTimeSec + s.racePenaltySec;
    const par = this._parTime();
    const timeBonus = Math.max(0, Math.round((par - timeSec) * SCORING.perSecondUnder));
    const beatRival = s.rival ? (s.rival.finishTime == null || s.stageTimeSec <= s.rival.finishTime) : null;
    const objective = this._objectiveResult();
    const won = s.objective ? objective.targetsMet && timeSec < s.timeLimitSec : this.stageDef.kind === 'chase' ? timeSec < s.timeLimitSec : s.mode === 'duel' && s.rival ? beatRival === true : timeSec < par;
    const recordEligible = !s.objective || objective.targetsMet;
    if (recordEligible) this._awardPoliceEscape('finish');
    // Capture the completed circuit before repairs so repairs cannot create a clean bonus.
    const majorCrashesBeforeRepair = s.majorCrashes;
    const crashesRepaired = won ? Math.min(LIVES.stageWinRepair, s.majorCrashes) : 0;
    const livesRestored = won ? Math.min(LIVES.stageWinRepair, Math.max(0, LIVES.start - s.lives)) : 0;
    if (won) {
      const damageFraction = Math.max(crashesRepaired / Math.max(1, s.majorCrashes), livesRestored / Math.max(1, LIVES.start - s.lives));
      s.majorCrashes -= crashesRepaired; s.lives += livesRestored;
      for (const zone of Object.keys(s.damageZones)) s.damageZones[zone] *= 1 - damageFraction;
    }
    const stageBaseScore = (SCORING.perStageBase + timeBonus + s.lives * SCORING.perLifeLeft) * this.scoreMultiplier;
    const score = stageBaseScore + s.stageStyleScore;
    s.score += stageBaseScore;
    s.boosting = false;

    const previousBest = this._bestFor(this.stageDef.name);
    if (recordEligible) this._recordBest(this.stageDef.name, timeSec);
    s.results = {
      stageIndex: s.stageIndex, stageName: this.stageDef.name, seed: s.seed,
      stageTimeSec: +s.stageTimeSec.toFixed(2), timeSec: +timeSec.toFixed(2), missedStation: false,
      completed: true, laps: s.completedLaps, lapTimes: [...s.lapTimes], isPersonalBest: recordEligible && (previousBest == null || timeSec < previousBest),
      jumpScore: s.jumpScore, jumps: s.jumps, bestJumpMeters: s.bestJumpMeters,
      crushCount: s.crushCount, crushScore: s.crushScore,
      cleanStage: s.stageCrashes === 0, stageCrashes: s.stageCrashes, majorCrashesBeforeRepair,
      crashesRepaired, livesRestored, policeEscapes: s.policeEscapes, scoreMultiplier: this.scoreMultiplier,
      lives: s.lives, timeBonus: timeBonus * this.scoreMultiplier, beatRival, score, styleScore: s.stageStyleScore, won,
      best: this._bestFor(this.stageDef.name),
      ...objective, ...(s.objective ? { objectiveMissed: !objective.targetsMet } : {}),
    };
    if (s.lives <= 0) { s.status = 'gameover'; s.results.gameover = true; this.emit({ gameover: true }); return; }
    s.status = 'stage_result';
    this.emit({ stageResult: s.results });
    return true;
  }

  nextStage() {
    const s = this.state;
    if (s.status !== 'stage_result') return;
    if (this.stageDef.kind || s.stageIndex + 1 >= COURSE.length || COURSE[s.stageIndex + 1].kind) {
      s.status = 'complete';
      s.results = { complete: true, seed: s.seed, totalTimeSec: Math.round(s.totalTimeSec), lives: s.lives, score: s.score, nearMisses: s.nearMisses };
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
  _bestKey(stageName) {
    const s = this.state, upgrades = s.upgrades, event = this.course?.def || this.stageDef;
    return [event.id || stageName, `layout${event.layoutVersion || 1}`, `seed${s.seed}`, `laps${s.lapsTotal}`,
      stageName, s.car, s.difficulty, s.cpuDifficulty, s.mode, ...UPGRADE_KEYS.map(key => upgrades[key])].join('|');
  }
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
const BEST_STORAGE_KEY = 'duel_redline_best_v4';
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
