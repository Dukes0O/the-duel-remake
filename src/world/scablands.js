// The Scablands is a world-space arena: the oval is only a stable vehicle
// frame. The named places and the dirt track are ground, not a course route.
//
// The land is 14 km by 10 km (SCABLANDS-LAND round 4). The eight places stand ten times as far from the yard at (0, 0) as
// they did on the first, small land. This table is the one place that says where a place is: the jobs, the solids, the
// scenery and the maps read a place by its id through src/world/scablands-names.js and hold only offsets from it.
export const SCABLANDS_PLACES = Object.freeze([
  Object.freeze({id:'tin-town',name:'Tin Town',x:6000,z:0,flatRadius:86,height:0}),
  Object.freeze({id:'boneyard',name:'The Boneyard',x:4240,z:3040,flatRadius:94,height:1}),
  Object.freeze({id:'dead-mall',name:'The Dead Mall',x:0,z:4300,flatRadius:82,height:-1}),
  Object.freeze({id:'everburn',name:'The Everburn',x:-4240,z:3040,flatRadius:78,height:2}),
  Object.freeze({id:'iron-line',name:'The Iron Line',x:-6000,z:0,flatRadius:88,height:0}),
  Object.freeze({id:'dry-dam',name:'The Dry Dam',x:-4240,z:-3040,flatRadius:94,height:-3}),
  Object.freeze({id:'ships-in-sand',name:'Ships in the Sand',x:0,z:-4300,flatRadius:92,height:-2}),
  Object.freeze({id:'ridge',name:'The Ridge',x:4240,z:-3040,flatRadius:70,height:18}),
]);

export const SCABLANDS_LAYOUT = Object.freeze({
  halfWidth:7000, halfDepth:5000,
  // The ridge and the wall keep the shape they had on the old 700 by 500 land, in metres, and stand at the new edge: the
  // fractions below are of that old land, and `edgeScale` (new half width over old) turns a distance past the new edge
  // into the same distance past the old one.
  edgeScale:10,
  // The dirt ring round the yard (the frame the car's position is kept against; see SCABLANDS_VENUE).
  frameRadiusX:600, frameRadiusZ:430,
  roadHalfWidth:36,
  ridgeStart:.94, ridgeCrest:1.08, wallStart:1.25,
  // A car may be anywhere on the land, 8,050 m from the oval at the furthest corner; the ridge is the driving limit.
  floorHalfWidth:9000, wallOffset:9000, outerWallOffset:9000,
  floorSpeedMph:115, floorSpeedReferenceMph:200, floorSpeedExponent:.35,
  floorTraction:.92, floorScrub:.025, floorRoughness:.12,
  rampFractions:Object.freeze([]), rampLength:0, rampHeight:0,
  junk:Object.freeze([]), junkSpawnClearance:0, spawnSlots:8, spawnOffset:0,
});

// `lengthU` is a whole number of the course's 8 m steps (411 of them). At 3,290 the last step of the frame was 2 m long but was
// read as 8 m, which put a car far from the oval and near the east axis off by up to 22 m (docs/changes/SCABLANDS-LAND.md,
// "Round 4 slice 1", stage A).
// The realism trial's light and air (SCABLANDS-LAND, "Kyle on realism", step 1; switch `scablands-realism`). A late-afternoon desert:
// - the sun stands 25 degrees up in the south-south-west, so a car driving east is lit from behind its right shoulder and every
//   thing throws a long shadow across the road;
// - sunlight is about seven times the light from the sky (it was little more than the same), so the shadow side of a thing is dark;
// - the haze starts at the car and thickens evenly to the far edge of what the camera sees, in the colour of the sky's horizon,
//   so the land fades into the sky with no line between them;
// - shadows reach 100 m from a point 45 m ahead of the car (they stopped at 45 m). The sun's light starts 320 m from that point,
//   so that ground on the sunward edge of the shadow box lies 100 m inside it and a hill there still throws its shadow.
export const SCABLANDS_LIGHT = Object.freeze({
  sunOffset:Object.freeze({x:-144,y:134,z:253}), sunColor:0xffdcae, sun:5.4, hemi:.72, env:.6, ground:0x8a6748,
  top:'#2c63a8', horizon:'#ddd3c1', fog:0xddd3c1, fogNear:20, fogFar:2500, exposure:1.22, bloom:.2,
  sunStrength:1, cloudCover:.3, cloudTint:Object.freeze([1,.94,.84]),
  shadowReach:100, shadowAhead:45, shadowFar:560,
});

export const SCABLANDS_VENUE = Object.freeze({
  trialLight:SCABLANDS_LIGHT,
  id:'scablands', venue:true, layoutVersion:1, theme:'arena', stage:32,
  name:'The Scablands', lengthU:3288, closed:true, laps:1, kind:'arena',
  arena:true, townGate:Object.freeze({id:'scrapdome-gate',x:0,z:-92,radius:32,
    prompt:'Drive up to the Scrapdome gate to go inside.'}), scrapdome:SCABLANDS_LAYOUT,
  scablands:SCABLANDS_LAYOUT, hasRadar:false, hasRival:false,
  speedLimitMph:200,
  sections:Object.freeze([Object.freeze({theme:'arena',name:'The Scablands',share:1})]),
});
