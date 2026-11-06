import {ironLineLength, nearestIronLineDistance, sampleIronLine} from '../../iron-line.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const CONSIST_TONNES=Object.freeze({'iron-mule-cab':70,'the-2-15':160,'wednesday':30,'iron-mule-wagon':30});

function trainPosition(path,metres,length) {
  const sample=sampleIronLine(path,metres);
  if(metres<=length||path.length<2)return sample;
  const last=path.at(-1)?.position??path.at(-1),previous=path.at(-2)?.position??path.at(-2);
  const dx=last.x-previous.x,dy=last.y-previous.y,dz=last.z-previous.z,segment=Math.hypot(dx,dy,dz);
  if(!segment)return sample;
  const overrun=metres-length;
  return {...sample,x:last.x+dx/segment*overrun,y:last.y+dy/segment*overrun,z:last.z+dz/segment*overrun,
    heading:Math.atan2(dx,dz),distance:metres};
}

function gradeAcceleration(grade,path,metres) {
  if(!grade?.from||!grade?.to||!Number.isFinite(grade.ratio))return 0;
  const from=nearestIronLineDistance(path,grade.from).metres,to=nearestIronLineDistance(path,grade.to).metres;
  if(metres<Math.min(from,to)||metres>Math.max(from,to))return 0;
  return -9.81*grade.ratio;
}

