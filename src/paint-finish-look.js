// Drawn Wasteland paint finishes (SKIN-WASTE round 2). Rust, patches, stripes, bleach, soot and dust are drawn by
// code in the car's own paint material, so one finish stays one material and needs no picture files. Nothing here
// changes race state: it only changes how the body is drawn.
//
// Where the patterns live: in the car's own metres (+Y up, +Z forward, +X driver-left), read from the body mesh's
// positions and normals, never from its UVs. The procedural cars (the Titan, the Dusthawk Rally, the Jesko and the
// other built cars) merge their bodies with blank UVs, and the imported cars bake their bodies into the same car
// metres, so positions and normals mean the same thing on every car. Heights and lengths below are shares of the
// painted body's own box, so a pattern fits a tall Titan and a low supercar alike.
import * as THREE from 'three';
import {scrapNoise} from './world/scrap-look.js';

// THE LOOK TABLE. A round of tuning is a change to this table only.
// Colours are [colour, roughness, metalness, clear coat kept (0 to 1)]. Heights and lengths are shares of the body
// box (0 at the bottom or the back, 1 at the top or the front) unless they say metres. Amounts run from 0 to 1.
export const PAINT_FINISH_LOOK=Object.freeze({
  // Shared by every finish.
  shared:{
    blotchScale:.30,       // big noise picture repeats per metre: blotches about 25 to 80 cm across
    grainScale:1.6,        // fine noise picture repeats per metre: grain about 1 to 2 cm
    runScale:.9,           // running streaks repeat per metre along the car
    edgeStart:6,           // how sharply the surface turns (per metre, 1 / radius) where an edge starts to count
    edgeFull:28,           // and where it counts fully
    archBand:.45,          // wheel arch band as a share of the wheel radius
  },
  'rust-patina':{
    colors:{oxideDark:[0x3b1d10,.95,.18,0],oxideBright:[0xa8541f,.9,.12,0],oldPaint:[0x5d7064,.62,.08,1],rubbedSteel:[0x9c9d99,.36,.9,0]},
    rustAmount:.40,        // how much rust has eaten the old paint before edges, seams and height add more
    lowRust:.42,           // extra rust on the low panels and wheel arches
    lowHeight:.40,         // share of body height counted as low panels
    edgeRust:.55,          // extra rust on edges
    seamRust:.50,          // extra rust along the two door seams
    seamWidth:.035,        // metres either side of a seam
    seams:[.34,.63],       // the door seams, as shares of body length from the back
    breakUp:.95,           // how much the blotch noise breaks up the line between rust and paint
    runs:.40,              // rust runs down the sides
    steel:.70,             // rubbed bare steel on the sharpest edges
    pitDepth:.0022,        // metres between the paint surface and the rust pits
  },
  'salt-bleach':{
    colors:{underPaint:[0x8a4636,.78,.05,1],bone:[0xe2dccb,.9,.02,.3],saltCrust:[0xf3f0e7,.97,0,0],tideGrime:[0x6e6555,.92,.04,0]},
    bleachTop:.75,         // bleach on surfaces that face the sky
    bleachHeight:.22,      // more bleach the higher the panel
    bleachNoise:.55,       // blotchy unevenness of the bleaching
    underHeight:.62,       // the old deeper colour survives below this share of height
    crustAmount:.40,       // salt crust over the whole car
    crustLow:.55,          // more crust low and in the wheel arches
    crustEdge:.35,         // more crust caught on edges
    crustDepth:.0012,      // metres the crust stands proud
    lowHeight:.35,         // share of body height counted as low panels
    tideHeight:.22,        // the dried tide line, as a share of body height
    tideWidth:.06,         // its width, as a share of body height
    grime:.65,             // grime below the tide line
  },
  'desert-sand':{
    colors:{deepOchre:[0x6f4b22,.84,.15,1],dust:[0xcdb68d,.97,0,0],primer:[0x8c877b,.88,.1,0],grime:[0x4b3b27,.93,.05,0]},
    mottle:.35,            // enamel colour unevenness
    dustTop:.75,           // dust settled on surfaces that face the sky
    dustLow:.55,           // dust thrown up on low panels and wheel arches
    dustNoise:.65,         // how patchy the dust is
    blastFront:.75,        // sandblasting on surfaces that face forward, strongest at the nose
    blastEdge:.45,         // sandblasting on edges
    blastGrain:.70,        // how grainy the blasted patches are
    lowHeight:.35,         // share of body height counted as low panels
    grime:.45,             // dark grime low down
    dustDepth:.0008,       // metres the dust stands proud
    primerDepth:.0006,     // metres the blasted primer sits below the enamel
  },
  'boneyard-silver':{
    colors:{wornDark:[0x4a4c45,.86,.55,0],oxide:[0xbfc0b6,.95,.15,0],polished:[0xc8cbc8,.22,1,0],grime:[0x39352b,.94,.05,0]},
    worn:.38,              // how much of the car has lost its lacquer
    wornNoise:.90,         // how blotchy the worn patches are
    wornLow:.35,           // more wear low and in the wheel arches
    oxideSpecks:.75,       // white oxide specks inside worn patches
    brushScale:55,         // brushed grain lines per metre
    brushStrength:.30,     // how much the brushed grain changes the shine
    polishEdge:.75,        // edges rubbed bright
    lowHeight:.32,         // share of body height counted as low panels
    grime:.50,             // dark grime low down
    wornDepth:.0006,       // metres the worn patches sit below the lacquer
  },
  'scrap-patchwork':{
    colors:{rustPlate:[0x7b3f22,.9,.25,0],fadedBlue:[0x4d6478,.72,.12,.6],creamPlate:[0xb9ad87,.76,.06,.6],bareSteel:[0x8d8f8b,.48,.85,0],
      weld:[0x2b2622,.82,.6,0],rust:[0x6a3218,.95,.15,0]},
    patchSize:.62,         // metres: the grid one patch can fill (a second, smaller layer is 62 percent of this)
    patchCount:.62,        // share of grid cells that carry a patch
    fillMin:.48,           // smallest patch as a share of its cell
    fillMax:.92,           // largest patch as a share of its cell
    weldWidth:.016,        // metres: the weld bead around each patch
    rivetSpacing:.085,     // metres between rivets
    rivetSize:.0085,       // metres: rivet radius
    plateDepth:.0035,      // metres a patch stands proud of the body
    rustEdge:.60,          // rust on the body's own edges
    rustLow:.45,           // rust on the body's low panels and arches
    lowHeight:.35,         // share of body height counted as low panels
    grime:.40,             // dark grime low down
  },
  'bowl-flame':{
    colors:{flameYellow:[0xf7d35e,.5,.05,1],flameOrange:[0xd9621c,.55,.05,1],char:[0x1f1611,.93,.1,0],outline:[0x240806,.6,.05,1]},
    flameLength:.62,       // how far the flames reach back, as a share of body length
    tongues:4.5,           // flame tongues from the bottom to the top of a side
    wobble:.40,            // how much the tongues wander
    outline:.009,          // outline width, as a share of body length
    rearScorch:.55,        // scorching toward the tail
    lowScorch:.40,         // scorching low down
    edgeScorch:.35,        // scorching on edges
    scorchNoise:.85,       // how patchy the scorching is
    lowHeight:.35,         // share of body height counted as low panels
    blisters:.75,          // heat blisters in the enamel
    blisterDepth:.0009,    // metres a blister stands proud
  },
  'soot-black':{
    colors:{sootDeep:[0x0b0b0a,.98,0,0],ash:[0x8b8881,.97,0,0],charcoal:[0x4d4a44,.9,.08,.5],burnt:[0x4c3022,.92,.15,0]},
    wheelSoot:.95,         // soot behind each wheel
    sootLength:1.1,        // metres the soot reaches back from a wheel
    sootHeight:1.25,       // how high it climbs, in wheel radii above the wheel's bottom
    lowSoot:.55,           // soot on the low panels
    ash:.45,               // ash caught in the grain
    ashTop:.75,            // more ash on surfaces that face the sky
    ashEdge:.45,           // more ash on edges
    mottle:.65,            // charcoal unevenness in the black
    burnt:.30,             // brown burn-through spots
    lowHeight:.30,         // share of body height counted as low panels
    ashDepth:.0005,        // metres the ash stands proud
  },
  'hazard-stripe':{
    colors:{stripeBlack:[0x15140f,.72,.05,.8],primer:[0x6c6a62,.85,.1,0],bareMetal:[0x8f8f89,.42,.85,0],grime:[0x4b4233,.93,.05,0],
      sunFaded:[0xcdb466,.88,.03,.5]},
    stripeWidth:.16,       // metres from one black stripe to the next, along the stripe's slope
    stripeAngle:45,        // degrees from upright on the sides; chevrons on the nose, tail and roof
    blackShare:.5,         // share of each pair that is black
    endLength:.20,         // nose and tail sections that are striped, as shares of body length
    bandHeight:.30,        // striped band around the lower body, as a share of body height
    border:.022,           // metres: the black border round the striped areas
    chips:.35,             // paint chipped through to primer
    chipEdge:.75,          // more chips on edges
    lowHeight:.30,         // share of body height counted as low panels
    grime:.45,             // dark grime low down
    sunFade:.55,           // yellow faded on surfaces that face the sky
    chipDepth:.0007,       // metres a chip sits below the paint
  },
});

