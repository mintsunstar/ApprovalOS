import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const pages = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/pages')
for (const f of fs.readdirSync(pages).filter((x) => x.endsWith('.tsx'))) {
  const s = fs.readFileSync(path.join(pages, f), 'utf8')
  const hangul = /[\uAC00-\uD7A3]/.test(s)
  const qmarks = (s.match(/\?\?/g) || []).length
  if (qmarks > 0 || !hangul) console.log(f, 'hangul', hangul, 'qmarks', qmarks)
}
