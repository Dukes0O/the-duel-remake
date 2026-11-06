// Small deterministic caption sequencer shared by world-job step kinds.
const nextCaption=(queue)=>queue.shift()??null;
export function stepLines(step,state,view,dt,outcome) {
  const base={...state,...(outcome?.state??{})};
  let queue=[...(state.lineQueue??[])], remaining=state.lineRemaining??0;
  let started=state.linesStarted??false, closing=state.linesClosing??false;
  const nonCaption=(outcome?.requests??[]).filter(request=>request.type!=='say');
  queue.push(...(outcome?.requests??[]).filter(request=>request.type==='say'&&request.lineId).map(request=>request.lineId));
  const emit=(lineId, rest=[])=>({state:{...base,lineQueue:rest,lineRemaining:2.2,linesStarted:started,linesClosing:closing},
    complete:false,events:outcome?.events??[],requests:[...nonCaption,{type:'say',lineId}]});
  const skip=view.controls?.whistle===true;
  if(remaining>0&&!skip) {
    remaining=Math.max(0,remaining-dt);
    if(remaining>0)return {...outcome,state:{...base,lineQueue:queue,lineRemaining:remaining,linesStarted:started,linesClosing:closing},
      complete:false,requests:nonCaption};
  }
  if(queue.length) {const lineId=nextCaption(queue);return emit(lineId,queue);}
  if(!started) {
    started=true;
    queue=[...(step.opening??[]),...queue];
    if(step.afterStartLineId)queue.unshift(step.afterStartLineId);
    if(step.startLineId)queue.unshift(step.startLineId);
    if(queue.length) {const result=emit(nextCaption(queue),queue);result.state.linesStarted=true;return result;}
  }
  if(outcome?.complete&&!closing&&(step.closing?.length??0)>0) {
    closing=true;queue.push(...step.closing);
    const result=emit(nextCaption(queue),queue);result.state.linesStarted=started;result.state.linesClosing=true;
    return result;
  }
  return {...outcome,state:{...base,lineQueue:[],lineRemaining:0,linesStarted:started,linesClosing:closing},requests:nonCaption};
}

const distance=(a,b)=>Math.hypot((a?.x??0)-(b?.x??0),(a?.y??0)-(b?.y??0),(a?.z??0)-(b?.z??0));
export function stepLineTriggers(step,state,view,outcome) {
  const sent=new Set(state.triggeredLines??[]), requests=[...(outcome.requests??[])],events=[...(outcome.events??[])];
  const fire=(id,key=id)=>{if(id&&!sent.has(key)){sent.add(key);requests.push({type:'say',lineId:id});}};
  const player=view.fighter?.position??view.player?.position;
  for(const cue of step.sayNear??[]) if(distance(player,cue.place?.position??cue.place)<=(cue.radius??8))fire(cue.lineId,`near:${cue.lineId}`);
  for(const cue of step.sayOnce??[]) if(typeof cue==='string')fire(cue); else if(cue?.lineId&&distance(player,cue.place?.position??cue.place)<=(cue.radius??8))fire(cue.lineId,`once:${cue.lineId}`);
  if(step.nearLineId&&step.actorId) {
    const actor=(view.actors??[]).find(item=>item.id===step.actorId);
    if(actor&&distance(player,actor.position)<=(step.nearRadius??8))fire(step.nearLineId,`near:${step.nearLineId}`);
  }
  if(step.contactLineId&&view.contact===step.actorId)fire(step.contactLineId,`contact:${step.contactLineId}`);
  if(step.peopleLineIds) for(const event of events.filter(item=>item.type==='rescued')) {
    const index=events.filter(item=>item.type==='rescued').indexOf(event);
    fire(step.peopleLineIds[index]??step.peopleLineIds[0],`person:${event.id}`);
  }
  if(step.afterFirstLineId&&events.some(item=>item.type==='rescued'))fire(step.afterFirstLineId,`after-first:${step.afterFirstLineId}`);
  if(step.wonLineId&&outcome.complete)fire(step.wonLineId,`won:${step.wonLineId}`);
  for(const event of events) {
    if(event.type==='waveStarted')fire(step.waves?.[event.wave]?.lineId,`wave:${event.wave}`);
    if(event.type==='used'||event.type==='lit') {
      const place=(step.places??[]).find(item=>item.id===event.id);
      fire(place?.lineId,`place:${event.id}`);fire(place?.thenLineId,`place-then:${event.id}`);
    }
  }
  return {...outcome,state:{...outcome.state,triggeredLines:[...sent]},requests,events};
}
