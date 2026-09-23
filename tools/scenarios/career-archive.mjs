// Private Chrome profile plus menu-check's memory-only localStorage.
export async function run(context){
  await context.navigate('/tools/menu-check.html?career-archive=1&flags=career-backup');
  await context.waitFor("document.querySelector('#stage.in-menu') && localStorage.getItem('the-duel-archive-pointer-v1')",'archive migration before menu');
  const migrated=await context.evaluate(`(async()=>{
    const board=JSON.parse(localStorage.getItem('the-duel-leaderboard-v1'));
    const ghosts=JSON.parse(localStorage.getItem('the-duel-ghosts-v1'));
    const pointer=JSON.parse(localStorage.getItem('the-duel-archive-pointer-v1'));
    const request=indexedDB.open('the-duel-career-backups',1);
    const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const archive=await new Promise((resolve,reject)=>{
      const row=db.transaction('snapshots','readonly').objectStore('snapshots').get(pointer.id);
      row.onsuccess=()=>resolve(row.result);row.onerror=()=>reject(row.error);
    });
    return {boardCurrent:board.entries.length,boardArchived:board.archivedEntries.length,
      ghostsCurrent:ghosts.records.length,ghostsArchived:ghosts.archivedRecords.length,
      archiveBoard:archive?.leaderboardRows?.length,archiveGhosts:archive?.ghostRows?.length,
      sampleCount:archive?.ghostRows?.[0]?.samples?.length};
  })()`);
  if(migrated.boardCurrent!==1||migrated.boardArchived!==0||migrated.ghostsCurrent!==1||
    migrated.ghostsArchived!==0||migrated.archiveBoard!==1||migrated.archiveGhosts!==1||migrated.sampleCount<12){
    throw Error('Browser migration did not retain the current and archived fixture records. '+JSON.stringify(migrated));
  }
  await context.evaluate('document.querySelector("[data-action=new-player]").click()');
  await context.waitFor('document.querySelector("[data-action=career-export]")','career export control');
  await context.evaluate(`(()=>{
    const original=URL.createObjectURL;
    URL.createObjectURL=blob=>{window.__archiveExportBlob=blob;return original.call(URL,blob);};
    document.querySelector('[data-action=career-export]').click();
  })()`);
  await context.waitFor('window.__archiveExportBlob','complete export');
  const exported=JSON.parse(await context.evaluate('window.__archiveExportBlob.text()'));
  if(exported.version!==2||exported.archives.leaderboardRows.length!==1||
    exported.archives.ghostRows.length!==1||exported.archives.ghostRows[0].samples.length!==migrated.sampleCount){
    throw Error('Browser export omitted IndexedDB archive data.');
  }
  await context.screenshot('career-archive-export');
}
