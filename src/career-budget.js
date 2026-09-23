import {CAREER_FORMAT,captureCareer,parseCareerExport} from './career-backup.js';
import {ARCHIVE_POINTER_KEY,readCareerArchivePointer} from './career-archives.js';
import {loadLeaderboard} from './leaderboard.js';
import {loadGhosts} from './ghost.js';

export const ORIGIN_BUDGET_BYTES=4_000_000;
export const ORIGIN_POINTER_KEY='__the_duel_origin_pointer_v1';
export const ORIGIN_JOURNAL_KEY='__the_duel_origin_journal_v1';
const PRIMARY_ID='origin-primary-v1';
const GHOST_KEY='the-duel-ghosts-v1',BOARD_KEY='the-duel-leaderboard-v1';
const GHOST_WRITE_RESERVE=2_600_000;
const isGameKey=key=>key.startsWith('the-duel-')||key.startsWith('duel_');
const has=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

export function originStorageBytes(storage){
  let total=0;
  for(let index=0;index<storage.length;index++){
    const key=storage.key(index),value=storage.getItem(key);
    if(key!==null&&value!==null)total+=2*(key.length+value.length);
  }
  return total;
}
function projectedBytes(storage,key,value){
  const prior=storage.getItem(key);
  return originStorageBytes(storage)-2*(prior===null?0:key.length+prior.length)+2*(key.length+value.length);
}
function validateSnapshot(record){
  if(record?.id!==PRIMARY_ID||record.version!==1||!Number.isSafeInteger(record.revision)||record.revision<0||
    !record.entries||typeof record.entries!=='object'||Array.isArray(record.entries)||
    Object.entries(record.entries).some(([key,value])=>!isGameKey(key)||typeof value!=='string')){
    throw new Error('The IndexedDB career snapshot is missing or invalid.');
  }
  return record;
}
function validateJournal(value){
  if(value?.version!==1||!Number.isSafeInteger(value.baseRevision)||value.baseRevision<0||!Array.isArray(value.operations)||
    value.operations.some(op=>!isGameKey(op?.key)||!Number.isSafeInteger(op.oldLength)||op.oldLength< -1||
      !Number.isSafeInteger(op.prefix)||op.prefix<0||!Number.isSafeInteger(op.suffix)||op.suffix<0||
      !Number.isSafeInteger(op.oldHash)||op.oldHash<0||typeof op.insert!=='string'||typeof op.remove!=='boolean')){
    throw new Error('The local career journal is invalid.');
  }
  return value;
}
function hash(value){
  let code=2166136261;
  for(let index=0;index<value.length;index++)code=Math.imul(code^value.charCodeAt(index),16777619);
  return code>>>0;
}
function patchFor(key,oldValue,newValue){
  if(newValue===null)return {key,oldLength:oldValue?.length??-1,oldHash:hash(oldValue??''),prefix:0,suffix:0,insert:'',remove:true};
  if(oldValue===null)return {key,oldLength:-1,oldHash:hash(''),prefix:0,suffix:0,insert:newValue,remove:false};
  let prefix=0,suffix=0;
  while(prefix<oldValue.length&&prefix<newValue.length&&oldValue[prefix]===newValue[prefix])prefix++;
  while(suffix<oldValue.length-prefix&&suffix<newValue.length-prefix&&
    oldValue[oldValue.length-1-suffix]===newValue[newValue.length-1-suffix])suffix++;
  return {key,oldLength:oldValue.length,oldHash:hash(oldValue),prefix,suffix,
    insert:newValue.slice(prefix,newValue.length-suffix),remove:false};
}
function applyOperation(entries,op){
  const oldValue=entries[op.key]??null;
  if((oldValue?.length??-1)!==op.oldLength||hash(oldValue??'')!==op.oldHash){
    throw new Error('The career journal does not match its IndexedDB snapshot.');
  }
  if(op.remove){delete entries[op.key];return;}
  if(op.prefix+op.suffix>(oldValue?.length??0))throw new Error('The career journal has an invalid edit.');
  entries[op.key]=(oldValue?.slice(0,op.prefix)??'')+op.insert+(op.suffix?oldValue.slice(-op.suffix):'');
}
function parseJournal(physical){
  const raw=physical.getItem(ORIGIN_JOURNAL_KEY);
  return raw===null?null:validateJournal(JSON.parse(raw));
}
function replay(snapshot,journal){
  if(!journal)return {...snapshot.entries};
  const consumed=snapshot.revision-journal.baseRevision;
  if(consumed<0||consumed>journal.operations.length)throw new Error('The career journal and IndexedDB revision disagree.');
  const entries={...snapshot.entries};
  for(const op of journal.operations.slice(consumed))applyOperation(entries,op);
  return entries;
}
function physicalGameKeys(physical){
  const keys=[];
  for(let index=0;index<physical.length;index++){
    const key=physical.key(index);
    if(isGameKey(key))keys.push(key);
  }
  return keys;
}
function uniqueRows(rows,identity){
  const seen=new Map();
  return rows.filter(row=>{
    const key=identity(row),old=seen.get(key);
    if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new Error('Stored career archives have conflicting records.');
    if(old)return false;
    seen.set(key,row);return true;
  });
}
function combinedRows(current,archived,fromArchive,identity){
  const old=uniqueRows([...archived,...fromArchive],identity),oldKeys=new Set(old.map(identity));
  const active=uniqueRows(current,identity).filter(row=>!oldKeys.has(identity(row)));
  // Check duplicates across the current and archived lists for ambiguity.
  uniqueRows([...current,...old],identity);
  return {active,archived:old};
}
function mergeOldArchives(entries,record){
  const board=JSON.parse(entries[BOARD_KEY]??'{"version":1,"entries":[],"archivedEntries":[]}');
  const ghosts=JSON.parse(entries[GHOST_KEY]??'{"version":1,"records":[],"archivedRecords":[]}');
  if(board.version!==1||!Array.isArray(board.entries)||!Array.isArray(board.archivedEntries??[])||
    ghosts.version!==1||!Array.isArray(ghosts.records)||!Array.isArray(ghosts.archivedRecords??[])){
    throw new Error('Stored career records cannot be moved without loss.');
  }
  const boardRows=combinedRows(board.entries,board.archivedEntries??[],record.leaderboardRows,
    row=>JSON.stringify([row.playerId,row.eventKey,row.car,row.timeSec,row.driverSignature??'']));
  const ghostRows=combinedRows(ghosts.records,ghosts.archivedRecords??[],record.ghostRows,row=>row.key);
  const completeBoard=JSON.stringify({...board,entries:boardRows.active,archivedEntries:boardRows.archived});
  const completeGhosts=JSON.stringify({...ghosts,records:ghostRows.active,archivedRecords:ghostRows.archived});
  const probe={getItem:key=>key===BOARD_KEY?completeBoard:key===GHOST_KEY?completeGhosts:null};
  const loadedBoard=loadLeaderboard(probe),loadedGhosts=loadGhosts(probe);
  if(loadedBoard.entries.length+loadedBoard.archivedEntries.length!==boardRows.active.length+boardRows.archived.length||
    loadedGhosts.records.length+loadedGhosts.archivedRecords.length!==ghostRows.active.length+ghostRows.archived.length){
    throw new Error('Stored career archives cannot be loaded without loss.');
  }
  entries[BOARD_KEY]=completeBoard;
  entries[GHOST_KEY]=completeGhosts;
  delete entries[ARCHIVE_POINTER_KEY];
}
function createFacade(physical,store,snapshot,journal,onFailure){
  let base=snapshot,log=journal??{version:1,baseRevision:snapshot.revision,operations:[]};
  let entries=replay(snapshot,log),inflight=null,lastError=null;
  const report=error=>{lastError=error;onFailure?.(error);};
  const visibleKeys=()=>{
    const keys=new Set(Object.keys(entries));
    for(let index=0;index<physical.length;index++){
      const key=physical.key(index);
      if(key!==ORIGIN_POINTER_KEY&&key!==ORIGIN_JOURNAL_KEY&&!isGameKey(key))keys.add(key);
    }
    return [...keys];
  };
  async function flush(){
    if(inflight)return inflight;
    const consumed=base.revision-log.baseRevision;
    if(consumed===log.operations.length)return;
    const count=log.operations.length,newEntries={...base.entries};
    for(const op of log.operations.slice(consumed,count))applyOperation(newEntries,op);
    const next={id:PRIMARY_ID,version:1,revision:log.baseRevision+count,entries:newEntries};
    inflight=(async()=>{
      await store.save(next);
      const saved=validateSnapshot(await store.load(PRIMARY_ID));
      if(!same(saved,next))throw new Error('The IndexedDB career snapshot could not be verified.');
      base=next;
      const trimmed={version:1,baseRevision:next.revision,operations:log.operations.slice(count)};
      try{physical.setItem(ORIGIN_JOURNAL_KEY,JSON.stringify(trimmed));log=trimmed;}
      catch(error){report(new Error('Career journal cleanup failed; recovery data is retained. '+error.message));}
    })().finally(()=>{
      inflight=null;
      if(base.revision-log.baseRevision<log.operations.length)setTimeout(()=>{void flush().catch(report);},0);
    });
    return inflight;
  }
  async function drain(){
    do{await flush();}
    while(base.revision-log.baseRevision<log.operations.length);
  }
  function write(key,value,remove=false){
    key=String(key);value=remove?null:String(value);
    if(!isGameKey(key)){
      try{
        if(value===null){physical.removeItem(key);return;}
        if(projectedBytes(physical,key,value)>=ORIGIN_BUDGET_BYTES-GHOST_WRITE_RESERVE){
          throw new Error('The 4 MB origin storage budget must reserve space for a future ghost.');
        }
        physical.setItem(key,value);return;
      }catch(error){report(error);throw error;}
    }
    const oldValue=entries[key]??null;
    if(oldValue===value)return;
    const operation=patchFor(key,oldValue,value);
    const next={version:1,baseRevision:log.baseRevision,operations:[...log.operations,operation]};
    const serialized=JSON.stringify(next);
    const ceiling=key===GHOST_KEY?ORIGIN_BUDGET_BYTES:ORIGIN_BUDGET_BYTES-GHOST_WRITE_RESERVE;
    if(projectedBytes(physical,ORIGIN_JOURNAL_KEY,serialized)>=ceiling){
      const error=new Error('The 4 MB origin storage budget is full; this change was not saved.');report(error);throw error;
    }
    try{physical.setItem(ORIGIN_JOURNAL_KEY,serialized);}
    catch(error){report(error);throw error;}
    log=next;
    if(value===null)delete entries[key];else entries[key]=value;
    setTimeout(()=>{void flush().catch(report);},0);
  }
  const facade={
    get length(){return visibleKeys().length;},
    key:index=>visibleKeys()[index]??null,
    getItem:key=>{key=String(key);return isGameKey(key)?entries[key]??null:physical.getItem(key);},
    setItem:(key,value)=>write(key,value),
    removeItem:key=>write(key,null,true),
    clear(){throw new Error('Use career import to replace this save safely.');},
    flush:drain,
    get lastError(){return lastError;},
    get physical(){return physical;},
    get snapshotRevision(){return base.revision;},
    replaceSnapshot(next){base=next;log={version:1,baseRevision:next.revision,operations:[]};entries={...next.entries};lastError=null;},
  };
  return facade;
}

