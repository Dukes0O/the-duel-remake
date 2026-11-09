# FIX-HUD-LOAN-SLOT

The 6 November full check failed `combat-hud`, `arsenal-core` and `arsenal-wave1`. Everburn's loan change (43955ec4) kept a hidden fifth button in the weapon bar, and those checks read the bar's real contents. Players saw four slots.

The loaned flamethrower now joins the bar only while it is on loan and leaves when the loan ends, so the bar holds the car's real slots. Key, pad and click behaviour are unchanged.

Tests: browser `combat-hud`, `arsenal-core`, `arsenal-wave1` pass, lane tier and build. No assertion changed. Replay fingerprints unchanged: the HUD does not change race state.

Removed: nothing.
