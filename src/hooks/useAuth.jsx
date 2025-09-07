import { useEffect, useMemo, useRef, useState, createContext, useContext } from 'react'
import { supabase } from '../lib/supabaseClient'

// Simple, robust auth context with Supabase v2
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'authenticated' | 'unauthenticated'
  const [error, setError] = useState(null)
  const subRef = useRef(null)
  const mountedRef = useRef(false)

  async function fetchRole(userId) {
    try {
      if (!userId) return null
      const { data, error: roleErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (roleErr) return 'customer'
      return data?.role || 'customer'
    } catch {
      return 'customer'
    }
  }

  async function handleSession(session) {
    const sessionUser = session?.user || null
    setUser(sessionUser)
    if (sessionUser) {
      const role = await fetchRole(sessionUser.id)
      setUserRole(role)
      setStatus('authenticated')
      setError(null)
    } else {
      setUserRole(null)
      setStatus('unauthenticated')
    }
  }

  async function init() {
    try {
      setStatus('loading')
      setError(null)
      const { data, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) {
        setError(sessErr.message)
        setUser(null)
        setUserRole(null)
        setStatus('unauthenticated')
      } else {
        await handleSession(data?.session || null)
      }
      // Subscribe once
      if (!subRef.current) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          try {
            switch (event) {
              case 'SIGNED_IN':
              case 'TOKEN_REFRESHED':
              case 'USER_UPDATED':
              case 'INITIAL_SESSION':
                await handleSession(session)
                break
              case 'SIGNED_OUT':
                setUser(null)
                setUserRole(null)
                setStatus('unauthenticated')
                setError(null)
                break
              default:
                break
            }
          } catch (e) {
            setError(e?.message || 'Auth update failed')
            setStatus('unauthenticated')
          }
        })
        subRef.current = subscription
      }
    } catch (e) {
      setError(e?.message || 'Auth initialization failed')
      setUser(null)
      setUserRole(null)
      setStatus('unauthenticated')
    }
  }

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    init()
    // Refresh when tab becomes visible or window gains focus
    const onVisible = async () => {
      try {
        if (document.visibilityState === 'visible') {
          const { data } = await supabase.auth.getSession()
          await handleSession(data?.session || null)
        }
      } catch {}
    }
    const onFocus = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        await handleSession(data?.session || null)
      } catch {}
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      subRef.current?.unsubscribe?.()
      subRef.current = null
    }
  }, [])

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'

  const api = useMemo(() => ({
    user,
    userRole,
    isAuthenticated,
    isLoading,
    error,
    async refreshAuth() {
      const { data } = await supabase.auth.getSession()
      await handleSession(data?.session || null)
    },
    async signOut() {
      try {
        setStatus('loading')
        try { window.sessionStorage.removeItem('bounty:returnTo') } catch {}
        await supabase.auth.signOut()
      } finally {
        setUser(null)
        setUserRole(null)
        setStatus('unauthenticated')
        window.location.hash = '#/'
      }
    },
    clearAuthError() { setError(null) }
  }), [user, userRole, isAuthenticated, isLoading, error])

  return (
    <AuthContext.Provider value={api}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function withAdminAuth(Component) {
  return function AdminProtectedComponent(props) {
    const { isAuthenticated, userRole, isLoading } = useAuth()
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying access...</p>
          </div>
        </div>
      )
    }
    if (!isAuthenticated || userRole !== 'admin') {
      window.location.hash = '#/'
      return null
    }
    return <Component {...props} />
  }
}
