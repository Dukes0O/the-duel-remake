// Heli-skiing drawn (SKI-VIEW; docs/HELI_SKIING.md sections 2, 4, 5 and 8): the ski zone in front of the Summit world,
// the skier and the group, the course pieces, the snow spray, the stashes' fresh snow, the yeti over the powder bowl,
// the three cameras, the run HUD and its cards, and the board and run menu the helicopter panel shows at the pads.
// Presentation only: it reads the helicopter session's view (`view.ski`) and the zones' own data, and never changes the
// run, the flight or the save. Its buttons ask the app, and the session decides.
//
// How the zone sits in front of the world (Claude's answer 1 on the card): the zones are steeper than the Summit ground
// under their pads, so a zone drawn at its true place would be buried in the mountain. Like the Deep, the zone has a
// scene of its own. When the skier steps out, the Summit world is captured once into a cube from a fixed eye above the
// run's pad, turned so the run looks down that pad's real valley, and the cube is the zone scene's background: the near
// slope is the zone, and the far ridges, sky and light are the Summit world's. The cube is freed when the run ends.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {skiZone} from './runs/summit-zones.js';
import {aerialsTips} from '../lab/benches/launch.js';
import {skiControlsHelp} from '../controls-help.js';

// ---- Pure parts (no page, no graphics) -------------------------------------------------------------------------

export const SKI_CAMERA_VIEWS = Object.freeze(['chase', 'low chase', 'side']);
// The backdrop's eye: this far above the run's pad, and the compass way (degrees, 0 is +z) the world falls away from
// each pad, found from the Summit ground (the lowest mean height 100 to 600 m out, in 5 degree steps).
// The cube's faces are 1,024 pixels on High and 512 on Performance.
export const SKI_BACKDROP = Object.freeze({eyeAbove: 40, valley: Object.freeze({devils: 305, summit: 210, pickup: 205}),
  face: Object.freeze({high: 1024, performance: 512})});
const CAMERAS = Object.freeze({
  chase: Object.freeze({back: 6, up: 2.4, ahead: 8, aim: 0.6, fov: 58}),
  'low chase': Object.freeze({back: 3.5, up: 1, ahead: 6, aim: 0.8, fov: 62}),
  side: Object.freeze({side: 9, up: 2, back: 1, aim: 0.9, fov: 54}),
});
const KMH = 3.6;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const escape = text => String(text ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const held = (keys, ...codes) => codes.some(code => keys?.[code] === true);
const stick = value => Math.abs(value ?? 0) < 0.18 ? 0 : clamp(value, -1, 1);

// The ski keys (HELI_SKIING section 4): A and D (or the arrows) tip the skis, S skids, Shift tucks, W skates, Space
// pops; in the air A and D spin and W and S flip. Gamepad: the left stick, A pops, the right trigger tucks and the
// left trigger skids. The session's skiControls clamps whatever comes in.
export function skiKeys(keys = {}, pad = null) {
  let turn = (held(keys, 'KeyD', 'ArrowRight') ? 1 : 0) - (held(keys, 'KeyA', 'ArrowLeft') ? 1 : 0);
  let flip = (held(keys, 'KeyW', 'ArrowUp') ? 1 : 0) - (held(keys, 'KeyS', 'ArrowDown') ? 1 : 0);
  const button = index => pad?.buttons?.[index]?.pressed === true;
  if (pad?.axes) {
    const x = stick(pad.axes[0]), y = -stick(pad.axes[1]);
    if (Math.abs(x) > Math.abs(turn)) turn = x;
    if (Math.abs(y) > Math.abs(flip)) flip = y;
  }
  return {turn, flip, skid: held(keys, 'KeyS', 'ArrowDown') || button(6) || flip < -0.5,
    tuck: held(keys, 'ShiftLeft', 'ShiftRight') || button(7), skate: held(keys, 'KeyW', 'ArrowUp') || flip > 0.5,
    pop: held(keys, 'Space') || button(0)};
}

// The camera's heading eases after the skis' (a tumble or a quick edge change does not whip it round).
export function followYaw(yaw, heading, dt) {
  if (!Number.isFinite(yaw)) return heading;
  const turn = Math.atan2(Math.sin(heading - yaw), Math.cos(heading - yaw));
  return yaw + turn * (1 - Math.exp(-4 * clamp(dt, 0, 0.25)));
}

// The camera in the zone's frame: chase and low chase behind the skier along `yaw`, side from the skier's right
// (square to the run, for the aerials). Never under the snow. ground(x, z) is the zone's snow height.
export function skiCameraPose({skier, mode = 'chase', yaw = skier.heading, ground}) {
  const c = CAMERAS[mode] ?? CAMERAS.chase;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let position, target;
  if (mode === 'side') {
    // The skier's right at heading 0 is -x.
    position = {x: skier.x - c.side, y: skier.y + c.up, z: skier.z - c.back};
    target = {x: skier.x, y: skier.y + c.aim, z: skier.z + 2};
  } else {
    position = {x: skier.x - fx * c.back, y: skier.y + c.up, z: skier.z - fz * c.back};
    target = {x: skier.x + fx * c.ahead, y: skier.y + c.aim, z: skier.z + fz * c.ahead};
  }
  const floor = ground(position.x, position.z) + 0.8;
  if (position.y < floor) position.y = floor;
  return {position, target, fov: c.fov};
}

// The backdrop's eye in the Summit world, and how far it turns about the vertical (radians) so the zone's +z looks
// down the pad's valley: a camera turned by `turn` sees the world's (sin turn, cos turn) where it sees its own +z.
export function backdropEye(world) {
  return {x: world.x, y: world.y + SKI_BACKDROP.eyeAbove, z: world.z, turn: (SKI_BACKDROP.valley[world.pad] ?? 0) * Math.PI / 180};
}

// Which of SKI-ART's seven poses the skier wears.
export function skierPose(skier) {
  if (skier.tumbling) return 'skier-tumble';
  if (!skier.grounded) return 'skier-air';
  if (skier.tucked) return 'skier-tuck';
  if (skier.skidding) return 'skier-crouch';
  if (skier.edge > 12) return 'skier-lean-right';
  if (skier.edge < -12) return 'skier-lean-left';
  return 'skier-stand';
}

// How deep the snow is under the skier, 0 on the packed line to 1 in the powder (for SKI-AUDIO's powder bed).
export function skiDeepSnow(run) {
  if (!run?.skier) return 0;
  const zone = skiZone(run.run), extra = zone.extraFriction?.(run.skier.x, run.skier.z) ?? 0;
  return extra > 0 ? clamp(extra / 0.07, 0, 1) : 0;
}

export function clockText(seconds) {
  const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0), minutes = Math.floor(t / 60), rest = t - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
}
const MEDALS = ['No medal', 'Bronze', 'Silver', 'Gold'];
export const medalName = medal => MEDALS[medal] ?? MEDALS[0];