// Each finish's numbers go to four vec4 slots, in this order. The shader reads them by these positions.
const SLOTS={
  'rust-patina':['rustAmount','lowRust','lowHeight','edgeRust', 'seamRust','seamWidth','seams.0','seams.1', 'breakUp','runs','steel','pitDepth'],
  'salt-bleach':['bleachTop','bleachHeight','bleachNoise','underHeight', 'crustAmount','crustLow','crustEdge','crustDepth', 'lowHeight','tideHeight','tideWidth','grime'],
  'desert-sand':['mottle','dustTop','dustLow','dustNoise', 'blastFront','blastEdge','blastGrain',null, 'lowHeight','grime','dustDepth','primerDepth'],
  'boneyard-silver':['worn','wornNoise','wornLow','oxideSpecks', 'brushScale','brushStrength','polishEdge',null, 'lowHeight','grime','wornDepth',null],
  'scrap-patchwork':['patchSize','patchCount','fillMin','fillMax', 'weldWidth','rivetSpacing','rivetSize','plateDepth', 'rustEdge','rustLow','lowHeight','grime'],
  'bowl-flame':['flameLength','tongues','wobble','outline', 'rearScorch','lowScorch','edgeScorch','scorchNoise', 'lowHeight','blisters','blisterDepth',null],
  'soot-black':['wheelSoot','sootLength','sootHeight','lowSoot', 'ash','ashTop','ashEdge','mottle', 'lowHeight','burnt','ashDepth',null],
  'hazard-stripe':['stripeWidth','stripeAngle.sin','stripeAngle.cos','blackShare', 'endLength','bandHeight','border','chips', 'chipEdge','lowHeight','grime','sunFade', 'chipDepth'],
};
export const PAINT_FINISH_IDS=Object.freeze(Object.keys(SLOTS));
const MODES=Object.freeze(Object.fromEntries(PAINT_FINISH_IDS.map((id,index)=>[id,index+1])));
const COLOR_SLOTS=6,PARAM_SLOTS=4;

