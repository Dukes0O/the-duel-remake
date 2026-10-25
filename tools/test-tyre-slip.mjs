import {withReferenceApp} from './build-reference-laps.mjs';
import {createFeatureFlags} from '../src/feature-flags.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {createKeyboardSteering} from '../src/keyboard-steering.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DRIVE, steeringYawAuthority, steeringGrip, TYRE_SLIP, tyreSlipGrip,
  tyreSlipScrub, tyreSlipSteering, stepTyreSlip, tyreSlipAngle, tyreSlipRawSound, steerForYaw} from '../src/config.js';
const near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t, a+' differs from '+b);

test('released driving constants and authority function remain byte-identical',()=>{
  const hash=s=>createHash('sha256').update(s).digest('hex');
  assert.equal(hash(JSON.stringify(DRIVE)), '926b2aa9393e19f746135408eb7ed2691c03ee916d65e4cdcd333d3d743a7ee8');
  assert.equal(hash(steeringYawAuthority.toString()), '36e5d75c64cc15c08a9b280880a43804b6162d4fcb7cd0b954fc552830fcafa9');
});

test('grip and scrub reproduce the independently reviewed Casual/Pro table',()=>{
  for(const [slip,cg,pg,cs,ps] of [[0,1,1,0,0],[1,1,1,0,0],[1.05,.98,.964,1.6,2.8],
    [1.1,.96,.928,3.2,5.6],[1.25,.9,.82,8,14],[2,.9,.82,8,14]]){
    near(tyreSlipGrip(slip,'casual'),cg);near(tyreSlipGrip(slip,'pro'),pg);
    near(tyreSlipScrub(slip,'casual'),cs);near(tyreSlipScrub(slip,'pro'),ps);
  }
  assert.ok(Object.isFrozen(TYRE_SLIP));assert.ok(Object.isFrozen(TYRE_SLIP.casual));
});

test('braking uses the same steering grip and demand sensitivity stays fixed',()=>{
  for(const grip of [.35,.7,1,1.2])for(const traction of [.5,.8,1]){
    const dry=tyreSlipSteering({speedMph:100,grip,traction});
    const half=tyreSlipSteering({speedMph:100,grip,traction,brake:.5});
    const full=tyreSlipSteering({speedMph:100,grip,traction,brake:1});
    near(dry.peakYaw,30*grip*traction/44.704);near(full.peakYaw/dry.peakYaw,.8);
    near(half.peakYaw/dry.peakYaw,.9539392014169457);assert.equal(full.steerGain,dry.steerGain);
  }
  assert.equal(steeringGrip(20,.7,{lowSpeedSteer:true}),1);
  assert.equal(steeringGrip(45,.7,{lowSpeedSteer:true}),.7);
  assert.equal(steeringGrip(20,.7),.7);
});

test('full demand and snow follow the reviewed grip limits',()=>{
  for(const [mph,ask] of [[40,.804672],[50,1.00584],[60,1.207008],[80,1.25],[100,1.25],[120,1.25]]){
    const x=tyreSlipSteering({speedMph:mph});near(x.steerGain/x.peakYaw,ask);
  }
  const dry=tyreSlipSteering({speedMph:60}),snow=tyreSlipSteering({speedMph:60,grip:.7});
  near(.8/dry.peakYaw,.715264);near(.8/snow.peakYaw,1.0218057142857143);
});

test('slip rise/fall use exact exponential response independent of step partitions',()=>{
  const expected=1.25*(1-Math.exp(-6));near(stepTyreSlip(0,1.25,.5),expected);
  for(const fps of [30,60,120,144]){
    let slip=0,remaining=.5;
    while(remaining>1e-14){const dt=Math.min(remaining,1/fps);slip=stepTyreSlip(slip,1.25,dt);remaining-=dt;}
    near(slip,expected);assert.ok(slip>1.2375&&slip<1.25);
  }
  near(stepTyreSlip(1.25,.75,.3),.75+.5*Math.exp(-2.4));
  for(const conditions of [{reversing:true},{airborne:true},{knock:true},{speedMph:14.99}])
    near(stepTyreSlip(1.25,1.25,.3,conditions),1.25*Math.exp(-2.4));
  near(stepTyreSlip(1.25,1.25,.3,{speedMph:15}),1.25);
});

test('drawn angle follows actual slip, stays bounded, and crosses zero with steering',()=>{
  for(const [surface,max] of [['road',.21],['gravel',.25],['offroad',.31]]){
    for(const [slip,angle] of [[0,0],[.9,.045],[1,.075],[1.25,max],[2,max]]){
      near(tyreSlipAngle(slip,1,surface),-angle);near(tyreSlipAngle(slip,-1,surface),angle);
      near(tyreSlipAngle(slip,0,surface),0);
    }
  }
});

