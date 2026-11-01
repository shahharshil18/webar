// Build script: injects env vars and copies all assets to dist/
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠ SUPABASE_URL / SUPABASE_ANON_KEY not set — placeholders left in output')
}

const dist = resolve(__dirname, 'dist')
mkdirSync(dist, { recursive: true })

// Inject credentials into index.html (the URL appears in the preconnect hint and the config)
const src = readFileSync(resolve(__dirname, 'index.html'), 'utf8')
const out = src
  .replaceAll('__SUPABASE_URL__', SUPABASE_URL)
  .replaceAll('__SUPABASE_ANON_KEY__', SUPABASE_KEY)
writeFileSync(resolve(dist, 'index.html'), out, 'utf8')
console.log('✦ Built dist/index.html')

// Static files, served as-is. The service worker must sit at the root so its scope covers the origin.
for (const file of ['app.js', 'media.js', 'engine.js', 'content.js', 'pose-filter.js', 'styles.css', 'sw.js']) {
  copyFileSync(resolve(__dirname, file), resolve(dist, file))
  console.log(`✦ Copied dist/${file}`)
}
