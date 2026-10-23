// Minimal static server for the preview. Run: node core/tools/serve.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';

const root = fileURLToPath(new URL('../..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (path.includes('..')) return res.writeHead(403).end();
  try {
    const file = join(root, path.endsWith('/') ? path + 'web/dist/index.html' : path);
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'text/plain' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(process.env.PORT || 5173, () => console.log('preview server up'));
