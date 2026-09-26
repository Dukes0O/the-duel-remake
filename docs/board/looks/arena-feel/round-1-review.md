# Arena feel, round 1 (26 September 2026)

Sheet: `round-1.jpg` (High quality): a computer rammer during its charge tell,
and a car one moment after respawning. Captured by
`tools/scenarios/arena-feel.mjs` from a real fight through the production UI.

Verdict: accepted by Claude as design lead.

- The tell reads as two pulsing high beams on the car's nose, drawn over its
  armour so a plow cannot hide them. First pass was invisible (a flashing
  off-phase and plow cover), second too large; this round is sized to read at
  fighting range without hiding the car.
- The respawn shimmer is a soft blue dome that grows and fades over 1.2 s.
- Found and fixed on the way: the ambient shading pass drew sprite quads as
  solid, leaving dark rectangles behind glows. It now skips sprites.

Open: Kyle to judge the roar and flash in a real fight.
