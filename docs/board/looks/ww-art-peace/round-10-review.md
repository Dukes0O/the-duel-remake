# WW-ART-PEACE round 10: Magnus steals roofs

The side and front comparisons and both whole-crane views are renders from the exported `peace-crane.glb`, imported into an empty scene with the Standard view transform. The full views use a car-height camera about 35 m away and keep the boom tip and magnet inside frame.

The side photo puts the cab at the right, so the carving table maps its front pixel from the right edge. The cab door measures 274 px at 1.9 m. The ground is the row where the tracks meet the floor. `carve_object` returns one body mesh, so the upper house and tracks are one piece. The 16 m traced boom has two open lattice frames, is about 50 degrees up, and has cross ties. The magnet is 3 m across. Six rusty roof sheets share one thin mesh; `magnus-roof` carries another copy from the midpoint of its top edge.

Self-review: yes, it reads as an old crane that has been stealing roofs. The roof sheets make the joke clear from the whole views. The round magnet is partly covered by those sheets, so its lifting face is less obvious than intended. The body stays a single carved piece and cannot turn separately from its tracks. Claude should judge that compromise on this sheet.
