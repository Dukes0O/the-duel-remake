// Kestrel One's flight rules (docs/HELICOPTER.md section 3). Pure and
// repeatable: the same start, inputs and ground give the same flight. No
// graphics, no clock, no randomness. Metres, kilograms and seconds inside.
//
// Axes match the race: y is up, heading 0 faces +z, forward is
// (sin heading, cos heading), and turning right lowers the heading (as the
// car's steering does), so right is (-cos heading, sin heading).
// Pitch is positive nose down (thrust tilts forward); roll is positive right
// side down (thrust tilts right).

export const HELI_STEP = 1 / 120;
export const GRAVITY = 9.81;
const DEG = Math.PI / 180;

export const KESTREL = Object.freeze({
  emptyKg: 1150,
  pilotKg: 80,
  tankKg: 400,
  hookLimitKg: 1500,
  rotorDiameter: 10,
  mastHeight: 2.6,
  topSpeed: 60,
  safeCableSpeed: 30,
  // Most thrust at sea level: 1.08 x the heaviest takeoff weight.
  maxThrust: 1.08 * (1150 + 80 + 400 + 1500) * GRAVITY,
  airScaleHeight: 8500,
  groundEffect: 0.15,
  translationalLift: 0.10,
  translationalFrom: 8,
  translationalTo: 13,
  // Above 60 m/s the retreating blade stalls and drag climbs steeply, so
  // tilting harder (Real allows 25 degrees) cannot push past the top speed.
  stallDragFrom: 60,
  stallDragRise: 0.4,
  maxTilt: Object.freeze({assisted: 20 * DEG, real: 25 * DEG}),
  tiltRate: 60 * DEG,
  yawRate: 60 * DEG,
  assistedClimb: 5,
  realCollectiveRate: 0.5,
  burnIdle: 0.25,
  burnPerCollective: 0.55,
  lowFuelShare: 0.15,
  autorotationSink: 8,
  groundSpinDown: 0.07,
  flareLift: 1.5,
  flareSpend: 0.4,
  flareHeight: 15,
  touchdown: Object.freeze({goodSink: 1.5, goodTilt: 10 * DEG, goodSlide: 3, hardSink: 3, hardTilt: 20 * DEG, hardSlide: 8}),
});

// Quadratic drag. Horizontal: sized so a full tank and no load tops out at
// 60 m/s at the Assisted 20 degree tilt while holding height. Vertical: the
// rotor disc resists climbing and sinking; full collective with no load
// climbs at about 10 m/s.
const HOVER_REFERENCE_KG = KESTREL.emptyKg + KESTREL.pilotKg + KESTREL.tankKg;
export const HORIZONTAL_DRAG = HOVER_REFERENCE_KG * GRAVITY * Math.tan(KESTREL.maxTilt.assisted) / KESTREL.topSpeed ** 2;
export const VERTICAL_DRAG = 162;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const approach = (value, target, maxStep) => value + clamp(target - value, -maxStep, maxStep);
const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;

// The Lab's upgrades (docs/LAB.md 4.1, src/lab/lab-heli.js) ride on the state as `state.upgrades`:
// {thrustFactor, emptyMassKg, altitudeScaleM}. A state without them is the helicopter as it always was.
export function heliMass(state) {
  return (state.upgrades?.emptyMassKg ?? KESTREL.emptyKg) + KESTREL.pilotKg + Math.max(0, state.fuelKg);
}

// Thin air: thrust falls with real altitude above sea level.
export function airFactor(altitudeM, scaleM = KESTREL.airScaleHeight) {
  return Math.exp(-Math.max(0, altitudeM) / scaleM);
}

// Up to 15% more thrust with the skids on the ground, none at one rotor
// diameter (10 m) up.
export function groundEffectFactor(heightAboveGround) {
  return 1 + KESTREL.groundEffect * clamp(1 - heightAboveGround / KESTREL.rotorDiameter, 0, 1);
}

