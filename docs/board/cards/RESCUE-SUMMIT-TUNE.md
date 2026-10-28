# RESCUE-SUMMIT-TUNE

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October, from SUMMIT-HELI-RESCUES' open points. Everything stays
behind the `rescue` and `summit-run` switches.

**Settled design:**
1. **Clocks.** Summit Run rescues get their own clock rows in `RESCUE_CLOCKS`
   (`src/heli/heli-missions.js`): a scripted steady pilot must finish with at
   least 35% of the clock left, from the home pad (cruise leg included). Set the
   Summit rows from measured scripted times x 1.55, rounded up to 30 s. Other
   courses' clocks are unchanged.
2. **Autopilot climbs the mountain.** In `src/heli/heli-autopilot.js`, when the
   straight line to the goal passes within 60 m of the ground, the autopilot
   holds at least 80 m over the highest ground in the next 600 m of its path,
   capped by the flying ceiling and H1's thin-air thrust. Same behaviour
   everywhere; on today's courses the straight line already clears the ground,
   so their results stay exact (prove it with the existing autopilot tests).
3. **The truck always sells fuel.** The free first tank applies only at the home
   pad; at the Summit truck fuel is always paid.
4. **A stored Summit call when the Summit switch is off** is dropped quietly on
   load (no call, no pay, no penalty), in `heli-missions.js`.
5. The pump button and drawn truck stay with the drawing work (RESCUE-VIEW
   follow-up); not this card.

Tests first for each point; switch-off fingerprints stay exact.
