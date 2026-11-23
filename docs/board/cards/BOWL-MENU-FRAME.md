# BOWL-MENU-FRAME

The short board entry controls current state, ownership, dependencies and locks.

Seen by Claude on the released build of 22 November 2026 (26.11.23 05:10 UTC): opening SHOW NIGHT from the main menu
logs one uncaught error, "Cannot read properties of undefined (reading 's')", from `Course._frame` through `worldAt`.
The caller is the menu showcase camera in `src/render3d.js` (the branch that places the camera at the car's s + 6.4 on
the menu's course): for one frame the car's s is not a number, so `phase(s)` finds no sample. The Show Night screen
and the nights still work; Kyle played them on this code in Chrome.

The task: find which frame gives the showcase car no s when the menu's course becomes the Bowl, and make it start with a
real place (fix the cause, not a guard in `_frame`). Check: a test that opens Show Night from the menu in the browser
records no page error (an existing Bowl scenario may already collect page errors; extend it rather than add a new one).
