import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import { Toaster } from 'react-hot-toast'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <AppLoader />

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)',
            background: 'var(--surface-2)',
            color: 'var(--ink)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-md)',
            fontSize: 14,
          },
          success: { iconTheme: { primary: '#c9932a', secondary: '#fff' } },
        }}
      />
      {session ? <Dashboard session={session} /> : <AuthPage />}
    </>
  )
}

function AppLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, color: 'var(--ink-3)', fontFamily: 'var(--font-fine)', fontSize: 16 }}>
          Loading your gifting studio…
        </p>
      </div>
      <style>{`
        .spinner {
          width: 40px; height: 40px;
          border: 2px solid var(--border-strong);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
