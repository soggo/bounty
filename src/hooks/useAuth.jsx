import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { supabase } from '../lib/supabaseClient'
import { createAuthCircuitBreaker, recoverFromAuthError, isHotReload, forceAuthCleanup, detectCorruptedAuthState } from '../utils/authRecovery.js'

// Create Auth Context
const AuthContext = createContext({
  user: null,
  userRole: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  signOut: () => {},
  refreshAuth: () => {},
  clearAuthError: () => {}
})

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Create circuit breaker for auth operations
  const circuitBreaker = useCallback(() => createAuthCircuitBreaker(3, 30000), [])

  // Clear auth error
  const clearAuthError = useCallback(() => {
    setError(null)
  }, [])

  // Refresh auth state - always use getUser() for consistency
  const refreshAuth = useCallback(async () => {
    const breaker = circuitBreaker()
    
    try {
      return await breaker.execute(async () => {
        setIsLoading(true)
        setError(null)
        
        // Always use getUser() instead of getSession() for fresh data
        const { data: auth, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          // If we get an auth error, clear everything
          console.warn('Auth error:', authError.message)
          setUser(null)
          setUserRole(null)
          setIsAuthenticated(false)
          setError(authError.message)
          
          // Clear potentially corrupted session data
          try {
            await supabase.auth.signOut({ scope: 'local' })
          } catch (signOutError) {
            console.warn('Error during cleanup signout:', signOutError)
          }
          
          // Trigger recovery if this looks like a corruption issue
          if (authError.message?.includes('Invalid') || authError.message?.includes('expired')) {
            recoverFromAuthError(authError)
          }
          
          return { user: null, userRole: null, isAuthenticated: false, error: authError.message }
        }

        const currentUser = auth?.user
        setUser(currentUser)
        setIsAuthenticated(!!currentUser)

        if (currentUser) {
          // Fetch user role with error handling
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentUser.id)
              .single()

            if (profileError) {
              console.warn('Profile fetch error:', profileError.message)
              // Don't fail completely if profile fetch fails, default to customer
              setUserRole('customer')
            } else {
              setUserRole(profile?.role || 'customer')
            }
          } catch (profileError) {
            console.warn('Profile fetch exception:', profileError)
            setUserRole('customer')
          }
        } else {
          setUserRole(null)
        }

        return { 
          user: currentUser, 
          userRole: currentUser ? (userRole || 'customer') : null, 
          isAuthenticated: !!currentUser, 
          error: null 
        }
      })
    } catch (error) {
      console.error('Auth refresh error (circuit breaker):', error)
      setUser(null)
      setUserRole(null)
      setIsAuthenticated(false)
      setError(error.message)
      return { user: null, userRole: null, isAuthenticated: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }, [userRole, circuitBreaker])

  // Sign out with cleanup
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Clear local state immediately
      setUser(null)
      setUserRole(null)
      setIsAuthenticated(false)
      setError(null)
      
      // Clear session storage
      try {
        window.sessionStorage.removeItem('bounty:returnTo')
      } catch (storageError) {
        console.warn('Error clearing session storage:', storageError)
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('Signout error:', error)
      }
      
      // Force redirect to home
      window.location.hash = '#/'
    } catch (error) {
      console.error('Signout error:', error)
      // Even if signout fails, clear local state and redirect
      setUser(null)
      setUserRole(null)
      setIsAuthenticated(false)
      window.location.hash = '#/'
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true
    
    // Check if we're in a hot reload scenario
    if (isHotReload()) {
      console.log('Hot reload detected, performing gentle auth refresh...')
    }
    
    // Check for corrupted auth state before starting
    const corruption = detectCorruptedAuthState()
    if (corruption.hasStaleTokens) {
      console.warn('Detected corrupted auth state on startup, cleaning up...')
      forceAuthCleanup()
      // Give a moment for cleanup to complete
      setTimeout(() => {
        if (mounted) refreshAuth()
      }, 100)
    } else {
      // Initial auth check
      refreshAuth()
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state change:', event, !!session?.user)
      
      // Handle different auth events
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setIsAuthenticated(false)
        setError(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refresh auth state for these events
        await refreshAuth()
      } else if (event === 'USER_UPDATED') {
        // User data updated, refresh
        await refreshAuth()
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [refreshAuth])

  const value = {
    user,
    userRole,
    isAuthenticated,
    isLoading,
    error,
    signOut,
    refreshAuth,
    clearAuthError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for admin protection
export function withAdminAuth(Component) {
  return function AdminProtectedComponent(props) {
    const { isAuthenticated, userRole, isLoading } = useAuth()
    
    // Show loading while checking auth
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
    
    // Redirect unauthenticated users to homepage instead of showing access denied
    if (!isAuthenticated) {
      window.location.hash = '#/'
      return null
    }
    
    // Redirect non-admin users to homepage instead of showing access denied
    if (userRole !== 'admin') {
      window.location.hash = '#/'
      return null
    }
    
    return <Component {...props} />
  }
}
