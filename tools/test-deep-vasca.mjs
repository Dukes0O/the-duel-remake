// DEEP-LAST-JOKE: headless simulation and save checks for The Squeak.
import assert from 'node:assert/strict';
import test from 'node:test';
globalThis.__DUEL_QA__=true;
globalThis.location={search:'?flags=the-deep,deep-vasca'};
const {Duel}=await import('../src/game.js');
const {ROUTE_VARIANTS}=await import('../src/route-variants.js');
const {deepWorldPose}=await import('../src/deep/deep-journey.js');
const {buildDeepRamp}=await import('../src/deep/deep-ramp.js');
const {defineZone}=await import('../src/deep/deep-zone.js');
const {kelpCoastProvider}=await import('../src/deep/zones/kelp-coast.js');
const {SIRENA_FINDS,JOKE_FIND,createSirena,pingSonar,stepLift,raiseJoke}=await import('../src/deep/deep-sirena.js');
const {DEEP_LOG_PAGES,hasAllPearls,logPage}=await import('../src/deep/deep-log.js');
const {deepHints,deepSqueakTip}=await import('../src/deep/deep-hints.js');
const {deepObjectives,deepNextStep}=await import('../src/deep/deep-objectives.js');
const {createVascaVehicle,VASCA_VEHICLE_DIMENSIONS}=await import('../src/vasca-vehicle.js');
const {SOUND_BANK}=await import('../src/sound-bank.js');
const {playRace}=await import('./water-easy-driver.mjs');
const {raiseJoke:recordJoke}=await import('../src/deep/deep-sirena.js');