// The medal targets: times for the timed runs, points for the judged ones, nothing for powder.
export function targetsMarkup(limits) {
  if (!limits) return '';
  const text = value => limits.kind === 'time' ? clockText(value) : `${Math.round(value)} pts`;
  return `<ol class="ski-targets" aria-label="Medal targets">${['gold', 'silver', 'bronze'].map(medal =>
    `<li class="ski-${medal}"><b>${medal.toUpperCase()}</b> ${text(limits[medal])}</li>`).join('')}</ol>`;
}

const RUN_TIPS = Object.freeze({
  slalom: 'Short, quick turns: pass each pole on its side. A missed gate adds 5 seconds.',
  gs: 'Wider gates and more speed: carve long arcs, and tuck where the line runs straight.',
  moguls: 'Moguls form by themselves where many skiers turn in the same places. Turn on the bumps, and spin or flip off both jumps.',
  powder: 'No course: find the three untouched stashes. Off the packed line the deep snow slows you, so keep your speed.',
});
// The card while the skier stands at the top: the run, the day's snow, the targets and the tip (the six aerials
// tips on the Aerials run, which the session offers only once they are open).
export function loadingCardMarkup(run, {snow = null} = {}) {
  if (!run) return '';
  const tips = run.run === 'aerials' ? aerialsTips() : [RUN_TIPS[run.run]].filter(Boolean);
  const snowLine = snow ? `<p class="ski-snow">Today's snow: ${escape(snow.name)}, ${Math.round(snow.celsius)} °C${run.pick ? ` · wax ${escape(run.pick)}` : ''}</p>` : '';
  return `<section class="ski-card ski-loading" aria-label="${escape(run.name)}"><small>HELI-SKIING · ${escape(run.name.toUpperCase())}</small>
    ${snowLine}${targetsMarkup(run.limits)}<ul class="ski-tips">${tips.map(tip => `<li>${escape(tip)}</li>`).join('')}</ul>
    <p class="ski-go">${run.kind === 'free' ? 'Any way down to the green circle' : 'The clock starts at the start line'}</p></section>`;
}

const pct = value => `${Math.round(value)}`;
// The run's result: the time and gates missed, or the score card's three parts and the points, the medal, and once the
// save has it, the pay and whether it is a new best.
export function resultCardMarkup(result, recorded = null, {waiting = true} = {}) {
  if (!result) return '';
  const rows = result.kind === 'time'
    ? `<p class="ski-big">${clockText(result.time)}</p><p>${result.missed ? `${result.missed} gate${result.missed > 1 ? 's' : ''} missed (+${result.missed * 5} s) · skied ${clockText(result.raw)}` : 'Every gate clean'}</p>`
    : `<p class="ski-big">${(Math.round(result.points * 10) / 10).toFixed(1)} pts</p>${scoreCardMarkup(result)}`;
  const paid = recorded ? `<p class="ski-paid">${recorded.paid ? `${recorded.paid.toLocaleString('en-US')} credits` : 'No new pay'}${recorded.improved ? ' · new best' : ''}</p>` : '';
  return `<section class="ski-card ski-result ski-medal-${result.medal}" aria-label="Result"><small>RESULT</small>${rows}
    <p class="ski-medal">${medalName(result.medal).toUpperCase()}</p>${paid}${waiting ? '<p class="ski-next">Stop in the green circle at the bottom for the helicopter.</p>' : ''}</section>`;
}
// The judges' three parts (HELI_SKIING section 5): moguls turns, air and speed; aerials air, form and landing.
export function scoreCardMarkup(result) {
  const parts = result.run === 'moguls' ? [['Turns', result.turns, 60], ['Air', result.air, 20], ['Speed', result.speed, 20]]
    : [['Air', result.air, 20], ['Form', result.form, 50], ['Landing', result.landing, 30]];
  return `<dl class="ski-score">${parts.map(([name, value, share]) =>
    `<div><dt>${name} <small>${share}%</small></dt><dd><i style="width:${clamp(value ?? 0, 0, 100).toFixed(0)}%"></i><b>${pct(value ?? 0)}</b></dd></div>`).join('')}</dl>`;
}

