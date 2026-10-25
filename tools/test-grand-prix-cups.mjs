import test from 'node:test';
import assert from 'node:assert/strict';
import {CUPS, CUP_POINTS, cupAvailability, cupStandings, normalizeCups,
  beginCup, recordCupRace, abandonCup, cupBonus} from '../src/grand-prix-cups.js';

const owner='player-1';
const courses=[...new Set(CUPS.flatMap(cup=>cup.events))].map(id=>({id}));
const admission={courses,owns:()=>true,enabled:true};
const options={id:'series-1',ownerId:owner,cupId:'mountain',cpuDifficulty:'medium',
  difficulty:'casual',car:'falcone_f42',fieldSeed:1989};
const start=(state={},extra={})=>beginCup(state,{...options,...extra},admission);
const order=(winner='player')=>[winner,...['player',...Array.from({length:7},(_,i)=>'gp-'+(i+1))].filter(id=>id!==winner)]
  .map((id,index)=>({id,position:index+1,name:id,you:id==='player'}));
const receipt=(round,extra={})=>({ownerId:owner,seriesId:'series-1',runId:'race-'+round,
  eventId:CUPS[0].events[round],stageIndex:round,cpuDifficulty:'medium',car:'falcone_f42',fieldSeed:1989,
  completed:true,qualifying:false,mode:'grandprix',field:order(),...extra});

test('approved immutable catalog, eight-place points and exact cup bonuses',()=>{
  assert.deepEqual(CUP_POINTS,[10,8,6,5,4,3,2,1]);
  assert.deepEqual(CUPS.map(cup=>cup.id),['mountain','night','winter','grand-tour']);
  assert.equal(Object.isFrozen(CUPS[0].events),true);
  for(const [difficulty,amount] of [['easy',900],['medium',1500],['hard',2250]]){
    assert.equal(cupBonus('mountain',difficulty),amount);
    assert.equal(cupBonus('grand-tour',difficulty),amount*2);
  }
  assert.equal(cupBonus('unknown','medium'),0);
  assert.equal(cupBonus('mountain','invalid'),0);
});
test('every actual course must be available and owned; Grand Tour needs each earlier cup',()=>{
  assert.equal(cupAvailability({},'mountain',admission).ok,true);
  for(const context of [{...admission,enabled:false},{...admission,courses:courses.slice(1)},
    {...admission,owns:()=>false}])assert.equal(cupAvailability({},'mountain',context).ok,false);
  assert.equal(cupAvailability({},'grand-tour',admission).ok,false);
  const trophies=['mountain:easy','night:hard','winter:medium'];
  assert.equal(cupAvailability({version:1,trophies},'grand-tour',admission).ok,true);
});
test('cup state is optional, bounded and validates identities and sequential results',()=>{
  assert.deepEqual(normalizeCups(null),{version:1,trophies:[],settled:[],active:null});
  const begun=start();assert.equal(begun.ok,true);assert.equal(begun.cups.active.results.length,0);
  const first=recordCupRace(begun.cups,receipt(0));assert.equal(first.recorded,true);
  const loaded=normalizeCups(JSON.parse(JSON.stringify(first.cups)));
  assert.deepEqual(loaded,first.cups);
  assert.equal(recordCupRace(loaded,receipt(0)).recorded,false);
  assert.equal(recordCupRace(loaded,receipt(2)).recorded,false);
  assert.equal(start(loaded).ok,false,'starting another cup never discards a saved run');
  const malformed=structuredClone(loaded);malformed.active.results[0].field[1].position=1;
  assert.equal(normalizeCups(malformed).active,null,'malformed classifications cannot reach banking');
});
test('only a current owned native eight-car result advances a cup',()=>{
  const state=start().cups;
  for(const extra of [{ownerId:'other'},{seriesId:'other'},{eventId:'neon-docks'},
    {mode:'duel'},{qualifying:true},{completed:false},{car:'viper_proto'},
    {cpuDifficulty:'easy'},{fieldSeed:5},{field:order().slice(1)},
    {field:order().map(row=>({...row,id:'player'}))},
    {field:order().map(row=>({...row,position:1}))},{runId:''}]){
    const result=recordCupRace(state,receipt(0,extra));
    assert.equal(result.recorded,false,JSON.stringify(extra));assert.equal(result.cups,state);
  }
  const result=recordCupRace(state,receipt(0));assert.equal(result.recorded,true);
  assert.equal(result.cups.active.results.length,1);assert.equal(state.active.results.length,0);
});
test('points, countback and final race finish order break ties with no shared place',()=>{
  const rows=cupStandings([order(),order('gp-1')]);
  assert.equal(rows[0].id,'gp-1','equal wins and points: final race wins');
  assert.equal(rows[0].points,18);assert.equal(rows[1].points,18);
  assert.deepEqual(rows.map(row=>row.position),[1,2,3,4,5,6,7,8]);
  const all=[order(),order(),order()];assert.equal(cupStandings(all)[0].points,30);
});
test('a final race produces a settlement request, and abandon never awards a trophy',()=>{
  let state=start().cups;
  for(let round=0;round<3;round++){
    const result=recordCupRace(state,receipt(round));assert.equal(result.recorded,true);
    assert.equal(result.finished,round===2);state=result.cups;
  }
  assert.equal(state.active.results.length,3);
  assert.deepEqual(state.trophies,[],'banking remains progression-owned');
  const abandoned=abandonCup(state,owner);assert.equal(abandoned.active,null);
  assert.deepEqual(abandoned.trophies,[]);
  assert.equal(abandonCup(state,'other'),state);
});


