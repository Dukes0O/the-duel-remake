// config.js — The Duel canon. CANON = fixed by the build brief; HOUSE =
// plausible arcade values invented to fill gaps, frozen here.
import { EXPANSION_COURSES } from './expansion-courses.js';
import { FREESTYLE_COURSE } from './freestyle-course.js';
import { applyCircuits } from './circuits/index.js';
import { featureFlags } from './feature-flags.js';

// Five crash slots; a stage win restores up to two, never above the starting reserve.
export const LIVES = {
  start: 5,
  crashPenaltySec: 30,
  crashLifeCost: 1,
  stageWinRepair: 2,
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
  falcone_heritage: {
    name: 'Falcone Heritage', price: 1800, homage: 'Earlier Falcone F42 body', gearbox: 'manual',
    topSpeed: 201, accel: 7.6, grip: 0.82, braking: 0.90,
    gears: [55, 95, 135, 172, 201],
    color: 0xc81d11, accent: 0xf2c200,
  },
  aurora_gt: {
    name: 'Aurora GTR', price:2200, homage: 'Carbon GT package', gearbox: 'manual',
    topSpeed: 214, accel: 8.1, grip: 1.01, braking: 1.06,
    gears: [56, 96, 136, 171, 197, 214],
    color: 0x355a87, accent: 0xb99858,
  },
  dusthawk_rally: {
    name:'Dusthawk Rally', homage:'All-terrain rally hatch', gearbox:'manual',
    topSpeed:184,accel:8.5,grip:1.05,braking:1.1,gears:[49,83,118,151,174,184],
    color:0xe5e5d7,accent:0x287657,price:3500,offRoadGrip:.96,offRoadSpeed:125,offRoadScrub:.20,mass:1280,
    collision:{halfWidth:1.05,halfLength:2.1},height:1.68,kind:'rally',
  },
  banshee_muscle: {
    name:'Banshee Muscle',homage:'Supercharged torque coupe',gearbox:'manual',
    topSpeed:209,accel:9.3,grip:.86,braking:.98,gears:[59,103,145,181,209],
    color:0xcb571c,accent:0x20242a,price:5000,offRoadGrip:.72,offRoadSpeed:76,offRoadScrub:.38,mass:1810,
    collision:{halfWidth:1.13,halfLength:2.55},height:1.47,kind:'muscle',
  },
  viper_proto: {
    name:'Viper Prototype',homage:'Lightweight circuit prototype',gearbox:'manual',
    topSpeed:232,accel:8.8,grip:1.13,braking:1.24,gears:[60,104,145,179,210,232],
    color:0xeeeeea,accent:0x187cb9,price:7500,offRoadGrip:.6,offRoadSpeed:52,offRoadScrub:.62,mass:940,
    collision:{halfWidth:1.1,halfLength:2.45},height:1.1,kind:'prototype',
  },
  titan_monster: {
    name:'Titan Monster',homage:'Stadium monster truck',gearbox:'manual',
    topSpeed:116,accel:8.6,grip:.91,braking:1.08,gears:[35,61,87,105,116],
    color:0x58329b,accent:0xb5db3b,price:12000,offRoadGrip:1.05,offRoadSpeed:108,offRoadScrub:.12,mass:4700,
    collision:{halfWidth:1.4,halfLength:2.6},height:3.6,kind:'monster',lowSpeedSteer:true,
  },
  koenigsegg_jesko: {
    name:'Koenigsegg Jesko Absolut',homage:'Jesko Absolut-inspired hypercar',gearbox:'manual',
    unlockRequirement:'max-all-other-cars',factoryMaxed:true,
    // Arcade base tuning: the included level-three upgrades apply exactly once.
    topSpeed:298,accel:9.9,grip:1.12,braking:1.5,
    gears:[60,105,150,188,221,247,269,284,298],
    color:0xe7e9e7,accent:0x27c8bb,offRoadGrip:.64,offRoadSpeed:65,offRoadScrub:.48,mass:1390,
    collision:{halfWidth:1.05,halfLength:2.475},height:1.25,kind:'hypercar',
    boostCapacity:1.4,nitroAcceleration:1.4,nitroSpeedBonus:.025,
  },
  // Earned car 1 (EARN-CAR-1, docs/EARNED_CARS.md section 4): a medal car, never
  // bought. Base figures; the factory tuning applies on top, so the tuned top
  // speed is 197 x 1.105, about 218 mph.
  ferrari_enzo: {
    name:'Ferrari Enzo',homage:'Enzo-inspired V12 hypercar',gearbox:'manual',
    unlockRequirement:{kind:'medals',medals:6},factoryMaxed:true,
    topSpeed:197,accel:9.4,grip:1.08,braking:1.18,gears:[58,100,138,168,186,197],
    color:0xb3121a,accent:0x16181b,offRoadGrip:.62,offRoadSpeed:58,offRoadScrub:.56,mass:1365,
    collision:{halfWidth:1.02,halfLength:2.35},height:1.15,kind:'hypercar',
  },
  // Earned car 2: light, naturally aspirated road car; factory tuning adds
  // to these approved base figures for a fully tuned top speed of 240 mph.
  mclaren_f1: {
    name:'McLaren F1',homage:'F1-inspired three-seat V12 road car',gearbox:'manual',
    unlockRequirement:{kind:'medals',medals:12},factoryMaxed:true,
    topSpeed:217.2,accel:9.1,grip:1.02,braking:1.16,gears:[58,98,134,169,197,217.2],
    color:0xb8bdc2,accent:0x202329,offRoadGrip:.63,offRoadSpeed:60,offRoadScrub:.54,mass:1140,
    collision:{halfWidth:1,halfLength:2.14},height:1.14,kind:'hypercar',
  },
  // Earned car 3 (EARN-CAR-3, docs/EARNED_CARS.md section 4): a medal car,
  // never bought, earned at 24 medals with 6 gold. Base figures; the factory
  // tuning applies on top, so the tuned top speed is 278 x 1.105, about 307
  // mph, below the Jesko's. Height is the body's; the wing stands above it.
  bugatti_bolide: {
    name:'Bugatti Bolide',homage:'Bolide-inspired track hypercar',gearbox:'manual',
    unlockRequirement:{kind:'medals',medals:24,gold:6},factoryMaxed:true,
    topSpeed:278,accel:9.5,grip:1.15,braking:1.45,gears:[67,110,154,191,225,255,278],
    color:0x1f4fa8,accent:0x111316,offRoadGrip:.58,offRoadSpeed:50,offRoadScrub:.64,mass:1450,
    collision:{halfWidth:1.05,halfLength:2.5},height:1.05,kind:'hypercar',
    boostCapacity:1.35,nitroAcceleration:1.35,nitroSpeedBonus:.025,
  },
  // The Falcone Sirena (SIRENA-CAR, docs/THE_DEEP.md 6.1 and 12): the 1966 Coast Cup racer raised from the
  // Kelp Coast. The Viper Prototype's figures with top speed and acceleration 8% lower, grip equal, braking 10%
  // lower, about 800 kg (810: the arena's 40 mph junk-shove guard needs the hulk to move 2 m and 800 moves it 1.976). Never bought: it is owned only once the Lab restores it and adds it to `unlockedCars`.
  falcone_sirena: {
    name:'Falcone Sirena',homage:'1966 sports-racing coupe',gearbox:'manual',
    unlockRequirement:'sirena-restored',
    topSpeed:213.44,accel:8.096,grip:1.13,braking:1.116,gears:[55.2,95.68,133.4,164.68,193.2,213.44],
    color:0x9c1217,accent:0xf1ede2,offRoadGrip:.6,offRoadSpeed:52,offRoadScrub:.62,mass:810,
    collision:{halfWidth:1.1,halfLength:2.45},height:1.06,kind:'prototype',
  },
  // LAB-FAN: built on the fan bench, never bought from the garage.
  mcmurtry_speirling: {
    name: 'McMurtry Spéirling', homage: 'Electric fan car', gearbox: 'single', electric: true,
    unlockRequirement: 'lab-built', factoryMaxed: true,
    topSpeed: 190, accel: 9, grip: 1, fanGrip: 1, braking: 2.2, gears: [190],
    color: 0x527080, accent: 0xf1f3f5, mass: 1000,
    offRoadGrip: .6, offRoadSpeed: 52, offRoadScrub: .62,
    collision: {halfWidth: .805, halfLength: 1.602}, height: 1.142, kind: 'prototype',
  },
  // Handling preview only. V6 adds the shop price and the finished body.
  ...(featureFlags.enabled('nissan-skyline') ? {
    nissan_skyline_gtr_r34: {
      name: 'Nissan Skyline GT-R R34', homage: 'R34-inspired twin-turbo all-wheel-drive coupe', gearbox: 'manual',
      topSpeed: 205, accel: 8.4, grip: 1.08, braking: 1.12,
      gears: [55, 95, 133, 167, 190, 205],
      color: 0x1b3d8c, accent: 0xc7ccd1,
      offRoadGrip: .90, offRoadSpeed: 105, offRoadScrub: .26, mass: 1560,
      collision: {halfWidth: 1.0, halfLength: 2.30}, height: 1.37,
      awd: true, excludeFromCompletion: true,
    },
  } : {}),
};
export const DEFAULT_CAR = 'falcone_f42';

