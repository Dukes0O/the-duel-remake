// A warm wash of street light on a building surface at night: the wall glows a little in its own
// colour near the ground, where the shopfronts and lamps are, and fades toward the roof. It is a
// look only (an added glow in the surface's shader, no real light), so it costs nothing per lamp.
// It can also tint each instance of a shared surface to a different Mediterranean wall colour
// (cream, ochre, pink, terracotta, sage), chosen from where the instance stands.
import * as THREE from 'three';

const PALETTE = [[1, .93, .78], [1, .8, .5], [.98, .72, .66], [.92, .62, .48], [.78, .86, .74]];
const float = value => Number(value).toFixed(3);

// options: colour (of the light), strength, height (metres where the wash has faded out), floor (share
// of the wash left above that), tint (0 to 1, how far the wall takes its instance colour), base ('local'
// when the surface's own y is height above ground, 'unit' for a unit box centred on its middle).
export function applyNightWash(material, { colour = 0xffd9a8, strength = .5, height = 10, floor = .15, tint = 0, base = 'local' } = {}) {
  const light = new THREE.Color(colour).multiplyScalar(strength);
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey?.bind(material) ?? (() => '');
  const key = `night-wash-${light.getHexString()}-${float(height)}-${float(floor)}-${float(tint)}-${base}`;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWashHeight; varying float vWashSeed;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float washScale = 1.0; vec3 washOrigin = vec3(0.0);
        #ifdef USE_INSTANCING
          washScale = length(instanceMatrix[1].xyz); washOrigin = (modelMatrix * instanceMatrix)[3].xyz;
        #endif
        vWashHeight = (transformed.y${base === 'unit' ? ' + .5' : ''}) * washScale;
        vWashSeed = fract(sin(dot(washOrigin.xz, vec2(12.9898, 78.233))) * 43758.5453);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWashHeight; varying float vWashSeed;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 washPalette[5] = vec3[5](${PALETTE.map(([r, g, b]) => `vec3(${float(r)}, ${float(g)}, ${float(b)})`).join(', ')});
          diffuseColor.rgb *= mix(vec3(1.0), washPalette[int(floor(vWashSeed * 4.999))], ${float(tint)});
          float washLevel = ${float(floor)} + ${float(1 - floor)} * pow(1.0 - smoothstep(0.0, ${float(height)}, vWashHeight), 1.4);
          totalEmissiveRadiance += diffuseColor.rgb * vec3(${float(light.r)}, ${float(light.g)}, ${float(light.b)}) * washLevel;
        }`);
  };
  material.customProgramCacheKey = () => `${previousKey()}|${key}`;
  material.needsUpdate = true;
}
