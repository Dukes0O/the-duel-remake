// game.js — The Duel controller. A kinematic spline driver (no sim physics),
// gears + redline, two-way traffic, police radar/pursuit, lives, and the
// stage/checkpoint/results loop. step(dt) is pure logic so it runs headless
// (tests, ?autopilot) and under rAF (rendering) identically.

import { CARS, DEFAULT_CAR, DIFFICULTY, DEFAULT_DIFFICULTY, COURSE, LIVES, POLICE, DRIVE, TRAFFIC, SCORING } from './config.js';
import { Course } from './course.js';
import { makeRng, seedFromUrl } from './rng.js';

export class Duel {
  constructor(opts = {}) {
    this.seed = (opts.seed ?? seedFromUrl()) >>> 0;
    this.difficultyKey = opts.difficulty || DEFAULT_DIFFICULTY;
    this.carKey = opts.car || DEFAULT_CAR;
    this.listeners = new Set();
    this.state = this._freshState();
  }

  _freshState() {
    return {
      seed: this.seed,
      status: 'menu', // menu -> countdown -> racing -> (crashed|ticket) -> stage_result -> ... -> gameover|complete
      car: this.carKey,
      difficulty: this.difficultyKey,
      stageIndex: 0,
      lives: LIVES.start,
      penaltySec: 0,
      stageTimeSec: 0,
      totalTimeSec: 0,
      // driving
      s: 0, lateral: 0, speedMph: 0, gear: 0, revs: 0, overrevSec: 0, offRoad: false,
      // police
      police: { beep: 0, triggered: false, pursuit: null, ticket: null },
      // rival
      rival: null,
      // traffic
      traffic: [],
      // input (set by main.js or autopilot)
      input: { throttle: 0, brake: 0, steer: 0, shiftUp: false, shiftDown: false },
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
    if (car) this.state.car = car;
    if (difficulty) this.state.difficulty = difficulty;
    this.state.mode = mode;
    this.state.stageIndex = 0;
    this.state.lives = LIVES.start;
    this.state.totalTimeSec = 0;
    this.state.penaltySec = 0;
    this._loadStage(0);
  }

  _loadStage(idx) {
    const s = this.state;
    s.stageIndex = idx;
    this.course = new Course(COURSE[idx], this.seed);
    s.s = 0; s.lateral = 0; s.speedMph = 0; s.gear = 0; s.revs = 0; s.overrevSec = 0;
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
    this.emit({ stageLoaded: idx });
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
    if (s.status === 'countdown') {
      s.countdown -= dt;
      if (s.countdown <= 0) { s.status = 'racing'; this.emit({ go: true }); }
      return;
    }
    if (s.status !== 'racing') return;

    s.stageTimeSec += dt;
    s.totalTimeSec += dt;
    if (s.crashFlash > 0) s.crashFlash = Math.max(0, s.crashFlash - dt);

    // each sub-step can end the run (gameover crash, ticket); once the status
    // leaves 'racing' the rest of the frame must not keep simulating, or a
    // finish-line crossing could overwrite the gameover/ticket state
    this._drive(dt);
    if (s.status !== 'racing') return;
    this._traffic(dt);
    this._collisions();
    if (s.status !== 'racing') return;
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
    // gearbox
    const gmax = car.gears[s.gear];
    s.revs = gmax ? s.speedMph / gmax : 0;
    if (d.autoShift) {
      if (s.revs > 0.96 && s.gear < car.gears.length - 1) s.gear++;
      else if (s.revs < 0.55 && s.gear > 0) s.gear--;
    } else {
      if (s.input.shiftUp && s.gear < car.gears.length - 1) s.gear++;
      if (s.input.shiftDown && s.gear > 0) s.gear--;
      s.input.shiftUp = s.input.shiftDown = false;
    }

    // acceleration limited by the current gear's max speed
    const gearMax = car.gears[s.gear];
    const accelFactor = Math.max(0.15, 1 - Math.max(0, s.revs - 0.5)); // falls off near redline
    if (s.input.throttle > 0) {
      const ceil = Math.min(car.topSpeed, gearMax * DRIVE.gearCeilFrac);
      if (s.speedMph < ceil) s.speedMph += car.accel * accelFactor * s.input.throttle * dt * DRIVE.accelScale;
    }
    if (s.input.brake > 0) s.speedMph -= DRIVE.brakeAccel * car.braking * s.input.brake * dt;
    s.speedMph -= DRIVE.dragCoeff * dt * (s.input.throttle > 0 ? 0.2 : 1);

    // engine blow if you ride the limiter on a Pro manual — the threshold sits
    // below the gear ceiling so holding throttle without upshifting gets there
    if (!d.autoShift && d.engineBlow && s.revs > DRIVE.overRevFrac && s.input.throttle > 0) {
      s.overrevSec += dt;
      if (s.overrevSec > DRIVE.overRevBlowSec) { this._crash('engine_blew'); return; }
    } else {
      s.overrevSec = Math.max(0, s.overrevSec - dt);
    }

    // steering + corner drift (grip resists being pushed wide)
    const frame = this.course.at(s.s);
    s.lateral += s.input.steer * DRIVE.steerRate * dt;
    const drift = frame.curvature * s.speedMph * (1 - car.grip) * 9;
    s.lateral += drift * dt;

    // off-road scrub + crash at the edge
    s.offRoad = Math.abs(s.lateral) > DRIVE.roadHalfWidth;
    if (s.offRoad) {
      s.speedMph *= (1 - (1 - DRIVE.offRoadGrip) * dt * 2);
      if (Math.abs(s.lateral) > DRIVE.roadHalfWidth + DRIVE.offRoadCrashMarginU) { this._crash('off_road'); return; }
    }

    s.speedMph = Math.max(0, Math.min(car.topSpeed, s.speedMph));
    s.s += s.speedMph * dt; // 1 mph == 1 unit/sec (see config DRIVE)
  }

  _traffic(dt) {
    const s = this.state;
    for (const c of s.traffic) {
      if (!c.alive) continue;
      c.prevS = c.s;
      c.s += c.dir * c.speedMph * dt; // oncoming move toward the player
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
      if (hitLong && Math.abs(c.lateral - s.lateral) < TRAFFIC.collideLatU) {
        c.alive = false;
        this._crash('traffic');
        return;
      }
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
        this.emit({ radarTriggered: true, speed: Math.round(s.speedMph), limit: radar.limitMph });
      }
    } else {
      p.beep = Math.max(0, p.beep - dt);
    }
    // pursuit dynamics: gapU is the player's lead — it closes when the
    // cruiser is faster, opens when the player outruns it
    if (p.pursuit && p.pursuit.active) {
      const rel = s.speedMph - POLICE.pursuitSpeedMph;
      p.pursuit.gapU += rel * dt;
      if (p.pursuit.gapU <= POLICE.pursuitCatchU) {
        p.pursuit.active = false; p.pursuit.caught = true;
        this._ticket(radar);
      } else if (p.pursuit.gapU >= POLICE.escapeAheadU) {
        p.pursuit.active = false;
        this.emit({ escaped: true });
      }
    }
  }

