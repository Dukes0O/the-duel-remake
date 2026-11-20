# BOWL-WEAPONS

- Last Truck Rolling now waits for a weapon choice before each countdown, including retries and Turn Show. Night 3 offers the hammer, Night 4 adds the saw, and Night 5 adds the launcher. F uses the mounted weapon.
- Every truck starts with 60 armor. Actual loss is attributed to the struck side. Five rivals use their fixed weapons and tell for the difficulty. A launcher throws a truck 6 m up and 12 m away, then it takes 2.5 s to right itself.
- An airborne rival across the wall is out, with credit to the last attacker. The driver has 15 s to return through a physical gate. Two trucks knocked out in one contact each have one credited wreck.
- The old generic player credit sound was arena.wreck-credit. Bowl events name bowl.knockout, bowl.weapon.pick, bowl.hammer.rise, .hit, .miss, bowl.saw.spin, .cut, .hot, bowl.launcher.tell, .fire, .fill, bowl.rhino.horn, bowl.dragon.fire and bowl.out.of.the.bowl.
- At 837046539 the focused weapon, wall and App audio checks passed. One credited Bowl knockout played its mapped sound once; the same credit in an ordinary arena kept its existing sound.
- The armed checks retain the child's steering and all Side by Side targets. Existing setup now selects a weapon. Only the free-moving speed check excludes trucks during required immobilization. Claude approved the changed assertions at 8593cf9b9.
- Kyle and Claude set the Easy gate at six qualifying wins. At 50% player-initiated recoil and 20% rival-initiated ram wear, the ten original drivers won eight; seven wins had at least two credited knockouts and the ten fights produced 24 credited knockouts in all. The non-dodging Hard driver lost at 30 s with zero KOs. Twelve head-on and flank cases and both focused suites passed. Generic combat balance passed all 90 baseline races.
- On f07b4307e the lane ran 140 suites, all passed, including the full rivals balance (489.17 s), normal and combat replays, and world signatures. The production build passed. Claude requested a near-wall launcher fix and 1.5 m saw reach after the hand drive.
- BOWL-WEAPONS-LOOK supplies the finished weapon pictures, bolt-ons and damage effects. Claude drives each weapon on the laptop.
- **Removed** the unarmed fight, nominal per-side wear, and the generic arena wreck-credit playback in this event.
