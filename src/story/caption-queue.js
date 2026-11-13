// Presentation only. The job's own line clock continues independently.
export function captionSeconds(text, crowded = false) {
  const seconds = Math.max(2.5, Math.min(7.5, 1.2 + 0.055 * text.length));
  return crowded ? Math.max(2.5, seconds * 0.7) : seconds;
}

export function createCaptionQueue() {
  let current = null, waiting = [], now = 0;
  function startNext() {
    if (!current && waiting.length) {
      current = {...waiting.shift(), elapsed: 0};
      current.duration = captionSeconds(current.text, current.crowded === true);
    }
  }
  function advance(time) {
    let delta = Math.max(0, time - now);
    now = time;
    startNext();
    while (current) {
      const urgent = waiting.findIndex(line => line.urgent);
      const untilInterrupt = urgent < 0 ? Infinity : Math.max(0, 1.5 - current.elapsed);
      const untilEnd = current.duration - current.elapsed;
      const used = Math.min(delta, untilInterrupt, untilEnd);
      current.elapsed += used; delta -= used;
      if (untilInterrupt <= used && urgent >= 0) {
        const interrupted = current;
        const next = waiting.splice(urgent, 1)[0];
        waiting.unshift(interrupted);
        current = {...next, elapsed: 0, duration: captionSeconds(next.text, next.crowded === true)};
      } else if (untilEnd <= used) {
        current = null; startNext();
      } else break;
      if (delta <= 0) break;
    }
    return current?.text ?? '';
  }
  return {
    add(text, urgent, time) {
      advance(time);
      if (!text) return;
      const line = {text, urgent: !!urgent};
      if (urgent) {
        const index = waiting.findIndex(item => !item.urgent);
        waiting.splice(index < 0 ? waiting.length : index, 0, line);
      } else waiting.push(line);
      if (waiting.length >= 3) for (const item of waiting) item.crowded = true;
      startNext();
      advance(time);
    },
    advance,
    clear(time = 0) { current = null; waiting = []; now = time; },
  };
}
