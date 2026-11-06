import {ironLineLength, nearestIronLineDistance, sampleIronLine} from '../../iron-line.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function stepDrivetrain(step, state, view, dt) {
  const path=step.path??[], length=ironLineLength(path);
  if(length<=0) return {state,complete:false,requests:[]};
  const tractive=step.tractiveKn??80, brake=step.brakeKn??100, mass=step.massTonnes??100;
  const acceleration=tractive/mass, deceleration=brake/mass;
  let metres=clamp(state.metres??0,0,length), speed=Math.max(0,state.speed??0), gatePassed=state.gatePassed??false;
  const controls=view.controls??{};
  if(controls.throttle>0) speed=Math.min(step.maxSpeed??26,speed+acceleration*dt);
  else if(controls.brake>0) speed=Math.max(0,speed-deceleration*dt);
  else speed=Math.max(0,speed-deceleration*.12*dt);
  const previous=metres, proposed=metres+speed*dt;
  if(step.stopAtEnd&&proposed>=length) {metres=length;speed=Math.min(speed,1.5);}
  else metres=clamp(proposed,0,length);
  let events=[],requests=[];
  if(step.gate&&!gatePassed) {
    const gate=nearestIronLineDistance(path,step.gate.place).metres;
    if(previous<=gate&&metres>=gate) {
      const minimumSpeed=view.difficulty==='easy'?(step.gate.easySpeed??step.gate.speed??20):(step.gate.speed??20);
      if(speed<minimumSpeed) {
        metres=Math.max(0,gate-300); speed=0;
        requests.push({type:'say',lineId:step.gate.tooSlowLineId});
        events.push({type:'gateBounced'});
      } else {
        gatePassed=true;
        requests.push({type:'say',lineId:step.gate.throughLineId});
        events.push({type:'gateBroken'});
      }
    }
  }
  const crushed=new Set(state.crushedPickups??[]);
  for(const pickup of step.crushOnTrack??[]) {
    if(!crushed.has(pickup.id)&&previous/length<pickup.progress&&metres/length>=pickup.progress) {
      crushed.add(pickup.id);speed=Math.max(0,speed-2);events.push({type:'pickupCrushed',id:pickup.id});
    }
  }
  const place=sampleIronLine(path,metres);
  requests.push({type:'train', actorId:step.actorId??'iron-mule', position:place, progress:metres/length, speed,
    metres,path,pathLength:length,roofPlates:step.roofPlates??['tank-wagon-2','tank-wagon-1']});
  const sayAt=step.sayAt??[];
  const said=new Set(state.said??[]);
  for(const cue of sayAt) if(!said.has(cue.lineId)&&previous/length<cue.progress&&metres/length>=cue.progress) {
    said.add(cue.lineId); requests.push({type:'say',lineId:cue.lineId});
  }
  const atEnd=metres>=length-0.01;
  const complete=step.stopAtEnd?atEnd&&speed<=0.05:atEnd&&(!step.gate||gatePassed);
  return {state:{metres,speed,gatePassed,said:[...said],crushedPickups:[...crushed]},complete,events,requests};
}
