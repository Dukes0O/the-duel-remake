// SKIN-VIEW (docs/HELI_WILDLIFE.md sections 5, 6, 7 and 12): how Kestrel One wears a skin.
// The pure parts (which paint and gear a skin shows, the grime's colour and strength, the winch's
// half turn, the heat camera's plot) and then the real model and gear files, loaded in node with
// the real three.js types and fake textures: paint on the hull, gear on its mounts, the logo
// patches, the fades, the wash and the way everything goes back. No screen, no clock, no random.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SKINS} from '../src/heli/heli-skins.js';
import {SKIN_KINDS, RANK_SKIN_KINDS} from '../src/heli/heli-save.js';
import {PAINTS, paintOf, GEAR_VIEW, GEAR_WITHOUT_MODEL, gearPiecesFor, grimeLook, GRIME_COLOURS, GRIME_MASKS, LOGO, FADE_SECONDS,
  heatBlips, createHeatInset, createSkinView, GRIME_FILM} from '../src/heli/heli-skin-view.js';
import {cameraName, instrumentsMarkup} from '../src/heli/heli-ui.js';
import {createHeliView} from '../src/heli/heli-scene.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, label, tolerance = 1e-6) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`); checks++; };
const root = new URL('../', import.meta.url);
const palettes = JSON.parse(readFileSync(new URL('public/assets/heli/skins/palettes.json', root), 'utf8'));
const SEVEN = ['stock', 'fire', 'medevac', 'rescue', 'wildlife', 'supply', 'tv'];

// ---- the paints are the recipe's table ----
{
  same(Object.keys(PAINTS), SEVEN, 'seven paints');
  same(SEVEN.slice(1), [...SKIN_KINDS].filter(kind => SEVEN.includes(kind)), 'each is a skin the game knows (stock is always owned)');
  for (const kind of SEVEN) {
    const wanted = palettes.skins[kind], paint = paintOf(kind);
    ok(paint, `${kind} has a paint`);
    for (const role of ['body', 'lower', 'stripe']) {
      const camo = wanted[role].endsWith('.jpg');
      if (camo) ok(paint.camo, `${kind} ${role} is camouflage like palettes.json`);
      else eq(paint[role], wanted[role], `${kind} ${role} colour is palettes.json's`);
    }
    eq(paint.decal, !!wanted.decal, `${kind}: the logo is on the TV skin only`);
  }
  eq(PAINTS.wildlife.camo, true, 'the wildlife skin is camouflage');
  eq(PAINTS.wildlife.stripe, palettes.skins.wildlife.stripe, 'its stripe is plain dark green');
  eq(PAINTS.tv.stripe, '#b8902e', 'the TV stripe is gold');
  eq(Object.isFrozen(PAINTS) && Object.isFrozen(PAINTS.tv), true, 'the table is frozen');
  for (const rank of RANK_SKIN_KINDS) eq(paintOf(rank), null, `${rank}: a rank coat is the logbook's, not painted here`);
  for (const bad of [undefined, null, 'nope', '', 7, '__proto__', 'constructor']) eq(paintOf(bad), null, `${String(bad)} is no paint`);
  eq(LOGO.size, palettes.skins.tv.decal.size, 'the logo is the palette size');
  for (const kind of Object.keys(GRIME_COLOURS)) {
    eq(GRIME_COLOURS[kind], palettes.grime[kind].colour, `${kind} grime colour is palettes.json's`);
    eq(GRIME_MASKS[kind], palettes.grime[kind].mask, `${kind} mask file is palettes.json's`);
    ok(existsSync(new URL('public/assets/heli/skins/' + GRIME_MASKS[kind], root)), `${kind} mask file exists`);
  }
  ok(existsSync(new URL('public/assets/heli/skins/camo.jpg', root)) && existsSync(new URL('public/assets/heli/barely-news.svg', root)), 'camo and logo files exist');
}

