import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {CARS,COURSE,DEFAULT_CAR} from '../src/config.js';
import {createProfile,normalizeProfile,completionCarProgress,isCarUnlocked,getUpgradeLevels,upgradedCar,purchaseUpgrade,unlockCar,UPGRADE_TYPES,UPGRADE_COSTS,CAR_PRICES,createPlayerRegistry,createPlayer,replacePlayerProfile,selectPlayer,activePlayer,savePlayers,loadPlayers} from '../src/progression.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {purchasePaint,applyPaint} from '../src/paint-presets.js';

const reward='koenigsegg_jesko',prerequisites=Object.keys(CARS).filter(car=>car!==reward),types=Object.keys(UPGRADE_TYPES),max=Object.fromEntries(types.map(type=>[type,3]));
let checks=0;
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const fullGarage=()=>({...createProfile(),credits:5000,unlockedCars:[...prerequisites],upgrades:Object.fromEntries(prerequisites.map(car=>[car,{...max}]))});
const nearComplete=(car=prerequisites.at(-1),type='tank')=>{const p=fullGarage();p.upgrades[car][type]=2;return p;};
function freezeDeep(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freezeDeep(child);}return value;}

same(prerequisites.length,8,'Every existing vehicle is a prerequisite, including both starters and Heritage');
same(types.length,7,'Every upgrade category is required');
same(CARS[reward].unlockRequirement,'max-all-other-cars','Reward has the explicit completion-only rule');
same(CARS[reward].factoryMaxed,true,'Reward is a permanently factory-maxed build');
ok(!Object.hasOwn(CAR_PRICES,reward),'Reward has no credit price');
const fresh=freezeDeep(createProfile());
same(completionCarProgress(fresh),{car:reward,maxed:0,total:8,eligible:false,unlocked:false,requirementLabel:'Fully upgrade all 8 other cars in all 7 upgrade categories.'},'Fresh garage gives an exact readable requirement');
for(const credits of [0,12000,1_000_000_000]){
  const p=freezeDeep({...fresh,credits}),attempt=unlockCar(p,reward);
  ok(!attempt.ok,'No wallet amount buys the achievement early');same(attempt.cost,0,'Failed claim costs nothing');same(attempt.profile,p,'Failed claim preserves the original profile');
  same(attempt.reason,completionCarProgress(p).requirementLabel,'Failure explains the actual requirement');
}
for(const car of prerequisites)for(const type of types){
  const p=freezeDeep(nearComplete(car,type)),before=JSON.stringify(p),progress=completionCarProgress(p),loaded=normalizeProfile(p);
  same(progress.maxed,7,`${car}/${type}: a single missing level leaves one car incomplete`);
  ok(!progress.eligible&&!isCarUnlocked(loaded,reward),`${car}/${type}: normalization cannot skip a missing upgrade`);
  const result=purchaseUpgrade(p,car,type);
  ok(result.ok,`${car}/${type}: last upgrade succeeds`);same(result.cost,UPGRADE_COSTS[2],`${car}/${type}: only the final upgrade is charged`);
  same(result.profile.credits,p.credits-UPGRADE_COSTS[2],`${car}/${type}: reward is free`);
  same(result.earnedCars,[reward],`${car}/${type}: reward is announced on this operation`);
  ok(isCarUnlocked(result.profile,reward),`${car}/${type}: ownership is immediate`);same(result.profile.upgrades[reward],max,`${car}/${type}: every reward upgrade is saved at maximum`);
  same(getUpgradeLevels(result.profile,car)[type],3,`${car}/${type}: prerequisite upgrade is also applied`);
  same(JSON.stringify(p),before,`${car}/${type}: input profile is immutable`);
  const repeated=purchaseUpgrade(result.profile,car,type);ok(!repeated.ok,`${car}/${type}: repeated purchase is rejected`);same(repeated.profile,result.profile,`${car}/${type}: repeat cannot charge or duplicate reward`);
}

