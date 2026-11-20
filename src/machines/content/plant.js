// The concrete chain is data: rates, sizes and the mix are real numbers, and
// the yard layout is a list of places, so a town can place the same plant elsewhere.

/** One common general-purpose mix by mass, per cubic metre of fresh concrete. */
export const CONCRETE_MIX_KG_PER_M3 = Object.freeze({cement:350, water:175, sand:750, gravel:1_100});
export const CONCRETE_KG_PER_M3 = Object.values(CONCRETE_MIX_KG_PER_M3).reduce((sum, kg) => sum + kg, 0);

export const PLANT_CONTENT = Object.freeze({
  // A tracked jaw crusher with a grizzly screen over its feed. Dirt is screened out.
  crusher:Object.freeze({hopperCapacityKg:20_000, crushKgPerSecond:200_000 / 3_600,
    accepts:Object.freeze(['rock', 'gravel']), screens:Object.freeze(['topsoil', 'clay']),
    hopperReachM:2.2, dischargeM3PerSecond:2}),
  // Gravel leaves the jaw in parcels a quarter of a second apart.
  belt:Object.freeze({lengthM:20, speedMps:1.5, parcelSeconds:0.25}),
  // Loose crushed gravel and dry sand both weigh about 1,600 kg a cubic metre.
  looseKgPerM3:Object.freeze({gravel:1_600, sand:1_600}),
  pileReposeRadians:35 * Math.PI / 180,
  // In a pile the loader creeps at a fifth of its drive and stops with its bucket halfway in.
  loader:Object.freeze({bucketM3:2, reachM:3.6, scoopM3PerSecond:1, tipM3PerSecond:1, binsMarginM:1.2, pushForward:0.2, pushDepth:0.5}),
  // A central-mix plant at 120 cubic metres an hour.
  batch:Object.freeze({m3PerSecond:2 / 60, binsCapacityKg:30_000, chargeReachM:1.6}),
  mixer:Object.freeze({drumM3:6, pourM3PerSecond:2 / 60, chuteLengthM:1.6, chutePivotZ:-3.4,
    chuteLimit:1.2, chuteRate:0.8, chargeRpm:14, agitateRpm:3, pourRpm:-10}),
  setting:Object.freeze({setSeconds:120, freshUntil:0.5}),
});

export const PLANT_YARD = Object.freeze({
  regionId:'scablands',
  rockHeap:Object.freeze({x:-14, z:32, layers:Object.freeze([[1.2, 3], [2.2, 6], [3.2, 9]])}),
  crusher:Object.freeze({x:-30, z:20, heading:-Math.PI / 2}),
  hopper:Object.freeze({x:-27.7, z:20}),
  screenings:Object.freeze({x:-27.7, z:23.5}),
  belt:Object.freeze({from:Object.freeze({x:-33.6, z:20}), to:Object.freeze({x:-49.3, z:20})}),
  conveyors:Object.freeze([Object.freeze({node:'conveyor', x:-37.6, z:20, heading:-Math.PI / 2}),
    Object.freeze({node:'conveyor-end', x:-45.6, z:20, heading:-Math.PI / 2})]),
  gravelPile:Object.freeze({x:-51, z:20}),
  sandPile:Object.freeze({x:-50, z:6}),
  batchPlant:Object.freeze({x:-64, z:12, heading:0,
    bins:Object.freeze({minX:-7.2, maxX:5.16, minZ:-7.13, maxZ:3.31}), charge:Object.freeze({x:0, z:6.5})}),
  forms:Object.freeze([Object.freeze({id:'form-1', name:'first form', x:-44, z:36, halfM:1.59, depthM:0.28}),
    Object.freeze({id:'form-2', name:'second form', x:-37, z:36, halfM:1.59, depthM:0.28})]),
  // What the yard starts with: sand came from the shore and cement was bought.
  stock:Object.freeze({sandKg:20_000, cementKg:10_000, waterLitres:10_000}),
  loader:Object.freeze({x:-46, z:12, heading:-Math.PI / 2}),
  mixer:Object.freeze({x:-64, z:30, heading:0}),
});

/** The loader and mixer truck are machines like the others. Their parts are posed by the plant view. */
export const PLANT_MACHINES = Object.freeze({
  loader:Object.freeze({
    id:'loader', name:'Loader', driveKind:'wheels', massKg:11_000, maxSpeedMps:4,
    turnRateRadPerSecond:0.8, maxLoadKg:3_500, cabEye:Object.freeze([0,2.75,0.6]),
    joints:Object.freeze([]), tools:Object.freeze({}),
    controls:Object.freeze({drive:Object.freeze(['forward','steer']), work:Object.freeze(['scoop','tip'])}),
  }),
  mixer:Object.freeze({
    id:'mixer', name:'Mixer truck', driveKind:'wheels', massKg:12_000, maxSpeedMps:9,
    turnRateRadPerSecond:0.6, maxLoadKg:14_250, cabEye:Object.freeze([-0.6,2.9,3.2]),
    joints:Object.freeze([]), tools:Object.freeze({}),
    controls:Object.freeze({drive:Object.freeze(['forward','steer']), work:Object.freeze(['chute','pour'])}),
  }),
});
