// Night five. The rules use the rail, gate and ground from the current course.
import {registerBowlEventRunner, sayBowlLine} from './bowl-night.js';
import {BOWL_GOALS} from './bowl-lines.js';
import {crowdAfter, scoreStuntEvent} from './bowl-show.js';
import {EYE_Z, along, wrap, signedAngle, eyePoint, rexAnchor, modelPoint, hookMarker,
  newHook, releaseHook, stepHook, truckPoint, bombInReach, beastDistance} from './bowl-hook.js';

export const REX_EVENT='scrapasaurus';
export const REX_TROPHY='show-night-5';
export const REX_RULES=Object.freeze({
  boxes:EYE_Z, penCars:8, fallSec:10,
  fire:{halfAngle:18*Math.PI/180, sweep:Math.PI/6, seconds:1.65, range:29},
  thrown:{flightSec:1,hitRadius:3.5},
  // BOWL-REX-3. The eye beam: a line from its head through the truck and 60 m on, 3 m wide once it stops,
  // burning for half a second; a truck whose middle is within 2.5 m of it is scorched unless its wheels are
  // more than 3 m up. A bomb: thrown as a car is, it lies ticking and bursts within 7 m; on the cable it
  // bursts within 6 m of the beast's legs, body or tail, and the box that then opens has 1 second pulled.
  beam:{reach:60,width:3,hitRadius:2.5,burnSec:.5,overHeight:3,second:{aimSec:.6,lockSec:.4}},
  bomb:{flightSec:1,landRadius:3.5,burstRadius:7,beastRadius:6,pullGift:1},
  // A new attack's first tell in a fight lasts half as long again, on Easy and Medium.
  firstTell:1.5,
  level:{
    easy:{walk:5,tellSec:2.6,restSec:24,throwTellSec:2.1,breaths:1,rests:6,hits:5,pull:[2,4,3],
      beamAimSec:1.8,beamLockSec:.7,fuseSec:10},
    medium:{walk:7,tellSec:2,restSec:19,throwTellSec:1.65,breaths:2,rests:5,hits:4,pull:[3,4,4],
      beamAimSec:1.4,beamLockSec:.5,fuseSec:8},
    hard:{walk:9,tellSec:1.5,restSec:15,throwTellSec:1.25,breaths:2,rests:5,hits:3,pull:[3,5,5],
      beamAimSec:1,beamLockSec:.4,fuseSec:6},
  },
});
export const REX_CUES=Object.freeze({
  burst:'bowl.rex.burst',tell:'bowl.rex.roar',fire:'bowl.rex.fire',fireEnd:'bowl.rex.fire.end',
  scorch:'bowl.rex.scorch',boxOpen:'bowl.rex.box.open',bump:'bowl.rex.bump',lift:'bowl.rex.lift',
  throw:'bowl.rex.throw',thrownLand:'bowl.rex.throw.land',fall:'bowl.rex.fall',gone:'bowl.rex.gate',
  sag:'bowl.rex.sag',rise:'bowl.rex.rise',sweep:'bowl.rex.sweep',brace:'bowl.rex.brace',
  hookFire:'bowl.hook.fire',bite:'bowl.hook.bite',clang:'bowl.hook.clang',tight:'bowl.hook.tight',
  jerk:'bowl.hook.jerk',letgo:'bowl.hook.letgo',boxOut:'bowl.rex.box.out',drag:'bowl.rex.box.drag',
  // BOWL-REX-3 (stand-ins in BOWL_SOUND_CUES until BOWL-SOUND records them). The whistle and the tick are
  // events of their own so that each has its cue: the whistle as the bomb leaves, a tick each time it ticks.
  beamAim:'bowl.rex.eyes.aim',beamLock:'bowl.rex.eyes.lock',beam:'bowl.rex.beam',beamOver:'bowl.rex.beam.over',
  bombTell:'bowl.rex.bomb.hatch',bombThrow:'bowl.rex.bomb.launch',bombWhistle:'bowl.rex.bomb.whistle',
  bombLand:'bowl.rex.bomb.land',bombTick:'bowl.rex.bomb.tick',bombBurst:'bowl.rex.bomb.burst',stagger:'bowl.rex.stagger',
});

