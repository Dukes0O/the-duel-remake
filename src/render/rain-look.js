// FAR-RAIN: every number that decides how the rain looks and when it comes. A round of tuning is a change to this table
// and nothing else. Lengths are in metres unless the name says mm, times in seconds, and screen sizes in screen heights.
//
// Reasoned from rain in the world, not from other games:
// - A windscreen sits about 0.7 m from the eye, and the eye is focused on the road, so a bead of 1 to 3 mm is a soft,
//   small blob: about 6 to 10 pixels across on a 1080-line screen. Big drops on the glass are what make rain look toy-like.
// - The first drops of a shower are few and large. A bead of about 3 mm runs down the glass and leaves small beads behind
//   it; above about 55 km/h the air pushes the beads up and over the glass instead. The wiper takes them all away.
// - A falling drop is seen as a short streak, as long as the distance it falls while the eye takes it in.
// - Wet ground keeps about half of its dry colour and starts to mirror the sky. The first drops on dry dust leave dark
//   spots that join up. Water gathers in the hollows of flat ground, and a puddle mirrors the grey sky at a low angle.
export const RAIN_LOOK = Object.freeze({
  // When each part arrives, in seconds after the rain begins.
  arrival: Object.freeze({
    firstDropAt: 1.5,        // the single drop on the glass
    secondDropAt: 5,         // nothing else lands before this
    dropsFullAt: 48,         // drops on the glass at their full rate
    fallFrom: 9,             // falling rain begins to show
    fallFullAt: 50,
    greyFrom: 0,             // the sky closes over
    greyFullAt: 40,
    wetFrom: 6,              // the first dark spots on the ground
    wetFullAt: 75,
    puddlesFrom: 40,         // water starts to stand in the hollows
    puddlesFullAt: 160,
    soundFrom: 1.5,          // the first tick is the first drop; the hiss comes in under it
    soundFullAt: 60,
    rampPower: 1.35,         // slow at first, then faster: the shower thickens
    stopSeconds: 5,          // under cover, the falling rain is gone in this long
    resumeShare: .25,        // time out of the rain counts back at this share, so a short tunnel does not restart it
    dryingSeconds: 300,      // after the rain, the ground takes this long to dry
  }),
  // Beads on the windscreen, seen from the driver's seat.
  glass: Object.freeze({
    distance: .7,                    // from the eye to the glass
    focusBlurMm: 2.2,                // the eye looks past the glass: the soft edge of every bead
    dropRadiusMm: Object.freeze([.8, 2.4]),
    firstDropRadiusMm: 5,            // the first drop of a shower is a big one, and spreads as it hits
    firstDropAt: Object.freeze([.16, .12]), // on the screen, from the centre: right and up, in screen heights
    runRadiusMm: 3,                  // a bead this big runs
    hitsPerSecond: 22,               // beads landing on the glass in view, standing still, in full rain
    hitsPer100Kmh: 38,               // more as the car drives into the rain
    beads: 170,                      // at most on the glass at once
    slideMmPerSecond: 70,            // a running bead, at its running size
    wobbleMm: 1.6,                   // a run does not go straight
    airLiftKmh: 55,                  // faster than this, beads go up the glass
    trailRadiusMm: Object.freeze([.3, .6]),
    trailEveryMm: 5,
    sag: .14,                        // a bead hangs a little heavier at the bottom
    rim: .45,                        // the dark edge where the bead bends light away
    glint: .9,                       // the bright point of sky on its top
    opacity: .72,                    // a bead is clear water: it changes what is behind it, it does not hide it
    // What a bead shows: the world small and upside down, so sky at its bottom and ground at its top. Shares of the
    // fog colour, which is the colour of the sky at the horizon.
    skyShare: 1.08,
    groundShare: .5,
    wiper: Object.freeze({
      afterBeads: 14,                // the driver switches it on when this many beads are on the glass
      intermittentSeconds: 7,
      continuousSeconds: 1.35,       // the time from one stroke to the next at full speed
      continuousFrom: .6,            // share of full rain at which it runs without stopping
      strokeSeconds: .6,             // one way across
      pivot: Object.freeze([-.18, -.78]), // in screen heights from the centre
      length: 1.05,
      restAngle: -.42,               // radians from the horizontal, parked below the view
      endAngle: 2.6,
      bladeWidth: .012,
      shade: .86,                    // how dark the blade is
    }),
  }),
  // Drops on the lens of the chase camera: few, large and out of focus, and they do not run.
  lens: Object.freeze({
    hitsPerSecond: .45,
    beads: 12,
    radius: Object.freeze([.014, .04]), // screen heights
    blur: .55,                          // share of the radius that is soft
    lifeSeconds: Object.freeze([4, 9]),
    opacity: .55,
  }),
  // The falling rain: streaks in a box that travels with the eye.
  fall: Object.freeze({
    streaksHigh: 7000,
    streaksPerformance: 2400,
    box: Object.freeze([36, 22, 36]),
    speed: 8.5,                      // a raindrop of about 2 mm falls at this speed
    wind: Object.freeze([1.4, .5]),  // drift along x and z
    exposure: 1 / 30,                // how long the eye takes in a moving drop
    widthMm: 1.6,
    minPixels: .9,                   // a streak is drawn at least this wide and made fainter to match
    farShare: .3,                    // but never fainter than this share: the eye blurs a far drop wider, it does not lose it
    nearest: .7,                     // nothing this close to the eye
    brightness: 1.25,                // share of the fog colour: a drop catches the light of the whole sky
    alpha: .32,
  }),
  // Wet ground and puddles, laid over the real ground around the car.
  ground: Object.freeze({
    tile: 24,
    tilesHigh: 7,
    tilesPerformance: 5,
    cellsHigh: 12,
    cellsPerformance: 10,
    lift: .06,                       // above the ground, so that the ground does not show through
    buildMsHigh: .7,                 // the time each frame may spend finding the ground under new wet ground
    buildMsPerformance: .45,
    wetDarken: .5,                   // wet ground keeps this share of its dry colour
    puddleDarken: .18,
    wetGloss: .34,                   // a wet rough surface mirrors this share of what a still one does
    puddleGloss: 1,
    reflectance: .02,                // water, looked at straight down
    spotSize: .09,                   // the dark spots of the first drops on dry dust
    hollow: Object.freeze([.02, .14]), // how much lower than the ground around it a place must be to fill
    hollowRadiusCells: 2,
    flatSlope: Object.freeze([.05, .14]), // rise per metre: no water stands on steeper ground
    microShare: .6,                  // small hollows the height samples are too coarse to see
    microSize: 1.9,
    fillFrom: 1.08,                  // the water's level, as a share of the hollow, when the puddles begin
    fillTo: .45,                     // and when they are full
    edge: .07,
    ripples: true,                   // rings where the drops land in a puddle; High only
    rippleCell: .45,
    rippleSeconds: .85,
    fadeFrom: .55,                   // share of the wet ground's reach where it starts to fade out
    fadeTo: .97,
    zenithShare: .78,                // the sky straight up is this share of the horizon's brightness
  }),
  // The sky closes over: the look the light moves to in full rain. Colours are the sky in daylight; at night they are
  // scaled down by how much darker the scene's own fog is than `dayFog`.
  sky: Object.freeze({
    fog: 0x7f888c,
    top: '#59636a',
    horizon: '#939ca0',
    ground: 0x3d3f3a,
    sunColor: 0xd3dbe0,
    cloudTint: Object.freeze([.56, .59, .61]),
    dayFog: 0xb5bcbd,
    sunShare: .1,
    hemiShare: .92,
    envShare: .72,
    sunStrengthShare: .05,
    exposure: 1.1,
    bloom: .08,
    fogNear: 18,
    fogFar: 460,
    cloudCover: 1.7,
  }),
  // The sound, `far.rain`, drawn in code until a recording is chosen.
  sound: Object.freeze({
    cue: 'far.rain',
    hiss: Object.freeze({frequency: 3600, q: .5, gain: .2}),
    body: Object.freeze({frequency: 650, q: .7, gain: .13}),
    tick: Object.freeze({frequency: Object.freeze([1700, 4600]), seconds: .016, gain: .11, perSecond: 26}),
    outsideShare: .55,               // the ticks on the glass are quieter from the chase camera
    shelterShare: .2,                // under cover
    smoothing: 1.2,
  }),
});