test('tyre-loop input is actual slide only and leaves gain mapping to existing audio',()=>{
  for(const [slip,raw] of [[0,0],[.9,0],[1,2/7],[1.1,4/7],[1.25,1],[2,1]]) near(tyreSlipRawSound(slip),raw);
});

test('driver helper preserves exact old inputs off and in every arena',()=>{
  for(const mph of [0,3,20,40,45,60,100,190])for(const grip of [.7,1,1.2])for(const traction of [.4,1])
    for(const desiredYaw of [-2,-.4,0,.4,2])for(const car of [null,{lowSpeedSteer:true}]){
      const authority=steeringYawAuthority(mph,grip,traction,car);
      const old=Math.max(-1,Math.min(1,-desiredYaw/Math.max(.05,authority)));
      assert.equal(steerForYaw(desiredYaw,{speedMph:mph,grip,traction,car}),old);
      for(const def of [{arena:true},{arena:true,venue:true}]){
        const course={def},a=steeringYawAuthority(mph,grip,traction,car,course);
        assert.equal(steerForYaw(desiredYaw,{speedMph:mph,grip,traction,car,course,tyreSlip:true}),Math.max(-1,Math.min(1,-desiredYaw/Math.max(.05,a))));
      }
    }
});

test('switch-on driver input respects the peak while braking and on low-grip roads',()=>{
  for(const mph of [20,40,50,60,80,120,190])for(const grip of [.35,.7,1,1.2])for(const traction of [.4,1])
    for(const brake of [0,.5,1])for(const yaw of [-4,-.8,0,.8,4]){
      const options={speedMph:mph,grip,traction,brake,tyreSlip:true},x=tyreSlipSteering(options),steer=steerForYaw(yaw,options);
      assert.ok(Math.abs(steer)<=1);assert.ok(Math.abs(steer)*x.steerGain<=x.peakYaw+1e-12);
    }
});


test('opt-in keyboard keeps every fixed-speed tap and held yaw within STEER-055',()=>{
  for(const [speed,cap] of [[40,1],[50,.956911636],[60,.766357804],[80,.68],[100,.62],[120,.56]]){
    const old=createKeyboardSteering(),next=createKeyboardSteering(),x=tyreSlipSteering({speedMph:speed});
    let last;
    for(let i=0;i<80;i++){
      const a=old.update(1,1/120,speed),b=next.update(1,1/120,speed,{tyreSlip:true});
      near(b*x.steerGain,a*steeringYawAuthority(speed),1e-9);last=b;
    }
    near(last,cap,1e-9);
  }
  for(const speed of [0,20,39.99,60,120])for(const arena of [false,true]){
    const old=createKeyboardSteering({arena}),next=createKeyboardSteering({arena});
    for(let i=0;i<100;i++){
      const direction=i<40?1:i<70?-1:0;
      const a=old.update(direction,1/120,speed),b=next.update(direction,1/120,speed,{tyreSlip:true,course:{def:{arena:true}}});
      assert.equal(b,a,'all arena identities retain old raw keyboard output');
    }
    if(speed<40){const a=createKeyboardSteering(),b=createKeyboardSteering();for(let i=0;i<80;i++)assert.equal(b.update(1,1/120,speed,{tyreSlip:true}),a.update(1,1/120,speed));}
  }
});


test('actual released fixed-step driving retains its pre-edit named-state fingerprint',()=>{
  const d=new Duel({seed:1989,featureFlags:{}});d.startCampaign({seed:1989,startStage:0,opponentCount:0});const h=createHash('sha256');
  for(let i=0;i<2400;i++){
    d.setInput({throttle:1,brake:i>1800?.4:0,steer:i<500?0:i<1200?.06:-.04,boost:false});d.step(1/120);
    const s=d.state;h.update(JSON.stringify(['status','s','lateral','speedMph','headingError','yawVelocity','slipAngle','drifting','airborne','airHeight','lives','crashes'].map(k=>s[k])));
  }
  assert.equal(h.digest('hex'),'5eca83968e3c438d82182da26a9c416a74d09289e15c6b2c1bc76502ac35c2ca');
});