test('cup banking is per owner/run/difficulty, after every race, with a wallet ceiling',async()=>{
  const {createProfile,normalizeProfile,settleCup}=await import('../src/progression.js');
  assert.equal(Object.hasOwn(normalizeProfile(createProfile()),'cups'),false,'old saves gain no field');
  const future={version:9,opaque:{keep:true}};
  assert.deepEqual(normalizeProfile({...createProfile(),cups:future}).cups,future);
  let cups=start().cups;
  for(let round=0;round<3;round++)cups=recordCupRace(cups,receipt(round)).cups;
  const history=cups.active.results.map((result,index)=>({key:result.runId+':'+index,eventId:result.eventId,
    car:options.car,cpuDifficulty:'medium',completed:true,won:true,reward:1000}));
  const profile={...createProfile(),cups,credits:100,history,settledResults:history.map(row=>row.key)};
  const request={seriesId:options.id,ownerId:owner,activePlayerId:owner};
  for(const bad of [{...request,ownerId:'other'},{...request,activePlayerId:'other'},
    {...request,seriesId:'other'}])assert.equal(settleCup(profile,bad).profile,profile);
  assert.equal(settleCup({...profile,settledResults:[]},request).settled,false);
  const paid=settleCup(profile,request);assert.equal(paid.reward,1500);
  assert.equal(paid.profile.credits,1600);assert.deepEqual(paid.profile.cups.trophies,['mountain:medium']);
  assert.equal(paid.profile.history.at(-1).key,'cup:series-1');assert.equal(paid.profile.cups.active,null);
  assert.equal(settleCup(paid.profile,request).profile,paid.profile);
  const repeat=settleCup({...profile,cups:{...cups,trophies:['mountain:medium']}},request);
  assert.equal(repeat.reward,0);assert.equal(repeat.settled,true);
  const ceiling=settleCup({...profile,credits:999999990},request);
  assert.equal(ceiling.reward,10);assert.equal(ceiling.profile.credits,1_000_000_000);
});


