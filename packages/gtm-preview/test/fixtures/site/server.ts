import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export interface FixtureSite {
  baseUrl: string
  close: () => Promise<void>
}

/** Serve the fixture pages on a free port with the container id substituted in. */
export async function startFixtureSite(containerId = 'GTM-FIXTURE'): Promise<FixtureSite> {
  const server: Server = createServer(async (req, res) => {
    const path = (req.url ?? '/').split('?')[0] ?? '/'
    const file = path === '/' ? 'index.html' : path.replace(/^\//, '')
    try {
      const html = await readFile(join(root, file), 'utf8')
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html.replaceAll('__GTM_ID__', containerId))
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  })
  await new Promise<void>((resolve) =>
    server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', resolve),
  )
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('fixture server did not bind a port')
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  }
}
