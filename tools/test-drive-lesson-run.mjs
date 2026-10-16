import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {driveLessonBoardModel, driveLessonBoardMarkup, driveLessonPanelMarkup,
  driveLessonResultMarkup, bindDriveLessonUi, driveLessonCompletion, settleDriveLessonPreparation, driveLessonGhostPose} from '../src/lessons/drive-lesson-ui.js';

const base = () => ({
  playerId: 'kyle', carId: 'falcone', difficulty: 'pro',
  cars: [{id: 'falcone', name: 'Falcone'}], ownedCarIds: ['falcone'],
  courses: [{id: 'panorama-ridge', name: 'Panorama Ridge'}, {id: 'tremblant-woods', name: 'Tremblant Woods'}],
  corners: [{courseId: 'panorama-ridge', cornerName: 'The Cutting', rollingMph: 100},
    {courseId: 'tremblant-woods', cornerName: 'Beaver Hairpin', rollingMph: 75}],
  ownedCourseIds: ['panorama-ridge'], progress: null,
});
const run = () => ({...base(), runPlayerId: 'kyle', lesson: {
  id: 'corner', stage: 'right', phase: 'result', done: false, streak: 0, bestMargin: .42,
  instructor: {timeSec: 7.31}, lastAttempt: {elapsedSeconds: 8.42, timeLostSeconds: 1.11,
    screechSeconds: 1.6, endReason: 'finish', finished: true, passed: false,
    progressM: 120, rules: [true, true, false, false]},
}});
function freeze(value) {
  if (value && typeof value === 'object') {Object.freeze(value); Object.values(value).forEach(freeze);}
  return value;
}
function dom() {
  const handlers = new Map();
  const root = {contains: node => node?.inside === true,
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name, fn) => {if (handlers.get(name) === fn) handlers.delete(name);}};
  const node = (dataset = {}, tagName = 'BUTTON', extra = {}) => ({dataset, tagName, inside: true,
    closest(selector) {return selector.includes('data-drive-action') && this.dataset.driveAction ? this : null;}, ...extra});
  const emit = (name, target, extra = {}) => {
    const event = {target, preventDefault() {this.prevented = true;}, ...extra};
    handlers.get(name)?.(event); return event;
  };
  return {root, node, emit, handlers};
}

test('board uses supplied course order, owned corner, actual car and setting without mutation', () => {
  const props = freeze(base()), model = driveLessonBoardModel(props);
  assert.deepEqual(model.start, {lessonId: 'corner', courseId: 'panorama-ridge', carId: 'falcone', difficulty: 'pro'});
  assert.deepEqual(model.courses.map(row => [row.id, row.owned]), [['panorama-ridge', true], ['tremblant-woods', false]]);
  assert.equal(model.rows[0].open, true); assert.equal(model.rows[0].group, 'Driving');
  assert.equal(model.rows[0].done, false); assert.equal(props.courseId, undefined);
  const woods = {...base(), ownedCourseIds: ['tremblant-woods']};
  assert.equal(driveLessonBoardModel(woods).start.courseId, 'tremblant-woods');
});

test('no owned course, wrong car, missing player, unknown difficulty or newer save cannot start', () => {
  const unavailable = [
    {...base(), ownedCourseIds: []}, {...base(), ownedCarIds: []}, {...base(), playerId: ''},
    {...base(), carId: 'missing'}, {...base(), difficulty: 'hard'},
    {...base(), progress: {version: 2, done: {corner: true}}},
  ];
  for (const props of unavailable) {
    assert.equal(driveLessonBoardModel(props).start, null);
    assert.doesNotMatch(driveLessonBoardMarkup(props), /data-drive-action="start:corner"/);
  }
  assert.match(driveLessonBoardMarkup(unavailable[0]), /buy Panorama Ridge or Tremblant Woods/);
});