function slotValue(look,name){
  if(name===null)return 0;
  const [key,part]=name.split('.');
  const value=look[key];
  if(part==='sin')return Math.sin(THREE.MathUtils.degToRad(value));
  if(part==='cos')return Math.cos(THREE.MathUtils.degToRad(value));
  return part===undefined?value:value[Number(part)];
}
/** The table turned into shader numbers, for tests and the shader alike. */
export function packPaintFinish(id){
  const look=PAINT_FINISH_LOOK[id];
  if(!look||!SLOTS[id])return null;
  const params=SLOTS[id].map(name=>slotValue(look,name));
  while(params.length<PARAM_SLOTS*4)params.push(0);
  const colors=Object.values(look.colors);
  return {mode:MODES[id],params,colors};
}

const GLSL_PARS=`
uniform float uFinishMode;
uniform vec3 uFinishBoxMin;
uniform vec3 uFinishBoxSize;
uniform vec4 uFinishAxles;
uniform float uFinishBaseLum;
uniform vec3 uFinishColor[${COLOR_SLOTS}];
uniform vec4 uFinishSurf[${COLOR_SLOTS}];
uniform vec4 uFinishP[${PARAM_SLOTS}];
uniform vec4 uFinishShared;
uniform vec2 uFinishArch;
uniform sampler2D uFinishNoise;
varying vec3 vFinishPos;
varying vec3 vFinishNormal;
vec3 finishTri(vec3 p,vec3 w,float s){
  return texture2D(uFinishNoise,p.zy*s).rgb*w.x+texture2D(uFinishNoise,p.xz*s).rgb*w.y+texture2D(uFinishNoise,p.xy*s).rgb*w.z;
}
float finishHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void finishLayer(inout vec3 col,inout vec3 surf,int i,float t,float tint){
  t=clamp(t,0.,1.);col=mix(col,uFinishColor[i]*tint,t);surf=mix(surf,uFinishSurf[i].xyz,t);
}
// One patch layer of Scrap Patchwork. Returns (signed distance to the patch edge in metres, negative inside;
// along-edge metres for rivets; colour pick 0 to 1; 1 where a patch exists).
vec4 finishPatch(vec2 uv,float plane,float size,float count){
  vec2 g=uv/size;float row=floor(g.y);g.x+=mod(row,2.)*.5;
  vec2 cell=floor(g),local=fract(g)-.5;
  float h1=finishHash(vec3(cell,plane)),h2=finishHash(vec3(cell+17.3,plane)),h3=finishHash(vec3(cell-9.1,plane+3.)),h4=finishHash(vec3(cell+5.7,plane-7.));
  vec2 extent=mix(vec2(uFinishP[0].z),vec2(uFinishP[0].w),vec2(h2,h3))*.5;
  vec2 offset=(vec2(h3,h4)-.5)*(1.-2.*extent);
  vec2 d2=abs(local-offset)-extent;
  float d=max(d2.x,d2.y)*size;
  float along=(d2.x>d2.y?local.y:local.x)*size;
  return vec4(d,along,h4,step(h1,count));
}
vec3 finishBump(vec3 surfPos,vec3 surfNormal,float height,float faceDir){
  vec3 sx=dFdx(surfPos),sy=dFdy(surfPos);
  vec3 r1=cross(sy,surfNormal),r2=cross(surfNormal,sx);
  float det=dot(sx,r1)*faceDir;
  vec3 grad=sign(det)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(abs(det)*surfNormal-grad);
}
`;

