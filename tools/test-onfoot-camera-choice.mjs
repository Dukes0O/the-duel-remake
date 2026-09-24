import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {createProfile, PLAYERS_KEY} from '../src/progression.js';
import {needsCareerMigration, backupBeforeMigration, captureCareer} from '../src/career-backup.js';
import {keyboardAction, INPUT_CONTEXTS} from '../src/input-contexts.js';

const memory=new Map();
const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
globalThis.localStorage=storage; globalThis.cancelAnimationFrame=()=>{};
let checks=0;const failures=[];
async function check(name,run){checks++;try{await run();}catch(error){failures.push(`${name}: ${error.message}`);}}
function appFixture(){memory.clear();const app=new App();app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{wasteland2:true}});return app;}

await check('old and malformed preferences default first person without changing other choices',()=>{
  const profile=createProfile();
  for(const value of [undefined,null,'wrong',{},false]){
    const result=normalizeRaceSettings({footCamera:value,ghostEnabled:false,difficulty:'pro'},profile);
    assert.equal(result.footCamera,'first-person');assert.equal(result.ghostEnabled,false);assert.equal(result.difficulty,'pro');
  }
  assert.equal(normalizeRaceSettings({footCamera:'overhead'},profile).footCamera,'overhead');
});
await check('missing preference requires verified backup; failure never writes old bytes',async()=>{
  memory.clear();const profile=createProfile();profile.raceSettings=normalizeRaceSettings({},profile);delete profile.raceSettings.footCamera;
  storage.setItem(PLAYERS_KEY,JSON.stringify({version:2,activePlayerId:'test',players:[{id:'test',name:'Test',profile}]}));
  const before=captureCareer(storage),records=new Map();assert.equal(needsCareerMigration(storage),true);
  const backup=await backupBeforeMigration(storage,{async save(row){records.set(row.id,structuredClone(row));},async load(id){return records.get(id);}});
  assert.deepEqual(backup.entries,before);assert.deepEqual(captureCareer(storage),before);
  await assert.rejects(backupBeforeMigration(storage,{async save(){throw Error('blocked');},async load(){return null;}}));
  assert.deepEqual(captureCareer(storage),before);
});
await check('named-player preference persists and remains separate from car camera and race choices',()=>{
  const app=appFixture();assert.equal(app.footCameraMode,'first-person');
  const first=app.player.id,choices=structuredClone(app.getRaceChoices());app.setCamera('wide');
  assert.equal(app.setFootCamera('overhead'),'overhead');assert.equal(app.cameraMode,'wide');assert.deepEqual(app.getRaceChoices(),choices);
  assert.equal(app.setFootCamera('invalid'),'overhead');
  const reloaded=new App();reloaded.duel.featureFlags=createFeatureFlags({storage:null,overrides:{wasteland2:true}});
  assert.equal(reloaded.footCameraMode,'overhead');reloaded.dispose();
  app.addPlayer('Second camera');assert.equal(app.footCameraMode,'first-person');app.selectPlayer(first);assert.equal(app.footCameraMode,'overhead');
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{wasteland2:false}});
  const before=JSON.stringify(app.profile);assert.equal(app.footCameraMode,'first-person');app.setFootCamera('first-person');assert.equal(JSON.stringify(app.profile),before);
  app.dispose();
});
await check('foot KeyC changes presentation only; car keys and gamepad map remain unchanged',()=>{
  assert.equal(keyboardAction('foot','KeyC'),'foot-camera-cycle');assert.equal(keyboardAction('car','KeyC'),'camera:front');
  assert.deepEqual(INPUT_CONTEXTS.foot.gamepad,[[9,'pause'],[2,'enter-car'],[0,'jump'],[7,'fire'],[6,'aim'],[12,'gear:1'],[15,'gear:2'],[13,'gear:3']]);
  const app=appFixture();app.startCampaign({mode:'wasteland',startStage:0,seed:1989});
  app.duel.state.status='racing';app.duel.state.countdown=0;app.duel.state.onFoot=true;
  app.setCamera('back');app._footPointer={lookX:4,lookY:-2,fire:true,aim:true};
  const before=structuredClone(app.duel.state),pointer=structuredClone(app._footPointer);
  app._inputAction(keyboardAction('foot','KeyC'));assert.equal(app.footCameraMode,'overhead');assert.equal(app.cameraMode,'back');
  assert.deepEqual(app.duel.state,before);assert.deepEqual(app._footPointer,pointer);
  app._inputAction(keyboardAction('foot','KeyC'));assert.equal(app.footCameraMode,'first-person');assert.deepEqual(app.duel.state,before);
  app.duel.state.onFoot=false;assert.equal(app.cameraMode,'back');app.returnToMenu();assert.equal(app._footPointer.fire,false);app.dispose();
});

for(const failure of failures)console.error(`FAIL ${failure}`);
console.log(`On-foot camera choice: ${checks-failures.length}/${checks} checks passed; ${failures.length} failed.`);
if(failures.length)process.exitCode=1;
