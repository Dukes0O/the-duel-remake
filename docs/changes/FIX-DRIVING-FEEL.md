# FIX-DRIVING-FEEL

Road keyboard steering now starts at 30% and rises over 0.45 seconds. Its maximum stays full through 40 mph, falls to 80% at 80 mph and reaches 60% at 120 mph. Reverse uses absolute speed. Road keyboard throttle rises from zero to full over 0.6 seconds. Both curves supply the exact average during each fixed simulation step.

The actual arena predicate remains venue and arena both true. Those arenas retain the original 78% steering onset, 0.2-second rise and instant throttle. Gamepad, autopilot, braking, vehicle physics and raw recorded inputs are unchanged. There is no recovery cap or STEADY message.

W and Up share one pedal. Release, opposing steering keys and existing lifecycle resets clear the appropriate held history. Countdown holds accumulate as before. The input adapter detects arena/road changes and starts fresh.

## Verification

Tests were authored first in the existing keyboard suite. The initial RED was the missing createKeyboardThrottle export before implementation. A bounded memory-only diagnostic used the unchanged six-second W approach and 50/100 ms tap fixture. It did not claim a test pass: its three superseded physical comparisons were omitted only in memory to print review samples. Its independent per-tick prediction initially counted the release tick; corrected counting excludes that tick.

At 74.80 mph, the actual 50 ms steering impulse was 0.014027450795783826 against independent 0.014027450795783828. The 100 ms impulse and independent prediction were both 0.03135567979624786. Yaw/lateral response ratios to the existing full-key control were 0.2692/0.2653 and 0.2918/0.2814. No approach, speed, physics, input or fixture was fitted.

The complete existing focused keyboard suite passes 443 checks, including exact Scrapdome outputs, native tap physics, throttle release/lifecycle, controller/raw input and identical 30/60/144 FPS trajectories (hash prefix 70b86b3eec039dc4). The arena fixture uses the actual admission input-clear seam before the real Duel arena start. No new arena event hook was added. Canonical lane tier, build and independent review are pending. Native Harbour stock-autopilot comparison and one keyboard-shaped lap remain UNRUN for the full check. Kyle and Gratian still judge the feel in play.

## Changed assertions

The card explicitly replaces road onset/rise, road W onset and their exact curve equations. Arena values remain separately checked against the original arithmetic. Existing physics, release, lifecycle, controller, raw-input and 30/60/144 FPS checks remain. The Director's 6d46aeb2 grant replaces the obsolete physical 0.8075/0.835 impulse values with an independent pressed-tick curve times the actual speed cap, retaining the 1e-12 tolerance and excluding the later release tick. The old 0.74-to-0.9 response range described the old curve. It is replaced by strictly positive yaw and lateral response below the same full-key control, strengthened by forward travel, speed above 40 mph, no crash and healthy status on every pressed tick. These are behavioral requirements and exact equations, not fitted sample bounds. The unchanged six-second approach, tap durations, neutral/full-key controls and all original approach/release/status checks remain.

## Removed

The old sharp road input is replaced. Its exact steering curve remains for arenas. No assets, fixtures, simulation paths or saves were removed.
