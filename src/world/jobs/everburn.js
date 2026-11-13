// The Everburn story and Tin Town notice-board jobs. These definitions contain
// only world-job data; the shared job engine owns all simulation rules.
import {FURNACE_SKYLINE} from './furnace-sightings.js';

const place = (id, x, z, radius = 12) => Object.freeze({id, position:Object.freeze({x, y:0, z}), radius});
const path = (...places) => Object.freeze(places);
const step = (kind, fields) => Object.freeze({kind, ...fields});

// Where a job's car starts (EVERBURN-PLAY-FIXES): open ground, facing a place. src/arena/modes/world-job.js puts the car there.
const carStart = (x, z, toward) => Object.freeze({x, z, heading: Math.atan2(toward.position.x - x, toward.position.z - z)});
const yard = place('yard-gate', 0, 0), tinTown = place('tin-town', 600, 0, 18);
const boneyard = place('boneyard', 424, 304, 18), mall = place('dead-mall', 0, 430, 14);
const well = place('everburn', -424, 304, 18), safeRoad = place('safe-road', 230, 150, 16);
const wellApproach = place('everburn-well-approach', -448, 288, 8);
const wellRaidersHold = place('everburn-well-raiders-hold', -426, 303, 8);
const forge = place('cold-forge', 625, 14, 6), lamps = [
  place('forge-lamp-1', 618, 8, 3), place('forge-lamp-2', 625, 10, 3), place('forge-lamp-3', 632, 8, 3),
];

// Old Smoke's path: from the well across the open flats (leg 1, left door), through
// the Boneyard past the planes and up to Tin Town's gate (leg 2, right door), then
// home along the road with the player behind it. The last 229 m, from the place at
// (-200, 350), are leg 3 (rear door). About 3,232 m, or 3 minutes 51 seconds at the
// furnace's base pace. The gate is where the furnace is running to: if its right
// door is still unbroken when it reaches the place in front of the gate, the gate burns (old-smoke.js). The furnace does
// not drive through the gate: it stops 20 m in front of it, at (575, 82), and turns west along the outside of the fence.
const furnaceGate = place('tin-town-gate-front', 575, 82, 18);
const furnaceRunBack = place('furnace-run-3', -200, 350);
const furnacePath = path(well,
  place('furnace-flats-1', -450, 40), place('furnace-flats-2', -300, -230), place('furnace-flats-3', -60, -380),
  place('furnace-flats-4', 170, -340), place('furnace-flats-5', 350, -200), place('furnace-flats-6', 350, 60),
  place('furnace-boneyard-in', 335, 170), place('furnace-planes-1', 345, 246), place('furnace-planes-2', 440, 248),
  place('furnace-planes-3', 545, 252), place('furnace-approach', 610, 170), furnaceGate,
  place('furnace-road-1', 430, 70), safeRoad, place('furnace-road-2', 0, 230), furnaceRunBack, well);
const furnaceLegs = Object.freeze([
  Object.freeze({id:'open-flats', door:'left', fromWaypoint:0}),
  Object.freeze({id:'boneyard', door:'right', fromWaypoint:7}),
  Object.freeze({id:'run-back', door:'rear', fromWaypoint:furnacePath.indexOf(furnaceRunBack)}),
]);

