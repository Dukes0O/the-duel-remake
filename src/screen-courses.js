import {cupsPanel} from './screen-trophies.js';
import {isCourseUnlocked} from './course-access.js';
import {COURSE} from './config.js';
import {courseAccessPanel} from './course-access-ui.js';

export function courseScreen(profile, selectedStage, message, options) {
  const panel=cupsPanel(profile,{enabled:options?.grandPrixCareerEnabled===true,courses:COURSE,
    owns:course=>isCourseUnlocked(profile,course),playerId:options?.playerId});
  return courseAccessPanel(profile, selectedStage, message, options)
    .replace(/<\/section>$/,panel+'</section>');
}

export function createCourseActions({app, choices, setMessage, setOpen, updateMenuScene, invalidate, renderState,
  careerEnabled = () => false, grandPrixAvailable = () => false}) {
  function handle(button) {
    if(button.dataset.cupStart||button.dataset.cupContinue||button.dataset.cupAbandon){
      if(app.duel.state.status!=='menu'||careerEnabled()!==true)return true;
      const result=button.dataset.cupStart?app.startCup(button.dataset.cupStart):
        button.dataset.cupContinue?app.prepareCupRace():app.abandonCup();
      setMessage(result.reason);
      if(result.ok)Object.assign(choices,app.getRaceChoices());
      updateMenuScene();invalidate();renderState();return true;
    }
    if (button.dataset.courseUnlock) {
      if (app.duel.state.status !== 'menu') return true;
      const result = app.purchaseCourse(button.dataset.courseUnlock);
      setMessage(result.ok ? 'Course unlocked. Select it when you are ready.' : result.reason);
      updateMenuScene();
      invalidate();
      renderState();
      return true;
    }
    // Buying back a course burnt in a forest fire (docs/HELI_FIRE.md section 8.1).
    if (button.dataset.courseBuyback) {
      if (app.duel.state.status !== 'menu') return true;
      const result = app.buyBackCourse?.(button.dataset.courseBuyback) ?? {ok: false, reason: 'Forest fires are not available yet.'};
      const name = COURSE.find(course => course.id === button.dataset.courseBuyback)?.name ?? 'The course';
      setMessage(result.ok ? `Bought back. ${name} is open again.` : result.reason);
      updateMenuScene();
      invalidate();
      renderState();
      return true;
    }
    if (button.dataset.courseSelect) {
      const requestedMode = button.dataset.courseMode;
      if (requestedMode !== undefined) {
        const course = COURSE.find(course => course.id === button.dataset.courseSelect);
        if (requestedMode !== 'grandprix' || careerEnabled() !== true ||
            app.duel.state.status !== 'menu' || !course || grandPrixAvailable(course) !== true) return true;
      }
      if (app.selectCourse(button.dataset.courseSelect)) {
        if (requestedMode === 'grandprix') app.setRaceSettings({mode: 'grandprix'});
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
