import assert from 'node:assert/strict';
import test from 'node:test';
import { after } from 'node:test';
import { spawn } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { assertPrivatePort, consoleIssue, parseArguments } from './browser-harness.mjs';
import * as browserHarness from './browser-harness.mjs';

let evidenceChecks = 0;
const evidenceCheck = (condition, message) => { evidenceChecks++; assert.ok(condition, message); };
after(() => console.log(`Browser evidence: ${evidenceChecks} checks`));

test('smoke and named scenarios parse without accepting paths or unknown flags', () => {
  assert.deepEqual(parseArguments(['smoke']), { name: 'smoke', injectConsoleError: false });
  assert.deepEqual(parseArguments(['scenario', 'night-race', '--inject-console-error']), { name: 'night-race', injectConsoleError: true });
  assert.deepEqual(parseArguments(['record-race']), { name: 'audio-race', injectConsoleError: false });
  assert.throws(() => parseArguments(['record-race', 'audio-race', 'again']), /Unknown browser harness argument/);
  assert.throws(() => parseArguments(['scenario', '../private']), /Unknown browser harness argument/);
  assert.throws(() => parseArguments(['smoke', '--port', '5174']), /Unknown browser harness argument/);
  assert.throws(() => parseArguments(['scenario']), /scenario needs/);
});

test('QA ports stay above the reserved range', () => {
  assert.equal(assertPrivatePort(5191), 5191);
  for (const port of [0, 5174, 5190, 65536, NaN, 5200.5]) {
    assert.throws(() => assertPrivatePort(port), /Refusing non-private QA port/);
  }
});

test('private Chrome launch keeps native audio capture scheduled', () => {
  const profile = 'C:/qa-private-profile';
  const args = browserHarness.chromeLaunchArguments(profile);
  for (const switchName of [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--mute-audio',
    '--headless=new',
  ]) assert.ok(args.includes(switchName), `QA Chrome needs ${switchName}`);
  assert.ok(args.includes(`--user-data-dir=${profile}`));
  assert.ok(args.includes('--remote-debugging-port=0'));
});

test('console issues include errors and exceptions but not ordinary logs', () => {
  assert.deepEqual(consoleIssue({ method: 'Runtime.consoleAPICalled', params: { type: 'error', args: [{ value: 'failure' }] } }), { kind: 'console.error', text: 'failure' });
  assert.deepEqual(consoleIssue({ method: 'Runtime.exceptionThrown', params: { exceptionDetails: { text: 'Uncaught', exception: { description: 'boom' } } } }), { kind: 'exception', text: 'Uncaught: boom' });
  assert.deepEqual(consoleIssue({ method: 'Log.entryAdded', params: { entry: { level: 'error', text: 'missing', url: 'http://127.0.0.1:5191/a' } } }), { kind: 'browser log', text: 'missing (http://127.0.0.1:5191/a)' });
  assert.equal(consoleIssue({ method: 'Runtime.consoleAPICalled', params: { type: 'log', args: [{ value: 'okay' }] } }), null);
});