// Upgrade data for a car that is not owned is not evidence of a completed garage.
for(const car of prerequisites.filter(key=>CAR_PRICES[key])){
  const p=fullGarage();p.unlockedCars=p.unlockedCars.filter(key=>key!==car);
  same(completionCarProgress(p).maxed,7,`${car}: unowned forged upgrades cannot satisfy ownership`);
  ok(!isCarUnlocked(normalizeProfile(p),reward),`${car}: load cannot earn from unowned upgrade data`);
  ok(!purchaseUpgrade(p,car,'engine').ok,`${car}: cannot upgrade an unowned prerequisite`);
  const bought=unlockCar(p,car); // Existing purchases still follow their ordinary prices.
  same(bought.ok,p.credits>=CAR_PRICES[car],`${car}: priced-car economy is unchanged`);
  if(bought.ok){same(Object.values(getUpgradeLevels(bought.profile,car)),types.map(()=>0),`${car}: buying cannot activate fabricated unowned upgrades`);ok(!completionCarProgress(bought.profile).eligible,`${car}: a newly bought car still needs its actual upgrades`);}
}
for(const invalid of [undefined,null,NaN,Infinity,-Infinity,'Infinity','not-a-number',-3,2.999,[],[3],{level:3},true]){
  const p=fullGarage();p.upgrades.falcone_f42.engine=invalid;
  ok(!completionCarProgress(p).eligible,'Malformed/non-max upgrade values do not satisfy the achievement');
  ok(!isCarUnlocked(normalizeProfile(p),reward),'Malformed/non-max upgrade values cannot award during load');
}
for(const value of [null,{},[],{version:3},false])ok(!isCarUnlocked(normalizeProfile(value),reward),'Invalid profile containers cannot create a reward');
const unknown=fullGarage();unknown.unlockedCars=['unknown','__proto__',...createProfile().unlockedCars];unknown.upgrades.unknown={...max};
ok(!isCarUnlocked(normalizeProfile(unknown),reward),'Unknown car keys cannot substitute for real cars');

const old=freezeDeep({...fullGarage(),version:1,raceSettings:{version:1,eventId:COURSE[0].id,car:reward,cpuDifficulty:'medium',difficulty:'pro'},settledResults:['preserved:0'],personalBests:{'preserved-best':123.45}}),oldBefore=JSON.stringify(old),migrated=normalizeProfile(old);
ok(isCarUnlocked(migrated,reward),'A previously maxed save earns the reward on load');same(migrated.credits,old.credits,'Migration never charges a wallet');
same(migrated.raceSettings.car,reward,'Grant happens before restoring an earned selected car');same(migrated.settledResults,old.settledResults,'Migration preserves reward settlement protection');same(migrated.personalBests,old.personalBests,'Migration preserves best times');
same(JSON.stringify(old),oldBefore,'Migration never mutates its input');same(normalizeProfile(migrated),migrated,'Repeated loads are idempotent');
same(migrated.unlockedCars.filter(car=>car===reward).length,1,'Exactly one reward ownership entry is saved');
const repaired=normalizeProfile({...migrated,upgrades:{...migrated.upgrades,[reward]:{engine:0,nitro:Infinity}},unlockedCars:[...migrated.unlockedCars,reward]});
same(repaired.upgrades[reward],max,'Factory-max reward repairs incomplete legacy upgrade storage');same(repaired.unlockedCars.filter(car=>car===reward).length,1,'Duplicate ownership is cleaned');
const retained=normalizeProfile({...migrated,upgrades:{}});ok(isCarUnlocked(retained,reward),'An earned reward is persistent rather than revoked on a later roster/save change');same(retained.upgrades[reward],max,'Persistent reward remains fully built');
for(const type of types){const result=purchaseUpgrade(repaired,reward,type);ok(!result.ok,'A factory-max category cannot be charged again');same(result.cost,0,'Completed reward upgrade costs zero');same(result.profile,repaired,'Rejected repeat preserves profile');}
same(getUpgradeLevels(fresh,reward),max,'Locked garage preview shows the fully built reward');
const tuned=upgradedCar(CARS[reward],max),emptyTuned=upgradedCar(CARS[reward],{});
same(emptyTuned,tuned,'Factory-max tuning is identical with empty or saved level data');same(tuned.topSpeed,CARS[reward].topSpeed*1.105,'Factory max applies exactly one normal engine multiplier');
same(tuned.braking,CARS[reward].braking*(1+.18+.36),'Factory max applies exactly one normal brake/tire multiplier');
same(normalizeRaceSettings({car:reward},fresh).car,DEFAULT_CAR,'A no-price reward is not treated as a free starter in saved settings');
same(normalizeRaceSettings({car:reward},migrated).car,reward,'An earned reward can be selected normally');
for(const operation of [purchasePaint,applyPaint]){
  const p={...fresh,credits:1_000_000_000,cosmetics:{[reward]:{owned:['factory','glacier_satin'],selected:'factory'}}};
  const result=operation(p,reward,'glacier_satin');ok(!result.ok,'Locked no-price reward cannot buy or equip paint');same(result.profile,p,'Rejected paint cannot change wallet or garage');
}

