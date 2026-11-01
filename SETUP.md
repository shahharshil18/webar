# ARgift Platform — Setup Guide

## What you're building

Two Vercel deployments:
1. **Dashboard** — `dashboard.vercel.app` — React app where senders create experiences
2. **AR Experience** — `ar.vercel.app` — Static HTML page that opens in a phone browser

---

## Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Go to SQL Editor → paste contents of `supabase/schema.sql` → Run
3. Go to Project Settings → API → copy:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key**

---

## Step 2 — Dashboard (React app)

```bash
cd dashboard
cp .env.example .env.local
# Edit .env.local with your Supabase URL + key
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Step 3 — AR Experience (static HTML)

`index.html` contains `__SUPABASE_URL__` / `__SUPABASE_ANON_KEY__` placeholders that the build script fills in
from env vars, so build first and serve the `dist/` output (also for local dev):
```bash
cd ar-experience
SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=xxx node build.js
npx serve dist --cors -l 5500
```

Open `http://localhost:5500/?pid=TEST123`. Without `?pid=` the page deliberately shows a "use your gift link" screen
and never touches the camera.

Append `&q=low`, `&q=mid` or `&q=high` to force a device quality tier (camera resolution + render
resolution) when comparing phones. By default the tier is picked from the device's memory and core count.

---

## Step 4 — Deploy to Vercel

### Dashboard
```bash
cd dashboard
npx vercel --prod
# Set env vars in Vercel dashboard:
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AR_BASE_URL
```

### AR Experience
```bash
cd ar-experience
npx vercel --prod
# Set env vars: SUPABASE_URL, SUPABASE_ANON_KEY
```

---

## Step 5 — Update AR_BASE_URL

In your dashboard's Vercel env vars, set:
```
VITE_AR_BASE_URL=https://your-ar-app.vercel.app
```

This is the base URL used when generating QR codes and share links.

---

## Step 6 — Marker Training (for image tracking)

Mind AR requires a `.mind` file compiled from your product artwork.

**Free tool:** [https://hiukim.github.io/mind-ar-js-doc/tools/compile](https://hiukim.github.io/mind-ar-js-doc/tools/compile)

1. Upload your product image (the mug graphic, tote bag print, etc.)
2. Compile → download `.mind` file
3. Upload the `.mind` file to Supabase Storage bucket `images`
4. Paste the public URL into the `marker_url` field of your experience

Until you set a custom marker, the AR experience uses `targets/default.mind` — put a compiled `.mind` file at `ar-experience/targets/default.mind` for testing.

---

## Folder Structure

```
argift/
├── dashboard/              # React + Vite (sender side)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── components/
│   │   │   ├── ExperienceEditor.jsx
│   │   │   ├── ExperienceCard.jsx
│   │   │   ├── ARPreview.jsx
│   │   │   └── QRDisplay.jsx
│   │   └── lib/
│   │       ├── supabase.js
│   │       └── constants.js
│   └── vercel.json
│
├── ar-experience/          # Static site, no bundler (receiver side)
│   ├── index.html          # Shell, import map, module preloads
│   ├── app.js              # Boot flow + UI wiring (tap-to-start, error states)
│   ├── engine.js           # MindAR + three.js: camera, tiers, tracker pre-warm, pose smoothing
│   ├── content.js          # Video / photo / text overlays (fit, sRGB, fade-in)
│   ├── media.js            # Starts downloading media early, unlocks audio on tap
│   ├── pose-filter.js      # One-Euro smoothing in pose space
│   ├── styles.css
│   ├── sw.js               # Caches the engine CDN files between visits
│   ├── build.js            # Injects env vars, copies files to dist/
│   └── vercel.json
│
└── supabase/
    └── schema.sql          # Run this in Supabase SQL editor
```

---

## How the AR flow works

1. Sender creates experience → saves to Supabase → gets QR code
2. QR encodes URL: `https://ar.yourdomain.com/?pid=<uuid>`
3. Receiver scans QR → browser opens URL → "An experience is waiting for you" screen. The tracking file, media and the
   engine download and warm up in the background; the camera is **not** started yet
4. Receiver taps **View Gift** → camera starts (this tap is also what allows the video to play with sound)
5. MindAR detects the artwork (marker) → three.js draws the content on it
6. CTA button appears → links to whatever URL sender set
7. Replay and Share buttons also available

---

## NFC Setup

1. Get any writable NFC tag (NTAG213, available for ~₹20 on Amazon/AliExpress)
2. Use **NFC Tools** (free app, Android/iOS) to write:
   - Record type: URL
   - Value: `https://your-ar-app.vercel.app/?pid=YOUR_PRODUCT_ID`
3. Tap phone on NFC tag → browser opens instantly
