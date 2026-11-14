// The look of the Scablands' ground, drawn in code over plain colours (SCABLANDS-LAND). Nothing here is a picture file: it is the
// shared noise picture of scrap-look.js and arithmetic in the ground's shader.
//
// Round 4, slice 2a: each region has its own ground, read from the same data the driving reads (src/world/scablands-regions.js):
//   the flats      ochre cracked earth, pale and dark drifts, wind ripples, gravel;
//   scab plates    black broken rock: big slabs, each its own shade, with black crevices and small fractures;
//   the salt pan   white salt with a pale crust that stands in ridges round each cell;
//   the river bed  grey packed sand with ripples, dark soft patches, banks of layered rock;
//   wreck fields   rust-stained dirt with flecks of metal;
//   sand           pale dunes with fine ripples on them;
//   the burn       ground that has burnt: black soot near the Everburn, grey ash drifted over it, pale ash in the cracks.
// The edges between regions are uneven (the same wave the driving uses). Cracks are cut from a cell pattern worked out from the
// point itself, so that nothing repeats at any distance: the old crack pattern was read from a picture 413 m across and showed as a
// grid a few hundred metres ahead. Roads (createRoadLook) are graded dirt with ruts and a berm.
import * as THREE from 'three';
import {scrapNoise} from './scrap-look.js';

// The ground's own noise-free hash and cell pattern. `gVoronoi` returns the distance to the nearest cell centre, the gap between the
// nearest and second nearest (small along a cell's edge), and a number for the cell.
const CELLS = `
  vec2 gHash2(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
  vec3 gVoronoi(vec2 p){
    vec2 ip=floor(p),fp=fract(p);float f1=8.0,f2=8.0,id=0.0;
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
      vec2 g=vec2(float(i),float(j));vec2 h=gHash2(ip+g);vec2 d=g+h-fp;float dd=dot(d,d);
      if(dd<f1){f2=f1;f1=dd;id=h.x+h.y*1.7;}else if(dd<f2){f2=dd;}
    }
    f1=sqrt(f1);f2=sqrt(f2);return vec3(f1,f2-f1,fract(id));
  }
  float gWarp(vec2 q,float ph){return 58.0*sin(q.x*.0031+q.y*.0023+ph)+31.0*sin(q.x*.0083-q.y*.0057+1.9+ph*2.0)+17.0*sin(q.x*.0191+q.y*.0231+4.1-ph);}`;

const polygonFunction = (name, uniform, count) => `
  float ${name}(vec2 p){
    bool inside=false;float edge=1e9;
    for(int i=0,j=${count - 1};i<${count};j=i++){
      vec2 a=${uniform}[j],b=${uniform}[i];
      if(((b.y>p.y)!=(a.y>p.y))&&(p.x<(a.x-b.x)*(p.y-b.y)/(a.y-b.y)+b.x))inside=!inside;
      vec2 e=b-a;float t=clamp(dot(p-a,e)/max(dot(e,e),1e-4),0.0,1.0);edge=min(edge,length(p-a-e*t));
    }
    return inside?edge:-edge;
  }`;

