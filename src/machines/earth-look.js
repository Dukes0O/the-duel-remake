// Earth drawn by the game's code for the machine yard: heaps of loose ground and the grain on them.
// Nothing here changes a rule. The road machines and the drill rig share it.
import * as THREE from 'three';
import {scrapNoise} from '../world/scrap-look.js';

const unit = (index, k) => { const v = Math.sin(index * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

/**
 * A lumpy heap one metre in radius and one metre tall, standing on y = 0. `forward` moves its middle along +Z, for a
 * heap that is pushed from behind. Its slopes are uneven and its foot is ragged, so that it does not read as a ball.
 */
export function moundGeometry({seed = 1, forward = 0, rings = 9, spokes = 22} = {}) {
  const positions = [], colours = [], indices = [];
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;                      // 0 at the crest, 1 at the foot
    for (let spoke = 0; spoke < spokes; spoke++) {
      const angle = spoke / spokes * Math.PI * 2;
      const lump = .82 + .36 * unit(seed * 31 + spoke, 1) * t + .18 * (unit(seed * 17 + spoke * 7 + ring * 13, 2) - .5);
      const radius = t * lump * (1 + .18 * Math.sin(angle * 3 + seed));
      // A heap of loose earth lies at its angle of rest: nearly straight sides and a rounded crest.
      const height = Math.max(0, (1 - Math.pow(t, 1.25)) * (.86 + .28 * unit(seed * 13 + spoke * 3 + ring, 3) * (1 - t)));
      positions.push(Math.sin(angle) * radius, ring === rings ? 0 : height, Math.cos(angle) * radius + forward * (1 - .35 * t));
      const shade = .72 + .5 * unit(seed * 7 + spoke * 5 + ring * 11, 4);
      colours.push(shade, shade, shade);
    }
  }
  for (let ring = 0; ring < rings; ring++) for (let spoke = 0; spoke < spokes; spoke++) {
    const a = ring * spokes + spoke, b = ring * spokes + (spoke + 1) % spokes, c = a + spokes, d = b + spokes;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Loose earth, gravel, rock chips or wet mud. `kind` is 0 for earth and clay (soft lumps), 1 for gravel (pebbles),
 * 2 for broken rock (pale angular chips) and 3 for wet ground (dark and shining). The colour stays on the material, so
 * it can be changed as a heap changes.
 */
export function earthMaterial(colour = 0x6b4a34, kind = 0, {vertexColors = true} = {}) {
  const material = new THREE.MeshStandardMaterial({color: colour, roughness: 1, vertexColors});
  const uniforms = {uEarthNoise: {value: scrapNoise()}, uEarthKind: {value: kind}};
  material.userData.earth = uniforms;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEarthWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvEarthWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uEarthNoise;uniform float uEarthKind;varying vec3 vEarthWorld;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 earthFine=texture2D(uEarthNoise,vEarthWorld.xz*1.7+vEarthWorld.y*.9).rgb;
        vec3 earthMid=texture2D(uEarthNoise,vEarthWorld.xz*.45+vEarthWorld.y*.31+.37).rgb;
        float earthLump=smoothstep(.38,.66,earthMid.r*.6+earthFine.b*.4);
        // Pebbles and chips a few centimetres across, with soft edges so that they do not read as squares.
        float earthStone=smoothstep(.40,.64,earthMid.g*.65+earthFine.g*.35);
        float earthChip=smoothstep(.38,.60,earthMid.g*.5+earthFine.b*.5);
        // Earth and clay: soft lumps with dark gaps between them.
        vec3 earthSoft=diffuseColor.rgb*(.55+.7*earthLump)*(.82+.36*earthFine.g);
        // Gravel: separate pebbles, some pale and some dark.
        vec3 earthGravel=diffuseColor.rgb*mix(.62,1.32,earthStone)*(.85+.3*earthFine.b);
        // Broken rock: pale chips with shadow between them.
        vec3 earthRock=diffuseColor.rgb*mix(.58,1.22,earthChip)+vec3(.02)*earthChip;
        // Wet ground: dark and nearly even.
        vec3 earthWet=diffuseColor.rgb*(.8+.3*earthLump);
        diffuseColor.rgb=uEarthKind<.5?earthSoft:uEarthKind<1.5?earthGravel:uEarthKind<2.5?earthRock:earthWet;`);
  };
  material.customProgramCacheKey = () => 'machine-earth-2';
  return material;
}
