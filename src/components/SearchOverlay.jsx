import { useEffect, useRef } from 'react'
import heroPlaceholder from '../../january_w1-homepage_desktop_.jpeg'

function getPrimaryImageUrl(product) {
  const images = Array.isArray(product?.images) ? product.images : []
  const first = images.find(img => img && (img.url || typeof img === 'string'))
  if (!first) return heroPlaceholder
  return typeof first === 'string' ? first : (first.url || heroPlaceholder)
}

export default function SearchOverlay({ open, onClose, onSearch, results = [], query = '', loading = false, suggestions = [] }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      const onKey = (e) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const showSuggestions = !query && suggestions.length > 0
  const showStartTyping = !query && suggestions.length === 0
  const showNoResults = !!query && !loading && results.length === 0

  return (
    <div className={`search-overlay${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-card w-[min(720px,92%)] bg-white border border-gray-200 shadow-xl rounded-lg">
        <div className="search-row flex items-center gap-2 p-3 border-b border-gray-200">
          <input
            ref={inputRef}
            className="search-input flex-1 p-3 border border-gray-200 rounded-md text-base"
            placeholder="Search products..."
            value={query}
            onChange={(e) => onSearch?.(e.target.value)}
            aria-label="Search products"
          />
          <button className="icon-btn text-xl" onClick={onClose} aria-label="Close search">×</button>
        </div>

        {loading ? (
          <div className="p-5 text-gray-600 text-sm">Searching…</div>
        ) : showStartTyping ? (
          <div className="p-5 text-gray-600 text-sm">Start typing to search.</div>
        ) : showSuggestions ? (
          <div className="p-4">
            <div className="text-xs uppercase tracking-[.14em] text-gray-500 px-1">Popular</div>
            <ul className="mt-2 divide-y divide-gray-100">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <a
                    href={`#/p/${encodeURIComponent(p?.slug || '')}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                    onClick={onClose}
                  >
                    <img src={getPrimaryImageUrl(p)} alt="" className="w-12 h-12 rounded object-cover bg-gray-100" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" title={p?.name}>{p?.name}</div>
                      {p?.subtitle ? <div className="text-xs text-gray-500 truncate" title={p?.subtitle}>{p?.subtitle}</div> : null}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : showNoResults ? (
          <div className="p-5 text-gray-600 text-sm">No results for “{query}”.</div>
        ) : (
          <ul className="max-h-[60vh] overflow-auto p-2 divide-y divide-gray-100">
            {results.map((p) => (
              <li key={p.id}>
                <a
                  href={`#/p/${encodeURIComponent(p?.slug || '')}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  onClick={onClose}
                >
                  <img src={getPrimaryImageUrl(p)} alt="" className="w-12 h-12 rounded object-cover bg-gray-100" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" title={p?.name}>{p?.name}</div>
                    {p?.subtitle ? <div className="text-xs text-gray-500 truncate" title={p?.subtitle}>{p?.subtitle}</div> : null}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


