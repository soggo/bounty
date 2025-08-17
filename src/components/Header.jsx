import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Header({ onOpenCart, onOpenSearch, cartCount = 0, isAuthenticated = false }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [productsByCategory, setProductsByCategory] = useState({})
  const [menuLoading, setMenuLoading] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  function openSearch(e) {
    e?.preventDefault()
    onOpenSearch?.()
    setMobileOpen(false)
  }

  function rememberReturnTo() {
    try {
      const current = window.location.hash || '#/'
      window.sessionStorage.setItem('bounty:returnTo', current)
    } catch (_) {
      // ignore
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      // Clear any stored return-to path
      try {
        window.sessionStorage.removeItem('bounty:returnTo')
      } catch (_) {}
      // Redirect to home
      window.location.hash = '#/'
      // Close mobile menu if open
      setMobileOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  function openCart(e) {
    e?.preventDefault()
    onOpenCart?.()
    setMobileOpen(false)
  }

  useEffect(() => {
    let mounted = true
    async function fetchMenuData() {
      try {
        setMenuLoading(true)
        const [catsRes, prodsRes] = await Promise.all([
          supabase.from('product_categories').select('id,name,slug').order('name', { ascending: true }),
          supabase.from('products').select('id,slug,name,category_id,images,created_at').order('created_at', { ascending: false })
        ])
        if (!mounted) return
        const cats = Array.isArray(catsRes.data) ? catsRes.data : []
        const prods = Array.isArray(prodsRes.data) ? prodsRes.data : []
        const grouped = {}
        for (const c of cats) grouped[c.id] = []
        for (const p of prods) {
          if (p.category_id && grouped[p.category_id]) grouped[p.category_id].push(p)
        }
        // limit items per category to 3
        for (const key of Object.keys(grouped)) grouped[key] = grouped[key].slice(0, 3)
        setCategories(cats)
        setProductsByCategory(grouped)
      } catch (_) {
        setCategories([])
        setProductsByCategory({})
      } finally {
        if (mounted) setMenuLoading(false)
      }
    }
    fetchMenuData()
    return () => { mounted = false }
  }, [])

  return (
    <header className="nav sticky top-0 z-50 bg-white border-b">
      <div className="nav-inner container relative w-full grid grid-cols-3 md:grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-3 py-3 px-4 md:px-6">
        {/* Left: Desktop nav hidden on mobile / Mobile hamburger */}
        <div className="justify-self-start flex items-center gap-3 col-start-1">
          <button
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <nav className="hidden md:flex items-center gap-5">
            {/* Desktop-only links */}
            <div className="relative group">
              <a className="relative" href="#best-sellers">Shop</a>
              {/* Mega menu */}
              <div className="absolute left-0 top-full mt-2 w-[92vw] max-w-[1100px] bg-white border rounded-xl shadow-2xl p-6 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 transition z-50">
                {menuLoading ? (
                  <div className="text-sm text-gray-600">Loading categories…</div>
                ) : categories.length === 0 ? (
                  <div className="text-sm text-gray-600">No categories yet</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-h-[70vh] overflow-auto pr-1">
                    {categories.map((cat) => (
                      <div key={cat.id} className="min-w-0">
                        <div className="text-xs tracking-[.14em] uppercase text-gray-500 mb-2">{cat.name}</div>
                        <ul className="space-y-2">
                          {(productsByCategory[cat.id] || []).map((p) => (
                            <li key={p.id}>
                              <a className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50" href={`#/p/${encodeURIComponent(p?.slug || '')}`}>
                                <span className="truncate text-sm" title={p?.name}>{p?.name}</span>
                              </a>
                            </li>
                          ))}
                          {(productsByCategory[cat.id] || []).length === 0 ? (
                            <li className="text-xs text-gray-400">No items</li>
                          ) : null}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Center logo */}
        <a href="#/" className="logo col-start-2 justify-self-center font-bold tracking-[.14em] md:tracking-[.18em] text-sm md:text-base text-center truncate">BOUNTY</a>

        {/* Right actions */}
        <div className="nav-right justify-self-end col-start-3 flex items-center justify-end gap-3 md:gap-5">
          <a className="relative hidden md:inline" href="#search" onClick={openSearch} aria-label="Open search">Search</a>
          {isAuthenticated ? (
            <>
              <a className="relative hidden md:inline" href="#/account">Account</a>
              <button 
                className="relative hidden md:inline text-gray-600 hover:text-gray-900 transition-colors" 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <a className="relative hidden md:inline" href="#/signin" onClick={rememberReturnTo}>Login</a>
          )}
          <button className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100" onClick={openSearch} aria-label="Open search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <a className="relative hidden md:inline pr-4" href="#cart" onClick={openCart} aria-label="Open cart">
            Cart
            {cartCount > 0 ? (
              <span className="absolute -top-1 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-black text-white text-[10px] leading-[18px] text-center">{cartCount}</span>
            ) : null}
          </a>
          <button className="relative md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100" onClick={openCart} aria-label="Open cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 ? (
              <span className="absolute -top-1 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-black text-white text-[10px] leading-[18px] text-center">{cartCount}</span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} fixed inset-0 bg-black/40 transition-opacity md:hidden`} onClick={() => setMobileOpen(false)} aria-hidden={!mobileOpen} />
      <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 w-[88%] max-w-[360px] bg-white/95 backdrop-blur shadow-2xl p-6 rounded-r-2xl transition-transform md:hidden overflow-y-auto`} role="dialog" aria-label="Mobile menu" aria-hidden={!mobileOpen}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold tracking-[.18em]">MENU</div>
          <button className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
        <nav className="flex flex-col text-base divide-y divide-gray-100">
          <button className="text-left px-3 py-4 hover:bg-gray-50 rounded-lg" onClick={openSearch}>Search</button>
          {isAuthenticated ? (
            <>
              <a className="px-3 py-4 hover:bg-gray-50 rounded-lg" href="#/account" onClick={() => setMobileOpen(false)}>Account</a>
              <button 
                className="text-left px-3 py-4 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900 transition-colors" 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <a className="px-3 py-4 hover:bg-gray-50 rounded-lg" href="#/signin" onClick={() => { rememberReturnTo(); setMobileOpen(false) }}>Login</a>
          )}
          <button className="text-left px-3 py-4 hover:bg-gray-50 rounded-lg" onClick={openCart}>Open cart</button>
        </nav>
      </aside>
    </header>
  )
}


