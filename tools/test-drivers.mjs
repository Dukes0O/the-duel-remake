import assert from 'node:assert/strict';
import {CARS,COURSE} from '../src/config.js';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {DRIVERS,DEFAULT_DRIVER,normalizeDrivers,getDriverState,getEquippedDriverId,getDriverModifiers,driverModifierSignature,applyDriverModifiers,purchaseDriver,selectDriver,driverRecordMetadata} from '../src/drivers.js';
import {createProfile,normalizeProfile,bestKey,eventKey,settleRace,upgradedCar,loadPlayers,PLAYERS_KEY} from '../src/progression.js';
import {createLeaderboard,recordFinish,getLeaderboard,saveLeaderboard,loadLeaderboard} from '../src/leaderboard.js';
import {GhostRecorder,createGhostStore,storeGhost,findGhost,normalizeGhostStore,ghostKey,sampleGhost,saveGhosts,loadGhosts} from '../src/ghost.js';

let checks=0;
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const snapshot=value=>JSON.stringify(value);
same(Object.keys(DRIVERS).length,7,'neutral default and six specialists');
same(getEquippedDriverId(createProfile()),DEFAULT_DRIVER,'new careers use the neutral driver');
same(normalizeDrivers(),{version:1,unlocked:['club'],selected:'club'},'missing legacy driver data is neutral');
same(normalizeDrivers({version:1,unlocked:['unknown','mara_vale','mara_vale'],selected:'iko_ren'}),{version:1,unlocked:['club','mara_vale'],selected:'club'},'normalization filters unknowns, duplicates and unowned selection');
for(const value of [null,[],true,'mara_vale',{version:9,unlocked:['mara_vale'],selected:'mara_vale'}])same(normalizeDrivers(value),normalizeDrivers(),'invalid schemas cannot equip a skill');
const catalogBefore=snapshot(CARS);
for(const [id,driver]of Object.entries(DRIVERS))for(const [key,base]of Object.entries(CARS)){
  const car=upgradedCar(base,{engine:3,tires:3,handling:3,brakes:3,suspension:3,tank:3}),before=snapshot(car),modifiers=getDriverModifiers(id,key),adjusted=applyDriverModifiers(car,id,key);
  same(snapshot(car),before,'driver modifiers never mutate an installed build');
  for(const [stat,value]of Object.entries(car)){
    if(Object.hasOwn(modifiers,stat)){same(adjusted[stat],value*modifiers[stat],`${id}/${key}: exact ${stat} modifier`);check(modifiers[stat]>1&&modifiers[stat]<=1.06,'skill magnitude remains bounded');}
    else same(adjusted[stat],value,`${id}/${key}: unrelated ${stat} unchanged`);
  }
  const active=driver.cars.includes(key);
  same(!!driverModifierSignature(id,key),active,'record class exists only when a skill changes this car');
  if(!active)check(adjusted===car,'neutral and off-class handling is exact passthrough');
  check(!!driverRecordMetadata({driverId:id,car:key,driverSignature:driverModifierSignature(id,key)}),'generated record metadata validates');
}
same(snapshot(CARS),catalogBefore,'shared car catalog is unchanged');
check(!driverRecordMetadata({driverId:'missing',car:'falcone_f42'}),'unknown saved driver is rejected');
for(const signature of ['v1:grip=3','v1:grip=1.07','v1:grip=1.04,grip=1.05','v1:topSpeed=1.03','garbage'])check(!driverRecordMetadata({driverId:'mara_vale',car:'falcone_f42',driverSignature:signature}),'invalid saved modifier metadata is rejected');