// Rotor efficiency rises 10% between 8 and 13 m/s airspeed (translational
// lift) and stays there.
export function speedLiftFactor(airspeed) {
  return 1 + KESTREL.translationalLift * clamp((airspeed - KESTREL.translationalFrom) /
    (KESTREL.translationalTo - KESTREL.translationalFrom), 0, 1);
}

// Horizontal drag per (m/s) squared at this airspeed, with the stall rise.
export function dragCoefficient(airspeed) {
  const over = Math.max(0, airspeed - KESTREL.stallDragFrom);
  return HORIZONTAL_DRAG * (1 + KESTREL.stallDragRise * over);
}

// upgrades: the Lab's {thrustFactor, emptyMassKg, altitudeScaleM}, or null/left out for the plain helicopter,
// which gets no `upgrades` field at all.
export function createHeliState({x = 0, y = 0, z = 0, heading = 0, fuelKg = KESTREL.tankKg,
  mode = 'assisted', altitudeOffset = 0, ground = null, upgrades = null} = {}) {
  const groundY = ground ? ground.height(x, z) : 0;
  const startY = Math.max(finite(y), groundY);
  const state = {
    t: 0, x, y: startY, z, vx: 0, vy: 0, vz: 0,
    heading, pitch: 0, roll: 0, yawRate: 0,
    collective: 0, rotor: fuelKg > 0 ? 1 : 0, rotorEnergy: 1,
    fuelKg: clamp(finite(fuelKg), 0, KESTREL.tankKg),
    engine: fuelKg > 0, mode: mode === 'real' ? 'real' : 'assisted',
    altitudeOffset: finite(altitudeOffset),
    onGround: startY - groundY < 0.01, groundY,
    crashed: false, lowFuelWarned: fuelKg <= KESTREL.tankKg * KESTREL.lowFuelShare,
    lowRotorWarned: false, burnedKg: 0,
  };
  if (upgrades) state.upgrades = Object.freeze({thrustFactor: upgrades.thrustFactor, emptyMassKg: upgrades.emptyMassKg, altitudeScaleM: upgrades.altitudeScaleM});
  return state;
}

export function horizontalSpeed(state) {
  return Math.hypot(state.vx, state.vz);
}

export function tiltOf(state) {
  return Math.acos(clamp(Math.cos(state.pitch) * Math.cos(state.roll), -1, 1));
}

// Thrust the rotor could give now at full collective, before tilt.
export function availableThrust(state, heightAboveGround) {
  return KESTREL.maxThrust * (state.upgrades?.thrustFactor ?? 1) * airFactor(state.y + state.altitudeOffset, state.upgrades?.altitudeScaleM) *
    groundEffectFactor(heightAboveGround) * speedLiftFactor(horizontalSpeed(state));
}

// Body up in world coordinates for the current attitude.
function thrustAxis(state) {
  const fwdX = Math.sin(state.heading), fwdZ = Math.cos(state.heading);
  const rightX = -fwdZ, rightZ = fwdX;
  const f = Math.sin(state.pitch) * Math.cos(state.roll), r = Math.sin(state.roll);
  const up = Math.cos(state.pitch) * Math.cos(state.roll);
  return {x: fwdX * f + rightX * r, y: up, z: fwdZ * f + rightZ * r};
}

// Collective an Assisted (or autopilot) height hold asks for to reach a
// climb rate, counting the cable's pull and drag.
function heldCollective(state, climbTarget, external, mass, thrustCap, axisY) {
  const want = mass * (GRAVITY + 2.5 * (climbTarget - state.vy)) - external.y +
    VERTICAL_DRAG * state.vy * Math.abs(state.vy);
  return clamp(want / Math.max(1, thrustCap * axisY), 0, 1);
}

// Climb rate an Assisted descent may ask for: it slows itself near the
// ground so a held S key lands at well under 1 m/s.
function cushionedClimb(climb, heightAboveGround) {
  return climb < 0 ? Math.max(climb, -(0.45 + 0.45 * Math.max(0, heightAboveGround))) : climb;
}

