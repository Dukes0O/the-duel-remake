// Scheduling and lifetime control only. The renderer supplies the GPU work.
// A completed/failed/timed-out warmup permits a draw; only that completed draw
// should release the App's simulation gate. No GPU work can be cancelled here.
export const isRenderWarmupEnabled=search=>new URLSearchParams(search).get('warmup')==='1';

// compileAsync submits synchronously before returning its promise. Restore the
// render target immediately, while compiling the same linear variants used by
// the composer's colour pass rather than the canvas's tone-mapped variants.
export function compileWarmupScene(renderer,scene,camera,target){
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace?.()??0,level=renderer.getActiveMipmapLevel?.()??0;
  try{renderer.setRenderTarget(target);return renderer.compileAsync(scene,camera);}
  finally{renderer.setRenderTarget(previous,face,level);}
}

export function createRenderWarmup({
  schedule=afterPaint,
  cancelSchedule=cancelAfterPaint,
  setTimer=(callback,delay)=>setTimeout(callback,delay),
  clearTimer=id=>clearTimeout(id),
  timeoutMs=15000,
}={}){
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new RangeError('Warmup timeout must be positive.');
  let current=null,generation=0,disposed=false;
  const jobs=new WeakMap(),pending=new Set(),idleReleases=[],finalReleases=new Set();
  const idle=Object.freeze({status:'idle',canDraw:false,key:null,generation:0});
  const stopped=Object.freeze({status:'disposed',canDraw:false,key:null,generation:0});

  function update(job,status,error){
    job.state=Object.freeze({status,canDraw:status==='ready'||status==='fallback',key:job.key,generation:job.generation,...(error?{error}: {})});
  }
  function finishTicket(job,status,error){
    if(job.completed)return;
    job.completed=true;
    if(job.timer!==null){clearTimer(job.timer);job.timer=null;}
    if(job.scheduled!==null){cancelSchedule(job.scheduled);job.scheduled=null;}
    update(job,status,error);job.resolve(job.state);
  }
  function releaseJob(job){
    pending.delete(job);
    const callbacks=job.releases.splice(0);
    if(!pending.size)callbacks.push(...idleReleases.splice(0));
    // Each callback owns its own resources. A failed callback must not prevent
    // the remaining retained worlds/renderer from releasing theirs.
    const errors=[];
    for(const callback of callbacks)try{callback();}catch(error){errors.push(error);}
    return errors;
  }
  function settleWork(job,error){
    job.settled=true;
    if(!job.completed)finishTicket(job,error?'fallback':'ready',error);
    job.releaseErrors=releaseJob(job);
  }
  function start(job){
    job.scheduled=null;
    if(disposed||current!==job||job.completed)return;
    job.started=true;pending.add(job);update(job,'compiling');
    try{
      // Calling compile may submit synchronous work. Scheduling this function
      // after a paint lets the loading UI appear before that submission.
      Promise.resolve(job.compile()).then(()=>settleWork(job),error=>settleWork(job,error));
    }catch(error){settleWork(job,error);}
  }

  return{
    request(key,compile){
      if(disposed)return null;
      if(key==null)throw new TypeError('Warmup needs an actual world/revision key.');
      if(typeof compile!=='function')throw new TypeError('Warmup needs a compile callback.');
      if(current?.key===key)return current.ticket;
      if(current&&!current.completed)finishTicket(current,'stale');
      let resolve;
      const promise=new Promise(done=>{resolve=done;});
      const job={key,compile,generation:++generation,resolve,completed:false,started:false,settled:false,releases:[],releaseErrors:[],scheduled:null,timer:null};
      update(job,'scheduled');
      const ticket=Object.freeze({key,generation:job.generation,promise,get state(){return job.state;},get releaseErrors(){return job.releaseErrors;}});
      job.ticket=ticket;jobs.set(ticket,job);current=job;
      job.timer=setTimer(()=>finishTicket(job,'fallback',new Error('Shader warmup timed out.')),timeoutMs);
      job.scheduled=schedule(()=>start(job));
      return ticket;
    },
    get state(){return disposed?stopped:current?.state||idle;},
    canDraw(key){return !disposed&&current?.key===key&&current.state.canDraw;},
    isCurrent(ticket){return !disposed&&current?.ticket===ticket;},
    // Three r171 compileAsync polls renderer material properties internally.
    // Do not dispose a submitted job's materials until the native promise has
    // settled, even if the UI ticket already timed out or became stale.
    releaseWhenSettled(ticket,release){
      if(typeof release!=='function')throw new TypeError('Resource release must be a function.');
      const job=jobs.get(ticket);
      if(!job)throw new TypeError('Unknown warmup ticket.');
      if(job.started&&!job.settled)job.releases.push(release);else release();
    },
    releaseWhenIdle(release){
      if(typeof release!=='function')throw new TypeError('Resource release must be a function.');
      if(pending.size)idleReleases.push(release);else release();
    },
    dispose(release){
      if(!disposed){disposed=true;if(current&&!current.completed)finishTicket(current,'disposed');}
      if(release){
        if(typeof release!=='function')throw new TypeError('Resource release must be a function.');
        if(finalReleases.has(release))return;
        finalReleases.add(release);
        if(pending.size)idleReleases.push(release);else release();
      }
    },
  };
}

function afterPaint(callback){
  const job={first:null,second:null,timer:null,cancelled:false};
  if(typeof requestAnimationFrame==='function'){
    job.first=requestAnimationFrame(()=>{
      if(!job.cancelled)job.second=requestAnimationFrame(()=>{if(!job.cancelled)callback();});
    });
  }else job.timer=setTimeout(callback,0);
  return job;
}
function cancelAfterPaint(job){
  job.cancelled=true;
  if(job.first!==null)cancelAnimationFrame(job.first);
  if(job.second!==null)cancelAnimationFrame(job.second);
  if(job.timer!==null)clearTimeout(job.timer);
}