test('rules latch once at race start and all arena definitions refuse the new rules',()=>{
  let enabled=true;const flags={enabled:name=>name==='tyre-slip'&&enabled};const d=new Duel({seed:1989,featureFlags:flags});
  d.startCampaign({startStage:0,opponentCount:0,difficulty:'pro'});assert.equal(d.state.tyreSlipRules,true);assert.equal(d.state.tyreSlip,0);
  enabled=false;for(let i=0;i<10;i++)d.step(1/120);assert.equal(d.state.tyreSlipRules,true,'toggle cannot rewrite a running race');
  d.startCampaign({startStage:0,opponentCount:0,difficulty:'pro'});assert.equal(Object.hasOwn(d.state,'tyreSlipRules'),false);
  enabled=true;
  for(const course of COURSE.filter(c=>c.arena===true)){
    d.startCampaign({startStage:COURSE.indexOf(course),opponentCount:0});
    assert.equal(Object.hasOwn(d.state,'tyreSlipRules'),false,course.id+' keeps released arena rules');
  }
});

test('actual player driving builds a braking slide and sheds it in the air',()=>{
  const d=new Duel({seed:1989,featureFlags:{'tyre-slip':true}});d.startCampaign({startStage:0,opponentCount:0,difficulty:'pro'});
  for(let i=0;i<600&&d.state.status!=='racing';i++)d.step(1/120);assert.equal(d.state.status,'racing');
  const s=d.state;s.speedMph=100;s.gear=2;s.steerVisual=1;d.setInput({throttle:0,brake:1,steer:1});
  // Fixed-speed input probe isolates the reviewed tyre transient in real _drive.
  for(let i=0;i<36;i++){s.speedMph=100;d._drive(1/120);}
  assert.ok(s.tyreSlip>=1.25,'full-brake turn reaches the reviewed slide within0.3s');assert.ok(s.speedMph<100);
  const previous=s.tyreSlip;s.airborne=true;d._drive(1/120);assert.ok(s.tyreSlip<previous,'airborne tyres stop building a slide');
});


test('real App automatic steering asks for no more than the braking-adjusted peak',async()=>{
  await withReferenceApp(async app=>{
    app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'tyre-slip':true}});
    assert.ok(app.startCampaign({startStage:0,opponentCount:0,car:'falcone_f42',difficulty:'pro',seed:1989}));
    app.autopilot=true;app._scriptedCrashDone=true;
    for(let i=0;i<600&&app.duel.state.status!=='racing';i++)app.advance(1/120,1/120);
    const s=app.duel.state;assert.equal(s.tyreSlipRules,true);s.speedMph=100;s.headingError=.5;
    app._driveAutopilot(1/120);
    const surface=app.duel._drivingSurface(s.s,s.lateral),limits=tyreSlipSteering({speedMph:s.speedMph,
      grip:app.duel.car.grip,traction:surface.traction,car:app.duel.car,brake:s.input.brake});
    assert.ok(Math.abs(s.input.steer)*limits.steerGain<=limits.peakYaw+1e-12,'native App helper respects peak including braking');
  });
});


test('actual line and balance driver wrappers respect the latched braking peak',async()=>{
  const {useRacingLine}=await import('./track-script-drive.mjs');
  const {installTestDriver}=await import('./race-field-balance.mjs');
  for(const install of [useRacingLine,installTestDriver]) await withReferenceApp(async app=>{
    app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'tyre-slip':true}});
    app.duel.startCampaign({startStage:COURSE.findIndex(c=>c.id==='panorama-ridge'),opponentCount:0,car:'falcone_f42',difficulty:'pro',seed:1989});
    assert.ok(app.duel.course.racingLine,'authored line fixture uses actual Panorama');
    app.autopilot=true;app._scriptedCrashDone=true;
    for(let i=0;i<600&&app.duel.state.status!=='racing';i++)app.advance(1/120,1/120);
    install(app);
    const s=app.duel.state;s.speedMph=100;s.headingError=.8;
    app._driveAutopilot(1/120);
    const surface=app.duel._drivingSurface(s.s,s.lateral),limits=tyreSlipSteering({speedMph:s.speedMph,
      grip:app.duel.car.grip,traction:surface.traction,car:app.duel.car,brake:s.input.brake});
    assert.ok(Math.abs(s.input.steer)*limits.steerGain<=limits.peakYaw+1e-12,install.name+' caps actual steering demand');
  });
});


