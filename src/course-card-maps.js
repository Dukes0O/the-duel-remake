import {COURSE} from './config.js';
import {Course} from './course.js';
import {CoursePreview} from './course-preview.js';

// The small outline maps on the Your Courses cards. Each map is the same drawing the race setup panel shows
// (CoursePreview), made on a spare canvas and then copied onto its card. Building a course takes a moment, so a
// map is made only when its card comes into view, one at a time, and kept for the rest of the session.
// The course itself is dropped as soon as its picture is drawn.
export function createCourseCardMaps({getSeed}) {
  const pictures = new Map();
  let watcher = null, timer = null, waiting = [], busy = false;

  const paint = (canvas, picture) => {
    if (!canvas.isConnected) return;
    canvas.getContext('2d').drawImage(picture, 0, 0);
    canvas.dataset.mapState = 'ready';
  };
  function makePicture(canvas) {
    const index = COURSE.findIndex(course => course.id === canvas.dataset.courseMap);
    if (index < 0) return null;
    const key = `${COURSE[index].id}:${getSeed(index)}`;
    let picture = pictures.get(key);
    if (picture) return picture;
    picture = canvas.ownerDocument.createElement('canvas');
    picture.width = canvas.width; picture.height = canvas.height;
    const course = new Course(COURSE[index], getSeed(index), {});
    if (!new CoursePreview(picture).update(course, '')) return null;
    pictures.set(key, picture);
    return picture;
  }
  function next() {
    timer = null;
    const canvas = waiting.shift();
    if (!canvas) { busy = false; return; }
    try {
      const picture = canvas.isConnected ? makePicture(canvas) : null;
      if (picture) paint(canvas, picture);
      else if (canvas.isConnected) canvas.hidden = true;
    } catch (error) {
      canvas.hidden = true;
      console.error(error);
    }
    timer = setTimeout(next, 16);
  }
  function enqueue(canvas) {
    waiting.push(canvas);
    if (!busy) { busy = true; timer = setTimeout(next, 0); }
  }
  function stop() {
    watcher?.disconnect(); watcher = null;
    if (timer !== null) clearTimeout(timer);
    timer = null; waiting = []; busy = false;
  }
  return {
    // Call after the panel markup is on the page (and with a page that has no panel, to stop any waiting work).
    attach(root) {
      stop();
      const canvases = [...root.querySelectorAll('canvas[data-course-map]')];
      if (!canvases.length) return;
      const later = [];
      for (const canvas of canvases) {
        const index = COURSE.findIndex(course => course.id === canvas.dataset.courseMap);
        const picture = index < 0 ? null : pictures.get(`${COURSE[index].id}:${getSeed(index)}`);
        if (picture) paint(canvas, picture); else later.push(canvas);
      }
      if (typeof IntersectionObserver !== 'function') { later.forEach(enqueue); return; }
      watcher = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { watcher?.unobserve(entry.target); enqueue(entry.target); }
      }, {rootMargin: '160px'});
      later.forEach(canvas => watcher.observe(canvas));
    },
    dispose() { stop(); pictures.clear(); },
  };
}
