import {isSummitAttack} from './summit-attack.js';
import {createDeepView,deepPresentation} from './deep/deep-ui.js';
import {createUnderwaterScene} from './deep/underwater-scene.js';
import {createWaterline} from './deep/waterline.js';
import {createHeliView} from './heli/heli-scene.js';
import {createBurntLook} from './burnt-look.js';
import {createTrackKits,trackKitsOf} from './track-kits.js';
import {snowmenEnabled,snowmanPlacements} from './snowmen.js';
import {createSnowmenView} from './snowmen-view.js';
import {createSummitAvalancheView,summitAvalancheShake} from './summit-avalanche-view.js';
import {snowWorldEnabled,snowWorldPlacements,SNOW_KIT_IDS,snowWorldOf,winterLightingSettings} from './snow-world.js';
import {createCombatScene} from './combat-scene.js';
import {createCombatEffects} from './combat-effects.js';
import {createFirstPersonGear} from './first-person-gear.js';
import * as THREE from 'three';
import {directionalCameraPose} from './camera-views.js';
import {onFootCameraPose, projectOnFootAim} from './onfoot-camera.js';
import {wastelandRulesActive} from './wasteland-access.js';
import {hiddenRoadPresentation,hiddenRoadDrivingCamera} from './hidden-road-ui.js';
import { CARS, DRIVE } from './config.js';
import { createVehicle, updateVehicleDamage, updateNpcVehicleDamage, combatVehicleWear } from './vehicles.js';
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
import { renderedGroundHeight } from './rendered-ground.js';
import { constrainTunnelCamera, clearCameraSightline, selectCameraAim } from './camera-clearance.js';
import { createVehicleAttachmentRegistry,createRoadRoofOwner } from './vehicle-attachments.js';
import {createYetiAssets,createYetiView} from './yeti-view.js';
import { createRenderQuality } from './render-quality.js';
import { createAdaptiveResolution } from './adaptive-resolution.js';
import { renderMainView } from './scene-presentation.js';
import { createSceneLighting } from './scene-lighting.js';
import { animateScene, syncScene } from './scene-systems.js';
import {setSaltFlatsHeatEnabled} from './arena/venues/salt-flats.js';
import { environmentKey } from './environment-key.js';
import { createRenderWarmup, compileWarmupPipeline, compileWarmupScene, compileWarmupLighting, guardLightingWarmup, isRenderWarmupEnabled, preparationKey } from './render-warmup.js';
import { placeGroundedVehicle, vehicleGroundPoint, vehicleGroundSlope, applyVehicleTerrainPose } from './vehicle-grounding.js';
import { createFrameMetrics } from './frame-metrics.js';
import { createRearView } from './rear-view.js';
import { createRoadsideDebris } from './roadside-debris.js';
import {createFuelRunView} from './arena/modes/fuel-run-view.js';
import {createBountyHuntView} from './arena/modes/bounty-hunt-view.js';
import {createAmbushAlleyView} from './arena/modes/ambush-alley-view.js';
import { updateArenaTells, updateArenaMarkers } from './arena/arena-tell-view.js';
import { ARENA_FEEL } from './arena/arena-brains.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createTankerModel} from './arena/tanker-model.js';
import {trackSnapshotPose, SNAPSHOT_FOV, buildTrackDossier} from './track-analysis.js';
import {referenceLap} from './reference-laps.js';
import {telemetryRoute} from './lap-telemetry.js';
import {coachAllowed,coachRaceContext,buildCoachMarkers} from './coach-markers.js';

const markerWorld = new THREE.Vector3();
const markerView = new THREE.Vector3();
const DUST_STORM_FOG = new THREE.Color(0x8a6a48);

// Read-only projection for HUD markers. The positions come from rendered cars,
// so slides, jumps and camera modes all use the same pose as the main view.
// In a full Grand Prix field, a car far from the camera stops casting a shadow:
// nobody sees it, and eight detailed cars would otherwise double the draw calls.
const FIELD_SHADOW_RANGE=140;
function setCarShadows(mesh,on){
  if(mesh.userData.shadowsOn===on)return;
  mesh.userData.shadowsOn=on;
  mesh.traverse(object=>{if(object.isMesh){object.userData.castsShadow??=object.castShadow;object.castShadow=on&&object.userData.castsShadow;}});
}
export function projectVehicleMarkers(camera, vehicles) {
  camera.updateWorldMatrix(true, false);
  const markers = [];
  for (let index = 0; index < vehicles.length; index++) {
    const vehicle = vehicles[index];
    if (!vehicle?.visible) {
      markers.push({index, x: 0.5, y: 0.5, visible: false});
      continue;
    }
    vehicle.updateWorldMatrix(true, false);
    vehicle.getWorldPosition(markerWorld);
    markerWorld.y += 2;
    markerView.copy(markerWorld).applyMatrix4(camera.matrixWorldInverse);
    markerWorld.project(camera);
    const x = (markerWorld.x + 1) * 0.5;
    const y = (1 - markerWorld.y) * 0.5;
    const visible = markerView.z < 0 && markerWorld.z >= -1 &&
      markerWorld.z <= 1 && x >= 0 && x <= 1 && y >= 0 && y <= 1;
    markers.push({index, x: Number.isFinite(x) ? THREE.MathUtils.clamp(x, 0, 1) : 0.5,
      y: Number.isFinite(y) ? THREE.MathUtils.clamp(y, 0, 1) : 0.5,
      visible});
  }
  return markers;
}

export function detachRetiredVehicleVisuals(object, combatScene, vehicleAttachments) {
  combatScene.detachVehicle(object);
  vehicleAttachments.detachVehicle(object);
}

export function terrainBounceAmplitude(roughness, speedMph) {
  return roughness * Math.min(1, Math.abs(speedMph) / 18);
}

export function crashRollVisual(actor) {
  return Number.isFinite(actor?.wrecked?.roll) ? actor.wrecked.roll : 0;
}

export function installCrashPresentationEvents({duel, enabled, effects,
  getCourse}) {
  if (!enabled) return () => {};
  return duel.onChange((state, event) => {
    const smash = event.vehicleSmash;
    if (!smash) return;
    const actor = smash.actor, course = getCourse();
    const ground = actor && Number.isFinite(actor.s) &&
      Number.isFinite(actor.lateral) && course?.groundAt(actor.s, actor.lateral);
    effects?.recordVehicleSmash(smash,
      {enabled: true, y: (ground?.y || 0) + .8, atTime: state.stageTimeSec});
  });
}

// This layer only reads simulation state. Asset replacement never changes race rules.
export function constrainMountainCamera(course,position,distance){
  if(!course.def.ridgeLandform)return position;
  const near=course.nearest(position.x,position.z,distance);
  const ground=renderedGroundHeight(course,{x:position.x,z:position.z,s:near.s,off:near.lateral},{requireSurface:true});
  if(!Number.isFinite(ground))throw Error('Mountain camera has no rendered terrain.');
  position.y=Math.max(position.y,ground+.7);
  return position;
}

