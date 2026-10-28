import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { strip } from '../src/world.js';
import { createPavedRoadMaterial, createPavedShoulderMaterial, pavedShoulderWidthAt, bindPavedDampRoad } from '../src/road-surface.js';

let checks = 0, rows = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const shaderFor = material => {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader);
  return shader;
};
const asphalt = new THREE.Texture(), gravel = new THREE.Texture();
for (const texture of [asphalt, gravel]) {
  texture.repeat.set(1.25, 2.5); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace; texture.userData.sharedAsset = true;
}
const textureState = textures => JSON.stringify(textures.map(t => [t.uuid, t.version, t.repeat.toArray(), t.offset.toArray(), t.colorSpace, t.wrapS, t.wrapT, t.userData]));
const before = textureState([asphalt, gravel]);
for (const night of [false, true]) {
  const material = createPavedRoadMaterial({ asphalt, night }), shader = shaderFor(material);
  check(material.map === asphalt && material.bumpMap === asphalt, 'Reuse the original asphalt maps without copying assets');
  check(material.roughness === (night ? .55 : .9) && material.bumpScale === .028, 'Preserve the existing lighting and grain baseline');
  check(!material.transparent && material.depthWrite && material.opacity === 1, 'Road remains fully opaque with normal depth handling');
  check(!shader.fragmentShader.includes('discard'), 'No worn asphalt pixel can expose a hole in the road');
  check(shader.fragmentShader.indexOf('float roadWheelWear=') < shader.fragmentShader.indexOf('roughnessFactor-roadWheelWear'), 'Wear masks exist before the roughness calculation');
  check(shader.uniforms.roadWearPolish.value === (night ? 0 : .025), 'Night wheel paths cannot become bright polished headlight stripes');
  check(shader.vertexShader.includes('modelMatrix*vec4(position,1.0)') && shader.fragmentShader.includes('vRoadSurfaceWorld.xz'), 'Repairs are anchored in world space across the lap seam');
  check(shader.fragmentShader.includes('#include <map_fragment>') && shader.fragmentShader.includes('#include <roughnessmap_fragment>'), 'Keep Three lighting, textures and road paint independent');
  material.dispose();
}
for (const def of COURSE.filter(def => !def.arena && !def.offroad)) for (const seed of [1989, 42, 17]) {
  const course = new Course(def, seed), obstacles = JSON.stringify(course.features.obstacles);
  const material = createPavedShoulderMaterial({ gravel, course, alpine: def.theme === 'alpine' }), shader = shaderFor(material);
  check(material.map === gravel && material.bumpMap === gravel && material.roughness === 1, 'Shoulder is rough textured gravel');
  check(!material.transparent && material.opacity === 1 && material.depthWrite, 'Ragged shoulder uses opaque cutout without sorting');
  check(shader.uniforms.shoulderCourseLength.value === course.length, 'Shoulder width shader uses the actual lap length');
  check((shader.uniforms.shoulderPassingLanes?.value.length || 0) === course.features.passingLanes.length, 'Every passing lane participates in shoulder width');
  for (const lane of course.features.passingLanes) for (const delta of [-1, 0, 1, 12, 23, 44, 45, 46]) for (const s of [lane.start + delta, lane.end - delta]) {
    check(Math.abs(pavedShoulderWidthAt(course, s) - course.roadHalfWidthAt(s)) < 1e-9, 'Shoulder follows the exact widening and narrowing of passing lanes');
  }
  for (const side of [-1, 1]) {
    const geometry = strip(course, s => side * course.roadHalfWidthAt(s), s => side * (course.roadHalfWidthAt(s) + 1.25), .018);
    const uv = geometry.attributes.uv, position = geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      const s = uv.getY(i) * 10, width = pavedShoulderWidthAt(course, s), edge = Math.abs(uv.getX(i) * 5) - width;
      const outer = side > 0 ? i % 2 === 1 : i % 2 === 0;
      check(Math.abs(edge - (outer ? 1.25 : 0)) < .00003, 'Shader edge coordinate agrees with existing strip vertices on both sides');
      check(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)), 'All unchanged shoulder vertices remain finite');
      if (!outer) check(edge / 1.25 < .001, 'The asphalt-side edge is completely covered');
      rows++;
    }
    // The clip threshold .85–.975 leaves at least 1.0625 m of solid shoulder.
    check(.85 * 1.25 > 1 && .975 * 1.25 < 1.25, 'Rough edge leaves the full inner metre intact');
    geometry.dispose();
  }
  check(JSON.stringify(course.features.obstacles) === obstacles, 'Material construction does not modify physical course features');
  material.dispose();
}
check(textureState([asphalt, gravel]) === before, 'Shared road/gravel/terrain textures retain their transforms and ownership');

