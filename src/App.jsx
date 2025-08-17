import { useEffect, useMemo, useState } from 'react'
import Storefront from './pages/Storefront.jsx'
import Admin from './pages/Admin.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'
import Account from './pages/Account.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Checkout from './pages/Checkout.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import AuthDebug from './components/AuthDebug.jsx'
import heroPlaceholder from '../january_w1-homepage_desktop_.jpeg'

// Main App Logic Component that uses auth hook
function AppContent() {
  const [route, setRoute] = useState(window.location.hash || '#/')
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setCartOpen] = useState(false)
  const { isAuthenticated, userRole } = useAuth()

  useEffect(() => {
    function handleHashChange() {
      setRoute(window.location.hash || '#/')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Clear cart when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setCartItems([])
    }
  }, [isAuthenticated])

  // Persist cart to localStorage so it survives auth redirects/refreshes
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('bounty:cart')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setCartItems(parsed)
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('bounty:cart', JSON.stringify(cartItems))
    } catch (_) {}
  }, [cartItems])

  function getPrimaryImageUrl(product) {
    const images = Array.isArray(product?.images) ? product.images : []
    const first = images.find(img => img && (img.url || typeof img === 'string'))
    if (!first) return heroPlaceholder
    return typeof first === 'string' ? first : (first.url || heroPlaceholder)
  }

  const subtotal = useMemo(() => cartItems.reduce((sum, i) => sum + i.price * i.qty, 0), [cartItems])
  const cartCount = useMemo(() => cartItems.reduce((sum, i) => sum + (i.qty || 0), 0), [cartItems])

  function addToCart(product) {
    setCartItems((prev) => {
      const id = product?.id || product?.name
      const existing = prev.find((i) => i.id === id)
      const maxQty = Number.isFinite(Number(product?.stock_quantity)) ? Number(product.stock_quantity) : Infinity
      if (existing) {
        const nextQty = Math.min(existing.qty + 1, maxQty)
        return prev.map((i) => i.id === id ? { ...i, qty: nextQty, maxQty } : i)
      }
      const priceMajor = Number(product?.price || 0) / 100
      const imageUrl = getPrimaryImageUrl(product)
      const initialQty = Math.min(1, maxQty)
      return [...prev, { id, name: product?.name, price: priceMajor, qty: initialQty, image: imageUrl, maxQty }]
    })
    setCartOpen(true)
  }

  function inc(id) {
    setCartItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const maxQty = Number.isFinite(Number(i.maxQty)) ? Number(i.maxQty) : Infinity
      const nextQty = Math.min((i.qty || 0) + 1, maxQty)
      return { ...i, qty: nextQty, maxQty }
    }))
  }
  function dec(id) { setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i)) }
  function remove(id) { setCartItems((prev) => prev.filter((i) => i.id !== id)) }

  // Admin access control - now handled by the withAdminAuth HOC
  if (route.startsWith('#/admin')) {
    if (!isAuthenticated) {
      // Store the admin route to return to after login
      window.sessionStorage.setItem('bounty:returnTo', '#/admin')
      window.location.hash = '#/signin'
      return <SignIn />
    }
    
    if (userRole !== 'admin') {
      // Redirect non-admin users to homepage directly
      window.location.hash = '#/'
      return null
    }
    
    return <Admin />
  }
  
  if (route.startsWith('#/signin')) return <SignIn />
  if (route.startsWith('#/signup')) return <SignUp />
  if (route.startsWith('#/account')) return <Account />
  if (route.startsWith('#/checkout')) {
    return (
      <Checkout
        cartItems={cartItems}
        subtotal={subtotal}
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
      />
    )
  }
  if (route.startsWith('#/p/')) {
    const slug = decodeURIComponent(route.replace(/^#\/p\//, '').split(/[?#]/)[0] || '')
    return (
      <>
        <ProductDetail
          slug={slug}
          onAddToCart={addToCart}
          onOpenCart={() => setCartOpen(true)}
          cartCount={cartCount}
        />
        <CartDrawer
          open={isCartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItems}
          onIncrement={inc}
          onDecrement={dec}
          onRemove={remove}
          subtotal={subtotal}
        />
      </>
    )
  }
  return (
    <>
      <Storefront
        cartItems={cartItems}
        onAddToCart={addToCart}
        onIncrement={inc}
        onDecrement={dec}
        onRemove={remove}
        subtotal={subtotal}
        isCartOpen={isCartOpen}
        onOpenCart={() => setCartOpen(true)}
        onCloseCart={() => setCartOpen(false)}
        cartCount={cartCount}
        isAuthenticated={isAuthenticated}
      />
      <CartDrawer
        open={isCartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onIncrement={inc}
        onDecrement={dec}
        onRemove={remove}
        subtotal={subtotal}
      />
      <AuthDebug />
    </>
  )
}

// Main App component wrapped with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
