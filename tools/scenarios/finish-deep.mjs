// FINISH-DEEP: reproducible guided keyboard journey. Only the initial ramp
// setup and Rust prerequisite are fixtures. Never teleport underwater or grant
// finds, credits, the car, race results or Coast Cup progress.
import {writeFile, readFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function run(context) {
  const report = {scope: 'Guided keyboard route; simulated driving seconds, not a blind human findability test. Muted captions; no frame timing.', runs: []};
  await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const captures = [];
  try {
    const difficulties = process.env.DUEL_FINISH_DEEP_DIFFICULTY ? [process.env.DUEL_FINISH_DEEP_DIFFICULTY] : ['casual', 'pro'];
    for (const difficulty of difficulties) {
      if (!['casual','pro'].includes(difficulty)) throw Error('Unknown FINISH-DEEP difficulty');
      await context.navigate('/tools/menu-check.html?flags=the-deep,lab');
      await context.waitFor(`!!window.__qaApp?.visualReady&&window.name.startsWith('__duel_qa_tab_v2:')&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'memory-only game', 90000);
      await context.waitFor(`[...document.querySelectorAll('details button')].some(n=>n.textContent==='Create funded temporary player')`, 'temporary career', 90000);
      await context.evaluate(`(()=>{
        const a=window.__qaApp;a.returnToMenu();
        a.addPlayer('Finish ${difficulty}');a.profile={...a.profile,credits:3000,deep:{kit:true}};a._saveProfile();
        a.audio.setMuted(true);for(const p of document.querySelectorAll('details'))p.hidden=true;
        a.startCampaign({mode:'duel',car:'falcone_f42',difficulty:${JSON.stringify(difficulty)},seed:1989,opponentCount:1,startStage:0});
        a.stop();window.__finish={seconds:0,events:[],keys:{},wrap:x=>Math.atan2(Math.sin(x),Math.cos(x))};
        const q=window.__finish;
        a.duel.onChange((s,e)=>{for(const name of ['deepPlace','deepPhone','deepRaised','deepLogged','deepPearl','deepCoastCup'])
          if(e[name])q.events.push({seconds:q.seconds,name,payload:e[name]});});
        q.key=(code,on)=>{if(!!q.keys[code]===on)return;q.keys[code]=on;
          window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,key:code, bubbles:true}));};
        q.tick=seconds=>{a.advance(seconds,1/120);q.seconds+=seconds;};
        q.release=()=>{for(const k of Object.keys(q.keys))q.key(k,false);};
        q.pose=()=>{const d=a.duel,s=d.state;return{...d.course.groundAt(s.s,s.lateral),heading:d.course.at(s.s).heading+s.headingError,speed:s.speedMph};};
        q.drive=(target,stop=false,budget=30,radius=3.5)=>{let arrived=false,min=Infinity;
          for(let t=0;t<budget;t+=.05){const p=q.pose(),distance=Math.hypot(target.x-p.x,target.z-p.z),
            error=q.wrap(Math.atan2(target.x-p.x,target.z-p.z)-p.heading);
            min=Math.min(min,distance);
            if(distance<(stop?radius:7)&&(!stop||Math.abs(p.speed)<.7)){arrived=true;break;}
            const desired=stop?Math.min(26,Math.max(1.3,distance*.75)):30;
            const cap=Math.abs(error)>.6?8:desired;
            q.key('ArrowLeft',error>.045);q.key('ArrowRight',error<-.045);
            q.key('ArrowUp',p.speed<cap&&(!stop||distance>radius-.3));
            q.key('ArrowDown',p.speed>cap+1||(stop&&distance<radius&&p.speed>.1));
            q.tick(.05);
          }q.release();return{arrived,min,pose:q.pose(),seconds:q.seconds};};
        const d=a.duel,s=d.state,r=d.course.deepRamp,p=r.points[0],n=d.course.nearest(p.x,p.z);
        Object.assign(s,{status:'racing',countdown:0,s:n.s,prevS:n.s,lateral:n.lateral,prevLateral:n.lateral,
          headingError:q.wrap(r.heading-d.course.at(n.s).heading),speedMph:0,groundHeight:p.y,airHeight:0,airborne:false,_jumpY:null});
      })()`);
      await context.waitFor(`window.__qaApp.visualReady`, 'race ready', 90000);
      await context.evaluate(`(()=>{const q=window.__finish,d=window.__qaApp.duel;q.key('ArrowUp',true);
        for(let i=0;i<1200&&d.state.deepJourney?.phase!=='choice';i++)q.tick(.05);q.release();
        if(!window.__qaApp.chooseDeep('dive'))throw Error('Keyboard ramp did not reach Dive');q.tick(3);})()`);
      await context.waitFor(`window.__qaApp.visualReady&&!!window.__qaApp.duel.deepStory`, 'underwater ready', 90000);
      const run = {difficulty, goals:[], events:[]}; report.runs.push(run);
      const goals = await context.evaluate(`(()=>{const d=window.__qaApp.duel,z=d.deepRuntime.zone,q=d.deepStory;
        return [...z.finds.map(f=>({kind:'find',id:f.id,index:f.trailIndex,target:q.sirena.finds.find(p=>p.id===f.id)})),
          ...z.pearls.map(f=>({kind:'pearl',id:f.id,index:f.trailIndex,target:q.log.pearls.find(p=>p.pearl===f.id)})),
          ...z.spots.map(f=>({kind:'life',id:f.creature,index:f.trailIndex,target:q.log.spots.find(p=>p.creature===f.creature)}))]
          .sort((a,b)=>a.index-b.index);})()`);
      let index = 0;
      for (const goal of goals) {
        // Follow the real loop; route knowledge is explicitly part of this guided recipe.
        const route = await context.evaluate(`window.__qaApp.duel.deepRuntime.zone.trail.slice(${index},${goal.index+1}).filter((p,i)=>i%3===0)`);
        for (const target of route) {
          const result = await context.evaluate(`window.__finish.drive(${JSON.stringify(target)},false,15)`);
          if (!result.arrived) throw Error('Keyboard route stalled: '+JSON.stringify({goal,result}));
        }
        index = goal.index;
        const start = await context.evaluate('window.__finish.seconds');
        if (goal.kind === 'find' && goal.id !== 'sirena-badge')
          await context.evaluate(`window.__finish.key('KeyR',true);window.__finish.key('KeyR',false)`);
        const result = await context.evaluate(`window.__finish.drive(${JSON.stringify(goal.target)},true,45,${goal.kind === 'life' ? 7 : goal.kind === 'pearl' ? 2.8 : 3.5})`);
        if (!result.arrived) throw Error('Keyboard approach stalled: '+JSON.stringify({goal,result}));
        await context.evaluate(`(()=>{const q=window.__finish;q.key('KeyF',${goal.kind==='find'&&goal.id!=='sirena-badge'});
          q.tick(${goal.id==='sirena-car'?12.3:goal.kind==='find'&&goal.id!=='sirena-badge'?3.3:1.3});q.release();})()`);
        const saved = await context.evaluate(`window.__qaApp.profile.deep`);
        run.goals.push({id:goal.id,kind:goal.kind,start,end:await context.evaluate('window.__finish.seconds'),saved});
        await writeFile(join(context.outputDir,'finish-deep.json'), JSON.stringify({...report,captures},null,2)+'\n');
        const earned = (goal.kind==='find'?saved.raised:goal.kind==='pearl'?saved.pearls:saved.logged)||[];
        if(!earned.includes(goal.id))throw Error('Goal not earned through rules: '+goal.id);
        await context.evaluate(`window.__qaApp.onFrame?.(window.__qaApp.duel.state,0)`);
        await sleep(200);
        if (difficulty === 'casual' && (goal.id==='turtle'||goal.id==='sirena-steering-wheel'||goal.id==='sirena-car')) {
          await context.evaluate(`(()=>{document.querySelector('.deep-map-toggle')?.click();
            const a=window.__qaApp,d=a.duel,p=d.course.groundAt(d.state.s,d.state.lateral);
            ${goal.id==='sirena-car'?`a.inspectionCamera={position:[${goal.target.x}+10,p.y+5,${goal.target.z}-12],target:[${goal.target.x},p.y+2,${goal.target.z}]};`:''}
            a.start();})()`);
          await sleep(goal.id==='sirena-car'?4500:1200);
          captures.push({label:goal.id,path:await context.screenshot('finish-'+goal.id)});
          await context.evaluate(`window.__qaApp.stop();window.__qaApp.inspectionCamera=null;document.querySelector('.deep-map-toggle')?.click()`);
        }
      }
      run.events = await context.evaluate('window.__finish.events');
      // Use the real restoration purchase. The Rust lesson prerequisite is a
      // declared fixture: FINISH-DEEP does not test the Lab lesson itself.
      await context.evaluate(`(()=>{const a=window.__qaApp;window.__finish.key('KeyU',true);window.__finish.key('KeyU',false);
        a.profile={...a.profile,lab:{...a.profile.lab,version:1,done:{...a.profile.lab?.done,rust:true}}};a._saveProfile();
        a.start();document.querySelector('#garage-open').click();})()`);
      await context.waitFor(`!!document.querySelector('.lab-tab')`, 'Lab tab');
      await context.evaluate(`document.querySelector('.lab-tab').click()`);
      await context.waitFor(`!!document.querySelector('[data-lab-lesson="start:rust"]')`, 'Rust bench');
      await context.evaluate(`document.querySelector('[data-lab-lesson="start:rust"]').click()`);
      await context.waitFor(`!!document.querySelector('[data-lab="restore"]:not(:disabled)')`, 'restore offer');
      await context.evaluate(`document.querySelector('[data-lab="restore"]').click()`);
      await context.waitFor(`window.__qaApp.profile.unlockedCars.includes('falcone_sirena')`, 'restored Sirena');
      await context.waitFor(`!!document.querySelector('[data-lab="restore-close"]')`, 'restoration ends', 60000);
      await context.evaluate(`document.querySelector('[data-lab="restore-close"]').click();document.querySelector('[data-lab="close"]').click();
        window.__qaApp.startCampaign({mode:${JSON.stringify(difficulty==='pro'?'timetrial':'duel')},car:'falcone_sirena',difficulty:${JSON.stringify(difficulty)},seed:1989,opponentCount:1,startStage:0});window.__qaApp.stop()`);
      await context.waitFor('window.__qaApp.visualReady', 'Sirena race ready', 90000);
      // Real keyboard race around the circuit, no autopilot or finish injection.
      const race = await context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,q=window.__finish,start=q.seconds;
        for(let t=0;t<900&&['countdown','racing','ticket'].includes(d.state.status);t+=.05){
          const s=d.state,v=s.speedMph*.44704,frame=d.course.at(s.s+Math.max(10,v*.65)),
            target=frame, p=q.pose(),error=q.wrap(Math.atan2(target.x-p.x,target.z-p.z)-p.heading);
          q.key('ArrowLeft',error>.035);q.key('ArrowRight',error<-.035);
          const cap=${difficulty==='pro'?'Math.abs(error)>.3?20:Math.abs(error)>.12?30:40':'Math.abs(error)>.3?25:Math.abs(error)>.12?42:65'};
          q.key('ArrowUp',s.speedMph<cap);q.key('ArrowDown',s.speedMph>cap+2);q.tick(.05);
        }q.release();return{seconds:q.seconds-start,status:d.state.status,deep:a.profile.deep};})()`);
      run.race = race;
      await context.evaluate(`window.__qaApp.onFrame?.(window.__qaApp.duel.state,0)`);
      if (difficulty==='casual') captures.push({label:'Coast Cup',path:await context.screenshot('finish-coast-cup')});
      if (!race.deep.coastCup) throw Error('Keyboard race did not finish Coast Cup: '+JSON.stringify(race));
      await context.evaluate('window.__qaApp.start()');
      await context.waitFor(`document.querySelector('.sirena-title').hidden&&
        !document.querySelector('.sirena-caption').hidden&&document.querySelector('.sirena-caption span').textContent.includes('Grandma Rosa')`,
        'Ana thanks the driver after the Coast Cup title', 30000);
      run.cupCaption = await context.evaluate(`document.querySelector('.sirena-caption span').textContent`);
      await writeFile(join(context.outputDir,'finish-deep.json'), JSON.stringify(report,null,2)+'\n');
    }
  } finally {
    await writeFile(join(context.outputDir,'finish-deep.json'), JSON.stringify({...report,captures},null,2)+'\n');
    if(captures.length) {
      const images=await Promise.all(captures.map(async c=>({label:c.label,data:'data:image/png;base64,'+(await readFile(c.path)).toString('base64')})));
      const sheet=await context.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1920;c.height=1128;const g=c.getContext('2d');g.fillStyle='#10232b';g.fillRect(0,0,c.width,c.height);
        const rows=${JSON.stringify(images)};for(let i=0;i<rows.length&&i<4;i++){const im=new Image();im.src=rows[i].data;await im.decode();const x=(i%2)*960,y=Math.floor(i/2)*564;
          g.drawImage(im,x,y+24,960,540);g.fillStyle='#ead9a7';g.font='18px Georgia';g.fillText(rows[i].label,x+12,y+19);}return c.toDataURL('image/jpeg',.72);})()`);
      const family=join(context.outputDir,'postcard.jpg');await writeFile(family,Buffer.from(sheet.split(',')[1],'base64'));
    }
  }
}
