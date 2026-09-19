import assert from 'node:assert/strict';
import { COURSE } from '../src/config.js';
import { bestKey,createProfile,settleRace,eventKey } from '../src/progression.js';
import { LEADERBOARD_KEY,createLeaderboard,recordFinish,loadLeaderboard,saveLeaderboard,mergeLeaderboards,getLeaderboard } from '../src/leaderboard.js';
import { GHOST_KEY,MAX_GHOSTS,ghostKey,createGhostStore,normalizeGhostStore,loadGhosts,saveGhosts,mergeGhostStores,findGhost,storeGhost,sampleGhost } from '../src/ghost.js';

let checks=0;
const same=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const check=(value,message)=>{assert.ok(value,message);checks++;};
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const index=COURSE.findIndex(stage=>!stage.kind),stage=COURSE[index],original={layoutVersion:stage.layoutVersion,lengthU:stage.lengthU};
const player={id:'archive-driver',name:'Archive Driver'};
const result=(extra={})=>({runId:'old-race',stageIndex:index,seed:1989,laps:2,car:'falcone_f42',mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',completed:true,won:true,timeSec:120,...extra});
function recording(options,timeSec=120){
  return {...options,playerId:player.id,playerName:player.name,eventId:stage.id,layoutVersion:stage.layoutVersion,key:ghostKey(player.id,options),timeSec,recordedAt:1,lastUsedAt:1,
    samples:Array.from({length:13},(_,i)=>[Math.round(timeSec*1000*i/12),Math.round(stage.lengthU*options.laps*100*i/12),0,0,0,1500,0])};
}
try{
  // A v1 save from the real earlier layout has neither archive arrays nor an
  // explicit ghost raceLength. New geometry is deliberately much longer.
  stage.layoutVersion=3;stage.lengthU=3600;
  const oldResult=result(),oldBoard=recordFinish(createLeaderboard(),oldResult,player).board,oldRow=structuredClone(oldBoard.entries[0]);
  const oldGhost=recording(oldResult),oldKey=oldGhost.key,oldSamples=structuredClone(oldGhost.samples);
  const profile=settleRace(createProfile(),oldResult).profile,profileBefore=JSON.stringify(profile);
  memory.set(LEADERBOARD_KEY,JSON.stringify({version:1,entries:oldBoard.entries}));
  memory.set(GHOST_KEY,JSON.stringify({version:1,records:[oldGhost]}));
  stage.layoutVersion=4;stage.lengthU=5400;
  let board=loadLeaderboard(storage),ghosts=loadGhosts(storage);
  same(board.entries.length,0,'old layout is absent from active board');same(board.archivedEntries.length,1,'old leaderboard row is archived, not deleted');
  same(board.archivedEntries[0].eventKey,oldRow.eventKey,'historical competitive key is retained');
  same(ghosts.records.length,0);same(ghosts.archivedRecords.length,1,'legacy ghost survives a layout and distance change');
  same(ghosts.archivedRecords[0].key,oldKey);same(ghosts.archivedRecords[0].samples,oldSamples,'every archived replay sample remains intact');
  same(ghosts.archivedRecords[0].raceLength,7200,'legacy archive length comes from its old finish endpoint');
  same(getLeaderboard(board),[],'default rankings exclude all archives');same(getLeaderboard(oldBoard),[],'an unnormalized stale board also cannot display old rankings');
  same(findGhost(ghosts,player.id,oldResult),null,'current ghost picker does not select an old layout');same(findGhost({records:[oldGhost]},player.id,oldResult),null,'stale active array cannot expose old playback');
  same(sampleGhost(oldGhost,60),null,'direct sampling refuses an old-layout record');same(storeGhost(createGhostStore(),oldGhost).saved,false,'new recordings must match current geometry');
  check(saveLeaderboard(board,storage)&&saveGhosts(ghosts,storage),'archive stores can save');
  board=loadLeaderboard(storage);ghosts=loadGhosts(storage);
  same(board.archivedEntries[0].timeSec,120);same(ghosts.archivedRecords[0].samples,oldSamples,'save/reload keeps archived replay samples');
  same(JSON.parse(memory.get(LEADERBOARD_KEY)).archivedEntries.length,1);same(JSON.parse(memory.get(GHOST_KEY)).archivedRecords.length,1,'archives are persisted, not only held in memory');
  same(JSON.stringify(profile),profileBefore,'record migration does not mutate wallet, garage or old personal bests');
  same(settleRace(profile,result({runId:'new-layout',timeSec:140})).breakdown.personalBest,0,'new layout establishes its own reward baseline');

  const currentResult=result({runId:'current-race',timeSec:140}),currentGhost=recording(currentResult,140);
  const added=recordFinish(board,currentResult,player);check(added.recorded,'new layout record saves even if an old layout was faster');board=added.board;
  same(board.entries.length,1);same(board.archivedEntries.length,1);same(getLeaderboard(board)[0].timeSec,140);same(getLeaderboard(board,{event:oldRow.eventKey}),[],'requesting an old event key cannot mix it into current rankings');
  const ghostAdded=storeGhost(ghosts,currentGhost);check(ghostAdded.saved,'new layout ghost saves independently of the faster archive');ghosts=ghostAdded.store;
  same(ghosts.records.length,1);same(ghosts.archivedRecords.length,1);check(!!findGhost(ghosts,player.id,currentResult),'only matching current ghost is selectable');check(!!sampleGhost(ghosts.records[0],60),'current ghost still plays');
  same(ghosts.records[0].raceLength,10800,'new ghost retains the current race length');
  const fasterOld={...oldRow,timeSec:115},fasterCurrent=recordFinish(createLeaderboard(),result({timeSec:135}),player).board;
  for(const merged of [mergeLeaderboards({version:1,entries:[fasterOld]},board,fasterCurrent),mergeLeaderboards(fasterCurrent,board,{version:1,entries:[fasterOld]})]){
    same(merged.entries.length,1);same(merged.archivedEntries.length,1);same(merged.entries[0].timeSec,135,'merge keeps current best');same(merged.archivedEntries[0].timeSec,115,'merge keeps historical best without comparison to current');
    check(saveLeaderboard(merged,storage));same(loadLeaderboard(storage).archivedEntries[0].timeSec,115);
  }
  for(const merged of [mergeGhostStores({version:1,records:[oldGhost]},ghosts),mergeGhostStores(ghosts,{version:1,records:[oldGhost]})]){
    same(merged.records.length,1);same(merged.archivedRecords.length,1);same(merged.archivedRecords[0].samples,oldSamples,'merge order preserves the old replay once');check(saveGhosts(merged,storage));same(loadGhosts(storage).archivedRecords[0].key,oldKey);
  }
  const currentMany=Array.from({length:MAX_GHOSTS+3},(_,i)=>{const row=recording(result({seed:i}));row.lastUsedAt=i+10;return row;});
  ghosts=normalizeGhostStore({version:1,records:currentMany,archivedRecords:ghosts.archivedRecords});
  same(ghosts.records.length,MAX_GHOSTS,'active ghosts retain the existing bounded LRU');same(ghosts.archivedRecords.length,1,'filling active slots does not evict a prior-layout replay');
  check(saveGhosts(ghosts,storage));const savedBefore=memory.get(GHOST_KEY),denied={getItem:storage.getItem,setItem(){throw Error('quota full');}};
  same(saveGhosts(ghosts,denied),false,'quota failure is reported');same(memory.get(GHOST_KEY),savedBefore,'quota failure does not replace or clear stored progress');
  const badOld={...oldGhost,key:oldGhost.key.replace('|layout:3|','|layout:2|')};same(normalizeGhostStore({version:1,records:[],archivedRecords:[badOld]}).archivedRecords.length,0,'archive keys must agree with their own layout metadata');
  same(mergeLeaderboards({version:1,entries:[],archivedEntries:[{...oldRow,layoutVersion:2}]}).archivedEntries.length,0,'inconsistent historical leaderboard metadata is rejected');
  const missingVersion={...oldRow};delete missingVersion.layoutVersion;check(mergeLeaderboards({version:1,entries:[missingVersion]}).archivedEntries.length===1,'legacy board can infer its version from a fully validated old key');

  // If a layout is restored, its valid history becomes eligible again only for
  // that exact geometry; the other layout remains archived.
  stage.layoutVersion=3;stage.lengthU=3600;
  const rolledBack=mergeGhostStores({version:1,records:[currentGhost],archivedRecords:[oldGhost]});same(rolledBack.records[0].key,oldKey);same(rolledBack.archivedRecords[0].layoutVersion,4);
  check(!!findGhost(rolledBack,player.id,oldResult),'restoring the actual previous layout restores its matching ghost');
}finally{stage.layoutVersion=original.layoutVersion;stage.lengthU=original.lengthU;}
console.log(`Layout archives: ${checks} layout 3→4, route-length, persistence, merge, playback-isolation and quota checks passed.`);
