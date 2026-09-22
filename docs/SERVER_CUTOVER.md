# Play-test server and safe retirement plan

## Desktop launcher promotion — September 22, 2026

The user requested retirement of the old desktop-launched game. The desktop
shortcut at `C:\Users\kyleb\OneDrive\Desktop\The Duel.lnk` targets the primary
folder's `start-game.bat`. That folder was still at `0c2583c`, 17 commits behind
the newer release. The primary checkout has now been fast-forwarded to `fc83e41`
and its production build regenerated. The existing development server serves
the promoted source at the unchanged `http://localhost:5174/` address.

The launcher now uses Vite's `--open` option, so a failed server start cannot
open an unrelated or outdated listener after a fixed delay. The user's icon,
launcher path, and browser saves are preserved.

The user subsequently authorized committing and publishing the camera, rival,
and freestyle edits from `C:\Users\kyleb\.codex\worktrees\4555\the-duel-remake`.
Those edits have been copied into the primary checkout, including all four new
source/test files. The desktop launch now includes custom rival car, driver,
and upgrade choices, directional cameras, and the freestyle drag strip.
The older cutover notes below are historical and do not describe the current
desktop launch path.

## Current update

The user authorized moving the game server to this updated checkout and committing the work. Keep the same browser address, `http://localhost:5174/`, so the existing local careers remain available. Do not clear browser storage, change the hostname to `127.0.0.1`, or change the port for the live game: each is a different save location.

Updated checkout: `C:\Users\kyleb\.codex\worktrees\4555\the-duel-remake`.

Latest: the off-road / freestyle / course-unlock update is `index-Dv7C28Is.js`, with renderer `render3d-Cp_qaQEv.js` and build ID `20260920193348-71ad5577bde6`. Its footer reads **26.09.20 19:33 UTC · 71ad55**. The live entry, manifest, JavaScript and stylesheet each return HTTP 200 and match disk byte-for-byte. Production and QA builds pass with the known large renderer-chunk warning. All 120 discovered suites have passing coverage across the broad collector and separate focused/long runs. The core campaign block completes 60 campaigns and wins 180 stages; the expansion matrix completes and wins all 48 races. The core upgrade fixture was corrected after the long block and its remaining sections run separately. See `VERIFICATION.md` for exact coverage and limits.

The live browser tab was not refreshed, inspected or controlled for this follow-up. Browser review used only temporary memory-only saves on port 5175. Refresh the existing game tab from its menu when ready, or use its menu-only update notice if available. Existing accounts and balances were not edited. Course ownership migrates lazily from demonstrated previous access; new purchases are player-specific. The temporary review tabs and QA server are closed, and the disposable QA build and this turn's QA logs were removed. Reusable source, model exports, tests and reference materials remain.

The existing preview process continues serving the new `dist` without interruption. It returns `no-cache` for the manifest; client checks also use `no-store` and a unique query. The new preview middleware's stronger `no-store, max-age=0` manifest header was verified on the temporary QA server and will apply to the live preview on its next normal restart. No live restart was forced during play.

## Earlier cutover evidence

The preceding jump-height HUD build was `index-BCAL93Ki.js`. Its production and QA builds passed; the open Dukes00 garage was left untouched during that update.

The latest reverse-driving follow-up rebuilds this same served directory as `index-mwTQ9czz.js`. Refresh from the menu to receive it; do not interrupt an active race. The account changes requested separately for Spikyferns are browser-local and are not part of the build.

The subsequent one-click Exit / Restart update supersedes that bundle with `index-iwWIpGeS.js`. Both the production build and the existing Chrome tab were verified on this version; the menu refresh preserved the selected player and displayed balance.

The cactus knockdown and two-car damage follow-up now supersedes those bundles with `index-0-v__HrJ.js`. Production and QA builds pass, and the same live server returns this build. No account or saved-balance changes are part of this update. Refresh from the menu to load it; do not interrupt an active race.

