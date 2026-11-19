import strict from 'node:assert/strict';
// Every assertion is counted, so that the message below is a real count.
let checks = 0;
const assert = new Proxy(strict, {apply: (target, self, args) => (checks++, target(...args)),
  get: (target, key) => typeof target[key] === 'function' ? (...args) => (checks++, target[key](...args)) : target[key]});
import {captionSeconds, createCaptionQueue} from '../src/story/caption-queue.js';
import {stepChase} from '../src/world/jobs/steps/chase.js';
import {emberNextUp} from '../src/story/ember-ui.js';
import {worldJobMapData} from '../src/route-map.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {createLandPicture} from '../src/world/scablands-picture.js';
import {drawBigMap, createKnowledge} from '../src/world/scablands-map.js';
import {SCABLANDS_PLACES as SCABLANDS_TABLE} from '../src/world/scablands.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {createJob} from '../src/world/jobs/job-engine.js';
import {createHudScreen} from '../src/screen-hud.js';
import {Duel} from '../src/game.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {FIGHTER_RULES} from '../src/onfoot.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {EMBER_CAPTIONS} from '../src/story/ember-lines.js';
import {worldJobHitTargets, reportWorldJobThingHit} from '../src/arena/modes/world-job.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {gasRunJob, fieldBattleJob, gasRunLength, GAS_RUN_PATHS, FIELD_BATTLE} from '../src/world/jobs/gas-run.js';

