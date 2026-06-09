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

mkdirSync(resolve(__dirname, 'dist'), { recursive: true })

// Inject credentials into index.html
const src = readFileSync(resolve(__dirname, 'index.html'), 'utf8')
const out = src
  .replace('__SUPABASE_URL__', SUPABASE_URL)
  .replace('__SUPABASE_ANON_KEY__', SUPABASE_KEY)

writeFileSync(resolve(__dirname, 'dist', 'index.html'), out, 'utf8')
console.log('✦ Built dist/index.html')

// Copy service worker (must be at root so its scope covers the whole origin)
copyFileSync(resolve(__dirname, 'sw.js'), resolve(__dirname, 'dist', 'sw.js'))
console.log('✦ Copied dist/sw.js')
