// The Sirena story drawn (DEEP-SIRENA-VIEW; docs/THE_DEEP.md 6.2 to 6.8): the
// wreck and loose parts at their finds, the badge's glint, the yellow bags filling
// and rising with their part, the dark drop beyond the Drop-off lip, the sonar
// ring and blip, Ana's caption strip and phone, the sea-life card and the Coast
// Cup title card. Presentation only: it reads the Duel's events and
// deepStoryView(duel), and never writes race state, saves or random streams.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loggingProgress} from './deep-log.js'; // DEEP-EXPLORER
import {deepStoryView} from './deep-story.js';
import {DEEP_PHONE_LINES} from './deep-phone-lines.js';
import {createDeepPhoneChain} from './deep-phone.js';
import {logCardMarkup} from './deep-log.js';
import {SOUND_BANK} from '../sound-bank.js';
import {deepWorldPose} from './deep-journey.js';
import {deepMapGeometry, deepMapData, drawDeepMap} from './deep-map.js';
import {deepObjectives} from './deep-objectives.js'; // DEEP-EXPLORER

export const SIRENA_MODEL = Object.freeze({'sirena-badge': 'badge', 'sirena-steering-wheel': 'steering-wheel',
  'sirena-wheel': 'wheel', 'sirena-bonnet': 'bonnet', 'sirena-door': 'door', 'sirena-car': 'wreck'});
const MODEL_URL = id => `/assets/models/sirena/${id}.glb`;
const defaultLoad = id => new GLTFLoader().loadAsync(MODEL_URL(id));
export const RISE_SPEED = Object.freeze({part: 2.4, car: 1.1});   // metres a second, to the surface
// The bag is drawn larger than the model so it reads from the chase camera (Claude, look round 1).
export const BAG_DRAW_SCALE = 1.8;
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
  const pearlGlints = new Map();
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
      const angle = count > 1 ? i / count * Math.PI * 2 + .6 : 0, spread = count > 1 ? 2.2 : 0;
      const grown = (.25 + .75 * Math.min(1, fill)) * BAG_DRAW_SCALE;
      bag.scale.set(grown, grown, grown);
      bag.position.set(around.x + Math.sin(angle) * spread, around.y + .3, around.z + Math.cos(angle) * spread);
    });
  }

  return {
    group,
    update({duel, seconds = 0, dt = 0}) {
      if (disposed) return;
      const view = deepStoryView(duel);
      // Pearls need a visible clue before they earn a chart pin. Reuse the
      // badge's brief sunlight glint; this view never collects or reveals one.
      for (const pearl of duel.deepStory?.log?.pearls ?? []) {
        if (!pearlGlints.has(pearl.pearl)) {
          const marker = createGlint();
          if (marker) { marker.name = `Pearl glint: ${pearl.pearl}`; marker.scale.setScalar(.65); group.add(marker); }
          pearlGlints.set(pearl.pearl, marker);
        }
        const marker = pearlGlints.get(pearl.pearl);
        if (!marker) continue;
        marker.visible = !duel.deepStory.log.found.has(pearl.pearl);
        marker.position.set(pearl.x, deep.shape.floorHeight(pearl.x, pearl.z) + .25, pearl.z);
        const beat = (seconds % 2.6) / 2.6;
        marker.material.opacity = beat < .18 ? Math.sin(beat / .18 * Math.PI) : 0;
      }
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
          const bag = wear(bagSource.clone(true)), angle = count > 1 ? i / count * Math.PI * 2 + .6 : 0, spread = count > 1 ? 2.2 : 0;
          bag.scale.setScalar(BAG_DRAW_SCALE);
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
      pieces.clear(); pearlGlints.clear(); rising.length = 0; bags.length = 0;
    },
  };
}

// ---- Ana on the phone: one line at a time, in order, never over a title card ----------

export const PHONE_GAP = .6;   // seconds between lines
const captionSeconds = text => 1.5 + text.split(/\s+/).length * .38;   // when no sound plays

