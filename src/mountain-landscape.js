import * as THREE from 'three';
import { createPolylineIndex } from './polyline-index.js';

// Normalized ridge networks stay strictly inside the existing collision ellipse.
// Each path stores x, z, elevation; subsidiary paths form connected spurs.
const RIDGES = [
  { width:.42, paths:[
    [[-.84,-.18,.08],[-.59,-.08,.45],[-.32,.1,.76],[-.07,.02,.61],[.23,.17,1],[.52,.09,.61],[.82,.29,.08]],
    [[-.32,.1,.72],[-.42,.4,.48],[-.64,.7,.03]],[[.23,.17,.85],[.38,-.22,.53],[.58,-.68,.02]],[[.05,.07,.54],[-.12,-.38,.3],[-.37,-.86,.01]],
  ]},
  { width:.46, paths:[
    [[-.7,-.54,.03],[-.43,-.33,.48],[-.27,-.08,1],[.04,.1,.7],[.35,.22,.81],[.62,.44,.29],[.71,.68,.02]],
    [[-.27,-.08,.9],[-.65,.19,.42],[-.88,.33,.02]],[[.35,.22,.73],[.49,-.1,.45],[.72,-.47,.03]],[[.04,.1,.57],[-.12,.46,.32],[-.25,.89,.01]],
  ]},
  { width:.39, paths:[
    [[-.72,.53,.03],[-.5,.21,.43],[-.2,.33,.86],[.02,.12,.6],[.21,-.12,1],[.46,-.28,.65],[.81,-.3,.04]],
    [[-.2,.33,.75],[-.49,-.04,.47],[-.73,-.53,.02]],[[.21,-.12,.86],[.07,-.51,.49],[-.19,-.86,.02]],[[.21,-.12,.77],[.55,.12,.42],[.84,.46,.02]],
  ]},
  { width:.50, paths:[
    [[-.85,-.15,.01],[-.56,.06,.42],[-.27,.02,.73],[-.1,.24,1],[.2,.33,.64],[.52,.29,.78],[.81,.13,.03]],
    [[-.27,.02,.65],[-.18,-.4,.44],[-.48,-.77,.02]],[[.52,.29,.72],[.59,-.13,.37],[.73,-.6,.02]],[[.02,.29,.73],[.08,.59,.37],[-.04,.92,.01]],
  ]},
];
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};

function ridgeHeight(x,z,variant) {
  const definition=RIDGES[variant%RIDGES.length],r=Math.hypot(x,z);
  let h=.23*Math.max(0,1-r*r);
  for(let pathIndex=0;pathIndex<definition.paths.length;pathIndex++){
    const path=definition.paths[pathIndex];
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));
      const distance=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz),height=THREE.MathUtils.lerp(a[2],b[2],smooth(t));
      const width=definition.width*(pathIndex? .74:1)*(.67+.33*height);
      h=Math.max(h,height*Math.exp(-Math.pow(distance/width,1.8)));
    }
  }
  // Fine gullies break the flank silhouette without making separate cones.
  const erosion=1+.02*Math.sin(x*19+Math.sin(z*9)*2)+.012*Math.sin(z*31-x*17)+.008*Math.sin(x*57+z*43);
  return Math.max(0,h*erosion*(1-smooth((r-.82)/.18)));
}

export function buildMountainGeometry(variant=0) {
  const radial=38,angular=112,positions=[],uv=[],indices=[],heights=[];
  let highest=0;
  const vertex=(x,z)=>{const h=ridgeHeight(x,z,variant);highest=Math.max(highest,h);positions.push(x,h,z);uv.push(x,z);heights.push(h);};
  vertex(0,0);
  for(let ring=1;ring<=radial;ring++)for(let i=0;i<angular;i++){const a=i/angular*Math.PI*2,r=ring/radial;vertex(Math.cos(a)*r,Math.sin(a)*r);}
  for(let i=0;i<angular;i++)indices.push(0,1+(i+1)%angular,1+i);
  for(let ring=2;ring<=radial;ring++)for(let i=0;i<angular;i++){
    const current=1+(ring-1)*angular+i,next=1+(ring-1)*angular+(i+1)%angular,previous=current-angular,previousNext=next-angular;
    indices.push(previous,next,current,previous,previousNext,next);
  }
  for(let i=0;i<heights.length;i++)positions[i*3+1]=heights[i]/highest;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.name=`Connected ridge massif ${variant+1}`;geometry.userData.mountainVariant=variant;geometry.userData.rimStart=1+(radial-1)*angular;
  return geometry;
}

