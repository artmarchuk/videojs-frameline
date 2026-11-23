// A static server for stale-chunk-reload.js: it serves dist/ as production does, and can "deploy" on request.
//
//   node scripts/browser-checks/fixtures/deploy-server.mjs [dist folder] [port]     (default dist, 4179)
//
// It answers like the host: `Cache-Control: public, max-age=0, must-revalidate`, an ETag, 304 for a matching
// `If-None-Match`, and 404 for a file that does not exist. The next port (4180) serves one plain page, as "another
// site" to leave to and come back from.
//
// GET /__deploy?build=1   the build as it is on disk.
// GET /__deploy?build=2   a new deploy made from the same files: every file in assets/ gets a new name
//                         (`studio-AbCd.js` becomes `studio-AbCd.v2.js`) and every reference to it is rewritten.
//                         The names of build 1 answer 404, as the names of a replaced deploy do.
// GET /__deploy?build=gone  build 1's pages, but its lazily loaded chunks (runtime, studio, debug) answer 404 and
//                         stay that way: a reload cannot help, so the page must not reload more than once.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4179);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const assets = readdirSync(join(dist, 'assets'));
const renamed = (name) => name.replace(/(\.[a-z0-9]+)$/, '.v2$1');
const original = new Map(assets.map((name) => [renamed(name), name]));
const isText = (file) => ['.html', '.js', '.css'].includes(extname(file));
const rewrite = (text) => assets.reduce((result, name) => result.split(name).join(renamed(name)), text);
const lazy = /^\/assets\/(runtime|studio|debug)-[^/]+\.js$/;
let build = '1';

const notFound = (response) => {
  response.statusCode = 404;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end('NOT_FOUND\n');
};

createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/__deploy') {
    build = url.searchParams.get('build') ?? '1';
    response.end(`build ${build}\n`);
    return;
  }
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (build === 'gone' && lazy.test(path)) return notFound(response);
  if (build === '2' && path.startsWith('/assets/')) {
    const name = original.get(path.slice('/assets/'.length));
    if (!name) return notFound(response);
    path = `/assets/${name}`;
  }
  const file = join(dist, path);
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) return notFound(response);
  let body = readFileSync(file);
  if (build === '2' && isText(file)) body = Buffer.from(rewrite(body.toString('utf8')));
  const etag = `"${createHash('md5').update(body).digest('hex')}"`;
  response.setHeader('cache-control', 'public, max-age=0, must-revalidate');
  response.setHeader('etag', etag);
  if (request.headers['if-none-match'] === etag) {
    response.statusCode = 304;
    response.end();
    return;
  }
  response.setHeader('content-type', types[extname(file)] ?? 'application/octet-stream');
  response.end(body);
}).listen(port, '127.0.0.1');

createServer((_request, response) => {
  response.setHeader('content-type', 'text/html; charset=utf-8');
  response.end('<!doctype html><title>Another site</title><h1>Another site</h1>');
}).listen(port + 1, '127.0.0.1');

console.log(`deploy-server: ${dist} on http://127.0.0.1:${port}, another site on http://127.0.0.1:${port + 1}`);
