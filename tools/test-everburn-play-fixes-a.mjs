import strict from 'node:assert/strict';
// Every assertion is counted, so that the message below is a real count.
let checks = 0;
const assert = new Proxy(strict, {apply: (target, self, args) => (checks++, target(...args)),
  get: (target, key) => typeof target[key] === 'function' ? (...args) => (checks++, target[key](...args)) : target[key]});
import {captionSeconds, createCaptionQueue} from '../src/story/caption-queue.js';
import {stepChase} from '../src/world/jobs/steps/chase.js';
import {emberNextUp} from '../src/story/ember-ui.js';
import {worldJobMapData, drawWorldJobMap} from '../src/route-map.js';
import {SCABLANDS_LAND} from '../src/world/scablands-land.js';
import {createJob} from '../src/world/jobs/job-engine.js';
import {createHudScreen} from '../src/screen-hud.js';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS, SCABLANDS_PLACES} from '../src/world/jobs/everburn.js';
import {EMBER_CAPTIONS} from '../src/story/ember-lines.js';
import {worldJobHitTargets, reportWorldJobThingHit} from '../src/arena/modes/world-job.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {gasRunJob, fieldBattleJob, gasRunLength, GAS_RUN_PATHS} from '../src/world/jobs/gas-run.js';

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
for (const [run, words] of [[null,'Replay any job from the Story Wall.'], [{},'Big Bess is loading gas for Tin Town.']]) {
 const next=emberNextUp({available:true,step:'done',run}); assert.ok(next.text.includes(words)); assert.match(next.button,/data-action="yard-cards"/);
}
const definition={name:'test',steps:[{kind:'escort',path:[{position:{x:0,z:0}},{position:{x:100,z:30}}]}]};
const state={s:5,lateral:4,arena:{mode:'world-job',worldJob:{definition,job:{steps:definition.steps,stepIndex:0},actors:[]}}};
const data=worldJobMapData({worldAt:(s,z)=>({x:s,z})},state);
assert.deepEqual(data.path,[{x:0,z:0},{x:100,z:30}]); assert.equal(data.marks[0].kind,'player');
// Timed instructions expire from their arrival, even while another caption or a crash hides them.
const timed=createCaptionQueue();
timed.add('opening', false, 0);
timed.add('arrow', true, .1, 3);
assert.equal(timed.advance(1.5), 'arrow');
assert.equal(timed.advance(3.1), 'opening');
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
hud.stageTimeSec=1; hud.crashFlash=1; hud.combatWrecking=true; update(hud);
assert.equal(ui['callout-text'].textContent,'WRECKED / RECOVERING');
assert.equal(ui['callout-kicker'].textContent,'ARMOR GONE. RECOVERY IN PROGRESS.');
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
  const run=(until,limit=120)=>{for(let n=0;n<limit/DT&&!until();n++){chased.setInput(chased.state.status==='racing'?{throttle:0,brake:0,steer:0}:{throttle:0,brake:0,steer:0});chased.step(DT);}return until();};
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
    play(duel,()=>false,400,()=>{if(hits<3&&furnaceOf(duel)?.furnace.phase==='glow'){hitDoor(duel);hits++;}});
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
    stand(bessOf(duel),path,560);
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
// Third round, item 6: the big map always has the land on it, in every Everburn job, both gas runs and the battle.
{
  const course={worldAt:(s,lateral)=>({x:s,z:lateral})}, jobs=[...EVERBURN_JOBS,gasRunJob({road:'long'}),gasRunJob({road:'boneyard',feud:4}),fieldBattleJob({runs:0})];
  const names=SCABLANDS_LAND.places.map(place=>place.name);
  assert.deepEqual(names,['YARD GATE','TIN TOWN','THE EVERBURN','DEAD MALL','BONEYARD']);
  // The positions are the ones the jobs define; none is new.
  assert.deepEqual(SCABLANDS_LAND.places.map(place=>[place.position.x,place.position.z]),Object.values(SCABLANDS_PLACES).map(place=>[place.position.x,place.position.z]));
  assert.deepEqual(SCABLANDS_LAND.roads.map(road=>road.id),['long','boneyard']);
  for (const road of SCABLANDS_LAND.roads) assert.deepEqual(road.points.map(point=>[point.x,point.z]),GAS_RUN_PATHS[road.id].map(place=>[place.position.x,place.position.z]));
  const strokes=[], labels=[], arcs=[], fills=[];
  globalThis.Path2D=class{moveTo(){} lineTo(){}};
  const context=new Proxy({measureText:text=>({width:String(text).length*6}),fillText:text=>labels.push(text),
    stroke:path=>{if(path)strokes.push(context.strokeStyle);},arc:(x,y,r)=>arcs.push({x,y,r,fill:context.fillStyle}),fill:()=>fills.push(context.fillStyle)},
    {get:(target,key)=>target[key]??(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
  const canvas={width:640,height:440,getContext:()=>context};
  for (const definition of jobs) {
    const job=createJob(definition), state={s:0,lateral:0,arena:{mode:'world-job',worldJob:{definition,job,actors:[]}}};
    const big=worldJobMapData(course,state,{land:SCABLANDS_LAND}), small=worldJobMapData(course,state);
    assert.deepEqual(big.land.places.map(place=>place.name),names,`${definition.name}: the big map names the five places`);
    assert.deepEqual(big.land.roads.map(road=>road.id),['long','boneyard'],`${definition.name}: and both roads`);
    assert.equal(small.land,undefined,`${definition.name}: the small panel is unchanged`);
    assert.deepEqual({...big,land:undefined},{...small,land:undefined});
    labels.length=0; strokes.length=0; arcs.length=0;
    drawWorldJobMap(context,canvas,big);
    for (const place of names) assert.ok(labels.includes(place)||(place==='THE EVERBURN'&&labels.includes('EVERBURN'))||(place==='TIN TOWN'&&labels.includes('TIN TOWN')),`${definition.name}: ${place} is named on the big map (${labels.join(', ')})`);
    assert.ok(labels.includes('LONG ROAD')&&labels.includes('BONEYARD ROAD'),`${definition.name}: the roads are named`);
    assert.ok(strokes.filter(color=>color==='#c8d5c24d').length===2,`${definition.name}: both roads are drawn faintly`);
    // Every one of the five places lies inside the picture, and the job's own ground is bright (the gold the small panel uses).
    for (const place of SCABLANDS_LAND.places) assert.ok(arcs.some(arc=>arc.r===4&&arc.fill==='#8f9482'&&arc.x>0&&arc.x<640&&arc.y>0&&arc.y<440),`${definition.name}: ${place.name} is on the map`);
    assert.ok(arcs.some(arc=>arc.fill==='#ffce75'),`${definition.name}: the job's own ground is bright`);
    // The small panel's drawing has no land on it.
    labels.length=0; strokes.length=0; arcs.length=0; drawWorldJobMap(context,canvas,small);
    assert.ok(!labels.includes('LONG ROAD')&&!labels.includes('BONEYARD ROAD')&&!strokes.includes('#c8d5c24d')&&!arcs.some(arc=>arc.fill==='#8f9482'),
      `${definition.name}: the small panel draws the job's own ground only`);
  }
}
const marked=new Duel({seed:2}); let received;
marked.onStoryCaption=(...args)=>{received=args;};
marked._storyCallout('arrow', 3, true, true);
assert.equal(received[3],3);
marked._storyCallout('spoken', 2.2, true);
assert.equal(received[3],undefined);
console.log(`everburn play fixes A and third round: ${checks} checks passed`);
