// LAB-CLASSROOM-STRENGTH (docs/board/cards/LAB-CLASSROOM-STRENGTH.md): Strength against weight as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, NAMES, LIGHTEST, STEP_MM, armOutcome, barUsed, failKg, barMm, safeLine, inReach, benchAttempts} from '../src/lab/lessons/strength-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/strength-board.js';
import {MATERIALS, ARM, loadBar, hookArm, lightestArm, strengthBench} from '../src/lab/benches/strength.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';
import {KESTREL} from '../src/heli/heli-flight.js';
import {LAB_HELI} from '../src/lab/lab-heli.js';

const lesson = CLASSROOM_LESSONS.strength;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
// Pick and turn the arm to a build, as the keys do.
function build(session, material, mm) {
  const v = session.view();
  if (v.rack && !v.rack.locked && v.rack.chosen !== material) session.act(`material:${NAMES.indexOf(material)}`);
  for (let i = 0; i < 20 && session.view().handle.mm < mm; i++) session.act('thick:up');
  for (let i = 0; i < 20 && session.view().handle.mm > mm; i++) session.act('thick:down');
  assert.equal(session.view().handle.mm, mm); assert.equal(session.view().rack.chosen, material);
}
const hang = session => { session.act('go'); until(session, x => !x.rigs[0] || x.rigs[0].lower === 0 || x.ready || x.keys.Space === 'go', 10); };
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-strength') { session.act('load:add'); session.act('load:add'); }
    else if (step === 'word-stiff' || step === 'word-brittle') { session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-snap') { session.act('material:2'); session.act('go'); session.act('answer:2'); until(session, x => x.ready); }
    else if (step === 'try-steel') { build(session, 'steel', 80); session.act('go'); until(session, x => x.ready); }
    else if (step === 'alone') { build(session, 'carbon fibre', 50); session.act('go'); until(session, x => x.ready); }
    else if (step === 'check-bars' || step === 'check-game') session.act('answer:1');
    else if (step === 'check-snap') session.act('answer:2');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}
// The challenge path in lab-view.js, as it feeds a lesson's machine runs to the bench.
function benchPasses(attempts) {
  let bench = openBench('strength');
  for (const attempt of attempts) {
    for (const c of bench.bench.controls) bench = setControl(bench, c.id, c.value);
    for (const c of attempt.controls) if (Object.hasOwn(attempt.input, c.id)) bench = setControl(bench, c.setting ?? c.id, c.values?.[Math.round(attempt.input[c.id])] ?? attempt.input[c.id]);
    bench = runBench(bench);
  }
  return goalMet(bench);
}

test('the lesson walks the seven parts in order, keeps the old six notebook words, and finishes on the bench', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  const taught = STEPS.flatMap(s => [s.word, ...(s.words ?? [])].filter(Boolean));
  assert.deepEqual(taught, ['strength-strength', 'strength-stiff', 'strength-brittle', 'strength-aluminium', 'strength-steel', 'strength-carbon-fibre'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.id), taught);
  assert.equal(lesson.name, 'Strength against weight');
  assert.equal(lesson.finishLabel, 'Finish the lesson');
  assert.equal(STEPS.find(s => s.id === 'watch').voice, 'lab.brian.strength.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.strength.explain');
});

