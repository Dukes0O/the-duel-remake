// The Sirena story drawn (DEEP-SIRENA-VIEW; docs/THE_DEEP.md 6.2 to 6.8): the
// wreck and loose parts at their finds, the badge's glint, the yellow bags filling
// and rising with their part, the dark drop beyond the Drop-off lip, the sonar
// ring and blip, Ana's caption strip and phone, the sea-life card and the Coast
// Cup title card. Presentation only: it reads the Duel's events and
// deepStoryView(duel), and never writes race state, saves or random streams.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {deepStoryView} from './deep-story.js';
import {DEEP_PHONE_LINES} from './deep-phone-lines.js';
import {createDeepPhoneChain} from './deep-phone.js';
import {logCardMarkup} from './deep-log.js';
import {SOUND_BANK} from '../sound-bank.js';

export const SIRENA_MODEL = Object.freeze({'sirena-badge': 'badge', 'sirena-steering-wheel': 'steering-wheel',
  'sirena-wheel': 'wheel', 'sirena-bonnet': 'bonnet', 'sirena-door': 'door', 'sirena-car': 'wreck'});
const MODEL_URL = id => `/assets/models/sirena/${id}.glb`;
const defaultLoad = id => new GLTFLoader().loadAsync(MODEL_URL(id));
export const RISE_SPEED = Object.freeze({part: 2.4, car: 1.1});   // metres a second, to the surface
const SURFACE = -0.4;                                             // a raised piece is gone here (sea level is 0)

// Where each find rests: its spot, on the floor, `below` metres under it for the
// Sirena on her ledge. Yaw is fixed per find so a piece always lies the same way.
function restingPose(find, shape) {
  const y = shape.floorHeight(find.x, find.z) - (find.below ?? 0);
  let hash = 0;
  for (const c of find.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return {x: find.x, y, z: find.z, yaw: (hash % 628) / 100};
}

// The seaward side of the Drop-off: a dark wall of open water standing beyond the
// lip, so the sand beyond reads as a fall into deep blue. Its side follows the zone
// (kelp-coast.js: the sea lies in the ramp's forward direction).
export function dropCurtainPoints(zone, rampHeading, shape) {
  const place = zone.places?.find(row => row.id === 'drop-off');
  if (!place) return [];
  const trail = zone.trail, n = trail.length, fx = Math.sin(rampHeading), fz = Math.cos(rampHeading), out = [];
  for (let i = place.fromIndex; ; i = (i + 1) % n) {
    const a = trail[(i + n - 1) % n], b = trail[(i + 1) % n], p = trail[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1, tx = (b.x - a.x) / length, tz = (b.z - a.z) / length;
    const side = Math.sign(tz * fx - tx * fz) || 1, reach = p.width / 2 + 5;
    const x = p.x + tz * side * reach, z = p.z - tx * side * reach;
    out.push({x, z, floor: shape.floorHeight(x, z)});
    if (i === place.toIndex) break;
  }
  return out;
}
function createDropCurtain(points) {
  if (points.length < 2) return null;
  const position = [], colour = [], index = [], deep = new THREE.Color(0x020a12);
  points.forEach((p, i) => {
    // From well below the floor up to 16 m above it: opaque at the foot, clear at the top.
    position.push(p.x, p.floor - 30, p.z, p.x, p.floor + 16, p.z);
    colour.push(deep.r, deep.g, deep.b, 1, deep.r, deep.g, deep.b, 0);
    if (i) index.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colour, 4));
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Drop-off: open water';
  mesh.renderOrder = 2;
  return mesh;
}
// The badge's glint: a small soft star that flashes now and then.
function createGlint() {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas?.getContext) return null;
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d'), gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,240,1)'); gradient.addColorStop(.25, 'rgba(255,240,190,.55)'); gradient.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,240,.9)'; g.fillRect(31, 4, 2, 56); g.fillRect(4, 31, 56, 2);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(canvas), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false}));
  sprite.scale.setScalar(.9);
  return sprite;
}

