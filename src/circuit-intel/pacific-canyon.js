// Engineer notes for Pacific Canyon Circuit (Claude's finishing pass, P4-FINISH-TEAMROOM). The three routes bend
// differently, so each route carries its own flags and notes. Corners keep their lap numbers; only the corners
// that ask for a lift get a flag. Target speeds and gears come from each route's reference lap. No brake boards
// stand on this road.
export const PACIFIC_CANYON_INTEL = Object.freeze({
  routes: {
    route_a: {
      flags: [
        {id: 'c1', kind: 'corner', s: 0, title: 'Corner 1'},
        {id: 'c2', kind: 'corner', s: 2085, title: 'Corner 2'},
        {id: 'signature', kind: 'signature', s: 1520, title: 'Mojave Canyon crest'},
        {id: 'overtaking', kind: 'overtaking', s: 3140, title: 'Pacific Coast straight'},
      ],
      notes: {
        c1: {line: 'Wide on entry, apex on the right at the start line, and let the car drift out on the exit.',
          note: 'A long, quick right-hander that crosses the start line. It needs only a small lift, so smooth hands matter more than brakes.'},
        c2: {line: 'Wide on entry, late apex on the right, and early throttle.',
          note: 'Where the canyon meets the coast and the road levels out after the descent. The exit sets your speed along the Pacific Coast straight.'},
        signature: {line: 'Keep the car straight and in the middle of the road over the top.',
          note: 'Near the highest point of the lap. The road falls away on the far side and Corner 2 is a quick right at the bottom, so settle the car before you steer.'},
        overtaking: {line: 'Get a clean exit from Corner 2, stay flat and pull out of their slipstream early.',
          note: 'The long straight along the Pacific Coast, about 620 metres. The road is wider as you come into it, which gives room for two cars.'},
      },
    },
    route_b: {
      flags: [
        {id: 'c1', kind: 'corner', s: 1900, title: 'Corner 1'},
        {id: 'signature', kind: 'signature', s: 1520, title: 'Mojave Canyon crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1425, title: 'Canyon straight'},
      ],
      notes: {
        c1: {line: 'Brake in a straight line on the way down, turn in late and aim for the inside of the right-hander.',
          note: 'The road falls away into this corner, so you arrive faster than it feels. Finish your braking before you turn in.'},
        signature: {line: 'Keep the car straight and in the middle of the road over the top.',
          note: 'The second crest at the end of the long straight. Braking for Corner 1 starts just beyond it, so land straight and brake in a straight line.'},
        overtaking: {line: 'Stay flat out, tuck in behind them and pull out early.',
          note: 'The longest straight on the lap, about a kilometre. Two crests and the braking for Corner 1 follow, so make your move early.'},
      },
    },
    route_c: {
      flags: [
        {id: 'c1', kind: 'corner', s: 1965, title: 'Corner 1'},
        {id: 'signature', kind: 'signature', s: 1465, title: 'Mojave Canyon crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1490, title: 'Canyon straight'},
      ],
      notes: {
        c1: {line: 'Brake in a straight line on the way down, turn in late and aim for the inside of the right-hander.',
          note: 'The road falls away into this corner, so you arrive faster than it feels. Finish your braking before you turn in.'},
        signature: {line: 'Keep the car straight and in the middle of the road over the top.',
          note: 'The top of the hill at the end of the long straight. Braking for Corner 1 starts 155 metres beyond it, so land straight and brake in a straight line.'},
        overtaking: {line: 'Stay flat out, tuck in behind them and pull out early.',
          note: 'The longest straight on the lap, about 810 metres, ending at the top of the hill. Make your move before the crest.'},
      },
    },
  },
});
