// Small deterministic caption sequencer shared by world-job step kinds.
const nextCaption=(queue)=>queue.shift()??null;
export function stepLines(step,state,view,dt,outcome) {
  const base={...state,...(outcome?.state??{})};
  let queue=[...(state.lineQueue??[])], remaining=state.lineRemaining??0;
  let started=state.linesStarted??false, closing=state.linesClosing??false;
  const lineHistory=new Set(state.lineHistory??[]);
  const nonCaption=(outcome?.requests??[]).filter(request=>request.type!=='say');
  const newlyRequested=(outcome?.requests??[]).filter(request=>request.type==='say'&&request.lineId).map(request=>request.lineId);
  // afterStartLineId is one line id or a list of them, played in order after startLineId.
  const afterStart=[].concat(step.afterStartLineId??[]);
  const once=new Set([step.startLineId,...afterStart,...(step.opening??[]),...(step.closing??[])].filter(Boolean));
  for(const lineId of newlyRequested) {
    if(once.has(lineId)&&lineHistory.has(lineId))continue;
    queue.push(lineId);if(once.has(lineId))lineHistory.add(lineId);
  }
  const emit=(lineId, rest=[], blocking=false)=>({state:{...base,lineQueue:rest,lineRemaining:2.2,
    lineBlocking:blocking,lineHistory:[...lineHistory],linesStarted:started,linesClosing:closing},
    complete:false,events:outcome?.events??[],requests:[...nonCaption,{type:'say',lineId}]});
  const skip=state.lineBlocking&&view.controls?.whistle===true;
  if(remaining>0&&!skip) {
    remaining=Math.max(0,remaining-dt);
    if(remaining>0)return {...outcome,state:{...base,lineQueue:queue,lineRemaining:remaining,
      lineBlocking:state.lineBlocking===true,lineHistory:[...lineHistory],linesStarted:started,linesClosing:closing},requests:nonCaption};
  }
  if(queue.length) {
    const lineId=nextCaption(queue), blocking=state.lineBlocking===true&&remaining>0||
      [...(state.carriedLines??[]),...(step.opening??[]),...(step.closing??[])].includes(lineId);
    return emit(lineId,queue,blocking);
  }
  if(!started) {
    started=true;
    // Order: what the step before left waiting, the opening that holds the step, then the start lines.
    const opening=[...(state.carriedLines??[]),...(step.opening??[])];
    for(const lineId of opening) if(!lineHistory.has(lineId)) {queue.push(lineId);lineHistory.add(lineId);}
    for(const lineId of [step.startLineId,...afterStart])
      if(lineId&&!lineHistory.has(lineId)) {queue.push(lineId);lineHistory.add(lineId);}
    if(queue.length) {const lineId=nextCaption(queue);const result=emit(lineId,queue,opening.includes(lineId));
      result.state.linesStarted=true;return result;}
  }
  if(outcome?.complete&&!closing&&(step.closing?.length??0)>0) {
    closing=true;
    for(const lineId of step.closing) if(!lineHistory.has(lineId)) {queue.push(lineId);lineHistory.add(lineId);}
    const lineId=nextCaption(queue),result=emit(lineId,queue,true);result.state.linesStarted=started;result.state.linesClosing=true;
    return result;
  }
  return {...outcome,state:{...base,lineQueue:[],lineRemaining:0,lineBlocking:false,
    lineHistory:[...lineHistory],linesStarted:started,linesClosing:closing},requests:nonCaption};
}

const distance=(a,b)=>Math.hypot((a?.x??0)-(b?.x??0),(a?.y??0)-(b?.y??0),(a?.z??0)-(b?.z??0));
export function stepLineTriggers(step,state,view,outcome) {
  const sent=new Set(state.triggeredLines??[]), requests=[...(outcome.requests??[])],events=[...(outcome.events??[])];
  const fire=(id,key=id)=>{if(id&&!sent.has(key)){sent.add(key);requests.push({type:'say',lineId:id});}};
  const player=view.fighter?.position??view.player?.position;
  for(const cue of step.sayNear??[]) if(distance(player,cue.place?.position??cue.place)<=(cue.radius??8))fire(cue.lineId,`near:${cue.lineId}`);
  for(const cue of step.sayOnce??[]) if(typeof cue==='string')fire(cue); else if(cue?.lineId&&distance(player,cue.place?.position??cue.place)<=(cue.radius??8))fire(cue.lineId,`once:${cue.lineId}`);
  // sayAtShare: [{share, lineId}] plays a line once, when the step's actor has gone that share (0 to 1) of its road.
  const sharer=step.sayAtShare?(view.actors??[]).find(item=>item.id===step.actorId):null;
  for(const cue of step.sayAtShare??[]) if((sharer?.share??0)>=cue.share)fire(cue.lineId,`share:${cue.lineId}`);
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
