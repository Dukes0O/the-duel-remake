import {ironLineLength,sampleIronLine} from '../../iron-line.js';
const distance=(a,b)=>Math.hypot((a?.x??0)-(b?.x??0),(a?.y??0)-(b?.y??0),(a?.z??0)-(b?.z??0));
const at=value=>value?.position??value;

export function stepBoard(step,state,view,dt) {
  const path=step.path??[], length=ironLineLength(path), metres=Math.min(length,(state.trainMetres??0)+(step.speed??8)*dt);
  const train=view.train??view.actors?.find(actor=>actor.id===(step.actorId??step.actor?.id??'iron-mule'));
  const movingTrain={...(train??{}),id:step.actorId??step.actor?.id??'iron-mule',position:sampleIronLine(path,metres),
    speed:metres>=length?0:step.speed??8,roofPlates:train?.roofPlates??[]};
  const plates=movingTrain.roofPlates;
  let stage=state.stage??'ground', index=state.index??0, hold=state.hold??0;
  const player=view.fighter?.position??view.player?.position;
  const nearTrain=distance(player,movingTrain.position)<= (step.grappleRadius??8);
  const line=[];
  const underSpeed=(movingTrain.speed??0)*3.6<=(step.boardUnderKmh??90);
  if(stage==='ground'&&view.onFoot&&nearTrain&&view.grapple&&underSpeed) {
    stage='roof'; index=0;
    if(step.roofLineId) line.push({type:'say',lineId:step.roofLineId});
  }
  if(stage==='roof') {
    const target=plates[index];
    const guards=view.difficulty==='easy'?(step.easyRoofGuards??0):(step.roofGuards??0);
    if(guards>0&&!state.guardPushed&&index===0&&target&&distance(player,target.position??target)<=(target.radius??3)) {
      stage='ground';hold=0;
      if(step.guardLineId)line.push({type:'say',lineId:step.guardLineId});
      return {state:{stage,index,hold,trainMetres:metres,guardPushed:true},complete:false,events:line,
        requests:[{type:'marker',place:target},{type:'train',actorId:movingTrain.id,position:movingTrain.position,path,
          metres,pathLength:length,progress:length?metres/length:1,speed:movingTrain.speed,roofPlates:step.roofWalk}]};
    }
    if(!view.onFoot||distance(player,target?.position??target)>(step.fallDistance??15)) {
      stage='ground';hold=0;
      line.push({type:'fell',plateIndex:index});
      if(step.fallLineId)line.push({type:'say',lineId:step.fallLineId});
      return {state:{stage,index,hold,trainMetres:metres},complete:false,events:line,
        requests:[{type:'marker',place:target??movingTrain.position},{type:'train',actorId:movingTrain.id,position:movingTrain.position,
          path,metres,pathLength:length,progress:length?metres/length:1,speed:movingTrain.speed,roofPlates:step.roofWalk}]};
    }
    if(target&&distance(player,target.position??target)<=(target.radius??3)) {
      index++; hold=0;
      if(index===plates.length&&step.walkLineId)line.push({type:'say',lineId:step.walkLineId});
    }
    if(index>=plates.length) {
      const coupling=at(train?.coupling??step.couplingPosition??movingTrain.position);
      if(view.interact&&distance(player,coupling)<=(step.couplingRadius??3))hold+=dt; else hold=0;
      if(hold>=(step.plantSeconds??1)) {
        stage='clear';hold=0;
        if(step.plantedLineId)line.push({type:'say',lineId:step.plantedLineId});
      }
    }
  } else if(stage==='ground'&&view.onFoot&&view.interact&&nearTrain&&underSpeed) {
    stage='roof';
  }
  if(stage==='clear') {
    if(distance(player,movingTrain.position)>=(step.clearDistance??15)) return {state:{stage,index,hold,trainMetres:metres},complete:true,events:line,
      requests:[]};
  }
  const target=stage==='ground'?movingTrain.position:stage==='clear'?movingTrain.position:plates[Math.min(index,plates.length-1)]?.position;
  return {state:{stage,index,hold,trainMetres:metres},complete:false,events:line,requests:[...(target?[{type:'marker',place:target}]:[]),
    {type:'train',actorId:movingTrain.id,position:movingTrain.position,path,metres,pathLength:length,progress:length?metres/length:1,
      speed:movingTrain.speed,roofPlates:step.roofWalk}]};
}
