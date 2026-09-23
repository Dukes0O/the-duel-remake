import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCareerArchives,ARCHIVE_POINTER_KEY} from '../src/career-archives.js';
import {LEADERBOARD_KEY,loadLeaderboard,saveLeaderboard} from '../src/leaderboard.js';
import {GHOST_KEY,loadGhosts,saveGhosts} from '../src/ghost.js';
import {backupCareer,captureCareer,createCareerExport,createCompleteCareerExport,importCareer,parseCareerExport,restoreCareerBackup} from '../src/career-backup.js';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/saves/07-records-and-ghosts.json',import.meta.url),'utf8'));
function storage(){
  const values=new Map(Object.entries(fixture.storage).map(([key,value])=>[key,JSON.stringify(value)]));
  let failKey=null;
  return {
    get length(){return values.size;},
    key:index=>[...values.keys()][index]??null,
    getItem:key=>values.get(key)??null,
    setItem(key,value){if(failKey===key){failKey=null;throw new Error('Quota exceeded');}values.set(key,String(value));},
    removeItem:key=>values.delete(key),
    failOnce:key=>{failKey=key;},
  };
}
function store(){
  const records=new Map();
  return {
    records,
    async save(record){records.set(record.id,structuredClone(record));},
    async load(id){return structuredClone(records.get(id));},
  };
}
const target=storage(),database=store(),rawBefore=captureCareer(target);
const beforeBoard=loadLeaderboard(target),beforeGhosts=loadGhosts(target);
let preflightBackup;
const record=await prepareCareerArchives({storage:target,store:database,backup:async()=>{
  preflightBackup=await backupCareer(target,database,'before-archive-migration');
  return preflightBackup;
}});
assert.deepEqual((await database.load(preflightBackup.id)).entries,rawBefore,'verified recovery copy predates localStorage writes');
assert.equal(record.leaderboardRows.length,1);
assert.equal(record.ghostRows.length,1);
assert.equal(JSON.parse(target.getItem(ARCHIVE_POINTER_KEY)).id,record.id);
assert.deepEqual(JSON.parse(target.getItem(LEADERBOARD_KEY)).archivedEntries,[]);
assert.deepEqual(JSON.parse(target.getItem(GHOST_KEY)).archivedRecords,[]);
assert.deepEqual(loadLeaderboard(target),beforeBoard,'all leaderboard metadata remains loadable');
assert.deepEqual(loadGhosts(target),beforeGhosts,'all ghost samples remain loadable');
assert.ok(saveLeaderboard(beforeBoard,target));
assert.ok(saveGhosts(beforeGhosts,target));
assert.deepEqual(JSON.parse(target.getItem(LEADERBOARD_KEY)).archivedEntries,[]);
assert.deepEqual(JSON.parse(target.getItem(GHOST_KEY)).archivedRecords,[]);
assert.deepEqual(await prepareCareerArchives({storage:target,store:database,backup:async()=>{throw Error('unneeded backup');}}),record,'restart hydrates without writing');

const complete=await createCompleteCareerExport(target,database);
const exported=parseCareerExport(complete);
assert.equal(exported.version,2);
assert.deepEqual(exported.archives.leaderboardRows,record.leaderboardRows,'export retains every archived record field');
assert.deepEqual(exported.archives.ghostRows,record.ghostRows,'export retains every ghost sample');
await assert.rejects(createCompleteCareerExport(target,store()),/could not be read/,'missing IndexedDB archive blocks partial export');
const imported=storage(),importStore=store(),beforeImport=captureCareer(imported);
const result=await importCareer(complete,{storage:imported,backupStore:importStore});
assert.deepEqual(loadLeaderboard(imported),beforeBoard,'import hydrates all current and archived leaderboard records');
assert.deepEqual(loadGhosts(imported),beforeGhosts,'import hydrates all current and archived ghost samples');
const importedPointer=JSON.parse(imported.getItem(ARCHIVE_POINTER_KEY));
assert.deepEqual((await importStore.load(importedPointer.id)).leaderboardRows,record.leaderboardRows);
assert.deepEqual((await importStore.load(importedPointer.id)).ghostRows,record.ghostRows);
await restoreCareerBackup(result.backupId,{storage:imported,backupStore:importStore});
assert.deepEqual(captureCareer(imported),beforeImport,'recovery restores prior raw localStorage');
assert.equal(imported.getItem(ARCHIVE_POINTER_KEY),null);

