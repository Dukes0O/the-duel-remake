import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const MAX_REVIEW_BYTES = 500_000;

export async function writeReviewJpegBytes(bytes, family, round, root = PROJECT_ROOT) {
  if (!Buffer.isBuffer(bytes)) throw Error('Review sheet must be JPEG bytes.');
  if (!/^[a-z][a-z0-9-]*$/.test(family) || !Number.isInteger(round) || round < 1)
    throw Error('Review sheet needs a simple family and positive round.');
  if (bytes.length > MAX_REVIEW_BYTES) throw Error(`Review sheet exceeds ${MAX_REVIEW_BYTES} bytes.`);
  const folder = join(root, 'docs', 'board', 'looks', family);
  const target = join(folder, `round-${round}.jpg`);
  await mkdir(folder, { recursive: true });
  await writeFile(target, bytes, { flag: 'wx' });
  return target;
}

export async function publishReviewSheet(context, rawSheetPath, family, round) {
  if (process.env.DUEL_PUBLISH_REVIEW === '0') return null;
  const png = await readFile(rawSheetPath);
  const source = `data:image/png;base64,${png.toString('base64')}`;
  const jpegBase64 = await context.evaluate(`(async()=>{
    const image=new Image();image.src=${JSON.stringify(source)};await image.decode();
    for(let scale=1;scale>=.25;scale*=.8){
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.width*scale));
      canvas.height=Math.max(1,Math.round(image.height*scale));
      const brush=canvas.getContext('2d');
      brush.fillStyle='#fff';brush.fillRect(0,0,canvas.width,canvas.height);
      brush.drawImage(image,0,0,canvas.width,canvas.height);
      for(const quality of [.82,.68,.54,.4,.28]){
        const encoded=canvas.toDataURL('image/jpeg',quality).split(',')[1];
        if(Math.floor(encoded.length*3/4)<=${MAX_REVIEW_BYTES})return encoded;
      }
    }
    throw Error('Review sheet could not fit under ${MAX_REVIEW_BYTES} bytes');
  })()`);
  return writeReviewJpegBytes(Buffer.from(jpegBase64, 'base64'), family, round);
}
