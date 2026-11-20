# BOWL-OUT-SIM

- The old jump over the wall now reaches drivable terraces, a 24 m drop, a flat crushable-car park, a bouncing perimeter bank and two eight-metre gate tunnels. Computer trucks stay inside.
- The course and the Rex share the Car Park Gate. The Pit Gate sits half a lap away. The nearest gate marker steers around the back wall before turning through the tunnel.
- Over-wall jumps award 150 points, 75 on repeats, up to 60 on the terraces and 40 for returning through a gate. The back-row leap scores as an ordinary jump. Both event clocks and the player's controls keep running.
- At 78133021d a real nitro Big Jump landed on a 4.72 m terrace. The same drive fell from 25.33 m above the park and landed without wear. The build passed.
- The eight seeded gate returns took 9.04, 11.63, 16.29, 28.88, 9.04, 11.63, 16.29 and 28.92 seconds. Both gates admitted the player in both directions and blocked the moving computer trucks.
- Sound events name bowl.out.over, bowl.out.stands, bowl.out.leap, bowl.out.gate and bowl.out.back. The stands event has a name only pending sound selection.
- Lane at 78133021d passed 195/196. A minimal tunnel course lacked the optional Bowl features. Fixed at 0eca72b2c; 25/25 correction suites, tunnel and OUT-SIM checks and final build passed. Existing replay fingerprints and world signatures matched.
- Assertions added for the physical routes, ordinary two-sided walls, scoring and shared gate position. Existing assertions retained. Claude runs the required hand drive.
- **Removed** — Empty desert beyond the stands and generic missed-checkpoint resets in the Bowl's exterior. BOWL-OUT-LOOK draws the outside.
