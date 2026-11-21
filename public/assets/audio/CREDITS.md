# Audio credits

## Recorded V8 revs and idle

**v8 engine rev.wav**, by **overmedium**, 25 September 2022. Primary source: [Freesound recording page](https://freesound.org/people/overmedium/sounds/651534/). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), verified on the recording page. The author describes a V8 throttle-blip and idle recording made with binaural microphones, with a high-pass filter and fades already applied by the author. The car model is not identified.

Downloaded the public [HQ MP3 preview](https://cdn.freesound.org/previews/651/651534_2396512-hq.mp3) as `v8-rev-source.mp3`. This is the publicly served compressed preview, not the account-only original WAV. Decoded with FFmpeg 7.1 to mono 44.1 kHz/16-bit `v8-rev-source.wav`. The download and decoded excerpt are cached outside the repository; tools/audio/catalog.json keeps the exact recipe. No account, payment or additional runtime codec is required.

Derived files: `engine-idle.wav`, `engine-coast.wav`, `engine-throttle.wav`, `engine-lift.wav`, `engine-shift.wav`. Changes: time selections specified in `tools/prepare-audio.mjs`, DC removal, 38 Hz high-pass filtering, peak and RMS level matching, 120 ms loop crossfades or short start/end fades. The mixer changes their pitch, gain and low-pass filter with engine revs and throttle. These are artistic load textures, **not measured RPM bands from the game's fictional cars**. The rev-blip recording is not used for sustained high-speed playback.

## Recorded acceleration

**Acceleration Car**, by **Fabrizio84**, 1 February 2019. Primary source: [Freesound recording page](https://freesound.org/people/Fabrizio84/sounds/457958/). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), verified on the recording page. The author identifies it as acceleration recorded from inside a vehicle and places the sound in the public domain.

Downloaded the public [HQ MP3 preview](https://cdn.freesound.org/previews/457/457958_2841496-hq.mp3) as `acceleration-source.mp3`. This is the publicly served compressed preview, not the account-only original WAV. Decoded with FFmpeg 7.1 to mono 44.1 kHz/16-bit `acceleration-source.wav`. The download and decoded excerpt are cached outside the repository; tools/audio/catalog.json keeps the exact recipe.

Derived files: `engine-load-low.wav`, `engine-load-mid.wav`. Changes: time selections, DC removal, 38 Hz high-pass filtering, peak and RMS level matching, 120 ms loop crossfades. Playback blends adjacent engine textures using equal-power curves, with moderate pitch shifts and throttle-dependent filtering. No endorsement by either recording author is implied.

## Steady engine loop and fallback

**Racing car engine sound loops**, by **domasx2**. Source: [OpenGameArt](https://opengameart.org/content/racing-car-engine-sound-loops). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Original file: `engine-source.wav` (`loop_0.wav` from the source). The author describes a public-domain recording edited into a loop. Runtime files: `engine-loop.wav` (fallback) and `engine-load-high.wav` (sustained high-speed playback). Changes: DC removal, loop crossfade, peak normalization. The high-speed version also applies a 38 Hz high-pass filter, 90 ms circular RMS leveling and level matching. At high revs it plays as a single engine voice with moderate pitch changes; the old fallback and synthetic engine do not play over it.

## Recorded tires

**Car tire squeal skid loop**, by **audible-edge / Tom Haigh**, loop edit by **qubodup**. Source: [OpenGameArt](https://opengameart.org/content/car-tire-squeal-skid-loop). Licence: [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).

Original file: `tire-squeal.wav` (`tires_squal_loop.wav` from the source). Runtime file: `tire-loop.wav`. Changes: 96 kHz/24-bit mono resampled to 44.1 kHz/16-bit mono with a windowed-sinc filter, DC removal, short loop crossfade, peak normalization. Runtime pitch and volume follow sliding and braking. No endorsement by the authors is implied.

## Recorded landscape ambience

Three real field recordings are used under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Each licence was verified on its primary Freesound page on 19 September 2026:

- [Sea waves on the beach, some seagulls in background](https://freesound.org/people/felix.blume/sounds/500171/), by **felix.blume**, 26 December 2019. The author identifies Caleta Portales near Valparaíso, Chile, and a Schoeps CCM41/CCM8 microphone setup. The 20–44 second selection becomes `ambience-coast.wav`.
- [Sunny Forest Ambience 1](https://freesound.org/people/deadrobotmusic/sounds/609952/), by **deadrobotmusic**, 30 November 2021. The author identifies this as forest field-recorded ambience with birds. The 10–34 second selection becomes `ambience-forest.wav`.
- [Stadium Crowd](https://freesound.org/people/stomachache/sounds/274516/), by **stomachache**, 20 May 2015. The author describes general crowd noise recorded at a sports stadium. The full 8.193-second preview becomes `ambience-stadium.wav`.

The original public HQ MP3 previews are cached outside the repository as `coast-source.mp3`, `forest-source.mp3`, and `stadium-source.mp3`. These are compressed previews, not the account-only original WAV recordings. FFmpeg 7.1 decoded the stated excerpts to mono 44.1 kHz/16-bit PCM `*-source.wav` files. `tools/audio/catalog.json` records exact download URLs, source hashes, time selections and processing. The runtime loops apply DC removal, modest high-pass filtering, peak/RMS ceilings and 1.25-second coast/forest or 0.8-second crowd loop crossfades. Rebuild only these files with `node tools/prepare-audio.mjs --ambience-only`.

The mixer plays one unpitched loop per recording and fades between landscape sections. Coast surf, daytime alpine forest and arena crowd play quietly below vehicle sounds; tunnels and high-speed acceleration reduce them further. Daytime forest birds are omitted on night routes. No author endorsement is implied.

## Original sound design

`catastrophic-blast.wav` is an original synthesized pressure wave, noise burst and debris tail created for this game by `tools/prepare-audio.mjs`. Engine underlay, wind, gravel, siren, boost, impact, chicken-flock wing flutter, bonus chime and the musical sequence are original synthesis in `src/audio.js`.

The seven fictional cars use original pitch, gain and filtering profiles applied to the shared licensed recordings above. These are not recordings of seven separate vehicles. Tunnel reflections use short fixed filtered delays on engine and tire signals. The two-voice proximity siren, gravel layer and landing thump are original synthesis; no additional recording or impulse response was downloaded for them.

Idle, low/mid load and coasting loops also use the same 90 ms circular RMS leveling as the high-speed loop. This reduces repeated source loudness swells without changing the selected recording regions. Idle compensation is capped at 2.5 times; the other loops use the original 1.7 limit. The idle pitch reference was calibrated against its PCM tonal peak. No new source recording was added during this audit.

Downloaded and processed 19 September 2026. Keep this attribution file and the in-game Audio Credits link when distributing the audio. Rebuild compressed FLACs with `npm run assets:audio`.

Harmless arena junk-car crushing reuses the original synthesized collision-noise buffer at a lower playback rate and gain, with a short original metallic tone. It does not use a recorded crash source or the catastrophic explosion sample.

The engine-response expansion also reduces a narrow 43 Hz drone in `engine-load-high.wav` and `engine-loop.wav`, using a Q 3.5 notch blended with 14% of the dry signal. Both loops use level matching and circular RMS leveling. The retained source recording is unchanged. Runtime rev pitch now has a wider, continuous contour; the coast texture is tuned to its measured 63.5 Hz fundamental. No new source or licence is involved. See `docs/AUDIO_EXPANSION.md` for processing and test details.

AUD-10: all fourteen runtime recordings now use lossless FLAC. Their decoded PCM and loop sample counts are unchanged. Raw sources no longer ship in public/. Freesound previews live in the external audio-library cache, with recipes and checksums in tools/audio/catalog.json. The two licensed OpenGameArt originals are preserved losslessly in audio-src/library because the old credits do not record verified direct download URLs. New synthesis recipes live in src/sound-bank.js; state-driven engine automation stays in src/audio.js.

## Gatekeeper voice

Gatekeeper welcome generated with ElevenLabs, using its stock Callum voice.
Kyle selected this exact take on 24 September 2026. The catalog records the
ElevenLabs free-plan non-commercial and attribution terms. The runtime MP3
is a byte-for-byte copy of the kept source; only game mixer gain is applied.
Rebuild it with `node tools/audio/build-gatekeeper.mjs`.

## Kept crew and raider voices

Nine takes generated with [ElevenLabs](https://elevenlabs.io/) under the
free-plan non-commercial and attribution terms recorded in the catalog.
Kyle finalized these choices on 4 October 2026: Cinder/Jessica, Dune/George,
Jax/Liam, Nell/Alice, Odessa/Matilda, Rook/Harry, Tusk/Bill, Wren/Lily,
and Raiders/Bill. Runtime MP3s are exact copies of the kept source takes;
only the game mixer changes gain. Rebuild them with
`node tools/build-fight-voices.mjs`. No author endorsement is implied.

## Approved combat recordings

Rebuilt by `tools/audio/build-combat.mjs`: trimmed, layered, varied, compressed,
and loudness conditioned. Crossbow pew/whistle and confirmations add original
synthesis. No author endorsement is implied.

- [Crossbow Fire 2](https://freesound.org/people/Ali_6868/sounds/384905/) by **Ali_6868**, CC0 1.0.
- [Arrow Loose and Flyby](https://freesound.org/people/saturdaysoundguy/sounds/394180/) by **saturdaysoundguy**, CC0 1.0.
- [Explosion.wav](https://freesound.org/people/morganpurkis/sounds/397691/) by **morganpurkis**, CC0 1.0.
- [Explosion 1](https://freesound.org/people/magnuswaker/sounds/523089/) by **magnuswaker**, CC0 1.0.
- [Car Crash (with Glass)](https://freesound.org/people/magnuswaker/sounds/592388/) by **magnuswaker**, CC0 1.0.
- [M142 HIMARS Rocket Launch 5](https://freesound.org/people/qubodup/sounds/854473/) by **qubodup**, CC0 1.0.
- [M142 HIMARS Rocket Launch 8](https://freesound.org/people/qubodup/sounds/854476/) by **qubodup**, CC0 1.0.

## Muddy Hollow water and mud

Rebuilt by `tools/audio/build-hollow.mjs` from the public HQ previews: cut,
faded, one variant repitched, loudness normalised (EBU R128) and encoded as
mono Vorbis. Runtime files: `hollow-splash-a/b/c.ogg`, `hollow-mud-a/b.ogg`.
The mud churn under the tyres is original synthesis. No author endorsement is
implied.

- [Big Water Splash](https://freesound.org/people/qubodup/sounds/442773/) by **qubodup**, CC0 1.0.
- [car2.WAV](https://freesound.org/people/barion/sounds/462117/) by **barion**, CC0 1.0.
- [Mud_1.wav](https://freesound.org/people/lzmraul/sounds/389460/) by **lzmraul**, CC0 1.0.

## Sawtooth Sal side saw

[Circular Saw 02 170501_1491.wav](https://freesound.org/people/megashroom/sounds/390712/),
by **megashroom**, released under **CC0 1.0**. The public HQ Ogg preview is
trimmed to its start-up scream, high- and low-pass filtered, faded, loudness
conditioned and encoded as mono Vorbis by `tools/audio/build-sal.mjs`. Runtime
file: `sal-saw-scream.ogg`. No author endorsement is implied.

## Toll Gate klaxon

[electric hum.wav](https://freesound.org/people/soundofsong/sounds/641335/)
by **soundofsong**, CC0 1.0. The verified cached preview is filtered, repitched,
soft-clipped and pulsed, faded, level-conditioned and encoded as mono Vorbis
by `tools/build-tollkeeper-audio.mjs`. Runtime file:
`tollkeeper/gate-klaxon.ogg`. No author endorsement is implied.

## Flamethrower particles

[Particle Pack](https://kenney.nl/assets/particle-pack) by Kenney Vleugels. CC0 1.0. Four native wispy flame silhouettes, smoke and scorch are resized to padded 128 px tiles. The renderer adds amber shading and time-driven animation. Recipe: tools/art/polish-flame-textures.py. Original license and exact source hashes: tools/art/catalog.json, kenney-particle-pack-flame.

## Grand Prix sound library

All sources below use [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The Grand Prix recipes trim, filter, pitch, fade and level-match these recordings; continuous beds use a short loop crossfade. Source hashes and exact cuts are in `tools/audio/catalog.json`; rebuild with `tools/audio/p4-audio.mjs`.

- [Countdown for race, game start](https://freesound.org/people/Pastew/sounds/813525/), by **Pastew** (Freesound 813525).
- [GASP_Chimes_Success_1.wav](https://freesound.org/people/Rob_Marion/sounds/541982/), by **Rob_Marion** (Freesound 541982).
- [2016.07.22 Bell Single 01.wav](https://freesound.org/people/RP1312/sounds/350616/), by **RP1312** (Freesound 350616).
- [v8 engine rev.wav](https://freesound.org/people/overmedium/sounds/651534/), by **overmedium** (Freesound 651534).
- [Air Impact Wrench](https://freesound.org/people/sevenbsb/sounds/349398/), by **sevenbsb** (Freesound 349398).
- [Car driving on a gravel dirt road, close recording of front wheel from outside](https://freesound.org/people/felix.blume/sounds/685231/), by **felix.blume** (Freesound 685231).
- [tires_snow_ice_slow.wav](https://freesound.org/people/dunebuggy/sounds/71099/), by **dunebuggy** (Freesound 71099).
- [Skates on Ice.wav](https://freesound.org/people/Rehanjo/sounds/593623/), by **Rehanjo** (Freesound 593623).
- [S27-07 Ice avalanche sliding & breaking up; weird.wav](https://freesound.org/people/craigsmith/sounds/675734/), by **craigsmith** (Freesound 675734).
- [Monster Long Roar 1.wav](https://freesound.org/people/ecfike/sounds/132866/), by **ecfike** (Freesound 132866).
- [Hard Impact on Snow](https://freesound.org/people/Elements-Library/sounds/683786/), by **Elements-Library** (Freesound 683786).
- [Stadium Crowd](https://freesound.org/people/stomachache/sounds/274516/), by **stomachache** (Freesound 274516).
- [Larrun_Mountains_MedWind](https://freesound.org/people/nicotep/sounds/725630/), by **nicotep** (Freesound 725630).
- [Distant harbour noise in a windy night, Hamburg Landungsbrücken](https://freesound.org/people/Pfannkuchn/sounds/342878/), by **Pfannkuchn** (Freesound 342878).
- [Sunny Forest Ambience 1](https://freesound.org/people/deadrobotmusic/sounds/609952/), by **deadrobotmusic** (Freesound 609952).

## The Deep

Selected public HQ previews, all [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
The recipes in `tools/audio/build-deep.mjs` cut, filter, fade and loudness-match
the eight cues. Bubbles and cave use crossfaded mono Vorbis loops; the six
accents use mono Vorbis. The pearl uses ascending layers of its same source.
Source and runtime hashes are in the audio catalog.
No author endorsement is implied.

- [Big Water Splash](https://freesound.org/people/qubodup/sounds/442773/), by **qubodup**: dive splash.
- [v8 engine rev.wav](https://freesound.org/people/overmedium/sounds/651534/), by **overmedium**: short muffled entry accent.
- [Aquatic sound of some bubble in a swimming pool](https://freesound.org/people/felix.blume/sounds/208816/), by **felix.blume**: exhaust bubble bed.
- [Hard Impact on Snow](https://freesound.org/people/Elements-Library/sounds/683786/), by **Elements-Library**: filtered soft landing.
- [2016.07.22 Bell Single 01.wav](https://freesound.org/people/RP1312/sounds/350616/), by **RP1312**: creature log note.
- [GASP_Chimes_Success_1.wav](https://freesound.org/people/Rob_Marion/sounds/541982/), by **Rob_Marion**: rising pearl shimmer.
- [Diving with whales.wav](https://freesound.org/people/KEVOY/sounds/82325/), by **KEVOY**: distant whale song.
- [Underwater Ambience](https://freesound.org/people/Fission9/sounds/504641/), by **Fission9**: low cave bed.

## The helicopter

The 83 radio lines are generated with [ElevenLabs](https://elevenlabs.io/),
using its stock voices Brian (the instructor), Sarah (the park rangers and the
wildlife survey) and
Roger (fire and rescue dispatch), under the free-plan non-commercial and attribution
terms recorded in the catalog. The
runtime MP3s are exact copies of the kept takes in `audio-src/voices/`; the
game plays them through the radio filter in `src/heli/heli-audio.js`. Copy them
with `node tools/audio/build-heli.mjs --voices`. No author endorsement is implied.

Twenty-six sounds are selected public HQ previews, all
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The recipes in
`tools/audio/build-heli.mjs` cut, filter, fade and loudness-match them; the
rotor, wind, fire crackle, bucket scoop and pour, snow digging and winch are crossfaded mono Vorbis loops. The engine stop is the idle of
a running helicopter read at a falling speed while it fades. The low-fuel
chime, low-rotor horn, radio click, radio hiss, fire alert, aim tick and
badge chime, beacon beep and clock tick are original tones and noise made in `src/heli/heli-audio.js`. Source and runtime hashes are in the
audio catalog. No author endorsement is implied.

- [Helicopter Rotor Loop.flac](https://freesound.org/people/qubodup/sounds/187681/), by **qubodup**: rotor loop.
- [Helicopter engine starting (part 1).wav](https://freesound.org/people/Jadis0x/sounds/540801/), by **Jadis0x**: engine start.
- [R03-07-Jet Helicopter In and Stop.wav](https://freesound.org/people/craigsmith/sounds/479514/), by **craigsmith**: engine stop.
- [loop smooth muffled rushing air tone skyline traffic distant wind trees forest.flac](https://freesound.org/people/kyles/sounds/454072/), by **kyles**: wind loop.
- [rope leathery creaking.wav](https://freesound.org/people/vestibule-door/sounds/664929/), by **vestibule-door**: cable creak.
- [Karabiner_Click_03.wav](https://freesound.org/people/Rudmer_Rotteveel/sounds/457455/), by **Rudmer_Rotteveel**: hook release.
- [Medium Thud 1](https://freesound.org/people/sgrowe/sounds/342535/), by **sgrowe**: set-down thud.
- [Fireplace_Outside_Fire_3](https://freesound.org/people/SMKoski02/sounds/868895/), by **SMKoski02**: forest fire crackle.
- [Rushing River Loop](https://freesound.org/people/ThanksForTheInspiration/sounds/523022/), by **ThanksForTheInspiration**: bucket filling.
- [Ambiance_Waterfall_Big_Skogafoss_Loop_Stereo.wav](https://freesound.org/people/Nox_Sound/sounds/690224/), by **Nox_Sound**: bucket pouring.
- [metallic tube is hitting metallic bucket.wav](https://freesound.org/people/lartti/sounds/513797/), by **lartti**: bucket dent.
- [R19-39-Steam Hiss.wav](https://freesound.org/people/craigsmith/sounds/479296/), by **craigsmith**: steam where water lands on fire.
- [road flare ignite burns.wav](https://freesound.org/people/frankelmedico/sounds/348767/), by **frankelmedico**: the hiker's flare.
- [Snow removing.mp3](https://freesound.org/people/Gutek/sounds/201888/), by **Gutek**: digging in snow.
- [Karabiner_Click_04.wav](https://freesound.org/people/Rudmer_Rotteveel/sounds/457454/), by **Rudmer_Rotteveel**: clipping on to the rescue line.
- [Canon A1 Camera Shutter.wav](https://freesound.org/people/yfjesse/sounds/579876/), by **yfjesse**: an animal counted in the survey.
- [Hidrolavadora.wav](https://freesound.org/people/valeulloam97/sounds/532823/), by **valeulloam97**: the pressure washer at the pad.
- [SFX Electric Actuator 2.mp3](https://freesound.org/people/mpuffenbarger/sounds/683807/), by **mpuffenbarger**: the winch motor.
- [Moose_Elk.mp3](https://freesound.org/people/gleith/sounds/486554/), by **gleith**: moose.
- [22_Lobo_aullando.wav](https://freesound.org/people/JoseAgudelo/sounds/472402/), by **JoseAgudelo**: wolf howl.
- [Bear Angry Growl](https://freesound.org/people/celldroid/sounds/763026/), by **celldroid**: bear.
- [Kingfishers - Laughing Kookaburra; Two Calling](https://freesound.org/people/TheKingOfGeeks360/sounds/826086/), by **TheKingOfGeeks360**: kookaburra.
- [Parrots - Sulfur-crested Cockatoo](https://freesound.org/people/TheKingOfGeeks360/sounds/844340/), by **TheKingOfGeeks360**: cockatoo.
- [Sheep - Bleat; Close Perspective](https://freesound.org/people/TheKingOfGeeks360/sounds/803460/), by **TheKingOfGeeks360**: sheep.
- [Ground Squirrel First Chirp](https://freesound.org/people/burgersmoke/sounds/640992/), by **burgersmoke**: the marmot's whistle (a ground squirrel's alarm chirp; marmots are large ground squirrels).
- [Raven Croak or Crow Caw](https://freesound.org/people/fudgealtoid/sounds/716962/), by **fudgealtoid**: raven.

## Show Night crushes

Selected public HQ previews, all [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The recipes in
`tools/audio/build-bowl-crush.mjs` cut, re-pitch, filter, layer and level them into the Bowl's nine crush cues
(`bowl.crush.*`, mono Vorbis in `bowl/`). Source and runtime hashes are in the audio catalog. No author endorsement is
implied.

- [S38-24 Big heavy car crash.wav](https://freesound.org/people/craigsmith/sounds/675902/), by **craigsmith**: car, bus, pancake.
- [Fall debris (crash)](https://freesound.org/people/xkeril/sounds/703248/), by **xkeril**: car, flat.
- [S37-04 Car hits three news stands; good crunch.wav](https://freesound.org/people/craigsmith/sounds/675910/), by **craigsmith**: car, flat.
- [S37-14 Two cars crash foley; good metallic bump.wav](https://freesound.org/people/craigsmith/sounds/675466/), by **craigsmith**: car.
- [Loud Bang Crashing Metal Chunk Dropped in Metal Dumpster](https://freesound.org/people/qubodup/sounds/859154/), by **qubodup**: car, bus.
- [Car Crash](https://freesound.org/people/squareal/sounds/237375/), by **squareal**: car.
- [S37-34 Big auto car crash with glass.wav](https://freesound.org/people/craigsmith/sounds/675901/), by **craigsmith**: bus.
- [Big falling debris (crash)](https://freesound.org/people/xkeril/sounds/703247/), by **xkeril**: bus, stack.
- [Explosion.wav](https://freesound.org/people/morganpurkis/sounds/397691/), by **morganpurkis**: stack, pancake.
- [road flare ignite burns.wav](https://freesound.org/people/frankelmedico/sounds/348767/), by **frankelmedico**: stack.
- [BROKEN CAR WINDOW.wav](https://freesound.org/people/thecommondanger/sounds/587928/), by **thecommondanger**: glass.
- [Glass Break 8](https://freesound.org/people/ElevatorFan2020/sounds/848289/), by **ElevatorFan2020**: glass.
- [Bending Metal](https://freesound.org/people/NachtmahrTV/sounds/556714/), by **NachtmahrTV**: groan.
- [Metal Clank (Medium)](https://freesound.org/people/Mish7913/sounds/741351/), by **Mish7913**: off.
- [Clank Car Crash Collision](https://freesound.org/people/qubodup/sounds/151624/), by **qubodup**: off.
- [car crash long 1](https://freesound.org/people/Logicogonist/sounds/807437/), by **Logicogonist**: pancake.
- [Medium Thud 1](https://freesound.org/people/sgrowe/sounds/342535/), by **sgrowe**: pancake.
- [Crowd gasp.wav](https://freesound.org/people/deleted_user_2104797/sounds/324895/), by **deleted_user_2104797**: ooh.
- [Group Ooh Aah](https://freesound.org/people/CHallSmith/sounds/870652/), by **CHallSmith**: ooh.

## Show Night sounds

Selected public HQ previews, all [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The recipes in
`tools/audio/build-bowl-sound.mjs` cut, re-pitch, filter, layer and level them into every other Show Night cue (the
weapons, walls, tricks, crowd, Big Mo's chime and the Scrapasaurus; mono Vorbis in `bowl/`, one take per cue). Source
and runtime hashes are in the audio catalog. No author endorsement is implied.

- [hydraulicdoorsnd.wav](https://freesound.org/people/Jedimichael/sounds/83887/), by **Jedimichael**: hammer.rise.
- [Anvil Hit 2](https://freesound.org/people/michorvath/sounds/270588/), by **michorvath**: hammer.hit.
- [Heavy Metal Impact](https://freesound.org/people/magnuswaker/sounds/614062/), by **magnuswaker**: hammer.hit.
- [Explosion.wav](https://freesound.org/people/morganpurkis/sounds/397691/), by **morganpurkis**: hammer.hit, knockout, rex.fall.
- [BODY FALL - V HVY - DIRT](https://freesound.org/people/leonelmail/sounds/504626/), by **leonelmail**: hammer.miss, trick.slam.
- [Heavy Metal Thud on Ground](https://freesound.org/people/7of9Designs/sounds/640204/), by **7of9Designs**: hammer.miss, trick.land.
- [Pneumatic angle grinder - Uryu uag50 - Start 1](https://freesound.org/people/ldezem/sounds/386230/), by **ldezem**: saw.spin.
- [Angle grinder - Hilti 230mm - Cutting steel](https://freesound.org/people/ldezem/sounds/386094/), by **ldezem**: saw.cut.
- [S37-14 Two cars crash foley; good metallic bump.wav](https://freesound.org/people/craigsmith/sounds/675466/), by **craigsmith**: saw.cut, wall.hard, rex.scorch.
- [Angle grinder - Fein 230mm - Stop 1 time](https://freesound.org/people/ldezem/sounds/386092/), by **ldezem**: saw.hot.
- [R19-39-Steam Hiss.wav](https://freesound.org/people/craigsmith/sounds/479296/), by **craigsmith**: saw.hot, rex.scorch, rex.sag.
- [Steam_trap_short_burst.wav](https://freesound.org/people/Engineer_815/sounds/520071/), by **Engineer_815**: launcher.tell.
- [Air compressor valve](https://freesound.org/people/soneproject/sounds/185515/), by **soneproject**: launcher.tell.
- [Air release](https://freesound.org/people/davidlay1/sounds/416080/), by **davidlay1**: launcher.fill.
- [air_blast_Large_1_4s.wav](https://freesound.org/people/typeoo/sounds/521493/), by **typeoo**: launcher.fire.
- [Cannon Fires, Take 1, Half Speed](https://freesound.org/people/CHallSmith/sounds/870741/), by **CHallSmith**: launcher.fire.
- [Industrial Air Horn](https://freesound.org/people/mcpable/sounds/131930/), by **mcpable**: rhino.horn, secret.armed, crush.fullhouse, race.finish, best.rival, night.open, event.won.
- [Big Block V8 Rev 2.mp3](https://freesound.org/people/Henaway/sounds/127981/), by **Henaway**: rhino.horn, trick.wheelie, best.rival.
- [Fireblast full.wav](https://freesound.org/people/cribbler/sounds/381856/), by **cribbler**: dragon.fire.
- [Box with Metal Latches Hit 2.wav](https://freesound.org/people/suspensiondigital/sounds/389705/), by **suspensiondigital**: weapon.pick.
- [Metal Clank (Medium)](https://freesound.org/people/Mish7913/sounds/741351/), by **Mish7913**: weapon.pick, health.hit.
- [S37-34 Big auto car crash with glass.wav](https://freesound.org/people/craigsmith/sounds/675901/), by **craigsmith**: knockout.
- [CRWDCele_Large Crowd, Unison Surprise, Cheering_ShaneVincent_GSC24_MSDEC-MKH435-Spirit.wav](https://freesound.org/people/ShangusBurger/sounds/764163/), by **ShangusBurger**: out.of.the.bowl, secret.found.
- [Medium Thud 1](https://freesound.org/people/sgrowe/sounds/342535/), by **sgrowe**: wall.bounce.
- [Tire.ogg](https://freesound.org/people/egomassive/sounds/536769/), by **egomassive**: wall.bounce, trick.cyclone.
- [Car Crash](https://freesound.org/people/squareal/sounds/237375/), by **squareal**: wall.big.
- [Loud Bang Crashing Metal Chunk Dropped in Metal Dumpster](https://freesound.org/people/qubodup/sounds/859154/), by **qubodup**: wall.big, rex.throw.land, rex.box.out.
- [long-metal-scrape-02.wav](https://freesound.org/people/newagesoup/sounds/337830/), by **newagesoup**: wall.scrape, rex.box.drag.
- [Clank Car Crash Collision](https://freesound.org/people/qubodup/sounds/151624/), by **qubodup**: trick.land, hook.jerk.
- [CRWDCheer_Short Affirmative Cheer_ShaneVincent_GSC24_MSDEC-MKH435-Spirit.wav](https://freesound.org/people/ShangusBurger/sounds/764165/), by **ShangusBurger**: trick.new, night.new.
- [Thin bell ding 4](https://freesound.org/people/Khrinx/sounds/333693/), by **Khrinx**: trick.new.
- [car crash long 1](https://freesound.org/people/Logicogonist/sounds/807437/), by **Logicogonist**: trick.slam.
- [BerlinGameScene.com Crowd Cheer 1](https://freesound.org/people/BerlinGameScene/sounds/267249/), by **BerlinGameScene**: trick.cyclone, long.clear.
- [Boomy Whoosh 1_1](https://freesound.org/people/Joao_Janz/sounds/485242/), by **Joao_Janz**: trick.go.
- [awwwww.mp3](https://freesound.org/people/WhisperPotato/sounds/547589/), by **WhisperPotato**: trick.late.
- [Jacobs Ladder Climbing Arc](https://freesound.org/people/Qvantor/sounds/881280/), by **Qvantor**: secret.start.
- [bell ding 2.wav](https://freesound.org/people/5ro4/sounds/611112/), by **5ro4**: secret.found, high.clear.
- [rodeo audio cheer distant](https://freesound.org/people/jayfrosting/sounds/728774/), by **jayfrosting**: secret.cheer, go.ready, night.open.
- [Thin bell ding 2](https://freesound.org/people/Khrinx/sounds/333695/), by **Khrinx**: secret.hint.
- [Klaxon on axis short.wav](https://freesound.org/people/jameswrowles/sounds/514980/), by **jameswrowles**: health.danger.
- [Paper Page Flip](https://freesound.org/people/OnlyOz/sounds/828802/), by **OnlyOz**: card.open.
- [Clicker 2](https://freesound.org/people/Dioram/sounds/844616/), by **Dioram**: school.tick.
- [Thin bell ding 3](https://freesound.org/people/Khrinx/sounds/333694/), by **Khrinx**: school.tick, crush.chain.
- [Referee whistle sound.wav](https://freesound.org/people/Rosa-Orenes256/sounds/538422/), by **Rosa-Orenes256**: school.next.
- [Soft-Notifications - Bell - LowDing.mp3](https://freesound.org/people/LegitCheese/sounds/571511/), by **LegitCheese**: school.why.
- [CROWDS-APPLAUSE_CheeringApplause_Zoway_DamAct](https://freesound.org/people/zoway.sound/sounds/875590/), by **zoway.sound**: school.done.
- [BerlinGameScene.com Crowd Cheer 4](https://freesound.org/people/BerlinGameScene/sounds/267246/), by **BerlinGameScene**: crush.fullhouse, event.won.
- [CRWDReac_Crowd Gasping In Surprise, Quick 03_ShaneVincent_GSC24_MSDEC-MKH435-Spirit.wav](https://freesound.org/people/ShangusBurger/sounds/764204/), by **ShangusBurger**: out.over.
- [Crowd Scream sound effect](https://freesound.org/people/Mastersoundboy2005/sounds/730129/), by **Mastersoundboy2005**: out.stands.
- [Fall debris (crash)](https://freesound.org/people/xkeril/sounds/703248/), by **xkeril**: out.stands.
- [Boomy Whoosh 1_3](https://freesound.org/people/Joao_Janz/sounds/485240/), by **Joao_Janz**: out.leap, rex.throw.
- [CRWDReac_Crowd Gasping In Surprise, Voiced 01_ShaneVincent_GSC24_FUMA-AmbeoVR.wav](https://freesound.org/people/ShangusBurger/sounds/764101/), by **ShangusBurger**: out.leap.
- [Metal gate closing.WAV](https://freesound.org/people/thomasanthony321/sounds/682775/), by **thomasanthony321**: out.gate, rex.burst.
- [rodeo audio cheer close](https://freesound.org/people/jayfrosting/sounds/728773/), by **jayfrosting**: out.back, high.clear.
- [Countdown for race, game start](https://freesound.org/people/Pastew/sounds/813525/), by **Pastew**: race.lights.
- [BerlinGameScene.com Crowd Cheer 2](https://freesound.org/people/BerlinGameScene/sounds/267248/), by **BerlinGameScene**: race.finish.
- [Big robot footstep 003](https://freesound.org/people/AudioPapkin/sounds/813054/), by **AudioPapkin**: rival.jump, rex.rise, hook.jerk.
- [Big robot footstep 004](https://freesound.org/people/AudioPapkin/sounds/813055/), by **AudioPapkin**: rival.jump.fallback, rex.brace.
- [cloverfield roar.wav](https://freesound.org/people/icyjim/sounds/476083/), by **icyjim**: rex.roar, rex.fall.
- [Flamethrower_Weapon_Long_Bursts.wav](https://freesound.org/people/AslakHostaker/sounds/395039/), by **AslakHostaker**: rex.fire.
- [Blast + Flamethrower cooldown](https://freesound.org/people/Breviceps/sounds/447941/), by **Breviceps**: rex.fire.end.
- [Fireblast med.wav](https://freesound.org/people/cribbler/sounds/381855/), by **cribbler**: rex.scorch.
- [Tesla Coil Arc](https://freesound.org/people/Qvantor/sounds/881275/), by **Qvantor**: rex.box.open.
- [Big robot footstep](https://freesound.org/people/AudioPapkin/sounds/813056/), by **AudioPapkin**: rex.bump.
- [Bending Metal](https://freesound.org/people/NachtmahrTV/sounds/556714/), by **NachtmahrTV**: rex.lift, rex.brace, hook.tight.
- [S37-04 Car hits three news stands; good crunch.wav](https://freesound.org/people/craigsmith/sounds/675910/), by **craigsmith**: rex.throw.land, best.rival.slam.
- [Dragon: Snarl, Roar + Attack](https://freesound.org/people/Breviceps/sounds/466830/), by **Breviceps**: rex.burst.
- [Scary Monster Roar #2](https://freesound.org/people/NicknameLarry/sounds/489901/), by **NicknameLarry**: rex.sag.
- [Monster Short Roar.wav](https://freesound.org/people/ecfike/sounds/132874/), by **ecfike**: rex.rise.
- [Basic Fire Whoosh 2](https://freesound.org/people/LookIMadeAThing/sounds/260555/), by **LookIMadeAThing**: rex.sweep.
- [air_blast_mechanism_small_1_0s.wav](https://freesound.org/people/typeoo/sounds/521490/), by **typeoo**: hook.fire.
- [door lock slide chain rattle.flac](https://freesound.org/people/kyles/sounds/453961/), by **kyles**: hook.fire, hook.jerk.
- [metallic - metal pipe - gate made of metal pipes - single hit 01.wav](https://freesound.org/people/Anthousai/sounds/399247/), by **Anthousai**: hook.bite.
- [hit - metallic - metal gate.wav](https://freesound.org/people/Anthousai/sounds/406557/), by **Anthousai**: hook.clang.
- [vg_chainlift.wav](https://freesound.org/people/Mihacappy/sounds/829013/), by **Mihacappy**: hook.tight, hook.letgo.
- [Lightning Gun Shot](https://freesound.org/people/Qvantor/sounds/881279/), by **Qvantor**: rex.box.out.
- [Electricity](https://freesound.org/people/FlashTrauma/sounds/398274/), by **FlashTrauma**: rex.box.out.
- [Big falling debris (crash)](https://freesound.org/people/xkeril/sounds/703247/), by **xkeril**: rex.fall.
- [Big robot footstep 005](https://freesound.org/people/AudioPapkin/sounds/815039/), by **AudioPapkin**: rex.gate.
- [Monster Long Roar 1.wav](https://freesound.org/people/ecfike/sounds/132866/), by **ecfike**: rex.gate.
- [Perc_WhistleRef_lo](https://freesound.org/people/LudwigMueller/sounds/548549/), by **LudwigMueller**: go.ready.
- [aww.wav](https://freesound.org/people/phmiller42/sounds/124996/), by **phmiller42**: high.fail.
- [CROWDS-APPLAUSE_CheeringApplauseShort _Zoway_DamAct](https://freesound.org/people/zoway.sound/sounds/875589/), by **zoway.sound**: best.round.won.
- [CRWDAngr_Crowd Groans At Bad Joke 01_ShaneVincent_GSC24_SpacedOmni-MK012.wav](https://freesound.org/people/ShangusBurger/sounds/764253/), by **ShangusBurger**: best.round.lost.
- [bell ding 3.wav](https://freesound.org/people/5ro4/sounds/611111/), by **5ro4**: night.new.
- [ding-dong-beep-sound-small-speaker](https://freesound.org/people/ShJafari/sounds/747200/), by **ShJafari**: mo.
- [CRWDReac_Excitement Build Up, Let Down_ShaneVincent_GSC24_MSDEC-MKH435-Spirit.wav](https://freesound.org/people/ShangusBurger/sounds/764216/), by **ShangusBurger**: crowd.rise.
- [crowd `oh - - disappointed.mp3](https://freesound.org/people/mrrap4food/sounds/619007/), by **mrrap4food**: event.lost.
- [Coin Drop - 2](https://freesound.org/people/SpaceJoe/sounds/485718/), by **SpaceJoe**: purse.
- [cash drawer and receipt.wav](https://freesound.org/people/kalisemorrison/sounds/202531/), by **kalisemorrison**: purse.
- [A320 Double Chime.wav](https://freesound.org/people/JOHNNYFIVE/sounds/457922/), by **JOHNNYFIVE**: turn.up.
- [Small Auditorium Crowd Applause and Cheering](https://freesound.org/people/ElevatorFan2020/sounds/859009/), by **ElevatorFan2020**: turn.winner.
- [bell ding 1.wav](https://freesound.org/people/5ro4/sounds/611113/), by **5ro4**: turn.winner.
