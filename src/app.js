// app.js — owns the Duel instance, the rAF/step loop, keyboard input, the
// scripted autopilot, dev hooks, and window.__game. Rendering (render3d.js) and
// DOM HUD (main.js) are views that read state and call these verbs.

import { Duel } from './game.js';
import { seedFromUrl } from './rng.js';
import { DRIVE } from './config.js';

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
      dt = Math.min(0.05, dt); // clamp big frame gaps
      this._applyInput(dt);
      this.duel.step(dt);
      this.onFrame?.(this.duel.state, dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  // Headless fixed-step advance (tests / scripted runs without rAF).
  advance(seconds, dt = 1 / 60) {
    let t = 0;
    while (t < seconds) { this._applyInput(dt); this.duel.step(dt); t += dt; if (this.duel.state.status === 'gameover' || this.duel.state.status === 'complete') break; }
  }

  // ---- input -----------------------------------------------------------
  _applyInput(dt) {
    const st = this.duel.state;
    if (this.autopilot) { this._driveAutopilot(dt); return; }
    const k = this.keys;
    this.duel.setInput({
      throttle: (k['ArrowUp'] || k['KeyW']) ? 1 : 0,
      brake: (k['ArrowDown'] || k['KeyS']) ? 1 : 0,
      steer: (k['ArrowLeft'] || k['KeyA']) ? -1 : (k['ArrowRight'] || k['KeyD']) ? 1 : 0,
    });
  }

  // Scripted full-stage driver: floors it, follows the racing line, dodges
  // traffic by lane, performs exactly one deterministic off-road crash, then
  // drives clean to the results screen.
  _driveAutopilot(dt) {
    const d = this.duel, st = d.state;
    if (st.status === 'ticket') { d.ackTicket(); return; }
    if (st.status === 'countdown') return;
    if (st.status !== 'racing') return;

    // one scripted off-road crash early in the stage to prove life loss
    if (!this._scriptedCrashDone && st.s > 250) {
      d.setInput({ throttle: 1, brake: 0, steer: 1 }); // swerve off the road
      if (st.offRoad && Math.abs(st.lateral) > DRIVE.roadHalfWidth + 2) {
        // keep steering until the crash registers
      }
      if (st.lastCrashReason === 'off_road') this._scriptedCrashDone = true;
      return;
    }

    // racing line: counter corner drift, hold the right lane, dodge traffic
    const frame = d.course.at(st.s);
    let targetLat = -DRIVE.laneOffset;
    // dodge: if a car sits ahead in our lane, move to the other lane
    for (const c of st.traffic) {
      if (!c.alive) continue;
      const ahead = c.s - st.s;
      if (ahead > 0 && ahead < 110 && Math.abs(c.lateral - targetLat) < 2.4) {
        targetLat = -targetLat; break;
      }
    }
    const driftComp = -frame.curvature * st.speedMph * 0.5;
    let steer = (targetLat - st.lateral) * 0.5 + driftComp;
    steer = Math.max(-1, Math.min(1, steer));
    // ease off in sharp corners so we don't fly off
    const throttle = Math.abs(frame.curvature) > 0.0016 && st.speedMph > 130 ? 0.4 : 1;
    d.setInput({ throttle, brake: 0, steer });
  }

  _bindKeys() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'ShiftRight' || e.code === 'KeyE') this.duel.setInput({ shiftUp: true });
      if (e.code === 'ShiftLeft' || e.code === 'KeyQ') this.duel.setInput({ shiftDown: true });
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
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
      startCampaign: (o) => a.duel.startCampaign(o),
      nextStage: () => a.duel.nextStage(),
      setInput: (i) => a.duel.setInput(i),
      advance: (sec) => a.advance(sec),
      autopilotOn: () => { a.autopilot = true; a._scriptedCrashDone = false; },
    };
  }
}
