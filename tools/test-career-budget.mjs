import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProfile,savePlayers,loadPlayers,PLAYERS_KEY,UPGRADE_TYPES} from '../src/progression.js';
import {CARS,COURSE} from '../src/config.js';
import {DRIVERS} from '../src/drivers.js';
import {WEAPON_IDS} from '../src/weapon-upgrades.js';
import {GHOST_KEY,MAX_GHOST_BYTES} from '../src/ghost.js';
import {loadGhosts,saveGhosts,MAX_GHOSTS} from '../src/ghost.js';
import {LapTelemetryStore,TELEMETRY_KEY,telemetryKey} from '../src/lap-telemetry.js';
import {loadLeaderboard} from '../src/leaderboard.js';
import {prepareCareerArchives} from '../src/career-archives.js';
import {ARCHIVE_POINTER_KEY} from '../src/career-archives.js';
import {backupCareer,captureCareer,parseCareerExport} from '../src/career-backup.js';
import {createBudgetCareerExport,importBudgetCareer,ORIGIN_BUDGET_BYTES,ORIGIN_JOURNAL_KEY,
  ORIGIN_POINTER_KEY,originStorageBytes,prepareCareerBudget} from '../src/career-budget.js';

function memoryStorage(){
  const rows=new Map();
  return {get length(){return rows.size;},key:index=>[...rows.keys()][index]??null,
    getItem:key=>rows.get(String(key))??null,setItem:(key,value)=>rows.set(String(key),String(value)),
    removeItem:key=>rows.delete(String(key)),entries:()=>[...rows]};
}
function memoryIdb(){
  const rows=new Map();let fail=null,corrupt=null;
  return {rows,failNext(id='*'){fail=id;},corruptNext(id){corrupt=id;},
    async save(record){if(fail==='*'||fail===record.id){fail=null;throw Error('Synthetic IndexedDB failure');}
      const copy=structuredClone(record);
      if(corrupt===record.id){copy.revision+=100;corrupt=null;}
      rows.set(record.id,copy);},
    async load(id){return structuredClone(rows.get(id));}};
}
function fullProfile(index){
  const profile=createProfile(),cars=Object.keys(CARS),upgrades=Object.keys(UPGRADE_TYPES);
  Object.assign(profile,{credits:1_000_000,unlockedCars:cars,
    upgrades:Object.fromEntries(cars.map(car=>[car,Object.fromEntries(upgrades.map(type=>[type,3]))])),
    cosmetics:Object.fromEntries(cars.map(car=>[car,{owned:['factory','copper_metallic','glacier_satin'],selected:'glacier_satin'}])),
    drivers:{version:1,unlocked:Object.keys(DRIVERS),selected:'mara_vale'},
    courses:{version:1,unlocked:COURSE.map(course=>course.id)},
    raceSettings:{version:1,eventId:'pacific-canyon',mode:'wasteland',car:'falcone_f42',difficulty:'pro',
      cpuDifficulty:'hard',routeVariant:'route_c',lightingMood:'golden',ghostEnabled:true},
    weapons:{version:1,unlocked:[...WEAPON_IDS],levels:Object.fromEntries(WEAPON_IDS.map(id=>[id,3]))},
    personalBests:Object.fromEntries(Array.from({length:128},(_,n)=>[`synthetic-best-player-${index}-seed-${n}|layout:4|falcone_f42|duel`,100+n/10])),
    history:Array.from({length:60},(_,n)=>({key:`synthetic-player-${index}-race-${n}`,eventId:'pacific-canyon',
      car:'falcone_f42',won:n%3!==0,completed:true,reward:500+n,charge:0,policeFineCharge:0,
      timeSec:120+n,cpuDifficulty:'easy',breakdown:{base:500,style:100,clean:0},milestones:[],at:n})),
    milestones:['clean_debut','faster_again','circuit_tour','trail_winner','night_escape','arena_show'],
    circuitWins:['pacific-canyon','high-country','harbor-highlands']});
  for(const field of ['settledResults','settledPoliceFines','pbBonusRuns']){
    profile[field]=Array.from({length:128},(_,n)=>`synthetic-player-${index}-${field}-${n}`);
  }
  return profile;
}

