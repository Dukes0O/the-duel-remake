// Stamp a staged line. Claude completes the packet before making stages ready.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseBoard } from './board.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const LINES = {
  course: { prefix: 'C', folder: 'docs/courses', needs: [[], [], [2], [1], [2, 4], [3, 5], [6]],
    lanes: ['ART', 'SIM', 'SIM', 'ART', 'ART', 'FINISH', 'OPS'], claude: [6, 7] },
  car: { prefix: 'V', folder: 'docs/cars', needs: [[], [1], [2], [], [], [3, 4, 5], [6]],
    lanes: ['ART', 'ART', 'ART', 'SIM', 'AUDIO', 'UI', 'OPS'], claude: [7] },
};

export function stampLine(args, { root = ROOT, log = console.log } = {}) {
  const flags = new Set(args.filter(arg => arg.startsWith('--')));
  const positional = args.filter(arg => !arg.startsWith('--'));
  const [kind, id, name] = positional;
  if (positional.length !== 3 || !LINES[kind] || !name?.trim()
    || [...flags].some(flag => !['--ready', '--dry-run'].includes(flag))) {
    throw Error('Usage: node tools/new-line-cards.mjs course|car <id> "<Name>" [--ready] [--dry-run]');
  }
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(id)) throw Error('Id must use lower-case words separated by hyphens.');
  if (/^(con|prn|aux|nul)$/.test(id)) throw Error('Id must not be a reserved Windows filename.');
  if (/[\r\n]/.test(name)) throw Error('Name must fit on one line.');

  const line = LINES[kind];
  const packet = `${line.folder}/${id}.md`;
  const boardPath = resolve(root, 'docs/board/board.yaml');
  const boardText = readFileSync(boardPath, 'utf8');
  const board = parseBoard(boardText);
  const known = new Set([...board.map(card => card.id), ...board.completed]);
  const factory = readFileSync(resolve(root, 'docs/FACTORY.md'), 'utf8');
  const stageId = stage => `${id.toUpperCase()}-${line.prefix}${stage}`;
  const stages = line.needs.map((needs, index) => {
    const number = index + 1, stage = `${line.prefix}${number}`, cardId = stageId(number);
    const row = factory.split(/\r?\n/).find(text => text.startsWith(`| ${stage} `));
    if (!row) throw Error(`FACTORY gate missing for ${stage}.`);
    const [, label, gate, judge] = row.split('|').map(cell => cell.trim());
    const details = `docs/board/cards/${cardId}.md`;
    if (known.has(cardId) || existsSync(resolve(root, details))) throw Error(`Card already exists: ${cardId}`);
    return { id: cardId, title: `${name}: ${label}`, owner: line.claude.includes(number) ? 'claude' : 'codex',
      lane: line.lanes[index], size: number === 1 || number === 7 ? 'S' : 'M',
      status: flags.has('--ready') && needs.length === 0 ? 'ready' : 'backlog',
      needs: needs.map(stageId), locks: number === 7 ? ['release'] : [], details,
      label, gate: gate.replaceAll('<id>', id), judge, number };
  });
  const entries = stages.map(card => [
    `  - id: ${card.id}`,
    ...['title', 'owner', 'lane', 'size', 'status'].map(key => `    ${key}: ${JSON.stringify(card[key])}`),
    `    needs: [${card.needs.join(', ')}]`, `    locks: [${card.locks.join(', ')}]`,
    `    details: ${JSON.stringify(card.details)}`,
  ].join('\n')).join('\n\n');
  const writes = stages.map(card => {
    const children = stages.filter(next => next.needs.includes(card.id)).map(next => next.id);
    return [card.details, `# ${card.id}: ${name}, ${card.label}\n\n`
      + `Owner: ${card.owner}. Lane: ${card.lane}.\n\n## Prerequisites and graph\n\n`
      + `Claude must complete and approve [the packet](../../${line.folder.slice(5)}/${id}.md) before this stage starts.\n\n`
      + `Needs: ${card.needs.join(', ') || `approved packet (${line.prefix}0)`}.\n`
      + `Next: ${children.join(', ') || 'line complete'}.\n\n`
      + `See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).\n\n`
      + `## Done when\n\n${card.gate}\n\nJudge: ${card.judge}.\n\n`
      + '## Files, locks and checks\n\n'
      + 'Before building, copy owned files, contracts, locks and one to three checks from the approved packet.\n'
      + 'Record any browser, look or frame checks needed. Follow the current lane and release gates.\n'
      + 'New events must name their sound cue.\n'];
  });
  if (!existsSync(resolve(root, packet))) {
    const checklist = factory.match(/## 6\. The packet checklist\r?\n([\s\S]*?)(?=\r?\n## 7\.)/)?.[1];
    const headings = [...(checklist || '').matchAll(/^(\d+)\. ([\s\S]*?)(?=\r?\n\d+\. |\r?\n\r?\n|(?![\s\S]))/gm)]
      .map(match => `## ${match[1]}. ${match[2].replace(/\s+/g, ' ').trim()}`);
    if (headings.length !== 10) throw Error('FACTORY section 6 must contain ten packet checklist items.');
    writes.push([packet, `# ${name}\n\nStatus: draft. Claude must answer this checklist before any stage starts.\n\n`
      + headings.join('\n\n') + '\n']);
  }
  writes.push(['docs/board/board.yaml', boardText.trimEnd() + '\n\n' + entries + '\n']);
  if (flags.has('--dry-run')) {
    log(`Would add these board entries:\n${entries}`);
    for (const [path, content] of writes.filter(([path]) => path !== 'docs/board/board.yaml')) log(`Would create ${path}:\n${content}`);
    if (existsSync(resolve(root, packet))) log(`Keep existing packet ${packet}`);
  } else {
    for (const [path, content] of writes) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true });
      writeFileSync(resolve(root, path), content, 'utf8');
    }
    log(`Added ${stages.map(card => card.id).join(', ')}. Packet: ${packet}`);
  }
  return stages;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { stampLine(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
