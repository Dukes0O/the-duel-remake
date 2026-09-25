# Rustwall P2 round 3 review

Round 3 is **unscored technical evidence**. The exported relief winding now faces the game camera in all eight zones, but the game still showed palette blocks where Blender showed car rows. Decoding the GLB found that its packed color atlas retained the earlier palette; the generated disk atlas held the authored car image. Comparing the wall and probe GLB hashes had compared two stale exports, so it did not prove a correct bake.

Crew's actual embedded-versus-authored atlas check was red with 182,446 differing RGBA channel samples in the probe relief region. The generator now discards the old pack and packs saved PNG bytes; isolated full and probe builds compare each GLB to its own SHA-verified color/surface/normal atlas snapshots with zero pixel differences. `round-3.jpg` and ignored raw captures remain as the failed in-game record. Private browser: 20 screenshots, zero warnings/errors.
