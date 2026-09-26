import * as simDriving from './sim-driving.js';
import * as simContacts from './sim-contacts.js';
import * as simRival from './sim-rival.js';
import * as simPolice from './sim-police.js';
import * as simLaps from './sim-laps.js';
import * as simCrash from './sim-crash.js';
import * as simResults from './sim-results.js';
import {normalizeWeapons} from './weapon-upgrades.js';
import {normalizeCarLoadout} from './car-loadout.js';
import {WEAPONS,createCombat,fireWeapon,stepCombat,supportsCombat} from './combat.js';
import {initializeCombatArmor} from './combat-armor.js';
import {initializeRaiders, stepRaiders} from './raiders.js';
import {initializeFootTransition, stepFootTransition,
  stepParkedRace} from './onfoot-transition.js';
import {validArmorKit} from './armor-kits.js';
import {initializeFootWeapons, selectFootGear} from './onfoot-weapons.js';
import {CREW} from './crew.js';
// Duel owns the simulation state, lifecycle and fixed-step call order. The
// sim-* modules implement each system against this same instance.

import { CARS, DEFAULT_CAR, DIFFICULTY, DEFAULT_DIFFICULTY, CPU_DIFFICULTY, DEFAULT_CPU_DIFFICULTY, COURSE, LIVES, DRIVE, SCORING } from './config.js';
import { Course } from './course.js';
import { onHiddenRoad } from './hidden-road.js';
import {initializeHiddenRoadJourney, checkHiddenRoadDeparture, stepHiddenRoadJourney,
  queueHiddenRoadChoice, hiddenRoadColliders, prepareHiddenRoadVisit} from './hidden-road-journey.js';
import { seedFromUrl } from './rng.js';
import { createDriftState } from './drift-scoring.js';
import { DEFAULT_DRIVER, normalizeDriverId, applyDriverModifiers } from './drivers.js';
import {normalizeRival} from './rival-settings.js';
import {upgradedCar} from './progression.js';
import {createFeatureFlags, featureFlags} from './feature-flags.js';
import {hiddenRoadInRace, raceFeatureFlags} from './wasteland-access.js';
import {clamp, freshDamageZones} from './sim-common.js';
import {ARENA_VENUES} from './arena/venues.js';
import {ARENA_MODES, applyArenaArmor, createArenaEvent, placeActor, startingSlots, stepArenaEvent} from './arena/arena-event.js';

const UPGRADE_KEYS = ['engine', 'nitro', 'handling', 'tires', 'brakes', 'suspension', 'tank'];
const FACTORY_MAX_UPGRADES = Object.freeze(Object.fromEntries(UPGRADE_KEYS.map(key => [key, 3])));

export class Duel {
  constructor(opts = {}) {
    this.seed = (opts.seed ?? seedFromUrl()) >>> 0;
    this.difficultyKey = DIFFICULTY[opts.difficulty] ? opts.difficulty : DEFAULT_DIFFICULTY;
    this.carKey = CARS[opts.car] ? opts.car : DEFAULT_CAR;
    // Without explicit switches a race sees the released ones, with the
    // Wasteland rules only for a player who found the gate (SPEC 0.12).
    this.featureFlags = opts.featureFlags?.enabled ? opts.featureFlags :
      opts.featureFlags ? createFeatureFlags({overrides: opts.featureFlags, storage: null, qa: false}) :
      raceFeatureFlags(featureFlags, () => this.state);
    this.listeners = new Set();
    this.state = this._freshState();
  }

