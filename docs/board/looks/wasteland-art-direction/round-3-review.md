# Big Bess on the laptop

Claude reviewed PR #45 at `030a640a9f685e301fc0b43d9c68ecfc04355e14`. On the 1,536 × 864 laptop screen the image ran from y = 314 to y = 1,117. The lower part of the vehicle, its caption and the three measurements required scrolling.

The register now lays out its title, view controls, source caption and specifications before it sizes the 16:9 picture. It uses the remaining space in both directions and keeps the full authored picture area for each of the three choices. The phone-specific layout has been removed. [Captured laptop views](round-3.jpg)

Open `tools/art/wasteland-direction/plate.html` from the checkout at 100% browser zoom. Tab to Illustration, use Right for Cab detail and Gate approach, then Left to return. All six captures show the selected label with native keyboard focus. The checks also exercised arrow-key wraparound, Up and Down, tabbing out and returning to the selected choice with Shift+Tab.

| Chromium viewport | Picture top–bottom | Caption bottom | Measurements bottom | Page height |
| --- | ---: | ---: | ---: | ---: |
| 1,536 × 864 | 203.6–728.5 px | 766.5 px | 831.6 px | 864 px |
| 1,280 × 720 | 184.5–587.4 px | 625.4 px | 688.0 px | 720 px |

Chromium 156.0.8078.79 loaded the checkout and regenerated standalone register from loopback and measured the same bounds for every choice. Captions used 14 px type, with 30 px measurements at 1,536 × 864 and 25.6 px measurements at 1,280 × 720. The source rectangles in the retained sheets were 1,600 × 900 pixels for Illustration and 752 × 423 pixels for Cab detail and Gate approach. The tested HTML is Git blob `ea7a80be09c53d99cf54fa852e67fe9993352031`. Full-size captures and DOM measurements are in the local evidence directory. The laptop has the final readability check.
