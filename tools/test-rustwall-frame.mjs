import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {test} from 'node:test';
import {summarizeFrames} from './performance-review.js';

const baselineCommit=execFileSync('git',['rev-parse','5a994ad'],{encoding:'utf8'}).trim();
const candidateCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const clone=value=>structuredClone(value);
const summary=values=>summarizeFrames(values);
const report=(role,run,commit,{cpuScale=1,rafScale=1,draws=90,triangles=50000}={})=>{
  const quality={};
  for(const name of ['high','performance']){
    quality[name]={};
    for(const view of ['wash','approach']){
      const mirrorRefreshSamples=Array.from({length:600},(_,i)=>i%2===0);
      const renderCpuSamplesMs=Array.from({length:600},(_,i)=>
        (4+(i%7)*.11+(name==='high'?.8:0)+(view==='approach'?.25:0))*cpuScale);
      const rafSamplesMs=Array.from({length:600},(_,i)=>
        (16+(i%9)*.07+(name==='high'?.3:0)+(view==='approach'?.1:0))*rafScale);
      const warmEndTimestampMs=1000,frameIds=Array.from({length:600},(_,i)=>i);
      let timestamp=warmEndTimestampMs;
      const rafTimestampsMs=rafSamplesMs.map(interval=>(timestamp+=interval));
      quality[name][view]={
        raf:summary(rafSamplesMs),renderCpu:summary(renderCpuSamplesMs),
        rafSamplesMs,renderCpuSamplesMs,mirrorRefreshSamples,
        frameIds,rafTimestampsMs,warmEndTimestampMs,
        renderCpuByMirror:{refreshed:summary(renderCpuSamplesMs.filter((_,i)=>i%2===0)),
          reused:summary(renderCpuSamplesMs.filter((_,i)=>i%2===1))},
        drawCallSamples:Array(600).fill(draws),
        triangleSamples:Array(600).fill(triangles),
        canvasPixelSamples:Array(600).fill(1280*720),
        canvas:{width:1280,height:720},
        camera:{position:view==='wash'?[0,4,12]:[0,5,15],target:[0,2,0],fov:55,
          projectionMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
          matrixWorld:[1,0,0,0,0,1,0,0,0,0,1,0,0,
            view==='wash'?4:5,view==='wash'?12:15,1]},
        state:{seed:1989,progress:view==='wash'?350:960,stopped:true,gateClosed:true,
          courseId:'pacific-canyon',routeSeed:1989,status:'racing',speedMph:0,
          s:view==='wash'?350:960,lateral:0,hiddenRoadLength:1200},
        diagnosticMean:{raf:rafSamplesMs.reduce((a,b)=>a+b,0)/600,
          renderCpu:renderCpuSamplesMs.reduce((a,b)=>a+b,0)/600},
      };
    }
  }
  return {role,run,commit,samples:600,warmup:20,
    hashes:{renderer:'1'.repeat(64),worldSurfaces:'2'.repeat(64),
      course:'3'.repeat(64),wallGlb:(role==='baseline'?'4':'5').repeat(64),
      washGlb:(role==='baseline'?'6':'7').repeat(64)},
    quality,scope:{render:'complete production renderFrame',raf:'ordered delivered frames',
      mirror:'refreshed and reused passes',memoryOnlySaves:true}};
};

test('Rustwall frame report rejects missing samples, fabricated summaries and unstable review state', async () => {
  const {validateRustwallFrameReport}=await import('./scenarios/rustwall-frame.mjs');
  assert.equal(typeof validateRustwallFrameReport,'function');
  const good=report('baseline','a1',baselineCommit);
  assert.doesNotThrow(()=>validateRustwallFrameReport(good,
    {role:'baseline',run:'a1',commit:baselineCommit}));
  const failures=[
    item=>item.quality.high.wash.renderCpuSamplesMs.pop(),
    item=>item.quality.high.wash.rafSamplesMs.pop(),
    item=>item.quality.performance.approach.raf.p95*=.8,
    item=>item.quality.high.wash.renderCpu.p50*=.8,
    item=>item.quality.high.wash.mirrorRefreshSamples.fill(false),
    item=>item.quality.high.wash.frameIds[200]=199,
    item=>item.quality.high.wash.rafTimestampsMs[200]-=4,
    item=>item.quality.high.wash.canvasPixelSamples[312]=1,
    item=>item.quality.high.wash.canvas.width=1440,
    item=>item.quality.high.wash.canvas.height=640,
    item=>item.quality.high.wash.camera.matrixWorld[12]=4,
    item=>item.quality.high.wash.state.courseId='another-course',
    item=>item.quality.high.wash.state.status='finished',
    item=>item.quality.high.wash.diagnosticMean.renderCpu*=.5,
    item=>item.quality.performance.wash.state.seed=1990,
    item=>delete item.quality.high.approach,
    item=>item.hashes.wallGlb='0'.repeat(63),
    item=>item.commit='0'.repeat(40),
  ];
  for(const [index,damage] of failures.entries()){
    const broken=clone(good);damage(broken);
    assert.throws(()=>validateRustwallFrameReport(broken,
      {role:'baseline',run:'a1',commit:baselineCommit}),
    `tampered report ${index} must be rejected before timing judgment`);
  }
  assert.throws(()=>validateRustwallFrameReport(good,
    {role:'candidate',run:'b',commit:candidateCommit}),
  'baseline identity cannot be relabeled as candidate');
  const fabricatedBaseline=report('baseline','a1','0'.repeat(40));
  assert.throws(()=>validateRustwallFrameReport(fabricatedBaseline,
    {role:'baseline',run:'a1',commit:'0'.repeat(40)}),
  'baseline is pinned to reviewed integration commit 5a994ad, not caller-supplied commit alone');
});

