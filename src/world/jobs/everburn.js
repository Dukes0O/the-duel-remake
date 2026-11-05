// The Everburn story and Tin Town notice-board jobs. These definitions contain
// only world-job data; the shared job engine owns all simulation rules.
const place = (id, x, z, radius = 12) => Object.freeze({id, position:Object.freeze({x, y:0, z}), radius});
const path = (...places) => Object.freeze(places);
const step = (kind, fields) => Object.freeze({kind, ...fields});

const yard = place('yard-gate', 0, 0), tinTown = place('tin-town', 600, 0, 18);
const boneyard = place('boneyard', 424, 304, 18), mall = place('dead-mall', 0, 430, 14);
const well = place('everburn', -424, 304, 18), safeRoad = place('safe-road', 230, 150, 16);
const forge = place('cold-forge', 625, 14, 6), lamps = [
  place('forge-lamp-1', 618, 8, 3), place('forge-lamp-2', 625, 10, 3), place('forge-lamp-3', 632, 8, 3),
];

export const EVERBURN_JOBS = Object.freeze([
  Object.freeze({id:'everburn-hot-delivery', storyId:'everburn', number:1, name:'Hot Delivery', kind:'delivery',
    easy:Object.freeze({crashLimit:8, markerRadius:18}), lineId:'everburn-job-1-start',
    steps:[step('carry',{load:'everburn-ember-pot', origin:yard, destination:tinTown, radius:18,
      safePoints:path(safeRoad), crashLimit:8, burnable:true, spillLineId:'everburn-job-1-spill',
      barriers:path(place('ash-men-barricade-1', 180, 100), place('ash-men-barricade-2', 410, 210)),
      unlock:'tin-town', lentWeapon:'flamethrower', startLineId:'everburn-job-1-start',
      arrivalLineId:'everburn-job-1-won'})]}),
  Object.freeze({id:'everburn-get-out-and-walk', storyId:'everburn', number:2, name:'Get Out and Walk', kind:'on-foot',
    easy:Object.freeze({markerRadius:3, knockedDownRecovery:'last-marker'}), lineId:'everburn-job-2-start',
    steps:[step('onfoot',{places:lamps.map((lamp,index)=>Object.freeze({...lamp, action:'light',
      hint:`everburn-job-2-lamp-${index+1}`})), exitCarLineId:'everburn-job-2-exit',
      radius:3, lentWeapon:'cinders-hand-flamer', requiresExit:true, returnToCar:tinTown,
      unlock:'tin-town-notice-board', startLineId:'everburn-job-2-start', wonLineId:'everburn-job-2-won'})]}),
  Object.freeze({id:'everburn-run-him-down', storyId:'everburn', number:3, name:'Run Him Down', kind:'chase',
    easy:Object.freeze({targetSpeed:17, leashDistance:150, contactRadius:8}), lineId:'everburn-job-3-start',
    steps:[step('chase',{targetId:'ash-man-bellows-thief', actor:{id:'ash-man-bellows-thief', renderCar:'dusthawk_rally', health:20, speed:17,
      path:path(boneyard, place('plane-row',280,380), place('wing-gap',140,470))}, path:path(boneyard, place('plane-row',280,380), place('wing-gap',140,470)),
      targetSpeed:17, leashDistance:150, contactRadius:8, leashLineId:'everburn-job-3-falling-behind',
      targetHealth:20, reward:'flamethrower', startLineId:'everburn-job-3-start', wonLineId:'everburn-job-3-won'})]}),
  Object.freeze({id:'everburn-slow-ride', storyId:'everburn', number:4, name:'Slow Ride', kind:'escort',
    easy:Object.freeze({truckHealth:100, raiderPressure:'low', breakdownRecovery:'one-rest-then-restart'}), lineId:'everburn-job-4-start',
    steps:[step('escort',{actorId:'big-bess', actor:{id:'big-bess', renderCar:'falcone_heritage', escort:true, health:100, speed:9,
      path:path(boneyard, safeRoad, tinTown)}, path:path(boneyard, safeRoad, tinTown), destination:tinTown,
      speed:9, health:100, restLineId:'everburn-job-4-rest', restartFrom:'last-marker',
      raiders:path(place('ash-men-raid-1',360,270),place('ash-men-raid-2',500,90)),
      reward:'scrap', startLineId:'everburn-job-4-start', wonLineId:'everburn-job-4-won'})]}),
  Object.freeze({id:'everburn-key-under-mall', storyId:'everburn', number:5, name:'The Key Under the Mall', kind:'heist',
    easy:Object.freeze({lampRange:10, alarmIsFailure:false, walkSpeed:1}), lineId:'everburn-job-5-start',
    steps:[step('heist',{takeId:'everburn-valve-key', zone:place('mall-valve-room',-12,430,7), carPlace:mall, carRadius:18,
      escapePlace:well, escapeRadius:18, returnPath:path(mall, safeRoad, well), walkSpeed:1,
      lamps:[place('mall-search-lamp-1',-25,420),place('mall-search-lamp-2',10,444)], coneDegrees:65,
      alarmWaveSize:2, alarmLineId:'everburn-job-5-alarm', lentWeapon:'cinders-hand-flamer',
      startLineId:'everburn-job-5-start', takenLineId:'everburn-job-5-key-taken', wonLineId:'everburn-job-5-won'})]}),
  Object.freeze({id:'everburn-the-everburn', storyId:'everburn', number:6, name:'The Everburn', kind:'defence-then-finish',
    easy:Object.freeze({placeHealth:120, waves:[2,2,3], furnaceHealth:3, ventRadius:10}), lineId:'everburn-job-6-start',
    steps:[step('defend',{place:well, placeId:'everburn-valve', health:120, waveCount:3,
      waves:[{count:2},{count:2},{count:3}], restartLineId:'everburn-job-6-wave-restart',
      startLineId:'everburn-job-6-start', wavesOverLineId:'everburn-job-6-waves-over'}),
      step('chase',{targetId:'old-smoke-furnace', actor:{id:'old-smoke-furnace', renderCar:'titan_monster', health:3, speed:14,
        path:path(well,place('furnace-run',-260,150),place('furnace-return',-350,250))}, path:path(well,place('furnace-run',-260,150),place('furnace-return',-350,250)),
        targetSpeed:14, leashDistance:180, contactRadius:10, targetHealth:3, hitPart:'glowing-vent',
        requiredHits:3, startLineId:'everburn-job-6-chase-start', wonLineId:'everburn-job-6-won'})],
    rewards:['cinder-crew-member','cinders-hand-flamer','ember-paint','everburn-lit']}),
]);