export async function prepareCareerBudget({physical,store,backup,onFailure,installGlobal=false}={}){
  if(!physical||!store?.save||!store?.load)throw new Error('Career budget storage is unavailable.');
  let snapshot=await store.load(PRIMARY_ID),journal=parseJournal(physical),backupRecord=null;
  const pointerRaw=physical.getItem(ORIGIN_POINTER_KEY);
  let pointer=null;
  if(pointerRaw){try{pointer=JSON.parse(pointerRaw);}catch{throw new Error('The career origin pointer is invalid.');}}
  if(snapshot){
    snapshot=validateSnapshot(snapshot);
    if(pointer?.backupId){
      if(snapshot.revision===pointer.to){physical.removeItem(ORIGIN_JOURNAL_KEY);journal=null;}
      else if(snapshot.revision!==pointer.from)throw new Error('The interrupted career import needs recovery.');
      physical.setItem(ORIGIN_POINTER_KEY,JSON.stringify({version:1,id:PRIMARY_ID}));
    }else if(!pointer){
      const raw=captureCareer(physical),archivePointer=readCareerArchivePointer(physical);
      if(archivePointer){
        const record=await store.load(archivePointer.id);
        if(record?.id!==archivePointer.id||!Array.isArray(record.leaderboardRows)||!Array.isArray(record.ghostRows)){
          throw new Error('The IndexedDB record archive cannot be read.');
        }
        mergeOldArchives(raw,record);
      }
      if(!same(raw,snapshot.entries))throw new Error('The IndexedDB career snapshot does not match the unmigrated local career.');
      physical.setItem(ORIGIN_POINTER_KEY,JSON.stringify({version:1,id:PRIMARY_ID}));
    }else if(pointer.version!==1||pointer.id!==PRIMARY_ID){
      throw new Error('The career origin pointer does not match its IndexedDB snapshot.');
    }
    replay(snapshot,journal);
  }else{
    if(journal)throw new Error('The career journal has no IndexedDB snapshot.');
    if(physical.getItem(ORIGIN_POINTER_KEY))throw new Error('The IndexedDB career snapshot is missing. Keep site data for recovery.');
    const entries=captureCareer(physical),archivePointer=readCareerArchivePointer(physical);
    if(archivePointer){
      const record=await store.load(archivePointer.id);
      if(record?.id!==archivePointer.id||!Array.isArray(record.leaderboardRows)||!Array.isArray(record.ghostRows)){
        throw new Error('The IndexedDB record archive cannot be read.');
      }
      mergeOldArchives(entries,record);
    }
    if(Object.keys(entries).length){
      if(typeof backup!=='function')throw new Error('A verified backup is required before the career budget migration.');
      backupRecord=await backup();
      if(!backupRecord?.id)throw new Error('The career budget backup could not be verified.');
    }
    snapshot={id:PRIMARY_ID,version:1,revision:0,entries};
    await store.save(snapshot);
    const saved=validateSnapshot(await store.load(PRIMARY_ID));
    if(!same(saved,snapshot))throw new Error('The IndexedDB career snapshot could not be verified.');
    physical.setItem(ORIGIN_POINTER_KEY,JSON.stringify({version:1,id:PRIMARY_ID}));
  }
  // The durable snapshot is authoritative. A crash after its pointer was
  // written can leave old local keys; removing them is safe and repeatable.
  for(const key of physicalGameKeys(physical)){
    if(key!==ARCHIVE_POINTER_KEY&&!has(snapshot.entries,key)){
      throw new Error('A local career key was not copied into the IndexedDB snapshot: '+key);
    }
    physical.removeItem(key);
  }
  if(originStorageBytes(physical)>=ORIGIN_BUDGET_BYTES-GHOST_WRITE_RESERVE){
    throw new Error('Unrelated origin data leaves no room for a future ghost within the 4 MB localStorage budget.');
  }
  const storage=createFacade(physical,store,snapshot,journal,onFailure);
  if(installGlobal)Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  return {storage,physical,backupId:backupRecord?.id??null,flush:()=>storage.flush()};
}