// The run's top line: the clock and the gates, or the score card's parts to come, or the stashes found.
export function runLineMarkup(run) {
  if (run.kind === 'timed') {
    const gates = skiZone(run.run).gates.length;
    return `<span class="ski-clock">${clockText(run.clock + run.missed * 5)}</span><span>GATES ${run.passed}/${gates}</span><span class="${run.missed ? 'ski-missed' : ''}">MISSED ${run.missed}</span>`;
  }
  if (run.kind === 'judged') {
    const parts = run.run === 'moguls' ? 'TURNS 60 · AIR 20 · SPEED 20' : 'AIR 20 · FORM 50 · LANDING 30';
    return `<span class="ski-clock">${clockText(run.clock)}</span><span>JUDGED · ${parts}</span>`;
  }
  return `<span>STASHES ${run.stashes.length}/${skiZone(run.run).stashes.length}</span>`;
}

const SKI_PAD_NAMES = Object.freeze({devils: 'Devils Playground', summit: 'the summit', pickup: 'the pickup'});
// The helicopter panel's ski box at the home pad: the free drop and, one day in three, the group job.
export function skiBoardMarkup(board, flight = null) {
  if (!board) return '';
  const row = (title, note, action, taken) => `<li><span class="heli-board-text">${escape(title)}</span><span class="heli-board-pay">${escape(note)}</span>${taken
    ? '<button type="button" class="heli-board-button" data-ski-board="hand-back">Hand it back</button>'
    : `<button type="button" class="heli-board-button" data-ski-board="${action}"${flight ? ' disabled' : ''}>Take it</button>`}</li>`;
  const rows = [row(board.drop.title, 'Your own run: fly to a drop pad and step out', 'drop', board.drop.taken)];
  if (board.group && !board.group.done) rows.push(row(board.group.title, `${board.group.guests} guests and the guide · ${board.group.payNow.toLocaleString('en-US')} credits`, 'group', board.group.taken));
  return `<section class="heli-board ski-board" aria-label="Heli-skiing"><span>HELI-SKIING</span><ul>${rows.join('')}</ul></section>`;
}
// The run menu on a drop pad (skiOffers): the day's snow, the wax pick with the Wax kit, the runs with their best and
// medal, and the Lab's wax run. wax: the pick made in this menu, or null.
export function skiMenuMarkup(offers, {wax = null} = {}) {
  if (!offers) return '';
  const snow = `<p class="ski-menu-snow">Today's snow: <b>${escape(offers.snow.name)}</b>, ${Math.round(offers.snow.celsius)} °C</p>`;
  const waxes = offers.waxes ? `<div class="ski-wax" role="group" aria-label="Wax">${offers.waxes.map(id =>
    `<button type="button" data-ski-wax="${id}" aria-pressed="${wax === id}"${wax === id ? ' class="on"' : ''}>${id[0].toUpperCase() + id.slice(1)} wax</button>`).join('')}</div>` : '';
  const best = run => run.best === null ? 'not skied yet' : `best ${run.limits?.kind === 'points' ? `${run.best} pts` : run.limits ? clockText(run.best) : run.best} · ${medalName(run.medal)}`;
  const runs = offers.runs.map(run => `<li><span class="heli-board-text">${escape(run.name)}</span><span class="heli-board-pay">${escape(best(run))}</span>
    <button type="button" class="heli-board-button" data-ski-run="${run.id}">Ski</button></li>`).join('');
  const challenge = offers.challenge ? `<li><span class="heli-board-text">Lab: the wax run</span><span class="heli-board-pay">Pick the wax for today's snow, then beat silver on the slalom</span>
    <button type="button" class="heli-board-button" data-ski-challenge="${offers.challenge.id}"${wax ? '' : ' disabled'}>Ski</button></li>` : '';
  return `<section class="heli-board ski-menu" aria-label="Ski from ${escape(SKI_PAD_NAMES[offers.pad] ?? offers.pad)}"><span>SKI FROM ${escape((SKI_PAD_NAMES[offers.pad] ?? offers.pad).toUpperCase())}</span>
    ${snow}${waxes}<ul>${runs}${challenge}</ul></section>`;
}

// ---- The zone scene -------------------------------------------------------------------------------------------

const MODEL_IDS = Object.freeze(['skier-stand', 'skier-crouch', 'skier-lean-left', 'skier-lean-right', 'skier-tuck', 'skier-air',
  'skier-tumble', 'guide', 'guest-1', 'guest-2', 'guest-3', 'guest-4', 'pole-red', 'pole-blue', 'gate-red', 'gate-blue', 'arch-start',
  'arch-finish', 'flag-drop', 'flag-pickup', 'kicker', 'netting']);
const MODEL_URL = id => `/assets/models/ski/${id}.glb`;
const defaultLoad = id => new GLTFLoader().loadAsync(MODEL_URL(id));
const DEG = Math.PI / 180;
// SKI-ART's pieces, measured from the files: the timing arch is 6.5 m wide, a giant-slalom gate's poles 4.2 m apart,
// the kicker 11.5 m wide, 5 m long and 1.69 m high, a run of netting 12 m long.
const ART = Object.freeze({archWidth: 6.5, gateWidth: 4.2, kicker: Object.freeze({length: 5, height: 1.69}), netting: 12});
const YETI = Object.freeze({x: -92, z: 600, rocks: 5});

