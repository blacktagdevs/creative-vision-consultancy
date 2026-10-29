// Serves build/client the way GitHub Pages will: under BASE_PATH, directories
// answer with their index.html, "/about" redirects to "/about/", and anything
// missing gets 404.html with a 404 status. Run after `npm run build:pages`.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = 'build/client'
const base = `/${(process.env.BASE_PATH || '/').replace(/^\/|\/$/g, '')}/`.replace('//', '/')
const port = Number(process.env.PORT || 4173)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.data': 'text/x-script',
}

function send(res, file, status = 200) {
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
  createReadStream(file).pipe(res)
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === base.slice(0, -1)) return res.writeHead(301, { Location: base }).end()
  if (!path.startsWith(base)) return send(res, join(root, '404.html'), 404)

  const file = join(root, normalize(path.slice(base.length)).replace(/^(\.\.[/\\])+/, ''))
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) return res.writeHead(301, { Location: `${path}/` }).end()
    if (existsSync(join(file, 'index.html'))) return send(res, join(file, 'index.html'))
  } else if (existsSync(file)) {
    return send(res, file)
  }
  send(res, join(root, '404.html'), 404)
}).listen(port, () => console.log(`Preview: http://localhost:${port}${base}`))
