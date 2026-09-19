import assert from 'node:assert/strict';
import { CARS } from '../src/config.js';
import { PROFILE_KEY, createProfile, loadProfile, saveProfile, awardCourseWin, purchaseUpgrade, unlockCar, getUpgradeLevels, upgradedCar, isCarUnlocked } from '../src/progression.js';

const memory = new Map(), storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
let checks = 0;
function check(name, run) { run(); checks++; console.log(`PASS ${name}`); }

check('New profiles include both base cars and keep Aurora locked', () => {
  const p = createProfile(); assert.equal(p.credits, 0); assert(isCarUnlocked(p, 'falcone_f42')); assert(isCarUnlocked(p, 'stuttgart_959s')); assert(!isCarUnlocked(p, 'aurora_gt'));
});
check('Only course wins pay; duplicate course notifications never pay twice', () => {
  const start = createProfile(), loss = awardCourseWin(start, {runId:'race-a',stageIndex:0,won:false});
  assert.equal(loss.reward,0); assert.strictEqual(loss.profile,start);
  const win = awardCourseWin(start,{runId:'race-a',stageIndex:0,won:true,clean:true,difficulty:'pro'});
  assert.equal(win.reward,900); assert.equal(win.profile.credits,900); assert.equal(start.credits,0);
  const duplicate = awardCourseWin(win.profile,{runId:'race-a',stageIndex:0,won:true}); assert.equal(duplicate.reward,0);
  const nextCourse = awardCourseWin(win.profile,{runId:'race-a',stageIndex:1,won:true}); assert.equal(nextCourse.reward,650);
  const newRace = awardCourseWin(win.profile,{runId:'race-b',stageIndex:0,won:true}); assert.equal(newRace.reward,650);
  assert.equal(awardCourseWin(start,{runId:'',stageIndex:0,won:true}).reward,0);
  assert.equal(awardCourseWin(start,{runId:'race-a',stageIndex:999,won:true}).reward,0);
});
check('Awards remain idempotent after a saved profile is reloaded', () => {
  const p = awardCourseWin(createProfile(),{runId:'persistent-race',stageIndex:0,won:true}).profile;
  assert(saveProfile(p,storage)); const restored=loadProfile(storage);
  assert.equal(restored.credits,650); assert.equal(awardCourseWin(restored,{runId:'persistent-race',stageIndex:0,won:true}).reward,0);
});
check('Upgrades charge the correct cost, belong to one car, and stop at level three', () => {
  let p={...createProfile(),credits:5000};
  const first=purchaseUpgrade(p,'falcone_f42','engine'); assert(first.ok); assert.equal(first.cost,350);assert.equal(first.profile.credits,4650);assert.equal(getUpgradeLevels(p,'falcone_f42').engine,0);
  p=first.profile;p=purchaseUpgrade(p,'falcone_f42','engine').profile;p=purchaseUpgrade(p,'falcone_f42','engine').profile;
  assert.equal(p.credits,3100);assert.equal(getUpgradeLevels(p,'falcone_f42').engine,3);assert.equal(getUpgradeLevels(p,'stuttgart_959s').engine,0);
  const capped=purchaseUpgrade(p,'falcone_f42','engine');assert(!capped.ok);assert.strictEqual(capped.profile,p);
  const snapshot=getUpgradeLevels(p,'falcone_f42');snapshot.engine=0;assert.equal(getUpgradeLevels(p,'falcone_f42').engine,3);
});
check('Unaffordable and invalid purchases leave the profile intact', () => {
  const p=createProfile();for(const [car,type] of [['falcone_f42','engine'],['aurora_gt','engine'],['falcone_f42','unknown'],['missing','tires']]){const result=purchaseUpgrade(p,car,type);assert(!result.ok);assert.strictEqual(result.profile,p);}
  assert(!unlockCar(p,'aurora_gt').ok);assert(!unlockCar(p,'missing').ok);assert(!unlockCar(p,'falcone_f42').ok);
});
check('Aurora unlock costs 2200 credits and cannot be charged twice', () => {
  const p={...createProfile(),credits:2500},result=unlockCar(p,'aurora_gt');assert(result.ok);assert.equal(result.profile.credits,300);assert(isCarUnlocked(result.profile,'aurora_gt'));assert(!isCarUnlocked(p,'aurora_gt'));
  assert(!unlockCar(result.profile,'aurora_gt').ok);assert.equal(result.profile.credits,300);
  saveProfile(result.profile,storage);assert(isCarUnlocked(loadProfile(storage),'aurora_gt'));
});
check('Corrupt saves recover and invalid values are clamped', () => {
  memory.set(PROFILE_KEY,'not json');assert.deepEqual(loadProfile(storage),createProfile());
  memory.set(PROFILE_KEY,JSON.stringify({version:99,credits:100}));assert.equal(loadProfile(storage).credits,0);
  memory.set(PROFILE_KEY,JSON.stringify({version:1,credits:-100,unlockedCars:['missing'],upgrades:{falcone_f42:{engine:100,tires:-2,handling:'2'}},awardedWins:['a:0','a:0',3]}));
  const p=loadProfile(storage);assert.equal(p.credits,0);assert.equal(getUpgradeLevels(p,'falcone_f42').engine,3);assert.equal(getUpgradeLevels(p,'falcone_f42').tires,0);assert.equal(getUpgradeLevels(p,'falcone_f42').handling,2);assert.deepEqual(p.awardedWins,['a:0']);assert(!p.unlockedCars.includes('missing'));
});
check('Storage failures preserve a playable in-memory profile', () => {
  const unavailable={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  assert.deepEqual(loadProfile(unavailable),createProfile());assert.equal(saveProfile(createProfile(),unavailable),false);
});
check('Garage stats match race upgrade multipliers without changing base stats', () => {
  const base=CARS.falcone_f42, before=JSON.stringify(base), result=upgradedCar(base,{engine:3,handling:3,tires:3});
  assert.equal(result.topSpeed,base.topSpeed*1.105);assert.equal(result.accel,base.accel*1.12);assert.equal(result.braking,base.braking*1.18);assert.equal(result.grip,Math.min(1.2,base.grip+.135+.075));
  assert.equal(result.gears.at(-1),base.gears.at(-1)*1.105);assert.notStrictEqual(result.gears,base.gears);assert.equal(JSON.stringify(base),before);
});
console.log(`\n${checks} progression checks passed.`);
