import * as THREE from 'three';

// CPU equivalent of the shader's room-box ray. Tests can verify perspective
// and window orientation without a browser or an extra interior mesh.
export function traceCityInteriorRay(uv, windowSize, eye, face = 1, axis = 'x', depth = 3) {
  const width = axis === 'x' ? windowSize[2] : windowSize[0], height = windowSize[1];
  const direction = axis === 'x' ? [face * eye[2], -eye[1], face * eye[0]] : [-face * eye[0], -eye[1], face * eye[2]];
  const origin = [(uv[0] - .5) * width, (uv[1] - .5) * height, 0];
  const half = [Math.max(width * .72, 1.4), Math.max(height * .5, 1.4)];
  if (direction[2] <= 0) return null;
  const distances = [0, 1].map(i => Math.abs(direction[i]) < .0001 ? Infinity : ((direction[i] > 0 ? half[i] : -half[i]) - origin[i]) / direction[i]);
  distances.push(depth / direction[2]);
  const distance = Math.min(...distances), wall = distances.indexOf(distance);
  return { wall: wall === 2 ? 'back' : wall === 0 ? 'side' : direction[1] > 0 ? 'ceiling' : 'floor', point: origin.map((value, i) => value + direction[i] * distance), distance };
}

export function createCityInteriorMaterial() {
  const material = new THREE.MeshStandardMaterial({ color: 0x6b8991, emissive: 0xffffff, emissiveIntensity: .7, metalness: .16, roughness: .21 });
  material.name = 'City glass with perspective interiors';
  material.customProgramCacheKey = () => 'city-room-parallax-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 vCityRoomPosition;
      varying vec3 vCityRoomEye;
      varying vec3 vCityRoomDimensions;
      varying vec3 vCityRoomNormal;
      varying float vCityRoomSeed;`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      mat4 cityRoomMatrix=modelMatrix;
      #ifdef USE_INSTANCING
        cityRoomMatrix=modelMatrix*instanceMatrix;
      #endif
      vec3 cityRoomToEye=cameraPosition-(cityRoomMatrix*vec4(transformed,1.0)).xyz;
      vec3 cityRoomX=cityRoomMatrix[0].xyz,cityRoomY=cityRoomMatrix[1].xyz,cityRoomZ=cityRoomMatrix[2].xyz;
      vCityRoomDimensions=vec3(length(cityRoomX),length(cityRoomY),length(cityRoomZ));
      vCityRoomEye=vec3(dot(normalize(cityRoomX),cityRoomToEye),dot(normalize(cityRoomY),cityRoomToEye),dot(normalize(cityRoomZ),cityRoomToEye));
      vCityRoomPosition=position;
      vCityRoomNormal=normal;
      vCityRoomSeed=fract(sin(dot(floor(cityRoomMatrix[3].xyz*vec3(.47,1.71,.53)),vec3(12.9898,78.233,37.719)))*43758.5453);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vCityRoomPosition;
      varying vec3 vCityRoomEye;
      varying vec3 vCityRoomDimensions;
      varying vec3 vCityRoomNormal;
      varying float vCityRoomSeed;
      float cityRoomBox(vec3 origin,vec3 direction,vec3 lower,vec3 upper){
        vec3 signs=step(vec3(0.0),direction)*2.0-1.0;
        vec3 inv=signs/max(abs(direction),vec3(.0001));
        vec3 a=(lower-origin)*inv,b=(upper-origin)*inv;
        vec3 near=min(a,b),far=max(a,b);
        float entry=max(max(near.x,near.y),near.z),exit=min(min(far.x,far.y),far.z);
        return exit>=max(0.0,entry)?max(0.0,entry):100000.0;
      }
      vec3 cityInteriorColor=vec3(.02,.035,.04);
      float cityInteriorLight=0.0;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      bool cityThinX=vCityRoomDimensions.x<vCityRoomDimensions.z;
      float cityFace=cityThinX?vCityRoomNormal.x:vCityRoomNormal.z;
      if(abs(cityFace)>.5){
        float cityFacing=sign(cityFace),cityWidth=cityThinX?vCityRoomDimensions.z:vCityRoomDimensions.x,cityHeight=vCityRoomDimensions.y;
        vec2 cityUv=vec2(cityThinX?-cityFacing*vCityRoomPosition.z:cityFacing*vCityRoomPosition.x,vCityRoomPosition.y)+.5;
        vec3 cityRay=cityThinX?vec3(cityFacing*vCityRoomEye.z,-vCityRoomEye.y,cityFacing*vCityRoomEye.x):vec3(-cityFacing*vCityRoomEye.x,-vCityRoomEye.y,cityFacing*vCityRoomEye.z);
        vec3 cityOrigin=vec3((cityUv-.5)*vec2(cityWidth,cityHeight),0.0);
        float cityHalfW=max(cityWidth*.72,1.4),cityHalfH=max(cityHeight*.5,1.4);
        float cityDepth=(cityHeight>1.8?4.0:2.7)+vCityRoomSeed*1.1;
        float cityBack=cityDepth/max(cityRay.z,.0001);
        float citySide=abs(cityRay.x)<.0001?100000.0:((cityRay.x>0.0?cityHalfW:-cityHalfW)-cityOrigin.x)/cityRay.x;
        float cityVertical=abs(cityRay.y)<.0001?100000.0:((cityRay.y>0.0?cityHalfH:-cityHalfH)-cityOrigin.y)/cityRay.y;
        float cityHit=min(cityBack,min(citySide,cityVertical));
        vec3 cityPoint=cityOrigin+cityRay*cityHit;
        bool cityIsBack=cityBack<=min(citySide,cityVertical),cityIsSide=citySide<min(cityBack,cityVertical);
        bool cityIsFloor=!cityIsBack&&!cityIsSide&&cityRay.y<0.0;
        vec3 cityWarm=vec3(.42,.30,.18),cityCool=vec3(.24,.34,.38);
        vec3 cityWall=mix(cityWarm,cityCool,step(.68,vCityRoomSeed));
        cityInteriorColor=cityWall*(cityIsBack?.74:cityIsSide?.60:.9);
        // Join shadows, a low skirting board and perspective floor tiles make
        // the virtual room read as a volume rather than a glowing flat pane.
        float cityCorner=min(cityHalfW-abs(cityPoint.x),cityHalfH-abs(cityPoint.y));
        cityInteriorColor*=.72+.28*smoothstep(0.0,.4,cityCorner);
        if(cityPoint.y<-cityHalfH+.12&&!cityIsFloor)cityInteriorColor*=.40;
        if(cityIsFloor){
          vec2 tile=abs(fract(cityPoint.xz*vec2(1.2,.8))-.5);
          float grout=max(smoothstep(.475,.5,tile.x),smoothstep(.475,.5,tile.y));
          cityInteriorColor=mix(vec3(.18,.155,.12),vec3(.065,.072,.073),grout);
        }
        if(!cityIsBack&&!cityIsSide&&!cityIsFloor){
          float lightPanel=(1.0-smoothstep(.38,.46,abs(cityPoint.x)))*(1.0-smoothstep(.53,.62,abs(cityPoint.z-cityDepth*.55)));
          cityInteriorColor=mix(cityInteriorColor,vec3(1.15,.96,.65),lightPanel);
        }
        if(cityIsBack){
          vec2 picture=abs(vec2(cityPoint.x-cityHalfW*.34,cityPoint.y-.32));
          float frame=(1.0-step(.39,picture.x))*(1.0-step(.34,picture.y));
          vec3 artwork=mix(vec3(.055,.09,.1),mix(vec3(.38,.19,.09),vec3(.13,.28,.29),step(cityPoint.x+cityPoint.y*.6,.25)),step(max(picture.x/.39,picture.y/.34),.87));
          cityInteriorColor=mix(cityInteriorColor,artwork,frame);
        }
        // Recessed objects use actual ray/box intersections. At skyline distance
        // only the room shell runs; tiny furniture would not cover a pixel.
        if(length(vCityRoomEye)<180.0){
          bool shop=cityHeight>1.8;
          float cabinetZ=shop?cityDepth*.62:cityDepth*.72;
          vec3 lower=vec3(-cityHalfW*.62,-cityHalfH,cabinetZ-.26),upper=vec3(cityHalfW*.35,-cityHalfH+(shop?.95:.75),cabinetZ+.30);
          float objectHit=cityRoomBox(cityOrigin,cityRay,lower,upper);
          if(objectHit<cityHit){
            vec3 q=cityOrigin+cityRay*objectHit;
            cityInteriorColor=q.y>upper.y-.025?vec3(.33,.245,.15):vec3(.075,.105,.10);
            cityHit=objectHit;
          }
          for(int shelf=0;shelf<2;shelf++){
            float shelfY=-cityHalfH+.91+float(shelf)*.72;
            lower=vec3(-cityHalfW*.72,shelfY,cityDepth-.39);upper=vec3(cityHalfW*.7,shelfY+.10,cityDepth-.05);
            objectHit=cityRoomBox(cityOrigin,cityRay,lower,upper);
            if(objectHit<cityHit){cityInteriorColor=vec3(.20,.135,.075);cityHit=objectHit;}
          }
          lower=vec3(-.39,-cityHalfH+.75,cabinetZ-.12);upper=vec3(.07,-cityHalfH+1.08,cabinetZ-.07);
          objectHit=cityRoomBox(cityOrigin,cityRay,lower,upper);
          if(objectHit<cityHit){cityInteriorColor=shop?vec3(.24,.20,.125):vec3(.13,.28,.31);cityHit=objectHit;}
        }
        float cityLit=step(cityHeight>1.8?.08:.29,vCityRoomSeed);
        cityInteriorLight=mix(.025,.65+vCityRoomSeed*.65,cityLit);
        float cityFresnel=pow(1.0-clamp(cityRay.z/max(length(cityRay),.001),0.0,1.0),4.0);
        cityInteriorColor=mix(cityInteriorColor,vec3(.035,.065,.08),cityFresnel*.55);
        diffuseColor.rgb=cityInteriorColor*.48;
      }else diffuseColor.rgb=vec3(.025,.04,.045);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance=cityInteriorColor*cityInteriorLight;');
  };
  return material;
}