// Match the far landscape's grid and triangle diagonal, including omitted
// near-road quads. Cache shared vertices across the biome views of one course.
// test-terrain compares this placement against world.js's actual mesh buffers.
const farSurfaceCache=new WeakMap();
function farRimSurface(course){
  if(farSurfaceCache.has(course.samples))return farSurfaceCache.get(course.samples);
  const grid=(course.def.kind==='chase'||course.def.layout==='city')?8:course.def.arena?16:32,threshold=course.def.arena?18:(course.def.kind==='chase'||course.def.layout==='city')?50:80;
  const route=course.samples.filter((_,i)=>i%4===0),last=course.samples.at(-1),vertices=new Map();if(route.at(-1)!==last)route.push(last);
  const routeIndex=createPolylineIndex(route);
  const vertex=(i,j)=>{
    const key=`${i}:${j}`;if(vertices.has(key))return vertices.get(key);
    const x=i*grid,z=j*grid,{index,t,distanceSq:best}=routeIndex.query(x,z);
    const a=route[index-1],b=route[index],dx=b.x-a.x,dz=b.z-a.z,px=x-a.x-t*dx,pz=z-a.z-t*dz;
    const roadS=a.s+(b.s-a.s)*t,off=Math.sqrt(best)*Math.sign(px*dz-pz*dx);
    const result={y:Math.fround(course.groundAt(roadS,off).y-.15),distance:Math.sqrt(best)};vertices.set(key,result);return result;
  };
  const sample=(x,z)=>{
    const i=Math.floor(x/grid),j=Math.floor(z/grid),u=x/grid-i,v=z/grid-j;
    const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i,j+1),d=vertex(i+1,j+1);
    if([a,b,c,d].some(p=>p.distance<=threshold))return null;
    return u+v<=1?a.y*(1-u-v)+b.y*u+c.y*v:b.y*(1-v)+c.y*(1-u)+d.y*(u+v-1);
  };
  farSurfaceCache.set(course.samples,sample);return sample;
}

// Bury the full rendered rim beneath both terrain representations. Increasing
// the vertical scale by the burial depth preserves the exact top elevation.
export function mountainTransform(course,mountain) {
  let minY=mountain.y;
  const c=Math.cos(mountain.heading),sn=Math.sin(mountain.heading),farSurface=farRimSurface(course);
  for(let i=0;i<64;i++){
    const a=i*Math.PI/32,x=Math.cos(a)*mountain.halfX,z=Math.sin(a)*mountain.halfZ,n=course.nearest(mountain.x+c*x+sn*z,mountain.z-sn*x+c*z);
    minY=Math.min(minY,course.groundAt(n.s,n.lateral).y);
  }
  for(let i=0;i<112;i++){
    const a=i*Math.PI/56,b=(i+1)*Math.PI/56,ax=Math.cos(a)*mountain.halfX,az=Math.sin(a)*mountain.halfZ,bx=Math.cos(b)*mountain.halfX,bz=Math.sin(b)*mountain.halfZ;
    for(const t of[0,.25,.5,.75]){
      const x=ax+(bx-ax)*t,z=az+(bz-az)*t,height=farSurface(mountain.x+c*x+sn*z,mountain.z-sn*x+c*z);
      if(height!==null)minY=Math.min(minY,height);
    }
  }
  const burial=mountain.y-minY+4;
  return new THREE.Matrix4().compose(new THREE.Vector3(mountain.x,mountain.y-burial,mountain.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),mountain.heading),new THREE.Vector3(mountain.halfX,mountain.height+burial,mountain.halfZ));
}

