import assert from 'node:assert/strict';
import test from 'node:test';
import { after } from 'node:test';
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
