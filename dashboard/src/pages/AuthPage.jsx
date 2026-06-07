import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Check your email to confirm your account.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">✦</span>
          <h1 className="auth-title">ARgift</h1>
          <p className="auth-sub">Bring your gifts to life with augmented reality</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-tabs">
            <button type="button" className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
            <button type="button" className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Create Account</button>
          </div>

          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <p className="auth-footer">
          Your AR experiences are private and secure. Powered by Supabase.
        </p>
      </div>

      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <style>{`
        .auth-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ink);
          position: relative;
          overflow: hidden;
          padding: 24px;
        }
        .auth-bg { position: absolute; inset: 0; pointer-events: none; }
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .auth-orb-1 { width: 600px; height: 600px; background: var(--gold); top: -200px; right: -200px; }
        .auth-orb-2 { width: 400px; height: 400px; background: var(--rose); bottom: -150px; left: -100px; }
        .auth-orb-3 { width: 300px; height: 300px; background: #4a6fa5; top: 40%; left: 30%; }

        .auth-card {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: var(--r-xl);
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5);
        }

        .auth-brand { text-align: center; margin-bottom: 36px; }
        .auth-logo {
          display: inline-block;
          font-size: 32px;
          color: var(--gold-light);
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%,100% { text-shadow: 0 0 20px rgba(240,192,96,0.4); }
          50% { text-shadow: 0 0 40px rgba(240,192,96,0.8), 0 0 80px rgba(240,192,96,0.3); }
        }
        .auth-title {
          font-family: var(--font-display);
          font-size: 36px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.5px;
          margin: 8px 0 6px;
        }
        .auth-sub { color: rgba(255,255,255,0.45); font-size: 13px; }

        .auth-tabs {
          display: flex;
          background: rgba(255,255,255,0.06);
          border-radius: var(--r-sm);
          padding: 4px;
          margin-bottom: 24px;
        }
        .auth-tab {
          flex: 1;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.5);
          padding: 8px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .auth-tab.active {
          background: rgba(255,255,255,0.12);
          color: #fff;
        }

        .auth-field { margin-bottom: 16px; }
        .auth-field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }
        .auth-field input {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          border-radius: var(--r-sm);
        }
        .auth-field input::placeholder { color: rgba(255,255,255,0.25); }
        .auth-field input:focus {
          border-color: rgba(201,147,42,0.6);
          box-shadow: 0 0 0 3px rgba(201,147,42,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--gold) 0%, #e8a830 100%);
          color: #fff;
          border: none;
          border-radius: var(--r-sm);
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.3px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(201,147,42,0.4);
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-full { width: 100%; margin-top: 8px; }

        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .auth-footer {
          text-align: center;
          margin-top: 24px;
          color: rgba(255,255,255,0.25);
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
