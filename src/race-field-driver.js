// How one computer racer drives in a Grand Prix (docs/CIRCUITS.md 3.2). The
// racer follows the racing line at its own pace, attacks a slower car ahead on
// a straight, may cover the inside once before a braking zone, holds its side
// when another car is alongside through a corner, and makes small seeded
// mistakes unless the difficulty forbids them. All choices come from the
// state of the race and the racer's own seeded random stream.
import { DRIVE, BOOST, steeringYawAuthority } from './config.js';
import { clamp } from './sim-common.js';
import { stepKnock } from './vehicle-knock.js';
import {observeSummitRoute,isAvalancheKnock} from './summit-avalanche.js';
import {NpcRoutePlanner} from './npc-route.js';
import { racingLineFor, buildSpeedProfile, nextCorner, accelAt } from './race-lines.js';
import {PIT,pitAt,pitBox,choosePit,stepPitService,limitPitSpeed,pitTransitTarget,pitSpeedLimitAt} from './pit-lane.js';
import { FIELD, FIELD_TUNING, catchUpFactor, racerSpec, performanceIndex, nitroLocked } from './race-field.js';

// GP-PASSING-2: pass types that `cpu-racecraft` turns on, one row each; a type that fails its batch stays false.
export const PASS_TYPES = Object.freeze({alongside: false, exitTow: false, dive: false, window: false});

export const CPU_NITRO = Object.freeze({strength:.5, refill:.5});
export const cpuNitroExtraMph=(r,spec)=>spec.topSpeed*(BOOST.topSpeedMult-1+(r.upgrades.nitro||0)*.025+(spec.nitroSpeedBonus??0))*CPU_NITRO.strength;
export const cpuNitroAcceleration=(r,spec)=>BOOST.accelMphPerSec*(1+(r.upgrades.nitro||0)*.15)*(spec.nitroAcceleration??1)*CPU_NITRO.strength;

// The same tank and upgrade drain as the player, with Kyle's weaker CPU boost.
export function stepCpuNitro(r, run, dt, {straight=false, attack=false, defend=false, pit=false}={}) {
  const nitro=r.upgrades.nitro || 0;
  const drain=BOOST.drainPerSec/((1+nitro*.14)*run.spec.boostCapacity);
  const reserve=r.boosting ? 0 : .25+.25*(1-r.field.traits.aggression);
  r.boosting=!pit && straight && (attack||defend) && r.speedMph>=BOOST.minSpeedMph && r.boost>reserve && !r.knock && !(r.contactCooldown>0);
  r.field.nitroAvailable=r.boosting ? Math.min(1,r.boost/(drain*dt)) : 0;
  r.boost=r.boosting ? Math.max(0,r.boost-drain*dt) : Math.min(1,r.boost+BOOST.refillPerSec*CPU_NITRO.refill*dt);
}

const MPH = DRIVE.mphToWorld;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// Normalize measured progress against the road, so braking for a corner does
// not suddenly make a player look slower. Samples are private per race.
const playerPaces=new WeakMap();
export function playerPaceMph(duel){
  const s=duel.state, field=s.field, line=racingLineFor(duel.course);
  let p=playerPaces.get(field);
  if(!p){
    const profile=buildSpeedProfile(line,duel.car);
    p={profile,time:s.stageTimeSec,s:s.s,elapsed:0,distance:0,expected:0,sectors:[]};
    playerPaces.set(field,p);
  }
  const dt=s.stageTimeSec-p.time, distance=s.s-p.s;
  if(dt>0){
    if(distance>=0 && distance<duel.car.topSpeed*MPH*1.5*dt+1){
      p.elapsed+=dt;p.distance+=distance;p.expected+=p.profile.at(p.s)*MPH*dt;
      if(p.elapsed>=2){
        p.sectors.push({time:s.stageTimeSec,start:s.stageTimeSec-p.elapsed,ratio:p.distance/Math.max(1,p.expected)});
        p.elapsed=0;p.distance=0;p.expected=0;
      }
    }else{p.elapsed=0;p.distance=0;p.expected=0;}
    p.time=s.stageTimeSec;p.s=s.s;
    p.sectors=p.sectors.filter(row=>row.start>=s.stageTimeSec-10);
  }
  let ratio=p.sectors.length ? Math.max(...p.sectors.map(row=>row.ratio)) : FIELD_TUNING[s.cpuDifficulty].pace;
  if(s.lapTimes.length){
    if(p.laps!==s.lapTimes.length){
      let reference=0;
      for(let i=0;i<p.profile.count;i++)reference+=p.profile.line.length/p.profile.count/(Math.max(1,p.profile.mph[i])*MPH);
      p.lapRatio=reference/(Math.min(...s.lapTimes)/1000);p.laps=s.lapTimes.length;
    }
    ratio=p.lapRatio;
  }
  return p.profile.at(s.s)*Math.max(.05,ratio);
}

