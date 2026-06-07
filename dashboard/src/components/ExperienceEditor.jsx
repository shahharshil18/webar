import { useState, useRef } from 'react'
import { saveExperience, uploadFile, uploadMarkerMind } from '../lib/supabase'
import { TEMPLATES, EXPERIENCE_TYPES } from '../lib/constants'
import ARPreview from './ARPreview'
import QRDisplay from './QRDisplay'
import toast from 'react-hot-toast'

export default function ExperienceEditor({ experience, userId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: experience.title || '',
    experience_type: experience.experience_type || 'text',
    template_id: experience.template_id || 'golden',
    text_message: experience.text_message || '',
    cta_label: experience.cta_label || '',
    cta_url: experience.cta_url || '',
    media_url: experience.media_url || '',
    media_urls: experience.media_urls || [],
    marker_url: experience.marker_url || '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('content') // 'content' | 'cta' | 'generate'
  const fileRef = useRef(null)
  const arUrl = `${import.meta.env.VITE_AR_BASE_URL || 'https://ar.yourdomain.com'}/?pid=${experience.product_id}`

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${experience.product_id}/media.${ext}`
      const bucket = form.experience_type === 'video' ? 'videos' : 'images'
      const url = await uploadFile(bucket, path, file)
      if (form.experience_type === 'photo') {
        set('media_urls', [...form.media_urls.filter(Boolean), url])
        set('media_url', url)
      } else {
        set('media_url', url)
      }
      toast.success('File uploaded!')
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Please add a title'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        experience_type: form.experience_type,
        template_id: form.template_id,
        text_message: form.text_message,
        cta_label: form.cta_label,
        cta_url: form.cta_url,
        media_url: form.media_url,
        media_urls: form.media_urls,
        marker_url: form.marker_url,
      }
      const saved = await saveExperience(userId, experience.product_id, payload)
      onSaved(saved)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === form.template_id) || TEMPLATES[0]

  return (
    <div className="editor-root">
      <header className="editor-header">
        <button className="btn-back" onClick={onCancel}>← Back</button>
        <div className="editor-header-center">
          <span className="dash-logo" style={{ color: 'var(--gold)', fontSize: 18 }}>✦</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
            {experience.isNew ? 'New Experience' : 'Edit Experience'}
          </span>
        </div>
        <button className="btn-primary btn-save" onClick={handleSave} disabled={saving}>
          {saving ? <span className="btn-spinner" /> : 'Save & Publish'}
        </button>
      </header>

      <div className="editor-body">
        <div className="editor-left">
          <div className="editor-tabs">
            {[
              { id: 'content', label: '📦 Content' },
              { id: 'marker', label: '🎯 Marker' },
              { id: 'cta', label: '🔗 Call to Action' },
              { id: 'generate', label: '✦ Generate' },
            ].map(t => (
              <button key={t.id} className={`editor-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="editor-panel">
            {tab === 'content' && (
              <ContentTab
                form={form}
                set={set}
                uploading={uploading}
                fileRef={fileRef}
                handleFileUpload={handleFileUpload}
                selectedTemplate={selectedTemplate}
              />
            )}
            {tab === 'marker' && (
              <MarkerTab
                form={form}
                set={set}
                userId={userId}
                productId={experience.product_id}
              />
            )}
            {tab === 'cta' && <CTATab form={form} set={set} />}
            {tab === 'generate' && (
              <GenerateTab
                arUrl={arUrl}
                productId={experience.product_id}
              />
            )}
          </div>
        </div>

        <div className="editor-right">
          <div className="editor-preview-label">Live Preview</div>
          <ARPreview form={form} template={selectedTemplate} />
        </div>
      </div>

      <style>{`
        .editor-root {
          min-height: 100vh;
          background: var(--surface);
          display: flex;
          flex-direction: column;
        }
        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 64px;
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
          gap: 16px;
        }
        .editor-header-center {
          display: flex;
          align-items: center;
          gap: 8px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .btn-back {
          background: none;
          border: 1.5px solid var(--border-strong);
          border-radius: var(--r-sm);
          padding: 7px 14px;
          font-size: 13px;
          color: var(--ink-2);
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-back:hover { background: var(--surface-3); }

        .btn-save { padding: 9px 20px; font-size: 14px; white-space: nowrap; }
        .btn-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .editor-body {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 0;
          flex: 1;
          min-height: 0;
        }
        .editor-left {
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .editor-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: var(--surface-2);
          padding: 0 16px;
          gap: 0;
        }
        .editor-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 14px 16px;
          font-size: 13px;
          color: var(--ink-3);
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .editor-tab.active { color: var(--ink); border-bottom-color: var(--gold); }
        .editor-tab:hover { color: var(--ink-2); }

        .editor-panel { padding: 24px; flex: 1; overflow-y: auto; }

        .editor-right {
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--surface);
        }
        .editor-preview-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--ink-3);
          margin-bottom: 16px;
          font-weight: 600;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--gold) 0%, #e8a830 100%);
          color: #fff;
          border: none;
          border-radius: var(--r-sm);
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--shadow-gold); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 900px) {
          .editor-body { grid-template-columns: 1fr; }
          .editor-right { display: none; }
          .editor-header-center { display: none; }
        }
      `}</style>
    </div>
  )
}

