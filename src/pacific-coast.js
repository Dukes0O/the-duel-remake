import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DRIVE } from './config.js';
import { rockTexture } from './mountain-landscape.js';
import { vegetationCells } from './vegetation.js';
import { registerSceneSystem } from './scene-systems.js';

const SEA = -15;
export const isPacificCoast = course => course.def.id === 'pacific-canyon';

// Visual-only sea stacks remain beyond both main-road and shortcut recovery
// corridors. No seeded Course RNG, feature list, collider or route is changed.
export function buildPacificRockLayout(course) {
  if (!isPacificCoast(course)) return [];
  const coast = course.sections.find(section => section.theme === 'coast');
  if (!coast) return [];
  const anchors = [.17, .28, .40, .50, .555, .615, .71, .80, .875];
  const entries = [];
  for (let index = 0; index < anchors.length; index++) {
    const prominent = [1, 2, 3, 4, 6, 8].includes(index);
    for (let fragment = 0; fragment < 3; fragment++) {
      const s = coast.start + (coast.end - coast.start) * anchors[index] + (fragment - 1) * 15;
      const halfX = fragment === 0 ? prominent ? 16 : 13 : fragment === 1 ? 9 : 5;
      const halfZ = fragment === 0 ? prominent ? 32 : 22 : fragment === 1 ? 16 : 9;
      const radius = Math.hypot(halfX, halfZ) * 1.08;
      let off = 99 + fragment * 24 + 8 * Math.sin(index * 2.1), point;
      for (let attempt = 0; attempt < 18; attempt++, off += 6) {
        point = course.groundAt(s, off);
        if (offshoreClearance(course, point.x, point.z, radius)) break;
        point = null;
      }
      if (!point) continue;
      const heading = point.heading + .18 * Math.sin(index * 2.3 + fragment);
      let floor = Math.min(SEA - 4, point.y);
      for (let i = 0; i < 24; i++) {
        const angle = i / 24 * Math.PI * 2;
        const x = point.x + Math.cos(angle) * radius, z = point.z + Math.sin(angle) * radius;
        const nearest = course.nearest(x, z);
        floor = Math.min(floor, course.groundAt(nearest.s, nearest.lateral).y);
      }
      // The first pass used sea-relative tips hidden below the grassy road
      // shoulder. Main cliffs now rise above the adjacent road's elevation;
      // only the smaller skerries retain low, tide-level silhouettes.
      const roadHeight = course.at(s).y;
      const headlandTop = roadHeight + (prominent ? 18 : 3) + 4.5 * Math.sin(index * 1.7);
      const top = fragment === 0 ? headlandTop : fragment === 1 ? headlandTop - 13 : SEA + 3.8 + Math.sin(index * 1.7);
      entries.push({ s, off, x: point.x, z: point.z, heading, halfX, halfZ, radius, bottom: floor - 5, top, variant: (index * 2 + fragment) % 6, prominent: prominent && fragment === 0 });
    }
  }
  return entries;
}

export function offshoreClearance(course, x, z, radius = 0) {
  const nearest = course.nearest(x, z);
  if (nearest.distance - radius <= DRIVE.boundaryReset + 4) return false;
  for (const cut of course.features.shortcuts) {
    for (let s = cut.start; s <= cut.end; s += 12) {
      const point = course.worldAt(s, course.shortcutOffset(cut, s));
      // Half the sampling step is added to cover points between samples.
      if (Math.hypot(x - point.x, z - point.z) - radius <= cut.halfWidth + 40) return false;
    }
  }
  return true;
}

