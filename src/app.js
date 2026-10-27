import {landedArrival} from './heli/heli-ui.js';
import {DRIVE_LESSON_CORNERS,DRIVE_LINE_ROWS,DRIVE_GEAR_ROWS,DRIVE_SNOW_ROWS,buildInstructorRun} from './lessons/drive-lessons.js';
import {finishDriveLesson,driveLessonAccess} from './lessons/drive-lesson-save.js';
import {DRIVE_RADIO_LINES} from './lessons/drive-radio-lines.js';
import {createRadioChain} from './lessons/radio-voice.js';
import {mountDriveLessonUi,driveLessonCompletion,settleDriveLessonPreparation,driveLessonGhostPose,driveLessonBoardModel,DRIVE_LESSON_VIEW} from './lessons/drive-lesson-ui.js';
// DRIVE-LESSONS-VIEW-2: each lesson's course rows (lesson 1's are DRIVE_LESSON_CORNERS).
const DRIVE_LESSON_TABLES=Object.freeze({corner:DRIVE_LESSON_CORNERS,line:DRIVE_LINE_ROWS,gears:DRIVE_GEAR_ROWS,snow:DRIVE_SNOW_ROWS});
import {racingLineFor,buildSpeedProfile} from './race-lines.js';
import {unstuckInput} from './demo-unstuck.js';
import {intelLevel,recordIntelLap,purchaseIntel} from './intel-levels.js';
import {CUPS, normalizeCups, cupStandings, beginCup, recordCupRace, abandonCup} from './grand-prix-cups.js';
import {settleCup} from './progression.js';
import {isSummitAttack} from './summit-attack.js';
import {velocity as audioActorVelocity} from './combat-weapons.js';
import {hash32,validYetiSeed,isYetiGrandPrixInput} from './yeti.js';
import {chosenRaceLaps, supportsLapChoice, raceDistance} from './lap-choice.js';
import {labOf} from './lab/lab-save.js'; // LAB-TUNE
import {seedStockLaps, settleTunedLap, ruleSetOf} from './lab/lab-tune.js'; // LAB-TUNE
import {usableTune} from './lab/tune-view.js'; // LAB-TUNE-VIEW
import {deepDiscoverySnapshot,rememberDeep,rememberChart} from './deep/deep-discovery.js'; // DEEP-EXPLORER: chart save hook
// DEEP-SIRENA-VIEW: the story's finds, logs and pearls are paid and saved here.
import {raiseFind} from './deep/deep-sirena.js';
import {recordLogged,recordPearl,phoneLineFor} from './deep/deep-log.js';
import {createDeepAudio} from './deep/deep-audio.js';
import {createHeliSession, courseSite} from './heli/heli-session.js';
import {skiKeys, SKI_CAMERA_VIEWS, skiDeepSnow} from './ski/ski-view.js'; // SKI-VIEW: the ski keys and cameras
import {createLabLap} from './lab/lab-lap.js'; // LAB-VIEW
import {passLesson as labPassLesson} from './lab/lab-save.js'; // LAB-VIEW
import * as wildlifeRules from './wildlife.js';
import {fireOnNewDay, fireWorld} from './heli/heli-fire-run.js';
import {notePlayDay, buyBack as buyBackSave, fireOf} from './heli/heli-save.js';
import {courseClosed, closureCard, burnStage, burnSmoke, scarLooks} from './course-closures.js';
import {groundFromCourse} from './heli/heli-ground.js';
import {createHeliAudio} from './heli/heli-audio.js';
import {carAt} from './heli/heli-save.js';
// H2 Fire: the crackle (more burning and nearer, within 400 m), the scoop
// and the pour, each 0 to 1, from the helicopter's view.
function fireSounds(view) {
  const fire = view.fire, here = fire && fire.courseId === view.courseId && fire.target;
  const crackle = here ? Math.min(1, .25 + fire.cells / 40) * Math.max(0, 1 - fire.target.distance / 400) : 0;
  return {crackle, scoop: (view.bucket?.filling ?? 0) / 100, pour: view.bucket?.pouring ? 1 : 0, retardant: view.bucket?.contents === 'retardant'};
}
// H2 Fire: today's date as the play day note reads it.
const todayString = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
import {isAirOnlyCar,HOME_COURSE,HELI_DESTINATIONS} from './heli/heli-jobs.js';
// MAP-VIEW: the pilot's map.
import {SECRET_IDS} from './heli/map-secrets.js';
import {CIRCUIT_MANIFESTS} from './circuit-manifests.js';
import {markDeepHintsShown, purchaseDeepKit as buyDeepKit} from './deep/deep-hints.js';
import {purchaseWeaponUpgrade,purchaseArsenalWeapon as buyArsenalWeapon,getProfileWeapons,WEAPON_IDS} from './weapon-upgrades.js';
import {getCarLoadout,equipCarWeapon as equipCarWeaponSlot} from './car-loadout.js';
import {selectedCrewId,selectCrew as chooseCrew} from './crew.js';
import {purchaseArmorKit, equipArmorKit, getEquippedArmorKit, getEquippedRoofLook, getRoadRoofLook, equipRoadRoof} from './armor-kits.js';
import {CAMERA_MODES,normalizeCameraMode} from './camera-views.js';
// app.js — owns the Duel instance, the rAF/step loop, keyboard input, the
// scripted autopilot, dev hooks, and window.__game. Rendering (render3d.js) and
// DOM HUD (main.js) are views that read state and call these verbs.

import {hiddenRoadDiscoverySnapshot} from './hidden-road-discovery.js';
import {featureFlags} from './feature-flags.js';
import {arenaVenueAvailable, raceFeatureFlags, wastelandRulesActive, wastelandUnlocked} from './wasteland-access.js';
import {ARENA_VENUES} from './arena/venues.js';
import {ARENA_FIELD} from './arena/arena-event.js';
import {settleArenaResult} from './arena/arena-settlement.js';
import {settleWarlordResult} from './arena/warlord-settlement.js';
import {startWarlordEvent, beginWarlordEvent} from './arena/warlord-event.js';
import {BUILT_WARLORD_IDS, warlordUnlockSatisfied} from './warlords.js';
import {warlordEnabled} from './warlords/index.js';
import { Duel } from './game.js';
import { Course } from './course.js';
import { seedFromUrl } from './rng.js';
import { DRIVE, COURSE, CARS, DEFAULT_CPU_DIFFICULTY, steeringYawAuthority, steerForYaw, TYRE_SLIP, tyreSlipSteering, launchScale } from './config.js';
import { EngineAudio } from './audio.js';
import { loadPlayers, savePlayers, PLAYERS_KEY, playerName, activePlayer, createPlayer, selectPlayer, replacePlayerProfile, settleRace, settlePoliceFine, purchaseUpgrade, unlockCar, getUpgradeLevels, isCarUnlocked, CPU_REWARDS } from './progression.js';
import {loadLeaderboard,saveLeaderboard,recordFinish,mergeLeaderboards} from './leaderboard.js';
import {LapTelemetryRecorder,LapTelemetryStore,telemetryRoute} from './lap-telemetry.js';
import {courseFingerprint} from './track-analysis.js';
import {referenceLap} from './reference-laps.js';
import {loadGhosts,saveGhosts,findGhost,ghostKey,mergeGhostStores,storeGhost,GhostRecorder,GrandPrixLapRecorder,sampleGhost,createTeamGhost,sampleTeamGhost,readGhostEnabled,saveGhostEnabled} from './ghost.js';
import {getPaintAppearance,purchasePaint as buyPaint,applyPaint as equipPaint} from './paint-presets.js';
import {DEFAULT_ROUTE_VARIANT,isRouteVariant,getRouteVariant,getRouteVariantForSeed,supportsRouteVariants} from './route-variants.js';
import {normalizeLightingMood} from './lighting-moods.js';
import {DEFAULT_RACE_SETTINGS,normalizeRaceSettings,raceSettingsChoices,raceSettingsStage} from './race-settings.js';
import {grandPrixCourse} from './race-field.js';
import {pitTransitTarget} from './pit-lane.js';
import {createKeyboardSteering,createKeyboardThrottle,keyboardSteeringDirection} from './keyboard-steering.js';
import {INPUT_CONTEXTS,keyboardAction,heldInput,gamepadEdgeActions,carGamepadDrive,
  footGamepadInput,footControlInput,preventCarKeyDefault,heliControls} from './input-contexts.js';
import {getEquippedDriverId,isDriverUnlocked,normalizeDriverId,purchaseDriver as buyDriver,selectDriver as equipDriver} from './drivers.js';
import {isCourseUnlocked,purchaseCourse as buyCourse} from './course-access.js';
import {courseHasWinterSurfaces} from './race-surfaces.js';
import {collectMuddyHollowHubcap, discoverMuddyHollow,
  muddyHollowSnapshot} from './wasteland-progress.js';

// Reward recovery must use durable evidence, never loadPlayers' synthesized
// fallback. Validate every profile before savePlayers normalizes the registry.
function validWarlordRegistry(registry) {
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(registry) || registry.version !== 2 || !Array.isArray(registry.players) ||
      registry.players.length === 0) return false;
  const ids = new Set(), names = new Set();
  for (const player of registry.players) {
    const profile = player?.profile, name = playerName(player?.name);
    const carsValid = profile?.version === 1 && profile.unlockedCars === undefined ||
      Array.isArray(profile?.unlockedCars) && profile.unlockedCars.every(id =>
        typeof id === 'string' && Object.hasOwn(CARS, id));
    const careerValid = profile?.version === 1 && profile.wasteland === undefined ||
      record(profile?.wasteland) && profile.wasteland.version === 1;
    if (!record(player) || typeof player.id !== 'string' || !/^[\w-]{1,80}$/.test(player.id) ||
        ids.has(player.id) || !name || name !== player.name || names.has(name.toLowerCase()) ||
        !record(profile) || ![1, 2].includes(profile.version) ||
        !Number.isSafeInteger(profile.credits) || profile.credits < 0 ||
        !carsValid || !careerValid) return false;
    ids.add(player.id); names.add(name.toLowerCase());
  }
  return ids.has(registry.activePlayerId);
}
function readWarlordRegistry() {
  try {
    const storage = globalThis.localStorage;
    if (!storage || typeof storage.getItem !== 'function') return {status: 'invalid'};
    const raw = storage.getItem(PLAYERS_KEY);
    if (raw === null) return {status: 'absent'};
    if (typeof raw !== 'string' || !validWarlordRegistry(JSON.parse(raw))) return {status: 'invalid'};
    return {status: 'ready', registry: loadPlayers({getItem: key => key === PLAYERS_KEY ? raw : null})};
  } catch { return {status: 'invalid'}; }
}
const warlordHold = (profile, id) => {
  const hold = profile?.wasteland?.territories?.[id]?.hold;
  return Number.isSafeInteger(hold) ? Math.max(0, Math.min(100, hold)) : 0;
};

const SIMULATION_STEP = 1 / 120;
export const ROUTE_PREFERENCE_KEY='duel_route_variant';
function readRoutePreference(){try{const value=globalThis.localStorage?.getItem(ROUTE_PREFERENCE_KEY);return isRouteVariant(value)?value:DEFAULT_ROUTE_VARIANT;}catch{return DEFAULT_ROUTE_VARIANT;}}

export class App {
  constructor({deepProviders=[]}={}) {
    const url = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams('');
    const urlSeed=url.has('seed')?seedFromUrl():null,urlRoute=getRouteVariantForSeed(urlSeed);
    this.menuRouteId=urlRoute?.id||readRoutePreference();this._customMenuSeed=urlSeed!=null&&!urlRoute?urlSeed:null;
    this.seed = this._customMenuSeed??getRouteVariant(this.menuRouteId).seed;
    this.autopilot = url.get('autopilot') === '1';
    // Races and race sound see the Wasteland switch only for a player who found
    // the gate; menus ask wastelandUnlocked() about the current player instead.
    const raceFlags = raceFeatureFlags(featureFlags, () => this.duel?.state);
    this.duel = new Duel({
      featureFlags: raceFlags,
      deepProviders,
      seed: this.seed,
      difficulty: url.get('diff') || undefined,
      car: url.get('car') || undefined,
    });
    this.keys = {};
    this._footPointer={lookX:0,lookY:0,fire:false,aim:false};
    this._footPointerReleasedAt=-Infinity;
    this._keyboardSteering=createKeyboardSteering();
    this._arenaKeyboardSteering=createKeyboardSteering({arena:true});
    this._keyboardThrottle=createKeyboardThrottle();
    this._keyboardArena=null;
    this.players=loadPlayers();this.player=activePlayer(this.players);this.profile=this.player.profile;
    this._fireCourses=new Map();
    this._legacyRaceDefaults={...DEFAULT_RACE_SETTINGS,routeVariant:readRoutePreference(),lightingMood:readLightingMood(),ghostEnabled:readGhostEnabled()};
    // Capture old browser preferences once for every existing legacy player.
    // Later global compatibility writes cannot change another player's setup.
    if(this.players.players.some(player=>!player.profile.raceSettings)) {
      this.players={...this.players,players:this.players.players.map(player=>player.profile.raceSettings?player:{...player,profile:{...player.profile,raceSettings:normalizeRaceSettings(this._legacyRaceDefaults,player.profile)}})};
      this.player=activePlayer(this.players);this.profile=this.player.profile;this.profileSaved=savePlayers(this.players);
    }
    this._rememberWarlordOwner();
    this._noteFirePlayDay();
    this._lapChoices = new Map();
    this.leaderboard=loadLeaderboard();this.cpuDifficulty=DEFAULT_CPU_DIFFICULTY;
    this.lapTelemetry=new LapTelemetryStore();this.lapTelemetryRecorder=null;this.ghosts=loadGhosts();this.ghostEnabled=readGhostEnabled();this.ghostPose=null;this.ghostRecord=null;this.ghostRecorder=null;this.ghostStatus='none';this._ghostPoseBuffer={};
    this.ambientOcclusionEnabled=readGraphicsQuality()!=='performance';
    this.lightingMood=readLightingMood();
    this.menuStage = 0;
    const preferenceOverrides={};if(urlRoute)preferenceOverrides.routeVariant=urlRoute.id;if(url.has('car'))preferenceOverrides.car=url.get('car');if(url.has('diff'))preferenceOverrides.difficulty=url.get('diff');
    this._restoreRaceSettings({overrides:preferenceOverrides,customSeed:this._customMenuSeed});
    this._menuCourses=new Map();
    this._racePaint=null;this._racePaintCar=null;
    this.driftNotice=null;
    this.checkpointNotice=null;
    this.runId = null;
    this._markedRaceKey=null;this.interruptedRaceCharge=0;
    this._recoverInterruptedRace();
    this.cameraMode = 'chase';
    this.audio = new EngineAudio({flags: raceFlags});
    this.deepAudio = createDeepAudio({audio:this.audio});
    // The helicopter (docs/HELICOPTER.md): its own session and sound, used
    // only while a helicopter visit runs. The session's radio events are the
    // one source of instructor lines.
    this.heliSession = null; this.heliLog = []; this.heliCamera = 0; this.heliMapOpen = false; // MAP-VIEW: whether the pilot's map is open
    this.skiCamera = 0; this.skiHelp = false; // SKI-VIEW: the ski camera (C) and the ski help (H)
    this.heliAudio = createHeliAudio({audio: this.audio, autoRadio: false,
      enabled: () => this._switches().enabled('helicopter') === true});
    this.duel.onChange((state, event) => {
      this._syncHiddenRoadDiscovery();
      this.audio.event(event,state,this.duel.course);
      if(this.duel.drivingLesson){this._driveLessonEvent(state,event);return;}
      this.deepAudio.event(event,state);
      if(event.deepPhase&&state.deepJourney?.controlsLocked)this._clearHiddenRoadInput();
      if(event.deepCommitted)this._settleDeepDeparture(event.deepCommitted,state);
      if(event.deepCharted)this._settleDeepChart(event,state); // DEEP-EXPLORER
      if(event.deepRaised||event.deepLogged||event.deepPearl||event.deepPlace?.title)this._settleDeepStory(event,state); // DEEP-SIRENA-VIEW, DEEP-GO-LIVE
      if(event.deepReturn)this.returnToMenu();
      if (event.hiddenRoadPhase) this._discoverHiddenRoadGate(event.hiddenRoadPhase, state);
      if (event.hiddenRoadCommitted) this._settleHiddenRoadDeparture(event.hiddenRoadCommitted, state);
      if (event.muddyHollowDeparted)
        this._settleMuddyHollowDeparture(event.muddyHollowDeparted, state);
      if (event.muddyHollowHubcap)
        this._settleMuddyHollowHubcap(event.muddyHollowHubcap, state);
      if (event.hiddenRoadPhase && (state.hiddenRoadJourney?.controlsLocked ||
          state.hiddenRoadJourney?.phase === 'turned-back')) this._clearHiddenRoadInput();
      if(event.driftBanked||event.driftChainLost)this.driftNotice={type:event.driftBanked?'banked':'lost',...(event.driftBanked||event.driftChainLost),expiresAt:state.stageTimeSec+2};
      if(event.checkpointRushEvent)this.checkpointNotice={...event.checkpointRushEvent,expiresAt:state.stageTimeSec+2.5};
      if(event.ticket)this._settlePoliceTicket(event.ticket,state);
      if(event.arenaResult)this._settleArenaResult(event.arenaResult,state);
      if (event.stageResult) {
        this._settleResult(event.stageResult,state);
      }
      else if(event.gameover)this._settleResult(state.results||{},state);
      if(event.stageLoaded!=null){this._resetKeyboardInput();this._stageStartCrashes=state.majorCrashes;this._markedRaceKey=null;this.driftNotice=null;this.checkpointNotice=null;this._startGhostStage(state);this._startLapTelemetry(state);}
      if(event.go){this._markActiveRace(state);this.ghostRecorder?.observe(state);this.grandPrixLapRecorder?.observe(state);this.lapTelemetryRecorder?.observe(state);}
      if(event.qualifyingFlyingStart)this.lapTelemetryRecorder?.armQualifying(state);
      // The native final qualifying finish must be captured before stage reload.
      if(event.qualifyingLap)this._updateLapTelemetry(state);
      if(event.lapCompleted)this._recordIntelLap(event,state);
      if(event.lapCompleted && state.mode==='grandprix' && this._switches().enabled('grand-prix-career')===true){
        const lap=this.grandPrixLapRecorder?.complete(state,event,this.player);
        if(lap){
          const current=this.ghostSaved===false?this.ghosts:mergeGhostStores(this.ghosts,loadGhosts());
          const session=this.grandPrixGhostCandidate;
          const candidate=session?.key===lap.key&&session.timeSec<lap.timeSec?session:lap;
          const saved=storeGhost(current,candidate);this.ghosts=saved.store;
          if(saved.saved){
            this.grandPrixGhostSaveStatus='pending';this.grandPrixGhostCandidate=candidate;
            this._saveGhostStore(saved=>{
              this.grandPrixGhostSaveStatus=saved?'saved':'session';
              this.grandPrixGhostCandidate=saved?null:candidate;
            });
          }else if(saved.reason==='capacity'){
            this.grandPrixGhostCandidate=candidate;
            this.grandPrixGhostSaveStatus='capacity';
          }
        }
      }
      if(event.boundaryReset||event.recovered||event.checkpointReset){this.ghostRecorder?.discontinuity();this.grandPrixLapRecorder?.discontinuity();this.lapTelemetryRecorder?.discontinuity();}
      if(event.fighterExited||event.fighterEntered){
        this.inputContext=null;
        this.keys={};
        this._footPointer={lookX:0,lookY:0,fire:false,aim:false};
        if(event.fighterEntered && typeof document!=='undefined' &&
            document.pointerLockElement) document.exitPointerLock();
        // Capture the mouse as soon as the fighter steps out, so the mouse
        // looks around without a first click. The F press that got him out
        // still counts as a user action; if the browser refuses, a click works.
        if(event.fighterExited && typeof document!=='undefined' && !document.pointerLockElement){
          try{document.querySelector('#view3d canvas')?.requestPointerLock?.()?.catch?.(()=>{});}catch{}
        }
        this._resetKeyboardInput();
        this.duel.setInput({throttle:0,brake:0,steer:0,boost:false,interact:false});
      }
    });
    this._gamepadButtons = [];
    this.inputContext = null;
    this._stepAccumulator = 0;
    this.raf = 0;
    this.lastT = null;
    this.running = false;
    // LAB-VIEW: the Lab screen's open flag, and the G-force lap that reads the race (its pass is saved through labCommit).
    this._labOpen = false;
    this.labLap = createLabLap({onPass: () => this.labCommit((profile, flags) => labPassLesson(profile, 'gforce', {flags}), {anytime: true})});
    this._scriptedCrashDone = false;
    this._syncHiddenRoadDiscovery();
    this._bindKeys();
    this._exposeGlobals();
  }

