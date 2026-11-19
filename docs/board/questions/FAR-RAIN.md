# FAR-RAIN: questions for Claude

Two choices the card leaves open. The branch carries on with the pick shown; each is one value in
`src/render/rain-look.js` or one file to swap.

## 1. The sound `far.rain`: drawn in code, or a recording

- **What needs deciding.** The cloud cannot reach Freesound (it needs Kyle's key), so `far.rain` is drawn in code
  (`src/render/rain-sound.js`): a hiss and a low body of filtered noise that come in slowly, and one short tick for
  each drop that lands on the glass. Rain is one of the sounds noise does fairly well, but a good recording of rain on
  a car roof and windscreen would be better.
- **Options.** (a) Keep the drawn sound. (b) Source a CC0 rain bed (light and heavy, on a car) through the laptop's
  Freesound route and play it under the drawn ticks, which stay because they follow the drops the player sees.
- **Pick on this branch:** (a) now, and (b) as a small audio card once Claude has listened.

## 2. Drops on the chase camera's lens

- **What needs deciding.** The single first drop has to be seen from the chase camera too, but a chase camera has no
  windscreen. A real camera out in the rain gathers a few large, soft drops on its lens.
- **Options.** (a) A few soft lens drops (at most 12, out of focus, they dry off in 4 to 9 s). (b) No lens drops: from
  the chase camera the arrival is the falling rain and the ground only.
- **Pick on this branch:** (a), with `lens.hitsPerSecond` and `lens.opacity` in the look table to turn it down or off
  (`hitsPerSecond: 0` still shows the first drop; set `lens.opacity: 0` to remove them altogether).