export function rexPlaces(course){
  const show=course.features.bowl;
  const gate=show.gates.find(g=>g.name==='Car Park Gate');
  const rail=show.rails.lateral;
  return {length:course.length,gateS:gate.s,startS:gate.s,rail,side:Math.sign(rail),scale:1,
    headTop:11.58,headAhead:7.99,edge:course.def.scrapdome.floorHalfWidth,
    penS:show.crush.lastRowS,penLateral:rail+Math.sign(rail)*2};
}
export function createRexFight({difficulty='medium',course}){
  const places=rexPlaces(course),level=REX_RULES.level[difficulty]?difficulty:'medium';
  return {version:3,level,places,length:course.length,phase:'walk',direction:-1,s:places.startS,t:0,
    boxes:[false,false,false],dropped:[],low:false,rests:0,fires:0,tells:0,hits:0,maxHits:REX_RULES.level[level].hits,
    penCars:REX_RULES.penCars,hook:newHook(),marker:null,cone:null,throwAt:null,done:null,
    braced:false,scorched:false,first:true,lastBox:-1,hints:{},
    // BOWL-REX-3: the attacks owed before it walks on, the turn in its order, the line, the bomb,
    // which new tells it has shown, and the scorches by cause.
    due:[],turn:0,headDown:false,beam:null,bomb:null,shown:{beam:false,bomb:false},staggers:0,
    scorches:{fire:0,car:0,beam:0,bomb:0}};
}
export const rexFightOf=night=>night?.event?.type===REX_EVENT ? night.event.rex??null:null;
export const rexFacing=(fight,course)=>rexAnchor(fight,course).heading;
export const rexBoxesLeft=fight=>fight.boxes.filter(out=>!out).length;
export const rexNextBox=fight=>fight.boxes.indexOf(false);
export function rexPullProgress(fight) {
  if (fight?.hook.phase !== 'attached') return null;
  const {box, pulls} = fight.hook;
  const required = REX_RULES.level[fight.level].pull[box];
  return Math.max(0, Math.min(1, pulls[box] / required));
}
export const rexLastRest=fight=>fight.rests>=REX_RULES.level[fight.level].rests;
export const rexBoxS=(fight,index)=>wrap(fight.s+fight.direction*EYE_Z[index],fight.length);
export const rexHeadS=fight=>wrap(fight.s+fight.direction*fight.places.headAhead,fight.length);