export function buildSeaStackGeometry(variant = 0) {
  const positions = [], indices = [], sides = 20;
  const levels = [0, .16, .31, .44, .56, .67, .77, .86, .94, 1];
  const phase = variant * 1.713, leanX = .13 * Math.sin(phase + .3), leanZ = .11 * Math.cos(phase);
  const crown = (x, z) => {
    const a = -.20 + .26 * Math.sin(phase), b = .24 * Math.cos(phase + .6);
    const main = Math.exp(-((x - a) ** 2 * 5.3 + (z - b) ** 2 * 3.7));
    const spur = Math.exp(-((x + a * .8 + .20) ** 2 * 11 + (z + b + .36) ** 2 * 7));
    return .66 + main * .30 + spur * .13 + .035 * Math.sin(x * 14 + z * 9 + phase);
  };
  const outline = (angle, height) => {
    const taper = 1 - (.34 + .08 * Math.sin(angle * 2 + phase)) * height ** 1.45;
    const shoulder = .055 * Math.sin(angle * 3 + phase) + .040 * Math.cos(angle * 7 - phase);
    const fractures = height * .061 * Math.sin(angle * 5.0 + height * 19 + phase);
    const reach = (1 + shoulder + fractures) * taper;
    const twist = angle + height * .12 * Math.cos(phase + .7);
    return [Math.cos(twist) * reach + leanX * height, Math.sin(twist) * reach + leanZ * height];
  };
  // Narrow horizontal fracture bands, twisted shoulders and off-centre crown
  // knuckles break tall faces into weathered crags. There is no repeated box
  // outline or single V-cut, and the wide crown never contracts to one apex.
  for (let ring = 0; ring < levels.length; ring++) {
    const height = levels[ring];
    for (let i = 0; i < sides; i++) {
      const [x, z] = outline(i / sides * Math.PI * 2, height);
      const y = height * crown(x, z) + height * (1 - height) * .036 * Math.sin(i * 1.7 + ring + phase);
      positions.push(x, y, z);
      if (ring) {
        const a = (ring - 1) * sides + i, b = (ring - 1) * sides + (i + 1) % sides;
        const c = ring * sides + i, d = ring * sides + (i + 1) % sides;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const inner = positions.length / 3;
  for (let i = 0; i < sides; i++) {
    const [ox, oz] = outline(i / sides * Math.PI * 2, 1), x = ox * .46 + leanX * .5, z = oz * .46 + leanZ * .5;
    positions.push(x, crown(x, z), z);
    const a = (levels.length - 1) * sides + i, b = (levels.length - 1) * sides + (i + 1) % sides;
    const c = inner + i, d = inner + (i + 1) % sides;
    indices.push(a, c, b, b, c, d);
  }
  const cap = positions.length / 3;
  positions.push(leanX, crown(leanX, leanZ), leanZ);
  for (let i = 0; i < sides; i++) indices.push(inner + i, cap, inner + (i + 1) % sides);
  // Keep the existing conservative placement bounds valid for every variant.
  let extentX = 1, extentZ = 1;
  for (let i = 0; i < positions.length; i += 3) { extentX = Math.max(extentX, Math.abs(positions[i])); extentZ = Math.max(extentZ, Math.abs(positions[i + 2])); }
  for (let i = 0; i < positions.length; i += 3) { positions[i] /= extentX; positions[i + 2] /= extentZ; }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexed.setAttribute('uv', new THREE.Float32BufferAttribute(positions.flatMap((_, i) => i % 3 === 0 ? [positions[i], positions[i + 2]] : []), 2)); indexed.setIndex(indices);
  const geometry = indexed.toNonIndexed(); indexed.dispose(); geometry.computeVertexNormals();
  geometry.name = `Fractured coastal fin ${variant}`;
  return geometry;
}

function rockMaterial() {
  const material = new THREE.MeshStandardMaterial({ map: rockTexture('coast'), roughness: .94, color: 0xb6b5a0 });
  material.customProgramCacheKey = () => 'pacific-tidal-rock-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoastWorld;\nvarying vec3 vCoastNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoastWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vCoastNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoastWorld;\nvarying vec3 vCoastNormal;')
      .replace('#include <map_fragment>', `
        vec3 rockBlend=pow(abs(normalize(vCoastNormal)),vec3(4.0));
        rockBlend/=max(dot(rockBlend,vec3(1.0)),.0001);
        vec3 rockP=vCoastWorld*.19;
        vec3 rockColour=texture2D(map,rockP.zy).rgb*rockBlend.x+texture2D(map,rockP.xz).rgb*rockBlend.y+texture2D(map,rockP.xy).rgb*rockBlend.z;
        float rockStrata=.91+.055*sin(vCoastWorld.y*2.8+vCoastWorld.x*.09+vCoastWorld.z*.04);
        float tidalWet=1.0-smoothstep(-14.9,-12.4+sin(vCoastWorld.x*.18)*.35,vCoastWorld.y);
        diffuseColor.rgb*=rockColour*rockStrata*mix(1.0,.43,tidalWet);
      `).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.30,tidalWet);');
  };
  return material;
}

