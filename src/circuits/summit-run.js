// Summit Run: Claude's 52-piece mountain road (CIRCUITS.md 5.4).
// Scenic markers follow the actual draft; avalanche coordinates stay exact.
import {buildTrackScript, defineScriptedCourse} from '../track-script.js';

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
const starts=[0,13,26,27,37,42,51], climbs=[120,220,30,200,0,150,0];
const draft={id:'summit-run',closed:false,scriptDefaults:{width:12},script:road};
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
  ...draft,name:'Summit Run',flag:'summit-run',stage:19,kind:'circuit',layoutVersion:1,
  theme:'alpine',laps:1,grandPrixLaps:1,fieldSize:6,gridStartS:45,defaultMode:'grandprix',
  hasRival:true,hasRadar:false,noTraffic:true,noCombat:true,airborne:true,
  terrainHalfWidth:64,speedLimitMph:100,
  racingLine:{roadShare:.85,maxSlope:.08,lineMargin:1.8},
  fieldFollow:{leadBraking:1.6,wallRoom:1,firstLap:{margin:5,reaction:.5,closeIn:.8,wallRoom:1.4}},
  pitLane:{straight:'Tree Line Pit Straight',side:'right'},
};
const geometry=buildTrackScript(base),at=index=>geometry.pieces[index].s0;
const names=['Desert Foothills','Pine Switchbacks','Tree Line','Snowfields','Avalanche Gallery',"Devil's Staircase",'Summit'];
const sections=starts.map((from,index)=>({theme:index===0?'desert':'alpine',name:names[index],share:((starts[index+1]===undefined?geometry.length:at(starts[index+1]))-at(from))/geometry.length}));
const finish=geometry.length;
export const SUMMIT_RUN=defineScriptedCourse({
  ...base,sections,
  lightPath:{axis:'distance',keyframes:[{at:0,look:'day'},{at:at(26),look:'golden'},{at:at(29),look:'dusk'},{at:10100,look:'night'}]},
  snowWorld:{mixed:true,ranges:[{from:at(27),to:finish}],exposed:[{from:at(42),to:finish}],pineClusters:[]},
  surfacePatches:[
    {id:'snowfield-ice-1',kind:'ice',shaded:true,s0:at(30)+60,s1:at(30)+80},
    {id:'snowfield-ice-2',kind:'ice',shaded:true,s0:at(32)+60,s1:at(32)+80},
    {id:'snowfield-ice-3',kind:'ice',shaded:true,s0:at(36)+60,s1:at(36)+80},
  ],
  roadBranches:[{id:'summit-open-road',start:10100,end:10900,side:-1,offset:18,halfWidth:6,surface:'paved'}],
  galleries:[{id:'summit-gallery',start:10170,end:10830,width:5,height:6}],
  scenery:{trees:120,rocks:100,mountains:false},
  mergeKitMeshes:['gallery'],
  kitPlacements:[
    ...Array.from({length:37},(_,index)=>({id:'gallery',s:10176+index*18,lateral:0,heading:0,scale:[1.2,1.1,3]})),
    {id:'summit-hut',s:finish-130,lateral:28,heading:-Math.PI/2,scale:1},
    {id:'observatory',s:finish-60,lateral:-40,heading:Math.PI/2,scale:1},
  ],
});
