// DEEP-EXPLORER acceptance, using only memory and synthetic players.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {kelpCoastProvider} from '../src/deep/zones/kelp-coast.js';
import {rampAt} from '../src/deep/deep-journey.js';
import {chartCells, revealChart, chartHas, chartPercent, CHART_HEX, chartFrame} from '../src/deep/deep-chart.js';
import {normalizeDeep, rememberChart} from '../src/deep/deep-discovery.js';
import {deepObjectives} from '../src/deep/deep-objectives.js';
import {deepMapGeometry, deepMapData} from '../src/deep/deep-map.js';
import {rockContact, driveIntoDeepRocks, deepRocks, deepGoalPoints, pushKeeps, SMALL_ROCK, BOUNCE_KEEPS, CRAWL_MPH} from '../src/deep/deep-rocks.js';
import {SIRENA_FINDS} from '../src/deep/deep-sirena.js';
import {createSeaLifeState, stepSeaLifeState} from '../src/deep/sea-life-rules.js';
import {stepDeepStory} from '../src/deep/deep-story.js';
import {surfaceLocalPoint, deepWorldPose} from '../src/deep/deep-journey.js';
import {createLog, stepLog, loggingProgress, DEEP_LOG_PAGES} from '../src/deep/deep-log.js';
import {keyboardAction} from '../src/input-contexts.js';
import {controlsHelp} from '../src/controls-help.js';
import {createSirenaHud} from '../src/deep/sirena-view.js';

const DT = 1 / 120;
function race(seed = 1989, save = {}) {
  const duel = new Duel({seed, deepProviders:[kelpCoastProvider], featureFlags:{'the-deep':true}});
  duel.startCampaign({seed, deepKit:true, deepSave:save, playerId:'survey-qa', opponentCount:1});
  return duel;
}
function park(d, p, heading = 0) {
  const near = d.course.nearest(p.x,p.z,d.state.s);
  Object.assign(d.state, {s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
    speedMph:0,headingError:heading-d.course.at(near.s).heading,airborne:false,airHeight:0,
    yawVelocity:0,pushVelocity:0,impactTimer:0,_jumpY:null});
}
function dive(d) {
  const ramp = d.course.deepRamp;
  park(d,rampAt(ramp,ramp.shoreline.center.progress-.04),ramp.heading);
  Object.assign(d.state,{status:'racing',countdown:0,speedMph:35}); d.step(DT);
  assert.equal(d.chooseDeep('dive'),true);
  for(let i=0;i<260;i++)d.step(DT);
  assert.equal(d.state.deepJourney.phase,'underwater');
}

test('Surface works from every place on all three routes; inactive and paused calls do nothing', () => {
  for(const {seed} of ROUTE_VARIANTS) for(let index=0;index<3;index++) {
    const d=race(seed); assert.equal(d.deepSurface(),false); dive(d);
    const runtime=d.deepRuntime, place=runtime.zone.places[index];
    park(d,runtime.zone.trail[place.fromIndex]); d.step(DT);
    d.state.paused=true; assert.equal(d.deepSurface(),false); d.state.paused=false;
    const packets=[]; d.onChange((s,e)=>packets.push(e));
    assert.equal(d.deepSurface(),true);
    assert.equal(d.state.status,'menu'); assert.equal(d.state.deepJourney,undefined);
    assert.equal(d.course,runtime.raceCourse);
    const top=d.course.worldAt(d.state.s,d.state.lateral), expected=runtime.ramp.points[0];
    assert.ok(Math.hypot(top.x-expected.x,top.z-expected.z)<.1);
    assert.ok(packets.some(e=>e.deepReturn));
    assert.ok(packets.some(e=>e.deepCharted),'last chart stretch flushed');
    assert.equal(d.deepSurface(),false);
  }
  assert.equal(keyboardAction('car','KeyU'),'deep-surface');
  assert.ok(JSON.stringify(controlsHelp({state:{mode:'duel',deepJourney:{phase:'underwater'}}})).includes('Surface'));
});

