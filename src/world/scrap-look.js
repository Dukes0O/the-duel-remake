// Drawn wear and fire for scrap machines, written as drawing code instead of model files
// (EVERBURN-FURNACE-LOOK round 3). Nothing here changes race state: it only changes how parts are drawn.
import * as THREE from 'three';

// One small noise picture shared by every effect: red is soft blotches, green is fine grain, blue feeds the streaks.
let noise=null;
export function scrapNoise(){
  if(noise)return noise;
  const size=128,data=new Uint8Array(size*size*4);
  const hash=(x,y,k)=>{let h=(x*374761393+y*668265263+k*974711)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967295;};
  const smooth=t=>t*t*(3-2*t);
  // Value noise on a lattice that repeats every `cells` cells, so the picture tiles without a seam.
  const value=(x,y,cells,k)=>{
    const fx=x/size*cells,fy=y/size*cells,x0=Math.floor(fx),y0=Math.floor(fy),tx=smooth(fx-x0),ty=smooth(fy-y0);
    const at=(i,j)=>hash(((x0+i)%cells+cells)%cells,((y0+j)%cells+cells)%cells,k);
    return (at(0,0)*(1-tx)+at(1,0)*tx)*(1-ty)+(at(0,1)*(1-tx)+at(1,1)*tx)*ty;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    data[i]=255*(value(x,y,4,1)*.6+value(x,y,8,2)*.28+value(x,y,16,3)*.12);
    data[i+1]=255*(value(x,y,32,4)*.55+value(x,y,64,5)*.45);
    data[i+2]=255*(value(x,y,16,6)*.65+value(x,y,32,7)*.35);
    data[i+3]=255;
  }
  noise=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  noise.wrapS=noise.wrapT=THREE.RepeatWrapping;noise.magFilter=THREE.LinearFilter;
  noise.minFilter=THREE.LinearMipmapLinearFilter;noise.generateMipmaps=true;noise.needsUpdate=true;
  return noise;
}

