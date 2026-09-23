import {normalizeWeapons} from './weapon-upgrades.js';
import {createCombat,fireWeapon,stepCombat,supportsCombat} from './combat.js';
// Road-coordinate arcade driving with independent vehicle heading, steering
// traction, rough shoulders, and timed impact recovery. The simulation also
// owns traffic, police, gearbox, lives and campaign progression. step(dt)
// runs identically in headless tests and the fixed-step browser loop.

import { CARS, DEFAULT_CAR, DIFFICULTY, DEFAULT_DIFFICULTY, CPU_DIFFICULTY, DEFAULT_CPU_DIFFICULTY, COURSE, LIVES, POLICE, DRIVE, TRAFFIC, SCORING, BOOST, ROAD_SHOULDER_WIDTH, steeringYawAuthority } from './config.js';
import { Course } from './course.js';
import { makeRng, seedFromUrl } from './rng.js';
import { sweepBox, sweepObstacle, contactZone, segmentCircle, CAR_HALF_WIDTH, CAR_HALF_LENGTH } from './collision.js';
import { NpcRoutePlanner } from './npc-route.js';
import { createDriftState, stepDrift, finishDrift, breakDrift } from './drift-scoring.js';
import { vehicleContactEnvelope, planNpcYield, npcYieldContactNormal } from './npc-yielding.js';
import { DEFAULT_DRIVER, normalizeDriverId, applyDriverModifiers } from './drivers.js';
import { offroadCapability, wrapHeading, rockHeight, rockSupportHeight, limitClimb, terrainAttitude, tumbleAttitude, canCrushVehicle, crushedVehicleSupport } from './offroad-physics.js';
import { combatCrashThresholdMph, rearRamResponse } from './vehicle-impact.js';
import { sampleMountainSupport } from './mountain-support.js';
import {normalizeRival} from './rival-settings.js';
import {upgradedCar} from './progression.js';