  _freshState() {
    const state = {
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
      surfaceMud: 0, waterDepth: 0, mudWheelSpin: 0,
      impactTimer: 0, impactDuration: 0, impactStrength: 0, impactSide: 1, crashSpin: 0,
      majorCrashes: 0, stageCrashes: 0, catastrophic: false,
      damageZones: freshDamageZones(), damageCooldown: 0,
      boundaryWarning: false, boundaryResets: 0, pushVelocity: 0, collectedFlocks: [],
      airborne: false, airHeight: 0, jumpScore: 0, jumps: 0, bestJumpMeters: 0, collectedJumps: [],
      airDistance: 0, airTime: 0, _airOrigin: null,
      groundHeight: null, terrainPitch: null, terrainRoll: null, tumble: null, rollovers: 0, practice: false,
      crushedProps: [], crushCount: 0, crushScore: 0, crushBurst: null,
      fallenCacti: [],
      brokenScenery: [],
      roadsideBursts: [],
      roadsideBurstSerial: 0,
      score: 0, stageStyleScore: 0, nearMisses: 0, policeEscapes: 0, combo: 0, comboTimer: 0,
      callout: '', calloutTimer: 0,
      // police
      police: { beep: 0, triggered: false, pursuit: null, ticket: null, ticketCount: 0, pendingFines: 0 },
      // CPU cars. `rival` remains an alias for the first entry.
      opponents: [],
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
    Object.defineProperty(state, 'rival', {
      enumerable: true,
      get() { return this.opponents[0] || null; },
      set(actor) {
        if (!actor) this.opponents = [];
        else if (this.opponents.length) this.opponents[0] = actor;
        else this.opponents = [actor];
      },
    });
    return state;
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) fn(this.state, ev); }
  destructionEnabled() {
    return true;
  }
  roadsideKnockAwayEnabled() {
    return this.state.mode === 'wasteland';
  }

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
  get stageDef() { return this.state.arena ? this.course.def : COURSE[this.state.stageIndex]; }
  get raceLength() { return this.course?.raceLength || this.course?.length || 0; }
  _parTime(...args) { return simResults._parTime.apply(this, args); }
  relativeS(value, reference = this.state.s) {
    return this.course?.closed ? value + Math.round((reference - value) / this.course.length) * this.course.length : value;
  }
  _surface(...args) { return simDriving._surface.apply(this, args); }
  _drivingSurface(...args) { return simDriving._drivingSurface.apply(this, args); }
  _vehicleSpec(...args) { return simContacts._vehicleSpec.apply(this, args); }

  _npcYield(...args) { return simRival._npcYield.apply(this, args); }

