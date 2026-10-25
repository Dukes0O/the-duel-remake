// Engineer notes for Titan Monster Arena (Claude's finishing pass, P4-FINISH-TEAMROOM). The stadium is one loop
// with three ramps and one tight turn between the first and second. Titan Stunt Trial runs the same loop and has its
// own notes in titan-stunt-trial.js. No brake boards stand in the stadium.
export const TITAN_ARENA_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 209, title: 'First ramp'},
    {id: 'overtaking', kind: 'overtaking', s: 400, title: 'Run to Corner 1'},
  ],
  notes: {
    c1: {line: 'Brake in a straight line, turn in smoothly and keep well clear of the wall.',
      note: 'The tightest part of the loop. A smooth exit sets you up for the second ramp, 75 metres further on.'},
    signature: {line: 'Line the truck up on the middle of the ramp and keep the throttle steady.',
      note: 'The first of three ramps. Keep the wheels straight on the way up and land pointing along the track.'},
    overtaking: {line: 'Stay on the throttle and pull alongside before the turn.',
      note: 'The long run from the first ramp to Corner 1. Pass here and brake before the turn, because the walls are close.'},
  },
});
