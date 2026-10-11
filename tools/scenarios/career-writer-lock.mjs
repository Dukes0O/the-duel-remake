import assert from 'node:assert/strict';

const entry='/tools/preview.html?career-writer-lock=1';
const fixtureKey='the-duel-writer-lock-fixture';
const fixtureValue=JSON.stringify({player:'Synthetic Kyle',bestLapMs:71234});
const ready=`!!window.__qaApp && !!document.querySelector('#stage.in-menu') &&
  !!window.__duelQaBackupStore && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`;

// Exercise production startup using native shared-name Web Locks. The preview
// entry installs only disposable memory careers before importing main.js.
export async function run(context){
  assert.notEqual(new URL(context.baseURL).port,'5174');
  const sharedName='the-duel-private-writer-proof-'+Date.now();
  await context.command('Page.addScriptToEvaluateOnNewDocument',{source:`(() => {
    window.__writerProofErrors=[];
    const expected=error=>error?.code==='CAREER_WRITER_BUSY'||error?.code==='CAREER_WRITER_UNAVAILABLE';
    window.addEventListener('unhandledrejection',event=>{
      if(expected(event.reason)){window.__writerProofErrors.push(event.reason.code);event.preventDefault();}
    });
    window.addEventListener('error',event=>{
      if(expected(event.error)){window.__writerProofErrors.push(event.error.code);event.preventDefault();}
    });
    window.__writerNativeDbOpens=0;
    IDBFactory.prototype.open=function(){window.__writerNativeDbOpens++;throw Error('Writer proof must use memory-only backups');};
    if(location.search.includes('writer-unavailable=1')){
      Object.defineProperty(navigator,'locks',{configurable:true,value:null});
      return;
    }
    const native=navigator.locks;
    window.__writerNativeLockManager=native;
    const request=native.request.bind(native);
    Object.defineProperty(navigator,'locks',{configurable:true,value:{
      request(name,options,callback){
        if(name.startsWith('the-duel-career-writer-v1'))name=${JSON.stringify(sharedName)};
        return request(name,options,callback);
      },query:()=>native.query(),
    }});
  })();`});
  await context.navigate(entry);
  await context.waitFor(ready,'first native writer with memory-only career',60_000);
  const first=await context.evaluate(`(async()=>{
    localStorage.setItem(${JSON.stringify(fixtureKey)},${JSON.stringify(fixtureValue)});
    await localStorage.flush();
    const state=await navigator.locks.query();
    return {held:state.held.filter(lock=>lock.name===${JSON.stringify(sharedName)}).length,
      value:localStorage.getItem(${JSON.stringify(fixtureKey)}),opens:window.__writerNativeDbOpens,
      timeOrigin:performance.timeOrigin};
  })()`);
  assert.equal(first.held,1);assert.equal(first.value,fixtureValue);assert.equal(first.opens,0);

  // A real popup has its own document and startup, but the same native origin
  // lock. Clone only the primary tab's synthetic memory snapshot into it.
  await context.evaluate(`(() => {
    const child=window.open('about:blank','writer-contender');
    if(!child)throw Error('Native two-tab proof could not open the contender');
    window.__writerContender=child;child.name=window.name;
    child.document.head.innerHTML='<base href="'+location.origin+'/"><title>Writer contender</title>';
    child.document.body.innerHTML='<div id="app"></div>';
    child.__writerNativeDbOpens=0;child.__writerProofErrors=[];
    child.IDBFactory.prototype.open=function(){child.__writerNativeDbOpens++;throw Error('Memory-only writer proof');};
    child.addEventListener('unhandledrejection',event=>{
      if(event.reason?.code?.startsWith('CAREER_WRITER_')){child.__writerProofErrors.push(event.reason.code);event.preventDefault();}
    });
    const native=child.navigator.locks,request=native.request.bind(native);
    Object.defineProperty(child.navigator,'locks',{configurable:true,value:{
      request(name,options,callback){return request(name.startsWith('the-duel-career-writer-v1')?${JSON.stringify(sharedName)}:name,options,callback);},
      query:()=>native.query(),
    }});
    const script=child.document.createElement('script');script.type='module';
    script.src=document.querySelector('script[type="module"]').src;child.document.body.append(script);
  })()`);
  await context.waitFor(`window.__writerContender?.document.querySelector('#writer-error')`,
    'second native tab refused before App startup',60_000);
  const blocked=await context.evaluate(`(() => {
    const child=window.__writerContender;
    return {message:child.document.querySelector('#writer-error').textContent,
      app:!!child.__qaApp,exportButton:!!child.document.querySelector('#backup-export'),
      opens:child.__writerNativeDbOpens,value:localStorage.getItem(${JSON.stringify(fixtureKey)}),
      childFixture:JSON.parse(child.name.slice('__duel_qa_tab_v2:'.length)).backups
        .find(([id])=>id==='origin-primary-v1')?.[1]?.entries[${JSON.stringify(fixtureKey)}]};
  })()`);
  assert.match(blocked.message,/already open in another tab/);assert.equal(blocked.app,false);
  assert.equal(blocked.exportButton,false);assert.equal(blocked.opens,0);assert.equal(blocked.value,fixtureValue);
  assert.equal(blocked.childFixture,fixtureValue);
  await context.evaluate(`window.__writerContender.close()`);
  await context.command('Page.reload',{ignoreCache:true});
  await context.waitFor(`(${ready}) && performance.timeOrigin!==${first.timeOrigin}`,
    'new document reacquires the writer after real reload',60_000);
  const afterReload=await context.evaluate(`(async()=>({
    held:(await navigator.locks.query()).held.filter(lock=>lock.name===${JSON.stringify(sharedName)}).length,
    value:localStorage.getItem(${JSON.stringify(fixtureKey)}),opens:window.__writerNativeDbOpens,
  }))()`);
  assert.equal(afterReload.held,1);assert.equal(afterReload.value,fixtureValue);assert.equal(afterReload.opens,0);

  await context.navigate(entry+'&writer-unavailable=1');
  await context.waitFor(`!!document.querySelector('#writer-error') && location.search.includes('writer-unavailable=1')`,
    'missing lock API blocks startup',60_000);
  const unavailable=await context.evaluate(`({message:document.querySelector('#writer-error').textContent,
    app:!!window.__qaApp,exportButton:!!document.querySelector('#backup-export'),opens:window.__writerNativeDbOpens})`);
  assert.match(unavailable.message,/cannot secure career storage/);assert.equal(unavailable.app,false);
  assert.equal(unavailable.exportButton,false);assert.equal(unavailable.opens,0);

  // Real history navigation either creates a fresh document or reaches the
  // early pageshow restoration guard, which reloads before App can resume.
  await context.evaluate('history.back()');
  await context.waitFor(`(${ready}) && !location.search.includes('writer-unavailable=1')`,
    'history return safely re-enters writer admission',60_000);
  const afterBack=await context.evaluate(`(async()=>({
    held:(await navigator.locks.query()).held.filter(lock=>lock.name===${JSON.stringify(sharedName)}).length,
    value:localStorage.getItem(${JSON.stringify(fixtureKey)}),opens:window.__writerNativeDbOpens,
  }))()`);
  assert.equal(afterBack.held,1);assert.equal(afterBack.value,fixtureValue);assert.equal(afterBack.opens,0);
  console.log('Career writer: native shared-name exclusion, no blocked-tab export, reload/history admission and exact memory-only lap retention passed.');
}
