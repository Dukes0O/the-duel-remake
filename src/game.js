// Road-coordinate arcade driving with independent vehicle heading, steering
// traction, rough shoulders, and timed impact recovery. The simulation also
// owns traffic, police, gearbox, lives and campaign progression. step(dt)
// runs identically in headless tests and the fixed-step browser loop.

import { CARS, DEFAULT_CAR, DIFFICULTY, DEFAULT_DIFFICULTY, COURSE, LIVES, POLICE, DRIVE, TRAFFIC, SCORING, BOOST, steeringYawAuthority } from './config.js';
import { Course } from './course.js';
import { makeRng, seedFromUrl } from './rng.js';
import { sweepBox, sweepObstacle, contactZone, segmentCircle, CAR_HALF_WIDTH, CAR_HALF_LENGTH } from './collision.js';

const BOUNDARY_WARNING = 60, BOUNDARY_RESET = 78;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

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
      upgrades: { engine: 0, nitro: 0, handling: 0, tires: 0 },
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
      damageZones: { front: 0, rear: 0, left: 0, right: 0 }, damageCooldown: 0,
      boundaryWarning: false, boundaryResets: 0, pushVelocity: 0, collectedFlocks: [],
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

  get car() {
    const base = CARS[this.state.car], upgrades = this.state.upgrades;
    const key = `${this.state.car}|${upgrades.engine}|${upgrades.nitro}|${upgrades.handling}|${upgrades.tires}`;
    if (this._carCache?.key === key) return this._carCache.value;
    const engine = 1 + upgrades.engine * .035;
    const value = { ...base, topSpeed: base.topSpeed * engine, gears: base.gears.map(gear => gear * engine),
      accel: base.accel * (1 + upgrades.engine * .04), grip: Math.min(1.2, base.grip + upgrades.handling * .045 + upgrades.tires * .025),
      braking: base.braking * (1 + upgrades.tires * .06) };
    this._carCache = { key, value }; return value;
  }
  get diff() { return DIFFICULTY[this.state.difficulty]; }
  get stageDef() { return COURSE[this.state.stageIndex]; }

  // ---- lifecycle -------------------------------------------------------
  startCampaign({ mode = 'duel', car, difficulty, startStage = 0, upgrades = {} } = {}) {
    if (CARS[car]) this.state.car = car;
    if (DIFFICULTY[difficulty]) this.state.difficulty = difficulty;
    this.state.upgrades = Object.fromEntries(['engine', 'nitro', 'handling', 'tires'].map(key => [key, Number.isFinite(upgrades[key]) ? clamp(Math.floor(upgrades[key]), 0, 3) : 0]));
    this.state.mode = mode === 'timetrial' ? 'timetrial' : 'duel';
    this.state.stageIndex = Number.isFinite(startStage) ? clamp(Math.floor(startStage), 0, COURSE.length - 1) : 0;
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
    s.s = 0; s.lateral = 0; s.speedMph = 0; s.gear = 0; s.revs = 0; s.overrevSec = 0;
    s.paused = false; s.offRoad = false; s.steerVisual = 0;
    s.boost = 1; s.boosting = false; s.invulnerableSec = 0;
    s.headingError = 0; s.yawVelocity = 0; s.roughness = 0; s.offRoadTime = 0;
    s.slipAngle = 0; s.drifting = false;
    s.boundaryWarning = false; s.pushVelocity = 0; s.damageCooldown = 0; s.collectedFlocks = [];
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
      ? { s: this.course.rivalStartS, lateral: -DRIVE.laneOffset, speedMph: 0, finished: false, finishTime: null,
        headingError: 0, yawVelocity: 0, pushVelocity: 0, offRoad: false, contactCooldown: 0 }
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
    s.damageCooldown = Math.max(0, s.damageCooldown - dt);
    s.calloutTimer = Math.max(0, s.calloutTimer - dt);
    s.comboTimer = Math.max(0, s.comboTimer - dt);
    if (s.comboTimer === 0) s.combo = 0;

    if (s.impactTimer > 0) {
      this._impact(dt);
      this._traffic(dt);
      if (s.rival) this._rival(dt);
      this._collisions();
      return; // A crash must play out before a ticket or finish can replace it.
    }

    // each sub-step can end the run (gameover crash, ticket); once the status
    // leaves 'racing' the rest of the frame must not keep simulating, or a
    // finish-line crossing could overwrite the gameover/ticket state
    this._drive(dt);
    if (s.status !== 'racing' || s.impactTimer > 0) return;
    this._traffic(dt);
    if (s.rival) this._rival(dt);
    this._collisions();
    this._flockBonuses();
    if (s.status !== 'racing' || s.impactTimer > 0) return;
    this._police(dt);
    if (s.status !== 'racing') return;

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
    const nitro = s.upgrades.nitro, boostDrain = BOOST.drainPerSec / (1 + nitro * .14);
    const boostTopSpeed = BOOST.topSpeedMult + nitro * .025;
    s.boosting = !!s.input.boost && s.boost > 0 && s.speedMph >= BOOST.minSpeedMph && !s.offRoad && s.input.brake === 0;
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

    const speedCap = s.boosting ? car.topSpeed * boostTopSpeed : car.topSpeed;
    if (!s.boosting && s.speedMph > speedCap) s.speedMph -= 22 * dt;
    s.speedMph = Math.max(0, Math.min(car.topSpeed * boostTopSpeed, s.speedMph));
    s.revs = s.speedMph / car.gears[s.gear];
    const metresPerSec = s.speedMph * DRIVE.mphToWorld;
    const forward = Math.max(0, Math.cos(s.headingError)) * metresPerSec * dt;
    s.headingError += s.yawVelocity * dt - frame.curvature * forward;
    s.headingError = Math.max(-1.45, Math.min(1.45, s.headingError));
    s.lateral += (Math.sin(s.headingError) * metresPerSec + s.pushVelocity) * dt;
    s.pushVelocity *= Math.exp(-2.4 * dt);
    s.s += forward;
    s.offRoad = Math.abs(s.lateral) > DRIVE.roadHalfWidth;
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
        if (Math.abs(c.lateral) > DRIVE.roadHalfWidth) c.speedMph *= Math.exp(-DRIVE.offRoadScrub * dt);
      }
      c.s += c.dir * c.speedMph * DRIVE.mphToWorld * dt;
      c.contactCooldown = Math.max(0, (c.contactCooldown || 0) - dt);
      if (Number.isFinite(c.lateral)) this._staticContacts(c, false);
    }
  }

  _collisions() {
    const s = this.state;
    this._staticContacts(s, true);
    if (s.rival && !s.rival.finished) this._vehicleContact(s, s.rival, 'rival');
    for (const c of s.traffic) {
      if (!c.alive) continue;
      // swept longitudinal test: a head-on closing speed can cross the whole
      // hit window in one clamped frame, so a relative sign flip counts too
      const now = c.s - s.s;
      const prev = (c.prevS ?? c.s) - (s.prevS ?? s.s);
      const clearance = Math.abs(c.lateral - s.lateral);
      this._vehicleContact(s, c, c.dir < 0 ? 'head_on' : 'traffic');
      if (s.rival && !s.rival.finished) this._vehicleContact(s.rival, c, 'traffic');
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
    // A vehicle pushed sideways may now touch scenery. Resolve that contact
    // again, including when damage is temporarily disabled after a crash.
    this._staticContacts(s, true);
    if (s.rival && !s.rival.finished) this._staticContacts(s.rival, false);
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
    const travelHeading = this.course.at(car.s).heading + (car.headingError || 0) + (car.dir < 0 ? Math.PI : 0);
    const heading = travelHeading + (car.slipAngle || 0);
    const obstacles = this._obstacles(oldS, car.s);
    for (let attempt = 0; attempt < 4; attempt++) {
      let first = null;
      for (const obstacle of obstacles) {
        const hit = sweepObstacle(start, end, obstacle, heading);
        if (hit && (!first || hit.t < first.t)) first = hit;
      }
      if (!first) break;
      const { nx, nz, t, penetration, obstacle } = first;
      const dx = end.x - start.x, dz = end.z - start.z;
      const incoming = Math.max(0, -(Math.sin(travelHeading) * nx + Math.cos(travelHeading) * nz));
      const roadHeading = this.course.at(car.s).heading;
      const pushNormal = Math.cos(roadHeading) * nx - Math.sin(roadHeading) * nz;
      const impactMph = car.speedMph * incoming + Math.max(0, -(car.pushVelocity || 0) * pushNormal) / DRIVE.mphToWorld;
      const zone = contactZone(nx, nz, heading);
      // Stop the normal component at the first contact; allow the unused
      // tangential movement to slide along the wall instead of sticking.
      const stop = { x: start.x + dx * t + nx * (penetration + .04), z: start.z + dz * t + nz * (penetration + .04) };
      const remainingX = dx * (1 - t), remainingZ = dz * (1 - t);
      const inward = Math.min(0, remainingX * nx + remainingZ * nz);
      end = { x: stop.x + remainingX - nx * inward, z: stop.z + remainingZ - nz * inward };
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
    car.offRoad = Math.abs(car.lateral) > DRIVE.roadHalfWidth;
  }

  _vehicleContact(a, b, reason) {
    const start = { x: (a.prevLateral ?? a.lateral) - (b.prevLateral ?? b.lateral), z: (a.prevS ?? a.s) - (b.prevS ?? b.s) };
    const end = { x: a.lateral - b.lateral, z: a.s - b.s };
    // A road-aligned envelope is intentionally a little generous to avoid
    // the visible cars interpenetrating while their bodies drift.
    const angleA = (a.headingError || 0) + (a.slipAngle || 0), angleB = (b.headingError || 0) + (b.slipAngle || 0);
    const width = CAR_HALF_WIDTH * (Math.abs(Math.cos(angleA)) + Math.abs(Math.cos(angleB)))
      + CAR_HALF_LENGTH * (Math.abs(Math.sin(angleA)) + Math.abs(Math.sin(angleB))) + .2;
    const length = CAR_HALF_LENGTH * (Math.abs(Math.cos(angleA)) + Math.abs(Math.cos(angleB)))
      + CAR_HALF_WIDTH * (Math.abs(Math.sin(angleA)) + Math.abs(Math.sin(angleB))) + .3;
    const hit = sweepBox(start, end, width, length);
    if (!hit) return false;
    const { nx, nz } = hit;
    // A rival arriving from behind must yield to a player who cuts in.
    // Resolve late contacts even if there was too little room to brake first:
    // the CPU moves back and loses speed; the player's run remains intact.
    if (a === this.state && b === this.state.rival && nz > 0 && (b.dir || 1) > 0 && Math.cos(a.headingError || 0) > 0) {
      b.s = Math.min(b.s, a.s - length - .15);
      const forwardMph = Math.max(0, a.speedMph * Math.cos(a.headingError || 0));
      b.speedMph = Math.min(b.speedMph, forwardMph * .94);
      b.braking = true; b.yieldingToPlayer = true; b.contactCooldown = Math.max(b.contactCooldown || 0, .45);
      return true;
    }
    const vaX = Math.sin(a.headingError || 0) * a.speedMph * DRIVE.mphToWorld + (a.pushVelocity || 0);
    const vbX = Math.sin(b.headingError || 0) * b.speedMph * DRIVE.mphToWorld + (b.pushVelocity || 0);
    const vaZ = a.speedMph * (a.dir || 1), vbZ = b.speedMph * (b.dir || 1);
    const impactMph = Math.max(0, -(vaX - vbX) / DRIVE.mphToWorld * nx - (vaZ - vbZ) * nz);
    // Share the positional correction. Even a protected car remains solid.
    const required = nx ? width + .04 - (a.lateral - b.lateral) * nx : length + .04 - (a.s - b.s) * nz;
    const correction = Math.max(0, required);
    a.lateral += nx * correction * .5; b.lateral -= nx * correction * .5;
    a.s += nz * correction * .5; b.s -= nz * correction * .5;
    const zone = contactZone(nx, nz, angleA);
    if (nx) {
      const shove = clamp(2.5 + impactMph * DRIVE.mphToWorld * .62, 2.5, 13);
      a.pushVelocity = clamp((a.pushVelocity || 0) + nx * shove * .3, -16, 16);
      b.pushVelocity = clamp((b.pushVelocity || 0) - nx * shove, -16, 16);
      b.headingError = clamp((b.headingError || 0) - nx * .07, -.8, .8);
      a.speedMph *= .992; b.speedMph *= .985;
      if (a === this.state && impactMph > 3 && this.state.invulnerableSec <= 0) this._scrape(zone, impactMph);
    } else if (impactMph > 0) {
      const combined = Math.max(0, (vaZ + vbZ) * .5);
      a.speedMph = (a.dir || 1) > 0 ? combined : Math.abs(combined);
      b.speedMph = (b.dir || 1) > 0 ? combined : Math.abs(combined);
      if (a === this.state && this.state.invulnerableSec <= 0 && impactMph >= 28) this._crash(reason, Math.sign(a.lateral - b.lateral), impactMph, zone);
      else if (a === this.state && this.state.invulnerableSec <= 0 && impactMph > 4) this._scrape(zone, impactMph);
    }
    a.offRoad = Math.abs(a.lateral) > DRIVE.roadHalfWidth;
    b.offRoad = Math.abs(b.lateral) > DRIVE.roadHalfWidth;
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
    const player = car === this.state, outside = Math.abs(car.lateral);
    const seaward = this.course.def.theme === 'coast' && car.lateral > 28;
    const coastHeight = seaward ? this.course.groundAt(car.s, car.lateral).y : Infinity;
    if (player) {
      const warning = outside > BOUNDARY_WARNING || coastHeight < -10;
      if (warning && !car.boundaryWarning) this._callout(coastHeight < -10 ? 'RETURN TO THE ROAD  /  WATER AHEAD' : 'RETURN TO THE ROAD  /  COURSE BOUNDARY', 3);
      car.boundaryWarning = warning;
    }
    if (outside <= BOUNDARY_RESET && coastHeight >= -14) return;
    this._safeReset(car);
    if (player) {
      car.boundaryWarning = false; car.boundaryResets++;
      car.invulnerableSec = Math.max(car.invulnerableSec, 2.2);
      this._callout('BACK ON COURSE  /  NO DAMAGE', 2.8);
      this.emit({ boundaryReset: true });
    }
  }

  _safeReset(car) {
    const others = [...this.state.traffic.filter(other => other.alive), this.state.rival, this.state].filter(other => other && other !== car);
    let chosen = { s: Math.min(this.course.length - 8, Math.max(0, car.s)), lateral: 0 };
    search: for (const back of [0, 10, 22, 40, 70, 110]) {
      for (const lateral of [-DRIVE.laneOffset, DRIVE.laneOffset, 0]) {
        const distance = Math.max(0, Math.min(this.course.length - 8, car.s - back));
        if (others.some(other => Math.abs(other.s - distance) < 13 && Math.abs(other.lateral - lateral) < 2.7)) continue;
        const point = this.course.worldAt(distance, lateral);
        if (this._obstacles(distance - 4, distance + 4).some(obstacle => sweepObstacle(point, point, obstacle, point.heading))) continue;
        chosen = { s: distance, lateral }; break search;
      }
    }
    car.s = car.prevS = chosen.s; car.lateral = car.prevLateral = chosen.lateral;
    car.speedMph = Math.min(28, car.speedMph * .4);
    car.headingError = 0; car.yawVelocity = 0; car.pushVelocity = 0; car.slipAngle = 0; car.drifting = false;
    car.offRoad = false; car.offRoadTime = 0; car.roughness = 0; car.boosting = false;
    car.steerVisual = 0;
    if (car === this.state) { car.gear = 0; car.revs = car.speedMph / this.car.gears[0]; car.overrevSec = 0; }
  }

  _flockBonuses() {
    const s = this.state;
    if (s.speedMph < 1 || s.status !== 'racing' || s.impactTimer > 0) return;
    for (const flock of this.course.features.flocks || []) {
      if (s.collectedFlocks.includes(flock.id)) continue;
      if (!segmentCircle(s.prevS ?? s.s, s.prevLateral ?? s.lateral, s.s, s.lateral, flock.s, flock.off, (flock.radius || 3.5) + CAR_HALF_WIDTH)) continue;
      s.collectedFlocks.push(flock.id); s.boost = 1;
      this._callout('CHICKEN RUN!  /  NITRO REFILLED', 2.7);
      this.emit({ chickenBonus: true, flockId: flock.id });
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
    r.prevS = r.s; r.prevLateral = r.lateral;
    r.pushVelocity ||= 0; r.headingError ||= 0;
    r.contactCooldown = Math.max(0, (r.contactCooldown || 0) - dt);
    r.braking = false; r.yieldingToPlayer = false;
    // beatable AI: targets a pace with mild rubber-banding and visible slips
    const skill = this.diff.rivalSkill;
    const targetPace = this.car.topSpeed * (0.66 + 0.18 * skill);
    const rubber = (s.s - r.s) * 0.012; // catches up if behind, eases if ahead
    let target = targetPace + rubber;
    // occasional "mistake": brief slow patch keyed deterministically to distance
    if (Math.sin(r.s * 0.01) > 0.96) target *= 0.6;
    r.offRoad = Math.abs(r.lateral) > DRIVE.roadHalfWidth;
    if (r.offRoad) target = Math.min(target * .52, 75);
    if (r.contactCooldown > 0) target *= .55;
    let lane = -DRIVE.laneOffset + Math.sin(r.s * .007) * 1.05;
    for (const traffic of s.traffic) {
      if (!traffic.alive) continue;
      const ahead = traffic.s - r.s;
      if (ahead > -8 && ahead < 85 && Math.abs(traffic.lateral - lane) < 2.8) {
        const otherLane = traffic.lateral > 0 ? -DRIVE.laneOffset : DRIVE.laneOffset;
        const blocked = s.traffic.some(other => other !== traffic && other.alive && Math.abs(other.s - r.s) < 75 && Math.abs(other.lateral - otherLane) < 2.8);
        if (!blocked) lane = otherLane;
        else target = Math.min(target, traffic.dir < 0 ? 18 : Math.max(12, traffic.speedMph - 8));
      }
    }
    // Anticipate a cut-in using the player's travel direction, not only the
    // lane occupied at this instant. A sideways car advances much more slowly.
    const lead = s.s - r.s;
    const playerForwardMph = s.speedMph * Math.max(0, Math.cos(s.headingError || 0));
    const lookahead = .65;
    const lateralNow = s.lateral - r.lateral;
    const playerLateralSpeed = Math.sin(s.headingError || 0) * s.speedMph * DRIVE.mphToWorld + (s.pushVelocity || 0);
    const rivalLateralSpeed = Math.sin(r.headingError) * r.speedMph * DRIVE.mphToWorld + r.pushVelocity;
    const lateralFuture = lateralNow + (playerLateralSpeed - rivalLateralSpeed) * lookahead;
    const playerAngle = (s.headingError || 0) + (s.slipAngle || 0);
    const corridor = CAR_HALF_WIDTH * (1 + Math.abs(Math.cos(playerAngle))) + CAR_HALF_LENGTH * Math.abs(Math.sin(playerAngle)) + .55;
    const crossingLane = Math.abs(lateralNow) < corridor || Math.abs(lateralFuture) < corridor || lateralNow * lateralFuture < 0;
    const closingMetres = Math.max(0, r.speedMph - playerForwardMph) * DRIVE.mphToWorld;
    const followingGap = 8 + r.speedMph * DRIVE.mphToWorld * .6 + closingMetres * .8;
    if (lead > 0 && lead < followingGap && crossingLane) {
      r.yieldingToPlayer = true;
      const spacing = clamp((lead - 5) / Math.max(1, followingGap - 5), 0, 1);
      target = Math.min(target, playerForwardMph * (.7 + .3 * spacing));
      r.braking = r.speedMph > target;
    }
    if (r.braking) r.speedMph = Math.max(target, r.speedMph - (lead < 18 ? 190 : 110) * dt);
    else r.speedMph += (target - r.speedMph) * Math.min(1, dt * 1.5);
    if (r.offRoad) r.speedMph *= Math.exp(-DRIVE.offRoadScrub * dt);
    const desiredHeading = clamp((lane - r.lateral) * .095, -.55, .55);
    // Recovery is a steering manoeuvre with limited grip, never a lane snap.
    r.headingError += clamp(desiredHeading - r.headingError, -dt * (r.offRoad ? .48 : .95), dt * (r.offRoad ? .48 : .95));
    r.lateral += (Math.sin(r.headingError) * r.speedMph * DRIVE.mphToWorld + r.pushVelocity) * dt;
    r.s += Math.cos(r.headingError) * r.speedMph * DRIVE.mphToWorld * dt;
    r.pushVelocity *= Math.exp(-(r.offRoad ? .9 : 1.5) * dt);
    this._staticContacts(r, false);
    this._boundary(r);
    if (r.s >= this.course.length) { r.finished = true; r.finishTime = s.stageTimeSec; this.emit({ rivalFinished: true }); }
  }

  _crash(reason, side = 0, impactMph = this.state.speedMph, zone = 'front') {
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
    if (['head_on', 'rock', 'mountain', 'building', 'tree', 'prop'].includes(reason) && impactMph >= DRIVE.majorImpactMph) s.majorCrashes++;
    if (reason !== 'engine_blew') s.damageZones[zone] = Math.min(5, s.damageZones[zone] + s.impactStrength);
    s.damageCooldown = 1.2;
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
    this.emit({ crash: reason, livesLeft: s.lives, strength: s.impactStrength, side: s.impactSide, zone, explosion: s.catastrophic });
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
    s.prevLateral = s.lateral;
    s.impactTimer = Math.max(0, s.impactTimer - dt);
    s.speedMph *= Math.exp(-3.2 * dt);
    s.crashSpin += s.impactSide * s.impactStrength * 5 * remaining * dt;
    s.lateral += s.impactSide * s.speedMph * DRIVE.mphToWorld * .15 * remaining * dt;
    s.s = Math.min(this.course.length - 1, s.s + s.speedMph * DRIVE.mphToWorld * .3 * dt);
    s.revs = s.speedMph / this.car.gears[s.gear];
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
      won: s.mode === 'duel' && s.rival ? beatRival === true : s.stageTimeSec < par,
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
  _bestKey(stageName) {
    const s = this.state, upgrades = s.upgrades;
    return [stageName, s.car, s.difficulty, s.mode, upgrades.engine, upgrades.nitro, upgrades.handling, upgrades.tires].join('|');
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
const BEST_STORAGE_KEY = 'duel_redline_best_v3';
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
