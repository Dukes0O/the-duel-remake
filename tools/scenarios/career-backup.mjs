// The menu QA entry installs memory-only localStorage before production UI loads.
// Chrome itself uses a disposable profile, so IndexedDB never sees a live career.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=career-backup');
  await context.waitFor("document.querySelector('#stage.in-menu') && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'isolated career menu');
  await context.waitFor("[...document.querySelectorAll('details summary')].some(node=>node.textContent.includes('TEMPORARY SAVES'))", 'temporary QA controls');
  await context.evaluate("for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.includes('TEMPORARY SAVES')||panel.querySelector('summary')?.textContent.startsWith('Performance samples'))panel.style.display='none'");
  await context.evaluate('document.querySelector("[data-action=new-player]").click()');
  await context.waitFor('document.querySelector("[data-action=career-export]") && document.querySelector("[data-action=career-import]")', 'career backup controls');
  await context.screenshot('career-backup-panel');
  await context.evaluate('document.querySelector("[data-action=career-export]").click()');
  await context.waitFor("document.querySelector('.player-panel')?.textContent.includes('Career file downloaded')", 'export result');
  await context.evaluate(`(() => {
    const input=document.querySelector('#career-import-file'),transfer=new DataTransfer();
    transfer.items.add(new File(['broken json'],'broken.json',{type:'application/json'}));
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor("document.querySelector('.player-panel')?.textContent.includes('Import failed: This is not a valid JSON career file')", 'invalid import rejection');
  await context.screenshot('career-import-rejected');
  await context.evaluate(`(() => {
    const entries={};
    for(let index=0;index<localStorage.length;index++){
      const key=localStorage.key(index);
      if(key.startsWith('the-duel-')||key.startsWith('duel_'))entries[key]=localStorage.getItem(key);
    }
    const players=JSON.parse(entries['the-duel-players-v2']);
    players.players[0].name='Imported QA';
    entries['the-duel-players-v2']=JSON.stringify(players);
    const archive=JSON.stringify({format:'the-duel-career',version:1,exportedAt:new Date().toISOString(),entries});
    window.confirm=()=>true;
    window.addEventListener('beforeunload',()=>sessionStorage.setItem('career-imported-before-reload',localStorage.getItem('the-duel-players-v2')),{once:true});
    const input=document.querySelector('#career-import-file'),transfer=new DataTransfer();
    transfer.items.add(new File([archive],'valid-career.json',{type:'application/json'}));
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor("sessionStorage.getItem('career-imported-before-reload')", 'successful import before reload');
  const result=await context.evaluate(`new Promise((resolve,reject)=>{
    const request=indexedDB.open('the-duel-career-backups',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const rows=request.result.transaction('snapshots','readonly').objectStore('snapshots').getAll();
      rows.onerror=()=>reject(rows.error);
      rows.onsuccess=()=>resolve({
        imported:JSON.parse(sessionStorage.getItem('career-imported-before-reload')).players[0].name,
        backups:rows.result.filter(row=>row.reason==='before-import'&&row.entries['the-duel-players-v2']).length
      });
    };
  })`);
  if(result.imported!=='Imported QA'||result.backups<1)throw Error('Valid import or IndexedDB recovery copy was missing.');
}