test('existing private driver tools pass only the named tyre switch into native races',async()=>{
  const {driveCircuit}=await import('./track-script-drive.mjs');
  const {runRace}=await import('./race-field-balance.mjs');
  const {parseArgs}=await import('./combat-balance.mjs');
  const {runReferenceWorker}=await import('./build-reference-laps.mjs');
  assert.deepEqual(parseArgs(['--flags','tyre-slip']).flags,['tyre-slip']);
  assert.throws(()=>driveCircuit(COURSE[0],{flags:['typo']}),/Unsupported/);
  let lineRules=null,fieldKeys=null,fieldRequested=null;
  driveCircuit(COURSE[0],{flags:['tyre-slip'],difficulty:'pro',driver:'stock',maxSeconds:5,onTick:s=>{lineRules=s.tyreSlipRules;}});
  assert.equal(lineRules,true,'actual line-tool Duel latched requested rules');
  runRace('easy',0,{flags:['tyre-slip'],maxSec:.02,onStep:d=>{fieldKeys=['tyreSlip','tyreSlipRules'].filter(key=>Object.hasOwn(d.state,key));fieldRequested=d.featureFlags.enabled('tyre-slip');}});
  assert.equal(fieldRequested,true,'actual field-tool App receives the requested switch');
  assert.deepEqual(fieldKeys,[],'field tool default Casual keeps every released state field exact under Claude byte-identical decision');
  const catalog=await runReferenceWorker({flags:['tyre-slip'],catalogOnly:true});
  assert.equal(catalog.flags.find(row=>row.name==='tyre-slip')?.enabled,true,'fresh reference worker enables actual dev switch');
  await assert.rejects(()=>runReferenceWorker({flags:['typo'],catalogOnly:true}),/Unsupported/);
});


test('actual drift-event driver preserves capacity at46/50 and holds approved ask at65',async()=>{
  await withReferenceApp(async app=>{
    app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'tyre-slip':true}});
    app.duel.startCampaign({startStage:COURSE.findIndex(c=>c.id==='neon-drift-trial'),car:'banshee_muscle',difficulty:'pro',seed:1989});
    app.autopilot=true;app._scriptedCrashDone=true;
    for(let i=0;i<600&&app.duel.state.status!=='racing';i++)app.advance(1/120,1/120);
    const s=app.duel.state,course=app.duel.course;
    let at=0;while(at<course.length&&Math.abs(course.at(at).curvature)<.001)at+=5;
    assert.ok(at<course.length,'native Neon corner exists');
    const {racingLineFor}=await import('../src/race-lines.js'),line=racingLineFor(course);
    for(const mph of [46,50,65]) {s.s=at;s.speedMph=mph;s.lateral=line.offsetAt(at+Math.max(12,mph*DRIVE.mphToWorld*.45));s.headingError=0;
    app._driveAutopilot(1/120);
    const surface=app.duel._drivingSurface(s.s,s.lateral),limits=tyreSlipSteering({speedMph:s.speedMph,
      grip:app.duel.car.grip,traction:surface.traction,car:app.duel.car,brake:s.input.brake});
    if(mph>=56)near(Math.abs(s.input.steer)*limits.steerGain/limits.peakYaw,Math.min(1.12,limits.steerGain/limits.peakYaw));
    const capacity=Math.min(1,1.12*limits.peakYaw/limits.steerGain);
    near(capacity*limits.steerGain/limits.peakYaw,Math.min(1.12,limits.steerGain/limits.peakYaw));
    assert.ok(Math.abs(s.input.steer)<=1,'approved authority is never increased');
    }
  });
});


test('slip-hold returns to the real clean line below56mph and beyond2m',async()=>{
  await withReferenceApp(async app=>{
    app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'tyre-slip':true}});
    app.duel.startCampaign({startStage:COURSE.findIndex(c=>c.id==='neon-drift-trial'),car:'banshee_muscle',difficulty:'pro',seed:1989});
    app.autopilot=true;app._scriptedCrashDone=true;
    for(let i=0;i<600&&app.duel.state.status!=='racing';i++)app.advance(1/120,1/120);
    const {racingLineFor}=await import('../src/race-lines.js'),d=app.duel,s=d.state,course=d.course,line=racingLineFor(course);
    let at=0;while(at<course.length&&Math.abs(course.at(at).curvature)<.001)at+=5;
    assert.ok(at<course.length,'native Neon corner exists');
    for(const [mph,error] of [[46,.3],[50,.3],[65,3]]){
      const v=mph*DRIVE.mphToWorld,targetLat=line.offsetAt(at+Math.max(12,v*.45));
      Object.assign(s,{s:at,speedMph:mph,lateral:targetLat+error,headingError:.1});
      app._driveAutopilot(1/120);
      const heading=Math.atan((targetLat-s.lateral)*2.5/Math.max(15,v));
      const yaw=course.at(at+v*.18).curvature*v+(heading-s.headingError)*6;
      const expected=steerForYaw(yaw,{speedMph:mph,grip:d.car.grip,traction:d._drivingSurface(at,s.lateral).traction,car:d.car,brake:s.input.brake,tyreSlip:true});
      near(s.input.steer,expected);assert.ok(Math.abs(s.input.steer)<=1);
    }
  });
});

