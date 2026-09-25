import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = new URL(
  '../../audio-src/voices/gatekeeper-welcome.mp3',
  import.meta.url,
);
const target = new URL(
  '../../public/assets/audio/gatekeeper-welcome.mp3',
  import.meta.url,
);
const bytes = readFileSync(source);
const hash = createHash('sha256').update(bytes).digest('hex');
if (hash !== '5772399d1112b33edc845e5253417afd4d55ca1898fcb54f8901899a4eb96106')
  throw Error(
    'Kept Callum source checksum changed; do not replace the approved take.',
  );
writeFileSync(target, bytes);
console.log(
  `Kept Callum take copied exactly: ${bytes.length} bytes, SHA-256 ${hash}.`,
);
