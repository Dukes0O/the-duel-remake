import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createUnlockedVehicle} from '../../unlock-vehicles.js';
import {KESTREL, GRAVITY, PAD, padForces, padLoad, padOutcome} from '../benches/lift-pad.js';
import {createCollectiveInset} from './collective-inset.js';

const WAITING_CRATE = [-1.25, .12, .55];

export const trialInput = (input, index = 0) => ({fuel: KESTREL.tankKg, crates: index === 1 ? 1 : 0, car: 0, collective: 0, ...input});
export function rotorBlades(rotor) {
  const blades = [];
  rotor?.traverse(mesh => {
    if (!mesh.geometry) return;
    mesh.geometry = mesh.geometry.clone();
    blades.push({mesh, original: mesh.geometry.attributes.position.array.slice()});
  });
  return blades;
}
export function pitchBlades(blades, collective) {
  for (const {mesh, original} of blades) {
    if (mesh.userData.pitch === collective) continue;
    mesh.userData.pitch = collective;
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = original[i * 3], y = original[i * 3 + 1], z = original[i * 3 + 2];
      const angle = Math.abs(x) > .22 ? Math.sign(x) * collective * .48 : 0;
      if (angle === 0) p.setXYZ(i, x, y, z);
      else p.setXYZ(i, x, y * Math.cos(angle) - z * Math.sin(angle), y * Math.sin(angle) + z * Math.cos(angle));
    }
    p.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
  }
}
export function liftDrawing(input, time, mode = 'try', support = null) {
  const load = padLoad(input), f = padForces(load), h = padForces(load, PAD.hoverHeight);
  const outcome = padOutcome(load);
  const rise = mode === 'wonder' ? Math.max(0, Math.sin(time * 3)) * .07 :
    mode === 'hover' ? .3 * Math.min(1, time) : mode === 'try' && time > 0 ?
      outcome === 'up' ? Math.min(.75, time * .35) : outcome === 'hover' ? .3 * Math.min(1, time) :
        outcome === 'settles' ? Math.max(0, Math.sin(Math.min(Math.PI, time))) * .2 : 0 : 0;
  const baseY = .12 + rise;
  const showLift = !['rotor', 'weight', 'wonder'].includes(mode), showWeight = !['rotor', 'lift', 'collective', 'wonder'].includes(mode);
  const showAir = !['weight', 'rotor'].includes(mode);
  const scale = .000028;
  const forceN = mode === 'hover' || outcome === 'hover' && rise > 0 ? h.weightN : f.liftN;
  const forces = [];
  if (showLift) forces.push({kind: 'lift', newtons: forceN, origin: [0, baseY + 1.35, 0], direction: [0, 1, 0]});
  if (showWeight) forces.push({kind: 'weight', newtons: f.weightN, origin: [0, baseY + .55, 0], direction: [0, -1, 0]});
  for (const force of forces) Object.assign(force, {displayValue: force.newtons / GRAVITY, displayUnit: 'kg', headWidth: .36, headLength: .36, inFront: true});
  const angle = (1 - load.collective) * 1.05;
  const objects = [{id: 'collective-shaft', position: [.45, baseY + .3 + Math.cos(angle) * .24, .52 - Math.sin(angle) * .24], size: [.045, .48, .045], rotation: [-angle, 0, 0], colour: '#8f9791'},
    {id: 'collective-handle', shape: 'sphere', control: 'collective', position: [.45, baseY + .3 + Math.cos(angle) * .48, .52 - Math.sin(angle) * .48], size: [.16, .16, .16], colour: '#edc557'}];
  objects.push({id: 'fuel-target', control: 'fuel', position: [-1.65, .5, 1.5], size: [1, .9, .8], opacity: 0},
    {id: 'car-target', control: 'car', position: [load.car ? 1.15 : 2.6, .5, -.45], size: [.8, .8, 1.6], opacity: 0},
    {id: 'crate-target', control: 'crates', position: [WAITING_CRATE[0], .4, WAITING_CRATE[2]], size: [.7, .7, .7], opacity: 0});
  // Solid coloured shafts stay legible against the steel hangar.
  forces.forEach(a => objects.push({id: `force-shaft-${a.kind}`, position: [a.origin[0], a.origin[1] + a.direction[1] * a.newtons * scale / 2, a.origin[2]], size: [.16, Math.max(.001, a.newtons * scale - .18), .16], colour: a.kind === 'lift' ? '#56d683' : '#f06464', inFront: true}));
  if (support === 'guided') objects.push({id: 'guide', position: [.45, 1.65, .7], size: [.05, .35, .05], colour: '#edc557'});
  // Click targets lie on real load models; their wire-free invisible skin is
  // supplied by the mount, using the same object's control id.
  return {load, baseY, rise, mode, forces, objects, metresPerNewton: scale, hideLabels: true,
    streams: showAir ? [-.85, 0, .85].map(x => ({medium: 'air', origin: [x, baseY + 1.4, 0], direction: [0, -1, 0], speed: load.fuel ? load.collective * 5 : 0, opacity: .2 + load.collective * .7, radius: .45, length: 1.5})) : [],
    // A level low view gives both vertical arrows the same perspective scale.
    camera: {position: [2.5, .5 + rise, 4], target: [.25, .5 + rise, 0]},
    graph: mode === 'ramp' ? {position: [2.1, 1.4, -.4], size: [1.5, .84, 1], xLabel: 'Time in seconds', yLabel: 'Lift in kg', maxX: 4, maxY: f.maximumN / GRAVITY,
      points: Array.from({length: 41}, (_, i) => [i / 10, Math.min(1, i / 40) * f.weightN / GRAVITY])} : null};
}

