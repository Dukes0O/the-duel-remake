const flags='scrapdome,titan-climb,muddy-hollow';

async function snapshot(context){
  return context.evaluate(`(async()=>{
    const players=JSON.parse(localStorage.getItem('the-duel-players-v2'));
    const profile=players.players.find(player=>player.id===players.activePlayerId).profile;
    return {
      before:await window.__previewNativeDatabasesBefore,
      after:(await indexedDB.databases()).map(database=>database.name).sort(),
      opens:JSON.parse(sessionStorage.getItem('preview-native-idb-opens')||'[]'),
      badge:document.querySelector('[data-preview-badge]')?.textContent?.trim(),
      gate:profile.wasteland.discoveredGate,
      salHold:profile.wasteland.territories.sal.hold,
      titan:profile.unlockedCars.includes('titan_monster'),
    };
  })()`);
}

function assertSnapshot(result,label){
  if(JSON.stringify(result.before)!==JSON.stringify(result.after))
    throw Error(`${label}: native IndexedDB inventory changed: ${JSON.stringify(result)}`);
  if(result.opens.length)throw Error(`${label}: native IndexedDB was opened: ${result.opens.join(', ')}`);
  if(result.badge!=='PREVIEW'||!result.gate||result.salHold!==100||!result.titan)
    throw Error(`${label}: seeded preview player or badge was missing: ${JSON.stringify(result)}`);
}

export async function run(context){
  await context.command('Page.addScriptToEvaluateOnNewDocument',{source:`(() => {
    window.__previewNativeDatabasesBefore=indexedDB.databases().then(rows=>rows.map(row=>row.name).sort());
    const nativeOpen=IDBFactory.prototype.open;
    IDBFactory.prototype.open=function(...args){
      const key='preview-native-idb-opens';
      const calls=JSON.parse(sessionStorage.getItem(key)||'[]');
      calls.push(String(args[0]));sessionStorage.setItem(key,JSON.stringify(calls));
      return nativeOpen.apply(this,args);
    };
  })();`});
  await context.navigate(`/tools/preview.html?flags=${flags}`);
  await context.waitFor("document.querySelector('#stage.in-menu')&&document.querySelector('[data-preview-badge]')",'preview menu');
  assertSnapshot(await snapshot(context),'first startup');

  await context.command('Page.reload',{ignoreCache:true});
  await context.waitFor("document.querySelector('#stage.in-menu')&&document.querySelector('[data-preview-badge]')",'preview reload');
  assertSnapshot(await snapshot(context),'same-tab reload');
}
