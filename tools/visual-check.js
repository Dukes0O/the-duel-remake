// Developer-only visual/audio regression page, served by Vite, not bundled by build.

import {installIsolatedStorage} from './qa-storage.js';
installIsolatedStorage();
document.title='The Duel — temporary visual test';
const storageNotice=document.createElement('span');
storageNotice.textContent='Temporary test data — reload clears it';
storageNotice.style.cssText='align-self:center;background:#15242fe6;padding:10px';
document.querySelector('nav').prepend(storageNotice);
const {App}=await import('../src/app.js');

import {COURSE} from '../src/config.js';
import {freestyleLayout} from '../src/freestyle-course.js';

import {attachRenderer} from '../src/render3d.js';
import {installPerformanceReview} from './performance-review.js';

let smokePauseAt=null;
let pauseAtFlight=false;
const app=new App();const view=document.querySelector('#view');attachRenderer(view,app);
const performanceReview=installPerformanceReview(app,view,document.querySelector('nav'),{hudSource:'visual-check telemetry (not production HUD)'});
if(import.meta.hot)import.meta.hot.dispose(()=>performanceReview.dispose());

for(const [id,label,fn]of[

  ['ambient','Toggle graphics quality',()=>{app.ambientOcclusionEnabled=app.ambientOcclusionEnabled===false;}],

  ['practice-overview','Freestyle quarry overview',()=>{practice();const b=freestyleLayout(app.duel.course).bounds,cx=(b.minX+b.maxX)*.5,cz=(b.minZ+b.maxZ)*.5;app.inspectionCamera={position:[cx+310,195,cz+260],target:[cx,0,cz]};}],
  ['practice-jump','Freestyle real jump',()=>{practice();Object.assign(app.duel.state,{s:130,prevS:130,speedMph:75,gear:3,paused:false});app.autopilot=true;app._scriptedCrashDone=true;pauseAtFlight=true;smokePauseAt=app.duel.state.totalTimeSec+6;}],
  ['practice-rocks','Freestyle rock crawl',()=>{practice();const rock=app.duel.course.features.obstacles.find(o=>o.id==='practice-rock-3');practiceDriveToward(rock,10,12,.9);}],
  ['practice-climb','Freestyle mountain climb',()=>{practice();const mound=app.duel.course.features.practiceMounds.at(-1);practiceDriveToward(mound,48,28,8,true);}],
  ['truck-crush','Truck crushes traffic',()=>{scene(0,90,'titan_monster');const s=app.duel.state;Object.assign(s,{s:90,prevS:90,lateral:-3.4,prevLateral:-3.4,speedMph:26,gear:1,paused:false});const target={s:102,prevS:102,lateral:-3.4,prevLateral:-3.4,speedMph:0,cruiseSpeedMph:0,dir:1,alive:true,damageZones:{front:0,rear:0,left:0,right:0},damageCooldown:0};s.traffic=[target];let followThrough=0;for(let i=0;i<480;i++){app.duel.setInput({throttle:.35,brake:0,steer:0});app.duel.step(1/120);if(target.crushed&&++followThrough>=90)break;}s.paused=true;const p=app.duel.course.groundAt(target.s,target.lateral);app.inspectionCamera={position:[p.x+12,p.y+7,p.z+13],target:[p.x,p.y+1,p.z]};}],

  ...COURSE.filter(def=>def.expansion).flatMap(def=>{
    const stage=COURSE.indexOf(def),prepare=()=>{app.setLightingMood(def.defaultMood);scene(stage,def.lengthU*def.expansion.landmarkFraction-150);};
    return [
      [`${def.id}-approach`,`${def.name} approach`,prepare],
      [`${def.id}-landmark`,`${def.name} landmark`,()=>{prepare();const p=app.duel.course.features.setPieces[0],c=Math.cos(p.heading),sn=Math.sin(p.heading);app.duel.state.s=p.s;app.inspectionCamera={position:[p.x+c*30+sn*36,p.baseY+18,p.z-sn*30+c*36],target:[p.x,p.baseY+p.height*.45,p.z]};}],
      [`${def.id}-drive`,`${def.name} crest drive`,()=>{prepare();Object.assign(app.duel.state,{s:def.expansion.crests[0][0]*def.lengthU-220,speedMph:150,gear:4,paused:false});smokePauseAt=app.duel.state.totalTimeSec+10;pauseAtFlight=true;app.autopilot=true;app._scriptedCrashDone=true;}],
    ];
  }),

  ['coast','Coast scene',()=>scene(0,2850)],['harbor','Harbor scene',()=>scene(2,700)],
  ['harbor-crane','Harbor crane detail',()=>{scene(2,420);const p=app.duel.course.groundAt(420,130),c=Math.cos(p.heading),sn=Math.sin(p.heading);app.inspectionCamera={position:[p.x-c*64+sn*36,p.y+31,p.z+sn*64+c*36],target:[p.x,p.y+29,p.z]};}],
  ['harbor-wall','Harbor warehouse finish',()=>{scene(2,700);const b=app.duel.course.features.buildings.find(b=>b.s>550&&b.s<850);if(b){const c=Math.cos(b.heading),sn=Math.sin(b.heading),side=-Math.sign(b.off),reach=b.halfX+14;app.inspectionCamera={position:[b.x+c*side*reach+sn*8,b.y+5,b.z-sn*side*reach+c*8],target:[b.x+c*side*b.halfX,b.y+5,b.z-sn*side*b.halfX]};}}],
  ['coast-approach','Coastal approach',()=>scene(0,2500)],
  ['lighthouse-pass','Lighthouse pass',()=>scene(0,3050)],
  ['coast-exit','Coastal exit',()=>scene(0,3500)],
  ['coast-drive','Coastal driving sample',()=>{scene(0,2500);Object.assign(app.duel.state,{speedMph:110,gear:4,paused:false});smokePauseAt=app.duel.state.totalTimeSec+12;app.autopilot=true;app._scriptedCrashDone=true;}],
  ['lighthouse-detail','Lighthouse detail',()=>{scene(0,3150);const course=app.duel.course,p=course.features.landmarks[0];if(p){const c=Math.cos(p.heading),sn=Math.sin(p.heading);app.inspectionCamera={position:[p.x+c*33-sn*22,p.y+13,p.z-sn*33-c*22],target:[p.x,p.y+11,p.z]};}}],
  ['shore-detail','Shoreline overview',()=>{scene(0,3050);const p=app.duel.course.groundAt(3050,70),q=app.duel.course.groundAt(3110,150);app.inspectionCamera={position:[p.x,p.y+25,p.z],target:[q.x,-6,q.z]};}],
  ['coast-b','Coast Route B',()=>scene(0,2850,'falcone_f42',42)],
  ['coast-c','Coast Route C',()=>scene(0,2850,'falcone_f42',17)],

  ['tunnel','Tunnel interior',()=>scene(1,COURSE[1].lengthU*(.26+.48*.4)+55)],

  ['wide-tunnel','Wide tunnel camera',()=>{scene(1,COURSE[1].lengthU*(.26+.48*.4)+55);app.cameraMode='wide';}],

  ['shortcut','Shortcut',()=>{scene(0,0);const cut=app.duel.course.features.shortcuts[0],s=(cut.start+cut.end)/2;app.duel.state.s=s;app.duel.state.lateral=app.duel.course.shortcutOffset(cut,s);}],

  ['passing','Passing lane',()=>scene(0,430)],

  ['jump','Arena jump sample',()=>{scene(COURSE.findIndex(c=>c.kind==='arena'),175,'titan_monster');Object.assign(app.duel.state,{speedMph:90,gear:3,paused:false});smokePauseAt=app.duel.state.totalTimeSec+.9;app.cameraMode='wide';document.body.classList.add('smoke-check');app.autopilot=true;app._scriptedCrashDone=true;}],

  ['crush','Crush arena car',()=>{scene(COURSE.findIndex(c=>c.kind==='arena'),0,'titan_monster');const p=app.duel.course.features.crushables[0],s=app.duel.state;Object.assign(s,{s:p.s-5,lateral:p.off,speedMph:30,gear:2,paused:false});for(let i=0;i<45;i++)app.duel.step(1/120);s.paused=true;}],

  ['chase','City chase',()=>scene(COURSE.findIndex(c=>c.kind==='chase'),420,'banshee_muscle')],

  ['city-lamp','City street lamp',()=>{scene(COURSE.findIndex(c=>c.kind==='chase'),0,'banshee_muscle');const pole=app.duel.course.features.poles.find(p=>p.theme==='city'&&p.s>300);if(pole)app.duel.state.s=pole.s-25;}],

  ['city-paint','City crosswalk',()=>scene(COURSE.findIndex(c=>c.kind==='chase'),115,'banshee_muscle')],

  ['city-windows','City window close-up',()=>{scene(COURSE.findIndex(c=>c.kind==='chase'),420,'banshee_muscle');const b=app.duel.course.features.buildings.find(b=>b.s>420&&b.s<650);if(b){app.duel.state.s=b.s;app.duel.state.lateral=b.off-Math.sign(b.off)*(b.halfX+8);app.cameraMode='hood';const side=-Math.sign(b.off),c=Math.cos(b.heading),sn=Math.sin(b.heading),off=side*(b.halfX+8);app.inspectionCamera={position:[b.x+c*off,b.y+2.2,b.z-sn*off],target:[b.x+c*side*b.halfX,b.y+2.0,b.z-sn*side*b.halfX]};}}],

  ['chase-drive','Chase driving sample',()=>{scene(COURSE.findIndex(c=>c.kind==='chase'),0,'banshee_muscle');app.duel.state.paused=false;app.autopilot=true;app._scriptedCrashDone=true;}],

  ['rally','Ridge rally',()=>scene(COURSE.findIndex(c=>c.kind==='rally'),1900,'dusthawk_rally')],

  ['stunt','Titan stunt trial',()=>{const stage=COURSE.findIndex(c=>c.stuntTrial);scene(stage,0,'titan_monster');app.duel.state.paused=false;app.autopilot=true;app._scriptedCrashDone=true;}],

  ['drift','Neon drift trial',()=>{scene(COURSE.findIndex(c=>c.kind==='drift'),0,'banshee_muscle');app.duel.state.paused=false;app.autopilot=true;app._scriptedCrashDone=true;}],

  ['rush-gate','Checkpoint gate',()=>{scene(COURSE.findIndex(c=>c.kind==='checkpoint'),0,'dusthawk_rally');app.duel.state.s=app.duel.course.features.rushGates[0].s-35;}],

  ['rush-run','Checkpoint driving sample',()=>{scene(COURSE.findIndex(c=>c.kind==='checkpoint'),0,'dusthawk_rally');app.duel.state.paused=false;app.autopilot=true;app._scriptedCrashDone=true;}],

  ['arena','Monster arena',()=>{scene(COURSE.findIndex(c=>c.kind==='arena'),200,'titan_monster');}],

  ...['dusthawk_rally','banshee_muscle','viper_proto','titan_monster'].map(key=>[key,key.replaceAll('_',' '),()=>{app.returnToMenu();app.menuCar=key;}]),

  ['boundary','Boundary reset',()=>{start();app.duel.state.lateral=82;app.duel.step(1/120);}],

  ['flock','Flock pickup',()=>{start();const f=app.duel.course.features.flocks[0],s=app.duel.state;s.s=f.s;s.lateral=f.off;s.boost=.1;s.speedMph=30;app.duel.step(1/120);}],

  ['rear','Rear damage',()=>{start();const s=app.duel.state;s.damageZones.rear=3;s.damageZones.left=2;s.majorCrashes=4;s.paused=true;}],

  ['gt','Aurora GT preview',()=>{app.returnToMenu();app.menuCar='aurora_gt';}],
  ['golden-coast','Golden coast',()=>{app.setLightingMood('golden');scene(0,2850);}],
  ['overcast-pass','Overcast pass',()=>{app.setLightingMood('overcast');scene(1,2600);}],
  ['clear-day','Clear daylight',()=>{app.setLightingMood('clear');}],
  ['canyon-crest','Canyon crest',()=>{scene(0,1400);app.cameraMode='wide';}],
  ['summit-saddle','Summit saddle',()=>{scene(1,2400);app.cameraMode='wide';}],
  ['terrain-slope','Terrain slope detail',()=>{scene(1,2500);const p=app.duel.course.groundAt(2500,-45),q=app.duel.course.groundAt(2515,-25);app.inspectionCamera={position:[q.x,q.y+2.5,q.z],target:[p.x,p.y+1,p.z]};}],
  ['grass-close','Grass close-up',()=>{scene(1,2600);app.cameraMode='hood';const course=app.duel.course;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(app.duel.course!==course)return;const focus=course.groundAt(2600,0);let best=null,distance=Infinity;window.__render?.scene.traverse(mesh=>{if(!mesh.userData.landscapeCell||mesh.userData.landscapeCell.kind!=='foliage'||!mesh.material.map)return;const data=mesh.instanceMatrix.array;for(let i=0;i<mesh.count;i++){const n=i*16,x=data[n+12],y=data[n+13],z=data[n+14],d=Math.hypot(x-focus.x,z-focus.z);if(d<distance){distance=d;best={x,y,z};}}});if(best)app.inspectionCamera={position:[best.x+2.2,best.y+1.0,best.z+2.2],target:[best.x,best.y+.3,best.z]};}));}],

  ['pine-close','Pine close-up',()=>{scene(1,2600);app.cameraMode='hood';const course=app.duel.course;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(app.duel.course!==course)return;const focus=course.groundAt(2600,0);let best=null,distance=Infinity;window.__render?.scene.traverse(mesh=>{if(!mesh.name.startsWith('Pine crowns '))return;const data=mesh.instanceMatrix.array;for(let i=0;i<mesh.count;i++){const n=i*16,x=data[n+12],y=data[n+13],z=data[n+14],d=Math.hypot(x-focus.x,z-focus.z),h=Math.hypot(data[n+4],data[n+5],data[n+6])*6.5;if(d<distance){distance=d;best={x,y,z,h};}}});if(best)app.inspectionCamera={position:[best.x+best.h*.6,best.y+best.h*.42,best.z+best.h*1.05],target:[best.x,best.y+best.h*.43,best.z]};}));}],

  ...[['slope-car','Slope supercar','falcone_f42'],['slope-truck','Slope Titan','titan_monster']].map(([id,label,car])=>[id,label,()=>{scene(COURSE.findIndex(c=>c.kind==='rally'),2168,car);app.duel.state.car=car;const p=app.duel.course.groundAt(2168,0),c=Math.cos(p.heading),sn=Math.sin(p.heading);app.inspectionCamera={position:[p.x+c*6-sn*5,p.y+1.7,p.z-sn*6-c*5],target:[p.x,p.y+(car==='titan_monster'?1.6:.6),p.z]};}]),

  ['parked-car','Parked sedan',()=>{scene(COURSE.findIndex(c=>c.kind==='chase'),0,'banshee_muscle');const car=app.duel.course.features.parkedCars?.[0];if(car){app.duel.state.s=car.s;const c=Math.cos(car.heading),n=Math.sin(car.heading);app.inspectionCamera={position:[car.x+c*5+n*5,car.y+2.7,car.z-n*5+c*5],target:[car.x,car.y+.75,car.z]};}}],

  ['smoke','Corner smoke',()=>{scene(COURSE.findIndex(c=>c.kind==='drift'),0,'banshee_muscle');const bend=app.duel.course.samples.find(p=>p.s>250&&Math.abs(p.curvature)>.007);Object.assign(app.duel.state,{s:bend?.s||700,speedMph:100,gear:3,paused:false});smokePauseAt=app.duel.state.totalTimeSec+.9;app.cameraMode='wide';document.body.classList.add('smoke-check');app.autopilot=true;app._scriptedCrashDone=true;}],

]){const button=document.createElement('button');button.id=id;button.textContent=label;button.onclick=fn;document.querySelector('nav').append(button);}

