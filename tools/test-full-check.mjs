import { assertNightFrameContext, summarizeNightFrames, reuseNightFrames, runNightFrames, prepareNightPlayer } from './scenarios/frame-pacing.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseNightArguments, nightPlan, validateFramePacket, validateTremblantFramePacket, runChild, runNight, heavyProcesses, createCheckCopy, removeCheckCopy } from './full-check.mjs';

const date = '2026-10-12', head = 'a'.repeat(40), previous = 'b'.repeat(40), merge = 'c'.repeat(40);
const root = 'C:/qa/the-duel-remake';
const report = quality => ({quality, course:'harbour-lights', cars:8, night:true,
  appRunning:true,rearView:'ready',countdownBefore:0,countdownAfter:2,frames:120, p95:18.5, worldBuildMs:999, constructionMs:999, headed:true, visible:true, memoryOnlySaves:true});
const frames = () => ({schema:1, mode:'night-simple', reports:[report('High'),report('Performance')]});
const full = () => ({schema:1,kind:'result',tier:'full',jobs:4,exitCode:0,passed:2,
  failures:[],notRun:0,total:2,results:[{label:'a',passed:true,exitCode:0},{label:'b',passed:true,exitCode:0}]});
const browser = () => ({schema:1,count:1,passed:1,failed:0,rows:[{name:'smoke-extra',passed:true}]});
function fixture({fail, missing, busy=false, change=false, copyChange=false, lastGreen=true, fullFailures=[],reportMutation=false,reportPatch={},otherMutation=false,partialFull=false,framePatch={},frameText,timingPatch={},timingMissing=false}={}) {
  const files = new Map(), committedFiles = new Map(), calls = [], logs = [], metadata = [], copies = [], messages = [];
  const copyRoot=root+'-copy/source',reportName='docs/board/checks/full-tier.json';
  const sourceReport='original copied report\n';
  files.set(copyRoot+'/'+reportName,sourceReport);
  let active=0, maximum=0, heads=0, invocations=0;
  let plan = nightPlan({date,root});
  if(lastGreen)files.set(`${root}/docs/board/checks/night-2026-10-11.json`,
    JSON.stringify({schema:1,status:'passed',source:previous,date:'2026-10-11'}));
  const deps = {root, print:message=>messages.push(message), now:()=>new Date('2026-10-12T20:00:00Z'),
    git:async (args,cwd=root)=>{
      if(cwd===copyRoot) {
        if(args[0]==='status')return [files.get(copyRoot+'/'+reportName)!==sourceReport?' M '+reportName:'',
          files.has(copyRoot+'/src/game.js')?' M src/game.js':''].filter(Boolean).join('\n');
        if(args[0]==='show'&&args[1]===head+':'+reportName)return sourceReport;
        if(args[0]==='branch')return '';
        return copyChange&&calls.length>0?'e'.repeat(40):head;
      }
      if(args[0]==='branch')return 'integration/wasteland';
      if(args[0]==='status') {
        if(args.includes('--')) {
          const name=args.at(-1),file=root+'/'+name;
          return files.get(file)===committedFiles.get(file)?'':(committedFiles.has(file)?' M ':'?? ')+name;
        }
        return '';
      }
      if(args[0]==='show') {const file=root+'/'+args[1].slice('HEAD:'.length);if(!committedFiles.has(file))throw Error('not in HEAD');return committedFiles.get(file);}
      if(args[0]==='rev-list')return merge+'\n';
      if(['add','commit','restore'].includes(args[0])) {
        metadata.push(args);
        if(args[0]==='commit')for(const name of args.slice(args.indexOf('--')+1))committedFiles.set(root+'/'+name,files.get(root+'/'+name));
        return '';
      }
      return change&&heads++>0?'d'.repeat(40):head;
    },
    createCopy:async source=>{copies.push(['create',source]);return {root:copyRoot,source};},
    removeCopy:async copy=>{
      if(files.get(copyRoot+'/'+reportName)!==sourceReport||files.has(copyRoot+'/src/game.js'))throw Error('Copy is changed; nonforced cleanup refused.');
      copies.push(['remove',copy.source]);
    },
    makeTemp:async prefix=>{const evidence=prefix+'fixture-'+(++invocations);plan=nightPlan({date,root:copyRoot,evidence:copyRoot+'/.evidence/'+date+'/FAC-03/'+evidence.split('/').at(-1)});return evidence;},
    refreshStatus:async()=>{metadata.push(['build-status']);files.set(`${root}/docs/board/STATUS.md`,'mock refreshed status');},
    recycleText:async file=>{metadata.push(['recycle',file]);files.delete(file);},
    processes:async()=>busy?[{pid:99,command:'node tools/run-tests.mjs --tier lane'}]:[],
    scenarioNames:async()=>['smoke-extra'], listNightFiles:async()=>lastGreen?['night-2026-10-11.json']:[],
    readText:async path=>{if(!files.has(path))throw Error('ENOENT');return files.get(path);},
    writeText:async(path,text)=>files.set(path,text), mkdir:async()=>{},
    appendText:async(path,text)=>{logs.push([path,text]);files.set(path,(files.get(path)||'')+text);},
    spawnImpl:(exe,args,opts)=>{
      const stage=plan.find(row=>row.args.join('|')===args.join('|'));
      assert.ok(stage,'spawn receives the real installed command');
      assert.equal(opts.cwd,copyRoot,'every installed tool runs in the detached copy');
      assert.equal(opts.shell,false);assert.equal(opts.windowsHide,true);
      calls.push(stage.id);active++;maximum=Math.max(maximum,active);
      const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
      queueMicrotask(()=>{
        let text='';
        if(stage.id==='full') {
          const packet=full();
          if(fullFailures.length)Object.assign(packet,{exitCode:1,passed:0,total:fullFailures.length,failures:fullFailures,
            results:fullFailures.map(label=>({label,passed:false,exitCode:1}))});
          if(partialFull)packet.notRun=1;
          if(reportMutation)files.set(copyRoot+'/'+reportName,JSON.stringify({schema:1,commit:head,
            time:'2026-10-12T20:00:00Z',tier:'full',passed:!fullFailures.length,dirty:false,
            startDirty:false,endDirty:false,endCommit:head,complete:true,total:packet.total,
            completed:packet.total,failures:packet.failures,...reportPatch})+'\n');
          if(otherMutation)files.set(copyRoot+'/src/game.js','unexpected game edit');
          text=JSON.stringify(packet)+'\n';
        }
        if(stage.id==='frames'&&missing!==stage.id){
          assert.match(messages.at(-1),/laptop panel off.*Second screen only/);
          const packet=frames();Object.assign(packet.reports[0],framePatch);
          files.set(stage.packet,frameText??JSON.stringify(packet));
          files.set(stage.suitePacket,JSON.stringify({schema:1,count:3,passed:3,failed:0,timingMode:'timing-only',
            rows:['frame-pacing','tremblant-snow','tremblant-views'].map(name=>({name,passed:true}))}));
          if(!timingMissing)for(const recipe of stage.timingPackets) {
            const labels=recipe.name==='tremblant-snow'?['8 cars on the grid']:['8 cars on the grid','8 cars on Timber Straight'];
            const reports=['high','performance'].flatMap(quality=>labels.map(label=>({quality,label,course:recipe.name==='tremblant-snow'?'tremblant-snow':'tremblant-woods',cars:8,frames:120,
              p95:recipe.name==='tremblant-snow'?18.5:33.5,over33ms:12})));
            Object.assign(reports[0],timingPatch);
            files.set(recipe.packet,JSON.stringify({mode:'timing',reports,misses:0}));
          }
        }
        if(stage.id==='browser'&&missing!==stage.id)files.set(stage.packet,JSON.stringify(browser()));
        if(stage.id==='combat')text=JSON.stringify({flags:[],policyRuns:51,baselineRaces:90,
          crossbowAim:{hitRate:.5},ownBombs:{maxSpeedLossPct:10}})+'\n';        child.stdout.end(text);child.stderr.end(fail===stage.id?'actual fixture error\n':'');
        active--;child.emit('close',fail===stage.id||stage.id==='full'&&fullFailures.length?1:0,null);
      });
      return child;
    }};
  return {deps,files,committedFiles,calls,logs,metadata,copies,messages,maximum:()=>maximum};
}
const opts=()=>parseNightArguments(['--idle-awake','--no-push','--date',date]);

