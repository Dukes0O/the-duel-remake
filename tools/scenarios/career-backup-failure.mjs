export async function run(context) {
  await context.navigate('/tools/menu-check.html?career-backup-failure=1');
  await context.waitFor("document.querySelector('#backup-error') && document.querySelector('#backup-export')", 'blocked migration screen');
  const state=await context.evaluate(`(() => ({
    legacy:JSON.parse(localStorage.getItem('the-duel-profile-v1')).credits,
    migrated:localStorage.getItem('the-duel-players-v2'),
    help:document.querySelector('#backup-error').textContent
  }))()`);
  if(state.legacy!==734||state.migrated!==null||
    !state.help.includes('enable IndexedDB')||!state.help.includes('reload')) {
    throw Error('Blocked backup allowed a migration write or omitted recovery guidance.');
  }
  await context.evaluate(`(() => {
    const original=URL.createObjectURL;
    URL.createObjectURL=blob=>{window.__careerExportBlob=blob;return original.call(URL,blob);};
    document.querySelector('#backup-export').click();
  })()`);
  const exported=await context.evaluate("window.__careerExportBlob?.text()");
  const archive=JSON.parse(exported);
  if(JSON.parse(archive.entries['the-duel-profile-v1']).credits!==734)throw Error('Startup recovery export omitted the untouched legacy save.');
  await context.screenshot('blocked-migration-recovery');
  const unexpected=context.issues.filter(issue=>!issue.text.includes('IndexedDB backup storage is unavailable'));
  if(unexpected.length)throw Error('Unexpected browser error during blocked startup: '+unexpected.map(issue=>issue.text).join(' | '));
  context.issues.length=0; // The intentionally rejected module import is the expected fail-closed path.
}
