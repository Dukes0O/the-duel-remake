# OPEN-ROAM-2

## Which existing hooks should carry the drive fixes?

The card names the talk step and pause card. The arena dispatcher currently passes zero time during every talk, and the generic results screen adds the race forfeiture line after the pause card. The service signs and marks were added to the card after the file list was written.

- Keep the authored greeting in the talk step and pass elapsed time through the arena dispatcher only for that greeting. Let the roam pause card supply its own help to the results screen. Put signs in the open-land sign view and marks in the existing shared map path. Use the existing meeting fact for the service introduction.
- Move those hooks to a follow-up card and leave the greeting manual, the race help in pause, and the service locations unmarked in this slice.

Codex's pick is the first. The shed prompt belongs to OPEN-DOORS-2. These hooks require no edit to the busy game files.
