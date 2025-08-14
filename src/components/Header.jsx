import { useState } from 'react'

export default function Header({ onOpenCart, onOpenSearch, cartCount = 0, isAuthenticated = false }) {
  const [mobileOpen, setMobileOpen] = useState(false)

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

  function openCart(e) {
    e?.preventDefault()
    onOpenCart?.()
    setMobileOpen(false)
  }

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
            <a className="relative" href="#best-sellers">Shop</a>
          </nav>
        </div>

        {/* Center logo */}
        <a href="#/" className="logo col-start-2 justify-self-center font-bold tracking-[.14em] md:tracking-[.18em] text-sm md:text-base text-center truncate">BOUNTY</a>

        {/* Right actions */}
        <div className="nav-right justify-self-end col-start-3 flex items-center justify-end gap-3 md:gap-5">
          <a className="relative hidden md:inline" href="#search" onClick={openSearch} aria-label="Open search">Search</a>
          {isAuthenticated ? (
            <a className="relative hidden md:inline" href="#/account">Account</a>
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
            <a className="px-3 py-4 hover:bg-gray-50 rounded-lg" href="#/account" onClick={() => setMobileOpen(false)}>Account</a>
          ) : (
            <a className="px-3 py-4 hover:bg-gray-50 rounded-lg" href="#/signin" onClick={() => { rememberReturnTo(); setMobileOpen(false) }}>Login</a>
          )}
          <button className="text-left px-3 py-4 hover:bg-gray-50 rounded-lg" onClick={openCart}>Open cart</button>
        </nav>
      </aside>
    </header>
  )
}


