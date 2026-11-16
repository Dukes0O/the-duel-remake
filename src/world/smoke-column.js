// A column of smoke that marks a fire from far off (EVERBURN-REMAKE, job 1: "a brazier can be found"). Claude's drawing.
//
// One tall sheet that always turns to face the camera about the upright, drawn by its own shader: thin and dark where it leaves
// the fire, wider, paler and thinner as it climbs, leaning with the wind, and breaking into drifting clumps near its top. It is
// one draw for the whole column, which matters because a column is seen from kilometres away and three stand at once.
//
// `createSmokeColumn({height, wind})` returns a mesh standing at its own position (the fire's mouth). Call
// `mesh.userData.update(seconds)` each frame. `wind` is a level direction in the land's x and z (it need not be a unit).
import * as THREE from 'three';
import {scrapNoise} from './scrap-look.js';

export function createSmokeColumn({height = 40, foot = 1.1, top = 15, wind = {x: 1, z: .35}, lean = .38, colour = 0x2a2623, pale = 0x7d7770, strength = 1} = {}) {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 28); geometry.translate(0, .5, 0);
  const length = Math.hypot(wind.x, wind.z) || 1;
  const material = new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}, uHeight: {value: height}, uFoot: {value: foot}, uTop: {value: top},
      uWind: {value: new THREE.Vector2(wind.x / length, wind.z / length)}, uLean: {value: lean}, uDark: {value: new THREE.Color(colour)},
      uPale: {value: new THREE.Color(pale)}, uStrength: {value: strength}},
    vertexShader: `
      uniform float uHeight;uniform float uFoot;uniform float uTop;uniform vec2 uWind;uniform float uLean;uniform float uTime;
      varying vec2 vUv;
      void main(){
        vUv=uv;
        float up=position.y;
        // The column widens as it climbs, quickly at first.
        float wide=mix(uFoot,uTop,pow(up,.72));
        // It leans with the wind, more the higher it is, and sways a little.
        float drift=uHeight*uLean*up*up+sin(uTime*.31+up*3.1)*up*1.4;
        vec3 base=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
        vec3 right=normalize(vec3(viewMatrix[0][0],0.0,viewMatrix[2][0]));
        vec3 world=base+vec3(0.0,up*uHeight,0.0)+vec3(uWind.x,0.0,uWind.y)*drift+right*position.x*wide;
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uNoise;uniform float uTime;uniform vec3 uDark;uniform vec3 uPale;uniform float uStrength;
      varying vec2 vUv;
      void main(){
        float up=vUv.y,across=(vUv.x-.5)*2.0;
        // Billows rise: the picture slides down the sheet as time passes, faster low down where the smoke is hot.
        float rise=uTime*.055;
        float big=texture2D(uNoise,vec2(vUv.x*.55+.13,up*1.25-rise)).r;
        float mid=texture2D(uNoise,vec2(vUv.x*1.3-.2,up*3.1-rise*2.3)).g;
        float fine=texture2D(uNoise,vec2(vUv.x*3.4,up*7.5-rise*4.0)).b;
        float body=big*.55+mid*.33+fine*.12;
        // Solid in the middle, ragged at the edges; the edge eats further in where the billows are thin.
        float edge=1.0-smoothstep(.28+.5*body,1.0,abs(across)+(.5-body)*.55);
        // Dense at the fire, thinning as it spreads; gone in clumps near the top.
        float thin=mix(.95,.34,smoothstep(.0,.75,up));
        float topFade=1.0-smoothstep(.62+.3*big,1.0,up);
        float footFade=smoothstep(.0,.025,up);
        float alpha=edge*thin*topFade*footFade*uStrength;
        if(alpha<.01)discard;
        // Dark and brown from the fire, grey higher up, lit on the billows' tops.
        vec3 colour=mix(uDark,uPale,smoothstep(.05,.9,up)*.85);
        colour*=.72+.62*body+.22*mid;
        gl_FragColor=vec4(colour,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Smoke column'; mesh.frustumCulled = false; mesh.renderOrder = 2;
  mesh.userData.update = seconds => { material.uniforms.uTime.value = seconds; };
  return mesh;
}
