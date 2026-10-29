// Turns build/client into the folder GitHub Pages serves.
//
// With a base path (the project URL, /creative-vision-consultancy/), React
// Router writes the prerendered pages one level down, in build/client/<base>/,
// while Vite leaves assets/, images/ and the SPA fallback at build/client/.
// Every URL already carries the base, and Pages serves the uploaded folder AT
// the base, so the pages just need lifting up beside the assets.
//
// GitHub Pages has no rewrite rules, so 404.html is a copy of the SPA
// fallback: /admin and any other path that wasn't prerendered loads the app,
// and React Router takes it from there (a real miss renders the site's 404).
import { cpSync, existsSync, rmSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = 'build/client'
const base = (process.env.BASE_PATH || '/').replace(/^\/|\/$/g, '')

if (base) {
  const nested = join(out, base)
  if (!existsSync(nested)) throw new Error(`Expected prerendered pages in ${nested}`)
  cpSync(nested, out, { recursive: true })
  rmSync(nested, { recursive: true })
}

copyFileSync(join(out, '__spa-fallback.html'), join(out, '404.html'))
// Skip Jekyll so files starting with "_" (like _root.data) are served as-is.
writeFileSync(join(out, '.nojekyll'), '')
console.log(`Assembled ${out} for GitHub Pages (base: /${base}${base ? '/' : ''})`)
