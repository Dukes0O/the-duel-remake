const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function stepDig(step,state,view,dt=0) {
  const total=Math.max(0,step.tonnes??0);
  const hauled=Math.max(state.haulTonnes??0,view.haulTonnes??0);
  const tonnes=Math.min(total,hauled);
  const previousTonnes=Math.min(total,state.haulTonnes??0);
  const previousFraction=total>0?previousTonnes/total:0;
  const fraction=total>0?tonnes/total:1;
  const said=new Set(state.said??[]);
  const requests=[];
  const events=[];

  for(const cue of step.sayAt??[]) {
    if(!said.has(cue.lineId)&&previousFraction<cue.progress&&fraction>=cue.progress) {
      said.add(cue.lineId);
      requests.push({type:'say',lineId:cue.lineId});
    }
  }

  let taught=state.apprenticeTaught===true;
  if(step.apprentice&&step.taughtLineId&&!taught&&previousFraction<.5&&fraction>=.5) {
    taught=true;
    requests.push({type:'say',lineId:step.taughtLineId});
    requests.push({type:'apprenticeTaught',person:step.apprentice,kind:'dig'});
    events.push({type:'apprenticeTaught',person:step.apprentice});
  }

  let revealed=state.revealed===true;
  if(step.reveals&&!revealed&&fraction>=2/3) {
    revealed=true;
    events.push({type:'reveals',id:step.reveals});
    requests.push({type:'reveals',id:step.reveals});
  }

  const complete=total===0||tonnes>=total;
  const linesCleared=!(state.lineQueue?.length)&&(state.lineRemaining??0)<=dt;
  const handingOver=complete&&linesCleared&&step.handsOverWork&&!state.handedOver;
  if(handingOver) {
    events.push({type:'workHandedOver',work:step.handsOverWork,person:step.apprentice??null});
    requests.push({type:'handsOverWork',work:step.handsOverWork,person:step.apprentice??null});
  }

  requests.push({type:'pile',id:step.id??step.at?.id??step.reveals??null,fraction});
  return {state:{...state,haulTonnes:tonnes,totalTonnes:total,said:[...said],apprenticeTaught:taught,revealed,
    handedOver:state.handedOver===true||handingOver},complete,events,requests};
}
