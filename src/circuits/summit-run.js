// Summit Run: Claude's 52-piece mountain road (CIRCUITS.md 5.4).
// Scenic markers follow the actual draft; avalanche coordinates stay exact.
import {buildTrackScript, defineScriptedCourse} from '../track-script.js';

// Current approved gallery.glb accessor bounds, all mesh transforms applied.
// These small physical inputs are checked against the actual runtime asset.
export const SUMMIT_GALLERY_BOUNDS=Object.freeze([
  {name:'gallery-concrete-pillar',min:[-6.191241264343262,0,-2.911437511444092],max:[-5.2087602615356445,4.680518627166748,-1.977525234222412]},
  {name:'gallery-concrete-pillar.001',min:[-6.191241264343262,0,1.977525234222412],max:[-5.2087602615356445,4.680518627166748,2.911437511444092]},
  {name:'gallery-concrete-pillar.002',min:[5.2087602615356445,0,-2.911437511444092],max:[6.191241264343262,4.680518627166748,-1.977525234222412]},
  {name:'gallery-concrete-pillar.003',min:[5.2087602615356445,0,1.977525234222412],max:[6.191241264343262,4.680518627166748,2.911437511444092]},
  {name:'gallery-heavy-concrete-roof',min:[-6.5,4.596466064453125,-3.0346884727478027],max:[6.5,5.82415771484375,2.9990103244781494]},
  {name:'gallery-solid-uphill-back',min:[5.699999809265137,0,-3],max:[6.5,4.619999885559082,3]},
].map(row=>Object.freeze({...row,min:Object.freeze(row.min),max:Object.freeze(row.max)})));
const galleryRoof=SUMMIT_GALLERY_BOUNDS.find(row=>row.name==='gallery-heavy-concrete-roof');
const road = [
  ['straight',470,{name:'Start Straight'}],
  ['turn','L',26.5,200],
  ['straight',380,{name:'Cattle Grid Jump',crest:2.5}],
  ['turn','R',42.5,150],
  ['straight',370],
  ['turn','L',48.5,180],
  ['straight',340],
  ['turn','R',37.5,250],
  ['straight',630,{name:'Graded Gravel',surface:'gravel'}],
  ['turn','L',52.5,120,{surface:'asphalt'}],
  ['straight',390,{name:'Ranger Station Jump',crest:2.5}],
  ['turn','R',34.5,200],
  ['straight',310],
  ['straight',420,{name:'Pine Switchbacks'}],
  ['turn','L',175.5,16,{name:'Picnic Hairpin'}],
  ['straight',190],
  ['turn','R',54,80],
  ['straight',560],
  ['turn','R',172,16,{name:"Engineer's Hairpin"}],
  ['straight',210],
  ['turn','L',47,80],
  ['straight',570],
  ['turn','L',167.5,18,{name:'Brookside Hairpin'}],
  ['straight',170],
  ['turn','R',50,80],
  ['straight',370],
  ['straight',560,{name:'Tree Line Pit Straight'}],
  ['turn','R',38.5,150,{name:'Snowfields'}],
  ['straight',610],
  ['turn','L',40.5,150,{surface:'snow'}],
  ['straight',390],
  ['turn','R',175,16,{name:'Glacier Hairpin'}],
  ['straight',170],
  ['turn','L',53,80],
  ['straight',590,{name:'Whiteout Crest',crest:1.5}],
  ['turn','R',33.5,200],
  ['straight',520],
  ['straight',470,{name:'Gallery Split',width:10}],
  ['turn','L',40.5,120],
  ['straight',490,{name:'The Gallery'}],
  ['turn','R',40,120],
  ['straight',360,{name:'The Ledge',width:12}],
  ['straight',370,{name:"Devil's Staircase"}],
  ['turn','L',175,15,{name:"Devil's Elbow"}],
  ['straight',140],
  ['turn','R',38,80],
  ['straight',580],
  ['turn','R',178.5,15,{name:'Last Breath'}],
  ['straight',160],
  ['turn','L',52,80],
  ['straight',590],
  ['straight',440,{name:'Summit Finish'}],
];
// Warm asphalt ends before the unchanged tree-line pit straight.
for(let index=0;index<26;index++){
  const slot=road[index][0]==='turn'?4:2;
  road[index][slot]={...road[index][slot],surface:index===8?'gravel':'warm-tarmac'};
}
road[26][2]={...road[26][2],surface:'asphalt'};

// Fit the eased road within Claude's 10% allowance: turn away sooner after
// each hairpin, retain its radius, and begin the Gallery at the actual split.
const exits=[[15,16],[19,20],[23,24],[32,33],[44,45],[48,49]];
for(const [post,kink] of exits){road[post][1]*=.9;road[kink][2]*=1.1;}
road[18][2]=170;
const starts=[0,13,26,27,37,42,51], climbs=[120,220,30,200,0,150,0];
const draft={id:'summit-run',closed:false,scriptDefaults:{width:12},script:road};
const fitting=buildTrackScript({...draft}),fixedPosts=new Set(exits.map(([post])=>post));
const preGalleryStraight=road.slice(0,37).reduce((sum,row,index)=>
  sum+(row[0]==='straight'&&!fixedPosts.has(index)?row[1]:0),0);
