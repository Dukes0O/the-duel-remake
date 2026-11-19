import assert from 'node:assert/strict';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {BELLOWS_RULE, BELLOWS_LINES, bellowsPay, bellowsSentence,
  stepBellowsLoad, bellowsAshBox, stepBellowsAsh, bellowsThiefSpeedKmh,
  bellowsBlockingSide, bellowsBlockingMove, stepBellowsPursuit, stepBellowsEnding,
  bellowsWreckRoute, stepBellowsChase} from '../src/world/jobs/bellows-rule.js';
import {BONEYARD_WRECKS, boneyardWrecks} from '../src/world/boneyard-wrecks.js';
import {LAND} from '../src/world/scablands-names.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {sweepObstacle, CAR_HALF_WIDTH} from '../src/collision.js';
import {captionSeconds} from '../src/story/caption-queue.js';
import {worldReturnNotice} from '../src/screen-hud.js';

const {EVERBURN_JOBS} = await import('../src/world/jobs/everburn.js');
const {FIGHTER_RULES} = await import('../src/onfoot.js');

assert.throws(() => stepBellowsPursuit({}, {roadMetres:800,behindMetres:10},0),
  {message:'The thief needs the pursuing car\u2019s road point for his sack.'});

// Slice 11.2: every reported weapon contact damages the load, never earns a knock.
assert.equal(EVERBURN_JOBS[2].steps[0].lentWeapon, 'cinders-hand-flamer');
for (const [weapon, damage] of [['rpg',40],['rocket-pod',40],['bomb',40],
  ['sticky-bomb',40],['crossbow',20],['marksman',20],['harpoon',10],['scrap-cannon',10],['scrap-turret',10]]) {
  const hit=stepBellowsLoad({}, {weaponHits:[{weapon}], behindMetres:500}, 0);
  assert.equal(hit.state.bellows,100-damage,weapon);
  assert.equal(hit.state.knocks,0,weapon);
  assert.equal(hit.state.thiefStopped,undefined,weapon);
  assert.equal(hit.events.filter(event=>event.lineId==='bellows.warning').length,1,weapon);
  assert.equal(stepBellowsLoad(hit.state,{weaponHits:[{weapon}],behindMetres:500},0)
    .events.filter(event=>event.lineId==='bellows.warning').length,0);
}
assert.equal(stepBellowsLoad({}, {weaponHits:[{weapon:'bomb'},{weapon:'crossbow'}]},0).state.bellows,40);
console.log('PASS slice 11.2: loaned hand flamer, weapon load damage and first-contact warning.');

// Native crew shots and rockets must reach the separate job actor too.
const {stepGearProjectile} = await import('../src/crew-gear/projectiles.js');
const {stepRocketPod} = await import('../src/arsenal/rockets.js');
const {stepGearDeployables} = await import('../src/crew-gear/signature.js');
const weaponDuel = {
  state: {status:'racing', mode:'wasteland', wastelandGateDiscovered:true,
    opponents:[], onFoot:false, stageTimeSec:0,
    combat:{bursts:[], serial:0}, worldJobThingsHit:[],
    arena:{mode:'world-job', participants:[], worldJob:{actors:[
      {id:'thief',health:20,position:{x:0,y:0,z:10}}],
      job:{steps:[{bellows:true,targetId:'thief'}],stepIndex:0,stepState:{}}, hitTargets:[]}}},
  course:{nearest:(x,z)=>({s:z,lateral:x}),
    groundAt:(s,lateral)=>({x:lateral??0,y:0,z:s??0,heading:0})},
  featureFlags:{enabled:()=>true}, _obstacles:()=>[], emit:()=>{},
};
for (const [kind,crewId,damage] of [['marksman','dune',20],['scrap-cannon','tusk',10],
  ['sticky-bomb','nell',40],['rocket-pod',null,40]]) {
  weaponDuel.state.worldJobThingsHit=[];
  const shot={id:kind, kind, crewId, attackerId:'player', ownerId:'player',
    crewGearShot:!!crewId, x:0,y:1,z:0,launchX:0,launchY:1,launchZ:0,
    vx:0,vy:0,vz:40,age:0,travelled:0};
  if (crewId) {
    if (kind==='sticky-bomb') Object.assign(shot,{thrown:true,stuck:true,fuseSeconds:3,z:10});
    stepGearProjectile(weaponDuel,shot,.5);
  } else stepRocketPod(weaponDuel,shot,.5);
  const hits=weaponDuel.state.worldJobThingsHit;
  assert.equal(hits.length,1,`${kind} reaches the thief exactly once.`);
  const result=stepBellowsLoad({}, {weaponHits:hits,behindMetres:500},0);
  assert.equal(result.state.bellows,100-damage,kind);
  assert.equal(result.state.knocks,0,kind);
  assert.equal(weaponDuel.state.arena.worldJob.actors[0].health,20);
}
weaponDuel.state.worldJobThingsHit=[];
weaponDuel.state.crewGear={crewId:'odessa',serial:0,
  turret:{id:'turret',x:0,y:0,z:0,age:0,shotSeconds:0}};
stepGearDeployables(weaponDuel,.8);
assert.equal(weaponDuel.state.worldJobThingsHit.length,1,'The turret shoots the thief.');
assert.equal(stepBellowsLoad({}, {weaponHits:weaponDuel.state.worldJobThingsHit},0).state.bellows,90);
weaponDuel.state.worldJobThingsHit=[];
stepGearDeployables(weaponDuel,1.6);
assert.equal(weaponDuel.state.worldJobThingsHit.length,2,'Separate turret rounds each count.');
weaponDuel.state.worldJobThingsHit=[];
weaponDuel._obstacles=()=>[{x:0,y:0,z:5,halfX:3,halfZ:1,height:3,shape:'box'}];
stepGearProjectile(weaponDuel,{id:'blocked',kind:'marksman',crewId:'dune',crewGearShot:true,
  attackerId:'player',x:0,y:1,z:0,vx:0,vy:0,vz:40,age:0,travelled:0},.5);
assert.equal(weaponDuel.state.worldJobThingsHit.length,0,'Scenery stops a crew shot before the thief.');
weaponDuel._obstacles=()=>[];
weaponDuel.state.status='countdown';
stepRocketPod(weaponDuel,{id:'early',kind:'rocket-pod',attackerId:'player',
  x:0,y:1,z:0,vx:0,vy:0,vz:40,age:0,travelled:0},.5);
assert.equal(weaponDuel.state.worldJobThingsHit.length,0,'The target is absent before racing.');
console.log('PASS slice 11.2: native crew shots, sticky blasts, rockets and turret hits damage only the bellows.');

// Slice 11.1: step only the rules on a straight road, without a driver.
const reachStep = {targetId:'thief', path:[]};
const reachTick = (state, thief, car, speedKmh, dt, extra = {}) => stepBellowsChase(
  reachStep, state, {onFoot:speedKmh === 0, speedKmh, difficulty:'medium',
    carPosition:{x:car,z:0}, actors:[{id:'thief',position:{x:thief,z:0}}],
    bellows:{roadMetres:thief, behindMetres:thief-car, playerTopSpeedKmh:200,
      furnaceMetres:10000, ...extra}}, dt);
// He creeps away at 15 km/h until the player's car moves (Claude's hand drive, 17 November: at 40 km/h he was in the
// Boneyard before a player on foot among the shacks had reached the car).
assert.equal(reachTick({},250,0,0,0).requests.find(r=>r.type==='follow').speed,15/3.6);
const reachStart = EVERBURN_JOBS[2].steps[0];
const startGate = reachStart.path[0].position;
const startGap = Math.hypot(startGate.x-reachStart.carStart.x,startGate.z-reachStart.carStart.z);
let reachState = {}, thiefRoad = 0, carRoad = -startGap, caughtAt = null;
// Walk from the authored foot start to the car, then use top speed on the road.
for (let frame=0; frame<18000 && caughtAt === null; frame++) {
  const dt=1/60, seconds=frame*dt, driving=seconds >= BELLOWS_RULE.footStartFromCarMetres/FIGHTER_RULES.walkMetersPerSecond;
  const result=reachTick(reachState,thiefRoad,carRoad,driving?200:0,dt);
  reachState=result.state;
  thiefRoad+=result.requests.find(r=>r.type==='follow').speed*dt;
  if(driving) carRoad+=200/3.6*dt;
  if(thiefRoad-carRoad<=60) caughtAt=thiefRoad;
}
assert(caughtAt!==null && caughtAt<1500, `Medium must close before 1500 m, got ${caughtAt}.`);
let waitingState={}, waitingThief=0, waitingCar=-startGap;
for(let frame=0;frame<1500;frame++) {
  const result=reachTick(waitingState,waitingThief,waitingCar,0,1/60);
  waitingState=result.state;
  waitingThief+=result.requests.find(r=>r.type==='follow').speed/60;
}
assert(Math.abs(waitingThief-15/3.6*25)<.1,'With the car still standing he is about 104 m down the road after 25 seconds.');
assert(waitingThief-waitingCar<=400,'A stationary car must still see him after 25 seconds.');
// After ninety seconds he goes whether or not the car has moved, at the pace of a car far behind.
for(let frame=1500;frame<5400;frame++) waitingState=reachTick(waitingState,waitingThief,waitingCar,0,1/60).state;
assert.equal(reachTick(waitingState,500,0,0,1/60).requests.find(r=>r.type==='follow').speed*3.6,100);
console.log(`PASS slice 11.1: Medium closes at ${caughtAt.toFixed(1)} m; stationary gap ${(waitingThief-waitingCar).toFixed(1)} m.`);

// Exact pace boundaries, launch latch and three-second recovery.
for (const [gap, difficulty, expected] of [
  [120,'medium',180],[400,'medium',100],[260,'medium',140],
  [0,'easy',160],[260,'easy',130],[500,'easy',100],
]) assert.equal(bellowsThiefSpeedKmh(200,false,gap,difficulty),expected);
assert.equal(bellowsThiefSpeedKmh(200,false,120,'medium',true),140);
assert.equal(bellowsThiefSpeedKmh(200,true,120,'medium',true),60);
// Each arrival at the furnace slows his next pass through the wrecks by 10 km/h, never under 30.
for (const [arrivals, kmh] of [[0,60],[1,50],[2,40],[3,30],[9,30]]) assert.equal(bellowsThiefSpeedKmh(200,true,120,'medium',false,arrivals),kmh);
const pace = result => result.requests.find(request=>request.type==='follow').speed*3.6;
// And the chase itself asks for that pace: after two arrivals he is followed through the wrecks at 40 km/h.
assert(Math.abs(pace(reachTick({launchEnded:true,furnaceArrivals:2},120,0,60,1/60,{inBoneyard:true}))-40)<1e-9);
assert(Math.abs(pace(reachTick({launchEnded:true},120,0,60,1/60,{inBoneyard:true}))-60)<1e-9);
assert(Math.abs(pace(reachTick({},120,0,20,89.99))-15)<1e-9);
assert.equal(pace(reachTick({},120,0,20,90)),180);
const launched=reachTick({},120,0,20.01,0);
assert.equal(pace(launched),180);
assert.equal(pace(reachTick(launched.state,120,0,0,0)),180);
const shaken=reachTick(launched.state,120,0,40,0,
  {carContact:true,meetingKmh:20});