test('every number is the strength bench’s own: loadBar for the bars, hookArm for the arms', () => {
  // Three 1 kg bars: steel is thinnest and gives first; carbon fibre snaps, the metals bend.
  assert.deepEqual(NAMES.map(n => Math.round(barMm(n) * 10) / 10), [18.5, 6.4, 31.3]);
  assert.deepEqual(NAMES.map(n => Math.round(failKg(n))), [128, 14, 1991]);
  assert.equal(Math.round(barUsed('steel', 10) * 100), 73);
  assert.ok(barUsed('steel', 20) >= 1 && barUsed('steel', 10) < 1);
  assert.equal(loadBar('steel', 10).tipDropMm.toFixed(1), '23.7');
  assert.equal(loadBar('carbon fibre', 10).tipDropMm.toFixed(1), '0.3');
  // The arm: the bench's own verdict, its safety lines and the lightest arm, reachable 10 mm a press.
  for (const material of NAMES) for (let mm = 10; mm <= 120; mm += STEP_MM) {
    const o = armOutcome(material, mm), arm = hookArm(material, mm);
    assert.deepEqual(o.arm, arm);
    assert.equal(o.holds, arm.holds);
    assert.equal(o.holds, o.state === 'holds' && !o.overLine && !o.tooDeep, `${material} ${mm}`);
    assert.equal(inReach(arm), strengthBench.run({part: 'hook arm', material, thicknessMm: mm}).withinReach, `${material} ${mm}`);
  }
  assert.deepEqual(LIGHTEST, lightestArm());
  assert.equal(LIGHTEST.thicknessMm % STEP_MM, 0, 'the handle reaches the lightest arm');
  assert.equal(safeLine('steel'), 1 / ARM.ductileMargin); assert.equal(safeLine('carbon fibre'), 1 / ARM.brittleMargin);
  assert.deepEqual(['steel', 'aluminium', 'carbon fibre'].map(m => [10, 20, 30, 40, 50, 60, 70, 80].find(mm => hookArm(m, mm).holds)), [80, 80, 50]);
  // The Heavy hook the pass opens is the game's own number.
  assert.equal(ARM.loadKg, LAB_HELI.heavyHookKg);
  assert.match(lesson.passSay, new RegExp(`${KESTREL.hookLimitKg.toLocaleString('en-GB')} kg`));
});

test('a child who does exactly what each prompt says passes every step, and the lesson’s runs pass the bench', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.ready, true);
  assert.ok(v.parts.slice(0, 6).every(p => p.done));
  const attempts = benchAttempts(v);
  assert.ok(attempts.length >= 3 && attempts.every(a => a.input.part === 'hook arm'));
  assert.equal(benchPasses(attempts), true, 'the lesson’s own arms pass the bench’s goal');
  assert.equal(benchPasses(attempts.filter(a => a.input.material !== 'carbon fibre' || a.input.thicknessMm !== 50)), false, 'without the lightest arm the bench is not passed');
});

test('words: ↑ hangs 10 kg on the steel bar until it bends; Space dips two bars; the ram snaps carbon fibre', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-strength');
  assert.equal(session.view().rigs[0].used, 0);
  session.act('load:add');
  assert.match(session.view().brian.text, /^10 kg uses 73% of its strength\. It dips 23\.7 mm/);
  assert.equal(session.view().ready, false);
  session.act('load:add');
  assert.match(session.view().brian.text, /^20 kg used 145% of the bar’s strength: past 100%, so it bent for good/);
  assert.equal(session.view().rigs[0].state, 'bent');
  session.act('next');
  session.act('go'); run(session, 1);
  const [steel, carbon] = session.view().rigs;
  assert.ok(Math.abs(steel.dipMm - 23.7) < .1 && carbon.dipMm < .5, 'the dips show while the weights hang');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /the steel bar dipped 23\.7 mm, the carbon fibre bar 0\.3 mm, and both sprang back/);
  session.act('next');
  session.act('go'); run(session, 1);
  assert.equal(session.view().rigs[0].state, 'ok', 'it springs back until it snaps');
  until(session, x => x.ready);
  assert.equal(session.view().rigs[0].state, 'snapped');
  assert.match(session.view().brian.text, /^It held 1,991 kg/);
});

test('the watch loads three 1 kg bars together: steel bends first, then aluminium, and carbon fibre snaps', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'watch');
  const order = [];
  until(session, v => { for (const r of v.table) if (r.state && !order.includes(r.material)) order.push(r.material); return v.ready; });
  assert.deepEqual(order, ['steel', 'aluminium', 'carbon fibre']);
  assert.deepEqual(session.view().table.map(r => r.state), ['bent', 'bent', 'snapped']);
  assert.ok(session.view().actions.includes('slow') && session.view().actions.includes('replay'));
});

