// Explicit QA entry only. No test globals, storage overrides or fake transport
// are imported by the production page. Build with npm run qa:build first.
import {installIsolatedStorage} from './qa-storage.js';
import {BUILD_MANIFEST_FILE,BUILD_VERSION} from '../src/build-version.js';
installIsolatedStorage();
const params=new URLSearchParams(location.search);
const mode=params.get('manifest') || 'available';
const realFetch=window.fetch.bind(window);
const expected=new URL(BUILD_MANIFEST_FILE,new URL(BUILD_VERSION.base,location.href));
let requests=0,aborts=0,releasePending=null,statusNote='';
let updateTelemetry=()=>{};
const manifest={schema:1,id:`qa-next-${BUILD_VERSION.id}`,label:'QA UPDATE · newer build',builtAt:new Date().toISOString()};
window.fetch=(input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
  if(url.origin!==expected.origin || url.pathname!==expected.pathname)return realFetch(input,init);
  requests++;updateTelemetry();
  if(mode==='offline')return Promise.reject(new TypeError('QA offline manifest'));
  if(mode==='missing')return Promise.resolve(new Response('Missing',{status:404}));
  if(mode==='malformed')return Promise.resolve(new Response('<html>Not a manifest</html>'));
  if(mode==='pending')return new Promise((resolve,reject)=>{
    const abort=()=>{aborts++;releasePending=null;updateTelemetry();reject(new DOMException('QA cancelled','AbortError'));};
    init.signal.addEventListener('abort',abort,{once:true});
    releasePending=()=>{init.signal.removeEventListener('abort',abort);releasePending=null;resolve(new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));};
  });
  return Promise.resolve(new Response(JSON.stringify(mode==='current'?BUILD_VERSION:manifest),{headers:{'Content-Type':'application/json'}}));
};
const {app}=await import('../src/main.js');
app.audio.setMuted(true);
const panel=document.createElement('details');panel.open=true;
panel.setAttribute('aria-label','Temporary build update review');
panel.style.cssText='position:fixed;left:12px;top:76px;z-index:999;width:min(385px,calc(100vw - 24px));max-height:50vh;overflow:auto;padding:10px 12px;background:#10212cf0;border:1px solid #7198a0;border-radius:4px;color:#eff4ec;font:12px/1.5 system-ui';
const summary=document.createElement('summary');summary.textContent='BUILD UPDATE QA · MEMORY SAVES ONLY';summary.style.cursor='pointer';panel.append(summary);
const note=document.createElement('p');note.textContent='This is the real menu. Only its version request is simulated. Reload stays on this QA page and clears its temporary data.';panel.append(note);
const modes=document.createElement('nav');modes.setAttribute('aria-label','Manifest response');modes.style.cssText='display:flex;gap:8px;flex-wrap:wrap';panel.append(modes);
for(const name of ['available','current','offline','missing','malformed','pending']){
  const link=document.createElement('a'),url=new URL(location.href);url.searchParams.set('manifest',name);
  link.href=url.href;link.textContent=name;link.style.cssText=`color:${name===mode?'#ffd992':'#d2e4ee'};text-decoration:underline`;
  if(name===mode)link.setAttribute('aria-current','page');modes.append(link);
}
const nav=document.createElement('nav');nav.setAttribute('aria-label','Update review actions');nav.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:9px';panel.append(nav);
const output=document.createElement('output');output.id='update-qa-telemetry';output.style.cssText='display:block;white-space:pre-wrap;margin-top:8px;font:11px/1.5 monospace';panel.append(output);document.body.append(panel);
function race(){
  if(app.duel.state.status!=='menu')app.requestNavigation('menu');
  app.startCampaign({car:'falcone_f42',startStage:0,difficulty:'casual',mode:'timetrial',cpuDifficulty:'medium'});
  app.stop();app.duel.state.status='racing';app.duel.state.paused=false;app.audio.setPaused(true);
}
function paint(){app.onFrame?.(app.duel.state);updateTelemetry();}
for(const [name,callback]of[
  ['Race (frozen)',()=>{race();paint();}],
  ['Menu',()=>{app.requestNavigation('menu');paint();}],
  ['Race + stale Reload',()=>{race();document.querySelector('[data-action="reload-update"]').click();statusNote='Stale reload click was ignored; race remains here.';paint();}],
  ['Focus × 20',()=>{for(let i=0;i<20;i++)window.dispatchEvent(new Event('focus'));updateTelemetry();}],
  ['Resolve pending',()=>{releasePending?.();updateTelemetry();}],
  ['Double Reload',()=>{const button=document.querySelector('[data-action="reload-update"]');button.click();button.click();}],
  ['Hide QA panel',()=>{panel.open=false;}],
]){
  const button=document.createElement('button');button.type='button';button.textContent=name;
  button.style.cssText='padding:7px 8px;background:#29434a;color:white;border:1px solid #78969c;border-radius:3px;cursor:pointer';
  button.onclick=callback;nav.append(button);
}
updateTelemetry=()=>{
  output.textContent=`${BUILD_VERSION.production?'BUILT QA':'DEV: update checks intentionally disabled; use qa:build'}\nMode: ${mode} · requests: ${requests} · aborts: ${aborts}\nStatus: ${app.duel.state.status} · saved credits: ${app.profile.credits}\n${statusNote}`;
};
updateTelemetry();
// Optional CPU/pass attribution through the real production main.onFrame. Use
// normal Start Engine; the frozen fixture deliberately stops the App loop.
let performanceReview;
if(params.get('profile')==='1'){
  const {installPerformanceReview}=await import('./performance-review.js');
  performanceReview=installPerformanceReview(app,document.querySelector('#view3d'),nav,{hudSource:'production main HUD'});
}
if(import.meta.hot)import.meta.hot.dispose(()=>{performanceReview?.dispose();window.fetch=realFetch;panel.remove();});
