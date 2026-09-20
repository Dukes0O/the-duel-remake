// app.js — owns the Duel instance, the rAF/step loop, keyboard input, the
// scripted autopilot, dev hooks, and window.__game. Rendering (render3d.js) and
// DOM HUD (main.js) are views that read state and call these verbs.

import { Duel } from './game.js';
import { Course } from './course.js';
import { seedFromUrl } from './rng.js';
import { DRIVE, COURSE, DEFAULT_CPU_DIFFICULTY, steeringYawAuthority } from './config.js';
import { EngineAudio } from './audio.js';
import { loadPlayers, savePlayers, activePlayer, createPlayer, selectPlayer, replacePlayerProfile, settleRace, settlePoliceFine, purchaseUpgrade, unlockCar, getUpgradeLevels, isCarUnlocked, CPU_REWARDS } from './progression.js';
import {loadLeaderboard,saveLeaderboard,recordFinish,mergeLeaderboards} from './leaderboard.js';
import {loadGhosts,saveGhosts,findGhost,mergeGhostStores,storeGhost,GhostRecorder,sampleGhost,readGhostEnabled,saveGhostEnabled} from './ghost.js';
import {getPaintAppearance,purchasePaint as buyPaint,applyPaint as equipPaint} from './paint-presets.js';
import {DEFAULT_ROUTE_VARIANT,isRouteVariant,getRouteVariant,getRouteVariantForSeed,supportsRouteVariants} from './route-variants.js';
import {normalizeLightingMood} from './lighting-moods.js';
import {DEFAULT_RACE_SETTINGS,normalizeRaceSettings,raceSettingsChoices,raceSettingsStage} from './race-settings.js';

const SIMULATION_STEP = 1 / 120;
export const ROUTE_PREFERENCE_KEY='duel_route_variant';
function readRoutePreference(){try{const value=globalThis.localStorage?.getItem(ROUTE_PREFERENCE_KEY);return isRouteVariant(value)?value:DEFAULT_ROUTE_VARIANT;}catch{return DEFAULT_ROUTE_VARIANT;}}