export const EVERBURN_JOBS = Object.freeze([
  Object.freeze({id:'everburn-hot-delivery', storyId:'everburn', number:1, name:'Hot Delivery', kind:'delivery',
    resultLineId:'story.ember.auntie-solder.2',
    easy:Object.freeze({crashLimit:8, markerRadius:18}), lineId:'story.ember.cinder.1',
    steps:[step('carry',{what:"Carry Cinder's ember pot to Tin Town.", load:'everburn-ember-pot', origin:yard, destination:tinTown, radius:18,
      safePoints:path(safeRoad), crashLimit:8, burnable:true, spillLineId:'story.ember.cinder.4',
      barriers:path(place('ash-men-barricade-1', 180, 100), place('ash-men-barricade-2', 410, 210)),
      // Old Smoke's furnace stands on the skyline until the pot is delivered (src/world/jobs/furnace-sightings.js).
      sayNear:[{place:place('furnace-skyline', FURNACE_SKYLINE.x, FURNACE_SKYLINE.z), radius:260, lineId:'story.ember.cinder.24'},
        {place:place('ash-men-barricade-1',180,100), radius:60, lineId:'story.ember.cinder.3'},
        {place:tinTown, radius:170, lineId:'story.ember.auntie-solder.1'}],
      unlock:'tin-town', lentWeapon:'flamethrower', startLineId:'story.ember.cinder.1', afterStartLineId:['story.ember.cinder.2']})]}),
  Object.freeze({id:'everburn-get-out-and-walk', storyId:'everburn', number:2, name:'Get Out and Walk', kind:'on-foot',
    resultLineId:'story.ember.auntie-solder.4',
    easy:Object.freeze({markerRadius:3, knockedDownRecovery:'last-marker'}), lineId:'story.ember.auntie-solder.3',
    steps:[step('onfoot',{what:'Get out and light the three lamps at the cold forge.', places:lamps.map((lamp,index)=>Object.freeze({...lamp, action:'light',
      ...(index === 0 ? {lineId:'story.ember.cinder.6'} : {})})),
      radius:3, lentWeapon:'cinders-hand-flamer', requiresExit:true, returnToCar:tinTown,
      unlock:'tin-town-notice-board', startLineId:'story.ember.auntie-solder.3', afterStartLineId:['story.ember.cinder.5']})]}),
      // The car starts inside Tin Town's gate on open ground (18 m in from the gate's posts, 30 m from the town's own model),
      // facing the forge, not in the alley at the town's centre where the camera stood behind a pillar.
      carStart:carStart(582, 44, forge),
  Object.freeze({id:'everburn-run-him-down', storyId:'everburn', number:3, name:'Run Him Down', kind:'chase',
    resultLineId:'story.ember.cinder.10',
    easy:Object.freeze({targetSpeed:17, leashDistance:150, contactRadius:8}), lineId:'story.ember.auntie-solder.5',
    steps:[step('chase',{what:'Catch the thief before he escapes the Boneyard.', targetId:'ash-man-bellows-thief', actor:{id:'ash-man-bellows-thief', renderCar:'dusthawk_rally', health:20, speed:17,
      path:path(boneyard, place('plane-row',280,380), place('wing-gap',140,470))}, path:path(boneyard, place('plane-row',280,380), place('wing-gap',140,470)),
      targetSpeed:17, leashDistance:150, contactRadius:8, leashLineId:'story.ember.cinder.9',
      targetHealth:20, reward:'flamethrower', startLineId:'story.ember.auntie-solder.5',
      sayNear:[{place:place('plane-row',280,380), radius:70, lineId:'story.ember.cinder.8'}],
      // The furnace rolls away as the thief is caught; the job holds for Cinder's line (the old won line was only an id).
      closing:['story.ember.cinder.22']})]}),
  Object.freeze({id:'everburn-slow-ride', storyId:'everburn', number:4, name:'Slow Ride', kind:'escort',
    easy:Object.freeze({truckHealth:100, raiderPressure:'low', breakdownRecovery:'one-rest-then-restart'}), lineId:'story.ember.moss.1',
    // No stand-in car: the Scablands scene draws Big Bess's own truck at this actor's spot.
    steps:[step('escort',{what:'Keep Big Bess safe on the drive to Tin Town.', actorId:'big-bess', actor:{id:'big-bess', renderCar:false, escort:true, health:100, speed:9,
      path:path(boneyard, safeRoad, tinTown)}, path:path(boneyard, safeRoad, tinTown), destination:tinTown,
      speed:9, health:100, restLineId:'story.ember.moss.3', restartFrom:'last-marker', restSeconds:3, lentWeapon:'flamethrower', giveUpLineId:'story.ember.moss.10',
      // Two ambushes of 2 raiders each (1 on Easy). See src/world/jobs/steps/escort.js. The first stands on her road at
      // (278, 188), 186 m from the start (it was (360, 270), 72 m from it). The second was (500, 90), 48 m from her road,
    // What the results screen says when Big Bess is in Tin Town (EVERBURN-PLAY-FIXES): the screen's own words are a stand-in.
    resultLine:'The gas is in Tin Town and the forge is lit.',
      // out of reach of the 30 m that wears her health; it now stands on the road at (500, 41). The flamethrower is lent, as in job 1.
      ambushes:Object.freeze([Object.freeze({id:'ash-men-raid-1', place:place('ash-men-raid-1',278,188), count:2}),
        Object.freeze({id:'ash-men-raid-2', place:place('ash-men-raid-2',500,41), count:2})]),
      // The furnace paces her on the high ground while she is between 30% and 70% of her road.
      sayAtShare:[{share:.3, lineId:'story.ember.moss.4'}],
      // Moss's own start line; the job ends on Auntie Solder's result line, which it holds for as job 3 holds for Cinder's.
      reward:'scrap', startLineId:'story.ember.moss.1', closing:['story.ember.auntie-solder.6']})]}),
  Object.freeze({id:'everburn-key-under-mall', storyId:'everburn', number:5, name:'The Key Under the Mall', kind:'heist',
    resultLineId:'story.ember.old-smoke.1',
    easy:Object.freeze({lampRange:10, alarmIsFailure:false, walkSpeed:1}), lineId:'story.ember.cinder.11',
    steps:[step('heist',{what:'Find the valve key under the Dead Mall and bring it to the Everburn.',
      // The car starts on the road 150 m short of the mall, facing it (it started inside the mall's box), so that Cinder's "Leave the
      // car outside" is heard on the way in. The mall stands on the dirt road at (0, 430); the road is the oval 600 m by 430 m.
      carStart:carStart(150, 416, mall), takeId:'everburn-valve-key', zone:place('mall-valve-room',-12,430,7), carPlace:mall, carRadius:18,
      escapePlace:well, escapeRadius:18, returnPath:path(mall, safeRoad, well), walkSpeed:1,
      lamps:[place('mall-search-lamp-1',-25,420),place('mall-search-lamp-2',10,444)], coneDegrees:65,
      alarmWaveSize:2, alarmLineId:'story.ember.cinder.14', lentWeapon:'cinders-hand-flamer',
      startLineId:'story.ember.cinder.11', takenLineId:'story.ember.cinder.13',
      sayNear:[{place:place('mall-valve-room',-12,430), radius:22, lineId:'story.ember.cinder.12'}]})]}),
  Object.freeze({id:'everburn-the-everburn', storyId:'everburn', number:6, name:'The Everburn', kind:'defence-then-finish',
    resultLineId:'story.ember.hollis.1',
    easy:Object.freeze({placeHealth:120, waves:[1,2,2], furnaceHealth:3, ventRadius:2}), lineId:'story.ember.cinder.15',
    steps:[step('defend',{what:'Defend the Everburn well from the Ash Men.', origin:place('well-start', -445.2132034356, 282.7867965644), faceOriginToPlace:true, place:well, placeId:'everburn-valve', health:120, waveCount:3,
      waves:[{count:2},{count:2},{count:3}], easyWaves:[{count:1},{count:2},{count:2}],
      raiderEntry:wellApproach, raiderHold:wellRaidersHold, approachSpeed:1.5,
      refill:{place:well,crateId:'hollis-well-supply',carWeapon:'flamethrower',footAmmo:'rpg'},
      lentWeapon:'flamethrower',
      restartLineId:'story.ember.cinder.26',
      startLineId:'story.ember.cinder.15', closing:['story.ember.cinder.16']}),
      step('chase',{what:'Stop the furnace before it reaches Tin Town. Hit a door while it glows.', targetId:'old-smoke-furnace', actor:{id:'old-smoke-furnace', health:3, speed:14,
        path:furnacePath, legs:furnaceLegs, gateWaypoint:furnacePath.indexOf(furnaceGate)}, path:furnacePath, legs:furnaceLegs,
        // The chase ends on the third door hit, never on contact or distance
        // (src/world/jobs/old-smoke.js owns the rules).
        targetSpeed:14, leashDistance:Infinity, contactRadius:0, targetHealth:3, hitPart:'glowing-vent',
        requiredHits:3, lentWeapon:'flamethrower', startLineId:'story.ember.old-smoke.2', afterStartLineId:['story.ember.old-smoke.4', 'story.ember.cinder.23'],
        closing:['story.ember.cinder.20', 'story.ember.cinder.21']})],
    rewards:['cinder-crew-member','cinders-hand-flamer','ember-paint','everburn-lit']}),
]);

