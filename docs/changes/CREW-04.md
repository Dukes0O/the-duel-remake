# CREW-04: Computer crews

status: waiting-on-claude

## Rule needed

CREW.md section 1 says computer fighters use the same signature gear with
the same numbers. Section 3 specifies only wrench repair and RPG ambushes.
Must CREW-04 include active signature gear use? If so, what selects and
triggers each item, including Jax's grapple and Odessa's turret?

## Build choices

Use the existing crew, fighter, RPG, repair and raider contact rules.
Each real computer car gets a stable crew choice from its own seeded stream.
Normal races, Easy exits and arena events keep their current behavior.

Pulling over uses the existing car motion solver toward a clear shoulder.
The fighter exits only after the car stops. Stops count separately for repair
and ambush, at most once each lap. Finish distance means the event's final
finish, including remaining laps.

The native fighter roster draws the crew's real appearance and actions.
Temporary crew fighter entries reuse native player damage and knockdown
contacts. They do not make another camp fire. A knockdown keeps the car
parked through the existing three-second respawn.

Ambush RPGs use the existing lock, reload, crew perks and Hard aim spread.
Existing repair and RPG sound cues can carry the new events.

## Checks

Independent test commit: 11efc6e. Nineteen native cases give thirteen passes
and six failures: crew assignment, repair stops and Hard ambushes are missing.
Source has not started. Native timing, lap and knockdown checks await those
entries. Browser, natural Hard race, thirty-race balance, lane and build
checks remain unmeasured.

## Removed

None.
