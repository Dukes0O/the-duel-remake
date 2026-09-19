import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';

let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const modal=main.slice(main.indexOf('function modalScreen(s) {'),main.indexOf('\nfunction renderState(s) {'));
const app={runId:'ui-test',menuStage:0},wallet={credits:12300};
// Execute the production modal without booting the browser or changing saves.
const render=new Function('COURSE','app','metric','time','credits','action','profile','escapeHTML',`let lastEventResult=null;${modal};return modalScreen;`)(
  COURSE,app,(label,value)=>`<dt>${label}</dt><dd>${value}</dd>`,value=>Number(value).toFixed(2),value=>Number(value||0).toLocaleString('en-US'),label=>`<button>${label}</button>`,()=>wallet,value=>String(value));
const expected={chase:'CITY<br>ESCAPED.',rally:'TRAIL<br>CONQUERED.',drift:'DRIFT<br>MASTERED.',checkpoint:'GATES<br>CLEARED.'};

for(const [stageIndex,stage]of COURSE.entries()){
  if(!stage.kind)continue;
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
  check(html.includes('RUN IT AGAIN')&&html.includes('MAIN MENU'),'standalone actions remain available');
  check(JSON.stringify(s)===before&&JSON.stringify(wallet)===balance,'completion is a pure view of the settled state');

  // A completed loss can also reach complete. It must not become a victory.
  s.status='stage_result';s.results={won:false,completed:true,timeSec:99.68,creditReward:-300};render(s);duel.nextStage();
  const loss=render(s);check(!loss.includes('/ VICTORY')&&!loss.includes('CITY<br>ESCAPED.')&&!loss.includes('CONQUERED.'),'completed loss does not gain a false victory');
  check(loss.includes('winning target was not met')&&loss.includes('CREDITS LOST')&&loss.includes('−300'),'completed loss retains its outcome and actual charge');
  app.runId+='-next';const stale=render(s);
  check(!stale.includes('CREDITS LOST')&&!stale.includes('winning target was not met'),'a previous run cannot provide the current outcome');
}

{
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:0});duel._loadStage(2);
  const s=duel.state;s.status='stage_result';s.results={won:true,completed:true};s.totalTimeSec=321.5;s.lives=6;s.score=2100;
  render(s);duel.nextStage();const html=render(s);
  check(html.includes('ALL STAGES COMPLETE')&&html.includes('HORIZON<br>CONQUERED.')&&html.includes('From desert heat to mountain air'),'three-circuit campaign keeps its ending');
  check(html.includes('TOTAL TIME')&&html.includes('LIVES LEFT')&&html.includes('STYLE POINTS'),'campaign retains its meaningful run metrics');
  check(html.includes('CHASE IT AGAIN')&&html.includes('MAIN MENU'),'campaign actions remain unchanged');
}
console.log(`Completion screen: ${checks} checks passed across all six standalone events and the three-circuit campaign, including real final-state replacement, losses and stale result isolation.`);