assert.equal(shaken.state.knocks,1);
assert.equal(pace(shaken),140);
const recovering=reachTick(shaken.state,120,0,40,2.99);
assert.equal(pace(recovering),140);
assert.equal(pace(reachTick(recovering.state,120,0,40,.011)),180);

// Both sacks wait for a pursuing car, and burst at its current road point.
const sackFacts={roadMetres:1700,behindMetres:60,roadWidthMetres:28,
  furnaceMetres:1000,sackPoint:{x:1633,z:12,heading:.7}};
for(const extra of [{behindMetres:60.01},{behindMetres:-.01},{onFoot:true},{inBoneyard:true}])
  assert.deepEqual(stepBellowsPursuit({}, {...sackFacts,...extra}).state.sacksThrown,[]);
// One sack at a time, and it lands 45 m ahead of the car along the road (short of the thief by 8 m), so that the car
// drives into it (Claude's hand drive, 17 November: both burst at once at the car's own place).
const oneSack=stepBellowsPursuit({},sackFacts);
assert.deepEqual(oneSack.state.sacksThrown,[0]);
assert.equal(oneSack.state.clouds.length,1);
assert.deepEqual(stepBellowsPursuit(oneSack.state,sackFacts,5.9).state.sacksThrown,[0],'The second waits for the first cloud to settle.');
const lateSacks=stepBellowsPursuit(oneSack.state,sackFacts,6);
assert.deepEqual(lateSacks.state.sacksThrown,[0,1]);
for(const box of [...oneSack.state.clouds,...lateSacks.state.clouds]) {
  assert(Math.abs(box.x-(1633+Math.sin(.7)*45))<1e-9); assert(Math.abs(box.z-(12+Math.cos(.7)*45))<1e-9); assert.equal(box.yaw,.7);
  assert.equal(box.remaining,6); assert.equal(box.width,28); assert.equal(box.length,30);
}
assert(Math.abs(stepBellowsPursuit({},{...sackFacts,behindMetres:20}).state.clouds[0].x-(1633+Math.sin(.7)*12))<1e-9,'A car close behind him gets the ash 8 m short of him.');
console.log('PASS slice 11.1: launch latch, pace boundaries, recovery and sacks aimed at a nearby car.');

// Job 3.4: prove whole segments clear, rather than sampling points or driving.
const wreckSnapshot = JSON.stringify(BONEYARD_WRECKS);
const entry = ROAD_NET.road('tin-road').points[0];
const exit = LAND.at('boneyard', -284, 166);
const wreckRoute = bellowsWreckRoute(BONEYARD_WRECKS, entry, exit);
const clearance = Math.max(CAR_HALF_WIDTH, BELLOWS_RULE.thiefRadiusMetres) + BELLOWS_RULE.sideClearanceMetres;
for (const points of [wreckRoute.line, wreckRoute.wide]) {
  assert.deepEqual(points[0], {x:entry.x, z:entry.z});
  assert.deepEqual(points.at(-1), exit);
  for (let index = 1; index < points.length; index++) {
    for (const solid of SCABLANDS_SOLIDS) {
      assert.equal(sweepObstacle(points[index - 1], points[index], solid, 0,
        {halfWidth:clearance, halfLength:clearance}), null,
      `Segment ${index} needs the car width and one metre clear of ${solid.id}.`);
    }
  }
}
const turns = wreckRoute.line.slice(1, -1).map((point, index) => {
  const from = wreckRoute.line[index], to = wreckRoute.line[index + 2];
  const ax = point.x - from.x, az = point.z - from.z, bx = to.x - point.x, bz = to.z - point.z;
  return Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) /
    (Math.hypot(ax, az) * Math.hypot(bx, bz))))) * 180 / Math.PI;
});
assert(turns.filter(degrees => degrees >= BELLOWS_RULE.wreckTurnDegrees).length >= BELLOWS_RULE.wreckTurnCount);
// Each designated end is passed exactly 2.5 m clear, using that box's size.
for (const [id, segment, end] of [['east', 2, 'south'], ['north', 4, 'north'], ['south', 6, 'south']]) {
  const wreck = BONEYARD_WRECKS.find(row => row.id === id);
  const z = wreck.z + (end === 'north' ? -1 : 1) * wreck.size[2] / 2;
  for (const point of wreckRoute.line.slice(segment, segment + 2))
    assert.equal(Math.abs(point.z - z), BELLOWS_RULE.wreckEndClearanceMetres);
}
assert(wreckRoute.wideExtraMetres > 0);
assert.deepEqual(bellowsWreckRoute(BONEYARD_WRECKS, entry, exit), wreckRoute);
assert.equal(JSON.stringify(BONEYARD_WRECKS), wreckSnapshot);
// Moving the land moves the route with it; no absolute world coordinates.
const movedLand = {at:(id, dx = 0, dz = 0) => {
  const p = LAND.at(id, dx, dz); return {x:p.x + 137, z:p.z - 211};
}};
const shifted = bellowsWreckRoute(boneyardWrecks(movedLand),
  {x:entry.x + 137, z:entry.z - 211}, {x:exit.x + 137, z:exit.z - 211});
for (let index = 0; index < wreckRoute.line.length; index++)
  assert.deepEqual(shifted.line[index], {x:wreckRoute.line[index].x + 137, z:wreckRoute.line[index].z - 211});
assert(Math.abs(shifted.wideExtraMetres - wreckRoute.wideExtraMetres) < 1e-9);
console.log(`PASS Run Him Down: wreck ends clear by 2.5 m, ${turns.filter(degrees => degrees >= 40).length} turns, every segment clears all solids; wide way adds ${wreckRoute.wideExtraMetres.toFixed(1)} m.`);

// Job 3.2: speed, attempted passes and each sack's six-second road-width box.
assert.equal(bellowsThiefSpeedKmh(200, false), 180);
assert.equal(bellowsThiefSpeedKmh(130, false), 117);
assert.equal(bellowsThiefSpeedKmh(200, true), 60);
for (const [along, side, expected] of [
  [-30, -2, -1], [-30, 2, 1], [-30.01, 2, 0], [0, 2, 1], [0.01, 2, 0], [-5, 0, 0],
]) assert.equal(bellowsBlockingSide(along, side), expected);
const cloud = Object.freeze(bellowsAshBox('first', {x: 10, z: 20, heading: 0.7}, 12));
assert.deepEqual(cloud, {id: 'first', x: 10, z: 20, yaw: 0.7,
  length: 30, width: 12, remaining: 6});
const aged = stepBellowsAsh([cloud], 5);
assert.equal(aged[0].remaining, 1);
assert.equal(cloud.remaining, 6);
assert.deepEqual(stepBellowsAsh(aged, 1), []);
console.log('PASS Run Him Down: road speed, passing side and ash box lifetime.');

// Blocking reads the attempted pass in the road's frame, at any heading.
// These are one-step facts, without scripted controls or a driving route.
for (const heading of [0, .7, Math.PI / 2, Math.PI]) {
  const f = {x:Math.sin(heading), z:Math.cos(heading)};
  const r = {x:f.z, z:-f.x};
  const point = (along, across) => ({x:100 + f.x * along + r.x * across,
    z:200 + f.z * along + r.z * across});
  for (const side of [-1, 1]) {
    const from = Object.freeze(point(50, 0)), proposed = Object.freeze(point(51, 0));
    const moved = bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), point(30, side * 4), 12, .5);
    assert(Math.abs((moved.x - proposed.x) * r.x + (moved.z - proposed.z) * r.z - side) < 1e-9);
    assert(Math.abs((moved.x - proposed.x) * f.x + (moved.z - proposed.z) * f.z) < 1e-9);
    for (const along of [19.9, 50.1]) assert.deepEqual(
      bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), point(along, side * 4), 12, .5), proposed);
    const edge = bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), point(30, side * 40), 12, 10);
    assert(Math.abs((edge.x - proposed.x) * r.x + (edge.z - proposed.z) * r.z - side * (6 - BELLOWS_RULE.thiefRadiusMetres)) < 1e-9);
    const aligned = point(51, side * 4);
    assert.deepEqual(bellowsBlockingMove(point(50, side * 4), aligned, point(0, 0), point(100, 0), point(30, side * 4), 12, 1), aligned);
    for (const [player, width, dt] of [[null, 12, 1], [point(30, 4), 12, 0], [point(30, 4), 2, 1]])
      assert.deepEqual(bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), player, width, dt), proposed);
  }
}
console.log('PASS Run Him Down: blocking follows either passing side within the road and the 30 m approach.');

// Job 3.3 and 3.6: snapshots of contacts and loads, never a driving script.
const tick = (state = {}, facts = {}, dt = 0) => stepBellowsLoad(state, facts, dt);
assert.equal(tick().state.bellows, 100);
assert.equal(tick({}, {}, 10).state.bellows, 100);
const scorched = tick({}, {flameContact: true}, 2);
assert.equal(scorched.state.bellows, 70);
assert.deepEqual(scorched.events, [{type: 'say', lineId: 'bellows.warning'}]);
assert.equal(tick(scorched.state, {flameContact: true}, 10).state.bellows, 0);
assert.equal(tick(scorched.state, {flameContact: true}, 1).events.length, 0);
assert.equal(tick({}, {behindMetres: 100}).events[0].lineId, 'bellows.warning');
assert.equal(tick({}, {behindMetres: 100.01}).events.length, 0);
assert.equal(tick({}, {behindMetres: -1}).events.length, 0);
assert.equal(BELLOWS_LINES.warning, 'Cinder: Not the flamethrower! Leather burns.');

const hard = {carContact: true, carGapMetres: 3, meetingKmh: 20};
assert.equal(tick({}, {...hard, meetingKmh: 19.99}).state.knocks, 0);
let state = tick({}, hard).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, hard, 10).state.knocks, 1);
state = tick(state, {carGapMetres: 8}).state;
assert.equal(tick(state, hard).state.knocks, 1, 'Eight metres still holds the meeting.');
state = tick(state, {carGapMetres: 8.01}).state;
state = tick(state, hard).state;
assert.equal(state.knocks, 2);
state = tick(state, {carGapMetres: 9}).state;
const stopped = tick(state, hard);
assert.equal(stopped.state.knocks, BELLOWS_RULE.stopKnocks);
assert.equal(stopped.state.thiefStopped, true);
assert.equal(stopped.events.at(-1).type, 'thiefStopped');
assert.deepEqual(tick(stopped.state, {flameContact: true}, 9).state, stopped.state);
const soft = tick({}, {...hard, meetingKmh: 1}).state;
assert.equal(tick(soft, hard).state.knocks, 0, 'A soft touch must separate before a new knock.');
const wall = {solidContact: true, solidImpactKmh: 20};
state = tick({}, wall).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, wall).state.knocks, 1);
state = tick(state, {}).state;
assert.equal(tick(state, wall).state.knocks, 2);
assert.equal(tick({}, {...hard, ...wall}).state.knocks, 1);
assert.equal(tick({}, {...wall, solidImpactKmh: 19.99}).state.knocks, 0);
for (const [condition, pay, sentence] of [
  [100, 120, 'The bellows came back whole.'], [80, 120, 'The bellows came back whole.'],
  [79.99, 80, 'The bellows will patch.'], [40, 80, 'The bellows will patch.'],
  [39.99, 50, 'The bellows are scorched.'], [0, 50, 'The bellows are scorched.'],
]) {
  assert.equal(bellowsPay(condition), pay);
  assert.equal(bellowsSentence(condition), sentence);
}
const before = Object.freeze({bellows: 90, knocks: 1});
assert.deepEqual(tick(before, hard), tick(before, hard));
assert.deepEqual(before, {bellows: 90, knocks: 1});
// Flame costs depend on elapsed contact time, not how many frames are drawn.
let partitioned = {};
for (let frame = 0; frame < 120; frame++)
  partitioned = tick(partitioned, {flameContact: true}, 1 / 120).state;
