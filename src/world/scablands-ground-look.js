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
// The base colour of each ground (the shader multiplies each by its own pattern). The map of the land (src/world/scablands-picture.js)
// draws each region in a muted version of the same colour, so that the map and the ground are drawn from one table. The flats' colour
// is the one the scene gives the ground's material (src/world/scablands-scene.js).
export const GROUND_COLOURS = Object.freeze({flats: 0x76624b, 'scab-plates': 0x2a2825, 'salt-pan': 0xdedacd, 'river-bed': 0x6a665d,
  'wreck-fields': 0x74503a, sand: 0xc9b07a, burn: 0x1b1917, bank: 0x8a7a63, road: 0x6e5d47, rock: 0x57493c});

// The realism trial, step 2 (SCABLANDS-LAND, "Kyle on realism"; switch `scablands-realism`): photographed surfaces. Each is a
// colour picture and a relief picture, 1,024 pixels square, from Poly Haven (CC0; public/assets/textures/CREDITS.md). The code above
// still decides what ground is where and its broad colour; a photograph gives that ground its grain and its relief. `size` is the
// metres one copy of the picture covers (the size of the ground that was photographed, but for the salt, whose cracks are drawn
// three times life size to stand for a salt pan's larger plates); `mean` is the picture's average colour (linear), so that the grain can be laid over the
// code's colour without shifting it.
export const GROUND_PHOTOS = Object.freeze({
  flats: Object.freeze({file: 'scablands-hardpan', size: 4, mean: Object.freeze([.3017, .1744, .0776])}),
  plates: Object.freeze({file: 'scablands-scab-rock', size: 2.4, mean: Object.freeze([.0431, .0342, .0254])}),
  pan: Object.freeze({file: 'scablands-salt-crust', size: 5, mean: Object.freeze([.6274, .3978, .2215])}),
  sand: Object.freeze({file: 'scablands-sand-ripples', size: 2.2, mean: Object.freeze([.15, .1173, .0777])}),
  bed: Object.freeze({file: 'scablands-river-pebbles', size: 2.2, mean: Object.freeze([.2254, .1891, .1498])}),
  road: Object.freeze({file: 'scablands-gravel-road', size: 2, mean: Object.freeze([.1922, .0984, .0506])}),
});
export function loadGroundPhotos(loader = new THREE.TextureLoader()) {
  const textures = [], out = {};
  const load = (path, colour) => {
    const texture = loader.load(path); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 8;
    if (colour) texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture); return texture;
  };
  for (const [key, photo] of Object.entries(GROUND_PHOTOS)) out[key] = {map: load(`/assets/textures/${photo.file}-colour.jpg`, true),
    normal: load(`/assets/textures/${photo.file}-relief.jpg`, false), mean: new THREE.Color().setRGB(...photo.mean), size: photo.size};
  out.dispose = () => { for (const texture of textures) texture.dispose(); };
  return out;
}
const PHOTO_UNIFORMS = [['flats', 'Flats'], ['plates', 'Plate'], ['pan', 'Salt'], ['sand', 'Sand'], ['bed', 'Bed']];
// A photograph is read at two sizes that never line up, the larger one turned, so that its repeat does not show: the small one
// near the camera, the large one where a pixel covers more than a few centimetres of ground (`far`), and only the one that shows
// is read. The slopes of the picture are passed in (`dx`, `dy`) because the pictures are read inside a region's own branch.
const PHOTO_FUNCTIONS = `
  const mat2 gTurn=mat2(.8,.6,-.6,.8);
  vec3 gPhotoCol(sampler2D map,vec2 q,float size,vec2 dx,vec2 dy,float far){
    vec3 a=vec3(0.0),b=vec3(0.0);float wide=size*4.3;
    if(far<.999)a=textureGrad(map,q/size,dx/size,dy/size).rgb;
    if(far>.001)b=textureGrad(map,gTurn*q/wide+.37,gTurn*dx/wide,gTurn*dy/wide).rgb;
    return mix(a,b,far);
  }
  vec2 gPhotoRel(sampler2D map,vec2 q,float size,vec2 dx,vec2 dy,float far){
    vec2 a=vec2(0.0),b=vec2(0.0);float wide=size*4.3;
    if(far<.999)a=textureGrad(map,q/size,dx/size,dy/size).xy*2.0-1.0;
    if(far>.001)b=(textureGrad(map,gTurn*q/wide+.37,gTurn*dx/wide,gTurn*dy/wide).xy*2.0-1.0)*gTurn;
    return mix(a,b,far);
  }`;