// The places a zone's grid samples: fine where the skier goes, coarser out to the skirt that runs to the backdrop.
function samples(spans) {
  const out = [];
  for (const {from, to, step} of spans) for (let v = from; v < to - 1e-6; v += step) out.push(v);
  out.push(spans[spans.length - 1].to);
  return out;
}
export function zoneGrid(zone) {
  const b = zone.bounds, wide = zone.id === 'powder', fine = wide ? 3 : zone.id === 'gs' ? 1.5 : 1;
  const xs = zone.id === 'moguls'
    ? samples([{from: b.minX - 320, to: b.minX, step: 16}, {from: b.minX, to: -5, step: fine}, {from: -5, to: 5, step: 0.35}, {from: 5, to: b.maxX, step: fine}, {from: b.maxX, to: b.maxX + 320, step: 16}])
    : samples([{from: b.minX - 320, to: b.minX, step: 16}, {from: b.minX, to: b.maxX, step: fine}, {from: b.maxX, to: b.maxX + 320, step: 16}]);
  const dense = zone.id === 'moguls' ? [{from: b.minZ, to: 20, step: 1}, {from: 20, to: 245, step: 0.35}, {from: 245, to: b.maxZ, step: 1}]
    : zone.id === 'aerials' ? [{from: b.minZ, to: 36, step: 1}, {from: 36, to: 64, step: 0.25}, {from: 64, to: b.maxZ, step: 1}]
      : [{from: b.minZ, to: b.maxZ, step: wide ? 3 : zone.id === 'gs' ? 2 : 1}];
  const zs = samples([{from: b.minZ - 220, to: b.minZ, step: 20}, ...dense, {from: b.maxZ, to: b.maxZ + 520, step: 20}]);
  return {xs, zs};
}