assert(Math.abs(partitioned.bellows - tick({}, {flameContact: true}, 1).state.bellows) < 1e-9);
assert.equal(tick({}, {flameContact: true}, 0).state.bellows, 100);
const softWall = tick({}, {...wall, solidImpactKmh: 1}).state;
assert.equal(tick(softWall, wall).state.knocks, 0, 'Leaning against a solid is one meeting too.');
console.log('PASS Run Him Down: load, warning, separate meetings, three knocks and result boundaries.');

// Job 3.2 and 3.5: rules snapshots cross sack marks and reach the furnace.
const roadFacts = {roadMetres: 0, roadWidthMetres: 28, furnaceMetres: 1000, behindMetres:60,
  sackPoint: {x: 10, z: 20, heading: 1}};
const pursue = (state, facts = {}, dt = 0) => stepBellowsPursuit(state, {...roadFacts, ...facts}, dt);
assert.equal(pursue({}, {roadMetres: 799.99}).state.clouds.length, 0);
let pursuit = pursue({}, {roadMetres: 800});
assert.deepEqual(pursuit.state.sacksThrown, [0]);
assert.deepEqual(pursuit.events, [{type: 'thiefAsh', id: 'thief-ash-0'}]);
assert.equal(pursuit.state.clouds[0].width, 28);
const firstSack = pursuit.state;
pursuit = pursue(firstSack, {roadMetres: 800}, 6);
assert.deepEqual(pursuit.events, []);
assert.deepEqual(pursuit.state.clouds, []);
assert.equal(firstSack.clouds[0].remaining, 6, 'Stepping must not age the earlier snapshot.');
pursuit = pursue(pursuit.state, {roadMetres: 1600, sackPoint:{x:30,z:40,heading:2}});
assert.deepEqual(pursuit.state.sacksThrown, [0, 1]);
// The cloud lands 45 m ahead of the car along the road's heading (the car is 60 m behind him here).
assert(Math.abs(pursuit.state.clouds[0].x - (30 + Math.sin(2) * 45)) < 1e-9);
assert(Math.abs(pursuit.state.clouds[0].z - (40 + Math.cos(2) * 45)) < 1e-9);
assert.equal(pursue({}, {roadMetres: 2000}).state.clouds.length, 1, 'One sack is in the air at a time.');
assert.equal(pursue({}, {furnaceMetres: 400.01}).requests.length, 0);
pursuit = pursue(pursuit.state, {furnaceMetres: 400});
assert.deepEqual(pursuit.requests, [{type: 'bellowsRiders'}]);
assert.equal(pursue(pursuit.state, {furnaceMetres: 100}).requests.length, 0);
assert.equal(pursue(pursuit.state, {furnaceMetres: 30.01}).events.length, 0);
const waitingAtGate = pursue({...pursuit.state, bellows:37}, {furnaceMetres:0}, 30);
assert.equal(waitingAtGate.state.bellows, 37);
assert.equal(waitingAtGate.state.returnNotice, undefined);
assert.deepEqual(waitingAtGate.requests, []);
const loadedChase = {...pursuit.state, leftTownGate:true, bellows:37, knocks:2, meetingHeld:true, solidHeld:true};
const restarted = pursue(loadedChase, {furnaceMetres: 30});
// The furnace's crew has had its hands on them: each arrival takes 25 from the bellows (it was a restart that cost nothing
// and could turn for ever; Claude's redesign of 17 November).
assert.equal(restarted.state.bellows, 12);
assert.equal(restarted.state.furnaceArrivals, 1);
assert.deepEqual(restarted.state.returnNotice, {text:BELLOWS_LINES.restart, remaining:captionSeconds(BELLOWS_LINES.restart)});
assert.deepEqual(restarted.requests, []);
let reading = pursue(restarted.state, {furnaceMetres:30, recovering:true}, 10);
assert.deepEqual(reading.state.returnNotice, restarted.state.returnNotice, 'A fighter or car recovery cannot spend the unseen notice.');
reading = pursue(reading.state, {furnaceMetres:30}, reading.state.returnNotice.remaining - 1/120);
assert.deepEqual(reading.requests, []);
assert.equal(reading.state.furnaceArrivals, 1);
const moved = pursue(reading.state, {furnaceMetres:30}, 1/120);
assert.deepEqual(moved.requests, [{type:'bellowsRestart', leadMetres:150}]);
assert.deepEqual(moved.events, [{type:'bellowsRestart'}]);
assert.equal(moved.state.returnNotice, null);
assert.deepEqual(pursue(moved.state, {furnaceMetres:100}).requests, []);
const secondArrival = pursue(moved.state, {furnaceMetres:30});
assert.equal(secondArrival.state.bellows, 0, 'The bellows never go below 0.');
assert.equal(secondArrival.state.furnaceArrivals, 2);
assert.equal(restarted.state.knocks, 2);
assert.equal(restarted.state.ridersStarted, true);
assert.deepEqual(restarted.state.sacksThrown, [0, 1]);
assert.deepEqual(restarted.state.clouds, []);
assert.equal(restarted.state.meetingHeld, false);
assert.equal(restarted.state.solidHeld, false);
assert.equal(pursue({...loadedChase, thiefStopped: true}, {furnaceMetres: 0}).requests.length, 0);
console.log('PASS Run Him Down: two sacks, furnace riders and restart preserve the load.');

// Job 3.6: the player must collect the bellows; proximity while walking or
// driving through the circle cannot bank the load or send the furnace away.
const endingFacts = {onFoot: false, playerSpeedKmh: 0, carGapMetres: 8};
const end = (state, facts = {}, dt = 0) => stepBellowsEnding(state, {...endingFacts, ...facts}, dt);
assert.equal(end({}).complete, false);
const captured = {thiefStopped: true, bellows: 70, knocks: 3};
for (const facts of [{onFoot: true}, {playerSpeedKmh: 1}, {playerSpeedKmh: -1}, {carGapMetres: 8.01}]) {
  const waiting = end(captured, facts, 9);
  assert.equal(waiting.complete, false);
  assert.equal(waiting.state.bellowsLoaded, undefined);
  assert.deepEqual(waiting.requests, [{type: 'bellowsThiefFlee'}]);
}
let ending = end(captured, {}, 0);
assert.equal(ending.complete, false);
assert.deepEqual(ending.events, [{type: 'bellowsLoaded'}]);
// Stopped on the road, the furnace is only heard leaving; among the wrecks it is seen (17 November 2026: "There it goes,
// out the far end" was said on the road too, of a furnace two kilometres away).
assert.deepEqual(ending.requests, [{type: 'bellowsThiefFlee'}, {type: 'bellowsFurnaceLeave'},
  {type: 'say', lineId: 'bellows.road'}]);
assert.deepEqual(end(captured, {inBoneyard: true}, 0).requests, [{type: 'bellowsThiefFlee'}, {type: 'bellowsFurnaceLeave'},
  {type: 'say', lineId: 'story.ember.cinder.22'}]);
assert.ok(BELLOWS_LINES.road.startsWith('Cinder: He was taking the bellows to the furnace.'));
ending = end(ending.state, {}, 8.99);
assert.equal(ending.complete, false);
assert.deepEqual(ending.requests, [{type: 'say', lineId: 'bellows.patch'}]);
ending = end(ending.state, {}, .01);
assert.equal(ending.complete, true);
assert.deepEqual(ending.events, [{type: 'bellowsArrived', bellows: 70, knocks: 3,
  pay: 80, sentence: 'The bellows will patch.'}]);
assert.deepEqual(end(ending.state, {}, 10).events, []);
const lateCollection = end(end(captured, {carGapMetres: 100}, 20).state);
assert.equal(lateCollection.complete, false);
assert.equal(lateCollection.state.endingElapsed, 0);
assert.equal(lateCollection.events.filter(event => event.type === 'bellowsArrived').length, 0);
assert(lateCollection.requests.some(request => request.type === 'bellowsFurnaceLeave'));
assert.equal(end(lateCollection.state, {}, 8.99).complete, false);
assert.equal(end(lateCollection.state, {}, 9).complete, true);
assert.deepEqual(end(Object.freeze(captured)), end(Object.freeze(captured)));
console.log('PASS Run Him Down: theft escape, collection, furnace departure and nine-second ending.');

// Exercise the ordinary job engine with snapshots, without a driver. The
// bellows chase must not inherit the old health, contact or leash shortcuts.
const chaseStep = {kind: 'chase', bellows: true, targetId: 'thief',
  townGate:{position:{x:0,z:0}, through:{x:0,z:-1}, opening:9},
  path: [{position: {x: 0, z: 0}}, {position: {x: 2000, z: 0}}]};
const chaseView = {onFoot: false, speedKmh: 0, carPosition: {x: 0, z: 0},
  player: {position: {x: 0, z: 0}},
  actors: [{id: 'thief', health: 0, position: {x: 3, z: 0}}], contact: 'thief',
  bellows: {...roadFacts, behindMetres:Infinity, playerTopSpeedKmh: 200}};
let chase = createJob({steps: [chaseStep]}, 17);
const missing = stepJob(chase, {...chaseView, actors: []}, 100);
assert.equal(missing.done, false);
assert.equal(missing.stepState.bellows, undefined);
assert.equal(missing.requests.find(request => request.type === 'follow').speed, 0);
chase = stepJob(chase, chaseView);
assert.equal(chase.done, false, 'Health zero and proximity cannot stop the thief.');
assert.equal(chase.stepState.knocks, 0);
assert.equal(chase.requests.find(request => request.type === 'follow').speed, BELLOWS_RULE.launchSpeedKmh / 3.6, 'He waits at the gate.');
assert.equal(chase.requests.find(request => request.type === 'follow').actorId, 'thief');
chase = stepJob(chase, {...chaseView, carPosition: {x: -10000, z: 0}});
assert.equal(chase.failedStep, false, 'The bellows chase has no old distance leash.');
const warning = stepJob(chase, {...chaseView,
  bellows: {...chaseView.bellows, flameContact: true}}, 1);
