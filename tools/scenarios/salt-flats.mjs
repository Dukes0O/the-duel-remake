import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
async function settled(context,label){await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;if(!a||!r)return false;a.onFrame(a.duel.state,0);r.renderFrame();return a.visualReady&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&document.querySelector('#renderer-loading')?.hidden;})()`,label,60000);
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');}

async function click(context, selector) {
  const point = await context.evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    if (!button || button.disabled) throw Error('Missing usable yard control: '+${JSON.stringify(selector)});
    button.scrollIntoView({block:'center'});
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) throw Error('Hidden yard control');
    const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    if (!button.contains(document.elementFromPoint(x,y)))
      throw Error('Covered yard control '+${JSON.stringify(selector)}+' by '+document.elementFromPoint(x,y)?.outerHTML.slice(0,400));
    return {x,y};
  })()`);
  await context.command('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point});
  await context.command('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point});
}

async function runPublicEntry(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {
    width:1280,height:800,deviceScaleFactor:1,mobile:false,
  });
  const report = {card:'ARENA-06',kind:'public-entry',
    sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    fixture:'Actual App, yard router, native Duel and production GLB loader; named dev flags; rank/discovery profile fixtures only; memory-only storage.',
    entries:[],issues:context.issues,warnings:context.warnings,
    limits:['Muted entry checks do not judge sound or repeat the accepted art/frame verdict.']};
  const persist = () => writeFile(join(context.outputDir,'salt-public-entry.json'),JSON.stringify(report,null,2)+'\n');
  try {
    for (const quality of ['high','performance']) {
      await context.evaluate('window.name=""');
      await context.navigate('/tools/menu-check.html?flags=salt-flats,fuel-run&harness=salt-public-'+quality);
      await context.waitFor('!!window.__qaApp&&!!window.__render',quality+' actual menu',60000);
      await context.waitFor(`Array.from(document.querySelectorAll('details')).some(panel =>
        panel.querySelector('summary')?.textContent.startsWith('MENU QA'))`, 'temporary QA overlay initialized');
      await context.evaluate(`(() => {
        const app = window.__qaApp;
        if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
            !window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only QA required');
        app.stop(); app.audio.setMuted(true); app.setGraphicsQuality(${JSON.stringify(quality)});
        for (const panel of document.querySelectorAll('details'))
          if (panel.querySelector('summary')?.textContent.startsWith('MENU QA')) panel.style.display='none';
        const rank=9,xp=Array.from({length:rank-1},(_,i)=>400+150*i).reduce((sum,n)=>sum+n,0);
        app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,rank,xp}};
        if (!app._saveProfile()) throw Error('Memory fixture save failed');
        if (!app.visitWasteland()) throw Error('Actual yard visit refused');
      })()`);
      await settled(context,quality+' actual yard transition');
      await context.evaluate('window.__qaApp.advance(8)');
      await context.waitFor('window.__qaApp.isYardHomeActive()',quality+' actual yard arrival');
      await settled(context,quality+' actual yard home');
      for (const mode of ['last-car-rolling','fuel-run']) {
        await click(context,'[data-action="yard-scrapdome"]');
        await context.waitFor(`!!document.querySelector('[data-arena-venue="salt-flats"]')`,'eligible Salt venue choice');
        await click(context,'[data-arena-venue="salt-flats"]');
        await click(context,'[data-arena-mode="'+mode+'"]');
        const choices = await context.evaluate(`(() => ({
          saltSelected:document.querySelector('[data-arena-venue="salt-flats"]')?.getAttribute('aria-pressed'),
          modeSelected:document.querySelector('[data-arena-mode="${mode}"]')?.getAttribute('aria-pressed'),
          label:document.querySelector('[data-action="arena-start"]')?.textContent.trim(),
        }))()`);
        assert.equal(choices.saltSelected,'true'); assert.equal(choices.modeSelected,'true');
        assert.equal(choices.label,'ENTER THE SALT FLATS');
        await context.screenshot(quality+'-'+mode+'-salt-yard');
        await click(context,'[data-action="arena-start"]');
        await context.waitFor(`window.__qaApp.duel.state.arena?.venueId==='salt-flats'&&
          window.__qaApp.duel.state.arena?.mode===${JSON.stringify(mode)}`,'actual selected Salt event');
        await settled(context,quality+' '+mode+' production cars');
        await context.waitFor(`window.__render.scene.getObjectByName('Salt Flats')?.userData.assetStatus==='ready'`,'actual runtime Salt model');
        const state = await context.evaluate(`(() => {
          const app=window.__qaApp,world=window.__render.scene.getObjectByName('Salt Flats');
          app.advance(4);app.onFrame(app.duel.state,0);window.__render.renderFrame();
          return {venue:app.duel.state.arena.venueId,mode:app.duel.state.arena.mode,
            course:app.duel.course.def.id,status:app.duel.state.status,
            clock:app.duel.state.arena.clockSec,asset:world.userData.assetStatus,
            errors:world.userData.loadErrors,activeRace:app.profile.activeRace,
            ground:!!world.getObjectByName('salt-flats-ground')};
        })()`);
        assert.equal(state.venue,'salt-flats'); assert.equal(state.course,'salt-flats');
        assert.equal(state.mode,mode); assert.equal(state.status,'racing');
        assert(state.clock>0); assert.equal(state.asset,'ready'); assert.equal(state.ground,true);
        assert.deepEqual(state.errors,[]); assert.equal(state.activeRace,null);
        report.entries.push({quality,...choices,...state}); await persist();
        await context.screenshot(quality+'-'+mode+'-salt-fight');
        await click(context,'#pause-button');
        await click(context,'[data-action="arena-rematch"]');
        assert.equal(await context.evaluate('window.__qaApp.duel.state.arena.venueId'),'salt-flats','actual rematch keeps venue');
        assert.equal(await context.evaluate('window.__qaApp.duel.state.arena.mode'),mode,'actual rematch keeps mode');
        await settled(context,quality+' '+mode+' rematch loading');
        await click(context,'#pause-button');
        await click(context,'[data-action="arena-yard"]');
        await settled(context,quality+' actual return transition');
        await context.evaluate('window.__qaApp.advance(8)');
        await context.waitFor('window.__qaApp.isYardHomeActive()','actual return to yard');
        await settled(context,quality+' actual returned yard home');
      }
    }
    report.passed=true;
  } catch (error) {
    report.passed=false;report.failure=error.stack;
    await context.screenshot('public-entry-failed');
    throw error;
  } finally {await persist();}
}

export {runPublicEntry as run};
