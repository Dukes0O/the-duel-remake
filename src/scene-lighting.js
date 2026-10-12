import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createAtmosphericSky, SUN_OFFSET } from './atmosphere.js';
import { resolveLightingSettings, circuitLighting } from './lighting-moods.js';
import { createLocalLighting } from './local-lighting.js';
import { sampleCourseLightPath } from './light-path.js';
import { createVehicleNightLighting } from './vehicles.js';

// One owner for scene lights, the sky and environment targets. The renderer
// owns the composer passes and decides when pending GPU work permits disposal.
export function createSceneLighting({ scene, renderer, bloom, host }, {
  createPMREM = () => new THREE.PMREMGenerator(renderer),
  createRoom = () => new RoomEnvironment(),
  loadEnvironment = (loaded, failed) => new RGBELoader().load('/assets/textures/sunset-lighting.hdr', loaded, undefined, failed),
} = {}) {
  let stopped = false, disposed = false, course, naturalEnvironment, pmremReleased = false, pathSample = null;
  const sampleBuffer = {}, sampleInputs = {}, vehicleUpdate = {}, worldUpdate = {}, vehicleLights = new Map(), vehicleInputs = new Map(), worldDetails = new Map();
  let activeWorld = null, activeWinter = false, winterDryPalette = null;
  const pmrem = createPMREM(), room = createRoom();
  const releasePMREM = () => { if (!pmremReleased) { pmremReleased = true; pmrem.dispose(); } };
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .82;
  room.dispose();
  // The studio and our 1024x512 HDR both use cube size 256. Retain the
  // prefilter's scratch target, blur program and LOD planes for the HDR instead
  // of disposing and rebuilding them; the output targets remain independent.
  loadEnvironment(texture => {
    if (stopped || pmremReleased) { texture.dispose(); releasePMREM(); return; }
    try {
      naturalEnvironment = pmrem.fromEquirectangular(texture);
      if (pathSample || course?.def.theme !== 'city') scene.environment = naturalEnvironment.texture;
      host.dataset.environment = 'sunset-hdri';
    } catch {
      if (!stopped) host.dataset.environment = 'studio-fallback';
    } finally { texture.dispose(); releasePMREM(); }
  }, () => { releasePMREM(); if (!stopped) host.dataset.environment = 'studio-fallback'; });

  const hemi = new THREE.HemisphereLight(0xb2cde0, 0x714226, 1.65);
  const sun = new THREE.DirectionalLight(0xffddac, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 240 });
  sun.shadow.bias = -.00035;
  sun.shadow.normalBias = .03;
  scene.add(hemi, sun, sun.target);
  const atmosphere = createAtmosphericSky(), sky = atmosphere.sky;
  scene.add(sky);
  const localLighting = createLocalLighting(scene);
  const headlights = [-1, 1].map(side => {
    const light = new THREE.SpotLight(0xe3edff, 0, 95, .43, .55, 1.2);
    scene.add(light, light.target);
    return { light, side };
  });
  const lightColor = new THREE.Color();
  const sunOffset = new THREE.Vector3(SUN_OFFSET.x, SUN_OFFSET.y, SUN_OFFSET.z);
  const targetSun = new THREE.Vector3();
  const colour = value => Array.isArray(value) ? lightColor.setRGB(value[0], value[1], value[2]) : lightColor.set(value);

  const paletteFields = ['fog','top','horizon','cloudTint','ground','sunColor'];
  const paletteComponents = ['r','g','b'], dryPaletteKey = new Float64Array(18);
  let hasDryPalette = false;
  function paletteKey(settings, key, write = false) {
    let index = 0;
    for (const field of paletteFields) {
      const value = field === 'cloudTint'
        ? lightColor.setRGB(settings.cloudTint[0],settings.cloudTint[1],settings.cloudTint[2])
        : colour(settings[field]);
      for (const component of paletteComponents) {
        if (write) key[index++] = value[component];
        else if (key[index++] !== value[component]) return false;
      }
    }
    return true;
  }

  return {
    sun,
    apply({ course: next, theme = next.def.theme, mood, blend = 1, tunnel = false, distance = 0, raceLength = next.raceLength, menu = false, winter }) {
      if (stopped) return;
      course = next;
      const night = theme === 'city' || course.def.timeOfDay === 'night';
      sampleInputs.distance = distance;sampleInputs.raceLength = raceLength;sampleInputs.theme = theme;
      sampleInputs.tunnel = tunnel;sampleInputs.menu = menu;
      pathSample = sampleCourseLightPath(course, sampleInputs, sampleBuffer);
      let baseSettings = pathSample?.settings || resolveLightingSettings(theme, { mood, night, tunnel });
      if (!pathSample && !night && !tunnel && mood !== 'overcast') baseSettings = circuitLighting(baseSettings, course.def.light);
      const settings = winter ? winter(baseSettings) : baseSettings;
      const amount = pathSample ? 1 : blend;
      if (winter && !activeWinter) {
        winterDryPalette = {key:hasDryPalette ? dryPaletteKey.slice() : null,colours:{
          fog:(scene.fog?.color ?? colour(baseSettings.fog)).toArray(),
          top:sky.material.uniforms.top.value.toArray(),horizon:sky.material.uniforms.horizon.value.toArray(),
          cloudTint:sky.material.uniforms.cloudTint.value.toArray(),
          ground:hemi.groundColor.toArray(),sun:sun.color.toArray(),
        }};
      }
      const restoreWinter = activeWinter && !winter && amount === 1;
      const savedPalette = restoreWinter && winterDryPalette?.key && paletteKey(baseSettings,winterDryPalette.key)
        ? winterDryPalette.colours : null;
      activeWinter = !!winter;
      if (!winter) {winterDryPalette = null;paletteKey(baseSettings,dryPaletteKey,true);hasDryPalette = true;}
      atmosphere.setLightPath(!!pathSample);
      if (!scene.fog) scene.fog = new THREE.Fog(colour(settings.fog), 260, 1650);
      scene.fog.color.lerp(colour(settings.fog), amount);
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, settings.fogNear, amount);
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, settings.fogFar, amount);
      const uniforms = sky.material.uniforms;
      uniforms.top.value.lerp(colour(settings.top), amount);
      uniforms.horizon.value.lerp(colour(settings.horizon), amount);
      uniforms.sunStrength.value = THREE.MathUtils.lerp(uniforms.sunStrength.value, settings.sunStrength, amount);
      sunOffset.lerp(targetSun.set(settings.sunOffset.x, settings.sunOffset.y, settings.sunOffset.z), amount);
      uniforms.sunDir.value.copy(sunOffset).normalize();
      uniforms.cloudCover.value = THREE.MathUtils.lerp(uniforms.cloudCover.value, settings.cloudCover, amount);
      uniforms.cloudTint.value.lerp(lightColor.setRGB(...settings.cloudTint), amount);
      hemi.groundColor.lerp(colour(settings.ground), amount);
      hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, settings.hemi, amount);
      sun.intensity = THREE.MathUtils.lerp(sun.intensity, settings.sun, amount);
      sun.color.lerp(colour(settings.sunColor), amount);
      scene.environment = pathSample ? naturalEnvironment?.texture || environment.texture : night ? environment.texture : naturalEnvironment?.texture || environment.texture;
      scene.environmentIntensity = THREE.MathUtils.lerp(scene.environmentIntensity, settings.env, amount);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure, settings.exposure, amount);
      bloom.strength = settings.bloom;
      if (restoreWinter) {
        if (savedPalette) {
          scene.fog.color.fromArray(savedPalette.fog);
          uniforms.top.value.fromArray(savedPalette.top);uniforms.horizon.value.fromArray(savedPalette.horizon);
          uniforms.cloudTint.value.fromArray(savedPalette.cloudTint);
          hemi.groundColor.fromArray(savedPalette.ground);sun.color.fromArray(savedPalette.sun);
        } else {
          scene.fog.color.copy(colour(settings.fog));
          uniforms.top.value.copy(colour(settings.top));uniforms.horizon.value.copy(colour(settings.horizon));
          uniforms.cloudTint.value.setRGB(...settings.cloudTint);
          hemi.groundColor.copy(colour(settings.ground));sun.color.copy(colour(settings.sunColor));
        }
      }
      host.dataset.theme = theme;
      host.dataset.tunnel = String(tunnel);
      host.dataset.lightingMood = pathSample ? 'light-path' : night ? 'night' : mood || 'clear';
      if (pathSample) {
        uniforms.stars.value = settings.stars;uniforms.moon.value = settings.moon;
        host.dataset.lightPath = 'true';host.dataset.nightAmount = String(settings.nightAmount);
      } else {
        delete host.dataset.lightPath;delete host.dataset.nightAmount;
      }
    },
    followCamera(camera, position, seconds) {
      if (stopped) return;
      sky.position.copy(camera.position);
      atmosphere.update(seconds);
      sun.position.set(position.x + sunOffset.x, position.y + sunOffset.y, position.z + sunOffset.z);
      sun.target.position.set(position.x, position.y, position.z);
      sun.target.updateMatrixWorld();
    },
    updateVehicles({ course: current, position, player, police, distance, tall, now, high, menu }) {
      if (stopped) return;
      for (const { light, side } of headlights) {
        const heading = player.rotation.y, c = Math.cos(heading), sn = Math.sin(heading);
        light.intensity = current.tunnelAt(distance) ? 125 : pathSample ? 38 * pathSample.headlights : current.def.timeOfDay === 'night' || current.themeAt(distance) === 'city' ? 78 : 0;
        light.position.set(position.x + c * side * .65 + sn * 1.8, position.y + (tall ? 2.2 : .72), position.z - sn * side * .65 + c * 1.8);
        light.target.position.set(position.x + sn * 40, position.y - 1, position.z + c * 40);
        light.target.updateMatrixWorld();
      }
      localLighting.update({ course: current, position, police, now, night: pathSample ? false : current.def.timeOfDay === 'night' || current.themeAt(distance) === 'city', high, menu });
    },
    updateCar(vehicle, braking) {
      if (stopped || !vehicle) return;
      let lamps = vehicleLights.get(vehicle);
      if (pathSample && vehicle.visible) {
        if (!lamps) { lamps = createVehicleNightLighting(vehicle);vehicleLights.set(vehicle, lamps);vehicleInputs.set(vehicle, {}); }
        vehicleUpdate.amount = pathSample.headlights;vehicleUpdate.braking = braking;lamps.update(vehicleUpdate);
        Object.assign(vehicleInputs.get(vehicle), vehicleUpdate, {active: true});
      } else if (lamps) { vehicleUpdate.braking = braking;lamps.restore(vehicleUpdate);
        Object.assign(vehicleInputs.get(vehicle), vehicleUpdate, {active: false}); }
    },
    detachVehicle(vehicle) {
      const lamps = vehicleLights.get(vehicle);
      if (lamps) { lamps.dispose();vehicleLights.delete(vehicle);vehicleInputs.delete(vehicle); }
    },
    setWorld(world) {
      if (activeWorld !== world) worldDetails.get(activeWorld)?.restore();
      activeWorld = world;
    },
    updateWorld(input) {
      if (stopped || !activeWorld) return;
      let details = worldDetails.get(activeWorld);
      if (pathSample) {
        if (!details) { details = createPathNightDetails({world: activeWorld, course});worldDetails.set(activeWorld, details); }
        worldUpdate.position = input.position;worldUpdate.heading = input.heading;worldUpdate.distance = input.distance;worldUpdate.high = input.high;
        worldUpdate.amount = pathSample.settings.nightAmount;worldUpdate.headlights = pathSample.headlights;details.update(worldUpdate);
      } else details?.restore();
    },
    // Binding changes are synchronous; only native compiler promises escape.
    // The existing warmup job owns their lifetime until every variant settles.
    withNightMaterials(submit) {
      if (stopped || !pathSample) return;
      const uniforms = sky.material.uniforms;
      const stars = uniforms.stars.value, moon = uniforms.moon.value;
      const details = worldDetails.get(activeWorld);
      try {
        uniforms.stars.value = uniforms.moon.value = 1;
        for (const [vehicle, lamps] of vehicleLights) {
          const input = vehicleInputs.get(vehicle);
          if (input.active) lamps.update({amount: 1, braking: input.braking});
        }
        if (details) details.update({...worldUpdate, amount: 1, headlights: 1});
        return submit();
      } finally {
        uniforms.stars.value = stars;uniforms.moon.value = moon;
        for (const [vehicle, lamps] of vehicleLights) {
          const input = vehicleInputs.get(vehicle);
          if (input.active) lamps.update(input);else lamps.restore(input);
        }
        if (details) details.update(worldUpdate);
      }
    },
    detachWorld(world) {
      const details = worldDetails.get(world);
      if (details) { details.dispose();worldDetails.delete(world); }
      if (activeWorld === world) activeWorld = null;
    },
    // Invalidate asynchronous callbacks immediately, without releasing targets
    // that an in-flight shader compilation may still reference.
    stop() { stopped = true; },
    dispose() {
      if (disposed) return;
      stopped = disposed = true;
      releasePMREM();
      for (const lamps of vehicleLights.values()) lamps.dispose();
      vehicleLights.clear();vehicleInputs.clear();
      for (const details of worldDetails.values()) details.dispose();
      worldDetails.clear();
      atmosphere.dispose();
      localLighting.dispose();
      scene.remove(sky, hemi, sun, sun.target);
      sky.geometry.dispose();
      sky.material.dispose();
      hemi.dispose();
      sun.dispose();
      for (const { light } of headlights) {
        scene.remove(light, light.target);
        light.dispose();
      }
      if (scene.environment === environment.texture || scene.environment === naturalEnvironment?.texture) scene.environment = null;
      environment.dispose();
      naturalEnvironment?.dispose();
    },
  };
}


