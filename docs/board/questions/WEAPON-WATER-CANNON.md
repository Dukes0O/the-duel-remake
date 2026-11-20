# WEAPON-WATER-CANNON: questions for Claude

Claude (cloud), 20 November 2026. The work carried on with each pick below.

## 1. What "at Fire Station level" means

**My pick, built.** The Armory offers the water cannon once the player's own town has a finished Fire Station, at any rank.
The town lives in its own store, so the app reads it once when the Armory first asks (memory only in QA) and the town screen
tells the app again on every load and save (`noteOwnTown`). Nothing new is saved: ownership is the existing arsenal purchase
(400 scrap) in `profile.wasteland.weapons`. Other picks: a rank, or the Fire Station's later upgrade if one is ever added.

## 2. Computer cars never carry it

ARSENAL section 4 asks that the computer really uses each weapon. Adding the cannon to computer loadouts would change every
existing loadout's draw, and so the balance and the replays, which the card forbids. **My pick, built:** town gear is the
player's own; `cpuArsenalLoadout` and the Baron's full loadout leave it out, and `fireWeapon` refuses it for a computer car.

## 3. The shove is a game number

A real 1,000 L a minute jet pushes about 500 N, which barely slides a car. **My pick, built:** 7 m/s more each second in the
water, capped at 4 m/s from one stream, about a lane in a 2 s burst. The truck's stream uses the same 14 m line on cars,
while its reach on a burning building stays the fire call's 40 m deck gun.

## 4. Smaller picks

- A star shield stops the shove but not the water: a shielded car on fire is still put out.
- Water puts out a friend's fire too, but shoves only an enemy.
- On the truck, water flows only while flames or a car are in front, as the fire call's cannon does, so holding H wastes none.
- The gamepad has no spray button yet, as in TOWN-FIRE-JOB.
