import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {screenMarkup, updateBuildNotice} from '../src/screen-menu.js';
import {createBuildUpdateChecker,UPDATE_CHECK_INTERVAL_MS,UPDATE_REQUEST_TIMEOUT_MS} from '../src/build-update.js';
import {BUILD_VERSION,DEVELOPMENT_BUILD,parseBuildManifest} from '../src/build-version.js';
import {buildVersionPlugin} from './build-version-plugin.mjs';

let checks=0;
const check=(value,label)=>{assert(value,label);checks++;};
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
const current={schema:1,id:'release-current',label:'26.09.19 12:00 UTC · abc123',builtAt:'2026-09-19T12:00:00.000Z',production:true,base:'/'};
const newer={schema:1,id:'release-next',label:'26.09.19 12:01 UTC · def456',builtAt:'2026-09-19T12:01:00.000Z'};
const response=(body=newer,extra={})=>({ok:true,redirected:false,url:'http://localhost:5174/build-version.json',text:async()=>typeof body==='string'?body:JSON.stringify(body),...extra});
function fixture(options={}) {
  let status='menu',clock=0,timerId=0,reloads=0;
  const window=new EventTarget(),document=new EventTarget(),lifecycle=new AbortController();
  document.hidden=false;
  const calls=[],changes=[],timers=new Map();
  const checker=createBuildUpdateChecker({build:current,getStatus:()=>status,location:{href:'http://localhost:5174/?player=kept'},
    eventTarget:window,documentTarget:document,signal:lifecycle.signal,now:()=>clock,
    setTimer:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimer:id=>timers.delete(id),
    reload:()=>reloads++,onChange:value=>changes.push(value),
    fetchVersion:(url,init)=>new Promise((resolve,reject)=>calls.push({url,init,resolve,reject})),...options});
  return {checker,calls,changes,timers,window,document,lifecycle,
    setStatus:value=>{status=value;},advance:(amount=UPDATE_CHECK_INTERVAL_MS)=>{clock+=amount;},
    focus:()=>window.dispatchEvent(new Event('focus')),
    visible:value=>{document.hidden=!value;document.dispatchEvent(new Event('visibilitychange'));},
    get reloads(){return reloads;},get latest(){return changes.at(-1);}};
}

// A missing Vite define is a quiet, importable development build in Node.
equal(BUILD_VERSION,DEVELOPMENT_BUILD,'plain Node import has a safe dev fallback');
check(Object.isFrozen(BUILD_VERSION),'client build identity is immutable');
equal(parseBuildManifest(newer),newer,'valid manifest is copied to the narrow schema');
check(Object.isFrozen(parseBuildManifest(newer)),'server manifest is immutable after validation');
for(const bad of [null,[],{},'value',{...newer,schema:2},{...newer,id:''},{...newer,id:'../elsewhere'},
  {...newer,id:'x'.repeat(81)},{...newer,label:''},{...newer,label:'\nunsafe'},
  {...newer,label:'x'.repeat(65)},{...newer,builtAt:'yesterday'},{...newer,builtAt:'2026-09-19'},
  {...newer,builtAt:Infinity}]) equal(parseBuildManifest(bad),null,'malformed manifest is rejected');

let clockCalls=0,nonceCalls=0;
const plugin=buildVersionPlugin({now:()=>{clockCalls++;return new Date(newer.builtAt);},nonce:()=>{nonceCalls++;return 'abcdef123456';}});
const firstDefine=plugin.config({}, {command:'build'}).define;
const secondDefine=plugin.config({}, {command:'build'}).define;
equal(firstDefine,secondDefine,'repeat configuration cannot change a release identity');
equal([clockCalls,nonceCalls],[1,1],'timestamp and identity are generated once per build');
const injected=JSON.parse(firstDefine.__DUEL_BUILD_VERSION__);
check(injected.production&&injected.base==='/'&&injected.id==='20260919120100-abcdef123456','production define is fixed and uses the same-origin base');
check(injected.label==='26.09.19 12:01 UTC · abcdef','friendly build label contains the UTC date, time and short identity');
const emitted=[];plugin.generateBundle.call({emitFile:asset=>emitted.push(asset)});
equal(emitted[0].fileName,'build-version.json','build emits the fixed manifest filename');
equal(JSON.parse(emitted[0].source),parseBuildManifest(injected),'emitted manifest exactly identifies the bundled release');
const dev=buildVersionPlugin();
equal(JSON.parse(dev.config({}, {command:'serve'}).define.__DUEL_BUILD_VERSION__),DEVELOPMENT_BUILD,'dev serves a dev marker');
dev.generateBundle.call({emitFile:()=>assert.fail('dev must not emit a release manifest')});checks++;
const other=buildVersionPlugin({now:()=>new Date(newer.builtAt),nonce:()=> 'different123'});
check(JSON.parse(other.config({}, {command:'build'}).define.__DUEL_BUILD_VERSION__).id!==injected.id,'separate builds at the same timestamp have separate identities');
let middleware;
plugin.configurePreviewServer({config:{base:'/duel/'},middlewares:{use:fn=>{middleware=fn;}}});
for(const [url,expected] of [['/duel/build-version.json?check=unique','no-store, max-age=0'],['/duel/','no-cache'],['/duel/index.html','no-cache'],['/duel/assets/main.js',undefined],['/other/build-version.json',undefined]]) {
  const headers={};let next=0;
  middleware({url},{setHeader:(name,value)=>{headers[name]=value;}},()=>next++);
  equal(headers['Cache-Control'],expected,`preview cache policy is scoped to ${url}`);
  equal(next,1,'preview cache middleware always continues the request');
}
for(const path of ['../vite.config.js','./vite-qa.config.js'])
  check(readFileSync(new URL(path,import.meta.url),'utf8').includes('plugins:')&&readFileSync(new URL(path,import.meta.url),'utf8').includes('buildVersionPlugin()'),'production and QA use the shared version plugin');

