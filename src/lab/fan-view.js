// LAB-FAN-VIEW: the secret's page and room drawings. Purchase rules live in lab-fan.js.
import {secretOpen, FAN_CAR, FAN_PRICE} from './lab-fan.js';
import {labOf} from './lab-save.js';
import {TUNNEL_LESSONS} from './lab-lessons.js';
import * as THREE from 'three';
import {loadSpeirlingVehicle} from '../speirling-vehicle.js';
import {WALK, WALK_LAYOUT} from './lab-walk.js';
import {LAB_SOUND_CUES} from './lab-cues.js';

// Lab file cues are deliberately excluded from the game's startup audio batch.
// Load these two on demand, and own the fan loop until the bench closes.
export function createFanSound(app) {
  const loading = new Map();
  let ticket = 0, wanted = null, loop = null, gain = null, reverseVoice = null, starting = null, failed = false;
  async function ready(id) {
    const audio = app.audio;
    if (!audio?.context) return false;
    if (audio.cueBuffers?.[id]) return true;
    if (!loading.has(id)) loading.set(id, fetch(`/assets/audio/${LAB_SOUND_CUES[id].file}`)
      .then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error('Lab sound unavailable')))
      .then(bytes => audio.context.decodeAudioData(bytes))
      .then(buffer => { audio.cueBuffers[id] = buffer; return true; })
      .catch(() => false).finally(() => loading.delete(id)));
    return loading.get(id);
  }
  function stopLoop() { loop?.stop(); loop?.disconnect(); gain?.disconnect(); loop = gain = null; }
  return {
    reverse() {
      const mine = ticket;
      ready('lab.reverse').then(ok => {
        if (ok && mine === ticket && !app.audio.muted) { reverseVoice?.stop(); reverseVoice = app.audio._playCue('lab.reverse'); }
      });
    },
    bench(setting) {
      if (setting === null) { if (wanted !== null) ticket++; wanted = null; starting = null; failed = false; stopLoop(); return; }
      const was = wanted; wanted = setting;
      if (app.audio?.muted) { stopLoop(); return; }
      if (loop) { loop.playbackRate.value = .6 + .9 * setting / 100; return; }
      if (starting || failed && was === setting || !app.audio?.context) return;
      failed = false;
      const mine = ticket;
      const request = {}; starting = request;
      ready('lab.fan').then(ok => {
        if (!ok && mine === ticket) failed = true;
        if (!ok || mine !== ticket || wanted === null || app.audio.muted) return;
        const audio = app.audio;
        loop = audio.context.createBufferSource(); gain = audio.context.createGain();
        loop.buffer = audio.cueBuffers['lab.fan']; loop.loop = true;
        loop.playbackRate.value = .6 + .9 * wanted / 100;
        gain.gain.value = LAB_SOUND_CUES['lab.fan'].volume;
        loop.connect(gain); gain.connect(audio.buses?.ambience ?? audio.master); loop.start();
      }).finally(() => { if (starting === request) starting = null; });
    },
    stop() { ticket++; wanted = null; starting = null; failed = false; stopLoop(); reverseVoice?.stop(); reverseVoice = null; },
  };
}

export const FAN_FACTS = Object.freeze([
  'In 1970 the Chaparral 2J raced with two fans sucking it to the ground.',
  'In 1978 the Brabham BT46B fan car won the Swedish Grand Prix at its first race and was withdrawn straight after.',
  'In 2022 the electric McMurtry Spéirling, under 1,000 kg with fans pulling about 2,000 kg of downforce even standing still, set the Goodwood hill climb record: 39.08 s.',
]);
export function fanView(profile, flags) {
  const lab = labOf(profile);
  const open = flags?.enabled?.('lab') === true && secretOpen(lab);
  return {open, reverse: open && lab.secret?.reverse === true,
    owned: open && profile?.unlockedCars?.includes(FAN_CAR) === true};
}
export const tunnelLesson = id => TUNNEL_LESSONS.includes(id);
export const fanLoad = setting => 1000 + 2000 * Math.max(0, Math.min(100, Number(setting) || 0)) / 100;
export function fanEntry(view, lesson, elapsed = null) {
  if (!view.open) return '';
  if (view.reverse) return (elapsed !== null && elapsed < 3 ? '<p role="status">The fan winds down… then roars back.</p>' : '<button type="button" data-lab="fan-blueprint">PROJECT FAN →</button>') +
    `<dl class="lab-readout"><div><dt>Standing still · scales</dt><dd data-lab-reverse-scales>${elapsed !== null && elapsed < 1.5 ? '1,000' : '3,000'} kg</dd></div></dl>`;
  return tunnelLesson(lesson) ? '<button type="button" data-lab="fan-reverse" aria-label="Reverse the wind tunnel fan">REVERSE</button>' : '';
}
export function fanMarkup(view, setting, message = '') {
  if (!view.reverse) return '';
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  return `<section class="lab-bench" data-lab-fan><button type="button" data-lab="fan-back">← Lessons</button>` +
    `<p class="eyebrow">BRIAN'S WORKSHOP · PROJECT FAN</p><h3>The car that grips standing still.</h3>` +
    `<ol>${FAN_FACTS.map(text => `<li>${text}</li>`).join('')}</ol>` +
    `<label class="lab-control"><span>Fans</span><input type="range" data-lab-fan-setting min="0" max="100" step="10" value="${setting}" aria-label="Fan power"><output>${setting}%</output></label>` +
    `<dl class="lab-readout"><div><dt>Speed</dt><dd>0 mph</dd></div><div><dt>Car weight</dt><dd>1,000 kg</dd></div><div><dt>Scales</dt><dd data-lab-fan-scales>${fanLoad(setting).toLocaleString('en-US')} kg</dd></div></dl>` +
    `<p>The fans pull air from under the car. The scales rise before it moves.</p>` +
    `<button type="button" data-lab="fan-build"${view.owned ? ' disabled' : ''}>${view.owned ? 'BUILT · IN YOUR GARAGE' : `BUILD · ${FAN_PRICE.toLocaleString('en-US')} CR`}</button>` +
    `${view.owned ? '<p>Yours at the home pad. With Kestrel One on, this special car travels by air.</p>' : ''}` +
    `<p class="lab-message" role="status">${escape(message)}</p></section>`;
}