export function stepDrivetrain(step,state,view,dt) {
  const path=step.path??[],length=ironLineLength(path);
  if(length<=0)return {state,complete:false,requests:[]};
  const consistMass=step.consist?.reduce((sum,id)=>sum+(CONSIST_TONNES[id]??0),0)??0;
  const mass=consistMass||(step.massTonnes??100),tractive=step.tractiveKn??80,brake=step.brakeKn??100;
  const acceleration=tractive/mass,deceleration=brake/mass;
  let metres=step.stopMark&&step.stopAtEnd||step.rideAlong?.copiesPlayerStop
    ?Math.max(0,state.metres??0):clamp(state.metres??0,0,length);
  let speed=Math.max(0,state.speed??0),gatePassed=state.gatePassed??false;
  const controls=view.controls??{}, previous=metres, requests=[], events=[];
  const tokenMetres=step.tokenSwap?nearestIronLineDistance(path,step.tokenSwap.place).metres:Infinity;
  const atTokenPlace=!!step.tokenSwap&&!state.tokenSwapped&&metres>=tokenMetres;
  const waitingForSwap=atTokenPlace;
  const targetStop=step.rideAlong?.stopsOnMarkExactly&&step.stopMark
    ?nearestIronLineDistance(path,step.stopMark.place).metres
    :step.rideAlong?.copiesPlayerStop?Math.max(0,length+(view.playerStopMetres??0)):length;
  const rideBraking=!!step.rideAlong&&(state.rideStopped||targetStop-metres<=speed*speed/(2*Math.max(.001,deceleration)));
  const grade=gradeAcceleration(step.grade,path,metres);
  if(step.rideAlong) {
    const throttle=rideBraking?0:1,braking=rideBraking;
    speed=Math.max(0,Math.min(step.maxSpeed??26,speed+(throttle*acceleration-(braking?deceleration:0)+grade)*dt));
  } else if(controls.throttle>0&&!waitingForSwap)
    speed=Math.min(step.maxSpeed??26,Math.max(0,speed+(acceleration+grade)*dt));
  else if(controls.brake>0||waitingForSwap)
    speed=Math.max(0,speed+(-deceleration+grade)*dt);
  else speed=Math.max(0,speed+(-deceleration*.12+grade)*dt);
  const proposed=metres+speed*dt;
  if(step.tokenSwap&&!state.tokenSwapped&&proposed>=tokenMetres){metres=tokenMetres;speed=0;}
  else if(step.rideAlong&&proposed>=targetStop&&rideBraking){metres=targetStop;speed=0;state={...state,rideStopped:true};}
  else if(step.stopAtEnd&&proposed>=length&&(!step.sandDrag||speed<=(step.sandDrag.overMs??0))&&!step.stopMark){metres=length;speed=Math.min(speed,1.5);}
  else if(step.stopMark&&step.stopAtEnd&&proposed>=length+60){metres=length+60;speed=0;}
  else if(step.rideAlong?.copiesPlayerStop)metres=Math.max(0,Math.min(targetStop,proposed));
  else metres=step.stopMark&&step.stopAtEnd?Math.max(0,proposed):clamp(proposed,0,length);

  if(step.otherTrain?.path?.length) {
    const otherLength=ironLineLength(step.otherTrain.path);
    const waitAt=step.otherTrain.waitAt??step.tokenSwap?.place;
    const waitMetres=waitAt?nearestIronLineDistance(step.otherTrain.path,waitAt).metres:otherLength;
    const otherLimit=state.tokenSwapped?otherLength:waitMetres;
    const otherMetres=Math.min(otherLimit,(state.otherTrainMetres??0)+Math.max(0,step.otherTrain.speed??0)*dt);
    requests.push({type:'train',actorId:step.otherTrain.id,position:sampleIronLine(step.otherTrain.path,otherMetres),
      progress:otherLength?otherMetres/otherLength:1,speed:otherMetres>=otherLength?0:step.otherTrain.speed??0,
      metres:otherMetres,path:step.otherTrain.path,pathLength:otherLength,model:step.otherTrain.model});
    state={...state,otherTrainMetres:otherMetres};
  }

  const markMetres=step.stopMark?nearestIronLineDistance(path,step.stopMark.place).metres:Infinity;
  if(step.stopMark&&step.stopAtEnd&&metres>=markMetres-40&&speed<=.05&&!state.stopMarkRecorded) {
    const mark=markMetres,signedError=metres-mark,error=Math.abs(signedError);
    const band=(step.stopMark.bands??[]).findIndex(limit=>error<=limit);
    const lineId=step.stopMark.lineIds?.[band<0?step.stopMark.lineIds.length-1:band];
    requests.push({type:'stopMark',id:step.stopMark.place?.id??null,metres:signedError,error,lineId});
    state={...state,stopMarkRecorded:true,playerStopMetres:signedError};
  }

  if(step.tokenSwap&&!state.tokenSwapped&&metres>=tokenMetres) {
    if(controls.interact||view.interact) {
      if(speed<=.05&&(state.tokenHold??0)+dt>=step.tokenSwap.seconds) {
      state={...state,tokenSwapped:true};requests.push({type:'say',lineId:step.tokenSwap.swapLineId},{type:'tokenSwap'});
      } else if(speed<=.05)state={...state,tokenHold:(state.tokenHold??0)+dt};
    } else if(speed<=.05)state={...state,tokenHold:0};
    if(controls.throttle>0&&!state.noTokenWarned){state={...state,noTokenWarned:true};requests.push({type:'say',lineId:step.tokenSwap.noTokenLineId});}
  }
  if(step.tokenHoop&&!state.tokenHoopPassed) {
    const hoop=nearestIronLineDistance(path,step.tokenHoop.place).metres;
    const easy=view.difficulty==='easy',window=easy?(step.tokenHoop.easyWindowMetres??step.tokenHoop.windowMetres):step.tokenHoop.windowMetres;
    const limit=(easy?(step.tokenHoop.easyKmh??step.tokenHoop.kmh):step.tokenHoop.kmh)/3.6;
    if(Math.abs(metres-hoop)<=window/2&&(controls.interact||view.interact)&&speed<=limit) {
      state={...state,tokenHoopPassed:true};requests.push({type:'tokenHoop'});
    } else if(metres>hoop+window/2) {
      const wasFast=speed>limit;metres=Math.max(0,metres-(step.tokenHoop.backMetres??300));speed=0;
      requests.push({type:'say',lineId:wasFast?step.tokenHoop.fastLineId:step.tokenHoop.missLineId});
    }
  }

  if(step.gate&&!gatePassed) {
    const gate=nearestIronLineDistance(path,step.gate.place).metres;
    if(previous<=gate&&metres>=gate) {
      const minimum=view.difficulty==='easy'?(step.gate.easySpeed??step.gate.speed??20):(step.gate.speed??20);
      if(speed<minimum){metres=Math.max(0,gate-300);speed=0;requests.push({type:'say',lineId:step.gate.tooSlowLineId});events.push({type:'gateBounced'});}
      else{gatePassed=true;requests.push({type:'say',lineId:step.gate.throughLineId});events.push({type:'gateBroken'});}
    }
  }
  const crushed=new Set(state.crushedPickups??[]);
  for(const pickup of step.crushOnTrack??[])if(!crushed.has(pickup.id)&&previous/length<pickup.progress&&metres/length>=pickup.progress){
    crushed.add(pickup.id);speed=Math.max(0,speed-2);events.push({type:'pickupCrushed',id:pickup.id});
  }
  const sayAt=step.sayAt??[],said=new Set(state.said??[]);
  for(const cue of sayAt)if(!said.has(cue.lineId)&&previous/length<cue.progress&&metres/length>=cue.progress){said.add(cue.lineId);requests.push({type:'say',lineId:cue.lineId});}
  if(step.apprentice&&step.taughtLineId&&metres/length>=(step.teachAt??.5)&&!state.apprenticeTaught){
    state={...state,apprenticeTaught:true};requests.push({type:'say',lineId:step.taughtLineId},{type:'apprenticeTaught',person:step.apprentice,kind:'driving'});
  }
  const atEnd=metres>=length-.01;
  let complete=step.stopMark?state.stopMarkRecorded:
    step.rideAlong?.copiesPlayerStop?state.rideStopped&&speed<=.05:
    step.stopAtEnd?atEnd&&speed<=.05:atEnd&&(!step.gate||gatePassed);
  if(step.tokenSwap&&!state.tokenSwapped)complete=false;
  if(step.rideAlong&&complete&&step.rideAlong.copiesPlayerStop&&view.playerStopMetres!=null&&!state.copiedStop){
    requests.push({type:'say',lineId:Math.abs(view.playerStopMetres)<=(step.goodStopMetres??3)?step.rideAlong.goodLineId:step.rideAlong.badLineId});
    state={...state,copiedStop:true,copiedStopMetres:view.playerStopMetres};
  }
  if(step.sandDrag) {
    const dragPlace=step.sandDrag.place??step.sandDrag,drag=nearestIronLineDistance(path,dragPlace).metres;
    const threshold=typeof step.sandDrag==='object'?(step.sandDrag.overMs??0):0;
    if(metres>=drag&&speed>threshold){
      metres=step.sandDrag.backTo?nearestIronLineDistance(path,step.sandDrag.backTo).metres:0;speed=0;
      state={...state,sandDragged:true};requests.push({type:'say',lineId:step.sandDrag.lineId??step.dragLineId},{type:'sandDrag',place:dragPlace});
    }
  }
  const place=trainPosition(path,metres,length);
  requests.push({type:'train',actorId:step.actorId??'iron-mule',position:place,progress:metres/length,speed,metres,path,pathLength:length,
    roofPlates:step.roofPlates??['tank-wagon-2','tank-wagon-1']});
  return {state:{...state,metres,speed,gatePassed,said:[...said],crushedPickups:[...crushed]},complete,events,requests};
}
