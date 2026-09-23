// Private Chrome profile plus menu-check's memory-only localStorage.
export async function run(context){
  await context.navigate('/tools/menu-check.html?career-archive=1&flags=career-backup');
  await context.waitFor("document.querySelector('#stage.in-menu') && window.__qaPhysicalStorage?.getItem('__the_duel_origin_pointer_v1')",'career origin migration before menu');
  const migrated=await context.evaluate(`(async()=>{
    const board=JSON.parse(localStorage.getItem('the-duel-leaderboard-v1'));
    const ghosts=JSON.parse(localStorage.getItem('the-duel-ghosts-v1'));
    const physical=window.__qaPhysicalStorage;
    const request=indexedDB.open('the-duel-career-backups',1);
    const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const archive=await new Promise((resolve,reject)=>{
      const row=db.transaction('snapshots','readonly').objectStore('snapshots').get('origin-primary-v1');
      row.onsuccess=()=>resolve(row.result);row.onerror=()=>reject(row.error);
    });
    const savedBoard=JSON.parse(archive?.entries?.['the-duel-leaderboard-v1']||'{}');
    const savedGhosts=JSON.parse(archive?.entries?.['the-duel-ghosts-v1']||'{}');
    return {boardCurrent:board.entries.length,boardArchived:board.archivedEntries.length,
      ghostsCurrent:ghosts.records.length,ghostsArchived:ghosts.archivedRecords.length,
      archiveBoard:savedBoard.archivedEntries?.length,archiveGhosts:savedGhosts.archivedRecords?.length,
      sampleCount:savedGhosts.archivedRecords?.[0]?.samples?.length,
      physicalBoard:physical.getItem('the-duel-leaderboard-v1')!==null,
      physicalPointer:physical.getItem('__the_duel_origin_pointer_v1')!==null};
  })()`);
  if(migrated.boardCurrent!==1||migrated.boardArchived!==1||migrated.ghostsCurrent!==1||
    migrated.ghostsArchived!==1||migrated.archiveBoard!==1||migrated.archiveGhosts!==1||
    migrated.sampleCount<12||migrated.physicalBoard||!migrated.physicalPointer){
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
