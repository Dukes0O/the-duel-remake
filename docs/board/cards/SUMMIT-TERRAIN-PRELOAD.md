# SUMMIT-TERRAIN-PRELOAD

The short board entry controls current state, ownership, dependencies and locks.

From SUMMIT-BUILD-TIME-3 (27 October 2026, night): Summit's timed world build
is about 1.0 s on a quiet fast core and 1.45 to 1.6 times that on the laptop's
slow cores; 76% of it is the course-only terrain math (far terrain 46%, near
ribbon 30%), and nothing in it touches graphics.

Claude decides: do that terrain math while the course's kits are loading (it
depends only on the course), split into slices so the page stays responsive,
and let the timed world build use the result. What is drawn stays exact:
Summit world signatures and replay fingerprints unchanged. The first race load
in a fresh browser must not get slower. Measure before and after in the same
conditions on both kinds of core (the SUMMIT-BUILD-TIME-3 note has the
affinity method); Claude runs the official frame check. Lane tier and build.