import { useEffect, useRef } from 'react'

export default function SearchOverlay({ open, onClose, onSearch }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      const onKey = (e) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div className={`search-overlay${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-card w-[min(720px,92%)] bg-white border border-gray-200 shadow-xl rounded-lg">
        <div className="search-row flex items-center gap-2 p-3 border-b border-gray-200">
          <input ref={inputRef} className="search-input flex-1 p-3 border border-gray-200 rounded-md text-base" placeholder="Search products..." onChange={(e) => onSearch?.(e.target.value)} />
          <button className="icon-btn text-xl" onClick={onClose} aria-label="Close search">×</button>
        </div>
        <div className="search-empty p-5 text-gray-600 text-sm">Start typing to search (no products yet).</div>
      </div>
    </div>
  )
}