test('the tries: Space on the wrong arm, every wrong guess and every arm that fails says why with its numbers', () => {
  const snap = createClassroomSession(lesson);
  playThroughTo(snap, 'try-snap');
  snap.act('go');
  assert.match(snap.view().brian.text, /press 3 first/);
  assert.equal(snap.view().cards.length, 0);
  snap.act('material:2'); snap.act('go');
  assert.equal(snap.view().cards.length, 3, 'set up, then guess from pictures of results');
  snap.act('answer:0'); until(snap, x => x.ready);
  assert.match(snap.view().brian.text, /^It snapped\. The car used 164% of its strength: past 100%/);
  const bend = createClassroomSession(lesson);
  playThroughTo(bend, 'try-snap');
  bend.act('material:2'); bend.act('go'); bend.act('answer:1'); until(bend, x => x.ready);
  assert.match(bend.view().brian.text, /^It snapped, not bent: carbon fibre is brittle/);

  const steel = createClassroomSession(lesson);
  playThroughTo(steel, 'try-steel');
  assert.equal(steel.view().rack.locked, true, 'the steel try keeps steel');
  build(steel, 'steel', 50); steel.act('go'); until(steel, x => x.keys.Space === 'go');
  assert.match(steel.view().brian.text, /^Steel at 50 mm: the car used 157% of its strength, past 100%, so it bent for good\. Thicker: press ↑/);
  build(steel, 'steel', 70); steel.act('go'); until(steel, x => x.keys.Space === 'go');
  assert.match(steel.view().brian.text, /^Steel at 70 mm held, but used 80% of its strength, over the line for metal, two thirds \(67%\)/);
  build(steel, 'steel', 80); steel.act('go'); until(steel, x => x.ready);
  assert.match(steel.view().brian.text, /^80 mm of steel holds the car: 61% of its strength, inside the line, and it dips 1\.6 mm\. But it weighs 18\.8 kg\./);
});

test('Brian’s job: the lightest arm that holds; heavier arms and arms that fail say why, and the list keeps every arm that held', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.deepEqual(session.view().job.held.map(h => [h.material, h.mm]), [['steel', 80]]);
  hang(session); until(session, x => x.keys.Space === 'go');
  assert.match(session.view().brian.text, /^This arm held before, at 18\.8 kg\. Try a lighter material\./);
  build(session, 'aluminium', 80); session.act('go'); until(session, x => x.keys.Space === 'go');
  assert.match(session.view().brian.text, /^It holds at 6\.5 kg, your lightest yet\. Can a lighter material do it\?/);
  build(session, 'carbon fibre', 40); session.act('go'); until(session, x => x.keys.Space === 'go');
  assert.match(session.view().brian.text, /^Carbon fibre at 40 mm held, but used 41% of its strength, over carbon fibre’s line of 33%, and dipped 18\.9 mm, more than the 10 mm the hook may dip\./);
  build(session, 'carbon fibre', 20); session.act('go'); until(session, x => x.keys.Space === 'go');
  assert.match(session.view().brian.text, /Carbon fibre is brittle, so it snapped\. Make it thicker, or try another material/);
  build(session, 'carbon fibre', 60); session.act('go'); until(session, x => x.keys.Space === 'go');
  assert.match(session.view().brian.text, /^It holds at 2\.9 kg, your lightest yet\. Can a thinner one still hold\?/);
  assert.equal(session.view().ready, false);
  build(session, 'carbon fibre', 50); session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^Carbon fibre at 50 mm holds the car and weighs 2\.4 kg: the lightest arm that can\./);
  assert.deepEqual(session.view().job.held.map(h => h.mm).sort((a, b) => a - b), [50, 60, 80, 80]);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me picks, turns and hangs', () => {
  for (const id of ['word-strength', 'word-stiff', 'word-brittle', 'try-snap', 'try-steel', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    const at = targetPoint(v, v.pointer.action);
    assert.ok(at, `${id}: at a place on the board`);
    if (v.pointer.action !== 'build:best') assert.equal(hitTest(v, ...at)?.action, v.pointer.action, `${id}: a click where Brian points does it`);
    else assert.ok(hitTest(v, ...at), `${id}: Brian points at the rack or the handle`);
    // Brian presses it, says "Like that.", and goes on building where there is more to do.
    run(session, SHOW_ME_S + .1);
    assert.match(session.view().brian.text, /^Like that\. /);
    if (id === 'word-strength') { for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .2); }
    if (id === 'try-snap') { until(session, x => x.cards.length === 3, 5); session.act('answer:2'); }
    until(session, x => x.ready, 30);
  }
  // Show me in Brian's job builds the lightest arm itself.
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  for (let k = 0; k < 3; k++) job.act('help');
  until(job, x => x.ready, 30);
  assert.equal(job.view().handle.mm, LIGHTEST.thicknessMm); assert.equal(job.view().rack.chosen, LIGHTEST.material);
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-bars': [[0, /^The aluminium bar held 128 kg; the steel bar bent at 14 kg\./], [2, /^Carbon fibre never bends for good: it held 1,991 kg, then snapped\./]],
    'check-snap': [[0, /^Aluminium is a metal: it bends for good before it breaks/], [1, /^Steel is a metal/]],
    'check-game': [[0, /^It holds, but it weighs 16\.4 kg more for the helicopter to lift/], [2, /^Carbon fibre at 30 mm held, but used 73% of its strength, over carbon fibre’s line of 33%, and dipped 44\.9 mm/]],
  };
  for (const [id, picks] of Object.entries(answers)) for (const [pick, why] of picks) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    // The board does not give the answer away before the player picks.
    assert.ok((session.view().bars ?? []).every(b => !b.shown));
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
    if (session.view().bars) assert.ok(session.view().bars.every(b => b.shown), 'the bars give way once answered');
  }
});

