import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import { createSceneLighting } from '../src/scene-lighting.js';
import { createAmbientShading } from '../src/ambient-shading.js';
import { resolveLightingSettings } from '../src/lighting-moods.js';
import { disposeTree } from '../src/world.js';

let checks = 0;
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
const check = (value, label) => { assert.ok(value, label); checks++; };
const near = (a, b, label) => { check(Math.abs(a - b) < 1e-12, label); };
const vector = (a, b, label) => a.forEach((value, index) => near(value, b[index], label));
const countDisposals = resource => {
  let count = 0;
  // Light.dispose releases its shadow but, unlike materials, emits no event.
  if (resource.isLight) {
    const dispose = resource.dispose.bind(resource);
    resource.dispose = () => { count++; dispose(); };
  } else resource.addEventListener('dispose', () => count++);
  return () => count;
};
const originalLoader = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = () => new THREE.Texture();
function fixture({prefilterError}={}) {
  const scene = new THREE.Scene(), renderer = { toneMappingExposure: 1.05 };
  const bloom = { strength: .2 }, host = { dataset: {} }, targets = [], log = [];
  let loaded, failed, generatorCount=0;
  const lighting = createSceneLighting({ scene, renderer, bloom, host }, {
    createPMREM: () => {generatorCount++;return({
      fromScene(room, blur) { equal(blur, .04, 'studio blur unchanged'); log.push('studio'); return target(); },
      fromEquirectangular(texture) { log.push('hdr');if(prefilterError)throw prefilterError;return target(); },
      dispose() { log.push('pmrem-dispose'); },
    });},
    createRoom: () => ({ dispose() { log.push('room-dispose'); } }),
    loadEnvironment(success, failure) { loaded = success; failed = failure; },
  });
  function target() {
    const target = new THREE.WebGLRenderTarget(1, 1);
    target.disposals = countDisposals(target);
    targets.push(target);
    return target;
  }
  const sky = scene.getObjectByName('Atmosphere and cloud deck');
  const hemi = scene.children.find(object => object.isHemisphereLight);
  const headlights = scene.children.filter(object => object.isSpotLight && !object.name);
  return { lighting, scene, renderer, bloom, host, targets, log, sky, hemi, headlights,get generatorCount(){return generatorCount;},
    load(texture = new THREE.Texture()) { loaded(texture); return texture; }, fail: () => failed() };
}
const course = (theme = 'coast', timeOfDay = 'day', tunnel = false) => ({
  def: { theme, timeOfDay }, features: { poles: [] },
  themeAt: () => theme, tunnelAt: () => tunnel, worldAt: (s, off) => ({ x: off, y: 0, z: s }),
});

