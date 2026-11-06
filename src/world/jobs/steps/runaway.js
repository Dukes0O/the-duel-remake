import {ironLineLength, nearestIronLineDistance, sampleIronLine} from '../../iron-line.js';

export function stepRunaway(step,state,view,dt) {
  const path=step.path??[],length=ironLineLength(path);
  if(length<=0)return {state,complete:false,events:[],requests:[]};
  const baseMass=step.massTonnes??70, wagons=step.wagons??{},wagonMass=(wagons.tonnes??0)*(wagons.count??1);
  let coupled=state.coupled===true;
  const mass=coupled?baseMass+wagonMass:baseMass;
  let playerMetres=state.metres??nearestIronLineDistance(path,step.start??path[0]).metres;
  let playerSpeed=state.speed??0,wagonMetres=state.wagonMetres??Math.max(0,playerMetres-(step.startGapMetres??0));
  let wagonSpeed=Math.min(wagons.maxSpeed??Infinity,(state.wagonSpeed??0)+(wagons.gainMs2??0)*dt);
  if(view.controls?.throttle)playerSpeed=Math.min(step.maxSpeed??26,playerSpeed+(step.tractiveKn??80)/mass*dt);
  else if(view.controls?.brake)playerSpeed=Math.max(0,playerSpeed-(step.brakeKn??100)/mass*dt);
  else playerSpeed=Math.max(0,playerSpeed-(step.brakeKn??100)/mass*.12*dt);
  playerMetres=Math.min(length,playerMetres+playerSpeed*dt);wagonMetres=Math.min(length,wagonMetres+wagonSpeed*dt);
  let bounced=false,requests=[],events=[];
  const gap=Math.abs(playerMetres-wagonMetres);
  if(!coupled&&gap<=(step.contactMetres??4)) {
    if(Math.abs(playerSpeed-wagonSpeed)<=(view.difficulty==='easy'?(step.easySoftMs??step.softMs??2):(step.softMs??2))) {
      playerSpeed=(mass*playerSpeed+wagonMass*wagonSpeed)/(mass+wagonMass);coupled=true;
      requests.push({type:'say',lineId:step.caughtLineId});events.push({type:'coupled',massTonnes:mass+wagonMass});
    } else {
      const fasterPlayer=playerSpeed>wagonSpeed;
      playerSpeed=fasterPlayer?Math.max(0,playerSpeed*.45):playerSpeed;
      wagonSpeed=fasterPlayer?wagonSpeed:Math.max(0,wagonSpeed*.45);
      bounced=true;requests.push({type:'say',lineId:step.bounceLineId});events.push({type:'bounced'});
      wagonMetres=Math.max(0,wagonMetres-5);
    }
  }
  const sand=step.sandDrag?nearestIronLineDistance(path,step.sandDrag.place??step.sandDrag).metres:length;
  if(wagonMetres>=sand||playerMetres>=sand) {
    requests.push({type:'say',lineId:step.dragLineId},{type:'sandDrag',place:step.sandDrag?.place??step.sandDrag});
    return {state:{metres:nearestIronLineDistance(path,step.start??path[0]).metres,speed:0,
      wagonMetres:Math.max(0,nearestIronLineDistance(path,step.start??path[0]).metres-(step.startGapMetres??0)),wagonSpeed:0,coupled:false},
      complete:false,events:[...events,{type:'sandDrag'}],requests};
  }
  const stopSpeed=step.stopSpeed??.5,complete=coupled&&playerSpeed<=stopSpeed&&wagonSpeed<=stopSpeed;
  const train={type:'train',actorId:step.actorId??'iron-mule',position:sampleIronLine(path,playerMetres),progress:playerMetres/length,
    speed:playerSpeed,metres:playerMetres,path,pathLength:length};
  const wagon={type:'train',actorId:wagons.id??'runaway-wagons',position:sampleIronLine(path,wagonMetres),progress:wagonMetres/length,
    speed:wagonSpeed,metres:wagonMetres,path,pathLength:length,model:wagons.model};
  requests.push(train,wagon);
  return {state:{metres:playerMetres,speed:playerSpeed,wagonMetres,wagonSpeed,coupled},complete,events,requests};
}
