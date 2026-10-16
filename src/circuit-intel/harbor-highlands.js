// Engineer notes for Harbor & Highlands (Claude's finishing pass, P4-FINISH-TEAMROOM). On every route the one
// corner that asks for a lift is the right-hander at the top of Moonlight Pass, and it sits at the tunnel.
// Each route has its own flags and notes. No brake boards stand on this road.
const TUNNEL_BEND = {line: 'Brake on the climb before the tunnel, keep to the left on the way in and take a late apex on the right.',
  note: 'A right-hander at the top of Moonlight Pass, at the tunnel. The road falls away steeply after the tunnel, so get the car straight before you leave it.'};
const SUMMIT = {line: 'Stay straight and settled over the top.',
  note: 'The crest at the top of Moonlight Pass. The tunnel starts 35 metres further on, with Corner 2 at it, so do your braking on the climb, before the crest.'};
const straight = metres => ({line: 'Stay flat out down the straight and pull out of their slipstream before the road starts to climb.',
  note: `The longest straight on the lap, about ${metres} metres, ending at the foot of Moonlight Pass. The next braking is Corner 2 on the climb, so make your move here.`});

export const HARBOR_HIGHLANDS_INTEL = Object.freeze({
  routes: {
    route_a: {
      flags: [
        {id: 'c2', kind: 'corner', s: 2195, title: 'Corner 2'},
        {id: 'signature', kind: 'signature', s: 2095, title: 'Moonlight Pass crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1500, title: 'Harbor straight'},
      ],
      notes: {c2: TUNNEL_BEND, signature: SUMMIT, overtaking: straight(715)},
    },
    route_b: {
      flags: [
        {id: 'c2', kind: 'corner', s: 2185, title: 'Corner 2'},
        {id: 'signature', kind: 'signature', s: 2095, title: 'Moonlight Pass crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1480, title: 'Harbor straight'},
      ],
      notes: {c2: TUNNEL_BEND, signature: SUMMIT, overtaking: straight(745)},
    },
    route_c: {
      flags: [
        {id: 'c2', kind: 'corner', s: 2145, title: 'Corner 2'},
        {id: 'signature', kind: 'signature', s: 2095, title: 'Moonlight Pass crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1315, title: 'Harbor straight'},
      ],
      notes: {
        c2: {...TUNNEL_BEND, note: 'A right-hander at the top of Moonlight Pass that starts almost at the tunnel mouth. The road falls away steeply after the tunnel, so get the car straight before you leave it.'},
        signature: SUMMIT,
        overtaking: straight(725),
      },
    },
  },
});
