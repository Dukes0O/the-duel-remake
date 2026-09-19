import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Course } from './course.js';
import { COURSE, CARS, DRIVE } from './config.js';
import { createVehicle, updateVehicleDamage } from './vehicles.js';
import { buildEnvironment, worldAtExtended, disposeTree } from './world.js';
import { createDrivingEffects } from './effects.js';
import { createExplosion } from './explosion.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createChickens } from './chickens.js';
import { loadHeroVehicle } from './hero-vehicle.js';

// This layer only reads simulation state. Asset replacement never changes race rules.
export function attachRenderer(host, app) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
    scene.environment=naturalEnvironment.texture;scene.environmentIntensity=.85;
    texture.dispose();pm.dispose();host.dataset.environment='sunset-hdri';
  },undefined,()=>{host.dataset.environment='studio-fallback';});
  const hemi = new THREE.HemisphereLight(0xb2cde0, 0x714226, 1.65);
  const sun = new THREE.DirectionalLight(0xffddac, 3.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 240 });
  sun.shadow.bias = -.00035; sun.shadow.normalBias = .03;
  scene.add(hemi, sun, sun.target);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1900, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#466d86') }, horizon: { value: new THREE.Color('#f6bc82') }, sunDir: { value: new THREE.Vector3(-.6, .17, .8).normalize() } },
    vertexShader: 'varying vec3 vDir; void main(){vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir;
      void main(){ vec3 d=normalize(vDir); float h=max(d.y,0.); vec3 c=mix(horizon,top,pow(h,.45));
      float s=max(dot(d,sunDir),0.); c+=vec3(1.,.58,.22)*pow(s,24.)*.36;
      c+=vec3(1.,.9,.66)*smoothstep(.99915,.99965,s)*2.;
      float cloud=sin(d.x*19.+d.z*8.)*sin(d.z*32.-d.x*15.);
      c=mix(c,vec3(.85,.71,.59),smoothstep(.58,.93,cloud)*smoothstep(.12,.2,d.y)*(1.-smoothstep(.28,.4,d.y))*.2);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  sky.frustumCulled = false; scene.add(sky);
  const preview = new Course(COURSE[0], app.seed);
  let course, world, loadedCar, player, rival, loadedStation, chickens;
  let heroFactory;
  loadHeroVehicle().then(factory => {
    if (disposed) return;
    heroFactory = factory; loadedCar = null; host.dataset.heroAsset = 'ready';
  }).catch(error => { host.dataset.heroAsset = 'fallback'; console.warn('Detailed car unavailable; using local fallback.', error); });
  const traffic = [];
  const police = createVehicle({ color: 0x172a36, accent: 0xeeeecc, kind: 'sedan', detail: 'low' });
  const lamps = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.48, .16, .32), new THREE.MeshBasicMaterial({ color: i ? 0x178aff : 0xff2211 }));
    m.position.set(i ? .34 : -.34, 1.66, -.1); lamps.add(m);
  }
  police.add(lamps); scene.add(police);
  const effects = createDrivingEffects(); scene.add(effects.group);
  const explosion = createExplosion(); scene.add(explosion.group);
  // Blender exports use metres, +Y up, +Z forward. Procedural world works before loading.
  new GLTFLoader().load('/assets/models/desert-service-station.glb', gltf => {
    loadedStation = gltf.scene;
    loadedStation.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (world) addStationAsset();
  }, undefined, () => {});
  function addStationAsset() {
    const g = loadedStation.clone(true), p = course.worldAt(900, 27);
    g.userData.sharedAsset = true;
    g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading; world.add(g);
  }
  function build(next) {
    if (world) {
      scene.remove(world);
      // Imported instances share resources with the retained template.
      for (const child of [...world.children]) if (child.userData.sharedAsset) world.remove(child);
      disposeTree(world);
    }
    course = next;
    const alpine = course.def.theme === 'alpine';
    scene.fog = new THREE.Fog(alpine ? 0xb5c6ca : 0xdec1a0, 230, 1450);
    sky.material.uniforms.top.value.set(alpine ? '#426e87' : '#466d86');
    sky.material.uniforms.horizon.value.set(alpine ? '#c4d4d8' : '#f6bc82');
    hemi.groundColor.set(alpine ? 0x526153 : 0x714226);
    world = buildEnvironment(course); scene.add(world);
    chickens=createChickens(course);world.add(chickens.group);
    if (loadedStation) addStationAsset();
  }
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  let ready = false, lastMenu = null, previousT = performance.now(), metricsTime = previousT, metricFrames = 0;
  function frame(now = performance.now()) {
    const dt = Math.min(.05, Math.max(.001, (now - previousT) / 1000)); previousT = now;
    const st = app.duel.state, menu = st.status === 'menu', next = menu ? preview : app.duel.course;
    const moving = st.status === 'racing' && !st.paused;
    if (!next) return;
    if (course !== next) { build(next); ready = false; }
    if (menu !== lastMenu) { ready = false; lastMenu = menu; }
    const carKey = (menu && app.menuCar) || st.car;
    if (carKey !== loadedCar) {
      if (player) { scene.remove(player); disposeTree(player); }
      const car = CARS[carKey] || CARS.falcone_f42;
      player = (heroFactory || createVehicle)({ color: car.color, accent: car.accent, kind: carKey.includes('959') ? 'stuttgart' : 'sport' });
      scene.add(player); loadedCar = carKey;
    }
    if (!rival) { rival = createVehicle({ color: 0xbfcace, accent: 0x142a36 }); scene.add(rival); }
    const distance = menu ? 172 : st.s, lateral = menu ? -2.8 : st.lateral;
    const pp = worldAtExtended(course, distance, lateral);
    if (Math.abs(lateral)>7) {
      const edge=Math.max(0,Math.abs(lateral)-13),wave=Math.sin(distance*.009+lateral*.007)*Math.cos(lateral*.021+distance*.004);
      pp.y+=edge<1?-.06:Math.max(-2,wave*Math.min(32,edge*.13)+edge*.014-.2);
    }
    const wheelTravel = mph => moving ? mph * (DRIVE.mphToWorld || .44704) * dt : 0;
    place(player, pp, 0, wheelTravel(st.speedMph));
    const wreckAge=st.catastrophic ? Math.max(0,(st.impactDuration||0)-(st.impactTimer||0)) : 0;
    updateVehicleDamage(player,menu?0:st.majorCrashes, !menu&&st.catastrophic, wreckAge);
    const steering = menu ? 0 : st.steerVisual || 0;
    const impact = menu ? 0 : Math.min(1, (st.impactTimer || 0) / (st.impactDuration || 1.8));
    const rough = menu ? 0 : st.roughness || 0;
    const motionTime = st.stageTimeSec;
    player.rotation.y += menu ? 0 : (st.headingError || 0) + (st.slipAngle || 0) + (st.crashSpin || 0);
    player.rotation.z = steering * Math.min(st.speedMph / 160, 1) * .045;
    player.rotation.x = menu ? 0 : -(course.at(distance + 2).y - course.at(distance - 2).y) / 4;
    if (!menu) {
      player.position.y += rough * Math.abs(Math.sin(motionTime * 35)) * .15;
      player.rotation.z += Math.sin(motionTime * 24) * rough * .07;
      player.rotation.x += Math.sin(motionTime * 29) * rough * .055;
      const hitArc = Math.sin(impact * Math.PI);
      player.position.y += hitArc * (st.impactStrength || 0) * .55;
      player.rotation.z += hitArc * (st.impactSide || 1) * .24;
      player.rotation.x -= hitArc * .18;
      if(st.catastrophic){player.position.y+=.36+Math.sin(Math.min(1,wreckAge/1.25)*Math.PI)*1.4;player.rotation.z+=(st.impactSide||1)*Math.min(wreckAge,1.1)*.56;}
    }
    for (const lamp of player.userData.brakeLights || []) lamp.material.emissiveIntensity = st.input.brake ? 4 : 1.4;
    for (const flame of player.userData.boostFlames || []) { flame.visible = !!st.boosting && !menu; flame.scale.z = .7 + Math.sin(now * .052) * .3; }
    for (const pivot of player.userData.wheelPivots || []) if (pivot.userData.front) pivot.rotation.y = -steering * .22;
    player.visible = menu || app.cameraMode !== 'hood' || st.catastrophic;
    if (menu) {
      const cp = worldAtExtended(course, distance + 6.4, lateral + 7.7 + Math.sin(now * .00009) * .6);
      camTarget.set(cp.x, cp.y + 2.85, cp.z);
      const composition = Math.min(1, camera.aspect / 1.7);
      const aim = worldAtExtended(course, distance + 2.6 * composition, lateral - 2.8 * composition);
      lookTarget.set(aim.x, pp.y + (host.clientHeight < 850 ? -.4 : .95), aim.z); camera.fov = 48;
    } else {
      const mode = app.cameraMode || 'chase';
      const back = mode === 'hood' ? .8 : mode === 'wide' ? -13.5 : -8.7;
      const height = mode === 'hood' ? 1.38 : mode === 'wide' ? 5.6 : 3.65;
      const cp = worldAtExtended(course, distance + back, lateral);
      const groundLift = pp.y - course.at(distance).y;
      camTarget.set(cp.x, cp.y + height + groundLift, cp.z);
      const aim = worldAtExtended(course, distance + (mode === 'hood' ? 42 : 26), lateral);
      lookTarget.set(aim.x, aim.y + 1.05 + groundLift, aim.z);
      camera.fov = THREE.MathUtils.damp(camera.fov, 55 + Math.min(st.speedMph / 200, 1) * 10 + (st.boosting ? 7 : 0) + impact * 7, 4, dt);
      const shake = impact * (st.impactStrength || 0) * .34 + rough * Math.min(st.speedMph / 100, 1) * .10;
      camTarget.x += Math.sin(motionTime * 81) * shake;
      camTarget.y += Math.cos(motionTime * 93) * shake * .62;
      if(st.catastrophic){
        const angle=pp.heading-.48-Math.min(wreckAge,2.6)*.17,reach=10.5+Math.min(wreckAge,2)*2;
        camTarget.set(pp.x-Math.sin(angle)*reach,pp.y+4.5,pp.z-Math.cos(angle)*reach);
        lookTarget.set(pp.x,pp.y+1.3,pp.z);camera.fov=58;
      }
    }
    if (!ready || menu) camera.position.copy(camTarget);
    else {
      camera.position.lerp(camTarget, 1 - Math.exp(-14 * dt));
      // Follow longitudinal motion immediately: world-space damping otherwise
      // adds a speed-dependent camera gap and makes the car shrink at speed.
      camera.position.x = camTarget.x; camera.position.z = camTarget.z;
    }
    ready = true; camera.lookAt(lookTarget); camera.updateProjectionMatrix(); sky.position.copy(camera.position);
    sun.position.set(pp.x - 75, pp.y + 90, pp.z + 50); sun.target.position.set(pp.x, pp.y, pp.z); sun.target.updateMatrixWorld();
    rival.visible = !menu && !!st.rival && Math.abs(st.rival.s - st.s) < 650;
    if (rival.visible) place(rival, worldAtExtended(course, st.rival.s, st.rival.lateral), 0, wheelTravel(st.rival.speedMph));
    const palette = [0xd9c99c, 0x2c566a, 0x847458, 0xf0e9dc, 0x5e3d2f];
    while (traffic.length < st.traffic.length) { const car = createVehicle({ color: palette[traffic.length % palette.length], kind: 'sedan', detail: 'low' }); scene.add(car); traffic.push(car); }
    traffic.forEach((car, i) => {
      const d = st.traffic[i]; car.visible = !menu && !!d?.alive && Math.abs(d.s - st.s) < 540;
      if (car.visible) place(car, worldAtExtended(course, d.s, d.lateral), d.dir < 0 ? Math.PI : 0, wheelTravel(d.speedMph));
    });
    const pursuit = st.police.pursuit; police.visible = !menu && !!pursuit?.active && pursuit.gapU < 250;
    if (police.visible) { place(police, worldAtExtended(course, st.s - Math.max(6, pursuit.gapU), st.lateral), 0, wheelTravel(140)); lamps.children.forEach((lamp, i) => { lamp.visible = Math.floor(now / 130) % 2 === i; }); }
    effects.update({ p: pp, state: menu ? { ...st, speedMph: 0, offRoad: false, roughness: 0, impactTimer: 0 } : st, dt: st.paused ? 0 : dt, now });
    explosion.update(pp,st,st.paused?0:dt);
    if(!st.paused)chickens.update(st,menu?now/1000:st.totalTimeSec);
    renderer.info.autoReset=false;renderer.info.reset();composer.render();
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
  let disposed = false, raf;
  const tick = t => { if (disposed) return; frame(t); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
  const resize = () => { renderer.setSize(host.clientWidth, host.clientHeight); composer.setSize(host.clientWidth,host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize);
  window.__render = { renderer, scene, camera, renderFrame() { frame(); return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; }, sample() {
    frame(); const rt = new THREE.WebGLRenderTarget(64, 48); renderer.setRenderTarget(rt); renderer.render(scene, camera);
    const data = new Uint8Array(64 * 48 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 64, 48, data); renderer.setRenderTarget(null); rt.dispose();
    const colors = new Set(); for (let i = 0; i < data.length; i += 4) colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
    return { distinctColors: colors.size, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  } };
  return { dispose() { disposed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); effects.dispose(); explosion.dispose(); composer.passes.forEach(p=>p.dispose?.());composer.dispose();disposeTree(scene); environment.dispose();naturalEnvironment?.dispose(); renderer.dispose(); host.replaceChildren(); } };
}

function place(car, p, turn = 0, travel = 0) {
  car.position.set(p.x, p.y + .07, p.z); car.rotation.set(0, p.heading + turn, 0);
  for (const wheel of car.userData.wheels || []) wheel.rotation.x += travel / .36;
}
