import heroPlaceholder from '../../january_w1-homepage_desktop_.jpeg'

function formatNaira(value) {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)
  } catch {
    return `₦${Number(value || 0).toFixed(2)}`
  }
}

function getPrimaryImageUrl(product) {
  const images = Array.isArray(product?.images) ? product.images : []
  const first = images.find(img => img && (img.url || typeof img === 'string'))
  if (!first) return heroPlaceholder
  return typeof first === 'string' ? first : (first.url || heroPlaceholder)
}

export default function ProductCard({ product, onAdd, className = '', imageHeightClassName = '' }) {
  const imageUrl = getPrimaryImageUrl(product)
  const isSale = !!product?.is_sale && Number.isFinite(product?.old_price)
  const priceMajor = Number(product?.price || 0) / 100
  const oldPriceMajor = Number(product?.old_price || 0) / 100

  const label = product?.is_bestseller
    ? 'Bestseller'
    : product?.is_new
    ? 'New'
    : product?.is_sale
    ? 'Sale'
    : null

  const imageHeightClasses = imageHeightClassName || 'h-[420px] md:h-[500px] lg:h-[560px]'

  return (
    <a className={`product-card flex flex-col gap-3 ${className}`} href={`#/p/${encodeURIComponent(product?.slug || '')}`}>
      <div className={`group relative bg-gray-100 ${imageHeightClasses} overflow-hidden`}>
        <img src={imageUrl} alt={product?.name} className="absolute inset-0 w-full h-full object-cover" style={{ minHeight: '100%', minWidth: '100%' }} />
        {label ? (
          <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[.14em] bg-white/90 px-2 py-1 rounded-full z-10">{label}</div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
        <div className="absolute inset-0 flex items-end justify-center p-4 opacity-0 group-hover:opacity-100 transition">
          <button
            className="pointer-events-auto bg-black text-white text-xs px-4 py-2 rounded-full shadow hover:bg-white hover:text-black hover:outline-1 hover:outline-black"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd?.(product) }}
          >
            Add to cart
          </button>
        </div>
      </div>
      <div className="mt-1">
        <div className="text-base md:text-lg font-medium truncate" title={product?.name}>{product?.name}</div>
        {product?.subtitle ? (
          <div className="text-gray-600 text-sm truncate" title={product?.subtitle}>{product?.subtitle}</div>
        ) : null}
        <div className="text-sm mt-0.5 flex items-center gap-2">
          <span className="font-medium">{formatNaira(priceMajor)}</span>
          {isSale ? <span className="text-gray-500 line-through">{formatNaira(oldPriceMajor)}</span> : null}
        </div>
      </div>
    </a>
  )
}