// ---- the gear each skin shows ----
{
  const files = skin => gearPiecesFor(skin).map(piece => piece.file.split('/').pop());
  same(files('stock'), [], 'stock paint carries no gear');
  same(files('fire'), ['drop-sight.glb'], 'fire service: the drop sight (the gauge is a panel number)');
  same(files('medevac'), ['winch.glb'], 'medevac: the winch (the stretcher hangs on the line)');
  same(files('rescue'), ['searchlight.glb', 'heat-camera.glb'], 'search and rescue: searchlight and heat camera');
  same(files('wildlife'), ['main-rotor-quiet.glb', 'zoom-camera.glb'], 'wildlife: quiet rotor and zoom camera');
  same(files('supply'), ['cargo-net.glb'], 'supply: the net with its heavy hook, drawn once');
  same(files('tv'), ['nose-camera.glb'], 'TV: the nose camera');
  for (const rank of RANK_SKIN_KINDS) same(files(rank), [], `${rank}: no gear`);
  same(files('nope'), [], 'unknown coat: none');
  // Every piece of gear in the rules is either drawn from a file or named as having none.
  const ids = new Set(Object.values(SKINS).flatMap(skin => skin.gear));
  for (const id of ids) ok(GEAR_VIEW[id] || GEAR_WITHOUT_MODEL.includes(id), `${id} is drawn or named as drawn elsewhere`);
  for (const id of GEAR_WITHOUT_MODEL) ok(!GEAR_VIEW[id], `${id} has no model to fit`);
  for (const [id, piece] of Object.entries(GEAR_VIEW)) {
    ok(existsSync(new URL('public' + piece.file, root)), `${id}: the model file exists`);
    ok(['mount_nose', 'mount_belly', 'mount_side_right', 'cable_hook', 'main_rotor'].includes(piece.mount), `${id}: a node the model has`);
  }
  // The winch's half turn about the vertical axis at the side mount; nothing else is turned.
  eq(GEAR_VIEW.winch.mount, 'mount_side_right', 'the winch goes on the right side');
  eq(GEAR_VIEW.winch.turn, Math.PI, 'and turns half a turn');
  for (const [id, piece] of Object.entries(GEAR_VIEW)) if (id !== 'winch') eq(piece.turn, 0, `${id} fits as built`);
  eq(GEAR_VIEW['heat-camera'].mount, 'mount_belly', 'the heat camera is on the belly');
  ok(GEAR_VIEW.searchlight.offset[2] !== GEAR_VIEW['heat-camera'].offset[2], 'the searchlight does not sit on top of the heat camera');
}

// ---- the grime: colour and strength from the four levels ----
{
  const clean = grimeLook({dust: 0, mud: 0, soot: 0, salt: 0});
  eq(clean.strength, 0, 'clean: no strength'); eq(clean.colour, null, 'clean: no colour');
  same(clean.cover, [0, 0, 0, 0], 'clean: no cover');
  eq(grimeLook(undefined).strength, 0, 'no dirt record: clean');
  eq(grimeLook({dust: 'a', mud: NaN, soot: -5, salt: Infinity}).strength, 0, 'nonsense levels are no dirt');
  const eighty = grimeLook({dust: 50, mud: 30, soot: 0, salt: 0});
  near(eighty.strength, 0.8, 'grime 80 is 0.8'); same(eighty.cover, [0.5, 0.3, 0, 0], 'each kind covers its own share');
  const dust = grimeLook({dust: 100, mud: 0, soot: 0, salt: 0});
  eq(dust.strength, 1, 'full dust is full grime');
  const hex = colour => '#' + colour.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  eq(hex(dust.colour), '#8a7a5e', 'all dust is the dust colour');
  eq(hex(grimeLook({dust: 0, mud: 0, soot: 100, salt: 0}).colour), '#1c1a18', 'all soot is the soot colour');
  const half = grimeLook({dust: 0, mud: 0, soot: 40, salt: 40});
  near(half.colour[0], (0x1c + 0xd8) / 2 / 255, 'half soot and half salt mix to the middle', 1e-9);
  const small = grimeLook({dust: 10, mud: 0, soot: 0, salt: 0});
  near(small.strength, 0.1, 'a little dust is little grime');
  eq(hex(small.colour), '#8a7a5e', 'but the colour is still the dust colour (colour is by share, strength by amount)');
  const over = grimeLook({dust: 100, mud: 100, soot: 0, salt: 0});
  eq(over.strength, 1, 'more than 100 is capped'); same(over.cover, [0.5, 0.5, 0, 0], 'and scaled to fit');
  for (let level = 0; level <= 100; level += 10) ok(grimeLook({dust: level, mud: 0, soot: 0, salt: 0}).strength >= grimeLook({dust: Math.max(0, level - 10), mud: 0, soot: 0, salt: 0}).strength, 'more dirt is never less strength');
}

