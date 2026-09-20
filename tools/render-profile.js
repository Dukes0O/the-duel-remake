// QA-only, bounded pass attribution. GPU queries are polled, never waited on.
// CPU time measures submission and may include driver stalls; it is not GPU time.
export function startRenderProfile({renderer,composer}, {frames=120,warmup=30,clock=()=>performance.now()}={}) {
  if(!Number.isInteger(frames)||frames<1||frames>600||!Number.isInteger(warmup)||warmup<0||warmup>120)throw new RangeError('Invalid profile window.');
  const gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const rows=[],pending=[],restores=[];
  let stopped=false,disjoint=false;
  const disposeQueries=()=>{for(const entry of pending)gl.deleteQuery(entry.query);pending.length=0;};
  function poll(){
    if(!ext||disjoint)return;
    if(gl.getParameter(ext.GPU_DISJOINT_EXT)){
      disjoint=true;disposeQueries();for(const row of rows)row.gpu.length=0;return;
    }
    for(let i=pending.length-1;i>=0;i--){
      const entry=pending[i];
      if(!gl.getQueryParameter(entry.query,gl.QUERY_RESULT_AVAILABLE))continue;
      const value=gl.getQueryParameter(entry.query,gl.QUERY_RESULT)/1e6;
      if(Number.isFinite(value)&&value>=0)entry.row.gpu.push(value);
      gl.deleteQuery(entry.query);pending.splice(i,1);
    }
  }
  for(const pass of composer.passes){
    const row={name:pass.name||pass.constructor.name,cpu:[],gpu:[],draws:[],triangles:[],seen:0};rows.push(row);
    const original=pass.render;
    function measured(...args){
      poll();
      const capture=row.seen++>=warmup&&row.cpu.length<frames;
      if(!capture)return original.apply(this,args);
      // Bounded outstanding work; another profiler's active query is respected.
      let query=null;
      if(ext&&!disjoint&&pending.length<32&&!gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){
        query=gl.createQuery();if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
      }
      const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles,start=clock();
      try{return original.apply(this,args);}
      finally{
        row.cpu.push(clock()-start);row.draws.push(renderer.info.render.calls-calls);row.triangles.push(renderer.info.render.triangles-triangles);
        if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query,row});}
      }
    }
    pass.render=measured;
    restores.push(()=>{if(pass.render===measured)pass.render=original;});
  }
  function restore(){if(stopped)return;stopped=true;restores.forEach(fn=>fn());disposeQueries();}
  return {
    stop(){
      if(stopped)return null;
      poll();
      const report={gpuStatus:!ext?'unsupported':disjoint?'disjoint — discarded':'available (completed queries only)',passes:rows.filter(row=>row.cpu.length).map(row=>({pass:row.name,cpuMs:summary(row.cpu),gpuMs:summary(row.gpu),draws:summary(row.draws),triangles:summary(row.triangles)}))};
      restore();return report;
    },
    cancel:restore,
  };
}

function summary(values){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b),round=x=>Math.round(x*100)/100;
  return {samples:sorted.length,p50:round(sorted[Math.ceil(sorted.length*.5)-1]),p95:round(sorted[Math.ceil(sorted.length*.95)-1]),max:round(sorted.at(-1))};
}
