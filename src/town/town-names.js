const GIVEN_NAMES = Object.freeze([
  'Ari', 'Bess', 'Cal', 'Dara', 'Eli', 'Fern', 'Gus', 'Hana', 'Ira', 'June',
  'Kito', 'Lena', 'Moss', 'Nell', 'Oren', 'Pia', 'Quin', 'Rae', 'Sal', 'Tavi',
  'Uma', 'Vale', 'Wes', 'Yara', 'Zed', 'Alma', 'Bo', 'Cora', 'Dune', 'Esme',
  'Fenn', 'Greer', 'Hollis', 'Imani', 'Jory', 'Kestrel', 'Lark', 'Mina', 'Noor', 'Orla',
]);

const FAMILY_NAMES = Object.freeze([
  'Ash', 'Bell', 'Cairn', 'Dale', 'Ember', 'Flint', 'Gale', 'Hearth',
  'Iron', 'Juniper', 'Keel', 'Loom', 'Marlow', 'North', 'Pike', 'Quarry',
  'Reed', 'Stone', 'Tide', 'Vale', 'Wells', 'Yard', 'Zinc', 'Ridge',
]);

export function townPersonName(rng) {
  return `${rng.pick(GIVEN_NAMES)} ${rng.pick(FAMILY_NAMES)}`;
}

export function townFamilyName(_rng, index) {
  const value = BigInt(index);
  return `${FAMILY_NAMES[Number(value % BigInt(FAMILY_NAMES.length))]}-${value + 1n}`;
}
