import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {COURSE,DRIVE,steerForYaw} from '../src/config.js';
import {RouteMap} from '../src/route-map.js';
import {createHudScreen} from '../src/screen-hud.js';
import {createResultsScreen} from '../src/screen-results.js';
import {useRacingLine} from './track-script-drive.mjs';
import {isSummitAttack} from '../src/summit-attack.js';
import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import {heliOf} from '../src/heli/heli-save.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
globalThis.cancelAnimationFrame ??= () => {};
// The stock demo driver (src/app.js) looks only 220 m ahead, so it cannot brake in time for Casino Corner at the end of Harbour Lights'
// long straight or for the 9 m Lantern Hairpin (RELEASE-HARBOUR). That course is driven with the racing-line driver the circuit tests use.
// Summit uses the same line driver and winter tires as its accepted native run.
// Harbour Lights Dusk is the same road as Harbour Lights; Panorama Ridge Reverse is the stock driver's crash-out (VARIANTS-RELEASE).
const racingLineDriven = new Set(['harbour-lights', 'harbour-lights-dusk', 'panorama-ridge-reverse', 'summit-run', 'summit-time-attack']);

function crossCircuit(duel, actor) {
  const {course, raceLength} = duel;
  for (let lap = 0; lap < duel.state.lapsTotal; lap++) {
    for (const gate of [...duel._lapGates, course.length]) {
      const crossing = lap * course.length + gate;
      actor.prevS = crossing - .1;
      actor.s = crossing + .1;
      actor.prevLateral = actor.lateral = 0;
      actor.speedMph = 120;
      duel._advanceLaps(actor, 1 / 120);
    }
  }
  check(actor.completedLaps === duel.state.lapsTotal && actor.s >= raceLength,
    `${course.def.id}: scripted racer crosses each real lap gate`);
}

for (const [stageIndex, stage] of COURSE.entries()) {
  const duel = new Duel({seed: 9203 + stageIndex});
  duel.startCampaign({startStage: stageIndex, cpuDifficulty: 'hard', opponentCount: 3});
  const state = duel.state;
  if (stage.practice) {
    check(state.opponents.length === 0 && state.rival === null,
      `${stage.id}: untimed practice still has no opponents or finish line`);
    continue;
  }
  if (isSummitAttack(stage)) {
    check(state.mode === 'timetrial' && state.lapsTotal === 1 && state.opponents.length === 0 && state.rival === null,
      `${stage.id}: a three-opponent request still starts the required solo Attack`);
    state.status = 'racing';
    for (let frame = 0; frame < 10; frame++) duel.step(1 / 120);
    check(state.opponents.length === 0 && state.traffic.length === 0 && !state.field,
      `${stage.id}: fixed steps never spawn a rival, traffic or field`);
    state.stageTimeSec = stage.attackTimes.gold; state.racePenaltySec = 0;
    crossCircuit(duel, state);
    check(duel._finishStage() === true && state.results.completed === true && state.results.medal === 'gold' && state.results.won === true,
      `${stage.id}: real gate completion gives the timed medal result`);
    check(state.results.beatRival === null && state.results.opponentCount === undefined && state.results.position === undefined,
      `${stage.id}: solo finish has no invented rival or field ranking`);
    continue;
  }
  check(state.opponents.length === 3 && state.rival === state.opponents[0],
    `${stage.id}: first opponent is the legacy rival alias`);
  check(new Set(state.opponents).size === 3,
    `${stage.id}: opponents have separate actor state`);
  state.status = 'racing';
  state.traffic = [];
  for (let frame = 0; frame < 10; frame++) duel.step(1 / 120);
  check(state.opponents.every(actor => Number.isFinite(actor.s) && Number.isFinite(actor.lateral)),
    `${stage.id}: every opponent advances in the fixed-step race`);
  if (duel._npcRoutePlanner) check(state.opponents.every(actor => duel._npcRoutePlanner.actors.has(actor)),
    `${stage.id}: each opponent has separate route decisions`);

  for (const opponent of state.opponents) crossCircuit(duel, opponent);
  state.stageTimeSec = Math.min(60, (state.timeLimitSec || 120) / 2);
  state.racePenaltySec = 0;
  state.opponents[0].finishTime = null;
  state.opponents[1].finishTime = state.stageTimeSec - 10;
  state.opponents[2].finishTime = state.stageTimeSec - 5;
  crossCircuit(duel, state);
  check(duel._finishStage() === true && state.results.completed === true,
    `${stage.id}: three-opponent race reaches a valid result`);
  check(state.results.opponentCount === 3 && state.results.position === 3,
    `${stage.id}: results rank the player against every opponent`);
  if (stage.hasRival && !stage.stuntTrial && !stage.kind)
    check(state.results.beatRival === true && state.results.beatAllOpponents === false && state.results.won === false,
      `${stage.id}: beating the first rival does not win against the full field`);
}

