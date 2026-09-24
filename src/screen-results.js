import {COURSE} from './config.js';
import {COURSE_PRICES, isCourseUnlocked} from './course-access.js';
import {formatSpeed} from './speed-format.js';

export const screenMetric = (label,value,accent=false) => `<div class="result-metric${accent?' accent':''}"><span class="field-label">${label}</span><b>${value}</b></div>`;
export const screenAction = (label,verb,primary=false,arrow='') => `<button class="${primary?'start-button':'secondary-button'}" data-action="${verb}"><span>${label}</span>${primary?arrow:''}</button>`;
export function createResultsScreen({app, profile, credits, escapeHTML, time, arrow, metric:metricView=screenMetric, action:actionView}) {
  let lastEventResult=null;
  const metric=metricView;
  const action=actionView||((label,verb,primary=false)=>screenAction(label,verb,primary,arrow));
function modalScreen(s) {
  const r = s.results || {}; let eyebrow='',title='',description='',metrics='',combatMetrics='',actions='';
  if (s.paused) { const practice=!!COURSE[s.stageIndex]?.practice;eyebrow=practice?'FREE PRACTICE':'TAKE A BREATH'; title='ROAD<br>ON HOLD.'; description=practice?'Explore at your own pace. Practice has no timer, records or rewards.':'The clock is paused. Pick up where you left off.'; metrics=metric('EVENT',COURSE[s.stageIndex].name)+(practice?'':metric('TIME',time(s.stageTimeSec))); actions=action('BACK TO THE ROAD','resume',true)+action(practice?'RESTART PRACTICE':'RESTART RUN','restart')+action('MAIN MENU','menu'); }
  else if (s.status==='ticket') { const t=s.police.ticket; eyebrow='HIGHWAY PATROL'; title='BUSTED.'; description=`${formatSpeed(t.speedMph)} in a ${formatSpeed(t.limitMph)} zone. The fine reduces only this race's earnings when you finish. Your saved credits are untouched. Quitting forfeits the race earnings, not your saved balance.${app.profileSaved===false?' Storage is unavailable; progress lasts for this session.':''}`; metrics=metric('TIME PENALTY',`+${t.penaltySec} SEC`,true)+metric('RACE FINE',`${credits(t.fine)} CR`,true)+metric('SAVED BALANCE',`${credits(profile().credits)} CR`); actions=action('GET BACK OUT THERE','ticket',true)+action('MAIN MENU','menu'); }
  else if (s.status==='stage_result') {
    lastEventResult={state:s,stageIndex:s.stageIndex,runId:app.runId,result:r};
    const stage=COURSE[s.stageIndex],drift=stage.kind==='drift',rush=stage.kind==='checkpoint',stunt=r.objective==='stuntTrial',kind=rush?'CHECKPOINT RUSH':drift?'DRIFT TRIAL':stunt?'STUNT TRIAL':stage.kind==='chase'?'PURSUIT':stage.arena?'ARENA':stage.kind==='rally'?'RALLY':'CIRCUIT';
    eyebrow=`${kind} / ${r.won?'VICTORY':r.completed?'COMPLETE':'DNF'}`;title=r.timeout?'TIME RAN<br>OUT.':r.objectiveMissed?(rush?'GATES<br>MISSED.':drift?'TARGET<br>MISSED.':'STUNTS NOT<br>DONE.'):r.won?'OWN THE<br>FINISH.':'SO CLOSE.';
    description=r.won?`${r.winStreak>=3?`${r.winStreak} wins in a row. Streak bonus earned.`:'Both laps are in the books.'}`:r.timeout?'The pursuit deadline passed. The car survives, but this run does not enter the leaderboard.':s.mode==='timetrial'?'You finished both laps but missed the target time.':'Your rival took this one.';
    if(stunt)description=`${r.timeout?'The stunt deadline passed.':r.objectiveMissed?'Both laps finished, but the stunt targets were missed.':'Both laps and the stunt targets are complete.'} ${r.jumps||0} / ${r.targets?.jumps||s.objective?.targetJumps||4} landed jumps · ${r.crushCount||0} / ${r.targets?.crushes||s.objective?.targetCrushes||4} cars crushed.`;
    if(drift)description=`${r.timeout?'The deadline passed.':r.objectiveMissed?'Both laps finished, but the drift target was missed.':'Both laps and the drift target are complete.'} Banked ${credits(r.driftScore)} / ${credits(r.driftTarget||s.objective?.targetScore)} points. Best chain ${credits(r.driftBestChain)}. Time ${time(r.timeSec??r.stageTimeSec)}.${r.driftScoreImproved?' A new car score best.':''}${r.won?'':' Only successful trials set a car best.'}`;
    if(rush)description=`${r.timeout?'The checkpoint clock ran out.':r.objectiveMissed?'Both laps finished, but some gates were missed.':'Every gate cleared. Both laps complete.'} ${r.checkpointsPassed||0} / ${r.checkpointsRequired||s.checkpointRush?.total||12} gates passed. ${r.checkpointMisses||0} missed. Time ${time(r.timeSec??r.stageTimeSec)}.${r.won?'':' Only successful runs set a car best.'}`;
    if(r.opponentCount>1&&!s.objective&&!r.timeout&&!r.won&&s.mode!=='timetrial')description=`You finished ${r.position} of ${r.opponentCount+1}. Win by finishing ahead of every opponent.`;
    if(r.personalBestStatus==='baseline')description+=` First ${s.cpuDifficulty.toUpperCase()} / ${s.difficulty==='pro'?'Manual':'Auto'} time for this car and route. This sets the baseline; beat ${time(r.best)} next time for the car-best bonus.`;
    else if(r.personalBestStatus==='improved')description+=` Car best beaten by ${time(r.previousBest-r.best)}. The car-best bonus is included below.`;
    else if(r.personalBestStatus==='not-improved')description+=` Beat your matching car best of ${time(r.best)} to earn the car-best bonus.`;
    if(!r.won)description+=Object.hasOwn(r.creditBreakdown||{},'combat')?' Combat runs never debit saved credits.':' The loss charge is half the CPU base reward, down to zero credits.';
    metrics=(rush?metric('GATES PASSED',`${r.checkpointsPassed||0} / ${r.checkpointsRequired||12}`,true)+metric('RACE TIME',time(r.timeSec??r.stageTimeSec)):drift?metric('BANKED POINTS',credits(r.driftScore),true)+metric('TARGET',credits(r.driftTarget||s.objective?.targetScore)):metric('RACE TIME',time(r.timeSec??r.stageTimeSec),true)+metric('CAR BEST',r.best==null?'—':time(r.best)))+metric(r.creditReward<0?'CREDITS LOST':'CREDITS EARNED',`${r.creditReward<0?'−':'+'}${credits(Math.abs(r.creditReward||0))}`,true);
    if(r.opponentCount>1)metrics+=metric('FINISH POSITION',`${r.position} / ${r.opponentCount+1}`);
    if(Number.isFinite(r.hitsLanded)){
      const damage=Number(r.damageDealt.toFixed(1)).toLocaleString();
      combatMetrics=`<section class="combat-results" aria-label="Combat results"><p class="field-label">COMBAT SCORECARD</p><div class="combat-result-metrics">`+
        metric('HITS LANDED',r.hitsLanded,true)+metric('WRECKS CAUSED',r.wrecksCaused)+
        metric('WRECKS TAKEN',r.wrecksTaken)+metric('KNOCKDOWNS',r.knockdowns)+
        metric('DAMAGE DEALT',damage)+metric('BEST COMBO',r.bestCombo)+
        metric('COMBAT STYLE',credits(r.combatStyleScore),true)+'</div></section>';
    }
    const atEnd=!!stage.kind||!COURSE[s.stageIndex+1]||!!COURSE[s.stageIndex+1].kind;
    actions=r.timeout?action('TRY AGAIN','restart',true)+action('MAIN MENU','menu'):action(atEnd?'FINISH THE RUN':'NEXT CIRCUIT','next',true)+action('RESTART RUN','restart')+action('MAIN MENU','menu');
    if(!r.timeout&&!atEnd&&!isCourseUnlocked(profile(),s.stageIndex+1)){description+=` Completed race credits are safe. Unlock ${escapeHTML(COURSE[s.stageIndex+1].name)} for ${credits(COURSE_PRICES[COURSE[s.stageIndex+1].id])} CR in the course garage to continue.`;actions=action('UNLOCK NEXT COURSE','unlock-next',true)+action('RESTART RUN','restart')+action('MAIN MENU','menu');}
  }
  else if (s.status==='gameover') { eyebrow=s.catastrophic?'CATASTROPHIC DAMAGE':'END OF THE ROAD'; title=s.catastrophic?'TOTALLED.':'ONE MORE<br>RUN?'; const combatReward=Object.hasOwn(r.creditBreakdown||{},'combat');description=(s.catastrophic?'Five major crashes. The car is destroyed.':'Five crashes used every slot. This race is over.')+(combatReward?' Saved credits are safe.':' The loss costs half the CPU base reward, down to zero credits.');metrics=metric('RACE TIME',time(s.stageTimeSec))+metric(combatReward?'CREDITS EARNED':'CREDITS LOST',`${combatReward?'+':'−'}${credits(Math.abs(r.creditReward||0))}`,true)+metric('BALANCE',`${credits(profile().credits)} CR`);actions=action('RUN IT BACK','restart',true)+action('MAIN MENU','menu'); }
  else if (s.status==='complete') {
    const stage=COURSE[s.stageIndex];
    if(stage?.kind){
      // nextStage replaces the settlement payload with a generic run summary.
      // Retain the result that this UI just showed, tied to the actual run/event.
      const result=lastEventResult?.state===s&&lastEventResult.stageIndex===s.stageIndex&&lastEventResult.runId===app.runId?lastEventResult.result:{};
      const won=result.won===true,known=typeof result.won==='boolean',rush=stage.kind==='checkpoint',drift=stage.kind==='drift',stunt=!!stage.stuntTrial;
      eyebrow=`${escapeHTML(stage.name.toUpperCase())} / ${known&&won?'VICTORY':'COMPLETE'}`;
      title=!won?'RUN<br>COMPLETE.':rush?'GATES<br>CLEARED.':drift?'DRIFT<br>MASTERED.':stunt?'STUNTS<br>COMPLETE.':stage.kind==='chase'?'CITY<br>ESCAPED.':stage.kind==='rally'?'TRAIL<br>CONQUERED.':stage.arena?'ARENA<br>CONQUERED.':'CIRCUIT<br>CONQUERED.';
      description=!won?`${escapeHTML(stage.name)} is complete.${known?' The winning target was not met. Try another run.':''}`:rush?'Every checkpoint passed in order. Both laps complete before the clock ran out.':drift?'Drift target reached. Both city laps complete before the deadline.':stunt?'Both laps, the landed jumps and the crush targets are complete.':stage.kind==='chase'?'Both city laps complete. You escaped the pursuit before the deadline.':stage.kind==='rally'?'Both gravel laps complete. You conquered Ridge Rally.':stage.arena?'Both stadium laps complete. The arena is yours.':`Both laps complete. You beat ${s.mode==='timetrial'?'the Time Trial target':'your rival'} at ${escapeHTML(stage.name)}.`;
      metrics=metric('RACE TIME',time(result.timeSec??s.stageTimeSec+(s.racePenaltySec||0)),true);
      metrics+=rush?metric('GATES PASSED',`${result.checkpointsPassed??s.checkpointRush?.passed??0} / ${result.checkpointsRequired??s.checkpointRush?.total??12}`):drift?metric('BANKED POINTS',credits(result.driftScore??s.drift?.bankedScore??0)):stunt?metric('LANDED JUMPS',result.jumps??s.jumps??0)+metric('CARS CRUSHED',result.crushCount??s.crushCount??0):metric('LAPS COMPLETE',`${s.completedLaps} / ${s.lapsTotal}`);
      if(result.opponentCount>1)metrics+=metric('FINISH POSITION',`${result.position} / ${result.opponentCount+1}`);
      if(Number.isFinite(result.creditReward))metrics+=metric(result.creditReward<0?'CREDITS LOST':'CREDITS EARNED',`${result.creditReward<0?'−':'+'}${credits(Math.abs(result.creditReward))}`,true);
      actions=action('RUN IT AGAIN','restart',true)+action('MAIN MENU','menu');
    }else{
      eyebrow='ALL STAGES COMPLETE';title='HORIZON<br>CONQUERED.';description='From desert heat to mountain air. You made it all the way.';
      metrics=metric('TOTAL TIME',time(r.totalTimeSec),true)+metric('LIVES LEFT',r.lives)+metric('STYLE POINTS',Number(s.score||0).toLocaleString());
      actions=action('CHASE IT AGAIN','restart',true)+action('MAIN MENU','menu');
    }
  }
  else return '';
  const bonus=r.creditBreakdown?Object.entries(r.creditBreakdown).filter(([key,value])=>key!=='base'&&key!=='milestones'&&value>0).map(([key,value])=>`${{clean:'CLEAN RACE',personalBest:'CAR BEST',streak:'WIN STREAK',jumps:'ARENA JUMPS',crush:'CRUSH BONUS',drift:'DRIFT BONUS',police:'POLICE ESCAPE',combat:'COMBAT BONUS',manual:'PRO / MANUAL BONUS'}[key]} +${credits(value)}`).join(' · '):'';
  const repairs=r.won&&(r.crashesRepaired>0||r.livesRestored>0)?`<p class="result-bonuses">STAGE WIN REPAIRS · ${r.crashesRepaired||0} MAJOR CRASH${r.crashesRepaired===1?'':'ES'} REPAIRED · ${r.livesRestored||0} CRASH SLOT${r.livesRestored===1?'':'S'} REFILLED</p>`:'';
  return `<section class="result-panel" role="dialog" aria-modal="true" aria-labelledby="result-title"><p class="eyebrow"><i></i>${eyebrow}</p><h2 id="result-title">${title}</h2><p class="result-description">${description}</p><div class="result-metrics${combatMetrics?' combat-result-summary':''}">${metrics}</div>${combatMetrics}${r.creditCharge?`<p class="result-bonuses">LOSS CHARGE −${credits(r.creditCharge)} CR</p>`:''}${r.policeFineCharge?`<p class="result-bonuses">POLICE FINE FROM RACE EARNINGS −${credits(r.policeFineCharge)} CR</p>`:''}${bonus?`<p class="result-bonuses">${bonus}</p>`:''}${repairs}${r.milestoneAwards?.length?`<p class="result-bonuses milestone-earned" role="status">${r.milestoneAwards.map(award=>`${escapeHTML(award.name).toUpperCase()} +${credits(award.reward)} CR`).join(" · ")}</p>`:''}${r.ghostRecorded?`<p class="result-bonuses ghost-saved">BEST GHOST SAVED${app.ghostSaved===false?' · THIS SESSION ONLY':''}</p>`:''}<div class="result-actions">${actions}</div>${s.paused?'<p class="pause-help">ARROWS TO DRIVE · SPACE TO BOOST · C FRONT · B BACK · V RIGHT · X LEFT<br>Restarting or leaving forfeits unbanked race earnings. Saved credits are safe.</p>':''}</section>`;
}
  return modalScreen;
}
