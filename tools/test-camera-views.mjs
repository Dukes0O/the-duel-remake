import assert from 'node:assert/strict';
import {CAMERA_KEYS,directionalCameraPose} from '../src/camera-views.js';
import {App} from '../src/app.js';
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,.71])for(const tall of [false,true])for(const mode of Object.values(CAMERA_KEYS)){
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
for(const [code,mode]of Object.entries(CAMERA_KEYS)){
  press(code);check(app.cameraMode===mode,`${code} selects ${mode}`);press(code);check(app.cameraMode===mode,'repeated taps select, never cycle');
}
press('KeyD');check(app.keys.KeyD&&app.cameraMode==='left','D stays a steering key');
app.setCamera('front');press('KeyB',true);check(app.cameraMode==='front','held key repeats ignored');
check(app.setCamera('invalid')==='front','invalid camera rejected');
app.setCamera('chase');check(app.cycleCamera()==='hood'&&app.cycleCamera()==='wide','button retains hood and wide views');
app.dispose();console.log(`Camera views: ${checks} position, heading, height and actual keyboard checks passed.`);