test('night command requires the operator context and keeps push disabled',()=>{
  assert.deepEqual(opts(),{idleAwake:true,noPush:true,date});
  for(const args of [[],['--idle-awake'],['--no-push'],['--idle-awake','--no-push','--push'],
    ['--idle-awake','--no-push','--date','2026-02-30'],['--idle-awake','--idle-awake','--no-push']])
    assert.throws(()=>parseNightArguments(args));
});
test('real plan runs every required stage serially with jobs at most four',()=>{
  const plan=nightPlan({root,date});
  assert.deepEqual(plan.map(row=>row.id),['full','frames','combat','browser']);
  assert.deepEqual(plan[0].args,['tools/run-tests.mjs','--tier','full','--jobs','4','--keep-going','--json']);
  assert.deepEqual(plan[2].args,['tools/combat-balance.mjs','--check']);
  assert.ok(plan[1].args.includes('--headed'));
  assert.equal(plan[1].env.DUEL_NIGHT_FRAMES,'1');
  assert.ok(plan.at(-1).args.includes('--all'));
  assert.equal(plan.some(row=>row.args.some(arg=>/push|compact-binaries/.test(arg))),false);
});
test('frame acceptance requires both real qualities and all original limits',()=>{
  assert.doesNotThrow(()=>validateFramePacket(frames()));
  for(const patch of [{p95:18.501},{worldBuildMs:1000},{frames:119},{cars:7},{headed:false},
    {visible:false},{appRunning:false},{rearView:'off'},{countdownAfter:0},{night:false},{memoryOnlySaves:false},{course:'azure'},
    {p95:NaN},{constructionMs:null},{constructionMs:undefined},{constructionMs:NaN},
    {constructionMs:Infinity},{constructionMs:-1},{constructionMs:'5000'},
    {worldBuildMs:null},{worldBuildMs:undefined},{worldBuildMs:NaN},{worldBuildMs:Infinity},
    {worldBuildMs:-1},{worldBuildMs:'999'}]){
    const packet=frames();Object.assign(packet.reports[0],patch);
    assert.throws(()=>validateFramePacket(packet));
  }
  assert.throws(()=>validateFramePacket({reports:[report('High')]}));
});
test('Kyle construction rule keeps the exact world limit and warns only above five seconds',()=>{
  for(const constructionMs of [0,1000,5000,5000.001,6500]){
    const packet=frames(),warnings=[];
    for(const row of packet.reports)Object.assign(row,{worldBuildMs:999.999,constructionMs});
    assert.equal(validateFramePacket(packet,{warn:message=>warnings.push(message)}),packet);
    assert.equal(warnings.length,constructionMs>5000?2:0);
    if(warnings.length){
      assert.match(warnings[0],/High: full first-race load .* exceeds 5000 ms.*warning only/);
      assert.match(warnings[1],/Performance: full first-race load .* exceeds 5000 ms.*warning only/);
    }
  }
  for(const quality of [0,1]){
    const packet=frames();packet.reports[quality].worldBuildMs=1000;
    assert.throws(()=>validateFramePacket(packet),/world build <1000/);
  }
});
test('full-check reports real construction metrics and warnings without failing a slow file load',async()=>{
  const f=fixture({framePatch:{worldBuildMs:610,constructionMs:5300}});
  const packet=await runNight(opts(),f.deps),stage=packet.stages.find(row=>row.id==='frames');
  assert.equal(packet.status,'passed',JSON.stringify(packet.failures));
  assert.equal(stage.passed,true);
  assert.deepEqual(stage.reports,[{quality:'High',p95:18.5,worldBuildMs:610,constructionMs:5300},
    {quality:'Performance',p95:18.5,worldBuildMs:999,constructionMs:999}]);
  assert.equal(stage.warnings.length,1);
  const morning=f.files.get(`${root}/docs/board/checks/night-${date}.md`);
  assert.match(morning,/High: p95 18.5 ms, world build 610 ms, full first-race load 5300 ms/);
  assert.match(morning,/WARNING High: full first-race load 5300 ms exceeds 5000 ms/);
  assert.match(f.messages[0],/laptop panel off.*Second screen only/);
  assert.ok(f.logs.some(([file,text])=>file.endsWith('/frames.log')&&/Second screen only/.test(text)));
});
test('simple frame scenario retains both actual loads and their warning-only verdict',async()=>{
  const packets=[];
  const packet=await runNightFrames({outputDir:root},{
    measure:async(_,quality)=>({...report(quality==='high'?'High':'Performance'),worldBuildMs:610,constructionMs:5300}),
    writeText:async(_,text)=>packets.push(JSON.parse(text))
  });
  assert.equal(packet.warnings.length,2);
  assert.deepEqual(packets[0],packet);
  assert.equal(packet.reports.length,2);
  assert.doesNotThrow(()=>validateFramePacket(packet));
});
test('failed frame verdicts retain actual metrics and slow-load warnings without passing',async()=>{
  for(const fail of [undefined,'frames']){
    const f=fixture({fail,framePatch:{p95:33.3,worldBuildMs:610,constructionMs:5300}});
    const packet=await runNight(opts(),f.deps),stage=packet.stages.find(row=>row.id==='frames');
    assert.equal(packet.status,'failed');assert.equal(stage.passed,false);
    assert.deepEqual(stage.reports,[{quality:'High',p95:33.3,worldBuildMs:610,constructionMs:5300},
      {quality:'Performance',p95:18.5,worldBuildMs:999,constructionMs:999}]);
    assert.equal(stage.warnings.length,1);
    assert.match(stage.reportError,/18.5/);
    assert.match(stage.error,fail?/actual fixture error/:/18.5/);
    assert.deepEqual(packet.failures.map(row=>row.name),['frames']);
    const morning=f.files.get(`${root}/docs/board/checks/night-${date}.md`);
    assert.match(morning,/FAIL frames:/);
    assert.match(morning,/High: p95 33.3 ms, world build 610 ms, full first-race load 5300 ms/);
    assert.match(morning,/WARNING High: full first-race load 5300 ms exceeds 5000 ms/);
  }
});
test('missing and malformed failed-frame packets preserve original child errors without invented metrics',async()=>{
  for(const settings of [{missing:'frames'},{frameText:'{'},{frameText:'null'},
    {framePatch:{p95:null,worldBuildMs:null,constructionMs:null}}]){
    const f=fixture({fail:'frames',...settings}),packet=await runNight(opts(),f.deps);
    const stage=packet.stages.find(row=>row.id==='frames');
    assert.equal(packet.status,'failed');assert.equal(stage.passed,false);
    assert.equal(stage.error,'actual fixture error');assert.equal(typeof stage.reportError,'string');
    assert.deepEqual(packet.failures.map(row=>row.name),['frames']);
    assert.equal((stage.reports||[]).some(row=>row.quality==='High'),false);
    assert.equal(stage.warnings.length,0);
  }
});
test('scenario preserves slow-load warnings even when High delivered frames fail',async()=>{
  const packets=[];
  await assert.rejects(()=>runNightFrames({outputDir:root},{
    measure:async(_,quality)=>({...report(quality==='high'?'High':'Performance'),
      p95:quality==='high'?33.3:16.8,worldBuildMs:610,constructionMs:5300}),
    writeText:async(_,text)=>packets.push(JSON.parse(text))
  }),/18.5/);
  assert.equal(packets.length,1);
  assert.equal(packets[0].reports[0].p95,33.3);
  assert.equal(packets[0].reports[1].p95,16.8);
  assert.equal(packets[0].warnings.length,2);
  assert.throws(()=>validateFramePacket(packets[0]),/18.5/);
});
test('controlled child process drains streams and retains real nonzero output',async()=>{
  const writes=[];
  const result=await runChild('node',['actual-tool'],{cwd:root,env:{KEPT:'yes'},logPath:'log',
    appendText:async(path,text)=>writes.push([path,text]),spawnImpl:(exe,args,options)=>{
      assert.equal(options.env.KEPT,'yes');
      const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
      queueMicrotask(()=>{child.stdout.end('actual output\n');child.stderr.end('actual error\n');child.emit('close',7,null);});
      return child;
    }});
  assert.equal(result.exitCode,7);assert.match(result.stdout,/actual output/);
  assert.match(result.stderr,/actual error/);assert.equal(writes.length,2);
});
test('controlled full night writes genuine stage packets and a short morning report',async()=>{
  const f=fixture(), packet=await runNight(opts(),f.deps);
  assert.equal(packet.status,'passed',JSON.stringify(packet.failures));assert.equal(f.maximum(),1);
  assert.deepEqual(f.calls,['full','frames','combat','browser']);
  assert.equal(packet.push.status,'disabled');assert.equal(packet.compaction.status,'disabled');
  assert.ok(f.files.has(`${root}/docs/board/checks/night-${date}.json`));
  assert.ok(f.files.get(`${root}/docs/board/checks/night-${date}.md`).trim().split('\n').length<20);
});
test('the actual full report mutation is retained as evidence and only its copied source bytes are restored',async()=>{
  const f=fixture({reportMutation:true}),packet=await runNight(opts(),f.deps);
  assert.equal(packet.status,'passed',JSON.stringify(packet.failures));
  assert.deepEqual(f.calls,['full','frames','combat','browser']);
  assert.equal(f.files.get(root+'-copy/source/docs/board/checks/full-tier.json'),'original copied report\n');
  const record=JSON.parse(f.files.get(packet.evidence+'/full-tier.json'));
  assert.equal(record.commit,head);assert.equal(record.endCommit,head);assert.equal(record.complete,true);
  assert.deepEqual(f.copies,[['create',head],['remove',head]]);
});
test('a complete failed full record may clean its own output without losing the actual suite failure',async()=>{
  const f=fixture({reportMutation:true,fullFailures:['tools/test-real-failure.mjs']}),packet=await runNight(opts(),f.deps);
  assert.equal(packet.status,'failed');assert.equal(packet.stages[0].passed,false);
  assert.deepEqual(packet.failures.map(row=>row.name),['full: tools/test-real-failure.mjs']);
  assert.equal(JSON.parse(f.files.get(packet.evidence+'/full-tier.json')).passed,false);
  assert.deepEqual(f.calls,['full','frames','combat','browser']);
  assert.equal(f.files.get(root+'-copy/source/docs/board/checks/full-tier.json'),'original copied report\n');
});
test('unrelated copied source changes and mismatched or incomplete full output are never restored',async()=>{
  for(const settings of [{otherMutation:true},{reportPatch:{commit:previous}},{reportPatch:{endCommit:previous}},
    {reportPatch:{dirty:true}},{reportPatch:{startDirty:true}},{reportPatch:{endDirty:true}},
    {reportPatch:{total:3}},{reportPatch:{completed:1}},{reportPatch:{failures:['invented']}},
    {reportPatch:{passed:false}},{reportPatch:{complete:false}},{reportPatch:{schema:2}},{partialFull:true}]){
    const f=fixture({reportMutation:true,...settings}),packet=await runNight(opts(),f.deps);
    assert.equal(packet.status,'failed',JSON.stringify(settings));
    assert.deepEqual(f.calls,['full'],'refused copied source cannot reach later tools');
    assert.notEqual(f.files.get(root+'-copy/source/docs/board/checks/full-tier.json'),'original copied report\n');
    if(settings.otherMutation)assert.equal(f.files.get(root+'-copy/source/src/game.js'),'unexpected game edit');
    assert.deepEqual(f.copies,[['create',head]],'changed copy is retained');
  }
});

