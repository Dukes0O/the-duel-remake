import { assertNightFrameContext, summarizeNightFrames, reuseNightFrames, runNightFrames } from './scenarios/frame-pacing.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { parseNightArguments, nightPlan, validateFramePacket, runChild, runNight, heavyProcesses } from './night-shift.mjs';

const date = '2026-10-12', head = 'a'.repeat(40), previous = 'b'.repeat(40), merge = 'c'.repeat(40);
const root = 'C:/qa/the-duel-remake';
const report = quality => ({quality, course:'harbour-lights', cars:8, night:true,
  appRunning:true,rearView:'ready',countdownBefore:0,countdownAfter:2,frames:120, p95:18.5, constructionMs:999, headed:true, visible:true, memoryOnlySaves:true});
const frames = () => ({schema:1, mode:'night-simple', reports:[report('High'),report('Performance')]});
const full = () => ({schema:1,kind:'result',tier:'full',jobs:4,exitCode:0,passed:2,
  failures:[],notRun:0,total:2,results:[{label:'a',passed:true},{label:'b',passed:true}]});
const browser = () => ({schema:1,count:1,passed:1,failed:0,rows:[{name:'smoke-extra',passed:true}]});
function fixture({fail, missing, busy=false, change=false, lastGreen=true, fullFailures=[]}={}) {
  const files = new Map(), committedFiles = new Map(), calls = [], logs = [], metadata = [];
  let active=0, maximum=0, heads=0, invocations=0;
  let plan = nightPlan({date,root});
  if(lastGreen)files.set(`${root}/docs/board/checks/night-2026-10-11.json`,
    JSON.stringify({schema:1,status:'passed',source:previous,date:'2026-10-11'}));
  const deps = {root, now:()=>new Date('2026-10-12T20:00:00Z'),
    git:async args=>{
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
    makeTemp:async prefix=>{const evidence=prefix+'fixture-'+(++invocations);plan=nightPlan({date,root,evidence});return evidence;},
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
      assert.equal(opts.shell,false);assert.equal(opts.windowsHide,true);
      calls.push(stage.id);active++;maximum=Math.max(maximum,active);
      const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
      queueMicrotask(()=>{
        let text='';
        if(stage.id==='full') {
          const packet=full();
          if(fullFailures.length)Object.assign(packet,{passed:0,total:fullFailures.length,failures:fullFailures,
            results:fullFailures.map(label=>({label,passed:false}))});
          text=JSON.stringify(packet)+'\n';
        }
        if(stage.id==='frames'&&missing!==stage.id)files.set(stage.packet,JSON.stringify(frames()));
        if(stage.id==='browser'&&missing!==stage.id)files.set(stage.packet,JSON.stringify(browser()));
        if(stage.id==='combat')text=JSON.stringify({flags:[],policyRuns:51,baselineRaces:90,
          crossbowAim:{hitRate:.5},ownBombs:{maxSpeedLossPct:10}})+'\n';        child.stdout.end(text);child.stderr.end(fail===stage.id?'actual fixture error\n':'');
        active--;child.emit('close',fail===stage.id||stage.id==='full'&&fullFailures.length?1:0,null);
      });
      return child;
    }};
  return {deps,files,committedFiles,calls,logs,metadata,maximum:()=>maximum};
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
  for(const patch of [{p95:18.501},{constructionMs:1000},{frames:119},{cars:7},{headed:false},
    {visible:false},{appRunning:false},{rearView:'off'},{countdownAfter:0},{night:false},{memoryOnlySaves:false},{course:'azure'},
    {p95:NaN},{constructionMs:null}]){
    const packet=frames();Object.assign(packet.reports[0],patch);
    assert.throws(()=>validateFramePacket(packet));
  }
  assert.throws(()=>validateFramePacket({reports:[report('High')]}));
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
test('a real stage failure keeps later checks, names the first merge and fails the night',async()=>{
  const f=fixture({fail:'combat'}),packet=await runNight(opts(),f.deps);
  assert.equal(packet.status,'failed');assert.equal(f.calls.length,4);
  assert.equal(packet.failures[0].firstMerge,merge);
  assert.match(packet.stages.find(row=>row.id==='combat').error,/actual fixture error/);
});
test('missing real packets, source changes and busy laptops never pass',async()=>{
  for(const settings of [{missing:'frames'},{missing:'browser'},{change:true},{busy:true}]){
    const f=fixture(settings), packet=await runNight(opts(),f.deps);
    assert.notEqual(packet.status,'passed');
    if(settings.busy)assert.equal(f.calls.length,0);
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
  const rows=[{pid:1,command:'node tools/night-shift.mjs'},
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
  const moduleUrl=new URL('./night-shift.mjs',import.meta.url).href;
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
  f.deps.git=async args=>args[0]==='branch'?'codex/fac-03':original(args);
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
  f.deps.git=async args=>args[0]==='status'&&f.calls.length===4?'M  src/game.js':original(args);
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
  f.deps.git=async args=>args[0]==='branch'&&switched?'codex/other':original(args);
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
  f.deps.git=async args=>{
    if(committed&&args[0]==='rev-parse')throw Error('receipt read failed');
    const result=await original(args);if(args[0]==='commit')committed=true;return result;
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
  f.deps.git=async args=>advanced&&args[0]==='rev-parse'?'d'.repeat(40):original(args);
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