// DEEP-ROCKS-PUSH: a rock never stops the car, snaps it to the course or hurts it.
const RACE_HARM = ['crash','scrape','roadsideImpact','boundaryReset','recovered','rollover','sceneryBroken','gameover'];
// The trail is a chain of 8 m segments. A car beside it slips up to lateral x bend when it crosses a joint,
// whatever it drives at, so the rock tests use a nearly straight stretch and allow for that.
const BEND=.02;
function straightRock(d, pick) {
  const runtime=d.deepRuntime;
  return runtime.rocks.find(r=>{
    const at=runtime.floor.sample(r.x,r.z), p=d.course.worldAt(at.along,at.lateral);
    if(!(at.along>50&&Math.hypot(p.x-r.x,p.z-r.z)<.01&&pick(r)))return false;
    const h=d.course.at(at.along-14).heading;
    for(let m=-14;m<=16;m++)if(Math.abs(d.course.at(at.along+m).heading-h)>BEND)return false;
    return true;
  });
}
const bigRock=d=>straightRock(d,r=>r.pushable&&r.size>2)??straightRock(d,r=>r.pushable&&r.size>1.2);
// Drives 2 seconds straight at a rock from 12 m away on a straight stretch of trail.
function driveAtRock(d, rock) {
  const runtime=d.deepRuntime, at=runtime.floor.sample(rock.x,rock.z), start=at.along-12, events=[];
  Object.assign(d.state,{s:start,prevS:start,lateral:at.lateral,prevLateral:at.lateral,
    headingError:0,speedMph:40,airHeight:0,airborne:false,_jumpY:null});
  d.setInput({throttle:0,brake:0,steer:0});
  d.onChange((s,e)=>events.push(...Object.keys(e)));
  const damage=JSON.stringify(d.state.damageZones), health=d.state.health, home={x:rock.x,z:rock.z};
  let before=d.course.worldAt(d.state.s,d.state.lateral), worstStep=0, lowestKept=1, lowest=Infinity, touched=false;
  for(let i=0;i<240;i++) {
    const speed=d.state.speedMph; d.step(DT);
    const now=d.course.worldAt(d.state.s,d.state.lateral);
    worstStep=Math.max(worstStep,Math.hypot(now.x-before.x,now.z-before.z)-Math.abs(speed)*.44704*DT);
    if(rock.x!==home.x||rock.z!==home.z||d.state.speedMph<speed*.9)touched=true;
    if(touched){lowestKept=Math.min(lowestKept,d.state.speedMph/speed);lowest=Math.min(lowest,d.state.speedMph);}
    before=now;
  }
  assert.equal(JSON.stringify(d.state.damageZones),damage); assert.equal(d.state.health,health);
  assert.deepEqual(events.filter(k=>RACE_HARM.includes(k)),[],'no race contact events');
  return {worstStep,allowed:.3+Math.abs(at.lateral)*BEND,lowestKept,lowest,touched,travelled:d.state.s-start,moved:Math.hypot(rock.x-home.x,rock.z-home.z)};
}

test('every placed rock is solid, yet a touch bounces or pushes: never a stop, a snap or damage', () => {
  for(const {seed} of ROUTE_VARIANTS) {
    const d=race(seed); dive(d); const runtime=d.deepRuntime;
    assert.equal(runtime.rocks.length,420);
    const small=runtime.rocks.filter(r=>r.size<SMALL_ROCK).length;
    assert.ok(small>180&&small<240,'the size line splits about the smaller half');
    for(const rock of runtime.rocks) {
      const a={x:rock.x,z:rock.z-12}, b={x:rock.x,z:rock.z+12};
      assert.ok(rockContact([rock],a,b)); assert.ok(rockContact([rock],b,a,Math.PI));
      assert.ok(rockContact([rock],rock,rock));
      // One drive step of 0.25 m, heading +z at 60 mph, that ends 0.15 m inside the rock.
      const z=a.z+12*rockContact([rock],a,rock).t, start={x:rock.x,z:z-.1}, end={x:rock.x,z:z+.15};
      const mine={...rock}, mock={state:{s:end.z,lateral:end.x,headingError:0,speedMph:60,health:100,status:'exploring'},
        deepRuntime:{...runtime,rocks:[mine],rockEpisode:null},
        course:{worldAt:(s,lateral)=>({x:lateral,z:s}),at:()=>({heading:0}),
          nearest:(x,z)=>({s:z,lateral:x})}};
      driveIntoDeepRocks(mock,start,DT);
      assert.equal(mock.state.health,100); assert.notEqual(mock.state.status,'wrecked');
      assert.ok(mock.state.speedMph>=29.999&&mock.state.speedMph<=60,`${seed}: the car keeps rolling`);
      const jump=Math.hypot(mock.state.lateral-end.x,mock.state.s-end.z), slid=Math.hypot(mine.x-rock.x,mine.z-rock.z);
      if(mine.pushable) {
        assert.equal(jump,0,'a pushed rock moves, not the car');
        assert.ok(slid>0&&slid<.5,'the rock slides by the overlap and a little');
        assert.ok(Math.abs(mock.state.speedMph-Math.max(CRAWL_MPH,pushKeeps(rock.size)*60))<1e-9);
        assert.ok(Math.abs(mine.y-(runtime.floor.floorHeight(mine.x,mine.z)+rock.size*.12))<1e-9,'rests on the floor');
      } else {
        assert.equal(slid,0,'a bounce rock stays put');
        assert.ok(jump>0&&jump<.5,'pushed out by the contact distance only');
        assert.ok(mock.state.speedMph>=60*BOUNCE_KEEPS-1e-9,'keeps at least 70% of its speed');
      }
    }
    assert.equal(rockContact([],runtime.zone.trail[10],runtime.zone.trail[11]),null,'kelp has no solids');
  }
});

