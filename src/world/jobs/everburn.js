// The Everburn story and Tin Town notice-board jobs. These definitions contain
// only world-job data; the shared job engine owns all simulation rules.
const place = (id, x, z, radius = 12) => Object.freeze({id, position:Object.freeze({x, y:0, z}), radius});
const path = (...places) => Object.freeze(places);
const step = (kind, fields) => Object.freeze({kind, ...fields});

const yard = place('yard-gate', 0, 0), tinTown = place('tin-town', 600, 0, 18);
const boneyard = place('boneyard', 424, 304, 18), mall = place('dead-mall', 0, 430, 14);
const well = place('everburn', -424, 304, 18), safeRoad = place('safe-road', 230, 150, 16);
const wellApproach = place('everburn-well-approach', -448, 288, 8);
const wellRaidersHold = place('everburn-well-raiders-hold', -426, 303, 8);
const forge = place('cold-forge', 625, 14, 6), lamps = [
  place('forge-lamp-1', 618, 8, 3), place('forge-lamp-2', 625, 10, 3), place('forge-lamp-3', 632, 8, 3),
];

// Old Smoke's path: from the well across the open flats (leg 1, left door), into
// the Boneyard past the planes (leg 2, right door) and back along the run to the
// well, whose last 230 m are leg 3 (rear door). About 3,150 m, or 3 minutes 45
// seconds at the furnace's base pace.
const furnacePath = path(well,
  place('furnace-flats-1', -450, 40), place('furnace-flats-2', -300, -230), place('furnace-flats-3', -60, -380),
  place('furnace-flats-4', 170, -340), place('furnace-flats-5', 350, -200), place('furnace-flats-6', 350, 60),
  place('furnace-boneyard-in', 335, 170), place('furnace-planes-1', 345, 246), place('furnace-planes-2', 440, 248),
  place('furnace-planes-3', 545, 252), place('furnace-turn-1', 610, 335), place('furnace-turn-2', 520, 425),
  place('furnace-run-1', 250, 415), place('furnace-run-2', 0, 370),
  place('furnace-run-3', -200, 350), well);
const furnaceLegs = Object.freeze([
  Object.freeze({id:'open-flats', door:'left', fromWaypoint:0}),
  Object.freeze({id:'boneyard', door:'right', fromWaypoint:7}),
  Object.freeze({id:'run-back', door:'rear', fromWaypoint:15}),
]);

