import {App} from './app.js';
import {kelpCoastProvider} from './deep/zones/kelp-coast.js';
import {mountScreenRouter} from './screen-router.js';
import {backupBeforeMigration, backupCareer, captureCareer, createCompleteCareerExport, createIndexedDbBackupStore, requestPersistentStorage, retireSharedBest} from './career-backup.js';
import {restoreLostCareers, showRestoreNotice} from './career-restore.js';
import {acquireCareerWriter, CAREER_WRITER_LOCK, prepareCareerBudget, createBudgetCareerExport, ORIGIN_POINTER_KEY} from './career-budget.js';

const root = document.querySelector('#app');
// A QA entry may inject a tab-scoped store before this module loads. Production
// builds cannot select it and always use the durable IndexedDB implementation.
const qaBuild=typeof __DUEL_QA__!=='undefined'&&__DUEL_QA__===true;
const qaBackupStore=qaBuild?globalThis.__duelQaBackupStore:null;
const backupStore=qaBackupStore??createIndexedDbBackupStore();
// Ask the browser to keep the game's storage when the disk fills up. Start-up never waits for the answer.
void requestPersistentStorage();
let budgetStorage=null,careersRestored=false;
async function downloadCareer(){
  if(!budgetStorage){
    const physical=globalThis.localStorage;
    if(physical?.getItem(ORIGIN_POINTER_KEY)||!Object.keys(captureCareer(physical)).length){
      throw new Error('The IndexedDB career snapshot is unavailable. Restore IndexedDB access and reload before exporting.');
    }
    let snapshot;
    try{snapshot=await backupStore.load('origin-primary-v1');}catch{}
    if(snapshot)throw new Error('The IndexedDB career snapshot needs recovery. Reload after restoring browser storage before exporting.');
  }
  const content=budgetStorage?createBudgetCareerExport(budgetStorage.storage):await createCompleteCareerExport(undefined,backupStore);
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='the-duel-career-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
await (async()=>{
  // Private QA careers are tab-scoped; production tabs share one durable career.
  const writerName=qaBackupStore?CAREER_WRITER_LOCK+'-qa-'+crypto.randomUUID():CAREER_WRITER_LOCK;
  const writer=await acquireCareerWriter({name:writerName});
  writer.assertActive();
  await backupBeforeMigration(undefined,backupStore);
  writer.assertActive();
  const physical=globalThis.localStorage;
  budgetStorage=await prepareCareerBudget({physical,store:backupStore,writer,
    backup:()=>backupCareer(physical,backupStore,'before-origin-budget-migration'),
    onFailure:error=>{
      let notice=document.querySelector('#career-save-error');
      if(!notice){notice=document.createElement('aside');notice.id='career-save-error';notice.setAttribute('role','alert');
        notice.style.cssText='position:fixed;z-index:9999;inset:auto 12px 12px;background:#5a1515;color:white;padding:14px 18px;border:2px solid #ffc6a1;font:15px/1.4 system-ui';
        document.body.append(notice);}
      notice.textContent='Career save failed. Stop playing and export your career before closing this tab. '+error.message;
    },installGlobal:true});
  await budgetStorage.flush();
  writer.assertActive();
  await backupBeforeMigration(budgetStorage.storage,backupStore);
  writer.assertActive();
  await retireSharedBest(budgetStorage.storage,backupStore);
  writer.assertActive();
  // One-time restore of the two lost careers (CAREER-RESTORE-REMOVE deletes this block).
  // Test builds run it only when the address asks for it, so other checks keep their own players.
  if(!qaBuild&&!import.meta.env?.DEV||new URLSearchParams(location.search).has('restore-career')){
    try{careersRestored=(await restoreLostCareers({storage:budgetStorage.storage,backupStore})).restored;}
    catch(error){if(error.code?.startsWith('CAREER_WRITER_'))throw error;console.warn('Career restore skipped: '+error.message);}
    writer.assertActive();
  }
})().catch(error=>{
  if(error.code?.startsWith('CAREER_WRITER_')){
    root.innerHTML='<section class="backup-blocked" role="alert"><p class="eyebrow">CAREER STORAGE</p><h1 id="writer-title"></h1><p id="writer-error"></p></section>';
    root.querySelector('#writer-title').textContent=error.code==='CAREER_WRITER_BUSY'?'THE DUEL IS ALREADY OPEN.':'RELOAD BEFORE PLAYING.';
    root.querySelector('#writer-error').textContent=error.message;
    // This tab has no verified current career. Do not attach an export handler.
    throw error;
  }
  const archiveProblem=/archive|snapshot|journal|origin pointer|budget/i.test(error.message);
  root.innerHTML=archiveProblem
    ?'<section class="backup-blocked" role="alert"><p class="eyebrow">CAREER STORAGE NEEDS RECOVERY</p><h1>KEEP THIS BROWSER DATA.</h1><p id="backup-error"></p><button type="button" id="backup-export">TRY COMPLETE EXPORT</button></section>'
    :'<section class="backup-blocked" role="alert"><p class="eyebrow">CAREER BACKUP REQUIRED</p><h1>YOUR CAREER IS SAFE.</h1><p id="backup-error"></p><button type="button" id="backup-export">EXPORT YOUR CURRENT SAVE</button></section>';
  root.querySelector('#backup-error').textContent=archiveProblem
    ?'The game could not verify the stored career. '+error.message+' Do not clear site data. Restore IndexedDB access and reload. A complete export can download only when every stored part is readable.'
    :'The game could not verify an automatic backup before updating this save. '+error.message+' Free browser storage or enable IndexedDB, then reload.';
  root.querySelector('#backup-export').addEventListener('click',event=>{
    void downloadCareer().catch(exportError=>event.target.insertAdjacentText('afterend',' Export failed: '+exportError.message));
  });
  throw error;
});
export const app = new App({deepProviders:[kelpCoastProvider]});
const screens = mountScreenRouter(app, downloadCareer, {budgetStorage, backupStore});
export const refreshRaceSetup = screens.refreshRaceSetup;
if(careersRestored)showRestoreNotice();
