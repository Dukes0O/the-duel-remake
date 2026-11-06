const THOUGHTS_BY_SEASON = Object.freeze({
  Spring: Object.freeze([
    'The wind smells clean after the rain.', 'I saw green shoots by the road.',
    'The well sounds full this morning.', 'A little shade will help the seedlings.',
    'The dust has settled for a while.', 'Someone mended the gate last night.',
    'The creek bed has water in it again.', 'I found a quiet place to sit.',
    'The days are growing longer.', 'A new family came down the road.',
    'The yard is busy before breakfast.', 'I heard a bird above the Dome.',
    'Fresh paint makes the old wall look new.', 'The morning air is cool and kind.',
    'The children are chasing a hoop.', 'I can smell bread from the kitchen.',
    'The road is easier to walk today.', 'My neighbour saved me a seat.',
    'We have enough water for the garden.', 'The clouds are moving east.',
  ]),
  Summer: Object.freeze([
    'The shade is worth more than a coin.', 'I filled my bottle before noon.',
    'The well rope feels warm in my hands.', 'A slow walk is best in this heat.',
    'The tin roof sings in the sun.', 'I watered the beans at first light.',
    'The evening breeze will come soon.', 'The children found shade by the wall.',
    'I am glad the pump is working.', 'The road shimmered all afternoon.',
    'We should keep water close today.', 'The sun has bleached the old sign.',
    'The cool room is busy tonight.', 'I saved a little shade for my neighbour.',
    'The garden needs another bucket.', 'The stars look sharp in the dry air.',
    'I can hear the generator from here.', 'A damp cloth helped with the heat.',
    'The supper tastes good after a hot day.', 'The night is finally cooling down.',
  ]),
  Autumn: Object.freeze([
    'The evenings are getting shorter.', 'I packed away the light canvas.',
    'The harvest looks better than last year.', 'The road is quiet after sunset.',
    'The wind carried a smell of smoke.', 'I fixed a loose board before lunch.',
    'The leaves caught in the fence again.', 'A warm meal makes a long day easier.',
    'I saw the first cool clouds today.', 'The well bucket needs a new knot.',
    'We stacked the timber under cover.', 'The market stayed busy until dusk.',
    'The sky turned red beyond the Ridge.', 'I will mend my coat this week.',
    'The children are learning their letters.', 'The lamps came on early tonight.',
    'The garden is ready for a rest.', 'My family shared the last ripe melon.',
    'The air feels cool after the heat.', 'I heard music from the square.',
  ]),
  Winter: Object.freeze([
    'The blanket held the warmth all night.', 'I am glad the roof has no gaps.',
    'The morning water is very cold.', 'We brought the tools inside before dark.',
    'The fire is small but steady.', 'The children made tracks in the dust.',
    'A warm cup makes this morning better.', 'The wind found the crack by the door.',
    'I checked on the older folk today.', 'The sun felt good on the wall.',
    'The road is quiet under the grey sky.', 'We saved enough wood for tonight.',
    'The kitchen is warm and busy.', 'I heard the gate chains in the wind.',
    'The stars came out between the clouds.', 'My neighbour shared a thick scarf.',
    'The pump needs a little care in the cold.', 'The days will grow longer soon.',
    'I am glad we are here together.', 'The soup warmed me after the walk.',
  ]),
});

export const TOWN_THOUGHTS = Object.freeze(Object.values(THOUGHTS_BY_SEASON).flat());
export const TOWN_SEASON_THOUGHTS = THOUGHTS_BY_SEASON;

export function townThoughtFor(id, season, month) {
  const thoughts = THOUGHTS_BY_SEASON[season] || THOUGHTS_BY_SEASON.Spring;
  let hash = 2166136261;
  for (const character of String(id)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return thoughts[(hash + month) % thoughts.length];
}
