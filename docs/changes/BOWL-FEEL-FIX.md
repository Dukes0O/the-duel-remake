# BOWL-FEEL-FIX

Wall and ram rebound used to turn a truck 90 degrees at once. The rebound keeps its force and eases the turn over a quarter-second. Repeated-hit review peaked at 6.24 degrees per step with steering.
Crossing the Spine in Night 3 triggered a lap checkpoint and moved the truck 68 m. Score events no longer validate laps. Trucks can land on the Spine roof, slide off and keep driving. Recovery puts the wheels on the ground facing along the lap.
The moving hammer checks the truck's position at impact with aim assist on Easy and Medium. Saw contact keeps steering and releases on F. Launcher range is 4 m on Easy and Medium, 3 m on Hard, within 40 degrees.
At `295fd1ab7`: 40 lane suites and production build passed. Guards unchanged (297 race, 12 combat and 63 world). Independent code review passed.
Claude approved the immediate-heading and empty-launcher fixture changes at `cd8bc9cab`. The same rebound, armor, empty hop and credited knockout remain covered.
Claude drives Nights 3–5 on the merged batch, then Kyle tries it.

**Removed** instant heading assignment on Bowl rebounds, lap validation in score-only events and the launcher's uniform 2.5 m range.