test('a real stage failure keeps later checks, names the first merge and fails the night',async()=>{
  const f=fixture({fail:'combat'}),packet=await runNight(opts(),f.deps);
  assert.equal(packet.status,'failed');assert.equal(f.calls.length,4);
  assert.equal(packet.failures[0].firstMerge,merge);
  assert.match(packet.stages.find(row=>row.id==='combat').error,/actual fixture error/);
});
test('missing packets, changed copied source and competing frame work never pass',async()=>{
  for(const settings of [{missing:'frames'},{missing:'browser'},{copyChange:true},{busy:true}]){
    const f=fixture(settings), packet=await runNight(opts(),f.deps);
    assert.notEqual(packet.status,'passed');
    if(settings.busy)assert.deepEqual(f.calls,['full','combat','browser']);
  }
});
test('no previous green night reports unknown attribution rather than inventing a merge',async()=>{
  const f=fixture({fail:'frames',lastGreen:false}),packet=await runNight(opts(),f.deps);
  assert.equal(packet.failures[0].firstMerge,null);
  assert.match(packet.failures[0].attribution,/no previous green night/i);
});
test('tool refuses the live folder before launching children',async()=>{
  const f=fixture();f.deps.root='C:/Users/kyleb/dev/the-duel-remake';
  await assert.rejects(()=>runNight(opts(),f.deps),/live folder/i);
  assert.equal(f.calls.length,0);
});
test('process selection refuses real heavy work and preserves unrelated idle services',()=>{
  const rows=[{pid:1,command:'node tools/full-check.mjs'},
    {pid:2,command:'node tools/run-tests.mjs --tier lane --jobs 4'},
    {pid:3,command:'blender.exe --background recipe.blend'},
    {pid:4,command:'node tools/run-browser-scenarios.mjs --all'},
    {pid:5,command:'node vite/bin/vite.js build'},
    {pid:6,command:'node vite/bin/vite.js preview --port 5311'}];
  assert.deepEqual(heavyProcesses(rows,1).map(row=>row.pid),[2,3,4,5]);
});
test('official frame mode refuses headless, undeclared awake or busy context',()=>{
  const env={DUEL_NIGHT_FRAMES:'1',DUEL_NIGHT_IDLE_AWAKE:'1'};
  assert.doesNotThrow(()=>assertNightFrameContext({headed:true,launchMode:'headed'},env,[]));
  assert.throws(()=>assertNightFrameContext({headed:false,launchMode:'headless'},env,[]));
  assert.throws(()=>assertNightFrameContext({headed:true,launchMode:'headed'},{},[]));
  assert.throws(()=>assertNightFrameContext({headed:true,launchMode:'headed'},env,[{pid:2,command:'node tools/run-tests.mjs'}]));
});
test('simple night metric uses all 120 delivered intervals without rounding a failure away',()=>{
  const values=Array(120).fill(16.7);values.fill(18.501,110);
  assert.equal(summarizeNightFrames(values).p95,18.501);
  for(const values of [[],Array(119).fill(16.7),[...Array(119).fill(16.7),0],
    [...Array(119).fill(16.7),NaN]])assert.throws(()=>summarizeNightFrames(values));
});
test('every failed full suite keeps attribution while the morning report stays under twenty lines',async()=>{
  const names=Array.from({length:30},(_,index)=>`tools/test-failure-${index}.mjs`);
  const f=fixture({fullFailures:names}),packet=await runNight(opts(),f.deps);
  assert.equal(packet.failures.length,30);
  assert.deepEqual(packet.failures.map(row=>row.name),names.map(name=>'full: '+name));
  assert.ok(packet.failures.every(row=>row.firstMerge===merge));
  assert.ok(f.files.get(`${root}/docs/board/checks/night-${date}.md`).trim().split('\n').length<20);
});
test('child UTF-8 decoding retains a multibyte JSON and stderr character split across chunks',async()=>{
  const writes=[], value=Buffer.from('{"name":"夜"}\n'), split=value.indexOf(Buffer.from('夜'))+1;
  const result=await runChild('node',['controlled'],{logPath:'log',appendText:async(_,text)=>writes.push(text),
    spawnImpl:()=>{
      const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
      queueMicrotask(()=>{
        child.stdout.write(value.subarray(0,split));child.stdout.end(value.subarray(split));
        const error=Buffer.from('é');child.stderr.write(error.subarray(0,1));child.stderr.end(error.subarray(1));
        child.emit('close',0,null);
      });return child;
    }});
  assert.equal(JSON.parse(result.stdout).name,'夜');assert.equal(result.stderr,'é');
  assert.equal(writes.join('').includes('�'),false);
});
test('append rejection is handled immediately and reported after child close and queued writes',()=>{
  const moduleUrl=new URL('./full-check.mjs',import.meta.url).href;
  const source=`import {runChild} from ${JSON.stringify(moduleUrl)};
    import {EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';
    let closed=false,writes=0;
    const result=await runChild('node',['controlled'],{logPath:'log',
      appendText:async()=>{writes++;throw Error('disk rejected');},
      spawnImpl:()=>{const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
        queueMicrotask(()=>{child.stdout.write('first');setTimeout(()=>{
          child.stdout.end('last');child.stderr.end();closed=true;child.emit('close',0,null);},20);});return child;}});
    if(!closed||writes!==2||result.exitCode===0||!result.stderr.includes('disk rejected'))throw Error('child/write drain was lost');
    console.log('APPEND_FAILURE_DRAINED');`;
  const child=spawnSync(process.execPath,['--unhandled-rejections=strict','--input-type=module','-e',source],
    {encoding:'utf8',timeout:4000});
  assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
  assert.match(child.stdout,/APPEND_FAILURE_DRAINED/);
});
test('child error records failure but completion still waits for its close',async()=>{
  let closed=false;
  const result=await runChild('node',['controlled'],{appendText:async()=>{},spawnImpl:()=>{
    const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
    queueMicrotask(()=>{child.emit('error',Error('stdio failed'));setTimeout(()=>{
      child.stdout.end('late output');child.stderr.end();closed=true;child.emit('close',0,null);},20);});
    return child;
  }});
  assert.equal(closed,true,'error does not release a still-live child');
  assert.equal(result.exitCode,1);assert.match(result.stdout,/late output/);assert.match(result.stderr,/stdio failed/);
});
test('same-day valid stale evidence cannot stand in for a missing current packet',async()=>{
  const f=fixture({missing:'frames'}), old=nightPlan({root,date});
  f.files.set(old.find(row=>row.id==='frames').packet,JSON.stringify(frames()));
  const result=await runNight(opts(),f.deps);
  assert.equal(result.status,'failed');
  assert.equal(result.stages.find(row=>row.id==='frames').passed,false);
});
test('same-day previous green night remains the attribution source',async()=>{
  const f=fixture({fail:'frames',lastGreen:false});
  f.files.set(`${root}/docs/board/checks/night-${date}.json`,JSON.stringify({schema:1,status:'passed',source:previous,date}));
  f.deps.listNightFiles=async()=>[`night-${date}.json`];
  const result=await runNight(opts(),f.deps);
  assert.equal(result.lastGreen,previous);assert.equal(result.failures[0].firstMerge,merge);
});
test('actual wrong branch refuses jobs and leaves public metadata untouched',async()=>{
  const f=fixture(),original=f.deps.git;
  f.deps.git=async (args,cwd)=>!cwd&&args[0]==='branch'?'codex/fac-03':original(args,cwd);
  const result=await runNight(opts(),f.deps);
  assert.equal(result.status,'failed');assert.equal(f.calls.length,0);
  assert.equal(result.publication.status,'refused');
  assert.equal(f.files.has(`${root}/docs/board/checks/night-${date}.json`),false);
});
test('publication refreshes existing STATUS and commits only the three granted paths',async()=>{
  const f=fixture(),result=await runNight(opts(),f.deps);
  assert.equal(result.publication.status,'committed');
  const commits=f.metadata.filter(args=>args[0]==='commit');assert.equal(commits.length,1);
  const paths=commits[0].slice(commits[0].indexOf('--')+1);
  assert.deepEqual(paths,[`docs/board/checks/night-${date}.json`,`docs/board/checks/night-${date}.md`,'docs/board/STATUS.md']);
  assert.ok(commits[0].includes('--only'));assert.ok(f.metadata.some(args=>args[0]==='build-status'));
});
test('dirty source at publication keeps the failed report ignored and never writes public reports',async()=>{
  const f=fixture(),original=f.deps.git;
  f.deps.git=async (args,cwd)=>!cwd&&args[0]==='status'&&f.calls.length===4?'M  src/game.js':original(args,cwd);
  const result=await runNight(opts(),f.deps);
  assert.equal(result.status,'failed');assert.equal(result.publication.status,'refused');
  assert.equal(f.files.has(`${root}/docs/board/checks/night-${date}.json`),false);
  assert.ok(f.files.has(result.evidence+'/night-report.json'));
  assert.equal(f.metadata.some(args=>args[0]==='commit'),false);
});
test('branch changes during STATUS refresh restore only owned drafts and preserve other staged work',async()=>{
  const f=fixture(),status=`${root}/docs/board/STATUS.md`,other=`${root}/tools/other.mjs`,original=f.deps.git;
  f.files.set(status,'original status');f.files.set(other,'others staged source');
  let switched=false;
  f.deps.refreshStatus=async()=>{f.files.set(status,'our draft status');switched=true;};
  f.deps.git=async (args,cwd)=>!cwd&&args[0]==='branch'&&switched?'codex/other':original(args,cwd);
  const result=await runNight(opts(),f.deps);
  assert.equal(result.publication.status,'refused');assert.equal(result.status,'failed');
  assert.equal(f.files.get(status),'original status');assert.equal(f.files.get(other),'others staged source');
  assert.equal(f.files.has(`${root}/docs/board/checks/night-${date}.json`),false);
  assert.equal(f.metadata.some(args=>args[0]==='commit'),false);
});
test('two same-day invocations own distinct leaves and retain both ignored receipts',async()=>{
  const f=fixture(),first=await runNight(opts(),f.deps),second=await runNight(opts(),f.deps);
  assert.notEqual(first.evidence,second.evidence);
  assert.ok(f.files.has(first.evidence+'/night-report.json'));
  assert.ok(f.files.has(second.evidence+'/night-report.json'));
});
test('a failed same-day retry preserves the prior genuine green attribution for the next retry',async()=>{
  const f=fixture({fail:'frames',lastGreen:false});
  f.files.set(`${root}/docs/board/checks/night-${date}.json`,JSON.stringify({schema:1,status:'passed',source:previous,date}));
  f.deps.listNightFiles=async()=>[`night-${date}.json`];
  await runNight(opts(),f.deps);
  const next=await runNight(opts(),f.deps);
  assert.equal(next.lastGreen,previous);assert.equal(next.failures[0].firstMerge,merge);
});
test('a receipt read failure after successful commit never rolls back committed metadata',async()=>{
  const f=fixture(),original=f.deps.git;let committed=false;
  f.deps.git=async (args,cwd)=>{
    if(committed&&args[0]==='rev-parse')throw Error('receipt read failed');
    const result=await original(args,cwd);if(args[0]==='commit')committed=true;return result;
  };
  const result=await runNight(opts(),f.deps);
  assert.equal(result.publication.status,'committed');assert.match(result.publication.receiptError,/receipt read failed/);
  for(const name of result.publication.paths)assert.equal(f.files.get(root+'/'+name),f.committedFiles.get(root+'/'+name));
  assert.equal(f.metadata.some(args=>args[0]==='restore'||args[0]==='recycle'),false);
});
test('concurrent source commit keeps its new committed STATUS during publication rollback',async()=>{
  const f=fixture(),status=root+'/docs/board/STATUS.md',original=f.deps.git;let advanced=false;
  f.files.set(status,'old status');f.committedFiles.set(status,'old status');
  f.deps.refreshStatus=async()=>{
    f.committedFiles.set(status,'new committed status');f.files.set(status,'our newer draft status');advanced=true;
  };
  f.deps.git=async (args,cwd)=>{
    if(!cwd&&advanced&&args[0]==='branch')return 'codex/other';
    return !cwd&&advanced&&args[0]==='rev-parse'?'d'.repeat(40):original(args,cwd);
  };
  const result=await runNight(opts(),f.deps);
  assert.equal(result.publication.status,'refused');assert.equal(f.files.get(status),'new committed status');
});
test('Night browser frame row reuses the same leaf without measuring, and failed/missing originals fail',async()=>{
  const outputDir=root+'/.evidence/'+date+'/FAC-03/night-owned/browser/frame-pacing';
  const packetPath=root+'/.evidence/'+date+'/FAC-03/night-owned/frames/frame-pacing.json';
  let measurements=0,writes=0;
  const context={outputDir,evaluate:()=>{measurements++;throw Error('must not measure');},
    command:()=>{measurements++;throw Error('must not render');},navigate:()=>{measurements++;throw Error('must not navigate');}};
  const original={scenario:'frame-pacing',passed:true,headed:true,memoryOnlySaves:true,issues:[],warnings:[]};
  const operations={packetPath,priorPassed:true,
    readText:async file=>JSON.stringify(file.endsWith('report.json')?original:frames()),
    writeText:async()=>{writes++;}};
  await reuseNightFrames(context,operations);
  assert.equal(measurements,0);assert.equal(writes,1);
  await assert.rejects(()=>reuseNightFrames(context,{...operations,priorPassed:false}),/failed/i);
  await assert.rejects(()=>reuseNightFrames(context,{...operations,readText:async()=>{throw Error('ENOENT');}}),/ENOENT/);
  await assert.rejects(()=>reuseNightFrames(context,{...operations,readText:async file=>{
    const value=file.endsWith('report.json')?{...original,passed:false}:frames();return JSON.stringify(value);
  }}),/failed/i);
  await assert.rejects(()=>reuseNightFrames(context,{...operations,readText:async file=>{
    const value=file.endsWith('report.json')?original:frames();if(value.reports)value.reports[0].p95=19;return JSON.stringify(value);
  }}),/18.5/);
  await assert.rejects(()=>reuseNightFrames(context,{...operations,packetPath:packetPath.replace('night-owned','night-old')}),/same|owned/i);
  assert.equal(measurements,0);assert.equal(writes,1,'only a valid original is copied');
});
test('each official quality is attempted once and a first native error stays failed',async()=>{
  const qualities=[],packets=[];
  await assert.rejects(()=>runNightFrames({outputDir:root+'/owned-night'}, {
    measure:async(_,quality)=>{
      qualities.push(quality);
      if(quality==='high')throw Error('High native scene initialization failed');
      return report('Performance');
    },
    writeText:async(_,text)=>packets.push(JSON.parse(text)),
  }),/High native scene initialization failed/);
  assert.deepEqual(qualities,['high','performance'],'no quality is skipped or retried');
  assert.equal(packets.length,1);assert.equal(packets[0].reports.length,2);
  assert.equal(packets[0].reports[0].passed,false);
  assert.match(packets[0].reports[0].error,/native scene initialization failed/);
  assert.equal(packets[0].reports[1].quality,'Performance');
  assert.throws(()=>validateFramePacket(packets[0]),'the partial real packet cannot pass');
});


