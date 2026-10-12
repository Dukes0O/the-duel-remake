import assert from 'node:assert/strict';
import { racingLineFor } from '../src/race-lines.js';
import {TELEMETRY_KEY,MAX_TELEMETRY_BYTES,telemetryKey} from '../src/lap-telemetry.js';
import { COURSE } from '../src/config.js';
import { Duel } from '../src/game.js';
import { gridPose, FIELD_TUNING } from '../src/race-field.js';
import { beginQualifying, applyQualifyingGrid, finishQualifying, qualifyingGrid } from '../src/qualifying.js';

const start = (qualifying, extra = {}) => {
  const duel = new Duel({seed: 1989, featureFlags: {'grand-prix': true}});
  duel.startCampaign({mode: 'grandprix', car: 'falcone_f42', difficulty: 'casual',
    cpuDifficulty: 'medium', fieldSeed: 444, startStage: 0, qualifying, ...extra});
  return duel;
};
const fingerprint = d => JSON.stringify([d.state.s, d.state.lateral, d.state.field,
  d.state.opponents, d.state.countdown]);
const omitted = start(undefined), skipped = start(false);
assert.equal(fingerprint(omitted), fingerprint(skipped), 'skip and omitted preserve the exact default field');
const off = start(true, {mode:'duel'});
assert.equal(off.state.qualifying, undefined, 'ordinary races ignore qualifying');
const duel = start(true);
assert.equal(duel.state.qualifying.phase, 'driving');
assert.equal(duel.state.lapsTotal, 2);
assert.equal(duel.state.opponents.length, 0, 'player drives alone');
assert.equal(duel.state.traffic.length, 0);
assert.equal(duel.state.field, undefined, 'race field cannot act during qualifying');
assert.equal(duel.state.police.pursuit, null);
assert.equal(duel.state.combat, null);
assert.equal(duel.state.speedMph, 80 / 1.609344, 'qualifying starts moving at 80 km/h');
assert.equal(duel.course.length-duel.state.s,6,'no-pit start reaches the line without a warm-up lap');
assert.equal(duel.state.lateral,racingLineFor(duel.course).offsetAt(duel.state.s),'no-pit start follows the actual racing line');
assert.equal(duel.state.status, 'racing', 'no standing countdown');
const pitStart = start(false);
pitStart.course.pitLane = {exit: 123};
pitStart.state.qualifying = {phase:'pending'};
assert.equal(beginQualifying(pitStart),true);
assert.equal(pitStart.state.s,123,'authored pit exit supplies the real start pose');
assert.equal(pitStart.state.qualifying.timing,'approach');
const cpu = duel.state.qualifying.computerTimes;
assert.equal(cpu.length, 7);
assert.ok(cpu.every(row => Number.isFinite(row.timeSec) && row.timeSec > 0));
assert.deepEqual(cpu, start(true).state.qualifying.computerTimes, 'CPU times repeat from the same seed');
assert.notDeepEqual(cpu, start(true, {fieldSeed:445}).state.qualifying.computerTimes, 'CPU skill seed changes their times');
assert.equal(qualifyingGrid(1, cpu).find(row=>row.you).slot, 0, 'fast lap earns pole');
assert.equal(qualifyingGrid(1e6, cpu).find(row=>row.you).slot, 7, 'slow lap earns last');
const tied = qualifyingGrid(cpu[0].timeSec, [cpu[0]]);
assert.equal(tied.find(row=>row.you).slot, 1, 'CPU wins an exact tie');
const events = [];
duel.onChange((state,event)=>events.push(event));
assert.equal(finishQualifying(duel), false, 'session cannot finish without two completed laps');
// These values stand for two genuine lap-timer outputs. Native inputs are tested below.
duel.state.qualifying.timing = 'timed';
duel.state.completedLaps = 2;
duel.state.lapTimes = [100, 1];
duel.state.assistedLaps = [false, false];
duel.state.damageZones.front = 80;
duel.state.majorCrashes = 4;
duel.state.score = 99;
assert.equal(finishQualifying(duel), true);
assert.equal(duel.state.qualifying.phase, 'complete');
assert.equal(duel.state.qualifying.bestLapSec, 1);
assert.equal(duel.state.qualifying.practiceLaps, 2);
assert.equal(duel.state.field.playerSlot, 0);
assert.equal(duel.state.status, 'countdown');
assert.equal(duel.state.lapsTotal, 3);
assert.equal(duel.state.completedLaps, 0);
assert.equal(duel.state.stageTimeSec, 0);
assert.equal(duel.state.score, 0);
assert.equal(duel.state.majorCrashes, 0);
assert.equal(duel.state.damageZones.front, 0);
assert.equal(duel.state.opponents.length, 7);
assert.deepEqual([duel.state.s,duel.state.lateral], [gridPose(0).s,gridPose(0).lateral]);
const positions = [duel.state, ...duel.state.opponents].map(r=>`${r.s}:${r.lateral}`);
assert.equal(new Set(positions).size, 8, 'all qualified grid positions are unique');
// The earned order keeps the authored field's opening safety setback.
duel.state.s = gridPose(duel.state.field.playerSlot).s-400;
assert.equal(applyQualifyingGrid(duel), true);
for (const row of duel.state.qualifying.grid) {
  const actor = row.you ? duel.state : duel.state.opponents.find(racer=>racer.id===row.id);
  assert.equal(actor.s, gridPose(row.slot).s-400, 'earned slot preserves the course setback');
  assert.equal(actor.prevS, actor.s, 'earned grid has no artificial position jump');
}
assert.ok(events.some(event=>event.qualifyingComplete));
assert.ok(!events.some(event=>event.stageResult), 'qualifying never pays a race result');
assert.equal(finishQualifying(duel), false, 'session finishes once');
const assisted = start(true);
assisted.state.qualifying.timing = 'timed';
assisted.state.completedLaps = 2;
assisted.state.lapTimes = [1, 150];
assisted.state.assistedLaps = [true, false];
finishQualifying(assisted);
assert.equal(assisted.state.qualifying.bestLapSec,150,'assisted fastest lap is excluded');
const invalid = start(true);
invalid.state.qualifying.timing = 'timed';
invalid.state.completedLaps=2;
invalid.state.lapTimes=[1,2];
invalid.state.assistedLaps=[true,true];
finishQualifying(invalid);
assert.equal(invalid.state.qualifying.bestLapSec,null);
assert.equal(invalid.state.field.playerSlot, FIELD_TUNING.medium.playerSlot);
assert.equal(fingerprint(start(false)), fingerprint(start(false)), 'default start repeats');
const flagOff = new Duel({seed:1989,featureFlags:{'grand-prix':false}});
flagOff.startCampaign({mode:'grandprix',qualifying:true});
assert.equal(flagOff.state.qualifying,undefined,'feature-off start cannot enter qualifying');
const small = start(true,{fieldSize:1});
assert.equal(small.state.qualifying.computerTimes.length,1);
small.state.qualifying.timing='timed';
small.state.completedLaps=2;small.state.lapTimes=[1,2];small.state.assistedLaps=[false,false];
finishQualifying(small);
assert.equal(small.state.opponents.length,1,'smaller field size survives the real race reload');
assert.equal(small.state.field.size,2);
// A genuine open-course definition cannot request two flying laps.
const originalCourse=COURSE[0];
try {
  COURSE[0]={...originalCourse,closed:false,grandPrixLaps:1};
  const open=start(true);
  assert.equal(open.state.qualifying,undefined,'one point-to-point run skips closed-circuit qualifying');
  assert.equal(open.state.lapsTotal,1);
} finally { COURSE[0]=originalCourse; }
console.log('Qualifying session, deterministic grid and skip checks passed.');