assert.equal(warning.stepState.bellows, 85);
assert(warning.requests.some(request => request.type === 'say' && request.lineId === 'bellows.warning'));
for (let knock = 0; knock < 3; knock++) {
  chase = stepJob(chase, {...chaseView, bellows: {...chaseView.bellows, ...hard}});
  assert.equal(chase.stepState.knocks, knock + 1);
  if (knock < 2) chase = stepJob(chase, {...chaseView, carPosition: {x: -10, z: 0}});
}
assert.equal(chase.done, false);
assert.equal(chase.stepState.bellowsLoaded, true);
assert.equal(chase.requests.find(request => request.type === 'follow').speed, 0);
assert(chase.requests.some(request => request.type === 'bellowsThiefFlee'));
chase = stepJob(chase, chaseView, 5);
chase = stepJob(chase, chaseView, 4);
assert.equal(chase.done, true);
assert(chase.events.some(event => event.type === 'bellowsArrived' && event.knocks === 3));
assert(chase.events.some(event => event.type === 'done'));
assert.equal(chaseView.actors[0].health, 0, 'The rule never writes into an actor snapshot.');
const atGate = stepJob(createJob({steps:[chaseStep]}), chaseView);
let retry = stepJob(atGate, {...chaseView, carPosition:{x:0,z:1},
  bellows: {...chaseView.bellows, flameContact: true, furnaceMetres: 30}}, 2);
assert.equal(retry.failedStep, false, 'Restarting the route must not reset the job state.');
// Two seconds of flame take 30, and the arrival at the furnace 25 more.
assert.equal(retry.stepState.bellows, 45);
assert(!retry.requests.some(request => request.type === 'bellowsRestart'));
assert(retry.requests.some(request => request.type === 'say' && request.lineId === 'bellows.warning'));
assert.equal(retry.stepState.returnNotice.text, BELLOWS_LINES.restart);
retry = stepJob(retry, chaseView, retry.stepState.returnNotice.remaining);
assert(retry.requests.some(request => request.type === 'bellowsRestart' && request.leadMetres === 150));
assert(!retry.requests.some(request => request.lineId === 'bellows.restart'), 'The return reason is displayed once.');
const footAtGate = {...chaseView, onFoot:true, carPosition:{x:0,z:1}, fighter:{position:{x:0,z:-1}},
  bellows:{...chaseView.bellows, furnaceMetres:0}};
const parkedOutside = stepJob(createJob({steps:[chaseStep]}), footAtGate, 30);
assert.equal(parkedOutside.stepState.returnNotice, undefined, 'A parked car outside cannot stand in for its driver.');
const walkedOut = stepJob(parkedOutside, {...footAtGate, fighter:{position:{x:0,z:1}}});
assert.equal(walkedOut.stepState.returnNotice.text, BELLOWS_LINES.restart);
const finalKnock = createJob({steps: [chaseStep]});
finalKnock.stepState = {bellows: 70, knocks: 2};
retry = stepJob(finalKnock, {...chaseView,
  bellows: {...chaseView.bellows, ...hard, furnaceMetres: 30}});
assert.equal(retry.stepState.thiefStopped, true);
assert.equal(retry.stepState.bellows, 70);
assert(!retry.requests.some(request => request.type === 'bellowsRestart'),
  'A third knock wins before the same step can restart at the furnace.');
console.log('PASS Run Him Down: existing chase engine uses knocks, captions, collection and hold.');

// Job 3.3: the gauge reads the load before boarding, during the chase and
// through collection. It must never change the rule state it presents.
const {worldHudModel, drawBellowsGauge} = await import('../src/world/world-hud.js');
for (const onFoot of [true, false]) {
  for (const condition of [undefined, 100, 79, 40, 0]) {
    const ruleState = Object.freeze(condition === undefined ? {} : {bellows: condition, bellowsLoaded: true});
    const job = Object.freeze({steps: [chaseStep], stepIndex: 0, stepState: ruleState});
    const worldJob = Object.freeze({job, actors: chaseView.actors});
    const before = JSON.stringify(worldJob);
    const hud = worldHudModel({worldJob, onFoot});
    assert.deepEqual(hud.bellows, {value: condition ?? 100, max: 100});
    assert.equal(JSON.stringify(worldJob), before);
    const removed = [], properties = {}, attributes = {};
    const gauge = {style: {setProperty: (name, value) => { properties[name] = value; }},
      classList: {remove: (...names) => removed.push(...names)},
      setAttribute: (name, value) => { attributes[name] = value; }};
    const bar = {style: {}}, label = {}, note = {};
    drawBellowsGauge(hud.bellows, gauge, bar, label, note);
    assert.equal(label.textContent, 'BELLOWS');
    assert.equal(bar.style.width, `${(condition ?? 100).toFixed(1)}%`);
    assert.equal(note.textContent, `${condition ?? 100} / 100`);
    assert.equal(attributes['aria-label'], bellowsSentence(condition ?? 100));
    assert.deepEqual(removed, ['is-out', 'is-losing', 'is-flashing']);
    assert.equal(properties['--ember-glow'], ((condition ?? 100) / 100).toFixed(2));
  }
}
assert.equal(worldHudModel().bellows, null);
assert.equal(worldHudModel({worldJob: {job: {steps: [{kind:'chase'}], stepIndex:0,
  stepState: {bellows: 50}}}}).bellows, null);
console.log('PASS Run Him Down: bellows gauge shows the rule load and clears ember styles without changing rules.');

// Job 3.1: start through the real arena path, with memory-only saves. No
// scripted walking is needed to prove the existing fighter can return to the car.
const {App} = await import('../src/app.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');

const {stepFootTransition, fighterDistanceToCar} = await import('../src/onfoot-transition.js');
const memory = new Map();
globalThis.localStorage = {getItem:key => memory.get(key) ?? null,
  setItem:(key, value) => memory.set(key, String(value)), removeItem:key => memory.delete(key)};
globalThis.cancelAnimationFrame ??= () => {};
const app = new App();
app.audio.unlock = () => {};
app.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
const savedBeforeStart = JSON.stringify([...memory]);
const definition = EVERBURN_JOBS[2], town = EVERBURN_JOBS[1].steps[0];
const routeDefinition = definition.steps[0].bellowsRoute;
assert.equal(definition.steps[0].bellows, true);
assert.deepEqual(definition.steps[0].path, [...routeDefinition.road, ...routeDefinition.wrecks.slice(1)]);
assert.equal(definition.steps[0].roadWidthMetres, routeDefinition.roadWidthMetres);
assert.equal(definition.captions['bellows.warning'], BELLOWS_LINES.warning);
assert.equal(definition.captions['bellows.restart'], BELLOWS_LINES.restart);
assert.deepEqual(routeDefinition.wrecks.map(place => ({x:place.position.x, z:place.position.z})), wreckRoute.line);
assert.deepEqual(routeDefinition.road.at(-1).position, routeDefinition.wrecks[0].position);
assert.equal(routeDefinition.roadWidthMetres, ROAD_NET.road('tin-road').halfWidth * 2);
assert.equal(routeDefinition.wideExtraMetres, wreckRoute.wideExtraMetres);
assert.deepEqual(routeDefinition.road.slice(1).map(place => ({x:place.position.x, z:place.position.z})),
  [...ROAD_NET.road('tin-road').points].reverse().map(point => ({x:point.x, z:point.z})));
app.duel.state.wastelandGateDiscovered = true;
assert.equal(app.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:app.player.id, seed:1989, opponents:[], job:definition}), true);
const duel = app.duel, playerState = duel.state;
assert.equal(playerState.onFoot, true);
assert(playerState.fighter && playerState.footTransition && playerState.footWeapons);
const bay = duel.course.groundAt(playerState.s, playerState.lateral);
// The start is toward the pump lamp since 17 November 2026: job 2's third lamp, which gave the side before, moved in
// beside the radio mast on the other side of the bay (the card, "Job 2, slice 13").
const far = town.places.find(lamp => lamp.id === 'pump').position;
assert(Math.hypot(bay.x - town.carStart.x, bay.z - town.carStart.z) < 1e-6);
assert(Math.abs(fighterDistanceToCar(duel) - BELLOWS_RULE.footStartFromCarMetres) < 1e-6);
assert((playerState.fighter.x - bay.x) * (far.x - bay.x) +
  (playerState.fighter.z - bay.z) * (far.z - bay.z) > 0,
  'The player starts on the pump lamp side of the bay.');
assert.equal(playerState.speedMph, 0);
assert.equal(JSON.stringify([...memory]), savedBeforeStart, 'The start writes no saved fields.');
playerState.status = 'racing'; playerState.countdown = 0;
const beforeWalk = {...playerState.fighter};
playerState.fighterInput = {forward:1};
stepFootTransition(duel, 1 / 120);
assert(Math.hypot(playerState.fighter.x - beforeWalk.x,
  playerState.fighter.z - beforeWalk.z) > 0, 'The normal fighter can walk from the starting point.');
playerState.fighterInput = {};
Object.assign(playerState.fighter, {x:bay.x, y:bay.y, z:bay.z,
  s:playerState.s, lateral:playerState.lateral, groundY:bay.y});
playerState.input.interact = true;
for (let n = 0; n < 120 && playerState.onFoot; n++) stepFootTransition(duel, 1 / 120);
assert.equal(playerState.onFoot, false, 'The normal hold-F transition returns the player to the car.');
assert.equal(JSON.stringify([...memory]), savedBeforeStart);
app.returnToMenu(); app.dispose?.();
console.log('PASS Run Him Down: real arena starts the existing fighter 60 m from the parked bay car.');

// Jobs 3.2, 3.3 and 3.6: the same load moves between roofs; opaque ash uses
// the rule's road box, expires and cannot leave a drawing in another job.
const {createBellowsView} = await import('../src/world/bellows-view.js');
const THREE = await import('three');
const drawing = createBellowsView({groundAt: () => ({x: 10, y: 2, z: 20}),
  nearest: () => ({s: 1, lateral: 2}), at: () => ({heading: .4})});
const loadState = {s: 1, lateral: 2, headingError: .2, onFoot: true,
  arena: {mode: 'world-job', worldJob: {actors: [{id: 'thief',
    position: {x: 100, y: 3, z: 200}, heading: .7}],
    job: {steps: [chaseStep], stepIndex: 0, stepState: {clouds: [cloud]}}}}};