for (const night of [false,true]) for (const wet of [false,true]) {
  const material=createPavedRoadMaterial({asphalt,night,wet});
  assert.equal(material.roughness,wet ? .24 : night ? .55 : .9);
  assert.equal(material.color.getHex(),wet?0x8d99a4:night?0xa7b2bc:0xd3d0ca);
  assert.equal(material.metalness,wet ? .1 : night ? .025 : 0);
  assert.equal(material.customProgramCacheKey(),wet?'paved-road-wear-v2-wet':'paved-road-wear-v2');
  const shader=shaderFor(material);
  assert.ok(!shader.fragmentShader.includes('roadDamp') && !shader.uniforms.roadDampLength);
  bindPavedDampRoad(null,null,material); material.dispose(); checks+=5;
}
const dampRoad={colour:0x747474,dryRoughness:.9,dampRoughness:.58,shadeRanges:[{from:10,to:30},{from:40,to:60},{from:70,to:90}],mist:true};
const mistBanks=[10,30,60,90].map(s=>({s,along:5,opacity:.2}));
const configBefore=JSON.stringify({dampRoad,mistBanks});
{
  const material=createPavedRoadMaterial({asphalt,wet:true,dampRoad,courseLength:100,mistBanks});
  const first=shaderFor(material),second=shaderFor(material);
  assert.equal(material.color.getHex(),0x747474);assert.equal(material.roughness,.9);assert.equal(material.metalness,0);
  assert.equal(material.customProgramCacheKey(),'paved-road-wear-v4-damp-3-4-wet');
  assert.equal(first.uniforms.roadMistRanges,second.uniforms.roadMistRanges);
  assert.equal(first.uniforms.roadShadeRanges,second.uniforms.roadShadeRanges);
  const dryMaterial=createPavedRoadMaterial({asphalt,wet:false,dampRoad,courseLength:100,mistBanks});
  try {
    const dryFirst=shaderFor(dryMaterial),drySecond=shaderFor(dryMaterial);
    assert.equal(dryMaterial.customProgramCacheKey(),'paved-road-wear-v4-damp-3-4-dry');
    assert.notEqual(dryMaterial.customProgramCacheKey(),material.customProgramCacheKey());
    assert.notEqual(dryFirst.fragmentShader,first.fragmentShader,'retained wet/dry floors require separate shader programs');
    assert.equal(dryFirst.uniforms.roadMistRanges,drySecond.uniforms.roadMistRanges);
    assert.equal(dryFirst.uniforms.roadShadeRanges,drySecond.uniforms.roadShadeRanges);
    checks+=5;
  } finally {dryMaterial.dispose();}
  assert.ok(first.fragmentShader.includes('vRoadSurfaceUv.y*10.0') && first.fragmentShader.includes('roadDampRoughness'));
  assert.ok(!material.transparent && material.depthWrite && material.map===asphalt && material.bumpMap===asphalt);
  assert.throws(()=>bindPavedDampRoad(new THREE.Group(),{},material),/four actual valley mist/i);
  assert.equal(JSON.stringify({dampRoad,mistBanks}),configBefore);
  material.dispose();checks+=10;
}
for(const change of [{colour:-1},{dryRoughness:NaN},{dampRoughness:1.1},{shadeRanges:[]},{shadeRanges:[{from:5,to:101}]},{mist:false}]) {
  assert.throws(()=>createPavedRoadMaterial({asphalt,dampRoad:{...dampRoad,...change},courseLength:100,mistBanks}),/damp road/i);checks++;
}
console.log(`Road surface: ${checks} checks passed across ${rows} shoulder vertices; road geometry, paint and gravel-event materials unchanged.`);

// Pin actual pre-fix default shader text; opt-in dampness must not alter any other course.
for(const night of [false,true])for(const wet of [false,true]){
  const material=createPavedRoadMaterial({asphalt,night,wet}),shader=shaderFor(material);
  assert.equal(createHash('sha256').update(shader.vertexShader+'\n'+shader.fragmentShader).digest('hex'),
    wet?'ec52d42a5e6646e3f1673db97b77ba7c4a3c366bd78eed9b5aab63db4dc2d3cf':'7d697b348df90574e2f61bb110b87e079f888cb5e5c27644bb831b4e19bbe9e0',
    'non-damp vertex and fragment shaders stay byte-identical');
  material.dispose();
}
{
  const material=createPavedRoadMaterial({asphalt,dampRoad,courseLength:100,mistBanks}),shader=shaderFor(material);
  // Execute the actual small GLSL range body as arithmetic, rather than copying its mask.
  const body=shader.fragmentShader.match(/float roadDampRange\(float station, vec2 range\)\s*\{([\s\S]*?)\n\s*\}/)?.[1];
  assert.ok(body,'the opt-in shader defines a continuous periodic range mask');
  const js=body.replace(/\bfloat\(/g,'Number(').replace(/\b(?:float|int)\s+/g,'let ').replace(/\bmax\(/g,'Math.max(');
  const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const mask=new Function('station','range','roadDampLength','smoothstep','mod',js);
  const range={x:100,y:200},at=s=>mask(s,range,1000,smoothstep,(x,y)=>((x%y)+y)%y);
  for(const [s,expected] of [[74,0],[75,0],[87.5,.5],[100,1],[150,1],[200,1],[212.5,.5],[225,0],[226,0]])
    assert.ok(Math.abs(at(s)-expected)<1e-12,'actual shader 25m edge at '+s);
  for(const range of [{x:0,y:100},{x:900,y:1000}])for(const s of [0,.001,12.5,987.5,999.999])
    assert.ok(Math.abs(mask(s,range,1000,smoothstep,(x,y)=>((x%y)+y)%y)-mask(s+1000,range,1000,smoothstep,(x,y)=>((x%y)+y)%y))<1e-12,'mask wraps continuously across the lap seam');
  assert.match(shader.fragmentShader,/roadDampRange\(roadDampStation,range\)/,'shade ranges use the continuous mask');
  assert.match(shader.fragmentShader,/roadDampRange\(roadDampStation,range.xy\)\*range.z/,'actual fading mist opacity keeps the same continuous range mask');
  material.dispose();
}
