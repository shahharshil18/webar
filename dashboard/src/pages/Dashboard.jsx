import { useState, useEffect } from 'react'
import { supabase, getUserExperiences, deleteExperience } from '../lib/supabase'
import toast from 'react-hot-toast'
import ExperienceEditor from '../components/ExperienceEditor'
import ExperienceCard from '../components/ExperienceCard'
import { v4 as uuidv4 } from 'uuid'

export default function Dashboard({ session }) {
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | productId
  const user = session.user

  useEffect(() => { loadExperiences() }, [])

  async function loadExperiences() {
    setLoading(true)
    try {
      const data = await getUserExperiences(user.id)
      setExperiences(data)
    } catch (err) {
      toast.error('Failed to load experiences')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(productId) {
    if (!confirm('Delete this AR experience? This cannot be undone.')) return
    try {
      await deleteExperience(productId)
      setExperiences(prev => prev.filter(e => e.product_id !== productId))
      toast.success('Experience deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleNew() {
    setEditing({ product_id: uuidv4(), isNew: true })
  }

  function handleEdit(exp) {
    setEditing(exp)
  }

  function handleSaved(exp) {
    setExperiences(prev => {
      const idx = prev.findIndex(e => e.product_id === exp.product_id)
      if (idx >= 0) { const next = [...prev]; next[idx] = exp; return next }
      return [exp, ...prev]
    })
    setEditing(null)
    toast.success('Experience saved!')
  }

  if (editing) {
    return (
      <ExperienceEditor
        experience={editing}
        userId={user.id}
        onSaved={handleSaved}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="dash-root">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-logo">✦</span>
          <span className="dash-name">ARgift</span>
        </div>
        <div className="dash-header-right">
          <span className="dash-email">{user.email}</span>
          <button
            className="btn-ghost"
            onClick={() => supabase.auth.signOut()}
          >Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-hero">
          <h1 className="dash-headline">Your AR Experiences</h1>
          <p className="dash-tagline">
            Each experience lives on a product. Scan, tap, or share — your message comes alive.
          </p>
          <button className="btn-primary btn-create" onClick={handleNew}>
            <span>+ Create New Experience</span>
          </button>
        </div>

        {loading ? (
          <div className="dash-loader">
            <div className="spinner" />
          </div>
        ) : experiences.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">🎁</div>
            <h3>No experiences yet</h3>
            <p>Create your first AR gift experience and bring your products to life.</p>
            <button className="btn-primary" onClick={handleNew}>Create your first experience</button>
          </div>
        ) : (
          <div className="dash-grid">
            {experiences.map(exp => (
              <ExperienceCard
                key={exp.product_id}
                experience={exp}
                onEdit={() => handleEdit(exp)}
                onDelete={() => handleDelete(exp.product_id)}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        .dash-root {
          min-height: 100vh;
          background: var(--surface);
          display: flex;
          flex-direction: column;
        }
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 64px;
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .dash-brand { display: flex; align-items: center; gap: 10px; }
        .dash-logo { color: var(--gold); font-size: 20px; }
        .dash-name {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.3px;
        }
        .dash-header-right { display: flex; align-items: center; gap: 16px; }
        .dash-email { font-size: 13px; color: var(--ink-3); }
        .btn-ghost {
          background: none;
          border: 1.5px solid var(--border-strong);
          border-radius: var(--r-sm);
          padding: 6px 14px;
          font-size: 13px;
          color: var(--ink-2);
          transition: all 0.2s;
        }
        .btn-ghost:hover { background: var(--surface-3); }

        .dash-main { padding: 48px 32px; max-width: 1200px; margin: 0 auto; width: 100%; }

        .dash-hero {
          text-align: center;
          margin-bottom: 48px;
        }
        .dash-headline {
          font-size: clamp(32px, 5vw, 52px);
          letter-spacing: -1.5px;
          margin-bottom: 12px;
        }
        .dash-tagline { color: var(--ink-3); font-size: 16px; margin-bottom: 28px; }
        .btn-create { padding: 14px 32px; font-size: 16px; }

        .dash-loader { display: flex; justify-content: center; padding: 80px; }
        .spinner {
          width: 36px; height: 36px;
          border: 2px solid var(--border-strong);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dash-empty {
          text-align: center;
          padding: 80px 24px;
          background: var(--surface-2);
          border-radius: var(--r-xl);
          border: 1.5px dashed var(--border-strong);
        }
        .dash-empty-icon { font-size: 48px; margin-bottom: 16px; }
        .dash-empty h3 { font-size: 22px; margin-bottom: 8px; }
        .dash-empty p { color: var(--ink-3); margin-bottom: 24px; }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
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
        .btn-primary:hover { transform: translateY(-1px); box-shadow: var(--shadow-gold); }

        @media (max-width: 640px) {
          .dash-header { padding: 0 16px; }
          .dash-email { display: none; }
          .dash-main { padding: 24px 16px; }
        }
      `}</style>
    </div>
  )
}
