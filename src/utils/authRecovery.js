// Auth recovery utilities for handling corrupted auth states

/**
 * Detects if the app is in a corrupted auth state
 */
export function detectCorruptedAuthState() {
  try {
    // Check for common signs of corrupted state
    const localStorage = window.localStorage
    const sessionStorage = window.sessionStorage
    
    // Look for stale auth tokens or corrupted session data
    const authKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.includes('auth-token')) {
        authKeys.push(key)
      }
    }
    
    return {
      hasStaleTokens: authKeys.length > 0,
      authKeys
    }
  } catch (error) {
    console.warn('Error detecting corrupted auth state:', error)
    return { hasStaleTokens: false, authKeys: [] }
  }
}

/**
 * Clears all auth-related storage and forces a clean state
 */
export function forceAuthCleanup() {
  try {
    console.log('Performing force auth cleanup...')
    
    // Clear localStorage auth data
    const localStorage = window.localStorage
    const keysToRemove = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('sb-') || 
        key.includes('supabase') || 
        key.includes('auth') ||
        key === 'bounty:returnTo'
      )) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    // Clear sessionStorage
    try {
      window.sessionStorage.removeItem('bounty:returnTo')
    } catch (storageError) {
      console.warn('Error clearing session storage:', storageError)
    }
    
    console.log(`Cleared ${keysToRemove.length} auth storage keys`)
    return true
  } catch (error) {
    console.error('Error during force auth cleanup:', error)
    return false
  }
}

/**
 * Checks if we're in a development hot reload scenario
 */
export function isHotReload() {
  try {
    // Check for Vite HMR indicators
    return !!(
      window.__vite_plugin_react_preamble_installed__ ||
      window.__VITE_HMR_RUNTIME__ ||
      import.meta.hot
    )
  } catch {
    return false
  }
}

/**
 * Recovers from auth errors by cleaning up and redirecting
 */
export function recoverFromAuthError(error, currentPath = window.location.hash) {
  console.warn('Recovering from auth error:', error?.message || error)
  
  // Detect corruption
  const corruption = detectCorruptedAuthState()
  if (corruption.hasStaleTokens) {
    console.log('Detected stale auth tokens, cleaning up...')
    forceAuthCleanup()
  }
  
  // If we're on an admin page, redirect to signin
  if (currentPath.startsWith('#/admin')) {
    window.sessionStorage.setItem('bounty:returnTo', '#/admin')
    window.location.hash = '#/signin'
    return
  }
  
  // If we're on account page, redirect to signin
  if (currentPath.startsWith('#/account')) {
    window.sessionStorage.setItem('bounty:returnTo', '#/account')
    window.location.hash = '#/signin'
    return
  }
  
  // Otherwise, just go to homepage
  window.location.hash = '#/'
}

/**
 * Creates a circuit breaker for auth operations
 */
export function createAuthCircuitBreaker(maxFailures = 3, resetTimeout = 30000) {
  let failures = 0
  let lastFailureTime = 0
  let isOpen = false
  
  return {
    async execute(operation) {
      // If circuit is open, check if we should reset
      if (isOpen) {
        if (Date.now() - lastFailureTime > resetTimeout) {
          console.log('Auth circuit breaker reset')
          isOpen = false
          failures = 0
        } else {
          throw new Error('Auth circuit breaker is open - too many recent failures')
        }
      }
      
      try {
        const result = await operation()
        // Success - reset failure count
        if (failures > 0) {
          console.log('Auth operation succeeded, resetting failure count')
          failures = 0
        }
        return result
      } catch (error) {
        failures++
        lastFailureTime = Date.now()
        
        console.warn(`Auth operation failed (${failures}/${maxFailures}):`, error.message)
        
        if (failures >= maxFailures) {
          console.error('Auth circuit breaker opened due to repeated failures')
          isOpen = true
          recoverFromAuthError(error)
        }
        
        throw error
      }
    },
    
    getState() {
      return { failures, isOpen, lastFailureTime }
    },
    
    reset() {
      failures = 0
      isOpen = false
      lastFailureTime = 0
    }
  }
}