// All eight finishes. Every look number comes from uFinishP (the table); the few literals left are the soft
// widths that keep a line from aliasing and the noise-channel mixes.
const GLSL_COLOR=`
vec3 finishSurfOut=vec3(roughness,metalness,1.);
float finishHeight=0.;
if(uFinishMode>.5){
  vec3 fp=vFinishPos,fn=normalize(vFinishNormal);
  vec3 q=clamp((fp-uFinishBoxMin)/uFinishBoxSize,0.,1.);
  float tint=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))/max(uFinishBaseLum,1e-4),0.,1.5);
  vec3 tw=pow(abs(fn),vec3(4.));tw/=tw.x+tw.y+tw.z;
  vec3 big=finishTri(fp,tw,uFinishShared.x),fine=finishTri(fp+3.7,tw,uFinishShared.y);
  float runs=texture2D(uFinishNoise,vec2((fp.z+fp.x)*uFinishShared.z,fp.y*uFinishShared.z*.12)).b;
  float curve=length(fwidth(vFinishNormal))/max(length(fwidth(vFinishPos)),1e-5);
  float edge=smoothstep(uFinishShared.w,uFinishArch.y,curve);
  float side=smoothstep(.35,.8,abs(fn.x)),sky=smoothstep(.35,.95,fn.y);
  vec2 frontArch=vec2(fp.z-uFinishAxles.x,fp.y-uFinishAxles.w),rearArch=vec2(fp.z-uFinishAxles.y,fp.y-uFinishAxles.w);
  float archDist=min(length(frontArch),length(rearArch))-uFinishAxles.z;
  float arch=(1.-smoothstep(0.,uFinishAxles.z*uFinishArch.x,archDist))*step(-.03,archDist);
  vec3 col=diffuseColor.rgb,surf=finishSurfOut;
  vec4 a=uFinishP[0],b=uFinishP[1],c=uFinishP[2],e=uFinishP[3];
  if(uFinishMode<1.5){ // Rust Patina: old paint survives up top; rust gathers on edges, seams and low panels.
    float low=1.-smoothstep(0.,a.z,q.y);
    float seamDist=min(abs(q.z-b.z),abs(q.z-b.w))*uFinishBoxSize.z;
    float seam=(1.-smoothstep(0.,b.y,seamDist))*side;
    float field=a.x+low*a.y+arch*a.y+edge*a.w+seam*b.x+(big.r-.5)*c.x+(fine.g-.5)*.3+(runs-.5)*c.y*side*(1.-q.y);
    float rust=smoothstep(.47,.53,field),flake=1.-smoothstep(0.,.05,abs(field-.5));
    vec3 rc=col,rs=surf;
    finishLayer(rc,rs,0,1.-smoothstep(.25,.75,big.g),tint);
    finishLayer(rc,rs,1,smoothstep(.55,.85,fine.r)*(.35+.65*big.r),tint);
    rc*=.78+.4*fine.g;
    vec3 pc=uFinishColor[2]*tint*(.84+.3*big.g);
    pc=mix(pc,pc*1.22+.025,sky*.5);
    col=mix(pc,rc,rust);surf=mix(uFinishSurf[2].xyz,rs,rust);
    finishLayer(col,surf,0,flake*.55,tint);
    float steel=smoothstep(.55,1.,edge)*c.z*step(.42,fine.g);
    finishLayer(col,surf,3,steel,tint);
    finishHeight=((1.-rust)+rust*fine.g*.5)*c.w;
  }else if(uFinishMode<2.5){ // Salt Bleach: strongest on top; crust and a tide line low down.
    float low=1.-smoothstep(0.,c.x,q.y);
    finishLayer(col,surf,0,1.-smoothstep(a.w*.4,a.w,q.y+(big.g-.5)*.3),tint);
    finishLayer(col,surf,1,a.x*sky+a.y*q.y+(big.r-.5)*a.z,tint);
    float crust=smoothstep(.5,.6,fine.r*.7+big.g*.3+low*b.y+arch*b.y+edge*b.z-1.+b.x);
    float tideLine=c.y+(big.b-.5)*.06;
    float below=1.-smoothstep(tideLine-c.z,tideLine,q.y),line=1.-smoothstep(0.,c.z*.35,abs(q.y-tideLine));
    finishLayer(col,surf,3,(below*.45+line)*c.w*(.4+.6*side),tint);
    finishLayer(col,surf,2,crust,tint);
    finishHeight=crust*b.w;
  }else if(uFinishMode<3.5){ // Desert Sand: blasted nose and edges, dust on top and low down.
    float low=1.-smoothstep(0.,c.x,q.y);
    col*=1.+(big.r-.5)*a.x;
    finishLayer(col,surf,0,smoothstep(.55,.9,big.g)*a.x*1.5,tint);
    float blast=smoothstep(.2,.9,fn.z)*q.z*q.z*b.x+edge*b.y;
    float primer=smoothstep(.5,.58,blast+(fine.g-.5)*b.z);
    finishLayer(col,surf,2,primer,tint);
    float dust=smoothstep(.45,.65,a.y*smoothstep(.4,.95,fn.y)+a.z*(low+arch)+(fine.r-.5)*a.w+(big.b-.5)*.3);
    finishLayer(col,surf,1,dust*.88,tint);
    finishLayer(col,surf,3,low*c.y*(.6+.4*big.r),tint);
    finishHeight=dust*c.z-primer*c.w;
  }else if(uFinishMode<4.5){ // Boneyard Silver: brushed metal, worn dull patches, bright rubbed edges.
    float low=1.-smoothstep(0.,c.x,q.y);
    float across=mix(fp.y,fp.x,abs(fn.y));
    float brush=texture2D(uFinishNoise,vec2(fp.z*.1+fp.x*.05,across*b.x/48.)).g;
    surf.x=clamp(surf.x+(brush-.5)*b.y,0.,1.);col*=1.+(brush-.5)*b.y*.5;
    float worn=smoothstep(.5,.58,a.x+(big.r-.5)*a.y+(low+arch)*a.z+(fine.g-.5)*.15);
    finishLayer(col,surf,0,worn,tint);
    finishLayer(col,surf,1,worn*smoothstep(.72,.8,fine.r)*a.w,tint);
    finishLayer(col,surf,2,smoothstep(.5,1.,edge)*b.z*(1.-worn),tint);
    finishLayer(col,surf,3,low*c.y*(.5+.5*big.g),tint);
    finishHeight=-worn*c.z;
  }else if(uFinishMode<5.5){ // Scrap Patchwork: welded, riveted plates in their own colours.
    float low=1.-smoothstep(0.,c.z,q.y);
    finishLayer(col,surf,5,smoothstep(.5,.6,edge*c.x+(low+arch)*c.y+(big.r-.5)*.6+(fine.g-.5)*.2),tint);
    finishLayer(col,surf,4,low*c.w*(.5+.5*big.r),tint);
    vec3 an=abs(fn);vec2 uv;float plane;
    if(an.x>=an.y&&an.x>=an.z){uv=fp.zy;plane=fn.x>0.?1.:2.;}
    else if(an.y>=an.z){uv=fp.xz;plane=fn.y>0.?3.:4.;}
    else{uv=fp.xy;plane=fn.z>0.?5.:6.;}
    vec4 p=finishPatch(uv,plane,a.x,a.y),small=finishPatch(uv+vec2(.37,.71),plane+11.,a.x*.62,a.y*.6);
    if(small.w>.5&&small.x<b.x)p=small;
    float aa=max(fwidth(p.x),1e-4);
    if(p.w>.5){
      float inside=1.-smoothstep(-aa,aa,p.x);
      float pick=p.z*4.;
      vec3 pcol=pick<1.?uFinishColor[0]:pick<2.?uFinishColor[1]:pick<3.?uFinishColor[2]:uFinishColor[3];
      vec4 psurf=pick<1.?uFinishSurf[0]:pick<2.?uFinishSurf[1]:pick<3.?uFinishSurf[2]:uFinishSurf[3];
      pcol*=tint*(.82+.36*big.g);
      float plateRust=smoothstep(.55,.85,(1.-smoothstep(0.,.07,-p.x))*.75+(fine.r-.5)*.8);
      pcol=mix(pcol,uFinishColor[5]*tint,plateRust*.8);
      col=mix(col,pcol,inside);surf=mix(surf,mix(psurf.xyz,uFinishSurf[5].xyz,plateRust*.8),inside);
      float weld=1.-smoothstep(b.x*.45,b.x,abs(p.x));
      float inset=-b.x*1.9,spacing=b.y;
      float s=abs(fract(p.y/spacing)-.5)*spacing;
      float rivet=1.-smoothstep(b.z*.7,b.z,length(vec2(s,p.x-inset)));
      finishLayer(col,surf,4,max(weld*(.7+.3*fine.g),rivet),tint);
      finishHeight=inside*b.w+weld*b.w*.6+rivet*b.w*.8;
    }
  }else if(uFinishMode<6.5){ // Bowl Flame: painted flames from the nose, scorched toward the tail.
    float low=1.-smoothstep(0.,c.x,q.y);
    float fromFront=1.-q.z;
    float across=mix(q.y,abs(q.x-.5)*2.,smoothstep(.55,.85,fn.y));
    float tip=1.-abs(sin((across*a.y+(big.r-.5)*a.z)*3.14159));
    float reach=a.x*(.35+.65*tip*tip)+(big.g-.5)*a.z*.12;
    float aa=max(fwidth(fromFront-reach),1e-4);
    float flame=1.-smoothstep(-aa,aa,fromFront-reach);
    float outline=1.-smoothstep(a.w,a.w+aa*1.5,abs(fromFront-reach));
    finishLayer(col,surf,0,flame,tint);
    finishLayer(col,surf,1,flame*smoothstep(.12,.85,fromFront/max(reach,1e-3)),tint);
    finishLayer(col,surf,3,outline*.9,tint);
    float scorchField=(1.-smoothstep(0.,.38,q.z))*b.x+low*b.y+edge*b.z+(big.r-.5)*b.w+(fine.g-.5)*.25;
    float scorch=smoothstep(.5,.72,scorchField);
    finishLayer(col,surf,2,scorch,tint);
    float blister=smoothstep(.78,.84,fine.r)*c.y*clamp(.25+scorchField,0.,1.);
    col*=1.-blister*.35;
    finishHeight=blister*c.z;
  }else if(uFinishMode<7.5){ // Soot Black: darkest low and behind the wheels, ash in the grain.
    float low=1.-smoothstep(0.,c.x,q.y);
    finishLayer(col,surf,2,smoothstep(.45,.8,big.r)*b.w,tint);
    float behindFront=uFinishAxles.x-fp.z,behindRear=uFinishAxles.y-fp.z;
    float wheelBottom=uFinishAxles.w-uFinishAxles.z,climb=uFinishAxles.z*a.z;
    float height=1.-smoothstep(climb*.45,climb,fp.y-wheelBottom);
    float trail=max(smoothstep(-uFinishAxles.z*.5,0.,behindFront)*(1.-smoothstep(0.,a.y,behindFront)),
      smoothstep(-uFinishAxles.z*.5,0.,behindRear)*(1.-smoothstep(0.,a.y,behindRear)));
    float soot=clamp(trail*height*a.x*(.7+.6*big.g)+low*a.w+arch*.6+(fine.g-.5)*.3,0.,1.);
    finishLayer(col,surf,0,soot,tint);
    float specks=smoothstep(1.-b.x,1.08-b.x,fine.r*.6+fine.g*.4);
    float ashWhere=clamp(b.y*sky+b.z*edge+.25,0.,1.);
    finishLayer(col,surf,1,specks*ashWhere*(1.-soot*.7),tint);
    finishLayer(col,surf,3,smoothstep(.8,.9,big.r+edge*.3)*c.y,tint);
    finishHeight=specks*ashWhere*c.z;
  }else{ // Hazard Stripe: black chevron stripes on the nose, tail and lower band, chipped and grimy.
    float low=1.-smoothstep(0.,c.y,q.y);
    finishLayer(col,surf,4,sky*c.w*(.6+.4*big.r),tint);
    float centre=uFinishBoxMin.x+uFinishBoxSize.x*.5;
    float phase=(abs(fp.x-centre)*a.y+fp.y*a.y+fp.z*a.z)/a.x;
    float aa=fwidth(phase)*1.5;
    float wave=abs(fract(phase)-.5)*2.;
    float stripe=1.-smoothstep(a.w-aa,a.w+aa,wave);
    float ends=max(q.z-(1.-b.x),b.x-q.z)*uFinishBoxSize.z,band=(b.y-q.y)*uFinishBoxSize.y;
    float region=max(ends,band),raa=max(fwidth(region),1e-4);
    float inside=smoothstep(-raa,raa,region),border=1.-smoothstep(b.z,b.z+raa,abs(region));
    finishLayer(col,surf,0,max(inside*stripe,border),tint);
    float chip=smoothstep(.5,.56,edge*c.x+(fine.r-.5)*.9+(big.g-.5)*.5+b.w-.5+low*.2);
    finishLayer(col,surf,1,chip,tint);
    finishLayer(col,surf,2,chip*step(.62,fine.g),tint);
    finishLayer(col,surf,3,low*c.z*(.5+.5*big.r),tint);
    finishHeight=-chip*e.x;
  }
  diffuseColor.rgb=col;finishSurfOut=surf;
}
`;