At final verification the live tab was in Spikyferns' Titan Stunt Trial. It was left running without refresh or input. Browser visuals were checked separately using memory-only collision fixtures on port 5177, then that temporary tab/server were closed.

Previous checkout: `C:\Users\kyleb\dev\the-duel-remake`. Its tracked baseline is `0c2583c`. The pre-existing untracked `game-icon.ico` and `start-game.bat` belong to the user and must be preserved.

The cutover is complete. The verified old Vite development process (PID 60472) was stopped, and a hidden production-preview process (PID 47924 at cutover) now serves this updated checkout's `dist` on `::1:5174`. It uses `vite preview --host localhost --port 5174 --strictPort`. The initial HTTP response matched `index-D4YA0FgL.js`; the later Heritage / 6.4 m near-miss follow-up rebuilt the same served directory and now returns `index-COmGH8FU.js`. The existing Chrome tab also loads that bundle. Process IDs are historical evidence, not safe future stop targets: always resolve the current listener and inspect its command line again.

The existing Chrome tab was reloaded at the same address. All three named players remained available, the selected player's displayed balance was unchanged, and the new route preview showed 33 m of elevation range instead of 8 m. The prior 959 selection was restored through the menu and survived a second reload. No race, purchase, wallet edit or storage reset was performed on the live career. No browser errors were observed.

This is a local play-test process, not a newly installed background service. The old `start-game.bat` remains untouched and still starts its own older checkout. Use the running localhost link during this play-test; do not relaunch the old script if the preview stops. Restart from the updated checkout with `npm run preview -- --host localhost --port 5174 --strictPort`, after checking that port 5174 is free. Promotion below updates the primary launcher only after acceptance.

## Play-test before retirement

1. Open the existing localhost address. Confirm the named players and saved balance remain present.
2. Switch between two players. Confirm each restores its event, car, challenge, CPU difficulty, transmission and route; reload and check again.
3. Start a race, earn points, get caught if desired, then quit. Saved credits must remain unchanged; unfinished race earnings must not be banked. Repeat with restart and reload.
4. Finish a race. Confirm normal rewards, capped race-earnings fines, Manual bonuses and car-best messages.
5. Check the distinct Falcon/959 models, steering, hills, turns, sound and damage during real play.
6. Try the six new circuits with different unlocked cars. Check alternating bends, fast crest flight, the height readout and shallow guardrail/tunnel scrapes. A sharp impact at 35° or above still follows normal crash-speed rules.
7. Unlock and select a specialist driver. Confirm its listed skill applies only to matching cars and that enhanced best times are separate from neutral records. Listen to engine revs and shifts on the speakers or headphones normally used for the game.
8. Unlock the 900-credit Freestyle Playground. Check length/height readings, small-rock crawling, oversized-rock tipping, mountain rollback and crushing. Drive backwards around the playground, then crash: recovery should stay local. Restart and exit should not change saved credits. Check ordinary courses remain available only after their credit unlock and any owned car can enter them.

Human play-test acceptance is still required. Automated checks are not a substitute for that acceptance. Do not remove either checkout before it.

## Retire the duplicate safely after acceptance

The previous folder owns the main `.git` directory. This updated checkout is a linked worktree whose `.git` file points into that directory. Deleting the previous folder would break the updated checkout's Git history.

After acceptance, use a separate approved maintenance step:

1. Verify the update is committed and both checkouts have no unpreserved changes. Back up the user's launcher/icon and any newly added local files.
2. Fast-forward the main checkout to the accepted update commit if its branch is still compatible. If it has new commits or edits, stop and reconcile them instead of overwriting them.
3. Point the server and launcher to that promoted main checkout. Verify the same localhost address, player saves and game build again.
4. Only then remove the clean temporary linked worktree using Git's worktree command. Do not force removal or delete the shared `.git` directory.

This replaces the old code while retaining one primary checkout, all Git history and the user's local files. Until acceptance, keep the previous checkout as the rollback source. Rollback should restore the server's source directory, not erase or blindly overwrite browser saves.