// Decorative surfaces stay attached to their native scene objects. Sign text,
// window geometry and collisions are never replaced; all changes are reversible.
export function createPathNightDetails({world, course}) {
  const group = new THREE.Group();group.name = 'Authored night details';group.visible = false;
  const eye = {value: new THREE.Vector3()}, direction = {value: new THREE.Vector3(0, 0, 1)}, strength = {value: 0};
  const bindings = [], materials = new Map(), windowMaterials = new Set(), markingMaterials = new Set();
  const interiorNight = {value: 0}, windowCutoff = {value: .6};
  const originalKey = material => material.customProgramCacheKey();
  function reflective(source) {
    const material = source.clone(), compile = source.onBeforeCompile, key = originalKey(source);
    material.userData.sharedAsset = false;
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(source, shader, renderer);
      shader.uniforms.pathEye = eye;shader.uniforms.pathDirection = direction;shader.uniforms.pathBeam = strength;
      shader.vertexShader = shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec3 vPathWorld;').replace('#include <worldpos_vertex>', `
        #include <worldpos_vertex>
        vec4 pathWorld=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          pathWorld=instanceMatrix*pathWorld;
        #endif
        vPathWorld=(modelMatrix*pathWorld).xyz;`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
        '#include <common>\nvarying vec3 vPathWorld;uniform vec3 pathEye,pathDirection;uniform float pathBeam;')
        .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        vec3 pathOffset=vPathWorld-pathEye;
        float pathRange=length(pathOffset);
        float pathFacing=dot(normalize(pathOffset),pathDirection);
        float pathReflection=smoothstep(.72,.97,pathFacing)*(1.-smoothstep(25.,100.,pathRange))*pathBeam;
        totalEmissiveRadiance+=diffuseColor.rgb*pathReflection*1.65;`);
    };
    material.customProgramCacheKey = () => `${key}:path-reflective-v1`;
    return material;
  }
  world.traverse(mesh => {
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const source = mesh.material;
    const marking = mesh.userData.roadMarking === 'edge' || mesh.userData.roadMarking === 'centre';
    const sign = mesh.parent?.userData.roadSignId && !!source.map || mesh.userData.turnSignCell?.kind === 'boards' ||
      mesh.userData.brakingBoard === true;
    const cityInterior = originalKey(source) === 'city-room-parallax-v1';
    const skyline = originalKey(source) === 'city-skyline-grid-v1';
    const window = cityInterior || skyline || mesh.userData.harborCell?.kind === 'windows' || /glazing|window/i.test(source.name) ||
      !!source.emissiveMap && source.emissive?.getHex() === 0xffbc71;
    if (!sign && !window && !marking) return;
    if (!materials.has(source)) {
      const material = sign || marking ? reflective(source) : source.clone();
      if (marking) {material.emissive.set(0x6284b5);markingMaterials.add(material);}
      if (window) {
        material.onBeforeCompile = source.onBeforeCompile;material.customProgramCacheKey = source.customProgramCacheKey;
        material.emissive.set(0xffc17b);windowMaterials.add(material);
        if (cityInterior || skyline) {
          // Select the existing stable pane seed, preserving all native room
          // geometry and perspective. Both shaders assign radiance directly.
          material.onBeforeCompile = (shader, renderer) => {
            source.onBeforeCompile.call(source, shader, renderer);
            shader.uniforms.pathInteriorNight = interiorNight;
            shader.uniforms.pathWindowCutoff = windowCutoff;
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
              '#include <common>\nuniform float pathInteriorNight,pathWindowCutoff;')
              .replace('step(cityHeight>1.8?.08:.29,vCityRoomSeed)', 'step(pathWindowCutoff,vCityRoomSeed)')
              .replace('mix(.025,.65+vCityRoomSeed*.65,cityLit)', '(.65+vCityRoomSeed*.65)*cityLit')
              .replace('totalEmissiveRadiance=cityInteriorColor*cityInteriorLight;',
                'totalEmissiveRadiance=cityInteriorColor*cityInteriorLight*pathInteriorNight*vec3(1.0,.87,.69);')
              .replace('step(.67,occupancy)', 'step(pathWindowCutoff,occupancy)')
              .replace('mix(vec3(.40,.47,.52),vec3(.62,.49,.32),step(.37,vSkylineSeed))*lit*.28',
                'vec3(1.0,.68,.34)*(.4+occupancy*.6)*lit*.65')
              .replace('totalEmissiveRadiance=skylineGlow;', 'totalEmissiveRadiance=skylineGlow*pathInteriorNight;');
          };
          material.customProgramCacheKey = () => `${originalKey(source)}:path-window-v2`;
        }
      }
      material.userData.sharedAsset = false;materials.set(source, material);
    }
    bindings.push({mesh, source, material: materials.get(source), marking});
  });
  const reflectorGeometry = new THREE.BoxGeometry(.13, .028, .20);
  const reflectorMaterial = new THREE.ShaderMaterial({
    uniforms: {pathEye: eye, pathDirection: direction, pathBeam: strength},
    vertexShader: `varying vec3 vWorld;void main(){vec4 p=vec4(position,1.);
      #ifdef USE_INSTANCING
        p=instanceMatrix*p;
      #endif
      p=modelMatrix*p;vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `varying vec3 vWorld;uniform vec3 pathEye,pathDirection;uniform float pathBeam;
      void main(){vec3 offset=vWorld-pathEye;float range=length(offset);
      float glow=smoothstep(.75,.98,dot(normalize(offset),pathDirection))*(1.-smoothstep(22.,110.,range))*pathBeam;
      gl_FragColor=vec4(mix(vec3(.10,.13,.15),vec3(1.8,1.65,1.15),glow),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const reflectors = new THREE.InstancedMesh(reflectorGeometry, reflectorMaterial, 64);
  reflectors.name = 'Road reflectors';reflectors.frustumCulled = false;reflectors.count = 0;
  group.add(reflectors);
  const authored = (course.def.nightWindows || []).filter(p => [p.x, p.y, p.z].every(Number.isFinite));
  let town;
  if (authored.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(authored.flatMap(p => [p.x, p.y, p.z]), 3));
    const material = new THREE.PointsMaterial({color: 0xffc887, size: 1.15, sizeAttenuation: true,
      transparent: true, opacity: 0, depthWrite: false, toneMapped: false});
    town = new THREE.Points(geometry, material);town.name = 'Distant town windows';group.add(town);
  }
  // Native fixture proportions in four bounded batches; no additional real light.
  const poleGeometry = new THREE.CylinderGeometry(.12, .2, 11, 9);
  const armGeometry = new THREE.BoxGeometry(6, .16, .18);
  const supportMaterial = new THREE.MeshStandardMaterial({color: 0x596775, roughness: .78, metalness: .65});
  const lampPoles = new THREE.InstancedMesh(poleGeometry, supportMaterial, 32);
  const lampArms = new THREE.InstancedMesh(armGeometry, supportMaterial, 32);
  lampPoles.name = 'Night streetlamp poles';lampArms.name = 'Night streetlamp arms';
  lampPoles.count = lampArms.count = 0;lampPoles.frustumCulled = lampArms.frustumCulled = false;
  const lampGeometry = new THREE.BoxGeometry(1.15, .12, .65);
  const lampMaterial = new THREE.MeshBasicMaterial({color: 0xffd296, transparent: true, opacity: 0});
  const lampHeads = new THREE.InstancedMesh(lampGeometry, lampMaterial, 32);
  lampHeads.name = 'Night streetlamp heads';lampHeads.count = 0;lampHeads.frustumCulled = false;
  const poolGeometry = new THREE.PlaneGeometry(10, 22);poolGeometry.rotateX(-Math.PI / 2);
  const poolMaterial = new THREE.ShaderMaterial({transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: {night: interiorNight},
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;
      gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float night;void main(){
      float radius=length((vUv-.5)*2.);
      float softness=pow(max(0.,1.-radius),2.);
      gl_FragColor=vec4(1.,.67,.32,softness*night*.19);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const lampPools = new THREE.InstancedMesh(poolGeometry, poolMaterial, 32);
  lampPools.name = 'Night streetlamp road pools';lampPools.count = 0;lampPools.frustumCulled = false;
  lampHeads.userData.excludeAmbientOcclusion = lampPools.userData.excludeAmbientOcclusion = true;
  // A circuit with its own street light (`streetLight`, src/night-glows.js) draws pools that follow the road's bends and climbs,
  // so these flat ones, which cut into the road on a bend, are left out.
  if (course.def.streetLight) lampPools.visible = false;
  group.add(lampPoles, lampArms, lampHeads, lampPools);
  world.add(group);
  const object = new THREE.Object3D();
  let stopped = false, lastBucket = NaN, lastCount = 0, lastLampBucket = NaN;
  function restore() {
    if (stopped) return;
    for (const binding of bindings) binding.mesh.material = binding.source;
    group.visible = false;
  }
  return {
    group,
    update({amount = 0, headlights = 0, position, heading = 0, distance = 0, high = true}) {
      if (stopped) return;
      const night = THREE.MathUtils.clamp(amount, 0, 1);
      for (const binding of bindings) binding.mesh.material = binding.marking && night === 0 ? binding.source : binding.material;
      for (const material of markingMaterials) material.emissiveIntensity = night * .18;
      interiorNight.value = night * 1.4;
      for (const material of windowMaterials) material.emissiveIntensity = night * 1.4;
      eye.value.set(position.x, position.y + .75, position.z);
      direction.value.set(Math.sin(heading), 0, Math.cos(heading));strength.value = headlights;
      group.visible = night > 0 || headlights > 0;
      if (town) town.material.opacity = night;
      lampMaterial.opacity = night;
      const pairs = high ? 32 : 20, bucket = Math.floor(distance / 6);
      if (bucket !== lastBucket || pairs !== lastCount) {
        lastBucket = bucket;lastCount = pairs;
        let count = 0;
        for (let i = 0; i < pairs; i++) {
          const s = (bucket + i - 3) * 6;
          if (course.closed === false && (s < 0 || s > course.length)) continue;
          const width = (course.roadHalfWidthAt?.(s) || 7) - .75;
          for (const side of [-1, 1]) {
            const p = course.groundAt(s, side * width);
            object.position.set(p.x, p.y + .07, p.z);object.rotation.set(0, p.heading || 0, 0);object.updateMatrix();
            reflectors.setMatrixAt(count++, object.matrix);
          }
        }
        reflectors.count = count;reflectors.instanceMatrix.needsUpdate = true;
      }
      const lampBucket = Math.floor(distance / 40);
      if (lampBucket !== lastLampBucket) {
        lastLampBucket = lampBucket;
        let lamps = 0;
        for (let i = 0; i < 16; i++) {
          const s = (lampBucket + i - 3) * 40;
          if (course.closed === false && (s < 0 || s > course.length)) continue;
          if ((course.themeAt?.(s) || course.def.theme) !== 'city') continue;
          const width = course.roadHalfWidthAt?.(s) || 7;
          for (const side of [-1, 1]) {
            const base = course.groundAt(s, side * (width + 3.4)), angle = base.heading || 0;
            object.rotation.set(0, angle, 0);object.position.set(base.x, base.y + 5.5, base.z);object.updateMatrix();
            lampPoles.setMatrixAt(lamps, object.matrix);
            object.position.set(base.x - side * Math.cos(angle) * 3, base.y + 10.5, base.z + side * Math.sin(angle) * 3);
            object.updateMatrix();lampArms.setMatrixAt(lamps, object.matrix);
            const head = course.groundAt(s, side * (width - 2));
            object.position.set(head.x, base.y + 10.35, head.z);object.updateMatrix();lampHeads.setMatrixAt(lamps, object.matrix);
            const offset = side * Math.max(1, width - 3.3), ground = course.groundAt(s, offset);
            const ahead = course.groundAt(s + 1, offset), behind = course.groundAt(s - 1, offset);
            const pitch = -Math.atan2(ahead.y - behind.y, Math.hypot(ahead.x - behind.x, ahead.z - behind.z));
            object.rotation.set(pitch, angle, 0, 'YXZ');object.position.set(ground.x, ground.y + .08, ground.z);
            object.updateMatrix();lampPools.setMatrixAt(lamps++, object.matrix);
          }
        }
        for (const batch of [lampPoles, lampArms, lampHeads, lampPools]) {
          batch.count = lamps;batch.instanceMatrix.needsUpdate = true;
        }
      }
    },
    restore,
    dispose() {
      if (stopped) return;
      restore();stopped = true;world.remove(group);
      reflectorGeometry.dispose();reflectorMaterial.dispose();
      lampGeometry.dispose();lampMaterial.dispose();poolGeometry.dispose();poolMaterial.dispose();
      poleGeometry.dispose();armGeometry.dispose();supportMaterial.dispose();
      town?.geometry.dispose();town?.material.dispose();
      for (const material of materials.values()) material.dispose();
      bindings.length = 0;materials.clear();windowMaterials.clear();markingMaterials.clear();
    },
  };
}