// `regions` is {areas, field, box, burn}: the regions' areas (GROUND_AREAS), the river's distance picture and its box, and the
// burn's centre (the Everburn). Without it the ground is the flats everywhere.
export function createGroundLook({rock = 0x57493c, stone = 0x302b26, regions = null} = {}) {
  const colour = hex => new THREE.Color(hex);
  const uniforms = {uGroundNoise: {value: scrapNoise()}, uGroundRock: {value: colour(rock)}, uGroundStone: {value: colour(stone)},
    uColPlate: {value: colour(0x2a2825)}, uColSalt: {value: colour(0xdedacd)}, uColBed: {value: colour(0x6a665d)}, uColWreck: {value: colour(0x74503a)},
    uColSand: {value: colour(0xc9b07a)}, uColBurn: {value: colour(0x1b1917)}, uColBank: {value: colour(0x8a7a63)}};
  let areaCode = '', areaFunctions = '';
  if (regions) {
    const {areas, field, box, burn} = regions, disc = id => areas.discs.find(area => area.id === id);
    const polygon = id => areas.polygons.find(area => area.id === id);
    const vec = (area) => new THREE.Vector4(area.x, area.z, area.radius, area.phase);
    uniforms.uRiverField = {value: field}; uniforms.uRiverBox = {value: new THREE.Vector4(box.x0, box.z0, 1 / box.width, 1 / box.depth)};
    uniforms.uWreck = {value: vec(disc('wreck-fields'))}; uniforms.uSand = {value: vec(disc('sand'))}; uniforms.uBurn = {value: vec(disc('burn'))};
    uniforms.uBurnWobble = {value: disc('burn').wobble}; uniforms.uBurnCentre = {value: new THREE.Vector2(burn.x, burn.z)};
    const pan = polygon('salt-pan'), plates = polygon('scab-plates');
    uniforms.uPan = {value: pan.points.map(point => new THREE.Vector2(point.x, point.z))}; uniforms.uPanPhase = {value: pan.phase};
    uniforms.uPlates = {value: plates.points.map(point => new THREE.Vector2(point.x, point.z))}; uniforms.uPlatesPhase = {value: plates.phase};
    areaFunctions = polygonFunction('gPolyPan', 'uPan', pan.points.length) + polygonFunction('gPolyPlates', 'uPlates', plates.points.length);
    areaCode = `
      uniform sampler2D uRiverField;uniform vec4 uRiverBox;uniform vec4 uWreck;uniform vec4 uSand;uniform vec4 uBurn;uniform float uBurnWobble;uniform vec2 uBurnCentre;
      uniform vec2 uPan[${pan.points.length}];uniform float uPanPhase;uniform vec2 uPlates[${plates.points.length}];uniform float uPlatesPhase;`;
  }
  const regionsOn = regions !== null;
  // How far the dry river's middle is from here (metres, 128 where it is further than that), read from its picture.
  const riverDistance = regionsOn ? `
    vec2 gRuv=(gq-uRiverBox.xy)*uRiverBox.zw;
    float gRiver=(gRuv.x>=0.0&&gRuv.x<=1.0&&gRuv.y>=0.0&&gRuv.y<=1.0)?texture2D(uRiverField,gRuv).r*128.0:128.0;
    // The gorge is drawn by its own ribbon (src/world/scablands-draw.js): the ground is not drawn where the river is.
    #ifdef GROUND_RIVER_HOLE
    if(gRiver<80.0)discard;
    #endif` : 'float gRiver=128.0;';

  function apply(material, {riverHole = true} = {}) {
    if (!material?.isMeshStandardMaterial || material.userData.groundLook) return material;
    material.userData.groundLook = true;
    material.defines = {...material.defines, ...(riverHole && regionsOn ? {GROUND_RIVER_HOLE: ''} : {})};
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGroundPos;\nvarying vec3 vGroundNormal;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vGroundPos=(modelMatrix*vec4(transformed,1.0)).xyz;
          vGroundNormal=mat3(modelMatrix)*objectNormal;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uGroundNoise;uniform vec3 uGroundRock;uniform vec3 uGroundStone;
          uniform vec3 uColPlate;uniform vec3 uColSalt;uniform vec3 uColBed;uniform vec3 uColWreck;uniform vec3 uColSand;uniform vec3 uColBurn;uniform vec3 uColBank;
          ${areaCode}
          varying vec3 vGroundPos;varying vec3 vGroundNormal;
          vec3 gGlow;
          ${CELLS}
          ${areaFunctions}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 gq=vGroundPos.xz;
          ${riverDistance}
          float gSlope=1.0-normalize(vGroundNormal).y;
          // The noise picture is read at sizes that never line up with each other, and nothing that must not repeat is read from it
          // alone: the crack patterns come from gVoronoi.
          vec3 gBig=texture2D(uGroundNoise,gq*.0037).rgb;
          vec3 gMid=texture2D(uGroundNoise,gq*.029+3.7).rgb;
          vec3 gFine=.5*(texture2D(uGroundNoise,gq*.31).rgb+texture2D(uGroundNoise,mat2(.86,.5,-.5,.86)*gq*.227+19.0).rgb);
          vec3 gGrit=texture2D(uGroundNoise,gq*2.1).rgb;
          float gFlat=1.0-smoothstep(.04,.22,gSlope);
          // Metres a pixel covers: a pattern whose cells are only a few pixels across is replaced by its average.
          float gPix=max(fwidth(gq.x),fwidth(gq.y))+1e-5;
          gGlow=vec3(0.0);
          // Which region this is: each margin is the metres inside it, moved by the same wave the driving uses (src/world/scablands-regions.js).
          ${regionsOn ? `
          float mBed=60.0+gWarp(gq,.5)*.25-gRiver;
          float mWreck=uWreck.z+gWarp(gq,uWreck.w)-length(gq-uWreck.xy);
          float mSand=uSand.z+gWarp(gq,uSand.w)-length(gq-uSand.xy);
          float mBurn=uBurn.z+gWarp(gq,uBurn.w)*uBurnWobble-length(gq-uBurn.xy);
          float mPan=gPolyPan(gq)+gWarp(gq,uPanPhase);
          float mPlates=gPolyPlates(gq)+gWarp(gq,uPlatesPhase);
          float rem=1.0;
          float wBed=smoothstep(-5.0,5.0,mBed);rem*=1.0-wBed;
          float wWreck=rem*smoothstep(-9.0,9.0,mWreck);rem*=1.0-smoothstep(-9.0,9.0,mWreck);
          float wSand=rem*smoothstep(-9.0,9.0,mSand);rem*=1.0-smoothstep(-9.0,9.0,mSand);
          float wBurn=rem*smoothstep(-9.0,9.0,mBurn);rem*=1.0-smoothstep(-9.0,9.0,mBurn);
          float wPan=rem*smoothstep(-9.0,9.0,mPan);rem*=1.0-smoothstep(-9.0,9.0,mPan);
          float wPlates=rem*smoothstep(-9.0,9.0,mPlates);rem*=1.0-smoothstep(-9.0,9.0,mPlates);
          float wFlats=rem;` : 'float wBed=0.0,wWreck=0.0,wSand=0.0,wBurn=0.0,wPan=0.0,wPlates=0.0,wFlats=1.0;'}
          vec3 gc=vec3(0.0);
          // ---- The flats: pale and dark drifts, wind ripples, cracked earth.
          if(wFlats>.004){
            vec3 fc=diffuseColor.rgb;
            fc*=.70+.62*gBig.r;
            fc=mix(fc,fc*vec3(1.16,.97,.78),smoothstep(.42,.72,gMid.g)*.55);
            float gRipple=sin((vGroundPos.x*.93+vGroundPos.z*.37)*2.6+gMid.b*11.0)*.5+.5;
            float gRippleFine=fwidth((vGroundPos.x*.93+vGroundPos.z*.37)*2.6);
            fc*=1.0-.08*gRipple*smoothstep(.5,.78,gBig.r)*gFlat*(1.0-smoothstep(.5,1.4,gRippleFine));
            // Cracked earth where the dust is dark and flat: the cracks are the edges of cells 7 m across.
            vec3 gv=gVoronoi(gq/7.0);
            float gSee=smoothstep(2.0,9.0,7.0/gPix);
            float gCrack=mix(.16,1.0-smoothstep(.0,.075,gv.y),gSee)+.5*mix(.0,smoothstep(.03,.0,abs(gFine.r-.47)),gSee);
            fc*=1.0-.5*min(gCrack,1.0)*gFlat*smoothstep(.55,.32,gBig.r);
            fc*=.93+.14*gv.z*gSee+.07*(1.0-gSee);
            gc+=fc*wFlats;
          }
          ${regionsOn ? `
          // ---- Scab plates: black broken rock. Slabs 11 m across, each its own shade, with black crevices and small fractures.
          if(wPlates>.004){
            vec3 pv=gVoronoi(gq/11.0);vec3 pw=gVoronoi(gq/2.9+7.1);
            float seeP=smoothstep(2.0,9.0,11.0/gPix),seeQ=smoothstep(2.0,9.0,2.9/gPix);
            vec3 pc=uColPlate*(.62+.9*mix(.5,pv.z,seeP))*(.78+.44*gFine.g);
            pc*=1.0-.38*mix(.12,1.0-smoothstep(.0,.07,pw.y),seeQ);
            pc=mix(pc*.2,pc,mix(.82,smoothstep(.0,.085,pv.y),seeP));
            pc+=vec3(.05,.04,.03)*smoothstep(.72,1.0,gGrit.g)*gFlat;
            pc=mix(pc,pc*vec3(1.5,1.25,1.0),smoothstep(.55,.85,gMid.r)*.35);
            gc+=pc*wPlates;
          }
          // ---- The salt pan: white crust standing in ridges round each cell, buff stains where the dust has settled.
          if(wPan>.004){
            vec3 sv=gVoronoi(gq/2.3);float seeS=smoothstep(2.0,9.0,2.3/gPix);
            vec3 sc=uColSalt*(.88+.12*gFine.g);
            sc*=1.0+.14*mix(.15,1.0-smoothstep(.0,.16,sv.y),seeS);
            sc*=.96+.06*mix(.5,sv.z,seeS);
            sc=mix(sc,sc*vec3(.93,.9,.8),smoothstep(.5,.8,gBig.g)*.6);
            sc*=.9+.16*gMid.r;
            gc+=sc*wPan;
          }
          // ---- Wreck fields: rust-stained dirt with flecks of metal.
          if(wWreck>.004){
            vec3 wc=uColWreck*(.7+.6*gBig.r)*(.85+.3*gFine.g);
            wc=mix(wc,wc*vec3(1.55,.95,.55),smoothstep(.5,.78,gMid.g)*.7);
            wc=mix(wc,vec3(.52,.47,.42)*(.6+.8*gGrit.r),smoothstep(.93,.97,gGrit.g)*.8);
            gc+=wc*wWreck;
          }
          // ---- Sand: pale dunes, with fine ripples on them.
          if(wSand>.004){
            float dune=sin(dot(gq,vec2(.021,.012))+gBig.b*7.0)*.5+.5;
            float ripple=sin(dot(gq,vec2(.55,.8))*1.8+gMid.g*9.0)*.5+.5;
            vec3 dc=uColSand*(.8+.34*dune)*(.94+.06*ripple*(1.0-smoothstep(.5,1.4,gPix)))*(.92+.16*gFine.g);
            dc=mix(dc,dc*vec3(.82,.76,.7),smoothstep(.6,.85,gMid.r)*.4);
            gc+=dc*wSand;
          }
          // ---- The burn: ground that has burnt. Black soot near the Everburn, grey ash drifted over it further out, pale ash lying
          // in the cracks. Nothing glows (glowing cracks read as lava); the vents and their fire come with the Everburn's job.
          if(wBurn>.004){
            vec3 bv=gVoronoi(gq/5.5);float seeB=smoothstep(2.0,9.0,5.5/gPix);
            float near=1.0-smoothstep(300.0,1500.0,length(gq-uBurnCentre));
            vec3 bc=uColBurn*(.6+.9*gBig.r)*(.8+.4*gFine.g);
            float drift=smoothstep(.42,.74,gMid.g)*(1.0-.6*near);
            bc=mix(bc,vec3(.2,.19,.18)*(.75+.5*gFine.r),drift*.6);
            float crack=mix(.06,1.0-smoothstep(.0,.045,bv.y),seeB);
            bc=mix(bc,vec3(.29,.28,.26)*(.7+.4*gFine.g),crack*.32*(1.0-drift*.5));
            bc*=1.0-.35*smoothstep(.6,.85,gBig.g)*near;
            gc+=bc*wBurn;
          }
          // ---- The river bed and its banks: grey packed sand with ripples and dark soft patches; banks of layered rock.
          if(wBed>.004){
            float rip=sin(dot(gq,vec2(.6,.8))*1.5+gMid.b*8.0)*.5+.5;
            vec3 rc=uColBed*(.78+.4*gBig.r)*(.9+.2*gFine.g)*(1.0-.08*rip*(1.0-smoothstep(.5,1.4,gPix)));
            float softPatch=smoothstep(.36,.5,sin(gq.x*.0153+gq.y*.0101)*sin(gq.x*.0121-gq.y*.0187+1.3)*.5+.5);
            rc=mix(rc,rc*vec3(.62,.58,.52),softPatch*.75);
            gc+=rc*wBed;
          }` : ''}
          // Banks: layered pale rock between the bed's foot and the plain.
          ${regionsOn ? `
          float gBank=smoothstep(46.0,54.0,gRiver)*(1.0-smoothstep(76.0,92.0,gRiver));
          if(gBank>.004){
            float layer=vGroundPos.y*.55+gBig.b*3.0+gMid.r*2.2;
            vec3 kc=uColBank*(.78+.34*gFine.g)*(.93+.12*smoothstep(.3,.7,abs(fract(layer)-.5)*2.0));
            gc=mix(gc,kc,gBank*.85);
          }` : ''}
          // Rock with strata wherever the ground is steep.
          vec3 gRock=uGroundRock*(.62+.7*gFine.g);
          float gLayer=vGroundPos.y*.21+gBig.b*2.6+gMid.r*1.9+gFine.g*.7;
          gRock*=.95+.07*smoothstep(.3,.7,abs(fract(gLayer)-.5)*2.0)*(.5+gFine.r)*smoothstep(.35,.6,gBig.g);
          // From a slope of about .25 (a scarp's face, a river bank; the near ground's cells are 23 m, so a face seen through its mesh reads gentler than it is) the face is bare rock broken into blocks with dark joints, and pale scree lies
          // where the face eases. The blocks are cut from a cell pattern worked out from the point and its height, so they do not repeat.
          vec3 gj=gVoronoi(vec2((gq.x*.74+gq.y*.67)/5.5,vGroundPos.y/2.6));
          float gSeeJ=smoothstep(2.0,9.0,5.5/gPix);
          gRock*=.8+.4*mix(.5,gj.z,gSeeJ);
          gRock*=1.0-.5*mix(.1,1.0-smoothstep(.0,.09,gj.y),gSeeJ)*smoothstep(.03,.08,gSlope);
          float gScree=smoothstep(.02,.05,gSlope)*(1.0-smoothstep(.07,.14,gSlope));
          gRock=mix(gRock,vec3(.46,.4,.33)*(.7+.6*gGrit.r),gScree*.5);
          gc=mix(gc,gRock,smoothstep(.025,.075,gSlope));
          // Gravel and stones, thicker near rock.
          float gStones=smoothstep(.74,.82,gGrit.g)*(.25+.75*max(gMid.r,smoothstep(.08,.3,gSlope)));
          gc=mix(gc,uGroundStone*(.7+.9*gGrit.r),gStones*.75*(1.0-wPan*.8-wSand*.7));
          gc*=.88+.24*gGrit.b;
          diffuseColor.rgb=gc;`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n          totalEmissiveRadiance+=gGlow;');
    };
    material.customProgramCacheKey = () => `ground-look-5-${regionsOn ? 'regions' : 'plain'}-${riverHole && regionsOn ? 'hole' : 'whole'}`;
    material.needsUpdate = true;
    return material;
  }
  return {apply, uniforms};
}

// A graded dirt road: a flat ribbon whose vertices carry (across, along): `across` is metres from the middle over the road's half
// width, so -1.2 to 1.2. The surface has fine streaks left by the grader's blade, a crown between two dark worn ruts, a berm of loose
// gravel along each edge, and an uneven edge that wears away into the ground. Drawn with a soft edge, so the material is transparent.
export function createRoadLook({dirt = 0x6e5d47} = {}) {
  const uniforms = {uRoadNoise: {value: scrapNoise()}, uRoadDirt: {value: new THREE.Color(dirt)}};
  function apply(material) {
    if (!material?.isMeshStandardMaterial || material.userData.roadLook) return material;
    material.userData.roadLook = true;
    material.transparent = true; material.depthWrite = false;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aRoad;\nvarying vec2 vRoad;\nvarying vec3 vRoadPos;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vRoad=aRoad;vRoadPos=(modelMatrix*vec4(transformed,1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uRoadNoise;uniform vec3 uRoadDirt;varying vec2 vRoad;varying vec3 vRoadPos;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float ru=vRoad.x,rau=abs(ru);
          vec3 rWide=texture2D(uRoadNoise,vRoadPos.xz*.011).rgb;
          vec3 rFine=texture2D(uRoadNoise,vRoadPos.xz*.37).rgb;
          // Blade marks run along the road: noise stretched in the direction of travel.
          float rBlade=texture2D(uRoadNoise,vec2(vRoad.y*.006,ru*1.7)).g;
          vec3 rc=uRoadDirt*(.82+.36*rWide.r)*(.9+.2*rBlade);
          // The crown between the ruts is a little paler; the ruts are worn dark and smooth.
          rc*=1.0+.1*(1.0-smoothstep(.0,.34,rau));
          float rut=exp(-pow((rau-.4)/.085,2.0));
          rc*=1.0-.42*rut*(.7+.5*rFine.g);
          // The berm: loose pale gravel thrown up along the edge, with stones in it.
          float berm=exp(-pow((rau-1.0)/.1,2.0));
          rc=mix(rc,rc*vec3(1.28,1.2,1.1)*(.75+.5*rFine.b),berm*.8);
          rc*=1.0-.25*smoothstep(.55,.8,rFine.g)*smoothstep(.6,1.1,rau);
          diffuseColor.rgb=rc;
          // The edge is uneven and wears away into the ground.
          float rEdge=1.04+.1*rWide.g+.06*rFine.r;
          diffuseColor.a*=1.0-smoothstep(rEdge,rEdge+.13,rau);`);
    };
    material.customProgramCacheKey = () => 'road-look-1';
    material.needsUpdate = true;
    return material;
  }
  return {apply, uniforms};
}
