# STORY-NIGHT-2-FLOW

Kyle's non-dialogue findings from Night 2, all behind `story-choices` (the Wash also needs `road-riders`). Esc while the mouse
is captured only frees it. The breath is three small soft wisps that leave the mouth, slide to the side and rise. The night
ends in the world at dawn with one "Remembered: ..." line (`story.journal.note`) and a Continue that goes straight to the
yard without the Wasteland arrival; the journal opens from the pause card (THE JOURNAL) and the Story Wall; the replay choice
stays. The choice bubbles show the words with a small number key, no SAY or ASK. The HUD says when the scout is in reach, and a
car hit knocks him flat (`night.ash-man.down`), as it does a Wash crewman. At the Wash: fire only where the Walkers got an
ember; one rider circles the camp at 30 m with its lights on and breaks off last; crews run for the camp and take it if they
reach it (`wash-camp-taken`, Walkers' word down a step, `night.camp.taken`); lean-tos, carts and lit fires are solid;
bailing men land beside the player's car.
Checks on eec33f633+: test-night-2, test-story-replay-pick, test-story-talk, test-story-talk-input, test-app-lifecycle, test-sound-bank, test-browser-scenarios, test-night-2-scenario.
Changed assertions: test-app-lifecycle and test-story-talk-input (a release with story-choices on no longer pauses; Esc when free pauses); test-night-2 (the refused camp is dark, so its fire and smoke checks became dark-camp checks; the tower counts six rider lights, not eight; a Wash win now runs the crews down first).
**Removed:** Esc while captured no longer pauses (behind story-choices); the end-of-night journal modal and its "Back to the yard" button; the SAY and ASK labels; firelight at a refused camp.
