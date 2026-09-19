// Isolated browser review. Never reads or writes a real career.
const memory=new Map();
Object.defineProperty(window,'localStorage',{value:{getItem:key=>memory.get(String(key))??null,setItem:(key,value)=>memory.set(String(key),String(value)),removeItem:key=>memory.delete(String(key)),clear:()=>memory.clear()}});
const {app}=await import('../src/main.js');
const panel=document.createElement('aside');panel.setAttribute('aria-label','Temporary reverse review');
panel.style.cssText='position:fixed;left:12px;bottom:12px;z-index:999;background:#101d21;color:white;padding:10px;font:14px system-ui;max-width:75vw';
const output=document.createElement('output');output.style.display='block';panel.append(output);
function release(){app.keys={};}
function start(difficulty){release();app.returnToMenu();app.setRaceSettings({startStage:0,car:'falcone_f42',mode:'timetrial',cpuDifficulty:'medium',difficulty});app.startCampaign();}
for(const [label,action] of [['Start Auto',()=>start('casual')],['Start Manual',()=>start('pro')],['Hold reverse (S)',()=>{release();app.keys.KeyS=true;}],['Hold forward (W)',()=>{release();app.keys.KeyW=true;}],['Release pedals',release]]){
  const button=document.createElement('button');button.textContent=label;button.onclick=action;button.style.cssText='margin:4px;padding:7px';panel.append(button);
}
document.body.append(panel);
function telemetry(){const s=app.duel.state;output.textContent=`TEST ONLY · ${s.status} · ${s.s.toFixed(2)} m progress · ${s.speedMph.toFixed(2)} signed mph · ${s.gear<0?'R':s.gear+1} gear`;requestAnimationFrame(telemetry);}telemetry();