// Drawing-only extension to the room. The room owns and releases these nodes.
export function createFanRoom({scene, part, load, release, alive, manifest, host, camera, walking = false, loadCar = loadSpeirlingVehicle}) {
  const root = new THREE.Group();
  root.name = 'lab-project-fan';
  root.visible = false;
  scene.add(root);
  const at = walking ? {x: WALK_LAYOUT['wind-tunnel'][0], z: WALK_LAYOUT['wind-tunnel'][1]}
    : manifest.layout['wind-tunnel'] ?? {x: 8.6, z: -6.3};
  const scale = walking ? WALK.scale : 1;
  let view = {open: false}, car = null, sheet = null, loading = false, angle = 0, lastSeconds = null;
  const status = {car: 'idle', blueprint: 'idle'};
  let toggle = null;
  const projected = new THREE.Vector3();
  async function assets() {
    if (loading) return;
    loading = true;
    status.car = status.blueprint = 'loading';
    await Promise.all([
      loadCar().then(make => {
        const made = make({});
        if (!alive()) { release(made); return; }
        car = made; car.rotation.y = Math.PI / 2;
        car.scale.setScalar(scale);
        car.position.set(at.x - .5 * scale, .38 * scale, at.z);
        root.add(car); status.car = 'ready';
      }).catch(() => { status.car = 'failed'; }),
      load('/assets/models/speirling/project-fan.glb').then(made => {
        if (!alive()) { release(made); return; }
        sheet = made; sheet.position.set(14.85, 2.8, -1.1); sheet.rotation.y = -Math.PI / 2;
        root.add(sheet); status.blueprint = 'ready';
      }).catch(() => { status.blueprint = 'failed'; }),
    ]);
  }
  return {
    update(next) { view = next; root.visible = next.open; if (next.open) assets(); },
    pose() {
      if (!view.page) return null;
      return view.owned || view.setting > 0
        ? {position: [at.x + (walking ? -3.8 : 3.8) * scale, 2.5 * scale, at.z + (walking ? -5.5 : 5.5) * scale], target: [at.x - .5 * scale, .9 * scale, at.z]}
        : {position: [12.3, 2.5, -1.1], target: [14.85, 2.36, -1.1]};
    },
    frame(seconds) {
      const dt = lastSeconds === null ? 0 : Math.min(.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      const reverse = part('wind-tunnel', 'reverse-switch');
      if (reverse) { reverse.visible = view.open; reverse.rotation.x = view.reverse ? -.55 : 0; }
      const showToggle = !!reverse && view.open && !view.reverse && view.tunnel === true && !view.page;
      if (showToggle && !toggle) {
        toggle = host.ownerDocument.createElement('button');
        toggle.type = 'button'; toggle.dataset.lab = 'fan-reverse'; toggle.textContent = 'REVERSE';
        toggle.setAttribute('aria-label', 'Reverse the wind tunnel fan');
        toggle.style.cssText = 'position:absolute;z-index:3;transform:translate(-50%,-50%);font-size:11px;padding:5px 8px;background:#252e2d;color:#fff4dc;border:1px solid #c9a227;border-radius:3px;cursor:pointer;';
        host.append(toggle);
      }
      if (toggle && toggle.hidden === showToggle) toggle.hidden = !showToggle;
      if (showToggle) {
        reverse.getWorldPosition(projected).project(camera);
        const left = `${Math.round((projected.x + 1) * host.clientWidth / 2)}px`;
        const top = `${Math.round((1 - projected.y) * host.clientHeight / 2)}px`;
        if (toggle.style.left !== left) toggle.style.left = left;
        if (toggle.style.top !== top) toggle.style.top = top;
      }
      const elapsed = view.elapsed;
      const reversed = view.reverse && (elapsed === null || elapsed >= 1.5);
      const speed = !view.reverse ? 8 : elapsed !== null && elapsed < 1.5
        ? 8 * (1 - elapsed / 1.5) : -Math.min(16, 16 * (elapsed === null ? 1 : (elapsed - 1.5) / 1.5));
      angle += speed * dt;
      const fan = part('wind-tunnel', 'fan');
      if (fan && view.open) fan.rotation.x = angle;
      const dial = part('wind-tunnel', 'fan-dial-needle');
      if (dial && view.reverse) dial.rotation.z = -Math.PI * .7 * (view.page ? view.setting / 100 : Number(reversed));
      if (sheet) {
        sheet.visible = view.reverse && (elapsed === null || elapsed >= 3);
        sheet.scale.y = elapsed !== null ? Math.min(1, Math.max(.01, (elapsed - 2.6) / .4)) : 1;
      }
      if (car) {
        const push = view.page ? view.setting / 100 : reversed ? Math.min(1, elapsed === null ? 1 : (elapsed - 1.5) / 1.5) : 0;
        car.position.y = (.38 - .045 * push) * scale;
        for (const rotor of car.userData.fans ?? []) rotor.rotation.z += dt * 35 * push;
      }
      const belt = part('wind-tunnel', 'belt');
      if (belt && view.reverse) belt.position.x = -.5;
      return {...status};
    },
    dispose() { toggle?.remove(); },
  };
}
