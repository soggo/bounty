// Singleton AuthManager to prevent corruption and multiple initializations
import { supabase } from './supabaseClient'

class AuthManager {
  constructor() {
    this.initialized = false
    this.user = null
    this.userRole = null
    this.isAuthenticated = false
    this.isLoading = true
    this.error = null
    this.subscribers = new Set()
    this.authSubscription = null
    this.debounceTimer = null
    this.initPromise = null
  }

  // Singleton pattern - only one instance ever
  static getInstance() {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  // Subscribe to auth state changes
  subscribe(callback) {
    this.subscribers.add(callback)
    // Immediately call with current state
    callback({
      user: this.user,
      userRole: this.userRole,
      isAuthenticated: this.isAuthenticated,
      isLoading: this.isLoading,
      error: this.error
    })

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Notify all subscribers of state changes (debounced)
  notifySubscribers() {
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Debounce notifications to prevent rapid-fire updates
    this.debounceTimer = setTimeout(() => {
      const state = {
        user: this.user,
        userRole: this.userRole,
        isAuthenticated: this.isAuthenticated,
        isLoading: this.isLoading,
        error: this.error
      }

      this.subscribers.forEach(callback => {
        try {
          callback(state)
        } catch (error) {
          console.warn('Error in auth subscriber:', error)
        }
      })
    }, 50) // 50ms debounce
  }

  // Initialize auth manager (only once)
  async initialize() {
    if (this.initialized) {
      return this.initPromise
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this._doInitialize()
    return this.initPromise
  }

  async _doInitialize() {
    try {
      console.log('AuthManager: Initializing...')
      this.initialized = true
      this.isLoading = true
      this.error = null
      this.notifySubscribers()

      // Get initial auth state
      await this.refreshAuth()

      // Set up auth state listener (only once)
      if (!this.authSubscription) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('AuthManager: Auth state change:', event, !!session?.user)
            await this.handleAuthStateChange(event, session)
          }
        )
        this.authSubscription = subscription
      }

      console.log('AuthManager: Initialized successfully')
    } catch (error) {
      console.error('AuthManager: Initialization failed:', error)
      this.error = error.message
      this.isLoading = false
      this.notifySubscribers()
    }
  }

  // Handle auth state changes
  async handleAuthStateChange(event, session) {
    try {
      switch (event) {
        case 'SIGNED_OUT':
          this.user = null
          this.userRole = null
          this.isAuthenticated = false
          this.error = null
          this.notifySubscribers()
          break

        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          // Refresh auth state for these events
          await this.refreshAuth()
          break

        case 'INITIAL_SESSION':
          // Only refresh if we have a session
          if (session?.user) {
            await this.refreshAuth()
          } else {
            this.isLoading = false
            this.notifySubscribers()
          }
          break

        default:
          console.log('AuthManager: Unhandled auth event:', event)
      }
    } catch (error) {
      console.error('AuthManager: Error handling auth state change:', error)
      this.error = error.message
      this.isLoading = false
      this.notifySubscribers()
    }
  }

  // Refresh auth state
  async refreshAuth() {
    try {
      this.isLoading = true
      this.error = null
      this.notifySubscribers()

      // Get current user
      const { data: auth, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.warn('AuthManager: Auth error:', authError.message)
        this.user = null
        this.userRole = null
        this.isAuthenticated = false
        this.error = authError.message
        this.isLoading = false
        this.notifySubscribers()
        return
      }

      const currentUser = auth?.user
      this.user = currentUser
      this.isAuthenticated = !!currentUser

      if (currentUser) {
        // Fetch user role
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()

          if (profileError) {
            console.warn('AuthManager: Profile fetch error:', profileError.message)
            this.userRole = 'customer' // Default role
          } else {
            this.userRole = profile?.role || 'customer'
          }
        } catch (profileError) {
          console.warn('AuthManager: Profile fetch exception:', profileError)
          this.userRole = 'customer'
        }
      } else {
        this.userRole = null
      }

      this.isLoading = false
      this.notifySubscribers()

    } catch (error) {
      console.error('AuthManager: Refresh auth error:', error)
      this.user = null
      this.userRole = null
      this.isAuthenticated = false
      this.error = error.message
      this.isLoading = false
      this.notifySubscribers()
    }
  }

  // Sign out
  async signOut() {
    try {
      this.isLoading = true
      this.notifySubscribers()

      // Clear local state immediately
      this.user = null
      this.userRole = null
      this.isAuthenticated = false
      this.error = null

      // Clear session storage
      try {
        window.sessionStorage.removeItem('bounty:returnTo')
      } catch (storageError) {
        console.warn('AuthManager: Error clearing session storage:', storageError)
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('AuthManager: Signout error:', error)
      }

      this.isLoading = false
      this.notifySubscribers()

      // Force redirect to home
      window.location.hash = '#/'

    } catch (error) {
      console.error('AuthManager: Signout error:', error)
      // Even if signout fails, clear local state and redirect
      this.user = null
      this.userRole = null
      this.isAuthenticated = false
      this.isLoading = false
      this.notifySubscribers()
      window.location.hash = '#/'
    }
  }

  // Clear auth error
  clearAuthError() {
    this.error = null
    this.notifySubscribers()
  }

  // Cleanup (for testing/development)
  destroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe()
      this.authSubscription = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.subscribers.clear()
    this.initialized = false
    this.initPromise = null
    AuthManager.instance = null
  }
}

// Export singleton instance
export default AuthManager.getInstance()