const finishUniforms=new WeakMap(),vehicleSpaces=new WeakMap();
const NOT_INSTALLED=Symbol('none');

function makeUniforms(){
  return {
    uFinishMode:{value:0},uFinishBoxMin:{value:new THREE.Vector3()},uFinishBoxSize:{value:new THREE.Vector3(1,1,1)},
    uFinishAxles:{value:new THREE.Vector4(1,-1,.35,.35)},uFinishBaseLum:{value:1},
    uFinishColor:{value:Array.from({length:COLOR_SLOTS},()=>new THREE.Color())},
    uFinishSurf:{value:Array.from({length:COLOR_SLOTS},()=>new THREE.Vector4())},
    uFinishP:{value:Array.from({length:PARAM_SLOTS},()=>new THREE.Vector4())},
    uFinishShared:{value:new THREE.Vector4()},uFinishArch:{value:new THREE.Vector2()},
    uFinishNoise:{value:scrapNoise()},
  };
}

// Chained after the car's own wear shader, like it chains after the factory's: the finish draws first, then dents,
// scratches and burning draw over it.
function install(material){
  const existing=finishUniforms.get(material);
  if(existing)return existing;
  const uniforms=makeUniforms();
  finishUniforms.set(material,uniforms);
  const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    Object.assign(shader.uniforms,finishUniforms.get(this)??uniforms);
    shader.vertexShader='varying vec3 vFinishPos;\nvarying vec3 vFinishNormal;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvFinishPos=position;vFinishNormal=normal;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\n'+GLSL_PARS)
      .replace('#include <color_fragment>','#include <color_fragment>\n'+GLSL_COLOR)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nif(uFinishMode>.5)roughnessFactor=finishSurfOut.x;')
      .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nif(uFinishMode>.5)metalnessFactor=finishSurfOut.y;')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nif(uFinishMode>.5)normal=finishBump(-vViewPosition,normal,finishHeight,faceDirection);')
      .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nif(uFinishMode>.5)material.clearcoat*=finishSurfOut.z;\n#endif');
  };
  material.customProgramCacheKey=()=>`${previousKey}:paint-finish-v1`;
  material.needsUpdate=true;
  return uniforms;
}

