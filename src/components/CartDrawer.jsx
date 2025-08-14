const formatNaira = (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)

export default function CartDrawer({ open, onClose, items, onIncrement, onDecrement, onRemove, subtotal }) {
  return (
    <>
      <div className={`backdrop${open ? ' open' : ''} z-[50]`} onClick={onClose} aria-hidden={!open} />
      <aside className={`drawer${open ? ' open' : ''} z-[60]`} aria-hidden={!open} aria-label="Cart drawer" role="dialog">
        <div className="drawer-header relative flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-medium">Your Cart</h3>
          <button className="absolute right-3 top-3 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-2xl leading-none" onClick={onClose} aria-label="Close cart">
            <span aria-hidden>×</span>
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="drawer-body p-5 overflow-auto flex-1">
          {items.length === 0 ? (
            <div className="empty text-gray-600">Your cart is empty.</div>
          ) : (
            items.map((item) => (
              <div className="cart-item flex gap-3 py-3 border-b" key={item.id}>
                <img className="cart-thumb w-[72px] h-[72px] object-cover bg-gray-100" src={item.image} alt={item.name} />
                <div className="cart-info flex-1 flex flex-col gap-1.5">
                  <div className="cart-title text-sm">{item.name}</div>
                  <div className="cart-price text-sm text-gray-700">{formatNaira(item.price)}</div>
                  <div className="qty-row flex items-center gap-2">
                    <button
                      className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition disabled:opacity-40"
                      onClick={() => onDecrement(item.id)}
                      aria-label={`Decrease ${item.name}`}
                      title="Decrease quantity"
                      disabled={item.qty <= 1}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="qty-val min-w-[24px] text-center text-sm" aria-live="polite">{item.qty}</span>
                    <button
                      className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition disabled:opacity-40"
                      onClick={() => onIncrement(item.id)}
                      aria-label={`Increase ${item.name}`}
                      title="Increase quantity"
                      disabled={Number.isFinite(Number(item.maxQty)) && item.qty >= Number(item.maxQty)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    {Number.isFinite(Number(item.maxQty)) ? (
                      <span className="ml-1 text-xs text-gray-500">/ {item.maxQty}</span>
                    ) : null}
                    <button
                      className="ml-1 w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-red-700"
                      onClick={() => onRemove(item.id)}
                      aria-label={`Remove ${item.name}`}
                      title="Remove"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="drawer-footer p-5 border-t">
          <div className="subtotal flex items-center justify-between mb-3">
            <span>Subtotal</span>
            <strong>{formatNaira(subtotal)}</strong>
          </div>
          <div className="footer-actions flex items-center justify-between gap-3">
            <button className="link underline" onClick={onClose}>Continue shopping</button>
            <a href="#/checkout" onClick={onClose} className={`btn bg-black text-white uppercase tracking-wide px-4 py-3 ${items.length === 0 ? 'pointer-events-none opacity-50' : ''}`}>Checkout</a>
          </div>
        </div>
      </aside>
    </>
  )
}


