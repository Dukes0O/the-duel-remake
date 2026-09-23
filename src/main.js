import {App} from './app.js';
import {mountScreenRouter} from './screen-router.js';
import {backupBeforeMigration, backupCareer, captureCareer, createCompleteCareerExport, createIndexedDbBackupStore, retireSharedBest} from './career-backup.js';
import {prepareCareerBudget, createBudgetCareerExport, ORIGIN_POINTER_KEY} from './career-budget.js';

const root = document.querySelector('#app');
const backupStore=createIndexedDbBackupStore();
let budgetStorage=null;
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
  await backupBeforeMigration(undefined,backupStore);
  const physical=globalThis.localStorage;
  budgetStorage=await prepareCareerBudget({physical,store:backupStore,
    backup:()=>backupCareer(physical,backupStore,'before-origin-budget-migration'),
    onFailure:error=>{
      let notice=document.querySelector('#career-save-error');
      if(!notice){notice=document.createElement('aside');notice.id='career-save-error';notice.setAttribute('role','alert');
        notice.style.cssText='position:fixed;z-index:9999;inset:auto 12px 12px;background:#5a1515;color:white;padding:14px 18px;border:2px solid #ffc6a1;font:15px/1.4 system-ui';
        document.body.append(notice);}
      notice.textContent='Career save failed. Stop playing and export your career before closing this tab. '+error.message;
    },installGlobal:true});
  await backupBeforeMigration(budgetStorage.storage,backupStore);
  await retireSharedBest(budgetStorage.storage,backupStore);
})().catch(error=>{
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
export const app = new App();
const screens = mountScreenRouter(app, downloadCareer, {budgetStorage, backupStore});
export const refreshRaceSetup = screens.refreshRaceSetup;
