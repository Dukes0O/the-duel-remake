import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createProfile,settleRace,normalizeProfile,isCarUnlocked} from '../src/progression.js';
import {COURSE,CARS} from '../src/config.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags,FEATURE_STATES} from '../src/feature-flags.js';
import {yetiVisible,yetiSites,initializeYeti,YETI,yetiRewards,hash32} from '../src/yeti.js';
import {getRoadRoofLook,equipRoadRoof,equipArmorKit,getEquippedRoofLook} from '../src/armor-kits.js';
import {PAINT_PRESETS,paintPresetsFor,applyPaint,getPaintAppearance} from '../src/paint-presets.js';
import {createYetiAssets,createYetiRoof,createYetiView} from '../src/yeti-view.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {cloneChromeCrown,createArmorKitMeshes} from '../src/armor-kit-meshes.js';
import {createVehicleAttachmentRegistry,createRoadRoofOwner} from '../src/vehicle-attachments.js';
import {vehicleSocketLayout} from '../src/vehicle-sockets.js';
import {EngineAudio} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {App} from '../src/app.js';
import {purchaseCourse} from '../src/course-access.js';
let checks=0;
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const check=(value,message)=>{assert.ok(value,message);checks++;};
// Fur tint owns only material clones. This small flat ribbon fixture does not
// replace the accepted-model slope, animation, reward or save checks below.
{
  const sources=[];
  const assets=createYetiAssets({loadAsset:async()=>{
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.2,0,0,.2,0,0,0,1,0],3));
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0,1,0,0,0,0,0,0,0],4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
    const map=new THREE.Texture(),fur=new THREE.MeshStandardMaterial({name:'round-two-yeti-matted-ivory',color:0xeeeeee,map,vertexColors:true,roughness:.97});
    const eyes=new THREE.MeshStandardMaterial({name:'round-two-yeti-small-eyes',color:0x222222});
    const teeth=new THREE.MeshStandardMaterial({name:'teeth',color:0xffffff});
    const root=new THREE.Group(),mesh=new THREE.SkinnedMesh(geometry,[fur,eyes,teeth]);
    const left=new THREE.Bone(),right=new THREE.Bone();left.name='FootL';right.name='FootR';mesh.add(left,right);mesh.bind(new THREE.Skeleton([left,right]));
    root.add(mesh,new THREE.Mesh(geometry,fur));
    const asset={scene:root,animations:['chest-beat','idle','lope','roar','walk-off'].map(name=>new THREE.AnimationClip(name,1,[]))};
    sources.push({asset,geometry,map,fur,eyes,teeth,array:mesh.material});return asset;
  }});
  await assets.load();equal(assets.status,'ready');
  const course={def:{id:'summit-run',terrainHalfWidth:64},length:100,samples:[{x:0,z:0},{x:1,z:0}],features:{shortcuts:[]},
    groundAt:(s,off)=>({x:10000+s,y:0,z:off,heading:0,s,off}),nearest:(x,z)=>({s:x-10000,lateral:z})};
  const state={status:'racing',stageTimeSec:1,yeti:{appears:true,site:{s:40,lateral:10},seen:false,seenAt:null}},before=JSON.stringify(state);
  const tint=new THREE.Color(1.8,1.8,1.8),plain=createYetiView(assets),view=createYetiView(assets,{furTint:tint}),other=createYetiView(assets,{furTint:0xffdddd});
  const materials=root=>{const rows=[];root.traverse(node=>{if(node.material)rows.push(...[node.material].flat());});return rows;};
  for(const high of [true,false]){plain.update(state,course,high);view.update(state,course,high);other.update(state,course,high);}
  const owned=new Set(materials(view.group).filter(m=>m.name==='round-two-yeti-matted-ivory'));
  equal(owned.size,2,'one owned fur material per High/LOD actor, shared by its meshes');
  for(const source of sources){
    const tinted=[...owned].find(m=>m.map===source.map);check(tinted&&tinted!==source.fur,'fur uses an owned material clone');
    check(materials(view.group).filter(m=>m===tinted).length>=2,'one actor shares its fur clone across meshes');
    const geometry=[];view.group.traverse(node=>{if(node.geometry)geometry.push(node.geometry);});check(geometry.includes(source.geometry),'geometry remains shared and exact');
    equal(tinted.color.toArray(),tint.toArray(),'explicit neutral brightness reaches the fur');
    equal(tinted.roughness,source.fur.roughness);equal(tinted.vertexColors,source.fur.vertexColors);check(tinted.map===source.map);
    check(materials(plain.group).includes(source.fur),'omitting tint retains the shared original material');
    check(materials(view.group).includes(source.eyes)&&materials(view.group).includes(source.teeth),'eyes and teeth are untouched');
    equal(source.array,[source.fur,source.eyes,source.teeth],'shared donor material array remains exact');
    equal(source.fur.color.getHex(),0xeeeeee,'donor diffuse colour stays exact');
    check(!materials(other.group).includes(tinted),'two views never share owned materials');
  }
  let disposed=0,sourceDisposed=0;for(const m of owned)m.addEventListener('dispose',()=>disposed++);
  for(const source of sources)for(const m of [source.fur,source.eyes,source.teeth,source.map,source.geometry])m.addEventListener('dispose',()=>sourceDisposed++);
  view.dispose();view.dispose();equal(disposed,2,'owned fur materials dispose once');equal(sourceDisposed,0,'view never disposes source resources');
  plain.dispose();other.dispose();equal(sourceDisposed,0,'all view cleanup leaves shared donor alive');
  equal(JSON.stringify(state),before,'material updates never change race state');assets.dispose();
}

