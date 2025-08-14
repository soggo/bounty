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
                    <button className="qty-btn bg-gray-100 border border-gray-200 px-2" onClick={() => onDecrement(item.id)} aria-label={`Decrease ${item.name}`}>−</button>
                    <span className="qty-val min-w-[20px] text-center" aria-live="polite">{item.qty}</span>
                    <button className="qty-btn bg-gray-100 border border-gray-200 px-2" onClick={() => onIncrement(item.id)} aria-label={`Increase ${item.name}`}>+</button>
                    <button className="link underline text-red-700" onClick={() => onRemove(item.id)}>Remove</button>
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
            <button className="btn bg-black text-white uppercase tracking-wide px-4 py-3 disabled:opacity-50" disabled={items.length === 0}>Checkout</button>
          </div>
        </div>
      </aside>
    </>
  )
}