// The painted body's box and the wheel axles, in the car's own metres. Read once per car from its own geometry.
function vehicleSpace(vehicle,paint){
  const cached=vehicleSpaces.get(vehicle);
  if(cached?.paint===paint)return cached;
  const box=new THREE.Box3(),point=new THREE.Vector3();
  vehicle.traverse(object=>{
    const materials=Array.isArray(object.material)?object.material:[object.material];
    const position=object.geometry?.attributes?.position;
    if(!position||!materials.includes(paint))return;
    for(let i=0;i<position.count;i++)box.expandByPoint(point.fromBufferAttribute(position,i));
  });
  if(box.isEmpty())box.set(new THREE.Vector3(-1,0,-2),new THREE.Vector3(1,1.4,2));
  const size=box.getSize(new THREE.Vector3()).max(new THREE.Vector3(.1,.1,.1));
  const wheels=(vehicle.userData.wheelPivots||[]).map(pivot=>pivot.userData?.restPosition??pivot.position).filter(Boolean);
  const radius=vehicle.userData.size?.wheelRadius??.36;
  const zs=wheels.map(wheel=>wheel.z),ys=wheels.map(wheel=>wheel.y);
  const axles=wheels.length?new THREE.Vector4(Math.max(...zs),Math.min(...zs),radius,ys.reduce((sum,y)=>sum+y,0)/ys.length)
    :new THREE.Vector4(box.min.z+size.z*.78,box.min.z+size.z*.22,radius,box.min.y+radius);
  const space={paint,min:box.min.clone(),size,axles};
  vehicleSpaces.set(vehicle,space);
  return space;
}