test('moving integration keeps the original copied SHA and publishes on current integration',async()=>{
  const f=fixture({change:true}),result=await runNight(opts(),f.deps);
  assert.equal(result.status,'passed',JSON.stringify(result.failures));
  assert.equal(result.source,head);assert.equal(result.publication.commit,'d'.repeat(40));
  assert.deepEqual(f.copies,[['create',head],['remove',head]]);
  assert.equal(JSON.parse(f.files.get(root+'/docs/board/checks/night-'+date+'.json')).source,head);
});

test('three foreign job trees refuse nonframe stages; two permit them but never frames',async()=>{
  for(const count of [2,3]) {
    const f=fixture();f.deps.processes=async()=>Array.from({length:count},(_,index)=>({pid:90+index,command:'node tools/run-tests.mjs --tier lane'}));
    const result=await runNight(opts(),f.deps);
    assert.equal(result.status,'failed');
    assert.deepEqual(f.calls,count===2?['full','combat','browser']:[]);
    assert.equal(result.stages.find(row=>row.id==='frames').passed,false);
  }
});

test('foreign heavy work appearing only during frames discards the actual timing packet',async()=>{
  const f=fixture(),spawn=f.deps.spawnImpl;let during=false,observed=false;
  f.deps.framePollMs=1;
  f.deps.processes=async()=>{if(during){observed=true;return [{pid:91,command:'node vite/bin/vite.js build'}];}return [];};
  f.deps.spawnImpl=(exe,args,options)=>{
    if(!args.includes('--timing-only'))return spawn(exe,args,options);
    const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
    during=true;
    setTimeout(()=>{
      const leaf=[...f.files.keys()].find(name=>name.endsWith('/full.log')).split('/').at(-2);
      const stage=nightPlan({root:root+'-copy/source',date,evidence:root+'-copy/source/.evidence/'+date+'/FAC-03/'+leaf})[1];
      f.files.set(stage.packet,JSON.stringify(frames()));
      f.files.set(stage.suitePacket,JSON.stringify({schema:1,count:3,passed:3,failed:0,timingMode:'timing-only',
        rows:['frame-pacing','tremblant-snow','tremblant-views'].map(name=>({name,passed:true}))}));
      for(const recipe of stage.timingPackets) {
        const labels=recipe.name==='tremblant-snow'?['8 cars on the grid']:['8 cars on the grid','8 cars on Timber Straight'];
        const reports=['high','performance'].flatMap(quality=>labels.map(label=>({quality,label,course:recipe.name==='tremblant-snow'?'tremblant-snow':'tremblant-woods',cars:8,frames:120,
          p95:recipe.name==='tremblant-snow'?18.5:33.5,over33ms:12})));
        f.files.set(recipe.packet,JSON.stringify({mode:'timing',reports,misses:0}));
      }
      during=false;child.stdout.end();child.stderr.end();child.emit('close',0,null);
    },25);
    return child;
  };
  const result=await runNight(opts(),f.deps);
  assert.equal(observed,true);assert.equal(result.stages.find(row=>row.id==='frames').passed,false);
  assert.match(result.stages.find(row=>row.id==='frames').error,/competing|heavy|timing/i);
});

