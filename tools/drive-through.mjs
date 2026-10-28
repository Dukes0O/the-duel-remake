// Native one-lap observations and the existing measured circuit defect probes.
import {readFileSync, existsSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve, relative, isAbsolute, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {checkGround,roadTriangles,drawnHeight,barrierCases,barrierFace,observeBarrierPassages} from './course-ground-checks.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const PROFILE=Object.freeze({car:'falcone_f42',driverId:'club',difficulty:'casual',skill:.95,fps:60,opponentCount:1,storage:'memory-only'});
const SOLID_IDS=['armco','tyre-wall','catch-fence','concrete-wall','pit-wall','pit-garage','grandstand','marshal-post','chairlift-tower'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function memoryStorage(){
  const rows=new Map();return{get length(){return rows.size;},key:i=>[...rows.keys()][i]??null,
    getItem:key=>rows.get(String(key))??null,setItem:(key,value)=>rows.set(String(key),String(value)),
    removeItem:key=>rows.delete(String(key)),clear:()=>rows.clear()};
}
function validatedRoot(sourceRoot){
  const path=resolve(sourceRoot??ROOT),part=relative(resolve(ROOT),path);
  if(part!==''&&(!part.startsWith('.qa-dist'+(process.platform==='win32'?'\\':'/'))||part.split(/[\\/]/)[1]?.startsWith('fac08-history-')!==true||isAbsolute(part)))
    throw Error('Source root must be this checkout or its owned historical fixture.');
  const actual=realpathSync(path),owner=realpathSync(ROOT),actualPart=relative(owner,actual);
  if(actualPart!==''&&(!actualPart.startsWith('.qa-dist'+(process.platform==='win32'?'\\':'/'))||
    actualPart.split(/[\\/]/)[1]?.startsWith('fac08-history-')!==true||isAbsolute(actualPart)))
    throw Error('Source root redirects outside this checkout or its owned historical fixture.');
  return actual;
}
async function loadRuntime(sourceRoot){
  const module=path=>import(pathToFileURL(join(sourceRoot,path)).href);
  if(existsSync(join(sourceRoot,'src/circuit-manifests.js'))){
    const {CIRCUIT_MANIFESTS}=await module('src/circuit-manifests.js');
    globalThis.location={search:'?flags='+CIRCUIT_MANIFESTS.map(row=>row.flag).join(',')};
  }
  const[{App},{Course},config,registry,surfaces,effects,hills,rendered,collision,driver]=await Promise.all([
    module('src/app.js'),module('src/course.js'),module('src/config.js'),module('src/circuits/index.js'),
    module('src/world-surfaces.js'),module('src/circuit-effects.js'),module('src/circuit-hills.js'),
    module('src/rendered-ground.js'),module('src/collision.js'),module('tools/track-script-drive.mjs')]);
  let footprints;
  if(existsSync(join(sourceRoot,'src/kit-footprints.js')))footprints=(await module('src/kit-footprints.js')).KIT_FOOTPRINTS;
  else{
    const manifest=JSON.parse(readFileSync(join(sourceRoot,'public/assets/models/circuits/kits/manifest.json'),'utf8'));
    footprints=Object.fromEntries(manifest.pieces.filter(row=>SOLID_IDS.includes(row.id)).map(row=>[row.id,{width:row.size[0],height:row.size[1],depth:row.size[2]}]));
  }
  const kits=existsSync(join(sourceRoot,'src/track-kits.js')) ? await module('src/track-kits.js') : null;
  const tyres=existsSync(join(sourceRoot,'src/race-surfaces.js')) ? await module('src/race-surfaces.js') : null;
  return{App,Course,config,registry,surfaces,effects,hills,rendered,collision,driver,footprints,kits,tyres};
}
function startNative(runtime,def,seed,cpuDifficulty,tyre){
  const {App,config}=runtime,app=new App();
  let startStage=config.COURSE.findIndex(row=>row.id===def.id);
  if(startStage<0)throw Error('Selected circuit switch was not enabled before native imports.');
  app._refreshPlayer();app.seed=seed;app.cpuDifficulty=cpuDifficulty;
  app.duel.startCampaign({mode:'duel',car:PROFILE.car,difficulty:PROFILE.difficulty,cpuDifficulty,
    driverId:PROFILE.driverId,startStage,seed,opponentCount:PROFILE.opponentCount,playerId:app.player.id,upgrades:{},...(tyre?{tyre}:{})});
  app.autopilot=true;app._scriptedCrashDone=true;
  if(app.duel.course.racingLine)runtime.driver.useRacingLine(app,PROFILE.skill);
  return app;
}
function centre(duel){return duel.course.worldAt(duel.state.s,duel.state.lateral);}
function observeLap(runtime,def,seed,cpuDifficulty,maxSeconds,road,tyre){
  globalThis.localStorage=memoryStorage();
  const app=startNative(runtime,def,seed,cpuDifficulty,tyre),duel=app.duel,state=duel.state,issues=[];
  const found=new Set();let previous=null;
  const entries=new Map(),boxes=duel.course.features.obstacles.filter(row=>row.barrier||row.kitSolid);
  const original=duel.step.bind(duel);
  duel.step=dt=>{
    original(dt);
    if(state.status!=='racing')return;
    const point=centre(duel);
    const record=(kind,extra={})=>{if(!found.has(kind)){found.add(kind);issues.push({kind,cpuDifficulty,s:state.s,lateral:state.lateral,...extra});}};
    if(!duel.course.surfaceAt(state.s,state.lateral).road)record('off-road',{surface:'native'});
    if(!state.airborne&&drawnHeight(road,point.x,point.z)===null)record('off-road',{surface:'drawn triangles'});
    if(previous&&!state.airborne){
      for(const box of observeBarrierPassages(previous,point,boxes,runtime.collision,entries))
        record('solid-barrier-passage',{boxId:box.id??box.kind??'barrier'});
    }else if(state.airborne)entries.clear();
    previous=point;
  };
  const maxFrames=Math.ceil(maxSeconds*PROFILE.fps);
  for(let frame=0;frame<maxFrames&&state.completedLaps<1&&['countdown','racing','ticket'].includes(state.status);frame++)
    app.advance(1/PROFILE.fps,1/PROFILE.fps);
  const observedLap=state.completedLaps>=1||(!duel.course.closed&&['stage_result','complete'].includes(state.status)&&state.s>=duel.course.length);
  if(!observedLap)issues.push({kind:'unfinished-lap',cpuDifficulty,seconds:state.stageTimeSec,status:state.status});
  return{cpuDifficulty,observedLap,completedLaps:state.completedLaps,nativeLapsTotal:state.lapsTotal,
    seconds:state.stageTimeSec,status:state.status,issues};
}
function contactProbe(runtime,def,seed,name,s,side,mph,footprints){
  globalThis.localStorage=memoryStorage();
  const app=startNative(runtime,def,seed,'medium'),duel=app.duel,state=duel.state;
  for(let frame=0;state.status!=='racing'&&frame<2000;frame++)app.advance(1/60,1/60);
  if(state.status!=='racing')throw Error('Native barrier probe did not reach racing.');
  const half=at=>duel.course.roadHalfWidthAt(at),{id,gap}=barrierFace(duel.course,s,side,footprints);
  Object.assign(state,{s,lateral:side*(half(s)-3),headingError:side*.3,speedMph:mph,airborne:false,airHeight:0,_jumpY:null,_verticalSpeed:0});
  state.prevS=state.s;state.prevLateral=state.lateral;duel._terrainPose();
  duel.setInput({throttle:1,brake:0,steer:0,boost:false});
  let farthest=-Infinity,firstContact=null;
  const originalContact=duel._staticContacts;
  duel._staticContacts=function(car,player,...args){
    if(player&&!firstContact){
      const oldS=car.prevS??car.s,oldLateral=car.prevLateral??car.lateral;
      const before=this.course.worldAt(oldS,oldLateral),after=this.course.worldAt(car.s,car.lateral);
      if(car.airborne||car.airHeight>0||car.prevAirHeight>0||car.groundHeight!=null){
        before.y=(car.prevGroundHeight??this.course.groundAt(oldS,oldLateral).y)+(car.prevAirHeight??car.airHeight??0);
        after.y=(car.groundHeight??this.course.groundAt(car.s,car.lateral).y)+(car.airHeight||0);
      }else before.y=after.y=undefined;
      const heading=this.course.at(car.s).heading+(car.headingError||0)+(car.dir<0?Math.PI:0)+(car.slipAngle||0);
      const dimensions={...this._vehicleSpec(car),useModelBounds:!!(car.airborne||car.airHeight>0||car.prevAirHeight>0)};
      let hit=null;
      for(const obstacle of this._obstacles(oldS,car.s)){
        if(this._brokenSnowmanIds?.has(obstacle.snowmanId)||this._brokenSceneryIds?.has(obstacle.id))continue;
        const start=obstacle.verticalClearance&&!Number.isFinite(before.y)?{...before,
          y:(car.prevGroundHeight??this.course.groundAt(oldS,oldLateral).y)+(car.prevAirHeight??car.airHeight??0)}:before;
        const end=obstacle.verticalClearance&&!Number.isFinite(after.y)?{...after,
          y:(car.groundHeight??this.course.groundAt(car.s,car.lateral).y)+(car.airHeight||0)}:after;
        const candidate=runtime.collision.sweepObstacle(start,end,obstacle,heading,dimensions);
        if(candidate&&(!hit||candidate.t<hit.t))hit=candidate;
      }
      if(hit){
        const centre={x:before.x+(after.x-before.x)*hit.t,z:before.z+(after.z-before.z)*hit.t};
        const at=this.course.nearest(centre.x,centre.z,car.s);
        const face=barrierFace(this.course,at.s,side,footprints,{centre,heading,
          halfWidth:dimensions.halfWidth,halfLength:dimensions.halfLength,
          normal:{x:hit.nx,z:hit.nz},obstacleId:hit.obstacle.id});
        firstContact={...face,contactKind:hit.obstacle.kind,contactBarrier:!!(hit.obstacle.barrier||hit.obstacle.tunnelWall),
          seconds:state.stageTimeSec,contactS:at.s,contactLateral:at.lateral};
      }
    }
    return originalContact.call(this,car,player,...args);
  };
  try{
    for(let frame=0;frame<240;frame++){
      duel.step(1/60);farthest=Math.max(farthest,side*state.lateral-half(state.s));
      if(firstContact||state.impactTimer>0)break;
    }
    const reachedEdge=farthest>0,limit=gap-.5;
    return{name,s,side,mph,id,gap,farthest,limit,reachedEdge,firstContact,
      bodyFaceGap:firstContact?.bodyFaceGap??null,
      passed:!!firstContact?.contactBarrier&&Number.isFinite(firstContact.bodyFaceGap)&&
        firstContact.bodyFaceGap<=.15&&firstContact.bodyFaceGap>=-.30};
  }finally{
    duel._staticContacts=originalContact;
    app.dispose?.();
  }
}
export async function runDriveThrough({courseId,seed=1989,maxSeconds=1200,sourceRoot,sourceCommit}={}){
  if(typeof courseId!=='string'||!/^[a-z][a-z0-9-]*$/.test(courseId))throw Error('A named course id is required.');
  if(!Number.isSafeInteger(seed)||seed<0||!Number.isFinite(maxSeconds)||maxSeconds<0)throw Error('Invalid seed or time cap.');
  sourceRoot=validatedRoot(sourceRoot);
  const historical=relative(realpathSync(ROOT),sourceRoot)!=='';
  if(historical&&(typeof sourceCommit!=='string'||!/^[a-f0-9]{40}$/i.test(sourceCommit)))
    throw Error('Historical source root needs its proven source commit.');
  const sourceRef=sourceCommit??'HEAD';
  const proven=spawnSync('git',['rev-parse','--verify',sourceRef+'^{commit}'],
    {cwd:ROOT,encoding:'utf8',windowsHide:true});
  if(proven.status!==0||!/^[a-f0-9]{40}$/.test(proven.stdout.trim()))
    throw Error('Cannot prove source commit: '+sourceRef);
  const sourceLabel=proven.stdout.trim();
  const names=['localStorage','__DUEL_QA__','location','cancelAnimationFrame'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  try{
    globalThis.localStorage=memoryStorage();globalThis.__DUEL_QA__=true;
    globalThis.location={search:'?flags='+courseId};globalThis.cancelAnimationFrame=()=>{};
    const runtime=await loadRuntime(sourceRoot),definitions=[...runtime.config.COURSE,...runtime.registry.ALL_CIRCUITS];
    const def=definitions.find(row=>row.id===courseId);
    if(!def)throw Error('Unknown course '+courseId);
    const course=new runtime.Course(def,seed),ground=checkGround(course,runtime),road=roadTriangles(course,runtime);
    // A course with snow or ice is driven on winter tyres, as a player sets up for it: summer tyres on packed snow
    // cannot turn a 16 m hairpin inside its 6 m road edge (their tightest circle is about 23 m).
    const tyre=runtime.tyres?.courseHasWinterSurfaces?.(course)?'winter':null;
    const laps=['easy','medium','hard'].map(cpu=>observeLap(runtime,def,seed,cpu,maxSeconds,road,tyre));
    const probes=[];
    for(const mph of[70,110])for(const[name,s,side]of barrierCases(course))
      probes.push(contactProbe(runtime,def,seed,name,s,side,mph,runtime.footprints));
    const issues=[...ground.issues,...laps.flatMap(row=>row.issues),...probes.filter(row=>!row.passed).map(row=>({kind:'barrier-passage',...row}))];
    const source={commit:sourceLabel,driverSha256:hash(readFileSync(join(sourceRoot,'tools/track-script-drive.mjs'))),
      courseSha256:hash(readFileSync(join(sourceRoot,'src/course.js'))),definitionSha256:def.kind==='circuit'?hash(readFileSync(join(sourceRoot,'src/circuits',courseId+'.js'))):null};
    return{schema:1,courseId,profile:{...PROFILE,seed,...(tyre?{tyre}:{})},source,passed:issues.length===0,ground,laps,probes,issues};
  }finally{
    for(const[name,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
}
export function parseArguments(args){
  const options={};
  for(let i=0;i<args.length;i++){
    const name=args[i];if(name==='--json'){options.json=true;continue;}
    const key={'--course':'courseId','--seed':'seed','--max-seconds':'maxSeconds','--source-root':'sourceRoot','--source-commit':'sourceCommit'}[name];
    if(!key)throw Error('Unknown option '+name);
    const value=args[++i];if(!value||value.startsWith('--'))throw Error('Missing value for '+name);
    options[key]=key==='seed'||key==='maxSeconds'?Number(value):value;
  }
  if(!options.courseId)throw Error('A named course is required.');return options;
}
export async function main(args=process.argv.slice(2)){
  try{
    const options=parseArguments(args),report=await runDriveThrough(options);
    console.log(options.json?JSON.stringify(report):report.courseId+': '+(report.passed?'PASS':'FAIL')+'; '+report.issues.length+' issues\n'+JSON.stringify(report.issues));
    return report.passed?0:1;
  }catch(error){console.error(error.message);return 2;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)process.exitCode=await main();
