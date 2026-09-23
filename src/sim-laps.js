// RFX-02: extracted from Duel without changing fixed-step race rules.
import { COURSE, DRIVE, ROAD_SHOULDER_WIDTH } from './config.js';
import { segmentCircle } from './collision.js';
import { clamp } from './sim-common.js';

export function _flockBonuses() {
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

export function _advanceLaps(actor, dt, noReset = false) {
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

export function _advanceRushGates(dt) {
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