const beforeDrawing = JSON.stringify(loadState);
drawing.update(loadState);
assert.equal(drawing.group.visible, true);
assert.equal(drawing.load.visible, true);
assert.deepEqual(drawing.load.position.toArray(), [100, 3 + BELLOWS_RULE.roofLoadLift, 200]);
assert.equal(drawing.load.rotation.y, .7);
const drawnAsh = drawing.clouds.get('first');
assert.deepEqual(drawnAsh.scale.toArray(), [cloud.width, BELLOWS_RULE.ashHeightMetres, cloud.length]);
assert.deepEqual(drawnAsh.position.toArray(), [cloud.x, 2 + BELLOWS_RULE.ashHeightMetres / 2, cloud.z]);
assert.equal(drawnAsh.rotation.y, cloud.yaw);
assert.equal(drawnAsh.material.transparent, false);
assert.equal(drawnAsh.material.side, THREE.DoubleSide);
assert.equal(drawnAsh.material.depthWrite, true);
assert.equal(JSON.stringify(loadState), beforeDrawing, 'Drawing must not write any job fact.');
drawing.update(loadState,()=>.8);
assert.ok(Math.abs(drawing.load.position.y-(3+BELLOWS_RULE.roofLoadLift+.8))<1e-8,'The bellows follow their carrier on the drawn ground.');
assert.ok(Math.abs(drawnAsh.position.y-(2+BELLOWS_RULE.ashHeightMetres/2+.8))<1e-8,'The ash cloud follows the drawn ground.');
drawing.update(loadState);
assert.equal(drawing.clouds.get('first'), drawnAsh, 'A living cloud reuses its mesh.');
loadState.arena.worldJob.job.stepState = {bellowsLoaded: true, clouds: [{...cloud, remaining: 0}]};
drawing.update(loadState);
assert.deepEqual(drawing.load.position.toArray(), [10, 2 + BELLOWS_RULE.roofLoadLift, 20]);
assert(Math.abs(drawing.load.rotation.y - .6) < 1e-9);
assert.equal(drawing.clouds.size, 0);
assert.equal(drawnAsh.parent, null);
drawing.update({arena: {mode: 'race'}});
assert.equal(drawing.group.visible, false);
assert.equal(drawing.load.visible, false);
const released = [];
for (const resource of [drawing.load.geometry, drawing.load.material, drawnAsh.geometry, drawnAsh.material])
  resource.addEventListener('dispose', () => released.push(resource));
drawing.dispose();
assert.equal(new Set(released).size, 4);
assert.equal(drawing.group.children.length, 0);
console.log('PASS Run Him Down: roof transfer, opaque road ash, read-only drawing and cleanup.');

// Job 3.7: the actual arena event bridge selects procedural bank recipes,
// places each sound, and leaves the rule snapshots untouched.
const {playBellowsEvent} = await import('../src/arena/modes/world-job.js');
const {SOUND_BANK} = await import('../src/sound-bank.js');
const heard = [];
const listener = {emit:event => heard.push(event)};
const audioJob = Object.freeze({job:Object.freeze({stepState:Object.freeze({clouds:Object.freeze([cloud])})})});
const parked = Object.freeze({x:1, y:2, z:3});
const beforeAudio = JSON.stringify(audioJob);
const ashEvent = Object.freeze({type:'thiefAsh', id:'first'});
assert.equal(playBellowsEvent(listener, audioJob, chaseStep, ashEvent, parked), true);
assert.equal(playBellowsEvent(listener, audioJob, chaseStep, {type:'bellowsLoaded'}, parked), true);
assert.deepEqual(heard.map(event => event.arenaTell), [
  {id:'first', targetId:'player', seconds:0, cue:'world.thief.ash',
    position:{x:cloud.x, y:parked.y, z:cloud.z}},
  {id:'bellows-load', targetId:'player', seconds:0, cue:'world.bellows.load', position:{...parked}},
]);
for (const cueId of ['world.thief.ash', 'world.bellows.load']) {
  const recipe = SOUND_BANK[cueId];
  assert(recipe.layers.length > 0);
  assert(!recipe.files?.length, 'These cues must use bank recipes without new audio files.');
}
assert.equal(playBellowsEvent(listener, audioJob, {kind:'chase'}, ashEvent, parked), false);
assert.equal(playBellowsEvent(listener, audioJob, chaseStep, {type:'say'}, parked), false);
assert.equal(heard.length, 2);
assert.equal(JSON.stringify(audioJob), beforeAudio);
assert.deepEqual(parked, {x:1, y:2, z:3});
console.log('PASS Run Him Down: sack and loading sounds use bank recipes and read-only event positions.');

// Job 3.5 and 3.6: the furnace waits at the wing gap until collection.
// Stopping the thief, waiting, or reading the scene cannot release it.
const {furnaceSighting, FURNACE_LEAVING} = await import('../src/world/jobs/furnace-sightings.js');
const {applyBellowsFurnaceLeave} = await import('../src/arena/modes/world-job.js');
const furnaceJob = {definition:{storyId:'everburn', number:3}, clockSec:0,
  job:{steps:[chaseStep], stepIndex:0, stepState:{}}};
const waiting = furnaceSighting(furnaceJob);
assert.equal(waiting.x, FURNACE_LEAVING.from.x);
assert.equal(waiting.z, FURNACE_LEAVING.from.z);
furnaceJob.wonAtSec = 0;
furnaceJob.clockSec = 100;
furnaceJob.job.stepState.thiefStopped = true;
const beforeSighting = JSON.stringify(furnaceJob);
assert.deepEqual(furnaceSighting(furnaceJob), waiting);
assert.equal(JSON.stringify(furnaceJob), beforeSighting);
const horns = [];
const hornListener = {emit:event => horns.push(event)};
assert.equal(applyBellowsFurnaceLeave(hornListener, furnaceJob, {type:'follow'}), false);
const release = {type:'bellowsFurnaceLeave'};
assert.equal(applyBellowsFurnaceLeave(hornListener, furnaceJob, release), true);
assert.equal(furnaceJob.bellowsLeavingAtSec, 100);
assert.equal(horns.length, 1);
assert.equal(horns[0].arenaTell.cue, 'world.furnace.horn');
assert.equal(horns[0].arenaTell.position.x, waiting.x);
assert.equal(horns[0].arenaTell.position.z, waiting.z);
assert.deepEqual(furnaceSighting(furnaceJob), waiting);
furnaceJob.clockSec += FURNACE_LEAVING.seconds / 2;
applyBellowsFurnaceLeave(hornListener, furnaceJob, release);
assert.equal(horns.length, 1);
assert.equal(furnaceJob.bellowsLeavingAtSec, 100);
const halfway = furnaceSighting(furnaceJob);
assert.equal(halfway.x, (FURNACE_LEAVING.from.x + FURNACE_LEAVING.to.x) / 2);
assert.equal(halfway.z, (FURNACE_LEAVING.from.z + FURNACE_LEAVING.to.z) / 2);
furnaceJob.clockSec += FURNACE_LEAVING.seconds / 2;
assert.deepEqual(furnaceSighting(furnaceJob), {hidden:true});
const oldChase = {...furnaceJob, clockSec:0, wonAtSec:undefined,
  job:{steps:[{kind:'chase'}], stepIndex:0, stepState:{}}};
assert.equal(furnaceSighting(oldChase), null);
applyBellowsFurnaceLeave(hornListener, oldChase, release);
assert.equal(horns.length, 1);
console.log('PASS Run Him Down: furnace waits, horns once at collection, leaves and disappears.');

// Job 3.6: stopping the car releases one unarmed foot actor. The same
// mover used by the other job raiders carries him away from the player.
const {applyBellowsThiefFlee, stepWorldJob} = await import('../src/arena/modes/world-job.js');
// A review of slice 12 found the step's order turned round: the car's meetings with the thief were cleared for the riders
// before job 3 read them, so no knock could count in the real step. One hard meeting in the real step is one knock.
{
  const app = new App(); app.audio.unlock = () => {};
  app.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
    'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
  app.duel.state.wastelandGateDiscovered = true;
  assert(app.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
    car:'falcone_f42', playerId:app.player.id, seed:1989, opponents:[], job:definition}));
  const duel = app.duel, state = duel.state, world = state.arena.worldJob;
  state.status = 'racing'; state.countdown = 0; state.onFoot = false;
  stepWorldJob(duel, 1 / 60);
  const thief = world.actors.find(actor => actor.id === world.job.steps[0].targetId);
  assert(thief, 'The thief is an actor of the real job.');
  assert.equal(world.job.stepState.knocks ?? 0, 0);
  world.carContacts = [{actor:thief, kmh:BELLOWS_RULE.hardKnockKmh + 5, nx:0, nz:1}];
  stepWorldJob(duel, 1 / 60);
  assert.equal(world.job.stepState.knocks, 1, 'A hard meeting with the thief in the real step counts one knock.');
  assert.deepEqual(world.carContacts, [], 'The meetings are cleared once they have been read.');
}
const escapeApp = new App(); escapeApp.audio.unlock = () => {};
escapeApp.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
escapeApp.duel.state.wastelandGateDiscovered = true;
assert(escapeApp.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:escapeApp.player.id, seed:1989, opponents:[], job:definition}));
const escapeDuel = escapeApp.duel, escapeState = escapeDuel.state;
escapeState.onFoot = false;
const escapeJob = escapeState.arena.worldJob;
const carAt = escapeDuel.course.worldAt(escapeState.s, escapeState.lateral);
const stoppedCar = {id:'thief', position:{x:carAt.x + 12, y:carAt.y, z:carAt.z}, heading:0,
  health:20, renderCar:'dusthawk_rally'};
escapeJob.actors = [stoppedCar];
escapeJob.job = createJob({steps:[chaseStep]}, 1989);
escapeJob.job.stepState = {thiefStopped:true, bellows:70, knocks:3};
const savedBeforeEscape = JSON.stringify([...memory]);
const raidCount = escapeState.raids?.zones.length ?? 0;
assert.equal(applyBellowsThiefFlee(escapeDuel, escapeJob, {type:'follow'}), false);
stepWorldJob(escapeDuel, 0);
const runner = escapeJob.actors.find(actor => actor.bellowsThief);
assert(runner, 'The ending request must reach the arena actor bridge.');
assert.equal(runner.approachSpeed, BELLOWS_RULE.thiefRunMps);
assert(Math.abs(Math.hypot(runner.x - stoppedCar.position.x,
  runner.z - stoppedCar.position.z) - BELLOWS_RULE.thiefExitMetres) < 1e-6);
assert.equal(runner.groundY, undefined, 'The foot mover owns his current floor.');
const parkedBeforeEscape = JSON.stringify(stoppedCar.position);
const beforeEscape = {x:runner.x, z:runner.z};
assert.equal(applyBellowsThiefFlee(escapeDuel, escapeJob, {type:'bellowsThiefFlee'}), true);
assert.equal(escapeJob.actors.filter(actor => actor.bellowsThief).length, 1);
// Flat test ground isolates the existing foot mover from the unfinished wreck
// route. No driving or walking controls are supplied to this rule snapshot.
escapeDuel.course.def = {...escapeDuel.course.def, scablands:false};
stepWorldJob(escapeDuel, .5);
assert(Math.abs(Math.hypot(runner.x - beforeEscape.x,
  runner.z - beforeEscape.z) - BELLOWS_RULE.thiefRunMps * .5) < 1e-6);
assert(runner.x > beforeEscape.x, 'He runs away from the player.');
assert.equal(JSON.stringify(stoppedCar.position), parkedBeforeEscape);
assert.equal(escapeState.raids?.zones.length ?? 0, raidCount, 'He cannot join a shooting raid.');
assert.equal(JSON.stringify([...memory]), savedBeforeEscape);

