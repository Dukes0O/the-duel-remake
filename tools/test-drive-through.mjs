import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, mkdir, symlink, unlink, realpath} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join, relative} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const before='5092a01865887432ce609be0eed942f60605a2ba';
const fix='977efad9fc720329243b40c1557859b5b433eea3';
const api=await import('./drive-through.mjs').catch(()=>null);

function printVerdict(label,report){
  console.log(JSON.stringify({label,profile:report.profile,source:report.source,passed:report.passed,
    laps:report.laps.map(row=>({cpuDifficulty:row.cpuDifficulty,seconds:row.seconds,completedLaps:row.completedLaps,nativeLapsTotal:row.nativeLapsTotal,issues:row.issues})),
    groundOverRoad:report.ground.issues.filter(row=>row.kind==='ground-over-road'),
    lodge:report.ground.issues.filter(row=>row.id==='ski-lodge'),
    barrierFailures:report.probes.filter(row=>!row.passed).map(row=>({name:row.name,mph:row.mph,farthest:row.farthest,limit:row.limit}))}));
}

function required(){assert.equal(typeof api?.runDriveThrough,'function','native drive-through API is missing');}

async function historical(run){
  const parent=spawnSync('git',['rev-parse',fix+'^'],{cwd:root,encoding:'utf8',windowsHide:true});
  assert.equal(parent.status,0,parent.stderr);assert.equal(parent.stdout.trim(),before,'actual fix first parent');
  await mkdir(join(root,'.qa-dist'),{recursive:true});
  const directory=await mkdtemp(join(root,'.qa-dist','fac08-history-'));
  let linked=false;
  try{
    const archive=join(directory,'source.tar');
    const call=spawnSync('git',['archive','--format=tar','--output='+archive,before,'src','package.json',
      'tools/track-script-drive.mjs','tools/blender/gunn-turret.json','public/assets/models/circuits/kits/manifest.json'],
      {cwd:root,encoding:'utf8',windowsHide:true});
    assert.equal(call.status,0,call.stderr);
    const unpack=spawnSync('tar',['-xf',archive,'-C',directory],{encoding:'utf8',windowsHide:true});
    assert.equal(unpack.status,0,unpack.stderr);
    const dependencies=await realpath(join(root,'node_modules'));
    await symlink(dependencies,join(directory,'node_modules'),'junction');linked=true;
    return await run(directory);
  }finally{
    if(linked)await unlink(join(directory,'node_modules'));
    assert.equal(process.platform,'win32','authorized Recycle Bin cleanup');
    assert.match(relative(join(root,'.qa-dist'),directory),/^fac08-history-[a-zA-Z0-9]+$/);
    const script='Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('+
      "'"+directory.replaceAll("'","''")+"'"+',[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)';
    const cleanup=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true});
    assert.equal(cleanup.status,0,cleanup.stderr);
  }
}

test('CLI rejects unknown courses/options and cannot select an outside source tree',async()=>{
  required();
  assert.throws(()=>api.parseArguments(['--course']),/course/i);
  assert.throws(()=>api.parseArguments(['--course','tremblant-woods','--jobs','8']),/option/i);
  await assert.rejects(()=>api.runDriveThrough({courseId:'missing-course'}),/Unknown course/);
  await assert.rejects(()=>api.runDriveThrough({courseId:'tremblant-woods',sourceRoot:'C:/Users/kyleb/dev/the-duel-remake'}),/source root/i);
});

test('actual fixed Tremblant passes one observed native lap per difficulty and real grounding/contact checks',async()=>{
  required();
  const report=await api.runDriveThrough({courseId:'tremblant-woods',seed:1989});
  printVerdict('fixed',report);
  assert.equal(report.passed,true,JSON.stringify(report.issues));
  assert.deepEqual(report.issues,[]);
  assert.deepEqual(report.laps.map(row=>row.cpuDifficulty),['easy','medium','hard']);
  for(const lap of report.laps){
    assert.equal(lap.completedLaps,1);assert.equal(lap.nativeLapsTotal,3,'native target stays intact');
    assert.equal(lap.observedLap,true);assert.ok(lap.seconds>0);assert.equal(lap.status,'racing','one observed lap is not a forged completed race');
  }
  assert.equal(report.profile.car,'falcone_f42');assert.equal(report.profile.driverId,'club');assert.equal(report.profile.skill,.95);
  assert.equal(report.profile.seed,1989);assert.equal(report.profile.storage,'memory-only');
  assert.equal(report.probes.length,16,'original eight sites at both actual speeds');
  assert.ok(report.probes.every(row=>row.reachedEdge&&row.passed));
  assert.ok(report.ground.roadSamples>0&&report.ground.objects>0);
  assert.match(report.source.driverSha256,/^[a-f0-9]{64}$/);
});