const BOUNDARY_WARNING = 60, BOUNDARY_RESET = 78;
const GLANCING_WALL_NORMAL_FRACTION = Math.sin(35 * Math.PI / 180);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const freshDamageZones = () => ({ front: 0, rear: 0, left: 0, right: 0 });
const UPGRADE_KEYS = ['engine', 'nitro', 'handling', 'tires', 'brakes', 'suspension', 'tank'];
const FACTORY_MAX_UPGRADES = Object.freeze(Object.fromEntries(UPGRADE_KEYS.map(key => [key, 3])));

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
      driverId: DEFAULT_DRIVER,
      difficulty: this.difficultyKey,
      cpuDifficulty: DEFAULT_CPU_DIFFICULTY, playerId: null,
      upgrades: Object.fromEntries(UPGRADE_KEYS.map(key => [key, CARS[this.carKey]?.factoryMaxed ? 3 : 0])),
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
      damageZones: freshDamageZones(), damageCooldown: 0,
      boundaryWarning: false, boundaryResets: 0, pushVelocity: 0, collectedFlocks: [],
      airborne: false, airHeight: 0, jumpScore: 0, jumps: 0, bestJumpMeters: 0, collectedJumps: [],
      airDistance: 0, airTime: 0, _airOrigin: null,
      groundHeight: null, terrainPitch: null, terrainRoll: null, tumble: null, rollovers: 0, practice: false,
      crushedProps: [], crushCount: 0, crushScore: 0, crushBurst: null,
      fallenCacti: [],
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
    const base = CARS[this.state.car], upgrades = base.factoryMaxed ? FACTORY_MAX_UPGRADES : this.state.upgrades;
    const driverId = normalizeDriverId(this.state.driverId);
    const key = `${this.state.car}|${driverId}|${UPGRADE_KEYS.map(name => upgrades[name] || 0).join(':')}`;
    if (this._carCache?.key === key) return this._carCache.value;
    const engine = 1 + upgrades.engine * .035;
    const value = { ...base, topSpeed: base.topSpeed * engine, gears: base.gears.map(gear => gear * engine),
      accel: base.accel * (1 + upgrades.engine * .04), grip: Math.min(1.2, base.grip + upgrades.handling * .045 + upgrades.tires * .025),
      braking: base.braking * (1 + upgrades.tires * .06 + (upgrades.brakes || 0) * .12),
      offRoadGrip: Math.min(1.15, (base.offRoadGrip ?? DRIVE.offRoadGrip) + (upgrades.suspension || 0) * .04 + upgrades.tires * .02),
      roughnessScale: 1 / (1 + (upgrades.suspension || 0) * .18), boostCapacity: (base.boostCapacity ?? 1) * (1 + (upgrades.tank || 0) * .25) };
    const modified = applyDriverModifiers(value, driverId, this.state.car);
    this._carCache = { key, value: modified }; return modified;
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
    return { ...surface, preparedGravel, boostAllowed: surface.road || this.course.def.practice,
      traction: surface.mainRoad ? 1 : preparedGravel ? clamp(.6 + .4 * (car.offRoadGrip ?? DRIVE.offRoadGrip), .82, .995) : car.offRoadGrip ?? DRIVE.offRoadGrip,
      speedLimit: surface.mainRoad ? car.topSpeed : preparedGravel ? car.topSpeed * (rally ? .98 : .95) : car.offRoadSpeed ?? 68,
      scrub: surface.mainRoad ? 0 : (preparedGravel ? rally ? .014 : .035 : car.offRoadScrub ?? DRIVE.offRoadScrub) * roughnessScale,
      roughness: preparedGravel ? (rally ? .14 : .2) * roughnessScale : null };
  }
  _vehicleSpec(actor) {
    // Upgrades change handling and power, never the collision shell or mass.
    const car = CARS[actor === this.state ? this.state.car : actor.car || (actor === this.state.rival ? this.state.car : null)] || {};
    return { halfWidth: car.collision?.halfWidth ?? CAR_HALF_WIDTH, halfLength: car.collision?.halfLength ?? CAR_HALF_LENGTH, mass: car.mass || 1450, height: car.height || 1.35 };
  }

  _npcYield(actor, targetMph, plannedHeading = actor.headingError || 0) {
    const player = this.state, playerSpec = this._vehicleSpec(player), actorSpec = this._vehicleSpec(actor);
    if (player.airborne || actor.airborne) {
      const playerY = (player.groundHeight ?? this.course.groundAt(player.s, player.lateral).y) + (player.airHeight || 0);
      const actorY = (actor.groundHeight ?? this.course.groundAt(actor.s, actor.lateral).y) + (actor.airHeight || 0);
      if (playerY > actorY + actorSpec.height || actorY > playerY + playerSpec.height) {
        actor.yieldingToPlayer = false;
        return { yielding: false, targetMph, braking: 110 };
      }
    }
    const envelope = vehicleContactEnvelope(player, actor, playerSpec, actorSpec);
    const plan = planNpcYield({ player, npc: actor, lead: this.relativeS(player.s, actor.s) - actor.s, envelope, targetMph, plannedHeading });
    actor.yieldingToPlayer = plan.yielding;
    return plan;
  }

  // ---- lifecycle -------------------------------------------------------
  startCampaign({ mode = 'duel', car, difficulty, cpuDifficulty = DEFAULT_CPU_DIFFICULTY, playerId = null, driverId = DEFAULT_DRIVER, startStage = 0, upgrades = {}, seed, rival, weaponLevels } = {}) {
    if (Number.isFinite(seed) && Number.isInteger(seed)) this.seed = seed >>> 0;
    this.state.seed = this.seed;
    if (CARS[car]) this.state.car = car;
    if (DIFFICULTY[difficulty]) this.state.difficulty = difficulty;
    this.state.cpuDifficulty = CPU_DIFFICULTY[cpuDifficulty] ? cpuDifficulty : DEFAULT_CPU_DIFFICULTY;
    this.state.playerId = typeof playerId === 'string' ? playerId : null;
    this.state.driverId = normalizeDriverId(driverId);
    this.state.rivalSettings = normalizeRival(rival);this.state.weaponLevels=normalizeWeapons({levels:weaponLevels}).levels;
    this.state.upgrades = Object.fromEntries(UPGRADE_KEYS.map(key => [key, CARS[this.state.car].factoryMaxed ? 3 : Number.isFinite(upgrades[key]) ? clamp(Math.floor(upgrades[key]), 0, 3) : 0]));
    this.state.mode = mode === 'wasteland' && supportsCombat(COURSE[startStage]) ? 'wasteland' : mode === 'timetrial' ? 'timetrial' : 'duel';
    this.state.stageIndex = Number.isFinite(startStage) ? clamp(Math.floor(startStage), 0, COURSE.length - 1) : 0;
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
    s.airDistance = 0; s.airTime = 0; s._airOrigin = null;
    s.groundHeight = null; s.terrainPitch = null; s.terrainRoll = null; s.tumble = null; s.rollovers = 0;
    s._climbGain = 0; s._climbRest = 0; s._offroadSafe = null; s.practice = this.course.def.practice === true;
    s.crushedProps = []; s.crushCount = 0; s.crushScore = 0; s.crushBurst = null;
    this._crushedVehicles = [];
    s.fallenCacti = []; this._fallenCactusIds = new Set();
    s._jumpY = null; s._verticalSpeed = 0; s._jumpOrigin = null; s.prevAirHeight = 0;
    s.crashSite = null; s.impactTimer = 0; s.impactDuration = 0; s.impactStrength = 0; s.impactSide = 1; s.crashSpin = 0;
    s.bombImpactCooldown = 0;
    s.combo = 0; s.comboTimer = 0; s.stageStyleScore = 0; s.stageCrashes = 0; s.policeEscapes = 0;
    s.callout = ''; s.calloutTimer = 0;
    s.input = { throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false };
    s.stageTimeSec = 0;
    s.racePenaltySec = 0; s.lap = s.currentLap = 1; s.completedLaps = 0; s.lapsTotal = this.course.def.laps || 1;
    s.lapTimeSec = 0; s.lapTimes = []; s.lapStartedAt = 0; s.nextLapGate = 0; s.assistedLaps = []; s.assistedLap = false;
    const stunt = this.course.def.stuntTrial, drift = this.course.def.driftTrial, rush = this.course.def.checkpointRush;
    s.timeLimitSec = rush?.initialTimeSec[s.cpuDifficulty] || drift?.timeLimitSec[s.cpuDifficulty] || stunt?.timeLimitSec[s.cpuDifficulty] || this.course.def.chaseTimeLimit?.[s.cpuDifficulty] || null;
    s.timeRemaining = s.timeLimitSec;
    s.objective = rush ? { kind: 'checkpointRush', targetCheckpoints: this.course.features.rushGates.length*s.lapsTotal, timeLimitSec: s.timeLimitSec } : drift ? { kind: 'driftTrial', targetScore: drift.targets[s.cpuDifficulty], timeLimitSec: s.timeLimitSec } :
      stunt ? { kind: 'stuntTrial', targetJumps: stunt.jumps, targetCrushes: stunt.crushes, timeLimitSec: s.timeLimitSec } : null;
    s.drift = drift ? createDriftState({ lapLength: this.course.length, laps: s.lapsTotal }) : null;
    s.checkpointRush = rush ? {passed:0,total:this.course.features.rushGates.length*s.lapsTotal,nextGate:0,missed:0,lastEvent:null,initialTimeSec:s.timeLimitSec,extensionSec:rush.extensionSec[s.cpuDifficulty]} : null;
    s.parTimeSec = this._parTime();
    if (s.practice) { s.timeLimitSec = s.timeRemaining = s.parTimeSec = s.objective = s.drift = s.checkpointRush = null; }
    s.police = { beep: 0, triggered: false, pursuit: null, ticket: null, ticketCount: 0, pendingFines: 0 };
    if (s.mode !== 'wasteland' && this.course.def.kind === 'chase') s.police.pursuit = this._newPursuit(260);
    s.results = null;
    s.lastCrashReason = null;
    s.crashFlash = 0;
    s.countdown = 3;
    s.status = 'countdown';
    // rival
    const rivalSettings=s.rivalSettings;
    const rivalCar=rivalSettings?.car&&rivalSettings.car!=='match'?rivalSettings.car:s.car;
    const rivalLevels=Object.fromEntries(UPGRADE_KEYS.map(key=>[key,CARS[rivalCar].factoryMaxed?3:rivalSettings?.upgradeLevel||0]));
    this.rivalSpec=rivalSettings?applyDriverModifiers(upgradedCar(CARS[rivalCar],rivalLevels),rivalSettings.driverId,rivalCar):CARS[s.car];
    s.rival = (!s.practice && COURSE[idx].hasRival && s.mode !== 'timetrial')
      ? { car:rivalCar,driverId:rivalSettings?.driverId||DEFAULT_DRIVER,upgrades:rivalLevels,s: this.course.rivalStartS, lateral: -DRIVE.laneOffset, speedMph: 0, finished: false, finishTime: null,
        headingError: 0, yawVelocity: 0, pushVelocity: 0, offRoad: false, contactCooldown: 0, boost:1, boosting:false,
        damageZones: freshDamageZones(), damageCooldown: 0,
        airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0, _jumpOrigin: null,
        completedLaps: 0, nextLapGate: 0, lapTimes: [], lapStartedAt: 0 }
      : null;
    // pre-spawn deterministic two-way traffic
    s.traffic = this._spawnTraffic(idx);
    s.combat=s.mode==='wasteland'&&supportsCombat(COURSE[idx])?createCombat(s.weaponLevels):null;
    this.emit({ stageLoaded: idx, countdown: 3 });
  }

  _spawnTraffic(idx) {
    const def = COURSE[idx];
    if (def.practice || ['arena','drift','checkpoint'].includes(def.kind)) return [];
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
        alive: true, damageZones: freshDamageZones(), damageCooldown: 0,
      });
    }
    return cars;
  }

  // ---- the core step ---------------------------------------------------
  fireWeapon(weapon){return fireWeapon(this,weapon);}

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
    stepCombat(this,dt);
    for (const actor of [s.rival, s.police.pursuit, ...s.traffic]) {
      if (actor?.damageCooldown > 0) actor.damageCooldown = Math.max(0, actor.damageCooldown - dt);
    }
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
    s.prevGroundHeight = s.groundHeight;
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
    const boostTopSpeed = BOOST.topSpeedMult + nitro * .025 + (car.nitroSpeedBonus ?? 0);
    if(s.practice)s.boost=1;
    s.boosting = !!s.input.boost && s.boost > 0 && s.gear>=0 && s.speedMph >= (s.practice?0:BOOST.minSpeedMph) && surface.boostAllowed && s.input.brake === 0;
    if (s.boosting) {
      const available = Math.min(1, s.boost / (boostDrain * dt));
      s.boost = s.practice?1:Math.max(0, s.boost - boostDrain * dt);
      const boostCeiling = d.autoShift ? car.topSpeed * boostTopSpeed : Math.min(car.topSpeed * boostTopSpeed, gearMax * DRIVE.gearCeilFrac);
      s.speedMph += Math.max(0, Math.min(boostCeiling - s.speedMph, BOOST.accelMphPerSec * (1 + nitro * .15) * (car.nitroAcceleration ?? 1) * dt * available));
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
    const freeHeading = this.course.def.practice || offroadCapability(car) && (!surface.road || Math.abs(s.headingError) > 1.45);
    if (freeHeading) {
      const heading = frame.heading + s.headingError + s.yawVelocity * dt;
      const old = this.course.worldAt(s.s, s.lateral);
      const pose = this._roadPosition({ x: old.x + Math.sin(heading) * metresPerSec * dt + Math.cos(frame.heading) * s.pushVelocity * dt,
        z: old.z + Math.cos(heading) * metresPerSec * dt - Math.sin(frame.heading) * s.pushVelocity * dt }, s.s);
      s.s = pose.s; s.lateral = pose.lateral;
      s.headingError = wrapHeading(heading - this.course.at(s.s).heading);
    } else {
      const forward = Math.max(0, Math.cos(s.headingError)) * metresPerSec * dt;
      // Inside a bend, a metre of physical travel covers more centreline progress.
      // This makes a real dirt shortcut quicker without a scripted progress jump.
      const progress = forward / Math.max(.25, 1 - frame.curvature * s.lateral);
      s.headingError += s.yawVelocity * dt - frame.curvature * progress;
      s.headingError = Math.max(-1.45, Math.min(1.45, s.headingError));
      s.lateral += (Math.sin(s.headingError) * metresPerSec + s.pushVelocity) * dt;
      s.s += progress;
    }
    s.pushVelocity *= Math.exp(-2.4 * dt);
    this._offroadStep(dt, !surface.road);
    s.offRoad = !this._surface(s.s, s.lateral).mainRoad;
    // Dirt alone never consumes a life or structural hit. Only contact does.
    this._boundary(s);
  }

  _traffic(dt) {
    const s = this.state;
    for (const c of s.traffic) {
      if (!c.alive || c.crushed) continue;
      c.prevS = c.s;
      c.prevLateral = c.lateral;
      c.prevAirHeight = c.airHeight || 0;
      c.cruiseSpeedMph ??= Math.max(0, c.speedMph);
      const yieldPlan = this._npcYield(c, c.cruiseSpeedMph);
      c.braking = c.speedMph > yieldPlan.targetMph;
      c.speedMph += clamp(yieldPlan.targetMph - c.speedMph, -yieldPlan.braking * dt, 18 * dt);
      if (Number.isFinite(c.lateral)) {
        c.lateral += (c.pushVelocity || 0) * dt;
        c.pushVelocity = (c.pushVelocity || 0) * Math.exp(-1.5 * dt);
        const lane = c.dir < 0 ? DRIVE.laneOffset : -DRIVE.laneOffset;
        const laneStep = c.yieldingToPlayer && c.speedMph < .1 ? 0 : clamp(lane - c.lateral, -dt * .7, dt * .7);
        c.lateral += laneStep;
        // Traffic follows a road-relative lane path, unlike the free-steering
        // rival. A contact yaw must recover toward that path instead of leaving
        // a permanently diagonal collision shell travelling straight ahead.
        // Include direction for oncoming lane recovery; don't pivot a stopped
        // shell into a player while waiting for the road to clear.
        const along = (c.dir || 1) * Math.max(1, c.speedMph * DRIVE.mphToWorld);
        const headingTarget = Math.atan((dt > 0 ? laneStep / dt : 0) / along);
        const turn = .95 * Math.min(1, c.speedMph / 12) * dt;
        c.headingError = (c.headingError || 0) + clamp(headingTarget - (c.headingError || 0), -turn, turn);
        if (!this._surface(c.s, c.lateral).road) c.speedMph *= Math.exp(-DRIVE.offRoadScrub * dt);
      }
      c.s += c.dir * c.speedMph * DRIVE.mphToWorld * dt;
      c.contactCooldown = Math.max(0, (c.contactCooldown || 0) - dt);
      if (Number.isFinite(c.lateral)) { this._jump(c, dt); this._staticContacts(c, false); this._boundary(c); }
    }
  }

  _collisions() {
    const s = this.state;
    this._staticContacts(s, true);
    if (s.rival) this._vehicleContact(s, s.rival, 'rival');
    for (const c of s.traffic) {
      if (!c.alive || c.crushed) continue;
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
        if (!this.course.def.practice && !c.crushed && s.invulnerableSec <= 0 && clearance >= TRAFFIC.collideLatU && clearance < TRAFFIC.nearMissLatU && s.speedMph >= TRAFFIC.nearMissMinMph) {
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

  _supportAt(distance, lateral, actor = this.state) {
    const ground = this.course.groundAt(distance, lateral);
    const capability = actor === this.state ? offroadCapability(this.car) : null;
    if (!capability) return ground;
    if (this.course.features.mountains?.length) {
      const mountain = sampleMountainSupport(this.course, ground.x, ground.z);
      if (mountain != null) ground.y = Math.max(ground.y, mountain);
    }
    for (const obstacle of this._obstacles(distance - 5, distance + 5)) {
      const height = rockSupportHeight(obstacle, ground.x, ground.z, capability);
      if (height != null) ground.y = Math.max(ground.y, height);
    }
    for (const wreck of this._crushedVehicles || []) {
      const height = crushedVehicleSupport(wreck, ground.x, ground.z, this._vehicleSpec(actor).halfLength);
      if (height != null) ground.y = Math.max(ground.y, height);
    }
    return ground;
  }

  _terrainPose(actor = this.state) {
    if (actor !== this.state || !offroadCapability(this.car)) return;
    const point = this._supportAt(actor.s, actor.lateral), spec = this._vehicleSpec(actor);
    const heading = this.course.at(actor.s).heading + actor.headingError;
    const sample = (forward, side) => {
      const pose = this._roadPosition({ x: point.x + Math.sin(heading) * forward + Math.cos(heading) * side,
        z: point.z + Math.cos(heading) * forward - Math.sin(heading) * side }, actor.s);
      return this._supportAt(pose.s, pose.lateral).y;
    };
    const attitude = terrainAttitude(sample(spec.halfLength, 0), sample(-spec.halfLength, 0), sample(0, spec.halfWidth), sample(0, -spec.halfWidth), spec.halfLength, spec.halfWidth);
    actor.groundHeight = point.y;
    actor.terrainPitch = attitude.pitch; actor.terrainRoll = attitude.roll;
  }

  _offroadStep(dt, offPreparedRoute) {
    const s = this.state, capability = offroadCapability(this.car);
    if (!capability || s.tumble) return;
    const before = this._supportAt(s.prevS, s.prevLateral), after = this._supportAt(s.s, s.lateral);
    if (![before.y, after.y, s.s, s.lateral].every(Number.isFinite)) {
      s.s = Number.isFinite(s.prevS) ? s.prevS : 0; s.lateral = Number.isFinite(s.prevLateral) ? s.prevLateral : 0;
      this._safeReset(s); this._callout('TERRAIN RESCUE  /  INVALID POSITION', 2); this.emit({ terrainRescue: true }); return;
    }
    if ((!s.airborne || after.y > (s._jumpY ?? after.y)) && offPreparedRoute) {
      const gain = after.y - before.y, distance = Math.hypot(after.x - before.x, after.z - before.z);
      const limit = limitClimb({ gain, distance, dt, capability, accumulated: s._climbGain || 0 });
      if (limit.tipped) {
        s.s = s.prevS; s.lateral = s.prevLateral;
        this._terrainPose(); this._startTumble('climb_limit'); return;
      }
      if (limit.fraction < 1) {
        // Re-sample the shortened path rather than setting a free-floating Y.
        // Bisection also bounds a nonlinear or abrupt support surface.
        let low = 0, high = 1;
        for (let i = 0; i < 12; i++) {
          const t = (low + high) * .5;
          const pose = this._roadPosition({ x: before.x + (after.x - before.x) * t, z: before.z + (after.z - before.z) * t }, s.prevS);
          if (this._supportAt(pose.s, pose.lateral).y - before.y <= capability.risePerSec * dt) low = t; else high = t;
        }
        const pose = this._roadPosition({ x: before.x + (after.x - before.x) * low, z: before.z + (after.z - before.z) * low }, s.prevS);
        s.s = pose.s; s.lateral = pose.lateral; s.speedMph *= low;
      }
      const actualGain = this._supportAt(s.s, s.lateral).y - before.y;
      s._climbGain = (s._climbGain || 0) + Math.max(0, actualGain);
      // Traversing sideways across a steep face is not a fresh climb. Reset
      // only on genuinely gentle support, not just a zero-rise driving vector.
      const supportGrade = Math.hypot(Math.tan(s.terrainPitch || 0), Math.tan(s.terrainRoll || 0));
      s._climbRest = gain <= distance * .06 && supportGrade < .25 ? (s._climbRest || 0) + dt : 0;
      if (s._climbRest > .7) s._climbGain = 0;
      if (Math.abs(gain) <= distance * .25 && s._climbGain < 1) s._offroadSafe = { s: s.prevS, lateral: s.prevLateral };
    } else if (!s.airborne) {
      s._climbGain = 0; s._climbRest = 0; s._offroadSafe = { s: s.prevS, lateral: s.prevLateral };
    }
    this._terrainPose();
  }

  _startTumble(reason) {
    const s = this.state;
    if (s.tumble || s.impactTimer > 0 || s.status !== 'racing' || s.combat?.shield>0) return;
    const pitch = s.terrainPitch || 0, safe = s._offroadSafe, travelSign = s.speedMph < 0 ? -1 : 1;
    this._crash('rollover', Math.sign(s.terrainRoll) || 1, Math.max(30, Math.abs(s.speedMph)), 'rear');
    s.rollovers++;
    s.tumble = { elapsed: 0, duration: 2.2, direction: s.impactSide, reason, initialPitch: pitch, safe, travelSign,
      heading: this.course.at(s.s).heading + s.headingError + (travelSign < 0 ? Math.PI : 0) };
    s.impactTimer = s.impactDuration = s.tumble.duration; s.crashSpin = 0;
    s.airborne = false; s.airHeight = 0; s._jumpY = null; s._jumpOrigin = null;
    s.airDistance = 0; s.airTime = 0; s._airOrigin = null;
    s.speedMph = 0; s.boosting = false;
    this._callout('CLIMB LIMIT  /  ROLLING BACK', 2.2);
    this.emit({ rollover: { reason } });
  }

  _rollover(dt) {
    const s = this.state, tumble = s.tumble;
    s.prevS = s.s; s.prevLateral = s.lateral;
    tumble.elapsed = Math.min(tumble.duration, tumble.elapsed + dt);
    const point = this.course.worldAt(s.s, s.lateral), retreat = 2.1 * dt;
    const pose = this._roadPosition({ x: point.x - Math.sin(tumble.heading) * retreat, z: point.z - Math.cos(tumble.heading) * retreat }, s.s);
    const next = this._supportAt(pose.s, pose.lateral), current = this._supportAt(s.s, s.lateral);
    const capability = offroadCapability(this.car), spec = this._vehicleSpec(s);
    const blocked = this._obstacles(s.s, pose.s).some(obstacle => {
      if (obstacle.kind === 'rock' && rockHeight(obstacle) <= capability.rockHeight
        || obstacle.kind === 'mountain' && !obstacle.tunnelCover && this.course.features.mountains?.includes(obstacle)
        || obstacle.kind === 'tree' && this._fallenCactusIds?.has(obstacle.id)) return false;
      const hit = sweepObstacle(current, next, obstacle, tumble.heading, spec);
      return hit && (!hit.inside || (next.x - current.x) * hit.nx + (next.z - current.z) * hit.nz < 0);
    });
    // Roll downhill, never through a steeper surface behind the truck.
    if (!blocked && next.y <= current.y + .08) { s.s = pose.s; s.lateral = pose.lateral; }
    const attitude = tumbleAttitude(tumble.elapsed, tumble.duration, tumble.direction, tumble.initialPitch, tumble.travelSign);
    s.groundHeight = this._supportAt(s.s, s.lateral).y + attitude.lift;
    s.terrainPitch = attitude.pitch; s.terrainRoll = attitude.roll; s.impactTimer = Math.max(0, tumble.duration - tumble.elapsed);
    if (s.impactTimer > 1e-9) return;
    this._safeReset(s,s.crashSite||{s:s.s,lateral:s.lateral,headingError:s.headingError});
    s.crashSite=null;
    s.tumble = null; s.impactTimer = 0; s.crashSpin = 0; s._climbGain = 0; s._climbRest = 0;
    this._terrainPose(); this._callout('RECOVERED  /  TRY A GENTLER LINE', 2); this.emit({ recovered: true });
  }

  _staticContacts(car, player) {
    if (car.crushed || car.tumble) return;
    const oldS = car.prevS ?? car.s, oldLateral = car.prevLateral ?? car.lateral;
    let start = this.course.worldAt(oldS, oldLateral), end = this.course.worldAt(car.s, car.lateral);
    if (![start.x, start.z, end.x, end.z].every(Number.isFinite)) return;
    if (car.airborne || car.airHeight > 0 || car.prevAirHeight > 0 || car.groundHeight != null) {
      start.y = (car.prevGroundHeight ?? this.course.groundAt(oldS, oldLateral).y) + (car.prevAirHeight ?? car.airHeight ?? 0);
      end.y = (car.groundHeight ?? this.course.groundAt(car.s, car.lateral).y) + (car.airHeight || 0);
    } else {
      // Grounded cars keep the established horizontal contact rules; only
      // airborne vehicles need extra terrain samples and vertical clearance.
      start.y = end.y = undefined;
    }
    const travelHeading = this.course.at(car.s).heading + (car.headingError || 0) + (car.dir < 0 ? Math.PI : 0);
    const heading = travelHeading + (car.slipAngle || 0);
    const obstacles = this._obstacles(oldS, car.s);
    const dimensions = this._vehicleSpec(car);
    const capability = player ? offroadCapability(this.car) : null;
    for (let attempt = 0; attempt < 4; attempt++) {
      let first = null;
      for (const obstacle of obstacles) {
        if (capability && (obstacle.kind === 'rock' && rockHeight(obstacle) <= capability.rockHeight
          || obstacle.kind === 'mountain' && !obstacle.tunnelCover && this.course.features.mountains?.includes(obstacle))) continue;
        const cactus = obstacle.kind === 'tree' && obstacle.theme === 'desert';
        if (cactus && this._fallenCactusIds?.has(obstacle.id)) continue;
        // Unlike a solid tree, a cactus can be cleared by a jump and gives way
        // on contact. Keep the course's reusable scenery data immutable.
        const collider = cactus && Number.isFinite(start.y)
          ? { ...obstacle, height: 3.1 * (obstacle.scale || 1) } : obstacle;
        const hit = sweepObstacle(start, end, collider, heading, dimensions);
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
      // A shallow hit on a continuous rail/lining is a sliding scrape, not a
      // crash. Measure incidence against the actual contacted face: striking
      // a rail end remains head-on. Signed reverse travel and sideways pushes
      // count too; body yaw alone cannot turn a sharp impact into a safe one.
      const velocityX = Math.sin(travelHeading) * car.speedMph * DRIVE.mphToWorld + Math.cos(roadHeading) * (car.pushVelocity || 0);
      const velocityZ = Math.cos(travelHeading) * car.speedMph * DRIVE.mphToWorld - Math.sin(roadHeading) * (car.pushVelocity || 0);
      const normalFraction = Math.max(0, -(velocityX * nx + velocityZ * nz)) / Math.max(.000001, Math.hypot(velocityX, velocityZ));
      const glancingWall = !obstacle.arenaWall && (obstacle.tunnelWall || obstacle.barrier) && normalFraction < GLANCING_WALL_NORMAL_FRACTION - 1e-10;
      const zone = contactZone(nx, nz, heading);
      if (capability && obstacle.kind === 'rock' && rockHeight(obstacle) > capability.rockHeight && impactMph >= capability.tipSpeed) {
        car.s = oldS; car.lateral = oldLateral;
        this._terrainPose(); this._startTumble('oversized_rock'); return;
      }
      if (obstacle.kind === 'tree' && obstacle.theme === 'desert') {
        const distance = Math.hypot(dx, dz);
        const fallen = { id: obstacle.id, atTime: this.state.stageTimeSec,
          directionX: distance > .0001 ? dx / distance : -nx,
          directionZ: distance > .0001 ? dz / distance : -nz };
        (this._fallenCactusIds ??= new Set()).add(obstacle.id);
        this.state.fallenCacti.push(fallen);
        car.speedMph *= .92;
        if (player && this.state.invulnerableSec <= 0 && impactMph > 1) this._scrape(zone, Math.min(impactMph, 12));
        this.emit({ cactusHit: fallen });
        // Search the same sweep again: a wall behind the cactus remains solid.
        // Each pass removes one cactus, so this cannot loop on the same plant.
        attempt--;
        continue;
      }
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
        if (impactMph >= 28 && !glancingWall) this._crash(obstacle.kind || 'rock', Math.sign(nx), impactMph, zone);
        else if (impactMph > 4) this._scrape(zone, impactMph);
      }
      car.speedMph *= Math.max(.08, 1 - incoming * .94);
      if (!player) { car.contactCooldown = 1.2; car.headingError = clamp((car.headingError || 0) - Math.sign(car.lateral) * .25, -.65, .65); }
    }
    car.offRoad = !this._surface(car.s, car.lateral).mainRoad;
  }

  _vehicleContact(a, b, reason) {
    if (a.crushed || b.crushed || a.tumble || b.tumble) return false;
    if (b === this.state && a !== this.state) return this._vehicleContact(b, a, reason);
    const phase = this.relativeS(b.s, a.s) - b.s;
    const start = { x: (a.prevLateral ?? a.lateral) - (b.prevLateral ?? b.lateral), z: (a.prevS ?? a.s) - (b.prevS ?? b.s) - phase };
    const end = { x: a.lateral - b.lateral, z: a.s - b.s - phase };
    // A road-aligned envelope is intentionally a little generous to avoid
    // the visible cars interpenetrating while their bodies drift.
    const angleA = (a.headingError || 0) + (a.slipAngle || 0), angleB = (b.headingError || 0) + (b.slipAngle || 0);
    const specA = this._vehicleSpec(a), specB = this._vehicleSpec(b);
    if (a.airborne || b.airborne || a.groundHeight != null || b.groundHeight != null) {
      const heightA = (a.groundHeight ?? this.course.groundAt(a.s, a.lateral).y) + (a.airHeight || 0), heightB = (b.groundHeight ?? this.course.groundAt(b.s, b.lateral).y) + (b.airHeight || 0);
      if (heightA > heightB + specB.height || heightB > heightA + specA.height) return false;
    }
    const { width, length } = vehicleContactEnvelope(a, b, specA, specB);
    const hit = sweepBox(start, end, width, length);
    if (!hit) return false;
    const descendingCrush = a === this.state && a.airborne && a._verticalSpeed < -1 && (a.prevAirHeight || 0) > (a.airHeight || 0)
      && canCrushVehicle(this.car, specB, { descending: true });
    const yieldNormal = a === this.state && !descendingCrush ? npcYieldContactNormal(a, b, hit, start.z) : null;
    if (yieldNormal) {
      // A late cut-in or numerical overlap is not permission for an NPC to
      // damage/shove the player. Rewind only that NPC to the contact side.
      const { nx, nz } = yieldNormal;
      const correction = Math.max(0, nx ? width + .08 - end.x * nx : length + .08 - end.z * nz);
      const proposed = { s: b.s - nz * correction, lateral: b.lateral - nx * correction };
      const previous = { s: b.prevS ?? b.s, lateral: b.prevLateral ?? b.lateral };
      const previousPoint = this.course.worldAt(previous.s, previous.lateral);
      const clear = pose => {
        if (Math.abs(a.lateral - pose.lateral) < width + .04 && Math.abs(this.relativeS(pose.s, a.s) - a.s) < length + .04) return false;
        const point = this.course.worldAt(pose.s, pose.lateral), heading = this.course.at(pose.s).heading + angleB + (b.dir < 0 ? Math.PI : 0);
        return !this._obstacles(Math.min(previous.s, pose.s) - specB.halfLength, Math.max(previous.s, pose.s) + specB.halfLength).some(obstacle =>
          !(obstacle.kind === 'tree' && obstacle.theme === 'desert' && this._fallenCactusIds?.has(obstacle.id))
          && sweepObstacle(previousPoint, point, obstacle, heading, specB));
      };
      let safe = clear(proposed) ? proposed : null;
      if (!safe) {
        if (clear(previous)) safe = previous;
        else for (const back of [length + .8, 12, 24, 40]) {
          const retreat = { s: this.relativeS(a.s, b.s) - (b.dir || 1) * back, lateral: previous.lateral };
          if (clear(retreat)) { safe = retreat; break; }
        }
      }
      // If a pathological cut-in leaves no clear local retreat, hold the last
      // pre-movement pose. Do not teleport across scenery or reset near player.
      b.s = (safe || previous).s; b.lateral = (safe || previous).lateral;
      const playerAlong = a.speedMph * Math.cos(a.headingError || 0) * (b.dir || 1);
      b.speedMph = nx || !safe ? 0 : Math.min(b.speedMph, Math.max(0, playerAlong) * .9);
      b.pushVelocity = 0; b.braking = true; b.yieldingToPlayer = true;
      b.contactCooldown = Math.max(b.contactCooldown || 0, .45);
      b.prevS = b.s; b.prevLateral = b.lateral;
      b.offRoad = !this._surface(b.s, b.lateral).mainRoad;
      return true;
    }
    if (a === this.state || b === this.state) this._breakDrift('hit');
    const { nx, nz } = hit;
    const vaX = Math.sin(a.headingError || 0) * a.speedMph * (a.dir || 1) * DRIVE.mphToWorld + (a.pushVelocity || 0);
    const vbX = Math.sin(b.headingError || 0) * b.speedMph * (b.dir || 1) * DRIVE.mphToWorld + (b.pushVelocity || 0);
    const vaZ = a.speedMph * Math.cos(a.headingError || 0) * (a.dir || 1), vbZ = b.speedMph * Math.cos(b.headingError || 0) * (b.dir || 1);
    const impactMph = Math.max(0, -(vaX - vbX) / DRIVE.mphToWorld * nx - (vaZ - vbZ) * nz);
    if (a === this.state && canCrushVehicle(this.car, specB, { speedMph: a.speedMph, impactMph, descending: descendingCrush })) {
      this._crushVehicle(b, reason, impactMph); return true;
    }
    const armoredPlayer = a === this.state && this.state.mode === 'wasteland';
    const crashThreshold = armoredPlayer ? combatCrashThresholdMph(this.car, { targetMass: specB.mass }) : 28;
    const rearRam = armoredPlayer && b === this.state.rival && nz < 0 && (b.dir || 1) > 0 && a.speedMph >= 0;
    const zone = contactZone(nx, nz, angleA + (a.dir < 0 ? Math.PI : 0));
    const zoneB = contactZone(-nx, -nz, angleB + (b.dir < 0 ? Math.PI : 0));
    if (a !== this.state) this._dentVehicle(a, zone, impactMph);
    if (b !== this.state) this._dentVehicle(b, zoneB, impactMph);
    // Share the positional correction. Even a protected car remains solid.
    const required = nx ? width + .04 - (a.lateral - b.lateral) * nx : length + .04 - end.z * nz;
    const correction = Math.max(0, required);
    const shareA = specB.mass / (specA.mass + specB.mass), shareB = 1 - shareA;
    a.lateral += nx * correction * shareA; b.lateral -= nx * correction * shareB;
    a.s += nz * correction * shareA; b.s -= nz * correction * shareB;
    if (nx) {
      const shove = clamp(2.5 + impactMph * DRIVE.mphToWorld * .62, 2.5, armoredPlayer ? 28 : 13);
      const pushLimit = armoredPlayer ? 32 : 16;
      a.pushVelocity = clamp((a.pushVelocity || 0) + nx * shove * .6 * shareA, -pushLimit, pushLimit);
      b.pushVelocity = clamp((b.pushVelocity || 0) - nx * shove * 2 * shareB, -pushLimit, pushLimit);
      b.headingError = clamp((b.headingError || 0) - nx * (armoredPlayer ? .07 + Math.min(.16, impactMph / 500) : .07), -.8, .8);
      if (armoredPlayer && b === this.state.rival) b.ramRecoverySec = Math.max(b.ramRecoverySec || 0, clamp(.35 + impactMph / 250, .35, 1.1));
      a.speedMph *= .992; b.speedMph *= .985;
      if (a === this.state && this.state.invulnerableSec <= 0) {
        if (armoredPlayer && impactMph >= crashThreshold) this._crash(reason, Math.sign(a.lateral - b.lateral), impactMph, zone);
        else if (impactMph > 1) this._scrape(zone, impactMph);
      }
    } else if (impactMph > 0 || rearRam && Math.abs(a.input?.steer || 0) > .1) {
      const backingPlayer = a === this.state && a.speedMph < 0;
      if (rearRam) {
        const ram = rearRamResponse({ closingMph: impactMph, attackerMph: a.speedMph,
          attackerMass: specA.mass, targetMass: specB.mass, steer: a.input?.steer || 0, offset: b.lateral - a.lateral });
        a.speedMph = Math.max(0, a.speedMph - ram.attackerLossMph);
        b.speedMph = Math.max(0, b.speedMph + ram.targetGainMph);
        b.pushVelocity = clamp((b.pushVelocity || 0) + ram.lateralKick, -32, 32);
        b.headingError = clamp((b.headingError || 0) + Math.sign(ram.lateralKick) * Math.min(.3, Math.abs(ram.lateralKick) * .014), -.8, .8);
        b.ramRecoverySec = Math.max(b.ramRecoverySec || 0, clamp(.4 + impactMph / 230, .4, 1.2));
        if (ram.launchMps > 0) {
          b._ramVerticalSpeed = Math.max(b._ramVerticalSpeed || 0, ram.launchMps);
          b.airborne = true; b.airHeight = Math.max(b.airHeight || 0, .03);
        }
        this.emit({ vehicleRam: true, victim: 'rival', impactMph, lateralKick: ram.lateralKick, launched: ram.launchMps > 0 });
      } else {
        const momentum = (vaZ * specA.mass + vbZ * specB.mass) / (specA.mass + specB.mass);
        const combined = backingPlayer ? momentum : Math.max(0, momentum);
        a.speedMph = (a.dir || 1) > 0 ? combined : Math.abs(combined);
        b.speedMph = backingPlayer ? Math.max(0, combined * (b.dir || 1)) : (b.dir || 1) > 0 ? combined : Math.abs(combined);
      }
      if (a === this.state && this.state.invulnerableSec <= 0 && impactMph >= crashThreshold) this._crash(reason, Math.sign(a.lateral - b.lateral), impactMph, zone);
      else if (a === this.state && this.state.invulnerableSec <= 0 && impactMph > 1) this._scrape(zone, impactMph);
    }
    a.offRoad = !this._surface(a.s, a.lateral).mainRoad;
    b.offRoad = !this._surface(b.s, b.lateral).mainRoad;
    b.contactCooldown = Math.max(b.contactCooldown || 0, .8);
    return true;
  }

  _scrape(zone, impactMph) {
    const s = this.state;
    if (s.damageCooldown > 0 || s.impactTimer > 0 || s.combat?.shield>0) return;
    s.damageZones[zone] = Math.min(5, s.damageZones[zone] + clamp(impactMph / 100, .08, .3));
    s.damageCooldown = .65;
    this.emit({ scrape: true, zone, strength: clamp(impactMph / 80, .1, .5) });
  }

  _crushVehicle(actor, reason, impactMph) {
    if (actor.crushed || (actor===this.state?this.state.combat?.shield:this.state.combat?.rivalShield)>0) return;
    const s = this.state, point = this.course.groundAt(actor.s, actor.lateral);
    actor.crushed = true; actor.crushDamage = clamp(.65 + impactMph / 160, .65, 1);
    actor.speedMph = 0; actor.pushVelocity = 0; actor.braking = true;
    actor.airborne = false; actor.airHeight = 0; actor._jumpY = null; actor._verticalSpeed = 0; actor._jumpOrigin = null;
    actor.damageZones = { front: 5, rear: 5, left: 5, right: 5 };
    const spec = this._vehicleSpec(actor);
    (this._crushedVehicles ??= []).push({ x: point.x, y: point.y, z: point.z, heading: point.heading + (actor.headingError || 0),
      halfWidth: spec.halfWidth, halfLength: spec.halfLength, height: 1.55 - .76 * actor.crushDamage });
    s.speedMph *= .84;
    const burst = { id: `vehicle-${reason}-${s.stageTimeSec}`, byPlayer: true, x: point.x, y: point.y, z: point.z,
      s: actor.s, off: actor.lateral, strength: actor.crushDamage, serial: (s.crushBurst?.serial || 0) + 1 };
    s.crushBurst = burst;
    // Wrecking an opponent is not a respawning score/credit source or an
    // authored stunt objective. Keep the wreck visible for this whole stage.
    this._callout('VEHICLE CRUSHED', 1.8);
    this.emit({ vehicleCrushed: { ...burst, actor, reason } });
  }

  _dentVehicle(actor, zone, impactMph) {
    if (impactMph <= 1 || actor.damageCooldown > 0 || (actor===this.state?this.state.combat?.shield:this.state.combat?.rivalShield)>0) return;
    actor.damageZones ??= freshDamageZones();
    actor.damageZones[zone] = Math.min(5, actor.damageZones[zone] + clamp(impactMph / 100, .18, 1));
    actor.damageCooldown = .65;
  }

  _boundary(car) {
    if (car.crushed || car === this.state && (offroadCapability(this.car) || this.course.def.practice)) {
      if (car === this.state) car.boundaryWarning = false;
      return;
    }
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

  _practiceRecoveryPose(car, others, crashSite = null) {
    const actor=car;
    car=crashSite?{...car,...crashSite}:car;
    const origin = this.course.worldAt(car.s, car.lateral), heading = origin.heading + (car.headingError || 0);
    const spec = this._vehicleSpec(actor), capability = actor === this.state ? offroadCapability(this.car) : null;
    // Freestyle has no validated lap interval. Search a bounded physical area
    // around the impact instead of wrapping/clamping to a distant road gate.
    for (const radius of crashSite ? [0, 2, 4, 8, 12] : [0, 4, 8, 12, 20, 32, 48]) for (let spoke = 0; spoke < (radius ? 16 : 1); spoke++) {
      const angle = heading + Math.PI + spoke * Math.PI / 8;
      const pose = radius ? this._roadPosition({ x: origin.x + Math.sin(angle) * radius, z: origin.z + Math.cos(angle) * radius }, car.s)
        : { s: car.s, lateral: car.lateral };
      const point = this._supportAt(pose.s, pose.lateral, actor);
      if (![pose.s, pose.lateral, point.x, point.y, point.z].every(Number.isFinite)
        || Math.hypot(point.x - origin.x, point.z - origin.z) > (crashSite?12.1:48.1)) continue;
      if (others.some(other => {
        if (other.crushed) return false;
        const otherPoint = this.course.worldAt(other.s, other.lateral), otherSpec = this._vehicleSpec(other);
        return sweepObstacle(point, point, { ...otherPoint, halfX: otherSpec.halfWidth + .5, halfZ: otherSpec.halfLength + .5,
          heading: otherPoint.heading + (other.headingError || 0) }, heading, spec);
      })) continue;
      if (this._obstacles(pose.s - 5, pose.s + 5).some(obstacle => {
        if (capability && (obstacle.kind === 'rock' && rockHeight(obstacle) <= capability.rockHeight
          || obstacle.kind === 'mountain' && !obstacle.tunnelCover && this.course.features.mountains?.includes(obstacle))) return false;
        if (obstacle.kind === 'tree' && this._fallenCactusIds?.has(obstacle.id)) return false;
        return sweepObstacle(point, point, obstacle, heading, spec);
      })) continue;
      return { ...pose, headingError: wrapHeading(heading - this.course.at(pose.s).heading) };
    }
    // A fully enclosed area is not permission for a long-distance teleport.
    // Retain the impact position; normal solid resolution still applies.
    return { s: car.s, lateral: car.lateral, headingError: car.headingError || 0 };
  }

  _safeReset(car, crashSite = null) {
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
    const practice = this.course.def.practice === true;
    const local = practice || !!crashSite;
    let chosen = local ? this._practiceRecoveryPose(car, others, crashSite) : { s: clamp(car.s, lowerBound, upperBound), lateral: 0 };
    search: for (const back of local ? [] : [0, 10, 22, 40, 70, 110]) {
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
    car.headingError = local ? chosen.headingError : 0; car.yawVelocity = 0; car.pushVelocity = 0; car.slipAngle = 0; car.drifting = false;
    car.offRoad = false; car.offRoadTime = 0; car.roughness = 0; car.boosting = false;
    car.steerVisual = 0;
    car.routeId = null; car.routeLap = null; this._npcRoutePlanner?.reset(car);
    car.airborne = false; car.airHeight = 0; car.prevAirHeight = 0; car._jumpY = null; car._verticalSpeed = 0; car._jumpOrigin = null;
    car.airDistance = 0; car.airTime = 0; car._airOrigin = null;
    car.groundHeight = null; car.prevGroundHeight = null; car.terrainPitch = null; car.terrainRoll = null; car.tumble = null;
    car._climbGain = 0; car._climbRest = 0; car._offroadSafe = null;
    if (car === this.state) { car.gear = 0; car.revs = car.speedMph / this.car.gears[0]; car.overrevSec = 0; car.reverseHoldSec = 0; }
    if (local) {car.offRoad=!this._surface(car.s,car.lateral).road;this._terrainPose(car);}
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
      damageZones: freshDamageZones(), damageCooldown: 0,
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
    cruiser.prevAirHeight = cruiser.airHeight || 0;
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
    if (r.crushed) return;
    r.prevS = r.s; r.prevLateral = r.lateral;
    r.prevAirHeight = r.airHeight || 0;
    if (r.finished) {
      r.braking = r.speedMph > 0;
      const nextSpeed = Math.max(0, r.speedMph - DRIVE.brakeAccel * dt), plan = this._npcYield(r, nextSpeed);
      r.speedMph = plan.yielding ? Math.max(plan.targetMph, r.speedMph - plan.braking * dt) : nextSpeed;
      r.s += r.speedMph * DRIVE.mphToWorld * dt;
      if (!this._ramFlight(r, dt)) this._jump(r, dt);
      this._staticContacts(r, false); this._boundary(r); this._crushProps(r);
      return;
    }
    r.pushVelocity ||= 0; r.headingError ||= 0;
    r.contactCooldown = Math.max(0, (r.contactCooldown || 0) - dt);
    r.ramRecoverySec = Math.max(0, (r.ramRecoverySec || 0) - dt);
    r.braking = false; r.yieldingToPlayer = false;
    // CPU pace is independent of the player's manual/automatic gearbox.
    const skill = CPU_DIFFICULTY[s.cpuDifficulty], car = this.rivalSpec || CARS[s.car];
    // On Wasteland's long circuit, Easy needs enough road speed to stay in
    // combat range. It remains below Medium's cruise and corner pace.
    const easyWasteland = s.mode === 'wasteland' && s.cpuDifficulty === 'easy';
    const cruiseSkill = easyWasteland ? .875 : skill.skill;
    const cornerSkill = easyWasteland ? .895 : skill.cornerSkill;
    if (s.cpuDifficulty !== 'easy' && (this._npcRoutePlanner?.course !== this.course || this._npcRoutePlanner?.car !== car)) {
      this._npcRoutePlanner = new NpcRoutePlanner(this.course, { car, surfaceAt: (distance, lateral) => this._drivingSurface(distance, lateral, car) });
    }
    const route = s.cpuDifficulty === 'easy' ? null : this._npcRoutePlanner.update(r, { difficulty: s.cpuDifficulty, lapsTotal: s.lapsTotal, player: s, traffic: s.traffic });
    r.routeId = route?.routeId || null; r.routeLap = route?.routeLap || null;
    const rivalSurface = this._drivingSurface(r.s, r.lateral, car);
    const mediumCatchup = s.mode === 'wasteland' && s.cpuDifficulty === 'medium' ?
      20 * clamp((s.s - r.s - 120) / 180, 0, 1) : 0;
    const targetPace = car.topSpeed * cruiseSkill + mediumCatchup -
      (s.mode === 'wasteland' && s.cpuDifficulty === 'hard' ? 18 : 0);
    const rubber = clamp((s.s - r.s) * .012, -8, 8);
    let target = targetPace + rubber;
    if (mediumCatchup) target = Math.min(target, car.topSpeed);
    if (s.mode === 'wasteland' && s.cpuDifficulty === 'hard') {
      // A Wasteland rival stays near enough to fight instead of driving away
      // after an impact. It slows through normal braking, then resumes pace.
      const attackLead = clamp((r.s - s.s - 90) / 90, 0, 1);
      target = Math.min(target, target * (1 - attackLead) + 140 * attackLead);
    }
    // Custom rivals spend their chosen nitro build on clear straights. The
    // legacy default rival keeps its original pace and does not gain boost.
    r.boosting=!!s.rivalSettings&&r.boost>.05&&r.speedMph>=BOOST.minSpeedMph&&rivalSurface.boostAllowed&&r.contactCooldown<=0&&[0,40,80,120].every(ahead=>Math.abs(this.course.at(r.s+ahead).curvature)<.0012);
    if(r.boosting){
      r.boost=Math.max(0,r.boost-BOOST.drainPerSec/((1+r.upgrades.nitro*.14)*car.boostCapacity)*dt);
      target*=BOOST.topSpeedMult+r.upgrades.nitro*.025+(car.nitroSpeedBonus||0);
    }else r.boost=Math.min(1,r.boost+BOOST.refillPerSec*dt);
    if (route) target = Math.min(target, route.targetSpeedMph);
    else {
      let curve = 0;
      for (let look = 0; look <= 140; look += 28) curve = Math.max(curve, Math.abs(this.course.at(r.s + look).curvature));
      if (curve > .0001) target = Math.min(target, Math.sqrt(DRIVE.maxLateralAccel * car.grip * rivalSurface.traction / curve) / DRIVE.mphToWorld * cornerSkill);
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
    const plannedHeading = route?.headingTarget ?? clamp((lane - r.lateral) * .095, -.55, .55);
    const yieldPlan = this._npcYield(r, Math.max(0, target), plannedHeading);
    target = yieldPlan.targetMph;
    if (route?.mustYield) { r.yieldingToPlayer = route.yieldingToPlayer; r.braking = r.speedMph > target; }
    if (yieldPlan.yielding) {
      r.yieldingToPlayer = true;
      r.braking = r.speedMph > target;
    }
    target = Math.max(0, target);
    if (r.braking) r.speedMph = Math.max(target, r.speedMph - yieldPlan.braking * dt);
    else r.speedMph += clamp(target - r.speedMph, -DRIVE.brakeAccel * car.braking * dt, (car.accel * DRIVE.accelScale * .85+(r.boosting?BOOST.accelMphPerSec*(1+r.upgrades.nitro*.15)*(car.nitroAcceleration||1):0)) * dt);
    if (r.offRoad) r.speedMph *= Math.exp(-rivalSurface.scrub * dt * (rivalSurface.preparedGravel ? .25 : 1));
    if (r.ramRecoverySec > 0) {
      // Let the ram carry the car before the route planner tries to recenter it.
      r.headingError *= Math.exp(-.35 * dt);
    } else if (route) {
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
    if (!this._ramFlight(r, dt)) this._jump(r, dt);
    this._staticContacts(r, false);
    this._boundary(r);
    this._crushProps(r);
    this._advanceLaps(r, dt);
    if (r.completedLaps >= s.lapsTotal) { r.finished = true; r.finishTime = s.stageTimeSec; this.emit({ rivalFinished: true }); }
  }

  _ramFlight(actor, dt) {
    if (actor._ramVerticalSpeed == null) return false;
    actor.airHeight = Math.max(0, (actor.airHeight || 0) + actor._ramVerticalSpeed * dt - 9 * dt * dt);
    actor._ramVerticalSpeed -= 18 * dt;
    actor.airborne = actor.airHeight > 0;
    if (!actor.airborne && actor._ramVerticalSpeed < 0) {
      actor._ramVerticalSpeed = null; actor.airHeight = 0;
      actor._jumpY = null; actor._verticalSpeed = 0;
    }
    return true;
  }

  _crash(reason, side = 0, impactMph = Math.abs(this.state.speedMph), zone = 'front') {
    const s = this.state;
    if (s.impactTimer > 0 || s.status !== 'racing' || s.combat?.shield>0) return;
    // Record a real crossing interrupted by impact before prevS is replaced.
    this._advanceLaps(s,.05,true);
    s.crashSite={s:s.s,lateral:s.lateral,headingError:this.course.def.practice?s.headingError:0};
    this._breakDrift('hit');
    s.stageCrashes++;
    s.boosting = false;
    s.combo = 0; s.comboTimer = 0;
    const practice = this.course.def.practice === true;
    const recoverable = practice || s.mode==='wasteland' || this.stageDef.persistentVehicle || this.stageDef.kind === 'chase';
    const penalty = practice ? 0 : this.stageDef.crashPenaltySec ?? (this.stageDef.kind === 'chase' ? this.stageDef.chaseCrashPenaltySec : LIVES.crashPenaltySec);
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
        stageIndex: s.stageIndex, timeSec: +(s.stageTimeSec + s.racePenaltySec).toFixed(2), totalTimeSec: Math.round(s.totalTimeSec), lapTimes: [...s.lapTimes], assistedLaps: [...s.assistedLaps],
        jumps: s.jumps, jumpScore: s.jumpScore, crushCount: s.crushCount, crushScore: s.crushScore, ...this._objectiveResult() };
      this.emit({ gameover: true });
      return;
    }
    // Hold the impact location. Recovery happens after the visible skid.
    s.steerVisual = 0; s.yawVelocity = 0; s.overrevSec = 0;
    s.status = 'racing';
  }

  _impact(dt) {
    if (this.state.tumble) { this._rollover(dt); return; }
    const s = this.state, remaining = s.impactTimer / s.impactDuration;
    s.prevS = s.s;
    s.prevLateral = s.lateral;
    s.impactTimer = Math.max(0, s.impactTimer - dt);
    s.speedMph *= Math.exp(-3.2 * dt);
    s.crashSpin += s.impactSide * s.impactStrength * 5 * remaining * dt;
    s.lateral += s.impactSide * s.speedMph * DRIVE.mphToWorld * .15 * remaining * dt;
    const skidDistance = s.s + s.speedMph * DRIVE.mphToWorld * .3 * dt;
    s.s = this.course.def.practice ? skidDistance : Math.min(this.raceLength - 1, skidDistance);
    s.revs = Math.abs(s.speedMph) / (s.gear < 0 ? DRIVE.reverseMaxMph : this.car.gears[s.gear]);
    s.roughness = Math.max(s.roughness, remaining * s.impactStrength);
    this._staticContacts(s, true);
    if (s.impactTimer === 0 && s.status === 'racing') {
      this._safeReset(s,s.crashSite||{s:s.s,lateral:s.lateral,headingError:0}); s.crashSite=null; s.crashSpin = 0;
      s.speedMph = 12; s.gear = 0; s.revs = s.speedMph / this.car.gears[0];
      s.offRoad = !this._surface(s.s,s.lateral).road; s.offRoadTime = 0; s.roughness = 0;
      s.input.shiftUp = false; s.input.shiftDown = false;
      this._callout('RECOVERED AT CRASH SITE / KEEP DRIVING', 2);
      this.emit({ recovered: true });
    }
  }

  _crushProps(actor) {
    if (actor.tumble || this.course.def.kind !== 'arena') return;
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
        if (!actor.airborne) { actor._airOrigin = { x: start.x, z: start.z, time: state.stageTimeSec }; actor.airDistance = 0; actor.airTime = 0; }
        actor.airHeight = Math.max(.08, actor.airHeight || 0); actor.airborne = true;
        actor._jumpY = end.y + actor.airHeight; actor._verticalSpeed = Math.max(actor._verticalSpeed || 0, 1.1 + strength * 1.4);
      }
      const burst = { id: prop.id, byPlayer, x: prop.x, y: prop.y, z: prop.z, s: prop.s, off: prop.off, strength,
        serial: (state.crushBurst?.serial || 0) + 1 };
      state.crushBurst = burst;
      if (byPlayer) {
        const points = this.course.def.practice ? 0 : 150 * this.scoreMultiplier;
        state.crushCount++; state.crushScore += points; state.stageStyleScore += points; state.score += points;
        this._callout(`CAR CRUSH  /  +${points}`, 1.8);
      }
      this.emit({ propCrushed: burst });
    }
  }

  _jump(actor, dt) {
    const arena = this.course.def.kind === 'arena';
    const allTerrain = actor === this.state && offroadCapability(this.car) && (actor.airborne || !this._surface(actor.s, actor.lateral).road);
    if (actor.tumble || (!arena && this.course.def.airborne !== true && !allTerrain) || !Number.isFinite(dt) || dt <= 0) return;
    const groundPoint = this._supportAt(actor.s, actor.lateral, actor), previousPoint = this._supportAt(actor.prevS ?? actor.s, actor.prevLateral ?? actor.lateral, actor);
    const ground = groundPoint.y, previousGround = previousPoint.y;
    if (!Number.isFinite(ground) || !Number.isFinite(previousGround)) return;
    const groundVelocity = (ground - previousGround) / dt;
    if (actor._jumpY == null) { actor._jumpY = previousGround; actor._verticalSpeed = arena ? 0 : groundVelocity; }
    // Consecutive terrain velocities are interval averages. Their midpoint
    // estimates the tangent velocity at the start of this step. Extrapolating
    // only the older average would detach at half gravity and create repeated
    // tiny hops on ordinary rolling crests. Keep authored arena timing exact.
    const verticalSpeed = !arena && !actor.airborne ? (actor._verticalSpeed + groundVelocity) * .5 : actor._verticalSpeed;
    const gravity = 18, predicted = actor._jumpY + verticalSpeed * dt - gravity * dt * dt * .5;
    if (!actor.airborne) {
      // A descending convex crest can leave the road too: the car keeps its
      // signed tangent velocity while the road falls away faster. The arena
      // retains its authored upward-ramp threshold and exact existing timing.
      const fastEnough = (arena ? actor.speedMph : Math.abs(actor.speedMph)) > 28;
      if (predicted > ground + .0001 && (!arena || verticalSpeed > 1) && fastEnough) {
        actor.airborne = true;
        actor._verticalSpeed = verticalSpeed;
        actor._airOrigin = { x: previousPoint.x, z: previousPoint.z, time: this.state.stageTimeSec - dt };
        actor.airDistance = 0; actor.airTime = 0;
        // Natural crests share flight/landing physics, but only authored arena
        // ramps can create a scored jump token. Resets still clear that token.
        const phase = this.course.phase(actor.s), index = arena ? this.course.features.ramps.findIndex(ramp => phase >= ramp.start && phase <= ramp.end + 8) : -1;
        actor._jumpOrigin = index >= 0 ? { s: actor.s, world: this.course.worldAt(actor.s, actor.lateral), rampId: `ramp-${index}`, lap: Math.floor(actor.s / this.course.length) + 1 } : null;
      } else {
        actor._verticalSpeed = groundVelocity;
        actor._jumpY = ground; actor.airHeight = 0; return;
      }
    }
    actor._jumpY = predicted;
    actor._verticalSpeed -= gravity * dt;
    actor.airHeight = Math.max(0, actor._jumpY - ground);
    if (actor._airOrigin) {
      actor.airDistance = Math.hypot(groundPoint.x - actor._airOrigin.x, groundPoint.z - actor._airOrigin.z);
      actor.airTime = Math.max(0, this.state.stageTimeSec - actor._airOrigin.time);
    }
    if (actor._jumpY > ground) return;
    // Rejoin a descending road at its tangent speed. Zeroing this for natural
    // roads would manufacture a second hop on the next downhill step.
    actor._jumpY = ground; actor._verticalSpeed = arena ? 0 : groundVelocity; actor.airborne = false; actor.airHeight = 0;
    const origin = actor._jumpOrigin; actor._jumpOrigin = null;
    if (!arena || actor !== this.state || !origin || origin.lap !== actor.completedLaps + 1 || origin.s < actor.completedLaps * this.course.length) return;
    const key = `${origin.rampId}:lap-${origin.lap}`;
    if (actor.collectedJumps.includes(key)) return;
    const landing = this.course.worldAt(actor.s, actor.lateral), distance = Math.hypot(landing.x - origin.world.x, landing.z - origin.world.z);
    if (distance < 4) return;
    const points = this.course.def.practice ? 0 : Math.min(400, Math.round(distance * 4)) * this.scoreMultiplier;
    actor.collectedJumps.push(key); actor.jumpScore += points; actor.stageStyleScore += points; actor.score += points;
    actor.jumps++; actor.bestJumpMeters = Math.max(actor.bestJumpMeters, +distance.toFixed(1));
    this._callout(`BIG AIR  /  ${Math.round(distance)} m  /  +${points}`, 2.4);
    this.emit({ jumpLanded: { rampId: origin.rampId, lap: origin.lap, distance: +distance.toFixed(1), points } });
  }

  _advanceLaps(actor, dt, noReset = false) {
    if (this.course.def.practice || actor.crushed) return;
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
      // Invisible circuit checkpoints include the narrow roadside shoulder.
      // Otherwise a harmless edge crossing (even inside the finish arch)
      // silently invalidates the lap. This does not alter grip, boost, solid
      // posts, ordered progress, or the separate timed challenge gate widths.
      return surface.road || !!surface.shortcutId || Math.abs(lateral) <= surface.roadHalfWidth + ROAD_SHOULDER_WIDTH;
    };
    // A discontinuous position change cannot substitute for driving a circuit.
    const plausibleTravel = current - previous < Math.max(20, actor.speedMph * DRIVE.mphToWorld * dt * 4 + 12);
    if (gate != null && crossed(lapBase + gate) && plausibleTravel) {
      if (legalAt(lapBase + gate)) {
        actor.nextLapGate++;
        if (player) this.emit({ lapCheckpoint: actor.nextLapGate, lap: actor.completedLaps + 1 });
      } else if (!noReset) {
        // A physically missed gate is known at the crossing. Retry it now;
        // waiting for the finish line can erase an entire otherwise driven lap.
        this._safeReset(actor);
        if (player) {
          actor.invulnerableSec = Math.max(actor.invulnerableSec, 2.2);
          this._callout('CHECKPOINT MISSED  /  BACK ON COURSE', 3);
          this.emit({ checkpointReset: true });
        }
        return;
      }
    }
    if (!crossed(finish)) return;
    if (actor.nextLapGate < this._lapGates.length || !legalAt(finish) || !plausibleTravel) {
      if(noReset)return;
      // Put the missed gate (or the finish line) a short drive ahead. The
      // recovery still sits before the next unearned crossing, and a large
      // discontinuous jump does not gain this closer retry position.
      const lastValid = lapBase + (this._lapGates[actor.nextLapGate - 1] || 0) + 1;
      const nextRequired = lapBase + (this._lapGates[actor.nextLapGate] ?? this.course.length);
      actor.s = plausibleTravel ? Math.max(lastValid, nextRequired - 12) : lastValid;
      this._safeReset(actor);
      if (player) { actor.invulnerableSec = Math.max(actor.invulnerableSec, 2.2); this._callout('CHECKPOINT MISSED  /  BACK ON COURSE', 3); this.emit({ checkpointReset: true }); }
      return;
    }
    const fraction = clamp((finish - previous) / (current - previous), 0, 1);
    const elapsed = this.state.stageTimeSec + (player ? this.state.racePenaltySec : 0) - dt * (1 - fraction);
    actor.lapTimes.push(+(elapsed - actor.lapStartedAt).toFixed(3));
    const assisted = actor.assistedLap === true;
    actor.assistedLaps ??= [];
    actor.assistedLaps.push(assisted);
    actor.assistedLap = false;
    actor.lapStartedAt = elapsed; actor.nextLapGate = 0; actor.completedLaps++;
    actor.lap = actor.currentLap = Math.min(laps, actor.completedLaps + 1);
    actor.lapTimeSec = Math.max(0, this.state.stageTimeSec + (player ? this.state.racePenaltySec : 0) - elapsed);
    if (player) {
      if (!this.state.police.pursuit?.active) this.state.police.triggered = false;
      if (actor.completedLaps < laps) this._callout(`LAP ${actor.currentLap} / ${laps}  /  KEEP PUSHING`, 3);
      this.emit({ lapCompleted: actor.completedLaps, lapTimeSec: actor.lapTimes.at(-1), assisted });
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
    if (this.course.def.practice) return false;
    const s = this.state;
    if (!s.timeLimitSec || !['racing','ticket'].includes(s.status) || (atSec??s.stageTimeSec + s.racePenaltySec) < s.timeLimitSec) return false;
    if (s.drift) this._commitDrift(finishDrift(s.drift, { completed: false }));
    s.timeRemaining = 0;
    s.boosting = false; s.status = 'stage_result';
    s.results = { completed: false, won: false, timeout: true, seed: s.seed, stageIndex: s.stageIndex, stageName: this.stageDef.name,
      stageTimeSec: +s.stageTimeSec.toFixed(2), timeSec: +(s.stageTimeSec + s.racePenaltySec).toFixed(2),
      laps: s.completedLaps, lapTimes: [...s.lapTimes], assistedLaps: [...s.assistedLaps], lives: s.lives, score: s.stageStyleScore, styleScore: s.stageStyleScore,
      jumpScore: s.jumpScore, jumps: s.jumps, bestJumpMeters: s.bestJumpMeters,
      crushCount: s.crushCount, crushScore: s.crushScore, ...this._objectiveResult() };
    this._callout(s.checkpointRush?'TIME UP  /  CHECKPOINT RUSH ENDED':s.objective ? `TIME UP  /  ${s.drift ? 'DRIFT' : 'STUNT'} TRIAL ENDED` : 'TIME UP  /  THE CAR LIVES TO RACE AGAIN', 3);
    this.emit({ stageResult: s.results });
    return true;
  }

  _finishStage() {
    if (this.course.def.practice) return false;
    const s = this.state;
    if (s.status !== 'racing' || s.completedLaps < s.lapsTotal || s.s < this.raceLength) return false;
    if (this._deadline()) return false;
    if (s.drift) this._commitDrift(finishDrift(s.drift, { completed: true }));
    const timeSec = s.stageTimeSec + s.racePenaltySec;
    const par = this._parTime();
    const timeBonus = Math.max(0, Math.round((par - timeSec) * SCORING.perSecondUnder));
    const beatRival = s.rival ? (s.rival.finishTime == null || s.stageTimeSec <= s.rival.finishTime) : null;
    const objective = this._objectiveResult();
    const won = s.objective ? objective.targetsMet && timeSec < s.timeLimitSec : this.stageDef.kind === 'chase' ? timeSec < s.timeLimitSec : s.mode !== 'timetrial' && s.rival ? beatRival === true : timeSec < par;
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

    s.results = {
      stageIndex: s.stageIndex, stageName: this.stageDef.name, seed: s.seed,
      stageTimeSec: +s.stageTimeSec.toFixed(2), timeSec: +timeSec.toFixed(2), missedStation: false,
      completed: true, laps: s.completedLaps, lapTimes: [...s.lapTimes], assistedLaps: [...s.assistedLaps],
      jumpScore: s.jumpScore, jumps: s.jumps, bestJumpMeters: s.bestJumpMeters,
      crushCount: s.crushCount, crushScore: s.crushScore,
      cleanStage: s.stageCrashes === 0, stageCrashes: s.stageCrashes, majorCrashesBeforeRepair,
      crashesRepaired, livesRestored, policeEscapes: s.policeEscapes, scoreMultiplier: this.scoreMultiplier,
      lives: s.lives, timeBonus: timeBonus * this.scoreMultiplier, beatRival, score, styleScore: s.stageStyleScore, won,
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
