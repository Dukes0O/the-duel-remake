// Engineer notes for Titan Stunt Trial (Claude's finishing pass, P4-FINISH-TEAMROOM). It is the same loop as
// Titan Monster Arena, with no rivals; the trial asks for jumps and crushed cars against the clock. Titan Monster
// Arena has its own notes in titan-arena.js. No brake boards stand in the stadium.
export const TITAN_STUNT_TRIAL_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 209, title: 'First ramp'},
    {id: 'overtaking', kind: 'overtaking', s: 400, title: 'Run to Corner 1'},
  ],
  notes: {
    c1: {line: 'Brake in a straight line, turn in smoothly and keep well clear of the wall.',
      note: 'The tightest part of the loop. A smooth exit sets you up for the second ramp, 75 metres further on.'},
    signature: {line: 'Line the truck up on the middle of the ramp and keep the throttle steady.',
      note: 'The first of the ramps. Hit it straight and land pointing along the track, because the clock keeps running.'},
    overtaking: {line: 'Stay on the throttle and use the run to line up the next jump.',
      note: 'There are no rivals in the trial, so use this long run to build speed for Corner 1, and brake before the turn because the walls are close.'},
  },
});
