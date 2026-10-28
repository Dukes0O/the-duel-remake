import {achievementShelf} from './achievements.js';
import {CUPS, normalizeCups, cupStandings, cupAvailability, cupBonus} from './grand-prix-cups.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const difficulty=cpu=>({easy:'Easy',medium:'Medium',hard:'Hard'}[cpu]||'');

export function trophyCase(profile,{enabled=false}={}){
  if(!enabled)return '';
  const state=normalizeCups(profile?.cups);
  const rows=state.version===1?state.trophies:[];
  // Claude, 28 October 2026: tiles in the garage's own style (same heading as Paint Finish); one row per cup, Easy to Hard.
  const all=CUPS.flatMap(cup=>['easy','medium','hard'].map(cpu=>({cup,cpu,earned:rows.includes(cup.id+':'+cpu)})));
  return '<section class="paint-panel trophy-case" aria-label="Cup trophy case"><div class="paint-heading"><h3>CUP TROPHY CASE</h3><span>'+all.filter(row=>row.earned).length+' / '+all.length+'</span></div><p class="trophy-note">One trophy per cup and difficulty. Win bonuses are paid once.</p><ul class="trophy-tiles">'+all.map(({cup,cpu,earned})=>
    '<li class="trophy-tile '+cpu+(earned?' won':'')+'"><i aria-hidden="true"></i><span>'+cup.name+' · '+difficulty(cpu)+' · '+(earned?'WON':'Not yet won')+'</span></li>').join('')+'</ul></section>';
}
export function cupsPanel(profile,{enabled=false,courses=[],owns=()=>false,playerId}={}){
  if(!enabled)return '';
  const state=normalizeCups(profile?.cups);
  if(state.version!==1)return '<section class="paint-panel"><h3>CUPS</h3><p>This saved cup uses a newer game version.</p></section>';
  const active=state.active?.ownerId===playerId?state.active:null;
  if(active){
    const cup=CUPS.find(row=>row.id===active.cupId),event=courses.find(row=>row.id===cup.events[active.results.length]);
    const rows=cupStandings(active.results);
    return '<section class="paint-panel" aria-label="Current cup"><h3>'+cup.name.toUpperCase()+'</h3><p>'+difficulty(active.cpuDifficulty)+' · '+active.results.length+' / '+cup.events.length+' races complete</p><p>Next: '+escape(event?.name||'Course not yet available')+'</p>'+
      (rows.length?'<ol>'+rows.map(row=>'<li>'+escape(row.you?'YOU':row.name)+' · '+row.points+' points</li>').join('')+'</ol>':'')+
      '<button type="button" data-cup-continue="true">SELECT NEXT CUP RACE</button><button type="button" data-cup-abandon="true">ABANDON CUP · NO BONUS</button></section>';
  }
  return '<section class="paint-panel" aria-label="Grand Prix cups"><h3>CUPS</h3><p>Race a series against seven drivers. Points: 10, 8, 6, 5, 4, 3, 2, 1. Your car and difficulty stay fixed for the cup.</p>'+CUPS.map(cup=>{
    const available=cupAvailability(state,cup.id,{courses,owns,enabled});
    return '<article class="course-access-card"><div><h3>'+cup.name+'</h3><p>'+cup.events.map(id=>escape(courses.find(row=>row.id===id)?.name||id.replaceAll('-',' '))).join(' → ')+'</p><p>First win bonus: '+['easy','medium','hard'].map(cpu=>difficulty(cpu)+' '+cupBonus(cup.id,cpu)).join(' · ')+' credits</p>'+
      (available.ok?'':'<p>'+escape(available.reason)+'</p>')+'</div><button type="button" data-cup-start="'+cup.id+'" '+(available.ok?'':'disabled')+'>SELECT CUP</button></article>';
  }).join('')+'</section>';
}

export function cupResultPanel(result,{enabled=false}={}){
  const summary=result?.cupSummary,definition=CUPS.find(cup=>cup.id===summary?.id);
  if(!enabled||!definition||!Array.isArray(summary.standings)||!summary.standings.length)return '';
  return '<section class="paint-panel" aria-label="Cup standings"><h3>'+definition.name.toUpperCase()+'</h3><p>'+
    (summary.finished?'FINAL CUP STANDINGS':summary.rounds+' / '+summary.total+' races complete')+'</p><ol>'+
    summary.standings.map(row=>'<li>'+escape(row.you?'YOU':row.name)+' · '+row.points+' points</li>').join('')+'</ol>'+
    (summary.finished?'<p>CUP BONUS +'+(Number.isSafeInteger(summary.bonus)?summary.bonus:0)+' CR'+
      (summary.trophy?' · TROPHY EARNED':'')+'</p>':'<p>Continue your cup from Courses in the main menu.</p>')+'</section>';
}

export function achievementsPanel(profile, options = {}) {
  const rows = achievementShelf(profile, options);
  if (!rows.length) return '';
  return '<section class="paint-panel achievement-shelf" aria-label="Achievements"><div class="paint-heading"><h3>ACHIEVEMENTS</h3></div><ul class="achievement-tiles">' + rows.map(row =>
    '<li class="achievement-tile' + (row.earned ? ' earned' : '') + '" data-achievement="' + row.id + '">' +
    '<span class="achievement-medallion" aria-hidden="true"></span><div><h4>' + escape(row.name) + '</h4><p>' +
    (row.earned ? 'EARNED' + (row.at ? ' &middot; <time datetime="' + new Date(row.at).toISOString() + '">' +
      new Date(row.at).toISOString().slice(0, 10) + '</time>' : '') : '<em>' + escape(row.hint) + '</em>') +
    '</p></div></li>').join('') + '</ul></section>';
}