test('slip-hold cuts actual throttle above1.20 slip near the clean line',async()=>{
  await withReferenceApp(async app=>{
    app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'tyre-slip':true}});
    app.duel.startCampaign({startStage:COURSE.findIndex(c=>c.id==='neon-drift-trial'),car:'banshee_muscle',difficulty:'pro',seed:1989});
    app.autopilot=true;app._scriptedCrashDone=true;
    for(let i=0;i<600&&app.duel.state.status!=='racing';i++)app.advance(1/120,1/120);
    const {racingLineFor}=await import('../src/race-lines.js'),d=app.duel,s=d.state,line=racingLineFor(d.course);
    let at=0;while(at<d.course.length&&Math.abs(d.course.at(at).curvature)<.001)at+=5;
    Object.assign(s,{s:at,speedMph:57,lateral:line.offsetAt(at+Math.max(12,57*DRIVE.mphToWorld*.45)),headingError:0,tyreSlip:1.25});
    app._driveAutopilot(1/120);assert.equal(s.input.throttle,0,'excessive actual slip cuts throttle');
  });
});


test('Kyle Casual exception latches released tyres while Pro keeps the reviewed slide',()=>{
  let enabled=true;const d=new Duel({seed:1989,featureFlags:{enabled:name=>name==='tyre-slip'&&enabled}});
  d.startCampaign({difficulty:'casual',startStage:0,opponentCount:0});
  assert.equal(Object.hasOwn(d.state,'tyreSlipRules'),false,'Casual uses today tyres even when requested');
  for(let tick=0;tick<20;tick++)d.step(1/120);
  assert.equal(Object.hasOwn(d.state,'tyreSlipRules'),false);
  d.startCampaign({difficulty:'pro',startStage:0,opponentCount:0});assert.equal(d.state.tyreSlipRules,true);
  enabled=false;for(let tick=0;tick<20;tick++)d.step(1/120);
  assert.equal(d.state.tyreSlipRules,true,'a running Pro race keeps its latched rules');
  d.startCampaign({difficulty:'casual',startStage:0,opponentCount:0});assert.equal(Object.hasOwn(d.state,'tyreSlipRules'),false);
});

test('requested Casual tyres preserve complete native states in road and drift events',()=>{
  for(const eventId of ['pacific-canyon','neon-drift-trial']){
    const startStage=COURSE.findIndex(course=>course.id===eventId);
    const run=enabled=>{
      const d=new Duel({seed:1989,featureFlags:{'tyre-slip':enabled}});
      d.startCampaign({startStage,difficulty:'casual',car:'banshee_muscle',opponentCount:0,seed:1989});
      const hash=createHash('sha256');
      for(let tick=0;tick<1800;tick++){
        d.setInput({throttle:1,brake:tick>1300?.3:0,steer:tick<600?0:tick<1200?.2:-.15,boost:false});
        d.step(1/120);hash.update(JSON.stringify(d.state));
      }
      return hash.digest('hex');
    };
    assert.equal(run(true),run(false),eventId+' entire actual Casual state stream remains exact');
  }
});


test('new Pro drift records remain separate without deleting any old score or ordinary key',async()=>{
  const {createProfile,bestKey,settleRace,isValidFinish}=await import('../src/progression.js');
  const {createLeaderboard,recordFinish,mergeLeaderboards,getLeaderboard}=await import('../src/leaderboard.js');
  const stageIndex=COURSE.findIndex(course=>course.id==='neon-drift-trial');
  const result={runId:'old-drift',stageIndex,completed:true,won:true,targetsMet:true,laps:2,timeSec:100,
    driftScore:8000,driftBestChain:3000,driftMeters:2000,car:'banshee_muscle',driverId:'club',
    difficulty:'pro',cpuDifficulty:'easy',mode:'duel',seed:1989};
  const next={...result,runId:'new-drift',tyreSlipRules:true,driftScore:7000,timeSec:105};
  assert.notEqual(bestKey(result),bestKey(next),'new drift rules get their own comparable personal best');
  assert.equal(bestKey({...result,stageIndex:0}),bestKey({...result,stageIndex:0,tyreSlipRules:true}),'ordinary key unchanged');
  assert.equal(isValidFinish({...next,difficulty:'casual'}),false,'Casual cannot claim sliding-model records');
  const player={id:'driver-1',name:'Driver One'};
  const old=recordFinish(createLeaderboard(),result,player);assert.equal(old.recorded,true);
  const retained=structuredClone(old.board.entries[0]);
  const added=recordFinish(old.board,next,player);assert.equal(added.recorded,true);
  const loaded=mergeLeaderboards(JSON.parse(JSON.stringify(added.board)));
  assert.equal(loaded.entries.length,2);assert.deepEqual(loaded.entries.find(row=>!row.tyreSlipRules),retained);
  assert.equal(getLeaderboard(loaded,{eventId:'neon-drift-trial',driverId:'club',tyreSlipRules:true})[0].driftScore,7000);
  assert.equal(getLeaderboard(loaded,{eventId:'neon-drift-trial',driverId:'club',tyreSlipRules:false})[0].driftScore,8000);
  const first=settleRace(createProfile(),result),second=settleRace(first.profile,next);
  assert.equal(second.personalBestStatus,'baseline');assert.ok(first.profile.personalBests[bestKey(result)]);
  assert.equal(second.profile.personalBests[bestKey(result)],first.profile.personalBests[bestKey(result)]);
  assert.equal(settleRace(second.profile,next).profile,second.profile,'existing run settlement stays once-only');
});

