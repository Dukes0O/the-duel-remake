// config.js — The Duel canon. CANON = fixed by the build brief; HOUSE =
// plausible arcade values invented to fill gaps, frozen here.

// CANON — 5 lives; crash -1 + 30s; clean stage +1; missed station -1.
export const LIVES = {
  start: 5,
  crashPenaltySec: 30,
  crashLifeCost: 1,
  cleanStageReward: 1,
  missedStationCost: 1,
};

// CANON — two core cars: F40 / 959 homages with fictional names + original
// silhouettes. HOUSE — the stat blocks (speed/accel/grip/braking/gears).
// topSpeed in mph; accel is the base throttle rate (peak mph/s ≈ accel *
// DRIVE.accelScale); grip and braking are 0..1 multipliers; gears list
// per-gear max speed (mph).
export const CARS = {
  falcone_f42: {
    name: 'Falcone F42', homage: 'F40-style', gearbox: 'manual',
    topSpeed: 201, accel: 7.6, grip: 0.82, braking: 0.90,
    gears: [55, 95, 135, 172, 201], // 5-speed, twitchy & fast
    color: 0xc81d11, accent: 0xf2c200,
  },
  stuttgart_959s: {
    name: 'Stuttgart 959-S', homage: '959-style', gearbox: 'manual',
    topSpeed: 197, accel: 6.9, grip: 0.95, braking: 1.00,
    gears: [50, 88, 124, 158, 184, 197], // 6-speed, planted AWD
    color: 0xded6c8, accent: 0x2b6cb0,
  },
  aurora_gt: {
    name: 'Aurora GTR', homage: 'Carbon GT package', gearbox: 'manual',
    topSpeed: 214, accel: 8.1, grip: 1.01, braking: 1.06,
    gears: [56, 96, 136, 171, 197, 214],
    color: 0x355a87, accent: 0xb99858,
  },
};
export const DEFAULT_CAR = 'falcone_f42';

// Difficulty: automatic gearbox for casual; manual + engine-blow on hard.
export const DIFFICULTY = {
  casual: { name: 'Casual', autoShift: true, engineBlow: false, rivalSkill: 0.78, trafficDensity: 0.7 },
  pro:    { name: 'Pro',    autoShift: false, engineBlow: true, rivalSkill: 0.92, trafficDensity: 1.0 },
};
export const DEFAULT_DIFFICULTY = 'casual';

// CANON — point-to-point stages ending at gas stations; no laps. Core ships
// 2 themes × 2 stages. Stretch themes come from the same generator.
export const THEMES = {
  desert: {
    name: 'Mojave Run', sky: 0xf0c98a, fog: 0xe8c79a, fogDensity: 0.010,
    ground: 0xc2a36b, road: 0x33312f, line: 0xe9e2c8, scenery: 'cactus',
    sceneryColor: 0x5b7d4a, tunnels: false,
  },
  alpine: {
    name: 'Alpine Pass', sky: 0xb9c7d6, fog: 0xcdd6de, fogDensity: 0.018,
    ground: 0x6f7d5a, road: 0x3a3a3e, line: 0xf0f0e0, scenery: 'pine',
    sceneryColor: 0x2f5d3a, tunnels: true,
  },
  // --- stretch themes (same spline-extrusion generator, different params) ---
  coast: {
    name: 'Coastal Cliffs', sky: 0x8fc7e0, fog: 0xbfdcea, fogDensity: 0.012,
    ground: 0x7a9b6a, road: 0x36363a, line: 0xf0f0e0, scenery: 'palm',
    sceneryColor: 0x3f7d4a, tunnels: false,
  },
  city: {
    name: 'Night City', sky: 0x1a1d2e, fog: 0x14161f, fogDensity: 0.020,
    ground: 0x23252e, road: 0x2c2c30, line: 0xf2e9a0, scenery: 'building',
    sceneryColor: 0x3a3d52, tunnels: false,
  },
};

// CANON — the default course's stage 1 deterministically contains a radar
// trap AND the rival. Order defines the 2 themes × 2 stages core campaign.
export const COURSE = [
  { theme: 'desert', stage: 0, name: 'Mojave Run I',  lengthU: 4200, hasRadar: true,  hasRival: true,  speedLimitMph: 65 },
  { theme: 'desert', stage: 1, name: 'Mojave Run II', lengthU: 4600, hasRadar: true,  hasRival: false, speedLimitMph: 65 },
  { theme: 'alpine', stage: 0, name: 'Alpine Pass I', lengthU: 4400, hasRadar: false, hasRival: true,  speedLimitMph: 55 },
  { theme: 'alpine', stage: 1, name: 'Alpine Pass II',lengthU: 4800, hasRadar: true,  hasRival: false, speedLimitMph: 55 },
  { theme: 'coast', stage: 0, name: 'Pacific Coast', lengthU: 4400, hasRadar: true, hasRival: true, speedLimitMph: 65 },
  { theme: 'city', stage: 0, name: 'Harbor After Dark', lengthU: 4000, hasRadar: true, hasRival: true, speedLimitMph: 50 },
];