if(location.port==='5175'){const button=document.createElement('button');button.textContent='Create funded QA player';button.onclick=()=>{app.returnToMenu();const player=app.players.players.find(p=>p.name==='Garage QA');if(player)app.selectPlayer(player.id);else app.addPlayer('Garage QA');app.profile={...app.profile,credits:Math.max(app.profile.credits,40000)};app._saveProfile();};document.querySelector('nav').append(button);}

function scene(stage,s,car='falcone_f42',seed=1989){smokePauseAt=null;pauseAtFlight=false;document.body.classList.remove('smoke-check');app.autopilot=false;app.inspectionCamera=null;app.duel.startCampaign({startStage:stage,car,seed});Object.assign(app.duel.state,{status:'racing',s,traffic:[],rival:null,paused:true});app.cameraMode='chase';}
function practice(){app.setLightingMood('golden');scene(COURSE.findIndex(c=>c.practice),0,'titan_monster');}
function practiceDriveToward(feature,back,speed,seconds,stopOnTumble=false){
  const course=app.duel.course,s=app.duel.state,c=Math.cos(feature.heading),sn=Math.sin(feature.heading);
  const pose=course.nearest(feature.x-sn*back,feature.z-c*back,feature.s);
  Object.assign(s,{s:pose.s,prevS:pose.s,lateral:pose.lateral,prevLateral:pose.lateral,headingError:Math.atan2(Math.sin(feature.heading-pose.heading),Math.cos(feature.heading-pose.heading)),speedMph:speed,gear:1,paused:false});
  for(let i=0;i<seconds*120;i++){const heading=course.at(s.s).heading+s.headingError,error=Math.atan2(Math.sin(feature.heading-heading),Math.cos(feature.heading-heading));app.duel.setInput({throttle:.75,brake:0,steer:Math.max(-1,Math.min(1,-error*2))});app.duel.step(1/120);if(stopOnTumble&&s.tumble&&s.tumble.elapsed>.6)break;}
  s.paused=true;const p=course.worldAt(s.s,s.lateral);app.inspectionCamera={position:[p.x+c*16-sn*8,(s.groundHeight||0)+7,p.z-sn*16-c*8],target:[p.x,(s.groundHeight||0)+1.8,p.z]};
}

