import { assertNightFrameContext, summarizeNightFrames } from './scenarios/frame-pacing.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { parseNightArguments, nightPlan, validateFramePacket, runChild, runNight, heavyProcesses } from './night-shift.mjs';

const date = '2026-10-12', head = 'a'.repeat(40), previous = 'b'.repeat(40), merge = 'c'.repeat(40);
const root = 'C:/qa/the-duel-remake';
const report = quality => ({quality, course:'harbour-lights', cars:8, night:true,
  appRunning:true,rearView:'ready',countdownBefore:0,countdownAfter:2,frames:120, p95:18.5, constructionMs:999, headed:true, visible:true, memoryOnlySaves:true});
const frames = () => ({schema:1, mode:'night-simple', reports:[report('High'),report('Performance')]});
const full = () => ({schema:1,kind:'result',tier:'full',jobs:4,exitCode:0,passed:2,
  failures:[],notRun:0,total:2,results:[{label:'a',passed:true},{label:'b',passed:true}]});
const browser = () => ({schema:1,count:1,passed:1,failed:0,rows:[{name:'smoke-extra',passed:true}]});
function fixture({fail, missing, busy=false, change=false, lastGreen=true, inapplicable=false, fullFailures=[]}={}) {
  const files = new Map(), calls = [], logs = [];
  let active=0, maximum=0, heads=0;
  const plan = nightPlan({date,root});
  if(lastGreen)files.set(`${root}/docs/board/checks/night-2026-10-11.json`,
    JSON.stringify({schema:1,status:'passed',source:previous,date:'2026-10-11'}));
  const deps = {root, now:()=>new Date('2026-10-12T20:00:00Z'),
    git:async args=>args[0]==='status'?'':args[0]==='rev-list'?merge+'\n':change&&heads++>0?'d'.repeat(40):head,
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
        if(stage.id.startsWith('combat'))text=JSON.stringify({wasteland2:{value:stage.id.endsWith('off')?'off':'on',
          eligibility:stage.id.endsWith('on'),rulesActive:stage.id.endsWith('on'),acceptance:inapplicable&&stage.id==='combat-off'?'inapplicable':'applicable'}})+'\n';
        child.stdout.end(text);child.stderr.end(fail===stage.id?'actual fixture error\n':'');
        active--;child.emit('close',fail===stage.id||stage.id==='full'&&fullFailures.length?1:0,null);
      });
      return child;
    }};
  return {deps,files,calls,logs,maximum:()=>maximum};
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
  assert.deepEqual(plan.map(row=>row.id),['full','frames','combat-off','combat-on','browser']);
  assert.deepEqual(plan[0].args,['tools/run-tests.mjs','--tier','full','--jobs','4','--keep-going','--json']);
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
  assert.deepEqual(f.calls,['full','frames','combat-off','combat-on','browser']);
  assert.equal(packet.push.status,'disabled');assert.equal(packet.compaction.status,'disabled');
  assert.ok(f.files.has(`${root}/docs/board/checks/night-${date}.json`));
  assert.ok(f.files.get(`${root}/docs/board/checks/night-${date}.md`).trim().split('\n').length<20);
});
test('a real stage failure keeps later checks, names the first merge and fails the night',async()=>{
  const f=fixture({fail:'combat-on'}),packet=await runNight(opts(),f.deps);
  assert.equal(packet.status,'failed');assert.equal(f.calls.length,5);
  assert.equal(packet.failures[0].firstMerge,merge);
  assert.match(packet.stages.find(row=>row.id==='combat-on').error,/actual fixture error/);
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
test('inapplicable off acceptance is an actual night failure, never a green pair',async()=>{
  const result=await runNight(opts(),fixture({inapplicable:true}).deps);
  assert.equal(result.status,'failed');
  assert.match(result.stages.find(row=>row.id==='combat-off').error,/inapplicable/);
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