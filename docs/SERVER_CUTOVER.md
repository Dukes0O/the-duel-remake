# Play-test server and safe retirement plan

## Current update

The user authorized moving the game server to this updated checkout and committing the work. Keep the same browser address, `http://localhost:5174/`, so the existing local careers remain available. Do not clear browser storage, change the hostname to `127.0.0.1`, or change the port for the live game: each is a different save location.

Updated checkout: `C:\Users\kyleb\.codex\worktrees\4555\the-duel-remake`.

Latest: the scene-architecture cleanup build is `index-B3qtBbvL.js`, verified in the live server's HTTP response. Production and QA builds pass, as do all 85 regression suites with only the expensive core campaign matrices skipped. The open Spikyferns menu (200 CR, Harbor & Highlands, Titan Monster) was not refreshed or changed. Load the update with a menu refresh when ready. Isolated visual fixtures use temporary page memory and do not read or write real career saves.

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

Human play-test acceptance is still required. Automated checks are not a substitute for that acceptance. Do not remove either checkout before it.

## Retire the duplicate safely after acceptance

The previous folder owns the main `.git` directory. This updated checkout is a linked worktree whose `.git` file points into that directory. Deleting the previous folder would break the updated checkout's Git history.

After acceptance, use a separate approved maintenance step:

1. Verify the update is committed and both checkouts have no unpreserved changes. Back up the user's launcher/icon and any newly added local files.
2. Fast-forward the main checkout to the accepted update commit if its branch is still compatible. If it has new commits or edits, stop and reconcile them instead of overwriting them.
3. Point the server and launcher to that promoted main checkout. Verify the same localhost address, player saves and game build again.
4. Only then remove the clean temporary linked worktree using Git's worktree command. Do not force removal or delete the shared `.git` directory.

This replaces the old code while retaining one primary checkout, all Git history and the user's local files. Until acceptance, keep the previous checkout as the rollback source. Rollback should restore the server's source directory, not erase or blindly overwrite browser saves.