// The actual choice helper is off by default and updates the start options.
const {syncQualifyingChoice} = await import('../src/race-settings-ui.js');
const buttons = ['skip','drive'].map(value=>({dataset:{qualifying:value},disabled:false,
  pressed:null,on:null, classList:{toggle(name,on){this.owner.on=on;}},
  setAttribute(name,value){if(name==='aria-pressed')this.pressed=value;},
  addEventListener(type,handler){this.click=handler;}}));
for(const button of buttons)button.classList.owner=button;
const group = {hidden:true,querySelectorAll:()=>buttons}, modeButton = {hidden:false};
const root = {querySelector:selector=>selector==='#qualifying-choice'?group:modeButton};
const choices = {mode:'grandprix'};
syncQualifyingChoice(root,choices);
assert.equal(group.hidden,false);
assert.equal(buttons[0].pressed,'true','skip is visibly selected by default');
buttons[1].click();
assert.equal(choices.qualifying,true,'the native menu option requests a qualifying session');
assert.equal(buttons[1].pressed,'true');
buttons[0].click();
assert.equal(choices.qualifying,false,'Skip requests the exact normal grid');
syncQualifyingChoice(root,choices,{closed:false});
assert.equal(group.hidden,true,'open course never offers flying laps');
assert.equal(choices.qualifying,false);
syncQualifyingChoice(root,choices,{closed:true});
buttons[1].click();assert.equal(choices.qualifying,true,'button uses the current closed-course context');
choices.mode='duel';syncQualifyingChoice(root,choices);
assert.equal(group.hidden,true);
assert.ok(buttons.every(button=>button.disabled));
buttons[1].click();assert.equal(choices.qualifying,false,'hidden qualifying choices cannot opt in');

