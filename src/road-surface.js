import * as THREE from 'three';
import { ROAD_SHOULDER_WIDTH } from './config.js';
import {registerSceneSystem} from './scene-systems.js';

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

const dampMaterials = new WeakMap();
function dampRoadUniforms(spec, length, banks) {
  if (spec === undefined) return null;
  if (!spec || !Number.isSafeInteger(spec.colour) || spec.colour < 0 || spec.colour > 0xffffff ||
      ![spec.dryRoughness, spec.dampRoughness].every(value => Number.isFinite(value) && value >= 0 && value <= 1) ||
      spec.dampRoughness > spec.dryRoughness || !Number.isFinite(length) || length <= 0 || spec.mist !== true ||
      !Array.isArray(spec.shadeRanges) || !spec.shadeRanges.length || spec.shadeRanges.length > 8 ||
      spec.shadeRanges.some(range => !range || ![range.from, range.to].every(Number.isFinite) || range.from < 0 || range.to > length || range.to <= range.from) ||
      !Array.isArray(banks) || banks.length !== 4 || banks.some(bank => !bank ||
        ![bank.s, bank.along, bank.opacity].every(Number.isFinite) || bank.s < 0 || bank.s > length || bank.along <= 0 || bank.opacity <= 0 || bank.opacity > .5))
    throw new Error('Invalid damp road descriptor or actual mist banks.');
  return {colour: spec.colour, dryRoughness: spec.dryRoughness, bound: false,
    banks: banks.map(bank => ({s: bank.s, along: bank.along, opacity: bank.opacity})),
    uniforms: {
      roadDampLength: {value: length}, roadDampRoughness: {value: spec.dampRoughness},
      roadShadeRanges: {value: spec.shadeRanges.map(range => new THREE.Vector2(range.from, range.to))},
      roadMistRanges: {value: banks.map(bank => new THREE.Vector3(Math.max(0, bank.s - bank.along), Math.min(length, bank.s + bank.along), 1))},
    }};
}

// Cache the real shared mist materials once, after the existing mist sync is registered.
// Their opacity is the fade authority, including negative-grid and later-lap behavior.
export function bindPavedDampRoad(world, course, material) {
  const damp = dampMaterials.get(material);
  if (!damp || damp.bound) return;
  const seen = new Set(), materials = [];
  world?.traverse(node => {
    if (node.name !== 'Ardennes valley mist' || !node.userData.valleyAnchor || seen.has(node.material)) return;
    seen.add(node.material); materials.push(node.material);
  });
  if (materials.length !== 4 || materials.some((mist, i) => mist.opacity !== damp.banks[i].opacity))
    throw new Error('Damp road requires four actual valley mist materials in authored order.');
  const ranges = damp.uniforms.roadMistRanges.value;
  const sync = () => {for (let i = 0; i < 4; i++) ranges[i].z = materials[i].opacity / damp.banks[i].opacity;};
  damp.bound = true; sync();
  registerSceneSystem(world, {sync, dispose() {dampMaterials.delete(material);}});
}
// `wet` is the wet look of a street at night: glossier, a little darker, so lamps and the
// lights of cars glint on it. Looks only; grip is unchanged.
export function createPavedRoadMaterial({ asphalt, night = false, wet = false, dampRoad, courseLength, mistBanks }) {
  const damp = dampRoadUniforms(dampRoad, courseLength, mistBanks);
  const material = new THREE.MeshStandardMaterial({
    name: 'Worn paved asphalt', map: asphalt, bumpMap: asphalt, bumpScale: .028,
    roughness: wet ? .24 : night ? .55 : .9, color: wet ? 0x8d99a4 : night ? 0xa7b2bc : 0xd3d0ca, metalness: wet ? .1 : night ? .025 : 0,
  });
  if (damp) {
    material.color.setHex(damp.colour); material.roughness = damp.dryRoughness; material.metalness = 0;
    dampMaterials.set(material, damp);
  }
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
      roughnessFactor=clamp(roughnessFactor-roadWheelWear*roadWearPolish-roadRepair*.025+(roadAge-.5)*.055,${wet ? '.16' : '.36'},1.0);
    `);
    if (damp) {
      Object.assign(shader.uniforms, damp.uniforms);
      const shadeCount = damp.uniforms.roadShadeRanges.value.length;
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        uniform float roadDampLength;
        uniform float roadDampRoughness;
        uniform vec2 roadShadeRanges[${shadeCount}];
        uniform vec3 roadMistRanges[4];
        float roadDampRange(float station, vec2 range) {
          float wrapped=mod(station,roadDampLength);
          float mask=0.0;
          for(int image=-1;image<=1;image++)
            mask=max(mask,smoothstep(range.x-25.0,range.x,wrapped+float(image)*roadDampLength)
              *(1.0-smoothstep(range.y,range.y+25.0,wrapped+float(image)*roadDampLength)));
          return mask;
        }
      `).replace('roughnessFactor=clamp(', `
        float roadDampStation=mod(vRoadSurfaceUv.y*10.0,roadDampLength);
        float roadDampMask=0.0;
        for(int i=0;i<${shadeCount};i++) {
          vec2 range=roadShadeRanges[i];
          roadDampMask=max(roadDampMask,roadDampRange(roadDampStation,range));
        }
        for(int i=0;i<4;i++) {
          vec3 range=roadMistRanges[i];
          roadDampMask=max(roadDampMask,roadDampRange(roadDampStation,range.xy)*range.z);
        }
        roughnessFactor=mix(roughnessFactor,roadDampRoughness,roadDampMask);
        roughnessFactor=clamp(`);
    }
  };
  material.customProgramCacheKey = damp ? () => `paved-road-wear-v4-damp-${damp.uniforms.roadShadeRanges.value.length}-4-${wet ? 'wet' : 'dry'}` :
    () => (wet ? 'paved-road-wear-v2-wet' : 'paved-road-wear-v2');
  return material;
}

// The shoulder shader samples this same width at strip vertices. Keeping this
// small contract explicit lets the focused test compare it with Course.
export function pavedShoulderWidthAt(course, s) {
  if (course.def.grandPrix && course.def.grandPrixEntryWidth) return course.roadHalfWidthAt(s);
  if (course.script) return course.script.halfWidthAt(s);
  const p = course.phase(s), smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  let width = 7;
  for (const lane of course.features.passingLanes) width += 3.5 * smooth((p - lane.start) / 45) * smooth((lane.end - p) / 45);
  return width;
}

export function createPavedShoulderMaterial({ gravel, alpine = false, course }) {
  const lanes = course.features.passingLanes.map(lane => new THREE.Vector2(lane.start, lane.end));
  // Authored circuits and opted-in GP entries carry the actual Course width
  // at each shoulder vertex, including any passing lane (see world.js).
  const scripted = !!course.script;
  const gpWidth = !!(course.def.grandPrix && course.def.grandPrixEntryWidth);
  const vertexWidth = scripted || gpWidth;
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
      ${vertexWidth ? 'attribute float shoulderEdge;' : ''}
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float shoulderPhase=mod(uv.y*10.0,shoulderCourseLength),shoulderWidth=${vertexWidth ? 'shoulderEdge' : '7.0'};
      ${lanes.length && !gpWidth ? `for(int lane=0;lane<${lanes.length};lane++) {
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
  material.customProgramCacheKey = () => `paved-shoulder-gravel-v1-${lanes.length}${gpWidth ? '-gp-entry-width' : scripted ? '-scripted' : ''}`;
  return material;
}