const escapeDrawing = createBellowsView(escapeDuel.course);
escapeDrawing.update(escapeState);
assert.equal(escapeDrawing.figures.group.visible, true);
assert(escapeDrawing.figures.group.children[0].count > 0, 'The fleeing actor is drawn.');
const beforeEscapeDrawing = JSON.stringify(runner);
escapeDrawing.update(escapeState);
assert.equal(JSON.stringify(runner), beforeEscapeDrawing, 'Drawing never moves the thief.');
escapeDrawing.update({arena:{mode:'race'}});
assert.equal(escapeDrawing.figures.group.visible, false);
assert.equal(escapeDrawing.figures.group.children[0].count, 0);
escapeDrawing.dispose();
// The actor bridge applies blocking only to the remade thief. Use flat ground
// to isolate steering from the still undecided Boneyard route.
const blockingPath = [{position:{x:carAt.x - 4, z:carAt.z - 50}},
  {position:{x:carAt.x - 4, z:carAt.z + 100}}];
const blockingStep = {...chaseStep, path:blockingPath, roadWidthMetres:12,
  actor:{id:'thief', path:blockingPath}};
for (const [remade, onFoot, expectedShift] of [[true, false, 1], [false, false, 0], [true, true, 0]]) {
  escapeState.onFoot = onFoot;
  escapeJob.job = createJob({steps:[{...blockingStep, bellows:remade}]});
  escapeJob.actors = [{id:'thief', health:20, renderCar:'dusthawk_rally', pathIndex:1,
    position:{x:carAt.x - 4, y:carAt.y, z:carAt.z + 20}}];
  escapeJob.follow = {actorId:'thief', speed:10};
  stepWorldJob(escapeDuel, .5);
  assert(Math.abs(escapeJob.actors[0].position.x - (carAt.x - 4) - expectedShift) < 1e-9);
}
assert.equal(JSON.stringify([...memory]), savedBeforeEscape);
escapeApp.returnToMenu(); escapeApp.dispose?.();
console.log('PASS Run Him Down: stopped thief runs once through the existing foot mover and read-only figures.');
console.log('PASS Run Him Down: arena mover blocks a driving pass only in the remade chase.');

// Follow the solid as the thief runs. Once he stops, a car can nose up to him.
{
  const {Duel} = await import('../src/game.js');
  const {placeActor} = await import('../src/arena/arena-event.js');
  const {moveJobRaiders} = await import('../src/arena/modes/world-job.js');
  const duel = new Duel({seed:1989, featureFlags:{'hidden-road':true,'story-everburn':true,'scablands-realism':true}});
  duel.state.wastelandGateDiscovered = true;
  assert(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:1989,opponents:[],job:definition}));
  const state = duel.state, world = state.arena.worldJob;
  Object.assign(state, {onFoot:false, fighter:null, status:'racing', countdown:0});
  duel.step(1/120);
  const placeCar = (x,z,heading,speedKmh) => {
    const p = duel.course.nearest(x,z);
    placeActor(duel,state,{...p,headingError:heading-duel.course.at(p.s).heading},speedKmh/1.609344);
  };
  // The parked car and a straight, empty stretch of real ground isolate this collision.
  const parked = world.actors.find(actor => actor.id === definition.steps[0].targetId);
  const road = duel.course.nearest(100,0);
  parked.position = duel.course.groundAt(road.s,road.lateral);
  placeCar(100,-12,0,0);
  world.job.stepState.thiefStopped = true;
  applyBellowsThiefFlee(duel,world,{type:'bellowsThiefFlee'});
  const runner = world.actors.find(actor=>actor.bellowsThief), start = {...runner};
  for(let n=0;n<60;n++) moveJobRaiders(duel,world,1/60);
  assert.ok(Math.abs(Math.hypot(runner.x-start.x,runner.z-start.z)-BELLOWS_RULE.thiefRunMps)<1e-6,
    'The thief can leave his own previous collider.');
  const solid = world.solidGrid.near(runner.x,runner.z,runner.x,runner.z,2).find(item=>item.id===runner.id);
  assert.deepEqual([solid.x,solid.minY,solid.z], [runner.x,runner.y,runner.z], 'The collider follows the thief on his floor.');
  assert.equal(solid.verticalClearance, true, 'Actors on another floor can pass above or below him.');
  runner.approachTarget = {x:runner.x,z:runner.z};
  placeCar(runner.x+12,runner.z,-Math.PI/2,20);
  for(let tick=0;tick<400;tick++){duel.setInput({throttle:1});duel.step(1/120);}
  const car = duel.course.worldAt(state.s,state.lateral);
  assert.ok(car.x>runner.x+2 && car.x<runner.x+4 && Math.abs(car.z-runner.z)<.1,'The car arrives and stops short of him.');
}

// The live bridge reads swept meetings, not closeness or weapon buttons.
const {bellowsArenaFacts} = await import('../src/arena/modes/world-job.js');
const factsApp = new App(); factsApp.audio.unlock = () => {};
factsApp.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
factsApp.duel.state.wastelandGateDiscovered = true;
assert(factsApp.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:factsApp.player.id, seed:1989, opponents:[], job:definition}));
const factsDuel = factsApp.duel, factsState = factsDuel.state;
const factsJob = factsState.arena.worldJob;
const factsStep = {...definition.steps[0], bellows:true};
const roadPlaces = factsStep.bellowsRoute.road;
const thiefAt = {...roadPlaces[2].position};
factsJob.actors = [{id:factsStep.targetId, position:thiefAt, pathIndex:3,
  bellowsSolidContact:false, bellowsSolidImpactKmh:0}];
factsState.onFoot = false;
factsState.input.fire = true;
const factsSaved = JSON.stringify([...memory]);
const readFacts = hits => bellowsArenaFacts(factsDuel, factsJob, factsStep, hits).bellows;
let measured = readFacts([]);
assert.equal(measured.flameContact, false);
assert.equal(measured.carContact, false);
assert.equal(measured.meetingKmh, 0);
assert.equal(measured.inBoneyard, false);
assert(measured.roadMetres > 0);
assert(Number.isFinite(measured.sackPoint.x));
assert(Number.isFinite(measured.sackPoint.z));
assert.equal(measured.roadWidthMetres, routeDefinition.roadWidthMetres);
const thiefPose = factsDuel.course.nearest(thiefAt.x, thiefAt.z);
assert.equal(measured.playerTopSpeedKmh,
  factsDuel._drivingSurface(thiefPose.s, thiefPose.lateral).speedLimit * 1.609344);
factsJob.carContacts = [{actor:factsJob.actors[0], kmh:31}, {actor:{id:'other'}, kmh:90}];
const contactsBefore = JSON.stringify(factsJob.carContacts);
measured = readFacts([{id:factsStep.targetId, flame:true}]);
assert.equal(measured.flameContact, true);
assert.equal(measured.carContact, true);
assert.equal(measured.meetingKmh, 31);
assert.equal(JSON.stringify(factsJob.carContacts), contactsBefore);
assert.equal(readFacts([{id:'other', flame:true}]).flameContact, false);
const {reportWorldJobThingHit} = await import('../src/arena/modes/world-job.js');
factsState.worldJobThingsHit=[];
for (const [hitId,weapon] of [['first','rpg'],['second','crossbow']]) {
  assert.equal(reportWorldJobThingHit(factsDuel,{id:factsStep.targetId,hitId,weapon}),true);
  assert.equal(reportWorldJobThingHit(factsDuel,{id:factsStep.targetId,hitId,weapon}),false);
}
const loadHits=readFacts(factsState.worldJobThingsHit).weaponHits;
assert.equal(loadHits.length,2);
assert.equal(stepBellowsLoad({}, {weaponHits:loadHits,behindMetres:500},0).state.bellows,40);
factsState.worldJobThingsHit=[];
factsState.onFoot=true;
factsState.footWeapons.selected='hand-flamer';
Object.assign(factsState.fighter,{x:thiefAt.x,z:thiefAt.z-5,y:thiefAt.y??0,yaw:0,pitch:0,flaming:true});
assert.equal(readFacts([]).flameContact,true);
assert.equal(stepBellowsLoad({},readFacts([]),2).state.bellows,70);
// Kyle's try, 18 November: the fire follows the barrel, so a barrel aimed well over the thief does not burn him.
factsState.fighter.pitch=.7;
assert.equal(readFacts([]).flameContact,false,'a barrel 40 degrees up does not burn the thief');
factsState.fighter.pitch=-.39;
assert.equal(readFacts([]).flameContact,true,'a barrel 22 degrees down still burns him');
factsState.fighter.pitch=0;
factsState.fighter.yaw=Math.PI;
assert.equal(readFacts([]).flameContact,false);
factsState.fighter.yaw=0;
factsState.fighter.z=thiefAt.z-7;
assert.equal(readFacts([]).flameContact,false);
factsState.fighter.flaming=false;
factsState.onFoot = true;
assert.equal(readFacts([]).carContact, false, 'The parked car cannot ram while the player walks.');
factsJob.actors[0].pathIndex = roadPlaces.length;
factsJob.actors[0].position = {...factsStep.bellowsRoute.wrecks.at(-1).position};
factsJob.actors[0].bellowsSolidContact = true;
factsJob.actors[0].bellowsSolidImpactKmh = 22;
measured = readFacts([]);
assert.equal(measured.inBoneyard, true);
assert.equal(measured.furnaceMetres, 0);
assert.equal(measured.solidContact, true);
assert.equal(measured.solidImpactKmh, 22);
assert.deepEqual(bellowsArenaFacts(factsDuel, factsJob, {...definition.steps[0], bellows:false}, []), {});
assert.equal(JSON.stringify([...memory]), factsSaved);
factsApp.returnToMenu(); factsApp.dispose?.();
console.log('PASS Run Him Down: arena facts measure the authored road, surface speed, flame and swept impacts without save writes.');