test('real pre-fix source exposes grass over road, drive-through barriers and floating lodge',async()=>{
  required();
  await historical(async sourceRoot=>{
    await assert.rejects(()=>api.runDriveThrough({courseId:'tremblant-woods',seed:1989,sourceRoot}),
      /Historical source root needs its proven source commit/,'missing provenance is rejected before native imports');
    await assert.rejects(()=>api.runDriveThrough({courseId:'tremblant-woods',seed:1989,sourceRoot,sourceCommit:'0'.repeat(40)}),
      /Cannot prove source commit/,'an unknown hash cannot label historical gameplay');
    assert.equal(api.parseArguments(['--course','tremblant-woods','--source-root',sourceRoot,'--source-commit',before]).sourceCommit,before);
    const report=await api.runDriveThrough({courseId:'tremblant-woods',seed:1989,sourceRoot,sourceCommit:before});
    printVerdict('actual-pre-fix',report);
    assert.equal(report.passed,false);
    assert.equal(report.source.commit,before);
    assert.ok(report.issues.some(row=>row.kind==='ground-over-road'&&row.over>.4),'real original grass overlap');
    assert.ok(report.issues.some(row=>row.kind==='barrier-passage'),'native original barrier passage');
    assert.ok(report.issues.some(row=>row.kind==='floating-object'&&row.id==='ski-lodge'),'real original floating barn/lodge');
    assert.ok(report.probes.some(row=>!row.passed&&row.farthest>row.limit));
    assert.equal(report.laps.length,3,'all difficulties retain their actual verdict');
  });
});

test('a genuine unfinished native observation is never reported green',async()=>{
  required();
  const report=await api.runDriveThrough({courseId:'tremblant-woods',seed:1989,maxSeconds:0});
  assert.equal(report.passed,false);
  assert.ok(report.laps.every(row=>!row.observedLap&&row.completedLaps===0));
  assert.equal(report.issues.filter(row=>row.kind==='unfinished-lap').length,3);
});


test('swept solid-barrier observer retains a crossing across multiple native steps',async()=>{
  required();
  const {observeBarrierPassages}=await import('./course-ground-checks.mjs');
  const collision=await import('../src/collision.js');
  assert.equal(typeof observeBarrierPassages,'function','multi-step passage observer missing');
  const box={id:'actual-box-envelope',shape:'box',x:0,z:0,heading:0,halfX:.4,halfZ:4,y:0,height:3};
  const points=[{x:-2,y:0,z:0},{x:-.2,y:0,z:0},{x:.2,y:0,z:0},{x:2,y:0,z:0}],entries=new Map(),hits=[];
  for(let i=1;i<points.length;i++)hits.push(...observeBarrierPassages(points[i-1],points[i],[box],collision,entries));
  assert.deepEqual(hits.map(row=>row.id),[box.id],'slow complete passage cannot disappear between steps');
  const backedOut=new Map();
  assert.deepEqual(observeBarrierPassages(points[0],points[1],[box],collision,backedOut),[]);
  assert.deepEqual(observeBarrierPassages(points[1],points[0],[box],collision,backedOut),[],'same-face return is not a complete through-passage');
});


test('a named dev circuit remains reachable after an earlier source import',async()=>{
  required();
  const report=await api.runDriveThrough({courseId:'panorama-ridge',seed:1989,maxSeconds:0});
  assert.equal(report.courseId,'panorama-ridge');
  assert.equal(report.laps.length,3);
  assert.ok(report.laps.every(row=>row.nativeLapsTotal===3&&!row.observedLap));
});


test('actual rotated F42 body reaches the visible kit face without centre-edge assumptions',async()=>{
  const [{Course},{HARBOUR_LIGHTS},{KIT_FOOTPRINTS},collision,{barrierFace}]=await Promise.all([
    import('../src/course.js'),import('../src/circuits/harbour-lights.js'),import('../src/kit-footprints.js'),
    import('../src/collision.js'),import('./course-ground-checks.mjs')]);
  const course=new Course(HARBOUR_LIGHTS,1989),index=HARBOUR_LIGHTS.kitPlacements.findIndex(row=>
    row.id==='concrete-wall'&&row.s>100&&row.s<400&&row.lateral>0);
  assert.ok(index>=0,'actual long Seafront lining exists');
  const row=HARBOUR_LIGHTS.kitPlacements[index],wall=course.features.walls.filter(value=>value.trackWall&&value.side===1).reduce((best,value)=>Math.abs(value.s-row.s)<Math.abs(best.s-row.s)?value:best);
  assert.ok(wall?.barrier,'actual named lining already carries barrier classification');
  const frame=course.at(row.s),normal={x:-Math.cos(frame.heading),z:Math.sin(frame.heading)};
  const point=course.groundAt(row.s,row.lateral),halfDepth=KIT_FOOTPRINTS[row.id].depth*(Array.isArray(row.scale)?row.scale[2]:row.scale??1)/2;
  const face={x:point.x+normal.x*halfDepth,z:wall.z};
  for(const angle of [0,10,17.1887338539,35,45,90]){
    const heading=frame.heading+angle*Math.PI/180,extent=1.02*Math.abs(Math.cos(heading-frame.heading))+2.35*Math.abs(Math.sin(heading-frame.heading));
    const start={x:face.x+normal.x*(extent+2),z:face.z+normal.z*(extent+2)};
    const end={x:face.x-normal.x*2,z:face.z-normal.z*2};
    const hit=collision.sweepObstacle(start,end,wall,heading,{halfWidth:1.02,halfLength:2.35});
    assert.ok(hit,'real collision shell contacts at angle '+angle);
    const centre={x:start.x+(end.x-start.x)*hit.t,z:start.z+(end.z-start.z)*hit.t};
    const report=barrierFace(course,row.s,1,KIT_FOOTPRINTS,{centre,heading,halfWidth:1.02,halfLength:2.35,normal:{x:hit.nx,z:hit.nz},obstacleId:wall.id});
    assert.ok(Number.isFinite(report.bodyFaceGap),'report actual rotated body gap at angle '+angle);
    assert.ok(report.bodyFaceGap<=.15&&report.bodyFaceGap>=-.30,'unchanged body-to-visible-face limits at angle '+angle);
    assert.equal(report.contactId,wall.id,'identify the real first contact');
  }
});
