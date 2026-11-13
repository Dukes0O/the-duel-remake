// Presentation only. The job's own line clock continues independently.
export function captionSeconds(text, crowded = false) {
  const seconds = Math.max(2.5, Math.min(7.5, 1.2 + 0.055 * text.length));
  return crowded ? Math.max(2.5, seconds * 0.7) : seconds;
}

export function createCaptionQueue() {
  let current = null, waiting = [], now = 0;
  const expired = (line, time) => line.deadline !== undefined && time >= line.deadline;
  function startNext(time) {
    waiting = waiting.filter(line => !expired(line, time));
    if (!current && waiting.length) {
      current = {...waiting.shift(), elapsed: 0};
      current.duration = current.fixedTime ?? captionSeconds(current.text, current.crowded === true);
    }
  }
  function advance(time, paused = false) {
    const end = Math.max(now, time);
    if (paused) {
      waiting = waiting.filter(line => !expired(line, end));
      if (current && expired(current, end)) current = null;
      now = end;
      return current?.text ?? '';
    }
    startNext(now);
    while (current) {
      if (expired(current, now)) { current = null; startNext(now); continue; }
      waiting = waiting.filter(line => !expired(line, now));
      const urgent = waiting.findIndex(line => line.urgent);
      const untilInterrupt = urgent < 0 ? Infinity : Math.max(0, 1.5 - current.elapsed);
      const untilEnd = Math.min(current.duration - current.elapsed, (current.deadline ?? Infinity) - now);
      const nextExpiry = Math.min(Infinity, ...waiting.map(line => (line.deadline ?? Infinity) - now));
      const used = Math.min(end - now, untilInterrupt, untilEnd, nextExpiry);
      current.elapsed += used; now += used;
      waiting = waiting.filter(line => !expired(line, now));
      const urgentNow = waiting.findIndex(line => line.urgent);
      if (untilEnd <= used) {
        current = null; startNext(now);
      } else if (untilInterrupt <= used && urgentNow >= 0) {
        const interrupted = current;
        const next = waiting.splice(urgentNow, 1)[0];
        waiting.unshift(interrupted);
        current = {...next, elapsed: 0, duration: next.fixedTime ?? captionSeconds(next.text, next.crowded === true)};
      } else if (now >= end) break;
    }
    now = end;
    return current?.text ?? '';
  }
  return {
    add(text, urgent, time, fixedTime, paused = false) {
      advance(time, paused);
      if (!text) return;
      const duration = Number.isFinite(fixedTime) ? Math.max(1.5, fixedTime) : undefined;
      const line = {text, urgent: !!urgent, fixedTime: duration,
        deadline: duration === undefined ? undefined : time + duration};
      if (urgent) {
        const index = waiting.findIndex(item => !item.urgent);
        waiting.splice(index < 0 ? waiting.length : index, 0, line);
      } else waiting.push(line);
      if (waiting.length >= 3) for (const item of waiting) item.crowded = true;
      if (!paused) { startNext(time); advance(time); }
    },
    advance,
    clear(time = 0) { current = null; waiting = []; now = time; },
  };
}
