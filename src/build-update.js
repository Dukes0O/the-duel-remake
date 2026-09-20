import {BUILD_MANIFEST_FILE,BUILD_VERSION,parseBuildManifest} from './build-version.js';

export const UPDATE_CHECK_INTERVAL_MS = 60_000;
export const UPDATE_REQUEST_TIMEOUT_MS = 4_000;

// This controller has no access to player storage or game mutations. The only
// navigation it can perform is an explicit, menu-guarded reload of this page.
export function createBuildUpdateChecker({
  build=BUILD_VERSION,getStatus,onChange=()=>{},
  fetchVersion=globalThis.fetch?.bind(globalThis),location=globalThis.location,
  eventTarget=globalThis.window,documentTarget=globalThis.document,
  reload=()=>location.reload(),now=()=>Date.now(),
  setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,signal,
}={}) {
  const events = new AbortController();
  let disposed=false,suspended=false,wasMenu=false,pending=null,candidate=null;
  let lastCheck=-Infinity,sequence=0,published=null,reloading=false;
  let manifestURL;
  try {
    const page = new URL(location.href);
    manifestURL = new URL(BUILD_MANIFEST_FILE,new URL(build.base || '/',page));
    if (manifestURL.origin !== page.origin || !/^https?:$/.test(page.protocol)) manifestURL=null;
  } catch { manifestURL=null; }
  const enabled = build.production === true && !!parseBuildManifest(build) && !!manifestURL && typeof fetchVersion === 'function';
  const atMenu = () => !disposed && !suspended && getStatus?.() === 'menu';
  const canCheck = () => enabled && atMenu() && !documentTarget?.hidden && !reloading;

  function publish() {
    if (disposed) return;
    const visible = enabled && atMenu() && candidate && !reloading ? candidate : null;
    const key = visible?.id || '';
    if (key === published) return;
    published=key;
    onChange({available:!!visible,version:visible});
  }
  function stopRequest(request=pending) {
    if (!request || pending !== request) return;
    pending=null;
    clearTimer(request.timer);
    request.controller.abort();
  }
  function fail(request) {
    if (disposed || pending !== request) return;
    candidate=null;
    stopRequest(request);
    publish();
  }
  function check() {
    if (!canCheck()) {
      stopRequest();
      publish();
      return Promise.resolve(false);
    }
    if (pending) return pending.promise;
    const checkedAt = now();
    if (checkedAt >= lastCheck && checkedAt-lastCheck < UPDATE_CHECK_INTERVAL_MS) return Promise.resolve(false);
    lastCheck=checkedAt;
    const request = {controller:new AbortController(),timer:null,promise:null};
    pending=request;
    const url = new URL(manifestURL);
    // cache:no-store also works on ordinary static servers; the unique query
    // prevents old intermediary caches from reusing a previous response.
    url.searchParams.set('check',`${build.id}-${checkedAt}-${++sequence}`);
    request.timer=setTimer(()=>fail(request),UPDATE_REQUEST_TIMEOUT_MS);
    request.promise=Promise.resolve().then(()=>{
      if (pending !== request || !canCheck()) return null;
      return fetchVersion(url.href,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:request.controller.signal});
    }).then(async response=>{
      if (!response || pending !== request || !canCheck()) return false;
      if (!response.ok || response.redirected || response.type === 'opaque') throw new Error('Manifest unavailable');
      if (response.url && new URL(response.url).origin !== manifestURL.origin) throw new Error('Manifest origin changed');
      const body=await response.text();
      if (body.length > 2048) throw new Error('Manifest too large');
      const serverBuild=parseBuildManifest(JSON.parse(body));
      if (!serverBuild) throw new Error('Invalid manifest');
      if (pending !== request || !canCheck()) return false;
      candidate=serverBuild.id === build.id ? null : serverBuild;
      publish();
      return !!candidate;
    }).catch(()=>{
      fail(request);
      return false;
    }).finally(()=>{
      // An aborted request may finish after a newer one. It owns only its own
      // timer and must never clear that newer request or change its notice.
      clearTimer(request.timer);
      if (pending === request) pending=null;
    });
    return request.promise;
  }
  function syncState() {
    const menu=atMenu();
    if (!menu) stopRequest();
    publish();
    const entered=menu && !wasMenu;
    wasMenu=menu;
    if (entered) void check();
  }
  function requestReload() {
    // Read the live state, not the last rendered screen or the click target.
    if (!enabled || !atMenu() || !candidate || reloading) return false;
    reloading=true;
    stopRequest();
    publish();
    reload();
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed=true;
    stopRequest();
    events.abort();
    signal?.removeEventListener('abort',dispose);
    candidate=null;
  }
  if (signal?.aborted) dispose();
  else if (enabled) {
    const options={signal:events.signal};
    eventTarget?.addEventListener('focus',()=>void check(),options);
    documentTarget?.addEventListener('visibilitychange',()=>void check(),options);
    eventTarget?.addEventListener('pagehide',()=>{suspended=true;stopRequest();publish();},options);
    eventTarget?.addEventListener('pageshow',()=>{suspended=false;syncState();void check();},options);
    signal?.addEventListener('abort',dispose,{once:true});
  }
  return Object.freeze({syncState,check,requestReload,dispose});
}
