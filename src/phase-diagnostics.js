// Opt-in CPU attribution for a bounded review, not a game telemetry service.
// CPU submission time is not GPU execution time. App and renderer have separate
// RAF callbacks, so their measured samples must not be added to RAF intervals.
export function createPhaseDiagnostics({capacity=180,clock=()=>performance.now()}={}) {
  if(!Number.isInteger(capacity)||capacity<1||capacity>600)throw new RangeError('Diagnostic capacity must be 1–600 frames.');
  const names=['simulation','audio','hud','appTotal','rendererUpdate','renderSubmit'];
  const values=Object.fromEntries(names.map(name=>[name,new Float64Array(capacity)]));
  let running=false,appCount=0,rendererCount=0,after=-Infinity,lastApp=-Infinity,lastRenderer=-Infinity,hudSource='custom callback';
  const validTime=(timestamp,previous)=>Number.isFinite(timestamp)&&timestamp>after&&timestamp>previous;
  const validDuration=value=>Number.isFinite(value)&&value>=0;
  function summarize(name,count){
    if(!count)return null;
    const sorted=values[name].slice(0,count).sort(),round=value=>Math.round(value*1000)/1000;
    return {samples:count,p50Ms:round(sorted[Math.ceil(count*.5)-1]),p95Ms:round(sorted[Math.ceil(count*.95)-1]),maxMs:round(sorted[count-1])};
  }
  return Object.freeze({
    get active(){return running;},
    now:clock,
    start({afterTimestamp=-Infinity,hud='custom callback'}={}){
      if(afterTimestamp!==-Infinity&&!Number.isFinite(afterTimestamp))throw new TypeError('Invalid diagnostic start timestamp.');
      appCount=rendererCount=0;lastApp=lastRenderer=-Infinity;after=afterTimestamp;hudSource=String(hud);running=true;
    },
    recordAppFrame(timestamp,simulationMs,audioMs,hudMs){
      if(!running||!validTime(timestamp,lastApp)||!validDuration(simulationMs)||!validDuration(audioMs)||!validDuration(hudMs))return false;
      const index=appCount++;lastApp=timestamp;
      values.simulation[index]=simulationMs;values.audio[index]=audioMs;values.hud[index]=hudMs;
      values.appTotal[index]=simulationMs+audioMs+hudMs;
      // Fail closed if a reviewer leaves a probe attached after its sample.
      if(appCount===capacity)running=false;
      return true;
    },
    recordRendererFrame(timestamp,updateMs,submitMs){
      if(!running||rendererCount===capacity||!validTime(timestamp,lastRenderer)||!validDuration(updateMs)||!validDuration(submitMs))return false;
      const index=rendererCount++;lastRenderer=timestamp;
      values.rendererUpdate[index]=updateMs;values.renderSubmit[index]=submitMs;
      return true;
    },
    stop(){running=false;},
    summary(){
      return {hudSource,appFrames:appCount,rendererFrames:rendererCount,capacity,
        cpuMs:Object.fromEntries(names.map(name=>[name,summarize(name,name==='rendererUpdate'||name==='renderSubmit'?rendererCount:appCount)]))};
    },
  });
}