test('driving at a small rock glances off and at a large rock pushes it; the car never stops or jumps', () => {
  for(const {seed} of ROUTE_VARIANTS) {
    const d=race(seed); dive(d);
    const little=straightRock(d,r=>!r.pushable&&r.size<SMALL_ROCK), big=bigRock(d);
    assert.ok(little&&big,`${seed}: straight test rocks exist`);
    const bounced=driveAtRock(d,little);
    assert.ok(bounced.touched&&bounced.moved===0,'the small rock stays where it was');
    assert.ok(bounced.lowestKept>=.69,'a glance keeps about 70% or more of the speed');
    assert.ok(bounced.lowest>20&&bounced.travelled>20,'and the car drives on');
    assert.ok(bounced.worstStep<bounced.allowed,'never jumps more than the contact distance');
    const d2=race(seed); dive(d2);
    const pushed=driveAtRock(d2,d2.deepRuntime.rocks[d.deepRuntime.rocks.indexOf(big)]);
    assert.ok(pushed.moved>1,'the large rock slid ahead of the car');
    assert.ok(pushed.lowest>=CRAWL_MPH&&pushed.lowestKept>=.4,'pushing costs speed but never a stop');
    assert.ok(pushed.travelled>20&&pushed.worstStep<pushed.allowed,'the car keeps moving, with no jump');
  }
});

test('rock places are run state: rebuilt from the seed each dive, repeatable from inputs, never saved', () => {
  const seed=ROUTE_VARIANTS[0].seed, play=()=>{
    const d=race(seed); dive(d); const result=driveAtRock(d,bigRock(d));
    return {d,result,rocks:JSON.stringify(d.deepRuntime.rocks),car:[d.state.s,d.state.lateral,d.state.speedMph,d.state.headingError]};
  };
  const one=play(), two=play();
  assert.ok(one.result.moved>1);
  assert.equal(one.rocks,two.rocks,'same inputs give the same rock places'); assert.deepEqual(one.car,two.car);
  // A new dive starts from the zone seed again, whatever the last one did.
  const {zone,floor}=one.d.deepRuntime, fresh=JSON.stringify(deepRocks(zone,floor));
  assert.notEqual(one.rocks,fresh);
  const again=race(seed); dive(again);
  assert.equal(JSON.stringify(again.deepRuntime.rocks),fresh,'a fresh dive has the seed layout');
  assert.ok(!JSON.stringify(one.d.state).includes('"rocks"'),'rock places are not in the race state, so not in any save');
});

test('nothing the player looks for rides on a rock, and a rock lying on a goal never moves', () => {
  for(const {seed} of ROUTE_VARIANTS) {
    const d=race(seed), {zone,floor}=d.course.deepZone, rocks=deepRocks(zone,floor), goals=deepGoalPoints(zone);
    assert.equal(goals.length,16,'7 sea life spots, 3 pearls, 6 Sirena finds');
    for(const goal of goals) assert.ok(rocks.every(r=>Math.hypot(goal.x-r.x,goal.z-r.z)>=r.size+2),
      'goals are laid out from the trail, in open water away from every rock');
    // Were a big rock to lie on a goal, it would be the bounce kind, so it cannot slide over it.
    const lying={x:goals[0].x+.5,z:goals[0].z,size:2.5,y:0}, clear={x:goals[0].x+80,z:goals[0].z,size:2.5,y:0};
    const made=deepRocks(zone,{rockPlacements:()=>[lying,clear]});
    assert.deepEqual(made.map(r=>r.pushable),[false,true]);
  }
});

