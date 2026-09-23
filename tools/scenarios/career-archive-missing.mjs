// A missing archive must stop startup without changing the disposable save.
export async function run(context){
  await context.navigate('/tools/menu-check.html?career-archive-missing=1');
  await context.waitFor("document.querySelector('#backup-error') && document.querySelector('#backup-export')",'archive recovery screen');
  const state=await context.evaluate(`(()=>({
    title:document.querySelector('h1').textContent,
    help:document.querySelector('#backup-error').textContent,
    pointer:JSON.parse(localStorage.getItem('the-duel-archive-pointer-v1')).id,
    archived:JSON.parse(localStorage.getItem('the-duel-leaderboard-v1')).archivedEntries.length,
    player:JSON.parse(localStorage.getItem('the-duel-players-v2')).players[0].name
  }))()`);
  if(state.title!=='KEEP THIS BROWSER DATA.'||!state.help.includes('Do not clear site data')||
    !state.help.includes('every stored part')||state.pointer!=='archive-missing'||
    state.archived!==1||state.player!=='Record QA'){
    throw Error('Missing archive changed the source career or omitted recovery guidance. '+JSON.stringify(state));
  }
  await context.evaluate("document.querySelector('#backup-export').click()");
  await context.waitFor("document.body.textContent.includes('Export failed:')",'partial export rejected');
  await context.screenshot('missing-archive-recovery');
  const unexpected=context.issues.filter(issue=>!issue.text.includes('current IndexedDB career archive cannot be backed up'));
  if(unexpected.length)throw Error('Unexpected browser error: '+unexpected.map(issue=>issue.text).join(' | '));
  context.issues.length=0; // The startup rejection is the tested fail-closed path.
}