// controls: {lift, pitch, roll, yaw}, each -1..1 (W/S, up/down arrows,
// right/left arrows, D/A). env: {ground, external: {x, y, z} newtons from
// the cable, commands (autopilot targets {pitch, roll, yawRate, climb}) }.
// The autorotation flare is sized from the weight it carries, not the
// rotor's powered limit: it is a short cushion, not a hover.
// Returns the events of this step.
export function stepHeli(state, controls = {}, env = {}, dt = HELI_STEP) {
  const events = [];
  if (state.crashed) return events;
  const ground = env.ground;
  const external = {x: finite(env.external?.x), y: finite(env.external?.y), z: finite(env.external?.z)};
  const commands = env.commands ? {pitch: finite(env.commands.pitch), roll: finite(env.commands.roll),
    yawRate: finite(env.commands.yawRate), climb: finite(env.commands.climb)} : null;
  const lift = clamp(finite(controls.lift), -1, 1), pitchIn = clamp(finite(controls.pitch), -1, 1);
  const rollIn = clamp(finite(controls.roll), -1, 1), yawIn = clamp(finite(controls.yaw), -1, 1);
  const mass = heliMass(state);
  const groundY = ground ? ground.height(state.x, state.z) : 0;
  const agl = state.y - groundY;
  const assistedLaws = state.mode === 'assisted' || commands;

  // Attitude. Assisted levels itself when the cyclic is released; Real holds
  // whatever attitude the cyclic left. The autopilot always uses targets.
  const maxTilt = KESTREL.maxTilt[state.mode];
  const tiltStep = KESTREL.tiltRate * dt;
  if (state.onGround) {
    state.pitch = approach(state.pitch, 0, tiltStep);
    state.roll = approach(state.roll, 0, tiltStep);
  } else if (assistedLaws) {
    const targetPitch = commands ? clamp(commands.pitch, -maxTilt, maxTilt) : pitchIn * maxTilt;
    const targetRoll = commands ? clamp(commands.roll, -maxTilt, maxTilt) : rollIn * maxTilt;
    state.pitch = approach(state.pitch, targetPitch, Math.min(tiltStep, Math.abs(targetPitch - state.pitch) * 6 * dt + 1e-4));
    state.roll = approach(state.roll, targetRoll, Math.min(tiltStep, Math.abs(targetRoll - state.roll) * 6 * dt + 1e-4));
  } else {
    state.pitch = clamp(state.pitch + pitchIn * tiltStep, -maxTilt, maxTilt);
    state.roll = clamp(state.roll + rollIn * tiltStep, -maxTilt, maxTilt);
  }
  const yawTarget = commands ? clamp(commands.yawRate, -KESTREL.yawRate, KESTREL.yawRate) : -yawIn * KESTREL.yawRate;
  state.yawRate += (yawTarget - state.yawRate) * (1 - Math.exp(-dt / 0.2));
  state.heading += state.yawRate * dt;

  const axis = thrustAxis(state);
  const thrustCap = availableThrust(state, agl);
  const supportedWeight = Math.max(mass * GRAVITY - external.y, mass * GRAVITY * 0.2);
  const sink = Math.max(0, -state.vy);
  let thrust;

  if (state.engine) {
    state.rotor = approach(state.rotor, 1, 0.5 * dt);
    state.rotorEnergy = approach(state.rotorEnergy, 1, 0.5 * dt);
    if (assistedLaws) {
      let climb = commands ? clamp(commands.climb, -KESTREL.assistedClimb, KESTREL.assistedClimb) : lift * KESTREL.assistedClimb;
      climb = cushionedClimb(climb, agl);
      const target = state.onGround && climb <= 0 ? 0 : heldCollective(state, climb, external, mass, thrustCap, axis.y);
      state.collective = approach(state.collective, target, 2 * dt);
    } else {
      state.collective = clamp(state.collective + lift * KESTREL.realCollectiveRate * dt, 0, 1);
    }
    thrust = state.collective * thrustCap * state.rotor * state.rotor;
    const burn = (KESTREL.burnIdle + KESTREL.burnPerCollective * state.collective) * dt;
    const used = Math.min(burn, state.fuelKg);
    state.fuelKg -= used;
    state.burnedKg += used;
    if (!state.lowFuelWarned && state.fuelKg <= KESTREL.tankKg * KESTREL.lowFuelShare) {
      state.lowFuelWarned = true;
      events.push({type: 'lowFuel', fuelKg: state.fuelKg});
    }
    if (state.fuelKg <= 0) {
      state.fuelKg = 0;
      state.engine = false;
      events.push({type: 'engineOut'});
    }
  } else {
    // Autorotation: the rushing air keeps the rotor turning and holds the
    // sink near 8 m/s. Raising the collective spends the rotor's stored
    // energy for a short cushion (a flare): full collective lasts about
    // 2.5 s. With the lever down the air spins the rotor back up.
    if (assistedLaws && !state.onGround) {
      // Assisted: glide with the lever down; holding W within 15 m of the
      // ground flares toward a gentle touchdown of about 1 m/s.
      const wantSink = Math.min(KESTREL.autorotationSink, 0.8 + 0.8 * Math.max(0, agl));
      const flaring = lift > 0 && agl <= KESTREL.flareHeight;
      const need = flaring ? (sink - wantSink) * 0.8 + (1 - (sink / KESTREL.autorotationSink) ** 2) / KESTREL.flareLift : 0;
      state.collective = approach(state.collective, clamp(need, 0, 1), 4 * dt);
    } else if (!assistedLaws) {
      state.collective = clamp(state.collective + lift * KESTREL.realCollectiveRate * 2 * dt, 0, 1);
    } else {
      state.collective = approach(state.collective, 0, 2 * dt);
    }
    const flare = state.onGround || state.rotorEnergy <= 0 ? 0 : state.collective * KESTREL.flareLift * supportedWeight;
    const windmill = supportedWeight * (sink / KESTREL.autorotationSink) ** 2;
    thrust = state.onGround ? 0 : (flare + windmill) / Math.max(0.2, axis.y);
    state.rotorEnergy += (state.collective > 0.05 ? -KESTREL.flareSpend * state.collective
      : 0.3 * Math.min(1, sink / KESTREL.autorotationSink) * (1 - state.rotorEnergy)) * dt;
    state.rotorEnergy = clamp(state.rotorEnergy, 0, 1);
    // On the ground with the engine off nothing drives the rotor: it spins
    // down to a stop in about 15 s (1 / 0.07). In the air the stored energy
    // above decides its speed, as before.
    state.rotor = state.onGround ? Math.max(0, state.rotor - KESTREL.groundSpinDown * dt)
      : 0.7 + 0.3 * state.rotorEnergy;
  }

  // No horn for a rotor winding down or spinning up on the ground.
  // The low rotor horn warns of a rotor running down with the engine out;
  // a rotor still spinning up after a refuel is not a warning.
  if (state.rotor < 0.9 && !state.lowRotorWarned && !state.onGround && !state.engine) {
    state.lowRotorWarned = true;
    events.push({type: 'lowRotor', rotor: state.rotor});
  } else if (state.rotor >= 0.95) state.lowRotorWarned = false;

  // Forces. Powered vertical drag stands in for the rotor's inflow; in
  // autorotation the windmilling term above already holds the sink.
  const speed = horizontalSpeed(state), drag = dragCoefficient(speed);
  let fx = thrust * axis.x - drag * state.vx * speed + external.x;
  let fz = thrust * axis.z - drag * state.vz * speed + external.z;
  let fy = thrust * axis.y - mass * GRAVITY + external.y -
    (state.engine ? VERTICAL_DRAG * state.vy * Math.abs(state.vy) : 0);

  if (state.onGround) {
    if (fy <= 0) {
      // Resting on the skids: friction stops any slide.
      const keep = Math.exp(-4 * dt);
      state.vx *= keep; state.vz *= keep; state.vy = 0;
      fx = 0; fz = 0; fy = 0;
    } else {
      state.onGround = false;
      events.push({type: 'liftoff'});
    }
  }
  state.vx += fx / mass * dt;
  state.vy += fy / mass * dt;
  state.vz += fz / mass * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.z += state.vz * dt;
  state.t += dt;

  const nextGround = ground ? ground.height(state.x, state.z) : 0;
  state.groundY = nextGround;
  if (!state.onGround && state.y <= nextGround) {
    const touch = {type: 'touchdown', sink: Math.max(0, -state.vy), slide: horizontalSpeed(state), tilt: tiltOf(state)};
    touch.result = touchdownClass(touch);
    events.push(touch);
    state.y = nextGround;
    state.vy = 0;
    state.onGround = true;
    if (touch.result === 'crash') {
      state.crashed = true;
      events.push({type: 'crash', cause: 'touchdown'});
      return events;
    }
  } else if (state.onGround) {
    state.y = nextGround;
  }

  if (ground?.rotorStrike && !state.onGround &&
      ground.rotorStrike(state.x, state.y + KESTREL.mastHeight, state.z, KESTREL.rotorDiameter / 2, {skidsY: state.y})) {
    state.crashed = true;
    events.push({type: 'crash', cause: 'rotor'});
  }
  return events;
}