// DEEP-TRAIL-JOINTS: the smooth frame must not turn the car at the start of the dive. The trail starts
// with a sharp bend; the car is put at s = 0 facing along the first leg, and driving on must stay a dive.
test('a dive starts facing along the first trail leg and the first throttle does not climb the ramp', () => {
  for(const {seed} of ROUTE_VARIANTS) {
    const d=race(seed); dive(d); const trail=d.deepRuntime.zone.trail;
    const leg=Math.atan2(trail[1].x-trail[0].x,trail[1].z-trail[0].z);
    assert.ok(Math.abs(Math.atan2(Math.sin(d.course.at(0).heading-leg),Math.cos(d.course.at(0).heading-leg)))<1e-6,'the frame points along the first leg at s = 0');
    d.setInput({throttle:1,brake:0,steer:0});
    for(let i=0;i<360;i++)d.step(DT);
    assert.equal(d.state.deepJourney.phase,'underwater'); assert.ok(d.state.s>5&&Math.abs(d.state.lateral)<1,'drives on along the trail');
  }
});

// DEEP-TRAIL-JOINTS: the car's place in the world is continuous across every joint of the trail.
test('driving far beside a bending trail never moves the car in the world beyond its own travel', () => {
  const seed=ROUTE_VARIANTS[0].seed, d=race(seed); dive(d);
  const runtime=d.deepRuntime, trail=runtime.zone.trail, n=trail.length, starts=[];
  runtime.rocks=[];
  let at=0;
  for(let i=0;i<n;i++){starts.push(at);at+=Math.hypot(trail[(i+1)%n].x-trail[i].x,trail[(i+1)%n].z-trail[i].z);}
  const turn=i=>{const a=trail[(i+n-1)%n],b=trail[i],c=trail[(i+1)%n];
    return Math.atan2(Math.sin(Math.atan2(c.x-b.x,c.z-b.z)-Math.atan2(b.x-a.x,b.z-a.z)),Math.cos(Math.atan2(c.x-b.x,c.z-b.z)-Math.atan2(b.x-a.x,b.z-a.z)));};
  const joints=[...Array(n).keys()].filter(i=>Math.abs(turn(i))>.1).sort((x,y)=>Math.abs(turn(y))-Math.abs(turn(x)));
  assert.ok(joints.length>=20,'the trail has many real bends');
  let worstOld=0, crossed=0;
  for(const joint of [joints[0],joints[1],joints[2],joints[10]]) for(const lateral of [-35,35]) {
    const s0=starts[joint]-10, centre=d.course.at(s0);
    // The old frame (a plain segment direction) jumps by about lateral x turn at this joint.
    const a=runtime.floor.pointAt(starts[joint]-1e-6,lateral), b=runtime.floor.pointAt(starts[joint]+1e-6,lateral);
    worstOld=Math.max(worstOld,Math.hypot(a.x-b.x,a.z-b.z));
    Object.assign(d.state,{s:s0,prevS:s0,lateral,prevLateral:lateral,headingError:0,speedMph:30,airHeight:0,
      airborne:false,_jumpY:null,yawVelocity:0,pushVelocity:0,impactTimer:0});
    d.setInput({throttle:0,brake:0,steer:0});
    let before=d.course.worldAt(d.state.s,d.state.lateral), sBefore=d.state.s;
    for(let i=0;i<180;i++) {
      const speed=d.state.speedMph; d.step(DT);
      const now=d.course.worldAt(d.state.s,d.state.lateral);
      assert.ok(Math.hypot(now.x-before.x,now.z-before.z)<=Math.abs(speed)*.44704*DT+.005,
        `joint ${joint}, lateral ${lateral}: world step at frame ${i}`);
      for(const start of starts) if((sBefore-start)*(d.state.s-start)<0&&Math.abs(d.state.s-start)<20) crossed++;
      before=now; sBefore=d.state.s;
    }
    assert.equal(d.state.status,'exploring'); assert.ok(d.state.speedMph>20,'and the car drives on');
  }
  assert.ok(worstOld>20,`the old frame would have jumped ${worstOld.toFixed(1)} m at these bends`);
  assert.ok(crossed>=8,'the drives really cross joints');
  // The frame is exact both ways: the place of any world point gives that point back.
  for(let k=0;k<400;k++) {
    const p=d.course.worldAt(starts[joints[k%8]]+((k*37)%40)-20,((k*53)%140)-70), near=d.course.nearest(p.x,p.z);
    const back=d.course.worldAt(near.s,near.lateral);
    assert.ok(Math.hypot(back.x-p.x,back.z-p.z)<1e-6,'nearest undoes worldAt around the bends');
  }
});

