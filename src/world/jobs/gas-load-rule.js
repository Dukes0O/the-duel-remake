// Slow Ride's numbers and meeting. State lasts for this job only.
export const GAS_LOAD_RULE = Object.freeze({
  start: 100,
  startHoles: 0,
  speedKmh: 32,
  carStartBehindMetres: 60,
  carStartSideMetres: 0,
  meetingSideMetres: 6,
  meetingRadiusMetres: 6,
  stoppedKmh: 1,
});

export const GAS_LOAD_LINES = Object.freeze({
  'gas.meeting.1': "Moss: Forge is lit and the bellows are home. All she wants now is gas, and Bess is full of it.",
  'gas.meeting.2': "Moss: Ash Men would sooner see it soak into the sand. They'll block the road and go for her tank.",
  'gas.meeting.3': "Moss: Go ahead and open the road. I can't stop her and start her for nothing.",
});

// Return null once the existing escort may move. Captions use the shared queue.
export function gasLoadMeeting(step, state, view) {
  if (state.gasLoaded) return null;
  const requests = [{type: 'follow', path: step.path, speed: 0},
    {type: 'marker', place: step.meeting}];
  const here = view.player?.position, there = step.meeting.position;
  const stopped = !view.onFoot && Math.abs(view.speedKmh ?? 0) < GAS_LOAD_RULE.stoppedKmh;
  if (!state.gasMeeting && here && stopped &&
      Math.hypot(here.x - there.x, here.z - there.z) <= GAS_LOAD_RULE.meetingRadiusMetres) {
    requests.push(...[...Object.keys(GAS_LOAD_LINES), 'story.ember.moss.1'].map(lineId => ({type: 'say', lineId})));
    return {state: {...state, gasMeeting: true}, complete: false, requests};
  }
  if (state.gasMeeting && !(state.lineQueue?.length) && !(state.lineRemaining > 0)) return null;
  return {state, complete: false, requests};
}
