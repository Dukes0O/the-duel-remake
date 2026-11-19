import {MPH_TO_KMH} from '../scablands-ground-rules.js';

export const RIDER_RULE = Object.freeze({
  wash: Object.freeze({
    bankOffset: 250, scatter: 9, homeScale: 3, roadblockScatter: 1.5, approachMph: 22,
    starts: [[0,76], [52,53], [-61,45], [-41,-43], [49,-56], [0,-65]],
    roadblock: [[0,16], [0,-15], [-8,2], [8,1], [5,19], [-6,-18]],
  }),
  // Six wrecked cars fit the existing twelve-person foot-figure rig.
  maximumField: 6, crewPerCar: 2, crewDoor: 1.7, crewRunMetres: 48, crewMps: 5.7,
  retreatFraction: .25, retreatMph: 39, homeRadius: 7, aftermathSec: 3,

  minimumBoxRiders: 5, verticalReach: 2.5, boxMph: 10 / MPH_TO_KMH, boxSeconds: 3,
  boxRange: 8, bumperLength: 7.5, bumperHalfWidth: 2.1, boxStopMetres: 9,
  boxHalfWidth: 2.9, boxHalfLength: 5.2, boxInterceptSec: 1.2, boxPaceMph: 65,
  boxChaseGain: 2.5, boxBrakeGain: 2, boxLook: 12, boxJoinMetres: 48,
  boxBrakeMphSec: 84, boxFifthOffset: 4, axisShare: .6,

  probeMetres: 8, probeRadius: 1.25, swerveRadians: .95, swerveMph: 22,
  ashRange: 46, ashFlightSec: .75, ashRadius: 5, ashLifetime: 2, ashCooldownSec: 3,
  difficulty: Object.freeze({
    easy: Object.freeze({armor: .60, pace: .55, aim: .27, lead: .15}),
    medium: Object.freeze({armor: .85, pace: .76, aim: .46, lead: .55}),
    hard: Object.freeze({armor: 1.90, pace: 1, aim: .70, lead: 1}),
  }),
});

export function stepRiderJob(step, state, view) {
  const fight = view.riderFight;
  if (!fight?.outcome) return {state};
  const result = {type:'riderFight', id:step.id, outcome:fight.outcome, smothered:[...fight.smothered]};
  const complete = fight.elapsed - fight.endedAt >= RIDER_RULE.aftermathSec;
  return {state:{reported:true}, events:state.reported ? [] : [result], complete};
}
