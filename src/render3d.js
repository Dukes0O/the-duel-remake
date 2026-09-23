import {createCombatScene} from './combat-scene.js';
import * as THREE from 'three';
import {directionalCameraPose} from './camera-views.js';
import { CARS, DRIVE } from './config.js';
import { createVehicle, updateVehicleDamage, updateNpcVehicleDamage } from './vehicles.js';
import { buildEnvironment, worldAtExtended, disposeTree } from './world.js';
import { createDrivingEffects } from './effects.js';
import { createExplosion } from './explosion.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createChickens } from './chickens.js';
import { createVehicleAssets } from './vehicle-assets.js';
import { updateDriver } from './driver.js';
import { createAmbientShading } from './ambient-shading.js';
import { styleGhostVehicle } from './ghost-vehicle.js';
import { constrainTunnelCamera } from './camera-clearance.js';
import { applyVehiclePaint } from './vehicle-paint.js';
import { createRenderQuality } from './render-quality.js';
import { createAdaptiveResolution } from './adaptive-resolution.js';
import { renderMainView } from './scene-presentation.js';
import { createSceneLighting } from './scene-lighting.js';
import { animateScene, syncScene } from './scene-systems.js';
import { environmentKey } from './environment-key.js';
import { createRenderWarmup, compileWarmupPipeline, compileWarmupScene, isRenderWarmupEnabled, preparationKey } from './render-warmup.js';
import { placeGroundedVehicle, vehicleGroundPoint, vehicleGroundSlope, applyVehicleTerrainPose } from './vehicle-grounding.js';
import { createFrameMetrics } from './frame-metrics.js';
import { createRearView } from './rear-view.js';

