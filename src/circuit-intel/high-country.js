// Engineer notes for High Country Grand Tour (Claude's finishing pass, P4-FINISH-TEAMROOM). This road is fast:
// the reference car barely lifts on any route, so only the tunnel bend on route C gets a corner flag, and the
// signature view and the passing zone carry the notes. Each route has its own. The tunnel is in the course.
// No brake boards stand on this road.
const SUMMIT_CREST = {line: 'Stay straight and settled over the top.',
  note: 'The summit crest, 35 metres from the tunnel mouth. Be settled before the road goes underground.'};

export const HIGH_COUNTRY_INTEL = Object.freeze({
  routes: {
    route_a: {
      flags: [
        {id: 'signature', kind: 'signature', s: 2135, title: 'Alpine Summit crest'},
        {id: 'overtaking', kind: 'overtaking', s: 3865, title: 'Coastal Descent straight'},
      ],
      notes: {
        signature: SUMMIT_CREST,
        overtaking: {line: 'Get a clean exit, stay flat out and pull out of their slipstream early.',
          note: 'The long straight in the Coastal Descent section, about 520 metres. Nothing on it needs braking, so a pass is won on exit speed and the slipstream.'},
      },
    },
    route_b: {
      flags: [
        {id: 'signature', kind: 'signature', s: 2135, title: 'Alpine Summit crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1130, title: 'Canyon Ascent straight'},
      ],
      notes: {
        signature: SUMMIT_CREST,
        overtaking: {line: 'Get a clean exit, stay flat out and pull out of their slipstream early.',
          note: 'The longest straight on the lap, about 660 metres, before the climb begins. Nothing on it needs braking, so a pass is won on exit speed and the slipstream.'},
      },
    },
    route_c: {
      flags: [
        {id: 'c1', kind: 'corner', s: 2350, title: 'Corner 1'},
        {id: 'signature', kind: 'signature', s: 2135, title: 'Alpine Summit crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1695, title: 'Climbing straight'},
      ],
      notes: {
        c1: {line: 'Keep to the left in the tunnel, lift a little and aim for the inside of the right-hander as you come out.',
          note: 'The bend starts only 28 metres after you leave the tunnel, so slow down and settle the car before you go in.'},
        signature: SUMMIT_CREST,
        overtaking: {line: 'Keep the throttle on and pull out of their slipstream early.',
          note: 'The longest straight on the lap, about 700 metres, and it climbs towards the summit. Nothing on it needs braking, so a pass is won on exit speed and the slipstream.'},
      },
    },
  },
});
