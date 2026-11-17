# EVERBURN-REMAKE slice 6b

Camp rider sleeps until its fence burns or a Hard scoop wakes it; the scout waking remains to build.
With its fence standing, the awake rider moves four metres past its end and charges within 150 m; it gives up beyond the road limit.
Checks: `test-everburn-job1.mjs` passed on the working tree based on f17278409, including the six-second charge and road limits; river bed arrived with 35.86 fire and no rams.
Changed assertion, for Claude: the camp scoop wake check uses Hard instead of Medium and checks persistent waking, as required by the three wakings bullet. Rider test setups now specify a burnt fence where they exercise an immediate charge; assertions are unchanged.
Scout post data follows the East Road: 900 m from its start, 8 m right, 250 m sight and 70/55 km/h speeds. The loaded job now creates the scout as a rider and hit target; its chase remains to build.
Checks: `test-everburn-job1.mjs` passed on the working tree based on cba378d9e, including the post actor check; the existing retreat setup selects its two riders by ID. Its assertions are unchanged.
Scout detects the loaded car with rider sight and sounds `world.ashmen.horn` once; the cue is gated by `story-everburn`.
Checks on a0fffc8d4 plus this change: `test-everburn-job1.mjs` passed; `test-p4-audio.mjs` passed outside the sandbox (FFmpeg was blocked inside).
The warned scout now joins and follows the East Road using the rider mover. On befd5ed2a plus this change, `test-everburn-job1.mjs` passed; the bed arrived with 35.86 fire and no rams.
Flame contact now stops the scout as a wreck beside the road. On 581fa0ebc plus this change, `test-everburn-job1.mjs` passed; the bed arrived with 35.86 fire and no rams.
For Claude: browser pictures and hand chase remain. Scout ram stopping and camp waking are not built yet.
Removed: automatic camp pursuit while asleep and charging through a standing fence. Remaining work: scout behavior, lines, map and rings.