// Award a real close pass once per rival/lap; contact earns no recharge.
export function closePassRefill(r,run,near,now){
  const seen=r.field.nitroPassed??={},history=r.field.nitroNear??={};
  for(const c of near){
    const previous=history[c.index];history[c.index]={ds:c.ds,time:now};
    if(previous && now-previous.time<=.1 && previous.ds>0 && c.ds<=0 && seen[c.index]!==r.completedLaps &&
        Math.abs(c.dl)>=run.halfWidth+c.hw+.15 && Math.abs(c.dl)<6.4 &&
        r.speedMph>=65 && !(r.contactCooldown>0)){
      seen[c.index]=r.completedLaps;
      r.boost=Math.min(1,r.boost+BOOST.nearMissRefill*CPU_NITRO.refill);
    }
  }
}

// Each racer's seeded random stream lives in plain numbers on its state.
function rand(f) {
  let a = f.rng | 0;
  a = (a + 0x6D2B79F5) | 0; f.rng = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// The car and the speed profile are worked out from the racer's own state and
// kept beside it, not in it, so the race state stays plain data.
const runtimes = new WeakMap();
// A racer's pace drifts a little over a race: good and bad stretches.
export function paceForm(f, seconds) {
  return f.formAmp * Math.sin(seconds * Math.PI * 2 / f.formPeriod + f.formPhase);
}

export function runtimeOf(duel, r) {
  let run = runtimes.get(r);
  if (run && run.course === duel.course) return run;
  const f = r.field, t = f.traits, base = FIELD_TUNING[duel.state.cpuDifficulty] || FIELD_TUNING.medium;
  // A circuit may make its racers keener or shyer to attack (`fieldAggression`, a multiplier).
  const tuning = duel.course.def.fieldAggression ? { ...base, aggression: base.aggression * duel.course.def.fieldAggression } : base;
  const spec = racerSpec(r.car, r.upgrades, r.driverId);
  // A faster car than yours shows only part of its edge; a slower one is helped a little.
  const carEdge = Math.pow(duel.state.field.playerIndex / performanceIndex(spec, duel.course), FIELD.carPaceShare);
  // A circuit may ask for a field a little quicker or slower than the standard
  // (`fieldPace` in its definition: one number, or one per difficulty), found
  // with tools/race-field-balance.mjs.
  const asked = duel.course.def.fieldPace, circuitPace = (typeof asked === 'object' ? asked?.[duel.state.cpuDifficulty] : asked) ?? 1;
  const pace = tuning.pace * t.skill * f.skillRoll * carEdge * circuitPace;
  const line = racingLineFor(duel.course);
  const profile = buildSpeedProfile(line, spec, { cornerFactor: pace, topFactor: pace * (1 + t.topSpeed),
    brakeFactor: t.brake, slowBonus: t.slowCorners });
  const shell = duel._vehicleSpec(r);
  // A circuit with heavy braking between walls may ask racers to keep more room (`fieldFollow`).
  const own = duel.course.def.fieldFollow, follow = own ? { ...FOLLOW, ...own } : FOLLOW;
  // The first lap, with the whole field bunched, may ask for more room (`firstLap`).
  const followStart = own?.firstLap ? { ...follow, ...own.firstLap } : follow;
  run = { course: duel.course, spec, profile, line, tuning, near: [], pace, follow, followStart,
    halfWidth: shell.halfWidth, halfLength: shell.halfLength };
  runtimes.set(r, run);
  return run;
}

// The cars around this racer, nearest first by distance along the road.
function sense(duel, r, run) {
  const s = duel.state, out = run.near;
  out.length = 0;
  const consider = (o, index) => {
    if (o === r || o.crushed || o.contactExempt) return;
    const ds = duel.relativeS(o.s, r.s) - r.s;
    if (ds > 170 || ds < -70) return;
    const shell = duel._vehicleSpec(o);
    out.push({ o, index, ds, dl: o.lateral - r.lateral, speed: o.speedMph || 0, hl: shell.halfLength, hw: shell.halfWidth,
      vLateral: Math.sin(o.headingError || 0) * (o.speedMph || 0) * MPH + (o.pushVelocity || 0),
      gap: Math.abs(ds) - run.halfLength - shell.halfLength });
  };
  consider(s, -1);
  for (let i = 0; i < s.opponents.length; i++) consider(s.opponents[i], i);
  return out;
}

// The fastest a racer can go and still stop short of the car ahead if that car
// brakes: a driver's reaction time, then comfortable braking for both cars.
export const FOLLOW = Object.freeze({ reaction: .22, margin: 2.2, comfort: .62, leadBraking: 1.15 });
export function followLimitMph(run, blocker, follow = run.follow ?? FOLLOW) {
  const comfortable = DRIVE.brakeAccel * run.spec.braking * follow.comfort * MPH;
  const lead = blocker.speed * MPH;
  const room = Math.max(0, blocker.gap - follow.margin) + lead * lead / (2 * comfortable * follow.leadBraking);
  const v = comfortable * (-follow.reaction + Math.sqrt(follow.reaction * follow.reaction + 2 * room / comfortable));
  return v / MPH;
}

// Which pass type, if any, a crashing car was in during the 3 s before contact (switch on only).
function crashPassType(duel, f) {
  if (!f.racecraft) return {};
  const mark = f.passMark, now = duel.state.stageTimeSec;
  return {passType: mark && now - mark.t <= 3 ? mark.type : null};
}

// Note a spin-out or a hard knock for the race statistics.
function noteIncidents(duel, r) {
  const f = r.field, stats = duel.state.field.stats;
  if (r.knock && !isAvalancheKnock(duel,r) && !f.knocked) {
    f.knocked = true; f.crashes++;
    stats.crashes.push({ index: r.field.index, t: +duel.state.stageTimeSec.toFixed(2), ...crashPassType(duel, f) });
    duel.emit({ fieldCrash: { index: f.index, t: duel.state.stageTimeSec } });
  } else if (!r.knock) f.knocked = false;
  // A hard hit on a wall or post shows as a sudden loss of speed and a new cooldown.
  if (r.contactCooldown > 1.1 && f.cooldownSeen <= 1.1 && !r.knock) {
    f.hits++;
    if (f.moveSpeed - r.speedMph >= 15) {
      stats.crashes.push({ index: f.index, t: +duel.state.stageTimeSec.toFixed(2), ...crashPassType(duel, f) });
      f.crashes++;
    }
  }
  f.cooldownSeen = r.contactCooldown;
}

// ---- the driving model ---------------------------------------------------------

// Steer toward `intent` (a lateral position) along the racing line, hold the
// target speed with the car's own braking and acceleration, and move. This is
// the same yaw, grip and road-frame model the other computer cars use.
function move(duel, r, run, dt, target, intent, surface, look, route = null) {
  const { spec, line } = run;
  const f = r.field;
  const speed = r.speedMph, mps = Math.max(0, speed) * MPH;
  const braking = DRIVE.brakeAccel * spec.braking * f.traits.brake;
  if (speed > target) {
    r.speedMph = Math.max(target, speed - braking * dt);
    r.braking = speed - target > 1.5;
  } else {
    const nitro=f.racecraft && r.boosting ? cpuNitroAcceleration(r,spec)*f.nitroAvailable : 0;
    const push = accelAt(spec, speed) * (1 + FIELD.towAccel * f.tow) * (r.contactCooldown > 0 ? .8 : 1) + nitro;
    r.speedMph = Math.min(target, speed + push * dt);
  }
  if (r.offRoad) r.speedMph *= Math.exp(-surface.scrub * dt * (surface.preparedGravel ? .25 : 1));
  const frame = duel.course.at(r.s);
  const authority = steeringYawAuthority(r.speedMph, spec.grip, surface.traction, spec);
  const wanted = route?.headingTarget ?? line.relHeadingAt(look) + Math.atan((intent - r.lateral) * 2.4 / Math.max(15, mps));
  const error = wrap(clamp(wanted, -1.2, 1.2) - r.headingError);
  const yaw = clamp((route?.curvature ?? line.curvatureAt(look)) * mps + error * 6, -authority, authority);
  const travel = Math.max(0, r.speedMph) * MPH;
  const progress = Math.cos(r.headingError) * travel / Math.max(.25, 1 - frame.curvature * r.lateral);
  r.headingError += (yaw - frame.curvature * progress) * dt;
  r.lateral += (Math.sin(r.headingError) * travel + r.pushVelocity) * dt;
  r.s += progress * dt;
  observeSummitRoute(duel,r,f.traits.aggression*run.tuning.aggression);
  const damping = Math.exp(-(r.offRoad ? .9 : 1.5) * dt);
  r.pushVelocity *= damping;
}

// ---- one fixed step -------------------------------------------------------------

export function stepFieldRacer(duel, r, dt) {
  const s = duel.state, f = r.field, run = runtimeOf(duel, r);
  if(f.racecraft && (r.finished || r.knock || r.pit || pitTransitTarget(duel.course,r,r.s))) stepCpuNitro(r,run,dt,{pit:true});
  if(r.pit?.phase==='servicing'&&stepPitService(duel,r,dt)){f.stuck=0;f.offSec=0;return;}
  if (r.knock) {
    // A knocked car is a free body until its tyres bite; the shared rules apply.
    stepKnock(duel, r, dt);
    observeSummitRoute(duel,r,f.traits.aggression*run.tuning.aggression);
    duel._staticContacts(r, false); duel._boundary(r);
    if (!r.finished) duel._advanceLaps(r, dt);
    noteIncidents(duel, r);
    return;
  }
  r.prevS = r.s; r.prevLateral = r.lateral; r.prevAirHeight = r.airHeight || 0;
  r.pushVelocity ||= 0; r.headingError ||= 0;
  r.contactCooldown = Math.max(0, (r.contactCooldown || 0) - dt);
  r.braking = false;
  noteIncidents(duel, r);
  const surface = duel._drivingSurface(r.s, r.lateral, run.spec,true,r.tyre);
  r.offRoad = !surface.mainRoad; r.preparedGravel = surface.preparedGravel;
  const mps = Math.max(0, r.speedMph) * MPH;
  const look = r.s + Math.max(6, mps * .3);

  if (r.finished) {
    // Finished cars roll on to the outside edge, out of the race and out of the way.
    r.contactExempt = true;
    const transit = pitTransitTarget(duel.course, r, look);
    const edge = (surface.roadHalfWidth - 2) * (f.index % 2 ? 1 : -1);
    if (transit) f.intent = transit.lateral;
    else f.intent += clamp(edge - f.intent, -3 * dt, 3 * dt);
    move(duel, r, run, dt, transit?.speedMph ?? FIELD.coolDownMph, f.intent, surface, look);
    if (transit) limitPitSpeed(duel.course, r);
    if (!duel._ramFlight(r, dt)) duel._jump(r, dt);
    duel._staticContacts(r, false); duel._boundary(r);
    return;
  }
  // Waiting for a reaction at the start. The lights are already out.
  if (s.stageTimeSec < f.reaction) return;

  const lane = duel.course.pitLane;
  if (lane) {
    const phase = duel.course.phase(r.s);
    if (phase >= lane.entry - 180 && phase <= lane.exit && !f.pitChoice)
      f.pitChoice = choosePit(duel, r, run);
    const selectedStop = f.pitChoice?.stop && phase >= lane.entry && phase <= lane.exit;
    const transit = pitTransitTarget(duel.course, r, look);
    if (selectedStop || transit) {
      if (selectedStop && stepPitService(duel, r, dt)) { f.stuck = 0; f.offSec = 0; return; }
      const limit=lane.limiterStart===undefined ? PIT.limitMph : pitSpeedLimitAt(duel.course,r.s,r.lateral);
      const normal=run.profile.at(r.s+mps*.05)*Math.sqrt(surface.grip??1)*(surface.gripTopShare??1);
      const laneTarget=lane.limiterStart===undefined ? PIT.limitMph : limit??normal;
      let target = laneTarget;
      if (selectedStop) {
        const box = pitBox(lane, r), serviced = !!f.pitServiced;
        const remaining = box - phase;
        const stopMph = Math.sqrt(2 * DRIVE.brakeAccel * run.spec.braking * MPH *
          Math.max(0, remaining - 1)) / MPH;
        target = serviced ? laneTarget : Math.min(laneTarget, stopMph);
        if (!serviced && remaining < 2 && Math.abs(r.lateral - lane.offsetAt(phase)) > 1.6)
          target = 3;
      }
      move(duel, r, run, dt, target, transit?.lateral ?? lane.offsetAt(look), surface, look);
      limitPitSpeed(duel.course, r);
      duel._staticContacts(r, false);
      duel._boundary(r);
      duel._advanceLaps(r, dt);
      f.stuck = 0; f.offSec = 0; f.moveSpeed = r.speedMph;
      return;
    }
    if (phase > lane.exit && f.pitChoice?.stop) { f.pitChoice.stop = false; f.pitDone = true; }
  }

  const summitChoice=observeSummitRoute(duel,r,f.traits.aggression*run.tuning.aggression);
  if(summitChoice!==undefined){
    run.summitPlanner ??= new NpcRoutePlanner(duel.course,{car:run.spec,
      surfaceAt:(distance,lateral)=>duel._drivingSurface(distance,lateral,run.spec,true,r.tyre)});
    const route=run.summitPlanner.update(r,{difficulty:s.cpuDifficulty,lapsTotal:s.lapsTotal,
      player:s,traffic:s.traffic,opponents:s.opponents,summitChoice});
    if(route){
      const target=Math.min(route.targetSpeedMph,run.profile.topMph,surface.speedLimit,surface.gripTopSpeedMph??Infinity);
      f.intent=route.targetLateral;
      move(duel,r,run,dt,target,f.intent,surface,look,route);
      f.moveSpeed=r.speedMph;
      if(!duel._ramFlight(r,dt))duel._jump(r,dt);
      duel._staticContacts(r,false);duel._boundary(r);duel._advanceLaps(r,dt);
      return;
    }
  }
  const { profile, line, tuning } = run;
  const follow = r.completedLaps === 0 ? run.followStart : run.follow;
  const t = f.traits, now = s.stageTimeSec;
  const halfRoad = surface.roadHalfWidth;
  const near = sense(duel, r, run);
  if(f.racecraft){playerPaceMph(duel);closePassRefill(r,run,near,s.stageTimeSec);}
  const zone = nextCorner(profile, r.s);
  const lineOffset = line.offsetAt(look);

  // ---- mistakes: rolled once per corner, none on Hard ----
  if (zone && zone.toEntry < 150 && zone.toApex > 0) {
    const key = `${zone.corner.id}:${r.completedLaps}`;
    if (f.rolledKey !== key) {
      f.rolledKey = key;
      const leader = s.field.order[0]?.index === f.index;
      const chance = tuning.mistakes * (1 - t.consistency) * 4 * (leader ? tuning.leaderMistakes : 1);
      if (chance > 0 && rand(f) < chance) {
        const lift = rand(f) < .5;
        f.mistake = { kind: lift ? 'lift' : 'wide', until: now + (lift ? 1.4 : 2), side: -zone.corner.dir };
      } else rand(f);
    }
    f.zoneKey = key;
  }
  if (f.mistake && now > f.mistake.until) f.mistake = null;

  // ---- who is in the way, who is alongside ----
  const reach = 30 + mps * 2.3;
  let blocker = null;
  for (const c of near) {
    if (c.ds <= 0 || c.gap > reach) continue;
    // A much slower car, or one drifting toward this racer, gets a wider berth.
    const slow = r.speedMph - c.speed > 30 ? 1.1 : 0;
    const band = run.halfWidth + c.hw + .5 + slow;
    const ahead = c.o.lateral + c.vLateral * .8;
    if (Math.abs(c.o.lateral - f.intent) >= band && Math.abs(c.o.lateral - r.lateral) >= band &&
        Math.abs(ahead - r.lateral) >= band && Math.abs(ahead - f.intent) >= band) continue;
    if (!blocker || c.gap < blocker.gap) blocker = c;
  }
  let speedCap = Infinity, desired = lineOffset;
  // Between walls a racer keeps further off them (`wallRoom`, metres), as a car at speed overshoots a lane.
  const roadLimit = Math.max(0, halfRoad - run.halfWidth - .5 - (follow.wallRoom ?? 0));
  let lo = -roadLimit, hi = roadLimit;
  // A car more than half alongside keeps its side; nobody turns into it.
  let squeezed = null;
  // A circuit between walls may ask racers to count a car they are about to draw level with
  // (or that is about to draw level with them) as alongside already (`closeIn`, seconds).
  const closeIn = follow.closeIn ?? 0;
  for (const c of near) {
    const band = run.halfWidth + c.hw + .3;
    const closing = closeIn ? Math.max(0, c.ds > 0 ? r.speedMph - c.speed : c.speed - r.speedMph) * MPH * closeIn : 0;
    // Cars directly ahead or behind in the same lane are handled by following.
    if (Math.abs(c.ds) > run.halfLength + c.hl + .6 + closing || Math.abs(c.dl) < band * .35) continue;
    if (c.dl >= 0) hi = Math.min(hi, c.o.lateral - band); else lo = Math.max(lo, c.o.lateral + band);
    // Only the car that is behind gives way when there is no room for both.
    if (c.ds > .25 || (Math.abs(c.ds) <= .25 && c.index < f.index))
      squeezed = squeezed ? (c.speed < squeezed.speed ? c : squeezed) : c;
  }

  const formNow = paceForm(f, now);
  const target0 = profile.at(r.s + mps * .05) * (1 + formNow);
  const onStraight = target0 >= run.profile.topMph * .97;
  let passIntent = null;

  // ---- passing: pull out beside a slower car, finish the move once alongside ----
  // How close behind a slower car this racer waits before pulling out; keener racers go sooner.
  // Pass type 4: aggressive drivers wait up to 1.5 s behind, never on lap 1 before the first braking zone is passed.
  const wideWindow = f.racecraft && PASS_TYPES.window && (r.completedLaps > 0 || r.s >= s.field.nitroArmS);
  const window = Math.min(wideWindow ? 1.5 : 1.2, .5 + (wideWindow ? 1 : .7) * t.aggression * tuning.aggression * (r.completedLaps === 0 ? 1 + t.firstLap : 1));
  // The lane beside a car on `side`: clear of the car and of the racing line where it is running.
  const lineLane = (side, other, otherHalfWidth, ds) => {
    const clear = run.halfWidth + otherHalfWidth + .3, onLine = line.offsetAt(r.s + ds);
    return side > 0 ? Math.max(onLine + clear + .1, other.lateral + clear) : Math.min(onLine - clear - .1, other.lateral - clear);
  };
  // Pass type 1: with the switch on the lane is measured from the car itself, so a car on the racing line can be passed.
  const alongsideOn = f.racecraft && PASS_TYPES.alongside;
  const passLane = (side, other, otherHalfWidth, ds, dive = false) =>
    alongsideOn && !dive ? other.lateral + side * (run.halfWidth + otherHalfWidth + .3) : lineLane(side, other, otherHalfWidth, ds);
  const cp = f.pass && (f.pass.index < 0 ? s : s.opponents[f.pass.index]);
  if (f.pass) {
    const shell = cp ? duel._vehicleSpec(cp) : null;
    const ds = cp ? duel.relativeS(cp.s, r.s) - r.s : 0;
    const gap = cp ? ds - run.halfLength - shell.halfLength : 0;
    // The gap has to keep shrinking: a pass that is not gaining is given up.
    if (cp && gap < f.pass.bestGap - .5) { f.pass.bestGap = gap; f.pass.bestAt = now; }
    if (!cp || cp === r || cp.knock || now - f.pass.since > 30) { f.pass = null; f.passCool = now + 2; f.passes.timeout++; }
    else if (ds < -(run.halfLength + shell.halfLength + 3.5)) { f.pass = null; f.passCool = now + 1; f.passes.done++; }
    // Commit point: a side-by-side pass must be at least half alongside 60 m before the braking zone, or it backs out.
    // A dive that is not half alongside 20 m before the turn-in point gives up and brakes to follow.
    else if (f.racecraft && PASS_TYPES.dive && f.pass.dive && zone && zone.toApex > -10 && zone.toApex < 45 &&
        run.halfLength + shell.halfLength - Math.abs(ds) < Math.min(run.halfLength, shell.halfLength)) {
      f.passes.backedOut = (f.passes.backedOut || 0) + 1;
      f.pass = null; f.passCool = now + 4;
    }
    else if ((f.pass.type === 'alongside' || f.pass.type === 'exit') && zone && zone.toEntry > -10 && zone.toEntry < 60 &&
        run.halfLength + shell.halfLength - Math.abs(ds) < Math.min(run.halfLength, shell.halfLength)) {
      f.passes.backedOut = (f.passes.backedOut || 0) + 1;
      f.pass = null; f.passCool = now + 4;
    }
    else if (gap > 1 && (f.pass.dive ? zone && zone.toApex < -10 :
        (now - f.pass.bestAt > 6) ||
        (zone && zone.toEntry > -10 && zone.toEntry < 25 && gap > 6))) {
      const why = f.pass.dive ? 'diveEnd' : now - f.pass.bestAt > 6 ? 'noGain' : 'zone';
      f.passes[why] = (f.passes[why] || 0) + 1;
      f.pass = null; f.passCool = now + 4; f.passes.stalled++;
    } else {
      const lane = passLane(f.pass.side, cp, shell.halfWidth, ds, f.pass.dive);
      if (Math.abs(lane) > roadLimit - .6) { f.pass = null; f.passCool = now + 3; f.passes.edge++; }
      else passIntent = lane;
    }
  }
  if (!f.pass && blocker && blocker.gap > -1 && now >= (f.passCool || 0) && now > 10) {
    // Quicker than the car ahead in its own right, not just for a moment (the player's pace is its speed).
    const theirs = blocker.index >= 0 ? runtimeOf(duel, blocker.o).profile.at(blocker.o.s) * (1 + paceForm(blocker.o.field, now)) : (f.racecraft ? playerPaceMph(duel) : blocker.speed);
    const closingPace = profile.at(r.s + blocker.ds) * (1 + formNow) - theirs;
    const gapTime = Math.max(0, blocker.gap) / Math.max(12, mps);
    const straight = Math.abs(line.curvatureAt(look)) < 1 / 300 && Math.abs(line.curvatureAt(look + 70)) < 1 / 260 &&
      !(zone && zone.toEntry > -10 && zone.toEntry < 40);
    // Pass type 2: on the straight after a corner, a car that left it at least 3 mph faster counts its tow.
    const exitBonus = f.racecraft && PASS_TYPES.exitTow && straight && !onStraight && f.tow > 0 && r.speedMph - blocker.speed >= 3
      ? FIELD.towTopSpeed * f.tow * target0 : 0;
    const closing = closingPace + exitBonus;
    const exitUsed = exitBonus > 0 && !(closingPace > Math.max(2, r.speedMph * .008));
    // Is there road enough before the next braking zone to finish the move?
    const roadAhead = zone && zone.toEntry > -10 ? zone.toEntry : Infinity;
    const needed = mps * (blocker.gap + 8) / Math.max(1, closing * MPH) + 30;
    if (closing > Math.max(2, r.speedMph * .008) && gapTime < window && straight && roadAhead > needed) {
      const inside = zone && zone.toApex < 320 ? zone.corner.dir : 0;
      const roomed = side => roadLimit - Math.abs(passLane(side, blocker.o, blocker.hw, blocker.ds));
      const sides = (inside || (roomed(1) >= roomed(-1) ? 1 : -1)) > 0 ? [1, -1] : [-1, 1];
      for (const side of sides) {
        const lane = passLane(side, blocker.o, blocker.hw, blocker.ds);
        if (Math.abs(lane) > roadLimit - .6) continue;
        // Mirror check: a car closing from behind within 2 s counts as in the lane.
        const mirror = c => alongsideOn || exitUsed ? Math.max(0, c.speed - r.speedMph) * MPH * 2 : 0;
        const crowded = near.some(c => c !== blocker && c.ds > -(run.halfLength + c.hl + 4 + mirror(c)) && c.ds < blocker.ds + 30 &&
          Math.abs(c.o.lateral - lane) < run.halfWidth + c.hw + .3);
        if (crowded) continue;
        const type = exitUsed ? 'exit' : alongsideOn && Math.abs(lane - lineLane(side, blocker.o, blocker.hw, blocker.ds)) > .05 ? 'alongside' : 'line';
        f.pass = { index: blocker.index, side, since: now, bestGap: blocker.gap, bestAt: now, ...(f.racecraft ? {type} : {}) };
        f.passes.start++;
        passIntent = lane;
        break;
      }
    }
  }
  // A dive: pull alongside on the inside as the braking zone starts and brake later.
  if (!f.pass && blocker && zone && now >= (f.passCool || 0) && f.diveKey !== f.zoneKey && zone.toEntry > 8 && zone.toEntry < 110 &&
      zone.corner.entryMph - zone.corner.speedMph > 25 && blocker.gap > -1 &&
      Math.max(0, blocker.gap) / Math.max(12, mps) < window + .15) {
    f.diveKey = f.zoneKey;
    f.passes.diveTry = (f.passes.diveTry || 0) + 1;
    if (rand(f) < Math.min(.95, t.aggression * tuning.aggression * 1.1)) {
      const side = zone.corner.dir, lane = passLane(side, blocker.o, blocker.hw, blocker.ds, true);
      const crowded = near.some(c => c !== blocker && c.ds > -(run.halfLength + c.hl + 4) && c.ds < blocker.ds + 30 &&
        Math.abs(c.o.lateral - lane) < run.halfWidth + c.hw + .3);
      if (crowded) f.passes.diveCrowded = (f.passes.diveCrowded || 0) + 1;
      if (Math.abs(lane) > roadLimit - .6) f.passes.diveEdge = (f.passes.diveEdge || 0) + 1;
      // Pass type 3: dive only if, at the closing rate, the diver will be half alongside by the other car's turn-in point.
      const turnInSec = Math.max(0, zone.toApex - 25) / Math.max(12, mps);
      const predictedGap = blocker.gap - Math.max(0, r.speedMph - blocker.speed) * MPH * turnInSec;
      const unsafe = f.racecraft && PASS_TYPES.dive && predictedGap > -Math.min(run.halfLength, blocker.hl);
      if (unsafe) f.passes.diveUnsafe = (f.passes.diveUnsafe || 0) + 1;
      if (Math.abs(lane) <= roadLimit - .6 && !crowded && !unsafe) {
        f.pass = { index: blocker.index, side, since: now, bestGap: blocker.gap, bestAt: now, dive: true, ...(f.racecraft ? {type: 'dive'} : {}) };
        f.passes.start++; f.passes.dives++;
        passIntent = lane;
      }
    }
  }
  if (f.racecraft && f.pass) f.passMark = {type: f.pass.type, t: now};
  if (passIntent != null) desired = passIntent;

  // Following when there is no safe way past.
  if (blocker && (!f.pass || Math.abs(blocker.o.lateral - r.lateral) < run.halfWidth + blocker.hw + .15)) {
    speedCap = Math.min(speedCap, followLimitMph(run, blocker, follow));
  }

  // ---- defending: one move to cover the inside before a braking zone ----
  if (!f.pass && zone && zone.toEntry > 15 && zone.toEntry < 200 && f.defendKey !== f.zoneKey && zone.corner.entryMph - zone.corner.speedMph > 25) {
    const chaser = near.find(c => c.ds < 0 && c.gap > 1.2 && c.gap < 1 * Math.max(12, mps) && Math.abs(c.dl) < 4.5 && c.speed >= r.speedMph - 4);
    const alongside = near.some(c => Math.abs(c.ds) < run.halfLength + c.hl + .5 && Math.abs(c.dl) < 5);
    if (chaser && !alongside) {
      f.defendKey = f.zoneKey;
      f.defendSide = rand(f) < t.defend ? zone.corner.dir : 0;
    }
  }
  if (f.defendSide && f.defendKey === f.zoneKey && zone && zone.toApex > -2 && !f.pass) {
    desired = f.defendSide * clamp(halfRoad * .45, 0, roadLimit);
    speedCap = Math.min(speedCap, target0 * .985);
  }

  // ---- a missed apex ----
  if (f.mistake?.kind === 'wide') desired += f.mistake.side * 2.2;

  // ---- sharing the road ----
  if (lo > hi) {
    desired = (lo + hi) / 2;
    if (squeezed) speedCap = Math.min(speedCap, Math.max(0, squeezed.speed - 2));
  } else desired = clamp(desired, lo, hi);
  const bias = desired - lineOffset;
  const rate = f.pass ? 3.2 : f.defendSide && f.defendKey === f.zoneKey ? 3 : 3.6;
  f.bias += clamp(bias - f.bias, -rate * dt, rate * dt);
  f.intent = lo > hi ? (lo + hi) / 2 : clamp(lineOffset + f.bias, lo, hi);

  // ---- speed ----
  let target = target0;
  if (f.pass && zone && zone.toEntry < 70 && zone.toEntry > -40) {
    f.lateBrake = Math.min(f.racecraft && PASS_TYPES.dive && f.pass.dive ? .03 : .12, .02 + .07 * t.aggression);
    target *= 1 + f.lateBrake;
  } else f.lateBrake = 0;
  if (f.tow > 0 && onStraight) target *= 1 + FIELD.towTopSpeed * f.tow;
  else if (f.tow > 0) target *= 1 + FIELD.towTopSpeed * f.tow * clamp((target0 / run.profile.topMph - .8) / .2, 0, 1);
  if (f.mistake?.kind === 'lift') target *= .82;
  else if (f.mistake?.kind === 'wide') target *= .93;
  if (r.contactCooldown > 0) target *= .85;
  // Easing off when well ahead of the player (none on Hard).
  if (tuning.catchUp > 0) {
    const lead = (duel.relativeS(r.s, s.s) - s.s) / Math.max(25, s.speedMph * MPH);
    target *= catchUpFactor(tuning, lead);
  }
  if(f.racecraft){
    const straight=onStraight && Math.abs(line.curvatureAt(look))<1/300 && !(zone && zone.toEntry>-10 && zone.toEntry<80);
    const attack=!!f.pass || near.some(c=>c.ds>0 && c.gap<Math.max(12,mps) && !c.o.finished);
    // GP-PASSING-2 step B: on lap 1 a car also defends against the player (index -1) from 1 s behind.
    const defend=near.some(c=>c.ds<=0 && -c.ds<Math.max(run.halfLength+c.hl, mps*(r.completedLaps===0 && c.index<0 ? 1 : .5)));
    stepCpuNitro(r,run,dt,{straight,attack,defend,pit:!!r.pit || surface.boostAllowed===false || nitroLocked(r,s.field)});
    if(r.boosting){
      target+=cpuNitroExtraMph(r,run.spec);
    }
  }
  // The paved shoulder is forgiving; beyond it the car slows hard.
  if (r.offRoad) target = Math.abs(r.lateral) > surface.roadHalfWidth + 1.25 ? Math.min(target * .7, surface.speedLimit) : target * .92;
  if(r.tyre)target*=Math.sqrt(surface.grip??1)*(surface.gripTopShare??1);
  target = Math.max(0, Math.min(target, speedCap,surface.gripTopSpeedMph??Infinity));
  move(duel, r, run, dt, target, f.intent, surface, look);
  f.moveSpeed = r.speedMph;

  if (!duel._ramFlight(r, dt)) duel._jump(r, dt);
  duel._staticContacts(r, false);
  duel._boundary(r);
  duel._advanceLaps(r, dt);
  if (r.completedLaps >= s.lapsTotal) {
    r.finished = true; r.finishTime = s.stageTimeSec; r.contactExempt = true;
    s.field.stats.finishTimes[f.index] = +r.lapStartedAt.toFixed(3);
    duel.emit({ opponentFinished: f.index });
    return;
  }
  // A car that stops moving or stays off the road is put back on it.
  if (r.speedMph < 4 && !r.knock) f.stuck += dt; else f.stuck = 0;
  f.offSec = r.offRoad ? f.offSec + dt : 0;
  if (f.stuck > 3.5 || f.offSec > 6) {
    duel._safeReset(r);
    f.stuck = 0; f.offSec = 0; f.recoveries++; s.field.stats.recoveries++;
    f.bias = 0; f.pass = null;
  }
}