const single = new Duel({seed: 221});
single.startCampaign({opponentCount: 1});
check(single.state.opponents.length === 1 && single.state.rival === single.state.opponents[0],
  'ordinary duel keeps one rival in the new list');
const replacement = {...single.state.rival};
single.state.rival = replacement;
check(single.state.opponents[0] === replacement, 'legacy rival assignment updates the first list entry');
single.state.rival = null;
check(single.state.opponents.length === 0, 'legacy rival removal clears the list');

const capped = new Duel({seed: 222});
capped.startCampaign({opponentCount: Number.MAX_SAFE_INTEGER});
check(capped.state.opponentCount === 3 && capped.state.opponents.length === 3,
  'field size is capped at three CPU cars');

const field = new Duel({seed: 27});
field.startCampaign({opponentCount: 3});
field.state.status = 'racing';
field.state.s = 100;
field.state.opponents.forEach((actor, index) => { actor.s = 130 + index * 20; actor.speedMph = 80; });
const node = () => ({hidden: false, dataset: {}, style: {}, classList: {toggle(){}},
  firstChild: {textContent: ''}, lastChild: {textContent: ''}, setAttribute(){}, textContent: ''});
const ui = new Proxy({stage: node()}, {get(target, key) { return target[key] ??= node(); }});
const app = {duel: field, cameraMode: 'chase', player: {name: 'Tester'}, ghostRecord: null};
const text = (id, value) => { ui[id].textContent = String(value); };
const hud = createHudScreen({app, ui, text, time: value => String(value), clamp: value => Math.max(0, Math.min(1, value)),
  credits: value => String(value), routeMap: {update(){}}});
hud(field.state);
check(ui['race-position'].textContent === '04' && ui['position-total'].textContent === '/04',
  'HUD ranks the player behind all three cars and shows four total racers');
check(ui['rival-legend'].lastChild.textContent.trim() === 'RIVALS',
  'HUD legend names the full field');

globalThis.Path2D = class {moveTo(){} lineTo(){}};
const context = () => new Proxy({}, {get(target, key) { return target[key] ?? (() => {}); },
  set(target, key, value) { target[key] = value; return true; }});
const ownerDocument = {createElement() { return {getContext: context}; }};
const canvas = {width: 400, height: 280, dataset: {}, ownerDocument, getContext: context,
  setAttribute(name, value) { this[name] = value; }};
const map = new RouteMap(canvas);
const originalWorldAt = field.course.worldAt.bind(field.course);
let worldCalls = 0;
field.course.worldAt = (...args) => { worldCalls++; return originalWorldAt(...args); };
map.update(field.course, field.state, 0);
worldCalls = 0;
map.update(field.course, field.state, 70);
check(worldCalls === 4 && canvas['aria-label'].includes('3 opponents'),
  'route map draws the player and all three CPU cars with an accessible count');
map.dispose();

const resultView = createResultsScreen({app: {...app, runId: 'opponents'}, profile: () => ({credits: 0}),
  credits: String, escapeHTML: String, time: String, arrow: ''});
field.state.status = 'stage_result';
field.state.results = {completed: true, won: false, opponentCount: 3, position: 4, creditReward: 0};
const resultHtml = resultView(field.state);
check(resultHtml.includes('FINISH POSITION') && resultHtml.includes('4 / 4'),
  'result screen reports rank against the whole field');

field.state.status='racing';
field.state.objective={kind:'stuntTrial',targetJumps:2,targetCrushes:3};
field.state.timeLimitSec=90;
field.state.stageTimeSec=12;
hud(field.state);
check(ui['race-position'].textContent === '04' && ui['gap-label'].textContent === 'STUNT DEADLINE' && ui['rival-gap'].textContent === '78',
  'multi-car objective HUD retains rank and makes the deadline primary');

for(let index=0;index<3;index++){
  const contact=new Duel({seed:900+index});
  contact.startCampaign({opponentCount:3});
  const player=contact.state,opponent=player.opponents[index];
  Object.assign(player,{status:'racing',s:100,prevS:98,lateral:0,prevLateral:0,speedMph:80,traffic:[]});
  player.opponents.forEach((actor,j)=>Object.assign(actor,{s:j===index?101:200+j*30,prevS:j===index?101:200+j*30,
    lateral:0,prevLateral:0,speedMph:20,headingError:0,airborne:false,groundHeight:null}));
  check(contact._vehicleContact(player,opponent,'rival')===true,
    `player can physically contact opponent ${index+1}`);
  check([player.s,player.lateral,player.speedMph,opponent.s,opponent.lateral,opponent.speedMph].every(Number.isFinite),
    `opponent ${index+1} impact leaves finite poses and speeds`);
}

