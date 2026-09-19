import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { COURSE, CARS, DRIVE } from './config.js';
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
import { createAtmosphericSky, SUN_OFFSET } from './atmosphere.js';
import { resolveLightingSettings } from './lighting-moods.js';
import { createLocalLighting } from './local-lighting.js';
import { environmentKey } from './environment-key.js';
import { createRenderWarmup, compileWarmupScene, isRenderWarmupEnabled } from './render-warmup.js';
import { placeGroundedVehicle, vehicleGroundPoint, vehicleGroundSlope } from './vehicle-grounding.js';

// This layer only reads simulation state. Asset replacement never changes race rules.
export function attachRenderer(host, app) {
  let disposed=false,raf,sceneRevision=0,warmupTicket=null,warmupKey=null,readinessClaimed=false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
  composer.addPass(new RenderPass(scene,camera));
  const ambientShading=createAmbientShading(scene,camera);composer.addPass(ambientShading);
  const bloom=new UnrealBloomPass(new THREE.Vector2(host.clientWidth,host.clientHeight),.20,.55,1.9);
  composer.addPass(bloom);composer.addPass(new OutputPass());
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture; scene.environmentIntensity = .82;
  room.dispose(); pmrem.dispose();
  let naturalEnvironment;
  new RGBELoader().load('/assets/textures/sunset-lighting.hdr',texture=>{
    if(disposed){texture.dispose();return;}
    const pm=new THREE.PMREMGenerator(renderer);naturalEnvironment=pm.fromEquirectangular(texture);
    if(course?.def.theme!=='city')scene.environment=naturalEnvironment.texture;
    texture.dispose();pm.dispose();host.dataset.environment='sunset-hdri';
  },undefined,()=>{if(!disposed)host.dataset.environment='studio-fallback';});
  const hemi = new THREE.HemisphereLight(0xb2cde0, 0x714226, 1.65);
  const sun = new THREE.DirectionalLight(0xffddac, 3.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 240 });
  sun.shadow.bias = -.00035; sun.shadow.normalBias = .03;
  scene.add(hemi, sun, sun.target);
  const quality=createRenderQuality({renderer,composer,ambientShading,sun,host});
  const atmosphere=createAtmosphericSky(),sky=atmosphere.sky;scene.add(sky);
  const localLighting=createLocalLighting(scene);
  let course, world, loadedCar, player, rival, chickens, ghost, ghostStyle, worldKey;
  let worldBuildCount=0,firstWorldFrame=false;
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
  police.add(lamps); scene.add(police);
  const effects = createDrivingEffects(); scene.add(effects.group);
  const explosion = createExplosion(); scene.add(explosion.group);
  const headlights=[];
  for(const side of[-1,1]){
    const light=new THREE.SpotLight(0xe3edff,0,95,.43,.55,1.2);scene.add(light,light.target);headlights.push({light,side});
  }
  const lightColor=new THREE.Color(),sunOffset=new THREE.Vector3(SUN_OFFSET.x,SUN_OFFSET.y,SUN_OFFSET.z),targetSun=new THREE.Vector3();
  function retireObject(object,beforeDispose){
    scene.remove(object);
    const release=()=>{beforeDispose?.();disposeTree(object);};
    if(warmup)warmup.releaseWhenIdle(release);else release();
  }
  function applyLighting(theme,blend=1,tunnel=false){
    const night=theme==='city'||course?.def.timeOfDay==='night',settings=resolveLightingSettings(theme,{mood:app.lightingMood,night,tunnel});
    if(!scene.fog)scene.fog=new THREE.Fog(settings.fog,260,1650);
    scene.fog.color.lerp(lightColor.set(settings.fog),blend);scene.fog.near=THREE.MathUtils.lerp(scene.fog.near,settings.fogNear,blend);scene.fog.far=THREE.MathUtils.lerp(scene.fog.far,settings.fogFar,blend);
    sky.material.uniforms.top.value.lerp(lightColor.set(settings.top),blend);sky.material.uniforms.horizon.value.lerp(lightColor.set(settings.horizon),blend);sky.material.uniforms.sunStrength.value=THREE.MathUtils.lerp(sky.material.uniforms.sunStrength.value,settings.sunStrength,blend);
    sunOffset.lerp(targetSun.set(settings.sunOffset.x,settings.sunOffset.y,settings.sunOffset.z),blend);sky.material.uniforms.sunDir.value.copy(sunOffset).normalize();
    sky.material.uniforms.cloudCover.value=THREE.MathUtils.lerp(sky.material.uniforms.cloudCover.value,settings.cloudCover,blend);sky.material.uniforms.cloudTint.value.lerp(lightColor.setRGB(...settings.cloudTint),blend);
    hemi.groundColor.lerp(lightColor.set(settings.ground),blend);hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,settings.hemi,blend);sun.intensity=THREE.MathUtils.lerp(sun.intensity,settings.sun,blend);sun.color.lerp(lightColor.set(settings.sunColor),blend);
    scene.environment=night?environment.texture:naturalEnvironment?.texture||environment.texture;scene.environmentIntensity=THREE.MathUtils.lerp(scene.environmentIntensity,settings.env,blend);renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,settings.exposure,blend);bloom.strength=settings.bloom;host.dataset.theme=theme;host.dataset.tunnel=String(tunnel);host.dataset.lightingMood=night?'night':app.lightingMood||'clear';
  }
  function build(next) {
    const buildStart=performance.now();
    if (world) {
      // Imported instances share resources with the retained template.
      for (const child of [...world.children]) if (child.userData.sharedAsset) world.remove(child);
      retireObject(world);
    }
    course = next;
    worldKey=environmentKey(next);
    host.dataset.worldBuilds=String(++worldBuildCount);
    sceneRevision++;
    applyLighting(course.def.theme);
    world = buildEnvironment(course); scene.add(world);
    chickens=createChickens(course);world.add(chickens.group);
    ambientShading.refresh();
    host.dataset.worldBuildMs=(performance.now()-buildStart).toFixed(0);firstWorldFrame=true;
  }
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  let ready = false, lastMenu = null, previousT = performance.now(), metricsTime = previousT, metricFrames = 0;
  function frame(now = performance.now()) {
    if(disposed)return;
    const dt = Math.min(.05, Math.max(.001, (now - previousT) / 1000)); previousT = now;
    const st = app.duel.state, menu = st.status === 'menu', next = menu ? app.getMenuCourse(app.menuStage||0) : app.duel.course;
    const moving = st.status === 'racing' && !st.paused;
    if (!next) return;
    const selectedCar=(menu&&app.menuCar)||st.car,carKey=Object.hasOwn(CARS,selectedCar)?selectedCar:'falcone_f42';
    if(!prepareVehicle(carKey))return;
    if (course !== next) {
      if(world&&worldKey===environmentKey(next)){course=next;applyLighting(course.def.theme);}
      else build(next);
      world.userData.updateSimulation?.(menu?{crushedProps:[]}:st,0);
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
    if (!rival) { rival = vehicleAssets.create(carKey,{color:0xbfcace,accent:0x142a36}); scene.add(rival);sceneRevision++;ambientShading.refresh(); }
    const distance = menu ? 172 : st.s, lateral = menu ? -2.8 : st.lateral;
    const pp = vehicleGroundPoint(course,distance,lateral);
    applyLighting(course.themeAt(distance),1-Math.exp(-dt*1.1),!!course.tunnelAt(distance));
    const tall=carKey==='titan_monster';
    const speed=Math.abs(st.speedMph);
    // Keep travel signed for both the live car and recorded reverse ghost poses.
    const wheelTravel = mph => moving ? mph * (DRIVE.mphToWorld || .44704) * dt : 0;
    place(player, pp, 0, wheelTravel(st.speedMph));
    applyVehiclePaint(player,app.getPaintPreset?.(carKey,{menu})??null);
    host.dataset.paint=player.userData.paintAppearance?.id||'factory';
    const wreckAge=st.catastrophic ? Math.max(0,(st.impactDuration||0)-(st.impactTimer||0)) : 0;
    updateVehicleDamage(player,menu?0:st.majorCrashes, !menu&&st.catastrophic, wreckAge,menu?null:st.damageZones);
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
      player.position.y+=st.airHeight||0;
      player.position.y += rough * Math.abs(Math.sin(motionTime * 35)) * .15;
      player.rotation.z += Math.sin(motionTime * 24) * rough * .07;
      player.rotation.x += Math.sin(motionTime * 29) * rough * .055;
      const hitArc = Math.sin(impact * Math.PI);
      player.position.y += hitArc * (st.impactStrength || 0) * .55;
      player.rotation.z += hitArc * (st.impactSide || 1) * .24;
      player.rotation.x -= hitArc * .18;
      if(st.catastrophic){player.position.y+=.36+Math.sin(Math.min(1,wreckAge/1.25)*Math.PI)*1.4;player.rotation.z+=(st.impactSide||1)*Math.min(wreckAge,1.1)*.56;}
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
      const groundLift = pp.y - course.at(distance).y+(st.airHeight||0)*.65;
      camTarget.set(cp.x, cp.y + height + groundLift, cp.z);
      const aim = worldAtExtended(course, distance + (mode === 'hood' ? 42 : 26), lateral);
      lookTarget.set(aim.x, aim.y + (tall?1.65:1.05) + groundLift, aim.z);
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
    ready = true; camera.lookAt(lookTarget); camera.updateProjectionMatrix(); sky.position.copy(camera.position);
    atmosphere.update(now/1000);
    sun.position.set(pp.x+sunOffset.x, pp.y+sunOffset.y, pp.z+sunOffset.z); sun.target.position.set(pp.x, pp.y, pp.z); sun.target.updateMatrixWorld();
    const visualGap=s=>app.duel.relativeS?app.duel.relativeS(s,st.s)-st.s:s-st.s;
    const ghostPose=!menu&&app.ghostPose?.car===carKey?app.ghostPose:null;
    if(ghostPose&&!ghost){
      ghost=vehicleAssets.create(carKey);
      ghost.name='Personal best ghost';ghostStyle=styleGhostVehicle(ghost);scene.add(ghost);sceneRevision++;ambientShading.refresh();
    }
    if(ghost){
      ghost.visible=!!ghostPose&&Math.abs(ghostPose.s-st.s)<650;
      if(ghost.visible){const gp=vehicleGroundPoint(course,ghostPose.s,ghostPose.lateral),separation=Math.hypot(gp.x-pp.x,gp.z-pp.z);ghostStyle.opacity(.22*THREE.MathUtils.clamp((separation-2)/7,0,1));place(ghost,gp,ghostPose.headingError,wheelTravel(ghostPose.speedMph));ghost.position.y+=ghostPose.airHeight||0;const slope=groundSlope(course,ghostPose.s,ghostPose.lateral,ghostPose.headingError);ghost.rotation.x=slope.pitch;ghost.rotation.z=slope.roll;}
    }
    updateNpcVehicleDamage(rival,menu?null:st.rival);
    rival.visible = !menu && !!st.rival && Math.abs(visualGap(st.rival.s)) < 650;
    if (rival.visible) {place(rival, vehicleGroundPoint(course,st.rival.s, st.rival.lateral), st.rival.headingError||0, wheelTravel(st.rival.speedMph));rival.position.y+=st.rival.airHeight||0;const slope=groundSlope(course,st.rival.s,st.rival.lateral,st.rival.headingError||0);rival.rotation.x=slope.pitch;rival.rotation.z=slope.roll;updateDriver(rival.userData.driver,Math.max(-1,Math.min(1,(st.rival.pushVelocity||0)*.08)),0,false);for(const lamp of rival.userData.brakeLights||[])lamp.material.emissiveIntensity=st.rival.braking?4:1.4;}
    const palette = [0xd9c99c, 0x2c566a, 0x847458, 0xf0e9dc, 0x5e3d2f];
    while (traffic.length < st.traffic.length) { const car = createVehicle({ color: palette[traffic.length % palette.length] }); scene.add(car); traffic.push(car);sceneRevision++;ambientShading.refresh(); }
    traffic.forEach((car, i) => {
      const d = st.traffic[i]; car.visible = !menu && !!d?.alive && Math.abs(visualGap(d.s)) < 540;
      updateNpcVehicleDamage(car,!menu&&d?.alive?d:null);
      if (car.visible) {const turn=d.dir<0?Math.PI:0;place(car,vehicleGroundPoint(course,d.s,d.lateral),turn,wheelTravel(d.speedMph));const slope=groundSlope(course,d.s,d.lateral,turn);car.rotation.x=slope.pitch;car.rotation.z=slope.roll;}
    });
    const pursuit = st.police.pursuit; police.visible = !menu && !!pursuit?.active && pursuit.distanceU < 250;
    updateNpcVehicleDamage(police,!menu&&pursuit?.active?pursuit:null);
    if (police.visible) {
      place(police, vehicleGroundPoint(course,pursuit.s, pursuit.lateral), pursuit.headingError || 0, wheelTravel(pursuit.speedMph));
      const slope=groundSlope(course,pursuit.s,pursuit.lateral,pursuit.headingError||0);police.rotation.x=slope.pitch;police.rotation.z=slope.roll;
      for(const lamp of police.userData.brakeLights||[])lamp.material.emissiveIntensity=pursuit.braking?4:1.4;
      lamps.children.forEach((lamp, i) => { lamp.visible = Math.floor(now / 130) % 2 === i; });
    }
    effects.update({ p: pp, course, state: menu ? { ...st, speedMph: 0, offRoad: false, roughness: 0, impactTimer: 0 } : st, dt: st.paused ? 0 : dt, now });
    explosion.update(pp,st,st.paused?0:dt);
    if(!st.paused)chickens.update(menu?{status:'menu',s:172,collectedFlocks:[]}:st,menu?now/1000:st.totalTimeSec);
    world.userData.update?.(now/1000);for(const update of world.userData.updates||[])update(now/1000);
    world.userData.updateSimulation?.(menu?{crushedProps:[]}:st,st.paused?0:dt);
    for(const {light,side}of headlights){const heading=player.rotation.y,c=Math.cos(heading),sn=Math.sin(heading);light.intensity=course.tunnelAt(distance)?125:course.def.timeOfDay==='night'||course.themeAt(distance)==='city'?78:0;light.position.set(pp.x+c*side*.65+sn*1.8,pp.y+(tall?2.2:.72),pp.z-sn*side*.65+c*1.8);light.target.position.set(pp.x+sn*40,pp.y-1,pp.z+c*40);light.target.updateMatrixWorld();}
    localLighting.update({course,position:pp,police,now,night:course.def.timeOfDay==='night'||course.themeAt(distance)==='city',high:app.ambientOcclusionEnabled!==false,menu});
    host.dataset.driver=player.userData.driver?'ready':'absent';
    quality.update(app.ambientOcclusionEnabled!==false);host.dataset.ambientShading=String(ambientShading.enabled);
    if(warmup){
      const revision=`${sceneRevision}:${scene.environment?.id??'none'}:${ambientShading.enabled}:${explosion.group.visible}`;
      if(revision!==warmupKey){
        warmupKey=revision;app.holdVisualReadiness?.(readinessOwner);firstWorldFrame=true;
        host.dataset.warmupSubmitMs='0';host.dataset.warmupWaitMs='0';
        warmupTicket=warmup.request(revision,()=>{
          const started=performance.now();let compilation;
          try{compilation=compileWarmupScene(renderer,scene,camera,composer.readBuffer);}
          finally{if(!disposed&&warmupKey===revision)host.dataset.warmupSubmitMs=(performance.now()-started).toFixed(0);}
          const submitted=performance.now();
          return Promise.resolve(compilation).finally(()=>{
            if(!disposed&&warmupKey===revision)host.dataset.warmupWaitMs=(performance.now()-submitted).toFixed(0);
          });
        });
      }
      host.dataset.warmupStatus=warmupTicket.state.status;
      if(!warmup.canDraw(warmupKey))return;
    }
    renderer.info.autoReset=false;renderer.info.reset();
    const firstFrameStart=firstWorldFrame?performance.now():0;composer.render();
    if(firstWorldFrame){host.dataset.firstFrameMs=(performance.now()-firstFrameStart).toFixed(0);firstWorldFrame=false;}
    renderer.domElement.style.visibility='visible';
    if(readinessClaimed&&!app.visualReady)app.presentVisualFrame?.(readinessOwner,st,app.duel.course);
    metricFrames++;
    if (now - metricsTime >= 1000) {
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.fps = String(Math.round(metricFrames * 1000 / (now - metricsTime)));
      host.dataset.geometries = String(renderer.info.memory.geometries);
      host.dataset.textures = String(renderer.info.memory.textures);
      metricsTime = now; metricFrames = 0;
    }
  }
  const tick = t => { if (disposed) return; frame(t); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
  const resize = () => { renderer.setSize(host.clientWidth, host.clientHeight); composer.setSize(host.clientWidth,host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize);
  if(warmupRequested){app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}
  const debugApi=window.__render = { renderer, scene, camera, renderFrame() { frame(); return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; }, sample() {
    frame();if(disposed||warmup&&!warmup.canDraw(warmupKey))return {warming:!disposed,distinctColors:0,drawCalls:0,triangles:0};const rt = new THREE.WebGLRenderTarget(64, 48); renderer.setRenderTarget(rt); renderer.render(scene, camera);
    const data = new Uint8Array(64 * 48 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 64, 48, data); renderer.setRenderTarget(null); rt.dispose();
    const colors = new Set(); for (let i = 0; i < data.length; i += 4) colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
    return { distinctColors: colors.size, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  } };
  return { prepareVehicle, retryVehicle() { return prepareVehicle(host.dataset.vehicleKey,{retry:true}); }, dispose() {
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);
    if(readinessClaimed)app.releaseVisualReadiness?.(readinessOwner);
    if(window.__render===debugApi)delete window.__render;
    if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);
    const release=()=>{effects.dispose();explosion.dispose();atmosphere.dispose();localLighting.dispose();composer.passes.forEach(p=>p.dispose?.());composer.dispose();ghostStyle?.restore();disposeTree(scene);sun.dispose();environment.dispose();naturalEnvironment?.dispose();renderer.dispose();};
    if(warmup)warmup.dispose(release);else release();
  } };
}

function place(car, p, turn = 0, travel = 0) {
  placeGroundedVehicle(car,p,turn,travel);
}

function groundSlope(course,s,lat,angle){
  return vehicleGroundSlope(course,s,lat,angle);
}
