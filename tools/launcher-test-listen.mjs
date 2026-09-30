import {randomInt} from 'node:crypto';

// Disposable localhost sockets for launcher tests. Windows can reserve an
// otherwise unused port; a denied bind is retried like an occupied one.
export async function listenPrivate(server, {pickPort = () => randomInt(5200, 62000)} = {}) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const port = pickPort();
    try {
      await new Promise((resolve, reject) => {
        const failed = error => {
          server.off('error', failed);
          reject(error);
        };
        server.once('error', failed);
        try {
          server.listen(port, 'localhost', () => {
            server.off('error', failed);
            resolve();
          });
        } catch (error) {
          failed(error);
        }
      });
      return port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' && error.code !== 'EACCES') throw error;
    }
  }
  throw new Error('No private launcher test port was available');
}
