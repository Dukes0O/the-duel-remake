import * as THREE from 'three';
import {roadCondition} from './roads.js';

// Each worked metre stays visible for this visit and changes as it is repaired.
export function createRoadWorkView(parent, heightAt) {
  const group = new THREE.Group();
  group.name = 'yard-road-work';
  parent.add(group);
  const geometry = new THREE.BoxGeometry(0.98, 0.08, 0.98);
  const materials = {
    cut:new THREE.MeshStandardMaterial({color:0x8c694d, roughness:1}),
    spread:new THREE.MeshStandardMaterial({color:0xb29871, roughness:1}),
    firm:new THREE.MeshStandardMaterial({color:0x8e806a, roughness:1}),
    soft:new THREE.MeshStandardMaterial({color:0x665b50, roughness:1}),
    rough:new THREE.MeshStandardMaterial({color:0x756b60, roughness:1}),
    good:new THREE.MeshStandardMaterial({color:0x464746, roughness:1}),
  };
  const meshes = new Map();
  return {
    update(work) {
      for (const [key, cell] of Object.entries(work.cells)) {
        let mesh = meshes.get(key);
        if (!mesh) {
          const [x, z] = key.split(':').map(Number);
          mesh = new THREE.Mesh(geometry, materials.cut);
          mesh.position.set(x, heightAt(x, z) + 0.05, z);
          mesh.name = `road-work-${key}`;
          group.add(mesh);
          meshes.set(key, mesh);
        }
        const condition = roadCondition(cell);
        const appearance = condition !== 'unfinished' ? condition : cell.compaction >= 0.9 ? 'firm' : cell.spread > 0 ? 'spread' : 'cut';
        mesh.material = materials[appearance];
        mesh.position.y = heightAt(mesh.position.x, mesh.position.z) + 0.05 + Math.max(-0.03, Math.min(0.2, cell.height * 0.1));
        mesh.rotation.z = condition === 'rough' ? 0.09 : 0;
      }
    },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
    },
  };
}

const TONES = {'dozer-blade':[110, 'sawtooth'], 'roller-ground':[75, 'triangle'], 'paver-surface':[165, 'square']};
export function createRoadSounds(audio) {
  const next = new Map(), voices = new Set();
  return {
    play(cue) {
      const spec = TONES[cue], ctx = audio?.context;
      if (!spec || !ctx || !audio.master || audio.muted || audio.paused || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (now < (next.get(cue) ?? 0)) return;
      next.set(cue, now + 0.2);
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = spec[1]; oscillator.frequency.setValueAtTime(spec[0], now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      oscillator.connect(gain); gain.connect(audio.master); voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now); oscillator.stop(now + 0.18);
    },
    dispose() { for (const voice of voices) voice.stop(); voices.clear(); },
  };
}