const ON={enabled:true}, SIRENA_SAVE={raised:[...SIRENA_FINDS]};
const car=(x,z,speed=0)=>({x,z,speed});
const zoneFor=route=>{
  const duel=new Duel({seed:route.seed,deepProviders:[],featureFlags:{'the-deep':true,'deep-vasca':true}});
  duel.startCampaign({seed:route.seed,car:'falcone_f42',mode:'duel',deepKit:true,opponentCount:1,fieldSize:2,fieldSeed:route.seed,playerId:'vasca-test'});
  return defineZone(kelpCoastProvider(buildDeepRamp(duel.course)));
};
test('the seventh find is gated until the next dive after the Sirena, and stays outside the six-find list',()=>{
  for(const route of ROUTE_VARIANTS){
    const zone=zoneFor(route);
    assert.deepEqual(zone.joke,{id:JOKE_FIND,trailIndex:11,offset:-4,below:1.6});
    assert.deepEqual(SIRENA_FINDS,['sirena-badge','sirena-steering-wheel','sirena-wheel','sirena-bonnet','sirena-door','sirena-car']);
    const sameDive=createSirena(zone,{}, {...ON,joke:true});
    assert.equal(sameDive.finds.some(row=>row.id===JOKE_FIND),false,`${route.id}: locked before Sirena`);
    sameDive.raised.push('sirena-car');
    assert.equal(sameDive.finds.some(row=>row.id===JOKE_FIND),false,`${route.id}: raising Sirena cannot add another find this dive`);
    assert.equal(createSirena(zone,SIRENA_SAVE, {enabled:false,joke:false}).finds.some(row=>row.id===JOKE_FIND),false,`${route.id}: switch off`);
    const state=createSirena(zone,SIRENA_SAVE,{...ON,joke:true});
    const find=state.finds.find(row=>row.id===JOKE_FIND);
    assert.ok(find);
    assert.ok(Math.abs(Math.hypot(find.x-zone.trail[11].x,find.z-zone.trail[11].z)-4)<1e-8);
    assert.equal(state.squeak,true);
    const ping=pingSonar(state,car(find.x,find.z+88),0)[0].deepSonar;
    assert.equal(ping.squeak,true); assert.equal(ping.blip.find,JOKE_FIND);
  }
});
test('four lift bags raise the bath and grant it once without credits',()=>{
  const zone=zoneFor(ROUTE_VARIANTS[0]),state=createSirena(zone,SIRENA_SAVE,{...ON,joke:true});
  const find=state.finds.find(row=>row.id===JOKE_FIND),where=car(find.x,find.z);
  assert.deepEqual(stepLift(state,where,{lift:true},1/120),[{deepLift:{find:JOKE_FIND,seconds:12}}]);
  for(let i=0;i<12*120;i++)stepLift(state,where,{lift:true},1/120);
  assert.ok(state.raised.includes(JOKE_FIND));
  const profile={credits:811,deep:{raised:['sirena-car']},unlockedCars:[]};
  const earned=raiseJoke(profile,ON);
  assert.equal(earned.ok,true); assert.equal(earned.paid,0); assert.equal(earned.profile.credits,811);
  assert.ok(earned.profile.deep.raised.includes(JOKE_FIND)); assert.deepEqual(earned.profile.unlockedCars,['falcone_vasca']);
  assert.equal(raiseJoke(earned.profile,ON).profile,earned.profile);
  assert.equal(raiseJoke({credits:0,deep:{},unlockedCars:[]},ON).ok,false);
});
test('the sonar story lines arrive once and in the settled order',()=>{
  const route=ROUTE_VARIANTS[0],duel=new Duel({seed:route.seed,featureFlags:{'the-deep':true,'deep-vasca':true},deepProviders:[kelpCoastProvider]});
  duel.startCampaign({seed:route.seed,mode:'duel',car:'falcone_f42',deepKit:true,deepSave:SIRENA_SAVE,deepFound:['kelp-coast'],playerId:'vasca-lines',opponentCount:1,fieldSize:2,fieldSeed:route.seed});
  Object.assign(duel.state,{status:'racing',countdown:0});
  const ramp=duel.course.deepRamp,progress=ramp.shoreline.center.progress-.04;
  let point;for(let i=1;i<ramp.points.length;i++){const a=ramp.points[i-1],b=ramp.points[i];if(progress>b.progress&&i<ramp.points.length-1)continue;const t=(progress-a.progress)/(b.progress-a.progress);point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};break;}
  const near=duel.course.nearest(point.x,point.z);Object.assign(duel.state,{s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
    headingError:Math.atan2(Math.sin(ramp.heading-duel.course.at(near.s).heading),Math.cos(ramp.heading-duel.course.at(near.s).heading)),speedMph:35,groundHeight:point.y});
  const lines=[];duel.onChange((_state,event)=>{if(event.deepPhone)lines.push(event.deepPhone.line);});
  duel.step(1/120);assert.equal(duel.chooseDeep('dive'),true);for(let i=0;i<360;i++)duel.step(1/120);
  assert.deepEqual(lines.splice(0),['deep.ana.squeak'],'the call happens at the start of the next dive');
  assert.equal(duel.deepPing(),true);assert.deepEqual(lines.splice(0),['deep.ana.whale'],'the first blip gets its joke');
  const find=duel.deepStory.sirena.finds.find(row=>row.id===JOKE_FIND),park=(x,z)=>{const n=duel.course.nearest(x,z,duel.state.s);Object.assign(duel.state,{s:n.s,prevS:n.s,lateral:n.lateral,prevLateral:n.lateral,speedMph:0});};
  park(find.x,find.z);duel.step(1/120);assert.deepEqual(lines.splice(0),['deep.ana.duck'],'the duck line begins within 25 m');
  duel.setInput({interact:true});duel.step(1/120);assert.deepEqual(lines.splice(0),['deep.ana.heavy'],'the lift starts with Ana');
  for(let i=0;i<6*120;i++)duel.step(1/120);assert.deepEqual(lines.splice(0),['deep.ana.maybe'],'the warning waits six seconds');
  for(let i=0;i<6*120;i++)duel.step(1/120);
  assert.deepEqual(lines.splice(0),['deep.ana.reveal','deep.ana.bath','deep.ana.wheels','deep.ana.nino','deep.ana.towel','deep.ana.yours']);
  assert.deepEqual(SOUND_BANK['deep.squeak'].layers.map(layer=>layer.endFrequency),[980,540],'the squeak rises, then falls');
});
test('the new objective, garage tip, Kelp Coast pearl finish and otter fact match the settled story',()=>{
  const profile={deep:{raised:['sirena-car']}};
  assert.equal(deepSqueakTip(profile,{enabled:true}),'Ana left a message. Her sonar has started squeaking. She would like you to come and hear it.');
  assert.equal(deepSqueakTip(profile,{enabled:false}),null);
  assert.equal(deepSqueakTip({deep:{raised:['sirena-car','falcone-vasca']}},{enabled:true}),null);
  const rows=deepObjectives(profile,0,false,{duck:true});
  assert.deepEqual(rows.map(row=>row.id).slice(0,4),['badge','parts','sirena','duck']);
  assert.equal(deepNextStep(rows).text,'Find the Falcone badge');
  assert.equal(deepNextStep(rows.map(row=>row.id==='badge'||row.id==='parts'||row.id==='sirena'?{...row,done:true}:row)).text,'Find out why the sonar squeaks');
  assert.deepEqual(DEEP_LOG_PAGES[0].pearls,['kelp-1','kelp-2','kelp-3']);
  assert.equal(hasAllPearls({deep:{pearls:['kelp-1','kelp-2','kelp-3']}}),true);
  assert.equal(logPage({deep:{found:['kelp-coast']}}).pearlTotal,3);
  assert.equal(deepHints({enabled:true,playerId:'p',pacificFinishes:6}).bubbles,undefined);
  assert.match(deepHints({enabled:true,playerId:'p',pacificFinishes:6}).garageTip,/BOAT RAMP sign/);
});
test('the Vasca is a complete race vehicle with a separate dive duck node',()=>{
  const carModel=createVascaVehicle(),diveModel=createVascaVehicle({tethered:true});
  assert.equal(carModel.name,'falcone_vasca'); assert.deepEqual(carModel.userData.size,VASCA_VEHICLE_DIMENSIONS.falcone_vasca);
  assert.equal(carModel.userData.wheelPivots.length,4); assert.equal(diveModel.getObjectByName('duck')?.parent,diveModel);
  assert.ok(carModel.getObjectByName('duck').position.y<2); assert.ok(diveModel.getObjectByName('duck').position.y>2.5);
});
test('an Easy child-pace player can follow only sonar bearings to the bath in under three minutes on each route',()=>{
  for(const route of ROUTE_VARIANTS)for(let seed=1;seed<=10;seed++){
    const duel=new Duel({seed:route.seed,featureFlags:{'the-deep':true,'deep-vasca':true},deepProviders:[kelpCoastProvider]});
    const saved={kit:true,raised:[...SIRENA_FINDS]};
    duel.startCampaign({seed:route.seed,mode:'duel',car:'falcone_f42',deepKit:true,deepSave:saved,playerId:`vasca-${route.id}-${seed}`,opponentCount:1,fieldSize:2,fieldSeed:seed});
    const ramp=duel.course.deepRamp,progress=ramp.shoreline.center.progress-.04;
    let point;for(let i=1;i<ramp.points.length;i++){const a=ramp.points[i-1],b=ramp.points[i];if(progress>b.progress&&i<ramp.points.length-1)continue;const t=(progress-a.progress)/(b.progress-a.progress);point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};break;}
    const near=duel.course.nearest(point.x,point.z);Object.assign(duel.state,{status:'racing',s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
      headingError:Math.atan2(Math.sin(ramp.heading-duel.course.at(near.s).heading),Math.cos(ramp.heading-duel.course.at(near.s).heading)),speedMph:35,groundHeight:point.y});
    duel.step(1/60);assert.equal(duel.chooseDeep('dive'),true);for(let i=0;i<180;i++)duel.step(1/60);
    let bearing=null,seconds=0,nextPing=0,profile={credits:700,unlockedCars:[],deep:{raised:[...SIRENA_FINDS]}};
    duel.onChange((_state,event)=>{if(event.deepSonar?.blip?.relative!=null)bearing=event.deepSonar.blip;});
    for(let frame=0;frame<180*60&&!profile.unlockedCars.includes('falcone_vasca');frame++){
      if(seconds>=nextPing){duel.deepPing();nextPing=seconds+1.5;}
      const speed=Math.abs(duel.state.speedMph),distance=bearing?.distance??Infinity;
      const steer=bearing&&distance>4?Math.max(-1,Math.min(1,-bearing.relative*1.8)):0;
      const input={steer,throttle:distance>4&&speed<12?.45:0,brake:speed>13.2||distance<=4&&speed>1?.8:0,
        interact:distance<=4&&speed<1,boost:false};
      duel.setInput(input);duel.step(1/60);seconds+=1/60;
      if(duel.deepStory?.sirena.raised.includes(JOKE_FIND))profile=recordJoke(profile,ON).profile;
      if(Math.abs(duel.state.speedMph)>15.0001)assert.fail(`${route.id} seed ${seed}: exceeded 15 mph (${duel.state.speedMph})`);
    }
    const finalPose=deepWorldPose(duel),target=duel.deepStory?.sirena.finds.find(row=>row.id===JOKE_FIND),remaining=target&&finalPose?Math.hypot(target.x-finalPose.x,target.z-finalPose.z):null;
    assert.ok(profile.unlockedCars.includes('falcone_vasca'),`${route.id} seed ${seed}: Vasca owned within ${seconds.toFixed(1)} simulated seconds; remaining=${remaining?.toFixed(1)}m speed=${duel.state.speedMph.toFixed(1)}mph lift=${JSON.stringify(duel.deepStory?.sirena.lift)} bearing=${JSON.stringify(bearing)} phase=${duel.state.deepJourney?.phase}`);
    assert.ok(seconds<180,`${route.id} seed ${seed}: mission exceeded three minutes`);
  }
});
test('the unupgraded Vasca wins 10 of 10 on Easy with the assisted driver and finishes 10 of 10 at child pace',async()=>{
  const assisted=[],child=[];
  for(let seed=1;seed<=10;seed++){
    assisted.push(await playRace({courseId:'pacific-canyon',seed,car:'falcone_vasca',rules:{homing:true,roadPace:[1,1],seeLateSec:[.3,.3]}}));
    child.push(await playRace({courseId:'pacific-canyon',seed,car:'falcone_vasca'}));
  }
  assert.equal(assisted.filter(result=>result.won).length,10,`assisted Easy results: ${JSON.stringify(assisted)}`);
  assert.equal(child.filter(result=>['stage_result','complete'].includes(result.status)).length,10,`child-pace results: ${JSON.stringify(child)}`);
});
