// Local editing server, no dependencies. It serves the site and lets the page save brews.json.
// Run `npm start`, log brews, then push to GitHub to publish. The public site is read-only.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = process.env.PORT || 8080;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (req.method === 'PUT' && pathname === '/brews.json') {
    // Only accept saves addressed to this machine (blocks DNS-rebinding tricks).
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host)) return res.writeHead(403).end();
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const brews = JSON.parse(body);
        if (!Array.isArray(brews)) throw new Error('Expected an array of brews');
        fs.writeFileSync(path.join(root, 'brews.json'), JSON.stringify(brews, null, 2) + '\n');
        res.writeHead(204).end();
      } catch (err) {
        res.writeHead(400).end(err.message);
      }
    });
    return;
  }

  const file = path.join(root, pathname === '/' ? 'index.html' : decodeURIComponent(pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Coffee Journal → http://localhost:${port}`));