test('objective notices wait for the title, sound once and never replay saved completions', () => {
  const d=race();dive(d);let discovery={enabled:true}, clock=1, sounds=0, raceNotices=0;
  const before=JSON.stringify(d.state);
  d.onChange((state,event)=>{if(event.deepObjective)raceNotices++;});
  const elements=new Map(), context=new Proxy({}, {get:()=>()=>{}});
  const element=()=>({hidden:true,textContent:'',style:{},append(){},remove(){},
    addEventListener(){},removeEventListener(){},getContext:()=>context,
    querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}});
  const host=element();host.ownerDocument={createElement:element};
  const audio={event(event){if(event.deepObjective)sounds++;}};
  const hud=createSirenaHud({host,app:{duel:d,deepAudio:audio,getDeepDiscovery:()=>discovery},now:()=>clock,
    phone:{say(){},update(){return null;},dispose(){}}});
  hud.update();
  d.emit({deepPlace:{title:true,place:d.deepRuntime.zone.places[1]}});
  discovery={enabled:true,raised:['sirena-badge']};clock=1.2;hud.update();
  assert.equal(sounds,0);assert.equal(elements.get('.deep-objective-tick').hidden,true);
  clock=4.2;hud.update();
  assert.equal(sounds,1);assert.equal(elements.get('.deep-objective-tick').textContent,'Badge found');
  clock=8;hud.update();assert.equal(sounds,1);
  hud.dispose();
  const revisit=createSirenaHud({host,app:{duel:d,deepAudio:audio,getDeepDiscovery:()=>discovery},now:()=>clock,
    phone:{say(){},update(){return null;},dispose(){}}});
  revisit.update();assert.equal(sounds,1);revisit.dispose();
  assert.equal(raceNotices,0,'presentation notices stay off the race event bus');
  assert.equal(JSON.stringify(d.state),before,'the HUD never changes race state');
});

test('chart reveals a 25 m swath along the path, persists within 2.4 KB, unions safely and leaves old saves alone', () => {
  const cells=[{id:0,x:0,z:0},{id:1,x:50,z:24},{id:2,x:50,z:26},{id:3,x:100,z:0}];
  const bits=revealChart('',cells,{x:0,z:0},{x:100,z:0});
  assert.equal(chartHas(bits,0),true); assert.equal(chartHas(bits,1),true);
  assert.equal(chartHas(bits,2),false); assert.equal(chartHas(bits,3),true);
  assert.equal(chartPercent(bits,cells),75); assert.equal(bits.length,CHART_HEX);
  const old={kit:true,raised:['sirena-badge'],future:{keep:true}};
  assert.deepEqual(normalizeDeep(old),old); assert.equal(Object.hasOwn(normalizeDeep(old),'charted'),false);
  const a={deep:old,credits:300}, b=rememberChart(a,'kelp-coast',bits,{enabled:true});
  assert.deepEqual(a.deep,old); assert.equal(b.credits,300);
  assert.ok(Buffer.byteLength(JSON.stringify(b.deep.charted))<2400);
  assert.deepEqual(normalizeDeep(b.deep).charted,b.deep.charted);
  assert.equal(rememberChart(b,'kelp-coast','0',{enabled:true}),b,'stale snapshots cannot erase cells');
  assert.equal(rememberChart(a,'kelp-coast',bits),a,'switch off is inert');
  assert.deepEqual(normalizeDeep({charted:{'kelp-coast':'f'.repeat(CHART_HEX+1),evil:'ffff'}}).charted,{});
  assert.deepEqual(normalizeDeep({charted:{'kelp-coast':'__proto__'}}).charted,{});
  let reference;
  for(const {seed} of ROUTE_VARIANTS) {
    const d=race(seed), {zone,floor}=d.course.deepZone, frame=chartFrame(zone), survey=chartCells(zone,floor);
    const ids=survey.map(c=>c.id);
    if(reference)assert.deepEqual(ids,reference,'bitmap coordinates survive route changes');
    reference=ids;
    let full=''; for(const cell of survey)full=revealChart(full,survey,cell);
    assert.equal(chartPercent(full,survey),100);
    const p=frame.world(100,300), local=frame.local(p);
    assert.ok(Math.abs(local.x-100)<1e-8&&Math.abs(local.z-300)<1e-8);
  }
});

