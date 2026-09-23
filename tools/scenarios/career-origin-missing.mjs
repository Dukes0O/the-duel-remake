// A missing primary snapshot must stop startup and refuse a partial export.
export async function run(context){
  await context.navigate('/tools/menu-check.html?career-origin-missing=1');
  await context.waitFor("document.querySelector('#backup-error') && document.querySelector('#backup-export')",'primary recovery screen');
  const state=await context.evaluate(`(()=>( {
    title:document.querySelector('h1').textContent,
    help:document.querySelector('#backup-error').textContent,
    pointer:localStorage.getItem('__the_duel_origin_pointer_v1')
  }))()`);
  if(state.title!=='KEEP THIS BROWSER DATA.'||!state.help.includes('Do not clear site data')||
    !state.pointer?.includes('origin-primary-v1'))throw Error('Missing primary did not fail closed. '+JSON.stringify(state));
  await context.evaluate("document.querySelector('#backup-export').click()");
  await context.waitFor("document.body.textContent.includes('Export failed: The IndexedDB career snapshot is unavailable')",'partial export refused');
  await context.screenshot('missing-primary-recovery');
  const unexpected=context.issues.filter(issue=>!issue.text.includes('IndexedDB career snapshot is missing'));
  if(unexpected.length)throw Error('Unexpected browser error: '+unexpected.map(issue=>issue.text).join(' | '));
  context.issues.length=0;
}
