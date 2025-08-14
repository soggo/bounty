import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error

      const userId = data?.user?.id
      if (userId) {
        // Best-effort last_seen update; ignore errors
        await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)

        // Fetch role to decide redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()

        // Compute safe returnTo
        let returnTo = '#/'
        try {
          const stored = window.sessionStorage.getItem('bounty:returnTo')
          if (stored && !stored.startsWith('#/signin') && !stored.startsWith('#/signup')) {
            returnTo = stored
          }
          window.sessionStorage.removeItem('bounty:returnTo')
        } catch (_) {}

        if (profile?.role === 'admin') {
          window.location.hash = '#/admin'
        } else {
          window.location.hash = returnTo
        }
        return
      }
      // Fallback
      window.location.hash = '#/'
    } catch (err) {
      setErrorMessage(err?.message || 'Unable to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl ring-1 ring-gray-200 p-6 md:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-gray-600 mt-1">Sign in to continue</p>
          </div>
          {errorMessage ? (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 text-red-700 text-sm border border-red-100">
              {errorMessage}
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 inline-flex items-center px-2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a20.27 20.27 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a20.3 20.3 0 0 1-3.22 5.05" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-black text-white h-11 hover:bg-black/90 disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            <span>New here? </span>
            <a href="#/signup" className="font-medium underline underline-offset-4">Create an account</a>
          </div>
          <div className="mt-2 text-center text-sm">
            <a href="#/" className="text-gray-500 hover:text-gray-700">Back to store</a>
          </div>
        </div>
      </div>
    </div>
  )
}