assert.equal(captionSeconds('x'), 2.5);
assert.equal(captionSeconds('x'.repeat(100)), 6.7);
assert.equal(captionSeconds('x'.repeat(200)), 7.5);
// Third round: with nothing waiting a line keeps its full reading time.
const long='x'.repeat(100), reading=captionSeconds(long);
const alone=createCaptionQueue(); alone.add(long, false, 0);
assert.equal(alone.advance(reading-.01), long); assert.equal(alone.advance(reading), '');
// With another waiting, the line gives way after 60 per cent of its reading time (never under 2.5 s).
const crowded=createCaptionQueue();
crowded.add(long+'A', false, 0); crowded.add(long+'B', false, 0);
assert.equal(crowded.advance(.6*captionSeconds(long+'A')-.01), long+'A');
assert.equal(crowded.advance(.6*captionSeconds(long+'A')+.01), long+'B');
const brief=createCaptionQueue(); brief.add('first', false, 0); brief.add('second', false, 0);
assert.equal(brief.advance(2.49), 'first'); assert.equal(brief.advance(2.5), 'second');
// A line already shown past its give-way time ends the moment another arrives; before that it kept its full time.
const late=createCaptionQueue(); late.add(long, false, 0);
assert.equal(late.advance(5), long); late.add('next', false, 5); assert.equal(late.advance(5), 'next');
// A line that has waited 6 seconds is dropped. The line on screen is a timed one (12 s), which never gives way.
const dropped=createCaptionQueue(); dropped.add('stays', false, 0, 12);
dropped.add('late', false, 1); dropped.add('on time', false, 7);
assert.equal(dropped.advance(6.99), 'stays'); assert.equal(dropped.advance(11.99), 'stays');
assert.equal(dropped.advance(12), 'on time'); assert.equal(dropped.advance(30), '');
const waits=createCaptionQueue(); waits.add('stays', false, 0, 12); waits.add('late', false, 1);
assert.equal(waits.advance(6.99), 'stays'); assert.equal(waits.advance(12), '');
// An urgent line is shown once the line on screen has had 1.5 seconds; the interrupted line carries on afterwards.
const q=createCaptionQueue();
q.add(long, false, 0); q.add('urgent', true, 0.5);
assert.equal(q.advance(1.49), long); assert.equal(q.advance(1.5), 'urgent');
assert.equal(q.advance(1.5+2.49), 'urgent'); assert.equal(q.advance(1.5+2.5), long);
assert.equal(q.advance(100), ''); q.add('again', false, 100); q.clear(100); assert.equal(q.advance(101), '');
// A short line cut short after 60 per cent of its reading time is not shown a second time; a long one carries on.
const shortCut=createCaptionQueue(); shortCut.add('short', false, 0); shortCut.add('urgent', true, 1.5);
assert.equal(shortCut.advance(1.5), 'urgent'); assert.equal(shortCut.advance(4), '');
// A long line comes back once after an urgent line, and never a second time.
const once=createCaptionQueue(); once.add(long, false, 0); once.add('first', true, 0); once.add('second', true, 0);
assert.equal(once.advance(1.5), 'first'); assert.equal(once.advance(3), 'second'); assert.equal(once.advance(5.5), long);
once.add('third', true, 6); assert.equal(once.advance(6), 'third'); assert.equal(once.advance(8.5), '');
// An urgent line that arrives after the line on screen has already had 1.5 seconds cuts in at once.
const quick=createCaptionQueue(); quick.add(long, false, 0); assert.equal(quick.advance(3), long);
quick.add('door', true, 3); assert.equal(quick.advance(3), 'door');
// Several urgent lines keep their order and none cuts the one before it until that line has had 1.5 seconds.
const many=createCaptionQueue(); many.add(long, false, 0); many.add('one', true, 0); many.add('two', true, 0);
assert.equal(many.advance(1.5), 'one'); assert.equal(many.advance(2.99), 'one'); assert.equal(many.advance(3), 'two');
const step={targetId:'thief',leashDistance:150,leashLineId:'closer'}, view=gap=>({player:{position:{x:0,z:0}},actors:[{id:'thief',position:{x:gap,z:0}}]});
let result=stepChase(step,{},view(100),0); result=stepChase(step,result.state,view(121),7.9);
assert.equal(result.events.length,0); result=stepChase(step,result.state,view(119),.1); assert.equal(result.events.length,0);
result=stepChase(step,result.state,view(120),.1); assert.equal(result.events[0].lineId,'closer');
result=stepChase(step,result.state,view(151),.1); assert.equal(result.restart,true); assert.equal(result.events.length,0);
for (const [run, words] of [[null,'Visit the Story Wall.'], [{},'Big Bess is loading gas for Tin Town.']]) {
 const next=emberNextUp({available:true,step:'done',run}); assert.ok(next.text.includes(words)); assert.match(next.button,/data-action="yard-cards"/);
}
const definition={name:'test',steps:[{kind:'escort',path:[{position:{x:0,z:0}},{position:{x:100,z:30}}]}]};
const state={s:5,lateral:4,arena:{mode:'world-job',worldJob:{definition,job:{steps:definition.steps,stepIndex:0},actors:[]}}};
const data=worldJobMapData({worldAt:(s,z)=>({x:s,z})},state);
assert.deepEqual(data.path,[{x:0,z:0},{x:100,z:30}]); assert.equal(data.marks[0].kind,'player');
// Timed instructions expire from their arrival, even while another caption or a crash hides them.
// (Changed in the third round: the opening line was 7 characters, so after the arrow it was no longer shown again; a short line that has been
// read is not repeated, so the opening is now long enough to carry on.)
const opening='an opening line that takes a while to read, so it carries on';
const timed=createCaptionQueue();
timed.add(opening, false, 0);
timed.add('arrow', true, .1, 3);
assert.equal(timed.advance(1.5), 'arrow');
assert.equal(timed.advance(3.1), opening);
const expired=createCaptionQueue();
expired.add('opening', false, 0);
expired.add('old arrow', true, .1, 1.5, true);
assert.equal(expired.advance(2, true), 'opening');
assert.equal(expired.advance(2.1), 'opening');
const direct=createCaptionQueue(); direct.add('arrow', true, 0, 3);
assert.equal(direct.advance(2.99), 'arrow'); assert.equal(direct.advance(3), '');
const minimum=createCaptionQueue(); minimum.add('warning', true, 0, .2);
assert.equal(minimum.advance(1.49), 'warning'); assert.equal(minimum.advance(1.5), '');

