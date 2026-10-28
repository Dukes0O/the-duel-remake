// The radio lines (docs/HELICOPTER.md section 7, docs/HELI_FIRE.md section 10),
// recorded clean and played through the radio filter in heli-audio.js. Stock
// voices: Brian the instructor, Sarah for the park rangers and Roger for fire
// dispatch, all with the same settings. Lines name no prices and no course, so
// repair costs can change and new burnable courses need no new lines.
import {HELI_RADIO_VOICE} from '../lessons/radio-voice.js';

export const HELI_VOICES = Object.freeze({
  brian: HELI_RADIO_VOICE,
  sarah: Object.freeze({name: 'Sarah', voiceId: 'EXAVITQu4vr4xnSDxMaL'}),
  roger: Object.freeze({name: 'Roger', voiceId: 'CwhRBWXzGAHq8TQ4Fs17'}),
});
// The instructor's voice, for the H1 lines (shared with driving lessons).
export {HELI_RADIO_VOICE};

const H1_LINES = {
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
};

// H2 Fire: fire dispatch (Roger), the rangers (Sarah) and the bucket (Brian).
// gain evens the takes out at play: Sarah's come out about 7 dB louder than
// the rest, and Roger's "fire is out" about 2 dB quieter.
const FIRE_LINES = {
  'heli.radio.fire.call': {voice: 'roger', file: 'heli-radio-fire-call.mp3', text: 'Calling all pilots, calling all pilots. Smoke and flames reported in the forest. Kestrel One, can you take it?'},
  'heli.radio.fire.answer': {voice: 'roger', file: 'heli-radio-fire-answer.mp3', text: 'Thank you, Kestrel One. Fit the bucket at the pad. The lake is your water.'},
  'heli.radio.fire.later': {voice: 'roger', file: 'heli-radio-fire-later.mp3', text: 'Understood. Call us back when you can. It will not wait forever.'},
  'heli.radio.fire.reminder': {voice: 'roger', file: 'heli-radio-fire-reminder.mp3', text: 'Kestrel One, that fire is still burning, and it is growing.'},
  'heli.radio.wind.calm': {voice: 'roger', file: 'heli-radio-wind-calm.mp3', text: 'Wind is light today.'},
  'heli.radio.wind.breeze': {voice: 'roger', file: 'heli-radio-wind-breeze.mp3', text: 'There is a breeze. Watch where the water drifts.'},
  'heli.radio.wind.strong': {voice: 'roger', file: 'heli-radio-wind-strong.mp3', text: 'It is windy out there. The fire runs with the wind, so hit the downwind side first.'},
  'heli.radio.fire.half': {voice: 'roger', file: 'heli-radio-fire-half.mp3', text: 'Good work, Kestrel One. It is half out.'},
  'heli.radio.fire.out': {voice: 'roger', gain: 1.25, file: 'heli-radio-fire-out.mp3', text: 'That is the last of it. Fire is out. Great flying, Kestrel One.'},
  'heli.radio.fire.lost': {voice: 'roger', file: 'heli-radio-fire-lost.mp3', text: 'We have lost those woods. The course is closed. Nobody was hurt.'},
  'heli.radio.fire.thanks': {voice: 'sarah', gain: .5, file: 'heli-radio-fire-thanks.mp3', text: 'From all of us at the park, thank you. The animals thank you too.'},
  'heli.radio.burn.reopen': {voice: 'sarah', gain: .5, file: 'heli-radio-burn-reopen.mp3', text: 'The burnt woods are open again. All black for now, but it will come back.'},
  'heli.radio.burn.shoots': {voice: 'sarah', gain: .5, file: 'heli-radio-burn-shoots.mp3', text: 'Green shoots are coming up in the burn.'},
  'heli.radio.burn.fireweed': {voice: 'sarah', gain: .5, file: 'heli-radio-burn-fireweed.mp3', text: 'Fireweed is blooming in the burn. It is always the first flower back after a fire.'},
  'heli.radio.bucket.first': {voice: 'brian', file: 'heli-radio-bucket-first.mp3', text: 'That is the bucket. Hover low and slow over the lake and let it sink and fill.'},
  'heli.radio.bucket.full': {voice: 'brian', file: 'heli-radio-bucket-full.mp3', text: 'Bucket is full. She is heavier now, so give her more collective.'},
  'heli.radio.bucket.fast': {voice: 'brian', file: 'heli-radio-bucket-fast.mp3', text: 'Too fast over the water. Slow down or you will tear the bucket.'},
  'heli.radio.drop.tip': {voice: 'brian', file: 'heli-radio-drop-tip.mp3', text: 'Hold H to let the water go. Drop low, and a little short. The water keeps moving as it falls.'},
  'heli.radio.bucket.dented': {voice: 'brian', file: 'heli-radio-bucket-dented.mp3', text: 'You dented the bucket. It will leak until the shop fixes it.'},
};