export class App {
  constructor() {
    const url = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams('');
    const urlSeed=url.has('seed')?seedFromUrl():null,urlRoute=getRouteVariantForSeed(urlSeed);
    this.menuRouteId=urlRoute?.id||readRoutePreference();this._customMenuSeed=urlSeed!=null&&!urlRoute?urlSeed:null;
    this.seed = this._customMenuSeed??getRouteVariant(this.menuRouteId).seed;
    this.autopilot = url.get('autopilot') === '1';
    this.duel = new Duel({
      seed: this.seed,
      difficulty: url.get('diff') || undefined,
      car: url.get('car') || undefined,
    });
    this.keys = {};
    this.players=loadPlayers();this.player=activePlayer(this.players);this.profile=this.player.profile;
    this._legacyRaceDefaults={...DEFAULT_RACE_SETTINGS,routeVariant:readRoutePreference(),lightingMood:readLightingMood(),ghostEnabled:readGhostEnabled()};
    // Capture old browser preferences once for every existing legacy player.
    // Later global compatibility writes cannot change another player's setup.
    if(this.players.players.some(player=>!player.profile.raceSettings)) {
      this.players={...this.players,players:this.players.players.map(player=>player.profile.raceSettings?player:{...player,profile:{...player.profile,raceSettings:normalizeRaceSettings(this._legacyRaceDefaults,player.profile)}})};
      this.player=activePlayer(this.players);this.profile=this.player.profile;this.profileSaved=savePlayers(this.players);
    }
    this.leaderboard=loadLeaderboard();this.cpuDifficulty=DEFAULT_CPU_DIFFICULTY;
    this.ghosts=loadGhosts();this.ghostEnabled=readGhostEnabled();this.ghostPose=null;this.ghostRecord=null;this.ghostRecorder=null;this.ghostStatus='none';this._ghostPoseBuffer={};
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
    this.audio = new EngineAudio();
    this.duel.onChange((state, event) => {
      this.audio.event(event);
      if(event.driftBanked||event.driftChainLost)this.driftNotice={type:event.driftBanked?'banked':'lost',...(event.driftBanked||event.driftChainLost),expiresAt:state.stageTimeSec+2};
      if(event.checkpointRushEvent)this.checkpointNotice={...event.checkpointRushEvent,expiresAt:state.stageTimeSec+2.5};
      if(event.ticket)this._settlePoliceTicket(event.ticket,state);
      if (event.stageResult) {
        this._settleResult(event.stageResult,state);
      }
      else if(event.gameover)this._settleResult(state.results||{},state);
      if(event.stageLoaded!=null){this._stageStartCrashes=state.majorCrashes;this._markedRaceKey=null;this.driftNotice=null;this.checkpointNotice=null;this._startGhostStage(state);}
      if(event.go){this._markActiveRace(state);this.ghostRecorder?.observe(state);}
      if(event.boundaryReset||event.recovered||event.checkpointReset)this.ghostRecorder?.discontinuity();
    });
    this._gamepadButtons = [];
    this._stepAccumulator = 0;
    this.raf = 0;
    this.lastT = null;
    this.running = false;
    this._scriptedCrashDone = false;
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
    this._visualReadiness={owner,ready:false,state:null,course:null};this._stepAccumulator=0;return true;
  }
  holdVisualReadiness(owner){
    if(this._visualReadiness?.owner!==owner)return false;
    this._visualReadiness.ready=false;this._stepAccumulator=0;return true;
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
    this.stop();this._inputEvents?.abort();this.keys={};this.onFrame=null;
    this.frameDiagnostics?.stop();this.frameDiagnostics=null;
    this._visualReadiness=null;
    this._menuCourses.clear();this.ghostRecorder=this.ghostRecord=this.ghostPose=null;
    this.audio.setPaused(true);this.audio.context?.close?.()?.catch?.(()=>{});
    if(typeof window!=='undefined'&&window.__game?.duel===this.duel)delete window.__game;
  }
  _updateAudio(){
    const state=this.duel.state,course=this.duel.course,tunnel=course?.tunnelAt?.(state.s);
    const phase=course?.phase?.(state.s)??state.s;
    const inside=tunnel&&Math.abs(state.lateral)<=tunnel.width&&(state.airHeight||0)<tunnel.height;
    const tunnelMix=inside?Math.max(0,Math.min(1,(phase-tunnel.start)/12,(tunnel.end-phase)/12)):0;
    this.audio.update(state,{tunnel:tunnelMix,looseSurface:!!course?.def.offroad||!!course?.def.arena,biome:course?.themeAt(state.s),night:course?.def.timeOfDay==='night',cameraMode:this.cameraMode});
  }

  _simulate(seconds) {
    if(!this.visualReady){this._stepAccumulator=0;return;}
    this._stepAccumulator += seconds;
    while (this._stepAccumulator + 1e-10 >= SIMULATION_STEP) {
      if(!this.visualReady){this._stepAccumulator=0;break;}
      if(this.duel.state.status==='racing'&&!this.duel.state.paused)this._markActiveRace(this.duel.state);
      this._applyInput(SIMULATION_STEP);
      this.duel.step(SIMULATION_STEP);
      this._updateGhost(this.duel.state);
      this._stepAccumulator = Math.max(0, this._stepAccumulator - SIMULATION_STEP);
    }
  }

