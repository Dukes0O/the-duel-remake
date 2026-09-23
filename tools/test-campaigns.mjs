// Long, deterministic driving matrix split from src/test.js for parallel shards.
import {COURSE,DRIVE} from '../src/config.js';
import {App} from '../src/app.js';

let pass=0,fail=0;
const ok=(condition,message)=>{if(condition)pass++;else{fail++;console.error('  FAIL:',message);}};
const eq=(actual,expected,message)=>ok(actual===expected,message+' (got '+actual+', want '+expected+')');
const argument=process.argv.slice(2);
let shard=null;
if(argument.length){
  const match=argument.length===1&&/^--shard=(\d+)\/(\d+)$/.exec(argument[0]);
  if(!match)throw Error('Use --shard=1/N through --shard=N/N.');
  const number=Number(match[1]),count=Number(match[2]);
  if(!Number.isSafeInteger(number)||!Number.isSafeInteger(count)||number<1||count<1||number>count)
    throw Error('Shard number must be between 1 and shard count.');
  shard={index:number-1,count};
}
if(process.env.DUEL_SKIP_CAMPAIGNS){
  console.log('Campaign matrix skipped by DUEL_SKIP_CAMPAIGNS.');
}else{
  const selected=index=>!shard||index%shard.count===shard.index;
  const expansionEvents=COURSE.filter(course=>course.kind&&!course.practice);
  let scenarioIndex=0;
  const runs = [];
  for (const seed of [1, 42, 1989, 2026, 90517]) {
    for (const car of ['falcone_f42', 'stuttgart_959s']) {
      for (const difficulty of ['casual', 'pro']) {
        if (!selected(scenarioIndex++)) continue;
        const frames = [];
        for (const fps of [30, 60, 144]) {
          const app = new App(); app.duel.seed = seed; app.autopilot = true;
          app.startCampaign({ car, difficulty });
          let guard = 0, stages = 0, wins = 0, finite = true;
          while (!['gameover', 'complete'].includes(app.duel.state.status) && guard++ < fps * 900) {
            app.advance(1 / fps, 1 / fps);
            const s = app.duel.state;
            finite &&= [s.s, s.lateral, s.speedMph, s.revs, s.boost, s.stageTimeSec, s.headingError, s.yawVelocity, s.roughness, s.impactTimer, s.crashSpin].every(Number.isFinite);
            if (s.status === 'stage_result') { stages++; if (s.results.won) wins++; app.duel.nextStage(); }
          }
          const s = app.duel.state;
          runs.push({ seed, car, difficulty, fps, status: s.status, stage: s.stageIndex, lap: s.completedLaps, gate: s.nextLapGate,
            position: +s.s.toFixed(2), speedMph: +s.speedMph.toFixed(2),
            complete: s.status === 'complete' && stages === COURSE.filter(course => !course.kind).length,
            catastrophic: s.status === 'gameover' && s.catastrophic && s.majorCrashes === DRIVE.majorCrashLimit,
            exhausted: s.status === 'gameover' && s.lives === 0 && !s.catastrophic && s.stageCrashes > 0 &&
              s.results?.gameover === true && s.results.completed === false && s.results.won === false,
            finite, wins, stages });
          frames.push({ time: s.totalTimeSec, lives: s.lives, score: s.score, hits:s.majorCrashes,status:s.status });
        }
        ok(frames.every(f => Math.abs(f.time - frames[0].time) < 0.001 && f.lives === frames[0].lives && f.score === frames[0].score && f.hits===frames[0].hits && f.status===frames[0].status),
          `seed ${seed}, ${car}, ${difficulty}: same outcome at 30, 60 and 144 FPS`);
      }
    }
  }
  const unfinished = runs.filter(r => !r.complete && !r.catastrophic && !r.exhausted);
  ok(unfinished.length === 0, `all ${runs.length} selected campaigns complete or end with a valid crash-limit loss${unfinished.length ? `; unfinished runs: ${JSON.stringify(unfinished)}` : ''}`);
  if (!shard || shard.index === 0) ok(runs.some(r=>r.complete), 'the stricter damage limit still permits complete campaigns');
  console.log(`  Campaign outcomes: ${runs.filter(r=>r.complete).length} completed, ${runs.filter(r=>r.catastrophic).length} catastrophic, ${runs.filter(r=>r.exhausted).length} life-exhausted`);
  console.log(`  Course wins: ${runs.reduce((sum, run) => sum + run.wins, 0)} / ${runs.reduce((sum, run) => sum + run.stages, 0)} finished stages`);
  ok(runs.every(r => r.finite), 'all selected campaign runs keep finite simulation state');
  for(const event of expansionEvents){
    if (!selected(scenarioIndex++)) continue;
    const outcomes=[];
    for(const fps of [30,144]){
      const app=new App();app.autopilot=true;app.duel.seed=1989;
      app.duel.startCampaign({startStage:event.stage,car:event.requiredCar||'falcone_f42',cpuDifficulty:'easy'});app._scriptedCrashDone=true;
      let frames=0;while(!['stage_result','gameover'].includes(app.duel.state.status)&&frames++<fps*400)app.advance(1/fps);
      const s=app.duel.state;outcomes.push({status:s.status,time:s.totalTimeSec,score:s.score,hits:s.majorCrashes,jumps:s.jumps,won:s.results?.won,laps:s.completedLaps});
    }
    ok(outcomes.every(outcome=>outcome.status==='stage_result'&&outcome.laps===2&&outcome.won),`${event.name}: its recommended/default car can win both complete laps`);
    ok(outcomes.every(outcome=>Math.abs(outcome.time-outcomes[0].time)<.001&&outcome.score===outcomes[0].score&&outcome.hits===outcomes[0].hits&&outcome.jumps===outcomes[0].jumps),`${event.name}: event and jump scoring agree across display frame rates`);
    if(event.kind==='arena')eq(outcomes[0].jumps,6,'the complete arena demo scores every ramp on both laps');
  }
  if (selected(scenarioIndex++)) {
  const app=new App();app.autopilot=true;app.duel.startCampaign({startStage:COURSE.findIndex(course=>course.kind==='chase'),car:'banshee_muscle',cpuDifficulty:'hard'});app._scriptedCrashDone=true;
  let impacts=0,frames=0;
  while(app.duel.state.status!=='stage_result'&&frames++<120*300){const s=app.duel.state;
    if(s.status==='racing'&&!s.impactTimer&&s.s>(impacts+1)*900&&impacts<3){s.speedMph=90;app.duel._crash('head_on');impacts++;}app.advance(1/120);}
  ok(app.duel.state.results?.won&&impacts===3,'Hard chase remains winnable after three recoverable major crashes');
  ok(app.duel.state.racePenaltySec>=24&&app.duel.state.racePenaltySec<=36,'three chase crashes and at most one police catch stay within the recovery budget');
  }

  ok(scenarioIndex===20+expansionEvents.length+1,'every campaign scenario was assigned exactly once');
  console.log('Campaign shard '+(shard?String(shard.index+1)+'/'+shard.count:'all')+': '+pass+' passed, '+fail+' failed');
  if(fail)process.exitCode=1;
}