// Wear for one machine. `inverse` turns a world point into the machine's own metres (kept current by the caller), so
// the grime rides with a moving machine. `soot` is up to four stains: x, y, z in the machine's metres and a radius.
// `paint` is how much rust, runs, grain and settled soot to draw: 1 for plain-coloured parts, 0 for photo surfaces.
export function createScrapWear({soot=[],dust=0x5b4a35,dustTop=1.35,paint=1}={}){
  const stains=[0,1,2,3].map(index=>new THREE.Vector4(...(soot[index]??[0,-99,0,.01])));
  const uniforms={uScrapInverse:{value:new THREE.Matrix4()},uScrapNoise:{value:scrapNoise()},
    uScrapDust:{value:new THREE.Color(dust)},uScrapDustTop:{value:dustTop},uScrapPaint:{value:paint},uScrapSoot:{value:stains}};
  function apply(material){
    if(!material?.isMeshStandardMaterial||material.userData.scrapWear)return material;
    material.userData.scrapWear=true;
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nuniform mat4 uScrapInverse;\nvarying vec3 vScrapPos;\nvarying vec3 vScrapNormal;')
        .replace('#include <project_vertex>',`#include <project_vertex>
          vScrapPos=(uScrapInverse*modelMatrix*vec4(transformed,1.0)).xyz;
          vScrapNormal=mat3(uScrapInverse)*mat3(modelMatrix)*objectNormal;`);
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>',`#include <common>
          uniform sampler2D uScrapNoise;uniform vec3 uScrapDust;uniform float uScrapDustTop;uniform float uScrapPaint;uniform vec4 uScrapSoot[4];
          varying vec3 vScrapPos;varying vec3 vScrapNormal;
          vec3 scrapTri(vec3 p,vec3 w,float s){
            return texture2D(uScrapNoise,p.zy*s).rgb*w.x+texture2D(uScrapNoise,p.xz*s).rgb*w.y+texture2D(uScrapNoise,p.xy*s).rgb*w.z;}`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          vec3 scrapPlain=diffuseColor.rgb;
          vec3 scrapN=normalize(vScrapNormal);
          vec3 scrapW=pow(abs(scrapN),vec3(4.0));scrapW/=scrapW.x+scrapW.y+scrapW.z;
          vec3 scrapBig=scrapTri(vScrapPos,scrapW,.085);
          vec3 scrapMid=scrapTri(vScrapPos+7.3,scrapW,.31);
          vec3 scrapFine=scrapTri(vScrapPos,scrapW,1.35);
          float scrapWall=scrapW.x+scrapW.z;
          // Worn paint: soft patches go darker and rustier, with ragged edges.
          float scrapPatch=smoothstep(.46,.60,scrapBig.r*.65+scrapMid.b*.35+scrapFine.g*.08);
          float scrapLum=dot(diffuseColor.rgb,vec3(.3,.6,.1));
          vec3 scrapRust=vec3(.20,.075,.03)*(.55+1.6*scrapLum)+vec3(.02,.008,.0);
          diffuseColor.rgb=mix(diffuseColor.rgb,scrapRust,scrapPatch*.62);
          // Runs of rust and soot down every upright face.
          vec3 scrapSp=vec3(vScrapPos.x,vScrapPos.y*.07,vScrapPos.z);
          float scrapRun=texture2D(uScrapNoise,scrapSp.zy*1.1).b*scrapW.x+texture2D(uScrapNoise,scrapSp.xy*1.1).b*scrapW.z;
          diffuseColor.rgb*=1.0-.55*smoothstep(.52,.74,scrapRun)*scrapWall;
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.30,.13,.05)*(.5+scrapLum),.35*smoothstep(.30,.16,scrapRun)*scrapWall);
          // Grain, so that no face is one flat colour.
          diffuseColor.rgb*=.56+.52*scrapFine.g;
          // Soot settled on everything that faces up.
          diffuseColor.rgb*=1.0-.6*max(scrapN.y,0.0)*(.45+.55*scrapMid.r);
          // Shade gathers low on a machine and under its overhangs.
          diffuseColor.rgb*=.62+.38*smoothstep(.2,3.4,vScrapPos.y)+.0*scrapWall;
          diffuseColor.rgb=mix(scrapPlain,diffuseColor.rgb,uScrapPaint);
          // Soot stains: thick at the mouth of each fire, trailing upward.
          float scrapStain=0.0;
          for(int i=0;i<4;i++){vec3 d=vScrapPos-uScrapSoot[i].xyz;d.y*=d.y<0.0?2.6:.55;
            scrapStain=max(scrapStain,smoothstep(uScrapSoot[i].w,uScrapSoot[i].w*.25,length(d)));}
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.012,.011,.010),scrapStain*(.55+.45*scrapMid.g)*.9);
          // Road dust thrown up over the lower parts.
          float scrapDusty=(1.0-smoothstep(.15,uScrapDustTop,vScrapPos.y))*(.35+.65*scrapMid.g);
          diffuseColor.rgb=mix(diffuseColor.rgb,uScrapDust*(.75+.5*scrapFine.g),scrapDusty*.42);`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=mix(roughnessFactor,clamp(roughnessFactor*(.82+.3*scrapFine.g)+.1*scrapPatch,0.0,1.0),uScrapPaint);`);
    };
    material.customProgramCacheKey=()=>'scrap-wear-2';
    material.needsUpdate=true;
    return material;
  }
  // Call once a frame with the machine's root, after it has moved.
  function follow(root){root.updateWorldMatrix(true,false);uniforms.uScrapInverse.value.copy(root.matrixWorld).invert();}
  return {apply,follow,uniforms};
}

const BILLBOARD_VERTEX=`
  varying vec2 vUv;
  void main(){
    vUv=uv;
    vec4 mv=modelViewMatrix*vec4(0.0,0.0,0.0,1.0);
    mv.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
    gl_Position=projectionMatrix*mv;
  }`;

// Fire that always faces the viewer. One material serves every tongue; `seed` shifts each tongue's flicker.
export function createFlameMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{uNoise:{value:scrapNoise()},uTime:{value:0},uSeed:{value:0}},
    vertexShader:BILLBOARD_VERTEX,
    fragmentShader:`
      uniform sampler2D uNoise;uniform float uTime;uniform float uSeed;varying vec2 vUv;
      void main(){
        float y=vUv.y,x=(vUv.x-.5)*2.0;
        float a=texture2D(uNoise,vec2(vUv.x*.55+uSeed,y*.45-uTime*.85)).r;
        float b=texture2D(uNoise,vec2(vUv.x*1.2-uSeed*1.7,y*.9-uTime*1.9)).b;
        float lick=a*.75+b*.45;
        // A wide base that narrows and breaks up as it rises.
        float body=1.0-smoothstep(0.0,1.0,abs(x+(lick-.6)*.5*y)*(1.15+y*2.2)+y*1.25-lick*.95+.12);
        body*=smoothstep(0.0,.06,y);
        vec3 colour=mix(vec3(.85,.12,.01),vec3(1.0,.52,.08),smoothstep(.15,.55,body));
        colour=mix(colour,vec3(1.0,.9,.55),smoothstep(.55,.95,body));
        gl_FragColor=vec4(colour*body*1.05,body);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  });
}

