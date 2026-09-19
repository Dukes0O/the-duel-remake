// course.js — one spline-extrusion generator for every stage/theme. Produces a
// sampled centerline (position, elevation, heading, curvature) plus features
// (radar trap, rival start, scenery, the end-of-stage gas station). No laps:
// strictly point-to-point from s=0 to s=lengthU.

import { makeRng } from './rng.js';
import { THEMES } from './config.js';

const STEP = 8; // sample spacing along the centerline (units)

export class Course {
  constructor(stageDef, seed) {
    this.def = stageDef;
    this.theme = THEMES[stageDef.theme];
    this.length = stageDef.lengthU;
    this.rng = makeRng((seed >>> 0) ^ (stageDef.stage * 0x9e37) ^ hashTheme(stageDef.theme));
    this._build();
  }

  _build() {
    const rng = this.rng;
    // deterministic curvature + elevation as summed sines (seed-varied phases)
    const ph = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)];
    const eph = [rng.range(0, 6.28), rng.range(0, 6.28)];
    const curveAmp = 0.0016 + rng.range(0, 0.0010);
    const samples = [];
    let x = 0, z = 0, heading = 0;
    for (let s = 0; s <= this.length + STEP; s += STEP) {
      const k = curveAmp * (Math.sin(s * 0.0016 + ph[0]) + 0.6 * Math.sin(s * 0.0041 + ph[1]) + 0.4 * Math.sin(s * 0.0009 + ph[2]));
      heading += k * STEP;
      x += Math.sin(heading) * STEP;
      z += Math.cos(heading) * STEP;
      const y = 6 * Math.sin(s * 0.0011 + eph[0]) + 3 * Math.sin(s * 0.0031 + eph[1]);
      // tunnels (alpine): mark sections where the road would cut through a peak
      const tunnel = this.theme.tunnels && Math.sin(s * 0.0022 + eph[0]) > 0.72;
      samples.push({ s, x, z, y, heading, curvature: k, tunnel });
    }
    this.samples = samples;

    // --- features ---
    this.features = { checkpoints: [], radarTraps: [], scenery: [], rocks: [] };
    // gas-station checkpoint at the very end (CANON: stages end at a station)
    this.features.checkpoints.push({ s: this.length, kind: 'gas_station' });
    // radar trap at a fixed fraction so it's deterministic per stage
    if (this.def.hasRadar) {
      this.features.radarTraps.push({ s: Math.round(this.length * 0.45), limitMph: this.def.speedLimitMph });
    }
    // rival starts just behind the player on rival stages
    this.rivalStartS = this.def.hasRival ? -40 : null;
    // scenery scattered along both shoulders
    const n = Math.floor(this.length / 70);
    for (let i = 0; i < n; i++) {
      const s = this.rng.range(60, this.length - 60);
      const side = this.rng.chance(0.5) ? 1 : -1;
      const off = side * this.rng.range(11, 30);
      this.features.scenery.push({ s, off, scale: this.rng.range(0.7, 1.6), kind: this.theme.scenery });
    }
    // One source of truth for rendered rocks and their road-coordinate colliders.
    const rockRng=makeRng(9817+this.def.stage), rocks=this.features.rocks;
    for(let i=0;i<180;i++){
      const sx=rockRng.range(1.3,4),sy=rockRng.range(.9,3),sz=rockRng.range(1.2,4),angle=rockRng.range(0,6.28);
      rocks.push({s:rockRng.range(80,this.length-60),off:(i%2?1:-1)*rockRng.range(16,62),scale:[sx,sy,sz],angle,
        radiusX:(Math.abs(Math.cos(angle))*sx+Math.abs(Math.sin(angle))*sz)*.73,
        radiusZ:(Math.abs(Math.cos(angle))*sz+Math.abs(Math.sin(angle))*sx)*.73});
    }
    if(this.def.theme!=='alpine')for(let i=0;i<32;i++){
      const layer=i%4,s=145+Math.floor(i/4)*480,off=(i%2?1:-1)*(37+Math.floor(i%4/2)*8);
      if(s<this.length)rocks.push({s,off,scale:[8-layer*.9,5+layer*3.3,10-layer],angle:i*.8,outcrop:true,radiusX:7.5-layer*.8,radiusZ:8.7-layer*.8});
    }
    this.rockBuckets=new Map();
    for(const rock of rocks){const key=Math.floor(rock.s/64);if(!this.rockBuckets.has(key))this.rockBuckets.set(key,[]);this.rockBuckets.get(key).push(rock);}
  }

  rocksNear(from,to){const rocks=[];for(let b=Math.floor((Math.min(from,to)-14)/64);b<=Math.floor((Math.max(from,to)+14)/64);b++)rocks.push(...(this.rockBuckets.get(b)||[]));return rocks;}

  // Interpolated centerline frame at distance s.
  at(s) {
    const clamped = Math.max(0, Math.min(this.length, s));
    const idx = Math.min(this.samples.length - 2, Math.floor(clamped / STEP));
    const a = this.samples[idx], b = this.samples[idx + 1];
    const t = (clamped - a.s) / STEP;
    return {
      x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: lerp(a.y, b.y, t),
      heading: lerp(a.heading, b.heading, t), curvature: lerp(a.curvature, b.curvature, t),
      tunnel: t < 0.5 ? a.tunnel : b.tunnel,
    };
  }

  // World position offset laterally from the centerline by `lat` units.
  worldAt(s, lat = 0) {
    const f = this.at(s);
    const nx = Math.cos(f.heading), nz = -Math.sin(f.heading); // right-hand normal
    return { x: f.x + nx * lat, y: f.y, z: f.z + nz * lat, heading: f.heading };
  }

  nearestRadar(s) {
    let best = null;
    for (const r of this.features.radarTraps) if (r.s >= s - 50 && (!best || r.s < best.s)) best = r;
    return best;
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function hashTheme(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0; return h >>> 0; }
