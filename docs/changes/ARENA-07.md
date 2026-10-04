# ARENA-07: Convoy Raid

status: waiting-on-claude

## Rules needed

What exact scrap award is the largest arena payout? Does the mode open when
Tollkeeper territory hold reaches 100, or at another point?

How do weapon and ram hits select among the three factory valves? Can damage
to the truck body wreck it before the finishing charge, or must every win
break all three valves and finish through boarding?

## Ready for the next step

The approved recipe supplies one rigid cab and tank, three native valves,
a roof plate and amber lamps. CREW-03 already supplies the one-second fire
hold and two-second charge fuse. An obstacle-free Salt Flats loop will be
recorded with the build. No new art round is needed.

## Tests

Independent test commit: a3647ac. The bounded native test runs six cases:
one passes and five fail because the dev switch and native entry are missing.
It covers admission, the rig, initial valves and repeatability. Source has
not started. Speed change, reset, charge and pay await the rules above.
Lane, build, browser, gameplay, audio and save checks remain unmeasured.

## Removed

None.