test('mouse: the rack picks, the handle turns, a click on the car hangs it, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  let v = session.view();
  for (const [i, material] of NAMES.entries()) assert.equal(hitTest(v, ...targetPoint(v, `material:${i}`))?.action, `material:${i}`, material);
  assert.equal(hitTest(v, ...targetPoint(v, 'thick:up'))?.action, 'thick:up');
  assert.equal(hitTest(v, ...targetPoint(v, 'thick:down'))?.action, 'thick:down');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  assert.equal(hitTest(v, 780, 400), null, 'a click on the job card does nothing');
  for (const point of [targetPoint(v, 'material:0'), targetPoint(v, 'thick:up'), [80, 220], [300, 220], [680, 200], [880, 200], [500, 520]]) assert.ok(hoverInfo(v, ...point), `hover at ${point}`);
  session.act(hitTest(v, ...targetPoint(v, 'material:2')).action);
  session.act(hitTest(v, ...targetPoint(v, 'thick:down')).action);
  v = session.view();
  assert.equal(v.rack.chosen, 'carbon fibre'); assert.equal(v.handle.mm, 70);
  const word = createClassroomSession(lesson);
  playThroughTo(word, 'word-strength');
  v = word.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'load:add'))?.action, 'load:add');
  const steel = createClassroomSession(lesson);
  playThroughTo(steel, 'try-steel');
  v = steel.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'material:2')), null, 'the steel try’s rack is shut');
});

test('the board draws every step and card', () => {
  const calls = new Set();
  const fake = () => new Proxy({}, {get: (target, name) => {
    if (name in target) return target[name];
    if (name === 'measureText') return value => ({width: String(value).length * 9});
    if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
    return () => { calls.add(name); };
  }, set: (target, name, value) => { target[name] = value; return true; }});
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  for (let i = 0; i < STEPS.length; i++) {
    session.act(`go:${i}`);
    if (STEPS[i].id === 'try-snap') { session.act('material:2'); session.act('go'); }
    for (const t of [0, 1, 4]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
  for (const state of ['holds', 'bends', 'snaps']) { calls.clear(); drawPicture(fake(), {kind: 'outcome', state}, 220, 110); assert.ok(calls.has('fillRect'), state); }
});

test('review fixes: Brian’s job starts from the steel arm the player built, and quotes its weight', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-steel');
  build(session, 'steel', 100); session.act('go'); until(session, x => x.ready);
  session.act('next');
  const v = session.view();
  assert.deepEqual(v.job.held.map(h => [h.material, h.mm]), [['steel', 100]]);
  assert.equal(v.handle.mm, 100);
  assert.match(v.brian.text, /Your steel arm weighs 23\.6 kg\./);
  build(session, 'carbon fibre', 50); session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /Your steel arm weighed 23\.6 kg\. Job done\./);
});

test('the old lesson’s faults are gone: thickness and weight always show, every step is named, carbon fibre never bends for good', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-steel');
  session.act('thick:up');
  let v = session.view();
  assert.equal(v.handle.mm, 50); assert.match(v.prompt, /^Steel, 50 mm, 11\.8 kg\./);
  assert.match(v.prompt, /Space to hang the car/, 'the hang step is in the prompt');
  for (const material of NAMES) for (let mm = 10; mm <= 120; mm += STEP_MM) if (MATERIALS[material].brittle) assert.notEqual(armOutcome(material, mm).state, 'bends');
  session.act('help'); session.act('help');
  assert.match(session.view().brian.text, /Press ↑ until it reads 80 mm, then Space/);
  v = session.view();
  assert.deepEqual(v.repeat, ['↑', '↓'], 'holding ↑ keeps turning');
});