  _ticket(radar) {
    const s = this.state;
    s.status = 'ticket';
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
    r.s += r.speedMph * dt;
    // rival weaves between lanes
    r.lateral = -DRIVE.laneOffset + Math.sin(r.s * 0.02) * 1.4;
    if (r.s >= this.course.length) { r.finished = true; r.finishTime = s.stageTimeSec; this.emit({ rivalFinished: true }); }
  }

  _crash(reason) {
    const s = this.state;
    s.lives -= LIVES.crashLifeCost;
    s.penaltySec += LIVES.crashPenaltySec;
    s.totalTimeSec += LIVES.crashPenaltySec;
    s.lastCrashReason = reason;
    s.crashFlash = 1.2;
    this.emit({ crash: reason, livesLeft: s.lives });
    if (s.lives <= 0) {
      s.status = 'gameover';
      s.results = { gameover: true, stageIndex: s.stageIndex, totalTimeSec: Math.round(s.totalTimeSec) };
      this.emit({ gameover: true });
      return;
    }
    // recover: scrub speed, recenter on the road, keep racing
    s.speedMph = Math.min(s.speedMph, DRIVE.crashSpeedCapMph);
    s.lateral = 0; s.gear = Math.min(s.gear, DRIVE.crashGearMax); s.overrevSec = 0;
    s.status = 'racing';
  }

  _finishStage() {
    const s = this.state;
    // missed the gas station if you arrive off the paved road; else clean stage
    const missed = Math.abs(s.lateral) > DRIVE.roadHalfWidth;
    if (missed) { s.lives -= LIVES.missedStationCost; }
    else { s.lives += LIVES.cleanStageReward; }

    const par = this.course.length / SCORING.parSpeedMph; // par seconds
    const timeBonus = Math.max(0, Math.round((par - s.stageTimeSec) * SCORING.perSecondUnder));
    const beatRival = s.rival ? (s.rival.finishTime == null || s.stageTimeSec <= s.rival.finishTime) : null;
    const score = SCORING.perStageBase + timeBonus + s.lives * SCORING.perLifeLeft;

    this._recordBest(this.stageDef.name, s.stageTimeSec);
    s.results = {
      stageIndex: s.stageIndex, stageName: this.stageDef.name,
      stageTimeSec: +s.stageTimeSec.toFixed(2), missedStation: missed,
      cleanStage: !missed, lives: s.lives, timeBonus, beatRival, score,
      best: this._bestFor(this.stageDef.name),
    };
    if (s.lives <= 0) { s.status = 'gameover'; s.results.gameover = true; this.emit({ gameover: true }); return; }
    s.status = 'stage_result';
    this.emit({ stageResult: s.results });
  }

  nextStage() {
    const s = this.state;
    if (s.stageIndex + 1 >= COURSE.length) {
      s.status = 'complete';
      s.results = { complete: true, totalTimeSec: Math.round(s.totalTimeSec), lives: s.lives };
      this.emit({ complete: true });
      return;
    }
    this._loadStage(s.stageIndex + 1);
  }

  // ---- best times (localStorage with in-memory fallback) ---------------
  _recordBest(stageName, timeSec) {
    const all = loadBest();
    if (all[stageName] == null || timeSec < all[stageName]) { all[stageName] = +timeSec.toFixed(2); saveBest(all); }
  }
  _bestFor(stageName) { return loadBest()[stageName] ?? null; }

  // ---- input helpers ---------------------------------------------------
  setInput(partial) { Object.assign(this.state.input, partial); }
}

function loadBest() {
  try { const r = (typeof localStorage !== 'undefined') && localStorage.getItem('duel_best'); if (r) return JSON.parse(r); } catch (_) {}
  return {};
}
function saveBest(obj) { try { if (typeof localStorage !== 'undefined') localStorage.setItem('duel_best', JSON.stringify(obj)); } catch (_) {} }