// Difficulty: automatic gearbox for casual; manual + engine-blow on hard.
export const DIFFICULTY = {
  casual: { name: 'Casual', autoShift: true, engineBlow: false, rivalSkill: 0.78, trafficDensity: 0.7 },
  pro:    { name: 'Pro',    autoShift: false, engineBlow: true, rivalSkill: 0.92, trafficDensity: 1.0 },
};
// launch: the CPU's pull-away strength as a multiple of the player's DRIVE.accelScale. FIX-LAUNCH
// slowed the player's launch; Medium and Hard are acceleration-limited and fell behind, so they keep more.
export const CPU_DIFFICULTY = {
  easy:{name:'Easy',skill:.73,cornerSkill:.78,winReward:600,launch:1},
  medium:{name:'Medium',skill:.88,cornerSkill:.91,winReward:1000,launch:1.3},
  hard:{name:'Hard',skill:1.02,cornerSkill:1,winReward:1500,launch:1.6},
};
export const DEFAULT_CPU_DIFFICULTY='easy';
export const DEFAULT_DIFFICULTY = 'casual';

// Scenery sections share the same continuous circuit and terrain sampler.
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
  arena:{name:'Titan Stadium',sky:0x6c84a4,fog:0x8594a4,fogDensity:.008,ground:0x9b7450,road:0x715742,line:0xf0dfbd,scenery:'stadium',sceneryColor:0x738184,tunnels:false},
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