// H4 Rescue (docs/HELI_RESCUE.md section 8): mountain rescue and the lodge
// (Roger), the rangers (Sarah) and the rescue line (Brian).
const RESCUE_LINES = {
  'heli.radio.avalanche.call': {voice: 'roger', file: 'heli-radio-avalanche-call.mp3', text: 'Calling all pilots. Avalanche on the ski hill. A skier is buried. Kestrel One, can you take it?'},
  'heli.radio.hoist.call': {voice: 'roger', file: 'heli-radio-hoist-call.mp3', text: 'Calling all pilots. A car has gone off the road, and the driver is stuck on the slope below. Kestrel One, can you take it?'},
  'heli.radio.supply.call': {voice: 'roger', file: 'heli-radio-supply-call.mp3', text: 'Kestrel One, this is the lodge. Snow has shut the road and we are running low. Can you fly supplies up?'},
  'heli.radio.hiker.call': {voice: 'sarah', file: 'heli-radio-hiker-call.mp3', text: 'Kestrel One, park rangers here. A hiker is lost in the forest and it will be dark soon. Can you search for them?'},
  'heli.radio.rescue.answer': {voice: 'roger', file: 'heli-radio-rescue-answer.mp3', text: 'Thank you, Kestrel One. Fit the rescue line at the pad. Your rescuer is waiting.'},
  'heli.radio.supply.answer': {voice: 'roger', file: 'heli-radio-supply-answer.mp3', text: 'Thanks, Kestrel One. Three crates are waiting by the pad. Bring them to the yard by the lodge.'},
  'heli.radio.hiker.answer': {voice: 'sarah', file: 'heli-radio-hiker-answer.mp3', text: 'Thank you. They were last seen inside the circle on your map. Fly low and slow, and watch for an orange flare.'},
  'heli.radio.rescue.later': {voice: 'roger', file: 'heli-radio-rescue-later.mp3', text: 'Understood. If you cannot get there, another crew will.'},
  'heli.radio.rescue.taken': {voice: 'roger', file: 'heli-radio-rescue-taken.mp3', text: 'Another crew has taken that call, Kestrel One.'},
  'heli.radio.beacon.signal': {voice: 'roger', file: 'heli-radio-beacon-signal.mp3', text: 'You have a signal. Follow the beeps. Faster means closer.'},
  'heli.radio.rescue.steady': {voice: 'roger', file: 'heli-radio-rescue-steady.mp3', text: 'Hold her steady. The rescuer needs you still.'},
  'heli.radio.rescue.clipped': {voice: 'roger', file: 'heli-radio-rescue-clipped.mp3', text: 'They are clipped on. Lift gently.'},
  'heli.radio.rescue.fast': {voice: 'roger', file: 'heli-radio-rescue-fast.mp3', text: 'Slow down! People on the line.'},
  'heli.radio.rescue.bump': {voice: 'roger', file: 'heli-radio-rescue-bump.mp3', text: 'Easy! You are hurting them.'},
  'heli.radio.rescue.done': {voice: 'roger', file: 'heli-radio-rescue-done.mp3', text: 'Safe and sound. Great work, Kestrel One.'},
  'heli.radio.rescue.late': {voice: 'roger', file: 'heli-radio-rescue-late.mp3', text: 'The ground team got there first. They are badly hurt and on their way to hospital.'},
  // People can get hurt (docs/HELI_RESCUE.md section 4.1): the handover by condition, and the cold.
  'heli.radio.rescue.hurt': {voice: 'roger', file: 'heli-radio-rescue-hurt.mp3', text: 'They are hurt, but they will be all right. The paramedics have them.'},
  'heli.radio.rescue.badly': {voice: 'roger', file: 'heli-radio-rescue-badly.mp3', text: 'They are badly hurt. The paramedics are taking them to hospital.'},
  'heli.radio.rescue.cold': {voice: 'roger', file: 'heli-radio-rescue-cold.mp3', text: 'They are getting cold, Kestrel One. Hurry.'},
  'heli.radio.supply.crate': {voice: 'roger', file: 'heli-radio-supply-crate.mp3', text: 'Crate is down. Thank you.'},
  'heli.radio.supply.done': {voice: 'roger', file: 'heli-radio-supply-done.mp3', text: 'That is everything. The whole lodge thanks you, Kestrel One.'},
  'heli.radio.supply.late': {voice: 'roger', file: 'heli-radio-supply-late.mp3', text: 'The lodge sent a snowcat in the end. They are still short of supplies.'},
  'heli.radio.season.summer': {voice: 'roger', file: 'heli-radio-season-summer.mp3', text: 'Wildfire season is here. Keep an eye out for smoke.'},
  'heli.radio.season.winter': {voice: 'roger', file: 'heli-radio-season-winter.mp3', text: 'Winter is here. Watch the ski hill for avalanches.'},
  'heli.radio.hiker.spotted': {voice: 'sarah', file: 'heli-radio-hiker-spotted.mp3', text: 'That is them! There is a clearing close by. Land there and they will walk over.'},
  'heli.radio.hiker.dusk': {voice: 'sarah', file: 'heli-radio-hiker-dusk.mp3', text: 'It is getting dark, Kestrel One.'},
  'heli.radio.line.first': {voice: 'brian', file: 'heli-radio-line-first.mp3', text: 'That is the rescue line. Fly smooth, and keep her under forty knots with people on it.'},
  'heli.radio.line.setdown': {voice: 'brian', file: 'heli-radio-line-setdown.mp3', text: 'Lower the rescuer gently, right beside them, and hold her there.'},
};