const legacy={...createProfile(),credits:5432,personalBests:{'old|key':123.45},history:[{key:'old',won:true,reward:100}],settledResults:['old:0']};delete legacy.drivers;
const migrated=normalizeProfile(legacy);
same(migrated.credits,legacy.credits,'migration grants no money');same(migrated.personalBests,legacy.personalBests,'migration leaves existing best keys untouched');same(migrated.history,legacy.history,'migration preserves history');
same(migrated.drivers.unlocked,['club'],'no specialist is gifted to an old career');
let profile={...migrated,credits:15000};
for(const [id,driver]of Object.entries(DRIVERS).filter(([id])=>id!=='club')){
  const before=profile,copy=snapshot(profile),result=purchaseDriver(profile,id);
  check(result.ok,'an affordable specialist unlocks');same(result.cost,driver.price,'catalog controls price');same(result.profile.credits,before.credits-driver.price,'one exact debit');same(snapshot(before),copy,'purchase is immutable');same(result.profile.drivers.selected,'club','unlock is not an implicit selection');
  same(purchaseDriver(result.profile,id).profile,result.profile,'duplicate purchase cannot charge again');profile=result.profile;
}
same(profile.credits,4600,'all six have the documented total price');
same(selectDriver(profile,'mara_vale').profile.credits,profile.credits,'equipping an owned driver is free');
check(!selectDriver(createProfile(),'mara_vale').ok,'locked skill cannot be selected');
same(purchaseDriver({...createProfile(),credits:1199},'mara_vale').profile.credits,1199,'insufficient balance is never debited');
check(!purchaseDriver(profile,'unknown').ok,'invalid purchase is rejected');

const context={stageIndex:0,seed:1989,laps:2,car:'falcone_f42',mode:'timetrial',difficulty:'casual',cpuDifficulty:'easy'};
const oldKey=[eventKey(context),context.car,context.mode,context.difficulty,context.cpuDifficulty].join('|');
same(bestKey(context),oldKey,'default best key is byte-for-byte legacy compatible');
same(bestKey({...context,driverId:'nia_frost'}),oldKey,'off-class driver remains genuinely comparable');
check(bestKey({...context,driverId:'mara_vale'})!==oldKey,'active modifier gets a separate best key');
const result={...context,runId:'neutral',completed:true,won:true,timeSec:120,clean:true};
let rewarded=settleRace(createProfile(),result).profile;
const enhanced=settleRace(rewarded,{...result,runId:'enhanced',driverId:'mara_vale',timeSec:115});
same(enhanced.personalBestStatus,'baseline','first enhanced finish cannot beat a neutral best for credits');
same(enhanced.breakdown.personalBest,0,'separate first baseline grants no PB bonus');
same(enhanced.profile.personalBests[oldKey],120,'enhanced finish preserves neutral best');
check(settleRace(enhanced.profile,{...result,runId:'enhanced-improved',driverId:'mara_vale',timeSec:114}).breakdown.personalBest>0,'a genuine same-skill improvement earns normal credits');
const player={id:'driver-one',name:'Driver One'};
let board=recordFinish(createLeaderboard(),result,player).board;
board=recordFinish(board,{...result,driverId:'mara_vale',timeSec:115},player).board;
same(board.entries.length,2,'neutral and enhanced leaderboard rows both survive');
same(getLeaderboard(board).map(row=>row.timeSec),[120],'default board excludes enhanced rows');
same(getLeaderboard(board,{driverId:'mara_vale'}).map(row=>row.timeSec),[115],'specialist board excludes neutral rows for its favored car');
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
check(saveLeaderboard(board,storage),'driver rows save');same(loadLeaderboard(storage).entries.length,2,'driver rows survive reload');
const oldSkill={...board.entries.find(row=>row.driverId==='mara_vale'),driverSignature:'v1:grip=1.03'};
saveLeaderboard({...board,entries:[...board.entries,oldSkill]},storage);
same(loadLeaderboard(storage).archivedEntries.length,1,'prior skill values are preserved separately, never reclassified');