const physical=memoryStorage(),idb=memoryIdb();
physical.setItem('unrelated-origin-key','another application owns this');
const players={version:2,activePlayerId:'budget-player-0',players:Array.from({length:64},(_,index)=>({
  id:`budget-player-${index}`,name:`Budget ${index}`,profile:fullProfile(index),
}))};
assert.equal(savePlayers(players,physical),true);
const rawBytes=originStorageBytes(physical);
assert.ok(rawBytes>ORIGIN_BUDGET_BYTES,`64 full players need ${rawBytes} raw bytes`);
let backups=0,failures=[];
const setup=()=>prepareCareerBudget({physical,store:idb,
  backup:async()=>{backups++;return backupCareer(physical,idb,'before-origin-budget-migration');},
  onFailure:error=>failures.push(error.message)});
const first=await setup(),virtual=first.storage;
assert.equal(backups,1);
assert.equal(loadPlayers(virtual).players.length,64);
assert.equal(physical.getItem(PLAYERS_KEY),null);
assert.equal(physical.getItem('unrelated-origin-key'),'another application owns this');
assert.ok(physical.getItem(ORIGIN_POINTER_KEY));
assert.ok(originStorageBytes(physical)<ORIGIN_BUDGET_BYTES);
const migratedBytes=originStorageBytes(physical);

// Unknown game keys use the same prefix rule for capture, removal, and
// import validation. Migration must never erase one outside the snapshot.
const unknown=memoryStorage(),unknownDb=memoryIdb();
assert.equal(savePlayers({...players,players:players.players.slice(0,1)},unknown),true);
unknown.setItem('the-duel-future-loadout-v7','{"kit":"kept"}');
unknown.setItem('duel_retired_bonus_42','legacy-value');
unknown.setItem('the-duel-future.loadout:v8','punctuated-key-value');
const unknownView=(await prepareCareerBudget({physical:unknown,store:unknownDb,
  backup:()=>backupCareer(unknown,unknownDb,'before-origin-budget-migration')})).storage;
assert.equal(unknown.getItem('the-duel-future-loadout-v7'),null);
assert.equal(unknownView.getItem('the-duel-future-loadout-v7'),'{"kit":"kept"}');
assert.equal((await prepareCareerBudget({physical:unknown,store:unknownDb})).storage.getItem('duel_retired_bonus_42'),'legacy-value');
assert.equal(unknownView.getItem('the-duel-future.loadout:v8'),'punctuated-key-value');
const unknownExport=createBudgetCareerExport(unknownView),unknownFile=parseCareerExport(unknownExport);
assert.equal(unknownFile.entries['the-duel-future-loadout-v7'],'{"kit":"kept"}');
assert.equal(unknownFile.entries.duel_retired_bonus_42,'legacy-value');
assert.equal(unknownFile.entries['the-duel-future.loadout:v8'],'punctuated-key-value');
const unknownTarget=memoryStorage(),unknownTargetDb=memoryIdb();
const unknownImported=(await prepareCareerBudget({physical:unknownTarget,store:unknownTargetDb})).storage;
await importBudgetCareer(unknownExport,{storage:unknownImported,store:unknownTargetDb});
assert.equal((await prepareCareerBudget({physical:unknownTarget,store:unknownTargetDb})).storage.getItem('duel_retired_bonus_42'),'legacy-value');
assert.equal(unknownImported.getItem('the-duel-future.loadout:v8'),'punctuated-key-value');

