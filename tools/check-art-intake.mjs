import { fileURLToPath } from 'node:url';
import { checkArtIntake } from './art-intake.mjs';

if (process.argv.slice(2).some(arg => arg !== '--check')) throw Error('Usage: node tools/check-art-intake.mjs [--check]');
const root = fileURLToPath(new URL('../', import.meta.url));
const report = checkArtIntake({ root });
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
