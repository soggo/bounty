import '../App.css'
import Footer from '../components/Footer.jsx'
import heroPlaceholder from '../../january_w1-homepage_desktop_.jpeg'
import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import SearchOverlay from '../components/SearchOverlay.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { supabase } from '../lib/supabaseClient'

function Hero({ onShop }) {
  return (
    <section className="hero grid grid-cols-2 min-h-[72vh]" id="home">
      <div className="hero-media bg-gray-300">
        <img src={heroPlaceholder} alt="Decor and lifestyle hero" />
      </div>
      <div className="hero-panel bg-black text-white flex items-center">
        <div className="hero-panel-inner container p-12 max-w-[640px]">
          <div className="eyebrow text-xs tracking-[.14em]">DISCOVER</div>
          <h1 className="hero-title text-[clamp(28px,4.2vw,56px)] leading-[1.05] mt-3 mb-4">Beautiful houseware, souvenirs, and gift ideas</h1>
          <p className="hero-copy text-base text-gray-200">Bounty is a place to shop for beautiful houseware, souvenirs and ideas for great gifts, household supplies in general.</p>
          <div className="h-4" />
          <button className="btn bg-white text-black uppercase tracking-wide px-4 py-3" onClick={onShop}>Shop now</button>
          <div className="h-2" />
          <p className="fine-print text-xs text-gray-400">Thoughtfully curated objects for daily living and meaningful gifting.</p>
        </div>
      </div>
    </section>
  )
}

function Section({ title, children, id, titleClassName }) {
  return (
    <section className="section py-18 px-6" id={id}>
      {title ? <h2 className={`section-title container uppercase tracking-[.02em] mb-7 max-w-[1200px] mx-auto ${titleClassName ?? 'text-[clamp(24px,4vw,40px)]'}`}>{title}</h2> : null}
      <div className="container max-w-[1200px] mx-auto">{children}</div>
    </section>
  )
}

function getPrimaryImageUrl(product) {
  const images = Array.isArray(product?.images) ? product.images : []
  const first = images.find(img => img && (img.url || typeof img === 'string'))
  if (!first) return heroPlaceholder
  return typeof first === 'string' ? first : (first.url || heroPlaceholder)
}

// StickyDiagnostic removed per request