export function createBudgetCareerExport(storage,now=()=>new Date()){
  const entries=captureCareer(storage),boardRaw=entries[BOARD_KEY],ghostRaw=entries[GHOST_KEY];
  let board=null,ghosts=null;
  try{board=boardRaw?JSON.parse(boardRaw):null;ghosts=ghostRaw?JSON.parse(ghostRaw):null;}
  catch{return JSON.stringify({format:CAREER_FORMAT,version:1,exportedAt:now().toISOString(),entries},null,2);}
  if((board&&!Array.isArray(board.archivedEntries??[]))||(ghosts&&!Array.isArray(ghosts.archivedRecords??[]))){
    return JSON.stringify({format:CAREER_FORMAT,version:1,exportedAt:now().toISOString(),entries},null,2);
  }
  const leaderboardRows=board?.archivedEntries??[],ghostRows=ghosts?.archivedRecords??[];
  if(!leaderboardRows.length&&!ghostRows.length){
    return JSON.stringify({format:CAREER_FORMAT,version:1,exportedAt:now().toISOString(),entries},null,2);
  }
  const id='archive-export-'+(globalThis.crypto?.randomUUID?.()??Date.now());
  entries[ARCHIVE_POINTER_KEY]=JSON.stringify({version:1,id});
  if(boardRaw)entries[BOARD_KEY]=JSON.stringify({...board,archivedEntries:[]});
  if(ghostRaw)entries[GHOST_KEY]=JSON.stringify({...ghosts,archivedRecords:[]});
  return JSON.stringify({format:CAREER_FORMAT,version:2,exportedAt:now().toISOString(),entries,
    archives:{id,version:1,leaderboardRows,ghostRows}},null,2);
}
function importedEntries(archive){
  const entries={...archive.entries};
  if(archive.version===2)mergeOldArchives(entries,archive.archives);
  return entries;
}
export async function importBudgetCareer(text,{storage,store}={}){
  if(!storage?.physical||!store?.save||!store?.load)throw new Error('Career budget import is unavailable.');
  const archive=parseCareerExport(text),entries=importedEntries(archive),physical=storage.physical;
  await storage.flush();
  const prior=validateSnapshot(await store.load(PRIMARY_ID));
  const recovery={id:'career-'+Date.now()+'-'+(globalThis.crypto?.randomUUID?.()??Math.random()),
    reason:'before-import',createdAt:new Date().toISOString(),entries:captureCareer(storage),archives:null};
  await store.save(recovery);
  if(!same(await store.load(recovery.id),recovery))throw new Error('The pre-import career backup could not be verified.');
  const next={id:PRIMARY_ID,version:1,revision:prior.revision+1,entries};
  const marker={version:1,from:prior.revision,to:next.revision,backupId:recovery.id};
  physical.setItem(ORIGIN_POINTER_KEY,JSON.stringify(marker));
  try{
    await store.save(next);
    const saved=validateSnapshot(await store.load(PRIMARY_ID));
    if(!same(saved,next))throw new Error('The imported IndexedDB career could not be verified.');
    physical.removeItem(ORIGIN_JOURNAL_KEY);
    physical.setItem(ORIGIN_POINTER_KEY,JSON.stringify({version:1,id:PRIMARY_ID}));
    storage.replaceSnapshot(next);
  }catch(error){
    try{
      const current=await store.load(PRIMARY_ID);
      if(!same(current,prior))await store.save(prior);
      if(!same(await store.load(PRIMARY_ID),prior))throw new Error('Rollback snapshot verification failed.');
      physical.setItem(ORIGIN_POINTER_KEY,JSON.stringify({version:1,id:PRIMARY_ID}));
    }catch(rollbackError){
      throw new Error('Import failed and rollback failed. Recovery backup '+recovery.id+' remains available. '+rollbackError.message,{cause:error});
    }
    throw new Error('Import failed; the previous career was restored. '+error.message,{cause:error});
  }
  return {backupId:recovery.id,playerCount:entries['the-duel-players-v2']?JSON.parse(entries['the-duel-players-v2']).players.length:1};
}