const basic=fixture();basic.checker.syncState();await flush();
equal(basic.calls.length,1,'initial menu starts one version check');
check(basic.latest.available===false,'no speculative update notice before a valid response');
const firstRequest=basic.calls[0];
equal(new URL(firstRequest.url).origin,'http://localhost:5174','manifest request preserves the current origin and port');
equal(new URL(firstRequest.url).pathname,'/build-version.json','manifest is loaded from the build base');
check(new URL(firstRequest.url).searchParams.has('check'),'manifest URL has a unique cache-busting query');
equal({cache:firstRequest.init.cache,credentials:firstRequest.init.credentials,redirect:firstRequest.init.redirect},
  {cache:'no-store',credentials:'same-origin',redirect:'error'},'fetch cannot reuse cached manifests or follow another origin');
equal([...basic.timers.values()].map(timer=>timer.delay),[UPDATE_REQUEST_TIMEOUT_MS],'one bounded timeout belongs to the request');
for(let i=0;i<50;i++){basic.focus();basic.visible(true);basic.checker.syncState();}
equal(basic.calls.length,1,'duplicate frame, focus and visibility events share the one pending request');
const samePending=basic.checker.check();equal(samePending,basic.checker.check(),'explicit overlapping checks return the same promise');
firstRequest.resolve(response());await flush();
check(basic.latest.available&&basic.latest.version.id===newer.id,'a different valid release shows a menu update');
equal(basic.timers.size,0,'successful requests release their timeout');
const changeCount=basic.changes.length;
for(let i=0;i<50;i++)basic.checker.syncState();
equal(basic.changes.length,changeCount,'steady menu frames do not repeat live-region announcements');
basic.focus();await flush();equal(basic.calls.length,1,'focus checks are throttled for one minute');
basic.advance();for(let i=0;i<50;i++)basic.checker.syncState();await flush();
equal(basic.calls.length,1,'time passing and game frames do not poll the server');
basic.focus();await flush();equal(basic.calls.length,2,'a later focus permits one new bounded check');
check(basic.calls[1].url!==firstRequest.url,'every actual request has a different cache key');
basic.calls[1].resolve(response());await flush();
equal(basic.changes.length,changeCount,'the same available release does not repeat its announcement');
check(basic.checker.requestReload(),'explicit menu reload succeeds when an update is available');
check(!basic.checker.requestReload(),'duplicate reload clicks are ignored');
equal(basic.reloads,1,'reload happens exactly once and only after the click');
check(!basic.latest.available,'reload clears the notice');
basic.advance();basic.focus();await flush();equal(basic.calls.length,2,'no new checks start while reloading');
basic.checker.dispose();

for(const status of ['countdown','racing','ticket','stageWon','gameover','complete']) {
  const h=fixture();h.setStatus(status);h.checker.syncState();h.focus();await flush();
  equal(h.calls.length,0,`${status} never initiates a version check`);
  check(!h.checker.requestReload(),`${status} cannot reload`);
  h.setStatus('menu');h.checker.syncState();await flush();h.calls[0].resolve(response());await flush();
  check(h.latest.available,`${status} fixture first confirms an update at menu`);
  h.setStatus(status);
  check(!h.checker.requestReload(),`a stale menu button cannot reload after ${status} begins, even before render`);
  h.checker.syncState();check(!h.latest.available,`${status} hides the notice immediately on render`);
  equal(h.reloads,0,`${status} never causes a navigation`);
  h.checker.dispose();
}

