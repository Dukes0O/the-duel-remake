// Optional NPC route decisions. This module plans real steering and speed;
// the caller still owns vehicle motion, contacts, checkpoint gates and yielding.
import { CPU_DIFFICULTY, DRIVE } from './config.js';

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const angle = (a, b = 0) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const smooth = n => { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); };
const lerp = (a, b, t) => a + (b - a) * t;
const SAMPLE_METERS = 6, ENTRY_LEAD = 140, EXIT_LEAD = 90;

export class NpcRoutePlanner {
  constructor(course, { car, surfaceAt, lane = -DRIVE.laneOffset } = {}) {
    if (!car || typeof surfaceAt !== 'function') throw new TypeError('NPC routes require a car and driving-surface sampler');
    this.course = course; this.car = car; this.surfaceAt = surfaceAt; this.lane = lane;
    this.profiles = new Map(); this.actors = new WeakMap();
    this.cuts = course.features.shortcuts || [];
  }

  // Cache per car/planner: no nearest-road searches or ground sampling in the
  // per-frame path. The sampled tangent includes the actual branch geometry.
  profile(routeId, difficulty = 'hard') {
    const key = `${routeId}:${difficulty}`;
    if (this.profiles.has(key)) return this.profiles.get(key);
    const cut = this.cuts.find(route => route.id === routeId);
    if (!cut) return null;
    const pace = CPU_DIFFICULTY[difficulty] || CPU_DIFFICULTY.hard;
    const entry = Math.max(0, cut.start - ENTRY_LEAD), exit = Math.min(this.course.length, cut.end + EXIT_LEAD);
    const branch = this._path(cut, entry, exit, pace), main = this._path(null, entry, exit, pace);
    const profile = Object.freeze({ id: cut.id, cut, entry, exit, branch, main,
      savingSeconds: main.seconds - branch.seconds, savingFraction: 1 - branch.seconds / main.seconds });
    this.profiles.set(key, profile); return profile;
  }

  _offset(cut, s) {
    if (!cut) return this.lane;
    if (s < cut.start) return this.lane * (1 - smooth((s - (cut.start - ENTRY_LEAD)) / ENTRY_LEAD));
    if (s <= cut.end) return this.course.shortcutOffset(cut, s);
    return this.lane * smooth((s - cut.end) / EXIT_LEAD);
  }

