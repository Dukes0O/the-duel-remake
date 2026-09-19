// Developer-only visual/audio regression page, served by Vite, not bundled by build.
import {App} from '../src/app.js';
import {attachRenderer} from '../src/render3d.js';
const app=new App();const view=document.querySelector('#view');attachRenderer(view,app);
for(const [id,label,fn]of[
  ['coast','Coast scene',()=>scene(4,450)],['harbor','Harbor scene',()=>scene(5,700)],
  ['boundary','Boundary reset',()=>{start();app.duel.state.lateral=82;app.duel.step(1/120);}],
  ['flock','Flock pickup',()=>{start();const f=app.duel.course.features.flocks[0],s=app.duel.state;s.s=f.s;s.lateral=f.off;s.boost=.1;s.speedMph=30;app.duel.step(1/120);}],
  ['rear','Rear damage',()=>{start();const s=app.duel.state;s.damageZones.rear=3;s.damageZones.left=2;s.majorCrashes=4;s.paused=true;}],
  ['gt','Aurora GT preview',()=>{app.returnToMenu();app.menuCar='aurora_gt';}],
]){const button=document.createElement('button');button.id=id;button.textContent=label;button.onclick=fn;document.querySelector('nav').append(button);}
function scene(stage,s){app.startCampaign({startStage:stage});Object.assign(app.duel.state,{status:'racing',s,traffic:[],rival:null,paused:true});app.cameraMode='chase';}
const start=()=>{app.startCampaign();const s=app.duel.state;s.status='racing';s.s=172;s.traffic=[];s.rival=null;};
function hit(){const s=app.duel.state;s.paused=false;s.speedMph=125;s.lateral=8.6;app.duel._crash('head_on');}
function damage(n){start();for(let i=0;i<n;i++){hit();if(i<n-1)while(app.duel.state.impactTimer>0)app.duel.step(1/120);}}
document.querySelector('#fresh').onclick=()=>{app.startCampaign();app.returnToMenu();app.menuCar='falcone_f42';};
document.querySelector('#silver').onclick=()=>{app.startCampaign({car:'stuttgart_959s'});app.returnToMenu();app.menuCar='stuttgart_959s';};
document.querySelector('#drive').onclick=()=>{start();app.autopilot=true;app._scriptedCrashDone=true;};
document.querySelector('#hit').onclick=()=>{app.autopilot=false;damage(1);};
document.querySelector('#critical').onclick=()=>{app.autopilot=false;damage(4);};
document.querySelector('#fatal').onclick=()=>{app.autopilot=false;damage(5);};
document.querySelector('#freeze').onclick=()=>{app.duel.state.paused=!app.duel.state.paused;};
document.querySelector('#alpine').onclick=()=>{start();app.duel._loadStage(2);app.duel.state.status='racing';app.duel.state.s=400;app.duel.state.traffic=[];};
document.querySelector('#chickens').onclick=()=>{start();app.duel.state.s=179;app.duel.state.lateral=-17;app.cameraMode='hood';};
document.querySelector('#offroad').onclick=()=>{start();app.duel.state.s=2600;app.duel.state.lateral=-45;app.cameraMode='chase';};
app.onFrame=s=>{document.querySelector('#state').textContent=`${s.status} · major crashes ${s.majorCrashes} · catastrophic ${s.catastrophic}\nAudio ${app.audio.context?.state||'locked'} · samples ${app.audio.sampleStatus}\n${view.dataset.fps||0} FPS · ${view.dataset.drawCalls||0} draws · ${view.dataset.triangles||0} triangles\nNitro ${s.boost.toFixed(2)} · flocks ${s.collectedFlocks.length} · boundary resets ${s.boundaryResets} · lateral ${s.lateral.toFixed(1)}`;};app.start();
