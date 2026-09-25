import { randomInt } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { saveVerdict } from './verdicts.mjs';

export function verdictMiddleware({ folder } = {}) {
  return (req, res, next) => {
    if (req.url !== '/__audio/verdict') return next();
    const respond = (status, data) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    if (req.method !== 'POST')
      return respond(405, { error: 'Use the booth review form.' });
    const host = req.headers.host || '';
    if (
      !/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
      req.headers.origin !== 'http://' + host
    )
      return respond(403, {
        error: 'Reviews must come from this local booth.',
      });
    if (req.headers['content-type'] !== 'application/json')
      return respond(415, { error: 'Expected JSON.' });
    (async () => {
      let length = 0;
      const chunks = [];
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 32768) throw Error('Review is too large.');
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const saved = await saveVerdict(input, folder);
      respond(201, { file: saved.file });
    })().catch((error) =>
      respond(400, {
        error:
          error instanceof SyntaxError ? 'Invalid review JSON.' : error.message,
      }),
    );
  };
}

export async function startBooth({
  port = randomInt(5191, 64000),
  folder,
} = {}) {
  if (!Number.isInteger(port) || port < 5191 || port > 65535)
    throw Error('Choose a private port from 5191 to 65535.');
  const { createServer } = await import('vite');
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    configFile: false,
    define: { __DUEL_QA__: 'true' },
    server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'local-audio-verdicts',
        configureServer(vite) {
          vite.middlewares.use(verdictMiddleware({ folder }));
        },
      },
    ],
  });
  await server.listen();
  return { server, url: `http://127.0.0.1:${port}/tools/audio/listening.html` };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { server, url } = await startBooth(
    process.argv[2] ? { port: Number(process.argv[2]) } : {},
  );
  console.log('Listening booth: ' + url);
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, async () => {
      await server.close();
      process.exit(0);
    });
}
