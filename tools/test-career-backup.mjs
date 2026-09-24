import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  backupBeforeMigration,backupCareer,captureCareer,createCareerExport,
  importCareer,needsCareerMigration,parseCareerExport,restoreCareerBackup,
} from '../src/career-backup.js';
import {createProfile,loadPlayers} from '../src/progression.js';
import {loadLeaderboard} from '../src/leaderboard.js';
import {loadGhosts} from '../src/ghost.js';

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  let failNextWrite=false,failEveryWrite=false;
  return {
    get length(){return values.size;},
    key(index){return [...values.keys()][index]??null;},
    getItem(key){return values.get(key)??null;},
    setItem(key,value){
      if(failNextWrite||failEveryWrite){failNextWrite=false;throw new Error('Quota exceeded');}
      values.set(key,String(value));
    },
    removeItem(key){values.delete(key);},
    failOnce(){failNextWrite=true;},
    failAlways(){failEveryWrite=true;},
    allowWrites(){failEveryWrite=false;},
  };
}
function memoryBackups(){
  const records=new Map();
  return {
    records,
    async save(record){records.set(record.id,structuredClone(record));},
    async load(id){return structuredClone(records.get(id));},
  };
}
const dir=new URL('./fixtures/saves/',import.meta.url);
const fixtures=readdirSync(fileURLToPath(dir)).filter(name=>name.endsWith('.json')).sort();
assert.equal(fixtures.length,7);
for(const name of fixtures){
  const fixture=JSON.parse(readFileSync(new URL(name,dir),'utf8'));
  const source=memoryStorage(Object.fromEntries(Object.entries(fixture.storage).map(([key,value])=>[key,JSON.stringify(value)])));
  source.setItem('duel_graphics_quality','performance');
  source.setItem('duel_future_save_v3','{"untouched":true}');
  const raw=captureCareer(source),text=createCareerExport(source);
  assert.deepEqual(parseCareerExport(text).entries,raw,name+' export kept every byte');
  const prior=memoryStorage({'the-duel-players-v2':JSON.stringify({version:2,activePlayerId:'old',players:[{id:'old',name:'Old',profile:{version:2,credits:99}}]}),'other-app-key':'unrelated'});
  const previous=captureCareer(prior),backups=memoryBackups();
  const result=await importCareer(text,{storage:prior,backupStore:backups});
  assert.deepEqual(captureCareer(prior),raw,name+' import kept every byte');
  assert.equal(prior.getItem('other-app-key'),'unrelated',name+' unrelated origin data');
  assert.deepEqual((await backups.load(result.backupId)).entries,previous,name+' pre-import recovery copy');
  assert.ok(loadPlayers(prior).players.length>=1,name+' players load');
  loadLeaderboard(prior);loadGhosts(prior);
  await restoreCareerBackup(result.backupId,{storage:prior,backupStore:backups});
  assert.deepEqual(captureCareer(prior),previous,name+' recovery restored old data');
}

const legacy=JSON.parse(readFileSync(new URL('01-single-profile.json',dir),'utf8'));
const old=memoryStorage({'the-duel-profile-v1':JSON.stringify(legacy.storage['the-duel-profile-v1'])});
const oldRaw=captureCareer(old),backups=memoryBackups();
assert.equal(needsCareerMigration(old),true);
const migration=await backupBeforeMigration(old,backups);
assert.equal(migration.reason,'migration');
old.setItem('the-duel-players-v2',JSON.stringify({version:2,activePlayerId:'new',players:[{id:'new',name:'New',profile:{...createProfile(),raceSettings:{footCamera:'first-person'}}}]}));
assert.deepEqual((await backups.load(migration.id)).entries,oldRaw,'migration backup predates write');
assert.equal(needsCareerMigration(old),false);
assert.equal(await backupBeforeMigration(old,backups),null,'no backup for unchanged format');
assert.equal(needsCareerMigration(memoryStorage({'the-duel-leaderboard-v1':'{"version":1,"entries":[]}'})),true,'orphaned records are copied before a new player registry is written');
// CAR-01 must back up saves that already have valid discovery fields but lack
// the new currency and territory shape. All storage here is memory-only.
for (const missing of ['scrap', 'territories', 'territory-entry']) {
  const profile = {...createProfile(), raceSettings: {footCamera: 'first-person'}};
  if (missing === 'territory-entry') delete profile.wasteland.territories.sal;
  else delete profile.wasteland[missing];
  const source = memoryStorage({'the-duel-players-v2': JSON.stringify({
    version: 2, activePlayerId: 'phase-one',
    players: [{id: 'phase-one', name: 'Phase One', profile}],
  })});
  const before = captureCareer(source), store = memoryBackups();
  assert.equal(needsCareerMigration(source), true, missing + ' requires backup');
  await assert.rejects(backupBeforeMigration(source, {
    save: async () => { throw new Error('backup unavailable'); },
  }), /backup unavailable/);
  assert.deepEqual(captureCareer(source), before, missing + ' failed backup leaves bytes unchanged');
  await assert.rejects(backupBeforeMigration(source, {
    save: async () => {}, load: async () => null,
  }), /could not be verified/);
  assert.deepEqual(captureCareer(source), before, missing + ' unverified backup leaves bytes unchanged');
  const saved = await backupBeforeMigration(source, store);
  assert.deepEqual((await store.load(saved.id)).entries, before, missing + ' verified original bytes');
}

