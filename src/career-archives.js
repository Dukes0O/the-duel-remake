import {LEADERBOARD_KEY,loadLeaderboard,setLeaderboardArchive,clearLeaderboardArchive} from './leaderboard.js';
import {GHOST_KEY,loadGhosts,setGhostArchive,clearGhostArchive} from './ghost.js';

export const ARCHIVE_POINTER_KEY='the-duel-archive-pointer-v1';
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const sameRows=(left,right)=>left.length===right.length&&
  same(left.map(row=>JSON.stringify(row)).sort(),right.map(row=>JSON.stringify(row)).sort());
const has=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const boardIdentity=row=>JSON.stringify([row.playerId,row.eventKey,row.car,row.timeSec,row.driverSignature??'']);
const ghostIdentity=row=>row.key;

function readJson(storage,key,fallback){
  const raw=storage.getItem(key);
  if(raw===null)return fallback;
  const value=JSON.parse(raw);
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid '+key+' save data.');
  return value;
}
function archivePointer(storage){
  const raw=storage.getItem(ARCHIVE_POINTER_KEY);
  if(raw===null)return null;
  const pointer=JSON.parse(raw);
  if(pointer?.version!==1||typeof pointer.id!=='string'||!pointer.id.startsWith('archive-'))throw new Error('Invalid career archive pointer.');
  return pointer;
}
function validateArchive(record,id){
  if(record?.id!==id||record.version!==1||!Array.isArray(record.leaderboardRows)||!Array.isArray(record.ghostRows)){
    throw new Error('The IndexedDB career archive is missing or invalid.');
  }
  return record;
}
function uniqueRows(rows,identity){
  const seen=new Map();
  return rows.filter(row=>{
    const key=identity(row),old=seen.get(key);
    if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new Error('Career archive rows have an ambiguous identity.');
    if(old)return false;
    seen.set(key,row);return true;
  });
}
function partition(rawRows,currentRows,identity){
  const current=new Set(currentRows.map(identity));
  return {active:rawRows.filter(row=>current.has(identity(row))),archived:rawRows.filter(row=>!current.has(identity(row)))};
}
function setViews(storage,record){
  setLeaderboardArchive(storage,record.leaderboardRows);
  try{setGhostArchive(storage,record.ghostRows);}
  catch(error){clearLeaderboardArchive(storage);throw error;}
}
function clearViews(storage){clearLeaderboardArchive(storage);clearGhostArchive(storage);}

// Called before App construction. The caller supplies FND-11's verified backup
// operation; this module never edits a career without that completed copy.
export async function prepareCareerArchives({storage,store,backup}){
  if(!storage||!store?.save||!store?.load||typeof backup!=='function')throw new Error('Career archive storage is unavailable.');
  const pointer=archivePointer(storage);
  const existing=pointer?validateArchive(await store.load(pointer.id),pointer.id):null;
  if(existing)setViews(storage,existing);
  const boardRaw=readJson(storage,LEADERBOARD_KEY,{version:1,entries:[],archivedEntries:[]});
  const ghostsRaw=readJson(storage,GHOST_KEY,{version:1,records:[],archivedRecords:[]});
  if(!Array.isArray(boardRaw.entries)||!Array.isArray(boardRaw.archivedEntries??[])||
    !Array.isArray(ghostsRaw.records)||!Array.isArray(ghostsRaw.archivedRecords??[])){
    throw new Error('Career archives cannot be migrated from malformed save data.');
  }
  const boardBefore=loadLeaderboard(storage),ghostsBefore=loadGhosts(storage);
  const boardParts=partition(boardRaw.entries,boardBefore.entries,boardIdentity);
  const ghostParts=partition(ghostsRaw.records,ghostsBefore.records,ghostIdentity);
  const boardMove=[...(boardRaw.archivedEntries??[]),...boardParts.archived];
  const ghostMove=[...(ghostsRaw.archivedRecords??[]),...ghostParts.archived];
  if(!boardMove.length&&!ghostMove.length)return existing;
  const combinedBoard=uniqueRows([...(existing?.leaderboardRows??[]),...boardMove],boardIdentity);
  const combinedGhosts=uniqueRows([...(existing?.ghostRows??[]),...ghostMove],ghostIdentity);
  const rawBoardCount=uniqueRows([...(existing?.leaderboardRows??[]),...boardRaw.entries,...(boardRaw.archivedEntries??[])],boardIdentity).length;
  const rawGhostCount=uniqueRows([...(existing?.ghostRows??[]),...ghostsRaw.records,...(ghostsRaw.archivedRecords??[])],ghostIdentity).length;
  if(boardBefore.entries.length+boardBefore.archivedEntries.length!==rawBoardCount||
    ghostsBefore.records.length+ghostsBefore.archivedRecords.length!==rawGhostCount){
    throw new Error('Career archives cannot be moved without losing a record.');
  }
  const verifiedBackup=await backup();
  const previous={
    pointer:storage.getItem(ARCHIVE_POINTER_KEY),
    board:storage.getItem(LEADERBOARD_KEY),
    ghosts:storage.getItem(GHOST_KEY),
  };
  const record={id:'archive-'+Date.now()+'-'+(globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)),
    version:1,createdAt:new Date().toISOString(),leaderboardRows:combinedBoard,ghostRows:combinedGhosts};
  await store.save(record);
  const saved=validateArchive(await store.load(record.id),record.id);
  if(!same(saved.leaderboardRows,combinedBoard)||!same(saved.ghostRows,combinedGhosts))throw new Error('The IndexedDB career archive could not be verified.');
  try{
    // Pointer first: a crash during the following localStorage writes still
    // leaves a way to find the complete archive on the next startup.
    storage.setItem(ARCHIVE_POINTER_KEY,JSON.stringify({version:1,id:record.id}));
    if(previous.board!==null)storage.setItem(LEADERBOARD_KEY,JSON.stringify({...boardRaw,entries:boardParts.active,archivedEntries:[]}));
    if(previous.ghosts!==null)storage.setItem(GHOST_KEY,JSON.stringify({...ghostsRaw,records:ghostParts.active,archivedRecords:[]}));
    setViews(storage,record);
    const boardAfter=loadLeaderboard(storage),ghostsAfter=loadGhosts(storage);
    if(!sameRows(boardAfter.entries,boardBefore.entries)||!sameRows(boardAfter.archivedEntries,boardBefore.archivedEntries)||
      !sameRows(ghostsAfter.records,ghostsBefore.records)||!sameRows(ghostsAfter.archivedRecords,ghostsBefore.archivedRecords)){
      throw new Error('The migrated archive view differs from the original career.');
    }
  }catch(error){
    try{
      for(const [key,value] of [[ARCHIVE_POINTER_KEY,previous.pointer],[LEADERBOARD_KEY,previous.board],[GHOST_KEY,previous.ghosts]]){
        if(value===null)storage.removeItem(key);else storage.setItem(key,value);
      }
      if(existing)setViews(storage,existing);else clearViews(storage);
    }catch(rollbackError){
      throw new Error('Archive migration failed and localStorage rollback failed. Recovery backup '+verifiedBackup.id+' remains available. '+rollbackError.message,{cause:error});
    }
    throw new Error('Archive migration failed; the prior career was restored. '+error.message,{cause:error});
  }
  return record;
}

export function readCareerArchivePointer(storage){return archivePointer(storage);}
export function installCareerArchive(storage,record){if(record)setViews(storage,validateArchive(record,record.id));else clearViews(storage);}
