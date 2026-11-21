// Night five. The rules use the rail, gate and ground from the current course.
import {registerBowlEventRunner, sayBowlLine} from './bowl-night.js';
import {BOWL_GOALS} from './bowl-lines.js';
import {EYE_Z, along, wrap, signedAngle, eyePoint, rexAnchor, modelPoint, hookMarker,
  newHook, releaseHook, stepHook, truckPoint} from './bowl-hook.js';

export const REX_EVENT='scrapasaurus';
export const REX_TROPHY='show-night-5';
export const REX_RULES=Object.freeze({
  boxes:EYE_Z, penCars:8, fallSec:10,
  fire:{halfAngle:18*Math.PI/180, sweep:Math.PI/6, seconds:1.65, range:29},
  thrown:{flightSec:1,hitRadius:3.5},
  level:{
    easy:{walk:5,tellSec:2.6,restSec:24,throwTellSec:2.1,breaths:1,rests:6,hits:5,pull:[2,4,3]},
    medium:{walk:7,tellSec:2,restSec:19,throwTellSec:1.65,breaths:2,rests:5,hits:4,pull:[3,4,4]},
    hard:{walk:9,tellSec:1.5,restSec:15,throwTellSec:1.25,breaths:2,rests:5,hits:3,pull:[3,5,5]},
  },
});
export const REX_CUES=Object.freeze({
  burst:'bowl.rex.burst',tell:'bowl.rex.roar',fire:'bowl.rex.fire',fireEnd:'bowl.rex.fire.end',
  scorch:'bowl.rex.scorch',boxOpen:'bowl.rex.box.open',bump:'bowl.rex.bump',lift:'bowl.rex.lift',
  throw:'bowl.rex.throw',thrownLand:'bowl.rex.throw.land',fall:'bowl.rex.fall',gone:'bowl.rex.gate',
  sag:'bowl.rex.sag',rise:'bowl.rex.rise',sweep:'bowl.rex.sweep',brace:'bowl.rex.brace',
  hookFire:'bowl.hook.fire',bite:'bowl.hook.bite',clang:'bowl.hook.clang',tight:'bowl.hook.tight',
  jerk:'bowl.hook.jerk',letgo:'bowl.hook.letgo',boxOut:'bowl.rex.box.out',drag:'bowl.rex.box.drag',
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
  return {version:2,level,places,length:course.length,phase:'walk',direction:-1,s:places.startS,t:0,
    boxes:[false,false,false],dropped:[],low:false,rests:0,fires:0,tells:0,hits:0,maxHits:REX_RULES.level[level].hits,
    penCars:REX_RULES.penCars,hook:newHook(),marker:null,cone:null,throwAt:null,done:null,
    braced:false,scorched:false,first:true,lastBox:-1,throwDue:false,hints:{}};
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
function stand(fight,events){
  if(fight.hook.phase==='attached'||fight.hook.phase==='flying')releaseHook(fight.hook,events);
  fight.low=false;fight.marker=null;fight.cone=null;fight.cableBreath=false;
  fight.throwDue=fight.boxes[1];
  events.push({type:'rise'});
  phase(fight,rexLastRest(fight)?'exit':'walk');
}
function rest(fight,events){
  phase(fight,'rest');fight.low=true;fight.rests++;fight.braced=false;
  events.push({type:'sag'},{type:'boxOpen',box:rexNextBox(fight)});
}
function scorch(fight,events){
  fight.hits++;events.push({type:'scorch',hits:fight.hits});
  if(fight.hits>=fight.maxHits){fight.done={won:false,reason:'toasted'};events.push({type:'toasted'});}
}
function extract(fight,index,events){
  const h=fight.hook;fight.boxes[index]=true;fight.lastBox=index;
  Object.assign(h,{phase:'dragging',time:0,tight:false,pulling:false});
  h.drag={...h.tip,y:h.tip.y-.66};
  fight.marker=null;fight.cone=null;
  events.push({type:'boxOut',box:index,left:rexBoxesLeft(fight)},{type:'drag',box:index});
  if(rexBoxesLeft(fight)===0){
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
  stepHook(fight,truck,dt,course,events);
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
      if(fight.throwDue && fight.penCars){
        fight.throwDue=false;fight.penCars--;
        fight.throwAt={...at,s:truck.s,lateral:truck.lateral};
        phase(fight,'lift');events.push({type:'lift',at:{...fight.throwAt}});
      }else if(fight.t>=2.4 && (Math.abs(distance)<24 || fight.fires===0 || fight.t>=7)){
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
        fight.scorched=true;scorch(fight,events);
      }
      if(fight.t+1e-8>=REX_RULES.fire.seconds && !fight.done){
        events.push({type:'fireEnd'});fight.cone=null;
        if(fight.cableBreath){fight.cableBreath=false;stand(fight,events);}
        else if(fight.fires%level.breaths===0)rest(fight,events);
        else phase(fight,'walk');
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
        if(hit)scorch(fight,events);
        fight.throwAt=null;phase(fight,'walk');
      }
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
  return events;
}
const hints={gone:'rex.gone',toasted:'rex.toasted',noBox:'rex.noBox',slack:'rex.slack',braceStall:'rex.brace',scorch:'rex.scorch',lift:'rex.lift',tell:'rex.tell'};

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
      if(hints[event.type] && !fight.hints[event.type]){
        fight.hints[event.type]=true;sayBowlLine(duel,hints[event.type],{once:true});
      }
      if(event.type==='slack'||event.type==='noBox'||event.type==='braceStall')continue;
      duel.emit({bowlRex:{...event,cue:REX_CUES[event.type]??null}});
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
