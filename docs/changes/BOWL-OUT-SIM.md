# BOWL-OUT-SIM

- The old jump over the wall now reaches drivable terraces, a 24 m drop, a flat crushable-car park, a bouncing perimeter bank and two eight-metre gate tunnels. Computer trucks stay inside.
- The course and the Rex share the Car Park Gate. The Pit Gate sits half a lap away. The nearest gate marker steers around the back wall before turning through the tunnel.
- Over-wall jumps award 150 points, 75 on repeats, up to 60 on the terraces and 40 for returning through a gate. The back-row leap scores as an ordinary jump. Both event clocks and the player's controls keep running.
- At 78133021d a real nitro Big Jump landed on a 4.72 m terrace. The same drive fell from 25.33 m above the park and landed without wear. The build passed.
- The eight seeded gate returns took 9.04, 11.63, 16.29, 28.88, 9.04, 11.63, 16.29 and 28.92 seconds. Both gates admitted the player in both directions and blocked the moving computer trucks.
- Sound events name bowl.out.over, bowl.out.stands, bowl.out.leap, bowl.out.gate and bowl.out.back. The stands event has a name only pending sound selection.
- Lane at 78133021d passed 195/196. A minimal tunnel course lacked the optional Bowl features. Fixed at 0eca72b2c; 25/25 correction suites, tunnel and OUT-SIM checks and final build passed. Existing replay fingerprints and world signatures matched.
- Claude requested wider launches and 14 m gate mouths with 10 m guides at 45 degrees. At 3a56ef8b5 all seven nitro starts across the 8 m band landed clean at 7.04 to 8.36 m and drove uphill on the first tick, covering 4.59 to 4.83 m in 1/6 s. The normal straight jump matched its control exactly.
- Eight 20 mph diagonal entries stayed above 19.99 mph. Eight far starts returned in 6.35 to 18.76 s. The tunnels and ground beside the back wall were level at 0 m. BOWL-OUT-LOOK owns the drawn slabs.
- A wheels-down 8.93 mph landing drove uphill on all six following ticks, reaching 11.16 mph. Freestyle targets stayed 310, 1810 and 4260. Clean tricks cheer. Slams score zero silently.
- At ba9617c55, 191/192 corrective suites and all 30 remaining cue suites passed. The camera drive failed on integration too. Updated its drives to cross the Spine (87.02 m change of lap position), land a real double backflip and return through a gate. All camera limits retained. Claude approved both stronger setup assertions and the camera correction. Easing the sudden 24 m change in clearance reduced camera motion relative to the truck at 4.4667 s from 0.85 to 0.501 m. Worst across 2,520 outside frames was 0.66 m (limit 0.80 m). Floor drive numbers stayed unchanged; all 70 camera checks passed.
- Assertions added for the physical routes, ordinary two-sided walls, scoring and shared gate position. Existing assertions retained. Claude runs the required hand drive.
- **Removed** — Empty desert beyond the stands and generic missed-checkpoint resets in the Bowl's exterior. BOWL-OUT-LOOK draws the outside.
