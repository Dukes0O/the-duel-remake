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
    collision:{halfWidth:1.4,halfLength:2.6},height:3.6,kind:'monster',
  },
};
export const DEFAULT_CAR = 'falcone_f42';

// Difficulty: automatic gearbox for casual; manual + engine-blow on hard.
export const DIFFICULTY = {
  casual: { name: 'Casual', autoShift: true, engineBlow: false, rivalSkill: 0.78, trafficDensity: 0.7 },
  pro:    { name: 'Pro',    autoShift: false, engineBlow: true, rivalSkill: 0.92, trafficDensity: 1.0 },
};
export const CPU_DIFFICULTY = {
  easy:{name:'Easy',skill:.73,cornerSkill:.78,winReward:600},
  medium:{name:'Medium',skill:.88,cornerSkill:.91,winReward:1000},
  hard:{name:'Hard',skill:1.02,cornerSkill:1,winReward:1500},
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
export const COURSE = [
  {id:'pacific-canyon',layout:'canyon',layoutVersion:3,theme:'desert',stage:0,name:'Pacific Canyon Circuit',lengthU:4000,closed:true,laps:2,hasRadar:true,hasRival:true,speedLimitMph:65,sections:[{theme:'desert',name:'Mojave Canyon',share:.52},{theme:'coast',name:'Pacific Coast',share:.48}]},
  {id:'high-country',layout:'highland',layoutVersion:3,theme:'alpine',stage:1,name:'High Country Grand Tour',lengthU:4800,closed:true,laps:2,hasRadar:false,hasRival:true,speedLimitMph:65,sections:[{theme:'desert',name:'Canyon Ascent',share:.26},{theme:'alpine',name:'Alpine Summit',share:.48},{theme:'coast',name:'Coastal Descent',share:.26}]},
  {id:'harbor-highlands',layout:'harbor',layoutVersion:3,timeOfDay:'night',theme:'city',stage:2,name:'Harbor & Highlands',lengthU:4400,closed:true,laps:2,hasRadar:true,hasRival:true,speedLimitMph:60,sections:[{theme:'city',name:'Harbor District',share:.34},{theme:'alpine',name:'Moonlight Pass',share:.36},{theme:'coast',name:'Coast Road',share:.30}]},
  {id:'titan-arena',layoutVersion:2,theme:'arena',stage:3,name:'Titan Monster Arena',lengthU:1120,closed:true,laps:2,kind:'arena',arena:true,requiredCar:'titan_monster',hasRadar:false,hasRival:true,speedLimitMph:100,sections:[{theme:'arena',name:'Titan Stadium',share:1}]},
  {id:'midnight-chase',timeOfDay:'night',theme:'city',stage:4,name:'Midnight Muscle Chase',lengthU:2880,closed:true,laps:2,kind:'chase',requiredCar:'banshee_muscle',persistentVehicle:true,hasRadar:false,hasRival:false,speedLimitMph:65,chaseTimeLimit:{easy:205,medium:175,hard:150},chaseCrashPenaltySec:8,chaseCatchPenaltySec:12,sections:[{theme:'city',name:'Old Harbor',share:.5},{theme:'city',name:'Neon Exchange',share:.5}]},
  {id:'ridge-rally',layout:'ridge',layoutVersion:3,theme:'alpine',stage:5,name:'Ridge Rally',lengthU:3520,closed:true,laps:2,kind:'rally',offroad:true,requiredCar:'dusthawk_rally',hasRadar:false,hasRival:true,speedLimitMph:100,sections:[{theme:'desert',name:'Dry Creek Trail',share:.42},{theme:'alpine',name:'Timberline Ridge',share:.58}]},
  {id:'titan-stunt-trial',layoutVersion:1,theme:'arena',stage:6,name:'Titan Stunt Trial',lengthU:1120,closed:true,laps:2,kind:'arena',arena:true,requiredCar:'titan_monster',hasRadar:false,hasRival:false,speedLimitMph:100,stuntTrial:{jumps:4,crushes:4,timeLimitSec:{easy:95,medium:75,hard:62}},sections:[{theme:'arena',name:'Titan Stunt Trial',share:1}]},
  {id:'neon-drift-trial',layout:'city',layoutVersion:1,timeOfDay:'night',theme:'city',stage:7,name:'Neon Drift Trial',lengthU:2880,closed:true,laps:2,kind:'drift',requiredCar:'banshee_muscle',persistentVehicle:true,crashPenaltySec:8,hasRadar:false,hasRival:false,speedLimitMph:65,driftTrial:{targets:{easy:3500,medium:5000,hard:6000},timeLimitSec:{easy:150,medium:125,hard:110}},sections:[{theme:'city',name:'Neon District',share:.5},{theme:'city',name:'Harbor Slide',share:.5}]},
  {id:'timberline-rush',layout:'timberline',layoutSeed:1989,layoutVersion:2,theme:'alpine',stage:8,name:'Timberline Checkpoint Rush',lengthU:3800,closed:true,laps:2,kind:'checkpoint',offroad:true,requiredCar:'dusthawk_rally',hasRadar:false,hasRival:false,speedLimitMph:100,checkpointRush:{gatesPerLap:6,initialTimeSec:{easy:40,medium:34,hard:30},extensionSec:{easy:10,medium:8,hard:7}},sections:[{theme:'desert',name:'Dry Creek',share:.35},{theme:'alpine',name:'Timberline Summit',share:.65}]},
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
  brakeAccel: 52,         // mph/s braking baseline
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