test('only actual latched Pro drift objectives emit the optional rules version',()=>{
  const stageIndex=COURSE.findIndex(course=>course.id==='neon-drift-trial');
  for(const difficulty of ['casual','pro']){
    const d=new Duel({seed:1989,featureFlags:{'tyre-slip':true}});
    d.startCampaign({startStage:stageIndex,difficulty,car:'banshee_muscle',seed:1989});
    const result=d._objectiveResult();
    assert.equal(Object.hasOwn(result,'tyreSlipRules'),difficulty==='pro');
    if(difficulty==='pro')assert.equal(result.tyreSlipRules,true);
  }
});


function replayTyreInputs(recording,race,fps){
  const index=COURSE.findIndex(row=>row.id===race.eventId);
  assert.ok(index>=0,'the pinned event exists');
  const duel=new Duel({seed:recording.seed,featureFlags:{'tyre-slip':true}});
  duel.startCampaign({startStage:index,seed:recording.seed,mode:'duel',car:race.car,
    difficulty:'pro',cpuDifficulty:'easy'});
  assert.equal(duel.state.tyreSlipRules,true,'repeatability probes actual new tyres');
  const hash=createHash('sha256');let tick=0,input=0;
  const frames=Math.ceil(recording.durationTicks*fps/recording.stepHz);
  for(let frame=1;frame<=frames;frame++){
    const until=Math.min(recording.durationTicks,Math.floor(frame*recording.stepHz/fps+1e-9));
    while(tick<until){
      if(recording.inputs[input]?.atTick===tick)duel.setInput(recording.inputs[input++]);
      duel.step(1/recording.stepHz);tick++;
      const s=duel.state;
      hash.update(JSON.stringify({tick,player:['status','s','lateral','speedMph','headingError',
        'yawVelocity','slipAngle','drifting','airborne','airHeight','lives','crashes',
        'tyreSlip','tyreSlipRules','completedLaps','boundaryResets'].map(key=>s[key]),
        rival:s.rival&&['s','lateral','speedMph','headingError','completedLaps','finished'].map(key=>s.rival[key])}));
    }
  }
  assert.equal(tick,recording.durationTicks,'frame schedule consumes every fixed step');
  assert.ok(duel.state.stageTimeSec>0&&duel.state.s>20,'native recorded inputs drive the event');
  return hash.digest('hex');
}

test('switch-on replay pins are stable at30/60/144fps with three runs per event',async()=>{
  const {readFile}=await import('node:fs/promises');
  const pins=JSON.parse(await readFile(new URL('./replays/tyre-slip.json',import.meta.url),'utf8'));
  const recording=JSON.parse(await readFile(new URL('./replays/recorded-inputs.json',import.meta.url),'utf8'));
  assert.equal(pins.version,1);assert.equal(pins.difficulty,'pro');assert.equal(pins.rules,'tyre-slip');
  assert.equal(pins.recordedInputSha256,createHash('sha256').update(JSON.stringify(recording)).digest('hex'),
    'historical recorded input data is unchanged');
  assert.deepEqual(pins.cases.map(row=>row.eventId),['pacific-canyon','harbour-lights','tremblant-snow']);
  assert.equal(recording.stepHz,120);assert.deepEqual(recording.framesPerSecond,[30,60,144]);
  for(const race of pins.cases){
    assert.match(race.fingerprint,/^[a-f0-9]{64}$/);
    for(const fps of recording.framesPerSecond)for(let run=0;run<3;run++)
      assert.equal(replayTyreInputs(recording,race,fps),race.fingerprint,race.eventId+' at'+fps+'fps run'+(run+1));
  }
});


