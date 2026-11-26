import {MPH_TO_KMH} from '../scablands-ground-rules.js';

export const RIDER_RULE = Object.freeze({
  wash: Object.freeze({
    bankOffset: 250, scatter: 9, homeScale: 3, roadblockScatter: 1.5, approachMph: 22,
    starts: [[-20,203], [102,216], [-126,181], [-160,-175], [170,-170], [32,-217]],
    roadblock: [[0,16], [0,-15], [-8,2], [8,1], [5,19], [-6,-18]],
  }),
  // Six wrecked cars fit the existing twelve-person foot-figure rig.
  maximumField: 6, crewPerCar: 2, crewDoor: 1.7, crewRunMetres: 48, crewMps: 5.7,
  retreatFraction: .25, retreatMph: 39, homeRadius: 7, aftermathSec: 3,
  // NIGHT-2-TRY-FIXES: a rider still within its fight's getaway distance of the player drives on away in legs of this length.
  getawayLegMetres: 40,
  // STORY-NIGHT-2-FLOW: the siege circle, the box a bailing man is kept out of round the player's car, and the run he gives up.
  circleMph: 20, circleLeadRadians: .45, crewClearHalfWidth: 1.45, crewClearHalfLength: 2.85, crewStuckSec: 4,
  crewProgressMetres: .5, crewFarDoorAhead: 1.1,

  minimumBoxRiders: 5, verticalReach: 2.5, boxMph: 10 / MPH_TO_KMH, boxSeconds: 3,
  boxRange: 8, bumperLength: 7.5, bumperHalfWidth: 2.1, boxStopMetres: 9,
  boxHalfWidth: 2.9, boxHalfLength: 5.2, boxInterceptSec: 1.2, boxPaceMph: 65,
  boxChaseGain: 2.5, boxBrakeGain: 2, boxLook: 12, boxJoinMetres: 48,
  boxBrakeMphSec: 84, boxFifthOffset: 4, axisShare: .6,

  probeMetres: 8, probeRadius: 1.25, swerveRadians: .95, swerveMph: 22,
  openingTellMetres: 74, openingTellSec: 1.1, openingTellMph: 26, openingAlignRadians: .65,
  openingBrakeMetres: 26, openingBrakeGain: 1.5, openingChargeSec: 3.2, turnRadians: .75, turnMph: 32,
  openingSafeSec: 6, openingAvoidMph: 34, openingAvoidLook: 45, openingAvoidTurn: 1.25,
  ashRange: 46, ashFlightSec: .75, ashRadius: 5, ashLifetime: 2, ashCooldownSec: 3,
  difficulty: Object.freeze({
    easy: Object.freeze({armor: .60, pace: .55, aim: .27, lead: .15, approachMph: 58, openingChargeMph: 53}),
    medium: Object.freeze({armor: .85, pace: .76, aim: .46, lead: .55, approachMph: 64, openingChargeMph: 64}),
    hard: Object.freeze({armor: 1.90, pace: 1, aim: .70, lead: 1, approachMph: 70, openingChargeMph: 75}),
  }),
});

export function stepRiderJob(step, state, view) {
  const fight = view.riderFight;
  if (!fight?.outcome) return {state};
  const result = {type:'riderFight', id:step.id, outcome:fight.outcome, smothered:[...fight.smothered]};
  const complete = fight.elapsed - fight.endedAt >= RIDER_RULE.aftermathSec;
  return {state, events:view.riderFightReported ? [] : [result], complete};
}