for(const [stageIndex,stage] of COURSE.entries()){
  if(stage.practice)continue;
  if(stage.stuntTrial){
    // The free-form stunt arena needs a line through its crushables. Drive it
    // through ordinary controls, as in test-stunt-trial, with three live CPUs.
    const duel=new Duel({seed:1989});
    duel.startCampaign({startStage:stageIndex,car:'titan_monster',difficulty:'casual',opponentCount:3});
    let steps=0;
    while(!['stage_result','gameover'].includes(duel.state.status)&&steps++<120*150){
      const s=duel.state;
      if(s.status==='racing'){
        const next=duel.course.features.crushables.filter(prop=>!s.crushedProps.includes(prop.id))
          .map(prop=>({...prop,gap:duel.relativeS(prop.s,s.s)-s.s}))
          .filter(prop=>prop.gap>-10&&prop.gap<105).sort((a,b)=>a.gap-b.gap)[0];
        const target=next?next.off:0,mps=s.speedMph*DRIVE.mphToWorld,frame=duel.course.at(s.s),surface=duel._drivingSurface(s.s,s.lateral);
        const heading=Math.atan((target-s.lateral)*2.5/Math.max(15,mps)),look=duel.course.at(s.s+mps*.18);
        const yaw=look.curvature*mps+(heading-s.headingError)*6;
        const bend=Math.max(Math.abs(frame.curvature),Math.abs(duel.course.at(s.s+100).curvature),Math.abs(duel.course.at(s.s+220).curvature));
        const targetSpeed=Math.min(duel.car.topSpeed*.94,surface.speedLimit,.85*Math.sqrt(DRIVE.maxLateralAccel*duel.car.grip/Math.max(.0001,bend))/DRIVE.mphToWorld);
        const brake=s.speedMph>targetSpeed+4?Math.min(1,(s.speedMph-targetSpeed)/20):0;
    duel.setInput({throttle:s.speedMph<targetSpeed?1:0,brake,
          steer:steerForYaw(yaw,{speedMph:s.speedMph,grip:duel.car.grip,traction:surface.traction,brake:brake,tyreSlip:s.tyreSlipRules===true&&!s.airborne&&s.speedMph>=0}),boost:false});
      }
      duel.step(1/120);
    }
    const result=duel.state;
    check(result.status==='stage_result'&&result.results?.completed===true&&result.completedLaps===result.lapsTotal,
      `${stage.id}: ordinary-control stunt drive completes with three live opponents`);
    check(result.opponents.length===3&&Number.isInteger(result.results.position)&&result.results.position>=1&&result.results.position<=4,
      `${stage.id}: actual stunt finish ranks all three CPU cars`);
    continue;
  }
  const memory=new Map();
  globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
  const app=new App();
  try {
  app.profile.courses={version:1,unlocked:COURSE.map(course=>course.id)};
  // The five secret course versions open only when found from the helicopter (docs/PILOT_MAP.md section 5): give this
  // profile the pilot's map record for each, as the track review does.
  app.profile.heli={...heliOf(app.profile),map:{version:1,seen:[],table:false,
    found:CIRCUIT_MANIFESTS.filter(row=>row.unlock?.kind==='spotted-from-air').map(row=>row.id)}};
  app._saveProfile();
  check(app.startCampaign({startStage:stageIndex,seed:1989,mode:'duel',difficulty:'casual',opponentCount:3,
    ...(['summit-run','summit-time-attack'].includes(stage.id)?{tyre:'winter'}:{})}),
    `${stage.id}: real App starts the requested race with course rules`);
  // Timed objectives have short default clocks. Extend the fixture clock so
  // this check isolates real lap driving and field ranking from target tuning.
  if(app.duel.state.timeLimitSec)app.duel.state.timeLimitSec=Math.max(600,app.duel.state.timeLimitSec);
  app.autopilot=true;
  if(racingLineDriven.has(stage.id))useRacingLine(app);
  app._scriptedCrashDone=true;
  let frames=0;
  while(!['stage_result','gameover','complete'].includes(app.duel.state.status)&&frames++<30*600)
    app.advance(1/30,1/30);
  const result=app.duel.state;
  check(result.status==='stage_result'&&result.results?.completed===true&&result.completedLaps===result.lapsTotal,
    `${stage.id}: actual fixed-step three-opponent race completes all laps ${JSON.stringify({status:result.status,results:result.results,laps:result.completedLaps,total:result.lapsTotal,time:result.stageTimeSec,s:result.s,speed:result.speedMph,crashes:result.stageCrashes,nextGate:result.nextLapGate})}`);
  if(isSummitAttack(stage)){
    check(result.mode==='timetrial'&&result.opponents.length===0&&result.rival===null&&result.traffic.length===0,`${stage.id}: actual fixed-step climb stays solo`);
    check(result.results.beatRival===null&&result.results.opponentCount===undefined&&result.results.position===undefined&&Object.hasOwn(result.results,'medal'),`${stage.id}: actual finish records a timed medal outcome without invented rivals`);
  }else check(result.opponents.length===3&&Number.isInteger(result.results.position)&&result.results.position>=1&&result.results.position<=4,
    `${stage.id}: actual finish ranks all three CPU cars`);
  } finally { app.dispose(); }
}

console.log(`Opponents: ${checks} scripted multi-car checks passed across ${COURSE.length} courses.`);