test('cup controls and trophies respect the preview switch and escape player-facing rows',async()=>{
  const {cupsPanel,trophyCase}=await import('../src/screen-trophies.js');
  const {courseScreen,createCourseActions}=await import('../src/screen-courses.js');
  assert.equal(trophyCase({cups:{version:1,trophies:['mountain:medium']}}),'');
  assert.ok(trophyCase({cups:{version:1,trophies:['mountain:medium']}},{enabled:true}).includes('Mountain Cup · Medium · WON'));
  assert.equal(cupsPanel({},{enabled:false}),'');
  assert.ok(!courseScreen({},0,'',{}).includes('data-cup-start'));
  const panel=cupsPanel({},{...admission,enabled:true,playerId:owner});
  assert.ok(panel.includes('data-cup-start="mountain"'));
  let calls=0,message='';
  const actions=createCourseActions({app:{duel:{state:{status:'menu'}},startCup(){calls++;return {ok:false,reason:'Locked'};}},
    choices:{},setMessage(value){message=value;},setOpen(){},updateMenuScene(){},invalidate(){},renderState(){},careerEnabled:()=>false});
  actions.handle({dataset:{cupStart:'mountain'}});assert.equal(calls,0);
  assert.equal(message,'');
});

test('native App cup admission and saved continuation do not bypass car transport or ownership',async()=>{
  const {withReferenceApp}=await import('./build-reference-laps.mjs');
  const {createFeatureFlags}=await import('../src/feature-flags.js');
  const {COURSE}=await import('../src/config.js');
  const {ALL_CIRCUITS}=await import('../src/circuits/index.js');
  const before=[...COURSE];
  try{
    for(const id of CUPS[0].events)if(!COURSE.some(row=>row.id===id))COURSE.push(ALL_CIRCUITS.find(row=>row.id===id));
    await withReferenceApp(async app=>{
      app.duel.featureFlags=createFeatureFlags({storage:null,qa:false});
      assert.equal(app.startCup('mountain').ok,false,'off in production');
      app.duel.featureFlags=createFeatureFlags({storage:null,qa:true,search:'?flags=grand-prix-career,summit-run'});
      assert.equal(app.startCup('mountain').ok,false,'unowned courses remain locked');
      app.profile={...app.profile,credits:20000};app._saveProfile();
      for(const id of CUPS[0].events)assert.equal(app.purchaseCourse(id).ok,true);
      app.setRaceSettings({car:'stuttgart_959s',cpuDifficulty:'medium',difficulty:'casual'});
      assert.equal(app.startCup('mountain').ok,true);
      const active=app.profile.cups.active;assert.equal(active.ownerId,app.player.id);
      assert.equal(app.getRaceChoices().mode,'grandprix');
      assert.equal(COURSE[app.menuStage].id,'tremblant-woods');
      assert.equal(app.startCup('night').ok,false);
      assert.equal(app.abandonCup().ok,true);assert.equal(app.profile.cups.active,null);
      app.profile={...app.profile,unlockedCars:[...app.profile.unlockedCars,'koenigsegg_jesko']};app._saveProfile();
      app.setRaceSettings({car:'koenigsegg_jesko'});
      assert.equal(app.getRaceChoices().car,'koenigsegg_jesko');
      app.profile={...app.profile,heli:{version:1,carsAt:{koenigsegg_jesko:'panorama-ridge'}}};app._saveProfile();
      assert.equal(app.startCup('mountain').ok,true,'the Jesko enters the owned Mountain Cup away from its saved position');
      assert.equal(app.profile.cups.active.car,'koenigsegg_jesko');
      assert.equal(app.abandonCup().ok,true);
      app.profile={...app.profile,unlockedCars:[...app.profile.unlockedCars,'ferrari_enzo']};app._saveProfile();
      app.setRaceSettings({car:'ferrari_enzo'});
      const refusal=app.startCup('night');assert.equal(refusal.ok,false);
      assert.match(refusal.reason,/travels only by air/);
      assert.equal(app.profile.cups.active,null,'unlocking a medal car cannot place it at Harbour');
    });
  }finally{COURSE.splice(0,COURSE.length,...before);}
});