// Job 3.5: a furnace arrival resets placement, never the earned load or
// knocks. Prove the restart through the real arena, without driving it.
const {bellowsRestartPlaces} = await import('../src/world/jobs/bellows-rule.js');
const {applyBellowsRestart} = await import('../src/arena/modes/world-job.js');
{
  const {Duel} = await import('../src/game.js');
  const {placeActor} = await import('../src/arena/arena-event.js');
  const game = new Duel({seed:1989, featureFlags:{'hidden-road':true,'story-everburn':true,'scablands-realism':true}});
  const s = game.state; s.wastelandGateDiscovered = true;
  assert(game.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:1989, opponents:[], job:definition}));
  Object.assign(s, {onFoot:false, fighter:null, status:'racing', countdown:0});
  game.step(1/120);
  const world = s.arena.worldJob, step = definition.steps[0], gate = step.townGate.position;
  const thief = world.actors.find(actor => actor.id === step.targetId);
  thief.position = {...step.bellowsRoute.wrecks.at(-1).position};
  thief.pathIndex = step.path.length - 1;
  const carAt = () => game.course.worldAt(s.s,s.lateral);
  const closeTo = (a,b) => Math.hypot(a.x-b.x, a.z-b.z) < .05;
  const parked = carAt();
  game._storyCallout('A different job line was already on screen.', 3, true);
  for (let tick=0; tick<240; tick++) game.step(1/120);
  assert(closeTo(carAt(), parked));
  assert.equal(world.job.stepState.furnaceArrivals, undefined);
  for (const [dx,dz,hasLeft] of [[18,3,false],[0,3,false],[0,-1,false],[0,1,true]]) {
    const pose = game.course.nearest(gate.x+dx,gate.z+dz);
    placeActor(game, s, {s:pose.s, lateral:pose.lateral}, 0);
    game.step(1/120);
    assert.equal(!!world.job.stepState.leftTownGate, hasLeft, 'Only an outward crossing through the opening counts.');
  }
  const beforeMove = carAt(), readingTime = captionSeconds(BELLOWS_LINES.restart);
  for (let tick=1; tick<Math.ceil(readingTime*120); tick++) {
    assert.equal(worldReturnNotice(s), BELLOWS_LINES.restart);
    if (tick === 120) game._storyCallout('An urgent line arrived while Cinder was explaining.', 3, true);
    game.step(1/120);
    assert(closeTo(carAt(), beforeMove));
  }
  assert.equal(worldReturnNotice(s), BELLOWS_LINES.restart);
  game.step(1/120);
  assert(closeTo(carAt(), bellowsRestartPlaces(step.bellowsRoute).player));
  assert.equal(worldReturnNotice(s), '');
  assert.equal(world.job.stepState.furnaceArrivals, 1);
  for (let tick=0; tick<60; tick++) game.step(1/120);
  assert.equal(worldReturnNotice(s), '');
  assert.equal(world.job.stepState.furnaceArrivals, 1);
}
const restartPlaces = bellowsRestartPlaces(routeDefinition);
const chasePath = [...routeDefinition.road, ...routeDefinition.wrecks.slice(1)];
const restartedStep = {...factsStep, path:chasePath};
const restartApp = new App(); restartApp.audio.unlock = () => {};
restartApp.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
restartApp.duel.state.wastelandGateDiscovered = true;
assert(restartApp.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:restartApp.player.id, seed:1989, opponents:[],
  job:{...definition, steps:[restartedStep]}}));
const restartDuel = restartApp.duel, restartState = restartDuel.state;
const restartJob = restartState.arena.worldJob;
const restartThief = {id:restartedStep.targetId, position:{x:0, y:0, z:0},
  renderCar:'dusthawk_rally', health:20, speed:20, reachedEnd:true,
  bellowsSolidContact:true, bellowsSolidImpactKmh:40};
restartJob.actors = [restartThief];
restartJob.job.stepState = {bellows:63, knocks:2, sacksThrown:[0, 1], ridersStarted:true};
const preservedRules = JSON.stringify(restartJob.job.stepState);
const restartSaved = JSON.stringify([...memory]);
const restartRequest = {type:'bellowsRestart', leadMetres:150};
assert.equal(applyBellowsRestart(restartDuel, restartJob, {type:'follow'}), false);
let leadAlong = 0;
for (let index = routeDefinition.road.length; index < restartPlaces.thief.pathIndex; index++) {
  const from = chasePath[index - 1].position, to = chasePath[index].position;
  leadAlong += Math.hypot(to.x - from.x, to.z - from.z);
}
const segmentStart = chasePath[restartPlaces.thief.pathIndex - 1].position;
leadAlong += Math.hypot(restartPlaces.thief.x - segmentStart.x, restartPlaces.thief.z - segmentStart.z);
assert(Math.abs(leadAlong - 150) < 1e-8);
for (const onFoot of [false, true]) {
  restartState.onFoot = onFoot;
  restartState.speedMph = 80; restartState.pushVelocity = 10;
  restartJob.carContacts = [{actor:restartThief, kmh:40}];
  assert.equal(applyBellowsRestart(restartDuel, restartJob, restartRequest), true);
  const playerAt = restartDuel.course.groundAt(restartState.s, restartState.lateral);
  assert(Math.hypot(playerAt.x - routeDefinition.wrecks[0].position.x,
    playerAt.z - routeDefinition.wrecks[0].position.z) < 1e-6);
  assert.equal(restartState.speedMph, 0);
  assert.equal(restartState.pushVelocity, 0);
  assert.equal(restartState.onFoot, onFoot);
  if (onFoot) assert(Math.hypot(restartState.fighter.x - playerAt.x,
    restartState.fighter.z - playerAt.z) < 1e-6);
  assert.equal(restartThief.pathIndex, restartPlaces.thief.pathIndex);
  assert.equal(restartThief.heading, restartPlaces.thief.heading);
  assert.equal(restartThief.bellowsSolidContact, false);
  assert.equal(restartThief.bellowsSolidImpactKmh, 0);
  assert.equal(restartThief.reachedEnd, false);
  assert.deepEqual(restartJob.carContacts, []);
  assert.equal(JSON.stringify(restartJob.job.stepState), preservedRules);
  for (const solid of SCABLANDS_SOLIDS) {
    for (const at of [playerAt, restartThief.position])
      assert.equal(sweepObstacle(at, at, solid, 0,
        {halfWidth:clearance, halfLength:clearance}), null, solid.id);
  }
}
assert.equal(JSON.stringify([...memory]), restartSaved);
restartApp.returnToMenu(); restartApp.dispose?.();
console.log('PASS Run Him Down: restart places both cars on the clear wreck line, 150 m apart along it, preserving load, knocks and saves.');

// Job 3.5: the existing rider mover waits for the rule's distance crossing,
// then pursues and backs away after one ram. This is a rules check, no drive.
const {updateBellowsRiders, applyBellowsRiderHit} = await import('../src/arena/modes/world-job.js');
const {EMBER_RULE, emberLoss} = await import('../src/world/jobs/ember-rule.js');
const ridersApp = new App(); ridersApp.audio.unlock = () => {};
ridersApp.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
ridersApp.duel.state.wastelandGateDiscovered = true;
assert(ridersApp.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:ridersApp.player.id, seed:1989, opponents:[],
  job:{...definition, steps:[restartedStep]}}));
const ridersDuel = ridersApp.duel, ridersState = ridersDuel.state;
const ridersJob = ridersState.arena.worldJob;
ridersJob.actors = [];
ridersJob.job.stepState = {};
const ridersSaved = JSON.stringify([...memory]);
updateBellowsRiders(ridersDuel, ridersJob, 1);
assert.equal(ridersJob.actors.length, 0, 'Riders cannot start before the distance crossing.');
ridersJob.job.stepState.ridersStarted = true;
ridersState.onFoot = true;
updateBellowsRiders(ridersDuel, ridersJob, 0);
assert.equal(ridersJob.actors.length, 2);
for (const actor of ridersJob.actors) {
  for (const solid of SCABLANDS_SOLIDS) assert.equal(sweepObstacle(actor.position, actor.position,
    solid, 0, {halfWidth:BELLOWS_RULE.thiefRadiusMetres, halfLength:BELLOWS_RULE.thiefRadiusMetres}), null, solid.id);
}
const waitingRiders = ridersJob.actors.map(actor => ({...actor.position}));
updateBellowsRiders(ridersDuel, ridersJob, 1);
assert.deepEqual(ridersJob.actors.map(actor => actor.position), waitingRiders, 'Riders do not ram a foot player.');
// Put the car and a rider on open ground, facing a head-on meeting.
const testAt = restartPlaces.player;
const testPose = ridersDuel.course.nearest(testAt.x, testAt.z);
ridersState.s = testPose.s; ridersState.lateral = testPose.lateral;
ridersState.onFoot = false; ridersState.speedMph = 0;
const rider = ridersJob.actors[0];
rider.position = {...ridersDuel.course.groundAt(testPose.s, testPose.lateral)};
rider.position.z += 4;
ridersJob.actors[1].health = 0;
updateBellowsRiders(ridersDuel, ridersJob, 1);
assert.equal(rider.ramContact, true);
assert(rider.ramRetreat);
assert(ridersJob.riderHitKmh > 0);
const armourBefore = ridersState.armor;
const expectedHit = emberLoss(EMBER_RULE, {lostKmh:ridersJob.riderHitKmh,
  difficulty:ridersState.cpuDifficulty}).hit;
assert(expectedHit > 0);
applyBellowsRiderHit(ridersDuel, ridersJob);
assert(Math.abs(armourBefore - ridersState.armor - expectedHit) < 1e-8);
ridersJob.riderHitKmh = 0;
updateBellowsRiders(ridersDuel, ridersJob, 0.1);
assert.equal(ridersJob.riderHitKmh, 0, 'The same meeting cannot charge twice.');
assert.equal(applyBellowsRiderHit(ridersDuel, ridersJob), 0);
for (const [difficulty, speed] of [['easy', 28], ['medium', 100], ['hard', 8]]) {
  ridersState.cpuDifficulty = difficulty;
  ridersJob.riderHitKmh = speed;
  const before = ridersState.armor;
  applyBellowsRiderHit(ridersDuel, ridersJob);
  assert(Math.abs(before - ridersState.armor - emberLoss(EMBER_RULE,
    {lostKmh:speed, difficulty}).hit) < 1e-8);
}
ridersJob.job.stepState.thiefStopped = true;
const stoppedAt = {...rider.position};
updateBellowsRiders(ridersDuel, ridersJob, 1);
assert.deepEqual(rider.position, stoppedAt);
assert.equal(rider.speed, 0);
assert.equal(JSON.stringify([...memory]), ridersSaved);
ridersApp.returnToMenu(); ridersApp.dispose?.();
console.log('PASS Run Him Down: two clear furnace riders share pursuit, ram retreat and ember hit loss on armour, without save writes.');