// Records commit directly to IndexedDB and never enter the physical journal.
await virtual.setItem(GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
const ghostWriteBytes=originStorageBytes(physical);
assert.ok(ghostWriteBytes<2_000,`ghost payload stays out of localStorage: ${ghostWriteBytes} bytes`);
assert.equal((await idb.load('origin-primary-v1')).entries[GHOST_KEY].length,MAX_GHOST_BYTES);
assert.equal(virtual.getItem(GHOST_KEY).length,MAX_GHOST_BYTES);
assert.equal(physical.getItem(GHOST_KEY),null);
await virtual.flush();
assert.ok(originStorageBytes(physical)<ORIGIN_BUDGET_BYTES);
await virtual.removeItem(GHOST_KEY);await virtual.flush();
virtual.setItem('duel_null_semantics',null);
assert.equal(virtual.getItem('duel_null_semantics'),'null');
virtual.removeItem('duel_null_semantics');
assert.equal(virtual.getItem('duel_null_semantics'),null);
await virtual.flush();

// A synchronous accepted write is recoverable if its IndexedDB flush is
// interrupted. The next startup replays the journal over the old snapshot.
const old=virtual.getItem(PLAYERS_KEY),changed=old.replace('Budget 0','Recovered Driver');
assert.notEqual(changed,old);
virtual.setItem(PLAYERS_KEY,changed);
idb.failNext();
await assert.rejects(virtual.flush(),/Synthetic IndexedDB failure/);
assert.equal(virtual.getItem(PLAYERS_KEY),changed);
assert.ok(physical.getItem(ORIGIN_JOURNAL_KEY)?.includes('Recovered Driver'));
const restarted=(await setup()).storage;
assert.equal(backups,1);
assert.equal(loadPlayers(restarted).players[0].name,'Recovered Driver');
await restarted.flush();
assert.equal((await idb.load('origin-primary-v1')).entries[PLAYERS_KEY],changed);

const exported=createBudgetCareerExport(restarted);
assert.equal(parseCareerExport(exported).version,1);
const imported=JSON.parse(exported);
const replacement=JSON.parse(imported.entries[PLAYERS_KEY]);
replacement.players[0].name='Imported Driver';
imported.entries[PLAYERS_KEY]=JSON.stringify(replacement);
const importText=JSON.stringify(imported);
idb.failNext('origin-primary-v1');
await assert.rejects(importBudgetCareer(importText,{storage:restarted,store:idb}),/Import failed/);
assert.equal(loadPlayers(restarted).players[0].name,'Recovered Driver');
assert.equal(loadPlayers((await setup()).storage).players[0].name,'Recovered Driver');
idb.corruptNext('origin-primary-v1');
await assert.rejects(importBudgetCareer(importText,{storage:restarted,store:idb}),/Import failed/);
assert.equal(loadPlayers((await setup()).storage).players[0].name,'Recovered Driver');
await importBudgetCareer(importText,{storage:restarted,store:idb});
assert.equal(loadPlayers((await setup()).storage).players[0].name,'Imported Driver');
assert.ok([...idb.rows.values()].some(row=>row.reason==='before-import'&&row.entries[PLAYERS_KEY]===changed));

// An unrelated origin key is counted. At the boundary, reject before the
// virtual career changes and leave a visible failure signal for the UI.
physical.setItem('unrelated-origin-fill','q'.repeat(2_000_000));
const priorValue=restarted.getItem(PLAYERS_KEY);
assert.throws(()=>restarted.setItem(PLAYERS_KEY,priorValue.replace('Imported Driver','Would Not Save')),
  /Space used by unrelated-origin-fill/);
assert.equal(restarted.getItem(PLAYERS_KEY),priorValue);
assert.ok(failures.some(message=>message.includes('budget is full')));
physical.removeItem('unrelated-origin-fill');
restarted.setItem('unrelated-large','r'.repeat(800_000));
assert.equal(physical.getItem('unrelated-large').length,800_000);
restarted.setItem('duel_single_huge_write','g'.repeat(800_000));
assert.equal(restarted.getItem('duel_single_huge_write').length,800_000);
await restarted.flush();
physical.removeItem('unrelated-large');

// A historical save with old-layout rows crosses both migrations and is
// still a complete, validated version-2 export after the primary move.
const fixture=JSON.parse(await readFile(new URL('./fixtures/saves/07-records-and-ghosts.json',import.meta.url),'utf8'));
const direct=memoryStorage(),directDb=memoryIdb();
for(const [key,value] of Object.entries(fixture.storage))direct.setItem(key,JSON.stringify(value));
direct.setItem('the-duel-future-track-v7','future-metadata');
const directView=(await prepareCareerBudget({physical:direct,store:directDb,
  backup:()=>backupCareer(direct,directDb,'before-origin-budget-migration')})).storage;
assert.equal(loadLeaderboard(directView).archivedEntries.length,1);
assert.equal(loadGhosts(directView).archivedRecords.length,1);
const directFile=parseCareerExport(createBudgetCareerExport(directView));
assert.equal(directFile.version,2);
assert.equal(directFile.entries['the-duel-future-track-v7'],'future-metadata');
assert.equal(direct.getItem('the-duel-leaderboard-v1'),null);
const pointerFirst=memoryStorage(),pointerDb=memoryIdb();
for(const [key,value] of Object.entries(fixture.storage))pointerFirst.setItem(key,JSON.stringify(value));
const interruptedBoard=JSON.parse(pointerFirst.getItem('the-duel-leaderboard-v1'));
interruptedBoard.entries.push(interruptedBoard.archivedEntries[0]);
pointerFirst.setItem('the-duel-leaderboard-v1',JSON.stringify(interruptedBoard));
const interruptedGhosts=JSON.parse(pointerFirst.getItem(GHOST_KEY));
interruptedGhosts.records.push(interruptedGhosts.archivedRecords[0]);
pointerFirst.setItem(GHOST_KEY,JSON.stringify(interruptedGhosts));
const pendingArchive={id:'archive-pointer-first',version:1,leaderboardRows:fixture.storage['the-duel-leaderboard-v1'].archivedEntries,
  ghostRows:fixture.storage[GHOST_KEY].archivedRecords};
await pointerDb.save(pendingArchive);
pointerFirst.setItem(ARCHIVE_POINTER_KEY,JSON.stringify({version:1,id:pendingArchive.id}));
const pointerView=(await prepareCareerBudget({physical:pointerFirst,store:pointerDb,
  backup:()=>backupCareer(pointerFirst,pointerDb,'before-origin-budget-migration')})).storage;
assert.equal(loadLeaderboard(pointerView).entries.length,1);
assert.equal(loadLeaderboard(pointerView).archivedEntries.length,1);
assert.equal(loadGhosts(pointerView).records.length,1);
assert.equal(loadGhosts(pointerView).archivedRecords.length,1);
assert.equal(parseCareerExport(createBudgetCareerExport(pointerView)).version,2);
const legacy=memoryStorage(),archiveDb=memoryIdb();
for(const [key,value] of Object.entries(fixture.storage))legacy.setItem(key,JSON.stringify(value));
await prepareCareerArchives({storage:legacy,store:archiveDb,
  backup:()=>backupCareer(legacy,archiveDb,'before-archive-migration')});
const archived=(await prepareCareerBudget({physical:legacy,store:archiveDb,
  backup:()=>backupCareer(legacy,archiveDb,'before-origin-budget-migration')})).storage;
assert.equal(loadLeaderboard(archived).archivedEntries.length,1);
assert.equal(loadGhosts(archived).archivedRecords.length,1);
const archiveExport=createBudgetCareerExport(archived),parsed=parseCareerExport(archiveExport);
assert.equal(parsed.version,2);
assert.deepEqual(parsed.archives.ghostRows[0].samples,fixture.storage[GHOST_KEY].archivedRecords[0].samples);
const blank=memoryStorage(),blankDb=memoryIdb();
const target=(await prepareCareerBudget({physical:blank,store:blankDb})).storage;
await importBudgetCareer(archiveExport,{storage:target,store:blankDb});
assert.equal(loadLeaderboard((await prepareCareerBudget({physical:blank,store:blankDb})).storage).archivedEntries.length,1);
assert.equal(loadGhosts(target).archivedRecords.length,1);
const missing=memoryStorage();
missing.setItem(ORIGIN_POINTER_KEY,JSON.stringify({version:1,id:'origin-primary-v1'}));
await assert.rejects(prepareCareerBudget({physical:missing,store:memoryIdb()}),/snapshot is missing/);
assert.ok(missing.getItem(ORIGIN_POINTER_KEY));

// Import holds the facade exclusively, including while its backup is pending.
{
  const local=memoryStorage(),db=memoryIdb();
  const view=(await prepareCareerBudget({physical:local,store:db})).storage;
  let release,started;
  const blocked=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{started=resolve;});
  const save=db.save;
  db.save=async row=>{if(row.reason==='before-import'){started();await blocked;}return save(row);};
  const importing=importBudgetCareer(importText,{storage:view,store:db});
  await entered;
  assert.throws(()=>view.setItem(GHOST_KEY,'late-record'),/import is in progress/);
  assert.throws(()=>view.setItem('duel_late_profile','late'),/import is in progress/);
  release();await importing;
  assert.equal(loadPlayers(view).players[0].name,'Imported Driver');
  assert.equal(view.getItem(GHOST_KEY),null);
  view.setItem('duel_after_import','works');await view.flush();
  assert.equal((await prepareCareerBudget({physical:local,store:db})).storage.getItem('duel_after_import'),'works');
}

