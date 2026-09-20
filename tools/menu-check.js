// Real production UI with disposable in-memory careers. Never import this
// entry from production; it cannot read or modify the origin's saved players.
import {installIsolatedStorage} from './qa-storage.js';
installIsolatedStorage();
const {app,refreshRaceSetup}=await import('../src/main.js');
const panel=document.createElement('details');panel.open=true;
panel.style.cssText='position:fixed;left:12px;top:76px;z-index:999;padding:8px 12px;background:#10212cf0;color:white;font:12px/1.5 system-ui;border:1px solid #7198a0;max-width:330px';
const summary=document.createElement('summary');summary.textContent='MENU QA · TEMPORARY SAVES';panel.append(summary);
const note=document.createElement('p');note.textContent='Real menu and garage. Reload clears these test players, purchases and settings.';panel.append(note);
const fund=document.createElement('button');fund.textContent='Create funded temporary player';fund.onclick=()=>{
  if(app.duel.state.status!=='menu')return;
  app.addPlayer('Menu QA');app.profile={...app.profile,credits:50000};app._saveProfile();
  refreshRaceSetup();fund.disabled=true;panel.open=false;
};panel.append(fund);document.body.append(panel);