const fitShare=1-(fitting.pieces[37].s0-10100)/preGalleryStraight;
for(let index=0;index<37;index++)if(road[index][0]==='straight'&&!fixedPosts.has(index))road[index][1]*=fitShare;
const plain=buildTrackScript(draft);
for(let section=0;section<starts.length;section++){
  const from=starts[section],to=starts[section+1]??road.length;
  const span=plain.pieces.slice(from,to).reduce((sum,piece)=>sum+piece.s1-piece.s0,0);
  for(let index=from;index<to;index++){
    const slot=road[index][0]==='turn'?4:2;
    road[index][slot]={...road[index][slot],climb:climbs[section]*(plain.pieces[index].s1-plain.pieces[index].s0)/span};
  }
}
const base={
  ...draft,name:'Summit Run',flag:'summit-run',stage:20,kind:'circuit',layoutVersion:1,
  theme:'alpine',laps:1,grandPrixLaps:1,fieldSize:6,gridStartS:45,defaultMode:'grandprix',
  hasRival:true,hasRadar:false,noTraffic:true,noCombat:true,airborne:true,
  terrainHalfWidth:64,speedLimitMph:100,
  racingLine:{roadShare:.85,maxSlope:.08,lineMargin:1.8},
  fieldFollow:{leadBraking:1.6,wallRoom:1,firstLap:{margin:5,reaction:.5,closeIn:.8,wallRoom:1.4}},
  pitLane:{straight:'Tree Line Pit Straight',side:'right',limiterLength:180,limitKph:80},
};
const geometry=buildTrackScript(base),at=index=>geometry.pieces[index].s0;
const names=['Desert Foothills','Pine Switchbacks','Tree Line','Snowfields','Avalanche Gallery',"Devil's Staircase",'Summit'];
const sections=starts.map((from,index)=>({theme:index===0?'desert':'alpine',name:names[index],share:((starts[index+1]===undefined?geometry.length:at(starts[index+1]))-at(from))/geometry.length}));
const finish=geometry.length;
export const SUMMIT_RUN=defineScriptedCourse({
  ...base,sections,
  snowmen:Object.freeze([27,29,31,33,35,36,42,43,45,47,49,50].map((index,i)=>
    Object.freeze({s:at(index)+35,lateral:geometry.pieces[index].kind==='turn'
      ? -geometry.pieces[index].dir*17 : i%2?-17:17}))),
  lightPath:{axis:'distance',keyframes:[{at:0,look:'day'},{at:at(26),look:'golden'},{at:at(29),look:'dusk'},{at:10100,look:'night'}]},
  snowWorld:{mixed:true,softBanks:true,drifts:true,nightExposure:1.02,ranges:[{from:at(27),to:finish}],exposed:[{from:at(42),to:finish}],pineClusters:[]},
  surfacePatches:[
    {id:'snowfield-ice-1',kind:'ice',shaded:true,s0:at(30)+60,s1:at(30)+80},
    {id:'snowfield-ice-2',kind:'ice',shaded:true,s0:at(32)+60,s1:at(32)+80},
    {id:'snowfield-ice-3',kind:'ice',shaded:true,s0:at(36)+60,s1:at(36)+80},
  ],
  roadBranches:[{id:'summit-open-road',start:10100,end:10900,side:-1,offset:18,halfWidth:6,surface:'paved',gripKind:'snow'}],
  galleries:[{id:'summit-gallery',start:10170,end:10800,width:5,roofWidth:7.8,flatRoof:true,height:galleryRoof.min[1]*1.1,collisions:SUMMIT_GALLERY_BOUNDS}],
  scenery:{trees:120,rocks:100,mountains:false,
    forest:{from:13,to:56,spacing:5.2,rows:7,thin:.5,jitter:1.7,scale:[.45,2.1],clumps:{cut:.36,size:1.2},
      ranges:[{from:at(13),to:at(27),fadeOut:at(27)-at(26)+200}]}},
  effects:{birches:{seed:0xb1c4,groves:26,depth:[14,36],ranges:[{from:at(13),to:at(27)}]}},
  kitLook:{
    gallery:{wash:{colour:0xcbd5e4,strength:.45,height:8,floor:.12}},
    'snow-rock':{smoothNormals:true},
    'summit-hut':{glow:1.4},
    observatory:{slit:{nodes:['observatory-cover','observatory-cover.001'],halfWidth:1.4,minY:3.38,minZ:.65,normalX:.9,colour:0xffdfaa,strength:1.4}},
  },
  mergeKitMeshes:['gallery'],
  kitPlacements:[
    ...Array.from({length:35},(_,index)=>({id:'gallery',s:10176+index*18,lateral:0,heading:0,scale:[1.2,1.1,3]})),
    {id:'summit-hut',s:finish-130,lateral:28,heading:-Math.PI/2,scale:1},
    {id:'observatory',s:finish-60,lateral:-40,heading:Math.PI/2,scale:1},
  ],
});

// Course-owned registration preserves generation identity and release order.
export const manifest=Object.freeze({
  id:'summit-run',flag:'summit-run',state:'dev',price:2600,grandPrix:true,releaseOrder:4,
  driver:Object.freeze({car:'falcone_f42',driverId:'club',controller:'racing-line',skill:.95}),
});