  // ---- lifecycle -------------------------------------------------------
  startCampaign({ mode = 'duel', car, difficulty, cpuDifficulty = DEFAULT_CPU_DIFFICULTY, playerId = null, driverId = DEFAULT_DRIVER, startStage = 0, upgrades = {}, seed, rival, opponentCount = 1, weaponLevels, weaponLoadout, combatArmorKit = null, crewId = 'rook', discoveredGate = false, _hiddenRoadVisit = false } = {}) {
    if (Number.isFinite(seed) && Number.isInteger(seed)) this.seed = seed >>> 0;
    this.state.seed = this.seed;
    this.state.arena = null;
    this._hiddenRoadAutomaticEntry = discoveredGate === true;
    this.state.wastelandGateDiscovered = discoveredGate === true;
    this.state.hiddenRoadVisit = _hiddenRoadVisit ? {playerId} : null;
    if (CARS[car]) this.state.car = car;
    if (DIFFICULTY[difficulty]) this.state.difficulty = difficulty;
    this.state.cpuDifficulty = CPU_DIFFICULTY[cpuDifficulty] ? cpuDifficulty : DEFAULT_CPU_DIFFICULTY;
    this.state.playerId = typeof playerId === 'string' ? playerId : null;
    this.state.driverId = normalizeDriverId(driverId);
    this.state.rivalSettings = normalizeRival(rival);this.state.weaponLevels=normalizeWeapons({levels:weaponLevels}).levels;
    this.state.opponentCount = Number.isSafeInteger(opponentCount) ? Math.max(0, Math.min(3, opponentCount)) : 1;
    this.state.upgrades = Object.fromEntries(UPGRADE_KEYS.map(key => [key, CARS[this.state.car].factoryMaxed ? 3 : Number.isFinite(upgrades[key]) ? clamp(Math.floor(upgrades[key]), 0, 3) : 0]));
    this.state.mode = mode === 'wasteland' && supportsCombat(COURSE[startStage]) ? 'wasteland' : mode === 'timetrial' ? 'timetrial' : 'duel';
    this.state.weaponLoadout=this.state.mode==='wasteland'&&
      this.featureFlags.enabled('wasteland2')?
      normalizeCarLoadout(weaponLoadout,Object.keys(WEAPONS)):null;
    this.state.stageIndex = Number.isFinite(startStage) ? clamp(Math.floor(startStage), 0, COURSE.length - 1) : 0;
    if (COURSE[this.state.stageIndex].stuntTrial || ['chase', 'drift', 'checkpoint'].includes(COURSE[this.state.stageIndex].kind)) this.state.mode = 'duel';
    this.state.combatArmorKit = this.state.mode === 'wasteland' &&
      this.featureFlags.enabled('wasteland2') ? validArmorKit(combatArmorKit) : null;
    this.state.crewId = this.state.mode === 'wasteland' &&
      this.featureFlags.enabled('wasteland2') ?
      (Object.hasOwn(CREW,crewId) ? crewId : 'rook') : null;
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

  startHiddenRoadVisit(options = {}) {
    if (!this.featureFlags.enabled('hidden-road')) return false;
    const startStage = COURSE.findIndex(course => course.id === 'pacific-canyon');
    this.startCampaign({...options, startStage, mode: 'duel', opponentCount: 0,
      discoveredGate: true, _hiddenRoadVisit: true});
    return !!this.state.hiddenRoadVisit;
  }

  _loadStage(idx) {
    const s = this.state;
    s.stageIndex = idx;
    this.course = new Course(COURSE[idx], this.seed, {
      hiddenRoad: hiddenRoadInRace(this.featureFlags, s),
      muddyHollow: s.wastelandGateDiscovered === true && this.featureFlags.enabled('muddy-hollow'),
    });
    this._obstacleQueryCache = new Map(); this._obstacleArray = this.course.features.obstacles;
    const rawGates = this.course.features.lapGates?.map(gate => typeof gate === 'number' ? gate : gate.s) || [this.course.length * .25, this.course.length * .5, this.course.length * .75];
    this._lapGates = [...new Set(rawGates.filter(distance => distance > 0 && distance < this.course.length))].sort((a, b) => a - b);
    this._resetStageDriving();
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
    const firstOpponent = (s.opponentCount > 0 && !s.practice && (COURSE[idx].hasRival || s.opponentCount > 1) && s.mode !== 'timetrial')
      ? { car:rivalCar,driverId:rivalSettings?.driverId||DEFAULT_DRIVER,upgrades:rivalLevels,s: this.course.rivalStartS ?? -20, lateral: -DRIVE.laneOffset, speedMph: 0, finished: false, finishTime: null,
        headingError: 0, yawVelocity: 0, pushVelocity: 0, offRoad: false, contactCooldown: 0, boost:1, boosting:false,
        damageZones: freshDamageZones(), damageCooldown: 0,
        airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0, _jumpOrigin: null,
        completedLaps: 0, nextLapGate: 0, lapTimes: [], lapStartedAt: 0 }
      : null;
    s.opponents = firstOpponent ? [firstOpponent] : [];
    for (let index = 1; index < s.opponentCount && firstOpponent; index++) {
      s.opponents.push({ ...firstOpponent, s: firstOpponent.s - index * 16,
        lateral: index % 2 ? DRIVE.laneOffset : -DRIVE.laneOffset,
        damageZones: freshDamageZones(), upgrades: { ...rivalLevels }, lapTimes: [] });
    }
    // pre-spawn deterministic two-way traffic
    s.traffic = this._spawnTraffic(idx);
    s.combat=s.mode==='wasteland'&&supportsCombat(COURSE[idx])?createCombat(s.weaponLevels):null;
    initializeCombatArmor(this);
    initializeRaiders(this);
    initializeFootTransition(this);
    initializeFootWeapons(this);
    initializeHiddenRoadJourney(this);
    if (s.hiddenRoadVisit) prepareHiddenRoadVisit(this);
    this.emit(s.hiddenRoadVisit ? {stageLoaded: idx, hiddenRoadVisit: true}
      : {stageLoaded: idx, countdown: 3});
  }

  // Driving, crash and scoring state for a fresh stage or arena event.
  _resetStageDriving() {
    const s = this.state;
    s.s = 0; s.lateral = 0; s.speedMph = 0; s.gear = 0; s.revs = 0; s.overrevSec = 0; s.reverseHoldSec = 0;
    s.paused = false; s.offRoad = false; s.steerVisual = 0;
    s.boost = 1; s.boosting = false; s.invulnerableSec = 0;
    s.headingError = 0; s.yawVelocity = 0; s.roughness = 0; s.offRoadTime = 0; s.preparedGravel = false;
    s.surfaceMud = 0; s.waterDepth = 0; s.mudWheelSpin = 0;
    s.slipAngle = 0; s.drifting = false;
    s.boundaryWarning = false; s.pushVelocity = 0; s.damageCooldown = 0; s.collectedFlocks = [];
    s.airborne = false; s.airHeight = 0; s.jumpScore = 0; s.jumps = 0; s.bestJumpMeters = 0; s.collectedJumps = [];
    s.airDistance = 0; s.airTime = 0; s._airOrigin = null;
    s.groundHeight = null; s.terrainPitch = null; s.terrainRoll = null; s.tumble = null; s.rollovers = 0;
    s._climbGain = 0; s._climbRest = 0; s._offroadSafe = null; s.practice = this.course.def.practice === true;
    s.crushedProps = []; s.crushCount = 0; s.crushScore = 0; s.crushBurst = null;
    this._crushedVehicles = [];
    s.fallenCacti = []; this._fallenCactusIds = new Set();
    s.brokenScenery = []; this._brokenSceneryIds = new Set();
    s.roadsideBursts = [];
    s.roadsideBurstSerial = 0;
    s._jumpY = null; s._verticalSpeed = 0; s._jumpOrigin = null; s.prevAirHeight = 0;
    s.crashSite = null; s.impactTimer = 0; s.impactDuration = 0; s.impactStrength = 0; s.impactSide = 1; s.crashSpin = 0;
    s.bombImpactCooldown = 0;
    s.combo = 0; s.comboTimer = 0; s.stageStyleScore = 0; s.stageCrashes = 0; s.policeEscapes = 0;
    s.callout = ''; s.calloutTimer = 0;
    s.input = { throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false };
    s.stageTimeSec = 0;
  }

  // ---- arena events (docs/SCRAPDOME.md) ----------------------------------
  // Reached only from the Scrapdome yard. Returns false for an invalid request
  // or while the scrapdome switch is off; the caller must only offer it to a
  // player who has found the gate.
  startArenaEvent({ venueId = 'scrapdome', mode = 'last-car-rolling', car, difficulty,
    cpuDifficulty = DEFAULT_CPU_DIFFICULTY, playerId = null, driverId = DEFAULT_DRIVER, upgrades = {},
    seed, opponents = [], weaponLevels, weaponLoadout, combatArmorKit = null, crewId = 'rook' } = {}) {
    const venue = ARENA_VENUES[venueId], rules = ARENA_MODES[mode];
    const released = this.featureFlags.base || this.featureFlags;
    if (!this.featureFlags.enabled('scrapdome') || !released.enabled('wasteland2') || !venue || !rules ||
        !Array.isArray(opponents) || opponents.length < 1 || opponents.length > rules.maxOpponents ||
        opponents.some(spec => !CARS[spec?.car])) return false;
    const s = this.state;
    if (Number.isFinite(seed) && Number.isInteger(seed)) this.seed = seed >>> 0;
    s.seed = this.seed;
    s.wastelandGateDiscovered = true;
    this._hiddenRoadAutomaticEntry = false;
    s.hiddenRoadVisit = null;
    if (CARS[car]) s.car = car;
    if (DIFFICULTY[difficulty]) s.difficulty = difficulty;
    s.cpuDifficulty = CPU_DIFFICULTY[cpuDifficulty] ? cpuDifficulty : DEFAULT_CPU_DIFFICULTY;
    s.playerId = typeof playerId === 'string' ? playerId : null;
    s.driverId = normalizeDriverId(driverId);
    s.rivalSettings = null;
    s.weaponLevels = normalizeWeapons({levels: weaponLevels}).levels;
    s.opponentCount = opponents.length;
    s.upgrades = Object.fromEntries(UPGRADE_KEYS.map(key => [key, CARS[s.car].factoryMaxed ? 3 : Number.isFinite(upgrades[key]) ? clamp(Math.floor(upgrades[key]), 0, 3) : 0]));
    s.mode = 'wasteland';
    s.weaponLoadout = normalizeCarLoadout(weaponLoadout, Object.keys(WEAPONS));
    s.combatArmorKit = validArmorKit(combatArmorKit);
    s.crewId = Object.hasOwn(CREW, crewId) ? crewId : 'rook';
    s.lives = LIVES.start; s.totalTimeSec = 0; s.penaltySec = 0; s.score = 0; s.nearMisses = 0;
    s.majorCrashes = 0; s.catastrophic = false; s.boundaryResets = 0;
    s.damageZones = { front: 0, rear: 0, left: 0, right: 0 };
    this._loadArena(venue, mode, opponents);
    return true;
  }

  _loadArena(venue, mode, opponentSpecs) {
    const s = this.state;
    // Keep a valid index for code that reads the course list; the arena
    // itself always reads `this.course` and `state.arena`.
    s.stageIndex = Math.max(0, COURSE.findIndex(course => course.id === 'titan-arena'));
    this.course = new Course(venue, this.seed);
    this._obstacleQueryCache = new Map(); this._obstacleArray = this.course.features.obstacles;
    this._lapGates = [];
    this._resetStageDriving();
    s.racePenaltySec = 0; s.lap = s.currentLap = 1; s.completedLaps = 0; s.lapsTotal = 1;
    s.lapTimeSec = 0; s.lapTimes = []; s.lapStartedAt = 0; s.nextLapGate = 0; s.assistedLaps = []; s.assistedLap = false;
    s.timeLimitSec = s.timeRemaining = s.parTimeSec = s.objective = s.drift = s.checkpointRush = null;
    s.police = { beep: 0, triggered: false, pursuit: null, ticket: null, ticketCount: 0, pendingFines: 0 };
    s.results = null; s.lastCrashReason = null; s.crashFlash = 0;
    s.traffic = []; s.hiddenRoadJourney = null; delete s.raids;
    s.arena = createArenaEvent({mode, venueId: venue.id, course: this.course,
      opponentBrains: opponentSpecs.map(spec => spec.brain)});
    const slots = startingSlots(s.arena.spawnSlots.length, opponentSpecs.length + 1);
    s.opponents = opponentSpecs.map((spec, index) => ({
      arenaId: `cpu-${index + 1}`, car: spec.car, driverId: spec.driverId || DEFAULT_DRIVER,
      upgrades: Object.fromEntries(UPGRADE_KEYS.map(key => [key, CARS[spec.car].factoryMaxed ? 3 :
        clamp(Math.floor(spec.upgrades?.[key] ?? spec.upgradeLevel ?? 0), 0, 3)])),
      speedMph: 0, finished: false, finishTime: null, headingError: 0, yawVelocity: 0, pushVelocity: 0,
      offRoad: false, contactCooldown: 0, boost: 1, boosting: false,
      damageZones: freshDamageZones(), damageCooldown: 0,
      airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0, _jumpOrigin: null,
      completedLaps: 0, nextLapGate: 0, lapTimes: [], lapStartedAt: 0 }));
    const first = s.opponents[0];
    this.rivalSpec = applyDriverModifiers(upgradedCar(CARS[first.car], first.upgrades), first.driverId, first.car);
    [s, ...s.opponents].forEach((actor, index) => {
      const slot = s.arena.spawnSlots[slots[index]];
      placeActor(this, actor, slot);
      s.arena.participants[index].spawnSlot = slot.index;
    });
    s.combat = createCombat(s.weaponLevels);
    initializeCombatArmor(this);
    applyArenaArmor(this);
    initializeFootTransition(this);
    initializeFootWeapons(this);
    s.countdown = 3;
    s.status = 'countdown';
    this.emit({ arenaLoaded: venue.id, countdown: 3 });
  }

  _spawnTraffic(...args) { return simRival._spawnTraffic.apply(this, args); }

  // ---- the core step ---------------------------------------------------
  fireWeapon(weapon){return fireWeapon(this,weapon);}
  selectFootGear(slot){return selectFootGear(this,slot);}
  chooseHiddenRoad(choice) { return queueHiddenRoadChoice(this, choice); }

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
    if (s.arena) {
      if (s.status === 'racing') stepArenaEvent(this, dt);
      return;
    }
    if (checkHiddenRoadDeparture(this) || s.status === 'exploring') {
      stepHiddenRoadJourney(this, dt);
      return;
    }
    if (s.status !== 'racing') {
      if (s.status === 'gameover' && s.impactTimer > 0) this._impact(dt);
      return;
    }

    // Within the actual spur, motion decides departure before race outcomes.
    // Ordinary and flag-off racing retain their established call order.
    const droveSpur = !!s.hiddenRoadJourney && !s.onFoot && s.impactTimer <= 0 && onHiddenRoad(this.course, s);
    if (droveSpur) {
      this._drive(dt);
      if (checkHiddenRoadDeparture(this) || s.status !== 'racing') return;
    }
    s.stageTimeSec += dt;
    if (s.timeLimitSec) s.timeRemaining = Math.max(0, s.timeLimitSec - s.stageTimeSec - s.racePenaltySec);
    s.lapTimeSec = s.stageTimeSec + s.racePenaltySec - s.lapStartedAt;
    s.totalTimeSec += dt;
    if (s.crashFlash > 0) s.crashFlash = Math.max(0, s.crashFlash - dt);
    s.invulnerableSec = Math.max(0, s.invulnerableSec - dt);
    s.damageCooldown = Math.max(0, s.damageCooldown - dt);
    stepCombat(this,dt);
    stepRaiders(this, dt);
    for (const actor of [...s.opponents, s.police.pursuit, ...s.traffic]) {
      if (actor?.damageCooldown > 0) actor.damageCooldown = Math.max(0, actor.damageCooldown - dt);
    }
    s.calloutTimer = Math.max(0, s.calloutTimer - dt);
    s.comboTimer = Math.max(0, s.comboTimer - dt);
    if (s.comboTimer === 0) s.combo = 0;
    if (s.drift) {
      this._driftStepStart = { s: s.s, world: this.course.worldAt(s.s, s.lateral) };
      this._driftHit = false; this._driftReset = false;
    }

    if (s.impactTimer > 0 && !s.onFoot) {
      this._impact(dt);
      this._crushProps(s);
      this._traffic(dt);
      for (const opponent of s.opponents) this._rival(dt, opponent);
      this._collisions();
      this._tickDrift(dt);
      this._police(dt, false);
      return; // A crash must play out before a ticket or finish can replace it.
    }
    if (this._deadline(s.checkpointRush ? s.stageTimeSec+s.racePenaltySec-dt : undefined)) return;

    if (stepFootTransition(this, dt)) {
      stepParkedRace(this, dt);
      return;
    }

    // each sub-step can end the run (gameover crash, ticket); once the status
    // leaves 'racing' the rest of the frame must not keep simulating, or a
    // finish-line crossing could overwrite the gameover/ticket state
    if (!droveSpur) this._drive(dt);
    if (checkHiddenRoadDeparture(this)) return;
    if (s.status !== 'racing' || s.impactTimer > 0) { this._tickDrift(dt); return; }
    this._jump(s, dt);
    this._traffic(dt);
    for (const opponent of s.opponents) this._rival(dt, opponent);
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

  _commitDrift(...args) { return simDriving._commitDrift.apply(this, args); }

  _breakDrift(...args) { return simDriving._breakDrift.apply(this, args); }

  _tickDrift(...args) { return simDriving._tickDrift.apply(this, args); }

  _drive(...args) { return simDriving._drive.apply(this, args); }

  _traffic(...args) { return simRival._traffic.apply(this, args); }

  _collisions(...args) { return simContacts._collisions.apply(this, args); }

  _obstacles(...args) { return simContacts._obstacles.apply(this, args); }

  _roadPosition(...args) { return simContacts._roadPosition.apply(this, args); }

  _supportAt(...args) { return simContacts._supportAt.apply(this, args); }

  _terrainPose(...args) { return simDriving._terrainPose.apply(this, args); }

  _offroadStep(...args) { return simDriving._offroadStep.apply(this, args); }

  _startTumble(...args) { return simCrash._startTumble.apply(this, args); }

  _rollover(...args) { return simCrash._rollover.apply(this, args); }

  _staticContacts(car, player) {
    const colliders = car === this.state ? hiddenRoadColliders(this) : null;
    return simContacts._staticContacts.call(this, car, player, colliders);
  }

  _vehicleContact(...args) { return simContacts._vehicleContact.apply(this, args); }

  _scrape(...args) { return simContacts._scrape.apply(this, args); }

  _crushVehicle(...args) { return simContacts._crushVehicle.apply(this, args); }

  _dentVehicle(...args) { return simContacts._dentVehicle.apply(this, args); }

  _boundary(...args) { return simCrash._boundary.apply(this, args); }

  _practiceRecoveryPose(...args) { return simCrash._practiceRecoveryPose.apply(this, args); }

  _safeReset(...args) { return simCrash._safeReset.apply(this, args); }

  _flockBonuses(...args) { return simLaps._flockBonuses.apply(this, args); }

  _newPursuit(...args) { return simPolice._newPursuit.apply(this, args); }

  _policePace(...args) { return simPolice._policePace.apply(this, args); }

  _movePolice(...args) { return simPolice._movePolice.apply(this, args); }

  _police(...args) { return simPolice._police.apply(this, args); }

  _awardPoliceEscape(...args) { return simPolice._awardPoliceEscape.apply(this, args); }

  _ticket(...args) { return simPolice._ticket.apply(this, args); }

  // Acknowledge the ticket screen and resume the stage (penalty already paid;
  // the pursuer leaves and won't re-trigger — one pursuer per stage).
  ackTicket() { return simPolice.ackTicket.call(this); }

  _rival(...args) { return simRival._rival.apply(this, args); }

  _ramFlight(...args) { return simRival._ramFlight.apply(this, args); }

  _crash(...args) { return simCrash._crash.apply(this, args); }

  _impact(...args) { return simCrash._impact.apply(this, args); }

  _crushProps(...args) { return simContacts._crushProps.apply(this, args); }

  _jump(...args) { return simDriving._jump.apply(this, args); }

  _advanceLaps(...args) {
    if (args[0] === this.state && onHiddenRoad(this.course, this.state)) return;
    return simLaps._advanceLaps.apply(this, args);
  }

  _advanceRushGates(...args) { return simLaps._advanceRushGates.apply(this, args); }

  _objectiveResult(...args) { return simResults._objectiveResult.apply(this, args); }

  _deadline(...args) { return simResults._deadline.apply(this, args); }

  _finishStage(...args) { return simResults._finishStage.apply(this, args); }

  nextStage() { return simResults.nextStage.call(this); }

  // ---- input helpers ---------------------------------------------------
  _callout(text, seconds = 2.2) { this.state.callout = text; this.state.calloutTimer = seconds; }
  setInput(partial) {
    const input = this.state.input;
    for (const key of ['throttle', 'brake', 'steer']) {
      if (Number.isFinite(partial[key])) input[key] = Math.max(key === 'steer' ? -1 : 0, Math.min(1, partial[key]));
    }
    for (const key of ['boost', 'shiftUp', 'shiftDown']) if (partial[key] != null) input[key] = !!partial[key];
    if (partial.interact != null && this.state.footTransition)
      input.interact = !!partial.interact;
  }

  // FOOT-03 supplies walking controls here; the car still owns race progress.
  setFighterInput(partial = {}) {
    if (!this.state.onFoot || !this.state.fighter) return false;
    const input = this.state.fighterInput;
    for (const key of ['forward', 'back', 'left', 'right', 'sprint', 'jump',
      'fire', 'aim'])
      if (partial[key] != null) input[key] = !!partial[key];
    for (const key of ['lookX', 'lookY'])
      if (Number.isFinite(partial[key])) input[key] = partial[key];
    return true;
  }
}
