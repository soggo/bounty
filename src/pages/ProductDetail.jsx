import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { supabase } from '../lib/supabaseClient'
import heroPlaceholder from '../../january_w1-homepage_desktop_.jpeg'

function getPrimaryImageUrl(product) {
  const images = Array.isArray(product?.images) ? product.images : []
  const first = images.find(img => img && (img.url || typeof img === 'string'))
  if (!first) return heroPlaceholder
  return typeof first === 'string' ? first : (first.url || heroPlaceholder)
}

function formatNaira(value) {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)
  } catch {
    return `₦${Number(value || 0).toFixed(2)}`
  }
}

export default function ProductDetail({ slug, onAddToCart, onOpenCart, cartCount = 0 }) {
  const [product, setProduct] = useState(null)
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    let mounted = true
    async function fetchProduct() {
      setLoading(true)
      setError('')
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single()
      if (!mounted) return
      setLoading(false)
      if (err) {
        setError(err.message)
        setProduct(null)
        return
      }
      setProduct(data)
      if (data?.category_id) {
        const { data: cat, error: catErr } = await supabase
          .from('product_categories')
          .select('id,name,slug')
          .eq('id', data.category_id)
          .single()
        if (!mounted) return
        if (!catErr) setCategory(cat)
      }
    }
    if (slug) fetchProduct()
    return () => { mounted = false }
  }, [slug])

  const priceMajor = useMemo(() => Number(product?.price || 0) / 100, [product])
  const oldPriceMajor = useMemo(() => Number(product?.old_price || 0) / 100, [product])
  const imageUrls = useMemo(() => {
    const list = Array.isArray(product?.images) ? product.images : []
    return list
      .map(img => (typeof img === 'string' ? img : img?.url))
      .filter(Boolean)
  }, [product])

  const activeImage = imageUrls[imageIndex] || getPrimaryImageUrl(product)
  const hasMultipleImages = imageUrls.length > 1
  const label = product?.is_bestseller ? 'BEST-SELLER' : (product?.is_new ? 'NEW' : (product?.is_sale ? 'SALE' : null))

  return (
    <div className="page">
      <Header onOpenCart={onOpenCart} onOpenSearch={() => {}} cartCount={cartCount} />
      <div className="container max-w-[1200px] mx-auto p-6">
        <nav className="text-xs text-gray-600 mb-4 flex items-center gap-1">
          <a className="hover:underline" href="#/">Home</a>
          <span>/</span>
          {category ? (
            <a className="hover:underline" href="#/">{category.name}</a>
          ) : (
            <span className="text-gray-400">Products</span>
          )}
          <span>/</span>
          <span className="text-gray-900 truncate max-w-[60%]" title={product?.name || ''}>{product?.name || 'Product'}</span>
        </nav>

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : !product ? (
          <div className="text-sm text-gray-600">Product not found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative bg-gray-100 aspect-[4/5] overflow-hidden">
              <img src={activeImage} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
              {hasMultipleImages ? (
                <>
                  <button
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
                    onClick={() => setImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)}
                    aria-label="Previous image"
                  >
                    <span>‹</span>
                  </button>
                  <button
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
                    onClick={() => setImageIndex((prev) => (prev + 1) % imageUrls.length)}
                    aria-label="Next image"
                  >
                    <span>›</span>
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex flex-col">
              <div className="border rounded p-6">
                {label ? <div className="text-[10px] uppercase tracking-[.14em] bg-gray-100 rounded-full inline-block px-2 py-1 mb-3">{label}</div> : null}
                {product.subtitle ? <div className="text-xs text-gray-600 mb-1">{product.subtitle}</div> : null}
                <h1 className="text-2xl font-semibold leading-tight">{product.name}</h1>

                <div className="flex items-center gap-3 mt-3">
                  <div className="text-xl font-semibold">{formatNaira(priceMajor)}</div>
                  {product.is_sale && product.old_price ? (
                    <div className="text-gray-500 line-through">{formatNaira(oldPriceMajor)}</div>
                  ) : null}
                </div>

                {product.description ? (
                  <div className="text-sm text-gray-700 mt-4">
                    <p className="whitespace-pre-wrap">{product.description}</p>
                  </div>
                ) : null}

                {Array.isArray(product.tags) && product.tags.length ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {product.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-1 bg-gray-100 rounded-full">{t}</span>
                    ))}
                  </div>
                ) : null}

                <div className="h-px bg-gray-200 my-6" />

                <div className="flex items-center gap-3">
                  <button
                    className="btn flex-1 text-center rounded"
                    onClick={() => onAddToCart?.(product)}
                  >
                    Add to cart — {formatNaira(priceMajor)}
                  </button>
                  <a className="px-4 py-3 border rounded" href="#/">Continue shopping</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


