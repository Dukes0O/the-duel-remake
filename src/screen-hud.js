import {DRIVE, LIVES} from './config.js';
import {speedKph, formatSpeed} from './speed-format.js';

export function hudMarkup() {
  return `  <section id="race-hud" class="hud" aria-label="Race information" hidden><div class="race-progress"><i id="progress-fill"></i></div><div class="race-heading"><p class="eyebrow" id="stage-label"></p><h2 id="stage-name"></h2><p id="stage-objective"></p></div><div class="race-clock"><span id="race-time-label" class="field-label">RACE TIME</span><b id="race-time">00:00.00</b><span id="penalty-time"></span><div class="lap-readout"><b id="lap-number">LAP 1 / 2</b><span id="lap-time">00:00.00</span></div></div><div class="race-position"><span class="position-number"><b id="race-position">01</b><span id="position-total">/02</span></span><div><span class="field-label" id="gap-label">RIVAL BEHIND</span><b id="rival-gap">0.0 SEC</b></div></div>
  <div class="route-hud"><div class="route-hud-top"><span class="field-label">CIRCUIT / LIVE</span><b id="route-percent">0%</b></div><div class="route-section"><span id="route-section"></span><b id="route-lap">1 / 2</b></div><canvas id="route-map" width="400" height="280" role="img" aria-label="Circuit map with your heading, race actors and shortcut branches"></canvas><div class="route-legend"><span><i class="player-dot"></i> YOU</span><span id="rival-legend"><i class="rival-dot"></i> RIVAL</span><span id="police-legend" hidden><i class="police-dot"></i> PATROL</span></div><div class="route-map-footer"><span id="arena-crush" class="arena-crush" role="status" hidden>CRUSHED 0 / 6</span><span id="shortcut-legend" class="shortcut-legend" hidden>SHORTCUTS <i class="shortcut-a"></i>A <span id="shortcut-b-legend"><i class="shortcut-b"></i>B</span></span><b id="route-remaining"></b></div></div><div class="race-health"><span class="field-label">CHASSIS INTEGRITY</span><span id="lives-display"></span><b id="damage-label">0 / 5 CRASHES</b><span id="radar-label">RADAR CLEAR</span><div id="radar-meter" class="radar-meter"><i id="radar-fill"></i></div></div>
  <div class="speedometer"><section id="jump-height-panel" class="jump-height" aria-label="Jump height above the ground" hidden><span id="jump-height-label" class="field-label">HEIGHT ABOVE GROUND</span><div class="jump-height-number"><b id="jump-height-value">0.0</b><span>m</span></div><span id="jump-height-peak" class="jump-height-peak">PEAK 0.0 m</span><span id="jump-distance" class="jump-distance">DISTANCE 0.0 m · 0.0 s</span></section><div class="speed-top"><div class="gear"><span class="field-label">GEAR</span><b id="gear-value">1</b></div><div class="speed"><b id="speed-value">000</b><span>km/h</span></div></div><div class="rpm-track"><i id="rpm-fill"></i></div><div class="rpm-labels"><span>0</span><span>RPM × 1000</span><span id="rpm-value">8</span></div><div class="boost-readout"><span class="field-label">NITRO</span><div class="boost-track"><i id="boost-fill"></i></div><kbd>SPACE</kbd></div><div class="speed-footer"><span id="camera-label">CHASE CAM</span><span><kbd>ESC</kbd> PAUSE</span></div></div><div id="style-score-panel" class="style-score"><b id="style-score">0000</b><span class="field-label">STYLE POINTS</span><span id="combo-label"></span></div><section id="drift-panel" class="drift-panel" aria-label="Drift trial score" hidden><div class="drift-score-row"><div><span>BANKED <small id="drift-target-label"></small></span><b id="drift-banked">0</b></div><div><span>LIVE CHAIN</span><b id="drift-chain">+0 <small id="drift-multiplier">×1.00</small></b></div></div><div class="drift-target-track"><i id="drift-target-fill"></i></div><p id="drift-notice" aria-live="polite">Straighten to bank your chain.</p></section>
  <section id="checkpoint-panel" class="drift-panel checkpoint-panel" aria-label="Checkpoint rush progress" hidden><div class="drift-score-row"><div><span>GATES PASSED</span><b id="checkpoint-passed">0 / 12</b></div><div><span>TIME LEFT</span><b id="checkpoint-time">00:00.00</b></div></div><div class="drift-target-track"><i id="checkpoint-target-fill"></i></div><p id="checkpoint-next">NEXT GATE 1 / 12</p><p id="checkpoint-notice" aria-live="polite">Each gate adds time.</p></section>
  <div id="countdown" class="countdown" hidden><span id="countdown-word">GET READY</span><b id="countdown-number">3</b><p>HOLD W OR ↑ TO ACCELERATE</p></div><div id="race-callout" class="race-callout" aria-live="polite" hidden><span id="callout-kicker"></span><b id="callout-text"></b></div><div id="crash-flash" class="crash-flash" hidden></div></section>`;
}