function ContentTab({ form, set, uploading, fileRef, handleFileUpload, selectedTemplate }) {
  return (
    <div className="content-tab">
      <div className="field-group">
        <label className="field-label">Experience Title *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Birthday Mug for Priya" />
      </div>

      <div className="field-group">
        <label className="field-label">Experience Type</label>
        <div className="type-grid">
          {[
            { id: 'video', label: 'Video Message', icon: '🎥', desc: 'Record & share a heartfelt video' },
            { id: 'photo', label: 'Photo Slideshow', icon: '🖼️', desc: 'A gallery of your memories' },
            { id: 'text', label: '3D Text Message', icon: '✨', desc: 'Your words floating in AR' },
          ].map(t => (
            <button key={t.id}
              className={`type-card ${form.experience_type === t.id ? 'selected' : ''}`}
              onClick={() => set('experience_type', t.id)}>
              <span className="type-icon">{t.icon}</span>
              <span className="type-label">{t.label}</span>
              <span className="type-desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {(form.experience_type === 'video' || form.experience_type === 'photo') && (
        <div className="field-group">
          <label className="field-label">
            {form.experience_type === 'video' ? 'Upload Video' : 'Upload Photos'}
          </label>
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            {uploading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="spinner-sm" />
                <span>Uploading…</span>
              </div>
            ) : form.media_url ? (
              <div className="upload-success">
                <span>✓</span>
                <span>File uploaded. Click to replace.</span>
              </div>
            ) : (
              <>
                <span className="upload-icon">↑</span>
                <span>Click to upload {form.experience_type === 'video' ? 'MP4/WebM' : 'JPG/PNG/WebP'}</span>
                <span className="upload-hint">Max 50MB • Optimised for mobile</span>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={form.experience_type === 'video' ? 'video/mp4,video/webm' : 'image/*'}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      )}

      {form.experience_type === 'text' && (
        <div className="field-group">
          <label className="field-label">Your Message *</label>
          <textarea
            value={form.text_message}
            onChange={e => set('text_message', e.target.value)}
            placeholder="Happy Birthday Priya! You are the reason this world is more beautiful. 🌸"
            rows={4}
            style={{ resize: 'vertical' }}
          />
          <span className="field-hint">{form.text_message.length}/200 characters</span>
        </div>
      )}

      <div className="field-group">
        <label className="field-label">Visual Template</label>
        <div className="template-grid">
          {TEMPLATES.map(t => (
            <button key={t.id}
              className={`template-swatch ${form.template_id === t.id ? 'selected' : ''}`}
              onClick={() => set('template_id', t.id)}
              title={t.description}>
              <div className="template-thumb" style={{ background: t.preview }} />
              <span>{t.name}</span>
              {form.template_id === t.id && <span className="template-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .content-tab { display: flex; flex-direction: column; gap: 24px; }
        .field-group { display: flex; flex-direction: column; gap: 8px; }
        .field-label { font-size: 12px; font-weight: 600; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.7px; }
        .field-hint { font-size: 11px; color: var(--ink-3); text-align: right; }

        .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .type-card {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: var(--surface-2);
          border: 1.5px solid var(--border);
          border-radius: var(--r-md);
          padding: 12px 8px;
          text-align: center;
          transition: all 0.2s;
        }
        .type-card.selected { border-color: var(--gold); background: var(--gold-pale); }
        .type-icon { font-size: 22px; }
        .type-label { font-size: 11px; font-weight: 600; color: var(--ink); }
        .type-desc { font-size: 10px; color: var(--ink-3); line-height: 1.3; }

        .upload-zone {
          border: 2px dashed var(--border-strong);
          border-radius: var(--r-md);
          padding: 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--ink-3);
          background: var(--surface-3);
        }
        .upload-zone:hover { border-color: var(--gold); background: var(--gold-pale); color: var(--ink-2); }
        .upload-icon { font-size: 24px; font-weight: 300; color: var(--gold); }
        .upload-hint { font-size: 11px; }
        .upload-success { display: flex; align-items: center; gap: 8px; color: var(--teal); }
        .spinner-sm {
          width: 18px; height: 18px;
          border: 2px solid var(--border-strong);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .template-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .template-swatch {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          background: none; border: 1.5px solid var(--border);
          border-radius: var(--r-sm); padding: 6px;
          font-size: 10px; color: var(--ink-2);
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .template-swatch.selected { border-color: var(--gold); }
        .template-thumb { width: 100%; height: 44px; border-radius: 4px; }
        .template-check {
          position: absolute; top: 4px; right: 6px;
          color: var(--gold); font-size: 11px; font-weight: 700;
        }
      `}</style>
    </div>
  )
}

function CTATab({ form, set }) {
  return (
    <div className="cta-tab">
      <div className="cta-header">
        <p className="cta-desc">
          After the AR experience plays, a button appears on screen. Set what it says and where it goes.
          Link to WhatsApp, a payment, your website — anything.
        </p>
      </div>

      <div className="field-group">
        <label className="field-label">Button Label</label>
        <input
          value={form.cta_label}
          onChange={e => set('cta_label', e.target.value)}
          placeholder="e.g. Send me a wish on WhatsApp"
        />
      </div>

      <div className="field-group">
        <label className="field-label">Button URL</label>
        <input
          value={form.cta_url}
          onChange={e => set('cta_url', e.target.value)}
          placeholder="https://wa.me/91XXXXXXXXXX?text=Happy+Birthday..."
        />
        <span className="field-hint">Any URL: WhatsApp, UPI, Instagram, your site…</span>
      </div>

      <div className="cta-examples">
        <p className="cta-examples-label">Quick templates</p>
        <div className="cta-chips">
          {[
            { label: 'WhatsApp', url: 'https://wa.me/91XXXXXXXXXX?text=I+got+your+gift!' },
            { label: 'UPI Pay', url: 'upi://pay?pa=XXXX@bank&pn=Gift&am=0' },
            { label: 'Instagram', url: 'https://instagram.com/USERNAME' },
            { label: 'Google Form', url: 'https://forms.gle/XXXX' },
          ].map(ex => (
            <button key={ex.label} className="cta-chip"
              onClick={() => { set('cta_label', ex.label); set('cta_url', ex.url) }}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {form.cta_label && form.cta_url && (
        <div className="cta-preview-live">
          <p className="cta-preview-title">Preview</p>
          <div className="cta-btn-mock">
            {form.cta_label}
          </div>
          <p className="cta-url-preview">→ {form.cta_url.slice(0, 50)}{form.cta_url.length > 50 ? '…' : ''}</p>
        </div>
      )}

      <style>{`
        .cta-tab { display: flex; flex-direction: column; gap: 20px; }
        .cta-desc { font-size: 13px; color: var(--ink-3); line-height: 1.6; }
        .field-group { display: flex; flex-direction: column; gap: 8px; }
        .field-label { font-size: 12px; font-weight: 600; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.7px; }
        .field-hint { font-size: 11px; color: var(--ink-3); }
        .cta-examples-label { font-size: 12px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 8px; }
        .cta-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .cta-chip {
          background: var(--surface-3); border: 1px solid var(--border);
          border-radius: 20px; padding: 5px 14px;
          font-size: 12px; color: var(--ink-2);
          transition: all 0.2s;
        }
        .cta-chip:hover { background: var(--gold-pale); border-color: var(--gold); color: var(--gold); }
        .cta-preview-live {
          background: var(--ink);
          border-radius: var(--r-md);
          padding: 20px;
          text-align: center;
        }
        .cta-preview-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.7px; color: rgba(255,255,255,0.4); margin-bottom: 12px; }
        .cta-btn-mock {
          display: inline-block;
          background: linear-gradient(135deg, var(--gold) 0%, #e8a830 100%);
          color: #fff;
          border-radius: 30px;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .cta-url-preview { font-size: 11px; color: rgba(255,255,255,0.35); }
      `}</style>
    </div>
  )
}

let _mindARModule = null
async function loadMindARCompiler() {
  if (_mindARModule) return _mindARModule
  _mindARModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js')
  return _mindARModule
}

function MarkerTab({ form, set, userId, productId }) {
  const [status, setStatus] = useState('idle') // idle | loading | compiling | uploading | done | error
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef(null)

  async function handleMarkerImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    setProgress(0)
    setErrorMsg('')

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    try {
      setStatus('loading')
      const { Compiler } = await loadMindARCompiler()

      const img = new Image()
      await new Promise((res, rej) => {
        img.onload = res
        img.onerror = rej
        img.src = objectUrl
      })

      setStatus('compiling')
      const compiler = new Compiler()
      await compiler.compileImageTargets([img], (p) => setProgress(Math.round(p * 100)))
      const buffer = await compiler.exportData()

      setStatus('uploading')
      const url = await uploadMarkerMind(userId, productId, buffer)
      set('marker_url', url)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Compilation failed')
    }
  }

  const statusLabel = {
    idle: null,
    loading: 'Loading compiler…',
    compiling: `Compiling marker… ${progress}%`,
    uploading: 'Uploading…',
    done: 'Marker ready!',
    error: errorMsg,
  }[status]

  return (
    <div className="marker-tab">
      <p className="marker-desc">
        Upload the image that will act as the AR trigger — your product label, packaging artwork, or any distinctive graphic.
        When the camera detects this image, the AR experience will play.
      </p>

      <div className="field-group">
        <label className="field-label">Reference Image</label>
        <div
          className={`upload-zone ${status === 'done' ? 'upload-done' : ''}`}
          onClick={() => fileRef.current?.click()}
          style={{ cursor: status === 'compiling' || status === 'uploading' ? 'default' : 'pointer' }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Marker preview" style={{ maxHeight: 120, borderRadius: 8, marginBottom: 8 }} />
          ) : (
            <span className="upload-icon">🎯</span>
          )}
          {status === 'compiling' || status === 'uploading' || status === 'loading' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="spinner-sm" />
              <span>{statusLabel}</span>
            </div>
          ) : status === 'done' ? (
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>✓ {statusLabel} — click to replace</span>
          ) : status === 'error' ? (
            <span style={{ color: '#e05252' }}>{statusLabel}</span>
          ) : (
            <>
              <span>Click to upload reference image (JPG / PNG)</span>
              <span className="upload-hint">Use clear, high-contrast artwork for best tracking</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }} onChange={handleMarkerImage} />
      </div>

      {form.marker_url && (
        <div className="marker-saved">
          <span>✓ Marker compiled and saved</span>
          <a href={form.marker_url} target="_blank" rel="noopener noreferrer" className="marker-link">
            View .mind file
          </a>
        </div>
      )}

      <div className="marker-tips">
        <h4>Tips for a good marker image</h4>
        <ul>
          <li>Use an image with lots of detail and contrast (logos, illustrations work well)</li>
          <li>Avoid plain colours, gradients, or very repetitive patterns</li>
          <li>Minimum 300×300 px, ideally the actual print resolution</li>
          <li>The same physical image must be present when scanning</li>
        </ul>
      </div>

      <style>{`
        .marker-tab { display: flex; flex-direction: column; gap: 20px; }
        .marker-desc { font-size: 13px; color: var(--ink-3); line-height: 1.6; }
        .field-group { display: flex; flex-direction: column; gap: 8px; }
        .field-label { font-size: 12px; font-weight: 600; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.7px; }
        .upload-zone {
          border: 2px dashed var(--border-strong);
          border-radius: var(--r-md);
          padding: 24px;
          text-align: center;
          transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          font-size: 13px; color: var(--ink-3);
          background: var(--surface-3);
        }
        .upload-zone:hover { border-color: var(--gold); background: var(--gold-pale); color: var(--ink-2); }
        .upload-done { border-color: var(--teal); background: rgba(0,200,140,0.05); }
        .upload-icon { font-size: 28px; }
        .upload-hint { font-size: 11px; }
        .spinner-sm {
          width: 18px; height: 18px;
          border: 2px solid var(--border-strong);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .marker-saved {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(0,200,140,0.08);
          border: 1px solid rgba(0,200,140,0.25);
          border-radius: var(--r-sm);
          padding: 10px 14px;
          font-size: 13px; font-weight: 600; color: var(--teal);
        }
        .marker-link { font-size: 11px; color: var(--ink-3); text-decoration: underline; }
        .marker-tips {
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: 14px 16px;
        }
        .marker-tips h4 { font-size: 12px; font-weight: 700; color: var(--ink-2); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .marker-tips ul { padding-left: 16px; }
        .marker-tips li { font-size: 12px; color: var(--ink-3); line-height: 1.7; }
      `}</style>
    </div>
  )
}

function GenerateTab({ arUrl, productId }) {
  function copyUrl() {
    navigator.clipboard.writeText(arUrl)
    toast ? null : null
    // toast handled by parent context
    const t = document.createElement('div')
    t.textContent = 'Copied!'
    t.style.cssText = 'position:fixed;top:20px;right:20px;background:#c9932a;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;z-index:9999;font-family:var(--font-body)'
    document.body.appendChild(t)
    setTimeout(() => t.remove(), 1500)
  }

  return (
    <div className="gen-tab">
      <div className="gen-section">
        <h3 className="gen-section-title">QR Code</h3>
        <p className="gen-section-desc">Print this on packaging, cards, or display it digitally. When scanned, opens the AR experience instantly — no app needed.</p>
        <div className="qr-center">
          <div className="qr-card">
            <QRDisplay url={arUrl} size={160} />
            <p className="qr-caption">Click QR to download PNG</p>
          </div>
        </div>
      </div>

      <div className="gen-section">
        <h3 className="gen-section-title">NFC + Share URL</h3>
        <p className="gen-section-desc">Write this URL to an NFC tag or share it directly. Works identically to QR scan.</p>
        <div className="url-box">
          <span className="url-text">{arUrl}</span>
          <button className="url-copy" onClick={copyUrl}>Copy</button>
        </div>
      </div>

      <div className="gen-section">
        <h3 className="gen-section-title">Product ID</h3>
        <p className="gen-section-desc">This ID is permanent and uniquely identifies this experience.</p>
        <code className="product-id">{productId}</code>
      </div>

      <div className="gen-instructions">
        <h4>How to set up</h4>
        <ol>
          <li>Print the QR code on your product, card, or packaging</li>
          <li>Or program an NFC tag with the URL above</li>
          <li>The AR marker is trained from your product's actual artwork — no separate sticker</li>
          <li>Receiver scans → camera opens → magic happens ✨</li>
        </ol>
      </div>

      <style>{`
        .gen-tab { display: flex; flex-direction: column; gap: 28px; }
        .gen-section { }
        .gen-section-title { font-size: 15px; margin-bottom: 6px; }
        .gen-section-desc { font-size: 13px; color: var(--ink-3); line-height: 1.5; margin-bottom: 14px; }
        .qr-center { display: flex; justify-content: center; }
        .qr-card {
          background: var(--surface-3);
          border-radius: var(--r-md);
          padding: 20px;
          text-align: center;
          border: 1px solid var(--border);
        }
        .qr-caption { font-size: 11px; color: var(--ink-3); margin-top: 8px; }
        .url-box {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--surface-3);
          border: 1.5px solid var(--border-strong);
          border-radius: var(--r-sm);
          overflow: hidden;
        }
        .url-text { flex: 1; padding: 10px 12px; font-size: 12px; color: var(--ink-2); word-break: break-all; }
        .url-copy {
          background: var(--ink);
          color: #fff;
          border: none;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .url-copy:hover { background: var(--ink-2); }
        .product-id {
          display: block;
          background: var(--surface-3);
          border: 1px solid var(--border-strong);
          border-radius: var(--r-sm);
          padding: 10px 12px;
          font-size: 12px;
          color: var(--ink-3);
          word-break: break-all;
        }
        .gen-instructions {
          background: var(--gold-pale);
          border: 1px solid rgba(201,147,42,0.2);
          border-radius: var(--r-md);
          padding: 16px 20px;
        }
        .gen-instructions h4 { font-size: 13px; font-weight: 700; margin-bottom: 10px; color: var(--gold); }
        .gen-instructions ol { padding-left: 16px; }
        .gen-instructions li { font-size: 13px; color: var(--ink-2); line-height: 1.7; }
      `}</style>
    </div>
  )
}
