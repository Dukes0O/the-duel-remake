import assert from 'node:assert/strict';
import {ADAPTIVE_RESOLUTION,createAdaptiveResolution} from '../src/adaptive-resolution.js';

function timeline(controller=createAdaptiveResolution()){
  let now=0;
  controller.sample(now,true);
  return {
    controller,
    frame(ms=1000/60,eligible=true){now+=ms;return controller.sample(now,eligible);},
    run(seconds,fps=60,eligible=true){
      for(let frame=0;frame<Math.round(seconds*fps);frame++)this.frame(1000/fps,eligible);
      return controller.scale;
    },
  };
}

for(const fps of [60,120,144]){
  const clock=timeline();assert.equal(clock.run(90,fps),1,`${fps} Hz never reduces resolution`);
}
{
  const clock=timeline();clock.run(2);clock.frame(180);clock.run(5);
  assert.equal(clock.controller.scale,1,'one large frame is not sustained load');
  clock.run(.7,30);clock.run(5);assert.equal(clock.controller.scale,1,'a short 30 fps dip does not change resolution');
}
{
  const clock=timeline();clock.run(3.8,30);assert.equal(clock.controller.scale,1,'two slow windows and warmup are required');
  clock.run(.6,30);assert.equal(clock.controller.scale,.95,'sustained 30 fps reduces scale by only one step');
  clock.run(2,30);assert.equal(clock.controller.scale,.95,'cooldown prevents consecutive quick resizes');
  assert.equal(clock.run(60,30),.8,'sustained load reaches a bounded, readable minimum');
  clock.run(6);assert.equal(clock.controller.scale,.8,'brief recovery cannot immediately raise resolution');
  clock.run(10);assert.equal(clock.controller.scale,.85,'long stable delivery slowly restores clarity');
  assert.equal(clock.run(90,120),1,'high refresh screens fully recover without exceeding the ceiling');
}
{
  const clock=timeline();clock.run(4.5,30);const scale=clock.controller.scale;
  for(const inactiveReason of ['hidden','paused','loading','countdown','menu','high quality']){
    clock.run(20,30,false);assert.equal(clock.controller.scale,scale,`${inactiveReason} is excluded`);
    clock.run(3,30);assert.equal(clock.controller.scale,scale,`${inactiveReason} clears the old slow-window evidence`);
  }
  clock.controller.reset();assert.equal(clock.controller.scale,scale,'a restart clears anchors but retains measured scale');
  clock.run(3,30);assert.equal(clock.controller.scale,scale,'a restart cannot reuse old slow frames');
  clock.controller.reset(true);assert.equal(clock.controller.scale,1,'explicit full reset restores native scale');
}
{
  const clock=timeline();clock.run(2.6,30);clock.frame(10000);clock.run(3,30);
  assert.equal(clock.controller.scale,1,'a long suspension cannot join two unrelated slow windows');
  for(const invalid of [NaN,Infinity,-Infinity]){
    assert.equal(clock.controller.sample(invalid,true),1,'invalid timestamps cannot change the scale');
    clock.run(3,30);assert.equal(clock.controller.scale,1,'invalid timestamps clear timing history');
  }
  clock.controller.sample(-200,true);clock.controller.sample(-200,true);
  assert.equal(clock.controller.scale,1,'clock reversal and duplicate frames are harmless');
}
{
  const clock=timeline();clock.run(5,30);const reduced=clock.controller.scale;
  for(let loop=0;loop<12;loop++){
    clock.run(1,30);clock.run(2,60);
    assert.equal(clock.controller.scale,reduced,'mixed delivery cannot repeatedly downshift or oscillate');
  }
}
{
  // render3d excludes the next draw after a pixel-ratio resize. That feedback
  // resets timing, but must not permanently prevent further adaptation.
  const controller=createAdaptiveResolution(),changes=[1];let previousRatio=1;
  for(let frame=0;frame<30*60;frame++){
    const ratio=controller.scale,loadingFrame=ratio!==previousRatio;
    if(loadingFrame)changes.push(ratio);
    previousRatio=ratio;controller.sample(frame*1000/30,!loadingFrame);
  }
  assert.deepEqual(changes,[1,.95,.9,.85,.8],'excluding resize frames preserves gradual real-load adaptation');
}
assert.equal(ADAPTIVE_RESOLUTION.targetFps,60);
console.log('Adaptive resolution: sustained-load response, slow recovery, 60/120/144 Hz, brief stalls, exclusions, resets and bounds passed.');
