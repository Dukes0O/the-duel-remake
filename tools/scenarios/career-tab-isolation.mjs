// Two QA tabs share an origin but must never share a disposable career or IDB.
export async function run(context){
  await context.navigate('/tools/menu-check.html?qa-tab=first');
  await context.waitFor("document.querySelector('#stage.in-menu') && localStorage.getItem('the-duel-players-v2')",'first QA career');
  const opened=await context.evaluate("window.__qaSecondTab=window.open('/tools/menu-check.html?qa-tab=second','_blank');!!window.__qaSecondTab");
  if(!opened)throw Error('Chrome did not open the second QA tab.');
  await context.waitFor("window.__qaSecondTab?.document?.querySelector('#stage.in-menu') && window.__qaSecondTab.localStorage.getItem('the-duel-players-v2')",'second QA career',60_000);
  const before=await context.evaluate(`(()=>{
    const second=window.__qaSecondTab;
    function add(tab,name){
      tab.document.querySelector('[data-action="new-player"]').click();
      const form=tab.document.querySelector('#new-player-form');
      form.querySelector('[name="playerName"]').value=name;
      form.dispatchEvent(new tab.Event('submit',{bubbles:true,cancelable:true}));
    }
    add(window,'Tab Alpha QA');add(second,'Tab Beta QA');
    const names=tab=>JSON.parse(tab.localStorage.getItem('the-duel-players-v2')).players.map(player=>player.name);
    return {first:names(window),second:names(second),
      firstDb:window.__qaIndexedDbName('the-duel-career-backups'),
      secondDb:second.__qaIndexedDbName('the-duel-career-backups')};
  })()`);
  if(!before.first.includes('Tab Alpha QA')||before.first.includes('Tab Beta QA')||
    !before.second.includes('Tab Beta QA')||before.second.includes('Tab Alpha QA')||
    before.firstDb===before.secondDb||before.firstDb==='the-duel-career-backups'||
    before.secondDb==='the-duel-career-backups'){
    throw Error('QA tabs shared a career or physical database: '+JSON.stringify(before));
  }
  await context.evaluate('window.__qaSecondTabOldDocument=window.__qaSecondTab.document;window.__qaSecondTab.location.reload()');
  await context.waitFor(`window.__qaSecondTab?.document!==window.__qaSecondTabOldDocument &&
    window.__qaSecondTab?.document?.querySelector('#stage.in-menu') &&
    window.__qaSecondTab.__qaIndexedDbName('the-duel-career-backups')===${JSON.stringify(before.secondDb)} &&
    JSON.parse(window.__qaSecondTab.localStorage.getItem('the-duel-players-v2')).players.some(player=>player.name==='Tab Beta QA')`,
  'second tab reload with its own career and database',60_000);
  const after=await context.evaluate(`(async()=>{
    const databases=await indexedDB.databases();
    const names=tab=>JSON.parse(tab.localStorage.getItem('the-duel-players-v2')).players.map(player=>player.name);
    return {first:names(window),second:names(window.__qaSecondTab),databases:databases.map(db=>db.name)};
  })()`);
  if(!after.first.includes('Tab Alpha QA')||after.first.includes('Tab Beta QA')||
    !after.second.includes('Tab Beta QA')||after.second.includes('Tab Alpha QA')||
    !after.databases.includes(before.firstDb)||!after.databases.includes(before.secondDb)||
    after.databases.includes('the-duel-career-backups')){
    throw Error('QA tab reload lost isolation or opened the production database: '+JSON.stringify(after));
  }
  await context.screenshot('career-tab-isolation');
}