// CANON — police: fixed radar traps, escalating detector beep, one pursuer.
// HOUSE — beep range, pursuit catch model, ticket terms.
export const POLICE = {
  detectorRangeU: 900,    // detector starts beeping within this distance
  trapOverLimitMph: 8,    // > limit by this when passing a trap = triggered
  trapWindowU: 40,        // trap measures speed within this span past it
  pursuitCatchU: 14,      // pursuer within this distance = caught/ticket
  pursuitSpeedMph: 150,   // pursuer cruise speed
  pursuitStartGapU: 120,  // player's head start when the pursuit begins
  escapeAheadU: 1200,     // open this gap to shake the pursuer
  ticketBaseFine: 150,
  ticketPenaltySec: 20,   // seconds added when caught
  ticketSpeedCapMph: 50,  // rolling speed after paying the ticket
};

// Arcade road-coordinate dynamics: heading persists until the driver steers.
// Course, vehicles, and distances are metres. Displayed speed remains mph.
export const DRIVE = {
  majorCrashLimit: 5,    // cumulative hard head-on / rock impacts per campaign
  majorImpactMph: 45,    // closing speed needed to count as structural damage
  catastrophicDuration: 4.6, // leave time to see the explosion before the result screen
  mphToWorld: 0.44704,    // miles/hour to metres/second
  maxLateralAccel: 30,   // generous arcade cornering authority; drift handles tire slip
  steerRate: 12.5,        // legacy UI tuning value; steering now changes yaw
  steerResponse: 24,     // quick keyboard and controller response
  yawRate: 1.35,
  yawResponse: 22,
  roadHalfWidth: 7,       // |lateral| beyond this = off-road
  boundaryWarning: 60,
  boundaryReset: 78,     // scenery boundary resets without chassis/life damage
  laneOffset: 3.4,        // center of a lane
  brakeAccel: 34,         // mph/s braking baseline
  dragCoeff: 0.6,         // passive deceleration
  offRoadGrip: 0.74,     // enough steering authority to return from the shoulder
  offRoadScrub: 0.48,
  accelScale: 5.2,        // immediate arcade launch; falls off near redline
  gearCeilFrac: 1.04,     // throttle stops adding speed past gearMax * this
  redlineWarnFrac: 0.92,  // tach shows red from this rev fraction
  overRevFrac: 1.02,      // sustained revs above this can blow the engine (Pro)
  overRevBlowSec: 1.6,    // grace window riding the limiter before it lets go
  crashSpeedCapMph: 40,   // rolling speed after recovering from a crash
  crashGearMax: 1,        // gear index cap after recovering from a crash
  recoverySec: 1.8,       // one impact cannot consume several lives
  impactDuration: 1.7,   // visible impact and control lock, then road recovery
};

// Maximum yaw under the current conditions. Shared with the demo driver so
// its route knowledge becomes steering input rather than a physics bypass.
export function steeringYawAuthority(speedMph, grip = 1, traction = 1) {
  const rolling = Math.min(1, Math.max(0, speedMph) / 30);
  const highSpeed = 1 / (1 + Math.max(0, speedMph - 110) * 0.0022);
  const steeringLimit = DRIVE.yawRate * rolling * highSpeed * grip * traction;
  const tireLimit = DRIVE.maxLateralAccel * grip * traction / Math.max(8, speedMph * DRIVE.mphToWorld);
  return Math.min(steeringLimit, tireLimit);
}

export const BOOST = {
  drainPerSec: 0.19,
  refillPerSec: 0.028,
  nearMissRefill: 0.22,
  accelMphPerSec: 42,
  topSpeedMult: 1.12,
  minSpeedMph: 25,
};

// HOUSE — two-way traffic. Density scales spawns; fog reduces sight => the
// brief's "fog-tuned spawns".
export const TRAFFIC = {
  baseGapU: 260,          // average gap between oncoming/same-lane cars
  oncomingShare: 0.6,     // fraction of traffic in the oncoming lane
  carSpeedMph: 48,
  collideLongU: 6,        // longitudinal overlap for a collision
  collideLatU: 2.6,       // lateral overlap for a collision
  fogDensityThreshold: 0.015, // themes foggier than this spawn fewer cars
  fogSpawnMult: 0.85,     // spawn density multiplier in fog
  nearMissLatU: 4.6,
  nearMissMinMph: 65,
};

export const SCORING = {
  perStageBase: 1000,
  perSecondUnder: 12,     // bonus for beating the par time
  perLifeLeft: 500,
  parSpeedMph: 110,       // par time = stage length / this
  nearMissPoints: 150,
  comboWindowSec: 5,
  comboMax: 5,
};
