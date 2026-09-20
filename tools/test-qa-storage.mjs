import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installIsolatedStorage} from './qa-storage.js';
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
for(const file of ['visual-check','reward-check','reverse-check','contact-check','jump-height-check','update-check','menu-check']){
  const source=readFileSync(new URL(`./${file}.js`,import.meta.url),'utf8');
  assert.ok(source.includes("from './qa-storage.js'"));checks++;
  const install=source.indexOf('installIsolatedStorage();'),appImport=source.search(/await import\('\.\.\/src\/(?:main|app)\.js'\)/);
  assert.ok(install>=0&&appImport>install,`${file} isolates saves before loading App`);checks++;
  assert.ok(!/import\s*\{[^}]*App[^}]*\}\s*from/.test(source),`${file} cannot eagerly import App`);checks++;
}
console.log(`QA storage: ${checks} isolation, fail-closed and fixture bootstrap checks passed.`);