// Models are local runtime assets. Only their display pose changes here.
export function mountLift({group, THREE, models, doc, canvas, camera}) {
  const own = new THREE.Group(); group.add(own);
  const roomSigns = group.parent.getObjectByName('Lab 2 signs and Brian');
  const signsWereVisible = roomSigns?.visible;
  if (roomSigns) roomSigns.visible = false;
  let disposed = false, heli = null, rotor = null, ghostHeli = null;
  const blades = [];
  const car = createUnlockedVehicle({key: 'dusthawk_rally'}); car.scale.setScalar(.33); own.add(car);
  const cargo = new THREE.Group(); own.add(cargo);
  const weightSource = models.get('weights-and-cans');
  const cans = weightSource?.clone(true); if (cans) { cans.scale.setScalar(.65); cans.position.set(-1.75, 0, 1.3); own.add(cans); }
  // Two anchored captions and one tidy gauge replace all overlapping sprites.
  const overlay = doc.createElement('div'); overlay.className = 'lab-lift-overlay';
  const gauge = doc.createElement('div'); gauge.className = 'lab-lift-gauge';
  gauge.innerHTML = '<small>Load total</small><strong></strong><small class="lab-lift-fuel"></small>';
  const total = gauge.querySelector('strong'), fuel = gauge.querySelector('.lab-lift-fuel');
  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  overlay.append(gauge); canvas.parentElement.append(overlay);
  const captions = ['lift', 'weight'].map(kind => {
    const el = doc.createElement('div'); el.className = `lab-lift-force ${kind}`; el.dataset.liftLabel = kind; overlay.append(el); return el;
  });
  const inset = createCollectiveInset({THREE, doc, overlay, rotorBlades, pitchBlades});
  const wash = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.65, 1.4, 48, 1, true),
    new THREE.MeshBasicMaterial({color: '#81dac8', transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide}));
  own.add(wash);
  let loadedCrates = 0;
  const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({color: '#c6c8be'})); own.add(cable);
  const loader = new GLTFLoader();
  loader.loadAsync('/assets/heli/rescue/crate-food.glb').then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    const footOffset = -new THREE.Box3().setFromObject(gltf.scene).min.y * .45;
    for (let i = 0; i <= PAD.maxCrates; i++) {
      const crate = gltf.scene.clone(true); crate.scale.setScalar(.45);
      crate.position.set(...(i === PAD.maxCrates ? WAITING_CRATE : [.9 + (i % 2) * .5, .12 + Math.floor(i / 2) * .5, -.1]));
      crate.position.y += footOffset;
      crate.visible = i === PAD.maxCrates || i < loadedCrates; cargo.add(crate);
    }
  }).catch(() => { canvas.dataset.labLiftCrates = 'failed'; });
  loader.loadAsync('/assets/heli/kestrel-one.glb').then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    heli = gltf.scene; heli.scale.setScalar(.48); own.add(heli);
    rotor = heli.getObjectByName('main_rotor');
    blades.push(...rotorBlades(rotor));
    inset.setRotor(rotor);
    ghostHeli = heli.clone(true); ghostHeli.scale.setScalar(.35); own.add(ghostHeli);
    ghostHeli.traverse(n => {
      if (n.material) {
        const copies = [].concat(n.material).map(m => { const copy = m.clone(); copy.transparent = true; copy.opacity = .18; copy.depthWrite = false; return copy; });
        n.material = Array.isArray(n.material) ? copies : copies[0];
      }
    });
    canvas.dataset.labLiftModel = 'ready';
  }).catch(error => { canvas.dataset.labLiftModel = 'failed'; console.error('Lift model could not load:', error); });
  function release(root) { root.traverse(n => { n.geometry?.dispose(); for (const m of [].concat(n.material ?? [])) { m.map?.dispose(); m.dispose(); } }); }
  return {
    draw(d, clock) {
      if (!d.load) return;
      // Read layout before any writes, then update only values that changed.
      const panel = canvas.parentElement.querySelector('.lab-teaching');
      const hostBox = canvas.getBoundingClientRect(), panelBox = panel?.getBoundingClientRect();
      const bottom = panelBox ? panelBox.top - hostBox.top - 48 : canvas.clientHeight - 80;
      const l = d.load;
      if (heli) heli.position.y = d.baseY;
      if (rotor) {
        rotor.rotation.y = l.fuel ? clock.time * (d.mode === 'collective' ? 1.1 : 3) : 0;
        pitchBlades(blades, l.collective);
      }
      car.position.set(1.4, .13 + (l.car && d.mode !== 'wonder' ? d.rise : 0), -.45);
      car.rotation.y = -.6;
      // Unloaded objects wait beside the pad instead of disappearing.
      car.position.x = l.car ? 1.15 : 2.6;
      loadedCrates = l.crates;
      cargo.children.forEach((c, i) => { c.visible = i === PAD.maxCrates || i < l.crates; });
      if (ghostHeli) {
        ghostHeli.visible = Boolean(clock.previous) && clock.stage === 3;
        if (clock.previous) {
          const old = clock.previous;
          const pose = liftDrawing(trialInput(old.input, old.index), Math.min(clock.time, old.time));
          ghostHeli.position.set(-2.1, pose.baseY, -.5);
        }
      }
      cable.visible = Boolean(l.car);
      const p = cable.geometry.attributes.position; p.setXYZ(0, 0, d.baseY + .35, 0); p.setXYZ(1, car.position.x, .5 + d.rise, -.45); p.needsUpdate = true; cable.geometry.computeBoundingSphere();
      setText(total, `${Math.round(padForces(l).massKg).toLocaleString('en')} kg`);
      setText(fuel, `Tank ${Math.round(l.fuel)} kg`);
      wash.visible = d.streams.length > 0 && l.collective > 0 && l.fuel > 0;
      wash.position.set(0, d.baseY + .65, 0); wash.material.opacity = .04 + l.collective * .17;
      inset.draw(d.mode === 'collective', l.collective);
      group.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      captions.forEach((el, i) => {
        const f = d.forces.find(f => f.kind === (i ? 'weight' : 'lift'));
        const hidden = !f || clock.stage === 0 || clock.stage === 3;
        if (el.hidden !== hidden) el.hidden = hidden;
        if (el.hidden) return;
        setText(el, `${f.kind} ${Math.round(f.displayValue).toLocaleString('en')} kg`);
        const point = group.localToWorld(new THREE.Vector3(...f.origin)).project(camera);
        const x = (point.x + 1) * canvas.clientWidth / 2 + (i ? 110 : -250);
        const y = (1 - point.y) * canvas.clientHeight / 2 + (i ? 35 : -65);
        const left = `${Math.round(Math.max(280, Math.min(canvas.clientWidth - 230, x)))}px`;
        const top = `${Math.round(Math.max(85, Math.min(bottom, y)))}px`;
        if (el.style.left !== left) el.style.left = left;
        if (el.style.top !== top) el.style.top = top;
      });
      const loadText = JSON.stringify(l);
      if (canvas.dataset.labLiftLoad !== loadText) canvas.dataset.labLiftLoad = loadText;
    },
    dispose() {
      disposed = true; cans?.removeFromParent(); // cloned Lab geometry belongs to the room
      if (roomSigns) roomSigns.visible = signsWereVisible;
      inset.dispose(); overlay.remove();
      release(own); own.removeFromParent();
      delete canvas.dataset.labLiftModel; delete canvas.dataset.labLiftLoad;
    },
  };
}

