// Presentation only. The job's own line clock continues independently.
//
// What the screen does with the story's spoken lines (EVERBURN-PLAY-FIXES, third round):
// - A line is shown for its reading time: 1.2 seconds plus 0.055 seconds a character, never less than 2.5 or more than 7.5.
// - With nothing waiting, a line keeps its full reading time. Once another line waits, the line on screen ends when it has had
//   2.5 seconds or 60 per cent of its reading time, whichever is longer.
// - A line that has waited 6 seconds is dropped: a late line is worse than none.
// - An urgent line goes to the front of the queue and is shown once the line on screen has had 1.5 seconds. The line it
//   interrupts comes back once, at the front, unless it had already had 60 per cent of its reading time.
// - A line with its own time (an arrow for a door that is opening) keeps that time and never gives way, and is dropped when
//   that time has passed from the moment it was handed over, even while another line or a crash hides it.
export const MIN_CAPTION_SECONDS = 2.5;
export const MAX_CAPTION_SECONDS = 7.5;
export const GIVE_WAY_SHARE = .6;
export const DROP_AFTER_SECONDS = 6;
export const INTERRUPT_AFTER_SECONDS = 1.5;
const EPSILON = 1e-9;

export function captionSeconds(text) {
  return Math.max(MIN_CAPTION_SECONDS, Math.min(MAX_CAPTION_SECONDS, 1.2 + 0.055 * text.length));
}

// How long a line on screen stays once it has had `elapsed` seconds, given whether another line waits.
function secondsLeft(line, elapsed, othersWait) {
  const limit = othersWait && !line.fixed ? Math.max(MIN_CAPTION_SECONDS, GIVE_WAY_SHARE * line.duration) : line.duration;
  return Math.max(0, Math.min(line.duration, limit) - elapsed);
}

export function createCaptionQueue() {
  let current = null, waiting = [], now = 0;
  const expired = (line, time) => line.deadline !== undefined && time >= line.deadline - EPSILON;
  const stale = line => line.waited >= DROP_AFTER_SECONDS - EPSILON;
  const present = (line, elapsed = 0) => ({...line, elapsed});
  function dropStale(time) { waiting = waiting.filter(line => !expired(line, time) && !stale(line)); }
  function startNext(time) {
    dropStale(time);
    if (!current && waiting.length) current = waiting.shift();
  }
  // An urgent line that has not interrupted already is the one that may cut in.
  const urgentIndex = () => waiting.findIndex(line => line.urgent && !line.interrupted);
  function advance(time, paused = false) {
    const end = Math.max(now, time);
    if (paused) {
      // A crash hides the caption: nothing on screen runs on, and a waiting line does not grow late; only a line's own time passes.
      waiting = waiting.filter(line => !expired(line, end));
      if (current && expired(current, end)) current = null;
      now = end;
      return current?.text ?? '';
    }
    for (let guard = 0; guard < 1000; guard++) {
      startNext(now);
      if (!current) { now = end; break; }
      const interrupt = urgentIndex();
      const toEnd = Math.min(secondsLeft(current, current.elapsed, waiting.length > 0), (current.deadline ?? Infinity) - now);
      const toInterrupt = interrupt < 0 ? Infinity : Math.max(0, INTERRUPT_AFTER_SECONDS - current.elapsed);
      const toExpiry = Math.min(Infinity, ...waiting.map(line => Math.min(DROP_AFTER_SECONDS - line.waited, (line.deadline ?? Infinity) - now)));
      const used = Math.max(0, Math.min(end - now, toEnd, toInterrupt, toExpiry));
      current.elapsed += used; now += used;
      for (const line of waiting) line.waited += used;
      dropStale(now);
      if (expired(current, now) || secondsLeft(current, current.elapsed, waiting.length > 0) <= EPSILON) { current = null; continue; }
      const urgent = urgentIndex();
      if (urgent >= 0 && current.elapsed >= INTERRUPT_AFTER_SECONDS - EPSILON) {
        const next = waiting.splice(urgent, 1)[0];
        // The line cut short comes back once, and only if it has not yet had 60 per cent of its reading time (a timed arrow comes back
        // while its own time lasts): a short line that was read is not shown again, and no line is shown a third time.
        if (!current.interrupted && (current.fixed || current.elapsed < GIVE_WAY_SHARE * current.duration - EPSILON))
          waiting.unshift({...current, interrupted: true, waited: 0});
        current = next;
        continue;
      }
      if (now >= end - EPSILON) break;
    }
    now = end;
    return current?.text ?? '';
  }
  return {
    add(text, urgent, time, fixedTime, paused = false) {
      advance(time, paused);
      if (!text) return;
      const fixed = Number.isFinite(fixedTime) ? Math.max(INTERRUPT_AFTER_SECONDS, fixedTime) : undefined;
      const line = present({text, urgent: !!urgent, fixed: fixed !== undefined, duration: fixed ?? captionSeconds(text),
        deadline: fixed === undefined ? undefined : time + fixed, waited: 0});
      if (urgent) {
        const index = waiting.findIndex(item => !item.urgent);
        waiting.splice(index < 0 ? waiting.length : index, 0, line);
      } else waiting.push(line);
      if (!paused) advance(time);
    },
    advance,
    clear(time = 0) { current = null; waiting = []; now = time; },
  };
}