test('completed lesson stays a retake with the supplied best margin and no reward promise', () => {
  const props = {...base(), progress: {version: 1, done: {corner: true}, best: {corner: .42}, rewarded: {corner: true}}};
  const markup = driveLessonBoardMarkup(props);
  assert.match(markup, /Retake/); assert.match(markup, /Best: 0.42 s faster/);
  assert.doesNotMatch(markup, /600|free brake|earned|credits/);
});

test('board escapes course, corner and car labels and supplies labelled keyboard controls', () => {
  const props = base(); props.courses[0].name = '<img src=x onerror=alert(1)>';
  props.corners[0].cornerName = 'Cutting <script>'; props.cars[0].name = 'Car " onmouseover="bad';
  const markup = driveLessonBoardMarkup(props);
  assert.doesNotMatch(markup, /<img|<script|onmouseover="bad/);
  assert.match(markup, /&lt;img/); assert.match(markup, /&lt;script/);
  assert.match(markup, /<fieldset/); assert.match(markup, /<legend>Choose a corner/);
  assert.match(markup, /type="radio"/); assert.match(markup, /checked/);
  assert.match(markup, /lesson-board/); assert.match(markup, /data-drive-action="start:corner"/);
});

test('right-way panel reports the actual four checks, with no guessed driving success', () => {
  const props = freeze(run()), markup = driveLessonPanelMarkup(props);
  assert.match(markup, /Try 2/); assert.equal((markup.match(/Met:/g) ?? []).length, 2);
  assert.equal((markup.match(/Missed:/g) ?? []).length, 2); assert.match(markup, /0\/3/);
  assert.match(markup, /Leave lesson/); assert.doesNotMatch(markup, /Lesson passed/);
  const driving = run(); driving.lesson.phase = 'driving';
  assert.doesNotMatch(driveLessonPanelMarkup(driving), /Met:|Missed:|data-drive-action="next"/);
});

test('finished result shows supplied times, loss and screech to hundredths', () => {
  const markup = driveLessonResultMarkup(freeze(run()));
  for (const text of ['8.42 s', '7.31 s', 'Lost 1.11 s', '1.60 s', 'Try again']) assert.ok(markup.includes(text), text);
  const fast = run(); fast.lesson.lastAttempt.timeLostSeconds = -.25;
  assert.match(driveLessonResultMarkup(fast), /Faster by 0.25 s/);
  assert.doesNotMatch(driveLessonResultMarkup(fast), /Lost -/);
});

test('unfinished attempts show progress and end reason without invented finish time or loss', () => {
  const props = run(); Object.assign(props.lesson.lastAttempt, {finished: false, endReason: 'wall', timeLostSeconds: null, progressM: 83.2});
  const markup = driveLessonResultMarkup(props);
  assert.match(markup, /Did not finish/); assert.match(markup, /83.2 m/); assert.match(markup, /Wall hit/);
  assert.match(markup, /Elapsed 8.42 s/); assert.doesNotMatch(markup, /Lost|Faster by|You 8.42/);
});

test('challenge completion requires actual completed streak; result never invents a reward', () => {
  const props = run(); Object.assign(props.lesson, {stage: 'challenge', done: true, streak: 3});
  Object.assign(props.lesson.lastAttempt, {passed: true, timeLostSeconds: -.42});
  const markup = driveLessonResultMarkup(props);
  assert.match(markup, /Lesson passed/); assert.match(markup, /Best: 0.42 s faster/);
  assert.doesNotMatch(markup, /data-drive-action="next"|600|credits|brake upgrade/);
  props.lesson.streak = 2;
  assert.doesNotMatch(driveLessonResultMarkup(props), /Lesson passed/);
  props.lesson.phase = 'driving';
  assert.equal(driveLessonResultMarkup(props), '');
});

test('invalid or non-finite observations never render NaN or a fake zero instructor', () => {
  const props = run(); props.lesson.instructor.timeSec = NaN; props.lesson.lastAttempt.elapsedSeconds = Infinity;
  const markup = driveLessonPanelMarkup(props) + driveLessonResultMarkup(props);
  assert.doesNotMatch(markup, /NaN|Infinity|Instructor 0.00/); assert.match(markup, /Not available/);
  assert.equal(driveLessonPanelMarkup({...props, runPlayerId: 'someone-else'}), '');
  assert.equal(driveLessonResultMarkup({...props, runPlayerId: 'someone-else'}), '');
});

test('bindings use fresh ownership and course props, reject forged actions and cleanly detach', () => {
  const d = dom(), starts = [], selections = []; let props = base();
  const clean = bindDriveLessonUi(d.root, () => props, {onStart: value => starts.push(value), onSelectCourse: value => selections.push(value)});
  d.emit('click', d.node({driveAction: 'start:corner'})); assert.equal(starts.length, 1);
  props = {...props, ownedCourseIds: []};
  d.emit('click', d.node({driveAction: 'start:corner'})); assert.equal(starts.length, 1);
  props = {...base(), ownedCourseIds: ['tremblant-woods'], courseId: 'tremblant-woods'};
  d.emit('click', d.node({driveAction: 'start:corner'})); assert.equal(starts[1].courseId, 'tremblant-woods');
  d.emit('change', d.node({driveCourse: 'panorama-ridge'}, 'INPUT')); assert.equal(selections.length, 0);
  d.emit('change', d.node({driveCourse: 'tremblant-woods'}, 'INPUT')); assert.deepEqual(selections, [{courseId: 'tremblant-woods'}]);
  d.emit('click', d.node({driveAction: 'start:other'}));
  d.emit('click', d.node({driveAction: 'start:corner'}, 'BUTTON', {inside: false}));
  assert.equal(starts.length, 2); clean(); assert.equal(d.handlers.size, 0);
});

test('next and Enter only request eligible attempts, leave delegates without mutating lesson', () => {
  const d = dom(), calls = []; let props = run(); const before = structuredClone(props);
  const clean = bindDriveLessonUi(d.root, () => props, {onNext: () => calls.push('next'), onLeave: () => calls.push('leave')});
  d.emit('click', d.node({driveAction: 'next'}));
  const key = d.emit('keydown', d.node({}, 'DIV'), {key: 'Enter', repeat: false});
  assert.equal(key.prevented, true); assert.deepEqual(calls, ['next', 'next']);
  d.emit('keydown', d.node({}, 'INPUT'), {key: 'Enter'}); assert.equal(calls.length, 2);
  assert.deepEqual(props, before);
  props.lesson.phase = 'driving'; d.emit('click', d.node({driveAction: 'next'})); assert.equal(calls.length, 2);
  props = {...run(), runPlayerId: 'son'}; d.emit('click', d.node({driveAction: 'next'})); assert.equal(calls.length, 2);
  d.emit('click', d.node({driveAction: 'leave'})); assert.equal(calls.at(-1), 'leave'); clean();
});

test('presentation CSS stays within its own component and preserves visible keyboard focus', async () => {
  const css = await readFile(new URL('../src/lessons/drive-lesson-ui.css', import.meta.url), 'utf8');
  for (const block of css.matchAll(/([^{}]+)\{/g)) {
    const selector = block[1].trim(); if (selector.startsWith('@')) continue;
    assert.ok(selector.split(',').every(value => value.trim().startsWith('.drive-lesson')), selector);
  }
  assert.match(css, /:focus-visible/); assert.doesNotMatch(css, /outline:\s*(none|0)/);
});


test('lesson completion requires actual current run/player/car/settings and a finished three-win challenge',()=>{
  const state={playerId:'kyle',car:'falcone',difficulty:'pro',driverId:'club'};
  const lesson={id:'corner',stage:'challenge',phase:'result',done:true,streak:3,bestMargin:.42,
    lastAttempt:{finished:true,passed:true}};
  const actual={state,ownerId:'kyle',plan:{car:'falcone',difficulty:'pro',driverId:'club'},lesson};
  const before=JSON.stringify(actual);
  assert.deepEqual(driveLessonCompletion(actual,state,'kyle'),{id:'corner',carId:'falcone',marginSeconds:.42});
  assert.equal(driveLessonCompletion(actual,{...state},'kyle'),null,'an old/replaced state cannot pay');
  assert.equal(driveLessonCompletion(actual,state,'son'),null,'a switched player cannot pay');
  for(const patch of [{ownerId:'son'},{plan:{...actual.plan,car:'other'}},{plan:{...actual.plan,difficulty:'casual'}},
    {plan:{...actual.plan,driverId:'other'}},{lesson:{...lesson,streak:2}},{lesson:{...lesson,phase:'driving'}},
    {lesson:{...lesson,stage:'right'}},{lesson:{...lesson,bestMargin:0}},
    {lesson:{...lesson,lastAttempt:{finished:false,passed:true}}}])
    assert.equal(driveLessonCompletion({...actual,...patch},state,'kyle'),null);
  assert.equal(JSON.stringify(actual),before,'eligibility is read-only');
});

test('owned host code isolates lessons from ordinary settlement, ghost saving and progression',async()=>{
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const game=await readFile(new URL('../src/game.js',import.meta.url),'utf8');
  for(const signature of ['_startLapTelemetry(state)','_updateLapTelemetry(state)','_startGhostStage(state)',
    '_updateGhost(state)','_markActiveRace(state)','_settleResult(result,state)','_recordIntelLap(event,state)',
    '_settlePoliceTicket(ticket,state)']){
    const at=app.indexOf('  '+signature);
    assert.ok(at>=0,signature+' exists');
    assert.match(app.slice(at,at+115),/if\(this\.duel\.drivingLesson\)return;/,signature+' rejects lesson run');
  }
  const begin=game.indexOf('  _stepDriveLesson(dt)'),end=game.indexOf('  // ---- arena events',begin);
  const branch=game.slice(begin,end);
  assert.match(branch,/this\._drive\(dt\)/);assert.match(branch,/this\._collisions\(\)/);
  assert.doesNotMatch(branch,/_advanceLaps|_finishStage|_traffic|_police|stepCombat|settleRace/);
  assert.match(game,/s\.traffic = grandPrix \|\| this\.drivingLesson \? \[\] : this\._spawnTraffic/);
});


test('preparation cleanup clears only its still-current token and cannot erase a newer attempt',()=>{
  const old={},current={},host={_driveLessonPreparing:current,driveLessonMessage:'New run preparing'};
  assert.equal(settleDriveLessonPreparation(host,old,'Old run rejected'),false);
  assert.equal(host._driveLessonPreparing,current);assert.equal(host.driveLessonMessage,'New run preparing');
  assert.equal(settleDriveLessonPreparation(host,current,'Setup changed'),true);
  assert.equal(host._driveLessonPreparing,null);assert.equal(host.driveLessonMessage,'Setup changed');
});

test('nullable native ghost ground fields do not become invented zero-height witnesses',()=>{
  const sample={t:0,s:10,lateral:2,heading:.2,mph:60,airHeight:0,groundHeight:null,terrainPitch:null};
  const next={...sample,t:1,s:20,groundHeight:700,terrainPitch:.3,terrainRoll:.2};
  const course={at:()=>({heading:.1})};
  for(const time of [0,.5]){
    const actual=driveLessonGhostPose([sample,next],time,'falcone',course);
    assert.equal(actual.groundHeight,null);assert.equal(actual.terrainPitch,null);assert.equal(actual.terrainRoll,null);
    assert.equal(actual.airHeight,0,'a genuine finite zero is preserved');
  }
  const actual=driveLessonGhostPose([{...sample,groundHeight:600,terrainPitch:.1,terrainRoll:0},next],.5,'falcone',course);
  assert.equal(actual.groundHeight,650);assert.equal(actual.terrainPitch,.2);assert.equal(actual.terrainRoll,.1);
});

test('failed lesson save keeps one session reward, preserves durable progress and retry persists it once',async()=>{
  const {finishDriveLesson}=await import('../src/lessons/drive-lesson-save.js');
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const method=(name,next,...dependencies)=>{
    const start=source.indexOf('  '+name+'('),end=source.indexOf('  '+next+'(',start);
    assert.ok(start>=0&&end>start);
    return Function('finishDriveLesson','driveLessonCompletion','return ({'+source.slice(start,end)+'}).'+name)(...dependencies);
  };
  const event=method('_driveLessonEvent','retryLessonSave',finishDriveLesson,driveLessonCompletion);
  const retry=method('retryLessonSave','_sayDriveLesson',finishDriveLesson,driveLessonCompletion);
  const state={playerId:'kyle',car:'falcone_f42',difficulty:'pro',driverId:'club'};
  const lesson={id:'corner',stage:'challenge',phase:'result',done:true,streak:3,bestMargin:.4,
    lastAttempt:{finished:true,passed:true}};
  const run={state,ownerId:'kyle',plan:{car:state.car,difficulty:state.difficulty,driverId:state.driverId},lesson};
  const profile={credits:100,unlockedCars:[state.car],upgrades:{[state.car]:{brakes:1}}};
  let durable=JSON.stringify(profile),canSave=false,writes=0;
  const radio=[],host={duel:{state,drivingLesson:run},player:{id:'kyle'},_runPlayerId:'kyle',profile,
    audio:{context:null},_refreshPlayer(){},_sayDriveLesson:id=>radio.push(id),
    _saveProfile(){writes++;this.profileSaved=canSave;if(canSave)durable=JSON.stringify(this.profile);return canSave;}};
  const response={driveLessonAnswer:{result:'passed',radio:'drive.radio.corner.pass',cones:[]}};
  event.call(host,state,response);
  assert.equal(host.profile.upgrades[state.car].brakes,2);assert.equal(run.rewarded,true);assert.equal(run.saved,false);
  assert.equal(JSON.parse(durable).upgrades[state.car].brakes,1,'failed storage retains the last durable career');
  assert.match(host.driveLessonMessage,/this session|could not be saved/);assert.deepEqual(radio,[],'no durable success line before save');
  event.call(host,state,response);assert.equal(host.profile.upgrades[state.car].brakes,2);assert.equal(writes,1,'duplicate event never pays or saves twice');
  canSave=true;assert.equal(retry.call(host),true);assert.equal(run.saved,true);
  const reloaded=JSON.parse(durable);
  assert.equal(reloaded.upgrades[state.car].brakes,2);assert.equal(reloaded.drivingLessons.rewarded.corner,true);
  assert.equal(finishDriveLesson(reloaded,'corner',.5,state.car).profile.upgrades[state.car].brakes,2,'retake after successful reload cannot pay again');
  assert.deepEqual(radio,['drive.radio.corner.pass']);assert.equal(retry.call(host),false);
});

test('save retry is shown and dispatched only for a current completed session with failed persistence',()=>{
  const props=run();Object.assign(props.lesson,{stage:'challenge',done:true,streak:3});
  Object.assign(props.lesson.lastAttempt,{finished:true,passed:true});props.lessonSaveFailed=true;
  assert.match(driveLessonResultMarkup(props),/data-drive-action="retry-save"/);
  const d=dom();let retries=0;
  const clean=bindDriveLessonUi(d.root,()=>props,{onRetrySave:()=>retries++});
  d.emit('click',d.node({driveAction:'retry-save'}));assert.equal(retries,1);
  props.runPlayerId='son';d.emit('click',d.node({driveAction:'retry-save'}));assert.equal(retries,1);
  props.runPlayerId='kyle';props.lessonSaveFailed=false;d.emit('click',d.node({driveAction:'retry-save'}));assert.equal(retries,1);
  assert.doesNotMatch(driveLessonResultMarkup(props),/data-drive-action="retry-save"/);clean();
});