// Both legacy local keys and the pre-change primary+journal layout must move
// byte-for-byte. Failure before verification leaves the original keys intact.
for(const name of ['pre-change','full-ghosts']){
  const saved=JSON.parse(await readFile(new URL('./fixtures/save-records-idb/'+name+'.json',import.meta.url),'utf8'));
  const local=memoryStorage(),db=memoryIdb();
  for(const [key,value] of Object.entries(saved.storage))local.setItem(key,JSON.stringify(value));
  local.setItem('duel-kyle-before-max-fixture','b'.repeat(200_000));
  const original=captureCareer(local);
  db.failNext('origin-primary-v1');
  await assert.rejects(prepareCareerBudget({physical:local,store:db,
    backup:()=>backupCareer(local,db,'fixture-migration')}),/Synthetic/);
  assert.deepEqual(captureCareer(local),original);
  const view=(await prepareCareerBudget({physical:local,store:db,
    backup:()=>backupCareer(local,db,'fixture-migration')})).storage;
  assert.deepEqual(captureCareer(view),original);
  assert.equal(local.getItem(GHOST_KEY),null);
  assert.equal(local.getItem(TELEMETRY_KEY),null);
  assert.equal(local.getItem('duel-kyle-before-max-fixture').length,200_000);
  assert.equal(loadGhosts(view).records.length,name==='full-ghosts'?MAX_GHOSTS:1);
  assert.equal(new LapTelemetryStore(view).best(saved.storage[TELEMETRY_KEY].laps[0]).status,'saved');
  assert.deepEqual(captureCareer((await prepareCareerBudget({physical:local,store:db})).storage),original);
  if(name!=='full-ghosts')continue;

  // Recreate a pre-change journal containing complete record values. Its
  // base snapshot lacks those keys, just as before their first recording.
  const legacyLocal=memoryStorage(),legacyDb=memoryIdb(),baseEntries={...original};
  delete baseEntries[GHOST_KEY];delete baseEntries[TELEMETRY_KEY];
  await legacyDb.save({id:'origin-primary-v1',version:1,revision:0,entries:baseEntries});
  legacyLocal.setItem(ORIGIN_POINTER_KEY,JSON.stringify({version:1,id:'origin-primary-v1'}));
  legacyLocal.setItem(ORIGIN_JOURNAL_KEY,JSON.stringify({version:1,baseRevision:0,
    operations:[GHOST_KEY,TELEMETRY_KEY].map(key=>({key,oldLength:-1,oldHash:2166136261,
      prefix:0,suffix:0,insert:original[key],remove:false}))}));
  const oldJournal=legacyLocal.getItem(ORIGIN_JOURNAL_KEY);
  const recovered=(await prepareCareerBudget({physical:legacyLocal,store:legacyDb})).storage;
  assert.deepEqual(captureCareer(recovered),original);
  assert.equal(legacyLocal.getItem(ORIGIN_JOURNAL_KEY),oldJournal);
  await recovered.flush();
  assert.ok(originStorageBytes(legacyLocal)<2_000);
  assert.deepEqual(captureCareer((await prepareCareerBudget({physical:legacyLocal,store:legacyDb})).storage),original);

  const priorGhost=recovered.getItem(GHOST_KEY),nextGhost=JSON.parse(priorGhost);
  nextGhost.records[0].lastUsedAt+=1;
  legacyDb.failNext();
  assert.equal(await saveGhosts(nextGhost,recovered),false);
  assert.equal(recovered.getItem(GHOST_KEY),priorGhost);
  assert.equal((await prepareCareerBudget({physical:legacyLocal,store:legacyDb})).storage.getItem(GHOST_KEY),priorGhost);

  // Hold the actual IDB commit while an ordinary journal edit arrives.
  const save=legacyDb.save;let release,started;
  const blocked=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{started=resolve;});
  legacyDb.save=async record=>{started();await blocked;return save(record);};
  const saving=saveGhosts(nextGhost,recovered);
  await entered;
  recovered.setItem('duel_concurrent_profile','kept-during-record-write');
  assert.equal(recovered.getItem(GHOST_KEY),priorGhost,'pending records are not called saved');
  release();assert.equal(await saving,true);legacyDb.save=save;
  await recovered.flush();
  const again=(await prepareCareerBudget({physical:legacyLocal,store:legacyDb})).storage;
  assert.equal(again.getItem('duel_concurrent_profile'),'kept-during-record-write');
  assert.deepEqual(loadGhosts(again),loadGhosts(recovered));

  const laps=new LapTelemetryStore(again),lap=saved.storage[TELEMETRY_KEY].laps[0];
  const other={...lap,playerId:'second-telemetry-player'};other.key=telemetryKey(other);
  const third={...lap,playerId:'third-telemetry-player'};third.key=telemetryKey(third);
  const pending=laps.record(other),queued=laps.record(third);
  assert.equal((await pending).saved,true);assert.equal((await queued).saved,true);
  assert.equal(new LapTelemetryStore(again).best(other).status,'saved');
  assert.equal(new LapTelemetryStore(again).best(third).status,'saved');
  assert.ok(originStorageBytes(legacyLocal)<2_000);
}

console.log(`Career origin budget: 64 full players ${rawBytes} raw UTF-16 bytes -> ${migratedBytes} physical bytes; maximum ghost journal ${ghostWriteBytes} / ${ORIGIN_BUDGET_BYTES}. Restart, archive export/import, import rollback, and unrelated-key boundary passed.`);
