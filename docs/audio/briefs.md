# Combat audio briefs

These briefs implement Kyle's AUD-12 picks under AUD-14. All cues have three
fixed rotating variants, ship compressed, and require wasteland2. Compare
near and far over full throttle. Human ratings are pending.

| Family | Intent and layers | Priority and distance |
| --- | --- | --- |
| Crossbow E | 90 ms A snap, 3000–700 Hz pew; separate 2000–1500 Hz flying whistle | Weapon priority 50; flight 3D, 12 m reference, bounded doppler |
| Hit confirm | 800 Hz low-passed thunk and 3200 Hz tink; reward a player hit | Impact priority 75; clear local confirmation |
| Blast | Approved 523089/397691, sharp attack and full tail | Priority 80, max 8; softer low-pass far version; ducks ambience/music |
| Crash | Approved 592388 metal and glass, strength-scaled | Priority 75, max 4; far low-pass |
| Rocket | Approved 854476/854473 with high chirp; separate flying jet whistle | Weapon priority 50; flight 3D and doppler |
| UFO | Rising bright four-step signal; preserves the jump character | Weapon priority 50; no physical projectile exists |
| Bomb | Bright falling chirp over the low thump; falling flight whistle | Weapon priority 50; flight follows each bomb |
| Star | High three-note chord with sparkle; preserves the shield character | Weapon priority 50; no physical projectile exists |
| Raider shot | Short bright crack with a descending metallic tone | Weapon priority 50; event position and distance |

Approved recordings are checked against catalog SHA-256 before rebuilding.
The formulas, cut points, variants and conditioning live in the build script.
Legacy placeholder recipes remain only for switch-off and missing-file fallback.