// A tiny repeatable stream for the drawing's own jitter (spray, the snow's speckle): never the game's randomness.
function drawingStream(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function snowGeometry(zone, base) {
  const {xs, zs} = zoneGrid(zone), nx = xs.length, nz = zs.length;
  const position = new Float32Array(nx * nz * 3), normal = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), colour = new Float32Array(nx * nz * 3);
  const packed = zone.extraFriction ? (x, z) => 1 - clamp(zone.extraFriction(x, z) / 0.07, 0, 1) : () => 0;
  const random = drawingStream(nx * 7919 + nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = xs[i], z = zs[j], k = j * nx + i, y = zone.ground(x, z) - base, e = 0.3;
    position.set([x, y, z], k * 3);
    const gx = (zone.ground(x + e, z) - zone.ground(x - e, z)) / (2 * e), gz = (zone.ground(x, z + e) - zone.ground(x, z - e)) / (2 * e);
    const n = Math.hypot(gx, 1, gz);
    normal.set([-gx / n, 1 / n, -gz / n], k * 3);
    uv.set([x / 6, z / 6], k * 2);
    // The snow: blue-white, a touch greyer where it is packed, and a faint speckle so the slope reads at speed.
    const p = packed(x, z), speckle = (random() - 0.5) * 0.035;
    colour.set([0.93 - p * 0.05 + speckle, 0.96 - p * 0.04 + speckle, 1 - p * 0.02 + speckle], k * 3);
  }
  const index = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let w = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    index.set([a, c, b, b, c, d], w); w += 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
function snowTexture() {
  const size = 64, data = new Uint8Array(size * size * 4), random = drawingStream(20261025);
  for (let i = 0; i < size * size; i++) { const v = 200 + Math.floor(random() * 55); data.set([v, v, v, 255], i * 4); }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
// A flat shape (a disc or a ring) laid on the snow, a few centimetres up.
function drape(geometry, zone, base, cx, cz, lift = 0.04) {
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + cx, z = p.getZ(i) + cz;
    p.setXYZ(i, x, zone.ground(x, z) - base + lift, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Each mesh of a model, once per placement, in as many draws as the model has materials.
function instances(template, placements, name) {
  const group = new THREE.Group();
  group.name = name;
  if (!placements.length) return group;
  template.updateMatrixWorld(true);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  template.traverse(node => {
    if (!node.isMesh) return;
    const mesh = new THREE.InstancedMesh(node.geometry, node.material, placements.length);
    placements.forEach((p, i) => {
      q.setFromAxisAngle(up, p.yaw ?? 0);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1)).multiply(node.matrixWorld);
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  });
  return group;
}

// The course pieces: poles or gates, the timing arches, the pad flags, the kickers and the netting down the edges.
function courseGroup(zone, base, models) {
  const group = new THREE.Group();
  group.name = 'Ski course pieces';
  const at = (x, z, extra = {}) => ({x, y: zone.ground(x, z) - base, z, ...extra});
  const poles = {red: [], blue: []};
  for (const gate of zone.gates) {
    if (zone.kind === 'gs') poles[gate.colour].push(at(gate.centre, gate.left.z, {sx: gate.width / ART.gateWidth}));
    else for (const end of [gate.left, gate.right]) poles[gate.colour].push(at(end.x, end.z));
  }
  const pole = zone.kind === 'gs' ? 'gate' : 'pole';
  group.add(instances(models.get(`${pole}-red`), poles.red, 'Red gates'), instances(models.get(`${pole}-blue`), poles.blue, 'Blue gates'));
  for (const [line, id] of [[zone.start, 'arch-start'], [zone.finish, 'arch-finish']]) {
    if (line) group.add(instances(models.get(id), [at(line.centre, line.left.z, {sx: line.width / ART.archWidth})], id === 'arch-start' ? 'Start arch' : 'Finish arch'));
  }
  group.add(instances(models.get('flag-drop'), [at(6.5, 1.5)], 'Drop pad flag'),
    instances(models.get('flag-pickup'), [at(zone.pickup.x + zone.pickup.radius + 0.5, zone.pickup.z)], 'Pickup flag'));
  // The kickers: SKI-ART's ramp fitted over the snow's own kicker, just under its surface, so its timber lip and banks show.
  const kickers = (zone.kickers ?? []).map(k => {
    const lip = k.z, top = zone.ground(k.x, lip), foot = zone.id === 'aerials' ? 46 : lip - 3.5;
    const length = lip - foot, height = Math.max(0.3, top - zone.ground(k.x, foot));
    return {x: k.x, y: zone.ground(k.x, foot) - base - 0.05, z: foot + length / 2, sz: length / ART.kicker.length,
      sy: height / ART.kicker.height, sx: zone.id === 'aerials' ? 1 : 0.42};
  });
  group.add(instances(models.get('kicker'), kickers, 'Kickers'));
  // Netting down both edges of a run with a course (powder is open country).
  if (zone.kind !== 'powder') {
    const nets = [];
    for (let z = Math.max(0, zone.bounds.minZ); z + ART.netting <= zone.bounds.maxZ; z += ART.netting)
      for (const x of [zone.bounds.minX, zone.bounds.maxX]) nets.push(at(x, z, {yaw: -Math.PI / 2}));
    group.add(instances(models.get('netting'), nets, 'Safety netting'));
  }
  return group;
}

// The stashes' untouched snow: a bright, glittering field until it is found.
function stashFields(zone, base) {
  const group = new THREE.Group();
  group.name = 'Powder stashes';
  for (const stash of zone.stashes) {
    const material = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xdde8ff, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92});
    const mesh = new THREE.Mesh(drape(new THREE.CircleGeometry(stash.radius, 40), zone, base, stash.x, stash.z, 0.05), material);
    mesh.name = `Stash: ${stash.id}`;
    mesh.receiveShadow = true;
    mesh.userData.stash = stash.id;
    group.add(mesh);
  }
  return group;
}

function padRings(zone, base) {
  const group = new THREE.Group();
  group.name = 'Pad circles';
  const ring = (cx, cz, radius, colour) => new THREE.Mesh(drape(new THREE.RingGeometry(radius - 0.5, radius, 64), zone, base, cx, cz),
    new THREE.MeshBasicMaterial({color: colour, transparent: true, opacity: 0.75, depthWrite: false}));
  group.add(ring(0, 0, 6, 0xff7a1a), ring(zone.pickup.x, zone.pickup.z, zone.pickup.radius, 0x37d36b));
  return group;
}

// A figure in SKI-ART's colours, or, for the guide's ghost, see-through and cool.
function figure(template, {ghost = false} = {}) {
  const copy = template.clone(true);
  copy.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = !ghost;
    if (ghost) node.material = new THREE.MeshStandardMaterial({color: 0xbfe4ff, emissive: 0x335577, transparent: true, opacity: 0.38, depthWrite: false, roughness: 0.6});
  });
  return copy;
}
function placeFigure(object, f, base, ground) {
  object.position.set(f.x, (Number.isFinite(f.y) ? f.y : ground(f.x, f.z)) - base, f.z);
  const ahead = ground(f.x + Math.sin(f.heading) * 0.8, f.z + Math.cos(f.heading) * 0.8), behind = ground(f.x - Math.sin(f.heading) * 0.8, f.z - Math.cos(f.heading) * 0.8);
  object.rotation.set(Math.atan2(behind - ahead, 1.6), f.heading, 0, 'YXZ');
}

// A soft round flake (a radial fade), so the spray reads as powder rather than squares.
function flakeTexture() {
  const size = 32, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2), a = Math.max(0, 1 - d) ** 1.6;
    data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  return texture;
}