// Three two-lap campaign circuits, followed by garage-gated standalone events.
export const COURSE = applyCircuits([
  {id:'pacific-canyon',layout:'canyon',layoutVersion:4,theme:'desert',stage:0,name:'Pacific Canyon Circuit',lengthU:4000,closed:true,laps:2,hasRadar:true,hasRival:true,speedLimitMph:65,sections:[{theme:'desert',name:'Mojave Canyon',share:.52},{theme:'coast',name:'Pacific Coast',share:.48}]},
  {id:'high-country',layout:'highland',layoutVersion:4,theme:'alpine',stage:1,name:'High Country Grand Tour',lengthU:4800,closed:true,laps:2,hasRadar:false,hasRival:true,speedLimitMph:65,sections:[{theme:'desert',name:'Canyon Ascent',share:.26},{theme:'alpine',name:'Alpine Summit',share:.48},{theme:'coast',name:'Coastal Descent',share:.26}]},
  {id:'harbor-highlands',layout:'harbor',layoutVersion:4,timeOfDay:'night',theme:'city',stage:2,name:'Harbor & Highlands',lengthU:4400,closed:true,laps:2,hasRadar:true,hasRival:true,speedLimitMph:60,sections:[{theme:'city',name:'Harbor District',share:.34},{theme:'alpine',name:'Moonlight Pass',share:.36},{theme:'coast',name:'Coast Road',share:.30}]},
  {id:'titan-arena',layoutVersion:2,theme:'arena',stage:3,name:'Titan Monster Arena',lengthU:1120,closed:true,laps:2,kind:'arena',arena:true,requiredCar:'titan_monster',hasRadar:false,hasRival:true,speedLimitMph:100,sections:[{theme:'arena',name:'Titan Stadium',share:1}]},
  {id:'midnight-chase',timeOfDay:'night',theme:'city',stage:4,name:'Midnight Muscle Chase',lengthU:2880,closed:true,laps:2,kind:'chase',requiredCar:'banshee_muscle',persistentVehicle:true,hasRadar:false,hasRival:false,speedLimitMph:65,chaseTimeLimit:{easy:205,medium:175,hard:150},chaseCrashPenaltySec:8,chaseCatchPenaltySec:12,sections:[{theme:'city',name:'Old Harbor',share:.5},{theme:'city',name:'Neon Exchange',share:.5}]},
  {id:'ridge-rally',layout:'ridge',layoutVersion:4,theme:'alpine',stage:5,name:'Ridge Rally',lengthU:3520,closed:true,laps:2,kind:'rally',offroad:true,requiredCar:'dusthawk_rally',hasRadar:false,hasRival:true,speedLimitMph:100,sections:[{theme:'desert',name:'Dry Creek Trail',share:.42},{theme:'alpine',name:'Timberline Ridge',share:.58}]},
  {id:'titan-stunt-trial',layoutVersion:1,theme:'arena',stage:6,name:'Titan Stunt Trial',lengthU:1120,closed:true,laps:2,kind:'arena',arena:true,requiredCar:'titan_monster',hasRadar:false,hasRival:false,speedLimitMph:100,stuntTrial:{jumps:4,crushes:4,timeLimitSec:{easy:95,medium:75,hard:62}},sections:[{theme:'arena',name:'Titan Stunt Trial',share:1}]},
  {id:'neon-drift-trial',layout:'city',layoutVersion:1,timeOfDay:'night',theme:'city',stage:7,name:'Neon Drift Trial',lengthU:2880,closed:true,laps:2,kind:'drift',requiredCar:'banshee_muscle',persistentVehicle:true,crashPenaltySec:8,hasRadar:false,hasRival:false,speedLimitMph:65,driftTrial:{targets:{easy:3500,medium:5000,hard:6000},timeLimitSec:{easy:150,medium:125,hard:110}},sections:[{theme:'city',name:'Neon District',share:.5},{theme:'city',name:'Harbor Slide',share:.5}]},
  {id:'timberline-rush',layout:'timberline',layoutSeed:1989,layoutVersion:2,theme:'alpine',stage:8,name:'Timberline Checkpoint Rush',lengthU:3800,closed:true,laps:2,kind:'checkpoint',offroad:true,requiredCar:'dusthawk_rally',hasRadar:false,hasRival:false,speedLimitMph:100,checkpointRush:{gatesPerLap:6,initialTimeSec:{easy:40,medium:34,hard:30},extensionSec:{easy:12,medium:8,hard:7}},sections:[{theme:'desert',name:'Dry Creek',share:.35},{theme:'alpine',name:'Timberline Summit',share:.65}]},
  ...EXPANSION_COURSES,
  FREESTYLE_COURSE,
  // The registry appends new events and replaces explicitly slotted ids.
]);

