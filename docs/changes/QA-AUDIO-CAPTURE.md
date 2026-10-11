# QA-AUDIO-CAPTURE

The unchanged-source quiet rerun passed 22/23 checks. All three six-blast
stems had an overlapping 128-frame chunk label followed by a compensating
gap. This does not establish whether the samples themselves were intact.

## Decision

Use one native multi-input worklet for the three simultaneous stems. One
callback copies all inputs under the same raw clock, so stem capture no
longer depends on three independent processor lifetimes and deliveries.
Quiet and pause probes retain the same meter with one input. Keep every
existing assertion, sample, threshold and raw timestamp. Record each raw
callback clock and input length for a future failure. No label correction,
sample filling or claim that the old cause is proved. Stop diagnosis by
06:34 UTC; a failed bounded run becomes a follow-up, not another retry.

## Verification

VM routing, exact existing PCM copying (including ||0 signed-zero behavior),
transfers, mono and adverse-clock rejection pass. Independent source review
is clear. One quiet native run passes all 23 original cases and 98 checks;
true peaks -1.39/-1.48/-1.48 dBTP. The old cause remains unproved.
Lane gate and build pending.

## Removed

The three separately scheduled race meters are replaced by one atomic meter.
