import * as THREE from 'three';

export const TUNNEL_CONCRETE_TILE_METRES=3;
let concreteTexture;
function texture(){
  if(!concreteTexture){
    concreteTexture=typeof document==='undefined'?new THREE.DataTexture(new Uint8Array([154,156,150,255]),1,1):new THREE.TextureLoader().load('/assets/textures/tunnel-concrete.png');
    concreteTexture.colorSpace=THREE.SRGBColorSpace;concreteTexture.wrapS=concreteTexture.wrapT=THREE.RepeatWrapping;concreteTexture.anisotropy=8;concreteTexture.needsUpdate=true;concreteTexture.userData.sharedAsset=true;
  }
  return concreteTexture;
}

// World-scale projection keeps the same pore/formwork size on the arched
// lining, portal slabs, and differently scaled instanced support pieces.
export function createTunnelConcrete(portal=false){
  const map=texture(),mat=new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:portal?.018:.012,color:portal?0xe1ddd2:0xc3c7c1,roughness:.95,side:THREE.DoubleSide});
  mat.name=portal?'Poured concrete tunnel portals':'Poured concrete tunnel lining';
  mat.customProgramCacheKey=()=>`tunnel-concrete-world-v1-${portal}`;
  mat.onBeforeCompile=shader=>{
    shader.uniforms.tunnelTile={value:TUNNEL_CONCRETE_TILE_METRES};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTunnelWorld;\nvarying vec3 vTunnelNormal;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 tunnelPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        tunnelPosition=instanceMatrix*tunnelPosition;
      #endif
      vTunnelWorld=(modelMatrix*tunnelPosition).xyz;
      vTunnelNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform float tunnelTile;
      varying vec3 vTunnelWorld;
      varying vec3 vTunnelNormal;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 concreteUV=vTunnelWorld/tunnelTile;
      vec3 concreteWeights=pow(abs(normalize(vTunnelNormal)),vec3(5.0));
      concreteWeights/=max(dot(concreteWeights,vec3(1.0)),.0001);
      vec3 concreteSample=texture2D(map,concreteUV.zy).rgb*concreteWeights.x+texture2D(map,concreteUV.xz).rgb*concreteWeights.y+texture2D(map,concreteUV.xy).rgb*concreteWeights.z;
      float concreteVariation=.97+.025*sin(vTunnelWorld.x*.13+vTunnelWorld.z*.097);
      diffuseColor.rgb*=concreteSample*concreteVariation;
      float concreteBump=bumpScale*dot(concreteSample,vec3(.3333));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(concreteBump),dFdy(concreteBump)),faceDirection);');
  };
  return mat;
}

export function tunnelDetailMaterials(){
  const decal=(color,offset,opacity=1)=>new THREE.MeshStandardMaterial({color,roughness:.91,metalness:.12,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:offset,polygonOffsetUnits:offset,transparent:opacity<1,opacity});
  return{tunnelSeam:decal(0x333c39,-3,.7),tunnelPanel:decal(0x88958e,-2),tunnelVent:decal(0x26302e,-2)};
}

export function buildTunnelWallDetails(course,tunnel){
  const data={tunnelSeam:[],tunnelPanel:[],tunnelVent:[]},placements=[];
  const segments=Math.ceil((tunnel.end-tunnel.start)/4),step=(tunnel.end-tunnel.start)/segments;
  const wallPoint=(s,y,side)=>{
    const row=Math.min(segments-1,Math.max(0,Math.floor((s-tunnel.start)/step))),start=tunnel.start+row*step,t=(s-start)/step;
    const a=course.worldAt(start,side*tunnel.width),b=course.worldAt(start+step,side*tunnel.width);
    return[THREE.MathUtils.lerp(a.x,b.x,t),THREE.MathUtils.lerp(a.y,b.y,t)+y,THREE.MathUtils.lerp(a.z,b.z,t)];
  };
  const quad=(kind,s0,s1,y0,y1,side)=>{
    // Split overlays at the lining's own four-metre rows. They remain exactly
    // on its planar faces even where the course bends or changes elevation.
    const divisions=[s0];for(let s=tunnel.start+(Math.floor((s0-tunnel.start)/step)+1)*step;s<s1-.00001;s+=step)divisions.push(s);divisions.push(s1);
    for(let row=1;row<divisions.length;row++){
      const points=[[divisions[row-1],y0],[divisions[row],y0],[divisions[row-1],y1],[divisions[row],y1]].map(([s,y])=>wallPoint(s,y,side));
      for(const i of[0,2,1,1,2,3])data[kind].push(...points[i]);
    }
    placements.push({kind,s0,s1,y0,y1,side,lateral:side*tunnel.width});
  };
  for(const side of[-1,1]){
    for(let s=tunnel.start+8;s<tunnel.end-2;s+=8)quad('tunnelSeam',s-.018,s+.018,.18,3.57,side);
    for(let s=tunnel.start;s<tunnel.end;s+=4)quad('tunnelSeam',s,Math.min(tunnel.end,s+4),1.77,1.796,side);
    for(let s=tunnel.start+28;s<tunnel.end-16;s+=40){
      quad('tunnelPanel',s-.65,s+.65,1.32,2.36,side);
      for(const y of[1.32,2.33])quad('tunnelSeam',s-.65,s+.65,y,y+.03,side);
      for(const along of[-.65,.62])quad('tunnelSeam',s+along,s+along+.03,1.32,2.36,side);
      quad('tunnelSeam',s+.42,s+.47,1.69,1.98,side);
      for(const along of[-.56,.53])for(const y of[1.41,2.24])quad('tunnelSeam',s+along,s+along+.032,y,y+.032,side);
    }
    for(let s=tunnel.start+14;s<tunnel.end-10;s+=24){
      quad('tunnelVent',s-.44,s+.44,.29,.56,side);
      for(let i=0;i<5;i++)quad('tunnelPanel',s-.43,s+.43,.31+i*.049,.324+i*.049,side);
    }
  }
  const geometries={};
  for(const[kind,positions]of Object.entries(data)){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.name=kind;geometry.userData.flushTunnelDetails=placements.filter(p=>p.kind===kind);geometries[kind]=geometry;
  }
  return geometries;
}
