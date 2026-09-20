// CPU and frame-pacing evidence only: composer submission time is not GPU time.
// Samples are bounded by count, not wall time, and recording allocates nothing.
export function createFrameMetrics({capacity=240,publishIntervalMs=1000,jankMs=1000/30}={}) {
  if(!Number.isInteger(capacity)||capacity<1||capacity>10000)throw new RangeError('Frame sample capacity must be an integer from 1 to 10000.');
  if(!Number.isFinite(publishIntervalMs)||publishIntervalMs<=0||!Number.isFinite(jankMs)||jankMs<=0)throw new RangeError('Frame metric intervals must be positive.');
  const intervals=new Float64Array(capacity),cpu=new Float64Array(capacity);
  const orderedIntervals=new Float64Array(capacity),orderedCpu=new Float64Array(capacity);
  let count=0,next=0,total=0,jankCount=0,lastTime=NaN,lastPublished=NaN;
  function reset(){count=0;next=0;total=0;jankCount=0;lastTime=NaN;lastPublished=NaN;}
  return {
    reset,
    // Loading, warmup, a hidden tab or a manual debug draw breaks the pair of
    // consecutive RAF frames. It must not turn the elapsed gap into a sample.
    suspend(){lastTime=NaN;},
    record(now,cpuRenderMs){
      if(!Number.isFinite(now)||!Number.isFinite(cpuRenderMs)||cpuRenderMs<0){lastTime=NaN;return false;}
      if(!Number.isFinite(lastPublished))lastPublished=now;
      const interval=now-lastTime;lastTime=now;
      if(!Number.isFinite(interval)||interval<=0)return false;
      if(count===capacity){total-=intervals[next];if(intervals[next]>jankMs)jankCount--;}
      else count++;
      intervals[next]=interval;cpu[next]=cpuRenderMs;total+=interval;
      if(interval>jankMs)jankCount++;
      next=(next+1)%capacity;
      return true;
    },
    // Only this infrequent read sorts buffers and allocates a small summary.
    // Nearest-rank percentiles include visible stalls rather than trimming them.
    summary(now){
      if(!count||!Number.isFinite(now)||!Number.isFinite(lastPublished)||now-lastPublished<publishIntervalMs)return null;
      lastPublished=now;
      orderedIntervals.fill(Infinity);orderedCpu.fill(Infinity);
      for(let i=0;i<count;i++){orderedIntervals[i]=intervals[i];orderedCpu[i]=cpu[i];}
      orderedIntervals.sort();orderedCpu.sort();
      const median=Math.ceil(count*.5)-1,p95=Math.ceil(count*.95)-1;
      return {samples:count,windowMs:total,fps:1000*count/total,
        frameMsP50:orderedIntervals[median],frameMsP95:orderedIntervals[p95],frameMsMax:orderedIntervals[count-1],jankCount,
        cpuRenderMsP50:orderedCpu[median],cpuRenderMsP95:orderedCpu[p95],cpuRenderMsMax:orderedCpu[count-1]};
    },
  };
}
