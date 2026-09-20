// Original standalone circuits. Real-world race tracks inspire their rhythm,
// not their layouts. Existing event indices and the three-stage campaign stay
// unchanged so saved careers, records and ghosts retain their identities.
const definitions = [
  ['eifel-crown','Eifel Crown','alpine',5600,'clear',
    [1.3,.83,[[2,.10,.4],[3,.045,1.1],[6,.11,.5],[9,.013,1.8]]],
    [[.18,.15,58],[.44,.14,98],[.73,.14,62],[.88,.07,20]],[[.325,62,7.4]],
    [['alpine','Forest Esses',.42],['alpine','Crown Ridge',.35],['coast','Valley Sweep',.23]],'lodge'],
  ['alpine-serpent','Alpine Serpent','alpine',4800,'overcast',
    [1.13,.97,[[2,.045,.2],[4,.10,.6],[6,.07,1.4],[8,.016,.1]]],
    [[.21,.18,108],[.52,.15,96],[.79,.16,72]],[[.395,54,6.5]],
    [['alpine','Glacier Climb',.38],['alpine','Avalanche Gallery',.36],['alpine','Serpent Descent',.26]],'gallery'],
  ['azure-riviera','Azure Riviera','coast',4400,'golden',
    [1.42,.76,[[2,.085,1],[3,.05,.2],[5,.08,1.6],[7,.014,.4]]],
    [[.19,.13,42],[.48,.17,76],[.77,.14,52]],[[.66,56,6.3]],
    [['coast','Pavilion Coast',.42],['alpine','Olive Ridge',.28],['coast','Azure Esses',.30]],'pavilion'],
  ['red-mesa','Red Mesa Corkscrew','desert',4000,'golden',
    [1.13,.9,[[2,.06,.7],[3,.08,2],[5,.095,.1],[7,.014,1.5]]],
    [[.19,.14,34],[.44,.145,93],[.76,.15,48]],[[.56,52,6]],
    [['desert','Mesa Approach',.36],['desert','Corkscrew Drop',.32],['desert','Redstone Run',.32]],'tower'],
  ['neon-docks','Neon Docks Circuit','city',4160,'night',
    [1.32,.8,[[2,.13,.3],[4,.065,1.4],[6,.06,.3],[8,.009,1.8]]],
    [[.24,.18,28],[.60,.20,35],[.83,.08,13]],[[.42,56,6]],
    [['city','Crane Quarter',.36],['coast','Breakwater Bend',.24],['city','Neon Exchange',.40]],'gantry'],
  ['cloudbreak-skyway','Cloudbreak Skyway','alpine',5200,'golden',
    [1.28,.84,[[2,.085,.3],[3,.08,1.1],[5,.07,.6],[7,.035,1.8]]],
    [[.18,.15,83],[.48,.17,118],[.77,.15,90]],[[.32,62,7.3],[.64,60,7]],
    [['desert','Canyon Launch',.27],['alpine','Cloudbreak Crest',.46],['coast','Skyline Return',.27]],'skydeck'],
];

export const EXPANSION_COURSES = definitions.map(([id,name,theme,lengthU,mood,shape,hills,crests,sections,landmark],index)=>({
  id,name,theme,lengthU,stage:9+index,kind:'circuit',layout:`expansion-${id}`,layoutVersion:2,layoutSeed:1989,
  closed:true,laps:2,hasRival:true,hasRadar:false,speedLimitMph:65,airborne:true,terrainHalfWidth:64,
  timeOfDay:mood==='night'?'night':undefined,defaultMood:mood,
  expansion:{shape,hills,crests,landmark,landmarkFraction:landmark==='skydeck'?.47:landmark==='gallery'?.50:.17,
    tunnelSections:['alpine-serpent','cloudbreak-skyway'].includes(id)?[1]:[],treeAttempts:id==='eifel-crown'?1600:800},
  sections:sections.map(([theme,name,share])=>({theme,name,share})),
}));

export function expansionPoint(def,t){
  const [xScale,zScale,harmonics]=def.expansion.shape,a=t*Math.PI*2;
  const radius=1+harmonics.reduce((sum,[frequency,amount,phase])=>sum+amount*Math.cos(a*frequency+phase),0);
  return {x:Math.cos(a)*radius*xScale,z:Math.sin(a)*radius*zScale};
}

export function expansionHeight(def,s){
  const phase=((s%def.lengthU)+def.lengthU)%def.lengthU,fraction=phase/def.lengthU;
  let height=14;
  for(const [center,span,rise] of def.expansion.hills){
    const distance=(fraction-center)/span;
    if(Math.abs(distance)<1)height+=rise*(1+Math.cos(Math.PI*distance))*.5;
  }
  // Small smooth convex crests become jumps only at sufficient speed. The
  // position source is shared by rendering, vehicle grounding and physics.
  for(const [center,span,rise] of def.expansion.crests){
    const distance=(phase-center*def.lengthU)/span;
    if(Math.abs(distance)<1)height+=rise*(1+Math.cos(Math.PI*distance))*.5;
  }
  return height;
}