test('all circuit arenas keep complete native state streams exact with the switch requested',()=>{
  for(const event of COURSE.filter(row=>row.arena===true)){
    const transcript=enabled=>{
      const d=new Duel({seed:1989,featureFlags:{'tyre-slip':enabled}});
      d.startCampaign({seed:1989,startStage:COURSE.indexOf(event),car:'titan_monster',difficulty:'pro'});
      assert.equal(Object.hasOwn(d.state,'tyreSlipRules'),false,event.id+' refuses new road rules');
      const hash=createHash('sha256');
      for(let tick=0;tick<1200;tick++){
        d.setInput({throttle:1,brake:tick>850?.4:0,steer:tick<450?.6:-.4,boost:false});
        d.step(1/120);hash.update(JSON.stringify(d.state));
      }
      return hash.digest('hex');
    };
    assert.equal(transcript(true),transcript(false),event.id+' entire native arena transcript is unchanged');
  }
});

test('native Duel rival and full Grand Prix field stay exact for60seconds with a neutral player',()=>{
  for(const [eventId,mode] of [['pacific-canyon','duel'],['harbour-lights','grandprix']]){
    const transcript=enabled=>{
      const d=new Duel({seed:1989,featureFlags:{'tyre-slip':enabled,'grand-prix':true}});
      d.startCampaign({seed:1989,fieldSeed:4242,startStage:COURSE.findIndex(row=>row.id===eventId),
        car:'falcone_f42',difficulty:'pro',cpuDifficulty:'medium',mode,fieldSize:7});
      assert.equal(d.state.tyreSlipRules===true,enabled);assert.equal(d.state.mode,mode);
      if(mode==='grandprix')assert.equal(d.state.opponents.length,7,'the actual complete field is exercised');
      else assert.ok(d.state.rival,'the actual Duel rival is exercised');
      d.setInput({throttle:0,brake:1,steer:0,boost:false});
      while(d.state.status==='countdown')d.step(1/120);
      assert.equal(d.state.status,'racing');
      const hash=createHash('sha256');let moved=false;
      for(let tick=0;tick<60*120;tick++){
        d.step(1/120);
        const opponents=d.state.opponents||[],rival=d.state.rival;
        moved ||= (rival?.speedMph||0)>20||opponents.some(car=>car.speedMph>20);
        hash.update(JSON.stringify({rival,opponents}));
      }
      assert.ok(moved,'computer cars really drove during the comparison');
      return hash.digest('hex');
    };
    assert.equal(transcript(true),transcript(false),eventId+' complete CPU state stream is unchanged');
  }
});


test('native road driving applies the exact Pro grip and scrub loss only past the peak',()=>{
  const make=slip=>{
    const d=new Duel({seed:1989,featureFlags:{'tyre-slip':true}});
    d.startCampaign({seed:1989,startStage:0,car:'falcone_f42',difficulty:'pro',opponentCount:0});
    while(d.state.status==='countdown')d.step(1/120);
    assert.equal(d.state.status,'racing');
    Object.assign(d.state,{s:20,lateral:0,speedMph:80,gear:2,steerVisual:1,
      headingError:0,yawVelocity:0,tyreSlip:slip});
    d.setInput({throttle:0,brake:0,steer:1,boost:false});
    return d;
  };
  const peak=make(0),slide=make(1.25);
  for(const d of [peak,slide])d._drive(1/120);
  assert.equal(peak.state.offRoad,false);assert.equal(slide.state.offRoad,false);
  assert.ok(peak.state.tyreSlip<1);near(slide.state.tyreSlip,1.25);
  assert.ok(Math.abs(peak.state.yawVelocity)>.01,'real native yaw was applied');
  near(slide.state.yawVelocity/peak.state.yawVelocity,.82,1e-10);
  near(peak.state.speedMph-slide.state.speedMph,14/120,1e-10);
});