export const EVERBURN_JOBS = Object.freeze([
  Object.freeze({id:'everburn-hot-delivery', storyId:'everburn', number:1, name:'Hot Delivery', kind:'delivery',
    resultLineId:'story.ember.auntie-solder.2',
    easy:Object.freeze({crashLimit:8, markerRadius:18}), lineId:'everburn-job-1-start',
    steps:[step('carry',{what:"Carry Cinder's ember pot to Tin Town.", load:'everburn-ember-pot', origin:yard, destination:tinTown, radius:18,
      safePoints:path(safeRoad), crashLimit:8, burnable:true, spillLineId:'everburn-job-1-spill',
      barriers:path(place('ash-men-barricade-1', 180, 100), place('ash-men-barricade-2', 410, 210)),
      unlock:'tin-town', lentWeapon:'flamethrower', startLineId:'everburn-job-1-start',
      arrivalLineId:'everburn-job-1-won'})]}),
  Object.freeze({id:'everburn-get-out-and-walk', storyId:'everburn', number:2, name:'Get Out and Walk', kind:'on-foot',
    resultLineId:'story.ember.auntie-solder.4',
    easy:Object.freeze({markerRadius:3, knockedDownRecovery:'last-marker'}), lineId:'everburn-job-2-start',
    steps:[step('onfoot',{what:'Get out and light the three lamps at the cold forge.', places:lamps.map((lamp,index)=>Object.freeze({...lamp, action:'light',
      hint:`everburn-job-2-lamp-${index+1}`})), exitCarLineId:'everburn-job-2-exit',
      radius:3, lentWeapon:'cinders-hand-flamer', requiresExit:true, returnToCar:tinTown,
      unlock:'tin-town-notice-board', startLineId:'everburn-job-2-start', wonLineId:'everburn-job-2-won'})]}),
  Object.freeze({id:'everburn-run-him-down', storyId:'everburn', number:3, name:'Run Him Down', kind:'chase',
    resultLineId:'story.ember.cinder.10',
    easy:Object.freeze({targetSpeed:17, leashDistance:150, contactRadius:8}), lineId:'everburn-job-3-start',
    steps:[step('chase',{what:'Catch the thief before he escapes the Boneyard.', targetId:'ash-man-bellows-thief', actor:{id:'ash-man-bellows-thief', renderCar:'dusthawk_rally', health:20, speed:17,
      path:path(boneyard, place('plane-row',280,380), place('wing-gap',140,470))}, path:path(boneyard, place('plane-row',280,380), place('wing-gap',140,470)),
      targetSpeed:17, leashDistance:150, contactRadius:8, leashLineId:'everburn-job-3-falling-behind',
      targetHealth:20, reward:'flamethrower', startLineId:'everburn-job-3-start', wonLineId:'everburn-job-3-won'})]}),
  Object.freeze({id:'everburn-slow-ride', storyId:'everburn', number:4, name:'Slow Ride', kind:'escort',
    resultLineId:'story.ember.auntie-solder.6',
    easy:Object.freeze({truckHealth:100, raiderPressure:'low', breakdownRecovery:'one-rest-then-restart'}), lineId:'everburn-job-4-start',
    steps:[step('escort',{what:'Keep Big Bess safe on the drive to Tin Town.', actorId:'big-bess', actor:{id:'big-bess', renderCar:'falcone_heritage', escort:true, health:100, speed:9,
      path:path(boneyard, safeRoad, tinTown)}, path:path(boneyard, safeRoad, tinTown), destination:tinTown,
      speed:9, health:100, restLineId:'everburn-job-4-rest', restartFrom:'last-marker',
      raiders:path(place('ash-men-raid-1',360,270),place('ash-men-raid-2',500,90)),
      reward:'scrap', startLineId:'everburn-job-4-start', wonLineId:'everburn-job-4-won'})]}),
  Object.freeze({id:'everburn-key-under-mall', storyId:'everburn', number:5, name:'The Key Under the Mall', kind:'heist',
    resultLine:'You carried Old Smoke’s key back to the Everburn.',
    easy:Object.freeze({lampRange:10, alarmIsFailure:false, walkSpeed:1}), lineId:'everburn-job-5-start',
    steps:[step('heist',{what:'Find the valve key under the Dead Mall and bring it to the Everburn.', takeId:'everburn-valve-key', zone:place('mall-valve-room',-12,430,7), carPlace:mall, carRadius:18,
      escapePlace:well, escapeRadius:18, returnPath:path(mall, safeRoad, well), walkSpeed:1,
      lamps:[place('mall-search-lamp-1',-25,420),place('mall-search-lamp-2',10,444)], coneDegrees:65,
      alarmWaveSize:2, alarmLineId:'everburn-job-5-alarm', lentWeapon:'cinders-hand-flamer',
      startLineId:'everburn-job-5-start', takenLineId:'everburn-job-5-key-taken', wonLineId:'everburn-job-5-won'})]}),
  Object.freeze({id:'everburn-the-everburn', storyId:'everburn', number:6, name:'The Everburn', kind:'defence-then-finish',
    resultLineId:'story.ember.hollis.1',
    easy:Object.freeze({placeHealth:120, waves:[1,2,2], furnaceHealth:3, ventRadius:2}), lineId:'everburn-job-6-start',
    steps:[step('defend',{what:'Defend the Everburn well from the Ash Men.', place:well, placeId:'everburn-valve', health:120, waveCount:3,
      waves:[{count:2},{count:2},{count:3}], easyWaves:[{count:1},{count:2},{count:2}],
      raiderEntry:wellApproach, raiderHold:wellRaidersHold, approachSpeed:1.5,
      refill:{place:well,crateId:'hollis-well-supply',carWeapon:'flamethrower',footAmmo:'rpg'},
      lentWeapon:'flamethrower',
      restartLineId:'everburn-job-6-wave-restart',
      startLineId:'everburn-job-6-start', wavesOverLineId:'everburn-job-6-waves-over'}),
      step('chase',{what:"Stop Old Smoke's furnace before it reaches Tin Town.", targetId:'old-smoke-furnace', actor:{id:'old-smoke-furnace', health:3, speed:14,
        path:furnacePath, legs:furnaceLegs}, path:furnacePath, legs:furnaceLegs,
        // The chase ends on the third door hit, never on contact or distance
        // (src/world/jobs/old-smoke.js owns the rules).
        targetSpeed:14, leashDistance:Infinity, contactRadius:0, targetHealth:3, hitPart:'glowing-vent',
        requiredHits:3, lentWeapon:'flamethrower', startLineId:'story.ember.old-smoke.2', afterStartLineId:'story.ember.cinder.17',
        wonLineId:'story.ember.cinder.20'})],
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
      .map((flag,index)=>Object.freeze({...flag,hint:`everburn-survey-hint-${index+1}`})), reward:'scrap'})]}),
  Object.freeze({id:'everburn-hot-soup', name:'Hot Soup', kind:'delivery',
    unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({crashLimit:10, markerRadius:8}),
    steps:[step('carry',{what:'Carry Auntie’s hot soup from her kitchen to the notice board.', load:'hot-soup', origin:place('auntie-kitchen',615,4,4),
      destination:place('tin-town-notice-board',600,-10,8), safePoints:path(place('town-safe-corner',610,-2,6)),
      radius:8, crashLimit:10, spillLineId:'everburn-soup-spilled', reward:'scrap'})]}),
]);
