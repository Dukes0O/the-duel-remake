import story from '../../../story/threads/content/dace-goes-looking.js';
import {DACE_ID, daceMark} from './dace-goes-looking-places.js';

export const DACE_ASKING = DACE_ID + '/asking/decision';
export const DACE_LATER = story.later.map(row => ({...row, scene: daceMark('later/' + row.id)}));

const campReport = DACE_LATER.find(row => row.at === '@site');
export const DACE_TALK = {
  dace: [{scene: DACE_ASKING}],
  ...Object.fromEntries(DACE_LATER.filter(row => row !== campReport)
    .map(row => [row.by, [{scene: row.scene, needs: row.when, once: true}]])),
  marigold: [{scene: campReport.scene, needs: campReport.when, once: true}],
  hetty: [{scene: campReport.scene, needs: campReport.when, once: true}],
  gasket: [{scene: campReport.scene, needs: campReport.when, once: true}],
};