// Chimney smoke as soft puffs that face the viewer. `material.color` is the smoke's colour and may be changed.
export function createSmokeMaterial(colour=0x302c28){
  const color=new THREE.Color(colour);
  const material=new THREE.ShaderMaterial({
    uniforms:{uNoise:{value:scrapNoise()},uColor:{value:color},uFade:{value:1},uSeed:{value:0}},
    vertexShader:BILLBOARD_VERTEX,
    fragmentShader:`
      uniform sampler2D uNoise;uniform vec3 uColor;uniform float uFade;uniform float uSeed;varying vec2 vUv;
      void main(){
        vec2 p=(vUv-.5)*2.0;
        float cloud=texture2D(uNoise,vUv*.42+uSeed).r*.7+texture2D(uNoise,vUv*.95-uSeed).b*.3;
        float alpha=(1.0-smoothstep(.25,1.0,length(p)+(cloud-.5)*.9))*uFade;
        // Lit from above, darker in its belly.
        vec3 colour=uColor*(1.15+.9*vUv.y*cloud+.5*cloud);
        gl_FragColor=vec4(colour,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,
  });
  material.color=color;
  return material;
}

// A warm pool of light on the ground beside an open fire door.
export function createGroundGlowMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      uniform float uTime;varying vec2 vUv;
      void main(){
        float d=length((vUv-.5)*2.0);
        float glow=pow(max(0.0,1.0-d),2.2)*(.85+.15*sin(uTime*11.0)*sin(uTime*7.3));
        gl_FragColor=vec4(vec3(1.0,.42,.08)*glow*.9,glow);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  });
}

// Sparks thrown out of an open fire door. `place(seconds, origin, outward, drift)` moves them; the points repeat on a
// fixed cycle read from the clock, so nothing is stored between frames.
export function createSparks(count=44){
  const positions=new Float32Array(count*3),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.ShaderMaterial({
    vertexShader:`void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(9.0,70.0/max(1.0,-mv.z));gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`void main(){float d=length(gl_PointCoord-.5)*2.0;float a=1.0-smoothstep(.2,1.0,d);
      gl_FragColor=vec4(vec3(1.0,.62,.2)*a*1.8,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const points=new THREE.Points(geometry,material);points.name='Sparks from the open fire door';points.frustumCulled=false;
  const unit=(index,k)=>{const v=Math.sin(index*127.1+k*311.7)*43758.5453;return v-Math.floor(v);};
  points.userData.place=(seconds,origin,outward,drift=0)=>{
    for(let index=0;index<count;index++){
      const life=(seconds*(.55+.5*unit(index,1))+unit(index,2))%1,reach=1.2+3.4*unit(index,3);
      const side=(unit(index,4)-.5)*2.4,lift=1.2+2.8*unit(index,5);
      positions[index*3]=origin.x+outward.x*reach*life+outward.z*side*(.4+life);
      positions[index*3+1]=origin.y+lift*life-2.6*life*life+(unit(index,6)-.5)*.5;
      positions[index*3+2]=origin.z+outward.z*reach*life+outward.x*side*(.4+life)-drift*life*life;
    }
    geometry.attributes.position.needsUpdate=true;
  };
  return points;
}

// A soft dark patch on the ground under a machine, so that it sits on the sand where the sun's shadow does not reach.
export function createGroundShade(){
  return new THREE.ShaderMaterial({
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv;void main(){float d=length((vUv-.5)*2.0);gl_FragColor=vec4(vec3(.03,.025,.02),.62*(1.0-smoothstep(.35,1.0,d)));}`,
    transparent:true,depthWrite:false,
  });
}
