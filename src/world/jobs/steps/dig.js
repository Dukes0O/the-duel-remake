export function stepDig(step,state,view,dt) {
  const total=Math.max(0,step.tonnes??0),load=Math.max(0,step.loadTonnes??20);
  let tonnes=Math.max(0,state.tonnes??total),revealed=state.revealed===true;
  const working=state.handedOver===true||view.controls?.dig===true||view.interact===true;
  const dug=working?Math.min(tonnes,load*dt):0;
  tonnes-=dug;
  const events=[],requests=[];
  if(dug>0)events.push({type:'dug',tonnes:dug,remainingTonnes:tonnes});
  if(step.reveals&&!revealed&&total>0&&tonnes<=total*.67) {
    revealed=true;events.push({type:'reveals',id:step.reveals});requests.push({type:'reveals',id:step.reveals});
  }
  if(step.apprentice&&step.taughtLineId&&total>0&&tonnes<=total*.5&&!state.apprenticeTaught) {
    requests.push({type:'say',lineId:step.taughtLineId},{type:'apprenticeTaught',person:step.apprentice,kind:'dig'});
    state={...state,apprenticeTaught:true,...(step.handsOverWork?{handedOver:true}:{})};
    if(step.handsOverWork)events.push({type:'workHandedOver',work:step.handsOverWork,person:step.apprentice});
  }
  const complete=tonnes<=0;
  return {state:{...state,tonnes,totalTonnes:total,revealed},complete,events,requests};
}