export function attachRenderer(host, app) {
  const rendererAttachedAt=performance.now();let firstPresentation=true;
  let disposed=false,raf,sceneRevision=0,warmupTicket=null,warmupKey=null,readinessClaimed=false;
  const frameMetrics=createFrameMetrics();
  const adaptiveResolution=createAdaptiveResolution();
  let metricRevision=-1,metricEnvironment=null,metricQuality=null,metricRatio=null,metricMenu=null,metricCamera=null,metricFootCamera=null,metricMood=null,metricInspection=null,metricCar=null;
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
  const coachView = new THREE.Group();coachView.name = 'Coach braking and apex guides';
  scene.add(coachView);
  const driveLessonView=new THREE.Group();driveLessonView.name='Driving lesson cones and red board';scene.add(driveLessonView);
  let driveLessonPlan=null;
  function updateDriveLesson(next,state){
    const run=app.duel.drivingLesson;
    const visible=!!next&&!!run&&run.ownerId===app.player?.id&&state.playerId===run.ownerId&&run.state===state&&
      app.drivingLessonsAvailable?.()===true;
    driveLessonView.visible=visible;
    if(!visible){
      if(driveLessonPlan){for(const child of [...driveLessonView.children]){driveLessonView.remove(child);disposeTree(child);}driveLessonPlan=null;sceneRevision++;}
      return;
    }
    if(driveLessonPlan!==run.plan){
      for(const child of [...driveLessonView.children]){driveLessonView.remove(child);disposeTree(child);}
      driveLessonPlan=run.plan;
      const ground=point=>{
        const actual=next.groundAt(point.s,point.lateral);
        return Math.max(actual.y,renderedGroundHeight(next,{x:point.x,z:point.z,s:point.s,off:point.lateral},{requireSurface:true})??actual.y)+.025;
      };
      for(const cone of run.plan.instructor.cones){
        const group=new THREE.Group();group.name='Lesson cone '+cone.id;group.userData.coneId=cone.id;
        const base=new THREE.Mesh(new THREE.BoxGeometry(.8,.08,.8),new THREE.MeshStandardMaterial({color:0x292525,roughness:.9}));base.position.y=.04;
        const body=new THREE.Mesh(new THREE.ConeGeometry(.29,.8,12),new THREE.MeshStandardMaterial({color:0xf68d32,roughness:.8}));body.position.y=.46;
        const stripe=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,.13,12),new THREE.MeshStandardMaterial({color:0xfff0d9,roughness:.8}));stripe.position.y=.48;
        group.add(base,body,stripe);group.position.set(cone.x,ground(cone),cone.z);driveLessonView.add(group);
      }
      const s=run.plan.instructor.redBoardS,dir=run.plan.corner.dir;
      const lateral=-dir*(next.roadHalfWidthAt(s)+1.2),point={...next.groundAt(s,lateral),s,lateral};
      const board=new THREE.Group();board.name='Lesson late-braking red board';board.userData.redBoard=true;
      const post=new THREE.Mesh(new THREE.BoxGeometry(.1,1.8,.1),new THREE.MeshStandardMaterial({color:0xddddcc}));post.position.y=.9;
      const face=new THREE.Mesh(new THREE.BoxGeometry(1.4,.65,.1),new THREE.MeshStandardMaterial({color:0xc42c29,roughness:.7}));face.position.y=1.45;
      board.add(post,face);board.position.set(point.x,ground(point),point.z);board.rotation.y=next.at(s).heading;driveLessonView.add(board);sceneRevision++;
    }
    for(const child of driveLessonView.children){
      if(child.userData.redBoard)child.visible=run.lesson.stage==='late';
      else child.rotation.z=run.lesson.attempt?.tipped.includes(child.userData.coneId)?Math.PI*.5:0;
    }
  }
  let coachCourse = null, coachReference = null;
  function updateCoach(next, state) {
    const context = coachRaceContext(app,next,state);
    coachView.visible = !!next && next.closed !== false && coachAllowed(context);
    if (!coachView.visible) return;
    const route = telemetryRoute(next.def.id, state.seed), reference = referenceLap(next.def.id, route);
    if (coachCourse === next && coachReference === reference) return;
    for (const child of [...coachView.children]) {coachView.remove(child);disposeTree(child);}
    coachCourse = next;coachReference = reference;
    if (!reference) {coachView.visible = false;return;}
    let dossier;
    try {dossier = buildTrackDossier(next, {route,reference});}
    catch {coachView.visible = false;return;} // Never display stale reference geometry.
    for (const marker of buildCoachMarkers(next, dossier, context)) {
      const brake = new THREE.Mesh(new THREE.RingGeometry(.7,1.1,16),
        new THREE.MeshBasicMaterial({color:0xffcc66,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));
      brake.rotation.x = -Math.PI / 2;brake.position.set(marker.brake.x,marker.brake.y,marker.brake.z);
      brake.name = 'Coach brake: ' + marker.id;
      const geometry = new THREE.BufferGeometry().setFromPoints(marker.line.map(point => new THREE.Vector3(point.x,point.y,point.z)));
      const apex = new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x99d6dc,transparent:true,opacity:.28,depthWrite:false}));
      apex.name = 'Coach apex: ' + marker.id;coachView.add(brake,apex);
    }
    sceneRevision++;
  }

  const arenaMarkers = new THREE.Group();
  arenaMarkers.name = 'Arena floor markers';
  scene.add(arenaMarkers);
  const camera = new THREE.PerspectiveCamera(54, host.clientWidth / host.clientHeight, .15, 2400);
  const composer=new EffectComposer(renderer);
  composer.addPass(Object.assign(new RenderPass(scene,camera),{name:'Scene and shadows'}));
  const ambientShading=createAmbientShading(scene,camera);ambientShading.name='Contact shading';composer.addPass(ambientShading);
  const bloom=new UnrealBloomPass(new THREE.Vector2(host.clientWidth,host.clientHeight),.20,.55,1.9);
  bloom.name='Bloom';composer.addPass(bloom);composer.addPass(Object.assign(new OutputPass(),{name:'Tone and colour'}));
  const lighting=createSceneLighting({scene,renderer,bloom,host});
  const deepView=createDeepView({renderer,createUnderwaterScene,createWaterline,createAmbientShading,
    createPipeline(privateScene,privateCamera,ambient,high){
      const privateComposer=new EffectComposer(renderer);
      privateComposer.addPass(new RenderPass(privateScene,privateCamera));
      privateComposer.addPass(ambient);
      if(high)privateComposer.addPass(new UnrealBloomPass(new THREE.Vector2(host.clientWidth,host.clientHeight),.20,.55,1.9));
      privateComposer.addPass(new OutputPass());
      return {setSize:(width,height)=>{privateComposer.setPixelRatio(renderer.getPixelRatio());privateComposer.setSize(width,height);},
        render:()=>renderMainView(renderer,privateComposer,high),
        dispose(){privateComposer.passes.forEach(pass=>{if(pass!==ambient)pass.dispose?.();});privateComposer.dispose();}};
    }});
  const stopDeepEvents=app.duel.onChange((_state,event)=>{if(event.menu||event.stageLoaded!=null||event.arenaLoaded!=null||event.deepExited)deepView.reset();if(event.deepRaised)deepView.raised(event.deepRaised.find);});
  let deepRevision=deepView.revision;

  // The helicopter's group joins the scene before the lighting roots are
  // taken, so a world rebuild never removes it.
  const heliView=createHeliView({THREE,scene});
  // H2 Fire: a burnt course's look (docs/HELI_FIRE.md 8.4), drawing only.
  const burntLook=createBurntLook({THREE,scene});
  const lightingRoots = new Set(scene.children.filter(object => object !== arenaMarkers));
  const quality=createRenderQuality({renderer,composer,ambientShading,sun:lighting.sun,host});
  const rearView=createRearView({renderer,scene,host});
  let course, world, loadedCar, loadedRivalCar, loadedRivalPaint, player, rival, chickens, ghost, ghostStyle, worldKey;
  const extraOpponents = [];
  let worldBuildCount=0,firstWorldFrame=false,worldReadyStarted=0;
  let preparedTrackKits = null, preparedTrackKitKey = null, snowmenView=null, avalancheView=null;
  const hasSnowmen=next=>snowmenEnabled(next,app._switches?.()??app.duel.featureFlags);
  const hasAvalanche=next=>(next.def.id==='summit-run'||isSummitAttack(next.def)) && (app._switches?.()??app.duel.featureFlags).enabled('summit-run');
  const kitWorldKey=next=>environmentKey(next)+(hasSnowmen(next)?':snowmen':'')+(hasAvalanche(next)?':avalanche':'');
  const winterEnabled=next=>snowWorldEnabled(next,app._switches?.()??app.duel.featureFlags);
  function prepareKitWorld(next, {retry=false}={}) {
    if (!next.def.kitPlacements?.length && !winterEnabled(next) && !hasSnowmen(next)) {
      preparedTrackKits?.dispose();preparedTrackKits=null;preparedTrackKitKey=null;
      host.dataset.trackKitAsset = 'off';host.dataset.trackKitError = '';return true;
    }
    if (world && next === course && worldKey===kitWorldKey(next)) {
      host.dataset.trackKitAsset = trackKitsOf(world)?.status ?? 'off';return true;
    }
    const key = kitWorldKey(next);
    if (world && worldKey === key && !winterEnabled(next) && !hasSnowmen(next)) {
      host.dataset.trackKitAsset = trackKitsOf(world)?.status ?? 'off';
      host.dataset.trackKitError = '';
      return true;
    }
    if (preparedTrackKits && (preparedTrackKitKey !== key || retry)) {
      preparedTrackKits.dispose(); preparedTrackKits = null; preparedTrackKitKey = null;
    }
    if (!preparedTrackKits) {
      preparedTrackKits = createTrackKits(next,{validateClearance:false,
        extraPlacements:[...(winterEnabled(next)?snowWorldPlacements(next):[]),...(hasSnowmen(next)?snowmanPlacements(next):[])],
        requiredIds:[...(winterEnabled(next)?SNOW_KIT_IDS:[]),...(hasSnowmen(next)?['snowman']:[])]}); preparedTrackKitKey = key;
    }
    host.dataset.trackKitAsset = preparedTrackKits.status;
    host.dataset.trackKitError = preparedTrackKits.error?.message ?? '';
    if (preparedTrackKits.status === 'ready') return true;
    renderer.domElement.style.visibility = 'hidden'; rearView.hide();
    if (!readinessClaimed) {app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}
    app.holdVisualReadiness?.(readinessOwner);return false;
  }
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
  let combatPlayerExplosion = null, opponentExplosions = null;
  let combatEffectsWarmupMeasured = false;
  let combatEffectsPrepared = false;
  host.dataset.opponentExplosionBuildMs='0';
  host.dataset.opponentExplosionWarmupMs='0';
  const vehicleAttachments=createVehicleAttachmentRegistry();
  // A neutral multiplier on the fur alone (the accepted white factor would darken below 1): at night the yeti reads dark
  // grey-green against the snow, and 2.6 lifts it to a pale grey-white while the texture and vertex-colour detail stay.
  const yetiAssets=createYetiAssets(),yetiView=createYetiView(yetiAssets,{furTint:new THREE.Color(2.6,2.6,2.6)});scene.add(yetiView.group);
  const roadRoof=createRoadRoofOwner(vehicleAttachments,{yetiAssets});
  const combatScene=createCombatScene(vehicleAttachments, {
    loadFlameTexture: path => new THREE.TextureLoader().load(path),
  });scene.add(combatScene.group);
  // Scene preparation precedes instanced-buffer uploads for main and rear views.
  scene.onBeforeRender = (_renderer, _scene, viewCamera) => combatScene.prepareSmokeCamera(viewCamera);
  const fuelView=createFuelRunView(app.duel);scene.add(fuelView.group);
  let tanker=null,tankerReady=false,tankerFailed=false;
  function prepareTanker(){
    if(!tanker){
      tanker=createTankerModel({loadAsset:()=>new GLTFLoader().loadAsync('/assets/models/wasteland/convoy-tanker.glb')});
      tanker.ready.then(loaded=>{
        tankerReady=loaded;sceneRevision++;ambientShading.refresh();
      }).catch(()=>{tankerFailed=true;});
    }
    host.dataset.convoyAsset=tankerReady?'ready':tankerFailed?'error':'loading';
    if(tankerReady)return true;
    renderer.domElement.style.visibility='hidden';rearView.hide();
    if(!readinessClaimed){app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}
    app.holdVisualReadiness?.(readinessOwner);return false;
  }
  const fuelEntries=Array.from({length:4},()=>({id:null,mesh:null,actor:null}));
  const bountyView=createBountyHuntView();scene.add(bountyView.group);
  const ambushView=createAmbushAlleyView(disposeTree);scene.add(ambushView.group);
  const bountyEntries=Array.from({length:4},()=>({id:null,mesh:null,actor:null}));
  const firstPersonGear=createFirstPersonGear();scene.add(firstPersonGear.group);
  const firstPersonEntry={fighter:null,input:null,weapons:null};
  const firstPersonOptions={enabled:false,active:false,firstPerson:false,camera,time:0};
  const roadsideDebris=createRoadsideDebris();scene.add(roadsideDebris.group);
  const combatEffects=createCombatEffects({crashPresentation:true});
  scene.add(combatEffects.group);sceneRevision++;
  const stopCrashEvents=installCrashPresentationEvents({duel:app.duel,
    enabled:true,effects:combatEffects,getCourse:()=>course});
  let crashPoseState=null;
  function resolveCrashTyres(actor,left,right){
    const state=crashPoseState;
    let mesh=null;
    if(actor===state)mesh=player;
    else if(actor===state?.rival)mesh=rival;
    else{
      for(let index=1;index<(state?.opponents?.length||0);index++)
        if(actor===state.opponents[index]){mesh=extraOpponents[index-1]?.mesh;break;}
      if(!mesh)for(let index=0;index<(state?.traffic?.length||0);index++)
        if(actor===state.traffic[index]){mesh=traffic[index];break;}
      if(!mesh&&actor===state?.police?.pursuit)mesh=police;
    }
    if(!mesh?.visible)return false;
    let found=0;
    for(const wheel of mesh.userData.wheelPivots||[]){
      if(wheel.userData.front)continue;
      const site=found===0?left:right;
      wheel.getWorldPosition(site);
      site.y-=wheel.userData.radius||.36;
      if(++found===2)return true;
    }
    return false;
  }
  let rustwallPresentation=null;
  let yardPresentation=null;
  function retireObject(object,beforeDispose){
    detachRetiredVehicleVisuals(object,combatScene,vehicleAttachments);
    scene.remove(object);
    if(object===tanker?.group)return;
    const retiredWorld = object === world;
    const release = () => {
      beforeDispose?.();
      if (retiredWorld) lighting.detachWorld(object);
      else lighting.detachVehicle(object);
      disposeTree(object);
    };
    if(warmup)warmup.releaseWhenIdle(release);else release();
  }
  function build(next) {
    const buildStart=performance.now();
    worldReadyStarted=buildStart;host.dataset.worldReadyMs='0';
    snowmenView?.dispose();snowmenView=null;avalancheView?.dispose();avalancheView=null;
    if (world) retireObject(world);
    course = next;
    worldKey=kitWorldKey(next);
    host.dataset.worldBuilds=String(++worldBuildCount);
    sceneRevision++;
    lighting.apply({course,mood:app.lightingMood,winter:winterEnabled(course)?winterLightingSettings:undefined});
    world = buildEnvironment(course,{trackKits:preparedTrackKits,snow:winterEnabled(course)});
    preparedTrackKits = null; preparedTrackKitKey = null; scene.add(world);
    if(hasSnowmen(course)){snowmenView=createSnowmenView(trackKitsOf(world));world.add(snowmenView.group);}
    if(hasAvalanche(course)){avalancheView=createSummitAvalancheView(course);world.add(avalancheView.group);}
    lighting.setWorld(world);
    rustwallPresentation=world.getObjectByName('Rustwall')?.userData;
    yardPresentation=world.getObjectByName('Scrapdome yard')?.userData;
    chickens=createChickens(course);world.add(chickens.group);
    ambientShading.refresh();
    host.dataset.worldBuildMs=(performance.now()-buildStart).toFixed(0);firstWorldFrame=true;
  }
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  const cameraBodyTarget = new THREE.Vector3(), cameraBodyProjection = new THREE.Vector3();
  const rearKitForward = new THREE.Vector3();
  const nightWorldInput = {};
  const snowVehicles=Array.from({length:8},()=>({state:null,mesh:null}));
  let trackSnapshot = null;
  const snapshotLightPose = {rotation: {y: 0}};
  function clearTrackSnapshot() {
    const previous = trackSnapshot;trackSnapshot = null;ready = false;
    if (previous && !previous.settled) {previous.settled = true;previous.reject(Error('Track view changed.'));}
    delete host.dataset.trackSnapshot;
  }
  function captureTrackSnapshot({course: inspectedCourse, flag}) {
    if (disposed || !['menu', 'stage_result', 'complete'].includes(app.duel.state.status))
      return Promise.reject(Error('Return to the menu or results before studying the track.'));
    const pose = trackSnapshotPose(inspectedCourse, flag);
    clearTrackSnapshot();
    return new Promise((resolve, reject) => {
      trackSnapshot = {course: inspectedCourse, flag, pose, resolve, reject,
        settled: false, deadline: performance.now() + 15000};
    });
  }
  function drawTrackSnapshot(now) {
    const view = trackSnapshot;
    frameMetrics.suspend();adaptiveResolution.reset();rearView.hide();
    const visibility = [];
    try {
      if (!view.settled && now > view.deadline) throw Error('Track view took too long to prepare. Select the flag again.');
      if (!prepareKitWorld(view.course)) return;
      if (course !== view.course || worldKey!==kitWorldKey(view.course)) {
        if (world && worldKey === kitWorldKey(view.course) && !winterEnabled(view.course)) course = view.course;
        else build(view.course);
      }
      const {pose} = view, distance = pose.s, high = app.ambientOcclusionEnabled !== false;
      const ground = course.groundAt(distance, 0);
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      constrainMountainCamera(course,camera.position,distance);
      camera.up.set(0, 1, 0);camera.fov = SNAPSHOT_FOV;
      camera.lookAt(pose.target.x, pose.target.y, pose.target.z);camera.updateProjectionMatrix();
      lighting.apply({course, theme: course.themeAt(distance), mood: app.lightingMood,
        winter:winterEnabled(course)?winterLightingSettings:undefined,
        tunnel: !!course.tunnelAt(distance,course.def.galleries?course.nearest(pose.position.x,pose.position.z,distance).lateral:0), distance, raceLength: course.raceLength, menu: false});
      lighting.followCamera(camera, ground, now / 1000);
      snapshotLightPose.rotation.y = pose.heading;
      // Keep chase/police lights in menu mode; only the authored road-light
      // sample above uses the selected approach rather than the menu's start.
      lighting.updateVehicles({course, position: ground, player: snapshotLightPose, police,
        distance, tall: false, now, high, menu: true});
      lighting.updateWorld({position: ground, heading: pose.heading, distance, high});
      animateScene(world, now / 1000);
      syncScene(world, {crushedProps: []}, 0);
      trackKitsOf(world)?.update({high,position:camera.position,camera,state:{status:'menu'}});
      for (const object of scene.children) {
        if (object === world || lightingRoots.has(object) || object.isLight) continue;
        visibility.push([object, object.visible]);object.visible = false;
      }
      quality.update(high, 1);
      if (warmup) {
        const revision = preparationKey({worldBuildCount, car: 'team-room', high});
        if (revision !== warmupKey) {
          warmupKey = revision;
          warmupTicket = warmup.request(revision, () => high
            ? compileWarmupPipeline(renderer, scene, camera, composer)
            : compileWarmupScene(renderer, scene, camera, null));
        }
        if (!warmup.canDraw(warmupKey)) return;
      }
      renderer.info.autoReset = false;renderer.info.reset();
      renderMainView(renderer, composer, high);
      renderer.domElement.style.visibility = 'visible';
      host.dataset.trackSnapshot = view.flag.id;
      if (!view.settled) {
        const canvas = document.createElement('canvas');canvas.width = 960;canvas.height = 540;
        const source = renderer.domElement, ratio = canvas.width / canvas.height;
        const width = Math.min(source.width, source.height * ratio), height = width / ratio;
        const context = canvas.getContext('2d');
        if (!context) throw Error('The browser could not copy the track view.');
        context.drawImage(source, (source.width - width) / 2, (source.height - height) / 2,
          width, height, 0, 0, canvas.width, canvas.height);
        view.settled = true;view.resolve(canvas);
      }
    } catch (error) {
      if (!view.settled) {view.settled = true;view.reject(error);}
      if (trackSnapshot === view) trackSnapshot = null;
    } finally {
      for (const [object, visible] of visibility) object.visible = visible;
    }
  }
  let ready = false, lastMenu = null, previousT = performance.now();
  let lastPresentationSeconds = 0, lastSaltHeatEnabled = false;
  function frame(now = performance.now(),measure=false,presentation={}) {
    if(disposed)return;
    if (trackSnapshot) {
      if (['menu', 'stage_result', 'complete'].includes(app.duel.state.status)) {drawTrackSnapshot(now);return;}
      clearTrackSnapshot();
    }
    const diagnosticTime = Number.isFinite(presentation.presentationSeconds);
    const presentationSeconds = diagnosticTime ? presentation.presentationSeconds : now/1000;
    const ambientNow = diagnosticTime ? presentationSeconds*1000 : now;
    lastPresentationSeconds = presentationSeconds; lastSaltHeatEnabled = false;
    const phaseProbe=measure&&app.frameDiagnostics?.active?app.frameDiagnostics:null;
    const updateStarted=phaseProbe?phaseProbe.now():0;
    const capture=measure&&!document.hidden;
    if(!capture)frameMetrics.suspend();
    const dt = Math.min(.05, Math.max(.001, (now - previousT) / 1000)); previousT = now;
    const st = app.duel.state, menu = st.status === 'menu', next = menu ? app.getMenuCourse(app.menuStage||0) : app.duel.deepRuntime?.raceCourse??app.duel.course;
    const moving = (st.status === 'racing'||st.status==='exploring') && !st.paused&&!st.deepJourney?.controlsLocked;
    updateCoach(next,st);updateDriveLesson(next,st);
    if (!next) {rearView.hide();frameMetrics.suspend();adaptiveResolution.reset();return;}
    const selectedCar=(menu&&app.menuCar)||st.car,carKey=Object.hasOwn(CARS,selectedCar)?selectedCar:'falcone_f42';
    if(!prepareVehicle(carKey)){frameMetrics.suspend();adaptiveResolution.reset();return;}
    if(!prepareKitWorld(next)){frameMetrics.suspend();adaptiveResolution.reset();return;}
    const selectedRoof=app.getRoofLook?.(carKey,{menu})??null;
    const needsYeti=((next.def.id==='summit-run'||isSummitAttack(next.def))&&(app._switches?.()??app.duel.featureFlags).enabled('yeti')&&
      (app._switches?.()??app.duel.featureFlags).enabled('summit-run')) || selectedRoof==='yeti';
    if(needsYeti&&yetiAssets.status!=='ready'){
      if(yetiAssets.status==='idle')yetiAssets.load();host.dataset.yetiAsset=yetiAssets.status;host.dataset.yetiError=yetiAssets.error;
      if(!readinessClaimed){app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}app.holdVisualReadiness?.(readinessOwner);
      frameMetrics.suspend();adaptiveResolution.reset();return;
    }
    const opponents = st.opponents || (st.rival ? [st.rival] : []);
    const convoy=!menu&&(st.arena?.mode==='convoy-raid'||st.arena?.format==='convoy-raid');
    const rivalCarKey=convoy?'convoy-tanker':!menu&&st.rival?.car||carKey;
    if(convoy&&!prepareTanker()){frameMetrics.suspend();adaptiveResolution.reset();return;}
    if(!convoy&&rivalCarKey!==carKey&&!prepareVehicle(rivalCarKey)){frameMetrics.suspend();adaptiveResolution.reset();return;}
    if(!menu)for(const opponent of opponents.slice(1))if(opponent.car!==carKey&&!prepareVehicle(opponent.car)){frameMetrics.suspend();adaptiveResolution.reset();return;}
    if (course !== next || worldKey!==kitWorldKey(next)) {
      if(world&&worldKey===kitWorldKey(next)&&!winterEnabled(next)){course=next;lighting.apply({course,mood:app.lightingMood,winter:winterEnabled(course)?winterLightingSettings:undefined});}
      else build(next);
      syncScene(world,menu?{crushedProps:[]}:st,0);
      ready = false;
    }
    if (menu !== lastMenu) { ready = false; lastMenu = menu; }
    if (carKey !== loadedCar) {
      if(ghost){const style=ghostStyle;retireObject(ghost,()=>style.restore());ghost=null;ghostStyle=null;}
      if (player) {roadRoof.detachVehicle(player);retireObject(player);}
      if(rival){retireObject(rival);rival=null;}
      for(const entry of extraOpponents)retireObject(entry.mesh, () => entry.droneStyle?.restore());
      extraOpponents.length=0;
      player = vehicleAssets.create(carKey);
      scene.add(player); loadedCar = carKey;sceneRevision++;
      ambientShading.refresh();
    }
    // A Grand Prix racer wears its own paint; every other rival keeps the usual grey.
    const rivalPaint=!menu&&st.rival?.paint?st.rival.paint:null,rivalPaintKey=rivalPaint?rivalPaint.color:0;
    if(rival&&(loadedRivalCar!==rivalCarKey||loadedRivalPaint!==rivalPaintKey)){retireObject(rival);rival=null;}
    if (!rival) { rival = convoy?tanker.group:vehicleAssets.create(rivalCarKey,{color:rivalPaint?.color??0xbfcace,accent:rivalPaint?.accent??0x142a36}); loadedRivalCar=rivalCarKey;loadedRivalPaint=rivalPaintKey;scene.add(rival);sceneRevision++;ambientShading.refresh(); }
    if(convoy){
      tanker.setValveHealth(st.arena.convoy.valves);
      tanker.setLampSignal(st.rival?.convoyLampSignal,st.stageTimeSec);
    }
    while(extraOpponents.length>(menu?0:Math.max(0,opponents.length-1))){
      const entry=extraOpponents.pop();
      retireObject(entry.mesh, () => entry.droneStyle?.restore());
    }
    for(let index=1;!menu&&index<opponents.length;index++){
      const carKey=opponents[index].car||st.car,entry=extraOpponents[index-1];
      const drone=opponents[index].drone===true,paint=opponents[index].paint;
      if(entry?.carKey===carKey&&entry.drone===drone&&entry.paintKey===(paint?.color??0))continue;
      if(entry)retireObject(entry.mesh, () => entry.droneStyle?.restore());
      // A copy wears its original's colours so the three cars match.
      const mesh=vehicleAssets.create(carKey,{color:paint?.color??(opponents[index].decoy?0xbfcace:index%2?0xb7a479:0x9bb9ba),accent:paint?.accent??0x142a36});
      const droneStyle=drone?styleGhostVehicle(mesh):null;
      droneStyle?.opacity(.3);
      if(drone)mesh.name='Arsenal Decoy Drone';
      scene.add(mesh);extraOpponents[index-1]={mesh,carKey,drone,droneStyle,paintKey:paint?.color??0};sceneRevision++;ambientShading.refresh();
    }
    // Decoy cars (a warlord's copies) come and go mid-fight and never wreck, so
    // the wreck-effect pool counts real cars only and is not rebuilt for them.
    const wreckCars=opponents.filter(actor=>!actor.decoy).length;
    const armoredField=!menu && st.mode==='wasteland' && Number.isFinite(st.maxArmor);
    const crashEffectsEnabled=!menu;
    const effectsField=armoredField||crashEffectsEnabled;
    if(combatPlayerExplosion && (!armoredField || opponentExplosions.length!==wreckCars)){
      combatPlayerExplosion.dispose();combatPlayerExplosion=null;
      opponentExplosions.forEach(effect=>effect.dispose());
      opponentExplosions=null;sceneRevision++;
    }
    if(effectsField&&!combatEffectsPrepared){
      if(!readinessClaimed){app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}
      app.holdVisualReadiness?.(readinessOwner);
    }
    if(armoredField && !combatPlayerExplosion){
      // Build and compile flagged combat effects during race setup, before
      // the first player or CPU wreck can interrupt a driving frame.
      const buildStart=performance.now();
      combatPlayerExplosion=createExplosion({combat:true});scene.add(combatPlayerExplosion.group);
      opponentExplosions=Array.from({length:wreckCars},()=>createExplosion({combat:true}));
      for(const effect of opponentExplosions)scene.add(effect.group);
      sceneRevision++;
      host.dataset.opponentExplosionBuildMs=(performance.now()-buildStart).toFixed(2);
      const warmupStart=performance.now();
      // Fracture lines stay hidden on intact cars, so the regular scene
      // preparation cannot compile their first-visible wreck programs.
      const fractures=[player,rival,...extraOpponents.map(entry=>entry.mesh)]
        .flatMap(car=>car?.userData.fractures||[]);
      const visibility=fractures.map(({mesh})=>mesh.visible);
      try {
        fractures.forEach(({mesh})=>{mesh.visible=true;});
        combatEffects.withWarmupVisibility(()=>renderer.compile(scene,camera));
      } finally {
        fractures.forEach(({mesh},index)=>{mesh.visible=visibility[index];});
      }
      host.dataset.opponentExplosionWarmupMs=(performance.now()-warmupStart).toFixed(2);
    }
    const distance = menu ? 172 : st.s, lateral = menu ? -2.8 : st.lateral;
    const deepPose=!menu?deepPresentation(app.duel):null;
    const heliPose=st.status==='heli'&&app.heliSession?heliView.update(app.heliView(),{cameraIndex:app.heliCamera,dt}):(heliView.hide(),null);
    burntLook.apply({course,look:app.fireLookFor?.(course.def.id)??null});burntLook.update(dt);heliView.fire.setQuality(app.ambientOcclusionEnabled!==false?'high':'performance');host.dataset.burntLook=burntLook.statusFor(course.def.id);
    const physicalCourse=deepPose?app.duel.course:course;
    const pp = vehicleGroundPoint(physicalCourse,distance,lateral);
    const journeyView=hiddenRoadPresentation(st,course);
    const spurCamera=!menu&&(!journeyView.camera||journeyView.camera.blend<1)?
      hiddenRoadDrivingCamera(st,course,app.cameraMode||'chase'):null;
    rustwallPresentation?.updateJourney?.(journeyView);
    yardPresentation?.setHomeVisible?.(app.isYardHomeActive?.() === true);
    lighting.apply({course, theme: course.themeAt(distance), mood: app.lightingMood,
        winter:winterEnabled(course)?winterLightingSettings:undefined,
      blend: 1 - Math.exp(-dt * 1.1), tunnel: !!course.tunnelAt(distance,lateral), distance,
      raceLength: menu ? course.length * Math.max(1, course.def.laps || 1) : app.duel.raceLength,
      menu});
    // Arena event weather only closes the fog in.
    if(st.arena?.weather==='dust-storm'&&scene.fog){scene.fog.near=Math.min(scene.fog.near,40);
      scene.fog.far=Math.min(scene.fog.far,220);scene.fog.color.lerp(DUST_STORM_FOG,1-Math.exp(-dt*1.5));}
    const tall=carKey==='titan_monster';
    const speed=Math.abs(st.speedMph);
    // Keep travel signed for both the live car and recorded reverse ghost poses.
    const wheelTravel = mph => moving ? mph * (DRIVE.mphToWorld || .44704) * dt : 0;
    place(player, pp, 0, wheelTravel(st.speedMph));
    vehicleAttachments.applyPaint(player,app.getPaintPreset?.(carKey,{menu})??null);
    host.dataset.paint=player.userData.paintAppearance?.id||'factory';
    const wreckAge=st.catastrophic ? Math.max(0,(st.impactDuration||0)-(st.impactTimer||0)) : 0;
    const combatWearEnabled=!menu&&st.mode==='wasteland'&&!!st.combat&&
      wastelandRulesActive(st);
    updateVehicleDamage(player,menu?0:st.majorCrashes, !menu&&st.catastrophic, wreckAge,
      menu?null:st.damageZones,menu?0:st.crushDamage,combatVehicleWear(st,combatWearEnabled));
    const roofStatus=roadRoof.select(player,selectedRoof==='chrome-crown'&&combatWearEnabled?null:selectedRoof);
    host.dataset.roofAsset=roofStatus;host.dataset.roofError=roadRoof.error;
    if(selectedRoof && !(selectedRoof==='chrome-crown'&&combatWearEnabled) && roofStatus!=='ready'){
      if(!readinessClaimed){app.claimVisualReadiness?.(readinessOwner);readinessClaimed=true;}app.holdVisualReadiness?.(readinessOwner);
      frameMetrics.suspend();adaptiveResolution.reset();return;
    }
    const steering = menu ? 0 : st.steerVisual || 0;
    updateDriver(player.userData.driver,steering,menu?0:st.slipAngle,!menu&&st.catastrophic);
    if(player.userData.steeringPivot)player.userData.steeringPivot.rotation.z=steering*.7;
    const impact = menu ? 0 : Math.min(1, (st.impactTimer || 0) / (st.impactDuration || 1.8));
    const rough = menu ? 0 : terrainBounceAmplitude(st.roughness || 0, speed);
    const motionTime = st.stageTimeSec;
    player.rotation.y += menu ? 0 : (st.headingError || 0) + (st.slipAngle || 0) + (st.crashSpin || 0);
    player.rotation.z = steering * Math.min(speed / 160, 1) * .045;
    const slope=groundSlope(physicalCourse,distance,lateral,player.rotation.y-pp.heading);
    player.rotation.x=slope.pitch;player.rotation.z+=slope.roll;
    if (!menu) {
      applyVehicleTerrainPose(player,physicalCourse,st);
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
    for (const flame of player.userData.boostFlames || []) { flame.visible = !!st.boosting && !menu; flame.scale.z = .7 + Math.sin(ambientNow * .052) * .3; }
    for (const pivot of player.userData.wheelPivots || []) if (pivot.userData.front) pivot.rotation.y = -steering * .22;
    player.visible = menu || st.onFoot || app.cameraMode !== 'hood' || st.catastrophic;
    if(heliPose){
      // The player's car hangs on the cable, waits beside the pad or sits
      // where it was set down; any other load is drawn by the helicopter.
      const load=heliPose.load;
      player.visible=!!load&&load.id===st.car;
      if(player.visible){player.position.set(load.x,load.y-.7,load.z);player.rotation.set(0,load.heading,0);}
    }
    let firstPersonView=false;
    if (menu) {
      const cp = worldAtExtended(course, distance + 6.4, lateral + 7.7 + Math.sin(ambientNow * .00009) * .6);
      camTarget.set(cp.x, cp.y + (tall?4.35:2.85), cp.z);
      const composition = Math.min(1, camera.aspect / 1.7);
      const aim = worldAtExtended(course, distance + 2.6 * composition, lateral - 2.8 * composition);
      const compact=host.clientHeight<850;
      lookTarget.set(aim.x, pp.y + (tall ? (compact ? .95 : 1.8) : compact ? -1.1 : .95), aim.z); camera.fov = 48;
    } else if(st.onFoot && st.fighter){
      const footMode=wastelandRulesActive(st)?app.footCameraMode:'first-person';
      firstPersonView=footMode!=='overhead';
      const pose=onFootCameraPose(course,st.fighter,footMode);
      camTarget.set(pose.position.x,pose.position.y,pose.position.z);
      lookTarget.set(pose.target.x,pose.target.y,pose.target.z);
      camera.fov=pose.fov;
    } else if(spurCamera){
      camTarget.set(spurCamera.position.x,spurCamera.position.y,spurCamera.position.z);
      lookTarget.set(spurCamera.target.x,spurCamera.target.y,spurCamera.target.z);
      camera.fov=THREE.MathUtils.damp(camera.fov,55+Math.min(speed/200,1)*10+(st.boosting?7:0)+impact*7,4,dt);
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
        const near=course.nearest(camTarget.x,camTarget.z,distance),tunnel=course.tunnelAt(near.s,near.lateral);
        if(tunnel){const limit=tunnel.width-.65,p=course.worldAt(near.s,Math.max(-limit,Math.min(limit,near.lateral)));camTarget.x=p.x;camTarget.z=p.z;}
        camTarget.y=Math.max(camTarget.y,course.groundAt(near.s,near.lateral).y+.65);
      }
      camera.fov = THREE.MathUtils.damp(camera.fov, 55 + Math.min(speed / 200, 1) * 10 + (st.boosting ? 7 : 0) + impact * 7, 4, dt);
      const shake = impact * (st.impactStrength || 0) * .34 + rough * Math.min(speed / 100, 1) * .10 + (avalancheView?summitAvalancheShake(st):0);
      camTarget.x += Math.sin(motionTime * 81) * shake;
      camTarget.y += Math.cos(motionTime * 93) * shake * .62;
      if(st.catastrophic){
        const angle=pp.heading-.48-Math.min(wreckAge,2.6)*.17,reach=10.5+Math.min(wreckAge,2)*2;
        camTarget.set(pp.x-Math.sin(angle)*reach,pp.y+4.5,pp.z-Math.cos(angle)*reach);
        lookTarget.set(pp.x,pp.y+1.3,pp.z);camera.fov=58;
      }
      constrainTunnelCamera(course,camTarget,distance+back);
    }
    if(journeyView.camera){
      const pose=journeyView.camera,blend=pose.blend;
      camTarget.lerp(new THREE.Vector3(pose.position.x,pose.position.y,pose.position.z),blend);
      lookTarget.lerp(new THREE.Vector3(pose.target.x,pose.target.y,pose.target.z),blend);
      camera.fov=THREE.MathUtils.lerp(camera.fov,pose.fov,blend);
      if(blend>.15)player.visible=true;
      firstPersonView=false;
    }
    if(deepPose){camTarget.set(deepPose.camera.position.x,deepPose.camera.position.y,deepPose.camera.position.z);lookTarget.set(deepPose.camera.target.x,deepPose.camera.target.y,deepPose.camera.target.z);player.visible=true;firstPersonView=false;}
    if(heliPose?.camera){camTarget.set(heliPose.camera.position.x,heliPose.camera.position.y,heliPose.camera.position.z);lookTarget.set(heliPose.camera.target.x,heliPose.camera.target.y,heliPose.camera.target.z);camera.fov=heliPose.camera.fov;firstPersonView=false;}
    const yardHomePose=yardPresentation?.homeCamera?.();
    if(yardHomePose){
      camTarget.set(yardHomePose.position.x,yardHomePose.position.y,yardHomePose.position.z);
      lookTarget.set(yardHomePose.target.x,yardHomePose.target.y,yardHomePose.target.z);
      camera.fov=yardHomePose.fov;
      player.visible=true;
      firstPersonView=false;
    }
    if(!menu&&app.inspectionCamera){firstPersonView=false;camTarget.fromArray(app.inspectionCamera.position);lookTarget.fromArray(app.inspectionCamera.target);camera.fov=48;}
    if (!ready || menu || st.onFoot || journeyView.camera || spurCamera || yardHomePose || deepPose || heliPose) camera.position.copy(camTarget);
    else {
      camera.position.lerp(camTarget, 1 - Math.exp(-14 * dt));
      // Follow longitudinal motion immediately: world-space damping otherwise
      // adds a speed-dependent camera gap and makes the car shrink at speed.
      camera.position.x = camTarget.x; camera.position.z = camTarget.z;
    }
    if(!menu&&!deepPose&&!heliPose&&!journeyView.camera&&!spurCamera&&!yardHomePose&&!(st.onFoot&&app.footCameraMode==='overhead'))constrainTunnelCamera(course,camera.position,
      st.onFoot&&st.fighter?st.fighter.s:distance);
    if(!menu&&!deepPose&&!heliPose)constrainMountainCamera(course,camera.position,distance);
    if(!menu&&!st.onFoot&&app.cameraMode!=='hood'&&!deepPose&&!heliPose&&!journeyView.camera&&!spurCamera&&!yardHomePose&&!app.inspectionCamera)
      camera.position.copy(clearCameraSightline(course,camera.position,
        {x:player.position.x,y:player.position.y+(tall?1.65:1.05),z:player.position.z},distance));
    ready = true; camera.lookAt(lookTarget); camera.updateProjectionMatrix();
    if(!menu&&!st.onFoot&&!st.catastrophic&&!deepPose&&!heliPose&&!journeyView.camera&&!spurCamera&&
        !yardHomePose&&!app.inspectionCamera&&['chase','wide'].includes(app.cameraMode||'chase')){
      camera.updateMatrixWorld();
      cameraBodyTarget.copy(player.position);cameraBodyTarget.y+=tall?1.65:1.05;
      cameraBodyProjection.copy(cameraBodyTarget).project(camera);
      const aim=selectCameraAim(cameraBodyProjection,lookTarget,cameraBodyTarget);
      if(aim!==lookTarget){
        lookTarget.copy(aim);camera.lookAt(lookTarget);camera.updateMatrixWorld();
      }
    }
    lighting.followCamera(camera,st.onFoot&&st.fighter?st.fighter:pp,presentationSeconds);
    const visualGap=s=>app.duel.relativeS?app.duel.relativeS(s,st.s)-st.s:s-st.s;
    const lessonGhost=app.getDriveLessonGhost?.();
    const ghostPose=!menu?(lessonGhost??(app.ghostPose?.car===carKey?app.ghostPose:null)):null;
    if(!ghostPose&&ghost){
      const style=ghostStyle;
      retireObject(ghost,()=>style.restore());ghost=null;ghostStyle=null;
      sceneRevision++;ambientShading.refresh();
    }
    if(ghostPose&&!ghost){
      ghost=vehicleAssets.create(carKey);
      ghost.name='Personal best ghost';ghostStyle=styleGhostVehicle(ghost);scene.add(ghost);sceneRevision++;ambientShading.refresh();
    }
    if(ghost){
      ghost.visible=!!ghostPose&&Math.abs(ghostPose.s-st.s)<650;
      if(ghost.visible){const gp=vehicleGroundPoint(course,ghostPose.s,ghostPose.lateral),separation=Math.hypot(gp.x-pp.x,gp.z-pp.z);ghostStyle.opacity(.22*THREE.MathUtils.clamp((separation-2)/7,0,1));place(ghost,gp,ghostPose.headingError,wheelTravel(ghostPose.speedMph));ghost.position.y+=ghostPose.airHeight||0;const slope=groundSlope(course,ghostPose.s,ghostPose.lateral,ghostPose.headingError);ghost.rotation.x=slope.pitch;ghost.rotation.z=slope.roll;applyVehicleTerrainPose(ghost,course,ghostPose);}
    }
    if(!convoy)updateNpcVehicleDamage(rival,menu?null:st.rival,combatVehicleWear(st.rival,combatWearEnabled));
    rival.visible = !menu && !!st.rival && Math.abs(visualGap(st.rival.s)) < 650 &&
      !(st.rival.arenaRole === 'ambush-buggy' && !st.rival.ambushWave);
    if (rival.visible&&st.field)setCarShadows(rival,Math.abs(visualGap(st.rival.s))<FIELD_SHADOW_RANGE);
    if (rival.visible) {place(rival, vehicleGroundPoint(course,st.rival.s, st.rival.lateral), st.rival.headingError||0, wheelTravel(st.rival.speedMph));rival.position.y+=st.rival.airHeight||0;const slope=groundSlope(course,st.rival.s,st.rival.lateral,st.rival.headingError||0);rival.rotation.x=slope.pitch;rival.rotation.z=slope.roll;applyVehicleTerrainPose(rival,course,st.rival);updateDriver(rival.userData.driver,Math.max(-1,Math.min(1,(st.rival.pushVelocity||0)*.08)),0,false);for(const lamp of rival.userData.brakeLights||[])lamp.material.emissiveIntensity=st.rival.braking?4:1.4;}
    extraOpponents.forEach(({mesh},index)=>{
      const actor=opponents[index+1];
      updateNpcVehicleDamage(mesh,menu?null:actor,combatVehicleWear(actor,combatWearEnabled));
      mesh.visible=!menu&&!!actor&&Math.abs(visualGap(actor.s))<650;
      if(!mesh.visible)return;
      if(st.field)setCarShadows(mesh,Math.abs(visualGap(actor.s))<FIELD_SHADOW_RANGE);
      place(mesh,vehicleGroundPoint(course,actor.s,actor.lateral),actor.headingError||0,wheelTravel(actor.speedMph));
      mesh.position.y+=actor.airHeight||0;
      const slope=groundSlope(course,actor.s,actor.lateral,actor.headingError||0);
      mesh.rotation.x=slope.pitch;mesh.rotation.z=slope.roll;
      applyVehicleTerrainPose(mesh,course,actor);
      updateDriver(mesh.userData.driver,Math.max(-1,Math.min(1,(actor.pushVelocity||0)*.08)),0,false);
      for(const lamp of mesh.userData.brakeLights||[])lamp.material.emissiveIntensity=actor.braking?4:1.4;
    });
    const palette = [0xd9c99c, 0x2c566a, 0x847458, 0xf0e9dc, 0x5e3d2f];
    while (traffic.length < st.traffic.length) { const car = createVehicle({ color: palette[traffic.length % palette.length] }); scene.add(car); traffic.push(car);sceneRevision++;ambientShading.refresh(); }
    traffic.forEach((car, i) => {
      const d = st.traffic[i]; car.visible = !menu &&
        !!(d?.alive || d?.wrecked || d?.roadsideMotion?.visible) &&
        Math.abs(visualGap(d.s)) < 540;
      if (!menu && d?.wrecked) updateNpcVehicleDamage(car,d);
      else updateNpcVehicleDamage(car,!menu&&d?.alive?d:null);
      if (car.visible) {const turn=(d.dir<0?Math.PI:0)+(d.headingError||0);place(car,vehicleGroundPoint(course,d.s,d.lateral),turn,wheelTravel(d.speedMph));car.position.y+=d.airHeight||0;const slope=groundSlope(course,d.s,d.lateral,turn);car.rotation.x=slope.pitch;car.rotation.z=slope.roll+crashRollVisual(d);applyVehicleTerrainPose(car,course,d);}
    });
    const pursuit = st.police.pursuit; police.visible = !menu && !!pursuit?.active && pursuit.distanceU < 250;
    updateNpcVehicleDamage(police,!menu&&pursuit?.active?pursuit:null);
    if (police.visible) {
      place(police, vehicleGroundPoint(course,pursuit.s, pursuit.lateral), pursuit.headingError || 0, wheelTravel(pursuit.speedMph));
      police.position.y+=pursuit.airHeight||0;
      const slope=groundSlope(course,pursuit.s,pursuit.lateral,pursuit.headingError||0);police.rotation.x=slope.pitch;police.rotation.z=slope.roll;
      applyVehicleTerrainPose(police,course,pursuit);
      for(const lamp of police.userData.brakeLights||[])lamp.material.emissiveIntensity=pursuit.braking?4:1.4;
      lamps.children.forEach((lamp, i) => { lamp.visible = Math.floor(ambientNow / 130) % 2 === i; });
    }
    effects.update({ p: pp, course, state: menu ? { ...st, speedMph: 0, offRoad: false, roughness: 0, impactTimer: 0 } : st, dt: st.paused ? 0 : dt, now:ambientNow });
    const effectDt = st.paused ? 0 : dt;
    explosion.update(pp,st.combatWrecking?{...st,catastrophic:false}:st,effectDt);
    crashPoseState=st;
    combatEffects?.update({state:effectsField?st:null,course,dt:effectDt,
      crashEnabled:crashEffectsEnabled,resolveCrashTyres});
    const measureCombatWarmup=effectsField&&!combatEffectsWarmupMeasured&&
      combatEffects?.available;
    const combatWarmupStart=measureCombatWarmup?performance.now():0;
    const useCombatAtlas=effectsField&&!!combatEffects?.prewarm(renderer,camera);
    if(effectsField&&combatEffects?.resources.ready)combatEffectsPrepared=true;
    if(measureCombatWarmup){
      host.dataset.combatEffectsWarmupMs=(performance.now()-combatWarmupStart).toFixed(2);
      combatEffectsWarmupMeasured=true;
    }
    host.dataset.combatEffectsStatus=effectsField?useCombatAtlas?'ready':'fallback':'off';
    if(effectsField&&!combatEffectsPrepared){
      host.dataset.combatEffectsStatus='loading';
      renderer.domElement.style.visibility='hidden';
      rearView.hide();frameMetrics.suspend();return;
    }
    combatPlayerExplosion?.update(pp,
      {catastrophic:!useCombatAtlas&&!!st.combatWrecking,status:st.status},effectDt);
    if (!menu && st.arena && updateArenaTells([{mesh: player, actor: st}, {mesh: rival, actor: st.rival},
      ...extraOpponents.map(({mesh}, index) => ({mesh, actor: opponents[index + 1]}))],
      diagnosticTime?presentationSeconds:performance.now()/1000, ARENA_FEEL.shimmerSec)) ambientShading.refresh();
    updateArenaMarkers(arenaMarkers, !menu ? st.arena?.markers : null, diagnosticTime?presentationSeconds:performance.now() / 1000);
    opponentExplosions?.forEach((effect, index) => {
      const actor = st.opponents?.[index];
      effect.update(actor ? course.groundAt(actor.s, actor.lateral) : pp,
        {catastrophic:!useCombatAtlas&&!!actor?.combatWrecking, status:st.status}, effectDt);
    });
    combatScene.update(app.duel,{player,rival:convoy?null:rival,extraOpponents,camera,
      smokeTexture:combatEffects?.resources.textures.smoke,
      quality:app.ambientOcclusionEnabled!==false?'high':'performance'},useCombatAtlas);
    if(st.arena?.mode==='fuel-run'){
      fuelEntries[0].id='player';fuelEntries[0].mesh=player;fuelEntries[0].actor=st;
      for(let index=1;index<4;index++){
        const entry=fuelEntries[index],actor=opponents[index-1];
        entry.id=actor?.arenaId;entry.actor=actor;
        entry.mesh=index===1?rival:extraOpponents[index-2]?.mesh;
      }
      fuelView.update(st,course,fuelEntries);
    }else fuelView.group.visible=false;
    // Read-only Bounty beacon hook: use the exact rendered vehicle transforms.
    if(st.arena?.mode==='bounty-hunt'){
      bountyEntries[0].id='player';bountyEntries[0].mesh=player;bountyEntries[0].actor=st;
      for(let index=1;index<bountyEntries.length;index++){
        const entry=bountyEntries[index],actor=opponents[index-1];
        entry.id=actor?.arenaId;entry.actor=actor;
        entry.mesh=index===1?rival:extraOpponents[index-2]?.mesh;
      }
      bountyView.update(st,bountyEntries);
    }else bountyView.group.visible=false;
    ambushView.update(st);
    firstPersonEntry.fighter=st.fighter;
    firstPersonEntry.input=st.fighterInput;
    firstPersonEntry.weapons=st.footWeapons;
    firstPersonOptions.enabled=armoredField;
    firstPersonOptions.active=!menu&&st.onFoot&&st.status==='racing';
    firstPersonOptions.firstPerson=firstPersonView;
    firstPersonOptions.time=st.stageTimeSec;
    firstPersonGear.update(firstPersonEntry,firstPersonOptions);
    roadsideDebris.update(st);
    if(!st.paused)chickens.update(menu?{status:'menu',s:172,collectedFlocks:[]}:st,menu?presentationSeconds:st.totalTimeSec);
    lastSaltHeatEnabled = setSaltFlatsHeatEnabled(world,presentation.saltHeatEnabled !== false);
    animateScene(world,presentationSeconds);
    syncScene(world,menu?{crushedProps:[]}:st,st.paused?0:dt);
    world.userData.updatePitCrew?.(st);
    lighting.updateVehicles({course,position:pp,player,police,distance,tall,now:ambientNow,high:app.ambientOcclusionEnabled!==false,menu});
    lighting.updateCar(player, !!braking && !menu);
    if (!convoy) lighting.updateCar(rival, !!st.rival?.braking);
    for (let index = 0; index < extraOpponents.length; index++) {
      const entry = extraOpponents[index];
      if (!entry.drone) lighting.updateCar(entry.mesh, !!opponents[index + 1]?.braking);
    }
    for (let index = 0; index < traffic.length; index++)
      lighting.updateCar(traffic[index], !!st.traffic[index]?.braking);
    lighting.updateCar(police, !!pursuit?.braking);
    nightWorldInput.position = pp;
    nightWorldInput.heading = player.rotation.y;
    nightWorldInput.distance = distance;
    nightWorldInput.high = app.ambientOcclusionEnabled !== false;
    lighting.updateWorld(nightWorldInput);
    host.dataset.driver=player.userData.driver?'ready':'absent';
    const high=app.ambientOcclusionEnabled!==false;
    snowmenView?.update(menu?null:st,high);
    avalancheView?.update(menu?null:st,high);
    yetiView.update(menu?null:st,course,high);
    const snowOwner=snowWorldOf(world);
    if(snowOwner){
      snowVehicles.length=menu?0:Math.min(8,opponents.length+1);
      for(let i=0;i<snowVehicles.length;i++){
        const entry=snowVehicles[i]??(snowVehicles[i]={state:null,mesh:null});
        entry.state=i===0?st:opponents[i-1];entry.mesh=i===0?player:i===1?rival:extraOpponents[i-2]?.mesh;
      }
      snowOwner.update({state:menu?{status:'menu',s:distance,brokenScenery:[]}:st,camera,
        dt:st.paused?0:dt,high,vehicles:snowVehicles});
    }
    trackKitsOf(world)?.update({high,position:camera.position,camera,state:menu?{status:'menu'}:st});
    quality.update(high,adaptiveResolution.scale);host.dataset.ambientShading=String(ambientShading.enabled);
    const ratio=renderer.getPixelRatio();
    const metricsChanged=metricRevision!==sceneRevision||metricEnvironment!==scene.environment||metricQuality!==ambientShading.enabled||metricRatio!==ratio||metricMenu!==menu||metricCamera!==app.cameraMode||metricFootCamera!==`${!!st.onFoot}:${app.footCameraMode}`||metricMood!==app.lightingMood||metricInspection!==app.inspectionCamera||metricCar!==carKey;
    if(metricsChanged){
      resetFrameMetrics();metricRevision=sceneRevision;metricEnvironment=scene.environment;metricQuality=ambientShading.enabled;metricRatio=ratio;metricMenu=menu;metricCamera=app.cameraMode;metricFootCamera=`${!!st.onFoot}:${app.footCameraMode}`;metricMood=app.lightingMood;metricInspection=app.inspectionCamera;metricCar=carKey;
    }
    if(warmup){
      // Preparation gates structural changes only. New traffic, ghosts, damage,
      // weather blends and HDR completion must not pause an underway race.
      const revision=preparationKey({worldBuildCount,car:loadedCar,high:ambientShading.enabled});
      if(revision!==warmupKey){
        warmupKey=revision;app.holdVisualReadiness?.(readinessOwner);firstWorldFrame=true;
        host.dataset.warmupSubmitMs='0';host.dataset.warmupWaitMs='0';
        const preparingWorld=world;
        const withNightMaterials=guardLightingWarmup(
          ()=>!disposed&&warmupKey===revision&&world===preparingWorld,lighting.withNightMaterials);
        warmupTicket=warmup.request(revision,()=>{
          const started=performance.now();let compilation;
          try{
            compilation=high?compileWarmupPipeline(renderer,scene,camera,composer):compileWarmupScene(renderer,scene,camera,null);
            compilation=compileWarmupLighting(renderer,scene,camera,composer,{high,initialCompilation:compilation,withNightMaterials});
          }
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
    const loadingFrame=firstWorldFrame||metricsChanged;
    let submittedCpuMs;
    if(deepPose&&st.deepJourney.committed&&st.deepJourney.phase!=='ascending'){
      const privateRenderStarted=performance.now();
      deepView.render({duel:app.duel,car:player,camera,seconds:presentationSeconds,high,width:host.clientWidth,height:host.clientHeight});
      if(deepRevision!==deepView.revision){deepRevision=deepView.revision;ambientShading.refresh();sceneRevision++;}
      rearView.hide();submittedCpuMs=performance.now()-privateRenderStarted;
    } else {
      const preparationStarted=performance.now();
      deepView.render({duel:app.duel,car:player,camera,seconds:presentationSeconds,high,width:host.clientWidth,height:host.clientHeight});
      if(deepRevision!==deepView.revision){deepRevision=deepView.revision;ambientShading.refresh();sceneRevision++;}
      const preparationMs=performance.now()-preparationStarted;
      const renderStarted=performance.now();renderMainView(renderer,composer,high);
      const kits = trackKitsOf(world);
      if (kits) {
        const previousRender = renderer.render;
        renderer.render = function(renderedScene, renderedCamera, ...args) {
          if (renderedScene !== scene || renderedCamera !== rearView.camera)
            return previousRender.call(this,renderedScene,renderedCamera,...args);
          rearKitForward.set(0,0,-1).applyQuaternion(player.quaternion).normalize();
          return kits.withRearView({position:player.position,forward:rearKitForward},
            () => previousRender.call(this,renderedScene,renderedCamera,...args));
        };
        try {rearView.render({state:st,player,course,now:ambientNow});}
        finally {renderer.render = previousRender;}
      } else rearView.render({state:st,player,course,now:ambientNow});
      const cpuRenderMs=performance.now()-renderStarted;
      const overlayStarted=performance.now();deepView.drawOverlay();
      submittedCpuMs=preparationMs+cpuRenderMs+(performance.now()-overlayStarted);
    }
    const cpuRenderMs=submittedCpuMs;
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
  const debugApi=window.__render = { renderer, scene, camera, composer, captureTrackSnapshot, clearTrackSnapshot, renderFrame({presentationSeconds,saltHeatEnabled}={}) {
    try {
      frame(performance.now(),false,{presentationSeconds,saltHeatEnabled});
      return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
        presentationSeconds:lastPresentationSeconds,saltHeatEnabled:lastSaltHeatEnabled};
    } finally {
      // An inspection draw cannot persist its override into the next RAF frame.
      setSaltFlatsHeatEnabled(world,true);
    }
  }, sample() {
    frame();if(disposed||warmup&&!warmup.canDraw(warmupKey))return {warming:!disposed,distinctColors:0,drawCalls:0,triangles:0};const rt = new THREE.WebGLRenderTarget(64, 48); renderer.setRenderTarget(rt); renderer.render(scene, camera);
    const data = new Uint8Array(64 * 48 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 64, 48, data); renderer.setRenderTarget(null); rt.dispose();
    const colors = new Set(); for (let i = 0; i < data.length; i += 4) colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
    return { distinctColors: colors.size, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  } };
  return { prepareVehicle, captureTrackSnapshot, clearTrackSnapshot,
    retryVehicle() { return prepareVehicle(host.dataset.vehicleKey,{retry:true}); },
    retryTrackKits() {const next=app.duel.state.status==='menu'?app.getMenuCourse(app.menuStage||0):app.duel.course;return prepareKitWorld(next,{retry:true});},
    projectFootAim() {
      const state=app.duel.state;
      return !disposed&&state.onFoot&&state.status!=='menu'?projectOnFootAim(camera,state.fighter):null;
    },
    projectOpponents() {
      if (disposed || app.duel.state.status === 'menu') return [];
      const opponents = app.duel.state.opponents || [];
      const meshes = opponents.map((_, index) => index === 0 ? rival :
        extraOpponents[index - 1]?.mesh);
      return projectVehicleMarkers(camera, meshes);
    },
    dispose() {
    clearTrackSnapshot();
    if(disposed)return;roadRoof.dispose();yetiView.dispose();yetiAssets.dispose();disposed=true;stopDeepEvents();deepView.dispose();heliView.dispose();burntLook.dispose();snowmenView?.dispose();snowmenView=null;avalancheView?.dispose();avalancheView=null;preparedTrackKits?.dispose();preparedTrackKits=null;stopCrashEvents();lighting.stop();cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);
    if(readinessClaimed)app.releaseVisualReadiness?.(readinessOwner);
    if(window.__render===debugApi)delete window.__render;
    if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);
    const release = () => {
      bountyView.dispose();
      ambushView.dispose();
      fuelView.dispose();
      tanker?.dispose();
      rearView.dispose();
      firstPersonGear.dispose();
      combatScene.dispose();
      combatEffects?.dispose();
      vehicleAttachments.clear();
      effects.dispose();
      explosion.dispose();
      combatPlayerExplosion?.dispose();
      opponentExplosions?.forEach(effect => effect.dispose());
      lighting.dispose();
      composer.passes.forEach(pass => pass.dispose?.());
      composer.dispose();
      ghostStyle?.restore();
      extraOpponents.forEach(entry => entry.droneStyle?.restore());
      disposeTree(scene);
      renderer.dispose();
    };
    if(warmup)warmup.dispose(release);else release();
  } };
}

function place(car, p, turn = 0, travel = 0) {
  placeGroundedVehicle(car,p,turn,travel);
}

function groundSlope(course,s,lat,angle){
  return vehicleGroundSlope(course,s,lat,angle);
}