// Job 3.6: condition changes pay, never the saved shape or the kept reward.
const {arenaReward, settleArenaResult} = await import('../src/arena/arena-settlement.js');
const {arenaResultsScreen} = await import('../src/screen-arena.js');
for (const [condition,pay,sentence] of [
  [100,120,'The bellows came back whole.'],[80,120,'The bellows came back whole.'],
  [79,80,'The bellows will patch.'],[40,80,'The bellows will patch.'],
  [39,50,'The bellows are scorched.'],[0,50,'The bellows are scorched.'],
]) {
  const bellowsResult={bellows:condition,knocks:3,pay:bellowsPay(condition),sentence:bellowsSentence(condition)};
  const finishedArena = {version: 1, venueId: 'scablands', mode: 'world-job', phase: 'over',
    participants: [{id: 'player', kind: 'player'}],
    result: {placings: ['player'], winnerId: 'player', reason: 'job-complete'},
    worldJob: {definition: definition, bellowsResult, job: {steps: definition.steps, stepIndex: definition.steps.length}}};
  for (const [difficulty, factor] of [['easy', 1], ['medium', 1.2], ['hard', 1.4]])
    assert.deepEqual(arenaReward(finishedArena, difficulty),
      {base: pay, placing: 0, wrecks: 0, factor, total: Math.round(pay * factor)});
  const profile = {credits: 123, kept: 'unchanged', wasteland: {
    version: 1, discoveredGate: true, scrap: 10, settledResults: [],
    territories: {kettle: {hold: 0, claimed: false}}, kept: 'unchanged',
  }};
  const beforeProfile = JSON.stringify(profile);
  const request = {runId: `bellows-${condition}`, ownerPlayerId: 'test-player',
    activePlayerId: 'test-player', cpuDifficulty: 'easy', arena: finishedArena};
  const paid = settleArenaResult(profile, request);
  assert.equal(paid.awarded, true);
  assert.equal(paid.scrapEarned, pay);
  assert.equal(paid.profile.wasteland.scrap, 10 + pay);
  assert.equal(paid.holdAdded, 0);
  assert.equal(JSON.stringify(profile), beforeProfile, 'Settlement leaves its input alone.');
  assert.deepEqual(Object.keys(paid.profile), Object.keys(profile));
  assert.deepEqual(Object.keys(paid.profile.wasteland), Object.keys(profile.wasteland));
  assert.equal(paid.profile.credits, 123);
  assert.equal(paid.profile.kept, 'unchanged');
  assert.equal(paid.profile.wasteland.kept, 'unchanged');
  const duplicate = settleArenaResult(paid.profile, request);
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.profile, paid.profile);
  assert.equal(duplicate.scrapEarned, 0);
  const unfinishedArena = {...finishedArena, phase: 'active'};
  assert.equal(settleArenaResult(profile, {...request, arena: unfinishedArena}).awarded, false);
  const screen = arenaResultsScreen({arena: finishedArena},
    {metric: () => '', action: () => '', escapeHTML: String});
  assert.equal(screen.description.split(sentence).length - 1, 1);
  const closingId=condition>=80 ? 'story.ember.cinder.10' : condition>=40 ? 'bellows.patch' : 'bellows.scorched';
  const closingText=condition>=80 ? 'Those are good bellows' : condition>=40
    ? "Cinder: They will patch. Keep the flamethrower. You've earned it."
    : "Cinder: Scorched. Auntie can sew. Keep the flamethrower. You've earned it.";
  assert(screen.description.includes(closingText));
  assert.equal(screen.description.includes('Those are good bellows'),condition>=80);
  const closingTick=end({...captured,bellows:condition,bellowsLoaded:true,thiefFled:true}, {}, 5);
  assert(closingTick.requests.some(request=>request.lineId===closingId));
  const lost = arenaResultsScreen({arena: {...finishedArena,
    result: {winnerId: 'raiders', reason: 'job-failed'}}},
  {metric: () => '', action: () => '', escapeHTML: String});
  assert.equal(lost.description.includes(sentence), false);
}
console.log('PASS Run Him Down: graded payment, results, unchanged saved fields and duplicate protection.');

// The arena must retain the rule's result before completion clears stepState.
const paidApp = new App(); paidApp.audio.unlock = () => {};
paidApp.duel.featureFlags = createFeatureFlags({storage:null, overrides:{'hidden-road':true}});
paidApp.duel.state.wastelandGateDiscovered = true;
assert(paidApp.duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',
  playerId:paidApp.player.id,seed:1989,opponents:[],job:definition}));
const paidDuel=paidApp.duel, paidWorld=paidDuel.state.arena.worldJob;
stepWorldJob(paidDuel,0);
paidWorld.job.stepState={thiefStopped:true,thiefFled:true,bellowsLoaded:true,
  endingElapsed:9,bellowsClosing:true,bellows:63,knocks:3,linesStarted:true,linesClosing:true};
stepWorldJob(paidDuel,0);
assert.deepEqual(paidWorld.bellowsResult,{bellows:63,knocks:3,pay:80,sentence:'The bellows will patch.'});
assert.equal(paidWorld.job.done,true);
paidApp.returnToMenu(); paidApp.dispose?.();
console.log('PASS Run Him Down: arena keeps the earned load and knocks through step completion.');

// The walk to the car (17 November 2026): the chase starts on foot among Tin Town's shacks, and the arrow to the car
// used to point through one of them. With the job's solids the arrow follows a way that can be walked: a walker the size
// of the player who steps toward the arrow's aim arrives at the car, in no more than 1.35 times the straight line plus
// 10 m, and the metres shown at the start are within 15 % of that walk.
{
  const {createJobSolidGrid, pushOutOfSolids} = await import('../src/world/scablands-solids.js');
  const {scablandsSurfaceHeightAt} = await import('../src/world/scablands-ground.js');
  const {townCarWay} = await import('../src/world/jobs/brand-ways.js');
  const {brandSites} = await import('../src/world/jobs/brand-sites.js');
  const {footCarDirection} = await import('../src/combat-hud.js');
  const {EVERBURN_JOBS: jobs} = await import('../src/world/jobs/everburn.js');
  const chase = jobs.find(job => job.id === 'everburn-run-him-down').steps[0];
  const grid = createJobSolidGrid(), car = chase.carStart, start = chase.bellowsFootStart;
  const ways = townCarWay(chase, grid.movers, car, brandSites().ashEntries);
  let at = {x: start.x, z: start.z}, metres = 0, said = null;
  for (let tick = 0; tick < 4000 && Math.hypot(at.x - car.x, at.z - car.z) > 3; tick++) {
    const aim = ways.aim(at, 'car');
    assert.ok(aim, `A way to the car is shown from ${at.x.toFixed(1)}, ${at.z.toFixed(1)}.`);
    said ??= aim.metres;
    const gap = Math.hypot(aim.x - at.x, aim.z - at.z), pace = Math.min(.25, gap);
    const x = at.x + (aim.x - at.x) / gap * pace, z = at.z + (aim.z - at.z) / gap * pace;
    const stood = pushOutOfSolids(x, z, .34, grid.movers, scablandsSurfaceHeightAt(x, z));
    metres += Math.hypot(stood.x - at.x, stood.z - at.z);
    at = {x: stood.x, z: stood.z};
  }
  const straight = Math.hypot(start.x - car.x, start.z - car.z);
  assert.ok(Math.hypot(at.x - car.x, at.z - car.z) <= 3, 'The walker reaches the car.');
  assert.ok(metres <= straight * 1.35 + 10, `The walk to the car is ${metres.toFixed(0)} m for ${straight.toFixed(0)} m straight.`);
  assert.ok(Math.abs(said - metres) <= metres * .15 + 4, `The arrow says ${said.toFixed(0)} m for a walk of ${metres.toFixed(0)} m.`);
  // The screen's own arrow uses that way: at the start it is not the straight line, which a shack stands in.
  const course = {groundAt: () => ({x: car.x, y: 0, z: car.z})};
  const world = {solidGrid: grid, job: {stepIndex: 0, steps: [chase], stepState: {}}};
  const arrow = footCarDirection(course, {onFoot: true, fighter: {x: start.x, y: 0, z: start.z, yaw: 0}, arena: {mode: 'world-job', worldJob: world}});
  const first = ways.aim(start, 'car');
  assert.equal(arrow.distance, Math.round(first.metres));
  assert.equal(arrow.angle, Math.round(Math.atan2(first.x - start.x, first.z - start.z) * 180 / Math.PI));
  assert.notEqual(arrow.angle, Math.round(Math.atan2(car.x - start.x, car.z - start.z) * 180 / Math.PI));
  console.log(`PASS Run Him Down: the arrow leads the walker to the car by a way of ${metres.toFixed(0)} m (${straight.toFixed(0)} m straight).`);
}

// The way out of town (17 November 2026): while the car is inside Tin Town's fence and the thief is beyond it, the
// arrow leads to the gate; through the gate it is on the thief again; on foot it is never the gate.
{
  const {worldHudModel: hudModel, TOWN_GATE_ARROW} = await import('../src/world/world-hud.js');
  const {EVERBURN_JOBS: jobs} = await import('../src/world/jobs/everburn.js');
  const chase = jobs.find(job => job.id === 'everburn-run-him-down').steps[0], gate = chase.townGate.position;
  const thief = {id: chase.targetId, position: {x: gate.x - 200, y: 0, z: gate.z + 900}};
  const hudAt = (player, onFoot = false, stepState = {}) => hudModel({worldJob: {job: {stepIndex: 0, steps: [chase], stepState}, actors: [thief]}, player, onFoot});
  const inBay = hudAt({x: chase.carStart.x, z: chase.carStart.z});
  assert.equal(inBay.target.id, 'town-gate');
  assert.equal(inBay.line, 'Out by the town gate, then after him.');
  assert.equal(hudAt({x: gate.x, z: gate.z - TOWN_GATE_ARROW.pastMetres - .1}).target.id, 'town-gate');
  assert.notEqual(hudAt({x: gate.x, z: gate.z - TOWN_GATE_ARROW.pastMetres + .1}).target.id, 'town-gate', 'At the gate the arrow goes back to the thief.');
  assert.notEqual(hudAt({x: gate.x, z: gate.z + 30}).target.id, 'town-gate', 'Outside the town the arrow is on the thief.');
  // Ground west of the fence, north of the gate's line, is not the town (the review of slice 14), and the far corner
  // of the town is (it lay beyond a 140 m limit that is gone).
  const box = chase.townGate.box;
  assert.notEqual(hudAt({x: box.minX - 20, z: gate.z - 60}).target.id, 'town-gate', 'West of the fence the arrow is on the thief.');
  assert.equal(hudAt({x: box.maxX - 5, z: box.minZ + 80}).target.id, 'town-gate', 'In the far corner of the town the arrow leads to the gate.');
  assert.notEqual(hudAt({x: chase.carStart.x, z: chase.carStart.z}, true).target?.id, 'town-gate', 'On foot the arrow to the car leads, not the gate.');
  assert.notEqual(hudAt({x: chase.carStart.x, z: chase.carStart.z}, false, {thiefStopped: true}).target?.id, 'town-gate');
  console.log('PASS Run Him Down: the arrow leads out by the town gate while the car is inside the fence.');
}

// The way to the car is worked out only for a car inside the town (the review of slice 14: with the car a kilometre down
// the road the squares ran to hundreds of thousands and the game stood still for seconds).
{
  const {townCarWay} = await import('../src/world/jobs/brand-ways.js');
  const {brandSites} = await import('../src/world/jobs/brand-sites.js');
  const {createJobSolidGrid} = await import('../src/world/scablands-solids.js');
  const {EVERBURN_JOBS: jobs} = await import('../src/world/jobs/everburn.js');
  const chase = jobs.find(job => job.id === 'everburn-run-him-down').steps[0], entries = brandSites().ashEntries, grid = createJobSolidGrid();
  const road = chase.bellowsRoute.road.map(place => place.position ?? place);
  for (const far of [road[Math.floor(road.length / 2)], road.at(-1)]) {
    const began = performance.now();
    assert.equal(townCarWay(chase, grid.movers, far, entries), null, 'No town way for a car out on the road.');
    assert.ok(performance.now() - began < 50, 'And asking costs nothing.');
  }
  assert.ok(townCarWay(chase, grid.movers, chase.carStart, entries));
  console.log('PASS Run Him Down: the walkable way to the car is made only inside the town.');
}
