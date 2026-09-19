import * as THREE from 'three';
import { DEFAULT_SUN_OFFSET } from './lighting-moods.js';

// One direction drives the sky disc and the light that casts scene shadows.
export const SUN_OFFSET=DEFAULT_SUN_OFFSET;

export function createAtmosphericSky(){
  const clouds=new THREE.TextureLoader().load('/assets/textures/cloud-density.png');
  clouds.wrapS=clouds.wrapT=THREE.RepeatWrapping;
  clouds.anisotropy=4; // Density data intentionally uses no colour transform.
  const material=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{
      top:{value:new THREE.Color('#466d86')},horizon:{value:new THREE.Color('#f6bc82')},
      sunDir:{value:new THREE.Vector3(SUN_OFFSET.x,SUN_OFFSET.y,SUN_OFFSET.z).normalize()},
      sunStrength:{value:1},cloudDensity:{value:clouds},cloudTime:{value:0},
      cloudCover:{value:1},cloudTint:{value:new THREE.Color(.88,.89,.86)},
    },
    vertexShader:'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec3 vDir;
      uniform vec3 top,horizon,sunDir,cloudTint;
      uniform float sunStrength,cloudTime,cloudCover;
      uniform sampler2D cloudDensity;
      void main(){
        vec3 d=normalize(vDir);
        float h=max(d.y,0.0),day=clamp(sunStrength,0.0,1.0);
        vec3 colour=mix(horizon,top,pow(h,.48));
        float sun=max(dot(d,sunDir),0.0);
        colour+=vec3(1.0,.68,.38)*pow(sun,20.0)*.22*day;
        // Project the direction onto a distant horizontal cloud deck. Fade
        // it before the horizon to avoid stretched texels and hard bands.
        vec2 uv=d.xz/max(d.y,.07)*.19+vec2(cloudTime*.00055,cloudTime*.00016);
        float density=texture2D(cloudDensity,uv).r;
        float wisps=texture2D(cloudDensity,uv*.53+vec2(.37,.61)).r;
        float coverage=smoothstep(.08,.52,density)*.83;
        coverage+=smoothstep(.4,.86,wisps)*.12*(1.0-coverage);
        coverage=clamp(coverage*cloudCover,0.0,1.0);
        coverage*=smoothstep(.025,.19,h);
        vec3 cloudShade=mix(mix(top,horizon,.38),cloudTint,day);
        cloudShade*=mix(.69,1.09,smoothstep(.08,.92,density));
        cloudShade+=vec3(.12,.075,.03)*pow(sun,7.0)*day;
        colour=mix(colour,cloudShade,coverage);
        colour+=vec3(1.0,.93,.76)*smoothstep(.999958,.999988,sun)*4.0*day*(1.0-coverage);
        gl_FragColor=vec4(colour,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1900,32,20),material);
  sky.name='Atmosphere and cloud deck';sky.frustumCulled=false;sky.userData.excludeAmbientOcclusion=true;
  let disposed=false;
  return{sky,update(time){if(!disposed)material.uniforms.cloudTime.value=time;},dispose(){if(disposed)return;disposed=true;clouds.dispose();}};
}
