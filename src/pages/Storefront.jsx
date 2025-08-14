import '../App.css'
import heroPlaceholder from '../../january_w1-homepage_desktop_.jpeg'
import { useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import CartDrawer from '../components/CartDrawer.jsx'
import SearchOverlay from '../components/SearchOverlay.jsx'

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

function ProductCard({ name, onAdd }) {
  return (
    <div className="product-card flex flex-col gap-3">
      <div className="group relative bg-gray-100 h-[420px] md:h-[500px] lg:h-[560px] overflow-hidden">
        <img src={heroPlaceholder} alt={name} className="absolute inset-0 w-full h-full object-cover" style={{ minHeight: '100%', minWidth: '100%' }} />
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
        <div className="absolute inset-0 flex items-end justify-center p-4 opacity-0 group-hover:opacity-100 transition">
          <button
            className="pointer-events-auto bg-black text-white text-xs px-4 py-2 rounded-full shadow hover:bg-white hover:text-black hover:outline-1 hover:outline-black"
            onClick={onAdd}
          >
            Add to cart
          </button>
        </div>
      </div>
      <div className="product-name text-sm">{name}</div>
    </div>
  )
}

function BestSellerCard({ name, subtitle, price, label, onAdd }) {
  return (
    <div className="flex flex-col">
      <div className="group relative bg-gray-100 h-[420px] md:h-[500px] lg:h-[560px] overflow-hidden">
        <img src={heroPlaceholder} alt={name} className="absolute inset-0 w-full h-full object-cover" style={{ minHeight: '100%', minWidth: '100%' }} />
        {label ? (
          <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[.14em] bg-white/90 px-2 py-1 rounded-full z-10">{label}</div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
        <div className="absolute inset-0 flex items-end justify-center p-4 opacity-0 group-hover:opacity-100 transition">
          <button
            className="pointer-events-auto bg-black text-white text-xs px-4 py-2 rounded-full shadow hover:bg-white hover:text-black hover:outline-1 hover:outline-black"
            onClick={onAdd}
          >
            Add to cart
          </button>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-base md:text-lg font-medium">{name}</div>
        {(subtitle || price) ? (
          <div className="text-gray-600 text-sm">{subtitle}{subtitle && price ? ' — ' : ''}{price}</div>
        ) : null}
      </div>
    </div>
  )
}

function StickyDiagnostic() {
  return (
    <div className="sticky-diagnostic">
      <div>Find your next favorite piece at Bounty</div>
      <button className="btn">Browse collections</button>
    </div>
  )
}

export default function Storefront() {
  const [isCartOpen, setCartOpen] = useState(false)
  const [isSearchOpen, setSearchOpen] = useState(false)
  const [cartItems, setCartItems] = useState([])

  const subtotal = useMemo(() => cartItems.reduce((sum, i) => sum + i.price * i.qty, 0), [cartItems])

  function addToCart(name) {
    setCartItems((prev) => {
      const id = name
      const existing = prev.find((i) => i.id === id)
      if (existing) return prev.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id, name, price: 12999, qty: 1, image: heroPlaceholder }]
    })
    setCartOpen(true)
  }

  function inc(id) { setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i)) }
  function dec(id) { setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i)) }
  function remove(id) { setCartItems((prev) => prev.filter((i) => i.id !== id)) }
  return (
    <div className="page">
      <Header onOpenCart={() => setCartOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
      <Hero onShop={() => setSearchOpen(true)} />

      <Section title="Best Sellers" id="best-sellers" titleClassName="text-[clamp(48px,9vw,120px)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <BestSellerCard
            label="New"
            name="Home supplies item 01"
            subtitle="Household essential"
            price="from $29.99"
            onAdd={() => addToCart('Home supplies item 01')}
          />
          <BestSellerCard
            label="Bestseller"
            name="Home supplies item 02"
            price="$39.99"
            onAdd={() => addToCart('Home supplies item 02')}
          />
          <BestSellerCard
            label="Bestseller"
            name="Home supplies item 03"
            subtitle="Durable and reliable"
            price="from $29.50"
            onAdd={() => addToCart('Home supplies item 03')}
          />
        </div>
      </Section>

      <Section title="Summer selection" id="summer">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <ProductCard name="Cooling Glass Carafe" onAdd={() => addToCart('Cooling Glass Carafe')} />
          <ProductCard name="Beach Tote" onAdd={() => addToCart('Beach Tote')} />
          <ProductCard name="After-sun Aloe Lotion" onAdd={() => addToCart('After-sun Aloe Lotion')} />
        </div>
      </Section>

      <Section title="Gifts & souvenirs" id="gifts">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <ProductCard name="City Landmark Miniature" onAdd={() => addToCart('City Landmark Miniature')} />
          <ProductCard name="Pressed Flower Frame" onAdd={() => addToCart('Pressed Flower Frame')} />
          <ProductCard name="Artisan Notebook" onAdd={() => addToCart('Artisan Notebook')} />
        </div>
      </Section>

      <Section title="Bundles & kits" id="bundles">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <ProductCard name="Morning Coffee Set" onAdd={() => addToCart('Morning Coffee Set')} />
          <ProductCard name="Relax & Unwind Duo" onAdd={() => addToCart('Relax & Unwind Duo')} />
          <ProductCard name="Housewarming Essentials Kit" onAdd={() => addToCart('Housewarming Essentials Kit')} />
        </div>
      </Section>

      <footer className="footer bg-gray-100 py-12 px-6">
        <div className="container max-w-[1200px] mx-auto">
          <p>Bounty: We curate the essential and the delightful for your home and the people you love.</p>
        </div>
      </footer>

      <StickyDiagnostic />

      <CartDrawer
        open={isCartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onIncrement={inc}
        onDecrement={dec}
        onRemove={remove}
        subtotal={subtotal}
      />

      <SearchOverlay
        open={isSearchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  )
}


