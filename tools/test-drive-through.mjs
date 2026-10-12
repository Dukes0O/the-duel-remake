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
    const report=await api.runDriveThrough({courseId:'tremblant-woods',seed:1989,sourceRoot,sourceCommit:before});
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