// Snow thrown off the edges in a carve or a skid: a small pool of flakes, drawn only.
function createSpray() {
  const count = 260, position = new Float32Array(count * 3).fill(-1e4), velocity = new Float32Array(count * 3), life = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({color: 0xffffff, map: flakeTexture(), size: 0.22, transparent: true, opacity: 0.9,
    alphaTest: 0.05, depthWrite: false}));
  points.name = 'Snow spray';
  points.frustumCulled = false;
  const random = drawingStream(77);
  let next = 0;
  return {
    points,
    update(skier, base, dt) {
      const speed = skier.speed, throwing = skier.grounded && !skier.tumbling && ((skier.carving && speed > 5) || (skier.skidding && speed > 2));
      if (throwing) {
        const n = Math.min(12, Math.round(speed * (skier.skidding ? 0.6 : 0.3)));
        // Snow leaves the outside of the turn: the skier's left in a right turn (+x at heading 0).
        const side = skier.edge >= 0 ? 1 : -1, hx = Math.sin(skier.heading), hz = Math.cos(skier.heading), lx = hz * side, lz = -hx * side;
        for (let k = 0; k < n; k++) {
          const i = next; next = (next + 1) % count;
          position.set([skier.x - hx * 0.6 + lx * 0.3, skier.y - base + 0.05, skier.z - hz * 0.6 + lz * 0.3], i * 3);
          const out = 1.5 + random() * 2.5;
          velocity.set([lx * out + hx * speed * 0.3 + (random() - 0.5), 1 + random() * 2, lz * out + hz * speed * 0.3 + (random() - 0.5)], i * 3);
          life[i] = 0.5 + random() * 0.4;
        }
      }
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) { position[i * 3 + 1] = -1e4; continue; }
        velocity[i * 3 + 1] -= 9.81 * dt;
        position[i * 3] += velocity[i * 3] * dt; position[i * 3 + 1] += velocity[i * 3 + 1] * dt; position[i * 3 + 2] += velocity[i * 3 + 2] * dt;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() { geometry.dispose(); points.material.map.dispose(); points.material.dispose(); },
  };
}

// The Summit world seen once from the backdrop's eye, turned to the valley, into a cube (half floats, so the light keeps
// its range and is tone mapped once, with the zone).
function captureBackdrop(renderer, world, pad, high) {
  const target = new THREE.WebGLCubeRenderTarget(high ? SKI_BACKDROP.face.high : SKI_BACKDROP.face.performance, {type: THREE.HalfFloatType});
  const eye = backdropEye(pad), cube = new THREE.CubeCamera(1, 6000, target);
  cube.position.set(eye.x, eye.y, eye.z);
  cube.rotation.y = eye.turn;
  cube.update(renderer, world);
  return target;
}

function disposeOwned(root, keep) {
  root.traverse(node => {
    if (node.isInstancedMesh) { node.dispose(); return; }
    if (node.geometry && !keep.has(node.geometry)) node.geometry.dispose();
    for (const material of [node.material].flat().filter(Boolean)) if (!keep.has(material)) { material.map?.dispose(); material.dispose(); }
  });
}

