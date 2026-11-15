import * as THREE from 'three';
import {roadCondition} from './roads.js';

// Road work reshapes and colours the yard floor rather than covering it with tiles.
export function createRoadWorkView(parent, heightAt, floor) {
  const group = new THREE.Group();
  group.name = 'yard-road-work';
  parent.add(group);
  const colours = {
    cut:new THREE.Color(0x8c694d), spread:new THREE.Color(0xb29871),
    firm:new THREE.Color(0x8e806a), soft:new THREE.Color(0x665b50),
    rough:new THREE.Color(0x756b60), good:new THREE.Color(0x464746),
  };
  const heapMaterial = new THREE.MeshStandardMaterial({color:0xb29871, roughness:1});
  const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), heapMaterial);
  heap.name = 'dozer-blade-heap';
  heap.visible = false;
  group.add(heap);
  const geometry = floor.geometry, positions = geometry.attributes.position;
  const color = geometry.attributes.color, baseColors = color.array.slice();
  const params = geometry.parameters;
  const columns = params.widthSegments + 1, rows = params.heightSegments + 1;
  const dx = params.width / params.widthSegments, dz = params.height / params.heightSegments;
  const previous = new Map();
  const mixed = new THREE.Color();
  function vertex(x, z) {
    const col = Math.round((x + params.width / 2) / dx);
    const row = Math.round((z + params.height / 2) / dz);
    return col < 0 || col >= columns || row < 0 || row >= rows ? -1 : row * columns + col;
  }
  return {
    update(work, dozer = null) {
      const load = Math.max(0, work.bladeLoad || 0);
      heap.visible = !!dozer && load > 0;
      if (heap.visible) {
        const x = dozer.x + Math.sin(dozer.heading) * 2;
        const z = dozer.z + Math.cos(dozer.heading) * 2;
        const size = Math.cbrt(load);
        heap.scale.set(size, size * 0.45, size * 0.65);
        heap.position.set(x, heightAt(x, z) + size * 0.3, z);
      }
      const dirty = new Set();
      for (const key of new Set([...previous.keys(), ...Object.keys(work.cells)])) {
        const cell = work.cells[key];
        if (previous.get(key) === cell) continue;
        const [x, z] = key.split(':').map(Number);
        for (let ox=-2; ox<=2; ox++) for (let oz=-2; oz<=2; oz++) {
          const index = vertex(x+ox, z+oz);
          if (index >= 0) dirty.add(index);
        }
        if (cell) previous.set(key, cell); else previous.delete(key);
      }
      for (const index of dirty) {
        const x = positions.getX(index), z = positions.getZ(index);
        let chosen = null, strength = 0;
        for (let cx=Math.floor(x)-1; cx<=Math.ceil(x)+1; cx++)
          for (let cz=Math.floor(z)-1; cz<=Math.ceil(z)+1; cz++) {
            const cell = work.cells[`${cx}:${cz}`];
            // A 2.3 m drum or screed covers the centre and blends into untouched ground.
            const amount = Math.max(0, Math.min(1, 1.65 - Math.max(Math.abs(x-cx), Math.abs(z-cz))));
            if (cell && amount > strength) { chosen = cell; strength = amount; }
          }
        positions.setY(index, heightAt(x, z) + (chosen?.height || 0) * strength);
        mixed.setRGB(baseColors[index*3], baseColors[index*3+1], baseColors[index*3+2]);
        if (chosen) {
          const condition = roadCondition(chosen);
          const appearance = condition !== 'unfinished' ? condition : chosen.compaction >= 0.9 ? 'firm' : chosen.spread > 0 ? 'spread' : 'cut';
          mixed.lerp(colours[appearance], strength);
        }
        color.setXYZ(index, mixed.r, mixed.g, mixed.b);
      }
      if (dirty.size) {
        positions.needsUpdate = true;
        color.needsUpdate = true;
        const normals = geometry.attributes.normal, normal = new THREE.Vector3();
        const affected = new Set(dirty);
        for (const index of dirty) {
          const x=positions.getX(index), z=positions.getZ(index);
          for (const [ox,oz] of [[-dx,0],[dx,0],[0,-dz],[0,dz]]) {
            const neighbour=vertex(x+ox,z+oz);
            if (neighbour>=0) affected.add(neighbour);
          }
        }
        for (const index of affected) {
          const x=positions.getX(index), z=positions.getZ(index);
          const left=vertex(x-dx,z), right=vertex(x+dx,z), back=vertex(x,z-dz), front=vertex(x,z+dz);
          if ([left,right,back,front].some(value=>value<0)) continue;
          normal.set(-(positions.getY(right)-positions.getY(left))/(2*dx), 1,
            -(positions.getY(front)-positions.getY(back))/(2*dz)).normalize();
          normals.setXYZ(index,normal.x,normal.y,normal.z);
        }
        normals.needsUpdate = true;
      }
    },
    dispose() {
      group.removeFromParent();
      heap.geometry.dispose();
      heapMaterial.dispose();
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
