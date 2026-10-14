// The instructor's radio lines (docs/HELICOPTER.md section 7). Stock voice
// Brian, recorded clean and played through the radio filter in
// heli-audio.js. Lines name no prices, so repair costs can change freely.
export const HELI_RADIO_VOICE = Object.freeze({name: 'Brian', voiceId: 'nPczCjzI2devNBz1zQrb'});

export const HELI_RADIO_LINES = Object.freeze({
  'heli.radio.welcome': {file: 'heli-radio-welcome.mp3', text: 'Kestrel One, this is Tremblant base. Welcome aboard. I will be on the radio the whole way, so take your time.'},
  'heli.radio.controls': {file: 'heli-radio-controls.mp3', text: 'W and S raise and lower the collective. The arrow keys tilt her. A and D turn the nose.'},
  'heli.radio.liftoff.start': {file: 'heli-radio-liftoff-start.mp3', text: 'Lesson one. Ease up on W and lift her three metres off the pad. Then hold her there.'},
  'heli.radio.liftoff.hold': {file: 'heli-radio-liftoff-hold.mp3', text: 'That is it. Hold her steady.'},
  'heli.radio.liftoff.pass': {file: 'heli-radio-liftoff-pass.mp3', text: 'Nice lift-off. You are a natural.'},
  'heli.radio.hover.start': {file: 'heli-radio-hover-start.mp3', text: 'Lesson two. Keep her inside the circle, two to five metres up, for ten seconds.'},
  'heli.radio.hover.drift': {file: 'heli-radio-hover-drift.mp3', text: 'You are drifting. Small touches on the arrows.'},
  'heli.radio.hover.pass': {file: 'heli-radio-hover-pass.mp3', text: 'Rock steady. That is a real hover.'},
  'heli.radio.landing.start': {file: 'heli-radio-landing-start.mp3', text: 'Lesson three. Bring her down on the H. Slow and gentle.'},
  'heli.radio.landing.pass': {file: 'heli-radio-landing-pass.mp3', text: 'Smooth landing. The fuel pump and the dispatch board are yours now.'},
  'heli.radio.carry.start': {file: 'heli-radio-carry-start.mp3', text: 'Lesson four. Hook the crate with H, carry it out to the circle, and set it down gently.'},
  'heli.radio.carry.swing': {file: 'heli-radio-carry-swing.mp3', text: 'Watch the swing. Slow down and let the load settle.'},
  'heli.radio.carry.pass': {file: 'heli-radio-carry-pass.mp3', text: 'Clean set-down. You are cleared to carry cars.'},
  'heli.radio.retry': {file: 'heli-radio-retry.mp3', text: 'Not quite. Let us try that again.'},
  'heli.radio.retry.easy': {file: 'heli-radio-retry-easy.mp3', text: 'No harm done. Go again when you are ready.'},
  'heli.radio.fuel.low': {file: 'heli-radio-fuel-low.mp3', text: 'Kestrel One, you are low on fuel. Head for a pad.'},
  'heli.radio.fuel.out': {file: 'heli-radio-fuel-out.mp3', text: 'Engine out! Lower the collective and glide. Pull up on W just before the ground.'},
  'heli.radio.fuel.truck': {file: 'heli-radio-fuel-truck.mp3', text: 'Good landing. The fuel truck is on its way.'},
  'heli.radio.landing.hard': {file: 'heli-radio-landing-hard.mp3', text: 'That was a hard landing. The mechanics will want a look at her.'},
  'heli.radio.crash': {file: 'heli-radio-crash.mp3', text: 'Kestrel One, are you all right? We will fix her up and bring you home.'},
  'heli.radio.drop': {file: 'heli-radio-drop.mp3', text: 'Easy! That one dropped hard.'},
  'heli.radio.cargo.hit': {file: 'heli-radio-cargo-hit.mp3', text: 'Careful with the cargo, Kestrel One.'},
  'heli.radio.job.taken': {file: 'heli-radio-job-taken.mp3', text: 'Job is on the board. Hook up and head out when you are ready.'},
  'heli.radio.job.done': {file: 'heli-radio-job-done.mp3', text: 'Delivered. Nice flying, Kestrel One. The pay is in your account.'},
  'heli.radio.cruise.ready': {file: 'heli-radio-cruise-ready.mp3', text: 'You are clear of the area. Cruise when you are ready.'},
  'heli.radio.cruise.refused': {file: 'heli-radio-cruise-refused.mp3', text: 'Negative, Kestrel One. Not enough fuel for that leg. Fill up first.'},
  'heli.radio.arrived': {file: 'heli-radio-arrived.mp3', text: 'Landing zone in sight. Bring her in nice and slow.'},
});