// ---- the heat camera's plot ----
{
  const gear = {heatRange: 150, heatBuriedRange: 30, heatAnimals: true};
  const heli = {x: 100, y: 50, z: 200, heading: 0};
  const view = {heli, skins: {gear, heat: [{kind: 'hiker', x: 100, z: 260, distance: 60}, {kind: 'driver', x: 160, z: 200, distance: 60}]}, survey: {heat: [{id: 'm1', x: 100, z: 110, distance: 90}]}};
  const spots = heatBlips(view);
  eq(spots.length, 3, 'two people and an animal');
  const hiker = spots.find(spot => spot.kind === 'person' && spot.ahead > 0.3), driver = spots.find(spot => spot.kind === 'person' && Math.abs(spot.right) > 0.3), animal = spots.find(spot => spot.kind === 'animal');
  near(hiker.ahead, 0.4, 'the hiker is 60 m of 150 ahead'); near(hiker.right, 0, 'and dead ahead');
  near(driver.right, -0.4, 'at heading 0 world +X is on the left (nose is +Z)'); near(driver.ahead, 0, 'level with the helicopter');
  near(animal.ahead, -0.6, 'the animal is behind');
  // Turned to face +X, the same driver is straight ahead.
  const turned = heatBlips({...view, heli: {...heli, heading: Math.PI / 2}}, []);
  const ahead = turned.find(spot => spot.kind === 'person' && spot.ahead > 0.3);
  near(ahead.ahead, 0.4, 'heading-up: facing +X puts the driver ahead'); near(ahead.right, 0, 'and centred');
  eq(heatBlips({...view, skins: {...view.skins, gear: {...gear, heatAnimals: false}}}).length, 2, 'animals only with the camera that shows them');
  eq(heatBlips({...view, skins: {...view.skins, gear: {...gear, heatRange: 0}}}).length, 0, 'no camera, nothing');
  eq(heatBlips({heli}).length, 0, 'no skins view, nothing');
  eq(heatBlips({skins: view.skins}).length, 0, 'no helicopter, nothing');
  eq(heatBlips({...view, skins: {...view.skins, heat: [{x: 100, z: 360}]}}, []).length, 1, 'beyond the camera range is not plotted (only the animal remains)');
  const reuse = []; const first = heatBlips(view, reuse), spot = first[0];
  eq(heatBlips(view, reuse), reuse, 'the same list is filled again'); eq(reuse[0], spot, 'with the same spots');
  // The inset: a fake page, so it only has to decide when to show.
  const calls = [];
  const context = new Proxy({}, {get: (_, name) => name === 'createRadialGradient' ? () => ({addColorStop() {}}) : (...args) => { calls.push(name); }, set: () => true});
  const fakeDoc = {createElement: tag => ({tag, width: 0, height: 0, hidden: false, className: '', children: [], append(child) { this.children.push(child); }, setAttribute() {}, getContext: () => context, remove() {}})};
  const host = {children: [], append(child) { this.children.push(child); }};
  const inset = createHeatInset({doc: fakeDoc, host});
  ok(inset.wrap.hidden, 'the inset starts hidden');
  eq(inset.update(null), 0, 'no view: nothing'); ok(inset.wrap.hidden, 'and hidden');
  eq(inset.update(view), 3, 'worn: three warm things'); ok(!inset.wrap.hidden, 'shown'); eq(inset.label, '3 WARM', 'counted on the screen');
  eq(inset.update({...view, skins: {...view.skins, gear: {heatRange: 0}}}), 0, 'taken off: gone'); ok(inset.wrap.hidden, 'hidden again');
  ok(calls.includes('drawImage'), 'it draws');
}

