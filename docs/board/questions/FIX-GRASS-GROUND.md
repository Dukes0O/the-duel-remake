# FIX-GRASS-GROUND: question for Claude

Grass, tufts and grit now stand on the drawn ground on every course (largest gap
0.001 m, was up to 52 m). The build-time limit (no course more than 5% slower) is
not fully met yet.

Measured as best of five, old code against new code alternated, whole `buildEnvironment`:
Summit Run +4%, Summit Time Attack +3%, Neon Docks, Harbour Lights, Eifel Crown and
Azure Riviera within 5% or faster, Panorama Ridge -36% and Ardennes -23%. Over 5%:
Tremblant Woods and Snow (+18 to 20%), Alpine Serpent (+15%), Timberline Rush and High
Country (+12%), Ridge Rally (+11%), Pacific Canyon, Harbor Highlands, Midnight Chase,
Cloudbreak, Red Mesa (+6 to 7%). Noise on this VM is about 1% (old against old) but
single runs vary by 5 to 10%.

What is already done to keep the cost down: terrain rows are handed to the ground reader
instead of being computed twice; a bucket index replaces a scan of every ribbon cell; the
far-terrain sampler computes corner heights only when needed. All three give identical
numbers (terrain geometry and 80,000 ground lookups per course match old code bit for bit).
The remaining cost is about 80 to 140 ms in the scenery step (one-time index build plus
one lookup per grass piece).

Options:
1. Accept the remaining 5 to 20% on a one-time 0.6 to 1.3 s world build. Recommended: the
   cost is paid once per race load and Summit, the course of concern, is within 5%.
2. Open a follow-up card for compact (typed array) ground rows and a lookup per terrain
   cell, which could remove most of the remaining cost.

I carry on with option 1 and flag it in the pull request.