  // ---- loop ------------------------------------------------------------
  start() {
    if (this.running) return;
    this.running = true;
    const loop = (t) => {
      if (!this.running) return;
      if (this.lastT == null) this.lastT = t;
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      dt = Math.min(0.1, Math.max(0, dt)); // bounded catch-up after a slow frame
      const diagnostics=this.frameDiagnostics;
      if(diagnostics?.active){
        const started=diagnostics.now();
        this._simulate(dt);const simulated=diagnostics.now();
        this._updateAudio();const sounded=diagnostics.now();
        this.onFrame?.(this.duel.state,dt);const presented=diagnostics.now();
        diagnostics.recordAppFrame(t,simulated-started,sounded-simulated,presented-sounded);
      }else{
        this._simulate(dt);
        this._updateAudio();
        this.onFrame?.(this.duel.state, dt);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; this.lastT = null; cancelAnimationFrame(this.raf); }
  // The renderer owns this gate. Headless callers need no visual gate, and
  // loading never changes the user's pause or replays elapsed loading time.
  claimVisualReadiness(owner){
    if(owner==null)return false;
    this._visualReadiness={owner,ready:false,state:null,course:null};this._stepAccumulator=0;this._resetKeyboardInput();return true;
  }
  holdVisualReadiness(owner){
    if(this._visualReadiness?.owner!==owner)return false;
    this._visualReadiness.ready=false;this._stepAccumulator=0;this._resetKeyboardInput();return true;
  }
  presentVisualFrame(owner,state,course){
    const gate=this._visualReadiness;
    if(gate?.owner!==owner||state!==this.duel.state||course!==this.duel.course)return false;
    gate.ready=true;gate.state=state;gate.course=course;
    this._stepAccumulator=0;this.lastT=null;return true;
  }
  releaseVisualReadiness(owner){
    if(this._visualReadiness?.owner!==owner)return false;
    this._visualReadiness=null;this._stepAccumulator=0;this.lastT=null;return true;
  }
  get visualReady(){
    const gate=this._visualReadiness;
    return !gate||gate.ready&&gate.state===this.duel.state&&gate.course===this.duel.course;
  }
  dispose(){
    this._clearDriveLesson();this._driveLessonUi?.dispose();
    this._leaveHeli();this.deepAudio.dispose();this.heliAudio.dispose();
    this.duel.clearDeep();
    this.duel.state.hiddenRoadJourney = null;
    this.stop();this._inputEvents?.abort();this.keys={};this._resetKeyboardInput();this.onFrame=null;
    this.frameDiagnostics?.stop();this.frameDiagnostics=null;
    this._visualReadiness=null;
    this._menuCourses.clear();this.ghostRecorder=this.ghostRecord=this.ghostPose=null;this.lapTelemetryRecorder=null;
    this.audio.setPaused(true);this.audio.context?.close?.()?.catch?.(()=>{});
    if(typeof window!=='undefined'&&window.__game?.duel===this.duel)delete window.__game;
  }
  _vehicleAudioSnapshot(state, course, listener) {
    if (!this._switches().enabled('rival-voices') || !course || !listener) return null;
    this._vehicleAudioIdentities ??= new WeakMap();
    const nearest = (actors, limit) => {
      if (!Array.isArray(actors)) return [];
      let indices = this._vehicleAudioIdentities.get(actors);
      if (!indices) {
        indices = new WeakMap();
        actors.forEach((actor, index) => indices.set(actor, index));
        this._vehicleAudioIdentities.set(actors, indices);
      }
      const rows = [];
      actors.forEach((actor, index) => {
        if (!indices.has(actor)) indices.set(actor, index);
        if (actor.alive === false || actor.wrecked || actor.crushed || actor.finished) return;
        const at = course.groundAt(actor.s, actor.lateral);
        const movement = audioActorVelocity(actor, at);
        const position = {x: at.x, y: at.y + 1.3 + (actor.airHeight || 0), z: at.z,
          vx: movement.x, vy: actor._verticalSpeed || 0, vz: movement.z};
        const distance = Math.hypot(position.x - listener.x, position.y - listener.y, position.z - listener.z);
        if (!Number.isFinite(distance) || distance > 250) return;
        rows.push({id: String(actor.id ?? indices.get(actor)), actor, group: actors,
          car: actor.car, revs: actor.revs, speedMph: actor.speedMph, position, distance});
      });
      return rows.sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, limit);
    };
    return {stage: course, rivals: nearest(state.opponents, 3), traffic: nearest(state.traffic, 4)};
  }

  _updateAudio() {
    const state = this.duel.state;
    const course = this.duel.course;
    const tunnel = course?.tunnelAt?.(state.s);
    const phase = course?.phase?.(state.s) ?? state.s;
    const inside = tunnel && Math.abs(state.lateral) <= tunnel.width &&
      (state.airHeight || 0) < tunnel.height;
    const tunnelMix = inside ? Math.max(0, Math.min(1,
      (phase - tunnel.start) / 12, (tunnel.end - phase) / 12)) : 0;
    const point = state.onFoot && state.fighter
      ? state.fighter : course?.groundAt?.(state.s, state.lateral);
    const heading = (point?.heading ?? point?.yaw ?? 0) + (state.onFoot ? 0 :
      (state.headingError || 0) + (state.slipAngle || 0) + (state.crashSpin || 0));
    const speed = state.onFoot ? (state.fighter?.speed || 0)
      : (state.speedMph || 0) * DRIVE.mphToWorld;
    const listener = point && {
      x: point.x,
      y: (point.y || 0) + 1.3 + (state.onFoot ? 0 : (state.airHeight || 0)),
      z: point.z,
      heading,
      vx: Math.sin(heading) * speed,
      vy: 0,
      vz: Math.cos(heading) * speed,
    };
    if (this.heliSession) {
      const view = this.heliSession.view();
      if (view.readout) this.heliAudio.update(view.readout, {ski: view.ski, deepSnow: skiDeepSnow(view.ski?.run)});
      if (this._fireOn()) this.heliAudio.fireBeds(fireSounds(view));
    }
    const deepEnvironment=this.duel.deepEnvironment();
    this.deepAudio.update(state,deepEnvironment);
    this.audio.update(state, {
      ...deepEnvironment,
      course,
      listener,
      ...(this._switches().enabled('rival-voices') ? {vehicles: this._vehicleAudioSnapshot(state, course, listener)} : {}),
      tunnel: tunnelMix,
      looseSurface: !!course?.def.offroad || !!course?.def.arena,
      biome: course?.themeAt(state.s),
      night: course?.def.timeOfDay === 'night',
      cameraMode: this.cameraMode,
    });
  }

  _simulate(seconds) {
    if(typeof document!=='undefined'){
      const host=document.querySelector('#stage');
      if(host&&!this._driveLessonUi)this._driveLessonUi=mountDriveLessonUi(this,host);
      this._driveLessonUi?.update();
    }
    this._syncHiddenRoadDiscovery();
    if(!this.visualReady){this._stepAccumulator=0;this._resetKeyboardInput();return;}
    this._stepAccumulator += seconds;
    while (this._stepAccumulator + 1e-10 >= SIMULATION_STEP) {
      if(!this.visualReady){this._stepAccumulator=0;this._resetKeyboardInput();break;}
      if(this.heliSession&&this.duel.state.status==='heli'){
        // The pad is read even while paused, so its Start button can resume.
        const pad=this._readGamepad(SIMULATION_STEP).pad;
        // SKI-VIEW: on skis the same keys are the ski keys; keys still held when the pilot climbs back in wait to be let go
        // (W would lift the collective).
        const skiing=this.heliSession?.phase==='skiing';
        if(skiing)this._skiKeysHeld=true;else if(this._skiKeysHeld&&!Object.values(this.keys).some(Boolean))this._skiKeysHeld=false;
        if(this.heliSession&&!this.duel.state.paused)this._heliEvents(this.heliSession.step(skiing?skiKeys(this.keys,pad):this._skiKeysHeld?{}:heliControls(this.keys,pad)));
        this._stepAccumulator = Math.max(0, this._stepAccumulator - SIMULATION_STEP);continue;
      }
      if(this.duel.state.status==='racing'&&!this.duel.state.paused)this._markActiveRace(this.duel.state);
      this._applyInput(SIMULATION_STEP);
      this.duel.step(SIMULATION_STEP);
      this.labLap.step(this.duel.state,this.duel.course); // LAB-VIEW: reads the race, never writes it
      this._updateGhost(this.duel.state);this._updateLapTelemetry(this.duel.state);
      this._driveLessonUi?.update();
      this._stepAccumulator = Math.max(0, this._stepAccumulator - SIMULATION_STEP);
    }
  }

  drivingLessonsAvailable(){
    return this._switches().enabled('driving-lessons')===true;
  }
  driveLessonProps(){
    const run=this.duel.drivingLesson,choices=this.getRaceChoices();
    return {corners:DRIVE_LESSON_CORNERS,courses:COURSE,cars:Object.entries(CARS).map(([id,car])=>({id,name:car.name})),
      ownedCourseIds:COURSE.filter(course=>isCourseUnlocked(this.profile,course)).map(course=>course.id),
      ownedCarIds:this.profile.unlockedCars,playerId:this.player?.id,progress:this.profile.drivingLessons,
      courseId:this.driveLessonCourse,carId:choices.car,difficulty:choices.difficulty,
      runPlayerId:run?.ownerId,lesson:run?.ownerId===this.player?.id?run.lesson:null,lessonSaveFailed:run?.rewarded===true&&run.saved===false};
  }
  // DRIVE-LESSONS-VIEW-2: the instructor board's props: the above plus lessons 2 to 4 (their rows, which course each is set to, and
  // whether each is open). The helipad's rows are lesson 1 alone and keep using driveLessonProps (a later card brings lessons 2 to 4 to the pad).
  driveLessonBoardProps(){
    const engineCurve=this._switches().enabled('engine-curve')===true;
    return {...this.driveLessonProps(),lessonRows:{line:DRIVE_LINE_ROWS,gears:DRIVE_GEAR_ROWS,snow:DRIVE_SNOW_ROWS},courseIds:this.driveLessonCourses,engineCurve,
      lessonAccess:Object.fromEntries(['line','gears','snow'].map(id=>[id,driveLessonAccess(this.profile.drivingLessons,id,{engineCurve})]))};
  }
  openDrivingLessons(){
    if(!this.drivingLessonsAvailable()||this.duel.state.status!=='menu'||!this.player?.id)return false;
    this.driveLessonBoardOpen=true;this.driveLessonMessage='';this._driveLessonUi?.update();return true;
  }
  async startLesson({courseId,lessonId='corner',car,difficulty}={}){
    this._refreshPlayer();
    const stageIndex=COURSE.findIndex(row=>row.id===courseId);
    if(this._driveLessonPreparing||!this.drivingLessonsAvailable()||this.duel.state.status!=='menu'||!this.driveLessonBoardOpen||
      !Object.hasOwn(DRIVE_LESSON_TABLES,lessonId)||!DRIVE_LESSON_TABLES[lessonId].some(row=>row.courseId===courseId)||!this.player?.id||
      !isCarUnlocked(this.profile,car)||!['casual','pro'].includes(difficulty))return false;
    if(this._airOnlyRefused(car,courseId)||this._fireClosedRefused(COURSE[stageIndex]))return false;
    const ownerId=this.player.id,driverId=getEquippedDriverId(this.profile),upgrades=getUpgradeLevels(this.profile,car);
    if(this.profile.drivingLessons!=null&&this.profile.drivingLessons.version!==1)return false;
    // DRIVE-LESSONS-VIEW-2: a later lesson must be open (the gearbox needs the engine curve); a lesson already done can be retaken.
    const engineCurve=this._switches().enabled('engine-curve')===true;
    if(lessonId!=='corner'&&(lessonId==='gears'&&!engineCurve||!driveLessonAccess(this.profile.drivingLessons,lessonId,{engineCurve}).open&&this.profile.drivingLessons?.done?.[lessonId]!==true))return false;
    const token={};this._driveLessonPreparing=token;this.driveLessonMessage=`Instructor is driving the ${{corner:'corner',line:'esses',gears:'stretch',snow:'snow corner'}[lessonId]}…`;this._driveLessonUi?.update();
    let baseline;
    try{baseline=await buildInstructorRun({courseId,car,upgrades,difficulty,driverId,seed:1989,lessonId});}
    catch(error){if(this._driveLessonPreparing===token){this._driveLessonPreparing=null;this.driveLessonMessage='The instructor could not complete a clean run. '+error.message;this._driveLessonUi?.update();}return false;}
    this._refreshPlayer();
    if(this._driveLessonPreparing!==token||!this.drivingLessonsAvailable()||!this.driveLessonBoardOpen||
      this.duel.state.status!=='menu'||this.player?.id!==ownerId||
      !isCarUnlocked(this.profile,car)||getEquippedDriverId(this.profile)!==driverId||
      JSON.stringify(getUpgradeLevels(this.profile,car))!==JSON.stringify(upgrades)||
      this._airOnlyRefused(car,courseId)||this._fireClosedRefused(COURSE[stageIndex])||
      lessonId==='gears'&&this._switches().enabled('engine-curve')!==true){
      settleDriveLessonPreparation(this,token,'Lesson setup changed. Choose the corner again.');
      this._driveLessonUi?.update();return false;
    }
    this._driveLessonPreparing=null;this.driveLessonBoardOpen=false;this.driveLessonMessage='';
    this._runPlayerId=ownerId;this.runId=null;this._cupRace=null;
    this.ghostRecorder=this.ghostRecord=this.ghostPose=this.grandPrixLapRecorder=this.lapTelemetryRecorder=null;
    this.ghostStatus='none';this.autopilot=false;this.keys={};this._resetKeyboardInput();this._stepAccumulator=0;
    const plan={...baseline,driverId,ownerId};
    this.audio.unlock();this.audio.setPaused(false);
    this._racePaint=getPaintAppearance(this.profile,car,{muddyHollowEnabled:true,yetiEnabled:this._switches().enabled('yeti'),labEnabled:this._switches().enabled('lab'),deepEnabled:this._switches().enabled('the-deep')});this._racePaintCar=car;
    this._sayDriveLesson(this.profile.drivingLessons?.done?.[lessonId]?'drive.radio.retake':DRIVE_LESSON_VIEW[lessonId].intro);
    this.duel.startCampaign({seed:1989,mode:'timetrial',car,difficulty,driverId,playerId:ownerId,
      startStage:stageIndex,upgrades,opponentCount:0,lesson:plan});
    this._driveLessonUi?.update();return true;
  }
  nextLessonAttempt(){
    const run=this.duel.drivingLesson;
    if(!run||!this.drivingLessonsAvailable()||this.player?.id!==run.ownerId||this._runPlayerId!==run.ownerId||
      this.duel.state.playerId!==run.ownerId||run.lesson.done||run.lesson.phase==='driving')return false;
    this.keys={};this._resetKeyboardInput();this._stepAccumulator=0;this.audio.setPaused(false);
    const started=this.duel.resetDriveLessonAttempt();this._driveLessonUi?.update();return started;
  }
  leaveLesson(){
    if(this.duel.drivingLesson){this._clearDriveLesson();this.returnToMenu();}
    else{this._driveLessonPreparing=null;this.driveLessonBoardOpen=false;this.driveLessonMessage='';}
    this._driveLessonUi?.update();return true;
  }
  _clearDriveLesson(){
    this._driveLessonPreparing=null;this.driveLessonBoardOpen=false;this.driveLessonMessage='';
    this.driveLessonRadioText='';this._driveLessonRadioEpoch=(this._driveLessonRadioEpoch||0)+1;
    this._driveLessonVoice?.stop();this._driveLessonVoice=null;this._driveLessonRadioChain?.dispose();this._driveLessonRadioChain=null;
    this._driveLessonRadioQueue=Promise.resolve();
    if(this.duel.drivingLesson?.lesson.id==='snow')delete this.duel.state.tyre; // the winter run's tyres do not outlast the lesson
    delete this.duel.drivingLesson;this.ghostPose=null;this.driveLessonMarkers=null;
  }
  _driveLessonEvent(state,event){
    const run=this.duel.drivingLesson;
    if(!run||state!==this.duel.state||this.player?.id!==run.ownerId||this._runPlayerId!==run.ownerId||state.playerId!==run.ownerId)return;
    const response=event.driveLessonAnswer;
    if(!response)return;
    if(response.radio&&response.result!=='passed')this._sayDriveLesson(response.radio);
    if(this.audio.context&&!this.audio.muted)for(const cone of response.cones||[])this.audio._playCue?.(cone.cue);
    const completion=response.result==='passed'?driveLessonCompletion(run,state,this.player.id):null;
    if(completion&&!run.rewarded){
      this._refreshPlayer();
      if(!driveLessonCompletion(run,state,this.player.id))return;
      const result=finishDriveLesson(this.profile,completion.id,completion.marginSeconds,completion.carId,{engineCurve:completion.id==='gears'}); // a gearbox lesson can only have run on the engine curve
      if(result.ok){
        this.profile=result.profile;run.saved=this._saveProfile();run.rewarded=true;run.reward=result.reward;
        this.driveLessonMessage=run.saved?'Lesson progress and reward saved.':
          'Lesson passed for this session. Progress and reward could not be saved. Keep the game open and retry saving; your last saved progress is unchanged.';
        if(run.saved)for(const id of [response.radio,...(response.queued||[])])if(id)this._sayDriveLesson(id); // the snow lesson's pass line follows the winter explanation
      }
      else this.driveLessonMessage=result.reason;
      if(this.audio.context&&!this.audio.muted)this.audio._playCue?.('interface.win');
    }
    this._driveLessonUi?.update();
  }
  retryLessonSave(){
    const run=this.duel.drivingLesson,state=this.duel.state;
    if(!run?.rewarded||run.saved!==false||this._runPlayerId!==this.player?.id||
      !driveLessonCompletion(run,state,this.player?.id))return false;
    run.saved=this._saveProfile();
    this.driveLessonMessage=run.saved?'Lesson progress and reward saved.':
      'Still unable to save. Progress and reward are available only in this session. Keep the game open and retry saving.';
    if(run.saved)for(const id of run.lesson.id==='snow'?['drive.radio.snow.winter.result','drive.radio.snow.pass']:['drive.radio.'+run.lesson.id+'.pass'])this._sayDriveLesson(id);
    this._driveLessonUi?.update();return run.saved;
  }
  _sayDriveLesson(id){
    if(!DRIVE_RADIO_LINES[id])return;
    this.driveLessonRadioText=DRIVE_RADIO_LINES[id].text;
    const epoch=this._driveLessonRadioEpoch||0;
    this._driveLessonRadioQueue=(this._driveLessonRadioQueue||Promise.resolve()).then(async()=>{
      await this.audio._loadCueBuffers?.();
      if(epoch!==(this._driveLessonRadioEpoch||0)||!this.duel.drivingLesson||!this.audio.context||this.audio.muted||this.audio.paused)return;
      this.audio._syncMixer?.();
      const target=this.audio.mixer?.output(id)||this.audio.buses?.voice||this.audio.master;
      const chain=this._driveLessonRadioChain??=createRadioChain(this.audio.context,target);
      chain.keyOn();
      await new Promise(resolve=>{
        this._driveLessonVoice=this.audio._playCue(id,{destination:chain.input,onEnd:()=>{chain.keyOff();resolve();}});
        if(!this._driveLessonVoice){chain.keyOff();resolve();}
      });
    }).catch(()=>{});
  }
  // DRIVE-LESSONS-VIEW-2: the lesson's own cues (the cone's knock, the shift lights' ticks).
  playDriveLessonCue(id){if(this.audio.context&&!this.audio.muted)this.audio._playCue?.(id);}
  getDriveLessonGhost(){
    const run=this.duel.drivingLesson;
    const winter=run?.lesson.id==='snow'&&run.lesson.stage==='winter'; // the winter-tyre run drives against the winter instructor
    if(!run||run.ownerId!==this.player?.id||this.duel.state.playerId!==run.ownerId||
      run.lesson.stage!=='challenge'&&!winter||run.lesson.phase!=='driving')return null;
    return driveLessonGhostPose((winter?run.plan.instructor.winter:run.plan.instructor).poses,run.lesson.attempt.elapsedSeconds,this.duel.state.car,this.duel.course);
  }

  startCampaign(options = {}) {
    if(this.duel.drivingLesson)this._clearDriveLesson();
    this._refreshPlayer();
    const stageIndex=Math.max(0,Math.min(COURSE.length-1,Math.floor(options.startStage??this.menuStage))),stage=COURSE[stageIndex];
    if(!isCourseUnlocked(this.profile,stage)){this.courseAccessMessage='Unlock this course with credits before starting.';return false;}
    this.courseAccessMessage='';
    this.helpVisible=false;
    this._settleAbandoned();
    const selectedCar=options.car||this.duel.state.car;
    const car=isCarUnlocked(this.profile,selectedCar)?selectedCar:'falcone_f42';
    if(this._airOnlyRefused(car,stage.id))return false;
    if(this._fireClosedRefused(stage))return false;
    this.duel.clearDeep(); // DEEP-EXPLORER: flush the old owner's chart before replacing runId/snapshot
    const driverId=isDriverUnlocked(this.profile,options.driverId)?normalizeDriverId(options.driverId):getEquippedDriverId(this.profile);
    const explicitSeed=Number.isSafeInteger(options.seed)?options.seed>>>0:null;
    // Keep legacy headless callers that set duel.seed before their first start.
    const legacySeed=this.duel.state.status==='menu'&&this.duel.seed!==this.seed?this.duel.seed>>>0:null;
    const selectedSeed=isRouteVariant(options.routeVariant)?getRouteVariant(options.routeVariant).seed:explicitSeed??legacySeed??this.getMenuSeed(stageIndex);
    this.seed=supportsRouteVariants(stage)?selectedSeed:1989;
    this._racePaint=getPaintAppearance(this.profile,car,{muddyHollowEnabled:true,yetiEnabled:this._switches().enabled('yeti'),labEnabled:this._switches().enabled('lab'),deepEnabled:this._switches().enabled('the-deep')});this._racePaintCar=car;this._raceRoof=getRoadRoofLook(this.profile,car,{yetiEnabled:this._switches().enabled('yeti')});
    this.runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this._settledMuddyHollowDeparture = null;
    this._stageStartCrashes=0;
    this._campaignStart=stageIndex;this._runPlayerId=this.player.id;
    this.cpuDifficulty=['easy','medium','hard'].includes(options.cpuDifficulty)?options.cpuDifficulty:this.cpuDifficulty;
    const mode=isSummitAttack(stage)?'timetrial':stage.practice||['chase','drift','checkpoint'].includes(stage.kind)||stage.stuntTrial?'duel':options.mode??this._raceSettings.mode;
    const yetiSeed=(stage.id==='summit-run'||isSummitAttack(stage))&&this._switches().enabled('summit-run')&&this._switches().enabled('yeti')
      ?hash32(this.seed,this.runId):undefined;
    const difficulty=options.difficulty??this.duel.state.difficulty;
    const laps=isSummitAttack(stage)?1:this.getLapChoice(stageIndex,mode,options.laps);
    if(this._switches().enabled('lap-choice')&&supportsLapChoice(stage,mode))
      this._lapChoices.set(this._lapChoiceKey(stageIndex,mode),laps);
    const rival=isSummitAttack(stage)?null:Object.hasOwn(options,'rival')?options.rival:this._raceSettings.rival;
    const cupState=normalizeCups(this.profile.cups),cupRun=cupState.version===1?cupState.active:null;
    const cupRound=this.cupsAvailable()&&cupRun?.ownerId===this.player.id&&mode==='grandprix'&&
      CUPS.find(cup=>cup.id===cupRun.cupId)?.events[cupRun.results.length]===stage.id&&
      cupRun.car===car&&cupRun.cpuDifficulty===this.cpuDifficulty&&cupRun.difficulty===difficulty&&
      options.qualifying!==true&&(options.fieldSize==null||options.fieldSize===7);
    if(cupRound)options={...options,fieldSeed:cupRun.fieldSeed,fieldSize:7};
    // A new field seed for every Grand Prix, so the same circuit does not always play out the same way.
    if(mode==='grandprix'&&options.fieldSeed==null)options={...options,fieldSeed:Math.floor(Math.random()*4294967296)>>>0};
    // Winter tyres count only where there is snow or ice to use them on.
    const tyre=options.tyre==='winter'&&courseHasWinterSurfaces(stage)?'winter':'summer';
    this._rememberRaceSettings({eventId:stage.id,mode,difficulty,car,rival,tyre,cpuDifficulty:this.cpuDifficulty,routeVariant:supportsRouteVariants(stage)?getRouteVariantForSeed(this.seed)?.id??this.menuRouteId:this.menuRouteId});
    this.menuStage=stageIndex;this.menuCar=car;
    this.audio.unlock();
    this.audio.setPaused(false);
    this.keys = {};
    this._resetKeyboardInput();
    this._stepAccumulator = 0;
    this._scriptedCrashDone = false;
    this.duel.startCampaign({...options,...(isSummitAttack(stage)?{opponentCount:0,qualifying:false}:{}),laps,tyre,yetiSeed,weaponLevels:getProfileWeapons(this.profile).levels,
      arsenalRank:this.profile.wasteland?.rank||1,
      weaponLoadout:this.wastelandUnlocked()?getCarLoadout(this.profile,this._arsenalOptions()):undefined,
      combatArmorKit:this.wastelandUnlocked() ? this._combatArmorKit(car) : null,
      combatRoofLook:this.wastelandUnlocked() ? getEquippedRoofLook(this.profile, car) : null,
      crewId:this.wastelandUnlocked()?selectedCrewId(this.profile,{warlordCardsEnabled:this._switches().enabled('warlord-cards') && this._switches().enabled('crew-gear')}):undefined,
      discoveredGate:this.getHiddenRoadDiscovery().discoveredGate,
      muddyHollowHubcaps:this.profile.wasteland?.muddyHollow?.hubcaps,
      deepKit:this.getDeepDiscovery().kit===true,deepFound:Object.freeze([...(this.getDeepDiscovery().found||[])]),deepSave:this.profile.deep??null,
      tune:this._labTuneOf(car), // LAB-TUNE
      rival,seed:this.seed,mode,difficulty,car,driverId,startStage:this._campaignStart,upgrades:getUpgradeLevels(this.profile,car),cpuDifficulty:this.cpuDifficulty,playerId:this.player.id});
    this._cupRace=cupRound&&this.duel.state.mode==='grandprix'&&this.duel.state.field?.size===8
      ?{seriesId:cupRun.id,ownerId:this.player.id,runId:this.runId,state:this.duel.state}:null;
    return true;
  }
  nextStage(){
    const state=this.duel.state;if(state.status!=='stage_result')return false;
    const next=!COURSE[state.stageIndex]?.kind?COURSE[state.stageIndex+1]:null;
    this._refreshPlayer();
    if(next&&!next.kind&&!isCourseUnlocked(this.profile,next)){this.courseAccessMessage=`Unlock ${next.name} from the menu to continue. Completed race credits are safe.`;return false;}
    this.courseAccessMessage='';
    if(next)this.duel._requestedLaps=this.getLapChoice(state.stageIndex+1,state.mode);
    this.duel.nextStage();return true;
  }
  _lapChoiceKey(stageIndex,mode){return `${this.player.id}|${COURSE[stageIndex]?.id}|${mode}`;}
  getLapChoice(stageIndex=this.menuStage,mode=this._raceSettings.mode,requested){
    return chosenRaceLaps(COURSE[stageIndex],mode,requested??this._lapChoices?.get(this._lapChoiceKey(stageIndex,mode)),this._switches().enabled('lap-choice'));
  }
  setLapChoice(laps){
    const {startStage,mode}=raceSettingsChoices(this._raceSettings);
    if(this.duel.state.status!=='menu'||!this._switches().enabled('lap-choice')||!supportsLapChoice(COURSE[startStage],mode))return false;
    this._lapChoices.set(this._lapChoiceKey(startStage,mode),this.getLapChoice(startStage,mode,laps));
    return this.getRaceChoices();
  }
  getRaceChoices(){
    const choices=raceSettingsChoices(this._raceSettings);
    if(this._switches().enabled('lap-choice')&&supportsLapChoice(COURSE[choices.startStage],choices.mode))
      choices.laps=this.getLapChoice(choices.startStage,choices.mode);
    return choices;
  }
  _restoreRaceSettings({defaultsOnly=false,overrides={},customSeed=null}={}){
    const saved=defaultsOnly?DEFAULT_RACE_SETTINGS:this.profile.raceSettings||this._legacyRaceDefaults;
    this._applyRaceSettings(normalizeRaceSettings({...saved,...overrides},this.profile),customSeed);
  }
  _applyRaceSettings(settings,customSeed=this._customMenuSeed){
    this._footCameraMode=settings.footCamera;
    this._raceSettings=settings;this.menuStage=raceSettingsStage(settings);this.menuCar=settings.car;this.menuRouteId=settings.routeVariant;this._customMenuSeed=customSeed;
    this.cpuDifficulty=settings.cpuDifficulty;this.ghostEnabled=settings.ghostEnabled;this.lightingMood=settings.lightingMood;
    this.seed=this.getMenuSeed();this.duel.seed=this.seed;this.duel.carKey=settings.car;this.duel.difficultyKey=settings.difficulty;
    Object.assign(this.duel.state,{seed:this.seed,car:settings.car,driverId:getEquippedDriverId(this.profile),difficulty:settings.difficulty,cpuDifficulty:settings.cpuDifficulty,mode:settings.mode});
  }
  _rememberRaceSettings(patch={}){
    const settings=normalizeRaceSettings({...this._raceSettings,routeVariant:this.menuRouteId,lightingMood:this.lightingMood,ghostEnabled:this.ghostEnabled,...patch},this.profile);
    this._raceSettings=settings;
    if(JSON.stringify(this.profile.raceSettings)!==JSON.stringify(settings)){this.profile={...this.profile,raceSettings:settings};this._saveProfile();}
    return settings;
  }
  setRaceSettings(patch={}){
    if(this.duel.state.status!=='menu'||!patch||typeof patch!=='object')return false;
    this._refreshPlayer();const values={...patch};if(Object.hasOwn(values,'startStage'))values.eventId=COURSE[values.startStage]?.id||COURSE[0].id;
    const settings=this._rememberRaceSettings(values);
    const customSeed=Object.hasOwn(values,'routeVariant')?null:this._customMenuSeed;
    this._applyRaceSettings(settings,customSeed);this.duel.emit({raceSettingsChanged:true});return this.getRaceChoices();
  }
  restart() {
    if(this.duel.drivingLesson)return this.nextLessonAttempt();
    // A helicopter visit has no run to restart; the pause menu leaves it.
    if (this.duel.state.status === 'heli') return false;
    if (this.duel.state.arena?.mode === 'warlord')
      return this.startWarlordFight(this.duel.state.arena.warlordId);
    if (this.duel.state.arena) return this.startArenaEvent({
      mode: this.duel.state.arena.mode, venueId: this.duel.state.arena.venueId,
    });
    if (this.duel.state.hiddenRoadVisit) {
      this.returnToMenu();
      return this.visitWasteland();
    }
    const { mode, car, difficulty,cpuDifficulty,driverId } = this.duel.state;
    this.startCampaign({ mode, car, difficulty,cpuDifficulty,driverId,laps:this._lapChoices?.get(this._lapChoiceKey(this._campaignStart||0,mode)),rival:this.duel.state.rivalSettings,
      opponentCount:this.duel.state.opponentCount,fieldSize:this.duel.state.opponentCount,seed:this.duel.state.seed,startStage:this._campaignStart||0 });
  }
  getMenuSeed(stageIndex=this.menuStage){return supportsRouteVariants(COURSE[stageIndex])?(this._customMenuSeed??getRouteVariant(this.menuRouteId).seed):1989;}
  // Menu views share these immutable-by-convention previews; racing always builds its own Course.
  getMenuCourse(stageIndex=this.menuStage){
    const index=Number.isInteger(stageIndex)&&COURSE[stageIndex]?stageIndex:0,seed=this.getMenuSeed(index),hiddenRoad=this._switches().enabled('hidden-road')&&!!this.player&&this.getHiddenRoadDiscovery().discoveredGate,key=`${index}:${seed}${hiddenRoad ? ':hidden-road' : ''}`;
    let course=this._menuCourses.get(key);
    if(course)this._menuCourses.delete(key);else course=new Course(COURSE[index],seed,{hiddenRoad});
    this._menuCourses.set(key,course);
    if(this._menuCourses.size>12)this._menuCourses.delete(this._menuCourses.keys().next().value);
    return course;
  }
  getMenuRouteLabel(stageIndex=this.menuStage){return supportsRouteVariants(COURSE[stageIndex])?(this._customMenuSeed!=null?'Custom route':getRouteVariant(this.menuRouteId).label):'Fixed route';}
  setRouteVariant(id){
    if(this.duel.state.status!=='menu'||!isRouteVariant(id))return false;
    this.setRaceSettings({routeVariant:id});
    try{globalThis.localStorage?.setItem(ROUTE_PREFERENCE_KEY,id);}catch{}
    this.duel.emit({routeChanged:true});return true;
  }
  getGhostRecord(options={}){
    const stageIndex=options.startStage??options.stageIndex??this.menuStage;
    if(COURSE[stageIndex]?.practice)return null;
    return findGhost(this.ghosts,this.player.id,{seed:this.getMenuSeed(stageIndex),car:this.duel.state.car,driverId:getEquippedDriverId(this.profile),difficulty:this.duel.state.difficulty,cpuDifficulty:this.cpuDifficulty,...options,stageIndex,laps:COURSE[stageIndex]?.laps||2});
  }
  getGrandPrixGhostRecord(options={}){
    if(!this._switches().enabled('grand-prix-career'))return null;
    const stageIndex=options.startStage??options.stageIndex??this.menuStage;
    const context={seed:this.getMenuSeed(stageIndex),car:this.duel.state.car,
      driverId:getEquippedDriverId(this.profile),difficulty:this.duel.state.difficulty,
      cpuDifficulty:this.cpuDifficulty,...options,stageIndex,laps:1,mode:'grandprix'};
    const saved=findGhost(this.ghosts,this.player.id,context),candidate=this.grandPrixGhostCandidate;
    const session=candidate?.key===ghostKey(this.player.id,context)?candidate:null;
    return session&&(!saved||session.timeSec<saved.timeSec)?session:saved;
  }
  getPaintPreset(car,{menu=false}={}){
    if(menu||this.duel.state.status==='menu')return getPaintAppearance(this.profile,car,
      {muddyHollowEnabled:true,yetiEnabled:this._switches().enabled('yeti'),labEnabled:this._switches().enabled('lab'),deepEnabled:this._switches().enabled('the-deep')});
    return car===this._racePaintCar?this._racePaint:null;
  }
  getRoofLook(car,{menu=false}={}){
    if(!this._switches().enabled('yeti'))return null;
    return menu||this.duel.state.status==='menu'?getRoadRoofLook(this.profile,car,{yetiEnabled:true}):
      car===this._racePaintCar?this._raceRoof:null;
  }
  selectRoofLook(car,id){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before changing roof looks.'};
    this._refreshPlayer();const selected=equipRoadRoof(this.profile,car,id,{yetiEnabled:this._switches().enabled('yeti')});
    if(selected.ok&&selected.profile!==this.profile){this.profile=selected.profile;this._saveProfile();this.duel.emit({garage:true});}
    return selected;
  }
  purchasePaint(car,id){return this._paintOperation(car,id,true);}
  applyPaint(car,id){return this._paintOperation(car,id,false);}
  _paintOperation(car,id,buy){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before changing paint.',cost:0};
    this._refreshPlayer();const result=(buy?buyPaint:equipPaint)(this.profile,car,id,
      {muddyHollowEnabled:true,yetiEnabled:this._switches().enabled('yeti'),labEnabled:this._switches().enabled('lab'),deepEnabled:this._switches().enabled('the-deep')});
    if(result.ok&&result.changed){this.profile=result.profile;this._saveProfile();this.duel.emit({garage:true,paintChanged:true});
      if(result.purchased&&car==='falcone_sirena'&&id==='restored-1966'){this._labRestoreBody=true;this.openLab();}
    }return result;
  }
  getTeamGhostRecord(options = {}) {
    if (this._switches().enabled('grand-prix') !== true) return null;
    const state = this.duel.state, stageIndex = options.startStage ?? options.stageIndex ?? this.menuStage;
    const stage = COURSE[stageIndex], mode = options.mode ?? state.mode;
    if (!stage || stage.practice || stage.closed === false || mode !== 'timetrial' || this.getIntelLevel(stage.id) < 4) return null;
    const active = state.status !== 'menu' && state.stageIndex === stageIndex;
    const seed = options.seed ?? (active ? state.seed : this.getMenuSeed(stageIndex));
    const route = telemetryRoute(stage.id, seed), reference = referenceLap(stage.id, route);
    if (!reference?.poseSamples) return null;
    const course = active ? this.duel.course : this.getMenuCourse(stageIndex);
    const laps = options.laps ?? (active ? state.lapsTotal : this.getLapChoice(stageIndex, 'timetrial'));
    const cached = this._teamGhostView;
    if (cached?.course === course && cached.reference === reference && cached.laps === laps) return cached.record;
    const record = createTeamGhost(reference, {eventId:stage.id,route,length:course.length,
      courseFingerprint:courseFingerprint(course,{route}),laps});
    this._teamGhostView = {course,reference,laps,record};return record;
  }
  getGhostChoices(options = {}) {
    return this.getTeamGhostRecord(options) ? ['off','my-best','team'] : ['off','my-best'];
  }
  getGhostChoice(options = {}) {
    if (this._switches().enabled('grand-prix') !== true) return this.ghostEnabled ? 'my-best' : 'off';
    const choice = this.profile.intel?.version === 1 ? this.profile.intel.ghostChoice : null;
    return choice === 'off' ? 'off' : choice === 'team' && this.getTeamGhostRecord(options) ? 'team' :
      choice === 'my-best' || choice === 'team' ? 'my-best' : this._raceSettings.ghostEnabled === false ? 'off' : 'my-best';
  }
  setGhostChoice(choice, options = {}) {
    if (this.duel.state.status !== 'menu' || this._switches().enabled('grand-prix') !== true)
      return {ok:false,reason:'Return to the menu before choosing a ghost.'};
    this._refreshPlayer();
    if (this.profile.intel?.version > 1 || !this.getGhostChoices(options).includes(choice))
      return {ok:false,reason:'This ghost is unavailable.'};
    const intel = this.profile.intel ?? {version:1,events:{}};
    this.profile = {...this.profile,intel:{...intel,ghostChoice:choice}};
    this.ghostEnabled = choice !== 'off';
    this._rememberRaceSettings({ghostEnabled:this.ghostEnabled});
    const saved = this._saveProfile();
    this.duel.emit({ghostChanged:true});return {ok:true,choice,saved};
  }
  cycleGhostChoice(options = {}) {
    const choices = this.getGhostChoices(options), current = this.getGhostChoice(options);
    return this.setGhostChoice(choices[(choices.indexOf(current)+1)%choices.length],options);
  }
  setGhostEnabled(enabled) {
    this._refreshPlayer();this.ghostEnabled = !!enabled;
    if (this._switches().enabled('grand-prix') === true && this.profile.intel?.version === 1 && Object.hasOwn(this.profile.intel,'ghostChoice')) {
      const intel = this.profile.intel ?? {version:1,events:{}};
      this.profile = {...this.profile,intel:{...intel,ghostChoice:enabled?'my-best':'off'}};
      this._saveProfile();
    }
    this._rememberRaceSettings({ghostEnabled:this.ghostEnabled});saveGhostEnabled(this.ghostEnabled);
    this._updateGhost(this.duel.state);this.duel.emit({ghostChanged:true});return this.ghostEnabled;
  }
  getLapTelemetry({eventId=COURSE[this.menuStage]?.id,route,courseFingerprint:fingerprint}={}){
    if(!this._switches().enabled('grand-prix'))return {lap:null,status:'off',message:''};
    const stageIndex=COURSE.findIndex(stage=>stage.id===eventId);
    const active=this.duel.state.status!=='menu'&&this.duel.state.stageIndex===stageIndex;
    const selectedRoute=route??telemetryRoute(eventId,active?this.duel.state.seed:this.getMenuSeed(stageIndex));
    if(stageIndex<0||!selectedRoute||!this.player)return {lap:null,status:'unavailable',message:'Lap comparison is unavailable for this route.'};
    if(!fingerprint){
      const course=this.duel.state.status!=='menu'&&this.duel.state.stageIndex===stageIndex?this.duel.course:this.getMenuCourse(stageIndex);
      fingerprint=courseFingerprint(course,{route:selectedRoute});
    }
    return this.lapTelemetry.best({playerId:this.player.id,eventId,route:selectedRoute,courseFingerprint:fingerprint});
  }
  _startLapTelemetry(state){
    if(this.duel.drivingLesson)return;
    this.lapTelemetryRecorder=null;
    if(!this._switches().enabled('grand-prix')||!this.runId||!this.player||
      this._runPlayerId!==this.player.id||state.playerId!==this.player.id||COURSE[state.stageIndex]?.practice||
      this.duel.course?.closed===false)return;
    this.lapTelemetryRecorder=new LapTelemetryRecorder({course:this.duel.course,playerId:this.player.id,
      playerName:this.player.name,seed:state.seed,stageIndex:state.stageIndex,car:state.car,driverId:state.driverId,
      mode:state.mode,difficulty:state.difficulty,cpuDifficulty:state.cpuDifficulty,
      upgrades:{...state.upgrades},tyre:state.tyre});
  }
  _updateLapTelemetry(state){
    if(this.duel.drivingLesson)return;
    if(!this._switches().enabled('grand-prix')){this.lapTelemetryRecorder=null;return;}
    const record=this.lapTelemetryRecorder?.observe(state);
    if(record)this.lapTelemetry.record(record);
    if(['stage_result','gameover','complete','menu'].includes(state.status))this.lapTelemetryRecorder=null;
  }
  _startGhostStage(state){
    if(this.duel.drivingLesson)return;
    this.ghostPose=null;this.ghostRecord=null;this.ghostRecorder=null;this.ghostStatus='none';
    this.grandPrixLapRecorder=null;
    if(this._switches().enabled('grand-prix-career')===true&&state.mode==='grandprix'&&state.qualifying?.phase!=='driving'&&this._runPlayerId===this.player.id&&state.playerId===this.player.id){
      this.grandPrixGhostCandidate=null;this.grandPrixGhostSaveStatus='none';
      this.grandPrixLapRecorder=new GrandPrixLapRecorder({playerId:this.player.id,seed:state.seed,
        stageIndex:state.stageIndex,car:state.car,driverId:state.driverId,difficulty:state.difficulty,
        cpuDifficulty:state.cpuDifficulty,upgrades:{...state.upgrades}},this.duel.course.length);
    }
    if(COURSE[state.stageIndex]?.practice||state.mode!=='timetrial'||!this.runId||this._runPlayerId!==this.player.id||state.playerId!==this.player.id)return;
    if(this.ghostSaved!==false)this.ghosts=mergeGhostStores(this.ghosts,loadGhosts());
    const context={playerId:this.player.id,seed:state.seed,stageIndex:state.stageIndex,laps:state.lapsTotal,car:state.car,mode:state.mode,difficulty:state.difficulty,cpuDifficulty:state.cpuDifficulty,upgrades:{...state.upgrades}};
    context.driverId=state.driverId;
    const choice=this.getGhostChoice(context);
    if(this._switches().enabled('grand-prix')===true)this.ghostEnabled=choice!=='off';
    this.ghostRecord=choice==='team'?this.getTeamGhostRecord(context):this.getGhostRecord(context);
    if(this.ghostRecord&&!this.ghostRecord.teamReference){this.ghostRecord.lastUsedAt=Date.now();this._saveGhostStore();}
    this.ghostRecorder=new GhostRecorder(context);this._updateGhost(state);
  }
  _updateGhost(state){
    if(this.duel.drivingLesson)return;
    this.ghostPose=null;
    this.grandPrixLapRecorder?.observe(state);
    if(COURSE[state.stageIndex]?.practice||state.mode!=='timetrial'||state.playerId!==this.player.id||!['countdown','racing','ticket'].includes(state.status)){this.ghostStatus='none';return;}
    this.ghostRecorder?.observe(state);
    this.ghostStatus=this.ghostRecord?(this.ghostEnabled?'playing':'off'):'recording';
    if(this.ghostRecord&&this.ghostEnabled){this.ghostPose=(this.ghostRecord.teamReference?sampleTeamGhost:sampleGhost)(this.ghostRecord,state.stageTimeSec+(state.racePenaltySec||0),this._ghostPoseBuffer);if(!this.ghostPose)this.ghostStatus='finished';}
  }
  _saveGhostStore(onSaved){
    const attempt=(this._ghostSaveAttempt??0)+1;this._ghostSaveAttempt=attempt;
    const result=saveGhosts(this.ghosts);
    const complete=saved=>{
      if(this._ghostSaveAttempt!==attempt)return;
      this.ghostSaved=saved;this.ghostSaveStatus=saved?'saved':'failed';onSaved?.(saved);
    };
    this.ghostSaved=false;this.ghostSaveStatus='pending';
    if(result?.then)result.then(complete);else complete(result);
  }
  _finishGhost(payload,state,awarded,result){
    // The wallet's comparable car best is authoritative, including valid losses.
    const record=this.ghostRecorder?.finish(payload,state,this.player);
    if(awarded.awarded&&record&&Number.isFinite(awarded.best)&&record.timeSec<=awarded.best+.005){
      const current=this.ghostSaved===false?this.ghosts:mergeGhostStores(this.ghosts,loadGhosts()),saved=storeGhost(current,record);this.ghosts=saved.store;
      if(saved.saved){this._saveGhostStore();result.ghostRecorded=true;}
    }
    this.ghostRecorder=null;this.ghostPose=null;this.ghostStatus='none';
  }
  _saveProfile(){
    // Preserve other local players if another tab added or updated one.
    const retrying = this.profileSaved === false;
    const durable = retrying ? readWarlordRegistry() : null;
    const fresh = retrying
      ? durable.status === 'ready' ? durable.registry : this.players
      : loadPlayers();
    const players = new Map(this.players.players.map(player => [player.id, player]));
    for (const player of fresh.players) {
      if (!retrying || player.id !== this.player.id) players.set(player.id, player);
    }
    this.players=replacePlayerProfile({...this.players,players:[...players.values()]},this.player.id,this.profile);
    this.player=activePlayer(this.players);this.profile=this.player.profile;
    // Keep session-only edits local, but never overwrite unproved durable data.
    this.profileSaved = retrying && durable.status === 'invalid'
      ? false : savePlayers(this.players);
    if(this.profileSaved)this._rememberWarlordOwner();
    this._syncHiddenRoadDiscovery();return this.profileSaved;
  }
  _rememberWarlordOwner() {
    if (this.profileSaved === false) return;
    const durable = readWarlordRegistry();
    const owner = durable.registry?.players.find(player => player.id === this.player.id);
    const snapshot = JSON.stringify(this.profile);
    if (owner && durable.registry.activePlayerId === this.player.id &&
        JSON.stringify(owner.profile) === snapshot)
      this._warlordVerifiedOwner = {ownerId: this.player.id, snapshot};
  }
  _refreshPlayer(){
    if(this.profileSaved===false)return;
    const fresh=loadPlayers().players.find(player=>player.id===this.player.id);if(!fresh)return;
    this.players=replacePlayerProfile(this.players,this.player.id,fresh.profile);this.player=activePlayer(this.players);this.profile=this.player.profile;
  }
  _refreshPlayers(){
    if(this.profileSaved===false)return;
    const fresh=loadPlayers(),players=new Map(this.players.players.map(player=>[player.id,player]));
    for(const player of fresh.players)players.set(player.id,player);
    this.players={...this.players,players:[...players.values()]};this.player=activePlayer(this.players);this.profile=this.player.profile;
  }
  _recoverInterruptedRace(){
    if(!this.profile.activeRace)return;
    const interrupted=settleRace(this.profile,{...this.profile.activeRace,won:false,completed:false,abandoned:true});
    this.profile={...interrupted.profile,activeRace:null};this.interruptedRaceCharge=interrupted.charge||0;this._saveProfile();
  }
  _settlePoliceTicket(ticket,state){
    if(this.duel.drivingLesson)return;
    if(!this.runId||this._runPlayerId!==this.player.id||state.playerId!==this._runPlayerId||state!==this.duel.state||ticket!==state.police.ticket)return;
    this._refreshPlayer();
    const settled=settlePoliceFine(this.profile,{runId:this.runId,stageIndex:state.stageIndex,ticketIndex:ticket.ticketIndex});
    if(settled.accrued){
      this.profile=settled.profile;this._saveProfile();
      ticket.creditCharge=0;ticket.pendingFine=settled.pendingFine;ticket.pendingFineTotal=settled.pendingFineTotal;ticket.creditBalance=this.profile.credits;
      state.police.pendingFines=settled.pendingFineTotal;
    }
  }
  purchaseDriver(id){return this._driverOperation(id,true);}
  getIntelLevel(eventId) {
    return this._switches().enabled('grand-prix')===true
      ?intelLevel(this.profile,eventId,{owned:isCourseUnlocked(this.profile,eventId)}):0;
  }
  buyIntel(eventId,level) {
    if(this.duel.state.status!=='menu'||this._switches().enabled('grand-prix')!==true)
      return {ok:false,cost:0,reason:'Return to the menu before buying track intel.'};
    this._refreshPlayer();
    const stage=COURSE.find(course=>course.id===eventId);
    const result=purchaseIntel(this.profile,eventId,level,
      {owned:!!stage&&!stage.practice&&!stage.arena&&stage.closed!==false&&isCourseUnlocked(this.profile,stage)});
    if(result.changed){this.profile=result.profile;result.saved=this._saveProfile();this.duel.emit({intelPurchased:eventId,level});}
    return result;
  }
  _recordIntelLap(event,state) {
    if(this.duel.drivingLesson)return;
    const lap=event?.lapCompleted, stage=COURSE[state?.stageIndex];
    if(this._switches().enabled('grand-prix')!==true||state!==this.duel.state||state.status!=='racing'||
      !this.runId||!this.player||this._runPlayerId!==this.player.id||state.playerId!==this.player.id||
      !stage||stage.practice||stage.arena||this.duel.course.closed===false||
      !Number.isSafeInteger(lap)||lap<1||lap!==state.completedLaps||event.assisted!==false||
      state.assistedLaps?.[lap-1]!==false||!Number.isFinite(event.lapTimeSec)||event.lapTimeSec<=0||
      state.lapTimes?.[lap-1]!==event.lapTimeSec)return false;
    this._refreshPlayer();
    if(this._runPlayerId!==this.player.id||state.playerId!==this.player.id)return false;
    const runId=event.qualifyingLap?this.runId+':qualifying':this.runId;
    const next=recordIntelLap(this.profile,stage.id,{runId,lap,valid:true},
      {owned:isCourseUnlocked(this.profile,stage)});
    if(next===this.profile)return false;
    this.profile=next;this._saveProfile();return true;
  }
  // LAB-TUNE: the Lab's saved tune for a car, only with the Lab and tuning switches on (never on a lesson run: the game ignores it there).
  _labTuneOf(car){return this._switches().enabled('lab')===true&&this._switches().enabled('lab-tuning')===true?usableTune(this.profile,car):undefined;} // LAB-TUNE-VIEW: only settings the Lab has opened
  // LAB-TUNE: a finished Time Trial keeps its best lap as the stock lap, or pays the tuned-lap bonus once for the course
  // (docs/LAB.md 5.3). Runs before the run is written to the records, so stock laps are seeded from the records before it.
  _settleTunedLap(result,state){
    const flags=this._switches();
    if(state.mode!=='timetrial'||result.completed!==true||this.duel.drivingLesson||flags.enabled('lab')!==true||flags.enabled('lab-tuning')!==true)return;
    // Only a stock run reads the records (they hold stock laps alone: a tuned run is not written to them), and an assisted lap counts for nothing.
    const seeded=state.tune?this.profile:seedStockLaps(this.profile,mergeLeaderboards(this.leaderboard,loadLeaderboard()).entries,this.player.id,{flags});
    const laps=(state.lapTimes||[]).filter((seconds,index)=>state.assistedLaps?.[index]!==true);
    const settled=settleTunedLap(seeded,{carId:state.car,courseId:COURSE[state.stageIndex].id,lapTimes:laps,tune:state.tune,rules:ruleSetOf(state)},{flags});
    if(settled.profile!==this.profile){this.profile=settled.profile;this._saveProfile();}
    if(settled.tuned)result.tunedLap=settled.tuned;
  }
  purchaseCourse(id){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the menu before unlocking courses.',cost:0};
    this._refreshPlayer();const result=buyCourse(this.profile,id);
    if(result.ok){this.profile=result.profile;this._saveProfile();this.duel.emit({courseUnlocked:id});}return result;
  }
  selectCourse(id){
    if(this.duel.state.status!=='menu')return false;
    this._refreshPlayer();if(!isCourseUnlocked(this.profile,id))return false;
    return this.setRaceSettings({eventId:id});
  }
  selectDriver(id){return this._driverOperation(id,false);}
  _driverOperation(id,buy){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the menu before changing drivers.',cost:0};
    this._refreshPlayer();const result=(buy?buyDriver:equipDriver)(this.profile,id);
    if(result.ok&&result.profile!==this.profile){this.profile=result.profile;this._saveProfile();this.duel.state.driverId=getEquippedDriverId(this.profile);this.duel.emit({garage:true,driverChanged:true});}
    return result;
  }
  // A Grand Prix is offered while its switch is on, on the circuits that have one.
  grandPrixAvailable(stage=COURSE[this.menuStage]){
    return this._switches().enabled('grand-prix')===true&&grandPrixCourse(stage);
  }
  cupsAvailable(){
    return this._switches().enabled('grand-prix')===true&&this._switches().enabled('grand-prix-career')===true;
  }
  startCup(cupId){
    if(this.duel.state.status!=='menu'||!this.cupsAvailable())return {ok:false,reason:'Return to the menu to start a cup.'};
    this._refreshPlayer();
    const id=globalThis.crypto?.randomUUID?.()||
      'cup-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    const selected=this.getRaceChoices();
    if(!isCarUnlocked(this.profile,selected.car))return {ok:false,reason:'Choose an owned car.'};
    const firstCourse=COURSE.find(row=>row.id===CUPS.find(cup=>cup.id===cupId)?.events[0]);
    if(firstCourse&&this._airOnlyRefused(selected.car,firstCourse.id))return {ok:false,reason:this.courseAccessMessage};
    const created=beginCup(this.profile.cups,{id,ownerId:this.player.id,cupId,cpuDifficulty:selected.cpuDifficulty,
      difficulty:selected.difficulty,car:selected.car,fieldSeed:Math.floor(Math.random()*4294967296)>>>0},
      {courses:COURSE,owns:course=>isCourseUnlocked(this.profile,course)&&!courseClosed(this.profile,course.id,undefined,{enabled:this._fireOn()}),enabled:true});
    if(!created.ok)return created;
    this.profile={...this.profile,cups:created.cups};this._saveProfile();
    return this.prepareCupRace();
  }
  prepareCupRace(){
    if(this.duel.state.status!=='menu'||!this.cupsAvailable())return {ok:false,reason:'Return to the menu to continue your cup.'};
    this._refreshPlayer();const cups=normalizeCups(this.profile.cups),active=cups.version===1?cups.active:null;
    if(!active||active.ownerId!==this.player.id)return {ok:false,reason:'No cup is in progress for this player.'};
    const id=CUPS.find(cup=>cup.id===active.cupId)?.events[active.results.length];
    const course=COURSE.find(row=>row.id===id);
    if(!course||!isCourseUnlocked(this.profile,course)||this._airOnlyRefused(active.car,id)||this._fireClosedRefused(course))
      return {ok:false,reason:'The next cup course is not available for this car.'};
    if(!this.setRaceSettings({eventId:id,mode:'grandprix',car:active.car,cpuDifficulty:active.cpuDifficulty,difficulty:active.difficulty}))
      return {ok:false,reason:'The cup race could not be selected.'};
    return {ok:true,reason:'Cup race selected. Start when you are ready.'};
  }
  abandonCup(){
    if(this.duel.state.status!=='menu'||!this.cupsAvailable())return {ok:false,reason:'Return to the menu to abandon your cup.'};
    this._refreshPlayer();const cups=abandonCup(this.profile.cups,this.player.id);
    if(cups===this.profile.cups)return {ok:false,reason:'No cup is in progress.'};
    this.profile={...this.profile,cups};this._cupRace=null;this._saveProfile();
    return {ok:true,reason:'Cup abandoned. Completed race earnings are safe; no cup bonus was paid.'};
  }
  _recordCupResult(result,state){
    const race=this._cupRace;
    if(!this.cupsAvailable()||!race||race.state!==state||state!==this.duel.state||result!==state.results||
      race.runId!==this.runId||race.ownerId!==this.player.id||state.playerId!==this.player.id||state.qualifying)return;
    const recorded=recordCupRace(this.profile.cups,{...race,eventId:COURSE[state.stageIndex]?.id,stageIndex:state.stageIndex,
      car:state.car,cpuDifficulty:state.cpuDifficulty,fieldSeed:state.fieldSeed,mode:state.mode,
      completed:result.completed===true,qualifying:false,field:result.field});
    if(!recorded.recorded)return;
    this.profile={...this.profile,cups:recorded.cups};
    const active=recorded.cups.active,definition=CUPS.find(cup=>cup.id===active.cupId);
    result.cupSummary={id:active.cupId,rounds:active.results.length,total:definition.events.length,
      finished:false,standings:cupStandings(active.results),bonus:0,trophy:null};
    if(recorded.finished){
      const settled=settleCup(this.profile,{seriesId:race.seriesId,ownerId:race.ownerId,activePlayerId:this.player.id});
      this.profile=settled.profile;result.cupBonus=settled.reward;result.cupStandings=settled.standings;
      result.cupTrophy=settled.trophy;
      Object.assign(result.cupSummary,{finished:settled.settled,bonus:settled.reward,trophy:settled.trophy});
    }
    this._saveProfile();
  }
  _settleResult(result,state){
    if(this.duel.drivingLesson)return;
    // Scrapdome events settle through their own result, never as races.
    if(state.arena)return;
    const yetiFinish=state===this.duel.state && result===state.results && !state.qualifying &&
      result.yetiEnabled===true && result.yetiSeen===true && state.yeti?.seen===true &&
      (this.duel.course?.def.id==='summit-run'||isSummitAttack(this.duel.course?.def)) && this._switches().enabled('yeti') && this._switches().enabled('summit-run');
    const gpWithoutPay=state.mode==='grandprix'&&(!this._switches().enabled('grand-prix-career')||state.qualifying?.phase==='driving');
    const achievementFinish=state===this.duel.state&&result===state.results&&state.qualifying?.phase!=='driving'&&
      state.car==='falcone_sirena'&&this._switches().enabled('the-deep')&&this._switches().enabled('lab');
    if(gpWithoutPay&&!yetiFinish&&!achievementFinish){
      if(isYetiGrandPrixInput(this.profile.activeRace)&&state===this.duel.state&&(result===state.results||result.abandoned===true)&&
        this._runPlayerId===this.player.id&&state.playerId===this._runPlayerId){
        this._refreshPlayer();const pending=this.profile.activeRace;
        if(isYetiGrandPrixInput(pending)&&pending.key===`${this.runId}:${state.stageIndex}`&&
          this.duel.course?.def.id==='summit-run'&&pending.yetiSeed===state.yetiSeed){
          this.profile={...this.profile,activeRace:null};this._saveProfile();
        }
      }
      result.creditReward=0;result.creditBalance=this.profile.credits;return;
    }
    if(state.hiddenRoadVisit)return;
    if(COURSE[state.stageIndex]?.practice||!isCourseUnlocked(this.profile,state.stageIndex))return;
    if(this._runPlayerId!==this.player.id||state.playerId!==this._runPlayerId)return;
    this._refreshPlayer();
    const payload={...result,runId:this.runId,stageIndex:state.stageIndex,won:result.won===true,completed:result.completed===true,
      timeSec:result.timeSec??result.stageTimeSec,laps:result.laps??state.completedLaps,seed:state.seed,car:state.car,driverId:state.driverId,mode:state.mode,difficulty:state.difficulty,cpuDifficulty:state.cpuDifficulty||this.cpuDifficulty,
      upgrades:{...state.upgrades},...(state.mode==='grandprix'?{rival:null,rivalSettings:null}:{rival:state.rivalSettings}),weaponLevels:state.weaponLevels,policeEscapes:result.policeEscapes??state.policeEscapes,
      grandPrixCareerEnabled:state.mode==='grandprix'&&this._switches().enabled('grand-prix-career')===true,
      combatRewardsEnabled:state.mode==='wasteland'&&wastelandRulesActive(state),
      muddyHollowEnabled:state.wastelandGateDiscovered===true,
      deepEnabled:this._switches().enabled('the-deep')===true,
      labEnabled:this._switches().enabled('lab')===true,
      raceFinish:this._racePaintCar===state.car?this._racePaint?.id:null,
      earnedCarsEnabled:this._switches().enabled('earned-cars')===true,
      ...(state.tyreSlipRules===true&&state.difficulty==='pro'&&COURSE[state.stageIndex]?.kind==='drift'?{tyreSlipRules:true}:{}),
      ...(state.engineCurve===true?{engineCurve:true}:{}),
      intelEnabled:this._switches().enabled('grand-prix')===true,
      clean:result.completed===true&&!result.missedStation&&(result.stageCrashes??state.stageCrashes??0)===0&&(result.majorCrashesBeforeRepair??state.majorCrashes)===this._stageStartCrashes};
    if(this._switches().enabled('lap-choice')&&supportsLapChoice(COURSE[state.stageIndex],state.mode)){
      payload.lapChoiceEnabled=true;
      if(result.completed===true)Object.assign(result,{lapChoiceEnabled:true,
        raceDistance:raceDistance(COURSE[state.stageIndex],payload.laps,state.mode)});
    }
    if(yetiFinish)Object.assign(payload,{ownerPlayerId:this._runPlayerId,playerId:state.playerId,
      yetiEnabled:true,yetiSeen:true});
    const awarded=settleRace(this.profile,payload);
    if(awarded.achievementsAwarded&&!awarded.awarded){this.profile=awarded.profile;this._saveProfile();}
    if(awarded.yetiAwarded){
      if(!awarded.awarded){this.profile=awarded.profile;this._saveProfile();}
      result.yetiSightings=awarded.yetiSightings;
    }
    if(gpWithoutPay){
      if(awarded.profile!==this.profile&&this.profile.activeRace&&awarded.profile.activeRace===null){this.profile=awarded.profile;this._saveProfile();}
      result.creditReward=0;result.creditBalance=this.profile.credits;return;
    }
    if(awarded.awarded){
      this.profile=awarded.profile;this._saveProfile();
      this._settleTunedLap(result,state); // LAB-TUNE
      this._recordCupResult(result,state);
      if(state.mode==='grandprix')result.creditPositionReward=Math.min(Math.max(0,awarded.reward),Math.max(0,awarded.breakdown.base));
      // LAB-TUNE: the records hold stock runs; a tuned run is not written to them (it would replace a stock record and be read back as a stock lap).
      const recorded=state.tune?{board:this.leaderboard,recorded:false}:recordFinish(mergeLeaderboards(this.leaderboard,loadLeaderboard()),payload,this.player);this.leaderboard=recorded.board;
      if(recorded.recorded)this.leaderboardSaved=saveLeaderboard(this.leaderboard);
      if(recorded.scoreBest!=null){result.driftScoreBest=recorded.scoreBest;result.driftScoreImproved=recorded.scoreImproved;}
      Object.assign(result,{creditReward:awarded.reward,creditCharge:awarded.charge,policeFineCharge:awarded.policeFineCharge||0,creditBreakdown:awarded.breakdown,personalBest:awarded.personalBest,personalBestStatus:awarded.personalBestStatus,previousBest:awarded.previousBest,best:awarded.best,winStreak:awarded.winStreak,milestoneAwards:awarded.milestones});
      // The Coast Cup finished in the Sirena (docs/THE_DEEP.md 6.2): the view and sound read the event.
      if(awarded.coastCup){result.coastCup=awarded.coastCup.paid;for(const event of awarded.coastCup.events)this.duel.emit(event);}
      // Earned cars (docs/EARNED_CARS.md): the new medal and any car it earned, with one bonus cue.
      if(awarded.medal||awarded.earnedCars?.length){
        Object.assign(result,{medal:awarded.medal,earnedCars:awarded.earnedCars||[]});
        this.audio.event({medalEarned:true},state,this.duel.course);
      }
      if (Number.isSafeInteger(awarded.notorietyEarned)) {
        result.notorietyEarned = awarded.notorietyEarned;
        result.notorietyRank = awarded.notorietyRank;
      }
      if (Number.isSafeInteger(awarded.scrapEarned)) {
        result.scrapEarned = awarded.scrapEarned;
        result.scrapBalance = this.profile.wasteland.scrap;
      }
    }else if(result.creditReward==null)result.creditReward=0;
    if(state.mode==='grandprix')this.grandPrixLapRecorder=null;
    this._finishGhost(payload,state,awarded,result);
    result.creditBalance=this.profile.credits;
  }
  _settleArenaResult(event,state){
    if (state?.arena?.mode === 'warlord') return this._settleWarlordResult(event, state);
    if (['fuel-run', 'bounty-hunt', 'convoy-raid', 'ambush-alley'].includes(state?.arena?.mode)) return this._settleFuelResult(event, state);
    const result=state?.arena?.result,currentHold=Number.isSafeInteger(this.profile?.wasteland?.territories?.kettle?.hold)?this.profile.wasteland.territories.kettle.hold:0;
    if(result&&result.scrapEarned==null){Object.assign(result,{scrapEarned:0,holdAdded:0,hold:currentHold,settlementSaved:false});}
    if(!result||event?.result!==result||state!==this.duel.state||
      !this.runId||
      this._runPlayerId!==this.player.id||state.playerId!==this._runPlayerId)return false;
    this._refreshPlayer();
    if(this._runPlayerId!==this.player.id||state.playerId!==this.player.id)return false;
    const previous=this.profile,settled=settleArenaResult(previous,{runId:this.runId,
      ownerPlayerId:this._runPlayerId,activePlayerId:this.player.id,
      cpuDifficulty:state.cpuDifficulty||this.cpuDifficulty,arena:state.arena});
    if(!settled.awarded){
      result.hold=settled.hold;
      return false;
    }
    this.profile=settled.profile;
    if(!this._saveShopProfile(previous)){
      return false;
    }
    Object.assign(result,{scrapEarned:settled.scrapEarned,
      scrapBalance:this.profile.wasteland.scrap,holdAdded:settled.holdAdded,
      hold:settled.hold,settlementSaved:true});
    return true;
  }
  _settleFuelResult(event, state) {
    const result = state?.arena?.result;
    if (result && result.scrapEarned == null) Object.assign(result, {
      scrapEarned: 0, holdAdded: 0, settlementSaved: false, settlementRetryable: false,
      hold: warlordHold(this.profile, state.arena.mode === 'convoy-raid' ? 'tollkeeper' : 'kettle'),
    });
    if (!result || event?.result !== result || state !== this.duel.state ||
        !this.runId || result.settlementSaved ||
        this._runPlayerId !== this.player.id || state.playerId !== this._runPlayerId) return false;
    const durable = readWarlordRegistry();
    if (!result.settlementRetryable) {
      const verified = this._warlordVerifiedOwner?.ownerId === this.player.id
        ? this._warlordVerifiedOwner : null;
      this._fuelSettlementRetry = {state, result, runId: this.runId, ownerId: this.player.id,
        unsaved: this.profileSaved === false,
        registryWasAbsent: durable.status === 'absent' && !verified && this.profileSaved === false,
        ownerSnapshot: verified?.snapshot ?? null};
      result.settlementRetryable = true;
    }
    return this._writeFuelResult(state, result, durable);
  }
  _writeFuelResult(state, result, durable) {
    const pending = this._fuelSettlementRetry;
    if (!pending || pending.state !== state || pending.result !== result ||
        pending.runId !== this.runId || pending.ownerId !== this.player.id) return false;
    let registry, profile;
    if (durable.status === 'ready') {
      registry = durable.registry;
      const owner = registry.players.find(player => player.id === pending.ownerId);
      if (!owner || registry.activePlayerId !== pending.ownerId) return false;
      if (pending.unsaved && JSON.stringify(owner.profile) !== pending.ownerSnapshot) return false;
      profile = pending.unsaved ? this.profile : owner.profile;
      registry = replacePlayerProfile(registry, pending.ownerId, profile);
      if (!validWarlordRegistry(registry)) return false;
    } else if (durable.status === 'absent' && pending.registryWasAbsent &&
        this.players.activePlayerId === pending.ownerId && validWarlordRegistry(this.players)) {
      profile = this.profile;
      registry = replacePlayerProfile(this.players, pending.ownerId, profile);
      if (!validWarlordRegistry(registry)) return false;
    } else return false;
    const settled = settleArenaResult(profile, {runId: pending.runId,
      ownerPlayerId: pending.ownerId, activePlayerId: this.player.id,
      arena: state.arena, cpuDifficulty: state.cpuDifficulty || this.cpuDifficulty});
    if (!settled.awarded) {
      if (settled.key && profile.wasteland?.settledResults?.includes(settled.key)) {
        this._adoptWarlordRegistry(registry, true);
        Object.assign(result, {scrapEarned: 0, holdAdded: 0, settlementSaved: true,
          settlementRetryable: false, scrapBalance: this.profile.wasteland.scrap,
          hold: warlordHold(this.profile, state.arena.mode === 'convoy-raid' ? 'tollkeeper' : 'kettle')});
        this._fuelSettlementRetry = null;
      }
      return false;
    }
    const candidate = replacePlayerProfile(registry, pending.ownerId, settled.profile);
    // Rebase on durable progress each time, and expose nothing until one write succeeds.
    if (!savePlayers(candidate)) {
      this._adoptWarlordRegistry(registry, false);
      result.hold = warlordHold(this.profile, state.arena.mode === 'convoy-raid' ? 'tollkeeper' : 'kettle');
      return false;
    }
    this._adoptWarlordRegistry(candidate, true);
    Object.assign(result, {scrapEarned: settled.scrapEarned,
      scrapBalance: this.profile.wasteland.scrap, holdAdded: settled.holdAdded,
      hold: settled.hold, settlementSaved: true, settlementRetryable: false});
    this._fuelSettlementRetry = null;
    return true;
  }
  _settleWarlordResult(event, state) {
    const result = state?.arena?.result;
    if (result && result.scrapEarned == null) {
      Object.assign(result, {scrapEarned: 0, settlementSaved: false,
        settlementRetryable: false, kitEarned: null, territoryClaimed: false,
        hold: warlordHold(this.profile, state.arena.warlordId)});
    }
    if (!result || event?.result !== result || state !== this.duel.state ||
        !this.runId || !this.warlordsAvailable() ||
        this._runPlayerId !== this.player.id || state.playerId !== this._runPlayerId)
      return false;
    if (result.settlementSaved) return false;
    if (result.settlementRetryable) return this._retryWarlordResult(state, result);
    const durable = readWarlordRegistry();
    const verified = this._warlordVerifiedOwner?.ownerId === this.player.id
      ? this._warlordVerifiedOwner : null;
    this._warlordSettlementRetry = {state, result, runId: this.runId, ownerId: this.player.id,
      unsaved: this.profileSaved === false,
      registryWasAbsent: durable.status === 'absent' && !verified && this.profileSaved === false,
      ownerSnapshot: verified?.snapshot ?? null};
    // Initial settlement and retry obey the same durable-owner rules. A failed
    // earlier shop write must never authorize replacing newer owner progress.
    result.settlementRetryable = true;
    return this._writeWarlordResult(state, result, durable);
  }
  _retryWarlordResult(state, result) {
    return this._writeWarlordResult(state, result, readWarlordRegistry());
  }
  _writeWarlordResult(state, result, durable) {
    const pending = this._warlordSettlementRetry;
    if (!pending || pending.state !== state || pending.result !== result ||
        pending.runId !== this.runId || pending.ownerId !== this.player.id) return false;
    let registry, profile;
    if (durable.status === 'ready') {
      registry = durable.registry;
      const owner = registry.players.find(player => player.id === pending.ownerId);
      if (!owner || registry.activePlayerId !== pending.ownerId) return false;
      // Genuine unsaved local work can only use the old durable owner when it
      // is still identical. Conflicting owner progress is never guessed away.
      if (pending.unsaved && JSON.stringify(owner.profile) !== pending.ownerSnapshot) return false;
      profile = pending.unsaved ? this.profile : owner.profile;
      const local = {...registry, players: registry.players.map(player =>
        player.id === pending.ownerId ? {...player, profile} : player)};
      if (!validWarlordRegistry(local)) return false;
      registry = replacePlayerProfile(registry, pending.ownerId, profile);
    } else if (durable.status === 'absent' && pending.registryWasAbsent &&
        this.players.activePlayerId === pending.ownerId && validWarlordRegistry(this.players)) {
      profile = this.profile;
      registry = {...this.players, players: this.players.players.map(player =>
        player.id === pending.ownerId ? {...player, profile} : player)};
      if (!validWarlordRegistry(registry)) return false;
    } else return false;
    const settled = settleWarlordResult(profile, {runId: pending.runId,
      ownerPlayerId: pending.ownerId, activePlayerId: this.player.id,
      arena: state.arena, car: state.car, cpuDifficulty: state.cpuDifficulty,
      warlordCardsEnabled: this._switches().enabled('warlord-cards') === true});
    if (!settled.awarded) {
      if (settled.key && profile.wasteland?.settledResults?.includes(settled.key)) {
        this._adoptWarlordRegistry(registry, true);
        Object.assign(result, {scrapEarned: 0, settlementSaved: true,
          settlementRetryable: false, hold: warlordHold(this.profile, state.arena.warlordId)});
        this._warlordSettlementRetry = null;
      }
      return false;
    }
    const candidate = replacePlayerProfile(registry, pending.ownerId, settled.profile);
    // Do not expose a partial reward. The single existing registry write is
    // synchronous; no mutation enters App until its complete result is known.
    if (!savePlayers(candidate)) {
      this._adoptWarlordRegistry(registry, false);
      result.hold = warlordHold(this.profile, state.arena.warlordId);
      return false;
    }
    this._adoptWarlordRegistry(candidate, true);
    this._presentWarlordSettlement(state, result, settled);
    return true;
  }
  _adoptWarlordRegistry(registry, saved) {
    this.players = registry; this.player = activePlayer(registry);
    this.profile = this.player.profile; this.profileSaved = saved;
    if (saved) this._rememberWarlordOwner();
    this._syncHiddenRoadDiscovery();
  }
  _presentWarlordSettlement(state, result, settled) {
    Object.assign(result, {scrapEarned: settled.scrapEarned,
      scrapBalance: this.profile.wasteland.scrap,
      hold: warlordHold(this.profile, state.arena.warlordId),
      settlementSaved: true, settlementRetryable: false,
      firstWin: settled.firstWin, rewardReason: settled.rewardReason, kitEarned: settled.kitEarned,
      weaponEarned: settled.weaponEarned ?? null, crewEarned: settled.crewEarned ?? null,
      gearEarned: settled.gearEarned ?? null,
      titleEarned: settled.titleEarned ?? null,
      territoryClaimed: settled.territoryClaimed});
    this._warlordSettlementRetry = null;
  }
  retryArenaSettlement() {
    const state = this.duel.state, result = state.arena?.result;
    if (state.status !== 'arena_result' || !result?.settlementRetryable) return false;
    const saved = this._settleArenaResult({result}, state);
    this.duel.emit({arenaSettlementRetried: true});
    return saved;
  }
  _settleAbandoned(){
    const state=this.duel.state;
    if(this.runId&&(['racing','ticket','countdown'].includes(state.status)||state.status==='exploring'&&state.deepJourney&&!state.deepJourney.committed)&&(state.stageTimeSec>0||this.profile.activeRace?.key===`${this.runId}:${state.stageIndex}`))this._settleResult({won:false,completed:false,abandoned:true},state);
  }
  _settleDeepDeparture(event,state) {
    const journey=state?.deepJourney,runtime=this.duel.deepRuntime;
    if(!this.runId||state!==this.duel.state||state.status!=='exploring'||!journey?.committed||
      !runtime||event?.journeyId!==journey.id||event.zoneId!==runtime.zone.id||
      state.playerId!==this._runPlayerId||this._runPlayerId!==this.player.id||
      this._settledDeepJourney===journey||!this._switches().enabled('the-deep'))return false;
    this._settleResult({won:false,completed:false,abandoned:true},state);
    this._settledDeepJourney=journey;
    this._refreshPlayer();
    const discovered=rememberDeep(this.profile,'found',runtime.zone.id,{enabled:true});
    if(discovered!==this.profile){this.profile=discovered;this._saveProfile();}
    this.ghostRecorder=this.grandPrixLapRecorder=this.lapTelemetryRecorder=null;
    this.ghostPose=null;this.driftNotice=this.checkpointNotice=null;
    return true;
  }
  // DEEP-SIRENA-VIEW: pay and save a raised find, a logged creature or a pearl, once, for the
  // player who dived (the same checks as the dive's own settlement), then Ana's log lines.
  _settleDeepStory(event,state) {
    const journey=state?.deepJourney;
    if(!this.runId||state!==this.duel.state||!journey?.committed||state.playerId!==this._runPlayerId||this._runPlayerId!==this.player?.id||
      !this._switches().enabled('the-deep'))return false;
    this._refreshPlayer();
    if(event.deepPlace?.title){
      const place=this.duel.deepRuntime?.zone.places.find(row=>row.id===event.deepPlace.place?.id);
      if(state.status!=='exploring'||journey.phase!=='underwater'||!place)return false;
      const profile=rememberDeep(this.profile,'places',place.id,{enabled:true});
      if(profile!==this.profile){this.profile=profile;this._saveProfile();}
      return true;
    }
    const on={enabled:true},result=event.deepRaised?raiseFind(this.profile,event.deepRaised.find,on):
      event.deepLogged?recordLogged(this.profile,event.deepLogged.creature,on):recordPearl(this.profile,event.deepPearl.pearl,on);
    if(result.profile!==this.profile){this.profile=result.profile;this._saveProfile();}
    if(!event.deepRaised)for(const line of phoneLineFor(event,result))this.duel.emit({deepPhone:{line}});
    return result.ok;
  }
  // DEEP-EXPLORER: chart packets belong only to the named player who dived.
  _settleDeepChart(event,state) {
    const packet=event.deepCharted, journey=state?.deepJourney;
    if(!this.runId||state!==this.duel.state||!journey?.committed||
      state.playerId!==this._runPlayerId||this._runPlayerId!==this.player?.id||
      !this._switches().enabled('the-deep')||packet?.zoneId!==journey.zoneId)return false;
    this._refreshPlayer();
    const profile=rememberChart(this.profile,packet.zoneId,packet.bits,{enabled:true});
    if(profile!==this.profile){this.profile=profile;this._saveProfile();}
    return true;
  }
  chooseDeep(choice) {
    const state=this.duel.state;
    if(!this.runId||state.playerId!==this._runPlayerId||this._runPlayerId!==this.player.id||
      !this.duel.chooseDeep(choice))return false;
    this._clearHiddenRoadInput();return true;
  }
  _settleHiddenRoadDeparture(event, state) {
    const journey = state?.hiddenRoadJourney;
    if (!this.runId || state !== this.duel.state || state.status !== 'exploring' ||
        !journey?.departed || !journey.committed || event?.journeyId !== journey.id ||
        state.playerId !== this._runPlayerId || this._runPlayerId !== this.player.id ||
        this._settledHiddenRoadJourney === journey) return false;
    this._settleResult({won: false, completed: false, abandoned: true}, state);
    this._settledHiddenRoadJourney = journey;
    this.driftNotice = this.checkpointNotice = null;
    return true;
  }
  _settleMuddyHollowDeparture(event, state) {
    const departure = state?.muddyHollowDeparture;
    if (!this.runId || state !== this.duel.state || state.status !== 'exploring' ||
        !departure?.departed || event?.departureId !== departure.id ||
        state.playerId !== this._runPlayerId || this._runPlayerId !== this.player.id ||
        this._settledMuddyHollowDeparture === departure) return false;
    // Crossing the ridge only pauses the race (GATE-REJOIN); it records the
    // discovery and settles nothing.
    const discovered = discoverMuddyHollow(this.profile);
    if (discovered !== this.profile) { this.profile = discovered; this._saveProfile(); }
    this._settledMuddyHollowDeparture = departure;
    this.driftNotice = this.checkpointNotice = null;
    return true;
  }
  _settleMuddyHollowHubcap(event, state) {
    const departure = state?.muddyHollowDeparture;
    const progress = state?.muddyHollowHubcaps;
    if (!this.runId || state !== this.duel.state || state.status !== 'exploring' ||
        !departure?.departed || event?.departureId !== departure.id ||
        !progress?.found?.includes(event?.id) ||
        !this.duel.course?.muddyHollow?.collectibles?.some(item => item.id === event.id) ||
        state.playerId !== this._runPlayerId || this._runPlayerId !== this.player.id)
      return false;
    this._refreshPlayer();
    const result = collectMuddyHollowHubcap(this.profile, event.id);
    if (!result.collected) return false;
    this.profile = result.profile;
    this._saveProfile();
    return true;
  }
  getMuddyHollowProgress() {
    return muddyHollowSnapshot(this.profile, this.player?.id, true);
  }
  getDeepDiscovery() {
    return deepDiscoverySnapshot(this.profile, this.player?.id,
      !!this.player && this._switches().enabled('the-deep') === true);
  }
  showDeepGarageHints() {
    if (!this.player || this.duel.state.status !== 'menu' || !this._switches().enabled('the-deep')) return;
    this._refreshPlayer();
    const updated = markDeepHintsShown(this.profile, {enabled: true});
    if (updated !== this.profile) { this.profile = updated; this._saveProfile(); }
  }
  purchaseDeepKit() {
    if (!this.player || this.duel.state.status !== 'menu')
      return {ok: false, reason: 'Return to the garage before buying a dive kit.', cost: 0};
    this._refreshPlayer();
    const previous = this.profile;
    const result = buyDeepKit(previous, {enabled: this._switches().enabled('the-deep') === true});
    if (result.ok) {
      this.profile = result.profile;
      if (!this._saveShopProfile(previous)) return {ok: false, reason: 'Could not save this dive kit purchase. Your credits were kept.', cost: 0};
      this.duel.emit({garage: true});
    }
    return result;
  }
  getHiddenRoadDiscovery() {
    const old = this._hiddenRoadDiscovery, value = this.profile?.wasteland;
    const enabled = this._switches().enabled('hidden-road');
    const discovered = value?.version === 1 && value.discoveredGate === true;
    const count = value?.version === 1 && Number.isSafeInteger(value.pacificFinishes)
      ? Math.max(0, Math.min(10, value.pacificFinishes)) : 0;
    if (!old || old.playerId !== this.player.id || old.enabled !== enabled ||
        old.discoveredGate !== discovered || old.pacificFinishes !== count)
      this._hiddenRoadDiscovery = hiddenRoadDiscoverySnapshot(this.profile, this.player.id, enabled);
    return this._hiddenRoadDiscovery;
  }
  _syncHiddenRoadDiscovery() {
    this.duel.state.hiddenRoadDiscovery = this.getHiddenRoadDiscovery();
  }
  _discoverHiddenRoadGate(event, state) {
    const j = state?.hiddenRoadJourney;
    if (state !== this.duel.state || state.status !== 'exploring' || state.hiddenRoadVisit ||
        !this.runId || state.playerId !== this._runPlayerId || this._runPlayerId !== this.player.id ||
        !j?.departed || j.phase !== 'choice' || !j.choiceReady ||
        event?.phase !== 'choice' || event.journeyId !== j.id ||
        !this._switches().enabled('hidden-road') || this.profile.wasteland?.version !== 1 ||
        this.profile.wasteland.discoveredGate === true) return false;
    this._refreshPlayer();
    if (this.profile.wasteland?.version !== 1 || this.profile.wasteland.discoveredGate === true) return false;
    this.profile = {...this.profile, wasteland: {...this.profile.wasteland, discoveredGate: true}};
    this._saveProfile();
    return true;
  }
  // Scrapdome events (docs/SCRAPDOME.md 6): offered in the yard to a player who
  // found the gate. Never from the menu.
  arenaAvailable() {
    return this.wastelandUnlocked();
  }
  arenaVenueAvailable(venueId) {
    return arenaVenueAvailable(this._switches(), this.profile, venueId);
  }
  warlordsAvailable() {
    return this.arenaAvailable();
  }
  startWarlordFight(warlordId) {
    this._refreshPlayer();
    const state = this.duel.state;
    const ownRematch = state.arena?.mode === 'warlord' &&
      state.arena.warlordId === warlordId && this._runPlayerId === this.player.id &&
      state.playerId === this.player.id;
    if (!this.warlordsAvailable() || !BUILT_WARLORD_IDS.includes(warlordId) ||
        !warlordEnabled(this.duel, warlordId) ||
        !warlordUnlockSatisfied(this.profile, warlordId) ||
        !(this.isYardHomeActive() || ownRematch)) return false;
    return this._startArenaFight({warlordId, opponents: 1});
  }
  beginWarlordFight() {
    if (this._runPlayerId !== this.player.id ||
        this.duel.state.playerId !== this.player.id || !this.warlordsAvailable()) return false;
    this._clearHiddenRoadInput();
    return beginWarlordEvent(this.duel);
  }
  fuelRunAvailable() {
    return this.arenaAvailable() && this._switches().enabled('fuel-run') === true &&
      this.profile.wasteland?.rank >= 6;
  }
  bountyHuntAvailable() {
    return this.arenaAvailable() && this._switches().enabled('bounty-hunt') === true &&
      this.profile.wasteland?.rank >= 9;
  }
  convoyRaidAvailable() {
    return this.arenaAvailable() && this._switches().enabled('convoy-raid') === true &&
      this.arenaVenueAvailable('salt-flats') && warlordHold(this.profile, 'tollkeeper') > 0;
  }
  ambushAlleyAvailable() {
    return this.arenaAvailable() && this._switches().enabled('ambush-alley') === true &&
      this.profile.wasteland?.rank >= 12;
  }
  startArenaEvent({venueId = 'scrapdome', mode = 'last-car-rolling', opponents = this._arenaOpponents ?? 3} = {}) {
    if (!Object.hasOwn(ARENA_VENUES, venueId) || !['last-car-rolling', 'fuel-run', 'bounty-hunt', 'convoy-raid', 'ambush-alley'].includes(mode)) return false;
    return this._startArenaFight({venueId, mode, opponents});
  }
  _startArenaFight({opponents, warlordId = null, venueId = 'scrapdome', mode = 'last-car-rolling'}) {
    const state = this.duel.state;
    // Admission reads the current durable owner before creating any run state.
    // The existing failed-save guard keeps unsaved session progress intact.
    this._refreshPlayer();
    const available = warlordId ? this.warlordsAvailable() :
      mode === 'fuel-run' ? this.fuelRunAvailable() : mode === 'bounty-hunt' ? this.bountyHuntAvailable() :
        mode === 'convoy-raid' ? this.convoyRaidAvailable() :
        mode === 'ambush-alley' ? this.ambushAlleyAvailable() : this.arenaAvailable();
    const ambush = mode === 'ambush-alley';
    const venueAvailable = ambush ? venueId === 'pit' ||
      venueId === 'salt-flats' && this.arenaVenueAvailable(venueId) : this.arenaVenueAvailable(venueId);
    if (!available || !venueAvailable || mode === 'convoy-raid' && venueId !== 'salt-flats' ||
        !(this.isYardHomeActive() || state.arena)) return false;
    const count = ambush ? 0 : mode === 'convoy-raid' ? 3 : Math.max(1, Math.min(3, Math.floor(Number(opponents)) || 3));
    const car = isCarUnlocked(this.profile, this.menuCar) ? this.menuCar : 'falcone_f42';
    if (this._airOnlyRefused(car, venueId)) return false;
    const level = {easy: 0, medium: 1, hard: 2}[this.cpuDifficulty] ?? 1;
    const field = ARENA_FIELD.filter(key => key !== car).slice(0, count).map((key, index) => ({car: key, upgradeLevel: level,
      ...(mode === 'fuel-run' ? {brain: ['collector', 'rammer', 'hunter'][index]} : {})}));
    if (warlordId || ['fuel-run', 'bounty-hunt', 'convoy-raid', 'ambush-alley'].includes(mode)) this._rememberWarlordOwner();
    this._warlordSettlementRetry = null;
    this._fuelSettlementRetry = null;
    this.runId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this._runPlayerId = this.player.id; this._markedRaceKey = null; this._arenaOpponents = count;
    this._arenaSerial = (this._arenaSerial || 0) + 1;
    this.ghostRecorder = this.ghostRecord = this.ghostPose = this.grandPrixLapRecorder = null; this.lapTelemetryRecorder=null;this.ghostStatus = 'none';
    this.driftNotice = this.checkpointNotice = null;
    this._clearHiddenRoadInput(); this._stepAccumulator = 0;
    this._racePaint = getPaintAppearance(this.profile, car,
      {muddyHollowEnabled:true,yetiEnabled:this._switches().enabled('yeti'),labEnabled:this._switches().enabled('lab'),deepEnabled:this._switches().enabled('the-deep')}); this._racePaintCar = car;this._raceRoof=getRoadRoofLook(this.profile,car,{yetiEnabled:this._switches().enabled('yeti')});
    this.audio.unlock(); this.audio.setPaused(false);
    const options = {mode, venueId, car, driverId: getEquippedDriverId(this.profile),
      upgrades: getUpgradeLevels(this.profile, car), difficulty: this._raceSettings.difficulty,
      cpuDifficulty: this.cpuDifficulty, seed: (1989 + this._arenaSerial * 7919) >>> 0,
      playerId: this.player.id, opponents: field, weaponLevels: getProfileWeapons(this.profile).levels,
      arsenalRank:this.profile.wasteland?.rank||1,
      weaponLoadout: getCarLoadout(this.profile,this._arsenalOptions()), combatArmorKit: this._combatArmorKit(car),
      combatRoofLook: getEquippedRoofLook(this.profile, car),
      crewId: selectedCrewId(this.profile,{warlordCardsEnabled:this._switches().enabled('warlord-cards') && this._switches().enabled('crew-gear')})};
    return warlordId ? startWarlordEvent(this.duel, {...options, warlordId}) :
      this.duel.startArenaEvent(options);
  }
  // ---- the helicopter --------------------------------------------------
  // Special cars travel only by air while the helicopter is on: they drive
  // only on the course where they were last set down (Tremblant Woods until
  // flown), so never into the Wasteland or an arena either.
  _airOnlyRefused(car, courseId) {
    if (this._switches().enabled('helicopter') !== true || !isAirOnlyCar(car) || carAt(this.profile, car) === courseId) return false;
    this.courseAccessMessage = `The ${CARS[car].name} travels only by air. Fly it here from the helipad first.`;
    return true;
  }
  // Leave a helicopter visit: keep the session's own changes (its heli
  // field and the credits it spent or earned) on top of the current profile.
  _leaveHeli() {
    const session = this.heliSession;
    if (!session) return;
    this.heliSession = null; this.heliMapOpen = false; // MAP-VIEW
    const left = session.leave();
    const spent = left.credits - (this._heliCreditsAtStart ?? left.credits);
    this.profile = {...this.profile, credits: Math.max(0, this.profile.credits + spent), ...(left.heli ? {heli: left.heli} : {}), ...(left.lab ? {lab: left.lab} : {})};
    this._saveProfile();
    this.heliAudio.stop();
  }
  // ---- H2 Fire (docs/HELI_FIRE.md) ----------------------------------------
  // Forest fires need both switches; off, nothing below changes anything.
  _fireOn() {
    return this._switches().enabled('helicopter') === true && this._switches().enabled('forest-fire') === true;
  }
  // Where an animal of the wildlife count may stand on a course: off the road,
  // out of lakes and walls, anywhere in the square (not only near the road).
  _surveyStand(courseId, world) {
    this._standCheckers ??= new Map();
    if (!this._standCheckers.has(courseId)) this._standCheckers.set(courseId, wildlifeRules.createPlacementChecker(world.course));
    const checker = this._standCheckers.get(courseId);
    return (x, z) => !!checker.inspect(x, z, {maxEdge: Infinity});
  }
  // A course model at the helicopter's seed, built once, for fire grids; it
  // never touches the course being raced or flown.
  _fireCourse(courseId) {
    if (!this._fireCourses.has(courseId)) {
      const course = new Course(COURSE.find(stage => stage.id === courseId), 1989);
      this._fireCourses.set(courseId, {course, ground: groundFromCourse(course)});
    }
    return this._fireCourses.get(courseId);
  }
  // The play day counts when a player who flies becomes active on a date, so
  // closures count days the player only races; a fire burning takes its
  // three day steps. A player who has never flown gains nothing.
  _noteFirePlayDay(date = todayString()) {
    if (!this._fireOn() || !this.player || !this.profile?.heli) return false;
    const noted = notePlayDay(this.profile, date, {enabled: true});
    if (!noted.ok || !noted.newDay) return false;
    let profile = noted.profile;
    const burning = fireOf(profile);
    if (burning) {
      const loaded = this._fireCourse(burning.courseId);
      profile = fireOnNewDay(profile, {enabled: true, world: fireWorld(loaded, courseSite(loaded.course, loaded.ground, burning.courseId))}).profile;
    }
    this.profile = profile;
    this._saveProfile();
    return true;
  }
  _fireClosedRefused(stage) {
    if (!this._fireOn() || !courseClosed(this.profile, stage.id, undefined, {enabled: true})) return false;
    this.courseAccessMessage = closureCard(this.profile, stage.id, undefined, {enabled: true, name: stage.name}).refusal;
    return true;
  }
  // Buy back a course closed after a forest fire, from the course menu.
  buyBackCourse(courseId) {
    if (this.duel.state.status !== 'menu') return {ok: false, reason: 'Return to the menu first.'};
    if (!this._fireOn()) return {ok: false, reason: 'Forest fires are not available yet.'};
    this._refreshPlayer();
    const result = buyBackSave(this.profile, courseId, {enabled: true});
    if (result.ok) { this.profile = result.profile; this._saveProfile(); this.duel.emit({courses: true}); }
    return result;
  }
  forestFireEnabled() { return this._fireOn(); }
  // What the renderer draws burnt on a course (FIRE-VIEW): its stage, smoke,
  // scars, and the cells the fire being fought has burnt. Null when normal.
  fireLookFor(courseId) {
    if (!this._fireOn() || !this.profile?.heli) return null;
    const heli = this.heliSession?.profile?.heli ?? this.profile.heli;
    // Worked out again only when the helicopter save or the course changes.
    if (this._fireLook?.heli === heli && this._fireLook.courseId === courseId) return this._fireLook.look;
    const profile = {...this.profile, heli}, on = {enabled: true};
    const fire = fireOf(profile), burning = fire?.courseId === courseId, live = burning ? fire.burnt : [];
    const stage = burnStage(profile, courseId, undefined, on), scars = scarLooks(profile, courseId, undefined, on);
    // A fire burning here has a look from the start, so the burnt trunks'
    // colour is ready before the first cell goes out.
    const look = !stage && !scars.length && !burning ? null
      : Object.freeze({stage, smoke: burnSmoke(profile, courseId, undefined, on), scars, live: Object.freeze([...live])});
    this._fireLook = {heli, courseId, look};
    return look;
  }
  heliAvailable() {
    return !!this.player && this._switches().enabled('helicopter') === true;
  }
  // From the main menu to the helipad at Tremblant Woods.
  visitHeli({mode = 'assisted'} = {}) {
    if (this.duel.state.status !== 'menu' || !this.heliAvailable()) return false;
    this._refreshPlayer();
    const car = this.menuCar, driverId = getEquippedDriverId(this.profile);
    this.runId = this._runPlayerId = this._markedRaceKey = null;
    this.ghostRecorder = this.ghostRecord = this.ghostPose = this.grandPrixLapRecorder = null; this.lapTelemetryRecorder = null; this.ghostStatus = 'none';
    this._stepAccumulator = 0; this.heliLog = []; this.heliCamera = 0; this.skiCamera = 0; this.skiHelp = false; this._heliCar = car;
    this.audio.unlock(); this.audio.setPaused(false);
    const loadCourse = courseId => {
      if (!this.duel.startHeliVisit({courseId, playerId: this.player.id, car, driverId,
        upgrades: getUpgradeLevels(this.profile, car), seed: 1989,
        difficulty: this._raceSettings.difficulty})) throw new Error(`Cannot fly to ${courseId}`);
      return {course: this.duel.course, ground: groundFromCourse(this.duel.course)};
    };
    const today = new Date(), pad = n => String(n).padStart(2, '0');
    this._heliCreditsAtStart = this.profile.credits;
    const fireOn = this._fireOn();
    if (fireOn) this.heliAudio.preloadFire?.();
    this.heliSession = createHeliSession({profile: this.profile, enabled: true, loadCourse, carId: car, mode, difficulty: this._raceSettings.difficulty,
      fireEnabled: fireOn, rescueEnabled: fireOn && this._switches().enabled('rescue') === true, summitRunEnabled: fireOn && this._switches().enabled('rescue') === true && this._switches().enabled('summit-run') === true,
      drivingLessonAt: this.drivingLessonsAvailable() ? (courseId, carId) => this._heliLessonAt(courseId, carId) : null,
      // MAP-VIEW: the pilot's map switch and the secret courses whose own switches are on.
      pilotMapEnabled: this._switches().enabled('pilot-map') === true, secretCourses: this._secretCoursesOn(),
      labEnabled: this._switches().enabled('lab') === true, // LAB-VIEW
      logbookEnabled: this._switches().enabled('heli-logbook') === true,
      skinsEnabled: this._switches().enabled('heli-skins') === true, wildlifeEnabled: this._switches().enabled('wildlife') === true,
      // SKI-VIEW: heli-skiing needs Summit Run (the session checks that too).
      heliSkiingEnabled: this._switches().enabled('heli-skiing') === true,
      wildlife: wildlifeRules, surveyStand: (courseId, world) => this._surveyStand(courseId, world), playerName: this.player.name, loadFireCourse: courseId => this._fireCourse(courseId),
      today: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      persist: profile => {
        // Credits the session charged since its last save move the app's
        // credits by the same amount; its heli field is its own.
        const spent = profile.credits - (this._heliCreditsAtStart ?? profile.credits);
        this._heliCreditsAtStart = profile.credits;
        this.profile = {...this.profile, credits: Math.max(0, this.profile.credits + spent), ...(profile.heli ? {heli: profile.heli} : {}), ...(profile.lab ? {lab: profile.lab} : {})};
        this._saveProfile();
      }});
    this.setInputContext(null);
    this._heliEvents(this.heliSession.start());
    return true;
  }
  _heliEvents(events) {
    for (const event of events) {
      if (event.type === 'cue') { if (event.pitch > 0) this.heliAudio.play(event.id, {rate: event.pitch / 1000}); else this.heliAudio.play(event.id); }
      else if (event.type === 'fireHiss') this.heliAudio.play('heli.fire.hiss', {scale: Math.min(1, .3 + event.litres / 150)});
      else if (event.type === 'radio') this.heliAudio.say(event.line);
      else this.heliAudio.event(event);
      if (event.type === 'crashed') this.heliAudio.say('heli.radio.crash');
    }
    if (events.length) this.heliLog = [...this.heliLog, ...events].slice(-40);
    if (events.length) this.duel.emit({heli: true});
  }
  heliView() {
    const session = this.heliSession, view = session?.view() ?? null;
    // The hook's ground ring is drawn from the view; it joins it here (drawing only).
    const hookGuide = view && session.hookGuide?.();
    return hookGuide ? Object.freeze({...view, hookGuide}) : view;
  }
  // HELI-LANDED: both exits use the ordinary menu path so the fuel is kept.
  heliLanded(action) {
    const arrival = landedArrival(this.heliView(), this.profile);
    if (!arrival || !['race', 'shutdown'].includes(action)) return false;
    if (action === 'race' && (arrival.waiting || !COURSE.some(course => course.id === arrival.courseId) || !isCourseUnlocked(this.profile, arrival.courseId))) return false;
    this.returnToMenu();
    if (action === 'race') this.setRaceSettings({eventId: arrival.courseId,
      ...(arrival.carId && isCarUnlocked(this.profile, arrival.carId) ? {car: arrival.carId} : {})});
    return true;
  }
  heliBuyFuel(kg = Infinity) {
    const result = this.heliSession?.buyFuel(kg) ?? {ok: false};
    this._heliEvents(this.heliSession?.takeEvents() ?? []);
    return result;
  }
  heliSetDestination(courseId) {
    return this.heliSession?.setDestination(courseId) ?? false;
  }
  // MAP-VIEW: the pilot's map screen (docs/PILOT_MAP.md section 3). The map only draws; the one thing it
  // does is set the destination through the session, as the dispatch board does. It never pauses or moves the helicopter.
  heliMapAvailable() {
    return !!this.heliSession && this._switches().enabled('pilot-map') === true;
  }
  setHeliMap(open) {
    const next = open === true && this.heliMapAvailable();
    if (next === this.heliMapOpen) return next;
    this.heliMapOpen = next;
    this.heliAudio.play(next ? 'map.open' : 'map.close');
    this.duel.emit({heli: true});
    return next;
  }
  heliMapPick(courseId) {
    const set = this.heliSetDestination(courseId);
    if (set) { this.heliAudio.play('map.pin'); this.duel.emit({heli: true}); }
    return set;
  }
  // The ground's height on the course last loaded (the renderer paints signs and corner names on it); read only.
  heliGroundHeight(x, z) {
    const course = this.duel.course;
    if (this._mapGroundCourse !== course) { this._mapGround = groundFromCourse(course); this._mapGroundCourse = course; }
    return this._mapGround.height(x, z);
  }
  // The Lab's moving-map upgrade (docs/LAB.md 4.2) adds the grid and bearings.
  heliMovingMap() {
    return labOf(this.profile).owned?.['moving-map'] === true;
  }
  // The five secret variants whose own switches are on (their signs are drawn only then).
  _secretCoursesOn() {
    return SECRET_IDS.filter(id => { const flag = CIRCUIT_MANIFESTS.find(manifest => manifest.id === id)?.flag; return flag && this._switches().enabled(flag) === true; });
  }
  // Race here: leave the helicopter and start the normal race on this course
  // with this car. Flying never changes how the race runs.
  raceHere({courseId, carId}) {
    const stageIndex = COURSE.findIndex(stage => stage.id === courseId);
    if (!this.heliSession || stageIndex < 0 || !isCourseUnlocked(this.profile, COURSE[stageIndex])) return false;
    if (this._airOnlyRefused(carId && isCarUnlocked(this.profile, carId) ? carId : this.menuCar, courseId)) return false;
    if (this._fireClosedRefused(COURSE[stageIndex])) return false;
    this.returnToMenu();
    this.menuStage = stageIndex;
    if (carId && isCarUnlocked(this.profile, carId)) this.menuCar = carId;
    return this.startCampaign({startStage: stageIndex, car: this.menuCar});
  }
  // ---- driving lessons from the helipad (docs/DRIVING_LESSONS.md 12.6) ---------------
  // The next driving lesson on a course for a car that is open and not yet done,
  // or null: the same rows and rules the menu's board uses, for that course and car.
  _heliLessonAt(courseId, carId) {
    if (!this.drivingLessonsAvailable() || !this.player?.id) return null;
    const model = driveLessonBoardModel({...this.driveLessonProps(), courseId, carId});
    if (model.selected?.id !== courseId || !model.start || this._airOnlyBlocked(carId, courseId) ||
        courseClosed(this.profile, courseId, undefined, {enabled: this._fireOn()})) return null;
    const next = model.rows.find(row => row.open && !row.done);
    return next ? {id: next.id, name: next.name} : null;
  }
  // The air-only rule without its side effect (no message): an air-only car drives only where it was set down.
  _airOnlyBlocked(car, courseId) {
    return this._switches().enabled('helicopter') === true && isAirOnlyCar(car) && carAt(this.profile, car) !== courseId;
  }
  // The pad's Driving rows: the menu's own rows for the home course and the car at the pad. An air-only car
  // away from the pad takes no lesson here and the row says where it is. Null when driving lessons are off.
  heliDrivingBoard() {
    if (!this.heliSession || !this.drivingLessonsAvailable() || !this.player?.id) return null;
    const model = driveLessonBoardModel({...this.driveLessonProps(), courseId: HOME_COURSE, carId: this._heliCar});
    const carId = model.car?.id;
    if (carId && this._airOnlyBlocked(carId, HOME_COURSE)) {
      const where = carAt(this.profile, carId), name = HELI_DESTINATIONS[where]?.name ?? COURSE.find(course => course.id === where)?.name ?? where;
      return {rows: model.rows.map(row => ({...row, open: false, done: false})), notes: [`Your ${CARS[carId].name} is at ${name}.`], request: null};
    }
    return {rows: model.rows, notes: model.reason ? [model.reason] : [], request: model.start};
  }
  // Start a driving lesson from the pad: the helicopter visit ends and the menu's startLesson runs.
  heliStartDriving(lessonId) {
    const board = this.heliDrivingBoard(), row = board?.rows.find(item => item.id === lessonId);
    if (!board) return {ok: false, reason: 'Driving lessons are not available.'};
    if (!row || !(row.open || row.done) || !board.request) return {ok: false, reason: board.notes[0] ?? 'That driving lesson is not open yet.'};
    return this._driveFromHeli({...board.request, lessonId});
  }
  // Lesson here: the lesson offered beside Race here, on the course the car was set down on.
  lessonHere({courseId, carId, lessonId}) {
    if (!this.heliSession || !this.drivingLessonsAvailable() || this._airOnlyBlocked(carId, courseId)) return false;
    const model = driveLessonBoardModel({...this.driveLessonProps(), courseId, carId});
    if (model.selected?.id !== courseId || !model.start) return false;
    return this._driveFromHeli({...model.start, lessonId}).ok;
  }
  _driveFromHeli(request) {
    const stageIndex = COURSE.findIndex(stage => stage.id === request.courseId);
    if (stageIndex < 0 || this._airOnlyRefused(request.carId, request.courseId) || this._fireClosedRefused(COURSE[stageIndex])) return {ok: false, reason: this.courseAccessMessage || 'That course is not available.'};
    this.returnToMenu();
    this.menuStage = stageIndex; this.menuCar = request.carId; this.driveLessonCourse = request.courseId;
    if (!this.openDrivingLessons()) return {ok: false, reason: 'Driving lessons are not available.'};
    // The menu's own start call names the car `car`; its board's request names it `carId`.
    this._heliLessonPromise = this.startLesson({...request, car: request.carId});
    return {ok: true};
  }
  returnToYard() {
    if (!this.duel.state.arena) return false;
    this.returnToMenu();
    return this.visitWasteland();
  }
  visitWasteland() {
    if (this.duel.state.status !== 'menu') return false;
    this._refreshPlayer();
    const discovery = this.getHiddenRoadDiscovery();
    if (!discovery.enabled || !discovery.discoveredGate) return false;
    if (this._airOnlyRefused(this.menuCar, 'pacific-canyon')) return false;
    const car = this.menuCar, driverId = getEquippedDriverId(this.profile);
    this.runId = this._runPlayerId = this._markedRaceKey = null;
    this._settledHiddenRoadJourney = null;
    this._settledMuddyHollowDeparture = null;
    this.ghostRecorder = this.ghostRecord = this.ghostPose = this.grandPrixLapRecorder = null; this.lapTelemetryRecorder=null;this.ghostStatus = 'none';
    this.driftNotice = this.checkpointNotice = null;
    this._clearHiddenRoadInput(); this._stepAccumulator = 0;
    this._racePaint = getPaintAppearance(this.profile, car,
      {muddyHollowEnabled:true,yetiEnabled:this._switches().enabled('yeti'),labEnabled:this._switches().enabled('lab'),deepEnabled:this._switches().enabled('the-deep')}); this._racePaintCar = car;this._raceRoof=getRoadRoofLook(this.profile,car,{yetiEnabled:this._switches().enabled('yeti')});
    this.audio.unlock(); this.audio.setPaused(false);
    return this.duel.startHiddenRoadVisit({playerId: this.player.id, car, driverId,
      upgrades: getUpgradeLevels(this.profile, car), seed: this.getMenuSeed(0),
      difficulty: this._raceSettings.difficulty});
  }
  _clearHiddenRoadInput() {
    this.keys = {};
    this._resetKeyboardInput();
    this._footPointer.lookX = this._footPointer.lookY = 0;
    this._footPointer.fire = this._footPointer.aim = false;
    this.duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false,
      shiftUp: false, shiftDown: false, interact: false});
  }
  chooseHiddenRoad(choice) {
    const state = this.duel.state;
    if (!this.runId || state.playerId !== this._runPlayerId ||
        this._runPlayerId !== this.player.id || !this.duel.chooseHiddenRoad(choice)) return false;
    this._clearHiddenRoadInput();
    return true;
  }
  _markActiveRace(state){
    if(this.duel.drivingLesson)return;
    const yetiInput=(COURSE[state.stageIndex]?.id==='summit-run'||isSummitAttack(COURSE[state.stageIndex]))&&validYetiSeed(state.yetiSeed)&&
      this._switches().enabled('summit-run')&&this._switches().enabled('yeti');
    if(state.arena||state.mode==='grandprix'&&!yetiInput)return;
    if(COURSE[state.stageIndex]?.practice||!isCourseUnlocked(this.profile,state.stageIndex))return;
    const key=`${this.runId}:${state.stageIndex}`;
    if(!this.runId||this._markedRaceKey===key||this.profile.settledResults.includes(key))return;
    const pending=this.profile.activeRace?.key===key?this.profile.activeRace:{pendingPoliceFineCount:0,pendingPoliceFines:0};
    this._markedRaceKey=key;this.profile={...this.profile,activeRace:{...pending,key,runId:this.runId,stageIndex:state.stageIndex,stageId:COURSE[state.stageIndex]?.id,car:state.car,driverId:state.driverId,cpuDifficulty:state.cpuDifficulty||this.cpuDifficulty,
      ...(yetiInput?{yetiSeed:state.yetiSeed,...(state.mode==='grandprix'?{mode:'grandprix'}:{})}:{})}};this._saveProfile();
  }
  requestNavigation(action){
    if(!['restart','menu'].includes(action))return false;
    // One action is enough. The normal navigation paths settle unfinished
    // earnings once, preserve the saved bank, and clear held driving inputs.
    if(action==='restart')this.restart();else this.returnToMenu();return true;
  }
  addPlayer(name){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the menu to change players.'};
    this._refreshPlayers();
    const result=createPlayer(this.players,name);if(!result.ok)return result;
    this.players=result.registry;this.player=activePlayer(this.players);this.profile=this.player.profile;this._restoreRaceSettings({defaultsOnly:true});this._rememberRaceSettings();this.profileSaved=savePlayers(this.players);this.duel.emit({playerChanged:true});return {...result,registry:this.players,player:this.player};
  }
  selectPlayer(id){
    if(this.duel.state.status!=='menu')return false;
    this._refreshPlayers();if(!this.players.players.some(p=>p.id===id))return false;
    this.players=selectPlayer(this.players,id);this.player=activePlayer(this.players);this.profile=this.player.profile;this._restoreRaceSettings();this._rememberRaceSettings();this._recoverInterruptedRace();this._noteFirePlayDay();this.profileSaved=savePlayers(this.players);this.duel.emit({playerChanged:true});return true;
  }
  isYardHomeActive(){
    const state=this.duel.state, journey=state.hiddenRoadJourney;
    if(state.status!=='exploring'||journey?.phase!=='arrived'||!journey.departed||
      state.playerId!==this.player.id||!this._switches().enabled('hidden-road')||
      !this.wastelandUnlocked()||
      this.profile.wasteland?.discoveredGate!==true)return false;
    const visit=state.hiddenRoadVisit;
    return !visit||(visit.playerId===this.player.id&&visit.journeyId===journey.id);
  }
  wastelandUnlocked(){
    return wastelandUnlocked(this.profile);
  }
  // The released switch states, before the race view narrows the Wasteland rules.
  _switches(){
    return this.duel.featureFlags.base||this.duel.featureFlags;
  }
  _wastelandShopAccess(){
    return this.duel.state.status==='menu'||this.isYardHomeActive();
  }
  _saveShopProfile(previous){
    if(this._saveProfile())return true;
    this.profile=previous;
    this.players=replacePlayerProfile(this.players,this.player.id,previous);
    this.player=activePlayer(this.players);
    this._syncHiddenRoadDiscovery();
    return false;
  }
  _arsenalOptions(){
    return {wastelandEnabled:this.wastelandUnlocked(),
      arsenalEnabled:this._switches().enabled('arsenal')===true,
      arsenalWave3Enabled:this._switches().enabled('arsenal-wave3')===true};
  }
  purchaseArsenalWeapon(id){
    if(!this._wastelandShopAccess())return {ok:false,reason:'Return to the Armory to buy weapons.'};
    this._refreshPlayer();
    if(!this._wastelandShopAccess())return {ok:false,reason:'This yard visit no longer belongs to this player.'};
    const previous=this.profile,result=buyArsenalWeapon(this.profile,id,this._arsenalOptions());
    if(result.ok&&result.changed){
      this.profile=result.profile;
      if(!this._saveShopProfile(previous))return {ok:false,reason:'Could not save this purchase.'};
      this.duel.emit({garage:true});
    }
    return result;
  }
  purchaseWeapon(id){
    if(!this._wastelandShopAccess())return {ok:false,reason:'Return to the Armory to upgrade weapons.'};
    this._refreshPlayer();if(!this._wastelandShopAccess())return {ok:false,reason:'This yard visit no longer belongs to this player.'};
    const previous=this.profile,result=purchaseWeaponUpgrade(this.profile,id,
      this._arsenalOptions());
    if(result.ok){this.profile=result.profile;if(!this._saveShopProfile(previous))return {ok:false,reason:'Could not save this purchase.'};this.duel.emit({garage:true});}return result;
  }
  equipCarWeapon(slot,id){
    if(!this._wastelandShopAccess()||!this.wastelandUnlocked())
      return {ok:false,reason:'Return to the Wasteland Armory to change weapons.'};
    this._refreshPlayer();if(!this._wastelandShopAccess())return {ok:false,reason:'This yard visit no longer belongs to this player.'};
    const previous=this.profile,result=equipCarWeaponSlot(this.profile,slot,id,this._arsenalOptions());
    if(result.ok&&result.changed){this.profile=result.profile;if(!this._saveShopProfile(previous))return {ok:false,reason:'Could not save this loadout.'};this.duel.emit({garage:true,loadoutChanged:true});}
    return result;
  }
  selectCrewMember(id){
    if(!this._wastelandShopAccess()||!this.wastelandUnlocked())
      return {ok:false,reason:'Return to the Wasteland Armory to choose crew.'};
    this._refreshPlayer();if(!this._wastelandShopAccess())return {ok:false,reason:'This yard visit no longer belongs to this player.'};
    const previous=this.profile,result=chooseCrew(this.profile,id,{warlordCardsEnabled:this._switches().enabled('warlord-cards') && this._switches().enabled('crew-gear')});
    if(result.ok&&result.changed){this.profile=result.profile;if(!this._saveShopProfile(previous))return {ok:false,reason:'Could not save this crew choice.'};
      this.duel.emit({garage:true,crewChanged:true});}
    return result;
  }
  purchaseArmorKit(car,id){
    if(!this._wastelandShopAccess()||!this.wastelandUnlocked())
      return {ok:false,reason:'Return to the Armory with Wasteland enabled.'};
    this._refreshPlayer();if(!this._wastelandShopAccess())return {ok:false,reason:'This yard visit no longer belongs to this player.'};
    const previous=this.profile,result=purchaseArmorKit(this.profile,car,id);
    if(result.ok){this.profile=result.profile;if(!this._saveShopProfile(previous))return {ok:false,reason:'Could not save this purchase.'};this.duel.emit({garage:true});}
    return result;
  }
  _combatArmorKit(car) {
    const kit = getEquippedArmorKit(this.profile, car);
    return kit;
  }
  equipArmorKit(car,id=null){
    if(!this._wastelandShopAccess()||!this.wastelandUnlocked())
      return {ok:false,reason:'Return to the Armory with Wasteland enabled.'};
    this._refreshPlayer();if(!this._wastelandShopAccess())return {ok:false,reason:'This yard visit no longer belongs to this player.'};
    const previous=this.profile,result=equipArmorKit(this.profile,car,id);
    if(result.ok){this.profile=result.profile;if(!this._saveShopProfile(previous))return {ok:false,reason:'Could not save this kit choice.'};this.duel.emit({garage:true});}
    return result;
  }
  purchaseUpgrade(car,type){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before upgrading.'};
    this._refreshPlayer();
    const result=purchaseUpgrade(this.profile,car,type);
    if(result.ok){this.profile=result.profile;this._saveProfile();this.duel.emit({garage:true});}return result;
  }
  // ---- LAB-VIEW (docs/LAB.md): whether the Lab is open and the one place the Lab's own save calls land. The screen is
  // src/lab/lab-view.js; the rules are src/lab/lab-save.js and lab-shop.js. Nothing here touches a race or a flight.
  // Open means open on the menu: starting a race or a flight closes it, and it never reopens by itself.
  get labOpen(){if(this._labOpen===true&&this.duel.state.status!=='menu')this._labOpen=false;return this._labOpen===true;}
  set labOpen(value){this._labOpen=value===true;}
  labAvailable(){return !!this.player&&this._switches().enabled('lab')===true;}
  openLab(){
    if(this.duel.state.status!=='menu'||!this.labAvailable()||this.labOpen===true)return false;
    this.labOpen=true;this.audio.unlock();this.duel.emit({lab:true});return true;
  }
  closeLab(){
    if(this.labOpen!==true)return false;
    this.labOpen=false;this.duel.emit({lab:true});return true;
  }
  // The helipad's Lab door: the visit ends, as Race here does, and the Lab opens.
  labFromHeli(){
    if(!this.heliSession||!this.labAvailable())return false;
    this.returnToMenu();return this.openLab();
  }
  // make(profile, switches) -> {ok, reason, profile}; saved when it worked. Menu only, except a G-force lap passed in a race.
  labCommit(make,{anytime=false}={}){
    if(!this.labAvailable()||(!anytime&&this.duel.state.status!=='menu'))return {ok:false,reason:'The Lab is not available now.',profile:this.profile};
    this._refreshPlayer();
    const result=make(this.profile,this._switches());
    if(result?.ok&&result.profile&&result.profile!==this.profile){this.profile=result.profile;this._saveProfile();this.duel.emit({garage:true});}
    return result;
  }
  unlockCar(car){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before unlocking cars.'};
    this._refreshPlayer();
    const result=unlockCar(this.profile,car);
    if(result.ok){this.profile=result.profile;this._saveProfile();this.duel.emit({garage:true});}return result;
  }
  // The controls help is on request only (the H key); it never appears by itself.
  toggleHelp() {
    if (!['racing', 'countdown', 'exploring'].includes(this.duel.state.status)) return;
    this.helpVisible = this.helpVisible !== true;
  }
  togglePause() {
    const st = this.duel.state;
    if (!['racing', 'countdown', 'exploring', 'heli'].includes(st.status)) return;
    st.paused = !st.paused;
    this._footPointer.lookX = this._footPointer.lookY = 0;
    this._footPointer.fire = this._footPointer.aim = false;
    if(st.paused && st.onFoot && typeof document!=='undefined' &&
        document.pointerLockElement) document.exitPointerLock();
    this.keys = {};
    this._resetKeyboardInput();
    this.duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false });
    st.boosting = false;
    this.audio.setPaused(st.paused);
    if (!st.paused) this.audio.unlock();
    this.duel.emit({ paused: st.paused });
  }
  setGraphicsQuality(quality){
    this.ambientOcclusionEnabled=quality!=='performance';
    const selected=this.ambientOcclusionEnabled?'high':'performance';
    try{globalThis.localStorage?.setItem('duel_graphics_quality',selected);}catch{}
    this.duel.emit({graphicsQuality:selected});return selected;
  }
  setLightingMood(mood){
    this._refreshPlayer();this.lightingMood=normalizeLightingMood(mood);this._rememberRaceSettings({lightingMood:this.lightingMood});
    try{globalThis.localStorage?.setItem('duel_lighting_mood',this.lightingMood);}catch{}
    this.duel.emit({lightingMood:this.lightingMood});return this.lightingMood;
  }
  resume() { if (this.duel.state.paused) this.togglePause(); }
  returnToMenu() {
    if(this.duel.drivingLesson||this.driveLessonBoardOpen)this._clearDriveLesson();
    this.helpVisible = false;
    this._settleAbandoned();
    this._footPointer.lookX = this._footPointer.lookY = 0;
    this._footPointer.fire = this._footPointer.aim = false;
    if (this.duel.state.onFoot && typeof document !== 'undefined' &&
        document.pointerLockElement) document.exitPointerLock();
    this.keys = {};
    this._resetKeyboardInput();
    const st = this.duel.state;
    this.duel.clearDeep();this.deepAudio.stop();
    this._leaveHeli();
    if (st.heliVisit) st.heliVisit = null;
    st.paused = false; st.status = 'menu'; st.boosting = false;
    const wasVisit = !!st.hiddenRoadVisit;
    st.hiddenRoadJourney = null; st.hiddenRoadVisit = null;
    st.muddyHollowDeparture = null; st.arena = null;
    if (wasVisit) this._applyRaceSettings(this._raceSettings);
    st.driverId=getEquippedDriverId(this.profile);
    this.ghostRecorder=null;this.ghostRecord=null;this.ghostPose=null;this.grandPrixLapRecorder=null;this.lapTelemetryRecorder=null;this.ghostStatus='none';
    this._racePaint=null;this._racePaintCar=null;
    this.driftNotice=null;
    this.checkpointNotice=null;
    this.duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false });
    this.audio.setPaused(false);
    this.duel.emit({ menu: true });
  }
  get footCameraMode() {
    return wastelandRulesActive(this.duel.state) && this._footCameraMode === 'overhead'
      ? 'overhead' : 'first-person';
  }
  setFootCamera(mode) {
    if (!['first-person', 'overhead'].includes(mode) ||
        !wastelandRulesActive(this.duel.state)) return this.footCameraMode;
    this._refreshPlayer();
    if (this.profile.wasteland?.version !== 1) return this.footCameraMode;
    if (mode === this._footCameraMode) return this.footCameraMode;
    this._footCameraMode = mode;
    this._rememberRaceSettings({footCamera: mode});
    this.duel.emit({footCamera: mode});
    return this.footCameraMode;
  }
  cycleFootCamera() {
    return this.setFootCamera(this.footCameraMode === 'first-person' ? 'overhead' : 'first-person');
  }
  setCamera(mode) {
    this.cameraMode=normalizeCameraMode(this.cameraMode);
    if(['front','right','left'].includes(mode))mode='chase';
    if(!CAMERA_MODES.includes(mode))return this.cameraMode;
    this.cameraMode=mode;
    this.duel.emit({ camera: this.cameraMode });
    return this.cameraMode;
  }
  cycleCamera() {
    if(!CAMERA_MODES.includes(this.cameraMode))return this.setCamera('chase');
    return this.setCamera(CAMERA_MODES[(CAMERA_MODES.indexOf(this.cameraMode)+1)%CAMERA_MODES.length]);
  }

  // Headless fixed-step advance (tests / scripted runs without rAF).
  advance(seconds, dt = 1 / 60) {
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(dt) || dt <= 0) return;
    let t = 0;
    while (t < seconds - 1e-10) {
      const slice = Math.min(dt, seconds - t);
      this._simulate(slice); t += slice;
      if (this.duel.state.status === 'gameover' || this.duel.state.status === 'complete') break;
    }
  }

  // ---- input -----------------------------------------------------------
  activeInputContext() {
    return this.inputContext ?? (this.duel.state.status === 'menu' ? 'menu' :
      this.duel.state.status === 'heli' && this.heliSession ? 'heli' :
      this.duel.state.onFoot ? 'foot' : 'car');
  }
  setInputContext(context = null) {
    if (context !== null && !INPUT_CONTEXTS[context]) throw new Error(`Unknown input context: ${context}`);
    this.inputContext = context;
    this.keys = {};
    this._resetKeyboardInput();
    this.duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false,
      shiftUp: false, shiftDown: false, interact: false });
  }
  _inputAction(action) {
    if (!action) return;
    // MAP-VIEW: Esc closes the pilot's map before it pauses.
    if (action === 'pause' && this.heliMapOpen) this.setHeliMap(false);
    else if (action === 'pause') this.togglePause();
    else if (action === 'help') this.toggleHelp();
    else if (action === 'foot-camera-cycle') this.cycleFootCamera();
    else if (action === 'camera-cycle') this.cycleCamera();
    else if (action.startsWith('camera:')) this.setCamera(action.slice(7));
    else if (action.startsWith('weapon:')) {
      const baseId=action.slice(7),slot=WEAPON_IDS.indexOf(baseId);
      this.duel.fireWeapon(slot>=0&&this.duel.state.weaponLoadout?
        this.duel.state.weaponLoadout[slot]:baseId);
    }
    else if (action.startsWith('gear:')) this.duel.selectFootGear(Number(action.slice(5)));
    else if (action === 'shift-up') this.duel.setInput({ shiftUp: true });
    else if (action === 'shift-down') this.duel.setInput({ shiftDown: true });
    // SKI-VIEW: on skis C changes the ski camera and H shows the ski keys (the hook means nothing there).
    else if (this.heliSession?.phase === 'skiing' && (action === 'heli-camera' || action === 'heli-hook')) {
      if (this.duel.state.paused) return;
      if (action === 'heli-camera') this.skiCamera = (this.skiCamera + 1) % SKI_CAMERA_VIEWS.length; else this.skiHelp = !this.skiHelp;
      this.duel.emit({heli: true});
    }
    else if (action === 'heli-hook') this._heliPress(session => session.hookKey());
    else if (action === 'heli-autopilot') this._heliPress(session => session.pressAutopilot());
    else if (action === 'heli-cruise') this._heliPress(session => session.acceptCruise());
    else if (action === 'heli-radio') this._heliPress(session => session.pressRadio());
    else if (action === 'heli-map') { if (this.heliSession && !this.duel.state.paused) this.setHeliMap(!this.heliMapOpen); } // MAP-VIEW
    else if (action === 'heli-camera') { this.heliCamera = (this.heliCamera + 1) % (this.heliSession?.cameraCount ?? 4); this.duel.emit({heli: true}); }
    else if (action === 'deep-surface') this.duel.deepSurface(); // DEEP-EXPLORER
    else if (action === 'deep-ping') this.duel.deepPing(); // DEEP-SIRENA-VIEW: R under water
    else if (action === 'mute') { this.audio.toggleMute(); this.duel.emit({ mute: this.audio.muted }); }
    else if (action === 'restart' && this.duel.state.status !== 'menu') this.requestNavigation('restart');
  }
  // SKI-VIEW: the ski box, the run menu and the run's buttons ask here; the session decides and its events play out.
  heliSki(action, ...args) {
    const session = this.heliSession, call = {drop: 'takeSkiDrop', group: 'takeSkiGroup', handBack: 'dropSkiFlight', stepOut: 'skiStepOut',
      restart: 'restartSkiRun', leave: 'leaveSkiRun'}[action];
    if (!session || !call || typeof session[call] !== 'function' || this.duel.state.paused) return {ok: false};
    const result = session[call](...args);
    if (action === 'stepOut' && result?.ok) { this.skiCamera = 0; this.skiHelp = false; }
    this._heliEvents(session.takeEvents());
    return result;
  }
  _heliPress(press) {
    if (!this.heliSession || this.duel.state.paused) return;
    press(this.heliSession);
    this._heliEvents(this.heliSession.takeEvents());
  }
  _resetKeyboardInput() {
    this._keyboardSteering.reset();
    this._arenaKeyboardSteering.reset();
    this._keyboardThrottle.reset();
    this._keyboardArena=null;
  }
  _applyInput(dt) {
    const st = this.duel.state;
    const pad = this._readGamepad(dt);
    const context = this.activeInputContext();
    if (st.paused) {this._resetKeyboardInput();return;}
    if (st.status === 'exploring' && (st.hiddenRoadJourney?.controlsLocked||st.deepJourney?.controlsLocked)) {
      this.duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false,
        shiftUp: false, shiftDown: false, interact: false});
      this._resetKeyboardInput();
      return;
    }
    if (context === 'foot') {
      this._resetKeyboardInput();
      const foot=footControlInput(this.keys,pad,this._footPointer);
      this.duel.setInput({throttle:0,brake:0,steer:0,boost:false,
        interact:foot.interact});
      this.duel.setFighterInput(foot);
      this._footPointer.lookX=this._footPointer.lookY=0;
      return;
    }
    if (context !== 'car') {this._resetKeyboardInput();return;}
    if (this.autopilot) {this._resetKeyboardInput();this._driveAutopilot(dt);return;}
    const k = this.keys;
    const arena=this.duel.course?.def.venue===true&&this.duel.course?.def.arena===true;
    if(this._keyboardArena!==arena){this._resetKeyboardInput();this._keyboardArena=arena;}
    const steering=arena?this._arenaKeyboardSteering:this._keyboardSteering;
    const tyreKeyboard = st.tyreSlipRules === true && !st.airborne && st.speedMph >= 0
      ? {tyreSlip: true, car: this.duel.car, grip: this.duel.car.grip,
        traction: this.duel._drivingSurface(st.s,st.lateral).traction, course: this.duel.course} : undefined;
    const keyboardSteer = steering.update(keyboardSteeringDirection(k),dt,st.speedMph,tyreKeyboard);
    const pressedThrottle=heldInput(context,'throttle',k);
    const keyboardThrottle=arena?(pressedThrottle?1:0):this._keyboardThrottle.update(pressedThrottle,dt);
    this.duel.setInput({
      throttle: pressedThrottle ? keyboardThrottle : pad.throttle,
      brake: heldInput(context, 'brake', k) ? 1 : pad.brake,
      steer: keyboardSteer || pad.steer,
      boost: heldInput(context, 'boost', k) || pad.boost,
      interact: heldInput(context, 'interact', k) || pad.interact,
    });
  }

  _readGamepad(dt = 1 / 120) {
    const neutral = { throttle: 0, brake: 0, steer: 0, boost: false };
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return neutral;
    let pad;
    try { pad = Array.from(navigator.getGamepads()).find(p => p?.connected); }
    catch (_) { return neutral; } // Some embedded browsers disable gamepad permission.
    if (!pad) { this._gamepadButtons = []; return neutral; }
    const pressed = pad.buttons.map(b => b.pressed);
    if (pressed.some(Boolean)) this.audio.unlock();
    for (const action of gamepadEdgeActions(this.activeInputContext(), pressed, this._gamepadButtons)) this._inputAction(action);
    this._gamepadButtons = pressed;
    if (this.activeInputContext() === 'heli') return {...neutral, pad};
    return this.activeInputContext()==='foot' ?
      footGamepadInput(pad,pressed,dt) : carGamepadDrive(pad, pressed);
  }

  // Scripted full-stage driver: floors it, follows the racing line, dodges
  // traffic by lane, performs one deterministic shoulder excursion, then
  // drives clean to the results screen.
  _driveAutopilot(dt) {
    const d = this.duel, st = d.state;
    if (st.status === 'ticket') { d.ackTicket(); return; }
    if (st.status === 'countdown') return;
    if (st.status !== 'racing') return;
    if (st.impactTimer > 0) {
      this._scriptedCrashDone = true;
      d.setInput({ throttle: 0, brake: 0, steer: 0, boost: false });
      return;
    }
    if (!d.diff.autoShift) {
      d.setInput({ shiftUp: st.revs > .95, shiftDown: st.revs < .48 && st.gear > 0 });
    }

    // Boxed in off the road: back out and go round the wall (null unless stuck for a few seconds).
    const rescue = unstuckInput(this, d);
    if (rescue) { d.setInput({ ...rescue, boost: false }); return; }

    if (st.tyreSlipRules === true && d.course.def.kind === 'drift' && !st.airborne && st.speedMph >= 0) {
      this._driveSlipDrift();
      return;
    }

    // Visit the shoulder once to exercise reduced grip and recovery steering.
    if (!this._scriptedCrashDone && !st.objective && st.s > 250) {
      let swerve = 1;
      if (st.tyreSlipRules && !st.airborne && st.speedMph >= 0) {
        const traction = d._drivingSurface(st.s,st.lateral).traction;
        swerve = steerForYaw(-steeringYawAuthority(st.speedMph,d.car.grip,traction,d.car),
          {speedMph:st.speedMph,grip:d.car.grip,traction,car:d.car,brake:0,tyreSlip:true});
      }
      d.setInput({ throttle: 1, brake: 0, steer: swerve }); // swerve off the road
      if (st.offRoad && Math.abs(st.lateral) > (d.course.roadHalfWidthAt?.(st.s)??DRIVE.roadHalfWidth) + 2) this._scriptedCrashDone = true;
      else return;
    }

    // Demo-only heading controller. It drives through the same steering and
    // traction model as the player; manual input never receives this help.
    const frame = d.course.at(st.s);
    const halfWidth=d.course.roadHalfWidthAt?.(st.s)??DRIVE.roadHalfWidth;
    const cruisingLane=-Math.min(DRIVE.laneOffset,halfWidth*.48);
    const metresPerSec = st.speedMph * DRIVE.mphToWorld;
    const transit = pitTransitTarget(d.course, st, st.s + Math.max(12, metresPerSec * .45));
    let targetLat = transit?.lateral ?? cruisingLane;
    if(!transit && st.objective?.kind==='stuntTrial'){
      const targets=d.course.features.crushables.filter(prop=>!st.crushedProps.includes(prop.id)).map(prop=>({prop,gap:d.relativeS(prop.s,st.s)-st.s})).filter(item=>item.gap>=-10&&item.gap<=105).sort((a,b)=>a.gap-b.gap);
      if(targets.length)targetLat=targets[0].prop.off;
    }
    // Start the pass with enough time to steer, and clear the car's rear
    // before returning. The center offers a safe gap to two-way traffic.
    const opponents=st.opponents|| (st.rival?[st.rival]:[]);
    const obstacles=opponents.length?[...st.traffic,...opponents.map(opponent=>({...opponent,alive:true,dir:1}))]:st.traffic;
    for (const c of transit ? [] : obstacles) {
      if (!c.alive) continue;
      const ahead = (d.relativeS?d.relativeS(c.s,st.s):c.s)-st.s;
      const closingSpeed = Math.max(0, st.speedMph - c.dir * c.speedMph) * DRIVE.mphToWorld;
      if (ahead > -28 && ahead < 35 + closingSpeed * 1.15 && Math.abs(c.lateral - cruisingLane) < 2.7) {
        targetLat = Math.min(halfWidth-1.8, Math.max(0, c.lateral + 3.2)); break;
      }
    }
    const headingTarget = Math.atan((targetLat - st.lateral) * 2.5 / Math.max(15, metresPerSec));
    const look = d.course.at(st.s + metresPerSec * .18);
    const desiredYaw = look.curvature * metresPerSec + (headingTarget - st.headingError) * 6;
    const drivingSurface=d._drivingSurface(st.s,st.lateral),traction=drivingSurface.traction;
    const bend = Math.max(Math.abs(frame.curvature), Math.abs(d.course.at(st.s + 100).curvature), Math.abs(d.course.at(st.s + 220).curvature));
    // Winter corners use the same actual traction as steering. Other surfaces
    // retain the old plan, including winter tyres on dry asphalt.
    const cornerGrip = ['snow', 'deep-snow', 'ice'].includes(drivingSurface.gripKind) ? traction : 1;
    const cornerFactor = .85;
    const cornerSpeed = Math.min(d.car.topSpeed * .94, cornerFactor * Math.sqrt(DRIVE.maxLateralAccel * d.car.grip * cornerGrip / Math.max(.0001, bend)) / DRIVE.mphToWorld);
    const targetSpeed = Math.min(drivingSurface.speedLimit,transit?.speedMph ?? cornerSpeed);
    const throttle = st.speedMph < targetSpeed ? 1 : 0;
    const brake = st.speedMph > targetSpeed + 4 ? Math.min(1, (st.speedMph - targetSpeed) / 20) : 0;
    let steer = steerForYaw(desiredYaw,{speedMph:st.speedMph,grip:d.car.grip,traction,car:d.car,brake,
      tyreSlip:st.tyreSlipRules === true && !st.airborne && st.speedMph >= 0});
    d.setInput({ throttle, brake, steer, boost: false });
  }

  _driveSlipDrift() {
    const d=this.duel, st=d.state, course=d.course;
    let route=this._driftLine;
    if (!route || route.course!==course || route.car!==d.car) {
      const line=racingLineFor(course);
      // The profile assumes the launch the car really has here (the quick one under the sliding-tyre rules).
      this._driftLine=route={course,car:d.car,line,profile:buildSpeedProfile(line,d.car,{accelFactor:launchScale(course,false,true)/DRIVE.accelScale})};
    }
    const v=st.speedMph*DRIVE.mphToWorld;
    const targetLat=route.line.offsetAt(st.s+Math.max(12,v*.45));
    const error=targetLat-st.lateral;
    const heading=Math.atan(error*2.5/Math.max(15,v));
    const look=course.at(st.s+v*.18);
    const desiredYaw=look.curvature*v+(heading-st.headingError)*6;
    const surface=d._drivingSurface(st.s,st.lateral);
    const targetSpeed=Math.min(surface.speedLimit,d.car.topSpeed*.97,
      route.profile.at(st.s)*TYRE_SLIP.driftLineSkill*Math.sqrt(surface.traction||1));
    const brake=st.speedMph>targetSpeed+3?Math.min(1,(st.speedMph-targetSpeed)/14):0;
    let throttle=st.speedMph<targetSpeed?1:0;
    let steer=steerForYaw(desiredYaw,{speedMph:st.speedMph,grip:d.car.grip,
      traction:surface.traction,car:d.car,brake,tyreSlip:true});
    if (st.speedMph>=TYRE_SLIP.driftMinMph) {
      if (Math.abs(error)<=TYRE_SLIP.driftRecoveryMeters && Math.abs(look.curvature)>.0001) {
        const {peakYaw,steerGain}=tyreSlipSteering({speedMph:st.speedMph,grip:d.car.grip,
          traction:surface.traction,car:d.car,brake});
        const ask=Math.abs(steer)*steerGain/Math.max(.000001,peakYaw);
        if (ask<TYRE_SLIP.driftAskLow || ask>TYRE_SLIP.driftAsk) {
          steer=-Math.sign(look.curvature)*Math.min(1,TYRE_SLIP.driftAsk*peakYaw/Math.max(.05,steerGain));
        }
      }
      if (st.tyreSlip>TYRE_SLIP.driftLiftSlip) throttle=0;
    }
    d.setInput({throttle,brake,steer,boost:false});
  }

  _bindKeys() {
    if (typeof window === 'undefined') return;
    this._inputEvents=new AbortController();const signal=this._inputEvents.signal;
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof Element && e.target.closest('input, select, textarea, summary, [contenteditable="true"]')) return;
      if(e.code==='Escape' && this.duel.state.onFoot){
        if(document.pointerLockElement){document.exitPointerLock();e.preventDefault();return;}
        if(performance.now()-this._footPointerReleasedAt<250){e.preventDefault();return;}
      }
      if(e.code==='Enter'&&this.duel.drivingLesson&&!e.repeat&&!(e.target instanceof Element&&e.target.closest('button'))){
        if(this.nextLessonAttempt())e.preventDefault();return;
      }
      this.audio.unlock();
      if (!e.repeat) this._inputAction(keyboardAction(this.activeInputContext(), e.code));
      this.keys[e.code] = true;
      if(!keyboardSteeringDirection(this.keys)){this._keyboardSteering.reset();this._arenaKeyboardSteering.reset();}
      if(!heldInput('car','throttle',this.keys))this._keyboardThrottle.reset();
      if (preventCarKeyDefault(e.code, e.target instanceof Element && !!e.target.closest('button'))) e.preventDefault();
    },{signal});
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false;if(!keyboardSteeringDirection(this.keys)){this._keyboardSteering.reset();this._arenaKeyboardSteering.reset();}
      if(!heldInput('car','throttle',this.keys))this._keyboardThrottle.reset(); },{signal});
    window.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true,signal });
    // Mouse events report each button in a chord; pointerdown only reports
    // the first button, losing left-click while right-click is already held.
    window.addEventListener('mousedown', e => {
      if (!this.duel.state.onFoot || this.duel.state.paused ||
          !['racing', 'countdown', 'exploring'].includes(this.duel.state.status) ||
          ![0, 2].includes(e.button) || !(e.target instanceof Element)) return;
      const canvas = e.target.closest('#view3d canvas');
      if (!canvas) return;
      e.preventDefault();
      if (!document.pointerLockElement) {
        try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch {}
      }
      if (e.button === 0) this._footPointer.fire = true;
      if (e.button === 2) this._footPointer.aim = true;
    }, {signal});
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this._footPointer.fire = false;
      if (e.button === 2) this._footPointer.aim = false;
    }, {signal});
    window.addEventListener('mousemove', e => {
      if (!this.duel.state.onFoot || this.duel.state.paused ||
          !['racing', 'countdown', 'exploring'].includes(this.duel.state.status)) return;
      // Canvas movement remains usable before the first click and when the
      // browser refuses pointer lock. Menus and the rest of the page stay inert.
      if (document.pointerLockElement == null &&
          !(e.target instanceof Element && e.target.closest('#view3d canvas'))) return;
      this._footPointer.lookX += Math.max(-300, Math.min(300, e.movementX || 0));
      this._footPointer.lookY += Math.max(-300, Math.min(300, e.movementY || 0));
    }, {signal});
    window.addEventListener('contextmenu',e=>{
      if(this.duel.state.onFoot && e.target instanceof Element &&
          e.target.closest('#view3d canvas'))e.preventDefault();
    },{signal});
    // Headless tests provide a window without a document; pointer lock needs both.
    if(typeof document!=='undefined')document.addEventListener('pointerlockchange',()=>{
      if(document.pointerLockElement || !this.duel.state.onFoot)return;
      this._footPointer.fire=this._footPointer.aim=false;
      this._footPointerReleasedAt=performance.now();
      if(!this.duel.state.paused)this.togglePause();
    },{signal});
    window.addEventListener('blur', () => {
      this.keys = {};
      this.heliSession?.cancelHook();
      this._footPointer.fire=this._footPointer.aim=false;
      this._resetKeyboardInput();
      if (!this.duel.state.paused && ['racing', 'countdown', 'exploring'].includes(this.duel.state.status)) this.togglePause();
    },{signal});
  }

  // ---- dev globals -----------------------------------------------------
  _exposeGlobals() {
    if (typeof window === 'undefined') return;
    const a = this;
    window.__game = {
      get duel() { return a.duel; },
      get state() { return a.duel.state; },
      get stage() { return { index: a.duel.state.stageIndex, name: a.duel.stageDef.name }; },
      get speed() { return Math.round(Math.abs(a.duel.state.speedMph)); },
      get gear() { return a.duel.state.gear < 0 ? 'R' : a.duel.state.gear + 1; },
      get lives() { return a.duel.state.lives; },
      get penalties() { return Math.round(a.duel.state.penaltySec); },
      get status() { return a.duel.state.status; },
      get police() { return { beep: +a.duel.state.police.beep.toFixed(2), triggered: a.duel.state.police.triggered, pursuit: a.duel.state.police.pursuit }; },
      // verbs
      startCampaign: (o) => a.startCampaign(o),
      nextStage: () => a.nextStage(),
      chooseHiddenRoad: choice => a.chooseHiddenRoad(choice),
      setInput: (i) => a.duel.setInput(i),
      advance: (sec) => a.advance(sec),
      autopilotOn: () => { a.autopilot = true; a._scriptedCrashDone = false; },
      pause: () => a.togglePause(),
      resume: () => a.resume(),
      restart: () => a.restart(),
      get paused() { return a.duel.state.paused; },
      get cameraMode() { return a.cameraMode; },
      get audio() { return { unlocked: !!a.audio.context, muted: a.audio.muted, state: a.audio.context?.state ?? 'locked' }; },
    };
  }
}

function readGraphicsQuality(){try{return globalThis.localStorage?.getItem('duel_graphics_quality')==='performance'?'performance':'high';}catch{return 'high';}}
function readLightingMood(){try{return normalizeLightingMood(globalThis.localStorage?.getItem('duel_lighting_mood'));}catch{return 'clear';}}