export const EVERBURN_SIDE_JOBS = Object.freeze([
  Object.freeze({id:'everburn-lost-prospector', name:'Lost Prospector', kind:'rescue',
    unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({seats:2, boardSeconds:1.5}),
    steps:[step('rescue',{what:'Rescue the two lost prospectors and bring them to Tin Town.', people:[place('prospector-1',400,330),place('prospector-2',448,280)], seats:2,
      boardSeconds:1.5, radius:8, stopSpeed:0.5, home:tinTown, homeRadius:18, reward:'scrap'})]}),
  Object.freeze({id:'everburn-survey-flags', name:'Survey Flags', kind:'explore',
    unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({findCount:5, markerRadius:8}),
    steps:[step('explore',{what:'Find and raise all five survey flags.', finds:[place('survey-flag-1',450,300),place('survey-flag-2',150,390),
      place('survey-flag-3',-140,260),place('survey-flag-4',280,-250),place('survey-flag-5',430,-300)]
      .map(flag=>Object.freeze({...flag})), reward:'scrap'})]}),
  Object.freeze({id:'everburn-hot-soup', name:'Hot Soup', kind:'delivery',
    unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({crashLimit:10, markerRadius:8}),
    steps:[step('carry',{what:'Carry Auntie’s hot soup from her kitchen to the notice board.', load:'hot-soup', origin:place('auntie-kitchen',615,4,4),
      destination:place('tin-town-notice-board',600,-10,8), safePoints:path(place('town-safe-corner',610,-2,6)),
      radius:8, crashLimit:10, spillLineId:'story.ember.auntie-solder.12', reward:'scrap'})]}),
]);
