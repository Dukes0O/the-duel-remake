import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMemoryBackupStore,installIsolatedStorage} from './qa-storage.js';
let checks=0,reads=0;
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const host={};Object.defineProperty(host,'localStorage',{configurable:true,get(){reads++;throw Error('Real saves must never be read');}});
const memory=installIsolatedStorage(host),storage=host.localStorage;
same(reads,0,'install does not inspect the real save store');
same(storage.getItem('wallet'),null,'real data is not copied into QA');
storage.setItem('wallet',2000);same(storage.getItem('wallet'),'2000','Storage values match browser string semantics');
same([storage.length,storage.key(0),memory.size],[1,'wallet',1],'fixture diagnostics and Storage enumeration agree');
storage.removeItem('wallet');same(storage.getItem('wallet'),null,'removal affects only temporary data');
storage.setItem(2,3);same(storage.getItem('2'),'3','keys are normalized');storage.clear();same(storage.length,0,'clear touches only the memory map');
const second={};installIsolatedStorage(second);storage.setItem('wallet',50);same(second.localStorage.getItem('wallet'),null,'test pages have separate memory');
const blocked={};Object.defineProperty(blocked,'localStorage',{value:{},configurable:false});
assert.throws(()=>installIsolatedStorage(blocked),TypeError);checks++;
const opened=[],deleted=[],nativeIdb={
  open(name,version){opened.push([name,version]);return {name};},
  deleteDatabase(name){deleted.push(name);return {name};},
};
const firstTab={name:'',indexedDB:nativeIdb,crypto:{randomUUID:()=> 'tab-one'}};
installIsolatedStorage(firstTab);
firstTab.localStorage.setItem('the-duel-players-v2','career one');
firstTab.indexedDB.open('the-duel-career-backups',1);
const restartedTab={name:firstTab.name,indexedDB:nativeIdb};
installIsolatedStorage(restartedTab);
same(restartedTab.localStorage.getItem('the-duel-players-v2'),'career one','same-tab restart keeps the disposable career');
same(restartedTab.__qaIndexedDbName('the-duel-career-backups'),opened[0][0],
  'same-tab restart keeps its IndexedDB namespace');
const otherTab={name:'',indexedDB:nativeIdb,crypto:{randomUUID:()=> 'tab-two'}};
installIsolatedStorage(otherTab);
same(otherTab.localStorage.getItem('the-duel-players-v2'),null,'second tab starts with a fresh career');
assert.notEqual(otherTab.__qaIndexedDbName('the-duel-career-backups'),opened[0][0]);checks++;
otherTab.indexedDB.open('the-duel-career-backups',1);
same(opened.map(row=>row[0]),['the-duel-career-backups__qa_tab_tab-one','the-duel-career-backups__qa_tab_tab-two'],
  'both tabs open different physical databases');
otherTab.indexedDB.deleteDatabase('the-duel-career-backups');
same(deleted,['the-duel-career-backups__qa_tab_tab-two'],'database deletion stays inside the second tab namespace');
const memoryBackups=createMemoryBackupStore();
const backup={id:'preview-only',version:1,entries:{wallet:'500'}};
await memoryBackups.save(backup);
backup.entries.wallet='real-store-never-touched';
same(await memoryBackups.load('preview-only'),{id:'preview-only',version:1,entries:{wallet:'500'}},
  'preview backup store keeps a detached in-memory copy');
const loaded=await memoryBackups.load('preview-only');loaded.entries.wallet='changed';
same((await memoryBackups.load('preview-only')).entries.wallet,'500',
  'callers cannot mutate the saved in-memory snapshot');
same(await createMemoryBackupStore().load('preview-only'),undefined,
  'a new preview tab has no saved IndexedDB career data');
for(const file of ['visual-check','reward-check','reverse-check','contact-check','jump-height-check','update-check','menu-check']){
  const source=readFileSync(new URL(`./${file}.js`,import.meta.url),'utf8');
  assert.ok(source.includes("from './qa-storage.js'"));checks++;
  const install=source.indexOf('installIsolatedStorage();'),appImport=source.search(/await import\('\.\.\/src\/(?:main|app)\.js'\)/);
  assert.ok(install>=0&&appImport>install,`${file} isolates saves before loading App`);checks++;
  assert.ok(!/import\s*\{[^}]*App[^}]*\}\s*from/.test(source),`${file} cannot eagerly import App`);checks++;
}
const menuSource=readFileSync(new URL('./menu-check.js',import.meta.url),'utf8');
const optIn=menuSource.match(/if\(qaParams\.get\('memory-backups'\)===\'1\'\)\{([^}]+)\}/);
assert.ok(optIn,'menu memory backups require the exact explicit query opt-in');checks++;
const installMemoryProvider=new Function('qaParams','createMemoryBackupStore','window',optIn[0]);
for(const query of ['', '?career-archive=1', '?career-archive-missing=1', '?career-backup-failure=1', '?career-origin-missing=1', '?memory-backups=0']){
  const target={};let providers=0;
  installMemoryProvider(new URLSearchParams(query),()=>{providers++;return{};},target);
  same(providers,0,'default/archive/blocked fixtures retain their original provider: '+query);
  same(target.__duelQaBackupStore,undefined,'no blanket menu provider: '+query);
}
const memoryTarget={name:'',crypto:{randomUUID:()=> 'career-opt-in'}};
installIsolatedStorage(memoryTarget);
installMemoryProvider(new URLSearchParams('?memory-backups=1'),createMemoryBackupStore,memoryTarget);
const recovery={id:'actual-recovery-key',reason:'before-import',entries:{'the-duel-players-v2':'original career'}};
await memoryTarget.__duelQaBackupStore.save(recovery);
const serializedMemory=JSON.parse(memoryTarget.name.slice('__duel_qa_tab_v2:'.length));
same(await memoryTarget.__duelQaBackupStore.load(serializedMemory.backups[0][0]),recovery,
  'opt-in loads actual serialized recovery identity and contents');
const reloadedMemory={name:memoryTarget.name};installIsolatedStorage(reloadedMemory);
installMemoryProvider(new URLSearchParams('?memory-backups=1'),createMemoryBackupStore,reloadedMemory);
same(await reloadedMemory.__duelQaBackupStore.load(serializedMemory.backups[0][0]),recovery,
  'opt-in recovery survives same-tab reload');
const separateMemory={name:'',crypto:{randomUUID:()=> 'separate-career'}};installIsolatedStorage(separateMemory);
installMemoryProvider(new URLSearchParams('?memory-backups=1'),createMemoryBackupStore,separateMemory);
same(await separateMemory.__duelQaBackupStore.load(serializedMemory.backups[0][0]),undefined,
  'second opt-in tab cannot load first tab recovery');
assert.ok(menuSource.indexOf(optIn[0])<menuSource.indexOf("await import('../src/main.js')"));checks++;
console.log(`QA storage: ${checks} isolation, fail-closed and fixture bootstrap checks passed.`);