export function speedGearPresentation(s) {
  return [String(speedKph(s.speedMph)).padStart(3,'0'), s.gear===-1?'R':s.gear+1];
}

export function presentJumpHeight(readout, s, app, ui, text) {
  const jumpHeight=readout.update(s,app.duel.course);
  ui['jump-height-panel'].hidden=jumpHeight.phase==='hidden';
  ui['jump-height-panel'].dataset.phase=jumpHeight.phase;
  text('jump-height-label',jumpHeight.phase==='landed'?'JUMP PEAK':'HEIGHT ABOVE GROUND');
  text('jump-height-value',(jumpHeight.phase==='landed'?jumpHeight.peakMeters:jumpHeight.heightMeters).toFixed(1));
  text('jump-height-peak',jumpHeight.phase==='landed'?'LANDED':`PEAK ${jumpHeight.peakMeters.toFixed(1)} m`);
  text('jump-distance',`DISTANCE ${(jumpHeight.distanceMeters||0).toFixed(1)} m · ${(jumpHeight.durationSeconds||0).toFixed(1)} s`);
}

export function createHudScreen({app, ui, text, time, clamp, credits, routeMap}) {
function updateHud(s) {
  text('race-time',time(s.stageTimeSec)); text('penalty-time',s.racePenaltySec?`+${Math.round(s.racePenaltySec)} SEC PENALTIES`:'');text('lap-number',`LAP ${s.currentLap||s.lap||1} / ${app.duel.stageDef.laps||2}`);text('lap-time',time(s.lapTimeSec||0));const section=app.duel.course?.sectionAt?.(s.s)?.name||'COMPLETE BOTH LAPS';text('stage-objective',s.objective?.kind==='checkpointRush'?`GATES ${s.checkpointRush?.passed||0} / ${s.checkpointRush?.total||12} · EACH GATE +${s.checkpointRush?.extensionSec||0} SEC`:s.objective?.kind==='driftTrial'?`BANK ${credits(s.objective.targetScore)} POINTS · FINISH BOTH LAPS`:s.objective?.kind==='stuntTrial'?`LANDINGS ${s.jumps||0} / ${s.objective.targetJumps} · CRUSHES ${s.crushCount||0} / ${s.objective.targetCrushes} · ${time(Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0)))} LEFT`:`${section}${s.timeLimitSec?` · ESCAPE IN ${time(Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0)))}`:s.mode==='timetrial'&&s.parTimeSec?` · TARGET ${time(s.parTimeSec)}`:''}`);const [speedValue,gearValue]=speedGearPresentation(s);text('speed-value',speedValue);text('gear-value',gearValue); text('rpm-value',(clamp(s.revs)*8).toFixed(1));
  ui['rpm-fill'].style.transform=`scaleX(${clamp(s.revs)})`; ui['rpm-fill'].classList.toggle('redline',s.revs>DRIVE.redlineWarnFrac); ui['boost-fill'].style.transform=`scaleX(${clamp(s.boost??1)})`; ui.stage.classList.toggle('is-boosting',!!s.boosting); text('camera-label',`${(app.cameraMode||'chase').toUpperCase()} CAM`); text('style-score',String(s.score||0).padStart(4,'0')); text('combo-label',s.combo>1?`×${s.combo} COMBO`:'');
  const drift=s.objective?.kind==='driftTrial',rush=s.objective?.kind==='checkpointRush';ui['drift-panel'].hidden=!drift;ui['checkpoint-panel'].hidden=!rush;ui['style-score-panel'].hidden=drift||rush;
  if(rush){
    const gates=s.checkpointRush,notice=app.checkpointNotice,left=Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0));
    text('checkpoint-passed',`${gates.passed} / ${gates.total}`);text('checkpoint-time',time(left));ui['checkpoint-panel'].classList.toggle('time-low',left<10);ui['checkpoint-target-fill'].style.transform=`scaleX(${clamp(gates.passed/gates.total)})`;
    const physicalGates=app.duel.course.features.rushGates,next=physicalGates[gates.nextGate%physicalGates.length],distance=next?Math.max(0,Math.floor(gates.nextGate/physicalGates.length)*app.duel.course.length+next.s-s.s):0;
    text('checkpoint-next',gates.nextGate>=gates.total?'FINISH BOTH LAPS':`NEXT GATE ${gates.nextGate+1} / ${gates.total} · ${Math.ceil(distance)} M`);
    text('checkpoint-notice',notice&&notice.expiresAt>s.stageTimeSec?notice.type==='passed'?`Gate ${notice.index+1} passed · +${notice.extensionSec} seconds`:`Gate ${notice.index+1} missed · no time gained`:gates.missed?`${gates.missed} missed. Complete the run or try again.`:gates.nextGate>=gates.total?'All gates passed. Bring it home.':`Pass through the next lit gate for +${gates.extensionSec} seconds.`);
  }
  if(drift){
    const banked=Math.round(s.drift?.bankedScore||0),chain=Math.round(s.drift?.chainScore||0),target=s.objective.targetScore,notice=app.driftNotice;
    text('drift-banked',credits(banked));text('drift-target-label',`/ ${credits(target)}`);ui['drift-chain'].firstChild.textContent=`+${credits(chain)} `;text('drift-multiplier',`×${(s.drift?.multiplier||1).toFixed(2)}`);ui['drift-target-fill'].style.transform=`scaleX(${clamp(banked/target)})`;ui['drift-panel'].classList.toggle('target-met',banked>=target);
    const reason={hit:'collision',reset:'reset',offroad:'off-road',uncontrolled:'spin',reverse:'wrong way',airborne:'airborne',inactive:'run stopped',invalid:'recovery',unfinished:'run ended'};
    text('drift-notice',notice&&notice.expiresAt>s.stageTimeSec?notice.type==='banked'?`Banked +${credits(notice.points)}`:`Chain lost · ${reason[notice.reason]||'recovery'}`:banked>=target?'Target met. Finish both laps.':chain?'Straighten to bank. Avoid impacts and dirt.':`Slide above ${formatSpeed(45)} to build a chain.`);
  }
  const length=app.duel.course?.raceLength||app.duel.course?.length||1,progress=clamp(s.s/length); text('route-percent',`${Math.floor(progress*100)}%`); text('route-remaining',`${(Math.max(0,length-s.s)/1000).toFixed(1)} KM TO GO`); ui['progress-fill'].style.transform=`scaleX(${progress})`;
  if(s.rival){
    const gap=s.rival.s-s.s, settled=s.status==='stage_result'||s.status==='complete';
    const behind=settled?s.results?.beatRival===false:s.rival.finished||gap>0;
    text('race-position',behind?'02':'01');
    text('gap-label',settled?'FINISH POSITION':s.rival.finished?'RIVAL FINISHED':behind?'RIVAL AHEAD':'RIVAL BEHIND');
    text('rival-gap',settled?(behind?'SECOND PLACE':'FIRST PLACE'):s.rival.finished?'KEEP PUSHING':`${(Math.abs(gap)/(Math.max(45,s.speedMph,s.rival.speedMph||0)*DRIVE.mphToWorld)).toFixed(1)} SEC`);
  }else{text('race-position',rush?'CP':s.objective?.kind==='driftTrial'?'DR':s.objective?'ST':s.timeLimitSec?'GO':'TT');text('gap-label',rush?'CHECKPOINT CLOCK':s.objective?.kind==='driftTrial'?'DRIFT DEADLINE':s.objective?'STUNT DEADLINE':s.timeLimitSec?'ESCAPE THE PURSUIT':app.ghostRecord?(app.ghostEnabled?'BEST GHOST':'BEST GHOST OFF'):'RACE THE CLOCK');text('rival-gap',s.objective?time(Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0))):s.timeLimitSec?'BEAT THE DEADLINE':app.ghostRecord?time(app.ghostRecord.timeSec):'RECORD YOUR GHOST');} ui['position-total'].hidden=!s.rival; ui['rival-legend'].hidden=!s.rival;
  const hits=s.combat?s.majorCrashes||0:Math.max(0,LIVES.start-s.lives),limit=s.combat?DRIVE.majorCrashLimit:LIVES.start,persistent=!!app.duel.stageDef.persistentVehicle;ui['lives-display'].hidden=persistent;
  const hitKey=`${s.combat?'combat':'race'}:${hits}`;
  if(ui['lives-display'].dataset.value!==hitKey){ui['lives-display'].dataset.value=hitKey;ui['lives-display'].innerHTML=Array.from({length:limit},(_,i)=>`<i class="${i<limit-hits?'healthy':''}"></i>`).join('');ui['lives-display'].setAttribute('aria-label',s.combat?`${hits} of ${limit} major hits; automatic recovery`:`${hits} of ${limit} crashes`);}
  text('damage-label',s.combat?`${hits} MAJOR HITS · AUTO RECOVERY`:persistent?`IMPACTS ADD +${app.duel.stageDef.chaseCrashPenaltySec||8} SEC`:`${hits} / ${limit} CRASHES`);ui['damage-label'].classList.toggle('critical',!s.combat&&!persistent&&hits>=limit-1);
  const objectiveTrial=!!s.objective;ui['radar-label'].hidden=objectiveTrial;ui['radar-meter'].hidden=objectiveTrial;
  const p=s.police; text('radar-label',p.pursuit?.active?'PURSUIT / OUTRUN THE PATROL':p.beep>.2?'RADAR / SPEED TRAP AHEAD':'RADAR CLEAR'); ui['radar-label'].classList.toggle('warning',p.beep>.2||!!p.pursuit?.active); ui['radar-fill'].style.transform=`scaleX(${p.pursuit?.active?1:clamp(p.beep)})`;
  if(s.status==='countdown'){text('countdown-number',Math.max(1,Math.ceil(s.countdown)));text('countdown-word',s.countdown>1?'GET READY':'MAKE IT COUNT');}
  const crash=s.crashFlash>0||s.impactTimer>0; ui['crash-flash'].hidden=!crash;
  const dirtCourse=!!app.duel.stageDef.offroad||!!app.duel.stageDef.arena;
  const trafficWreckCrash=crash&&s.combat&&s.calloutTimer>0&&s.callout?.startsWith('TRAFFIC WRECKED / IMPACT');
  const callout=crash?(s.catastrophic?'CATASTROPHIC IMPACT':trafficWreckCrash?s.callout:s.lastCrashReason==='engine_blew'?'ENGINE BLOWN':s.lastCrashReason==='rock'?'ROCK IMPACT':'COLLISION'):s.calloutTimer>0?s.callout:s.boundaryWarning?'RETURN TO THE ROUTE':s.preparedGravel?'GRAVEL TRACK':s.offRoad?'LOOSE SURFACE':s.drifting?'DRIFT':'';
  ui['race-callout'].hidden=!callout||!!s.paused; text('callout-kicker',s.catastrophic?'FIVE HITS. END OF THE ROAD.':crash?persistent?'THE CAR SURVIVES. THE CLOCK KEEPS RUNNING.':s.combat?'ARMOR HIT. AUTO RECOVERY.':hits===limit-1?'CHASSIS CRITICAL. NEXT CRASH ENDS RACE.':'SHAKE IT OFF. KEEP DRIVING.':s.boundaryWarning?'COURSE BOUNDARY · RESET AHEAD':s.preparedGravel?'KEEP YOUR LINE':s.offRoad?dirtCourse?'CONTROL THE SLIDE':'FIND THE TARMAC':s.boosting?'FULL SEND':'MAKE EVERY MOVE COUNT');text('callout-text',callout);ui['race-callout'].classList.toggle('crash-callout',crash);
  ui.stage.classList.toggle('is-arena',!!app.duel.stageDef.arena);ui['arena-crush'].hidden=!app.duel.stageDef.arena;const crushed=Math.max(0,Math.floor(s.crushCount||0));text('arena-crush',app.duel.stageDef.practice?`CRUSHED ${crushed}`:`CRUSHED ${Math.min(6,crushed)} / 6`);
  text('route-section',section);text('route-lap',`${s.currentLap||s.lap||1} / ${app.duel.stageDef.laps||2}`);ui['police-legend'].hidden=!s.police?.pursuit?.active;ui['shortcut-legend'].hidden=!app.duel.course?.features.shortcuts.length;ui['shortcut-b-legend'].hidden=(app.duel.course?.features.shortcuts.length||0)<2;routeMap.update(app.duel.course,s);
  const practice=!!app.duel.stageDef.practice;
  ui.stage.classList.toggle('is-practice',practice);
  text('race-time-label',practice?'NO TIMER · NO REWARDS':'RACE TIME');
  if(practice){
    text('race-time','FREE PRACTICE');text('penalty-time','');text('lap-number','NO LAP TARGET');text('lap-time','');
    text('stage-label',`${app.player.name.toUpperCase()} · FREE PRACTICE`);text('stage-objective','EXPLORE THE RAMPS · NO TIMER, RIVAL OR FINISH LINE');
    text('route-percent','FREE');text('route-remaining','EXPLORE AT YOUR OWN PACE');text('route-lap','PLAYGROUND');ui['progress-fill'].style.transform='scaleX(0)';
    text('race-position','∞');text('gap-label','FREE PRACTICE');text('rival-gap','NO RECORDS OR REWARDS');
    ui['style-score-panel'].hidden=true;ui['lives-display'].hidden=true;ui['radar-label'].hidden=true;ui['radar-meter'].hidden=true;
    text('damage-label','PRACTICE · RECOVER AND KEEP DRIVING');
    if(crash)text('callout-kicker','RECOVER AND TRY AGAIN · NO RACE PENALTY');
    if(s.status==='countdown')text('countdown-word','EXPLORE THE PLAYGROUND');
  }
}

  return updateHud;
}