test('chart pins only saved finds, at their fixed spots; Ana counts real goals without duplicates or other coasts', () => {
  const d=race(), zone=d.course.deepZone.zone, geometry=deepMapGeometry(zone), car={...zone.trail[0],heading:0};
  assert.equal(deepMapData(geometry,zone,car).pins.length,0);
  const save={raised:['sirena-badge','sirena-wheel'],logged:['turtle','fake','turtle'],pearls:['kelp-1','reef-1']};
  const before=JSON.stringify(save), data=deepMapData(geometry,zone,car,{save});
  assert.equal(data.pins.length,4);
  assert.deepEqual(data.pins.map(p=>p.kind).sort(),['badge','life','part','pearl']);
  const pearl=data.pins.find(p=>p.kind==='pearl');
  assert.ok(Math.hypot(pearl.x-geometry.loop[zone.pearls[0].trailIndex].x,pearl.y-geometry.loop[zone.pearls[0].trailIndex].y)>0,'offset preserved');
  const rows=deepObjectives(save,42);
  assert.equal(rows[0].done,true); assert.match(rows[1].text,/2 of 5/);
  assert.match(rows[3].text,/1 of 7/); assert.match(rows[4].text,/1 of 3/);
  assert.match(rows[5].text,/42%/); assert.ok(rows.every(r=>r.hint&&r.tick));
  assert.ok(deepObjectives({raised:SIRENA_FINDS,logged:DEEP_LOG_PAGES[0].creatures,
    pearls:DEEP_LOG_PAGES[0].pearls,coastCup:true},100).every(r=>r.done));
  assert.match(deepObjectives({},0,true).at(-1).hint,/Finish a Pacific Canyon race/);
  assert.equal(JSON.stringify(save),before,'view never changes progress');
});

test('App rejects chart writes for the wrong player, zone, journey or disabled feature', () => {
  const profile={deep:{kit:true}}, state={playerId:'a',deepJourney:{committed:true,zoneId:'kelp-coast'}};
  let writes=0;
  const app={runId:'qa',profile,player:{id:'a'},_runPlayerId:'a',duel:{state},
    _switches:()=>createFeatureFlags({storage:null,overrides:{'the-deep':true}}),
    _refreshPlayer(){},_saveProfile(){writes++;}};
  const settle=event=>App.prototype._settleDeepChart.call(app,event,state);
  assert.equal(settle({deepCharted:{zoneId:'kelp-coast',bits:'f'}}),true);
  assert.equal(writes,1);
  app.player.id='b';assert.equal(settle({deepCharted:{zoneId:'kelp-coast',bits:'ff'}}),false);
  app.player.id='a';assert.equal(settle({deepCharted:{zoneId:'wreck-reef',bits:'ff'}}),false);
  state.deepJourney.committed=false;assert.equal(settle({deepCharted:{zoneId:'kelp-coast',bits:'ff'}}),false);
  state.deepJourney.committed=true;app._switches=()=>({enabled:()=>false});
  assert.equal(settle({deepCharted:{zoneId:'kelp-coast',bits:'ff'}}),false);assert.equal(writes,1);
});

test('Restart flushes the final survey cells for the old run before taking the new dive snapshot', () => {
  const storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const cancelDescriptor=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
  const values=new Map(); let app;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,
    setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
  Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:()=>{}});
  try {
    app=new App({deepProviders:[kelpCoastProvider]});
    app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'the-deep':true}});
    app.profile={...app.profile,deep:{kit:true}}; app._saveProfile();
    app.startCampaign({seed:1989,mode:'duel',opponentCount:1}); dive(app.duel);
    const story=app.duel.deepStory, before=app.profile.deep.charted['kelp-coast'];
    park(app.duel,app.duel.deepRuntime.zone.trail[40]);app.duel.step(DT);
    assert.equal(story.chartDirty,true); assert.notEqual(story.charted,before);
    const expected=story.charted;
    app.restart();
    assert.equal(app.profile.deep.charted['kelp-coast'],expected);
    assert.equal(app.duel._deepSave.charted['kelp-coast'],expected,'new campaign reads final chart');
    assert.ok([...values.values()].some(text=>text.includes(expected)),'written to memory storage');
  } finally {
    app?.dispose();
    if(storageDescriptor)Object.defineProperty(globalThis,'localStorage',storageDescriptor);else delete globalThis.localStorage;
    if(cancelDescriptor)Object.defineProperty(globalThis,'cancelAnimationFrame',cancelDescriptor);else delete globalThis.cancelAnimationFrame;
  }
});