const invalidBoard=structuredClone(exported);
invalidBoard.archives.leaderboardRows[0].car='unknown-car';
assert.throws(()=>parseCareerExport(JSON.stringify(invalidBoard)),/would discard/);
const invalidGhost=structuredClone(exported);
invalidGhost.archives.ghostRows[0].samples[1][0]=0;
assert.throws(()=>parseCareerExport(JSON.stringify(invalidGhost)),/would discard/);
const malformedPointer=structuredClone(exported);
malformedPointer.entries[ARCHIVE_POINTER_KEY]=JSON.stringify({version:1,id:'archive-missing'});
assert.throws(()=>parseCareerExport(JSON.stringify(malformedPointer)),/missing or invalid/);
const importBlocked=storage(),blockedRaw=captureCareer(importBlocked);
const importDatabase=store();
await assert.rejects(importCareer(complete,{storage:importBlocked,backupStore:{
  async save(value){if(value.id.startsWith('archive-'))throw new Error('IDB archive denied');await importDatabase.save(value);},
  load:id=>importDatabase.load(id),
}}),/IDB archive denied/);
assert.deepEqual(captureCareer(importBlocked),blockedRaw,'failed archive import leaves prior career intact');

const interrupted=storage(),interruptedDb=store();
await interruptedDb.save(record);
interrupted.setItem(ARCHIVE_POINTER_KEY,JSON.stringify({version:1,id:record.id}));
const resumed=await prepareCareerArchives({storage:interrupted,store:interruptedDb,
  backup:()=>backupCareer(interrupted,interruptedDb,'resume-archive-migration')});
assert.deepEqual(loadLeaderboard(interrupted),beforeBoard,'pointer-first interrupted move restores leaderboard');
assert.deepEqual(loadGhosts(interrupted),beforeGhosts,'pointer-first interrupted move restores ghost samples');
assert.equal(JSON.parse(interrupted.getItem(LEADERBOARD_KEY)).archivedEntries.length,0);
assert.equal(JSON.parse(interrupted.getItem(GHOST_KEY)).archivedRecords.length,0);
assert.ok(resumed.id!==record.id,'restart writes a verified consolidated archive');

const migratedRaw=captureCareer(target),plainFile=createCareerExport(storage());
const replacing=await importCareer(plainFile,{storage:target,backupStore:database});
assert.equal(target.getItem(ARCHIVE_POINTER_KEY),null,'v1 import removes the prior archive pointer');
assert.deepEqual(loadLeaderboard(target),beforeBoard,'v1 import restores raw archived leaderboard rows');
assert.deepEqual(loadGhosts(target),beforeGhosts,'v1 import restores raw archived ghost samples');
await restoreCareerBackup(replacing.backupId,{storage:target,backupStore:database});
assert.deepEqual(captureCareer(target),migratedRaw,'recovery restores both-store localStorage bytes');
assert.deepEqual(loadLeaderboard(target),beforeBoard,'recovery hydrates archived leaderboard rows');
assert.deepEqual(loadGhosts(target),beforeGhosts,'recovery hydrates archived ghost samples');

const blocked=storage(),blockedBefore={board:blocked.getItem(LEADERBOARD_KEY),ghosts:blocked.getItem(GHOST_KEY)};
await assert.rejects(prepareCareerArchives({storage:blocked,store:{save:async()=>{throw Error('IDB unavailable');},load:async()=>null},backup:async()=>({id:'safe'})}),/IDB unavailable/);
assert.equal(blocked.getItem(LEADERBOARD_KEY),blockedBefore.board);
assert.equal(blocked.getItem(GHOST_KEY),blockedBefore.ghosts);
assert.equal(blocked.getItem(ARCHIVE_POINTER_KEY),null);

const unreadable=storage();
await assert.rejects(prepareCareerArchives({storage:unreadable,store:{save:async()=>{},load:async()=>null},
  backup:async()=>({id:'safe'})}),/missing or invalid/);
assert.equal(unreadable.getItem(LEADERBOARD_KEY),blockedBefore.board,'unverified IDB copy leaves source records');
assert.equal(unreadable.getItem(GHOST_KEY),blockedBefore.ghosts,'unverified IDB copy leaves source ghosts');
assert.equal(unreadable.getItem(ARCHIVE_POINTER_KEY),null);

const quota=storage();quota.failOnce(GHOST_KEY);
await assert.rejects(prepareCareerArchives({storage:quota,store:store(),backup:async()=>({id:'safe'})}),/prior career was restored/);
assert.equal(quota.getItem(LEADERBOARD_KEY),blockedBefore.board);
assert.equal(quota.getItem(GHOST_KEY),blockedBefore.ghosts);
assert.equal(quota.getItem(ARCHIVE_POINTER_KEY),null);
console.log('career archives: historical records and ghost samples hydrate; IDB and quota failures leave raw saves intact');
