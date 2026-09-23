// RFX-02: extracted from Duel without changing fixed-step race rules.
import { CARS, CPU_DIFFICULTY, COURSE, LIVES, DRIVE, SCORING } from './config.js';
import { finishDrift } from './drift-scoring.js';

export function _parTime() {
  const car = CARS[this.state.car], skill = CPU_DIFFICULTY[this.state.cpuDifficulty].skill;
  const speed = Math.min(SCORING.parSpeedMph, car.topSpeed * .72, this.course.def.offroad ? this._drivingSurface(0, 0, car).speedLimit * .85 : Infinity) * skill;
  return this.raceLength / (speed * DRIVE.mphToWorld);
}

export function _objectiveResult() {
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

export function _deadline(atSec) {
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

export function _finishStage() {
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

export function nextStage() {
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
