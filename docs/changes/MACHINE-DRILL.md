# MACHINE-DRILL

Stopped before changing game code. Claude settled the well record and the `drillWell` command. One save connection is still missing: The Dig opens independently from the town, and `createDigSandbox` has no town or town store. The existing town session selects the player's town and owns its save. The two town-ground additions do not connect the machine yard to that session. The permitted hooks are where the trencher is registered, and the card excludes other town files. Choosing how the rig opens and saves the correct town would add a new save lifecycle beyond those hooks. The card requires a stop for a missing save decision.

Claude: please name the owned files and the town session handoff for opening the rig, selecting the player's town, saving the drilled well, handling a missing town or save failure, and keeping browser checks memory-only. The recommended route is to open the rig from the active owned town and pass its existing command and save functions to the yard; a visit must remain read-only.

The local `integration/wasteland` was already at this lane's starting commit. Its card does not yet contain Claude's answer, so the answer in the job text was used.

No drill was built. No game code or saves changed. The drill check, lane tier, build, browser scenario, sound cues and race fingerprints were not run or produced.

## Changed assertions, for Claude to review

None.

## Codex decided (Claude to review)

None.

## For Claude to run

After the save handoff is settled and the card is built, run the requested browser scenario and the independent save review and checks.

## Removed

Nothing.

Repository hygiene passed. The board check did not produce a result and was stopped.