// This layer only reads simulation state. Asset replacement never changes race rules.
export function attachRenderer(host, app) {
  const rendererAttachedAt=performance.now();let firstPresentation=true;
  let disposed=false,raf,sceneRevision=0,warmupTicket=null,warmupKey=null,readinessClaimed=false;
  const frameMetrics=createFrameMetrics();
  const adaptiveResolution=createAdaptiveResolution();
  let metricRevision=-1,metricEnvironment=null,metricQuality=null,metricRatio=null,metricMenu=null,metricCamera=null,metricMood=null,metricInspection=null,metricCar=null;
  function resetFrameMetrics(){
    frameMetrics.reset();
    // Clear stale readings on a real configuration change, not every frame.
    for(const key of ['frameSamples','frameWindowMs','frameMsP50','frameMsP95','frameMsMax','frameJankCount','cpuRenderMsP50','cpuRenderMsP95','cpuRenderMsMax','fps'])host.dataset[key]='0';
  }
  // High uses SMAA; Performance keeps its original unsmoothed edge treatment.
  // Canvas MSAA would add a new full-scene cost on the direct rendering path.
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const warmupRequested=isRenderWarmupEnabled(window.location.search),parallelShaderCompile=renderer.extensions.has('KHR_parallel_shader_compile');
  const warmup=warmupRequested&&parallelShaderCompile?createRenderWarmup():null,readinessOwner={};
  host.dataset.parallelShaderCompile=String(parallelShaderCompile);host.dataset.warmupSubmitMs='0';host.dataset.warmupWaitMs='0';
  host.dataset.warmupStatus=warmupRequested?parallelShaderCompile?'idle':'unsupported-fallback':'off';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'The Duel three-dimensional racing scene');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, host.clientWidth / host.clientHeight, .15, 2400);
  const composer=new EffectComposer(renderer);
  composer.addPass(Object.assign(new RenderPass(scene,camera),{name:'Scene and shadows'}));
  const ambientShading=createAmbientShading(scene,camera);ambientShading.name='Contact shading';composer.addPass(ambientShading);
  const bloom=new UnrealBloomPass(new THREE.Vector2(host.clientWidth,host.clientHeight),.20,.55,1.9);
  bloom.name='Bloom';composer.addPass(bloom);composer.addPass(Object.assign(new OutputPass(),{name:'Tone and colour'}));
  const lighting=createSceneLighting({scene,renderer,bloom,host});
  const quality=createRenderQuality({renderer,composer,ambientShading,sun:lighting.sun,host});
  const rearView=createRearView({renderer,scene,host});
  let course, world, loadedCar, loadedRivalCar, player, rival, chickens, ghost, ghostStyle, worldKey;
  let worldBuildCount=0,firstWorldFrame=false,worldReadyStarted=0;
  const vehicleAssets=createVehicleAssets();
  function prepareVehicle(key,{retry=false}={}) {
    if(disposed)return false;
    let status=vehicleAssets.status(key);
    if(status==='idle'||status==='error'&&retry){vehicleAssets.load(key,{retry});status=vehicleAssets.status(key);}
    host.dataset.vehicleKey=key;host.dataset.vehicleAsset=status;host.dataset.heroAsset=status;
    host.dataset.vehicleSource=vehicleAssets.source(key)||'unknown';
    if(status!=='ready'){
      // Hide the previous selection; a loading model must not show an old body.
      renderer.domElement.style.visibility='hidden';
      rearView.hide();
      if(!readinessClaimed){app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}
      app.holdVisualReadiness?.(readinessOwner);
      return false;
    }
    return true;
  }
  const traffic = [];
  const police = createVehicle({ color: 0x172a36, accent: 0xeeeecc });
  const lamps = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.48, .16, .32), new THREE.MeshBasicMaterial({ color: i ? 0x178aff : 0xff2211 }));
    m.position.set(i ? .34 : -.34, 1.66, -.1); lamps.add(m);
  }
  police.add(lamps);police.userData.crushAttachments=[lamps];scene.add(police);
  const effects = createDrivingEffects(); scene.add(effects.group);
  const explosion = createExplosion(); scene.add(explosion.group);
  const combatScene=createCombatScene();scene.add(combatScene.group);
  function retireObject(object,beforeDispose){
    combatScene.detachVehicle(object);
    scene.remove(object);
    const release=()=>{beforeDispose?.();disposeTree(object);};
    if(warmup)warmup.releaseWhenIdle(release);else release();
  }
  function build(next) {
    const buildStart=performance.now();
    worldReadyStarted=buildStart;host.dataset.worldReadyMs='0';
    if (world) retireObject(world);
    course = next;
    worldKey=environmentKey(next);
    host.dataset.worldBuilds=String(++worldBuildCount);
    sceneRevision++;
    lighting.apply({course,mood:app.lightingMood});
    world = buildEnvironment(course); scene.add(world);
    chickens=createChickens(course);world.add(chickens.group);
    ambientShading.refresh();
    host.dataset.worldBuildMs=(performance.now()-buildStart).toFixed(0);firstWorldFrame=true;
  }
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  let ready = false, lastMenu = null, previousT = performance.now();
  function frame(now = performance.now(),measure=false) {
    if(disposed)return;
    const phaseProbe=measure&&app.frameDiagnostics?.active?app.frameDiagnostics:null;
    const updateStarted=phaseProbe?phaseProbe.now():0;
    const capture=measure&&!document.hidden;
    if(!capture)frameMetrics.suspend();
    const dt = Math.min(.05, Math.max(.001, (now - previousT) / 1000)); previousT = now;
    const st = app.duel.state, menu = st.status === 'menu', next = menu ? app.getMenuCourse(app.menuStage||0) : app.duel.course;
    const moving = st.status === 'racing' && !st.paused;
    if (!next) {rearView.hide();frameMetrics.suspend();adaptiveResolution.reset();return;}
    const selectedCar=(menu&&app.menuCar)||st.car,carKey=Object.hasOwn(CARS,selectedCar)?selectedCar:'falcone_f42';
    if(!prepareVehicle(carKey)){frameMetrics.suspend();adaptiveResolution.reset();return;}
    const rivalCarKey=!menu&&st.rival?.car||carKey;
    if(rivalCarKey!==carKey&&!prepareVehicle(rivalCarKey)){frameMetrics.suspend();adaptiveResolution.reset();return;}
    if (course !== next) {
      if(world&&worldKey===environmentKey(next)){course=next;lighting.apply({course,mood:app.lightingMood});}
      else build(next);
      syncScene(world,menu?{crushedProps:[]}:st,0);
      ready = false;
    }
    if (menu !== lastMenu) { ready = false; lastMenu = menu; }
    if (carKey !== loadedCar) {
      if(ghost){const style=ghostStyle;retireObject(ghost,()=>style.restore());ghost=null;ghostStyle=null;}
      if (player) retireObject(player);
      if(rival){retireObject(rival);rival=null;}
      player = vehicleAssets.create(carKey);
      scene.add(player); loadedCar = carKey;sceneRevision++;
      ambientShading.refresh();
    }
    if(rival&&loadedRivalCar!==rivalCarKey){retireObject(rival);rival=null;}
    if (!rival) { rival = vehicleAssets.create(rivalCarKey,{color:0xbfcace,accent:0x142a36}); loadedRivalCar=rivalCarKey;scene.add(rival);sceneRevision++;ambientShading.refresh(); }
    const distance = menu ? 172 : st.s, lateral = menu ? -2.8 : st.lateral;
    const pp = vehicleGroundPoint(course,distance,lateral);
    lighting.apply({course,theme:course.themeAt(distance),mood:app.lightingMood,blend:1-Math.exp(-dt*1.1),tunnel:!!course.tunnelAt(distance)});
    const tall=carKey==='titan_monster';
    const speed=Math.abs(st.speedMph);
    // Keep travel signed for both the live car and recorded reverse ghost poses.
    const wheelTravel = mph => moving ? mph * (DRIVE.mphToWorld || .44704) * dt : 0;
    place(player, pp, 0, wheelTravel(st.speedMph));
    applyVehiclePaint(player,app.getPaintPreset?.(carKey,{menu})??null);
    host.dataset.paint=player.userData.paintAppearance?.id||'factory';
    const wreckAge=st.catastrophic ? Math.max(0,(st.impactDuration||0)-(st.impactTimer||0)) : 0;
    updateVehicleDamage(player,menu?0:st.majorCrashes, !menu&&st.catastrophic, wreckAge,menu?null:st.damageZones,menu?0:st.crushDamage);
    const steering = menu ? 0 : st.steerVisual || 0;
    updateDriver(player.userData.driver,steering,menu?0:st.slipAngle,!menu&&st.catastrophic);
    if(player.userData.steeringPivot)player.userData.steeringPivot.rotation.z=steering*.7;
    const impact = menu ? 0 : Math.min(1, (st.impactTimer || 0) / (st.impactDuration || 1.8));
    const rough = menu ? 0 : st.roughness || 0;
    const motionTime = st.stageTimeSec;
    player.rotation.y += menu ? 0 : (st.headingError || 0) + (st.slipAngle || 0) + (st.crashSpin || 0);
    player.rotation.z = steering * Math.min(speed / 160, 1) * .045;
    const slope=groundSlope(course,distance,lateral,player.rotation.y-pp.heading);
    player.rotation.x=slope.pitch;player.rotation.z+=slope.roll;
    if (!menu) {
      applyVehicleTerrainPose(player,course,st);
      player.position.y+=st.airHeight||0;
      if(!st.tumble){
      player.position.y += rough * Math.abs(Math.sin(motionTime * 35)) * .15;
      player.rotation.z += Math.sin(motionTime * 24) * rough * .07;
      player.rotation.x += Math.sin(motionTime * 29) * rough * .055;
      const hitArc = Math.sin(impact * Math.PI);
      player.position.y += hitArc * (st.impactStrength || 0) * .55;
      player.rotation.z += hitArc * (st.impactSide || 1) * .24;
      player.rotation.x -= hitArc * .18;
      if(st.catastrophic){player.position.y+=.36+Math.sin(Math.min(1,wreckAge/1.25)*Math.PI)*1.4;player.rotation.z+=(st.impactSide||1)*Math.min(wreckAge,1.1)*.56;}
      }
    }
    const braking=st.gear===-1?st.input.throttle:st.input.brake;
    for (const lamp of player.userData.brakeLights || []) lamp.material.emissiveIntensity = braking ? 4 : 1.4;
    for (const flame of player.userData.boostFlames || []) { flame.visible = !!st.boosting && !menu; flame.scale.z = .7 + Math.sin(now * .052) * .3; }
    for (const pivot of player.userData.wheelPivots || []) if (pivot.userData.front) pivot.rotation.y = -steering * .22;
    player.visible = menu || app.cameraMode !== 'hood' || st.catastrophic;
    if (menu) {
      const cp = worldAtExtended(course, distance + 6.4, lateral + 7.7 + Math.sin(now * .00009) * .6);
      camTarget.set(cp.x, cp.y + (tall?4.35:2.85), cp.z);
      const composition = Math.min(1, camera.aspect / 1.7);
      const aim = worldAtExtended(course, distance + 2.6 * composition, lateral - 2.8 * composition);
      const compact=host.clientHeight<850;
      lookTarget.set(aim.x, pp.y + (tall ? (compact ? .95 : 1.8) : compact ? -1.1 : .95), aim.z); camera.fov = 48;
    } else {
      const mode = app.cameraMode || 'chase';
      const back = mode === 'hood' ? .8 : mode === 'wide' ? -16 : tall?-12:-8.7;
      const height = mode === 'hood' ? (tall?3.2:1.38) : mode === 'wide' ? (tall?7.5:5.6) : tall?5.8:3.65;
      const cp = worldAtExtended(course, distance + back, lateral);
      const supportLift=Number.isFinite(st.groundHeight)?st.groundHeight-course.groundAt(distance,lateral).y:0;
      const groundLift = pp.y - course.at(distance).y+supportLift+(st.airHeight||0)*.65;
      camTarget.set(cp.x, cp.y + height + groundLift, cp.z);
      const aim = worldAtExtended(course, distance + (mode === 'hood' ? 42 : 26), lateral);
      lookTarget.set(aim.x, aim.y + (tall?1.65:1.05) + groundLift, aim.z);
      const view=directionalCameraPose(mode,{x:pp.x,y:pp.y+supportLift+(st.airHeight||0),z:pp.z},pp.heading+(st.headingError||0)+(st.slipAngle||0),tall);
      if(view){
        camTarget.set(view.position.x,view.position.y,view.position.z);lookTarget.set(view.target.x,view.target.y,view.target.z);
        const near=course.nearest(camTarget.x,camTarget.z,distance),tunnel=course.tunnelAt(near.s);
        if(tunnel){const limit=tunnel.width-.65,p=course.worldAt(near.s,Math.max(-limit,Math.min(limit,near.lateral)));camTarget.x=p.x;camTarget.z=p.z;}
        camTarget.y=Math.max(camTarget.y,course.groundAt(near.s,near.lateral).y+.65);
      }
      camera.fov = THREE.MathUtils.damp(camera.fov, 55 + Math.min(speed / 200, 1) * 10 + (st.boosting ? 7 : 0) + impact * 7, 4, dt);
      const shake = impact * (st.impactStrength || 0) * .34 + rough * Math.min(speed / 100, 1) * .10;
      camTarget.x += Math.sin(motionTime * 81) * shake;
      camTarget.y += Math.cos(motionTime * 93) * shake * .62;
      if(st.catastrophic){
        const angle=pp.heading-.48-Math.min(wreckAge,2.6)*.17,reach=10.5+Math.min(wreckAge,2)*2;
        camTarget.set(pp.x-Math.sin(angle)*reach,pp.y+4.5,pp.z-Math.cos(angle)*reach);
        lookTarget.set(pp.x,pp.y+1.3,pp.z);camera.fov=58;
      }
      constrainTunnelCamera(course,camTarget,distance+back);
    }
    if(!menu&&app.inspectionCamera){camTarget.fromArray(app.inspectionCamera.position);lookTarget.fromArray(app.inspectionCamera.target);camera.fov=48;}
    if (!ready || menu) camera.position.copy(camTarget);
    else {
      camera.position.lerp(camTarget, 1 - Math.exp(-14 * dt));
      // Follow longitudinal motion immediately: world-space damping otherwise
      // adds a speed-dependent camera gap and makes the car shrink at speed.
      camera.position.x = camTarget.x; camera.position.z = camTarget.z;
    }
    if(!menu)constrainTunnelCamera(course,camera.position,distance);
    ready = true; camera.lookAt(lookTarget); camera.updateProjectionMatrix();
    lighting.followCamera(camera,pp,now/1000);
    const visualGap=s=>app.duel.relativeS?app.duel.relativeS(s,st.s)-st.s:s-st.s;
    const ghostPose=!menu&&app.ghostPose?.car===carKey?app.ghostPose:null;
    if(ghostPose&&!ghost){
      ghost=vehicleAssets.create(carKey);
      ghost.name='Personal best ghost';ghostStyle=styleGhostVehicle(ghost);scene.add(ghost);sceneRevision++;ambientShading.refresh();
    }
    if(ghost){
      ghost.visible=!!ghostPose&&Math.abs(ghostPose.s-st.s)<650;
      if(ghost.visible){const gp=vehicleGroundPoint(course,ghostPose.s,ghostPose.lateral),separation=Math.hypot(gp.x-pp.x,gp.z-pp.z);ghostStyle.opacity(.22*THREE.MathUtils.clamp((separation-2)/7,0,1));place(ghost,gp,ghostPose.headingError,wheelTravel(ghostPose.speedMph));ghost.position.y+=ghostPose.airHeight||0;const slope=groundSlope(course,ghostPose.s,ghostPose.lateral,ghostPose.headingError);ghost.rotation.x=slope.pitch;ghost.rotation.z=slope.roll;applyVehicleTerrainPose(ghost,course,ghostPose);}
    }
    updateNpcVehicleDamage(rival,menu?null:st.rival);
    rival.visible = !menu && !!st.rival && Math.abs(visualGap(st.rival.s)) < 650;
    if (rival.visible) {place(rival, vehicleGroundPoint(course,st.rival.s, st.rival.lateral), st.rival.headingError||0, wheelTravel(st.rival.speedMph));rival.position.y+=st.rival.airHeight||0;const slope=groundSlope(course,st.rival.s,st.rival.lateral,st.rival.headingError||0);rival.rotation.x=slope.pitch;rival.rotation.z=slope.roll;applyVehicleTerrainPose(rival,course,st.rival);updateDriver(rival.userData.driver,Math.max(-1,Math.min(1,(st.rival.pushVelocity||0)*.08)),0,false);for(const lamp of rival.userData.brakeLights||[])lamp.material.emissiveIntensity=st.rival.braking?4:1.4;}
    const palette = [0xd9c99c, 0x2c566a, 0x847458, 0xf0e9dc, 0x5e3d2f];
    while (traffic.length < st.traffic.length) { const car = createVehicle({ color: palette[traffic.length % palette.length] }); scene.add(car); traffic.push(car);sceneRevision++;ambientShading.refresh(); }
    traffic.forEach((car, i) => {
      const d = st.traffic[i]; car.visible = !menu && !!d?.alive && Math.abs(visualGap(d.s)) < 540;
      updateNpcVehicleDamage(car,!menu&&d?.alive?d:null);
      if (car.visible) {const turn=(d.dir<0?Math.PI:0)+(d.headingError||0);place(car,vehicleGroundPoint(course,d.s,d.lateral),turn,wheelTravel(d.speedMph));car.position.y+=d.airHeight||0;const slope=groundSlope(course,d.s,d.lateral,turn);car.rotation.x=slope.pitch;car.rotation.z=slope.roll;applyVehicleTerrainPose(car,course,d);}
    });
    const pursuit = st.police.pursuit; police.visible = !menu && !!pursuit?.active && pursuit.distanceU < 250;
    updateNpcVehicleDamage(police,!menu&&pursuit?.active?pursuit:null);
    if (police.visible) {
      place(police, vehicleGroundPoint(course,pursuit.s, pursuit.lateral), pursuit.headingError || 0, wheelTravel(pursuit.speedMph));
      police.position.y+=pursuit.airHeight||0;
      const slope=groundSlope(course,pursuit.s,pursuit.lateral,pursuit.headingError||0);police.rotation.x=slope.pitch;police.rotation.z=slope.roll;
      applyVehicleTerrainPose(police,course,pursuit);
      for(const lamp of police.userData.brakeLights||[])lamp.material.emissiveIntensity=pursuit.braking?4:1.4;
      lamps.children.forEach((lamp, i) => { lamp.visible = Math.floor(now / 130) % 2 === i; });
    }
    effects.update({ p: pp, course, state: menu ? { ...st, speedMph: 0, offRoad: false, roughness: 0, impactTimer: 0 } : st, dt: st.paused ? 0 : dt, now });
    explosion.update(pp,st,st.paused?0:dt);combatScene.update(app.duel,{player,rival});
    if(!st.paused)chickens.update(menu?{status:'menu',s:172,collectedFlocks:[]}:st,menu?now/1000:st.totalTimeSec);
    animateScene(world,now/1000);
    syncScene(world,menu?{crushedProps:[]}:st,st.paused?0:dt);
    lighting.updateVehicles({course,position:pp,player,police,distance,tall,now,high:app.ambientOcclusionEnabled!==false,menu});
    host.dataset.driver=player.userData.driver?'ready':'absent';
    const high=app.ambientOcclusionEnabled!==false;
    quality.update(high,adaptiveResolution.scale);host.dataset.ambientShading=String(ambientShading.enabled);
    const ratio=renderer.getPixelRatio();
    const metricsChanged=metricRevision!==sceneRevision||metricEnvironment!==scene.environment||metricQuality!==ambientShading.enabled||metricRatio!==ratio||metricMenu!==menu||metricCamera!==app.cameraMode||metricMood!==app.lightingMood||metricInspection!==app.inspectionCamera||metricCar!==carKey;
    if(metricsChanged){
      resetFrameMetrics();metricRevision=sceneRevision;metricEnvironment=scene.environment;metricQuality=ambientShading.enabled;metricRatio=ratio;metricMenu=menu;metricCamera=app.cameraMode;metricMood=app.lightingMood;metricInspection=app.inspectionCamera;metricCar=carKey;
    }
    if(warmup){
      // Preparation gates structural changes only. New traffic, ghosts, damage,
      // weather blends and HDR completion must not pause an underway race.
      const revision=preparationKey({worldBuildCount,car:loadedCar,high:ambientShading.enabled});
      if(revision!==warmupKey){
        warmupKey=revision;app.holdVisualReadiness?.(readinessOwner);firstWorldFrame=true;
        host.dataset.warmupSubmitMs='0';host.dataset.warmupWaitMs='0';
        warmupTicket=warmup.request(revision,()=>{
          const started=performance.now();let compilation;
          try{compilation=high?compileWarmupPipeline(renderer,scene,camera,composer):compileWarmupScene(renderer,scene,camera,null);}
          finally{if(!disposed&&warmupKey===revision)host.dataset.warmupSubmitMs=(performance.now()-started).toFixed(0);}
          const submitted=performance.now();
          return Promise.resolve(compilation).finally(()=>{
            if(!disposed&&warmupKey===revision)host.dataset.warmupWaitMs=(performance.now()-submitted).toFixed(0);
          });
        });
      }
      host.dataset.warmupStatus=warmupTicket.state.status;
      if(!warmup.canDraw(warmupKey)){rearView.hide();frameMetrics.suspend();adaptiveResolution.reset();return;}
    }
    renderer.info.autoReset=false;renderer.info.reset();
    const updateEnded=phaseProbe?phaseProbe.now():0;
    const loadingFrame=firstWorldFrame||metricsChanged,renderStarted=performance.now();renderMainView(renderer,composer,high);
    rearView.render({state:st,player,course,now});
    const cpuRenderMs=performance.now()-renderStarted;
    phaseProbe?.recordRendererFrame(now,updateEnded-updateStarted,cpuRenderMs);
    if(firstWorldFrame){host.dataset.firstFrameMs=cpuRenderMs.toFixed(0);firstWorldFrame=false;}
    if(worldReadyStarted){host.dataset.worldReadyMs=(performance.now()-worldReadyStarted).toFixed(0);worldReadyStarted=0;}
    if(firstPresentation){host.dataset.visualReadyMs=(performance.now()-rendererAttachedAt).toFixed(0);firstPresentation=false;}
    renderer.domElement.style.visibility='visible';
    if(readinessClaimed&&!app.visualReady)app.presentVisualFrame?.(readinessOwner,st,app.duel.course);
    // Only consecutive, presented RAF frames count. Debug draws, compilation,
    // loading and hidden-tab intervals cannot dilute or inflate these samples.
    if(capture&&!loadingFrame)frameMetrics.record(now,cpuRenderMs);else frameMetrics.suspend();
    // Learn only from visible, presented driving frames. Loading, pauses,
    // menus and debug draws must not lower quality. Apply changes next frame.
    adaptiveResolution.sample(now,capture&&!loadingFrame&&!high&&moving);
    const summary=capture&&!loadingFrame?frameMetrics.summary(now):null;
    if (summary) {
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.fps = String(Math.round(summary.fps));
      host.dataset.geometries = String(renderer.info.memory.geometries);
      host.dataset.textures = String(renderer.info.memory.textures);
      host.dataset.shaderPrograms=String(renderer.info.programs?.length||0);
      host.dataset.frameSamples=String(summary.samples);host.dataset.frameWindowMs=summary.windowMs.toFixed(1);
      host.dataset.frameMsP50=summary.frameMsP50.toFixed(2);host.dataset.frameMsP95=summary.frameMsP95.toFixed(2);host.dataset.frameMsMax=summary.frameMsMax.toFixed(2);host.dataset.frameJankCount=String(summary.jankCount);
      host.dataset.cpuRenderMsP50=summary.cpuRenderMsP50.toFixed(2);host.dataset.cpuRenderMsP95=summary.cpuRenderMsP95.toFixed(2);host.dataset.cpuRenderMsMax=summary.cpuRenderMsMax.toFixed(2);
    }
  }
  const tick = t => { if (disposed) return; frame(t,true); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
  const resize = () => { renderer.setSize(host.clientWidth, host.clientHeight); composer.setSize(host.clientWidth,host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();rearView.resize();resetFrameMetrics();adaptiveResolution.reset(); };
  const visibility = () => {resetFrameMetrics();adaptiveResolution.reset();};
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange',visibility);
  if(warmupRequested){app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}
  host.dataset.rendererSetupMs=(performance.now()-rendererAttachedAt).toFixed(0);
  const debugApi=window.__render = { renderer, scene, camera, composer, renderFrame() { frame(); return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; }, sample() {
    frame();if(disposed||warmup&&!warmup.canDraw(warmupKey))return {warming:!disposed,distinctColors:0,drawCalls:0,triangles:0};const rt = new THREE.WebGLRenderTarget(64, 48); renderer.setRenderTarget(rt); renderer.render(scene, camera);
    const data = new Uint8Array(64 * 48 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 64, 48, data); renderer.setRenderTarget(null); rt.dispose();
    const colors = new Set(); for (let i = 0; i < data.length; i += 4) colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
    return { distinctColors: colors.size, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  } };
  return { prepareVehicle, retryVehicle() { return prepareVehicle(host.dataset.vehicleKey,{retry:true}); }, dispose() {
    if(disposed)return;disposed=true;lighting.stop();cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);
    if(readinessClaimed)app.releaseVisualReadiness?.(readinessOwner);
    if(window.__render===debugApi)delete window.__render;
    if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);
    const release=()=>{rearView.dispose();combatScene.dispose();effects.dispose();explosion.dispose();lighting.dispose();composer.passes.forEach(p=>p.dispose?.());composer.dispose();ghostStyle?.restore();disposeTree(scene);renderer.dispose();};
    if(warmup)warmup.dispose(release);else release();
  } };
}

function place(car, p, turn = 0, travel = 0) {
  placeGroundedVehicle(car,p,turn,travel);
}

function groundSlope(course,s,lat,angle){
  return vehicleGroundSlope(course,s,lat,angle);
}
