import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createProfile,createPlayerRegistry,savePlayers,loadPlayers} from '../src/progression.js';
import * as backups from '../src/career-backup.js';
import {prepareCareerBudget,createBudgetCareerExport,importBudgetCareer} from '../src/career-budget.js';

const LEGACY_KEY='duel_redline_best_v4';
function memoryStorage(){
  const rows=new Map();
  return {get length(){return rows.size;},key:index=>[...rows.keys()][index]??null,
    getItem:key=>rows.get(String(key))??null,setItem:(key,value)=>rows.set(String(key),String(value)),
    removeItem:key=>rows.delete(String(key))};
}
function memoryStore(){
  const rows=new Map();
  return {rows,async save(record){rows.set(record.id,structuredClone(record));},
    async load(id){return structuredClone(rows.get(id));}};
}

// A finished race leaves the comparison to per-player progression. Its core
// simulation cannot recreate the removed shared key or claim a shared best.
const storage=memoryStorage();
const previousStorage=globalThis.localStorage;
globalThis.localStorage=storage;
try{
  const duel=new Duel({seed:1989});duel.startCampaign({mode:'timetrial'});
  Object.assign(duel.state,{status:'racing',completedLaps:duel.state.lapsTotal,s:duel.raceLength,stageTimeSec:60});
  assert.equal(duel._finishStage(),true);
  assert.equal(storage.getItem(LEGACY_KEY),null);
  assert.equal(Object.hasOwn(duel.state.results,'isPersonalBest'),false);
  assert.equal(Object.hasOwn(duel.state.results,'best'),false);
  for(const method of ['_recordBest','_bestFor','_bestKey'])assert.equal(method in duel,false,method);
  const app=new App();app.startCampaign({mode:'timetrial'});
  Object.assign(app.duel.state,{status:'racing',completedLaps:app.duel.state.lapsTotal,
    s:app.duel.raceLength,stageTimeSec:60});
  assert.equal(app.duel._finishStage(),true);
  assert.equal(app.duel.state.results.personalBest,true);
  assert.equal(app.duel.state.results.best,60,'App supplies the displayed per-player best');
  assert.equal(storage.getItem(LEGACY_KEY),null);
}finally{
  if(previousStorage===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=previousStorage;
}

// Migration copies legacy data first. Retirement then verifies a separate
// backup before deleting the key from the durable budget snapshot.
const physical=memoryStorage(),store=memoryStore();
const playerProfile=createProfile();playerProfile.personalBests={'historic-player-best':42};
assert.equal(savePlayers(createPlayerRegistry(playerProfile),physical),true);
physical.setItem(LEGACY_KEY,JSON.stringify({'shared-best':39}));
const prepared=await prepareCareerBudget({physical,store,
  backup:()=>backups.backupCareer(physical,store,'before-origin-budget-migration')});
const career=prepared.storage;
assert.equal(career.getItem(LEGACY_KEY),JSON.stringify({'shared-best':39}));
assert.equal(typeof backups.retireSharedBest,'function');
const failedStore={...store,async save(){throw new Error('backup unavailable');}};
await assert.rejects(()=>backups.retireSharedBest(career,failedStore),/backup unavailable/);
assert.notEqual(career.getItem(LEGACY_KEY),null,'failed backup leaves the key intact');
assert.equal(await backups.retireSharedBest(career,store),true);
assert.equal(career.getItem(LEGACY_KEY),null);
assert.equal((await store.load('origin-primary-v1')).entries[LEGACY_KEY],undefined);
assert.deepEqual(loadPlayers(career).players[0].profile.personalBests,{'historic-player-best':42});
const retirement=[...store.rows.values()].find(record=>record.reason==='before-shared-best-retirement');
assert.equal(retirement.entries[LEGACY_KEY],JSON.stringify({'shared-best':39}));
assert.equal(await backups.retireSharedBest(career,store),false,'retirement is idempotent');
assert.equal([...store.rows.values()].filter(record=>record.reason==='before-shared-best-retirement').length,1);

// Old exported files remain readable, but importing one cannot revive the
// obsolete key or disturb a player's own personal bests.
const exported=JSON.parse(createBudgetCareerExport(career));
exported.entries[LEGACY_KEY]=JSON.stringify({'old-export-best':25});
const imported=await importBudgetCareer(JSON.stringify(exported),{storage:career,store});
assert.ok(imported.backupId);
assert.equal(career.getItem(LEGACY_KEY),null);
assert.deepEqual(loadPlayers(career).players[0].profile.personalBests,{'historic-player-best':42});
const oldTarget=memoryStorage(),oldTargetStore=memoryStore();
await backups.importCareer(JSON.stringify(exported),{storage:oldTarget,backupStore:oldTargetStore});
assert.equal(oldTarget.getItem(LEGACY_KEY),null,'the historical import path cannot revive the key');
assert.deepEqual(loadPlayers(oldTarget).players[0].profile.personalBests,{'historic-player-best':42});
console.log('OLD-02: shared-best retirement, verified backup, import and player isolation passed.');