// Exercise the actual HUD with a real job: crash messages win while the spoken line pauses.
const duel=new Duel({seed:1,featureFlags:{'hidden-road':true,arsenal:true}});
duel.state.wastelandGateDiscovered=true;
assert(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:1,opponents:[],job:EVERBURN_JOBS[0]}));
const classes=new Map();
const node=()=>({hidden:false,textContent:'',dataset:{},style:{},firstChild:{textContent:''},lastChild:{textContent:''},classList:{toggle(name,on){classes.set(name,on);}},setAttribute(){}});
const ui=new Proxy({}, {get:(target,key)=>target[key] ??= node()});
ui['race-position'].closest=()=>({hidden:false}); ui['route-section'].closest=()=>({querySelector:()=>({textContent:''})});
const update=createHudScreen({app:{duel,player:{name:'Test'}},ui,text:(id,value)=>{ui[id].textContent=String(value);},time:String,credits:String,clamp:value=>Math.max(0,Math.min(1,value)),routeMap:{update(){}}});
const hud=duel.state; hud.status='racing'; hud.stageTimeSec=0;
duel._storyCallout('A spoken story line', 2.2); update(hud);
assert.equal(ui['callout-text'].textContent,'A spoken story line');
hud.stageTimeSec=1; hud.crashFlash=1; hud.combatWrecking=true; hud.combatWreckTimer=2.9; update(hud);
assert.equal(ui['callout-text'].textContent,'Wrecked. Open ground in 3 s.');
assert(captionSeconds(ui['callout-text'].textContent) <= COMBAT_TUNING.foot.parkedWreckSeconds);
assert.equal(ui['callout-kicker'].textContent,'');
assert.equal(classes.get('crash-callout'),true);
hud.stageTimeSec=4; update(hud); hud.crashFlash=0; hud.combatWrecking=false; update(hud);
assert.equal(ui['callout-text'].textContent,'A spoken story line');
assert.equal(classes.get('crash-callout'),false);
// Third round, item 5. Changed from the first build, which showed COLLISION and its kicker here: a plain collision in a job shows
// nothing in the caption's place and does not pause or cut the line on screen (the red flash over the picture stays).
hud.stageTimeSec=5; hud.crashFlash=1; hud.combat=true; update(hud);
assert.equal(ui['callout-text'].textContent,'A spoken story line');
assert.equal(ui['callout-kicker'].textContent,'');
assert.equal(classes.get('crash-callout'),false);
assert.equal(ui['crash-flash'].hidden,false);
hud.stageTimeSec=5.5; hud.impactTimer=.5; hud.lastCrashReason='rock'; update(hud);
assert.equal(ui['callout-text'].textContent,'A spoken story line'); assert.equal(ui['callout-kicker'].textContent,'');
hud.stageTimeSec=6.6; hud.crashFlash=0; hud.impactTimer=0; update(hud);
assert.equal(ui['callout-text'].textContent,'');
// The wreck and the catastrophic crash still say so in a job.
hud.stageTimeSec=7; hud.crashFlash=1; hud.catastrophic=true; update(hud);
assert.equal(ui['callout-text'].textContent,'CATASTROPHIC IMPACT'); assert.equal(classes.get('crash-callout'),true);
hud.catastrophic=false; hud.crashFlash=0;
// With no crash flash, a forced return still takes the screen immediately. Its reason survives an urgent queued line.
duel._storyCallout('The other job line.', 2.2);
const rule = hud.arena.worldJob.job.stepState;
rule.returnNotice = {text:'Cinder: A return is due.', remaining:4};
hud.stageTimeSec=8; update(hud); duel._storyCallout('A different urgent line.', 2.2, true);
hud.stageTimeSec=11.99; update(hud);
assert.equal(ui['callout-text'].textContent, rule.returnNotice.text);
assert.equal(ui['race-callout'].hidden, false);
assert.equal(ui['callout-kicker'].textContent, '');
delete rule.returnNotice;
hud.onFoot = true; hud.fighter = {knockedDown:true};
update(hud);
assert.equal(ui['callout-text'].textContent,'Down. Getting up by your car.');
assert(captionSeconds(ui['callout-text'].textContent) <= FIGHTER_RULES.knockdownSeconds);
hud.onFoot = false; hud.fighter = null; update(hud);
// A race and a Scrapdome event are exactly as before: a collision says COLLISION with its kicker.
for (const kind of ['race','scrapdome']) {
  const other=new Duel({seed:9,featureFlags:{'hidden-road':true}}), otherUi=new Proxy({}, {get:(target,key)=>target[key] ??= node()}), otherClasses=new Map();
  other.state.wastelandGateDiscovered=true;
  if (kind==='race') other.startCampaign({mode:'wasteland',car:'falcone_f42',discoveredGate:false});
  else assert(other.startArenaEvent({car:'banshee_muscle',cpuDifficulty:'medium',seed:9,opponents:[{car:'dusthawk_rally'}]}));
  otherUi['race-position'].closest=()=>({hidden:false}); otherUi['route-section'].closest=()=>({querySelector:()=>({textContent:''})});
  otherUi['race-callout'].classList.toggle=(name,on)=>otherClasses.set(name,on);
  const otherUpdate=createHudScreen({app:{duel:other,player:{name:'Test'},cameraMode:'chase'},ui:otherUi,text:(id,value)=>{otherUi[id].textContent=String(value);},time:String,credits:String,clamp:value=>Math.max(0,Math.min(1,value)),routeMap:{update(){}}});
  const otherHud=other.state; otherHud.status='racing'; otherHud.countdown=0; otherHud.crashFlash=1; otherHud.combat=true; otherHud.combatWrecking=false; otherUpdate(otherHud);
  assert.equal(otherUi['callout-text'].textContent,'COLLISION',kind); assert.equal(otherUi['callout-kicker'].textContent,'ARMOR HIT. AUTO RECOVERY.',kind);
  assert.equal(otherClasses.get('crash-callout'),true,kind);
}
// Third round, item 3: instructions go first. The chase opens with Old Smoke's first line, then Cinder's instruction, then his second.
const chase=EVERBURN_JOBS[5].steps[1];
assert.deepEqual([chase.startLineId,...chase.afterStartLineId],['story.ember.old-smoke.2','story.ember.cinder.23','story.ember.old-smoke.4']);
{
  const DT=1/120, said=[];
  const chased=new Duel({seed:5,featureFlags:{'hidden-road':true,arsenal:true}});
  chased.state.wastelandGateDiscovered=true;
  assert(chased.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:5,cpuDifficulty:'medium',opponents:[],
    weaponLoadout:['bomb','crossbow','star'],arsenalRank:9,job:{...EVERBURN_JOBS[5],seed:5,steps:[chase]}}));
  const at=chased.course.nearest(0,-200); Object.assign(chased.state,{s:at.s,lateral:at.lateral,speedMph:0,headingError:0,yawVelocity:0});
  chased.onStoryCaption=(text,urgent)=>said.push({text,urgent});
  const furnace=()=>chased.state.arena.worldJob.actors.find(actor=>actor.id==='old-smoke-furnace');
  // SCABLANDS-LAND round 4: the furnace's path is 36 km long now; its bolt from the first door to the second ground alone is about 470 s at 45 m/s
  // (it was about 47 s), so the wait for each door is allowed 900 s (it was 120 s). Nothing else about the wait changed.
  const run=(until,limit=900)=>{for(let n=0;n<limit/DT&&!until();n++){chased.setInput(chased.state.status==='racing'?{throttle:0,brake:0,steer:0}:{throttle:0,brake:0,steer:0});chased.step(DT);}return until();};
  const urgentOf=text=>said.find(item=>item.text.startsWith(text))?.urgent;
  for (const [hit,lineId] of [[1,'story.ember.cinder.18'],[2,'story.ember.old-smoke.3'],[3,'story.ember.cinder.19']]) {
    assert(run(()=>furnace()?.furnace.phase==='glow'),`door ${hit} glows`);
    const door=worldJobHitTargets(chased).find(target=>target.kind==='furnace-vent');
    reportWorldJobThingHit(chased,{...door,damage:1}); run(()=>said.some(item=>item.text.endsWith(EMBER_CAPTIONS[lineId].text)),2);
    const line=said.find(item=>item.text.endsWith(EMBER_CAPTIONS[lineId].text));
    assert.equal(line?.urgent,true,`the line for door hit ${hit} is urgent`);
    if (hit===1) { run(()=>said.some(item=>item.text.startsWith('HE IS RUNNING')),6); assert.equal(urgentOf('HE IS RUNNING'),true,'the furnace bolting is urgent'); }
  }
  // The opening lines are not urgent: they come in order, one after another.
  assert.equal(said.filter(item=>/^(Old Smoke|Cinder): /.test(item.text)).slice(0,3).map(item=>item.urgent).join(),'false,false,false');
  const turner=new Duel({seed:6,featureFlags:{'hidden-road':true,arsenal:true}}); turner.state.wastelandGateDiscovered=true;
  assert(turner.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:6,cpuDifficulty:'medium',opponents:[],job:{...EVERBURN_JOBS[5],seed:6,steps:[chase]}}));
  const far=turner.course.nearest(0,-200); Object.assign(turner.state,{s:far.s,lateral:far.lateral,speedMph:0,headingError:0,yawVelocity:0});
  const turned=[]; turner.onStoryCaption=(text,urgent)=>turned.push({text,urgent});
  for(let n=0;n<8/DT&&!turner.state.arena.worldJob.actors.some(actor=>actor.furnace);n++){turner.setInput({throttle:0,brake:0,steer:0});turner.step(DT);}
  const f=turner.state.arena.worldJob.actors.find(actor=>actor.furnace).furnace; f.metres=f.path.total-1;
  for(let n=0;n<4/DT&&!turned.some(item=>item.text.startsWith('HE IS TURNING')) ;n++){turner.setInput({throttle:0,brake:0,steer:0});turner.step(DT);}
  assert.equal(turned.find(item=>item.text.startsWith('HE IS TURNING'))?.urgent,true,'the furnace turning round is urgent');
}
// Third round, item 4: the lines said as a job is decided are kept, in order, and the results screen shows them above the result line.
{
  const DT=1/120, metric=(label,value)=>`<m>${label}:${value}</m>`, action=(label,verb)=>`<b>${verb}</b>`;
  const flags={'hidden-road':true,arsenal:true,'arsenal-wave3':true,'warlord-cards':true,'crew-gear':true};
  const start=(job,seed=1)=>{
    const duel=new Duel({seed,featureFlags:flags}); duel.state.wastelandGateDiscovered=true;
    assert(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed,cpuDifficulty:'medium',opponents:[],
      weaponLoadout:['bomb','crossbow','star'],arsenalRank:9,job:{...job,seed}}));
    return duel;
  };
  const jobOf=duel=>duel.state.arena.worldJob, furnaceOf=duel=>jobOf(duel).actors.find(actor=>actor.furnace), bessOf=duel=>jobOf(duel).actors.find(actor=>actor.id==='big-bess');
  const play=(duel,until,seconds=400,each=null)=>{for(let n=0;n<seconds/DT&&!until()&&duel.state.status!=='arena_result';n++){
    duel.setInput({throttle:0,brake:duel.state.status==='racing'?1:0,steer:0,boost:false,interact:false}); each?.(); duel.step(DT);} return until();};
  const hitDoor=duel=>{const f=furnaceOf(duel).furnace; reportWorldJobThingHit(duel,{id:`old-smoke-furnace:door-${f.door}`,actorId:'old-smoke-furnace',kind:'furnace-vent',door:f.door,damage:1,glowing:true});};
  const stand=(truck,path,metres)=>{ // Big Bess `metres` from the start of her road, heading for the next place.
    const points=path.map(item=>item.position??item); let left=metres;
    for(let i=1;i<points.length;i++){const length=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);
      if(left<=length||i===points.length-1){Object.assign(truck.position,{x:points[i-1].x+(points[i].x-points[i-1].x)*left/length,z:points[i-1].z+(points[i].z-points[i-1].z)*left/length});truck.pathIndex=i;return;} left-=length;}};
  const screenOf=(duel,gasRun)=>{ if(gasRun) duel.state.arena.result.gasRun=gasRun; return arenaResultsScreen(duel.state,{metric,action,escapeHTML:String}); };
  const said=id=>{const record=EMBER_CAPTIONS[id]; return `${record.who}: ${record.text}`;};
  // Job 6: both of Cinder's closing lines, then the result line, and nothing twice.
  {
    const duel=start({...EVERBURN_JOBS[5],steps:[chase]});
    const at=duel.course.nearest(0,-200); Object.assign(duel.state,{s:at.s,lateral:at.lateral,speedMph:0,headingError:0,yawVelocity:0});
    let hits=0;
    // SCABLANDS-LAND round 4: the whole chase over 36 km takes about 800 s of play (it took about 80 s), so the job is given 1,500 s (it was 400 s).
    play(duel,()=>false,1500,()=>{if(hits<3&&furnaceOf(duel)?.furnace.phase==='glow'){hitDoor(duel);hits++;}});
    assert.equal(duel.state.status,'arena_result'); assert.equal(duel.state.arena.result.winnerId,'player');
    assert.deepEqual(jobOf(duel).endLines.map(line=>line.lineId),['story.ember.cinder.20','story.ember.cinder.21']);
    const screen=screenOf(duel);
    assert.deepEqual(screen.closing,[said('story.ember.cinder.20'),said('story.ember.cinder.21')]);
    assert.ok(screen.description.includes(EMBER_CAPTIONS['story.ember.hollis.1'].text));
    assert.ok(!screen.closing.some(line=>screen.description.includes(line.replace(/^[^:]*: /,''))));
    // Only the last step's closing lines count: the defence's own closing line ("Valve's free") is not on the list.
    assert.ok(!jobOf(duel).endLines.some(line=>line.lineId==='story.ember.cinder.16'));
  }
  // A line the result line already shows is not said twice, and a lost job shows no closing lines.
  {
    const duel=new Duel({seed:3}); duel.state.arena={mode:'world-job',result:{winnerId:'player'},worldJob:{definition:{...EVERBURN_JOBS[2]},
      endLines:[{lineId:'story.ember.cinder.10',text:said('story.ember.cinder.10')},{lineId:'story.ember.cinder.22',text:said('story.ember.cinder.22')}]}};
    assert.deepEqual(screenOf(duel).closing,[said('story.ember.cinder.22')]);
    duel.state.arena.result.winnerId='cpu'; assert.deepEqual(screenOf(duel).closing,[]);
  }
  // A Boneyard run that takes the feud to War party: Moss's arrival line, then Auntie Solder's war party line.
  for (const [health,arrival] of [[100,'story.ember.moss.8'],[40,'story.ember.moss.9']]) {
    const job=gasRunJob({road:'boneyard',feud:3,runs:2,difficulty:'medium'}), duel=start(job);
    play(duel,()=>duel.state.status==='racing'&&!!bessOf(duel),20);
    stand(bessOf(duel),GAS_RUN_PATHS.boneyard,gasRunLength('boneyard')-30);
    play(duel,()=>false,120,()=>{ if(duel.state.status==='racing'&&!bessOf(duel).atDestination) bessOf(duel).health=health; });
    assert.equal(duel.state.arena.result?.winnerId,'player');
    assert.deepEqual(jobOf(duel).endLines.map(line=>line.lineId),[arrival,'story.ember.auntie-solder.9']);
    const screen=screenOf(duel,{road:'boneyard',feud:4,word:'War party',runs:3,reachedWarParty:true});
    assert.deepEqual(screen.closing,[said(arrival),said('story.ember.auntie-solder.9')]);
    assert.ok(!screen.closing.some(line=>screen.description.includes(line)));
  }
  // The battle's two endings.
  for (const [ending,lineId] of [['arrived','story.ember.auntie-solder.10'],['won','story.ember.auntie-solder.11']]) {
    const duel=start(fieldBattleJob({runs:0,difficulty:'medium'})), path=GAS_RUN_PATHS.boneyard;
    play(duel,()=>duel.state.status==='racing'&&!!bessOf(duel),20);
    // SCABLANDS-LAND round 4: where the furnace comes out is the battle's own figure (it was the typed 560 m of a 1,259 m road; it is the same share of the longer road now).
    stand(bessOf(duel),path,FIELD_BATTLE.comesOutAtMetres);
    if (ending==='won') {
      play(duel,()=>furnaceOf(duel)?.furnace.dead===true,300,()=>{bessOf(duel).health=100; const f=furnaceOf(duel)?.furnace; if(f&&f.phase==='glow')hitDoor(duel);});
      assert.equal(furnaceOf(duel).furnace.dead,true);
    }
    stand(bessOf(duel),path,gasRunLength('boneyard')-30);
    play(duel,()=>false,120,()=>{ if(!bessOf(duel).atDestination) bessOf(duel).health=100; });
    assert.equal(jobOf(duel).battleEnding,ending); assert.equal(duel.state.arena.result?.winnerId,'player');
    assert.deepEqual(jobOf(duel).endLines.map(line=>line.lineId),[lineId]);
    const screen=screenOf(duel,{road:'boneyard',feud:4,word:'War party',runs:1,battle:ending});
    assert.deepEqual(screen.closing,[said(lineId)]);
    assert.ok(!screen.description.includes(EMBER_CAPTIONS[lineId].text));
  }
}
// Third round, item 6, rewritten for SCABLANDS-LAND round 4, slice 4: the big map always has the whole land on it, in every Everburn job, both gas runs and the
// battle. Where it had the five places and the two gas roads of the jobs, it now names every place of the land and every road of the net, with no exemption for a
// place near one of a job's own, and it draws no line of the job's own: only the ways (src/world/scablands-ways.js) are drawn, and only when given.
{
  const course={worldAt:(s,lateral)=>({x:s,z:lateral})}, jobs=[...EVERBURN_JOBS,gasRunJob({road:'long'}),gasRunJob({road:'boneyard',feud:4}),fieldBattleJob({runs:0})];
  const picture=createLandPicture(), marks=picture.marks;
  const names=marks.places.map(place=>place.name.replace(/^The /i,'').toUpperCase());
  assert.deepEqual(names,['YARD','TIN TOWN','BONEYARD','DEAD MALL','EVERBURN','IRON LINE','DRY DAM','SHIPS IN THE SAND','RIDGE']);
  // The places and roads are the land's own tables: none is new.
  assert.deepEqual(marks.places.slice(1).map(place=>[place.x,place.z]),SCABLANDS_TABLE.map(place=>[place.x,place.z]));
  assert.deepEqual(marks.roads.map(road=>road.id),ROAD_NET.roads.map(road=>road.id));
  const strokes=[], labels=[], arcs=[];
  globalThis.Path2D=class{moveTo(){} lineTo(){}};
  const context=new Proxy({measureText:text=>({width:String(text).length*6}),fillText:text=>labels.push(text),
    stroke:path=>{if(path)strokes.push(context.strokeStyle);},arc:(x,y,r)=>arcs.push({x,y,r,fill:context.fillStyle})},
    {get:(target,key)=>target[key]??(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
  for (const definition of jobs) {
    const job=createJob(definition), worldJob={definition,job,actors:[]}, state={s:0,lateral:0,arena:{mode:'world-job',worldJob}};
    const data=worldJobMapData(course,state);
    assert.equal(data.land,undefined,`${definition.name}: the job's map data carries no land (the land is the picture)`);
    labels.length=0; strokes.length=0; arcs.length=0;
    const model=worldHudModel({worldJob,player:{x:0,z:0}});
    drawBigMap(context,{picture,canvas:null,car:{x:0,z:0,heading:0},target:model.target,knowledge:createKnowledge(),actors:[],ways:[]},{width:1400,height:1000});
    for (const name of names) assert.ok(labels.includes(name),`${definition.name}: ${name} is named on the big map`);
    for (const road of marks.roads) assert.ok(labels.includes(road.name.toUpperCase()),`${definition.name}: ${road.name} is named`);
    for (const crossing of marks.crossings) assert.ok(labels.includes(crossing.name),`${definition.name}: ${crossing.name} is named`);
    // Every road is stroked twice (its edge and its line), the river twice, and nothing else is a line: no line of the job's own.
    assert.equal(strokes.length,marks.roads.length*2+2,`${definition.name}: only the roads and the river are lines`);
    if (model.target) assert.ok(arcs.some(arc=>arc.fill==='#ffce75'),`${definition.name}: the job's place is marked in gold`);
  }
}
const marked=new Duel({seed:2}); let received;
marked.onStoryCaption=(...args)=>{received=args;};
marked._storyCallout('arrow', 3, true, true);
assert.equal(received[3],3);
marked._storyCallout('spoken', 2.2, true);
assert.equal(received[3],undefined);
console.log(`everburn play fixes A and third round: ${checks} checks passed`);
