// app.js — owns the Duel instance, the rAF/step loop, keyboard input, the
// scripted autopilot, dev hooks, and window.__game. Rendering (render3d.js) and
// DOM HUD (main.js) are views that read state and call these verbs.

import { Duel } from './game.js';
import { seedFromUrl } from './rng.js';
import { DRIVE, steeringYawAuthority } from './config.js';
import { EngineAudio } from './audio.js';
import { loadProfile, saveProfile, awardCourseWin, purchaseUpgrade, unlockCar, getUpgradeLevels, isCarUnlocked } from './progression.js';

const SIMULATION_STEP = 1 / 120;

export class App {
  constructor() {
    const url = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams('');
    this.seed = seedFromUrl();
    this.autopilot = url.get('autopilot') === '1';
    this.duel = new Duel({
      seed: this.seed,
      difficulty: url.get('diff') || undefined,
      car: url.get('car') || undefined,
    });
    this.keys = {};
    this.profile = loadProfile();
    this.menuStage = 0;
    this.runId = null;
    this.cameraMode = 'chase';
    this.audio = new EngineAudio();
    this.duel.onChange((state, event) => {
      this.audio.event(event);
      if (event.stageResult) {
        const result=event.stageResult;
        const awarded=awardCourseWin(this.profile,{runId:this.runId,stageIndex:state.stageIndex,won:result.won,clean:!result.missedStation&&state.majorCrashes===this._stageStartCrashes,difficulty:state.difficulty});
        if(awarded.awarded){this.profile=awarded.profile;this.profileSaved=saveProfile(this.profile);result.creditReward=awarded.reward;}
        else if(result.creditReward==null)result.creditReward=0;
        result.creditBalance=this.profile.credits;
      }
      if(event.stageLoaded!=null)this._stageStartCrashes=state.majorCrashes;
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
      this._simulate(dt);
      this.audio.update(this.duel.state);
      this.onFrame?.(this.duel.state, dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; this.lastT = null; cancelAnimationFrame(this.raf); }

  _simulate(seconds) {
    this._stepAccumulator += seconds;
    while (this._stepAccumulator + 1e-10 >= SIMULATION_STEP) {
      this._applyInput(SIMULATION_STEP);
      this.duel.step(SIMULATION_STEP);
      this._stepAccumulator = Math.max(0, this._stepAccumulator - SIMULATION_STEP);
    }
  }

  startCampaign(options = {}) {
    const car=isCarUnlocked(this.profile,options.car||this.duel.state.car)?options.car||this.duel.state.car:'falcone_f42';
    this.runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this._stageStartCrashes=0;
    this._campaignStart=options.startStage??this.menuStage;
    this.audio.unlock();
    this.audio.setPaused(false);
    this.keys = {};
    this._stepAccumulator = 0;
    this._scriptedCrashDone = false;
    this.duel.startCampaign({...options,car,startStage:this._campaignStart,upgrades:getUpgradeLevels(this.profile,car)});
  }
  restart() {
    const { mode, car, difficulty } = this.duel.state;
    this.startCampaign({ mode, car, difficulty,startStage:this._campaignStart||0 });
  }
  purchaseUpgrade(car,type){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before upgrading.'};
    const result=purchaseUpgrade(this.profile,car,type);
    if(result.ok){this.profile=result.profile;this.profileSaved=saveProfile(this.profile);this.duel.emit({garage:true});}return result;
  }
  unlockCar(car){
    if(this.duel.state.status!=='menu')return {ok:false,reason:'Return to the garage before unlocking cars.'};
    const result=unlockCar(this.profile,car);
    if(result.ok){this.profile=result.profile;this.profileSaved=saveProfile(this.profile);this.duel.emit({garage:true});}return result;
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
  resume() { if (this.duel.state.paused) this.togglePause(); }
  returnToMenu() {
    this.keys = {};
    const st = this.duel.state;
    st.paused = false; st.status = 'menu'; st.boosting = false;
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
    if (!this._scriptedCrashDone && st.s > 250) {
      d.setInput({ throttle: 1, brake: 0, steer: 1 }); // swerve off the road
      if (st.offRoad && Math.abs(st.lateral) > DRIVE.roadHalfWidth + 2) this._scriptedCrashDone = true;
      else return;
    }

    // Demo-only heading controller. It drives through the same steering and
    // traction model as the player; manual input never receives this help.
    const frame = d.course.at(st.s);
    let targetLat = -DRIVE.laneOffset;
    // Start the pass with enough time to steer, and clear the car's rear
    // before returning. The center offers a safe gap to two-way traffic.
    const obstacles = st.rival ? [...st.traffic, { ...st.rival, alive: true, dir: 1 }] : st.traffic;
    for (const c of obstacles) {
      if (!c.alive) continue;
      const ahead = c.s - st.s;
      const closingSpeed = Math.max(0, st.speedMph - c.dir * c.speedMph) * DRIVE.mphToWorld;
      if (ahead > -28 && ahead < 35 + closingSpeed * 1.15 && Math.abs(c.lateral + DRIVE.laneOffset) < 2.7) {
        targetLat = Math.min(3.3, Math.max(0, c.lateral + 3.2)); break;
      }
    }
    const metresPerSec = st.speedMph * DRIVE.mphToWorld;
    const headingTarget = Math.atan((targetLat - st.lateral) * 2.5 / Math.max(15, metresPerSec));
    const look = d.course.at(st.s + metresPerSec * .18);
    const desiredYaw = look.curvature * metresPerSec + (headingTarget - st.headingError) * 6;
    const traction = st.offRoad ? DRIVE.offRoadGrip : 1;
    const authority = Math.max(.05, steeringYawAuthority(st.speedMph, d.car.grip, traction));
    const steer = Math.max(-1, Math.min(1, -desiredYaw / authority));
    const bend = Math.max(Math.abs(frame.curvature), Math.abs(d.course.at(st.s + 100).curvature), Math.abs(d.course.at(st.s + 220).curvature));
    const cornerSpeed = Math.min(d.car.topSpeed * .94, .85 * Math.sqrt(DRIVE.maxLateralAccel * d.car.grip / Math.max(.0001, bend)) / DRIVE.mphToWorld);
    const targetSpeed = st.offRoad ? 45 : cornerSpeed;
    const throttle = st.speedMph < targetSpeed ? 1 : 0;
    const brake = st.speedMph > targetSpeed + 4 ? Math.min(1, (st.speedMph - targetSpeed) / 20) : 0;
    d.setInput({ throttle, brake, steer, boost: false });
  }

  _bindKeys() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof Element && e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
      this.audio.unlock();
      if (!e.repeat) {
        if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
        if (e.code === 'KeyC') this.cycleCamera();
        if (e.code === 'KeyM') { this.audio.toggleMute(); this.duel.emit({ mute: this.audio.muted }); }
        if (e.code === 'KeyR' && this.duel.state.status !== 'menu') this.restart();
      }
      this.keys[e.code] = true;
      if (!e.repeat && e.code === 'KeyE') this.duel.setInput({ shiftUp: true });
      if (!e.repeat && e.code === 'KeyQ') this.duel.setInput({ shiftDown: true });
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && !(e.code === 'Space' && e.target instanceof Element && e.target.closest('button'))) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true });
    window.addEventListener('blur', () => {
      this.keys = {};
      if (!this.duel.state.paused && ['racing', 'countdown'].includes(this.duel.state.status)) this.togglePause();
    });
  }

  // ---- dev globals -----------------------------------------------------
  _exposeGlobals() {
    if (typeof window === 'undefined') return;
    const a = this;
    window.__game = {
      get duel() { return a.duel; },
      get state() { return a.duel.state; },
      get stage() { return { index: a.duel.state.stageIndex, name: a.duel.stageDef.name }; },
      get speed() { return Math.round(a.duel.state.speedMph); },
      get gear() { return a.duel.state.gear + 1; },
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