function phase(fight,name){
  fight.phase=name;fight.t=0;
}
function tell(fight,course,target,alongCable,events){
  const head=alongCable ? eyePoint(fight,course,2) : modelPoint(rexAnchor(fight,course),0,0,fight.low ? 5.3 : 7.6);
  // The first breath runs along the rail. The truck starts in the lane beside it.
  const aim=fight.tells===0 && !alongCable ? rexFacing(fight,course) : Math.atan2(target.x-head.x,target.z-head.z);
  // Mark the full swept sector before any flame appears. The fire traverses
  // this fixed sector and cannot follow a truck that has left it.
  const sweep=fight.boxes[0] && !alongCable ? REX_RULES.fire.sweep : 0;
  fight.cone={x:head.x,z:head.z,heading:aim,halfAngle:REX_RULES.fire.halfAngle+sweep,
    sweep,range:REX_RULES.fire.range,flameHeading:aim-sweep};
  fight.cableBreath=alongCable;fight.scorched=false;fight.tells++;
  phase(fight,'tell');events.push({type:'tell',cone:{...fight.cone}});
}
// The extra attack made each time it gets up from a tired spell (BOWL-REX-3, item 1).
export function rexRiseAttacks(fight){
  const out=3-rexBoxesLeft(fight);
  if(out===1)return ['beam'];
  if(out!==2)return [];
  const order=fight.level==='easy' ? ['bomb','beam','car'] : ['bomb','car'];
  return [order[fight.turn++%order.length]];
}
function stand(fight,events){
  const h=fight.hook;
  if(h.phase==='attached'||(h.phase==='flying' && !h.bomb))releaseHook(h,events);
  fight.low=false;fight.marker=null;fight.cone=null;fight.cableBreath=false;
  fight.due=rexRiseAttacks(fight);
  events.push({type:'rise'});
  phase(fight,rexLastRest(fight)?'exit':'walk');
}
// A tired spell. One forced by its own bomb is not counted towards the walk out.
function rest(fight,events,counted=true){
  phase(fight,'rest');fight.low=true;fight.braced=false;fight.due=[];
  if(counted)fight.rests++;
  events.push({type:'sag'},{type:'boxOpen',box:rexNextBox(fight)});
}
function scorch(fight,events,cause){
  fight.hits++;fight.scorches[cause]++;events.push({type:'scorch',hits:fight.hits,cause});
  if(fight.hits>=fight.maxHits){fight.done={won:false,reason:'toasted'};events.push({type:'toasted'});}
}
// A new attack's tell is half as long again the first time in a fight, on Easy and Medium.
function firstTell(fight,kind){
  const first=!fight.shown[kind];fight.shown[kind]=true;
  return first && fight.level!=='hard' ? REX_RULES.firstTell : 1;
}
// The line from its head through the truck and 60 m on. It follows the truck until it stops.
function aimLine(beam,at){
  const dx=at.x-beam.x,dz=at.z-beam.z;
  beam.heading=Math.atan2(dx,dz);beam.length=Math.hypot(dx,dz)+REX_RULES.beam.reach;
}
export function beamDistance(beam,point){
  const ux=Math.sin(beam.heading),uz=Math.cos(beam.heading),dx=point.x-beam.x,dz=point.z-beam.z;
  const along=Math.max(0,Math.min(beam.length,dx*ux+dz*uz));
  return Math.hypot(dx-ux*along,dz-uz*along);
}
function aimBeam(fight,course,at,events,second=false){
  const level=REX_RULES.level[fight.level],timing=second ? REX_RULES.beam.second : {aimSec:level.beamAimSec*firstTell(fight,'beam'),lockSec:level.beamLockSec};
  // It stops and drops its head level with the cab: the line starts under its head.
  const head=modelPoint(rexAnchor(fight,course),0,0,fight.places.headAhead);
  fight.beam={phase:'aim',t:0,x:head.x,y:head.y,z:head.z,heading:0,length:REX_RULES.beam.reach,
    aimSec:timing.aimSec,lockSec:timing.lockSec,second,hit:false,over:false,stopped:false};
  aimLine(fight.beam,at);fight.headDown=true;
  phase(fight,'beam');events.push({type:'beamAim',second});
}
function stepBeam(fight,course,truck,at,dt,events){
  const beam=fight.beam;beam.t+=dt;
  if(beam.phase==='aim'){
    aimLine(beam,at);
    if(beam.t+1e-8>=beam.aimSec){beam.phase='lock';beam.t=0;beam.stopped=true;events.push({type:'beamLock'});}
  }else if(beam.phase==='lock'){
    if(beam.t+1e-8>=beam.lockSec){beam.phase='burn';beam.t=0;events.push({type:'beam'});}
  }
  if(beam.phase!=='burn')return;
  // A truck within 2.5 m of the line at any moment of the burn takes one scorch, unless it is more than 3 m up.
  if(!beam.hit && beamDistance(beam,at)<=REX_RULES.beam.hitRadius){
    if((truck.airHeight||0)>REX_RULES.beam.overHeight)beam.over=true;
    else{beam.hit=true;scorch(fight,events,'beam');}
  }
  if(beam.t+1e-8<REX_RULES.beam.burnSec || fight.done)return;
  if(beam.over && !beam.hit)events.push({type:'beamOver'});
  // On Hard, with two boxes out, the beam between its breaths fires twice running.
  if(!beam.second && fight.level==='hard' && fight.beamTwice){fight.beamTwice=false;aimBeam(fight,course,at,events,true);return;}
  fight.beam=null;fight.headDown=false;fight.beamTwice=false;phase(fight,'walk');
}
// The bomb's tell and throw are the thrown car's: the place is where the truck is when the tell begins.
function hatch(fight,course,at,truck,events){
  const level=REX_RULES.level[fight.level];
  const from=modelPoint(rexAnchor(fight,course),0,9.6,-.4);
  fight.bomb={phase:'tell',t:0,tellSec:level.throwTellSec*firstTell(fight,'bomb'),x:at.x,y:course.groundAt(truck.s,truck.lateral).y,z:at.z,
    s:truck.s,lateral:truck.lateral,from,fuse:level.fuseSec,left:level.fuseSec,share:1,tick:0,canBite:false,onCable:false};
  phase(fight,'hatch');events.push({type:'bombTell',at:{x:at.x,z:at.z}});
}
function burst(fight,course,at,events,{beast=false,landed=false}={}){
  const bomb=fight.bomb,h=fight.hook,onCable=bomb.onCable;
  const truck=landed || Math.hypot(at.x-bomb.x,at.z-bomb.z)<=REX_RULES.bomb.burstRadius;
  if(onCable)releaseHook(h,[]);
  fight.bomb=null;
  events.push({type:'bombBurst',truck,beast,landed,onCable,at:{x:bomb.x,z:bomb.z}});
  if(truck)scorch(fight,events,'bomb');
  if(beast && !fight.done)stagger(fight,events);
}
// Caught by its own bomb: it staggers and sags where it stands, a tired spell that does not count,
// and the box that opens already has a second of pull.
function stagger(fight,events){
  fight.cone=null;fight.cableBreath=false;fight.throwAt=null;fight.beam=null;fight.headDown=false;fight.beamTwice=false;
  fight.staggers++;
  const next=rexNextBox(fight);
  if(next>=0)fight.hook.pulls[next]+=REX_RULES.bomb.pullGift;
  events.push({type:'stagger',box:next});
  rest(fight,events,false);
}
function stepBomb(fight,course,truck,at,dt,events){
  const bomb=fight.bomb,rules=REX_RULES.bomb;
  bomb.t+=dt;
  if(bomb.phase==='air' && bomb.t+1e-8>=rules.flightSec){
    // A bomb that lands on the truck bursts at once.
    if(Math.hypot(at.x-bomb.x,at.z-bomb.z)<=rules.landRadius){burst(fight,course,at,events,{landed:true});return;}
    bomb.phase='lying';bomb.t=0;bomb.tick=0;events.push({type:'bombLand',at:{x:bomb.x,z:bomb.z}});
  }
  if(bomb.phase!=='lying')return;
  bomb.left=Math.max(0,bomb.left-dt);bomb.share=bomb.left/bomb.fuse;
  if(bomb.onCable && beastDistance(fight,course,bomb)<=rules.beastRadius){burst(fight,course,at,events,{beast:true});return;}
  if(bomb.left<=1e-8){burst(fight,course,at,events);return;}
  // The tick quickens as the time runs out: one a second at first, about seven a second at the end.
  bomb.tick-=dt;
  if(bomb.tick<=1e-8){bomb.tick+=.14+.86*bomb.share;events.push({type:'bombTick',share:bomb.share});}
}
function extract(fight,index,events){
  const h=fight.hook;fight.boxes[index]=true;fight.lastBox=index;
  Object.assign(h,{phase:'dragging',time:0,tight:false,pulling:false});
  h.drag={...h.tip,y:h.tip.y-.66};
  fight.marker=null;fight.cone=null;
  events.push({type:'boxOut',box:index,left:rexBoxesLeft(fight)},{type:'drag',box:index});
  if(rexBoxesLeft(fight)===0){
    // A bomb still on the floor goes out with its lights.
    fight.bomb=null;fight.beam=null;fight.headDown=false;fight.due=[];
    fight.low=true;phase(fight,'fallen');events.push({type:'fall'});
  }else{
    stand(fight,events);
  }
}
export function stepRexFight(fight,truck,dt,course){
  const events=[];
  if(fight.done||!(dt>0))return events;
  if(fight.phase!=='fallen' && fight.hits>=fight.maxHits){
    fight.done={won:false,reason:'toasted'};
    return [{type:'toasted'}];
  }
  const level=REX_RULES.level[fight.level],at=truckPoint(course,truck),h=fight.hook;
  if(fight.first){fight.first=false;events.push({type:'burst'});}
  fight.t+=dt;
  fight.tailYaw=fight.phase==='walk' ? .14*Math.sin(2.5*fight.t) : 0;
  fight.marker=hookMarker(fight,truck,course);
  if(fight.bomb)fight.bomb.canBite=bombInReach(fight,truck,course);
  stepHook(fight,truck,dt,course,events);
  if(fight.bomb && fight.phase!=='fallen'){
    stepBomb(fight,course,truck,at,dt,events);
    if(fight.done)return events;
  }
  // The third latch releases after flame has reached the marked cable. A jerk or
  // full tank can build tension early, but cannot skip the marked attack.
  const headLatchReady=h.box!==2 || (fight.phase==='fire' && fight.cableBreath && fight.t>=.65);
  if(h.phase==='attached' && headLatchReady && h.pulls[h.box]+1e-8>=level.pull[h.box]){
    extract(fight,h.box,events);
    return events;
  }
  switch(fight.phase){
    case 'walk':{
      const distance=along(truck.s,fight.s,fight.length);
      if(Math.abs(distance)>2){
        fight.direction=Math.sign(distance);
        fight.s=wrap(fight.s+fight.direction*Math.min(Math.abs(distance),level.walk*dt),fight.length);
      }
      // An attack owed from getting up comes before it walks on. Never more than one bomb is out:
      // a bomb that is owed while one is out is a car instead.
      let next=fight.due.shift();
      if(next==='bomb' && fight.bomb)next='car';
      if(next==='car' && !fight.penCars)next=null;
      if(next==='car'){
        fight.penCars--;
        fight.throwAt={...at,s:truck.s,lateral:truck.lateral};
        phase(fight,'lift');events.push({type:'lift',at:{...fight.throwAt}});
      }else if(next==='bomb')hatch(fight,course,at,truck,events);
      else if(next==='beam')aimBeam(fight,course,at,events);
      else if(fight.t>=2.4 && (Math.abs(distance)<24 || fight.fires===0 || fight.t>=7)){
        tell(fight,course,at,false,events);
      }
      break;
    }
    case 'tell':
      if(fight.t+1e-8>=level.tellSec){
        phase(fight,'fire');fight.fires++;events.push({type:'fire',cone:{...fight.cone}});
        if(fight.cone.sweep)events.push({type:'sweep'});
      }
      break;
    case 'fire':{
      const cone=fight.cone;
      cone.flameHeading=cone.heading+cone.sweep*(2*Math.min(1,fight.t/REX_RULES.fire.seconds)-1);
      const dx=at.x-cone.x,dz=at.z-cone.z;
      if(!fight.scorched && Math.hypot(dx,dz)<=cone.range &&
        Math.abs(signedAngle(Math.atan2(dx,dz)-cone.flameHeading))<=REX_RULES.fire.halfAngle){
        fight.scorched=true;scorch(fight,events,'fire');
      }
      if(fight.t+1e-8>=REX_RULES.fire.seconds && !fight.done){
        events.push({type:'fireEnd'});fight.cone=null;
        if(fight.cableBreath){fight.cableBreath=false;stand(fight,events);}
        else if(fight.fires%level.breaths===0)rest(fight,events);
        else{
          // Medium and Hard, two boxes out: the eye beam between its two breaths (twice running on Hard).
          phase(fight,'walk');
          if(3-rexBoxesLeft(fight)===2){fight.due=['beam'];fight.beamTwice=fight.level==='hard';}
        }
      }
      break;
    }
    case 'rest':
      if(h.phase==='attached' && h.box===2 && h.tight)tell(fight,course,at,true,events);
      else if(fight.t+1e-8>=level.restSec
        && !(h.phase==='attached' && h.box===0))stand(fight,events);
      break;
    case 'lift':
      if(fight.t>=level.throwTellSec){phase(fight,'throw');events.push({type:'throw',at:{...fight.throwAt}});}
      break;
    case 'throw':
      if(fight.t>=REX_RULES.thrown.flightSec){
        const hit=Math.hypot(at.x-fight.throwAt.x,at.z-fight.throwAt.z)<=REX_RULES.thrown.hitRadius;
        events.push({type:'thrownLand',hit,at:{...fight.throwAt}});
        if(hit)scorch(fight,events,'car');
        fight.throwAt=null;phase(fight,'walk');
      }
      break;
    case 'beam':
      stepBeam(fight,course,truck,at,dt,events);
      break;
    case 'hatch':
      if(fight.t+1e-8>=fight.bomb.tellSec){
        Object.assign(fight.bomb,{phase:'air',t:0});phase(fight,'lob');
        events.push({type:'bombThrow',at:{x:fight.bomb.x,z:fight.bomb.z}},{type:'bombWhistle'});
      }
      break;
    case 'lob':
      // One second in the air, as a thrown car; stepBomb lands it.
      if(fight.bomb?.phase!=='air')phase(fight,'walk');
      break;
    case 'exit':{
      const distance=along(fight.places.gateS,fight.s,fight.length);
      fight.direction=Math.sign(distance)||fight.direction;
      if(Math.abs(distance)<=level.walk*dt){
        fight.s=fight.places.gateS;phase(fight,'gone');fight.done={won:false,reason:'gate'};events.push({type:'gone'});
      }else fight.s=wrap(fight.s+fight.direction*level.walk*dt,fight.length);
      break;
    }
    case 'fallen':
      if(fight.t+1e-8>=REX_RULES.fallSec)fight.done={won:true,reason:'fallen'};
      break;
  }
  fight.marker=hookMarker(fight,truck,course);
  if(fight.bomb)fight.bomb.canBite=bombInReach(fight,truck,course);
  return events;
}
const hints={gone:'rex.gone',toasted:'rex.toasted',noBox:'rex.noBox',slack:'rex.slack',braceStall:'rex.brace',scorch:'rex.scorch',lift:'rex.lift',tell:'rex.tell',
  beamAim:'rex.eyes',bombTell:'rex.bombs',stagger:'rex.stagger',beamOver:'rex.beamOver'};