test('Rustwall A1/B/A2 compares both exact baselines in every quality and camera stratum', async () => {
  const {compareRustwallFrameRuns}=await import('./scenarios/rustwall-frame.mjs');
  assert.equal(typeof compareRustwallFrameRuns,'function');
  const a1=report('baseline','a1',baselineCommit);
  const b=report('candidate','b',candidateCommit,
    {cpuScale:1.08,rafScale:1.06,draws:96,triangles:51200});
  const a2=report('baseline','a2',baselineCommit,
    {cpuScale:1.02,rafScale:1.01});
  const compared=compareRustwallFrameRuns(a1,b,a2);
  for(const quality of ['high','performance'])for(const view of ['wash','approach']){
    const row=compared.quality[quality][view];
    for(const [name,source] of [['cpu','renderCpu'],['raf','raf']])
      for(const percentile of ['p50','p95']){
        const expected=[a1,a2].map(base=>b.quality[quality][view][source][percentile]/
          base.quality[quality][view][source][percentile]);
        assert.equal(row[name][percentile].length,2,'both baseline comparisons are kept');
        expected.forEach((ratio,index)=>assert.ok(Math.abs(row[name][percentile][index]-ratio)<.001,
          `${quality}/${view} ${name} ${percentile} B/A${index?2:1}`));
      }
    assert.deepEqual(row.drawCalls.delta,[6,6]);
    assert.deepEqual(row.triangles.delta,[1200,1200]);
    assert.ok(Math.abs(row.baselineDrift.cpuP95-
      a2.quality[quality][view].renderCpu.p95/a1.quality[quality][view].renderCpu.p95)<.001);
  }
  const incompatible=clone(b);
  incompatible.quality.high.wash.camera.position[0]=25;
  assert.throws(()=>compareRustwallFrameRuns(a1,incompatible,a2),
    'candidate cannot change the sampled camera');
  const mirrorSkew=clone(b),skew=mirrorSkew.quality.high.wash;
  skew.mirrorRefreshSamples.fill(false);skew.mirrorRefreshSamples[0]=true;
  skew.renderCpuByMirror={refreshed:summary(skew.renderCpuSamplesMs.slice(0,1)),
    reused:summary(skew.renderCpuSamplesMs.slice(1))};
  assert.throws(()=>compareRustwallFrameRuns(a1,mirrorSkew,a2),
    'A/B/A cannot compare different mirror refresh workloads');
  const wrongBaselineAsset=clone(a2);
  wrongBaselineAsset.hashes.wallGlb='9'.repeat(64);
  assert.throws(()=>compareRustwallFrameRuns(a1,b,wrongBaselineAsset),
    'both baseline reports must measure the same wall asset bytes');
  const wrongBaselineWash=clone(a2);
  wrongBaselineWash.hashes.washGlb='8'.repeat(64);
  assert.throws(()=>compareRustwallFrameRuns(a1,b,wrongBaselineWash),
    'both baseline reports must measure the same wash asset bytes');
  const equalPixelsDifferentShape=clone(b);
  equalPixelsDifferentShape.quality.high.wash.canvas={width:960,height:960};
  assert.throws(()=>compareRustwallFrameRuns(a1,equalPixelsDifferentShape,a2),
    'equal canvas area with different aspect is an incompatible timing comparison');
  const firstFrameOutliers=[clone(a1),clone(b),clone(a2)];
  for(const [index,item] of firstFrameOutliers.entries()){
    item.quality.high.wash.drawCallSamples[0]=180+index*40;
    item.quality.high.wash.triangleSamples[0]=100000+index*10000;
  }
  const robust=compareRustwallFrameRuns(...firstFrameOutliers).quality.high.wash;
  assert.deepEqual(robust.drawCalls.delta,[6,6],
    'draw-call delta uses representative 600-frame median, not one mirror-dependent first frame');
  assert.deepEqual(robust.triangles.delta,[1200,1200],
    'triangle delta uses representative 600-frame median');
  const wrongRole=clone(a2);wrongRole.role='candidate';
  assert.throws(()=>compareRustwallFrameRuns(a1,b,wrongRole),
    'the second baseline cannot be silently replaced');
});