// DEEP-EXPLORER: creatures move under the exact rules the renderer reads.
test('slowly following a moving turtle logs in the actual dive; a fast pass and interrupted holds do not', () => {
  const d=race();dive(d);const q=d.deepStory, zone=d.deepRuntime.zone, spot=q.log.spots.find(p=>p.creature==='turtle');
  // Advance the rule clock until a turtle is well outside its fixed spot.
  let turtle;
  for(let t=20;t<100;t++) {
    stepSeaLifeState(q.life,t,DT,{x:0,y:0,z:0},d.deepRuntime.floor);
    turtle=q.life.positions.find(p=>p.creature==='turtle'&&Math.hypot(p.x-spot.x,p.z-spot.z)>12);
    if(turtle){q.seconds=t;break;}
  }
  assert.ok(turtle,'test really follows a moving animal beyond the spot');
  const turtleIndex=q.life.positions.filter(p=>p.creature==='turtle').indexOf(turtle);
  const follow=()=>{
    const pose=q.life.positions.filter(p=>p.creature==='turtle')[turtleIndex];
    assert.ok(Math.hypot(pose.x-spot.x,pose.z-spot.z)>8,'fixed spot cannot satisfy this hold');
    park(d,pose);
  };
  const events=[];d.onChange((s,e)=>{if(e.deepLogged?.creature==='turtle')events.push(e);});
  for(let i=0;i<150;i++) {
    follow();d.state.speedMph=25;
    stepDeepStory(d,DT);
  }
  assert.equal(events.length,0);assert.equal(loggingProgress(q.log),null);
  for(let i=0;i<60;i++) {follow();stepDeepStory(d,DT);}
  assert.ok(loggingProgress(q.log).fraction>=.49&&loggingProgress(q.log).fraction<.51);
  park(d,zone.trail[0]);stepDeepStory(d,DT);
  assert.equal(loggingProgress(q.log),null,'leaving empties ring');
  for(let i=0;i<119;i++) {follow();stepDeepStory(d,DT);}
  assert.equal(events.length,0,'a fresh full second is required');
  follow();stepDeepStory(d,DT);
  assert.equal(events.length,1);assert.equal(q.log.logged.has('turtle'),true);
});

test('every Kelp Coast creature logs at its spot and moving pose on every route; sea-life state repeats from inputs', () => {
  for(const {seed} of ROUTE_VARIANTS) {
    const d=race(seed), {zone,floor}=d.course.deepZone;
    for(const id of DEEP_LOG_PAGES[0].creatures) {
      const log=createLog(zone,{}, {enabled:true}), spot=log.spots.find(p=>p.creature===id);
      for(let i=0;i<120;i++)stepLog(log,{...spot,speed:19/1.609344},DT);
      assert.ok(log.logged.has(id),`${seed}: ${id} spot`);
      const movingLog=createLog(zone,{}, {enabled:true}), a=createSeaLifeState(zone), b=createSeaLifeState(zone);
      let car={...spot,y:floor.floorHeight(spot.x,spot.z)+1,speed:0}, seen=false;
      for(let i=0;i<400;i++) {
        const t=i*DT;
        const poses=stepSeaLifeState(a,t,DT,car,floor);stepSeaLifeState(b,t,DT,car,floor);
        assert.deepEqual(a.positions,b.positions,'same time and inputs give identical poses');
        const animal=poses.find(p=>p.creature===id);
        if(animal) { seen=true;car={...animal,speed:4/1.609344};stepLog(movingLog,car,DT,poses); }
      }
      assert.ok(seen,`${seed}: ${id} rule pose exists`);
      assert.ok(movingLog.logged.has(id),`${seed}: ${id} moving pose`);
    }
    const log=createLog(zone,{}, {enabled:true}), pearl=log.pearls[0];
    stepLog(log,{...pearl,x:pearl.x+3.1,speed:0},2);assert.equal(log.found.size,0,'pearls retain 3m');
    stepLog(log,{...pearl,speed:16/1.609344},2);assert.equal(log.found.size,0,'pearls retain 15km/h');
  }
});
