import assert from 'node:assert/strict';
import {captionSeconds, createCaptionQueue} from '../src/story/caption-queue.js';
import {stepChase} from '../src/world/jobs/steps/chase.js';
import {emberNextUp} from '../src/story/ember-ui.js';
import {worldJobMapData} from '../src/route-map.js';
import {createHudScreen} from '../src/screen-hud.js';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {EMBER_CAPTIONS} from '../src/story/ember-lines.js';
import {worldJobHitTargets, reportWorldJobThingHit} from '../src/arena/modes/world-job.js';

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
hud.stageTimeSec=5; hud.crashFlash=1; hud.combat=true; update(hud);
assert.equal(ui['callout-text'].textContent,'COLLISION');
assert.equal(ui['callout-kicker'].textContent,'ARMOR HIT. AUTO RECOVERY.');
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
const marked=new Duel({seed:2}); let received;
marked.onStoryCaption=(...args)=>{received=args;};
marked._storyCallout('arrow', 3, true, true);
assert.equal(received[3],3);
marked._storyCallout('spoken', 2.2, true);
assert.equal(received[3],undefined);
console.log('everburn play fixes A: 43 checks passed');