const length=COURSE.length;
if(!COURSE.some(def=>def.id==='summit-run'))COURSE.push(SUMMIT_RUN);
const summit=COURSE.findIndex(def=>def.id==='summit-run');
const payload=(extra={})=>({runId:'yeti-first',stageIndex:summit,car:'falcone_f42',mode:'grandprix',grandPrixCareerEnabled:false,
  won:true,completed:true,timeSec:420,laps:1,position:1,fieldSize:6,yetiEnabled:true,yetiSeen:true,
  ownerPlayerId:'player-1',playerId:'player-1',...extra});
const flags=(on=true)=>createFeatureFlags({storage:null,overrides:{yeti:on,'summit-run':true,'grand-prix':true}});
const game=(on=true,stage=summit,seed=1989,mode='duel')=>{const duel=new Duel({seed,featureFlags:flags(on)});duel.startCampaign({startStage:stage,car:'falcone_f42',mode});duel.state.status='racing';return duel;};
try{
  equal(FEATURE_STATES.yeti,'on');equal(YETI,{eye:1.2,chest:1.8,distance:60,angle:75*Math.PI/180,rayStep:2});
  let profile=createProfile(),original=JSON.stringify(profile);
  const first=settleRace(profile,payload());equal(first.profile.yeti.sightings,1,'actual GP career-off named sighting counts');check(first.yetiAwarded);
  const {yeti,...legacy}=first.profile;equal(JSON.stringify(legacy),original,'GP career-off keeps all old bank/record/history fields exact');equal(first.reward,0);equal(first.awarded,false);
  equal(settleRace(first.profile,payload()).profile,first.profile,'duplicate same run cannot count');
  for(const extra of [{completed:false},{abandoned:true},{timeout:true},{qualifying:true},{practice:true},{yetiEnabled:false},{yetiSeen:false},
    {timeSec:0},{timeSec:NaN},{laps:0},{laps:2},{car:'no-car'},{car:'aurora_gt'},
    {stageIndex:0,laps:2},{position:7},{fieldSize:9},{mode:'wasteland'},
    {runId:''},{won:1},{ownerPlayerId:'player-2'},{ownerPlayerId:' '},{playerId:null}]){
    const result=settleRace(profile,payload(extra));check(!Object.hasOwn(result.profile,'yeti'),'invalid/off/foreign result never allocates ledger: '+JSON.stringify(extra));
  }
  for(const mode of ['duel','timetrial','timeattack','grandprix']){
    const result=settleRace(profile,payload({mode,runId:'mode-'+mode,won:false,position:2}));equal(result.profile.yeti.sightings,1,'valid completed loss/mode counts');
  }
  for(let sighting=1;sighting<=5;sighting++){
    profile=settleRace(profile,payload({runId:'sighting-'+sighting})).profile;
    equal(yetiRewards(profile),{roof:sighting>=3,frost:sighting>=5});check(!profile.yeti.roof,'earning never equips');
  }
  equal(normalizeProfile(profile).yeti,profile.yeti,'off load preserves earned optional fields');
  check(!Object.hasOwn(normalizeProfile(createProfile()),'yeti'),'legacy normalization stays absent');
  const corrupt=normalizeProfile({...profile,yeti:{sightings:3,settled:['ok','ok',null],roof:{falcone_f42:'yeti',aurora_gt:'yeti',wrong:'yeti',stuttgart_959s:'invented'}}});
  equal(corrupt.yeti,{sightings:3,settled:['ok'],roof:{falcone_f42:'yeti'}},'known owned car/choice normalization');
  const keys=Array.from({length:120},(_,i)=>'retained-'+i);
  const recent=normalizeProfile({...profile,yeti:{sightings:100,settled:[...keys,'retained-0',null,'x'.repeat(181)]}});
  equal(recent.yeti.settled,[...keys.slice(25),'retained-0'],'retain the 96 most-recent unique valid keys');
  const appended=settleRace(recent,payload({runId:'bounded-new'}));
  equal(appended.profile.yeti.settled,[...recent.yeti.settled.slice(1),'bounded-new:summit-run'],'live append uses the same 96-key bound');
  equal(appended.profile.yeti.sightings,101,'bounded valid finish still counts');
  equal(settleRace(appended.profile,payload({runId:'bounded-new'})).profile,appended.profile,'recent duplicate retains identical profile');
  const capped={...recent,yeti:{...recent.yeti,sightings:1000000}};
  const atCap=settleRace(capped,payload({runId:'cap-new'}));
  check(atCap.profile===capped,'sighting cap returns identical profile without key append');
  check(!atCap.yetiAwarded,'capped sighting is not counted');
  const other=createProfile();equal(yetiRewards(other),{roof:false,frost:false},'named profile rewards isolated');
  const roof=equipRoadRoof(profile,'falcone_f42','yeti',{yetiEnabled:true});check(roof.ok);equal(getRoadRoofLook(roof.profile,'falcone_f42',{yetiEnabled:true}),'yeti');
  equal(getRoadRoofLook(roof.profile,'stuttgart_959s',{yetiEnabled:true}),null,'per-car selection isolated');equal(getRoadRoofLook(roof.profile,'falcone_f42'),null,'off selected look stays inactive');
  check(!equipRoadRoof(profile,'aurora_gt','yeti',{yetiEnabled:true}).ok,'unowned car rejected');check(!equipRoadRoof(other,'falcone_f42','yeti',{yetiEnabled:true}).ok,'unearned look rejected');
  const withChrome={...roof.profile,wasteland:{...roof.profile.wasteland,kits:{falcone_f42:{owned:['chrome-crown'],equipped:null,roofLook:null}}}};
  const chrome=equipArmorKit(withChrome,'falcone_f42','chrome-crown');check(chrome.ok);equal(getRoadRoofLook(chrome.profile,'falcone_f42',{yetiEnabled:true}),'chrome-crown');check(!chrome.profile.yeti.roof.falcone_f42,'Chrome clears the Yeti slot');
  const back=equipRoadRoof(chrome.profile,'falcone_f42','yeti',{yetiEnabled:true});equal(getEquippedRoofLook(back.profile,'falcone_f42'),null);equal(back.profile.wasteland.kits.falcone_f42.roofLook,null,'Yeti clears Chrome selection only');equal(back.profile.wasteland.kits.falcone_f42.owned,['chrome-crown'],'Chrome ownership retained');
  const gunnOwned={...back.profile,wasteland:{...back.profile.wasteland,warlords:{...back.profile.wasteland.warlords,gunn:{defeated:true}},
    kits:{falcone_f42:{...back.profile.wasteland.kits.falcone_f42,owned:['chrome-crown','turret-look']}}}};
  const turret=equipArmorKit(gunnOwned,'falcone_f42','turret-look');check(turret.ok);
  equal(getRoadRoofLook(turret.profile,'falcone_f42',{yetiEnabled:true}),null,'Turret selection clears this car Yeti roof');
  const fromTurret=equipRoadRoof(turret.profile,'falcone_f42','yeti',{yetiEnabled:true});check(fromTurret.ok);
  equal(fromTurret.profile.wasteland.kits.falcone_f42.equipped,null,'Yeti selection clears only zero-stat Turret');
  equal(fromTurret.profile.wasteland.kits.falcone_f42.owned,['chrome-crown','turret-look'],'both earned ownerships retained');
  const conflicting=normalizeProfile({...gunnOwned,wasteland:turret.profile.wasteland,yeti:{...gunnOwned.yeti,roof:{falcone_f42:'yeti'}}});
  check(!conflicting.yeti.roof.falcone_f42,'loaded malformed double roof retains Turret and rejects Yeti');
  equal(conflicting.wasteland.kits.falcone_f42.equipped,'turret-look','validated existing Turret remains selected on load');
  equal(getRoadRoofLook({...turret.profile,yeti:{...turret.profile.yeti,roof:{falcone_f42:'yeti'}}},'falcone_f42',{yetiEnabled:true}),null,'raw double roof is not rendered');
  const plated=normalizeProfile({...gunnOwned,yeti:{...gunnOwned.yeti,roof:{}},wasteland:{...gunnOwned.wasteland,kits:{...gunnOwned.wasteland.kits,
    falcone_f42:{...gunnOwned.wasteland.kits.falcone_f42,owned:['scrapper','chrome-crown','turret-look'],equipped:'scrapper',roofLook:'chrome-crown'}}}});
  const platedYeti=equipRoadRoof(plated,'falcone_f42','yeti',{yetiEnabled:true});check(platedYeti.ok);
  equal(platedYeti.profile.wasteland.kits.falcone_f42.equipped,'scrapper','Yeti leaves actual paid plating selected');
  equal(platedYeti.profile.wasteland.kits.falcone_f42.owned,['scrapper','chrome-crown','turret-look'],'Yeti retains all kit ownership');
  equal(platedYeti.profile.wasteland.kits.falcone_f42.roofLook,null,'Yeti clears the old roof while retaining paid plating');

  equal(PAINT_PRESETS.frost.appearance,{id:'frost',name:'Frost',color:0xdce8f0,metalness:.1,roughness:.55});
  check(paintPresetsFor(profile,'stuttgart_959s',{yetiEnabled:true}).some(p=>p.id==='frost'),'reward on every owned car');
  const painted=applyPaint(profile,'stuttgart_959s','frost',{yetiEnabled:true});check(painted.ok);equal(painted.cost,0);equal(painted.profile.credits,profile.credits);equal(getPaintAppearance(painted.profile,'stuttgart_959s',{yetiEnabled:true}).id,'frost');
  equal(getPaintAppearance(painted.profile,'stuttgart_959s'),null,'off paint restores factory appearance without deleting choice');equal(normalizeProfile(painted.profile).cosmetics.stuttgart_959s.selected,'frost');
  const storageBefore=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const cancelBefore=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
  const uuidBefore=Object.getOwnPropertyDescriptor(globalThis.crypto,'randomUUID');
  const startMemory=new Map();let starter;
  try{
    globalThis.localStorage={getItem:key=>startMemory.get(key)??null,setItem:(key,value)=>startMemory.set(key,String(value)),removeItem:key=>startMemory.delete(key)};
    globalThis.cancelAnimationFrame??=()=>{};
    starter=new App();starter.duel.featureFlags=flags();starter.profile={...starter.profile,credits:4000};starter._saveProfile();
    check(starter.purchaseCourse('summit-run').ok);
    const reachGo=()=>{
      for(let tick=0;tick<120*10&&starter.duel.state.status==='countdown';tick++)starter.advance(1/120,1/120);
      equal(starter.duel.state.status,'racing','actual native start sequence reaches GO');starter.advance(1/120,1/120);
    };
    for(const mode of ['duel','timetrial','timeattack','grandprix']){
      Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:()=>`yeti-input-${mode}`});
      check(starter.startCampaign({startStage:summit,mode,seed:1989,car:'falcone_f42',fieldSeed:4242,tyre:'winter'}),'actual App start '+mode);
      const recorded=starter.duel.state;
      check(Number.isSafeInteger(recorded.yetiSeed),'actual '+mode+' start records a private Yeti input');
      equal(recorded.yetiSeed,hash32(1989,starter.runId),'actual App hashes the existing run identity');
      equal(recorded.seed,1989);equal(starter.duel.course.seed,1989,'authored geometry retains the base seed');
      const packet=JSON.parse(JSON.stringify({startStage:summit,seed:recorded.seed,yetiSeed:recorded.yetiSeed,
        mode,car:recorded.car,driverId:recorded.driverId,playerId:recorded.playerId,fieldSeed:4242,tyre:'winter',difficulty:recorded.difficulty,cpuDifficulty:recorded.cpuDifficulty}));
      const replay=new Duel({featureFlags:flags()});replay.startCampaign(packet);
      equal(replay.state.yeti,recorded.yeti,'serialized recorded input reproduces the encounter');
      const oldReplay=new Duel({featureFlags:flags()});const {yetiSeed,...oldPacket}=packet;oldReplay.startCampaign(oldPacket);
      check(!Object.hasOwn(oldReplay.state,'yetiSeed'),'old replay remains an absent-input shape');
      const projection=state=>{const {yeti,yetiSeed,...old}=state;return old;};
      equal(JSON.stringify(replay.course.features),JSON.stringify(oldReplay.course.features),'private input never changes scenery draws');
      for(let tick=0;tick<120;tick++){replay.setInput({throttle:1});oldReplay.setInput({throttle:1});replay.step(1/120);oldReplay.step(1/120);}
      equal(projection(replay.state),projection(oldReplay.state),'private input leaves actual driving/CPU/clock state exact');
      reachGo();
      equal(starter.profile.activeRace?.yetiSeed,recorded.yetiSeed,'actual saved active input retains private seed');
      const loaded=normalizeProfile(JSON.parse(JSON.stringify(starter.profile)));
      equal(loaded.activeRace.yetiSeed,recorded.yetiSeed,'input survives save normalization');
      if(mode==='grandprix')equal(loaded.activeRace.mode,'grandprix','saved GP cannot reload as Duel');
    }
    const sampleCourse=starter.duel.course;let distinct=0;
    for(let i=0;i<300;i++){
      const fixture={course:sampleCourse,seed:1989,state:{yetiSeed:hash32(1989,'yeti-run-'+i)},featureFlags:flags()};
      initializeYeti(fixture);if(fixture.state.yeti.appears)distinct++;
    }
    check(distinct>=75&&distinct<=125,'distinct recorded run identities give approximately one third');
    console.log(`Yeti recorded-run sample: ${distinct}/300 appearances at unchanged base seed 1989.`);
    const legacyInput=game();for(const value of [null,NaN,-1,0x100000000,'1',1.5]){
      const invalid=new Duel({featureFlags:flags()});invalid.startCampaign({startStage:summit,seed:1989,yetiSeed:value});
      check(!Object.hasOwn(invalid.state,'yetiSeed'),'malformed private input remains absent');
      equal(invalid.state.yeti,legacyInput.state.yeti,'malformed/old input uses the original base-seed draw');
    }
    const zeroInput=new Duel({featureFlags:flags()});zeroInput.startCampaign({startStage:summit,seed:1989,yetiSeed:0});equal(zeroInput.state.yetiSeed,0,'zero is a valid recorded input');
    const foreignInput=new Duel({featureFlags:flags()});foreignInput.startCampaign({startStage:0,seed:1989,yetiSeed:7});check(!Object.hasOwn(foreignInput.state,'yetiSeed'),'other courses do not retain Yeti input');
    for(const career of [false,true]){
      starter.dispose();startMemory.clear();starter=new App();
      starter.duel.featureFlags=createFeatureFlags({storage:null,overrides:{yeti:true,'summit-run':true,'grand-prix':true,'grand-prix-career':career}});
      starter.profile={...starter.profile,credits:4000};starter._saveProfile();check(starter.purchaseCourse('summit-run').ok);
      Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:()=>`yeti-reload-${career}`});
      check(starter.startCampaign({startStage:summit,mode:'grandprix',car:'falcone_f42',fieldSeed:4242}));reachGo();
      const pending=starter.profile.activeRace,credits=starter.profile.credits,history=starter.profile.history;
      equal(pending.mode,'grandprix');check(Number.isSafeInteger(pending.yetiSeed));
      const reloaded=new App();
      try{equal(reloaded.profile.activeRace,null,'actual cold memory reload clears tagged GP');equal(reloaded.profile.credits,credits,'GP recovery creates no charge or award');equal(reloaded.profile.history,history,'GP recovery creates no ordinary history');equal(reloaded.interruptedRaceCharge,0);check(!Object.hasOwn(reloaded.profile,'yeti'),'interruption never creates sighting ledger');}finally{reloaded.dispose();}
      starter._refreshPlayer();Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:()=>`yeti-abandon-${career}`});
      check(starter.startCampaign({startStage:summit,mode:'grandprix',car:'falcone_f42',fieldSeed:4242}));reachGo();
      starter._settleAbandoned();equal(starter.profile.activeRace,null,'actual GP abandonment clears only its own record');equal(starter.profile.credits,credits,'GP abandonment grants no new charge/award');check(!Object.hasOwn(starter.profile,'yeti'));
      for(const patch of [{yetiSeed:-1},{yetiSeed:0x100000000},{yetiSeed:undefined},{stageId:COURSE[0].id},{stageId:undefined},{stageId:'unavailable-summit'},{stageId:17}])
        equal(normalizeProfile({...starter.profile,activeRace:{...pending,...patch}}).activeRace,null,'malformed or other-course GP marker is rejected');
      const moved=normalizeProfile({...starter.profile,activeRace:{...pending,stageIndex:0}}).activeRace;
      equal(moved.stageIndex,summit,'saved stable course identity wins over a moved position');equal(moved.mode,'grandprix','stable identity normalization never strips GP mode');
      const unavailable=COURSE.splice(summit,1)[0];
      try{equal(normalizeProfile({...starter.profile,activeRace:pending}).activeRace,null,'unavailable Summit drops the GP input instead of reclassifying another course');}
      finally{COURSE.splice(summit,0,unavailable);}

      starter.duel.featureFlags=createFeatureFlags({storage:null,overrides:{yeti:false,'summit-run':true,'grand-prix':true,'grand-prix-career':career}});
      check(starter.startCampaign({startStage:summit,mode:'grandprix',car:'falcone_f42',fieldSeed:4242}));reachGo();
      check(!Object.hasOwn(starter.duel.state,'yetiSeed'));equal(starter.profile.activeRace,null,'off GP retains original no-active-record path');
    }
  }finally{
    try{starter?.dispose();}finally{
      if(storageBefore)Object.defineProperty(globalThis,'localStorage',storageBefore);else delete globalThis.localStorage;
      if(cancelBefore)Object.defineProperty(globalThis,'cancelAnimationFrame',cancelBefore);else delete globalThis.cancelAnimationFrame;
      if(uuidBefore)Object.defineProperty(globalThis.crypto,'randomUUID',uuidBefore);else delete globalThis.crypto.randomUUID;
    }
  }
  const duel=game(),course=duel.course,sites=yetiSites(course),oldObstacles=JSON.stringify(course.features.obstacles),oldTrees=JSON.stringify(course.features.trees);
  equal(sites.length,3);check(sites.every(site=>Math.abs(site.lateral)>=25&&Math.abs(site.lateral)<=40));
  let appearances=0;const selected=new Set();for(let seed=1;seed<=300;seed++){
    const fixture={course,seed,state:{},featureFlags:flags()};initializeYeti(fixture);if(fixture.state.yeti.appears){appearances++;selected.add(JSON.stringify(fixture.state.yeti.site));}
  }
  check(appearances>=75&&appearances<=125,'isolated seeded approximately one third');equal(selected.size,3,'all three authored ridge sites used');
  // Existing-style controlled visibility geometry; the actual Course/ground sampler is still used.
  let visiblePose=null;
  for(const site of sites){visiblePose=null;duel.state.yeti={appears:true,site,seen:false,seenAt:null};
    for(const lead of [40,30,20,10]){duel.state.s=site.s-lead;duel.state.lateral=0;duel.state.headingError=0;if(yetiVisible(duel)){visiblePose={s:duel.state.s,site};break;}}
    check(visiblePose,'actual authored ridge has a reachable clear forward sightline');
  }
  duel.state.yeti={appears:true,site:visiblePose.site,seen:false,seenAt:null};duel.state.s=visiblePose.s;duel.state.headingError=0;
  check(yetiVisible(duel));duel.state.headingError=Math.PI;check(!yetiVisible(duel),'rearward target outside 75 degrees');duel.state.headingError=0;
  const eye=course.groundAt(duel.state.s,0),target=course.groundAt(visiblePose.site.s,visiblePose.site.lateral);
  const distance=Math.hypot(target.x-eye.x,target.z-eye.z,target.y+1.8-eye.y-1.2);
  const ray=course.nearest(eye.x+(target.x-eye.x)*2/distance,eye.z+(target.z-eye.z)*2/distance,
    duel.state.s+(visiblePose.site.s-duel.state.s)*2/distance);
  const groundAt=course.groundAt;course.groundAt=function(s,off){const point=groundAt.call(this,s,off);if(Math.abs(s-ray.s)<1e-7&&Math.abs(off-ray.lateral)<1e-7)point.y+=100;return point;};
  try{check(!yetiVisible(duel),'actual terrain at first 2 m ray sample occludes');}finally{course.groundAt=groundAt;}
  const wall={x:(eye.x+target.x)/2,z:(eye.z+target.z)/2,y:Math.min(eye.y,target.y)-2,minY:Math.min(eye.y,target.y)-2,maxY:Math.max(eye.y,target.y)+8,halfX:3,halfZ:3,heading:0,shape:'box'};
  course.features.obstacles.push(wall);check(!yetiVisible(duel),'actual solid sweep occludes chest ray');course.features.obstacles.pop();
  const events=[];duel.onChange((_s,ev)=>{if(ev.yetiSighting)events.push(ev.yetiSighting);});duel.step(1/120);check(duel.state.yeti.seen);equal(events.length,1);equal(duel.state.callout,'YETI!');duel.step(1/120);equal(events.length,1,'one roar/callout');
  equal(JSON.stringify(course.features.obstacles),oldObstacles);equal(JSON.stringify(course.features.trees),oldTrees,'no scenery RNG or collider changes');
  const off=game(false);check(!Object.hasOwn(off.state,'yeti'));const a=game(true,0,6),b=game(false,0,6);for(let n=0;n<60;n++){a.step(1/120);b.step(1/120);}equal(a.state,b.state,'unrelated off/on state bytes exact');
  duel._loadStage(summit);check(!duel.state.yeti.seen,'restart clears encounter without granting it');
  const owned=purchaseCourse({...createProfile(),credits:4000},'summit-run').profile;
  const gp=game();gp.state.mode='grandprix';gp.state.playerId='player-1';gp.state.yeti.seen=true;
  gp.state.results={...payload(),stageTimeSec:420};gp.state.completedLaps=1;
  let saves=0;const app=Object.create(App.prototype);Object.assign(app,{duel:gp,profile:owned,player:{id:'player-1'},
    _runPlayerId:'player-1',runId:'app-yeti',_stageStartCrashes:0,_switches:()=>createFeatureFlags({storage:null,overrides:{yeti:true,'summit-run':true,'grand-prix':true,'grand-prix-career':false}}),_refreshPlayer(){},_saveProfile(){saves++;return true;}});
  App.prototype._settleResult.call(app,gp.state.results,gp.state);equal(saves,1,'real App persists GP career-off sighting');equal(app.profile.yeti.sightings,1);equal(app.profile.credits,owned.credits);equal(app.profile.history,owned.history);equal(app.profile.personalBests,owned.personalBests);
  App.prototype._settleResult.call(app,gp.state.results,gp.state);equal(saves,1,'duplicate App result cannot write/count again');
  const legacyGp=Object.create(App.prototype);Object.assign(legacyGp,{duel:gp,profile:owned,player:{id:'player-1'},
    _runPlayerId:'player-1',runId:'legacy-gp',_switches:()=>createFeatureFlags({storage:null,overrides:{yeti:false,'summit-run':true,'grand-prix':true,'grand-prix-career':false}}),_refreshPlayer(){throw Error('legacy GP early return must not refresh');}});
  App.prototype._settleResult.call(legacyGp,gp.state.results,gp.state);check(legacyGp.profile===owned,'legacy GP with no pending input keeps identical profile');

  app.player={id:'player-2'};app.runId='foreign';App.prototype._settleResult.call(app,gp.state.results,gp.state);equal(saves,1,'foreign named player cannot persist');
  const finished=game();finished.state.yeti.seen=true;finished.state.s=finished.raceLength;finished.state.completedLaps=1;finished.state.stageTimeSec=420;finished._finishStage();equal(finished.state.results.yetiSeen,true,'actual ordinary finish forwards sighting');
  const gpFinish=game(true,summit,1989,'grandprix');gpFinish.state.yeti.seen=true;
  gpFinish.state.s=gpFinish.raceLength;gpFinish.state.completedLaps=1;gpFinish.state.stageTimeSec=420;gpFinish.state.lapStartedAt=420;
  gpFinish._finishStage();equal(gpFinish.state.results.yetiSeen,true,'actual native GP finish forwards sighting');equal(gpFinish.state.results.fieldSize,6);
  const audio=Object.create(EngineAudio.prototype),requested=[];let enabled=false;
  Object.assign(audio,{flags:{enabled:name=>name==='summit-run'||name==='yeti'&&enabled},cueBuffers:{},context:{decodeAudioData:async()=>({}),state:'running'},muted:false,paused:false});
  const fetchBefore=globalThis.fetch;globalThis.fetch=async url=>{requested.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
  try{await audio._loadCueBuffers();requested.length=0;enabled=true;await audio._loadCueBuffers();equal(requested,['/assets/audio/'+SOUND_BANK['yeti.roar'].file],'late Yeti loads only existing roar with GP off');}finally{globalThis.fetch=fetchBefore;}
  const played=[];Object.assign(audio,{_syncMixer(){},_runCue(id){played.push(id);return{};},fightVoices:{event(){},mute(){},clear(){}},activeShots:[],_volume(){},_clearGrandPrixVoices(){},_clearProjectiles(){},_clearArsenalFields(){},_stopHiddenRoadVoices(){},_grandPrixEvent(){},_spatialOutput(){return{level:{},disconnect(){}};}});
  const event={yetiSighting:{id:'yeti-'+finished.seed,cue:'yeti.roar',point:course.groundAt(sites[0].s,sites[0].lateral)}},audioState={...finished.state,status:'racing'};
  audio.event(event,audioState,course);audio.event(event,audioState,course);equal(played,['yeti.roar'],'existing roar once with GP off');audio._playCue('race.start.light');equal(played.length,1,'other GP cue remains off');
  played.length=0;delete audio.cueBuffers['yeti.roar'];let finishLoad;audio._loadCueBuffers=()=>new Promise(resolve=>finishLoad=resolve);audio._yetiAudioHits=new Set();audio.event(event,audioState,course);
  audio._snowmanAudioStage=(audio._snowmanAudioStage??0)+1;audio.cueBuffers['yeti.roar']={};finishLoad();await Promise.resolve();equal(played,[],'existing reset/pause/mute epoch prevents late roar');
  // Same headless texture convention as existing track-kit tests; geometry only, no look claim.
  const parser=new GLTFLoader();parser.register(()=>({name:'P4_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const loaded=[],load=async path=>{const bytes=readFileSync(new URL('../public'+path,import.meta.url));const model=await parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');loaded.push(model);return model;};
  const assets=createYetiAssets({loadAsset:load});await assets.load();equal(assets.status,'ready',assets.error);
  for(const model of loaded){equal(model.animations.map(clip=>clip.name).sort(),['chest-beat','idle','lope','roar','walk-off']);const bones=new Set();model.scene.traverse(node=>{if(node.isSkinnedMesh)for(const bone of node.skeleton.bones)bones.add(bone);});equal(bones.size,43,'actual accepted high/LOD rig');}
  const mini=createYetiRoof(assets);const box=new THREE.Box3().setFromObject(mini.group,true);check(Math.abs(box.max.y-box.min.y-.45)<1e-6,'real posed LOD roof is .45 m');mini.dispose();
  for(const car of Object.keys(CARS)){check(vehicleSocketLayout(car,{width:2,length:4,height:1.5}).roof.every(Number.isFinite),'every actual car roof socket');}
  const view=createYetiView(assets),state={status:'racing',stageTimeSec:1,yeti:{appears:true,site:sites[0],seen:false,seenAt:null}},snapshot=JSON.stringify(state);
  view.update(state,course,true);view.update(state,course,false);for(const age of [0,2,4,7])view.update({...state,stageTimeSec:age,yeti:{...state.yeti,seen:true,seenAt:0}},course,true);equal(JSON.stringify(state),snapshot,'model update never advances sighting');
  // Real accepted High/LOD feet on the authored slope: one contact, no floating foot.
  for(const high of [true,false])for(const age of [null,.05,1.8,3.6,6.1]){
    const observed={...state,stageTimeSec:age??1,yeti:{...state.yeti,seen:age!==null,seenAt:age===null?null:0}};
    const before=JSON.stringify(observed);view.update(observed,course,high);
    const actor=view.group.children.find(child=>child.visible),gaps=new Map();
    const bonePoint=new THREE.Vector3(),vertex=new THREE.Vector3();
    actor.traverse(mesh=>{
      if(!mesh.isSkinnedMesh)return;
      const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
      for(const name of ['FootL','FootR']){
        const joint=mesh.skeleton.bones.findIndex(bone=>bone.name===name);if(joint<0)continue;
        let low=Infinity,count=0;
        for(let index=0;index<weights.count;index++)for(let part=0;part<4;part++){
          if(indices.getComponent(index,part)!==joint||weights.getComponent(index,part)<=.25)continue;
          mesh.getVertexPosition(index,vertex).applyMatrix4(mesh.matrixWorld);low=Math.min(low,vertex.y);count++;break;
        }
        if(!count)continue;
        mesh.skeleton.bones[joint].getWorldPosition(bonePoint);
        const nearest=course.nearest(bonePoint.x,bonePoint.z,state.yeti.site.s),ground=course.groundAt(nearest.s,nearest.lateral);
        const height=renderedGroundHeight(course,{x:bonePoint.x,z:bonePoint.z,y:ground.y},{requireSurface:true});
        check(Number.isFinite(low)&&Number.isFinite(height),'actual skinned foot and drawn terrain exist');
        gaps.set(name,Math.min(gaps.get(name)??Infinity,low-height));
      }
    });
    check(gaps.has('FootL')&&gaps.has('FootR'),'both actual accepted feet are observed');
    check([...gaps.values()].every(gap=>gap<=1e-6),'neither actual foot floats above the rendered snow');
    check([...gaps.values()].some(gap=>Math.abs(gap)<=1e-6),'one actual foot retains terrain contact');
    equal(JSON.stringify(observed),before,'slope seating does not advance the native race');
  }
  // The same option also reaches both actual accepted GLB qualities.
  const donorMaterials=new Set();for(const model of loaded)model.scene.traverse(node=>{for(const material of [node.material].flat().filter(Boolean))donorMaterials.add(material);});
  const donorColours=new Map([...donorMaterials].filter(m=>m.color).map(m=>[m,m.color.toArray()]));
  const tintedView=createYetiView(assets,{furTint:new THREE.Color(1.8,1.8,1.8)});
  for(const high of [true,false])tintedView.update(state,course,high);
  let actualFur=0;tintedView.group.traverse(node=>{
    for(const material of [node.material].flat().filter(Boolean)){
      if(material.name==='round-two-yeti-matted-ivory'){
        actualFur++;check(!donorMaterials.has(material),'accepted High/LOD fur is private');equal(material.color.toArray(),[1.8,1.8,1.8]);
      }else check(donorMaterials.has(material),'accepted non-fur material remains shared and exact');
    }
  });check(actualFur>=4,'accepted High and LOD body/shag fur surfaces use the option');
  for(const [material,colour] of donorColours)equal(material.color.toArray(),colour,'accepted donor colour remains exact');
  tintedView.dispose();
  view.dispose();
  const source=await load('/assets/models/wasteland/kits/falcone_f42.glb'),clone=cloneChromeCrown(source.scene,{privateMaterials:true});check(clone);
  let originalGeometry;source.scene.getObjectByName('kit-crown').traverse(node=>{if(node.geometry&&!originalGeometry)originalGeometry=node.geometry;});check(originalGeometry,'actual Crown mesh geometry');const positionBytes=Array.from(originalGeometry.attributes.position.array);
  clone.spikes.traverse(node=>{if(node.material?.color)node.material.color.setHex(0xff0000);});equal(Array.from(originalGeometry.attributes.position.array),positionBytes,'Chrome clone leaves accepted source vertices exact');clone.dispose();clone.dispose();
  let sourceDisposals=0;originalGeometry.addEventListener('dispose',()=>sourceDisposals++);
  const attachments=createVehicleAttachmentRegistry();let resolveKit,requests=0;const owner=createRoadRoofOwner(attachments,{yetiAssets:assets,loadAsset:()=>{requests++;return new Promise(resolve=>resolveKit=resolve);}});
  const vehicle=()=>{const mesh=new THREE.Group();mesh.userData={vehicleKey:'falcone_f42',size:{width:2,length:4,height:1.5}};return mesh;};
  const car1=vehicle(),car2=vehicle();owner.select(car1,'chrome-crown');await Promise.resolve();equal(requests,1);owner.select(car2,'yeti');resolveKit(source);await new Promise(resolve=>setImmediate(resolve));equal(attachments.size,1,'stale Crown cannot replace current seated Yeti');check(car2.getObjectByName('Yeti roof look'));check(!car1.getObjectByName('Chrome Crown road look'));owner.dispose();equal(attachments.size,0);equal(sourceDisposals,1,'late stale private source released exactly once');
  const combatSource=await load('/assets/models/wasteland/kits/falcone_f42.glb'),combatAttachments=createVehicleAttachmentRegistry(),combatCar=vehicle();
  const combatKit=createArmorKitMeshes(combatAttachments,{loadKitAsset:async()=>combatSource});
  const combatState={mode:'wasteland',status:'racing',combat:{},wastelandGateDiscovered:true,opponents:[],
    combatRoofLook:'chrome-crown',combatArmorKit:null,armor:100,maxArmor:100,stageTimeSec:0};
  const beforeCombat=JSON.stringify(combatState);combatKit.update({state:combatState},{player:combatCar},false);
  await new Promise(resolve=>setImmediate(resolve));combatKit.update({state:combatState},{player:combatCar},false);
  const combatSpikes=combatCar.getObjectByName('chrome-crown-spikes');check(combatSpikes?.visible,'unchanged combat Crown remains visible');
  equal(JSON.stringify(combatState),beforeCombat,'shared clone helper never changes combat stats');combatKit.dispose();assets.dispose();
}finally{COURSE.splice(length);}
console.log(`Yeti: ${checks} controlled simulation, settlement and actual-model checks passed; native grounding/look/audio remain pending.`);
