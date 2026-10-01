import assert from 'node:assert/strict';
import {CAMERA_MODES,DIRECTIONAL_CAMERA_MODES,directionalCameraPose} from '../src/camera-views.js';
import {App} from '../src/app.js';
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,.71])for(const tall of [false,true])for(const mode of DIRECTIONAL_CAMERA_MODES){
  const origin={x:50,y:25,z:-30},view=directionalCameraPose(mode,origin,heading,tall),dx=view.position.x-origin.x,dz=view.position.z-origin.z;
  const forward=dx*Math.sin(heading)+dz*Math.cos(heading),right=dx*Math.cos(heading)-dz*Math.sin(heading);
  check(mode==='front'?forward>9:mode==='back'?forward< -9:mode==='right'?right>9:right< -9,`${mode} follows car heading`);
  check(view.position.y>origin.y&&view.target.y>origin.y,'views follow car height in jumps');
}
check(directionalCameraPose('hood',{x:0,y:0,z:0},0)===null,'old hood camera retained');
globalThis.window=new EventTarget();window.location={search:''};globalThis.Element=class {closest(){return true;}};
globalThis.cancelAnimationFrame=()=>{};
const app=new App();app.audio.unlock=()=>{};
const press=(code,repeat=false)=>{const e=new Event('keydown',{cancelable:true});Object.assign(e,{code,repeat});window.dispatchEvent(e);};
// C steps through all seven views in order and wraps back to chase.
check(app.cameraMode==='chase','races start in the chase view');
for(const mode of [...CAMERA_MODES.slice(1),'chase']){press('KeyC');check(app.cameraMode===mode,`C steps to ${mode}`);}
for(const code of ['KeyD','KeyB','KeyV','KeyX']){press(code);check(app.cameraMode==='chase',`${code} no longer changes the camera`);}
app.setCamera('front');press('KeyC',true);check(app.cameraMode==='front','held C repeats ignored');
check(app.setCamera('invalid')==='front','invalid camera rejected');
app.setCamera('chase');check(app.cycleCamera()==='hood'&&app.cycleCamera()==='wide','button retains hood and wide views');
app.dispose();console.log(`Camera views: ${checks} position, heading, height and actual keyboard checks passed.`);
