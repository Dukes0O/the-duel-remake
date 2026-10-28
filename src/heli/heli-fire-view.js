// Drawing H2 Fire (docs/HELI_FIRE.md sections 6.1, 9 and 14): flames, smoke,
// embers, steam and spray from the fire atlas (FIRE-ART-FX), the water
// bucket on its cable, and the aim ring. Drawing only: it reads the
// session's view each frame and never changes it.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const FIRE_BUCKET_URL = '/assets/heli/fire-bucket.glb';
export const FIRE_FX_URL = '/assets/heli/fire-fx.png';
export const FIRE_FX_TABLE_URL = '/assets/heli/fire-fx.json';
// Sprites at most, by graphics quality (section 16).
export const FIRE_SPRITE_LIMITS = Object.freeze({high: 400, performance: 200});
// The bucket's body is 1.3 m tall, hanging 2.5 m of rigging below the ring.
const BODY = 1.3;

// A whole number from a cell, so each cell's flames sit and flicker the same way every frame.
const hash = (cell, k) => {
  let h = Math.imul((cell + 1) ^ 0x9e3779b9, 2654435761) ^ Math.imul(k + 7, 40503);
  h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

const VERTEX = `
attribute float size; attribute vec4 rect; attribute float alpha; attribute vec3 tint;
uniform float scale; uniform vec2 nearFade; varying vec4 vRect; varying float vAlpha; varying vec3 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(640.0, size * scale / max(1.0, -mv.z));
  // A sprite close to the camera fades out instead of filling the screen
  // with one square edge.
  float fade = nearFade.y > 0.0 ? smoothstep(nearFade.x, nearFade.y, -mv.z) : 1.0;
  vRect = rect; vAlpha = alpha * fade; vTint = tint;
}`;
const FRAGMENT = `
uniform sampler2D atlas; varying vec4 vRect; varying float vAlpha; varying vec3 vTint;
void main() {
  vec2 uv = vec2(vRect.x + gl_PointCoord.x * vRect.z, 1.0 - (vRect.y + gl_PointCoord.y * vRect.w));
  vec4 c = texture2D(atlas, uv);
  if (c.a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(c.rgb * vTint, c.a * vAlpha);
}`;

export function spriteLayer(THREE, capacity, blending, nearFade = [0, 0]) {
  const geometry = new THREE.BufferGeometry();
  const make = (name, size) => geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage));
  make('position', 3); make('size', 1); make('rect', 4); make('alpha', 1); make('tint', 3);
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({uniforms: {atlas: {value: null}, scale: {value: 900}, nearFade: {value: new THREE.Vector2(...nearFade)}}, vertexShader: VERTEX,
    fragmentShader: FRAGMENT, transparent: true, depthWrite: false, blending});
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const size = new THREE.Vector2();
  points.onBeforeRender = (renderer, _scene, camera) => {
    const height = renderer.getDrawingBufferSize?.(size).y ?? 900;
    material.uniforms.scale.value = camera.isPerspectiveCamera ? height / (2 * Math.tan(camera.fov * Math.PI / 360)) : height;
  };
  let count = 0;
  return {points, material, capacity,
    reset() { count = 0; },
    add(x, y, z, size, rect, alpha, r = 1, g = 1, b = 1) {
      if (count >= capacity || !rect) return false;
      const a = geometry.attributes;
      a.position.setXYZ(count, x, y, z); a.size.setX(count, size); a.rect.setXYZW(count, ...rect);
      a.alpha.setX(count, alpha); a.tint.setXYZ(count, r, g, b);
      count++;
      return true;
    },
    get count() { return count; },
    finish() {
      // Upload only what is drawn, and nothing when nothing was nor is.
      if (count === 0 && geometry.drawRange.count === 0) return;
      geometry.setDrawRange(0, count);
      for (const name of ['position', 'size', 'rect', 'alpha', 'tint']) {
        const attribute = geometry.attributes[name];
        attribute.clearUpdateRanges?.(); attribute.addUpdateRange?.(0, count * attribute.itemSize);
        attribute.needsUpdate = true;
      }
    }};
}

const defaultLoad = {
  model: url => new GLTFLoader().loadAsync(url).then(gltf => gltf.scene),
  texture: (THREE, url) => new THREE.TextureLoader().loadAsync(url),
  table: url => fetch(url).then(response => response.json()),
};