// Hooked into the dive's private scene by createDeepView (deep-ui.js) through
// render3d. `deep` is the dive's underwater scene ({look, shape}).
export function createSirenaScene({scene, zone, deep, rampHeading = 0, load = defaultLoad}) {
  const group = new THREE.Group();
  group.name = 'The Sirena story';
  scene.add(group);
  const curtain = createDropCurtain(dropCurtainPoints(zone, rampHeading, deep.shape));
  if (curtain) group.add(curtain);
  const glint = createGlint();
  if (glint) { glint.visible = false; group.add(glint); }
  const sources = new Map(), pieces = new Map(), rising = [], bags = [];
  let disposed = false, bagSource = null, wanted = new Set();

  function source(id) {
    if (!sources.has(id)) sources.set(id, load(id).then(gltf => disposed ? null : gltf.scene).catch(() => null));
    return sources.get(id);
  }
  void source('lift-bag').then(model => { bagSource = model; });
  function wear(object) {
    object.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = o.receiveShadow = true; } });
    deep.look.applyTo(object, {key: 'sirena'});
    return object;
  }
  function piece(find) {
    if (pieces.has(find.id)) return pieces.get(find.id);
    const entry = {object: null, pose: restingPose(find, deep.shape)};
    pieces.set(find.id, entry);
    void source(SIRENA_MODEL[find.id]).then(model => {
      if (!model || disposed || !pieces.has(find.id)) return;
      entry.object = wear(model.clone(true));
      entry.object.position.set(entry.pose.x, entry.pose.y, entry.pose.z);
      entry.object.rotation.y = entry.pose.yaw;
      entry.object.visible = wanted.has(find.id);
      group.add(entry.object);
    });
    return entry;
  }
  // The bags for a lift: one for a part, four round the car; each fills (grows) as the lift runs.
  function setBags(count, around, fill) {
    while (bags.length < count && bagSource) { const bag = wear(bagSource.clone(true)); bags.push(bag); group.add(bag); }
    bags.forEach((bag, i) => {
      bag.visible = i < count;
      if (i >= count) return;
      const angle = count > 1 ? i / count * Math.PI * 2 + .6 : 0, spread = count > 1 ? 1.6 : 0;
      const grown = .25 + .75 * Math.min(1, fill);
      bag.scale.set(grown, grown, grown);
      bag.position.set(around.x + Math.sin(angle) * spread, around.y + .3, around.z + Math.cos(angle) * spread);
    });
  }

  return {
    group,
    update({duel, seconds = 0, dt = 0}) {
      if (disposed) return;
      const view = deepStoryView(duel);
      wanted = new Set(view?.finds.map(find => find.id) ?? []);
      for (const find of view?.finds ?? []) {
        const entry = piece(find);
        if (entry.object) entry.object.visible = true;
      }
      // A piece raised since the last frame starts its rise with its bags.
      for (const [id, entry] of pieces) {
        if (wanted.has(id) || entry.rising || !entry.object?.visible) continue;
        entry.rising = true;
        const count = id === 'sirena-car' ? 4 : id === 'sirena-badge' ? 0 : 1;
        const lift = [];
        for (let i = 0; i < count && bagSource; i++) {
          const bag = wear(bagSource.clone(true)), angle = count > 1 ? i / count * Math.PI * 2 + .6 : 0, spread = count > 1 ? 1.6 : 0;
          bag.position.set(Math.sin(angle) * spread, .3 + (count > 1 ? .8 : .45), Math.cos(angle) * spread);
          lift.push(bag);
        }
        const carrier = new THREE.Group();
        carrier.position.copy(entry.object.position);
        entry.object.position.set(0, 0, 0);
        carrier.add(entry.object, ...lift);
        group.add(carrier);
        rising.push({carrier, speed: id === 'sirena-car' ? RISE_SPEED.car : RISE_SPEED.part, badge: id === 'sirena-badge'});
      }
      for (const item of rising) {
        if (item.badge) { item.carrier.visible = false; continue; }   // the badge comes up in the hand, no bag
        item.carrier.position.y = Math.min(SURFACE, item.carrier.position.y + item.speed * Math.max(0, dt));
        item.carrier.visible = item.carrier.position.y < SURFACE - 1e-6;
      }
      // The lift under way.
      const lift = view?.lift, target = lift && view.finds.find(find => find.id === lift.find);
      if (target) setBags(lift.find === 'sirena-car' ? 4 : 1, pieces.get(lift.find)?.pose ?? restingPose(target, deep.shape), lift.elapsed / lift.seconds);
      else setBags(0);
      // The glint: a short flash every few seconds where the badge lies.
      const badge = view?.finds.find(find => find.id === 'sirena-badge');
      if (glint) {
        glint.visible = !!badge;
        if (badge) {
          const pose = pieces.get(badge.id)?.pose ?? restingPose(badge, deep.shape), beat = (seconds % 2.6) / 2.6;
          glint.position.set(pose.x, pose.y + .25, pose.z);
          glint.material.opacity = beat < .18 ? Math.sin(beat / .18 * Math.PI) : 0;
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse(o => {
        if (!o.isMesh && !o.isSprite) return;
        o.geometry?.dispose?.();
        for (const m of [].concat(o.material || [])) { m.map?.dispose?.(); m.dispose(); }
      });
      scene.remove(group);
      pieces.clear(); rising.length = 0; bags.length = 0;
    },
  };
}

// ---- Ana on the phone: one line at a time, in order, never over a title card ----------

export const PHONE_GAP = .6;   // seconds between lines
const captionSeconds = text => 1.5 + text.split(/\s+/).length * .38;   // when no sound plays

export function createAnaPhone({audio = null, now = () => performance.now() / 1000} = {}) {
  const queue = [], buffers = new Map();
  let current = null, nextAt = 0, chain = null, chainContext = null, disposed = false;
  const audible = () => !!audio?.context && audio.context.state === 'running' && !audio.muted && !audio.paused &&
    audio.flags?.enabled?.('the-deep') === true;
  async function buffer(id) {
    if (buffers.has(id)) return buffers.get(id);
    const ctx = audio.context;
    const loading = fetch('/assets/audio/' + SOUND_BANK[id].file).then(response => {
      if (!response.ok) throw Error('Ana line unavailable: ' + id);
      return response.arrayBuffer();
    }).then(bytes => ctx.decodeAudioData(bytes)).catch(() => null);
    buffers.set(id, loading);
    return loading;
  }
  function play(line) {
    if (!audible()) return;
    void buffer(line.id).then(data => {
      if (disposed || current !== line || !data || !audible()) return;
      const ctx = audio.context;
      if (chainContext !== ctx) { chain?.dispose(); chain = createDeepPhoneChain(ctx, audio.mixer?.output?.(line.id) ?? audio.master ?? ctx.destination); chainContext = ctx; }
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = data; gain.gain.value = SOUND_BANK[line.id].volume;
      source.connect(gain); gain.connect(chain.input);
      chain.keyOn(); source.start();
      audio.mixer?.duck?.('voice', data.duration + .6);
      line.until = now() + data.duration + .1;
      line.source = source;
      source.onended = () => { source.disconnect(); gain.disconnect(); if (current === line) { chain.keyOff(); current = null; nextAt = now() + PHONE_GAP; } };
    });
  }
  return {
    say(id) {
      if (disposed || !DEEP_PHONE_LINES[id] || current?.id === id || queue.includes(id)) return false;
      queue.push(id);
      return true;
    },
    // Each frame. `blocked` while a title card shows: a line waits until it has gone.
    update({blocked = false} = {}) {
      if (disposed) return null;
      const t = now();
      // A line ends at its caption time, or a second after its sound should have ended (a context that closed mid-line).
      if (current && t >= current.until + (current.source ? 1 : 0)) { if (current.source) chain?.keyOff(); current = null; nextAt = t + PHONE_GAP; }
      if (!current && !blocked && queue.length && t >= nextAt) {
        const id = queue.shift();
        current = {id, until: t + captionSeconds(DEEP_PHONE_LINES[id].text), source: null};
        play(current);
      }
      return current ? {id: current.id, text: DEEP_PHONE_LINES[current.id].text} : null;
    },
    // Lines not yet started are dropped; `keepCurrent` lets the one being said finish.
    clear({keepCurrent = false} = {}) {
      queue.length = 0;
      if (keepCurrent) return;
      try { current?.source?.stop(); } catch { /* ended */ }
      current = null;
      chain?.keyOff();
    },
    dispose() { if (disposed) return; this.clear(); chain?.dispose(); disposed = true; },
  };
}

// ---- The dive's screen layer: sonar ring, caption strip, log card, Coast Cup card ----

export function sonarText(event) {
  const blip = event?.deepSonar?.blip;
  return blip ? `${Math.round(blip.distance)} m` : 'No echo';
}
export function createSirenaHud({host, app, phone = createAnaPhone({audio: app?.audio}), now = () => performance.now() / 1000}) {
  const doc = host.ownerDocument, root = doc.createElement('section');
  root.className = 'sirena-hud';
  root.innerHTML = '<div class="sirena-sonar" hidden><i></i><b class="sirena-blip"></b><span></span></div>' +
    '<div class="sirena-log" hidden></div><p class="sirena-caption" aria-live="polite" hidden><small>ANA · FIELD STATION</small><span></span></p>' +
    '<div class="sirena-title" hidden><p>COAST CUP</p><h2>1966 to 2026: finished</h2></div>';
  host.append(root);
  const sonar = root.querySelector('.sirena-sonar'), blip = root.querySelector('.sirena-blip'), distance = sonar.querySelector('span');
  const log = root.querySelector('.sirena-log'), caption = root.querySelector('.sirena-caption'), title = root.querySelector('.sirena-title');
  let sonarUntil = 0, logUntil = 0, titleUntil = 0, disposed = false, surfaced = false;
  const stop = app?.duel?.onChange?.((state, event) => {
    if (disposed) return;
    const t = now();
    if (event.deepSonar) {
      const relative = event.deepSonar.blip?.relative;
      sonar.hidden = false; sonarUntil = t + 6;
      sonar.classList.remove('ping'); void sonar.offsetWidth; sonar.classList.add('ping');
      distance.textContent = sonarText(event);
      blip.hidden = !event.deepSonar.blip;
      // The blip sits round the ring at its bearing to the car: straight up is dead ahead.
      if (Number.isFinite(relative)) blip.style.transform = `rotate(${-relative}rad) translateY(-46px)`;
    }
    if (event.deepLogged) { log.innerHTML = logCardMarkup(event.deepLogged.creature); log.hidden = false; logUntil = t + 6; }
    if (event.deepPhone) phone.say(event.deepPhone.line);
    if (event.deepCoastCup) { title.hidden = false; titleUntil = t + 5; phone.say('deep.ana.cup'); }
    // Driving back up the ramp ends the dive and returns to the menu: Ana finishes what she
    // has to say (the Norseman story comes on the way up). Quitting a dive to the menu, or a
    // new race, stops her after the line she is saying.
    if (event.deepExited) { sonar.hidden = log.hidden = true; surfaced = true; }
    else if (event.menu) { if (!surfaced) phone.clear({keepCurrent: true}); surfaced = false; }
    else if (event.stageLoaded != null) { sonar.hidden = log.hidden = true; surfaced = false; phone.clear({keepCurrent: true}); }
  });
  return {
    update() {
      if (disposed) return;
      const t = now();
      if (t > sonarUntil) sonar.hidden = true;
      if (t > logUntil) log.hidden = true;
      if (t > titleUntil) title.hidden = true;
      const line = phone.update({blocked: !title.hidden});
      caption.hidden = !line;
      if (line) caption.querySelector('span').textContent = line.text;
    },
    dispose() { if (disposed) return; disposed = true; stop?.(); phone.dispose(); root.remove(); },
  };
}