// renderer: the game's renderer. yetiAssets: render3d's yeti loader (shared, so the model loads once). loadModel:
// tests pass their own. The scene of a run is built on its first frame and kept while the same run is skied.
export function createSkiView({renderer = null, yetiAssets = null, loadModel = defaultLoad} = {}) {
  const models = new Map(), shared = new Set();
  let loading = null, loadError = '', visit = null, disposed = false, yaw = NaN, snowMap = null;
  function loadModels() {
    if (loading) return loading;
    loading = Promise.all(MODEL_IDS.map(async id => {
      const gltf = await loadModel(id);
      if (disposed) return;
      models.set(id, gltf.scene);
      gltf.scene.traverse(node => { if (node.geometry) shared.add(node.geometry); for (const m of [node.material].flat().filter(Boolean)) shared.add(m); });
    })).catch(reason => { loadError = String(reason?.message ?? reason); });
    return loading;
  }
  function clear() {
    if (!visit) return;
    disposeOwned(visit.scene, shared);
    visit.spray.dispose();
    visit.backdrop?.dispose();
    visit.mixer?.stopAllAction();
    visit = null;
  }
  function build(run) {
    const zone = skiZone(run.run), base = zone.drop.y, scene = new THREE.Scene();
    scene.name = `Ski zone: ${zone.name}`;
    snowMap ??= snowTexture();
    const snow = new THREE.Mesh(snowGeometry(zone, base), new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.82, metalness: 0,
      bumpMap: snowMap, bumpScale: 0.6}));
    snow.name = 'Snow';
    snow.receiveShadow = true;
    shared.add(snowMap);
    scene.add(snow, padRings(zone, base));
    const hemi = new THREE.HemisphereLight(0xdfeaff, 0xf2f4fa, 1.15), sun = new THREE.DirectionalLight(0xfff4e2, 2.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 140});
    sun.shadow.bias = -0.0004;
    scene.add(hemi, sun, sun.target);
    const stashes = stashFields(zone, base), spray = createSpray();
    scene.add(stashes, spray.points);
    visit = {run: run.run, zone, base, scene, sun, stashes, spray, camera: new THREE.PerspectiveCamera(58, 1, 0.15, 3200),
      dressed: false, figures: null, yeti: null, mixer: null, backdrop: null, fog: null};
  }
  // The models arrive once; each zone is dressed with them on the first frame they are there.
  function dress() {
    if (!visit || visit.dressed || models.size < MODEL_IDS.length) return;
    const {zone, base, scene} = visit;
    scene.add(courseGroup(zone, base, models));
    const poses = new Map(MODEL_IDS.filter(id => id.startsWith('skier-')).map(id => [id, figure(models.get(id))]));
    const skier = new THREE.Group();
    skier.name = 'Skier';
    for (const [id, pose] of poses) { pose.name = id; pose.visible = id === 'skier-stand'; skier.add(pose); }
    const ghost = figure(models.get('guide'), {ghost: true});
    ghost.name = "The guide's ghost";
    const guide = figure(models.get('guide')), guests = ['guest-1', 'guest-2', 'guest-3', 'guest-4'].map(id => figure(models.get(id)));
    guide.name = 'The guide';
    const group = new THREE.Group();
    group.name = 'The group';
    group.add(guide, ...guests);
    scene.add(skier, ghost, group);
    visit.figures = {skier, poses, ghost, guide, guests, group};
    visit.dressed = true;
  }
  // The yeti watches the powder bowl from its rocks (the roadside yeti's model; scenery only, its idle on a loop).
  function placeYeti() {
    if (!visit || visit.zone.id !== 'powder' || visit.yeti || !yetiAssets) return;
    if (yetiAssets.status === 'idle') yetiAssets.load();
    if (yetiAssets.status !== 'ready') return;
    const {zone, base, scene} = visit, {scene: yeti, animations} = yetiAssets.clone('low');
    const rock = new THREE.MeshStandardMaterial({color: 0x6f6a66, roughness: 0.95}), rocks = new THREE.Group();
    rocks.name = "The yeti's rocks";
    const random = drawingStream(1989);
    for (let i = 0; i < YETI.rocks; i++) {
      const r = 1.6 + random() * 2.2, x = YETI.x + (random() - 0.5) * 9, z = YETI.z + (random() - 0.5) * 9;
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rock);
      mesh.position.set(x, zone.ground(x, z) - base + r * 0.35, z);
      mesh.rotation.set(random() * 3, random() * 3, random() * 3);
      mesh.castShadow = mesh.receiveShadow = true;
      rocks.add(mesh);
    }
    const top = zone.ground(YETI.x, YETI.z) - base + 1.4;
    yeti.position.set(YETI.x, top, YETI.z);
    const line = zone.line.reduce((best, p) => Math.abs(p.z - YETI.z) < Math.abs(best.z - YETI.z) ? p : best);
    yeti.rotation.y = Math.atan2(line.x - YETI.x, line.z - YETI.z);
    yeti.name = 'The yeti, watching';
    yeti.traverse(node => { if (node.isMesh) node.castShadow = true; });
    const mixer = new THREE.AnimationMixer(yeti), idle = animations.find(clip => clip.name === 'idle');
    if (idle) mixer.clipAction(idle).play();
    scene.add(rocks, yeti);
    visit.yeti = yeti; visit.mixer = mixer;
  }
  return {
    get status() { return loadError ? 'error' : models.size === MODEL_IDS.length ? 'ready' : loading ? 'loading' : 'idle'; },
    get error() { return loadError; },
    get scene() { return visit?.scene ?? null; },
    get camera() { return visit?.camera ?? null; },
    reset() { clear(); yaw = NaN; },
    // The camera for this frame in the zone's frame, or null with no run.
    pose(view, {cameraMode = 0, dt = 1 / 60} = {}) {
      const run = view?.ski?.run;
      if (disposed || !run || view.phase !== 'skiing') { if (visit) clear(); yaw = NaN; return null; }
      loadModels();
      if (!visit || visit.run !== run.run) { clear(); yaw = NaN; build(run); }
      const zone = visit.zone, mode = SKI_CAMERA_VIEWS[((cameraMode % 3) + 3) % 3];
      yaw = followYaw(yaw, run.skier.heading, dt);
      const camera = skiCameraPose({skier: run.skier, mode, yaw, ground: zone.ground});
      return {mode, camera, fov: camera.fov};
    },
    // Draws the frame: the zone over its backdrop. mainScene: the Summit world, captured on the run's first frame.
    render({view, pose, mainScene, aspect = 16 / 9, high = true, seconds = 0, dt = 1 / 60}) {
      if (disposed || !visit || !pose) return false;
      const run = view.ski.run, {zone, base, scene, camera, sun} = visit;
      dress(); placeYeti();
      const s = run.skier;
      if (visit.figures) {
        const {skier, poses, ghost, guide, guests, group} = visit.figures, id = skierPose(s);
        for (const [name, object] of poses) object.visible = name === id;
        skier.position.set(s.x, s.y - base, s.z);
        if (s.grounded) placeFigure(skier, s, base, zone.ground);
        else skier.rotation.set(s.flip * DEG, s.heading + s.spin * DEG, 0, 'YXZ');
        const timedGhost = run.kind === 'timed' && run.ghost && !run.group;
        ghost.visible = !!timedGhost;
        if (timedGhost) placeFigure(ghost, run.ghost, base, zone.ground);
        group.visible = !!run.group;
        if (run.group) { placeFigure(guide, run.group.guide, base, zone.ground); run.group.guests.forEach((g, i) => placeFigure(guests[i], g, base, zone.ground)); }
      }
      for (const field of visit.stashes.children) {
        const found = run.stashes.includes(field.userData.stash);
        field.material.emissiveIntensity = found ? 0 : 0.28 + 0.12 * Math.sin(seconds * 3 + field.position.x);
        field.material.opacity = found ? 0.25 : 0.92;
      }
      visit.spray.update(s, base, clamp(dt, 0, 0.1));
      visit.mixer?.update(clamp(dt, 0, 0.1));
      // The sun keeps its angle and follows the skier, so the shadow under the skis stays sharp.
      sun.position.set(s.x + 30, s.y - base + 60, s.z - 25);
      sun.target.position.set(s.x, s.y - base, s.z);
      if (!visit.fog) visit.fog = scene.fog = new THREE.Fog(mainScene?.fog?.color?.clone() ?? new THREE.Color(0xdfe8f2), 260, 1700);
      camera.fov = pose.camera.fov;
      camera.aspect = aspect;
      camera.position.set(pose.camera.position.x, pose.camera.position.y - base, pose.camera.position.z);
      camera.lookAt(pose.camera.target.x, pose.camera.target.y - base, pose.camera.target.z);
      camera.updateProjectionMatrix();
      if (!renderer) return true;
      if (!visit.backdrop && mainScene) visit.backdrop = captureBackdrop(renderer, mainScene, run.world, high);
      if (visit.backdrop) scene.background = visit.backdrop.texture;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return true;
    },
    dispose() {
      if (disposed) return;
      clear();
      disposed = true;
      for (const root of models.values()) root.traverse(node => { node.geometry?.dispose(); for (const m of [node.material].flat().filter(Boolean)) { m.map?.dispose(); m.dispose(); } });
      models.clear();
      snowMap?.dispose();
    },
  };
}