export default function Storefront({
  cartItems = [],
  onAddToCart,
  onIncrement,
  onDecrement,
  onRemove,
  subtotal = 0,
  isCartOpen = false,
  onOpenCart,
  onCloseCart,
  cartCount = 0,
  isAuthenticated = false,
}) {
  const [isSearchOpen, setSearchOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let mounted = true
    async function fetchProducts() {
      setLoading(true)
      setLoadError('')
      const { data, error } = await supabase
        .from('products')
        .select('id,slug,name,subtitle,price,old_price,is_sale,is_bestseller,is_new,product_type,tags,images,created_at,stock_quantity')
        .order('created_at', { ascending: false })
      if (!mounted) return
      setLoading(false)
      if (error) {
        setLoadError(error.message)
        setProducts([])
        return
      }
      setProducts(Array.isArray(data) ? data : [])
    }
    fetchProducts()
    return () => {
      mounted = false
    }
  }, [])

  const bestSellers = useMemo(() => products.filter(p => p.is_bestseller).slice(0, 3), [products])
  const summerSelection = useMemo(() => {
    const source = products.filter(p => p.is_new)
    return (source.length ? source : products.filter(p => !p.is_bestseller)).slice(0, 3)
  }, [products])
  const giftsSouvenirs = useMemo(() => {
    const byTag = products.filter(p => Array.isArray(p.tags) && p.tags.some(t => /gift|souvenir/i.test(String(t))))
    return (byTag.length ? byTag : products).slice(0, 3)
  }, [products])
  const bundlesKits = useMemo(() => {
    const byType = products.filter(p => p.product_type === 'bundle' || p.product_type === 'kit')
    return (byType.length ? byType : products).slice(0, 3)
  }, [products])

  function normalize(value) {
    return String(value || '').toLowerCase()
  }

  function productMatchesQuery(product, tokens) {
    if (tokens.length === 0) return false
    const haystacks = [
      product?.name,
      product?.subtitle,
      product?.product_type,
      Array.isArray(product?.tags) ? product.tags.join(' ') : ''
    ].map(normalize)
    return tokens.every(token => haystacks.some(h => h.includes(token)))
  }

  const searchResults = useMemo(() => {
    const q = normalize(searchQuery).trim()
    if (!q) return []
    const tokens = q.split(/\s+/).filter(Boolean)
    const matches = products.filter(p => productMatchesQuery(p, tokens))
    // Prefer bestsellers first, then newest
    matches.sort((a, b) => {
      if (a.is_bestseller && !b.is_bestseller) return -1
      if (!a.is_bestseller && b.is_bestseller) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return matches.slice(0, 20)
  }, [searchQuery, products])

  const searchSuggestions = useMemo(() => {
    const pool = bestSellers.length ? bestSellers : products
    return pool.slice(0, 5)
  }, [bestSellers, products])
  return (
    <div className="page">
      <Header onOpenCart={onOpenCart} onOpenSearch={() => setSearchOpen(true)} cartCount={cartCount} />
      <Hero onShop={() => setSearchOpen(true)} />

      <Section title="Best Sellers" id="best-sellers" titleClassName="text-[clamp(48px,8vw,120px)]">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && bestSellers.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : bestSellers.length === 0 ? (
            <div className="text-sm text-gray-600">No bestsellers yet</div>
          ) : bestSellers.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={() => onAddToCart?.(p)}
              className={idx === 2 ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''}
              imageHeightClassName={idx === 2 ? 'h-[320px] sm:h-[380px] md:h-[460px] lg:h-[520px]' : ''}
            />
          ))}
        </div>
      </Section>

      <Section title="Summer selection" id="summer" titleClassName="text-[clamp(48px,8vw,120px)]">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && summerSelection.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : summerSelection.length === 0 ? (
            <div className="text-sm text-gray-600">No products yet</div>
          ) : summerSelection.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={() => onAddToCart?.(p)}
              className={idx === 2 ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''}
              imageHeightClassName={idx === 2 ? 'h-[320px] sm:h-[380px] md:h-[460px] lg:h-[520px]' : ''}
            />
          ))}
        </div>
      </Section>

      <Section title="Gifts & souvenirs" id="gifts" titleClassName="text-[clamp(48px,8vw,120px)]">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && giftsSouvenirs.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : giftsSouvenirs.length === 0 ? (
            <div className="text-sm text-gray-600">No products yet</div>
          ) : giftsSouvenirs.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={() => onAddToCart?.(p)}
              className={idx === 2 ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''}
              imageHeightClassName={idx === 2 ? 'h-[320px] sm:h-[380px] md:h-[460px] lg:h-[520px]' : ''}
            />
          ))}
        </div>
      </Section>

      <Section title="Bundles & kits" id="bundles" titleClassName="text-[clamp(48px,8vw,120px)]">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && bundlesKits.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : bundlesKits.length === 0 ? (
            <div className="text-sm text-gray-600">No bundles or kits yet</div>
          ) : bundlesKits.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={() => onAddToCart?.(p)}
              className={idx === 2 ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''}
              imageHeightClassName={idx === 2 ? 'h-[320px] sm:h-[380px] md:h-[460px] lg:h-[520px]' : ''}
            />
          ))}
        </div>
      </Section>

      {/* Site footer */}
      {/* Replaces the old simple footer with a sleek component */}
      {/* eslint-disable-next-line react/jsx-no-undef */}
      <Footer />
      {/* Sticky diagnostic removed */}

      <SearchOverlay
        open={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={setSearchQuery}
        query={searchQuery}
        results={searchResults}
        loading={false}
        suggestions={searchSuggestions}
      />
    </div>
  )
}


