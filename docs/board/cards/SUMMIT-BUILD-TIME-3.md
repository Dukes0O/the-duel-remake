# SUMMIT-BUILD-TIME-3

The short board entry controls current state, ownership, dependencies and locks.

Summit timing on f514c859 with the finish area (26 October evening, headed,
alone, GPU idle): frames pass (p95 16.8 ms both qualities), but world build
was High 1,036 ms and Performance 984 ms on one run and 2,589 ms on the next.
Find what causes the 2.6 s spike (shader compile, garbage collection, the
finish kit's 80 extra geometries) and bring both qualities under 1 s every
time, without changing what is drawn: Summit signatures stay exact. Claude
runs the official timing.