const start=()=>{app.inspectionCamera=null;app.startCampaign();const s=app.duel.state;s.status='racing';s.s=172;s.traffic=[];s.rival=null;};

function hit(){const s=app.duel.state;s.paused=false;s.speedMph=125;s.lateral=8.6;app.duel._crash('head_on');}

function damage(n){start();for(let i=0;i<n;i++){hit();if(i<n-1)while(app.duel.state.impactTimer>0)app.duel.step(1/120);}}

document.querySelector('#fresh').onclick=()=>{app.startCampaign();app.returnToMenu();app.menuCar='falcone_f42';};

document.querySelector('#silver').onclick=()=>{app.startCampaign({car:'stuttgart_959s'});app.returnToMenu();app.menuCar='stuttgart_959s';};

document.querySelector('#drive').onclick=()=>{start();app.autopilot=true;app._scriptedCrashDone=true;};

document.querySelector('#hit').onclick=()=>{app.autopilot=false;damage(1);};

document.querySelector('#critical').onclick=()=>{app.autopilot=false;damage(4);};

document.querySelector('#fatal').onclick=()=>{app.autopilot=false;damage(5);};

document.querySelector('#freeze').onclick=()=>{app.duel.state.paused=!app.duel.state.paused;};

document.querySelector('#alpine').onclick=()=>scene(1,2600);

