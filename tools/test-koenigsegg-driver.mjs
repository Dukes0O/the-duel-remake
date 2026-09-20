import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {CARS,COURSE,BOOST,DRIVE} from '../src/config.js';
import {DRIVERS,getDriverState,getEquippedDriverId,isDriverUnlocked,getDriverModifiers,applyDriverModifiers,driverModifierSignature,driverRecordMetadata,purchaseDriver,selectDriver} from '../src/drivers.js';
import {createProfile,normalizeProfile,getUpgradeLevels,upgradedCar,purchaseUpgrade,unlockCar,UPGRADE_TYPES,UPGRADE_COSTS,bestKey,settleRace,loadProfile,loadPlayers} from '../src/progression.js';
import {createLeaderboard,recordFinish,getLeaderboard,saveLeaderboard,loadLeaderboard} from '../src/leaderboard.js';
import {GhostRecorder,createGhostStore,storeGhost,findGhost,saveGhosts,loadGhosts,sampleGhost} from '../src/ghost.js';

const car='koenigsegg_jesko',driverId='axel_storm',signature='v2:handling=1.3,nitro=1.2,suspension=1.2,tires=1.3';
const prerequisites=Object.keys(CARS).filter(key=>key!==car),types=Object.keys(UPGRADE_TYPES),max=Object.fromEntries(types.map(type=>[type,3]));
const modifiers={grip:1.3,braking:1.3,offRoadGrip:1.3,roughnessScale:1/1.2,nitroAcceleration:1.2,boostCapacity:1.2};
let checks=0;
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const check=(value,label)=>{assert.ok(value,label);checks++;};
const near=(actual,expected,tolerance,label)=>check(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} vs ${expected}`);
const snapshot=value=>JSON.stringify(value);
const memoryStorage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};};
const fullGarage=()=>({...createProfile(),credits:5000,unlockedCars:[...prerequisites],upgrades:Object.fromEntries(prerequisites.map(key=>[key,{...max}]))});
function freezeDeep(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freezeDeep(child);}return value;}

same(DRIVERS[driverId]?.name,'Axel Storm','Completion driver has a stable identity');
same(DRIVERS[driverId].cars,[car],'Skills belong exclusively to the Jesko');
same(DRIVERS[driverId].unlockCar,car,'The driver reward is tied to Jesko ownership');
same(DRIVERS[driverId].price,0,'The earned driver has no extra credit charge');
same(DRIVERS[driverId].skillBonuses,{handling:1.3,suspension:1.2,tires:1.3,nitro:1.2},'All four requested skill percentages are explicit');
same(getDriverModifiers(driverId,car),modifiers,'Requested skills map to the intended existing physics fields');
same(driverModifierSignature(driverId,car),signature,'Enhanced records identify the exact four-skill class');
same(driverModifierSignature('mara_vale','falcone_f42'),'v1:grip=1.05','Existing specialist record keys are unchanged');
check(!isDriverUnlocked(createProfile(),driverId),'A fresh career does not receive the completion reward');

for(const credits of [0,12000,1_000_000_000]){
  const profile=freezeDeep({...createProfile(),credits}),result=purchaseDriver(profile,driverId);
  check(!result.ok,'No wallet amount buys the completion driver early');same(result.cost,0,'An early purchase charges nothing');
  same(result.profile,profile,'An early purchase preserves the original profile');check(!selectDriver(profile,driverId).ok,'An unearned driver cannot be selected');
}
const forged=freezeDeep({...createProfile(),drivers:{version:1,unlocked:['club',driverId],selected:driverId}});
same(getDriverState(forged),{version:1,unlocked:['club'],selected:'club'},'A forged driver unlock without its car cannot activate a skill');
same(normalizeProfile(forged).drivers,getDriverState(createProfile()),'Save normalization removes unearned completion-driver data');
check(!selectDriver(forged,driverId).ok,'Forged direct selection is also refused');

for(const key of prerequisites)for(const type of types){
  const raw=fullGarage();raw.upgrades[key][type]=2;
  raw.drivers={version:1,unlocked:['club','mara_vale'],selected:'mara_vale'};
  const profile=freezeDeep(raw),before=snapshot(profile);
  check(!isDriverUnlocked(normalizeProfile(profile),driverId),`${key}/${type}: one missing upgrade keeps the driver locked`);
  const result=purchaseUpgrade(profile,key,type);
  check(result.ok,`${key}/${type}: the last upgrade succeeds`);
  same(result.cost,UPGRADE_COSTS[2],`${key}/${type}: only the upgrade is charged`);
  same(result.profile.credits,profile.credits-UPGRADE_COSTS[2],`${key}/${type}: the car and driver are free rewards`);
  check(result.profile.unlockedCars.includes(car),`${key}/${type}: the car unlocks immediately`);
  check(result.profile.drivers.unlocked.includes(driverId),`${key}/${type}: the saved driver unlock is immediate`);
  same(result.profile.drivers.selected,'mara_vale',`${key}/${type}: earning a driver does not replace the current selection`);
  same(result.profile.drivers.unlocked.filter(id=>id===driverId).length,1,`${key}/${type}: exactly one driver entry is granted`);
  same(snapshot(profile),before,`${key}/${type}: the purchase does not mutate its input`);
  same(normalizeProfile(result.profile),result.profile,`${key}/${type}: repeated normalization is idempotent`);
  const duplicate=purchaseDriver(result.profile,driverId);
  check(!duplicate.ok&&duplicate.cost===0,`${key}/${type}: a duplicate claim never charges`);
  same(duplicate.profile,result.profile,`${key}/${type}: a duplicate claim leaves the career intact`);
}
const claimed=unlockCar(freezeDeep(fullGarage()),car);
check(claimed.ok&&claimed.profile.drivers.unlocked.includes(driverId),'An explicit eligible car claim grants the same driver reward');
same(claimed.profile.credits,5000,'An explicit reward claim changes no credits');
same(claimed.profile.drivers.selected,'club','An explicit reward claim does not auto-select the driver');

// Older owners may have earned the car before this driver existed. Ownership
// remains sufficient even if a later roster or old save lacks other upgrades.
const existing=freezeDeep({...createProfile(),credits:4321,unlockedCars:[...createProfile().unlockedCars,car],drivers:{version:1,unlocked:['club','iko_ren'],selected:'iko_ren'},settledResults:['old:0'],personalBests:{'kept-best':123.45},history:[{key:'old:0',won:true,reward:400}]});
const beforeExisting=snapshot(existing),migrated=normalizeProfile(existing);
check(isDriverUnlocked(existing,driverId),'An existing owner is recognized without needing another car purchase');
check(migrated.drivers.unlocked.includes(driverId),'Existing Jesko ownership migrates to a persisted driver unlock');
same(migrated.drivers.selected,'iko_ren','Migration preserves the previously selected driver');
for(const field of ['credits','settledResults','personalBests','history'])same(migrated[field],existing[field],`Migration preserves ${field}`);
same(snapshot(existing),beforeExisting,'Migration does not mutate the old save');
same(normalizeProfile(migrated),migrated,'Repeated migration has no extra effects');
const completionMigration=normalizeProfile(fullGarage());
check(completionMigration.unlockedCars.includes(car)&&completionMigration.drivers.unlocked.includes(driverId),'A previously complete garage receives both rewards during the same load');
const selected=selectDriver(migrated,driverId);
check(selected.ok,'An earned driver can be selected normally');same(selected.profile.credits,migrated.credits,'Selecting the reward is free');
same(getEquippedDriverId(normalizeProfile(selected.profile)),driverId,'An explicit reward-driver selection survives reload');

const tuned=freezeDeep(upgradedCar(CARS[car],max)),tunedBefore=snapshot(tuned),enhanced=applyDriverModifiers(tuned,driverId,car);
for(const [stat,multiplier]of Object.entries(modifiers))near(enhanced[stat],tuned[stat]*multiplier,1e-12,`The fully maxed ${stat} receives exactly one driver multiplier`);
for(const [stat,value]of Object.entries(tuned))if(!Object.hasOwn(modifiers,stat))same(enhanced[stat],value,`Unrelated ${stat} is unchanged`);
same(snapshot(tuned),tunedBefore,'Driver tuning does not mutate the installed factory build');
for(const [key,base]of Object.entries(CARS))if(key!==car){
  const build=upgradedCar(base,max);
  same(getDriverModifiers(driverId,key),{},`${key}: no off-specialty modifier exists`);
  same(driverModifierSignature(driverId,key),'',`${key}: off-specialty records stay in the neutral class`);
  check(applyDriverModifiers(build,driverId,key)===build,`${key}: off-specialty tuning is exact passthrough`);
}
const parity=new Duel();parity.startCampaign({car,driverId,mode:'timetrial'});
same(parity.car,enhanced,'The actual simulation and garage preview apply the same maxed skill tuning');
same(parity.state.upgrades,max,'Skills do not create extra upgrade levels');

// A level proving ground isolates timed nitro and steering from course turns.
// It exercises the real driving code, but is not used to fabricate a finish.
function provingGround(id,{speed=100,lateral=0}={}){
  const duel=new Duel({car}),state=duel.state;
  const point=(distance,side=0)=>({x:side,y:0,z:distance,heading:0,curvature:0});
  duel.course={def:{id:'driver-proving-ground',theme:'desert'},length:200000,raceLength:400000,closed:false,
    features:{obstacles:[],mountains:[],flocks:[],shortcuts:[],ramps:[],crushables:[],radarTraps:[]},
    at:distance=>point(distance),worldAt:point,groundAt:point,phase:distance=>distance,themeAt:()=> 'desert',roadHalfWidthAt:()=>7,
    surfaceAt:(_,side)=>({road:Math.abs(side)<=7,mainRoad:Math.abs(side)<=7,roadHalfWidth:7}),nearest:(x,z)=>({s:z,lateral:x}),obstaclesNear:()=>[],nearestRadar:()=>null};
  Object.assign(state,{status:'racing',driverId:id,s:100,prevS:100,lateral,prevLateral:lateral,speedMph:speed,upgrades:{...max},gear:CARS[car].gears.length-1,rival:null,traffic:[]});
  duel._obstacleQueryCache=new Map();duel._obstacleArray=duel.course.features.obstacles;
  return duel;
}
const dt=1/120,nitroRuns=[];
for(const id of ['club',driverId]){
  const duel=provingGround(id);duel.setInput({boost:true});let steps=0;
  while(duel.state.boost>0&&steps<12000){duel._drive(dt);steps++;}
  same(duel.state.boost,0,`${id}: holding boost drains a finite tank`);
  near(steps*dt,(1+max.nitro*.14)*duel.car.boostCapacity/BOOST.drainPerSec,dt+.000001,`${id}: observed tank duration agrees with physical capacity`);
  same(duel.state.stageCrashes,0,`${id}: the nitro run creates no false impacts`);
  const burst=provingGround(id);burst.setInput({boost:true});burst._drive(dt);
  const steering=provingGround(id);steering.setInput({steer:.1});steering._drive(dt);
  const dirt=provingGround(id,{speed:0,lateral:8});dirt._drive(dt);
  nitroRuns.push({seconds:steps*dt,impulse:burst.state.speedMph-100,turn:Math.abs(steering.state.yawVelocity),roughness:dirt.state.roughness});
}
near(nitroRuns[1].seconds/nitroRuns[0].seconds,1.2,.001,'The earned driver gives 20% more measured nitro duration');
const drag=DRIVE.dragCoeff*dt;
near((nitroRuns[1].impulse+drag)/(nitroRuns[0].impulse+drag),1.2,1e-12,'The measured nitro impulse is 20% stronger after accounting for unchanged passive drag');
near(nitroRuns[1].turn/nitroRuns[0].turn,1.3,1e-12,'Actual yaw authority increases by 30%');
near(nitroRuns[1].roughness/nitroRuns[0].roughness,1/1.2,1e-12,'Actual off-road shake uses the 20% stronger suspension');

// Records and ghost fixtures use only private memory, never a browser career.
const storage=memoryStorage(),player={id:'koenigsegg-driver-test',name:'Driver Test'};
const context={stageIndex:0,seed:1989,laps:COURSE[0].laps||2,car,mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium'};
const neutralResult={...context,runId:'neutral',completed:true,won:true,timeSec:120,clean:true,driverId:'club',upgrades:max};
const enhancedResult={...neutralResult,runId:'enhanced',timeSec:110,driverId};
same(driverRecordMetadata({car,driverId,driverSignature:signature}),{driverId,driverSignature:signature},'The new record signature validates');
for(const bad of ['v2:handling=3,nitro=1.2,suspension=1.2,tires=1.3','v2:handling=1.3,handling=1.3,nitro=1.2,suspension=1.2,tires=1.3','v2:engine=1.3,nitro=1.2,suspension=1.2,tires=1.3','v2:handling=NaN,nitro=1.2,suspension=1.2,tires=1.3'])check(!driverRecordMetadata({car,driverId,driverSignature:bad}),'Malformed or out-of-bounds enhanced record signatures are rejected');
check(bestKey(enhancedResult)!==bestKey(neutralResult),'The enhanced Jesko has its own personal-best class');
const neutralSettlement=settleRace(migrated,neutralResult),enhancedSettlement=settleRace(neutralSettlement.profile,enhancedResult);
same(enhancedSettlement.personalBestStatus,'baseline','The first enhanced finish cannot claim a neutral best improvement');
same(enhancedSettlement.breakdown.personalBest,0,'A first enhanced baseline grants no incompatible PB reward');
same(enhancedSettlement.profile.personalBests[bestKey(neutralResult)],120,'The neutral best remains untouched');
check(settleRace(enhancedSettlement.profile,{...enhancedResult,runId:'enhanced-improved',timeSec:109}).breakdown.personalBest>0,'A later comparable enhanced improvement earns its normal bonus');
let board=recordFinish(createLeaderboard(),neutralResult,player).board;
board=recordFinish(board,enhancedResult,player).board;check(saveLeaderboard(board,storage),'Both record classes can be saved');
board=loadLeaderboard(storage);same(board.entries.length,2,'Both record classes survive normalization and reload');
same(getLeaderboard(board,{car,driverId}).map(row=>row.timeSec),[110],'Enhanced filter returns only the new driver class');
same(getLeaderboard(board,{car,driverId:'club'}).map(row=>row.timeSec),[120],'Neutral filter does not borrow the enhanced time');

function ghostFixture(result){
  const ctx={...context,playerId:player.id,driverId:result.driverId,upgrades:max},recorder=new GhostRecorder(ctx);
  const state={...ctx,status:'racing',stageTimeSec:0,racePenaltySec:0,s:0,lateral:0,airHeight:0,speedMph:100};
  for(let i=0;i<=1200;i++){state.stageTimeSec=result.timeSec*i/1200;state.s=COURSE[0].lengthU*context.laps*i/1200;recorder.observe(state);}
  return recorder.finish(result,state,player);
}
const neutralGhost=ghostFixture(neutralResult),enhancedGhost=ghostFixture(enhancedResult);
check(neutralGhost&&enhancedGhost,'Both compatible classes can record replay fixtures');
let ghosts=storeGhost(createGhostStore(),neutralGhost).store;ghosts=storeGhost(ghosts,enhancedGhost).store;
check(saveGhosts(ghosts,storage),'Both replay classes save');ghosts=loadGhosts(storage);
same(ghosts.records.length,2,'Both replay classes survive serialization');
same(findGhost(ghosts,player.id,{...context,driverId})?.driverSignature,signature,'Enhanced lookup finds exactly the four-skill replay');
same(findGhost(ghosts,player.id,context)?.driverId,'club','Neutral lookup keeps the original replay');
check(sampleGhost(findGhost(ghosts,player.id,{...context,driverId}),5),'The new signature remains playable after reload');

const previousStorage=globalThis.localStorage;
try{
  globalThis.localStorage=memoryStorage();let app=new App();
  const nearly=fullGarage();nearly.upgrades[prerequisites.at(-1)].tank=2;app.profile=nearly;app._saveProfile();
  const owner=app.player.id,lastUpgrade=app.purchaseUpgrade(prerequisites.at(-1),'tank');
  check(lastUpgrade.ok&&isDriverUnlocked(app.profile,driverId),'The actual App grants the driver on the final garage purchase');
  same(app.profile.credits,4050,'The actual App charges only the final upgrade');
  same(getEquippedDriverId(app.profile),'club','The actual App never auto-equips the reward');
  check(app.selectDriver(driverId).ok,'The actual menu verb selects the earned driver');
  app=new App();same(getEquippedDriverId(app.profile),driverId,'The actual selection persists across App reload');
  same(app.profile.credits,4050,'Driver selection and reload preserve banked credits');
  check(app.addPlayer('Independent Driver').ok,'A separate local player can be created');
  check(!isDriverUnlocked(app.profile,driverId),'The separate player does not inherit the driver');
  check(!app.purchaseDriver(driverId).ok&&!app.selectDriver(driverId).ok,'The separate player cannot purchase or select the reward early');
  check(app.startCampaign({car,driverId,mode:'timetrial'}),'An unearned requested build still falls back to an owned setup');
  same(app.duel.state.driverId,'club','Explicit race options cannot bypass driver ownership');app.returnToMenu();
  check(app.selectPlayer(owner),'Switching back finds the earning player');
  same(getEquippedDriverId(app.profile),driverId,'Switching back restores that player’s selected reward driver');
  const options={startStage:0,car,mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',routeVariant:'route_a'};
  app.setRaceSettings(options);app.autopilot=true;check(app.startCampaign(),'The earned setup starts from normal persisted menu settings');
  app._scriptedCrashDone=true;const state=app.duel.state;
  same(state.driverId,driverId,'The selected driver is snapshotted into the actual race');
  same(app.duel.car,enhanced,'The actual App delivers the tested enhanced physics build');
  check(!app.selectDriver('club').ok,'The driver cannot be changed during countdown');
  // One bounded input-only race: no position, speed, checkpoint, timer, lap,
  // damage or result is injected. The normal demo controller supplies inputs.
  for(let frame=0;frame<3600&&['countdown','racing','ticket'].includes(state.status);frame++)app.advance(.1);
  same(state.status,'stage_result','The enhanced Jesko completes the actual Pacific course');
  check(state.results?.completed&&state.completedLaps===state.lapsTotal,'Both real laps and all required gates are complete');
  const raceContext={...context,seed:state.seed,driverId,laps:state.lapsTotal};
  same(app.profile.personalBests[bestKey(raceContext)],state.results.timeSec,'The actual finish saves the enhanced class best');
  const realGhost=app.getGhostRecord(raceContext);
  check(realGhost&&state.results.ghostRecorded,'The actual driven finish records a replay');
  same(realGhost.driverSignature,signature,'The actual replay carries the exact enhanced signature');
  same(loadProfile().drivers.selected,driverId,'The actual finish preserves the selected driver');
  same(loadPlayers().players.find(row=>row.name==='Independent Driver').profile.drivers.unlocked,['club'],'The completed race cannot give another player the reward');
  console.log(`Axel Storm input-only Pacific race: ${state.results.timeSec}s, ${state.stageCrashes} crashes, ${realGhost.samples.length} replay samples.`);
  app.returnToMenu();const bank=app.profile.credits;check(app.startCampaign(),'The specialist can start another attempt');
  app.advance(4);app.returnToMenu();same(app.profile.credits,bank,'Quitting a specialist attempt preserves existing credits');
}finally{if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;}
console.log(`Koenigsegg driver: ${checks} completion, ownership, migration, tuning, nitro, records, ghost and actual driving checks passed.`);