const malformed=memoryStorage({'the-duel-players-v2':JSON.stringify({version:2,activePlayerId:'broken',players:[{id:'broken',name:'Broken',profile:{version:9,raceSettings:{}}}]})});
assert.equal(needsCareerMigration(malformed),true,'normalization that would rewrite a damaged profile is backed up');
const changing=memoryStorage({'the-duel-profile-v1':JSON.stringify(legacy.storage['the-duel-profile-v1'])});
const changingBackups=memoryBackups();
await assert.rejects(backupBeforeMigration(changing,{
  async save(record){await changingBackups.save(record);changing.setItem('duel_route_variant','route-b');},
  load:id=>changingBackups.load(id),
}),/changed while/);

const current=memoryStorage({'the-duel-players-v2':JSON.stringify({version:2,activePlayerId:'current',players:[{id:'current',name:'Current',profile:{...createProfile(),raceSettings:{}}}]})});
const original=captureCareer(current),file=createCareerExport(memoryStorage({'the-duel-profile-v1':JSON.stringify(legacy.storage['the-duel-profile-v1'])}));
const badCredits=JSON.parse(file);badCredits.entries['the-duel-profile-v1']=JSON.stringify({...legacy.storage['the-duel-profile-v1'],credits:'banana'});
const badNested=JSON.parse(createCareerExport(current)),badRegistry=JSON.parse(badNested.entries['the-duel-players-v2']);
badRegistry.players[0].profile.credits='banana';badNested.entries['the-duel-players-v2']=JSON.stringify(badRegistry);
const badGhost=JSON.parse(createCareerExport(memoryStorage(Object.fromEntries(Object.entries(JSON.parse(readFileSync(new URL('07-records-and-ghosts.json',dir),'utf8')).storage).map(([key,value])=>[key,JSON.stringify(value)])))));
const ghosts=JSON.parse(badGhost.entries['the-duel-ghosts-v1']);ghosts.records[0].samples[0][0]='bad';badGhost.entries['the-duel-ghosts-v1']=JSON.stringify(ghosts);
const archiveFixture=JSON.parse(readFileSync(new URL('07-records-and-ghosts.json',dir),'utf8'));
const archiveSource=memoryStorage(Object.fromEntries(Object.entries(archiveFixture.storage).map(([key,value])=>[key,JSON.stringify(value)])));
const badCar=JSON.parse(createCareerExport(archiveSource)),badBoard=JSON.parse(badCar.entries['the-duel-leaderboard-v1']);
badBoard.entries[0].car='unknown-car';badCar.entries['the-duel-leaderboard-v1']=JSON.stringify(badBoard);
const badSampleTime=JSON.parse(createCareerExport(archiveSource)),badSamples=JSON.parse(badSampleTime.entries['the-duel-ghosts-v1']);
badSamples.records[0].samples[1][0]=0;badSampleTime.entries['the-duel-ghosts-v1']=JSON.stringify(badSamples);
for(const bad of ['bad json',JSON.stringify({...JSON.parse(file),version:9}),JSON.stringify({...JSON.parse(file),entries:{'the-duel-players-v2':'{}'}}),JSON.stringify(badCredits),JSON.stringify(badNested),JSON.stringify(badGhost),JSON.stringify(badCar),JSON.stringify(badSampleTime)]){
  await assert.rejects(importCareer(bad,{storage:current,backupStore:memoryBackups()}));
  assert.deepEqual(captureCareer(current),original,'invalid file left current save alone');
}
const reordered=JSON.parse(createCareerExport(memoryStorage({'the-duel-profile-v1':JSON.stringify(legacy.storage['the-duel-profile-v1']),'duel_graphics_quality':'high'})));
reordered.entries=Object.fromEntries(Object.entries(reordered.entries).reverse());
await importCareer(JSON.stringify(reordered),{storage:current,backupStore:memoryBackups()});
assert.deepEqual(captureCareer(current),reordered.entries,'reordered entry keys are valid');
current.removeItem('duel_graphics_quality');
current.removeItem('the-duel-profile-v1');
current.setItem('the-duel-players-v2',original['the-duel-players-v2']);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const preflight=main.indexOf('await backupBeforeMigration(undefined,backupStore)');
const budgetGate=main.indexOf('budgetStorage=await prepareCareerBudget(');
const virtualPreflight=main.indexOf('await backupBeforeMigration(budgetStorage.storage,backupStore)');
const appConstruction=main.indexOf('export const app = new App()');
assert.ok(preflight>=0&&budgetGate>preflight&&virtualPreflight>budgetGate&&appConstruction>virtualPreflight,
  'browser entry backs up both raw and imported older careers before App can migrate');
await assert.rejects(importCareer(file,{storage:current,backupStore:{save:async()=>{throw new Error('IDB failed');}}}),/IDB failed/);
assert.deepEqual(captureCareer(current),original,'failed backup blocked import');
current.failOnce();
await assert.rejects(importCareer(file,{storage:current,backupStore:memoryBackups()}),/previous career was restored/);
assert.deepEqual(captureCareer(current),original,'quota failure rolled back');
await assert.rejects(backupCareer(current,{save:async()=>{},load:async()=>null}),/could not be verified/);
assert.deepEqual(captureCareer(current),original,'unverified backup did not change the save');
console.log('career backup: seven historical fixtures, migration gate, validation, recovery, and quota rollback passed');