// ---- the camera view name ----
{
  const tv = {skins: {gear: {noseCamera: true}}}, stock = {skins: {gear: {noseCamera: false}}};
  eq(cameraName(tv, 4), 'nose', 'the TV skin has a fifth view'); eq(cameraName(tv, 5), 'behind', 'and wraps after it');
  eq(cameraName(stock, 4), 'behind', 'stock: four views'); eq(cameraName({}, 3), 'side', 'no skins view: four views');
  ok(instrumentsMarkup({readout: {altitudeFt: 1, altitudeM: 1, heightFt: 1, heightM: 1, airspeedKts: 0, climbFpm: 0, climbMs: 0, rotorPct: 100, fuelKg: 100, weightKg: 1000, maxLiftKg: 2000, headingDeg: 0, pitchDeg: 0, rollDeg: 0, engine: true}, ...tv}, {cameraIndex: 4}).includes('VIEW NOSE'), 'the status line says NOSE on the fifth view');
}

// ---- the real model ----
const read = url => readFileSync(new URL('public' + url, root));
const parse = url => { const bytes = read(url); return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '').then(gltf => gltf.scene); };
const asked = [];
const fakeTexture = url => { asked.push(url); const texture = new THREE.Texture(); texture.name = url; return Promise.resolve(texture); };
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const frames = (view, skins, seconds, dt = 1 / 30) => { for (let t = 0; t < seconds - 1e-9; t += dt) view.update(skins, dt); };
const names = model => { const paint = []; model.traverse(o => { if (o.isMesh) paint.push(o); }); return paint; };
const hex = color => color.getHexString();
const skins = (worn, extra = {}) => ({worn, dirt: {dust: 0, mud: 0, soot: 0, salt: 0}, grime: 0, gear: {}, ...extra});