export const EVERBURN_SIDE_JOBS = Object.freeze([
  Object.freeze({id:'everburn-lost-prospector', name:'Lost Prospector', kind:'rescue',
    unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({seats:2, boardSeconds:1.5}),
    steps:[step('rescue',{people:[place('prospector-1',400,330),place('prospector-2',448,280)], seats:2,
      boardSeconds:1.5, radius:8, stopSpeed:0.5, home:tinTown, homeRadius:18, reward:'scrap'})]}),
  Object.freeze({id:'everburn-survey-flags', name:'Survey Flags', kind:'explore',
    unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({findCount:5, markerRadius:8}),
    steps:[step('explore',{finds:[place('survey-flag-1',450,300),place('survey-flag-2',150,390),
      place('survey-flag-3',-140,260),place('survey-flag-4',280,-250),place('survey-flag-5',430,-300)]
      .map((flag,index)=>Object.freeze({...flag,hint:`everburn-survey-hint-${index+1}`})), reward:'scrap'})]}),
  Object.freeze({id:'everburn-hot-soup', name:'Hot Soup', kind:'delivery',
    unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({crashLimit:10, markerRadius:8}),
    steps:[step('carry',{load:'hot-soup', origin:place('auntie-kitchen',615,4,4),
      destination:place('tin-town-notice-board',600,-10,8), safePoints:path(place('town-safe-corner',610,-2,6)),
      radius:8, crashLimit:10, spillLineId:'everburn-soup-spilled', reward:'scrap'})]}),
]);