test('a complete real eight-car Mountain Cup advances and banks only actual native classifications',async()=>{
  const {withReferenceApp}=await import('./build-reference-laps.mjs');
  const {createFeatureFlags}=await import('../src/feature-flags.js');
  const {COURSE}=await import('../src/config.js');
  const {ALL_CIRCUITS}=await import('../src/circuits/index.js');
  const {useRacingLine}=await import('./track-script-drive.mjs');
  const before=[...COURSE];
  try{
    for(const id of CUPS[0].events)if(!COURSE.some(row=>row.id===id))COURSE.push(ALL_CIRCUITS.find(row=>row.id===id));
    await withReferenceApp(async initial=>{
      let app=initial;
      try {
      app.duel.featureFlags=createFeatureFlags({storage:null,qa:true,search:'?flags=grand-prix-career,summit-run'});
      app.profile={...app.profile,credits:20000};app._saveProfile();
      for(const id of CUPS[0].events)assert.equal(app.purchaseCourse(id).ok,true);
      app.setRaceSettings({car:'stuttgart_959s',cpuDifficulty:'easy',difficulty:'casual'});
      const originalRandom=Math.random;let started;
      try {Math.random=()=>1000/4294967296;started=app.startCup('mountain');}
      finally {Math.random=originalRandom;}
      assert.equal(started.ok,true);
      const seriesId=app.profile.cups.active.id,ownerId=app.player.id,fieldSeed=app.profile.cups.active.fieldSeed;
      assert.equal(fieldSeed,1000,'the acceptance uses a repeatable actual field seed');
      const fields=[];
      for(let round=0;round<3;round++){
        if(round){app.returnToMenu();assert.equal(app.prepareCupRace().ok,true);}
        app.setLapChoice(1);
        assert.equal(app.startCampaign({...app.getRaceChoices()}),true);
        assert.equal(app.duel.state.mode,'grandprix');assert.equal(app.duel.state.field.size,8);
        assert.equal(app.duel.state.fieldSeed,fieldSeed);assert.equal(app._cupRace.seriesId,seriesId);
        assert.equal(app.duel.course.def.id,CUPS[0].events[round]);
        useRacingLine(app,.95);app.autopilot=true;app._scriptedCrashDone=true;
        const state=app.duel.state;
        for(let step=0;step<900*60&&['countdown','racing','ticket','crash'].includes(state.status);step++)app.advance(1/60,1/60);
        assert.equal(state.status,'stage_result','the real player must finish this course');
        assert.equal(state.results.completed,true);assert.equal(state.results.field.length,8);
        const {createResultsScreen}=await import('../src/screen-results.js');
        const resultScreen=createResultsScreen({app,profile:()=>app.profile,credits:String,escapeHTML:String,time:String,arrow:''});
        const markup=resultScreen(state);assert.match(markup,/MOUNTAIN CUP/);
        assert.equal(state.results.cupSummary.rounds,round+1);
        if(round===2)assert.match(markup,/FINAL CUP STANDINGS/);
        fields.push(state.results.field.map(row=>({id:row.id,position:row.position,name:row.name,you:row.you})));
        if(round<2){
          assert.equal(app.profile.cups.active.results.length,round+1);
          assert.deepEqual(app.profile.cups.active.results[round].field,fields[round].sort((a,b)=>a.position-b.position));
          if(round===0){
            const saved=JSON.stringify(app.profile.cups);
            app=new initial.constructor();
            app.duel.featureFlags=createFeatureFlags({storage:null,qa:true,search:'?flags=grand-prix-career,summit-run'});
            assert.equal(JSON.stringify(app.profile.cups),saved,'real App reload retains the series and first classification');
            assert.equal(app.profile.cups.active.id,seriesId);assert.equal(app.profile.cups.active.fieldSeed,fieldSeed);
            const other=app.addPlayer('Cup Guest');assert.equal(other.ok,true);
            assert.notEqual(app.player.id,ownerId);assert.equal(Object.hasOwn(app.profile,'cups'),false);
            const wallet=app.profile.credits;
            assert.equal(app.prepareCupRace().ok,false);assert.equal(app.profile.credits,wallet);
            assert.equal(app.selectPlayer(ownerId),true);assert.equal(JSON.stringify(app.profile.cups),saved);
          }
        }else{
          assert.equal(app.profile.cups.active,null);assert.ok(app.profile.cups.settled.includes(seriesId));
          assert.deepEqual(state.results.cupStandings,cupStandings(fields));
          const cupRow=app.profile.history.find(row=>row.key==='cup:'+seriesId);
          assert.ok(cupRow);assert.equal(cupRow.won,cupStandings(fields)[0].you);
          assert.equal(cupRow.reward,cupRow.won?900:0);
          const snapshot=JSON.stringify(app.profile);app._settleResult(state.results,state);
          assert.equal(JSON.stringify(app.profile),snapshot,'replayed finish cannot bank or advance twice');
        }
      }
      assert.equal(ownerId,app.player.id);
      } finally {if(app!==initial)app.dispose();}
    });
  }finally{COURSE.splice(0,COURSE.length,...before);}
});


