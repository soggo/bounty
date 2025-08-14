import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { supabase } from '../lib/supabaseClient'

function formatNaira(value) {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)
  } catch (_) {
    return `₦${Number(value || 0).toLocaleString('en-NG')}`
  }
}

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
]

export default function Checkout({
  cartItems = [],
  subtotal = 0,
  isAuthenticated = false,
  cartCount = 0,
}) {
  const [step, setStep] = useState(isAuthenticated ? 'shipping' : 'contact')
  const [loadingPrefill, setLoadingPrefill] = useState(false)

  const [email, setEmail] = useState('')
  const [shipping, setShipping] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    countryCode: 'NG',
  })

  // Prefill when authenticated
  useEffect(() => {
    let mounted = true
    async function prefill() {
      if (!isAuthenticated) return
      setLoadingPrefill(true)
      try {
        const [{ data: userRes }, { data: profileRes }, { data: addressRes }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('profiles').select('first_name,last_name').maybeSingle(),
          supabase.from('user_addresses').select('recipient_name,phone,line1,city,state,country_code').eq('is_default_shipping', true).maybeSingle(),
        ])
        if (!mounted) return
        const user = userRes?.user
        setEmail(user?.email || '')
        const firstName = profileRes?.first_name || ''
        const lastName = profileRes?.last_name || ''
        const splitRecipient = (addressRes?.recipient_name || '').split(' ')
        const candidateFirst = splitRecipient.slice(0, -1).join(' ').trim()
        const candidateLast = splitRecipient.slice(-1).join(' ').trim()
        setShipping((prev) => ({
          ...prev,
          firstName: firstName || candidateFirst || prev.firstName,
          lastName: lastName || candidateLast || prev.lastName,
          phone: addressRes?.phone || prev.phone,
          line1: addressRes?.line1 || prev.line1,
          city: addressRes?.city || prev.city,
          state: addressRes?.state || prev.state,
          countryCode: addressRes?.country_code || 'NG',
        }))
      } finally {
        setLoadingPrefill(false)
      }
    }
    prefill()
    return () => { mounted = false }
  }, [isAuthenticated])

  // Persist lightweight progress so refreshes don't nuke work
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('bounty:checkout')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.email) setEmail(parsed.email)
        if (parsed?.shipping && typeof parsed.shipping === 'object') setShipping((prev) => ({ ...prev, ...parsed.shipping }))
        if (parsed?.step) setStep(parsed.step)
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try {
      window.sessionStorage.setItem('bounty:checkout', JSON.stringify({ step, email, shipping }))
    } catch (_) {}
  }, [step, email, shipping])

  const validContact = useMemo(() => /.+@.+\..+/.test(String(email).trim()), [email])
  const validShipping = useMemo(() => {
    return (
      String(shipping.firstName).trim().length > 1 &&
      String(shipping.lastName).trim().length > 1 &&
      String(shipping.phone).trim().length >= 7 &&
      String(shipping.line1).trim().length > 3 &&
      String(shipping.city).trim().length > 1 &&
      String(shipping.state).trim().length > 1 &&
      shipping.countryCode === 'NG'
    )
  }, [shipping])

  function updateShipping(field, value) {
    setShipping((prev) => ({ ...prev, [field]: value }))
  }

  function proceedFromContact(e) {
    e?.preventDefault()
    if (!validContact) return
    setStep('shipping')
  }

  function proceedToPayment(e) {
    e?.preventDefault()
    if (!validShipping) return
    // At this point, we would typically create a draft order or proceed to payment
    // For now, just navigate to a placeholder hash to be implemented next.
    try {
      window.location.hash = '#/checkout/payment'
    } catch (_) {}
  }

  const itemTotal = useMemo(() => subtotal, [subtotal])
  const shippingFee = 0
  const orderTotal = itemTotal + shippingFee

  return (
    <div className="page">
      <Header onOpenCart={() => {}} onOpenSearch={() => {}} cartCount={cartCount} isAuthenticated={isAuthenticated} />
      <main className="container max-w-[1100px] mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <li className={`px-2 py-1 rounded-full ${step === 'contact' ? 'bg-black text-white' : 'bg-gray-100'}`}>Contact</li>
            <span>›</span>
            <li className={`px-2 py-1 rounded-full ${step === 'shipping' ? 'bg-black text-white' : 'bg-gray-100'}`}>Shipping</li>
            <span>›</span>
            <li className="px-2 py-1 rounded-full bg-gray-100">Payment</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          {/* Left: Forms */}
          <section className="space-y-8">
            {step === 'contact' && (
              <form className="bg-white rounded-2xl p-5 md:p-6 border" onSubmit={proceedFromContact}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Contact</h2>
                  {isAuthenticated ? <span className="text-xs text-green-700">Logged in</span> : null}
                </div>
                <label className="block text-sm mb-1" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">We’ll send your order updates to this email.</p>
                <div className="h-5" />
                <div className="flex items-center justify-end">
                  <button type="submit" className={`px-5 py-3 rounded-xl text-white ${validContact ? 'bg-black hover:opacity-90' : 'bg-gray-400 cursor-not-allowed'}`}>Continue</button>
                </div>
              </form>
            )}

            {step === 'shipping' && (
              <form className="bg-white rounded-2xl p-5 md:p-6 border" onSubmit={proceedToPayment}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Shipping address</h2>
                  {loadingPrefill ? <span className="text-xs text-gray-500">Prefilling…</span> : null}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1" htmlFor="firstName">First name</label>
                    <input id="firstName" type="text" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black" value={shipping.firstName} onChange={(e) => updateShipping('firstName', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" htmlFor="lastName">Last name</label>
                    <input id="lastName" type="text" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black" value={shipping.lastName} onChange={(e) => updateShipping('lastName', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" htmlFor="phone">Phone number</label>
                    <input id="phone" type="tel" inputMode="tel" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black" placeholder="0801 234 5678" value={shipping.phone} onChange={(e) => updateShipping('phone', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" htmlFor="country">Country</label>
                    <select id="country" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black" value={shipping.countryCode} onChange={(e) => updateShipping('countryCode', e.target.value)}>
                      <option value="NG">Nigeria</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1" htmlFor="line1">Street address</label>
                    <input id="line1" type="text" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black" placeholder="House number and street" value={shipping.line1} onChange={(e) => updateShipping('line1', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" htmlFor="city">City</label>
                    <input id="city" type="text" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black" value={shipping.city} onChange={(e) => updateShipping('city', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" htmlFor="state">State</label>
                    <select id="state" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black" value={shipping.state} onChange={(e) => updateShipping('state', e.target.value)} required>
                      <option value="" disabled>Choose state</option>
                      {NIGERIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="h-5" />
                <div className="flex items-center justify-between gap-3">
                  {!isAuthenticated ? (
                    <button type="button" className="text-sm underline" onClick={() => setStep('contact')}>Back to contact</button>
                  ) : <span />}
                  <button type="submit" className={`px-5 py-3 rounded-xl text-white ${validShipping ? 'bg-black hover:opacity-90' : 'bg-gray-400 cursor-not-allowed'}`}>Continue to payment</button>
                </div>
              </form>
            )}
          </section>

          {/* Right: Order summary */}
          <aside className="bg-white rounded-2xl p-5 md:p-6 border h-max sticky top-24">
            <h3 className="text-base font-semibold mb-4">Order summary</h3>
            <div className="space-y-3 mb-4">
              {cartItems.length === 0 ? (
                <div className="text-sm text-gray-600">Your cart is empty.</div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-14 h-14 rounded-md object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{item.name}</div>
                      <div className="text-xs text-gray-600">Qty {item.qty}</div>
                    </div>
                    <div className="text-sm">{formatNaira(item.price * item.qty)}</div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatNaira(itemTotal)}</span></div>
              <div className="flex items-center justify-between"><span>Shipping</span><span>{shippingFee === 0 ? 'Free' : formatNaira(shippingFee)}</span></div>
              <div className="flex items-center justify-between font-semibold text-base pt-1"><span>Total</span><span>{formatNaira(orderTotal)}</span></div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}