{
  const model = await parse('/assets/heli/kestrel-one.glb');
  const rotor = model.getObjectByName('main_rotor'), hook = model.getObjectByName('cable_hook');
  const view = createSkinViewFor(model);
  function createSkinViewFor(m) { const v = createSkinView({THREE, load: parse, loadTexture: fakeTexture}); v.attach(m, {rotor: m.getObjectByName('main_rotor'), hook: m.getObjectByName('cable_hook')}); return v; }
  const slots = view.paintSlots;
  eq(slots.length, 3, 'the hull has three paint materials: body, lower, stripe');
  same(slots.map(slot => slot.base.name).sort(), ['paint_navy', 'paint_red', 'paint_white'], 'the right three');
  const baseOf = () => slots.map(slot => slot.mesh.material);
  const original = slots.map(slot => slot.base);
  const originalColours = original.map(material => hex(material.color));

  // Switch off (null): the model is exactly as it was loaded.
  view.update(null);
  same(baseOf(), original, 'switch off: the model keeps its own materials'); eq(asked.length, 0, 'switch off: nothing loaded');
  eq(view.state().active, false, 'and nothing is active');

  // Stock paint, no dirt: still the model's own materials, no texture, no gear.
  view.update(skins('stock'), 1 / 60); await settle();
  same(baseOf(), original, 'stock and clean: the model keeps its own materials exactly'); eq(asked.length, 0, 'stock and clean: nothing loaded');
  eq(view.state().gear.length, 0, 'stock: no gear');
  same(original.map(material => hex(material.color)), originalColours, 'and the model materials are untouched');

  // A coat: clones carry the paint, the model's own materials are never changed.
  view.update(skins('fire'), 1 / 60); await settle(); frames(view, skins('fire'), FADE_SECONDS + 0.1);
  ok(baseOf().every((material, i) => material !== original[i] && material.name === original[i].name + '_skin'), 'fire: the hull wears copies');
  const paintOfHull = () => Object.fromEntries(slots.map(slot => [slot.base.name, hex(slot.mesh.material.color)]));
  same(paintOfHull(), {paint_white: 'a8261c', paint_navy: 'e2a51c', paint_red: 'ecebe5'}, 'fire service: red, yellow, white once the coat has faded in');
  same(original.map(material => hex(material.color)), originalColours, 'the model\'s own materials are never changed');
  eq(new Set(slots.map(slot => slot.mesh.material)).size, 3, 'one copy per paint, shared by every mesh');
  eq(asked.length, 0, 'a plain paint loads no texture');
  ok(view.state().gear.length === 1 && model.getObjectByName('mount_belly').children.length === 1, 'fire: the drop sight on the belly mount');

  // A change of coat fades over 1.5 seconds.
  view.update(skins('medevac'), 1 / 60);
  const mid = (frames(view, skins('medevac'), FADE_SECONDS / 2 - 1 / 60), view.state().colours[0]);
  ok(mid !== 'a8261c' && mid !== 'ededea', `medevac: half way the body is between red and white (${mid})`);
  frames(view, skins('medevac'), FADE_SECONDS);
  same(paintOfHull(), {paint_white: 'ededea', paint_navy: 'ededea', paint_red: 'b3231c'}, 'medevac: white, white, red after the fade');
  ok(view.state().settled, 'the fade settles, and the frame stops working');
  await settle();

  // The winch: half a turn about the vertical at the side mount, arm reaching outward.
  const side = model.getObjectByName('mount_side_right');
  eq(side.children.length, 1, 'medevac: the winch is on the right-side mount');
  const winch = side.children[0];
  near(winch.rotation.y, Math.PI, 'turned half a turn about the vertical axis'); near(winch.rotation.x, 0, 'and only about it'); near(winch.rotation.z, 0, 'no roll');
  eq(model.getObjectByName('mount_belly').children.length, 0, 'the drop sight is gone');
  model.updateMatrixWorld(true);
  const armTip = winch.getObjectByName('line_out').getWorldPosition(new THREE.Vector3()), mountAt = side.getWorldPosition(new THREE.Vector3());
  ok(armTip.x < mountAt.x - 0.9, `the arm reaches outward from the right-hand hull (tip x ${armTip.x.toFixed(2)}, mount x ${mountAt.x.toFixed(2)})`);
  const hullHere = (() => { const ray = new THREE.Raycaster(new THREE.Vector3(-3, mountAt.y, mountAt.z), new THREE.Vector3(1, 0, 0)); return ray.intersectObjects(slots.map(s => s.mesh), false)[0]?.point.x; })();
  ok(hullHere !== undefined && Math.abs(hullHere - mountAt.x) < 0.1, `the mount sits on the hull (hull x ${hullHere?.toFixed(2)})`);

  // Search and rescue: the heat camera and the searchlight share the belly without overlapping; the beam shows only when lit.
  view.update(skins('rescue'), 1 / 60); await settle(); view.update(skins('rescue'), 1 / 60);
  const belly = model.getObjectByName('mount_belly');
  eq(belly.children.length, 2, 'rescue: two pieces on the belly');
  const zs = belly.children.map(child => child.position.z).sort();
  ok(zs[1] - zs[0] >= 0.4, 'a searchlight and a heat camera half a metre apart');
  eq(side.children.length, 0, 'and the winch is off');
  const beam = belly.children.map(child => child.getObjectByName('beam')).find(Boolean);
  eq(beam.children.length, 1, 'the beam has its cone'); eq(beam.children[0].visible, false, 'dark: no beam drawn');
  view.update(skins('rescue', {night: {dark: true, nightSeconds: 30, lightOn: true}}), 1 / 60);
  eq(beam.children[0].visible, true, 'night with the light on: the beam is drawn');
  view.update(skins('rescue', {night: {dark: true, nightSeconds: 30, lightOn: false}}), 1 / 60);
  eq(beam.children[0].visible, false, 'light off: no beam');

  // Wildlife: camouflage on body and lower, the quiet rotor in place of the plain one, the zoom camera.
  view.update(skins('wildlife'), 1 / 60); await settle(); frames(view, skins('wildlife'), 2.2);
  ok(asked.includes('/assets/heli/skins/camo.jpg'), 'wildlife asks for the camouflage pattern, once');
  const camoOf = () => Object.fromEntries(slots.map(slot => [slot.base.name, slot.mesh.material.userData.skinCamo.value]));
  same(camoOf(), {paint_white: 1, paint_navy: 1, paint_red: 0}, 'camouflage on body and lower, a plain stripe');
  eq(hex(slots.find(slot => slot.base.name === 'paint_red').mesh.material.color), '2c3a22', 'the stripe is dark green');
  const quiet = rotor.children.find(child => !child.name.startsWith('main_rotor_'));
  ok(quiet && quiet.visible, 'the quiet rotor sits on the main rotor hub');
  const own = rotor.children.filter(child => child !== quiet);
  ok(own.length === 3 && own.every(child => !child.visible), 'and the plain blades are hidden');
  ok(belly.children.length === 1, 'the zoom camera is on the belly');
  view.update(skins('supply'), 1 / 60); await settle();
  ok(own.every(child => child.visible) && !rotor.children.includes(quiet), 'another coat: the plain rotor is back and the quiet one is gone');
  eq(hook.children.length, 1, 'supply: the cargo net hangs from the hook'); eq(belly.children.length, 0, 'the zoom camera is off');
  frames(view, skins('supply'), 2);
  same(paintOfHull(), {paint_white: 'd9671b', paint_navy: 'ededea', paint_red: '161616'}, 'supply: orange, white, black');
  same(camoOf(), {paint_white: 0, paint_navy: 0, paint_red: 0}, 'the camouflage is gone');
  eq(asked.filter(url => url.endsWith('camo.jpg')).length, 1, 'the camouflage texture is loaded once');

  // The TV skin: the logo on both flanks, the nose camera.
  view.update(skins('tv'), 1 / 60); await settle(); view.update(skins('tv'), 1 / 60); frames(view, skins('tv'), 2);
  ok(asked.includes('/assets/heli/barely-news.svg'), 'the TV skin asks for the logo');
  eq(view.state().patches, 2, 'a patch on each flank');
  eq(view.state().decal, 1, 'fully shown');
  const patches = model.children.filter(child => child.name === 'Barely News logo');
  eq(patches.length, 2, 'both patches are on the model');
  const reach = geometry => { const p = geometry.attributes.position; let lo = Infinity, hi = -Infinity, zlo = Infinity, zhi = -Infinity, ylo = Infinity, yhi = -Infinity; for (let i = 0; i < p.count; i++) { lo = Math.min(lo, Math.abs(p.getX(i))); hi = Math.max(hi, Math.abs(p.getX(i))); zlo = Math.min(zlo, p.getZ(i)); zhi = Math.max(zhi, p.getZ(i)); ylo = Math.min(ylo, p.getY(i)); yhi = Math.max(yhi, p.getY(i)); } return {lo, hi, zlo, zhi, ylo, yhi}; };
  const right = patches.find(patch => patch.geometry.attributes.position.getX(0) < 0), left = patches.find(patch => patch.geometry.attributes.position.getX(0) > 0);
  ok(right && left, 'one on each side of the hull');
  for (const patch of [right, left]) {
    const r = reach(patch.geometry);
    ok(r.lo > 0.3 && r.hi < 0.75, `the patch lies on the hull (|x| ${r.lo.toFixed(2)} to ${r.hi.toFixed(2)})`);
    ok(Math.abs((r.zhi - r.zlo) - LOGO.size) < 0.12 && Math.abs((r.yhi - r.ylo) - LOGO.size) < 0.12, 'and is about half a metre across');
  }
  // It sits just off the surface: a ray from outside meets the patch before the hull, a few millimetres apart.
  model.updateMatrixWorld(true);
  const center = (() => { const ray = new THREE.Raycaster(new THREE.Vector3(3, LOGO.y, LOGO.z), new THREE.Vector3(-1, 0, 0)); return {patch: ray.intersectObject(left)[0], hull: ray.intersectObjects(slots.map(s => s.mesh), false)[0]}; })();
  ok(center.patch && center.hull && center.patch.distance < center.hull.distance && center.hull.distance - center.patch.distance < 0.02, 'the logo is a few millimetres off the hull, never inside it');
  eq(left.material, right.material, 'one material for both'); ok(left.material.map?.name.endsWith('barely-news.svg'), 'carrying the logo');
  eq(model.getObjectByName('mount_nose').children.length, 1, 'tv: the nose camera on the nose mount');
  same(paintOfHull(), {paint_white: '141516', paint_navy: '141516', paint_red: 'b8902e'}, 'black, black, gold');
  view.update(skins('stock'), 1 / 60); frames(view, skins('stock'), 2.1);
  eq(view.state().decal, 0, 'back to stock: the logo fades out'); ok(patches.every(patch => !patch.visible), 'and is not drawn');
  same(baseOf(), original, 'stock and clean again: the model\'s own materials are back, exactly');
  eq(model.getObjectByName('mount_nose').children.length, 0, 'the nose camera is off');

  // Grime: nothing loads until there is dirt; each kind loads its own mask; it grows, and the wash takes it off.
  const before = asked.length;
  const dirty = (dust, mud = 0, soot = 0, salt = 0) => skins('stock', {dirt: {dust, mud, soot, salt}, grime: dust + mud + soot + salt});
  view.update(dirty(80), 1 / 60); await settle(); view.update(dirty(80), 1 / 60); frames(view, dirty(80), 2);
  same(asked.slice(before), ['/assets/heli/skins/grime-dust.jpg'], 'dust asks for its mask and no other');
  ok(baseOf().every(material => material.name.endsWith('_skin')), 'a dirty stock coat is drawn on the copies');
  near(view.state().cover[0], 0.8, 'dust covers 0.8'); eq(view.state().cover[1], 0, 'and no mud');
  near(view.state().film, 0.8 * GRIME_FILM, 'a thin film at grime 80');
  // The copies' shader is the grime shader.
  const shader = {uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <lights_physical_fragment>'};
  slots[0].mesh.material.onBeforeCompile(shader);
  ok(shader.uniforms.uCover && shader.uniforms.uMaskDust && shader.uniforms.uCamo, 'the copies carry the grime and camouflage uniforms');
  ok(shader.fragmentShader.includes('skinLayer') && shader.vertexShader.includes('vSkinPos'), 'drawn from the model\'s own axes');
  eq(shader.uniforms.uCover.value.x, 0.8, 'the dust cover is what the dirt says');
  view.update(dirty(0, 30, 50), 1 / 60); await settle(); view.update(dirty(0, 30, 50), 1 / 60);
  ok(asked.includes('/assets/heli/skins/grime-mud.jpg') && asked.includes('/assets/heli/skins/grime-soot.jpg'), 'mud and soot ask for theirs');
  ok(!asked.includes('/assets/heli/skins/grime-salt.jpg'), 'salt does not until there is salt');
  frames(view, dirty(0, 30, 50), 1.6);
  near(shader.uniforms.uCover.value.y, 0.3, 'mud cover'); near(shader.uniforms.uCover.value.z, 0.5, 'soot cover'); eq(shader.uniforms.uCover.value.x, 0, 'the dust is gone');
  // A wash takes about 1.5 seconds, then the model's own materials return.
  view.update(dirty(0), 1 / 60); frames(view, dirty(0), 0.7);
  ok(shader.uniforms.uCover.value.z > 0 && shader.uniforms.uCover.value.z < 0.5, 'half way through the wash there is still some grime');
  ok(baseOf().every(material => material.name.endsWith('_skin')), 'still on copies');
  frames(view, dirty(0), 1.6);
  same(baseOf(), original, 'washed and stock: the model\'s own materials');
  eq(view.state().cover.every(value => value === 0) && view.state().film === 0, true, 'no grime left');
  eq(asked.filter(url => url.includes('grime-dust')).length, 1, 'each mask is loaded once');

  // Grime sits on a coat too, and a rank coat is left to the logbook.
  view.update(skins('fire', {dirt: {dust: 20, mud: 0, soot: 0, salt: 0}}), 1 / 60); frames(view, skins('fire', {dirt: {dust: 20, mud: 0, soot: 0, salt: 0}}), 2);
  eq(view.state().worn, 'fire', 'a coat and grime together');
  view.update(skins('rank-student'), 1 / 60);
  same(baseOf(), original, 'a rank coat: this file draws nothing'); eq(view.state().gear.length, 0, 'and no gear'); eq(view.state().active, false, 'inactive');
  view.update(skins('fire'), 1 / 60); frames(view, skins('fire'), 0.1);
  same(paintOfHull(), {paint_white: 'a8261c', paint_navy: 'e2a51c', paint_red: 'ecebe5'}, 'coming back from a rank coat paints at once (no fade from nothing)');
  // The switch going off puts everything back.
  view.update(null);
  same(baseOf(), original, 'switch off: the model keeps its own materials'); eq(model.getObjectByName('mount_belly').children.length, 0, 'switch off: gear off');
  same(original.map(material => hex(material.color)), originalColours, 'the model\'s own colours are still untouched');
  view.dispose();
  eq(slots.length, 0, 'disposed');
}

// ---- the scene hands the worn gear to the camera, and draws nothing with the switch off ----
{
  const scene = new THREE.Scene();
  const heliView = createHeliView({THREE, scene, vehicleAssets: {status: () => 'error', load: () => Promise.resolve(false), create: () => null}, load: parse, skinTexture: fakeTexture});
  const base = {heli: {x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, rotor: 0, groundY: 0}, loads: []};
  heliView.update(base);
  for (let i = 0; i < 40 && heliView.modelStatus !== 'ready'; i++) await settle();
  eq(heliView.modelStatus, 'ready', 'the model loads');
  eq(heliView.update(base, {cameraIndex: 4}).camera.name, 'behind', 'no skins view: four views, as today');
  eq(heliView.skinView.state().active, false, 'and the skins are inactive');
  eq(heliView.update({...base, skins: skins('stock', {gear: {noseCamera: false}})}, {cameraIndex: 4}).camera.name, 'behind', 'stock paint: four views');
  const tv = heliView.update({...base, skins: skins('tv', {gear: {noseCamera: true}})}, {cameraIndex: 4}).camera;
  eq(tv.name, 'nose', 'the TV skin\'s fifth view is the nose camera'); near(tv.target.y, tv.position.y, 'looking level along the horizon');
  eq(heliView.skinView.state().worn, 'tv', 'the frame also paints the skin');
  heliView.update(base);
  eq(heliView.skinView.state().active, false, 'a frame without the skins view puts it all back');
  heliView.dispose();
}

console.log(`heli-skin-view: ${checks} checks pass (paints, gear on mounts, the winch half turn, grime colour and strength, the heat plot, fades, the wash, the logo patches, restoration)`);