export function createFireView({THREE, scene, load = defaultLoad, quality = 'high'}) {
  const group = new THREE.Group();
  group.name = 'H2 Fire';
  scene.add(group);
  const limit = () => FIRE_SPRITE_LIMITS[quality] ?? FIRE_SPRITE_LIMITS.high;
  // Flames and embers glow (added light); smoke, steam and spray cover.
  const glow = spriteLayer(THREE, FIRE_SPRITE_LIMITS.high, THREE.AdditiveBlending);
  // Smoke and steam fade out within 40 m of the camera (the cable view flies through them).
  const cover = spriteLayer(THREE, FIRE_SPRITE_LIMITS.high, THREE.NormalBlending, [12, 40]);
  cover.points.renderOrder = 2; glow.points.renderOrder = 3;
  group.add(cover.points, glow.points);
  const art = {status: 'idle', rects: null, error: ''};
  const ensureArt = () => {
    if (art.status !== 'idle') return;
    art.status = 'loading';
    Promise.all([load.texture(THREE, FIRE_FX_URL), load.table(FIRE_FX_TABLE_URL)]).then(([texture, table]) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      glow.material.uniforms.atlas.value = cover.material.uniforms.atlas.value = texture;
      art.rects = Object.fromEntries(Object.entries(table.frames).map(([kind, frames]) =>
        [kind, frames.map(f => [f.x / table.size, f.y / table.size, f.w / table.size, f.h / table.size])]));
      art.status = 'ready';
    }).catch(error => { art.status = 'error'; art.error = String(error?.message || error); console.warn(`Fire art did not load: ${art.error}`); });
  };
  // The bucket: Claude's model (docs/board/looks/fire-bucket/), origin at its top ring.
  const bucket = {status: 'idle', root: null, body: null, dented: null, water: null, waterY: 0, error: ''};
  const ensureBucket = () => {
    if (bucket.status !== 'idle') return;
    bucket.status = 'loading';
    load.model(FIRE_BUCKET_URL).then(model => {
      model.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
      bucket.root = model; bucket.body = model.getObjectByName('bucket'); bucket.dented = model.getObjectByName('bucket_dented');
      bucket.water = model.getObjectByName('water');
      bucket.status = bucket.body && bucket.dented && bucket.water ? 'ready' : 'error';
      if (bucket.status === 'error') { bucket.error = 'The bucket model is missing a named node'; return; }
      bucket.waterY = bucket.water.position.y;
      group.add(model);
    }).catch(error => { bucket.status = 'error'; bucket.error = String(error?.message || error); console.warn(`The bucket did not load: ${bucket.error}`); });
  };
  const ring = new THREE.Mesh(new THREE.RingGeometry(11.5, 12, 72), new THREE.MeshBasicMaterial({color: 0xf4f1e8, transparent: true,
    opacity: .7, side: THREE.DoubleSide, depthWrite: false}));
  // Drawn over the ground, so a slope never buries half of it.
  ring.material.depthTest = false;
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 4; ring.visible = false;
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.6, 16), ring.material);
  dot.rotation.x = -Math.PI / 2; dot.visible = false;
  group.add(ring, dot);
  let time = 0;
  const cooled = new Map();
  let lastPercent = new Map();

  function drawFire(view, wind) {
    const fire = view.fire, here = fire && fire.courseId === view.courseId ? fire.burning ?? [] : [];
    const r = art.rects, max = limit();
    glow.reset(); cover.reset();
    if (!r) { glow.finish(); cover.finish(); return; }
    const wx = wind?.toward ? wind.toward.x * wind.speed : 0, wz = wind?.toward ? wind.toward.z * wind.speed : 0;
    // Hotter cells first, so the cap trims the faint edge, not the heart.
    const cells = [...here].sort((a, b) => b.percent - a.percent || a.cell - b.cell);
    const flamesPer = Math.max(1, Math.min(4, Math.floor(max * 0.55 / Math.max(1, cells.length))));
    const total = () => glow.count + cover.count;
    // Steam where water has just cooled a cell (a few seconds).
    const now = new Map(here.map(c => [c.cell, c.percent]));
    for (const [cell, before] of lastPercent) if ((now.get(cell) ?? 0) < before - 0.5) cooled.set(cell, time);
    lastPercent = now;
    for (const cell of cells) {
      const heat = cell.percent / 100, n = Math.max(1, Math.round(flamesPer * (0.4 + heat * 0.6)));
      for (let k = 0; k < n && total() < max; k++) {
        const u = hash(cell.cell, k), v = hash(cell.cell, k + 11);
        const frame = r.flame[Math.floor(time * 9 + u * 6) % r.flame.length];
        const size = 5 + 7 * heat * (0.7 + 0.3 * v);
        glow.add(cell.x + (u - .5) * 14, cell.y + 3 + 6 * heat * v, cell.z + (v - .5) * 14, size, frame, .65 + .35 * heat, 1, .82 + .1 * v, .6);
      }
      if (heat > .6 && total() < max) {
        const u = hash(cell.cell, 31), rise = (time * 3 + u * 9) % 9;
        glow.add(cell.x + (u - .5) * 10 + wx * rise * .3, cell.y + 6 + rise * 2.2, cell.z + (hash(cell.cell, 32) - .5) * 10 + wz * rise * .3,
          .9, r.ember[0], 1 - rise / 9, 1, .7, .35);
      }
    }
    // Smoke: thick and grey-brown at the base, paling to a light grey as it
    // rises and leans downwind, so it reads against the forest from above.
    for (const cell of cells) {
      for (let k = 0; k < 2 && total() < max; k++) {
        const u = hash(cell.cell, 50 + k), cycle = 9, age = (time + u * cycle) % cycle, share = age / cycle;
        const frame = r.smoke[Math.floor(u * r.smoke.length)];
        const shade = .42 + .3 * share;
        cover.add(cell.x + wx * age * .8 + (u - .5) * 8, cell.y + 10 + age * 5.5, cell.z + wz * age * .8 + (hash(cell.cell, 60 + k) - .5) * 8,
          14 + share * 34, frame, (.85 - share * .55) * (0.6 + cell.percent / 250), shade, shade * .96, shade * .9);
      }
    }
    for (const [cell, at] of cooled) {
      const age = time - at;
      if (age > 4) { cooled.delete(cell); continue; }
      const spot = here.find(c => c.cell === cell) ?? (fire?.burnt ?? []).find(c => c.cell === cell);
      if (!spot || total() >= max) continue;
      cover.add(spot.x, spot.y + 4 + age * 4, spot.z, 8 + age * 4, r.steam[Math.floor(age * 2) % r.steam.length], .55 * (1 - age / 4), .95, .97, 1);
    }
    // Falling water: spray, thinning as it falls.
    for (const p of view.bucket?.parcels ?? []) {
      if (total() >= max) break;
      cover.add(p.x, p.y, p.z, 3.5, r.spray[Math.floor(time * 6) % r.spray.length], .7, .85, .92, 1);
    }
    glow.finish(); cover.finish();
  }

  function drawBucket(view) {
    const b = view.bucket;
    if (!b) { if (bucket.root) bucket.root.visible = false; ring.visible = dot.visible = false; return; }
    ensureBucket();
    if (bucket.status === 'ready') {
      bucket.root.visible = true;
      bucket.root.position.set(b.x, b.y, b.z);
      bucket.root.rotation.set(0, b.heading || 0, 0);
      bucket.body.visible = b.damage === 0;
      bucket.dented.visible = b.damage > 0;
      const fill = b.holds > 0 ? Math.min(1, b.water / Math.max(600, b.holds)) : 0; // LAB-VIEW: a bigger bucket fills the bar; a smaller one reads as before
      bucket.water.visible = fill > .02;
      bucket.water.position.y = bucket.waterY - BODY * (1 - fill);
    }
    // The aim ring: white, orange when locked over a burning cell.
    ring.visible = dot.visible = !!b.aim;
    if (b.aim) {
      ring.position.set(b.aim.x, b.aim.y + .35, b.aim.z);
      dot.position.set(b.aim.x, b.aim.y + .4, b.aim.z);
      ring.material.color.setHex(b.aim.locked ? 0xff8a2a : 0xf4f1e8);
    }
  }

  return {
    group,
    update(view, {dt = 1 / 60, wind = null} = {}) {
      time += dt;
      if (!view?.heli || (!view.fire && !view.bucket)) { group.visible = false; return; }
      group.visible = true;
      if (view.fire || view.bucket) ensureArt();
      drawFire(view, wind ?? view.fire?.wind ?? null);
      drawBucket(view);
    },
    setQuality(next) { quality = next; },
    get spriteCount() { return glow.count + cover.count; },
    get spriteLimit() { return limit(); },
    get artStatus() { return art.status; },
    get bucketStatus() { return bucket.status; },
    // The cable's lower end with the bucket on: its top ring.
    cableEnd(view) { return view?.bucket ? {x: view.bucket.x, y: view.bucket.y, z: view.bucket.z} : null; },
    hide() { group.visible = false; },
    dispose() {
      scene.remove(group);
      group.traverse(object => { object.geometry?.dispose?.(); object.material?.dispose?.(); });
      glow.material.uniforms.atlas.value?.dispose?.();
    },
  };
}