// Drive the session through real App inputs, physics and circuit checkpoints.
// All storage is in memory; no helper edits race positions or lap counters.
const {App} = await import('../src/app.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');
const previousStorage = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
const previousCancel = Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
try {
  const rows = new Map();let denyTelemetry=false;
  globalThis.localStorage = {getItem:key=>rows.get(key)??null,
    setItem:(key,value)=>{if(denyTelemetry&&key===TELEMETRY_KEY)throw Error('Synthetic quota denial');rows.set(key,String(value));}, removeItem:key=>rows.delete(key)};
  globalThis.cancelAnimationFrame ??= () => {};
  const app = new App();
  try {
    app.duel.featureFlags = createFeatureFlags({storage:null,qa:false,search:'',overrides:{'grand-prix':true,'grand-prix-career':true}});
    assert.equal(app.startCampaign({mode:'grandprix',qualifying:true,seed:1989,fieldSeed:444,
      startStage:0,car:'falcone_f42',cpuDifficulty:'medium',difficulty:'casual'}),true);
    const state = app.duel.state, nativeEvents = [];
    const startingCredits = app.profile.credits;
    const timedRecords=[];
    app.duel.onChange((s,event)=>{
      nativeEvents.push(event);
      if(event.qualifyingLap)timedRecords.push(JSON.parse(rows.get(TELEMETRY_KEY)||'{"laps":[]}'));
    });
    app.autopilot = true;
    app._scriptedCrashDone = true;
    let frames = 0;
    while (state.qualifying.phase === 'driving' && frames++ < 60*600) {
      app.advance(1/60,1/60);
      assert.equal(state.opponents.length, state.qualifying.phase==='complete'?7:0);
    }
    assert.equal(state.qualifying.phase,'complete','real inputs finish the two flying laps');
    assert.equal(state.qualifying.lapTimes.length,2);
    assert.equal(nativeEvents.filter(event=>event.qualifyingFlyingStart).length,1,'one native line crossing arms the session');
    assert.equal(nativeEvents.filter(event=>event.qualifyingLap).length,2,'only the two timed laps count as practice');
    assert.equal(state.qualifying.practiceLaps,2);
    assert.ok(state.qualifying.lapTimes.every(time=>time>20));
    assert.equal(state.status,'countdown','automatic restart reaches actual GP lights');
    assert.equal(state.stageTimeSec,0);
    assert.equal(state.completedLaps,0);
    assert.equal(app.profile.credits,startingCredits,'practice cannot pay or charge credits');
    assert.ok(!nativeEvents.some(event=>event.stageResult));
    const saved=JSON.parse(rows.get('the-duel-lap-telemetry-v1')||'{"laps":[]}');
    assert.equal(saved.laps.length,1,'two qualifying laps retain exactly one best telemetry record');
    assert.equal(saved.laps[0].lapMs,Math.round(Math.min(...state.qualifying.lapTimes)*1000),'the clean second flying lap can replace the first');
    assert.equal(saved.laps[0].playerId,app.player.id);
    assert.equal(saved.laps[0].eventId,'pacific-canyon');
    assert.equal(saved.laps[0].route,'route_a');
    assert.equal(saved.laps[0].controls[0][0],0,'record starts at the native arming crossing');
    assert.equal(saved.laps[0].controls.at(-1)[0],saved.laps[0].lapMs);
    assert.equal(timedRecords.length,2,'each native timed finish reaches telemetry before reload');
    assert.equal(timedRecords[0].laps.length,1);assert.equal(timedRecords[1].laps.length,1);
    assert.equal(timedRecords[0].laps[0].lapMs,Math.round(state.qualifying.lapTimes[0]*1000));
    assert.equal(timedRecords[1].laps[0].lapMs,saved.laps[0].lapMs);
    assert.ok(new TextEncoder().encode(rows.get(TELEMETRY_KEY)).length<=MAX_TELEMETRY_BYTES);
    assert.ok(app.grandPrixLapRecorder,'earned actual GP initializes its independent ghost recorder');
    // Synthetic historical contexts retain a fully validated native record's
    // shape. Their bytes must survive another driver's qualifying quota denial.
    for(const patch of [{playerId:'prior-driver',playerName:'Prior Driver'},
      {eventId:'high-country'},{route:'route_b',seed:42}]){
      const record={...structuredClone(saved.laps[0]),...patch};record.key=telemetryKey(record);
      assert.equal(app.lapTelemetry.record(record).saved,true);
    }
    const priorBytes=rows.get(TELEMETRY_KEY);
    app.returnToMenu();app.addPlayer('Second Driver');denyTelemetry=true;
    const secondPlayer=app.player.id;
    app.startCampaign({mode:'grandprix',qualifying:true,seed:1989,fieldSeed:444,
      startStage:0,car:'falcone_f42',cpuDifficulty:'medium',difficulty:'casual'});
    app.autopilot=true;app._scriptedCrashDone=true;let secondFrames=0;
    while(state.qualifying.phase==='driving'&&secondFrames++<60*600)app.advance(1/60,1/60);
    assert.equal(state.qualifying.phase,'complete');assert.equal(state.qualifying.practiceLaps,2);
    assert.equal(rows.get(TELEMETRY_KEY),priorBytes,'quota denial preserves every prior event/route/player byte');
    const session=app.getLapTelemetry({eventId:'pacific-canyon',route:'route_a'});
    assert.equal(session.status,'session-only');assert.equal(session.lap.playerId,secondPlayer);
    assert.equal(session.lap.lapMs,Math.round(Math.min(...state.qualifying.lapTimes)*1000));
    assert.equal(app.lapTelemetry.session.size,1,'quota retains one best session candidate');
    assert.equal(app.getLapTelemetry({eventId:'high-country',route:'route_a'}).lap,null);
    assert.equal(app.getLapTelemetry({eventId:'pacific-canyon',route:'route_b'}).lap,null);
    console.log(`Native qualifying: ${state.qualifying.lapTimes.join(', ')} s, grid ${state.field.playerSlot+1}, ${frames} steps.`);
  } finally { app.dispose(); }
} finally {
  if (previousStorage) Object.defineProperty(globalThis,'localStorage',previousStorage);
  else delete globalThis.localStorage;
  if (previousCancel) Object.defineProperty(globalThis,'cancelAnimationFrame',previousCancel);
  else delete globalThis.cancelAnimationFrame;
}
