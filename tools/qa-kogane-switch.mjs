// Import this first. Kogane Pass is behind its dev switch, so a test that drives the Kogane lesson row turns the QA switch on
// before the course list is built (the list is fixed when src/config.js first loads).
Object.defineProperty(globalThis, '__DUEL_QA__', {configurable: true, value: true});
Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '?flags=kogane-pass'}});