function recording(driverId='club'){
  const ctx={...context,playerId:player.id,driverId,upgrades:{}},rec=new GhostRecorder(ctx),state={...ctx,status:'racing',stageTimeSec:0,racePenaltySec:0,s:0,lateral:0,airHeight:0,speedMph:100};
  for(let i=0;i<=1200;i++){state.stageTimeSec=i/10;state.s=COURSE[0].lengthU*2*i/1200;rec.observe(state);}
  return {record:rec.finish(result,state,player),rec,state};
}
const neutral=recording(),special=recording('mara_vale');check(!!neutral.record&&!!special.record,'both performance classes record valid ghost samples');
let ghosts=storeGhost(createGhostStore(),neutral.record).store;ghosts=storeGhost(ghosts,special.record).store;
same(ghosts.records.length,2,'ghosts never replace a different modifier class');
same(findGhost(ghosts,player.id,context).driverId,'club','legacy lookup returns the neutral ghost');
same(findGhost(ghosts,player.id,{...context,driverId:'mara_vale'}).driverId,'mara_vale','active lookup selects matching performance');
check(saveGhosts(ghosts,storage)&&loadGhosts(storage).records.length===2,'both ghosts survive serialization');
const oldGhost={...special.record,driverSignature:'v1:grip=1.03'};oldGhost.key=ghostKey(player.id,oldGhost,oldGhost.layoutVersion,oldGhost.driverSignature);
const archived=normalizeGhostStore({version:1,records:[oldGhost]});same(archived.archivedRecords.length,1,'prior driver tuning is archived');same(sampleGhost(archived.archivedRecords[0],5),null,'outdated tuning cannot play as a current ghost');
const changed=recording('mara_vale');check(!changed.rec.finish(result,{...changed.state,driverId:'club'},player),'changing performance class before finish invalidates recording');

// App verbs enforce the menu boundary, ownership, fixed race snapshots and
// separate local careers. This storage exists only in this test process.
const priorStorage=globalThis.localStorage;
try{
  memory.clear();globalThis.localStorage=storage;
  const app=new App();app.profile.credits=6000;app._saveProfile();const first=app.player.id;
  check(app.purchaseDriver('mara_vale').ok,'real App unlock works at menu');same(app.profile.credits,4800,'App unlock debits once');
  check(app.selectDriver('mara_vale').ok,'real App selection works');
  same(new App().profile.drivers.selected,'mara_vale','selection survives App reload');
  app.startCampaign({...context});same(app.duel.state.driverId,'mara_vale','owned selected driver is snapshotted into physics');same(app.duel.car.grip,CARS.falcone_f42.grip*1.05,'physics receives exact grip skill');
  const bank=app.profile.credits;
  check(!app.selectDriver('club').ok&&!app.purchaseDriver('iko_ren').ok,'countdown locks selection and spending');
  app.advance(4);check(!app.selectDriver('club').ok,'active race cannot change drivers');
  app.profile={...app.profile,drivers:normalizeDrivers({version:1,unlocked:['mara_vale'],selected:'club'})};app._saveProfile();
  same(app.duel.state.driverId,'mara_vale','profile changes do not repaint active physics');
  app.restart();same(app.duel.state.driverId,'mara_vale','restart retains the requested owned race driver');same(app.profile.credits,bank,'restart protects banked earnings');
  app.returnToMenu();same(app.duel.state.driverId,'club','menu returns to profile selection');
  check(app.selectDriver('mara_vale').ok,'select again');check(app.addPlayer('Separate Racer').ok,'another player can be created');
  same(getDriverState(app.profile),normalizeDrivers(),'new player receives no driver unlocks');
  app.startCampaign({...context,driverId:'mara_vale'});same(app.duel.state.driverId,'club','unowned explicit start option cannot bypass purchase');app.returnToMenu();
  app.selectPlayer(first);same(app.profile.drivers.selected,'mara_vale','player switch restores own driver');same(app.profile.credits,bank,'other player cannot alter original wallet');
  app.startCampaign({...context});app.advance(4);same(loadPlayers(storage).players.find(row=>row.id===first).profile.activeRace.driverId,'mara_vale','active marker preserves the race driver');
  const reloaded=new App();same(reloaded.profile.credits,bank,'interrupted driver run does not debit the bank');same(reloaded.profile.drivers.selected,'mara_vale','interruption keeps unlocks and selected driver');
  same(reloaded.profile.activeRace,null,'interrupted earnings are forfeited normally');
  check(memory.has(PLAYERS_KEY),'only in-memory test storage is used');
}finally{if(priorStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=priorStorage;}
// Raw Duel's default remains exactly the former upgraded-car calculation.
for(const car of Object.keys(CARS)){
  const d=new Duel();d.startCampaign({car,upgrades:{engine:2,tires:1,handling:2}});
  same(d.car,upgradedCar(CARS[car],d.state.upgrades),'neutral simulation tuning remains identical');
}
console.log(`Drivers: ${checks} catalog, arithmetic, migration, ownership, physics, record, ghost and App isolation checks passed.`);