  startCampaign(options = {}) {
    this._refreshPlayer();
    const stageIndex=Math.max(0,Math.min(COURSE.length-1,Math.floor(options.startStage??this.menuStage))),stage=COURSE[stageIndex];
    if((stage.arena||stage.requiredCar)&&!isCarUnlocked(this.profile,stage.requiredCar||'titan_monster'))return false;
    this._settleAbandoned();
    const selectedCar=(stage.arena||stage.requiredCar)?stage.requiredCar||'titan_monster':options.car||this.duel.state.car;
    const car=isCarUnlocked(this.profile,selectedCar)?selectedCar:'falcone_f42';
    const explicitSeed=Number.isSafeInteger(options.seed)?options.seed>>>0:null;
    // Keep legacy headless callers that set duel.seed before their first start.
    const legacySeed=this.duel.state.status==='menu'&&this.duel.seed!==this.seed?this.duel.seed>>>0:null;
    const selectedSeed=isRouteVariant(options.routeVariant)?getRouteVariant(options.routeVariant).seed:explicitSeed??legacySeed??this.getMenuSeed(stageIndex);
    this.seed=supportsRouteVariants(stage)?selectedSeed:1989;
    this._racePaint=getPaintAppearance(this.profile,car);this._racePaintCar=car;
    this.runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this._stageStartCrashes=0;
    this._campaignStart=stageIndex;this._runPlayerId=this.player.id;
    this.cpuDifficulty=['easy','medium','hard'].includes(options.cpuDifficulty)?options.cpuDifficulty:this.cpuDifficulty;
    const mode=['chase','drift','checkpoint'].includes(stage.kind)||stage.stuntTrial?'duel':options.mode??this._raceSettings.mode;
    const difficulty=options.difficulty??this.duel.state.difficulty;
    this._rememberRaceSettings({eventId:stage.id,mode,difficulty,car,cpuDifficulty:this.cpuDifficulty,routeVariant:supportsRouteVariants(stage)?getRouteVariantForSeed(this.seed)?.id??this.menuRouteId:this.menuRouteId});
    this.menuStage=stageIndex;this.menuCar=car;
    this.audio.unlock();
    this.audio.setPaused(false);
    this.keys = {};
    this._stepAccumulator = 0;
    this._scriptedCrashDone = false;
    this.duel.startCampaign({...options,seed:this.seed,mode,difficulty,car,startStage:this._campaignStart,upgrades:getUpgradeLevels(this.profile,car),cpuDifficulty:this.cpuDifficulty,playerId:this.player.id});
    return true;
  }
  getRaceChoices(){return raceSettingsChoices(this._raceSettings);}
  _restoreRaceSettings({defaultsOnly=false,overrides={},customSeed=null}={}){
    const saved=defaultsOnly?DEFAULT_RACE_SETTINGS:this.profile.raceSettings||this._legacyRaceDefaults;
    this._applyRaceSettings(normalizeRaceSettings({...saved,...overrides},this.profile),customSeed);
  }
  _applyRaceSettings(settings,customSeed=this._customMenuSeed){
    this._raceSettings=settings;this.menuStage=raceSettingsStage(settings);this.menuCar=settings.car;this.menuRouteId=settings.routeVariant;this._customMenuSeed=customSeed;
    this.cpuDifficulty=settings.cpuDifficulty;this.ghostEnabled=settings.ghostEnabled;this.lightingMood=settings.lightingMood;
    this.seed=this.getMenuSeed();this.duel.seed=this.seed;this.duel.carKey=settings.car;this.duel.difficultyKey=settings.difficulty;
    Object.assign(this.duel.state,{seed:this.seed,car:settings.car,difficulty:settings.difficulty,cpuDifficulty:settings.cpuDifficulty,mode:settings.mode});
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
    const settings=this._rememberRaceSettings(values),customSeed=Object.hasOwn(values,'routeVariant')?null:this._customMenuSeed;
    this._applyRaceSettings(settings,customSeed);this.duel.emit({raceSettingsChanged:true});return this.getRaceChoices();
  }
  restart() {
    const { mode, car, difficulty,cpuDifficulty } = this.duel.state;
    this.startCampaign({ mode, car, difficulty,cpuDifficulty,seed:this.duel.state.seed,startStage:this._campaignStart||0 });
  }
  getMenuSeed(stageIndex=this.menuStage){return supportsRouteVariants(COURSE[stageIndex])?(this._customMenuSeed??getRouteVariant(this.menuRouteId).seed):1989;}
  // Menu views share these immutable-by-convention previews; racing always builds its own Course.
  getMenuCourse(stageIndex=this.menuStage){
    const index=Number.isInteger(stageIndex)&&COURSE[stageIndex]?stageIndex:0,seed=this.getMenuSeed(index),key=`${index}:${seed}`;
    let course=this._menuCourses.get(key);
    if(course)this._menuCourses.delete(key);else course=new Course(COURSE[index],seed);
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
    return findGhost(this.ghosts,this.player.id,{seed:this.getMenuSeed(stageIndex),car:this.duel.state.car,difficulty:this.duel.state.difficulty,cpuDifficulty:this.cpuDifficulty,...options,stageIndex,laps:COURSE[stageIndex]?.laps||2});
  }
  getPaintPreset(car,{menu=false}={}){
    if(menu||this.duel.state.status==='menu')return getPaintAppearance(this.profile,car);
    return car===this._racePaintCar?this._racePaint:null;
  }
  purchasePaint(car,id){return this._paintOperation(car,id,true);}
  applyPaint(car,id){return this._paintOperation(car,id,false);}
  _paintOperation(car,id,buy){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before changing paint.',cost:0};
    this._refreshPlayer();const result=(buy?buyPaint:equipPaint)(this.profile,car,id);
    if(result.ok&&result.changed){this.profile=result.profile;this._saveProfile();this.duel.emit({garage:true,paintChanged:true});}return result;
  }
  setGhostEnabled(enabled){
    this._refreshPlayer();this.ghostEnabled=!!enabled;this._rememberRaceSettings({ghostEnabled:this.ghostEnabled});saveGhostEnabled(this.ghostEnabled);this._updateGhost(this.duel.state);this.duel.emit({ghostChanged:true});return this.ghostEnabled;
  }
  _startGhostStage(state){
    this.ghostPose=null;this.ghostRecord=null;this.ghostRecorder=null;this.ghostStatus='none';
    if(state.mode!=='timetrial'||!this.runId||this._runPlayerId!==this.player.id||state.playerId!==this.player.id)return;
    if(this.ghostSaved!==false)this.ghosts=mergeGhostStores(this.ghosts,loadGhosts());
    const context={playerId:this.player.id,seed:state.seed,stageIndex:state.stageIndex,laps:state.lapsTotal,car:state.car,mode:state.mode,difficulty:state.difficulty,cpuDifficulty:state.cpuDifficulty,upgrades:{...state.upgrades}};
    this.ghostRecord=this.getGhostRecord(context);
    if(this.ghostRecord){this.ghostRecord.lastUsedAt=Date.now();this.ghostSaved=saveGhosts(this.ghosts);}
    this.ghostRecorder=new GhostRecorder(context);this._updateGhost(state);
  }
  _updateGhost(state){
    this.ghostPose=null;
    if(state.mode!=='timetrial'||state.playerId!==this.player.id||!['countdown','racing','ticket'].includes(state.status)){this.ghostStatus='none';return;}
    this.ghostRecorder?.observe(state);
    this.ghostStatus=this.ghostRecord?(this.ghostEnabled?'playing':'off'):'recording';
    if(this.ghostRecord&&this.ghostEnabled){this.ghostPose=sampleGhost(this.ghostRecord,state.stageTimeSec+(state.racePenaltySec||0),this._ghostPoseBuffer);if(!this.ghostPose)this.ghostStatus='finished';}
  }
  _finishGhost(payload,state,awarded,result){
    // The wallet's comparable car best is authoritative, including valid losses.
    const record=this.ghostRecorder?.finish(payload,state,this.player);
    if(awarded.awarded&&record&&Number.isFinite(awarded.best)&&record.timeSec<=awarded.best+.005){
      const current=this.ghostSaved===false?this.ghosts:mergeGhostStores(this.ghosts,loadGhosts()),saved=storeGhost(current,record);this.ghosts=saved.store;
      if(saved.saved){this.ghostSaved=saveGhosts(this.ghosts);result.ghostRecorded=true;}
    }
    this.ghostRecorder=null;this.ghostPose=null;this.ghostStatus='none';
  }
  _saveProfile(){
    // Preserve other local players if another tab added or updated one.
    const fresh=this.profileSaved===false?this.players:loadPlayers(),players=new Map(this.players.players.map(p=>[p.id,p]));
    for(const p of fresh.players)players.set(p.id,p);
    this.players=replacePlayerProfile({...this.players,players:[...players.values()]},this.player.id,this.profile);
    this.player=activePlayer(this.players);this.profile=this.player.profile;
    this.profileSaved=savePlayers(this.players);return this.profileSaved;
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
    if(!this.runId||this._runPlayerId!==this.player.id||state.playerId!==this._runPlayerId||state!==this.duel.state||ticket!==state.police.ticket)return;
    this._refreshPlayer();
    const settled=settlePoliceFine(this.profile,{runId:this.runId,stageIndex:state.stageIndex,ticketIndex:ticket.ticketIndex});
    if(settled.accrued){
      this.profile=settled.profile;this._saveProfile();
      ticket.creditCharge=0;ticket.pendingFine=settled.pendingFine;ticket.pendingFineTotal=settled.pendingFineTotal;ticket.creditBalance=this.profile.credits;
      state.police.pendingFines=settled.pendingFineTotal;
    }
  }
  _settleResult(result,state){
    if(this._runPlayerId!==this.player.id||state.playerId!==this._runPlayerId)return;
    this._refreshPlayer();
    const payload={...result,runId:this.runId,stageIndex:state.stageIndex,won:result.won===true,completed:result.completed===true,
      timeSec:result.timeSec??result.stageTimeSec,laps:result.laps??state.completedLaps,seed:state.seed,car:state.car,mode:state.mode,difficulty:state.difficulty,cpuDifficulty:state.cpuDifficulty||this.cpuDifficulty,
      upgrades:{...state.upgrades},policeEscapes:result.policeEscapes??state.policeEscapes,
      clean:result.completed===true&&!result.missedStation&&(result.stageCrashes??state.stageCrashes??0)===0&&(result.majorCrashesBeforeRepair??state.majorCrashes)===this._stageStartCrashes};
    const awarded=settleRace(this.profile,payload);
    if(awarded.awarded){
      this.profile=awarded.profile;this._saveProfile();
      const recorded=recordFinish(mergeLeaderboards(this.leaderboard,loadLeaderboard()),payload,this.player);this.leaderboard=recorded.board;
      if(recorded.recorded)this.leaderboardSaved=saveLeaderboard(this.leaderboard);
      if(recorded.scoreBest!=null){result.driftScoreBest=recorded.scoreBest;result.driftScoreImproved=recorded.scoreImproved;}
      Object.assign(result,{creditReward:awarded.reward,creditCharge:awarded.charge,policeFineCharge:awarded.policeFineCharge||0,creditBreakdown:awarded.breakdown,personalBest:awarded.personalBest,personalBestStatus:awarded.personalBestStatus,previousBest:awarded.previousBest,best:awarded.best,winStreak:awarded.winStreak,milestoneAwards:awarded.milestones});
    }else if(result.creditReward==null)result.creditReward=0;
    this._finishGhost(payload,state,awarded,result);
    result.creditBalance=this.profile.credits;
  }
  _settleAbandoned(){
    const state=this.duel.state;
    if(this.runId&&['racing','ticket','countdown'].includes(state.status)&&(state.stageTimeSec>0||this.profile.activeRace?.key===`${this.runId}:${state.stageIndex}`))this._settleResult({won:false,completed:false,abandoned:true},state);
  }
  _markActiveRace(state){
    const key=`${this.runId}:${state.stageIndex}`;
    if(!this.runId||this._markedRaceKey===key||this.profile.settledResults.includes(key))return;
    const pending=this.profile.activeRace?.key===key?this.profile.activeRace:{pendingPoliceFineCount:0,pendingPoliceFines:0};
    this._markedRaceKey=key;this.profile={...this.profile,activeRace:{...pending,key,runId:this.runId,stageIndex:state.stageIndex,car:state.car,cpuDifficulty:state.cpuDifficulty||this.cpuDifficulty}};this._saveProfile();
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
    this.players=selectPlayer(this.players,id);this.player=activePlayer(this.players);this.profile=this.player.profile;this._restoreRaceSettings();this._rememberRaceSettings();this._recoverInterruptedRace();this.profileSaved=savePlayers(this.players);this.duel.emit({playerChanged:true});return true;
  }
  purchaseUpgrade(car,type){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before upgrading.'};
    this._refreshPlayer();
    const result=purchaseUpgrade(this.profile,car,type);
    if(result.ok){this.profile=result.profile;this._saveProfile();this.duel.emit({garage:true});}return result;
  }
  unlockCar(car){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before unlocking cars.'};
    this._refreshPlayer();
    const result=unlockCar(this.profile,car);
    if(result.ok){this.profile=result.profile;this._saveProfile();this.duel.emit({garage:true});}return result;
  }
  togglePause() {
    const st = this.duel.state;
    if (!['racing', 'countdown'].includes(st.status)) return;
    st.paused = !st.paused;
    this.keys = {};
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
    this._settleAbandoned();
    this.keys = {};
    const st = this.duel.state;
    st.paused = false; st.status = 'menu'; st.boosting = false;
    this.ghostRecorder=null;this.ghostRecord=null;this.ghostPose=null;this.ghostStatus='none';
    this._racePaint=null;this._racePaintCar=null;
    this.driftNotice=null;
    this.checkpointNotice=null;
    this.duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false });
    this.audio.setPaused(false);
    this.duel.emit({ menu: true });
  }
  cycleCamera() {
    const modes = ['chase', 'hood', 'wide'];
    this.cameraMode = modes[(modes.indexOf(this.cameraMode) + 1) % modes.length];
    this.duel.emit({ camera: this.cameraMode });
    return this.cameraMode;
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
  _applyInput(dt) {
    const st = this.duel.state;
    const pad = this._readGamepad();
    if (st.paused) return;
    if (this.autopilot) { this._driveAutopilot(dt); return; }
    const k = this.keys;
    const keyboardSteer = ((k['ArrowRight'] || k['KeyD']) ? 1 : 0) - ((k['ArrowLeft'] || k['KeyA']) ? 1 : 0);
    this.duel.setInput({
      throttle: (k['ArrowUp'] || k['KeyW']) ? 1 : pad.throttle,
      brake: (k['ArrowDown'] || k['KeyS']) ? 1 : pad.brake,
      steer: keyboardSteer || pad.steer,
      boost: !!k['Space'] || pad.boost,
    });
  }

  _readGamepad() {
    const neutral = { throttle: 0, brake: 0, steer: 0, boost: false };
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return neutral;
    let pad;
    try { pad = Array.from(navigator.getGamepads()).find(p => p?.connected); }
    catch (_) { return neutral; } // Some embedded browsers disable gamepad permission.
    if (!pad) { this._gamepadButtons = []; return neutral; }
    const pressed = pad.buttons.map(b => b.pressed);
    if (pressed.some(Boolean)) this.audio.unlock();
    const edge = index => pressed[index] && !this._gamepadButtons[index];
    if (edge(9)) this.togglePause();
    if (edge(3)) this.cycleCamera();
    if (edge(5)) this.duel.setInput({ shiftUp: true });
    if (edge(4)) this.duel.setInput({ shiftDown: true });
    this._gamepadButtons = pressed;
    const axis = pad.axes[0] || 0;
    return {
      throttle: pad.buttons[7]?.value || 0,
      brake: pad.buttons[6]?.value || 0,
      steer: Math.abs(axis) < 0.12 ? 0 : Math.sign(axis) * (Math.abs(axis) - 0.12) / 0.88,
      boost: !!pressed[0],
    };
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

    // Visit the shoulder once to exercise reduced grip and recovery steering.
    if (!this._scriptedCrashDone && !st.objective && st.s > 250) {
      d.setInput({ throttle: 1, brake: 0, steer: 1 }); // swerve off the road
      if (st.offRoad && Math.abs(st.lateral) > (d.course.roadHalfWidthAt?.(st.s)??DRIVE.roadHalfWidth) + 2) this._scriptedCrashDone = true;
      else return;
    }

    // Demo-only heading controller. It drives through the same steering and
    // traction model as the player; manual input never receives this help.
    const frame = d.course.at(st.s);
    const halfWidth=d.course.roadHalfWidthAt?.(st.s)??DRIVE.roadHalfWidth;
    const cruisingLane=-Math.min(DRIVE.laneOffset,halfWidth*.48);
    let targetLat = cruisingLane;
    if(st.objective?.kind==='stuntTrial'){
      const targets=d.course.features.crushables.filter(prop=>!st.crushedProps.includes(prop.id)).map(prop=>({prop,gap:d.relativeS(prop.s,st.s)-st.s})).filter(item=>item.gap>=-10&&item.gap<=105).sort((a,b)=>a.gap-b.gap);
      if(targets.length)targetLat=targets[0].prop.off;
    }
    // Start the pass with enough time to steer, and clear the car's rear
    // before returning. The center offers a safe gap to two-way traffic.
    const obstacles = st.rival ? [...st.traffic, { ...st.rival, alive: true, dir: 1 }] : st.traffic;
    for (const c of obstacles) {
      if (!c.alive) continue;
      const ahead = (d.relativeS?d.relativeS(c.s,st.s):c.s)-st.s;
      const closingSpeed = Math.max(0, st.speedMph - c.dir * c.speedMph) * DRIVE.mphToWorld;
      if (ahead > -28 && ahead < 35 + closingSpeed * 1.15 && Math.abs(c.lateral - cruisingLane) < 2.7) {
        targetLat = Math.min(halfWidth-1.8, Math.max(0, c.lateral + 3.2)); break;
      }
    }
    const metresPerSec = st.speedMph * DRIVE.mphToWorld;
    const headingTarget = Math.atan((targetLat - st.lateral) * 2.5 / Math.max(15, metresPerSec));
    const look = d.course.at(st.s + metresPerSec * .18);
    const desiredYaw = look.curvature * metresPerSec + (headingTarget - st.headingError) * 6;
    const drivingSurface=d._drivingSurface(st.s,st.lateral),traction=drivingSurface.traction;
    const authority = Math.max(.05, steeringYawAuthority(st.speedMph, d.car.grip, traction));
    const steer = Math.max(-1, Math.min(1, -desiredYaw / authority));
    const bend = Math.max(Math.abs(frame.curvature), Math.abs(d.course.at(st.s + 100).curvature), Math.abs(d.course.at(st.s + 220).curvature));
    const cornerSpeed = Math.min(d.car.topSpeed * .94, .85 * Math.sqrt(DRIVE.maxLateralAccel * d.car.grip / Math.max(.0001, bend)) / DRIVE.mphToWorld);
    const targetSpeed = Math.min(drivingSurface.speedLimit,cornerSpeed);
    const throttle = st.speedMph < targetSpeed ? 1 : 0;
    const brake = st.speedMph > targetSpeed + 4 ? Math.min(1, (st.speedMph - targetSpeed) / 20) : 0;
    d.setInput({ throttle, brake, steer, boost: false });
  }

  _bindKeys() {
    if (typeof window === 'undefined') return;
    this._inputEvents=new AbortController();const signal=this._inputEvents.signal;
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof Element && e.target.closest('input, select, textarea, summary, [contenteditable="true"]')) return;
      this.audio.unlock();
      if (!e.repeat) {
        if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
        if (e.code === 'KeyC') this.cycleCamera();
        if (e.code === 'KeyM') { this.audio.toggleMute(); this.duel.emit({ mute: this.audio.muted }); }
        if (e.code === 'KeyR' && this.duel.state.status !== 'menu') this.requestNavigation('restart');
      }
      this.keys[e.code] = true;
      if (!e.repeat && e.code === 'KeyE') this.duel.setInput({ shiftUp: true });
      if (!e.repeat && e.code === 'KeyQ') this.duel.setInput({ shiftDown: true });
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && !(e.code === 'Space' && e.target instanceof Element && e.target.closest('button'))) e.preventDefault();
    },{signal});
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; },{signal});
    window.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true,signal });
    window.addEventListener('blur', () => {
      this.keys = {};
      if (!this.duel.state.paused && ['racing', 'countdown'].includes(this.duel.state.status)) this.togglePause();
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
      nextStage: () => a.duel.nextStage(),
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