export function helicopterPicture({fuel = KESTREL.tankKg, crates = 0, car = 0, collective = 1, outcome}, label) {
  return (ctx, w, h) => {
    const f = padForces({fuel, crates, car, collective}), actual = outcome ?? padOutcome({fuel, crates, car, collective});
    ctx.fillStyle = '#28332f'; ctx.fillRect(0, 0, w, h);
    const y = actual === 'down' ? 68 : 43;
    ctx.strokeStyle = '#a6afa6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 100); ctx.lineTo(w - 10, 100); ctx.stroke();
    ctx.fillStyle = '#b7b5a2'; ctx.beginPath(); ctx.ellipse(115, y, 32, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333e43'; ctx.fillRect(123, y - 10, 19, 13);
    ctx.strokeStyle = '#c6c5b1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(83, y); ctx.lineTo(43, y - 10); ctx.moveTo(108, y - 15); ctx.lineTo(108, y - 25); ctx.moveTo(54, y - 25); ctx.lineTo(163, y - 25); ctx.moveTo(90, y + 22); ctx.lineTo(140, y + 22); ctx.moveTo(100, y + 12); ctx.lineTo(100, y + 22); ctx.stroke();
    for (let i = 0; i < crates; i++) { ctx.fillStyle = '#a58b5b'; ctx.fillRect(154 + i % 2 * 12, 87 - Math.floor(i / 2) * 13, 11, 12); }
    if (car) { ctx.fillStyle = '#ddd9c6'; ctx.fillRect(178, 79, 39, 12); ctx.fillRect(185, 72, 19, 9); ctx.fillStyle = '#131b19'; ctx.fillRect(181, 89, 8, 8); ctx.fillRect(205, 89, 8, 8); }
    function arrow(x, from, to, colour) { ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, from); ctx.lineTo(x, to); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, to); ctx.lineTo(x - 7, to + (to < from ? 9 : -9)); ctx.lineTo(x + 7, to + (to < from ? 9 : -9)); ctx.fill(); }
    const max = Math.max(f.weightN, f.liftN); arrow(22, 86, 86 - f.liftN / max * 50, '#56d683'); arrow(238, 25, 25 + f.weightN / max * 50, '#f06464');
    ctx.fillStyle = '#f5f0dc'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label ?? `${Math.round(f.massKg)} kg · ${Math.round(collective * 100)}%`, w / 2, h - 7);
  };
}
