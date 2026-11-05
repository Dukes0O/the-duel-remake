// The Scablands is a world-space arena: the oval is only a stable vehicle
// frame. The named places and the dirt track are ground, not a course route.
export const SCABLANDS_PLACES = Object.freeze([
  Object.freeze({id:'tin-town',name:'Tin Town',x:600,z:0,flatRadius:86,height:0}),
  Object.freeze({id:'boneyard',name:'The Boneyard',x:424,z:304,flatRadius:94,height:1}),
  Object.freeze({id:'dead-mall',name:'The Dead Mall',x:0,z:430,flatRadius:82,height:-1}),
  Object.freeze({id:'everburn',name:'The Everburn',x:-424,z:304,flatRadius:78,height:2}),
  Object.freeze({id:'iron-line',name:'The Iron Line',x:-600,z:0,flatRadius:88,height:0}),
  Object.freeze({id:'dry-dam',name:'The Dry Dam',x:-424,z:-304,flatRadius:94,height:-3}),
  Object.freeze({id:'ships-in-sand',name:'Ships in the Sand',x:0,z:-430,flatRadius:92,height:-2}),
  Object.freeze({id:'ridge',name:'The Ridge',x:424,z:-304,flatRadius:70,height:18}),
]);

export const SCABLANDS_LAYOUT = Object.freeze({
  halfWidth:700, halfDepth:500,
  frameRadiusX:600, frameRadiusZ:430,
  roadHalfWidth:12,
  ridgeStart:.94, ridgeCrest:1.08, wallStart:1.25,
  // The arena's normal-frame bounds sit beyond the steep hillside.
  floorHalfWidth:278, wallOffset:278, outerWallOffset:278,
  floorSpeedMph:115, floorSpeedReferenceMph:200, floorSpeedExponent:.35,
  floorTraction:.92, floorScrub:.025, floorRoughness:.12,
  rampFractions:Object.freeze([]), rampLength:0, rampHeight:0,
  junk:Object.freeze([]), junkSpawnClearance:0, spawnSlots:8, spawnOffset:0,
});

export const SCABLANDS_VENUE = Object.freeze({
  id:'scablands', venue:true, layoutVersion:1, theme:'arena', stage:32,
  name:'The Scablands', lengthU:3290, closed:true, laps:1, kind:'arena',
  arena:true, scrapdome:SCABLANDS_LAYOUT,
  scablands:SCABLANDS_LAYOUT, hasRadar:false, hasRival:false,
  speedLimitMph:200,
  sections:Object.freeze([Object.freeze({theme:'arena',name:'The Scablands',share:1})]),
});
