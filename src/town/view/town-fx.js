// TOWN-VIEW-LIFE: smoke, fire, dust, reeds and the moving parts of the town's buildings.
//
// Drawn in code, as Kyle asked on 11 November (docs/ART_LINE.md): no model files for
// fire, smoke, dust or light. Fire is the helicopter's fire look: its sprite layer
// and its fire atlas (src/heli/heli-fire-view.js). Drawing only: the town is read and
// never written, and nothing here draws from the town's random stream.
import * as THREE from 'three';
import {spriteLayer, FIRE_FX_URL, FIRE_FX_TABLE_URL} from '../../heli/heli-fire-view.js';
import {TOWN_CELL_METRES} from '../town-world-data.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {TOWN_CAMP, townLifeHash, townLifePlaces, townLifeSignature} from './town-walkers.js';

// Sprites at most, for flames and embers (glow) and for smoke, steam and dust (cover).
export const TOWN_FX_LIMITS = Object.freeze({glow:220, cover:420, smokeSources:90, reedBeds:12});
// The sound cues a player hears for what this draws (the view names them; the town's audio plays them).
export const TOWN_FX_SOUNDS = Object.freeze({fire:'town.fire', crowd:'town.crowd'});
// Dust days close the air in to the colour of the ground (Scablands dirt, src/world/ground-view.js).
const DUST_COLOUR = new THREE.Color(0xa58a62);
const CELL = TOWN_CELL_METRES;
const plainName = name => String(name ?? '').replace(/[\s_.:/[\]]/g, '').toLowerCase();

const defaultLoad = {
  texture:url => new THREE.TextureLoader().loadAsync(url),
  table:url => fetch(url).then(response => response.json()),
};

/** The day's wind: the direction it blows toward (x, z) and its speed in metres a second. */
export function townWind(town) {
  const weather = town?.weather ?? {};
  // The weather's direction is the way the wind blows toward, 0 degrees along +x (as town-fire.js spreads it).
  const angle = (Number.isFinite(weather.windDirection) ? weather.windDirection : 45) * Math.PI / 180;
  const speed = (Number.isFinite(weather.windSpeedKph) ? weather.windSpeedKph : 14) / 3.6;
  return {x:Math.cos(angle), z:Math.sin(angle), speed};
}

/** Everything burning now: buildings with a fire stage, and home plots on fire. */
export function townFireSources(town) {
  const fires = [];
  for (const building of town?.buildings ?? []) {
    if (!building?.fireStage || (building.regionId ?? 'scablands') !== 'scablands') continue;
    const width = building.width || 1, depth = building.depth || 1;
    fires.push({id:building.id, x:(building.x + width / 2) * CELL, z:(building.z + depth / 2) * CELL, halfX:width * CELL / 2,
      halfZ:depth * CELL / 2, heat:Math.min(1, .35 + .2 * building.fireStage)});
  }
  for (const plot of town?.homePlots ?? []) if (plot?.burning && (plot.regionId ?? 'scablands') === 'scablands')
    fires.push({id:plot.id, x:(plot.x + .5) * CELL, z:(plot.z + .5) * CELL, halfX:CELL / 2, halfZ:CELL / 2, heat:.85});
  return fires;
}

/**
 * How full the town's water towers look, 0 to 1. From the day's water against demand (TOWN-PIPES' result); a tower
 * fills overnight and is drawn down at the morning and evening peaks, when most people fetch water.
 */
export function townWaterLevel(town, hour = Number(town?.calendar?.hour ?? 12)) {
  const result = town?.utilities?.waterResult;
  const supply = result && Number(result.demand) > 0 ? Math.min(1.2, Number(result.delivered) / Number(result.demand)) : result ? 1 : .7;
  const peak = Math.exp(-(((hour - 7) / 1.6) ** 2)) + .8 * Math.exp(-(((hour - 18.5) / 1.8) ** 2));
  return Math.max(0, Math.min(1, .15 + .8 * supply - .35 * peak));
}