/** True when an appearance asks for one of the drawn finishes. */
export const isPaintFinish=pattern=>typeof pattern==='string'&&Object.hasOwn(MODES,pattern);

/**
 * Draw a finish on the car's paint, or turn it off with null. The shader is added the first time a drawn finish is
 * chosen and stays: changing between finishes, or back to a plain colour, only changes its numbers, so nothing is
 * recompiled. A car that never wears one of these finishes never gets the shader.
 */
export function applyPaintFinish(vehicle,paint,pattern,baseColor){
  if(!isPaintFinish(pattern)){
    const uniforms=finishUniforms.get(paint)??NOT_INSTALLED;
    if(uniforms!==NOT_INSTALLED)uniforms.uFinishMode.value=0;
    return;
  }
  const uniforms=install(paint),packed=packPaintFinish(pattern),space=vehicleSpace(vehicle,paint),shared=PAINT_FINISH_LOOK.shared;
  uniforms.uFinishMode.value=packed.mode;
  uniforms.uFinishBoxMin.value.copy(space.min);uniforms.uFinishBoxSize.value.copy(space.size);
  uniforms.uFinishAxles.value.copy(space.axles);
  uniforms.uFinishBaseLum.value=Math.max(1e-4,baseColor.r*.2126+baseColor.g*.7152+baseColor.b*.0722);
  for(let i=0;i<COLOR_SLOTS;i++){
    const [hex,roughness,metalness,coat]=packed.colors[i]??[0,1,0,0];
    uniforms.uFinishColor.value[i].setHex(hex);uniforms.uFinishSurf.value[i].set(roughness,metalness,coat,0);
  }
  for(let i=0;i<PARAM_SLOTS;i++)uniforms.uFinishP.value[i].fromArray(packed.params,i*4);
  uniforms.uFinishShared.value.set(shared.blotchScale,shared.grainScale,shared.runScale,shared.edgeStart);
  uniforms.uFinishArch.value.set(shared.archBand,shared.edgeFull);
}

/** The finish's shader numbers on a paint material, or null if it never wore a drawn finish (tests read this). */
export function paintFinishUniforms(paint){return finishUniforms.get(paint)??null;}
