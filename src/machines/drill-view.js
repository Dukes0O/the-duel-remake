import * as THREE from 'three';
import {drillMaterialAt} from './drill.js';

// Short, distinct tones let the player hear the ground without reading the display.
const DRILL_TONES = Object.freeze({
  'drill-engine':[75, 'sawtooth', 0.18], 'drill-feed':[135, 'sawtooth', 0.12],
  'drill-clay':[190, 'triangle', 0.1], 'drill-gravel':[310, 'square', 0.07],
  'drill-rock':[490, 'square', 0.09], 'drill-jam':[95, 'square', 0.35],
  'drill-reverse':[220, 'triangle', 0.22], 'drill-water':[620, 'sine', 0.4],
});

/** Play through the game's own mixer, with each sound limited independently. */
export function createDrillSounds(audio) {
  const next = new Map(), voices = new Set();
  return {
    play(cue) {
      const spec = DRILL_TONES[cue], ctx = audio?.context;
      if (!spec || !ctx || !audio.master || audio.muted || audio.paused || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (now < (next.get(cue) ?? 0)) return;
      const [frequency, waveform, duration] = spec;
      next.set(cue, now + (cue === 'drill-engine' ? 0.5 : cue === 'drill-feed' ? 0.3 : 0.22));
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = waveform; oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain); gain.connect(audio.master); voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now); oscillator.stop(now + duration);
    },
    dispose() { for (const voice of voices) voice.stop(); voices.clear(); },
  };
}

/** Show each completed yard well at the ground height for this visit. */
export function createYardWellheadView(parent, heightAt) {
  const group = new THREE.Group();
  group.name = 'yard-wellheads';
  parent.add(group);
  const steel = new THREE.MeshStandardMaterial({color:0x6c6557, roughness:0.8, metalness:0.2});
  const baseGeometry = new THREE.CylinderGeometry(0.48, 0.52, 0.12, 12);
  const pipeGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.7, 12);
  const capGeometry = new THREE.CylinderGeometry(0.21, 0.21, 0.1, 12);
  const shown = new Set();
  return {
    update(wellheads) {
      for (const {x, z} of wellheads) {
        const key = `${x}:${z}`;
        if (shown.has(key)) continue;
        shown.add(key);
        const well = new THREE.Group();
        well.name = `wellhead-${key}`;
        well.position.set(x, heightAt(x, z), z);
        for (const [geometry, y] of [[baseGeometry, 0.06], [pipeGeometry, 0.4], [capGeometry, 0.8]]) {
          const mesh = new THREE.Mesh(geometry, steel);
          mesh.position.y = y;
          mesh.castShadow = true;
          well.add(mesh);
        }
        group.add(well);
      }
    },
    dispose() {
      group.removeFromParent();
      baseGeometry.dispose(); pipeGeometry.dispose(); capGeometry.dispose(); steel.dispose();
    },
  };
}

/** Keep the cuttings at each hole for the length of the yard visit. */
export function createDrillCuttingsView(parent, heightAt) {
  const group = new THREE.Group();
  group.name = 'drill-cuttings';
  parent.add(group);
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  const colors = {clay:0x9c5b38, gravel:0x8b8171, rock:0x77736b, wet:0x302c27};
  const heaps = new Map();
  return {
    update(hole) {
      if (!hole || hole.depth <= 0) return;
      const {x, z} = hole.site, key = `${x}:${z}`;
      let heap = heaps.get(key);
      if (!heap) {
        heap = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({roughness:1}));
        heap.name = `cuttings-${key}`;
        heap.castShadow = true;
        heap.position.set(x + 1.2, heightAt(x + 1.2, z), z);
        group.add(heap);
        heaps.set(key, heap);
      }
      const size = Math.min(1.2, 0.25 + hole.depth * 0.055);
      heap.scale.set(size, size * 0.4, size * 0.8);
      heap.material.color.setHex(colors[drillMaterialAt(hole.site, hole.depth)]);
      heap.material.roughness = hole.struckWater ? 0.55 : 1;
    },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      for (const heap of heaps.values()) heap.material.dispose();
    },
  };
}

/** Add the mast and drill to the tracked machine used in the yard. */
export function createDrillView(model) {
  const root = model.clone(true);
  root.traverse(node => { if (node.name.replace(/[\[\].:\/]/g, '').toLowerCase() === 'trencherboom') node.visible = false; });
  const steel = new THREE.MeshStandardMaterial({color:0x61574a, roughness:0.85, metalness:0.2});
  const dark = new THREE.MeshStandardMaterial({color:0x34332f, roughness:0.8, metalness:0.3});
  const mast = new THREE.Group();
  mast.name = 'drill-mast';
  mast.position.set(0, 1.3, -1.2);
  root.add(mast);
  const beam = (x, y, z, width, height, depth, mat = steel) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    part.position.set(x, y, z); part.castShadow = true; mast.add(part); return part;
  };
  for (const x of [-0.45, 0.45]) beam(x, 2.2, 0, 0.14, 4.4, 0.18);
  for (let y = 0.3; y <= 4.2; y += 0.65) beam(0, y, 0, 0.95, 0.1, 0.18);
  const bit = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 3.6, 10), dark);
  bit.name = 'drill-bit'; bit.position.set(0, 1.65, 0.25); bit.castShadow = true; mast.add(bit);
  return {root, update(rig, body) {
    const visibleMast = body.getObjectByName('drill-mast');
    const visibleBit = body.getObjectByName('drill-bit');
    visibleMast.rotation.x = rig.hole?.mastDown ? 0 : -Math.PI / 2.5;
    visibleBit.position.y = 1.65 - Math.min(1, rig.hole?.depth ?? 0);
  }};
}