test('process inspection counts foreign trees once and excludes the running check descendants',()=>{
  const rows=[{pid:1,parent:0,command:'node tools/full-check.mjs'},
    {pid:2,parent:1,command:'node tools/browser-harness.mjs'},
    {pid:3,parent:0,command:'node tools/run-tests.mjs --jobs 4'},
    {pid:4,parent:3,command:'blender.exe --background render.py'},
    {pid:5,parent:0,command:'node vite/bin/vite.js build'},
    {pid:6,parent:0,command:'node tools/race-field-balance.mjs --course red-mesa --jobs 4'},
    {pid:7,parent:6,command:'node tools/race-field-balance.mjs --worker'}];
  assert.deepEqual(heavyProcesses(rows,1).map(row=>row.pid),[3,5,6]);
  assert.deepEqual(heavyProcesses([rows[0],rows.at(-1)],1).map(row=>row.pid),[7],
    'a real same-file worker remains visible if its parent leaves the snapshot');
});

test('real temporary Git copy stays detached at starting source and safely unlinks its Junction',async()=>{
  const parent=await mkdtemp(join(tmpdir(),'duel-full-check-')),integration=join(parent,'integration');
  let copy;
  const git=args=>{const row=spawnSync('git',args,{cwd:integration,encoding:'utf8'});assert.equal(row.status,0,row.stderr);return row.stdout.trim();};
  try {
    await mkdir(integration);git(['init','-b','integration/wasteland']);git(['config','user.name','Full check fixture']);git(['config','user.email','fixture@example.invalid']);
    await writeFile(join(integration,'.gitignore'),'node_modules/\n.evidence/\n');
    await writeFile(join(integration,'source.txt'),'starting source');git(['add','.']);git(['commit','-m','starting']);
    const source=git(['rev-parse','HEAD']);await mkdir(join(integration,'node_modules'));
    await writeFile(join(integration,'node_modules','kept.txt'),'integration dependency');
    copy=await createCheckCopy(integration,source);
    assert.equal(git(['-C',copy.root,'branch','--show-current']),'');
    assert.equal(git(['-C',copy.root,'rev-parse','HEAD']),source);
    await writeFile(join(integration,'source.txt'),'later merge');git(['add','source.txt']);git(['commit','-m','later']);
    assert.equal(await readFile(join(copy.root,'source.txt'),'utf8'),'starting source');
    await assert.rejects(()=>removeCheckCopy({...copy}),/owned|receipt/i);
    assert.equal(Object.isFrozen(copy),true);
    const foreign=join(parent,'foreign-evidence');await mkdir(foreign);
    await writeFile(join(foreign,'kept.txt'),'foreign evidence');
    const evidenceLink=join(copy.root,'.evidence');
    const relink=target=>{
      const row=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',
        "Remove-Item -LiteralPath $env:DUEL_TEST_LINK -ErrorAction Stop; New-Item -ItemType Junction -Path $env:DUEL_TEST_LINK -Target $env:DUEL_TEST_TARGET -ErrorAction Stop | Out-Null"],
        {encoding:'utf8',env:{...process.env,DUEL_TEST_LINK:evidenceLink,DUEL_TEST_TARGET:target}});
      assert.equal(row.status,0,row.stderr);
    };
    relink(foreign);await assert.rejects(()=>removeCheckCopy(copy),/target mismatch/i);
    assert.equal(existsSync(join(copy.root,'node_modules')),true,'verify all targets before unlinking either');
    assert.equal(await readFile(join(foreign,'kept.txt'),'utf8'),'foreign evidence');
    relink(join(integration,'.evidence'));
    await removeCheckCopy(copy);copy=null;
    assert.equal(await readFile(join(integration,'node_modules','kept.txt'),'utf8'),'integration dependency');
    assert.equal(git(['worktree','list','--porcelain']).includes('detached'),false);
  }finally {if(copy)await removeCheckCopy(copy);await rm(parent,{recursive:true,force:true});}
});