try {
  {
    const f = fixture(), { lighting, scene, sky, hemi, targets } = f, sun = lighting.sun;
    equal(f.log, ['studio', 'room-dispose'], 'room releases immediately while reusable prefilter resources await the HDR');
    equal(scene.environment, targets[0].texture, 'studio environment is available before the HDR');
    equal(scene.environmentIntensity, .82, 'initial reflection strength unchanged');
    equal(sun.shadow.mapSize.toArray(), [2048, 2048], 'shadow resolution unchanged');
    equal([sun.shadow.camera.left, sun.shadow.camera.right, sun.shadow.camera.top, sun.shadow.camera.bottom, sun.shadow.camera.near, sun.shadow.camera.far], [-45, 45, 45, -45, 1, 240]);
    equal([sun.shadow.bias, sun.shadow.normalBias], [-.00035, .03]);
    equal(f.headlights.length, 2, 'two fixed player headlights');
    equal(scene.children.filter(object => object.isLight).length, 10, 'global, street, pursuit and headlight pool size unchanged');
    for (const light of f.headlights) equal([light.distance, light.angle, light.penumbra, light.decay], [95, .43, .55, 1.2]);
    const graph = scene.children.map(object => object.uuid), material = sky.material, geometry = sky.geometry;
    for (const theme of ['coast', 'alpine', 'desert', 'city', 'arena']) {
      for (const mood of ['clear', 'golden', 'overcast']) {
        for (const tunnel of [false, true]) {
          const current = course(theme), night = theme === 'city';
          const expected = resolveLightingSettings(theme, { mood, night, tunnel });
          lighting.apply({ course: current, mood, tunnel });
          vector(scene.fog.color.toArray(), new THREE.Color(expected.fog).toArray(), 'fog colour unchanged');
          equal([scene.fog.near, scene.fog.far], [expected.fogNear, expected.fogFar], 'fog range unchanged');
          vector(sky.material.uniforms.top.value.toArray(), new THREE.Color(expected.top).toArray(), 'sky top unchanged');
          vector(sky.material.uniforms.horizon.value.toArray(), new THREE.Color(expected.horizon).toArray(), 'horizon unchanged');
          vector(sky.material.uniforms.cloudTint.value.toArray(), expected.cloudTint, 'cloud tint unchanged');
          vector(sun.color.toArray(), new THREE.Color(expected.sunColor).toArray(), 'sun colour unchanged');
          vector(hemi.groundColor.toArray(), new THREE.Color(expected.ground).toArray(), 'ground light unchanged');
          equal([sky.material.uniforms.sunStrength.value, sky.material.uniforms.cloudCover.value, hemi.intensity, sun.intensity, scene.environmentIntensity, f.renderer.toneMappingExposure, f.bloom.strength],
            [expected.sunStrength, expected.cloudCover, expected.hemi, expected.sun, expected.env, expected.exposure, expected.bloom], 'exact preset intensities');
          equal([f.host.dataset.theme, f.host.dataset.tunnel, f.host.dataset.lightingMood], [theme, String(tunnel), night ? 'night' : mood]);
          const camera = new THREE.PerspectiveCamera(); camera.position.set(10, 15, 20);
          const position = { x: 100, y: 7, z: 300 };
          lighting.followCamera(camera, position, 42);
          equal(sky.position.toArray(), [10, 15, 20], 'sky follows the camera');
          equal(sky.material.uniforms.cloudTime.value, 42, 'cloud clock is presentation seconds');
          vector(sun.position.toArray(), [100 + expected.sunOffset.x, 7 + expected.sunOffset.y, 300 + expected.sunOffset.z], 'shadow sun follows player with original offset');
          vector(sky.material.uniforms.sunDir.value.toArray(), new THREE.Vector3(expected.sunOffset.x, expected.sunOffset.y, expected.sunOffset.z).normalize().toArray(), 'visible sun and shadow use one direction');
          equal(sun.target.position.toArray(), [100, 7, 300]);
        }
      }
    }
    equal(scene.children.map(object => object.uuid), graph, 'mood changes reuse all scene objects');
    equal(sky.material, material); equal(sky.geometry, geometry);
    const current = course();
    lighting.apply({ course: current, mood: 'clear' });
    const before = { fog: scene.fog.near, sun: sun.intensity, exposure: f.renderer.toneMappingExposure };
    const expected = resolveLightingSettings('coast', { mood: 'golden' }), blend = .17;
    lighting.apply({ course: current, mood: 'golden', blend });
    near(scene.fog.near, THREE.MathUtils.lerp(before.fog, expected.fogNear, blend), 'fog easing unchanged');
    near(sun.intensity, THREE.MathUtils.lerp(before.sun, expected.sun, blend), 'sun easing unchanged');
    near(f.renderer.toneMappingExposure, THREE.MathUtils.lerp(before.exposure, expected.exposure, blend), 'exposure easing unchanged');
    const source = new THREE.Texture(), sourceDisposals = countDisposals(source);
    f.load(source);
    equal(f.generatorCount,1,'Studio and HDR reuse one prefilter generator');
    equal(f.log,['studio','room-dispose','hdr','pmrem-dispose'],'Prefilter scratch releases after the HDR finishes');
    equal(sourceDisposals(), 1, 'HDR source releases after prefiltering');
    equal(scene.environment, targets[1].texture, 'day scene receives HDR after loading');
    equal(f.host.dataset.environment, 'sunset-hdri');
    lighting.apply({ course: course('city'), mood: 'golden' });
    equal(scene.environment, targets[0].texture, 'night retains studio reflections');
    lighting.apply({ course: current, mood: 'clear' });
    equal(scene.environment, targets[1].texture, 'day restores loaded HDR without another load');
    const owned = [sky.geometry, sky.material, sky.material.uniforms.cloudDensity.value, ...scene.children.filter(object => object.isLight)];
    const disposals = owned.map(countDisposals), sceneCount = scene.children.length;
    lighting.stop();
    equal(scene.children.length, sceneCount, 'stop retains resources for pending GPU work');
    equal(targets.map(target => target.disposals()), [0, 0], 'stop does not release render targets');
    lighting.dispose(); lighting.dispose(); disposeTree(scene);
    equal(disposals.map(count => count()), owned.map(() => 1), 'all owned sky and light resources release exactly once');
    equal(targets.map(target => target.disposals()), [1, 1], 'both environment targets release once');
    equal(scene.children.length, 0, 'no light targets or detached sky survive cleanup');
    equal(scene.environment, null, 'scene no longer points at a disposed target');
  }
  for (const shutdown of ['stop', 'dispose']) {
    const f = fixture(), before = { ...f.host.dataset }, texture = new THREE.Texture(), count = countDisposals(texture);
    f.lighting[shutdown]();
    f.load(texture); f.fail();
    equal(count(), 1, 'late HDR source is discarded');
    equal(f.targets.length, 1, 'late completion cannot create a GPU target');
    equal(f.host.dataset, before, 'late callbacks cannot rewrite stale host state');
    f.lighting.dispose();
    equal(f.log.filter(item=>item==='pmrem-dispose').length,1,'Stopped or disposed prefilter releases once despite late callbacks');
  }
  {
    const f = fixture(); f.lighting.apply({ course: course('city') });
    const studio = f.scene.environment; f.load();
    equal(f.scene.environment, studio, 'HDR completing during city scene does not replace studio lighting');
    f.lighting.dispose();
  }
  {
    const f = fixture(); f.fail();
    equal(f.host.dataset.environment, 'studio-fallback', 'failed HDR keeps the original studio fallback');
    equal(f.targets.length, 1); f.lighting.dispose();
    equal(f.log.filter(item=>item==='pmrem-dispose').length,1,'Failed HDR releases the retained prefilter exactly once');
  }
  {
    const f=fixture({prefilterError:new Error('prefilter failed')}),texture=new THREE.Texture(),disposals=countDisposals(texture),studio=f.scene.environment;
    f.load(texture);
    equal(f.host.dataset.environment,'studio-fallback','A rejected prefilter keeps the usable studio fallback');
    equal(f.scene.environment,studio,'A prefilter failure cannot install an incomplete environment');
    equal(disposals(),1,'A prefilter failure releases the decoded HDR source');
    f.lighting.dispose();equal(f.log.filter(item=>item==='pmrem-dispose').length,1,'Prefilter failure and renderer disposal release scratch once');
  }
  {
    const f = fixture(), player = new THREE.Group(), police = new THREE.Group(), position = { x: 15, y: 6, z: 90 };
    player.rotation.y = .73; police.visible = false;
    for (const [theme, timeOfDay, tunnel, intensity] of [['coast', 'day', false, 0], ['city', 'day', false, 78], ['coast', 'night', false, 78], ['coast', 'day', true, 125]]) {
      for (const tall of [false, true]) {
        f.lighting.updateVehicles({ course: course(theme, timeOfDay, tunnel), position, player, police, distance: 90, tall, now: 520, high: true, menu: false });
        f.headlights.forEach((light, index) => {
          const side = index ? 1 : -1, c = Math.cos(.73), sn = Math.sin(.73);
          equal(light.intensity, intensity, 'headlight day/night/tunnel strength unchanged');
          vector(light.position.toArray(), [15 + c * side * .65 + sn * 1.8, 6 + (tall ? 2.2 : .72), 90 - sn * side * .65 + c * 1.8], 'headlight position matches vehicle type and heading');
          vector(light.target.position.toArray(), [15 + sn * 40, 5, 90 + c * 40], 'headlight aim unchanged');
        });
      }
    }
    f.lighting.dispose();
  }
  {
    const first = fixture(), second = fixture(), secondSkyDisposals = countDisposals(second.sky.material);
    first.lighting.dispose();
    equal(secondSkyDisposals(), 0, 'lighting instances do not share disposable sky resources');
    second.load(); second.lighting.apply({ course: course(), mood: 'golden' });
    equal(second.host.dataset.lightingMood, 'golden', 'remaining instance still works after another is disposed');
    second.lighting.dispose();
  }
  {
    // Run the installed PMREM generator with a no-draw renderer. This checks
    // its actual size-dependent resource reuse, not our test-double policy.
    const header=readFileSync(new URL('../public/assets/textures/sunset-lighting.hdr',import.meta.url)).subarray(0,200).toString('ascii');
    const dimensions=header.match(/-Y (\d+) \+X (\d+)/);
    equal(dimensions?.slice(1).map(Number),[512,1024],'Local HDR retains the same cube256 prefilter size as the studio');
    const renderer={target:null,autoClear:true,toneMapping:THREE.ACESFilmicToneMapping,xr:{enabled:false},compile(){},render(){},clear(){},
      getRenderTarget(){return this.target;},setRenderTarget(target){this.target=target;},getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,getClearColor:color=>color.set(0),setClearColor(){},getClearAlpha:()=>1};
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),studio=pmrem.fromScene(room,.04);
    const scratch=pmrem._pingPongRenderTarget,blur=pmrem._blurMaterial,planes=pmrem._lodPlanes;
    const source=new THREE.DataTexture(new Uint16Array(1024*512*4),1024,512,THREE.RGBAFormat,THREE.HalfFloatType);
    source.mapping=THREE.EquirectangularReflectionMapping;
    const natural=pmrem.fromEquirectangular(source),owned=[scratch,blur,...planes],disposals=owned.map(countDisposals);
    equal([studio.width,studio.height,natural.width,natural.height],[768,1024,768,1024],'Independent studio and HDR outputs keep identical dimensions');
    check(studio!==natural,'Studio and HDR reflection targets remain independent');
    equal(pmrem._pingPongRenderTarget,scratch,'HDR reuses the actual PMREM scratch target');
    equal(pmrem._blurMaterial,blur,'HDR reuses the actual blur shader material');
    equal(pmrem._lodPlanes,planes,'HDR reuses the actual LOD geometry array');
    equal(planes.length,11,'Full prefilter detail is retained');
    pmrem.dispose();equal(disposals.map(count=>count()),owned.map(()=>1),'One final release disposes all reused prefilter resources');
    studio.dispose();natural.dispose();source.dispose();room.dispose();
  }
  {
    const pass = createAmbientShading(new THREE.Scene(), new THREE.PerspectiveCamera());
    const materials = Object.entries(pass).filter(([, value]) => value?.isMaterial);
    const counts = materials.map(([, value]) => countDisposals(value));
    check(materials.some(([name]) => name === 'gtaoMaterial') && materials.some(([name]) => name === 'blendMaterial'), 'regression tracks both omitted Three GTAO materials');
    pass.dispose(); pass.dispose();
    equal(counts.map(count => count()), materials.map(() => 1), 'every GTAO shader material releases exactly once');
  }
} finally {
  THREE.TextureLoader.prototype.load = originalLoader;
}
console.log(`Scene lighting: ${checks} preset, transition, headlight, HDR lifecycle, ownership and GTAO disposal checks passed.`);