  _path(cut, entry, exit, pace) {
    const count = Math.ceil((exit - entry) / SAMPLE_METERS), samples = [];
    for (let i = 0; i <= count; i++) {
      const s = lerp(entry, exit, i / count), offset = this._offset(cut, s), p = this.course.groundAt(s, offset);
      const before = this.course.worldAt(s - .75, this._offset(cut, s - .75));
      const after = this.course.worldAt(s + .75, this._offset(cut, s + .75));
      const heading = Math.atan2(after.x - before.x, after.z - before.z), surface = this.surfaceAt(s, offset);
      samples.push({ s, offset, x: p.x, y: p.y, z: p.z, heading, relativeHeading: angle(heading, this.course.at(s).heading),
        traction: surface.traction, speedLimit: surface.speedLimit, curvature: 0, distance: 0, speedMph: 0 });
    }
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i], a = samples[Math.max(0, i - 1)], b = samples[Math.min(count, i + 1)];
      p.curvature = angle(b.heading, a.heading) / Math.max(.01, Math.hypot(b.x - a.x, b.z - a.z));
      p.distance = i ? Math.hypot(p.x - samples[i - 1].x, p.y - samples[i - 1].y, p.z - samples[i - 1].z) : 0;
      const corner = Math.sqrt(DRIVE.maxLateralAccel * this.car.grip * p.traction / Math.max(.00001, Math.abs(p.curvature))) / DRIVE.mphToWorld;
      p.speedMph = Math.min(this.car.topSpeed * pace.skill, p.speedLimit, corner * pace.cornerSkill);
    }
    const brake = DRIVE.brakeAccel * this.car.braking * DRIVE.mphToWorld;
    const accel = this.car.accel * DRIVE.accelScale * .85 * DRIVE.mphToWorld;
    for (let i = count - 1; i >= 0; i--) {
      const next = samples[i + 1];
      samples[i].speedMph = Math.min(samples[i].speedMph, Math.sqrt((next.speedMph * DRIVE.mphToWorld) ** 2 + 2 * brake * next.distance) / DRIVE.mphToWorld);
    }
    let seconds = 0, meters = 0;
    for (let i = 1; i <= count; i++) {
      const p = samples[i], prev = samples[i - 1];
      p.speedMph = Math.min(p.speedMph, Math.sqrt((prev.speedMph * DRIVE.mphToWorld) ** 2 + 2 * accel * p.distance) / DRIVE.mphToWorld);
      meters += p.distance; seconds += p.distance / Math.max(1, (p.speedMph + prev.speedMph) * .5 * DRIVE.mphToWorld);
    }
    return Object.freeze({ samples: Object.freeze(samples.map(Object.freeze)), seconds, meters });
  }

  _sample(profile, s) {
    const samples = profile.branch.samples, f = clamp((s - profile.entry) / (profile.exit - profile.entry), 0, 1) * (samples.length - 1);
    const i = Math.min(samples.length - 2, Math.floor(f)), t = f - i, a = samples[i], b = samples[i + 1];
    return { offset: lerp(a.offset, b.offset, t), relativeHeading: a.relativeHeading + angle(b.relativeHeading, a.relativeHeading) * t,
      curvature: lerp(a.curvature, b.curvature, t), speedMph: lerp(a.speedMph, b.speedMph, t) };
  }

  routeFor(actor) { return this.actors.get(actor)?.choice || null; }

  // A recovery must abandon the old branch. Keeping its decision token stops
  // a reset vehicle trying to enter across the gap halfway through a shortcut.
  reset(actor) { const state = this.actors.get(actor); if (state) state.choice = null; }

  _vehicles(context) { return [context.player, ...(context.traffic || [])].filter(v => v && v.alive !== false); }

  _blocker(actor, choice, context, entryOnly = false) {
    const { profile, lapBase } = choice;
    const mps = Math.max(0, actor.speedMph || 0) * DRIVE.mphToWorld;
    let blocked = null;
    for (const vehicle of this._vehicles(context)) {
      if (vehicle === actor || !Number.isFinite(vehicle.s) || !Number.isFinite(vehicle.lateral)) continue;
      const otherS = vehicle.s + (this.course.closed ? Math.round((actor.s - vehicle.s) / this.course.length) * this.course.length : 0);
      const gap = otherS - actor.s;
      if (gap < -9 || gap > Math.max(45, mps * 1.2)) continue;
      const path = this._sample(profile, otherS - lapBase);
      const futureLateral = vehicle.lateral + Math.sin(vehicle.headingError || 0) * (vehicle.speedMph || 0) * DRIVE.mphToWorld * .65;
      const halfWidth = (this.car.collision?.halfWidth || 1.04) + (vehicle.halfWidth || 1.1) + .9;
      const crosses = (vehicle.lateral - path.offset) * (futureLateral - path.offset) <= 0;
      if (!crosses && Math.min(Math.abs(vehicle.lateral - path.offset), Math.abs(futureLateral - path.offset)) > halfWidth) continue;
      const speed = Math.max(0, (vehicle.speedMph || 0) * Math.cos(vehicle.headingError || 0) * (vehicle.dir || 1));
      const closing = Math.max(0, (actor.speedMph - speed) * DRIVE.mphToWorld);
      const safeGap = 9 + mps * .6 + closing * .8;
      if (entryOnly && gap > safeGap) continue;
      const cap = gap < safeGap ? Math.max(0, speed - (safeGap - Math.max(0, gap)) * .6) :
        Math.sqrt((speed * DRIVE.mphToWorld) ** 2 + 2 * DRIVE.brakeAccel * this.car.braking * DRIVE.mphToWorld * Math.max(0, gap - safeGap)) / DRIVE.mphToWorld;
      if (!blocked || cap < blocked.speedMph) blocked = { vehicle, speedMph: cap };
    }
    return blocked;
  }

  update(actor, context = {}) {
    const difficulty = context.difficulty || 'easy', lapsTotal = context.lapsTotal || 2;
    let state = this.actors.get(actor);
    if (!state) { state = { choice: null, attempted: new Set() }; this.actors.set(actor, state); }
    if (difficulty === 'easy' || actor.s >= this.course.length * lapsTotal) { state.choice = null; return null; }
    if (state.choice && actor.s > state.choice.exitS) state.choice = null;
    if (!state.choice) {
      const lap = Math.max(0, Math.floor(actor.s / this.course.length)), lapBase = lap * this.course.length, phase = actor.s - lapBase;
      if (difficulty === 'medium' && lap !== 1) return null;
      const threshold = difficulty === 'medium' ? .6 : .25;
      let candidates = this.cuts.map(cut => this.profile(cut.id, difficulty)).filter(p => p.savingSeconds >= threshold);
      // Medium makes one deliberate late-race choice. Hard may take both.
      if (difficulty === 'medium') candidates = candidates.sort((a, b) => b.savingSeconds - a.savingSeconds).slice(0, 1);
      for (const profile of candidates) {
        const token = `${lap}:${profile.id}`;
        if (state.attempted.has(token)) continue;
        if (phase > profile.cut.start - 30) { state.attempted.add(token); continue; }
        if (phase < profile.entry || Math.abs(actor.lateral - this.lane) > 6 || Math.abs(actor.headingError || 0) > .35) continue;
        const choice = { routeId: profile.id, lap: lap + 1, lapBase, entryS: lapBase + profile.entry, exitS: lapBase + profile.exit, profile };
        if (context.yieldingToPlayer || this._blocker(actor, choice, context, true)) continue;
        state.choice = choice; state.attempted.add(token); break;
      }
    }
    const choice = state.choice;
    if (!choice) return null;
    const sample = this._sample(choice.profile, actor.s - choice.lapBase), mps = Math.max(0, actor.speedMph || 0) * DRIVE.mphToWorld;
    const blocker = this._blocker(actor, choice, context), yielding = Boolean(context.yieldingToPlayer || blocker);
    const playerCap = context.yieldingToPlayer ? Math.max(0, (context.player?.speedMph || 0) * Math.cos(context.player?.headingError || 0)) : Infinity;
    return { routeId: choice.routeId, routeLap: choice.lap, entryS: choice.entryS, exitS: choice.exitS,
      phase: actor.s < choice.lapBase + choice.profile.cut.start ? 'entry' : actor.s > choice.lapBase + choice.profile.cut.end ? 'exit' : 'branch',
      targetLateral: sample.offset, headingTarget: clamp(sample.relativeHeading + Math.atan((sample.offset - actor.lateral) * 2.4 / Math.max(15, mps)), -1.25, 1.25),
      curvature: sample.curvature, targetSpeedMph: Math.min(sample.speedMph, blocker?.speedMph ?? Infinity, playerCap),
      mustYield: yielding, yieldingToPlayer: Boolean(context.yieldingToPlayer || blocker?.vehicle === context.player), savingSeconds: choice.profile.savingSeconds };
  }
}