const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
let registry=createPlayerRegistry(migrated);const owner=activePlayer(registry).id;
registry=createPlayer(registry,'Second Driver').registry;const second=activePlayer(registry).id;
ok(!isCarUnlocked(activePlayer(registry).profile,reward),'New player cannot inherit another player’s completion reward');
registry=replacePlayerProfile(registry,owner,migrated);ok(savePlayers(registry,storage),'Registry saves to isolated memory storage');
registry=loadPlayers(storage);same(activePlayer(registry).id,second,'Active player persists');ok(!isCarUnlocked(activePlayer(registry).profile,reward),'Fresh player remains locked after reload');
registry=selectPlayer(registry,owner);ok(isCarUnlocked(activePlayer(registry).profile,reward),'Switching back restores the earned reward');same(getUpgradeLevels(activePlayer(registry).profile,reward),max,'Switching back restores the full factory build');

// Actual App flow covers final-purchase persistence, selection and race snapshot.
globalThis.localStorage=storage;memory.clear();let app=new App();
app.profile=nearComplete();app._saveProfile();const appOwner=app.player.id;
const final=app.purchaseUpgrade(prerequisites.at(-1),'tank');ok(final.ok,'Real garage can buy the last prerequisite upgrade');same(final.earnedCars,[reward],'Real garage receives the unlock notification');
app=new App();ok(isCarUnlocked(app.profile,reward),'Real App reload retains the earned reward');same(app.profile.credits,4050,'Real App charged the final upgrade only');
ok(app.startCampaign({startStage:0,car:reward}),'Earned reward can enter an owned course');same(app.duel.state.car,reward,'Simulation starts with the reward rather than falling back');same(app.duel.state.upgrades,max,'Physics gets all seven max levels');same(app.duel.car.topSpeed,tuned.topSpeed,'Physics gets exactly one fully upgraded engine build');
app.returnToMenu();ok(app.addPlayer('Fresh Racer').ok,'Actual player switch creates a separate career');ok(!isCarUnlocked(app.profile,reward),'Actual new career cannot drive the reward');
ok(app.startCampaign({startStage:0,car:reward}),'New career can still start with its owned fallback');same(app.duel.state.car,DEFAULT_CAR,'Actual App blocks a locked reward selection');app.returnToMenu();
ok(app.selectPlayer(appOwner),'Return to reward owner');ok(isCarUnlocked(app.profile,reward),'Reward remains with its earning player');same(app.profile.credits,4050,'Countdown exit and player switching never alter the wallet');
delete globalThis.localStorage;
console.log(`Koenigsegg progression: ${checks} checks passed for all 56 final-upgrade paths, free automatic rewards, maxed builds, invalid-save guards, settings/paint ownership, persistence, and real App player/race integration.`);