// Which of Big Mo's lines an event calls for, once each in a fight: his calls, and why a try failed.
export function rexLineFor(event){
  if(event.type==='scorch')return event.cause==='beam' ? 'rex.why.beam' : event.cause==='bomb' ? null : 'rex.scorch';
  if(event.type==='bite' && event.bomb)return 'rex.bombHooked';
  if(event.type==='bombBurst' && !event.beast){
    if(event.landed)return 'rex.why.bombLand';
    if(event.onCable)return 'rex.why.bombLate';
    if(event.truck)return 'rex.why.bombNear';
    return null;
  }
  return hints[event.type]??null;
}
// The truck clear over the beam fills the crowd meter as a new trick does (a fresh backflip), with no points.
function crowdForBeamOver(duel,night){
  const event=night.event,at=duel.state.stageTimeSec;
  if(event?.crowd==null)return;
  const scored=scoreStuntEvent({type:'bowlTrick',points:50,fresh:true},crowdAfter(event.crowd,at-(event.crowdAt??at)));
  event.crowd=scored.crowd;event.crowdAt=at;event.crowdPeak=Math.max(event.crowdPeak??0,scored.crowd);
}

registerBowlEventRunner(REX_EVENT,{
  place(duel,night){
    const s=duel.state,fight=createRexFight({difficulty:night.cpuDifficulty,course:duel.course});
    night.event.rex=fight;
    s.s=s.prevS=wrap(fight.places.gateS-17,fight.length);
    s.lateral=s.prevLateral=fight.places.rail-fight.places.side*10;
    s.headingError=0;s.nextLapGate=duel._lapGates.filter(g=>g<=s.s).length;
  },
  target:()=>3,
  goal(night){const fight=rexFightOf(night);return fight?BOWL_GOALS.scrapasaurus(fight):'';},
  step(duel,night,dt){
    const fight=night.event.rex,s=duel.state;
    for(const event of stepRexFight(fight,s,dt,duel.course)){
      if(event.type==='boxOut'){s.speedMph=Math.max(8,s.speedMph+5);sayBowlLine(duel,'rex.out.'+(event.box+1));}
      if(event.type==='scorch'){s.speedMph*=.42;s.boosting=false;}
      if(event.type==='boxOpen')sayBowlLine(duel,'rex.rest');
      if(event.type==='beamOver')crowdForBeamOver(duel,night);
      // The older hints keep their event's name as the key (the hook reads fight.hints.slack and .braceStall).
      const line=rexLineFor(event),key=line && line===hints[event.type] ? event.type : line;
      if(line && !fight.hints[key]){
        fight.hints[key]=true;sayBowlLine(duel,line,{once:true});
      }
      if(event.type==='slack'||event.type==='noBox'||event.type==='braceStall')continue;
      const cue = REX_CUES[event.type];
      duel.emit({bowlRex: cue ? {...event, cue} : event});
    }
    if(fight.hook.tight || fight.hook.phase!=='attached'){
      if(night.caption?.id==='rex.slack')night.caption=null;
      if(night.captionQueue.some(line=>line.id==='rex.slack'))
        night.captionQueue=night.captionQueue.filter(line=>line.id!=='rex.slack');
    }
    return fight.done ? {...fight.done,boxes:3-rexBoxesLeft(fight),hits:fight.hits} : null;
  },
});

export const rexInTheYard=profile=>Array.isArray(profile?.bowl?.trophies)&&profile.bowl.trophies.includes(REX_TROPHY);
