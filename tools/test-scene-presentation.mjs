import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {renderMainView} from '../src/scene-presentation.js';

const scene={},camera={},pass=new RenderPass(scene,camera),calls=[];
let target={offscreen:true},fail=false,composites=0;
const renderer={
  autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:true,
  setRenderTarget(value){target=value;calls.push(['target',value]);},
  clear(...flags){calls.push(['clear',...flags]);},
  render(s,c){assert.equal(s,scene);assert.equal(c,camera);assert.equal(target,null);assert.equal(this.autoClear,false);calls.push(['scene']);if(fail)throw new Error('test draw failure');},
};
const composer={passes:[pass,{render(){throw new Error('Performance must not run postprocessing');}}],render(){composites++;}};
for(const autoClear of [true,false]){
  renderer.autoClear=autoClear;
  renderMainView(renderer,composer,false);
  assert.deepEqual(calls.splice(0),[['target',null],['clear',true,true,true],['scene']]);
  assert.equal(renderer.autoClear,autoClear);assert.equal(pass.renderToScreen,false);
  assert.equal(composites,0,'direct frames bypass the composer and its target swaps');
}
renderMainView(renderer,composer,true);assert.equal(composites,1);assert.deepEqual(calls,[],'High retains the complete pipeline');
fail=true;renderer.autoClear=true;pass.renderToScreen=true;
assert.throws(()=>renderMainView(renderer,composer,false),/test draw failure/);
assert.equal(pass.renderToScreen,true);assert.equal(renderer.autoClear,true,'state is restored even if a scene submission throws');
fail=false;pass.renderToScreen=false;
renderMainView(renderer,composer,false);renderMainView(renderer,composer,true);
assert.equal(composites,2);assert.equal(pass.renderToScreen,false,'Performance → High restores pass ownership');

const source=readFileSync(new URL('../src/render3d.js',import.meta.url),'utf8');
assert.match(source,/new THREE\.WebGLRenderer\(\{ antialias: false, powerPreference: 'high-performance' \}\)/,'direct Performance must not silently enable costly canvas MSAA; High uses its SMAA pass');
assert.match(source,/high\?compileWarmupPipeline\(renderer,scene,camera,composer\):compileWarmupScene\(renderer,scene,camera,null\)/,'warmup compiles the actual canvas color/tone shader variants in Performance');
assert.match(source,/quality\.update\(high,adaptiveResolution\.scale\)/);
assert.match(source,/adaptiveResolution\.sample\(now,capture&&!loadingFrame&&!high&&moving\)/,'only presented visible Performance driving frames train resolution');
const movingCondition=source.match(/const moving = ([^;\n]+);/);
assert.ok(movingCondition,'renderer keeps an explicit active-presentation condition');
const movingFor=new Function('st',`return (${movingCondition[1]});`);
for(const status of ['racing','exploring','menu','countdown','ticket','stage_result','gameover','complete','unknown'])
  for(const paused of [false,true])assert.equal(movingFor({status,paused}),
    ['racing','exploring'].includes(status)&&!paused,`${status}, paused=${paused}: only active driving trains presentation`);
assert.match(source,/const capture=measure&&!document\.hidden/);
assert.match(source,/if \(!next\).*adaptiveResolution\.reset\(\);return;/);
assert.match(source,/if\(!prepareVehicle\(carKey,\{finish:modelFinish\}\)\).*adaptiveResolution\.reset\(\);return;/);
assert.match(source,/if\(!warmup\.canDraw\(warmupKey\)\).*adaptiveResolution\.reset\(\);return;/);
assert.match(source,/const resize = .*adaptiveResolution\.reset\(\)/);
assert.match(source,/const visibility = .*adaptiveResolution\.reset\(\)/);
function mainPrecedesBothMirrors(rendererSource) {
  const start = rendererSource.indexOf('renderStarted=performance.now();');
  const end = rendererSource.indexOf('const cpuRenderMs=performance.now()-renderStarted', start);
  if (start < 0 || end < start || end - start > 2000) return false;
  const boundary = rendererSource.slice(start, end);
  const main = /^renderStarted=performance\.now\(\);renderMainView\(renderer,composer,high\);\s*/;
  if (!main.test(boundary)) return false;
  const rear = boundary.replace(main, '');
  const direct = /^rearView\.render\(\{state:st,player,course,now(?::ambientNow)?\}\);\s*$/;
  const scoped = new RegExp([
    String.raw`^const kits = trackKitsOf\(world\);\s*if \(kits\) \{\s*`,
    String.raw`const previousRender = renderer\.render;\s*`,
    String.raw`renderer\.render = function\(renderedScene, renderedCamera, \.\.\.args\) \{`,
    String.raw`[\s\S]{1,1400}\};\s*`,
    String.raw`try \{rearView\.render\(\{state:st,player,course,now:ambientNow\}\);\}\s*`,
    String.raw`finally \{renderer\.render = previousRender;\}\s*`,
    String.raw`\} else rearView\.render\(\{state:st,player,course,now:ambientNow\}\);\s*$`,
  ].join(''));
  return direct.test(rear) || scoped.test(rear);
}
assert.ok(mainPrecedesBothMirrors(source),'mirror draws after either main-view path');
const mainSubmission = 'renderMainView(renderer,composer,high);';
const scopedMirror = 'try {rearView.render({state:st,player,course,now:ambientNow});}';
const directMirror = '} else rearView.render({state:st,player,course,now:ambientNow});';
const restoration = 'finally {renderer.render = previousRender;}';
for (const [label, marker] of [
  ['main', mainSubmission], ['scoped mirror', scopedMirror],
  ['direct mirror', directMirror], ['restoration', restoration],
]) {
  assert.ok(source.includes(marker), `${label} control targets actual renderer source`);
  assert.equal(mainPrecedesBothMirrors(source.replace(marker, '')), false, `missing ${label} is rejected`);
}
for (const mirror of [scopedMirror, directMirror]) {
  const reordered = source.replace(mainSubmission, '').replace(mirror, `${mirror}${mainSubmission}`);
  assert.equal(mainPrecedesBothMirrors(reordered), false, 'main submission after either mirror is rejected');
}
const cpuEndpoint = 'const cpuRenderMs=performance.now()-renderStarted;';
for (const marker of [scopedMirror, directMirror, restoration]) {
  assert.equal(mainPrecedesBothMirrors(source.replace(marker, `${cpuEndpoint}${marker}`)), false,
    'CPU endpoint before either mirror or restoration is rejected');
}
assert.ok(mainPrecedesBothMirrors(`renderStarted=performance.now();${mainSubmission}rearView.render({state:st,player,course,now});${cpuEndpoint}`),
  'original direct main-before-mirror layout remains supported');
console.log('Scene presentation: real RenderPass clearing, direct/composite routing, error restoration, matching warmup, mirror ordering and adaptive lifecycle passed.');