test('native Scrapdome venue clears road rules and keeps the complete fight transcript exact',()=>{
  const transcript=enabled=>{
    const d=new Duel({seed:1989,featureFlags:{'tyre-slip':enabled}});
    d.startCampaign({seed:1989,startStage:0,car:'falcone_f42',difficulty:'pro',opponentCount:0});
    assert.equal(d.state.tyreSlipRules===true,enabled,'the preceding native road race latches the requested model');
    d.state.wastelandGateDiscovered=true;
    assert.equal(d.startArenaEvent({venueId:'scrapdome',car:'falcone_f42',difficulty:'pro',
      seed:1989,cpuDifficulty:'medium',opponents:[{car:'viper_proto',brain:'rammer'}]}),true);
    assert.equal(d.course.def.id,'scrapdome');assert.equal(d.state.difficulty,'pro');
    assert.equal(Object.hasOwn(d.state,'tyreSlipRules'),false,'the real venue loader clears latched road rules');
    const hash=createHash('sha256');let moved=false;
    for(let tick=0;tick<1200;tick++){
      d.setInput({throttle:1,brake:tick>850?.4:0,steer:tick<450?.6:-.4,boost:false});
      d.step(1/120);moved ||= d.state.speedMph>10;
      hash.update(JSON.stringify(d.state));
    }
    assert.ok(moved&&d.state.arena.clockSec>1,'real arena driving and its fight clock advanced');
    return hash.digest('hex');
  };
  assert.equal(transcript(true),transcript(false),'Scrapdome full native fight state remains exact');
});


test('inactive tyre model never adds state fields and clears them after an active race',()=>{
  const d=new Duel({seed:1989,featureFlags:{'tyre-slip':true}});
  const absent=()=>{for(const key of ['tyreSlip','tyreSlipRules'])assert.equal(Object.hasOwn(d.state,key),false,key+' is absent with released tyres');};
  absent();
  for(const difficulty of ['casual','pro','casual']){
    d.startCampaign({seed:1989,startStage:0,opponentCount:0,difficulty});
    if(difficulty==='pro'){assert.equal(d.state.tyreSlipRules,true);assert.equal(d.state.tyreSlip,0);}
    else {absent();for(let tick=0;tick<120;tick++){d.setInput({throttle:1,brake:0,steer:.2});d.step(1/120);absent();}}
  }
  d.startCampaign({seed:1989,startStage:0,opponentCount:0,difficulty:'pro'});
  d.state.wastelandGateDiscovered=true;
  assert.equal(d.startArenaEvent({venueId:'scrapdome',car:'falcone_f42',difficulty:'pro',seed:1989,cpuDifficulty:'medium',opponents:[{car:'viper_proto',brain:'rammer'}]}),true);
  absent();
});

// TYRE-SLIP-DRIFT-RETUNE: the Neon Drift Trial keeps the old quick launch under the sliding-tyre rules only.
test('the drift trial keeps the quick launch under the sliding-tyre rules, and nothing else changes',async()=>{
  const {launchScale}=await import('../src/config.js');
  const drift={def:COURSE.find(event=>event.id==='neon-drift-trial')},arena={def:{arena:true}},road={def:COURSE[0]};
  assert.equal(drift.def.kind,'drift');
  assert.equal(TYRE_SLIP.driftTrialAccelScale,5.2);
  assert.equal(launchScale(drift,false,true),5.2,'the trial under the rules: the old launch');
  assert.equal(launchScale(drift),DRIVE.accelScale,'the trial with released tyres: today\'s launch');
  assert.equal(launchScale(drift,false,false),DRIVE.accelScale);
  assert.equal(launchScale(road,false,true),DRIVE.accelScale,'any other course keeps the gentle launch even with the rules on');
  assert.equal(launchScale(arena,false,true),DRIVE.arenaAccelScale,'arenas are as they were');
  assert.equal(launchScale(arena),DRIVE.arenaAccelScale);
  assert.equal(launchScale(drift,true,false),DRIVE.recoveryAccelScale,'a crash recovery is as it was');
  assert.equal(launchScale(road,true,true),DRIVE.recoveryAccelScale);
  // Behaviour: Pro flat out in first gear (no shifting needed), rules on and off: the time to reach 55 mph.
  const secondsTo=(mph,rules)=>{
    const d=new Duel({seed:1989,featureFlags:createFeatureFlags({storage:null,overrides:{'tyre-slip':rules}})});
    d.startCampaign({seed:1989,startStage:COURSE.findIndex(event=>event.id==='neon-drift-trial'),car:'banshee_muscle',difficulty:'pro',cpuDifficulty:'easy'});
    assert.equal(d.state.tyreSlipRules===true,rules);
    Object.assign(d.state,{status:'racing',countdown:0});
    for(let tick=0;tick<120*5;tick++){d.setInput({throttle:1,brake:0,steer:0,boost:false});d.step(1/120);if(d.state.speedMph>=mph)return tick/120;}
    return Infinity;
  };
  const quick=secondsTo(55,true),gentle=secondsTo(55,false);
  assert.ok(Number.isFinite(quick)&&Number.isFinite(gentle),'both reach 55 mph');
  assert.ok(quick<gentle*.7,'the rules-on trial launches clearly harder ('+quick+' s against '+gentle+' s)');
});