test('browser captures default to a dated ignored evidence folder, including audio recording', () => {
  evidenceCheck(typeof browserHarness.evidenceOutputDir === 'function', 'browser harness must expose its default evidence directory');
  const date = new Date('2026-09-24T12:34:56.000Z');
  for (const scenario of ['smoke', 'audio-race', 'weapon-audio']) {
    const output = browserHarness.evidenceOutputDir(scenario, date);
    const name = relative(browserHarness.PROJECT_ROOT, output).replaceAll('\\', '/');
    evidenceCheck(/^\.evidence\/2026-09-24\//.test(name), `${scenario} must default under dated .evidence: ${name}`);
    evidenceCheck(name.includes(`/${scenario}-`), `${scenario} evidence must have a separate run folder: ${name}`);
    evidenceCheck(!name.startsWith('..') && !name.startsWith('.qa-dist/') && !name.startsWith('docs/board/looks/'),
      `${scenario} raw capture must stay outside tracked review files and QA build output: ${name}`);
  }
});

test('explicit browser evidence paths stay inside the ignored root', () => {
  evidenceCheck(typeof browserHarness.resolveEvidenceDir === 'function', 'browser harness must validate explicit evidence folders');
  const approved = resolve(browserHarness.PROJECT_ROOT, '.evidence', '2026-09-24', 'CLEAN-03');
  evidenceCheck(browserHarness.resolveEvidenceDir(approved) === approved, 'an explicit path inside .evidence is accepted');
  for (const outside of [resolve(browserHarness.PROJECT_ROOT, 'docs/board/looks/raw'),
    resolve(browserHarness.PROJECT_ROOT, '.qa-dist/browser-output')]) {
    assert.throws(() => browserHarness.resolveEvidenceDir(outside), /evidence|outside|Refusing/i,
      `raw captures must reject ${outside}`);
    evidenceChecks++;
  }
});

// Navigation acceptance is not a new document or a usable context.
function navigationFixture(){
  const listeners=new Set(),calls=[];
  const cdp={onEvent(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    async send(method,params={},sessionId){calls.push({method,params,sessionId});
      if(method==='Page.getFrameTree')return{frameTree:{frame:{id:'main',loaderId:'old'}}};
      if(method==='Page.getNavigationHistory')return{currentIndex:1,entries:[{id:11},{id:22}]};
      if(method==='Page.navigate')return{frameId:'main',loaderId:'new'};
      if(method==='Runtime.evaluate')return{result:{value:true}};
      return{};
    }};
  const emit=(method,params,sessionId='session')=>{for(const fn of [...listeners])fn({method,params,sessionId});};
  const document=(loaderId='new',type='Navigation')=>emit('Page.frameNavigated',{frame:{id:'main',loaderId},type});
  const execution=(uniqueId='fresh')=>emit('Runtime.executionContextCreated',{context:{id:3,uniqueId,auxData:{frameId:'main',isDefault:true}}});
  const loaded=(loaderId='new')=>emit('Page.lifecycleEvent',{frameId:'main',loaderId,name:'DOMContentLoaded'});
  return{cdp,calls,emit,document,execution,loaded,listeners};
}
const turn=()=>new Promise(setImmediate);
test('single navigation waits for its own document/context and ignores stale/subframe events',async()=>{
  assert.equal(typeof browserHarness.createPageNavigation,'function');
  const f=navigationFixture(),nav=browserHarness.createPageNavigation(f.cdp,{sessionId:'session',targetId:'target'},'http://127.0.0.1:5191');
  let settled=false;const pending=nav.navigate('/tools/menu-check.html').then(()=>{settled=true;});await turn();
  assert.equal(f.calls.filter(c=>c.method==='Page.navigate').length,1);
  f.emit('Page.frameNavigated',{frame:{id:'child',parentId:'main',loaderId:'new'}});
  f.emit('Page.lifecycleEvent',{frameId:'main',loaderId:'old',name:'DOMContentLoaded'});
  f.emit('Runtime.executionContextCreated',{context:{id:1,uniqueId:'wrong',auxData:{frameId:'main',isDefault:true}}},'other');
  await turn();assert.equal(settled,false);assert.equal(f.calls.filter(c=>c.method==='Runtime.evaluate').length,0);
  f.document();f.loaded();await turn();assert.equal(settled,false,'commit/load without default context is insufficient');
  f.execution();await pending;
  assert.equal(f.calls.find(c=>c.method==='Runtime.evaluate').params.uniqueContextId,'fresh');
  assert.equal(f.listeners.size,0,'completed barrier releases listeners');
});
test('reload waits for a replacement and back follows BFCache guard reload exactly once',async()=>{
  assert.equal(typeof browserHarness.createPageNavigation,'function');
  for(const action of ['reload','back']){
    const f=navigationFixture(),nav=browserHarness.createPageNavigation(f.cdp,{sessionId:'session',targetId:'target'},'http://127.0.0.1:5191');
    let settled=false;const pending=nav[action]().then(()=>{settled=true;});await turn();
    if(action==='back'){
      assert.equal(f.calls.filter(c=>c.method==='Page.navigateToHistoryEntry').length,1);
      assert.equal(f.calls.find(c=>c.method==='Page.navigateToHistoryEntry').params.entryId,11);
      f.document('restored','BackForwardCacheRestore');f.execution('restored');f.loaded('restored');
      await turn();assert.equal(settled,false,'pageshow guard must reload before admission');
      f.emit('Runtime.executionContextsCleared',{});
    }else assert.equal(f.calls.filter(c=>c.method==='Page.reload').length,1);
    f.execution();f.document();f.loaded();await pending;
    assert.equal(f.calls.filter(c=>['Page.reload','Page.navigateToHistoryEntry'].includes(c.method)).length,1);
    assert.equal(f.listeners.size,0);
  }
});
test('navigation barrier propagates evaluation and target errors without mutation retries',async()=>{
  assert.equal(typeof browserHarness.createPageNavigation,'function');
  for(const failure of ['evaluation','detach']){
    const f=navigationFixture(),send=f.cdp.send;
    f.cdp.send=async(method,...args)=>{if(method==='Runtime.evaluate')throw Error('arbitrary evaluation failure');return send(method,...args);};
    const nav=browserHarness.createPageNavigation(f.cdp,{sessionId:'session',targetId:'target'},'http://127.0.0.1:5191');
    const pending=nav.navigate('/tools/menu-check.html');await turn();
    if(failure==='detach')f.emit('Target.detachedFromTarget',{sessionId:'session'},undefined);
    else{f.document();f.execution();f.loaded();}
    await assert.rejects(pending,/arbitrary evaluation failure|detached/);
    assert.equal(f.calls.filter(c=>c.method==='Page.navigate').length,1);
    assert.equal(f.listeners.size,0);
  }
});


test('one import action waits for fast real same-URL replacement before acknowledgement',async()=>{
  const f=navigationFixture(),send=f.cdp.send,url='http://127.0.0.1:5191/tools/menu-check.html?memory-backups=1';let actions=0;
  f.cdp.send=async(method,params={},sessionId)=>{
    if(method==='Page.getFrameTree')return{frameTree:{frame:{id:'main',loaderId:'old',url}}};
    if(method==='Runtime.evaluate'&&params.expression==='importCareerOnce()'){
      actions++;
      f.emit('Page.frameNavigated',{frame:{id:'main',loaderId:'new',url}});
      f.execution();f.loaded();
      return{result:{type:'undefined'}};
    }
    return send(method,params,sessionId);
  };
  const nav=browserHarness.createPageNavigation(f.cdp,{sessionId:'session',targetId:'target'},'http://127.0.0.1:5191');
  assert.equal(typeof nav.reloadAfterAction,'function');
  await nav.reloadAfterAction('importCareerOnce()');
  assert.equal(actions,1,'the serialized import action runs exactly once');
  assert.equal(f.calls.filter(c=>c.method==='Page.reload').length,0,'production import owns its one real reload');
  const probes=f.calls.filter(c=>c.method==='Runtime.evaluate');
  assert.equal(probes.length,1,'only the final selected context is probed after the action');
  assert.equal(probes[0].params.uniqueContextId,'fresh');
  assert.equal(f.listeners.size,0);
});

test('import action errors and unexpected destination are rejected without retries',async()=>{
  for(const failure of ['action-exception','action-protocol','destination','detach']){
    const f=navigationFixture(),send=f.cdp.send,url='http://127.0.0.1:5191/tools/menu-check.html?memory-backups=1';let actions=0;
    f.cdp.send=async(method,params={},sessionId)=>{
      if(method==='Page.getFrameTree')return{frameTree:{frame:{id:'main',loaderId:'old',url}}};
      if(method==='Runtime.evaluate'&&params.expression==='importCareerOnce()'){
        actions++;
        if(failure==='action-exception')return{exceptionDetails:{text:'real import exception'}};
        if(failure==='action-protocol')throw Error('real action protocol error');
        if(failure==='detach')f.emit('Target.detachedFromTarget',{sessionId:'session'},undefined);
        else f.emit('Page.frameNavigated',{frame:{id:'main',loaderId:'new',url:url+'&different=1'}});
        return{result:{type:'undefined'}};
      }
      return send(method,params,sessionId);
    };
    const nav=browserHarness.createPageNavigation(f.cdp,{sessionId:'session',targetId:'target'},'http://127.0.0.1:5191');
    assert.equal(typeof nav.reloadAfterAction,'function');
    await assert.rejects(nav.reloadAfterAction('importCareerOnce()'),/import exception|action protocol|destination|detached/);
    assert.equal(actions,1);assert.equal(f.calls.filter(c=>c.method==='Page.reload').length,0);assert.equal(f.listeners.size,0);
  }
});


test('shared QA bundles are explicitly requested and restricted to owned project QA leaves', async () => {
  assert.deepEqual(parseArguments(['scenario', 'night-race', '--qa-bundle', '.qa-dist/browser-suite-one']),
    {name: 'night-race', injectConsoleError: false, qaBundle: '.qa-dist/browser-suite-one'});
  assert.throws(() => parseArguments(['smoke', '--qa-bundle']), /qa-bundle/);
  assert.throws(() => parseArguments(['smoke', '--qa-bundle', 'one', '--qa-bundle', 'two']), /qa-bundle/);
  assert.equal(typeof browserHarness.resolveQaBundle, 'function');
  const root = browserHarness.PROJECT_ROOT;
  assert.equal(browserHarness.resolveQaBundle('.qa-dist/browser-suite-one'), resolve(root, '.qa-dist/browser-suite-one'));
  for (const path of ['.qa-dist', '.qa-dist/other', '.qa-dist/browser-suite-one/nested', '../elsewhere', 'dist', 'public'])
    assert.throws(() => browserHarness.resolveQaBundle(path), /QA bundle/);
  const verify = browserHarness.validateQaBundle;
  assert.equal(typeof verify, 'function');
  const bundle = resolve(root, '.qa-dist/browser-suite-one');
  const valid = {realPath: async path => path, read: async () => JSON.stringify({schema: 1, projectRoot: root, qa: true})};
  assert.equal(await verify(bundle, valid), bundle);
  await assert.rejects(verify(bundle, {...valid, realPath: async () => resolve(root, '../escape')}), /QA bundle/);
  await assert.rejects(verify(bundle, {...valid, read: async () => JSON.stringify({schema: 1, projectRoot: root, qa: false})}), /QA bundle/);
  await assert.rejects(verify(bundle, {...valid, read: async () => JSON.stringify({schema: 1, projectRoot: resolve(root, '../other'), qa: true})}), /QA bundle/);
});


test('actual QA build recipe uses one unique output and marks it only after a completed build', async () => {
  const root = browserHarness.PROJECT_ROOT, bundle = resolve(root, '.qa-dist/browser-suite-fixture');
  const calls = [], writes = [];
  const operations = {
    hasVite: () => true,
    makeDirectory: async path => {calls.push(['mkdir', path]);},
    makeTemp: async prefix => {calls.push(['temp', prefix]); return bundle;},
    start: (exe, args) => {calls.push(['launch', exe, args]); return 'handle';},
    wait: async handle => {assert.equal(handle, 'handle'); calls.push(['exit']);},
    read: async path => {assert.equal(path, resolve(bundle, 'tools/menu-check.html')); return '<meta charset="utf-8">';},
    write: async (path, value) => {writes.push([path, value]);},
    recycle: async path => {calls.push(['recycle', path]);},
  };
  assert.equal(await browserHarness.buildQaBundle(operations), bundle);
  assert.equal(calls.filter(row => row[0] === 'launch').length, 1);
  const args = calls.find(row => row[0] === 'launch')[2];
  assert.equal(args[1], 'build');
  assert.equal(args[args.indexOf('--outDir') + 1], bundle);
  assert.equal(args[args.indexOf('--config') + 1], 'tools/vite-qa.config.js');
  assert.ok(writes[0][1].includes('rel="icon"'));
  assert.deepEqual(JSON.parse(writes[1][1]), {schema: 1, projectRoot: root, qa: true});
  assert.ok(!calls.some(row => row[0] === 'recycle'), 'successful bundle stays alive until suite children drain');
  calls.length = 0; writes.length = 0;
  await assert.rejects(browserHarness.buildQaBundle({...operations, wait: async () => {throw Error('Vite failed');}}), /Vite failed/);
  assert.deepEqual(calls.at(-1), ['recycle', bundle]);
  assert.deepEqual(writes, [], 'failed build cannot advertise a completed bundle');
});


test('bundle cleanup recycles only the exact owned leaf and refuses redirected targets', async () => {
  const bundle = resolve(browserHarness.PROJECT_ROOT, '.qa-dist/browser-suite-owned');
  const calls = [];
  const operations = {platform: 'win32', realPath: async path => path,
    start: (exe, args) => {calls.push([exe, args]); return 'cleanup';},
    wait: async handle => {assert.equal(handle, 'cleanup');}};
  await browserHarness.recycleQaBundle(bundle, operations);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'powershell.exe');
  const script = Buffer.from(calls[0][1].at(-1), 'base64').toString('utf16le');
  assert.ok(script.includes('SendToRecycleBin'));
  assert.ok(script.includes(bundle));
  calls.length = 0;
  await assert.rejects(browserHarness.recycleQaBundle(bundle, {...operations,
    realPath: async () => resolve(browserHarness.PROJECT_ROOT, '.qa-dist/browser-suite-other')}), /QA bundle/);
  assert.equal(calls.length, 0, 'a redirected target must not reach cleanup');
  await assert.rejects(browserHarness.recycleQaBundle(resolve(browserHarness.PROJECT_ROOT, '.qa-dist'), operations), /QA bundle/);
  assert.equal(calls.length, 0);
});

test('explicit headed night launch preserves every default headless argument', () => {
  const profile = 'C:/qa-private-profile';
  assert.deepEqual(parseArguments(['scenario', 'frame-pacing', '--headed']),
    {name: 'frame-pacing', injectConsoleError: false, headed: true});
  assert.throws(() => parseArguments(['scenario', 'frame-pacing', '--headed', '--headed']), /headed/);
  const original = browserHarness.chromeLaunchArguments(profile);
  const headed = browserHarness.chromeLaunchArguments(profile, {headed: true});
  assert.deepEqual(headed, original.filter(arg => arg !== '--headless=new'));
  assert.ok(original.includes('--headless=new'), 'all ordinary scenarios retain headless mode');
  assert.ok(headed.includes(`--user-data-dir=${profile}`), 'headed mode retains disposable profile');
  assert.throws(() => browserHarness.chromeLaunchArguments(profile, {headed: 'yes'}), /headed/);
});
test('launch metadata follows the actual Chrome argv, not tab visibility', () => {
  const metadata = browserHarness.browserLaunchMetadata;
  assert.equal(typeof metadata, 'function');
  assert.deepEqual(metadata(browserHarness.chromeLaunchArguments('private')),
    {headed: false, launchMode: 'headless'});
  assert.deepEqual(metadata(browserHarness.chromeLaunchArguments('private', {headed: true})),
    {headed: true, launchMode: 'headed'});
});

test('a browser that will not close is ended with its helpers, and its pipes are released', async () => {
  // Stand-in for Chrome: it starts a helper that shares its output pipes and then ignores every request.
  const helperCode = "setInterval(()=>{},1000)";
  const browserCode = "const {spawn}=require('node:child_process');const h=spawn(process.execPath,['-e',process.argv[1]],{stdio:'inherit'});console.log('helper '+h.pid);setInterval(()=>{},1000)";
  const child = spawn(process.execPath, ['-e', browserCode, helperCode], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const helperPid = await new Promise(done => child.stdout.once('data', chunk => done(Number(/helper (\d+)/.exec(chunk.toString())?.[1]))));
  assert.ok(helperPid > 0, 'stand-in browser reported its helper');
  const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const stuckConnection = { send: () => new Promise(() => {}), close() {} };
  const started = Date.now();
  await browserHarness.stopBrowser(stuckConnection, { child }, 300);
  assert.ok(Date.now() - started < 8000, 'a stuck Browser.close does not hold the harness');
  assert.ok(child.stdout.destroyed && child.stderr.destroyed, 'the browser output pipes were released');
  await new Promise(done => child.exitCode === null ? child.once('exit', done) : done());
  if (process.platform === 'win32') {
    for (let wait = 0; wait < 20 && alive(helperPid); wait++) await new Promise(done => setTimeout(done, 100));
    assert.equal(alive(helperPid), false, 'the browser helper program was ended with the browser');
  }
  if (alive(helperPid)) process.kill(helperPid);
});
