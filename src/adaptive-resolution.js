// Learn from delivered animation frames, not hardware names or memory size.
// This changes only the 3D render scale; HUD and menus remain native-resolution DOM.
export const ADAPTIVE_RESOLUTION=Object.freeze({
  minScale:.8,maxScale:1,step:.05,
  targetFps:60,slowFrameMs:20,stableFrameMs:17.5,
  windowMs:1500,warmupMs:1000,maxGapMs:250,
  slowFrameShare:.65,stableSlowShare:.1,slowWindows:2,
  cooldownMs:4000,recoveryMs:12000,
});

export function createAdaptiveResolution(){
  const policy=ADAPTIVE_RESOLUTION;
  let scale=policy.maxScale,last=NaN,warmupMs=policy.warmupMs;
  let elapsed=0,frames=0,slowFrames=0,slowWindows=0,stableMs=0,cooldownMs=0;
  function clearWindow(){elapsed=0;frames=0;slowFrames=0;}
  function reset(restoreScale=false){
    last=NaN;warmupMs=policy.warmupMs;clearWindow();slowWindows=0;stableMs=0;
    // Only eligible driving time can consume the cooldown. A pause must not
    // allow a second resize immediately on resuming.
    if(restoreScale){scale=policy.maxScale;cooldownMs=0;}
    return scale;
  }
  function changeScale(direction){
    scale=Math.max(policy.minScale,Math.min(policy.maxScale,
      Math.round((scale+direction*policy.step)*100)/100));
    cooldownMs=policy.cooldownMs;slowWindows=0;stableMs=0;
  }
  return {
    get scale(){return scale;},
    reset,
    sample(nowMs,eligible){
      if(!eligible||!Number.isFinite(nowMs)){reset();return scale;}
      if(!Number.isFinite(last)){last=nowMs;return scale;}
      const dt=nowMs-last;last=nowMs;
      // Tab suspension, clock resets and loading stalls are not a sustained
      // graphics bottleneck. Discard them instead of reducing image quality.
      if(dt<=0||dt>policy.maxGapMs){reset();last=nowMs;return scale;}
      if(warmupMs>0){warmupMs=Math.max(0,warmupMs-dt);return scale;}
      cooldownMs=Math.max(0,cooldownMs-dt);
      elapsed+=dt;frames++;if(dt>policy.slowFrameMs)slowFrames++;
      if(elapsed<policy.windowMs)return scale;
      const average=elapsed/frames,slowShare=slowFrames/frames;
      if(average>policy.slowFrameMs&&slowShare>=policy.slowFrameShare){
        slowWindows=Math.min(policy.slowWindows,slowWindows+1);stableMs=0;
        if(slowWindows>=policy.slowWindows&&cooldownMs===0&&scale>policy.minScale)changeScale(-1);
      }else{
        slowWindows=0;
        if(average<=policy.stableFrameMs&&slowShare<=policy.stableSlowShare){
          stableMs+=elapsed;
          if(stableMs>=policy.recoveryMs&&cooldownMs===0&&scale<policy.maxScale)changeScale(1);
        }else stableMs=0;
      }
      clearWindow();return scale;
    },
  };
}
