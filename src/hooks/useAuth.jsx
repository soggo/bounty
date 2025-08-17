import { useEffect, useState, createContext, useContext } from 'react'
import AuthManager from '../lib/AuthManager.js'

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
  const [authState, setAuthState] = useState({
    user: null,
    userRole: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    // Initialize AuthManager
    AuthManager.initialize()

    // Subscribe to auth state changes
    const unsubscribe = AuthManager.subscribe((newState) => {
      setAuthState(newState)
    })

    // Cleanup subscription on unmount
    return unsubscribe
  }, [])

  const value = {
    user: authState.user,
    userRole: authState.userRole,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    signOut: () => AuthManager.signOut(),
    refreshAuth: () => AuthManager.refreshAuth(),
    clearAuthError: () => AuthManager.clearAuthError()
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