// H3 Wildlife and skins (docs/HELI_WILDLIFE.md section 8): Sarah for the
// wildlife survey, Brian for the paint and the wash.
const WILD_LINES = {
  'heli.radio.survey.taken': {voice: 'sarah', file: 'heli-radio-survey-taken.mp3', text: 'Thanks, Kestrel One. Fly straight lines across the square, and stay high enough not to scare them.'},
  'heli.radio.survey.scared': {voice: 'sarah', file: 'heli-radio-survey-scared.mp3', text: 'Too low! You are scaring them off.'},
  'heli.radio.survey.good': {voice: 'sarah', file: 'heli-radio-survey-good.mp3', text: 'Spot on. That matches our ground count. Thank you.'},
  'heli.radio.survey.close': {voice: 'sarah', file: 'heli-radio-survey-close.mp3', text: 'Close enough to be useful. Thanks.'},
  'heli.radio.survey.off': {voice: 'sarah', file: 'heli-radio-survey-off.mp3', text: 'That is a long way from our numbers. Try more lines next time.'},
  'heli.radio.survey.rare': {voice: 'sarah', file: 'heli-radio-survey-rare.mp3', text: 'Did you see that? That one is rare. Lucky you.'},
  'heli.radio.skin.earned': {voice: 'brian', file: 'heli-radio-skin-earned.mp3', text: 'Five missions of the same kind. There is a new coat of paint waiting for you at the pad.'},
  'heli.radio.wash.hint': {voice: 'brian', file: 'heli-radio-wash-hint.mp3', text: 'She is filthy, Kestrel One. A wash at the pad will fix that.'},
  'heli.radio.wash.done': {voice: 'brian', file: 'heli-radio-wash-done.mp3', text: 'Shiny as new.'},
};

export const HELI_RADIO_LINES = Object.freeze(Object.fromEntries(Object.entries({...H1_LINES, ...FIRE_LINES, ...RESCUE_LINES, ...WILD_LINES})
  .map(([id, line]) => [id, Object.freeze({voice: 'brian', ...line})])));

// Ski radio stays on-screen text until its voice pass is approved.
export const SKI_RADIO_TEXT = Object.freeze({
  'ski.radio.thin-air': 'There is less air up here for the rotor to push. Lighten up: burn fuel or leave some behind.',
});