test('consecutive frame qualities buy courses for distinct memory-only native players', async()=>{
  const {App}=await import('../src/app.js');
  const {COURSE}=await import('../src/config.js');
  const {ALL_CIRCUITS}=await import('../src/circuits/index.js');
  const {isCourseUnlocked}=await import('../src/course-access.js');
  const names=['localStorage','__DUEL_QA__','cancelAnimationFrame'];
  const globals=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const memory=new Map(),originalLength=COURSE.length;
  let app;
  try{
    globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
    globalThis.__DUEL_QA__=true;
    globalThis.cancelAnimationFrame=()=>{};
    if(!COURSE.some(row=>row.id==='harbour-lights'))COURSE.push(ALL_CIRCUITS.find(row=>row.id==='harbour-lights'));
    app=new App();
    prepareNightPlayer(app,'high');
    const highId=app.player.id,highProfile=JSON.stringify(app.profile);
    assert.equal(isCourseUnlocked(app.profile,'harbour-lights'),true);
    assert.equal(app.purchaseCourse('harbour-lights').ok,false,'native duplicate purchase remains refused');
    prepareNightPlayer(app,'performance');
    assert.notEqual(app.player.id,highId,'second quality uses its own temporary named player');
    assert.equal(isCourseUnlocked(app.profile,'harbour-lights'),true);
    assert.equal(JSON.stringify(app.players.players.find(row=>row.id===highId).profile),highProfile,'earlier funded QA profile remains exact');
    assert.equal(app.duel.state.status,'menu');
  }finally{
    try{app?.dispose();}finally{
      COURSE.splice(originalLength);
      for(const[name,descriptor]of globals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
    }
  }
});

test('existing frame step owns all three timing recipes in one headed serial suite', () => {
  const plan = nightPlan({root,date}), stage = plan[1];
  assert.equal(plan.length,4,'no extra full-check stage');
  assert.deepEqual(stage.args.slice(0,4),['tools/run-browser-scenarios.mjs','--scenarios','frame-pacing,tremblant-snow,tremblant-views','--timing-only']);
  assert.ok(stage.args.includes('--headed'));
  assert.equal(stage.args[stage.args.indexOf('--jobs')+1],'1');
  assert.equal(plan[3].env.DUEL_NIGHT_FRAME_PACKET,stage.packet,'ordinary frame reuse still reads the actual Harbour packet');
});

test('Tremblant timing acceptance rejects missing qualities, unrun timing and every original boundary failure', () => {
  assert.equal(typeof validateTremblantFramePacket,'function');
  for (const name of ['tremblant-snow','tremblant-views']) {
    const labels = name==='tremblant-snow'?['8 cars on the grid']:['8 cars on the grid','8 cars on Timber Straight'];
    const packet = {mode:'timing',reports:['high','performance'].flatMap(quality=>labels.map(label=>({quality,label,course:name==='tremblant-snow'?'tremblant-snow':'tremblant-woods',cars:8,frames:120,p95:name==='tremblant-snow'?18.5:33.5,over33ms:12}))),misses:0};
    assert.doesNotThrow(()=>validateTremblantFramePacket(packet,name));
    for(const patch of [{frames:119},{cars:7},{course:name==='tremblant-snow'?'tremblant-woods':'tremblant-snow'},{p95:Infinity},{p95:0},{p95:name==='tremblant-snow'?18.501:33.501},...(name==='tremblant-views'?[{over33ms:13}]:[])]) {
      const bad=structuredClone(packet);Object.assign(bad.reports[0],patch);assert.throws(()=>validateTremblantFramePacket(bad,name));
    }
    const missing=structuredClone(packet);missing.reports.pop();assert.throws(()=>validateTremblantFramePacket(missing,name));
    assert.throws(()=>validateTremblantFramePacket({...packet,mode:'views'},name));
  }
});


test('full-check cannot count successful pictures as completed Tremblant timing', async () => {
  for(const options of [{timingMissing:true},{timingPatch:{frames:119}},{timingPatch:{cars:7}}]) {
    const f=fixture(options),packet=await runNight(opts(),f.deps);
    assert.equal(packet.status,'failed');
    assert.equal(packet.stages.find(row=>row.id==='frames').passed,false);
    assert.equal(packet.stages.find(row=>row.id==='browser').passed,true,'ordinary semantic success does not waive timing');
  }
  const f=fixture(),packet=await runNight(opts(),f.deps),stage=packet.stages.find(row=>row.id==='frames');
  assert.equal(stage.tremblantReports.length,6,'all original measurement points retained');
  assert.equal(stage.passed,true);assert.equal(packet.status,'passed');
});