function surfGeometry(course, rock) {
  const positions = [], uv = [], indices = [], steps = 42;
  for (let i = 0; i <= steps; i++) {
    const angle = i / steps * Math.PI * 2;
    for (const edge of [0, 1]) {
      const reach = .66 + edge * .68 + .035 * Math.sin(angle * 7 + rock.variant);
      const localX = Math.cos(angle) * rock.halfX * reach, localZ = Math.sin(angle) * rock.halfZ * reach;
      const c = Math.cos(rock.heading), s = Math.sin(rock.heading);
      positions.push(rock.x + c * localX + s * localZ, SEA + .075, rock.z - s * localX + c * localZ);
      uv.push(edge, i / steps * Math.PI * 2 + rock.s * .021);
    }
    if (!i) continue;
    const a = (i - 1) * 2, b = i * 2;
    const visible = [a, a + 1, b, b + 1].every(index => {
      const nearest = course.nearest(positions[index * 3], positions[index * 3 + 2]);
      return course.groundAt(nearest.s, nearest.lateral).y < SEA - .2;
    });
    if (visible) indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function addPacificCoast(world, course) {
  const rocks = buildPacificRockLayout(course);
  if (!rocks.length) return null;
  const group = new THREE.Group(); group.name = 'Pacific sea cliffs and rocky surf';
  const material = rockMaterial(), time = { value: 0 };
  const foam = new THREE.MeshBasicMaterial({ color: 0xd1dfd7, transparent: true, opacity: .84, alphaTest: .025, depthWrite: false, side: THREE.DoubleSide });
  foam.customProgramCacheKey = () => 'pacific-rock-surf-v2';
  foam.onBeforeCompile = shader => {
    shader.uniforms.coastalSurfTime = time;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRockSurfUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRockSurfUv=uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float coastalSurfTime;\nvarying vec2 vRockSurfUv;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float across=vRockSurfUv.x,along=vRockSurfUv.y;
        float broken=smoothstep(.18,.63,.5+.5*sin(along*5.0+sin(along*3.0)*1.4));
        float wash=.42+.09*sin(along*3.0+coastalSurfTime*.62)+.025*sin(along*13.0);
        float breaker=1.0-smoothstep(.025,.075,abs(across-wash));
        float lace=1.0-smoothstep(.012,.038,abs(across-wash-.23-.025*sin(along*17.0)));
        float flecks=.58+.42*sin(along*27.0+across*85.0)*sin(along*11.0-across*48.0);
        float edge=smoothstep(.02,.14,across)*(1.0-smoothstep(.85,.99,across));
        diffuseColor.a*=edge*broken*flecks*(breaker*.92+lace*.25);
      `);
  };
  const templates = Array.from({length: 6}, (_, i) => buildSeaStackGeometry(i)), matrix = new THREE.Matrix4();
  for (const { key, entries } of vegetationCells(rocks, 240)) {
    const pieces = [], skirts = [];
    for (const { feature: rock } of entries) {
      matrix.compose(new THREE.Vector3(rock.x, rock.bottom, rock.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rock.heading), new THREE.Vector3(rock.halfX, rock.top - rock.bottom, rock.halfZ));
      pieces.push(templates[rock.variant].clone().applyMatrix4(matrix));
      skirts.push(surfGeometry(course, rock));
    }
    for (const [kind, parts, surface] of [['cliffs', pieces, material], ['surf', skirts, foam]]) {
      const geometry = mergeGeometries(parts); parts.forEach(part => part.dispose());
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, surface); mesh.name = `Pacific ${kind} ${key}`;
      mesh.castShadow = kind === 'cliffs'; mesh.receiveShadow = kind === 'cliffs';
      mesh.userData.pacificCell = { key, kind }; group.add(mesh);
    }
  }
  templates.forEach(template => template.dispose());
  group.userData.pacificCoast = { rocks, cells: group.children.length / 2, draws: group.children.length };
  registerSceneSystem(world, { animate: seconds => { time.value = seconds; } });
  world.add(group);
  return group;
}
