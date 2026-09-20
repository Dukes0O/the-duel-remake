import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFrameMetrics} from '../src/frame-metrics.js';

let checks=0;
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const check=(value,label)=>{assert.ok(value,label);checks++;};
const near=(a,b,label)=>check(Math.abs(a-b)<1e-8,label);
{
  const metrics=createFrameMetrics();
  equal(metrics.summary(1000),null,'no made-up measurements before a frame');
  equal(metrics.record(0,999),false,'first frame is only an interval anchor');
  for(let frame=1;frame<=60;frame++)equal(metrics.record(frame*20,frame/10),true,'consecutive frames are accepted');
  equal(metrics.summary(999),null,'publishing is bounded to about once a second');
  const summary=metrics.summary(1200);
  equal(summary.samples,60,'sample count describes accepted frame intervals');
  equal(summary.windowMs,1200,'window duration is the sum of included intervals');
  equal([summary.fps,summary.frameMsP50,summary.frameMsP95,summary.frameMsMax,summary.jankCount],[50,20,20,20,0]);
  near(summary.cpuRenderMsP50,3,'CPU median is separate from RAF intervals');near(summary.cpuRenderMsP95,5.7);near(summary.cpuRenderMsMax,6);
  equal(metrics.summary(1201),null,'repeated reads do not repeatedly publish or sort');
}
{
  const metrics=createFrameMetrics({capacity:4,publishIntervalMs:1});
  metrics.record(0,999);
  for(const [now,cpu]of [[10,1],[30,2],[70,4],[1070,8]])metrics.record(now,cpu);
  equal(metrics.summary(1070),{samples:4,windowMs:1070,fps:4000/1070,frameMsP50:20,frameMsP95:1000,frameMsMax:1000,jankCount:2,cpuRenderMsP50:2,cpuRenderMsP95:8,cpuRenderMsMax:8},'a long visible stall remains real jank');
  for(const [now,cpu]of [[1080,.5],[1090,.6],[1100,.7],[1110,.8]])metrics.record(now,cpu);
  equal(metrics.summary(1110),{samples:4,windowMs:40,fps:100,frameMsP50:10,frameMsP95:10,frameMsMax:10,jankCount:0,cpuRenderMsP50:.6,cpuRenderMsP95:.8,cpuRenderMsMax:.8},'overwriting the ring evicts old maxima, jank and CPU samples');
}
{
  const metrics=createFrameMetrics({publishIntervalMs:1});
  metrics.record(0,1);metrics.record(16,2);metrics.suspend();
  equal(metrics.record(120000,999),false,'a hidden, loading or warmup gap is not a frame interval');
  metrics.record(120020,3);
  equal(metrics.summary(120020),{samples:2,windowMs:36,fps:2000/36,frameMsP50:16,frameMsP95:20,frameMsMax:20,jankCount:0,cpuRenderMsP50:2,cpuRenderMsP95:3,cpuRenderMsMax:3},'resumed frames contain neither suspended time nor first-frame compilation CPU');
  metrics.reset();equal(metrics.summary(120021),null,'scene or quality reset clears the complete window');
  metrics.record(120030,1);metrics.record(120060,4);
  equal(metrics.summary(120060).samples,1,'a reset starts a fresh bounded window');
}
{
  const metrics=createFrameMetrics({publishIntervalMs:1});
  for(const [now,cpu]of [[NaN,2],[Infinity,2],[0,NaN],[0,Infinity],[0,-1]])equal(metrics.record(now,cpu),false,'invalid measurements cannot enter the window');
  metrics.record(10,1);equal(metrics.record(10,1),false,'duplicate timestamps are not extra frames');
  equal(metrics.record(9,1),false,'clock reversal is not a negative frame');
  metrics.record(20,2);equal(metrics.summary(20).frameMsMax,11,'valid recording recovers from a clock discontinuity');
}
{
  const metrics=createFrameMetrics({capacity:3,publishIntervalMs:1,jankMs:20});
  metrics.record(0,0);metrics.record(20,0);metrics.record(41,0);
  equal(metrics.summary(41).jankCount,1,'jank comparison is strictly above its declared threshold');
  for(let frame=1;frame<=10000;frame++)metrics.record(41+frame*16,2);
  const summary=metrics.summary(160041);equal(summary.samples,3,'long sessions cannot grow the ring');near(summary.windowMs,48);equal(summary.jankCount,0);
}
for(const options of [{capacity:0},{capacity:1.5},{capacity:10001},{publishIntervalMs:0},{jankMs:NaN}]){assert.throws(()=>createFrameMetrics(options),RangeError);checks++;}
const source=readFileSync(new URL('../src/frame-metrics.js',import.meta.url),'utf8');
const recording=source.slice(source.indexOf('record(now,cpuRenderMs){'),source.indexOf('// Only this infrequent read'));
check(!/new |\.push\(|\.map\(|\.filter\(|\.sort\(|\.slice\(|\.toFixed\(|JSON\.|dataset/.test(recording),'recording contains no collection allocation, sorting or DOM writes');
// Guard the renderer's measurement boundary without booting WebGL. Full scene,
// warmup and readiness suites cover its rendering and ownership separately.
const renderer=readFileSync(new URL('../src/render3d.js',import.meta.url),'utf8');
check(/function frame\(now = performance\.now\(\),measure=false\)/.test(renderer)&&/frame\(t,true\)/.test(renderer),'only RAF opts into metrics; manual debug calls default out');
check(/const capture=measure&&!document\.hidden/.test(renderer),'hidden draws are not recorded');
check(/if\(!prepareVehicle\(carKey\)\)\{frameMetrics\.suspend\(\);return;\}/.test(renderer),'asset loading breaks the interval anchor');
check(/if\(!warmup\.canDraw\(warmupKey\)\)\{frameMetrics\.suspend\(\);return;\}/.test(renderer),'shader warmup breaks the interval anchor');
check(/loadingFrame=firstWorldFrame\|\|metricsChanged/.test(renderer),'first loading and configuration-change frames do not pollute steady-state metrics');
check(/renderStarted=performance\.now\(\);composer\.render\(\);\s*const cpuRenderMs=performance\.now\(\)-renderStarted/.test(renderer),'CPU cost covers composer submission, not an asserted GPU duration');
check(/if\(capture&&!loadingFrame\)frameMetrics\.record\(now,cpuRenderMs\)/.test(renderer),'only presented steady-state RAF frames reach the ring');
check(/const visibility = \(\) => \{resetFrameMetrics\(\);\}/.test(renderer)&&/document\.addEventListener\('visibilitychange',visibility\)/.test(renderer)&&/document\.removeEventListener\('visibilitychange',visibility\)/.test(renderer),'hidden-tab gaps reset the window and the observer is cleaned on disposal');
for(const key of ['metricRevision','metricEnvironment','metricQuality','metricRatio','metricMenu','metricCamera','metricMood','metricInspection','metricCar'])check(new RegExp(`${key}!==`).test(renderer),`${key} changes invalidate old readings`);
for(const key of ['frameSamples','frameWindowMs','frameMsP50','frameMsP95','frameMsMax','frameJankCount','cpuRenderMsP50','cpuRenderMsP95','cpuRenderMsMax','shaderPrograms'])check(renderer.includes(`host.dataset.${key}=`),`${key} is published for the reusable performance review`);
console.log(`Frame metrics: ${checks} bounded ring, percentile, CPU separation, long-stall, hidden-gap and reset checks passed.`);