export function createGroundLook({rock = GROUND_COLOURS.rock, stone = 0x302b26, regions = null, photos = null, tunnels = null} = {}) {
  const colour = hex => new THREE.Color(hex);
  const uniforms = {uGroundNoise: {value: scrapNoise()}, uGroundRock: {value: colour(rock)}, uGroundStone: {value: colour(stone)},
    uColPlate: {value: colour(GROUND_COLOURS['scab-plates'])}, uColSalt: {value: colour(GROUND_COLOURS['salt-pan'])}, uColBed: {value: colour(GROUND_COLOURS['river-bed'])},
    uColWreck: {value: colour(GROUND_COLOURS['wreck-fields'])}, uColSand: {value: colour(GROUND_COLOURS.sand)}, uColBurn: {value: colour(GROUND_COLOURS.burn)},
    uColBank: {value: colour(GROUND_COLOURS.bank)}};
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
  // A tunnel-capable material reserves eight mouth cuts once. Updating the
  // values does not change the shader or require a program rebuild.
  const tunnelCapable = (tunnels?.segments.length ?? 0) > 0;
  function setTunnelMouths(mouths) {
    if (mouths.length > 8) throw new RangeError('The ground can draw at most eight tunnel mouths.');
    if (!tunnelCapable && mouths.length) throw new Error('This ground material has no tunnel cuts.');
    if (!tunnelCapable) return;
    uniforms.uTunnelCount.value = mouths.length;
    mouths.forEach((mouth, i) => {
      uniforms.uTunnelStart.value[i].set(mouth.start.x, mouth.start.y, mouth.start.z);
      uniforms.uTunnelEnd.value[i].set(mouth.end.x, mouth.end.y, mouth.end.z);
      uniforms.uTunnelRadius.value[i] = mouth.radius;
    });
  }
  if (tunnelCapable) {
    uniforms.uTunnelCount = {value: 0};
    uniforms.uTunnelStart = {value: Array.from({length: 8}, () => new THREE.Vector3())};
    uniforms.uTunnelEnd = {value: Array.from({length: 8}, () => new THREE.Vector3())};
    uniforms.uTunnelRadius = {value: new Float32Array(8)};
    setTunnelMouths(tunnels.mouths);
  }
  const tunnelDeclarations = tunnelCapable ?
    'uniform int uTunnelCount;uniform vec3 uTunnelStart[8];uniform vec3 uTunnelEnd[8];uniform float uTunnelRadius[8];' : '';
  const tunnelClips = tunnelCapable ? `
    for(int i=0;i<8;i++){
      if(i>=uTunnelCount)break;
      vec3 a=uTunnelStart[i],d=uTunnelEnd[i]-a,p=vGroundPos-a;
      float t=clamp(dot(p,d)/max(dot(d,d),1e-8),0.0,1.0);
      vec3 q=p-d*t;if(dot(q,q)<uTunnelRadius[i]*uTunnelRadius[i])discard;
    }` : '';
  const regionsOn = regions !== null;
  const photosOn = regionsOn && photos !== null;
  if (photosOn) for (const [key, name] of PHOTO_UNIFORMS) {
    uniforms[`uPh${name}`] = {value: photos[key].map}; uniforms[`uPhN${name}`] = {value: photos[key].normal}; uniforms[`uPhMean${name}`] = {value: photos[key].mean};
  }
  const photoCode = photosOn ? PHOTO_UNIFORMS.map(([, name]) => `uniform sampler2D uPh${name};uniform sampler2D uPhN${name};uniform vec3 uPhMean${name};`).join('') + PHOTO_FUNCTIONS : '';
  // One ground's photograph: its grain multiplies the colour drawn in code (`colour`), and its relief, by the ground's share of this
  // pixel (`weight`), is added to the ground's own. A ground that lies over the others (`over`: a bank, steep rock) takes their
  // place in the relief by its share, as it does in the colour.
  const photo = (key, colour, weight, relief = 1, over = false) => {
    if (!photosOn) return '';
    const name = PHOTO_UNIFORMS.find(row => row[0] === key)[1], size = photos[key].size.toFixed(1);
    const tilt = `${relief.toFixed(2)}*gPhotoRel(uPhN${name},gq,${size},gDx,gDy,gFar)`;
    return `${colour}*=clamp(mix(vec3(1.0),gPhotoCol(uPh${name},gq,${size},gDx,gDy,gFar)/uPhMean${name},.92),.2,2.4);` +
      (over ? `gRelief=mix(gRelief,${tilt},${weight});` : `gRelief+=${weight}*${tilt};`);
  };
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
          ${areaCode}${tunnelDeclarations ? `\n          ${tunnelDeclarations}` : ''}
          varying vec3 vGroundPos;varying vec3 vGroundNormal;
          vec3 gGlow;${photosOn ? 'vec2 gRelief;' : ''}
          ${CELLS}
          ${areaFunctions}${photoCode}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          ${tunnelClips ? `${tunnelClips}\n          ` : ''}vec2 gq=vGroundPos.xz;
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
          gGlow=vec3(0.0);${photosOn ? 'gRelief=vec2(0.0);vec2 gDx=dFdx(gq),gDy=dFdy(gq);float gFar=smoothstep(.012,.09,gPix);' : ''}
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
            ${photo('flats', 'fc', 'wFlats')}gc+=fc*wFlats;
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
            ${photo('plates', 'pc', 'wPlates', 1.2)}gc+=pc*wPlates;
          }
          // ---- The salt pan: white crust standing in ridges round each cell, buff stains where the dust has settled.
          if(wPan>.004){
            vec3 sv=gVoronoi(gq/2.3);float seeS=smoothstep(2.0,9.0,2.3/gPix);
            vec3 sc=uColSalt*(.88+.12*gFine.g);
            sc*=1.0+.14*mix(.15,1.0-smoothstep(.0,.16,sv.y),seeS);
            sc*=.96+.06*mix(.5,sv.z,seeS);
            sc=mix(sc,sc*vec3(.93,.9,.8),smoothstep(.5,.8,gBig.g)*.6);
            sc*=.9+.16*gMid.r;
            ${photo('pan', 'sc', 'wPan', .8)}gc+=sc*wPan;
          }
          // ---- Wreck fields: rust-stained dirt with flecks of metal.
          if(wWreck>.004){
            vec3 wc=uColWreck*(.7+.6*gBig.r)*(.85+.3*gFine.g);
            wc=mix(wc,wc*vec3(1.55,.95,.55),smoothstep(.5,.78,gMid.g)*.7);
            wc=mix(wc,vec3(.52,.47,.42)*(.6+.8*gGrit.r),smoothstep(.93,.97,gGrit.g)*.8);
            ${photo('flats', 'wc', 'wWreck')}gc+=wc*wWreck;
          }
          // ---- Sand: pale dunes, with fine ripples on them.
          if(wSand>.004){
            float dune=sin(dot(gq,vec2(.021,.012))+gBig.b*7.0)*.5+.5;
            float ripple=sin(dot(gq,vec2(.55,.8))*1.8+gMid.g*9.0)*.5+.5;
            vec3 dc=uColSand*(.8+.34*dune)*(.94+.06*ripple*(1.0-smoothstep(.5,1.4,gPix)))*(.92+.16*gFine.g);
            dc=mix(dc,dc*vec3(.82,.76,.7),smoothstep(.6,.85,gMid.r)*.4);
            ${photo('sand', 'dc', 'wSand')}gc+=dc*wSand;
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
            ${photo('flats', 'bc', 'wBurn')}gc+=bc*wBurn;
          }
          // ---- The river bed and its banks: grey packed sand with ripples and dark soft patches; banks of layered rock.
          if(wBed>.004){
            float rip=sin(dot(gq,vec2(.6,.8))*1.5+gMid.b*8.0)*.5+.5;
            vec3 rc=uColBed*(.78+.4*gBig.r)*(.9+.2*gFine.g)*(1.0-.08*rip*(1.0-smoothstep(.5,1.4,gPix)));
            float softPatch=smoothstep(.36,.5,sin(gq.x*.0153+gq.y*.0101)*sin(gq.x*.0121-gq.y*.0187+1.3)*.5+.5);
            rc=mix(rc,rc*vec3(.62,.58,.52),softPatch*.75);
            ${photo('bed', 'rc', 'wBed')}gc+=rc*wBed;
          }` : ''}
          // Banks: layered pale rock between the bed's foot and the plain.
          ${regionsOn ? `
          float gBank=smoothstep(46.0,54.0,gRiver)*(1.0-smoothstep(76.0,92.0,gRiver));
          if(gBank>.004){
            float layer=vGroundPos.y*.55+gBig.b*3.0+gMid.r*2.2;
            vec3 kc=uColBank*(.78+.34*gFine.g)*(.93+.12*smoothstep(.3,.7,abs(fract(layer)-.5)*2.0));
            ${photo('plates', 'kc', 'gBank*.85', 1, true)}gc=mix(gc,kc,gBank*.85);
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
          ${photosOn ? `float gSteep=smoothstep(.025,.075,gSlope);if(gSteep>.004){${photo('plates', 'gRock', 'gSteep', 1, true)}}` : ''}gc=mix(gc,gRock,smoothstep(.025,.075,gSlope));
          // Gravel and stones, thicker near rock.
          float gStones=smoothstep(.74,.82,gGrit.g)*(.25+.75*max(gMid.r,smoothstep(.08,.3,gSlope)));
          gc=mix(gc,uGroundStone*(.7+.9*gGrit.r),gStones*.75*(1.0-wPan*.8-wSand*.7));
          gc*=.88+.24*gGrit.b;
          diffuseColor.rgb=gc;`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n          totalEmissiveRadiance+=gGlow;');
      // The photographs' relief tilts the ground's own direction (worked out in the world, then turned to the camera's view).
      if (photosOn) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          normal=normalize((viewMatrix*vec4(normalize(normalize(vGroundNormal)+vec3(gRelief.x,0.0,gRelief.y)),0.0)).xyz);`);
    };
    material.customProgramCacheKey = () => `ground-look-5-${regionsOn ? 'regions' : 'plain'}-${riverHole && regionsOn ? 'hole' : 'whole'}${photosOn ? '-photos' : ''}${tunnelCapable ? '-tunnel-mouths' : ''}`;
    material.needsUpdate = true;
    return material;
  }
  return {apply, uniforms, setTunnelMouths};
}