// Fuel from the pump or a fuel truck: sets the tank, restarts a stopped
// engine and clears the low fuel warning once above 15%.
export function refuelHeli(state, fuelKg) {
  state.fuelKg = clamp(finite(fuelKg, state.fuelKg), 0, KESTREL.tankKg);
  if (state.fuelKg > 0 && !state.crashed) {
    state.engine = true;
    state.rotor = Math.max(state.rotor, 0.7);
  }
  state.lowFuelWarned = state.fuelKg <= KESTREL.tankKg * KESTREL.lowFuelShare;
  return state;
}

// Good, hard or crash (section 3, Touchdown). Tilt 10 to 20 degrees or a
// slide of 3 to 8 m/s turns a good landing hard; beyond those it is a crash.
export function touchdownClass({sink, tilt = 0, slide = 0}) {
  const td = KESTREL.touchdown;
  if (sink <= td.goodSink && tilt <= td.goodTilt && slide <= td.goodSlide) return 'good';
  if (sink <= td.hardSink && tilt <= td.hardTilt && slide <= td.hardSlide) return 'hard';
  return 'crash';
}

// What the instruments show. Height above sea level and above the ground,
// knots, feet, rotor percent, fuel and minutes left at the present burn,
// weight now and the heaviest weight the rotor can hover here.
export function heliReadout(state, {loadKg = 0} = {}) {
  const mass = heliMass(state) + Math.max(0, loadKg);
  const altitude = state.y + state.altitudeOffset;
  const burn = state.engine ? KESTREL.burnIdle + KESTREL.burnPerCollective * state.collective : 0;
  let compass = (-state.heading / DEG) % 360;
  if (compass < 0) compass += 360;
  return {
    altitudeM: altitude,
    altitudeFt: altitude * 3.28084,
    heightM: state.y - state.groundY,
    heightFt: (state.y - state.groundY) * 3.28084,
    airspeedKts: horizontalSpeed(state) * 1.943844,
    climbMs: state.vy,
    climbFpm: state.vy * 196.8504,
    rotorPct: state.rotor * 100,
    fuelKg: state.fuelKg,
    fuelMinutes: burn > 0 ? state.fuelKg / burn / 60 : Infinity,
    weightKg: mass,
    maxLiftKg: KESTREL.maxThrust * (state.upgrades?.thrustFactor ?? 1) * airFactor(altitude, state.upgrades?.altitudeScaleM) / GRAVITY,
    headingDeg: compass,
    pitchDeg: state.pitch / DEG,
    rollDeg: state.roll / DEG,
    engine: state.engine,
  };
}

// A short text of the whole state, for "same inputs, same flight" checks.
export function heliFingerprint(state) {
  const keys = ['t', 'x', 'y', 'z', 'vx', 'vy', 'vz', 'heading', 'pitch', 'roll', 'collective', 'rotor', 'rotorEnergy', 'fuelKg'];
  return keys.map(key => state[key].toFixed(6)).join('|') + `|${state.engine}|${state.onGround}|${state.crashed}`;
}
