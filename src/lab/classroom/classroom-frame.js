// The classroom lesson pattern (docs/board/cards/LAB-CLASSROOM.md sections 2 and 3).
// Teaching state only: the lesson model, where the player is, Brian's help and
// whether the player looks stuck. No DOM, no saves, no race state.

export const PARTS = Object.freeze(['Wonder', 'Words', 'Watch', 'Try with help', 'On your own', 'Check', 'Recap']);
// Brian offers help after this long without progress, and gives the first hint himself after the second.
export const STUCK_OFFER_S = 12;
export const STUCK_HINT_S = 25;
export const SLOW_MOTION = .5;
// Brian's pointer takes this long to reach the control before he presses it for the player.
export const SHOW_ME_S = 1.4;
const HELP_RUNGS = 3;
// A result stays on the page; a "watch this" line or a hint does not.
const KEPT_EVENTS = Object.freeze(['right', 'wrong', 'pass', 'fail']);

// lesson: {id, steps: [{id, part, title}], createModel()}. The model owns the step's experiment:
// enter(index), act(action) -> event, tick(dt) -> event, view({help, assist}) and targetOf(action).
// Events: {kind: 'right' | 'wrong' | 'pass' | 'fail' | 'progress' | 'sound', say?, sound?}.
export function createClassroomSession(lesson) {
  const model = lesson.createModel();
  let index = 0, furthest = 0, help = 0, idle = 0, offered = false, slow = false, time = 0;
  // nudge: Brian's offer of help when the player seems stuck, shown under his words so it never replaces them.
  let bubble = null, celebrate = null, pointer = null, nudge = null, lastSay = null;
  const done = new Set(), events = [];
  // The page: what each step has taught so far (its first words and its latest result). Nothing is replaced by the next step.
  const page = new Map();
  const pageRow = i => { if (!page.has(i)) page.set(i, {title: lesson.steps[i].title, setup: null, result: null}); return page.get(i); };
  model.enter(0);

  function handle(event) {
    if (!event) return;
    events.push(event);
    if (event.kind === 'right' || event.kind === 'pass') celebrate = {at: time, big: event.kind === 'pass' || event.big === true};
    // Any step forward clears the help: the next part starts from a nudge again.
    if (event.kind === 'right' || event.kind === 'pass' || event.kind === 'progress') { help = 0; pointer = null; }
    // A failed try climbs one rung, but Brian never takes over by himself: Show me waits for the player.
    if (event.kind === 'fail') help = Math.min(HELP_RUNGS - 1, help + 1);
    // Anything the player does, a click of the dial included, means they are not stuck.
    idle = 0; offered = false; nudge = null;
    if (event.kind !== 'sound') bubble = event.say ? {text: event.say, mood: moodOf(event.kind)} : null;
    if (event.say && KEPT_EVENTS.includes(event.kind)) pageRow(index).result = event.say;
  }
  const moodOf = kind => kind === 'right' || kind === 'pass' ? 'cheer' : kind === 'wrong' || kind === 'fail' ? 'explain' : 'talk';
  function enter(i) {
    index = i; furthest = Math.max(furthest, i); slow = false; help = 0; idle = 0; offered = false; bubble = null; pointer = null; celebrate = null; nudge = null; lastSay = null;
    model.enter(i);
  }
  const current = () => model.view({help, assist: help >= HELP_RUNGS});

  return {
    lesson,
    act(action) {
      if (action === 'next') { const v = current(); if (!v.ready || index + 1 >= lesson.steps.length) return false; done.add(index); enter(index + 1); return true; }
      if (action === 'help') return this.help();
      // Back: the step before this one, to read or do it again.
      if (action === 'back') { if (index === 0) return false; enter(index - 1); return true; }
      if (action === 'slow') { slow = !slow; return true; }
      if (action.startsWith('go:')) {
        const to = Number(action.slice(3));
        if (!Number.isInteger(to) || to < 0 || to > furthest || to === index) return false;
        enter(to); return true;
      }
      handle(model.act(action));
      return true;
    },
    help() {
      help = Math.min(HELP_RUNGS, help + 1); idle = 0; offered = true; nudge = null;
      const v = current();
      if (help === HELP_RUNGS && v.target) pointer = {action: v.target, at: time};
      bubble = {text: v.hints[help - 1], mood: 'hint'};
      return true;
    },
    tick(dt) {
      const step = Math.max(0, Math.min(dt, .1));
      time += step;
      handle(model.tick(step * (slow ? SLOW_MOTION : 1)));
      const v = current();
      // A result that arrives with no event (a Watch ending) replaces a hint the player asked for during it.
      if (v.say !== lastSay) { if (lastSay !== null && bubble?.mood === 'hint') bubble = null; lastSay = v.say; }
      // Show me: the pointer reaches the control, Brian presses it, and hands the next part back.
      if (pointer && !pointer.done && time - pointer.at >= SHOW_ME_S && v.target === pointer.action && !v.pointOnly) {
        pointer.done = true;
        handle(model.act(pointer.action));
        celebrate = null; help = 0;
        bubble = {text: `That is how it is done. ${current().say}`, mood: 'talk'};
        return;
      }
      if (!v.waiting) { idle = 0; return; }
      idle += step;
      if (idle >= STUCK_OFFER_S && !offered) { offered = true; nudge = {text: 'Stuck? Press H and I will help.'}; }
      if (idle >= STUCK_HINT_S && help === 0) { help = 1; nudge = {text: v.hints[0]}; }
    },
    takeEvents() { return events.splice(0); },
    view() {
      const v = current(), step = lesson.steps[index], row = pageRow(index);
      row.setup ??= v.say;
      // A step that has finished may end on new words of its own, with no event: they are its result.
      if (v.ready && v.say && v.say !== row.setup) row.result = v.say;
      return {
        ...v, index, step, slow, help, time,
        page: lesson.steps.slice(0, index + 1).map((_, i) => page.get(i)).filter(Boolean),
        parts: PARTS.map((name, part) => {
          const steps = lesson.steps.map((s, i) => ({...s, i})).filter(s => s.part === part);
          return {name, first: steps[0]?.i ?? null, current: step.part === part, done: steps.length > 0 && steps.every(s => done.has(s.i)), reached: steps.some(s => s.i <= furthest)};
        }),
        brian: bubble ?? {text: v.say, mood: v.mood ?? 'talk'}, nudge,
        pointer: pointer && v.target === pointer.action ? {...pointer, age: time - pointer.at} : null,
        celebrate: celebrate && time - celebrate.at < 1.6 ? {...celebrate, age: time - celebrate.at} : null,
        last: index === lesson.steps.length - 1,
      };
    },
  };
}