export function createAnaPhone({audio = null, now = () => performance.now() / 1000} = {}) {
  const queue = [], buffers = new Map();
  let current = null, nextAt = 0, chain = null, chainContext = null, disposed = false, blockedAt = null;
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
      if (disposed || current !== line || line.source || blockedAt !== null || !data || !audible()) return;
      const ctx = audio.context;
      if (chainContext !== ctx) { chain?.dispose(); chain = createDeepPhoneChain(ctx, audio.mixer?.output?.(line.id) ?? audio.master ?? ctx.destination); chainContext = ctx; }
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = data; gain.gain.value = SOUND_BANK[line.id].volume;
      source.connect(gain); gain.connect(chain.input);
      const offset = line.offset || 0;
      chain.keyOn(); source.start(0, offset);
      audio.mixer?.duck?.('voice', data.duration - offset + .6);
      line.until = now() + data.duration - offset + .1;
      line.startedAt = ctx.currentTime;
      line.source = source;
      line.gain = gain;
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
      if (blocked) {
        if (blockedAt === null) {
          blockedAt = t;
          if (current?.source) {
            current.offset = (current.offset || 0) + Math.max(0, audio.context.currentTime - current.startedAt);
            current.source.onended = null;
            current.source.stop(); current.source.disconnect(); current.source = null;
            current.gain?.disconnect();
            chain?.keyOff();
          }
        }
        return null;
      }
      if (blockedAt !== null) {
        if (current) {
          current.until += t - blockedAt;
          // Resume at the saved audio position; captions also keep their remaining time.
          play(current);
        }
        blockedAt = null;
      }
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
  root.innerHTML = '<div class="deep-logging" hidden><i></i><span></span></div>' + // DEEP-EXPLORER
    '<div class="sirena-sonar" hidden><i></i><b class="sirena-blip"></b><span></span></div>' +
    '<div class="sirena-log" hidden></div><p class="sirena-caption" aria-live="polite" hidden><small>ANA · FIELD STATION</small><span></span></p>' +
    '<div class="sirena-title" hidden><p>COAST CUP</p><h2>1966 to 2026: finished</h2></div>' +
    '<aside class="deep-map" hidden><header><b>KELP COAST</b><button type="button" class="deep-map-toggle">Hide map</button></header>' +
    '<canvas width="400" height="250" role="img" aria-label="Sea chart: explored seabed, saved finds, discovered places, ramp and your heading"></canvas>' +
    '<button type="button" class="deep-map-home">Return bearing</button><span class="deep-map-bearing" hidden><i>↑</i><b></b></span>' +
    // DEEP-EXPLORER: Surface stays visible even when the map is closed.
    '<button type="button" class="deep-surface">Surface · U</button>' +
    '<section class="deep-objectives"><h3>Ana’s list <span class="deep-chart-percent"></span></h3><ol></ol>' +
    '<p class="deep-chart-key">◆ Sea life · ● Pearl · ★ Badge · ⚑ Salvage<br>Sand · Kelp · Rock · Blue depths</p></section></aside>' +
    '<p class="deep-objective-tick" aria-live="polite" hidden></p>';
  host.append(root);
  const sonar = root.querySelector('.sirena-sonar'), blip = root.querySelector('.sirena-blip'), distance = sonar.querySelector('span');
  const log = root.querySelector('.sirena-log'), caption = root.querySelector('.sirena-caption'), title = root.querySelector('.sirena-title');
  const map = root.querySelector('.deep-map'), canvas = map.querySelector('canvas'), ctx = canvas.getContext('2d');
  const toggle = map.querySelector('.deep-map-toggle'), home = map.querySelector('.deep-map-home');
  const bearing = map.querySelector('.deep-map-bearing');
  // DEEP-EXPLORER: checklist and completion notices are presentation only.
  const objectives = map.querySelector('.deep-objectives'), list = objectives.querySelector('ol');
  const logging = root.querySelector('.deep-logging'); // DEEP-EXPLORER
  const survey = objectives.querySelector('.deep-chart-percent'), tick = root.querySelector('.deep-objective-tick');
  const surface = map.querySelector('.deep-surface'), surfaceNow = () => app.duel.deepSurface();
  surface.addEventListener('click', surfaceNow);
  let previousObjectives = null, listMarkup = '', tickUntil = 0;
  const ticks = [];
  let mapVisit = null, geometry = null, showMap = true, requested = false, mapDrawAt = -Infinity;
  const toggleMap = () => { showMap = !showMap; canvas.hidden = objectives.hidden = !showMap; toggle.textContent = showMap ? 'Hide map' : 'Show map'; };
  const requestHome = () => { requested = true; };
  toggle.addEventListener('click', toggleMap); home.addEventListener('click', requestHome);
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
    if (event.deepPlace?.title && app.getDeepDiscovery()?.enabled === true) {
      title.querySelector('p').textContent = 'KELP COAST';
      title.querySelector('h2').textContent = event.deepPlace.place.name;
      title.className = 'sirena-title';
      title.hidden = false; titleUntil = t + 3;
      caption.hidden = true;
    }
    if (event.deepCoastCup) {
      title.querySelector('p').textContent = 'COAST CUP';
      title.querySelector('h2').textContent = '1966 to 2026: finished';
      // The results screen fills the left half: the card sits in the free right side, clear of its text.
      title.className = 'sirena-title sirena-title-cup';
      title.hidden = false; titleUntil = t + 5; phone.say('deep.ana.cup');
    }
    // Driving back up the ramp ends the dive and returns to the menu: Ana finishes what she
    // has to say (the Norseman story comes on the way up). Quitting a dive to the menu, or a
    // new race, stops her after the line she is saying.
    if (event.deepExited) { title.hidden = sonar.hidden = log.hidden = true; surfaced = true; }
    else if (event.menu) { title.hidden = true; if (!surfaced) phone.clear({keepCurrent: true}); surfaced = false; }
    else if (event.stageLoaded != null) { title.hidden = sonar.hidden = log.hidden = true; surfaced = false; phone.clear({keepCurrent: true}); }
  });
  return {
    update() {
      if (disposed) return;
      const t = now();
      const d = app.duel, journey = d.state.deepJourney, discovery = app.getDeepDiscovery();
      const active = discovery?.enabled === true && journey?.phase === 'underwater' && !!d.deepRuntime;
      map.hidden = !active;
      // DEEP-EXPLORER: draw only the rules' current hold; never advance it here.
      const progress = active ? loggingProgress(d.deepStory?.log) : null;
      logging.hidden = !progress;
      if (progress) {
        logging.querySelector('span').textContent = `Logging: ${progress.name}`;
        logging.querySelector('i').style.background = `conic-gradient(#e9d7a0 ${progress.fraction*360}deg,#365764 0deg)`;
      }
      if (!active) { mapVisit = null; previousObjectives = null; ticks.length = 0; tick.hidden = true; }
      else {
        if (mapVisit !== journey) {
          mapVisit = journey; geometry = deepMapGeometry(d.deepRuntime.zone);
          showMap = true; requested = false; canvas.hidden = objectives.hidden = false;
          toggle.textContent = 'Hide map'; mapDrawAt = -Infinity;
        }
        if (t >= mapDrawAt) {
          mapDrawAt = t + .1;
          const data = deepMapData(geometry, d.deepRuntime.zone, deepWorldPose(d), {
            places: discovery.places, elapsedSec: journey.elapsedSec, requested,
            save: discovery, charted: d.deepStory?.charted ?? discovery.charted?.[d.deepRuntime.zone.id] }); // DEEP-EXPLORER
          if (showMap) drawDeepMap(ctx, data);
          // DEEP-EXPLORER: saved goals, with live survey progress before its next save.
          const rows = deepObjectives(discovery, data.percent, app.profile?.unlockedCars?.includes('falcone_sirena'));
          if (previousObjectives) for (const row of rows)
            if (row.done && !previousObjectives.find(old => old.id === row.id)?.done) ticks.push(row.tick);
          previousObjectives = rows;
          const markup = rows.map(row => `<li class="${row.done ? 'done' : ''}"><b>${row.done ? '✓ ' : ''}${row.text}</b>${row.done ? '' : `<small>${row.hint}</small>`}</li>`).join('');
          if (markup !== listMarkup) { list.innerHTML = markup; listMarkup = markup; }
          survey.textContent = `${data.percent}% charted`;
          bearing.hidden = !data.home.visible; home.hidden = data.home.visible;
          bearing.querySelector('i').style.transform = `rotate(${-data.home.relative}rad)`;
          bearing.querySelector('b').textContent = `Ramp · ${Math.round(data.home.distance)} m`;
        }
      }
      if (t > sonarUntil) sonar.hidden = true;
      if (t > logUntil) log.hidden = true;
      if (t >= titleUntil || app.getDeepDiscovery()?.enabled !== true) title.hidden = true;
      // DEEP-EXPLORER: no tick or sound interrupts a place title or a log card.
      if (t >= tickUntil || !title.hidden || !log.hidden) tick.hidden = true;
      if (active && title.hidden && log.hidden && t >= tickUntil && ticks.length) {
        tick.textContent = ticks.shift(); tick.hidden = false; tickUntil = t + 3;
        app.deepAudio?.event({deepObjective: true}, d.state);
      }
      const line = phone.update({blocked: !title.hidden});
      caption.hidden = !line || !title.hidden;
      if (line) caption.querySelector('span').textContent = line.text;
    },
    dispose() { if (disposed) return; disposed = true; stop?.(); phone.dispose(); toggle.removeEventListener('click', toggleMap); home.removeEventListener('click', requestHome); surface.removeEventListener('click', surfaceNow); root.remove(); },
  };
}
