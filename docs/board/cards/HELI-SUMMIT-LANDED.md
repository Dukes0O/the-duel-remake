# HELI-SUMMIT-LANDED

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 27 October 2026, live build 26.10.27 02:01: "I also flew to Summit but
can't get out of the chopper once arrived. there's nothing." The HELI-LANDED
arrival panel (Race here, Shut down, crate board) works at the other pads.

`landedArrival` in `src/heli/heli-ui.js` hides the panel unless the helicopter
is on the ground inside `view.zone` and no lesson, challenge, job, rescue,
fire, ski flight, ski run or survey is active. At Summit Run several of these
may hold on arrival: rescues end the leg hovering over the start area's
landing circle (RESCUE-SUMMIT-ARRIVAL), heli-skiing keeps a ski flight, and
the zone may not be where a player lands.

1. Reproduce natively first: a session with today's live switches flies to
   Summit Run and sets down where a player would (the start area's landing
   circle and the pad the map shows). Record which condition hides the panel.
2. Fix so that, set down at Summit Run's landing area with nothing in hand,
   the panel shows: Race here (Summit Run is a course), Shut down, and the
   crate board. When a rescue call or ski group is in hand, the panel says what
   is waiting instead of showing nothing, and Shut down is still offered.
3. Test the same at every destination (the three pads, Summit Run, the Table
   when known). Lane tier and build.
