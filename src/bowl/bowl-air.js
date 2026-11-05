const TURN = Math.PI * 2;
const AIR_PITCH_RATE = TURN / 1.1;
const UPRIGHT_LANDING_ANGLE = Math.PI / 4;
const ROOF_LANDING_ANGLE = Math.PI / 2;
const AIR_STATES = new WeakMap();

const wrappedAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// W and S are already throttle and brake in the car input. Reuse those axes
// only for the Bowl player's airborne pitch, leaving flight velocity alone.
export function stepBowlAir(duel, actor, dt) {
  if (duel.course?.def?.bowl !== true ||
      duel.featureFlags?.enabled('titan-bowl') !== true || actor !== duel.state ||
      !Number.isFinite(dt) || dt <= 0) return;

  const s = actor;
  let air = AIR_STATES.get(s);
  const stageTime = Number.isFinite(s.stageTimeSec) ? s.stageTimeSec : 0;
  if (!air || stageTime < air.stageTime) {
    air = { angle: 0, active: false, stageTime };
    AIR_STATES.set(s, air);
    s.bowlAirFlips = 0;
    s.bowlAirPitch = 0;
  }
  air.stageTime = stageTime;
  if (s.airborne && !s.tumble) {
    air.active = true;
    air.angle += ((s.input?.brake || 0) - (s.input?.throttle || 0)) * AIR_PITCH_RATE * dt;
    s.bowlAirPitch = wrappedAngle(air.angle);
    return;
  }

  if (!air.active) return;
  air.active = false;
  const landingAngle = wrappedAngle(air.angle);
  const completedTurns = Math.floor(Math.abs(air.angle) / TURN);
  const landedUpright = Math.abs(landingAngle) <= UPRIGHT_LANDING_ANGLE;
  air.angle = 0;
  s.bowlAirPitch = 0;

  if (landedUpright && completedTurns > 0) {
    s.bowlAirFlips = (s.bowlAirFlips || 0) + completedTurns;
  } else if (Math.abs(landingAngle) > ROOF_LANDING_ANGLE) {
    s.terrainPitch = landingAngle;
    duel._startTumble('bowl_roof_landing');
  }
}