// The trial's lining is separate from simulation and may be disposed with the scene.
export function createTunnelMesh(tunnels) {
  const group = new THREE.Group();
  const segments = tunnels.segments;
  if (!segments.length) return group;
  const positions = [], uvs = [], indices = [];
  const sides = 32, floorAngle = Math.asin(0.55);
  let distance = 0;
  // The long arc goes from one edge of the floor over the crown to the other.
  // The final edge closes across the flat road.
  for (let i = 0; i <= segments.length; i++) {
    const segment = segments[Math.min(i, segments.length - 1)];
    const point = i === segments.length ? segment.end : segment.start;
    const previous = segments[Math.max(0, i - 1)];
    const next = segments[Math.min(i, segments.length - 1)];
    const unit = s => {
      const dx = s.end.x - s.start.x, dz = s.end.z - s.start.z, length = Math.hypot(dx, dz);
      return {x: dx / length, z: dz / length};
    };
    const before = unit(previous), after = unit(next);
    let tx = before.x + after.x, tz = before.z + after.z;
    const length = Math.hypot(tx, tz);
    tx /= length; tz /= length;
    if (i) distance += Math.hypot(previous.end.x - previous.start.x,
      previous.end.y - previous.start.y, previous.end.z - previous.start.z);
    for (let j = 0; j <= sides; j++) {
      const angle = -floorAngle + (Math.PI + 2 * floorAngle) * j / sides;
      const across = Math.cos(angle) * segment.radius;
      positions.push(point.x - tz * across, point.y + Math.sin(angle) * segment.radius, point.z + tx * across);
      uvs.push(distance, (angle + floorAngle) * segment.radius);
    }
    if (i) for (let j = 0; j <= sides; j++) {
      const k = (j + 1) % (sides + 1), a = (i - 1) * (sides + 1), b = i * (sides + 1);
      indices.push(a + j, b + j, a + k, a + k, b + j, b + k);
    }
  }
  // Close a cutting face with a fan using the same ring as the lining.
  for (const [closed, ring, point, reverse] of [
    [!tunnels.startOpen, 0, segments[0].start, true],
    [!tunnels.endOpen, segments.length, segments.at(-1).end, false],
  ]) {
    if (!closed) continue;
    const center = positions.length / 3;
    positions.push(point.x, point.y, point.z); uvs.push(distance, 0);
    const base = ring * (sides + 1);
    for (let j = 0; j <= sides; j++) {
      const next = (j + 1) % (sides + 1);
      indices.push(center, base + (reverse ? next : j), base + (reverse ? j : next));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({color: GROUND_COLOURS.rock, roughness: 1, side: THREE.DoubleSide});
  group.add(new THREE.Mesh(geometry, material));
  return group;
}

// A graded dirt road: a flat ribbon whose vertices carry (across, along): `across` is metres from the middle over the road's half
// width, so -1.2 to 1.2. The surface has fine streaks left by the grader's blade, a crown between two dark worn ruts, a berm of loose
// gravel along each edge, and an uneven edge that wears away into the ground. Drawn with a soft edge, so the material is transparent.
export function createRoadLook({dirt = 0x6e5d47, photo = null} = {}) {
  const uniforms = {uRoadNoise: {value: scrapNoise()}, uRoadDirt: {value: new THREE.Color(dirt)}};
  // The realism trial, step 2: the road's own photograph (graded gravel), laid as the ground's are.
  if (photo) Object.assign(uniforms, {uRoadPhoto: {value: photo.map}, uRoadPhotoN: {value: photo.normal}, uRoadPhotoMean: {value: photo.mean}});
  const size = photo ? photo.size.toFixed(1) : '1.0';
  function apply(material) {
    if (!material?.isMeshStandardMaterial || material.userData.roadLook) return material;
    material.userData.roadLook = true;
    material.transparent = true; material.depthWrite = false;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aRoad;\nvarying vec2 vRoad;\nvarying vec3 vRoadPos;' + (photo ? '\nvarying vec3 vRoadNormal;' : ''))
        .replace('#include <project_vertex>', `#include <project_vertex>
          vRoad=aRoad;vRoadPos=(modelMatrix*vec4(transformed,1.0)).xyz;${photo ? 'vRoadNormal=mat3(modelMatrix)*objectNormal;' : ''}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uRoadNoise;uniform vec3 uRoadDirt;varying vec2 vRoad;varying vec3 vRoadPos;${photo ? `
          uniform sampler2D uRoadPhoto;uniform sampler2D uRoadPhotoN;uniform vec3 uRoadPhotoMean;varying vec3 vRoadNormal;vec2 rRelief;${PHOTO_FUNCTIONS}` : ''}`)
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
          rc*=1.0-.25*smoothstep(.55,.8,rFine.g)*smoothstep(.6,1.1,rau);${photo ? `
          vec2 rq=vRoadPos.xz,rDx=dFdx(rq),rDy=dFdy(rq);float rFar=smoothstep(.012,.09,max(fwidth(rq.x),fwidth(rq.y)));
          rc*=clamp(mix(vec3(1.0),gPhotoCol(uRoadPhoto,rq,${size},rDx,rDy,rFar)/uRoadPhotoMean,.92),.2,2.4);
          rRelief=gPhotoRel(uRoadPhotoN,rq,${size},rDx,rDy,rFar);` : ''}
          diffuseColor.rgb=rc;
          // The edge is uneven and wears away into the ground.
          float rEdge=1.04+.1*rWide.g+.06*rFine.r;
          diffuseColor.a*=1.0-smoothstep(rEdge,rEdge+.13,rau);`);
      if (photo) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          normal=normalize((viewMatrix*vec4(normalize(normalize(vRoadNormal)+vec3(rRelief.x,0.0,rRelief.y)),0.0)).xyz);`);
    };
    material.customProgramCacheKey = () => photo ? 'road-look-1-photo' : 'road-look-1';
    material.needsUpdate = true;
    return material;
  }
  return {apply, uniforms};
}