// ---- The run HUD ----------------------------------------------------------------------------------------------

const STYLE_ID = 'ski-ui-style';
const RESULT_AFTER_PICKUP = 8;
const POWDER_CARD_SECONDS = 10;
// The run's page parts over the zone: the top line, the speed, the targets, the loading and result cards, the key strip,
// the help (H) and the run's two buttons. host: the stage. app: the game (its ski calls and its help switch).
export function createSkiHud({host, app}) {
  const doc = host.ownerDocument;
  if (doc?.head && !doc.getElementById(STYLE_ID)) {
    const link = doc.createElement('link');
    link.id = STYLE_ID; link.rel = 'stylesheet'; link.href = new URL('./ski-ui.css', import.meta.url).href;
    doc.head.append(link);
  }
  const root = doc.createElement('section');
  root.className = 'ski-hud';
  root.hidden = true;
  root.setAttribute('aria-label', 'Heli-skiing');
  root.innerHTML = `<div class="ski-line" role="status"></div><div class="ski-speed"><b>0</b><small>KM/H</small></div><div class="ski-targets-host"></div>
    <div class="ski-buttons"><span class="ski-view-name"></span><button type="button" data-ski-action="restart">Start again</button><button type="button" data-ski-action="leave">Leave the run</button></div>
    <div class="ski-card-host"></div><p class="ski-keys"></p><div class="ski-help" hidden></div>`;
  host.append(root);
  const line = root.querySelector('.ski-line'), speed = root.querySelector('.ski-speed b'), targets = root.querySelector('.ski-targets-host');
  const cards = root.querySelector('.ski-card-host'), keys = root.querySelector('.ski-keys'), help = root.querySelector('.ski-help');
  const viewName = root.querySelector('.ski-view-name'), buttons = root.querySelector('.ski-buttons');
  const set = (node, html) => { if (node.dataset.html !== html) { node.innerHTML = html; node.dataset.html = html; } };
  let result = null, recorded = null, until = 0, snow = null, disposed = false;
  const click = event => {
    const button = event.target.closest('[data-ski-action]');
    if (!button) return;
    app.heliSki?.(button.dataset.skiAction === 'restart' ? 'restart' : 'leave');
    button.blur();
  };
  root.addEventListener('click', click);
  keys.textContent = skiControlsHelp().filter(([, , word]) => word).map(([key, , word]) => `${key.split(' / ')[0]} ${word}`).join(' · ');
  set(help, `<h3>SKIING</h3><dl>${skiControlsHelp().map(([key, what]) => `<div><dt>${key}</dt><dd>${what}</dd></div>`).join('')}</dl>`);
  return {
    // The day's snow, from the run menu the skier stepped out of (the session offers it only on the pad).
    set snow(value) { snow = value ?? null; },
    // The session's events, as the helicopter panel sees them arrive.
    event(event) {
      if (event.type === 'skiResult') { result = event; recorded = null; }
      else if (event.type === 'skiRecorded') recorded = event;
      else if (event.type === 'skiRestart' || event.type === 'skiStepOut') { result = null; recorded = null; }
    },
    // view: the helicopter session's view. Returns whether the HUD shows.
    update(view, now = performance.now() / 1000) {
      if (disposed) return false;
      const run = view?.phase === 'skiing' ? view.ski?.run ?? null : null;
      if (run) until = now + RESULT_AFTER_PICKUP;
      const showing = !!run || (result !== null && now < until && view?.phase === 'flying');
      root.hidden = !showing;
      if (!showing) { if (now >= until) { result = null; recorded = null; } return false; }
      if (run) {
        set(line, `<b>${escape(run.name.toUpperCase())}</b>${runLineMarkup(run)}`);
        const kmh = String(Math.round(run.skier.speed * KMH));
        if (speed.textContent !== kmh) speed.textContent = kmh;
        set(targets, targetsMarkup(run.limits));
        viewName.textContent = `VIEW ${SKI_CAMERA_VIEWS[((app.skiCamera ?? 0) % 3 + 3) % 3].toUpperCase()} (C)`;
      }
      buttons.hidden = !run;
      line.hidden = !run; root.querySelector('.ski-speed').hidden = !run; targets.hidden = !run; keys.hidden = !run;
      const loading = run && !run.started && !run.finished && (run.kind !== 'free' || run.t < POWDER_CARD_SECONDS);
      set(cards, result ? resultCardMarkup(result, recorded, {waiting: !!run}) : loading ? loadingCardMarkup(run, {snow}) : '');
      help.hidden = !(run && app.skiHelp === true);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeEventListener('click', click);
      root.remove();
    },
  };
}