document.querySelector('#chickens').onclick=()=>{start();app.duel.state.s=179;app.duel.state.lateral=-17;app.cameraMode='hood';};

document.querySelector('#offroad').onclick=()=>{scene(1,3100);app.duel.state.lateral=-45;};

app.onFrame=s=>{
  if(pauseAtFlight&&s.airborne&&s.airHeight>.8){s.paused=true;pauseAtFlight=false;smokePauseAt=null;}
  if(smokePauseAt!==null&&s.totalTimeSec>=smokePauseAt){s.paused=true;smokePauseAt=null;}
  const d=view.dataset;
  document.querySelector('#state').textContent=[
    `${s.status} · major crashes ${s.majorCrashes} · catastrophic ${s.catastrophic}`,
    `Course ${app.duel.course?.def.name} · section ${app.duel.course?.sectionAt(s.s).name} · s ${s.s.toFixed(0)} · lap ${s.lap||1} · car ${s.car}`,
    `Audio ${app.audio.context?.state||'locked'} · samples ${app.audio.sampleStatus} · ambience ${app.audio.ambienceStatus||'locked'}`,
    `${d.fps||0} FPS · ${d.drawCalls||0} draws · ${d.triangles||0} triangles · ${d.shaderPrograms||0} shaders`,
    `Frame p50 / p95 / max ${d.frameMsP50||0} / ${d.frameMsP95||0} / ${d.frameMsMax||0} ms · stalls >33 ms ${d.frameJankCount||0} / ${d.frameSamples||0}`,
    `CPU render p95 ${d.cpuRenderMsP95||0} ms (not GPU time)`,
    `Renderer setup ${d.rendererSetupMs||0} ms · attach-to-first-picture ${d.visualReadyMs||0} ms`,
    `World builds ${d.worldBuilds||0} (build CPU ${d.worldBuildMs||0} ms · first frame CPU ${d.firstFrameMs||0} ms · build-to-present wall ${d.worldReadyMs||0} ms)`,
    `Shader warmup ${d.warmupStatus||'off'} · parallel ${d.parallelShaderCompile||'unknown'} · submit ${d.warmupSubmitMs||0} ms · wait ${d.warmupWaitMs||0} ms · Quality ${d.edgeSmoothing==='true'?'High':'Performance'} · shadow ${d.shadowResolution||'loading'} · paint ${d.paint||'factory'}`,
    `Render ${d.renderPipeline||'loading'} · 3D scale ${Math.round(Number(d.resolutionScale||1)*100)}% · pixel ratio ${d.renderPixelRatio||'loading'}`,
    `Nitro ${s.boost.toFixed(2)} · crushes ${s.crushCount} · flocks ${s.collectedFlocks.length} · boundary resets ${s.boundaryResets} · lateral ${s.lateral.toFixed(1)} · height ${(s.airHeight||0).toFixed(2)} m`,
    `Jump length ${(s.airDistance||0).toFixed(2)} m · airtime ${(s.airTime||0).toFixed(2)} s · rollovers ${s.rollovers||0} · crushed opponents ${s.traffic.filter(c=>c.crushed).length} · support ${(s.groundHeight||0).toFixed(2)} m`,
  ].join('\n');
};
app.start();
