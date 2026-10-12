import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export const previewCircuitFlags=()=>CIRCUIT_MANIFESTS.map(row=>row.flag);
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  console.log(previewCircuitFlags().join(','));
