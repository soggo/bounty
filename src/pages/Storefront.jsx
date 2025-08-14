import '../App.css'
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
  return (
    <div className="page">
      <Header onOpenCart={onOpenCart} onOpenSearch={() => setSearchOpen(true)} cartCount={cartCount} isAuthenticated={isAuthenticated} />
      <Hero onShop={() => setSearchOpen(true)} />

      <Section title="Best Sellers" id="best-sellers" titleClassName="text-[clamp(48px,9vw,120px)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && bestSellers.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : bestSellers.length === 0 ? (
            <div className="text-sm text-gray-600">No bestsellers yet</div>
          ) : bestSellers.map(p => (
            <ProductCard key={p.id} product={p} onAdd={() => onAddToCart?.(p)} />
          ))}
        </div>
      </Section>

      <Section title="Summer selection" id="summer">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && summerSelection.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : summerSelection.length === 0 ? (
            <div className="text-sm text-gray-600">No products yet</div>
          ) : summerSelection.map(p => (
            <ProductCard key={p.id} product={p} onAdd={() => onAddToCart?.(p)} />
          ))}
        </div>
      </Section>

      <Section title="Gifts & souvenirs" id="gifts">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && giftsSouvenirs.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : giftsSouvenirs.length === 0 ? (
            <div className="text-sm text-gray-600">No products yet</div>
          ) : giftsSouvenirs.map(p => (
            <ProductCard key={p.id} product={p} onAdd={() => onAddToCart?.(p)} />
          ))}
        </div>
      </Section>

      <Section title="Bundles & kits" id="bundles">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && bundlesKits.length === 0 ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : bundlesKits.length === 0 ? (
            <div className="text-sm text-gray-600">No bundles or kits yet</div>
          ) : bundlesKits.map(p => (
            <ProductCard key={p.id} product={p} onAdd={() => onAddToCart?.(p)} />
          ))}
        </div>
      </Section>

      <footer className="footer bg-gray-100 py-12 px-6">
        <div className="container max-w-[1200px] mx-auto">
          <p>Bounty: We curate the essential and the delightful for your home and the people you love.</p>
        </div>
      </footer>
      {/* Sticky diagnostic removed */}

      <SearchOverlay
        open={isSearchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  )
}


