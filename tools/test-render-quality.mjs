import assert from 'node:assert/strict';
import {createRenderQuality} from '../src/render-quality.js';

const oldWindow=globalThis.window,oldImage=globalThis.Image;
globalThis.window={devicePixelRatio:2};globalThis.Image=class{};
try{
  const rendererRatios=[],composerRatios=[],passes=[];
  const renderer={setPixelRatio:ratio=>rendererRatios.push(ratio)};
  const composer={addPass:pass=>passes.push(pass),setPixelRatio:ratio=>composerRatios.push(ratio)};
  const ambientShading={enabled:true},host={clientWidth:1280,clientHeight:720,dataset:{}};
  let disposed=0;
  const sun={shadow:{mapSize:{x:2048,y:2048,set(x,y){this.x=x;this.y=y;}},map:{dispose(){disposed++;}},needsUpdate:false}};
  const quality=createRenderQuality({renderer,composer,ambientShading,sun,host});
  quality.update(false);
  assert.deepEqual(rendererRatios,[1]);assert.deepEqual(composerRatios,[],'Performance does not allocate unused composer targets');
  assert.equal(ambientShading.enabled,false);assert.equal(passes[0].enabled,false);
  assert.equal(sun.shadow.mapSize.x,1024);assert.equal(disposed,1);assert.equal(sun.shadow.map,null);
  assert.equal(host.dataset.resolutionScale,'1');assert.equal(host.dataset.renderPixelRatio,'1');
  assert.equal(host.dataset.renderPipeline,'direct');
  quality.update(false,.95);quality.update(false,.95);quality.update(false,.9);
  assert.deepEqual(rendererRatios,[1,.95,.9],'only changed canvas scale triggers a resize');
  assert.deepEqual(composerRatios,[],'adaptive steps never resize the unused composer');
  assert.equal(disposed,1,'resolution steps never rebuild shadow maps');
  assert.equal(host.dataset.resolutionScale,'0.9');
  quality.update(false,-5);assert.equal(rendererRatios.at(-1),.8,'scale cannot fall below .8');
  quality.update(false,50);assert.equal(rendererRatios.at(-1),1,'scale cannot exceed native resolution');
  for(const invalid of [NaN,Infinity,-Infinity,undefined]){quality.update(false,invalid);assert.equal(host.dataset.resolutionScale,'1');}
  quality.update(true,.8);
  assert.equal(rendererRatios.at(-1),1.6);assert.deepEqual(composerRatios,[1.6],'High synchronizes its composer');
  assert.equal(ambientShading.enabled,true);assert.equal(passes[0].enabled,true);
  assert.equal(host.dataset.renderPipeline,'composite');
  assert.equal(sun.shadow.mapSize.x,2048);assert.equal(host.dataset.resolutionScale,'1','High ignores adaptive scale');
  quality.update(true,.9);assert.deepEqual(composerRatios,[1.6],'High ignores scale-only changes');
  quality.update(false,.85);quality.update(true);
  assert.deepEqual(composerRatios,[1.6],'unchanged High targets survive a Performance round trip');
  globalThis.window.devicePixelRatio=1.25;quality.update(true);
  assert.equal(rendererRatios.at(-1),1.25);assert.deepEqual(composerRatios,[1.6,1.25],'High responds to a monitor DPI change');
  globalThis.window.devicePixelRatio=1;quality.update(false,.8);
  assert.equal(rendererRatios.at(-1),.8);assert.deepEqual(composerRatios,[1.6,1.25]);
  for(const invalid of [NaN,Infinity,0,-1]){
    globalThis.window.devicePixelRatio=invalid;quality.update(false,.85);
    assert.equal(rendererRatios.at(-1),.85,'invalid browser pixel ratios safely use native scale');
  }
  passes[0].dispose();
}finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
}
console.log('Render quality: bounded adaptive scale, independent composer/canvas sizes, shadow reuse and High restoration passed.');
