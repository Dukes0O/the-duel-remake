export function stepWhistle(step,state,view,dt) {
  const target=Math.max(0,Math.floor(step.count??1)),duration=Math.max(0,step.seconds??1);
  let count=state.count??0,held=state.held??0,goatsWalking=state.goatsWalking===true;
  const events=[],requests=[];
  if(view.controls?.whistle===true)held+=dt;else held=0;
  if(count<target&&held>=duration) {
    const lineId=step.lineIds?.[count];count++;held=0;
    if(lineId)requests.push({type:'say',lineId});events.push({type:'whistle',count});
  }
  if(count>=target&&!goatsWalking) {
    goatsWalking=true;
    if(step.goats)requests.push({type:'goats',...step.goats});
    events.push({type:'goatsStarted',route:step.goats??null});
  }
  // Goat movement belongs to the world view. The job clock is the fallback
  // simulation when no actor model is available in this lane.
  const elapsed=(state.goatWaitSec??0)+(goatsWalking?dt:0),wait=step.goats?.seconds??40;
  const complete=goatsWalking&&elapsed>=wait;
  return {state:{...state,count,held,goatsWalking,goatWaitSec:elapsed},complete,events,requests};
}