/** Chimney smoke: kitchens, kilns, forges, generators and the bathhouse while they work; the camp fire at dawn and dusk. */
export function townWorkSmoke(town, places, hour, camping = (town?.people ?? []).some(person => String(person?.homeType ?? 'Canvas').toLowerCase().includes('canvas'))) {
  const sources = [];
  const working = hour >= 6 && hour < 19;
  for (const place of places.smokers) {
    const id = place.buildingId;
    const kitchen = id === 'soup-kitchen', lit = kitchen ? hour >= 6 && hour < 9 || hour >= 11 && hour < 13 || hour >= 17 && hour < 20 : working;
    if (!lit) continue;
    const height = {kiln:8.5, forge:7, 'soup-kitchen':5, generator:3.2, bathhouse:5}[id] ?? 5;
    sources.push({id:place.id, x:place.x + place.halfX * .45, z:place.z + place.halfZ * .3, height,
      kind:id === 'generator' ? 'exhaust' : id === 'kiln' || id === 'forge' ? 'dark' : 'pale'});
  }
  if (camping && (hour >= 18 || hour < 7)) sources.push({id:'camp', x:TOWN_CAMP.x, z:TOWN_CAMP.z, height:.4, kind:'camp'});
  return sources;
}

function reedGeometry() {
  // One tuft: seven thin tapering blades leaning out a little, darker at the root, straw at the tip.
  const positions = [], colours = [], root = new THREE.Color(0x3f4424), tip = new THREE.Color(0xa39a5c);
  for (let blade = 0; blade < 7; blade++) {
    const angle = blade / 7 * Math.PI * 2 + blade * .7, lean = .12 + (blade % 3) * .08, height = .75 + (blade % 4) * .09;
    const ox = Math.cos(angle) * .08, oz = Math.sin(angle) * .08, side = .035, sx = -Math.sin(angle) * side, sz = Math.cos(angle) * side;
    const tx = ox + Math.cos(angle) * lean, tz = oz + Math.sin(angle) * lean;
    positions.push(ox - sx, 0, oz - sz, ox + sx, 0, oz + sz, tx, height, tz);
    for (const colour of [root, root, tip]) colours.push(colour.r, colour.g, colour.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function reedMaterial(uniforms) {
  const material = new THREE.MeshStandardMaterial({vertexColors:true, roughness:1, side:THREE.DoubleSide});
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime; shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader = 'uniform float uTime;\nuniform vec2 uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 reedRoot = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float reedGust = sin(uTime * 1.6 + reedRoot.x * .31 + reedRoot.z * .23) * .5 + sin(uTime * 2.7 + reedRoot.z * .5) * .25;
      float reedBend = position.y * position.y;
      transformed.x += (uWind.x * (.35 + reedGust * .3) + reedGust * .08) * reedBend;
      transformed.z += (uWind.y * (.35 + reedGust * .3) + reedGust * .05) * reedBend;`);
  };
  material.customProgramCacheKey = () => 'town-reeds';
  return material;
}

/**
 * Smoke, fire, dust, reeds and moving parts. `buildings` is the group the scene draws buildings in (its named parts
 * turn); `scene` lends its fog for dust days when `fog` is true. Call `update` each frame with the camera's ground point.
 */
export function createTownFx({town, scene = null, buildings = null, fog = true, light = true, load = defaultLoad, groundAt = scablandsSurfaceHeightAt,
  hourAt = () => Number(town?.calendar?.hour ?? 12), seed = 1} = {}) {
  if (!town || typeof town !== 'object') throw new TypeError('Choose a town to draw its smoke and fire.');
  const group = new THREE.Group(); group.name = 'Town smoke, fire and dust';
  const glow = spriteLayer(THREE, TOWN_FX_LIMITS.glow, THREE.AdditiveBlending);
  const cover = spriteLayer(THREE, TOWN_FX_LIMITS.cover, THREE.NormalBlending, [6, 22]);
  cover.points.renderOrder = 2; glow.points.renderOrder = 3; cover.points.name = 'Town smoke and dust'; glow.points.name = 'Town flames';
  group.add(cover.points, glow.points);
  // A light at the nearest fire. Only where the scene is new: adding a light to a scene already drawn recompiles all of it.
  const fireLight = new THREE.PointLight(0xff7a2e, 0, 55, 1.6); fireLight.name = 'Town fire light';
  if (light) group.add(fireLight);
  const reedUniforms = {uTime:{value:0}, uWind:{value:new THREE.Vector2()}};
  const reeds = new THREE.Group(); reeds.name = 'Town reeds'; group.add(reeds);
  const reedTuft = reedGeometry(), reedLook = reedMaterial(reedUniforms);
  // The ground's height on a 2 m grid, kept for 20 seconds at a time: working it out is costly.
  const heights = new Map();
  let heightsAge = 0;
  const ground = (x, z) => {
    const gx = Math.round(x / 2) * 2, gz = Math.round(z / 2) * 2, key = gx * 100003 + gz;
    let y = heights.get(key);
    if (y === undefined) {
      try { y = groundAt(gx, gz); } catch { y = 0; }
      if (!Number.isFinite(y)) y = 0;
      if (heights.size > 20000) heights.clear();
      heights.set(key, y);
    }
    return y;
  };
  const art = {status:'idle', rects:null};
  const state = {time:0, places:townLifePlaces(town), signature:townLifeSignature(town), fires:new Map(), cooled:new Map(), dust:0,
    fogBase:null, backgroundBase:null, parts:{rotors:[], flywheels:[], gauges:[], chimneys:[]}, partsKey:'', reedKey:'', level:0, disposed:false};
  const ensureArt = () => {
    if (art.status !== 'idle') return;
    art.status = 'loading';
    Promise.all([load.texture(FIRE_FX_URL), load.table(FIRE_FX_TABLE_URL)]).then(([texture, table]) => {
      if (state.disposed) { texture.dispose?.(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      glow.material.uniforms.atlas.value = cover.material.uniforms.atlas.value = texture;
      art.rects = Object.fromEntries(Object.entries(table.frames).map(([kind, frames]) =>
        [kind, frames.map(frame => [frame.x / table.size, frame.y / table.size, frame.w / table.size, frame.h / table.size])]));
      art.status = 'ready';
    }).catch(() => { art.status = 'error'; });
  };

  // Named parts in the building models turn, and the town's homes give their roofs' tops for chimney smoke.
  const scanParts = () => {
    if (!buildings) return;
    let key = `${buildings.children.length}`;
    for (const child of buildings.children) key += `${child.id}:${child.children.length},`;
    if (key === state.partsKey) return;
    state.partsKey = key;
    const parts = {rotors:[], flywheels:[], gauges:[], chimneys:[]}, box = new THREE.Box3();
    buildings.updateMatrixWorld(true);
    buildings.traverse(object => {
      const name = plainName(object.name);
      if (/windmill-?rotor$/.test(name)) parts.rotors.push(object);
      else if (/pump-house-?flywheel$/.test(name)) parts.flywheels.push(object);
      else if (/water-tower-?fill-(\d)$/.test(name)) parts.gauges.push({object, step:Number(name.match(/fill-(\d)$/)[1])});
      else if (/^(shack|stack|block|terrace)-[a-z]$/.test(name)) {
        box.setFromObject(object);
        if (!box.isEmpty()) parts.chimneys.push({x:box.max.x - (box.max.x - box.min.x) * .25, y:box.max.y, z:box.min.z + (box.max.z - box.min.z) * .3,
          id:`${Math.round(box.min.x)}:${Math.round(box.min.z)}`, tall:box.max.y - box.min.y});
      }
    });
    state.parts = parts;
  };

  const rebuildReeds = focus => {
    const near = state.places.reedBeds.filter(bed => Math.hypot(bed.x - focus.x, bed.z - focus.z) < 500).slice(0, TOWN_FX_LIMITS.reedBeds);
    const key = near.map(bed => bed.id).join(',');
    if (key === state.reedKey) return;
    state.reedKey = key;
    for (const child of [...reeds.children]) { reeds.remove(child); child.dispose(); }
    const pose = new THREE.Object3D();
    for (const bed of near) {
      const spots = [];
      for (let x = -bed.halfX + 1.2; x < bed.halfX - 1; x += 1.25) for (let z = -bed.halfZ + 1.2; z < bed.halfZ - 1; z += 1.25) spots.push([x, z]);
      const mesh = new THREE.InstancedMesh(reedTuft, reedLook, spots.length);
      mesh.name = `Reeds ${bed.id}`; mesh.frustumCulled = false;
      spots.forEach(([dx, dz], index) => {
        const u = townLifeHash(seed, `${bed.id}:${index}`), v = townLifeHash(seed + 1, `${bed.id}:${index}`);
        const x = bed.x + dx + (u - .5) * .9, z = bed.z + dz + (v - .5) * .9;
        pose.position.set(x, ground(x, z), z); pose.rotation.set(0, u * Math.PI * 2, 0); pose.scale.set(1.6 + v, 1.7 + u * 1.1, 1.6 + v);
        pose.updateMatrix(); mesh.setMatrixAt(index, pose.matrix);
      });
      reeds.add(mesh);
    }
  };

  const puff = (layer, x, y, z, size, rect, alpha, r, g, b) => rect && layer.add(x, y, z, size, rect, alpha, r, g, b);

  const drawFires = (fires, wind, focus) => {
    const r = art.rects;
    let nearest = null, nearestDistance = Infinity;
    // Hottest first, so a cap trims the faint edge of a big fire and not its heart.
    const sorted = [...fires].sort((a, b) => b.heat - a.heat || String(a.id).localeCompare(String(b.id)));
    for (const fire of sorted) {
      const y = ground(fire.x, fire.z), cells = Math.max(1, Math.round(fire.halfX * fire.halfZ * 4 / (CELL * CELL)));
      const distance = Math.hypot(fire.x - focus.x, fire.z - focus.z);
      if (distance < nearestDistance) { nearest = {...fire, y}; nearestDistance = distance; }
      const tongues = Math.min(10, 3 + cells * 2);
      for (let k = 0; k < tongues; k++) {
        const u = townLifeHash(seed, `${fire.id}:f${k}`), v = townLifeHash(seed + 3, `${fire.id}:f${k}`);
        const frame = r.flame[Math.floor(state.time * 9 + u * 6) % r.flame.length], size = 3.5 + 5 * fire.heat * (.7 + .3 * v);
        puff(glow, fire.x + (u - .5) * fire.halfX * 1.6, y + 1.6 + 3 * fire.heat * v, fire.z + (v - .5) * fire.halfZ * 1.6, size, frame, .7 + .3 * fire.heat, 1, .82 + .1 * v, .6);
      }
      for (let k = 0; k < 3; k++) {
        const u = townLifeHash(seed, `${fire.id}:e${k}`), rise = (state.time * 2.6 + u * 9) % 9;
        puff(glow, fire.x + (u - .5) * 6 + wind.x * wind.speed * rise * .3, y + 4 + rise * 1.8, fire.z + (townLifeHash(seed, `${fire.id}:e${k}z`) - .5) * 6 + wind.z * wind.speed * rise * .3,
          .7, r.ember[0], 1 - rise / 9, 1, .7, .35);
      }
      // Smoke: thick and grey-brown at the base, paler as it rises and leans downwind.
      for (let k = 0; k < 5; k++) {
        const u = townLifeHash(seed, `${fire.id}:s${k}`), cycle = 10, age = (state.time + u * cycle) % cycle, share = age / cycle;
        const shade = .32 + .3 * share;
        puff(cover, fire.x + wind.x * wind.speed * age * .7 + (u - .5) * 5, y + 6 + age * 3.4, fire.z + wind.z * wind.speed * age * .7 + (townLifeHash(seed, `${fire.id}:s${k}z`) - .5) * 5,
          8 + share * 26, r.smoke[Math.floor(u * r.smoke.length)], (.85 - share * .6) * (.55 + fire.heat * .45), shade, shade * .96, shade * .9);
      }
    }
    // One light at the fire nearest the camera, flickering as the flames do.
    if (nearest) {
      const flicker = .8 + .2 * Math.sin(state.time * 13.1) * Math.sin(state.time * 7.7 + 1.3);
      fireLight.position.set(nearest.x, nearest.y + 4, nearest.z); fireLight.intensity = 260 * nearest.heat * flicker;
    } else fireLight.intensity = 0;
  };

  const drawCooled = wind => {
    const r = art.rects;
    for (const [id, cooled] of state.cooled) {
      const age = state.time - cooled.at;
      if (age > 45) { state.cooled.delete(id); continue; }
      // Steam for a few seconds after the water reaches it, then a thin smoulder.
      if (age < 6) for (let k = 0; k < 3; k++)
        puff(cover, cooled.x + (townLifeHash(seed, `${id}:st${k}`) - .5) * 6, cooled.y + 2 + age * 2.4 + k, cooled.z + (townLifeHash(seed, `${id}:sz${k}`) - .5) * 6,
          6 + age * 3, r.steam[Math.floor(age * 2 + k) % r.steam.length], .6 * (1 - age / 6), .95, .97, 1);
      else {
        const cycle = 8, u = townLifeHash(seed, `${id}:sm`), older = (state.time + u * cycle) % cycle;
        puff(cover, cooled.x + wind.x * wind.speed * older * .5, cooled.y + 1.5 + older * 1.6, cooled.z + wind.z * wind.speed * older * .5,
          3 + older * 2, r.smoke[2 % r.smoke.length], .45 * (1 - (age - 6) / 39) * (1 - older / cycle), .5, .48, .45);
      }
    }
  };

  const drawSmoke = (sources, wind, focus) => {
    const r = art.rects;
    const near = sources.map(source => ({source, distance:Math.hypot(source.x - focus.x, source.z - focus.z)}))
      .sort((a, b) => a.distance - b.distance).slice(0, TOWN_FX_LIMITS.smokeSources);
    for (const {source, distance} of near) {
      if (source.kind === 'camp') {
        const y = ground(source.x, source.z);
        for (let k = 0; k < 3; k++) {
          const u = townLifeHash(seed, `camp:${k}`);
          puff(glow, source.x + (u - .5) * .8, y + .5 + u * .4, source.z + (townLifeHash(seed, `campz:${k}`) - .5) * .8, 1.2 + u * .6,
            r.flame[Math.floor(state.time * 9 + u * 6) % r.flame.length], .9, 1, .8, .55);
        }
      }
      const puffs = distance < 160 ? 4 : 2, base = source.y ?? ground(source.x, source.z) + source.height;
      const tint = source.kind === 'dark' ? [.24, .22, .2] : source.kind === 'exhaust' ? [.2, .2, .2] : [.58, .56, .53];
      for (let k = 0; k < puffs; k++) {
        const u = townLifeHash(seed, `${source.id}:${k}`), cycle = 7, age = (state.time + u * cycle) % cycle, share = age / cycle;
        const lean = wind.speed * age * .55, shade = 1 + share * .5;
        puff(cover, source.x + wind.x * lean + (u - .5) * .5, base + .4 + age * 1.1, source.z + wind.z * lean + (u - .5) * .5,
          1.6 + share * 6, r.smoke[Math.floor(u * r.smoke.length)], (source.kind === 'exhaust' ? .35 : .6) * (1 - share) ** 1.3,
          tint[0] * shade, tint[1] * shade, tint[2] * shade);
      }
    }
  };

  const drawDust = (wind, focus, distance) => {
    const r = art.rects;
    if (state.dust < .02) return;
    const reach = Math.max(70, distance * 1.15), count = Math.round(70 * state.dust);
    for (let k = 0; k < count; k++) {
      const u = townLifeHash(seed, `dust:${k}`), v = townLifeHash(seed + 5, `dust:${k}`), cycle = 14 + u * 8;
      const age = (state.time + v * cycle) % cycle, share = age / cycle;
      // Each cloud is blown across a square round the camera and comes round again: nothing is kept between frames.
      const travel = (share - .5) * reach * 2;
      const x = focus.x + (u - .5) * reach * 2 + wind.x * travel, z = focus.z + (v - .5) * reach * 2 + wind.z * travel;
      const size = 14 + u * 26, alpha = .3 * state.dust * Math.sin(Math.PI * share);
      puff(cover, x, ground(x, z) + 1.5 + v * 5, z, size, r.smoke[Math.floor(v * r.smoke.length)], alpha, .86, .72, .52);
    }
  };

  const turnParts = (wind, hour, dt) => {
    // A farm windmill turns with its blade tips at about the wind's own speed; its rotor is 1.7 m across the blade.
    for (const rotor of state.parts.rotors) rotor.rotation.z -= wind.speed / 1.7 * dt;
    // The pump house's flywheel turns while it pumps, at about 30 turns a minute.
    const pumping = hour >= 5 && hour < 22;
    for (const flywheel of state.parts.flywheels) if (pumping) flywheel.rotation.y += Math.PI * dt;
    state.level = townWaterLevel(town, hour);
    for (const gauge of state.parts.gauges) gauge.object.visible = state.level >= [0, .2, .5, .8][gauge.step];
  };

  const homeSmoke = hour => {
    const cold = town?.weather?.coldNight || town?.calendar?.season === 'Winter';
    const lit = cold || hour >= 6 && hour < 9 || hour >= 17 && hour < 22;
    if (!lit) return [];
    return state.parts.chimneys.map(chimney => ({id:`home:${chimney.id}`, x:chimney.x, z:chimney.z, y:chimney.y, kind:'pale'}));
  };

  return {
    group,
    state,
    update({dt = 1 / 60, focus = {x:0, z:0}, distance = 90} = {}) {
      if (state.disposed) return;
      state.time += dt;
      heightsAge += dt;
      if (heightsAge > 20) { heightsAge = 0; heights.clear(); }
      // The town is read twice a second: its places, its fires and whether anyone still camps.
      state.readAge = (state.readAge ?? Infinity) + dt;
      if (state.readAge > .5) {
        state.readAge = 0;
        const signature = townLifeSignature(town);
        if (signature !== state.signature) { state.signature = signature; state.places = townLifePlaces(town); }
        state.burning = townFireSources(town);
        state.camping = (town?.people ?? []).some(person => String(person?.homeType ?? 'Canvas').toLowerCase().includes('canvas'));
      }
      const hour = hourAt(), wind = townWind(town), fires = state.burning;
      scanParts();
      turnParts(wind, hour, dt);
      rebuildReeds(focus);
      reedUniforms.uTime.value = state.time;
      reedUniforms.uWind.value.set(wind.x * Math.min(1, wind.speed / 10), wind.z * Math.min(1, wind.speed / 10));
      // A fire that has gone out since the last frame steams, then smoulders.
      const now = new Set(fires.map(fire => fire.id));
      for (const [id, fire] of state.fires) if (!now.has(id)) state.cooled.set(id, {x:fire.x, y:ground(fire.x, fire.z), z:fire.z, at:state.time});
      state.fires = new Map(fires.map(fire => [fire.id, fire]));
      const dusty = town?.weather?.dust ? 1 : 0;
      state.dust += (dusty - state.dust) * Math.min(1, dt * .4);
      if (fog && scene?.fog) {
        state.fogBase ??= scene.fog.color.clone();
        state.backgroundBase ??= scene.background?.isColor ? scene.background.clone() : null;
        scene.fog.color.copy(state.fogBase).lerp(DUST_COLOUR, state.dust * .85);
        scene.fog.near *= 1 - .6 * state.dust; scene.fog.far *= 1 - .5 * state.dust;
        if (state.backgroundBase) scene.background.copy(state.backgroundBase).lerp(DUST_COLOUR, state.dust * .8);
      }
      glow.reset(); cover.reset();
      const smoke = [...townWorkSmoke(town, state.places, hour, state.camping), ...homeSmoke(hour)];
      if (fires.length || state.cooled.size || smoke.length || state.dust > .02) ensureArt();
      if (art.rects) {
        drawFires(fires, wind, focus);
        drawCooled(wind);
        drawSmoke(smoke, wind, focus);
        drawDust(wind, focus, distance);
      } else fireLight.intensity = 0;
      glow.finish(); cover.finish();
    },
    stats() {
      return {flames:glow.count, smoke:cover.count, reeds:reeds.children.reduce((sum, mesh) => sum + mesh.count, 0), rotors:state.parts.rotors.length,
        gauges:state.parts.gauges.length, chimneys:state.parts.chimneys.length, level:state.level, dust:state.dust, art:art.status, light:fireLight.intensity};
    },
    dispose() {
      state.disposed = true;
      group.removeFromParent();
      for (const child of [...reeds.children]) child.dispose();
      reedTuft.dispose(); reedLook.dispose();
      glow.points.geometry.dispose(); cover.points.geometry.dispose();
      glow.material.uniforms.atlas.value?.dispose?.(); glow.material.dispose(); cover.material.dispose();
      if (state.fogBase && scene?.fog) scene.fog.color.copy(state.fogBase);
      if (state.backgroundBase && scene?.background?.isColor) scene.background.copy(state.backgroundBase);
    },
  };
}
