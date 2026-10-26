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
// Actual High/LOD outer posts clear the Open edge by at least 1.5 m.
// Keep the original whole-tile anchor and every other named face unchanged.
const galleryEntranceTranslations=Object.freeze({
  'gallery-concrete-pillar':Object.freeze([-10.541,0,0]),
  'gallery-concrete-pillar.001':Object.freeze([-12.799,0,0]),
});
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
// Claude's finishing pass (14 October): the ground beside the Ledge falls away into a valley with a lit
// town on its floor. The road and 36 m of shoulder either side are untouched; only the far ground changes.
// Uses the existing `basins` bowl without water (no `water` key), so nothing is drawn but the dug ground.
const LEDGE_VALLEY=Object.freeze({id:'ledge-valley',s:11459,lateral:-420,along:300,across:260,surface:-190,depth:30,bank:.7,blend:260,keep:36});
// 48 town lights on the valley floor, 300 to 520 m from the road: a main block, two small hamlets and a
// string of lamps along a lane. Placed by fixed spacing and a repeating wobble, no random numbers. The
// floor is level only between s 11380 and 11660, so every row stays inside that stretch.
const wobble=(i,k)=>Math.sin(i*12.9898+k*78.233)*43758.5453%1;
const TOWN_LIGHTS=Object.freeze([
  ...Array.from({length:24},(_,i)=>[11440+Math.floor(i/4)*24+wobble(i,1)*7,-360-(i%4)*22+wobble(i,2)*7]),
  ...Array.from({length:9},(_,i)=>[11436+(i%3)*18+wobble(i+30,1)*5,-470-Math.floor(i/3)*18+wobble(i+30,2)*5]),
  ...Array.from({length:9},(_,i)=>[11600+(i%3)*18+wobble(i+50,1)*5,-420-Math.floor(i/3)*18+wobble(i+50,2)*5]),
  ...Array.from({length:6},(_,i)=>[11400+i*45,-300+wobble(i+70,1)*6]),
].map(([s,lateral])=>Object.freeze([Math.round(s),Math.round(lateral)])));
export const SUMMIT_RUN=defineScriptedCourse({
  ...base,sections,
  snowmen:Object.freeze([27,29,31,33,35,36,42,43,45,47,49,50].map((index,i)=>
    Object.freeze({s:at(index)+35,lateral:geometry.pieces[index].kind==='turn'
      ? -geometry.pieces[index].dir*17 : i%2?-17:17}))),
  lightPath:{axis:'distance',keyframes:[{at:0,look:'day'},{at:at(26),look:'golden'},{at:at(29),look:'dusk'},{at:10100,look:'night'}]},
  snowWorld:{always:true,mixed:true,softBanks:true,bankHeaps:true,snowPoles:true,variation:true,variationStrength:.45,variationScale:800,rockTint:0x343936,branchTone:0x293135,drifts:true,nightExposure:1.02,ranges:[{from:at(27),to:finish}],exposed:[{from:at(42),to:finish}],
    // Tone breaks in the snowfields (finishing pass): dark pine clumps and a few frozen ponds on flat ground.
    pineClusters:[[7450,30],[7760,-30],[8050,30],[8350,-30],[8700,-30],[9000,30],[9350,30],[9650,-30],[9950,30],[11100,-30],[11700,30],[12300,-28],[12650,30],[13200,-28]]
      .map(([s,lateral])=>({s,lateral,count:7,radius:10})),
    ponds:[[7700,-56,30,22],[8100,56,28,20],[8600,56,28,20],[9300,-56,30,22],[9700,56,28,20]]
      .map(([s,lateral,radiusX,radiusZ])=>({s,lateral,radiusX,radiusZ}))},
  surfacePatches:[
    {id:'snowfield-ice-1',kind:'ice',shaded:true,s0:at(30)+60,s1:at(30)+80},
    {id:'snowfield-ice-2',kind:'ice',shaded:true,s0:at(32)+60,s1:at(32)+80},
    {id:'snowfield-ice-3',kind:'ice',shaded:true,s0:at(36)+60,s1:at(36)+80},
  ],
  roadBranches:[{id:'summit-open-road',start:10100,end:10900,side:-1,offset:18,halfWidth:6,surface:'paved',gripKind:'asphalt'}],
  galleries:[{id:'summit-gallery',cover:false,start:10170,end:10800,width:5,solidSides:true,roofWidth:7.8,flatRoof:true,height:galleryRoof.min[1]*1.1,clearance:{width:10,height:galleryRoof.min[1]*1.1},collisions:SUMMIT_GALLERY_BOUNDS}],
  scenery:{trees:120,rocks:100,mountains:false,
    forest:{from:13,to:56,spacing:5.2,rows:7,thin:.5,jitter:1.7,scale:[.45,2.1],clumps:{cut:.36,size:1.2},
      ranges:[{from:at(13),to:at(27),fadeOut:at(27)-at(26)+200}]}},
  effects:{birches:{seed:0xb1c4,groves:26,depth:[14,36],ranges:[{from:at(13),to:at(27)}]}},
  kitLook:{
    gallery:{wash:{colour:0xd8d5ca,strength:2.2,height:8,floor:.7}},
    'snow-rock':{smoothNormals:true},
    'summit-hut':{glow:3.2},
    observatory:{slit:{nodes:['observatory-cover','observatory-cover.001'],halfWidth:1.4,minY:3.38,minZ:.65,normalX:.9,colour:0xffdfaa,strength:3.8}},
  },
  basins:[LEDGE_VALLEY],
  groundLights:TOWN_LIGHTS.map(([s,lateral],i)=>({s,lateral,colour:i%3?0xffdba3:0xffa258,size:7,strength:1.5})),
  glows:[{piece:'gallery',points:[[-4.9,3.8,-2.2],[-4.9,3.8,2.2]],colour:0xffc87b,size:.8,strength:1.1},
    {piece:'summit-hut',points:[[0,1.5,1.1]],colour:0xffd392,size:1.2,strength:.8},
    // Finishing pass: warm halos on the outside of the hut's window band and down the observatory slot.
    {piece:'summit-hut',points:[[2.6,1.27,-1],[2.6,1.27,1],[-2.6,1.27,-1],[-2.6,1.27,1],[-1,1.27,2.2],[1,1.27,2.2],[-1,1.27,-2.2],[1,1.27,-2.2]],colour:0xffc477,size:1.1,strength:1},
    {piece:'observatory',points:[[0,4.2,5.6],[0,5,5.4],[0,5.8,5.1],[0,6.6,4.7],[0,7.4,4.2],[0,8.2,3.5],[0,9,2.8],[0,9.8,2],[0,10.4,1.3]],colour:0xffd9a0,size:2,strength:1.8}],
  mergeKitMeshes:['gallery'],
  kitPlacements:[
    ...Array.from({length:35},(_,index)=>({id:'gallery',s:10176+index*18,lateral:0,heading:0,scale:[1.2,1.1,3],
      ...(index===0?{nodeTranslations:galleryEntranceTranslations}:{})})),
    {id:'summit-hut',s:finish-240,lateral:54,heading:-Math.PI/2,scale:1.6},
    {id:'observatory',s:finish-60,lateral:-25,heading:Math.PI/2,scale:1},
    {id:'summit-finish',s:finish-4,lateral:0,heading:0,scale:1},
  ],
});

// Course-owned registration preserves generation identity and release order.
export const manifest=Object.freeze({
  id:'summit-run',flag:'summit-run',state:'on',price:2600,grandPrix:true,releaseOrder:4,
  driver:Object.freeze({car:'falcone_f42',driverId:'club',controller:'racing-line',skill:.95}),
});
