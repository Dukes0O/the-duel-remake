import assert from 'node:assert/strict';
import {createResultsScreen} from '../src/screen-results.js';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {COURSE_PRICES,isCourseUnlocked} from '../src/course-access.js';
import {formatSpeed} from '../src/speed-format.js';
import {isSummitAttack} from '../src/summit-attack.js';

let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const app={runId:'ui-test',menuStage:0},wallet={credits:12300,courses:{version:1,unlocked:COURSE.map(course=>course.id)}};
// Call the production result renderer with the same stable metric and action views.
const render=createResultsScreen({app,profile:()=>wallet,metric:(label,value)=>`<dt>${label}</dt><dd>${value}</dd>`,time:value=>Number(value).toFixed(2),credits:value=>Number(value||0).toLocaleString('en-US'),action:label=>`<button>${label}</button>`,escapeHTML:String,arrow:''});
const expected={chase:'CITY<br>ESCAPED.',rally:'TRAIL<br>CONQUERED.',drift:'DRIFT<br>MASTERED.',checkpoint:'GATES<br>CLEARED.',circuit:'CIRCUIT<br>CONQUERED.'};

for(const [stageIndex,stage]of COURSE.entries()){
  if(!stage.kind||stage.practice)continue;
  if(isSummitAttack(stage)){
    const duel=new Duel({seed:1989});duel.startCampaign({startStage:stageIndex,car:stage.requiredCar});
    const s=duel.state;s.status='stage_result';s.completedLaps=s.lapsTotal;s.stageTimeSec=99.68;s.totalTimeSec=99.68;
    s.results={won:true,completed:true,medal:'gold',timeSec:99.68,creditReward:0};
    const snapshot=JSON.stringify(s),balance=JSON.stringify(wallet),initial=render(s);
    check(JSON.stringify(s)===snapshot&&JSON.stringify(wallet)===balance,'solo Attack result is a pure view');
    check(initial.includes('SUMMIT TIME ATTACK')&&initial.includes('FINISHED.')&&initial.includes('GOLD')&&initial.includes('99.68'), 'solo Attack shows its valid time and earned medal');
    duel.nextStage();check(s.status==='complete'&&s.results.won===undefined,'solo Attack reaches the real generic final summary');
    const before=JSON.stringify(s),html=render(s);
    check(html.includes('FINISHED.')&&html.includes('GOLD medal earned')&&html.includes('99.68'),'solo Attack preserves its settled medal and exact time after final navigation');
    check(!html.includes('your rival')&&!html.includes('LAPS COMPLETE')&&!html.includes('CREDITS')&&!html.includes('ALL STAGES COMPLETE'),'solo Attack makes no rival, lap campaign or credit claim');
    check(html.includes('RUN IT AGAIN')&&html.includes('MAIN MENU'),'solo Attack keeps its standalone actions');
    check(JSON.stringify(s)===before&&JSON.stringify(wallet)===balance,'solo Attack completion changes neither simulation nor wallet');
    s.status='stage_result';s.results={won:false,completed:true,medal:null,timeSec:stage.attackTimes.bronze+1,creditReward:0};render(s);duel.nextStage();
    const noMedal=render(s);
    check(noMedal.includes('FINISHED.')&&noMedal.includes('Finish within the bronze target to earn a medal.')&&!noMedal.includes('medal earned')&&!noMedal.includes('CREDITS'),'valid no-medal Attack finish keeps its actual outcome without a charge');
    app.runId+='-next';const stale=render(s);
    check(stale.includes('RUN<br>INCOMPLETE.')&&!stale.includes('Your valid time is recorded'),'an earlier Attack cannot supply the new run outcome');
    continue;
  }
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:stageIndex,car:stage.requiredCar});
  const s=duel.state;s.status='stage_result';s.completedLaps=s.lapsTotal;s.stageTimeSec=99.68;s.totalTimeSec=99.68;
  s.results={won:true,completed:true,timeSec:99.68,creditReward:2300,driftScore:6000,driftTarget:3500,checkpointsPassed:12,checkpointsRequired:12,jumps:4,crushCount:4,...(stage.stuntTrial?{objective:'stuntTrial'}:{})};
  const snapshot=JSON.stringify(s),balance=JSON.stringify(wallet);render(s);
  check(JSON.stringify(s)===snapshot&&JSON.stringify(wallet)===balance,'rendering the stage result changes neither simulation nor wallet');
  duel.nextStage();check(s.status==='complete'&&s.results.won===undefined,'real nextStage replaces the detailed outcome with its generic summary');
  const before=JSON.stringify(s),html=render(s);
  check(html.includes(stage.name.toUpperCase()),`${stage.id}: completion uses the actual finished event`);
  check(html.includes(expected[stage.kind]||(stage.stuntTrial?'STUNTS<br>COMPLETE.':'ARENA<br>CONQUERED.')),`${stage.id}: event-specific victory title`);
  check(!html.includes('ALL STAGES COMPLETE')&&!html.includes('HORIZON')&&!html.includes('From desert heat')&&!html.includes('LIVES LEFT'),`${stage.id}: no unrelated campaign copy or reserve metric`);
  check(html.includes('99.68')&&html.includes('+2,300'),`${stage.id}: precise event time and settled credit reward survive final navigation`);
  if(stage.kind==='drift')check(html.includes('BANKED POINTS')&&html.includes('6,000'),'drift shows its score');
  if(stage.kind==='checkpoint')check(html.includes('GATES PASSED')&&html.includes('12 / 12'),'checkpoint shows its gates');
  if(stage.stuntTrial)check(html.includes('LANDED JUMPS')&&html.includes('CARS CRUSHED'),'stunt shows its objectives');
  if(stage.kind==='circuit'){
    check(!html.includes('ARENA')&&!html.includes('stadium')&&!html.includes('CARS CRUSHED'),`${stage.id}: road circuits never inherit arena copy or objectives`);
    check(html.includes(`You beat your rival at ${stage.name}.`)&&html.includes('LAPS COMPLETE'),`${stage.id}: circuit victory describes its actual duel and laps`);
  }
  check(html.includes('RUN IT AGAIN')&&html.includes('MAIN MENU'),'standalone actions remain available');
  check(JSON.stringify(s)===before&&JSON.stringify(wallet)===balance,'completion is a pure view of the settled state');

  // A completed loss can also reach complete. It must not become a victory.
  s.status='stage_result';s.results={won:false,completed:true,timeSec:99.68,creditReward:-300};render(s);duel.nextStage();
  const loss=render(s);check(!loss.includes('/ VICTORY')&&!loss.includes('CITY<br>ESCAPED.')&&!loss.includes('CONQUERED.'),'completed loss does not gain a false victory');
  check(loss.includes('winning target was not met')&&loss.includes('CREDITS LOST')&&loss.includes('−300'),'completed loss retains its outcome and actual charge');
  app.runId+='-next';const stale=render(s);
  check(!stale.includes('CREDITS LOST')&&!stale.includes('winning target was not met'),'a previous run cannot provide the current outcome');
  if(stage.kind==='circuit'){
    s.mode='timetrial';s.status='stage_result';s.results={won:true,completed:true,timeSec:99.68,creditReward:660};render(s);duel.nextStage();
    const trial=render(s);
    check(trial.includes(expected.circuit)&&trial.includes(`You beat the Time Trial target at ${stage.name}.`),`${stage.id}: Time Trial completion describes the timed target`);
    check(!trial.includes('your rival')&&!trial.includes('ARENA'),`${stage.id}: Time Trial victory does not claim a rival or arena win`);
  }
}

{
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:0});duel._loadStage(2);
  const s=duel.state;s.status='stage_result';s.results={won:true,completed:true};s.totalTimeSec=321.5;s.lives=6;s.score=2100;
  render(s);duel.nextStage();const html=render(s);
  check(html.includes('ALL STAGES COMPLETE')&&html.includes('HORIZON<br>CONQUERED.')&&html.includes('From desert heat to mountain air'),'three-circuit campaign keeps its ending');
  check(html.includes('TOTAL TIME')&&html.includes('LIVES LEFT')&&html.includes('STYLE POINTS'),'campaign retains its meaningful run metrics');
  check(html.includes('CHASE IT AGAIN')&&html.includes('MAIN MENU'),'campaign actions remain unchanged');
}
console.log(`Completion screen: ${checks} checks passed across all ${COURSE.filter(stage=>stage.kind&&!stage.practice).length} standalone races and the three-circuit campaign, including real final-state replacement, circuit duel/TimeTrial copy, losses and stale result isolation.`);
