import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { detectCorruptedAuthState, forceAuthCleanup, recoverFromAuthError } from '../utils/authRecovery.js'

// Development-only auth debugging component
export default function AuthDebug() {
  const { user, userRole, isAuthenticated, isLoading, error, refreshAuth, signOut } = useAuth()
  const [debugInfo, setDebugInfo] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  // Only show in development
  if (import.meta.env.PROD) {
    return null
  }

  function handleDetectCorruption() {
    const corruption = detectCorruptedAuthState()
    setDebugInfo(corruption)
  }

  function handleForceCleanup() {
    const success = forceAuthCleanup()
    setDebugInfo({ cleanupSuccess: success })
    if (success) {
      refreshAuth()
    }
  }

  function handleRecovery() {
    recoverFromAuthError(new Error('Manual recovery triggered'))
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-yellow-500 text-black px-3 py-1 rounded text-xs font-mono hover:bg-yellow-400"
          title="Open Auth Debug Panel"
        >
          🔧 AUTH
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black text-white p-4 rounded-lg text-xs font-mono max-w-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-yellow-400">🔧 Auth Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 mb-3">
        <div>
          <span className="text-blue-400">User:</span> {user ? user.email : 'null'}
        </div>
        <div>
          <span className="text-blue-400">Role:</span> {userRole || 'null'}
        </div>
        <div>
          <span className="text-blue-400">Authenticated:</span> {isAuthenticated.toString()}
        </div>
        <div>
          <span className="text-blue-400">Loading:</span> {isLoading.toString()}
        </div>
        {error && (
          <div>
            <span className="text-red-400">Error:</span> {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={refreshAuth}
          className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs"
        >
          Refresh
        </button>
        <button
          onClick={signOut}
          className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs"
        >
          Sign Out
        </button>
        <button
          onClick={handleDetectCorruption}
          className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 rounded text-xs"
        >
          Detect Issues
        </button>
        <button
          onClick={handleForceCleanup}
          className="bg-orange-600 hover:bg-orange-500 px-2 py-1 rounded text-xs"
        >
          Force Cleanup
        </button>
        <button
          onClick={handleRecovery}
          className="bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded text-xs"
        >
          Recover
        </button>
      </div>

      {debugInfo && (
        <div className="bg-gray-800 p-2 rounded text-xs">
          <div className="text-green-400 mb-1">Debug Info:</div>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