// CANON — police: fixed radar traps, escalating detector beep, one pursuer.
// HOUSE — beep range, pursuit catch model, ticket terms.
export const POLICE = {
  detectorRangeU: 900,    // detector starts beeping within this distance
  trapOverLimitMph: 8,    // > limit by this when passing a trap = triggered
  trapWindowU: 40,        // trap measures speed within this span past it
  pursuitCatchU: 14,      // pursuer within this distance = caught/ticket
  pursuitSpeedMph: 150,   // pursuer cruise speed
  chasePaceBase: .34,     // chase pursuer cruise = top speed x (this + .15 x CPU skill); was .42 before FIX-LAUNCH slowed the player's laps by about a fifth
  pursuitStartGapU: 120,  // player's head start when the pursuit begins
  escapeAheadU: 1200,     // open this gap to shake the pursuer
  ticketBaseFine: 150,
  ticketPenaltySec: 20,   // seconds added when caught
  ticketSpeedCapMph: 50,  // rolling speed after paying the ticket
};

// Shared by paved shoulder drawing and ordinary lap validation. The shoulder
// remains rough ground; crossing it does not mean skipping the course.
export const ROAD_SHOULDER_WIDTH = 1.25;

// Arcade road-coordinate dynamics: heading persists until the driver steers.
// Course, vehicles, and distances are metres. Dynamics keep mph; the UI shows km/h.
export const DRIVE = {
  majorCrashLimit: 5,    // unrepaired hard impacts; stage wins repair up to two
  majorImpactMph: 45,    // closing speed needed to count as structural damage
  catastrophicDuration: 4.6, // leave time to see the explosion before the result screen
  mphToWorld: 0.44704,    // miles/hour to metres/second
  maxLateralAccel: 30,   // generous arcade cornering authority; drift handles tire slip
  steerRate: 12.5,        // legacy UI tuning value; steering now changes yaw
  steerResponse: 24,     // quick keyboard and controller response
  yawRate: 1.35,
  arenaSteeringFactor: 2, // Raise both physical limits only on a real arena floor.
  arenaRollingFloor: .85, // Preserve turn authority through 15–50 mph.
  arenaRollingSpeedMph: 15, // Approach the floor continuously from standstill.
  arenaMaxYawRate: 150 * Math.PI / 180, // Bound stock and upgraded full-lock turns.
  yawResponse: 22,
  roadHalfWidth: 7,       // |lateral| beyond this = off-road
  boundaryWarning: 60,
  boundaryReset: 78,     // scenery boundary resets without chassis/life damage
  laneOffset: 3.4,        // center of a lane
  brakeAccel: 52,         // mph/s braking baseline
  reverseMaxMph: 22,     // low-speed manoeuvring, unaffected by engine upgrades
  reverseAccel: 14,      // mph/s while holding brake after stopping
  reverseHoldSec: .25,   // deliberate hold at rest before reverse engages
  dragCoeff: 0.6,         // passive deceleration
  offRoadGrip: 0.74,     // enough steering authority to return from the shoulder
  offRoadScrub: 0.48,
  accelScale: 2.5,        // gentler launch (FIX-LAUNCH); falls off near redline
  arenaAccelScale: 5.2,   // arenas keep the old quick launch: their jumps, shoves and balance were tuned on it
  recoveryAccelScale: 5.2, // after a crash recovery the car pulls away with the old launch (crashLaunchSec or 60 mph)
  crashLaunchSec: 3,      // how long that quick pull-away may last
  // FUN-TITAN-LAUNCH: the Titan drives up onto a car it flattens and the car is a ramp. Launch speed in m/s is
  // mph x climbMps, capped; the game's jump gravity is 18 m/s2, so 30 mph gives about 3.2 m and 1.2 s of air.
  titanCarRamp: Object.freeze({ minMph: 15, climbMps: .36, maxMps: 16 }),
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
export function steeringYawAuthority(speedMph, grip = 1, traction = 1, car = null, course = null) {
  // A race styled as an arena is still a road race. Require the real venue
  // identity before changing either physical limit or the low-speed curve.
  const arena = course?.def?.venue === true && course.def.arena === true;
  const factor = arena ? DRIVE.arenaSteeringFactor : 1;
  const assisted = car?.lowSpeedSteer === true;
  const rolling = Math.min(1, arena
    ? Math.max(Math.max(0, speedMph) / 30, DRIVE.arenaRollingFloor *
      Math.min(1, Math.max(0, speedMph) / DRIVE.arenaRollingSpeedMph))
    : assisted && speedMph > 3 ? Math.max(speedMph / 30, .55) : Math.max(0, speedMph) / 30);
  const steeringGrip = assisted && speedMph < 45 ? Math.max(grip, 1) : grip;
  const highSpeed = 1 / (1 + Math.max(0, speedMph - 110) * 0.0022);
  const steeringLimit = DRIVE.yawRate * rolling * highSpeed * steeringGrip * traction * factor;
  const tireLimit = (DRIVE.maxLateralAccel * steeringGrip * traction / Math.max(8, speedMph * DRIVE.mphToWorld)) * factor;
  const authority = Math.min(steeringLimit, tireLimit);
  return arena ? Math.min(authority, DRIVE.arenaMaxYawRate) : authority;
}

// TYRE-SLIP's reviewed road-tyre model. These pure helpers are wired only by
// the race-latched dev rules; the released authority function above stays exact.
export const TYRE_SLIP = Object.freeze({
  driftAsk: 1.12,
  driftLineSkill: .95,
  driftMinMph: 56,
  driftAskLow: 1.10,
  driftLiftSlip: 1.20,
  driftRecoveryMeters: 2,
  // The Neon Drift Trial under the sliding-tyre rules keeps the old quick launch, as arenas do (TYRE-SLIP-DRIFT-RETUNE):
  // the drift line, scrub and chain thresholds above were tuned on it. It lives here, not in DRIVE, so DRIVE stays byte for byte.
  driftTrialAccelScale: 5.2,
  headroom: 1.25, width: .25, brakeUse: .6, riseRate: 12, fallRate: 8,
  minSpeedMph: 15, minWorldSpeed: 8, quietSlip: .9, soundWidth: .35,
  angleAtQuiet: .045, angleAtPeak: .075,
  maxAngle: Object.freeze({road: .21, gravel: .25, offroad: .31}),
  casual: Object.freeze({slideGrip: .9, scrubMphPerSec: 8}),
  pro: Object.freeze({slideGrip: .82, scrubMphPerSec: 14}),
});
export const tyreClamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export function steeringGrip(speedMph, grip = 1, car = null) {
  return car?.lowSpeedSteer === true && speedMph < 45 ? Math.max(grip, 1) : grip;
}
export function tyreSlipGrip(slip, difficulty = 'casual') {
  const rule = difficulty === 'pro' ? TYRE_SLIP.pro : TYRE_SLIP.casual;
  return 1 - (1 - rule.slideGrip) * tyreClamp((slip - 1) / TYRE_SLIP.width);
}
export function tyreSlipScrub(slip, difficulty = 'casual') {
  const rule = difficulty === 'pro' ? TYRE_SLIP.pro : TYRE_SLIP.casual;
  return rule.scrubMphPerSec * tyreClamp((slip - 1) / TYRE_SLIP.width);
}
export function tyreSlipSteering({speedMph, grip = 1, traction = 1, car = null, brake = 0}) {
  const assisted = car?.lowSpeedSteer === true;
  const rolling = Math.min(1, assisted && speedMph > 3 ? Math.max(speedMph / 30, .55) : Math.max(0, speedMph) / 30);
  const effectiveGrip = steeringGrip(speedMph, grip, car);
  const highSpeed = 1 / (1 + Math.max(0, speedMph - 110) * .0022);
  const steeringLimit = DRIVE.yawRate * rolling * highSpeed * effectiveGrip * traction;
  const unbrakedPeak = DRIVE.maxLateralAccel * effectiveGrip * traction / Math.max(TYRE_SLIP.minWorldSpeed, speedMph * DRIVE.mphToWorld);
  const brakeShare = Math.sqrt(1 - (TYRE_SLIP.brakeUse * tyreClamp(brake)) ** 2);
  return {peakYaw: unbrakedPeak * brakeShare, steerGain: Math.min(steeringLimit, TYRE_SLIP.headroom * unbrakedPeak)};
}
export function stepTyreSlip(slip, ask, dt, {reversing = false, airborne = false, knock = false, speedMph = Infinity} = {}) {
  const target = reversing || airborne || knock || speedMph < TYRE_SLIP.minSpeedMph ? 0 : Math.max(0, ask);
  const rate = target > slip ? TYRE_SLIP.riseRate : TYRE_SLIP.fallRate;
  return slip + (target - slip) * (1 - Math.exp(-rate * dt));
}
export function tyreSlipAngle(slip, steerVisual, surface = 'road') {
  const maximum = TYRE_SLIP.maxAngle[surface] ?? TYRE_SLIP.maxAngle.road;
  const amount = slip <= TYRE_SLIP.quietSlip ? TYRE_SLIP.angleAtQuiet * tyreClamp(slip / TYRE_SLIP.quietSlip)
    : slip <= 1 ? TYRE_SLIP.angleAtQuiet + (TYRE_SLIP.angleAtPeak - TYRE_SLIP.angleAtQuiet) * (slip - TYRE_SLIP.quietSlip) / (1 - TYRE_SLIP.quietSlip)
    : TYRE_SLIP.angleAtPeak + (maximum - TYRE_SLIP.angleAtPeak) * tyreClamp((slip - 1) / TYRE_SLIP.width);
  return -Math.sign(steerVisual) * amount;
}
export function tyreSlipRawSound(slip) {
  return tyreClamp((slip - TYRE_SLIP.quietSlip) / TYRE_SLIP.soundWidth);
}
export function steerForYaw(desiredYaw, {speedMph, grip = 1, traction = 1, car = null, course = null, brake = 0, tyreSlip = false}) {
  if (tyreSlip !== true || course?.def?.arena === true)
    return tyreClamp(-desiredYaw / Math.max(.05, steeringYawAuthority(speedMph, grip, traction, car, course)), -1, 1);
  const {peakYaw, steerGain} = tyreSlipSteering({speedMph, grip, traction, car, brake});
  return tyreClamp(-tyreClamp(desiredYaw, -peakYaw, peakYaw) / Math.max(.05, steerGain), -1, 1);
}

// Launch strength for the course being driven: arenas keep their old value.
export const launchScale = (course, recovering = false, slipRules = false) => course?.def?.arena === true ? DRIVE.arenaAccelScale
  : slipRules === true && course?.def?.kind === 'drift' ? TYRE_SLIP.driftTrialAccelScale
  : recovering ? DRIVE.recoveryAccelScale : DRIVE.accelScale;
export const boostLaunch = course => course?.def?.arena === true ? BOOST.arenaAccelMphPerSec : BOOST.accelMphPerSec;

export const BOOST = {
  drainPerSec: 0.19,
  refillPerSec: 0.028,
  nearMissRefill: 0.22,
  accelMphPerSec: 20.2,
  arenaAccelMphPerSec: 42, // nitro push on an arena floor, the old value
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
  nearMissLatU: 6.4,     // reward a close pass, not a full lane-centre separation
  nearMissMinMph: 65,
};

export const SCORING = {
  perStageBase: 1000,
  perSecondUnder: 12,     // bonus for beating the par time
  perLifeLeft: 500,
  parSpeedMph: 110,       // par time = stage length / this
  nearMissPoints: 150,
  policeEscapePoints: 500,
  manualMultiplier: 2,
  comboWindowSec: 5,
  comboMax: 5,
};
