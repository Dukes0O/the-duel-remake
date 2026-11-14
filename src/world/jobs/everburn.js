// The Everburn story and Tin Town notice-board jobs. These definitions contain
// only world-job data; the shared job engine owns all simulation rules.
//
// Every position below is a place of the land (src/world/scablands-names.js) plus an offset in metres, or a share of the way
// between two places plus an offset. `buildEverburn(land)` builds the jobs for any land, and the game's jobs are built from the
// real one, so moving a place in the table moves every job that stands by it (tools/test-scablands-size.mjs).
import {furnaceMarks} from './furnace-sightings.js';
import {escortCarStart} from './steps/escort.js';
import {EMBER_RULE} from './ember-rule.js';
import {LAND} from '../scablands-names.js';

const path = (...places) => Object.freeze(places);
const step = (kind, fields) => Object.freeze({kind, ...fields});

export function buildEverburn(land) {
  const {at, between} = land;
  const place = (id, point, radius = 12) => Object.freeze({id, position:Object.freeze({x:point.x, y:0, z:point.z}), radius});
  // Where a job's car starts (EVERBURN-PLAY-FIXES): open ground, facing a place. src/arena/modes/world-job.js puts the car there.
  const carStart = (point, toward) => Object.freeze({x:point.x, z:point.z, heading:Math.atan2(toward.position.x - point.x, toward.position.z - point.z)});
  const marks = furnaceMarks(land);

  const yard = place('yard-gate', land.yard), tinTown = place('tin-town', at('tin-town'), 18);
  const boneyard = place('boneyard', at('boneyard'), 18), mall = place('dead-mall', at('dead-mall'), 14);
  const well = place('everburn', at('everburn'), 18), safeRoad = place('safe-road', at('safe-road'), 16);
  const wellRaidersHold = place('everburn-well-raiders-hold', at('everburn', -2, -1), 8);
  const wellRaiderEntries = Object.freeze([[0, 64], [64, 0], [0, -64], [-64, 0]]
    .map(([dx, dz], index) => place(`everburn-well-raiders-${index + 1}`, at('everburn', dx, dz), 8)));
  // The Scablands' five named places, as the jobs define them (the big map marks and names them in every job).
  const SCABLANDS_PLACES = Object.freeze({yardGate: yard, tinTown, everburn: well, deadMall: mall, boneyard});
  const forge = place('cold-forge', at('tin-town', 25, 14), 6), lamps = [
    place('forge-lamp-1', at('tin-town', 18, 8), 3), place('forge-lamp-2', at('tin-town', 25, 10), 3), place('forge-lamp-3', at('tin-town', 32, 8), 3),
  ];

  // Old Smoke's path: from the well round the open flats (leg 1, left door), through the Boneyard past the planes and up to
  // Tin Town's gate (leg 2, right door), then home along the road with the player behind it (leg 3, rear door, from the place
  // between the Dead Mall and the well). The gate is where the furnace is running to: if its right door is still unbroken when it
  // reaches the place in front of the gate, the gate burns (old-smoke.js). The furnace does not drive through the gate: it stops
  // 82 m south of the gate's centre, in front of it, and turns west along the outside of the fence.
  const furnaceGate = place('tin-town-gate-front', at('tin-town', -25, 82), 18);
  const furnaceRunBack = place('furnace-run-3', between('dead-mall', 'everburn', .485, 5.62, -18.9));
  const furnacePath = path(well,
    place('furnace-flats-1', between('everburn', 'iron-line', .688, 95, -55)), place('furnace-flats-2', at('dry-dam', 124, 74)),
    place('furnace-flats-3', at('ships-in-sand', -60, 50)), place('furnace-flats-4', between('ships-in-sand', 'ridge', .426, -10.78, 36.28)),
    place('furnace-flats-5', at('ridge', -74, 104)), place('furnace-flats-6', between('ridge', 'boneyard', .599, -74, 0)),
    place('furnace-boneyard-in', at('boneyard', -89, -134)), place('furnace-planes-1', at('boneyard', -79, -58)),
    place('furnace-planes-2', at('boneyard', 16, -56)), place('furnace-planes-3', at('boneyard', 121, -52)),
    place('furnace-approach', at('tin-town', 10, 170)), furnaceGate,
    place('furnace-road-1', between('yard', 'tin-town', .717, 0, 70)), safeRoad,
    place('furnace-road-2', between('yard', 'dead-mall', .535)), furnaceRunBack, well);
  const furnaceLegs = Object.freeze([
    Object.freeze({id:'open-flats', door:'left', fromWaypoint:0}),
    Object.freeze({id:'boneyard', door:'right', fromWaypoint:7}),
    Object.freeze({id:'run-back', door:'rear', fromWaypoint:furnacePath.indexOf(furnaceRunBack)}),
  ]);
  const ashBarricade1 = place('ash-men-barricade-1', at('ash-barricade-1'), 12), ashBarricade2 = place('ash-men-barricade-2', at('ash-barricade-2'), 12);
  const planeRow = place('plane-row', at('boneyard', -144, 76)), wingGap = place('wing-gap', at('boneyard', -284, 166));
  // Job 3's thief runs from the Boneyard past the plane row to the wing gap.
  const thiefPath = path(boneyard, planeRow, wingGap);
  const prospector1 = place('prospector-1', at('boneyard', -24, 26)), survey1 = place('survey-flag-1', at('boneyard', 26, -4));
  const kitchen = place('auntie-kitchen', at('tin-town', 15, 4), 4), townSafeCorner = place('town-safe-corner', at('tin-town', 32, -30), 6);
  const valveRoom = place('mall-valve-room', at('dead-mall', -12, 0), 7);

  const EVERBURN_JOBS = Object.freeze([
    Object.freeze({id:'everburn-hot-delivery', storyId:'everburn', number:1, name:'Hot Delivery', kind:'delivery',
      resultLineId:'story.ember.auntie-solder.2',
      easy:Object.freeze({markerRadius:18}), lineId:'story.ember.cinder.1',
      // The pot holds a live ember (src/world/jobs/ember-rule.js): driving takes it, and at 0 Cinder's spill line is said and the marker
      // moves to the nearest brazier (the yard gate, or the halfway camp once passed), where a stop gives a fresh scoop.
      steps:[step('carry',{what:"Carry Cinder's ember pot to Tin Town.", load:'everburn-ember-pot', origin:yard, destination:tinTown, radius:18,
        safePoints:path(safeRoad), ember:EMBER_RULE, burnable:true, spillLineId:'story.ember.cinder.4',
        barriers:path(ashBarricade1, ashBarricade2),
        // Old Smoke's furnace stands on the skyline until the pot is delivered (src/world/jobs/furnace-sightings.js).
        sayNear:[{place:place('furnace-skyline', marks.skyline), radius:260, lineId:'story.ember.cinder.24'},
          {place:ashBarricade1, radius:60, lineId:'story.ember.cinder.3'},
          {place:tinTown, radius:170, lineId:'story.ember.auntie-solder.1'}],
        unlock:'tin-town', lentWeapon:'flamethrower', startLineId:'story.ember.cinder.1', afterStartLineId:['story.ember.cinder.2']})]}),
    Object.freeze({id:'everburn-get-out-and-walk', storyId:'everburn', number:2, name:'Get Out and Walk', kind:'on-foot',
      resultLineId:'story.ember.auntie-solder.4',
      easy:Object.freeze({markerRadius:3, knockedDownRecovery:'last-marker'}), lineId:'story.ember.auntie-solder.3',
      steps:[step('onfoot',{what:'Get out and light the three lamps at the cold forge.', places:lamps.map((lamp,index)=>Object.freeze({...lamp, action:'light',
        ...(index === 0 ? {lineId:'story.ember.cinder.6'} : {})})),
        // The car starts inside Tin Town's gate on open ground (18 m in from the gate's posts, 30 m from the town's own model),
        // facing the forge, not in the alley at the town's centre where the camera stood behind a pillar.
        carStart:carStart(at('tin-town', -18, 44), forge),
        radius:3, lentWeapon:'cinders-hand-flamer', requiresExit:true, returnToCar:tinTown,
        unlock:'tin-town-notice-board', startLineId:'story.ember.auntie-solder.3', afterStartLineId:['story.ember.cinder.5']})]}),
    Object.freeze({id:'everburn-run-him-down', storyId:'everburn', number:3, name:'Run Him Down', kind:'chase',
      resultLineId:'story.ember.cinder.10',
      easy:Object.freeze({targetSpeed:17, leashDistance:150, contactRadius:8}), lineId:'story.ember.auntie-solder.5',
      steps:[step('chase',{what:'Catch the thief before he escapes the Boneyard.', targetId:'ash-man-bellows-thief', actor:{id:'ash-man-bellows-thief', renderCar:'dusthawk_rally', health:20, speed:17,
        path:thiefPath}, path:thiefPath,
        targetSpeed:17, leashDistance:150, contactRadius:8, leashLineId:'story.ember.cinder.9',
        targetHealth:20, reward:'flamethrower', startLineId:'story.ember.auntie-solder.5',
        sayNear:[{place:planeRow, radius:70, lineId:'story.ember.cinder.8'}],
        // The furnace rolls away as the thief is caught; the job holds for Cinder's line (the old won line was only an id).
        closing:['story.ember.cinder.22']})]}),
    Object.freeze({id:'everburn-slow-ride', storyId:'everburn', number:4, name:'Slow Ride', kind:'escort',
      // What the results screen says when Big Bess is in Tin Town (EVERBURN-PLAY-FIXES): the screen's own words are a stand-in.
      resultLine:'The gas is in Tin Town and the forge is lit.',
      easy:Object.freeze({truckHealth:100, raiderPressure:'low', breakdownRecovery:'one-rest-then-restart'}), lineId:'story.ember.moss.1',
      // No stand-in car: the Scablands scene draws Big Bess's own truck at this actor's spot.
      steps:[step('escort',{what:'Keep Big Bess safe on the drive to Tin Town.', actorId:'big-bess', actor:{id:'big-bess', renderCar:false, escort:true, health:100, speed:9,
        path:path(boneyard, safeRoad, tinTown)}, path:path(boneyard, safeRoad, tinTown), destination:tinTown,
        // The car starts 10 m behind her and 6 m to her right, facing along her road (it was the Boneyard's own spawn, 165 m off).
        carStart:escortCarStart(path(boneyard, safeRoad, tinTown)),
        speed:9, health:100, restLineId:'story.ember.moss.3', restartFrom:'last-marker', restSeconds:3, lentWeapon:'flamethrower', giveUpLineId:'story.ember.moss.10',
        // Two ambushes of 2 raiders each (1 on Easy). See src/world/jobs/steps/escort.js. Both stand on her road: the first three
        // quarters of the way from the Boneyard to the halfway camp, the second three quarters of the way from the camp to Tin
        // Town. The flamethrower is lent, as in job 1.
        ambushes:Object.freeze([Object.freeze({id:'ash-men-raid-1', place:place('ash-men-raid-1', between('boneyard', 'safe-road', .753)), count:2}),
          Object.freeze({id:'ash-men-raid-2', place:place('ash-men-raid-2', between('safe-road', 'tin-town', .73)), count:2})]),
        // The furnace paces her on the high ground while she is between 30% and 70% of her road.
        sayAtShare:[{share:.3, lineId:'story.ember.moss.4'}],
        // Moss's own start line; the job ends on Auntie Solder's result line, which it holds for as job 3 holds for Cinder's.
        reward:'scrap', startLineId:'story.ember.moss.1', closing:['story.ember.auntie-solder.6']})]}),
    Object.freeze({id:'everburn-key-under-mall', storyId:'everburn', number:5, name:'The Key Under the Mall', kind:'heist',
      resultLineId:'story.ember.old-smoke.1',
      easy:Object.freeze({lampRange:10, alarmIsFailure:false, walkSpeed:1}), lineId:'story.ember.cinder.11',
      steps:[step('heist',{what:'Find the valve key under the Dead Mall and bring it to the Everburn.',
        // The car starts on the road 124 m short of the mall, facing it (it started inside the mall's box), so that Cinder's "Leave the
        // car outside" is heard on the way in. The mall stands on the dirt road; the start is past the pair of junk cars that lie on
        // the road at 135 to 141 m (it was 150 m out, 9 m behind the first of them, and a car driven straight at the mall stopped
        // against it); nothing lies within 40 m ahead of the car's nose.
        carStart:carStart(at('dead-mall', 123.72, -9), mall), takeId:'everburn-valve-key', zone:valveRoom, carPlace:mall, carRadius:18,
        escapePlace:well, escapeRadius:18, returnPath:path(mall, safeRoad, well), walkSpeed:1,
        lamps:[place('mall-search-lamp-1', at('dead-mall', -25, -10)), place('mall-search-lamp-2', at('dead-mall', 10, 14))], coneDegrees:65,
        alarmWaveSize:2, alarmLineId:'story.ember.cinder.14', lentWeapon:'cinders-hand-flamer',
        startLineId:'story.ember.cinder.11', takenLineId:'story.ember.cinder.13',
        sayNear:[{place:valveRoom, radius:22, lineId:'story.ember.cinder.12'}]})]}),
    Object.freeze({id:'everburn-the-everburn', storyId:'everburn', number:6, name:'The Everburn', kind:'defence-then-finish',
      resultLineId:'story.ember.hollis.1',
      easy:Object.freeze({placeHealth:120, waves:[1,2,2], furnaceHealth:3, ventRadius:2}), lineId:'story.ember.cinder.15',
      steps:[step('defend',{what:'Defend the Everburn well from the Ash Men.', origin:place('well-start', at('everburn', -21.2132034356, -21.2132034356)), faceOriginToPlace:true, place:well, placeId:'everburn-valve', health:120, waveCount:3,
        waves:[{count:2},{count:2},{count:3}], easyWaves:[{count:1},{count:2},{count:2}],
        // EVERBURN-PLAY-FIXES: a wave comes from the one of four places, a compass apart 64 m from the well, that is farthest from the player's car,
        // so that no raider appears within 60 m of the car (the first wave used to appear 6 m from it); it walks in at 3 m a second (a quick walk,
        // so that it arrives about as soon as before: 21 s for the 62 m, where it was 18 s for 27 m). The first wave comes after Cinder's opening line.
        raiderEntries:wellRaiderEntries, raiderHold:wellRaidersHold, approachSpeed:3, firstWaveAfterSec:2.4,
        refill:{place:well,crateId:'hollis-well-supply',carWeapon:'flamethrower',footAmmo:'rpg'},
        lentWeapon:'flamethrower',
        restartLineId:'story.ember.cinder.26',
        startLineId:'story.ember.cinder.15', closing:['story.ember.cinder.16']}),
        // EVERBURN-PLAY-FIXES: the opening order is Old Smoke's first line, then Cinder's instruction (hit a door while it glows), then
        // Old Smoke's second line, so that the instruction is read before the first door glows.
        step('chase',{what:'Stop the furnace before it reaches Tin Town. Hit a door while it glows.', targetId:'old-smoke-furnace', actor:{id:'old-smoke-furnace', health:3, speed:14,
          path:furnacePath, legs:furnaceLegs, gateWaypoint:furnacePath.indexOf(furnaceGate)}, path:furnacePath, legs:furnaceLegs,
          // The chase ends on the third door hit, never on contact or distance
          // (src/world/jobs/old-smoke.js owns the rules).
          targetSpeed:14, leashDistance:Infinity, contactRadius:0, targetHealth:3, hitPart:'glowing-vent',
          requiredHits:3, lentWeapon:'flamethrower', startLineId:'story.ember.old-smoke.2', afterStartLineId:['story.ember.cinder.23', 'story.ember.old-smoke.4'],
          closing:['story.ember.cinder.20', 'story.ember.cinder.21']})],
      rewards:['cinder-crew-member','cinders-hand-flamer','ember-paint','everburn-lit']}),
  ]);

  const EVERBURN_SIDE_JOBS = Object.freeze([
    Object.freeze({id:'everburn-lost-prospector', name:'Lost Prospector', kind:'rescue',
      unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({seats:2, boardSeconds:1.5}),
      steps:[step('rescue',{what:'Rescue the two lost prospectors and bring them to Tin Town.', people:[prospector1, place('prospector-2', at('boneyard', 24, -24))], seats:2,
        // Taken from the notice board (go-live, 13 November 2026): the car starts on open ground beside the Boneyard, facing the first prospector.
        carStart:carStart(at('boneyard', 119, -112), prospector1),
        boardSeconds:1.5, radius:8, stopSpeed:0.5, home:tinTown, homeRadius:18, reward:'scrap'})]}),
    Object.freeze({id:'everburn-survey-flags', name:'Survey Flags', kind:'explore',
      unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({findCount:5, markerRadius:8}),
      steps:[step('explore',{what:'Find and raise all five survey flags.', finds:[survey1, place('survey-flag-2', at('dead-mall', 150, -40)),
        place('survey-flag-3', between('dead-mall', 'everburn', .413, 35.06, -117.98)), place('survey-flag-4', between('ships-in-sand', 'ridge', .723, -26.43, 88.94)),
        place('survey-flag-5', at('ridge', 6, 4))]
        .map(flag=>Object.freeze({...flag})), carStart:carStart(at('boneyard', 119, -112), survey1), reward:'scrap'})]}),
    Object.freeze({id:'everburn-hot-soup', name:'Hot Soup', kind:'delivery',
      unlockAfter:'everburn-get-out-and-walk', easy:Object.freeze({crashLimit:10, markerRadius:8}),
      // A real delivery across the Scablands (go-live, 13 November 2026): Auntie's soup goes from her kitchen at the east edge of Tin Town to the
      // diggers at the Everburn well, by the marked way, which goes round the town's south side and then by the safe road. No part of it
      // comes within 6 m of a solid near the town (the well's own box at the very end excepted). A spill sends the car back to the last safe
      // point it passed.
      steps:[step('carry',{what:'Carry Auntie’s hot soup from her kitchen to the diggers at the Everburn well.', load:'hot-soup', origin:kitchen,
        destination:well, safePoints:path(townSafeCorner, place('south-road', at('tin-town', -30, -30), 10), safeRoad),
        // The car starts on open ground beside the kitchen, outside the town's solid, facing the first safe point.
        carStart:carStart(at('tin-town', 24, -2), townSafeCorner),
        radius:18, crashLimit:10, spillLineId:'story.ember.auntie-solder.12', reward:'scrap'})]}),
  ]);

  return Object.freeze({EVERBURN_JOBS, EVERBURN_SIDE_JOBS, SCABLANDS_PLACES});
}

const BUILT = buildEverburn(LAND);
export const SCABLANDS_PLACES = BUILT.SCABLANDS_PLACES;
export const EVERBURN_JOBS = BUILT.EVERBURN_JOBS;
export const EVERBURN_SIDE_JOBS = BUILT.EVERBURN_SIDE_JOBS;

// The notice board's own name for a side job ('hot-soup') and its definition's id ('everburn-hot-soup').
// (Matched by id: the game copies a definition when it starts the job.)
export const sideJobKey = job => EVERBURN_SIDE_JOBS.some(item => item.id === job?.id) ? job.id.replace(/^everburn-/, '') : null;
export const sideJobOf = key => EVERBURN_SIDE_JOBS.find(job => job.id === `everburn-${key}`) ?? null;
