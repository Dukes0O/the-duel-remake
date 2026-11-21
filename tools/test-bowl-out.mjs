import assert from 'node:assert/strict';
import {chooseShowWeapon} from '../src/bowl/bowl-weapons.js';
import {Duel} from '../src/game.js';
import {scoreFreestyle} from '../src/bowl/bowl-show.js';

const dt = 1/120;
function freestanding(night = 1, eventIndex = 1) {
  const duel = new Duel({seed:1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  assert.ok(duel.startBowlNight({night,eventIndex,cpuDifficulty:'easy',seed:1989}));
  if (duel.state.status === 'bowl_weapon_pick') assert.ok(chooseShowWeapon(duel, 'hammer'));
  while (duel.state.status === 'countdown') duel.step(dt);
  return duel;
}

function place(duel, s, lateral, headingError, speedMph = 0) {
  const state = duel.state, y = duel.course.groundAt(s,lateral).y;
  Object.assign(state, {s,prevS:s,lateral,prevLateral:lateral,headingError,speedMph,
    groundHeight:y,prevGroundHeight:y,airborne:false,_jumpY:y,_verticalSpeed:0,yawVelocity:0,pushVelocity:0});
}

function steerToward(duel, target, pace) {
  const s = duel.state, p = duel.course.worldAt(s.s,s.lateral);
  const bearing = Math.atan2(target.x-p.x,target.z-p.z);
  const delta = bearing-p.heading-s.headingError;
  const steer = -Math.atan2(Math.sin(delta),Math.cos(delta))*2;
  duel.setInput({steer:Math.max(-1,Math.min(1,steer)),throttle:s.speedMph < pace ? 1:0,
    brake:s.speedMph > pace+3 ? .5:0,boost:false});
}

const gatesReached = new Set(), returns = [];
for (let i=0; i<8; i++) {
  const duel = freestanding(), s = duel.state, course = duel.course, o = course.features.bowl.outside;
  const start = (i+.25)*course.length/8;
  const lane = o.back+18;
  place(duel,start,lane,0,20);
  duel.step(dt);
  const gate = s.bowlOutside.gate;
  const here = course.at(s.s), target = gate.aim;
  const at = course.worldAt(s.s,s.lateral);
  s.headingError = Math.atan2(target.x-at.x,target.z-at.z)-here.heading;
  let ticks=0, back=0;
  duel.onChange((_,ev)=>{ if(ev.bowlBackIn) back++; });
  for (; ticks<30/dt && s.bowlOutside; ticks++) {
    steerToward(duel,s.bowlOutside.gate.aim,20);
    duel.step(dt);
  }
  assert.ok(ticks*dt<30 && back===1, `start ${i}: ${gate.name}, at ${s.s.toFixed(1)},${s.lateral.toFixed(1)} in ${(ticks*dt).toFixed(1)} s`);
  assert.ok(s.stageTimeSec>=ticks*dt && !s.bowlOutside,'event clock runs throughout the trip');
  assert.equal(s.bowlNight.event.facts.filter(f=>f.type==='bowlBackIn').length,1);
  gatesReached.add(gate.name); returns.push(+(ticks*dt).toFixed(2));
}
assert.equal(gatesReached.size,2);
console.log('Eight car-park returns (seconds):',returns.join(', '));

// Seven equally spaced starts across the Big Jump's eight-metre approach band.
const touchdowns = [], uphill = [];
for (let line=0; line<7; line++) {
  const duel=freestanding(), s=duel.state, o=duel.course.features.bowl.outside;
  place(duel,43,-13-4+8*line/6,.35,50);
  s.boost=1;
  duel.setInput({throttle:1,boost:true,steer:0,brake:0});
  let flew=false;
  for (let k=0;k<600;k++) {
    duel.step(dt);
    if (s.airborne) flew=true;
    if (flew && !s.airborne) break;
  }
  assert.ok(flew && !s.airborne && s.bowlLanding==='clean' && s.groundHeight>o.firstHeight && s.lateral<o.back);
  const contact=s.lateral, height=s.groundHeight;
  for (let k=0;k<20;k++) {
    const before=s.lateral;
    duel.step(dt);
    assert.ok(s.lateral>before && !s.tumble,'forward traction on every tick from touchdown');
  }
  touchdowns.push(height.toFixed(2)); uphill.push((s.lateral-contact).toFixed(2));
}
console.log('Seven terrace heights (m)',touchdowns.join(', '),'and first 1/6 second uphill (m)',uphill.join(', '));

// Descend wheels down at walking pace. The vertical solver makes contact;
// throttle stays held from the final half metre in the air until after touchdown.
{
  const duel=freestanding(), s=duel.state;
  place(duel,36,32,Math.PI/2,9);
  Object.assign(s,{airborne:true,airHeight:.45,_jumpY:s.groundHeight+.45,_verticalSpeed:-1,airTime:.3});
  duel.setInput({steer:0,brake:0,throttle:1,boost:false});
  for(let k=0;k<60 && s.airborne;k++) duel.step(dt);
  assert.ok(!s.airborne && s.bowlLanding==='clean' && s.speedMph>=8 && s.speedMph<=12);
  const speeds=[s.speedMph.toFixed(2)];
  for(let k=0;k<6;k++) {
    const priorSpeed=s.speedMph, priorPosition=s.lateral;
    duel.step(dt);
    assert.ok(s.speedMph>priorSpeed && s.lateral>priorPosition && !s.tumble && !s.airborne);
    speeds.push(s.speedMph.toFixed(2));
  }
  console.log('Slow terrace touchdown and six following ticks (mph)',speeds.join(', '));
}

// Compare the ordinary straight jump with the outward launch disabled.
function straightJump(enableExit) {
  const duel=freestanding(), s=duel.state;
  if (!enableExit) duel.course.features.ramps.find(r=>r.id==='big-jump').exitNitroRise=0;
  place(duel,43,-13,0,50);
  s.boost=1; duel.setInput({throttle:1,boost:true,steer:0,brake:0});
  let peak=0;
  for (let k=0;k<600;k++) {
    duel.step(dt); peak=Math.max(peak,s.airHeight||0);
    if (peak && !s.airborne) return [k,s.s,s.lateral,peak,s.speedMph];
  }
  assert.fail('ordinary Big Jump must land');
}
assert.deepEqual(straightJump(true),straightJump(false));

const arrivals=[];
for (const gateIndex of [0,1]) for (const side of [-1,1]) for (const miss of [-1,1]) {
  const duel=freestanding(), s=duel.state, course=duel.course, o=course.features.bowl.outside, gate=o.gates[gateIndex];
  assert.deepEqual([gate.width,gate.mouthWidth,gate.guideLength],[8,14,10]);
  for (const offset of [0, 2, -2]) {
    for (let lateral=o.wall+1;lateral<=o.back+4;lateral+=.5)
      assert.equal(course.groundAt(gate.s+offset,lateral).y,0,'tunnel floor');
  }
  for (let phase=0;phase<course.length;phase+=2)
    assert.equal(course.groundAt(phase,o.back+.1).y,0,'car park beside the retaining wall');
  place(duel,gate.s+side*(9+miss),o.back+9,-Math.PI/2-side*Math.PI/4,20);
  let minSpeed=20;
  for(let k=0;k<1200 && s.lateral>o.wall-2;k++) {
    if(s.lateral>o.back+4) duel.setInput({throttle:s.speedMph<20?1:0,steer:0,brake:0});
    else steerToward(duel,course.worldAt(gate.s,o.wall-6),20);
    duel.step(dt); minSpeed=Math.min(minSpeed,s.speedMph);
    assert.ok(!s.airborne && s.groundHeight<.01,'real truck stays level through the gate');
  }
  assert.ok(s.lateral<=o.wall-2 && minSpeed>15,'rolling diagonal entry through '+gate.name);
  arrivals.push(minSpeed.toFixed(2));
}
console.log('Eight 45-degree gate entries, minimum mph',arrivals.join(', '));

{
  const duel=freestanding(), cheers=[];
  place(duel,7,1,0);
  duel.onChange((_,ev)=>{if(ev.bowlScore?.type==='bowlTrick') cheers.push(ev.bowlScore);});
  duel.setInput({throttle:1,boost:true,steer:0,brake:0});
  for(let k=0;k<200;k++) duel.step(dt);
  assert.ok(cheers.some(e=>e.points>0 && e.cue==='bowl.crowd.rise'),'clean trick keeps its crowd cheer');
}

// The truck enters the Big Jump already at speed, holds nitro on the ramp,
// lands on the terraces and drives up the slope. No state is moved between legs.
{
  const duel = freestanding(), s = duel.state, course = duel.course, o = course.features.bowl.outside;
  const cues = [], flights = [];
  duel.onChange((_,ev) => {
    if (ev.bowlOutsideCue) cues.push(ev.bowlOutsideCue);
    if (ev.bowlScore?.type === 'landedJump') {
      assert.equal(ev.bowlScore.cue,'bowl.crowd.rise','ordinary landed stunts keep their cheer');
      flights.push(ev.bowlScore);
    }
    if (['bowlInStands','bowlOverWall','bowlBackIn'].includes(ev.bowlScore?.type))
      assert.equal(ev.bowlScore.cue,null,'only the exterior event plays its own cue');
  });
  place(duel,46,-14,.35,50);
  s.boost = 1;
  duel.setInput({throttle:1,boost:true,steer:0,brake:0});
  let launched = false, terrace = 0, left = false, landed = false, drop = 0;
  for (let k=0;k<20/dt;k++) {
    if (terrace) steerToward(duel,course.worldAt(s.s,s.lateral+30),25);
    duel.step(dt);
    if (!launched && s.airborne) {
      assert.ok(s.boosting && s._jumpOrigin?.rampId === 'ramp-1', 'nitro takes off from the Big Jump');
      launched = true;
    }
    if (!terrace && s.bowlOutside?.where === 'stands' && !s.airborne) terrace = s.groundHeight;
    if (terrace && s.airborne && s.lateral > o.back) { left = true; drop = Math.max(drop,s.airHeight); }
    if (left && !s.airborne && s.lateral > o.back && s.groundHeight < .01) {
      landed = true; duel.step(dt); break;
    }
  }
  assert.ok(launched && terrace > o.firstHeight && landed && drop > 23, 'terraces to the ground 24 m below');
  assert.deepEqual(cues.filter(c=>['bowl.out.over','bowl.out.leap'].includes(c)),['bowl.out.over','bowl.out.leap']);
  assert.ok(flights.length >= 2, 'the launch and the leap both score as jumps');
  assert.ok(Object.values(s.damageZones).every(n=>n===0));
  console.log('Big Jump terrace landing',terrace.toFixed(2),'m; leap above car park',drop.toFixed(2),'m.');
}

// Each gate is a real opening outward, including a full traversal of its
// tunnel floor. An AI truck sent at the same opening meets the stand wall.
for (const gateIndex of [0,1]) {
  const duel = freestanding(), s=duel.state, c=duel.course, o=c.features.bowl.outside, gate=o.gates[gateIndex];
  place(duel,gate.s,8,Math.PI/2,12);
  let sounded=0;
  duel.onChange((_,ev)=>{if(ev.bowlOutsideCue==='bowl.out.gate') sounded++;});
  for (let k=0;k<1200 && s.lateral<o.back+8;k++) {
    steerToward(duel,c.worldAt(gate.s,o.back+14),20);
    duel.step(dt);
    assert.ok(!s.airborne && s.groundHeight < .05,gate.name+' has a level tunnel');
  }
  assert.ok(s.lateral>o.back+7 && sounded===1 && !s.bowlNight.event.overWall,gate.name+' opens outward without a jump award');
  const fight=freestanding(3,2), rival=fight.state.opponents[0], rGate=fight.course.features.bowl.gates[gateIndex];
  for(let k=0;k<240;k++)fight.step(dt);
  Object.assign(rival,{s:rGate.s,prevS:rGate.s,lateral:17.5,prevLateral:17.5,headingError:Math.PI/2,speedMph:48,
    yawVelocity:0,pushVelocity:0});
  let touched=false,furthest=16;
  fight.onChange((_,ev)=>{if(ev.bowlWall)touched=true;});
  for(let k=0;k<120;k++){fight.step(dt);furthest=Math.max(furthest,rival.lateral);}
  assert.ok(touched && furthest<o.wall,rGate.name+' keeps the moving computer truck on the floor');
}

// Floor and stands remain separated at the straights and both ends.
for (const phase of [31,105,187,251]) for (const inward of [false,true]) {
  const duel=freestanding(), s=duel.state, c=duel.course, o=c.features.bowl.outside;
  place(duel,phase,inward ? o.front+4 : o.wall-8,inward ? -Math.PI/2 : Math.PI/2,15);
  duel.setInput({steer:0,throttle:.5});
  let bounced=false;
  duel.onChange((_,ev)=>{if(ev.bowlWall)bounced=true;});
  for(let k=0;k<180 && !bounced;k++)duel.step(dt);
  assert.ok(bounced && (inward ? s.lateral>o.wall : s.lateral<o.wall), 'wall must separate both sides at '+phase);
}

// Count time on the terrace; cap at 60 points; repeated over-wall visits cost half.
{
  const duel=freestanding(),s=duel.state,c=duel.course,o=c.features.bowl.outside;
  place(duel,35,o.front+8,0);
  duel.setInput({throttle:0,brake:0,steer:0});
  for(let k=0;k<120*17;k++)duel.step(dt);
  const standing=s.bowlNight.event.facts.filter(f=>f.type==='bowlInStands');
  assert.equal(scoreFreestyle(standing).score,60);
  assert.equal(scoreFreestyle([{type:'bowlOverWall'},{type:'bowlOverWall',repeat:true},{type:'bowlBackIn'}]).score,265);
}

// Parked cars crush through ordinary collision and scoring. The outer dirt
// bank uses the same contact response as the walls inside.
{
  const duel=freestanding(),s=duel.state,c=duel.course,o=c.features.bowl.outside;
  const parked=o.parking.find(p=>p.s>25 && p.s<65);
  place(duel,parked.s-5,parked.off,0,22);
  duel.setInput({throttle:1,steer:0});
  for(let k=0;k<160 && !s.crushedProps.includes(parked.id);k++)duel.step(dt);
  assert.ok(s.crushedProps.includes(parked.id) && s.bowlNight.event.facts.some(f=>f.type==='crush'));
  place(duel,37,o.bank-8,Math.PI/2,38);
  let hit;
  duel.onChange((_,ev)=>{if(ev.bowlWall)hit=ev.bowlWall;});
  for(let k=0;k<200 && !hit;k++)duel.step(dt);
  assert.ok(hit?.kind==='hard' && s.lateral<o.bank, 'bank meets the physical truck');
  const inward=s.lateral;
  for(let k=0;k<10;k++)duel.step(dt);
  assert.ok(s.lateral<inward,'bank sends truck towards the car park');
}