test('a saved cup survives more than sixty unrelated races and moved menu positions',async()=>{
  const {createProfile,settleCup}=await import('../src/progression.js');
  let cups=start().cups;
  for(let round=0;round<3;round++)cups=recordCupRace(cups,receipt(round,{stageIndex:80+round})).cups;
  const keys=cups.active.results.map((result,index)=>result.runId+':'+(80+index));
  const history=Array.from({length:60},(_,index)=>({key:'ordinary-'+index+':0',eventId:'pacific-canyon',
    won:false,completed:true,reward:100,car:'falcone_f42',cpuDifficulty:'easy'}));
  const profile={...createProfile(),credits:100,cups,history,settledResults:[...keys,...history.map(row=>row.key)]};
  const paid=settleCup(profile,{seriesId:options.id,ownerId:owner,activePlayerId:owner});
  assert.equal(paid.settled,true,'the permanent race settlement receipts survive the short history');
  assert.equal(paid.reward,1500);assert.equal(paid.profile.cups.active,null);
});


test('future cup schemas remain opaque to App while ordinary races still start',async()=>{
  const {withReferenceApp}=await import('./build-reference-laps.mjs');
  const {createFeatureFlags}=await import('../src/feature-flags.js');
  await withReferenceApp(async app=>{
    app.duel.featureFlags=createFeatureFlags({storage:null,qa:true,search:'?flags=grand-prix-career'});
    const future={version:9,active:{ownerId:app.player.id,cupId:'mountain'},opaque:'retain'};
    app.profile={...app.profile,cups:future};app._saveProfile();
    assert.equal(app.prepareCupRace().ok,false);
    assert.equal(app.abandonCup().ok,false);
    assert.equal(app.startCampaign({startStage:0,mode:'grandprix',car:'falcone_f42',fieldSeed:1000}),true);
    assert.equal(app._cupRace,null);assert.deepEqual(app.profile.cups,future);
  });
});


test('the result screen presents actual cup progress, placing and separately paid bonus only when enabled',async()=>{
  const {cupResultPanel}=await import('../src/screen-trophies.js');
  assert.equal(typeof cupResultPanel,'function');
  const result={cupSummary:{id:'mountain',rounds:3,total:3,finished:true,standings:cupStandings([order(),order(),order()]),bonus:900,trophy:'mountain:easy'}};
  assert.equal(cupResultPanel(result,{}),'');
  const markup=cupResultPanel(result,{enabled:true});
  assert.match(markup,/MOUNTAIN CUP/);assert.match(markup,/30 points/);assert.match(markup,/CUP BONUS \+900 CR/);
  assert.match(markup,/TROPHY EARNED/);assert.equal(cupResultPanel({},{enabled:true}),'');
  const partial=cupResultPanel({cupSummary:{...result.cupSummary,rounds:1,finished:false,bonus:0,trophy:null}},{enabled:true});
  assert.match(partial,/1 \/ 3 races complete/);assert.match(partial,/Courses/);assert.ok(!partial.includes('TROPHY EARNED'));
});