const stale=fixture();stale.checker.syncState();await flush();const obsolete=stale.calls[0];
stale.setStatus('racing');stale.checker.syncState();
check(obsolete.init.signal.aborted,'starting a race aborts an in-flight manifest request');
equal(stale.timers.size,0,'starting a race clears the request timeout');
stale.advance();stale.setStatus('menu');stale.checker.syncState();await flush();
equal(stale.calls.length,2,'a later menu entry can start a new request');
obsolete.resolve(response({...newer,id:'obsolete-response'}));await flush();
check(!stale.latest.available,'a response from a cancelled race-era check cannot show a notice');
equal(stale.timers.size,1,'the old request cannot clear the new request timeout');
stale.calls[1].resolve(response());await flush();
equal(stale.latest.version.id,newer.id,'only the current request may publish its result');
stale.checker.dispose();

const hidden=fixture();hidden.document.hidden=true;hidden.checker.syncState();await flush();
equal(hidden.calls.length,0,'background tabs do not start checks');
hidden.visible(true);await flush();equal(hidden.calls.length,1,'returning to a visible menu checks once');
hidden.visible(false);check(hidden.calls[0].init.signal.aborted,'hiding the page aborts an active check');
hidden.calls[0].resolve(response());await flush();check(!hidden.latest.available,'a hidden, aborted response cannot publish');
hidden.checker.dispose();

const restored=fixture();restored.checker.syncState();await flush();restored.calls[0].resolve(response());await flush();
restored.window.dispatchEvent(new Event('pagehide'));check(!restored.latest.available,'pagehide suspends the update UI');
check(!restored.checker.requestReload(),'suspended page cannot reload');
restored.advance();restored.window.dispatchEvent(new Event('pageshow'));await flush();
check(restored.latest.available,'BFCache pageshow restores a known update only at menu');
equal(restored.calls.length,2,'BFCache return can make one bounded refresh without installing duplicate listeners');
restored.calls[1].resolve(response(current));await flush();check(!restored.latest.available,'matching server release removes an earlier notice');
restored.checker.dispose();

for(const reply of [()=>Promise.reject(new Error('offline')),()=>response({}, {ok:false}),
  ()=>response({}, {ok:false,status:404}),()=>response('not JSON'),()=>response('<html>SPA fallback</html>'),
  ()=>response({schema:2,...newer,schema:2}),()=>response({...newer,id:'bad id'}),
  ()=>response(' '.repeat(2049)),()=>response(newer,{redirected:true}),
  ()=>response(newer,{type:'opaque'}),()=>response(newer,{url:'https://other.example/build-version.json'}),
  ()=>response(newer,{text:async()=>{throw new Error('body interrupted');}})]) {
  const h=fixture();h.checker.syncState();await flush();
  try {h.calls[0].resolve(await reply());} catch(error) {h.calls[0].reject(error);}
  await flush();check(!h.latest.available,'offline, missing, malformed and unsafe responses stay quiet');
  equal(h.timers.size,0,'failed response clears its timeout');
  check(!h.checker.requestReload()&&h.reloads===0,'failed response never enables reload');h.checker.dispose();
}
const timeout=fixture();timeout.checker.syncState();await flush();const timedRequest=timeout.calls[0];
[...timeout.timers.values()][0].fn();
check(timedRequest.init.signal.aborted&&!timeout.latest.available,'request deadline aborts quietly');
equal(timeout.timers.size,0,'timeout releases all timer ownership');
timeout.advance();timeout.focus();await flush();equal(timeout.calls.length,2,'timed-out request does not block a later check');
timedRequest.resolve(response());await flush();check(!timeout.latest.available,'a timed-out response is ignored even if fetch ignores abort');
timeout.calls[1].resolve(response());await flush();check(timeout.latest.available,'a later successful request still works');timeout.checker.dispose();

for(const option of [{build:DEVELOPMENT_BUILD},{location:{href:'file:///tmp/game.html'}},
  {build:{...current,base:'https://elsewhere.example/'}},{fetchVersion:null}]) {
  const h=fixture(option);h.checker.syncState();h.focus();h.visible(true);await flush();
  equal(h.calls.length,0,'dev, unsupported origins and missing fetch stay offline');
  check(!h.latest.available&&!h.checker.requestReload(),'disabled checker exposes no update or reload');h.checker.dispose();
}
const base=fixture({build:{...current,base:'/game/'}});base.checker.syncState();await flush();
equal(new URL(base.calls[0].url).pathname,'/game/build-version.json','subpath deployments fetch the matching manifest');base.checker.dispose();

