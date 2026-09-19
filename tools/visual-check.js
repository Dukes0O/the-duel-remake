// Developer-only visual/audio regression page, served by Vite, not bundled by build.



import {App} from '../src/app.js';



import {COURSE} from '../src/config.js';



import {attachRenderer} from '../src/render3d.js';



let smokePauseAt=null;
const app=new App();const view=document.querySelector('#view');attachRenderer(view,app);



for(const [id,label,fn]of[



  ['ambient','Toggle graphics quality',()=>{app.ambientOcclusionEnabled=app.ambientOcclusionEnabled===false;}],

  ['coast','Coast scene',()=>scene(0,2850)],['harbor','Harbor scene',()=>scene(2,700)],



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
  ['grass-close','Grass close-up',()=>{scene(1,2600);app.cameraMode='hood';const course=app.duel.course;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(app.duel.course!==course)return;const focus=course.groundAt(2600,0);let best=null,distance=Infinity;window.__render?.scene.traverse(mesh=>{if(!mesh.userData.landscapeCell||mesh.userData.landscapeCell.kind!=='foliage'||!mesh.material.map)return;const data=mesh.instanceMatrix.array;for(let i=0;i<mesh.count;i++){const n=i*16,x=data[n+12],y=data[n+13],z=data[n+14],d=Math.hypot(x-focus.x,z-focus.z);if(d<distance){distance=d;best={x,y,z};}}});if(best)app.inspectionCamera={position:[best.x+2.2,best.y+1.0,best.z+2.2],target:[best.x,best.y+.3,best.z]};}));}],

  ['pine-close','Pine close-up',()=>{scene(1,2600);app.cameraMode='hood';const course=app.duel.course;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(app.duel.course!==course)return;const focus=course.groundAt(2600,0);let best=null,distance=Infinity;window.__render?.scene.traverse(mesh=>{if(!mesh.name.startsWith('Pine crowns '))return;const data=mesh.instanceMatrix.array;for(let i=0;i<mesh.count;i++){const n=i*16,x=data[n+12],y=data[n+13],z=data[n+14],d=Math.hypot(x-focus.x,z-focus.z),h=Math.hypot(data[n+4],data[n+5],data[n+6])*6.5;if(d<distance){distance=d;best={x,y,z,h};}}});if(best)app.inspectionCamera={position:[best.x+best.h*.6,best.y+best.h*.42,best.z+best.h*1.05],target:[best.x,best.y+best.h*.43,best.z]};}));}],

  ...[['slope-car','Slope supercar','falcone_f42'],['slope-truck','Slope Titan','titan_monster']].map(([id,label,car])=>[id,label,()=>{scene(COURSE.findIndex(c=>c.kind==='rally'),2168,car);app.duel.state.car=car;const p=app.duel.course.groundAt(2168,0),c=Math.cos(p.heading),sn=Math.sin(p.heading);app.inspectionCamera={position:[p.x+c*6-sn*5,p.y+1.7,p.z-sn*6-c*5],target:[p.x,p.y+(car==='titan_monster'?1.6:.6),p.z]};}]),

  ['parked-car','Parked sedan',()=>{scene(COURSE.findIndex(c=>c.kind==='chase'),0,'banshee_muscle');const car=app.duel.course.features.parkedCars?.[0];if(car){app.duel.state.s=car.s;const c=Math.cos(car.heading),n=Math.sin(car.heading);app.inspectionCamera={position:[car.x+c*5+n*5,car.y+2.7,car.z-n*5+c*5],target:[car.x,car.y+.75,car.z]};}}],

  ['smoke','Corner smoke',()=>{scene(COURSE.findIndex(c=>c.kind==='drift'),0,'banshee_muscle');const bend=app.duel.course.samples.find(p=>p.s>250&&Math.abs(p.curvature)>.007);Object.assign(app.duel.state,{s:bend?.s||700,speedMph:100,gear:3,paused:false});smokePauseAt=app.duel.state.totalTimeSec+.9;app.cameraMode='wide';document.body.classList.add('smoke-check');app.autopilot=true;app._scriptedCrashDone=true;}],



]){const button=document.createElement('button');button.id=id;button.textContent=label;button.onclick=fn;document.querySelector('nav').append(button);}



if(location.port==='5175'){const button=document.createElement('button');button.textContent='Create funded QA player';button.onclick=()=>{app.returnToMenu();const player=app.players.players.find(p=>p.name==='Garage QA');if(player)app.selectPlayer(player.id);else app.addPlayer('Garage QA');app.profile={...app.profile,credits:Math.max(app.profile.credits,40000)};app._saveProfile();};document.querySelector('nav').append(button);}



function scene(stage,s,car='falcone_f42'){smokePauseAt=null;document.body.classList.remove('smoke-check');app.autopilot=false;app.inspectionCamera=null;app.duel.startCampaign({startStage:stage,car,seed:1989});Object.assign(app.duel.state,{status:'racing',s,traffic:[],rival:null,paused:true});app.cameraMode='chase';}


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



app.onFrame=s=>{if(smokePauseAt!==null&&s.totalTimeSec>=smokePauseAt){s.paused=true;smokePauseAt=null;}document.querySelector('#state').textContent=`${s.status} · major crashes ${s.majorCrashes} · catastrophic ${s.catastrophic}\nCourse ${app.duel.course?.def.name} · section ${app.duel.course?.sectionAt(s.s).name} · s ${s.s.toFixed(0)} · lap ${s.lap||1} · car ${s.car}\nAudio ${app.audio.context?.state||'locked'} · samples ${app.audio.sampleStatus} · ambience ${app.audio.ambienceStatus||'locked'}\n${view.dataset.fps||0} FPS · ${view.dataset.drawCalls||0} draws · ${view.dataset.triangles||0} triangles\nWorld builds ${view.dataset.worldBuilds||0} (${view.dataset.worldBuildMs||0} ms + first frame ${view.dataset.firstFrameMs||0} ms)\nShader warmup ${view.dataset.warmupStatus||'off'} · parallel ${view.dataset.parallelShaderCompile||'unknown'} · submit ${view.dataset.warmupSubmitMs||0} ms · wait ${view.dataset.warmupWaitMs||0} ms · Quality ${view.dataset.edgeSmoothing==='true'?'High':'Performance'} · shadow ${view.dataset.shadowResolution||'loading'} · paint ${view.dataset.paint||'factory'}\nNitro ${s.boost.toFixed(2)} · crushes ${s.crushCount} · flocks ${s.collectedFlocks.length} · boundary resets ${s.boundaryResets} · lateral ${s.lateral.toFixed(1)}`;};app.start();
