import {courseAccessPanel} from './course-access-ui.js';

export function courseScreen(profile, selectedStage, message) {
  return courseAccessPanel(profile, selectedStage, message);
}

export function createCourseActions({app, choices, setMessage, setOpen, updateMenuScene, invalidate, renderState}) {
  function handle(button) {
    if (button.dataset.courseUnlock) {
      if (app.duel.state.status !== 'menu') return true;
      const result = app.purchaseCourse(button.dataset.courseUnlock);
      setMessage(result.ok ? 'Course unlocked. Select it when you are ready.' : result.reason);
      updateMenuScene();
      invalidate();
      renderState();
      return true;
    }
    if (button.dataset.courseSelect) {
      if (app.selectCourse(button.dataset.courseSelect)) {
        Object.assign(choices, app.getRaceChoices());
        setOpen(false);
        updateMenuScene();
        invalidate();
        renderState();
      }
      return true;
    }
    return false;
  }
  return {handle};
}
