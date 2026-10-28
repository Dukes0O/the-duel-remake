# HELI-LANDED

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026: "I flew to Tremblant Snow, but what now? I've landed,
but there's no way to stop the helicopter." The only way out is Escape, then
Main Menu, and nothing tells the player that. The pause screen's footer also
lists the car controls (arrows to drive, Space to boost) during a flight.

## Claude's design

1. **Arrival panel.** When the helicopter is settled on the ground (skids
   down, nearly still) within the landing zone of a place, and no lesson,
   challenge, rescue, fire or ski run is under way, the side panel shows:
   - "LANDED AT TREMBLANT SNOW" (the place's name);
   - one line on what is here: a car of yours parked here, jobs that start
     here (from the existing dispatch), or "Nothing waiting here today";
   - **Race here**: leaves the flight (fuel kept, as Main Menu does) and
     opens the main menu with this course chosen, and the car parked here
     chosen if there is one;
   - **Shut down**: leaves the flight to the main menu (fuel kept);
   - Taking off again hides the panel; nothing happens by itself.
   Keyboard: the two buttons are reachable with Tab and Enter; no new keys.
2. **Pause footer during a flight** shows the helicopter's keys (from the
   controls help the helicopter already uses), not the car's.
3. The landing zone and "settled" use the session's existing numbers; no new
   tuning.

Owns: `src/heli/heli-ui.js`, the pause footer text, tests in
`tools/test-heli-view.mjs` (or the nearest existing suite), and
`docs/changes/HELI-LANDED.md`. Hooks: `src/app.js` for the two buttons.
Switch: `helicopter` (on): this is a live fix.

Acceptance: tests for showing and hiding the panel (landed, still flying,
mid-job), Race here choosing the course and the parked car, Shut down keeping
fuel; a picture of the panel at Tremblant Snow; lane tier and build.
Removed: nothing.