const textureCache=new Map();
function rockTexture(theme) {
  const name=theme==='desert'?'red-sandstone':'granite-cliff';
  if(!textureCache.has(name)){
    const texture=new THREE.TextureLoader().load(`/assets/textures/${name}.png`);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;texture.userData.sharedAsset=true;textureCache.set(name,texture);
  }
  return textureCache.get(name);
}

export function createMountainMaterial(theme,texture) {
  const material=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.24,roughness:.96,color:theme==='desert'?0xe0cabb:theme==='coast'?0xb9bdad:0xbac2c5});
  material.name=`World mapped ${theme} rock`;
  material.customProgramCacheKey=()=>`connected-mountain-v2-${theme}`;
  material.onBeforeCompile=shader=>{
    shader.uniforms.mountainSnow={value:theme==='alpine'?1:0};
    shader.uniforms.mountainMoss={value:theme==='coast'?1:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMountainPosition;\nvarying vec3 vMountainNormal;\nvarying float vMountainHeight;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 mountainPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        mountainPosition=instanceMatrix*mountainPosition;
      #endif
      vMountainPosition=(modelMatrix*mountainPosition).xyz;
      vMountainNormal=inverseTransformDirection(transformedNormal,viewMatrix);
      vMountainHeight=position.y;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform float mountainSnow;
      uniform float mountainMoss;
      varying vec3 vMountainPosition;
      varying vec3 vMountainNormal;
      varying float vMountainHeight;
      vec4 mountainSample(sampler2D tex,vec3 p,vec3 weights){
        return texture2D(tex,p.zy)*weights.x+texture2D(tex,p.xz)*weights.y+texture2D(tex,p.xy)*weights.z;
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 mountainNormal=normalize(vMountainNormal);
      vec3 mountainWeights=pow(abs(mountainNormal),vec3(4.0));
      mountainWeights/=max(dot(mountainWeights,vec3(1.0)),0.0001);
      vec4 mountainRock=mountainSample(map,vMountainPosition*.095,mountainWeights);
      vec4 mountainLarge=mountainSample(map,vMountainPosition*.013+vec3(.27,.51,.13),mountainWeights);
      float mountainVariation=.69+.83*mountainLarge.r;
      diffuseColor*=vec4(mountainRock.rgb*mountainVariation,1.0);
      float moss=mountainMoss*(1.0-smoothstep(.12,.43,vMountainHeight))*smoothstep(.42,.85,mountainNormal.y);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.67,.79,.46),moss*.7);
      float mountainSnowLine=vMountainHeight+.042*sin(vMountainPosition.x*.071+vMountainPosition.z*.054)+.035*(mountainRock.r-.5);
      float snow=mountainSnow*smoothstep(.54,.81,mountainSnowLine)*smoothstep(.24,.73,mountainNormal.y);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.88,.91),snow*.95);
      float mountainBump=bumpScale*dot(mountainRock.rgb,vec3(.3333))*(1.0-snow*.86);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(mountainBump),dFdy(mountainBump)),faceDirection);`);
  };
  return material;
}

export function addMountainLandscape(group,course) {
  if(!course.features.mountains.length)return;
  const theme=course.def.theme,material=createMountainMaterial(theme,rockTexture(theme));
  for(let variant=0;variant<RIDGES.length;variant++){
    const features=course.features.mountains.filter((_,index)=>index%RIDGES.length===variant);if(!features.length)continue;
    const mesh=new THREE.InstancedMesh(buildMountainGeometry(variant),material,features.length);mesh.name=`${theme} ridge range ${variant+1}`;
    features.forEach((mountain,index)=>mesh.setMatrixAt(index,mountainTransform(course,mountain)));
    mesh.receiveShadow=true;mesh.userData.mountainFeatures=features;mesh.computeBoundingSphere();group.add(mesh);
  }
}