for(const dispose of [h=>h.checker.dispose(),h=>h.lifecycle.abort()]) {
  const h=fixture();h.checker.syncState();await flush();const obsolete=h.calls[0],before=h.changes.length;
  dispose(h);dispose(h);
  check(obsolete.init.signal.aborted,'UI disposal aborts its fetch exactly once');
  equal(h.timers.size,0,'UI disposal clears all owned timers');
  h.advance();h.focus();h.visible(true);h.window.dispatchEvent(new Event('pageshow'));h.checker.syncState();
  obsolete.resolve(response());await flush();
  equal(h.calls.length,1,'disposed listeners and methods cannot start another request');
  equal(h.changes.length,before,'disposal and late responses cannot touch a replaced UI');
  check(!h.checker.requestReload()&&h.reloads===0,'disposed UI cannot reload');
}
const alreadyAborted=new AbortController();alreadyAborted.abort();
const inert=fixture({signal:alreadyAborted.signal});inert.checker.syncState();inert.focus();await flush();
equal(inert.calls.length,0,'an already-disposed UI installs no active checker');

// Inspect the production markup and execute its actual rendering callback, not
// a second hand-written UI implementation. No browser or WebGL is required.
const main=readFileSync(new URL('../src/screen-router.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
const menu=screenMarkup({choices:{car:'falcone_f42',cpuDifficulty:'medium',difficulty:'arcade',startStage:0},arrow:'',sound:'',escapeHTML:value=>String(value).replaceAll('<','&lt;')});
const card=menu.match(/<aside id="build-update"[\s\S]*?<\/aside>/)?.[0];
check(!!card&&/aria-label="Game update" hidden/.test(card),'update card starts hidden inside the menu, not the race HUD');
check(/role="status" aria-live="polite" aria-atomic="true"/.test(card),'update message is a polite, atomic live region');
check(/<button type="button" data-action="reload-update" aria-describedby="build-update-help">RELOAD<\/button>/.test(card),'reload is a native keyboard-accessible button with its help associated');
check(menu.includes(`BUILD ${BUILD_VERSION.label}`)&&/id="build-version"/.test(menu),'menu exposes the immutable build label');
check(/case 'reload-update': buildUpdates.requestReload\(\); return;/.test(main),'delegated click uses the menu-guarded controller method');
check(/function renderState\(s\) \{\s*buildUpdates.syncState\(\);/.test(main),'actual render lifecycle synchronizes menu eligibility');
check(/signal:domEvents.signal/.test(main)&&/hot.dispose\(\(\)=>\{uiDisposed=true;domEvents.abort\(\)/.test(main),'HMR disposal aborts the update controller with all other DOM listeners');
check(main.includes('onChange:change=>updateBuildNotice(ui,uiDisposed,change)'),'production router calls the imported notice renderer');
const ui={'build-update':{hidden:true},'build-update-message':{textContent:''}};
const render=(ui,disposed,available,version)=>updateBuildNotice(ui,disposed,{available,version});
render(ui,false,true,{label:'<img src=x onerror=bad()> version'});
equal(ui['build-update-message'].textContent,'Update available · <img src=x onerror=bad()> version','server label is rendered as text, never markup');
check(!ui['build-update'].hidden,'available notice becomes visible');
render(ui,true,false,null);check(!ui['build-update'].hidden,'disposed main UI rejects late callback writes');
render(ui,false,false,null);check(ui['build-update'].hidden&&ui['build-update-message'].textContent==='','race and unavailable states hide and clear the notice');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
check(/\.build-update button:focus-visible/.test(css),'reload button has a visible keyboard focus style');
// Find the intrinsic-height rule itself; unrelated responsive driver styles
// can legitimately follow it in the stylesheet.
const uncompressed=css.match(/@media\(max-width:700px\)\{([^{}]+)\{flex-shrink:0\}/)?.[1].split(',') || [];
for(const child of ['.menu-intro','section','.menu-footer','.build-update'])
  check(uncompressed.includes(`.in-menu .menu-screen>${child}`),`mobile ${child} keeps its intrinsic height in the scrolling menu`);
check(/\.in-menu \.menu-screen\{[^}]*overflow-y:auto/.test(css),'menu retains vertical scrolling instead of squeezing its contents');
const qa=readFileSync(new URL('./update-check.js',import.meta.url),'utf8');
check(qa.indexOf('installIsolatedStorage();')<qa.indexOf("await import('../src/main.js')"),'update QA isolates saves before importing the actual UI');
check(/url.origin!==expected.origin \|\| url.pathname!==expected.pathname/.test(qa),'QA transport interception is limited to the exact same-origin version manifest');
check(!main.includes('update-check')&&!main.includes('qa-storage'),'production entry has no QA transport or save overrides');

console.log(`Build updates: ${checks} identity, cache, menu-only reload, lifecycle, failure and accessibility checks passed.`);
