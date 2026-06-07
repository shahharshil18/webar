// Build script: injects env vars into index.html for static deployment
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠ SUPABASE_URL / SUPABASE_ANON_KEY not set — placeholders left in output')
}

const src = readFileSync(resolve(__dirname, 'index.html'), 'utf8')
const out = src
  .replace('__SUPABASE_URL__', SUPABASE_URL)
  .replace('__SUPABASE_ANON_KEY__', SUPABASE_KEY)

const outPath = resolve(__dirname, 'dist', 'index.html')
import { mkdirSync } from 'fs'
mkdirSync(resolve(__dirname, 'dist'), { recursive: true })
writeFileSync(outPath, out, 'utf8')
console.log('✦ AR experience built to dist/index.html')
