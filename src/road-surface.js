import * as THREE from 'three';
import { ROAD_SHOULDER_WIDTH } from './config.js';

const NOISE = `
  float roadHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float roadNoise(vec2 p) {
    vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(roadHash(i),roadHash(i+vec2(1.0,0.0)),f.x),
      mix(roadHash(i+vec2(0.0,1.0)),roadHash(i+vec2(1.0)),f.x),f.y);
  }
`;

// UVs on the existing road strips encode lateral metres / 5 and distance / 10.
// World-space wear avoids a material seam where the closed course joins itself.
function surfaceVaryings(shader) {
  const varyings = '\nvarying vec3 vRoadSurfaceWorld;\nvarying vec2 vRoadSurfaceUv;\n';
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>' + varyings)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadSurfaceWorld=(modelMatrix*vec4(position,1.0)).xyz;\nvRoadSurfaceUv=uv;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>' + varyings + NOISE);
}

export function createPavedRoadMaterial({ asphalt, night = false }) {
  const material = new THREE.MeshStandardMaterial({
    name: 'Worn paved asphalt', map: asphalt, bumpMap: asphalt, bumpScale: .028,
    roughness: night ? .55 : .9, color: night ? 0xa7b2bc : 0xd3d0ca, metalness: night ? .025 : 0,
  });
  material.onBeforeCompile = shader => {
    surfaceVaryings(shader);
    // Headlights amplify narrow smooth bands into white stripes at night.
    // Night wheel wear is colour-only; daylight polish is deliberately mild.
    shader.uniforms.roadWearPolish = { value: night ? 0 : .025 };
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float roadWearPolish;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec2 roadWorld=vRoadSurfaceWorld.xz;
      float roadAge=roadNoise(roadWorld*.038);
      float roadGrain=roadNoise(roadWorld*.31+vec2(18.3,7.6));
      // Sparse, softened islands resemble older resurfacing and tar repairs.
      // There is no rectangular grid or periodically repeated transverse seam.
      float roadRepairField=roadNoise(roadWorld*.095+vec2(37.4,11.8))*.8+roadGrain*.2;
      float roadRepair=smoothstep(.67,.75,roadRepairField);
      float roadRepairRim=smoothstep(.62,.67,roadRepairField)*(1.0-smoothstep(.67,.72,roadRepairField));
      float roadLateral=abs(vRoadSurfaceUv.x*5.0);
      float roadWander=(roadNoise(roadWorld*.055+vec2(91.0))-0.5)*.22;
      float roadTrackDistance=min(abs(roadLateral-2.55-roadWander),abs(roadLateral-4.25-roadWander));
      float roadWheelWear=(1.0-smoothstep(.14,.64,roadTrackDistance))*(.28+.72*roadGrain);
      float roadTone=1.0+(roadAge-.5)*.13+(roadGrain-.5)*.035-roadRepair*.085-roadRepairRim*.055-roadWheelWear*.043;
      diffuseColor.rgb*=roadTone;
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor-roadWheelWear*roadWearPolish-roadRepair*.025+(roadAge-.5)*.055,.36,1.0);
    `);
  };
  material.customProgramCacheKey = () => 'paved-road-wear-v2';
  return material;
}

// The shoulder shader samples this same width at strip vertices. Keeping this
// small contract explicit lets the focused test compare it with Course.
export function pavedShoulderWidthAt(course, s) {
  const p = course.phase(s), smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  let width = 7;
  for (const lane of course.features.passingLanes) width += 3.5 * smooth((p - lane.start) / 45) * smooth((lane.end - p) / 45);
  return width;
}

export function createPavedShoulderMaterial({ gravel, alpine = false, course }) {
  const lanes = course.features.passingLanes.map(lane => new THREE.Vector2(lane.start, lane.end));
  const material = new THREE.MeshStandardMaterial({
    name: 'Textured paved-road shoulder', map: gravel, bumpMap: gravel, bumpScale: .034,
    color: alpine ? 0xaaa997 : 0xb8afa0, roughness: 1,
  });
  material.onBeforeCompile = shader => {
    surfaceVaryings(shader);
    shader.uniforms.shoulderCourseLength = { value: course.length };
    if (lanes.length) shader.uniforms.shoulderPassingLanes = { value: lanes };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      uniform float shoulderCourseLength;
      ${lanes.length ? `uniform vec2 shoulderPassingLanes[${lanes.length}];` : ''}
      varying float vShoulderAcross;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float shoulderPhase=mod(uv.y*10.0,shoulderCourseLength),shoulderWidth=7.0;
      ${lanes.length ? `for(int lane=0;lane<${lanes.length};lane++) {
        vec2 bounds=shoulderPassingLanes[lane];
        shoulderWidth+=3.5*smoothstep(0.0,45.0,shoulderPhase-bounds.x)*smoothstep(0.0,45.0,bounds.y-shoulderPhase);
      }` : ''}
      vShoulderAcross=clamp((abs(uv.x*5.0)-shoulderWidth)/${ROAD_SHOULDER_WIDTH},0.0,1.0);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vShoulderAcross;')
      .replace('#include <map_fragment>', `
        #include <map_fragment>
        float shoulderMacro=roadNoise(vRoadSurfaceWorld.xz*.19);
        float shoulderGrit=roadNoise(vRoadSurfaceWorld.xz*4.2);
        // Clip only the outer 3–19 cm. Opaque rendering needs no sorting or
        // additional draw, and the full inner metre remains solid gravel.
        if(vShoulderAcross>.85+.125*shoulderGrit) discard;
        diffuseColor.rgb*=.98+(shoulderMacro-.5)*.17-(1.0-smoothstep(0.0,.25,vShoulderAcross))*.10;
      `);
  };
  material.customProgramCacheKey = () => `paved-shoulder-gravel-v1-${lanes.length}`;
  return material;
}
